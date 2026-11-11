import test from 'node:test';
import assert from 'node:assert/strict';
import { MIXER_DEFAULTS, validateMixerValue } from '../packages/hylon-audio/mixer.js';
test('mixer controls reject unstable feedback, nonfinite timing and unknown carrier', () => {
  for (const [key, value] of Object.entries(MIXER_DEFAULTS)) assert.equal(validateMixerValue(key, value), value);
  for (const [key, value] of [['delayFeedback', .81], ['delayFeedback', -1], ['delayTime', 0], ['chopRate', Infinity], ['vocoderMix', NaN], ['carrier', 'remote'], ['micLevel', 2], ['unknown', .5]]) assert.throws(() => validateMixerValue(key, value));
});
