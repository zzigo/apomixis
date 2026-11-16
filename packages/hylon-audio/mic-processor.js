// Mono voice correction and pitch analysis. Raw audio stays in the audio thread.
class HylonMicProcessor extends AudioWorkletProcessor {
  constructor(){
    super();this.buffer=new Float32Array(16384);this.write=0;this.filled=0;this.sinceAnalysis=0;this.phase=0;this.ratio=1;this.targetRatio=1;
    this.params={tuneAmount:1,tuneRetuneMs:25,tuneRoot:0,tuneScale:'chromatic',tuneTranspose:0};
    this.analysis=new Float32Array(1024);this.difference=new Float32Array(512);
    this.port.onmessage=event=>{if(event.data?.type==='params')Object.assign(this.params,event.data.params);if(event.data?.type==='reset'){this.buffer.fill(0);this.filled=0;this.targetRatio=1;this.ratio=1;this.port.postMessage({type:'pitch',frequency:0,confidence:0,rms:0});}};
  }
  read(delay){const position=(this.write-delay+this.buffer.length*2)%this.buffer.length,index=Math.floor(position),fraction=position-index;return this.buffer[index]*(1-fraction)+this.buffer[(index+1)%this.buffer.length]*fraction;}
  detect(){
    const stride=Math.max(1,Math.round(sampleRate/24000)),rate=sampleRate/stride,n=this.analysis.length;
    if(this.filled<n*stride)return;
    let mean=0,energy=0;
    for(let i=0;i<n;i++){const x=this.buffer[(this.write-1-i*stride+this.buffer.length*2)%this.buffer.length];this.analysis[n-1-i]=x;mean+=x;energy+=x*x;}
    mean/=n;for(let i=0;i<n;i++)this.analysis[i]-=mean;
    const rms=Math.sqrt(energy/n),minLag=Math.max(2,Math.floor(rate/1000)),maxLag=Math.min(510,Math.floor(rate/55));
    let frequency=0,confidence=0;
    if(rms>.0015){
      let cumulative=0,best=1,bestLag=0;this.difference[0]=1;
      for(let lag=1;lag<=maxLag;lag++){
        let sum=0;for(let i=0;i<512;i++){const d=this.analysis[i]-this.analysis[i+lag];sum+=d*d;}
        cumulative+=sum;const value=cumulative?sum*lag/cumulative:1;this.difference[lag]=value;
        if(lag>=minLag&&value<best){best=value;bestLag=lag;}
      }
      let selected=0;
      for(let lag=minLag;lag<maxLag;lag++)if(this.difference[lag]<.16){while(lag<maxLag&&this.difference[lag+1]<this.difference[lag])lag++;selected=lag;break;}
      if(!selected&&best<.3)selected=bestLag;
      if(selected){
        const a=this.difference[selected-1],b=this.difference[selected],c=this.difference[Math.min(maxLag,selected+1)],den=a-2*b+c;
        const refined=selected+(Math.abs(den)>1e-9?Math.max(-.5,Math.min(.5,.5*(a-c)/den)):0);
        frequency=rate/refined;confidence=Math.max(0,1-b);
      }
    }
    const midi=frequency?69+12*Math.log2(frequency/440):null;
    let targetMidi=null,correctionCents=null;
    if(midi!==null&&confidence>=.78){
      const scales={chromatic:[0,1,2,3,4,5,6,7,8,9,10,11],major:[0,2,4,5,7,9,11],minor:[0,2,3,5,7,8,10],pentatonic:[0,2,4,7,9]};
      const scale=scales[this.params.tuneScale]||scales.chromatic;let target=Math.round(midi),best=Infinity;
      for(let note=Math.floor(midi)-12;note<=Math.ceil(midi)+12;note++)if(scale.includes(((note-this.params.tuneRoot)%12+12)%12)&&Math.abs(note-midi)<best){target=note;best=Math.abs(note-midi);}
      const semitones=Math.max(-12,Math.min(12,(target-midi)*this.params.tuneAmount+this.params.tuneTranspose));
      targetMidi=target+this.params.tuneTranspose;correctionCents=semitones*100;this.targetRatio=2**(semitones/12);
    }else this.targetRatio=1;
    this.port.postMessage({type:'pitch',frequency,confidence,rms,midi,targetMidi,correctionCents,residualCents:targetMidi===null?null:100*(midi+12*Math.log2(this.ratio)-targetMidi)});
  }
  process(inputs,outputs){
    const input=inputs[0]?.[0],output=outputs[0];if(!output?.length)return true;
    const window=Math.min(sampleRate*.04,this.buffer.length*.5),base=Math.min(sampleRate*.008,this.buffer.length*.1);
    const smoothing=1-Math.exp(-1/(sampleRate*Math.max(.001,this.params.tuneRetuneMs/1000)));
    for(let i=0;i<output[0].length;i++){
      this.buffer[this.write]=input?.[i]||0;this.filled=Math.min(this.buffer.length,this.filled+1);
      this.ratio+=(this.targetRatio-this.ratio)*smoothing;
      this.phase=(this.phase+(1-this.ratio)/window+1)%1;
      const other=(this.phase+.5)%1,weight=.5-.5*Math.cos(2*Math.PI*this.phase);
      const corrected=this.read(base+this.phase*window)*weight+this.read(base+other*window)*(1-weight);
      for(const channel of output)channel[i]=corrected;
      this.write=(this.write+1)%this.buffer.length;
      if(++this.sinceAnalysis>=1024){this.sinceAnalysis=0;this.detect();}
    }
    return true;
  }
}
registerProcessor('hylon-mic-correction',HylonMicProcessor);
