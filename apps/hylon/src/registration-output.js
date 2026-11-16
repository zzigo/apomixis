import { M1_KNOBS, isM1Snapshot, readM1, composeM1 } from './m1-combination.js';
import { CONSOLE_CAPTURE_GROUPS } from './console-captures.js';
import { knobForSlot } from './registration-map.js';
export { knobForSlot } from './registration-map.js';
export function createRegistrationOutput({ getStore, midiOut, onChange = () => {} }) {
  const states = new Map(); let epoch, session, lastSnapshot = null, lastFrame = null;
  function state(id) {
    const next = midiOut.summary().epoch, current = getStore().session;
    if (next !== epoch || current !== session) { states.clear(); lastSnapshot = null; lastFrame = null; epoch = next; session = current; }
    return states.get(id);
  }
  function sendSlot(id, on) {
    const store = getStore(), slot = store.session.slots.find(s => s.id === id);
    if (!slot) throw new Error('Capture slot unavailable');
    if (store.target) throw new Error('Stop capture before sending a registration');
    const transition = on ? 'on' : 'off', records = slot[transition];
    if (!records.length) throw new Error(`${slot.label}: capture ${transition.toUpperCase()} first`);
    if(records.some(r=>r.bytes[0]===0xf0)&&!midiOut.summary().sysexEnabled)throw new Error('SysEx is OFF in I/O');
    midiOut.assertReady();
    if (records.some(r => r.source.id === 'demo' || r.source.id.startsWith('hylon:') || r.source.name.startsWith('SIM ·'))) throw new Error('Practice messages cannot operate registers; capture the console first');
    // Preflight the entire action before sending anything. Replay exact bytes, never infer OFF.
    if (records.some(r => !midiOut.validRaw(r.bytes))) throw new Error('Invalid registration message');
    state(id);
    const knobNumber = knobForSlot(slot)?.n, combine = M1_KNOBS.includes(knobNumber);
    const messages = combine ? [composeM1(lastFrame, knobNumber, on)] : records.map(r => r.bytes);
    try { for (const bytes of messages) midiOut.sendRaw(bytes); }
    catch (error) { states.delete(id); lastSnapshot = null; onChange(slot, null); throw error; }
    if (combine) {
      lastFrame = [...messages[0]];
      const active = readM1(lastFrame);
      lastSnapshot = { knobs: M1_KNOBS, active };
      for (const other of store.session.slots) { const n = knobForSlot(other)?.n; if (M1_KNOBS.includes(n)) states.set(other.id, active.includes(n)); }
      onChange(slot, on, { snapshot: true, knobs: M1_KNOBS, active });
      return `M1 · ${active.join('+') || '19–27 off'} · one combined SysEx sent`;
    }
    if (messages.length && isM1Snapshot(messages.at(-1))) lastFrame = [...messages.at(-1)];
    const group = CONSOLE_CAPTURE_GROUPS.find(g => records.every(r => r.source.id === g.sourceId));
    const n = knobForSlot(slot)?.n;
    const snapshot = !!group && !group.provisional && n >= group.first && n <= group.last;
    if (!snapshot) lastSnapshot = null;
    const knobs = group ? Array.from({length: group.last-group.first+1}, (_, i) => group.first+i) : [];
    if (snapshot) {
      lastSnapshot = { knobs, active: on ? knobForSlot(slot)?.n ?? null : null };
      for (const other of store.session.slots) if (knobs.includes(knobForSlot(other)?.n)) states.set(other.id, on && other.id === id);
    }
    states.set(id, on); onChange(slot, on, { snapshot, knobs });
    return `${slot.label} · ${transition.toUpperCase()} · ${records.length} message(s) sent${snapshot ? ' · literal registration snapshot' : group?.provisional ? ' · PROVISIONAL mapping' : ''}`;
  }
  function sendKnob(n, on) {
    const slots = getStore().session.slots.filter(slot => knobForSlot(slot)?.n === n);
    if (!slots.length) return false;
    if (slots.length > 1) throw new Error(`Knob ${n}: multiple capture slots assigned; choose one in CAPTURE`);
    sendSlot(slots[0].id, on); return true;
  }
  return { state, observeFrame(bytes) { state(''); const frame=Array.from(bytes || []); if (isM1Snapshot(frame)) lastFrame=frame; }, resetSlot(id) { states.delete(id); lastSnapshot = null; }, snapshotState() { state(''); return lastSnapshot; }, sendSlot, sendKnob, toggleSlot(id) { return sendSlot(id, state(id) !== true); } };
}
