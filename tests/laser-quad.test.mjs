import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuadMapper,identityQuad,validateQuad} from '../packages/hylon-laser/quad.js';
import {defaultLaserProfile,validateLaserProfile,projectLaserPoint} from '../packages/hylon-laser/profile.js';
import {compileLaserFrame,defaultOutputProfile,encodeHeliosFrame} from '../packages/hylon-laser/frame.js';
import {testFrame} from '../packages/hylon-laser/patterns.js';
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} ≈ ${b}`);
test('projective quad fixes all four corners and preserves straight diagonals',()=>{
 const quad=[[.15,.1],[.85,.2],[.95,.9],[.05,.8]],map=createQuadMapper(quad);
 identityQuad().forEach(([x,y],i)=>map(x,y).forEach((v,j)=>close(v,quad[i][j])));
 const a=map(0,0),b=map(1,1),mid=map(.5,.5);
 close((b[0]-a[0])*(mid[1]-a[1])-(b[1]-a[1])*(mid[0]-a[0]),0);
 for(let x=0;x<=1;x+=.1)for(let y=0;y<=1;y+=.1)assert(map(x,y).every(v=>v>=0&&v<=1));
});
test('folded, concave, tiny, nonfinite and out-of-field maps are rejected',()=>{
 for(const quad of [ [[0,0],[1,1],[1,0],[0,1]], [[0,0],[1,0],[.1,.1],[0,1]], [[0,0],[.01,0],[.01,.01],[0,.01]], [[NaN,0],[1,0],[1,1],[0,1]], [[-1,0],[1,0],[1,1],[0,1]] ])assert.throws(()=>validateQuad(quad));
 assert.throws(()=>createQuadMapper(identityQuad())(Infinity,0));
});
test('legacy profiles default to identity and mapped output uses the same transform as preview',()=>{
 const legacy=defaultLaserProfile();delete legacy.warpQuad;assert.deepEqual(validateLaserProfile(legacy).warpQuad,identityQuad());
 const p={...defaultOutputProfile(defaultLaserProfile()),widthPercent:100,heightPercent:100,warpQuad:[[.2,.1],[.8,.2],[.9,.9],[.1,.8]]};
 const frame=compileLaserFrame(testFrame(),p);encodeHeliosFrame(frame.points,frame.pps);
 for(const [x,y] of identityQuad()) {const point=projectLaserPoint(p,x,y); assert(frame.points.some(v=>v.i>0&&Math.abs(v.x/4095-point[0])<.001&&Math.abs(1-v.y/4095-point[1])<.001));}
 for(let i=1;i<frame.points.length;i++){const a=frame.points[i-1],b=frame.points[i];if(a.i&&b.i)assert(Math.hypot(a.x-b.x,a.y-b.y)<=66);}
 assert(frame.points.length/frame.pps<=.04);
});
