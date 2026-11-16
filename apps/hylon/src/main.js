import {mountGarden} from './garden.js';
import {noteActivity} from './note-activity.js';
import {decorateOutputControl} from './output-controls.js';
import {bindPerformanceKnobs,paintPerformanceKnob} from '../remote/performance-knobs.js';
import {createPerfRecorder} from './perf-recorder.js';
import {mountAttackPod} from './attack-pod.js';
import {createWorkspaceStore} from './workspace-store.js';
import {startSettingsBackup} from './settings-backup.js';
import { mountPodRail } from './pod-rail.js';
import { headerIcon } from './header-icons.js';
import { mountLivePublisher } from './live-publisher.js';
import { DIVISION_UI, DIVISION_ORDER, divisionInfo } from '../../../packages/hylon-midi/divisions.js';
import { mountRemoteHost } from './remote-host.js';
import { CONSOLE_CAPTURE_GROUPS } from './console-captures.js';
import { installScoreHighlights } from './score-editor.js';
import { createDockview } from 'dockview-core';
import 'dockview-core/dist/styles/dockview.css';
import './style.css';
import './bank.css';
import { KNOB } from '../../../packages/hylon-registers/console.js';
import { createRegistrationOutput, knobForSlot } from './registration-output.js';
import { CaptureStore, LIMITS } from './capture.js';
import { AudioSystem } from './audio.js';
import { openArchive, readSession, writeSession } from './persistence.js';
import { mountMidiOut } from './midi-out.js';
import { mountSpore } from './spore-pod.js';
import { mountSampler } from './sampler.js';
import { mountRegisters } from './registers-pod.js';
import { mountSysexTester } from './sysex-tester.js';
import { mountLibrary } from './library-pod.js';
import { mountImpro } from './impro-pod.js';
import { mountLoadMeter } from './load-meter.js';
import { mountLyrics } from './lyrics-pod.js';
import { createAudioMixer } from '../../../packages/hylon-audio/mixer.js';
import { mountMixer } from './mixer-pod.js';
import { mountLaser } from './laser.js';
import { createPodTab } from './pod-tab.js';
import './flat.css';

const $ = (s, root = document) => root.querySelector(s);
const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
const notify = text => { $('#feedback').textContent = text; };
startSettingsBackup({notify});
const run = fn => async (...args) => { try { await fn(...args); } catch (e) { notify(e.message || String(e)); } };
const download = (name, value, type = 'application/json') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([value], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
const IO_SETTINGS = 'hylon-io-devices-v1';
let ioSettings = {};
try { const saved = JSON.parse(localStorage.getItem(IO_SETTINGS) || '{}'); for (const key of ['midiInput','midiOutput','audioInput','audioOutput']) if (typeof saved[key] === 'string' && saved[key].length <= 512) ioSettings[key] = saved[key]; } catch {}
function saveDeviceSelection() {
  ioSettings = {midiInput:inputId,midiOutput:outputId,audioInput:audio.inputId,audioOutput:audio.outputId};
  try {localStorage.setItem(IO_SETTINGS,JSON.stringify(ioSettings));} catch {}
}
let store = new CaptureStore(), db = null, inputPort = null, access = null, inputId = ioSettings.midiInput || '', outputId = ioSettings.midiOutput || '', channel = 'all';
let selected = store.session.slots[0].id, division = 'all', search = '', saveRevision = 0, saveTimer, renderTimer, inputRevision = 0;
let sampler, laser, audioPod, spore, midiOut, registers, library, registrationOutput,attackTester,impro;
let dirty = false, releaseLease, psBusy = false;
// MIDI MONITOR switch, OFF at every start: while OFF, note on/off (in, out, follower) are not logged at all.
// PC, CC and SysEx are always logged, so CAPTURE and registration keep working.
let monitorOn = false;
const isNoteMessage = bytes => bytes?.length === 3 && ((bytes[0] & 0xf0) === 0x80 || (bytes[0] & 0xf0) === 0x90);
$('#workspace').inert = true;
$('#config-modal').disabled = true;
document.querySelectorAll('.command,.scene-transport button,.scene-transport select').forEach(button => { button.disabled = true; });
const audio = new AudioSystem(() => { renderConfig(); audioPod?.sync(); }, { createMixer: createAudioMixer });
audio.inputId = ioSettings.audioInput || ''; audio.outputId = ioSettings.audioOutput || '';
const roots = Object.fromEntries(['capture', 'config', 'monitor', 'sampler', 'laser', 'audio', 'spore', 'registers', 'score', 'library', 'notation', 'impro', 'lyrics', 'attack'].map(id => [id, node('section', undefined, 'pod-root')]));
const configBody = node('div', undefined, 'panel-body'); roots.config.append(configBody);

async function save() {
  if (!db) return;
  const revision = ++saveRevision; $('#storage-status').textContent = 'Saving locally…';
  try { await writeSession(db, structuredClone(store.session)); if (revision === saveRevision && !saveTimer) { dirty = false; $('#storage-status').textContent = 'Saved on this device'; } }
  catch (e) { $('#storage-status').textContent = 'SAVE FAILED · EXPORT JSON NOW'; notify(`Local save failed: ${e.message}. Export JSON for backup.`); }
}
function changed() {
  dirty = true; $('#storage-status').textContent = db ? 'Unsaved changes…' : 'MEMORY ONLY · EXPORT JSON';
  // Throttle rather than debounce: continuous organ traffic must still reach disk.
  if (!saveTimer) saveTimer = setTimeout(() => { saveTimer = null; save(); }, 200);
  if (!renderTimer) renderTimer = setTimeout(() => { renderTimer = null; renderCapture(); renderMonitor(); }, 100);
}
function currentSlot() { return store.session.slots.find(s => s.id === selected) || store.session.slots[0]; }

roots.capture.innerHTML = `<div class="toolbar session-tools"><button id="export-session" class="primary">EXPORT JSON</button><label class="file-button">IMPORT JSON<input id="import-session" type="file" accept="application/json,.json"></label><button id="new-session">NEW SESSION</button></div><div class="capture-overview"><span id="capture-progress"></span><span id="capture-state">READY / SELECT MIDI INPUT</span></div><div class="capture-work"><aside class="slot-browser"><input id="slot-search" type="search" placeholder="Find a registration…" aria-label="Search registrations"><div id="divisions" class="division-tabs"></div><div id="slot-list"></div><button id="add-slot">ADD CUSTOM SLOT</button></aside><div class="slot-detail"><div class="eyebrow" id="slot-division"></div><h2 id="slot-name"></h2><p class="muted">Capture ON, wait for OFF, then release the same console stop.</p><div class="capture-actions"><button id="capture-toggle" class="primary" aria-pressed="false">CAPTURE</button><select id="capture-mode" aria-label="Capture sequence" title="Capture both actions in sequence, or replace one action"><option value="pair">ON → OFF</option><option value="on">ON only</option><option value="off">OFF only</option></select><button id="demo-message">ADD DEMO MESSAGE</button></div><p id="capture-help" class="status">Choose the MIDI input in I/O before capturing. Each window lasts 60 seconds.</p><label class="field">Console knob<select id="capture-knob" aria-label="Console knob assignment"></select></label><div class="capture-actions"><select id="capture-source" aria-label="Reference source" title="Choose external recording; does not transmit"></select><select id="capture-pair" aria-label="Reference pair" title="ON/OFF pair within source; changes save automatically, no transmission"></select><span id="capture-reference-status" class="muted"></span></div><label class="field">Session notes<textarea id="slot-notes" maxlength="4096" placeholder="Console label, action, ambiguities…"></textarea></label><div id="observations"></div></div></div>`;
for (const id of ['all', ...DIVISION_ORDER, 'coupler', 'controller', 'custom']) {
  const b = node('button', DIVISION_UI[id]?.label || id.toUpperCase()); b.dataset.division = id;if(DIVISION_UI[id]){b.style.color=DIVISION_UI[id].color;b.title=DIVISION_UI[id].name;}
  b.onclick = () => { division = id; renderSlots(); }; $('#divisions', roots.capture).append(b);
}
function renderSlots() {
  const list = $('#slot-list', roots.capture); const scroll = list.scrollTop; list.replaceChildren();
  for (const slot of store.session.slots.filter(s => (division === 'all' || s.division === division) && `${s.label} ${s.id}`.toLowerCase().includes(search.toLowerCase()))) {
    const row = node('div', undefined, `slot-row ${slot.id === selected ? 'selected' : ''}`);
    const knob = knobForSlot(slot), on = registrationOutput?.state(slot.id);
    const test = node('button', knob ? String(knob.n) : '·', `reg-knob capture-test ${knob?.cls || 'aux'} ${on === true ? 'on' : ''}`);
    test.type = 'button'; test.setAttribute('aria-pressed', on === true ? 'true' : 'false');
    test.setAttribute('aria-label', `Test ${slot.label}`);
    test.title = `${slot.label} · click sends ${on === true ? 'OFF' : 'ON'} · ${on === undefined ? 'physical state unknown' : 'last sent ' + (on ? 'ON' : 'OFF')}`;
    test.disabled = !!store.target || (!slot.on.length && !slot.off.length);
    test.onclick = run(() => { notify(registrationOutput.toggleSlot(slot.id)); renderCapture(); });
    const choose = node('button', slot.label, 'slot-select');
    choose.title = `${divisionInfo(slot.division)?.label || slot.division.toUpperCase()} · ${slot.label}`;
    choose.onclick = () => { store.cancel(); selected = slot.id; renderCapture(); };
    const identity=divisionInfo(slot.division)||DIVISION_UI[knob?.division];if(identity){choose.style.color=identity.color;choose.title=`${identity.label} · ${identity.name} · ${slot.label}`;}
    row.append(test, choose, node('span', `${slot.on.length ? 'ON' : '—'} / ${slot.off.length ? 'OFF' : '—'}`, 'slot-count')); list.append(row);
  }
  $('#divisions', roots.capture).querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.division === division));
  if (!list.childElementCount) list.append(node('p', 'No matching slots. Add a custom slot below.', 'empty-state'));
  list.scrollTop = scroll;
}
function renderCapture() {
  const slot = currentSlot(); if (!slot) return;
  const target = store.target;
  $('#slot-division', roots.capture).textContent = `${divisionInfo(slot.division)?.label || slot.division.toUpperCase()} / ${slot.kind.toUpperCase()} / ${slot.on[0]?.source.id.startsWith('midi-monitor:') ? slot.on[0].source.name : 'CAPTURE'}`;
  $('#slot-name', roots.capture).textContent = slot.label;
  const notes = $('#slot-notes', roots.capture); if (document.activeElement !== notes) notes.value = slot.notes;
  $('#capture-progress', roots.capture).textContent = `${store.session.slots.filter(s => s.on.length && s.off.length).length} / ${store.session.slots.length} PAIRS RECORDED`;
  $('#capture-state', roots.capture).textContent = target ? `LISTENING / ${target.transition.toUpperCase()}` : 'CAPTURE IDLE';
  $('#capture-state', roots.capture).classList.toggle('listening', !!target);
  const toggle = $('#capture-toggle', roots.capture);
  toggle.textContent = target ? 'STOP CAPTURE' : 'CAPTURE'; toggle.classList.toggle('active', !!target); toggle.setAttribute('aria-pressed', String(!!target));
  $('#capture-mode', roots.capture).disabled = !!target;
  const assignment = $('#capture-knob', roots.capture);
  if (!assignment.options.length) { assignment.append(option('0', '— Unassigned')); for (const k of KNOB.values()) assignment.append(option(String(k.n), `${k.n} · ${k.label}`)); }
  assignment.value = String(knobForSlot(slot)?.n || 0); assignment.disabled = !!target;
  const source = $('#capture-source', roots.capture), pairChoice = $('#capture-pair', roots.capture);
  if (!source.options.length) { source.append(option('', 'Source…')); for (const group of CONSOLE_CAPTURE_GROUPS) source.append(option(group.key, group.filename)); }
  const reference = slot.reference || (() => {
    const group = CONSOLE_CAPTURE_GROUPS.find(g => slot.on[0]?.source.id === g.sourceId);
    return group ? { key: group.key, pair: (knobForSlot(slot)?.n || group.first)-group.first+1 } : null;
  })();
  source.value = reference?.key || ''; source.disabled = !!target;
  const group = CONSOLE_CAPTURE_GROUPS.find(g => g.key === source.value), pairs = group && (group.pairs || group.captures);
  pairChoice.replaceChildren(...(pairs ? pairs.map((_,i) => option(String(i+1), `Pair ${i+1}`)) : [option('', 'Pair…')]));
  pairChoice.value = String(reference?.pair || ''); pairChoice.disabled = !!target || !group;
  $('#capture-reference-status', roots.capture).textContent = group ? `${group.provisional ? 'PROVISIONAL · ' : ''}${pairs.length} source pairs · edits save without sending` : '';
  $('#capture-help', roots.capture).textContent = target ? `Listening on ${inputPort?.name || 'DEMO INPUT'} · ${Math.max(0, Math.ceil((target.expiresAt - Date.now()) / 1000))}s · ${target.transition === 'on' ? 'pull this stop ON; wait for LISTENING / OFF before releasing it' : 'push this stop OFF; capture finishes automatically'}.` : (store.warning || 'ON → OFF captures each action separately (300 ms message grouping). New captures replace only the action received. Export JSON for backup.');
  const observations = $('#observations', roots.capture); observations.replaceChildren();
  for (const transition of ['on', 'off']) {
    const section = node('section', undefined, 'observation'); const heading = node('div', undefined, 'observation-title');
    heading.append(node('h3', `${transition.toUpperCase()} / ${slot[transition].length} MESSAGES`));
    const syx = node('button', 'EXPORT .SYX'); syx.disabled = !slot[transition].some(r => r.kind === 'sysex');
    syx.onclick = () => download(`${slot.id}-${transition}.syx`, new Uint8Array(slot[transition].filter(r => r.kind === 'sysex').flatMap(r => r.bytes)), 'application/octet-stream');
    const clear = node('button', 'CLEAR'); clear.disabled = !slot[transition].length;
    clear.onclick = () => { if (confirm(`Clear ${transition.toUpperCase()} observations for ${slot.label}? Monitor history remains.`)) { store.clearSlot(slot.id, transition); changed(); } };
    const send = node('button', `SEND ${transition.toUpperCase()}`); send.title = `Send the saved ${transition.toUpperCase()} messages to selected MIDI OUT`; send.disabled = !slot[transition].length || !!target;
    send.onclick = run(() => { notify(registrationOutput.sendSlot(slot.id, transition === 'on')); renderCapture(); });
    heading.append(send, syx, clear); section.append(heading);
    if (!slot[transition].length) section.append(node('p', 'No observations yet.', 'empty-state'));
    for (const r of slot[transition].slice(-12).reverse()) {
      const row = node('div', undefined, 'message'); row.append(node('div', `${r.kind.toUpperCase()} · ${r.bytes.length} bytes · ${r.source.name || r.source.id} · ${new Date(r.time).toLocaleTimeString()}`, 'message-meta'), node('code', r.hex)); section.append(row);
    }
    if (slot[transition].length > 12) section.append(node('p', 'Showing last 12; export includes all observations.', 'muted'));
    observations.append(section);
  }
  renderSlots();
}
$('#slot-search', roots.capture).oninput = e => { search = e.target.value; renderSlots(); };
$('#slot-notes', roots.capture).oninput = e => { currentSlot().notes = e.target.value; store.session.updatedAt = new Date().toISOString(); changed(); };
$('#capture-knob', roots.capture).onchange = e => {
  currentSlot().knob = Number(e.target.value); changed(); renderCapture();
};
$('#capture-source', roots.capture).onchange = run(e => {
  if (!e.target.value) return;
  store.setReferencePair(selected, e.target.value, 1); registrationOutput?.resetSlot(selected); changed(); renderCapture();
});
$('#capture-pair', roots.capture).onchange = run(e => {
  store.setReferencePair(selected, $('#capture-source', roots.capture).value, Number(e.target.value)); registrationOutput?.resetSlot(selected); changed(); renderCapture();
});
$('#capture-toggle', roots.capture).onclick = run(() => {
  if (store.target) { store.cancel(); renderCapture(); return; }
  if (!inputId) throw new Error('Select a MIDI input or Demo input in I/O first.');
  if (inputId !== 'demo' && (!inputPort || inputPort.state !== 'connected')) throw new Error('Selected MIDI input is disconnected.');
  midiRevision++; spore?.pause('capture'); library?.stop();attackTester?.stop();impro?.disarm('stopped'); midiOut?.stopFollower(); midiOut?.stop();
  const mode = $('#capture-mode', roots.capture).value;
  store.arm(selected, mode === 'off' ? 'off' : 'on', inputId, channel, { sequence: mode === 'pair', replace: true }); renderCapture();
});
$('#demo-message', roots.capture).onclick = () => {
  if (inputId !== 'demo') { notify('Select Demo input in I/O to add a clearly labeled practice message.'); return; }
  const v = store.target?.transition === 'off' ? 0 : 127;
  receive([0xF0, 0x7D, 1, v, 0xF7], { id: 'demo', name: 'DEMO · NOT ORGAN DATA', manufacturer: 'HYLON simulator' });
};
$('#export-session', roots.capture).onclick = run(() => { download(`hylon-capture-${new Date().toISOString().slice(0, 10)}.json`, store.exportJSON()); notify('Session exported. Keep this JSON as the independent backup.'); });
$('#import-session', roots.capture).onchange = run(async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  if (file.size > LIMITS.importBytes) throw new Error('Session file too large.');
  const imported = store.importSession(await file.text());
  if (!confirm('Replace current session with this import? Export current JSON first if needed.')) return;
  store.cancel(); store = imported; selected = store.session.slots[0]?.id; changed(); notify('Imported observations; capture remains disarmed.');
});
$('#new-session', roots.capture).onclick = () => {
  if (!confirm('Start an empty session? Export the current JSON before replacing it.')) return;
  store.cancel(); store = new CaptureStore(); selected = store.session.slots[0].id; changed();
};
$('#add-slot', roots.capture).onclick = () => {
  const label = prompt('Console label for the new unverified slot:'); if (!label?.trim()) return;
  if (store.session.slots.length >= 256) { notify('Slot limit reached.'); return; }
  const slot = { id: `custom.${crypto.randomUUID()}`, division: 'custom', label: label.trim().slice(0, 256), kind: 'custom', notes: '', on: [], off: [] };
  store.session.slots.push(slot); selected = slot.id; division = 'all'; changed();
};

