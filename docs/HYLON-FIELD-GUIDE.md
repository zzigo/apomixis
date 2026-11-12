# HYLON 0.6 — offline field guide

Purpose: take the laptop to the hall, identify the organ's incoming stop messages and leave with an independent capture backup. This build prioritizes **capture and MIDI/audio configuration**, followed by **local sampler audition**, then **laser screen preview**.

## Open the console

For the prepared ZIP: extract it, double-click `tools/HYLON.command` on macOS, and keep its Terminal window open. It starts a loopback-only server and attempts to open Google Chrome. If Chrome is unavailable, open `http://localhost:4173` in Chrome or Edge yourself. Node.js 22+ must already be installed. Nothing is downloaded by this launch. Stop the server with Control-C in its Terminal.

From the source checkout, prepare once while online:

```sh
npm ci
npm test
npm run build
npm start
```

Then open `http://localhost:4173`. Subsequent offline launches need only `node tools/serve.mjs` and the built `dist/` directory. `npm run dev` is for development; do not rely on development dependencies or an Internet connection in the hall. To generate a prepared ZIP on macOS/Linux, run `npm run package:offline` (requires the system `zip` command); output is `.local/HYLON-offline.zip`.

Use the **same URL, port, browser and browser profile** throughout the visit: IndexedDB storage is origin/profile-specific. `localhost` and `127.0.0.1`, or different ports, have different archives. This is a local server build, not a PWA or file:// application. No service worker, account, cloud token or CDN is required. Phone/LAN audience operation is not implemented here.

## Capture a registration

1. Open **02 I/O**. Leave **SysEx** checked and press **MIDI ON** (or header **M**). This selects the exact **USB MIDI Device** name in both directions when available, opens input and enables notes on the selected output; there is no second note-enable button. If SysEx access is denied, inspect browser/OS permissions; uncheck it and reconnect only if you want CC/PC-only observation. The status must say whether SysEx is enabled.
2. Choose the exact **MIDI input**. Nothing selects a device automatically. Capture channel defaults to all; SysEx has no channel and is always eligible from the selected port. Physical note output is separately enabled in I/O; starting capture disables it and releases owned notes. Captured SysEx/registration replay remains unavailable.
3. In **01 CAPTURE**, search or filter a division, then choose a registration. The 74 initial stop/tremulant/coupler labels come from the archived provisional catalog. They are not a verified console map. Use **ADD CUSTOM SLOT** for missing controls, scene messages or different console labels, and record details in Session notes.
4. Start with the registration OFF on the console. Press **CAPTURE ON**, activate only that registration, then **END CAPTURE**. The window accepts multiple SysEx/CC/PC messages, including repeated observations, for at most 15 seconds. It never echoes them.
5. Press **CAPTURE OFF**, deactivate that registration, then **END CAPTURE**. Repeat both transitions to compare messages. Do not infer that a repeated toggle is an idempotent ON/OFF command.
6. Inspect hex, source, message kind, byte length, timestamp and notes. Selecting another slot, changing input/channel/output, disconnecting, hiding the page or STOP ALL cancels the active capture window. Recorded observations remain.
7. Press **EXPORT JSON** regularly, after each division and before leaving. Import that file to verify a portable backup. **EXPORT .SYX** saves only complete SysEx messages for the selected transition; CC/PC and metadata remain in JSON. Import never arms capture or enables output.

**MIDI MONITOR** is a dock tab next to Registration capture. It logs incoming channel messages from the selected input. Notes cannot be assigned to registration slots. Clock and active sensing are ignored. The monitor is rolling and bounded; clearing it does not clear slot observations. Slot CLEAR is explicit and leaves the independent monitor history intact. Keep an exported backup before replacing a session or clearing observations.

For practice without devices: select **Demo input · practice only** in I/O, use CAPTURE ON/OFF and **ADD DEMO MESSAGE**. Demo frames are labeled `DEMO · NOT ORGAN DATA`; they are never sent anywhere. Start a new session before the real visit if you used practice data.

## Saving and limits

The current session is written to IndexedDB during activity, including continuous MIDI traffic. The footer distinguishes unsaved/saving/saved, memory-only mode and save failures. One tab owns the archive through Web Locks; another tab stays locked and cannot overwrite it. Close the first and reload the second to take over. Browsers without Web Locks use memory-only mode rather than risk conflicting writes.

A save on closing is best effort; do not treat closing the lid or an open tab as a backup. Private browsing, clearing browser storage, quota limits and crashes can lose local data. JSON export is the portable backup. A saved session restores observations only: devices must be explicitly selected again, and microphone/capture stay stopped.

