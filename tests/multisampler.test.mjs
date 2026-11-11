import test from 'node:test';
import assert from 'node:assert/strict';
import { createKlaisSampler, ROOT_CONVENTION } from '../packages/glip-klais/engine.js';
import { validateManifest,nearestSample,isSafeSampleUrl } from '../packages/glip-klais/manifest.js';
import { createDecodedCache } from '../packages/glip-klais/cache.js';

const sample = (id,rootMidi,registrationId='bank') => ({id,registrationId,url:`audio/${id}%23.wav.ogg`,hash:'a'.repeat(64),bytes:40,rootMidi,channels:2,sampleRate:44100,duration:1,loop:null});
const fixture = () => ({schemaVersion:1,instrumentId:'klais',version:'0.1.0',rootConvention:ROOT_CONVENTION,registrations:[{id:'bank',label:'Recorded combination',kind:'recorded-combination',division:'unknown',samples:['c','e','unmapped']}],samples:[sample('c',60),sample('e',64),sample('unmapped',null)]});
const audioBuffer = (length=10) => ({length,numberOfChannels:2,duration:length/44100});
const deferred = () => { let resolve,reject; const promise = new Promise((r,j) => {resolve=r;reject=j;});return {promise,resolve,reject}; };
const tick = () => new Promise(resolve => setImmediate(resolve));
function audio() {
  const sources = [],gains = [];
  const context = {currentTime:1,createBufferSource() {
    const source = {playbackRate:{value:1},stopTimes:[],connect(){},disconnect(){},start(){this.started=true;},stop(time){this.stopTimes.push(time);}};
    sources.push(source);return source;
  },createGain() {
    const gain = {gain:{value:0,ramps:[],cancelScheduledValues(){},setValueAtTime(){},linearRampToValueAtTime(value,time){this.ramps.push([value,time]);}},connect(){},disconnect(){}};
    gains.push(gain);return gain;
  }};
  return {context,sources,gains};
}
function setup(overrides={}) {
  const a = audio(), loads=[];
  const player = createKlaisSampler({context:a.context,destination:{},manifest:fixture(),loadSample:async s=>{loads.push(s.id);return audioBuffer();},...overrides});
  player.setRegistrations(['bank']);
  return {...a,player,loads};
}

test('minimal fixture is detached and validates encoded sharps, identity and zones', () => {
  const raw=fixture(), accepted=validateManifest(raw); raw.samples[0].rootMidi=12;
  assert.equal(accepted.samples[0].rootMidi,60);
  assert.equal(isSafeSampleUrl('audio/folder/a%23.wav.ogg'),true);
  for(const url of ['../x','audio/%2e%2e/x','/absolute','https://x/a','//host/x','audio/a%2Fb','audio/%252e%252e/x','audio/x?q=1','audio/x#frag']) assert.equal(isSafeSampleUrl(url),false,url);
  for(const mutate of [m=>m.schemaVersion=2,m=>m.samples[0].bytes=Infinity,m=>m.samples[0].hash='x',m=>m.samples[0].rootMidi=128,m=>m.registrations[0].samples.push('unknown'),m=>m.samples[0].keyLow=80,m=>m.samples[0].registrationId='other',m=>m.samples[0].loop={approved:true,start:1,end:0}]) {
    const m=fixture();mutate(m);assert.throws(()=>validateManifest(m));
  }
});

test('nearest roots use lower-root tie then stable ID, skip unmapped and obey zones/stretch', () => {
  const m=fixture();
  assert.equal(nearestSample(m.samples,62,100,6).id,'c');
  assert.equal(nearestSample(m.samples,71,100,6),null);
  assert.equal(nearestSample([{...sample('z',60),keyLow:61,keyHigh:70},sample('a',60)],60,100).id,'a');
  assert.equal(nearestSample([{...sample('x',60),velocityLow:1,velocityHigh:70}],60,100),null);
  assert.equal(nearestSample([sample('z',60),sample('a',60)],60,100).id,'a');
});

