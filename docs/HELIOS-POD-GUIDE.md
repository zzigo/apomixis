# HELIOS — connect, output, blackout

HYLON 0.6 implements physical USB frame output. The earlier build only connected the DAC and sent STOP/shutter-close; its preview could never project anything. The composer has now reported that physical projection is working. Optical power, scan angles, protection effectiveness and latency have not been independently measured.

## Normal operation

1. Close other software using the DAC (such as TouchDesigner).
2. **04 LASER → CONNECT HELIOS** and select the device.
3. Choose FRAME, SWEEP, TEXT or MIDI XY; press **START OUTPUT**.
4. **Size** and **Intensity signal** update live, including intensity zero and recovery. No second START is needed. **BLACKOUT** stops frame production and requests shutter close/STOP. Header **SUPER PANIC** also disconnects the DAC and stops the rest of HYLON.

The standard controls are pattern, size and intensity; scan/alignment and diagnostic controls are collapsed under Advanced/Connection Details. Defaults are 20000 PPS, a centered 20% field and 5% green/intensity control signal. They are software starting values, **not verified projector ratings or an optical power percentage**. Preview remains readable at low signal and does not represent optical brightness. Use a controlled projection area with no people in the beam; software is not an independent projector interlock.

Connecting alone never opens the shutter for projection. Startup, reload, score restore, JSON import, reconnection and MIDI notes never auto-start output. **PREVIEW ONLY** displays the same vector geometry without transmitting frames. Pattern/alignment/import/reset changes stop output and require START again; the two main live sliders do not. SWEEP speed is also live. HMR code updates still stop output intentionally.

## Patterns

- **FRAME:** square, high edge or low edge, spanning the configured normalized field. Size 100% is the full DAC coordinate range, not a calibrated optical angle.
- **SWEEP:** vertical line LR/RL, horizontal line TD/DT, or the four-direction sequence; 0.1–10 seconds/pass.
- **TEXT:** vector strokes for A–Z, 0–9, space and dash. Up to 12 characters, subject to the frame point budget; overly complex text fails visibly and stops output rather than truncating a scan. Default HYLON and APOMIXIS fit at 20000 PPS.
- **MIDI XY:** selected MIDI input/channel, up to eight held loci; velocity scales signal. Each locus is a small scanned ring rather than a stationary beam. Note-off/zero velocity releases it. No held notes means blank output frames. Demo note is local; it does not send MIDI.

## Settings

Advanced offers PPS (8000–40000 software range), center offsets, axis flips and settings import/export. Alignment changes validate before application. The field plus offset must remain inside the normalized bounds. Invalid edits preserve the previous valid settings. RESET DEFAULTS restores the centered starting values with output stopped.

New physical settings are stored under `hylon-helios-output-settings-v1`. Old preview-only `hylon-helios-profile-v1` data is retained but not auto-applied to real output: previously saved 100% preview fields and reported-protection checkboxes do not silently authorize emission. Optional settings JSON remains schema version 1 and bounded at 16 KiB; imported settings stop output and cannot arm it. Unknown metadata remains unknown. No operator-reported safety checklist is required in the ordinary UI or treated as a hardware test.

## Frame/control implementation

