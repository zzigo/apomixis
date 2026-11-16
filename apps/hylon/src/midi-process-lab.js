import {Midi} from '@tonejs/midi';
import {processMidiWindow} from '../../../packages/hylon-midi-process/model.js';
import {createNoteLabPlayer} from './note-lab-player.js';
import {decorateOutputControl} from './output-controls.js';
import {DIVISION_UI} from '../../../packages/hylon-midi/divisions.js';
export function mountMidiProcessLab(container,{audio,sampler,midiOut,notify}){
 const root=document.createElement('section');root.className='midi-process-lab';root.setAttribute('aria-label','M-MORPH');
 root.innerHTML=`<div class="midi-files">${['A','B'].map(id=>`<section><label class="file-button">MIDI ${id}<input data-file="${id}" type="file" accept=".mid,.midi,audio/midi" hidden></label><select data-library="${id}" aria-label="MIDI ${id} library"><option value="">LOCAL LIBRARY…</option></select><select data-track="${id}" aria-label="MIDI ${id} track"><option value="all">ALL TRACKS</option></select><output data-info="${id}">No file</output></section>`).join('')}</div><div class="midi-lab-controls"><button data-play title="Play/stop processed loop">▶</button><div data-routes></div><button data-export title="Export processed window snapshots as MIDI; live gestures are not recorded">↧ MIDI</button></div><div class="midi-lab-fields"></div><canvas data-roll aria-label="Processed MIDI window"></canvas><output data-status role="status">Load MIDI A · files stay on this Mac</output>`;
 container.append(root);const q=key=>root.querySelector(`[data-${key}]`),fields={},routes={klais:false,audio:false,midi:false},files={A:null,B:null},workers={},fileRevision={A:0,B:0};let timer=null,pending=false,revision=0,disposed=false,frame=null,playhead=0,dirty=true;
 const player=createNoteLabPlayer({id:'midi-process',audio,sampler,midiOut,onError:error=>{stop();notify(error.message);}});
 function status(text){q('status').textContent=text;}
 function field(name,label,value,min,max,step=1){const box=document.createElement('label');box.title=label;box.textContent=label;const input=document.createElement('input');input.type='number';Object.assign(input,{value,min,max,step});fields[name]=input;box.append(input);root.querySelector('.midi-lab-fields').append(box);input.oninput=input.onchange=controlsChanged;return input;}
 field('start','Start / s',0,0,86400,.01);field('length','Window / s',2,.05,60,.01);field('shift','Slide / loop s',0,-60,60,.01);field('speed','Speed ×',1,.05,32,.05);field('octave','Random octave %',0,0,100);field('octaves','Octave range ±',1,1,3);field('morph','Morph A → B %',0,0,100);field('transition','Transition / loops',0,0,128);field('morphEnd','Morph target %',100,0,100);field('octaveEnd','Octave target %',100,0,100);field('seed','Seed',1931,0,4294967295);field('exportLoops','Export loops',1,1,64);
 const h=document.createElement('label');h.textContent='Harmony / semitones';fields.harmony=document.createElement('input');fields.harmony.value='0';h.append(fields.harmony);root.querySelector('.midi-lab-fields').append(h);fields.harmony.oninput=fields.harmony.onchange=controlsChanged;
 const manual=document.createElement('label');manual.textContent='Division';fields.manual=document.createElement('select');for(const [value,label]of [['source','SOURCE (1–5; others I)'],['cycle','P I II III IV'],['5','P'],['1','I'],['2','II'],['3','III'],['4','IV']]){const o=document.createElement('option');o.value=value;o.textContent=label;fields.manual.append(o);}manual.append(fields.manual);root.querySelector('.midi-lab-fields').append(manual);
 const fold=document.createElement('label');fold.textContent='Fold to organ range';fields.fold=document.createElement('input');fields.fold.type='checkbox';fold.append(fields.fold);root.querySelector('.midi-lab-fields').append(fold);fields.fold.onchange=fields.manual.onchange=controlsChanged;
 for(const route of Object.keys(routes)){const b=document.createElement('button');decorateOutputControl(b,route,'MIDI Process');b.onclick=()=>{stop();routes[route]=!routes[route];b.classList.toggle('active',routes[route]);b.setAttribute('aria-pressed',String(routes[route]));};q('routes').append(b);}
 function options(){const result={};for(const name of ['start','length','shift','speed','octave','octaves','morph','transition','morphEnd','octaveEnd','seed','exportLoops']){const input=fields[name],value=Number(input.value);if(!input.value.trim()||!Number.isFinite(value)||value<Number(input.min)||value>Number(input.max))throw new Error(`Invalid ${name}`);result[name]=value;}const harmony=fields.harmony.value.trim().split(/[ ,]+/).map(Number);if(!harmony.length||harmony.length>8||harmony.some(n=>!Number.isInteger(n)||n< -48||n>48))throw new Error('Harmony:1–8 semitone offsets, -48…48');return {...result,octave:result.octave/100,morph:result.morph/100,morphEnd:result.morphEnd/100,octaveEnd:result.octaveEnd/100,harmony:[...new Set(harmony)],manual:fields.manual.value,fold:fields.fold.checked,trackA:root.querySelector('[data-track="A"]').value,trackB:root.querySelector('[data-track="B"]').value};}
 function draw(){const canvas=q('roll'),rect=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);canvas.width=Math.round(rect.width*d);canvas.height=Math.round(rect.height*d);const x=canvas.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,rect.width,rect.height);if(!frame)return;const low=Math.min(24,...frame.notes.map(n=>n.midi)),high=Math.max(96,...frame.notes.map(n=>n.midi)),Y=n=>(high-n)/(high-low+1)*rect.height;for(let n=Math.ceil(low/12)*12;n<=high;n+=12){x.strokeStyle='#1b3022';x.beginPath();x.moveTo(0,Y(n));x.lineTo(rect.width,Y(n));x.stroke();}for(const note of frame.notes){const color=Object.values(DIVISION_UI).find(d=>d.channel===note.channel)?.color||'#b6ffcf';x.fillStyle=color;x.fillRect(note.time/frame.duration*rect.width,Y(note.midi),Math.max(1,note.duration/frame.duration*rect.width),Math.max(1,rect.height/(high-low+1)));}if(timer){x.strokeStyle='#ffbd69';x.beginPath();x.moveTo(playhead/frame.duration*rect.width,0);x.lineTo(playhead/frame.duration*rect.width,rect.height);x.stroke();}}
 function controlsChanged(){dirty=true;if(!timer)try{preview();}catch(error){status(error.message);}}
 function preview(cycle=0){if(!files.A||timer)return;frame=processMidiWindow(files.A,files.B,options(),cycle);draw();if(!timer)status(`${frame.notes.length} notes · window ${frame.start.toFixed(2)}s · ${frame.duration.toFixed(2)}s processed`);}
 function stop(){revision++;pending=false;clearInterval(timer);timer=null;player.stop();q('play').textContent='▶';q('play').classList.remove('active');playhead=0;draw();}
 for(const id of ['A','B']){
  root.querySelector(`[data-track="${id}"]`).onchange=controlsChanged;
  const loadFile=async(file,mine=++fileRevision[id])=>{
   if(!file||disposed||mine!==fileRevision[id])return;stop();workers[id]?.terminate();if(file.size>8*1024*1024){status('MIDI file max8MiB');return;}const worker=new Worker(new URL('./midi-file-worker.js',import.meta.url),{type:'module'});workers[id]=worker;status(`Analyzing ${id}…`);
   worker.onmessage=event=>{if(disposed||workers[id]!==worker)return;worker.terminate();delete workers[id];if(!event.data.ok){status(event.data.error);return;}files[id]=event.data.file;const data=files[id],select=root.querySelector(`[data-track="${id}"]`);select.replaceChildren();for(const track of [{index:'all',name:'ALL TRACKS'},...data.tracks]){const option=document.createElement('option');option.value=String(track.index);option.textContent=track.index==='all'?track.name:`${Number(track.index)+1} ${track.name} · ch${track.channel} · ${track.count}`;select.append(option);}root.querySelector(`[data-info="${id}"]`).textContent=`${data.name} · ${data.notes.length} notes · ${data.duration.toFixed(2)}s · MIDI ${data.low}–${data.high} · poly ${data.polyphony} · ${data.tempos.map(t=>Math.round(t.bpm)).join('→')||120} BPM`;if(id==='A'){fields.start.max=String(data.duration);fields.start.value='0';fields.length.value=String(Math.max(.05,Math.min(2,data.duration)));}try{preview();}catch(error){status(error.message);}};
   worker.onerror=()=>{worker.terminate();if(workers[id]===worker){delete workers[id];status('MIDI analysis failed');}};
   try{const buffer=await file.arrayBuffer();if(workers[id]!==worker)return;worker.postMessage({buffer,name:file.name},[buffer]);}catch(error){worker.terminate();status(error.message);}
  };
  root.querySelector(`[data-file="${id}"]`).onchange=event=>loadFile(event.target.files[0]);
  root.querySelector(`[data-library="${id}"]`).onchange=async event=>{const name=event.target.value;if(!name)return;const mine=++fileRevision[id];try{const response=await fetch(`/midi/${encodeURIComponent(name)}`);if(!response.ok)throw new Error('MIDI library file unavailable');const data=await response.blob();if(disposed||mine!==fileRevision[id])return;await loadFile(new File([data],name),mine);}catch(error){status(error.message);}};

 }
 q('play').onclick=async()=>{
  if(timer||pending){stop();return;}const mine=++revision;pending=true;
  try{preview();if(!files.A)throw new Error('Load MIDI A first');let accepted=options();await player.prepare(routes);if(disposed||mine!==revision)return;
   let cycle=0,phase=0,last=performance.now()/1000,lastModel=-Infinity,lastDraw=-Infinity,midiEpoch=midiOut.summary().epoch,windows=[];
   const live=new Map(),fired=new Set();dirty=true;
   function release(id,allowReplay=false){const entry=live.get(id);if(entry?.owner)player.release(entry.owner);live.delete(id);if(allowReplay)fired.delete(id);}
   const tick=()=>{try{
    const now=performance.now()/1000,delta=now-last;
    if(document.hidden||delta>.3||delta<0||(routes.audio||routes.klais)&&audio.context?.state!=='running'||routes.midi&&(!midiOut.summary().armed||midiOut.summary().epoch!==midiEpoch)){stop();return;}
    last=now;phase+=delta/Math.max(.001,frame.duration);const crossed=Math.floor(phase);if(crossed){cycle+=crossed;phase-=crossed;dirty=true;for(const id of fired)if(Number(id.split(':')[0])<cycle-1)fired.delete(id);}
    let edited=false;
    if(dirty){try{accepted=options();edited=true;}catch(error){status(error.message);}dirty=false;}
    if(edited||crossed||now-lastModel>=.05){
     frame=processMidiWindow(files.A,files.B,accepted,cycle,cycle+phase);windows=[{frame,cycle,offset:-phase*frame.duration}];
     let offset=(1-phase)*frame.duration,upcoming=cycle+1;
     while(offset<=.06){if(windows.length>=128)throw new Error('M-MORPH window is too short');const next=processMidiWindow(files.A,files.B,accepted,upcoming,upcoming);windows.push({frame:next,cycle:upcoming,offset});offset+=next.duration;upcoming++;}
     lastModel=now;if(edited)for(const id of [...fired])if(!live.has(id))fired.delete(id);
    }else{const elapsed=delta;for(const window of windows)window.offset-=elapsed;}
    const wanted=new Map(),known=new Map();let budget=0;
    for(const window of windows)for(const note of window.frame.notes){
     const when=now+window.offset+note.time,endTime=when+note.duration;
     known.set(note.id,{when,endTime});if(endTime<=now||when>now+.06)continue;
     wanted.set(note.id,{note,when,endTime,cycle:window.cycle});
    }
    for(const [id,entry]of live){
     if(wanted.has(id))continue;
     if(entry.cycle<cycle&&entry.when<=now&&entry.endTime>now)continue;
     release(id,entry.when>now||known.get(id)?.when>now);if(entry.endTime<=now)live.delete(id);
    }
    for(const [id,target]of wanted){
     const {note,when,endTime}=target;let entry=live.get(id);
     if(entry){const pitchChanged=entry.note.midi!==note.midi||entry.note.channel!==note.channel,pendingMove=entry.when>now+.003&&Math.abs(entry.when-when)>.003;
      if(pitchChanged||pendingMove){release(id,true);entry=null;}
      else{if(entry.owner)player.update(entry.owner,{endTime,velocity:note.velocity});entry.note=note;entry.endTime=endTime;continue;}
     }
     if(fired.has(id))continue;if(++budget>512)throw new Error('M-MORPH scheduling budget exceeded');
     const at=Math.max(now,when),remaining=Math.max(.01,endTime-at),owner=player.dispatch({...note,duration:remaining},at,routes);
     live.set(id,{...target,owner,when:at});fired.add(id);
    }
    playhead=phase*frame.duration;
    if(edited||now-lastDraw>=.05){draw();lastDraw=now;}
    status(`LOOP ${cycle+1} · live window ${frame.start.toFixed(2)}s · ${frame.notes.length} notes · morph ${Math.round(frame.morph*100)}%`);
   }catch(error){stop();status(error.message);notify(error.message);}};
   timer=setInterval(tick,25);q('play').textContent='■';q('play').classList.add('active');tick();
  }catch(error){if(mine===revision){stop();status(error.message);notify(error.message);}}finally{if(mine===revision)pending=false;}
 };
 q('export').onclick=()=>{try{if(!files.A)throw new Error('Load MIDI A');const opt=options(),midi=new Midi(),tracks=new Map();let time=0,count=0;for(let cycle=0;cycle<Math.floor(opt.exportLoops);cycle++){const window=processMidiWindow(files.A,files.B,opt,cycle);for(const note of window.notes){if(++count>100000)throw new Error('Export max100000 notes');if(!tracks.has(note.channel)){const track=midi.addTrack();track.channel=note.channel-1;tracks.set(note.channel,track);}tracks.get(note.channel).addNote({midi:note.midi,time:time+note.time,duration:note.duration,velocity:note.velocity/127});}time+=window.duration;}const url=URL.createObjectURL(new Blob([midi.toArray()],{type:'audio/midi'})),a=document.createElement('a');a.href=url;a.download='HYLON-MIDI-PROCESS.mid';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status(`Exported ${count} notes / ${time.toFixed(2)}s`);}catch(error){status(error.message);}};
 fetch('/midi/index.json',{cache:'no-store'}).then(response=>response.ok?response.json():null).then(index=>{if(disposed||!Array.isArray(index?.files))return;for(const id of ['A','B']){const select=root.querySelector(`[data-library="${id}"]`);for(const file of index.files){if(typeof file.file!=='string'||/[\\/]/.test(file.file)||!/^.+\.midi?$/i.test(file.file))continue;const option=document.createElement('option');option.value=file.file;option.textContent=file.name||file.file;select.append(option);}}}).catch(()=>{});
 const resize=new ResizeObserver(draw);resize.observe(q('roll'));const hidden=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hidden);
 return {setVisible(value){root.hidden=!value;},stop,dispose(){stop();disposed=true;for(const worker of Object.values(workers))worker.terminate();resize.disconnect();player.dispose();document.removeEventListener('visibilitychange',hidden);root.remove();}};
}
