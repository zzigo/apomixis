import { KLAIS_CATALOG } from './catalog.js';

export const LIMITS = Object.freeze({ bytes: 4096, events: 2000, storedBytes: 262144, slotEvents: 64, windowMs: 15000, fragmentMs: 2000, ports: 32, importBytes: 8 * 1024 * 1024 });
const uid = () => globalThis.crypto?.randomUUID?.() || `capture-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const hex = (bytes) => bytes.map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
// FNV-1a is a repeat-comparison checksum, NOT a security or authenticity proof.
const checksum = bytes => { let h = 2166136261; for (const b of bytes) h = Math.imul(h ^ b, 16777619); return `fnv1a32:${(h >>> 0).toString(16).padStart(8, '0')}`; };
const fail = () => { throw new Error('Invalid or oversized capture session'); };
const str = (s, max = 256) => typeof s === 'string' && s.length <= max;
const stamp = s => str(s, 64) && Number.isFinite(Date.parse(s));
const kindOf = bytes => bytes[0] === 0xf0 ? 'sysex' : ({ 8: 'noteoff', 9: 'noteon', 10: 'polypressure', 11: 'cc', 12: 'pc', 13: 'pressure', 14: 'pitchbend' }[bytes[0] >> 4]);
function validMessage(b) {
  if (!Array.isArray(b) || !b.length || b.length > LIMITS.bytes || b.some(x => !Number.isInteger(x) || x < 0 || x > 255)) return false;
  if (b[0] === 0xf0) return b.length >= 3 && b.at(-1) === 0xf7 && b.slice(1, -1).every(x => x < 128);
  return b[0] >= 0x80 && b[0] < 0xf0 && b.length === ([0xc, 0xd].includes(b[0] >> 4) ? 2 : 3) && b.slice(1).every(x => x < 128);
}
export function createSession() {
  const now = new Date().toISOString();
  return { schemaVersion: 1, id: uid(), createdAt: now, updatedAt: now, slots: KLAIS_CATALOG.map(({ id, division, label, kind }) => ({ id, division, label, kind, on: [], off: [], notes: '' })), events: [] };
}

// Reconstruct only known fields: imported data cannot restore a live capture target,
// carry executable properties, or promote a recorded observation to verification.
export function validateSession(raw) {
  if (typeof raw === 'string') { if (raw.length > LIMITS.importBytes) fail(); try { raw = JSON.parse(raw); } catch { fail(); } }
  if (!raw || raw.schemaVersion !== 1 || !str(raw.id) || !stamp(raw.createdAt) || !stamp(raw.updatedAt) || !Array.isArray(raw.slots) || !raw.slots.length || raw.slots.length > 256 || !Array.isArray(raw.events) || raw.events.length > LIMITS.events) fail();
  const ids = new Set();
  for (const s of raw.slots) { if (!s || !str(s.id) || ids.has(s.id) || !str(s.division) || !str(s.label) || !str(s.kind) || !str(s.notes, 4096)) fail(); ids.add(s.id); }
  let byteCount = 0;
  const record = r => {
    if (!r || !str(r.id) || !Number.isFinite(r.time) || !r.source || !['id', 'name', 'manufacturer'].every(k => str(r.source[k])) || !validMessage(r.bytes) || r.kind !== kindOf(r.bytes) || r.channel !== (r.bytes[0] === 0xf0 ? null : (r.bytes[0] & 15) + 1) || r.hex !== hex(r.bytes) || r.verified !== false || !(r.slotId === null || ids.has(r.slotId)) || !(r.transition === null || ['on', 'off'].includes(r.transition)) || ((r.slotId === null) !== (r.transition === null))) fail();
    byteCount += r.bytes.length;
    if (byteCount > LIMITS.storedBytes * 2) fail();
    if (r.length !== r.bytes.length || r.checksum !== checksum(r.bytes)) fail();
    return { id: r.id, time: r.time, source: { id: r.source.id, name: r.source.name, manufacturer: r.source.manufacturer }, bytes: [...r.bytes], length: r.length, checksum: r.checksum, hex: r.hex, kind: r.kind, channel: r.channel, slotId: r.slotId, transition: r.transition, verified: false };
  };
  const slots = raw.slots.map(s => ({ id: s.id, division: s.division, label: s.label, kind: s.kind, notes: s.notes, ...Object.fromEntries(['on', 'off'].map(t => {
    if (!Array.isArray(s[t]) || s[t].length > LIMITS.slotEvents) fail();
    return [t, s[t].map(r => { const x = record(r); if (x.slotId !== s.id || x.transition !== t || !['cc', 'pc', 'sysex'].includes(x.kind)) fail(); return x; })];
  })) }));
  return { schemaVersion: 1, id: raw.id, createdAt: raw.createdAt, updatedAt: raw.updatedAt, slots, events: raw.events.map(record) };
}

export class CaptureStore {
  #target = null;
  #streams = new Map();
  warning = '';
  constructor(session = createSession()) { this.session = validateSession(session); }
  get target() { if (this.#target && Date.now() > this.#target.expiresAt) this.cancel(); return this.#target ? { ...this.#target } : null; }
  arm(slotId, transition = 'on', portId, channel = 'all') {
    if (!this.session.slots.some(s => s.id === slotId) || !['on', 'off'].includes(transition) || !str(portId) || !portId || !(channel === 'all' || Number.isInteger(Number(channel)) && Number(channel) >= 1 && Number(channel) <= 16)) throw new Error('Select a slot, input port, transition and channel');
    this.#streams.clear();
    this.warning = '';
    this.#target = { slotId, transition, portId, channel: channel === 'all' ? 'all' : Number(channel), expiresAt: Date.now() + LIMITS.windowMs, count: 0 };
  }
  cancel() { this.#target = null; this.#streams.clear(); }
  clearSlot(id, transition) {
    const s = this.session.slots.find(s => s.id === id);
    if (!s || !['on', 'off'].includes(transition)) throw new Error('Invalid slot transition');
    s[transition] = []; this.session.updatedAt = new Date().toISOString();
  }
  importSession(raw) { return new CaptureStore(validateSession(raw)); }
  exportJSON() { return JSON.stringify(validateSession(this.session)); }
  receive(data, source, time = Date.now()) {
    if (!source || !str(source.id) || !source.id || !Number.isFinite(time) || !data || !Number.isInteger(data.length)) return null;
    if (data.length > LIMITS.bytes) { this.warning = 'Oversized MIDI packet dropped; incomplete frame cleared.'; this.#streams.delete(source.id); return null; }
    const input = Array.from(data);
    if (input.some(x => !Number.isInteger(x) || x < 0 || x > 255)) { this.warning = 'Malformed MIDI bytes dropped.'; this.#streams.delete(source.id); return null; }
    const src = { id: source.id, name: String(source.name || '').slice(0, 256), manufacturer: String(source.manufacturer || '').slice(0, 256) };
    const active = this.target;
    if (!this.#streams.has(src.id) && this.#streams.size >= LIMITS.ports) this.#streams.delete(this.#streams.keys().next().value);
    let state = this.#streams.get(src.id) || { bytes: [], at: time };
    if (time - state.at > LIMITS.fragmentMs || time < state.at) { if (state.bytes[0] === 0xf0) this.warning = 'Incomplete SysEx timed out.'; state = { bytes: [], at: time }; }
    let last = null;
    const emit = bytes => {
      if (!validMessage(bytes)) return;
      const kind = kindOf(bytes), channel = bytes[0] === 0xf0 ? null : (bytes[0] & 15) + 1;
      const target = active && time <= active.expiresAt && src.id === active.portId && (channel === null || active.channel === 'all' || active.channel === channel) && ['sysex', 'cc', 'pc'].includes(kind) ? active : null;
      const slot = target && this.session.slots.find(s => s.id === target.slotId);
      const savedBytes = this.session.slots.reduce((n, s) => n + [...s.on, ...s.off].reduce((m, r) => m + r.bytes.length, 0), 0);
      const capture = slot && slot[target.transition].length < LIMITS.slotEvents && target.count < LIMITS.slotEvents && savedBytes + bytes.length <= LIMITS.storedBytes;
      const record = { id: uid(), time, source: src, bytes: [...bytes], length: bytes.length, checksum: checksum(bytes), hex: hex(bytes), kind, channel, slotId: capture ? target.slotId : null, transition: capture ? target.transition : null, verified: false };
      this.session.events.push(record);
      let monitorBytes = this.session.events.reduce((n, r) => n + r.bytes.length, 0);
      while (this.session.events.length > LIMITS.events || monitorBytes > LIMITS.storedBytes) { monitorBytes -= this.session.events.shift().bytes.length; this.warning = 'Monitor limit reached: oldest monitor events removed. Slot captures retained.'; }
      if (capture) { slot[target.transition].push(structuredClone(record)); target.count++; if (this.#target) this.#target.count = target.count; }
      this.session.updatedAt = new Date().toISOString(); last = record;
      if (target && (!capture || target.count >= LIMITS.slotEvents)) { this.#target = null; this.warning = 'Capture limit reached. Export observations, clear a slot explicitly, then rearm.'; }
    };
    for (const byte of input) {
      if (byte >= 0xf8) continue; // Realtime interleaving never enters SysEx or running status.
      if (byte === 0xf0) { state = { bytes: [byte], at: time }; continue; }
      if (state.bytes[0] === 0xf0) {
        if (byte === 0xf7) { state.bytes.push(byte); emit(state.bytes); state = { bytes: [], at: time }; }
        else if (byte >= 128 || state.bytes.length >= LIMITS.bytes - 1) { this.warning = 'Malformed or oversized SysEx frame dropped.'; state = { bytes: [], at: time }; }
        else state.bytes.push(byte);
        continue;
      }
      if (byte >= 128) { state = { bytes: byte < 0xf0 ? [byte] : [], at: time }; continue; }
      if (!state.bytes.length) continue;
      state.bytes.push(byte);
      const length = [0xc, 0xd].includes(state.bytes[0] >> 4) ? 2 : 3;
      if (state.bytes.length === length) { emit(state.bytes); state = { bytes: [state.bytes[0]], at: time }; }
    }
    this.#streams.set(src.id, state);
    return last;
  }
}
