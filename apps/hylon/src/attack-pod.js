// ATTACK pod: one place for everything that decides how short a note the organ can speak.
//   MASTER   minimum note length in ms for every score / IMPRO / M-MORPH note (the floor)
//   +P +I…   extra ms per division (32' pedal and reeds speak later than 2' flues)
//   CLAMP / REMAP   cut at the floor, or compress the written range above it
//   TS       hand notes to the MIDI driver with exact timestamps instead of the 10 ms tick
// The tester below ignores the floor: it is the tool that measures it. Changing the profile
// never arms MIDI or sends a note. The profile is stored locally and can be exported per organ.
import './attack-pod.css';
import {mountAttackTester} from './attack-tester.js';
import {ATTACK_DEFAULT,ATTACK_LIMITS,normalizeAttackProfile,attackFloor,shapeDuration} from '../../../packages/hylon-midi/attack-profile.js';
import {DIVISION_UI} from '../../../packages/hylon-midi/divisions.js';
const STORAGE='hylon-attack-profile-v1',ORDER=['pe','go','po','re','so'];
export function mountAttackPod(container,{audio,sampler,midiOut,notify=()=>{}}){
 container.innerHTML=`<div class="attack-pod">
  <section><h3>MASTER ATTACK · minimum note length</h3><div class="attack-master"><output data-master-value></output><input data-master type="range" min="${ATTACK_LIMITS.master[0]}" max="${ATTACK_LIMITS.master[1]}" step="5" aria-label="Master minimum attack in milliseconds"></div>
   <div class="attack-row"><button data-mode="clamp" title="Anything shorter than the floor becomes the floor">CLAMP</button><button data-mode="remap" title="The written range is compressed above the floor, so gradients keep their shape">REMAP</button><span data-offsets class="attack-row"></span><label title="REMAP: shortest length written in the scores">ideal<input data-ideal type="number" min="10" max="200" step="5"></label><label title="REMAP: notes at least this long are never changed">span<input data-span type="number" min="50" max="2000" step="10"></label></div>
   <div class="attack-floors" data-floors></div></section>
  <section><h3>DELIVERY</h3><div class="attack-row"><button data-ts title="Driver timestamps: exact note times, short lookahead. OFF = original 10 ms tick. Switching releases all notes.">TS</button><label title="How far ahead a note is committed to the driver">lookahead ms<input data-lookahead type="number" min="5" max="60" step="5" value="25"></label><label title="Software ceiling of note-ons per second (all divisions)">cap / s<input data-cap type="number" min="1" max="5000" step="50"></label><button data-cap-apply>SET CAP</button><button data-export title="Export this organ profile as JSON">↓</button><label class="file-button" title="Import an organ profile JSON">↑<input data-import type="file" accept="application/json,.json" hidden></label><button data-reset title="Back to no floor (10 ms)">R</button></div><output data-stats role="status"></output></section>
  <section><h3>30-MINUTE PROCEDURE</h3><ol class="attack-steps"><li>MIDI ON. Draw one fast stop per manual. Below: MO, target I, note 60, Speed 5 Hz.</li><li>Attack ms 120 → 80 → 50 → 30. The last value where every attack still speaks is that manual's floor.</li><li>Set MASTER to the best manual's floor; type the difference for the others in +P +I +II +III +IV.</li><li>Repeat step 2 with TS on. Keep TS if short attacks are more even.</li><li>Raise Speed until attacks drop out; set CAP just below (Speed × 5 for ALL).</li></ol></section>
  <section data-tester></section></div>`;
 const root=container.firstElementChild,q=key=>root.querySelector(`[data-${key}]`);
 let profile=normalizeAttackProfile(ATTACK_DEFAULT),ts=false;
 try{const saved=JSON.parse(localStorage.getItem(STORAGE)||'null');if(saved){profile=normalizeAttackProfile(saved.profile);ts=saved.timestamped===true;if(Number.isFinite(saved.lookahead))q('lookahead').value=saved.lookahead;}}catch{}
 const offsetInputs={};
 for(const id of ORDER){const info=DIVISION_UI[id],label=document.createElement('label'),input=document.createElement('input');label.textContent=`+${info.label}`;label.style.color=info.color;label.title=`Extra milliseconds for ${info.name}`;input.type='number';input.min='0';input.max='400';input.step='5';label.append(input);q('offsets').append(label);offsetInputs[info.channel]=input;input.onchange=apply;}
 function store(){try{localStorage.setItem(STORAGE,JSON.stringify({profile,timestamped:ts,lookahead:Number(q('lookahead').value)}));}catch{}}
 function render(){
  q('master').value=profile.master;q('master-value').innerHTML=`${profile.master}<small> ms</small>`;q('ideal').value=profile.ideal;q('span').value=profile.span;
  for(const [channel,input] of Object.entries(offsetInputs))if(document.activeElement!==input)input.value=profile.offsets[channel];
  root.querySelectorAll('[data-mode]').forEach(b=>b.classList.toggle('active',b.dataset.mode===profile.mode));q('ts').classList.toggle('active',ts);
  q('floors').innerHTML='floor  '+ORDER.map(id=>{const info=DIVISION_UI[id];return`<b style="color:${info.color}">${info.label} ${attackFloor(profile,info.channel)}</b>`;}).join(' · ')+`  ·  written 30 → ${Math.round(shapeDuration(profile,1,30))} · 60 → ${Math.round(shapeDuration(profile,1,60))} · 100 → ${Math.round(shapeDuration(profile,1,100))} ms on I`;
 }
 function apply(){
  try{const next=normalizeAttackProfile({mode:profile.mode,master:Number(q('master').value),ideal:Number(q('ideal').value),span:Number(q('span').value),offsets:Object.fromEntries(Object.entries(offsetInputs).map(([channel,input])=>[channel,Number(input.value)||0]))});profile=midiOut.setAttackProfile(next);store();}
  catch(error){notify(`ATTACK · ${error.message}`);}render();
 }
 q('master').oninput=apply;q('ideal').onchange=apply;q('span').onchange=apply;
 root.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{profile={...profile,mode:b.dataset.mode};apply();});
 function setTs(on){try{midiOut.setTimestamped(on,Number(q('lookahead').value));ts=on;store();notify(`ATTACK · timestamps ${on?'ON':'OFF'} · notes released · turn MIDI ON again`);}catch(error){notify(`ATTACK · ${error.message}`);}render();}
 q('ts').onclick=()=>setTs(!ts);q('lookahead').onchange=()=>{if(ts)setTs(true);else store();};
 q('cap-apply').onclick=()=>{try{midiOut.setBudget(Number(q('cap').value));notify('ATTACK · cap set · notes released · turn MIDI ON again');}catch(error){notify(`ATTACK · ${error.message}`);}};
 q('reset').onclick=()=>{profile=normalizeAttackProfile(ATTACK_DEFAULT);for(const input of Object.values(offsetInputs))input.value=0;q('master').value=profile.master;q('ideal').value=profile.ideal;q('span').value=profile.span;apply();};
 q('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({kind:'hylon-attack-profile',version:1,savedAt:new Date().toISOString(),profile,timestamped:ts,lookahead:Number(q('lookahead').value),cap:midiOut.summary().budget},null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='hylon-attack-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 q('import').onchange=async event=>{try{const data=JSON.parse(await event.target.files[0].text());if(data.kind!=='hylon-attack-profile')throw new Error('Not an attack profile');profile=midiOut.setAttackProfile(normalizeAttackProfile(data.profile));for(const input of Object.values(offsetInputs))input.value=profile.offsets[Object.keys(offsetInputs).find(c=>offsetInputs[c]===input)];store();render();notify('ATTACK · profile imported · timestamps and cap unchanged');}catch(error){notify(`ATTACK · ${error.message}`);}event.target.value='';};
 // Stored profile and delivery mode apply at start: they shape durations, they do not arm anything.
 try{profile=midiOut.setAttackProfile(profile);if(ts)midiOut.setTimestamped(true,Number(q('lookahead').value));}catch{ts=false;}
 const tester=mountAttackTester(q('tester'),{audio,sampler,midiOut,notify});
 const timer=setInterval(()=>{const s=midiOut.summary();if(document.activeElement!==q('cap'))q('cap').value=s.budget;q('stats').textContent=`${s.timestamped?`TS ON · ${s.lookahead} ms ahead`:'TS OFF · 10 ms tick'} · lengthened ${s.stretched} · sent ${s.sent} · dropped ${s.dropped} · shared ${s.coalesced}`;},500);
 render();
 return{stop:()=>tester.stop(),dispose(){clearInterval(timer);tester.dispose();container.replaceChildren();}};
}
