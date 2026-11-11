# HYLON 0.3 — AUDIO pod

Open **05 AUDIO**. The same pod can be docked beside the sampler by dragging its tab. The visual reference is the local ENSI MixerHUD: narrow vertical faders, compact labels and restrained color. HYLON adds thin real stereo peak meters; it does not import ENSI's React components or depend on ENSI online.

## Fixed routing

```text
Klais bank + single-file sampler → fixed stereo sampler input → sampler fader → dry master
                                            │                        ├→ reverb send ─┐
                                            └→ optional carrier      └→ delay send ──┼─→ shared FX returns → master
                                                                                    │
Selected mic device → process A or B → mic input gate → dry/vocoder blend → chopper    │
                                                                    → mic gate/fader┼→ reverb send
                                                                                    └→ delay send
```

Both sampler adapters use the same stereo input; no sampler bypass goes straight to master. Post-fader sends mean a zero channel level silences its dry output and new FX sends. The vocoder's sampler-carrier tap is before that fader, so a sampler can act as carrier while its direct channel is down. Carrier never connects directly to the mic output: a modulator signal is required.

The existing two I/O process lanes remain available for gain, route selection and meters. AUDIO takes exactly **one** selected lane (A by default), preventing a mono device duplicated into A/B from being summed twice. Existing raw input monitor nodes stay muted when the mixer is installed; I/O's monitor checkbox enables the same processed mic path. Choose physical devices/channels in I/O.

## Faders and effects

- **Sampler / Mic:** level, reverb send and delay send, each 0–1. Sampler input is explicitly stereo; mic uses the selected input lane.
- **Reverb:** one shared stereo convolution return, with a deterministic locally generated 2.4-second decaying impulse. No network or impulse download.
- **Delay:** shared stereo delay return, time 0.02–1.5 seconds and feedback 0–0.8. A 4.5 kHz low-pass filter damps the feedback loop. This is not ping-pong delay.
- **Master:** same 0–1 gain as the I/O master. Changes in either place synchronize. A fixed compressor before master controls peaks; it is not a calibrated loudness or hearing-protection limiter.
- **Vocoder:** 16 logarithmic filter bands, 160–6400 Hz. Mic band signals are rectified and low-pass filtered at 35 Hz to control matching carrier-band gains. Blend 0 = mic dry, 1 = vocoded. Choose internal saw (50–1000 Hz, initially 130.81 Hz) or sampler carrier. The sampler carrier requires sounding notes. No microphone recording or remote processing.
- **Chopper:** smoothed pulse modulation after the mic dry/vocoder blend and before channel sends; free-running 0.25–32 Hz with depth 0–1. Depth 0 bypasses its gain modulation. It is not transport/BPM synchronized.

All main audio controls ramp over 20 ms. Defaults: sampler level .8, mic .7, master .3, mic monitoring disabled, vocoder blend 1, internal carrier, chopper depth 0. Controls are session settings, not persisted presets. Reverb/delay keep their normal tails when a channel is lowered or the mic is muted; **CLEAR FX TAILS** rebuilds the shared wet processors and mutes the mic. **STOP ALL** also stops sampler voices, ends the microphone stream and clears wet tails.

Meters tap post-channel faders, post-return gains and post-master. They display current sample peaks in dBFS over 256-sample windows, refreshed at up to 20 Hz; red marks ≥ −1 dBFS. They are not averaged VU, LUFS or calibrated SPL meters. Narrow mono mic sources may show only one channel at that tap. Meter animation pauses while the pod or document is hidden; the mixer itself continues independently of pod visibility.

## Microphone lifecycle

**ENABLE AUDIO** creates/resumes the context without requesting a microphone. **ENABLE MIC FX** uses the selected input device (or system default), requests input if needed, then deliberately enables the processed monitor. **MUTE MIC** leaves the stream available but gates processing/output. Headphones avoid the obvious speaker feedback loop. Microphone start, switch, disconnect, page hide and reload never auto-enable monitoring. Stop All cancels pending activation and releases a late permission result. No automatic microphone capture or recording is added at startup.

## Verification and limits

`npm run check`: 52 Node tests, 7 Python asset tests and production build. Audio integration tests verify the fixed sampler destination, one mic lane, no legacy dry bypass, default mute, route switching and shared master gain; control tests reject malformed settings and excessive feedback.

Development-only `http://localhost:4173/audio-check.html` runs synthetic signal tests through real Web Audio nodes. It is not included in the production build or offline package. Nine browser checks passed:

1. Sampler preserves L/R without unintended mono conversion.
2. Shared delay returns an impulse at the configured time.
3. Stereo reverb tail remains after the source ends.
4. Mic input is silent before enabling.
5. The 16-band vocoder produces modulated-carrier signal.
6. Carrier does not leak without modulation.
7. Chopper attenuates/modulates the mic path.
8. Panic clears delay/reverb tails after a suspended offline-render checkpoint.
9. Live sampler meter detects a synthetic signal while the post-master meter remains silent with master gain zero.

Eight checks use OfflineAudioContext; the last uses a live context with the master hard-muted before connection. No audible playback, microphone permission, MIDI device or USB transfer was used. The actual microphone, room feedback, subjective vocoder sound, CPU headroom under a full performance and physical output device routing remain unverified. No online deployment or production service was changed.
