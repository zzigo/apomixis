import {bindPerformanceKnobs,paintPerformanceKnob,performanceText} from './performance-knobs.js';
import { MIX_GROUPS } from './schema.js';
const $=id=>document.getElementById(id), controlsMap=new Map(), pending=new Map(), queued=new Map(), delays=new Map();
let socket,retry,attempt=0,lastStateAt=0,state=null,online=false,serial=0;
const client=Math.random().toString(36).slice(2);
const HEADER_ACTIONS={'reg-program-prev':'program','reg-program-next':'program','scene-play':'play','scene-hold':'hold','scene-reset':'reset','super-panic':'super-panic','panic-2':'p2','panic-sc':'ps','stop-all':'stop-all'};
const live=()=>online&&Date.now()-lastStateAt<2500&&socket?.readyState===WebSocket.OPEN;
const target=(action,value)=>value?.key?`${action}:${value.key}`:action;
function controls(){
 const connected=live();
 for(const input of $('desktop-header').querySelectorAll('button,select')){
  const id=input.id,emergency=['super-panic','panic-2','panic-sc','stop-all'].includes(id);
  if(id==='fullscreen'){input.disabled=false;continue;}
  if(id==='remote-control'){input.disabled=true;input.title='Remote configuration stays on the Mac';continue;}
  const mapped=HEADER_ACTIONS[id]||id==='scene-speed'||id.startsWith('command-')||!!input.dataset.scoreLoad||!!input.dataset.globalOutput;
  input.disabled=!mapped||!connected||(!emergency&&(!state?.ready||state?.panicBusy))||pending.has(HEADER_ACTIONS[id]||(input.dataset.scoreLoad?'score':id))||(id==='panic-2'&&state?.panicBusy)||(id==='panic-sc'&&state?.psBusy);
 }
 for(const entry of controlsMap.values())entry.input.disabled=!connected||!state?.ready||state?.panicBusy||(entry.action==='mixer'&&!state?.mixer?.ready&& !['master','midiLevel','clearFx'].includes(entry.key))||(entry.key==='monitor'&&!state?.mixer?.micReady);
 for(const knob of document.querySelectorAll('[data-performance]'))knob.setAttribute('aria-disabled',String(!connected||!state?.ready||state?.panicBusy));
 for(const button of improButtons.values())button.disabled=!connected||!state?.ready||state?.panicBusy||!state?.impro||pending.has(`impro:${button.dataset.impro}`);
 for(const button of padButtons)button.disabled=!connected||!state?.ready||state?.panicBusy||!state?.impro||button.dataset.self==='true';
 mixerSnapshotButtons.forEach((button,i)=>{button.disabled=!connected||!state?.ready||state?.panicBusy||pending.has('mixer:snapshotSave')||pending.has('mixer:snapshotRecall');button.classList.toggle('stored',!!state?.mixer?.snapshots?.stored?.[i]);button.classList.toggle('active',!!state?.mixer?.snapshots?.active?.[i]);button.setAttribute('aria-pressed',String(!!state?.mixer?.snapshots?.active?.[i]));});
 $('connection').textContent=connected?'CONNECTED':'DISCONNECTED';
}
function command(action,value){
 if(!live())return;
 const key=target(action,value),continuous=['mixer','spore'].includes(action)&&!['reseed','clearFx','seek','snapshotSave','snapshotRecall'].includes(value?.key);
 if(pending.has(key)){if(continuous)queued.set(key,{action,value,at:Date.now()});return;}
 const id=`${client}:${++serial}`;pending.set(key,{id,at:Date.now()});
 socket.send(JSON.stringify({type:'command',id,action,value}));controls();
}
function parameter(action,key,value,stream=false){
 const id=`${action}:${key}`;
 if(stream){clearTimeout(delays.get(id));delays.set(id,setTimeout(()=>{delays.delete(id);command(action,{key,value});},70));}
 else command(action,{key,value});
}
// Touch fader: replaces the native range thumb (too small for a finger). The whole cell is the touch area and
// the drag is relative: touching does not jump the value, moving the finger along the fader changes it
// (full track length = full range). The hidden input stays the source of truth for render() and commands.
const faderPaints=new Set();
function touchFader(wrap,input,vertical){
 wrap.classList.add('touch-fader',vertical?'tf-v':'tf-h');const track=document.createElement('div'),fill=document.createElement('div');track.className='tf-track';fill.className='tf-fill';track.append(fill);wrap.append(track);
 const min=()=>Number(input.min||0),max=()=>Number(input.max||1),step=()=>Number(input.step)||.01;
 const paint=()=>{const n=Math.max(0,Math.min(1,(Number(input.value)-min())/((max()-min())||1)));fill.style[vertical?'height':'width']=`${n*100}%`;};faderPaints.add(paint);paint();
 let drag=null;
 wrap.addEventListener('pointerdown',event=>{if(input.disabled||event.button>0)return;event.preventDefault();try{wrap.setPointerCapture(event.pointerId);}catch{}drag={id:event.pointerId,pos:vertical?event.clientY:event.clientX,value:Number(input.value),length:Math.max(40,vertical?track.clientHeight:track.clientWidth)};input.dataset.dragging='true';wrap.classList.add('tf-active');});
 wrap.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;event.preventDefault();const delta=vertical?drag.pos-event.clientY:event.clientX-drag.pos;let value=drag.value+delta/drag.length*(max()-min());value=Math.max(min(),Math.min(max(),Math.round(value/step())*step()));if(value===Number(input.value))return;input.value=String(value);paint();input.dispatchEvent(new Event('input'));});
 const end=event=>{if(!drag||drag.id!==event.pointerId)return;drag=null;delete input.dataset.dragging;wrap.classList.remove('tf-active');input.dispatchEvent(new Event('change'));};
 wrap.addEventListener('pointerup',end);wrap.addEventListener('pointercancel',end);wrap.addEventListener('click',event=>event.preventDefault());
}
function field(parent,action,key,label,options={}){
 const wrap=document.createElement('label');wrap.className=options.vertical?'remote-fader':'remote-field';wrap.title=label;
 const caption=document.createElement('span');caption.textContent=label;wrap.append(caption);
 const input=document.createElement(options.choices?'select':'input');input.setAttribute('aria-label',label);
 if(options.choices)for(const choice of options.choices){const [value,name]=Array.isArray(choice)?choice:[choice,choice];const option=document.createElement('option');option.value=value;option.textContent=name;input.append(option);}
 else{input.type=options.type||'range';for(const name of ['min','max','step'])if(options[name]!==undefined)input[name]=options[name];}
 const read=()=>input.type==='checkbox'?input.checked:options.choices&&options.string?input.value:Number(input.value);
 const output=document.createElement('output');if(!options.choices&&input.type!=='checkbox')wrap.append(output);
 wrap.append(input);parent.append(wrap);
 const id=`${action}:${key}`;controlsMap.set(id,{input,output,action,key,options});
 if(input.type==='range')touchFader(wrap,input,!!options.vertical);
 input.oninput=()=>{if(input.type==='range'){output.textContent=Number(input.value).toFixed(2);parameter(action,key,read(),true);}};
 input.onchange=()=>{clearTimeout(delays.get(id));delays.delete(id);parameter(action,key,read());};
 input.onpointerdown=()=>input.dataset.dragging='true';input.onpointerup=input.onpointercancel=()=>delete input.dataset.dragging;
 return input;
}
function toggle(parent,action,key,label,title){
 const input=document.createElement('button');input.textContent=label;input.title=title;input.setAttribute('aria-label',title);parent.append(input);
 controlsMap.set(`${action}:${key}`,{input,action,key,options:{button:true}});
 input.onclick=()=>parameter(action,key,key==='reseed'||key==='clearFx'?true:input.getAttribute('aria-pressed')!=='true');return input;
}
const manual=$('spore-controls');
// Two sub-columns: sliders (harmonicity, duration, each with its source) on the left; seed, texture, poly, seek on the right.
const manualSliders=document.createElement('div'),manualSettings=document.createElement('div');manualSliders.className='manual-sliders';manualSettings.className='manual-settings';manual.append(manualSliders,manualSettings);
field(manualSliders,'spore','harmSource','H',{choices:[['score','Score'],['manual','Manual']],string:true});field(manualSliders,'spore','harm','HARMONICITY',{min:0,max:16,step:.01});
field(manualSliders,'spore','durationSource','DUR',{choices:[['score','Score'],['manual','Manual']],string:true});field(manualSliders,'spore','duration','DURATION',{min:.02,max:4,step:.01});
field(manualSettings,'spore','seed','SEED',{type:'number',min:0,max:4294967295,step:1});toggle(manualSettings,'spore','reseed','↻','Apply seed and reset');
field(manualSettings,'spore','texture','TEXTURE',{choices:['auto','tutti','striated','hocket','granulation'],string:true});field(manualSettings,'spore','polyembryony','POLY',{type:'checkbox'});
field(manualSettings,'spore','seek','SEEK / s',{type:'number',min:0,max:1800,step:.1});
// VECTOR: live multipliers on the SPORE score's biological parameters (×1 = as written).
const vectorBox=$('vector-controls');
for(const [key,label,max] of [['mu','μ MUT',3],['disp','δ DISP',3],['poly','π BUD',3],['tuber','τ TUBER',4],['cap','ρ DENS',2]])field(vectorBox,'spore',`vector.${key}`,label,{min:0,max,step:.05,vertical:true});
toggle(vectorBox,'spore','vectorReset','×1','Reset the vector: back to the score as written (all ×1)').classList.add('vector-reset');
// TEMPO / DUR next to the vector: copies of the desktop header knobs, same commands.
const sporePerformance=$('spore-performance');
// One row of three columns: TEMPO / DUR (40 %) · SPORE / MANUAL (20 %) · VECTOR (20 %); proportions 2 : 1 : 1.
{const row=document.createElement('div'),manualSection=document.querySelector('section.manual'),vectorSection=document.querySelector('section.remote-vector'),tempoSection=document.createElement('section');
 row.className='spore-row';tempoSection.className='remote-performance';const heading=document.createElement('h2');heading.textContent='TEMPO · DUR';tempoSection.append(heading,sporePerformance);
 manualSection.before(row);row.append(tempoSection,manualSection,vectorSection);vectorSection.querySelector('h2').textContent='SPORE / VECTOR';}
