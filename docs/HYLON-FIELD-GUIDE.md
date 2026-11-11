# HYLON 0.4 — offline field guide

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

1. Open **02 I/O**. Leave **Request SysEx permission** checked and press **CONNECT MIDI** yourself. If SysEx access is denied, inspect browser/OS permissions; uncheck it and reconnect only if you want CC/PC-only observation. The status must say whether SysEx is enabled.
2. Choose the exact **MIDI input**. Nothing selects a device automatically. Capture channel defaults to all; SysEx has no channel and is always eligible from the selected port. Output selection is informational and remains locked: this build has no MIDI send or replay path.
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

Audio is optional for capturing MIDI. **ENABLE AUDIO** starts the shared local audio context; **START INPUT** separately requests microphone access. Choose a device, then explicitly start it. Stop cancels late permission results and tears down old tracks when switching.

PROCESS A/B route two processing lanes from the channels the browser reports for the **same selected input device**. A mono source can feed both lanes; this is not a promise of two independent USB interfaces or arbitrary multichannel hardware access. Channel selection/gain/meters are available per lane. Monitoring is muted by default and must be explicitly enabled. No recording or pitch follower is included yet.

Audio output selection uses `AudioContext.setSinkId` when the browser supports it; otherwise choose the output in system audio settings. Master level applies to this audio context, including the sampler. These settings remain local to this running console; a capture JSON does not restore device authority or audio configuration.

## Klais multisampler and file lab

**03 SAMPLER** expands the instrument pod. The full Klais ZIP includes 541 stereo OGG samples; the small console-only ZIP does not. The local source checkout reads a prepared `.local/klais` bank, or `HYLON_KLAIS_DIR` if configured.

Select up to eight recorded combinations, warm their cache, then play the screen keyboard or explicitly route the selected MIDI input to local audio. The inspector provides original-speed audition for unmapped cuts. The reusable engine has 64 voices and a 128 MiB retained decoded cache. Source roots use provisional filename convention C4=60; sustain loops are not assigned. No MIDI output is sent.

Read the [Klais sampler guide](KLAIS-SAMPLER-GUIDE.md) for preparation, controls, mapping limits, verified asset counts and memory/loading behavior. The collapsed Single-file lab retains manual WAV/OGG/AIFF audition; while open, it receives MIDI only if its own routing checkbox is enabled. Files are never uploaded and must be reselected after reload.

## Laser

**04 LASER** provides screen-only phyllotaxis/line preview, bounded geometry controls, reduced-motion handling and Blackout. It requests no USB permission and cannot emit a physical laser frame. Blackout clears this screen only.

Helios connection/output remains a separate commissioning milestone after the sampler: actual projector limits, venue exclusion zones, independent hardware interlock/shutter/watchdog and shutdown verification are still needed. MIDI/audio do not depend on a laser adapter.

## Layout and stop

Drag Dockview tabs/splits to arrange the workspace. Layout is remembered locally with separate narrow/wide profiles. **I/O MODAL** moves the same configuration controls into a dialog; close it to return to the dock. **RESET LAYOUT** restores capture-first arrangement. On narrow screens the pods are tabs.

**STOP ALL** ends capture, stops local sampler voices, stops audio input/monitoring and blacks out screen preview. It sends no MIDI, CC reset, SysEx or USB. It is not an organ panic or physical laser emergency stop.

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
