const divisions=['so','re','po','go','pe'];
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const text=(s,max=120)=>typeof s==='string'&&s.length<=max;
const list=(v,max,predicate)=>Array.isArray(v)&&v.length<=max&&v.every(predicate);
export function validLiveFrame(f){
  if(!f||f.v!==1||!text(f.title)||!finite(f.time,0,1800)||typeof f.running!=='boolean'||typeof f.hackOn!=='boolean'||!finite(f.tt,0,2000))return false;
  if(!divisions.every(d=>finite(f.open?.[d],0,1e9)&&finite(f.close?.[d],0,1e9)&&finite(f.perDiv?.[d],0,100000)))return false;
  // Optional sung text (score `verse` lines): current and previous verse.
  if(f.lyric!==undefined&&!(f.lyric&&text(f.lyric.now,240)&&text(f.lyric.prev,240)))return false;
  // Optional garden projection (public viewer v2).
  if(f.garden!==undefined){const g=f.garden,tex=['tutti','striated','hocket','granulation'];
    if(!g||!(g.piece===null||(Number.isInteger(g.piece)&&g.piece>=0&&g.piece<=99))||!tex.includes(g.tex)||!['gen','geno','pop'].every(k=>Number.isInteger(g[k])&&g[k]>=0&&g[k]<=1e7)||!finite(g.H,0,64)||!['mu','poly','tuber'].every(k=>finite(g[k],0,1)))return false;
    // Optional `public` sentence of the current section: gesture kind and haptic pulse range (ms).
    if(g.pub!==undefined&&!(g.pub&&['hold','tap'].includes(g.pub.mark)&&list(g.pub.feel,2,n=>finite(n,0,200))&&g.pub.feel.length===2))return false;
    if(!list(g.ev,64,e=>e&&finite(e.t,0,2000)&&divisions.includes(e.div)&&[0,1,2].includes(e.k)&&(e.x===undefined||tex.includes(e.x))&&Number.isInteger(e.g)&&e.g>=0&&e.g<=1e6&&finite(e.l,0,60)))return false;}
  const sec=f.sec;if(!sec||!finite(sec.swell,0,1)||!finite(sec.cresc,0,1))return false;
  if(![sec.regs,sec.hackRegs].every(r=>r&&Object.keys(r).every(d=>divisions.includes(d)&&list(r[d],80,k=>text(k,80)))))return false;
  if(!list(f.usedCouplers,64,k=>text(k,80))||!list(sec.couplers,64,k=>f.usedCouplers.includes(k)))return false;
  return f.usedCouplers.every(k=>{const c=f.couplings?.[k];return c&&divisions.includes(c.from)&&divisions.includes(c.to)&&finite(c.tr,-48,48)&&text(c.label)&&text(c.morph);});
}
