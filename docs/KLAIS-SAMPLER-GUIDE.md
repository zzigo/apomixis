# Klais multisampler — local library

This release replaces single-sample-only audition with a reusable, layered Klais sample instrument. It plays local audio; it does not send MIDI to the organ or control registration stops.

## Prepared offline version

Extract `HYLON-Klais-offline.zip`, double-click `tools/HYLON.command` on macOS, and use Chrome/Edge at `http://localhost:4173`. Keep the launcher Terminal open. Node.js 22+ must already be installed. All 541 encoded recordings are included in `instruments/klais/`; launch needs no Internet, npm packages, encoder libraries or source WAV folder.

Press **03 SAMPLER**. The pod expands to the workspace. The library loads its manifest automatically; **LOAD LIBRARY** rereads it after a local rebuild. If it reports missing files, check the server's instrument directory and use the full Klais ZIP rather than the small console-only ZIP.

From the source checkout:

```sh
npm ci
npm test
npm run test:assets
npm run build:klais
npm run build
npm start
```

`build:klais` requires the local source recordings and encoding tools documented in `KLAIS-ASSET-AUDIT.md`. It is unnecessary when using the prepared ZIP or an already built `.local/klais` bank. To choose another generated bank, set `HYLON_KLAIS_DIR=/absolute/path/to/klais` when starting the server. Never point it at the raw source folder: it expects a manifest and encoded assets.

Generate a full offline distribution with `npm run package:klais`. It verifies each encoded checksum and copies only manifest-referenced assets, leaving old encodings, originals, encoder receipts and development dependencies out of the ZIP. The console-only package remains `npm run package:offline`.

## Play and layer

1. Choose combinations in the left list. Up to **eight layers** may be active. These are whole recorded combinations, not reconstructed isolated stops. Their names and division groupings follow source folder conventions, not a commissioned console map.
2. **WARM SELECTED CACHE** loads selected samples without producing sound. One typical manual bank occupies about 80 MiB decoded. Warm results count processed samples, not guaranteed residency: the LRU cache evicts idle buffers when a large selection exceeds 128 MiB.
3. Hold a key on the screen or use the **C4 / E4 / G4** short chord. Choose the 24–84 manual, 24–55 pedal or compact 48–72 keyboard view. Missing playable zones are disabled. Samples load on demand if they are not cached; cold notes may arrive later while loading. Release/Stop prevents canceled notes from sounding when their load completes.
4. Gain, release, transpose and maximum sample stretch apply to all active layers. Default stretch is six semitones; the nearest filename root is used, with deterministic lower-root tie breaking. **Exact notes only** disables interpolation/transposition between recorded roots. Changing combinations/options safely stops old voices and pending notes.
5. To play from MIDI, choose the input in **02 I/O**, return to the sampler, warm the selection or enable audio, and check **Route selected MIDI input to the Klais bank**. This is explicitly local MIDI-to-audio routing. It does not enable physical MIDI output. Note ownership includes channel/pitch; note-off, CC120/123, disconnect, hidden page and Stop release the corresponding local voices.
6. **STOP SOUND** stops bank voices/pending notes. Global **STOP ALL** also ends capture, closes input monitoring and clears the laser screen preview. Neither command sends a hardware reset.

The inspector shows each source filename, filename-derived root and unmapped status. **AUDITION** plays any individual source at original speed, including the 12 unpitched cuts; it never turns that source into a keyboard zone. Audit names/ranges and listen before treating a root as correct. **EXPORT MANIFEST** saves the library metadata, not the recordings or private source directory.

The collapsed **SINGLE-FILE LAB** retains the previous arbitrary local-file experiment. While it is open, incoming MIDI is routed only to that lab if its own routing checkbox is enabled; the bank is stopped. Close it to return MIDI routing to the bank. File handles, bank selections, cache and audio authority are not restored across reload. MIDI routing starts disabled.

## What is present

- **541 stereo Ogg/Vorbis recordings**, 60,343,659 encoded bytes (57.55 MiB), from 1,070,772,636 bytes of included originals.
- **529 filename-derived roots**, **12 unmapped cuts**, 23 source buckets including two empty source folders. Empty/unmapped-only groups are visible but cannot be selected as pitched layers.
- 14 long Reaper original takes are inventoried and preserved but excluded from the playback bundle.
- Source sample rates are preserved in the files (540 at 44.1 kHz, one at 48 kHz). Web Audio may decode/resample to the audio context's rate; originals and encoded files are unchanged.
- Quality 5 Vorbis is a new explicitly documented encoder choice. It was not verified against a Plankton/vocals encoding precedent. Every encoded asset passed full command-line decode and structural validation; this is not an approval of perceptual quality or tuning.

## Limits and unfinished musical decisions

**C4=60** is the explicit filename convention. Actual pitches, room tuning, note labels, divisions and stop meanings need listening/console validation. Maximum stretch is visible rather than silently covering arbitrary gaps. Most manual banks use sparse whole-tone roots; the chromatic bank spans a different range.

All loop markers are currently `null`. Notes therefore play their recorded length and cannot sustain indefinitely; note-off adds the configured release ramp. The engine supports approved loop metadata only with explicit opt-in, but this UI deliberately leaves it disabled until loops are reviewed. No automatic loop finder or crossfade claim is made.

The reusable engine in `packages/glip-klais/` is DOM-independent and accepts a manifest, Web Audio context/destination and sample loader. It enforces 64 voices including tails, a 30-second note ceiling, up to eight active layers, bounded pending loads and a 128 MiB retained decoded cache. Active/tailing buffers are pinned. Loaded layers are gain-scaled by the square root of their count, which reduces accumulation but is not an audio limiter; leave headroom at the master/mixer.

Only two sample loads run concurrently. Encoded byte length and SHA256 are checked before decode; malformed URLs, redirects outside the library, stale/corrupt files, oversized buffers and stalled fetch/body reads fail explicitly. Fetch deadlines are 15 seconds. Loader disposal aborts outstanding reads; Stop cancels musical results and the prefetch chain, but an already running decode may finish into the cache. The decoded-cache cap does not equal total browser process memory: codec, network and temporary buffers also use memory.

Assets have immutable source/profile/encoded-hash paths; the manifest is published atomically after validation. Failed or interrupted later builds retain the files needed by the previous published manifest. Do not delete old referenced assets during a live session. The offline packager takes a verified snapshot of the current manifest's files.

No samples are checked into Git or uploaded to a service by these tools. Online GLIP hosting, public sample rights, sampler presets/score integration, persistent browser sample storage, final loop/tuning edits and the hyperphone are later work. The same engine/manifest can be used by those clients without duplicating the recordings.

## Verification record — 2026-11-11

- Full 541-file conversion/probe/decode and original/encoded hashes; resumable rebuild preserves published manifest hash; atomic-publication regressions and corrupted outputs are tested.
- Automated tests cover root selection/zones, layering, asynchronous note cancellation/retrigger, pinned LRU budgets, load dedup/retry/concurrency, voice/release limits, approved loops, one-shot audition, loader integrity/timeouts and safe local HTTP/range delivery.
- Browser smoke uses actual OGG recordings: one bank warms 32 samples, about 79.8 MiB decoded, with zero errors; a muted-output test chord produces three real sample voices. Additional browser checks are recorded in the PR.
- No physical Klais MIDI source, hardware output, room tuning, loop approval or public deployment was tested.
