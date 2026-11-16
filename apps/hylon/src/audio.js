import {createSoundGarden} from '../../../packages/hylon-audio/garden.js';
import {validateMixerValue} from '../../../packages/hylon-audio/mixer.js';
import {createLocalMidiInput} from './local-midi-input.js';
export class AudioSystem {
  constructor(onChange = () => {}, { createMixer = null } = {}) {
    this.onChange = onChange; this.context = null; this.stream = null;
    this.devices = []; this.inputId = ''; this.outputId = ''; this.routes = [0, 1];
    this.gains = [1, 1]; this.monitor = false; this.bus = null; this.nodes = []; this.analysers = [];
    this.inputRevision = 0; this.createMixer = createMixer; this.mixer = null; this.micLane = 0; this.masterLevel = .9;
    this.outputRoutes={klais:true,audio:false,midi:true};this.routeGates={};this.localMidiEnabled=false; this.localMidi=null;this.mixerSettings={}; this.midiLevel = 1; this.followerNote = null; this.pitchListeners = new Set();
    this.testNodes = []; this.testRevision = 0; this.engineRevision = 0; this.inputMeter = null; this.outputMeter = null;
  }
  async ensure() {
    const revision = this.engineRevision;
    if (!this.context) {
      // 'interactive' asks for the smallest output buffer, which drops out (crackles) when many sampler voices
      // start at once. 'balanced' is the default; localStorage hylon-audio-latency = interactive | balanced | playback.
      let latencyHint = 'balanced'; try { const stored = localStorage.getItem('hylon-audio-latency'); if (['interactive','balanced','playback'].includes(stored)) latencyHint = stored; } catch {}
      this.context = new AudioContext({ latencyHint }); this.latencyHint = latencyHint;
      this.bus = this.context.createGain(); this.bus.gain.value = this.masterLevel;
      this.outputMeter = this.context.createAnalyser(); this.outputMeter.fftSize = 256;
      this.bus.connect(this.outputMeter); this.outputMeter.connect(this.context.destination);
      if (this.createMixer) { this.mixer = this.createMixer(this.context, this.bus); this.mixer.onPitch?.(pitch=>{for(const listener of this.pitchListeners)listener(pitch);}); }
      for(const [key,value] of Object.entries(this.mixerSettings))this.mixer?.set(key,value);
      try { this.mixer?.setLimiter?.(localStorage.getItem('hylon-audio-limiter') !== 'off'); } catch {}
      for(const [route,destination] of [['klais',this.mixer?.samplerInput||this.bus],['audio',this.mixer?.localInput||this.bus]]){const gate=this.context.createGain();gate.gain.value=this.outputRoutes[route]?1:0;gate.connect(destination);this.routeGates[route]=gate;}
      this.localMidi=createLocalMidiInput(this.context,this.localDestination());this.localMidi.setEnabled(this.localMidiEnabled);
      if (this.outputId && this.context.setSinkId) await this.context.setSinkId(this.outputId);
    }
    await this.mixer?.ready;
    if (revision !== this.engineRevision) throw new Error('Audio start cancelled');
    if (this.context.state !== 'running') await this.context.resume();
    if (revision !== this.engineRevision) throw new Error('Audio start cancelled');
    this.onChange(); return this.context;
  }
  async setGarden(on) {
    this.gardenRevision=(this.gardenRevision||0)+1;const revision=this.gardenRevision;
    if(!on){this.garden?.stop();this.garden=null;this.onChange();return;}
    if(this.garden?.active)return;
    const context=await this.ensure();if(revision!==this.gardenRevision)return;
    this.garden=createSoundGarden(context,this.bus);this.onChange();
  }
  stopGarden(){this.gardenRevision=(this.gardenRevision||0)+1;this.garden?.stop(true);this.garden=null;}
  // Score tape: a recording decoded once and played into the MIC strip (follower, autotune, FX), in sync
  // with the SPORE transport. tapeReady stays true once a tape is decoded so the follower can be armed.
  async prepareTape(url) {
    this.tapeCache ||= new Map(); let entry = this.tapeCache.get(url);
    if (!entry) { entry = { bytes: fetch(url).then(r => { if (!r.ok) throw new Error(`TAPE ${url}: HTTP ${r.status}`); return r.arrayBuffer(); }), buffer: null }; this.tapeCache.set(url, entry); entry.bytes.catch(() => this.tapeCache.delete(url)); }
    const bytes = await entry.bytes; if (!this.context) return entry;
    if (!entry.buffer) entry.buffer = await this.context.decodeAudioData(bytes.slice(0));
    this.tapeReady = true; this.onChange(); return entry;
  }
  startTape(entry, offset, { gainDb = 0, rate = 1 } = {}) {
    this.stopTape(); if (!this.context || !entry?.buffer || offset >= entry.buffer.duration) return;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    source.buffer = entry.buffer; source.playbackRate.value = rate; gain.gain.value = 10 ** (gainDb / 20);
    source.connect(gain); gain.connect(this.mixer?.tapeInput || this.mixer?.micInput || this.bus);
    source.start(this.context.currentTime + Math.max(0, -offset) / rate, Math.max(0, offset));
    source.onended = () => { if (this.tape?.source === source) this.stopTape(); };
    this.tape = { source, gain }; this.mixer?.enableMic(true); this.onChange();
  }
  setTapeRate(rate) { if (this.tape && Number.isFinite(rate) && rate > 0) this.tape.source.playbackRate.setTargetAtTime(rate, this.context.currentTime, .01); }
  stopTape() {
    const tape = this.tape; if (!tape) return; this.tape = null;
    try { tape.source.onended = null; tape.source.stop(); } catch {} try { tape.source.disconnect(); tape.gain.disconnect(); } catch {}
    this.mixer?.enableMic(this.monitor && !!this.stream); this.onChange();
  }
  // Bus recorder: K, LA and MIC/TAPE strips (after their faders, without reverb / delay returns) as three
  // separate 16-bit stereo WAV files in .local/recordings/. Armed with REC in the MIXER; SPORE starts a take
  // on play and closes it shortly after stop, one set of files per take.
  async recStart(label) {
    if (!this.recArmed || !this.context || !this.mixer?.taps) return false;
    if (this.rec?.stopTimer) { clearTimeout(this.rec.stopTimer); this.rec.stopTimer = 0; if (this.rec.label === label) return true; await this.recStop(true); }
    if (this.rec) return true;
    if (!this.recNode) {
      this.recModule ||= this.context.audioWorklet.addModule(new URL('../../../packages/hylon-audio/rec-processor.js', import.meta.url)); await this.recModule;
      this.recNode = new AudioWorkletNode(this.context, 'hylon-recorder', { numberOfInputs: 3, numberOfOutputs: 1, outputChannelCount: [1], channelCount: 2, channelCountMode: 'explicit' });
      // A silent path to the output keeps the node rendering in every browser.
      { const silent = this.context.createGain(); silent.gain.value = 0; this.recNode.connect(silent); silent.connect(this.context.destination); }
      [this.mixer.taps.klais, this.mixer.taps.la, this.mixer.taps.mic].forEach((tap, index) => tap.connect(this.recNode, 0, index));
      this.recNode.port.onmessage = event => { const rec = this.rec; if (!rec) return; if (event.data.type === 'block') { event.data.blocks.forEach((block, i) => rec.chunks[i].push(block)); rec.peaks = event.data.peaks; rec.frames += event.data.blocks[0].length / 2; } else if (event.data.type === 'done') rec.done?.(); };
    }
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '');
    this.rec = { label, stamp, chunks: [[], [], []], peaks: [0, 0, 0], frames: 0, startedAt: Date.now(), stopTimer: 0 };
    this.recNode.port.postMessage('start'); this.recStatus = `REC · ${label}`; this.onChange(); return true;
  }
  // Called on transport stop: keep the tails for 2.5 s, then write the files.
  recStopSoon() { if (this.rec && !this.rec.stopTimer) this.rec.stopTimer = setTimeout(() => { this.recStop().catch(() => {}); }, 2500); }
  async recStop() {
    const rec = this.rec; if (!rec) return; clearTimeout(rec.stopTimer);
    await new Promise(resolve => { rec.done = resolve; this.recNode.port.postMessage('stop'); setTimeout(resolve, 1000); });
    this.rec = null; const rate = this.context.sampleRate, saved = [];
    for (const [index, bus] of ['K', 'LA', 'MIC'].entries()) {
      if (rec.peaks[index] < .0005) continue; // silent bus: no file
      const bytes = rec.chunks[index].reduce((n, c) => n + c.byteLength, 0), header = new DataView(new ArrayBuffer(44)), text = (at, s) => [...s].forEach((c, i) => header.setUint8(at + i, c.charCodeAt(0)));
      text(0, 'RIFF'); header.setUint32(4, 36 + bytes, true); text(8, 'WAVEfmt '); header.setUint32(16, 16, true); header.setUint16(20, 1, true); header.setUint16(22, 2, true); header.setUint32(24, rate, true); header.setUint32(28, rate * 4, true); header.setUint16(32, 4, true); header.setUint16(34, 16, true); text(36, 'data'); header.setUint32(40, bytes, true);
      const name = `${rec.label.replace(/-score\.txt$/i, '')}_${rec.stamp}_${bus}.wav`;
      try { const response = await fetch(`/__hylon/recording?name=${encodeURIComponent(name)}`, { method: 'POST', body: new Blob([header, ...rec.chunks[index]], { type: 'audio/wav' }) }); if (!response.ok) throw new Error(`HTTP ${response.status}`); saved.push(bus); } catch (error) { this.recStatus = `REC · ${name}: ${error.message}`; }
    }
    this.recStatus = saved.length ? `Saved ${rec.label.replace(/-score\.txt$/i, '')} · ${saved.join(' + ')} · ${Math.round(rec.frames / rate)} s → .local/recordings` : 'REC · nothing sounded, no file'; this.onChange();
  }
  setRecArmed(on) { this.recArmed = !!on; if (!on) this.recStop().catch(() => {}); this.recStatus = on ? 'REC armed · starts on PLAY' : ''; this.onChange(); }
  onPitch(listener) { this.pitchListeners.add(listener); return () => this.pitchListeners.delete(listener); }
  setMidiInputEnabled(value){this.localMidiEnabled=value===true;this.localMidi?.setEnabled(this.localMidiEnabled);}
  midi(bytes){this.localMidi?.midi(bytes);}
  stopMidiInput(){this.localMidi?.stop();}
  setOutputRoutes(routes){this.outputRoutes={...routes};for(const route of ['klais','audio'])this.routeGates[route]?.gain.setTargetAtTime(routes[route]?1:0,this.context.currentTime,.01);this.setMidiInputEnabled(routes.audio);}
  // Independent routing: straight to the mixer strip, not through the header K / LA gates.
  directDestination(route) { return (route === 'klais' ? this.mixer?.samplerInput : this.mixer?.localInput) || this.bus; }
  localDestination() { return this.routeGates.audio || this.mixer?.localInput || this.bus; }
  destination() { return this.routeGates.klais || this.mixer?.samplerInput || this.bus; }
  setMixerSettings(values){for(const [key,value] of Object.entries(values))validateMixerValue(key,value);Object.assign(this.mixerSettings,values);for(const [key,value] of Object.entries(values))this.mixer?.set(key,value);}
  setMasterGain(value) {
    if (!Number.isFinite(value) || value < 0 || value > 1) return;
    this.masterLevel = value; this.bus?.gain.setTargetAtTime(value, this.context.currentTime, .02); this.onChange();
  }
  setMicLane(index) {
    if (![0, 1].includes(index)) return;
    if (this.mixer) {
      this.analysers.forEach(n => { try { n.analyser.disconnect(this.mixer.micInput); } catch {} });
      this.analysers[index]?.analyser.connect(this.mixer.micInput);
    }
    this.micLane = index; this.onChange();
  }
  async refresh() {
    if (!navigator.mediaDevices?.enumerateDevices) throw new Error('Audio devices unavailable. Use localhost in Chrome.');
    this.devices = await navigator.mediaDevices.enumerateDevices(); this.onChange();
  }
  async start(inputId = this.inputId) {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error('Microphone unavailable in this browser/context.');
    // Release old device before requesting another; failed switching leaves input stopped.
    this.stopInput();
    const revision = this.inputRevision;
    await this.ensure();
    if (revision !== this.inputRevision) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: {
      ...(inputId ? { deviceId: { exact: inputId } } : {}), channelCount: { ideal: 2 },
      echoCancellation: false, noiseSuppression: false, autoGainControl: false
    } });
    if (revision !== this.inputRevision) { stream.getTracks().forEach(t => t.stop()); return; }
    this.stream = stream; this.inputId = inputId;
    const track = stream.getAudioTracks()[0];
    track.addEventListener('ended', () => { if (this.stream === stream) this.stopInput(); });
    this.settings = track.getSettings(); this.source = this.context.createMediaStreamSource(stream);
    this.channels = Math.min(32, Math.max(1, this.settings.channelCount || 1));
    this.splitter = this.context.createChannelSplitter(this.channels); this.source.connect(this.splitter);
    this.inputMeter = this.context.createAnalyser(); this.inputMeter.fftSize = 256;
    this.splitter.connect(this.inputMeter, 0);
    this.nodes = [this.source, this.splitter, this.inputMeter]; this.analysers = [];
    this.routes = this.routes.map(n => Math.min(n, this.channels - 1));
    this.routes.forEach((channel, i) => {
      const gain = this.context.createGain(); gain.gain.value = this.gains[i];
      const analyser = this.context.createAnalyser(); analyser.fftSize = 256;
      const monitor = this.context.createGain(); monitor.gain.value = 0;
      this.splitter.connect(gain, channel); gain.connect(analyser); analyser.connect(monitor); monitor.connect(this.bus);
      this.nodes.push(gain, analyser, monitor); this.analysers.push({ analyser, gain, monitor });
    });
    this.setMicLane(this.micLane);
    this.monitor = false; this.mixer?.enableMic(false); await this.refresh(); this.onChange();
  }
  route(index, channel) {
    if (!this.splitter || !Number.isInteger(index) || !this.analysers[index] || !Number.isInteger(channel) || channel < 0 || channel >= this.channels) return;
    this.splitter.disconnect(this.analysers[index].gain);
    this.splitter.connect(this.analysers[index].gain, channel); this.routes[index] = channel; this.onChange();
  }
  gain(index, value) {
    if (!Number.isFinite(value)) return;
    this.gains[index] = Math.max(0, Math.min(2, value));
    this.analysers[index]?.gain.gain.setTargetAtTime(this.gains[index], this.context.currentTime, 0.015);
  }
  setMonitor(value) {
    this.monitor = !!value;
    this.mixer?.enableMic(this.monitor && !!this.stream);
    this.analysers.forEach(n => n.monitor.gain.setTargetAtTime(this.monitor && !this.mixer ? 1 : 0, this.context.currentTime, 0.02));
    this.onChange();
  }
  async setOutput(id) {
    await this.ensure();
    if (!this.context.setSinkId) throw new Error('Output selection unsupported; choose output in system audio settings.');
    await this.context.setSinkId(id); this.outputId = id; this.onChange();
  }
  panic() {
    this.stopGarden();
    this.engineRevision++;
    this.stopTest();
    this.stopInput(); this.mixer?.panic(); this.masterLevel = 0;
    if (this.bus) { this.bus.gain.cancelScheduledValues(this.context.currentTime); this.bus.gain.setValueAtTime(0, this.context.currentTime); }
    this.onChange();
  }
  stopInput() {
    this.inputRevision++; this.mixer?.enableMic(false); this.mixer?.resetMic();
    this.stream?.getTracks().forEach(t => t.stop()); this.stream = null; this.monitor = false;
    this.nodes.forEach(n => { try { n.disconnect(); } catch {} });
    this.nodes = []; this.analysers = []; this.inputMeter = null; this.settings = null; this.onChange();
  }
  stopTest() {
    this.stopMidiInput();
    this.testRevision++;
    for (const n of this.testNodes) { try { n.stop?.(); } catch {} try { n.disconnect(); } catch {} }
    this.testNodes = [];
  }
  async testTone() {
    this.stopTest(); const revision = this.testRevision;
    const ctx = await this.ensure(); if (revision !== this.testRevision) return;
    const merger = ctx.createChannelMerger(2); merger.connect(this.bus); this.testNodes.push(merger);
    for (let channel = 0; channel < 2; channel++) {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.frequency.value = 440;
      const start = ctx.currentTime + .02 + channel * .5, end = start + .5;
      gain.gain.setValueAtTime(0, start); gain.gain.linearRampToValueAtTime(.1, start + .01);
      gain.gain.setValueAtTime(.1, end - .01); gain.gain.linearRampToValueAtTime(0, end);
      oscillator.connect(gain); gain.connect(merger, 0, channel);
      this.testNodes.push(oscillator, gain); oscillator.start(start); oscillator.stop(end);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); if (channel === 1 && revision === this.testRevision) { merger.disconnect(); this.testNodes = []; } };
    }
  }
  async off() {
    this.stopGarden();
    this.engineRevision++;
    this.stopTest(); this.stopInput(); this.mixer?.panic();
    if (this.context?.state === 'running') await this.context.suspend();
    this.onChange();
  }
}
