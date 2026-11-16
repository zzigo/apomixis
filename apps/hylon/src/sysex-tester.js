import { MONTRE_MONITOR_MESSAGES } from './midi-monitor-montre.js';
// CAPTURE · SysEx / raw MIDI sender for wiring tests (composer request 2026-11-12).
// SEND OUT goes through the shared MIDI gateway (MIDI ON required). SIMULATE IN injects the
// same bytes into the local capture/monitor pipeline as if they arrived on the selected input.
const PRESETS = [
  ['Test SysEx (7D non-commercial)', 'F0 7D 01 02 03 F7'],
  ['Identity Request (universal)', 'F0 7E 7F 06 01 F7'],
  ['Note 60 on · ch 1', '90 3C 64'],
  ['Note 60 off · ch 1', '80 3C 00'],
  ['CC 7 = 100 · ch 1', 'B0 07 64'],
  ['Program 0 · ch 1', 'C0 00'],
  ['Active Sensing', 'FE'],
];
export function parseHex(text) {
  const tokens = String(text).replace(/0x/gi, ' ').split(/[\s,;]+/).filter(Boolean);
  if (!tokens.length) throw new Error('Type hex bytes, e.g. F0 7D 01 F7');
  // Accept "F07D01F7" as well as spaced bytes.
  const bytes = tokens.flatMap(t => { if (!/^[0-9a-f]+$/i.test(t)) throw new Error(`Not hex: ${t}`); return (t.length % 2 ? '0' + t : t).match(/../g).map(h => parseInt(h, 16)); });
  if (bytes.length > 4096) throw new Error('Message exceeds 4096 bytes');
  return bytes;
}
const hex = bytes => bytes.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' ');

export function mountSysexTester(container, { midiOut, simulate, isCapturing = () => false, notify = () => {} }) {
  const root = document.createElement('details'); root.className = 'sysex-tester'; root.open = true;
  root.innerHTML = `<summary>SYSEX / RAW SENDER · wiring test</summary>
    <div class="sysex-row" data-monitor-montre role="group" aria-label="Exact messages from external MIDI Monitor file 19 montre.mmon"></div>
    <div class="sysex-row"><input data-hex spellcheck="false" aria-label="MIDI bytes in hex" value="${PRESETS[0][1]}"><select data-preset aria-label="Preset"><option value="">Presets…</option>${PRESETS.map(([t, v]) => `<option value="${v}">${t}</option>`).join('')}</select></div>
    <div class="sysex-row"><button data-send class="primary" title="Send to the MIDI OUT selected in I/O (Enter)">SEND OUT</button><button data-sim title="Inject locally as if received on the selected MIDI input (Shift+Enter)">SIMULATE IN</button><span data-status class="status" role="status">Loopback test: interface OUT → IN cable, MIDI MONITOR · ALL IN, then SEND OUT.</span></div>`;
  container.append(root);
  const q = k => root.querySelector(`[data-${k}]`);
  const status = text => { q('status').textContent = text; };
  function bytes() { const b = parseHex(q('hex').value); if (midiOut?.validRaw && !midiOut.validRaw(b)) throw new Error('Not one well-formed MIDI message (SysEx must start F0 and end F7, data bytes < 80)'); return b; }
  function send(label = '') { try { if (isCapturing()) throw new Error('Stop capture before sending'); const b = midiOut.sendRaw(bytes()); status(`${label ? label + ' · ' : ''}TX → ${midiOut.summary().portName} · ${hex(b)} · ${b.length} bytes`); } catch (e) { status(`SEND failed: ${e.message}`); notify(`SysEx sender: ${e.message}`); } }
  function sim() { try { const b = bytes(); simulate(b); status(`SIM IN ${hex(b)} · check MIDI MONITOR`); } catch (e) { status(`SIMULATE failed: ${e.message}`); } }
  const source = document.createElement('span'); source.textContent = '19 MONTRE · MIDI MONITOR'; q('monitor-montre').append(source);
  for (const record of MONTRE_MONITOR_MESSAGES) {
    const button = document.createElement('button'); button.type = 'button'; button.textContent = record.label;
    button.title = `Send exact external message ${record.label} to selected MIDI OUT · ON/OFF interpretation unverified · may describe multiple stops · ${record.hex}`;
    button.onclick = () => { q('hex').value = record.hex; send(record.label); };
    q('monitor-montre').append(button);
  }
  q('send').onclick = () => send(); q('sim').onclick = sim;
  q('hex').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); e.shiftKey ? sim() : send(); } };
  q('preset').onchange = () => { if (q('preset').value) q('hex').value = q('preset').value; q('preset').value = ''; q('hex').focus(); };
  return { dispose() { root.remove(); } };
}
