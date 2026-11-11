// 04_Megaspora.scd
// Anchor piece: long dream-like automaton.
// Load ApomixisSetKlais.scd and ApomixisCore.scd before evaluating this file.

(
var piece;

if(~apx.isNil or: { ~apxCore.isNil }) {
	"04_Megaspora: load ApomixisSetKlais.scd and ApomixisCore.scd first.".warn;
};

~apxPieces = ~apxPieces ? IdentityDictionary.new;

piece = ();
piece[\key] = \megaspora;
piece[\title] = "04. Megaspora / Espora";
piece[\blueprint] = ~apxCore[\blueprint].(\megaspora);
piece[\tempoPlan] = ~apxCore[\defaultTempoBlueprints][\megaspora];
piece[\sectionPlan] = ~apxCore[\sectionPlan].(\megaspora);
piece[\activePlayers] = List.new;
piece[\routine] = nil;
piece[\currentClock] = nil;

piece[\midiPattern] = { |divisionKey, notePattern, durPattern, velocity = 80, legato = 0.96, restPattern|
	~apxCore[\denseMidiPattern].(divisionKey, notePattern, durPattern, velocity, legato, restPattern)
};

piece[\tempoFor] = { |sectionKey|
	~apxCore[\tempoSpecFor].(piece[\key], sectionKey)
};

piece[\sectionInfoFor] = { |sectionKey|
	~apxCore[\sectionInfoFor].(piece[\key], sectionKey)
};

piece[\applySectionState] = { |sectionKey|
	switch(sectionKey,
		\introduction, {
			~apx[\applyScene].(\megasporaDream);
			~apx[\setStop].(\so, \seraphonFlote8, 0);
			~apx[\setStop].(\go, \montre16, 0);
			~apx[\sendController].(\crescendoGlobal, 10);
		},
		\replication, {
			~apx[\applyScene].(\megasporaDream);
			~apx[\setStop].(\go, \fluteDouce4, 127);
			~apx[\setStop].(\po, \salicional8, 127);
			~apx[\sendController].(\expressionPositif, 78);
			~apx[\sendController].(\expressionRecit, 74);
		},
		\bridge, {
			~apx[\applyScene].(\seedLoop);
			~apx[\setStop].(\re, \voixCeleste8, 127);
			~apx[\setStop].(\pe, \flute32, 127);
			~apx[\sendController].(\crescendoGlobal, 12);
		},
		\climax, {
			~apx[\applyScene].(\dispersiveCanopy);
			~apx[\setStop].(\re, \voixHumaine8, 127);
			~apx[\setStop].(\so, \seraphonFlote8, 127);
			~apx[\setCoupler].(\iv_iii, 127);
			~apx[\sendController].(\expressionPositif, 96);
			~apx[\sendController].(\expressionRecit, 92);
		},
		\coda, {
			~apx[\applyScene].(\megasporaDream);
			~apx[\setStop].(\go, \montre8, 0);
			~apx[\setStop].(\so, \seraphonFlote8, 0);
			~apx[\sendController].(\crescendoGlobal, 6);
			~apx[\sendController].(\expressionPositif, 68);
			~apx[\sendController].(\expressionRecit, 62);
		}
	);
};

piece[\sections] = ();

piece[\sections][\introduction] = (
	scene: \megasporaDream,
	layers: [\po, \re, \pe],
	lights: "Near-dark blue-gray chamber, almost static, with very slow breathing dimmer.",
	humanCue: "No human intervention.",
	pattern: {
		// MusStrat: The opening is intentionally under-articulated. The piece begins inside the organ rather than in front of it:
		//            Positif and Recit behave as internal membranes while Pedale supplies geological time.
		// Context: Megaspora starts from fertility without prior reduction. The form therefore opens as an enclosed germinal sac,
		//          not as a dramatic exposition. The low 32' field acts as a pre-cellular substrate.
		Ppar([
			piece[\midiPattern].(
				\po,
				Pseq([50, 53, 57, 60, 57, 53], inf),
				Pseq([5, 3, 5, 8, 2, 3], inf),
				52,
				1.10
			),
			piece[\midiPattern].(
				\re,
				Pseq([[55, 62], [57, 64], [53, 60], [52, 59]], inf),
				Pseq([7, 6, 9, 4], inf),
				56,
				1.35
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 29, 31, 28, 26], inf),
				Pseq([8, 13, 8, 5, 11], inf),
				58,
				1.80
			)
		])
	}
);

