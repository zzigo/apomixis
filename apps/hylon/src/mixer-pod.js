import {MIXER_SNAPSHOTS_KEY,validateMixerSnapshot} from './mixer-snapshots.js';
import { validParameter } from '../remote/schema.js';
import { decorateOutputControl } from './output-controls.js';
import {MIXER_DEFAULTS} from '../../../packages/hylon-audio/mixer.js';
import {createPitchFollower,FOLLOWER_DEFAULTS} from '../../../packages/hylon-audio/pitch-follower.js';
import {createFollowerRouter} from '../../../packages/hylon-audio/follower-router.js';
import {mountFollowerMatrix} from './follower-matrix.js';
import {FOLLOWER_COLUMNS,FOLLOWER_INTERVALS} from '../../../packages/hylon-audio/follower-matrix.js';
import './mixer.css';
const labels={tapeLevel:'TAPE',samplerLevel:'LEVEL',samplerReverb:'REV',samplerDelay:'DLY',localLevel:'LEVEL',localReverb:'REV',localDelay:'DLY',midiLevel:'VEL',micLevel:'LEVEL',micDry:'DRY',micTune:'TUNE',micReverb:'REV',micDelay:'DLY',reverbLevel:'LEVEL',reverbTime:'TIME',reverbDamping:'DAMP',reverbPreDelay:'PRE',delayLevel:'LEVEL',delayTime:'TIME',delayFeedback:'FDBK',master:'LEVEL',tuneAmount:'AMT',tuneRetuneMs:'RETUNE',tuneTranspose:'TRANS',chopRate:'HZ',chopDepth:'DEPTH'};
const control=(key,label,min=0,max=1,step=.01,value=MIXER_DEFAULTS[key])=>`<label class="mix-fader" title="${label}"><span>${labels[key]||label}</span><input type="range" data-mix="${key}" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${value}"><output data-value="${key}">${value}</output></label>`;
const meter=name=>`<div class="mix-meters" role="meter" aria-label="${name} stereo peak" aria-valuemin="-60" aria-valuemax="0" aria-valuenow="-60" data-level="${name}"><i><b></b></i><i><b></b></i></div>`;
const followField=(key,label,min,max,step=1)=>`<label class="field" title="${label}">${label}<input data-follow="${key}" aria-label="Follower ${label}" type="number" min="${min}" max="${max}" step="${step}" value="${FOLLOWER_DEFAULTS[key]}"></label>`;
export function mountMixer(container,{audio,midiOut,sampler,onFollowerMessage=()=>{},notify=()=>{},toggleAudio=()=>audio.ensure()}){
  container.innerHTML=`<div class="panel-body mixer-pod"><div class="toolbar"><div data-mixer-snapshots class="mixer-snapshots" role="group" aria-label="Mixer snapshots"></div><button data-enable-audio class="primary">AUDIO ON</button><button data-rec title="Record K, LA and MIC/TAPE as separate WAV files (.local/recordings). Armed: each PLAY starts a take, closed 2.5 s after it stops.">REC</button><output data-rec-status class="mix-small"></output><button data-mic-on title="Enable microphone audio to master; MIDI follower is independent">MIC TO MASTER</button><button data-mic-off title="Mute microphone audio; follower has its own switch">MUTE MIC</button><button data-clear-fx>CLEAR FX</button></div><p data-mix-status class="status"></p><div class="mix-strips">
  <section class="mix-strip" data-route-color="klais"><h3 title="KLAIS · local sampler">K</h3>${meter('sampler')}<div class="mix-faders">${control('samplerLevel','Klais level')}${control('samplerReverb','Klais reverb')}${control('samplerDelay','Klais delay')}</div></section>
  <section class="mix-strip" data-route-color="audio"><h3 title="LOCAL AUDIO · local synthesizer">LA</h3>${meter('local')}<div class="mix-faders">${control('localLevel','Local synth level')}${control('localReverb','Local synth reverb')}${control('localDelay','Local synth delay')}</div></section>
  <section class="mix-strip" data-route-color="midi"><h3 title="MIDI OUT · physical Klais organ">MO</h3><output data-midi-status class="mix-small"></output></section>
  <section class="mix-strip mic-strip"><h3>MIC</h3>${meter('mic')}<div class="mix-faders">${control('micLevel','Mic channel level')}${control('tapeLevel','Score tape (recorded voice) into the MIC strip')}${control('micDry','Raw mic to master, bypass autotune and chopper')}${control('micTune','Autotuned mic to master')}${control('micReverb','Mic reverb send')}${control('micDelay','Mic delay send')}</div><label class="field">Input<select data-mic-lane><option value="0">A</option><option value="1">B</option></select></label>
    <div class="mic-follower"><label class="field checkbox follower-toggle"><input data-follow-enable type="checkbox">MIDI FOLLOWER</label><div class="follower-routes" role="group" aria-label="Follower destinations"><button data-follow-route="audio" title="Generated notes to LOCAL AUDIO" aria-pressed="false">LOCAL</button><button data-follow-route="klais" title="Generated notes to selected Klais layers" aria-pressed="false">KLAIS</button><button data-follow-route="midi" title="Generated notes to selected physical MIDI OUT when M is ON" aria-pressed="true" class="active">MIDI</button></div><details><summary title="Monophonic pitch → generated notes. Monitor is always included; physical MIDI requires M ON.">FILTER</summary><div data-follower-matrix></div><div class="follow-grid">${followField('gateDb','Gate dB',-80,-10)}${followField('confidence','Confidence',.5,.99,.01)}${followField('stableMs','Stable ms',0,500,10)}${followField('releaseMs','Release ms',30,1000,10)}${followField('repeatMs','Repeat ms',0,2000,10)}${followField('minNote','Low note',0,127)}${followField('maxNote','High note',0,127)}${followField('transpose','Transpose',-24,24)}</div><label class="field checkbox"><input data-follow="filterRepeats" type="checkbox" checked>Filter repeats</label></details><output data-follow-status class="mix-small">OFF</output></div></section>
  <section class="mix-strip"><h3>REVERB</h3>${meter('reverb')}<div class="mix-faders">${control('reverbLevel','Reverb return')}${control('reverbTime','Reverb decay / seconds',.2,10,.1)}${control('reverbDamping','Reverb damping / Hz',800,16000,100)}${control('reverbPreDelay','Reverb pre-delay / seconds',0,.2,.001)}</div></section>
  <section class="mix-strip"><h3>DELAY</h3>${meter('delay')}<div class="mix-faders">${control('delayLevel','Delay return')}${control('delayTime','Delay seconds',.02,1.5)}${control('delayFeedback','Delay feedback',0,.8)}</div></section>
  <section class="mix-strip mix-master"><h3>MASTER</h3>${meter('master')}<div class="mix-faders">${control('master','Master level',0,1,.01,audio.masterLevel)}</div></section></div>
  <div class="mix-processors"><section class="mix-strip"><h3>AUTOTUNE</h3><div class="tune-selects"><label class="field">Scale<select data-tune-select="tuneScale"><option value="chromatic">Chromatic</option><option value="major">Major</option><option value="minor">Minor</option><option value="pentatonic">Pentatonic</option></select></label><label class="field">Root<select data-tune-select="tuneRoot">${['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'].map((name,index)=>`<option value="${index}">${name}</option>`).join('')}</select></label></div><div class="mix-faders">${control('tuneAmount','Pitch correction amount')}${control('tuneRetuneMs','Retune time / ms',0,300,1)}${control('tuneTranspose','Autotune transpose',-12,12,1)}</div></section><section class="mix-strip"><h3>CHOPPER</h3><div class="mix-faders">${control('chopRate','Chopper Hz',.25,32,.25)}${control('chopDepth','Chopper depth')}</div></section></div></div>`;
  container.querySelectorAll('.mix-strips>.mix-strip').forEach(strip=>{const meters=strip.querySelector('.mix-meters');if(!meters)return;const row=document.createElement('div');row.className='mix-channel-row';row.append(strip.querySelector('.mix-faders'),meters);strip.querySelector('h3').after(row);});
  container.querySelectorAll('[data-follow-route]').forEach(button=>decorateOutputControl(button,button.dataset.followRoute,'Mic follower'));
  const q=selector=>container.querySelector(selector),buffers=new Map();let disposed=false,visible=false,frame=0,last=0,pendingMic=0,pendingFollower=0,followerStarting=false;
  const routing=createFollowerRouter({audio,midiOut,sampler,onMessage:onFollowerMessage,onError:message=>{notify(message);q('[data-follow-status]').textContent=message;}});
  const follower=createPitchFollower(routing,{onState:state=>{audio.followerNote=state.enabled?state.active:null;q('[data-follow-status]').textContent=state.enabled?state.active===null?'LISTENING':`MIDI ${state.active}`:'OFF';}});
  const sendMatrix=mountFollowerMatrix(q('[data-follower-matrix]'),routing);
  const handle=fn=>async(...args)=>{try{await fn(...args);}catch(error){notify(error.message);q('[data-mix-status]').textContent=error.message;}};

  let snapshots=Array(4).fill(null),lastSnapshotSignature='',snapshotRevision=0;
  try{const saved=JSON.parse(localStorage.getItem(MIXER_SNAPSHOTS_KEY)||'null');if(Array.isArray(saved))snapshots=snapshots.map((_,index)=>{try{return saved[index]?validateMixerSnapshot(saved[index]):null;}catch{return null;}});}catch{}
  function captureSnapshot(){return validateMixerSnapshot({kind:'hylon-mixer-snapshot',version:1,values:{...MIXER_DEFAULTS,...audio.mixerSettings,...audio.mixer?.params,master:audio.masterLevel,midiLevel:audio.midiLevel,micLane:audio.micLane},follower:{params:{...follower.params},routes:{...routing.routes},matrix:[...routing.matrix()].sort()}});}
  function snapshotState(){const current=JSON.stringify(captureSnapshot()),stored=snapshots.map(Boolean),active=snapshots.map(snapshot=>snapshot!==null&&JSON.stringify(snapshot)===current);return {stored,active};}
  function renderSnapshots(){const state=snapshotState(),signature=JSON.stringify(state);if(signature===lastSnapshotSignature)return;lastSnapshotSignature=signature;snapshotButtons.forEach((button,index)=>{button.classList.toggle('stored',state.stored[index]);button.classList.toggle('active',state.active[index]);button.setAttribute('aria-pressed',String(state.active[index]));button.title=`Mixer ${index+1}${index===0?' · startup default':''} · click to recall · Shift+click to save${state.stored[index]?'':' · empty'}`;});}
  function saveSnapshot(number){if(!Number.isInteger(number)||number<1||number>4)throw new Error('Invalid mixer snapshot slot');const next=[...snapshots];next[number-1]=captureSnapshot();localStorage.setItem(MIXER_SNAPSHOTS_KEY,JSON.stringify(next));snapshots=next;renderSnapshots();const button=snapshotButtons[number-1];button.classList.add('saved');setTimeout(()=>button.classList.remove('saved'),500);notify(`Mixer ${number} saved${number===1?' · startup default':''}`);}
  function recallSnapshot(number,{startup=false}={}){
    if(!Number.isInteger(number)||number<1||number>4)throw new Error('Invalid mixer snapshot slot');if(!snapshots[number-1]){if(!startup)notify(`Mixer ${number} empty · Shift+click to save`);return;}
    const snapshot=validateMixerSnapshot(snapshots[number-1]),{master,micLane,...values}=snapshot.values;
    // Restore settings only; no ensure(), input request, monitoring enable or follower enable.
    snapshotRevision++;audio.setMixerSettings(values);audio.midiLevel=values.midiLevel;audio.setMicLane(micLane);audio.setMasterGain(master);
    follower.configure(snapshot.follower.params);for(const [key,value] of Object.entries(snapshot.follower.routes))routing.setRoute(key,value);routing.setMatrix(snapshot.follower.matrix);sendMatrix.sync();
    container.querySelectorAll('[data-mix]').forEach(input=>{const value=snapshot.values[input.dataset.mix];input.value=String(value);const output=q(`[data-value="${input.dataset.mix}"]`);if(output)output.value=Number.isInteger(value)?String(value):value.toFixed(2);});
    container.querySelectorAll('[data-tune-select]').forEach(input=>input.value=String(values[input.dataset.tuneSelect]));
    container.querySelectorAll('[data-follow]').forEach(input=>{const value=follower.params[input.dataset.follow];if(input.type==='checkbox')input.checked=value;else input.value=String(value);});
    container.querySelectorAll('[data-follow-route]').forEach(button=>{const on=routing.routes[button.dataset.followRoute];button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});
    if(audio.midiLevel===0){midiOut.stop();midiOut.stopFollower();}sync();renderSnapshots();if(!startup)notify(`Mixer ${number}`);
  }
  const snapshotButtons=Array.from({length:4},(_,index)=>{const button=document.createElement('button');button.type='button';button.textContent=String(index+1);button.setAttribute('aria-label',`Mixer snapshot ${index+1}`);button.onclick=handle(event=>event.shiftKey?saveSnapshot(index+1):recallSnapshot(index+1));q('[data-mixer-snapshots]').append(button);return button;});
  const snapshotTimer=setInterval(renderSnapshots,250);

  function stopFollower(){pendingFollower++;followerStarting=false;follower.stop();q('[data-follow-enable]').checked=false;}
  function sync(){if(disposed)return;{const b=q('[data-rec]');b.classList.toggle('active',!!audio.recArmed);b.classList.toggle('danger',!!audio.rec);b.textContent=audio.rec?'● REC':'REC';q('[data-rec-status]').textContent=audio.recStatus||'';}q('[data-enable-audio]').textContent=audio.context?.state==='running'?'AUDIO OFF':'AUDIO ON';q('[data-mix-status]').textContent=`Audio ${audio.context?.state||'off'} · mic ${audio.stream?audio.monitor?'MASTER ON':'audio muted':'off'}${audio.mixer?.processorError?' · '+audio.mixer.processorError:''}`;q('[data-mic-lane]').value=String(audio.micLane);q('[data-mix="master"]').value=audio.masterLevel;q('[data-value="master"]').value=audio.masterLevel.toFixed(2);if(!(audio.stream||audio.tapeReady)&&follower.enabled)stopFollower();}
  q('[data-enable-audio]').onclick=handle(toggleAudio);
  q('[data-mic-on]').onclick=handle(async()=>{const revision=++pendingMic;if(!audio.stream)await audio.start(audio.inputId);else await audio.ensure();if(!disposed&&revision===pendingMic&&audio.stream)audio.setMonitor(true);});
  q('[data-rec]').onclick=handle(async()=>{await audio.ensure();audio.setRecArmed(!audio.recArmed);});
  q('[data-mic-off]').onclick=()=>{pendingMic++;audio.setMonitor(false);};
  q('[data-clear-fx]').onclick=()=>{stopFollower();audio.mixer?.panic();audio.setMonitor(false);};
  q('[data-mic-lane]').onchange=event=>{stopFollower();audio.setMicLane(Number(event.target.value));audio.mixer?.resetMic();};
  q('[data-follow-enable]').onchange=handle(async event=>{
    if(!event.target.checked){stopFollower();return;}const revision=++pendingFollower;followerStarting=true;
    try{if(!audio.stream&&!audio.tapeReady)await audio.start(audio.inputId);else await audio.ensure();if(disposed||revision!==pendingFollower||!event.target.checked||!(audio.stream||audio.tapeReady))return;if(audio.mixer?.processorError)throw new Error(audio.mixer.processorError);await routing.prepare();if(disposed||revision!==pendingFollower||!event.target.checked)return;follower.enable();}catch(error){stopFollower();q('[data-follow-status]').textContent=error.message;throw error;}finally{if(revision===pendingFollower)followerStarting=false;}
  });
  container.querySelectorAll('[data-follow]').forEach(input=>input.onchange=handle(()=>follower.configure({[input.dataset.follow]:input.type==='checkbox'?input.checked:Number(input.value)})));
  container.querySelectorAll('[data-tune-select]').forEach(input=>input.onchange=handle(async()=>{const snapshotEpoch=snapshotRevision,key=input.dataset.tuneSelect,value=key==='tuneRoot'?Number(input.value):input.value;await audio.ensure();if(disposed||snapshotEpoch!==snapshotRevision)return;audio.setMixerSettings({[key]:value});}));
  container.querySelectorAll('[data-mix]').forEach(input=>{let revision=0;input.oninput=handle(async()=>{
    const own=++revision,snapshotEpoch=snapshotRevision,key=input.dataset.mix,value=Number(input.value);q(`[data-value="${key}"]`).value=Number.isInteger(value)?String(value):value.toFixed(2);
    if(key==='master'){audio.setMasterGain(value);return;}
    if(key==='midiLevel'){audio.midiLevel=value;if(value===0){midiOut.stop();midiOut.stopFollower();}return;}
    await audio.ensure();if(disposed||own!==revision||snapshotEpoch!==snapshotRevision)return;audio.setMixerSettings({[key]:value});
  });});
  container.querySelectorAll('[data-follow-route]').forEach(button=>button.onclick=handle(async()=>{const name=button.dataset.followRoute;routing.setRoute(name,!routing.routes[name]);button.classList.toggle('active',routing.routes[name]);button.setAttribute('aria-pressed',String(routing.routes[name]));if(follower.enabled)await routing.prepare();}));
  const unsubscribe=audio.onPitch(pitch=>{
    if(disposed)return;
    if(document.hidden||!(audio.stream||audio.tapeReady)){if(follower.enabled)stopFollower();return;}
    follower.process(pitch);
  });
  const followTimer=setInterval(()=>{routing.tick();follower.tick();if(!follower.enabled&&!followerStarting)q('[data-follow-enable]').checked=false;if(audio.context?.state!=='running'&&follower.enabled)stopFollower();const state=midiOut.summary();q('[data-midi-status]').textContent=`${state.armed?'ON':'OFF'} · ${state.sent}`;},50);
  function draw(now){if(!visible||disposed||document.hidden){frame=0;return;}if(now-last>50){last=now;for(const name of ['sampler','local','mic','reverb','delay','master']){const peaks=(audio.mixer?.meters[name]||[]).map(analyser=>{if(!buffers.has(analyser))buffers.set(analyser,new Float32Array(analyser.fftSize));const data=buffers.get(analyser);analyser.getFloatTimeDomainData(data);let peak=0;for(const sample of data)peak=Math.max(peak,Math.abs(sample));return peak;});const peak=Math.max(...peaks,0),db=peak>.001?20*Math.log10(peak):-Infinity,element=q(`[data-level="${name}"]`);element.setAttribute('aria-valuenow',String(Number.isFinite(db)?Math.max(-60,Math.min(0,db)):-60));element.title=`${name.toUpperCase()} · ${Number.isFinite(db)?db.toFixed(1)+' dBFS':'−∞ dBFS'}`;element.querySelectorAll('b').forEach((bar,index)=>{const p=peaks[index]||0;bar.style.height=`${Math.max(0,Math.min(1,(20*Math.log10(Math.max(.001,p))+60)/60))*100}%`;bar.classList.toggle('clip',p>=.891);});}}frame=requestAnimationFrame(draw);}
  function remoteState(){
    const values={...MIXER_DEFAULTS,...audio.mixerSettings,...audio.mixer?.params,master:audio.masterLevel,midiLevel:audio.midiLevel,micLane:audio.micLane,monitor:audio.monitor};
    const levels={};
    for(const name of ['sampler','local','mic','reverb','delay','master']){
      levels[name]=(audio.context?.state==='running'?audio.mixer?.meters[name]||[]:[]).map(analyser=>{
        if(!buffers.has(analyser))buffers.set(analyser,new Float32Array(analyser.fftSize));const data=buffers.get(analyser);analyser.getFloatTimeDomainData(data);let peak=0;for(const sample of data)peak=Math.max(peak,Math.abs(sample));return peak;
      });
    }
    values['follow.enabled']=follower.enabled;
    for(const [key,value] of Object.entries(follower.params))values['follow.'+key]=value;
    for(const [key,value] of Object.entries(routing.routes))values['follow.route.'+key]=value;
    return {values,levels,follower:{matrix:[...routing.matrix()],columns:FOLLOWER_COLUMNS,intervals:FOLLOWER_INTERVALS},snapshots:snapshotState(),ready:audio.context?.state==='running',micReady:!!audio.stream};
  }
  async function remoteSet(key,value){
    if(!validParameter('mixer',{key,value}))throw new Error('Invalid mixer parameter');
    if(key.startsWith('follow.')){
      if(key==='follow.enabled'){
        if(!value){stopFollower();return;}
        if(audio.context?.state!=='running'||!(audio.stream||audio.tapeReady))throw new Error('Enable AUDIO and MIC or load TAPE on the Mac first');
        if(audio.mixer?.processorError)throw new Error(audio.mixer.processorError);
        const revision=++pendingFollower;followerStarting=true;
        try{await routing.prepare();if(disposed||revision!==pendingFollower)return;follower.enable();q('[data-follow-enable]').checked=true;}finally{if(revision===pendingFollower)followerStarting=false;}
      }else if(key==='follow.reset'){
        if(value)routing.setMatrix([]);
      }else if(key.startsWith('follow.send.')){
        const [offset,channel]=key.slice(12).split(':').map(Number);routing.setSend(offset,channel,value);
      }else if(key.startsWith('follow.route.')){
        routing.setRoute(key.slice(13),value);if(follower.enabled)await routing.prepare();
      }else follower.configure({[key.slice(7)]:value});
      if(key==='follow.reset'||key.startsWith('follow.send.')){try{localStorage.setItem('hylon-follower-matrix-v1',JSON.stringify([...routing.matrix()]));}catch{}}
      sendMatrix.sync();
      container.querySelectorAll('[data-follow]').forEach(input=>{const v=follower.params[input.dataset.follow];if(input.type==='checkbox')input.checked=v;else input.value=String(v);});
      container.querySelectorAll('[data-follow-route]').forEach(button=>{const on=routing.routes[button.dataset.followRoute];button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});return;
    }
    if(key==='snapshotSave'){saveSnapshot(value);return;}
    if(key==='snapshotRecall'){recallSnapshot(value);return;}
    if(key==='clearFx'){if(value){stopFollower();audio.mixer?.panic();audio.setMonitor(false);}return;}
    if(key==='monitor'){
      if(value&&(!audio.stream||audio.context?.state!=='running'))throw new Error('Enable microphone locally on Mac first');
      pendingMic++;audio.setMonitor(value);sync();return;
    }
    if(key==='micLane'){stopFollower();audio.setMicLane(value);audio.mixer?.resetMic();sync();return;}
    if(key==='master'){audio.setMasterGain(value);sync();return;}
    if(key==='midiLevel'){audio.midiLevel=value;if(value===0){midiOut.stop();midiOut.stopFollower();}}
    else{if(audio.context?.state!=='running'||!audio.mixer)throw new Error('Enable AUDIO locally on Mac first');audio.setMixerSettings({[key]:value});}
    const input=container.querySelector(key.startsWith('tune')&&['tuneScale','tuneRoot'].includes(key)?`[data-tune-select="${key}"]`:`[data-mix="${key}"]`);
    if(input)input.value=String(value);const output=container.querySelector(`[data-value="${key}"]`);if(output)output.value=Number.isInteger(value)?String(value):Number(value).toFixed(2);
  }
  function setVisible(value){visible=value;cancelAnimationFrame(frame);if(visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  const visibility=()=>{if(document.hidden)stopFollower();setVisible(visible);};document.addEventListener('visibilitychange',visibility);recallSnapshot(1,{startup:true});renderSnapshots();sync();
  // Score `follow` cue: replaces the live send matrix (not persisted, never enables the follower).
  return{setFollowMatrix(keys){routing.setMatrix(keys);sendMatrix.sync();},remoteState,remoteSet,sync,setVisible,cancelPendingMic(){pendingMic++;stopFollower();},dispose(){if(disposed)return;stopFollower();sendMatrix.dispose();routing.dispose();disposed=true;pendingMic++;unsubscribe();clearInterval(followTimer);clearInterval(snapshotTimer);cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);buffers.clear();container.replaceChildren();}};
}
