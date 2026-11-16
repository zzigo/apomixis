// MEGASPORE interpretation only: immutable score, unchanged main pulse and melodic timing.
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const hash=(...parts)=>{let h=2166136261;for(const c of parts.join(':'))h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967296;};
const shuffle=(values,...salt)=>{const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(hash(...salt,i)* (i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const pc=n=>(n%12+12)%12;
const fit=(note,[lo,hi])=>{while(note<lo)note+=12;while(note>hi)note-=12;return note;};
const nearest=(note,cls,range)=>{let delta=pc(cls-pc(note));if(delta>6)delta-=12;return fit(note+delta,range);};
export function createMegasporeVector(score){
 const first=score.sections.find(s=>s.algos?.some(a=>a.kind==='cell'&&a.params.notes.length===16&&a.params.divs.length>=4));
 const main=first?.algos.find(a=>a.kind==='cell'&&a.params.notes.length===16&&a.params.divs.length>=4),basePc=pc(main?.params.notes.at(-1)??64);
 const unit=main?main.params.rate.split('/').map(Number):[1,8],phrase=main?main.params.durs.reduce((sum,v)=>sum+(typeof v==='number'?v:v.from),0)*4*unit[0]/unit[1]*60/first.bpm:7.5;
 const arrivalDeck=shuffle(Array.from({length:12},(_,i)=>i).filter(n=>n!==basePc),score.seed,'arrival');
 return function shape(events,algo,section,vector,seed,rangeOf){
  const v={mu:1,disp:1,poly:1,tuber:1,cap:1,...vector},rate=clamp(.15*v.mu,0,.45),out=[];
  function plan(time){if(!first||time<first.start)return null;const phraseIndex=Math.max(0,Math.floor((time-first.start+1e-7)/phrase)),count=Math.floor((phraseIndex+1)*16*rate+1e-8)-Math.floor(phraseIndex*16*rate+1e-8),arrival=count?arrivalDeck[phraseIndex%arrivalDeck.length]:basePc;
   const indices=count?[15,...shuffle(Array.from({length:14},(_,i)=>i+1),seed,phraseIndex,'slots').slice(0,count-1)]:[];
   let shift=pc(arrival-basePc);if(shift>6)shift-=12;return{phraseIndex,indices,arrival,shift};}
  for(const source of events){
   if(source.kind!=='note'){out.push(source);continue;}const event={...source,payload:{...source.payload}},range=rangeOf(event.division),time=event.atSessionMs/1000,p=plan(time),cell=algo.kind==='cell',pedal=event.division==='pe';
   if(cell&&p&&algo.params.notes.length===16){
    const index=Number(/c\d+n(\d+)(?:go|po|re|so|pe)$/.exec(event.eventId)?.[1]);
    if(p.indices.includes(index)){
     // Same selected slots and deltas across the lead and both heterophonic siblings.
     const canonical=section.algos.find(a=>a.kind==='cell'&&a.params.notes.length===16&&a.params.divs.length>=4)||main,original=canonical.params.notes[index],target=index===15?p.arrival:shuffle(Array.from({length:12},(_,i)=>i).filter(n=>n!==pc(original)),seed,p.phraseIndex,index,'pitch')[0];
     let delta=pc(target-pc(original));if(delta>6)delta-=12;event.payload.note=fit(event.payload.note+delta,range);
    }
   }else if(p?.shift){event.payload.note=fit(event.payload.note+p.shift,range);}
   // Core melody (and its siblings) and pedal never receive timing/gate/density changes.
   if(cell||pedal){out.push(event);continue;}
   const auxiliary=algo.kind==='arp'||algo.kind==='chord',h=salt=>hash(seed,event.eventId,salt);
   if(auxiliary&&v.cap<1&&h('thin')<.25*(1-v.cap))continue;
   const durationScale=1+.12*(v.tuber-1)/(v.tuber>=1?3:1);event.payload.durationMs=clamp(event.payload.durationMs*durationScale,10,600000);
   event.payload.velocity=clamp(Math.round(event.payload.velocity+(h('vel')*2-1)*4*Math.abs(v.mu-1)/2),1,127);
   if(auxiliary){
    const offset=6*(v.disp-1)*(h('spread')*.8+.2);event.atSessionMs=clamp(event.atSessionMs+offset,section.start*1000,(section.start+section.dur)*1000-.001);
    if(v.mu>1&&h('oct')<.06*(v.mu-1)/2)event.payload.note=fit(event.payload.note+(h('up')<.5?-12:12),range);
   }
   out.push(event);
   const bud=auxiliary?clamp(.12*Math.max(0,v.poly-1)/2+.08*Math.max(0,v.cap-1),0,.2):0;
   if(bud&&h('bud')<bud){const delay=18+18*h('budtime'),at=event.atSessionMs+delay;if(at<(section.start+section.dur)*1000)out.push({...event,eventId:event.eventId+':bud',atSessionMs:at,payload:{...event.payload,note:fit(event.payload.note+(h('budup')<.5?-12:12),range),velocity:Math.max(1,Math.round(event.payload.velocity*.65)),durationMs:Math.max(10,event.payload.durationMs*.6)}});}
  }
  return out;
 };
}
