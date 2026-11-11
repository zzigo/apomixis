import test from 'node:test';
import assert from 'node:assert/strict';
import { HeliosUsb } from '../packages/hylon-laser/helios-usb.js';
function rig() {
  const calls = [], states = [], listeners = new Map();
  const device = { vendorId: 0x1209, productId: 0xe500, opened: false, configuration: null,
    async open() { this.opened = true; calls.push('open'); },
    async selectConfiguration(value) { calls.push(['config', value]); this.configuration = { interfaces: [{ interfaceNumber: 0, alternate: { endpoints: [{ endpointNumber: 6, direction: 'out', type: 'interrupt' }, { endpointNumber: 3, direction: 'in', type: 'interrupt' }] } }] }; },
    async claimInterface(value) { calls.push(['claim', value]); }, async selectAlternateInterface(...args) { calls.push(['alternate', ...args]); },
    async transferOut(ep, bytes) { calls.push(['out', ep, ...bytes]); return { status: 'ok', bytesWritten: bytes.length }; },
    async transferIn(ep, length) { calls.push(['in', ep, length]); return { status: 'ok', data: new DataView(new Uint8Array([0x83, 1]).buffer) }; },
    async close() { calls.push('close'); this.opened = false; }
  };
  const usb = { async requestDevice(options) { calls.push(['chooser', options]); return device; }, addEventListener(name, fn) { listeners.set(name, fn); }, removeEventListener(name) { listeners.delete(name); } };
  const adapter = new HeliosUsb({ usb, timeoutMs: 15, onState: state => states.push(state) });
  return { device, adapter, calls, states, listeners };
}
test('physical HELIOS connects with closed-shutter/STOP commands and explicit status only', async () => {
  const { adapter, calls, device } = rig();
  assert.deepEqual(calls, []); await adapter.connect(); assert.equal(adapter.device, device);
  assert.deepEqual(calls.filter(c => c[0] === 'out'), [['out', 6, 2, 0], ['out', 6, 1, 0]]);
  assert.equal(await adapter.status(), true); await adapter.disconnect();
  assert.equal(device.opened, false); assert.equal(adapter.device, null);
  assert(calls.filter(c => c[0] === 'out').every(c => c[1] === 6 && c[3] === 0 && [1, 2, 3].includes(c[2])));
  assert.equal(typeof adapter.sendFrame, 'undefined'); assert.equal(typeof adapter.openShutter, 'undefined');
});
test('HELIOS rejects competing operations, bad status and manual reconnect after fault', async () => {
  const { adapter, device, states } = rig(); await adapter.connect();
  device.transferIn = async () => ({ status: 'ok', data: new DataView(new Uint8Array([0x99, 1]).buffer) });
  await assert.rejects(adapter.status(), /Invalid HELIOS/); assert.equal(adapter.device, null); assert.equal(device.opened, false);
  assert.match(states.at(-1), /FAULT/); await assert.rejects(adapter.status(), /disconnected/);
});
test('HELIOS rejects unexpected endpoints and attempts STOP even when close-shutter fails', async () => {
  const { adapter, device, calls } = rig();
  device.transferOut = async (ep, data) => { calls.push(['out', ep, ...data]); return { status: data[0] === 2 ? 'stall' : 'ok', bytesWritten: 2 }; };
  await assert.rejects(adapter.connect(), /Shutter-close/);
  assert(calls.some(c => c[0] === 'out' && c[2] === 1)); assert.equal(device.opened, false);
  device.transferOut = async () => ({ status: 'ok', bytesWritten: 2 });
  device.configuration.interfaces[0].alternate.endpoints = [];
  await assert.rejects(adapter.connect(), /endpoints/);
});
test('HELIOS times out without queued retries and closes a late USB open after cancellation', async () => {
  const { adapter, device } = rig(); let resolveOpen;
  device.open = () => new Promise(resolve => { resolveOpen = () => { device.opened = true; resolve(); }; });
  await assert.rejects(adapter.connect(), /timeout/); resolveOpen();
  await new Promise(resolve => setTimeout(resolve, 0)); assert.equal(device.opened, false); assert.equal(adapter.device, null);
});
test('HELIOS removal revokes device and dispose cancels pending chooser', async () => {
  const { adapter, device, listeners } = rig(); await adapter.connect();
  listeners.get('disconnect')({ device }); assert.equal(adapter.device, null); await adapter.dispose();
  const r = rig(); let choose;
  r.adapter.usb.requestDevice = () => new Promise(resolve => { choose = resolve; });
  const pending = r.adapter.connect(); await r.adapter.dispose(); choose(r.device);
  await assert.rejects(pending, /cancelled/); assert.equal(r.device.opened, false);
});