roots.monitor.innerHTML = '<div class="panel-body monitor-pod"><div class="toolbar"><button id="monitor-on" title="MIDI MONITOR switch. OFF (default): notes are not logged, which keeps the sending thread free during dense scores. PC, CC and SysEx are always logged.">MON OFF</button><button id="monitor-all" title="Listen on EVERY MIDI input (monitor only, no thru, not routed to sampler/laser)">ALL IN</button><button id="monitor-tx" class="active" title="Show messages HYLON sends (TX)">TX</button><span id="monitor-rt" class="monitor-rt" title="Realtime bytes (clock F8, active sensing FE…) are not listed; any count here proves the cable delivers data">RT —</span><span class="nav-spacer"></span><button id="clear-monitor" class="icon-clear" title="Clear monitor" aria-label="Clear monitor"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/></svg></button></div><div id="monitor-log"></div></div>';
let monitorTx = true, monitorAll = false;
const monitorPorts = new Map(), realtime = new Map();
let monitorStale = false;
function renderMonitor() {
  // Hidden pod: remember that it is stale and draw when it is shown again (see the interval below).
  if (!roots.monitor.isConnected || roots.monitor.offsetParent === null) { monitorStale = true; return; }
  monitorStale = false;
  const log = $('#monitor-log', roots.monitor); log.replaceChildren();
  $('#monitor-on', roots.monitor).classList.toggle('active', monitorOn); $('#monitor-on', roots.monitor).textContent = monitorOn ? 'MON ON' : 'MON OFF';
  if (!monitorOn) log.append(node('div', 'MONITOR OFF · notes not logged · PC, CC and SysEx still listed', 'muted'));
  $('#monitor-all', roots.monitor).classList.toggle('active', monitorAll);
  $('#monitor-all', roots.monitor).textContent = monitorAll ? `ALL IN · ${monitorPorts.size + (inputPort ? 1 : 0)}` : 'ALL IN';
  $('#monitor-tx', roots.monitor).classList.toggle('active', monitorTx);
  // Events are stored in arrival order, so the newest 80 are read from the end (no full sort).
  const newest = []; for (let i = store.session.events.length - 1; i >= 0 && newest.length < 80; i--) { const record = store.session.events[i]; if (monitorTx || record.source.id !== 'hylon:tx') newest.push(record); }
  for (const r of newest) {
    const line = node('div', undefined, 'monitor-row');const identity=Object.values(DIVISION_UI).find(d=>d.channel===r.channel);if(identity)line.style.setProperty('--division-color',identity.color); line.title = `${new Date(r.time).toLocaleTimeString()} · ${r.kind} · ${r.hex} · ${r.slotId || r.source.name}`;
    line.append(node('time', new Date(r.time).toLocaleTimeString()), node('span', r.kind.toUpperCase(), 'message-kind'), node('code', r.hex), node('span', r.slotId ? `${r.slotId} / ${r.transition}` : r.source.name, 'muted')); log.append(line);
  }
}
setInterval(() => { if (monitorStale) renderMonitor(); }, 500);
$('#clear-monitor', roots.monitor).onclick = () => { store.session.events = []; realtime.clear(); renderRealtime(); changed(); };
$('#monitor-on', roots.monitor).onclick = () => { monitorOn = !monitorOn; renderMonitor(); };
$('#monitor-tx', roots.monitor).onclick = () => { monitorTx = !monitorTx; renderMonitor(); };
let realtimeTimer;
function renderRealtime() {
  const text = realtime.size ? 'RT ' + [...realtime].map(([b, n]) => `${b.toString(16).toUpperCase()}×${n}`).join(' ') : 'RT —';
  $('#monitor-rt', roots.monitor).textContent = text;
}
function noteRealtime(bytes) {
  if (!bytes?.length || bytes[0] < 0xf8) return false;
  for (const b of bytes) if (b >= 0xf8) realtime.set(b, (realtime.get(b) || 0) + 1);
  if (!realtimeTimer) realtimeTimer = setTimeout(() => { realtimeTimer = null; renderRealtime(); }, 200);
  return true;
}
// Our own outgoing notes are logged for the monitor, but they must not trigger a full session save
// and a capture redraw five to ten times a second while a dense score plays: that work runs on the
// thread that sends the notes. Notes: monitor redraw at most 4×/s (only if visible), save every 5 s.
// Anything else we send (PC, CC, SysEx) keeps the immediate path.
let txRenderTimer = null, txSaveTimer = null;
function logTx(bytes, port, at) {
  perfRecorder?.midiOut(bytes, at);
  noteActivity.midi('tx',bytes); registrationOutput?.observeFrame(bytes);
  if (!monitorOn && isNoteMessage(bytes)) return;
  const r = store.receive(Array.from(bytes), { id: 'hylon:tx', name: `TX → ${port?.name || 'MIDI OUT'}`, manufacturer: 'HYLON' }); if (!r) return;
  const kind = bytes[0] & 0xf0; if (kind !== 0x80 && kind !== 0x90) { changed(); return; }
  dirty = true;
  if (!txRenderTimer) txRenderTimer = setTimeout(() => { txRenderTimer = null; renderMonitor(); }, 250);
  if (!txSaveTimer) txSaveTimer = setTimeout(() => { txSaveTimer = null; if (!saveTimer) save(); }, 5000);
}
// Monitor-only listeners on every other input; additive refresh avoids open/close statechange loops.
async function refreshMonitorAll() {
  if (!monitorAll || !access) { renderMonitor(); return; }
  for (const [id, p] of monitorPorts) if (p.state !== 'connected' || p === inputPort) { if (p !== inputPort) p.onmidimessage = null;noteActivity.clear(`monitor:${p.id}:`); monitorPorts.delete(id); }
  for (const p of access.inputs.values()) {
    if (p.state !== 'connected' || p === inputPort || monitorPorts.has(p.id)) continue;
    monitorPorts.set(p.id, p);
    try { await p.open(); } catch { monitorPorts.delete(p.id); continue; }
    if (!monitorAll) break;
    p.onmidimessage = event => { if(event.data?.[0]===0xf0&&!$('#sysex-permission',configBody).checked)return; noteActivity.midi(`monitor:${p.id}`,event.data);pulseMidi(event.data); if (noteRealtime(event.data)) return; const r = store.receive(event.data, { id: p.id, name: p.name || '', manufacturer: p.manufacturer || '' }); if (r) changed(); };
  }
  renderMonitor();
}
async function setMonitorAll(on) {
  monitorAll = on;
  if (on) {
    if (!access) { if (!navigator.requestMIDIAccess) throw new Error('Web MIDI unavailable'); access = await navigator.requestMIDIAccess({ sysex: $('#sysex-permission', configBody).checked }); watchMidiAccess(); renderConfig(); }
    await refreshMonitorAll();
  } else {
    for (const p of monitorPorts.values()) if (p !== inputPort) { noteActivity.clear(`monitor:${p.id}:`);p.onmidimessage = null; p.close().catch(() => {}); }
    monitorPorts.clear(); renderMonitor();
  }
}
$('#monitor-all', roots.monitor).onclick = run(() => setMonitorAll(!monitorAll));
let midiPulseTimer;
function pulseMidi(bytes) {
  const button = $('#command-midi'), level = (bytes[0] & 0xf0) === 0x90 && bytes[2] > 0 ? bytes[2] / 127 : .25;
  button.style.setProperty('--midi-rx', String(.15 + level * .85)); button.classList.add('midi-receiving');
  clearTimeout(midiPulseTimer); midiPulseTimer = setTimeout(() => button.classList.remove('midi-receiving'), 90);
}
function receive(bytes, source) {
  perfRecorder?.midiIn(bytes);
  noteActivity.midi(`input:${source.id}`,bytes);
  if(bytes?.[0]===0xf0&&!$('#sysex-permission',configBody).checked)return;
  if (noteRealtime(bytes)) { pulseMidi(bytes); return; }
  impro?.midi(bytes);
  const button = $('#command-midi'), level = (bytes[0] & 0xf0) === 0x90 && bytes[2] > 0 ? bytes[2] / 127 : .25;
  button.style.setProperty('--midi-rx', String(.15 + level * .85)); button.classList.add('midi-receiving');
  clearTimeout(midiPulseTimer); midiPulseTimer = setTimeout(() => button.classList.remove('midi-receiving'), 90);
  if (!monitorOn && isNoteMessage(bytes)) { sampler?.midi(bytes); audio.midi(bytes); laser?.midi(bytes); return; }
  const warning = store.warning;
  const r = store.receive(bytes, source);
  if (r?.kind === 'sysex') registrationOutput?.observeFrame(r.bytes);
  if (r) { changed(); sampler?.midi(bytes); audio.midi(bytes); laser?.midi(bytes); }
  if (store.warning && warning !== store.warning) { notify(store.warning); renderCapture(); }
}

