export const MIXER_DEFAULTS=Object.freeze({samplerLevel:.8,samplerReverb:.15,samplerDelay:.08,localLevel:.7,localReverb:.15,localDelay:.08,midiLevel:1,micLevel:.7,micDry:0,micTune:1,micReverb:.2,micDelay:.1,reverbLevel:.35,reverbTime:2.4,reverbDamping:6500,reverbPreDelay:.012,delayLevel:.3,delayTime:.35,delayFeedback:.25,tuneAmount:1,tuneRetuneMs:25,tuneRoot:0,tuneScale:'chromatic',tuneTranspose:0,chopRate:4,chopDepth:0});
const bounds={samplerLevel:[0,1],samplerReverb:[0,1],samplerDelay:[0,1],localLevel:[0,1],localReverb:[0,1],localDelay:[0,1],midiLevel:[0,1],micLevel:[0,1],micDry:[0,1],micTune:[0,1],micReverb:[0,1],micDelay:[0,1],reverbLevel:[0,1],reverbTime:[.2,10],reverbDamping:[800,16000],reverbPreDelay:[0,.2],delayLevel:[0,1],delayTime:[.02,1.5],delayFeedback:[0,.8],tuneAmount:[0,1],tuneRetuneMs:[0,300],tuneRoot:[0,11],tuneTranspose:[-12,12],chopRate:[.25,32],chopDepth:[0,1]};
export function validateMixerValue(key,value){
  if(key==='tuneScale'){if(!['chromatic','major','minor','pentatonic'].includes(value))throw new Error('Invalid tuning scale');return value;}
  if(!bounds[key]||!Number.isFinite(value)||value<bounds[key][0]||value>bounds[key][1]||(['tuneRoot','tuneTranspose'].includes(key)&&!Number.isInteger(value)))throw new Error(`Invalid mixer control: ${key}`);return value;
}
const worklets=new WeakMap();
export function createAudioMixer(context,output){
  const nodes=[],sources=[],params={...MIXER_DEFAULTS},pitchListeners=new Set(),branches=new Set(),timers=new Set();
  let disposed=false,micEnabled=false,processor=null,processorError='',pitch={frequency:0,confidence:0,rms:0},reverbTimer=0,reverbBranch=null,delayNodes=[];
  const keep=node=>{nodes.push(node);return node;},gain=(value=1)=>{const node=keep(context.createGain());node.gain.value=value;return node;},smooth=(param,value)=>param.setTargetAtTime(value,context.currentTime,.02);
  const samplerInput=gain(),localInput=gain(),micInput=gain(),sum=gain();
  samplerInput.channelCount=localInput.channelCount=2;samplerInput.channelCountMode=localInput.channelCountMode='explicit';
  const compressor=keep(context.createDynamicsCompressor());compressor.threshold.value=-10;compressor.knee.value=12;compressor.ratio.value=8;compressor.attack.value=.003;compressor.release.value=.15;sum.connect(compressor);compressor.connect(output);
  const revInput=gain(),delayInput=gain(),revReturn=gain(params.reverbLevel),delayReturn=gain(params.delayLevel);revReturn.connect(sum);delayReturn.connect(sum);
  const preDelay=keep(context.createDelay(.3)),revDamp=keep(context.createBiquadFilter());preDelay.delayTime.value=params.reverbPreDelay;revDamp.type='lowpass';revDamp.frequency.value=params.reverbDamping;revInput.connect(preDelay);preDelay.connect(revDamp);
  function channel(input,level,reverb,delay){const fader=gain(level),rev=gain(reverb),del=gain(delay);input.connect(fader);fader.connect(sum);fader.connect(rev);fader.connect(del);rev.connect(revInput);del.connect(delayInput);return{fader,rev,del};}
  const sampler=channel(samplerInput,params.samplerLevel,params.samplerReverb,params.samplerDelay),local=channel(localInput,params.localLevel,params.localReverb,params.localDelay);
  const dry=gain(params.micDry),dryGate=gain(0),tuned=gain(params.micTune),wetGate=gain(0),micBus=gain();
  micInput.connect(dry);dry.connect(dryGate);dryGate.connect(micBus);wetGate.connect(micBus);
  const mic=channel(micBus,params.micLevel,params.micReverb,params.micDelay);
  const chop=gain(1),chopOsc=keep(context.createOscillator()),chopShape=keep(context.createWaveShaper()),chopSmooth=keep(context.createBiquadFilter()),chopAmount=gain(0);
  chopOsc.frequency.value=params.chopRate;chopShape.curve=Float32Array.from({length:2049},(_,i)=>Math.tanh((i/1024-1)*5));chopSmooth.type='lowpass';chopSmooth.frequency.value=80;chopSmooth.Q.value=.5;
  tuned.connect(chop);chop.connect(wetGate);chopOsc.connect(chopShape);chopShape.connect(chopSmooth);chopSmooth.connect(chopAmount);chopAmount.connect(chop.gain);chopOsc.start();sources.push(chopOsc);
  function removeBranch(branch){if(!branch)return;try{revDamp.disconnect(branch.convolver);}catch{}branch.convolver.disconnect();branch.level.disconnect();branches.delete(branch);}
  function rebuildReverb(immediate=false){
    if(disposed)return;
    const length=Math.ceil(context.sampleRate*params.reverbTime),impulse=context.createBuffer(2,length,context.sampleRate),decay=Math.exp(-Math.log(1000)/length);let seed=0x48a71;
    for(let channel=0;channel<2;channel++){const data=impulse.getChannelData(channel);let envelope=1;for(let i=0;i<length;i++){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;data[i]=((seed>>>0)/2147483648-1)*envelope;envelope*=decay;}}
    const convolver=context.createConvolver(),level=context.createGain(),old=reverbBranch;convolver.buffer=impulse;level.gain.value=immediate?1:0;revDamp.connect(convolver);convolver.connect(level);level.connect(revReturn);reverbBranch={convolver,level};branches.add(reverbBranch);
    if(!immediate)smooth(level.gain,1);
    if(old){if(immediate)removeBranch(old);else{smooth(old.level.gain,0);const timer=setTimeout(()=>{timers.delete(timer);removeBranch(old);},150);timers.add(timer);}}
  }
  let delay,feedback;
  function rebuildDelay(){delayInput.disconnect();for(const node of delayNodes)node.disconnect();delay=context.createDelay(2);feedback=context.createGain();const damp=context.createBiquadFilter();delay.delayTime.value=params.delayTime;feedback.gain.value=params.delayFeedback;damp.type='lowpass';damp.frequency.value=4500;delayInput.connect(delay);delay.connect(delayReturn);delay.connect(damp);damp.connect(feedback);feedback.connect(delay);delayNodes=[delay,feedback,damp];}
  rebuildReverb(true);rebuildDelay();
  function meter(source){const splitter=keep(context.createChannelSplitter(2));source.connect(splitter);return[0,1].map(channel=>{const analyser=keep(context.createAnalyser());analyser.fftSize=256;splitter.connect(analyser,channel);return analyser;});}
  const meters={sampler:meter(sampler.fader),local:meter(local.fader),mic:meter(mic.fader),reverb:meter(revReturn),delay:meter(delayReturn),master:meter(output)};
  const tuneParams=()=>Object.fromEntries(Object.entries(params).filter(([key])=>key.startsWith('tune')));
  const ready=(async()=>{
    try{
      if(!context.audioWorklet)throw new Error('AudioWorklet unavailable; mic DRY remains available.');
      if(!worklets.has(context))worklets.set(context,context.audioWorklet.addModule(new URL('./mic-processor.js',import.meta.url)));
      await worklets.get(context);if(disposed)return;
      processor=keep(new AudioWorkletNode(context,'hylon-mic-correction',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],channelCount:1,channelCountMode:'explicit'}));
      processor.port.onmessage=event=>{if(event.data?.type!=='pitch'||disposed)return;pitch=event.data;for(const listener of pitchListeners){try{listener(pitch);}catch{}}};
      processor.onprocessorerror=()=>{processorError='Mic pitch processor stopped; restart audio.';pitch={frequency:0,confidence:0,rms:0};for(const listener of pitchListeners){try{listener(pitch);}catch{}}};
      processor.port.postMessage({type:'params',params:tuneParams()});micInput.connect(processor);processor.connect(tuned);
    }catch(error){processorError=error.message;}
  })();
  const targets={samplerLevel:sampler.fader.gain,samplerReverb:sampler.rev.gain,samplerDelay:sampler.del.gain,localLevel:local.fader.gain,localReverb:local.rev.gain,localDelay:local.del.gain,micLevel:mic.fader.gain,micDry:dry.gain,micTune:tuned.gain,micReverb:mic.rev.gain,micDelay:mic.del.gain,reverbLevel:revReturn.gain,reverbDamping:revDamp.frequency,reverbPreDelay:preDelay.delayTime,delayLevel:delayReturn.gain,chopRate:chopOsc.frequency};
  function set(key,value){validateMixerValue(key,value);if(disposed)return;params[key]=value;if(targets[key])smooth(targets[key],value);else if(key==='delayTime')smooth(delay.delayTime,value);else if(key==='delayFeedback')smooth(feedback.gain,value);else if(key==='chopDepth'){smooth(chop.gain,1-value/2);smooth(chopAmount.gain,value/2);}else if(key==='reverbTime'){clearTimeout(reverbTimer);reverbTimer=setTimeout(()=>rebuildReverb(),120);}else if(key.startsWith('tune'))processor?.port.postMessage({type:'params',params:tuneParams()});}
  function enableMic(value){if(disposed)return;micEnabled=!!value;smooth(dryGate.gain,micEnabled?1:0);smooth(wetGate.gain,micEnabled?1:0);}
  function resetMic(){processor?.port.postMessage({type:'reset'});pitch={frequency:0,confidence:0,rms:0};for(const listener of pitchListeners){try{listener(pitch);}catch{}}}
  return{samplerInput,localInput,micInput,meters,params,ready,set,enableMic,resetMic,get micEnabled(){return micEnabled;},get pitch(){return pitch;},get processorError(){return processorError;},onPitch(listener){pitchListeners.add(listener);return()=>pitchListeners.delete(listener);},
    panic(){if(disposed)return;enableMic(false);resetMic();clearTimeout(reverbTimer);for(const timer of timers)clearTimeout(timer);timers.clear();for(const branch of [...branches])removeBranch(branch);reverbBranch=null;rebuildReverb(true);rebuildDelay();},
    dispose(){if(disposed)return;enableMic(false);disposed=true;clearTimeout(reverbTimer);for(const timer of timers)clearTimeout(timer);pitchListeners.clear();if(processor){processor.port.onmessage=null;processor.port.close();}for(const source of sources){try{source.stop();}catch{}}for(const branch of [...branches])removeBranch(branch);for(const node of [...nodes,...delayNodes]){try{node.disconnect();}catch{}}}
  };
}
