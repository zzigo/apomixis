// 09_Microspora.scd
// Anchor piece: closing anthropomixis piece with voice-following ornamentation.
// Load ApomixisSetKlais.scd and ApomixisCore.scd before evaluating this file.

(
var piece;

if(~apx.isNil or: { ~apxCore.isNil }) {
	"09_Microspora: load ApomixisSetKlais.scd and ApomixisCore.scd first.".warn;
};

~apxPieces = ~apxPieces ? IdentityDictionary.new;

piece = ();
piece[\key] = \microspora;
piece[\title] = "09. Microspora / Pollen grain";
piece[\blueprint] = ~apxCore[\blueprint].(\microspora);
piece[\tempoPlan] = ~apxCore[\defaultTempoBlueprints][\microspora];
piece[\sectionPlan] = ~apxCore[\sectionPlan].(\microspora);
piece[\activePlayers] = List.new;
piece[\routine] = nil;
piece[\currentClock] = nil;
piece[\voiceMidiDefs] = List.new;
piece[\voiceOscDefs] = List.new;
piece[\voiceTrackerSynth] = nil;
piece[\voiceTrackerDefName] = \apxMicrosporaVoiceTracker;
piece[\voiceTrackerOscName] = \apxMicrosporaVoicePitch;
piece[\voiceFollowerEnabled] = false;
piece[\voiceTrackerDefLoaded] = false;
piece[\voiceState] = (
	last: 60,
	previous: 60,
	midiFloat: 60.0,
	freqHz: 261.6256,
	velocity: 64,
	amp: 0.0,
	active: false,
	onsetCount: 0,
	source: \none,
	history: List.new
);

piece[\midiPattern] = { |divisionKey, notePattern, durPattern, velocity = 82, legato = 0.92, restPattern|
	~apxCore[\denseMidiPattern].(divisionKey, notePattern, durPattern, velocity, legato, restPattern)
};

piece[\tempoFor] = { |sectionKey| ~apxCore[\tempoSpecFor].(piece[\key], sectionKey) };
piece[\sectionInfoFor] = { |sectionKey| ~apxCore[\sectionInfoFor].(piece[\key], sectionKey) };

piece[\updateVoiceState] = { |note = 60, velocity = 64, source = \manual, amp = nil, freqHz = nil|
	var clippedNote = note.clip(24, 96);

	piece[\voiceState][\previous] = piece[\voiceState][\last];
	piece[\voiceState][\last] = clippedNote.round(1).asInteger;
	piece[\voiceState][\midiFloat] = clippedNote.asFloat;
	piece[\voiceState][\velocity] = velocity.clip(1, 127).round(1).asInteger;
	if(amp.notNil) { piece[\voiceState][\amp] = amp.asFloat };
	if(freqHz.notNil) { piece[\voiceState][\freqHz] = freqHz.asFloat };
	piece[\voiceState][\source] = source;
	piece[\voiceState][\active] = true;
	piece[\voiceState][\onsetCount] = piece[\voiceState][\onsetCount] + 1;
	piece[\voiceState][\history].add(piece[\voiceState][\midiFloat]);
	if(piece[\voiceState][\history].size > 24) { piece[\voiceState][\history].removeAt(0) };
};

piece[\manualVoiceSeed] = { |note = 60, velocity = 64|
	piece[\updateVoiceState].(note, velocity, \manual, nil, note.midicps);
};

piece[\midiVoiceSeed] = { |note = 60, velocity = 64|
	piece[\updateVoiceState].(note, velocity, \midi, nil, note.midicps);
};

piece[\audioVoiceSeed] = { |note = 60.0, velocity = 64, amp = 0.0, freqHz = nil|
	piece[\updateVoiceState].(note, velocity, \audio, amp, freqHz ? note.midicps);
};

piece[\releaseVoice] = { |source = nil|
	if(source.isNil or: { piece[\voiceState][\source] == source }) {
		piece[\voiceState][\active] = false;
	};
};

piece[\ensureAudioTrackerDef] = {
	if(piece[\voiceTrackerDefLoaded].not) {
		SynthDef(piece[\voiceTrackerDefName], {
			|inChan = 0, pollHz = 18, ampThreshold = 0.02, activeThreshold = 0.015,
			minFreq = 80, maxFreq = 1400, median = 7, lagTime = 0.12, preGain = 1.6, hpfHz = 70|
			var sig = HPF.ar(SoundIn.ar(inChan) * preGain, hpfHz);
			var amp = Amplitude.kr(sig, 0.01, 0.12);
			var freq, hasPitch, gate, note, velocity;

			# freq, hasPitch = Pitch.kr(
				sig,
				initFreq: 220,
				minFreq: minFreq,
				maxFreq: maxFreq,
				execFreq: pollHz * 2,
				maxBinsPerOctave: 16,
				median: median,
				ampThreshold: ampThreshold,
				peakThreshold: 0.5,
				downSample: 1,
				clar: 0
			);

			freq = Lag.kr(freq.clip(minFreq, maxFreq), lagTime);
			gate = (hasPitch > 0) * (amp > activeThreshold);
			note = freq.cpsmidi.clip(24, 96);
			velocity = amp.linlin(activeThreshold, 0.25, 28, 127).clip(0, 127);

			SendReply.kr(
				Impulse.kr(pollHz),
				"/apx/microsporaVoice",
				[gate, note, velocity, amp, freq]
			);
		}).add;

		piece[\voiceTrackerDefLoaded] = true;
	};
};

