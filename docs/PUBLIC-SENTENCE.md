# `public`: a score sentence for audience participation

Added 2026-11-16. Module: `packages/hylon-public/sentence.js` (pure: parser, form, notes). Parsed in `packages/spore/text-score.js` as a section directive. Runtime: `publicGestures` in `apps/hylon/src/spore-pod.js`. Haptic return: `apps/apomixis/garden.js`, driven by `garden.pub` in the live frame.

## 1. Syntax

One per section, on one line:

    public mark hold into go,po keys top 3 call 250 cross cancel reenter 2 memory 8 passes 1->3 ms 22 gap 28 feel 12->40
    public off

| Term | Laws of Form | Meaning | Range, default |
|---|---|---|---|
| `mark hold\|tap` | the mark | the gesture; `hold` gives a charge 0–1 (full at 1.5 s) | `hold` |
| `into DIVS` | the space of the mark | divisions that sound | go po re so pe; `go,po` |
| `keys top N` | its content | the N highest keys of each division | 1–12; 3 |
| `call MS` | law of calling | a mark within MS of an accepted mark is the same mark | 0–5000; 0 |
| `cross cancel\|queue\|pass` | law of crossing | a mark made while a mark sounds cancels it; or queue, or drop | `queue` |
| `reenter STEP` | re-entry | each mark in memory lowers the next mark by STEP semitones | 0–12; 0 |
| `memory S` | re-entry | how long a mark stays in memory | 0.5–120 s; 8 |
| `passes A->B` | | sweeps over the keys, by charge | 1–8; `1->3` |
| `ms N`, `gap N` | | note length and distance between attacks | 22, 28 |
| `feel A->B` | | vibration (ms) on the phone at release, by charge; 0 = none | 0–200; 0 |

With no terms the sentence reproduces the burst of the first performance (01 SPORE).

## 2. Limits today

- 01 SPORE carries it in two sections since 2026-11-16: I "Suspended seed" (0–6 s: one key of manual I, everything within 1.5 s condensed into one mark) and C2 (234–258 s: the full form with cancel and re-entry). The other sections of 01 have no sentence and keep the first-performance burst. Previous score: archive/scores/01-SPORE-pre-public-score.txt.
- The public relay forwards gestures only while piece 1 plays, and enforces one gesture per listener per 1.5 s and four per second per hall. These are outside the sentence.
- The viewer implements `hold` only; `tap` is parsed and treated as charge 0.
- `feel` needs the Vibration API (absent on iPhone Safari, as far as known) and the updated viewer deployed on the VPS.
- Not tried in the browser, on the organ or with an audience. Checked with `node --check` and a Node model run only.
