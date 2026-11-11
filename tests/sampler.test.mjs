import test from 'node:test';
import assert from 'node:assert/strict';
import { createSamplePlayer } from '../apps/hylon/src/sampler.js';

function mockAudio() {
  const sources = [], gains = [];
  const context = {
    currentTime: 10,
    createBufferSource() {
      const source = { playbackRate: {value: 1}, starts: [], stops: [], connect() {}, disconnect() { this.disconnected = true; }, start(at) { this.starts.push(at); }, stop(at) { this.stops.push(at); } };
      sources.push(source); return source;
    },
    createGain() {
      const gain = { gain: { value: 0.2, ramps: [], cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime(v, t) { this.ramps.push([v,t]); } }, connect() {}, disconnect() {} };
      gains.push(gain); return gain;
    }
  };
  return { context, sources, gains, player: createSamplePlayer(context, {}) };
}
const buffer = { duration: 4 };

test('sampler rejects malformed pitches and unsafe loop regions before allocating audio', () => {
  const { player, sources } = mockAudio();
  assert.equal(player.play('x',buffer,NaN,60),false);
  assert.equal(player.play('x',buffer,60,128),false);
  assert.equal(player.play('x',buffer,60,60,{loop:true,loopStart:2,loopEnd:1}),false);
  assert.equal(player.play('x',buffer,60,60,{loop:true,loopEnd:5}),false);
  assert.equal(player.play('x',buffer,60,60,{release:Infinity}),false);
  assert.equal(sources.length,0);
});

test('sample transposition, loop opt-in and 30-second hard note expiry', () => {
  const { player, sources } = mockAudio();
  assert.equal(player.play('x',buffer,72,60),true);
  assert.equal(sources[0].playbackRate.value,2);
  assert.equal(sources[0].loop,false);
  assert.deepEqual(sources[0].stops,[40]);
  assert.equal(player.play('loop',buffer,60,60,{loop:true,loopStart:0.1,loopEnd:3}),true);
  assert.equal(sources[1].loopStart,0.1);
  assert.equal(sources[1].loopEnd,3);
  assert.deepEqual(sources[1].stops,[40]);
});

test('voice limit includes released tails and cleanup releases capacity', () => {
  const { player, sources } = mockAudio();
  for(let i=0;i<16;i++) assert.equal(player.play(String(i),buffer,60,60),true);
  assert.equal(player.play('overflow',buffer,60,60),false);
  player.release('0');
  assert.equal(player.play('still-full',buffer,60,60),false);
  sources[0].onended();
  assert.equal(player.play('new',buffer,60,60),true);
  assert.equal(player.activeCount,16);
});

test('retrigger cleanup cannot erase the new note; stop shortens release tails', () => {
  const { player, sources } = mockAudio();
  player.play('x',buffer,60,60,{release:5});
  player.release('x');
  player.play('x',buffer,62,60);
  sources[0].onended();
  assert.equal(player.activeCount,1);
  player.release('x');
  player.stop();
  assert.equal(sources[1].stops.at(-1),10.01);
  sources[1].onended();
  assert.equal(player.activeCount,0);
});
