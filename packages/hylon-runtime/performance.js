// Ephemeral interpretation controls: score data and generator state stay unchanged.
export function createPerformanceControls(clock){
 const make=()=>({from:1,to:1,at:-Infinity}),tempo=make(),dur=make(),smooth=.1;
 // DUR is a gate percentage for EVERY note, limited by a maximum silence (gap, seconds): a note of length d
 // sounds max(d × dur, d − gap). Short notes shrink in proportion; long notes only open a breath before the next.
 let gap=.25;
 const value=(r,time)=>r.from+(r.to-r.from)*Math.max(0,Math.min(1,(time-r.at)/smooth));
 function integral(r,a,b){if(b<=a)return 0;const primitive=t=>{const u=t-r.at;if(!Number.isFinite(r.at))return t*r.to;if(u<=0)return u*r.from;if(u>=smooth)return smooth*(r.from+r.to)/2+(u-smooth)*r.to;return r.from*u+(r.to-r.from)*u*u/(2*smooth);};return primitive(b)-primitive(a);}
 return {tempoAt:t=>value(tempo,t),durAt:t=>value(dur,t),gap:()=>gap,gate(seconds,t){const d=value(dur,t);return d>=1?seconds:Math.max(seconds*d,seconds-gap);},integral:(a,b)=>integral(tempo,a,b),
  set(key,target){if(key==='gap'){if(!Number.isFinite(target)||target<0||target>5)throw new Error('Invalid performance control');gap=target;return;}const range=key==='tempo'?[.25,4]:key==='dur'?[.001,1]:null;if(!range||!Number.isFinite(target)||target<range[0]||target>range[1])throw new Error('Invalid performance control');const r=key==='tempo'?tempo:dur,time=clock();r.from=value(r,time);r.to=target;r.at=time;},
  state(){return {tempo:tempo.to,dur:dur.to,tempoNow:value(tempo,clock()),durNow:value(dur,clock()),gapMs:Math.round(gap*1000),smoothingMs:100};}};
}
