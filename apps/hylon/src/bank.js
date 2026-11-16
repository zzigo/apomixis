import {noteActivity} from './note-activity.js';
import { mountOrganStaff } from './organ-staff.js';
import { DIVISION_UI, divisionInfo } from '../../../packages/hylon-midi/divisions.js';
import { createKlaisSampler } from '../../../packages/glip-klais/engine.js';
import { validateManifest, nearestSample } from '../../../packages/glip-klais/manifest.js';
import { createFetchLoader } from '../../../packages/glip-klais/loader.js';
const noteName = n => `${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n%12]}${Math.floor(n/12)-1}`;
const el = (tag,text,cls) => { const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e; };
const mib = bytes => `${(bytes/1024**2).toFixed(1)} MiB`;
export function mountKlaisBank(container,{getAudioContext,getDestination,getDirectDestination=null,notify=()=>{},onLibrary=()=>{},onLayers=()=>{},isAudioRunning=()=>false,notationRoot=null}) {
  container.innerHTML=`<div class="panel-body klais-bank"><div class="bank-header"><button data-midi-toggle class="route-button active" data-route-color="klais" title="Route selected MIDI IN to the local Klais sampler · ON" aria-label="MIDI input to Klais sampler" aria-pressed="true">MI</button><input data-midi type="checkbox" checked hidden><button data-stop class="bank-square danger" title="Stop sampler voices; keep decoded cache" aria-label="Stop sampler">■</button><div class="bank-range-buttons" role="group" aria-label="Keyboard range"><button data-range-choice="36,96" class="active" aria-pressed="true" title="Five-octave manual keyboard C2–C7 · MIDI 36–96">5OCT</button><button data-range-choice="24,55" aria-pressed="false" title="Pedal keyboard C1–G3 · MIDI 24–55">PED</button></div><output data-stats class="bank-stats"></output></div>
    <div class="bank-keyboard-scroll"><div data-keyboard class="bank-keyboard" aria-label="Klais keyboard, five octaves C2 to C7"></div></div>
    <div class="bank-subheader"><label class="field" title="Sampler gain">GAIN<input data-gain aria-label="Sampler gain" type="range" min="0" max="0.6" step="0.01" value="0.2"></label><label class="field" title="Release seconds">REL<input data-release aria-label="Release seconds" type="number" min="0.01" max="5" step="0.05" value="0.25"></label><label class="field" title="Transpose semitones">TR<input data-transpose aria-label="Transpose semitones" type="number" min="-48" max="48" step="1" value="0"></label><label class="field" title="Maximum sample stretch in semitones">STRETCH<select data-stretch aria-label="Maximum sample stretch"><option value="0">Exact</option><option value="2">2 st</option><option value="6" selected>6 st</option><option value="12">12 st</option></select></label><output data-note-status class="bank-note-status" role="status">Loading catalog…</output></div>
    <div class="bank-layout"><aside><div class="toolbar"><input data-search type="search" aria-label="Filter Klais banks" placeholder="Filter combinations…"><button data-none title="Clear selected layers">0</button></div><div data-registrations class="bank-registrations"></div></aside><section class="bank-inspector"><label class="field" title="Inspect source combination"><select data-inspect aria-label="Inspect combination"></select></label><p data-map-summary class="muted"></p><div data-samples class="bank-samples"></div></section></div>
    <details class="bank-advanced"><summary>ADVANCED</summary><div class="toolbar"><button data-load title="Reload the local library catalog">↻</button><button data-warm title="Optional: decode selected samples in advance, within the cache budget">PRELOAD</button><button data-export title="Export source manifest JSON">EXPORT MANIFEST</button><button data-chord title="Audition C4 E4 G4 for 1.2 seconds">CHORD</button></div><p data-library-status class="status" role="status">Reading local catalog…</p></details></div>`;
  const q=key=>container.querySelector(`[data-${key}]`);
  let rangeValue='36,96';
  const advanced=container.querySelector('.bank-advanced');advanced.querySelector('summary').after(container.querySelector('.bank-subheader')); 
  const staffHost=notationRoot||document.createElement('section');staffHost.classList.add('organ-notation-pod');
  const staff=mountOrganStaff(staffHost);
  let manifest=null, sampleMap=new Map(), active=[], inspected='', engine=null, initialization=null, sourceLoader=null, audioContext=null;
  let disposed=false, revision=0, loadRevision=0, warmBusy=false, statsTimer, chordTimer;
  const held=new Map(),midiHeld=new Map(),cleanups=[],scoreJobs=new Map();
  function stopScore(){for(const [owner,job]of scoreJobs){clearTimeout(job.start);clearTimeout(job.end);noteOff(owner);}scoreJobs.clear();}
  function dispatchScore(event,{when,durationSeconds,epoch}){
    if(disposed||document.hidden||event.kind!=='note'||!manifest||!active.length||audioContext?.state!=='running'||scoreJobs.size>=128)return;
    const wait=(when-performance.now()/1000)*1000;if(wait < -100)return;
    const owner=`score:${epoch}:${event.eventId}`,job={};scoreJobs.set(owner,job);
    job.start=setTimeout(()=>{if(scoreJobs.get(owner)===job)noteOn(owner,event.payload.note,event.payload.velocity,({go:1,po:2,re:3,so:4,pe:5})[event.division]||1);},Math.max(0,wait));
    job.end=setTimeout(()=>{noteOff(owner);scoreJobs.delete(owner);},Math.max(0,wait)+Math.max(10,Math.min(30000,durationSeconds*1000)));
  }
  const status=text=>{if(!disposed){q('note-status').textContent=text;q('note-status').title=text;}};
  const handle=fn=>async(...args)=>{try{await fn(...args);}catch(error){status(error.message);notify(`Klais: ${error.message}`);}};
  function stop({keepNotation=false}={}) {stopScore();revision++;held.clear();midiHeld.clear();noteActivity.clear('bank:');clearTimeout(chordTimer);engine?.stop();container.querySelectorAll('.bank-key').forEach(k=>k.classList.remove('held','midi-held'));}
  function options() {return {gain:Number(q('gain').value),release:Number(q('release').value),transpose:Number(q('transpose').value),maxStretch:Number(q('stretch').value),loopEnabled:false};}
  function report() {
    if(disposed)return;const s=engine?.getStats();
    const details=s?`${s.voices} / ${s.maxVoices} voices · ${mib(s.decodedBytes)} / ${mib(s.maxBytes)} decoded · ${s.cacheEntries} cached · ${s.inflight} loading · ${active.length} layer(s)`:`0 voices · 0 MiB decoded · ${active.length} selected layer(s)`;
    q('stats').textContent=`${s?.voices||0} voices · ${active.length} layers`;q('stats').title=details;
  }
  function scheduleReport(){if(!disposed&&!statsTimer)statsTimer=setTimeout(()=>{statsTimer=null;report();},80);}
  async function ensureEngine(){
    if(!manifest)throw new Error('Klais catalog is still loading or unavailable; use Advanced → reload.');
    if(engine){const current=engine;if(audioContext?.state!=='running')await audioContext.resume();if(current!==engine||disposed)throw new Error('Library selection changed.');return current;}
    if(!initialization||initialization.manifest!==manifest){
      const expectedManifest=manifest;
      const entry={manifest:expectedManifest};initialization=entry;
      entry.promise=(async()=>{
        const context=await getAudioContext();
        if(disposed||manifest!==expectedManifest)throw new Error('Library selection changed.');
        audioContext=context;sourceLoader=createFetchLoader(context,new URL('/instruments/klais/',location.href).href);
        const instance=createKlaisSampler({context,destination:getDestination(context),resolveDestination:owner=>getDirectDestination&&String(owner).startsWith('impro:')?getDirectDestination():null,manifest,loadSample:sourceLoader,maxBytes:128*1024**2,maxVoices:64,onStatus:scheduleReport});
        instance.setOptions(options());instance.setRegistrations(active);engine=instance;report();return instance;
      })().finally(()=>{if(initialization===entry)initialization=null;});
    }
    return initialization.promise;
  }
  async function noteOn(owner,note,velocity=100,channel=rangeValue==='24,55'?5:1){
    if(disposed||document.hidden)return;if(/^(keypointer:|keybutton:|chord:)/.test(owner))noteActivity.on(`bank:${owner}`,note,channel);const mine=revision,request=Symbol(owner);held.set(owner,request);
    try{
      const current=await ensureEngine();if(mine!==revision||held.get(owner)!==request)return;
      const result=await current.noteOn(owner,note,velocity,channel);
      if(result.cancelled||mine!==revision||held.get(owner)!==request)return;
      status(`${noteName(note)} / MIDI ${note} · ${result.played} layer voice(s)${result.skipped?` · ${result.skipped} unavailable/outside stretch`:''}${result.errors.length?` · ${result.errors.join('; ')}`:''}`);
    }catch(error){if(mine===revision)status(error.message);}
  }
  function noteOff(owner){noteActivity.off(`bank:${owner}`);held.delete(owner);engine?.noteOff(owner);}
  function updateKeys(){
    const opt=options();container.querySelectorAll('[data-note]').forEach(key=>{
      const note=Number(key.dataset.note)+opt.transpose;
      key.disabled=!manifest||!active.some(id=>nearestSample(manifest.registrations.find(r=>r.id===id).samples.map(id=>sampleMap.get(id)),note,100,opt.maxStretch));
    });
  }
  function paintMidi(note){
    const key=q('keyboard').querySelector(`[data-note="${note}"]`);if(!key)return;
    const entries=[...midiHeld.values()].filter(entry=>entry.note===note).sort((a,b)=>b.velocity-a.velocity);
    key.classList.toggle('midi-held',entries.length>0);
    if(entries.length){const entry=entries[0],division=Object.values(DIVISION_UI).find(d=>d.channel===entry.channel);key.style.setProperty('--key-color',division?.color||'#b6ffcf');key.style.setProperty('--key-level',String(entry.velocity/127));}
  }
  function highlightMidi(bytes){
    if(!bytes||bytes.length!==3)return;const [status,note,velocity]=bytes;
    if(![status,note,velocity].every(Number.isInteger)||status<128||status>239||note<0||note>127||velocity<0||velocity>127)return;
    const kind=status&240,channel=(status&15)+1,owner=`midi:${channel-1}:${note}`;
    if(kind===144&&velocity){midiHeld.set(owner,{note,velocity,channel});}
    else if(kind===128||(kind===144&&!velocity)){midiHeld.delete(owner);}
    else if(kind===176&&[120,123].includes(note)){
      const notes=[];for(const [id,entry]of midiHeld)if(entry.channel===channel){notes.push(entry.note);midiHeld.delete(id);}notes.forEach(paintMidi);return;
    }else return;
    paintMidi(note);
  }
  function keyboard(){
    const [low,high]=rangeValue.split(',').map(Number),sharp=note=>[1,3,6,8,10].includes(note%12);
    q('keyboard').setAttribute('aria-label',high===55?'Klais pedal keyboard C1 to G3':'Klais manual keyboard, five octaves C2 to C7');
    const whiteCount=Array.from({length:high-low+1},(_,i)=>i+low).filter(n=>!sharp(n)).length;let whites=0;q('keyboard').replaceChildren();q('keyboard').style.aspectRatio=`${whiteCount} / 5.5`;
    for(let note=low;note<=high;note++){
      const black=sharp(note),key=el('button',undefined,`bank-key ${black?'sharp':''}`);key.type='button';key.dataset.note=note;
      key.title=`${noteName(note)} · MIDI ${note}`;key.setAttribute('aria-label',`Play ${key.title}`);
      key.style.left=`${(black?whites-.31:whites)/whiteCount*100}%`;key.style.width=`${(black ? .62 : 1)/whiteCount*100}%`;if(!black)whites++;
      if(note%12===0)key.append(el('span',noteName(note)));
      key.onpointerdown=e=>{e.preventDefault();key.setPointerCapture(e.pointerId);key.classList.add('held');noteOn(`keypointer:${e.pointerId}`,note);};
      for(const type of ['pointerup','pointercancel','lostpointercapture'])key.addEventListener(type,e=>{key.classList.remove('held');noteOff(`keypointer:${e.pointerId}`);});
      key.onkeydown=e=>{if(['Enter',' '].includes(e.key)&&!e.repeat){e.preventDefault();key.classList.add('held');noteOn(`keybutton:${note}`,note);}};
      key.onkeyup=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();key.classList.remove('held');noteOff(`keybutton:${note}`);}};
      key.onblur=()=>{key.classList.remove('held');noteOff(`keybutton:${note}`);};q('keyboard').append(key);paintMidi(note);
    }updateKeys();
  }
  function inspect(){
    q('samples').replaceChildren();if(!manifest)return;
    const registration=manifest.registrations.find(r=>r.id===inspected);if(!registration)return;
    const samples=registration.samples.map(id=>sampleMap.get(id));
    const mapped=samples.filter(s=>s.rootMidi!==null);
    q('map-summary').textContent=`${registration.id} · ${mapped.length} pitched / ${samples.length-mapped.length} unmapped · ${mib(samples.reduce((sum,s)=>sum+s.bytes,0))} encoded · ${registration.kind}`;
    if(!samples.length)q('samples').append(el('p','No audio recordings in this source folder.','empty-state'));
    for(const sample of samples){
      const row=el('div',undefined,'bank-sample-row'),name=el('span',sample.sourcePath.split('/').at(-1));name.title=sample.sourcePath;
      const pitch=el('span',sample.rootMidi===null?'UNMAPPED':`${noteName(sample.rootMidi)} / ${sample.rootMidi}`,'sample-pitch');
      const play=el('button','AUDITION');play.title='Play this source at original speed';
      play.onclick=handle(async()=>{stop();const mine=revision;const current=await ensureEngine();if(mine!==revision)return;const result=await current.auditionSample(`sample:${sample.id}`,sample.id);if(mine===revision)status(`${sample.sourcePath} · ${result.played?'original-speed audition':result.errors.join('; ')||'unavailable'}`);});
      row.append(name,pitch,play);q('samples').append(row);
    }
  }
  function list(){
    const root=q('registrations'),scroll=root.scrollTop;root.replaceChildren();if(!manifest)return;
    const search=q('search').value.toLowerCase();
    for(const bank of manifest.registrations.filter(r=>`${r.label} ${r.id} ${r.division}`.toLowerCase().includes(search))){
      const mapped=bank.samples.map(id=>sampleMap.get(id)).filter(s=>s.rootMidi!==null);
      const label=el('label',undefined,`bank-registration ${active.includes(bank.id)?'selected':''}`);
      const checkbox=el('input');checkbox.type='checkbox';checkbox.checked=active.includes(bank.id);checkbox.disabled=!mapped.length;checkbox.setAttribute('aria-label',`Layer ${bank.id}`);
      checkbox.onchange=()=>{
        const next=checkbox.checked?[...active,bank.id]:active.filter(id=>id!==bank.id);
        if(next.length>8){checkbox.checked=false;status('Maximum eight recorded layers.');return;}
        stop({keepNotation:true});active=next;inspected=bank.id;q('inspect').value=inspected;engine?.setRegistrations(active);list();inspect();updateKeys();report();onLayers([...active],'sampler');
      };
      const text=el('span',undefined,'bank-registration-label');text.append(el('strong',bank.label),el('small',`${divisionInfo(bank.division)?.label||bank.division.toUpperCase()} · ${mapped.length} pitch roots · ${bank.samples.length-mapped.length} unmapped`));
      const division=divisionInfo(bank.division);if(division){label.style.setProperty('--division-color',division.color);text.title=`${division.label} · ${division.name}`;}
      label.append(checkbox,text);root.append(label);
    }root.scrollTop=scroll;
  }
  async function loadLibrary(){
    const mine=++loadRevision;stop();sourceLoader?.dispose();engine?.dispose();engine=null;manifest=null;active=[];onLibrary([]);
    list();inspect();updateKeys();report();q('inspect').replaceChildren();q('map-summary').textContent='';
    q('library-status').textContent='Reading local manifest…';q('load').disabled=true;
    try{
      const response=await fetch('/instruments/klais/manifest.json',{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error('Klais library not installed. Build it locally or use the prepared Klais offline ZIP.');
      const text=await response.text();if(text.length>4*1024**2)throw new Error('Manifest exceeds size limit.');
      const data=validateManifest(JSON.parse(text));if(disposed||mine!==loadRevision)return;
      manifest=data;sampleMap=new Map(data.samples.map(s=>[s.id,s]));
      const first=data.registrations.find(r=>r.samples.some(id=>sampleMap.get(id).rootMidi!==null));active=first?[first.id]:[];inspected=first?.id||data.registrations[0].id;
      q('inspect').replaceChildren(...data.registrations.map(r=>{const o=el('option',r.label);o.value=r.id;return o;}));q('inspect').value=inspected;
      const mapped=data.samples.filter(s=>s.rootMidi!==null).length;
      q('library-status').textContent=`${data.samples.length} stereo samples · ${mapped} filename-mapped / ${data.samples.length-mapped} unmapped · ${data.registrations.length} source groups · ${mib(data.samples.reduce((n,s)=>n+s.bytes,0))} OGG · no sustain loops`;
      list();inspect();updateKeys();report();status('Ready · samples cache automatically on first use');
      try{onLibrary(data.registrations.map(r=>({id:r.id,division:r.division,playable:r.samples.some(id=>sampleMap.get(id).rootMidi!==null)})),[...active]);}catch{}
    }catch(error){if(mine===loadRevision){q('library-status').textContent=error.message;status('Single-file lab remains available below.');}}
    finally{if(!disposed&&mine===loadRevision)q('load').disabled=false;}
  }
  q('load').onclick=handle(loadLibrary);q('search').oninput=list;
  q('inspect').onchange=()=>{inspected=q('inspect').value;inspect();};
  container.querySelectorAll('[data-range-choice]').forEach(button=>button.onclick=()=>{if(button.dataset.rangeChoice===rangeValue)return;stop();rangeValue=button.dataset.rangeChoice;staff.setPedal(rangeValue==='24,55');container.querySelectorAll('[data-range-choice]').forEach(choice=>{const selected=choice===button;choice.classList.toggle('active',selected);choice.setAttribute('aria-pressed',String(selected));});keyboard();});
  q('none').onclick=()=>{stop();active=[];engine?.setRegistrations([]);list();updateKeys();report();};
  q('stop').onclick=()=>{stop();status('All bank voices and pending notes stopped.');};
  q('midi-toggle').onclick=()=>{
    q('midi').checked=!q('midi').checked;q('midi-toggle').classList.toggle('active',q('midi').checked);q('midi-toggle').setAttribute('aria-pressed',String(q('midi').checked));
    q('midi-toggle').title=`Route selected MIDI IN to local Klais sampler · ${q('midi').checked?'ON':'OFF'}`;
    if(!q('midi').checked)stop();status(q('midi').checked?'MIDI IN → K · audio requires A ON':'MIDI audition OFF');
  };
  for(const key of ['gain','release','transpose','stretch'])q(key).addEventListener('change',handle(()=>{stop();engine?.setOptions(options());updateKeys();}));
  q('warm').onclick=handle(async()=>{
    if(warmBusy)return;if(!active.length)throw new Error('Select a playable recorded combination first.');
    warmBusy=true;q('warm').disabled=true;
    try{const current=await ensureEngine();status('Warming selected samples; decoded cache is bounded at 128 MiB.');const result=await current.prepare(active);status(`${result.cancelled?'Warm canceled':'Warm complete'} · ${result.loaded} decoded / ${result.cached} cached / ${result.failed} failed. LRU eviction may leave only part of large banks resident.${result.errors.length?' '+result.errors[0].message:''}`);}
    finally{warmBusy=false;if(!disposed)q('warm').disabled=false;}
  });
  q('chord').onclick=()=>{stop();for(const n of [60,64,67])noteOn(`chord:${n}`,n,80);chordTimer=setTimeout(()=>{for(const n of [60,64,67])noteOff(`chord:${n}`);},1200);};
  q('export').onclick=handle(()=>{if(!manifest)throw new Error('No manifest loaded.');const a=el('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(manifest,null,2)],{type:'application/json'}));a.download='klais-manifest.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);});
  const visibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',visibility);window.addEventListener('blur',stop);
  cleanups.push(()=>document.removeEventListener('visibilitychange',visibility),()=>window.removeEventListener('blur',stop));
  keyboard();loadLibrary();
  return {setRegistration:knobs=>staff.setRegistration(knobs),stop,stopScore,dispatchScore,highlightMidi,setLayers(ids){
    // External registration link (REGISTERS pod): selects recorded layers only; never sends MIDI.
    if(disposed||!manifest||!Array.isArray(ids))return {ok:false,active:[...active]};
    const playable=new Set(manifest.registrations.filter(r=>r.samples.some(id=>sampleMap.get(id).rootMidi!==null)).map(r=>r.id));
    const next=[...new Set(ids)].filter(id=>playable.has(id)).slice(0,8);
    if(next.length===active.length&&next.every((id,i)=>id===active[i]))return {ok:true,active:[...active]};
    stop({keepNotation:true});active=next;if(next[0]){inspected=next[0];q('inspect').value=inspected;}
    engine?.setRegistrations(active);list();inspect();updateKeys();report();
    return {ok:true,active:[...active]};
  },startFollower(owner,note,velocity,channel){if(disposed||!manifest||!active.length||audioContext?.state!=='running')return false;noteOn(owner,note,velocity,channel);return true;},stopFollower:noteOff,async prepareScore(){if(!active.length)throw new Error('KLAIS: select a recorded layer in SAMPLER.');await ensureEngine();},midi(bytes){
    if(disposed)return;highlightMidi(bytes);if(!bytes||bytes.length!==3)return;
    const [s,n,v]=bytes;if(![s,n,v].every(Number.isInteger)||s<128||s>239||n<0||n>127||v<0||v>127)return;
    const owner=`midi:${s&15}:${n}`,kind=s&240;
    if(kind===128||(kind===144&&!v))noteOff(owner);
    else if(kind===176&&[120,123].includes(n))stop();
    else if(kind===144&&v&&q('midi').checked&&isAudioRunning())noteOn(owner,n,v,(s&15)+1);
  },dispose(){if(disposed)return;stop();disposed=true;loadRevision++;clearTimeout(statsTimer);sourceLoader?.dispose();engine?.dispose();cleanups.forEach(fn=>fn());staff.dispose();container.replaceChildren();}};
}
