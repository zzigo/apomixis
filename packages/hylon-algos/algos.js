import {parseMeiosisAlgo,generateMeiosis} from './meiosis.js';
import {parseLabAlgo,generateLab,formatLabAlgo} from './lab.js';
// HYLON algorithm library: pure, seeded, stateless-per-tick note generators that a score
// section can invoke (`arp …`, `pedal …`) and the LIBRARY pod can audition with identical code.
// No I/O. Events use the shared MusicalEvent shape; routing happens in adapters.
import { CATALOG } from '../spore/catalog.js';

export const MANUALS = ['go', 'po', 're', 'so'];          // voice k → manual k % 4 (I, II, III, IV)
export const RATES = ['2/1', '1/1', '1/2', '1/3', '1/4', '1/6', '1/8', '1/12', '1/16', '1/24', '1/32', '1/64', '1/96', '1/128'];
export const DIRS = ['up', 'down', 'updown', 'random'];
export const LIMITS = { voices: 40, perManual: 10, calibre: 25, rint: 24, len: 32 };
const RANGE = { manual: [24, 84], pe: [24, 55] };

// dur: event length in time units (1 = one `rate` step); rdur: ± random % of dur;
// rexp: rhythmic expander 0 unison attacks … 1 total hocket; rer: random onset delay % of a step.
export const ARP_DEFAULT = { dir: 'up', pcs: null, step: 'harm', len: 8, root: 48, rate: '1/8', rand: 0, rint: 2, calibre: 0, voices: 4, rexp: 0, rer: 0, dur: 0.9, rdur: 0, vel: 80 };
const CELL_KEYS = ['dur', 'rate', 'div', 'at', 'repeat', 'gap', 'art', 'vel', 'tr'];
export const CELL_DEFAULT = { notes: [59, 62, 61, 64], durs: [1, 1, 1, 1.5], rate: '1/2', div: 'tutti', divs: ['go', 'po', 're', 'so', 'pe'], at: 0, repeat: 1, gap: 2, art: 0.95, vel: 90, tr: 0 };
export const PEDAL_DEFAULT = { mode: 'drone', notes: [36], rate: '1/2', dur: 0.9, rdur: 0, vel: 80 };

