// 07_Filotaxis.scd
// Anchor piece: short presto full tutti with local inhibition logic.
// Load ApomixisSetKlais.scd and ApomixisCore.scd before evaluating this file.

(
var piece;

if(~apx.isNil or: { ~apxCore.isNil }) {
	"07_Filotaxis: load ApomixisSetKlais.scd and ApomixisCore.scd first.".warn;
};

~apxPieces = ~apxPieces ? IdentityDictionary.new;

piece = ();
piece[\key] = \filotaxis;
piece[\title] = "07. Filotaxis";
piece[\blueprint] = ~apxCore[\blueprint].(\filotaxis);
piece[\tempoPlan] = ~apxCore[\defaultTempoBlueprints][\filotaxis];
piece[\sectionPlan] = ~apxCore[\sectionPlan].(\filotaxis);
piece[\activePlayers] = List.new;
piece[\routine] = nil;
piece[\currentClock] = nil;

piece[\midiPattern] = { |divisionKey, notePattern, durPattern, velocity = 96, legato = 0.88, restPattern|
	~apxCore[\denseMidiPattern].(divisionKey, notePattern, durPattern, velocity, legato, restPattern)
};

piece[\tempoFor] = { |sectionKey| ~apxCore[\tempoSpecFor].(piece[\key], sectionKey) };
piece[\sectionInfoFor] = { |sectionKey| ~apxCore[\sectionInfoFor].(piece[\key], sectionKey) };

piece[\applySectionState] = { |sectionKey|
	switch(sectionKey,
		\introduction, {
			~apx[\applyScene].(\crystallineCanon);
			~apx[\sendController].(\crescendoGlobal, 52);
		},
		\replication, {
			~apx[\applyScene].(\dispersiveCanopy);
			~apx[\setCoupler].(\ii_i, 127);
			~apx[\setCoupler].(\iii_i, 127);
			~apx[\setCoupler].(\i_ped, 127);
			~apx[\sendController].(\crescendoGlobal, 78);
		},
		\bridge, {
			~apx[\applyScene].(\filotaxisTutti);
			~apx[\sendController].(\crescendoGlobal, 108);
		},
		\climax, {
			~apx[\applyScene].(\filotaxisTutti);
			~apx[\sendController].(\crescendoGlobal, 127);
			~apx[\sendController].(\expressionPositif, 127);
			~apx[\sendController].(\expressionRecit, 127);
		},
		\coda, {
			~apx[\applyScene].(\crystallineCanon);
			~apx[\sendController].(\crescendoGlobal, 60);
			~apx[\setCoupler].(\iv_i, 0);
			~apx[\setCoupler].(\iv_ped, 0);
		}
	);
};

piece[\sections] = ();

piece[\sections][\introduction] = (
	scene: \crystallineCanon,
	layers: [\go, \re, \pe],
	lights: "Sharp cool geometry, bright enough to expose the mechanism but not the whole hall.",
	humanCue: "No human intervention.",
	pattern: {
		// MusStrat: The opening is a packed seed. Grand Orgue states the phyllotactic cell as octave doubles,
		//            while Pedale marks the rotational axis and Recit glints from above.
		// Context: Filotaxis emerges from inhibition and optimized spacing. The introduction therefore presents a compact,
		//          highly legible geometric kernel rather than a diffuse atmosphere.
		Ppar([
			piece[\midiPattern].(
				\go,
				Pseq([[48, 60], [50, 62], [53, 65], [55, 67]], inf),
				Pseq([0.5, 0.5, 0.5, 0.5], inf),
				92,
				0.84
			),
			piece[\midiPattern].(
				\re,
				Pseq([72, 74, 76, 79, 76, 74], inf),
				Pseq([1, 0.5, 0.5, 1, 0.5, 0.5], inf),
				86,
				0.75,
				Pseq([false, true, false, true, false, true], inf)
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 31, 28, 24], inf),
				Pseq([1, 1, 1, 1], inf),
				98,
				0.90
			)
		])
	}
);

piece[\sections][\replication] = (
	scene: \dispersiveCanopy,
	layers: [\go, \po, \re, \so, \pe],
	lights: "The geometry starts rotating; brighter side-light reveals multiple interlocked trajectories.",
	humanCue: "No human intervention.",
	pattern: {
		// MusStrat: Replication activates all divisions as interleaved spirals. The inhibition principle is translated into
		//            rests, staggered attacks, and non-coincident accents rather than into silence.
		// Context: This is local exclusion made audible. Each layer behaves like a competing growth front around a shared stem.
		Ppar([
			piece[\midiPattern].(
				\go,
				Pseq([[48, 60], [50, 62], [53, 65], [57, 69], [55, 67], [52, 64]], inf),
				Pseq([0.5, 0.25, 0.5, 0.25, 0.5, 0.25], inf),
				100,
				0.82,
				Pseq([false, false, true, false, false, true], inf)
			),
			piece[\midiPattern].(
				\po,
				Pseq([60, 64, 67, 71, 67, 64, 62, 59], inf),
				Pseq([0.25, 0.25, 0.375, 0.125, 0.25, 0.25, 0.375, 0.125], inf),
				90,
				0.72,
				Pseq([false, false, false, true, false, false, true, false], inf)
			),
			piece[\midiPattern].(
				\re,
				Pseq([72, 76, 79, 83, 81, 78], inf),
				Pseq([0.75, 0.25, 0.5, 0.5, 0.75, 0.25], inf),
				102,
				0.78,
				Pseq([false, true, false, false, true, false], inf)
			),
			piece[\midiPattern].(
				\so,
				Pseq([79, 84, 86, 88, 84], inf),
				Pseq([1.5, 1, 0.5, 1, 1.5], inf),
				94,
				0.70,
				Pseq([true, false, true, false, true], inf)
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 31, 28, 26, 24, 29], inf),
				Pseq([0.5, 1, 0.5, 1, 0.5, 1], inf),
				106,
				0.88,
				Pseq([false, false, false, true, false, false], inf)
			)
		])
	}
);