`packages/hylon-laser/frame.js` compiles geometry, and `helios-usb.js` owns physical transport. The point format follows the [official HELIOS SDK](https://github.com/Grix/helios_dac/tree/master/sdk/cpp): packed 12-bit X/Y, 8-bit RGB/intensity, little-endian rate/count trailer. The included MIT notice preserves SDK attribution. No community AGPL code is bundled.

CONNECT selects VID1209/PIDe500, configuration/interface 0 alternate 1, then requests shutter close and STOP. Explicit START checks bulk OUT endpoint 2, waits for the firmware's documented 100 ms delayed-STOP window, polls readiness (interrupt OUT6 / IN3, status 0x83), primes a fully blank frame, then requests shutter open. Only then are lit pattern frames accepted.

Every frame uses **SINGLE_MODE (flag 2)**: supported USB firmware plays once and stops on underrun rather than looping the last frame. Frame duration is at most 40 ms, points at most 1600, with blanked travel and dark frame boundaries. Short patterns pad with darkness rather than dwell on lit points. The SDK's problematic USB-length workaround adjusts count/rate and preserves trailing blanking. Invalid/nonfinite coordinates, unsupported rates, out-of-budget geometry and stationary lit traces are rejected. These are software bounds, not a substitute for calibrated projector scan/power limits.

The pump is serial, readiness paced, with at most one transfer operation in progress. No unbounded frame queue or automatic retry/rearm exists. BLACKOUT invalidates an output epoch immediately, preventing a pending readiness reply from producing a late frame or shutter-open. Transfer failure closes/stops the adapter; hidden page, pod hide/close, browser stall and disconnect stop output. SUPER PANIC prioritizes shutter-close/STOP/disconnect. USB acceptance and frame counters do not independently confirm optical shutter position or beam extinction.

## Verification

Automated tests use mock USB devices only. Node tests cover packet packing/trailer, blank boundaries, live geometry, SDK length adjustment, invalid/stationary traces, blank priming before shutter-open, readiness/backpressure, transfer failures and cancellation during pending start/frame operations. Existing MIDI, sampler, audio and SPORE checks remain in `npm run check`.

Development-only `/helios-check.html` mounts the actual pod with mock USB and isolated settings storage. Five browser checks verify compact defaults and dark connection, preview-only isolation, actual bulk frame calls/shutter sequencing/SINGLE_MODE, live intensity zero/recovery and size changes, and blackout without late transfers. No real projector is started by this test. The harness is excluded from the production build.

The composer independently reported working physical output during this implementation. That is operator observation, not a measured scan/power or emergency-shutdown certification. Actual optical behavior should be assessed on the rig. No production service, driver, firmware or online deployment was modified.

## Header shortcut / 0.7

Header **L** duplicates connection/start/blackout. **Shift+L** or pod **TEST □ / 1s** explicitly starts a centered full-field square for one second at the current PPS and intensity, then stops. Size/offset overrides are transient; saved alignment and normal pattern remain unchanged. Tests never resume prior output. Selecting USB alone in the pod still stays dark. Automated command checks use mock USB only.

## Four-corner mapping

The pod is named LASER consistently with the navigation. Main preview uses an 80% width / 48vh height cap; the small original preview shows generator geometry before mapping. Drag or keyboard-adjust TL/TR/BR/BL handles. In 0.7.1, size, offset and flips are applied first, then the optional full-viewport projective map in both preview and frame compilation. DAC interpolation is bounded after transformation. Mapping persists as optional `warpQuad` in schema-1 profiles (absent in older profiles means identity); invalid/folded/tiny quads are rejected. RESET MAP restores identity. Full-size timed tests use the current mapped zone. Geometric validation does not measure the projector or calibrate optical power.

## 0.7.1 live controls / explicit warp

- Square **W** toggles warp live. It always starts **OFF**, even with a saved non-identity quad. OFF bypasses the stored map; turning it off does not erase the corners. Reload never restores warp enable.
- The dashed polygon and handles are screen-only guides, visible when W is ON. Reset handles occupy the full preview W/H, independently of pattern Size. The guide is not sent to the projector.
- Valid pattern, geometry, direction, text, point-size, RGB and profile/alignment edits keep the current transmission running. Candidate edits are compiled before committing; invalid text/profile/frame budgets leave the previous values active. BLACKOUT, timed-test completion, visibility loss, stalls and USB faults still stop output.
- **R/G/B** sliders set the global color mix for all patterns. Signal intensity remains scaled by note velocity in MIDI XY. Old profiles default to green. Zero RGB transmits darkness without stopping the pump.
- **MIDI XY / Point size** starts at minimum on each load. Each note appears as one tiny locus; increasing size expands it. Physical frames retain a small scanned loop (adaptive to the active size/mapping), not a stationary held beam. Note-off releases the locus.

Verification: 89 Node tests, 7 asset tests, score check, production build and 10 mock USB/browser checks. The browser checks seed a displaced stored quad to verify default bypass, exercise live pattern/geometry/text/point-size/RGB/warp controls, confirm full W/H handles and dashed guide, check RGB wire bytes, roll back invalid edits and verify no repeated shutter-open/START during changes. Actual optical color, alignment and spot appearance remain operator verification.

Alignment follow-up: PPS, center X/Y and flips apply automatically as valid values change; APPLY ALIGNMENT has been removed. Center controls are sliders bounded by the current field size. The square W toggle and visible WARP OFF/ON state now sit in a sticky toolbar immediately above the preview. With WARP OFF the handles/guide are hidden and saved corner coordinates are bypassed; WARP ON reveals the full-area dashed guide. The actual Chrome operator tab was inspected read-only to confirm the toggle is visible and no APPLY button remains. Automated frame verification still uses mock USB only.