test('layered registrations transpose consistently and normalize gain by square root', async () => {
  const m=fixture();m.registrations.push({id:'second',label:'Second combination',samples:['other']});m.samples.push(sample('other',60,'second'));
  const {player,sources,gains}=setup({manifest:m});player.setRegistrations(['bank','second']);
  player.setOptions({gain:0.5,transpose:12,maxStretch:24});
  const result=await player.noteOn('owner',60,127,2);
  assert.equal(result.played,2);assert.equal(sources[0].playbackRate.value,2**(8/12));assert.equal(sources[1].playbackRate.value,2);
  assert.equal(gains[0].gain.ramps[0][0],0.5/Math.sqrt(2));
  assert.equal(sources[0].loop,false);assert.equal(sources[0].stopTimes[0],31);
  player.noteOff('owner');assert.ok(Math.abs(sources[0].stopTimes.at(-1)-1.205)<1e-10);
  sources.forEach(s=>s.onended());assert.equal(player.getStats().voices,0);
});

test('pending noteOff, stop, option change and registration change cannot produce late voices', async () => {
  for(const cancel of [p=>p.noteOff('owner'),p=>p.stop(),p=>p.setOptions({transpose:1}),p=>p.setRegistrations([]),p=>p.dispose()]) {
    const wait=deferred(),{player,sources}=setup({loadSample:()=>wait.promise});
    const pending=player.noteOn('owner',60);await tick();cancel(player);wait.resolve(audioBuffer());
    assert.equal((await pending).cancelled,true);assert.equal(sources.length,0);assert.equal(player.getStats().pending,0);
  }
});

test('same-owner retrigger cancels its pending predecessor without cancelling new request', async () => {
  const wait=deferred(),{player,sources}=setup({loadSample:()=>wait.promise});
  const a=player.noteOn('owner',60),b=player.noteOn('owner',60);await tick();wait.resolve(audioBuffer());
  assert.equal((await a).cancelled,true);assert.equal((await b).played,1);assert.equal(sources.length,1);
});

test('cache deduplicates inflight loads, pins active buffers, LRU evicts only unpinned entries', async () => {
  let loads=0;const wait=deferred();
  const cache=createDecodedCache({maxBytes:160,loadSample:async s=>{loads++;return s.id==='a'?wait.promise:audioBuffer();}});
  const a=cache.acquire({id:'a'}),b=cache.acquire({id:'a'});await tick();assert.equal(loads,1);wait.resolve(audioBuffer());
  const [x,y]=await Promise.all([a,b]);assert.equal(cache.stats().decodedBytes,80);assert.equal(cache.stats().pinnedEntries,1);
  const c=await cache.acquire({id:'c'});c.release();
  const d=await cache.acquire({id:'d'});assert.equal(cache.has('a'),true);assert.equal(cache.has('c'),false);d.release();
  x.release();y.release();const e=await cache.acquire({id:'e'});assert.equal(cache.has('a'),true); // most recently released buffer
  e.release();cache.dispose();assert.equal(cache.stats().decodedBytes,0);
});

test('cache refuses over-budget pinned load and retries transient failed loads', async () => {
  let fail=true;
  const cache=createDecodedCache({maxBytes:80,loadSample:async s=>{if(s.id==='bad'&&fail)throw Error('temporary');return audioBuffer();}});
  await assert.rejects(cache.acquire({id:'bad'}),/temporary/);fail=false;
  const lease=await cache.acquire({id:'bad'});
  await assert.rejects(cache.acquire({id:'other'}),/pinned/);assert.equal(cache.stats().decodedBytes,80);
  lease.release();await tick();const other=await cache.acquire({id:'other'});other.release();assert.equal(cache.has('bad'),false);
});

test('prepare reports failures/cached entries and keeps cache bounded across the bank', async () => {
  const {player}=setup({maxBytes:80,loadSample:async s=>{if(s.id==='e')throw Error('bad file');return audioBuffer();}});
  const result=await player.prepare(['bank']);assert.equal(result.requested,3);assert.equal(result.loaded,2);assert.equal(result.failed,1);assert.equal(result.errors[0].sampleId,'e');
  assert.equal(player.getStats().decodedBytes,80);
});

