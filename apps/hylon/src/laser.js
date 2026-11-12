import { mountQuadMapper } from './quad-mapper.js';
import { createQuadMapper } from '../../../packages/hylon-laser/quad.js';
import { HeliosUsb } from '../../../packages/hylon-laser/helios-usb.js';
import { mountLaserProfile } from './laser-profile.js';
import { projectLaserPoint } from '../../../packages/hylon-laser/profile.js';
import { compileLaserFrame, midiStrokes, textStrokes } from '../../../packages/hylon-laser/frame.js';
import { MidiPoints, testFrame, sweepFrame } from '../../../packages/hylon-laser/patterns.js';
export function mountLaser(container, { notify = () => {}, usbApi = navigator.usb, settingsStorage } = {}) {
  container.classList.add('helios-pod');
  container.innerHTML = `<div class="panel-body"><div class="eyebrow">LASER</div><div class="toolbar"><button data-usb>CONNECT HELIOS</button><button data-output class="primary">START OUTPUT</button><button data-stop class="danger">BLACKOUT</button><button data-preview>PREVIEW ONLY</button><button data-test title="Full field square for 1 second at current intensity and PPS">TEST □ / 1s</button></div><p data-status class="status">STOPPED · connect HELIOS, then START OUTPUT</p><p data-usb-status class="muted">USB disconnected</p>
    <div class="toolbar"><label class="field">Pattern<select data-mode><option value="frame">FRAME</option><option value="sweep">SWEEP</option><option value="text">TEXT</option><option value="midi">MIDI XY</option></select></label><label data-frame-controls class="field">Geometry<select data-shape><option value="square">Square</option><option value="high">High edge</option><option value="low">Low edge</option></select></label><label data-sweep-controls class="field" hidden>Direction<select data-direction><option value="sequence">LR → RL → TD → DT</option><option>LR</option><option>RL</option><option>TD</option><option>DT</option></select></label><label data-text-controls class="field" hidden>Text<input data-text maxlength="12" value="HYLON"></label></div>
    <div data-profile-root></div><div data-sweep-controls-extra class="toolbar" hidden><label class="field">Seconds per pass<input data-speed type="range" min="0.1" max="10" step="0.1" value="2"><output data-speed-label>2.0 s</output></label><span data-direction-label></span></div>
    <div data-midi-controls class="toolbar" hidden><label class="field checkbox"><input data-route type="checkbox" checked>Selected MIDI input</label><label class="field">Channel<select data-channel><option value="all">All</option>${Array.from({length:16},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label><button data-demo>DEMO NOTE</button><span data-count>0 / 8 loci</span></div>
    <div class="laser-mapping"><div class="laser-map-stage"><canvas data-canvas width="720" height="720" role="img" aria-label="LASER mapped preview"></canvas><div data-map-handles></div></div><canvas data-original width="180" height="180" role="img" aria-label="Original generator preview" title="Original generator · before mapping"></canvas><button data-map-reset class="map-reset" title="Reset four mapping corners">RESET MAP</button></div>
    <details><summary>CONNECTION DETAILS</summary><div class="toolbar"><button data-usb-status-button>DAC STATUS</button><button data-usb-disconnect>DISCONNECT</button></div><p class="muted">Green vector output; text A–Z / 0–9 / dash, up to 12 characters within the frame budget. MIDI loci are scanned rings, not stationary beams. Close TouchDesigner before connecting. One-shot frames stop repeating when updates cease on supported firmware; this is not an independent projector interlock. Use a controlled projection area without people in the beam.</p></details></div>`;
  const q = key => container.querySelector(`[data-${key}]`), canvas = q('canvas'), ctx = canvas.getContext('2d'), points = new MidiPoints({limit:8});
  let mapping;
  let running = false, emitting = false, outputPending = false, connecting = false, disposed = false, animation = 0, timer = 0, origin = 0, lastDraw = 0, demoTimer, testTimer, testConfig = null, lease = 0;
  const usb = new HeliosUsb({usb:usbApi,onState:message=>{if(!disposed)q('usb-status').textContent=message;}});
  function clear(){if(ctx){ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fillRect(0,0,720,720);}}
  function stop({hardware=true}={}) {
    const wasOutput=emitting||usb.outputEnabled;lease++;running=false;emitting=false;outputPending=false;q('output').disabled=false;cancelAnimationFrame(animation);clearTimeout(timer);clearTimeout(demoTimer);clearTimeout(testTimer);testConfig=null;points.clear();clear();
    mapping?.sync();q('status').textContent='STOPPED · no new frames';q('count').textContent='0 / 8 loci';
    if(hardware&&(wasOutput||usb.device))return usb.stop().catch(error=>notify(error.message));
  }
  const profile = mountLaserProfile(q('profile-root'), {onApply:({live}={})=>{if(!live&&(running||outputPending))stop();},onChange:()=>{mapping?.sync();if(mapping&&!running){try{renderPreview(geometry(0),profile.get());}catch{clear();}}},notify,storage:settingsStorage});
  const original=q('original'), originalCtx=original.getContext('2d');
  mapping=mountQuadMapper(container.querySelector('.laser-mapping'),{getProfile:profile.get,setQuad:quad=>profile.setQuad(quad),onChange:()=>{if(!running)renderPreview(geometry(0),profile.get());},notify});
  q('profile-root').addEventListener('input',()=>{mapping.sync();if(!running)renderPreview(geometry(0),profile.get());});
  function renderPreview(strokes,config) {
    clear();const mapper=createQuadMapper(config.warpQuad);
    for(const stroke of strokes){if(!ctx)break;ctx.globalAlpha=Math.max(.25,stroke.intensity);ctx.strokeStyle='#72ffd3';ctx.lineWidth=2;ctx.beginPath();stroke.points.forEach(([x,y],i)=>{const[a,b]=projectLaserPoint(config,x,y,mapper);if(i)ctx.lineTo(1+a*718,1+b*718);else ctx.moveTo(1+a*718,1+b*718);});ctx.stroke();}
    if(ctx)ctx.globalAlpha=1;
    if(originalCtx){originalCtx.fillStyle='#000';originalCtx.fillRect(0,0,180,180);originalCtx.strokeStyle='#72ffd3';originalCtx.lineWidth=2;for(const stroke of strokes){originalCtx.beginPath();stroke.points.forEach(([x,y],i)=>{if(i)originalCtx.lineTo(1+x*178,1+y*178);else originalCtx.moveTo(1+x*178,1+y*178);});originalCtx.stroke();}}
    mapping.sync(config,!!testConfig);
  }
  function geometry(time) {
    if(testConfig)return testFrame('square');
    if(q('mode').value==='frame')return testFrame(q('shape').value);
    if(q('mode').value==='text')return textStrokes(q('text').value);
    if(q('mode').value==='midi')return midiStrokes(points.snapshot());
    const result=sweepFrame(time,Number(q('speed').value),q('direction').value);q('direction-label').textContent=result.direction;return result.strokes;
  }
  function draw(now) {
    if(!running||disposed||document.hidden||!ctx)return;
    if(lastDraw&&now-lastDraw>300){stop();notify('HELIOS stopped after a browser stall.');return;}lastDraw=now;clear();
    try{
      const config=testConfig||profile.get(),strokes=geometry((now-origin)/1000);
      renderPreview(strokes,config);
      q('count').textContent=`${points.notes.size} / 8 loci`;
      if(emitting)q('status').textContent=`OUTPUT RUNNING · ${usb.sentFrames} frames transferred · ${config.scanRatePps} PPS · ${config.widthPercent}% field · ${config.intensityPercent}% signal`;
      animation=requestAnimationFrame(draw);
    }catch(error){stop();notify(error.message);}
  }
  async function pump(token) {
    if(!running||!emitting||disposed||token!==lease||document.hidden)return;
    if(!usb.outputEnabled||!usb.device){stop({hardware:false});q('status').textContent='OUTPUT STOPPED · reconnect / start explicitly';return;}
    try{
      const frame=compileLaserFrame(geometry((performance.now()-origin)/1000),testConfig||profile.get());await usb.sendFrame(frame.points,frame.pps);
      if(token===lease&&running)timer=setTimeout(()=>pump(token),8);
    }catch(error){stop();q('status').textContent=`OUTPUT FAULT · ${error.message}`;notify(error.message);}
  }
  function preview(){stop();if(disposed||document.hidden)return;running=true;origin=performance.now();lastDraw=0;q('status').textContent='PREVIEW ONLY · no frame transmission';animation=requestAnimationFrame(draw);}
  async function startOutput({test=false}={}) {
    if(disposed||document.hidden||outputPending||emitting)return;
    stop({hardware:false});if(test)testConfig={...profile.get(),widthPercent:100,heightPercent:100,offsetXPercent:0,offsetYPercent:0};const token=lease;outputPending=true;q('output').disabled=true;
    try{
      if(!usb.device)throw new Error('Connect HELIOS first');
      const frame=compileLaserFrame(geometry(0),testConfig||profile.get()),blank={pps:frame.pps,points:frame.points.map(p=>({...p,r:0,g:0,b:0,i:0}))};
      await usb.startOutput(blank);if(token!==lease||disposed||document.hidden){await usb.stop();return;}
      outputPending=false;running=true;emitting=true;origin=performance.now();lastDraw=0;animation=requestAnimationFrame(draw);pump(token);if(test)testTimer=setTimeout(()=>{if(token===lease)stop();},1000);
    }catch(error){if(token===lease){stop();q('status').textContent=`OUTPUT STOPPED · ${error.message}`;notify(error.message);}}
  };
  q('output').onclick=()=>startOutput();
  async function connectAndStart(test=false){
    if(connecting)return;const token=lease;connecting=true;
    try{
      if(!usb.device)await usb.connect();
      const deadline=performance.now()+1600;
      while(usb.busy&&token===lease&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,8));
      if(token===lease&&!disposed&&!document.hidden)await startOutput({test});
    }
    finally{connecting=false;}
  }
  async function toggle(){if(emitting||outputPending||connecting){stop();return;}await connectAndStart();}
  async function testOutput(){let token=lease;if(emitting||outputPending){const stopped=stop();token=lease;await stopped;}if(token===lease&&!disposed&&!document.hidden)await connectAndStart(true);}
  q('test').onclick=()=>testOutput().catch(error=>notify(error.message));
  q('preview').onclick=preview;q('stop').onclick=stop;
  q('mode').onchange=()=>{stop();for(const name of ['frame','sweep','text','midi'])q(`${name}-controls`).hidden=q('mode').value!==name;q('sweep-controls-extra').hidden=q('mode').value!=='sweep';};
  for(const name of ['shape','direction','text'])q(name).addEventListener('change',()=>{if(running)stop();});
  q('speed').oninput=()=>{q('speed-label').value=`${Number(q('speed').value).toFixed(1)} s`;};
  for(const name of ['route','channel'])q(name).onchange=()=>points.clear();
  q('demo').onclick=()=>{if(!running)preview();points.receive([0x90,60,96]);clearTimeout(demoTimer);demoTimer=setTimeout(()=>points.receive([0x80,60,0]),600);};
  const action=fn=>async()=>{try{await fn();}catch(error){notify(error.message);q('status').textContent=error.message;}};
  q('usb').onclick=action(()=>usb.connect());q('usb-status-button').onclick=action(()=>usb.status());q('usb-disconnect').onclick=action(async()=>{stop({hardware:false});await usb.emergencyStop();});
  const visibility=()=>{if(document.hidden)stop();},disconnect=event=>{if(!usb.device){stop({hardware:false});q('status').textContent='USB disconnected · output stopped';}};
  document.addEventListener('visibilitychange',visibility);usbApi?.addEventListener('disconnect',disconnect);renderPreview(geometry(0),profile.get());
  return {stop,toggle,test:testOutput,status:()=>({connected:!!usb.device,emitting, pending:outputPending||connecting,preview:running&&!emitting,message:q('usb-status').textContent}),midi(bytes){if(running&&q('mode').value==='midi'&&q('route').checked)points.receive(bytes,q('channel').value==='all'?'all':Number(q('channel').value));},async panic(){stop({hardware:false});await usb.emergencyStop();},dispose(){stop();disposed=true;mapping.dispose();profile.dispose();usb.dispose().catch(()=>{});document.removeEventListener('visibilitychange',visibility);usbApi?.removeEventListener('disconnect',disconnect);container.replaceChildren();}};
}
