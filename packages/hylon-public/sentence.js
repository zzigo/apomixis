// `public`: one section sentence that writes what an audience gesture means.
// The grammar follows G. Spencer-Brown, Laws of Form (1969):
//   mark     the gesture draws a distinction (hold-and-release, or tap)
//   into     the space the mark is drawn in (divisions), with `keys top N` as its content
//   call MS  law of calling: a mark made again within MS is the same mark (condensation)
//   cross    law of crossing: a mark that meets a sounding mark cancels it (or queue | pass)
//   reenter  re-entry: marks still in memory displace the keys of the next one by STEP semitones each
// Example: public mark hold into go,po keys top 3 call 250 cross cancel reenter 2 memory 8 passes 1->3 ms 22 gap 28 feel 12->40
// With no parameters it reproduces the first-performance burst (01 SPORE, November 2026).
// Pure module: no clock, no MIDI, no DOM. Times are seconds unless the name says ms.
const DIVS = ['go', 'po', 're', 'so', 'pe'], CHANNEL = { go: 1, po: 2, re: 3, so: 4, pe: 5 };
export const PUBLIC_KEYS = ['mark', 'into', 'keys', 'call', 'cross', 'reenter', 'memory', 'passes', 'ms', 'gap', 'feel'];
const defaults = () => ({ mark: 'hold', into: ['go', 'po'], keys: 3, call: 0, cross: 'queue', reenter: 0, memory: 8, passes: [1, 3], ms: 22, gap: 28, feel: [0, 0] });
export function parsePublic(args) {
  if (args.length === 1 && args[0] === 'off') return { off: true };
  const spec = defaults(), seen = new Set();
  const real = (token, low, high, name) => { const n = Number(token); if (!/^\d+(?:\.\d+)?$/.test(token || '') || n < low || n > high) throw new Error(`public ${name} ${low}–${high}`); return n; };
  const ramp = (token, low, high, name) => { const parts = String(token || '').split('->'); if (parts.length > 2) throw new Error(`public ${name} A or A->B`); const a = real(parts[0], low, high, name); return [a, parts.length === 2 ? real(parts[1], low, high, name) : a]; };
  for (let i = 0; i < args.length;) {
    const key = args[i++]; if (!PUBLIC_KEYS.includes(key)) throw new Error(`Unknown public parameter ${key}`);
    if (seen.has(key)) throw new Error(`Duplicate public ${key}`); seen.add(key);
    const value = args[i++]; if (value === undefined) throw new Error(`public ${key}: missing value`);
    if (key === 'mark') { if (!['hold', 'tap'].includes(value)) throw new Error('public mark hold | tap'); spec.mark = value; }
    else if (key === 'into') { const list = value.split(','); if (!list.length || list.length > 5 || new Set(list).size !== list.length || list.some(d => !DIVS.includes(d))) throw new Error('public into go,po,re,so,pe'); spec.into = list; }
    else if (key === 'keys') { if (value !== 'top') throw new Error('public keys top N'); spec.keys = real(args[i++], 1, 12, 'keys top'); if (!Number.isInteger(spec.keys)) throw new Error('public keys top: integer'); }
    else if (key === 'call') spec.call = real(value, 0, 5000, 'call (ms)');
    else if (key === 'cross') { if (!['cancel', 'queue', 'pass'].includes(value)) throw new Error('public cross cancel | queue | pass'); spec.cross = value; }
    else if (key === 'reenter') { spec.reenter = real(value, 0, 12, 'reenter (semitones)'); if (!Number.isInteger(spec.reenter)) throw new Error('public reenter: integer semitones'); }
    else if (key === 'memory') spec.memory = real(value, 0.5, 120, 'memory (s)');
    else if (key === 'passes') { spec.passes = ramp(value, 1, 8, 'passes'); if (!spec.passes.every(Number.isInteger)) throw new Error('public passes: integers'); }
    else if (key === 'ms') spec.ms = real(value, 5, 2000, 'ms');
    else if (key === 'gap') spec.gap = real(value, 10, 2000, 'gap (ms)');
    else if (key === 'feel') spec.feel = ramp(value, 0, 200, 'feel (ms)');
  }
  return spec;
}
// The form keeps the only state the sentence needs: when the last mark was accepted, until when
// a mark sounds, and which marks are still in memory. `mark(now, charge)` returns one action:
//   {type:'call'}                       condensed into the previous mark
//   {type:'cancel'}                     crossed a sounding mark: both return to the unmarked state
//   {type:'pass'}                       dropped
//   {type:'sound', start, depth, …}     to be played; depth = marks in memory when it was made
export function createPublicForm(spec) {
  let accepted = -Infinity, until = -Infinity, memory = [];
  const stats = { marks: 0, called: 0, crossed: 0, passed: 0, sounded: 0 };
  function mark(now, charge = 0) {
    stats.marks++; const c = Math.max(0, Math.min(1, spec.mark === 'tap' ? 0 : Number(charge) || 0));
    memory = memory.filter(t => now - t < spec.memory);
    if (now - accepted < spec.call / 1000) { stats.called++; return { type: 'call' }; }
    accepted = now; let start = now + .02;
    if (now < until) {
      if (spec.cross === 'cancel') { until = now; memory.pop(); stats.crossed++; return { type: 'cancel' }; }
      if (spec.cross === 'pass' || until - now > 2) { stats.passed++; return { type: 'pass' }; }
      start = until;
    }
    const depth = memory.length, passes = Math.round(spec.passes[0] + (spec.passes[1] - spec.passes[0]) * c), count = passes * spec.keys * spec.into.length;
    until = start + count * spec.gap / 1000 + .04; memory.push(now); stats.sounded++;
    return { type: 'sound', start, depth, offset: depth * spec.reenter, passes, charge: c, count };
  }
  return { spec, mark, stats, reset() { accepted = until = -Infinity; memory = []; } };
}
// Notes of one sounding mark, relative to its start. rangeOf(div) → [low, high] of that division.
export function publicNotes(spec, action, rangeOf) {
  const cells = [];
  for (let k = 0; k < spec.keys; k++) for (const div of spec.into) {
    const [low, high] = rangeOf(div), room = Math.max(1, high - low - spec.keys + 2);
    cells.push({ div, channel: CHANNEL[div], midi: high - (action.offset % room) - k });
  }
  const notes = []; let i = 0;
  for (let p = 0; p < action.passes; p++) for (const cell of p % 2 ? [...cells].reverse() : cells) notes.push({ ...cell, at: i++ * spec.gap / 1000, dur: spec.ms / 1000 });
  return notes;
}
// Haptic pulse (ms) the listener's device gives when the mark is released; 0 = none.
export const publicFeel = (feel, charge) => Array.isArray(feel) ? Math.round(feel[0] + (feel[1] - feel[0]) * Math.max(0, Math.min(1, charge))) : 0;