// TEMPO / DUR as horizontal touch faders (knobs are unusable on a tablet). Logarithmic travel:
// TEMPO ×0.25–4, DUR ×0.001–1; ×1 buttons reset. Same commands as the desktop knobs.
const PERFORMANCE={tempo:{min:.25,max:4},dur:{min:.001,max:1}},performanceFaders=new Map();
const performanceValue=(key,n)=>{const {min,max}=PERFORMANCE[key],v=min*(max/min)**n;return key==='tempo'?Math.round(v*100)/100:Math.round(v*1000)/1000;},performancePosition=(key,v)=>{const {min,max}=PERFORMANCE[key];return Math.log(Math.max(min,Math.min(max,v))/min)/Math.log(max/min);};
function copyPerformanceKnobs(){
 if(sporePerformance.childElementCount)return;
 for(const [key,label] of [['tempo','TEMPO'],['dur','DUR']]){
  const wrap=document.createElement('label');wrap.className='remote-field performance-fader';const caption=document.createElement('span');caption.textContent=label;const input=document.createElement('input');input.type='range';input.min='0';input.max='1';input.step='0.002';input.value=String(performancePosition(key,1));input.setAttribute('aria-label',label);const output=document.createElement('output');output.textContent='×1.00';
  wrap.append(caption,output,input);sporePerformance.append(wrap);touchFader(wrap,input,false);
  input.addEventListener('input',()=>{const value=performanceValue(key,Number(input.value));output.textContent=`×${performanceText(value)}`;queuePerformance(key,value);});
  const reset=document.createElement('button');reset.type='button';reset.textContent='×1';reset.title=`${label} back to ×1`;reset.className='performance-reset';reset.onclick=()=>{input.value=String(performancePosition(key,1));output.textContent='×1.00';queuePerformance(key,1);};sporePerformance.append(reset);
  performanceFaders.set(key,{input,output});
 }
}
function syncPerformanceFaders(){for(const [key,{input,output}] of performanceFaders){if(input.dataset.dragging||performanceQueue.has(key)||pending.has(`spore:${key==='tempo'?'performanceTempo':'performanceDur'}`))continue;const value=state?.performance?.[key]??1;input.value=String(performancePosition(key,value));output.textContent=`×${performanceText(value)}`;}}

