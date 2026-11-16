// Numbered source files; retain aliases for old integrations and local draft keys.
export const SCORE_ALIASES=Object.freeze({
 'INIT-score.txt':'00-INIT-score.txt',
 'SPORE-score.txt':'01-SPORE-score.txt',
 'GAMETE-score.txt':'02-GAMETE-score.txt',
 'MEIOSIS-score.txt':'03-MEIOSIS-score.txt'
});
export const normalizeScoreFile=name=>SCORE_ALIASES[name]||name;
// The nine pieces of the cycle carry a hue taken from their subject; lab scores (10+) stay neutral.
export const PIECE_HUES=Object.freeze({
 '01':[78,'moss · the spore capsule'],'02':[50,'pollen · the grain'],'03':[325,'petal · the flower'],
 '04':[252,'night · dormancy and dream'],'05':[355,'embryo sac · living tissue'],'06':[186,'egg cell · water'],
 '07':[135,'leaf · the spiral of growth'],'08':[26,'soil · the rhizome underground'],'09':[208,'air · seed and voice in the wind']
});
export function describeScore(file){
 const match=file.match(/^(\d{2})-(.+?)(?:-score)?\.txt$/i),number=match?.[1]||'',name=match?.[2]||file.replace(/-score\.txt$/i,'');
 return {file,number,name,label:number?`${number}-${name}`:name,short:({SPORE:'SPO',GAMETE:'GAM',MEIOSIS:'MEO',MEGASPORE:'MEG',POLYGONUM:'POL',OOSPHERE:'OOS',PHYLLOTAXIS:'PHY',PROTOSPORE:'PRO',MICROSPORE:'MIC'})[name]||name.slice(0,3).toUpperCase(),init:number==='00',piece:Object.hasOwn(PIECE_HUES,number),hue:PIECE_HUES[number]?.[0]??null,theme:PIECE_HUES[number]?.[1]||'',lab:Number(number)>=10};
}

// Concert order is independent of stable file/organ-memory numbers. Labs follow the nine pieces.
export const CONCERT_ORDER=Object.freeze(['01','02','03','04','05','07','08','09','06']);
export function compareScoreFiles(a,b){
 const rank=file=>{const number=/^(\d+)-/.exec(file)?.[1],index=CONCERT_ORDER.indexOf(number);return number==='00'?-1:index>=0?index:100+(Number(number)||1000);};
 return rank(a)-rank(b)||a.localeCompare(b);
}
