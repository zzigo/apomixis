// IMPRO pod: timbre-delays, arpeggios and held-chord arpeggiators for live playing. Notes played on a
// source manual (MIDI IN) are re-sent to other divisions after the delays of the active patch.
// The pod only reacts while ARMED; echoes are owned notes that STOP / panic release.
// Patches are one-line `impro …` sentences, the same grammar a score section accepts. The BOTONERA
// writes such a line from a routing matrix; the text stays the single source of truth.
import './impro.css';
import {decorateOutputControl} from './output-controls.js';
import {createNoteLabPlayer} from './note-lab-player.js';
import {pasteAtCursor} from './score-paste.js';
import {DIVISION_UI} from '../../../packages/hylon-midi/divisions.js';
import {parseImproLine,formatImpro,planEchoes,heldStep,groupFor,echoDurationMs,CHANNEL,LABEL,padLine,padRandom,padRow,normalizePad,PAD_KINDS,PAD_INTERVALS,PAD_TIMES,PAD_COUNTS} from '../../../packages/hylon-impro/model.js';
const STORAGE='hylon-impro-states-v1',PAD_STORAGE='hylon-impro-pads-v1',ROWS=['so','re','po','go','pe'],COLUMNS=['pe','go','po','re','so','*'],ROUTE_LABEL={klais:'K',audio:'LA',midi:'MO'};
const DEFAULTS=[
 'impro src I tap II 0 400 tap III 0 800 tap IV 0 1200 tail 1',
 'impro src I tap II 7 600 tap III 12 1200 tap IV 19 1800 tail 2',
 'impro src I tap II 12 250 tap III -12 500 tap IV 24 750 tap P -12 1000 tail 1.5',
 'impro src I tap II 0 1000 tap III 7 3000 tap IV 12 6000 rep 3 every 8000 stretch 1.5 tail 6',
 'impro src I tap II 0 60 tap III 12 120 tap IV 24 180 rep 6 every 240 decay 0.8 tail 0.3 min 30',
 'impro src I holdU II,III,IV 120 2 tail 0.8',
 'impro src I tapL 7 * 3 100 1.5 tail 1.5',
 'impro src I tapA 7 II,III,IV 3 100 tail 1',
 'impro src I tapR 20 24 4000 tail 2'
];
export function mountImpro(container,{audio,sampler,midiOut,notify=()=>{},getEditor=()=>null,getPerformance=()=>null}){
 container.innerHTML=`<div class="impro-pod">
  <div class="toolbar impro-bar"><button data-arm title="ARM · key A · click to start echoing notes played on the source manuals; click again to stop. Nothing is sent while OFF.">ARM</button><div data-routes class="impro-routes"></div><label title="While a score plays, its section line \`impro …\` replaces the selected patch and arms the pod"><input data-follow type="checkbox" checked>SCORE</label><button data-paste title="Paste the active patch at the SCORE TXT cursor">P</button><button data-stop title="Release every pending and sounding echo">■</button><span class="impro-patch"><button data-prev title="Previous patch" aria-label="Previous patch">‹</button><output data-digit title="Selected patch 1–9 · S: the playing score is in charge">1</output><button data-next title="Next patch" aria-label="Next patch">›</button></span><i data-led-in class="impro-led in" title="Green: a MIDI note reached this pod (any channel, armed or not)"></i><i data-led-out class="impro-led out" title="Red: this pod produced a note towards an open destination"></i></div>
  <output data-status class="impro-status" role="status">OFF · press ARM</output>
  <div class="impro-pad" data-pad></div>
  <div data-states class="impro-states"></div><div data-taps class="impro-taps"></div></div>`;
 const root=container.firstElementChild,q=key=>root.querySelector(`[data-${key}]`),routes={klais:false,audio:false,midi:true};
 const load=(key,test,fallback)=>{try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(test(saved))return saved;}catch{}return fallback;};
 const lines=load(STORAGE,v=>Array.isArray(v)&&v.length===9&&v.every(l=>typeof l==='string'&&l.length<=1024),[...DEFAULTS]);
 const pads=load(PAD_STORAGE,v=>Array.isArray(v)&&v.length===9,Array.from({length:9},()=>null));
 const states=lines.map(line=>{try{return parseImproLine(line);}catch{return null;}});
 let selected=0,armed=false,pending=false,scoreState=null,serial=0,echoes=0,disposed=false,lastIn='',lastReason='';
 // The MIDI gateway accepts notes at most 250 ms ahead, so echoes wait here and are handed over
 // when they come due (20 ms timer, 60 ms horizon).
 let waiting=[];const held=new Map(),down=new Map(),runners=new Map();
 const player=createNoteLabPlayer({id:'impro',audio,sampler,midiOut,independent:true,onError:error=>{disarm(error.message);notify(error.message);}});
 const scoreActive=()=>q('follow').checked&&!!scoreState;
 const active=()=>scoreActive()?scoreState:states[selected];
 // Header knobs: TEMPO divides every delay and arpeggio step; DUR multiplies every echo length.
 const perf=()=>{const p=getPerformance()||{};return{tempo:p.tempo>0?p.tempo:1,dur:p.dur>0?p.dur:1};};
 const status=text=>{q('status').textContent=text;};
 const explain=text=>{status(text);if(text!==lastReason){lastReason=text;notify(`IMPRO · ${text}`);}};
 const ledTimers={};function led(name){const el=q(`led-${name}`);el.classList.add('on');clearTimeout(ledTimers[name]);ledTimers[name]=setTimeout(()=>el.classList.remove('on'),110);}
 const chosen=()=>Object.keys(routes).filter(r=>routes[r]).map(r=>ROUTE_LABEL[r]).join(' + ')||'no destination';
 // Destinations that can really sound now: MO needs M armed and the header MO; K / LA need audio running.
 const effective=()=>({klais:routes.klais,audio:routes.audio,midi:routes.midi&&midiOut.summary().armed});
 function closed(){const m=midiOut.summary(),why=[];if(routes.midi&&!m.armed)why.push('M is OFF');else if(routes.midi&&m.noteRouteEnabled===false)why.push('header MO is OFF');if((routes.audio||routes.klais)&&audio.context?.state!=='running')why.push('A (audio) is OFF');if(!routes.midi&&!routes.audio&&!routes.klais)why.push('no destination selected in this pod');return why;}
 const sounding=()=>{const m=midiOut.summary();return(routes.midi&&m.armed&&m.noteRouteEnabled!==false)||((routes.audio||routes.klais)&&audio.context?.state==='running');};
 function sent(owner){if(owner&&sounding())led('out');}

 // ---- patch list -------------------------------------------------------------------------
 function renderTaps(){
  const state=active(),box=q('taps');box.replaceChildren();q('digit').textContent=scoreActive()?'S':String(selected+1);q('digit').classList.toggle('score',scoreActive());
  if(!state||state.off){box.textContent=state?'off · notes pass without echo':'invalid patch line';return;}
  const add=text=>{const row=document.createElement('div');row.textContent=text;box.append(row);};
  for(const g of state.groups){
   add(`${LABEL[g.src]} →`);
   for(const h of g.holds)add(`  ${h.key} · held notes ${({U:'up',D:'down',B:'up and down',R:'random'})[h.mode]} · ${h.divisions.map(d=>LABEL[d]).join(' ')} · every ${h.ms} ms · ${h.oct} oct`);
   if(g.randomArps.length)add(`  random arpeggio · ${g.randomArps.map(f=>`${f.key} ${f.count} steps ≤${f.interval} st ≤${f.delay} ms`).join(' · ')} · new for every key`);
   if(g.random.length)add(`  random · ${g.random.map(r=>`${r.count} taps ±${r.maxInterval} st ≤${r.maxDelay} ms`).join(' · ')} · new for every key`);
   const longest=Math.max(1,...g.taps.map(t=>t.delay));
   for(const tap of g.taps.slice(0,16)){const row=document.createElement('div');row.className='impro-tap';row.style.color=DIVISION_UI[tap.division].color;row.innerHTML=`<span>${LABEL[tap.division]}</span><span>${tap.interval>=0?'+':''}${tap.interval}</span><i style="width:${Math.max(1,tap.delay/longest*100)}%"></i><span>${tap.delay} ms</span>`;box.append(row);}
   if(g.taps.length>16)add(`  ${g.taps.length} taps · first 16 shown`);
  }
  const pk=perf();add(`${pk.tempo!==1||pk.dur!==1?`TEMPO ×${pk.tempo.toFixed(2)} · DUR ×${pk.dur.toFixed(2)} · `:''}${scoreActive()?'SCORE · ':''}rep ${state.rep} · stretch ${state.stretch} · tail ×${state.tail} · decay ${state.decay}`);
 }
 const buttons=[],inputs=[];
 function setLine(i,text){
  try{states[i]=parseImproLine(text);lines[i]=text.trim();inputs[i].classList.remove('invalid');inputs[i].title='';try{localStorage.setItem(STORAGE,JSON.stringify(lines));}catch{}}
  catch(error){inputs[i].classList.add('invalid');inputs[i].title=error.message;status(error.message);}
  if(inputs[i].value!==text)inputs[i].value=text;renderTaps();
 }
 function select(i){selected=((i%9)+9)%9;buttons.forEach((b,j)=>b.classList.toggle('active',j===selected));renderTaps();renderPad();}
 lines.forEach((line,i)=>{
  const button=document.createElement('button'),input=document.createElement('input');button.textContent=String(i+1);button.title=`Patch ${i+1}`;input.value=line;input.spellcheck=false;input.setAttribute('aria-label',`IMPRO patch ${i+1}`);input.classList.toggle('invalid',!states[i]);
  button.onclick=()=>select(i);input.onchange=()=>{pads[i]=null;savePads();setLine(i,input.value);if(i===selected)renderPad();};
  buttons.push(button);inputs.push(input);q('states').append(button,input);
 });
 q('prev').onclick=()=>select(selected-1);q('next').onclick=()=>select(selected+1);

 // ---- botonera ---------------------------------------------------------------------------
 // One line per source manual (console order): routing squares (targets, R = rotate over the other
 // manuals) and that manual's own 2×2 squares: TAP · ARP · HOLD kinds, interval, time, count.
 // On a narrow pod the squares wrap under their own manual. Every click rewrites the selected
 // patch line and applies it at once.
 const KIND_TEXT={TAP:'T',TAPL:'TL',TAPR:'TR',TAPA:'TA',ARPU:'A↑',ARPD:'A↓',ARPB:'A↕',ARPR:'A?',HOLDU:'H↑',HOLDD:'H↓',HOLDB:'H↕',HOLDR:'H?'};
 const KIND_TITLE={TAP:'tap: one echo per target',TAPL:'tapL: geometric taps',TAPR:'tapR: random division, interval and delay',TAPA:'tapA: arithmetic taps',ARPU:'arp up',ARPD:'arp down',ARPB:'arp up and back',ARPR:'arp random',HOLDU:'held chord, up',HOLDD:'held chord, down',HOLDB:'held chord, up and back',HOLDR:'held chord, random'};
 const savePads=()=>{try{localStorage.setItem(PAD_STORAGE,JSON.stringify(pads));}catch{}};
 const emptyPad=()=>normalizePad({matrix:{},rows:{}});
 const pad=()=>pads[selected]=normalizePad(pads[selected])||emptyPad();
 function applyPad(){savePads();setLine(selected,padLine(pad()));renderPad();}
 // Shared by the pod buttons and the remote.
 const ROW_VALUES={kind:Object.values(PAD_KINDS).flat(),interval:PAD_INTERVALS,time:PAD_TIMES,count:PAD_COUNTS};
 function toggleRoute(src,target){if(!ROWS.includes(src)||!COLUMNS.includes(target)||target===src)throw new Error('Invalid IMPRO route');const p=pad(),row=new Set(p.matrix[src]||[]);if(row.has(target))row.delete(target);else row.add(target);if(row.size)p.matrix[src]=[...row];else delete p.matrix[src];pads[selected]=p;applyPad();}
 function setRow(src,key,value){if(!ROWS.includes(src)||!ROW_VALUES[key]?.includes(value))throw new Error('Invalid IMPRO pad value');const p=pad();p.rows[src][key]=value;pads[selected]=p;applyPad();}
 function randomPad(){pads[selected]=padRandom((Date.now()^Math.floor(Math.random()*1e9))|0);applyPad();}
 function emptyPadNow(){pads[selected]=emptyPad();applyPad();}
 function quad(src,key,values,show,title){const box=document.createElement('div');box.className='impro-quad';for(const value of values){const b=document.createElement('button');b.textContent=show(value);b.dataset.row=src;b.dataset.key=key;b.dataset.value=String(value);b.title=`${LABEL[src]} · ${title(value)}`;b.onclick=()=>setRow(src,key,value);box.append(b);}return box;}
 function buildPad(){
  const box=q('pad');
  for(const src of ROWS){
   const line=document.createElement('div'),route=document.createElement('div'),quads=document.createElement('div');line.className='impro-line';line.dataset.line=src;route.className='impro-route';quads.className='impro-quads';line.style.setProperty('--row-color',DIVISION_UI[src].color);
   const label=document.createElement('span');label.className='impro-row';label.textContent=LABEL[src];label.title=`Source: notes played on ${DIVISION_UI[src].name}`;route.append(label);
   for(const target of COLUMNS){const b=document.createElement('button');b.textContent=target==='*'?'R':LABEL[target];b.dataset.src=src;b.dataset.target=target;b.title=target==='*'?`${LABEL[src]} → rotate over the other manuals`:`${LABEL[src]} → ${DIVISION_UI[target].name}`;if(target!=='*')b.style.setProperty('--division-color',DIVISION_UI[target].color);
    if(target===src){b.disabled=true;b.title='A manual cannot echo onto itself';}
    else b.onclick=()=>toggleRoute(src,target);
    route.append(b);}
   for(const family of Object.keys(PAD_KINDS))quads.append(quad(src,'kind',PAD_KINDS[family],v=>KIND_TEXT[v],v=>KIND_TITLE[v]));
   quads.append(quad(src,'interval',PAD_INTERVALS,v=>(v>0?'+':'')+v,v=>`interval ${v} semitones`),quad(src,'time',PAD_TIMES,v=>String(v),v=>`${v} ms`),quad(src,'count',PAD_COUNTS,v=>`×${v}`,v=>`${v} steps`));
   line.append(route,quads);box.append(line);
  }
  const tools=document.createElement('div');tools.className='impro-tools';const random=document.createElement('button'),reset=document.createElement('button');random.textContent='R';random.title='Random patch: routing and every row\'s kind, interval, time and count';reset.textContent='E';reset.title='Empty the matrix (patch becomes impro off)';
  random.onclick=randomPad;reset.onclick=emptyPadNow;tools.append(random,reset);box.append(tools);
 }
 function renderPad(){
  const p=normalizePad(pads[selected]);root.classList.toggle('pad-idle',!p);
  for(const line of q('pad').querySelectorAll('[data-line]'))line.classList.toggle('routed',!!p?.matrix[line.dataset.line]?.length);
  for(const b of q('pad').querySelectorAll('[data-src]'))b.classList.toggle('active',!!p?.matrix[b.dataset.src]?.includes(b.dataset.target));
  for(const b of q('pad').querySelectorAll('[data-row]'))b.classList.toggle('active',!!p&&String(padRow(p,b.dataset.row)[b.dataset.key])===b.dataset.value);
 }

 // ---- destinations and arming ------------------------------------------------------------
 const routeButtons={},KEYS={klais:'S',audio:'D',midi:'F'};
 function setRoute(route,on){
  routes[route]=on;routeButtons[route].classList.toggle('active',on);routeButtons[route].setAttribute('aria-pressed',String(on));
  if(on&&armed&&route!=='midi')player.prepare({[route]:true}).catch(error=>{notify(`IMPRO · ${error.message}`);status(error.message);});
  if(armed){const why=closed();status(`ARMED · ${chosen()}${why.length?' · '+why.join(' · '):''}`);}
 }
 for(const route of Object.keys(routes)){const b=document.createElement('button');decorateOutputControl(b,route,`IMPRO echoes · key ${KEYS[route]} · ${route==='midi'?'needs M and the header MO':'independent of the header button'}`);b.classList.toggle('active',routes[route]);b.onclick=()=>setRoute(route,!routes[route]);routeButtons[route]=b;q('routes').append(b);}
 function stop(){player.stop();held.clear();waiting=[];down.clear();runners.clear();}
 function disarm(reason='OFF · press ARM'){armed=false;pending=false;stop();root.classList.remove('armed');q('arm').classList.remove('active');q('arm').textContent='ARM';status(reason);}
 async function arm(by=''){
  if(armed||pending)return;pending=true;status('ARMING…');
  try{await player.prepare(effective());if(disposed||!pending)return;armed=true;lastReason='';root.classList.add('armed');q('arm').classList.add('active');q('arm').textContent='ARMED';const why=closed();status(`ARMED${by} · ${chosen()} · play${why.length?' · '+why.join(' · '):''}`);}
  catch(error){disarm(`NOT ARMED · ${error.message}`);notify(`IMPRO · ${error.message}`);}finally{pending=false;}
 }
 q('arm').onclick=()=>{if(armed||pending)disarm();else arm();};
 q('stop').onclick=()=>{stop();if(armed)status('ARMED · echoes released');};
 q('follow').onchange=renderTaps;
 q('paste').onclick=()=>{const state=active();if(!state){notify('IMPRO · invalid patch');return;}try{const r=pasteAtCursor(getEditor(),formatImpro(state));notify(`IMPRO patch → SCORE TXT line ${r.line} · APPLY SCORE TXT`);}catch(error){notify(error.message);}};

 // ---- MIDI in ----------------------------------------------------------------------------
 // Only notes on a source channel of the patch trigger. Echoes never go back to their own source.
 function midi(bytes){
  if(disposed||!bytes||bytes.length<3)return;const kind=bytes[0]&0xf0,channel=(bytes[0]&0x0f)+1,note=bytes[1],velocity=bytes[2];
  if(kind!==0x90&&kind!==0x80)return;const now=performance.now()/1000,on=kind===0x90&&velocity>0;if(on)led('in');
  const state=active(),group=groupFor(state,channel),key=`${channel}:${note}`;
  if(on){lastIn=`IN ch ${channel} note ${note}`;
   if(!armed){explain(`NOT ARMED · press ARM (the note on channel ${channel} arrived)`);return;}
   if(!state){explain('NO PATCH · the selected patch line is invalid (red)');return;}
   if(state.off){explain('PATCH IS OFF · this patch says impro off');return;}
   if(!group){explain(`IGNORED · you play on channel ${channel}; this patch listens to ${state.groups.map(g=>`${LABEL[g.src]} (ch ${CHANNEL[g.src]})`).join(', ')}`);return;}}
  if(!armed)return;
  if(!on){down.get(channel)?.delete(note);const entry=held.get(key);if(entry){held.delete(key);finish(entry,now);}return;}
  if(!down.has(channel))down.set(channel,new Set());
  if(!down.get(channel).size)group.holds.forEach((_,k)=>runners.set(`${group.src}:${k}`,{next:now,index:0}));
  down.get(channel).add(note);
  const entry={at:now,state,duration:null,owners:[]},tempo=perf().tempo;
  for(const echo of planEchoes(state,note,++serial,group)){waiting.push({entry,when:now+echo.delayMs/1000/tempo,midi:echo.midi,channel:echo.channel,vel:100});echoes++;}
  if(waiting.length>4096){disarm('too many pending echoes');return;}
  waiting.sort((a,b)=>a.when-b.when);pump();
  const previous=held.get(key);if(previous)finish(previous,now);held.set(key,entry);
  const why=closed();if(why.length&&!sounding())explain(`NO DESTINATION · ${why.join(' · ')}`);else status(`ARMED · ${lastIn} · ${echoes} echoes${why.length?' · '+why.join(' · '):''}`);
 }
 // The echo length is known only at key release: held time × tail × DUR, bounded by min/max.
 function finish(entry,now){if(entry.duration!==null)return;entry.duration=Math.max(.01,echoDurationMs(entry.state,(now-entry.at)*1000)/1000*perf().dur);for(const {owner,when,vel} of entry.owners)player.update(owner,{endTime:when+entry.duration,velocity:vel});}
 // Hand over echoes that are due. A key still held gives its echoes a provisional length that
 // `finish` shortens at release; echoes dispatched after the release already know their length.
 function pump(){
  if(!armed||disposed||!waiting.length)return;const now=performance.now()/1000;
  while(waiting.length&&waiting[0].when<=now+.06){
   const item=waiting.shift();if(item.when<now-.08)continue;
   try{const owner=player.dispatch({midi:item.midi,channel:item.channel,velocity:item.vel,duration:item.entry.duration??item.entry.state.max/1000},Math.max(item.when,now),effective());sent(owner);if(owner&&item.entry.duration===null)item.entry.owners.push({owner,when:item.when,vel:item.vel});}
   catch(error){disarm(error.message);notify(`IMPRO · ${error.message}`);return;}
  }
 }
 // Held-chord arpeggios: one step per hold clause whenever its clock comes due, while keys are down.
 function run(now){
  const state=active();if(!state||state.off)return;
  for(const group of state.groups){
   const notes=down.get(CHANNEL[group.src]);if(!notes?.size||!group.holds.length)continue;
   group.holds.forEach((hold,k)=>{
    const id=`${group.src}:${k}`,r=runners.get(id)||{next:now,index:0};runners.set(id,r);let guard=0;
    while(r.next<=now+.06&&guard++<8){
     if(r.next>=now-.08){const step=heldStep(hold,[...notes],r.index,serial+k),p=perf();
      if(step){const length=Math.max(.01,Math.max(state.min,Math.min(state.max,hold.ms*state.tail/p.tempo))/1000*p.dur);
       try{const owner=player.dispatch({midi:step.midi,channel:step.channel,velocity:100,duration:length},Math.max(r.next,now),effective());sent(owner);if(owner)echoes++;}catch(error){disarm(error.message);notify(`IMPRO · ${error.message}`);return;}}}
     r.index++;r.next+=hold.ms/1000/perf().tempo;}
    if(r.next<now-.5)r.next=now;
   });
  }
 }
 let shownPerf='';
 const pumpTimer=setInterval(()=>{pump();if(armed&&!disposed)run(performance.now()/1000);const p=perf(),key=`${p.tempo.toFixed(2)}:${p.dur.toFixed(2)}`;if(key!==shownPerf){shownPerf=key;renderTaps();}},20);
 // Keyboard: A arm, S K, D LA, F MO. Works with the pod closed; the result goes to the notice line.
 function toggle(name){
  if(disposed)return;
  if(name==='arm'){if(armed||pending){disarm();notify('IMPRO · OFF');}else arm().then(()=>notify(armed?`IMPRO · ARMED · ${chosen()}`:`IMPRO · ${q('status').textContent}`));return;}
  if(!Object.hasOwn(routes,name))return;setRoute(name,!routes[name]);notify(`IMPRO · ${ROUTE_LABEL[name]} ${routes[name]?'ON':'OFF'}`);
 }
 // Remote (iPad): state and commands for the mega buttons.
 // The remote draws the same botonera from this description (labels, colours, values) and the pad.
 const padSpec=()=>({rows:ROWS.map(src=>({src,label:LABEL[src],color:DIVISION_UI[src].color})),columns:COLUMNS.map(t=>({target:t,label:t==='*'?'R':LABEL[t],color:t==='*'?null:DIVISION_UI[t].color})),
   quads:[...Object.entries(PAD_KINDS).map(([family,values])=>({key:'kind',family,values:values.map(v=>[v,KIND_TEXT[v]])})),{key:'interval',values:PAD_INTERVALS.map(v=>[v,(v>0?'+':'')+v])},{key:'time',values:PAD_TIMES.map(v=>[v,String(v)])},{key:'count',values:PAD_COUNTS.map(v=>[v,`×${v}`])}]});
 function remoteState(){const p=normalizePad(pads[selected]);return{armed,pending,routes:{...routes},follow:q('follow').checked,score:scoreActive(),patch:selected+1,status:q('status').textContent,line:lines[selected]||'',pad:p?{matrix:p.matrix,rows:Object.fromEntries(ROWS.map(src=>[src,padRow(p,src)]))}:null,padSpec:padSpec()};}
 function remoteSet(key,value){
  if(['arm','klais','audio','midi'].includes(key)){toggle(key);return;}
  if(key==='stop'){stop();if(armed)status('ARMED · echoes released');return;}
  if(key==='follow'){q('follow').checked=!!value;renderTaps();return;}
  if(key==='patch'){select(value-1);return;}
  if(key==='route'){const [src,target]=value.split(':');toggleRoute(src,target);return;}
  if(key==='row'){const [src,field,raw]=value.split(':');setRow(src,field,field==='kind'?raw:Number(raw));return;}
  if(key==='random'){randomPad();return;}
  if(key==='empty'){emptyPadNow();return;}
  throw new Error('Unknown IMPRO parameter');
 }
 buildPad();select(0);
 return{midi,stop,disarm,toggle,remoteState,remoteSet,
  // A playing score section with an `impro` line takes over the patch and arms the pod.
  scoreSection(state){scoreState=state||null;renderTaps();if(scoreState&&!scoreState.off&&q('follow').checked&&!armed)arm(' by the score');},
  summary:()=>({armed,echoes,selected:selected+1}),dispose(){disposed=true;clearInterval(pumpTimer);disarm();player.dispose();container.replaceChildren();}};
}
