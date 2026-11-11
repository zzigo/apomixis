// Operator-entered settings. A profile is not physical commissioning or output authority.
const finite = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
export function defaultLaserProfile() {
  return { schemaVersion: 1, model: '', scanRatePps: null, angleXDeg: null, angleYDeg: null,
    widthPercent: 100, heightPercent: 100, offsetXPercent: 0, offsetYPercent: 0,
    flipX: false, flipY: false, intensityPercent: 10, target: 'ceiling',
    exclusionZone: 'unknown', emergencyStop: 'unknown', interlock: 'unknown', scanFailureShutdown: 'unknown' };
}
export function validateLaserProfile(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schemaVersion !== 1) throw new Error('Unsupported laser profile');
  const template = defaultLaserProfile();
  if (Object.keys(raw).some(key => !Object.hasOwn(template, key))) throw new Error('Unknown profile fields / output authority is not importable');
  if (typeof raw.model !== 'string' || raw.model.length > 120) throw new Error('Projector model must be at most 120 characters');
  if (raw.scanRatePps !== null && (!Number.isInteger(raw.scanRatePps) || !finite(raw.scanRatePps, 1, 100000))) throw new Error('Scan rate must be blank or an integer from 1 to 100000 PPS');
  for (const key of ['angleXDeg', 'angleYDeg']) if (raw[key] !== null && (!finite(raw[key], 0.01, 180))) throw new Error('Scan angles must be blank or 0.01–180 degrees');
  for (const key of ['widthPercent', 'heightPercent']) if (!finite(raw[key], 1, 100)) throw new Error('Field size must be 1–100%');
  for (const key of ['offsetXPercent', 'offsetYPercent']) if (!finite(raw[key], -99, 99)) throw new Error('Field offset must be -99–99%');
  if (Math.abs(raw.offsetXPercent) + raw.widthPercent > 100 || Math.abs(raw.offsetYPercent) + raw.heightPercent > 100) throw new Error('Field plus offset must stay inside the normalized preview');
  if (typeof raw.flipX !== 'boolean' || typeof raw.flipY !== 'boolean' || !finite(raw.intensityPercent, 0, 100)) throw new Error('Invalid orientation or intensity');
  if (!['ceiling', 'wall', 'other', 'unknown'].includes(raw.target)) throw new Error('Invalid projection target');
  for (const key of ['exclusionZone', 'emergencyStop', 'interlock', 'scanFailureShutdown']) if (!['unknown', 'reported-present', 'reported-absent'].includes(raw[key])) throw new Error('Invalid operator-reported protection state');
  return Object.fromEntries(Object.keys(template).map(key => [key, raw[key]]));
}
export function parseLaserProfile(text) {
  if (typeof text !== 'string' || text.length > 16384) throw new Error('Laser profile exceeds 16 KiB');
  return validateLaserProfile(JSON.parse(text));
}
export function projectLaserPoint(profile, x, y) {
  if (!finite(x, 0, 1) || !finite(y, 0, 1)) throw new Error('Invalid normalized point');
  return [
    .5 + profile.offsetXPercent / 200 + ((profile.flipX ? 1 - x : x) - .5) * profile.widthPercent / 100,
    .5 + profile.offsetYPercent / 200 + ((profile.flipY ? 1 - y : y) - .5) * profile.heightPercent / 100
  ].map(value => Math.min(1, Math.max(0, value)));
}
