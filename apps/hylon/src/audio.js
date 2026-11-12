export class AudioSystem {
  constructor(onChange = () => {}, { createMixer = null } = {}) {
    this.onChange = onChange; this.context = null; this.stream = null;
    this.devices = []; this.inputId = ''; this.outputId = ''; this.routes = [0, 1];
    this.gains = [1, 1]; this.monitor = false; this.bus = null; this.nodes = []; this.analysers = [];
    this.inputRevision = 0; this.createMixer = createMixer; this.mixer = null; this.micLane = 0; this.masterLevel = .3;
    this.testNodes = []; this.testRevision = 0; this.engineRevision = 0; this.inputMeter = null; this.outputMeter = null;
  }
  async ensure() {
    const revision = this.engineRevision;
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.bus = this.context.createGain(); this.bus.gain.value = this.masterLevel;
      this.outputMeter = this.context.createAnalyser(); this.outputMeter.fftSize = 256;
      this.bus.connect(this.outputMeter); this.outputMeter.connect(this.context.destination);
      if (this.createMixer) this.mixer = this.createMixer(this.context, this.bus);
      if (this.outputId && this.context.setSinkId) await this.context.setSinkId(this.outputId);
    }
    if (revision !== this.engineRevision) throw new Error('Audio start cancelled');
    if (this.context.state !== 'running') await this.context.resume();
    if (revision !== this.engineRevision) throw new Error('Audio start cancelled');
    this.onChange(); return this.context;
  }
  destination() { return this.mixer?.samplerInput || this.bus; }
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
    this.engineRevision++;
    this.stopTest();
    this.stopInput(); this.mixer?.panic(); this.masterLevel = 0;
    if (this.bus) { this.bus.gain.cancelScheduledValues(this.context.currentTime); this.bus.gain.setValueAtTime(0, this.context.currentTime); }
    this.onChange();
  }
  stopInput() {
    this.inputRevision++; this.mixer?.enableMic(false);
    this.stream?.getTracks().forEach(t => t.stop()); this.stream = null; this.monitor = false;
    this.nodes.forEach(n => { try { n.disconnect(); } catch {} });
    this.nodes = []; this.analysers = []; this.inputMeter = null; this.settings = null; this.onChange();
  }
  stopTest() {
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
    this.engineRevision++;
    this.stopTest(); this.stopInput(); this.mixer?.panic();
    if (this.context?.state === 'running') await this.context.suspend();
    this.onChange();
  }
}
