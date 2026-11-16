// IMPRO: timbre-delays, arpeggios and held-chord arpeggiators for a live player. A note played on a
// source manual is re-sent to other divisions after delays, transposed, with tails.
// Pure: parse, format and plan only. The pod owns MIDI input, scheduling and stop authority.
//
//   impro src I tap II 0 250 tap III 7 500 tap IV 12 1000 rep 2 every 1500 stretch 1.25 tail 3
//
// Sources. `src X` opens a group; a line may hold several groups, one per source manual:
//   impro src I tap II 0 250 src III arpU 5 IV 3 100 tail 2
// Clauses of a group (DIVISION SEMITONES DELAY-MS; families take the count first):
//   tap II 7 500           one echo
//   tapA 7 II 3 100        arithmetic: every step repeats the same leap and gap
//   tapL 7 II 3 100 [1.5]  geometric: each leap and gap is the previous one × ratio
//   tapR 20 [24 4000]      random division, interval (± max) and delay (≤ max ms), new for every key
//   arpU / arpD / arpB 7 II 3 100     up, down, up-and-back; suffix L geometric, suffix R random
//   holdU / holdD / holdB / holdR II 120 [2]   arpeggiate the keys held on the source, every 120 ms, 2 octaves
// DIVISION may be a list (II,III,IV) or * (every manual except the source): taps cycle through it.
// Globals, anywhere in the line: rep N, every MS, stretch F, tail F, decay P, min MS, max MS.
const DIV={i:'go',ii:'po',iii:'re',iv:'so',p:'pe',go:'go',po:'po',re:'re',so:'so',pe:'pe'};
export const CHANNEL={go:1,po:2,re:3,so:4,pe:5},LABEL={go:'I',po:'II',re:'III',so:'IV',pe:'P'};
export const IMPRO_DEFAULT=Object.freeze({off:false,groups:[],rep:1,every:null,stretch:1,tail:1,decay:1,min:60,max:20000,vel:1});
const GLOBALS={rep:[1,8,true],every:[10,60000],stretch:[.25,4],tail:[.05,32],decay:[0,1],min:[10,10000],max:[50,120000],vel:[.1,1.5]};
const RANGE={pe:[24,55],manual:[36,96]};
const num=(token,low,high,integer=false)=>{const n=Number(token);if(token===undefined||token===''||!Number.isFinite(n)||n<low||n>high||(integer&&!Number.isInteger(n)))throw new Error(`impro: ${token} outside ${low}–${high}`);return n;};
const division=token=>{const d=DIV[String(token||'').toLowerCase()];if(!d)throw new Error(`impro: unknown division ${token} (I II III IV P)`);return d;};
const random=(...keys)=>{let h=2166136261;for(const k of keys){h=Math.imul(h^(k|0),16777619);h^=h>>>13;}h=Math.imul(h^(h>>>16),2246822507);h=Math.imul(h^(h>>>13),3266489909);h^=h>>>16;return(h>>>0)/4294967296;};
const fold=(midi,d)=>{const [low,high]=d==='pe'?RANGE.pe:RANGE.manual;while(midi<low)midi+=12;while(midi>high)midi-=12;return midi;};

