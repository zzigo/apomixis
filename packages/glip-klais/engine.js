import { validateManifest, nearestSample, ROOT_CONVENTION } from './manifest.js';
import { createDecodedCache } from './cache.js';
export { ROOT_CONVENTION };

// Reusable Web Audio multisampler. No DOM, network policy, MIDI ports or DAC I/O.
// Roots follow C4=60; filename-derived roots remain unverified musical metadata.
export function createKlaisSampler({ context, destination, manifest, loadSample, maxBytes = 128 * 1024 * 1024, maxVoices = 64, onStatus = () => {} }) {
  const data = validateManifest(manifest);
  if (!context || !destination || typeof loadSample !== 'function') throw new TypeError('Audio context, destination and sample loader are required');
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > 1024 ** 3) throw new RangeError('Invalid decoded cache budget');
  if (!Number.isInteger(maxVoices) || maxVoices < 1 || maxVoices > 64) throw new RangeError('maxVoices must be 1–64');
  const samples = new Map(data.samples.map(sample => [sample.id,sample]));
  const registrations = new Map(data.registrations.map(registration => [registration.id,registration]));
  const voices = new Set(), owners = new Map(), pending = new Map();
  let active = [], epoch = 0, disposed = false, errors = 0;
  let options = { gain:0.2, release:0.2, transpose:0, maxStretch:6, loopEnabled:false };
  const report = () => { try { onStatus(getStats()); } catch { /* observers cannot interrupt lifecycle */ } };
  const cache = createDecodedCache({loadSample, maxBytes, onStatus:report});
  function getStats() { return { ...cache.stats(), voices:voices.size, pending:pending.size, maxBytes, maxVoices, errors, disposed, activeRegistrations:[...active] }; }
  function validateIds(ids, limit = 128) {
    if (!Array.isArray(ids) || ids.length > limit || new Set(ids).size !== ids.length || ids.some(id => !registrations.has(id))) throw new TypeError('Unknown, duplicate or excessive registrations');
    return [...ids];
  }
  function clean(voice) {
    if (voice.cleaned) return;
    voice.cleaned = true; voices.delete(voice);
    const set = owners.get(voice.owner);
    set?.delete(voice); if (!set?.size) owners.delete(voice.owner);
    try { voice.source.disconnect(); voice.gain.disconnect(); } finally { voice.lease.release(); }
    report();
  }
  function release(voice, immediate = false) {
    if (voice.cleaned || (voice.released && !immediate)) return;
    voice.released = true;
    const now = context.currentTime, duration = immediate ? 0.005 : voice.release;
    const param = voice.gain.gain;
    // cancelAndHold retains the actual envelope level during the attack.
    if (typeof param.cancelAndHoldAtTime === 'function') param.cancelAndHoldAtTime(now);
    else {
      param.cancelScheduledValues(now);
      let level = voice.level * Math.max(0,Math.min(1,(now - voice.started) / 0.01));
      if (voice.releaseStarted !== undefined) level = voice.releaseLevel * Math.max(0,1-(now-voice.releaseStarted)/voice.releaseDuration);
      else if (now > voice.started+29.98) level *= Math.max(0,(voice.started+30-now)/0.02);
      param.setValueAtTime(level,now);
      voice.releaseLevel = level;
    }
    voice.releaseStarted = now; voice.releaseDuration = duration;
    param.linearRampToValueAtTime(0, now + duration);
    try { voice.source.stop(now + duration + 0.005); } catch { clean(voice); }
  }
  function stop() {
    epoch++; pending.clear();
    for (const voice of voices) release(voice,true);
    report();
  }
  function noteOff(ownerId) {
    pending.delete(ownerId);
    for (const voice of owners.get(ownerId) ?? []) release(voice);
    report();
  }
  function setRegistrations(ids) {
    if (disposed) throw new Error('Sampler disposed');
    const next = validateIds(ids,8);
    stop(); active = next; report();
  }
  function setOptions(next) {
    if (disposed) throw new Error('Sampler disposed');
    if (!next || typeof next !== 'object' || Array.isArray(next) || Object.keys(next).some(key => !Object.hasOwn(options,key))) throw new TypeError('Unknown sampler option');
    const merged = {...options,...next};
    if (!Number.isFinite(merged.gain) || merged.gain < 0 || merged.gain > 1 || !Number.isFinite(merged.release) || merged.release < 0.01 || merged.release > 5 || !Number.isInteger(merged.transpose) || merged.transpose < -48 || merged.transpose > 48 || !Number.isFinite(merged.maxStretch) || merged.maxStretch < 0 || merged.maxStretch > 24 || typeof merged.loopEnabled !== 'boolean') throw new RangeError('Invalid sampler option');
    stop(); options = merged; report();
  }
  async function prepare(ids = active) {
    if (disposed) throw new Error('Sampler disposed');
    const chosen = validateIds(ids), mine = epoch;
    const list = chosen.flatMap(id => registrations.get(id).samples.map(id => samples.get(id)));
    const result = { requested:list.length, loaded:0, cached:0, failed:0, cancelled:false, errors:[] };
    for (const sample of list) {
      if (disposed || mine !== epoch) { result.cancelled = true; break; }
      try {
        const cached = cache.has(sample.id), lease = await cache.acquire(sample);
        lease.release();
        if (cached) result.cached++; else result.loaded++;
      } catch (error) { errors++; result.failed++; result.errors.push({ sampleId:sample.id, message:error.message }); }
    }
    report(); return result;
  }
  async function playNote(ownerId, note, velocity = 100, channel = 1, auditionSampleId = null) {
    if (disposed) return {played:0,skipped:0,cancelled:true,errors:[]};
    if (typeof ownerId !== 'string' || ownerId.length < 1 || ownerId.length > 256 || !Number.isInteger(note) || note < 0 || note > 127 || !Number.isInteger(velocity) || velocity < 1 || velocity > 127 || !Number.isInteger(channel) || channel < 1 || channel > 16) throw new RangeError('Invalid note owner, pitch, velocity or channel');
    noteOff(ownerId);
    if (pending.size >= 128) return {played:0,skipped:active.length,cancelled:false,errors:['Pending note limit']};
    const mine = epoch, request = Symbol(ownerId), chosenOptions = {...options};
    const audition = auditionSampleId === null ? null : samples.get(auditionSampleId);
    const pitch = audition ? (audition.rootMidi ?? 60) : note + chosenOptions.transpose;
    const chosen = audition ? [audition] : active.map(id => nearestSample(registrations.get(id).samples.map(id => samples.get(id)),pitch,velocity,chosenOptions.maxStretch)).filter(Boolean);
    const result = {played:0, skipped:(audition ? 1 : active.length)-chosen.length, cancelled:false, errors:[]};
    if (!chosen.length) return result;
    pending.set(ownerId,request); report();
    const leases = [];
    const current = () => !disposed && epoch === mine && pending.get(ownerId) === request;
    try {
      // Pin each loaded layer while subsequent layers load; never evict a
      // previously loaded layer and then play an unaccounted buffer reference.
      for (const sample of chosen) {
        if (!current()) { result.cancelled = true; return result; }
        try { leases.push({ sample, lease:await cache.acquire(sample) }); }
        catch (error) { errors++; result.skipped++; result.errors.push(`${sample.id}: ${error.message}`); }
      }
      if (!current()) { result.cancelled = true; return result; }
      const playable = Math.min(leases.length, Math.max(0,maxVoices-voices.size));
      result.skipped += leases.length-playable;
      const level = chosenOptions.gain * (velocity / 127) / Math.sqrt(Math.max(1,playable));
      for (let i = 0; i < playable; i++) {
        const item = leases[i], {sample,lease} = item;
        let source, gain, voice;
        try {
          source = context.createBufferSource(); gain = context.createGain();
          source.buffer = lease.buffer; source.playbackRate.value = 2 ** ((pitch - (sample.rootMidi ?? pitch)) / 12);
          source.loop = false;
          const loop = sample.loop;
          if (chosenOptions.loopEnabled && loop?.approved === true && loop.end <= lease.buffer.duration) {
            source.loop = true; source.loopStart = loop.start; source.loopEnd = loop.end;
          }
          const now = context.currentTime;
          gain.gain.setValueAtTime(0,now); gain.gain.linearRampToValueAtTime(level,now+0.01);
          source.connect(gain); gain.connect(destination);
          voice = {owner:ownerId, channel, source,gain,lease,release:chosenOptions.release,level,started:now,released:false,cleaned:false};
          voices.add(voice);
          if (!owners.has(ownerId)) owners.set(ownerId,new Set());
          owners.get(ownerId).add(voice);
          source.onended = () => clean(voice);
          source.start(now);
          // Finite lifetime even for a loop and a lost note-off; ramp the end.
          gain.gain.setValueAtTime(level,now+29.98); gain.gain.linearRampToValueAtTime(0,now+30);
          source.stop(now+30);
          item.transferred = true; result.played++;
        } catch (error) {
          errors++; result.skipped++; result.errors.push(`${sample.id}: ${error.message}`);
          if (voice) { try { source.stop(); } catch { /* not started */ } clean(voice); }
          else { try { source?.disconnect(); gain?.disconnect(); } catch { /* creation failed */ } }
        }
      }
      return result;
    } finally {
      for (const item of leases) if (!item.transferred) item.lease.release();
      if (pending.get(ownerId) === request) pending.delete(ownerId);
      report();
    }
  }
  return { setRegistrations,setOptions,prepare,
    noteOn(ownerId,note,velocity=100,channel=1) { return playNote(ownerId,note,velocity,channel); },
    auditionSample(ownerId,sampleId,velocity=100) {
      if (!samples.has(sampleId)) return Promise.reject(new TypeError('Unknown audition sample'));
      return playNote(ownerId,samples.get(sampleId).rootMidi ?? 60,velocity,1,sampleId);
    },
    noteOff,stop,getStats,
    get activeRegistrations() { return [...active]; },
    dispose() {
      if (disposed) return;
      stop(); disposed = true;
      // Terminal teardown disconnects and unpins even if the context is
      // suspended and AudioBufferSourceNode.onended cannot advance.
      for (const voice of [...voices]) clean(voice);
      cache.dispose(); report();
    }
  };
}
