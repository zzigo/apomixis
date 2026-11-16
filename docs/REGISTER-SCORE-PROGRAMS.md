# Score registration programs

Composer-authorized preparation workflow, 2026-11-13. Source implementation only; no tests, builds, UI or organ checks run.

REGISTERS **R** clears the drawn stop/coupler set locally and synchronizes the linked sampler. It does not reset the combination number, erase stored programs or send MIDI/SysEx. It replaces the old general-cancel0 button.

**G** compiles all real app TXT files whose numeric prefix is greater than00, in numerical piece order. INIT and unapplied editor drafts are excluded; the active applied score overrides its bundled file for indexing. All files must compile and all referenced stops/couplings must map before any new bank is saved. An error leaves the prior bank intact. Generation itself changes no transport, drawn registers, MIDI state or selected program. PLAY prepares/refreshes this index before starting when its pinned score hash or bank is stale.

Each section contributes its complete stop set plus couplers. SPORE hack sections additionally contribute a union of base and hack registers as a conditional alternative; the preparation sheet does not pretend this has a fixed firing time. Exact repeated console-knob sets share one program across all pieces; each section/time remains listed as a cue. Swell/crescendo are annotations and do not produce separate draw-knob programs. Footage catalogue aliases are explicit correspondences to the photographed console, retained in the TXT for operator review; acoustic identity and console-memory behavior are not verified by these numbers.

Existing stored combinations are preserved. Matching existing sets can be reused; new sets take the first free numbers01–9999. Repeated generation with unchanged files reuses the same sets. Modified scores may add new numbers, leaving old programs available; this deliberately avoids silently renumbering an already prepared organ. Up to five full pre-generation bank/manifest backups persist in localStorage under `hylon-registers-program-backups-v1`.

SCORE PROGRAMS is below the circular jambs: program | colored left-jamb numbers | colored right-jamb numbers | score/section/time references. Click a program to view its knobs. Global unmodified Left/Right arrows step the digital program outside editors. PGM/CC controls are in default-closed EXPERIMENTAL at the bottom; the local commander stays on one scrolling line with a sampler-link icon. Generated combination recall bypasses captured SysEx. The existing explicit PGM OUT/AUTO Program Change behavior is preserved: if the operator has AUTO enabled, clicking/stepping a program can still send its program number. G and R themselves never send it. Number mapping/channel remain the existing PGM controls; this workflow does not claim the organ accepts a particular PC numbering convention.

The download-arrow button exports `APOMIXIS-register-programs.txt`: programs, numbered console stops/couplers with actual labels, aliases and section/time references, plus an ordered cue sheet with swell/crescendo. Edited/deleted generated combinations are marked unavailable and export requests regeneration rather than outputting a stale bank. Generated metadata persists under `hylon-registers-generated-v1`; the existing `hylon-registers-programs-v1` bank remains the digital counter's source.

This prepares a manual console programming checklist. It does not write organ memory or schedule PCs/SysEx. Score playback updates the digital counter as a human recall cue only; it does not change the drawn knobs or sampler layers. Those follow-ups need the organ's observed combination workflow.

Source: `packages/hylon-registers/score-programs.js` (pure compiler/projection/planner/TXT export); `apps/hylon/src/registers-pod.js` (local controls/persistence/list). The explicit mapping uses `packages/hylon-registers/console.js` labels/aliases and score coupling FROM/TO/transposition tuples, so renamed score coupling IDs remain supported; unknown combinations fail rather than being guessed.


## PGM shorthand and manual performance cues

Both legacy `registers $VOICE ...` / `couplings ...` and new section-level `pgm ...` (optional braces) are supported. Use one form per section, plus optional legacy hack-registers. PGM arguments identify console registers, not memory program numbers.

```text
pgm 9 27 26, 28 29 43
pgm 2 I.bourdon8 II.salicional8
pgm I. bourdon8 II. salicional8 P. soubasse32
pgm +P.bourdon8 -26
pgm 32 43 +24
pgm
```

If any unsigned entries are present, they define the complete base set; signed additions/removals then apply to that base in their written order. Thus `pgm 32 43 +24` means the set32,43,24. If every entry is signed, edits apply to the preceding section's base set; a first-section delta starts empty. A bare `pgm` clears all stops/couplers. Braced forms remain compatible and use these same rules. Commas are optional whitespace separators with no left/right routing semantics. Lists use one line and at most one pgm per section. Numbers1–75 remain global console labels even after a division prefix. Division-scoped names accept I/II/III/IV/P (case insensitive), go/po/re/so/pe and declared voice prefixes such as $GO. Bare unique names work; ambiguous bourdon8 reports I/II/P choices rather than guessing. Current console spellings and historical catalogue aliases resolve to the same knob. Names and numbers can be mixed in either absolute or signed expressions. Exported preparation TXT includes each knob number, actual label and canonical standard-division name. Tremolo can be represented by a knob number or qualified .tremolo; it adds no pitched sample model. Supported couplers resolve by name or console number and become ordinary score coupling definitions automatically.

Numbers are allocated by complete-set identity, preserving existing combinations and choosing free slots for new sets. Inserting a score section therefore requires no explicit program-number edits, and existing console memories need not all shift. G and PLAY refresh mapping from actual compiled content, pinned by score hash; five previous bank/manifest backups remain available. A modified active applied score participates; an unapplied text draft does not.

PLAY/resume forces a brief digital flash at its actual position; later score sections flash only when their combination changes. The mirror in REMOTE receives the same cue state. Ordinary HOLD preserves the cue. STOP/reset repositions the cue without flashing while stopped. Identical sets reuse a number. SPORE conditional hack registration is selected after the first scheduled hack-note time is actually reached, latched for that section; seek/backward/reset clears prior timing state. Reconstruction of a conditional state before the first dispatched hack note after seek is not claimed. Conditional times in the exported sheet remain marked alternatives, not invented fixed times.

The cue path never calls goTo/applyDrawn/sync/sendProgram; it updates number/status only, bypassing MIDI even if PGM AUTO is enabled. Manual stepping and explicit PGM OUT retain their existing operator behavior. No tests/builds/browser/runtime/hardware checks run for this extension.


## Four app scores migrated — 2026-11-13

00-INIT,01-SPORE,02-GAMETE and03-MEIOSIS now use brace-free pgm in all30section base registrations. Each complete original stop/coupler set was translated through the explicit console mapping. Where strictly shorter, a nonempty changed set uses signed deltas from the preceding section; repeated sets and empty resets remain absolute. SPORE conditional hack-registers and all musical notes, timing, algorithms, voice ranges and named coupling definitions are retained. Versioned archival score files remain unchanged. INIT comments teach mixed unsigned/signed semantics and brace compatibility.

No tests, builds, compiler execution, browser checks or hardware checks were run. This is a source-text migration, not an approved score release or measured musical equivalence. The active in-browser score still follows the existing explicit file-load/APPLY workflow; unapplied local drafts are not overwritten. PLAY refreshes hash-pinned program mapping from the applied score.
