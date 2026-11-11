import { defaultLaserProfile, parseLaserProfile, validateLaserProfile } from '../../../packages/hylon-laser/profile.js';
const STORAGE_KEY = 'hylon-helios-profile-v1';
const numeric = ['scanRatePps', 'angleXDeg', 'angleYDeg', 'widthPercent', 'heightPercent', 'offsetXPercent', 'offsetYPercent', 'intensityPercent'];
const optional = ['scanRatePps', 'angleXDeg', 'angleYDeg'];
const protections = { exclusionZone: 'Beam exclusion zone', emergencyStop: 'Physical emergency stop', interlock: 'Physical interlock / shutter', scanFailureShutdown: 'Independent scan-failure shutdown' };
export function mountLaserProfile(container, { onApply = () => {}, notify = () => {} } = {}) {
  container.innerHTML = `<details><summary>PROJECTOR CONFIG / OPERATOR-REPORTED</summary>
    <p class="muted">Unknown hardware values stay blank. These software input ranges are not projector ratings. Settings never arm output or verify protections.</p>
    <div class="toolbar"><label class="field">Projector model<input data-profile="model" maxlength="120" placeholder="Unknown / identify later"></label><label class="field">Projection target<select data-profile="target"><option value="ceiling">Ceiling / operator-reported</option><option value="wall">Wall</option><option value="other">Other</option><option value="unknown">Unknown</option></select></label></div>
    <div class="toolbar"><label class="field">Scan rate / PPS<input data-profile="scanRatePps" type="number" min="1" max="100000" step="1" placeholder="Unknown"></label><label class="field">Scan angle X / degrees<input data-profile="angleXDeg" type="number" min="0.01" max="180" step="any" placeholder="Unknown"></label><label class="field">Scan angle Y / degrees<input data-profile="angleYDeg" type="number" min="0.01" max="180" step="any" placeholder="Unknown"></label></div>
    <p class="muted">PPS and angles are recorded only; they do not drive this preview. Width, height, offsets, flips and intensity below apply to the screen.</p>
    <div class="toolbar">${[['widthPercent', 'Width / %', 1, 100], ['heightPercent', 'Height / %', 1, 100], ['offsetXPercent', 'Center X / % of half-field', -99, 99], ['offsetYPercent', 'Center Y / % of half-field', -99, 99], ['intensityPercent', 'Intensity scale / %', 0, 100]].map(([key, label, min, max]) => `<label class="field">${label}<input data-profile="${key}" type="number" min="${min}" max="${max}" step="any"></label>`).join('')}<label class="field checkbox"><input type="checkbox" data-profile="flipX">Flip X</label><label class="field checkbox"><input type="checkbox" data-profile="flipY">Flip Y</label></div>
    <div class="toolbar">${Object.entries(protections).map(([key, label]) => `<label class="field">${label}<select data-profile="${key}"><option value="unknown">Unknown / not verified</option><option value="reported-present">Operator reports present / unverified</option><option value="reported-absent">Operator reports absent</option></select></label>`).join('')}</div>
    <div class="toolbar"><button data-apply-profile>APPLY / SAVE LOCALLY</button><button data-export-profile>EXPORT PROFILE JSON</button><label class="file-button">IMPORT PROFILE JSON<input data-import-profile type="file" accept="application/json,.json"></label></div><p class="status" data-profile-status role="status"></p>
  </details>`;
  const q = key => container.querySelector(`[data-profile="${key}"]`), status = container.querySelector('[data-profile-status]');
  let current = defaultLaserProfile(), disposed = false;
  try { const saved = localStorage.getItem(STORAGE_KEY); if (saved) current = parseLaserProfile(saved); }
  catch { status.textContent = 'Saved configuration unavailable or invalid; using unknown hardware values.'; }
  function populate() { for (const [key, value] of Object.entries(current)) { const input = q(key); if (!input) continue; if (typeof value === 'boolean') input.checked = value; else input.value = value ?? ''; } }
  function read() {
    const raw = { ...current };
    for (const key of Object.keys(raw)) {
      const input = q(key); if (!input) continue;
      raw[key] = input.type === 'checkbox' ? input.checked : numeric.includes(key) ? (optional.includes(key) && input.value.trim() === '' ? null : input.value.trim() === '' ? NaN : Number(input.value)) : input.value;
    }
    return validateLaserProfile(raw);
  }
  function apply(profile) {
    current = profile; onApply(); populate();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); status.textContent = 'Saved locally · operator-reported / unverified · physical output unavailable.'; }
    catch { status.textContent = 'Applied for this session; local storage unavailable. Export JSON to retain settings.'; }
  }
  container.querySelector('[data-apply-profile]').onclick = () => { try { apply(read()); } catch (error) { status.textContent = error.message; } };
  container.querySelector('[data-export-profile]').onclick = () => {
    try {
      const profile = read(), url = URL.createObjectURL(new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'hylon-helios-profile.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) { status.textContent = error.message; }
  };
  container.querySelector('[data-import-profile]').onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { if (file.size > 16384) throw new Error('Laser profile exceeds 16 KiB'); const profile = parseLaserProfile(await file.text()); if (!disposed) { apply(profile); notify('Imported unverified laser settings; preview stopped.'); } }
    catch (error) { if (!disposed) status.textContent = error.message; }
    finally { event.target.value = ''; }
  };
  populate();
  if (!status.textContent) status.textContent = 'Operator-reported configuration · no hardware verification or output authority.';
  return { get: () => current, dispose() { disposed = true; container.replaceChildren(); } };
}
