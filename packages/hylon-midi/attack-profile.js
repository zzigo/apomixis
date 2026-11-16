// Attack profile: the score writes the ideal note length; the hall decides the real one.
// One master minimum (ms) plus a per-division offset gives each division its floor.
//   clamp  anything shorter than the floor becomes the floor; longer notes are untouched
//   remap  the ideal range [ideal … span] is compressed into [floor … span], so a written
//          30→100 ms gradient keeps its shape above the floor
// Pure. Applied in the note gateway to every score, IMPRO and M-MORPH note; the ATTACK tester
// bypasses it (it is the instrument that measures the floor).
export const ATTACK_DEFAULT=Object.freeze({mode:'clamp',master:10,offsets:Object.freeze({1:0,2:0,3:0,4:0,5:0}),ideal:30,span:250});
export const ATTACK_LIMITS=Object.freeze({master:[10,400],offset:[0,400],ideal:[10,200],span:[50,2000]});
export function normalizeAttackProfile(raw={}){
 const inside=(value,[low,high],name)=>{if(typeof value!=='number'||!Number.isFinite(value)||value<low||value>high)throw new Error(`Attack ${name} must be ${low}–${high}`);return value;};
 const mode=raw.mode??ATTACK_DEFAULT.mode;if(!['clamp','remap'].includes(mode))throw new Error('Attack mode clamp|remap');
 const offsets={};for(const channel of [1,2,3,4,5])offsets[channel]=inside(raw.offsets?.[channel]??0,ATTACK_LIMITS.offset,'offset');
 return{mode,master:inside(raw.master??ATTACK_DEFAULT.master,ATTACK_LIMITS.master,'master'),offsets,ideal:inside(raw.ideal??ATTACK_DEFAULT.ideal,ATTACK_LIMITS.ideal,'ideal'),span:inside(raw.span??ATTACK_DEFAULT.span,ATTACK_LIMITS.span,'span')};
}
export const attackFloor=(profile,channel)=>profile.master+(profile.offsets[channel]??0);
export function shapeDuration(profile,channel,durationMs){
 const floor=attackFloor(profile,channel);
 if(profile.mode==='remap'&&floor<profile.span&&durationMs<profile.span){
  const ideal=Math.min(profile.ideal,profile.span-1),t=Math.max(0,(durationMs-ideal)/(profile.span-ideal));
  return Math.max(durationMs,floor+t*(profile.span-floor));
 }
 return Math.max(durationMs,floor);
}
