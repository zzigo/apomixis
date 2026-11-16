// Quiet autonomous seeds in the sounding 2-foot apex: MIDI96–108 (C7–C8).
// Independent of performance routes; shares the existing master and output device.
export function createSoundGarden(context, destination) {
  const output=context.createGain(),dry=context.createGain(),wet=context.createGain(),reverb=context.createConvolver(),damp=context.createBiquadFilter();
  output.gain.value=0;dry.gain.value=.22;wet.gain.value=.78;damp.type='lowpass';damp.frequency.value=9000;
  const length=Math.ceil(context.sampleRate*5.5),impulse=context.createBuffer(2,length,context.sampleRate);
  for(let c=0;c<2;c++){const data=impulse.getChannelData(c);for(let i=0;i<length;i++){const t=i/length;data[i]=(Math.random()*2-1)*Math.pow(1-t,3.5)*(1-Math.exp(-i/(context.sampleRate*.025)));}}
  reverb.buffer=impulse;reverb.connect(damp);damp.connect(wet);wet.connect(output);dry.connect(output);output.connect(destination);
  output.gain.setTargetAtTime(.17,context.currentTime,.7);
  let alive=true,x=.5,y=.6,lastTouch=0,next=context.currentTime+.1;const voices=new Set(),bursts=[];
  const pitches=[96,98,101,103,105,108]; // Opening SPORE field0/2/5/7/9, sounded two octaves above the key.
  function seed(at,gesture=false){
    if(!alive||voices.size>=10)return;
    const midi=pitches[Math.min(pitches.length-1,Math.floor((x*.65+Math.random()*.35)*pitches.length))],depth=Math.max(0,Math.min(1,y*.7+Math.random()*.3)),duration=2.8+depth*3.5;
    const tone=context.createOscillator(),amp=context.createGain(),pan=context.createStereoPanner(),filter=context.createBiquadFilter(),send=context.createGain();
    tone.type='sine';tone.frequency.value=440*2**((midi-69)/12);tone.detune.value=(Math.random()-.5)*5;
    pan.pan.value=Math.max(-1,Math.min(1,(x-.5)*1.5+(Math.random()-.5)*.5));filter.type='lowpass';filter.frequency.value=6500+(1-depth)*7000;send.gain.value=.5+depth*.65;
    const peak=(gesture ? .026 : .019)*(1-depth*.55);amp.gain.setValueAtTime(0,at);amp.gain.linearRampToValueAtTime(peak,at+.65);amp.gain.exponentialRampToValueAtTime(.00001,at+duration);
    tone.connect(amp);amp.connect(filter);filter.connect(pan);pan.connect(dry);pan.connect(send);send.connect(reverb);
    const voice={tone,nodes:[tone,amp,filter,pan,send]};voices.add(voice);tone.onended=()=>{for(const node of voice.nodes)node.disconnect();voices.delete(voice);};tone.start(at);tone.stop(at+duration+.1);
    bursts.push({x:Math.max(0,Math.min(1,(pan.pan.value+1)/2)),y:depth,at:performance.now(),midi});if(bursts.length>16)bursts.shift();
  }
  function tick(){if(!alive)return;if(context.state!=='running')return;const now=context.currentTime;if(next<now-.2)next=now+.1;while(next<now+.25){seed(next);next+=1.4+Math.random()*3.6;}}
  const timer=setInterval(tick,120);tick();
  return {get active(){return alive;},get position(){return{x,y};},bursts,
    move(nx,ny){if(!alive)return;x=Math.max(0,Math.min(1,nx));y=Math.max(0,Math.min(1,ny));if(performance.now()-lastTouch>650&&context.state==='running'){lastTouch=performance.now();seed(context.currentTime+.02,true);}},
    stop(immediate=false){if(!alive)return;alive=false;clearInterval(timer);const now=context.currentTime;output.gain.cancelScheduledValues(now);output.gain.setValueAtTime(immediate?0:output.gain.value,now);if(!immediate)output.gain.linearRampToValueAtTime(0,now+.7);for(const v of voices){try{v.tone.stop(now+(immediate?0:.75));}catch{}}const release=()=>{for(const v of voices)for(const node of v.nodes){try{node.disconnect();}catch{}}voices.clear();for(const node of [output,dry,wet,reverb,damp])node.disconnect();};if(immediate||context.state!=='running')release();else setTimeout(release,850);}
  };
}
