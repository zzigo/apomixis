import test from 'node:test';import assert from 'node:assert/strict';
import {createMidiNoteOutput} from '../packages/hylon-midi/note-output.js';
function fixture() {
  let time=0;const bytes=[];const port={id:'mock',name:'MOCK ONLY',state:'connected',open:async()=>{},close:async()=>{},send:data=>bytes.push([...data])};
  const gateway=createMidiNoteOutput({now:()=>time});gateway.select(port);
  return {gateway,port,bytes,set time(value){time=value;},get time(){return time;},advance(ms){for(let n=0;n<ms;n+=10){time+=Math.min(10,ms-n);gateway.tick();}}};
}
const note=(extra={})=>({owner:'spore:1:a',source:'spore',channel:1,note:60,velocity:64,durationMs:100,...extra});
test('MIDI output is disarmed by default and only emits finite note-on/off on chosen channel',async()=>{
  const f=fixture();assert.deepEqual(f.bytes,[]);assert.throws(()=>f.gateway.schedule(note()),/disabled/);await f.gateway.arm();
  f.gateway.schedule(note({channel:16}));f.gateway.tick();assert.deepEqual(f.bytes,[[0x9f,60,64]]);
  f.advance(100);assert.deepEqual(f.bytes,[[0x9f,60,64],[0x8f,60,0]]);assert.equal(f.gateway.status().active,0);
});
test('pause cancels pending MIDI and releases only the stopped source ownership',async()=>{
  const f=fixture();await f.gateway.arm();f.gateway.schedule(note());f.gateway.schedule(note({owner:'tester:a',source:'tester',durationMs:200}));f.gateway.tick();
  assert.equal(f.bytes.length,1);assert.equal(f.gateway.status().coalesced,1);
  f.gateway.stopSource('spore');assert.equal(f.bytes.length,1);f.gateway.stopSource('tester');assert.deepEqual(f.bytes.at(-1),[0x80,60,0]);
  f.gateway.schedule(note({owner:'future',whenMs:100}));f.gateway.stopSource('spore');f.advance(150);assert.equal(f.bytes.length,2);
});
test('disarm, stale tick and disconnect release ownership and never replay after reconnect',async()=>{
  const f=fixture();await f.gateway.arm();f.gateway.schedule(note({durationMs:1000}));f.gateway.tick();f.time=300;f.gateway.tick();
  assert.equal(f.gateway.status().armed,false);assert.deepEqual(f.bytes.at(-1),[0x80,60,0]);
  f.advance(200);assert.equal(f.bytes.length,2);await f.gateway.arm();f.gateway.schedule(note());f.gateway.tick();
  f.port.state='disconnected';f.gateway.tick();assert.equal(f.gateway.status().armed,false);assert.equal(f.gateway.status().queued,0);assert.match(f.gateway.status().fault,/note-off/);
  f.port.state='connected';f.gateway.tick();assert.equal(f.gateway.status().armed,false);
});
test('aggregate cap applies across sources and note-offs are never rate-limited',async()=>{
  const f=fixture();f.gateway.setBudget(2);await f.gateway.arm();
  for(let i=0;i<4;i++)f.gateway.schedule(note({owner:String(i),source:i%2?'tester':'spore',note:60+i}));f.gateway.tick();assert.equal(f.bytes.length,2);assert.equal(f.gateway.status().dropped,2);
  f.advance(100);assert.equal(f.bytes.filter(b=>(b[0]&240)===128).length,2);
});
test('invalid channels, notes, duration, times and raw commands cannot enter note gateway',async()=>{
  const f=fixture();await f.gateway.arm();
  for(const extra of [{channel:0},{channel:17},{note:128},{velocity:0},{durationMs:0},{durationMs:10001},{whenMs:300},{source:'sysex'},{note:NaN}])assert.throws(()=>f.gateway.schedule(note(extra)));
  assert.deepEqual(f.bytes,[]);assert.throws(()=>f.gateway.setBudget(51));
});
test('late attacks are dropped, queue is bounded, and port changes cannot redirect old notes',async()=>{
  const f=fixture();await f.gateway.arm();f.gateway.schedule(note({whenMs:10}));f.time=200;f.gateway.tick();assert.equal(f.bytes.length,0);assert.equal(f.gateway.status().dropped,1);
  for(let i=0;i<513;i++)f.gateway.schedule(note({owner:String(i),whenMs:250}));assert.equal(f.gateway.status().queued,512);
  const replacement={...f.port,id:'new'};f.gateway.select(replacement);assert.equal(f.gateway.status().queued,0);assert.equal(f.gateway.status().armed,false);f.advance(100);assert.equal(f.bytes.length,0);
});
test('stopping while output open is pending cannot arm a late port',async()=>{
  const f=fixture();let resolve;f.port.open=()=>new Promise(done=>resolve=done);const pending=f.gateway.arm();f.gateway.disarm('stop');resolve();await assert.rejects(pending,/cancelled/);assert.equal(f.gateway.status().armed,false);
});
test('send failure latches disarmed and no CC/PC/SysEx fallback is issued',async()=>{
  const f=fixture();await f.gateway.arm();f.port.send=()=>{throw new Error('mock send failure');};f.gateway.schedule(note());f.gateway.tick();assert.equal(f.gateway.status().armed,false);assert.match(f.gateway.status().fault,/failure/);
});
test('explicit SUPER PANIC is available disarmed and sends only CC123/120 on selected port',async()=>{
  const f=fixture();await f.gateway.arm();f.gateway.schedule(note());f.gateway.tick();const result=f.gateway.panic();
  assert.equal(result.failed,0);assert.equal(f.gateway.status().armed,false);assert.deepEqual(f.bytes[1],[0x80,60,0]);
  const cc=f.bytes.filter(b=>(b[0]&240)===176);assert.equal(cc.length,32);
  for(let channel=0;channel<16;channel++){assert(cc.some(b=>b[0]===(0xb0|channel)&&b[1]===123));assert(cc.some(b=>b[0]===(0xb0|channel)&&b[1]===120));}
  const count=f.bytes.length;f.advance(200);assert.equal(f.bytes.length,count);
  f.gateway.panic();assert.equal(f.bytes.length,count+32); // operator can panic even after disarm
});
import {KLAIS_CHANNELS} from '../packages/hylon-midi/klais-routing.js';
test('composer fixed map emits manuals I–IV and pedal on wire channels 1–5',async()=>{
  const f=fixture();await f.gateway.arm();
  for(const division of ['go','po','re','so','pe'])f.gateway.schedule(note({owner:division,channel:KLAIS_CHANNELS[division]}));
  f.gateway.tick();assert.deepEqual(f.bytes.map(message=>message[0]),[0x90,0x91,0x92,0x93,0x94]);
  f.advance(100);assert.deepEqual(f.bytes.slice(5).map(message=>message[0]),[0x80,0x81,0x82,0x83,0x84]);assert(Object.isFrozen(KLAIS_CHANNELS));
});
