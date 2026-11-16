import {createHexSequencer} from '../../../packages/hylon-laser/hex-sequencer.js';
import { mountQuadMapper } from './quad-mapper.js';
import { createQuadMapper, identityQuad } from '../../../packages/hylon-laser/quad.js';
import { HeliosUsb } from '../../../packages/hylon-laser/helios-usb.js';
import { mountLaserProfile } from './laser-profile.js';
import { projectLaserPoint } from '../../../packages/hylon-laser/profile.js';
import { compileLaserFrame, midiStrokes, textStrokes } from '../../../packages/hylon-laser/frame.js';
import { formatLaserCue, cueAccepts } from '../../../packages/hylon-laser/score-cue.js';
import { pasteAtCursor } from './score-paste.js';
import { MidiPoints, testFrame, sweepFrame } from '../../../packages/hylon-laser/patterns.js';
export function mountLaser(container, { notify = () => {}, usbApi = navigator.usb, settingsStorage, getEditor = () => null, getScoreTime = () => null } = {}) {
  container.classList.add('helios-pod');
  container.innerHTML = `<div class="panel-body"><div class="eyebrow">LASER</div><div class="toolbar"><button data-usb>CONNECT HELIOS</button><button data-output class="primary">START OUTPUT</button><button data-stop class="danger">BLACKOUT</button><button data-preview>PREVIEW ONLY</button><button data-test title="Full field square for 1 second at current intensity and PPS">TEST □ / 1s</button></div><p data-status class="status">STOPPED · connect HELIOS, then START OUTPUT</p><p data-usb-status class="muted">USB disconnected</p>
    <div class="toolbar"><label class="field">Pattern<select data-mode><option value="frame">FRAME</option><option value="sweep">SWEEP</option><option value="text">TEXT</option><option value="midi">MIDI XY</option></select></label><label data-frame-controls class="field">Geometry<select data-shape><option value="square">Square</option><option value="high">High edge</option><option value="low">Low edge</option></select></label><label data-sweep-controls class="field" hidden>Direction<select data-direction><option value="sequence">LR → RL → TD → DT</option><option>LR</option><option>RL</option><option>TD</option><option>DT</option></select></label><label data-text-controls class="field" hidden>Text<input data-text maxlength="12" value="HYLON"></label></div>
    <div data-profile-root></div><div data-sweep-controls-extra class="toolbar" hidden><label class="field">Seconds per pass<input data-speed type="range" min="0.1" max="10" step="0.1" value="2"><output data-speed-label>2.0 s</output></label><span data-direction-label></span></div>
    <div data-midi-controls class="toolbar" hidden><label class="field checkbox"><input data-route type="checkbox" checked>Selected MIDI input</label><label class="field">Channel<select data-channel><option value="all">All</option>${Array.from({length:16},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label><label class="field" title="Minimum is a tiny scanned locus, visually a point">Point size<input data-point-size type="range" min="0" max="100" step="1" value="0" aria-label="MIDI XY point size"></label><button data-demo>DEMO NOTE</button><span data-count>0 / 8 loci</span></div>
    <div data-cue-controls class="toolbar laser-cue" hidden title="SCORE cue: score notes pulse random XY loci while YOU run preview/output. The score never starts the laser."><label class="field checkbox"><input data-score-route type="checkbox" checked>Score notes</label><label class="field">src<select data-cue-src><option value="all">all</option><option value="go">I</option><option value="po">II</option><option value="re">III</option><option value="so">IV</option><option value="pe">P</option></select></label><label class="field">prob %<input data-cue-prob type="number" min="0" max="100" step="1" value="100"></label><label class="field">max<input data-cue-max type="number" min="1" max="8" step="1" value="8"></label><label class="field">dur ×<input data-cue-dur type="number" min="0.05" max="4" step="0.05" value="1"></label><button data-cue-paste class="cue-paste" title="Paste laser cue at the SCORE TXT cursor line">P</button><button data-cue-off title="Paste 'laser off' at the SCORE TXT cursor line">P OFF</button><code data-cue-line class="cue-line"></code></div>
    <div class="laser-mapping"><div class="map-toolbar"><button data-warp class="warp-toggle" title="Warp OFF · bypass stored mapping" aria-label="Warp" aria-pressed="false">W</button><span data-warp-state class="muted">WARP OFF</span><button data-map-reset class="map-reset" title="Reset four mapping corners">RESET MAP</button></div><div class="laser-map-stage"><canvas data-canvas width="720" height="720" role="img" aria-label="LASER mapped preview"></canvas><svg data-map-outline viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="0,0 100,0 100,100 0,100"/></svg><div data-map-handles></div></div><canvas data-original width="180" height="180" role="img" aria-label="Original generator preview" title="Original generator · before mapping"></canvas></div>
    <details><summary>CONNECTION DETAILS</summary><div class="toolbar"><button data-usb-status-button>DAC STATUS</button><button data-usb-disconnect>DISCONNECT</button></div><p class="muted">RGB vector output; text A–Z / 0–9 / dash, up to 12 characters within the frame budget. MIDI loci are scanned rings, not stationary beams. Close TouchDesigner before connecting. One-shot frames stop repeating when updates cease on supported firmware; this is not an independent projector interlock. Use a controlled projection area without people in the beam.</p></details></div>`;
  const q = key => container.querySelector(`[data-${key}]`), canvas = q('canvas'), ctx = canvas.getContext('2d'), points = new MidiPoints({limit:8});
  let mapping, warpEnabled=false, frameSequence=null, framePart=0, frameParts=1;
  let params={mode:'frame',shape:'square',direction:'sequence',text:'HYLON',pointSize:0};
  // Score `laser line` cue: a vertical line crossing the field over the cue's span, its colour
  // following the score clock. Only while the operator runs preview/output and SCORE routing is on.
  let scoreLine=null,hexCue=null;const hex=createHexSequencer(),hexActive=()=>!!hexCue&&!!q('score-route')?.checked;
  // Score `laser flash` cue: full-field frame lit for cue.dur on each accepted attack.
  let flashCue=null,flashUntil=0;
  let pointCue=null; // score midixy cue with optional color/field/signal overrides
  const flashActive=()=>!!flashCue&&!!q('score-route')?.checked;
  const lineProgress=()=>{const s=Number(getScoreTime?.());if(!scoreLine||!Number.isFinite(s))return null;return Math.max(0,Math.min(1,(s-scoreLine.span[0])/(scoreLine.span[1]-scoreLine.span[0])));};
  const lineActive=()=>!!scoreLine&&!!q('score-route')?.checked&&lineProgress()!==null;
  // laser text: each letter mutates with probability mutate(p) at `rate` steps per second (seeded by step).
  const GLYPH_SET='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',hash=(a,b)=>{let h=Math.imul(a+1,0x9e3779b1)^Math.imul(b+1,0x85ebca6b);h=Math.imul(h^(h>>>15),0x2c1b3c6d);h^=h>>>12;return(h>>>0)/4294967296;};
  const mutateAt=p=>{const v=scoreLine.mutate;if(v.length===1)return v[0];const x=p*(v.length-1),i=Math.min(v.length-2,Math.floor(x));return v[i]+(v[i+1]-v[i])*(x-i);};
  function mutatedText(seconds,p){const step=Math.floor(Math.max(0,seconds)*scoreLine.rate),q=mutateAt(p);return [...scoreLine.text].map((c,i)=>c==='-'||hash(step,i)>=q?c:GLYPH_SET[Math.floor(hash(step,i+97)*GLYPH_SET.length)]).join('');}
  const lineColor=p=>{const f=scoreLine.curve==='log'?(10**p-1)/9:p;return scoreLine.from.map((a,i)=>Math.max(0,Math.min(1,a+(scoreLine.to[i]-a)*f)));};
  // field: as large as the stored offset allows (offset + size ≤ 100 %); signal: intensity percent.
  const lineOverrides=base=>{if(pointCue&&q('score-route')?.checked&&(pointCue.color||pointCue.field||pointCue.signal!==undefined)){const o={};if(pointCue.color)o.colorRgb=[...pointCue.color];if(pointCue.field){o.widthPercent=Math.min(pointCue.field,100-Math.abs(base.offsetXPercent||0));o.heightPercent=Math.min(pointCue.field,100-Math.abs(base.offsetYPercent||0));}if(pointCue.signal!==undefined)o.intensityPercent=pointCue.signal;return o;}if(hexActive())return{widthPercent:Math.min(hexCue.field,100-Math.abs(base.offsetXPercent||0)),heightPercent:Math.min(hexCue.field,100-Math.abs(base.offsetYPercent||0)),intensityPercent:hexCue.signal};if(flashActive()){const f=flashCue;return{colorRgb:[...f.color],widthPercent:Math.min(f.field,100-Math.abs(base.offsetXPercent||0)),heightPercent:Math.min(f.field,100-Math.abs(base.offsetYPercent||0)),intensityPercent:f.signal};}if(!lineActive())return{};const o={colorRgb:lineColor(lineProgress())};
    if(scoreLine.field!==null){o.widthPercent=Math.min(scoreLine.field,100-Math.abs(base.offsetXPercent||0));o.heightPercent=Math.min(scoreLine.field,100-Math.abs(base.offsetYPercent||0));}
    if(scoreLine.signal!==null)o.intensityPercent=scoreLine.signal;return o;};
  const outputConfig=(base=profile.get())=>({...base,warpQuad:warpEnabled?base.warpQuad:identityQuad(),...lineOverrides(base)});
  let running = false, emitting = false, outputPending = false, connecting = false, disposed = false, animation = 0, timer = 0, origin = 0, lastDraw = 0, demoTimer, testTimer, testConfig = null, lease = 0;
  const usb = new HeliosUsb({usb:usbApi,onState:message=>{if(!disposed)q('usb-status').textContent=message;}});
  function clear(){if(ctx){ctx.globalAlpha=1;ctx.fillStyle='#000';ctx.fillRect(0,0,720,720);}}
  function stop({hardware=true}={}) {
    const wasOutput=emitting||usb.outputEnabled;frameSequence=null;framePart=0;frameParts=1;lease++;hex.clear();running=false;emitting=false;outputPending=false;q('output').disabled=false;cancelAnimationFrame(animation);clearTimeout(timer);clearTimeout(demoTimer);clearTimeout(testTimer);testConfig=null;points.clear();clear();
    mapping?.sync();q('status').textContent='STOPPED · no new frames';q('count').textContent='0 / 8 loci';
    if(hardware&&(wasOutput||usb.device))return usb.stop().catch(error=>notify(error.message));
  }
  const profile = mountLaserProfile(q('profile-root'), {onApply:({next}={})=>{
    if(running||outputPending)compileLaserFrame(geometry((performance.now()-origin)/1000,params,outputConfig(next)),outputConfig(next));
  },onChange:()=>{frameSequence=null;mapping?.sync();if(mapping&&!running){try{renderPreview(geometry(0),outputConfig());}catch{clear();}}},notify,storage:settingsStorage});
  const original=q('original'), originalCtx=original.getContext('2d');
  mapping=mountQuadMapper(container.querySelector('.laser-mapping'),{getProfile:profile.get,isEnabled:()=>warpEnabled,setQuad:quad=>profile.setQuad(quad),onChange:()=>{if(!running)renderPreview(geometry(0),outputConfig());},notify});
  q('profile-root').addEventListener('input',()=>{mapping.sync();if(!running)renderPreview(geometry(0),outputConfig());});
  function renderPreview(strokes,config) {
    clear();const mapper=createQuadMapper(config.warpQuad),rgb=`rgb(${config.colorRgb.map(v=>Math.round(v*255)).join(',')})`;
    for(const stroke of strokes){if(!ctx)break;ctx.globalAlpha=Math.max(.25,stroke.intensity);ctx.strokeStyle=stroke.colorRgb?`rgb(${stroke.colorRgb.map(v=>Math.round(v*255)).join(',')})`:rgb;ctx.lineWidth=2;ctx.beginPath();stroke.points.forEach(([x,y],i)=>{const[a,b]=projectLaserPoint(config,x,y,mapper);if(i)ctx.lineTo(1+a*718,1+b*718);else ctx.moveTo(1+a*718,1+b*718);});ctx.stroke();}
    if(ctx)ctx.globalAlpha=1;
    if(originalCtx){originalCtx.fillStyle='#000';originalCtx.fillRect(0,0,180,180);originalCtx.strokeStyle=rgb;originalCtx.lineWidth=2;for(const stroke of strokes){originalCtx.strokeStyle=stroke.colorRgb?`rgb(${stroke.colorRgb.map(v=>Math.round(v*255)).join(',')})`:rgb;originalCtx.beginPath();stroke.points.forEach(([x,y],i)=>{if(i)originalCtx.lineTo(1+x*178,1+y*178);else originalCtx.moveTo(1+x*178,1+y*178);});originalCtx.stroke();}}
    mapping.sync(profile.get(),!!testConfig);
  }
  function geometry(time,p=params,config=outputConfig()) {
    if(testConfig)return testFrame('square');
    if(hexActive())return hex.strokes(performance.now(),Number(getScoreTime?.())||0,hexCue,config);
    if(flashActive())return performance.now()<flashUntil?[...testFrame('square'),{intensity:1,points:[[0,0],[1,1]]},{intensity:1,points:[[1,0],[0,1]]}]:[];
    if(lineActive()){const x=lineProgress();if(scoreLine.mode==='text')return textStrokes(mutatedText(Number(getScoreTime?.()),x));return [{intensity:1,points:[[x,0],[x,1]]}];}
    if(p.mode==='frame')return testFrame(p.shape);
    if(p.mode==='text')return textStrokes(p.text);
    if(p.mode==='midi')return midiStrokes(points.snapshot(),p.pointSize,config);
    const result=sweepFrame(time,Number(q('speed').value),p.direction);q('direction-label').textContent=result.direction;return result.strokes;
  }
  function draw(now) {
    if(!running||disposed||document.hidden||!ctx)return;
    if(lastDraw&&now-lastDraw>300){stop();notify('HELIOS stopped after a browser stall.');return;}lastDraw=now;clear();
    try{
      const config=testConfig||outputConfig(),strokes=geometry((now-origin)/1000);
      // Show the score line's colour, field and signal on the profile sliders while it drives them.
      try{const base=profile.get(),o=lineOverrides(base);profile.showOverride?.(Object.keys(o).length?{...o,colorRgb:(o.colorRgb||base.colorRgb).map(v=>Math.round(v*100)/100)}:null);}catch{}
      renderPreview(strokes,config);
      q('count').textContent=hexActive()?`${strokes.length} / 6 HEX steps`:`${points.notes.size} / 8 loci`;
      if(emitting)q('status').textContent=`OUTPUT RUNNING · ${usb.sentFrames} frames transferred · ${config.scanRatePps} PPS · ${config.widthPercent}% field · ${config.intensityPercent}% signal${frameParts>1?` · scan ${frameParts} packets`:""}`;
      animation=requestAnimationFrame(draw);
    }catch(error){stop();notify(error.message);}
  }
  async function pump(token) {
    if(!running||!emitting||disposed||token!==lease||document.hidden)return;
    if(!usb.outputEnabled||!usb.device){stop({hardware:false});q('status').textContent='OUTPUT STOPPED · reconnect / start explicitly';return;}
    try{
      if(!frameSequence){const scan=compileLaserFrame(geometry((performance.now()-origin)/1000),testConfig||outputConfig());frameSequence=scan.frames;framePart=0;frameParts=frameSequence.length;}
      const sequence=frameSequence,frame=sequence[framePart];
      const accepted=await usb.sendFrame(frame.points,frame.pps);
      if(token===lease&&accepted&&frameSequence===sequence){framePart++;if(framePart>=sequence.length)frameSequence=null;}
      if(token===lease&&running)timer=setTimeout(()=>pump(token),8);
    }catch(error){stop();q('status').textContent=`OUTPUT FAULT · ${error.message}`;notify(error.message);}
  }
  function preview(){stop();if(disposed||document.hidden)return;running=true;origin=performance.now();lastDraw=0;q('status').textContent='PREVIEW ONLY · no frame transmission';animation=requestAnimationFrame(draw);}
  async function startOutput({test=false}={}) {
    if(disposed||document.hidden||outputPending||emitting)return;
    stop({hardware:false});if(test)testConfig={...outputConfig(),widthPercent:100,heightPercent:100,offsetXPercent:0,offsetYPercent:0};const token=lease;outputPending=true;q('output').disabled=true;
    try{
      if(!usb.device)throw new Error('Connect HELIOS first');
      const frame=compileLaserFrame(geometry(0),testConfig||outputConfig()),blank={pps:frame.pps,points:frame.points.map(p=>({...p,r:0,g:0,b:0,i:0}))};
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
  function updateParameter(key,control) {
    const next={...params,[key]:key==='pointSize'?Number(control.value):control.value};
    try {
      compileLaserFrame(geometry((performance.now()-origin)/1000,next),outputConfig());params=next;frameSequence=null;
      if(key==='mode')points.clear();
      for(const name of ['frame','sweep','text','midi'])q(`${name}-controls`).hidden=params.mode!==name;
      q('cue-controls').hidden=params.mode!=='midi';
      q('sweep-controls-extra').hidden=params.mode!=='sweep';
      if(!running)renderPreview(geometry(0),outputConfig());
    }catch(error){control.value=params[key];notify(error.message);}
  }
  for(const [key,name] of [['mode','mode'],['shape','shape'],['direction','direction'],['text','text'],['pointSize','point-size']])q(name).addEventListener(key==='pointSize'?'input':'change',()=>updateParameter(key,q(name)));
  q('warp').onclick=()=>{
    const next=!warpEnabled;
    try{
      compileLaserFrame(geometry(0,params,{...profile.get(),warpQuad:next?profile.get().warpQuad:identityQuad()}),{...profile.get(),warpQuad:next?profile.get().warpQuad:identityQuad()});
      warpEnabled=next;frameSequence=null;q('warp-state').textContent=`WARP ${next?'ON':'OFF'}`;q('warp').classList.toggle('active',next);q('warp').setAttribute('aria-pressed',String(next));q('warp').title=`Warp ${next?'ON':'OFF'} · ${next?'mapping active':'stored mapping bypassed'}`;mapping.sync();
      if(!running)renderPreview(geometry(0),outputConfig());
    }catch(error){notify(error.message);}
  };
  q('speed').oninput=()=>{frameSequence=null;q('speed-label').value=`${Number(q('speed').value).toFixed(1)} s`;};
  for(const name of ['route','channel'])q(name).onchange=()=>{points.clear();frameSequence=null;};
  q('demo').onclick=()=>{if(!running)preview();points.receive([0x90,60,96]);frameSequence=null;clearTimeout(demoTimer);demoTimer=setTimeout(()=>{points.receive([0x80,60,0]);frameSequence=null;},600);};
  // SCORE cue: notes from the running score → random XY pulses (same MidiPoints as MIDI input).
  const scoreTimers=new Set();let scoreSerial=0;
  const CUE_CH={go:1,po:2,re:3,so:4,pe:5};
  function cueFromControls(){return{mode:'midixy',src:[q('cue-src').value],size:Number(q('point-size').value),prob:Math.max(0,Math.min(100,Math.round(Number(q('cue-prob').value)||0))),max:Math.max(1,Math.min(8,Math.round(Number(q('cue-max').value)||8))),dur:Math.max(.05,Math.min(4,Number(q('cue-dur').value)||1))};}
  const renderCue=()=>{q('cue-line').textContent=formatLaserCue(cueFromControls());};
  for(const name of ['cue-src','cue-prob','cue-max','cue-dur','point-size'])q(name).addEventListener('input',renderCue);
  const pasteCue=line=>{try{const r=pasteAtCursor(getEditor(),line);notify(`LASER cue → SCORE TXT line ${r.line} · APPLY SCORE TXT`);}catch(error){notify(error.message);}};
  q('cue-paste').onclick=()=>pasteCue(formatLaserCue(cueFromControls()));q('cue-off').onclick=()=>pasteCue('laser off');
  function scoreStop(){hex.clear();for(const t of scoreTimers)clearTimeout(t);scoreTimers.clear();if(params.mode==='midi'){points.clear();frameSequence=null;}}
  function scoreNote(event,timing,cue){
    if(!running||!q('score-route').checked||!cueAccepts(cue,event.division)||Math.random()*100>=cue.prob)return false;
    if(cue.mode==='hex'){hexCue=cue;hex.receive(event,timing,cue);frameSequence=null;return true;}
    if(cue.mode==='flash'){const delay=Math.max(0,(timing.when-performance.now()/1000)*1000),token=lease;const on=setTimeout(()=>{scoreTimers.delete(on);if(token!==lease||!running)return;flashUntil=Math.max(flashUntil,performance.now()+cue.dur*1000);frameSequence=null;const off=setTimeout(()=>{scoreTimers.delete(off);if(performance.now()>=flashUntil-1)frameSequence=null;},cue.dur*1000+2);scoreTimers.add(off);},delay);scoreTimers.add(on);return true;}
    if(params.mode!=='midi'){q('mode').value='midi';updateParameter('mode',q('mode'));if(params.mode!=='midi')return false;}
    if(params.pointSize!==cue.size){q('point-size').value=String(cue.size);updateParameter('pointSize',q('point-size'));}
    const ch=CUE_CH[event.division]||1,note=event.payload.note,velocity=Math.max(1,Math.min(127,event.payload.velocity|0)),serial=++scoreSerial,token=lease,key=`${ch}:${note}`;
    const delay=Math.max(0,(timing.when-performance.now()/1000)*1000),length=Math.max(30,Math.min(600000,timing.durationSeconds*1000*cue.dur));
    const on=setTimeout(()=>{scoreTimers.delete(on);if(token!==lease||!running)return;
      while(points.notes.size>=cue.max)points.notes.delete(points.notes.keys().next().value);
      points.receive([0x90|(ch-1),note,velocity]);const item=points.notes.get(key);if(item)item.serial=serial;frameSequence=null;
      const off=setTimeout(()=>{scoreTimers.delete(off);if(points.notes.get(key)?.serial===serial){points.notes.delete(key);frameSequence=null;}},length);scoreTimers.add(off);
    },delay);scoreTimers.add(on);return true;
  }
  function scoreScene(cue){pointCue=cue?.mode==='midixy'?cue:null;if(cue?.mode==='hex'){hexCue=cue;scoreLine=null;flashCue=null;flashUntil=0;frameSequence=null;return;}hexCue=null;hex.clear();flashCue=null;flashUntil=0;if(cue?.mode==='flash'){scoreLine=null;flashCue=cue;frameSequence=null;return;}if(cue?.mode==='line'||cue?.mode==='text'){scoreLine=cue;frameSequence=null;return;}scoreLine=null;frameSequence=null;if(!cue||cue.mode==='off')scoreStop();}
  renderCue();
  const action=fn=>async()=>{try{await fn();}catch(error){notify(error.message);q('status').textContent=error.message;}};
  q('usb').onclick=action(()=>usb.connect());q('usb-status-button').onclick=action(()=>usb.status());q('usb-disconnect').onclick=action(async()=>{stop({hardware:false});await usb.emergencyStop();});
  const visibility=()=>{if(document.hidden)stop();},disconnect=event=>{if(!usb.device){stop({hardware:false});q('status').textContent='USB disconnected · output stopped';}};
  document.addEventListener('visibilitychange',visibility);usbApi?.addEventListener('disconnect',disconnect);renderPreview(geometry(0),outputConfig());
  return {stop,toggle,async remoteToggle(){if(emitting||outputPending||connecting){await stop();return;}if(!usb.device)throw new Error('Connect HELIOS locally on Mac first');await startOutput();if(!emitting)throw new Error(q('status').textContent||'Laser output did not start');},test:testOutput,scoreNote,scoreScene,scoreStop,status:()=>({connected:!!usb.device,emitting, pending:outputPending||connecting,preview:running&&!emitting,message:q('usb-status').textContent}),midi(bytes){if(running&&params.mode==='midi'&&q('route').checked){points.receive(bytes,q('channel').value==='all'?'all':Number(q('channel').value));frameSequence=null;}},async panic(){stop({hardware:false});await usb.emergencyStop();},dispose(){stop();disposed=true;mapping.dispose();profile.dispose();usb.dispose().catch(()=>{});document.removeEventListener('visibilitychange',visibility);usbApi?.removeEventListener('disconnect',disconnect);container.replaceChildren();}};
}
