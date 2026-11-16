import {createMegasporeVector} from './megaspore-vector.js';
// Adds independent score-section algorithms to a generator without changing its own events.
// Window logic: events are generated only for [cursor, endMs); a jump > 500 ms (seek) moves the
// cursor without back-filling, so seeking never floods the scheduler.
import { generate } from './algos.js';
import { harmonicityAt } from '../spore/score.js';
// `silence` windows (section-relative): a real hole in every algorithm line. Attacks inside a
// window are dropped; notes that would ring into one are cut at its edge (10 ms floor upstream).
export function silenceWindows(section) {
  const startMs = section.start * 1000, endMs = (section.start + section.dur) * 1000, beatMs = 60000 / section.bpm, windows = [];
  for (const s of section.silences || []) {
    if (s.every) for (let t = startMs + (s.offset + s.every) * beatMs; t < endMs && windows.length < 4096; t += s.every * beatMs) windows.push([t - s.dur * 1000, t]);
    else windows.push([startMs + s.at * 1000, startMs + (s.at + s.dur) * 1000]);
  }
  return windows.sort((a, b) => a[0] - b[0]);
}
const windowCache = new WeakMap();
export function applySilences(section, events) {
  let windows = windowCache.get(section); if (!windows) windowCache.set(section, windows = silenceWindows(section));
  const kept = [];
  for (const event of events) {
    const t = event.atSessionMs; let cut = Infinity, inside = false;
    for (const [a, b] of windows) { if (t >= a && t < b) { inside = true; break; } if (a > t) { cut = a; break; } }
    if (inside) continue;
    if (t + event.payload.durationMs > cut) { if (cut - t < 10) continue; event.payload.durationMs = cut - t; }
    kept.push(event);
  }
  return kept;
}
// How each algorithm grows in the public garden (reproduction mode of its notes).
const GARDEN_TEXTURE = { arp: 'striated', cell: 'striated', melody: 'striated', psalm: 'striated', bind: 'striated', chord: 'tutti', cluster: 'tutti', rhythmicon: 'hocket', mass: 'granulation', bands: 'hocket', parasite: 'striated', morph: 'striated', hoquetus: 'hocket', swarm: 'granulation', cloud: 'granulation', grain: 'granulation', pedal: 'tuber', drone: 'tuber' };
export function attachAlgoLayer(generator, score) {
  const sections = score.sections.filter(s => s.algos?.length);
  if (!sections.length) return generator;
  const megasporeShape=score.scoreId==='apomixis.megaspora'?createMegasporeVector(score):null;
  const voiceOf = division => Object.keys(score.voiceBindings).find(name => score.voiceBindings[name].division === division);
  const rangeOf = division => Object.values(score.voiceBindings).find(b => b.division === division)?.range || [24, 84];
  const harmAt = t => harmonicityAt(score, t);
  let cursor = 0, entryMs = null, seed = score.seed;
  // Last algorithm notes, in the shape of SPORE events, for the public garden projection.
  const recent = [];
  const baseStep = generator.step.bind(generator), baseReset = generator.reset.bind(generator);
  generator.step = args => {
    const result = baseStep(args), endMs = Math.min(args.endMs, score.duration * 1000);
    if (endMs - cursor > 500) { cursor = endMs; entryMs = endMs; } // seek / catch-up: no back-fill
    if (endMs > cursor) {
      const extra = [];
      for (const section of sections) {
        const mine = []; section.algos.forEach((algo,index)=>{const events=generate(algo,index,section,cursor,endMs,{seed,harmAt,voiceOf,rangeOf,entryMs,scoreEndMs:score.duration*1000,vector:generator.options.vector});mine.push(...(megasporeShape?megasporeShape(events,algo,section,generator.options.vector,seed,rangeOf):events));});
        const kept = section.silences?.length ? applySilences(section, mine) : mine;
        extra.push(...kept);
        const lineage = 1000 + score.sections.indexOf(section) * 16;
        for (const e of kept) if (e.kind === 'note' && e.division) {
          const kind = String(e.sourceId || '').slice(5), x = GARDEN_TEXTURE[kind] || 'striated';
          recent.push({ t: e.atSessionMs / 1000, d: (e.payload?.durationMs || 100) / 1000, div: e.division, gid: lineage + (Number(/^algo:[^:]+:(\d+):/.exec(e.eventId || '')?.[1]) || 0), sat: 0, tuber: x === 'tuber', x: x === 'tuber' ? null : x, midi: e.payload?.note });
        }
      }
      if (recent.length > 400) recent.splice(0, recent.length - 400);
      cursor = endMs;
      if (extra.length) { result.events.push(...extra); result.events.sort((a, b) => a.atSessionMs - b.atSessionMs || (a.eventId < b.eventId ? -1 : 1)); }
    }
    return result;
  };
  generator.recentNotes = () => recent;
  generator.reset = next => { baseReset(next); cursor = 0; entryMs = null; recent.length = 0; if (Number.isInteger(next)) seed = next; };
  generator.algoSections = sections.length;
  return generator;
}
