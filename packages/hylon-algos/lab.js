import {MIDI_CORPUS} from './midi-corpus.js';
import {TAPE_PROFILES} from './tape-profile.js';
import {processMidiWindow} from '../hylon-midi-process/model.js';
// LAB algorithms (scores 10+): `chord` — iridescent chord hits gated in absolute milliseconds —
// and `psalm` — reciting-tone psalmody in absolute seconds. Pure, seeded, stateless per window.
// No device access, timers or output authority; events use the shared MusicalEvent shape.
const DIVS=['go','po','re','so','pe'],MANUALS=DIVS.slice(0,4);
const CHORD_KEYS=['pat','rate','ms','hold','morph','iris','div','voicing','shadow','sdiv','sms','oct','tr','strum','prob','vel','rot','rubato','detach'];
const RHYTHMICON_KEYS=['base','voices','mode','ms','div','step','arch','accel','prob','to','morph','vector','scales'];
const BIND_KEYS=['degree','note','midinote','scale','octave','mtr','dur','legato','ms','div','tr'];
const MASS_KEYS=['div','low','high','n','ms','period','span','out','stagger','pick','clocks','shift','pulse'],MORPH_KEYS=['a','b','start','length','shift','morph','speed','octave','octaves','harmony','div','split','seed','vel','track','span','rhythm','jitter'],HOQ_KEYS=['pcs','to','div','low','high','ms','wave','dur','double','span'],BANDS_KEYS=['div','low','high','size','len','gap','trem','wave','span','hold','emerge','drift','spread','rall'];
const PSALM_KEYS=['init','tenor','med','fin','verse','breath','step','syll','organum','div','ison','tr','vel'];
const rnd=(...keys)=>{let h=2166136261;for(const k of keys){h=Math.imul(h^(k|0),16777619);h^=h>>>13;}h=Math.imul(h^(h>>>16),2246822507);h^=h>>>13;return(h>>>0)/4294967296;};
const beats=rate=>{const [a,b]=rate.split('/').map(Number);return 4*a/b;};
const fold=(note,[low,high])=>note>high?low+((note-low)%12+12)%12:note<low?high-((high-note)%12+12)%12:note;
// constant | ramp a->b (linear over the section) | juxtaposition a|b|c (indexed, never interpolated)
function value(token,low,high,integer=false,{ramp=true}={}){
 const text=String(token),list=text.includes('|')?text.split('|'):text.split('->'),nums=list.map(Number);
 if(list.some(s=>!s.length)||nums.some(n=>!Number.isFinite(n)||n<low||n>high||(integer&&!Number.isInteger(n))))throw new Error(`Value ${text} outside ${low}–${high}`);
 if(text.includes('|')){if(nums.length>32)throw new Error('At most 32 juxtaposed values');return{jux:nums};}
 if(nums.length===1)return nums[0];
 if(nums.length!==2||!ramp)throw new Error(`Bad value ${text}`);return{from:nums[0],to:nums[1]};
}
const at=(v,phase,index=0)=>typeof v!=='object'?v:v.jux?v.jux[((index%v.jux.length)+v.jux.length)%v.jux.length]:v.from+(v.to-v.from)*Math.min(1,Math.max(0,phase));
function divisions(text){const list=text==='tutti'?[...DIVS]:text==='manuals'?[...MANUALS]:text.split(',');if(!list.length||new Set(list).size!==list.length||list.some(d=>!DIVS.includes(d)))throw new Error('div tutti|manuals|go,po,re,so,pe');return list;}
export function parseLabAlgo(kind,args,{noteNumber,rates}){
 const take=i=>{if(i>=args.length)throw new Error(`${kind}: missing value`);return args[i];};
 if(kind==='chord'){
  // chord ROOT:i,i,i | NOTE,NOTE,NOTE | … pat x..x.x.. rate 1/16 ms 30->100 hold 5|3|7 morph 1 iris 1 div manuals …
  const p={chords:[],pat:[1],rate:'1/16',ms:60,hold:4,morph:0,iris:0,div:'manuals',divs:[...MANUALS],voicing:'split',shadow:0,sdiv:'next',sms:null,oct:0,tr:0,strum:0,prob:1,vel:84,rot:0,rubato:0,detach:null};let i=0;const head=[];
  while(i<args.length&&!CHORD_KEYS.includes(args[i]))head.push(args[i++]);
  for(const spec of head.join(' ').split('|').map(s=>s.trim())){
   if(!spec)throw new Error('chord: empty chord between |');let notes;
   if(/^FM:/i.test(spec)){
    // FM:FUNDAMENTAL:C:M:PAIRS — symbolic frequency modulation (instrumental synthesis): carrier C·f and
    // side bands |C ± k·M|·f for k = 1…PAIRS, rounded to the semitone, kept inside 24–96.
    const [,root,c,m,pairs='4']=spec.split(':'),f=440*2**((noteNumber(String(root||'').trim())-69)/12),C=Number(c),M=Number(m),P=Number(pairs);
    if(!(C>0&&C<=64&&M>0&&M<=64&&Number.isInteger(P)&&P>=1&&P<=6))throw new Error('chord FM:NOTE:C:M:PAIRS (ratios 0–64, pairs 1–6)');
    const set=new Set();for(let k=0;k<=P;k++)for(const ratio of k?[C+k*M,Math.abs(C-k*M)]:[C]){if(ratio<=0)continue;let n=Math.round(69+12*Math.log2(f*ratio/440));while(n<24)n+=12;while(n>96)n-=12;set.add(n);}
    notes=[...set].sort((a,b)=>a-b).slice(0,12);
   }else if(spec.includes(':')){const [root,steps]=spec.split(':');const base=noteNumber(root.trim());notes=steps.split(/[\s,]+/).filter(Boolean).map(s=>{const n=Number(s);if(!Number.isInteger(n)||n<-48||n>60)throw new Error(`chord interval ${s}`);return base+n;});}
   else notes=spec.split(/[\s,]+/).filter(Boolean).map(noteNumber);
   if(!notes.length||notes.length>32||notes.some(n=>n<0||n>127))throw new Error('chord: 1–32 notes per chord');p.chords.push(notes);
  }
  if(!p.chords.length||p.chords.length>16)throw new Error('chord: 1–16 chords separated by |');
  while(i<args.length){
   const key=args[i++],v=take(i++);
   if(key==='pat'){if(!/^[xX.]{1,64}$/.test(v)||!/[xX]/.test(v))throw new Error('chord pat uses x (hit), X (accent) and . (rest), 1–64 steps');p.pat=[...v].map(c=>c==='.'?0:c==='X'?2:1);}
   else if(key==='rate'){if(!rates.includes(v))throw new Error('Unsupported chord rate');p.rate=v;}
   else if(key==='ms')p.ms=value(v,10,60000);
   else if(key==='hold')p.hold=value(v,1,256,true,{ramp:false});
   else if(key==='morph')p.morph=value(v,0,1);
   else if(key==='iris')p.iris=value(v,0,8,true);
   else if(key==='div'){p.div=v;p.divs=divisions(v);}
   else if(key==='voicing'){if(!['split','stack','spread'].includes(v))throw new Error('chord voicing split|stack|spread');p.voicing=v;}
   else if(key==='shadow')p.shadow=value(v,0,2000);
   else if(key==='sdiv'){if(v!=='next'&&!DIVS.includes(v))throw new Error('chord sdiv next|go|po|re|so|pe');p.sdiv=v;}
   else if(key==='sms')p.sms=value(v,10,60000);
   else if(key==='oct')p.oct=value(v,-3,3,true);
   else if(key==='tr')p.tr=value(v,-24,24,true);
   else if(key==='strum')p.strum=value(v,0,500);
   else if(key==='rubato')p.rubato=value(v,0,.45,false,{ramp:false});
   else if(key==='detach')p.detach=value(v,0,2000,false,{ramp:false});
   else if(key==='prob')p.prob=value(v,0,1);
   else if(key==='vel')p.vel=value(v,1,127,true);
   else if(key==='rot'){p.rot=Number(v);if(!Number.isInteger(p.rot)||Math.abs(p.rot)>16)throw new Error('chord rot −16…16');}
   else throw new Error(`Unknown chord parameter ${key}`);
  }
  return{kind,params:p};
 }
 if(kind==='bind'){
  // bind degree 0|2|4 scale 0,2,4,5,7,9,11 octave 5 mtr 0 dur 0.25?0.5 legato 0.8 div go?so
  // The SuperCollider event model (Pbind) in one line. Every value is a pattern:
  //   a|b|c  in order, cyclic (Pseq)     a?b?c  seeded random choice (Prand)     a&b&c  one seeded shuffle, cyclic (Pshuf)
  // Pitch as in SC: degree → scale → + octave·12 (octave 5 = middle C); or `note` (semitones from C4) or `midinote`.
  const pattern=(text,item)=>{const op=text.includes('|')?'|':text.includes('?')?'?':text.includes('&')?'&':'|',items=String(text).split(op).map(item);if(!items.length||items.length>4096)throw new Error('bind: 1–4096 pattern items');return{op,items};};
  const real=(low,high)=>t=>{const n=Number(t);if(t===''||!Number.isFinite(n)||n<low||n>high)throw new Error(`bind value ${t} outside ${low}–${high}`);return n;};
  const p={pitch:'degree',degree:pattern('0',real(-64,64)),scale:[0,2,4,5,7,9,11],octave:pattern('5',real(0,9)),mtr:pattern('0',real(-24,24)),dur:pattern('1',real(.01,64)),legato:pattern('0.8',real(.01,8)),ms:null,div:pattern('go',d=>{if(!DIVS.includes(d))throw new Error('bind div go po re so pe');return d;}),tr:0};
  for(let i=0;i<args.length;){const key=args[i++];if(!BIND_KEYS.includes(key))throw new Error(`Unknown bind parameter ${key}`);const v=take(i++);
   if(['degree','note','midinote'].includes(key)){p.pitch=key;p.degree=pattern(v,real(-128,255));}
   else if(key==='scale'){p.scale=v.split(',').map(Number);if(!p.scale.length||p.scale.length>24||p.scale.some(n=>!Number.isFinite(n)||n<0||n>24))throw new Error('bind scale: semitones 0–24, comma separated');}
   else if(key==='octave')p.octave=pattern(v,real(0,9));else if(key==='mtr')p.mtr=pattern(v,real(-24,24));
   else if(key==='dur')p.dur=pattern(v,real(.01,64));else if(key==='legato')p.legato=pattern(v,real(.01,8));
   else if(key==='ms')p.ms=pattern(v,real(10,60000));
   else if(key==='div')p.div=pattern(v,d=>{if(!DIVS.includes(d))throw new Error('bind div go po re so pe');return d;});
   else if(key==='tr')p.tr=real(-48,48)(v);}
  return{kind,params:p};
 }
 if(kind==='rhythmicon'){
  // rhythmicon NOTE… base 4 voices 8 mode harmonic|sub ms 60 step 0 arch on accel 1->3
  // Voice k (1…N) pulses k times per `base` seconds (harmonic) or once every k·base/N… (sub: base·k).
  // step ≠ 0 turns each pulse train into a scale glissando (the note moves `step` scale degrees per pulse).
  const p={notes:[],base:4,voices:8,mode:'harmonic',ms:80,div:'manuals',divs:[...MANUALS],step:0,arch:false,accel:1,prob:1,to:[],morph:0,vector:false,scales:[]};let i=0;
  while(i<args.length&&!RHYTHMICON_KEYS.includes(args[i]))p.notes.push(noteNumber(args[i++]));
  if(!p.notes.length||p.notes.length>32)throw new Error('rhythmicon: 1–32 notes (one per voice, or a scale when step is used)');
  while(i<args.length){const key=args[i++];
   if(key==='to'){while(i<args.length&&!RHYTHMICON_KEYS.includes(args[i]))p.to.push(noteNumber(args[i++]));if(!p.to.length||p.to.length>32)throw new Error('rhythmicon to: 1–32 target notes');continue;}
   const v=take(i++);
   if(key==='scales'){p.scales=v.split('/').map(scale=>scale.split(',').map(Number));if(p.scales.length<2||p.scales.length>8||p.scales.some(scale=>scale.length<2||scale.length>12||scale.some((n,i)=>!Number.isInteger(n)||n<0||n>11||(i&&n<=scale[i-1]))))throw new Error('rhythmicon scales: 2–8 ascending pitch-class lists separated by /');}
   else if(key==='morph')p.morph=value(v,0,1);
   else if(key==='vector'){if(!['on','off'].includes(v))throw new Error('rhythmicon vector on|off');p.vector=v==='on';}
   else if(key==='base')p.base=value(v,.25,120,false,{ramp:false});
   else if(key==='voices')p.voices=value(v,1,24,true,{ramp:false});
   else if(key==='mode'){if(!['harmonic','sub'].includes(v))throw new Error('rhythmicon mode harmonic|sub');p.mode=v;}
   else if(key==='ms')p.ms=value(v,10,60000);
   else if(key==='div'){p.div=v;p.divs=divisions(v);}
   else if(key==='step'){p.step=Number(v);if(!Number.isInteger(p.step)||Math.abs(p.step)>12)throw new Error('rhythmicon step −12…12');}
   else if(key==='arch'){if(!['on','off'].includes(v))throw new Error('rhythmicon arch on|off');p.arch=v==='on';}
   else if(key==='accel')p.accel=value(v,.1,16);
   else if(key==='prob')p.prob=value(v,0,1);
   else throw new Error(`Unknown rhythmicon parameter ${key}`);}
  if(typeof p.base!=='number'||typeof p.voices!=='number')throw new Error('rhythmicon base and voices must be constant');
  return{kind,params:p};
 }
 if(kind==='mass'||kind==='bands'){
  // mass  div manuals low 36 high 95 n 15~10 ms 70~100 period 240 span 0 240 out 200 250 stagger 60
  //   An exclusive total cluster: every pitch of the band belongs to exactly one manual. Each manual
  //   changes on its own clock (never in unison), one pitch at a time, every ms MIN~MAX; a pitch it
  //   releases is taken by another manual at its next change. A slow cos curve (period seconds)
  //   narrows the voices per manual n MAX~MIN and back, and slows the clock as it narrows.
  //   out FROM TO (absolute seconds): voices fade to zero. Notes may cross section boundaries.
  // bands div pe low 24 high 35 size 2->12 len 1.5->10 gap 6->0 trem 0 | 300~360 wave 5 span 120 240
  //   Irregular bands of adjacent-semitone clusters; size, length and gap ramp over the span.
  //   trem A~B: inside a band the two halves of the cluster alternate every A–B ms (undulating, wave s).
  const mass=kind==='mass',KEYS=mass?MASS_KEYS:BANDS_KEYS;
  const p=mass?{div:'manuals',divs:[...MANUALS],low:36,high:95,n:[15,10],ms:[70,100],period:240,span:null,out:null,stagger:60,pick:'random',clocks:'free',shift:0,pulse:null}:{div:'pe',divs:['pe'],low:24,high:35,size:{from:2,to:12},len:{from:1.5,to:10},gap:{from:6,to:0},trem:null,wave:5,span:null,hold:0,emerge:0,drift:0,spread:0,rall:null};
  const pair=(v,lo,hi,name)=>{const xs=String(v).split('~').map(Number);if(xs.length!==2||xs.some(x=>!Number.isFinite(x)||x<lo||x>hi))throw new Error(`${kind} ${name} A~B within ${lo}–${hi}`);return xs;};
  let i=0;while(i<args.length){const key=args[i++];if(!KEYS.includes(key))throw new Error(`Unknown ${kind} parameter ${key}`);
   if(key==='div'){p.div=take(i++);p.divs=divisions(p.div);continue;}
   if(key==='rall'){const a=Number(take(i++)),b=Number(take(i++));if(!(a>0&&a<=600&&b>=1&&b<=8))throw new Error('bands rall SECONDS FACTOR (last seconds of the span, tremolo stretched up to ×FACTOR and disordered)');p.rall=[a,b];continue;}
   if(key==='span'||key==='out'){const a=Number(take(i++)),b=Number(take(i++));if(!(a>=0&&b>a&&b<=1800))throw new Error(`${kind} ${key} FROM TO (absolute seconds)`);p[key]=[a,b];continue;}
   const v=take(i++);
   if(key==='low'||key==='high')p[key]=noteNumber(v);
   else if(key==='n'){p.n=pair(v,0,24,'n');}
   else if(key==='ms')p.ms=pair(v,20,5000,'ms');
   else if(key==='trem')p.trem=v==='0'?null:pair(v,40,5000,'trem');
   else if(key==='period')p.period=value(v,4,1800,false,{ramp:false});
   else if(key==='stagger')p.stagger=value(v,0,2000,false,{ramp:false});
   else if(key==='shift')p.shift=value(v,0,1800,false,{ramp:false});
   else if(key==='pulse'){const prob=Number(v),rates=String(take(i++)).split('~').map(Number);if(!(prob>=0&&prob<=1)||rates.length!==2||rates.some(r=>!(r>=.5&&r<=20)))throw new Error('mass pulse P MIN~MAX (probability 0–1, pulses per second)');p.pulse={prob,rates};}
   else if(key==='wave')p.wave=value(v,.5,600,false,{ramp:false});
   else if(key==='pick'){if(!['random','inhibit'].includes(v))throw new Error('mass pick random|inhibit');p.pick=v;}
   else if(key==='clocks'){if(!['free','golden'].includes(v))throw new Error('mass clocks free|golden');p.clocks=v;}
   else if(key==='hold'||key==='emerge'||key==='drift')p[key]=value(v,0,1800,false,{ramp:false});
   else if(key==='spread')p.spread=value(v,0,1,false,{ramp:false});
   else if(key==='size')p.size=value(v,1,24,true);
   else if(key==='len')p.len=value(v,.05,600);
   else if(key==='gap')p.gap=value(v,0,600);
  }
  if(!(p.high>p.low))throw new Error(`${kind}: high must be above low`);
  if(mass&&p.divs.length*Math.max(...p.n)>p.high-p.low+1)throw new Error(`mass: ${p.divs.length} manuals × ${Math.max(...p.n)} voices need ${p.divs.length*Math.max(...p.n)} pitches; band ${p.low}–${p.high} has ${p.high-p.low+1}`);
  return{kind,params:p};
 }
 if(kind==='hoquetus'){
  // hoquetus pcs A#,D,F,G,C to A# div tutti low C1 high C7 ms 35~90 wave 9 dur 0.55 double 0.12 span 242 315
  // One note at a time, never twice in a row on the same division, at a random octave of its
  // compass; the step swings between ms MIN and MAX (cos, period `wave` s: accelerando and
  // rallentando); the pitch-class set narrows over the span from `pcs` to the single `to`.
  const p={pcs:[],to:null,div:'tutti',divs:[...DIVS],low:24,high:96,ms:[35,90],wave:9,dur:.55,double:0,span:null};let i=0;
  const pc=t=>{const n=noteNumber(/\d$/.test(t)?t:t+'4');return((n%12)+12)%12;};
  while(i<args.length){const key=args[i++];if(!HOQ_KEYS.includes(key))throw new Error(`Unknown hoquetus parameter ${key}`);
   if(key==='span'){const a=Number(take(i++)),b=Number(take(i++));if(!(a>=0&&b>a&&b<=1800))throw new Error('hoquetus span FROM TO');p.span=[a,b];continue;}
   const v=take(i++);
   if(key==='pcs')p.pcs=v.split(',').map(pc);
   else if(key==='to')p.to=pc(v);
   else if(key==='div'){p.div=v;p.divs=divisions(v);}
   else if(key==='low'||key==='high')p[key]=noteNumber(v);
   else if(key==='ms'){const xs=v.split('~').map(Number);if(xs.length!==2||xs.some(x=>!(x>=15&&x<=2000)))throw new Error('hoquetus ms MIN~MAX (15–2000)');p.ms=xs;}
   else if(key==='wave')p.wave=value(v,.5,600,false,{ramp:false});
   else if(key==='dur')p.dur=value(v,.05,1.5);
   else if(key==='double')p.double=value(v,0,1);
  }
  if(!p.pcs.length)throw new Error('hoquetus needs pcs');if(p.to===null)p.to=p.pcs[0];if(!p.pcs.includes(p.to))p.pcs.push(p.to);
  return{kind,params:p};
 }
 if(kind==='parasite'){
  // parasite apomixis-lyrics at 40 shape 12,19,24,25,31 min 100 delay 60~140 len 1 prob 0.8 div go,po,re,so grace 0 oct 0
  // Chord transfer from a recorded voice, computed offline (tape-profile.js): each voice note of at
  // least `min` ms becomes a chord built on it (`shape` semitones above the sung pitch), late by
  // `delay` ms, lasting voice length × `len`, on the next division of `div` in turn. `grace N` adds N
  // 35 ms upper/lower neighbours just before the chord: the ornament feeds on the voice, never doubles it.
  const name=String(args[0]||'');if(!TAPE_PROFILES[name])throw new Error(`parasite: unknown profile ${name} (${Object.keys(TAPE_PROFILES).join(', ')})`);
  // bands go:0,12,19 po:12,19,24 … : vocoder mode — every voice note sounds on ALL listed divisions at
  //   once (homorhythmic), each division a band of partials above the sung pitch; `spread MS` scatters
  //   the band onsets (heterophony); `ring P F` lets a chord ring F× longer with probability P.
  const p={profile:name,at:0,shape:[12,19,24],min:100,delay:[60,140],len:1,prob:1,div:'manuals',divs:[...MANUALS],grace:0,oct:0,vel:100,bands:null,spread:0,ring:[0,1],legato:0,sustain:false,as:1,ashold:1};
  // legato G: each chord lasts until the next sung note when the gap is ≤ G s (no silences, breaths stay).
  // sustain 1: every chord is held to the end of the section (the voice's acoustic shadow, a growing cluster).
  // as 1|3|5 ashold N: the sung note is heard as partial P of a lower fundamental (P = 1, 3, 5 …), changing
  //   every N notes: the bands are built on that fundamental, so the harmony leaves the voice's own root.
  //   Offsets ≥ 44 (partials 14–16) always stay on the sung note, so their difference tone is the voice.
  const KEYS=['at','shape','min','delay','len','prob','div','grace','oct','vel','bands','spread','ring','legato','sustain','as','ashold'];
  for(let i=1;i<args.length;i+=2){const key=args[i],v=args[i+1];if(!KEYS.includes(key))throw new Error(`Unknown parasite parameter ${key}`);if(v===undefined)throw new Error(`parasite ${key} needs a value`);
   if(key==='at'){p.at=Number(v);if(!(p.at>=0&&p.at<=1800))throw new Error('parasite at 0–1800 s');}
   else if(key==='shape'){p.shape=v.split(',').map(Number);if(!p.shape.length||p.shape.length>8||p.shape.some(x=>!Number.isInteger(x)||x<-24||x>60))throw new Error('parasite shape: 1–8 semitone offsets −24…60');}
   else if(key==='min')p.min=value(v,20,4000,false,{ramp:false});
   else if(key==='delay'){const xs=v.split('~').map(Number);if(xs.length>2||xs.some(x=>!(x>=0&&x<=2000)))throw new Error('parasite delay MS or MIN~MAX (0–2000)');p.delay=xs.length===1?[xs[0],xs[0]]:xs;}
   else if(key==='len')p.len=value(v,.1,8);
   else if(key==='prob')p.prob=value(v,0,1);
   else if(key==='div'){p.div=v;p.divs=divisions(v);}
   else if(key==='grace')p.grace=value(v,0,6,true,{ramp:false});
   else if(key==='oct')p.oct=value(v,-2,2,true);
   else if(key==='vel')p.vel=value(v,1,127,true);
   else if(key==='bands'){p.bands=v.split('/').map(b=>{const [d,list]=b.split(':');if(!DIVS.includes(d)||!list)throw new Error('parasite bands DIV:i,i/DIV:i,i (go po re so pe)');const iv=list.split(',').map(Number);if(iv.some(x=>!Number.isInteger(x)||x<-36||x>60)||iv.length>8)throw new Error('parasite bands: offsets −36…60, up to 8');return[d,iv];});}
   else if(key==='spread')p.spread=value(v,0,200,false,{ramp:false});
   else if(key==='legato')p.legato=value(v,0,10,false,{ramp:false});
   else if(key==='sustain'){if(!['0','1'].includes(v))throw new Error('parasite sustain 0|1');p.sustain=v==='1';}
   else if(key==='as')p.as=value(v,1,16,true);
   else if(key==='ashold')p.ashold=value(v,1,64,true,{ramp:false});
   else if(key==='ring'){const xs=v.split('~').map(Number);if(xs.length!==2||!(xs[0]>=0&&xs[0]<=1)||!(xs[1]>=1&&xs[1]<=20))throw new Error('parasite ring P~FACTOR (0–1, 1–20)');p.ring=xs;}
  }
  return{kind,params:p};
 }
 if(kind==='morph'){
  // morph a messiaen-lebanqueceleste b elgar-005 start 0 length 8 shift 8 morph 0->1 speed 1
  //       octave 0 octaves 1 harmony 0 div po,so,pe split C3 seed 7 vel 80
  // Morphs two MIDI files of the corpus (apps/hylon/public/midi) window by window with the LIBRARY
  // model: each window of `length` s (advancing `shift` s per window) blends A into B by `morph`
  // (ramp over the section). Pitches below `split` go to the pedal (if listed); the manuals share
  // the compass in bands, first listed division lowest.
  const p={a:null,b:null,start:0,length:8,shift:8,morph:0,speed:1,octave:0,octaves:1,harmony:[[0]],div:'manuals',divs:[...MANUALS],split:48,seed:7,vel:null,track:'all',span:null,rhythm:[1],jitter:0};let i=0;
  while(i<args.length){const key=args[i++];if(!MORPH_KEYS.includes(key))throw new Error(`Unknown morph parameter ${key}`);
   if(key==='span'){const a=Number(take(i++)),b=Number(take(i++));if(!(a>=0&&b>a&&b<=1800))throw new Error('morph span FROM TO (absolute seconds)');p.span=[a,b];continue;}
   const v=take(i++);
   if(key==='a'||key==='b'){if(!MIDI_CORPUS[v])throw new Error(`morph: no MIDI ${v} (${Object.keys(MIDI_CORPUS).join(', ')})`);p[key]=v;}
   else if(key==='start')p.start=value(v,0,600,false,{ramp:false});
   else if(key==='length')p.length=value(v,.25,120,false,{ramp:false});
   else if(key==='shift')p.shift=value(v,-120,120,false,{ramp:false});
   else if(key==='morph')p.morph=value(v,0,1);
   else if(key==='speed')p.speed=value(v,.1,8,false,{ramp:false});
   else if(key==='octave')p.octave=value(v,0,1);
   else if(key==='octaves')p.octaves=value(v,1,3,true,{ramp:false});
   else if(key==='harmony'){p.harmony=v.split('|').map(g=>g.split(',').map(Number));if(p.harmony.length>16||p.harmony.some(g=>!g.length||g.length>4||g.some(n=>!Number.isInteger(n)||Math.abs(n)>24)))throw new Error('morph harmony: 1–4 semitone offsets, groups A|B|C change per window');}
   else if(key==='rhythm'){p.rhythm=v.split('|').map(Number);if(!p.rhythm.length||p.rhythm.length>16||p.rhythm.some(x=>!(x>=.1&&x<=8)))throw new Error('morph rhythm: speeds 0.1–8 per window, e.g. 1|0.75|1.5');}
   else if(key==='jitter')p.jitter=value(v,0,500,false,{ramp:false});
   else if(key==='div'){p.div=v;p.divs=divisions(v);}
   else if(key==='split')p.split=noteNumber(v);
   else if(key==='seed')p.seed=value(v,0,1e6,true,{ramp:false});
   else if(key==='vel')p.vel=value(v,1,127,true);
   else if(key==='track')p.track=v;
  }
  if(!p.a)throw new Error('morph needs a FILE');
  return{kind,params:p};
 }
 if(kind==='psalm'){
  // psalm init F3 G3 tenor A3 med Bb3 A3 fin G3 F3 verse 16 breath 2.5 syll 0 organum 0,7 div re ison D2
  const p={init:[],tenor:null,med:[],fin:[],verse:16,breath:2.5,step:.7,syll:0,organum:[0],div:'re',divs:['re'],ison:null,tr:0,vel:70};let i=0;
  while(i<args.length){
   const key=args[i++];if(!PSALM_KEYS.includes(key))throw new Error(`Unknown psalm parameter ${key}`);
   if(['init','med','fin'].includes(key)){while(i<args.length&&!PSALM_KEYS.includes(args[i]))p[key].push(noteNumber(args[i++]));if(p[key].length>8)throw new Error(`psalm ${key}: at most 8 notes`);continue;}
   const v=take(i++);
   if(key==='tenor')p.tenor=noteNumber(v);
   else if(key==='verse')p.verse=value(v,4,120,false,{ramp:false});
   else if(key==='breath')p.breath=value(v,0,20,false,{ramp:false});
   else if(key==='step')p.step=value(v,.1,8,false,{ramp:false});
   else if(key==='syll')p.syll=value(v,0,16);
   else if(key==='organum'){p.organum=v.split(',').map(Number);if(!p.organum.length||p.organum.length>6||p.organum.some(n=>!Number.isInteger(n)||Math.abs(n)>36))throw new Error('psalm organum: 1–6 semitone offsets, e.g. 0,7,-5');}
   else if(key==='div'){p.div=v;p.divs=divisions(v);}
   else if(key==='ison')p.ison=v==='-'?null:noteNumber(v);
   else if(key==='tr')p.tr=value(v,-12,12,true,{ramp:false});
   else if(key==='vel')p.vel=value(v,1,127,true);
  }
  if(p.tenor===null)throw new Error('psalm needs tenor NOTE');
  for(const key of ['verse','breath','step'])if(typeof p[key]!=='number')throw new Error(`psalm ${key} must be constant`);
  if((p.verse-1.5*p.breath)/2-(Math.max(p.init.length+p.med.length,p.fin.length+1))*p.step<p.step)throw new Error('psalm verse too short for its formulas and breath');
  return{kind,params:p};
 }
 throw new Error('Unknown LAB algorithm');
}
const show=v=>typeof v!=='object'?String(v):v.jux?v.jux.join('|'):`${v.from}->${v.to}`;
export function formatLabAlgo({kind,params:p},noteName){
 if(kind==='rhythmicon')return `rhythmicon ${p.notes.map(noteName).join(' ')} base ${p.base} voices ${p.voices} mode ${p.mode} ms ${show(p.ms)} step ${p.step} arch ${p.arch?'on':'off'} accel ${show(p.accel)} div ${p.div}${p.to?.length?` to ${p.to.map(noteName).join(' ')} morph ${show(p.morph)}`:''}${p.vector?' vector on':''}${p.scales?.length?` scales ${p.scales.map(scale=>scale.join(',')).join('/')}`:''}`;
 if(kind==='parasite')return`parasite ${p.profile} at ${p.at} ${p.bands?`bands ${p.bands.map(([d,i])=>d+':'+i.join(',')).join('/')} spread ${p.spread} ring ${p.ring.join('~')} `:''}shape ${p.shape.join(',')} min ${show(p.min)} delay ${p.delay.join('~')} len ${show(p.len)} prob ${show(p.prob)} div ${p.div} grace ${show(p.grace)} oct ${show(p.oct)}`;
 if(kind==='chord')return`chord ${p.chords.map(c=>c.map(noteName).join(',')).join(' | ')} pat ${p.pat.map(s=>'.xX'[s]).join('')} rate ${p.rate} ms ${show(p.ms)} hold ${show(p.hold)} morph ${show(p.morph)} iris ${show(p.iris)} div ${p.div} voicing ${p.voicing} shadow ${show(p.shadow)} sdiv ${p.sdiv} oct ${show(p.oct)} tr ${show(p.tr)} strum ${show(p.strum)} prob ${show(p.prob)} rot ${p.rot}`;
 throw new Error('No formatter');
}
// mass / bands are simulated once over their whole span (deterministic from seed and line index),
// then each section emits the notes whose onset falls in its window. Durations may cross sections.
const SIM=new WeakMap(),CORPUS=new Map();
const corpusFile=name=>{if(!CORPUS.has(name)){const c=MIDI_CORPUS[name];CORPUS.set(name,{duration:c.duration/1000,notes:c.notes.map(([t,d,m,v,ch])=>({time:t/1000,duration:d/1000,midi:m,velocity:v,channel:ch,track:0}))});}return CORPUS.get(name);};
function simulate(algo,index,seed,spanMs){
 const cached=SIM.get(algo.params);if(cached&&cached.key===`${seed}:${index}:${spanMs}`)return cached.notes;
 const p=algo.params,[s0,s1]=spanMs,notes=[];let r=0;const R=()=>rnd(seed,index,++r,41);
 if(algo.kind==='mass'){
  const D=p.divs,P=p.period*1000,narrow=t=>.5-.5*Math.cos(2*Math.PI*(t-s0)/P);
  const fade=t=>p.out?Math.max(0,Math.min(1,1-(t-p.out[0]*1000)/((p.out[1]-p.out[0])*1000))):1;
  const nAt=t=>Math.max(0,Math.round((p.n[0]-(p.n[0]-p.n[1])*narrow(t))*fade(t)));
  const lo=Math.min(...p.ms),hi=Math.max(...p.ms),iAt=t=>lo+(hi-lo)*narrow(t),center=(p.low+p.high)/2;
  const band=t=>{const W=Math.min(p.high-p.low+1,D.length*Math.max(1,nAt(t))),a=Math.max(p.low,Math.min(p.high-W+1,Math.round(center-W/2)));return[a,a+W-1];};
  const owner=new Map(),owned=Object.fromEntries(D.map(d=>[d,new Set()])),freed=[];
  const [a0,b0]=band(s0),pool=[];for(let x=a0;x<=b0;x++)pool.push(x);
  for(let j=pool.length-1;j>0;j--){const k=Math.floor(R()*(j+1));[pool[j],pool[k]]=[pool[k],pool[j]];}
  const n0=nAt(s0);pool.slice(0,n0*D.length).forEach((x,j)=>{const d=D[j%D.length];owner.set(x,{div:d,start:s0+R()*p.stagger});owned[d].add(x);});
  const close=(x,t)=>{const o=owner.get(x);if(o&&t-o.start>=10)notes.push({div:o.div,note:x,start:o.start,dur:t-o.start});owner.delete(x);owned[o.div].delete(x);};
  // golden clocks: phases k·φ (mod 1) of the interval and rates spread ±6 % by the same sequence,
  // so the manuals' changes never fall together by construction (three-distance theorem).
  const PHI=(Math.sqrt(5)-1)/2,golden=k=>(k*PHI)%1;
  const next=Object.fromEntries(D.map((d,k)=>[d,s0+p.stagger+(p.clocks==='golden'?golden(k+1):R())*iAt(s0)]));
  const rate=Object.fromEntries(D.map((d,k)=>[d,p.clocks==='golden'?1+(golden(k+1)-.5)*.12:1]));
  for(let guard=0;guard<400000;guard++){
   let d=D[0];for(const k of D)if(next[k]<next[d])d=k;const t=next[d];if(t>=s1)break;
   const target=nAt(t),[ba,bb]=band(t),set=owned[d],pick=()=>t>=p.shift*1000?p.pick:'random';
   // Inhibition (phyllotaxis): a pitch is pressed by the manual's own pitches, 1 / (1 + d²) each.
   const press=(x,skip)=>{let f=0;for(const y of set)if(y!==skip)f+=1/(1+(x-y)*(x-y));return f;};
   const release=()=>{if(!set.size)return null;const list=[...set],outside=list.filter(x=>x<ba||x>bb);let x;
    if(outside.length)x=outside.sort((u,v)=>Math.abs(v-center)-Math.abs(u-center))[0];
    else if(pick()==='inhibit')x=list.reduce((best,y)=>press(y,y)>press(best,best)?y:best,list[0]);
    else x=list[Math.floor(R()*list.length)];
    close(x,t);freed.push({x,by:d,at:t});return x;};
   const gain=mine=>{while(freed.length&&t-freed[0].at>2000)freed.shift();
    let x=null;const usable=f=>f.by!==d&&f.x!==mine&&!owner.has(f.x)&&f.x>=ba&&f.x<=bb;
    if(pick()==='inhibit'){let best=-1,bestPress=Infinity;freed.forEach((f,j)=>{if(!usable(f))return;const v=press(f.x)-j*1e-6;if(v<bestPress){bestPress=v;best=j;}});if(best>=0){x=freed[best].x;freed.splice(best,1);}}
    else for(let j=freed.length-1;j>=0;j--){if(usable(freed[j])){x=freed[j].x;freed.splice(j,1);break;}}
    if(x===null){const open=[];for(let y=ba;y<=bb;y++)if(!owner.has(y)&&y!==mine)open.push(y);
     if(open.length)x=pick()==='inhibit'?open.reduce((b,y)=>press(y)<press(b)?y:b,open[Math.floor(R()*open.length)]):open[Math.floor(R()*open.length)];}
    if(x===null)return;owner.set(x,{div:d,start:t});set.add(x);};
   if(set.size>target)release();else if(set.size<target)gain(null);else{const x=release();gain(x);}
   // Never in unison: keep every manual's next change at least 7 ms away from the others'.
   const gold=p.clocks==='golden'&&t>=p.shift*1000;
   let n=t+Math.max(lo,Math.min(hi,iAt(t)*(gold?rate[d]:1)*(gold?.97+.06*R():.92+.16*R())));for(let tries=0;tries<8&&D.some(k=>k!==d&&Math.abs(next[k]-n)<7);tries++)n+=7;next[d]=n;
  }
  for(const x of [...owner.keys()])close(x,s1);
  // pulse: the ownership timeline is unchanged; a share of the held keys sounds as repeated pulses
  // (rate per key between MIN and MAX per second, half the period long) instead of one held note.
  if(p.pulse){const held=notes.splice(0);for(const n of held){const h=rnd(seed,index,Math.round(n.start),n.note,83);if(h>=p.pulse.prob){notes.push(n);continue;}
    const [a,b]=p.pulse.rates,rate=a+(b-a)*rnd(seed,index,Math.round(n.start),n.note,89),period=1000/rate,end=n.start+n.dur;
    for(let u=n.start;u<end-5;u+=period)notes.push({div:n.div,note:n.note,start:u,dur:Math.max(10,Math.min(period*.5,end-u))});}}
 } else {
  let t=s0;
  for(let guard=0;t<s1&&guard<20000;guard++){
   const ph=(t-s0)/Math.max(1,s1-s0),len=at(p.len,ph)*1000*(.6+.8*R()),gap=at(p.gap,ph)*1000*(.4+1.2*R());
   const width=p.high-p.low+1,size=Math.max(1,Math.min(width,Math.round(at(p.size,ph)+(R()-.5)))),first=p.low+Math.floor(R()*(width-size+1)),end=Math.min(s1,t+Math.max(50,len));
   const cluster=Array.from({length:size},(_,k)=>first+k);
   if(!p.trem)for(const x of cluster)notes.push({div:p.divs[0],note:x,start:t,dur:end-t});
   else{
    // Tremolo: the two halves of the cluster (alternate semitones) take turns every T (A–B ms,
    // undulating over `wave` s). hold: the whole cluster is first held; emerge: then each key leaves
    // the held chord one by one (seeded order) and joins the tremolo. drift/spread: a pendulum
    // (sin², period drift s) shifts key k by up to spread·T·k/K, so the halves smear into a rolling
    // wave and gather again into blocks.
    const [A,B]=p.trem,K=cluster.length,J0=t+p.hold*1000,rank=cluster.map((_,k)=>k);
    for(let j=K-1;j>0;j--){const q=Math.floor(R()*(j+1));[rank[j],rank[q]]=[rank[q],rank[j]];}
    const join=cluster.map((_,k)=>J0+(K>1?p.emerge*1000*rank[k]/(K-1):0));
    cluster.forEach((x,k)=>{if(join[k]>t)notes.push({div:p.divs[0],note:x,start:t,dur:Math.min(end,join[k])-t});});
    let u=J0;
    for(let w=0;u<end&&w<100000;w++){
     // rall: over the last seconds of the span the step stretches (ease-in) up to ×FACTOR and every
     // key is displaced by a growing random amount: the event lengthens and comes apart.
     const rr=p.rall?Math.max(0,Math.min(1,(u-(s1-p.rall[0]*1000))/(p.rall[0]*1000))):0;
     const T=((A+B)/2+(B-A)/2*Math.sin(2*Math.PI*(u-s0)/(p.wave*1000)))*(1+(p.rall?p.rall[1]-1:0)*rr*rr),sway=p.drift>0?Math.sin(Math.PI*(u-J0)/(p.drift*1000))**2:0;
     cluster.forEach((x,k)=>{if(k%2!==w%2)return;const on=u+p.spread*T*(K>1?k/(K-1):0)*sway+(rr>0?(R()-.5)*T*.8*rr:0);if(on<join[k]||on>=end)return;notes.push({div:p.divs[(k%2)%p.divs.length],note:x,start:on,dur:Math.min(T*.92,end-on)});});
     u+=T;}
   }
   t=end+gap;
  }
 }
 notes.sort((a,b)=>a.start-b.start||a.note-b.note);
 SIM.set(algo.params,{key:`${seed}:${index}:${spanMs}`,notes});return notes;
}
export function generateLab(algo,index,section,fromMs,toMs,{seed=0,voiceOf=()=>undefined,rangeOf=()=>[24,84],scoreEndMs=1800000,vector=null}={}){
 const events=[],p=algo.params,start=section.start*1000,end=Math.min((section.start+section.dur)*1000,scoreEndMs),from=Math.max(fromMs,start),to=Math.min(toMs,end);
 if(to<=from)return events;
 const phaseAt=ms=>(ms-start)/Math.max(1,end-start);
 const push=(id,time,division,note,velocity,duration,articulation)=>{if(time>=end||duration<10)return;events.push({eventId:`algo:${section.id}:${index}:${id}`,sourceId:`algo:${algo.kind}`,atSessionMs:time,division,kind:'note',payload:{voice:voiceOf(division),note:fold(note,rangeOf(division)),velocity:Math.max(1,Math.min(127,Math.round(velocity))),durationMs:Math.min(600000,Math.min(duration,end-time)),sceneId:section.id,articulation}});};
 if(algo.kind==='hoquetus'){
  const s0=p.span?p.span[0]*1000:start,s1=p.span?p.span[1]*1000:end,lo=Math.min(...p.ms),hi=Math.max(...p.ms),others=p.pcs.filter(x=>x!==p.to);
  let t=s0,last=null;
  for(let k=0;t<Math.min(to,s1)&&k<200000;k++){
   const ph=(t-s0)/Math.max(1,s1-s0),step=lo+(hi-lo)*(.5+.5*Math.cos(2*Math.PI*(t-s0)/(p.wave*1000)));
   const emit=t>=from&&t>=start;
   {
    // narrowing: keep ⌊N·(1 − (ph/0.85)²)⌋ of the other pitch classes (fixed order); the last 15 % of
    // the span is the single `to`
    const keep=Math.floor(others.length*Math.max(0,1-(ph/.85)**2)),allowed=[p.to,...others.slice(0,keep)];
    const count=1+(rnd(seed,index,k,3,67)<at(p.double,ph,k)?1:0);
    for(let c=0;c<count;c++){
     let division=p.divs[Math.floor(rnd(seed,index,k,c,71)*p.divs.length)];if(division===last&&p.divs.length>1)division=p.divs[(p.divs.indexOf(division)+1)%p.divs.length];
     const [rlo,rhi]=rangeOf(division),a=Math.max(p.low,rlo),b=Math.min(p.high,rhi),cls=allowed[Math.floor(rnd(seed,index,k,c,73)*allowed.length)],octs=[];
     for(let n=a;n<=b;n++)if(((n%12)+12)%12===cls)octs.push(n);if(!octs.length)continue;
     const note=octs[Math.floor(rnd(seed,index,k,c,79)*octs.length)];last=division;
     if(emit)events.push({eventId:`algo:hoquetus:${index}:${k}:${c}`,sourceId:'algo:hoquetus',atSessionMs:t,division,kind:'note',payload:{voice:voiceOf(division),note,velocity:100,durationMs:Math.max(15,step*at(p.dur,ph,k)),sceneId:section.id,articulation:'hocket'}});
    }
   }
   t+=step;
  }
  return events;
 }
 if(algo.kind==='parasite'){
  const notes=TAPE_PROFILES[p.profile],base=p.at*1000;
  notes.forEach(([t,d,midi],k)=>{
   if(d*1000<p.min)return;const onset=base+t*1000,phase=phaseAt(onset);
   if(onset+p.delay[1]<from-2000||onset>=to)return;
   if(rnd(seed,index,k,3)>=at(p.prob,phase,k))return;
   const lag=p.delay[0]+(p.delay[1]-p.delay[0])*rnd(seed,index,k,5),time=onset+lag;if(time<from||time>=to)return;
   const PART=[0,0,12,19,24,28,31,34,36,38,40,41,43,44,46,47,48],partial=typeof p.as==='object'&&p.as.jux?p.as.jux[Math.floor(k/p.ashold)%p.as.jux.length]:at(p.as,phase,k);
   const next=notes[k+1],gap=next?next[0]-t-d:Infinity,legatoDur=p.legato&&gap<=p.legato?(next[0]-t)*1000:0;
   const root=midi-PART[partial]+12*at(p.oct,phase,k),rings=rnd(seed,index,k,9)<p.ring[0],dur=p.sustain?end-time:Math.max(40,Math.max(d*1000*at(p.len,phase,k),legatoDur)*(rings?p.ring[1]:1)),vel=at(p.vel,phase,k);
   if(p.bands){p.bands.forEach(([division,iv],b)=>{const t=time+p.spread*rnd(seed,index,k,b,13);if(t<from||t>=to)return;for(const step of iv)push(`p${k}b${b}s${step}`,t,division,(step>=44?midi:root)+step,vel,dur,'parasite');});return;}
   const division=p.divs[k%p.divs.length];
   for(const step of p.shape)push(`p${k}s${step}`,time,division,root+step,vel,dur,'parasite');
   const top=root+Math.max(...p.shape);for(let g=0;g<p.grace;g++){const gt=time-(p.grace-g)*45;if(gt>=from)push(`p${k}g${g}`,gt,division,top+(g%2?-1:1),vel,35,'staccatissimo');}
  });
  return events;
 }
 if(algo.kind==='morph'){
  // span: windows and the morph ramp follow an absolute span across sections (no restart per section).
  // Never literal: per window a seeded choice of harmony group (e.g. 0,7 | 0,10 | 0,4) and of speed
  // (rhythm), random octave displacement (octave), and an onset jitter.
  const s0=p.span?p.span[0]*1000:start,s1=p.span?p.span[1]*1000:end,A=corpusFile(p.a),B=p.b?corpusFile(p.b):null,manuals=p.divs.filter(d=>d!=='pe');
  const pick=(list,k,salt)=>list.length===1?list[0]:list[Math.floor(rnd(seed,index,k,salt,59)*list.length)];
  let t0=s0;
  for(let k=0;t0<Math.min(to,s1)&&k<4000;k++){
   const speed=p.speed*pick(p.rhythm,k,1),window=p.length/speed*1000;if(t0+window<=from){t0+=window;continue;}
   const phase=Math.max(0,Math.min(1,(t0-s0)/Math.max(1,s1-s0))),morph=at(p.morph,phase,k),octave=at(p.octave,phase,k);
   let win;try{win=processMidiWindow(A,B,{length:p.length,start:p.start,shift:p.shift,trackA:p.track,trackB:p.track,transition:0,morph,morphEnd:morph,octave,octaveEnd:octave,octaves:p.octaves,speed,harmony:pick(p.harmony,k,2),manual:'1',fold:true,seed:p.seed},k,k);}catch{t0+=window;continue;}
   for(const n of win.notes){
    const time=t0+n.time*1000+(p.jitter?(rnd(seed,index,k,n.midi,Math.round(n.time*1000),61)-.5)*2*p.jitter:0);if(time<from||time>=to||time>=s1||time<s0)continue;
    let division;if(n.midi<p.split&&p.divs.includes('pe'))division='pe';else if(manuals.length){const band=Math.max(0,Math.min(manuals.length-1,Math.floor((n.midi-36)/(61/manuals.length))));division=manuals[band];}else division=p.divs[0];
    const vel=p.vel===null?n.velocity:at(p.vel,phase,k);
    if(p.span)events.push({eventId:`algo:morph:${index}:m${k}:${n.id}`,sourceId:'algo:morph',atSessionMs:time,division,kind:'note',payload:{voice:voiceOf(division),note:fold(n.midi,rangeOf(division)),velocity:Math.max(1,Math.min(127,Math.round(vel))),durationMs:Math.max(10,Math.min(600000,n.duration*1000,s1-time,scoreEndMs-time)),sceneId:section.id,articulation:'morph'}});
    else push(`m${k}:${n.id}`,time,division,n.midi,vel,n.duration*1000,'morph');
   }
   t0+=window;
  }
  return events;
 }
 if(algo.kind==='mass'||algo.kind==='bands'){
  const span=p.span?[p.span[0]*1000,p.span[1]*1000]:[start,end],list=simulate(algo,index,seed,span);
  list.forEach((n,k)=>{if(n.start<from||n.start>=to)return;events.push({eventId:`algo:${algo.kind}:${index}:${k}`,sourceId:`algo:${algo.kind}`,atSessionMs:n.start,division:n.div,kind:'note',payload:{voice:voiceOf(n.div),note:n.note,velocity:100,durationMs:Math.max(10,Math.min(600000,n.dur,scoreEndMs-n.start)),sceneId:section.id,articulation:algo.kind==='mass'?'held':'band'}});});
  return events;
 }
 if(algo.kind==='chord'){
  const tick=beats(p.rate)*60000/section.bpm,L=p.pat.length,perCycle=p.pat.filter(Boolean).length,D=p.divs;
  const holds=typeof p.hold==='object'?p.hold.jux:[p.hold],holdTotal=holds.reduce((a,b)=>a+b,0);
  const first=Math.ceil((from-start)/tick-1e-9),last=Math.ceil((to-start)/tick-1e-9);
  for(let t=first;t<last;t++){
   const cycle=Math.floor(t/L),pos=t-cycle*L,step=(((pos+p.rot*cycle)%L)+L)%L,kind=p.pat[step];if(!kind)continue;
   let before=0;for(let j=0;j<pos;j++)if(p.pat[(((j+p.rot*cycle)%L)+L)%L])before++;
   // rubato: a smooth, seeded-free swing of the grid (two slow sines), up to rubato × tick.
   const swing=k=>p.rubato?p.rubato*tick*(.6*Math.sin(2*Math.PI*k/7.3)+.4*Math.sin(2*Math.PI*k/3.1+1)):0;
   const hit=cycle*perCycle+before,ms=start+t*tick+swing(t),phase=phaseAt(ms);
   if(rnd(seed,index,t,7)>=at(p.prob,phase,hit))continue;
   let slot=Math.floor(hit/holdTotal)*holds.length,rest=hit%holdTotal,h=0;while(rest>=holds[h]){rest-=holds[h];h++;slot++;}
   const chord=p.chords[slot%p.chords.length],next=p.chords[(slot+1)%p.chords.length],K=Math.max(chord.length,next.length),q=rest/holds[h],m=at(p.morph,phase,slot);
   const shift=12*at(p.oct,phase,hit)+at(p.tr,phase,slot),iris=at(p.iris,phase,slot),dur=p.detach!==null?Math.max(10,tick+swing(t+1)-swing(t)-p.detach):at(p.ms,phase,hit),strum=at(p.strum,phase,hit),vel=at(p.vel,phase,hit)+(kind===2?20:0),shadow=at(p.shadow,phase,hit),sms=p.sms===null?dur:at(p.sms,phase,hit);
   // Rank the current pitches so a growing set keeps wide spacing inside each manual.
   const noteAt=k=>{const order=Math.floor(rnd(seed,index,slot,k,11)*K),migrated=m>0&&q>=1-m+m*(order+1)/(K+1);return(migrated?next:chord)[k];};
   const ranks=p.voicing==='spread'?new Map([...new Set(Array.from({length:K},(_,k)=>noteAt(k)).filter(Number.isFinite))].sort((a,b)=>a-b).map((note,rank)=>[note,rank])):null;
   for(let k=0;k<K;k++){
    const note=noteAt(k);if(note===undefined)continue;
    const targets=p.voicing==='stack'?D:[D[((ranks?.get(note)??k)+iris*hit)%D.length]];
    targets.forEach((division,d)=>{
     const onset=ms+k*strum;push(`h${t}k${k}${division}`,onset,division,note+shift,vel,dur,'staccatissimo');
     if(shadow>0){const dark=p.sdiv==='next'?D.length>1?D[(D.indexOf(division)+1)%D.length]:(division==='so'?'re':'so'):p.sdiv;push(`h${t}k${k}${division}s`,onset+shadow,dark,note+shift,vel*.6,sms,'shadow');}
    });
   }
  }
  return events;
 }
 if(algo.kind==='bind'){
  const beat=60000/section.bpm,order=new Map();
  const pick=(pat,n,salt)=>{const L=pat.items.length;if(pat.op==='?')return pat.items[Math.floor(rnd(seed,index,n,salt,23)*L)];if(pat.op==='&'){let o=order.get(pat);if(!o){o=pat.items.map((_,i)=>i);for(let j=L-1;j>0;j--){const r=Math.floor(rnd(seed,index,j,salt,29)*(j+1));[o[j],o[r]]=[o[r],o[j]];}order.set(pat,o);}return pat.items[o[n%L]];}return pat.items[n%L];};
  let t=start;
  for(let n=0;t<to&&t<end&&n<200000;n++){
   const dur=pick(p.dur,n,1)*beat;
   if(t>=from){
    const raw=pick(p.degree,n,2),division=pick(p.div,n,3);let midi;
    if(p.pitch==='midinote')midi=Math.round(raw);else if(p.pitch==='note')midi=60+Math.round(raw);
    else{const d=Math.round(raw+pick(p.mtr,n,4)),size=p.scale.length;midi=Math.round(p.scale[((d%size)+size)%size]+12*Math.floor(d/size)+12*pick(p.octave,n,5));}
    push(`b${n}`,t,division,midi+p.tr,84,p.ms?pick(p.ms,n,6):dur*pick(p.legato,n,7),'pattern');
   }
   t+=dur;
  }
  return events;
 }
 if(algo.kind==='rhythmicon'){
  // Local time is warped by `accel` (global tempo competing with the voice tempi) and, with arch,
  // mirrored at the midpoint so the second half runs backwards (and a glissando returns).
  const live=p.vector?{mu:1,disp:1,poly:1,tuber:1,cap:1,...vector}:{mu:1,disp:1,poly:1,tuber:1,cap:1};
  const total=end-start,N=Math.max(0,Math.min(24,Math.round(p.voices*live.cap))),span=p.base*1000,a0=typeof p.accel==='object'&&!p.accel.jux?p.accel.from:at(p.accel,0),a1=typeof p.accel==='object'&&!p.accel.jux?p.accel.to:a0;
  // warped(x) = ∫ rate dx with rate linear a0→a1 over the section (or half of it when arched)
  const reach=p.arch?total/2:total,warp=x=>{const u=Math.min(x,reach);return a0*u+(a1-a0)*u*u/(2*reach);},W=warp(reach);
  const unwarp=w=>{if(Math.abs(a1-a0)<1e-9)return w/a0;const A=(a1-a0)/(2*reach);return(-a0+Math.sqrt(a0*a0+4*A*w))/(2*A);};
  for(let k=1;k<=N;k++){
   const period=p.mode==='harmonic'?span/k:span*k,count=Math.floor(W/period)+1,division=p.divs[(k-1)%p.divs.length];
   for(let n=0;n<count;n++){
    const x=unwarp(n*period);if(!(x<=reach))continue;
    for(const mirror of p.arch?[false,true]:[false]){
     const shift=(live.disp-1)*30*rnd(seed,index,k,47),time=Math.max(start,start+(mirror?total-x:x)+shift);if(mirror&&Math.abs(total-2*x)<1)continue;if(time<from||time>=to)continue;
     if(rnd(seed,index,k,n,mirror?1:0,5)>=at(p.prob,phaseAt(time),n))continue;
     // Adjacent modal fields blend by seeded event choice, preserving every pulse clock.
     let scaleNotes=p.notes;
     if(p.scales?.length){
      const pos=phaseAt(time)*(p.scales.length-1),lo=Math.min(p.scales.length-1,Math.floor(pos)),hi=Math.min(p.scales.length-1,lo+1),pcs=p.scales[rnd(seed,index,k,n,mirror?101:103)<pos-lo?hi:lo];
      const low=Math.min(...p.notes),high=Math.max(...p.notes);scaleNotes=[];
      for(let midi=high;midi>=low;midi--)if(pcs.includes(((midi%12)+12)%12))scaleNotes.push(midi);
      if(p.notes[0]<p.notes.at(-1))scaleNotes.reverse();
      if(!scaleNotes.length)scaleNotes=p.notes;
     }
     const size=scaleNotes.length,degree=(mirror?-1:1)*n*p.step,sourceNote=p.step?scaleNotes[((degree%size)+size)%size]+12*Math.floor(degree/size):scaleNotes[(k-1)%size];
     const target=p.to?.length?p.to[(k-1)%p.to.length]:sourceNote,morph=p.to?.length?at(p.morph,phaseAt(time),n):0;let note=Math.round(sourceNote+(target-sourceNote)*morph);
     if(live.mu>1&&rnd(seed,index,k,n,81)<.08*(live.mu-1))note+=rnd(seed,index,k,n,83)<.5?-1:1;
     const gate=Math.max(10,Math.min(60000,at(p.ms,phaseAt(time),n)*Math.max(.2,Math.min(3,live.tuber)))),id=`r${k}n${n}${mirror?'m':''}`;
     push(id,time,division,note,84,gate,'pulse');
     if(live.poly>1&&rnd(seed,index,k,n,89)<Math.min(.2,.1*(live.poly-1))){const offset=12+18*rnd(seed,index,k,n,97);push(id+':bud',time+offset,division,note+12,62,Math.max(10,gate*.6),'satellite');}
    }
   }
  }
  return events;
 }
 // psalm: [init → tenor → mediant] caesura [tenor → final] breath, one verse every p.verse seconds.
 const V=p.verse*1000,B=p.breath*1000,S=p.step*1000,half=(V-1.5*B)/2;
 for(let verse=Math.max(0,Math.floor((from-start)/V));start+verse*V<to;verse++){
  const t0=start+verse*V,tr=p.tr+0,phase=phaseAt(t0),vel=at(p.vel,phase,verse),syll=at(p.syll,phase,verse),line=[];let t=t0;
  const add=(note,dur,role)=>{line.push({note,time:t,dur,role});t+=dur;};
  const recite=(dur,part)=>{if(syll<=0){add(p.tenor,dur,'tenor');return;}const stop=t+dur;let i=0;while(t<stop-60){const d=Math.min(stop-t,1000/syll*(.7+.6*rnd(seed,index,verse,part,i++,3)));add(p.tenor,d,'syllable');}};
  p.init.forEach(n=>add(n,S,'init'));recite(half-(p.init.length+p.med.length)*S,1);p.med.forEach(n=>add(n,S,'med'));
  if(p.ison!==null&&t0>=from&&t0<to)push(`v${verse}:isonA`,t0,'pe',p.ison+tr,vel,half,'held');
  t+=B/2;const t1=t;
  recite(half-(p.fin.length+1)*S,2);p.fin.forEach((n,i)=>add(n,i===p.fin.length-1?2*S:S,'fin'));if(!p.fin.length)add(p.tenor,S,'fin');
  if(p.ison!==null&&t1>=from&&t1<to)push(`v${verse}:isonB`,t1,'pe',p.ison+tr,vel,half,'held');
  line.forEach((e,i)=>{if(e.time<from||e.time>=to)return;p.organum.forEach((offset,j)=>{const division=p.divs[j%p.divs.length];push(`v${verse}:n${i}:o${j}`,e.time,division,e.note+offset+tr,vel,e.dur*(e.role==='syllable'?.8:.98),e.role==='syllable'?'parlando':'cantabile');});});
 }
 return events;
}