piece[\sections][\replication] = (
	scene: \megasporaDream,
	layers: [\go, \po, \re, \pe],
	lights: "Still dim, but the side-light opens enough to reveal slow internal motion.",
	humanCue: "No human intervention.",
	pattern: {
		// MusStrat: Replication does not accelerate into event rhetoric; it thickens by adding strata with different memory lengths.
		//            Grand Orgue enters only as a veiled contour so that the dream state remains dominant.
		// Context: This is somatic multiplication. The same acoustic body accumulates mutations and branches without a visible external cause.
		Ppar([
			piece[\midiPattern].(
				\go,
				Pseq([[43, 55], [45, 57], [48, 60], [50, 62], [48, 60]], inf),
				Pseq([4, 6, 5, 7, 6], inf),
				60,
				1.20
			),
			piece[\midiPattern].(
				\po,
				Pseq([50, 53, 57, 60, 64, 60, 57, 53], inf),
				Pseq([2, 1.5, 2.5, 3, 2, 1.5, 2.5, 3], inf),
				58,
				1.05
			),
			piece[\midiPattern].(
				\re,
				Pseq([[57, 64], [59, 66], [60, 67], [57, 65], [55, 62]], inf),
				Pseq([5, 4, 6, 5, 7], inf),
				62,
				1.25
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 29, 31, 24, 28, 26], inf),
				Pseq([7, 9, 5, 8, 11, 6], inf),
				60,
				1.70
			)
		])
	}
);

piece[\sections][\bridge] = (
	scene: \seedLoop,
	layers: [\re, \so, \pe],
	lights: "The room contracts. Edges disappear; only a suspended interior remains visible.",
	humanCue: "No human intervention.",
	pattern: {
		// MusStrat: The bridge hollows out the texture. Solo appears as a rare internal gleam, not as a concerto layer.
		// Context: This section models latency and chambering. The material folds inward and behaves as if enclosed by a membrane.
		Ppar([
			piece[\midiPattern].(
				\re,
				Pseq([[52, 59], [50, 57], [48, 55], [47, 54]], inf),
				Pseq([6, 7, 5, 8], inf),
				50,
				1.45
			),
			piece[\midiPattern].(
				\so,
				Pseq([72, 76, 79, 74, 77], inf),
				Pseq([11, 9, 13, 8, 12], inf),
				48,
				0.90
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 26, 29, 24, 31], inf),
				Pseq([9, 7, 12, 8, 10], inf),
				54,
				1.90
			)
		])
	}
);

piece[\sections][\climax] = (
	scene: \dispersiveCanopy,
	layers: [\go, \po, \re, \so, \pe],
	lights: "The darkness remains, but the chamber now breathes more visibly; the room opens without becoming theatrical.",
	humanCue: "No human intervention.",
	pattern: {
		// MusStrat: The climax is expansive rather than violent. Density rises through overlapping tempi and registral bloom,
		//            not through percussive attack. The Solo division acts as a luminous divergence rather than brass domination.
		// Context: This is a dream-climax of proliferating internal fertility. Convolution is imagined here as acoustic pollen
		//          spreading through a suspended medium rather than as a dramatic eruption.
		Ppar([
			piece[\midiPattern].(
				\go,
				Pseq([[48, 60], [50, 62], [52, 64], [55, 67], [52, 64]], inf),
				Pseq([2, 2, 3, 2, 3], inf),
				72,
				1.05
			),
			piece[\midiPattern].(
				\po,
				Pseq([53, 57, 60, 64, 67, 64, 60, 57], inf),
				Pseq([1.5, 1, 1.5, 2, 1.5, 1, 1.5, 2], inf),
				66,
				1.00
			),
			piece[\midiPattern].(
				\re,
				Pseq([[57, 64], [60, 67], [62, 69], [59, 66]], inf),
				Pseq([4, 3, 5, 4], inf),
				74,
				1.18
			),
			piece[\midiPattern].(
				\so,
				Pseq([74, 79, 81, 77, 84], inf),
				Pseq([6, 5, 7, 6, 8], inf),
				62,
				0.88
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 29, 31, 24, 28, 26], inf),
				Pseq([5, 7, 6, 8, 5, 9], inf),
				72,
				1.55
			)
		])
	}
);

