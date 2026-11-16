# LAB scores 10–14 and the new score sentences

Source implementation, 2026-11-14. Checked only with the pure text compiler in Node (all nine app
TXT scores compile; `03-MEIOSIS` compiles to the same content hash before and after its `set`
refactor). No build, no test suite, no browser, audio, MIDI, organ or laser check was run. The
IMPRO pod, the `follow` wiring and the editor colours are unexecuted UI code.

Lab scores live beside the suite in `scores/` and load from the 00 selector / fast
buttons like any other file. Numbers 10+ are experiments to mine for the nine pieces.

| File | Experiment | Length | New sentences it exercises |
|---|---|---:|---|
| `10-IRIS` | iridescent chord, ms-gated staccatissimo, shadows, four laser glints | 270 s | `set`, `chord`, `silence` |
| `11-ANTHESIS` | tutti: scales, arpeggios, repeated notes, octave jumps, mega chords | 280 s | `pgm @family`, `chord … voicing stack`, `silence every` |
| `12-HUMUS` | noise by homogeneous families, 32' pedal zones | 270 s | `pgm @flutes/@reeds/@brass/@cloud2/@noise32`, whole-line `@SET` |
| `13-PSALM` | voice: psalmody + mic follower harmonies | 300 s | `psalm`, `verse`, `follow` |
| `14-IMPRO` | states for the IMPRO pod | 300 s | `impro` |

REGISTERS **G** indexes every file numbered above 00, so it will also allocate programs for the
lab scores. Existing programs are preserved; keep that in mind before preparing the console.

## Sentences

### `set NAME = tokens…` and `@NAME` (header)

A text macro. `@NAME` anywhere below expands to the tokens; a line may consist of a set
(`@CLOUD vel 100`). Inside `pgm`, `+@NAME` / `-@NAME` sign every token. Sets may use earlier sets.
Up to 64. Not expanded inside `bio`, `verse`, `relation`.

```text
set FLOWER = C4 D4 F4 A4 … dur 2 1 1 4 … anti A4 Ab4 G4 F#4 …
melody @FLOWER rate 1/4 div go shadow 0 …
```

### `pgm @family`

Built-in register families (`packages/hylon-registers/families.js`): `flutes bourdons strings
principals reeds brass mixtures mutations cloud2 noise32 pedalvoice voix trem f32 f16 f8 f4 f2
tutti`. A division prefix filters: `pgm III. @reeds` or `pgm III.@reeds +I.@brass`. Signs work: `pgm @tutti -74 -75`.
A `set` of the same name wins. The family lists are a first reading of the stop names and
should be corrected by ear at the console.

### `section ID "Name" for SECONDS bpm BPM`

Relative duration; the section starts where the previous one ends. `START to END` still works
and both can be mixed. `duration` in the header must still equal the total.

### `chord`

```text
chord E3:0,7,14,16 | E3,B3,F#4 pat x..x.x.. rate 1/16 ms 30->100 hold 5|3|7 morph 1 iris 1
      div go,po,re voicing split shadow 45 sdiv re sms 90 oct 0|1 tr 0|3 strum 0 prob 1 vel 84 rot 1
```

Chords are `ROOT:semitones` or note lists, separated by `|` (1–16 chords, 1–32 tones).
`pat` x hit, X accent, . rest; `rot` rotates it every cycle. `ms` is the attack length in
**milliseconds** (10 ms floor). `hold` = hits per chord (constant or `a|b|c`). `morph` 0 cuts,
1 lets tones migrate to the next chord one at a time across the hold. `iris` rotates the
tone→division assignment per hit. `voicing split` spreads tones over the divisions, `stack`
plays every tone on every division. `shadow` repeats each tone N ms later on `sdiv`
(`next` = the following division) for `sms` ms. `oct` jumps octaves per hit, `tr` transposes
per chord, `strum` staggers tones in ms. Numbers accept `a->b` ramps or `a|b|c` juxtaposition.

### `silence`

```text
silence 12 0.4 25 0.25          # AT DUR pairs, seconds from the section start
silence every 16 dur 0.12       # a hole ending on every 16th beat
```

Applies to every algorithm line of the section (not to native SPORE notes): attacks inside
the hole are dropped and ringing notes are cut at its edge.

### `psalm`, `verse`, `follow`

```text
verse "sin polen, sin encuentro / la semilla copia a la madre"
psalm init F3 G3 tenor A3 med Bb3 A3 fin G3 F3 E3 D3 verse 18 breath 3 syll 3 organum 0,7 div re,po ison D2
follow III 0 II 7 P -12
```

