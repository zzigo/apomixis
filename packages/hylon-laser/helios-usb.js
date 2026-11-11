import { encodeHeliosFrame } from './frame.js';
// HELIOS control protocol from the official MIT SDK. Explicit single-play frame output; connection alone stays stopped.
// https://github.com/Grix/helios_dac/tree/master/sdk/cpp
const FILTER = { vendorId: 0x1209, productId: 0xe500 };
export class HeliosUsb {
  constructor({ usb, timeoutMs = 1500, onState = () => {} } = {}) {
    this.usb = usb; this.timeoutMs = timeoutMs; this.onState = onState;
    this.device = null; this.outputEpoch = 0; this.outputEnabled = false; this.sentFrames = 0; this.busyFrames = 0; this.lastStopAt = -Infinity; this.epoch = 0; this.busy = false; this.disposed = false;
    this.disconnectListener = event => { if (event.device === this.device) { this.epoch++; this.outputEpoch++; this.outputEnabled = false; this.device = null; this.onState('DISCONNECTED · USB removed'); } };
    usb?.addEventListener('disconnect', this.disconnectListener);
  }
  async deadline(task) {
    let timer;
    try { return await Promise.race([task, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('HELIOS USB timeout')), this.timeoutMs); })]); }
    finally { clearTimeout(timer); }
  }
  async command(device, command, value = 0) {
    const result = await this.deadline(device.transferOut(6, new Uint8Array([command, value])));
    if (result.status !== 'ok' || result.bytesWritten !== 2) throw new Error('HELIOS control transfer failed');
  }
  async safeStop(device) {
    const results = await Promise.allSettled([this.command(device, 2)]);
    // Always attempt STOP even if closing the shutter failed.
    try { await this.command(device, 1); } catch (error) { throw new Error(`STOP failed: ${error.message}`); }
    this.lastStopAt = Date.now();
    if (results[0].status === 'rejected') throw new Error(`Shutter-close request failed: ${results[0].reason.message}`);
  }
  async close(device) { try { await this.deadline(device.close()); } catch {} }
  async connect() {
    if (this.disposed || this.busy || this.device) throw new Error('HELIOS is already connected or busy');
    if (!this.usb?.requestDevice) throw new Error('WebUSB unavailable. Open localhost in Chrome/Edge.');
    this.busy = true; const epoch = ++this.epoch; let device;
    const check = () => { if (this.disposed || epoch !== this.epoch) throw new Error('HELIOS connection cancelled'); };
    try {
      this.onState('SELECTING HELIOS');
      device = await this.usb.requestDevice({ filters: [FILTER] }); check();
      if (device.vendorId !== FILTER.vendorId || device.productId !== FILTER.productId) throw new Error('Unexpected USB device');
      const opening = device.open();
      opening.then(() => { if (this.disposed || epoch !== this.epoch) this.close(device); }, () => {});
      await this.deadline(opening); check();
      if (!device.configuration) { await this.deadline(device.selectConfiguration(1)); check(); }
      await this.deadline(device.claimInterface(0)); check();
      await this.deadline(device.selectAlternateInterface(0, 1)); check();
      const endpoints = device.configuration?.interfaces?.find(i => i.interfaceNumber === 0)?.alternate?.endpoints || [];
      if (!endpoints.some(e => e.endpointNumber === 6 && e.direction === 'out' && e.type === 'interrupt') || !endpoints.some(e => e.endpointNumber === 3 && e.direction === 'in' && e.type === 'interrupt')) throw new Error('Unexpected HELIOS control endpoints');
      await this.safeStop(device); check(); this.device = device;
      this.onState('CONNECTED / STOPPED · STOP and shutter-close requests accepted · ready for explicit START OUTPUT');
    } catch (error) {
      ++this.epoch;
      if (device?.opened) await this.close(device);
      this.onState(`NOT CONNECTED · ${error.message}`); throw error;
    } finally { this.busy = false; }
  }
  async operation(fn) {
    if (!this.device || this.busy || this.disposed) throw new Error('HELIOS is disconnected or busy');
    const device = this.device; this.busy = true;
    try { return await fn(device); }
    catch (error) { if (!error.cancelled && this.device === device) { this.device = null; this.outputEnabled = false; this.outputEpoch++; this.epoch++; try { await this.safeStop(device); } catch {} await this.close(device); this.onState(`USB FAULT · ${error.message} · reconnect manually`); } throw error; }
    finally { this.busy = false; }
  }
  async stop() {
    this.outputEpoch++; this.outputEnabled = false; const device = this.device;
    if (!device) return;
    await this.safeStop(device);
    if (this.device === device) this.onState('CONNECTED / STOPPED · shutter-close and STOP requested');
  }
  async readReady(device) {
    await this.command(device, 3);
    const result = await this.deadline(device.transferIn(3, 32));
    if (result.status !== 'ok' || !result.data || result.data.byteLength < 2 || result.data.getUint8(0) !== 0x83) throw new Error('Invalid HELIOS status reply');
    if (this.device !== device) throw new Error('HELIOS disconnected');
    return result.data.getUint8(1) !== 0;
  }
  status() { return this.operation(async device => {
    const ready = await this.readReady(device);
    this.onState(`CONNECTED · DAC ${ready ? 'ready' : 'busy'} · ${this.sentFrames} frame(s) transferred`); return ready;
  }); }
  async startOutput(blankFrame) {
    if (this.outputEnabled) return;
    const token = ++this.outputEpoch;
    const check = device => {
      if (this.disposed || token !== this.outputEpoch || this.device !== device) { const error = new Error('HELIOS output cancelled'); error.cancelled = true; throw error; }
    };
    return this.operation(async device => {
      const endpoints = device.configuration?.interfaces?.find(i => i.interfaceNumber === 0)?.alternate?.endpoints || [];
      if (!endpoints.some(e => e.endpointNumber === 2 && e.direction === 'out' && e.type === 'bulk')) throw new Error('HELIOS bulk OUT endpoint 2 unavailable');
      if (blankFrame.points.some(p => p.r || p.g || p.b || p.i)) throw new Error('Output must start with a blank frame');
      const bytes = encodeHeliosFrame(blankFrame.points, blankFrame.pps);
      // Original firmware keeps STOP latched for 100 ms to reject in-flight frames.
      const settle = 110 - (Date.now() - this.lastStopAt); if (settle > 0) await new Promise(resolve => setTimeout(resolve, settle)); check(device);
      let ready = false; const readyDeadline = Date.now() + 1000;
      while (!ready && Date.now() < readyDeadline) { ready = await this.readReady(device); check(device); if (!ready) await new Promise(resolve => setTimeout(resolve, 8)); }
      if (!ready) throw new Error('DAC readiness timeout'); check(device);
      const result = await this.deadline(device.transferOut(2, bytes)); check(device);
      if (result.status !== 'ok' || result.bytesWritten !== bytes.length) throw new Error('HELIOS blank-frame transfer failed');
      await this.command(device, 2, 1); check(device);
      this.outputEnabled = true; this.sentFrames = 0; this.busyFrames = 0;
      this.onState('OUTPUT ENABLED · one-shot frames / explicit BLACKOUT to stop');
    });
  }
  async sendFrame(points, pps) {
    if (!this.outputEnabled || !this.device || this.disposed) throw new Error('HELIOS output is stopped');
    if (this.busy) return false;
    const token = this.outputEpoch; let bytes;
    try { bytes = encodeHeliosFrame(points, pps); } catch (error) { await this.stop(); throw error; }
    return this.operation(async device => {
      if (!await this.readReady(device)) { this.busyFrames++; return false; }
      if (token !== this.outputEpoch || !this.outputEnabled || device !== this.device) return false;
      const result = await this.deadline(device.transferOut(2, bytes));
      if (result.status !== 'ok' || result.bytesWritten !== bytes.length) throw new Error('HELIOS frame transfer failed');
      if (token !== this.outputEpoch || !this.outputEnabled) return false;
      this.sentFrames++; return true;
    });
  }
  async disconnect() {
    ++this.epoch; this.outputEpoch++; this.outputEnabled = false; const device = this.device; this.device = null;
    try { if (device && !this.busy) await this.safeStop(device); }
    finally { if (device) await this.close(device); this.onState('DISCONNECTED · no automatic reconnect'); }
  }
  async emergencyStop() {
    ++this.epoch; this.outputEpoch++; this.outputEnabled = false; const device = this.device; this.device = null;
    try { if (device) await this.safeStop(device); }
    finally { if (device) await this.close(device); this.onState('DISCONNECTED / SUPER PANIC · STOP/shutter-close requested; optical state unverified'); }
  }
  async dispose() { this.disposed = true; this.usb?.removeEventListener('disconnect', this.disconnectListener); await this.disconnect(); }
}
