import {KNOB,DIVISIONS} from './console.js';
import {CATALOG} from '../spore/catalog.js';
import {FAMILIES} from './families.js';
export const STOPS={
 go:{montre16:19,diapason8:20,fluteHarmonique8:21,dulciane8:22,bourdon8:23,prestant4:24,fluteDouce4:25,quinte223:26,octave2:27,fournitureV2:28,bombarde16:29,trompette8:30,clairon4:31},
 po:{bourdon16:37,principal8:38,salicional8:39,bourdon8:40,octave4:41,fluteOctaviante4:42,doublette2:43,cornetV8:44,pleinJeuIII113:45,clarinette8:46},
 re:{quintaton16:52,diapason8:53,fluteTraversiere8:54,violeDeGambe8:55,voixCeleste8:56,corDeNuit8:57,fluteOctaviante4:58,viole4:59,nazard223:60,octavin2:61,tierce135:62,pleinJeuIV223:63,basson16:64,trompetteH8:65,bassonHautbois8:66,voixHumaine8:67,soprano4:68},
 so:{seraphon8:73,tubaMagna16:74,tubaAnglais8:75},
 pe:{flute32:1,soubasse32:2,contrebasse16:3,violonbasse16:4,soubasse16:5,flute8:6,violoncelle8:7,bourdon8:8,principal4:9,contrebombarde32:10,bombarde16:11,trompette8:12,clairon4:13}
};
// Tuple FROM:TO:transpose supports renamed score variables/couplings.
export const COUPLERS={'go:pe:0':14,'po:pe:0':15,'re:pe:0':16,'re:pe:12':17,'so:pe:0':18,'po:go:0':33,'re:go:0':34,'re:go:-12':35,'so:go:0':36,'re:po:0':48,'so:po:0':49,'po:po:-12':50,'po:po:12':51,'so:re:0':70,'re:re:-12':71,'re:re:12':72};
export function registration(score,section,hack){
 const knobs=new Set(section.consoleKnobs||[]),aliases=[];
 for(const [division,keys] of Object.entries(section.regs))for(const key of keys)add(division,key);
 if(hack)for(const [division,keys] of Object.entries(section.hackRegs||{}))for(const key of keys)add(division,key);
 function add(division,key){const n=STOPS[division]?.[key];if(!n||!KNOB.has(n))throw new Error(`${score.title} / ${section.id}: unmapped stop ${division}.${key}`);knobs.add(n);const knob=KNOB.get(n);if(knob.alias)aliases.push(`${division}.${key} → ${n} ${knob.label} (${knob.alias})`);}
 for(const key of section.couplers){const c=score.couplings[key],n=c&&COUPLERS[`${c.from}:${c.to}:${c.tr}`];if(!n)throw new Error(`${score.title} / ${section.id}: no console coupling for ${key}`);knobs.add(n);}
 return {knobs:[...knobs].sort((a,b)=>a-b),aliases:[...new Set(aliases)]};
}