piece[\installMidiVoiceFollower] = {
	~apx[\ensureOut].();

	// MIDI IN: this is the SuperCollider listener for external MIDI notes.
	// It does not send to the organ. It only updates the internal voice contour used by the ornament engine.
	piece[\voiceMidiDefs].add(
		MIDIFunc.noteOn({ |vel, num, chan, src|
			if(chan == ~apx[\midi][\voiceFollowerInChan]) {
				piece[\midiVoiceSeed].(num, vel);
			};
		})
	);

	piece[\voiceMidiDefs].add(
		MIDIFunc.noteOff({ |vel, num, chan, src|
			if(chan == ~apx[\midi][\voiceFollowerInChan]) {
				piece[\releaseVoice].(\midi);
			};
		})
	);
};

piece[\startAudioVoiceFollower] = {
	var spec = ~apx[\audio];

	if(piece[\voiceFollowerEnabled]) {
		piece[\ensureAudioTrackerDef].();
		if(piece[\voiceTrackerSynth].notNil) {
			piece[\voiceTrackerSynth].free;
			piece[\voiceTrackerSynth] = nil;
		};

		piece[\voiceTrackerSynth] = Synth(piece[\voiceTrackerDefName], [
			\inChan, spec[\voiceFollowerInputChan],
			\pollHz, spec[\voiceFollowerPollHz],
			\ampThreshold, spec[\voiceFollowerAmpThreshold],
			\activeThreshold, spec[\voiceFollowerActiveThreshold],
			\minFreq, spec[\voiceFollowerMinFreq],
			\maxFreq, spec[\voiceFollowerMaxFreq],
			\median, spec[\voiceFollowerMedian],
			\lagTime, spec[\voiceFollowerLag],
			\preGain, spec[\voiceFollowerPreGain],
			\hpfHz, spec[\voiceFollowerHPF]
		]);
	};
};

piece[\installAudioVoiceFollower] = {
	var server = Server.default;

	// AUDIO IN: the live microphone is analyzed inside the SuperCollider audio server with SoundIn + Pitch.kr.
	// The resulting contour is sent back to the language side with SendReply and merged with the MIDI path.
	piece[\voiceOscDefs].add(
		OSCdef(piece[\voiceTrackerOscName], { |msg|
			var gate = msg[3].asFloat;
			var note = msg[4].asFloat;
			var velocity = msg[5].asFloat;
			var amp = msg[6].asFloat;
			var freqHz = msg[7].asFloat;

			if(gate > 0.5) {
				piece[\audioVoiceSeed].(note, velocity, amp, freqHz);
			} {
				piece[\releaseVoice].(\audio);
			};
		}, "/apx/microsporaVoice")
	);

	if(server.serverRunning) {
		piece[\startAudioVoiceFollower].();
	} {
		"09_Microspora: booting the audio server for microphone pitch tracking.".postln;
		server.waitForBoot({
			if(piece[\voiceFollowerEnabled]) {
				piece[\startAudioVoiceFollower].();
			};
		});
		server.boot;
	};
};

