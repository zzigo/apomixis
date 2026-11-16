# MIDI PROCESS / attack tester

Local source implementation, 2026-11-13. Workspace save/recall specifically checked at composer request; no MIDI-process/attack audition, physical MIDI, audio or laser tests run. No full build/test suite run.

## M-MORPH in LIBRARY

Load MIDI A and optionally B, via upload or the local library selectors. Analysis runs in a module Worker using pinned @tonejs/midi2.0.28; Standard MIDI format0/1 with PPQN timing, max8MiB/100000notes/file. Files stay on this Mac, parsed into note events with tempo-map time conversion. Shows name, duration, note count/range, source tracks/channels, peak polyphony and source tempos. Unsupported SMPTE/type2 or empty files report an error. This is note processing, not raw SysEx/CC/registration replay; original controllers/program changes are not transmitted.

Controls: start/window seconds; slide seconds per loop (can be negative); speed multiplier; random-octave probability and ±range; harmony offsets in semitones (include0 to retain original pitch); morph A→B; transition length in loops and final morph/octave targets; seed; output division/source/cycle; optional octave folding into manual36–96/pedal24–55. Awindow loops, advances by slide and wraps over valid start positions. Bwindow follows A's normalized position. Morph pairs onset-sorted quantiles on stable slots, interpolates pitch/onset/duration/velocity and weights seeded slot presence between A and B; it does not infer a harmonic analysis or track meaning. Transition0 leaves settings fixed; positive transitions interpolate toward targets by loop count. Randomness is deterministic from seed/cycle/note. M-MORPH is its own tab alongside ARP/PEDAL/CELL. GUI edits enter a rolling live projection while playing; both automatic transition progress and window slide use fractional loop position.

Window import reconstructs notes already crossing the left edge, clips duration at window end, and limits raw windows4096notes/processed8192notes. Piano roll shows processed notes/division hues, with playhead. PLAY with all output togglesOFF is visual preview. K/LA/MO enable existing audition destinations; MO requires the operator's MIDI output alreadyON. Source channels1–5 retain canonical organ mapping; higher source channels map toI by the explicit SOURCE option. No automatic MIDI device enable, laser cue or register recall.

Export creates note-only Standard MIDI with requested1–64processed windows, max100000notes, preserving processed seconds at the encoder's default tempo reference. Exported pitches are the processed values, not new sampler root metadata. Neither file buffers nor parsed notes persist in localStorage. Five initial Messiaen files moved from the repo midi/ into apps/hylon/public/midi/ (filenames preserved); index.json supplies A/B library options. Those assets are local Vite/offline-build resources and were not uploaded to the independent public APOMIXIS relay.

## I/O ATTACK

One shared instance lives in configBody, so modal and I/O pod use the same tester. K/LA/MO route buttons, explicit PLAY/STOP, note48/velocity64/duration50ms/speed5Hz defaults. TargetALL rotates P,I,II,III,IV one attack per step; individual target selects one division. RANDOM chooses the division randomly per attack (not a random pitch). Speed0.1–1000Hz is total requested attack rate, not per-manual BPM. Gate10–2000ms. Overlapping attacks on the same MIDI pitch/channel may be coalesced by the existing shared gateway; the status identifies overlap so it is not mistaken for a mechanical limit. The default48note lies inside both manual and pedal ranges.

## Scheduling, ownership and limits

note-lab-player.js supplies independent note ownership for both labs. WebAudio LA uses scheduled finite triangle envelopes to the existing local mixer bus; K uses owned sampler follower voices/timers. MIDI uses new owned tester schedule/stop methods on the existing gateway, never raw note or SysEx bypass. Stopping one lab releases only its owners. Global STOP/SUPER/P2/PS, capture, hidden page, I/O close or LIBRARY hide stop the relevant producers; MIDI port/arming-epoch loss stops MO labs, audio-engine loss stops local routes. Pending prepare operations are revocable. Existing STOP TEST NOTES also stops the two new tester producers.

There is no claim of1000Hz mechanical performance or submillisecond browser precision: gateway tick and sampler timers remain browser-scheduled, same-pitch overlaps share ownership, budgets and sample stretch/lease constraints remain. MIDI gateway defaults1000attacks/s, configurable up to5000, finite notes minimum10ms. Local lab voices cap2048jobs and600s; actual Klais sampler retains its existing voice/30s limits. Stalls over300ms or dense-window scheduling excess stop the lab instead of catching up with a burst.

## Tempo range

Shared score validation and LIBRARY audition now allow12–2400BPM (previously capped240). RATES already reach1/128, so faster attack density can also come from subdivisions and voices without speeding the whole form. MEIOSIS hocket pulse floor lowered12ms→1ms for requested onset generation; note-duration clamps in output adapters remain10ms and can produce overlaps at faster rates. Existing event/voice/queue budgets remain independent of BPM; high tempo times many voices can exhaust them. No automatic physical test or density-budget increase was performed.


## Continuous morph refinement — 2026-11-13

M-MORPH no longer waits for a loop restart. It recalculates the processed view at most every50ms (earlier for valid control edits), keeps transport phase, and dispatches on a25ms timer with a60ms rolling lookahead. Subsequent tiny windows are projected into that horizon as needed. Automatic morph/octave transitions and slide position use fractional loop progress. Invalid transient input text retains last valid settings rather than stopping a performance.

Stable per-loop note/harmony IDs and a fired set prevent reattacking unchanged notes on each redraw. Future notes that move are cancelled/rescheduled by owner. Active pitch/channel changes replace only that voice; held durations can be retimed, local-audio amplitude can follow velocity changes, removed harmonies release their owners. Active MIDI velocity is not aftertouch; it applies to subsequent attacks. MIDI note-end retiming touches owned queue/voice metadata, not controller/SysEx messages. Klais sample/voice limits still apply. Seeded octave choices remain stable until the evolving probability changes their inclusion, avoiding arbitrary20Hz random jitter.

Switching ARP/PEDAL/CELL/M-MORPH stops the former audition and shows only its own controls. M-MORPH stores tab selection through the existing library preference; imported files remain memory-only. Export continues to generate parameterized per-window MIDI snapshots, not a recording of live gestures (explicit tooltip); live performance capture is a separate feature. No tests/builds/browser/audio/MIDI/hardware checks run for this refinement.
