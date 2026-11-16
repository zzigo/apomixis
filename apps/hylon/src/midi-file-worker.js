import {Midi} from '@tonejs/midi';
self.onmessage=event=>{
 try{
  const bytes=new Uint8Array(event.data.buffer);if(bytes.length>8*1024*1024||bytes.length<14||String.fromCharCode(...bytes.slice(0,4))!=='MThd')throw new Error('Choose a Standard MIDI file up to8MiB');
  const header=new DataView(bytes.buffer),format=header.getUint16(8),division=header.getUint16(12);if(format>1||division&0x8000)throw new Error('MIDI formats0/1 with PPQN timing supported');
  const midi=new Midi(bytes),notes=[],tracks=[];let low=127,high=0;
  for(const [index,track]of midi.tracks.entries()){tracks.push({index,name:(track.name||`Track ${index+1}`).slice(0,120),channel:track.channel+1,count:track.notes.length});for(const note of track.notes){if(notes.length>=100000)throw new Error('MIDI exceeds100000 notes');if(!Number.isFinite(note.time)||!Number.isFinite(note.duration)||note.time<0||note.duration<=0)continue;notes.push({time:note.time,duration:note.duration,midi:note.midi,velocity:Math.max(1,Math.round(note.velocity*127)),channel:track.channel+1,track:index});low=Math.min(low,note.midi);high=Math.max(high,note.midi);}}
  if(!notes.length)throw new Error('No note events in this file');notes.sort((a,b)=>a.time-b.time||a.midi-b.midi);
  const duration=Math.max(...notes.slice(-1000).map(n=>n.time+n.duration),midi.duration);if(!Number.isFinite(duration)||duration>86400)throw new Error('MIDI duration unsupported');
  const edges=notes.flatMap(n=>[[n.time,1],[n.time+n.duration,-1]]).sort((a,b)=>a[0]-b[0]||a[1]-b[1]);let held=0,polyphony=0;for(const [,delta]of edges){held+=delta;polyphony=Math.max(polyphony,held);}
  self.postMessage({ok:true,file:{name:String(event.data.name).slice(0,180),duration,notes,tracks,low,high,polyphony,tempos:midi.header.tempos.map(t=>({time:t.time,bpm:t.bpm})),ppq:midi.header.ppq}});
 }catch(error){self.postMessage({ok:false,error:error.message});}
};
