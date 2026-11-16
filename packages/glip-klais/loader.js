import { isSafeSampleUrl } from './manifest.js';
// Hashes detect stale/damaged assets; they do not establish provenance. The budget
// bounds expected decoded buffers, not every temporary allocation inside a codec.
export function createFetchLoader(context, baseUrl, { fetchImpl = globalThis.fetch, cryptoImpl = globalThis.crypto, maxDecodedBytes = 128 * 1024 ** 2, timeoutMs = 15000 } = {}) {
  const base = new URL(baseUrl), controllers = new Set(); let disposed = false;
  if (!['http:', 'https:'].includes(base.protocol) || !base.pathname.endsWith('/')) throw new Error('Serve the bank from a localhost or HTTPS directory.');
  if (!Number.isSafeInteger(maxDecodedBytes) || maxDecodedBytes < 1 || !Number.isFinite(timeoutMs) || timeoutMs < 1) throw new Error('Invalid sample loading limits');
  async function load(sample) {
    if (disposed) throw new Error('Sample loader disposed');
    if (!isSafeSampleUrl(sample.url) || !Number.isSafeInteger(sample.bytes) || sample.bytes < 1 || sample.bytes > 64 * 1024 * 1024) throw new Error('Invalid or oversized encoded sample');
    const estimate = Math.ceil(sample.duration * (context.sampleRate || sample.sampleRate || 48000)) * sample.channels * 4;
    if (!Number.isFinite(estimate) || estimate < 1 || estimate > maxDecodedBytes) throw new Error('Expected decoded sample exceeds memory budget');
    const url = new URL(sample.url, base);
    if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) throw new Error('Sample URL escapes the instrument library');
    const controller = new AbortController(); controllers.add(controller);
    const timer = setTimeout(() => controller.abort(new Error('Sample loading timed out; retry or restore the local library')), timeoutMs);
    let reader, onAbort;
    let bytes;
    try {
      const response = await fetchImpl(url.href, { signal: controller.signal, redirect: 'error' });
      if (response.url) {
        const finalUrl = new URL(response.url);
        if (finalUrl.origin !== base.origin || !finalUrl.pathname.startsWith(base.pathname)) throw new Error('Sample redirect escapes the instrument library');
      }
      if (!response.ok) throw new Error(`Sample unavailable (${response.status})`);
      bytes = new Uint8Array(sample.bytes); let offset = 0;
      if (response.body?.getReader) {
        reader = response.body.getReader();
        onAbort = () => { reader.cancel(controller.signal.reason).catch(() => {}); };
        controller.signal.addEventListener('abort', onAbort, { once: true });
        if (controller.signal.aborted) onAbort();
        while (true) {
          const { done, value } = await reader.read();
          if (controller.signal.aborted) throw controller.signal.reason;
          if (done) break;
          if (offset + value.length > bytes.length) throw new Error('Sample exceeds declared byte length');
          bytes.set(value, offset); offset += value.length;
        }
      } else {
        const data = new Uint8Array(await response.arrayBuffer());
        if (data.length !== bytes.length) throw new Error('Sample byte length mismatch');
        bytes.set(data); offset = data.length;
      }
      if (controller.signal.aborted) throw controller.signal.reason;
      if (offset !== sample.bytes) throw new Error('Sample byte length mismatch');
    } catch (error) { if (reader) await reader.cancel().catch(() => {}); throw controller.signal.aborted ? controller.signal.reason : error; }
    finally {
      clearTimeout(timer); controllers.delete(controller);
      if (onAbort) controller.signal.removeEventListener('abort', onAbort);
      reader?.releaseLock();
    }
    if (disposed) throw new Error('Sample loader disposed');
    if (!cryptoImpl?.subtle) throw new Error('Sample verification needs a secure localhost or HTTPS context');
    const digest = Array.from(new Uint8Array(await cryptoImpl.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
    if (digest !== sample.hash.toLowerCase()) throw new Error('Sample checksum mismatch; rebuild or restore the library');
    if (disposed) throw new Error('Sample loader disposed');
    const buffer = await context.decodeAudioData(bytes.buffer);
    if (disposed) throw new Error('Sample loader disposed');
    if (buffer.numberOfChannels !== sample.channels || Math.abs(buffer.duration - sample.duration) > 0.05) throw new Error('Decoded audio disagrees with instrument metadata');
    return buffer;
  }
  load.dispose = () => { disposed = true; controllers.forEach(c => c.abort(new Error('Sample loader disposed'))); controllers.clear(); };
  return load;
}
