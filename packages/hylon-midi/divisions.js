// Canonical visible division identity. Historical score IDs and MIDI channels stay fixed.
export const DIVISION_ORDER=Object.freeze(['pe','go','po','re','so']);
export const DIVISION_UI=Object.freeze(Object.fromEntries([
 ['pe','P','Pédale',5,40],['go','I','Grand-Orgue',1,95],['po','II','Positif',2,150],['re','III','Récit expressif',3,205],['so','IV','Solo',4,260]
].map(([id,label,name,channel,hue])=>[id,Object.freeze({id,label,name,channel,hue,color:`hsl(${hue} 78% 72%)`})])));
export function divisionInfo(value){
 const id=String(value||'').toLowerCase();return DIVISION_UI[id]||Object.values(DIVISION_UI).find(d=>d.label.toLowerCase()===id||`manual${d.channel}`===id&&d.id!=='pe'||id==='pedal'&&d.id==='pe');
}
