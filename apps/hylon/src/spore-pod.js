import scoreText from '../../../scores/apomixis/spore/0.1.0-draft.1/score.txt?raw';
import { compileSporeText } from '../../../packages/spore/text-score.js';
import { CATALOG } from '../../../packages/spore/catalog.js';
import { createSporeGenerator } from '../../../packages/spore/engine.js';
import { createSporeAudition } from '../../../packages/spore/audition.js';
import { createGeneratorTransport } from '../../../packages/hylon-runtime/transport.js';
import { createSporeRenderer } from './spore-renderer.js';
import './spore.css';
const formatTime = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${(t % 60).toFixed(1).padStart(4, '0')}`;
const SAVE_KEY = 'hylon-spore-score-text-v1';
export function mountSpore(container, { audio, notify = () => {} } = {}) {
  container.innerHTML = `<div class="panel-body spore-pod" tabindex="0"><div class="spore-heading"><h1>SPORE</h1><span class="eyebrow">APOMIXIS / 01 / GENERATOR</span><span class="badge">LOCAL DRAFT / NOT PUBLIC LIVE</span></div>
    <div class="spore-controls"><button data-play class="primary">PLAY</button><button data-pause>STOP / HOLD</button><button data-reset>RESET</button><label class="field">Speed<select data-speed>${[1, 2, 4, 8, 16].map(n => `<option>${n}</option>`).join('')}</select></label><label class="field">Seed<input data-seed type="number" min="0" max="4294967295" value="1931"></label><button data-reseed>APPLY SEED</button><label class="field">Texture<select data-texture><option value="auto">Score</option>${Object.keys(CATALOG.TEX).map(name => `<option>${name}</option>`).join('')}</select></label><label class="field checkbox"><input data-sat type="checkbox" checked>Polyembryony</label><label class="field checkbox"><input data-audition type="checkbox">LOCAL AUDIO / additive study</label></div>
    <div class="spore-controls"><label class="field">Harmonicity<select data-harm-source><option value="score">Score curve</option><option value="manual">Manual</option></select></label><input data-harm type="range" min="0" max="16" step="0.01" value="0" aria-label="SPORE harmonicity"><output data-harm-label>m2</output><label class="field">Seek / seconds<input data-seek type="number" min="0" max="300" step="0.1" value="0"></label><button data-seek-button>SEEK / PAUSE</button><button data-export-score>EXPORT SCORE TXT</button><button data-export-session>EXPORT SESSION JSON</button></div>
    <p data-status class="status">Compiling bundled score…</p><div data-metrics class="spore-metrics"></div>
    <details class="spore-editor"><summary>SCORE TXT / VOICE BINDINGS / COUPLINGS</summary><p class="muted">Edit declarative text. APPLY validates then replaces the active score with playback stopped. Saved drafts never auto-play or arm devices.</p><textarea data-editor maxlength="65536" aria-label="SPORE score text" spellcheck="false"></textarea><div class="toolbar"><button data-apply class="primary">APPLY SCORE TXT</button><button data-original>RESTORE BUNDLED TEXT</button><label class="file-button">IMPORT TXT<input data-import-text type="file" accept=".txt,text/plain"></label><button data-export-editor>EXPORT EDITOR TXT</button></div><p data-score-status class="status spore-score-status"></p></details>
    <div class="spore-grid">${[['macro', 'MACRO / FORM & ENTROPY'], ['meso', 'MESO / SUBSTRATE & LINEAGES'], ['morph', 'MORPHOLOGY / LOGICAL STOPS & COUPLINGS'], ['micro', 'MICRO / GENERATED NOTE INTENT'], ['harm', 'HARMONICITY / EMBRYO MODES']].map(([id, title]) => `<section class="spore-figure spore-${id}" data-pod="${id}"><h3>${title}</h3><canvas data-spore-id="c${id[0].toUpperCase() + id.slice(1)}" role="img" aria-label="SPORE ${id} visualization"></canvas></section>`).join('')}<section class="spore-figure spore-side" data-pod="side"><h3>GENOME / TRANSLATION</h3><pre data-spore-id="trans"></pre><pre data-spore-id="geno"></pre></section></div>
    <p class="muted">Additive study uses the shared AUDIO sampler channel, reverb and delay. It preserves the sketch's explicit +12 audition octave; it is not the GLIP samples or physical organ. Voice bindings and couplings are logical score intent. Generated note graphics include intent that may be dropped by audition limits. No MIDI/USB output. Focus this pod for Space, 1–9 and arrow shortcuts.</p></div>`;
  const q = key => container.querySelector(`[data-${key}]`);
  let activeText = scoreText, score, generator, transport, renderer, audition, disposed = false, visible = false, active = 'harm', drawFrame = 0, lastDraw = 0, revision = 0, compiling = 0, drag = null;
  const status = text => { if (!disposed) q('status').textContent = text; };
  const handle = fn => async (...args) => { try { await fn(...args); } catch (error) { status(error.message); notify(`SPORE: ${error.message}`); } };
  q('editor').value = scoreText;
  try { const draft = localStorage.getItem(SAVE_KEY); if (draft && draft.length <= 65536) q('editor').value = draft; } catch {}
  function pause(reason = 'paused') { revision++; transport?.pause(reason); audition?.stop(); q('play').textContent = 'PLAY'; }
  function configure() {
    if (!generator) return;
    generator.configure({ texture: q('texture').value, polyembryony: q('sat').checked, harmonicity: q('harm-source').value === 'score' ? null : Number(q('harm').value) });
  }
  function connectScore(nextScore, text = scoreText) {
    activeText = text;
    pause('score-change'); transport?.dispose(); audition?.dispose(); audition = null;
    score = nextScore; generator = createSporeGenerator(score); renderer = createSporeRenderer(container, score);
    q('seed').value = score.seed; q('texture').value = 'auto'; q('sat').checked = true; q('harm-source').value = 'score'; q('harm').value = 0;
    transport = createGeneratorTransport({ generator, durationMs: score.duration * 1000,
      onEvent(event, timing) { if (q('audition').checked) audition?.dispatch(event, timing); },
      onStop(reason) { audition?.stop(); q('play').textContent = 'PLAY'; status(`Paused / ${reason} · no hardware output`); }
    });
    transport.setSpeed(Number(q('speed').value));
    q('score-status').textContent = `ACTIVE ${score.scoreId} / ${score.scoreVersion} / ${score.contentHash}`;
    status('Ready / compiled TXT score · preview stopped · optional local additive audio'); notify('SPORE TXT score applied · playback stopped.');
  }
  async function applyText(text) {
    const mine = ++compiling; const next = await compileSporeText(text); if (disposed || mine !== compiling) return;
    connectScore(next, text); try { localStorage.setItem(SAVE_KEY, text); } catch { notify('SPORE draft could not be saved locally. Export TXT.'); }
  }
  q('apply').onclick = handle(() => applyText(q('editor').value));
  q('editor').oninput = () => { compiling++; q('score-status').textContent = 'UNAPPLIED TEXT / active score is unchanged'; try { if (q('editor').value.length <= 65536) localStorage.setItem(SAVE_KEY, q('editor').value); } catch {} };
  q('original').onclick = () => { q('editor').value = scoreText; q('score-status').textContent = 'Bundled text restored to editor; APPLY to replace active score.'; };
  q('play').onclick = handle(async () => {
    if (!transport) throw new Error('Apply a valid score first.'); if (transport.view().running) { pause(); return; }
    const mine = ++revision;
    if (q('audition').checked) { const context = await audio.ensure(); if (disposed || mine !== revision) return; audition ||= createSporeAudition(context, audio.destination(), score); transport.setClock(() => context.currentTime); }
    else transport.setClock(() => performance.now() / 1000);
    if (mine !== revision) return; transport.play(); q('play').textContent = 'PAUSE'; status(q('audition').checked ? 'Playing / additive study → AUDIO sampler stereo bus' : 'Playing / visual score simulation only');
  });
  q('pause').onclick = () => pause(); q('reset').onclick = () => { pause('reset'); transport?.reset(); };
  q('reseed').onclick = handle(() => { if (!q('seed').value.trim()) throw new Error('Enter a uint32 seed'); const seed = Number(q('seed').value); pause('seed-change'); transport?.reset(seed); });
  q('speed').onchange = handle(() => { transport?.setSpeed(Number(q('speed').value)); q('play').textContent = transport?.view().running ? 'PAUSE' : 'PLAY'; });
  q('audition').onchange = () => pause('audio-route-change');
  for (const key of ['texture', 'sat', 'harm-source', 'harm']) q(key).addEventListener('input', handle(configure));
  q('seek-button').onclick = handle(() => { pause('seek'); transport?.seek(Number(q('seek').value) * 1000); });
  function download(name, text, type) { const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  q('export-score').onclick = () => download('SPORE.score.txt', activeText, 'text/plain');
  q('export-editor').onclick = () => download('SPORE.editor-draft.txt', q('editor').value, 'text/plain');
  q('import-text').onchange = handle(async event => {
    const file = event.target.files?.[0]; if (!file) return; const mine = ++compiling;
    try { if (file.size > 65536) throw new Error('SPORE TXT exceeds 64 KiB'); const text = await file.text(); if (disposed || mine !== compiling) return; q('editor').value = text; q('editor').oninput(); }
    finally { event.target.value = ''; }
  });
  q('export-session').onclick = handle(() => { if (!generator) throw new Error('No active score'); download('SPORE.session.json', JSON.stringify({ kind: 'spore-local-draft-session', schemaVersion: 1, publicLive: false, scoreHash: score.contentHash, snapshot: generator.snapshot(), transport: transport.view(), audio: q('audition').checked ? 'additive-study' : 'none', audition: audition?.stats() || null, generatedIntent: generator.view().allEvents, hist: generator.view().hist, mutations: generator.view().mutations }, null, 2), 'application/json'); });
  function setActive(name) { active = name; container.querySelectorAll('[data-pod]').forEach(element => element.classList.toggle('active', element.dataset.pod === active)); }
  container.querySelectorAll('[data-pod]').forEach(element => element.addEventListener('pointerdown', () => { setActive(element.dataset.pod); container.querySelector('.spore-pod').focus({ preventScroll: true }); }));
  function setHarm(value) { q('harm-source').value = 'manual'; q('harm').value = Math.max(0, Math.min(16, value)); configure(); }
  const harmonicityCanvas = container.querySelector('[data-spore-id="cHarm"]');
  harmonicityCanvas.onpointerdown = event => { drag = { y: event.clientY, value: Number(q('harm').value) }; harmonicityCanvas.setPointerCapture(event.pointerId); };
  harmonicityCanvas.onpointermove = event => { if (drag) { const value = drag.value + (drag.y - event.clientY) * .04; setHarm(value); } };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) harmonicityCanvas.addEventListener(name, () => { drag = null; });
  harmonicityCanvas.addEventListener('wheel', event => { event.preventDefault(); setHarm(Number(q('harm').value) + (event.deltaY > 0 ? -.25 : .25)); }, { passive: false });
  container.querySelector('[data-spore-id="cMacro"]').onclick = handle(event => { if (!transport) return; const rect = event.target.getBoundingClientRect(); pause('seek'); transport.seek(Math.max(0, Math.min(300000, (event.clientX - rect.left - 8) / (rect.width - 16) * 300000))); });
  const keydown = event => {
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(event.target.tagName) || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.code === 'Space') { event.preventDefault(); q('play').click(); return; }
    const digit = /^(?:Digit|Numpad)(\d)$/.exec(event.code)?.[1];
    if (active === 'macro' && digit >= 1 && digit <= 5) { pause('section-seek'); transport?.seek(score.sections[Number(digit) - 1].start * 1000); }
    else if (active === 'micro' && digit !== undefined && Number(digit) <= 4) { q('texture').value = ['auto', 'tutti', 'striated', 'hocket', 'granulation'][Number(digit)]; configure(); }
    else if (active === 'harm') {
      if (digit === '0') { q('sat').checked = !q('sat').checked; configure(); }
      else if (digit) { const mode = (event.shiftKey ? CATALOG.BANK2 : CATALOG.BANK1)[Number(digit) - 1]; if (mode) setHarm(CATALOG.MODES.findIndex(m => m.key === mode)); }
      else if (['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); setHarm(Math.round(Number(q('harm').value)) + (event.key === 'ArrowRight' ? 1 : -1)); }
    }
  };
  container.addEventListener('keydown', keydown); setActive('harm');
  const tick = setInterval(() => { if (!transport) return; if (transport.view().running && q('audition').checked && audio.context?.state !== 'running') { pause('audio-suspended'); return; } transport.tick(); }, 25);
  function draw(now) {
    if (disposed || !visible || document.hidden) { drawFrame = 0; return; }
    if (generator && now - lastDraw > 80) {
      lastDraw = now; const state = generator.view(), view = transport.view(), t = view.positionMs / 1000;
      renderer.render(state, t, generator.options);
      q('metrics').textContent = `T ${formatTime(t)} / 05:00 · GEN ${state.gen} · POP ${state.pop} · GENOTYPES ${state.geno} · H ${state.H.toFixed(2)} bit · DROPPED ${view.dropped + (audition?.stats().dropped || 0)}`;
      if (generator.options.harmonicity === null) { const curve = score.harmonicityCurve; let value = curve.at(-1)[1]; for (let i = 0; i < curve.length - 1; i++) if (t >= curve[i][0] && t < curve[i + 1][0]) { value = curve[i][1] + (curve[i + 1][1] - curve[i][1]) * (t - curve[i][0]) / (curve[i + 1][0] - curve[i][0]); break; } q('harm').value = value; }
      q('harm-label').textContent = CATALOG.MODES[Math.round(Number(q('harm').value))].label;
    }
    drawFrame = requestAnimationFrame(draw);
  }
  function setVisible(value) { visible = value; cancelAnimationFrame(drawFrame); if (visible && !document.hidden) drawFrame = requestAnimationFrame(draw); }
  const visibility = () => { if (document.hidden) pause('page-hidden'); setVisible(visible); }; document.addEventListener('visibilitychange', visibility);
  handle(async () => { const bundled = await compileSporeText(scoreText); if (!disposed && !score) { connectScore(bundled); if (q('editor').value !== scoreText) q('score-status').textContent += ' · saved text draft is UNAPPLIED'; } })();
  return { pause, setVisible, dispose() { if (disposed) return; pause('disposed'); disposed = true; compiling++; clearInterval(tick); cancelAnimationFrame(drawFrame); audition?.dispose(); transport?.dispose(); generator?.dispose(); document.removeEventListener('visibilitychange', visibility); container.removeEventListener('keydown', keydown); container.replaceChildren(); } };
}
