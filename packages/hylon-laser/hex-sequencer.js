import {midiStrokes} from './frame.js';
export const HEX_COLORS=Object.freeze([[1,0,0],[1,1,0],[0,1,0],[0,1,1],[0,0,1],[1,0,1]]);
export function createHexSequencer(){
 const pulses=Array.from({length:6},()=>[]);
 return {clear(){pulses.forEach(list=>list.length=0);},receive(event,timing,cue){const vertex=Math.floor((event.atSessionMs+1e-6)/(cue.step*1000))%6,start=timing.when*1000,end=start+cue.dur*1000,list=pulses[vertex],last=list.at(-1);if(last&&start<=last.end){last.start=Math.min(last.start,start);last.end=Math.max(last.end,end);}else{if(list.length>=128)list.shift();list.push({start,end});}},
  strokes(now,seconds,cue,profile){const result=[];for(let i=0;i<6;i++){const list=pulses[i];while(list.length&&list[0].end<=now)list.shift();if(!list.some(p=>p.start<=now&&p.end>now))continue;const angle=seconds/cue.turn*Math.PI*2+i*Math.PI/3-Math.PI/2,x=.5+.47*Math.cos(angle),y=.5+.47*Math.sin(angle);result.push(...midiStrokes([{x,y,intensity:1}],0,profile).map(stroke=>({...stroke,colorRgb:[...HEX_COLORS[i]]})));}return result;}};
}