piece[\sections][\coda] = (
	scene: \megasporaDream,
	layers: [\po, \re, \pe],
	lights: "The room retreats to a faint residual halo. The piece ends by withdrawing back into germinal suspension.",
	humanCue: "No human intervention.",
	pattern: {
		// MusStrat: The coda does not resolve; it sediments. The pitch field narrows and the durations lengthen again.
		// Context: The megaspore closes by retaining potential. This is post-climactic latency rather than cadential closure.
		Ppar([
			piece[\midiPattern].(
				\po,
				Pseq([48, 50, 53, 57, 53, 50], inf),
				Pseq([4, 5, 6, 7, 5, 8], inf),
				46,
				1.15
			),
			piece[\midiPattern].(
				\re,
				Pseq([[52, 59], [50, 57], [48, 55], [47, 54]], inf),
				Pseq([8, 6, 9, 7], inf),
				48,
				1.45
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 24, 29, 24, 26], inf),
				Pseq([11, 13, 9, 12, 10], inf),
				52,
				2.00
			)
		])
	}
);

piece[\postSectionCue] = { |sectionKey|
	var spec = piece[\sections][sectionKey];
	var tempoSpec = piece[\tempoFor].(sectionKey);

	("Megaspora -> " ++ sectionKey.asString
		++ " | " ++ tempoSpec[\bpm].asString ++ " BPM"
		++ " | layers " ++ ~apxCore[\layerTagString].(spec[\layers])).postln;
	("Light: " ++ spec[\lights]).postln;
};

piece[\registerTempoNodes] = {
	~apxCore[\registerPieceTempoNodes].(piece[\key], "04_Megaspora.scd");
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
};

piece[\playSection] = { |sectionKey|
	var sectionInfo = piece[\sectionInfoFor].(sectionKey);
	var tempoSpec = piece[\tempoFor].(sectionKey);
	var sectionSpec = piece[\sections][sectionKey];
	var beats = sectionInfo[\durSec] * tempoSpec[\bpm] / 60.0;
	var clock = TempoClock.new(tempoSpec[\bpm] / 60.0);
	var player;

	piece[\stopPlayers].();
	piece[\applySectionState].(sectionKey);
	piece[\postSectionCue].(sectionKey);

player = Pfindur(beats, sectionSpec[\pattern].()).play(clock);
	player = Pfindur(beats, ~apxCore[\asLivePattern].(sectionSpec[\pattern].())).play(clock);
	piece[\activePlayers].add(player);
	piece[\currentClock] = clock;
	player
};

piece[\playAll] = {
	piece[\stopAll].();
	piece[\registerTempoNodes].();

	piece[\routine] = Routine({
		~apx[\resetControllers].();

		~apxCore[\formalOrder].do { |sectionKey|
			var sectionInfo = piece[\sectionInfoFor].(sectionKey);
			piece[\playSection].(sectionKey);
			sectionInfo[\durSec].wait;
		};

		piece[\stopPlayers].();
		piece[\routine] = nil;
	}).play(SystemClock);
};

piece[\postBlueprint] = {
	"04_Megaspora blueprint".postln;
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

~apxPieces[\megaspora] = piece;
"04_Megaspora loaded.".postln;
)