piece[\installVoiceFollower] = {
	piece[\removeVoiceFollower].();
	piece[\voiceFollowerEnabled] = true;

	// MusStrat: The voice is not scored as a melody to be harmonized. It is a moving source of pollen:
	//            the machine reads its contour and proliferates local ornaments around it.
	// Context: Anthropomixis here means reintroducing human breath into an otherwise autonomous organism,
	//          but only as an interior perturbation. The machine infests the voice instead of accompanying it.
	piece[\installMidiVoiceFollower].();
	piece[\installAudioVoiceFollower].();
};

piece[\removeVoiceFollower] = {
	piece[\voiceFollowerEnabled] = false;
	piece[\voiceMidiDefs].do { |def| if(def.notNil) { def.free } };
	piece[\voiceMidiDefs].clear;
	piece[\voiceOscDefs].do { |def| if(def.notNil) { def.free } };
	piece[\voiceOscDefs].clear;
	if(piece[\voiceTrackerSynth].notNil) {
		piece[\voiceTrackerSynth].free;
		piece[\voiceTrackerSynth] = nil;
	};
};

piece[\voiceBase] = {
	piece[\voiceState][\last]
};

piece[\voiceOrnament] = { |offsetSet = #[0, 2, -1, 4, 7]|
	Pfunc {
		var base = piece[\voiceBase].();
		base + offsetSet.choose
	}
};

piece[\applySectionState] = { |sectionKey|
	switch(sectionKey,
		\introduction, {
			~apx[\applyScene].(\seedLoop);
			~apx[\setStop].(\re, \voixHumaine8, 0);
			~apx[\sendController].(\crescendoGlobal, 8);
		},
		\replication, {
			~apx[\applyScene].(\microsporaVocal);
			~apx[\sendController].(\expressionPositif, 102);
			~apx[\sendController].(\expressionRecit, 88);
		},
		\bridge, {
			~apx[\applyScene].(\microsporaVocal);
			~apx[\setStop].(\so, \seraphonFlote8, 127);
			~apx[\sendController].(\crescendoGlobal, 20);
			~apx[\sendController].(\expressionRecit, 72);
		},
		\climax, {
			~apx[\applyScene].(\microsporaVocal);
			~apx[\setCoupler].(\iv_iii, 127);
			~apx[\setCoupler].(\iii_ii, 127);
			~apx[\setStop].(\re, \trompetteHarmonique8, 127);
			~apx[\sendController].(\crescendoGlobal, 56);
			~apx[\sendController].(\expressionPositif, 112);
			~apx[\sendController].(\expressionRecit, 98);
		},
		\coda, {
			~apx[\applyScene].(\megasporaDream);
			~apx[\setStop].(\re, \voixHumaine8, 127);
			~apx[\setStop].(\so, \seraphonFlote8, 0);
			~apx[\setStop].(\re, \trompetteHarmonique8, 0);
			~apx[\sendController].(\crescendoGlobal, 4);
			~apx[\sendController].(\expressionPositif, 70);
			~apx[\sendController].(\expressionRecit, 58);
		}
	);
};

piece[\sections] = ();

piece[\sections][\introduction] = (
	scene: \seedLoop,
	layers: [\po, \pe],
	lights: "Dim warm-neutral chamber, no spotlight yet, only a residual console halo.",
	humanCue: "Silence from the voice until the machine loop stabilizes.",
	pattern: {
		// MusStrat: The final piece does not start with the human; the automaton must already be alive.
		//            Positif and Pedale form a dry loop that the later voice will infect from within.
		// Context: Microspora closes the cycle by reversing perspective. Human material appears only after the system
		//          has declared its own autonomous continuity.
		Ppar([
			piece[\midiPattern].(
				\po,
				Pseq([57, 60, 64, 60, 57], inf),
				Pseq([2, 1.5, 2.5, 1.5, 2.5], inf),
				54,
				1.00
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 29, 24, 26], inf),
				Pseq([6, 5, 7, 4], inf),
				56,
				1.70
			)
		])
	}
);

