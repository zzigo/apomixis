# Organ pitch staff

Source implementation, 2026-11-13. No tests, build, browser or audio/hardware checks run under the composer rapid-session rule.

VEXFLOW is an independent Dockview pod opened or dragged from the left rail. The earlier keyboard-side100px widget is superseded. Compact proportional layout uses pod width/height with small margins, preserving glyph proportions and avoiding oversized inter-staff spacing. No footage legend. Sampler GAIN/REL/TR/STRETCH controls remain available in ADVANCED. Four staves: treble8va, treble, bass, bass8vb. White whole-note heads show held written pitches; colored heads show nominal sounding pitches from the currently drawn REGISTERS stop set. Channel5/pedal keyboard range uses bass writing. Simultaneous inputs retain per-note channel identity, so pedal notes use bass without moving manual notes into bass. Sharp spelling is a display convention; it is not score enharmonic analysis.

Reference: existing app MIDI C4=60, eight-foot unison. No new octave/transposition added to MIDI or audio. Composer-corrected visual compass: manual C2–C7 (61 keys, MIDI36–96), pedal C1–G3 (32 keys, MIDI24–55). Incoming MIDI is not octave-shifted: labels, staff placement and nominal sounding calculations retain MIDI C4=60. Legacy score ranges24–84 are not silently migrated. Manual8-foot/pedal16-foot are represented by stop selection, not by transposing the written note. Sampler TR, recorded filename roots, detuned celeste ranks, instrument tuning, mixture breaks and acoustic measurements are not inferred from the graph. This is a registration pitch projection, not audio transcription.

`packages/hylon-registers/sounding-pitches.js` derives fundamental pitches as note + coupling transpose +12log2(8/feet). Selected one-hop console couplers introduce FROM stops at the target keyboard's note. Tremulants have no separate pitch; reeds show their fundamental, not every overtone. Cornet/Fourniture/Plein-jeu rank ratios use the existing CATALOG.COMPOUND sketch model; actual register breaks/composition remain unverified. Mutations use nearest semitone notation, with tuning deviation in the hover description. Out-of-MIDI-range results are omitted rather than folded to a false pitch.

Colors are identical to REGISTERS footage palette:32red,16orange,8green,4cyan,2violet, mutation magenta, mixture yellow. White written notes occupy their own horizontal lane so8-foot unison remains distinguishable. Active stop numbers above the staves carry tooltips; no miniature legend is shown. REGISTERS render publishes only changed drawn sets to the sampler staff. No MIDI transmission or registration write is added.

Notes come from selected incoming MIDI/highlights (even with audioOFF), pointer/keyboard sampler audition, and existing sampler follower/score dispatch paths. It does not add visualization scheduling for score routes that never reach the sampler. Release, per-channelCC120/123, stop and disposal clear appropriate visual ownership. Layer changes retain the MIDI notation while audio voices retain their existing stop behavior. Display ownership capped64notes; drawing coalesces events at80ms and resizes via ResizeObserver independently from the audio clock.

VexFlow4.2.5 pinned dependency, Bravura entry with embedded music glyphs; no CDN/fonts fetch needed. API source consulted: https://github.com/0xfe/vexflow/tree/4.2.5/src. Pure pitch projection, notation UI and audio/device engines remain separate.


Active console register numbers appear above the notation in footage colors. Each written and resultant notehead shows its actual MIDI pitch below in muted text; clef octave displacement does not change that displayed number. SAMPLER uses5OCT/PED range buttons; the old2OCT visual crop is removed. No keyboard transposition changed.


## Compass and outer staves correction — 2026-11-13

Composer specifies manual C2–C7 and pedal C1–G3. The former manual visual range24–84 (C1–C6 with C4=60) is now36–96. This changes on-screen keyboard offerings, not incoming MIDI decoding, physical MIDI routing, sampler root metadata, score pitch values or the sounding-footage formula. Actual incoming24 still displays C1/MIDI24, not an invented C2. Instrument MIDI mapping was not physically verified; score ranges are a separate compositional decision.

Conventional organ writing uses two manual staves and one pedal staff. Composer explicitly keeps the four-staff pitch analyzer: outer G8va/F8vb muted, with visible octave8 numerals above G and below F. Colored result notes remain unchanged. The supplied official Palacio Libertad URL returned403; supplied Wikipedia page supports four manuals/pedal32 but does not establish numeric MIDI encoding. Adopted manual display compass is the composer's requested convention. No tests/builds/runtime/hardware checks.


## Staff size

Subtle −/+ buttons beside the active register strip adjust a locally persisted display zoom. Enlarging reduces available gaps between the four staves; note/ledger-label extents bound the compression. Uniform scaling is capped by current pod width/height, with+disabled at the fit limit. Pod resize or a newly wider pitch spread can reduce effective scale while retaining the requested zoom preference. No tests/builds/runtime checks run.