// Numbers or ramps "a->b" (linear across the section).
const ramp = (value, low, high, integer = true) => {
  if (String(value).includes('|')) { // juxtaposition list a|b|c: switches per arpeggio cycle, never interpolates
    const list = String(value).split('|').map(v => Number(v));
    if (list.length < 2 || list.length > 16 || list.some(n => !Number.isFinite(n) || n < low || n > high || (integer && !Number.isInteger(n)))) throw new Error(`Bad juxtaposition ${value} (${low}–${high})`);
    return { jux: list };
  }
  const parts = String(value).split('->');
  if (parts.length > 2 || parts.some(p => p === '' || !Number.isFinite(Number(p)))) throw new Error(`Bad value ${value}`);
  const nums = parts.map(Number);
  if (nums.some(n => n < low || n > high || (integer && !Number.isInteger(n)))) throw new Error(`Value ${value} outside ${low}–${high}`);
  return nums.length === 1 ? nums[0] : { from: nums[0], to: nums[1] };
};
const scale = (v, f) => typeof v !== 'object' ? v * f : v.jux ? { jux: v.jux.map(x => x * f) } : { from: v.from * f, to: v.to * f };
export const at = (value, phase, cycle = 0) => typeof value !== 'object' ? value : value.jux ? value.jux[((cycle % value.jux.length) + value.jux.length) % value.jux.length] : value.from + (value.to - value.from) * Math.min(1, Math.max(0, phase));
const fmt = value => typeof value !== 'object' ? String(value) : value.jux ? value.jux.join('|') : `${value.from}->${value.to}`;
const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
// Note names with C4 = 60 (B3 = 59, C#4 = 61), or plain MIDI numbers.
export function noteNumber(token) {
  if (/^\d{1,3}$/.test(token)) { const n = Number(token); if (n > 127) throw new Error(`Note ${token} > 127`); return n; }
  const m = /^([A-Ga-g])([#b]?)(-?\d)$/.exec(token); if (!m) throw new Error(`Bad note ${token}`);
  const n = PC[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  if (n < 0 || n > 127) throw new Error(`Note ${token} out of range`); return n;
}
const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const noteName = n => `${NAMES[n % 12]}${Math.floor(n / 12) - 1}`;
export function pitchClass(token) {
  if (/^\d{1,2}$/.test(token)) { const n = Number(token); if (n > 11) throw new Error(`pc ${token} > 11`); return n; }
  const m = /^([A-Ga-g])([#b]?)$/.exec(token); if (!m) throw new Error(`Bad pitch class ${token}`);
  return (PC[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? 11 : 0)) % 12;
}
const PC_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
// i-th chord tone at or above root (pitch-class set ladder, wraps by octaves).
export function chordTone(root, pcs, i) {
  const sorted = [...new Set(pcs)].sort((a, b) => ((a - root % 12 + 12) % 12) - ((b - root % 12 + 12) % 12));
  const k = sorted.length, octave = Math.floor(i / k), pc = sorted[((i % k) + k) % k];
  return root + ((pc - root % 12 + 12) % 12) + 12 * octave;
}
export const calibreSemitones = calibre => Math.max(0, Math.round(calibre) - 1); // 0,1 unison · 2 semitone · 3 M2 …
// Toroidal, pitch-class preserving: above the top it re-enters in the lowest octave, below the bottom in the highest.
export const torus = (note, [low, high]) => note > high ? low + (((note - low) % 12) + 12) % 12 : note < low ? high - (((high - note) % 12) + 12) % 12 : note;
export const rateBeats = rate => { const [a, b] = rate.split('/').map(Number); return 4 * a / b; }; // quarter = beat

export function parseAlgo(key, args) {
  if(key==='melody'||key==='cluster')return parseMeiosisAlgo(key,args,{noteNumber,rates:RATES,pitchClass});
  if(['chord','psalm','rhythmicon','bind','mass','bands','morph','hoquetus','parasite'].includes(key))return parseLabAlgo(key,args,{noteNumber,rates:RATES});
  const take = (i, name) => { if (i >= args.length) throw new Error(`${key}: ${name} needs a value`); return args[i]; };
  if (key === 'arp') {
    const p = { ...ARP_DEFAULT };
    for (let i = 0; i < args.length; i += 2) {
      const name = args[i], value = take(i + 1, name);
      if (name === 'dir') { if (!DIRS.includes(value)) throw new Error(`arp dir ${DIRS.join('|')}`); p.dir = value; }
      else if (name === 'step') p.step = value === 'harm' ? 'harm' : ramp(value, 0, 24);
      else if (name === 'pcs') p.pcs = value === '-' ? null : value.split(',').map(pitchClass);
      else if (name === 'len') p.len = ramp(value, 1, LIMITS.len);
      else if (name === 'root') p.root = ramp(value, 24, 96);
      else if (name === 'rate') { if (!RATES.includes(value)) throw new Error(`arp rate ${RATES.join(' ')}`); p.rate = value; }
      else if (name === 'rand') p.rand = ramp(value, 0, 100);
      else if (name === 'rint') p.rint = ramp(value, 0, LIMITS.rint);
      else if (name === 'calibre') p.calibre = ramp(value, 0, LIMITS.calibre);
      else if (name === 'voices') p.voices = ramp(value, 0, LIMITS.voices);
      else if (name === 'rexp') p.rexp = ramp(value, 0, 1, false);
      else if (name === 'rer') p.rer = ramp(value, 0, 100);
      else if (name === 'dur') p.dur = ramp(value, 0.05, 64, false);
      else if (name === 'rdur') p.rdur = ramp(value, 0, 100);
      else if (name === 'gate') p.dur = scale(ramp(value, 5, 100), .01);   // legacy gate %
      else if (name === 'vel') p.vel = ramp(value, 1, 127);
      else throw new Error(`arp: unknown parameter ${name}`);
    }
    return { kind: 'arp', params: p };
  }
  if (key === 'pedal') {
    const p = { ...PEDAL_DEFAULT, notes: [] }; const mode = args[0];
    if (!['drone', 'ostinato'].includes(mode)) throw new Error('pedal drone NOTE | pedal ostinato NOTE… rate R');
    p.mode = mode; let i = 1;
    while (i < args.length && /^\d+$/.test(args[i])) p.notes.push(ramp(args[i++], RANGE.pe[0], RANGE.pe[1]));
    if (!p.notes.length || p.notes.length > 16 || (mode === 'drone' && p.notes.length > 4)) throw new Error('pedal: 1–4 drone notes or 1–16 ostinato notes (24–55)');
    for (; i < args.length; i += 2) {
      const name = args[i], value = take(i + 1, name);
      if (name === 'rate') { if (!RATES.includes(value)) throw new Error(`pedal rate ${RATES.join(' ')}`); p.rate = value; }
      else if (name === 'dur') p.dur = ramp(value, 0.05, 64, false);
      else if (name === 'rdur') p.rdur = ramp(value, 0, 100);
      else if (name === 'gate') p.dur = scale(ramp(value, 5, 100), .01);   // legacy gate %
      else if (name === 'vel') p.vel = ramp(value, 1, 127);
      else throw new Error(`pedal: unknown parameter ${name}`);
    }
    return { kind: 'pedal', params: p };
  }
  if (key === 'cell') {
    // cell NOTE… [dur D…] rate R div tutti|manuals|go,po… at BEATS repeat N gap UNITS art A vel V tr T
    const p = { ...CELL_DEFAULT, notes: [], durs: [] }; let i = 0;
    while (i < args.length && !CELL_KEYS.includes(args[i])) p.notes.push(noteNumber(args[i++]));
    if (!p.notes.length || p.notes.length > 32) throw new Error('cell: 1–32 notes (B3, C#4 or MIDI)');
    for (; i < args.length;) {
      const name = args[i++];
      if (name === 'dur') { while (i < args.length && !CELL_KEYS.includes(args[i])) p.durs.push(ramp(args[i++], 0.05, 64, false)); continue; }
      const value = take(i++, name);
      if (name === 'rate') { if (!RATES.includes(value)) throw new Error(`cell rate ${RATES.join(' ')}`); p.rate = value; }
      else if (name === 'div') { const list = value === 'tutti' ? ['go', 'po', 're', 'so', 'pe'] : value === 'manuals' ? [...MANUALS] : value.split(','); if (!list.every(d => [...MANUALS, 'pe'].includes(d))) throw new Error('cell div tutti|manuals|go,po,re,so,pe'); p.div = value; p.divs = list; }
      else if (name === 'at') p.at = ramp(value, 0, 4096, false);
      else if (name === 'repeat') p.repeat = ramp(value, 1, 64);
      else if (name === 'gap') p.gap = ramp(value, 0, 64, false);
      else if (name === 'art') p.art = ramp(value, 0.05, 1.5, false);
      else if (name === 'vel') p.vel = ramp(value, 1, 127);
      else if (name === 'tr') p.tr = ramp(value, -24, 24);
      else throw new Error(`cell: unknown parameter ${name}`);
    }
    if (!p.durs.length) p.durs = p.notes.map(() => 1);
    if (p.durs.length !== p.notes.length) throw new Error('cell: one dur per note');
    return { kind: 'cell', params: p };
  }
  throw new Error(`Unknown algorithm ${key}`);
}
export function formatAlgo({ kind, params: p }) {
  if (kind === 'arp') return `arp dir ${p.dir}${p.pcs ? ` pcs ${p.pcs.map(c => PC_NAMES[c]).join(',')}` : ''} step ${fmt(p.step)} len ${fmt(p.len)} root ${fmt(p.root)} rate ${p.rate} rand ${fmt(p.rand)} rint ${fmt(p.rint)} calibre ${fmt(p.calibre)} voices ${fmt(p.voices)} rexp ${fmt(p.rexp)} rer ${fmt(p.rer)} dur ${fmt(p.dur)} rdur ${fmt(p.rdur)}`;
  if (kind === 'pedal') return `pedal ${p.mode} ${p.notes.map(fmt).join(' ')}${p.mode === 'ostinato' ? ` rate ${p.rate} dur ${fmt(p.dur)} rdur ${fmt(p.rdur)}` : ''}`;
  if (kind === 'chord') return formatLabAlgo({ kind, params: p }, noteName);
  if (kind === 'cell') return `cell ${p.notes.map(noteName).join(' ')} dur ${p.durs.map(fmt).join(' ')} rate ${p.rate} div ${p.div} at ${p.at} repeat ${p.repeat} gap ${p.gap} art ${p.art} tr ${p.tr}`;
  throw new Error('Unknown algorithm');
}
export function parseAlgoLine(line) {
  const tokens = String(line).trim().split(/\s+/); if (!['arp', 'pedal', 'cell'].includes(tokens[0])) return null;
  return parseAlgo(tokens[0], tokens.slice(1));
}

// Interval for `step harm` from the harmonicity mode index (first non-zero slot interval).
export function modeInterval(modeIndex) {
  const mode = CATALOG.MODES[Math.max(0, Math.min(CATALOG.MODES.length - 1, Math.round(modeIndex)))];
  const first = (mode?.slots || []).flat().find(v => Number.isInteger(v) && v % 12 !== 0);
  return Number.isInteger(first) ? first % 12 || 12 : 12;
}
// Voices spread evenly over I–IV (counts differ by ≤1) in a seeded, slightly random order per block of 4.
export function manualOf(seed, index, k) {
  const order = [...MANUALS], block = Math.floor(k / 4);
  for (let j = 3; j > 0; j--) { const r = Math.floor(rand01(seed, index, block, j, 77) * (j + 1)); [order[j], order[r]] = [order[r], order[j]]; }
  return order[k % 4];
}
// Deterministic hash RNG: same (seed, layer, tick, voice) → same value, so seeking stays reproducible.
function rand01(...keys) { let h = 2166136261; for (const k of keys) { h = Math.imul(h ^ (k | 0), 16777619); h ^= h >>> 13; } h = Math.imul(h ^ (h >>> 16), 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967296; }

/** Generate note events for one algorithm in [fromMs, toMs).
 * section {id, start (s), dur (s), bpm}; harmAt(tSeconds) → mode index; voiceOf(division) → voice name. */
export function generate(algo, index, section, fromMs, toMs, { seed = 0, harmAt = () => 0, voiceOf = () => undefined, rangeOf = d => d === 'pe' ? RANGE.pe : RANGE.manual, entryMs = null, scoreEndMs = 1800000, vector = null } = {}) {
  if(algo.kind==='melody'||algo.kind==='cluster')return generateMeiosis(algo,index,section,fromMs,toMs,{seed,voiceOf,rangeOf,entryMs,scoreEndMs});
  if(['chord','psalm','rhythmicon','bind','mass','bands','morph','hoquetus','parasite'].includes(algo.kind))return generateLab(algo,index,section,fromMs,toMs,{seed,voiceOf,rangeOf,scoreEndMs,vector});
  const events = [], beat = 60 / section.bpm, p = algo.params, startMs = section.start * 1000, endMs = (section.start + section.dur) * 1000;
  const from = Math.max(fromMs, startMs), to = Math.min(toMs, endMs); if (to <= from) return events;
  const tickMs = rateBeats(p.rate) * beat * 1000;
  const phaseAt = ms => section.dur > 0 && Number.isFinite(section.dur) ? (ms - startMs) / (section.dur * 1000) : 0;
  const push = (id, ms, division, note, vel, durMs) => events.push({ eventId: `algo:${section.id}:${index}:${id}`, sourceId: `algo:${algo.kind}`, atSessionMs: ms, division, kind: 'note', payload: { voice: voiceOf(division), note, velocity: Math.max(1, Math.min(127, Math.round(vel))), durationMs: Math.max(10, durMs), sceneId: section.id } });
  if (algo.kind === 'cell') {
    const unit = rateBeats(p.rate) * beat * 1000, durs = p.durs.map(d => at(d, 0)), length = durs.reduce((a, b) => a + b, 0);
    const begin = startMs + at(p.at, 0) * beat * 1000;
    for (let r = 0; r < p.repeat; r++) {
      let cum = 0;
      p.notes.forEach((n, i) => {
        const ms = begin + (r * (length + p.gap) + cum) * unit; cum += durs[i];
        if (ms < from || ms >= to) return;
        for (const division of p.divs) push(`c${r}n${i}${division}`, ms, division, torus(n + p.tr, rangeOf(division)), p.vel, durs[i] * unit * p.art);
      });
    }
    return events;
  }
  if (algo.kind === 'pedal' && p.mode === 'drone') {
    // One held note per section: at the section start, or at the entry point after a seek.
    let t = null;
    if (startMs >= fromMs && startMs < toMs) t = startMs;
    else if (entryMs !== null && fromMs === entryMs && entryMs > startMs && entryMs < endMs) t = entryMs;
    if (t !== null) p.notes.forEach((n, i) => push(`drone${i}`, t, 'pe', Math.round(at(n, phaseAt(t))), at(p.vel, phaseAt(t)), endMs - t));
    return events;
  }
  const first = Math.ceil((from - startMs) / tickMs - 1e-9), last = Math.ceil((to - startMs) / tickMs - 1e-9);
  for (let tick = first; tick < last; tick++) {
    const ms = startMs + tick * tickMs, phase = phaseAt(ms), baseDur = tickMs * at(p.dur, phase), rdur = at(p.rdur, phase) / 100;
    const durFor = (...keys) => Math.min(600000, Math.max(10, baseDur * (1 + (rand01(seed, index, tick, ...keys, 5) * 2 - 1) * rdur)));
    if (algo.kind === 'pedal') { const n = p.notes[tick % p.notes.length]; push(`o${tick}`, ms, 'pe', torus(Math.round(at(n, phase)), rangeOf('pe')), at(p.vel, phase), durFor(0)); continue; }
    const len = Math.max(1, Math.round(at(p.len, phase))), cycle = Math.floor(tick / len), step = p.step === 'harm' ? modeInterval(harmAt(ms / 1000)) : Math.round(at(p.step, phase, cycle));
    let position;
    if (p.dir === 'up') position = tick % len;
    else if (p.dir === 'down') position = len - 1 - (tick % len);
    else if (p.dir === 'updown') { const cycle = Math.max(1, 2 * len - 2); const k = tick % cycle; position = len === 1 ? 0 : k < len ? k : cycle - k; }
    else position = Math.floor(rand01(seed, index, tick, 999) * len);
    const voices = Math.min(LIMITS.voices, Math.max(0, Math.round(at(p.voices, phase, cycle)))), spacing = calibreSemitones(at(p.calibre, phase, cycle));
    const randPct = at(p.rand, phase), rint = Math.round(at(p.rint, phase)), rexp = at(p.rexp, phase), rer = at(p.rer, phase) / 100;
    // Rhythmic expander: each voice gets a distinct slot inside the step (seeded order per step);
    // rexp scales the displacement: 0 all voices attack together, 1 no two voices attack together.
    const slots = Array.from({ length: voices }, (_, k) => k);
    for (let j = voices - 1; j > 0; j--) { const r = Math.floor(rand01(seed, index, tick, j, 41) * (j + 1)); [slots[j], slots[r]] = [slots[r], slots[j]]; }
    for (let k = 0; k < voices; k++) {
      const division = manualOf(seed, index, k);
      const root = Math.round(at(p.root, phase)), base = p.pcs ? chordTone(root, p.pcs, position) : root + position * step;
      let note = base + k * spacing;
      if (rint > 0 && rand01(seed, index, tick, k, 1) * 100 < randPct) { const off = 1 + Math.floor(rand01(seed, index, tick, k, 2) * rint); note += rand01(seed, index, tick, k, 3) < .5 ? -off : off; }
      // RE%: extra random delay per voice, up to rer × one step (never earlier than the step).
      const onset = ms + (voices > 1 ? rexp * tickMs * slots[k] / voices : 0) + rer * tickMs * rand01(seed, index, tick, k, 9);
      push(`t${tick}v${k}`, onset, division, torus(note, rangeOf(division)), at(p.vel, phase), durFor(k));
    }
  }
  return events;
}
