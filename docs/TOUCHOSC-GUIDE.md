# TouchOSC remote for HYLON

Status 2026-11-16: bridge checked by a local loopback only (encode/decode, commands, feedback). The layout
opens as valid XML and follows the property sets of layouts saved by the TouchOSC editor (lexml 5), but it
has not been seen running in TouchOSC, on the iPad or with the organ.

## Parts

- `tools/hylon-osc.mjs`: UDP bridge inside the remote session (`tools/hylon-remote.mjs`). It runs only while
  REMOTE is ON in HYLON, accepts private-LAN senders, and maps each address to the same closed commands as
  the web remote (same `schema.js` validation). At most 4 clients, 60 messages per second each.
- `tools/build-touchosc.py`: generates `touchosc/HYLON.tosc` (and `HYLON.xml` for reading). iPad landscape,
  1024 x 768, one page. Run `python3 tools/build-touchosc.py` after changing it.

## Connection

| TouchOSC (Connections > OSC) | Value |
|---|---|
| Host | the Mac's LAN address (the same one as the /remoto link) |
| Send port | 9000 (`HYLON_OSC_IN`) |
| Receive port | 9001 (`HYLON_OSC_OUT`) |

Feedback goes to the sender's IP on port 9001. The layout sends `/hylon/sync` when it starts and
`/hylon/ping` every 2 s; a client silent for 15 s stops receiving feedback.

## Addresses (prefix /hylon)

| Address | Type | Effect |
|---|---|---|
| /play /hold /reset | button | transport (play toggles play / stop) |
| /program/prev /program/next | button | registration program step |
| /score/01 … /score/09 | button | load that piece |
| /stopall /panic | button | STOP ALL, SUPER PANIC |
| /tempo /dur | fader 0–1 | TEMPO ×0.25–4 (log), DUR ×0.001–1 (log) |
| /vector/mu disp poly tuber cap | fader 0–1 | vector ×0–4 (0.25 = ×1); /vector/reset |
| /out/klais audio midi | button | SPORE outputs K, LA, MO |
| /impro/arm klais audio midi stop random empty follow | button | IMPRO pod |
| /impro/patch/1 … 9 | button | patch |
| /impro/route/SRC/DST | button | SRC, DST in pe go po re so; DST also R (random) |
| /impro/kind/SRC/KIND | button | TAP TAPL TAPR TAPA ARPU ARPD ARPB ARPR HOLDU HOLDD HOLDB HOLDR |
| /mix/samplerLevel localLevel micLevel tapeLevel reverbLevel delayLevel master | fader 0–1 | mixer |
| /mix/snapshot/1 … 4 | button | recall mixer snapshot |
| /process/audio midi laser | button | toggle |
| /fb/title /fb/section /fb/program /fb/time /fb/status | label (feedback) | text from HYLON |
| /fb/alert | feedback 0 / 1 / 2 | last 5 s of a section: the section label alternates yellow |

Buttons are momentary and send the address with no argument. Their lamp is the button colour, set by the
feedback, so a missed message cannot leave the tablet showing a state HYLON does not have.
