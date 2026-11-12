import { createDockview } from 'dockview-core';
import 'dockview-core/dist/styles/dockview.css';
import './style.css';
import './bank.css';
import { CaptureStore, LIMITS } from './capture.js';
import { AudioSystem } from './audio.js';
import { openArchive, readSession, writeSession } from './persistence.js';
import { mountMidiOut } from './midi-out.js';
import { mountSpore } from './spore-pod.js';
import { mountSampler } from './sampler.js';
import { createAudioMixer } from '../../../packages/hylon-audio/mixer.js';
import { mountMixer } from './mixer-pod.js';
import { mountLaser } from './laser.js';
import { createPodTab } from './pod-tab.js';

const $ = (s, root = document) => root.querySelector(s);
const node = (tag, text, cls) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; if (cls) n.className = cls; return n; };
const notify = text => { $('#feedback').textContent = text; };
const run = fn => async (...args) => { try { await fn(...args); } catch (e) { notify(e.message || String(e)); } };
const download = (name, value, type = 'application/json') => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([value], { type })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
let store = new CaptureStore(), db = null, inputPort = null, access = null, inputId = '', outputId = '', channel = 'all';
let selected = store.session.slots[0].id, division = 'all', search = '', saveRevision = 0, saveTimer, renderTimer, inputRevision = 0;
let sampler, laser, audioPod, spore, midiOut;
let dirty = false, releaseLease;
$('#workspace').inert = true;
$('#config-modal').disabled = true;
const audio = new AudioSystem(() => { renderConfig(); audioPod?.sync(); }, { createMixer: createAudioMixer });
const roots = Object.fromEntries(['capture', 'config', 'monitor', 'sampler', 'laser', 'audio', 'spore'].map(id => [id, node('section', undefined, 'pod-root')]));
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