`psalm` works in seconds: one verse every `verse` s — intonation, tenor, mediant, half breath,
tenor, final, breath. `syll` re-attacks the tenor N times per second with seeded speech jitter.
`organum` doubles at intervals, one division per interval. `ison` holds a pedal note under
each half. `verse` stores the text on the section; the LYRICS pod and the public viewer draw it. `follow` replaces
the MIXER follower send matrix when the section starts; it never enables the follower and is
not saved to the matrix slots. Section changes are reported by the generator at generation
boundaries, so the switch can lag slightly.

### `impro` and the IMPRO pod

```text
impro src I tap II 0 250 tap III 7 500 tap IV 12 1000 rep 2 every 1500 stretch 1.25 tail 3 decay 0.8
```

Pod: nine editable state lines (same grammar), ARM, K/LA/MO routes, SCORE (the playing score's
`impro` line replaces the selected state), P pastes the state into SCORE TXT. While armed, a
note-on on the source channel schedules one owned echo per tap; at key release each echo is
retimed to held time × `tail` (clamped by `min`/`max` ms). Taps cannot target the source manual.
Global stops and panics disarm it. Echoes use the tester note path of the MIDI gateway.

## Known gaps

- `chord`/`psalm` do not rebuild held notes after a seek; long notes restart at their next attack.
- `psalm tr` is constant; verse-indexed modulation is not implemented.
- LIBRARY has no audition tab for `chord`, `psalm` or `impro`.
- Peak density (≈ 490 notes/s in `11-ANTHESIS` E, ≈ 400 in `12-HUMUS` E) is unmeasured on the organ.

## Velocity removed and LYRICS pod — 2026-11-14

Organ velocity is gone from the working surface: every note-on to the organ carries the fixed
`ORGAN_VELOCITY` (100, `packages/hylon-midi/klais-routing.js`). Removed: the MO VEL fader in MIXER
and REMOTE, the velocity fields of the I/O note tester and ATTACK, the `vel` knobs in LIBRARY,
`vel` in pasted lines and in all app scores. The parser still accepts `vel` so old texts load;
the value only shapes LOCAL AUDIO / KLAIS sampler loudness. `chord` X accents are therefore
inaudible on the organ.

LYRICS pod (rail icon after IMPRO): current `verse` accented, previous verse muted, "/" drawn as
the caesura, − / + font size stored locally. The current verse is chosen by time: the `psalm`
verse period when the section has one, otherwise the section divided evenly by its verses.
The LIVE frame now carries an optional `lyric {now, prev}`; `apps/apomixis` draws it over the
morphology. The public server keeps showing the old page until this viewer is deployed; the
old relay accepts the new frames unchanged. Compiler-only check; no build, browser or deploy.

## Session of 2026-11-14 (second part)

Scores now live only in `scores/` (app root no longer holds them); frozen snapshots moved to
`archive/scores/`. Three legacy MIDI files joined `apps/hylon/public/midi/`.

New labs: `15-BEFERA` (timbral blocks after Verrando, symbolic FM after Romitelli),
`16-HORVITZ` (harmonic and subharmonic rates), `17-LEGACY` (the 2020 SuperCollider sketches).

New sentences:

- `cresc A->B`, `exp3 A->B | A | A~B PERIOD`, `exp2 …` — manual gestures (crescendo pedal,
  expression boxes of III and II), positions 0–1. Display only: header preview chips CRESC / EXP3 /
  EXP2 with animated ▲ ▼ ∿ ■ and a live position bar; a chip blinks 3 s before its section.
- `chord FM:NOTE:C:M:PAIRS` — chord from the side bands of a symbolic frequency modulation.
- `rhythmicon NOTE… base S voices N mode harmonic|sub ms step arch accel prob div`.
- `bind degree|note|midinote … scale octave mtr dur legato ms div tr` — the SuperCollider event
  model; values are patterns `a|b|c` (Pseq), `a?b?c` (Prand), `a&b&c` (Pshuf).
- `lsys NAME = AXIOM iter N rules A>AB,B>A map A:50,B:55` (header) — an L-system as a pattern set.

Registration: G rebuilds the bank from zero (previous bank kept in the five backups). Each piece
owns its ten(s): piece NN starts at NN0; inside a piece numbers follow first appearance, repeated
sets reuse their number. The preparation sheet lists the range per piece and marks SLOW where a
change crosses a ten. Header preview (orange, right of the score buttons): next program in
seven-segment digits, arrow (> < neighbour, → same ten, ⇢ other ten, ⇄ loop), countdown, blinking
in the last 3 s; a loop of three or more changes between two programs shows `07⇄08 ×n`.

