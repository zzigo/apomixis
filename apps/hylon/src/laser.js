// Screen geometry only: no WebUSB, DAC connection or physical emission API.
export function mountLaser(container, { notify = () => {} } = {}) {
  container.innerHTML = `<div class="panel-body"><p class="status">PREVIEW ONLY · screen geometry · no laser hardware connection</p><div class="toolbar"><label class="field">Pattern<select data-pattern><option value="phyllotaxis">Phyllotaxis</option><option value="line">Continuous line</option></select></label><label class="field">Points<input data-points type="range" min="16" max="512" step="1" value="160"></label><label class="field">Motion<input data-speed type="range" min="0" max="1" step="0.01" value="0.2"></label><button data-start>Start preview</button><button data-blackout>Blackout</button></div><canvas data-canvas width="720" height="420" aria-label="Laser geometry screen preview" role="img" style="display:block;width:100%;max-height:420px;background:#000;aspect-ratio:12/7"></canvas><p class="muted">This preview is not calibrated or validated for a projector. Blackout only clears this screen. No USB permissions or physical output are available.</p></div>`;
  const q = name => container.querySelector(`[data-${name}]`);
  const canvas = q('canvas'), context = canvas.getContext('2d');
  let frame = 0, running = false, disposed = false, origin = null;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const clear = () => { if (context) { context.fillStyle = '#000'; context.fillRect(0, 0, canvas.width, canvas.height); } };
  function stop() { running = false; cancelAnimationFrame(frame); frame = 0; origin = null; clear(); }
  function draw(time = 0) {
    if (!running || disposed || document.hidden || !context) return;
    if (origin === null) origin = time;
    clear();
    const count = Math.min(512, Math.max(16, Number(q('points').value) || 160));
    const phase = reduced?.matches ? 0 : (time - origin) / 1000 * (Number(q('speed').value) || 0) * 0.4;
    const cx = canvas.width / 2, cy = canvas.height / 2, radius = canvas.height * 0.4;
    context.strokeStyle = '#72ffd3'; context.fillStyle = '#72ffd3'; context.lineWidth = 1;
    if (q('pattern').value === 'line') {
      context.beginPath();
      for (let i = 0; i < count; i++) {
        const t = i / (count - 1), x = cx + (t * 2 - 1) * radius * 1.4;
        const y = cy + Math.sin(t * Math.PI * 4 + phase) * radius * 0.65;
        if (i === 0) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.stroke();
    } else {
      for (let i = 0; i < count; i++) {
        const angle = i * Math.PI * (3 - Math.sqrt(5)) + phase, r = radius * Math.sqrt(i / count);
        context.beginPath(); context.arc(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, 1.5, 0, Math.PI * 2); context.fill();
      }
    }
    // Reduced motion renders one still frame; controls redraw without animation.
    if (!reduced?.matches) frame = requestAnimationFrame(draw);
  }
  const start = () => {
    if (disposed || document.hidden) return;
    if (!context) { notify('Canvas preview is unavailable in this browser.'); return; }
    cancelAnimationFrame(frame); running = true; origin = null; frame = requestAnimationFrame(draw);
  };
  q('start').addEventListener('click', start);
  q('blackout').addEventListener('click', stop);
  for (const name of ['pattern', 'points', 'speed']) q(name).addEventListener('input', () => { if (running && reduced?.matches) draw(); });
  const visibility = () => { if (document.hidden) stop(); };
  const motionChange = () => { if (running) start(); };
  document.addEventListener('visibilitychange', visibility);
  reduced?.addEventListener?.('change', motionChange);
  clear();
  return { stop, dispose() { stop(); disposed = true; document.removeEventListener('visibilitychange', visibility); reduced?.removeEventListener?.('change', motionChange); container.replaceChildren(); } };
}
