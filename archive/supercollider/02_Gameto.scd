// 02_Gameto.scd
// Automata piece: suspended encounter.
// Load ApomixisSetKlais.scd and ApomixisCore.scd first.

(
var piece;

if(~apx.isNil or: { ~apxCore.isNil }) {
	"02_Gameto: load ApomixisSetKlais.scd and ApomixisCore.scd first.".warn;
};

~apxPieces = ~apxPieces ? IdentityDictionary.new;

piece = (
	key: \gameto,
	title: "02. Gameto / El grano",
	blueprint: ~apxCore[\blueprint].(\gameto),
	tempoPlan: ~apxCore[\defaultTempoBlueprints][\gameto],
	sectionPlan: ~apxCore[\sectionPlan].(\gameto),
	activePlayers: List.new,
	routine: nil,
	currentClock: nil
);

piece[\dense] = { |divisionKey, notes, durs, velocity = 78, legato = 0.96, rests|
	~apxCore[\denseMidiPattern].(divisionKey, notes, durs, velocity, legato, rests)
};

piece[\applySectionState] = { |sectionKey|
	switch(sectionKey,
		\introduction, {
			~apx[\applyScene].(\seedLoop);
			~apx[\setStop].(\po, \clarinette8, 0);
			~apx[\setStop].(\re, \voixHumaine8, 0);
			~apx[\sendController].(\expressionPositif, 92);
			~apx[\sendController].(\expressionRecit, 86);
		},
		\replication, {
			~apx[\applyScene].(\crystallineCanon);
			~apx[\setStop].(\po, \salicional8, 127);
			~apx[\setStop].(\re, \voixCeleste8, 127);
			~apx[\sendController].(\crescendoGlobal, 22);
		},
		\bridge, {
			~apx[\applyScene].(\megasporaDream);
			~apx[\setStop].(\re, \voixHumaine8, 127);
			~apx[\sendController].(\expressionRecit, 72);
		},
		\climax, {
			~apx[\applyScene].(\microsporaVocal);
			~apx[\setStop].(\po, \cornetV8, 127);
			~apx[\setStop].(\re, \trompetteHarmonique8, 127);
			~apx[\sendController].(\crescendoGlobal, 36);
		},
		\coda, {
			~apx[\applyScene].(\seedLoop);
			~apx[\setStop].(\po, \cornetV8, 0);
			~apx[\setStop].(\re, \trompetteHarmonique8, 0);
			~apx[\sendController].(\crescendoGlobal, 10);
		}
	);
};

piece[\sections] = ();

piece[\sections][\introduction] = (
	scene: \seedLoop,
	layers: [\po, \re],
	lights: "Suspended neutral chamber, slightly brighter than Esporo but still inward-facing.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The opening presents two potential poles that never quite fuse. Positif and Recit remain near each other but do not converge.
		// Context: Gameto is suspended encounter. The piece dramatizes proximity without completion, maintaining reproductive tension in stasis.
		Ppar([
			piece[\dense].(\po, Pseq([60, 62, 65, 62, 60], inf), Pseq([2, 1, 2, 1, 2], inf), 58, 0.88),
			piece[\dense].(\re, Pseq([67, 69, 72, 69, 67], inf), Pseq([2, 1, 2, 1, 2], inf), 62, 0.92, Pseq([true, false, true, false, true], inf))
		])
	}
);

piece[\sections][\replication] = (
	scene: \crystallineCanon,
	layers: [\po, \re],
	lights: "The field clarifies. Distances are visible, but still not bridged.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: Replication constructs paired but offset harmonic strands, like two genetic vectors circling each other in canonical disproportion.
		// Context: Hyperclarity and hypercrystallinity appear here as competing modes: one transparent, one almost too ordered to become living contact.
		Ppar([
			piece[\dense].(\po, Pseq([[60, 64], [62, 65], [65, 69], [67, 71], [65, 69]], inf), Pseq([1, 0.5, 1, 0.5, 1], inf), 70, 0.82),
			piece[\dense].(\re, Pseq([[67, 71], [69, 72], [72, 76], [74, 77], [72, 76]], inf), Pseq([1.5, 0.5, 1.5, 0.5, 1.5], inf), 76, 0.88, Pseq([false, true, false, true, false], inf))
		])
	}
);

piece[\sections][\bridge] = (
	scene: \megasporaDream,
	layers: [\po, \re, \pe],
	lights: "The chamber becomes softer and dimmer, as if the encounter had been deferred inward.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The bridge introduces Pedale as withheld gravity. The upper layers thin out and leave harmonic distance audible.
		// Context: The suspended meeting is transferred into latency. The grain remains viable, but the union is postponed.
		Ppar([
			piece[\dense].(\po, Pseq([57, 60, 62, 60, 57], inf), Pseq([1.5, 1.5, 2, 1, 2], inf), 52, 0.90),
			piece[\dense].(\re, Pseq([[65, 72], [64, 71], [62, 69], [60, 67]], inf), Pseq([3, 2, 3, 2], inf), 56, 1.00),
			piece[\dense].(\pe, Pseq([24, 29, 24, 26], inf), Pseq([4, 5, 4, 5], inf), 54, 1.40)
		])
	}
);

piece[\sections][\climax] = (
	scene: \microsporaVocal,
	layers: [\po, \re, \so],
	lights: "The room warms slightly, but still no full release; tension becomes brighter, not resolved.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The climax intensifies by increasing the rate of near-meetings and registral crossings, not by final convergence.
		// Context: Gametic suspense remains constitutive. The piece reaches maximum charge at the threshold of contact and stops there.
		Ppar([
			piece[\dense].(\po, Pseq([60, 64, 67, 71, 74, 71, 67, 64], inf), Pseq([0.5, 0.5, 0.25, 0.25, 0.5, 0.5, 0.25, 0.25], inf), 74, 0.78),
			piece[\dense].(\re, Pseq([67, 71, 74, 77, 81, 77, 74, 71], inf), Pseq([0.75, 0.25, 0.5, 0.5, 0.75, 0.25, 0.5, 0.5], inf), 82, 0.82, Pseq([false, true, false, false, true, false, false, true], inf)),
			piece[\dense].(\so, Pseq([79, 83, 86, 83], inf), Pseq([2, 1, 2, 1], inf), 60, 0.74, Pseq([true, false, true, false], inf))
		])
	}
);

piece[\sections][\coda] = (
	scene: \seedLoop,
	layers: [\po, \re],
	lights: "Return to suspended neutrality, with tension retained rather than dissolved.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The coda pares the texture back to two incomplete strands and leaves the intervallic space unclosed.
		// Context: Gameto ends as deferred relation. Its closure is abstention, not consummation.
		Ppar([
			piece[\dense].(\po, Pseq([60, 62, 65, 62], inf), Pseq([2, 1, 2, 1], inf), 54, 0.86),
			piece[\dense].(\re, Pseq([67, 69, 72, 69], inf), Pseq([2, 1, 2, 1], inf), 58, 0.90, Pseq([true, false, true, false], inf))
		])
	}
);

~apxCore[\attachStandardPieceMethods].(piece);
~apxPieces[\gameto] = piece;
"02_Gameto loaded.".postln;
)
