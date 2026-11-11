import { CATALOG } from './catalog.js';
import { ENGINE_VERSION, validateSporeScore, harmonicityAt } from './score.js';
export { ENGINE_VERSION };
// Pure bounded generator: no DOM, clocks, AudioContext, MIDI, USB or network.
export function createSporeGenerator(inputScore, { seed = inputScore.seed } = {}) {
  const score = validateSporeScore(inputScore);
  const { W, STRATA, DIVS, INT, RH, PARTNER, MODES } = CATALOG, H = STRATA * DIVS.length;
  const BAND = Object.fromEntries(DIVS.map((d, i) => [d, { div: d, r0: i * STRATA, idx: i }]));
  const SECTIONS = score.sections, OPEN = score.fertility.open, CLOSE = score.fertility.close, ATTACK_BUDGET = 45;
  const ranges = Object.fromEntries(Object.values(score.voiceBindings).map(binding => [binding.division, binding.range]));
  const fertile = (d, t) => t >= OPEN[d] && t < CLOSE[d];
  const RULES = Object.fromEntries(SECTIONS.map(section => { const [, birth, survival] = section.rule.match(/B(\d*)\/S(\d*)/); return [section.rule, { b: new Set([...birth].map(Number)), s: new Set([...survival].map(Number)) }]; }));
  let options = { texture: 'auto', polyembryony: true, harmonicity: null }, journal = [], running = false, disposed = false;
  const pickMode = () => { const p = options.harmonicity ?? harmonicityAt(score, S.tNext), lo = Math.floor(p), hi = Math.min(MODES.length - 1, lo + 1); return rng() < p - lo ? hi : lo; };
  const shuffle = values => { for (let i = values.length - 1; i > 0; i--) { const j = ri(i + 1); [values[i], values[j]] = [values[j], values[i]]; } return values; };
function mulberry32(a){const next = function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}; next.state = () => a >>> 0; return next;}
let rng = mulberry32(1);
const ri = n => Math.floor(rng()*n);
const gauss = () => (rng()+rng()+rng()-1.5)/1.5;

function encode(g){                            // 32 bits → 16 bases
  let v=0; const push=(x,b)=>{v=v*2**b+x};
  g.m.forEach(x=>push(x,3)); g.r.forEach(x=>push(x,3));
  push(g.reg,3); push(g.tim,3); push(g.dor,3); push(g.vec,2); push(g.emb,2); push(g.hack,1); push(0,1);
  let s=''; for (let i=15;i>=0;i--) s+='ACGT'[Math.floor(v/4**i)%4];
  return s.replace(/(.{4})(?=.)/g,'$1·');
}
// hack must stay the LAST slot (it is excluded outside the Climax)
const SLOTS = [['m',0,8],['m',1,8],['m',2,8],['m',3,8],['r',0,8],['r',1,8],['reg',null,8],['tim',null,8],['dor',null,8],['vec',null,4],['emb',null,4],['hack',null,2]];
const SLOTNAME = ['motif0','motif1','motif2','motif3','rhythm0','rhythm1','register','timbre','dormancy','vector','embryo','hack'];


let S;
const valid = (r,c) => { const range = ranges[divOf(r)]; return 24+c >= range[0] && 24+c <= range[1]; };
const divOf = r => DIVS[Math.floor(r/STRATA)];
const secAt = t => { for (let i=SECTIONS.length-1;i>=0;i--) if (t>=SECTIONS[i].start) return i; return 0; };
const pcIn = (n,f) => f.includes(((n%12)+12)%12);
const cloneG = g => ({m:[...g.m], r:[...g.r], reg:g.reg, tim:g.tim, dor:g.dor, vec:g.vec, emb:g.emb, hack:g.hack});

