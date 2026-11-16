// Decoded AudioBuffers are charged by actual float32 frames, never encoded size.
// An acquisition pins a buffer until its lease is released (including note tails).
export function createDecodedCache({ loadSample, maxBytes, onStatus = () => {} }) {
  const entries = new Map(), inflight = new Map(), queue = [];
  let bytes = 0, clock = 0, loading = 0, closed = false;
  const report = () => { try { onStatus(); } catch { /* status observers cannot break audio */ } };
  function evict(required = 0) {
    const candidates = [...entries.values()].filter(e => !e.pins).sort((a,b) => a.used-b.used);
    for (const entry of candidates) {
      if (!closed && bytes + required <= maxBytes) break;
      entries.delete(entry.id); bytes -= entry.bytes;
    }
  }
  function lease(entry) {
    let released = false;
    return { buffer: entry.buffer, release() {
      if (released) return;
      released = true; entry.pins--; entry.used = ++clock;
      if (closed && !entry.pins && entries.has(entry.id)) { entries.delete(entry.id); bytes -= entry.bytes; }
      report();
    } };
  }
  function pump() {
    while (!closed && loading < 2 && queue.length) {
      const request = queue.shift(); loading++;
      Promise.resolve().then(() => loadSample(request.sample)).then(buffer => {
        if (closed) throw new Error('Cache disposed');
        if (!buffer || !Number.isInteger(buffer.length) || buffer.length < 1 || !Number.isInteger(buffer.numberOfChannels) || buffer.numberOfChannels < 1 || buffer.numberOfChannels > 8 || !Number.isFinite(buffer.duration) || buffer.duration <= 0) throw new Error('Invalid decoded AudioBuffer');
        const size = buffer.length * buffer.numberOfChannels * 4;
        if (!Number.isSafeInteger(size) || size > maxBytes) throw new Error('Decoded sample exceeds cache budget');
        evict(size);
        if (bytes + size > maxBytes) throw new Error('Cache budget pinned by active voices');
        const entry = { id: request.sample.id, buffer, bytes:size, pins:request.waiters, used:++clock };
        entries.set(entry.id, entry); bytes += size;
        inflight.delete(request.sample.id);
        request.resolve(entry);
      }).catch(error => {
        if (inflight.get(request.sample.id) === request) inflight.delete(request.sample.id);
        request.reject(error);
      }).finally(() => { loading--; report(); pump(); });
    }
  }
  return {
    async acquire(sample) {
      if (closed) throw new Error('Cache disposed');
      const cached = entries.get(sample.id);
      if (cached) { cached.pins++; cached.used = ++clock; return lease(cached); }
      let request = inflight.get(sample.id);
      if (request) request.waiters++;
      else {
        if (inflight.size >= 128) throw new Error('Sample load queue is full');
        request = { sample, waiters:1 };
        request.promise = new Promise((resolve,reject) => { request.resolve = resolve; request.reject = reject; });
        inflight.set(sample.id, request); queue.push(request); pump();
      }
      return lease(await request.promise);
    },
    has(id) { return entries.has(id); },
    stats() { return { decodedBytes:bytes, cacheEntries:entries.size, inflight:inflight.size, loading, queued:queue.length, pinnedEntries:[...entries.values()].filter(e => e.pins).length }; },
    dispose() {
      closed = true;
      for (const request of queue.splice(0)) { inflight.delete(request.sample.id); request.reject(new Error('Cache disposed')); }
      evict(); report();
    }
  };
}