piece[\sections][\replication] = (
	scene: \microsporaVocal,
	layers: [\po, \re, \so, \pe],
	lights: "A slight warm lift reveals bodily presence without producing a soloist spotlight.",
	humanCue: "VOICE ENTERS. Soft speech-song, breath, phoneme, or half-sung prosody.",
	pattern: {
		// MusStrat: The system begins to orbit the incoming voice. Positif takes the closest ornamental role,
		//            Recit supplies timbral mimicry, Solo flickers as a distant pollen halo, and Pedale keeps the automaton grounded.
		// Context: The vocal trace is not thematic source material; it is biological input. The machine reproduces around it by parasitic ornamentation.
		Ppar([
			piece[\midiPattern].(
				\po,
				piece[\voiceOrnament].(#[0, 2, -1, 4]),
				Pseq([0.75, 0.5, 0.75, 1.0], inf),
				64,
				0.84
			),
			piece[\midiPattern].(
				\re,
				piece[\voiceOrnament].(#[0, 7, 12, 4]),
				Pseq([1.5, 1.0, 1.5, 2.0], inf),
				68,
				0.95,
				Pseq([false, false, true, false], inf)
			),
			piece[\midiPattern].(
				\so,
				piece[\voiceOrnament].(#[12, 14, 19]),
				Pseq([3, 2, 4], inf),
				56,
				0.72,
				Pseq([true, false, true], inf)
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 29, 26, 24], inf),
				Pseq([4, 5, 3, 6], inf),
				58,
				1.35
			)
		])
	}
);

piece[\sections][\bridge] = (
	scene: \microsporaVocal,
	layers: [\po, \re, \pe],
	lights: "The hall recedes again. The voice remains present but more interior, as if heard through the instrument.",
	humanCue: "VOICE CONTINUES, but calmer and more embedded than in Replication.",
	pattern: {
		// MusStrat: The bridge reduces the overt ornament count and lengthens the response window.
		//            This keeps the voice audible as a body while preserving the machine's internal pacing.
		// Context: Shadowing replaces proliferation. The automaton behaves like a chamber around the voice, not a stage around a singer.
		Ppar([
			piece[\midiPattern].(
				\po,
				piece[\voiceOrnament].(#[0, -2, 2]),
				Pseq([1.5, 1.0, 2.0], inf),
				58,
				0.88
			),
			piece[\midiPattern].(
				\re,
				piece[\voiceOrnament].(#[0, 5, 7]),
				Pseq([2.5, 1.5, 3.0], inf),
				62,
				1.05,
				Pseq([false, true, false], inf)
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 26, 29, 24], inf),
				Pseq([6, 4, 5, 7], inf),
				50,
				1.55
			)
		])
	}
);

piece[\sections][\climax] = (
	scene: \microsporaVocal,
	layers: [\po, \re, \so, \pe],
	lights: "The warm focus narrows around the vocal source and console, while the room behind it darkens.",
	humanCue: "VOICE STRONGER, but never operatic. It must remain embedded in the organ body.",
	pattern: {
		// MusStrat: The climax increases pressure by densifying the ornament and extending the registral envelope around the voice.
		//            The machine sounds as if it were sprouting secondary filaments from each vocal onset.
		// Context: This is anthropomixis at maximum intensity, but still not accompaniment. Human breath becomes fertile substrate
		//          for an autonomous instrumental organism.
		Ppar([
			piece[\midiPattern].(
				\po,
				piece[\voiceOrnament].(#[0, 2, 4, 7, 9]),
				Pseq([0.5, 0.5, 0.25, 0.75, 1.0], inf),
				74,
				0.82
			),
			piece[\midiPattern].(
				\re,
				piece[\voiceOrnament].(#[0, 7, 12, 14]),
				Pseq([1.0, 0.5, 1.0, 1.5], inf),
				80,
				0.90,
				Pseq([false, false, true, false], inf)
			),
			piece[\midiPattern].(
				\so,
				piece[\voiceOrnament].(#[12, 16, 19]),
				Pseq([2.0, 1.5, 2.5], inf),
				66,
				0.76,
				Pseq([true, false, false], inf)
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 29, 31, 24, 26], inf),
				Pseq([3, 4, 3, 5, 4], inf),
				62,
				1.30
			)
		])
	}
);

piece[\sections][\coda] = (
	scene: \megasporaDream,
	layers: [\re, \pe],
	lights: "Final minute: almost complete darkness, leaving only a thin amber-white residual halo.",
	humanCue: "VOICE WITHDRAWS TO BREATH, PHONEME, OR NEAR-WHISPER.",
	pattern: {
		// MusStrat: The coda lets the machine remember the voice after the body has nearly disappeared.
		//            Recit keeps a faint human trace while Pedale returns the cycle to subterranean latency.
		// Context: The cycle ends by re-humanizing the automaton from inside and then letting that human pressure dissolve.
		//          Closure is therefore residual, not triumphant.
		Ppar([
			piece[\midiPattern].(
				\re,
				piece[\voiceOrnament].(#[0, -1, 2]),
				Pseq([3, 4, 5], inf),
				46,
				1.20
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 24, 26, 24], inf),
				Pseq([8, 10, 7, 11], inf),
				42,
				1.90
			)
		])
	}
);

piece[\postSectionCue] = { |sectionKey|
	var spec = piece[\sections][sectionKey];
	var tempoSpec = piece[\tempoFor].(sectionKey);

	("Microspora -> " ++ sectionKey.asString
		++ " | " ++ tempoSpec[\bpm].asString ++ " BPM"
		++ " | layers " ++ ~apxCore[\layerTagString].(spec[\layers])).postln;
	("Light: " ++ spec[\lights]).postln;
	("Human cue: " ++ spec[\humanCue]).postln;
};

piece[\registerTempoNodes] = {
	~apxCore[\registerPieceTempoNodes].(piece[\key], "09_Microspora.scd");
};

piece[\stopPlayers] = {
	piece[\activePlayers].do { |player| if(player.notNil) { player.stop } };
	piece[\activePlayers].clear;

	if(piece[\currentClock].notNil) {
		piece[\currentClock].clear;
		piece[\currentClock] = nil;
	};
};

piece[\stopAll] = {
	if(piece[\routine].notNil) {
		piece[\routine].stop;
		piece[\routine] = nil;
	};

	piece[\stopPlayers].();
	piece[\removeVoiceFollower].();
};

piece[\playSection] = { |sectionKey|
	var sectionInfo = piece[\sectionInfoFor].(sectionKey);
	var tempoSpec = piece[\tempoFor].(sectionKey);
	var sectionSpec = piece[\sections][sectionKey];
	var beats = sectionInfo[\durSec] * tempoSpec[\bpm] / 60.0;
	var clock = TempoClock.new(tempoSpec[\bpm] / 60.0);
	var player;

	piece[\stopPlayers].();
	if(sectionKey == \introduction) {
		piece[\removeVoiceFollower].();
	} {
		piece[\installVoiceFollower].();
	};
	piece[\applySectionState].(sectionKey);
	piece[\postSectionCue].(sectionKey);

	player = Pfindur(beats, ~apxCore[\asLivePattern].(sectionSpec[\pattern].())).play(clock);

	piece[\activePlayers].add(player);
	piece[\currentClock] = clock;
	player
};

piece[\playAll] = {
	piece[\stopAll].();
	piece[\registerTempoNodes].();
	piece[\installVoiceFollower].();

	piece[\routine] = Routine({
		~apx[\resetControllers].();

		~apxCore[\formalOrder].do { |sectionKey|
			var sectionInfo = piece[\sectionInfoFor].(sectionKey);
			piece[\playSection].(sectionKey);
			sectionInfo[\durSec].wait;
		};

		piece[\stopPlayers].();
		piece[\removeVoiceFollower].();
		piece[\routine] = nil;
	}).play(SystemClock);
};

piece[\postBlueprint] = {
	"09_Microspora blueprint".postln;
	piece[\sectionPlan].do { |spec|
		var tempo = piece[\tempoFor].(spec[\section]);
		(spec[\section].asString ++ " | start " ++ spec[\startSec].asString
			++ " | dur " ++ spec[\durSec].asString
			++ " | bpm " ++ tempo[\bpm].asString).postln;
	};
};

~apxCore[\formalOrder].do { |sectionKey|
	piece[\sections][sectionKey][\densePattern] = piece[\sections][sectionKey][\pattern];
};

piece[\exportSectionMidis] = { |baseDir = "exports/midi"|
	~apxCore[\exportPieceSectionsToMidi].(piece, baseDir);
};

piece[\exportSectionNoteMaps] = { |baseDir = "exports/note_maps"|
	~apxCore[\exportPieceSectionsToNoteCsv].(piece, baseDir);
};

piece[\exportWholePieceNoteMap] = { |baseDir = "exports/note_maps"|
	~apxCore[\exportWholePieceToNoteCsv].(piece, baseDir);
};

piece[\exportAllData] = {
	piece[\exportSectionMidis].();
	piece[\exportSectionNoteMaps].();
	piece[\exportWholePieceNoteMap].();
};

~apxPieces[\microspora] = piece;
"09_Microspora loaded.".postln;
)
