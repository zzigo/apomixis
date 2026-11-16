const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
const random=(seed,cycle,index)=>{let n=(seed^Math.imul(cycle+1,0x9e3779b1)^Math.imul(index+1,0x85ebca6b))>>>0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return ((n^(n>>>16))>>>0)/4294967296;};
export function sliceWindow(file,start,length,track='all'){
 const end=Math.min(file.duration,start+length),duration=Math.max(.01,end-start),notes=[];
 for(const note of file.notes){if(note.time>=end)break;if(track!=='all'&&note.track!==Number(track)||note.time+note.duration<=start)continue;const time=Math.max(0,note.time-start),tail=Math.min(end,note.time+note.duration)-Math.max(start,note.time);if(tail>0)notes.push({...note,time,duration:tail});if(notes.length>4096)throw new Error('Window exceeds4096 notes; shorten or select a track');}
 return {duration,notes};
}
export function processMidiWindow(a,b,options,cycle=0,progress=cycle){
 if(!a)throw new Error('Load MIDI A');
 const length=clamp(options.length,.05,Math.max(.05,a.duration)),maxStart=Math.max(0,a.duration-length),rawStart=options.start+progress*options.shift,start=maxStart?((rawStart%(maxStart+.000001))+(maxStart+.000001))%(maxStart+.000001):0;
 const aw=sliceWindow(a,start,length,options.trackA),bStart=b&&maxStart>0?start/maxStart*Math.max(0,b.duration-length):0,bw=b?sliceWindow(b,bStart,length,options.trackB):null;
 const transition=options.transition>0?clamp(progress/options.transition,0,1):0,morph=b?clamp(options.morph+(options.morphEnd-options.morph)*transition,0,1):0,octave=clamp(options.octave+(options.octaveEnd-options.octave)*transition,0,1),speed=clamp(options.speed,.05,32),harmony=options.harmony;
 const duration=aw.duration/speed,notes=[],count=bw?Math.max(aw.notes.length,bw.notes.length):aw.notes.length;
 const anchors=list=>new Map(list.map((note,index)=>[Math.floor(index*count/Math.max(1,list.length)),note]));
 const aSlots=anchors(aw.notes),bSlots=anchors(bw?.notes||[]);
 for(let i=0;i<count;i++){
  const strength=(aSlots.has(i)?1-morph:0)+(bSlots.has(i)?morph:0);if(random(options.seed+83,cycle,i)>=strength)continue;
  const an=aSlots.get(i)||aw.notes[Math.min(aw.notes.length-1,Math.floor(i*Math.max(1,aw.notes.length)/Math.max(1,count)))],bn=bSlots.get(i)||bw?.notes[Math.min(bw.notes.length-1,Math.floor(i*Math.max(1,bw.notes.length)/Math.max(1,count)))];
  const left=an||bn,right=bn||an;if(!left)continue;
  const lerp=(x,y)=>x+(y-x)*morph,time=((left.time/(an?aw.duration:bw.duration))*(1-morph)+(right.time/(bn?bw.duration:aw.duration))*morph)*duration;
  const channel=options.manual==='cycle'?[5,1,2,3,4][i%5]:options.manual==='source'?([1,2,3,4,5].includes((morph<.5?left:right).channel)?(morph<.5?left:right).channel:1):Number(options.manual);
  let pitch=Math.round(lerp(left.midi,right.midi));if(random(options.seed,cycle,i)<octave){const oct=1+Math.floor(random(options.seed+17,cycle,i)*options.octaves);pitch+=12*oct*(random(options.seed+37,cycle,i)<.5?-1:1);}
  for(const offset of harmony){let midi=pitch+offset;if(options.fold){const low=channel===5?24:36,high=channel===5?55:96;while(midi<low)midi+=12;while(midi>high)midi-=12;}if(midi<0||midi>127)continue;const dur=Math.max(.01,Math.min(duration-time,lerp(left.duration/ (an?aw.duration:bw.duration),right.duration/(bn?bw.duration:aw.duration))*duration));notes.push({id:`${cycle}:${i}:${offset}`,midi,channel,time,duration:dur,velocity:clamp(Math.round(lerp(left.velocity,right.velocity)),1,127)});}
 }
 if(notes.length>8192)throw new Error('Processed window exceeds8192 notes');
 notes.sort((x,y)=>x.time-y.time||x.midi-y.midi);return {notes,duration,start,morph,octave,cycle};
}
