// 01_Esporo.scd
// Automata piece: dispersive seed-field.
// Load ApomixisSetKlais.scd and ApomixisCore.scd first.

(
var piece;

if(~apx.isNil or: { ~apxCore.isNil }) {
	"01_Esporo: load ApomixisSetKlais.scd and ApomixisCore.scd first.".warn;
};

~apxPieces = ~apxPieces ? IdentityDictionary.new;

piece = (
	key: \esporo,
	title: "01. Esporo / La planta",
	blueprint: ~apxCore[\blueprint].(\esporo),
	tempoPlan: ~apxCore[\defaultTempoBlueprints][\esporo],
	sectionPlan: ~apxCore[\sectionPlan].(\esporo),
	activePlayers: List.new,
	routine: nil,
	currentClock: nil
);

piece[\dense] = { |divisionKey, notes, durs, velocity = 82, legato = 0.94, rests|
	~apxCore[\denseMidiPattern].(divisionKey, notes, durs, velocity, legato, rests)
};

piece[\applySectionState] = { |sectionKey|
	switch(sectionKey,
		\introduction, {
			~apx[\applyScene].(\seedLoop);
			~apx[\sendController].(\crescendoGlobal, 10);
		},
		\replication, {
			~apx[\applyScene].(\dispersiveCanopy);
			~apx[\setCoupler].(\ii_ped, 127);
			~apx[\sendController].(\crescendoGlobal, 24);
		},
		\bridge, {
			~apx[\applyScene].(\seedLoop);
			~apx[\setStop].(\go, \prestant4, 127);
			~apx[\setStop].(\pe, \flute32, 127);
			~apx[\sendController].(\crescendoGlobal, 16);
		},
		\climax, {
			~apx[\applyScene].(\dispersiveCanopy);
			~apx[\setStop].(\go, \montre8, 127);
			~apx[\setStop].(\po, \doublette2, 127);
			~apx[\sendController].(\crescendoGlobal, 34);
		},
		\coda, {
			~apx[\applyScene].(\seedLoop);
			~apx[\setCoupler].(\ii_ped, 0);
			~apx[\sendController].(\crescendoGlobal, 8);
		}
	);
};

piece[\sections] = ();

piece[\sections][\introduction] = (
	scene: \seedLoop,
	layers: [\go, \po, \pe],
	lights: "Cool low hall light, almost no front light, audience mostly in shadow.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: A single looped seed action is distributed across Grand Orgue and Pedale, while Positif behaves as the faint halo of dispersal.
		// Context: Esporo begins as unassigned propagation. The piece imagines spores as directional releases rather than thematic motives.
		Ppar([
			piece[\dense].(\go, Pseq([[48, 60], [50, 62], [53, 65], [50, 62]], inf), Pseq([1, 1, 1, 1], inf), 84, 0.88),
			piece[\dense].(\po, Pseq([67, 69, 72, 69], inf), Pseq([2, 1, 2, 1], inf), 58, 0.80, Pseq([true, false, true, false], inf)),
			piece[\dense].(\pe, Pseq([24, 29, 24, 31], inf), Pseq([2, 2, 2, 2], inf), 70, 1.20)
		])
	}
);

piece[\sections][\replication] = (
	scene: \dispersiveCanopy,
	layers: [\go, \po, \pe],
	lights: "Side light reveals multiple outward trajectories without warming the space.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: Replication thickens by sending the same cell through different durational kernels. The piece grows by scattering copies, not by thematic contrast.
		// Context: Vector dispersion becomes audible as layered release. Each layer behaves like a different aerodynamic fate for the same propagule.
		Ppar([
			piece[\dense].(\go, Pseq([[48, 60], [50, 62], [53, 65], [57, 69], [55, 67], [52, 64]], inf), Pseq([0.5, 1, 0.5, 1.5, 0.5, 1], inf), 92, 0.86),
			piece[\dense].(\po, Pseq([60, 64, 67, 71, 74, 71, 67, 64], inf), Pseq([0.25, 0.25, 0.5, 0.5, 0.25, 0.25, 0.5, 0.5], inf), 72, 0.76, Pseq([false, true, false, false, true, false, false, true], inf)),
			piece[\dense].(\pe, Pseq([24, 29, 31, 24, 28, 26], inf), Pseq([1.5, 1, 2, 1, 1.5, 1], inf), 82, 1.05)
		])
	}
);

