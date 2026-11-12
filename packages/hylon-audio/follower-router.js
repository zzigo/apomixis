// Generated notes are monitored once, then fanned out to independent destinations.
export function createFollowerRouter({audio,midiOut,sampler,onMessage=()=>{},onError=()=>{}}){
  const routes={audio:false,klais:false,midi:true},voices=new Map();let serial=0,disposed=false;
  function localVoice(note,velocity){
    const context=audio.context;if(context?.state!=='running')return null;
    const oscillator=context.createOscillator(),level=context.createGain();oscillator.type='triangle';oscillator.frequency.value=440*2**((note-69)/12);level.gain.setValueAtTime(0,context.currentTime);level.gain.linearRampToValueAtTime(.16*velocity/127,context.currentTime+.012);oscillator.connect(level);level.connect(audio.localDestination());oscillator.start();oscillator.stop(context.currentTime+1);
    oscillator.onended=()=>{oscillator.disconnect();level.disconnect();};
    return{renew(){try{oscillator.stop(context.currentTime+1);}catch{}},stop(){const now=context.currentTime;level.gain.cancelScheduledValues(now);level.gain.setTargetAtTime(0,now,.008);try{oscillator.stop(now+.05);}catch{}}};
  }
  function release(owner){const voice=voices.get(owner);if(!voice)return;voices.delete(owner);voice.local?.stop();if(voice.klais)sampler?.stopFollower(owner);if(voice.midi)midiOut.stopFollower();onMessage([0x80|(voice.channel-1),voice.note,0]);}
  function stopFollower(){for(const owner of [...voices.keys()])release(owner);}
  function attemptMidi(voice){if(!routes.midi||!midiOut.summary().armed||audio.midiLevel<=0||performance.now()<voice.retryAt)return;voice.retryAt=performance.now()+250;try{voice.midi=midiOut.startFollower(voice);}catch(error){onError(error.message);}}
  return{
    routes,
    async prepare(){if(routes.audio||routes.klais)await audio.ensure();if(routes.klais){try{await sampler?.prepareScore();}catch(error){onError(error.message);}}},
    setRoute(name,value){if(!Object.hasOwn(routes,name))throw new Error('Unknown follower output');stopFollower();routes[name]=!!value;},
    summary:()=>({armed:!disposed&&audio.context?.state==='running'}),
    assertReady(){if(disposed)throw new Error('Follower router closed');},
    startFollower({channel,note,velocity}){
      if(disposed||audio.context?.state!=='running'||voices.size>=8)return null;
      const owner=`follower-route:${++serial}`,voice={channel,note,velocity,local:null,klais:false,midi:null,retryAt:0,expires:performance.now()+350};
      if(routes.audio)voice.local=localVoice(note,velocity);
      if(routes.klais)voice.klais=!!sampler?.startFollower(owner,note,velocity,channel);
      attemptMidi(voice);voices.set(owner,voice);onMessage([0x90|(channel-1),note,velocity]);return owner;
    },
    renewFollower(owner){const voice=voices.get(owner);if(!voice)return false;voice.expires=performance.now()+350;voice.local?.renew();if(voice.midi&&!midiOut.renewFollower(voice.midi))voice.midi=null;if(!voice.midi)attemptMidi(voice);return true;},
    stopFollower,
    tick(){const now=performance.now();for(const [owner,voice]of voices)if(now>=voice.expires||audio.context?.state!=='running')release(owner);},
    dispose(){stopFollower();disposed=true;}
  };
}