function option(value, text) { const o = node('option', text); o.value = value; return o; }
function selectOptions(select, options, value) { select.replaceChildren(...options.map(([v, t]) => option(v, t))); select.value = value; }
function deviceChoices(group, options, value) {
  group.replaceChildren(); group.value = value;
  const counts = new Map();
  for (const [id, name] of options) {
    const words = name.replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/);
    const base = id === '' ? (name.startsWith('System') ? 'Sy' : '—') : id === 'demo' ? 'De' : ((words[0]?.[0] || '?').toUpperCase() + (words[1]?.[0] || words[0]?.[1] || '').toLowerCase());
    const count = (counts.get(base) || 0) + 1; counts.set(base, count);
    const button = node('button', base + (count > 1 ? count : '')); button.type = 'button';
    button.title = name; button.setAttribute('aria-label', name); button.setAttribute('aria-pressed', String(id === value)); button.classList.toggle('active', id === value);
    button.onclick = () => { group.value = id; group.dispatchEvent(new Event('change', { bubbles: true })); };
    group.append(button);
  }
}
configBody.classList.add('io-panel');
configBody.innerHTML = `<div class="io-columns"><section class="config-section"><div class="io-section-head"><h3>MIDI</h3><button id="connect-midi" class="primary" title="Connect selected MIDI input and output">MIDI ON</button></div><label class="field checkbox" title="Enable SysEx capture and replay · OFF by default"><input id="sysex-permission" type="checkbox">SysEx</label><label class="field">IN<div id="midi-input" class="device-choices" role="group" aria-label="MIDI input"></div></label><label class="field">Channel<select id="midi-channel" title="Capture channel"></select></label><label class="field">OUT<div id="midi-output" class="device-choices" role="group" aria-label="MIDI output"></div></label><section id="midi-note-out"></section></section><section class="config-section"><div class="io-section-head"><h3>AUDIO</h3><button id="audio-toggle" class="primary" title="Audio engine and mic input on/off; monitoring stays muted">AUDIO ON</button><button id="refresh-audio" title="Refresh audio devices">↻</button></div><p id="audio-status" class="status"></p><label class="field">IN<div id="audio-input" class="device-choices" role="group" aria-label="Audio input device"></div></label><div id="audio-routes"></div><label class="field checkbox" title="Send microphone through the mixer; starts muted"><input id="audio-monitor" type="checkbox">Monitor</label><label class="field">OUT<div id="audio-output" class="device-choices" role="group" aria-label="Audio output device"></div></label><p id="output-help" class="muted"></p><label class="field" title="Master output level">Master<input id="master-gain" type="range" min="0" max="1" step="0.01" value="0.9"></label><label class="field" title="Output buffer requested from the browser. interactive: fastest response, may click when many sampler voices start together · balanced: default · playback: most stable, slowest response. Applies after reloading the page.">Latency<select id="audio-latency"><option value="interactive">interactive · fast</option><option value="balanced">balanced</option><option value="playback">playback · stable</option></select></label><p id="audio-latency-status" class="muted"></p><label class="field checkbox" title="Safety limiter after the mixer compressor (−3 dB, 20:1): stops the sampler from clipping the output in dense passages. Applies at once."><input id="audio-limiter" type="checkbox">Limiter</label><label class="field" title="DUR · maximum silence opened after a note, in ms. DUR is a percentage for every note; a note of length d sounds max(d × DUR, d − this gap). More reverberation in the hall needs a larger gap.">DUR gap ms<input id="dur-gap" type="number" min="0" max="2000" step="10" value="250"></label><label class="field" title="Physical MIDI OUT · a note arriving on a key that is still sounding releases it and attacks again after this gap (ms). 0 = the new note only prolongs the old one (no new attack).">Re-attack ms<input id="reattack-gap" type="number" min="0" max="200" step="5" value="30"></label><button id="audio-test" title="440 Hz · left 0.5 s, then right 0.5 s">TEST L → R</button></section></div>`;
midiOut = mountMidiOut($('#midi-note-out', configBody), { notify, onSend: logTx, getLevel:()=>audio.midiLevel, onRouteChange: () => midiOut?.stop(), onEnable: () => { store.cancel(); renderCapture(); } });
$('#sysex-permission',configBody).onchange=()=>{
  store.cancel();const enabled=$('#sysex-permission',configBody).checked;midiOut.setSysexEnabled(enabled);renderCapture();
  if(enabled&&!access?.sysexEnabled)notify('SysEx selected · turn M OFF/ON to request browser permission');
};
mountSysexTester(roots.capture, { midiOut, notify, isCapturing: () => !!store.target, simulate: bytes => receive(bytes, { id: inputPort?.id || 'hylon:sim', name: `SIM · ${inputPort?.name || 'no input selected'}`, manufacturer: 'HYLON' }) });
selectOptions($('#midi-channel', configBody), [['all', 'All channels'], ...Array.from({ length: 16 }, (_, i) => [String(i + 1), `Channel ${i + 1}`])], 'all');
function renderConfig() {
  deviceChoices($('#midi-input', configBody), [['', 'Select an input'], ['demo', 'Demo input · practice only'], ...Array.from(access?.inputs.values() || []).filter(p => p.state === 'connected').map(p => [p.id, p.name || p.id])], inputId);
  deviceChoices($('#midi-output', configBody), [['', 'No output selected'], ...Array.from(access?.outputs.values() || []).filter(p => p.state === 'connected').map(p => [p.id, p.name || p.id])], outputId);
  deviceChoices($('#audio-input', configBody), [['', 'System default input'], ...audio.devices.filter(d => d.kind === 'audioinput' && d.deviceId !== 'default').map((d, i) => [d.deviceId, d.label || `Input ${i + 1}`])], audio.inputId);
  deviceChoices($('#audio-output', configBody), [['', 'System default output'], ...audio.devices.filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default').map((d, i) => [d.deviceId, d.label || `Output ${i + 1}`])], audio.outputId);
  $('#connect-midi', configBody).textContent = inputPort || midiOut?.summary().armed ? 'MIDI OFF' : 'MIDI ON';
  $('#audio-toggle', configBody).textContent = audio.context?.state === 'running' ? 'AUDIO OFF' : 'AUDIO ON';
  $('#audio-output', configBody).querySelectorAll('button').forEach(button => { button.disabled = !!audio.context && !audio.context.setSinkId; });
  $('#output-help', configBody).textContent = audio.context?.setSinkId ? 'Output changes apply to this audio context.' : 'Output choice applies when audio starts.' ;
  $('#audio-status', configBody).textContent = audio.stream ? `${audio.channels} input channel(s) reported · ${audio.settings.sampleRate || '?'} Hz · monitoring ${audio.monitor ? 'ON' : 'muted'}` : `Input stopped · audio ${audio.context?.state || 'not started'}`;
  $('#master-gain', configBody).value = audio.masterLevel;
  { let wanted = 'balanced', limiterOn = true; try { const stored = localStorage.getItem('hylon-audio-latency'); if (['interactive','balanced','playback'].includes(stored)) wanted = stored; limiterOn = localStorage.getItem('hylon-audio-limiter') !== 'off'; } catch {}
    $('#audio-latency', configBody).value = wanted; $('#audio-limiter', configBody).checked = limiterOn;
    const c = audio.context, ms = c ? Math.round(((c.baseLatency || 0) + (c.outputLatency || 0)) * 1000) : null;
    $('#audio-latency-status', configBody).textContent = c ? `running: ${audio.latencyHint || '?'} · ${ms} ms · ${c.sampleRate} Hz${audio.latencyHint && audio.latencyHint !== wanted ? ' · RELOAD to apply ' + wanted : ''}` : 'audio not started'; }
  $('#audio-monitor', configBody).checked = audio.monitor; $('#audio-monitor', configBody).disabled = !audio.stream;
  const routes = $('#audio-routes', configBody); routes.replaceChildren();
  for (let i = 0; i < 2; i++) {
    const row = node('div', undefined, 'audio-route'); const label = node('label', `${i ? 'B' : 'A'}`, 'field'); const sel = node('select');
    selectOptions(sel, Array.from({ length: audio.channels || 2 }, (_, n) => [String(n), `Physical channel ${n + 1}`]), String(audio.routes[i]));
    sel.disabled = !audio.stream; sel.onchange = e => audio.route(i, Number(e.target.value)); label.append(sel);
    const meter = node('meter'); meter.min = 0; meter.max = 1; meter.value = 0; meter.dataset.meter = i; meter.setAttribute('aria-label', `Input ${i ? 'B' : 'A'} level`);
    const gainLabel = node('label', 'Gain', 'field'); const gain = node('input'); gain.type = 'range'; gain.min = 0; gain.max = 2; gain.step = 0.01; gain.value = audio.gains[i]; gain.oninput = e => audio.gain(i, Number(e.target.value)); gainLabel.append(gain);
    row.append(label, meter, gainLabel); routes.append(row);
  }
}
function detachInput() { noteActivity.clear('input:'); inputRevision++; if (inputPort) { inputPort.onmidimessage = null; inputPort.close().catch(() => {}); } inputPort = null; store.cancel(); midiOut?.disarm('midi-input-change'); audio.stopMidiInput(); sampler?.stop(); laser?.stop(); }
async function selectInput(id) {
  detachInput(); inputId = '';
  const revision = inputRevision;
  if (id === 'demo') { inputId = id; renderConfig(); renderCapture(); return; }
  if (id) {
    const p = access?.inputs.get(id); if (!p || p.state !== 'connected') throw new Error('MIDI input is unavailable.');
    await p.open();
    if (revision !== inputRevision) { if (inputPort !== p) await p.close(); return; }
    inputPort = p; inputId = id;
    monitorPorts.delete(p.id);
    p.onmidimessage = event => receive(event.data, { id: p.id, name: p.name || '', manufacturer: p.manufacturer || '' });
  }
  renderConfig(); renderCapture(); refreshMonitorAll();
}
let midiPending = false, midiRevision = 0, audioPending = false;
function watchMidiAccess() {
  access.onstatechange = () => {
    if (inputPort?.state === 'disconnected') { detachInput(); notify('MIDI input disconnected. Turn MIDI ON to reconnect.'); }
    if (outputId && access.outputs.get(outputId)?.state !== 'connected') midiOut.select(null);
    renderConfig(); renderCapture(); if (monitorAll) refreshMonitorAll();
  };
}
async function listMidiDevices() {
  if(!navigator.requestMIDIAccess)return;
  // Enumeration only: never attach an input handler or arm notes on reload.
  const listed = await navigator.requestMIDIAccess({sysex:$('#sysex-permission',configBody).checked});
  if(midiPending || inputPort || midiOut.summary().armed)return;
  access=listed;watchMidiAccess();
  if(!Object.hasOwn(ioSettings,'midiInput'))inputId=Array.from(access.inputs.values()).find(p=>p.state==='connected'&&p.name==='USB MIDI Device')?.id||'';
  if(!Object.hasOwn(ioSettings,'midiOutput'))outputId=Array.from(access.outputs.values()).find(p=>p.state==='connected'&&p.name==='USB MIDI Device')?.id||'';
  saveDeviceSelection();renderConfig();
}
async function connectMidi() {
  if (!navigator.requestMIDIAccess) throw new Error('Web MIDI is unavailable in this browser.');
  const revision = ++midiRevision; midiPending = true;
  try {
    access = await navigator.requestMIDIAccess({ sysex: $('#sysex-permission', configBody).checked });
    if (revision !== midiRevision || document.hidden) return;
    watchMidiAccess();
    const connected = ports => Array.from(ports.values()).filter(p => p.state === 'connected');
    const inputs = connected(access.inputs), outputs = connected(access.outputs);
    const preferred = (ports, id) => id ? ports.find(p => p.id === id) : ports.find(p => p.name === 'USB MIDI Device');
    const input = preferred(inputs, inputId), output = preferred(outputs, outputId);
    if (inputId && inputId !== 'demo' && !input) throw new Error('Selected MIDI input unavailable; choose a device.');
    if (outputId && !output) throw new Error('Selected MIDI output unavailable; choose a device.');
    await selectInput(inputId === 'demo' ? 'demo' : input?.id || '');
    if (revision !== midiRevision || document.hidden) return;
    outputId = output?.id || ''; midiOut.select(output || null);
    saveDeviceSelection();
    if (output) await midiOut.enable();
    notify(input && output ? 'USB MIDI ready.' : 'USB MIDI Device unavailable in one or both directions; select the missing device.');
  } finally { midiPending = false; renderConfig(); }
}
async function toggleMidi() {
  if (midiPending || inputPort || midiOut.summary().armed) { midiRevision++; detachInput(); midiOut.disarm('operator-off'); renderConfig(); return; }
  await connectMidi();
}
$('#connect-midi', configBody).onclick = run(toggleMidi);
$('#midi-input', configBody).onchange = run(async e => { const enabled = midiOut.summary().armed; await selectInput(e.target.value); saveDeviceSelection(); if (enabled && midiOut.summary().portId) await midiOut.enable(); });
$('#midi-output', configBody).onchange = run(async e => { outputId = e.target.value; saveDeviceSelection(); store.cancel(); midiOut.select(access?.outputs.get(outputId) || null); if (outputId) await midiOut.enable(); renderConfig(); renderCapture(); });
$('#midi-channel', configBody).onchange = e => { channel = e.target.value; store.cancel(); renderCapture(); };
$('#refresh-audio', configBody).onclick = run(() => audio.refresh());
async function toggleAudio() {
  if (audioPending || audio.context?.state === 'running') { audioPending = false; sampler?.stop(); spore?.stopAudioOutputs(); audioPod?.cancelPendingMic(); await audio.off(); return; }
  audioPending = true;
  try { await audio.start(audio.inputId); } finally { audioPending = false; renderConfig(); }
}
$('#audio-toggle', configBody).onclick = run(toggleAudio);
$('#audio-test', configBody).onclick = run(() => audio.testTone());
$('#audio-input', configBody).onchange = run(async e => { audio.inputId = e.target.value; saveDeviceSelection(); await audio.start(audio.inputId); });
$('#audio-output', configBody).onchange = run(async e => { const id=e.target.value; if(audio.context?.setSinkId) await audio.setOutput(id); else audio.outputId=id; saveDeviceSelection(); renderConfig(); });
$('#audio-monitor', configBody).onchange = e => audio.setMonitor(e.target.checked);
$('#audio-latency', configBody).onchange = e => { try { localStorage.setItem('hylon-audio-latency', e.target.value); } catch {} renderConfig(); };
$('#audio-limiter', configBody).onchange = e => { try { localStorage.setItem('hylon-audio-limiter', e.target.checked ? 'on' : 'off'); } catch {} audio.mixer?.setLimiter?.(e.target.checked); };
$('#master-gain', configBody).oninput = e => audio.setMasterGain(Number(e.target.value));
navigator.mediaDevices?.addEventListener('devicechange', () => audio.refresh().catch(e => notify(e.message)));

sampler = mountSampler(roots.sampler, { notationRoot:roots.notation,isAudioRunning:()=>audio.context?.state==='running', getAudioContext: () => audio.ensure(), getDestination: () => audio.destination(), getDirectDestination: () => audio.directDestination('klais'), notify, onLibrary: list => registers?.setLibrary(list), onLayers: (ids, source) => registers?.samplerLayers(ids, source) });
registrationOutput = createRegistrationOutput({ getStore: () => store, midiOut, onChange: (slot, on, context) => { const knob = knobForSlot(slot); if (knob && on !== null) { if (context?.snapshot) registers?.captureSnapshot(context.active ?? (on ? knob.n : null), context.knobs); else registers?.captureState(knob.n, on); } } });
registers = mountRegisters(roots.registers, { sampler, midiOut, registrationOutput, notify, onDrawnChange:knobs=>sampler?.setRegistration(knobs),getActiveScore:()=>spore?.activeSource() });
$('.masthead').append(registers.headerElement());
attackTester=mountAttackPod(roots.attack,{audio,sampler,midiOut,notify});
laser = mountLaser(roots.laser, { notify, getEditor: () => roots.score.querySelector('textarea[data-editor]'), getScoreTime: () => { const s = spore?.state?.(); return s && Number.isFinite(s.positionMs) ? s.positionMs / 1000 : null; } });
audioPod = mountMixer(roots.audio, { audio, midiOut, sampler, notify, toggleAudio, onFollowerMessage:(bytes,owner)=>{noteActivity.midi(`follower:${owner||'generated'}`,bytes);if(!monitorOn&&isNoteMessage(bytes))return;const record=store.receive(bytes,{id:'hylon:mic-follower',name:'FOLLOWER · generated',manufacturer:'HYLON'});if(record)changed();} });
installScoreHighlights(document);
spore = mountSpore(roots.spore, { audio, midiOut, sampler, laser, notify,onOutputChange:routes=>{audio.setOutputRoutes(routes);midiOut.setNoteRouteEnabled(routes.midi);if(!routes.klais)sampler.stop();},prepareRegistration:source=>registers.prepareScorePrograms(source),onRegistrationCue:cue=>registers.syncScoreCue(cue),onRegistrationPreview:state=>registers.previewCue(state),onSection:section=>{impro?.scoreSection(section?.impro||null);if(section?.follow)try{audioPod.setFollowMatrix(section.follow);}catch(error){notify(`FOLLOW · ${error.message}`);}} });
roots.score.append(spore.scoreElement());
$('.scene-transport').before(spore.metricsElement());

const performanceKnobs=node('div',undefined,'performance-knobs');
for(const [key,label,min,max,title] of [['tempo','TEMPO',.25,4,'Playback tempo multiplier · 100ms smoothing · drag up/down · double-click resets'],['dur','DUR',.001,1,'Gate percentage for every note, limited by the DUR gap (I/O): a note sounds max(d × DUR, d − gap) · 100ms smoothing · minimum 10ms · double-click resets']]){
 const knob=node('div',undefined,'performance-knob');knob.dataset.performance=key;knob.tabIndex=0;knob.setAttribute('role','slider');knob.setAttribute('aria-label',label);knob.setAttribute('aria-valuemin',String(min));knob.setAttribute('aria-valuemax',String(max));knob.title=title;knob.innerHTML=`<span>${label}</span><i aria-hidden="true"></i><output></output>`;paintPerformanceKnob(knob,1);performanceKnobs.append(knob);
}
$('.scene-transport').after(performanceKnobs);

const globalOutputs=node('div',undefined,'global-output-buttons');
for(const route of ['klais','audio','midi']){const button=node('button');decorateOutputControl(button,route,'GLOBAL destination · all note sources');button.dataset.globalOutput=route;button.setAttribute('aria-keyshortcuts',({klais:'U',audio:'I',midi:'O'})[route]);button.title+=` · shortcut ${{klais:'U',audio:'I',midi:'O'}[route]}`;button.onclick=run(()=>spore.setOutput(route,!spore.state().outputs[route]));globalOutputs.append(button);}
performanceKnobs.after(globalOutputs);
// Load meter right after K · LA · MO (before the A / M / L process toggles).
const loadMeter=mountLoadMeter({getMidi:()=>midiOut?.summary(),getAudio:()=>audio});globalOutputs.after(loadMeter.element);
audio.setOutputRoutes(spore.state().outputs);midiOut.setNoteRouteEnabled(spore.state().outputs.midi);

bindPerformanceKnobs($('.masthead'),(key,value)=>spore.setPerformance(key,value),{ready:()=>!$('#workspace').inert&&!psBusy&&!midiOut.summary().sweeping});
// Articulation settings (I/O): DUR gap and re-attack gap, kept in localStorage and applied at start.
{const stored=(key,fallback,max)=>{try{const v=Number(localStorage.getItem(key));return localStorage.getItem(key)!==null&&Number.isFinite(v)&&v>=0&&v<=max?v:fallback;}catch{return fallback;}};
 const gapInput=$('#dur-gap',configBody),reattackInput=$('#reattack-gap',configBody);gapInput.value=String(stored('hylon-dur-gap-ms',250,2000));reattackInput.value=String(stored('hylon-reattack-ms',30,200));
 const applyGap=()=>{const v=Math.max(0,Math.min(2000,Number(gapInput.value)||0));try{localStorage.setItem('hylon-dur-gap-ms',String(v));spore.setPerformance('gap',v/1000);}catch(error){notify(error.message);}};
 const applyReattack=()=>{const v=Math.max(0,Math.min(200,Number(reattackInput.value)||0));try{localStorage.setItem('hylon-reattack-ms',String(v));midiOut.setRearticulate(v);}catch(error){notify(error.message);}};
 gapInput.onchange=applyGap;reattackInput.onchange=applyReattack;applyGap();applyReattack();}

const activeScoreLabel=node('span',undefined,'active-score-title');activeScoreLabel.title='Active score';const activeScoreName=node('span',undefined,'active-score-name'),activeSectionName=node('span',undefined,'active-section-name');activeScoreLabel.append(activeScoreName,activeSectionName);
const fastScores=node('div',undefined,'score-fast-line');fastScores.append(spore.scoreButtons(),activeScoreLabel,registers.previewElement());$('.masthead').append(fastScores);
const headerMain=node('div',undefined,'header-main-row');headerMain.append(...[...$('.masthead').childNodes].filter(child=>child!==fastScores));$('.masthead').prepend(headerMain);
library = mountLibrary(roots.library, { sampler, midiOut, audio, notify, getEditor: () => roots.score.querySelector('textarea[data-editor]') });
mountLyrics(roots.lyrics, { getLyrics: () => spore?.lyrics() });
impro = mountImpro(roots.impro, { audio, midiOut, sampler, notify, getPerformance: () => spore?.performance?.(), getEditor: () => roots.score.querySelector('textarea[data-editor]') });
$('#midi-note-out [data-test-stop]',configBody).addEventListener('click',()=>{attackTester?.stop();library?.stopMidiProcess();impro?.stop();});
const titles = { capture: 'CAPTURE', config: 'I/O', monitor: 'MIDI MONITOR', sampler: 'SAMPLER', laser: 'LASER', audio: 'MIXER', spore: 'SPORE', registers: 'REGISTERS', score: 'SCORE TXT', library: 'LIBRARY',notation:'VEXFLOW',impro:'IMPRO',lyrics:'LYRICS',attack:'ATTACK' };
const dock = createDockview($('#workspace'), {
  defaultTabComponent: 'pod-tab', createTabComponent: createPodTab,
  theme: { name: 'hylon', className: 'dockview-theme-hylon', gap: 5 }, disableFloatingGroups: true,
  createComponent: ({ name }) => {
    let visibility;
    const stop = () => { if (name === 'attack')attackTester?.stop();if (name === 'library')library?.stop(); if (name === 'sampler') sampler.stop(); if (name === 'laser') laser.stop(); if (name === 'capture') store.cancel(); };
    return { element: roots[name], init({ api }) { if (name === 'audio') audioPod.setVisible(api.isVisible); if (name === 'spore') spore.setVisible(api.isVisible); visibility = api.onDidVisibilityChange(() => { if (name === 'audio') audioPod.setVisible(api.isVisible); if (name === 'spore') spore.setVisible(api.isVisible); if (!api.isVisible) stop(); }); }, dispose() { visibility?.dispose(); if (name === 'audio') { audioPod.setVisible(false); audioPod.cancelPendingMic(); audio.stopInput(); } if (name === 'spore') { spore.pause('pod-closed'); spore.setVisible(false); } stop(); } };
  }
});
dock.layout($('#workspace').clientWidth, $('#workspace').clientHeight);
function defaultLayout() {
  dock.clear(); const mobile = innerWidth < 760;
  dock.addPanel({ id: 'capture', component: 'capture', title: titles.capture });
  dock.addPanel({ id: 'config', component: 'config', title: titles.config, initialWidth: 375, position: { referencePanel: 'capture', direction: mobile ? 'within' : 'right' } });
  dock.addPanel({ id: 'monitor', component: 'monitor', title: titles.monitor, inactive: true, position: { referencePanel: 'capture', direction: 'within' } });
  for (const id of ['sampler','notation', 'registers', 'laser', 'audio', 'spore', 'score', 'library', 'impro', 'lyrics', 'attack']) dock.addPanel({ id, component: id, title: titles[id], inactive: true, position: { referencePanel: 'config', direction: 'within' } });
  dock.getPanel('capture').api.setActive();
  if (!mobile) requestAnimationFrame(() => dock.getPanel('config')?.api.group.api.setSize({ width: 375 }));
}
// Workspaces: rail1–4 click recalls, Shift+click stores. No OS-level number chords.
let activeWorkspace=0;
const workspaceStore=createWorkspaceStore({dock,storage:localStorage,titles});
function recallWorkspace(n){if(!workspaceStore.recall(n))return false;activeWorkspace=n;return true;}
try { if (!recallWorkspace(1)) { const saved = localStorage.getItem(`hylon-layout-${innerWidth < 760 ? 'mobile' : 'desktop'}`); if (saved) dock.fromJSON(JSON.parse(saved)); else defaultLayout(); } } catch { defaultLayout(); }
for (const panel of dock.panels) if (titles[panel.id]) panel.api.setTitle(titles[panel.id]);
dock.onDidLayoutChange(() => { try { localStorage.setItem(`hylon-layout-${innerWidth < 760 ? 'mobile' : 'desktop'}`, JSON.stringify(dock.toJSON())); } catch {} });
function activate(id) {
  if (dock.activePanel?.api.isMaximized()) dock.activePanel.api.exitMaximized();
  let panel = dock.getPanel(id);
  if (!panel) panel = dock.addPanel({ id, component: id, title: titles[id] });
  panel.api.setActive();
  if (id === 'sampler' || id === 'laser' || id === 'audio' || id === 'spore') panel.api.maximize();
}
const podRail=mountPodRail({dock,titles,activate,notify,
  workspace(number,save){try{if(save){workspaceStore.save(number);activeWorkspace=number;notify(`Workspace ${number} saved${number===1?' · startup layout':''}`);}else if(recallWorkspace(number))notify(`Workspace ${number}`);else notify(`Workspace ${number} empty · Shift+click to save`);}catch(error){notify(`Workspace ${number}: ${error.message}`);}},
  workspaceState(number){let stored=false;try{stored=workspaceStore.stored(number);}catch{}return {stored,active:activeWorkspace===number};}
});
const workspaceResize=new ResizeObserver(()=>dock.layout($('#workspace').clientWidth,$('#workspace').clientHeight));workspaceResize.observe($('#workspace'));
$('#reset-layout').onclick = ()=>{activeWorkspace=0;defaultLayout();podRail.sync();};
const dialog = $('#config-dialog');
$('#config-modal').onclick = () => {if(dialog.open)return;$('#modal-config').append(configBody);dialog.showModal();};
document.addEventListener('keydown',event=>{if(!event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||!(event.code==='Comma'||event.key===','))return;if($('#config-modal').disabled)return;event.preventDefault();event.stopPropagation();if(!event.repeat)$('#config-modal').onclick();},true);
$('#close-config').onclick = () => dialog.close();
dialog.addEventListener('close', () => {roots.config.append(configBody);});

// Reuse the live MIXER DOM: modal and pod share controls, meters and DSP state.
const mixerDialog=node('dialog');mixerDialog.id='mixer-dialog';mixerDialog.className='mixer-dialog';mixerDialog.setAttribute('aria-labelledby','mixer-dialog-title');mixerDialog.setAttribute('aria-keyshortcuts','M');
const mixerDialogHead=node('div',undefined,'dialog-head'),mixerDialogTitle=node('span','MIXER'),mixerDialogClose=node('button','×');mixerDialogTitle.id='mixer-dialog-title';mixerDialogClose.type='button';mixerDialogClose.title='Close MIXER · M / Esc';mixerDialogClose.setAttribute('aria-label','Close mixer');mixerDialogHead.append(mixerDialogTitle,mixerDialogClose);mixerDialog.append(mixerDialogHead);document.body.append(mixerDialog);
let mixerPlaceholder=null;
function toggleMixerModal(){
  if(mixerDialog.open){mixerDialog.close();return;}
  if(document.querySelector('dialog[open]')||$('#workspace').inert)return;
  mixerPlaceholder=document.createComment('MIXER pod location');
  roots.audio.parentNode?.insertBefore(mixerPlaceholder,roots.audio);
  mixerDialog.append(roots.audio);mixerDialog.showModal();
}
mixerDialogClose.onclick=()=>mixerDialog.close();
mixerDialog.addEventListener('close',()=>{if(mixerPlaceholder?.parentNode)mixerPlaceholder.replaceWith(roots.audio);else roots.audio.remove();mixerPlaceholder=null;});
document.addEventListener('keydown',event=>{
  if(event.code!=='KeyM'||event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.isComposing)return;
  if(event.target.closest?.('textarea,select,input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]),[contenteditable]:not([contenteditable="false"]),[role="textbox"]')||$('#workspace').inert)return;
  const openDialog=document.querySelector('dialog[open]');if(openDialog&&openDialog!==mixerDialog)return;
  event.preventDefault();event.stopPropagation();if(!event.repeat)toggleMixerModal();
},true);

// IMPRO modal on E: same pattern as MIXER on M. The live pod DOM moves into the dialog and back,
// so patches, routing, LEDs and the armed state are the same object in both places.
const improDialog=node('dialog');improDialog.id='impro-dialog';improDialog.className='mixer-dialog impro-dialog';improDialog.setAttribute('aria-labelledby','impro-dialog-title');improDialog.setAttribute('aria-keyshortcuts','E');
const improDialogHead=node('div',undefined,'dialog-head'),improDialogTitle=node('span','IMPRO · E close · A arm · S K · D LA · F MO · W random · Z X C V N R of P I II III IV'),improDialogClose=node('button','×');improDialogTitle.id='impro-dialog-title';improDialogClose.type='button';improDialogClose.title='Close IMPRO · E / Esc';improDialogClose.setAttribute('aria-label','Close impro');improDialogHead.append(improDialogTitle,improDialogClose);improDialog.append(improDialogHead);document.body.append(improDialog);
let improPlaceholder=null;
function toggleImproModal(){
  if(improDialog.open){improDialog.close();return;}
  if(document.querySelector('dialog[open]')||$('#workspace').inert)return;
  improPlaceholder=document.createComment('IMPRO pod location');
  roots.impro.parentNode?.insertBefore(improPlaceholder,roots.impro);
  improDialog.append(roots.impro);improDialog.showModal();
}
improDialogClose.onclick=()=>improDialog.close();
improDialog.addEventListener('close',()=>{if(improPlaceholder?.parentNode)improPlaceholder.replaceWith(roots.impro);else roots.impro.remove();improPlaceholder=null;});
document.addEventListener('keydown',event=>{
  if(event.code!=='KeyE'||event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.isComposing)return;
  if(event.target.closest?.('textarea,select,input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):not([type="button"]),[contenteditable]:not([contenteditable="false"]),[role="textbox"]')||$('#workspace').inert)return;
  const openDialog=document.querySelector('dialog[open]');if(openDialog&&openDialog!==improDialog)return;
  event.preventDefault();event.stopPropagation();if(!event.repeat)toggleImproModal();
},true);

$('#super-panic').onclick = async () => { noteActivity.clear();
  midiRevision++;store.cancel();spore?.pause('SUPER PANIC');library?.stop();attackTester?.stop();impro?.disarm('stopped');sampler.stop();audioPod.cancelPendingMic();
  midiOut.panic();audio.panic();renderCapture();
  const sweep=midiOut.panic2({passes:2,onProgress:({sent,total,pass,passes})=>notify(`SUPER PANIC · sweep ${pass}/${passes} · ${sent}/${total} dispatched · MIDI OFF`)});
  const [midiResult,laserResult]=await Promise.allSettled([sweep,laser.panic()]);
  const error=[midiResult.status==='rejected'?midiResult.reason.message:midiResult.value.failed?`${midiResult.value.failed} MIDI messages failed`:'',laserResult.status==='rejected'?laserResult.reason.message:''].filter(Boolean).join(' · ');
  notify(`SUPER PANIC · ${error||'two MIDI sweeps dispatched / HELIOS stop requested'} · MIDI OFF`);
  return {ok:!error,error};
};
$('#panic-2').onclick = async () => { noteActivity.clear();
  const button = $('#panic-2'); if (button.disabled||psBusy) return {ok:false,error:'Another panic is running'};
  const idleTitle=button.title;button.disabled = true; button.textContent = 'P2'; midiRevision++;
  try {
    store.cancel(); spore?.pause('P2'); library?.stop();attackTester?.stop();impro?.disarm('stopped'); sampler.stop(); audioPod.cancelPendingMic(); audio.panic();
    renderCapture();
    const result = await midiOut.panic2({ onProgress: ({ sent, failed, total, pass, passes }) => {
      button.title = `P2 ${Math.floor((sent+failed)/total*100)}% · pass ${pass}/${passes}`;
      notify(`P2 · pass ${pass}/${passes} · ${sent}/${total} messages dispatched${failed ? ` · ${failed} failed` : ''} · MIDI note output disabled`);
    } });
    notify(`P2 ${result.failed ? 'delivery incomplete' : 'complete'} · ${result.portName} · ${result.sent}/${result.total} sent${result.failed ? ` · ${result.failed} failed` : ''} · MIDI remains OFF`);
    return { ok: !result.failed, error: result.failed ? `${result.failed} P2 messages failed` : '' };
  } catch (error) { notify(`P2 failed · ${error.message}`); return { ok:false,error:error.message }; }
  finally { button.disabled = false; button.textContent = 'P2';button.title=idleTitle; renderConfig(); }
};
$('#panic-sc').onclick = async () => { noteActivity.clear();
  if(psBusy)return {ok:false,error:'PS already running'};
  const button=$('#panic-sc');psBusy=true;button.disabled=true;button.textContent='PS…';
  midiRevision++;store.cancel();spore?.pause('PS');library?.stop();attackTester?.stop();impro?.disarm('stopped');sampler.stop();audioPod.cancelPendingMic();midiOut.cancelPanic();midiOut.disarm('PS');audio.panic();renderCapture();
  try{
    notify('PS · requesting SuperCollider panic through localhost OSC');
    const response=await fetch('/__hylon_remote/sc-panic',{method:'POST',credentials:'same-origin'});
    const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||'SC panic failed');
    notify(`PS · ${result.message} · HYLON MIDI remains OFF`);return {ok:true};
  }catch(error){notify(error.message);return {ok:false,error:error.message};}
  finally{psBusy=false;button.disabled=false;button.textContent='PS';renderConfig();}
};
$('#stop-all').onclick = () => { noteActivity.clear(); midiRevision++; store.cancel(); spore?.pause('global-stop'); library?.stop();attackTester?.stop();impro?.disarm('stopped'); midiOut?.disarm('global-stop'); sampler.stop(); laser.stop(); audioPod.cancelPendingMic(); audio.stopGarden(); audio.stopTest(); audio.stopInput(); audio.mixer?.panic(); renderCapture(); notify('Capture ended · sampler stopped · input monitoring stopped · FX tails cleared · laser preview blacked out. Owned MIDI notes released; output disabled.'); };
document.addEventListener('visibilitychange', () => { if (document.hidden) { midiRevision++; store.cancel(); spore?.pause('global-stop'); library?.stop();attackTester?.stop();impro?.disarm('stopped'); midiOut?.disarm('global-stop'); sampler.stop(); audioPod.cancelPendingMic(); audio.setMonitor(false); audio.stopTest(); renderCapture(); if (dirty) { clearTimeout(saveTimer); saveTimer = null; save(); } } });
window.addEventListener('pagehide', () => { midiRevision++; store.cancel(); spore?.pause('global-stop'); library?.stop();attackTester?.stop();impro?.disarm('stopped'); midiOut?.disarm('global-stop'); sampler.stop(); laser.stop(); audioPod.cancelPendingMic(); audio.stopGarden(); audio.stopTest(); audio.stopInput(); audio.mixer?.panic(); clearTimeout(saveTimer); save(); });
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
setInterval(() => { if (store.target || $('#capture-state', roots.capture).classList.contains('listening')) renderCapture(); }, 500);
// Header duplicates the pod commands; it never arms from score/session state.
$('#scene-play').onclick=run(()=>spore.toggle());
$('#scene-hold').onclick=()=>spore.hold();
$('#scene-reset').onclick=()=>spore.reset();
$('#scene-speed').onchange=run(event=>spore.setSpeed(Number(event.target.value)));
// Global transport keys: Space holds without rewinding; Backspace stops at zero.
let keyboardPlayPending=false;
// Space is always play / hold unless the caret is in a real text field (score editor, text or number entry):
// a focused slider, checkbox, select, button or sampler key no longer swallows it. Taken in the capture phase,
// and the matching keyup is cancelled too, so a focused button is not clicked by the same key.
const TEXT_ENTRY='textarea,[contenteditable]:not([contenteditable="false"]),[role="textbox"],input:not([type]),input[type="text"],input[type="search"],input[type="number"],input[type="email"],input[type="url"],input[type="password"],input[type="tel"]';
const transportKey=event=>['Space','Backspace'].includes(event.code)&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.shiftKey&&!event.isComposing&&!event.target.closest?.(TEXT_ENTRY)&&!$('#workspace').inert&&(event.code==='Space'||(!event.target.closest?.('input,select')&&!document.querySelector('dialog[open]')));
document.addEventListener('keyup',event=>{if(event.code==='Space'&&transportKey(event)){event.preventDefault();event.stopPropagation();}},true);
document.addEventListener('keydown',event=>{
  if(!transportKey(event))return;
  event.preventDefault();event.stopPropagation();window.getSelection?.()?.removeAllRanges();
  if(event.repeat)return;
  if(event.code==='Backspace'){keyboardPlayPending=false;spore.reset();return;}
  if(spore.state().running||keyboardPlayPending){keyboardPlayPending=false;spore.hold();return;}
  if(!spore.state().ready||psBusy||midiOut.summary().sweeping||$('#panic-2').disabled)return;
  keyboardPlayPending=true;
  run(async()=>{try{await spore.play();}finally{keyboardPlayPending=false;}})();
},true);

document.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.code)||event.defaultPrevented||event.repeat||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.isComposing)return;
  if(event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"],[role="slider"],.follower-matrix')||document.querySelector('dialog[open]')||$('#workspace').inert)return;
  event.preventDefault();event.stopPropagation();
  if(psBusy||midiOut.summary().sweeping||$('#panic-2').disabled)return;
  registers.stepProgram(event.code==='ArrowLeft'?-1:1);
},true);
const soundGarden=mountGarden(audio,$('#command-laser'),run);
$('#command-audio').onclick = run(event => event.shiftKey ? audio.testTone() : toggleAudio());
$('#command-midi').onclick = run(async event => {
  if (!event.shiftKey) return toggleMidi();
  if (!midiOut.summary().armed) await connectMidi();
  midiOut.testSequence();
},true);
$('#command-laser').onclick = run(event => event.shiftKey ? laser.test() : laser.toggle());

