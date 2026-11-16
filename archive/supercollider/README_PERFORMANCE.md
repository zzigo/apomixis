# Apomixis Performance README

This document is the operational entry point for rehearsal, on-site MIDI remapping, section playback, and export of note data.

## 1. Load Order

Always load the project in this order:

```supercollider
"ApomixisSetKlais.scd".loadRelative;
"ApomixisCore.scd".loadRelative;

"01_Esporo.scd".loadRelative;
"02_Gameto.scd".loadRelative;
"03_Meiosis.scd".loadRelative;
"04_Megaspora.scd".loadRelative;
"05_Polygonum.scd".loadRelative;
"06_Oosfera.scd".loadRelative;
"07_Filotaxis.scd".loadRelative;
"08_ProtoEspora.scd".loadRelative;
"09_Microspora.scd".loadRelative;
```

After loading, all pieces are accessible through `~apxPieces`.

## 2. Available Piece Keys

```supercollider
~apxPieces.keys;
```

Expected keys:

- `\esporo`
- `\gameto`
- `\meiosis`
- `\megaspora`
- `\polygonum`
- `\oosfera`
- `\filotaxis`
- `\protoespora`
- `\microspora`

## 3. Basic Piece Commands

Inspect a piece:

```supercollider
~apxPieces[\megaspora][\postBlueprint].();
```

Play a full piece:

```supercollider
~apxPieces[\filotaxis][\playAll].();
```

Play a single section:

```supercollider
~apxPieces[\gameto][\playSection].(\bridge);
```

Stop a piece:

```supercollider
~apxPieces[\microspora][\stopAll].();
```

## 4. Human Intervention Summary

### `03_Meiosis`

- anthropomixis III
- three intervention windows:
  - `Replication`
  - `Bridge`
  - `Climax`

### `05_Polygonum`

- anthropomixis II
- improviser active through all five sections

### `06_Oosfera`

- anthropomixis IV
- three punctual human events only:
  - end of `Introduction`
  - `Bridge`
  - late `Coda` or immediately after the climax break

### `09_Microspora`

- anthropomixis I
- closing piece
- voice with ornamental pitch-following

## 5. Microspora Voice Control

`Microspora` now has two live input paths feeding the same ornament engine:

- MIDI IN note-follow on the placeholder channel below
- microphone AUDIO IN pitch tracking on the input channel below

```supercollider
~apx[\midi][\voiceFollowerInChan];
~apx[\audio][\voiceFollowerInputChan];
```

MIDI IN is input-only for SuperCollider. It is not an organ output channel.

Audio pitch tracking uses `SoundIn + Pitch.kr` and starts automatically when `Microspora` enters a vocal section or when the full piece is started. If the audio server is not running, the piece boots it automatically.

Basic audio calibration in the hall:

```supercollider
~apx[\audio][\voiceFollowerInputChan] = 0;
~apx[\audio][\voiceFollowerAmpThreshold] = 0.02;
~apx[\audio][\voiceFollowerActiveThreshold] = 0.015;
~apx[\audio][\voiceFollowerPreGain] = 1.6;
~apx[\audio][\voiceFollowerHPF] = 70;
```

If live voice-following is not connected yet, seed it manually:

```supercollider
~apxPieces[\microspora][\manualVoiceSeed].(64, 90);
~apxPieces[\microspora][\manualVoiceSeed].(67, 70);
```

Then play the section or the full piece:

```supercollider
~apxPieces[\microspora][\playSection].(\replication);
~apxPieces[\microspora][\playAll].();
```

## 6. On-site MIDI Remapping

All MIDI channels and CC numbers in `ApomixisSetKlais.scd` are placeholders and should be adapted in the hall.

### Select the output port

```supercollider
MIDIClient.destinations.do(_.postln);
~apx[\usePort].(0);
```

### Remap division note channels

```supercollider
~apx[\remapDivisionChannel].(\go, 0);
~apx[\remapDivisionChannel].(\po, 1);
~apx[\remapDivisionChannel].(\re, 2);
~apx[\remapDivisionChannel].(\so, 3);
~apx[\remapDivisionChannel].(\pe, 4);
```

### Remap stop CCs

```supercollider
~apx[\remapStopCC].(\go, \montre8, 21, 15);
~apx[\remapStopCC].(\re, \voixHumaine8, 60, 15);
~apx[\remapStopCC].(\pe, \contrebombarde32, 75, 15);
```

### Remap coupler CCs

```supercollider
~apx[\remapCouplerCC].(\ii_i, 79, 15);
~apx[\remapCouplerCC].(\iv_ped, 93, 15);
```

