import {mountMidiOut} from './midi-out.js';import {mountSpore} from './spore-pod.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(value,message)=>{if(!value)throw new Error(message);};
document.querySelector('#run').onclick=async()=>{
 const result=document.querySelector('#result'),midiRoot=document.querySelector('#fake-midi'),root=document.querySelector('#fake-spore');
 let spore,midi,audioCalls=0;const messages=[];result.textContent='Running…';
 const port={id:'MOCK ONLY',name:'MOCK ONLY / never hardware',state:'connected',open:async()=>{},close:async()=>{},send:bytes=>messages.push([...bytes])};
 try{
  midi=mountMidiOut(midiRoot,{onRouteChange:()=>spore?.pause('mock-route')});
  spore=mountSpore(root,{midiOut:midi,audio:{context:null,ensure(){audioCalls++;throw new Error('Local audio was invoked in MIDI mode');},destination(){throw new Error('Unexpected audio destination');}}});
  for(let i=0;i<100&&!root.querySelector('[data-score-status]').textContent.startsWith('ACTIVE');i++)await sleep(10);
  midi.select(port);assert(midi.summary().mapping.go===1&&midi.summary().mapping.pe===5,'Fixed Klais manual/pedal map');
  midiRoot.querySelector('[data-enable]').click();await sleep(20);assert(midi.summary().armed,'Mock output enable');
  root.querySelector('[data-output="midi"]').click();root.querySelector('[data-play]').click();await sleep(350);
  assert(messages.some(b=>b[0]===0x90),'SPORE must actually send on fixed channel 1');assert(audioCalls===0,'MIDI mode must not initialize local audio');
  spore.pause('mock-stop');assert(midi.summary().active===0&&midi.summary().queued===0,'Stop must release/cancel all SPORE notes');
  const count=messages.length;await sleep(150);assert(messages.length===count,'No delayed notes after stop');
  midi.panic();assert(messages.filter(b=>(b[0]&240)===176).length===32,'Panic must send CC123/120 for all channels');assert(midi.summary().armed===false,'Panic must disarm');
  result.textContent='PASS mapped SPORE events reached mock MIDI channel 1 (Manual I)\nPASS local audio/sampler initialization count = 0\nPASS stop cancels future notes and releases held notes\nPASS explicit SUPER PANIC sends CC123/120 and disarms\n4/4 PASS';
 }catch(error){result.textContent='FAIL: '+error.message;}finally{spore?.dispose();midi?.dispose();}
};
