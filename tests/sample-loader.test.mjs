import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { createFetchLoader } from '../packages/glip-klais/loader.js';
const bytes=Uint8Array.from([1,2,3,4]);
const sample={url:'audio/C%234.ogg',bytes:4,hash:createHash('sha256').update(bytes).digest('hex'),channels:2,duration:1};
test('fetch loader resolves escaped paths and verifies byte/hash/channel/duration before returning decoded audio',async()=>{
 let fetched,decoded=0;
 const context={async decodeAudioData(){decoded++;return {numberOfChannels:2,duration:1};}};
 const load=createFetchLoader(context,'http://localhost:4173/instruments/klais/',{cryptoImpl:webcrypto,fetchImpl:async url=>{fetched=url;return new Response(bytes);}});
 await load(sample);assert.equal(fetched,'http://localhost:4173/instruments/klais/audio/C%234.ogg');assert.equal(decoded,1);
 await assert.rejects(load({...sample,hash:'0'.repeat(64)}),/checksum/);assert.equal(decoded,1);
 await assert.rejects(load({...sample,bytes:3}),/declared byte/);
 await assert.rejects(load({...sample,url:'../private.ogg'}),/Invalid/);
 await assert.rejects(load({...sample,url:'https://external.test/a.ogg'}),/Invalid/);
 await assert.rejects(load({...sample,channels:1}),/metadata/);
});
test('fetch failures, truncation and missing crypto never masquerade as decoded samples',async()=>{
 const context={async decodeAudioData(){throw new Error('must not decode');}};
 await assert.rejects(createFetchLoader(context,'http://localhost/bank/',{fetchImpl:async()=>new Response('',{status:404}),cryptoImpl:webcrypto})(sample),/unavailable/);
 await assert.rejects(createFetchLoader(context,'http://localhost/bank/',{fetchImpl:async()=>new Response(bytes.slice(0,2)),cryptoImpl:webcrypto})(sample),/length/);
 await assert.rejects(createFetchLoader(context,'http://localhost/bank/',{fetchImpl:async()=>new Response(bytes),cryptoImpl:{}})(sample),/secure/);
});
test('loader blocks redirects and oversized decoded estimates before allocating audio',async()=>{
 let fetched=0;
 const context={sampleRate:48000,async decodeAudioData(){throw new Error('must not decode');}};
 const load=createFetchLoader(context,'http://localhost/bank/',{cryptoImpl:webcrypto,fetchImpl:async(url,options)=>{fetched++;assert.equal(options.redirect,'error');const r=new Response(bytes);Object.defineProperty(r,'url',{value:'https://external.test/asset.ogg'});return r;}});
 await assert.rejects(load({...sample,duration:3600}),/memory budget/);assert.equal(fetched,0);
 await assert.rejects(load(sample),/redirect/);
});
test('stalled bodies time out and loader disposal aborts reads',async()=>{
 const context={async decodeAudioData(){throw new Error('must not decode');}};
 const never=async()=>new Response(new ReadableStream({start(){}}));
 await assert.rejects(createFetchLoader(context,'http://localhost/bank/',{fetchImpl:never,timeoutMs:10})(sample),/timed out/);
 const load=createFetchLoader(context,'http://localhost/bank/',{fetchImpl:never});const pending=load(sample);await Promise.resolve();load.dispose();await assert.rejects(pending,/disposed/);
 await assert.rejects(load(sample),/disposed/);
});
