import { CATALOG } from './catalog.js';
export const ENGINE_VERSION = 'spore-0.1.0';
export function canonicalJSON(value) {
  return JSON.stringify(value, (_, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)) : v);
}
export function validateSporeScore(raw) {
  const fail = message => { throw new Error(`Invalid SPORE score: ${message}`); };
  const couplings = raw?.couplings || CATALOG.COUPLERS;
  for (const value of Object.values(couplings)) if (!CATALOG.DIVS.includes(value.from) || !CATALOG.DIVS.includes(value.to) || ![-12, 0, 12].includes(value.tr)) fail('coupling definition');
  const finite = (value, low, high) => typeof value === 'number' && Number.isFinite(value) && value >= low && value <= high;
  if (!raw || raw.schemaVersion !== 1 || raw.kind !== 'spore-score' || raw.generatorVersion !== ENGINE_VERSION || raw.timeUnit !== 'seconds' || raw.status !== 'draft' || raw.duration !== 300 || !/^[a-f0-9]{64}$/.test(raw.contentHash || '')) fail('incompatible version, duration or hash');
  if (!Number.isInteger(raw.seed) || !finite(raw.seed, 0, 0xffffffff) || typeof raw.scoreId !== 'string' || raw.scoreId.length > 128 || typeof raw.scoreVersion !== 'string' || raw.scoreVersion.length > 64) fail('identity or seed');
  if (!raw.voiceBindings || Object.keys(raw.voiceBindings).length !== 5 || new Set(Object.values(raw.voiceBindings).map(v => v.division)).size !== 5) fail('voice bindings');
  for (const [name, binding] of Object.entries(raw.voiceBindings)) if (!/^\$[A-Za-z][\w]{0,31}$/.test(name) || !CATALOG.DIVS.includes(binding.division) || !Array.isArray(binding.range) || binding.range.length !== 2 || !binding.range.every(Number.isInteger) || binding.range[0] < 24 || binding.range[1] > (binding.division === 'pe' ? 55 : 84) || binding.range[1] - binding.range[0] < 11) fail('voice range');
  if (Object.keys(couplings).length > 64) fail('too many couplings');
  if (!Array.isArray(raw.sections) || raw.sections.length !== 5) fail('five sections required');
  let end = 0; const ids = new Set();
  for (const section of raw.sections) {
    if (typeof section.id !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(section.id) || ids.has(section.id) || section.start !== end || !finite(section.dur, 1, 300) || !finite(section.bpm, 12, 240) || !Number.isInteger(section.cap) || !finite(section.cap, 1, 32)) fail('section order, duration or tempo');
    ids.add(section.id); end += section.dur;
    if (!/^B[0-8]*\/S[0-8]*$/.test(section.rule) || !Object.hasOwn(CATALOG.TEX, section.texture)) fail('rule or texture');
    for (const key of ['mu', 'disp', 'poly', 'tuber', 'swell', 'cresc']) if (!finite(section[key], 0, 1)) fail(key);
    if (!Array.isArray(section.field) || !section.field.length || section.field.length > 12 || section.field.some(p => !Number.isInteger(p) || p < 0 || p > 11)) fail('pitch-class field');
    for (const regs of [section.regs, section.hackRegs].filter(Boolean)) {
      if (!regs || Object.keys(regs).some(d => !CATALOG.DIVS.includes(d))) fail('division');
      for (const d of CATALOG.DIVS) if (!Array.isArray(regs[d]) || regs[d].length > 32 || regs[d].some(key => !CATALOG.STOPS[d].some(stop => stop[0] === key))) fail('logical stop');
    }
    if (!section.regs || !Array.isArray(section.couplers) || section.couplers.length > 32 || section.couplers.some(c => !Object.hasOwn(couplings, c))) fail('registration or couplers');
  }
  if (end !== raw.duration) fail('section total');
  const curve = raw.harmonicityCurve; let previous = -1;
  if (!Array.isArray(curve) || curve.length < 2 || curve.length > 512) fail('harmonicity curve');
  for (const row of curve) {
    if (!Array.isArray(row) || row.length !== 3 || !finite(row[0], 0, 300) || row[0] < previous || !finite(row[1], 0, CATALOG.MODES.length - 1) || typeof row[2] !== 'string') fail('harmonicity breakpoint');
    previous = row[0];
  }
  if (curve[0][0] !== 0 || previous !== 300) fail('harmonicity coverage');
  for (const key of ['open', 'close']) for (const d of CATALOG.DIVS) if (!finite(raw.fertility?.[key]?.[d], 0, 1e9)) fail('fertility');
  if (![0, 12].includes(raw.audition?.transposeSemitones)) fail('audition octave');
  return structuredClone(raw);
}
export function harmonicityAt(score, t) {
  const curve = score.harmonicityCurve;
  if (t <= curve[0][0]) return curve[0][1];
  for (let i = 0; i < curve.length - 1; i++) { const [a, x] = curve[i], [b, y] = curve[i + 1]; if (t >= a && t < b && b > a) return x + (y - x) * (t - a) / (b - a); }
  return curve.at(-1)[1];
}
