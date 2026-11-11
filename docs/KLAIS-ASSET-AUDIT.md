# Klais local asset audit

Observed 2026-11-11. This is a local encoding and filename audit, not acoustic or console commissioning. No sample was uploaded and no original was modified.

## Reproduce

```sh
python3 -m unittest discover -s tests -p 'test_build_klais.py'
python3 tools/build-klais.py --inventory-only
python3 tools/build-klais.py --workers 4
```

Defaults: source is the composer's local `2020 Organo Klais Sampler/wav` collection; output is ignored `.local/klais`. Override with `--source` and `--output`; those directories must be disjoint. `--limit N` produces an explicitly partial manifest. `--include-originals` opts into encoding the long Reaper source recordings; they are inventoried but excluded from the prepared performance library by default. Do not change that policy without accounting for their size and conflicting labels.

Requires Python's standard library, a working libsndfile with Ogg/Vorbis support, libvorbis, ffprobe and ffmpeg. No Python packages or system repairs are needed on the inspected Mac. Other machines must supply these dependencies; this script does not install them.

Outputs are `inventory.json`, `benchmark.json`, `source-stats.json`, `manifest.json`, `build-stats.json`, encoded `audio/` and `.receipts/` cache entries. Inventory includes all source header types and probes, relative source paths, audio SHA256 and playback exclusion policy; source-stats groups audio duration/bytes/counts. Inventory-only recreates both inventory and source stats. Full conversion also recreates benchmark, manifest and build stats.

Resume checks original SHA256, the encoding profile including library implementation versions, encoded SHA256, codec/rate/duration and a full decode. A valid receipt skips re-encoding. New encodings use unique temporary OGG files and publish under immutable source/profile/encoded-hash paths before atomically replacing the manifest after all tasks succeed. A changed source, missing receipt or later encoding failure cannot overwrite a previously published valid asset. A receipt is an optimization; SHA256 identifies the concrete files. Source hashes are byte hashes, not claims about identical musical content. Identical encodes across independent runs are not guaranteed because OGG stream metadata may differ; resume preserves existing validated bytes. Failed builds may leave unreferenced files. Packaging must copy only manifest-referenced assets, not the whole working directory; retain old assets until a deliberate cleanup/rollback policy permits removal.

## Inventory and performance bundle

| Category | Files | Original bytes | Duration seconds |
|---|---:|---:|---:|
| Filename-mapped performance cuts | 529 | 977,765,440 | 3,693.787203 |
| Unmapped standalone cuts/takes | 12 | 93,007,196 | 328.605115 |
| Reaper project original takes, inventory only | 14 | 700,113,554 | 2,430.942480 |

The full collection contains 653 non-dot files: 542 WAV, 13 AIF, 27 Reaper projects, 27 reapeaks and 44 extensionless files. Header inspection confirms 555 audio files. Every extensionless file is a zero-byte `Icon_` placeholder, not audio. Original WAVs are stereo/24-bit: 540 at 44.1 kHz and two at 48 kHz. The prepared bundle contains 540 recordings at 44.1 kHz and one at 48 kHz, all stereo.

The complete default conversion produced **541 Ogg/Vorbis files, 60,343,659 bytes (57.55 MiB)**, about 5.63% of their 1,070,772,636 original bytes. Source durations sum to 4,022.392318 seconds. Four encoding workers completed the final immutable-asset build with complete source inventory in 26.27 seconds on this Mac; this is a local observation, not a portability/performance guarantee. Every included encoded file passed a full `ffmpeg -v error -xerror` decode and codec/channel/rate/duration checks. Listening, clipping, pitch measurements and browser decoding remain separate acceptance steps.

Manifest content hash for that run:

```text
9e489c2326cb78aa296c9ca15c65f70f1f4ef48958a7d60ac6f00f45833d5c36
```

`contentHash` is SHA256 of compact UTF-8 JSON with recursively sorted keys and `ensure_ascii=False`, excluding the `contentHash` field itself. A later completed build may legitimately replace it; inspect the actual local manifest for the current hash.

## Encoder decision

The installed default ffmpeg exposes native experimental Vorbis but no `libvorbis` encoder. Native experimental Vorbis was not used. Installed `oggenc` fails startup because its old FLAC dependency is missing; old ffmpeg installations also fail dependency loading. No dylib symlinks or system package modifications were attempted.

The working path uses **libsndfile 1.2.2**, backed by **Xiph.Org libVorbis 1.3.7**, through Python ctypes. It opens OGG|VORBIS and calls `SFC_SET_VBR_ENCODING_QUALITY` (`0x1300`) with a double **0.5** (Vorbis quality 5), requiring `SF_TRUE` before writing any audio frames. Samples are transferred in float buffers with source channel count and sample rate. This performs ordinary integer-to-float sample representation conversion, without peak normalization, gain changes, resampling or mono conversion. No loop points are invented. Source comments/metadata are not copied into the manifest.