Bounds: 4 KiB per MIDI frame/packet; two-second incomplete-SysEx timeout; 15-second capture windows; 64 observations per transition and per window; 256 slots; 2,000 rolling monitor events; separate 256 KiB raw-byte budgets for retained slot captures and monitor; JSON import up to 8 MiB; notes up to 4,096 characters. Drops/caps are reported. Export and start another session when needed. Large bulk organ dumps are intentionally unsupported; this tool is for per-control capture. FNV-1a checksums compare observations, not authenticity or verified device meaning.

## Audio I/O

Audio is optional for capturing MIDI. **AUDIO ON/OFF** in I/O, AUDIO or header **A** controls the same audio engine and microphone input. ON requests the selected mic with monitoring muted; OFF cancels pending mic/test work, stops local sources and input, clears FX and suspends audio without changing the master fader. Changing an active input reopens the chosen device. No duplicate START INPUT step is required.

PROCESS A/B route two processing lanes from the channels the browser reports for the **same selected input device**. A mono source can feed both lanes; this is not a promise of two independent USB interfaces or arbitrary multichannel hardware access. Channel selection/gain/meters are available per lane. Monitoring is muted by default and must be explicitly enabled. No recording or pitch follower is included yet.

Audio output selection uses `AudioContext.setSinkId` when the browser supports it; otherwise choose the output in system audio settings. Master level applies to this audio context, including the sampler. These settings remain local to this running console; a capture JSON does not restore device authority or audio configuration.

## Klais multisampler and file lab

**03 SAMPLER** expands the instrument pod. The full Klais ZIP includes 541 stereo OGG samples; the small console-only ZIP does not. The local source checkout reads a prepared `.local/klais` bank, or `HYLON_KLAIS_DIR` if configured.

Select up to eight recorded combinations, warm their cache, then play the screen keyboard or explicitly route the selected MIDI input to local audio. The inspector provides original-speed audition for unmapped cuts. The reusable engine has 64 voices and a 128 MiB retained decoded cache. Source roots use provisional filename convention C4=60; sustain loops are not assigned. No MIDI output is sent.

Read the [Klais sampler guide](KLAIS-SAMPLER-GUIDE.md) for preparation, controls, mapping limits, verified asset counts and memory/loading behavior. The collapsed Single-file lab retains manual WAV/OGG/AIFF audition; while open, it receives MIDI only if its own routing checkbox is enabled. Files are never uploaded and must be reselected after reload.

## Laser

**04 LASER** provides full-frame/high-low, sweep, text and MIDI XY previews. CONNECT HELIOS USB explicitly opens the selected DAC and requests shutter close/STOP; status, stop and disconnect controls are physical USB operations. Explicit START OUTPUT now opens the shutter and sends bounded one-shot pattern frames; connection alone stays stopped. Blackout clears preview and requests shutdown when connected. See **HELIOS-POD-GUIDE.md**.

The composer reports working Helios frame output; physical acceptance still needs rig assessment: actual projector limits, venue exclusion zones, independent hardware interlock/shutter/watchdog and shutdown verification are still needed. MIDI/audio do not depend on a laser adapter.

## Layout and stop

Drag Dockview tabs/splits to arrange the workspace. Each pod tab has a subtle **×** button (also keyboard accessible) to close it; reopen it from the top navigation. Closing sampler, HELIOS or SPORE stops its activity; closing AUDIO cancels pending mic monitoring and stops microphone input while leaving the shared sampler bus available. Layout is remembered locally with separate narrow/wide profiles. **I/O MODAL** moves the same configuration controls into a dialog; close it to return to the dock. **RESET LAYOUT** restores capture-first arrangement. On narrow screens the pods are tabs.

**STOP ALL** ends capture, stops SPORE/sampler voices and audio input, clears FX tails, releases owned MIDI notes, disables output and blacks out laser preview/requesting connected HELIOS shutdown. It sends no guessed registration reset or captured SysEx. **SUPER PANIC** additionally hard-mutes master, sends CC123/120 on all 16 selected-output channels and requests HELIOS close/STOP/disconnect. Physical response is not guaranteed; see **MIDI-OUT-GUIDE.md**.

## Verification record — 2026-11-11

- Node.js 25.9.0 on macOS; pinned Vite 7.3.8 / Dockview Core 5.0.0. The prepared static build contains no runtime CDN dependency.
- Automated mock tests cover passive SysEx/CC/PC capture, framing/channel/source isolation, malformed/imported data, caps/export roundtrip, input cancellation/routing and sampler validation/voice ownership.
- Browser checks: local HTTP 200, capture-first layout, explicit demo ON/OFF pair, IndexedDB restore disarmed, JSON export/import, exact binary SysEx export, shared I/O modal, local stereo WAV decode, screen preview/blackout, and browser console inspection.
- Physical MIDI/SysEx capture on the Klais, mic/hardware routing, speaker-output switching, real sample tuning/loops and physical Helios emission have **not** been tested. The app is ready for supervised capture testing, not certified hardware operation.

