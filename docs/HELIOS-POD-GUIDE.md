# HELIOS field-test pod

Status: **screen preview complete; physical USB control is implemented; frame emission is not implemented/enabled**.
Branch: `codex/helios-pod`, based on the Klais multisampler branch. No production deployment.

## Operation

Launch the local console and choose **04 LASER**. The pod maximizes. Select a mode and press **START PREVIEW**. A mode change stops the current preview; start again deliberately.

- **FULL FRAME:** square at 100% normalized width/height, or the full-width top/bottom edge. Canvas edges have a one-pixel inset to remain visible. This is not a validated projector scan angle.
- **SWEEP:** a vertical line moves LR then RL; a horizontal line moves TD then DT. Repeat the four-pass sequence or select one direction. Control duration from 0.1 to 10 seconds/pass. Speed changes restart the phase.
- **TEXT:** editable screen text, up to 24 characters. Canvas text is not vectorized DAC geometry and cannot be transmitted.
- **MIDI / RANDOM XY:** choose the MIDI input in I/O, enable the pod's route checkbox and choose channel/all. Start preview. Note-on picks a fresh XY; screen alpha equals (velocity/127) × the configured intensity scale. Note-off (including note-on velocity zero) removes the point with the same channel/pitch. Repeated notes replace their point. Maximum 32 held points, oldest evicted. CC120/123 clear the corresponding channel. Demo emits one local C4/96 for 600 ms without MIDI device I/O.

Blackout, STOP ALL, input detach/change, hidden document, inactive/closed pod and USB disconnect clear the preview and held notes. An animation-clock gap exceeding 500 ms stops the preview. These are application controls, not independent laser safeguards.

## Physical USB connection

The composer explicitly authorized physical connection and revision of the master contract. **CONNECT HELIOS USB** opens the browser chooser filtered to `0x1209:0xe500`, opens the device, selects configuration 1 when necessary, claims interface 0 and selects alternate 1. It verifies interrupt endpoints OUT 6 and IN 3, then requests shutter close `[0x02,0]` and STOP `[0x01,0]`. Close TouchDesigner or other software using the DAC before connecting. No driver changes are made.

**DAC STATUS** sends `[0x03,0]` and validates response ID `0x83`. Ready/busy refers to the DAC's buffer status, not its optical state. **STOP DAC / CLOSE SHUTTER** sends the non-emitting control commands; **DISCONNECT** stops/closes then releases the browser device. Successful USB writes are transport acceptance, not mechanical/optical acknowledgment. Shutter close and STOP affect existing output from the DAC.

Control transfers have bounded waits and checked status/byte counts; errors close the device and require manual reconnect. No background retry queue, auto-connect, frame-send, shutter-open or firmware command exists. STOP ALL and preview stop request shutdown if the control path is available. Browser/page loss cannot guarantee delivery of a command.

Use Chrome/Edge on localhost. Permission selection remains a local browser gesture. The in-app test reached the chooser but returned no device selected; actual hardware open/claim/control transfers remain unverified. Mock tests exercise connection order, allowed commands, malformed responses, timeout, late open cancellation and disconnect. This control-only connection step does not require known scan ratings and does not enable frame emission.

## Projector configuration

Expand **PROJECTOR CONFIG / OPERATOR-REPORTED**. The operator reports projection onto a ceiling without public contact and previous TouchDesigner use. This is retained as context, not a tested exclusion zone or projector rating.

- Model, scan rate (PPS) and X/Y scan angle (degrees) are editable. Unknown ratings default to **blank**, serialized as `null`. PPS and angles are metadata only; they do not change screen timing or communicate with hardware. Form bounds are software input limits, not claimed operating ratings.
- Width/height, X/Y offsets, flip X/Y and intensity scale apply to screen geometry. Field plus offset must remain within normalized bounds. Full-frame tests fill the configured field. Initial field is 100% centered, intensity scale 10% for preview; these defaults do not constitute a physical operating profile.
- The target defaults to **Ceiling / operator-reported**. Exclusion zone, physical E-stop, interlock/shutter and independent scan-failure shutdown have unknown / operator reports present / operator reports absent states. A reported state is never promoted to verified.
- **APPLY / SAVE LOCALLY** validates the complete draft, stops preview and stores the profile at localStorage `hylon-helios-profile-v1`. Reload restores settings only, with preview stopped and USB unselected. Storage failure keeps settings for the current session and recommends JSON export.
- Export/import JSON uses schema version 1, a 16 KiB import cap and strict field validation. Imported `armed`, `verified` or other unknown fields are rejected. Import stops preview; it cannot grant output authority. Draft exports are validated but are not automatically applied.

