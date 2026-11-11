import { createKlaisSampler } from '../../../packages/glip-klais/engine.js';
import { validateManifest, nearestSample } from '../../../packages/glip-klais/manifest.js';
import { createFetchLoader } from '../../../packages/glip-klais/loader.js';
const noteName = n => `${['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][n%12]}${Math.floor(n/12)-1}`;
const el = (tag,text,cls) => { const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e; };
const mib = bytes => `${(bytes/1024**2).toFixed(1)} MiB`;
export function mountKlaisBank(container,{getAudioContext,getDestination,notify=()=>{}}) {
  container.innerHTML=`<div class="panel-body klais-bank"><div class="bank-heading"><div><div class="eyebrow">GLIP / INSTRUMENT LIBRARY</div><h1>Klais multisampler</h1><p class="muted">Layer the recorded combinations. No physical MIDI output.</p></div><span class="badge">LOCAL AUDIO</span></div><div class="toolbar"><button data-load class="primary">LOAD LIBRARY</button><button data-warm>WARM SELECTED CACHE</button><button data-stop class="danger">STOP SOUND</button><button data-export>EXPORT MANIFEST</button></div><p data-library-status class="status" role="status">Looking for the local Klais library…</p><div data-stats class="bank-stats">0 voices · 0 MiB decoded</div><div class="bank-controls"><label class="field">Gain<input data-gain type="range" min="0" max="0.6" step="0.01" value="0.2"></label><label class="field">Release seconds<input data-release type="number" min="0.01" max="5" step="0.05" value="0.25"></label><label class="field">Transpose<input data-transpose type="number" min="-48" max="48" step="1" value="0"></label><label class="field">Max stretch<select data-stretch><option value="0">Exact notes only</option><option value="2">2 semitones</option><option value="6" selected>6 semitones</option><option value="12">12 semitones</option></select></label></div><label class="field checkbox"><input data-midi type="checkbox">Route selected MIDI input to the Klais bank</label><div class="bank-layout"><aside><div class="toolbar"><input data-search type="search" aria-label="Filter Klais banks" placeholder="Filter combinations…"><button data-none>CLEAR LAYERS</button></div><div data-registrations class="bank-registrations"></div></aside><section class="bank-inspector"><div class="eyebrow">SOURCE MAP / FILENAME-DERIVED</div><label class="field">Inspect combination<select data-inspect></select></label><p data-map-summary class="muted"></p><div data-samples class="bank-samples"></div></section></div><div class="toolbar"><label class="field">Keyboard range<select data-range><option value="48,72">C3–C5 / 48–72</option><option value="24,84">Manual / 24–84</option><option value="24,55">Pedal / 24–55</option></select></label><button data-chord>C4 / E4 / G4</button></div><div data-keyboard class="bank-keyboard" aria-label="Klais keyboard"></div><p class="muted">Root convention C4 = MIDI 60. Labels come from filenames and need listening/console verification. Sustain loops are not assigned: notes play their recorded duration, with release on note-off. Unmapped cuts are available as original-speed auditions.</p><p data-note-status class="status" role="status">Select a combination, warm its cache, then hold a key.</p></div>`;
  const q=key=>container.querySelector(`[data-${key}]`);
  const mapLayout=container.querySelector('.bank-layout');
  mapLayout.querySelector('.bank-inspector').prepend(container.querySelector('.bank-controls'),q('midi').closest('label'),q('range').closest('.toolbar'),q('keyboard'),q('note-status'));
  let manifest=null, sampleMap=new Map(), active=[], inspected='', engine=null, initialization=null, sourceLoader=null, audioContext=null;
  let disposed=false, revision=0, loadRevision=0, warmBusy=false, statsTimer, chordTimer;
  const held=new Map(), cleanups=[];
  const status=text=>{if(!disposed)q('note-status').textContent=text;};
  const handle=fn=>async(...args)=>{try{await fn(...args);}catch(error){status(error.message);notify(`Klais: ${error.message}`);}};
  function stop() {revision++;held.clear();clearTimeout(chordTimer);engine?.stop();container.querySelectorAll('.bank-key.held').forEach(k=>k.classList.remove('held'));}
  function options() {return {gain:Number(q('gain').value),release:Number(q('release').value),transpose:Number(q('transpose').value),maxStretch:Number(q('stretch').value),loopEnabled:false};}
  function report() {
    if(disposed)return;const s=engine?.getStats();
    q('stats').textContent=s?`${s.voices} / ${s.maxVoices} voices · ${mib(s.decodedBytes)} / ${mib(s.maxBytes)} decoded · ${s.cacheEntries} cached · ${s.inflight} loading · ${active.length} layer(s)`:`0 voices · 0 MiB decoded · ${active.length} selected layer(s)`;
  }
  function scheduleReport(){if(!disposed&&!statsTimer)statsTimer=setTimeout(()=>{statsTimer=null;report();},80);}
  async function ensureEngine(){
    if(!manifest)throw new Error('Load the Klais library first.');
    if(engine){const current=engine;if(audioContext?.state!=='running')await audioContext.resume();if(current!==engine||disposed)throw new Error('Library selection changed.');return current;}
    if(!initialization||initialization.manifest!==manifest){
      const expectedManifest=manifest;
      const entry={manifest:expectedManifest};initialization=entry;
      entry.promise=(async()=>{
        const context=await getAudioContext();
        if(disposed||manifest!==expectedManifest)throw new Error('Library selection changed.');
        audioContext=context;sourceLoader=createFetchLoader(context,new URL('/instruments/klais/',location.href).href);
        const instance=createKlaisSampler({context,destination:getDestination(context),manifest,loadSample:sourceLoader,maxBytes:128*1024**2,maxVoices:64,onStatus:scheduleReport});
        instance.setOptions(options());instance.setRegistrations(active);engine=instance;report();return instance;
      })().finally(()=>{if(initialization===entry)initialization=null;});
    }
    return initialization.promise;
  }
  async function noteOn(owner,note,velocity=100,channel=1){
    if(disposed||document.hidden)return;const mine=revision,request=Symbol(owner);held.set(owner,request);
    try{
      const current=await ensureEngine();if(mine!==revision||held.get(owner)!==request)return;
      const result=await current.noteOn(owner,note,velocity,channel);
      if(result.cancelled||mine!==revision||held.get(owner)!==request)return;
      status(`${noteName(note)} / MIDI ${note} · ${result.played} layer voice(s)${result.skipped?` · ${result.skipped} unavailable/outside stretch`:''}${result.errors.length?` · ${result.errors.join('; ')}`:''}`);
    }catch(error){if(mine===revision)status(error.message);}
  }
  function noteOff(owner){held.delete(owner);engine?.noteOff(owner);}
  function updateKeys(){
    const opt=options();container.querySelectorAll('[data-note]').forEach(key=>{
      const note=Number(key.dataset.note)+opt.transpose;
      key.disabled=!manifest||!active.some(id=>nearestSample(manifest.registrations.find(r=>r.id===id).samples.map(id=>sampleMap.get(id)),note,100,opt.maxStretch));
    });
  }
  function keyboard(){
    const [low,high]=q('range').value.split(',').map(Number);q('keyboard').replaceChildren();
    for(let note=low;note<=high;note++){
      const key=el('button',undefined,`bank-key ${[1,3,6,8,10].includes(note%12)?'sharp':''}`);key.type='button';key.dataset.note=note;key.setAttribute('aria-label',`Play ${noteName(note)} MIDI ${note}`);
      key.append(el('span',noteName(note)),el('small',String(note)));
      key.onpointerdown=e=>{e.preventDefault();key.setPointerCapture(e.pointerId);key.classList.add('held');noteOn(`keypointer:${e.pointerId}`,note);};
      for(const type of ['pointerup','pointercancel','lostpointercapture'])key.addEventListener(type,e=>{key.classList.remove('held');noteOff(`keypointer:${e.pointerId}`);});
      key.onkeydown=e=>{if(['Enter',' '].includes(e.key)&&!e.repeat){e.preventDefault();key.classList.add('held');noteOn(`keybutton:${note}`,note);}};
      key.onkeyup=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();key.classList.remove('held');noteOff(`keybutton:${note}`);}};
      key.onblur=()=>{key.classList.remove('held');noteOff(`keybutton:${note}`);};q('keyboard').append(key);
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
        stop();active=next;inspected=bank.id;q('inspect').value=inspected;engine?.setRegistrations(active);list();inspect();updateKeys();report();
      };
      const text=el('span',undefined,'bank-registration-label');text.append(el('strong',bank.label),el('small',`${bank.division.toUpperCase()} · ${mapped.length} pitch roots · ${bank.samples.length-mapped.length} unmapped`));
      label.append(checkbox,text);root.append(label);
    }root.scrollTop=scroll;
  }
  async function loadLibrary(){
    const mine=++loadRevision;stop();sourceLoader?.dispose();engine?.dispose();engine=null;manifest=null;active=[];
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
      list();inspect();updateKeys();report();status('Library loaded. Audio starts only on a local action. Warm selected cache or hold a key.');
    }catch(error){if(mine===loadRevision){q('library-status').textContent=error.message;status('Single-file lab remains available below.');}}
    finally{if(!disposed&&mine===loadRevision)q('load').disabled=false;}
  }
  q('load').onclick=handle(loadLibrary);q('search').oninput=list;
  q('inspect').onchange=()=>{inspected=q('inspect').value;inspect();};
  q('range').onchange=()=>{stop();keyboard();};
  q('none').onclick=()=>{stop();active=[];engine?.setRegistrations([]);list();updateKeys();report();};
  q('stop').onclick=()=>{stop();status('All bank voices and pending notes stopped.');};
  q('midi').onchange=handle(async()=>{
    stop();
    if(q('midi').checked){
      try{await ensureEngine();status('Selected MIDI input routes to local Klais audio only.');}
      catch(error){q('midi').checked=false;throw error;}
    }else status('MIDI audition disabled.');
  });
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
  return {stop,midi(bytes){if(disposed||!q('midi').checked||!bytes||bytes.length!==3)return;const [s,n,v]=bytes;if(![s,n,v].every(Number.isInteger)||s<128||s>239||n<0||n>127||v<0||v>127)return;const owner=`midi:${s&15}:${n}`;if((s&240)===144&&v)noteOn(owner,n,v,(s&15)+1);else if((s&240)===128||((s&240)===144&&!v))noteOff(owner);else if((s&240)===176&&[120,123].includes(n))stop();},dispose(){if(disposed)return;stop();disposed=true;loadRevision++;clearTimeout(statsTimer);sourceLoader?.dispose();engine?.dispose();cleanups.forEach(fn=>fn());container.replaceChildren();}};
}
