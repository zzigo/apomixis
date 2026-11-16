// Built-in register families for `pgm @family` (homogeneous timbre groups of the Klais console).
// Pure data derived from console.js numbering; a division scope (`III. @reeds`) filters the family.
// A score-level `set NAME = …` with the same name overrides a family (text macro, expanded first).
import {KNOBS,SPEAKING} from './console.js';
const byFoot=foot=>KNOBS.filter(k=>k.kind==='stop'&&k.foot===foot).map(k=>k.n);
export const FAMILIES=Object.freeze({
 flutes:[1,6,21,25,42,54,58,73],          // open / harmonic flutes, Seraphon
 bourdons:[2,5,8,23,37,40,52,57],         // stopped flutes
 strings:[3,7,22,39,55,56,59],
 principals:[4,9,19,20,24,38,41,53],
 reeds:[46,64,66,67],                     // soft / solo reeds
 brass:[10,11,12,13,29,30,31,65,68,74,75],// chorus reeds and tubas
 mixtures:[28,44,45,63],
 mutations:[26,60,62],
 cloud2:[27,43,61],                       // every 2' : the high dense cloud
 noise32:[1,2,10],                        // pedal 32' : noise below ~B1
 pedalvoice:[6,7,8,9],                    // pedal as a melodic voice (8' + 4')
 voix:[56,67,69],                         // voix céleste + voix humaine + trémolo (III)
 trem:[32,47,69],
 f32:byFoot('32'),f16:byFoot('16'),f8:byFoot('8'),f4:byFoot('4'),f2:byFoot('2'),
 tutti:KNOBS.filter(k=>SPEAKING(k.n)).map(k=>k.n)
});
export const familyNames=()=>Object.keys(FAMILIES);
