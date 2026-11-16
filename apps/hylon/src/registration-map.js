import { KNOB } from '../../../packages/hylon-registers/console.js';
// Explicit catalog aliases, never MIDI addresses. An operator assignment overrides these.
const IDS = {
 'pe.flute32':1,'pe.soubasse32':2,'pe.contrebasse16':3,'pe.montre16':4,'pe.soubasse16':5,'pe.flute8':6,'pe.violoncelle8':7,'pe.bourdon8':8,'pe.principal4':9,'pe.contrebombarde32':10,'pe.bombarde16':11,'pe.trompette8':12,'pe.clairon4':13,
 'go.montre16':19,'go.montre8':20,'go.fluteHarmonique8':21,'go.dulciane8':22,'go.bourdon8':23,'go.prestant4':24,'go.fluteDouce4':25,'go.quinte223':26,'go.octave2':27,'go.fournitureV2':28,'go.bombarde16':29,'go.trompette8':30,'go.clairon4':31,'go.tremolo':32,
 'po.bourdon16':37,'po.principal8':38,'po.salicional8':39,'po.bourdon8':40,'po.octave4':41,'po.fluteTravers4':42,'po.doublette2':43,'po.cornetV8':44,'po.pleinJeuIII133':45,'po.clarinette8':46,'po.tremolo':47,
 're.quintaton16':52,'re.diapason8':53,'re.fluteHarmonique8':54,'re.violeDeGambe8':55,'re.voixCeleste8':56,'re.corDeNuit8':57,'re.fluteOctaviante4':58,'re.viole4':59,'re.nazardHarmonique223':60,'re.octavin2':61,'re.tierceHarmonique135':62,'re.pleinJeuHarmoniqueIV223':63,'re.basson16':64,'re.trompetteHarmonique8':65,'re.bassonHautbois8':66,'re.voixHumaine8':67,'re.claironHarmonique4':68,'re.tremolo':69,
 'so.seraphonFlote8':73,'so.tubaMagna16':74,'so.tuba8':75,
 'coupler.i_ped':14,'coupler.ii_ped':15,'coupler.iii_ped':16,'coupler.super_ped':17,'coupler.iv_ped':18,'coupler.ii_i':33,'coupler.iii_i':34,'coupler.sub_iii_i':35,'coupler.iv_i':36,'coupler.iii_ii':48,'coupler.iv_ii':49,'coupler.sub_ii':50,'coupler.super_ii':51,'coupler.iv_iii':70,'coupler.sub_iii':71,'coupler.super_iii':72
};
export const knobForSlot = slot => KNOB.get(Object.hasOwn(slot, 'knob') ? slot.knob : IDS[slot.id]);
