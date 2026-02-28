// 03_Meiosis.scd
// Anthropomixis III: 50/50 windows between system and improviser.
// Load ApomixisSetKlais.scd and ApomixisCore.scd first.

(
var piece;

if(~apx.isNil or: { ~apxCore.isNil }) {
	"03_Meiosis: load ApomixisSetKlais.scd and ApomixisCore.scd first.".warn;
};

~apxPieces = ~apxPieces ? IdentityDictionary.new;

piece = (
	key: \meiosis,
	title: "03. Meiosis / Flor",
	blueprint: ~apxCore[\blueprint].(\meiosis),
	tempoPlan: ~apxCore[\defaultTempoBlueprints][\meiosis],
	sectionPlan: ~apxCore[\sectionPlan].(\meiosis),
	activePlayers: List.new,
	routine: nil,
	currentClock: nil
);

piece[\dense] = { |divisionKey, notes, durs, velocity = 86, legato = 0.94, rests|
	~apxCore[\denseMidiPattern].(divisionKey, notes, durs, velocity, legato, rests)
};

piece[\applySectionState] = { |sectionKey|
	switch(sectionKey,
		\introduction, {
			~apx[\applyScene].(\crystallineCanon);
			~apx[\sendController].(\crescendoGlobal, 18);
		},
		\replication, {
			~apx[\applyScene].(\dispersiveCanopy);
			~apx[\setCoupler].(\iii_i, 127);
			~apx[\setCoupler].(\i_ped, 127);
			~apx[\sendController].(\crescendoGlobal, 30);
		},
		\bridge, {
			~apx[\applyScene].(\seedLoop);
			~apx[\setStop].(\re, \bassonHautbois8, 127);
			~apx[\sendController].(\expressionRecit, 80);
		},
		\climax, {
			~apx[\applyScene].(\filotaxisTutti);
			~apx[\setStop].(\so, \tuba8, 127);
			~apx[\sendController].(\crescendoGlobal, 64);
		},
		\coda, {
			~apx[\applyScene].(\crystallineCanon);
			~apx[\setStop].(\so, \tuba8, 0);
			~apx[\sendController].(\crescendoGlobal, 14);
		}
	);
};

piece[\sections] = ();

piece[\sections][\introduction] = (
	scene: \crystallineCanon,
	layers: [\go, \re, \pe],
	lights: "Neutral-to-cool geometry, no warm human lift yet.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The system establishes the reduction cell alone before the improviser enters. Octave melody, brass shadow, and pedal axis define the field.
		// Context: Meiosis is inverted here: reduction becomes the condition for later multiplication rather than a terminal simplification.
		Ppar([
			piece[\dense].(\go, Pseq([[48, 60], [50, 62], [53, 65], [57, 69]], inf), Pseq([1, 1, 1, 1], inf), 90, 0.86),
			piece[\dense].(\re, Pseq([72, 74, 77, 81], inf), Pseq([2, 1, 2, 1], inf), 72, 0.82, Pseq([true, false, true, false], inf)),
			piece[\dense].(\pe, Pseq([24, 31, 28, 24], inf), Pseq([2, 2, 2, 2], inf), 78, 1.15)
		])
	}
);

piece[\sections][\replication] = (
	scene: \dispersiveCanopy,
	layers: [\go, \re, \pe],
	lights: "Warm lift begins. This is the first 50/50 intervention window.",
	humanCue: "IMPROVISATION WINDOW 1. Enter with short modal cells, restrained fauxbourdon, or parallel intervals.",
	densePattern: {
		// MusStrat: The system opens a responsive canon field with enough space for an improviser to graft phrases into it.
		// Context: Reduplication without reduction becomes shared. Human action is admitted as one more strand inside the proliferating cell logic.
		Ppar([
			piece[\dense].(\go, Pseq([[50, 62], [53, 65], [57, 69], [60, 72], [57, 69]], inf), Pseq([0.5, 1, 0.5, 1, 1], inf), 96, 0.84),
			piece[\dense].(\re, Pseq([74, 77, 81, 84, 81, 77], inf), Pseq([1, 0.5, 1, 0.5, 1, 0.5], inf), 84, 0.80, Pseq([false, true, false, false, true, false], inf)),
			piece[\dense].(\pe, Pseq([24, 29, 31, 24, 26], inf), Pseq([1.5, 1, 2, 1, 1.5], inf), 82, 1.08)
		])
	}
);

