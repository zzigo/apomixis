// Wire packing follows Gitle Mikkelsen's HELIOS SDK (MIT); see licenses/HELIOS-SDK-MIT.txt.
import { projectLaserPoint } from './profile.js';
import { createQuadMapper } from './quad.js';
import { validateScanTuning } from './scan-tuning.js';
export const OUTPUT_DEFAULTS = Object.freeze({ scanRatePps: 20000, widthPercent: 20, heightPercent: 20, intensityPercent: 5 });
export function defaultOutputProfile(base) { return { ...base, ...OUTPUT_DEFAULTS, model: '', target: 'unknown', angleXDeg: null, angleYDeg: null, offsetXPercent: 0, offsetYPercent: 0, flipX: false, flipY: false }; }
// No stationary lit points: even MIDI loci become small scanned rings.
export function midiStrokes(points, size = 0, profile = null) {
  if (!Number.isFinite(size) || size < 0 || size > 100) throw new Error('Point size must be 0–100');
  const mapper = profile?.warpQuad ? createQuadMapper(profile.warpQuad) : null;
  return points.slice(0, 8).map(p => {
    const ring = radius => Array.from({length:25},(_,i)=>{
      const a=i/24*Math.PI*2;
      return [Math.max(0,Math.min(1,p.x+radius*Math.cos(a))),Math.max(0,Math.min(1,p.y+radius*Math.sin(a)))];
    });
    let radius = profile ? .001 : .01, trace = ring(radius);
    // A visually point-sized locus retains scanner motion after size/warp transforms.
    while(profile && radius < .25) {
      const mapped=trace.map(([x,y])=>projectLaserPoint(profile,x,y,mapper)),first=mapped[0];
      if(mapped.some(([x,y])=>Math.hypot(x-first[0],y-first[1])*4095>=12))break;
      radius=Math.min(.25,radius*1.5);trace=ring(radius);
    }
    return {intensity:p.intensity,points:ring(Math.min(.25,radius+size/100*.08))};
  });
}
// Compact single-stroke glyphs. Unsupported characters are rejected for output.
const GLYPHS = {
 A:[[[0,1],[.5,0],[1,1]],[[.2,.6],[.8,.6]]], B:[[[0,1],[0,0],[.7,0],[1,.2],[.7,.5],[0,.5]],[[.7,.5],[1,.7],[.7,1],[0,1]]], C:[[[1,0],[0,0],[0,1],[1,1]]], D:[[[0,1],[0,0],[.6,0],[1,.3],[1,.7],[.6,1],[0,1]]], E:[[[1,0],[0,0],[0,1],[1,1]],[[0,.5],[.8,.5]]], F:[[[1,0],[0,0],[0,1]],[[0,.5],[.8,.5]]], G:[[[1,0],[0,0],[0,1],[1,1],[1,.5],[.5,.5]]], H:[[[0,0],[0,1]],[[1,0],[1,1]],[[0,.5],[1,.5]]], I:[[[0,0],[1,0]],[[.5,0],[.5,1]],[[0,1],[1,1]]], J:[[[0,0],[1,0],[1,1],[0,1],[0,.7]]], K:[[[0,0],[0,1]],[[1,0],[0,.5],[1,1]]], L:[[[0,0],[0,1],[1,1]]], M:[[[0,1],[0,0],[.5,.5],[1,0],[1,1]]], N:[[[0,1],[0,0],[1,1],[1,0]]], O:[[[0,0],[1,0],[1,1],[0,1],[0,0]]], P:[[[0,1],[0,0],[1,0],[1,.5],[0,.5]]], Q:[[[0,0],[1,0],[1,1],[0,1],[0,0]],[[.6,.6],[1,1]]], R:[[[0,1],[0,0],[1,0],[1,.5],[0,.5]],[[.5,.5],[1,1]]], S:[[[1,0],[0,0],[0,.5],[1,.5],[1,1],[0,1]]], T:[[[0,0],[1,0]],[[.5,0],[.5,1]]], U:[[[0,0],[0,1],[1,1],[1,0]]], V:[[[0,0],[.5,1],[1,0]]], W:[[[0,0],[.25,1],[.5,.5],[.75,1],[1,0]]], X:[[[0,0],[1,1]],[[1,0],[0,1]]], Y:[[[0,0],[.5,.5],[1,0]],[[.5,.5],[.5,1]]], Z:[[[0,0],[1,0],[0,1],[1,1]]], '0':[[[0,0],[1,0],[1,1],[0,1],[0,0]]], '1':[[[.2,.2],[.5,0],[.5,1]],[[0,1],[1,1]]], '2':[[[0,0],[1,0],[1,.5],[0,.5],[0,1],[1,1]]], '3':[[[0,0],[1,0],[1,1],[0,1]],[[0,.5],[1,.5]]], '4':[[[0,0],[0,.5],[1,.5]],[[1,0],[1,1]]], '5':[[[1,0],[0,0],[0,.5],[1,.5],[1,1],[0,1]]], '6':[[[1,0],[0,0],[0,1],[1,1],[1,.5],[0,.5]]], '7':[[[0,0],[1,0],[.3,1]]], '8':[[[0,0],[1,0],[1,1],[0,1],[0,0]],[[0,.5],[1,.5]]], '9':[[[1,.5],[0,.5],[0,0],[1,0],[1,1],[0,1]]], '-':[[[0,.5],[1,.5]]]
};
export function textStrokes(input) {
  const text = String(input).toUpperCase().slice(0, 12);
  if ([...text].some(c => c !== ' ' && !GLYPHS[c])) throw new Error('Laser text supports A–Z, 0–9, space and dash (12 characters)');
  const count = Math.max(1, text.length), cell = .9 / count;
  return [...text].flatMap((c, i) => (GLYPHS[c] || []).map(path => ({ intensity: 1, points: path.map(([x, y]) => [.05 + cell * (i + x * .75), .3 + y * .4]) })));
}
export function compileLaserFrame(strokes, profile) {
  const color=profile.colorRgb ?? [0,1,0], tuning=validateScanTuning(profile.scanTuning);
  if(!Array.isArray(color)||color.length!==3||color.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('Invalid RGB color');
  const pps=profile.scanRatePps;
  if(!Number.isInteger(pps)||pps<8000||pps>40000)throw new Error('Output PPS must be 8000–40000');
  if(!Array.isArray(strokes)||strokes.length>64)throw new Error('Too many laser strokes');
  const mapper=profile.warpQuad?createQuadMapper(profile.warpQuad):null;
  const center=projectLaserPoint(profile,.5,.5,mapper),distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
  const paths=strokes.map((stroke,index)=>{
    if(!Array.isArray(stroke.points)||stroke.points.length<2||stroke.points.length>256||!Number.isFinite(stroke.intensity)||stroke.intensity<0||stroke.intensity>1)throw new Error('Invalid laser stroke');
    for(const p of stroke.points)if(!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('Invalid laser coordinate');
    return {id:index+1,intensity:stroke.intensity,path:stroke.points.map(([x,y])=>projectLaserPoint(profile,x,y,mapper))};
  });
  const ordered=[];let cursor=center;
  if(tuning.route==='original')ordered.push(...paths);
  else {
    const remaining=[...paths];
    while(remaining.length){
      let best=Infinity,chosen=0,reverse=false,rotation=0;
      remaining.forEach((stroke,index)=>{
        const closed=distance(stroke.path[0],stroke.path.at(-1))<1e-8;
        const candidates=closed?stroke.path.slice(0,-1):[stroke.path[0]];
        candidates.forEach((point,start)=>{const d=distance(cursor,point);if(d<best){best=d;chosen=index;reverse=false;rotation=start;}});
        if(!closed&&tuning.route==='nearest-reverse'){
          const d=distance(cursor,stroke.path.at(-1));if(d<best){best=d;chosen=index;reverse=true;rotation=0;}
        }
      });
      const next=remaining.splice(chosen,1)[0];
      if(rotation){const ring=next.path.slice(0,-1);next.path=[...ring.slice(rotation),...ring.slice(0,rotation)];next.path.push(next.path[0]);}
      else if(reverse)next.path=[...next.path].reverse();
      ordered.push(next);cursor=next.path.at(-1);
    }
  }
  const anchor=tuning.returnToCenter?center:(ordered[0]?.path[0]||center);
  const maxPoints=Math.min(1600,Math.floor(pps*.04)),points=[],lanes=[];
  const samples=us=>Math.round(us*pps/1e6),dark=point=>Object.assign(point,{r:0,g:0,b:0,i:0});
  cursor=anchor;
  function emit(xy,intensity=0,lane=0){
    const level=Math.round(255*profile.intensityPercent/100*intensity);
    const point={x:Math.round(xy[0]*4095),y:Math.round((1-xy[1])*4095),r:Math.round(level*color[0]),g:Math.round(level*color[1]),b:Math.round(level*color[2]),i:color.some(v=>v>0)?level:0};
    const previous=points.at(-1);
    if(point.i>0&&previous?.i>0&&previous.x===point.x&&previous.y===point.y)return;
    points.push(point);lanes.push(lane);
    if(points.length>maxPoints)throw new Error('40 ms frame budget exceeded; reduce scan tuning / text / MIDI loci');
  }
  function move(target,intensity=0,lane=0,startSlow=0,endSlow=0){
    const length=distance(cursor,target);
    if(length<1e-8&&intensity>0)return;
    const step=intensity>0?tuning.traceStep:64;
    const steps=Math.max(1,Math.ceil(length*64*(64/step)*(1+Math.max(startSlow,endSlow))));
    for(let i=1;i<=steps;i++){
      const t=i/steps,t2=t*t,t3=t2*t;
      const u=t-startSlow*(t3-2*t2+t)-endSlow*(t3-t2);
      emit(cursor.map((v,axis)=>v+(target[axis]-v)*u),intensity,lane);
    }
    cursor=target;
  }
  function bend(path,index){
    const closed=distance(path[0],path.at(-1))<1e-8;
    if(closed&&index===path.length-1)index=0;
    if(!closed&&(index===0||index===path.length-1))return 1;
    const a=path[index===0?path.length-2:index-1],b=path[index],c=path[index+1];
    const dx=b[0]-a[0],dy=b[1]-a[1],ex=c[0]-b[0],ey=c[1]-b[1],den=Math.hypot(dx,dy)*Math.hypot(ex,ey);
    return den<1e-10?0:Math.min(1,Math.max(0,1-(dx*ex+dy*ey)/den));
  }
  emit(anchor);
  for(const stroke of ordered){
    move(stroke.path[0]);
    for(let i=0;i<samples(tuning.settleUs);i++)emit(cursor); // Settling is always dark.
    const first=points.length,amount=tuning.cornerSlowdown/100;
    for(let i=1;i<stroke.path.length;i++)move(stroke.path[i],stroke.intensity,stroke.id,amount*bend(stroke.path,i-1),amount*bend(stroke.path,i));
    const end=points.length,lead=samples(tuning.blankLeadUs),tail=samples(tuning.blankTailUs);
    for(let i=first;i<end;i++)if(i<first+lead||i>=end-tail){dark(points[i]);lanes[i]=0;}
    emit(cursor);
  }
  move(anchor);
  // Pad at the selected closure anchor, avoiding an extra jump to hard-coded center.
  while(points.length<Math.max(128,Math.ceil(pps/50)))emit(anchor);
  emit(anchor);
  const shift=samples(tuning.colorDelayUs);
  if(shift){
    const rgb=points.map(p=>[p.r,p.g,p.b,p.i]);
    points.forEach((point,index)=>{
      const source=index-shift;
      // Timing compensation never illuminates blank travel or leaks into another stroke.
      if(lanes[index]&&source>=0&&source<rgb.length&&lanes[source]===lanes[index]){
        [point.r,point.g,point.b,point.i]=rgb[source];
      }else dark(point);
    });
  }
  return {points,pps};
}
export function encodeHeliosFrame(input, pps) {
  if (!Array.isArray(input) || input.length < 128 || input.length > 1600 || !Number.isInteger(pps) || pps < 8000 || pps > 40000 || input.length / pps > .04) throw new Error('Invalid HELIOS frame bounds');
  for (const point of input) for (const [key, max] of [['x',4095],['y',4095],['r',255],['g',255],['b',255],['i',255]]) if (!Number.isInteger(point[key]) || point[key] < 0 || point[key] > max) throw new Error('Invalid HELIOS point');
  const dark = p => p.r === 0 && p.g === 0 && p.b === 0 && p.i === 0;
  const lit = input.filter(point => !dark(point));
  if (lit.length && !lit.some(point => Math.hypot(point.x-lit[0].x,point.y-lit[0].y)>=8)) throw new Error('Stationary lit trace rejected');
  if (!dark(input[0]) || !dark(input.at(-1))) throw new Error('Laser frame must begin and end blanked');
  // Official SDK workaround for USB MCU transfer lengths.
  const count = (input.length - 45) % 64 === 0 ? input.length - 1 : input.length;
  if (!dark(input[count - 1])) throw new Error('USB-length workaround requires trailing blank points');
  const rate = Math.round(pps * count / input.length), bytes = new Uint8Array(count * 7 + 5); let at = 0;
  for (const p of input.slice(0, count)) { bytes[at++]=p.x>>4;bytes[at++]=((p.x&15)<<4)|(p.y>>8);bytes[at++]=p.y&255;bytes[at++]=p.r;bytes[at++]=p.g;bytes[at++]=p.b;bytes[at++]=p.i; }
  bytes[at++]=rate&255;bytes[at++]=rate>>8;bytes[at++]=count&255;bytes[at++]=count>>8;bytes[at]=2; // SINGLE_MODE, never infinite repeat
  return bytes;
}
