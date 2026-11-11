export const MIXER_DEFAULTS = Object.freeze({ samplerLevel: .8, samplerReverb: .15, samplerDelay: .08, micLevel: .7, micReverb: .2, micDelay: .1, reverbLevel: .35, delayLevel: .3, delayTime: .35, delayFeedback: .25, vocoderMix: 1, carrierHz: 130.81, carrier: 'internal', chopRate: 4, chopDepth: 0 });
const bounds = { samplerLevel: [0, 1], micLevel: [0, 1], samplerReverb: [0, 1], samplerDelay: [0, 1], micReverb: [0, 1], micDelay: [0, 1], reverbLevel: [0, 1], delayLevel: [0, 1], delayTime: [.02, 1.5], delayFeedback: [0, .8], vocoderMix: [0, 1], carrierHz: [50, 1000], chopRate: [.25, 32], chopDepth: [0, 1] };
export function validateMixerValue(key, value) {
  if (key === 'carrier') { if (!['internal', 'sampler'].includes(value)) throw new Error('Unknown vocoder carrier'); return value; }
  if (!bounds[key] || !Number.isFinite(value) || value < bounds[key][0] || value > bounds[key][1]) throw new Error(`Invalid mixer control: ${key}`);
  return value;
}
export function createAudioMixer(context, output) {
  const nodes = [], sources = [], params = { ...MIXER_DEFAULTS }; let disposed = false, micEnabled = false, fx = [];
  const keep = node => { nodes.push(node); return node; };
  const gain = (value = 1) => { const node = keep(context.createGain()); node.gain.value = value; return node; };
  const smooth = (param, value) => param.setTargetAtTime(value, context.currentTime, .02);
  const samplerInput = gain(); samplerInput.channelCount = 2; samplerInput.channelCountMode = 'explicit'; samplerInput.channelInterpretation = 'speakers';
  const micInput = gain(0), micOutGate = gain(0), samplerFader = gain(params.samplerLevel), micFader = gain(params.micLevel), sum = gain();
  const compressor = keep(context.createDynamicsCompressor());
  compressor.threshold.value = -10; compressor.knee.value = 12; compressor.ratio.value = 8; compressor.attack.value = .003; compressor.release.value = .15;
  sum.connect(compressor); compressor.connect(output);
  const revInput = gain(), delayInput = gain(), revReturn = gain(params.reverbLevel), delayReturn = gain(params.delayLevel);
  revReturn.connect(sum); delayReturn.connect(sum);
  const samplerRev = gain(params.samplerReverb), samplerDel = gain(params.samplerDelay), micRev = gain(params.micReverb), micDel = gain(params.micDelay);
  samplerInput.connect(samplerFader); samplerFader.connect(sum); samplerFader.connect(samplerRev); samplerFader.connect(samplerDel); samplerRev.connect(revInput); samplerDel.connect(delayInput);
  micOutGate.connect(micFader); micFader.connect(sum); micFader.connect(micRev); micFader.connect(micDel); micRev.connect(revInput); micDel.connect(delayInput);
  // Local deterministic stereo impulse: no downloads or external assets.
  const impulse = context.createBuffer(2, Math.ceil(context.sampleRate * 2.4), context.sampleRate); let seed = 0x48a71;
  for (let ch = 0; ch < 2; ch++) { const data = impulse.getChannelData(ch); for (let i = 0; i < data.length; i++) { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; data[i] = ((seed >>> 0) / 2147483648 - 1) * (1 - i / data.length) ** 3; } }
  let delay, feedback;
  function rebuildEffects() {
    for (const node of fx) { try { node.disconnect(); } catch {} }
    revInput.disconnect(); delayInput.disconnect();
    const reverb = context.createConvolver(); reverb.buffer = impulse;
    delay = context.createDelay(2); delay.delayTime.value = params.delayTime;
    feedback = context.createGain(); feedback.gain.value = params.delayFeedback;
    const damp = context.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 4500;
    revInput.connect(reverb); reverb.connect(revReturn);
    delayInput.connect(delay); delay.connect(delayReturn); delay.connect(damp); damp.connect(feedback); feedback.connect(delay);
    fx = [reverb, delay, feedback, damp];
  }
  rebuildEffects();
  const carrierBus = gain(), internalGain = gain(.2), samplerCarrier = gain(0);
  const osc = keep(context.createOscillator()); osc.type = 'sawtooth'; osc.frequency.value = params.carrierHz; osc.connect(internalGain); internalGain.connect(carrierBus); osc.start(); sources.push(osc);
  samplerInput.connect(samplerCarrier); samplerCarrier.connect(carrierBus);
  const vocoded = gain(1), micDry = gain(0), blend = gain(); micInput.connect(micDry); micDry.connect(blend); vocoded.connect(blend);
  const rect = Float32Array.from({ length: 2049 }, (_, i) => Math.abs(i / 1024 - 1));
  for (let band = 0; band < 16; band++) {
    const frequency = 160 * (6400 / 160) ** (band / 15);
    const mod = keep(context.createBiquadFilter()); mod.type = 'bandpass'; mod.frequency.value = frequency; mod.Q.value = 3;
    const abs = keep(context.createWaveShaper()); abs.curve = rect;
    const envelope = keep(context.createBiquadFilter()); envelope.type = 'lowpass'; envelope.frequency.value = 35; envelope.Q.value = .5;
    const boost = gain(6), carrierBand = keep(context.createBiquadFilter()); carrierBand.type = 'bandpass'; carrierBand.frequency.value = frequency; carrierBand.Q.value = 3;
    const vca = gain(0);
    micInput.connect(mod); mod.connect(abs); abs.connect(envelope); envelope.connect(boost); boost.connect(vca.gain);
    carrierBus.connect(carrierBand); carrierBand.connect(vca); vca.connect(vocoded);
  }
  const chop = gain(1), chopOsc = keep(context.createOscillator()), chopShape = keep(context.createWaveShaper()), chopSmooth = keep(context.createBiquadFilter()), chopAmount = gain(0);
  chopOsc.frequency.value = params.chopRate; chopShape.curve = Float32Array.from({ length: 2049 }, (_, i) => Math.tanh((i / 1024 - 1) * 5));
  chopSmooth.type = 'lowpass'; chopSmooth.frequency.value = 80; chopSmooth.Q.value = .5;
  blend.connect(chop); chop.connect(micOutGate); chopOsc.connect(chopShape); chopShape.connect(chopSmooth); chopSmooth.connect(chopAmount); chopAmount.connect(chop.gain); chopOsc.start(); sources.push(chopOsc);
  function meter(source) {
    const splitter = keep(context.createChannelSplitter(2)); source.connect(splitter);
    return [0, 1].map(ch => { const node = keep(context.createAnalyser()); node.fftSize = 256; node.smoothingTimeConstant = .5; splitter.connect(node, ch); return node; });
  }
  const meters = { sampler: meter(samplerFader), mic: meter(micFader), reverb: meter(revReturn), delay: meter(delayReturn), master: meter(output) };
  const targets = { samplerLevel: samplerFader.gain, samplerReverb: samplerRev.gain, samplerDelay: samplerDel.gain, micLevel: micFader.gain, micReverb: micRev.gain, micDelay: micDel.gain, reverbLevel: revReturn.gain, delayLevel: delayReturn.gain, carrierHz: osc.frequency, chopRate: chopOsc.frequency };
  function set(key, value) {
    validateMixerValue(key, value); if (disposed) return; params[key] = value;
    if (targets[key]) smooth(targets[key], value);
    else if (key === 'delayTime') smooth(delay.delayTime, value);
    else if (key === 'delayFeedback') smooth(feedback.gain, value);
    else if (key === 'vocoderMix') { smooth(micDry.gain, 1 - value); smooth(vocoded.gain, value); }
    else if (key === 'carrier') { smooth(internalGain.gain, value === 'internal' ? .2 : 0); smooth(samplerCarrier.gain, value === 'sampler' ? 1 : 0); }
    else if (key === 'chopDepth') { smooth(chop.gain, 1 - value / 2); smooth(chopAmount.gain, value / 2); }
  }
  function enableMic(value) { if (disposed) return; micEnabled = !!value; smooth(micInput.gain, micEnabled ? 1 : 0); smooth(micOutGate.gain, micEnabled ? 1 : 0); }
  return { samplerInput, micInput, meters, params, set, enableMic, get micEnabled() { return micEnabled; },
    panic() { if (disposed) return; enableMic(false); rebuildEffects(); },
    dispose() { if (disposed) return; enableMic(false); disposed = true; sources.forEach(node => { try { node.stop(); } catch {} }); [...nodes, ...fx].forEach(node => { try { node.disconnect(); } catch {} }); }
  };
}
