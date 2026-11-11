import { HeliosUsb } from '../../../packages/hylon-laser/helios-usb.js';
import { mountLaserProfile } from './laser-profile.js';
import { projectLaserPoint } from '../../../packages/hylon-laser/profile.js';
import { compileLaserFrame, midiStrokes, textStrokes } from '../../../packages/hylon-laser/frame.js';
import { MidiPoints, testFrame, sweepFrame } from '../../../packages/hylon-laser/patterns.js';
export function mountLaser(container, { notify = () => {}, usbApi = navigator.usb, settingsStorage } = {}) {
  container.classList.add('helios-pod');
  container.innerHTML = `<div class="panel-body"><div class="eyebrow">HELIOS</div><div class="toolbar"><button data-usb>CONNECT HELIOS</button><button data-output class="primary">START OUTPUT</button><button data-stop class="danger">BLACKOUT</button><button data-preview>PREVIEW ONLY</button></div><p data-status class="status">STOPPED · connect HELIOS, then START OUTPUT</p><p data-usb-status class="muted">USB disconnected</p>
    <div class="toolbar"><label class="field">Pattern<select data-mode><option value="frame">FRAME</option><option value="sweep">SWEEP</option><option value="text">TEXT</option><option value="midi">MIDI XY</option></select></label><label data-frame-controls class="field">Geometry<select data-shape><option value="square">Square</option><option value="high">High edge</option><option value="low">Low edge</option></select></label><label data-sweep-controls class="field" hidden>Direction<select data-direction><option value="sequence">LR → RL → TD → DT</option><option>LR</option><option>RL</option><option>TD</option><option>DT</option></select></label><label data-text-controls class="field" hidden>Text<input data-text maxlength="12" value="HYLON"></label></div>
    <div data-profile-root></div><div data-sweep-controls-extra class="toolbar" hidden><label class="field">Seconds per pass<input data-speed type="range" min="0.1" max="10" step="0.1" value="2"><output data-speed-label>2.0 s</output></label><span data-direction-label></span></div>
    <div data-midi-controls class="toolbar" hidden><label class="field checkbox"><input data-route type="checkbox" checked>Selected MIDI input</label><label class="field">Channel<select data-channel><option value="all">All</option>${Array.from({length:16},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label><button data-demo>DEMO NOTE</button><span data-count>0 / 8 loci</span></div>
    <canvas data-canvas width="720" height="720" role="img" aria-label="HELIOS scan preview" style="display:block;width:100%;max-height:60vh;object-fit:contain;background:#000;aspect-ratio:1"></canvas>
    <details><summary>CONNECTION DETAILS</summary><div class="toolbar"><button data-usb-status-button>DAC STATUS</button><button data-usb-disconnect>DISCONNECT</button></div><p class="muted">Green vector output; text A–Z / 0–9 / dash, up to 12 characters within the frame budget. MIDI loci are scanned rings, not stationary beams. Close TouchDesigner before connecting. One-shot frames stop repeating when updates cease on supported firmware; this is not an independent projector interlock. Use a controlled projection area without people in the beam.</p></details></div>`;
  const q = key => container.querySelector(`[data-${key}]`), canvas = q('canvas'), ctx = canvas.getContext('2d'), points = new MidiPoints({limit:8});
  let running = false, emitting = false, outputPending = false, disposed = false, animation = 0, timer = 0, origin = 0, lastDraw = 0, demoTimer, lease = 0;
  const usb = new HeliosUsb({usb:usbApi,onState:message=>{if(!disposed)q('usb-status').textContent=message;}});
  function clear(){if(ctx){ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fillRect(0,0,720,720);}}
  function stop({hardware=true}={}) {
    const wasOutput=emitting||usb.outputEnabled;lease++;running=false;emitting=false;outputPending=false;q('output').disabled=false;cancelAnimationFrame(animation);clearTimeout(timer);clearTimeout(demoTimer);points.clear();clear();
    q('status').textContent='STOPPED · no new frames';q('count').textContent='0 / 8 loci';
    if(hardware&&(wasOutput||usb.device))usb.stop().catch(error=>notify(error.message));
  }
  const profile = mountLaserProfile(q('profile-root'), {onApply:({live}={})=>{if(!live&&(running||outputPending))stop();},notify,storage:settingsStorage});
  function geometry(time) {
    if(q('mode').value==='frame')return testFrame(q('shape').value);
    if(q('mode').value==='text')return textStrokes(q('text').value);
    if(q('mode').value==='midi')return midiStrokes(points.snapshot());
    const result=sweepFrame(time,Number(q('speed').value),q('direction').value);q('direction-label').textContent=result.direction;return result.strokes;
  }
  function draw(now) {
    if(!running||disposed||document.hidden||!ctx)return;
    if(lastDraw&&now-lastDraw>300){stop();notify('HELIOS stopped after a browser stall.');return;}lastDraw=now;clear();
    try{
      const config=profile.get(),strokes=geometry((now-origin)/1000),px=v=>1+v*718;
      // Preview remains readable at low output signal; it does not represent optical brightness.
      for(const stroke of strokes){ctx.globalAlpha=Math.max(.25,stroke.intensity);ctx.strokeStyle='#72ffd3';ctx.beginPath();stroke.points.forEach(([x,y],i)=>{const[a,b]=projectLaserPoint(config,x,y);if(i)ctx.lineTo(px(a),px(b));else ctx.moveTo(px(a),px(b));});ctx.stroke();}
      ctx.globalAlpha=1;q('count').textContent=`${points.notes.size} / 8 loci`;
      if(emitting)q('status').textContent=`OUTPUT RUNNING · ${usb.sentFrames} frames transferred · ${config.scanRatePps} PPS · ${config.widthPercent}% field · ${config.intensityPercent}% signal`;
      animation=requestAnimationFrame(draw);
    }catch(error){stop();notify(error.message);}
  }
  async function pump(token) {
    if(!running||!emitting||disposed||token!==lease||document.hidden)return;
    if(!usb.outputEnabled||!usb.device){stop({hardware:false});q('status').textContent='OUTPUT STOPPED · reconnect / start explicitly';return;}
    try{
      const frame=compileLaserFrame(geometry((performance.now()-origin)/1000),profile.get());await usb.sendFrame(frame.points,frame.pps);
      if(token===lease&&running)timer=setTimeout(()=>pump(token),8);
    }catch(error){stop();q('status').textContent=`OUTPUT FAULT · ${error.message}`;notify(error.message);}
  }
  function preview(){stop();if(disposed||document.hidden)return;running=true;origin=performance.now();lastDraw=0;q('status').textContent='PREVIEW ONLY · no frame transmission';animation=requestAnimationFrame(draw);}
  q('output').onclick=async()=>{
    if(disposed||document.hidden||outputPending||emitting)return;
    stop({hardware:false});const token=lease;outputPending=true;q('output').disabled=true;
    try{
      if(!usb.device)throw new Error('Connect HELIOS first');
      const frame=compileLaserFrame(geometry(0),profile.get()),blank={pps:frame.pps,points:frame.points.map(p=>({...p,r:0,g:0,b:0,i:0}))};
      await usb.startOutput(blank);if(token!==lease||disposed||document.hidden){await usb.stop();return;}
      outputPending=false;running=true;emitting=true;origin=performance.now();lastDraw=0;animation=requestAnimationFrame(draw);pump(token);
    }catch(error){if(token===lease){outputPending=false;q('output').disabled=false;q('status').textContent=`OUTPUT STOPPED · ${error.message}`;notify(error.message);}}
  };
  q('preview').onclick=preview;q('stop').onclick=stop;
  q('mode').onchange=()=>{stop();for(const name of ['frame','sweep','text','midi'])q(`${name}-controls`).hidden=q('mode').value!==name;q('sweep-controls-extra').hidden=q('mode').value!=='sweep';};
  for(const name of ['shape','direction','text'])q(name).addEventListener('change',()=>{if(running)stop();});
  q('speed').oninput=()=>{q('speed-label').value=`${Number(q('speed').value).toFixed(1)} s`;};
  for(const name of ['route','channel'])q(name).onchange=()=>points.clear();
  q('demo').onclick=()=>{if(!running)preview();points.receive([0x90,60,96]);clearTimeout(demoTimer);demoTimer=setTimeout(()=>points.receive([0x80,60,0]),600);};
  const action=fn=>async()=>{try{await fn();}catch(error){notify(error.message);q('status').textContent=error.message;}};
  q('usb').onclick=action(()=>usb.connect());q('usb-status-button').onclick=action(()=>usb.status());q('usb-disconnect').onclick=action(async()=>{stop({hardware:false});await usb.emergencyStop();});
  const visibility=()=>{if(document.hidden)stop();},disconnect=event=>{if(!usb.device){stop({hardware:false});q('status').textContent='USB disconnected · output stopped';}};
  document.addEventListener('visibilitychange',visibility);usbApi?.addEventListener('disconnect',disconnect);clear();
  return {stop,midi(bytes){if(running&&q('mode').value==='midi'&&q('route').checked)points.receive(bytes,q('channel').value==='all'?'all':Number(q('channel').value));},async panic(){stop({hardware:false});await usb.emergencyStop();},dispose(){stop();disposed=true;profile.dispose();usb.dispose().catch(()=>{});document.removeEventListener('visibilitychange',visibility);usbApi?.removeEventListener('disconnect',disconnect);container.replaceChildren();}};
}