// IMPRO mega buttons: ARM · K · LA · MO · SCORE · ■ and patches 1–9.
const improBox=$('impro-controls'),improButtons=new Map();
function improButton(parent,key,label,title,value=()=>true){const b=document.createElement('button');b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.dataset.impro=key;b.onclick=()=>command('impro',{key,value:value()});parent.append(b);improButtons.set(key,b);return b;}
{const main=document.createElement('div');main.className='impro-main';improBox.append(main);
 improButton(main,'arm','ARM','IMPRO · arm / disarm (A)').classList.add('impro-arm');
 for(const [route,label] of [['klais','K'],['audio','LA'],['midi','MO']])improButton(main,route,label,`IMPRO · ${label} on / off`).classList.add('route',route);
 improButton(main,'follow','SCORE','IMPRO · the playing score takes over the patch',()=>!state?.impro?.follow);
 improButton(main,'stop','■','IMPRO · release every pending and sounding echo');
 improButton(main,'random','R','IMPRO · random patch (W)').classList.add('impro-tool');improButton(main,'empty','E','IMPRO · empty the patch (impro off)').classList.add('impro-tool');
 const patches=document.createElement('div');patches.className='impro-patches';main.append(patches);
 for(let n=1;n<=9;n++)improButton(patches,`patch${n}`,String(n),`IMPRO · patch ${n}`).onclick=()=>command('impro',{key:'patch',value:n});}
