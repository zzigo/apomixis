# SPORE — independent generator and TXT draft score

HYLON 0.4 integrates the composer's **SPORE sketch v2** as **06 SPORE**. The original HTML is preserved byte-for-byte at `references/spore/sketch-v2.html`; the original external file is untouched. This is a candidate for Apomixis 01 Esporo, not an approved complete score release or public LIVE viewer.

## Where each responsibility lives

| Component | File / responsibility |
|---|---|
| Authoritative editable score | `scores/apomixis/spore/0.1.0-draft.1/score.txt` |
| Compiled artifact | Same folder `score.json`, canonical payload SHA-256 |
| Text grammar and compiler | `packages/spore/text-score.js` |
| Pure generator | `packages/spore/engine.js`: genotype, automaton, mutation, texture and typed event intent |
| Vocabulary | `packages/spore/catalog.js`: logical stop/coupler vocabulary and harmonicity modes |
| Local transport | `packages/hylon-runtime/transport.js`: bounded lookahead, pause/seek, epochs and audition rate |
| Audio adapter | `packages/spore/audition.js`: additive study in HYLON's supplied context/destination |
| HYLON adapter | `apps/hylon/src/spore-pod.js` and `spore-renderer.js`: controls, text editor and source-derived graphics |

The generator imports no DOM, timers, AudioContext, MIDI, USB, network or HYLON UI. Score text contains data, not executable code. Neither voice variables nor a coupling can select/arm hardware. The additive adapter is replaceable without changing composition. A future Klais adapter needs explicit mappings between logical registrations and recorded combinations; those are not interchangeable today.

## Voice variables and couplings

Header example from the actual score:

```text
SPORE-SCORE 1
id apomixis.spore
version 0.1.0-draft.1
title "SPORE"
number esporo
duration 300
seed 1931
audition-transpose 12
source-sha256 b9fd61ecc755e34e837bb6adbcf7948d202616a347fd51646c9c8a75485c2e2f

voice $GO = go range 24 84
voice $PO = po range 24 84
voice $RE = re range 24 84
voice $SO = so range 24 84
voice $PE = pe range 24 53

coupling ii_i = $PO -> $GO transpose 0
coupling iii16_i = $RE -> $GO transpose -12
coupling ii4_ii = $PO -> $PO transpose 12
```

Variables may be renamed (for example `$GO` → `$GROUND`) consistently in the header, register assignments and couplings. Declare exactly one variable per logical division. Ranges are provisional MIDI note numbers, C4=60; the source pedal range is preserved at 24–53, distinct from the ecosystem's proposed 24–55 maximum. Ranges must span at least 12 chromatic notes; folding preserves pitch class.

**Coupling direction:** `$FROM -> $TO` means FROM's declared stops also sound when TO's keyboard is played, as in the source II–I coupling. It does not create an independent trigger or sum MIDI inputs. Transpose is −12, 0 or +12. Couplings are **one-hop, parallel additions**, not recursive graph traversal; mutual and self octave couplings do not recurse. No physical organ coupler messages are sent.

The header declares named couplings; each section activates them:

```text
registers $GO bourdon8 fluteHarmonique8 prestant4
registers $PO bourdon8 fluteOctaviante4 clarinette8
couplings ii_p iii_ii
```

These lines are inside a complete section. A section begins with `section ID "Name" START to END bpm BPM` and ends with `end`. Required lines: `relation`, `rule B.../S... "Name"`, `texture`, `mutation`, `field`, `cap`, `dispersion`, `polyembryony`, `tuber`, `swell`, `crescendo`, `couplings`, `bio`. Register lists use voice variables; `-` means none. Optional `hack true`, `extinction true` and `hack-registers` preserve the source Climax/Coda behavior. Missing register lists are empty. All five sections must cover 0–300 seconds contiguously.

Header `fertility $VOICE OPEN CLOSE` controls band opening/closing (`end` uses duration). `harmonicity SECONDS "Mode" "Annotation"` defines the curve. Repeated times express jumps. Whitespace separates tokens, double quotes encode JSON strings, whole-line `#` comments are ignored. The grammar rejects unknown directives, scripts, ports, undefined variables/couplings, unsupported ranges and malformed/nonfinite values; input is capped at 64 KiB and 1024 lines. No eval/import facility exists.

## Operation

1. Choose **06 SPORE**. Playback starts stopped, with **LOCAL AUDIO** off. PLAY first runs the generator visually. Views show actual generator state and generated note intent, not a separate animation simulation.
2. Expand **SCORE TXT / VOICE BINDINGS / COUPLINGS**. Edit or import a TXT file, then **APPLY SCORE TXT**. Validation finishes before replacing the active score. Successful apply stops old sources, replaces score/generator, resets transport and shows the new hash. Invalid text leaves the active score intact.
3. Editor text is saved as a local **unapplied draft**. Reload always starts with the bundled active score, stopped; a saved editor draft requires APPLY. **EXPORT SCORE TXT** exports active text; **EXPORT EDITOR TXT** exports the editor's current draft. Import only loads editor text and does not apply/play it.
4. For sound, select **LOCAL AUDIO**, then PLAY. Changing the audio route pauses playback. The additive study feeds the shared AUDIO **sampler stereo channel**, so its fader and reverb/delay sends also process SPORE. It does not open a new context or add a second reverb. The sketch's hidden +12 audio octave is now explicit in the score header, pending musical review. This is not the sampled Klais or an exact organ model.
5. Texture, polyembryony and harmonicity controls configure subsequent generations and enter a generation-indexed journal. Manual harmonicity is a fixed value until changed, not render-clock glide. The score curve remains deterministic.
6. Seek or a macro click replays from the seed under **current controls** and leaves playback paused. It skips past attacks and does not re-sound notes already underway. Seek resets the control journal for that new run. Pause/explicit resume preserve future queued starts but cut currently sounding voices. RESET returns to zero; APPLY SEED accepts uint32, including zero. Speed changes cancel/reschedule future local output.
7. Switching to AUDIO may leave SPORE running so its mixer can be adjusted. Closing the SPORE pod, global Stop All, page hide, input loss/change or HMR reload stops its output; none auto-resumes. Stop All also clears shared FX tails. No organ MIDI or laser output is added.