// IMPRO pod, open or closed: A arm · S K · D LA · F MO (its own destinations) · W random patch ·
// Z X C V N toggle R (rotate over the other manuals) for the sources P · I · II · III · IV.
const improShortcuts={KeyA:'arm',KeyS:'klais',KeyD:'audio',KeyF:'midi',KeyW:'random',KeyZ:'rotate:pe',KeyX:'rotate:go',KeyC:'rotate:po',KeyV:'rotate:re',KeyN:'rotate:so'},IMPRO_SOURCE={pe:'P',go:'I',po:'II',re:'III',so:'IV'};
document.addEventListener('keydown',event=>{
  const action=improShortcuts[event.code];if(!action||event.defaultPrevented||event.repeat||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.isComposing)return;
  if(event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'))return;
  const openDialog=document.querySelector('dialog[open]');if(openDialog&&openDialog.id!=='impro-dialog')return;
  if($('#workspace').inert||psBusy||midiOut.summary().sweeping)return;
  event.preventDefault();event.stopPropagation();if(action==='random'||action.startsWith('rotate:')){try{if(action==='random'){impro?.remoteSet('random',true);notify('IMPRO · random patch');}else{const src=action.slice(7);impro?.remoteSet('route',`${src}:*`);const on=!!impro?.remoteState().pad?.matrix?.[src]?.includes('*');notify(`IMPRO · ${IMPRO_SOURCE[src]} → R ${on?'ON':'OFF'}`);}}catch(error){notify(`IMPRO · ${error.message}`);}}else impro?.toggle(action);
},true);
const performanceShortcuts={KeyJ:'#command-audio',KeyK:'#command-midi',KeyL:'#command-laser',KeyU:'[data-global-output="klais"]',KeyI:'[data-global-output="audio"]',KeyO:'[data-global-output="midi"]'};
document.addEventListener('keydown',event=>{
  const selector=performanceShortcuts[event.code];if(!selector||event.defaultPrevented||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.isComposing)return;
  if(event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')||document.querySelector('dialog[open]'))return;
  if($('#workspace').inert||psBusy||midiOut.summary().sweeping)return;
  const button=$('.masthead').querySelector(selector);if(!button||button.disabled)return;
  event.preventDefault();event.stopPropagation();if(!event.repeat)button.click();
},true);
// , and . (the < > keys): previous / next piece of the cycle in concert order (01 02 03 04 05 07 08 09 06).
// Only the nine official pieces, never INIT or the labs; same action as clicking the piece's button.
document.addEventListener('keydown',event=>{
  if(!['Comma','Period'].includes(event.code)||event.metaKey||event.ctrlKey||event.altKey||event.shiftKey||event.isComposing)return;
  if(event.target.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]')||document.querySelector('dialog[open]'))return;
  if($('#workspace').inert||psBusy||midiOut.summary().sweeping)return;
  const pieces=[...$('.masthead').querySelectorAll('.score-fast-button.piece')];if(!pieces.length)return;
  event.preventDefault();event.stopPropagation();if(event.repeat)return;
  const current=pieces.findIndex(button=>button.classList.contains('active')),step=event.code==='Period'?1:-1;
  const next=current<0?(step>0?0:pieces.length-1):current+step;if(next<0||next>=pieces.length)return;
  if(!pieces[next].disabled)pieces[next].click();
},true);

// Performance recorder: header ● · click = MIDI in/out + state log · Shift+click = the same plus the microphone input.
var perfRecorder = createPerfRecorder({ audio, notify, onChange: () => {},
  getState() { const scene = spore.state(), manual = spore.remoteState()?.manual, i = impro?.remoteState?.();
    return { pos: Math.round(scene.positionMs || 0), file: scene.file, section: scene.sectionId || '', running: !!scene.running, tempo: scene.performance?.tempo, dur: scene.performance?.dur, speed: scene.speed, vector: manual?.vector, outputs: manual?.outputs,
      program: ($('.masthead .reg-header-counter')?.textContent || '').trim(), impro: i ? { armed: i.armed, routes: i.routes, patch: i.patch, follow: i.follow, pad: i.pad } : null }; } });
$('#command-rec').onclick = run(async event => { await perfRecorder.toggle({ withAudio: event.shiftKey }); });
setInterval(() => { const r = perfRecorder.status(), button = $('#command-rec'); if (!button) return; button.classList.toggle('active', r.recording); button.classList.toggle('danger', r.recording); button.setAttribute('aria-pressed', String(r.recording)); button.title = r.recording ? `REC ${r.audio ? 'MIDI + MIC' : 'MIDI'} · ${Math.floor(r.seconds / 60)}:${String(r.seconds % 60).padStart(2, '0')} · click to stop` : 'REC OFF · click: record MIDI in / out and the performance log · Shift+click: also the microphone input'; }, 500);
const remoteHost = mountRemoteHost({
  notify,
  getState() {
    const scene=spore.state();
    return {osc:{section:scene.sectionName?`${scene.sectionId} · ${scene.sectionName}`:'',sectionLeft:Number.isFinite(scene.sectionLeft)?Math.round(scene.sectionLeft*10)/10:null,program:[$('.masthead .reg-header-counter')?.textContent,$('.masthead .reg-preview:not([hidden])')?.textContent].map(t=>(t||'').replace(/\s+/g,' ').trim()).filter(Boolean).join('  ').slice(0,60)},headerHTML:$('.masthead').innerHTML,spore:spore.remoteState(),mixer:audioPod.remoteState(),impro:impro?.remoteState?.()||null, ready:scene.ready&&!$('#workspace').inert&&!document.hidden, title:scene.title, file:scene.file, positionMs:scene.positionMs, durationMs:scene.durationMs, running:scene.running, speed:scene.speed,performance:scene.performance,garden:!!audio.garden?.active,gardenPosition:audio.garden?.position||{x:.5,y:.6},midi:!!inputPort||midiOut.summary().armed, audio:audio.context?.state==='running', laser:!!laser.status().emitting, panicBusy:psBusy||midiOut.summary().sweeping||$('#panic-2').disabled,psBusy, feedback:$('#feedback').textContent };
  },
  async execute(action,value) {
    const scene=spore.state();
    if(action==='p2'){if($('#panic-2').disabled)throw new Error('P2 already running');const result=await $('#panic-2').onclick();if(result?.ok===false)throw new Error(result.error);return;}
    if(action==='stop-all'){$('#stop-all').onclick();return;}
    if(action==='ps'){const result=await $('#panic-sc').onclick();if(result?.ok===false)throw new Error(result.error);return;}
    if(action==='super-panic'){const result=await $('#super-panic').onclick();if(result?.ok===false)throw new Error(result.error);return;}
    if($('#workspace').inert||document.hidden)throw new Error('Keep the Mac HYLON page visible and ready');
    if(psBusy||midiOut.summary().sweeping||$('#panic-2').disabled)throw new Error('Panic running; processes stay stopped');
    if(action==='process'){
      const {key,value:desired}=value;
      if(key==='garden'){if(desired&&audio.context?.state!=='running')throw new Error('Enable AUDIO on the Mac first');await audio.setGarden(desired);soundGarden.sync();}
      else if(key==='audio'){if(desired&& !audio.context)throw new Error('Enable AUDIO once on Mac first');if(desired!==(audio.context?.state==='running'))await toggleAudio();}
      else if(key==='midi'){if(desired&&!access)throw new Error('Authorize MIDI once on Mac first');if(desired!==!!(inputPort||midiOut.summary().armed))await toggleMidi();}
      else if(key==='laser'){if(desired!==!!laser.status().emitting)await laser.remoteToggle();}
      return;
    }
    if(action==='program'){registers.stepProgram(value);return;}
    if(action==='score'){await spore.loadScoreFile(value);return;}
    if(action==='mixer'&&value.key==='garden.position'){audio.garden?.move(value.value.x,value.value.y);return;}
    if(action==='mixer'){await audioPod.remoteSet(value.key,value.value);return;}
    if(action==='spore'){await spore.remoteSet(value.key,value.value);return;}
    if(action==='impro'){if(!impro)throw new Error('IMPRO pod not ready');impro.remoteSet(value.key,value.value);return;}
    if(!scene.ready)throw new Error('Mac score not ready');
    if(action==='play'){
      if((scene.outputs.audio||scene.outputs.klais)&&audio.context?.state!=='running')throw new Error('Enable AUDIO locally on the Mac first');
      if(!scene.running)await spore.play();
    }else if(action==='stop'||action==='reset')spore.reset();
    else if(action==='hold')spore.hold();
    else if(action==='speed'&&[1,2,4,8,16].includes(value))spore.setSpeed(value);
    else throw new Error('Remote action unavailable');
  }
});
mountLivePublisher({getFrame:()=>spore.publicFrame(),notify,onGestures:list=>spore.publicGestures?.(list)});
const meterData = new Float32Array(256);
function level(analyser) {
  if (!analyser || audio.context?.state !== 'running') return 0;
  analyser.getFloatTimeDomainData(meterData);
  let peak = 0; for (const sample of meterData) peak = Math.max(peak, Math.abs(sample));
  return Math.min(1, peak);
}
function headerState(id, on, detail) {
  const button = $('#command-' + id);button.setAttribute('aria-keyshortcuts',({audio:'J',midi:'K',laser:'L'})[id]); button.classList.toggle('active', on); button.setAttribute('aria-pressed', String(on)); button.title = `${detail} · shortcut ${{audio:'J',midi:'K',laser:'L'}[id]}`;
}
setInterval(() => {
  const scene=spore.state();activeScoreName.textContent=scene.title;activeSectionName.textContent=scene.sectionName;activeSectionName.hidden=!scene.sectionName;activeSectionName.title=`${scene.sectionId} · ${scene.sectionName}`;{const left=scene.sectionLeft,ending=!!scene.running&&left>0&&left<=5;activeSectionName.classList.toggle('ending',ending);activeSectionName.classList.toggle('blink',ending&&Math.floor(left*4)%2===0);activeScoreName.hidden=ending;}activeScoreLabel.title=`Active score · ${scene.file}`;const busy=psBusy||midiOut.summary().sweeping,canControl=!$('#workspace').inert&&scene.ready&&!busy;
  document.querySelectorAll('.command,.reg-header-step').forEach(button=>button.disabled=busy||$('#workspace').inert);
  document.querySelectorAll('.scene-transport button,.scene-transport select').forEach(control=>{control.disabled=!canControl;});
  for(const button of globalOutputs.children){const on=scene.outputs[button.dataset.globalOutput];button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));button.disabled=!canControl;}
  document.querySelectorAll('[data-performance]').forEach(knob=>knob.setAttribute('aria-disabled',String(!canControl)));
  document.querySelectorAll('.score-fast-button').forEach(button=>{button.disabled=$('#workspace').inert||busy||scene.loadingScore;});
  const playButton=$('#scene-play'),playMode=scene.running?'stop':'play';if(playButton.dataset.mode!==playMode){playButton.dataset.mode=playMode;playButton.innerHTML=headerIcon(playMode);playButton.setAttribute('aria-label',scene.running?'Stop and reset':'Play / resume');}$('#scene-speed').value=String(scene.speed||1);for(const key of ['tempo','dur']){const knob=$(`[data-performance="${key}"]`);if(knob&&!knob.dataset.dragging)paintPerformanceKnob(knob,scene.performance?.[key]??1);}$('#scene-play').title=`Play / resume ${scene.scene} · ${scene.file}; while running, STOP resets to the start`;
  const pitch=audio.mixer?.pitch,frequency=pitch?.frequency||0,correction=pitch?.correctionCents;
  const followerLabel=`M ${audio.followerNote??'—'}`;
  $('#mic-pitch').textContent=frequency>0?`${frequency.toFixed(1)} Hz · ${Number.isFinite(correction)?(correction>=0?'+':'')+Math.round(correction)+'¢':'—¢'} · ${followerLabel}`:`— Hz · —¢ · ${followerLabel}`;
  $('#mic-pitch').title=frequency>0?`Follower MIDI note ${audio.followerNote??'—'} · mic input · autotune correction ${Number.isFinite(correction)?correction.toFixed(1)+' cents':'unvoiced'} · confidence ${Math.round((pitch.confidence||0)*100)}% · residual estimate ${Number.isFinite(pitch.residualCents)?pitch.residualCents.toFixed(1)+' cents':'—'}`:`Mic pitch / autotune correction · follower MIDI note ${audio.followerNote??'—'}`;
  const midi = midiOut.summary(), laserState = laser.status(), audioOn = audio.context?.state === 'running';
  headerState('audio', audioOn, `Audio ${audioOn ? 'ON' : 'OFF'} · mic ${audio.stream ? audio.monitor ? 'monitored' : 'muted' : 'off'} · ${audio.context?.sampleRate || '—'} Hz · master ${Math.round(audio.masterLevel*100)}% · click: on/off · Shift+click: L/R 0.5 s each`);
  headerState('midi', !!inputPort || midi.armed, `MIDI IN: ${inputPort?.name || 'OFF'} · OUT: ${midi.armed ? midi.portName : 'OFF'} · TX ${midi.sent} · ${midi.fault || midi.reason} · Shift+click: note 60 / channels 1–5 / 300 ms / duration 100 ms`);
  headerState('laser', laserState.emitting, `Laser ${laserState.emitting ? 'ON' : laserState.pending ? 'starting' : 'OFF'} · ${laserState.message} · Shift+click: full square / 1 s`);
  for (const [id, analyser, label] of [['header-mic', audio.inputMeter, 'MIC IN · physical channel 1'], ['header-out', audio.outputMeter, 'AUDIO OUT']]) {
    const peak = level(analyser), meter = $('#' + id); meter.value = Math.max(0, (20 * Math.log10(Math.max(.001, peak)) + 60) / 60);
    meter.title = `${label} · ${peak > .001 ? (20 * Math.log10(peak)).toFixed(1) + ' dBFS' : '−∞ dBFS'}`;
  }
  audio.analysers.forEach(({ analyser }, i) => { const meter = $(`[data-meter="${i}"]`, configBody); if (meter) meter.value = level(analyser); });
}, 100);
renderCapture(); renderMonitor(); renderConfig();
try {
  const ownsLease = navigator.locks ? await new Promise((resolve, reject) => {
    navigator.locks.request('hylon-field-writer', { ifAvailable: true }, async lock => {
      if (!lock) { resolve(false); return; }
      resolve(true); await new Promise(done => { releaseLease = done; });
    }).catch(reject);
  }) : null;
  if (ownsLease === false) {
    $('#storage-status').textContent = 'SESSION OPEN IN ANOTHER TAB';
    notify('This console is locked. Use the existing HYLON tab, or close it and reload here.');
    configBody.inert = true;
  } else if (ownsLease === null) {
    $('#workspace').inert = false; $('#config-modal').disabled = false; document.querySelectorAll('.command,.scene-transport button,.scene-transport select').forEach(button => { button.disabled = false; });
    $('#storage-status').textContent = 'MEMORY ONLY · EXPORT JSON';
    notify('Browser lacks single-writer locking; use JSON export. Persistent archive is disabled.');
  } else {
  db = await openArchive(); const saved = await readSession(db);
  if (saved) { store = new CaptureStore(saved); selected = store.session.slots[0]?.id; changed(); renderCapture(); renderMonitor(); }
  $('#storage-status').textContent = 'Local archive ready';
  $('#workspace').inert = false; $('#config-modal').disabled = false; document.querySelectorAll('.command,.scene-transport button,.scene-transport select').forEach(button => { button.disabled = false; });
  }
} catch (e) { db = null; $('#workspace').inert = false; $('#config-modal').disabled = false; document.querySelectorAll('.command,.scene-transport button,.scene-transport select').forEach(button => { button.disabled = false; }); $('#storage-status').textContent = 'MEMORY ONLY · EXPORT JSON'; notify(`Local archive unavailable: ${e.message}. Export JSON before closing.`); }