// BOTONERA: the selected patch's routing squares and per-manual 2×2 squares, drawn from the
// description the IMPRO pod sends (impro.padSpec), so it always matches the Mac.
const padBox=document.createElement('div');padBox.className='remote-botonera';improBox.append(padBox);
const padButtons=[];let padBuilt='';
function padButton(parent,text,title,send,match){const b=document.createElement('button');b.textContent=text;b.title=title;b.setAttribute('aria-label',title);b.onclick=()=>command('impro',send);b.match=match;parent.append(b);padButtons.push(b);return b;}
function buildBotonera(spec){
 padBox.replaceChildren();padButtons.length=0;
 for(const row of spec.rows){
  const line=document.createElement('div');line.className='botonera-line';line.dataset.src=row.src;line.style.setProperty('--row-color',row.color);
  const label=document.createElement('span');label.className='botonera-label';label.textContent=row.label;line.append(label);
  const routes=document.createElement('div');routes.className='botonera-routes';line.append(routes);
  for(const column of spec.columns){const b=padButton(routes,column.label,`${row.label} → ${column.label}`,{key:'route',value:`${row.src}:${column.target}`},s=>!!s.pad?.matrix?.[row.src]?.includes(column.target));if(column.color)b.style.setProperty('--division-color',column.color);if(column.target===row.src)b.dataset.self='true';}
  const quads=document.createElement('div');quads.className='botonera-quads';line.append(quads);
  for(const quad of spec.quads){const box=document.createElement('div');box.className='botonera-quad';quads.append(box);
   for(const [value,text] of quad.values)padButton(box,text,`${row.label} · ${quad.key} ${value}`,{key:'row',value:`${row.src}:${quad.key}:${value}`},s=>String(s.pad?.rows?.[row.src]?.[quad.key])===String(value));}
  padBox.append(line);
 }
}
function renderBotonera(s){
 if(!s?.padSpec)return;const signature=JSON.stringify(s.padSpec);if(signature!==padBuilt){padBuilt=signature;buildBotonera(s.padSpec);}
 for(const b of padButtons)b.classList.toggle('active',!!b.match(s));
 for(const line of padBox.querySelectorAll('.botonera-line'))line.classList.toggle('routed',!!s.pad?.matrix?.[line.dataset.src]?.length);
}
function renderImpro(){
 const s=state?.impro;$('impro-status').textContent=s?.status||'';if(!s)return;
 improButtons.get('arm').classList.toggle('active',!!s.armed);improButtons.get('arm').classList.toggle('pending',!!s.pending);improButtons.get('arm').textContent=s.armed?'ARMED':s.pending?'ARMING…':'ARM';
 for(const route of ['klais','audio','midi'])improButtons.get(route).classList.toggle('active',!!s.routes?.[route]);
 improButtons.get('follow').classList.toggle('active',!!s.follow);
 for(let n=1;n<=9;n++){const b=improButtons.get(`patch${n}`);b.classList.toggle('active',s.patch===n&&!s.score);b.classList.toggle('score',s.patch===n&&!!s.score);}
 renderBotonera(s);
}
// The Mac owns the shared MIC/TAPE follower and persistent send matrix.
const followerBox=document.createElement('details');followerBox.className='remote-follower';
followerBox.innerHTML='<summary>FILTER · MIC + TAPE</summary><div class="remote-follow-tools"></div><div class="remote-follow-grid"></div><div class="remote-follow-params"></div>';
followerBox.open=true;{const consoleRow=document.createElement('div');consoleRow.className='mixer-console';$('mixer').before(consoleRow);consoleRow.append($('mixer'),followerBox);}
const followTools=followerBox.querySelector('.remote-follow-tools'),followGrid=followerBox.querySelector('.remote-follow-grid');
toggle(followTools,'mixer','follow.enabled','FOLLOW','Shared MIC + TAPE pitch follower');
for(const [route,label] of [['klais','K'],['audio','LA'],['midi','MO']])toggle(followTools,'mixer','follow.route.'+route,label,'Follower output: '+label);
const followReset=document.createElement('button');followReset.textContent='R';followReset.title='Clear MIC + TAPE matrix';followReset.onclick=()=>parameter('mixer','follow.reset',true);followTools.append(followReset);
const followParams=followerBox.querySelector('.remote-follow-params');
for(const [key,label,min,max,step] of [['gateDb','GATE',-80,-10,1],['confidence','CONF',.5,.99,.01],['stableMs','STABLE',0,500,10],['releaseMs','RELEASE',30,1000,10],['repeatMs','REPEAT',0,2000,10],['minNote','LOW',0,127,1],['maxNote','HIGH',0,127,1],['transpose','TRANS',-24,24,1]])field(followParams,'mixer','follow.'+key,label,{min,max,step});
toggle(followParams,'mixer','follow.filterRepeats','REPEATS','Filter repeated notes');
let followBrush=null,followSpec='',followLocal=new Map();
function paintFollow(cell){
 if(!followBrush||!cell||!followGrid.contains(cell)||followBrush.visited.has(cell.dataset.send))return;
 followBrush.visited.add(cell.dataset.send);const key=cell.dataset.send;followLocal.set(key,{on:followBrush.on,until:Date.now()+1500});
 cell.classList.toggle('active',followBrush.on);cell.setAttribute('aria-pressed',String(followBrush.on));parameter('mixer','follow.send.'+key,followBrush.on);
}
followGrid.onpointerdown=event=>{const cell=event.target.closest('[data-send]');if(!cell||event.button!==0||!live()||!state?.ready||state?.panicBusy)return;event.preventDefault();followBrush={id:event.pointerId,on:!cell.classList.contains('active'),visited:new Set()};followGrid.setPointerCapture(event.pointerId);paintFollow(cell);};
followGrid.onpointermove=event=>{if(followBrush?.id!==event.pointerId)return;event.preventDefault();paintFollow(document.elementFromPoint(event.clientX,event.clientY)?.closest('[data-send]'));};
for(const type of ['pointerup','pointercancel','lostpointercapture'])followGrid.addEventListener(type,()=>{followBrush=null;});
window.addEventListener('blur',()=>{followBrush=null;});
function renderFollower(){
 const f=state?.mixer?.follower,signature=JSON.stringify([f?.columns,f?.intervals]);
 if(f&&signature!==followSpec){
  followSpec=signature;followGrid.replaceChildren(document.createElement('span'));
  for(const col of f.columns){const label=document.createElement('span');label.textContent=col.label;label.style.color=col.color;followGrid.append(label);}
  for(const row of f.intervals){
   const label=document.createElement('span');label.textContent=row.label;if(row.semitones===0)label.className='zero';followGrid.append(label);
   for(const col of f.columns){const cell=document.createElement('button');cell.dataset.send=`${row.semitones}:${col.channel}`;cell.style.setProperty('--division-color',col.color);cell.title=`${col.label} · ${row.label}`;cell.setAttribute('aria-label',cell.title);if(row.semitones===0)cell.classList.add('zero');cell.onclick=event=>{if(event.detail!==0)return;parameter('mixer','follow.send.'+cell.dataset.send,!cell.classList.contains('active'));};followGrid.append(cell);}
  }
 }
 const sends=new Set(f?.matrix||[]),enabled=live()&&state?.ready&&!state?.panicBusy;
 for(const cell of followGrid.querySelectorAll('[data-send]')){const local=followLocal.get(cell.dataset.send),actual=sends.has(cell.dataset.send);if(local&&(local.on===actual||local.until<Date.now()))followLocal.delete(cell.dataset.send);const on=followLocal.get(cell.dataset.send)?.on??actual;cell.classList.toggle('active',on);cell.setAttribute('aria-pressed',String(on));cell.disabled=!enabled;}
 followReset.disabled=!enabled;
}