// One family → explicit taps. Leaps and gaps: constant, × ratio (L) or drawn (R, needs `draw`).
// arpB walks up `count` steps and returns through the same pitches while time keeps advancing.
function expandFamily(f,draw=null){
 const geometric=f.key==='tapL'||f.mode==='L',sign=f.arp==='D'?-1:1,leaps=[],taps=[];let leap=f.interval,gap=f.delay,time=0,pitch=0;
 const total=f.arp==='B'?2*f.count-1:f.count;
 for(let n=0;n<total;n++){
  const back=f.arp==='B'&&n>=f.count;let step;
  if(back)step=-leaps[2*f.count-1-n];
  else{step=draw?1+Math.floor(draw(n,1)*f.interval):leap;leaps.push(step);}
  pitch+=step;time+=draw?Math.max(10,draw(n,2)*f.delay):gap;if(time>120000)break;
  taps.push({division:f.divisions[n%f.divisions.length],interval:Math.max(-127,Math.min(127,Math.round(sign*pitch))),delay:Math.round(time)});
  if(geometric){if(!back)leap*=f.ratio;gap*=f.ratio;}
 }
 return taps;
}
function parseGroup(src,args){
 const g={src,taps:[],random:[],randomArps:[],holds:[],clauses:[]},families=[];
 for(let i=0;i<args.length;){
  const key=args[i++];
  if(key==='tap'){const tap={division:division(args[i++]),interval:num(args[i++],-36,36,true),delay:num(args[i++],0,60000)};g.taps.push(tap);g.clauses.push(`tap ${LABEL[tap.division]} ${tap.interval} ${tap.delay}`);continue;}
  if(key==='tapA'||key==='tapL'){
   const count=num(args[i++],1,32,true),where=String(args[i++]||''),interval=num(args[i++],-36,36,true),delay=num(args[i++],1,60000);
   let ratio=1.5;if(key==='tapL'&&/^\d*\.?\d+$/.test(args[i]||''))ratio=num(args[i++],.25,4);
   families.push({key,count,where,interval,delay,ratio});g.clauses.push(`${key} ${count} ${where} ${interval} ${delay}${key==='tapL'?' '+ratio:''}`);continue;
  }
  const arp=/^arp([UDB])([LR]?)$/.exec(key);
  if(arp){
   const count=num(args[i++],1,32,true),where=String(args[i++]||''),interval=Math.abs(num(args[i++],-36,36,true)),delay=num(args[i++],1,60000);
   if(!interval)throw new Error('impro: an arpeggio needs a step of at least 1 semitone');
   let ratio=1.5;if(arp[2]==='L'&&/^\d*\.?\d+$/.test(args[i]||''))ratio=num(args[i++],.25,4);
   const family={key,arp:arp[1],mode:arp[2],count,where,interval,delay,ratio};
   (arp[2]==='R'?g.randomArps:families).push(family);g.clauses.push(`${key} ${count} ${where} ${interval} ${delay}${arp[2]==='L'?' '+ratio:''}`);continue;
  }
  const hold=/^hold([UDBR])$/.exec(key);
  if(hold){
   const where=String(args[i++]||''),ms=num(args[i++],20,10000);let oct=1;if(/^\d$/.test(args[i]||''))oct=num(args[i++],1,4,true);
   g.holds.push({key,mode:hold[1],where,ms,oct});g.clauses.push(`${key} ${where} ${ms} ${oct}`);continue;
  }
  if(key==='tapR'){
   const count=num(args[i++],1,32,true);let maxInterval=24,maxDelay=4000;
   if(/^\d+$/.test(args[i]||'')){maxInterval=num(args[i++],0,48,true);if(/^\d+$/.test(args[i]||''))maxDelay=num(args[i++],10,60000);}
   g.random.push({count,maxInterval,maxDelay});g.clauses.push(`tapR ${count} ${maxInterval} ${maxDelay}`);continue;
  }
  throw new Error(`impro: unknown parameter ${key}`);
 }
 const others=Object.keys(CHANNEL).filter(d=>d!==src);
 for(const f of [...families,...g.randomArps,...g.holds])f.divisions=f.where==='*'?others.filter(d=>d!=='pe'):f.where.split(',').map(division);
 for(const f of families)g.taps.push(...expandFamily(f));
 // A tap back onto its own source manual would re-trigger itself through the console.
 if(g.taps.some(t=>t.division===src)||[...g.randomArps,...g.holds].some(f=>f.divisions.includes(src)))throw new Error(`impro: a tap cannot target its own source manual ${LABEL[src]}`);
 if(g.taps.length>64)throw new Error('impro: at most 64 taps per source after expansion');
 if(!g.taps.length&&!g.random.length&&!g.randomArps.length&&!g.holds.length)throw new Error(`impro: source ${LABEL[src]} has no tap / arp / hold clause`);
 return g;
}
export function parseImpro(args){
 if(args.length===1&&args[0]==='off')return{...IMPRO_DEFAULT,off:true,groups:[],src:'go',taps:[],random:[],randomArps:[],holds:[],clauses:[]};
 const s={...IMPRO_DEFAULT,groups:[]},segments=[];let current=null;
 for(let i=0;i<args.length;i++){
  const key=args[i];
  if(Object.hasOwn(GLOBALS,key)){const [low,high,integer]=GLOBALS[key];s[key]=num(args[++i],low,high,!!integer);continue;}
  if(key==='src'){current={src:division(args[++i]),args:[]};segments.push(current);continue;}
  if(!current){current={src:'go',args:[]};segments.push(current);}
  current.args.push(key);
 }
 if(!segments.length)throw new Error('impro needs src and tap / tapA / tapL / tapR / arp… / hold… (or: impro off)');
 if(new Set(segments.map(x=>x.src)).size!==segments.length)throw new Error('impro: each source manual may appear once');
 s.groups=segments.map(x=>parseGroup(x.src,x.args));
 if(s.min>s.max)throw new Error('impro: min exceeds max');
 // First group mirrored at top level for older callers and one-source displays.
 return Object.assign(s,{src:s.groups[0].src,taps:s.groups[0].taps,random:s.groups[0].random,randomArps:s.groups[0].randomArps,holds:s.groups[0].holds,clauses:s.groups[0].clauses});
}
export function parseImproLine(line){const tokens=String(line).trim().split(/\s+/);if(tokens[0]!=='impro')throw new Error('Line must start with impro');return parseImpro(tokens.slice(1));}
export function formatImpro(s){
 if(s.off)return'impro off';
 return`impro ${s.groups.map(g=>`src ${LABEL[g.src]} ${g.clauses.join(' ')}`).join(' ')} rep ${s.rep}${s.every===null?'':` every ${s.every}`} stretch ${s.stretch} tail ${s.tail} decay ${s.decay} min ${s.min} max ${s.max}`;
}
export const groupFor=(state,channel)=>state?.off?null:(state?.groups||[]).find(g=>CHANNEL[g.src]===channel)||null;
/** Echo plan for one played note in one source group: [{division, channel, midi, delayMs, pass}] by delay.
 * Pass r repeats the whole tap chain: delay = (tap.delay + r·every) · stretch^r; `decay` thins later passes. */