test('voice cap includes release tails and stop shortens tails before cleanup', async () => {
  const {player,sources}=setup({maxVoices:2});
  assert.equal((await player.noteOn('a',60)).played,1);assert.equal((await player.noteOn('b',60)).played,1);
  player.noteOff('a');assert.equal((await player.noteOn('c',60)).played,0);
  sources[0].onended();assert.equal((await player.noteOn('c',60)).played,1);
  player.stop();assert.ok(Math.abs(sources[1].stopTimes.at(-1)-1.01)<1e-10);assert.ok(Math.abs(sources[2].stopTimes.at(-1)-1.01)<1e-10);
  sources.slice(1).forEach(s=>s.onended());assert.equal(player.getStats().voices,0);
});

test('loop requires both approved markers and explicit opt-in; invalid controls fail', async () => {
  const m=fixture();m.samples[0].duration=1;m.samples[0].loop={approved:false,start:0,end:0.5};
  const {player,sources}=setup({manifest:m,loadSample:async()=>({length:44100,numberOfChannels:2,duration:1})});
  player.setOptions({loopEnabled:true});await player.noteOn('a',60);assert.equal(sources[0].loop,false);
  for(const next of [{gain:NaN},{transpose:1.5},{maxStretch:25},{release:0},{loopEnabled:'yes'}]) assert.throws(()=>player.setOptions(next));
  await assert.rejects(player.noteOn('x',60,128));await assert.rejects(player.noteOn('x',60,100,0));
  const good=fixture();good.samples[0].loop={approved:true,start:0.1,end:0.8};
  const b=setup({manifest:good,loadSample:async()=>({length:44100,numberOfChannels:2,duration:1})});
  await b.player.noteOn('a',60);assert.equal(b.sources[0].loop,false);b.player.setOptions({loopEnabled:true});
  await b.player.noteOn('b',60);assert.equal(b.sources[1].loop,true);assert.equal(b.sources[1].loopStart,0.1);
});

test('prepare has no sound side effects and stops its prefetch chain when cancelled', async () => {
  const wait=deferred(),loaded=[];
  const {player,sources}=setup({loadSample:async s=>{loaded.push(s.id);return wait.promise;}});
  const preparing=player.prepare(['bank']);await tick();player.stop();wait.resolve(audioBuffer());
  const result=await preparing;assert.equal(result.cancelled,true);assert.equal(result.loaded,1);
  assert.deepEqual(loaded,['c']);assert.equal(sources.length,0);
});

test('unmapped source can be explicitly auditioned at original speed without creating a root mapping', async () => {
  const {player,sources}=setup();player.setOptions({transpose:24});
  const result=await player.auditionSample('preview','unmapped',90);
  assert.equal(result.played,1);assert.equal(sources[0].playbackRate.value,1);
  player.noteOff('preview');sources[0].onended();
  await assert.rejects(player.auditionSample('x','missing'),/Unknown/);
  const wait=deferred(),b=setup({loadSample:()=>wait.promise});
  const pending=b.player.auditionSample('preview','unmapped');await tick();b.player.stop();wait.resolve(audioBuffer());
  assert.equal((await pending).cancelled,true);assert.equal(b.sources.length,0);
});

test('cache loader concurrency is at most two and disposed queued loads do not run', async () => {
  let running=0,peak=0,loaded=0;const waits=[];
  const cache=createDecodedCache({maxBytes:800,loadSample:async()=>{running++;loaded++;peak=Math.max(peak,running);const d=deferred();waits.push(d);const b=await d.promise;running--;return b;}});
  const requests=[1,2,3,4].map(id=>cache.acquire({id:String(id)}).then(l=>{l.release();return 'loaded';},()=> 'cancelled'));
  await tick();assert.equal(loaded,2);assert.equal(peak,2);
  cache.dispose();waits.forEach(d=>d.resolve(audioBuffer()));
  assert.deepEqual(await Promise.all(requests),['cancelled','cancelled','cancelled','cancelled']);
  assert.equal(loaded,2);assert.equal(cache.stats().decodedBytes,0);
});

test('dispose unpins and disconnects active sources even when audio time never advances', async () => {
  const {player}=setup();await player.noteOn('a',60);assert.equal(player.getStats().pinnedEntries,1);
  player.dispose();assert.equal(player.getStats().voices,0);assert.equal(player.getStats().decodedBytes,0);
  assert.equal((await player.noteOn('b',60)).cancelled,true);
});