const gardenSurface=document.createElement('canvas');gardenSurface.className='remote-garden';gardenSurface.hidden=true;gardenSurface.setAttribute('aria-label','Sound garden · touch to change height and depth');document.querySelector('.macro').after(gardenSurface);
let gardenSent=0;
function gardenTouch(event){if(!state?.garden||!live())return;const now=performance.now();if(event.type!=='pointerdown'&&now-gardenSent<100)return;gardenSent=now;const r=gardenSurface.getBoundingClientRect();parameter('mixer','garden.position',{x:Math.max(0,Math.min(1,(event.clientX-r.left)/r.width)),y:Math.max(0,Math.min(1,(event.clientY-r.top)/r.height))});}
gardenSurface.onpointerdown=event=>{gardenSurface.setPointerCapture(event.pointerId);gardenTouch(event);};gardenSurface.onpointermove=gardenTouch;
function renderGarden(){gardenSurface.hidden=!state?.garden;if(!state?.garden)return;const r=gardenSurface.getBoundingClientRect(),d=devicePixelRatio||1;gardenSurface.width=Math.round(r.width*d);gardenSurface.height=Math.round(r.height*d);const ctx=gardenSurface.getContext('2d');ctx.setTransform(d,0,0,d,0,0);const pos=state.gardenPosition||{x:.5,y:.6};ctx.strokeStyle='#b6ffcf88';for(let i=0;i<4;i++){ctx.beginPath();ctx.ellipse(pos.x*r.width,(.15+pos.y*.7)*r.height,4+i*12,3+i*6,0,0,Math.PI*2);ctx.stroke();}}
const mix=$('mixer');
for(const group of MIX_GROUPS){
 const strip=document.createElement('section');strip.className=`remote-strip ${group.color||''}`;const heading=document.createElement('h3');heading.textContent=group.name;strip.append(heading);
 const row=document.createElement('div');row.className='remote-faders';strip.append(row);
 for(const [key,label,min,max,step] of group.controls)field(row,'mixer',key,label,{min,max,step,vertical:true});
 if(group.meter){const meter=document.createElement('div');meter.className='stereo-meter';meter.dataset.meter=group.meter;meter.innerHTML='<i><b></b></i><i><b></b></i>';row.append(meter);}
 if(group.name==='AUTOTUNE'){field(strip,'mixer','tuneScale','SCALE',{choices:['chromatic','major','minor','pentatonic'],string:true});field(strip,'mixer','tuneRoot','ROOT',{choices:['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'].map((n,i)=>[i,n])});}
 if(group.name==='MIC'){field(strip,'mixer','micLane','INPUT',{choices:[[0,'A'],[1,'B']]});toggle(strip,'mixer','monitor','MIC → MASTER','Monitor the locally enabled mic');}
 mix.append(strip);
}
const mixerSnapshots=document.createElement('div');mixerSnapshots.className='remote-mixer-snapshots';const mixerSnapshotButtons=Array.from({length:4},(_,i)=>{const button=document.createElement('button');button.textContent=String(i+1);button.title=`Mixer ${i+1}${i===0?' · startup default':''} · click to recall · Shift+click to save`;button.onclick=event=>parameter('mixer',event.shiftKey?'snapshotSave':'snapshotRecall',i+1);mixerSnapshots.append(button);return button;});$('mixer-tools').append(mixerSnapshots);
toggle($('mixer-tools'),'mixer','clearFx','CLEAR FX','Clear effects and mute mic');
const time=ms=>{const s=Math.max(0,Math.floor((ms||0)/1000));return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;};
// Pitch-roll lanes (P I II III IV), whole score: the desktop MACRO lanes, from state.spore.roll (base64, 384 columns).
const ROLL_COLORS=['hsl(40 78% 72%)','hsl(95 78% 72%)','hsl(150 78% 72%)','hsl(205 78% 72%)','hsl(260 78% 72%)'],ROLL_LABELS=['P','I','II','III','IV'];
let rollSource='',rollBytes=null;
function roll(){
 const canvas=$('roll'),rect=canvas.getBoundingClientRect(),d=devicePixelRatio||1,w=rect.width,h=rect.height;if(w<1||h<1)return;
 if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}
 const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);const text=state?.spore?.roll,data=state?.spore?.macro;if(!data)return;
 if(text!==rollSource){rollSource=text;try{const binary=atob(text||'');rollBytes=Uint8Array.from(binary,c=>c.charCodeAt(0));}catch{rollBytes=null;}}
 const left=8,width=w-16,lane=(h-6)/5,row=(lane-3)/8,columns=rollBytes?rollBytes.length/5:0,now=(state.positionMs||0)/1000;
 ctx.font='9px ui-monospace,monospace';
 for(let k=0;k<5;k++){
  const top=3+k*lane;ctx.fillStyle='#0a110d';ctx.fillRect(left,top,width,lane-3);ctx.fillStyle=ROLL_COLORS[k];
  if(columns)for(let c=0;c<columns;c++){const bits=rollBytes[k*columns+c];if(!bits)continue;const x=left+c/columns*width,cw=Math.max(1,width/columns);for(let r=0;r<8;r++)if(bits&(1<<r))ctx.fillRect(x,top+r*row,cw,Math.max(1,row));}
  ctx.globalAlpha=.55;ctx.fillText(ROLL_LABELS[k],left+2,top+9);ctx.globalAlpha=1;
 }
 const x=left+Math.max(0,Math.min(1,now/data.duration))*width;ctx.fillStyle='#ffbd69';ctx.fillRect(x,0,1.5,h);
}
function macro(){
 const canvas=$('macro'),rect=canvas.getBoundingClientRect(),d=devicePixelRatio||1,w=rect.width,h=rect.height;
 if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}
 const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,w,h);const data=state?.spore?.macro;if(!data||w<1)return;
 const x=t=>8+t/data.duration*(w-16),top=5,bottom=h-18;ctx.font='10px ui-monospace,monospace';
 const current=data.sections.find(s=>state.positionMs/1000>=s.start&&state.positionMs/1000<s.start+s.dur)||data.sections.at(-1);ctx.fillStyle='#ffbd69';ctx.fillText(`${current.id} · ${current.name||''}`,8,12,w-16);
 for(const section of data.sections){const active=(state.positionMs/1000)>=section.start&&(state.positionMs/1000)<section.start+section.dur;ctx.fillStyle=active?'#b6ffcf12':'#090f0c';ctx.fillRect(x(section.start),20,x(section.start+section.dur)-x(section.start),bottom-20);ctx.strokeStyle=active?'#618e70':'#27352f';ctx.strokeRect(x(section.start),20,x(section.start+section.dur)-x(section.start),bottom-20);ctx.save();ctx.beginPath();ctx.rect(x(section.start)+1,20,Math.max(0,x(section.start+section.dur)-x(section.start)-2),28);ctx.clip();ctx.fillStyle=active?'#ffbd69':'#c2ae82';ctx.fillText(section.id,x(section.start)+3,29);ctx.font='8px ui-monospace,monospace';ctx.fillStyle='#82978a';ctx.fillText(`${section.bpm} BPM`,x(section.start)+3,41);ctx.restore();}
 const history=data.history||[],popMax=Math.max(1,...history.map(p=>p[1])),entropyMax=Math.max(8,...history.map(p=>p[2]));
 for(const [index,max,color] of [[1,popMax,'#6edbff70'],[2,entropyMax,'#b6ffcf']]){ctx.beginPath();history.forEach((p,i)=>{const y=bottom-4-(p[index]/max)*(bottom-top-48);i?ctx.lineTo(x(p[0]),y):ctx.moveTo(x(p[0]),y);});ctx.strokeStyle=color;ctx.stroke();}
 ctx.strokeStyle='#ff5f9e';ctx.beginPath();ctx.moveTo(x(state.positionMs/1000),48);ctx.lineTo(x(state.positionMs/1000),bottom);ctx.stroke();
 ctx.fillStyle='#82978a';for(let t=0;t<=data.duration;t+=60)ctx.fillText(time(t*1000),Math.max(0,Math.min(w-35,x(t)-10)),h-3);
}
let shownHeader='';
function render(){
 if(state?.headerHTML&&document.activeElement?.id!=='scene-speed'&&!document.activeElement?.closest?.('[data-performance]')&&!$('desktop-header').querySelector('[data-performance][data-dragging]')&&shownHeader!==state.headerHTML){
  // The page's CSP ignores inline style attributes in mirrored markup, so the desktop's own colours (piece hues,
  // borders, knob positions) are re-applied through the CSSOM. Compared against the source text, not the DOM.
  shownHeader=state.headerHTML;$('desktop-header').innerHTML=state.headerHTML;
  for(const element of $('desktop-header').querySelectorAll('[style]')){const css=element.getAttribute('style');if(css)element.style.cssText=css;}
 }
 copyPerformanceKnobs();renderImpro();renderFollower();renderGarden();
 for(const knob of document.querySelectorAll('[data-performance]')){const key=knob.dataset.performance;if(!knob.dataset.dragging&&!pending.has(`spore:${key==='tempo'?'performanceTempo':'performanceDur'}`)&&!performanceQueue.has(key))paintPerformanceKnob(knob,state?.performance?.[key]??1);}
 for(const [id,entry] of controlsMap){
  const {input,output,action,key,options}=entry,values=action==='mixer'?state?.mixer?.values:state?.spore?.manual;
  const value=key.startsWith('output.')?values?.outputs?.[key.slice(7)]:key.startsWith('vector.')?values?.vector?.[key.slice(7)]:values?.[key];
  if(value===undefined)continue;
  if(options.button){input.classList.toggle('active',!!value);input.setAttribute('aria-pressed',String(!!value));}
  else if(!input.dataset.dragging&&!pending.has(id)&&!delays.has(id)&&!(document.activeElement===input&&input.type!=='range')){
   if(input.type==='checkbox')input.checked=!!value;else input.value=String(value);
   if(output)output.textContent=typeof value==='number'?(Number.isInteger(value)?String(value):value.toFixed(2)):String(value);
  }
 }
 const manual=state?.spore?.manual;
 for(const meter of document.querySelectorAll('[data-meter]'))meter.querySelectorAll('b').forEach((bar,i)=>{const peak=state?.mixer?.levels?.[meter.dataset.meter]?.[i]||0;bar.style.height=`${Math.max(0,Math.min(1,(20*Math.log10(Math.max(.001,peak))+60)/60))*100}%`;bar.classList.toggle('clip',peak>=.891);});
 // Only the remote's own errors are shown here; the Mac's messages stay on the Mac (vertical space).
 syncPerformanceFaders();
 for(const paint of faderPaints)paint();
 macro();roll();controls();
}
function clearPending(){clearTimeout(performanceTimer);performanceTimer=null;performanceQueue.clear();pending.clear();queued.clear();for(const timer of delays.values())clearTimeout(timer);delays.clear();}
function connect(){
 const mine=new WebSocket(`ws://${location.host}/ws?role=controller`);socket=mine;
 mine.onopen=()=>{attempt=0;};mine.onmessage=event=>{
  let data;try{data=JSON.parse(event.data);}catch{return;}
  if(data.type==='state'){state=data.state;online=data.online===true;lastStateAt=Date.now();render();}
  else if(data.type==='result'){
   const found=[...pending].find(([,entry])=>entry.id===data.id);if(!found)return;pending.delete(found[0]);
   if(!data.ok)$('message').textContent=data.error||'Command failed';
   const next=queued.get(found[0]);queued.delete(found[0]);if(data.ok&&next&&Date.now()-next.at<1500)command(next.action,next.value);controls();
  }
 };
 mine.onclose=()=>{if(mine!==socket)return;online=false;state=null;clearPending();controls();$('message').textContent='Disconnected. Mac keeps running. Commands are not replayed.';retry=setTimeout(connect,Math.min(5000,700*2**Math.min(attempt++,3)));};mine.onerror=()=>mine.close();
}
// One tap, always. The header markup is replaced whenever the desktop header changes (several times a
// second while playing), so a click could be lost when its button was swapped between touch down and up.
// The tap is therefore taken at the container: the button is identified on pointerdown and the action
// runs on pointerup if the finger stayed in place (a horizontal scroll of the row is not a tap).
let headerTap=null;
$('desktop-header').addEventListener('pointerdown',event=>{const button=event.target.closest('button');headerTap=button&&!button.disabled&&!button.closest('[data-performance]')?{id:button.id,dataset:{...button.dataset},x:event.clientX,y:event.clientY,at:Date.now(),pointer:event.pointerId}:null;});
$('desktop-header').addEventListener('pointercancel',()=>{headerTap=null;});
$('desktop-header').addEventListener('pointerup',event=>{const tap=headerTap;headerTap=null;if(!tap||tap.pointer!==event.pointerId||Date.now()-tap.at>1200||Math.hypot(event.clientX-tap.x,event.clientY-tap.y)>14)return;headerAction(tap);});
function headerAction(button){
 const id=button.id;
 if(id==='fullscreen'){fullscreen();return;}
 if(button.dataset.globalOutput){const route=button.dataset.globalOutput;parameter('spore',`output.${route}`,!state?.spore?.manual?.outputs?.[route]);return;}
 if(button.dataset.scoreLoad){command('score',button.dataset.scoreLoad);return;}
 if(id.startsWith('command-')){const key=id.slice(8);command('process',{key,value:!state?.[key]});return;}
 if(id==='reg-program-prev'||id==='reg-program-next'){command('program',id==='reg-program-prev'?-1:1);return;}
 const action=HEADER_ACTIONS[id];if(action)command(id==='scene-play'&&state?.running?'stop':action);
};
let performanceTimer=null;const performanceQueue=new Map();function queuePerformance(key,value){performanceQueue.set(key,value);if(!performanceTimer)performanceTimer=setTimeout(()=>{performanceTimer=null;for(const [key,value] of performanceQueue)parameter('spore',key==='tempo'?'performanceTempo':'performanceDur',value);performanceQueue.clear();},80);}
bindPerformanceKnobs($('desktop-header'),(key,value)=>queuePerformance(key,value),{ready:()=>live()&&state?.ready&&!state?.panicBusy});
$('desktop-header').onchange=event=>{if(event.target.id==='scene-speed'){command('speed',Number(event.target.value));event.target.blur();}};
$('macro').onclick=event=>{const data=state?.spore?.macro;if(!data||!live())return;const rect=event.currentTarget.getBoundingClientRect();parameter('spore','seek',Math.max(0,Math.min(data.duration,(event.clientX-rect.left-8)/(rect.width-16)*data.duration)));};
$('roll').onclick=event=>{const data=state?.spore?.macro;if(!data||!live())return;const rect=event.currentTarget.getBoundingClientRect();parameter('spore','seek',Math.max(0,Math.min(data.duration,(event.clientX-rect.left-8)/(rect.width-16)*data.duration)));};
async function fullscreen(){try{if(document.fullscreenElement||document.webkitFullscreenElement)await(document.exitFullscreen||document.webkitExitFullscreen).call(document);else{const request=document.documentElement.requestFullscreen||document.documentElement.webkitRequestFullscreen;if(!request)throw new Error('Fullscreen unavailable in this Safari mode');await request.call(document.documentElement);}}catch(error){$('message').textContent=error.message;}}
setInterval(()=>{for(const [key,entry] of pending)if(Date.now()-entry.at>(['p2','ps','super-panic'].includes(key)?125000:12000)){pending.delete(key);queued.delete(key);$('message').textContent='No confirmation. Command was not retried.';}controls();},500);
window.addEventListener('resize',macro);window.addEventListener('pagehide',()=>{clearTimeout(retry);clearPending();if(socket){socket.onclose=null;socket.close();}});window.addEventListener('pageshow',event=>{if(event.persisted)connect();});connect();


