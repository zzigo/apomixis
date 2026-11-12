import { MIXER_DEFAULTS } from '../../../packages/hylon-audio/mixer.js';
import './mixer.css';
const control = (key, label, min = 0, max = 1, step = .01, value = MIXER_DEFAULTS[key]) => `<label class="mix-fader" title="${label}"><span>${({samplerLevel:"LEVEL",samplerReverb:"REV",samplerDelay:"DLY",micLevel:"LEVEL",micReverb:"REV",micDelay:"DLY",reverbLevel:"LEVEL",delayLevel:"LEVEL",delayTime:"TIME",delayFeedback:"FDBK",master:"LEVEL",vocoderMix:"MIX",carrierHz:"HZ",chopRate:"HZ",chopDepth:"DEPTH"})[key]||label}</span><input type="range" data-mix="${key}" aria-label="${label}" min="${min}" max="${max}" step="${step}" value="${value}"><output data-value="${key}">${value}</output></label>`;
const meter = name => `<div class="mix-meters" role="meter" aria-label="${name} stereo peak" aria-valuemin="-60" aria-valuemax="0" aria-valuenow="-60" data-level="${name}"><i><b></b></i><i><b></b></i></div><output class="mix-db" data-db="${name}">−∞ dBFS</output>`;
export function mountMixer(container, { audio, notify = () => {}, toggleAudio = () => audio.ensure() }) {
  container.innerHTML = `<div class="panel-body mixer-pod"><div class="eyebrow">AUDIO</div><div class="toolbar"><button data-enable-audio class="primary" title="Audio engine and mic input on/off">AUDIO ON</button><button data-mic-on>ENABLE MIC FX</button><button data-mic-off class="danger">MUTE MIC</button><button data-clear-fx>CLEAR FX TAILS</button></div><p data-mix-status class="status">Audio not started · mic muted</p><div class="mix-strips">
  <section class="mix-strip"><h3>SAMPLER</h3>${meter('sampler')}<div class="mix-faders">${control('samplerLevel', 'Sampler level')}${control('samplerReverb', 'Sampler reverb')}${control('samplerDelay', 'Sampler delay')}</div><p>Fixed stereo input / post-fader sends</p></section>
  <section class="mix-strip"><h3>MIC</h3>${meter('mic')}<div class="mix-faders">${control('micLevel', 'Mic level')}${control('micReverb', 'Mic reverb')}${control('micDelay', 'Mic delay')}</div><label class="field">Process input<select data-mic-lane><option value="0">A</option><option value="1">B</option></select></label></section>
  <section class="mix-strip"><h3>REVERB</h3>${meter('reverb')}<div class="mix-faders">${control('reverbLevel', 'Reverb return')}</div><p>Shared stereo convolution / 2.4 s</p></section>
  <section class="mix-strip"><h3>DELAY</h3>${meter('delay')}<div class="mix-faders">${control('delayLevel', 'Delay return')}${control('delayTime', 'Delay seconds', .02, 1.5)}${control('delayFeedback', 'Delay feedback', 0, .8)}</div></section>
  <section class="mix-strip mix-master"><h3>MASTER</h3>${meter('master')}<div class="mix-faders">${control('master', 'Master level', 0, 1, .01, audio.masterLevel)}</div><p>Shared with I/O master</p></section></div>
  <div class="mix-processors"><section class="mix-strip"><h3>VOCODER</h3><label class="field">Carrier<select data-carrier><option value="internal">Internal saw / tunable</option><option value="sampler">Sampler / before channel fader</option></select></label><div class="mix-faders">${control('vocoderMix', 'Vocoder blend')}${control('carrierHz', 'Carrier Hz', 50, 1000, .01)}</div><p>Mic modulates carrier. Sampler carrier needs sounding samples.</p></section><section class="mix-strip"><h3>CHOPPER</h3><div class="mix-faders">${control('chopRate', 'Chopper Hz', .25, 32, .25)}${control('chopDepth', 'Chopper depth')}</div><p>Soft pulse / after vocoder / before sends</p></section></div>
  <p class="muted">Mic starts muted. Enable it deliberately; use headphones to avoid speaker feedback. Choose devices in I/O. Meter bars show current stereo peaks in dBFS; red indicates ≥ −1 dBFS. Mixer settings apply to this session.</p></div>`;
  // Put thin stereo meters beside the channel faders, as an actual channel strip.
  container.querySelectorAll('.mix-strips > .mix-strip').forEach(strip => {
    const row = document.createElement('div'); row.className = 'mix-channel-row';
    row.append(strip.querySelector('.mix-faders'), strip.querySelector('.mix-meters')); strip.querySelector('h3').after(row);
  });
  const q = selector => container.querySelector(selector);
  let disposed = false, visible = false, frame = 0, last = 0, pendingMic = 0;
  const buffers = new Map();
  const handle = fn => async (...args) => { try { await fn(...args); } catch (error) { notify(error.message); q('[data-mix-status]').textContent = error.message; } };
  function sync() {
    if (disposed) return;
    q('[data-enable-audio]').textContent = audio.context?.state === 'running' ? 'AUDIO OFF' : 'AUDIO ON';
    q('[data-mix-status]').textContent = `Audio ${audio.context?.state || 'not started'} · mic ${audio.stream ? audio.monitor ? 'FX ACTIVE' : 'muted' : 'stopped'} · shared stereo sampler → master`;
    q('[data-mic-lane]').value = String(audio.micLane);
    const input = q('[data-mix="master"]'); input.value = audio.masterLevel; q('[data-value="master"]').value = audio.masterLevel.toFixed(2);
  }
  q('[data-enable-audio]').onclick = handle(toggleAudio);
  q('[data-mic-on]').onclick = handle(async () => { const revision = ++pendingMic; if (!audio.stream) await audio.start(audio.inputId); else await audio.ensure(); if (!disposed && revision === pendingMic && audio.stream) audio.setMonitor(true); });
  q('[data-mic-off]').onclick = () => { pendingMic++; audio.setMonitor(false); };
  q('[data-clear-fx]').onclick = () => { audio.mixer?.panic(); audio.setMonitor(false); notify('Effect tails cleared · mic muted. Sampler channel remains available.'); };
  q('[data-mic-lane]').onchange = event => audio.setMicLane(Number(event.target.value));
  q('[data-carrier]').onchange = handle(async event => { const value = event.target.value; await audio.ensure(); audio.mixer.set('carrier', value); });
  container.querySelectorAll('[data-mix]').forEach(input => {
    let revision = 0;
    input.oninput = handle(async () => {
      const ownRevision = ++revision, key = input.dataset.mix, value = Number(input.value);
      q(`[data-value="${key}"]`).value = value.toFixed(key === 'carrierHz' ? 0 : 2);
      if (key === 'master') { audio.setMasterGain(value); return; }
      await audio.ensure(); if (disposed || ownRevision !== revision) return; audio.mixer.set(key, value);
    });
  });
  function draw(now) {
    if (!visible || disposed || document.hidden) { frame = 0; return; }
    if (now - last > 50) {
      last = now;
      for (const name of ['sampler', 'mic', 'reverb', 'delay', 'master']) {
        const peaks = (audio.mixer?.meters[name] || []).map(analyser => {
          if (!buffers.has(analyser)) buffers.set(analyser, new Float32Array(analyser.fftSize));
          const data = buffers.get(analyser); analyser.getFloatTimeDomainData(data); let peak = 0;
          for (const sample of data) peak = Math.max(peak, Math.abs(sample)); return peak;
        });
        const db = Math.max(...peaks, 0) > .001 ? 20 * Math.log10(Math.max(...peaks)) : -Infinity;
        const element = q(`[data-level="${name}"]`); element.setAttribute('aria-valuenow', String(Number.isFinite(db) ? Math.max(-60, Math.min(0, db)) : -60));
        element.querySelectorAll('b').forEach((bar, i) => { const p = peaks[i] || 0; bar.style.height = `${Math.max(0, Math.min(1, (20 * Math.log10(Math.max(.001, p)) + 60) / 60)) * 100}%`; bar.classList.toggle('clip', p >= .891); });
        element.title = `${name.toUpperCase()} · ${Number.isFinite(db) ? db.toFixed(1) + ' dBFS' : '−∞ dBFS'}`;
        q(`[data-db="${name}"]`).value = Number.isFinite(db) ? `${db.toFixed(1)} dBFS` : '−∞ dBFS';
      }
    }
    frame = requestAnimationFrame(draw);
  }
  function setVisible(value) { visible = value; cancelAnimationFrame(frame); frame = 0; if (visible && !document.hidden) frame = requestAnimationFrame(draw); }
  const visibility = () => setVisible(visible);
  document.addEventListener('visibilitychange', visibility); sync();
  return { sync, setVisible, cancelPendingMic() { pendingMic++; }, dispose() { disposed = true; pendingMic++; cancelAnimationFrame(frame); document.removeEventListener('visibilitychange', visibility); buffers.clear(); container.replaceChildren(); } };
}
