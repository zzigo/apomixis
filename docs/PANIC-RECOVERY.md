# Panic recovery and optional SuperCollider PS

Updated2026-11-12 after the composer reports voices still sounding after both browser panics. That report supersedes any assumption that successful API writes prove silence. The precise failure cause is still unknown; no hardware diagnosis or successful release is claimed by this implementation.

## Controls

- **SUPER PANIC:** stop local producers, mute local audio, quick per-channel CC64/120/121/123=0 and bend8192, request HELIOS shutdown, plus two full note-off sweeps through the selected browser MIDI output. Laser failure does not prevent the MIDI sweep.
- **P2:** three passes. Each pass resets the16channels as above, sends128note-offs per channel, waiting after each immediate write; final channel reset at the end. No scheduled timestamp backlog. A requested1ms wait may be longer in browsers, so the routine can take tens of seconds. Progress counts dispatches/errors; note output remains disabled. Maximum five passes inside the bounded gateway API; the UI uses three.
- **PS:** stops HYLON producers, cancels an in-progress browser sweep and disarms browser MIDI, then asks the optional running SuperCollider receiver to perform the composer's routine three times through its already configured `~midi`. This is a separate MIDI path. PS does not start SuperCollider, pick its port, boot scsynth or evaluate arbitrary code remotely.

No panic emits a note-on. The existing MIDI I/O note tester remains the explicit way to send the separate test-note pattern supplied by the composer; no diagnostic notes are automatically sounded during recovery.

## Enable PS once in SuperCollider

1. Keep your known-working `~midi` MIDIOut assignment from the existing patch. The receiver deliberately does not guess a device/port name.
2. Open/evaluate `tools/supercollider/HYLON-PANIC-BRIDGE.scd` once in that same sclang session. It installs OSCdef on UDP57132 and prints a ready message. It does not send a panic during installation.
3. Leave SuperCollider/sclang running. Press PS in the desktop or remote header. To remove the receiver later, evaluate `OSCdef(\hylonPS).free;`.

The Node helper sends a fixed `/hylon/panic` command with a unique request ID to127.0.0.1:57132. SC replies started/done/error using the same ID. The helper times out if no receiver acknowledges, waits up to90seconds after started and never automatically retries. Concurrent PS calls share the pending request; the SC receiver also rejects duplicate/busy requests. Completion confirms the SC routine returned, not the physical acoustic result.

The SC utility is an explicit composer-requested exception to the archived-SuperCollider rule: the Apomixis musical runtime remains browser-based, and legacy SC setup files are not loaded or executed. No SC code was evaluated by the agent.

## Remote header

The Mac publishes its actual `.masthead` markup with current timer/metrics, A/M/L states, meters, mic readout and emergency controls. The remote maps its allowed controls onto existing handlers, keeps buttons at their text width/square size and executes fullscreen on the iPad itself. REMOTE configuration stays local.

The composer now explicitly authorizes remote A/M/L on/off on the prepared Mac session. Audio must have been initialized once on the Mac; MIDI browser permission must already exist; HELIOS must already be connected locally. Remote L can then start/stop its existing output. The remote never opens a USB picker or changes MIDI/USB devices. Browser gesture/permission failures are reported, not bypassed. This supersedes the earlier first-slice restriction that only transport/panic were remote-capable.

## Verification

No builds, application/UI tests, MIDI transmissions or SC execution were performed by the agent. Recovery effectiveness and Safari controls remain for the composer to check on the actual rig. Relevant APIs: [SuperCollider OSCdef](https://doc.sccode.org/Classes/OSCdef.html), [MIDIOut](https://doc.sccode.org/Classes/MIDIOut.html).
