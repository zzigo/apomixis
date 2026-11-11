import { HeliosUsb } from '../../../packages/hylon-laser/helios-usb.js';
import { mountLaserProfile } from './laser-profile.js';
import { projectLaserPoint } from '../../../packages/hylon-laser/profile.js';
import { MidiPoints, testFrame, sweepFrame } from '../../../packages/hylon-laser/patterns.js';

// No USB transfers, shutter commands or physical frame output.
export function mountLaser(container, { notify = () => {} } = {}) {
  container.classList.add('helios-pod');
  container.innerHTML = `<div class="panel-body">
    <div class="eyebrow">HELIOS / FIELD TESTS</div><p class="status" data-status>PREVIEW STOPPED · physical output unavailable / commissioning pending</p>
    <div class="toolbar"><button data-usb>CONNECT HELIOS USB</button><button data-usb-status-button>DAC STATUS</button><button class="danger" data-usb-stop>STOP DAC / CLOSE SHUTTER</button><button data-usb-disconnect>DISCONNECT</button><span class="muted" data-usb-status>USB disconnected · no automatic connection.</span></div>
    <section data-profile-root></section>
    <div class="toolbar"><label class="field">Mode<select data-mode><option value="frame">TEST / FULL FRAME</option><option value="sweep">TEST / SWEEP</option><option value="text">TEST / TEXT</option><option value="midi">MIDI / RANDOM XY</option></select></label><button class="primary" data-start>START PREVIEW</button><button class="danger" data-stop>BLACKOUT</button></div>
    <div class="toolbar" data-frame-controls><label class="field">Geometry<select data-shape><option value="square">Full square / normalized field</option><option value="high">High / top edge</option><option value="low">Low / bottom edge</option></select></label></div>
    <div class="toolbar" data-sweep-controls hidden><label class="field">Direction<select data-direction><option value="sequence">LR → RL → TD → DT</option><option>LR</option><option>RL</option><option>TD</option><option>DT</option></select></label><label class="field">Seconds per pass<input data-speed type="range" min="0.1" max="10" step="0.1" value="2"><output data-speed-label>2.0 s / pass</output></label><span data-direction-label class="status"></span></div>
    <div class="toolbar" data-text-controls hidden><label class="field">Test text / screen only<input data-text type="text" maxlength="24" value="HYLON"></label></div>
    <div class="toolbar" data-midi-controls hidden><label class="field checkbox"><input type="checkbox" data-route>Route selected MIDI input to XY preview</label><label class="field">Channel<select data-channel><option value="all">All channels</option>${Array.from({ length: 16 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select></label><button data-demo>DEMO NOTE / C4 / 96</button><span data-count>0 held points</span></div>
    <canvas data-canvas width="720" height="720" role="img" aria-label="Normalized HELIOS field preview" style="display:block;width:100%;max-height:65vh;object-fit:contain;background:#000;aspect-ratio:1"></canvas>
    <p class="muted">Full frame = 100% of the configured normalized field, not a calibrated scan angle. X: left to right; Y: top to bottom. Each note-on chooses a random XY; intensity = (velocity / 127) × configured intensity scale; note-off removes it. Maximum 32 held points.</p>
    <p class="muted">CONNECT opens and claims the HELIOS, then sends shutter-close and STOP. Controls send physical USB commands. No frames or shutter-open commands are available. Close TouchDesigner before connecting. Physical operation requires a verified projector profile, independent interlock and scan-failure shutdown. Stationary dots and canvas text are screen-only.</p>
  </div>`;
  const q = name => container.querySelector(`[data-${name}]`);
  const canvas = q('canvas'), ctx = canvas.getContext('2d'), points = new MidiPoints();
  let running = false, disposed = false, animation = 0, previous = null, elapsed = 0, demoTimer;
  const clear = () => { if (ctx) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, canvas.width, canvas.height); } };
  const usb = new HeliosUsb({ usb: navigator.usb, onState: message => { if (!disposed) q('usb-status').textContent = message; } });
  function stop({ hardware = true } = {}) {
    if (hardware && usb.device && !usb.busy) usb.stop().catch(error => notify(error.message));
    running = false; cancelAnimationFrame(animation); clearTimeout(demoTimer); points.clear();
    previous = null; elapsed = 0; clear(); q('count').textContent = '0 held points';
    q('status').textContent = 'PREVIEW STOPPED · physical output unavailable';
  }
  const profile = mountLaserProfile(q('profile-root'), { onApply: stop, notify });
  function draw(now) {
    if (!running || disposed || document.hidden || !ctx) return;
    if (previous !== null && now - previous > 500) { stop(); notify('HELIOS preview stopped after a clock stall.'); return; }
    if (previous !== null) elapsed += (now - previous) / 1000;
    previous = now; clear();
    const mode = q('mode').value;
    let strokes = [];
    if (mode === 'frame') strokes = testFrame(q('shape').value);
    if (mode === 'sweep') {
      const result = sweepFrame(elapsed, Number(q('speed').value), q('direction').value);
      strokes = result.strokes; q('direction-label').textContent = result.direction;
    }
    const config = profile.get();
    ctx.globalAlpha = config.intensityPercent / 100;
    ctx.lineWidth = 1.5;
    const px = value => 1 + value * (canvas.width - 2);
    for (const stroke of strokes) {
      ctx.strokeStyle = '#72ffd3'; ctx.beginPath();
      stroke.points.forEach(([x, y], i) => { const [tx, ty] = projectLaserPoint(config, x, y); if (i) ctx.lineTo(px(tx), px(ty)); else ctx.moveTo(px(tx), px(ty)); }); ctx.stroke();
    }
    if (mode === 'text') {
      ctx.fillStyle = '#72ffd3'; ctx.font = '56px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.save();
      const [cx, cy] = projectLaserPoint(config, .5, .5);
      ctx.translate(px(cx), px(cy)); ctx.scale(config.widthPercent / 100 * (config.flipX ? -1 : 1), config.heightPercent / 100 * (config.flipY ? -1 : 1));
      ctx.fillText(q('text').value, 0, 0, 680); ctx.restore();
    }
    if (mode === 'midi') for (const p of points.snapshot()) {
      ctx.fillStyle = `rgba(114,255,211,${p.intensity})`; ctx.beginPath(); const [x, y] = projectLaserPoint(config, p.x, p.y); ctx.arc(px(x), px(y), 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    q('count').textContent = `${points.notes.size} held points`; animation = requestAnimationFrame(draw);
  }
  const start = () => {
    if (disposed || document.hidden) return;
    stop(); if (!ctx) { notify('Canvas unavailable.'); return; }
    running = true; q('status').textContent = 'PREVIEW RUNNING · no physical output'; animation = requestAnimationFrame(draw);
  };
  const midi = bytes => {
    if (!running || disposed || q('mode').value !== 'midi' || !q('route').checked) return;
    points.receive(bytes, q('channel').value === 'all' ? 'all' : Number(q('channel').value));
  };
  q('start').onclick = start; q('stop').onclick = stop;
  q('mode').onchange = () => { stop(); for (const name of ['frame', 'sweep', 'text', 'midi']) q(`${name}-controls`).hidden = q('mode').value !== name; };
  for (const name of ['shape', 'direction']) q(name).onchange = () => { elapsed = 0; };
  q('speed').oninput = () => { elapsed = 0; q('speed-label').textContent = `${Number(q('speed').value).toFixed(1)} s / pass`; };
  for (const name of ['route', 'channel']) q(name).onchange = () => points.clear();
  q('demo').onclick = () => { if (!running) start(); points.receive([0x90, 60, 96]); clearTimeout(demoTimer); demoTimer = setTimeout(() => points.receive([0x80, 60, 0]), 600); };
  const usbAction = action => async () => { try { await action(); } catch (error) { notify(error.message); } };
  q('usb').onclick = usbAction(() => usb.connect());
  q('usb-status-button').onclick = usbAction(() => usb.status());
  q('usb-stop').onclick = usbAction(() => usb.stop());
  q('usb-disconnect').onclick = usbAction(() => usb.disconnect());
  const visibility = () => { if (document.hidden) stop(); };
  const disconnect = () => { stop(); q('usb-status').textContent = 'USB disconnected · select again when ready.'; };
  document.addEventListener('visibilitychange', visibility); navigator.usb?.addEventListener('disconnect', disconnect); clear();
  return { stop, midi, async panic() { stop({ hardware: false }); await usb.emergencyStop(); }, dispose() { stop(); disposed = true; profile.dispose(); usb.dispose().catch(error => notify(error.message)); document.removeEventListener('visibilitychange', visibility); navigator.usb?.removeEventListener('disconnect', disconnect); container.replaceChildren(); } };
}
