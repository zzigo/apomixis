// Bounded visual history of transport note intent; never inferred fertility or MIDI receipt.
import {DIVISION_ORDER} from '../../../packages/hylon-midi/divisions.js';
export function createNoteDensity(duration,columns=4096){
 const pitches=new Uint8Array(columns*128),lanes=DIVISION_ORDER.map(()=>new Uint8Array(columns)),ends=new Float64Array(5);let pending=[],version=0;
 function clear(){pitches.fill(0);lanes.forEach(a=>a.fill(0));ends.fill(0);pending=[];version++;}
 function add(event){if(event.kind!=='note')return;const lane=DIVISION_ORDER.indexOf(event.division),note=event.payload.note,start=event.atSessionMs/1000,end=Math.min(duration,start+event.payload.durationMs/1000);if(lane<0||!Number.isInteger(note)||note<0||note>127||!Number.isFinite(start)||!Number.isFinite(end)||end<=start||start>=duration)return;
  const a=Math.max(0,Math.floor(start/duration*columns)),b=Math.min(columns,Math.max(a+1,Math.ceil(end/duration*columns))),bit=1<<lane;
  const low=lane===0?24:36,high=lane===0?55:96,row=Math.max(0,Math.min(7,Math.floor((high-note)/(high-low+1)*8)));
  for(let c=a;c<b;c++){pitches[c*128+note]|=bit;lanes[lane][c]|=1<<row;}
  pending.push({lane,start,end});version++;
 }
 function activity(time){const future=[];for(const note of pending){if(note.start<=time)ends[note.lane]=Math.max(ends[note.lane],note.end);else future.push(note);}pending=future;return Array.from(ends,end=>end>time);}
 function columnRange(pixel,width,start=0,end=duration){const a=Math.max(0,Math.min(columns-1,Math.floor((start+(end-start)*pixel/width)/duration*columns))),b=Math.max(a+1,Math.min(columns,Math.ceil((start+(end-start)*(pixel+1)/width)/duration*columns)));return [a,b];}
 return {add,clear,activity,columnRange,pitches,lanes,columns,get version(){return version;}};
}