// List choices on every load without starting audio, listening to MIDI or enabling output.
Promise.allSettled([audio.refresh(),listMidiDevices()]).then(results=>{
  const failed=results.filter(result=>result.status==='rejected');
  if(failed.length)notify('Device list needs browser permission · use A/M or I/O to retry.');
});

// Fullscreen is a local display action; hardware authority never follows it.
const fullscreenButton = $('#fullscreen');
fullscreenButton.onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    else notify('Fullscreen is unavailable here. Use the browser fullscreen command.');
  } catch { notify('Fullscreen request denied by this browser. Use its fullscreen command or open HYLON in Chrome.'); }
};
document.addEventListener('fullscreenchange', () => {
  const label = document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen';
  fullscreenButton.title = label; fullscreenButton.setAttribute('aria-label', label);
  fullscreenButton.setAttribute('aria-pressed', String(Boolean(document.fullscreenElement)));
});
if (import.meta.hot) {
  import.meta.hot.dispose(() => {remoteHost.dispose();podRail.dispose();workspaceResize.disconnect();attackTester?.dispose();});
  import.meta.hot.on('vite:beforeFullReload', () => { midiRevision++; spore?.pause('reload'); midiOut?.disarm('reload'); sampler?.stop(); laser?.stop(); audioPod?.cancelPendingMic(); audio.stopGarden(); audio.stopTest(); audio.stopInput(); audio.mixer?.panic(); });
}