function reset(seed){
  rng = mulberry32(seed);
  S = {seed, gen:0, tNext:0, si:0, grid:new Int32Array(W*H).fill(-1), age:new Int16Array(W*H), born:new Uint8Array(W*H),
       genomes:[], hist:[], events:[], allEvents:[], mutations:[], lastNotes:0, lastSats:0, ended:false, counts:new Map(), bucket:new Map()};
  // seed genome: cell C-D-F-G, rhythm 1 / 1/2, vortex vector, embryo +1 (semitone shadow on the Récit)
  S.genomes.push({id:0, g:{m:[3,4,6,7], r:[5,2], reg:3, tim:0, dor:0, vec:3, emb:1, hack:0}, parent:null, gen:0, slot:null});
  const r0 = BAND.go.r0+1, c0 = 29;                         // R-pentomino ("methuselah") in the GO band
  [[1,0],[2,0],[0,1],[1,1],[1,2]].forEach(([dc,dr])=>{ const i=(r0+dr)*W+c0+dc; S.grid[i]=0; S.born[i]=1; });
  measure();
}
function fitness(gid, c, sec){
  const G=S.genomes[gid].g; let k=0;
  for (const m of G.m) if (pcIn(24+c+INT[m], sec.field)) k++;
  return k/4;                                               // hack is selectively neutral
}
function mutate(pid, sec){
  if (S.genomes.length >= 20000 || rng() >= sec.mu) return pid;
  const g = cloneG(S.genomes[pid].g);
  const hp = sec.hack ? .25*Math.max(0,(S.tNext-sec.start)/sec.dur) : 0;
  const slot = (sec.hack && rng()<hp) ? SLOTS.length-1 : ri(sec.hack ? SLOTS.length : SLOTS.length-1);
  const [k,idx,n] = SLOTS[slot];
  if (idx===null){ let v; do v=ri(n); while (v===g[k]); g[k]=v; }
  else { let v; do v=ri(n); while (v===g[k][idx]); g[k][idx]=v; }
  const id = S.genomes.length;
  S.genomes.push({id, g, parent:pid, gen:S.gen, slot});
  S.mutations.push({t:S.tNext, gen:S.gen, id, parent:pid, slot:SLOTNAME[slot], dna:encode(g)});
  return id;
}
function place(r,c,gid,ng,na,nb){
  if (r<0||r>=H||c<0||c>=W||!valid(r,c)||!fertile(divOf(r),S.tNext)) return;
  const i=r*W+c; ng[i]=gid; na[i]=0; nb[i]=1;
}
function stepGen(sec){
  const rule=RULES[sec.rule], g=S.grid, t=S.tNext;
  const ng=new Int32Array(W*H).fill(-1), na=new Int16Array(W*H), nb=new Uint8Array(W*H), nbrs=new Int32Array(8);
  const fert = DIVS.map(d=>fertile(d,t));
  const p = (t-sec.start)/sec.dur;
  for (let r=0;r<H;r++){
    if (!fert[Math.floor(r/STRATA)]) continue;               // closed division: nothing lives there
    for (let c=0;c<W;c++){
      if (!valid(r,c)) continue;
      let n=0;
      for (let dr=-1;dr<=1;dr++) for (let dc=-1;dc<=1;dc++){
        if (!dr && !dc) continue; const rr=r+dr, cc=c+dc;
        if (rr<0||rr>=H||cc<0||cc>=W) continue;
        const v=g[rr*W+cc]; if (v>=0) nbrs[n++]=v;
      }
      const i=r*W+c, alive=g[i]>=0;
      if (alive && rule.s.has(n)){ ng[i]=g[i]; na[i]=S.age[i]+1; }
      else if (!alive && n>0 && rule.b.has(n)){
        let pid;
        if (sec.extinction){
          const cnt=new Map(); for (let k=0;k<n;k++) cnt.set(nbrs[k],(cnt.get(nbrs[k])||0)+1);
          pid=[...cnt.entries()].sort((a,b)=>b[1]-a[1]||a[0]-b[0])[0][0];
        } else {
          let tot=0; const w=[];
          for (let k=0;k<n;k++){ const f=fitness(nbrs[k],c,sec); w.push(f*f+.05); tot+=f*f+.05; }
          let x=rng()*tot, k=0; while (k<n-1 && (x-=w[k])>0) k++;
          pid=nbrs[k];
        }
        ng[i]=mutate(pid,sec); na[i]=0; nb[i]=1;
      }
    }
  }
  // dispersal vectors: 0 wind (neighbouring division), 1 host (any division, Climax), 2 ballistic, 3 vortex
  if (sec.disp>0 && rng()<sec.disp){
    const live=[]; for (let i=0;i<W*H;i++) if (ng[i]>=0) live.push(i);
    const k=1+ri(3);
    for (let j=0;j<k && live.length;j++){
      const i=live[ri(live.length)], r=Math.floor(i/W), c=i%W, gid=ng[i], G=S.genomes[gid].g, sgn=rng()<.5?-1:1;
      const bi=Math.floor(r/STRATA);
      if (G.vec===0){ const nb2=Math.max(0,Math.min(DIVS.length-1,bi+(rng()<.5?-1:1))); place(nb2*STRATA+ri(STRATA), c+sgn*ri(4), gid, ng,na,nb); }
      else if (G.vec===1){ if (sec.hack) place(ri(DIVS.length)*STRATA+ri(STRATA), ri(W), gid, ng,na,nb); }
      else if (G.vec===2){ place(r, c+sgn*(8+ri(13)), gid, ng,na,nb); }
      else { const cc=c+sgn*(4+ri(7)); for (const [a,b] of [[0,0],[0,1],[1,0],[1,1]]) place(r+a, cc+b, gid, ng,na,nb); }
    }
  }
  // colonisation pulse: a newly opened division receives a few propagules from its neighbour band
  for (const d of DIVS){
    if (t>=OPEN[d] && t-OPEN[d] < 60/sec.bpm && OPEN[d]>0){
      const bi=BAND[d].idx, src=[]; for (const nbI of [bi-1,bi+1]) if (nbI>=0 && nbI<DIVS.length)
        for (let r=nbI*STRATA;r<nbI*STRATA+STRATA;r++) for (let c=0;c<W;c++) if (ng[r*W+c]>=0) src.push(r*W+c);
      for (let k=0;k<6 && src.length;k++){ const s=src[ri(src.length)], c=s%W, r0=BAND[d].r0+ri(STRATA);
        for (const [a,b] of [[0,0],[0,1],[1,0],[1,1],[0,2]]) place(r0+a, c+b, ng[s], ng,na,nb); }
    }
  }
  if (sec.extinction){
    const pd=.03+.3*p*p;
    for (let i=0;i<W*H;i++) if (ng[i]>=0 && rng()<pd) ng[i]=-1;
    if (p>.8){
      const cnt=new Map(); for (let i=0;i<W*H;i++) if (ng[i]>=0) cnt.set(ng[i],(cnt.get(ng[i])||0)+1);
      const dom=[...cnt.entries()].sort((a,b)=>b[1]-a[1])[0];
      if (dom) for (let i=0;i<W*H;i++) if (ng[i]>=0 && ng[i]!==dom[0]) ng[i]=-1;
    }
    if (!ng.some(v=>v>=0)){                                  // one survivor passes to GAMETO
      for (const d of ['go','pe']) { const b=BAND[d]; for (let i=b.r0*W;i<(b.r0+STRATA)*W;i++) if (g[i]>=0){ ng[i]=g[i]; break; } if (ng.some(v=>v>=0)) break; }
    }
  }
  S.grid=ng; S.age=na; S.born=nb;
}
function measure(){
  const cnt=new Map(); let pop=0; const perDiv={so:0,re:0,po:0,go:0,pe:0};
  for (let i=0;i<W*H;i++){ const v=S.grid[i]; if (v>=0){ pop++; perDiv[divOf(Math.floor(i/W))]++; cnt.set(v,(cnt.get(v)||0)+1); } }
  let Hb=0; for (const k of cnt.values()){ const q=k/pop; Hb-=q*Math.log2(q); }
  S.pop=pop; S.geno=cnt.size; S.H=pop?Hb:0; S.counts=cnt; S.perDiv=perDiv;
  S.hist.push({t:S.tNext, H:S.H, pop, geno:cnt.size, perDiv:{...perDiv}});
}