// Current console-label spellings and historical score aliases resolve reciprocally.
Object.assign(STOPS.go,{montre8:20});Object.assign(STOPS.po,{fluteTraversiere4:42});
Object.assign(STOPS.re,{fluteHarmonique8:54,claironHarmonique4:68});Object.assign(STOPS.so,{tuba8:75});Object.assign(STOPS.pe,{montre16:4});
const TREM={go:32,po:47,re:69};
const canonical=new Map();
for(const [division,stops]of Object.entries(STOPS))for(const [key,n]of Object.entries(stops))canonical.set(n,`${DIVISIONS[division].manual}.${key}`);
for(const [division,n]of Object.entries(TREM))canonical.set(n,`${DIVISIONS[division].manual}.tremolo`);
for(const [tuple,n]of Object.entries(COUPLERS)){const [from,to,tr]=tuple.split(':');canonical.set(n,`${DIVISIONS[from].manual}${tr==='0'?'':Number(tr)>0?'4':'16'}_${DIVISIONS[to].manual}`);}
export const consoleName=n=>canonical.get(n)||String(n);
function divisionId(prefix,score){return score.voiceBindings[prefix]?.division||Object.keys(DIVISIONS).find(d=>d===prefix.toLowerCase()||DIVISIONS[d].manual.toLowerCase()===prefix.toLowerCase());}
function resolveStop(token,scope,score){
 if(/^\d{1,2}$/.test(token)){const n=Number(token);if(!KNOB.has(n))throw new Error(`Unknown console knob ${token} (1–75)`);return n;}
 const qualified=/^(\$?[A-Za-z]+)[.:](\w+)$/.exec(token);let name=token,division=scope;
 if(qualified){division=divisionId(qualified[1],score);if(!division)throw new Error(`Unknown division ${qualified[1]}`);name=qualified[2];}
 const candidates=[];
 for(const [d,stops]of Object.entries(STOPS)){if(division&&d!==division)continue;for(const [key,n]of Object.entries(stops))if(key.toLowerCase()===name.toLowerCase())candidates.push(n);if(['tremolo','tremulant'].includes(name.toLowerCase())&&TREM[d])candidates.push(TREM[d]);}
 if(!division){for(const [key,c]of Object.entries(score.couplings)){if(key.toLowerCase()===name.toLowerCase()){const n=COUPLERS[`${c.from}:${c.to}:${c.tr}`];if(n)candidates.push(n);}}for(const [n,key]of canonical)if(KNOB.get(n).kind==='coupler'&&key.toLowerCase()===name.toLowerCase())candidates.push(n);}
 const matches=[...new Set(candidates)];if(matches.length===1)return matches[0];
 if(matches.length>1)throw new Error(`Ambiguous ${token}: use ${matches.map(consoleName).join(' / ')}`);
 throw new Error(`Unknown register ${token}`);
}
export function parseProgramExpression(line,score,previous){
 const match=/^\s*pgm(?:\s+(.*?))?\s*$/.exec(line);if(!match)throw new Error('Use pgm 32 43 +24 on one line');
 let body=(match[1]||'').trim();
 if(body.startsWith('{')&&body.endsWith('}'))body=body.slice(1,-1).trim();
 if(/[{}]/.test(body))throw new Error('Unbalanced pgm braces; braces are optional');
 const tokens=body.replace(/,/g,' ').trim().split(/\s+/).filter(Boolean),changes=[];let scope=null;
 for(const token of tokens){const prefix=/^(\$?[A-Za-z]+)\.$/.exec(token);if(prefix){scope=divisionId(prefix[1],score);if(!scope)throw new Error(`Unknown division ${prefix[1]}`);continue;}const family=/^([+-]?)(?:(\$?[A-Za-z]+)\.)?@(\w+)$/.exec(token);if(family){const list=Object.hasOwn(FAMILIES,family[3])?FAMILIES[family[3]]:null;if(!list)throw new Error(`Unknown register family or set @${family[3]}`);const within=family[2]?divisionId(family[2],score):scope;if(family[2]&&!within)throw new Error(`Unknown division ${family[2]}`);for(const n of list)if(!within||KNOB.get(n).division===within)changes.push({sign:family[1],n});continue;}const signed=/^([+-]?)(.+)$/.exec(token);changes.push({sign:signed[1],n:resolveStop(signed[2],scope,score)});}
 if(tokens.length&&!changes.length)throw new Error('pgm resolves to no register (empty division prefix or family)');
 // Unsigned entries define a complete base set, then signed edits apply in order.
 // With signed entries only, inherit the preceding section instead.
 const unsigned=changes.filter(c=>!c.sign),relative=changes.length>0&&unsigned.length===0;
 const next=new Set(relative?(previous?.consoleKnobs||(previous?registration(score,previous,false).knobs:[])):unsigned.map(c=>c.n));
 for(const {sign,n}of changes)if(sign==='-')next.delete(n);else if(sign==='+')next.add(n);
 return [...next].sort((a,b)=>a-b);
}
export function applyConsoleRegistration(score,section,knobs){
 section.consoleKnobs=knobs;section.regs=Object.fromEntries(CATALOG.DIVS.map(d=>[d,[]]));section.couplers=[];
 for(const n of knobs){const knob=KNOB.get(n);if(!knob)throw new Error(`Unknown console knob ${n}`);
  if(knob.kind==='coupler'){const tuple=Object.entries(COUPLERS).find(([,number])=>number===n)?.[0];if(!tuple)throw new Error(`Unmapped coupling ${n}`);const [from,to,tr]=tuple.split(':');let key=Object.keys(score.couplings).find(k=>{const c=score.couplings[k];return c.from===from&&c.to===to&&c.tr===Number(tr);});if(!key){key=`console_${n}`;let suffix=1;while(Object.hasOwn(score.couplings,key))key=`console_${n}_${suffix++}`;score.couplings[key]={from,to,tr:Number(tr),label:consoleName(n),morph:Number(tr)<0?'roots':Number(tr)>0?'shoot':'graft'};}section.couplers.push(key);
  }else if(knob.kind!=='tremulant'){const key=Object.keys(STOPS[knob.division]).find(k=>STOPS[knob.division][k]===n);if(!key)throw new Error(`Unmapped stop ${n}`);section.regs[knob.division].push(key);}
 }
}
