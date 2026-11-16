// Development-only integration harness; all device APIs and persistence are isolated.
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const assert = (value, message) => { if (!value) throw new Error(message); };
const wait = async predicate => { for(let i=0;i<150;i++){if(predicate())return;await sleep(10);}throw new Error('Timed out'); };
document.querySelector('#run-check').onclick = async () => {
  const result = document.querySelector('#check-result'), passed = [], notes = [], contexts = [], usbCalls = [];
  result.textContent='Running mocked devices…'; document.querySelector('#run-check').disabled=true;
  try {
    const restoreOnly=new URLSearchParams(location.search).has('restore');
    const settings = new Map(restoreOnly?[['hylon-io-devices-v1',JSON.stringify({midiInput:'other',midiOutput:'other-out',audioInput:'input-test',audioOutput:'output-test'})]]:[]); Object.defineProperty(window,'localStorage',{value:{getItem:key=>settings.get(key)||null,setItem:(key,value)=>settings.set(key,value)}});
    Object.defineProperty(navigator,'locks',{value:undefined});
    const port = (id,name) => ({id,name,state:'connected',async open(){},async close(){},send(bytes){notes.push({bytes:[...bytes],time:performance.now()});}});
    let permissionGate=null;
    const input=port('usb-in','USB MIDI Device'), output=port('usb-out','USB MIDI Device');
    Object.defineProperty(navigator,'requestMIDIAccess',{value:async()=>{if(permissionGate)await permissionGate;return({sysexEnabled:true,inputs:new Map([['other',port('other','Wrong device')],['usb-in',input]]),outputs:new Map([['other-out',port('other-out','Wrong device')],['usb-out',output]])});}});
    const param=()=>({value:0,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){},cancelScheduledValues(){}});
    class Node {
      constructor(){this.gain=param();this.frequency=param();this.Q=param();this.delayTime=param();this.threshold=param();this.knee=param();this.ratio=param();this.attack=param();this.release=param();this.connections=[];}
      connect(destination,output=0,input=0){this.connections.push({destination,output,input});return destination;}
      disconnect(){} start(time){this.startTime=time;} stop(time){this.stopTime=time;} getFloatTimeDomainData(data){data.fill(.01);}
    }
    class Context {
      constructor(){this.state='running';this.currentTime=0;this.sampleRate=1000;this.destination=new Node();this.nodes=[];contexts.push(this);}
      node(){const node=new Node();this.nodes.push(node);return node;}
      createGain(){return this.node();} createAnalyser(){return this.node();} createOscillator(){return this.node();} createChannelMerger(){return this.node();} createChannelSplitter(){return this.node();} createMediaStreamSource(){return this.node();} createDynamicsCompressor(){return this.node();} createConvolver(){return this.node();} createDelay(){return this.node();} createBiquadFilter(){return this.node();} createWaveShaper(){return this.node();}
      createBuffer(channels,length){return{getChannelData:()=>new Float32Array(length)};}
      async setSinkId(id){this.sinkId=id;}async resume(){this.state='running';}async suspend(){this.state='suspended';}
    }
    window.AudioContext=Context;
    Object.defineProperty(navigator,'mediaDevices',{value:{async enumerateDevices(){return[{kind:'audioinput',deviceId:'input-test',label:'Test Input'},{kind:'audiooutput',deviceId:'output-test',label:'Test Output'}];},addEventListener(){},async getUserMedia(){return{getAudioTracks:()=>[{getSettings:()=>({channelCount:2,sampleRate:1000}),addEventListener(){}}],getTracks:()=>[{stop(){}}]};}}});
    const device={vendorId:0x1209,productId:0xe500,configuration:null,async open(){this.opened=true;},async close(){this.opened=false;},async selectConfiguration(){this.configuration={interfaces:[{interfaceNumber:0,alternate:{endpoints:[{endpointNumber:6,type:'interrupt',direction:'out'},{endpointNumber:3,type:'interrupt',direction:'in'},{endpointNumber:2,type:'bulk',direction:'out'}]}}]};},async claimInterface(){},async selectAlternateInterface(){},async transferOut(ep,data){usbCalls.push({ep,bytes:[...data],time:performance.now()});return{status:'ok',bytesWritten:data.length};},async transferIn(){return{status:'ok',data:new DataView(new Uint8Array([0x83,1]).buffer)};}};
    Object.defineProperty(navigator,'usb',{value:{async requestDevice(){return device;},addEventListener(){},removeEventListener(){}}});
    const html=await(await fetch('./index.html')).text(),doc=new DOMParser().parseFromString(html,'text/html');
    const app=document.querySelector('#app-check');for(const child of [...doc.body.children])if(child.tagName!=='SCRIPT')app.append(document.importNode(child,true));
    await import('./main.js');
    const q=s=>app.querySelector(s),click=(s,shiftKey=false)=>q(s).dispatchEvent(new MouseEvent('click',{bubbles:true,shiftKey}));
    await wait(()=>q('#midi-input').value);
    assert(notes.length===0&&contexts.length===0&&!input.onmidimessage,'Reload enumeration must keep processes off');
    if(restoreOnly){assert(q('#midi-input').value==='other'&&q('#midi-output').value==='other-out','Restore last MIDI selections');assert(q('#audio-input').value==='input-test'&&q('#audio-output').value==='output-test','Restore last audio selections');result.textContent='PASS reload restores all four device choices while processes stay OFF\n1/1 PASS';return;}
    q('#audio-output [title="Test Output"]').click();await wait(()=>JSON.parse(settings.get('hylon-io-devices-v1')).audioOutput==='output-test');assert(contexts.length===0,'Selecting output while OFF must not start audio');
    click('#command-midi');await wait(()=>q('#midi-input').value==='usb-in'&&q('[data-state]').textContent.startsWith('ON'));
    assert(q('#midi-output').value==='usb-out','Exact preferred MIDI output');assert(!app.textContent.includes('ENABLE NOTE OUT'),'No duplicate MIDI enable');q('#midi-output [title="Wrong device"]').click();await wait(()=>q('[data-state]').textContent.includes('Wrong device'));q('#midi-output [title="USB MIDI Device"]').click();await wait(()=>q('[data-state]').textContent.includes('USB MIDI Device'));passed.push('PASS preferred USB MIDI IN/OUT and one-click device buttons');
    input.onmidimessage({data:[0x90,60,25]});const soft=Number(q('#command-midi').style.getPropertyValue('--midi-rx'));input.onmidimessage({data:[0x90,60,127]});assert(Number(q('#command-midi').style.getPropertyValue('--midi-rx'))>soft&&q('#command-midi').classList.contains('midi-receiving'),'Velocity grades input pulse');
    click('#command-midi',true);await sleep(1500);
    const ons=notes.filter(n=>(n.bytes[0]&0xf0)===0x90),offs=notes.filter(n=>(n.bytes[0]&0xf0)===0x80);
    assert(ons.length===5&&offs.length===5,'Five finite test notes');assert(ons.every((n,i)=>n.bytes[0]===0x90+i&&n.bytes[1]===60),'Channels 1–5 / note 60');
    assert(ons.slice(1).every((n,i)=>Math.abs(n.time-ons[i].time-300)<90),'300 ms note spacing');assert(offs.every((n,i)=>Math.abs(n.time-ons[i].time-100)<80),'100 ms durations');passed.push('PASS Shift+M exact sequence and note-offs');
    click('#command-midi',true);await sleep(40);click('#command-midi');const stoppedCount=notes.length;await sleep(400);assert(notes.length===stoppedCount,'MIDI OFF cancels pending tests');passed.push('PASS MIDI OFF cancels sequence');
    click('#command-audio');await wait(()=>q('#audio-toggle').textContent==='AUDIO OFF');assert(q('#audio-monitor').checked===false,'Mic begins muted');assert(contexts[0].sinkId==='output-test','Remembered output applies when audio starts');
    click('#command-audio',true);await sleep(30);const tones=contexts[0].nodes.filter(n=>n.startTime===.02||n.startTime===.52);assert(tones.length===2&&tones[0].stopTime===.52&&tones[1].stopTime===1.02,'L/R finite scheduled tones');
    click('#command-audio');await wait(()=>contexts[0].state==='suspended');passed.push('PASS shared audio toggle and finite L/R test');
    click('#command-laser');await wait(()=>usbCalls.filter(c=>c.ep===2).length>=2);const testFrom=usbCalls.length;
    click('#command-laser',true);await wait(()=>usbCalls.slice(testFrom).filter(c=>c.ep===2).length>=2);await sleep(1150);
    assert(!q('#command-laser').classList.contains('active'),'Laser test ends OFF');const count=usbCalls.filter(c=>c.ep===2).length;await sleep(80);assert(usbCalls.filter(c=>c.ep===2).length===count,'No frames after timed test');
    const frame=usbCalls.slice(testFrom).find(c=>c.ep===2&&c.bytes.slice(0,-5).some((v,i)=>i%7===4&&v>0));assert(frame,'Lit test frame');const coords=[];for(let i=0;i<frame.bytes.length-5;i+=7)coords.push([frame.bytes[i]*16+(frame.bytes[i+1]>>4),((frame.bytes[i+1]&15)<<8)+frame.bytes[i+2]]);
    assert([0,1].every(axis=>Math.min(...coords.map(p=>p[axis]))===0&&Math.max(...coords.map(p=>p[axis]))===4095),'Full-field test');click('[data-panel="laser"]');assert(q('[data-size]').value==='20','Transient full field does not overwrite size');passed.push('PASS laser ON → full-field one-second test → automatic blackout');
    const beforeRestart=usbCalls.filter(c=>c.ep===2).length;click('#command-laser');await wait(()=>usbCalls.filter(c=>c.ep===2).length>beforeRestart+1);click('#command-laser',true);click('#stop-all');await sleep(250);const afterStop=usbCalls.filter(c=>c.ep===2).length;await sleep(100);assert(usbCalls.filter(c=>c.ep===2).length===afterStop,'STOP ALL cancels pending laser replacement');passed.push('PASS pending laser test cannot restart after STOP ALL');
    let releasePermission;permissionGate=new Promise(resolve=>{releasePermission=resolve;});click('#command-midi');click('#stop-all');releasePermission();await sleep(150);click('[data-panel="config"]');assert(!q('[data-state]').textContent.startsWith('ON'),'Late MIDI permission cannot re-enable output');passed.push('PASS late MIDI permission cannot bypass STOP ALL');
    click('[data-panel="config"]');result.textContent=passed.join('\n')+'\n7/7 PASS';
  } catch(error){result.textContent=passed.join('\n')+'\nFAIL: '+error.message;}
};
