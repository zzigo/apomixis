// 08_ProtoEspora.scd
// Automata piece: dormant potency and threshold activation.
// Load ApomixisSetKlais.scd and ApomixisCore.scd first.

(
var piece;

if(~apx.isNil or: { ~apxCore.isNil }) {
	"08_ProtoEspora: load ApomixisSetKlais.scd and ApomixisCore.scd first.".warn;
};

~apxPieces = ~apxPieces ? IdentityDictionary.new;

piece = (
	key: \protoespora,
	title: "08. Proto-espora",
	blueprint: ~apxCore[\blueprint].(\protoespora),
	tempoPlan: ~apxCore[\defaultTempoBlueprints][\protoespora],
	sectionPlan: ~apxCore[\sectionPlan].(\protoespora),
	activePlayers: List.new,
	routine: nil,
	currentClock: nil
);

piece[\dense] = { |divisionKey, notes, durs, velocity = 74, legato = 0.98, rests|
	~apxCore[\denseMidiPattern].(divisionKey, notes, durs, velocity, legato, rests)
};

piece[\applySectionState] = { |sectionKey|
	switch(sectionKey,
		\introduction, {
			~apx[\applyScene].(\megasporaDream);
			~apx[\setStop].(\so, \seraphonFlote8, 127);
			~apx[\sendController].(\crescendoGlobal, 8);
		},
		\replication, {
			~apx[\applyScene].(\seedLoop);
			~apx[\setStop].(\so, \seraphonFlote8, 127);
			~apx[\sendController].(\crescendoGlobal, 14);
		},
		\bridge, {
			~apx[\applyScene].(\megasporaDream);
			~apx[\sendController].(\expressionPositif, 70);
			~apx[\sendController].(\expressionRecit, 64);
		},
		\climax, {
			~apx[\applyScene].(\microsporaVocal);
			~apx[\setStop].(\so, \seraphonFlote8, 127);
			~apx[\setStop].(\re, \voixHumaine8, 127);
			~apx[\sendController].(\crescendoGlobal, 28);
		},
		\coda, {
			~apx[\applyScene].(\megasporaDream);
			~apx[\setStop].(\re, \voixHumaine8, 0);
			~apx[\sendController].(\crescendoGlobal, 6);
		}
	);
};

piece[\sections] = ();

piece[\sections][\introduction] = (
	scene: \megasporaDream,
	layers: [\po, \so, \pe],
	lights: "Dormant dusk field, almost no sense of attack, only threshold-bearing presence.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The opening is almost latent. Positif and Solo hover above an inert bass floor with long durations and low onset count.
		// Context: Proto-spore means directed potency withheld. The piece begins before orientation takes shape.
		Ppar([
			piece[\dense].(\po, Pseq([57, 60, 64, 60], inf), Pseq([3, 4, 3, 5], inf), 44, 1.10),
			piece[\dense].(\so, Pseq([76, 79, 74], inf), Pseq([6, 5, 7], inf), 40, 0.82, Pseq([true, false, true], inf)),
			piece[\dense].(\pe, Pseq([24, 24, 29, 24], inf), Pseq([6, 5, 7, 5], inf), 48, 1.90)
		])
	}
);

piece[\sections][\replication] = (
	scene: \seedLoop,
	layers: [\po, \so, \pe],
	lights: "The latent field begins to reveal internal activation, but still remains inward and dim.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: Replication introduces more regular pulse and smaller durational grains, as if the dormant body were nearing threshold.
		// Context: Latency does not oppose activity; it prepares it. The proto-spore grows by accumulating conditions for emergence.
		Ppar([
			piece[\dense].(\po, Pseq([57, 60, 64, 67, 64, 60], inf), Pseq([1.5, 1, 1.5, 2, 1, 2], inf), 56, 0.96),
			piece[\dense].(\so, Pseq([76, 79, 83, 79], inf), Pseq([3, 2, 3, 2], inf), 48, 0.78, Pseq([true, false, true, false], inf)),
			piece[\dense].(\pe, Pseq([24, 29, 31, 24], inf), Pseq([3, 2.5, 3, 2.5], inf), 56, 1.55)
		])
	}
);

piece[\sections][\bridge] = (
	scene: \megasporaDream,
	layers: [\po, \re, \so, \pe],
	lights: "Cooling phase before bloom; the room stays low but becomes more transparent.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The bridge cools the pulse slightly and introduces Recit as a threshold shimmer rather than as an overt line.
		// Context: Threshold activation is not linear. The process backs away from bloom before crossing it.
		Ppar([
			piece[\dense].(\po, Pseq([55, 57, 60, 64, 60], inf), Pseq([2, 1.5, 2, 2.5, 2], inf), 50, 0.94),
			piece[\dense].(\re, Pseq([[64, 71], [67, 74], [69, 76]], inf), Pseq([4, 3, 4], inf), 48, 1.02, Pseq([true, false, true], inf)),
			piece[\dense].(\so, Pseq([74, 79, 83], inf), Pseq([5, 4, 6], inf), 42, 0.76, Pseq([true, false, true], inf)),
			piece[\dense].(\pe, Pseq([24, 26, 29, 24], inf), Pseq([5, 4, 5, 4], inf), 50, 1.70)
		])
	}
);

piece[\sections][\climax] = (
	scene: \microsporaVocal,
	layers: [\po, \re, \so, \pe],
	lights: "The dormant field blooms into a brief visible interior radiance.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The climax is bloom by threshold crossing. Onset density increases but remains spacious enough to preserve the sense of delayed emergence.
		// Context: Proto-spore becomes briefly directional only at the point of bloom. The form treats activation as a threshold event, not a continuous crescendo.
		Ppar([
			piece[\dense].(\po, Pseq([60, 64, 67, 71, 74, 71, 67], inf), Pseq([0.75, 0.5, 0.75, 0.5, 1, 0.5, 1], inf), 68, 0.84),
			piece[\dense].(\re, Pseq([69, 72, 76, 79, 83], inf), Pseq([1.5, 1, 1.5, 1, 2], inf), 64, 0.88, Pseq([false, true, false, true, false], inf)),
			piece[\dense].(\so, Pseq([79, 83, 88, 91], inf), Pseq([2.5, 1.5, 2.5, 1.5], inf), 56, 0.72, Pseq([true, false, true, false], inf)),
			piece[\dense].(\pe, Pseq([24, 29, 31, 24, 26], inf), Pseq([2, 2, 1.5, 2, 2.5], inf), 60, 1.20)
		])
	}
);

piece[\sections][\coda] = (
	scene: \megasporaDream,
	layers: [\po, \so, \pe],
	lights: "Residual dusk returns, but now with the memory of activation still inside it.",
	humanCue: "No human intervention.",
	densePattern: {
		// MusStrat: The coda lets the bloom collapse back into latent potency rather than into empty silence.
		// Context: Proto-spore ends by containing direction as memory, not as ongoing teleology.
		Ppar([
			piece[\dense].(\po, Pseq([57, 60, 64, 60], inf), Pseq([3, 2, 3, 2], inf), 46, 1.04),
			piece[\dense].(\so, Pseq([76, 79, 74], inf), Pseq([6, 5, 7], inf), 38, 0.74, Pseq([true, false, true], inf)),
			piece[\dense].(\pe, Pseq([24, 24, 29, 24], inf), Pseq([6, 5, 7, 5], inf), 46, 1.85)
		])
	}
);

~apxCore[\attachStandardPieceMethods].(piece);
~apxPieces[\protoespora] = piece;
"08_ProtoEspora loaded.".postln;
)
