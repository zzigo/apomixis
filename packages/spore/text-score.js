import { CATALOG } from './catalog.js';
import { ENGINE_VERSION, canonicalJSON, validateSporeScore } from './score.js';
// Closed declarative grammar: no eval, imports, scripts, URLs or device commands.
export function parseSporeText(text) {
  if (typeof text !== 'string' || text.length > 65536 || new TextEncoder().encode(text).byteLength > 65536) throw new Error('SPORE text exceeds 64 KiB');
  const lines = text.split(/\r?\n/); if (lines.length > 1024) throw new Error('SPORE text exceeds 1024 lines');
  const score = { schemaVersion: 1, kind: 'spore-score', status: 'draft', generatorVersion: ENGINE_VERSION, timeUnit: 'seconds', sections: [], harmonicityCurve: [], fertility: { open: {}, close: {} }, voiceBindings: {}, couplings: {}, audition: { kind: 'additive-study', logicalStopsVerified: false }, provenance: { source: 'references/spore/sketch-v2.html', sourceVersion: 2, sourcePitchC4: 60 } };
  let current = null, magic = false, lineNumber = 0; const headers = new Set(), fields = new Set();
  const fail = message => { throw new Error(`Line ${lineNumber}: ${message}`); };
  const number = token => { if (!/^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test(token || '')) fail('Expected finite decimal number'); const n = Number(token); if (!Number.isFinite(n)) fail('Nonfinite number'); return n; };
  const voice = token => { if (!Object.hasOwn(score.voiceBindings, token)) fail(`Unknown voice ${token}`); return score.voiceBindings[token].division; };
  const tokens = line => {
    const result = []; let remaining = line.trim();
    while (remaining) {
      const match = remaining.match(remaining[0] === '"' ? /^"(?:[^"\\]|\\.)*"/ : /^[^\s"]+/);
      if (!match) fail('Malformed quoted string');
      try { result.push(remaining[0] === '"' ? JSON.parse(match[0]) : match[0]); } catch { fail('Malformed quoted string'); }
      remaining = remaining.slice(match[0].length).trimStart();
    }
    return result;
  };
  const once = (set, key) => { if (set.has(key)) fail(`Duplicate ${key}`); set.add(key); };
  for (const line of lines) {
    lineNumber++; if (!line.trim() || line.trim().startsWith('#')) continue;
    const [key, ...args] = tokens(line);
    if (!magic) { if (key !== 'SPORE-SCORE' || args.length !== 1 || args[0] !== '1') fail('Expected SPORE-SCORE 1'); magic = true; continue; }
    if (key === 'section') {
      if (current || args.length !== 7 || args[3] !== 'to' || args[5] !== 'bpm') fail('section ID "Name" START to END bpm BPM');
      current = { id: args[0], name: args[1], start: number(args[2]), dur: number(args[4]) - number(args[2]), bpm: number(args[6]), regs: {}, couplers: [] };
      fields.clear(); continue;
    }
    if (key === 'end') {
      if (!current || args.length) fail('Unexpected end');
      for (const required of ['relation', 'rule', 'texture', 'mutation', 'field', 'cap', 'dispersion', 'polyembryony', 'tuber', 'swell', 'crescendo', 'couplings', 'bio']) if (!fields.has(required)) fail(`Missing section ${required}`);
      for (const binding of Object.values(score.voiceBindings)) { current.regs[binding.division] ||= []; if (current.hackRegs) current.hackRegs[binding.division] ||= []; }
      score.sections.push(current); current = null; continue;
    }
    if (current) {
      const simple = { relation: 'rel', texture: 'texture', bio: 'bio' }, numbers = { mutation: 'mu', cap: 'cap', dispersion: 'disp', polyembryony: 'poly', tuber: 'tuber', swell: 'swell', crescendo: 'cresc' };
      if (Object.hasOwn(simple, key)) { once(fields, key); if (args.length !== 1) fail('Expected one value'); current[simple[key]] = args[0]; }
      else if (Object.hasOwn(numbers, key)) { once(fields, key); if (args.length !== 1) fail('Expected one value'); current[numbers[key]] = number(args[0]); }
      else if (key === 'rule') { once(fields, key); if (args.length !== 2) fail('rule B.../S... "Label"'); [current.rule, current.ruleName] = args; }
      else if (key === 'field') { once(fields, key); current.field = args.map(number); }
      else if (key === 'couplings') { once(fields, key); current.couplers = args.length === 1 && args[0] === '-' ? [] : args; }
      else if (['hack', 'extinction'].includes(key)) { once(fields, key); if (args.length !== 1 || !['true', 'false'].includes(args[0])) fail('Expected true/false'); current[key] = args[0] === 'true'; }
      else if (['registers', 'hack-registers'].includes(key)) {
        if (args.length < 2) fail('registers $VOICE STOP... or -'); const d = voice(args[0]); once(fields, key + ':' + d);
        const target = key === 'registers' ? current.regs : (current.hackRegs ||= {}); target[d] = args.length === 2 && args[1] === '-' ? [] : args.slice(1);
      } else fail(`Unknown section directive ${key}`);
      continue;
    }
    const scalar = { id: 'scoreId', version: 'scoreVersion', title: 'title', number: 'numberId', duration: 'duration', seed: 'seed' };
    if (Object.hasOwn(scalar, key)) { once(headers, key); if (args.length !== 1) fail('Expected one header value'); score[scalar[key]] = ['duration', 'seed'].includes(key) ? number(args[0]) : args[0]; }
    else if (key === 'voice') {
      if (args.length !== 6 || !/^\$[A-Za-z][\w]{0,31}$/.test(args[0]) || args[1] !== '=' || args[3] !== 'range') fail('voice $NAME = DIVISION range LOW HIGH');
      once(headers, key + ':' + args[0]); if (!CATALOG.DIVS.includes(args[2]) || Object.values(score.voiceBindings).some(binding => binding.division === args[2])) fail('Each division needs a unique voice binding');
      const range = [number(args[4]), number(args[5])]; if (!range.every(Number.isInteger) || range[0] < 24 || range[1] > (args[2] === 'pe' ? 55 : 84) || range[1] - range[0] < 11) fail('Unsupported voice range');
      score.voiceBindings[args[0]] = { division: args[2], range };
    } else if (key === 'coupling') {
      if (args.length !== 7 || !/^[A-Za-z][\w-]{0,31}$/.test(args[0]) || args[1] !== '=' || args[3] !== '->' || args[5] !== 'transpose') fail('coupling NAME = $FROM -> $TO transpose N');
      once(headers, key + ':' + args[0]); const transpose = number(args[6]); if (![-12, 0, 12].includes(transpose)) fail('Coupling transpose must be -12, 0 or 12');
      score.couplings[args[0]] = { from: voice(args[2]), to: voice(args[4]), tr: transpose, fromVoice: args[2], toVoice: args[4], label: args[0], morph: transpose < 0 ? 'roots' : transpose > 0 ? 'shoot' : 'graft' };
    } else if (key === 'fertility') {
      if (args.length !== 3) fail('fertility $VOICE OPEN CLOSE'); const d = voice(args[0]); once(headers, key + ':' + d);
      score.fertility.open[d] = number(args[1]); score.fertility.close[d] = args[2] === 'end' ? score.duration : number(args[2]);
    } else if (key === 'harmonicity') {
      if (args.length !== 3) fail('harmonicity SECONDS "Mode" "Annotation"'); const mode = CATALOG.MODES.findIndex(m => m.key === args[1]); if (mode < 0) fail('Unknown harmonicity mode'); score.harmonicityCurve.push([number(args[0]), mode, args[2]]);
    } else if (key === 'audition-transpose') { once(headers, key); if (args.length !== 1) fail('Expected audition transpose'); score.audition.transposeSemitones = number(args[0]); }
    else if (key === 'source-sha256') { once(headers, key); if (args.length !== 1 || !/^[a-f0-9]{64}$/.test(args[0])) fail('Expected source SHA256'); score.provenance.sourceSha256 = args[0]; }
    else fail(`Unknown header directive ${key}`);
  }
  if (current) fail('Unclosed section');
  for (const required of ['id', 'version', 'title', 'number', 'duration', 'seed', 'audition-transpose', 'source-sha256']) if (!headers.has(required)) fail(`Missing header ${required}`);
  if (Object.keys(score.voiceBindings).length !== 5) fail('Declare one variable for each of the five divisions');
  return score;
}
export async function compileSporeText(text) {
  const raw = parseSporeText(text);
  const bytes = new TextEncoder().encode(canonicalJSON(raw));
  raw.contentHash = Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  return validateSporeScore(raw);
}