piece[\sections][\bridge] = (
	scene: \filotaxisTutti,
	layers: [\go, \po, \re, \pe],
	lights: "The room becomes harder and whiter; transitions are abrupt, almost diagrammatic.",
	humanCue: "No human intervention.",
	pattern: {
		// MusStrat: The bridge is not a release but a tightening. Duration values compress and the entire piece behaves
		//            as if the spiral were being viewed at a higher rotational speed.
		// Context: Inhibitory packing reaches its highest local pressure here. The form becomes crystalline and almost over-determined.
		Ppar([
			piece[\midiPattern].(
				\go,
				Pseq([[50, 62], [53, 65], [55, 67], [57, 69]], inf),
				Pseq([0.25, 0.25, 0.25, 0.25], inf),
				106,
				0.78
			),
			piece[\midiPattern].(
				\po,
				Pseq([62, 65, 69, 72, 74, 77], inf),
				Pseq([0.25, 0.125, 0.125, 0.25, 0.125, 0.125], inf),
				94,
				0.68,
				Pseq([false, false, true, false, false, true], inf)
			),
			piece[\midiPattern].(
				\re,
				Pseq([74, 79, 83, 86], inf),
				Pseq([0.5, 0.5, 0.25, 0.25], inf),
				112,
				0.80,
				Pseq([false, true, false, true], inf)
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 28, 31, 24, 29], inf),
				Pseq([0.5, 0.25, 0.25, 0.5, 0.5], inf),
				112,
				0.84
			)
		])
	}
);

piece[\sections][\climax] = (
	scene: \filotaxisTutti,
	layers: [\go, \po, \re, \so, \pe],
	lights: "Maximum hall definition. Hard edges, high contrast, exposed machinery.",
	humanCue: "No human intervention.",
	pattern: {
		// MusStrat: The climax is the only true overload in the cycle. Full tutti is justified here because the growth law
		//            becomes audible as a saturating mechanism. Every layer contributes but no single line dominates.
		// Context: This is the point where phyllotaxis stops being botanical metaphor and becomes packed mathematical force:
		//          a field of local exclusions operating at instrumental scale beyond one performer's physical reach.
		Ppar([
			piece[\midiPattern].(
				\go,
				Pseq([[52, 64], [55, 67], [57, 69], [59, 71], [60, 72]], inf),
				Pseq([0.25, 0.25, 0.125, 0.125, 0.25], inf),
				116,
				0.76
			),
			piece[\midiPattern].(
				\po,
				Pseq([64, 67, 71, 74, 76, 79, 81, 79, 76, 74], inf),
				Pseq([0.125, 0.125, 0.25, 0.125, 0.125, 0.25, 0.125, 0.125, 0.25, 0.25], inf),
				102,
				0.66,
				Pseq([false, false, false, true, false, false, false, true, false, false], inf)
			),
			piece[\midiPattern].(
				\re,
				Pseq([76, 81, 84, 88, 91, 88], inf),
				Pseq([0.25, 0.25, 0.5, 0.25, 0.25, 0.5], inf),
				118,
				0.74,
				Pseq([false, true, false, false, true, false], inf)
			),
			piece[\midiPattern].(
				\so,
				Pseq([79, 84, 88, 91, 88], inf),
				Pseq([0.75, 0.5, 0.25, 0.5, 0.75], inf),
				114,
				0.70,
				Pseq([true, false, false, false, true], inf)
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 31, 28, 24, 29, 26], inf),
				Pseq([0.25, 0.5, 0.25, 0.5, 0.25, 0.5], inf),
				120,
				0.82
			)
		])
	}
);

piece[\sections][\coda] = (
	scene: \crystallineCanon,
	layers: [\go, \re, \pe],
	lights: "A sudden cutback. The room remains visible but its intensity is halved immediately.",
	humanCue: "No human intervention.",
	pattern: {
		// MusStrat: The coda is a residue pattern, not a relaxation. The same geometry remains, but the growth engine is withdrawn.
		// Context: After overload, only the spacing law survives. The organism leaves behind a hard skeletal trace.
		Ppar([
			piece[\midiPattern].(
				\go,
				Pseq([[48, 60], [53, 65], [55, 67], [53, 65]], inf),
				Pseq([0.5, 0.5, 1, 1], inf),
				92,
				0.80
			),
			piece[\midiPattern].(
				\re,
				Pseq([72, 76, 79, 76], inf),
				Pseq([1, 0.5, 0.5, 1], inf),
				88,
				0.72,
				Pseq([false, true, false, true], inf)
			),
			piece[\midiPattern].(
				\pe,
				Pseq([24, 31, 24, 28], inf),
				Pseq([1, 1, 1, 1], inf),
				100,
				0.90
			)
		])
	}
);

piece[\postSectionCue] = { |sectionKey|
	var spec = piece[\sections][sectionKey];
	var tempoSpec = piece[\tempoFor].(sectionKey);

	("Filotaxis -> " ++ sectionKey.asString
		++ " | " ++ tempoSpec[\bpm].asString ++ " BPM"
		++ " | layers " ++ ~apxCore[\layerTagString].(spec[\layers])).postln;
	("Light: " ++ spec[\lights]).postln;
};

piece[\registerTempoNodes] = {
	~apxCore[\registerPieceTempoNodes].(piece[\key], "07_Filotaxis.scd");
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
	"07_Filotaxis blueprint".postln;
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

~apxPieces[\filotaxis] = piece;
"07_Filotaxis loaded.".postln;
)
