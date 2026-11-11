import { mountKlaisBank } from './bank.js';
const MAX_FILE_BYTES = 64 * 1024 * 1024;
const MAX_DECODED_BYTES = 128 * 1024 * 1024;
const MAX_VOICES = 16;

// Local audition only. This module never opens or sends to a MIDI output.
export function createSamplePlayer(context, destination) {
  const voices = new Map();
  const tails = new Set();
  const finish = (voice, immediate = false) => {
    if (!voice || voice.released) return;
    voice.released = true;
    const now = context.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + (immediate ? 0.005 : voice.release));
    try { voice.source.stop(now + (immediate ? 0.01 : voice.release + 0.01)); } catch { /* already ended */ }
    voices.delete(voice.id);
    tails.add(voice);
  };
  return {
    play(id, buffer, note, root, options = {}) {
      if (![note, root].every(Number.isInteger) || note < 0 || note > 127 || root < 0 || root > 127) return false;
      const gainValue = Number(options.gain ?? 0.2);
      const release = Number(options.release ?? 0.2);
      if (!buffer || !Number.isFinite(buffer.duration) || buffer.duration <= 0 || !Number.isFinite(gainValue) || gainValue < 0 || gainValue > 1 || !Number.isFinite(release) || release < 0.01 || release > 5) return false;
      const loopStart = Number(options.loopStart ?? 0);
      const loopEnd = Number(options.loopEnd ?? buffer.duration);
      if (options.loop && (!Number.isFinite(loopStart) || !Number.isFinite(loopEnd) || loopStart < 0 || loopEnd > buffer.duration || loopEnd - loopStart < 0.01)) return false;
      // Cut the old same-owner voice before retriggering; bound release tails too.
      const old = voices.get(id);
      if (old) finish(old, true);
      if (voices.size + tails.size >= MAX_VOICES) return false;
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.value = 2 ** ((note - root) / 12);
      source.loop = Boolean(options.loop);
      if (source.loop) { source.loopStart = loopStart; source.loopEnd = loopEnd; }
      const now = context.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(gainValue, now + 0.01);
      source.connect(gain); gain.connect(destination);
      const voice = { id, source, gain, release, released: false };
      source.onended = () => {
        if (voices.get(id) === voice) voices.delete(id);
        tails.delete(voice);
        source.disconnect(); gain.disconnect();
      };
      voices.set(id, voice);
      source.start(now);
      // Every audition has a finite lifetime, even when loop is enabled or note-off is lost.
      source.stop(now + 30);
      return true;
    },
    release(id) { finish(voices.get(id)); },
    stop() {
      for (const voice of [...voices.values()]) finish(voice, true);
      for (const voice of tails) {
        const now = context.currentTime;
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
        voice.gain.gain.linearRampToValueAtTime(0, now + 0.005);
        try { voice.source.stop(now + 0.01); } catch { /* already ended */ }
      }
    },
    get activeCount() { return voices.size + tails.size; }
  };
}

