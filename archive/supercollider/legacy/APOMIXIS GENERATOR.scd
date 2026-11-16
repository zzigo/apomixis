//APOMIXIS ORGAN GENERATOR

MIDIClient.init;
MIDIIn.connectAll;
MIDIIn.controlList;
m = MIDIOut (2);



m.program(0,rrand(0,127))

(
m.program(0,20);
m.program(1,23);
m.program(2,21);
m.program(4,22);
m.program(3,61);
)

(
//m.program(1,rrand(0,127));
a =
Pbind ( \type, \midi, \midiout, m,\chan,Prand( [0,3,1], inf ),
	\octave, 5,
	\scale, [0,1,3,5,7,12],
	\degree, Pseq ([ Pshuf (#[-7,-3,0,2,4,7],4)-(Prand([12,0])), Pseq ([0,1,2,3,4,5,6,7])*1.2 ]-12, inf),
	// \midinote, Pseq(#[60,62],inf),
	/*\freq, Pseq(#[300,400,549,700,900],inf),*/
	\dur,Prand([0.25,0.25,0.5]*8,inf),
	\legato, Pseq ([1]),
	\detune, 0,
	\amp, 100,
).play (quant:1)
)
a.stop;

MIDIdef.freeAll;


// modal transposition

(

var notes;
notes = Pseq([ Pshuf(#[-7,-3,0,2,4,7], 4), Pseq([0,1,2,3,4,5,6,7]) ], 1);

Pseq([
	Pbind(\type, \midi, \midiout, m,\chan,0,
		\amp, 100,
		\dur, 0.15,
		\mtranspose, 0,
		\degree, notes
	),

	Pbind( \type, \midi, \midiout, m,\chan,1,
		\amp, 100,
		\dur, 0.15,
		\mtranspose, 1,
		\degree, notes
	),

	Pbind( \type, \midi, \midiout, m,\chan,2,
		\amp, 100,
		\dur, 0.15,
		\mtranspose, 2,
		\degree, notes
	)
], inf).play

)

 //
(
p = Pbind(
	\dur, Prand( [0.25,0.5,1], inf ),
	\freq, Pwhite( 40, 880 ),
	\db, Pwhite( -40,-10 ),
	\legato, Pwhite( 0.25, 4 ) );
m = SimpleMIDIFile( "~/Desktop/testPat.mid" );
m.init1( 2, 120, "4/4" );
m.fromPattern( p );

)


p.postln;

m.plot;

m.p.play; // note numbers are not rounded

p.play; // compare

m.write; //save

//bajar un archivo midi
"curl http://www.bachcentral.com/BachCentral/ORGAN/toccata1.mid -o ~/Desktop/toccata1.mid".unixCmd;

"ld ~/Desktop".unixCmd;


///// L-SYSTEM

(

var dict = IdentityDictionary[\A -> "AB", \B -> "A", \C -> "DB", \D -> "BC"]; //These are the production rules of the L-system
var word = "AC"; //Axiom word
var string_temp = "";
var iter = 10;

//These are diction for the mapping of the alphabet to "artistic" parameters: degrees in a scale, beat occurrence, etc.

var dictnotes = IdentityDictionary[\A -> 50, \B -> 55, \C -> 54, \D -> 57];
var dictkick = IdentityDictionary[\A -> 1, \B -> 0, \C -> 1, \D -> 0];
var dicthat = IdentityDictionary[\A -> 1, \B -> 0, \C -> 1, \D -> 1];
var notes=[];
var beat=[];
var beat2=[];

//This iteration generates the system recursively

iter.do({

word.asArray.do({|i|
    string_temp = string_temp ++ dict[i.asSymbol];
});

word = string_temp;
string_temp = "";
});

word.postln;

//Here we map the final system to the parameters as above

word.do({|i| notes = notes ++ dictnotes[i.asSymbol];});
word.do({|i| beat = beat ++ dictkick[i.asSymbol];});
word.do({|i| beat2 = beat2 ++ dicthat[i.asSymbol];});

notes.postln;
beat.postln;

Pbind(*[\type, \midi, \midiout, m,
	\chan, 1 ,
	\note: Pseq(notes,inf)/2,
	\amp: 60,
	\dur: 1/8]).play(quant:32);

Pbind(*[\type, \midi, \midiout, m,
	\chan, 2 ,
	\note: Pseq(notes,inf)-36,
	\amp: 60,
	\note: Pseq(notes + 48,inf),
	\dur: 1/8]).play(quant:32 + 16);

/*
Pbind(*[\type, \midi, \midiout, m,
	\chan, 4 ,
	\note: Pseq(notes,inf)-24,
	\amp: 60,
	\t: Pseq(beat,inf),
	\dur: 1/8]).play(quant:32 + 32);

Pbind(*[\type, \midi, \midiout, m,
	\chan, 3 ,
	\note: Pseq(notes,inf)/2,
	\amp: 60,
	\t: Pseq(beat2,inf),
	\r:8,
	\dur: 1/8]).play(quant:32 + 32 + 8);

Pbind(*[\type, \midi, \midiout, m,
	\chan, 0 ,
	\note: Pseq(notes,inf)/2,
	\amp: 60,
	\t: Prand([Pseq([0,0,1,0],4), Pseq([0,1,0,0],1)],inf),
	\r: 1,
	\dur: 1/4]).play(quant:32 + 32 + 8);*/
)