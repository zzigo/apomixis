import test from 'node:test';
import assert from 'node:assert/strict';
import { CaptureStore, createSession, validateSession, LIMITS } from '../apps/hylon/src/capture.js';
import { KLAIS_CATALOG } from '../apps/hylon/src/catalog.js';
const port = { id: 'in1', name: 'Console', manufacturer: 'Unverified' };
const setup = () => { const s = new CaptureStore(); s.arm(s.session.slots[0].id, 'on', port.id); return s; };

test('catalog has stable unverified disposition without executable mappings', () => {
  assert.ok(KLAIS_CATALOG.length > 50);
  assert.equal(new Set(KLAIS_CATALOG.map(s => s.id)).size, KLAIS_CATALOG.length);
  assert.ok(KLAIS_CATALOG.every(s => s.verified === false && !('cc' in s)));
});
test('capture stays passive; explicit window keeps repetitions, CC and PC', () => {
  const s = setup();
  assert.equal(typeof s.send, 'undefined');
  for (const b of [[0xb0, 20, 127], [0xb0, 20, 127], [0xc0, 5]]) assert.ok(s.receive(b, port).slotId);
  assert.equal(s.session.slots[0].on.length, 3);
  assert.equal(s.session.slots[0].on[0].verified, false);
  s.cancel();
  assert.equal(s.receive([0xb0, 20, 0], port).slotId, null);
});
test('source/channel isolation and notes are monitor only', () => {
  const s = setup(); s.arm(s.session.slots[0].id, 'off', port.id, 2);
  assert.equal(s.receive([0xb1, 20, 0], { ...port, id: 'other' }).slotId, null);
  assert.equal(s.receive([0xb0, 20, 0], port).slotId, null);
  assert.equal(s.receive([0x91, 60, 90], port).slotId, null);
  assert.equal(s.receive([0xb1, 20, 0], port).transition, 'off');
  assert.equal(s.session.slots[0].off.length, 1);
});
test('fragmented SysEx strips realtime, isolates ports and times out', () => {
  const s = setup(), t = Date.now();
  assert.equal(s.receive([0xf0, 0x7d, 1, 0xf8], port, t), null);
  assert.equal(s.receive([2, 0xf7], { ...port, id: 'other' }, t), null);
  const r = s.receive([0xfe, 2, 0xf7], port, t + 10);
  assert.deepEqual(r.bytes, [0xf0, 0x7d, 1, 2, 0xf7]); assert.equal(r.channel, null);
  s.receive([0xf0, 0x7d], port, t + 20);
  assert.equal(s.receive([3, 0xf7], port, t + LIMITS.fragmentMs + 21), null);
});
test('malformed and oversized frames cannot become capture records', () => {
  const s = setup();
  s.receive([0xf0, 0x7d], port); s.receive(new Array(LIMITS.bytes + 1).fill(1), port);
  assert.equal(s.receive([0xf7], port), null);
  assert.equal(s.receive([0xf0, 0x7d, 0xb0, 1, 0xf7], port), null);
  assert.equal(s.receive([0xf0, -1, 0xf7], port), null);
  assert.equal(s.session.slots[0].on.length, 0);
  assert.ok(s.warning);
});
test('running status/packed messages log each; realtime creates no event', () => {
  const s = setup();
  s.receive([0xb0, 1, 2, 1, 3, 0xc0, 4], port);
  assert.equal(s.session.events.length, 3);
  assert.equal(s.receive([0xf8, 0xfe], port), null);
  assert.equal(s.session.events.length, 3);
});
test('roundtrip is unarmed, rejects forged/oversized schemas and clears explicitly', () => {
  const s = setup(); s.receive([0xf0, 0x7d, 1, 0xf7], port);
  const copy = s.importSession(s.exportJSON());
  assert.equal(copy.target, null); assert.deepEqual(copy.session, s.session);
  const bad = structuredClone(s.session); bad.events[0].verified = true;
  assert.throws(() => validateSession(bad));
  assert.throws(() => validateSession({ ...createSession(), schemaVersion: 2 }));
  assert.throws(() => validateSession({ ...createSession(), slots: [] }), /Invalid/);
  assert.throws(() => validateSession('x'.repeat(LIMITS.importBytes + 1)));
  copy.clearSlot(copy.session.slots[0].id, 'on'); assert.equal(copy.session.slots[0].on.length, 0);
  assert.equal(copy.session.events.length, 1);
});
test('window expires and slot cap does not silently grow', () => {
  const s = setup(), t = Date.now();
  assert.equal(s.receive([0xb0, 1, 1], port, t + LIMITS.windowMs + 5).slotId, null);
  s.arm(s.session.slots[0].id, 'on', port.id);
  for (let i = 0; i < LIMITS.slotEvents + 5; i++) s.receive([0xc0, 1], port);
  assert.equal(s.session.slots[0].on.length, LIMITS.slotEvents); assert.equal(s.target, null);
});
test('large captures and rolling monitor stay bounded and exportable with checksums', () => {
  const s = setup();
  const bytes = [0xf0, 0x7d, ...new Array(LIMITS.bytes - 3).fill(1), 0xf7];
  for (let slot = 0; slot < 3; slot++) {
    s.arm(s.session.slots[slot].id, 'on', port.id);
    for (let i = 0; i < LIMITS.slotEvents + 3; i++) s.receive(bytes, port);
  }
  const json = s.exportJSON(); assert.ok(json.length < LIMITS.importBytes);
  const copy = s.importSession(json); assert.equal(copy.target, null);
  assert.ok(copy.session.events.every(r => r.length === r.bytes.length && /^fnv1a32:/.test(r.checksum)));
  assert.ok(s.warning);
  const corrupt = structuredClone(s.session); corrupt.events[0].checksum = 'bad';
  assert.throws(() => validateSession(corrupt));
});