piece[\sections][\bridge] = (
	scene: \seedLoop,
	layers: [\po, \re, \pe],
	lights: "A slight dimming; trajectories blur into a more suspended field.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The bridge hollows the octave profile and moves the dispersal logic into hovering dyads and slower bass returns.
		// Context: Dispersion without destination implies periods of suspension. This bridge is the spore in drift, neither landed nor extinguished.
		Ppar([
			piece[\dense].(\po, Pseq([57, 60, 64, 60, 57], inf), Pseq([1.5, 1, 2, 1, 2], inf), 60, 0.84),
			piece[\dense].(\re, Pseq([[69, 76], [67, 74], [64, 72], [62, 69]], inf), Pseq([3, 2, 3, 2], inf), 66, 1.05, Pseq([false, true, false, true], inf)),
			piece[\dense].(\pe, Pseq([24, 24, 29, 24, 26], inf), Pseq([4, 3, 5, 4, 4], inf), 64, 1.35)
		])
	}
);

piece[\sections][\climax] = (
	scene: \dispersiveCanopy,
	layers: [\go, \po, \re, \pe],
	lights: "The chamber opens laterally but remains cold; motion becomes visibly multi-directional.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The climax is a dispersive canopy, not a block-tutti. The layers reach maximum non-coincident activity while preserving registral intelligibility.
		// Context: Mass release is treated as ecology rather than rhetoric. What expands here is propagation pressure.
		Ppar([
			piece[\dense].(\go, Pseq([[50, 62], [53, 65], [57, 69], [60, 72], [57, 69]], inf), Pseq([0.5, 0.5, 1, 0.5, 1], inf), 98, 0.84),
			piece[\dense].(\po, Pseq([62, 65, 69, 72, 76, 79, 76, 72], inf), Pseq([0.25, 0.25, 0.25, 0.5, 0.25, 0.25, 0.25, 0.5], inf), 78, 0.74, Pseq([false, false, true, false, false, true, false, false], inf)),
			piece[\dense].(\re, Pseq([74, 77, 81, 84, 81, 77], inf), Pseq([1, 0.5, 1, 0.5, 1, 0.5], inf), 76, 0.82, Pseq([true, false, true, false, true, false], inf)),
			piece[\dense].(\pe, Pseq([24, 29, 31, 24, 28, 26], inf), Pseq([1, 1.5, 1, 2, 1, 1.5], inf), 88, 1.02)
		])
	}
);

piece[\sections][\coda] = (
	scene: \seedLoop,
	layers: [\go, \po, \pe],
	lights: "Back to a cool residue, with only a faint lateral halo remaining.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The coda collapses the canopy back into a single viable loop. Only the propagative trace remains.
		// Context: Esporo ends without cadencing. The process leaves a seed-form behind and withdraws from explicit expansion.
		Ppar([
			piece[\dense].(\go, Pseq([[48, 60], [50, 62], [53, 65], [50, 62]], inf), Pseq([1.5, 1.5, 2, 1], inf), 70, 0.86),
			piece[\dense].(\po, Pseq([64, 67, 69, 67], inf), Pseq([2, 1, 2, 1], inf), 52, 0.78, Pseq([true, false, true, false], inf)),
			piece[\dense].(\pe, Pseq([24, 29, 24, 26], inf), Pseq([3, 3, 2, 4], inf), 58, 1.25)
		])
	}
);

~apxCore[\attachStandardPieceMethods].(piece);
~apxPieces[\esporo] = piece;
"01_Esporo loaded.".postln;
)