## Evidence and remaining physical commissioning

The operator supplied the macOS HELIOS description (Gitle Mikkelsen, 1209:e500, product 0200, 12 Mb/s) and corrected the projector connection to DB-25. The projector is described as a generic Chinese ILDA unit. This confirms the operator's reported DAC identity, not projector scan limits, power, shutter/interlock wiring or a tested shutdown system. Our local `system_profiler SPUSBDataType -json` returned an empty inventory; physical access has not been independently verified.

Before adding/enabling luminous frame output obtain the projector's operating limits and an operator-approved calibrated field, exclusion zone, point/dwell/intensity constraints, independent E-stop/interlock/shutter and protection that stops exposure when scan/browser/USB updates fail. A standard ILDA connector alone does not establish those limits or protections. Full-width frames and stationary MIDI dots must not be treated as safe merely because they fit DAC coordinates. Physical MIDI points require a reviewed moving/blanked scan construction rather than a persistent stationary beam. No audience scanning.

The repository's `AGENTS.md` §9 requires: “Independent physical E-stop/interlock/shutter and watchdog able to stop emission when browser updates cease are required.” The physical control-only adapter is authorized without that evidence; luminous frame transmission and physical acceptance remain pending. A browser timeout, black canvas or zero-intensity frame cannot substitute for independent shutdown.

Primary protocol source for subsequent adapter implementation: [official HELIOS SDK](https://github.com/Grix/helios_dac). Its documentation specifies the ISP-DB25/ILDA interface. No community AGPL implementation was copied or bundled.

## Verification

- 50 Node tests pass, including normalized field closure, high/low edges, all sweep axes/directions/timing rejection, MIDI channel ownership, velocity scaling, note-off/zero-velocity, malformed input and bounded point count. Profile tests cover unknown ratings, incompatible/imported authority rejection, malformed values and bounded transformed geometry.
- Production build succeeds.
- Local browser verified full-square rendering, sweep direction controls, editable APOMIXIS text, demo MIDI point appearing, blackout clearing points and zero console errors. Browser viewport was mobile-sized. USB chooser returned no device selected; physical MIDI/laser emission were not exercised.
- MIDI device events use the existing selected-input capture path. Hardware timing and scan geometry remain unverified.

Configuration follow-up browser verification: invalid field+offset was rejected; valid width persisted across reload with PPS/angles still unknown and preview stopped. Test width was restored to 100%; no console errors. USB and physical emission were not exercised.

## Local updates and fullscreen

Fullscreen uses the custom corner icon in the top bar; Escape exits. Browser policy can deny fullscreen (the in-app test accepted an initial request and denied a later one); a readable fallback message directs the operator to Chrome/browser fullscreen.

For ongoing edits, run **tools/HYLON-dev.command** from the source checkout, or `npm run dev`. Dependencies must be prepared once with `npm ci`. Vite stays at loopback port 4173 with strict port checking; stop the static `npm start` server first. Use the exact origin `http://localhost:4173/` to retain the existing session/profile. Vite HMR applies CSS updates without reload; source changes may trigger automatic full reload. Full reload stops local sources and does not reconnect USB or resume patterns. Avoid editing during an irreplaceable capture or performance; export capture JSON first. The source bank is served through the same checked local asset handler in development (541 samples confirmed).

`npm run check` runs local Node tests, asset-tool tests and a production build. This is local validation plus automatic development rebuilds, not a cloud/production deployment pipeline. The prepared offline ZIP uses the frozen built server and requires rebuilding/repackaging to update.

Verification: Vite client connected and logged `hot updated: /src/style.css` without manual refresh; fullscreen control rendered; the bank manifest loaded through the development middleware. Browser control never sent frame/laser output.