export function planEchoes(state,note,serial=0,group=state?.groups?.[0]){
 if(!state||state.off||!group||!Number.isInteger(note)||(!group.taps.length&&!group.random.length&&!group.randomArps.length))return[];
 // Random taps are redrawn for every played key (serial), never onto the source manual.
 const others=Object.keys(CHANNEL).filter(d=>d!==group.src&&d!=='pe'),drawn=[];let salt=0;
 for(const r of group.random)for(let n=0;n<r.count;n++,salt++)drawn.push({division:others[Math.floor(random(serial,salt,31)*others.length)],interval:Math.round((random(serial,salt,37)*2-1)*r.maxInterval),delay:Math.round(random(serial,salt,41)*r.maxDelay)});
 group.randomArps.forEach((f,k)=>drawn.push(...expandFamily(f,(n,what)=>random(serial,k,n,what,43))));
 const taps=[...group.taps,...drawn],every=state.every??Math.max(...taps.map(t=>t.delay),100),plan=[];
 for(let pass=0;pass<state.rep;pass++)taps.forEach((tap,index)=>{
  if(pass>0&&random(serial,pass,index,17)>=state.decay**pass)return;
  plan.push({division:tap.division,channel:CHANNEL[tap.division],midi:fold(note+tap.interval,tap.division),delayMs:(tap.delay+pass*every)*state.stretch**pass,pass});
 });
 return plan.sort((a,b)=>a.delayMs-b.delayMs);
}
/** Step `index` of a held-chord arpeggio: the notes held now, over `oct` octaves, in the hold's order. */
export function heldStep(hold,heldNotes,index,serial=0){
 const base=[...new Set(heldNotes)].sort((a,b)=>a-b);if(!base.length)return null;
 const ladder=[];for(let o=0;o<hold.oct;o++)for(const n of base)ladder.push(n+12*o);
 const L=ladder.length;let position;
 if(hold.mode==='U')position=index%L;else if(hold.mode==='D')position=L-1-index%L;
 else if(hold.mode==='B'){const cycle=Math.max(1,2*L-2),k=index%cycle;position=L===1?0:k<L?k:cycle-k;}
 else position=Math.floor(random(serial,index,53)*L);
 const d=hold.divisions[index%hold.divisions.length];
 return{division:d,channel:CHANNEL[d],midi:fold(ladder[position],d)};
}
export const echoDurationMs=(state,heldMs)=>Math.max(state.min,Math.min(state.max,heldMs*state.tail));

