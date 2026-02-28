// 06_Oosfera.scd
// Anthropomixis IV: at most three punctual human events.
// Load ApomixisSetKlais.scd and ApomixisCore.scd first.

(
var piece;

if(~apx.isNil or: { ~apxCore.isNil }) {
	"06_Oosfera: load ApomixisSetKlais.scd and ApomixisCore.scd first.".warn;
};

~apxPieces = ~apxPieces ? IdentityDictionary.new;

piece = (
	key: \oosfera,
	title: "06. Oosfera",
	blueprint: ~apxCore[\blueprint].(\oosfera),
	tempoPlan: ~apxCore[\defaultTempoBlueprints][\oosfera],
	sectionPlan: ~apxCore[\sectionPlan].(\oosfera),
	activePlayers: List.new,
	routine: nil,
	currentClock: nil
);

piece[\dense] = { |divisionKey, notes, durs, velocity = 76, legato = 0.98, rests|
	~apxCore[\denseMidiPattern].(divisionKey, notes, durs, velocity, legato, rests)
};

piece[\applySectionState] = { |sectionKey|
	switch(sectionKey,
		\introduction, {
			~apx[\applyScene].(\seedLoop);
			~apx[\setStop].(\re, \voixHumaine8, 127);
			~apx[\setStop].(\so, \seraphonFlote8, 127);
			~apx[\sendController].(\expressionRecit, 72);
		},
		\replication, {
			~apx[\applyScene].(\microsporaVocal);
			~apx[\sendController].(\crescendoGlobal, 18);
		},
		\bridge, {
			~apx[\applyScene].(\megasporaDream);
			~apx[\setStop].(\so, \seraphonFlote8, 127);
			~apx[\sendController].(\crescendoGlobal, 12);
		},
		\climax, {
			~apx[\applyScene].(\dispersiveCanopy);
			~apx[\setStop].(\re, \bassonHautbois8, 127);
			~apx[\sendController].(\crescendoGlobal, 32);
		},
		\coda, {
			~apx[\applyScene].(\seedLoop);
			~apx[\setStop].(\re, \bassonHautbois8, 0);
			~apx[\sendController].(\crescendoGlobal, 8);
		}
	);
};

piece[\sections] = ();

piece[\sections][\introduction] = (
	scene: \seedLoop,
	layers: [\re, \so, \pe],
	lights: "Dark chamber with a narrow interior glow; the first human event should feel like a brief wake impulse.",
	humanCue: "HUMAN EVENT 1 at the end of the Introduction: one brief sonority, attack, interval, or pulse.",
	densePattern: {
		// MusStrat: The system opens in a latent chamber of Recit, Solo, and Pedale. Everything is prepared for a single external activation.
		// Context: Oosfera is self-contained potential. The first human act is not development but ignition.
		Ppar([
			piece[\dense].(\re, Pseq([[64, 71], [62, 69], [60, 67]], inf), Pseq([3, 3, 2], inf), 54, 1.05),
			piece[\dense].(\so, Pseq([76, 79, 74], inf), Pseq([5, 4, 6], inf), 46, 0.78, Pseq([true, false, true], inf)),
			piece[\dense].(\pe, Pseq([24, 24, 29, 24], inf), Pseq([4, 5, 4, 5], inf), 56, 1.50)
		])
	}
);

piece[\sections][\replication] = (
	scene: \microsporaVocal,
	layers: [\re, \so, \pe],
	lights: "A low warm lift reveals that the chamber is now active from within.",
	humanCue: "No human event here; let the system develop the activation internally.",
	densePattern: {
		// MusStrat: Replication remains inward. Solo and Recit exchange activation states while Pedale prevents them from becoming free lyric lines.
		// Context: The oosphere activates without exterior contact, but once triggered it develops its own internal metabolic rhythm.
		Ppar([
			piece[\dense].(\re, Pseq([67, 71, 74, 77, 74, 71], inf), Pseq([1, 1, 0.5, 1.5, 1, 1], inf), 70, 0.86),
			piece[\dense].(\so, Pseq([79, 83, 86, 83], inf), Pseq([2, 1.5, 2, 1.5], inf), 58, 0.74, Pseq([true, false, true, false], inf)),
			piece[\dense].(\pe, Pseq([24, 29, 31, 24], inf), Pseq([2.5, 2, 2.5, 2], inf), 62, 1.18)
		])
	}
);

piece[\sections][\bridge] = (
	scene: \megasporaDream,
	layers: [\re, \so, \pe],
	lights: "Second wake pulse: a brief structural shift, not a long human phrase.",
	humanCue: "HUMAN EVENT 2 in the Bridge: one punctual redirecting event opening a new register zone.",
	densePattern: {
		// MusStrat: The bridge slows and reorients. The human event should operate like a switch, not a solo insertion.
		// Context: The chamber is redirected by a minimal anthropic perturbation, preserving the work's non-anthropocentric economy.
		Ppar([
			piece[\dense].(\re, Pseq([[65, 72], [64, 71], [62, 69]], inf), Pseq([2.5, 3, 2.5], inf), 56, 0.98),
			piece[\dense].(\so, Pseq([74, 79, 83], inf), Pseq([4, 3, 5], inf), 44, 0.72, Pseq([true, false, true], inf)),
			piece[\dense].(\pe, Pseq([24, 26, 29, 24], inf), Pseq([5, 4, 5, 4], inf), 54, 1.60)
		])
	}
);

piece[\sections][\climax] = (
	scene: \dispersiveCanopy,
	layers: [\re, \so, \pe],
	lights: "Internal brightness rises, but the hall stays restrained; the pressure remains chamber-bound.",
	humanCue: "No human event here unless specifically notated; the system should own the rise in pressure.",
	densePattern: {
		// MusStrat: The climax intensifies the chamber rather than breaking it open. It is a pressure bloom, not an explosion.
		// Context: Oosfera activates from inside itself. Its peak remains auto-generated even after punctual human contact.
		Ppar([
			piece[\dense].(\re, Pseq([69, 72, 76, 79, 83, 79, 76, 72], inf), Pseq([0.75, 0.5, 0.75, 0.5, 1, 0.5, 0.75, 0.5], inf), 78, 0.82),
			piece[\dense].(\so, Pseq([79, 84, 88, 91], inf), Pseq([2, 1, 2, 1], inf), 66, 0.70, Pseq([true, false, false, true], inf)),
			piece[\dense].(\pe, Pseq([24, 29, 31, 24, 26], inf), Pseq([2, 2, 1.5, 2, 2.5], inf), 68, 1.12)
		])
	}
);

piece[\sections][\coda] = (
	scene: \seedLoop,
	layers: [\re, \so, \pe],
	lights: "Late residual glow only. The final human act should seal or suspend the process.",
	humanCue: "HUMAN EVENT 3 late in the Coda or immediately after the climax break: brief, dry, final.",
	densePattern: {
		// MusStrat: The coda recedes toward latent chamber tone. The final human event should close a valve, not decorate a cadence.
		// Context: Oosfera ends as suspended viability. Its closure is a sealed potential, not a terminal statement.
		Ppar([
			piece[\dense].(\re, Pseq([[64, 71], [62, 69], [60, 67]], inf), Pseq([3, 3, 2], inf), 50, 1.02),
			piece[\dense].(\so, Pseq([76, 79, 74], inf), Pseq([6, 5, 7], inf), 38, 0.72, Pseq([true, false, true], inf)),
			piece[\dense].(\pe, Pseq([24, 24, 26, 24], inf), Pseq([6, 5, 7, 5], inf), 48, 1.80)
		])
	}
);

~apxCore[\attachStandardPieceMethods].(piece);
~apxPieces[\oosfera] = piece;
"06_Oosfera loaded.".postln;
)