Relevant API references: [Web MIDI permission](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/requestMIDIAccess), [audio output selection](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/setSinkId). The exported session shape is documented in `contracts/capture-session.schema.json`; runtime checks additionally enforce MIDI framing, reference integrity, checksums and aggregate budgets.

## Audio mixer

Choose **05 AUDIO** for fixed stereo sampler/mic mixing, shared reverb/delay and mic vocoder/chopper. Mic processing starts muted and uses one selected A/B input lane; **ENABLE MIC FX** opens the selected device and deliberately enables monitoring. See **AUDIO-POD-GUIDE.md** in the prepared package or `docs/AUDIO-POD-GUIDE.md` in source.

## SPORE

**06 SPORE** contains the first independent generator and its five-minute TXT draft score. Header voice variables and named couplings compile to logical events. Start visually, or deliberately enable local additive audition through AUDIO. See **SPORE-GUIDE.md** and the independent `scores/SPORE.score.txt` in the prepared package. No physical organ output or automatic public publication is added.

## Note tester / MIDI output / SUPER PANIC

Use MIDI ON in I/O (or header M), then TEST NOTE. An explicit output selection also opens note output. SPORE has exclusive SIMULATION / LOCAL AUDIO / MIDI OUT output buttons. The fixed console mapping is Manual I–IV→channels 1–4, pedal→5. Header SUPER PANIC hard-mutes local audio and requests MIDI CC123/120 on all channels of the selected output plus HELIOS shutdown if connected. Ordinary capture/Stop All disables note output and releases owned notes. See **MIDI-OUT-GUIDE.md** in the prepared package.

## Compact header / HYLON 0.7

A/M/L mirror pod commands; green means audio running, MIDI input/output active (hover lists each direction), or laser emitting. Tooltips expose device/status details. The two thin green lines show physical mic channel 1 and final audio output peak, mapped from −60 to 0 dBFS; hover for values. They are software sample peaks, not calibrated acoustic/optical measurements.

Shift-click tests are also available in the pods:

- **A / TEST L → R:** 440 Hz sine, L for 0.5 s then R for 0.5 s, through the existing master at 0.1 signal amplitude with fades. No microphone permission is needed for the tone alone.
- **M / TEST 1 → 5:** note 60 / velocity 64, channels 1–5, attacks every 300 ms, duration 100 ms. MIDI ON is requested first if needed.
- **L / TEST □ / 1s:** centered full-field square, current PPS and intensity, then BLACKOUT. Temporary field size is not saved and prior output does not resume. USB selection is requested if needed.

STOP ALL, SUPER PANIC, page hide/reload and process OFF cancel pending tests. I/O uses two columns above 400 px of content width, otherwise one; TEST fields stay in a compact grid. Settings are available in pods as well as the header.

### Compact mixer, monitor and device memory

Device IN/OUT choices are short buttons (for example De / Um) with full names on hover; one click selects/opens the chosen path. Duplicate abbreviations receive numeric suffixes. MIDI channel selectors remain numeric. On reload, MIDI and audio enumeration runs without starting streams, attaching MIDI listeners or arming output. Browser permission may be needed on first use; microphone labels depend on browser permissions. The four selected IDs are kept in `hylon-io-devices-v1`; unavailable remembered devices are not silently replaced by a different available device. The MIDI header border pulses on received messages, with note-on brightness scaled by velocity.

AUDIO uses closely packed vertical faders with short level/send labels and hover descriptions. MIDI MONITOR is a compact single-line log with no row rules or introductory text; the trash icon clears it. Pod titles now match their workspace navigation names, including LASER.

LASER preview is 80% of its previous width/height cap, with a smaller original-generator preview. Drag the four mapping handles (or use arrow keys; Shift for fine adjustments) to fit a convex projection zone. Mapping is projective, shared by the preview and emitted frames, and retained/exported in the local profile as `warpQuad`. Legacy profiles default to the identity map. Size/alignment/flips still apply around the mapped shape. Crossed, concave, tiny or out-of-field quads are rejected. RESET MAP restores the four original corners. The one-second maximum-size test fills the configured mapping zone and does not overwrite saved size/alignment.

Verification for 0.7: 86 Node tests, 7 asset tests, deterministic score check and production build; 7 whole-console mock browser checks plus a separate reload/restored-selection check. Tests cover one-step device buttons, velocity pulse scaling, finite tests and stop cancellation, remembered output applied at audio start, and reload with devices selected but processes OFF. Four-corner projection mathematics and DAC step bounds are tested. Actual optical mapping, MIDI response, audio routing/perceptual quality and meter calibration still require operator rehearsal.