ATTACK pod (rail): MASTER minimum note length with per-division offsets, CLAMP / REMAP, driver
timestamps (TS, lookahead 5–60 ms), cap, profile export/import, a five-step procedure and the
attack tester (moved from I/O; it bypasses the floor). `packages/hylon-midi/attack-profile.js`
is pure; the gateway applies it in `schedule` and `retimeOwner`. With TS on, note-ons and
note-offs due within the lookahead are sent with their exact time; disarm and SUPER PANIC send
their releases after the lookahead so nothing queued in the driver can sound afterwards.

Checks: all twelve scores compile in Node; gateway floor and timestamps exercised with a mock port;
`tests/midi-out.test.mjs` has three failures that predate this session (panic and queue-size
expectations from before the P2 / relaxed-limit changes). No build, browser, MIDI or organ run.
Public viewer with lyrics deployed to the VPS as release 20261114T092622Z (service active).

## IMPRO: delivery fix and tap families — 2026-11-14

Fault found: the pod scheduled every echo at once, but the MIDI gateway refuses notes more than
250 ms ahead ("Invalid bounded MIDI note"), so with MO active the first played key disarmed the
pod and nothing reached LA either. Echoes now wait in the pod and are handed over when due
(20 ms timer, 60 ms horizon); echo length is still set at key release. Local synth also needs the
header LA button ON (global gate, default OFF); the pod status says so when it is off.

New clauses, count first, then DIVISION SEMITONES DELAY-MS of the first tap:

- `tapA 7 II 3 100` — arithmetic: +3 semitones and +100 ms at every step.
- `tapL 7 II 3 100 [ratio]` — geometric: each leap and gap is the previous × ratio (default 1.5;
  below 1 it converges). Pitches beyond the compass fold by octaves.
- `tapR 20 [maxInterval maxDelay]` — random division, interval (±24 default) and delay
  (≤ 4000 ms default), redrawn for every key.

DIVISION may be a list (`II,III,IV`) or `*` (all manuals except the source). Up to 64 taps.
Model checked in Node; the pod itself was not run.

IMPRO arpeggio clauses (same four values, sign of the step ignored): `arpU` up, `arpD` down,
`arpB` up then back through the same pitches (2·count − 1 taps); suffix `L` geometric
(`arpUL 7 II 3 100 [ratio]`), suffix `R` random (`arpUR 7 II 3 100`: each leap 1…3 semitones,
each gap up to 100 ms, redrawn per key). Plain form is arithmetic, so there is no `A` suffix.
They transpose the played key; they do not yet arpeggiate a held chord.

IMPRO held-chord arpeggiator: `holdU DIV MS [OCT]`, `holdD`, `holdB`, `holdR` run over the keys
currently down on the source manual (one note every MS, over OCT octaves, divisions rotating),
note length MS × tail. The pod status now reports every incoming note-on: channel and note, and
whether it was used, ignored (wrong channel) or received while not armed; ARM shows ARMING… and
the reason when it fails.

IMPRO routing is independent for K and LA: the pod's own K / LA buttons send its echoes straight to the mixer strips, bypassing the header K / LA gates (`audio.directDestination`, `resolveDestination` in the Klais engine for owners `impro:*`). So the player can hear the live manual on K (header K on, LA off) and the echoes on LA only (pod LA on). MO still needs M and the header MO, which stays the master switch for the organ. The score can arm the pod; ARM is a bordered switch, filled when armed.

IMPRO follows the header knobs: TEMPO divides tap delays (at the moment a key is played) and held-arpeggio steps (live); DUR multiplies every echo length (10 ms floor). Keys A S D F toggle ARM, K, LA, MO of the pod, open or closed; changing a destination no longer disarms.

## IMPRO botonera, patch selector and several sources — 2026-11-14

Grammar: a line may hold several source groups, each opened by `src X`
(`impro src I tap II 0 250 src III arpU 5 IV 3 100 tail 2`); globals (rep, every, stretch, tail,
decay, min, max) apply to all groups; a group cannot target its own source; each source once.

Pod layout: sub-header (ARM, K LA MO, SCORE, P, ■, ‹ digit ›, LEDs), status line, BOTONERA, the
nine patch lines, tap view. The digit shows the selected patch, or S while the score is in charge.

BOTONERA = a builder for the selected patch. One line per source manual (IV III II I P): routing
squares (target divisions and R = rotate over the other manuals) and that manual's own 2×2 squares:
TAP (T TL TR TA), ARP (A↑ A↓ A↕ A?), HOLD (H↑ H↓ H↕ H?), INT (−12 +3 +7 +12), MS (100 200 300 500),
N (×3 ×5 ×7 ×12). One kind per manual. R draws a random patch, E empties it. Every click rewrites
the patch line (`padLine` in packages/hylon-impro/model.js) and applies it at once. Typing in a
patch line detaches its pad.
The text stays the single source of truth. Model checked in Node; the pod was not run.
