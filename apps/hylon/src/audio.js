export class AudioSystem {
  constructor(onChange = () => {}) {
    this.onChange = onChange; this.context = null; this.stream = null;
    this.devices = []; this.inputId = ''; this.outputId = ''; this.routes = [0, 1];
    this.gains = [1, 1]; this.monitor = false; this.bus = null; this.nodes = []; this.analysers = [];
    this.inputRevision = 0;
  }
  async ensure() {
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: 'interactive' });
      this.bus = this.context.createGain(); this.bus.gain.value = 0.3;
      this.bus.connect(this.context.destination);
    }
    if (this.context.state !== 'running') await this.context.resume();
    this.onChange(); return this.context;
  }
  destination() { return this.bus; }
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
    this.nodes = [this.source, this.splitter]; this.analysers = [];
    this.routes = this.routes.map(n => Math.min(n, this.channels - 1));
    this.routes.forEach((channel, i) => {
      const gain = this.context.createGain(); gain.gain.value = this.gains[i];
      const analyser = this.context.createAnalyser(); analyser.fftSize = 256;
      const monitor = this.context.createGain(); monitor.gain.value = 0;
      this.splitter.connect(gain, channel); gain.connect(analyser); analyser.connect(monitor); monitor.connect(this.bus);
      this.nodes.push(gain, analyser, monitor); this.analysers.push({ analyser, gain, monitor });
    });
    this.monitor = false; await this.refresh(); this.onChange();
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
    this.analysers.forEach(n => n.monitor.gain.setTargetAtTime(this.monitor ? 1 : 0, this.context.currentTime, 0.02));
    this.onChange();
  }
  async setOutput(id) {
    await this.ensure();
    if (!this.context.setSinkId) throw new Error('Output selection unsupported; choose output in system audio settings.');
    await this.context.setSinkId(id); this.outputId = id; this.onChange();
  }
  stopInput() {
    this.inputRevision++;
    this.stream?.getTracks().forEach(t => t.stop()); this.stream = null; this.monitor = false;
    this.nodes.forEach(n => { try { n.disconnect(); } catch {} });
    this.nodes = []; this.analysers = []; this.settings = null; this.onChange();
  }
}