/* ================================================================ textural functions */
function quant(n,f){ for (const d of [0,1,-1,2,-2,3,-3,4,-4,5,-5,6]) if (pcIn(n+d,f)) return n+d; return n; }
const RANGE = d => ranges[d];
function fold(n,d){ const [lo,hi]=RANGE(d); while (n<lo) n+=12; while (n>hi) n-=12; return n; }   // keeps n mod 12
const hasRegs = (sec,d) => (sec.regs[d]||[]).length>0;
function euclid(n,k,rot){ const out=[]; for (let i=0;i<n;i++) out.push((Math.floor(i*k/n)+rot)%k); return out; }

function makeNotes(sec){
  const tex = options.texture === 'auto' ? sec.texture : options.texture, beatSec = 60/sec.bpm;
  const cands=[];
  for (let i=0;i<W*H;i++){
    const gid=S.grid[i]; if (gid<0) continue;
    const G=S.genomes[gid].g; if (S.age[i] !== (G.dor%4)) continue;   // dormancy gene delays expression
    const c=i%W, r=Math.floor(i/W), d=divOf(r);
    if (!hasRegs(sec,d)) continue;
    cands.push({i,c,r,div:d,gid,fit:fitness(gid,c,sec)});
  }
  cands.sort((a,b)=>b.fit-a.fit || a.i-b.i);
  let list=cands;
  if (tex==='tutti' && cands.length){
    const cnt=new Map(); cands.forEach(x=>cnt.set(x.gid,(cnt.get(x.gid)||0)+1));
    const dom=[...cnt.entries()].sort((a,b)=>b[1]-a[1])[0][0];
    list=cands.filter(x=>x.gid===dom).concat(cands.filter(x=>x.gid!==dom));
  }
  // round-robin across divisions (each list keeps its fitness/tutti order): growth is heard in every manual
  const byDiv={}; for (const x of list) (byDiv[x.div]=byDiv[x.div]||[]).push(x);
  const out=[], dOrder=DIVS.filter(d=>byDiv[d]);
  while (out.length<sec.cap && dOrder.some(d=>byDiv[d].length)) for (const d of dOrder){ if (out.length>=sec.cap) break; if (byDiv[d].length) out.push(byDiv[d].shift()); }
  const seen=new Set();
  let notes = out.map(x=>{
    const G=S.genomes[x.gid].g;
    return {div:x.div, midi:fold(quant(24+x.c+INT[G.m[S.gen%4]], sec.field), x.div), gid:x.gid, hack:!!(sec.hack&&G.hack), rh:RH[G.r[0]], rh2:RH[G.r[1]], emb:G.emb};
  }).filter(n=>{const k=n.div+n.midi; if (seen.has(k)) return false; seen.add(k); return true;});

  // --- onsets: irregular by design
  if (tex==='tutti'){
    notes.forEach(n=>{ n.on=Math.abs(gauss())*.18; n.dur=Math.min(3.2,Math.max(.75,n.rh*1.6))*(.7+.6*rng()); });
  } else if (tex==='striated'){
    const SUB={go:4,po:5,re:3,so:7,pe:2}, gr={}; notes.forEach(n=>(gr[n.div]=gr[n.div]||[]).push(n));
    for (const d in gr){ const k=SUB[d], rot=(S.gen*(d.charCodeAt(0)%5+1))%k, sl=euclid(gr[d].length,k,rot);
      gr[d].forEach((n,j)=>{ n.on=(sl[j]+(j>=k?.5:0))/k; n.dur=(.55+.4*rng())/k*(rng()<.18?3:1); }); }
  } else if (tex==='hocket'){
    const gr={}; notes.forEach(n=>(gr[n.div]=gr[n.div]||[]).push(n));
    const order=[], ds=shuffle(Object.keys(gr));
    while (ds.some(d=>gr[d].length)) for (const d of ds) if (gr[d].length) order.push(gr[d].shift());
    const wts=order.map(n=>n.rh2+.15), tot=wts.reduce((a,b)=>a+b,0), span=1+.6*rng(); let acc=0;
    order.forEach((n,j)=>{ const sl=wts[j]/tot*span; n.on=acc; n.dur=sl*(.45+.3*rng()); acc+=sl; }); notes=order;
  } else {
    const centers=[...Array(1+ri(3))].map(()=>rng());
    notes.forEach(n=>{ const c=centers[ri(centers.length)]; n.on=Math.max(0,Math.min(1.15,c+gauss()*.09)); n.dur=.03*Math.pow(8,rng()); });
  }

  // --- tuber: a long sustained note from the oldest cell of PE or RE (crosses generation boundaries)
  if (rng()<sec.tuber){
    let best=-1, ba=-1;
    for (const d of ['pe','re']){ if (!hasRegs(sec,d) || best>=0) continue; const b=BAND[d];     // pedal first, Récit as fallback
      for (let i=b.r0*W;i<(b.r0+STRATA)*W;i++) if (S.grid[i]>=0 && S.age[i]>ba){ ba=S.age[i]; best=i; } }
    if (best>=0){ const gid=S.grid[best], G=S.genomes[gid].g, d=divOf(Math.floor(best/W));
      notes.push({div:d, midi:fold(quant(24+best%W, sec.field), d), gid, hack:false, rh:2, emb:G.emb, on:rng()*.8, dur:3+4*rng(), tuber:true}); }
  }

  // --- polyembryony: adventitious embryos on other manuals, intervals given by the HARMONICITY mode
  let sats=[];
  if (options.polyembryony) for (const n of notes){
    const M=MODES[pickMode()], ns=M.slots.length, slots=[];
    if (n.emb) slots.push((n.emb-1)%ns);
    if (rng()<sec.poly){ const rest=[...Array(ns).keys()].filter(s=>!slots.includes(s)); if (rest.length) slots.push(rest[ri(rest.length)]); }
    for (const s of slots){
      let d=PARTNER[n.div][s];
      if (!hasRegs(sec,d) || d===n.div){ const alt=DIVS.filter(x=>x!==n.div && x!=='pe' && hasRegs(sec,x)); if (!alt.length) continue; d=alt[ri(alt.length)]; }
      M.slots[s].forEach((iv,j)=>{
        const delay=(.005+.085*rng()+j*.025)/beatSec;     // 5–90 ms behind the mother, chords slightly rolled
        sats.push({div:d, midi:fold(n.midi+iv,d), gid:n.gid, hack:n.hack, sat:iv, mode:M.key, on:n.on+delay, dur:n.dur*(.6+.7*rng()), pmidi:n.midi, pon:n.on});
      });
    }
  }
  const budget=Math.max(0, Math.floor(ATTACK_BUDGET*beatSec)-notes.length);   // keep total attacks under budget
  if (sats.length>budget) sats=sats.slice(0,budget);
  return {notes:notes.concat(sats), tex, nPrim:notes.length, nSat:sats.length};
}

  const validateOptions = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => !Object.hasOwn(options, k))) throw new Error('Unknown SPORE option');
    const result = { ...options, ...value };
    if (!['auto', ...Object.keys(CATALOG.TEX)].includes(result.texture) || typeof result.polyembryony !== 'boolean' || (result.harmonicity !== null && (!Number.isFinite(result.harmonicity) || result.harmonicity < 0 || result.harmonicity > MODES.length - 1))) throw new Error('Invalid SPORE option');
    return result;
  };
  function configure(value) {
    if (disposed) throw new Error('SPORE disposed'); options = validateOptions(value);
    if (journal.at(-1)?.generation === S.gen) journal.pop();
    journal.push({ generation: S.gen, options: { ...options } });
  }
  function nextGeneration() {
    S.si = secAt(S.tNext); const sec = SECTIONS[S.si], beat = 60 / sec.bpm, generation = S.gen, result = [];
    if (S.gen > 0) { stepGen(sec); measure(); }
    const { notes, tex, nPrim, nSat } = makeNotes(sec); S.lastNotes = nPrim; S.lastSats = nSat; S.lastTex = tex;
    if (!generation || secAt(Math.max(0, S.tNext - beat)) !== S.si) result.push({ eventId: `spore:g${generation}:scene`, sourceId: 'spore', generationId: generation, atSessionMs: S.tNext * 1000, division: null, kind: 'scene', payload: { sceneId: sec.id, stops: structuredClone(sec.regs), couplers: [...sec.couplers], swell: sec.swell, crescendo: sec.cresc, verified: false } });
    notes.forEach((note, index) => {
      const t = S.tNext + note.on * beat, bucket = Math.floor(t * 2), count = S.bucket.get(bucket) || 0;
      if (t >= score.duration || (note.sat && count >= ATTACK_BUDGET / 2)) { if (note.sat) S.lastSats--; return; }
      S.bucket.set(bucket, count + 1);
      const duration = Math.min(note.dur * beat, score.duration - t);
      const ev = { t, d: duration, midi: note.midi, div: note.div, hack: note.hack, gen: generation, gid: note.gid, sec: sec.id, tex, sat: note.sat || 0, mode: note.mode || null, tuber: !!note.tuber, pt: note.sat ? S.tNext + note.pon * beat : null, pm: note.sat ? note.pmidi : null };
      S.events.push(ev); if (S.allEvents.length < 60000) S.allEvents.push(ev);
      result.push({ eventId: `spore:g${generation}:n${index}`, sourceId: 'spore', generationId: generation, atSessionMs: t * 1000, division: note.div, kind: 'note', payload: { voice: Object.keys(score.voiceBindings).find(name => score.voiceBindings[name].division === note.div), note: note.midi, velocity: 80, durationMs: duration * 1000, sceneId: sec.id, lineageId: note.gid, satellite: note.sat || 0, mode: note.mode || null, hack: !!note.hack, tuber: !!note.tuber } });
    });
    for (const bucket of S.bucket.keys()) if (bucket < Math.floor(S.tNext * 2) - 4) S.bucket.delete(bucket);
    S.gen++; S.tNext += beat; S.ended = S.tNext >= score.duration;
    if (S.events.length > 4000) S.events.splice(0, S.events.length - 4000);
    return result;
  }
  function step({ endMs, maxGenerations = 32 }) {
    if (!Number.isFinite(endMs) || endMs < 0 || endMs > score.duration * 1000 || !Number.isInteger(maxGenerations) || maxGenerations < 1 || maxGenerations > 512) throw new Error('Invalid SPORE step window');
    const events = []; let count = 0;
    if (running && !disposed) while (S.tNext * 1000 <= endMs && S.tNext < score.duration && count++ < maxGenerations) events.push(...nextGeneration());
    events.sort((a, b) => a.atSessionMs - b.atSessionMs || (Number(a.kind !== 'scene') - Number(b.kind !== 'scene') || (a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0)));
    return { events, done: S.ended, budgetExhausted: running && S.tNext * 1000 <= endMs && S.tNext < score.duration };
  }
  function resetSeed(nextSeed = S?.seed ?? seed) {
    if (!Number.isInteger(nextSeed) || nextSeed < 0 || nextSeed > 0xffffffff) throw new Error('SPORE seed must be uint32');
    reset(nextSeed); journal = [{ generation: 0, options: { ...options } }]; running = false;
  }
  function snapshot() { return { schemaVersion: 1, engineVersion: ENGINE_VERSION, scoreHash: score.contentHash, seed: S.seed, generation: S.gen, rngState: rng.state(), commands: structuredClone(journal) }; }
  function restore(value) {
    if (!value || !Number.isInteger(value.seed) || value.seed < 0 || value.seed > 0xffffffff || value.schemaVersion !== 1 || value.engineVersion !== ENGINE_VERSION || value.scoreHash !== score.contentHash || !Number.isInteger(value.generation) || value.generation < 0 || value.generation > 1201 || !Number.isInteger(value.rngState) || !Array.isArray(value.commands) || value.commands.length > 1202 || Object.keys(value).some(k => !['schemaVersion', 'engineVersion', 'scoreHash', 'seed', 'generation', 'rngState', 'commands'].includes(k))) throw new Error('Invalid or incompatible SPORE snapshot');
    const candidate = createSporeGenerator(score, { seed: value.seed }); candidate.start(); let previous = -1, command = 0;
    for (const row of value.commands) { if (!Number.isInteger(row.generation) || row.generation <= previous || row.generation > value.generation) throw new Error('Invalid SPORE command journal'); previous = row.generation; candidate.validateOptions(row.options); }
    while (candidate.view().gen < value.generation) {
      if (value.commands[command]?.generation === candidate.view().gen) candidate.configure(value.commands[command++].options);
      const before = candidate.view().gen; candidate.step({ endMs: Math.min(score.duration * 1000, candidate.view().tNext * 1000), maxGenerations: 1 });
      if (candidate.view().gen === before) throw new Error('Snapshot generation exceeds score');
    }
    if (value.commands[command]?.generation === value.generation) candidate.configure(value.commands[command++].options);
    if (candidate.snapshot().rngState !== value.rngState) throw new Error('SPORE replay state mismatch');
    S = structuredClone(candidate.view()); options = candidate.options; journal = structuredClone(value.commands); rng = mulberry32(value.rngState); running = false;
  }
  resetSeed(seed);
  return { id: 'spore', version: ENGINE_VERSION, score, configure, validateOptions, reset: resetSeed, step, snapshot, restore,
    init() { return this; }, start() { if (disposed) throw new Error('SPORE disposed'); running = true; }, stop() { running = false; }, dispose() { running = false; disposed = true; },
    // Borrowed read-only view for local renderers; use snapshot() for persistence.
    view: () => S, get options() { return { ...options }; }
  };
}