This is a **new profile with unverified historical precedent**: neither Plankton nor vocals supplied a usable original OGG/encoder setting in this investigation. Quality 5 is a provisional space/quality choice; listening comparison is still pending.

Two representative mapped recordings were encoded at q4/q5 and fully decoded:

| Source | Duration | q4 bytes | q5 bytes | Channels / rate |
|---|---:|---:|---:|---|
| `1manual_19_23_24/1manual_19_23_24_A#1.wav` | 6.962925s | 80,452 | 103,917 | 2 / 44,100 Hz |
| `pedaltutti-10/pedaltutti-10_G3.wav` | 7.149637s | 112,404 | 133,263 | 2 / 44,100 Hz |

Benchmarks are capped at 12 seconds; these two files are shorter. They establish successful encoding and byte costs, not perceptual equivalence.

## Registration and keyboard coverage

Each top-level source folder remains one recorded combination. These are not isolated physical stops. The unclassified top-level `filtro1.aif` remains separate. Empty source buckets remain visible rather than becoming fabricated instruments.

| Registration ID | Samples | Mapped roots | Filename MIDI range |
|---|---:|---:|---|
| `1manual_19_23_24` | 32 | 31 | 24–84 |
| `1manual_21_23` | 31 | 31 | 24–84 |
| `1manual_26_27_28_31` | 0 | 0 | — |
| `1manual_cresc` | 3 | 0 | — |
| `1manual_crom` | 31 | 31 | 24–54 |
| `1manual_tutti` | 31 | 31 | 24–84 |
| `2manual_37_41_42_43` | 1 | 0 | — |
| `2manual_38_39` | 32 | 31 | 24–84 |
| `2manual_55_60` | 31 | 31 | 24–84 |
| `2manual_tutti-39-43-44` | 31 | 31 | 24–84 |
| `3manual_52_53_54_57_58_59_60_61_62_63_66_67` | 31 | 31 | 24–84 |
| `3manual_52_57_61_62` | 31 | 31 | 24–84 |
| `3manual_55_60` | 31 | 31 | 24–84 |
| `3manual_57_67` | 30 | 30 | 24–82 |
| `3manual_cresc_tutti` | 5 | 0 | — |
| `3manual_tutti` | 31 | 31 | 24–84 |
| `4manual_73` | 31 | 31 | 24–84 |
| `4manual_tutti_73_74_75` | 31 | 31 | 24–84 |
| `pedal1_flauta32` | 32 | 32 | 24–55 |
| `pedal_2_4_7` | 32 | 32 | 24–55 |
| `pedaltutti-10` | 32 | 32 | 24–55 |
| `tutti_staccato_clusters` | 0 | 0 | — |
| `unclassified` | 1 | 0 | — |

Root mapping recognizes a final note token such as `_A#2`, with **C4=60**, and marks every result `filename-derived`. This is unverified tuning/pitch metadata. Most manual folders have sparse whole-tone roots; `1manual_crom` has a different chromatic span. The engine must show extrapolation/transposition honestly and must not confuse available recorded roots with approved physical-organ note ranges.

Unmapped files are the three unnamed `_` WAV cuts, three `1manual_cresc` cuts, five `3manual_cresc_tutti` cuts and `filtro1.aif`. Keep them available as manual one-shots, excluded from keyboard root selection. Filename take numbers and `_ST_48` are not MIDI notes. All loops are `null`; the current data cannot sustain a note beyond the recorded tail without an explicitly reviewed loop or alternate synthesis decision.

No byte-identical duplicate source files were found among the 541 playback candidates. The 14 original takes may contain the same audio material as edited cuts; they are preserved in inventory and excluded by default, rather than treated as additional keyboard zones. Questionable original labels include `3manual_57_67/proyecto/` containing a filename naming first-manual `26272831`, and `3manual_55_60/proyecto/` containing `52576162`. Do not resolve those inconsistencies by renaming source files or inferring stops.

## Manifest delivery boundary

Manifest schema version 1 uses `registration.samples` ID arrays, `sample.hash` encoded SHA256, `sourceHash` original SHA256, `rootMidi`, `mappingStatus`, `frames`, duration, channel/rate, byte count and relative URL. Immutable URLs follow `audio/<relative parent>/<source SHA256>/q5-<profile hash prefix>/<encoded SHA256>/<source filename>.ogg`. URLs retain the source extension before `.ogg` to prevent stem collisions and percent-encode sharp/space characters; physical filenames remain unchanged. A URL ending `_A%232.wav.ogg` requests the physical `_A#2.wav.ogg` file after normal URL decoding.

Source-relative paths are provenance only. No absolute source directory, credentials or personal identity is published in the manifest. Rights remain unverified; no public distribution is authorized by successful encoding. Locally serving this generated library is distinct from uploading it to GLIP production. The actual browser sampler integration and any deployment require their own validation.
