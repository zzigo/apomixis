// MEIOSIS: singing line / shadow parent / microscopic hocket / tonal subtraction.
// Pure score algorithms. No device access, timers, mutable RNG or output authority.
const DIVS=['go','po','re','so','pe'];
const MELODY_KEYS=['dur','anti','rate','pulse','div','shadow','cross','drift','hocket','rest','gate','legato','breath','vel','tr'];
const CLUSTER_KEYS=['keep','pcs','origin','holes-from','holes-to','until','div','vel'];
const valueAt=(value,phase)=>typeof value==='number'?value:value.from+(value.to-value.from)*Math.max(0,Math.min(1,phase));
function numeric(token,low,high,integer=false){
  const values=String(token).split('->').map(Number);
  if(values.length>2||String(token).split('->').some(s=>!s.length)||values.some(n=>!Number.isFinite(n)||n<low||n>high||(integer&&!Number.isInteger(n))))throw new Error(`MEIOSIS value ${token} outside ${low}–${high}`);
  return values.length===1?values[0]:{from:values[0],to:values[1]};
}
function scalar(token,low,high,integer=false){const result=numeric(token,low,high,integer);if(typeof result!=='number')throw new Error('Expected a constant');return result;}
const random=(...keys)=>{let h=2166136261;for(const key of keys){h=Math.imul(h^(key|0),16777619);h^=h>>>13;}return(h>>>0)/4294967296;};
const beats=rate=>{const [a,b]=rate.split('/').map(Number);return 4*a/b;};
const fold=(note,[low,high])=>note>high?low+((note-low)%12+12)%12:note<low?high-((high-note)%12+12)%12:note;
export function parseMeiosisAlgo(kind,args,{noteNumber,rates,pitchClass}){
  const take=index=>{if(index>=args.length)throw new Error(`${kind}: missing value`);return args[index];};
  if(kind==='melody'){
    const p={notes:[],durs:[],anti:[],rate:'1/4',pulse:'1/64',divs:['re'],shadow:0,cross:0,drift:0,hocket:0,rest:.65,gate:.12,legato:1.02,breath:2,vel:76,tr:0};let i=0;
    while(i<args.length&&!MELODY_KEYS.includes(args[i]))p.notes.push(noteNumber(args[i++]));
    if(p.notes.length<2||p.notes.length>32)throw new Error('melody needs 2–32 notes');
    while(i<args.length){
      const key=args[i++];
      if(key==='dur'||key==='anti'){
        const list=[];while(i<args.length&&!MELODY_KEYS.includes(args[i]))list.push(key==='dur'?scalar(args[i++],.05,16):noteNumber(args[i++]));
        if(!list.length)throw new Error(`melody ${key} needs values`);p[key==='dur'?'durs':'anti']=list;continue;
      }
      const value=take(i++);
      if(key==='rate'||key==='pulse'){if(!rates.includes(value))throw new Error('Unsupported melody rate');p[key]=value;}
      else if(key==='div'){p.divs=value==='manuals'?DIVS.slice(0,4):value.split(',');if(!p.divs.length||p.divs.length>5||new Set(p.divs).size!==p.divs.length||p.divs.some(d=>!DIVS.includes(d)))throw new Error('Invalid melody divisions');}
      else if(['shadow','cross','hocket'].includes(key))p[key]=numeric(value,0,1);
      else if(key==='drift')p.drift=numeric(value,0,7,true);
      else if(key==='rest')p.rest=numeric(value,0,.95);
      else if(key==='gate')p.gate=numeric(value,.02,.8);
      else if(key==='legato')p.legato=numeric(value,.1,1.15);
      else if(key==='breath')p.breath=scalar(value,0,16);
      else if(key==='vel')p.vel=numeric(value,1,127,true);
      else if(key==='tr')p.tr=scalar(value,-24,24,true);
      else throw new Error(`Unknown melody parameter ${key}`);
    }
    if(!p.durs.length)p.durs=p.notes.map(()=>1);
    if(p.durs.length!==p.notes.length||(p.anti.length&&p.anti.length!==p.notes.length))throw new Error('melody dur and anti lists must match the note count');
    return{kind,params:p};
  }
  if(kind==='cluster'){
    const low=noteNumber(take(0)),high=noteNumber(take(1));
    if(high<low||high-low>36)throw new Error('cluster range must span 0–36 semitones');
    const p={low,high,keep:[],pcs:[0,2,4,5,7,9,10],origin:null,holesFrom:null,holesTo:null,until:null,div:'re',vel:64};let i=2;
    while(i<args.length){
      const key=args[i++];
      if(key==='keep'){while(i<args.length&&!CLUSTER_KEYS.includes(args[i]))p.keep.push(noteNumber(args[i++]));continue;}
      const value=take(i++);
      if(key==='pcs')p.pcs=value.split(',').map(pitchClass);
      else if(['origin','holes-from','holes-to','until'].includes(key))p[{'holes-from':'holesFrom','holes-to':'holesTo'}[key]||key]=scalar(value,0,1800);
      else if(key==='div'){if(!DIVS.includes(value))throw new Error('cluster div must be one division');p.div=value;}
      else if(key==='vel')p.vel=scalar(value,1,127,true);
      else throw new Error(`Unknown cluster parameter ${key}`);
    }
    if(!p.keep.length||new Set(p.keep).size!==p.keep.length||p.keep.some(n=>n<low||n>high))throw new Error('cluster keep needs unique notes inside the cluster');
    if(![p.origin,p.holesFrom,p.holesTo,p.until].every(Number.isFinite)||!(p.origin<p.holesFrom&&p.holesFrom<p.holesTo&&p.holesTo<p.until))throw new Error('cluster needs origin < holes-from < holes-to < until');
    return{kind,params:p};
  }
  throw new Error('Unknown MEIOSIS algorithm');
}
export function generateMeiosis(algo,index,section,fromMs,toMs,{seed=0,voiceOf=()=>undefined,rangeOf=()=>[24,84],entryMs=null,scoreEndMs=1800000}={}){
  const events=[],p=algo.params,start=section.start*1000,end=Math.min((section.start+section.dur)*1000,scoreEndMs),from=Math.max(fromMs,start),to=Math.min(toMs,end);
  if(to<=from)return events;
  const push=(id,time,division,note,velocity,duration,articulation)=>{
    if(time<from||time>=to||duration<10)return;
    events.push({eventId:`algo:${section.id}:${index}:${id}`,sourceId:`algo:${algo.kind}`,atSessionMs:time,division,kind:'note',payload:{voice:voiceOf(division),note,velocity:Math.max(1,Math.min(127,Math.round(velocity))),durationMs:Math.min(600000,duration),sceneId:section.id,articulation}});
  };
  if(algo.kind==='cluster'){
    const origin=p.origin*1000,until=Math.min(p.until*1000,scoreEndMs);let onset=null;
    if(origin>=from&&origin<to)onset=origin;
    else if(entryMs!==null&&entryMs>=from&&entryMs<to&&entryMs>=origin&&entryMs<until)onset=entryMs;
    if(onset===null)return events;
    const keep=new Set(p.keep),notes=Array.from({length:p.high-p.low+1},(_,i)=>p.low+i),center=p.keep.reduce((a,b)=>a+b,0)/p.keep.length;
    // Remove chromatic outsiders first, then extra diatonic/octave material.
    const discard=notes.filter(n=>!keep.has(n)).sort((a,b)=>Number(p.pcs.includes(a%12))-Number(p.pcs.includes(b%12))||Math.abs(b-center)-Math.abs(a-center)||a-b);
    const releaseAt=new Map(discard.map((note,i)=>[note,(p.holesFrom+(p.holesTo-p.holesFrom)*(i+1)/Math.max(1,discard.length))*1000]));
    const [low,high]=rangeOf(p.div);
    for(const note of notes){const off=keep.has(note)?until:Math.min(until,releaseAt.get(note));if(note<low||note>high||off<=onset)continue;push(`cluster:${note}:${onset}`,onset,p.div,note,p.vel,off-onset,'held');}
    return events;
  }
  const beatMs=60000/section.bpm,unit=beats(p.rate)*beatMs,pulse=Math.max(1,beats(p.pulse)*beatMs),length=p.durs.reduce((a,b)=>a+b,0),cycleMs=(length+p.breath)*unit;
  const first=Math.max(0,Math.floor((from-start)/cycleMs)),last=Math.floor((to-start)/cycleMs);
  for(let cycle=first;cycle<=last;cycle++){
    const begin=start+cycle*cycleMs,phase=Math.max(0,Math.min(1,(begin-start)/Math.max(1,end-start))),shadow=p.anti.length&&random(seed,index,cycle,1)<valueAt(p.shadow,phase);
    const primary=shadow?p.anti:p.notes,other=shadow?p.notes:(p.anti.length?p.anti:p.notes),cross=valueAt(p.cross,phase),cut=1+Math.floor(random(seed,index,cycle,2)*Math.max(1,p.notes.length-3)),crossLength=Math.min(p.notes.length-1-cut,Math.round(cross*p.notes.length*.5));
    const choices=[-5,-2,0,2,5,7].filter(n=>Math.abs(n)<=valueAt(p.drift,phase)),drift=choices[Math.floor(random(seed,index,cycle,3)*choices.length)]||0;
    let offset=0;
    p.durs.forEach((units,n)=>{
      const onset=begin+offset*unit,noteLength=units*unit;offset+=units;
      if(onset>=end||onset+noteLength<from)return;
      const note=(n>=cut&&n<cut+crossLength?other[n]:primary[n])+p.tr+drift;
      const hocket=valueAt(p.hocket,phase),tail=onset+noteLength*(1-hocket),division=p.divs[(cycle+n)%p.divs.length],vel=valueAt(p.vel,phase);
      if(hocket<1)push(`c${cycle}:n${n}:line`,onset,division,fold(note,rangeOf(division)),vel,Math.min(end-onset,noteLength*(1-hocket)*valueAt(p.legato,phase)),'cantabile');
      if(hocket<=0)return;
      const a=Math.max(0,Math.floor((from-tail)/pulse)),b=Math.ceil((Math.min(end,onset+noteLength,to)-tail)/pulse);
      for(let slot=a;slot<b;slot++){
        const time=tail+slot*pulse;if(time>=onset+noteLength||random(seed,index,cycle,n,slot,4)<valueAt(p.rest,phase))continue;
        const div=p.divs[(cycle+n+slot)%p.divs.length],dur=Math.min(end-time,onset+noteLength-time,pulse*.85,Math.max(10,pulse*valueAt(p.gate,phase)));
        push(`c${cycle}:n${n}:h${slot}`,time,div,fold(note,rangeOf(div)),vel,dur,'hocket');
      }
    });
  }
  return events;
}
