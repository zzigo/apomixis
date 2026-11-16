import {registration,consoleName} from './score-registration.js';
import {compileSporeText} from '../spore/text-score.js';
import {KNOB} from './console.js';
// Explicit editorial correspondence with console.js, never MIDI/SysEx addresses.
// Legacy stop-list aliases remain visible in the preparation sheet.
const number=n=>String(n).padStart(4,'0');
export const registrationSignature=knobs=>[...knobs].sort((a,b)=>a-b).join(',');
const mmss=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
// Manual-recall numbering (composer, 2026-11-14): the console has ten buttons 0–9 and < > steps;
// changing the ten takes longer. So the bank is rebuilt from zero, each piece owns its ten(s)
// (piece NN starts at NN0 when free), and inside a piece numbers follow first appearance: the
// next new registration is one > away and an A-B-A-B alternation sits on neighbouring buttons.
// A set repeated inside a piece reuses its number; the same set in another piece gets its own.
export async function generateScorePrograms(sources){
 const files=Object.keys(sources).filter(f=>/^\d+-.*\.txt$/i.test(f)&&Number(f.split('-')[0])>0).sort((a,b)=>Number(a.split('-')[0])-Number(b.split('-')[0])||a.localeCompare(b));
 if(!files.length)throw new Error('No numbered piece scores found (01- and above)');
 const compiled=[];
 for(const file of files){try{compiled.push({file,score:await compileSporeText(sources[file])});}catch(error){throw new Error(`${file}: ${error.message}`);}}
 const programs={},combinations=new Map(),cues=[],pieces=[];let free=0;
 for(const {file,score} of compiled){
  const base=Math.max(Math.ceil(free/10)*10,Number(file.split('-')[0])*10),bySignature=new Map();let cursor=base;
  for(const section of score.sections){
   const variants=[false];if(section.hack&&section.hackRegs)variants.push(true);
   for(const hack of variants){
    const result=registration(score,section,hack),signature=registrationSignature(result.knobs);let key=bySignature.get(signature);
    if(key===undefined){if(cursor>9999)throw new Error('No free combination numbers');key=number(cursor++);programs[key]=result.knobs;bySignature.set(signature,key);}
    const cue={file,title:score.title,section:section.id,name:section.name,time:section.start,variant:hack?'conditional hack':'base',program:key,swell:section.swell,crescendo:section.cresc};
    cues.push(cue);
    if(!combinations.has(key))combinations.set(key,{program:key,knobs:result.knobs,aliases:[],cues:[]});
    const combination=combinations.get(key);combination.aliases=[...new Set([...combination.aliases,...result.aliases])];combination.cues.push(cue);
   }
  }
  pieces.push({file,title:score.title,first:base,last:cursor-1});free=cursor;
 }
 return {programs,created:combinations.size,manifest:{version:2,generatedAt:new Date().toISOString(),files:compiled.map(({file,score})=>({file,title:score.title,hash:score.contentHash})),pieces,combinations:[...combinations.values()].sort((a,b)=>Number(a.program)-Number(b.program)),cues}};
}
// Upcoming manual change for a playing score (pure): the next cue whose program differs from the
// current one, the seconds until it, and whether the changes ahead alternate between two programs.
export function nextProgramChange(manifest,file,seconds){
 const cues=(manifest?.cues||[]).filter(c=>c.file===file&&c.variant==='base').sort((a,b)=>a.time-b.time);if(!cues.length)return null;
 let i=0;while(i+1<cues.length&&cues[i+1].time<=seconds)i++;
 const current=Number(cues[i].program),changes=[];let last=current;
 for(let j=i+1;j<cues.length;j++){const n=Number(cues[j].program);if(n!==last){changes.push({program:n,time:cues[j].time,section:cues[j].section,name:cues[j].name});last=n;}}
 if(!changes.length)return null;
 // Loop: this change and the following ones only move between two programs (8-7-8-7).
 let turns=1;while(turns<changes.length&&changes[turns].program===(turns%2?current:changes[0].program))turns++;
 const next=changes[0];
 return {current,next:next.program,inSeconds:next.time-seconds,section:next.section,name:next.name,loop:turns>=3,turns,sameTen:Math.floor(current/10)===Math.floor(next.program/10),step:next.program-current};
}
// Program the organ must show at a score position (base cues): what to prepare before play.
export function programAt(manifest,file,seconds){
 const cues=(manifest?.cues||[]).filter(c=>c.file===file&&c.variant==='base').sort((a,b)=>a.time-b.time);if(!cues.length)return null;
 let i=0;while(i+1<cues.length&&cues[i+1].time<=seconds)i++;
 return {program:Number(cues[i].program),section:cues[i].section,name:cues[i].name,time:cues[i].time};
}
export function programPreparationText(manifest){
 const lines=['APOMIXIS / REGISTRATION PREPARATION','Source: numbered app TXT files plus the active applied score; INIT and unapplied editor drafts excluded.','Local preparation only. No SysEx or Program Change sent by generation.','Full stop sets include couplers. Each piece owns its ten(s); inside a piece numbers follow first appearance and a repeated set reuses its number.','Hands: buttons 0–9 and < > inside a ten are fast; a change of ten is marked SLOW below.','Conditional hack variants are alternatives, not scheduled changes.','Swell/crescendo are cue annotations, not draw-knob programs.','Console aliases listed below require operator review.',''];
 for(const entry of manifest.combinations){lines.push(`PROGRAM ${Number(entry.program).toString().padStart(2,'0')}`);for(const n of entry.knobs){const knob=KNOB.get(n);lines.push(`  ${n} / ${knob.division.toUpperCase()} / ${knob.label} / ${consoleName(n)}`);}if(!entry.knobs.length)lines.push('  All registers OFF');for(const alias of entry.aliases)lines.push(`  ALIAS: ${alias}`);for(const cue of entry.cues)lines.push(`  ${cue.file} / ${cue.section} ${cue.name} / ${mmss(cue.time)} / ${cue.variant}`);lines.push('');}
 if(manifest.pieces){lines.push('PIECES');for(const p of manifest.pieces)lines.push(`${p.file} / ${p.title} / programs ${String(p.first).padStart(2,'0')}–${String(p.last).padStart(2,'0')}${p.last-p.first>9?' / MORE THAN ONE TEN':''}`);lines.push('');}
 lines.push('SCORE CUES');let before=null;for(const cue of manifest.cues){if(cue.variant==='base'){if(before&&before.file===cue.file&&before.program!==cue.program&&Math.floor(Number(before.program)/10)!==Math.floor(Number(cue.program)/10))lines.push(`  SLOW: change of ten ${Number(before.program)} → ${Number(cue.program)} (${Math.round(cue.time-before.time)} s after the previous cue)`);before=cue;}}
 for(const cue of manifest.cues)lines.push(`${cue.file} / ${mmss(cue.time)} / ${cue.section} ${cue.name} / ${cue.variant} → ${Number(cue.program).toString().padStart(2,'0')} / swell ${cue.swell} / crescendo ${cue.crescendo}`);
 return lines.join('\n')+'\n';
}