const performanceShortcuts={KeyJ:'#command-audio',KeyK:'#command-midi',KeyL:'#command-laser',KeyU:'[data-global-output="klais"]',KeyI:'[data-global-output="audio"]',KeyO:'[data-global-output="midi"]'};
document.addEventListener('keydown',event=>{
  const selector=performanceShortcuts[event.code];if(!selector||event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.isComposing)return;
  if(event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')||document.querySelector('dialog[open]'))return;
  if(!live()||!state?.ready||state?.panicBusy)return;
  const button=$('desktop-header').querySelector(selector);if(!button||button.disabled)return;
  event.preventDefault();event.stopPropagation();if(!event.repeat)button.click();
},true);

// Touch hardening (see remote.css): Safari ignores user-scalable=no in a tab, so cancel its pinch gesture
// events, multi-touch page moves, double-tap zoom, and the long-press menu. Controls keep working: only the
// default page behaviours are cancelled.
for(const type of ['gesturestart','gesturechange','gestureend'])document.addEventListener(type,event=>event.preventDefault(),{passive:false});
document.addEventListener('touchmove',event=>{if(event.touches.length>1||(event.scale!==undefined&&event.scale!==1))event.preventDefault();},{passive:false});
// Double-tap zoom is removed by touch-action in CSS, not by cancelling touchend: that would swallow fast repeated taps.
document.addEventListener('dblclick',event=>event.preventDefault());
document.addEventListener('contextmenu',event=>{if(!event.target.closest?.('input,textarea'))event.preventDefault();});
document.addEventListener('selectstart',event=>{if(!event.target.closest?.('input,textarea,[contenteditable="true"]'))event.preventDefault();});

// MIXER as an overlay: one button (always on screen) opens it; a tap outside closes it. Nothing is unmounted,
// so meters and values keep updating while it is closed.
{const section=document.querySelector('.remote-mixer'),backdrop=document.createElement('div'),open=document.createElement('button');
 backdrop.className='mixer-backdrop';backdrop.hidden=true;open.id='mixer-open';open.type='button';open.textContent='MIXER';open.title='Open / close the mixer';
 section.classList.add('mixer-modal');section.hidden=true;document.body.append(backdrop,open);
 const set=on=>{section.hidden=!on;backdrop.hidden=!on;open.classList.toggle('active',on);if(on)render();};
 open.onclick=()=>set(section.hidden);backdrop.addEventListener('pointerdown',event=>{event.preventDefault();set(false);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!section.hidden)set(false);});}
