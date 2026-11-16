// Bus recorder: up to three stereo inputs (K, LA, MIC/TAPE) captured as 16-bit PCM in blocks of 8192 frames.
// The main thread assembles WAV files; nothing is written or sent from here.
class HylonRecorder extends AudioWorkletProcessor {
  constructor() { super(); this.on = false; this.size = 8192; this.fill = 0; this.buffers = [0, 1, 2].map(() => new Int16Array(this.size * 2)); this.peaks = [0, 0, 0];
    this.port.onmessage = event => { if (event.data === 'start') { this.on = true; this.fill = 0; this.peaks = [0, 0, 0]; } else if (event.data === 'stop') { this.flush(); this.on = false; this.port.postMessage({ type: 'done' }); } }; }
  flush() { if (!this.fill) return; const blocks = this.buffers.map(b => b.slice(0, this.fill * 2)); this.port.postMessage({ type: 'block', blocks, peaks: this.peaks.slice() }, blocks.map(b => b.buffer)); this.fill = 0; }
  process(inputs) {
    if (!this.on) return true; const frames = 128;
    for (let bus = 0; bus < 3; bus++) { const input = inputs[bus] || [], left = input[0], right = input[1] || left, out = this.buffers[bus]; let peak = this.peaks[bus];
      for (let i = 0; i < frames; i++) { const l = left ? left[i] : 0, r = right ? right[i] : 0, a = Math.abs(l) > Math.abs(r) ? Math.abs(l) : Math.abs(r); if (a > peak) peak = a; const at = (this.fill + i) * 2; out[at] = Math.max(-32768, Math.min(32767, Math.round(l * 32767))); out[at + 1] = Math.max(-32768, Math.min(32767, Math.round(r * 32767))); }
      this.peaks[bus] = peak; }
    this.fill += frames; if (this.fill >= this.size) this.flush(); return true;
  }
}
registerProcessor('hylon-recorder', HylonRecorder);
