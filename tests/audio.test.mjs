import test from 'node:test';
import assert from 'node:assert/strict';
import { AudioSystem } from '../apps/hylon/src/audio.js';

class FakeNode {
  constructor() {
    this.connections = []; this.disconnected = false;
    this.gain = { value: 1, setTargetAtTime(value) { this.value = value; }, setValueAtTime(value) { this.value = value; }, linearRampToValueAtTime(value) { this.value = value; } };
  }
  connect(destination, output = 0, input = 0) { this.connections.push({ destination, output, input }); }
  disconnect(destination) {
    if (destination) this.connections = this.connections.filter(c => c.destination !== destination);
    else { this.connections = []; this.disconnected = true; }
  }
}
class FakeContext {
  constructor() { this.state = 'running'; this.currentTime = 0; this.destination = new FakeNode(); }
  async resume() { this.state = 'running'; }
  async suspend() { this.state = 'suspended'; }
  createGain() { return new FakeNode(); }
  createAnalyser() { return new FakeNode(); }
  createChannelMerger() { return new FakeNode(); }
  createOscillator() { const n = new FakeNode(); n.frequency = {value:0}; n.start = time => { n.startAt = time; }; n.stop = time => { n.stopAt = time; }; return n; }
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
  assert.deepEqual(audio.splitter.connections.filter(c => c.destination !== audio.inputMeter).map(c => c.output), [0, 1]);
  assert.equal(audio.splitter.connections.find(c => c.destination === audio.inputMeter).output, 0);
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
test('SUPER PANIC releases microphone and forces master to exact zero',async t=>{
  const input=stream();environment(t,async()=>input);const audio=new AudioSystem();await audio.start();audio.setMonitor(true);
  let cancelled=false;audio.bus.gain.cancelScheduledValues=()=>{cancelled=true;};audio.bus.gain.setValueAtTime=value=>{audio.bus.gain.value=value;};
  audio.panic();assert.equal(input.track.stopped,true);assert.equal(audio.stream,null);assert.equal(audio.monitor,false);assert.equal(audio.masterLevel,0);assert.equal(audio.bus.gain.value,0);assert.equal(cancelled,true);
});

test('header tone is finite, left then right, and off releases mic/test nodes without resetting master', async t => {
  environment(t); const audio = new AudioSystem();
  await audio.start(); const mic = audio.stream;
  await audio.testTone();
  const [merger, left, leftGain, right, rightGain] = audio.testNodes;
  assert.equal(left.frequency.value, 440); assert.equal(right.frequency.value, 440);
  assert.equal(left.stopAt - left.startAt, .5); assert.equal(right.stopAt - right.startAt, .5);
  assert.equal(right.startAt, left.stopAt);
  assert.equal(leftGain.connections[0].input, 0); assert.equal(rightGain.connections[0].input, 1);
  assert.equal(merger.connections[0].destination, audio.bus);
  assert.equal(audio.bus.connections[0].destination, audio.outputMeter);
  await audio.off();
  assert.equal(audio.context.state, 'suspended'); assert.equal(mic.track.stopped, true);
  assert.equal(audio.testNodes.length, 0); assert.equal(audio.masterLevel, .3);
});
test('off during pending tone startup prevents late test creation', async t => {
  environment(t); const audio = new AudioSystem();
  const pending = audio.testTone(); await audio.off(); await pending;
  assert.equal(audio.testNodes.length, 0); assert.equal(audio.context.state, 'suspended');
});
test('remembered output is applied at start; OFF cancels a delayed output restore', async t => {
  environment(t); const audio = new AudioSystem(); audio.outputId='remembered-output';
  await audio.ensure(); assert.equal(audio.context.sinkId,'remembered-output');
  audio.context=null;
  const pending=audio.ensure();
  // The initial setSinkId is asynchronous even on this fake context.
  const rejected=assert.rejects(pending,/cancelled/); await audio.off(); await rejected;
  assert.equal(audio.context.state,'suspended');
});
