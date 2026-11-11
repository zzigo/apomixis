# Apomixis

![Apomixis](https://i.imgur.com/0UWsxV8.png)

Apomixis is a generative cycle for automaton organ. The project explores how code can produce musical behaviors that exceed direct single-performer gesture through dense temporal layering, timbral mutation, repetition, and formal self-replication.

Apomixis is the first planned score for HYLON, a reusable performance editor/runtime. GLIP is intended to supply the Klais sampler; the planned public Apomixis viewer will show generations, formal state and lyrics. The full ecosystem remains under development; the initial offline capture console is available below.

Read [AGENTS.md](AGENTS.md) for the consolidated requirements, evidence, architecture, parallel workstreams, interfaces, safety gates and acceptance criteria.

## HYLON offline field console

The first local interface is implemented in `apps/hylon/`: passive per-registration SysEx/CC/PC capture, MIDI device selection, audio routing/meters, local sample audition and laser screen preview. It has no physical MIDI transmission or laser emission.

Prepare once with Node.js 22+ and Internet access:

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:4173` in Chrome or Edge. After preparation, starting the built console needs only Node and the local files; no Internet or npm installation is required. On macOS, double-click `tools/HYLON.command`. Keep its Terminal open. For development use `npm run dev`; for a prepared offline ZIP use `npm run package:offline`.

Read [the field guide](docs/HYLON-FIELD-GUIDE.md) before the room visit. JSON export is the portable backup; browser storage is tied to this localhost origin and browser profile. This is an initial capture console, not the completed HYLON score runtime or a commissioned organ/laser controller.

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
