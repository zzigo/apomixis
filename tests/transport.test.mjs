import test from 'node:test';import assert from 'node:assert/strict';
import {createGeneratorTransport} from '../packages/hylon-runtime/transport.js';
function fixture(events) {
  let at=0, wall=0, emitted=false, stopped=0; const sent=[];
  const generator={start(){},stop(){},reset(){emitted=false;},view(){return {tNext:0,ended:emitted};},step(){if(emitted)return {events:[],budgetExhausted:false};emitted=true;return {events,budgetExhausted:false};}};
  const transport=createGeneratorTransport({generator,clock:()=>at,wallClock:()=>wall,onEvent:(e,t)=>sent.push([e,t]),onStop:()=>stopped++});
  return {transport,sent,advance(n){at+=n;wall+=n;},get stopped(){return stopped;}};
}
const note=(id,t)=>({eventId:id,kind:'note',atSessionMs:t,payload:{durationMs:100}});
test('transport cancels future output on pause and requeues only future starts for explicit resume',()=>{
  const f=fixture([note('a',50),note('b',300)]);f.transport.play();f.transport.tick();assert.equal(f.sent.length,1);
  f.advance(.02);f.transport.pause();const epoch=f.transport.view().epoch;f.advance(.1);f.transport.tick();assert.equal(f.sent.length,1);
  f.transport.play();f.transport.tick();assert.equal(f.sent.length,2);assert.equal(f.sent[1][0].eventId,'a');assert.equal(f.sent[1][1].epoch,epoch);
  f.transport.dispose();f.advance(.1);f.transport.tick();assert.equal(f.sent.length,2);
});
test('transport stops on stale clocks, bounds note density and reports drops',()=>{
  const f=fixture(Array.from({length:100},(_,i)=>note(String(i),0)));f.transport.play();f.transport.tick();assert.equal(f.sent.length,45);assert.equal(f.transport.view().dropped,55);
  f.advance(.4);f.transport.tick();assert.equal(f.transport.view().running,false);assert(f.stopped>0);
  assert.throws(()=>f.transport.seek(NaN));assert.throws(()=>f.transport.setSpeed(0));
});
