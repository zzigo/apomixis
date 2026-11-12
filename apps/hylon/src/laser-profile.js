import { defaultLaserProfile, parseLaserProfile, validateLaserProfile } from '../../../packages/hylon-laser/profile.js';
import { defaultOutputProfile } from '../../../packages/hylon-laser/frame.js';
// Old preview-only profiles are deliberately not auto-promoted to physical settings.
const STORAGE_KEY = 'hylon-helios-output-settings-v1';
export function mountLaserProfile(container, { onApply = () => {}, onChange = () => {}, notify = () => {}, storage = localStorage } = {}) {
  container.innerHTML = `<div class="toolbar"><label class="field">Size / %<input data-size type="range" min="5" max="100" step="1" value="20"><output data-size-label>20%</output></label><label class="field">Intensity signal / %<input data-power type="range" min="0" max="100" step="1" value="5"><output data-power-label>5%</output></label><button data-defaults>RESET DEFAULTS</button></div>
    <details><summary>ADVANCED / SCAN & ALIGNMENT</summary><p class="muted">Software defaults, not verified projector ratings. Intensity is the DAC control signal, not a measured optical power percentage.</p>
    <div class="toolbar"><label class="field">Scan rate / PPS<input data-pps type="number" min="8000" max="40000" step="1000" value="20000"></label><label class="field">Center X / %<input data-x type="number" min="-95" max="95" value="0"></label><label class="field">Center Y / %<input data-y type="number" min="-95" max="95" value="0"></label><label class="field checkbox"><input data-flip-x type="checkbox">Flip X</label><label class="field checkbox"><input data-flip-y type="checkbox">Flip Y</label></div>
    <div class="toolbar"><button data-apply>APPLY ALIGNMENT</button><button data-export>EXPORT SETTINGS</button><label class="file-button">IMPORT SETTINGS<input data-import type="file" accept="application/json,.json"></label></div><p data-settings-status class="status" role="status"></p></details>`;
  const q = key => container.querySelector(`[data-${key}]`);
  const defaults = () => defaultOutputProfile(defaultLaserProfile());
  let current = defaults(), disposed = false;
  function validate(profile) {
    const result = validateLaserProfile(profile);
    if (!Number.isInteger(result.scanRatePps) || result.scanRatePps < 8000 || result.scanRatePps > 40000) throw new Error('Output PPS must be 8000–40000');
    return result;
  }
  try { const saved = storage.getItem(STORAGE_KEY); if (saved) current = validate(parseLaserProfile(saved)); } catch { q('settings-status').textContent = 'Invalid saved settings; defaults restored.'; }
  function populate() {
    q('size').value = Math.min(current.widthPercent, current.heightPercent); q('power').value = current.intensityPercent;
    q('size-label').value = `${current.widthPercent}% × ${current.heightPercent}%`; q('power-label').value = `${current.intensityPercent}%`;
    q('pps').value = current.scanRatePps; q('x').value = current.offsetXPercent; q('y').value = current.offsetYPercent; q('flip-x').checked = current.flipX; q('flip-y').checked = current.flipY;
  }
  function apply(next, live = false) {
    const validated = validate(next); onApply({ live }); current = validated; populate(); onChange();
    try { storage.setItem(STORAGE_KEY, JSON.stringify(current)); q('settings-status').textContent = 'Saved locally. Settings never start output automatically.'; }
    catch { q('settings-status').textContent = 'Applied for this session; local save unavailable.'; }
  }
  const handle = fn => () => { try { fn(); } catch (error) { q('settings-status').textContent = error.message; notify(error.message); populate(); } };
  q('size').oninput = handle(() => apply({ ...current, widthPercent: Number(q('size').value), heightPercent: Number(q('size').value) }, true));
  q('power').oninput = handle(() => apply({ ...current, intensityPercent: Number(q('power').value) }, true));
  q('defaults').onclick = handle(() => apply(defaults()));
  q('apply').onclick = handle(() => {
    for (const key of ['pps','x','y']) if (!q(key).value.trim()) throw new Error('Fill scan rate and center values');
    apply({ ...current, scanRatePps: Number(q('pps').value), offsetXPercent: Number(q('x').value), offsetYPercent: Number(q('y').value), flipX: q('flip-x').checked, flipY: q('flip-y').checked });
  });
  q('export').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(current,null,2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'HYLON-helios-settings.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); };
  q('import').onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { if (file.size > 16384) throw new Error('Settings exceed 16 KiB'); const value = parseLaserProfile(await file.text()); if (!disposed) apply({ ...value, scanRatePps: value.scanRatePps ?? 20000 }); }
    catch (error) { if (!disposed) { q('settings-status').textContent = error.message; notify(error.message); } } finally { event.target.value = ''; }
  };
  populate();
  return { get: () => current, setQuad(warpQuad) { apply({ ...current, warpQuad }, true); }, dispose() { disposed = true; container.replaceChildren(); } };
}
