// Performance recorder (header REC). One take = everything needed to hear a performance again:
//   <stamp>_log.jsonl   every MIDI message in (k:"i") and out (k:"o") with its time in ms, and every change of
//                       the performance state (k:"s": score, section, running, TEMPO, DUR, vector, IMPRO, program)
//   <stamp>_IN.mid      what was played (MIDI IN)            1 tick = 1 ms
//   <stamp>_OUT.mid     what HYLON sent to the organ (MIDI OUT)
//   <stamp>_MIC.wav     the microphone input, raw (only with Shift+REC)
// The log and the audio are appended to disk every two seconds, so a crash keeps the take up to that point;
// the .mid files are written at stop (they can be rebuilt from the log). Files: .local/recordings/.
const post = (name, mode, body, extra = '') => fetch(`/__hylon/recording?name=${encodeURIComponent(name)}&mode=${mode}${extra}`, { method: 'POST', body }).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); });
function smf(events) {
  const bytes = [], vlq = n => { const out = [n & 127]; while ((n >>= 7)) out.unshift((n & 127) | 128); return out; };
  let last = 0; bytes.push(0, 0xff, 0x51, 3, 0x07, 0xa1, 0x20); // 500000 µs per quarter, 500 ticks per quarter: 1 tick = 1 ms
  for (const [t, data] of events.slice().sort((a, b) => a[0] - b[0])) { const status = data[0]; if (!(status >= 0x80 && status < 0xf0)) continue; const tick = Math.max(last, Math.round(t)); bytes.push(...vlq(tick - last), ...data); last = tick; }
  bytes.push(0, 0xff, 0x2f, 0);
  const head = [0x4d, 0x54, 0x68, 0x64, 0, 0, 0, 6, 0, 0, 0, 1, 0x01, 0xf4, 0x4d, 0x54, 0x72, 0x6b, (bytes.length >>> 24) & 255, (bytes.length >>> 16) & 255, (bytes.length >>> 8) & 255, bytes.length & 255];
  return new Uint8Array([...head, ...bytes]);
}
export function createPerfRecorder({ audio, getState, notify = () => {}, onChange = () => {} }) {
  let take = null, lastError = '';
  const push = entry => { if (take) take.lines.push(JSON.stringify(entry)); };
  const chain = job => { take.queue = take.queue.then(job).catch(error => { lastError = error.message; }); return take.queue; };
  function flush() { if (!take) return; const mine = take;
    if (mine.lines.length) { const text = mine.lines.join('\n') + '\n'; mine.lines = []; chain(() => post(`${mine.stamp}_log.jsonl`, 'append', text)); }
    if (mine.pcm.length) { const blocks = mine.pcm; mine.pcm = []; chain(() => post(`${mine.stamp}_MIC.wav`, 'append', new Blob(blocks), `&rate=${mine.rate}&channels=2`)); } }
  function observe() { if (!take) return; let state; try { state = getState(); } catch { return; } const { pos, ...rest } = state, text = JSON.stringify(rest); if (text === take.lastState) return; take.lastState = text; push({ t: Math.round(performance.now() - take.t0), k: 's', pos, s: rest }); }
  async function startAudio(mine) {
    if (!audio.stream) await audio.start(audio.inputId); else await audio.ensure();
    if (!audio.stream || !audio.analysers.length) throw new Error('No microphone input');
    audio.recModule ||= audio.context.audioWorklet.addModule(new URL('../../../packages/hylon-audio/rec-processor.js', import.meta.url)); await audio.recModule;
    const node = new AudioWorkletNode(audio.context, 'hylon-recorder', { numberOfInputs: 3, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: 'explicit' }), merger = audio.context.createChannelMerger(2), silent = audio.context.createGain(); silent.gain.value = 0;
    const lanes = audio.analysers.map(n => n.analyser); lanes[0].connect(merger, 0, 0); (lanes[1] || lanes[0]).connect(merger, 0, 1); merger.connect(node, 0, 0); node.connect(silent); silent.connect(audio.context.destination);
    node.port.onmessage = event => { if (event.data.type === 'block' && take === mine) mine.pcm.push(event.data.blocks[0]); else if (event.data.type === 'done') mine.audioDone?.(); };
    node.port.postMessage('start'); mine.rate = audio.context.sampleRate; mine.audio = { node, merger, silent, lanes };
  }
  async function start({ withAudio = false } = {}) {
    if (take) return; lastError = '';
    const stamp = 'perf_' + new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, ''), mine = { stamp, t0: performance.now(), lines: [], pcm: [], input: [], output: [], queue: Promise.resolve(), lastState: '', audio: null, rate: 48000, withAudio };
    take = mine; push({ t: 0, k: 'start', wall: new Date().toISOString(), audio: withAudio, note: 'times in ms from start; i = MIDI IN bytes, o = MIDI OUT bytes, s = state change (pos = score position in ms)' });
    if (withAudio) { try { await startAudio(mine); } catch (error) { mine.withAudio = false; notify(`REC · no audio (${error.message}) · MIDI only`); } }
    observe(); mine.timers = [setInterval(observe, 250), setInterval(flush, 2000)]; notify(`REC · ${mine.withAudio ? 'MIDI + MIC' : 'MIDI'} · ${stamp}`); onChange();
  }
  async function stop() {
    const mine = take; if (!mine) return; mine.timers?.forEach(clearInterval); observe(); push({ t: Math.round(performance.now() - mine.t0), k: 'stop' });
    if (mine.audio) { await new Promise(resolve => { mine.audioDone = resolve; mine.audio.node.port.postMessage('stop'); setTimeout(resolve, 800); }); try { mine.audio.lanes.forEach(l => { try { l.disconnect(mine.audio.merger); } catch {} }); mine.audio.merger.disconnect(); mine.audio.node.disconnect(); mine.audio.silent.disconnect(); } catch {} }
    flush(); take = null; onChange();
    mine.queue = mine.queue.then(async () => {
      if (mine.input.length) await post(`${mine.stamp}_IN.mid`, 'whole', smf(mine.input));
      if (mine.output.length) await post(`${mine.stamp}_OUT.mid`, 'whole', smf(mine.output));
      if (mine.withAudio) await post(`${mine.stamp}_MIC.wav`, 'finalize', '', `&rate=${mine.rate}&channels=2`);
    }).catch(error => { lastError = error.message; });
    await mine.queue;
    notify(lastError ? `REC · ${mine.stamp} · ${lastError}` : `REC saved · ${mine.stamp} · IN ${mine.input.length} · OUT ${mine.output.length} messages${mine.withAudio ? ' · MIC' : ''} → .local/recordings`);
  }
  const midi = (list, kind) => (bytes, at) => { if (!take || !bytes?.length) return; const t = Math.max(0, (Number.isFinite(at) ? at : performance.now()) - take.t0), data = Array.from(bytes); if (data[0] >= 0xf8) return; list(take).push([t, data]); push({ t: Math.round(t * 10) / 10, k: kind, b: data }); };
  window.addEventListener('pagehide', () => { if (take) { try { flush(); } catch {} } });
  return { start, stop, toggle: options => take ? stop() : start(options), midiIn: midi(t => t.input, 'i'), midiOut: midi(t => t.output, 'o'), status: () => ({ recording: !!take, audio: !!take?.withAudio, stamp: take?.stamp || '', seconds: take ? Math.round((performance.now() - take.t0) / 1000) : 0, error: lastError }) };
}
