# Apomixis

![Apomixis](https://i.imgur.com/0UWsxV8.png)

Apomixis is a generative cycle for automaton organ. The project explores how code can produce musical behaviors that exceed direct single-performer gesture through dense temporal layering, timbral mutation, repetition, and formal self-replication.

Apomixis is the first planned score for HYLON, a reusable performance editor/runtime. GLIP is intended to supply the Klais sampler; the planned public Apomixis viewer will show generations, formal state and lyrics. The full ecosystem remains under development; the initial offline capture console is available below.

Read [AGENTS.md](AGENTS.md) for the consolidated requirements, evidence, architecture, parallel workstreams, interfaces, safety gates and acceptance criteria.

## HYLON offline field console

The local interface is implemented in `apps/hylon/`: passive per-registration SysEx/CC/PC capture, MIDI device selection, audio routing/meters, a layered Klais multisampler, single-file audition and laser screen preview. Physical note output is available through explicit MIDI I/O enable; explicit HELIOS frame output is available; captured SysEx replay remains unavailable.

Prepare once with Node.js 22+ and Internet access:

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:4173` in Chrome or Edge. After preparation, starting the built console needs only Node and the local files; no Internet or npm installation is required. On macOS, double-click `tools/HYLON.command`. Keep its Terminal open. For local live updates use `tools/HYLON-dev.command` or `npm run dev` at the same localhost:4173 origin (stop the static server first); CSS hot updates and automatic reloads require no manual refresh. `npm run check` runs local validation. The top-bar corner icon toggles fullscreen. For a frozen build use `npm start`; for a prepared offline ZIP use `npm run package:offline`.

Read [the field guide](docs/HYLON-FIELD-GUIDE.md) before the room visit. JSON export is the portable backup; browser storage is tied to this localhost origin and browser profile. This is an initial capture console, not the completed HYLON score runtime or a commissioned organ/laser controller.

## Klais sample library

The reusable engine is in `packages/glip-klais/`. The local bank contains 541 stereo Ogg/Vorbis samples across 23 source buckets: 529 filename-mapped roots and 12 unmapped one-shots. They preserve recorded registration combinations; they do not reconstruct isolated stops. Roots/tuning and sustain loops still need musical review.

Read [the sampler guide](docs/KLAIS-SAMPLER-GUIDE.md) and [asset audit](docs/KLAIS-ASSET-AUDIT.md). `npm run build:klais` generates the local encoded bank; `npm run package:klais` creates a self-contained offline ZIP with the verified referenced recordings. Samples, receipts and generated libraries stay outside Git under `.local/`; no public audio upload is performed. The lean `package:offline` build remains available without the bank.

The nine-piece cycle is:

1. Esporo
2. Gameto
3. Meiosis
4. Megaspora
5. Polygonum
6. Oosfera
7. Filotaxis
8. Proto-Espora
9. Microspora

## SuperCollider archive

The previous implementation is preserved under [archive/supercollider](archive/supercollider/README.md), following the composer's decision on 2026-11-11. It is historical compositional and migration reference, not the active runtime. Its MIDI and CC assignments are placeholders; do not run its setup or performance commands against connected hardware.

[Score notes](Apomixis_Score_Notes_EN.md) remain as compositional reference. The master records unresolved timing, register-name and hardware-mapping differences.

## Scope

This is a compositional workspace, not a turnkey software package. Some mappings and performance-side values are intentionally left provisional so they can be adapted to the instrument and hall in use.

## Public Note

This README is intentionally brief. Detailed routing, calibration, and production-specific setup are handled separately from this public overview.

## AUDIO pod

HYLON 0.3 adds the fixed stereo sampler channel, shared reverb/delay sends and returns, mic vocoder/chopper and minimal vertical faders with real stereo peak meters. Choose **05 AUDIO**; microphone processing starts muted. See [audio operation and verification](docs/AUDIO-POD-GUIDE.md).

## SPORE generator and TXT score

Choose **06 SPORE** in HYLON 0.5. The seeded generator, five-minute draft TXT score, voice bindings/couplings, transport and additive audition are separate modules. Expand its score editor to edit/import text and apply it with playback stopped. [Score source](scores/apomixis/spore/0.1.0-draft.1/score.txt) · [operation, grammar and verification](docs/SPORE-GUIDE.md). `npm run build:spore` regenerates the compiled JSON; `npm run check` checks consistency. Local audio uses the shared mixer; physical notes use the separate enabled MIDI OUT route. Laser frame output is a separate explicit operator action.

## MIDI note output and SUPER PANIC

HYLON 0.5 adds a MIDI I/O note tester, fixed Klais channels I–IV/pedal = 1–5, exclusive SPORE SIMULATION / LOCAL AUDIO / MIDI OUT buttons and a fixed header SUPER PANIC. [MIDI operation and verification](docs/MIDI-OUT-GUIDE.md). Select an output and ENABLE NOTE OUT before physical notes.

## HELIOS physical output

HYLON 0.6 simplifies **04 LASER** to CONNECT HELIOS → START OUTPUT / BLACKOUT, with live Size/Intensity sliders and collapsed Advanced settings. Actual one-shot frame transmission replaces the former preview-only implementation. Software defaults are not projector ratings. The composer reports working projection; see [HELIOS operation and verification](docs/HELIOS-POD-GUIDE.md).
