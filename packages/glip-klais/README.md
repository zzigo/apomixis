# @zztt/glip-klais

Reusable Web Audio multisampler, independent of HYLON, DOM, MIDI ports and hardware output. The first client is the local Apomixis/HYLON console; GLIP and the future hyperphone can consume the same package and immutable manifest/assets.

```js
import { createKlaisSampler } from './engine.js';
import { createFetchLoader } from './loader.js';

// Create/resume this context in an explicit user gesture.
const sampler = createKlaisSampler({
  context, destination, manifest,
  loadSample: createFetchLoader(context, new URL('/instruments/klais/', location.href)),
  maxBytes: 128 * 1024 ** 2, maxVoices: 64
});
sampler.setRegistrations(['1manual_19_23_24']);
await sampler.prepare(); // Cache warming, not sound; LRU residency is bounded.
await sampler.noteOn('my-key-60', 60, 90, 1);
sampler.noteOff('my-key-60');
sampler.stop();
sampler.dispose();
```

`setOptions({gain,release,transpose,maxStretch,loopEnabled})` validates units/bounds and stops old notes. `noteOn` and `auditionSample(ownerId,sampleId,velocity)` return `{played,skipped,cancelled,errors}`. `prepare(registrationIds)` reports loaded/cached/failed/canceled counts. `getStats()` exposes retained cache bytes, entries, inflight/queued work, pins and voice counts. These methods never open a MIDI port or DAC. Imported/restored metadata cannot grant device authority.

`validateManifest` checks schema/root convention, identity, cross-references, bounded metadata/zones/loops and safe relative URLs. `nearestSample` uses absolute MIDI distance, then lower root, then stable ID. Root convention is C4=60. Filename-derived metadata remains unverified. Loader checks encoded length/hash before decoding; file hashes detect inconsistency, not trust/authenticity. Manifest `contentHash` uses the Python canonicalization documented in the asset audit and is not claimed to be RFC8785/JCS.

The caller owns the destination and lifecycle. Release active owners on input/panel changes. Stop cancels musical output but cache warm/decode already running can finish; `loader.dispose()` aborts outstanding fetch/body reads when a bank is unloaded. Retained cache limits do not cap every temporary browser codec allocation. Keep callbacks lightweight; source scheduling occurs on the AudioContext clock.

See `docs/KLAIS-SAMPLER-GUIDE.md`, `docs/KLAIS-ASSET-AUDIT.md` and `tests/multisampler.test.mjs` in the repository root for the current pipeline, controls and coverage. No recordings or precompiled encoder binaries are included in this package.
