import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioSystem } from '../apps/hylon/src/audio.js';

class FakeNode {
  constructor() {
    this.connections = []; this.disconnected = false;
    this.gain = { value: 1, setTargetAtTime(value) { this.value = value; } };
  }
  connect(destination, output = 0) { this.connections.push({ destination, output }); }
  disconnect(destination) {
    if (destination) this.connections = this.connections.filter(c => c.destination !== destination);
    else { this.connections = []; this.disconnected = true; }
  }
}
class FakeContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = new FakeNode(); }
  async resume() { this.state = 'running'; }
  createGain() { return new FakeNode(); }
  createAnalyser() { return new FakeNode(); }
  createMediaStreamSource() { return new FakeNode(); }
  createChannelSplitter(channels) { const n = new FakeNode(); n.channels = channels; return n; }
  async setSinkId(id) { if (id === 'denied') throw new Error('Sink permission denied'); this.sinkId = id; }
}
function stream(channels = 2) {
  const handlers = {};
  const track = { stopped: false, stop() { this.stopped = true; }, getSettings: () => ({ channelCount: channels, sampleRate: 48000 }), addEventListener(name, fn) { handlers[name] = fn; } };
  return { track, end: () => handlers.ended?.(), getTracks: () => [track], getAudioTracks: () => [track] };
}
function environment(t, getUserMedia = async () => stream()) {
  const nav = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const ctx = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  const requests = [];
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { mediaDevices: { enumerateDevices: async () => [], getUserMedia: async c => { requests.push(c); return getUserMedia(c); } } } });
  Object.defineProperty(globalThis, 'AudioContext', { configurable: true, value: FakeContext });
  t.after(() => {
    if (nav) Object.defineProperty(globalThis, 'navigator', nav); else delete globalThis.navigator;
    if (ctx) Object.defineProperty(globalThis, 'AudioContext', ctx); else delete globalThis.AudioContext;
  });
  return requests;
}

test('two explicit channels, independent gains and initially muted monitoring', async t => {
  const requests = environment(t); const audio = new AudioSystem();
  await audio.start('microphone');
  assert.deepEqual(requests[0].audio.deviceId, { exact: 'microphone' });
  assert.equal(requests[0].audio.echoCancellation, false);
  assert.deepEqual(audio.routes, [0, 1]); assert.equal(audio.analysers.length, 2);
  assert.deepEqual(audio.splitter.connections.map(c => c.output), [0, 1]);
  assert.equal(audio.monitor, false); assert.ok(audio.analysers.every(a => a.monitor.gain.value === 0));
  audio.route(0, 1); assert.equal(audio.routes[0], 1);
  audio.gain(0, 0.4); assert.equal(audio.analysers[0].gain.gain.value, 0.4);
  assert.equal(audio.analysers[1].gain.gain.value, 1);
  audio.setMonitor(true); assert.ok(audio.analysers.every(a => a.monitor.gain.value === 1));
  audio.stopInput();
});
test('switch and stop release tracks/nodes; old ended events do not stop replacement', async t => {
  const first = stream(), second = stream(); const streams = [first, second];
  environment(t, async () => streams.shift()); const audio = new AudioSystem();
  await audio.start('first'); const oldNodes = [...audio.nodes]; audio.setMonitor(true);
  await audio.start('second');
  assert.equal(first.track.stopped, true); assert.ok(oldNodes.every(n => n.disconnected));
  assert.equal(audio.stream, second); assert.equal(audio.monitor, false);
  first.end(); assert.equal(audio.stream, second);
  const nodes = [...audio.nodes]; audio.stopInput();
  assert.equal(second.track.stopped, true); assert.ok(nodes.every(n => n.disconnected));
  assert.equal(audio.stream, null); assert.equal(audio.analysers.length, 0);
});
test('stopping during permission prompt discards late stream without building routes', async t => {
  let accept; const delayed = stream();
  environment(t, () => new Promise(resolve => { accept = resolve; })); const audio = new AudioSystem();
  const pending = audio.start('pending');
  while (!accept) await Promise.resolve();
  audio.stopInput(); accept(delayed); await pending;
  assert.equal(delayed.track.stopped, true); assert.equal(audio.stream, null); assert.equal(audio.nodes.length, 0);
});
test('immediate stop also cancels start before its first asynchronous setup completes', async t => {
  const incoming = stream(); const requests = environment(t, async () => incoming);
  const audio = new AudioSystem(); const pending = audio.start('pending'); audio.stopInput(); await pending;
  assert.equal(audio.stream, null);
  assert.ok(requests.length === 0 || incoming.track.stopped);
});
test('out-of-range channel selection leaves routes/connections unchanged', async t => {
  environment(t); const audio = new AudioSystem(); await audio.start();
  const before = [...audio.splitter.connections];
  audio.route(0, -1); audio.route(1, 2);
  assert.deepEqual(audio.routes, [0, 1]); assert.deepEqual(audio.splitter.connections, before);
  audio.stopInput();
});
test('sink failure preserves last successful selection; unsupported sink explains fallback', async t => {
  environment(t); const audio = new AudioSystem();
  await audio.setOutput('speakers');
  await assert.rejects(audio.setOutput('denied'), /permission denied/);
  assert.equal(audio.outputId, 'speakers'); assert.equal(audio.context.sinkId, 'speakers');
  audio.context.setSinkId = undefined;
  await assert.rejects(audio.setOutput('other'), /system audio settings/);
  assert.equal(audio.outputId, 'speakers');
});

test('fixed sampler destination and single mic lane use effects without legacy dry bypass', async t => {
  environment(t); let mixer;
  const audio = new AudioSystem(() => {}, { createMixer(context, output) {
    mixer = { samplerInput: new FakeNode(), micInput: new FakeNode(), enabled: false, enableMic(value) { this.enabled = value; } };
    return mixer;
  } });
  audio.setMasterGain(.2); await audio.start('mic');
  assert.equal(audio.destination(), mixer.samplerInput); assert.equal(audio.bus.gain.value, .2);
  assert.equal(mixer.enabled, false);
  assert.equal(audio.analysers[0].analyser.connections.filter(c => c.destination === mixer.micInput).length, 1);
  audio.setMonitor(true); assert.equal(mixer.enabled, true);
  assert(audio.analysers.every(n => n.monitor.gain.value === 0));
  audio.setMicLane(1); audio.setMicLane(1);
  assert.equal(audio.analysers[0].analyser.connections.filter(c => c.destination === mixer.micInput).length, 0);
  assert.equal(audio.analysers[1].analyser.connections.filter(c => c.destination === mixer.micInput).length, 1);
  audio.setMasterGain(.4); assert.equal(audio.bus.gain.value, .4);
  audio.stopInput(); assert.equal(mixer.enabled, false); assert.equal(audio.monitor, false);
});
