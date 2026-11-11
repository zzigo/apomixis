// 05_Polygonum.scd
// Anthropomixis II: guided improvisation through all sections.
// Load ApomixisSetKlais.scd and ApomixisCore.scd first.

(
var piece;

if(~apx.isNil or: { ~apxCore.isNil }) {
	"05_Polygonum: load ApomixisSetKlais.scd and ApomixisCore.scd first.".warn;
};

~apxPieces = ~apxPieces ? IdentityDictionary.new;

piece = (
	key: \polygonum,
	title: "05. Polygonum / Saco embrionario",
	blueprint: ~apxCore[\blueprint].(\polygonum),
	tempoPlan: ~apxCore[\defaultTempoBlueprints][\polygonum],
	sectionPlan: ~apxCore[\sectionPlan].(\polygonum),
	activePlayers: List.new,
	routine: nil,
	currentClock: nil
);

piece[\dense] = { |divisionKey, notes, durs, velocity = 80, legato = 0.96, rests|
	~apxCore[\denseMidiPattern].(divisionKey, notes, durs, velocity, legato, rests)
};

piece[\applySectionState] = { |sectionKey|
	switch(sectionKey,
		\introduction, {
			~apx[\applyScene].(\megasporaDream);
			~apx[\setStop].(\so, \seraphonFlote8, 127);
			~apx[\sendController].(\expressionPositif, 82);
			~apx[\sendController].(\expressionRecit, 78);
		},
		\replication, {
			~apx[\applyScene].(\microsporaVocal);
			~apx[\setCoupler].(\iv_iii, 127);
			~apx[\sendController].(\crescendoGlobal, 22);
		},
		\bridge, {
			~apx[\applyScene].(\seedLoop);
			~apx[\setStop].(\so, \seraphonFlote8, 127);
			~apx[\sendController].(\crescendoGlobal, 14);
		},
		\climax, {
			~apx[\applyScene].(\dispersiveCanopy);
			~apx[\setStop].(\re, \trompetteHarmonique8, 127);
			~apx[\setStop].(\so, \tuba8, 127);
			~apx[\sendController].(\crescendoGlobal, 44);
		},
		\coda, {
			~apx[\applyScene].(\megasporaDream);
			~apx[\setStop].(\so, \tuba8, 0);
			~apx[\setStop].(\re, \trompetteHarmonique8, 0);
			~apx[\sendController].(\crescendoGlobal, 10);
		}
	);
};

piece[\sections] = ();

piece[\sections][\introduction] = (
	scene: \megasporaDream,
	layers: [\po, \re, \so],
	lights: "Warm chamber, intimate and interior, as if entering an already-living sac.",
	humanCue: "IMPROVISER ACTIVE. State a bare modal axis, dyad, or slow organum contour.",
	densePattern: {
		// MusStrat: The system opens a chamber, not a discourse. Positif, Recit, and Solo make room for a human line to enter without needing to dominate.
		// Context: Polygonum is an interior architecture. The performer enters as one more inhabitant of the chamber, not as an external author.
		Ppar([
			piece[\dense].(\po, Pseq([57, 60, 64, 60, 57], inf), Pseq([2, 1, 2, 1, 2], inf), 56, 0.88),
			piece[\dense].(\re, Pseq([[65, 72], [67, 74], [69, 76], [67, 74]], inf), Pseq([3, 2, 3, 2], inf), 60, 1.00),
			piece[\dense].(\so, Pseq([76, 79, 83, 79], inf), Pseq([4, 3, 4, 3], inf), 50, 0.80, Pseq([true, false, true, false], inf))
		])
	}
);

piece[\sections][\replication] = (
	scene: \microsporaVocal,
	layers: [\po, \re, \so],
	lights: "The chamber becomes more articulated; bodily presence is visible but still integrated.",
	humanCue: "IMPROVISER ACTIVE. Use organum, fauxbourdon, hocket, or sustained tenors with moving upper strands.",
	densePattern: {
		// MusStrat: The system supplies responsive lattice-work around the improviser: layered arpeggiation, held dyads, and sparse Solo divergences.
		// Context: This is guided free improvisation inside an autonomous chamber. Medieval and Renaissance gestures are metabolized into a posthuman ecology.
		Ppar([
			piece[\dense].(\po, Pseq([60, 64, 67, 71, 67, 64, 62, 59], inf), Pseq([0.5, 0.5, 1, 0.5, 0.5, 1, 0.5, 1], inf), 72, 0.80),
			piece[\dense].(\re, Pseq([[67, 74], [69, 76], [72, 79], [74, 81]], inf), Pseq([2, 1, 2, 1], inf), 74, 0.90),
			piece[\dense].(\so, Pseq([79, 83, 86, 83, 88], inf), Pseq([3, 2, 3, 2, 4], inf), 58, 0.76, Pseq([true, false, true, false, true], inf))
		])
	}
);

piece[\sections][\bridge] = (
	scene: \seedLoop,
	layers: [\po, \re, \so],
	lights: "The chamber contracts. The improviser should feel inside the mechanism rather than above it.",
	humanCue: "IMPROVISER ACTIVE, but thin the texture and avoid foreground display.",
	densePattern: {
		// MusStrat: The bridge reduces the density and hands the foreground back to resonant space and intervallic memory.
		// Context: The embryonic chamber closes around the human trace. The improvisation should behave as internal pressure, not external commentary.
		Ppar([
			piece[\dense].(\po, Pseq([57, 60, 62, 60], inf), Pseq([1.5, 1.5, 2, 1], inf), 54, 0.86),
			piece[\dense].(\re, Pseq([[64, 71], [62, 69], [60, 67]], inf), Pseq([3, 3, 2], inf), 56, 0.94),
			piece[\dense].(\so, Pseq([76, 79, 74], inf), Pseq([5, 4, 6], inf), 44, 0.74, Pseq([true, false, true], inf))
		])
	}
);

piece[\sections][\climax] = (
	scene: \dispersiveCanopy,
	layers: [\po, \re, \so, \pe],
	lights: "Warm chamber under pressure, brighter edges, but never theatrical spotlighting.",
	humanCue: "IMPROVISER ACTIVE. Intensify through accumulation, cadential pressure, and registral widening.",
	densePattern: {
		// MusStrat: The climax lets the chamber resonate outward. Pedale enters as a concealed floor while Solo becomes a contrapuntal divergence.
		// Context: Polygonum opens its interior at the point of greatest vitality. The human gesture accelerates the chamber but never governs it.
		Ppar([
			piece[\dense].(\po, Pseq([60, 64, 67, 71, 74, 76, 74, 71], inf), Pseq([0.5, 0.5, 0.5, 0.5, 1, 0.5, 0.5, 1], inf), 80, 0.78),
			piece[\dense].(\re, Pseq([[67, 74], [72, 79], [74, 81], [76, 83]], inf), Pseq([1.5, 1, 1.5, 1], inf), 86, 0.86),
			piece[\dense].(\so, Pseq([79, 83, 88, 91], inf), Pseq([2, 1, 2, 1], inf), 68, 0.72, Pseq([true, false, false, true], inf)),
			piece[\dense].(\pe, Pseq([24, 29, 31, 24], inf), Pseq([2, 2, 1.5, 2.5], inf), 66, 1.10)
		])
	}
);

piece[\sections][\coda] = (
	scene: \megasporaDream,
	layers: [\po, \re, \so],
	lights: "Warmth remains, but interiority closes around the residue.",
	humanCue: "IMPROVISER WITHDRAWS toward sparse interiority.",
	densePattern: {
		// MusStrat: The coda seals the chamber by leaving only a few resonant corridors active.
		// Context: Polygonum ends by internal retention. The system keeps the human trace as part of its own enclosed architecture.
		Ppar([
			piece[\dense].(\po, Pseq([57, 60, 64, 60], inf), Pseq([2, 1, 2, 1], inf), 50, 0.86),
			piece[\dense].(\re, Pseq([[64, 71], [67, 74], [64, 71]], inf), Pseq([3, 2, 3], inf), 54, 0.96),
			piece[\dense].(\so, Pseq([76, 79, 74], inf), Pseq([6, 5, 7], inf), 40, 0.70, Pseq([true, false, true], inf))
		])
	}
);

~apxCore[\attachStandardPieceMethods].(piece);
~apxPieces[\polygonum] = piece;
"05_Polygonum loaded.".postln;
)