Keyboard controls are scoped to the focused SPORE pod, not the whole app. Click a figure to focus it. Space toggles transport; MACRO 1–5 seeks sections; MICRO 0–4 selects score/tutti/striated/hocket/granulation; HARMONICITY 1–9 and Shift+1–8 choose the source banks, arrows step modes and 0 toggles polyembryony. Drag/wheel the harmonicity figure for manual control. Inputs/editor consume their own keyboard events.

## Contracts, limits and deliberate migration changes

`MusicalEvent`: `eventId`, `sourceId=spore`, `generationId`, `atSessionMs`, `division`, `kind` and `payload`. Note payload includes voice variable, MIDI note, velocity, finite `durationMs`, logical scene and lineage. Scene payload is unverified stop/coupling intent; it grants no device capability. The v1 format supports this SPORE draft; it is not the full planned nine-number ScorePackage schema.

Lifecycle: init/configure/start/step/stop/snapshot/restore/dispose. Each instance owns its RNG. A snapshot pins engine version, score hash, uint32 seed, generation, RNG state and bounded control journal. Restore validates and deterministically replays into a candidate, verifies RNG agreement, then replaces state **stopped**. No arming/device state is importable. HYLON exports a session JSON with snapshot, actual generated history and explicit `publicLive:false`; it is not a published release or an exact captured performance recording.

Preserved: source seed, five sections/tempos, 61×25 substrate, genetic motifs, fertility progression, division registers, one-hop couplings, textures, tubers, satellites and harmonicity curve. Source-derived canvases are adapted to local pod state; no iframe or second scheduler/audio context is embedded.

Changed deliberately in engine `spore-0.1.0`:

- Hocket uses seeded Fisher–Yates instead of a random sort comparator, avoiding engine-dependent comparator calls.
- Manual harmonicity changes are generation-indexed inputs; drawing cadence cannot consume RNG or change genetics.
- Notes starting beyond 300 seconds are omitted and durations are clipped to the score end. Stop/seek/reload cancels scheduled voices, fixing the sketch's lingering audio.
- Source genotype IDs remain identity; the inherited 16-base DNA display is not a collision-free genome key (its source packing consumes 33 bits for a 32-bit display).
- Logical VOICE/COUPLING binding and TXT compilation are explicit. MIDI ranges remain provisional, never a physical authorization.

Bounds: fixed 1525 cells, at most 20000 historical genomes, 4000 recent note intents, 60000 archived note intents, at most 1201 restorable generations for allowed score tempos, bounded step windows and 4096 queued events. Local audition drops new attacks above 45 per real second and caps additive oscillators at 280; these are software audition budgets, not certified organ limits. Generated-intent views/logs retain composition that can be dropped by audition limits, and counters report drops. Browser timer stalls over 300 ms stop transport rather than catch up in a burst. Audio scheduling uses the shared audio clock with 100 ms lookahead; visual-only simulation uses monotonic performance time.

## Versioning and verification

TXT is authoritative. `npm run build:spore` compiles the source TXT into JSON; `npm run check:spore` rejects stale JSON. `contentHash` is SHA-256 of UTF-8 JSON with recursively sorted object keys, compact separators and its own hash field excluded; this is the project's canonicalization, not an RFC8785 claim. The compiler and payload validator own the v1 contract; `contracts/spore-score.schema.json` supplies its structural JSON schema. Semantic coverage/references and the hash are additionally checked by the compiler/tests.

`npm run check`: **60 Node tests + 7 Python asset tests**, source/compiled-score consistency and build. Tests cover voice renaming, named couplings, parser rejection, range/duration bounds, isolated RNG, full-run determinism, snapshot continuation, transactional rejection, pause cancellation, rate limits and stale-clock stop. For seed 1931, the bundled draft produces 6367 typed events (6362 note intents and 5 scene intents), 326 generations and one surviving cell. Other seeds/edits may differ.

`/spore-check.html` is a dev-only, non-audible harness excluded from the production bundle. Five browser checks passed: complete TXT/generator agreement with Node; snapshot replay; finite additive audio in a supplied OfflineAudioContext; named PO→GO coupling adding exactly one voice; cancellation of a future scheduled note. Main UI verified invalid-text rejection, renamed voice bindings, 200-second seek/playback and no console errors. Actual organ/sample mappings, exact tuning, subjective listening, physical hardware, public viewer and full concert load remain unverified.

The offline ZIP includes built application, `scores/SPORE.score.txt`, compiled JSON and this guide. It requires no remote script/font/audio dependency for SPORE. No production deployment or automatic publication is authorized.
