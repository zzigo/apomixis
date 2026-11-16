// ApomixisSetKlais.scd
// Central setup file for the Klais organ project.
// All MIDI channels and CC numbers in this version are placeholders.
// They are intentionally easy to remap on site once the actual console map is known.

(
~apx = ();

~apx[\meta] = (
	project: "Apomixis",
	version: "0.1-placeholder-onsite-remap",
	outputLanguage: \english,
	noteBackend: \midi,
	stopBackend: \ccToggle,
	totalPieces: 9,
	maxAttacksPerSecond: 50
);

// Physical channels are provisional. The compositional logic should use division keys.
// MIDI IN: `voiceFollowerInChan` is an incoming channel listened to by SuperCollider itself.
// It is not a note output channel for the organ. `Microspora` uses it for ornamental voice-follow input.
~apx[\midi] = (
	outIndex: 0,
	latency: 0.0,
	registrationChan: 15,
	voiceFollowerInChan: 13,
	improvisationInChan: 14
);

// Audio input analysis for the live microphone pitch follower used by `Microspora`.
// All values are placeholders and should be calibrated in the hall with the actual microphone and gain structure.
~apx[\audio] = (
	voiceFollowerInputChan: 0,
	voiceFollowerPollHz: 18,
	voiceFollowerAmpThreshold: 0.02,
	voiceFollowerActiveThreshold: 0.015,
	voiceFollowerMinFreq: 80,
	voiceFollowerMaxFreq: 1400,
	voiceFollowerMedian: 7,
	voiceFollowerLag: 0.12,
	voiceFollowerPreGain: 1.6,
	voiceFollowerHPF: 70
);

// Official note ranges from the brief.
~apx[\divisions] = (
	go: (label: "Grand Orgue", noteChan: 0, lo: 24, hi: 84),
	po: (label: "Positif", noteChan: 1, lo: 24, hi: 84),
	re: (label: "Recit", noteChan: 2, lo: 24, hi: 84),
	so: (label: "Solo", noteChan: 3, lo: 24, hi: 84),
	pe: (label: "Pedale", noteChan: 4, lo: 24, hi: 55)
);

// Continuous controls. CC numbers are placeholders and will be remapped in the hall.
~apx[\controllers] = (
	crescendoGlobal: (label: "Crescendo pedal", cc: 94, chan: 15, default: 0),
	expressionPositif: (label: "Expression Manual II", cc: 95, chan: 15, default: 96),
	expressionRecit: (label: "Expression Manual III", cc: 96, chan: 15, default: 96),
	sequencerNext: (label: "Sequencer advance", cc: 97, chan: 15, default: 0),
	sequencerPrev: (label: "Sequencer back", cc: 98, chan: 15, default: 0)
);

// Stop table: all listed stops from the brief receive a provisional CC toggle mapping.
// Each spec keeps a label, a CC number, and the registration channel used by this placeholder setup.
~apx[\stops] = (
	go: (
		montre16: (label: "Montre 16'", cc: 20, chan: 15),
		montre8: (label: "Montre 8'", cc: 21, chan: 15),
		fluteHarmonique8: (label: "Flute harmonique 8'", cc: 22, chan: 15),
		dulciane8: (label: "Dulciane 8'", cc: 23, chan: 15),
		bourdon8: (label: "Bourdon 8'", cc: 24, chan: 15),
		prestant4: (label: "Prestant 4'", cc: 25, chan: 15),
		fluteDouce4: (label: "Flute douce 4'", cc: 26, chan: 15),
		quinte223: (label: "Quinte 2 2/3'", cc: 27, chan: 15),
		octave2: (label: "Octave 2'", cc: 28, chan: 15),
		fournitureV2: (label: "Fourniture V 2'", cc: 29, chan: 15),
		bombarde16: (label: "Bombarde 16'", cc: 30, chan: 15),
		trompette8: (label: "Trompette 8'", cc: 31, chan: 15),
		clairon4: (label: "Clairon 4'", cc: 32, chan: 15),
		tremolo: (label: "Tremolo", cc: 33, chan: 15)
	),
	po: (
		bourdon16: (label: "Bourdon 16'", cc: 34, chan: 15),
		principal8: (label: "Principal 8'", cc: 35, chan: 15),
		salicional8: (label: "Salicional 8'", cc: 36, chan: 15),
		bourdon8: (label: "Bourdon 8'", cc: 37, chan: 15),
		octave4: (label: "Octave 4'", cc: 38, chan: 15),
		fluteTravers4: (label: "Flute travers. 4'", cc: 39, chan: 15),
		doublette2: (label: "Doublette 2'", cc: 40, chan: 15),
		cornetV8: (label: "Cornet V 8'", cc: 41, chan: 15),
		pleinJeuIII133: (label: "Plein jeu III 1 1/3'", cc: 42, chan: 15),
		clarinette8: (label: "Clarinette 8'", cc: 43, chan: 15),
		tremolo: (label: "Tremolo", cc: 44, chan: 15)
	),
	re: (
		quintaton16: (label: "Quintaton 16'", cc: 45, chan: 15),
		diapason8: (label: "Diapason 8'", cc: 46, chan: 15),
		fluteHarmonique8: (label: "Flute harmonique 8'", cc: 47, chan: 15),
		violeDeGambe8: (label: "Viole de Gambe 8'", cc: 48, chan: 15),
		voixCeleste8: (label: "Voix celeste 8'", cc: 49, chan: 15),
		corDeNuit8: (label: "Cor de nuit 8'", cc: 50, chan: 15),
		fluteOctaviante4: (label: "Flute octaviante 4'", cc: 51, chan: 15),
		viole4: (label: "Viole 4'", cc: 52, chan: 15),
		nazardHarmonique223: (label: "Nazard harmonique 2 2/3'", cc: 53, chan: 15),
		octavin2: (label: "Octavin 2'", cc: 54, chan: 15),
		tierceHarmonique135: (label: "Tierce harmonique 1 3/5'", cc: 55, chan: 15),
		pleinJeuHarmoniqueIV223: (label: "Plein jeu harmonique IV 2 2/3'", cc: 56, chan: 15),
		basson16: (label: "Basson 16'", cc: 57, chan: 15),
		trompetteHarmonique8: (label: "Trompette harmonique 8'", cc: 58, chan: 15),
		bassonHautbois8: (label: "Basson-Hautbois 8'", cc: 59, chan: 15),
		voixHumaine8: (label: "Voix humaine 8'", cc: 60, chan: 15),
		claironHarmonique4: (label: "Clairon harmonique 4'", cc: 61, chan: 15),
		tremolo: (label: "Tremolo", cc: 62, chan: 15)
	),
	so: (
		seraphonFlote8: (label: "Seraphon-Flote 8'", cc: 63, chan: 15),
		tubaMagna16: (label: "Tuba magna 16'", cc: 64, chan: 15),
		tuba8: (label: "Tuba 8'", cc: 65, chan: 15)
	),
	pe: (
		flute32: (label: "Flute 32'", cc: 66, chan: 15),
		soubasse32: (label: "Soubasse 32'", cc: 67, chan: 15),
		contrebasse16: (label: "Contrebasse 16'", cc: 68, chan: 15),
		montre16: (label: "Montre 16'", cc: 69, chan: 15),
		soubasse16: (label: "Soubasse 16'", cc: 70, chan: 15),
		flute8: (label: "Flute 8'", cc: 71, chan: 15),
		violoncelle8: (label: "Violoncelle 8'", cc: 72, chan: 15),
		bourdon8: (label: "Bourdon 8'", cc: 73, chan: 15),
		principal4: (label: "Principal 4'", cc: 74, chan: 15),
		contrebombarde32: (label: "Contrebombarde 32'", cc: 75, chan: 15),
		bombarde16: (label: "Bombarde 16'", cc: 76, chan: 15),
		trompette8: (label: "Trompette 8'", cc: 77, chan: 15),
		clairon4: (label: "Clairon 4'", cc: 78, chan: 15)
	)
);

~apx[\couplers] = (
	ii_i: (label: "II / I", cc: 79, chan: 15),
	iii_i: (label: "III / I", cc: 80, chan: 15),
	sub_iii_i: (label: "Sub III / I", cc: 81, chan: 15),
	iv_i: (label: "IV / I", cc: 82, chan: 15),
	iii_ii: (label: "III / II", cc: 83, chan: 15),
	iv_ii: (label: "IV / II", cc: 84, chan: 15),
	sub_ii: (label: "Sub II", cc: 85, chan: 15),
	super_ii: (label: "Super II", cc: 86, chan: 15),
	iv_iii: (label: "IV / III", cc: 87, chan: 15),
	sub_iii: (label: "Sub III", cc: 88, chan: 15),
	i_ped: (label: "I / Ped.", cc: 89, chan: 15),
	ii_ped: (label: "II / Ped.", cc: 90, chan: 15),
	iii_ped: (label: "III / Ped.", cc: 91, chan: 15),
	super_ped: (label: "Super Ped.", cc: 92, chan: 15),
	iv_ped: (label: "IV / Ped.", cc: 93, chan: 15)
);

// A few reusable registration scenes so piece files can start from meaningful states.
// These are aesthetic placeholders, not historical prescriptions.
~apx[\scenes] = (
	seedLoop: (
		stopsOn: [
			[\go, \bourdon8],
			[\po, \bourdon8],
			[\re, \corDeNuit8],
			[\pe, \soubasse16]
		],
		stopsOff: [
			[\go, \bombarde16],
			[\re, \trompetteHarmonique8],
			[\so, \tubaMagna16],
			[\pe, \contrebombarde32]
		],
		couplersOn: [ ],
		couplersOff: [\ii_i, \iii_i, \iv_i],
		controllers: [
			[\crescendoGlobal, 8],
			[\expressionPositif, 88],
			[\expressionRecit, 84]
		]
	),
	dispersiveCanopy: (
		stopsOn: [
			[\go, \fluteHarmonique8],
			[\go, \prestant4],
			[\po, \principal8],
			[\po, \doublette2],
			[\re, \fluteOctaviante4],
			[\pe, \flute8]
		],
		stopsOff: [
			[\go, \tremolo],
			[\re, \tremolo],
			[\so, \tuba8]
		],
		couplersOn: [\iii_i, \ii_ped],
		couplersOff: [\super_ped],
		controllers: [
			[\crescendoGlobal, 28],
			[\expressionPositif, 92],
			[\expressionRecit, 90]
		]
	),
	crystallineCanon: (
		stopsOn: [
			[\go, \montre8],
			[\go, \octave2],
			[\po, \octave4],
			[\po, \pleinJeuIII133],
			[\re, \diapason8],
			[\re, \octavin2]
		],
		stopsOff: [
			[\go, \bourdon8],
			[\po, \bourdon16],
			[\pe, \soubasse32]
		],
		couplersOn: [\ii_i, \iii_ii],
		couplersOff: [\sub_ii, \sub_iii],
		controllers: [
			[\crescendoGlobal, 42],
			[\expressionPositif, 100],
			[\expressionRecit, 100]
		]
	),
	megasporaDream: (
		stopsOn: [
			[\go, \fluteDouce4],
			[\po, \salicional8],
			[\re, \voixCeleste8],
			[\re, \voixHumaine8],
			[\pe, \flute32]
		],
		stopsOff: [
			[\go, \clairon4],
			[\so, \tubaMagna16],
			[\pe, \bombarde16]
		],
		couplersOn: [\iv_iii],
		couplersOff: [\i_ped, \ii_ped],
		controllers: [
			[\crescendoGlobal, 14],
			[\expressionPositif, 74],
			[\expressionRecit, 68]
		]
	),
	filotaxisTutti: (
		stopsOn: [
			[\go, \montre16],
			[\go, \montre8],
			[\go, \fournitureV2],
			[\go, \trompette8],
			[\po, \principal8],
			[\po, \pleinJeuIII133],
			[\re, \diapason8],
			[\re, \pleinJeuHarmoniqueIV223],
			[\re, \claironHarmonique4],
			[\so, \tuba8],
			[\pe, \contrebombarde32],
			[\pe, \bombarde16]
		],
		stopsOff: [
			[\go, \bourdon8],
			[\po, \salicional8],
			[\re, \voixCeleste8]
		],
		couplersOn: [\ii_i, \iii_i, \iv_i, \i_ped, \ii_ped, \iii_ped, \iv_ped],
		couplersOff: [ ],
		controllers: [
			[\crescendoGlobal, 120],
			[\expressionPositif, 127],
			[\expressionRecit, 127]
		]
	),
	microsporaVocal: (
		stopsOn: [
			[\po, \clarinette8],
			[\re, \voixHumaine8],
			[\re, \bassonHautbois8],
			[\so, \seraphonFlote8],
			[\pe, \bourdon8]
		],
		stopsOff: [
			[\go, \bombarde16],
			[\so, \tubaMagna16],
			[\pe, \contrebombarde32]
		],
		couplersOn: [\iv_iii, \iii_ii],
		couplersOff: [\ii_i, \super_ped],
		controllers: [
			[\crescendoGlobal, 24],
			[\expressionPositif, 96],
			[\expressionRecit, 78]
		]
	)
);

~apx[\ensureOut] = {
	// MIDI IN: this explicitly enables incoming MIDI listeners inside SuperCollider.
	// `Microspora` depends on this so that MIDIFunc.noteOn / noteOff can hear external notes on `voiceFollowerInChan`.
	MIDIClient.init;
	MIDIIn.connectAll;

	if(~apx[\out].isNil) {
		~apx[\out] = MIDIOut(~apx[\midi][\outIndex]);
		~apx[\out].latency = ~apx[\midi][\latency];
	};

	~apx[\out];
};

~apx[\warnMissing] = { |kind, keyString|
	("ApomixisSetKlais: unknown " ++ kind ++ " -> " ++ keyString).warn;
};

~apx[\sendCC] = { |spec, value = 127|
	var out = ~apx[\ensureOut].();

	if(spec.notNil) {
		out.control(
			spec[\chan].asInteger,
			spec[\cc].asInteger,
			value.clip(0, 127).round(1).asInteger
		);
	};
};

~apx[\sendController] = { |controllerKey, value|
	var spec = ~apx[\controllers][controllerKey];

	if(spec.notNil) {
		~apx[\sendCC].(spec, value);
	} {
		~apx[\warnMissing].("controller", controllerKey.asString);
	};
};

~apx[\setStop] = { |divisionKey, stopKey, value = 127|
	var division = ~apx[\stops][divisionKey];
	var spec = if(division.notNil) { division[stopKey] } { nil };

	if(spec.notNil) {
		~apx[\sendCC].(spec, value);
	} {
		~apx[\warnMissing].("stop", divisionKey.asString ++ "." ++ stopKey.asString);
	};
};

~apx[\setCoupler] = { |couplerKey, value = 127|
	var spec = ~apx[\couplers][couplerKey];

	if(spec.notNil) {
		~apx[\sendCC].(spec, value);
	} {
		~apx[\warnMissing].("coupler", couplerKey.asString);
	};
};

~apx[\clipNote] = { |divisionKey, note|
	var division = ~apx[\divisions][divisionKey];

	if(division.notNil) {
		note.clip(division[\lo], division[\hi]).round(1).asInteger
	} {
		~apx[\warnMissing].("division", divisionKey.asString);
		note.round(1).asInteger
	};
};

~apx[\noteOn] = { |divisionKey, note = 60, velocity = 96|
	var division = ~apx[\divisions][divisionKey];
	var safeNote = ~apx[\clipNote].(divisionKey, note);

	if(division.notNil) {
		~apx[\ensureOut].().noteOn(
			division[\noteChan].asInteger,
			safeNote,
			velocity.clip(0, 127).round(1).asInteger
		);
	};
};

~apx[\noteOff] = { |divisionKey, note = 60, velocity = 0|
	var division = ~apx[\divisions][divisionKey];
	var safeNote = ~apx[\clipNote].(divisionKey, note);

	if(division.notNil) {
		~apx[\ensureOut].().noteOff(
			division[\noteChan].asInteger,
			safeNote,
			velocity.clip(0, 127).round(1).asInteger
		);
	};
};

~apx[\allStopsOff] = {
	~apx[\stops].keysValuesDo { |divisionKey, division|
		division.keysDo { |stopKey|
			~apx[\setStop].(divisionKey, stopKey, 0);
		};
	};
};

~apx[\allCouplersOff] = {
	~apx[\couplers].keysDo { |couplerKey|
		~apx[\setCoupler].(couplerKey, 0);
	};
};

~apx[\resetControllers] = {
	~apx[\controllers].keysValuesDo { |controllerKey, spec|
		~apx[\sendController].(controllerKey, spec[\default]);
	};
};

~apx[\applyScene] = { |sceneKey|
	var scene = ~apx[\scenes][sceneKey];

	if(scene.notNil) {
		scene[\stopsOff].do { |pair| ~apx[\setStop].(pair[0], pair[1], 0) };
		scene[\stopsOn].do { |pair| ~apx[\setStop].(pair[0], pair[1], 127) };
		scene[\couplersOff].do { |key| ~apx[\setCoupler].(key, 0) };
		scene[\couplersOn].do { |key| ~apx[\setCoupler].(key, 127) };
		scene[\controllers].do { |pair| ~apx[\sendController].(pair[0], pair[1]) };
	} {
		~apx[\warnMissing].("scene", sceneKey.asString);
	};
};

// Useful at the start of a rehearsal or after an emergency stop.
~apx[\panic] = {
	var out = ~apx[\ensureOut].();

	~apx[\divisions].keysValuesDo { |divisionKey, division|
		out.control(division[\noteChan].asInteger, 123, 0);
		out.control(division[\noteChan].asInteger, 120, 0);
	};

	~apx[\allCouplersOff].();
};

// On-site remapping helpers.
~apx[\usePort] = { |outIndex = 0|
	~apx[\midi][\outIndex] = outIndex.asInteger;
	~apx[\out] = nil;
	~apx[\ensureOut].();
};

~apx[\remapDivisionChannel] = { |divisionKey, newChan|
	var division = ~apx[\divisions][divisionKey];

	if(division.notNil) {
		division[\noteChan] = newChan.asInteger;
	} {
		~apx[\warnMissing].("division", divisionKey.asString);
	};
};

~apx[\remapStopCC] = { |divisionKey, stopKey, newCC, newChan|
	var division = ~apx[\stops][divisionKey];
	var spec = if(division.notNil) { division[stopKey] } { nil };

	if(spec.notNil) {
		spec[\cc] = newCC.asInteger;
		if(newChan.notNil) { spec[\chan] = newChan.asInteger };
	} {
		~apx[\warnMissing].("stop", divisionKey.asString ++ "." ++ stopKey.asString);
	};
};

~apx[\remapCouplerCC] = { |couplerKey, newCC, newChan|
	var spec = ~apx[\couplers][couplerKey];

	if(spec.notNil) {
		spec[\cc] = newCC.asInteger;
		if(newChan.notNil) { spec[\chan] = newChan.asInteger };
	} {
		~apx[\warnMissing].("coupler", couplerKey.asString);
	};
};

~apx[\remapControllerCC] = { |controllerKey, newCC, newChan|
	var spec = ~apx[\controllers][controllerKey];

	if(spec.notNil) {
		spec[\cc] = newCC.asInteger;
		if(newChan.notNil) { spec[\chan] = newChan.asInteger };
	} {
		~apx[\warnMissing].("controller", controllerKey.asString);
	};
};

~apx[\postSummary] = {
	"ApomixisSetKlais loaded.".postln;
	("Port index: " ++ ~apx[\midi][\outIndex]).postln;
	("Registration channel: " ++ ~apx[\midi][\registrationChan]).postln;
	"Division channels:".postln;
	~apx[\divisions].keysValuesDo { |divisionKey, division|
		("  " ++ divisionKey.asString ++ " -> chan " ++ division[\noteChan].asString
			++ " [" ++ division[\lo].asString ++ ".." ++ division[\hi].asString ++ "]").postln;
	};
};

~apx[\postSummary].();
)
