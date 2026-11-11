// HELIOS control protocol from the official MIT SDK. No frame or shutter-open API.
// https://github.com/Grix/helios_dac/tree/master/sdk/cpp
const FILTER = { vendorId: 0x1209, productId: 0xe500 };
export class HeliosUsb {
  constructor({ usb, timeoutMs = 1500, onState = () => {} } = {}) {
    this.usb = usb; this.timeoutMs = timeoutMs; this.onState = onState;
    this.device = null; this.epoch = 0; this.busy = false; this.disposed = false;
    this.disconnectListener = event => { if (event.device === this.device) { this.epoch++; this.device = null; this.onState('DISCONNECTED · USB removed'); } };
    usb?.addEventListener('disconnect', this.disconnectListener);
  }
  async deadline(task) {
    let timer;
    try { return await Promise.race([task, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('HELIOS USB timeout')), this.timeoutMs); })]); }
    finally { clearTimeout(timer); }
  }
  async command(device, command) {
    const result = await this.deadline(device.transferOut(6, new Uint8Array([command, 0])));
    if (result.status !== 'ok' || result.bytesWritten !== 2) throw new Error('HELIOS control transfer failed');
  }
  async safeStop(device) {
    const results = await Promise.allSettled([this.command(device, 2)]);
    // Always attempt STOP even if closing the shutter failed.
    try { await this.command(device, 1); } catch (error) { throw new Error(`STOP failed: ${error.message}`); }
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
      this.onState('CONNECTED / STOPPED · STOP and shutter-close requests accepted · no frame output');
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
    catch (error) { if (this.device === device) { this.device = null; this.epoch++; await this.close(device); this.onState(`USB FAULT · ${error.message} · reconnect manually`); } throw error; }
    finally { this.busy = false; }
  }
  stop() { return this.operation(async device => { await this.safeStop(device); if (this.device !== device) throw new Error('HELIOS disconnected'); this.onState('CONNECTED / STOPPED · STOP and shutter-close requests accepted · optical state unverified'); }); }
  status() { return this.operation(async device => {
    await this.command(device, 3);
    const result = await this.deadline(device.transferIn(3, 32));
    if (result.status !== 'ok' || !result.data || result.data.byteLength < 2 || result.data.getUint8(0) !== 0x83) throw new Error('Invalid HELIOS status reply');
    if (this.device !== device) throw new Error('HELIOS disconnected');
    const ready = result.data.getUint8(1) !== 0;
    this.onState(`CONNECTED · DAC ${ready ? 'ready' : 'busy'} · no frames sent / optical state unverified`);
    return ready;
  }); }
  async disconnect() {
    ++this.epoch; const device = this.device; this.device = null;
    try { if (device && !this.busy) await this.safeStop(device); }
    finally { if (device) await this.close(device); this.onState('DISCONNECTED · no automatic reconnect'); }
  }
  async dispose() { this.disposed = true; this.usb?.removeEventListener('disconnect', this.disconnectListener); await this.disconnect(); }
}