roots.capture.innerHTML = `<div class="capture-head"><div><div class="eyebrow">KLAIS / REGISTRATION ARCHIVE</div><h1>Capture the instrument.</h1><p class="muted">Listen to one registration at a time. ON and OFF remain separate observations.</p></div><span class="badge">INPUT ONLY</span></div><div class="toolbar session-tools"><button id="export-session" class="primary">EXPORT JSON</button><label class="file-button">IMPORT JSON<input id="import-session" type="file" accept="application/json,.json"></label><button id="new-session">NEW SESSION</button></div><div class="capture-overview"><span id="capture-progress"></span><span id="capture-state">READY / SELECT MIDI INPUT</span></div><div class="capture-work"><aside class="slot-browser"><input id="slot-search" type="search" placeholder="Find a registration…" aria-label="Search registrations"><div id="divisions" class="division-tabs"></div><div id="slot-list"></div><button id="add-slot">ADD CUSTOM SLOT</button></aside><div class="slot-detail"><div class="eyebrow" id="slot-division"></div><h2 id="slot-name"></h2><p class="muted">Catalog labels are provisional. Capture does not verify their meaning or send any output.</p><div class="capture-actions"><button id="capture-on" class="primary">CAPTURE ON</button><button id="capture-off">CAPTURE OFF</button><button id="cancel-capture" class="danger">END CAPTURE</button><button id="demo-message">ADD DEMO MESSAGE</button></div><p id="capture-help" class="status">Choose the MIDI input in I/O before capturing. Each window lasts 15 seconds.</p><label class="field">Session notes<textarea id="slot-notes" maxlength="4096" placeholder="Console label, action, ambiguities…"></textarea></label><div id="observations"></div></div></div>`;
for (const id of ['all', 'go', 'po', 're', 'so', 'pe', 'coupler', 'controller', 'custom']) {
  const b = node('button', id.toUpperCase()); b.dataset.division = id;
  b.onclick = () => { division = id; renderSlots(); }; $('#divisions', roots.capture).append(b);
}
function renderSlots() {
  const list = $('#slot-list', roots.capture); const scroll = list.scrollTop; list.replaceChildren();
  for (const slot of store.session.slots.filter(s => (division === 'all' || s.division === division) && `${s.label} ${s.id}`.toLowerCase().includes(search.toLowerCase()))) {
    const b = node('button', undefined, `slot-row ${slot.id === selected ? 'selected' : ''}`);
    b.append(node('span', slot.division.toUpperCase(), 'slot-index'), node('span', slot.label), node('span', `${slot.on.length ? 'ON' : '—'} / ${slot.off.length ? 'OFF' : '—'}`, 'slot-count'));
    b.onclick = () => { if (store.target) store.cancel(); selected = slot.id; renderCapture(); }; list.append(b);
  }
  $('#divisions', roots.capture).querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.division === division));
  if (!list.childElementCount) list.append(node('p', 'No matching slots. Add a custom slot below.', 'empty-state'));
  list.scrollTop = scroll;
}
function renderCapture() {
  const slot = currentSlot(); if (!slot) return;
  const target = store.target;
  $('#slot-division', roots.capture).textContent = `${slot.division.toUpperCase()} / ${slot.kind.toUpperCase()} / UNVERIFIED`;
  $('#slot-name', roots.capture).textContent = slot.label;
  const notes = $('#slot-notes', roots.capture); if (document.activeElement !== notes) notes.value = slot.notes;
  $('#capture-progress', roots.capture).textContent = `${store.session.slots.filter(s => s.on.length && s.off.length).length} / ${store.session.slots.length} PAIRS RECORDED`;
  $('#capture-state', roots.capture).textContent = target ? `LISTENING / ${target.transition.toUpperCase()}` : 'CAPTURE IDLE';
  $('#capture-state', roots.capture).classList.toggle('listening', !!target);
  $('#capture-on', roots.capture).disabled = !!target; $('#capture-off', roots.capture).disabled = !!target;
  $('#cancel-capture', roots.capture).disabled = !target;
  $('#capture-help', roots.capture).textContent = target ? `Listening on ${inputPort?.name || 'DEMO INPUT'} · ${Math.max(0, Math.ceil((target.expiresAt - Date.now()) / 1000))}s · operate only this registration, then END CAPTURE.` : (store.warning || '15-second input-only windows. Repeated captures append; export JSON before leaving the hall.');
  const observations = $('#observations', roots.capture); observations.replaceChildren();
  for (const transition of ['on', 'off']) {
    const section = node('section', undefined, 'observation'); const heading = node('div', undefined, 'observation-title');
    heading.append(node('h3', `${transition.toUpperCase()} / ${slot[transition].length} MESSAGES`));
    const syx = node('button', 'EXPORT .SYX'); syx.disabled = !slot[transition].some(r => r.kind === 'sysex');
    syx.onclick = () => download(`${slot.id}-${transition}.syx`, new Uint8Array(slot[transition].filter(r => r.kind === 'sysex').flatMap(r => r.bytes)), 'application/octet-stream');
    const clear = node('button', 'CLEAR'); clear.disabled = !slot[transition].length;
    clear.onclick = () => { if (confirm(`Clear ${transition.toUpperCase()} observations for ${slot.label}? Monitor history remains.`)) { store.clearSlot(slot.id, transition); changed(); } };
    heading.append(syx, clear); section.append(heading);
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
for (const transition of ['on', 'off']) $(`#capture-${transition}`, roots.capture).onclick = run(() => {
  if (!inputId) throw new Error('Select a MIDI input or Demo input in I/O first.');
  if (inputId !== 'demo' && (!inputPort || inputPort.state !== 'connected')) throw new Error('Selected MIDI input is disconnected.');
  spore?.pause('capture'); midiOut?.disarm('capture');
  store.arm(selected, transition, inputId, channel); renderCapture();
});
$('#cancel-capture', roots.capture).onclick = () => { store.cancel(); renderCapture(); };
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

roots.monitor.innerHTML = '<div class="panel-body"><div class="toolbar"><span class="eyebrow">SELECTED INPUT / NO MIDI THRU</span><button id="clear-monitor">CLEAR MONITOR</button></div><p class="muted">SysEx, CC and program changes can be assigned to capture slots. Notes appear only in the monitor and may audition the local sampler. Clock and active sensing are ignored.</p><div id="monitor-log"></div></div>';
function renderMonitor() {
  const log = $('#monitor-log', roots.monitor); log.replaceChildren();
  if (!store.session.events.length) log.append(node('p', 'Waiting for incoming MIDI. Choose an input in I/O.', 'empty-state'));
  for (const r of store.session.events.slice(-80).reverse()) {
    const line = node('div', undefined, 'monitor-row');
    line.append(node('time', new Date(r.time).toLocaleTimeString()), node('span', r.kind.toUpperCase(), 'message-kind'), node('code', r.hex), node('span', r.slotId ? `${r.slotId} / ${r.transition}` : r.source.name, 'muted')); log.append(line);
  }
}
$('#clear-monitor', roots.monitor).onclick = () => { store.session.events = []; changed(); };
function receive(bytes, source) {
  const warning = store.warning;
  const r = store.receive(bytes, source);
  if (r) { changed(); sampler?.midi(bytes); laser?.midi(bytes); }
  if (store.warning && warning !== store.warning) { notify(store.warning); renderCapture(); }
}

function option(value, text) { const o = node('option', text); o.value = value; return o; }
function selectOptions(select, options, value) { select.replaceChildren(...options.map(([v, t]) => option(v, t))); select.value = value; }
configBody.innerHTML = `<div class="eyebrow">DEVICES / LOCAL PERMISSIONS</div><h2>Signal paths</h2><section class="config-section"><div class="section-number">01 / MIDI</div><div class="toolbar"><label class="field checkbox"><input id="sysex-permission" type="checkbox" checked>Request SysEx permission</label><button id="connect-midi" class="primary">CONNECT MIDI</button></div><p id="midi-status" class="status">No MIDI access requested.</p><label class="field">MIDI input<select id="midi-input"></select></label><label class="field">Capture channel<select id="midi-channel"></select></label><label class="field">MIDI output<select id="midi-output"></select></label><p class="muted">Select an output, then ENABLE NOTE OUT below. Capturing registrations remains input-only; SysEx replay is unavailable.</p><section id="midi-note-out"></section></section><section class="config-section"><div class="section-number">02 / AUDIO</div><div class="toolbar"><button id="refresh-audio">LIST DEVICES</button><button id="enable-audio">ENABLE AUDIO</button></div><label class="field">Audio input device<select id="audio-input"></select></label><div class="toolbar"><button id="start-input">START INPUT</button><button id="stop-input">STOP INPUT</button></div><p id="audio-status" class="status">Input stopped · monitoring muted</p><div id="audio-routes"></div><label class="field checkbox"><input id="audio-monitor" type="checkbox">Monitor input through speakers</label><label class="field">Audio output<select id="audio-output"></select></label><p id="output-help" class="muted"></p><label class="field">Master level<input id="master-gain" type="range" min="0" max="1" step="0.01" value="0.3"></label></section><section class="config-section"><div class="section-number">03 / FIELD NOTES</div><p class="muted">Use Chrome or Edge at localhost. Capture does not require audio input. Permission denial, device loss and capture limits are reported without enabling output. Export JSON before closing the laptop.</p></section>`;
midiOut = mountMidiOut($('#midi-note-out', configBody), { notify, onRouteChange: () => spore?.pause('MIDI-route-change'), onEnable: () => { spore?.pause('MIDI-enable'); store.cancel(); renderCapture(); } });
selectOptions($('#midi-channel', configBody), [['all', 'All channels'], ...Array.from({ length: 16 }, (_, i) => [String(i + 1), `Channel ${i + 1}`])], 'all');
function renderConfig() {
  selectOptions($('#midi-input', configBody), [['', 'Select an input'], ['demo', 'Demo input · practice only'], ...Array.from(access?.inputs.values() || []).filter(p => p.state === 'connected').map(p => [p.id, p.name || p.id])], inputId);
  selectOptions($('#midi-output', configBody), [['', 'No output selected'], ...Array.from(access?.outputs.values() || []).filter(p => p.state === 'connected').map(p => [p.id, p.name || p.id])], outputId);
  $('#midi-status', configBody).textContent = access ? `MIDI connected · SysEx ${access.sysexEnabled ? 'enabled' : 'unavailable'} · note output requires explicit enable` : ('requestMIDIAccess' in navigator ? 'Ready to request MIDI permission.' : 'Web MIDI unavailable here. Use Chrome/Edge on localhost; demo is available.');
  selectOptions($('#audio-input', configBody), [['', 'System default input'], ...audio.devices.filter(d => d.kind === 'audioinput').map((d, i) => [d.deviceId, d.label || `Input ${i + 1}`])], audio.inputId);
  selectOptions($('#audio-output', configBody), [['', 'System default output'], ...audio.devices.filter(d => d.kind === 'audiooutput' && d.deviceId !== 'default').map((d, i) => [d.deviceId, d.label || `Output ${i + 1}`])], audio.outputId);
  $('#audio-output', configBody).disabled = !audio.context?.setSinkId;
  $('#output-help', configBody).textContent = audio.context?.setSinkId ? 'Output changes apply to this audio context.' : 'Enable audio to check output selection; otherwise use system audio settings.';
  $('#audio-status', configBody).textContent = audio.stream ? `${audio.channels} input channel(s) reported · ${audio.settings.sampleRate || '?'} Hz · monitoring ${audio.monitor ? 'ON' : 'muted'}` : `Input stopped · audio ${audio.context?.state || 'not started'}`;
  $('#master-gain', configBody).value = audio.masterLevel;
  $('#audio-monitor', configBody).checked = audio.monitor; $('#audio-monitor', configBody).disabled = !audio.stream;
  const routes = $('#audio-routes', configBody); routes.replaceChildren();
  for (let i = 0; i < 2; i++) {
    const row = node('div', undefined, 'audio-route'); const label = node('label', `PROCESS ${i ? 'B' : 'A'}`, 'field'); const sel = node('select');
    selectOptions(sel, Array.from({ length: audio.channels || 2 }, (_, n) => [String(n), `Physical channel ${n + 1}`]), String(audio.routes[i]));
    sel.disabled = !audio.stream; sel.onchange = e => audio.route(i, Number(e.target.value)); label.append(sel);
    const meter = node('meter'); meter.min = 0; meter.max = 1; meter.value = 0; meter.dataset.meter = i; meter.setAttribute('aria-label', `Input ${i ? 'B' : 'A'} level`);
    const gainLabel = node('label', 'Gain', 'field'); const gain = node('input'); gain.type = 'range'; gain.min = 0; gain.max = 2; gain.step = 0.01; gain.value = audio.gains[i]; gain.oninput = e => audio.gain(i, Number(e.target.value)); gainLabel.append(gain);
    row.append(label, meter, gainLabel); routes.append(row);
  }
}
function detachInput() { inputRevision++; if (inputPort) { inputPort.onmidimessage = null; inputPort.close().catch(() => {}); } inputPort = null; store.cancel(); midiOut?.disarm('midi-input-change'); spore?.pause('midi-input-change'); sampler?.stop(); laser?.stop(); }
async function selectInput(id) {
  detachInput(); inputId = '';
  const revision = inputRevision;
  if (id === 'demo') { inputId = id; renderConfig(); renderCapture(); return; }
  if (id) {
    const p = access?.inputs.get(id); if (!p || p.state !== 'connected') throw new Error('MIDI input is unavailable.');
    await p.open();
    if (revision !== inputRevision) { if (inputPort !== p) await p.close(); return; }
    inputPort = p; inputId = id;
    p.onmidimessage = event => receive(event.data, { id: p.id, name: p.name || '', manufacturer: p.manufacturer || '' });
  }
  renderConfig(); renderCapture();
}
$('#connect-midi', configBody).onclick = run(async () => {
  if (!navigator.requestMIDIAccess) throw new Error('Web MIDI is unavailable in this browser.');
  const button = $('#connect-midi', configBody); button.disabled = true;
  detachInput(); midiOut.select(null); outputId = ''; inputId = ''; if (access) access.onstatechange = null;
  try { access = await navigator.requestMIDIAccess({ sysex: $('#sysex-permission', configBody).checked }); }
  finally { button.disabled = false; }
  access.onstatechange = () => { if (inputPort?.state === 'disconnected') { detachInput(); inputId = ''; notify('MIDI input disconnected. Capture canceled; select a reconnected input explicitly.'); } if (outputId && access.outputs.get(outputId)?.state !== 'connected') { midiOut.select(null); outputId = ''; } renderConfig(); renderCapture(); };
  renderConfig(); notify('MIDI permission granted. Select an input explicitly.');
});
$('#midi-input', configBody).onchange = run(e => selectInput(e.target.value));
$('#midi-output', configBody).onchange = e => { outputId = e.target.value; store.cancel(); midiOut.select(access?.outputs.get(outputId) || null); renderCapture(); notify('MIDI output selected. ENABLE NOTE OUT to send notes.'); };
$('#midi-channel', configBody).onchange = e => { channel = e.target.value; store.cancel(); renderCapture(); };
$('#refresh-audio', configBody).onclick = run(() => audio.refresh());
$('#enable-audio', configBody).onclick = run(() => audio.ensure());
$('#audio-input', configBody).onchange = e => { audio.inputId = e.target.value; if (audio.stream) { audio.stopInput(); notify('Input selection changed; press START INPUT to open it.'); } };
$('#start-input', configBody).onclick = run(() => audio.start(audio.inputId));
$('#stop-input', configBody).onclick = () => audio.stopInput();
$('#audio-output', configBody).onchange = run(e => audio.setOutput(e.target.value));
$('#audio-monitor', configBody).onchange = e => audio.setMonitor(e.target.checked);
$('#master-gain', configBody).oninput = e => audio.setMasterGain(Number(e.target.value));
navigator.mediaDevices?.addEventListener('devicechange', () => audio.refresh().catch(e => notify(e.message)));

sampler = mountSampler(roots.sampler, { getAudioContext: () => audio.ensure(), getDestination: () => audio.destination(), notify });
laser = mountLaser(roots.laser, { notify });
audioPod = mountMixer(roots.audio, { audio, notify });
spore = mountSpore(roots.spore, { audio, midiOut, notify, onOutputChange: () => sampler.stop() });
const titles = { capture: 'REGISTRATION CAPTURE', config: 'I/O CONFIGURATION', monitor: 'MIDI MONITOR', sampler: 'KLAIS / LOCAL SAMPLER', laser: 'HELIOS / FIELD TESTS', audio: 'AUDIO / MIXER & FX', spore: 'SPORE / GENERATOR & SCORE' };
const dock = createDockview($('#workspace'), {
  defaultTabComponent: 'pod-tab', createTabComponent: createPodTab,
  theme: { name: 'hylon', className: 'dockview-theme-hylon', gap: 5 }, disableFloatingGroups: true,
  createComponent: ({ name }) => {
    let visibility;
    const stop = () => { if (name === 'sampler') sampler.stop(); if (name === 'laser') laser.stop(); if (name === 'capture') store.cancel(); };
    return { element: roots[name], init({ api }) { if (name === 'audio') audioPod.setVisible(api.isVisible); if (name === 'spore') spore.setVisible(api.isVisible); visibility = api.onDidVisibilityChange(() => { if (name === 'audio') audioPod.setVisible(api.isVisible); if (name === 'spore') spore.setVisible(api.isVisible); if (!api.isVisible) stop(); }); }, dispose() { visibility?.dispose(); if (name === 'audio') { audioPod.setVisible(false); audioPod.cancelPendingMic(); audio.stopInput(); } if (name === 'spore') { spore.pause('pod-closed'); spore.setVisible(false); } stop(); } };
  }
});
dock.layout($('#workspace').clientWidth, $('#workspace').clientHeight);
function defaultLayout() {
  dock.clear(); const mobile = innerWidth < 760;
  dock.addPanel({ id: 'capture', component: 'capture', title: titles.capture });
  dock.addPanel({ id: 'config', component: 'config', title: titles.config, initialWidth: 375, position: { referencePanel: 'capture', direction: mobile ? 'within' : 'right' } });
  dock.addPanel({ id: 'monitor', component: 'monitor', title: titles.monitor, inactive: true, position: { referencePanel: 'capture', direction: 'within' } });
  for (const id of ['sampler', 'laser', 'audio', 'spore']) dock.addPanel({ id, component: id, title: titles[id], inactive: true, position: { referencePanel: 'config', direction: 'within' } });
  dock.getPanel('capture').api.setActive();
  if (!mobile) requestAnimationFrame(() => dock.getPanel('config')?.api.group.api.setSize({ width: 375 }));
}
try { const saved = localStorage.getItem(`hylon-layout-${innerWidth < 760 ? 'mobile' : 'desktop'}`); if (saved) dock.fromJSON(JSON.parse(saved)); else defaultLayout(); } catch { defaultLayout(); }
dock.onDidLayoutChange(() => { try { localStorage.setItem(`hylon-layout-${innerWidth < 760 ? 'mobile' : 'desktop'}`, JSON.stringify(dock.toJSON())); } catch {} });
function activate(id) {
  if (dock.activePanel?.api.isMaximized()) dock.activePanel.api.exitMaximized();
  let panel = dock.getPanel(id);
  if (!panel) panel = dock.addPanel({ id, component: id, title: titles[id] });
  panel.api.setActive();
  if (id === 'sampler' || id === 'laser' || id === 'audio' || id === 'spore') panel.api.maximize();
}
document.querySelectorAll('[data-panel]').forEach(b => b.onclick = () => { activate(b.dataset.panel); document.querySelectorAll('[data-panel]').forEach(n => n.classList.toggle('active', n === b)); });
$('#reset-layout').onclick = defaultLayout;
const dialog = $('#config-dialog');
$('#config-modal').onclick = () => { $('#modal-config').append(configBody); dialog.showModal(); };
$('#close-config').onclick = () => dialog.close();
dialog.addEventListener('close', () => roots.config.append(configBody));
$('#super-panic').onclick = async () => {
  store.cancel(); spore?.pause('SUPER PANIC'); sampler.stop(); audioPod.cancelPendingMic();
  const midiResult = midiOut.panic(); audio.panic(); renderCapture();
  notify(`SUPER PANIC · local audio muted / mic stopped / MIDI disabled${midiResult.failed ? ' · MIDI delivery failed: check device manually' : ''} · requesting HELIOS shutdown`);
  try { await laser.panic(); notify(`SUPER PANIC complete · master 0 / sources stopped / MIDI disabled${midiResult.failed ? ' · check failed MIDI delivery manually' : ''} · HELIOS STOP requested if connected`); }
  catch (error) { notify(`SUPER PANIC · audio muted / MIDI disabled · HELIOS shutdown failed: ${error.message}`); }
};
$('#stop-all').onclick = () => { store.cancel(); spore?.pause('global-stop'); midiOut?.disarm('global-stop'); sampler.stop(); laser.stop(); audioPod.cancelPendingMic(); audio.stopInput(); audio.mixer?.panic(); renderCapture(); notify('Capture ended · sampler stopped · input monitoring stopped · FX tails cleared · laser preview blacked out. Owned MIDI notes released; output disabled.'); };
document.addEventListener('visibilitychange', () => { if (document.hidden) { store.cancel(); spore?.pause('global-stop'); midiOut?.disarm('global-stop'); sampler.stop(); audioPod.cancelPendingMic(); audio.setMonitor(false); renderCapture(); if (dirty) { clearTimeout(saveTimer); saveTimer = null; save(); } } });
window.addEventListener('pagehide', () => { store.cancel(); spore?.pause('global-stop'); midiOut?.disarm('global-stop'); sampler.stop(); laser.stop(); audioPod.cancelPendingMic(); audio.stopInput(); audio.mixer?.panic(); clearTimeout(saveTimer); save(); });
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
setInterval(() => { if (store.target || $('#capture-state', roots.capture).classList.contains('listening')) renderCapture(); }, 500);
const meterData = new Uint8Array(256);
setInterval(() => audio.analysers.forEach(({ analyser }, i) => { analyser.getByteTimeDomainData(meterData); const rms = Math.sqrt(meterData.reduce((sum, n) => sum + ((n - 128) / 128) ** 2, 0) / meterData.length); const meter = $(`[data-meter="${i}"]`, configBody); if (meter) meter.value = rms; }), 100);
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
    $('#workspace').inert = false; $('#config-modal').disabled = false;
    $('#storage-status').textContent = 'MEMORY ONLY · EXPORT JSON';
    notify('Browser lacks single-writer locking; use JSON export. Persistent archive is disabled.');
  } else {
  db = await openArchive(); const saved = await readSession(db);
  if (saved) { store = new CaptureStore(saved); selected = store.session.slots[0]?.id; renderCapture(); renderMonitor(); }
  $('#storage-status').textContent = 'Local archive ready';
  $('#workspace').inert = false; $('#config-modal').disabled = false;
  }
} catch (e) { db = null; $('#workspace').inert = false; $('#config-modal').disabled = false; $('#storage-status').textContent = 'MEMORY ONLY · EXPORT JSON'; notify(`Local archive unavailable: ${e.message}. Export JSON before closing.`); }

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
  import.meta.hot.on('vite:beforeFullReload', () => { spore?.pause('reload'); midiOut?.disarm('reload'); sampler?.stop(); laser?.stop(); audioPod?.cancelPendingMic(); audio.stopInput(); audio.mixer?.panic(); });
}
