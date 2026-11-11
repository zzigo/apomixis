// Development-only harness, not imported by the application build.
import { createAudioMixer } from '../../../packages/hylon-audio/mixer.js';
const rms = (data, a = 0, b = data.length) => Math.sqrt(data.slice(a, b).reduce((n, x) => n + x * x, 0) / Math.max(1, b - a));
async function render(configure, seconds = 1.2) {
  const context = new OfflineAudioContext(2, Math.ceil(48000 * seconds), 48000), bus = context.createGain(); bus.connect(context.destination);
  const mixer = createAudioMixer(context, bus);
  for (const key of ['samplerReverb', 'samplerDelay', 'micReverb', 'micDelay']) mixer.set(key, 0);
  const play = (destination, ch = 2, duration = .2, tone = true) => {
    const buffer = context.createBuffer(ch, Math.ceil(48000 * duration), 48000);
    for (let channel = 0; channel < ch; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) data[i] = tone ? (channel ? 0 : .15 * Math.sin(i / 48000 * Math.PI * 2 * 440)) : i === 0 ? .5 : 0;
    }
    const source = context.createBufferSource(); source.buffer = buffer; source.connect(destination); source.start(.1);
  };
  configure({ mixer, play, context }); const result = await context.startRendering(); mixer.dispose(); return result;
}
const assert = (condition, message) => { if (!condition) throw new Error(message); };
document.querySelector('#run').onclick = async () => {
  const output = document.querySelector('#result'); output.textContent = 'Rendering…'; const checks = [];
  const live = new AudioContext(); const ready = live.resume(); let liveMixer;
  try {
    let b = await render(({ mixer, play }) => play(mixer.samplerInput));
    assert(rms(b.getChannelData(0)) > .01 && rms(b.getChannelData(1)) < 1e-6, 'Sampler stereo channel isolation'); checks.push('PASS sampler preserves L/R; no unintended mono conversion');
    b = await render(({ mixer, play }) => { mixer.set('samplerDelay', 1); mixer.set('delayTime', .25); mixer.set('delayFeedback', 0); play(mixer.samplerInput, 2, .001, false); });
    assert(rms(b.getChannelData(0), 16000, 18000) > .0001, 'Delay produces timed return'); checks.push('PASS shared delay returns an impulse after configured time');
    b = await render(({ mixer, play }) => { mixer.set('samplerReverb', 1); play(mixer.samplerInput, 2, .001, false); });
    assert(rms(b.getChannelData(0), 20000) > .00001 && rms(b.getChannelData(1), 20000) > .00001, 'Stereo reverb tail'); checks.push('PASS stereo reverb tail exists after source ends');
    b = await render(({ mixer, play }) => play(mixer.micInput, 1, .8));
    assert(rms(b.getChannelData(0)) < 1e-7, 'Mic muted at startup'); checks.push('PASS mic is silent until deliberately enabled');
    b = await render(({ mixer, play }) => { mixer.enableMic(true); play(mixer.micInput, 1, .8); });
    assert(rms(b.getChannelData(0), 10000, 35000) > .0001, 'Vocoder produces modulated carrier'); checks.push('PASS 16-band vocoder produces signal from modulator + internal carrier');
    b = await render(({ mixer }) => mixer.enableMic(true));
    assert(rms(b.getChannelData(0)) < 1e-7, 'Carrier must not leak without modulator'); checks.push('PASS vocoder carrier is silent without mic modulation');
    const plain = await render(({ mixer, play }) => { mixer.enableMic(true); mixer.set('vocoderMix', 0); play(mixer.micInput, 1, .9); });
    const chopped = await render(({ mixer, play }) => { mixer.enableMic(true); mixer.set('vocoderMix', 0); mixer.set('chopDepth', 1); mixer.set('chopRate', 4); play(mixer.micInput, 1, .9); });
    assert(rms(chopped.getChannelData(0), 10000, 40000) < rms(plain.getChannelData(0), 10000, 40000) * .85, 'Chopper modulates mic'); checks.push('PASS chopper attenuates/modulates post-vocoder mic path');
    assert([...plain.getChannelData(0), ...chopped.getChannelData(0)].every(Number.isFinite), 'Finite samples');
    b = await render(({ mixer, play, context }) => {
      mixer.set('samplerReverb', 1); mixer.set('samplerDelay', 1); play(mixer.samplerInput, 2, .001, false);
      context.suspend(.5).then(() => { mixer.panic(); return context.resume(); });
    });
    assert(rms(b.getChannelData(0), 32000) < 1e-7 && rms(b.getChannelData(1), 32000) < 1e-7, 'Panic clears delayed/reverb tails');
    checks.push('PASS panic rebuilds FX and clears queued reverb/delay tails');
    await ready;
    const silentMaster = live.createGain(); silentMaster.gain.value = 0; silentMaster.connect(live.destination);
    liveMixer = createAudioMixer(live, silentMaster);
    const tone = live.createOscillator(); tone.connect(liveMixer.samplerInput); tone.start();
    await new Promise(resolve => setTimeout(resolve, 180));
    const meterData = new Float32Array(256); liveMixer.meters.sampler[0].getFloatTimeDomainData(meterData);
    assert(meterData.some(sample => Math.abs(sample) > .01), 'Live stereo analyser receives sampler signal');
    liveMixer.meters.master[0].getFloatTimeDomainData(meterData);
    assert(meterData.every(sample => Math.abs(sample) < 1e-7), 'Master meter follows actual post-fader mute');
    tone.stop(); checks.push('PASS live meter sees sampler while muted post-master meter stays silent');
    output.textContent = checks.join('\n') + '\n9/9 PASS';
  } catch (error) { output.textContent = checks.join('\n') + '\nFAIL: ' + error.message; }
  finally { liveMixer?.dispose(); await live.close(); }
};
