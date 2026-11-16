import {noteActivity} from './note-activity.js';
import {mountMidiProcessLab} from './midi-process-lab.js';
import {MIN_BPM,MAX_BPM,validBpm} from '../../../packages/hylon-runtime/tempo.js';
import { decorateOutputControl } from './output-controls.js';
import './library.css';
import { CATALOG } from '../../../packages/spore/catalog.js';
import { createSporeAudition } from '../../../packages/spore/audition.js';
import { pasteAtCursor } from './score-paste.js';
import { ARP_DEFAULT, PEDAL_DEFAULT, CELL_DEFAULT, RATES, DIRS, LIMITS, calibreSemitones, formatAlgo, parseAlgoLine, parseAlgo, generate, noteName, noteNumber } from '../../../packages/hylon-algos/algos.js';

// LIBRARY pod: audition score algorithms with discrete knobs, then P pastes the command line
// into SCORE TXT at the cursor line. Audition uses the same generate() as score playback.
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const NOTE = n => `${['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][n % 12]}${Math.floor(n / 12) - 1}`;
const INTERVAL = ['uni', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
const STATE_KEY = 'hylon-library-v1';
const LOOP_S = 30;
// LOCAL additive study voice for auditions: one plain registration per division.
const LOCAL_SCORE = { couplings: {}, audition: { transposeSemitones: 0 }, sections: [{ id: 'lib', regs: { go: ['diapason8'], po: ['principal8'], re: ['fluteTraversiere8'], so: ['seraphon8'], pe: ['soubasse16'] }, couplers: [], cresc: .5, swell: 1 }] };

export function mountLibrary(container, { sampler, midiOut, audio, getEditor, notify = () => {} }) {
  let saved = {}; try { saved = JSON.parse(localStorage.getItem(STATE_KEY) || '{}'); } catch {}
  const algos = { arp: { kind: 'arp', params: { ...ARP_DEFAULT } }, pedal: { kind: 'pedal', params: { ...PEDAL_DEFAULT } }, cell: { kind: 'cell', params: structuredClone(CELL_DEFAULT) } };
  for (const kind of ['arp', 'pedal', 'cell']) { try { const a = parseAlgoLine(saved[kind]); if (a) algos[kind] = a; } catch {} }
  let current = ['pedal', 'cell','morph'].includes(saved.current) ? saved.current : 'arp', bpm = validBpm(Number(saved.bpm))?Number(saved.bpm):72, harm = Number.isInteger(saved.harm) ? saved.harm : 0;
  let toKlais = saved.klais !== false, toMidi = saved.midi === true, toLocal = saved.local === true, playing = null, epoch = 0, local = null;

  const body = el('div', 'panel-body library-pod');
  const tabs = el('div', 'lib-tabs'), knobs = el('div', 'lib-knobs'), line = el('code', 'lib-line'), bar = el('div', 'lib-bar'), status = el('div', 'lib-status');
  status.setAttribute('role', 'status');
  const tabButtons = {};
  for (const kind of ['arp', 'pedal', 'cell','morph']) { const b = el('button', 'lib-tab', kind==='morph'?'M-MORPH':kind.toUpperCase()); b.onclick = () => {if(kind!==current){stopAudition();midiLab.stop();}current = kind; render(); }; tabButtons[kind] = b; tabs.append(b); }
  const play = el('button', 'lib-play', '▶'); play.title = 'Audition (loops a 30 s section so ramps are audible)';
  const bpmIn = el('input', 'lib-num'); bpmIn.type = 'number'; bpmIn.min = MIN_BPM; bpmIn.max = MAX_BPM; bpmIn.value = bpm; bpmIn.title = 'Audition bpm (score uses the section bpm)';
  const harmSel = el('select', 'lib-sel'); harmSel.title = 'Audition harmonicity for step harm (score uses its curve)';
  CATALOG.MODES.forEach((m, i) => { const o = el('option', '', `harm ${m.label}`); o.value = i; harmSel.append(o); });
  const localBtn = el('button', 'lib-out', 'LOCAL'), klais = el('button', 'lib-out', 'KLAIS'), midi = el('button', 'lib-out', 'MIDI');
  localBtn.title = 'Audition through the local additive organ study (AUDIO pod master)';
  klais.title = 'Audition through SAMPLER layers'; midi.title = 'Audition through MIDI OUT (I–IV ch 1–4, P ch 5)';
  decorateOutputControl(localBtn,'audio','Library audition');decorateOutputControl(klais,'klais','Library audition');decorateOutputControl(midi,'midi','Library audition');
  const paste = el('button', 'lib-paste', 'P'); paste.title = 'Paste this line into SCORE TXT at the cursor line (replaces a blank or arp/pedal line)';
  bar.append(play, el('span', 'lib-tag', 'bpm'), bpmIn, harmSel, localBtn, klais, midi, paste);
  body.append(tabs, knobs, line, bar, status); container.replaceChildren(body);
  const midiLab=mountMidiProcessLab(body,{audio,sampler,midiOut,notify});

  const save = () => { try { localStorage.setItem(STATE_KEY, JSON.stringify({ current, bpm, harm, klais: toKlais, midi: toMidi, local: toLocal, arp: formatAlgo(algos.arp), pedal: formatAlgo(algos.pedal), cell: formatAlgo(algos.cell) })); } catch {} };
  const setStatus = text => { status.textContent = text; };
  // Discrete knob: number with arrows (or select). `hint` renders a small readout.
  function num(label, get, set, min, max, hint, step = 1) {
    const box = el('label', 'lib-knob'), input = el('input', 'lib-num'), info = el('small', 'lib-hint');
    input.type = 'number'; input.min = min; input.max = max; input.step = step; input.value = get();
    const update = () => { const raw = Number(input.value), v = step === 1 ? Math.round(raw) : Math.round(raw / step) * step; if (!Number.isFinite(v) || v < min || v > max) return; set(v); info.textContent = hint ? hint(v) : ''; changed(); };
    input.addEventListener('input', update); input.addEventListener('change', update);
    info.textContent = hint ? hint(get()) : '';
    box.append(el('span', 'lib-label', label), input, info); return box;
  }
  function pick(label, options, get, set) {
    const box = el('label', 'lib-knob'), select = el('select', 'lib-sel');
    for (const [value, text] of options) { const o = el('option', '', text); o.value = value; select.append(o); }
    select.value = String(get()); select.onchange = () => { set(select.value); changed(); };
    box.append(el('span', 'lib-label', label), select); return box;
  }
  const fixed = v => typeof v !== 'object' ? v : v.jux ? v.jux[0] : v.from;
  const endOf = v => typeof v !== 'object' ? v : v.jux ? v.jux.at(-1) : v.to;
  // Free-text knob validated through the score grammar (same parser as SCORE TXT).
  function text(label, get, apply, hint, wide = true) {
    const box = el('label', `lib-knob${wide ? ' lib-wide' : ''}`), input = el('input', 'lib-text'), info = el('small', 'lib-hint', hint ? hint() : '');
    input.value = get(); const commit = () => { try { apply(input.value.trim()); info.textContent = hint ? hint() : ''; changed(); } catch (e) { setStatus(e.message); } };
    input.onchange = commit; input.onkeydown = e => { if (e.key === 'Enter') commit(); };
    box.append(el('span', 'lib-label', label), input, info); return box;
  }
  const setRamp = (p, key, from, to) => { p[key] = from === to ? from : { from, to }; };
  function renderKnobs() {
    knobs.replaceChildren(); const p = algos[current].params;
    if (current === 'arp') {
      knobs.append(
        pick('dir', DIRS.map(d => [d, d]), () => p.dir, v => { p.dir = v; }),
        text('pcs (chord)', () => p.pcs ? formatAlgo({ kind: 'arp', params: p }).match(/pcs (\S+)/)[1] : '-', v => { p.pcs = parseAlgo('arp', ['pcs', v || '-']).params.pcs; }, () => p.pcs ? 'ladder on chord tones · step ignored' : '- = interval ladder (step)'),
        pick('step', [['harm', 'harm'], ...Array.from({ length: 25 }, (_, i) => [String(i), `${i} st`])], () => p.step === 'harm' ? 'harm' : fixed(p.step), v => { p.step = v === 'harm' ? 'harm' : Number(v); }),
        num('len', () => fixed(p.len), v => { p.len = v; }, 1, LIMITS.len),
        num('root', () => fixed(p.root), v => { p.root = v; }, 24, 96, NOTE),
        pick('rate', RATES.map(r => [r, r]), () => p.rate, v => { p.rate = v; }),
        num('rand %', () => fixed(p.rand), v => { p.rand = v; }, 0, 100),
        num('rand int', () => fixed(p.rint), v => { p.rint = v; }, 0, LIMITS.rint, v => `±${v} st`),
        text('calibre', () => typeof p.calibre === 'object' ? formatAlgo({ kind: 'arp', params: p }).match(/calibre (\S+)/)[1] : String(p.calibre), v => { p.calibre = parseAlgo('arp', ['calibre', v]).params.calibre; }, () => { const v = fixed(p.calibre), s = calibreSemitones(v); return typeof p.calibre === 'object' && p.calibre.jux ? 'juxtaposition a|b|c per cycle' : s <= 12 ? INTERVAL[s] : `${s} st`; }, false),
        num('voices', () => fixed(p.voices), v => { setRamp(p, 'voices', v, endOf(p.voices)); }, 0, LIMITS.voices),
        num('→ voices', () => endOf(p.voices), v => { setRamp(p, 'voices', fixed(p.voices), v); }, 0, LIMITS.voices, v => v === fixed(p.voices) ? 'fixed' : 'ramp'),
        num('rhythm exp', () => fixed(p.rexp), v => { p.rexp = Number(v.toFixed(2)); }, 0, 1, v => v <= 0 ? 'unison' : v >= 1 ? 'hocket' : '', 0.05),
        num('RE %', () => fixed(p.rer), v => { p.rer = v; }, 0, 100, v => `+${v}% step`),
        num('dur', () => fixed(p.dur), v => { p.dur = Number(v.toFixed(2)); }, 0.05, 64, v => `${v} × ${p.rate}`, 0.05),
        num('rand dur %', () => fixed(p.rdur), v => { p.rdur = v; }, 0, 100, v => `±${v}%`));
    } else if (current === 'cell') {
      knobs.append(
        text('notes', () => p.notes.map(noteName).join(' '), v => { const notes = v.split(/\s+/).map(noteNumber); if (!notes.length || notes.length > 32) throw new Error('cell: 1–32 notes'); p.notes = notes; p.durs = notes.map((_, i) => p.durs[i] ?? 1); renderKnobs(); }, () => 'B3 D4 C#4 E4 or MIDI'),
        text('dur', () => p.durs.map(fixed).join(' '), v => { const d = v.split(/\s+/).map(Number); if (d.length !== p.notes.length || d.some(x => !Number.isFinite(x) || x < 0.05 || x > 64)) throw new Error('cell: one dur (0.05–64) per note'); p.durs = d; }, () => 'time units (1 = rate)'),
        pick('rate', RATES.map(r => [r, r]), () => p.rate, v => { p.rate = v; }),
        pick('div', [['tutti', 'tutti'], ['manuals', 'manuals'], ['go', 'I'], ['po', 'II'], ['re', 'III'], ['so', 'IV'], ['pe', 'P']], () => p.div, v => { p.div = v; p.divs = v === 'tutti' ? ['go', 'po', 're', 'so', 'pe'] : v === 'manuals' ? ['go', 'po', 're', 'so'] : [v]; }),
        num('at (beats)', () => p.at, v => { p.at = v; }, 0, 4096),
        num('repeat', () => p.repeat, v => { p.repeat = v; }, 1, 64),
        num('gap', () => p.gap, v => { p.gap = v; }, 0, 64),
        num('art', () => p.art, v => { p.art = Number(v.toFixed(2)); }, 0.05, 1.5, v => v >= 1 ? 'legato' : 'détaché', 0.05),
        num('tr', () => p.tr, v => { p.tr = v; }, -24, 24, v => `${v > 0 ? '+' : ''}${v} st`));
    } else {
      const notes = el('label', 'lib-knob lib-wide'), input = el('input', 'lib-text');
      input.value = p.notes.map(fixed).join(' '); input.title = 'MIDI notes 24–55, space separated (drone: up to 4)';
      input.onchange = () => { const list = input.value.trim().split(/\s+/).map(Number); if (list.length && list.every(n => Number.isInteger(n) && n >= 24 && n <= 55)) { p.notes = list.slice(0, p.mode === 'drone' ? 4 : 16); changed(); } else setStatus('pedal notes: integers 24–55'); };
      input.onkeydown = e => { if (e.key === 'Enter') input.onchange(); };
      notes.append(el('span', 'lib-label', 'notes'), input, el('small', 'lib-hint', p.notes.map(n => NOTE(fixed(n))).join(' ')));
      knobs.append(pick('mode', [['drone', 'drone (Pérotin)'], ['ostinato', 'ostinato']], () => p.mode, v => { p.mode = v; if (v === 'drone') p.notes = p.notes.slice(0, 4); renderKnobs(); }), notes,
        pick('rate', RATES.map(r => [r, r]), () => p.rate, v => { p.rate = v; }),
        num('dur', () => fixed(p.dur), v => { p.dur = Number(v.toFixed(2)); }, 0.05, 64, v => `${v} × ${p.rate}`, 0.05),
        num('rand dur %', () => fixed(p.rdur), v => { p.rdur = v; }, 0, 100, v => `±${v}%`));
    }
  }
  function render() {
    for (const [kind, b] of Object.entries(tabButtons)) b.classList.toggle('active', kind === current);
    harmSel.value = String(harm); localBtn.classList.toggle('active', toLocal); klais.classList.toggle('active', toKlais); midi.classList.toggle('active', toMidi);
    play.classList.toggle('active', !!playing); play.textContent = playing ? '■' : '▶';
    const morph=current==='morph';for(const section of [knobs,line,bar,status])section.hidden=morph;midiLab.setVisible(morph);
    if(!morph){renderKnobs();line.textContent=formatAlgo(algos[current]);}save();
  }
  function changed() { line.textContent = formatAlgo(algos[current]); save(); }

  // Audition scheduler: 120 ms lookahead, same event generator as the score.
  function stopAudition() {
    noteActivity.clear('library:');
    if (!playing) return; clearInterval(playing.timer); playing = null; epoch++;
    try { local?.stop(); } catch {} try { sampler?.stopScore?.(); } catch {} try { midiOut?.stop?.(); } catch {}
    render();
  }
  async function startAudition() {
    if (toLocal || toKlais) { try { await audio.ensure?.(); await audio.context?.resume?.(); } catch (e) { setStatus(`AUDIO: ${e.message}`); } }
    if (local && local.context !== audio.context) { try { local.dispose(); } catch {} local = null; }
    if (toLocal && audio.context && !local) { try { local = createSporeAudition(audio.context, audio.localDestination?.() || audio.destination(), LOCAL_SCORE); local.context = audio.context; } catch (e) { setStatus(`LOCAL: ${e.message}`); } }
    if (toKlais) { try { await audio.ensure?.(); await audio.context?.resume?.(); await sampler.prepareScore(); } catch (e) { setStatus(`KLAIS: ${e.message}`); } }
    if (toMidi && !midiOut.summary().armed) setStatus('MIDI is OFF: turn MIDI ON in I/O to audition on the organ');
    const t0 = performance.now(), mine = ++epoch; let cursor = 0, count = 0, pending = [];
    playing = { timer: setInterval(() => {
      if (mine !== epoch) return;
      const now = performance.now() - t0, to = now + 120; if (to <= cursor) return;
      const algo = algos[current], events = [];
      for (let cycle = Math.floor(cursor / (LOOP_S * 1000)); cycle * LOOP_S * 1000 < to; cycle++) {
        const section = { id: `lib${cycle}`, start: cycle * LOOP_S, dur: LOOP_S, bpm };
        events.push(...generate(algo, 0, section, cursor, to, { seed: 1931, harmAt: () => harm }));
      }
      cursor = to;
      pending.push(...events); pending.sort((a, b) => a.atSessionMs - b.atSessionMs);
      const due = []; while (pending.length && pending[0].atSessionMs < to) due.push(pending.shift());
      if (pending.length > 20000) pending.length = 20000;
      for (const event of due) {
        const timing = { when: (t0 + event.atSessionMs) / 1000, durationSeconds: event.payload.durationMs / 1000, epoch: `lib${mine}` };
        noteActivity.schedule(`library:${mine}:${event.eventId}`,event.payload.note,({go:1,po:2,re:3,so:4,pe:5})[event.division]||1,timing.when,timing.durationSeconds);
        if (toLocal && local && audio.context?.state === 'running') try { local.dispatch({ ...event, payload: { ...event.payload, sceneId: 'lib' } }, { when: audio.context.currentTime + Math.max(0, timing.when - performance.now() / 1000), durationSeconds: Math.min(600, timing.durationSeconds) }); } catch {}
        if (toKlais && audio.context?.state === 'running') try { sampler.dispatchScore(event, timing); } catch {}
        if (toMidi && midiOut.summary().armed) try { midiOut.dispatch(event, timing); } catch (e) { setStatus(`MIDI: ${e.message}`); }
        count++;
      }
      if (count) status.textContent = `audition · ${count} notes · ${due.length} in last window`;
    }, 25) };
    render();
  }
  play.onclick = () => { playing ? stopAudition() : startAudition(); };
  bpmIn.onchange = () => { const v = Number(bpmIn.value); if(validBpm(v)){bpm=v;save();}else{bpmIn.value=String(bpm);setStatus(`BPM ${MIN_BPM}–${MAX_BPM}`);} };
  harmSel.onchange = () => { harm = Number(harmSel.value); save(); };
  localBtn.onclick = () => { toLocal = !toLocal; if (!toLocal) local?.stop(); render(); };
  klais.onclick = () => { toKlais = !toKlais; render(); };
  midi.onclick = () => { toMidi = !toMidi; render(); };

  // P: paste at the SCORE TXT cursor line.
  paste.onclick = () => {
    try { const r = pasteAtCursor(getEditor?.(), formatAlgo(algos[current])); setStatus(`${r.replaced ? 'replaced' : 'inserted'} line ${r.line} · APPLY SCORE TXT to hear it in the score`); notify(`LIBRARY: ${current} → SCORE TXT line ${r.line}`); }
    catch (e) { setStatus(e.message); }
  };
  // Clicking an arp/pedal line in SCORE TXT loads its values into the knobs.
  let watched = null;
  const loadFromEditor = () => {
    const editor = watched; if (!editor) return;
    const text = editor.value, caret = editor.selectionStart ?? 0, start = text.lastIndexOf('\n', caret - 1) + 1, endIndex = text.indexOf('\n', caret);
    const lineText = text.slice(start, endIndex < 0 ? text.length : endIndex);
    if (!/^\s*(arp|pedal|cell)\b/.test(lineText)) return;
    try { const algo = parseAlgoLine(lineText); algos[algo.kind] = algo; current = algo.kind; render(); setStatus(`loaded from SCORE TXT line ${text.slice(0, start).split('\n').length}`); }
    catch (e) { setStatus(`score line: ${e.message}`); }
  };
  const watch = setInterval(() => {
    const editor = getEditor?.(); if (editor === watched) return;
    watched?.removeEventListener('click', loadFromEditor); watched?.removeEventListener('keyup', loadFromEditor);
    watched = editor; watched?.addEventListener('click', loadFromEditor); watched?.addEventListener('keyup', loadFromEditor);
  }, 1000);
  render(); setStatus('Pick knobs, ▶ to audition, P pastes at the SCORE TXT cursor line.');
  return {stopMidiProcess:()=>midiLab.stop(),stop(){stopAudition();midiLab.stop();},dispose() {stopAudition();midiLab.dispose();local?.dispose();clearInterval(watch);watched?.removeEventListener('click',loadFromEditor);watched?.removeEventListener('keyup',loadFromEditor);container.replaceChildren();} };
}
