import test from 'node:test';
import assert from 'node:assert/strict';
import { MidiPoints, testFrame, sweepFrame } from '../packages/hylon-laser/patterns.js';

test('full frame closes the normalized square; high and low span full width', () => {
  const square = testFrame();
  assert.equal(square.length, 4);
  assert.deepEqual(square.at(-1).points.at(-1), square[0].points[0]);
  assert.deepEqual(testFrame('high')[0].points, [[0, 0], [1, 0]]);
  assert.deepEqual(testFrame('low')[0].points, [[0, 1], [1, 1]]);
  assert.throws(() => testFrame('unknown'));
});
test('sweeps follow LR RL TD DT with correct axis and direction', () => {
  const times = [.5, 2.5, 4.5, 6.5, 8.5];
  const results = times.map(t => sweepFrame(t, 2));
  assert.deepEqual(results.map(r => r.direction), ['LR', 'RL', 'TD', 'DT', 'LR']);
  assert.deepEqual(results.slice(0, 4).map(r => r.strokes[0].points), [
    [[.25, 0], [.25, 1]], [[.75, 0], [.75, 1]], [[0, .25], [1, .25]], [[0, .75], [1, .75]]
  ]);
  assert.equal(sweepFrame(.25, 1, 'DT').strokes[0].points[0][1], .75);
  for (const args of [[NaN, 2], [-1, 2], [0, 0], [0, Infinity], [0, 2, 'bad']]) assert.throws(() => sweepFrame(...args));
});
test('MIDI velocity scales intensity; note off and zero velocity release only owned channel/note', () => {
  const mapper = new MidiPoints({ random: () => .25 });
  mapper.receive([0x90, 60, 127]); mapper.receive([0x91, 60, 64]);
  assert.deepEqual(mapper.snapshot()[0], { x: .25, y: .25, intensity: 1, note: 60, channel: 1 });
  assert.equal(mapper.snapshot()[1].intensity, 64 / 127);
  mapper.receive([0x90, 60, 0]); assert.equal(mapper.snapshot()[0].channel, 2);
  mapper.receive([0x81, 60, 1]); assert.equal(mapper.notes.size, 0);
});
test('MIDI validates data, isolates channels, bounds points and handles all notes off', () => {
  const mapper = new MidiPoints({ limit: 2 });
  for (const b of [[0x90, 128, 3], [0x90, 60, 256], [0xf0, 1, 2], [0x90, 60], [0x90, 60, -1]]) assert.equal(mapper.receive(b), false);
  assert.equal(mapper.receive([0x91, 60, 1], 1), false);
  for (let note = 60; note < 63; note++) mapper.receive([0x90, note, 100]);
  assert.deepEqual(mapper.snapshot().map(p => p.note), [61, 62]);
  mapper.receive([0x91, 70, 80]); mapper.receive([0xb0, 123, 0]);
  assert.equal(mapper.notes.size, 1); assert.equal(mapper.snapshot()[0].channel, 2);
  mapper.receive([0xb1, 120, 0]); assert.equal(mapper.notes.size, 0);
  mapper.receive([0x90, 1, 1]); mapper.clear(); assert.equal(mapper.notes.size, 0);
  assert.throws(() => new MidiPoints({ random: () => NaN }).receive([0x90, 60, 1]));
});

import { defaultLaserProfile, validateLaserProfile, parseLaserProfile, projectLaserPoint } from '../packages/hylon-laser/profile.js';
test('laser profile keeps unknown hardware null and refuses imported output authority', () => {
  const profile = defaultLaserProfile();
  assert.equal(profile.scanRatePps, null); assert.equal(profile.angleXDeg, null); assert.equal(profile.angleYDeg, null);
  assert.equal(profile.target, 'ceiling'); assert.equal(profile.interlock, 'unknown');
  assert.deepEqual(parseLaserProfile(JSON.stringify(profile)), profile);
  for (const extra of [{ armed: true }, { verified: true }, { schemaVersion: 2 }, { interlock: true }]) assert.throws(() => validateLaserProfile({ ...profile, ...extra }));
  assert.throws(() => parseLaserProfile(' '.repeat(16385)));
});
test('laser calibration keeps transformed field inside normalized bounds and applies flips', () => {
  const profile = validateLaserProfile({ ...defaultLaserProfile(), widthPercent: 40, heightPercent: 20, offsetXPercent: 60, offsetYPercent: -80, flipX: true });
  assert.deepEqual(projectLaserPoint(profile, 0, 0), [1, 0]);
  const corners = [[0, 0], [0, 1], [1, 0], [1, 1]].map(([x, y]) => projectLaserPoint(profile, x, y));
  assert(corners.flat().every(value => value >= -1e-12 && value <= 1 + 1e-12));
  assert(projectLaserPoint(profile, 0, 0)[0] > projectLaserPoint(profile, 1, 0)[0]);
  assert.throws(() => validateLaserProfile({ ...profile, offsetXPercent: 61 }));
  assert.throws(() => projectLaserPoint(profile, NaN, .5));
});
test('laser configuration rejects malformed scan and field settings without guessing ratings', () => {
  const profile = defaultLaserProfile();
  for (const extra of [{ scanRatePps: 0 }, { scanRatePps: 100001 }, { scanRatePps: 2.5 }, { scanRatePps: '30000' }, { angleXDeg: NaN }, { angleYDeg: 0 }, { widthPercent: 0 }, { intensityPercent: 101 }, { flipX: 1 }, { model: '<'.repeat(121) }]) assert.throws(() => validateLaserProfile({ ...profile, ...extra }));
  assert.equal(validateLaserProfile({ ...profile, scanRatePps: 25000, angleXDeg: 8, intensityPercent: 0 }).intensityPercent, 0);
});
