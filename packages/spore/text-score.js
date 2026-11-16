import {parseProgramExpression,applyConsoleRegistration} from '../hylon-registers/score-registration.js';
import { CATALOG } from './catalog.js';
import { parseAlgo } from '../hylon-algos/algos.js';
import { parseLaserCue } from '../hylon-laser/score-cue.js';
import { parseImpro } from '../hylon-impro/model.js';
import { parsePublic } from '../hylon-public/sentence.js';
import { FOLLOWER_INTERVALS } from '../hylon-audio/follower-matrix.js';
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
  // Text macros: `set NAME = tokens…` in the header; `@NAME` (or +@NAME / -@NAME inside pgm) expands
  // to those tokens anywhere below. Unknown @names are left for pgm's built-in register families.
  const sets = new Map(), FOLLOW_DIV = { i: 1, ii: 2, iii: 3, iv: 4, p: 5, go: 1, po: 2, re: 3, so: 4, pe: 5 };
  const expand = line => !line.includes('@') || /^\s*(bio|verse|relation|title)\b/.test(line) ? line : line.replace(/(^|\s)([+-]?)@([A-Za-z]\w*)/g, (whole, lead, sign, name) => sets.has(name) ? lead + sets.get(name).map(token => sign && !/^[+-]/.test(token) && !/\.$/.test(token) ? sign + token : token).join(' ') : whole);
  for (const rawLine of lines) {
    lineNumber++; if (!rawLine.trim() || rawLine.trim().startsWith('#')) continue;
    const line = expand(rawLine); if (line.length > 16384) fail('Line too long after @set expansion');
    const [key, ...args] = tokens(line);
    // SPORE-SCORE 1 and HYLON-SCORE 1 share this grammar (HYLON = generic work score, e.g. GAMETE).
    if (!magic) { if (!['SPORE-SCORE', 'HYLON-SCORE'].includes(key) || args.length !== 1 || args[0] !== '1') fail('Expected SPORE-SCORE 1 or HYLON-SCORE 1'); score.format = key; if (key === 'HYLON-SCORE') score.provenance = { source: 'hylon-score-text', sourcePitchC4: 60 }; magic = true; continue; }
    if (key === 'section') {
      // section ID "Name" START to END bpm BPM   |   section ID "Name" for SECONDS bpm BPM (starts where the previous one ends)
      const relative = args.length === 6 && args[2] === 'for' && args[4] === 'bpm';
      if (current || !(relative || (args.length === 7 && args[3] === 'to' && args[5] === 'bpm'))) fail('section ID "Name" START to END bpm BPM  or  section ID "Name" for SECONDS bpm BPM');
      const begin = relative ? score.sections.reduce((sum, s) => sum + s.dur, 0) : number(args[2]);
      current = { id: args[0], name: args[1], start: begin, dur: relative ? number(args[3]) : number(args[4]) - begin, bpm: number(args[relative ? 5 : 6]), regs: {}, couplers: [] };
      fields.clear(); continue;
    }
    if (key === 'end') {
      if (!current || args.length) fail('Unexpected end');
      if(fields.has('pgm')){try{const knobs=parseProgramExpression(current.pgmExpression,score,score.sections.at(-1));applyConsoleRegistration(score,current,knobs);delete current.pgmExpression;fields.add('couplings');}catch(error){fail(error.message);}}
      if (current.native === false) {
        // Native SPORE notes muted: genetics run silently with neutral defaults for omitted fields.
        const defaults = { relation: ['rel', '-'], rule: null, texture: ['texture', 'tutti'], mutation: ['mu', 0], field: ['field', [0, 2, 4, 5, 7, 9, 11]], cap: ['cap', 4], dispersion: ['disp', 0], polyembryony: ['poly', 0], tuber: ['tuber', 0], swell: ['swell', 0.5], crescendo: ['cresc', 0.3], couplings: ['couplers', []], bio: ['bio', ''] };
        for (const [name, pair] of Object.entries(defaults)) if (!fields.has(name)) { fields.add(name); if (name === 'rule') { current.rule = 'B3/S23'; current.ruleName = 'LIFE'; } else current[pair[0]] = structuredClone(pair[1]); }
      }
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
      else if(key==='pgm'){if([...fields].some(k=>k==='couplings'||k.startsWith('registers:')))fail('Use pgm or registers/couplings in a section, not both');once(fields,'pgm');current.pgmExpression=line.trim();}
      else if (key === 'couplings') {if(fields.has('pgm'))fail('pgm already defines couplings'); once(fields, key); current.couplers = args.length === 1 && args[0] === '-' ? [] : args; }
      else if (['hack', 'extinction'].includes(key)) { once(fields, key); if (args.length !== 1 || !['true', 'false'].includes(args[0])) fail('Expected true/false'); current[key] = args[0] === 'true'; }
      else if (['registers', 'hack-registers'].includes(key)) {
        if(key==='registers'&&fields.has('pgm'))fail('pgm already defines the register set');
        if (args.length < 2) fail('registers $VOICE STOP... or -'); const d = voice(args[0]); once(fields, key + ':' + d);
        const target = key === 'registers' ? current.regs : (current.hackRegs ||= {}); target[d] = args.length === 2 && args[1] === '-' ? [] : args.slice(1);
      } else if (key === 'native') {
        once(fields, key); if (args.length !== 1 || !['on', 'off'].includes(args[0])) fail('native on|off'); current.native = args[0] === 'on';
      } else if (key === 'laser') {
        once(fields, key); try { current.laser = parseLaserCue(args); } catch (error) { fail(error.message); }
      } else if (key === 'silence') {
        // silence AT DUR [AT DUR…] (seconds from the section start)  |  silence every BEATS dur SECONDS [offset BEATS]
        const list = current.silences ||= [];
        if (args[0] === 'every') {
          if (![4, 6].includes(args.length) || args[2] !== 'dur' || (args.length === 6 && args[4] !== 'offset')) fail('silence every BEATS dur SECONDS [offset BEATS]');
          const every = number(args[1]), dur = number(args[3]), offset = args.length === 6 ? number(args[5]) : 0;
          if (!(every >= .25 && every <= 512 && dur >= .01 && dur <= 30 && offset >= 0 && offset <= 512)) fail('silence every .25–512 beats, dur .01–30 s');
          list.push({ every, dur, offset });
        } else {
          if (!args.length || args.length % 2) fail('silence AT DUR [AT DUR…]');
          for (let i = 0; i < args.length; i += 2) { const at = number(args[i]), dur = number(args[i + 1]); if (!(at >= 0 && dur >= .01 && dur <= 60)) fail('silence AT ≥ 0, DUR .01–60 s'); list.push({ at, dur }); }
        }
        if (list.length > 64) fail('At most 64 silence windows per section');
      } else if (key === 'cresc' || key === 'exp3' || key === 'exp2') {
        // Manual performance gestures, shown in the header preview (never sent as MIDI):
        //   cresc 0->0.7   crescendo pedal      exp3 0.2->1   expression box of III (exp2: II)
        //   exp3 0.4       hold a position      exp3 0.2~0.8 6   undulate between two positions every 6 s
        once(fields, key); const unit = token => { const n = number(token); if (!(n >= 0 && n <= 1)) fail(`${key} positions are 0 (closed) … 1 (open)`); return n; };
        let gesture;
        if (args.length === 2 && args[0].includes('~')) { const [low, high] = args[0].split('~'), period = number(args[1]); if (!(period >= .5 && period <= 120)) fail(`${key} A~B PERIOD-SECONDS (.5–120)`); gesture = { kind: 'wave', from: unit(low), to: unit(high), period }; }
        else if (args.length === 1 && args[0].includes('->')) { const [from, to] = args[0].split('->'); gesture = { kind: 'ramp', from: unit(from), to: unit(to) }; }
        else if (args.length === 1) gesture = { kind: 'hold', from: unit(args[0]), to: unit(args[0]) };
        else fail(`${key} A->B | ${key} A | ${key} A~B PERIOD`);
        (current.gestures ||= {})[key] = gesture;
      } else if (key === 'verse') {
        // Sung / spoken text for the performer and the public viewer; "/" marks the psalm caesura.
        // verse at SECONDS "text": timed verse (absolute score seconds), e.g. aligned to a recorded tape.
        let text = args[0], time = null;
        if (args[0] === 'at') { if (args.length !== 3) fail('verse at SECONDS "text"'); time = number(args[1]); text = args[2]; if (!(time >= 0)) fail('verse at SECONDS must be ≥ 0'); }
        else if (args.length !== 1) fail('verse "text / text" | verse at SECONDS "text"');
        if (text.length > 240) fail('verse text too long (240)');
        current.verses ||= []; const timed = time !== null;
        if (current.verses.length && !!current.verseTimes !== timed) fail('Do not mix timed and untimed verses in one section');
        if (timed) { (current.verseTimes ||= []); if (current.verseTimes.length && time < current.verseTimes.at(-1)) fail('verse times must not decrease'); current.verseTimes.push(time); }
        current.verses.push(text); if (current.verses.length > 24) fail('At most 24 verses per section');
      } else if (key === 'follow') {
        // Mic-follower sends for this section: follow III 0 II 7 P -12 | follow off. Never enables the follower.
        once(fields, key); const sends = [];
        if (!(args.length === 1 && args[0] === 'off')) {
          if (!args.length || args.length % 2) fail('follow DIVISION SEMITONES … | follow off');
          for (let i = 0; i < args.length; i += 2) { const channel = FOLLOW_DIV[args[i].toLowerCase()], offset = number(args[i + 1]); if (!channel || !FOLLOWER_INTERVALS.some(row => row.semitones === offset)) fail(`follow: division I II III IV P and interval ${FOLLOWER_INTERVALS.map(r => r.semitones).filter(n => n >= 0).join(' ')} (±)`); sends.push(`${offset}:${channel}`); }
        }
        current.follow = [...new Set(sends)];
      } else if (key === 'public') {
        // Audience gesture for this section (see packages/hylon-public/sentence.js): public mark hold into go,po keys top 3 call 250 cross cancel reenter 2 memory 8 | public off
        once(fields, key); try { current.public = parsePublic(args); } catch (error) { fail(error.message); }
      } else if (key === 'impro') {
        once(fields, key); try { current.impro = parseImpro(args); } catch (error) { fail(error.message); }
      } else if (key === 'arp' || key === 'pedal' || key === 'cell' || key === 'melody' || key === 'cluster' || key === 'chord' || key === 'psalm' || key === 'rhythmicon' || key === 'bind' || key === 'mass' || key === 'bands' || key === 'morph' || key === 'hoquetus' || key === 'parasite') {
        // Library algorithms layered on the section (see packages/hylon-algos). Up to 8 per section.
        let algo; try { algo = parseAlgo(key, args); } catch (error) { fail(error.message); }
        (current.algos ||= []).push(algo); if (current.algos.length > 16) fail('At most 16 algorithm lines per section');
      } else fail(`Unknown section directive ${key}`);
      continue;
    }
    const scalar = { id: 'scoreId', version: 'scoreVersion', title: 'title', number: 'numberId', duration: 'duration', seed: 'seed' };
    if (Object.hasOwn(scalar, key)) { once(headers, key); if (args.length !== 1) fail('Expected one header value'); score[scalar[key]] = ['duration', 'seed'].includes(key) ? number(args[0]) : args[0]; }
    else if (key === 'set') {
      if (args.length < 3 || !/^[A-Za-z]\w{0,31}$/.test(args[0]) || args[1] !== '=' || args.slice(2).some(token => typeof token !== 'string' || /"/.test(token))) fail('set NAME = tokens…');
      once(headers, key + ':' + args[0]); sets.set(args[0], args.slice(2)); if (sets.size > 64) fail('At most 64 sets');
    }
    else if (key === 'lsys') {
      // lsys NAME = AXIOM iter N rules A>AB,B>A map A:50,B:55  → a set holding one a|b|c pattern
      // (Lindenmayer rewriting; unmapped symbols are dropped). Use it as a value: bind note @NAME …
      if (args.length !== 9 || !/^[A-Za-z]\w{0,31}$/.test(args[0]) || args[1] !== '=' || !/^[A-Za-z]{1,32}$/.test(args[2]) || args[3] !== 'iter' || args[5] !== 'rules' || args[7] !== 'map') fail('lsys NAME = AXIOM iter N rules A>AB,B>A map A:50,B:55');
      once(headers, 'set:' + args[0]); const iterations = number(args[4]); if (!Number.isInteger(iterations) || iterations < 0 || iterations > 16) fail('lsys iter 0–16');
      const rules = new Map(args[6].split(',').map(r => { const m = /^([A-Za-z])>([A-Za-z]{0,16})$/.exec(r); if (!m) fail('lsys rule X>WORD'); return [m[1], m[2]]; }));
      const values = new Map(args[8].split(',').map(r => { const m = /^([A-Za-z]):(-?\d+(?:\.\d+)?)$/.exec(r); if (!m) fail('lsys map X:NUMBER'); return [m[1], m[2]]; }));
      let word = args[2]; for (let i = 0; i < iterations; i++) { word = [...word].map(c => rules.has(c) ? rules.get(c) : c).join(''); if (word.length > 2048) { word = word.slice(0, 2048); break; } }
      const list = [...word].filter(c => values.has(c)).map(c => values.get(c)); if (!list.length) fail('lsys produced no mapped symbol'); sets.set(args[0], [list.join('|')]);
    }
    else if (key === 'voice') {
      if (args.length !== 6 || !/^\$[A-Za-z][\w]{0,31}$/.test(args[0]) || args[1] !== '=' || args[3] !== 'range') fail('voice $NAME = DIVISION range LOW HIGH');
      once(headers, key + ':' + args[0]); if (!CATALOG.DIVS.includes(args[2]) || Object.values(score.voiceBindings).some(binding => binding.division === args[2])) fail('Each division needs a unique voice binding');
      const range = [number(args[4]), number(args[5])]; if (!range.every(Number.isInteger) || range[0] < 24 || range[1] > (args[2] === 'pe' ? 55 : 96) || range[1] - range[0] < 11) fail('Unsupported voice range');
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
    } else if (key === 'ambitus' || key === 'elongation') {
      // Macroform calibres: ambitus T FRACTION "label" (0 = apex octave … 1 = full voice range);
      // elongation T FACTOR "label" (multiplies every SPORE note duration).
      if (args.length !== 3) fail(`${key} TIME VALUE "label"`);
      const [low, high] = key === 'ambitus' ? [0, 1] : [0.02, 4], value = number(args[1]);
      if (!(value >= low && value <= high)) fail(`${key} value must be ${low}–${high}`);
      const target = key === 'ambitus' ? (score.ambitusCurve ||= []) : (score.elongationCurve ||= []);
      const time = number(args[0]); if (target.length && time < target.at(-1)[0]) fail(`${key} times must not decrease`);
      target.push([time, value, args[2]]);
    } else if (key === 'audition-transpose') { once(headers, key); if (args.length !== 1) fail('Expected audition transpose'); score.audition.transposeSemitones = number(args[0]); }
    // attacca NN: at the end of this score the next piece (file NN-…) loads and plays without a break.
    else if (key === 'attacca') { once(headers, key); if (args.length !== 1 || !/^\d{2}$/.test(args[0])) fail('attacca NN (two-digit piece number)'); score.attacca = args[0]; }
    // tape FILE at SECONDS gain DB [dry 0–1] [tune 0–1]: a recording in apps/hylon/public/audio/ that plays with
    // the transport (start, seek, stop) into the MIC strip, so the pitch follower hears it like the microphone.
    else if (key === 'tape') { once(headers, key); const file = args[0] || ''; if (!/^[\w.-]+\.(ogg|oga|opus|wav|mp3|m4a|flac)$/i.test(file)) fail('tape FILE.ogg at SECONDS gain DB [dry 0–1] [tune 0–1]'); const tape = { file, at: 0, gain: 0, dry: null, tune: null }; for (let i = 1; i < args.length; i += 2) { const k = args[i], v = number(args[i + 1]); if (k === 'at') { if (!(v >= -600 && v <= 1800)) fail('tape at −600…1800 s'); tape.at = v; } else if (k === 'gain') { if (!(v >= -40 && v <= 12)) fail('tape gain −40…12 dB'); tape.gain = v; } else if (k === 'dry' || k === 'tune') { if (!(v >= 0 && v <= 1)) fail(`tape ${k} 0–1`); tape[k] = v; } else fail(`tape: unknown parameter ${k}`); } score.tape = tape; }
    else if (key === 'source-sha256') { once(headers, key); if (args.length !== 1 || !/^[a-f0-9]{64}$/.test(args[0])) fail('Expected source SHA256'); score.provenance.sourceSha256 = args[0]; }
    else fail(`Unknown header directive ${key}`);
  }
  if (current) fail('Unclosed section');
  for (const required of ['id', 'version', 'title', 'number', 'duration', 'seed', 'audition-transpose', ...(score.format === 'SPORE-SCORE' ? ['source-sha256'] : [])]) if (!headers.has(required)) fail(`Missing header ${required}`);
  if (Object.keys(score.voiceBindings).length !== 5) fail('Declare one variable for each of the five divisions');
  return score;
}
export async function compileSporeText(text) {
  const raw = parseSporeText(text);
  const bytes = new TextEncoder().encode(canonicalJSON(raw));
  raw.contentHash = Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes)), byte => byte.toString(16).padStart(2, '0')).join('');
  return validateSporeScore(raw);
}
