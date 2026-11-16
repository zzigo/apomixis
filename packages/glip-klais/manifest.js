export const ROOT_CONVENTION = 'C4=60';
const fail = message => { throw new TypeError(`Invalid Klais manifest: ${message}`); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (v, low, high) => Number.isInteger(v) && v >= low && v <= high;
const finite = (v, low, high) => Number.isFinite(v) && v >= low && v <= high;
const identifier = v => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(v);
const text = (v, size = 1024) => typeof v === 'string' && v.length > 0 && v.length <= size && !/[\u0000-\u001f]/.test(v);

// URLs resolve beneath a caller-chosen trusted local asset base. They cannot
// introduce an origin, query, fragment, absolute path or decoded traversal.
export function isSafeSampleUrl(value) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 2048 || /[\\?#\u0000-\u0020]/.test(value) || value.startsWith('/') || /^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  try {
    return value.split('/').every(segment => {
      const decoded = decodeURIComponent(segment);
      return decoded.length > 0 && decoded !== '.' && decoded !== '..' && !/[\\/:%\u0000-\u001f]/.test(decoded);
    });
  } catch { return false; }
}

export function validateManifest(raw) {
  if (!object(raw) || raw.schemaVersion !== 1) fail('unsupported schemaVersion');
  if (!identifier(raw.instrumentId) || !text(raw.version, 64)) fail('instrument/version identity');
  if (raw.contentHash !== undefined && !/^[a-f0-9]{64}$/i.test(raw.contentHash)) fail('contentHash');
  if (raw.rootConvention !== ROOT_CONVENTION) fail(`rootConvention must be ${ROOT_CONVENTION}`);
  if (!Array.isArray(raw.registrations) || raw.registrations.length < 1 || raw.registrations.length > 128) fail('registration count');
  if (!Array.isArray(raw.samples) || raw.samples.length < 1 || raw.samples.length > 4096) fail('sample count');
  const samples = new Map(), registrations = new Map();
  for (const sample of raw.samples) {
    if (!object(sample) || !identifier(sample.id) || samples.has(sample.id)) fail('duplicate/invalid sample ID');
    if (!isSafeSampleUrl(sample.url) || !/^[a-f0-9]{64}$/i.test(sample.hash ?? '')) fail(`sample URL/hash: ${sample.id}`);
    if (!integer(sample.bytes, 1, 512 * 1024 * 1024)) fail(`sample bytes: ${sample.id}`);
    if (sample.rootMidi !== null && !integer(sample.rootMidi, 0, 127)) fail(`rootMidi: ${sample.id}`);
    if (!integer(sample.channels, 1, 8) || !integer(sample.sampleRate, 8000, 384000) || !finite(sample.duration, 0.001, 3600)) fail(`audio metadata: ${sample.id}`);
    if (sample.frames !== undefined && !integer(sample.frames, 1, 1_400_000_000)) fail(`frames: ${sample.id}`);
    for (const [low, high] of [['keyLow', 'keyHigh'], ['velocityLow', 'velocityHigh']]) {
      if ((sample[low] === undefined) !== (sample[high] === undefined)) fail(`incomplete zone: ${sample.id}`);
      if (sample[low] !== undefined && (!integer(sample[low], 0, 127) || !integer(sample[high], 0, 127) || sample[low] > sample[high])) fail(`invalid zone: ${sample.id}`);
    }
    if (sample.loop !== undefined && sample.loop !== null) {
      if (!object(sample.loop) || typeof sample.loop.approved !== 'boolean' || !finite(sample.loop.start, 0, sample.duration) || !finite(sample.loop.end, 0, sample.duration) || sample.loop.end - sample.loop.start < 0.01) fail(`loop markers: ${sample.id}`);
    }
    samples.set(sample.id, sample);
  }
  const referenced = new Set();
  for (const registration of raw.registrations) {
    if (!object(registration) || !identifier(registration.id) || registrations.has(registration.id) || !text(registration.label, 256)) fail('registration identity');
    if (!Array.isArray(registration.samples) || registration.samples.length > 4096 || new Set(registration.samples).size !== registration.samples.length) fail(`registration samples: ${registration.id}`);
    for (const id of registration.samples) {
      if (!samples.has(id)) fail(`unknown sample reference: ${id}`);
      const sample = samples.get(id);
      if (sample.registrationId !== undefined && sample.registrationId !== registration.id) fail(`sample registration mismatch: ${id}`);
      if (referenced.has(id)) fail(`sample belongs to multiple registrations: ${id}`);
      referenced.add(id);
    }
    registrations.set(registration.id, registration);
  }
  if (referenced.size !== samples.size) fail('orphan sample');
  // Return a detached representation: caller mutation cannot change accepted data.
  return structuredClone(raw);
}

export function nearestSample(samples, note, velocity, maxStretch = 6) {
  if (!integer(note, 0, 127) || !integer(velocity, 1, 127) || !finite(maxStretch, 0, 24)) return null;
  return samples.filter(sample => integer(sample.rootMidi, 0, 127)
    && Math.abs(note - sample.rootMidi) <= maxStretch
    && note >= (sample.keyLow ?? 0) && note <= (sample.keyHigh ?? 127)
    && velocity >= (sample.velocityLow ?? 0) && velocity <= (sample.velocityHigh ?? 127))
    .sort((a, b) => Math.abs(note - a.rootMidi) - Math.abs(note - b.rootMidi)
      || a.rootMidi - b.rootMidi || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))[0] ?? null;
}
