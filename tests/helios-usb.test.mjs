import test from 'node:test';
import assert from 'node:assert/strict';
import { HeliosUsb } from '../packages/hylon-laser/helios-usb.js';
function rig() {
  const calls = [], states = [], listeners = new Map();
  const device = { vendorId: 0x1209, productId: 0xe500, opened: false, configuration: null,
    async open() { this.opened = true; calls.push('open'); },
    async selectConfiguration(value) { calls.push(['config', value]); this.configuration = { interfaces: [{ interfaceNumber: 0, alternate: { endpoints: [{ endpointNumber: 6, direction: 'out', type: 'interrupt' }, { endpointNumber: 3, direction: 'in', type: 'interrupt' }, { endpointNumber: 2, direction: 'out', type: 'bulk' }] } }] }; },
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
  assert.equal(adapter.outputEnabled, false); assert.equal(typeof adapter.openShutter, 'undefined');
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
test('HELIOS emergency stop requests shutter close and STOP then disconnects',async()=>{
  const {adapter,device,calls}=rig();await adapter.connect();const before=calls.length;await adapter.emergencyStop();
  assert.deepEqual(calls.slice(before).filter(c=>c[0]==='out'),[['out',6,2,0],['out',6,1,0]]);assert.equal(adapter.device,null);assert.equal(device.opened,false);
});
import{compileLaserFrame,defaultOutputProfile}from'../packages/hylon-laser/frame.js';import{defaultLaserProfile}from'../packages/hylon-laser/profile.js';import{testFrame}from'../packages/hylon-laser/patterns.js';
const outputFrame=()=>compileLaserFrame(testFrame(),defaultOutputProfile(defaultLaserProfile()));
const blankFrame=()=>{const f=outputFrame();return{...f,points:f.points.map(p=>({...p,r:0,g:0,b:0,i:0}))};};
test('explicit output primes blank, opens shutter then transfers single-play frames after ready',async()=>{
 const{adapter,calls}=rig();await adapter.connect();adapter.lastStopAt=-Infinity;
 await adapter.startOutput(blankFrame());assert.equal(adapter.outputEnabled,true);
 const frame=outputFrame();await adapter.sendFrame(frame.points,frame.pps);
 const bulk=calls.filter(c=>c[0]==='out'&&c[1]===2);assert.equal(bulk.length,2);assert.equal(bulk[0].at(-1),2);assert.equal(bulk[1].at(-1),2);
 const open=calls.findIndex(c=>c[0]==='out'&&c[1]===6&&c[2]===2&&c[3]===1);const first=calls.findIndex(c=>c[0]==='out'&&c[1]===2);assert(open>first);
 assert.equal(adapter.sentFrames,1);await adapter.stop();assert.equal(adapter.outputEnabled,false);await assert.rejects(adapter.sendFrame(frame.points,frame.pps),/stopped/);
});
test('blackout while readiness is pending prevents a late shutter-open or frame',async()=>{
 const{adapter,device,calls}=rig();await adapter.connect();adapter.lastStopAt=-Infinity;let resolve;
 device.transferIn=()=>new Promise(done=>{resolve=done;});const starting=adapter.startOutput(blankFrame());
 while(!resolve)await Promise.resolve();await adapter.stop();resolve({status:'ok',data:new DataView(new Uint8Array([0x83,1]).buffer)});
 await assert.rejects(starting,/cancelled/);assert.equal(adapter.outputEnabled,false);assert(!calls.some(c=>c[0]==='out'&&c[1]===2));assert(!calls.some(c=>c[0]==='out'&&c[1]===6&&c[2]===2&&c[3]===1));
});
test('frame-transfer failure closes output and busy status never submits a new frame',async()=>{
 const{adapter,device,calls}=rig();await adapter.connect();adapter.lastStopAt=-Infinity;await adapter.startOutput(blankFrame());
 device.transferIn=async()=>({status:'ok',data:new DataView(new Uint8Array([0x83,0]).buffer)});const frame=outputFrame();assert.equal(await adapter.sendFrame(frame.points,frame.pps),false);assert.equal(adapter.sentFrames,0);
 device.transferIn=async()=>({status:'ok',data:new DataView(new Uint8Array([0x83,1]).buffer)});
 device.transferOut=async(ep,data)=>({status:ep===2?'stall':'ok',bytesWritten:data.length});await assert.rejects(adapter.sendFrame(frame.points,frame.pps));assert.equal(adapter.outputEnabled,false);assert.equal(adapter.device,null);
});
test('blackout during a pending frame-status reply prevents any later bulk submission',async()=>{
 const{adapter,device,calls}=rig();await adapter.connect();adapter.lastStopAt=-Infinity;await adapter.startOutput(blankFrame());let resolve;
 device.transferIn=()=>new Promise(done=>resolve=done);const frame=outputFrame(),pending=adapter.sendFrame(frame.points,frame.pps);while(!resolve)await Promise.resolve();
 await adapter.stop();const count=calls.filter(c=>c[0]==='out'&&c[1]===2).length;resolve({status:'ok',data:new DataView(new Uint8Array([0x83,1]).buffer)});assert.equal(await pending,false);assert.equal(calls.filter(c=>c[0]==='out'&&c[1]===2).length,count);
});
