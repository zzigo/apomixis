// Optional emergency utility; not the Apomixis score runtime.
// First configure ~midi exactly as in your working panic patch, then evaluate this block once.
// No server boot, MIDI endpoint guessing, note-on, or automatic panic at installation.
(
if(~midi.isNil) { Error("Set ~midi to your working MIDIOut before loading HYLON PS").throw };
~hylonPanicOutput = ~midi;
~hylonPSBusy = false;
~hylonPSSeen = List.new;
OSCdef(\hylonPS, { |msg, time, addr, recvPort|
    var request = msg[1], out = ~hylonPanicOutput;
    ("[HYLON-PANIC] OSC message received: " ++ msg.asString ++ " from " ++ addr.ip ++ ":" ++ addr.port).postln;
    if((addr.ip == "127.0.0.1") and: { request.isString }) {
        if(~hylonPSBusy or: { ~hylonPSSeen.includes(request) }) {
            ("[HYLON-PANIC] Request ignored: bridge busy or request already processed (" ++ request.asString ++ ")").postln;
            addr.sendMsg('/hylon/panic/ack', request, "busy", "PS already running or request already received");
        } {
            ~hylonPSBusy = true;
            ~hylonPSSeen.add(request);
            if(~hylonPSSeen.size > 32) { ~hylonPSSeen.removeAt(0) };
            ("[HYLON-PANIC] Starting 3-pass MIDI panic sweeps (req: " ++ request.asString ++ ")").postln;
            addr.sendMsg('/hylon/panic/ack', request, "started", "SC panic: three passes");
            ~hylonPSRoutine = Routine({
                var resetChannels;
                resetChannels = {
                    16.do { |chan|
                        out.control(chan, 64, 0);
                        out.control(chan, 120, 0);
                        out.control(chan, 121, 0);
                        out.allNotesOff(chan);
                        out.bend(chan, 8192);
                    };
                };
                try {
                    3.do { |pass|
                        ("[HYLON-PANIC] Sweep pass " ++ (pass + 1) ++ "/3...").postln;
                        resetChannels.value;
                        16.do { |chan|
                            128.do { |note|
                                out.noteOff(chan, note, 0);
                                0.001.wait;
                            };
                        };
                    };
                    resetChannels.value;
                    "[HYLON-PANIC] Three SuperCollider panic sweeps completed successfully.".postln;
                    addr.sendMsg('/hylon/panic/ack', request, "done", "Three SuperCollider panic sweeps completed");
                } { |error|
                    ("[HYLON-PANIC] ERROR during panic sweep: " ++ error.asString).postln;
                    addr.sendMsg('/hylon/panic/ack', request, "error", error.asString);
                    error.reportError;
                };
                ~hylonPSBusy = false;
            }).play(SystemClock);
        };
    };
}, '/hylon/panic', recvPort: 57132);
"HYLON PS ready on localhost UDP 57132; waiting for explicit panic command".postln;
)
// To remove the receiver later: OSCdef(\hylonPS).free;
