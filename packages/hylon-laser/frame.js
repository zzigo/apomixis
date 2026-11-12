// Wire packing follows Gitle Mikkelsen's HELIOS SDK (MIT); see licenses/HELIOS-SDK-MIT.txt.
import { projectLaserPoint } from './profile.js';
import { createQuadMapper } from './quad.js';
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
  const color=profile.colorRgb ?? [0,1,0];
  if(!Array.isArray(color)||color.length!==3||color.some(v=>!Number.isFinite(v)||v<0||v>1))throw new Error('Invalid RGB color');
  const pps = profile.scanRatePps;
  if (!Number.isInteger(pps) || pps < 8000 || pps > 40000) throw new Error('Output PPS must be 8000–40000');
  if (!Array.isArray(strokes) || strokes.length > 64) throw new Error('Too many laser strokes');
  const maxPoints = Math.min(1600, Math.floor(pps * .04)), points = [];
  const mapper = profile.warpQuad ? createQuadMapper(profile.warpQuad) : null;
  let cursor = [.5, .5], projected = projectLaserPoint(profile, .5, .5, mapper);
  function move(target, intensity) {
    const mapped = projectLaserPoint(profile, ...target, mapper);
    const distance = Math.hypot(mapped[0] - projected[0], mapped[1] - projected[1]);
    if (distance < 1e-8 && intensity > 0) return;
    // Geometric interpolation before DAC quantization; no unblanked jumps.
    const steps = Math.max(1, Math.ceil(distance * 64));
    for (let i = 1; i <= steps; i++) {
      const xy = projected.map((v, axis) => v + (mapped[axis] - v) * i / steps);
      const level = Math.round(255 * profile.intensityPercent / 100 * intensity);
      const point = { x: Math.round(xy[0] * 4095), y: Math.round((1 - xy[1]) * 4095), r: Math.round(level*color[0]), g: Math.round(level*color[1]), b: Math.round(level*color[2]), i: color.some(v=>v>0)?level:0 };
      const previous = points.at(-1);
      if (!(level > 0 && previous?.i > 0 && previous.x === point.x && previous.y === point.y)) points.push(point);
      if (points.length > maxPoints) throw new Error('Pattern exceeds 40 ms frame budget; shorten text / reduce MIDI notes');
    }
    cursor = target; projected = mapped;
  }
  move(cursor, 0);
  for (const stroke of strokes) {
    if (!Array.isArray(stroke.points) || stroke.points.length < 2 || stroke.points.length > 256 || !Number.isFinite(stroke.intensity) || stroke.intensity < 0 || stroke.intensity > 1) throw new Error('Invalid laser stroke');
    for (const p of stroke.points) if (!Array.isArray(p) || p.length !== 2 || p.some(v => !Number.isFinite(v) || v < 0 || v > 1)) throw new Error('Invalid laser coordinate');
    move(stroke.points[0], 0); for (const point of stroke.points.slice(1)) move(point, stroke.intensity);
    move(cursor, 0);
  }
  move([.5, .5], 0);
  // Short patterns pad in darkness, never by dwelling on lit points.
  while (points.length < Math.max(128, Math.ceil(pps / 50))) points.push({ x: 2048, y: 2048, r: 0, g: 0, b: 0, i: 0 });
  points.push({ x: 2048, y: 2048, r: 0, g: 0, b: 0, i: 0 });
  if (points.length > maxPoints) throw new Error('Laser frame budget exceeded');
  return { points, pps };
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