export function mountFileSampler(container, { getAudioContext, getDestination, notify = () => {} }) {
  container.innerHTML = `<div class="panel-body"><p class="muted">Local sample audition · root pitches and loops UNVERIFIED. Files stay on this device. WAV / OGG / AIFF support depends on your browser.</p><div class="toolbar"><label class="field">Choose audio files<input data-files type="file" accept=".wav,.ogg,.aif,.aiff,audio/wav,audio/ogg,audio/aiff" multiple></label></div><div class="toolbar"><label class="field">Sample<select data-select aria-label="Selected sample"></select></label><button data-decode>Decode selected</button><button data-clear>Unload files</button></div><div class="toolbar"><label class="field">Root MIDI (explicit)<input data-root type="number" min="0" max="127" step="1" value="60"></label><label class="field">Gain<input data-gain type="number" min="0" max="1" step="0.05" value="0.2"></label><label class="field">Release seconds<input data-release type="number" min="0.01" max="5" step="0.05" value="0.2"></label></div><div class="toolbar"><label class="field"><input data-loop type="checkbox">Loop (unverified)</label><label class="field">Start seconds<input data-start type="number" min="0" step="0.01" value="0"></label><label class="field">End seconds<input data-end type="number" min="0" step="0.01" value="1"></label><button data-stop>Stop all</button></div><p data-status class="status" role="status">No sample decoded. Maximum 64 MiB per file, one decoded sample, 16 voices, 30-second note limit.</p><div data-keys class="toolbar" aria-label="Sample audition keyboard"></div><p class="muted">Hold a note to audition. Selected MIDI input can play this sampler after decoding; it never forwards MIDI to hardware.</p></div>`;
  const q = name => container.querySelector(`[data-${name}]`);
  const midiLabel = document.createElement('label'); midiLabel.className = 'field checkbox';
  const midiEnabled = document.createElement('input'); midiEnabled.type = 'checkbox';
  midiLabel.append(midiEnabled, document.createTextNode('Route selected MIDI input to this sampler'));
  q('keys').before(midiLabel);
  let files = [], selected = 0, buffer = null, player = null, context = null;
  let disposed = false, decodeBusy = false, revision = 0;
  const pending = new Map();
  const status = message => { if (!disposed) q('status').textContent = message; };
  function stop() { pending.clear(); player?.stop(); }
  midiEnabled.addEventListener('change', () => { if (!midiEnabled.checked) stop(); });
  function invalidate() { revision++; stop(); buffer = null; }
  q('files').addEventListener('change', () => {
    invalidate();
    files = Array.from(q('files').files).slice(0, 128).map(file => ({ file, root: 60 }));
    selected = 0;
    q('select').replaceChildren(...files.map(({file}, i) => { const o = document.createElement('option'); o.value = String(i); o.textContent = file.name; return o; }));
    q('root').value = '60';
    status(`${files.length} local files selected. Decode one sample to audition. Root MIDI 60 is an unverified starting value; set the actual root.`);
  });
  q('select').addEventListener('change', () => {
    invalidate(); selected = Number(q('select').value);
    q('root').value = String(files[selected]?.root ?? 60);
    status('Selection changed. Decode selected sample.');
  });
  q('root').addEventListener('change', () => { stop(); if (files[selected]) files[selected].root = Number(q('root').value); });
  q('decode').addEventListener('click', async () => {
    const entry = files[selected];
    if (!entry || disposed || decodeBusy) return;
    if (entry.file.size > MAX_FILE_BYTES) { status('File exceeds 64 MiB. Choose a smaller sample.'); return; }
    invalidate(); const mine = revision;
    decodeBusy = true; q('decode').disabled = true; status('Decoding one local sample…');
    try {
      context = await getAudioContext();
      if (!context || disposed || mine !== revision) return;
      await context.resume();
      const bytes = await entry.file.arrayBuffer();
      if (disposed || mine !== revision) return;
      const decoded = await context.decodeAudioData(bytes);
      if (disposed || mine !== revision) return;
      if (decoded.length * decoded.numberOfChannels * 4 > MAX_DECODED_BYTES) throw new Error('Decoded sample exceeds 128 MiB budget.');
      buffer = decoded;
      player = createSamplePlayer(context, getDestination(context));
      q('end').value = String(Math.floor(decoded.duration * 1000) / 1000);
      status(`${entry.file.name} · ${decoded.duration.toFixed(2)} s · ${decoded.numberOfChannels} channels · ${decoded.sampleRate} Hz · root/loops UNVERIFIED`);
    } catch (error) { status(`Cannot decode: ${error.message}`); notify(`Sampler: ${error.message}`); }
    finally { decodeBusy = false; if (!disposed) q('decode').disabled = false; }
  });
  const noteOn = async (id, note, velocity = 100) => {
    if (!buffer || !player || disposed || document.hidden) return;
    const mine = revision;
    const request = Symbol(id);
    pending.set(id, request);
    try {
      await context.resume();
      if (pending.get(id) !== request || mine !== revision || disposed) return;
      pending.delete(id);
      const ok = player.play(id, buffer, note, Number(q('root').value), { gain: Number(q('gain').value) * velocity / 127, release: Number(q('release').value), loop: q('loop').checked, loopStart: Number(q('start').value), loopEnd: Number(q('end').value) });
      if (!ok) status('Audition rejected: check root, loop, gain/release or voice limit.');
    } catch (error) { if (pending.get(id) === request) pending.delete(id); status(`Audio unavailable: ${error.message}`); }
  };
  const noteOff = id => { pending.delete(id); player?.release(id); };
  for (let note = 48; note <= 72; note++) {
    const key = document.createElement('button');
    key.type = 'button'; key.textContent = String(note); key.setAttribute('aria-label', `Audition MIDI ${note}`);
    key.addEventListener('pointerdown', event => { event.preventDefault(); key.setPointerCapture(event.pointerId); noteOn(`pointer:${event.pointerId}`, note); });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) key.addEventListener(type, event => noteOff(`pointer:${event.pointerId}`));
    key.addEventListener('keydown', event => { if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); noteOn(`key:${note}`, note); } });
    key.addEventListener('keyup', event => { if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); noteOff(`key:${note}`); } });
    key.addEventListener('blur', () => noteOff(`key:${note}`));
    q('keys').append(key);
  }
  q('stop').addEventListener('click', stop);
  q('clear').addEventListener('click', () => { invalidate(); files = []; q('files').value = ''; q('select').replaceChildren(); status('Files unloaded.'); });
  const visibility = () => { if (document.hidden) stop(); };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('blur', stop);
  return {
    stop,
    midi(bytes) {
      if (!midiEnabled.checked) return;
      if (!bytes || bytes.length < 3 || !Array.from(bytes).every(v => Number.isInteger(v) && v >= 0 && v <= 255)) return;
      const [statusByte, note, velocity] = bytes;
      if (note > 127 || velocity > 127) return;
      const kind = statusByte & 0xf0, id = `midi:${statusByte & 15}:${note}`;
      if (kind === 0x90 && velocity) noteOn(id, note, velocity);
      else if (kind === 0x80 || (kind === 0x90 && !velocity)) noteOff(id);
      else if (kind === 0xb0 && (note === 120 || note === 123)) stop();
    },
    dispose() { if (disposed) return; invalidate(); disposed = true; files = []; document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', stop); container.replaceChildren(); }
  };
}

export function mountSampler(container, options) {
  const libraryRoot = document.createElement('section');
  const lab = document.createElement('details'); lab.className = 'file-lab';
  const summary = document.createElement('summary'); summary.textContent = 'SINGLE-FILE LAB · MIDI routes here while open';
  const filesRoot = document.createElement('section'); lab.append(summary, filesRoot);
  container.replaceChildren(libraryRoot, lab);
  const bank = mountKlaisBank(libraryRoot, options), files = mountFileSampler(filesRoot, options);
  lab.addEventListener('toggle', () => { bank.stop(); files.stop(); });
  return { stop() { bank.stop(); files.stop(); }, midi(bytes) { if (lab.open) files.midi(bytes); else bank.midi(bytes); }, dispose() { bank.dispose(); files.dispose(); container.replaceChildren(); } };
}
