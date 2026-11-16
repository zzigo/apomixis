// Shared closed remote parameter contract; no device connection/arming operations.
export const MIX_GROUPS = [
 {name:'K',color:'klais',meter:'sampler',controls:[['samplerLevel','LEVEL',0,1,.01],['samplerReverb','REV',0,1,.01],['samplerDelay','DLY',0,1,.01]]},
 {name:'LA',color:'audio',meter:'local',controls:[['localLevel','LEVEL',0,1,.01],['localReverb','REV',0,1,.01],['localDelay','DLY',0,1,.01]]},
 {name:'MIC',meter:'mic',controls:[['micLevel','LEVEL',0,1,.01],['tapeLevel','TAPE',0,1,.01],['micDry','DRY',0,1,.01],['micTune','TUNE',0,1,.01],['micReverb','REV',0,1,.01],['micDelay','DLY',0,1,.01]]},
 {name:'REVERB',meter:'reverb',controls:[['reverbLevel','LEVEL',0,1,.01],['reverbTime','TIME',.2,10,.1],['reverbDamping','DAMP',800,16000,100],['reverbPreDelay','PRE',0,.2,.001]]},
 {name:'DELAY',meter:'delay',controls:[['delayLevel','LEVEL',0,1,.01],['delayTime','TIME',.02,1.5,.01],['delayFeedback','FDBK',0,.8,.01]]},
 {name:'MASTER',meter:'master',controls:[['master','LEVEL',0,1,.01]]},
 {name:'AUTOTUNE',controls:[['tuneAmount','AMT',0,1,.01],['tuneRetuneMs','RETUNE',0,300,1],['tuneTranspose','TRANS',-12,12,1]]},
 {name:'CHOPPER',controls:[['chopRate','HZ',.25,32,.25],['chopDepth','DEPTH',0,1,.01]]}
];
const MIX_BOUNDS=Object.fromEntries(MIX_GROUPS.flatMap(g=>g.controls.map(([key,,min,max])=>[key,[min,max]])));
const SPORE_BOUNDS={performanceTempo:[.25,4],performanceDur:[.001,1],seed:[0,4294967295],harm:[0,16],duration:[.02,4],seek:[0,1800]};
const ENUMS={texture:['auto','tutti','striated','hocket','granulation'],harmSource:['score','manual'],durationSource:['score','manual']};
export function validParameter(action,param){
 if(!param||typeof param!=='object'||typeof param.key!=='string')return false;
 const {key,value}=param;
 if(action==='process')return ['audio','midi','laser','garden'].includes(key)&&typeof value==='boolean';
 if(action==='mixer'){
  if(key==='garden.position')return value&&typeof value==='object'&&Number.isFinite(value.x)&&Number.isFinite(value.y)&&value.x>=0&&value.x<=1&&value.y>=0&&value.y<=1;
  const send=/^follow\.send\.(-?\d+):([1-5])$/.exec(key);
  if(send)return [-26,-21,-12,-10,-7,-5,-4,-3,-2,0,2,3,4,5,7,10,12,21,26].includes(Number(send[1]))&&typeof value==='boolean';
  if(['follow.enabled','follow.reset','follow.filterRepeats','follow.route.klais','follow.route.audio','follow.route.midi'].includes(key))return typeof value==='boolean';
  const followBounds={gateDb:[-80,-10],confidence:[.5,.99],stableMs:[0,500],releaseMs:[30,1000],repeatMs:[0,2000],minNote:[0,127],maxNote:[0,127],transpose:[-24,24]};
  if(key.startsWith('follow.')&&followBounds[key.slice(7)]){const [lo,hi]=followBounds[key.slice(7)];return Number.isFinite(value)&&value>=lo&&value<=hi;}

  if(key==='snapshotSave'||key==='snapshotRecall')return Number.isInteger(value)&&value>=1&&value<=4;
  if(MIX_BOUNDS[key])return typeof value==='number'&&Number.isFinite(value)&&value>=MIX_BOUNDS[key][0]&&value<=MIX_BOUNDS[key][1];
  if(key==='tuneScale')return ['chromatic','major','minor','pentatonic'].includes(value);
  if(key==='tuneRoot')return Number.isInteger(value)&&value>=0&&value<=11;
  if(key==='micLane')return value===0||value===1;
  if(key==='monitor'||key==='clearFx')return typeof value==='boolean';
 }
 if(action==='spore'){
  if(SPORE_BOUNDS[key])return typeof value==='number'&&Number.isFinite(value)&&value>=SPORE_BOUNDS[key][0]&&value<=SPORE_BOUNDS[key][1]&&(key!=='seed'||Number.isInteger(value));
  if(ENUMS[key])return ENUMS[key].includes(value);
  if(['polyembryony','output.klais','output.audio','output.midi','reseed','vectorReset'].includes(key))return typeof value==='boolean';
  if(/^vector\.(mu|disp|poly|tuber|cap)$/.test(key))return typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=4;
 }
 // IMPRO pod: arm / routes toggle, score follow, release echoes, patch 1–9.
 if(action==='impro'){
  if(['arm','klais','audio','midi','stop'].includes(key))return value===true;
  if(key==='follow')return typeof value==='boolean';
  if(key==='patch')return Number.isInteger(value)&&value>=1&&value<=9;
  if(key==='random'||key==='empty')return value===true;
  if(key==='route')return typeof value==='string'&&/^(so|re|po|go|pe):(so|re|po|go|pe|\*)$/.test(value);
  if(key==='row')return typeof value==='string'&&/^(so|re|po|go|pe):(kind:[A-Z]{3,5}|interval:-?\d{1,2}|time:\d{2,4}|count:\d{1,2})$/.test(value);
 }
 return false;
}