// BOTONERA: a routing matrix (source manual → target divisions, `*` = rotate over the other manuals).
// Every source row carries its own kind, interval, time and count; the pad is written out as an
// ordinary impro line with one group per source.
export const PAD_KINDS=Object.freeze({TAP:['TAP','TAPL','TAPR','TAPA'],ARP:['ARPU','ARPD','ARPB','ARPR'],HOLD:['HOLDU','HOLDD','HOLDB','HOLDR']});
export const PAD_INTERVALS=[-12,3,7,12],PAD_TIMES=[100,200,300,500],PAD_COUNTS=[3,5,7,12];
export const PAD_ROW=Object.freeze({kind:'TAP',interval:7,time:200,count:5}),PAD_DEFAULT=Object.freeze({matrix:{},rows:{}});
const PAD_SOURCES=['so','re','po','go','pe'],OLD_KIND={ARPU:'ARPU',ARPR:'ARPR',HOLD:'HOLDU',TAP:'TAP',TAPR:'TAPR'},ALL_KINDS=Object.values(PAD_KINDS).flat();
export const padRow=(pad,src)=>({...PAD_ROW,...(pad?.rows?.[src]||{})});
// Accepts the first pad format (one kind / interval / time / count for the whole patch).
export function normalizePad(pad){
 if(!pad||typeof pad!=='object')return null;
 const matrix={},rows={},old=pad.rows?null:{kind:OLD_KIND[pad.kind]||'TAP',interval:pad.interval,time:pad.time,count:pad.count};
 for(const src of PAD_SOURCES){
  if(Array.isArray(pad.matrix?.[src])&&pad.matrix[src].length)matrix[src]=pad.matrix[src].filter(d=>d==='*'||(d in CHANNEL&&d!==src));
  const row={...PAD_ROW,...(old||pad.rows?.[src]||{})};
  rows[src]={kind:ALL_KINDS.includes(row.kind)?row.kind:'TAP',interval:Number(row.interval)||7,time:Math.max(10,Number(row.time)||200),count:Math.max(1,Math.round(Number(row.count)||5))};
 }
 return{matrix,rows};
}
export function padLine(pad){
 const groups=[];let holds=0;
 for(const src of PAD_SOURCES){
  const picked=pad.matrix?.[src]||[];if(!picked.length)continue;
  const row=padRow(pad,src),any=picked.includes('*'),list=picked.filter(d=>d!=='*'&&d!==src),where=any||!list.length?'*':list.map(d=>LABEL[d]).join(','),step=Math.abs(row.interval)||1;
  const targets=any||!list.length?Object.keys(CHANNEL).filter(d=>d!==src&&d!=='pe'):list,family=row.kind.slice(0,-1),letter=row.kind.slice(-1);
  let clause;
  if(row.kind==='TAP')clause=targets.map((d,k)=>`tap ${LABEL[d]} ${row.interval} ${row.time*(k+1)}`).join(' ');
  else if(row.kind==='TAPR')clause=`tapR ${row.count} ${step} ${row.time*row.count}`;
  else if(family==='TAP')clause=`tap${letter} ${row.count} ${where} ${row.interval} ${row.time}`;
  else if(family==='ARP')clause=`arp${letter==='R'?'UR':letter} ${row.count} ${where} ${step} ${row.time}`;
  else{clause=`hold${letter} ${where} ${row.time} ${step>=12?2:1}`;holds++;}
  groups.push(`src ${LABEL[src]} ${clause}`);
 }
 return groups.length?`impro ${groups.join(' ')} tail ${holds===groups.length?.8:1.5}`:'impro off';
}
export function padRandom(seed){
 const r=k=>random(seed,k,61),matrix={},rows={},divs=PAD_SOURCES,sources=1+Math.floor(r(1)*2);
 for(let n=0;n<sources;n++){const src=divs[Math.floor(r(10+n)*4)];if(matrix[src])continue;const targets=divs.filter(d=>d!==src&&r(20+n*7+divs.indexOf(d))<.5);matrix[src]=targets.length?targets:['*'];}
 divs.forEach((src,i)=>{rows[src]={kind:ALL_KINDS[Math.floor(r(40+i)*ALL_KINDS.length)],interval:PAD_INTERVALS[Math.floor(r(50+i)*4)],time:PAD_TIMES[Math.floor(r(60+i)*4)],count:PAD_COUNTS[Math.floor(r(70+i)*4)]};});
 return{matrix,rows};
}
