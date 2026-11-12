import test from 'node:test';import assert from 'node:assert/strict';
import {compileLaserFrame,encodeHeliosFrame,defaultOutputProfile,textStrokes,midiStrokes}from'../packages/hylon-laser/frame.js';
import{defaultLaserProfile}from'../packages/hylon-laser/profile.js';import{testFrame}from'../packages/hylon-laser/patterns.js';
const config=()=>defaultOutputProfile(defaultLaserProfile());
test('output defaults build bounded blanked one-shot frames with SDK coordinate packing',()=>{
 const frame=compileLaserFrame(testFrame(),config()),bytes=encodeHeliosFrame(frame.points,frame.pps);
 assert.equal(frame.pps,20000);assert(frame.points.length/frame.pps<=.04);assert.equal(bytes.at(-1),2);
 assert.equal(frame.points[0].i,0);assert.equal(frame.points.at(-1).i,0);
 for(let n=0;n<frame.points.length;n++){const p=frame.points[n],i=n*7;assert.equal((bytes[i]<<4)|(bytes[i+1]>>4),p.x);assert.equal(((bytes[i+1]&15)<<8)|bytes[i+2],p.y);}
 assert.equal(bytes.at(-5)|(bytes.at(-4)<<8),20000);assert(frame.points.some(p=>p.i>0));
});
test('text and MIDI produce moving geometry; unsupported/oversized patterns fail closed',()=>{
 const text=compileLaserFrame(textStrokes('HYLON'),config());assert(text.points.some(p=>p.i>0));
 const ring=compileLaserFrame(midiStrokes([{x:.5,y:.5,intensity:.5}]),config());assert(new Set(ring.points.filter(p=>p.i).map(p=>p.x+':'+p.y)).size>4);
 assert.throws(()=>textStrokes('ü'));assert.throws(()=>compileLaserFrame(testFrame(),{...config(),scanRatePps:NaN}));
 assert.throws(()=>compileLaserFrame(Array.from({length:64},()=>testFrame()[0]),config()),/budget/);
});
test('codec rejects stationary light, malformed coordinates and unsafe frame envelopes',()=>{
 const frame=compileLaserFrame(testFrame(),config());const bad=frame.points.map(p=>({...p}));bad[0].i=1;assert.throws(()=>encodeHeliosFrame(bad,20000));
 const still=frame.points.map((p,i)=>({x:2048,y:2048,r:0,g:i>0&&i<frame.points.length-1?10:0,b:0,i:i>0&&i<frame.points.length-1?10:0}));assert.throws(()=>encodeHeliosFrame(still,20000),/Stationary/);
 const invalid=frame.points.map(p=>({...p}));invalid[2].x=4096;assert.throws(()=>encodeHeliosFrame(invalid,20000));
 assert.throws(()=>encodeHeliosFrame(frame.points,100));
});
test('SDK USB-length workaround adjusts point count/rate and preserves final blanking',()=>{
 const f=compileLaserFrame(testFrame(),config());while(f.points.length<429)f.points.push({x:2048,y:2048,r:0,g:0,b:0,i:0});
 const data=encodeHeliosFrame(f.points,20000);assert.equal(data.length,428*7+5);assert.equal(data.at(-3)|(data.at(-2)<<8),428);assert.equal(data.at(-5)|(data.at(-4)<<8),Math.round(20000*428/429));assert.equal(data.at(-1),2);
 f.points[427].g=5;f.points[427].i=5;assert.throws(()=>encodeHeliosFrame(f.points,20000),/trailing blank/);
});
test('RGB mixes preserve global/velocity intensity and zero color stays dark',()=>{
 const p={...config(),colorRgb:[1,.5,.25]},f=compileLaserFrame(testFrame(),p);encodeHeliosFrame(f.points,f.pps);
 const lit=f.points.find(p=>p.i);assert.equal(lit.r,lit.i);assert.equal(lit.g,Math.round(lit.i*.5));assert.equal(lit.b,Math.round(lit.i*.25));
 const dark=compileLaserFrame(testFrame(),{...p,colorRgb:[0,0,0]});assert(dark.points.every(p=>!(p.r||p.g||p.b||p.i)));encodeHeliosFrame(dark.points,dark.pps);
 assert.throws(()=>compileLaserFrame(testFrame(),{...p,colorRgb:[NaN,0,0]}));
});
test('minimum MIDI loci remain small moving traces after size and zone mapping',()=>{
 for(const width of [5,20,100])for(const warpQuad of [[[0,0],[1,0],[1,1],[0,1]],[[.1,.1],[.9,.2],[.8,.9],[.2,.8]]]){
  const p={...config(),widthPercent:width,heightPercent:width,warpQuad};
  for(const [x,y] of [[.5,.5],[0,0],[1,1]]){
   const f=compileLaserFrame(midiStrokes([{x,y,intensity:1}],0,p),p);encodeHeliosFrame(f.points,f.pps);
   const lit=f.points.filter(v=>v.i);const range=axis=>Math.max(...lit.map(v=>v[axis]))-Math.min(...lit.map(v=>v[axis]));
   assert(Math.max(range('x'),range('y'))<40,'Minimum visually remains a tiny locus');
  }
 }
 const p=config(),note=[{x:.5,y:.5,intensity:1}],small=midiStrokes(note,0,p)[0].points,large=midiStrokes(note,100,p)[0].points;
 assert(Math.max(...large.map(p=>p[0]))>Math.max(...small.map(p=>p[0])));
});
