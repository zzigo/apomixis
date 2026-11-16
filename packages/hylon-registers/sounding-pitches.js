import {KNOB} from './console.js';
import {CATALOG} from '../spore/catalog.js';
const DIV={1:'go',2:'po',3:'re',4:'so',5:'pe'};
const COUPLERS={14:['go','pe',0],15:['po','pe',0],16:['re','pe',0],17:['re','pe',12],18:['so','pe',0],33:['po','go',0],34:['re','go',0],35:['re','go',-12],36:['so','go',0],48:['re','po',0],49:['so','po',0],50:['po','po',-12],51:['po','po',12],70:['so','re',0],71:['re','re',-12],72:['re','re',12]};
const MIXTURES={28:'fournitureV2',44:'cornetV8',45:'pleinJeuIII113',63:'pleinJeuIV223'};
export const FOOT_COLORS=Object.freeze({f32:'#ff4d5e',f16:'#ff9d3a',f8:'#b6ffcf',f4:'#5fd6ff',f2:'#a98bff',mut:'#ff2bd6',mix:'#ffe14a',aux:'#4c5e54'});
function feet(text){const parts=text.split(' ');return parts.reduce((sum,part)=>{const [a,b]=part.split('/').map(Number);return sum+(b?a/b:a);},0);}
// Eight-foot unison: MIDI C4=60 is the written pitch.
// Manual visual compass C2–C7 =36–96; pedal C1–G3 =24–55.
// Incoming MIDI and legacy scores are never shifted to fit the visual compass.
// Mixture ranks are catalogue models, not measured breaks or recorded spectra.
export function soundingPitches(note,channel,active){
 const division=DIV[channel];if(!division)return [];
 const paths=[{division,transpose:0}];
 for(const n of active){const c=COUPLERS[n];if(c?.[1]===division)paths.push({division:c[0],transpose:c[2]});}
 const results=[];
 for(const path of paths)for(const n of active){const knob=KNOB.get(n);if(!knob||knob.division!==path.division||!['stop','mixture'].includes(knob.kind))continue;
  const ranks=knob.kind==='mixture'?CATALOG.COMPOUND[MIXTURES[n]]:[8/feet(knob.foot)];
  if(!Array.isArray(ranks))continue;
  for(const ratio of ranks){if(!(ratio>0))continue;const pitch=note+path.transpose+12*Math.log2(ratio),rounded=Math.round(pitch);
   results.push({pitch:rounded,cents:Math.round((pitch-rounded)*1000)/10,color:FOOT_COLORS[knob.cls],knob:n,label:knob.label,mixture:knob.kind==='mixture'});
  }
 }
 return results;
}
