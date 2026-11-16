# Measuring organ attacks

I/O ATTACK → enable TIMING, choose MO, then PLAY. No automatic MIDI enabling or test emission. Stop preserves the last report; ↓ exports JSON. Turning TIMING on/off during playback stops the attack sequence. Recording is bounded to50,000 event rows; a LIMIT indication means the recording is truncated. Readings update four times per second. Use a fixed setup during each run; report includes initial settings and individual event timestamps.

The baseline implementation deliberately remains unchanged: the note gateway checks due messages on a10ms browser interval and calls MIDIOutput.send(bytes) immediately. The tester schedules ahead, but the gateway does not pass future timestamps to the driver. Main-thread delays can therefore shift actual dispatch. A planned timestamp is not evidence that the driver received the message on time.

Metrics: ON and OFF actual API-call time minus intended time in ms (mean,p95,max); signed gate-duration error for matched ON/OFF owners; shared/coalesced attacks and dropped events. Positive lateness means late. Gate mean can hide positive/negative deviations; exported rows allow analysis of the full distribution. Stop cancels measurement before releasing remaining test notes, so final cancelled notes are not scored as musical note-offs. Shared same-pitch owners may lack an individual physical ON/OFF pair. No samples means —, not zero. Fault/disarm paths can leave unmatched rows; do not treat absent OFF measurements as success. These timestamps represent JavaScript dispatch, not USB transmission, console reception, sound onset or key motion.

## Controlled comparison with SuperCollider

1. Choose one manual, a fixed note/velocity, MO only, RANDOM OFF, no concurrent generators. Keep selected MIDI interface, cable and organ registration identical.
2. Use the same fixed attack count, gate and period in HYLON and a SystemClock-based SC Routine. Gate must be shorter than the same-pitch repeat period to avoid intentional ownership coalescing. Record SC MIDIOut.latency explicitly; do not mistake constant latency for jitter.
3. Capture both runs with the same independent receiver/CoreMIDI recorder. An IAC loopback measures software delivery, not the USB cable/organ. A physical return interface measures the outgoing wire plus return path. Do not route a return into HYLON's sampler/follower or create MIDI thru feedback. No loopback is connected automatically.
4. For each run compare received interval minus intended period (median,p95 absolute deviation,max), note-off minus note-on minus intended gate, missing/extra attacks and drift over the run. Align first attacks when comparing relative jitter; absolute one-way latency requires a common clock/reference.
5. Repeat with usual UI/visual load. If MIDI timing is clean but organ response differs, record acoustic attacks with identical registration/microphone placement. This measures the entire sound path, including pipe speech and acoustics.

SC is a possible stronger scheduler, not an established winner in this setup. Native scheduling/latency can help; browser future-timestamp sends can also improve timing, but would require cancellation/ownership changes and should be measured separately after the baseline. No physical measurements have been made by this implementation.

Primary references: https://www.w3.org/TR/webmidi/ (MIDIOutput.send timestamp), https://doc.sccode.org/Classes/SystemClock.html and https://doc.sccode.org/Classes/MIDIOut.html (SC scheduling/latency).