### Remap expression / crescendo CCs

```supercollider
~apx[\remapControllerCC].(\crescendoGlobal, 94, 15);
~apx[\remapControllerCC].(\expressionPositif, 95, 15);
~apx[\remapControllerCC].(\expressionRecit, 96, 15);
```

### Reset the console state

```supercollider
~apx[\allStopsOff].();
~apx[\allCouplersOff].();
~apx[\resetControllers].();
~apx[\panic].();
```

## 7. Registration Scenes

Scenes are reusable registration states stored in `ApomixisSetKlais.scd`.

Examples:

```supercollider
~apx[\applyScene].(\seedLoop);
~apx[\applyScene].(\megasporaDream);
~apx[\applyScene].(\filotaxisTutti);
~apx[\applyScene].(\microsporaVocal);
```

## 8. Tempo / Macroform Data

The macroform and tempo graph files are:

- [exports/apomixis_macroform_graph.md](/Users/zztt/Library/CloudStorage/GoogleDrive-lucianoazzigotti@gmail.com/My%20Drive/dev/wrk.d/19%20%20apomixis/bin/exports/apomixis_macroform_graph.md)
- [exports/apomixis_tempo_nodes.csv](/Users/zztt/Library/CloudStorage/GoogleDrive-lucianoazzigotti@gmail.com/My%20Drive/dev/wrk.d/19%20%20apomixis/bin/exports/apomixis_tempo_nodes.csv)

If you want the default tempo nodes registered inside SC:

```supercollider
~apxCore[\seedDefaultTempoNodes].();
~apxCore[\exportTempoNodes].("exports/apomixis_tempo_nodes_from_sc.csv");
```

## 9. MIDI Export

### Export section MIDIs for a single piece

```supercollider
~apxPieces[\esporo][\exportSectionMidis].();
~apxPieces[\megaspora][\exportSectionMidis].();
~apxPieces[\microspora][\exportSectionMidis].();
```

This writes to:

- `exports/midi/<piece-key>/`

Important:

- MIDI export depends on `SimpleMIDIFile`.
- If `SimpleMIDIFile` is not installed, SC will warn and skip the MIDI file export.

## 10. CSV Note Maps

CSV note maps are generated from the dense compositional patterns, not from live MIDI output. This means they remain useful even if the organ backend is not connected.

### Export per-section CSV note maps

```supercollider
~apxPieces[\filotaxis][\exportSectionNoteMaps].();
~apxPieces[\polygonum][\exportSectionNoteMaps].();
```

### Export one full-piece CSV note map

```supercollider
~apxPieces[\filotaxis][\exportWholePieceNoteMap].();
~apxPieces[\microspora][\exportWholePieceNoteMap].();
```

### Export everything for a piece

```supercollider
~apxPieces[\meiosis][\exportAllData].();
```

This writes to:

- `exports/note_maps/<piece-key>/<piece-key>_<section>.csv`
- `exports/note_maps/<piece-key>/<piece-key>_full.csv`

### CSV columns

- `piece`
- `section`
- `event_index`
- `chord_index`
- `start_beat`
- `start_sec`
- `dur_beat`
- `dur_sec`
- `sustain_beat`
- `sustain_sec`
- `division`
- `chan`
- `midinote`
- `velocity`
- `legato`
- `is_rest`

One chord produces multiple rows, one row per pitch, sharing the same event index and different `chord_index` values.

## 11. Recommended Rehearsal Workflow

1. Load setup, core, and all pieces.
2. Select the correct MIDI output port.
3. Remap note channels and CCs in the hall.
4. Test scene recalls:
   - `\seedLoop`
   - `\megasporaDream`
   - `\filotaxisTutti`
   - `\microsporaVocal`
5. Test one section from each of the three anchor pieces:
   - `\megaspora` `\introduction`
   - `\filotaxis` `\climax`
   - `\microspora` `\replication`
6. If the voice follower is not connected yet, use `\manualVoiceSeed`.
7. Export section MIDIs and CSV note maps for analysis or score preparation.

## 12. Recommended First On-site Checks

```supercollider
~apx[\postSummary].();
~apxCore[\postSummary].();
~apxPieces[\megaspora][\postBlueprint].();
~apxPieces[\filotaxis][\postBlueprint].();
~apxPieces[\microspora][\postBlueprint].();
```

## 13. Notes

- All stop and controller values are provisional placeholders until remapped in the hall.
- The current workspace does not include a verified Klais CC map.
- The codebase was prepared structurally, but I could not run `sclang` in this environment.
