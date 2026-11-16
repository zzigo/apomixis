// Live keyboard audition. Independent from score transport; shared LA mixer lane.
export function createLocalMidiInput(context,destination){
 const voices=new Map(),sustain=new Set();let enabled=false;
 function release(key,immediate=false){const voice=voices.get(key);if(!voice)return;voices.delete(key);const now=context.currentTime;voice.gain.gain.cancelScheduledValues(now);voice.gain.gain.setTargetAtTime(0,now,immediate?.002:.008);try{voice.osc.stop(now+(immediate?.01:.04));}catch{}}
 function stop(channel=null){for(const [key,voice] of voices)if(channel===null||voice.channel===channel)release(key,true);if(channel===null)sustain.clear();else sustain.delete(channel);}
 function midi(bytes){
  if(!bytes||bytes.length!==3)return;const [status,note,velocity]=bytes;
  if(!Number.isInteger(status)||status<0x80||status>=0xf0||!Number.isInteger(note)||note<0||note>127||!Number.isInteger(velocity)||velocity<0||velocity>127)return;
  const kind=status&0xf0,channel=status&15,key=`${channel}:${note}`;
  if(kind===0xb0){
   if(note===120||note===123){stop(channel);return;}
   if(note===64){if(velocity>=64){if(enabled)sustain.add(channel);}else{sustain.delete(channel);for(const [k,v] of voices)if(v.channel===channel&&!v.down)release(k);}return;}
   if(note===121){sustain.delete(channel);for(const [k,v] of voices)if(v.channel===channel&&!v.down)release(k);}return;
  }
  if(kind===0x80||kind===0x90&&velocity===0){const voice=voices.get(key);if(voice){voice.down=false;if(!sustain.has(channel))release(key);}return;}
  if(kind!==0x90||!enabled||context.state!=='running')return;
  release(key,true);if(voices.size>=128)release(voices.keys().next().value,true);
  const osc=context.createOscillator(),gain=context.createGain(),at=context.currentTime;osc.type='triangle';osc.frequency.value=440*2**((note-69)/12);
  gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.08*velocity/127,at+.003);osc.connect(gain);gain.connect(destination);
  const voice={osc,gain,channel,down:true};voices.set(key,voice);osc.onended=()=>{if(voices.get(key)===voice)voices.delete(key);osc.disconnect();gain.disconnect();};osc.start(at);
 }
 return {midi,stop,setEnabled(value){enabled=value===true;if(!enabled)stop();},get active(){return voices.size;}};
}
