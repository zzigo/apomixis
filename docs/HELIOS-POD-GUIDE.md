# HELIOS field-test pod

Status: **screen preview complete; physical emission is not implemented/enabled**.
Branch: `codex/helios-pod`, based on the Klais multisampler branch. No production deployment.

## Operation

Launch the local console and choose **04 LASER**. The pod maximizes. Select a mode and press **START PREVIEW**. A mode change stops the current preview; start again deliberately.

- **FULL FRAME:** square at 100% normalized width/height, or the full-width top/bottom edge. Canvas edges have a one-pixel inset to remain visible. This is not a validated projector scan angle.
- **SWEEP:** a vertical line moves LR then RL; a horizontal line moves TD then DT. Repeat the four-pass sequence or select one direction. Control duration from 0.1 to 10 seconds/pass. Speed changes restart the phase.
- **TEXT:** editable screen text, up to 24 characters. Canvas text is not vectorized DAC geometry and cannot be transmitted.
- **MIDI / RANDOM XY:** choose the MIDI input in I/O, enable the pod's route checkbox and choose channel/all. Start preview. Note-on picks a fresh XY; screen alpha equals (velocity/127) × the configured intensity scale. Note-off (including note-on velocity zero) removes the point with the same channel/pitch. Repeated notes replace their point. Maximum 32 held points, oldest evicted. CC120/123 clear the corresponding channel. Demo emits one local C4/96 for 600 ms without MIDI device I/O.

Blackout, STOP ALL, input detach/change, hidden document, inactive/closed pod and USB disconnect clear the preview and held notes. An animation-clock gap exceeding 500 ms stops the preview. These are application controls, not independent laser safeguards.

**SELECT HELIOS USB** invokes the browser chooser filtered to vendor `0x1209`, product `0xe500`. HYLON only displays descriptors. It never opens or claims the device, performs transfers, sends frames, changes shutter state or issues STOP. A device selected here is not an operational connection. Existing device activity from other software is unaffected. Use Chrome/Edge on localhost if WebUSB is available. No USB permissions are requested at startup or by tests.

## Projector configuration

Expand **PROJECTOR CONFIG / OPERATOR-REPORTED**. The operator reports projection onto a ceiling without public contact and previous TouchDesigner use. This is retained as context, not a tested exclusion zone or projector rating.

- Model, scan rate (PPS) and X/Y scan angle (degrees) are editable. Unknown ratings default to **blank**, serialized as `null`. PPS and angles are metadata only; they do not change screen timing or communicate with hardware. Form bounds are software input limits, not claimed operating ratings.
- Width/height, X/Y offsets, flip X/Y and intensity scale apply to screen geometry. Field plus offset must remain within normalized bounds. Full-frame tests fill the configured field. Initial field is 100% centered, intensity scale 10% for preview; these defaults do not constitute a physical operating profile.
- The target defaults to **Ceiling / operator-reported**. Exclusion zone, physical E-stop, interlock/shutter and independent scan-failure shutdown have unknown / operator reports present / operator reports absent states. A reported state is never promoted to verified.
- **APPLY / SAVE LOCALLY** validates the complete draft, stops preview and stores the profile at localStorage `hylon-helios-profile-v1`. Reload restores settings only, with preview stopped and USB unselected. Storage failure keeps settings for the current session and recommends JSON export.
- Export/import JSON uses schema version 1, a 16 KiB import cap and strict field validation. Imported `armed`, `verified` or other unknown fields are rejected. Import stops preview; it cannot grant output authority. Draft exports are validated but are not automatically applied.

## Evidence and remaining physical commissioning

The operator supplied the macOS HELIOS description (Gitle Mikkelsen, 1209:e500, product 0200, 12 Mb/s) and corrected the projector connection to DB-25. The projector is described as a generic Chinese ILDA unit. This confirms the operator's reported DAC identity, not projector scan limits, power, shutter/interlock wiring or a tested shutdown system. Our local `system_profiler SPUSBDataType -json` returned an empty inventory; physical access has not been independently verified.

Before adding/enabling physical output obtain the projector's operating limits and an operator-approved calibrated field, exclusion zone, point/dwell/intensity constraints, independent E-stop/interlock/shutter and protection that stops exposure when scan/browser/USB updates fail. A standard ILDA connector alone does not establish those limits or protections. Full-width frames and stationary MIDI dots must not be treated as safe merely because they fit DAC coordinates. Physical MIDI points require a reviewed moving/blanked scan construction rather than a persistent stationary beam. No audience scanning.

The repository's `AGENTS.md` §9 requires: “Independent physical E-stop/interlock/shutter and watchdog able to stop emission when browser updates cease are required.” USB adapter work and physical acceptance remain pending that evidence. A browser timeout, black canvas or zero-intensity frame cannot substitute for independent shutdown.

Primary protocol source for subsequent adapter implementation: [official HELIOS SDK](https://github.com/Grix/helios_dac). Its documentation specifies the ISP-DB25/ILDA interface. No community AGPL implementation was copied or bundled.

## Verification

- 45 Node tests pass, including normalized field closure, high/low edges, all sweep axes/directions/timing rejection, MIDI channel ownership, velocity scaling, note-off/zero-velocity, malformed input and bounded point count. Profile tests cover unknown ratings, incompatible/imported authority rejection, malformed values and bounded transformed geometry.
- Production build succeeds.
- Local browser verified full-square rendering, sweep direction controls, editable APOMIXIS text, demo MIDI point appearing, blackout clearing points and zero console errors. Browser viewport was mobile-sized. USB chooser and physical MIDI/laser were not exercised.
- MIDI device events use the existing selected-input capture path. Hardware timing and scan geometry remain unverified.

Configuration follow-up browser verification: invalid field+offset was rejected; valid width persisted across reload with PPS/angles still unknown and preview stopped. Test width was restored to 100%; no console errors. USB and physical emission were not exercised.
