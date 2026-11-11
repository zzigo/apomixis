import { CATALOG } from './catalog.js';
// Additive study, not isolated Klais samples. One shared HYLON context and bus.
export function createSporeAudition(AC, destination, score) {
  const {STOPS,COMPOUND}=CATALOG, COUPLERS=score.couplings, WAVES={}, voices=new Set();
  let activeOsc=0, disposed=false, dropped=0;
  const master=AC.createGain(); master.gain.value=.5; master.connect(destination);
  const mk=a=>{ const re=new Float32Array(a.length+1), im=new Float32Array(a.length+1); a.forEach((v,i)=>im[i+1]=v); return AC.createPeriodicWave(re,im); };
  WAVES.principal=mk([1,.5,.32,.18,.1,.06]); WAVES.flute=mk([1,.12,.04]); WAVES.stopped=mk([1,0,.22,0,.07]);
  WAVES.string=mk([...Array(14)].map((_,i)=>.6/Math.pow(i+1,.9))); WAVES.celeste=WAVES.string;
  WAVES.reed=mk([...Array(18)].map((_,i)=>1/(i+1))); WAVES.mutation=WAVES.flute; WAVES.compound=WAVES.principal;
const mtof = m => 440*Math.pow(2,(m-69)/12);
function voicesFor(note, sec){
  const keys=[...(sec.regs[note.div]||[])];
  if (note.hack && sec.hackRegs) keys.push(...(sec.hackRegs[note.div]||[]));
  const v=keys.map(k=>({k, div:note.div, tr:0}));
  for (const ck of sec.couplers){ const C=COUPLERS[ck]; if (C.to!==note.div) continue; for (const k of (sec.regs[C.from]||[])) v.push({k, div:C.from, tr:C.tr}); }
  return v;
}
function playNote(note, when, durSec, sec){
  if (disposed) return 0;
  const parts=[];
  for (const v of voicesFor(note,sec)){
    const st=STOPS[v.div].find(s=>s[0]===v.k); if (!st) continue;
    for (const h of (COMPOUND[v.k]||[st[2]])){ const f=mtof(note.midi+score.audition.transposeSemitones+v.tr)*h; if (f>18 && f<8000) parts.push({f, fam:st[3], div:v.div}); }
    if (st[3]==='celeste'){ const f=mtof(note.midi+score.audition.transposeSemitones+v.tr)*st[2]*1.0045; if (f<8000) parts.push({f, fam:'celeste', div:v.div}); }  // detuned rank
  }
  if (!parts.length || activeOsc+parts.length>280) { dropped++; return 0; }
  const lvl=(.085+.06*sec.cresc)/Math.sqrt(parts.length+2)*(note.sat?.7:1)*(note.tuber?.8:1);
  const att=note.tuber?.12:.018, rel=note.tuber?.25:.09, d=Math.max(durSec,att+.01);
  for (const p of parts){
    const o=AC.createOscillator(), g=AC.createGain();
    o.setPeriodicWave(WAVES[p.fam]); o.frequency.value=p.f;
    const famG=p.fam==='reed'?.8:(p.fam==='string'||p.fam==='celeste')?.55:1;
    const sw=(p.div==='po'||p.div==='re')?.35+.65*sec.swell:1;
    const L=lvl*famG*sw;
    g.gain.setValueAtTime(0,when); g.gain.linearRampToValueAtTime(L,when+att); g.gain.setValueAtTime(L,when+d); g.gain.linearRampToValueAtTime(0,when+d+rel);
    o.connect(g); g.connect(master); o.start(when); o.stop(when+d+rel+.02);
    activeOsc++; const voice = { o, g }; voices.add(voice); o.onended=()=>{ if (!voices.delete(voice)) return; activeOsc--; o.disconnect(); g.disconnect(); };
  }
  return parts.length;
}

  function stop() {
    for (const voice of voices) {
      const now=AC.currentTime; voice.g.gain.cancelScheduledValues(now); voice.g.gain.setTargetAtTime(0,now,.002);
      try { voice.o.stop(now+.01); } catch {}
    }
  }
  return {
    dispatch(event,{when,durationSeconds}) {
      if(disposed||event.kind!=='note')return;
      const section=score.sections.find(s=>s.id===event.payload.sceneId); if(!section)throw new Error('Unknown SPORE scene');
      if(!Number.isInteger(event.payload.note)||event.payload.note<0||event.payload.note>127||!CATALOG.DIVS.includes(event.division)||!Number.isFinite(when)||when<0||!Number.isFinite(durationSeconds)||durationSeconds<=0||durationSeconds>30)throw new Error('Invalid audition time');
      return playNote({midi:event.payload.note,div:event.division,hack:event.payload.hack,sat:event.payload.satellite,tuber:event.payload.tuber},when,durationSeconds,section);
    }, stop, stats:()=>({activeOsc,dropped}),
    dispose(){if(disposed)return;stop();disposed=true;for(const voice of voices){voice.o.disconnect();voice.g.disconnect();}voices.clear();activeOsc=0;master.disconnect();}
  };
}
