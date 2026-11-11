// ApomixisCore.scd
// Reusable compositional core for the cycle.
// Load ApomixisSetKlais.scd first so the division and registration layer is available.

(
if(~apx.isNil) {
	"ApomixisCore: load ApomixisSetKlais.scd before this file.".warn;
};

~apxCore = ();

~apxCore[\meta] = (
	project: "Apomixis",
	version: "0.1-foundation",
	outputLanguage: \english,
	closingPiece: \microspora,
	totalPieces: 9,
	targetTempoNodes: 45
);

~apxCore[\pieceOrder] = [\esporo, \gameto, \meiosis, \megaspora, \polygonum, \oosfera, \filotaxis, \protoespora, \microspora];

~apxCore[\formalOrder] = [\introduction, \replication, \bridge, \climax, \coda];

// Default formal proportions. Piece files may override them when needed.
~apxCore[\defaultSectionRatios] = (
	introduction: 0.16,
	replication: 0.34,
	bridge: 0.14,
	climax: 0.22,
	coda: 0.14
);

~apxCore[\layerInfo] = (
	go: (tag: "LAYER 1 GO", role: "octave melody, line, arpeggio"),
	po: (tag: "LAYER 2 PO", role: "expressive harmonic texture, arpeggio"),
	re: (tag: "LAYER 3 RE", role: "hybrid reinforcement, brass, tutti relay"),
	so: (tag: "LAYER 4 SO", role: "unique events, soli, divergence, counterline"),
	pe: (tag: "LAYER 5 PE", role: "long events, cantus, gravity, bass mass")
);

// META methods define the biological imagination of the cycle.
~apxCore[\metaMethods] = (
	inscripcionClonal: (
		label: "Clonal inscription",
		summary: "A minimal gesture leaves a trace that continues without live command."
	),
	mutacionSomatica: (
		label: "Somatic mutation",
		summary: "Change emerges from accumulated local deviations rather than from thematic replacement."
	),
	dispersionVectorial: (
		label: "Vector dispersion",
		summary: "Events are released as spores, grains, or directional bursts into time, register, and density."
	),
	inhibicionLocal: (
		label: "Local inhibition",
		summary: "An activation suppresses nearby activation, producing spacing, packing, and phyllotactic logic."
	),
	latenciaUmbral: (
		label: "Threshold latency",
		summary: "Material remains dormant until duration, energy, density, or register crosses a threshold."
	),
	reduplicacion: (
		label: "Reduplication without reduction",
		summary: "Instead of simplifying, the system multiplies and stratifies its own cells."
	),
	camaraAutonoma: (
		label: "Autonomous chamber",
		summary: "Material behaves as if enclosed inside a self-regulating internal chamber."
	),
	antropomixis: (
		label: "Anthropomixis",
		summary: "The automaton admits human energy at different intensities without surrendering autonomy."
	)
);

// Each transverse procedure receives four algorithmic variations.
~apxCore[\procedureFamilies] = (
	generativeInscription: (
		label: "Generative inscription in automata and random forms",
		variations: (
			v1: (label: "Clonal branching", engine: \lsystem, model: "rewriting grammar, branch recursion"),
			v2: (label: "Somatic drift", engine: \boundedWalk, model: "local mutation with memory"),
			v3: (label: "Dispersive kernel", engine: \levyLike, model: "long-tail release through time and register"),
			v4: (label: "Inhibitory packing", engine: \poissonGap, model: "gesture appears only after sufficient local spacing")
		)
	),
	massivelyVariedTransition: (
		label: "Massively varied transition",
		variations: (
			v1: (label: "Proliferating transition", engine: \branchCopy, model: "copies thicken the bridge"),
			v2: (label: "Continuous drift transition", engine: \ouDrift, model: "smooth local deviation"),
			v3: (label: "Jump transition", engine: \longTailJump, model: "abrupt sparse transfer between zones"),
			v4: (label: "Inhibited substitution", engine: \exclusionSwap, model: "new material replaces only vacated cells")
		)
	),
	hyperclarityVsHypercrystallinity: (
		label: "Hyperclarity against hypercrystallinity",
		variations: (
			v1: (label: "Exact crystal", engine: \gridCanon, model: "highly legible periodic lattice"),
			v2: (label: "Eroded clarity", engine: \microDeviation, model: "clarity bent by tiny hereditary offsets"),
			v3: (label: "Broken crystal", engine: \asymmetricScatter, model: "clear lattice ruptured by dispersive asymmetry"),
			v4: (label: "Vacancy clarity", engine: \negativeSpace, model: "clarity produced by controlled absence")
		)
	),
	canonicalDisproportion: (
		label: "Canonical disproportion",
		variations: (
			v1: (label: "Scaled clone canon", engine: \ratioCanon, model: "strict proportional canon"),
			v2: (label: "Drifting canon", engine: \driftCanon, model: "canon with interval and tempo mutation"),
			v3: (label: "Kernel delay canon", engine: \scatterDelay, model: "delays derived from dispersive distributions"),
			v4: (label: "Perforated canon", engine: \holeCanon, model: "canon interrupted by inhibitory gaps")
		)
	),
	multiTemporality: (
		label: "Multi-temporality",
		variations: (
			v1: (label: "Parallel branches", engine: \tempoForest, model: "independent temporal limbs"),
			v2: (label: "Drifting clocks", engine: \elasticTempo, model: "continuous local metric transformation"),
			v3: (label: "Rarefied clocks", engine: \longTailPulse, model: "temporal fields with sparse tails"),
			v4: (label: "Refractory re-entry", engine: \refractoryGate, model: "layers reappear only after cool-down time")
		)
	),
	convolvedMasses: (
		label: "Sound masses filtered by convolution",
		variations: (
			v1: (label: "Clonal grain mass", engine: \grainClone, model: "mass from multiplied micro-cells"),
			v2: (label: "Somatic erosion mass", engine: \erosionField, model: "mass altered by slow deformation"),
			v3: (label: "Dispersed cloud mass", engine: \cloudScatter, model: "mass as directional cloud"),
			v4: (label: "Inhibited cloud", engine: \puncturedCloud, model: "mass punctured by exclusion logic")
		)
	)
);

~apxCore[\variationDefaults] = (
	clonalBranching: (depth: 4, branchProb: 0.62, mirrorProb: 0.18),
	somaticDrift: (stepSize: 1.0, memory: 0.74, reversion: 0.28),
	dispersiveKernel: (exponent: 1.35, spread: 7.0, silenceProb: 0.12),
	inhibitoryPacking: (minGap: 0.125, maxDensity: 0.78, refractory: 0.25)
);

~apxCore[\denseMidiPattern] = { |divisionKey, notePattern, durPattern, velocity = 88, legato = 0.95, restPattern|
	var division = ~apx[\divisions][divisionKey];
	var pattern;

	pattern = Pbind(
		\division, divisionKey,
		\midinote, Pcollect({ |note|
			if(note.isSequenceableCollection) {
				note.collect { |n| ~apx[\clipNote].(divisionKey, n) }
			} {
				~apx[\clipNote].(divisionKey, note)
			}
		}, notePattern),
		\dur, durPattern,
		\amp, velocity,
		\legato, legato,
		\chan, division[\noteChan]
	);

	if(restPattern.notNil) {
		pattern = pattern <> Pbind(\isRest, restPattern);
	};

	pattern
};

~apxCore[\asLivePattern] = { |pattern|
	Pbind(
		\type, \midi,
		\midiout, Pfunc { ~apx[\ensureOut].() }
	) <> pattern
};

~apxCore[\hasSimpleMidiFile] = {
	"SimpleMIDIFile".asClass.notNil
};

~apxCore[\exportPatternToMidi] = { |pattern, path, bpm = 60, timeSignature = "4/4", tracks = 16|
	var cls = "SimpleMIDIFile".asClass;
	var midiFile;

	if(cls.notNil) {
		midiFile = cls.new(path.standardizePath);
		midiFile.init1(tracks.asInteger, bpm, timeSignature);
		midiFile.fromPattern(pattern);
		midiFile.write;
		("ApomixisCore: wrote MIDI " ++ path.standardizePath).postln;
	} {
		("ApomixisCore: SimpleMIDIFile class not found, cannot export MIDI -> " ++ path.standardizePath).warn;
	};
};

~apxCore[\patternNoteRows] = { |pattern, bpm = 60, pieceKey = "", sectionKey = "", startSecOffset = 0.0, startBeatOffset = 0.0|
	var stream = pattern.asStream;
	var rows = List.new;
	var nowSec = startSecOffset.asFloat;
	var nowBeat = startBeatOffset.asFloat;
	var eventIndex = 0;
	var nextEvent;

	while {
		nextEvent = stream.next(Event.default.copy);
		nextEvent.notNil
	} {
		var durBeat = ((nextEvent[\dur] ? nextEvent[\delta]) ? 0.0).asFloat;
		var legato = (nextEvent[\legato] ? 1.0).asFloat;
		var sustainBeat = (nextEvent[\sustain] ? (durBeat * legato)).asFloat;
		var durSec = durBeat * 60.0 / bpm;
		var sustainSec = sustainBeat * 60.0 / bpm;
		var velocity = ((nextEvent[\amp] ? nextEvent[\velocity]) ? 0).asFloat;
		var chan = (nextEvent[\chan] ? "").asString;
		var division = (nextEvent[\division] ? "").asString;
		var isRest = (nextEvent[\isRest] ? false).asBoolean;
		var notes = nextEvent[\midinote];

		if(isRest.not and: { notes.notNil }) {
			if(notes.isSequenceableCollection and: { notes.isKindOf(String).not }) {
				notes.do { |note, chordIndex|
					rows.add((
						piece: pieceKey.asString,
						section: sectionKey.asString,
						eventIndex: eventIndex,
						chordIndex: chordIndex,
						startBeat: nowBeat,
						startSec: nowSec,
						durBeat: durBeat,
						durSec: durSec,
						sustainBeat: sustainBeat,
						sustainSec: sustainSec,
						division: division,
						chan: chan,
						midinote: note,
						velocity: velocity,
						legato: legato,
						isRest: isRest
					));
				};
			} {
				rows.add((
					piece: pieceKey.asString,
					section: sectionKey.asString,
					eventIndex: eventIndex,
					chordIndex: 0,
					startBeat: nowBeat,
					startSec: nowSec,
					durBeat: durBeat,
					durSec: durSec,
					sustainBeat: sustainBeat,
					sustainSec: sustainSec,
					division: division,
					chan: chan,
					midinote: notes,
					velocity: velocity,
					legato: legato,
					isRest: isRest
				));
			};
		};

		nowBeat = nowBeat + durBeat;
		nowSec = nowSec + durSec;
		eventIndex = eventIndex + 1;
	};

	rows
};

~apxCore[\writeNoteRowsCsv] = { |rows, path|
	var file = File(path.standardizePath, "w");

	if(file.isOpen) {
		file.write("piece,section,event_index,chord_index,start_beat,start_sec,dur_beat,dur_sec,sustain_beat,sustain_sec,division,chan,midinote,velocity,legato,is_rest\n");
		rows.do { |row|
			var line = [
				row[\piece],
				row[\section],
				row[\eventIndex],
				row[\chordIndex],
				row[\startBeat],
				row[\startSec],
				row[\durBeat],
				row[\durSec],
				row[\sustainBeat],
				row[\sustainSec],
				row[\division],
				row[\chan],
				row[\midinote],
				row[\velocity],
				row[\legato],
				row[\isRest]
			].collect { |item| ~apxCore[\csvEscape].(item) }.join(",");

			file.write(line ++ Char.nl.asString);
		};
		file.close;
		("ApomixisCore: wrote note map " ++ path.standardizePath).postln;
	} {
		("ApomixisCore: could not open note map file " ++ path.standardizePath).warn;
	};
};

~apxCore[\exportPieceSectionsToMidi] = { |piece, baseDir = "exports/midi"|
	var pieceDir;

	if(piece.isNil) {
		"ApomixisCore: cannot export MIDI for nil piece.".warn;
		^nil;
	};

	PathName.new(baseDir.standardizePath).mkdir;
	pieceDir = (baseDir.standardizePath ++ "/" ++ piece[\key].asString).standardizePath;
	PathName.new(pieceDir).mkdir;

	~apxCore[\formalOrder].do { |sectionKey|
		var sectionInfo = piece[\sectionInfoFor].(sectionKey);
		var tempoSpec = piece[\tempoFor].(sectionKey);
		var sectionSpec = piece[\sections][sectionKey];
		var beats = sectionInfo[\durSec] * tempoSpec[\bpm] / 60.0;
		var patternFunc = if(sectionSpec.notNil and: { sectionSpec[\densePattern].notNil }) {
			sectionSpec[\densePattern]
		} {
			nil
		};

		if(patternFunc.notNil) {
			~apxCore[\exportPatternToMidi].(
				Pfindur(beats, patternFunc.()),
				(pieceDir ++ "/" ++ piece[\key].asString ++ "_" ++ sectionKey.asString ++ ".mid").standardizePath,
				tempoSpec[\bpm]
			);
		} {
			("ApomixisCore: piece " ++ piece[\key].asString ++ " has no densePattern for section " ++ sectionKey.asString).warn;
		};
	};
};

~apxCore[\exportPieceSectionsToNoteCsv] = { |piece, baseDir = "exports/note_maps"|
	var pieceDir;

	if(piece.isNil) {
		"ApomixisCore: cannot export note maps for nil piece.".warn;
		^nil;
	};

	PathName.new(baseDir.standardizePath).mkdir;
	pieceDir = (baseDir.standardizePath ++ "/" ++ piece[\key].asString).standardizePath;
	PathName.new(pieceDir).mkdir;

	~apxCore[\formalOrder].do { |sectionKey|
		var sectionInfo = piece[\sectionInfoFor].(sectionKey);
		var tempoSpec = piece[\tempoFor].(sectionKey);
		var sectionSpec = piece[\sections][sectionKey];
		var beats = sectionInfo[\durSec] * tempoSpec[\bpm] / 60.0;
		var patternFunc = if(sectionSpec.notNil and: { sectionSpec[\densePattern].notNil }) {
			sectionSpec[\densePattern]
		} {
			nil
		};
		var rows;

		if(patternFunc.notNil) {
			rows = ~apxCore[\patternNoteRows].(
				Pfindur(beats, patternFunc.()),
				tempoSpec[\bpm],
				piece[\key],
				sectionKey,
				0.0
			);

			~apxCore[\writeNoteRowsCsv].(
				rows,
				(pieceDir ++ "/" ++ piece[\key].asString ++ "_" ++ sectionKey.asString ++ ".csv").standardizePath
			);
		} {
			("ApomixisCore: piece " ++ piece[\key].asString ++ " has no densePattern for section " ++ sectionKey.asString).warn;
		};
	};
};

~apxCore[\exportWholePieceToNoteCsv] = { |piece, baseDir = "exports/note_maps"|
	var pieceDir;
	var allRows = List.new;
	var pieceCursorSec = 0.0;
	var pieceCursorBeat = 0.0;

	if(piece.isNil) {
		"ApomixisCore: cannot export whole-piece note map for nil piece.".warn;
		^nil;
	};

	PathName.new(baseDir.standardizePath).mkdir;
	pieceDir = (baseDir.standardizePath ++ "/" ++ piece[\key].asString).standardizePath;
	PathName.new(pieceDir).mkdir;

	~apxCore[\formalOrder].do { |sectionKey|
		var sectionInfo = piece[\sectionInfoFor].(sectionKey);
		var tempoSpec = piece[\tempoFor].(sectionKey);
		var sectionSpec = piece[\sections][sectionKey];
		var beats = sectionInfo[\durSec] * tempoSpec[\bpm] / 60.0;
		var patternFunc = if(sectionSpec.notNil and: { sectionSpec[\densePattern].notNil }) {
			sectionSpec[\densePattern]
		} {
			nil
		};
		var rows;

		if(patternFunc.notNil) {
			rows = ~apxCore[\patternNoteRows].(
				Pfindur(beats, patternFunc.()),
				tempoSpec[\bpm],
				piece[\key],
				sectionKey,
				pieceCursorSec,
				pieceCursorBeat
			);
			rows.do { |row| allRows.add(row) };
		};

		pieceCursorSec = pieceCursorSec + sectionInfo[\durSec];
		pieceCursorBeat = pieceCursorBeat + beats;
	};

	~apxCore[\writeNoteRowsCsv].(
		allRows,
		(pieceDir ++ "/" ++ piece[\key].asString ++ "_full.csv").standardizePath
	);
};

// Shared metric-modulation vocabulary. Ratios are placeholders and may be refined per piece.
~apxCore[\metricRelations] = (
	quarter_to_tripletQuarter: (label: "quarter = triplet quarter", ratioNum: 3, ratioDen: 2),
	quarter_to_dottedEighth: (label: "quarter = dotted eighth", ratioNum: 4, ratioDen: 3),
	eighth_to_tripletSixteenth: (label: "eighth = triplet sixteenth", ratioNum: 3, ratioDen: 4),
	half_to_tripletQuarter: (label: "half = triplet quarter", ratioNum: 3, ratioDen: 4),
	quarter_to_quintupletEighth: (label: "quarter = quintuplet eighth", ratioNum: 5, ratioDen: 4)
);

// This is the first global tempo blueprint for the macroform graph.
// Each piece gets one tempo node per formal section, yielding 45 section-tempo nodes.
~apxCore[\defaultTempoBlueprints] = (
	esporo: [
		(section: \introduction, bpm: 48, relation: "seed pulse", ratioNum: 1, ratioDen: 1),
		(section: \replication, bpm: 72, relation: "3:2 expansion", ratioNum: 3, ratioDen: 2),
		(section: \bridge, bpm: 54, relation: "3:4 contraction", ratioNum: 3, ratioDen: 4),
		(section: \climax, bpm: 81, relation: "3:2 expansion", ratioNum: 3, ratioDen: 2),
		(section: \coda, bpm: 54, relation: "2:3 settling", ratioNum: 2, ratioDen: 3)
	],
	gameto: [
		(section: \introduction, bpm: 54, relation: "piece reset", ratioNum: 1, ratioDen: 1),
		(section: \replication, bpm: 72, relation: "4:3 lift", ratioNum: 4, ratioDen: 3),
		(section: \bridge, bpm: 48, relation: "2:3 suspension", ratioNum: 2, ratioDen: 3),
		(section: \climax, bpm: 80, relation: "5:3 release", ratioNum: 5, ratioDen: 3),
		(section: \coda, bpm: 60, relation: "3:4 settling", ratioNum: 3, ratioDen: 4)
	],
	meiosis: [
		(section: \introduction, bpm: 60, relation: "piece reset", ratioNum: 1, ratioDen: 1),
		(section: \replication, bpm: 90, relation: "3:2 duplication", ratioNum: 3, ratioDen: 2),
		(section: \bridge, bpm: 60, relation: "2:3 return", ratioNum: 2, ratioDen: 3),
		(section: \climax, bpm: 96, relation: "8:5 pressure", ratioNum: 8, ratioDen: 5),
		(section: \coda, bpm: 64, relation: "2:3 release", ratioNum: 2, ratioDen: 3)
	],
	megaspora: [
		(section: \introduction, bpm: 36, relation: "piece reset", ratioNum: 1, ratioDen: 1),
		(section: \replication, bpm: 48, relation: "4:3 germination", ratioNum: 4, ratioDen: 3),
		(section: \bridge, bpm: 42, relation: "7:8 drift", ratioNum: 7, ratioDen: 8),
		(section: \climax, bpm: 63, relation: "3:2 dilation", ratioNum: 3, ratioDen: 2),
		(section: \coda, bpm: 42, relation: "2:3 settling", ratioNum: 2, ratioDen: 3)
	],
	polygonum: [
		(section: \introduction, bpm: 48, relation: "piece reset", ratioNum: 1, ratioDen: 1),
		(section: \replication, bpm: 64, relation: "4:3 opening", ratioNum: 4, ratioDen: 3),
		(section: \bridge, bpm: 56, relation: "7:8 chambering", ratioNum: 7, ratioDen: 8),
		(section: \climax, bpm: 84, relation: "3:2 expansion", ratioNum: 3, ratioDen: 2),
		(section: \coda, bpm: 56, relation: "2:3 withdrawal", ratioNum: 2, ratioDen: 3)
	],
	oosfera: [
		(section: \introduction, bpm: 42, relation: "piece reset", ratioNum: 1, ratioDen: 1),
		(section: \replication, bpm: 56, relation: "4:3 activation", ratioNum: 4, ratioDen: 3),
		(section: \bridge, bpm: 42, relation: "3:4 hollowing", ratioNum: 3, ratioDen: 4),
		(section: \climax, bpm: 70, relation: "5:3 ignition", ratioNum: 5, ratioDen: 3),
		(section: \coda, bpm: 49, relation: "7:10 seal", ratioNum: 7, ratioDen: 10)
	],
	filotaxis: [
		(section: \introduction, bpm: 96, relation: "piece reset", ratioNum: 1, ratioDen: 1),
		(section: \replication, bpm: 128, relation: "4:3 packing", ratioNum: 4, ratioDen: 3),
		(section: \bridge, bpm: 144, relation: "9:8 tightening", ratioNum: 9, ratioDen: 8),
		(section: \climax, bpm: 192, relation: "4:3 overload", ratioNum: 4, ratioDen: 3),
		(section: \coda, bpm: 96, relation: "1:2 cutback", ratioNum: 1, ratioDen: 2)
	],
	protoespora: [
		(section: \introduction, bpm: 40, relation: "piece reset", ratioNum: 1, ratioDen: 1),
		(section: \replication, bpm: 60, relation: "3:2 activation", ratioNum: 3, ratioDen: 2),
		(section: \bridge, bpm: 45, relation: "3:4 cooling", ratioNum: 3, ratioDen: 4),
		(section: \climax, bpm: 72, relation: "8:5 bloom", ratioNum: 8, ratioDen: 5),
		(section: \coda, bpm: 48, relation: "2:3 residue", ratioNum: 2, ratioDen: 3)
	],
	microspora: [
		(section: \introduction, bpm: 54, relation: "piece reset", ratioNum: 1, ratioDen: 1),
		(section: \replication, bpm: 81, relation: "3:2 vocal uptake", ratioNum: 3, ratioDen: 2),
		(section: \bridge, bpm: 72, relation: "8:9 shadowing", ratioNum: 8, ratioDen: 9),
		(section: \climax, bpm: 96, relation: "4:3 pressure", ratioNum: 4, ratioDen: 3),
		(section: \coda, bpm: 36, relation: "3:8 extinction halo", ratioNum: 3, ratioDen: 8)
	]
);

// Piece catalogue. Each piece file can inherit this metadata and extend it.
~apxCore[\pieces] = (
	esporo: (
		order: 1,
		title: "Esporo / La planta",
		durationSec: 300,
		regime: \automata,
		procedures: [\generativeInscription, \multiTemporality],
		meta: [\dispersionVectorial, \inscripcionClonal],
		dominantLayers: [\go, \po, \pe],
		tempoNodeTarget: 5
	),
	gameto: (
		order: 2,
		title: "Gameto / El grano",
		durationSec: 270,
		regime: \automata,
		procedures: [\hyperclarityVsHypercrystallinity, \canonicalDisproportion],
		meta: [\latenciaUmbral, \camaraAutonoma],
		dominantLayers: [\po, \re],
		tempoNodeTarget: 5
	),
	meiosis: (
		order: 3,
		title: "Meiosis / Flor",
		durationSec: 330,
		regime: \anthropomixisIII,
		humanMode: "50/50 windows of improvisation inside system generation",
		procedures: [\canonicalDisproportion, \massivelyVariedTransition],
		meta: [\reduplicacion, \antropomixis],
		dominantLayers: [\go, \re, \pe],
		tempoNodeTarget: 5
	),
	megaspora: (
		order: 4,
		title: "Megaspora / Espora",
		durationSec: 405,
		regime: \automata,
		specialRole: "long dream-like anchor piece",
		procedures: [\convolvedMasses, \multiTemporality],
		meta: [\latenciaUmbral, \camaraAutonoma],
		dominantLayers: [\po, \re, \pe],
		tempoNodeTarget: 6,
		sectionRatios: (introduction: 0.18, replication: 0.29, bridge: 0.16, climax: 0.19, coda: 0.18)
	),
	polygonum: (
		order: 5,
		title: "Polygonum / Saco embrionario",
		durationSec: 330,
		regime: \anthropomixisII,
		humanMode: "guided improvisation through all five sections",
		procedures: [\massivelyVariedTransition, \generativeInscription],
		meta: [\camaraAutonoma, \antropomixis],
		dominantLayers: [\po, \re, \so],
		tempoNodeTarget: 5
	),
	oosfera: (
		order: 6,
		title: "Oosfera",
		durationSec: 270,
		regime: \anthropomixisIV,
		humanMode: "no more than three punctual interventions",
		procedures: [\generativeInscription, \massivelyVariedTransition],
		meta: [\camaraAutonoma, \antropomixis],
		dominantLayers: [\re, \so, \pe],
		tempoNodeTarget: 4
	),
	filotaxis: (
		order: 7,
		title: "Filotaxis",
		durationSec: 240,
		regime: \automata,
		specialRole: "short presto full tutti piece",
		procedures: [\hyperclarityVsHypercrystallinity, \multiTemporality],
		meta: [\inhibicionLocal, \dispersionVectorial],
		dominantLayers: [\go, \po, \re, \so, \pe],
		tempoNodeTarget: 5,
		sectionRatios: (introduction: 0.12, replication: 0.30, bridge: 0.10, climax: 0.33, coda: 0.15)
	),
	protoespora: (
		order: 8,
		title: "Proto-espora",
		durationSec: 285,
		regime: \automata,
		procedures: [\convolvedMasses, \multiTemporality],
		meta: [\latenciaUmbral, \mutacionSomatica],
		dominantLayers: [\po, \so, \pe],
		tempoNodeTarget: 5
	),
	microspora: (
		order: 9,
		title: "Microspora / Grano de polen",
		durationSec: 330,
		regime: \anthropomixisI,
		humanMode: "voice with ornamental pitch-following",
		specialRole: "closing piece of the cycle",
		procedures: [\canonicalDisproportion, \massivelyVariedTransition],
		meta: [\antropomixis, \dispersionVectorial],
		dominantLayers: [\po, \re, \so, \pe],
		tempoNodeTarget: 5,
		sectionRatios: (introduction: 0.13, replication: 0.31, bridge: 0.18, climax: 0.23, coda: 0.15)
	)
);

~apxCore[\tempoNodes] = List.new;

~apxCore[\csvEscape] = { |value|
	("\"" ++ value.asString ++ "\"");
};

~apxCore[\clearTempoNodes] = {
	~apxCore[\tempoNodes] = List.new;
};

~apxCore[\tempoAfterRatio] = { |fromBPM = 60.0, ratioNum = 1.0, ratioDen = 1.0|
	fromBPM * (ratioNum / ratioDen)
};

~apxCore[\addTempoNode] = { |pieceKey, sectionKey, relationLabel = "ratio", ratioNum = 1.0, ratioDen = 1.0, fromBPM = 60.0, comment = ""|
	var piece = ~apxCore[\pieces][pieceKey];
	var node;
	var toBPM = ~apxCore[\tempoAfterRatio].(fromBPM, ratioNum, ratioDen);

	node = (
		piece: if(piece.notNil) { piece[\title] } { pieceKey.asString },
		section: sectionKey.asString,
		relation: relationLabel,
		ratioNum: ratioNum,
		ratioDen: ratioDen,
		fromBPM: fromBPM,
		toBPM: toBPM,
		comment: comment
	);

	~apxCore[\tempoNodes].add(node);
	node
};

~apxCore[\seedDefaultTempoNodes] = {
	var previousBPM = nil;

	~apxCore[\clearTempoNodes].();

	~apxCore[\pieceOrder].do { |pieceKey|
		var blueprint = ~apxCore[\defaultTempoBlueprints][pieceKey];

		if(blueprint.notNil) {
			blueprint.do { |nodeSpec, index|
				var fromBPM = if(index == 0) {
					nodeSpec[\bpm]
				} {
					previousBPM
				};

				~apxCore[\addTempoNode].(
					pieceKey,
					nodeSpec[\section],
					nodeSpec[\relation],
					nodeSpec[\ratioNum],
					nodeSpec[\ratioDen],
					fromBPM,
					"default macroform graph"
				);

				previousBPM = nodeSpec[\bpm];
				~apxCore[\tempoNodes].last[\toBPM] = nodeSpec[\bpm];
			};
		};
	};
};

~apxCore[\exportTempoNodes] = { |path = "apomixis_tempo_nodes.csv"|
	var file = File(path.standardizePath, "w");

	if(file.isOpen) {
		file.write("piece,section,relation,ratio_num,ratio_den,from_bpm,to_bpm,comment\n");

		~apxCore[\tempoNodes].do { |node|
			var line = [
				node[\piece],
				node[\section],
				node[\relation],
				node[\ratioNum],
				node[\ratioDen],
				node[\fromBPM],
				node[\toBPM],
				node[\comment]
			].collect { |item| ~apxCore[\csvEscape].(item) }.join(",");

			file.write(line ++ Char.nl.asString);
		};

		file.close;
		("ApomixisCore: tempo nodes exported to " ++ path.standardizePath).postln;
	} {
		("ApomixisCore: could not open file " ++ path.standardizePath).warn;
	};
};

~apxCore[\layerTagString] = { |layerKeys|
	layerKeys.collect { |key|
		var info = ~apxCore[\layerInfo][key];
		if(info.notNil) { key.asString.toUpper } { key.asString };
	}.join(" + ")
};

~apxCore[\sectionPlan] = { |pieceKey|
	var piece = ~apxCore[\pieces][pieceKey];
	var ratios = if(piece.notNil and: { piece[\sectionRatios].notNil }) {
		piece[\sectionRatios]
	} {
		~apxCore[\defaultSectionRatios]
	};
	var duration = if(piece.notNil) { piece[\durationSec] } { 300 };
	var order = ~apxCore[\formalOrder];
	var out = List.new;
	var cursor = 0.0;

	order.do { |sectionKey, index|
		var ratio = ratios[sectionKey];
		var dur;

		if(index < (order.size - 1)) {
			dur = (duration * ratio).round(0.001);
		} {
			dur = (duration - cursor).round(0.001);
		};

		out.add((
			section: sectionKey,
			startSec: cursor,
			durSec: dur,
			endSec: (cursor + dur).round(0.001)
		));

		cursor = cursor + dur;
	};

	out
};

~apxCore[\sectionInfoFor] = { |pieceKey, sectionKey|
	var plan = ~apxCore[\sectionPlan].(pieceKey);
	plan.detect { |spec| spec[\section] == sectionKey }
};

~apxCore[\tempoSpecFor] = { |pieceKey, sectionKey|
	var blueprint = ~apxCore[\defaultTempoBlueprints][pieceKey];

	if(blueprint.notNil) {
		blueprint.detect { |nodeSpec| nodeSpec[\section] == sectionKey }
	} {
		nil
	}
};

~apxCore[\registerPieceTempoNodes] = { |pieceKey, comment = "piece registration"|
	var blueprint = ~apxCore[\defaultTempoBlueprints][pieceKey];
	var previousBPM = nil;

	if(blueprint.notNil) {
		blueprint.do { |nodeSpec, index|
			var fromBPM = if(index == 0) {
				nodeSpec[\bpm]
			} {
				previousBPM
			};

			~apxCore[\addTempoNode].(
				pieceKey,
				nodeSpec[\section],
				nodeSpec[\relation],
				nodeSpec[\ratioNum],
				nodeSpec[\ratioDen],
				fromBPM,
				comment
			);

			previousBPM = nodeSpec[\bpm];
			~apxCore[\tempoNodes].last[\toBPM] = nodeSpec[\bpm];
		};
	} {
		("ApomixisCore: no default tempo blueprint for " ++ pieceKey.asString).warn;
	};
};

~apxCore[\blueprint] = { |pieceKey|
	var piece = ~apxCore[\pieces][pieceKey];

	if(piece.notNil) {
		(
			piece: piece,
			sections: ~apxCore[\sectionPlan].(pieceKey),
			layerTag: ~apxCore[\layerTagString].(piece[\dominantLayers]),
			tempoNodeTarget: piece[\tempoNodeTarget]
		)
	} {
		("ApomixisCore: unknown piece -> " ++ pieceKey.asString).warn;
		nil
	};
};

~apxCore[\attachStandardPieceMethods] = { |piece|
	piece[\tempoFor] = piece[\tempoFor] ? { |sectionKey|
		~apxCore[\tempoSpecFor].(piece[\key], sectionKey)
	};

	piece[\sectionInfoFor] = piece[\sectionInfoFor] ? { |sectionKey|
		~apxCore[\sectionInfoFor].(piece[\key], sectionKey)
	};

	piece[\registerTempoNodes] = piece[\registerTempoNodes] ? {
		~apxCore[\registerPieceTempoNodes].(piece[\key], piece[\title]);
	};

	piece[\stopPlayers] = piece[\stopPlayers] ? {
		piece[\activePlayers].do { |player| if(player.notNil) { player.stop } };
		piece[\activePlayers].clear;

		if(piece[\currentClock].notNil) {
			piece[\currentClock].clear;
			piece[\currentClock] = nil;
		};
	};

	piece[\stopAll] = piece[\stopAll] ? {
		if(piece[\routine].notNil) {
			piece[\routine].stop;
			piece[\routine] = nil;
		};

		piece[\stopPlayers].();

		if(piece[\extraStop].notNil) { piece[\extraStop].() };
	};

	piece[\postSectionCue] = piece[\postSectionCue] ? { |sectionKey|
		var spec = piece[\sections][sectionKey];
		var tempoSpec = piece[\tempoFor].(sectionKey);

		(piece[\title] ++ " -> " ++ sectionKey.asString
			++ " | " ++ tempoSpec[\bpm].asString ++ " BPM"
			++ " | layers " ++ ~apxCore[\layerTagString].(spec[\layers])).postln;

		if(spec[\lights].notNil) { ("Light: " ++ spec[\lights]).postln };
		if(spec[\humanCue].notNil) { ("Human cue: " ++ spec[\humanCue]).postln };
	};

	piece[\playSection] = piece[\playSection] ? { |sectionKey|
		var sectionInfo = piece[\sectionInfoFor].(sectionKey);
		var tempoSpec = piece[\tempoFor].(sectionKey);
		var sectionSpec = piece[\sections][sectionKey];
		var beats = sectionInfo[\durSec] * tempoSpec[\bpm] / 60.0;
		var clock = TempoClock.new(tempoSpec[\bpm] / 60.0);
		var player;

		piece[\stopPlayers].();
		if(piece[\beforeSection].notNil) { piece[\beforeSection].(sectionKey) };
		piece[\applySectionState].(sectionKey);
		piece[\postSectionCue].(sectionKey);

		player = Pfindur(
			beats,
			~apxCore[\asLivePattern].(sectionSpec[\densePattern].())
		).play(clock);

		piece[\activePlayers].add(player);
		piece[\currentClock] = clock;
		player
	};

	piece[\playAll] = piece[\playAll] ? {
		piece[\stopAll].();
		piece[\registerTempoNodes].();
		if(piece[\beforePlayAll].notNil) { piece[\beforePlayAll].() };

		piece[\routine] = Routine({
			~apx[\resetControllers].();

			~apxCore[\formalOrder].do { |sectionKey|
				var sectionInfo = piece[\sectionInfoFor].(sectionKey);
				piece[\playSection].(sectionKey);
				sectionInfo[\durSec].wait;
			};

			piece[\stopPlayers].();
			if(piece[\afterPlayAll].notNil) { piece[\afterPlayAll].() };
			piece[\routine] = nil;
		}).play(SystemClock);
	};

	piece[\exportSectionMidis] = piece[\exportSectionMidis] ? { |baseDir = "exports/midi"|
		~apxCore[\exportPieceSectionsToMidi].(piece, baseDir);
	};

	piece[\exportSectionNoteMaps] = piece[\exportSectionNoteMaps] ? { |baseDir = "exports/note_maps"|
		~apxCore[\exportPieceSectionsToNoteCsv].(piece, baseDir);
	};

	piece[\exportWholePieceNoteMap] = piece[\exportWholePieceNoteMap] ? { |baseDir = "exports/note_maps"|
		~apxCore[\exportWholePieceToNoteCsv].(piece, baseDir);
	};

	piece[\exportAllData] = piece[\exportAllData] ? {
		piece[\exportSectionMidis].();
		piece[\exportSectionNoteMaps].();
		piece[\exportWholePieceNoteMap].();
	};

	piece[\postBlueprint] = piece[\postBlueprint] ? {
		(piece[\title] ++ " blueprint").postln;
		piece[\sectionPlan].do { |spec|
			var tempo = piece[\tempoFor].(spec[\section]);
			(spec[\section].asString ++ " | start " ++ spec[\startSec].asString
				++ " | dur " ++ spec[\durSec].asString
				++ " | bpm " ++ tempo[\bpm].asString).postln;
		};
	};

	piece
};

~apxCore[\postSummary] = {
	"ApomixisCore loaded.".postln;
	("Closing piece: " ++ ~apxCore[\meta][\closingPiece].asString).postln;
	("Target tempo nodes across cycle: " ++ ~apxCore[\meta][\targetTempoNodes].asString).postln;
	"Available pieces:".postln;
	~apxCore[\pieceOrder].do { |pieceKey|
		var piece = ~apxCore[\pieces][pieceKey];
		("  " ++ piece[\order].asString ++ ". " ++ piece[\title]).postln;
	};
};

~apxCore[\postSummary].();
)
