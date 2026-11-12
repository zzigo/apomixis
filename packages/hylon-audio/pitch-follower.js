export const FOLLOWER_DEFAULTS=Object.freeze({channel:1,gateDb:-45,confidence:.85,stableMs:80,releaseMs:160,repeatMs:250,filterRepeats:true,minNote:36,maxNote:84,transpose:0});
export function createPitchFollower(midiOut,{now=()=>performance.now(),onState=()=>{}}={}){
  const params={...FOLLOWER_DEFAULTS};let enabled=false,active=null,candidate=null,candidateAt=0,lastVoiced=-Infinity,lastMessage=-Infinity;
  const recent=new Map();
  function release(){midiOut?.stopFollower();active=null;}
  function stop(){enabled=false;release();candidate=null;recent.clear();onState({enabled,active:null});}
  function configure(next){
    for(const [key,value]of Object.entries(next)){
      if(key==='filterRepeats'){if(typeof value!=='boolean')throw new Error('Invalid repeat filter');continue;}
      const limits={channel:[1,16],gateDb:[-80,-10],confidence:[.5,.99],stableMs:[0,500],releaseMs:[30,1000],repeatMs:[0,2000],minNote:[0,127],maxNote:[0,127],transpose:[-24,24]}[key];
      if(!limits||!Number.isFinite(value)||value<limits[0]||value>limits[1]||(['channel','minNote','maxNote','transpose'].includes(key)&&!Number.isInteger(value)))throw new Error('Invalid follower setting');
    }
    const merged={...params,...next};if(merged.minNote>merged.maxNote)throw new Error('Follower note range is reversed');
    release();candidate=null;Object.assign(params,next);
  }
  function process(pitch){
    const time=now();lastMessage=time;
    if(!enabled)return;
    if(!midiOut?.summary().armed){stop();return;}
    const db=20*Math.log10(Math.max(1e-9,pitch.rms||0)),midi=pitch.frequency>0?69+12*Math.log2(pitch.frequency/440):NaN;
    const note=Math.round(midi),valid=Number.isFinite(midi)&&db>=params.gateDb&&pitch.confidence>=params.confidence&&note>=params.minNote&&note<=params.maxNote;
    if(!valid){candidate=null;if(time-lastVoiced>=params.releaseMs)release();return;}
    lastVoiced=time;
    const output=note+params.transpose;if(output<0||output>127){release();return;}
    if(active&&Math.abs(midi-(active.note-params.transpose))<.65){if(!midiOut.renewFollower(active.owner)){active=null;candidate=null;return;}candidate=null;onState({enabled,active:active.note,db,confidence:pitch.confidence});return;}
    if(candidate!==output){candidate=output;candidateAt=time;}
    if(time-candidateAt<params.stableMs){if(active)midiOut.renewFollower(active.owner);return;}
    if(params.filterRepeats&&time-(recent.get(output)??-Infinity)<params.repeatMs)return;
    release();const owner=midiOut.startFollower({channel:params.channel,note:output,velocity:Math.max(1,Math.min(127,Math.round((db-params.gateDb)/(0-params.gateDb)*126+1)))});
    if(owner){active={owner,note:output};recent.set(output,time);}
    candidate=null;onState({enabled,active:active?.note??null,db,confidence:pitch.confidence});
  }
  return{params,configure,process,stop,get enabled(){return enabled;},enable(){midiOut.assertReady();enabled=true;candidate=null;lastMessage=now();onState({enabled,active:null});},tick(){if(enabled&&(!midiOut.summary().armed||now()-lastMessage>Math.max(250,params.releaseMs))){stop();}else if(active&&now()-lastVoiced>=params.releaseMs)release();}};
}
