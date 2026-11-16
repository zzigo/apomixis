import { generateScorePrograms, registrationSignature, programPreparationText, nextProgramChange,programAt } from '../../../packages/hylon-registers/score-programs.js';
const scoreSources=import.meta.glob('../../../scores/*.txt',{query:'?raw',import:'default',eager:true});
const pieceScores=Object.fromEntries(Object.entries(scoreSources).map(([path,text])=>[path.split('/').at(-1),text]));
import { programDigits } from './program-digits.js';
import { DIVISION_UI } from '../../../packages/hylon-midi/divisions.js';
import './registers.css';
import { KNOB, DIVISIONS, rows, matchBanks, sampledKnobs, parseBankId, SPEAKING } from '../../../packages/hylon-registers/console.js';

// REGISTERS pod: schematic Klais stop jambs + 4-digit combination memory.
// Drawing knobs is local UI state. With LINK on, the drawn set selects matching
// recorded sample layers in SAMPLER. Explicit operator gestures also replay captured
// ON/OFF messages through the shared enabled MIDI output; restore/adopt never transmit.
const STATE_KEY = 'hylon-registers-state-v1';
const PROGRAMS_KEY = 'hylon-registers-programs-v1';
const GENERATED_KEY='hylon-registers-generated-v1';
const BACKUP_KEY='hylon-registers-program-backups-v1';
const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
const pad = n => String(n).padStart(4, '0');
const validSet = list => new Set((Array.isArray(list) ? list : []).filter(n => Number.isInteger(n) && KNOB.has(n)));

function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
function persist(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }

export function mountRegisters(container, { sampler, midiOut, registrationOutput, onDrawnChange = () => {}, getActiveScore = () => null, notify = () => {} }) {
  const saved = load(STATE_KEY, {});
  let drawn = validSet(saved.drawn);
  let program = Number.isInteger(saved.program) && saved.program >= 0 && saved.program <= 9999 ? saved.program : 0;
  let link = saved.link !== false;
  let pgmChannel = Number.isInteger(saved.pgmChannel) && saved.pgmChannel >= 1 && saved.pgmChannel <= 16 ? saved.pgmChannel : 1;
  let pgmMode = ['pc', 'pc1', 'bank'].includes(saved.pgmMode) ? saved.pgmMode : 'pc';
  let pgmAuto = saved.pgmAuto === true;
  let scale = Number.isFinite(saved.scale) ? Math.min(2, Math.max(0.6, saved.scale)) : 1;
  let drawnSignature=null,generationJob=null,flashTimer=null;
  let library = [], sampled = new Set(), lastLayers = [], uncovered = new Set(), lastStatus = '';
  const programs = {};
  let generated=load(GENERATED_KEY,null);
  if(![1,2].includes(generated?.version)||!Array.isArray(generated.combinations)||!Array.isArray(generated.cues))generated=null;
  for (const [k, v] of Object.entries(load(PROGRAMS_KEY, {}))) if (/^\d{4}$/.test(k)) programs[k] = [...validSet(v)];

  const headerCounter=el('div','reg-header-counter');headerCounter.setAttribute('role','group');headerCounter.setAttribute('aria-label','Register combination');
  const headerPrev=el('button','reg-header-step','‹');headerPrev.id='reg-program-prev';headerPrev.title='Previous register combination';headerPrev.setAttribute('aria-label',headerPrev.title);
  const headerDisplay=el('span','reg-header-digits');headerDisplay.setAttribute('role','status');
  const headerNext=el('button','reg-header-step','›');headerNext.id='reg-program-next';headerNext.title='Next register combination';headerNext.setAttribute('aria-label',headerNext.title);
  headerCounter.append(headerPrev,headerDisplay,headerNext);
  headerPrev.onclick=()=>goTo(program-1);headerNext.onclick=()=>goTo(program+1);
  // Click on the header digits: type a program number, Enter (or leaving the field) goes there, Esc cancels.
  const headerInput=el('input','reg-header-input');headerInput.type='text';headerInput.inputMode='numeric';headerInput.maxLength=4;headerInput.hidden=true;headerInput.setAttribute('aria-label','Go to register combination');headerInput.autocomplete='off';
  headerCounter.insertBefore(headerInput,headerNext);
  headerDisplay.style.cursor='text';headerDisplay.tabIndex=0;
  let headerCancel=false;
  const openHeaderInput=()=>{if(!headerInput.hidden)return;headerCancel=false;headerInput.value='';headerInput.placeholder=String(program).padStart(2,'0');headerDisplay.hidden=true;headerInput.hidden=false;headerInput.focus();};
  const closeHeaderInput=()=>{if(headerInput.hidden)return;const v=headerInput.value===''?NaN:Number(headerInput.value);headerInput.hidden=true;headerDisplay.hidden=false;if(!headerCancel&&Number.isInteger(v)&&v!==program)goTo(v);};
  headerDisplay.onclick=openHeaderInput;
  headerDisplay.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openHeaderInput();}};
  headerInput.oninput=()=>{headerInput.value=headerInput.value.replace(/\D/g,'').slice(0,4);};
  headerInput.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();headerInput.blur();}else if(e.key==='Escape'){e.preventDefault();headerCancel=true;headerInput.blur();}else if(e.key==='ArrowUp'){e.preventDefault();headerInput.value=String(Math.min(9999,(headerInput.value===''?program:Number(headerInput.value))+1));}else if(e.key==='ArrowDown'){e.preventDefault();headerInput.value=String(Math.max(0,(headerInput.value===''?program:Number(headerInput.value))-1));}};
  headerInput.onblur=closeHeaderInput;
  const body = el('div', 'panel-body registers-pod');
  const head = el('div', 'reg-head');
  const combo = el('div', 'reg-combo');
  const prev = el('button', 'reg-step', '◀'); prev.title = 'Previous program (recalls if stored)';
  const display = el('input', 'reg-display'); display.inputMode = 'numeric'; display.maxLength = 4; display.setAttribute('aria-label', 'Combination program number');
  const next = el('button', 'reg-step', '▶'); next.title = 'Next program (recalls if stored)';
  const set = el('button', 'reg-cmd', 'SET'); set.title = 'Store drawn registers into this program';
  const del = el('button', 'reg-cmd', 'DEL'); del.title = 'Delete this program';
  const cancel = el('button', 'reg-cmd reg-square', 'R'); cancel.title = 'Reset all drawn registers to OFF · local only';cancel.setAttribute('aria-label','Reset all registers');
  const generate=el('button','reg-cmd reg-square','G');generate.title='Generate unique combinations from numbered piece TXT files · preserve existing programs · no MIDI';generate.setAttribute('aria-label','Generate score registration programs');
  const names=el('button','reg-cmd reg-square','N');names.title='Show register names under each knob';names.setAttribute('aria-label','Show register names');
  const showNames=on=>{container.classList.toggle('reg-names',on);names.classList.toggle('active',on);names.setAttribute('aria-pressed',String(on));};
  names.onclick=()=>{const on=!container.classList.contains('reg-names');persist('hylon-register-names',on);showNames(on);};
  showNames(load('hylon-register-names',false)===true);
  combo.append(prev, display, next, set, del, cancel, generate, names);
  const linkBtn = el('button', 'reg-link reg-square');linkBtn.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 9h5v6H3zM16 9h5v6h-5zM8 12h8m-5-3 3 3-3 3"/></svg>';linkBtn.setAttribute('aria-label','Link registers to sampler'); linkBtn.title = 'Link drawn registers to recorded SAMPLER layers';
  const zoom = el('div', 'reg-zoom');
  const smaller = el('button', 'reg-cmd', 'A−'); smaller.title = 'Smaller interface'; smaller.setAttribute('aria-label', 'Smaller interface');
  const larger = el('button', 'reg-cmd', 'A+'); larger.title = 'Larger interface'; larger.setAttribute('aria-label', 'Larger interface');
  zoom.append(smaller, larger);
  const pgm = el('div', 'reg-pgm');
  const pgmOut = el('button', 'reg-cmd reg-pgm-out', 'PGM OUT'); pgmOut.title = 'Send this program number as MIDI Program Change to the MIDI OUT selected in I/O';
  const chan = el('select', 'reg-pgm-select'); chan.setAttribute('aria-label', 'Program Change MIDI channel');
  for (let c = 1; c <= 16; c++) { const o = el('option', '', `CH ${c}`); o.value = c; chan.append(o); }
  const mode = el('select', 'reg-pgm-select'); mode.setAttribute('aria-label', 'Program number mapping');
  for (const [v, t] of [['pc', 'PC = n (0–127)'], ['pc1', 'PC = n−1 (1–128)'], ['bank', 'CC0 n÷128 + PC n%128']]) { const o = el('option', '', t); o.value = v; mode.append(o); }
  const auto = el('button', 'reg-cmd', 'AUTO'); auto.title = 'Also send PGM OUT whenever the program number changes';
  pgm.append(pgmOut, chan, mode, auto);
  // Standalone CC tester (not linked to the knobs): sends on value change or Enter, on the PGM channel.
  const cc = el('div', 'reg-cc'); cc.title = 'CC test · sends on change or Enter · channel = CH';
  const ccNum = el('input', 'reg-cc-input'); const ccVal = el('input', 'reg-cc-input');
  for (const [input, label, value] of [[ccNum, 'CC number', saved.ccNum ?? 7], [ccVal, 'CC value', saved.ccVal ?? 0]]) {
    input.type = 'number'; input.min = 0; input.max = 127; input.step = 1; input.value = Math.min(127, Math.max(0, Number(value) || 0)); input.setAttribute('aria-label', label); input.title = label;
  }
  cc.append(el('span', 'reg-cc-tag', 'CC'), ccNum, el('span', 'reg-cc-tag', '='), ccVal);
  head.append(combo,zoom,linkBtn);
  const experimental=el('details','reg-experimental');experimental.append(el('summary','','EXPERIMENTAL'),pgm,cc);
  const status = el('div', 'reg-status'); status.setAttribute('role', 'status');
  const jambs = el('div', 'reg-jambs');
  const tip = el('div', 'reg-tip'); tip.hidden = true;
  const legend = el('div', 'reg-legend');
  for (const [cls, text] of [['f32', "32'"], ['f16', "16'"], ['f8', "8'"], ['f4', "4'"], ['f2', "2'"], ['mut', 'mutation'], ['mix', 'mixture'], ['aux', 'trem / coupler'], ['nosample', 'no sample']]) {
    const item = el('span', 'reg-legend-item'); item.append(el('i', `reg-dot ${cls}`), document.createTextNode(text)); legend.append(item);
  }
  const generatedList=el('details','reg-generated');
  const generatedSummary=el('summary','','SCORE PROGRAMS');
  const exportPrograms=el('button','reg-cmd reg-square','↧');exportPrograms.title='Export registration preparation TXT';exportPrograms.setAttribute('aria-label','Export registration preparation');
  const generatedRows=el('div','reg-generated-rows');
  const generatedNote=el('p','reg-generated-note','Files 01+ · repeated sets share a number · aliases in TXT · swell/crescendo separate · conditional variants marked');
  generatedList.append(generatedSummary,exportPrograms,generatedNote,generatedRows);
  body.append(head,jambs,generatedList,legend,experimental,tip,status);
  container.replaceChildren(body);

  const buttons = new Map();
  for (const side of ['L', 'R']) {
    const col = el('div', `reg-jamb reg-jamb-${side}`);
    for (const { division, knobs } of rows(side)) {
      const row = el('div', 'reg-row'); row.dataset.division = division;row.style.setProperty('--division-color',DIVISION_UI[division].color);
      const tag = el('span', 'reg-row-tag', DIVISIONS[division].manual); tag.title = DIVISIONS[division].label;tag.style.color=DIVISION_UI[division].color;
      const strip = el('div', 'reg-strip');
      for (const knob of knobs) {
        const b = el('button', `reg-knob ${knob.cls}`, String(knob.n)); b.type = 'button'; b.dataset.n = knob.n;
        if (knob.verify) b.classList.add('verify');
        b.setAttribute('aria-label', `${knob.n} ${knob.label} · ${DIVISIONS[division].label}`);
        b.onclick = () => toggle(knob.n);
        for (const ev of ['pointerenter', 'focus']) b.addEventListener(ev, () => showTip(b, knob));
        for (const ev of ['pointerleave', 'blur']) b.addEventListener(ev, () => { tip.hidden = true; });
        const cell=el('span','reg-cell'),name=el('span','reg-name',knob.label.includes('–')?knob.label:knob.label.replace(/\s+\d[\d\s\/]*'$/,''));name.title=knob.label;cell.append(b,name);
        buttons.set(knob.n, b); strip.append(cell);
      }
      if (!knobs.length) row.classList.add('empty');
      row.append(tag, strip); col.append(row);
    }
    jambs.append(col);
  }

  function showTip(b, knob) {
    const d = DIVISIONS[knob.division];
    tip.replaceChildren(el('strong', '', `${knob.n} · ${knob.label}`), el('span', '', `${d.manual} · ${d.label}`));
    if (knob.alias) tip.append(el('span', 'warn', `alias: ${knob.alias}`));
    if (knob.verify) tip.append(el('span', 'warn', 'label not legible in photo · verify'));
    if (sampled.has(knob.n)) tip.append(el('span', 'ok', 'recorded sample available'));
    const r = b.getBoundingClientRect(), host = body.getBoundingClientRect();
    tip.style.left = `${r.left - host.left + body.scrollLeft + r.width / 2}px`;
    tip.style.top = `${r.top - host.top + body.scrollTop - 6}px`;
    tip.hidden = false;
  }
  const sameSet = (a, b) => a.length === b.size && a.every(n => b.has(n));
  function save() { persist(STATE_KEY, { drawn: [...drawn], program, link, scale, pgmChannel, pgmMode, pgmAuto, ccNum: Number(ccNum.value), ccVal: Number(ccVal.value) }); }
  function render() {
    const signature=registrationSignature(drawn);if(signature!==drawnSignature){drawnSignature=signature;onDrawnChange([...drawn]);}
    body.style.setProperty('--reg-scale', String(scale));
    smaller.disabled = scale <= 0.6; larger.disabled = scale >= 2;
    for (const [n, b] of buttons) {
      b.classList.toggle('on', drawn.has(n)); b.setAttribute('aria-pressed', String(drawn.has(n)));
      b.classList.toggle('nosample', SPEAKING(n) && !sampled.has(n));
    }
    const key = pad(program), stored = programs[key];
    if(headerDisplay.dataset.program!==key){headerDisplay.dataset.program=key;headerDisplay.innerHTML=programDigits(program);headerDisplay.setAttribute('aria-label',`Combination ${key}`);headerDisplay.title=`Combination ${key}`;}
    if (document.activeElement !== display) display.value = key;
    display.classList.toggle('stored', !!stored);
    display.classList.toggle('dirty', !!stored && !sameSet(stored, drawn));
    display.title = stored ? `Program ${key} · ${stored.length} registers${sameSet(stored, drawn) ? '' : ' · modified'}` : `Program ${key} · empty`;
    del.disabled = !stored;
    chan.value = String(pgmChannel); mode.value = pgmMode;
    auto.classList.toggle('active', pgmAuto); auto.setAttribute('aria-pressed', String(pgmAuto));
    linkBtn.classList.toggle('active', link); linkBtn.setAttribute('aria-pressed', String(link));
  }
  function setStatus(extra = '') {
    const parts = [`${drawn.size} drawn`];
    if (!library.length) parts.push('SAMPLER library not loaded');
    else if (!link) parts.push('link off');
    else {
      parts.push(`SAMPLER: ${lastLayers.join(' + ') || '—'}`);
      if (uncovered.size) parts.push(`no recording: ${[...uncovered].sort((a, b) => a - b).join(' ')}`);
    }
    if (extra) parts.push(extra);
    status.textContent = lastStatus = parts.join(' · ');
  }
  // REGISTERS → SAMPLER: cover drawn speaking stops with recorded banks.
  function sync() {
    uncovered = new Set();
    if (link && library.length && sampler?.setLayers) {
      const match = matchBanks(drawn, library);
      uncovered = new Set(match.missing);
      if (!sameSet(lastLayers, new Set(match.layers))) {
        const result = sampler.setLayers(match.layers);
        if (result?.ok) lastLayers = result.active;
      }
    }
    render(); setStatus();
  }
  // SAMPLER → REGISTERS: draw the knobs named by the active layers (couplers/tremulants kept).
  function adopt(ids) {
    lastLayers = [...ids]; uncovered = new Set();
    const fromLayers = new Set(), gestures = [];
    for (const id of ids) { const parsed = parseBankId(id); if (parsed) parsed.stops.forEach(n => fromLayers.add(n)); else gestures.push(id); }
    drawn = new Set([...[...drawn].filter(n => !SPEAKING(n)), ...fromLayers]);
    save(); render(); setStatus(gestures.length ? `not a registration: ${gestures.join(' + ')}` : '');
  }
  function changed() { save(); render(); sync(); }
  function applyDrawn(next) {
    // Snapshot before sending: output callbacks can update the drawn set synchronously.
    const changes = [...new Set([...drawn, ...next])].filter(n => drawn.has(n) !== next.has(n)).map(n => [n, next.has(n)]);
    let sent = 0; const errors = [];
    if (midiOut?.summary().armed && midiOut.summary().sysexEnabled && registrationOutput) {
      for (const [n, on] of changes) {
        try { if (registrationOutput.sendKnob(n, on)) sent++; else errors.push(`${n}: no capture assigned`); }
        catch (error) { errors.push(error.message); if (!midiOut.summary().armed) break; }
      }
    }
    const snapshot = sent ? registrationOutput?.snapshotState() : null;
    if (snapshot !== null && snapshot !== undefined) { for (const n of snapshot.knobs) next.delete(n); for (const n of (Array.isArray(snapshot.active) ? snapshot.active : snapshot.active ? [snapshot.active] : [])) next.add(n); }
    drawn = next; changed();
    if (errors.length) { setStatus(errors.join(' · ')); notify(`REGISTERS · ${errors.join(' · ')}`); }
    else if (sent) { setStatus(`${sent} captured action(s) sent · physical state unconfirmed`); }
    else if (changes.length) setStatus(midiOut?.summary().armed?'local drawing · SysEx OFF':'local drawing · MIDI OFF');
  }
  function toggle(n) { const next = new Set(drawn); next.has(n) ? next.delete(n) : next.add(n); applyDrawn(next); }
  function goTo(n) {
    program = (n + 10000) % 10000;
    const stored = programs[pad(program)];
    const planned=generated?.combinations.find(entry=>entry.program===pad(program)&&registrationSignature(entry.knobs)===registrationSignature(stored||[]));
    if (stored&&planned){drawn=new Set(stored);changed();setStatus('score preparation · local drawing only');}
    else if (stored) applyDrawn(new Set(stored));
    else changed();
    if (pgmAuto) sendProgram();
  }
  // PGM OUT: local operator command through the shared MIDI gateway (requires MIDI ON in I/O).
  const hex = bytes => bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');
  function sendProgram() {
    try {
      if (!midiOut?.programChange) throw new Error('MIDI OUT unavailable');
      let options;
      if (pgmMode === 'bank') options = { channel: pgmChannel, bankMsb: Math.floor(program / 128), program: program % 128 };
      else {
        const value = pgmMode === 'pc1' ? program - 1 : program;
        if (value < 0 || value > 127) throw new Error(`program ${pad(program)} out of range for ${pgmMode === 'pc1' ? 'PC n−1 (1–128)' : 'PC n (0–127)'} · use CC0+PC mode`);
        options = { channel: pgmChannel, program: value };
      }
      const messages = midiOut.programChange(options);
      const text = `PGM OUT ${pad(program)} → CH ${pgmChannel} · ${messages.map(hex).join(' | ')}`;
      setStatus(text); notify(`REGISTERS: ${text}`);
      pgmOut.classList.add('sent'); setTimeout(() => pgmOut.classList.remove('sent'), 180);
    } catch (error) { setStatus(`PGM OUT failed: ${error.message}`); notify(`REGISTERS: PGM OUT failed · ${error.message}`); }
  }
  pgmOut.onclick = sendProgram;
  let lastCc = { key: '', at: 0 };
  function sendCc(force = false) {
    const n = Number(ccNum.value), v = Number(ccVal.value);
    if (!Number.isInteger(n) || !Number.isInteger(v) || n < 0 || n > 127 || v < 0 || v > 127) { setStatus('CC: number and value must be 0–127'); return; }
    const key = `${pgmChannel}:${n}:${v}`, time = performance.now();
    if (!force && key === lastCc.key && time - lastCc.at < 150) return; // spinner fires input+change
    lastCc = { key, at: time }; save();
    try {
      const bytes = midiOut.sendRaw([0xb0 | (pgmChannel - 1), n, v]);
      setStatus(`CC OUT ch ${pgmChannel} · CC ${n} = ${v} · ${hex(bytes)}`);
      for (const input of [ccNum, ccVal]) { input.classList.add('sent'); setTimeout(() => input.classList.remove('sent'), 150); }
    } catch (error) { setStatus(`CC OUT failed: ${error.message}`); notify(`REGISTERS: CC OUT failed · ${error.message}`); }
  }
  for (const input of [ccNum, ccVal]) {
    input.addEventListener('input', e => { if (!e.inputType) sendCc(); }); // arrows / spinner / wheel
    input.addEventListener('change', () => sendCc());
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendCc(true); } });
  }
  chan.onchange = () => { pgmChannel = Number(chan.value); save(); };
  mode.onchange = () => { pgmMode = mode.value; save(); };
  auto.onclick = () => { pgmAuto = !pgmAuto; save(); render(); };
  prev.onclick = () => goTo(program - 1);
  next.onclick = () => goTo(program + 1);
  display.onkeydown = e => {
    if (e.key === 'ArrowUp') { e.preventDefault(); goTo(program + 1); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); goTo(program - 1); }
    else if (e.key === 'Enter') display.blur();
  };
  display.oninput = () => { display.value = display.value.replace(/\D/g, '').slice(0, 4); };
  display.onchange = display.onblur = () => { const v = Number(display.value); if (display.value !== '' && Number.isInteger(v) && v !== program) goTo(v); else render(); };
  display.onfocus = () => display.select();
  set.onclick = () => { programs[pad(program)] = [...drawn].sort((a, b) => a - b); persist(PROGRAMS_KEY, programs); render();renderGenerated(); notify(`REGISTERS: program ${pad(program)} stored · ${drawn.size} registers`); };
  del.onclick = () => { delete programs[pad(program)]; persist(PROGRAMS_KEY, programs); render();renderGenerated(); notify(`REGISTERS: program ${pad(program)} deleted`); };
  cancel.onclick = () => {drawn=new Set();changed();setStatus('all registers OFF · local reset');notify('REGISTERS · all drawn registers OFF · no MIDI sent');};
  function renderGenerated(){
    generatedList.hidden=!generated;generatedRows.replaceChildren();if(!generated)return;
    generatedSummary.textContent=`SCORE PROGRAMS · ${generated.combinations.length}`;
    for(const entry of generated.combinations){
      const row=el('div','reg-generated-row'),button=el('button','reg-cmd reg-square',String(Number(entry.program)).padStart(2,'0'));
      const changed=!Array.isArray(programs[entry.program])||registrationSignature(programs[entry.program])!==registrationSignature(entry.knobs);
      button.disabled=changed;button.title=`${entry.knobs.map(n=>`${n} ${KNOB.get(n)?.label||'?'}`).join(' · ')||'All registers OFF'}${changed?' · changed or deleted: regenerate':''}`;
      button.onclick=()=>goTo(Number(entry.program));
      const sideNumbers=side=>{
        const group=el('span','reg-program-numbers');
        const numbers=entry.knobs.filter(n=>KNOB.get(n)?.side===side).sort((a,b)=>a-b);
        if(!numbers.length)group.textContent='—';
        for(const n of numbers){const knob=KNOB.get(n),number=el('span','reg-program-number',String(n));number.style.color=`var(--${knob.cls})`;number.title=`${n} ${knob.label} · ${DIVISIONS[knob.division].manual}`;group.append(number);}
        return group;
      };
      const references=el('span','reg-program-cues');
      references.textContent=entry.cues.map(cue=>`${cue.file.replace(/-score\.txt$/i,'')} ${cue.section} @ ${String(Math.floor(cue.time/60)).padStart(2,'0')}:${String(Math.floor(cue.time%60)).padStart(2,'0')}${cue.variant==='base'?'':' (conditional)'}`).join(' · ');
      references.title=references.textContent;
      row.append(button,sideNumbers('L'),el('span','reg-program-divider','|'),sideNumbers('R'),el('span','reg-program-divider','|'),references);generatedRows.append(row);
    }
  }
  function bankMatches(source){return generated?.files?.some(file=>file.file===source.file&&file.hash===source.hash)&&generated.combinations.every(entry=>Array.isArray(programs[entry.program])&&registrationSignature(programs[entry.program])===registrationSignature(entry.knobs));}
  async function buildPrograms(source=getActiveScore()){
    if(generationJob)return generationJob;
    generate.disabled=true;
    generationJob=(async()=>{
      const sources={...pieceScores};if(source&&Object.hasOwn(sources,source.file)&&!source.file.startsWith('00-'))sources[source.file]=source.text;
      const result=await generateScorePrograms(sources);
      const previous=load(BACKUP_KEY,[]),backups=Array.isArray(previous)?previous:[];
      localStorage.setItem(BACKUP_KEY,JSON.stringify([...backups.slice(-4),{at:new Date().toISOString(),programs,generated}]));
      const oldBank=localStorage.getItem(PROGRAMS_KEY),oldGenerated=localStorage.getItem(GENERATED_KEY);
      try{localStorage.setItem(PROGRAMS_KEY,JSON.stringify(result.programs));localStorage.setItem(GENERATED_KEY,JSON.stringify(result.manifest));}
      catch(error){try{if(oldBank===null)localStorage.removeItem(PROGRAMS_KEY);else localStorage.setItem(PROGRAMS_KEY,oldBank);if(oldGenerated===null)localStorage.removeItem(GENERATED_KEY);else localStorage.setItem(GENERATED_KEY,oldGenerated);}catch{}throw error;}
      for(const key of Object.keys(programs))delete programs[key];Object.assign(programs,result.programs);generated=result.manifest;
      render();renderGenerated();
      const message=`${generated.combinations.length} combinations · rebuilt from zero · one ten per piece · ${generated.cues.length} score cues · previous bank in backup · no MIDI sent`;
      setStatus(message);notify(`REGISTERS · ${message}`);
    })();
    try{await generationJob;}finally{generationJob=null;generate.disabled=false;}
  }
  generate.onclick=async()=>{try{await buildPrograms();generatedList.open=true;}catch(error){notify(`REGISTERS · generation failed: ${error.message}`);setStatus(error.message);}};
  async function prepareScorePrograms(source){
    if(!source||source.file.startsWith('00-'))return;
    if(generationJob)await generationJob;
    if(!bankMatches(source))await buildPrograms(source);
    if(!bankMatches(source))throw new Error('Score registration bank is out of date');
  }
  // Live preview of the next manual change: orange digits under the counter, blinking 3 s before.
  const preview=el('div','reg-preview');preview.hidden=true;preview.setAttribute('role','status');let previewKey='';
  const previewGestures=el('span','reg-gestures'),previewChange=el('span','reg-change');preview.append(previewGestures,previewChange);let gestureKey='';
  const LABEL={cresc:'CRESC',exp3:'EXP3',exp2:'EXP2'},pct=n=>Math.round(n*100);
  // CRESC = crescendo pedal, EXP3 / EXP2 = expression boxes. Animated arrow: ▲ open, ▼ close, ∿ undulate, ■ hold.
  function gestureChips(gestures,soon){return Object.entries(gestures||{}).map(([key,g])=>{const kind=g.kind==='wave'?'wave':g.kind==='hold'?'hold':g.to>g.from?'up':'down';return`<span class="reg-gesture ${kind}${soon?' soon':''}" data-gesture="${key}" title="${LABEL[key]} · manual · ${g.kind==='wave'?`undulate ${pct(g.from)}–${pct(g.to)} % every ${g.period} s`:g.kind==='hold'?`hold ${pct(g.from)} %`:`${pct(g.from)} → ${pct(g.to)} %`}${soon?' · next section':''}"><b>${LABEL[key]}</b><i>${kind==='up'?'▲':kind==='down'?'▼':kind==='wave'?'∿':'■'}</i><em>${g.kind==='hold'?pct(g.from):g.kind==='wave'?pct(g.from)+'~'+pct(g.to):pct(g.from)+'→'+pct(g.to)}</em><u></u></span>`;}).join('');}
  function previewCue({file,hash,positionMs,running,gestures=null,progress=0,elapsed=0,nextGestures=null,nextIn=Infinity,attacca=null,remaining=Infinity}){
    const valid=generated?.files?.some(f=>f.file===file&&f.hash===hash);
    // Stopped (score just loaded, or paused): first say where the organ must be now, if it is not there.
    const target=valid&&!running?programAt(generated,file,positionMs/1000):null;
    if(target&&target.program!==program){
      preview.hidden=false;const sameTen=Math.floor(target.program/10)===Math.floor(program/10),step=target.program-program,key=`prep:${target.program}:${program}`;
      if(previewGestures.innerHTML){previewGestures.innerHTML='';gestureKey='';}
      if(key!==previewKey){previewKey=key;preview.classList.remove('soon','loop');preview.classList.add('prep');preview.classList.toggle('slow',!sameTen);
        previewChange.innerHTML=`<span class="reg-preview-arrow">${!sameTen?'⇢':step===1?'>':step===-1?'<':'→'}</span><span class="reg-preview-digits">${programDigits(target.program)}</span><span class="reg-preview-time">${sameTen?'PREP':'PREP · TEN'}</span>`;
        previewChange.title=`Before play: set the organ to ${String(target.program).padStart(2,'0')} (${target.section} ${target.name||''})${sameTen?'':' · change of ten (slow, at the console)'}`;}
      return;
    }
    preview.classList.remove('prep');
    let change=valid?nextProgramChange(generated,file,positionMs/1000):null;
    // attacca: with no change left in this piece, announce the next piece's first program (last 30 s).
    if(valid&&!change&&attacca&&remaining<=30&&generated?.files?.some(f=>f.file===attacca)){
      const first=programAt(generated,attacca,0),current=programAt(generated,file,positionMs/1000)?.program??program;
      if(first&&first.program!==current)change={current,next:first.program,inSeconds:remaining,section:'ATTACCA',name:attacca.replace(/-score\.txt$/,''),loop:false,turns:1,sameTen:Math.floor(current/10)===Math.floor(first.program/10),step:first.program-current};
    }
    const upcoming=running&&nextGestures&&nextIn<=3?nextGestures:null,active=running?gestures:null;
    if(!change&&!active&&!upcoming){if(!preview.hidden){preview.hidden=true;previewKey='';gestureKey='';}return;}
    preview.hidden=false;
    const gKey=JSON.stringify([active,upcoming]);
    if(gKey!==gestureKey){gestureKey=gKey;previewGestures.innerHTML=gestureChips(active,false)+gestureChips(upcoming,true);}
    // Live position of each running gesture: a thin bar under its chip.
    for(const chip of previewGestures.querySelectorAll('.reg-gesture:not(.soon)')){const g=active?.[chip.dataset.gesture];if(!g)continue;const value=g.kind==='wave'?g.from+(g.to-g.from)*(.5-.5*Math.cos(2*Math.PI*elapsed/g.period)):g.from+(g.to-g.from)*Math.max(0,Math.min(1,progress));chip.style.setProperty('--position',`${Math.round(value*100)}%`);}
    if(!change){if(previewKey!=='none'){previewKey='none';previewChange.innerHTML='';preview.classList.remove('soon','slow','loop');}return;}
    const seconds=Math.max(0,Math.ceil(change.inSeconds)),soon=running&&change.inSeconds<=3,key=`${change.next}:${seconds}:${soon}:${change.loop}`;if(key===previewKey)return;previewKey=key;
    const arrow=change.loop?'⇄':!change.sameTen?'⇢':change.step===1?'>':change.step===-1?'<':'→';
    preview.classList.toggle('soon',soon);preview.classList.toggle('slow',!change.sameTen);preview.classList.toggle('loop',change.loop);
    previewChange.innerHTML=`<span class="reg-preview-arrow">${arrow}</span><span class="reg-preview-digits">${programDigits(change.next)}</span><span class="reg-preview-time${soon?' countdown':''}">${soon?programDigits(seconds,1):seconds>=60?Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0'):seconds+'s'}</span>${change.loop?`<span class="reg-preview-loop">${String(change.current).padStart(2,'0')}⇄${String(change.next).padStart(2,'0')} ×${change.turns}</span>`:''}`;
    previewChange.title=`Next manual change · ${String(change.next).padStart(2,'0')} at ${change.section} ${change.name}${change.sameTen?'':' · change of ten (slow)'}${change.loop?` · loop of ${change.turns} changes between two neighbouring programs`:''}`;
  }
  function syncScoreCue(cue){
    if(cue.file.startsWith('00-'))return;
    const file=generated?.files?.find(file=>file.file===cue.file&&file.hash===cue.hash);
    const match=file&&generated.cues.find(item=>item.file===cue.file&&item.section===cue.section&&item.variant===cue.variant);
    const combination=match&&generated.combinations.find(item=>item.program===match.program);
    if(!combination||registrationSignature(combination.knobs)!==cue.signature)throw new Error('Regenerate score programs before playback');
    const changedProgram=program!==Number(match.program);program=Number(match.program);save();render();headerDisplay.title=`Manual organ recall · ${cue.file} / ${cue.section} · ${String(program).padStart(2,'0')}`;
    // Cue only: never goTo/applyDrawn/sync/sendProgram, even with PGM AUTO enabled.
    setStatus(`${cue.file} / ${cue.section} · PROGRAM ${String(program).padStart(2,'0')} · manual organ recall${cue.variant==='base'?'':' · conditional'}`);
    if(cue.running&&(cue.forceFlash||changedProgram)){
      clearTimeout(flashTimer);headerCounter.classList.remove('score-cue-flash');void headerCounter.offsetWidth;headerCounter.classList.add('score-cue-flash');
      flashTimer=setTimeout(()=>headerCounter.classList.remove('score-cue-flash'),700);
    }
  }
  exportPrograms.onclick=()=>{
    if(!generated)return;
    const modified=generated.combinations.some(entry=>!Array.isArray(programs[entry.program])||registrationSignature(programs[entry.program])!==registrationSignature(entry.knobs));
    if(modified){notify('REGISTERS · stored programs changed · regenerate before exporting');return;}
    const url=URL.createObjectURL(new Blob([programPreparationText(generated)],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='APOMIXIS-register-programs.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };

  const resize = step => { scale = Math.round(Math.min(2, Math.max(0.6, scale + step)) * 10) / 10; tip.hidden = true; save(); render(); };
  smaller.onclick = () => resize(-0.1); larger.onclick = () => resize(0.1);
  linkBtn.onclick = () => { link = !link; lastLayers = []; changed(); };

  render();renderGenerated(); setStatus(null);
  return {
    prepareScorePrograms,syncScoreCue,previewCue,previewElement:()=>preview,headerElement:()=>headerCounter,stepProgram(delta){if(delta!==-1&&delta!==1)throw new Error('Invalid program step');goTo(program+delta);},
    captureSnapshot(active, knobs) { for (const n of knobs) drawn.delete(n); for (const n of (Array.isArray(active) ? active : active ? [active] : [])) drawn.add(n); save(); sync(); },
    captureState(n, on) { on ? drawn.add(n) : drawn.delete(n); save(); sync(); },
    setLibrary(list, active = []) {
      library = Array.isArray(list) ? list : []; sampled = sampledKnobs(library); lastLayers = [];
      // On load: drawn registers win; with nothing drawn, adopt the sampler's default layer.
      if (link && library.length && ![...drawn].some(SPEAKING) && active.length) adopt(active);
      else sync();
    },
    samplerLayers(ids, source) {
      if (source !== 'sampler' || !link || !library.length) { lastLayers = [...ids]; setStatus(); return; }
      adopt(ids);
    },
    programs: () => structuredClone(programs),
    dispose() {clearTimeout(flashTimer);container.replaceChildren(); }
  };
}