piece[\sections][\bridge] = (
	scene: \seedLoop,
	layers: [\go, \re, \pe],
	lights: "The room narrows; this is the second improvisation window and should feel more fractured.",
	humanCue: "IMPROVISATION WINDOW 2. Use hocket, broken dyads, or short isorhythmic puncta.",
	densePattern: {
		// MusStrat: The bridge punctures the canon into sparse, discontinuous cells. The improviser should occupy the gaps rather than overlay them densely.
		// Context: The reduction returns as perforation. The piece rehearses division as a way to create more possible futures.
		Ppar([
			piece[\dense].(\go, Pseq([[48, 60], [53, 65], [50, 62], [57, 69]], inf), Pseq([1.5, 0.5, 1.5, 0.5], inf), 78, 0.78, Pseq([false, true, false, true], inf)),
			piece[\dense].(\re, Pseq([72, 76, 79, 83], inf), Pseq([1, 1, 2, 2], inf), 80, 0.86, Pseq([true, false, true, false], inf)),
			piece[\dense].(\pe, Pseq([24, 24, 29, 24], inf), Pseq([3, 2, 3, 2], inf), 70, 1.30)
		])
	}
);

piece[\sections][\climax] = (
	scene: \filotaxisTutti,
	layers: [\go, \re, \so, \pe],
	lights: "Brightest human/system pressure point. Warmth and mechanical force coexist.",
	humanCue: "IMPROVISATION WINDOW 3. Increase pressure with denser parallels and registral widening; stop decisively.",
	densePattern: {
		// MusStrat: The climax converts the divided cell into amplified proportion. Solo emerges as a divergent extra line, not a soloist.
		// Context: Meiosis is now fully inverted: reduction produces excess, and division breeds expansion.
		Ppar([
			piece[\dense].(\go, Pseq([[52, 64], [55, 67], [57, 69], [59, 71], [60, 72]], inf), Pseq([0.5, 0.5, 0.25, 0.25, 0.5], inf), 108, 0.80),
			piece[\dense].(\re, Pseq([76, 81, 84, 88, 91, 88], inf), Pseq([0.75, 0.25, 0.5, 0.5, 0.75, 0.25], inf), 98, 0.78, Pseq([false, true, false, false, true, false], inf)),
			piece[\dense].(\so, Pseq([79, 84, 88, 91], inf), Pseq([1.5, 1, 1.5, 1], inf), 90, 0.72, Pseq([true, false, true, false], inf)),
			piece[\dense].(\pe, Pseq([24, 31, 28, 24, 29], inf), Pseq([1, 1, 1.5, 1, 1.5], inf), 96, 1.00)
		])
	}
);

piece[\sections][\coda] = (
	scene: \crystallineCanon,
	layers: [\go, \re, \pe],
	lights: "Return to neutral clarity; the human trace recedes but remains metabolized by the system.",
	humanCue: "Return to non-intervention unless otherwise notated.",
	densePattern: {
		// MusStrat: The coda re-clarifies the reduced cell, but it now contains residues of the shared expansion.
		// Context: The form does not erase the human contribution. It stores it as a transformed hereditary trace.
		Ppar([
			piece[\dense].(\go, Pseq([[48, 60], [50, 62], [53, 65], [57, 69]], inf), Pseq([1, 1, 1.5, 1.5], inf), 82, 0.84),
			piece[\dense].(\re, Pseq([72, 76, 79, 76], inf), Pseq([1.5, 1, 1.5, 1], inf), 72, 0.80, Pseq([true, false, true, false], inf)),
			piece[\dense].(\pe, Pseq([24, 29, 24, 26], inf), Pseq([2, 3, 2, 3], inf), 68, 1.20)
		])
	}
);

~apxCore[\attachStandardPieceMethods].(piece);
~apxPieces[\meiosis] = piece;
"03_Meiosis loaded.".postln;
)
