import { defaultLaserProfile, parseLaserProfile, validateLaserProfile } from '../../../packages/hylon-laser/profile.js';
import { defaultOutputProfile } from '../../../packages/hylon-laser/frame.js';
import { defaultScanTuning } from '../../../packages/hylon-laser/scan-tuning.js';
const scanSlider=(key,label,min,max,step,unit,help)=>`<label class="field scan-control" title="${help}"><span>${label}<output data-scan-value="${key}"></output></span><input data-scan="${key}" aria-label="${label}" type="range" min="${min}" max="${max}" step="${step}" data-unit="${unit}"></label>`;
const scanControls=`<div class="scan-tuning-grid">
  <section><h3>01 / BLANKING</h3>${scanSlider('settleUs','Settle',0,1500,25,'µs','Dark settling time after reaching each stroke start; never a lit dwell.')}${scanSlider('blankLeadUs','Blank lead',0,1000,25,'µs','Keep the beginning of each stroke dark before turning color on.')}${scanSlider('blankTailUs','Blank tail',0,1000,25,'µs','Turn color off before the end of each stroke.')}</section>
  <section><h3>02 / RGB ↔ XY</h3>${scanSlider('colorDelayUs','Color offset',-1000,1000,25,'µs','Positive delays color relative to XY; negative advances it. Compensation stays inside its stroke and never illuminates blank travel.')}</section>
  <section><h3>03 / TRACE & CORNERS</h3>${scanSlider('traceStep','Trace step',8,64,1,'DAC','Smaller spacing adds moving samples and slows the trace at fixed PPS.')}${scanSlider('cornerSlowdown','Corner slow',0,100,1,'%','Ease into/out of corners and open ends using moving samples, without holding a lit point.')}</section>
  <section><h3>04 / ROUTE</h3><label class="field" title="Reorder strokes to shorten blank travel; reverse also allows open strokes to run backwards.">Order<select data-scan="route"><option value="original">Original</option><option value="nearest">Nearest</option><option value="nearest-reverse">Nearest + reverse</option></select></label><label class="field checkbox" title="ON closes each frame via center. OFF closes directly back to the first stroke and pads there."><input data-scan="returnToCenter" type="checkbox">Return center</label><button data-scan-reset title="Reset only these scan controls to neutral values">RESET SCAN</button></section>
</div>`;
// Old preview-only profiles are deliberately not auto-promoted to physical settings.
const STORAGE_KEY = 'hylon-helios-output-settings-v1';
export function mountLaserProfile(container, { onApply = () => {}, onChange = () => {}, notify = () => {}, storage = localStorage } = {}) {
  container.innerHTML = `<div class="toolbar"><label class="field">Size / %<input data-size type="range" min="5" max="100" step="1" value="20"><output data-size-label>20%</output></label><label class="field">Intensity signal / %<input data-power type="range" min="0" max="100" step="1" value="5"><output data-power-label>5%</output></label><button data-defaults>RESET DEFAULTS</button></div>
    <div class="laser-rgb" role="group" aria-label="Laser RGB"><label title="Red">R<input data-color-r aria-label="Laser red" type="range" min="0" max="100" step="1" value="0"></label><label title="Green">G<input data-color-g aria-label="Laser green" type="range" min="0" max="100" step="1" value="100"></label><label title="Blue">B<input data-color-b aria-label="Laser blue" type="range" min="0" max="100" step="1" value="0"></label></div>
    <details><summary>ADVANCED / SCAN & ALIGNMENT</summary><p class="muted">Software defaults, not verified projector ratings. Intensity is the DAC control signal, not a measured optical power percentage.</p>
    <div class="toolbar"><label class="field">Scan rate / PPS<input data-pps type="number" min="8000" max="40000" step="1000" value="20000"></label><label class="field">Center X / %<input data-x type="range" aria-label="Laser center X" min="-95" max="95" value="0"></label><label class="field">Center Y / %<input data-y type="range" aria-label="Laser center Y" min="-95" max="95" value="0"></label><label class="field checkbox"><input data-flip-x type="checkbox">Flip X</label><label class="field checkbox"><input data-flip-y type="checkbox">Flip Y</label></div>
    ${scanControls}
    <div class="toolbar"><button data-export>EXPORT SETTINGS</button><label class="file-button">IMPORT SETTINGS<input data-import type="file" accept="application/json,.json"></label></div><p data-settings-status class="status" role="status"></p></details>`;
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
    q('x').min=-(100-current.widthPercent);q('x').max=100-current.widthPercent;
    q('y').min=-(100-current.heightPercent);q('y').max=100-current.heightPercent;
    q('pps').value = current.scanRatePps; q('x').value = current.offsetXPercent; q('y').value = current.offsetYPercent; q('flip-x').checked = current.flipX; q('flip-y').checked = current.flipY;
    container.querySelectorAll('[data-scan]').forEach(input=>{const key=input.dataset.scan;if(input.type==='checkbox')input.checked=current.scanTuning[key];else input.value=current.scanTuning[key];const output=container.querySelector(`[data-scan-value="${key}"]`);if(output)output.value=`${current.scanTuning[key]} ${input.dataset.unit}`;});
    ['r','g','b'].forEach((ch,i)=>{q('color-'+ch).value=current.colorRgb[i]*100;});
  }
  function apply(next, live = true) {
    const validated = validate(next); onApply({ live, next: validated }); current = validated; populate(); onChange();
    try { storage.setItem(STORAGE_KEY, JSON.stringify(current)); q('settings-status').textContent = 'Saved locally. Settings never start output automatically.'; }
    catch { q('settings-status').textContent = 'Applied for this session; local save unavailable.'; }
  }
  const handle = fn => () => { try { fn(); } catch (error) { q('settings-status').textContent = error.message; notify(error.message); populate(); } };
  q('size').oninput = handle(() => apply({ ...current, widthPercent: Number(q('size').value), heightPercent: Number(q('size').value) }, true));
  q('power').oninput = handle(() => apply({ ...current, intensityPercent: Number(q('power').value) }, true));
  for(const ch of ['r','g','b'])q('color-'+ch).oninput=handle(()=>apply({...current,colorRgb:['r','g','b'].map(c=>Number(q('color-'+c).value)/100)},true));
  q('defaults').onclick = handle(() => apply(defaults()));
  const setPps=handle(()=>apply({...current,scanRatePps:Number(q('pps').value)}));
  q('pps').oninput=()=>{const value=Number(q('pps').value);if(Number.isInteger(value)&&value>=8000&&value<=40000)setPps();};
  q('pps').onchange=setPps;
  q('x').oninput=handle(()=>apply({...current,offsetXPercent:Number(q('x').value)}));
  q('y').oninput=handle(()=>apply({...current,offsetYPercent:Number(q('y').value)}));
  q('flip-x').onchange=handle(()=>apply({...current,flipX:q('flip-x').checked}));
  q('flip-y').onchange=handle(()=>apply({...current,flipY:q('flip-y').checked}));
  container.querySelectorAll('[data-scan]').forEach(input=>{
    input.addEventListener(input.type==='range'?'input':'change',handle(()=>{
      const key=input.dataset.scan,value=input.type==='checkbox'?input.checked:input.type==='range'?Number(input.value):input.value;
      apply({...current,scanTuning:{...current.scanTuning,[key]:value}});
    }));
  });
  q('scan-reset').onclick=handle(()=>apply({...current,scanTuning:defaultScanTuning()}));
  q('export').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify(current,null,2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'HYLON-helios-settings.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url),1000); };
  q('import').onchange = async event => {
    const file = event.target.files?.[0]; if (!file) return;
    try { if (file.size > 16384) throw new Error('Settings exceed 16 KiB'); const value = parseLaserProfile(await file.text()); if (!disposed) apply({ ...value, scanRatePps: value.scanRatePps ?? 20000 }); }
    catch (error) { if (!disposed) { q('settings-status').textContent = error.message; notify(error.message); } } finally { event.target.value = ''; }
  };
  populate();
  return { get: () => current, setQuad(warpQuad) { apply({ ...current, warpQuad }, true); }, dispose() { disposed = true; container.replaceChildren(); } };
}
