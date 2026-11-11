import {mountLaser} from './laser.js';
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const assert=(value,message)=>{if(!value)throw new Error(message);};
document.querySelector('#run').onclick=async()=>{
 const result=document.querySelector('#result'),root=document.querySelector('#laser'),calls=[],passed=[];let pod;
 const device={vendorId:0x1209,productId:0xe500,opened:false,configuration:null,
  async open(){this.opened=true;},async close(){this.opened=false;},async selectConfiguration(){this.configuration={interfaces:[{interfaceNumber:0,alternate:{endpoints:[{endpointNumber:6,type:'interrupt',direction:'out'},{endpointNumber:3,type:'interrupt',direction:'in'},{endpointNumber:2,type:'bulk',direction:'out'}]}}]};},async claimInterface(){},async selectAlternateInterface(){},
  async transferOut(ep,bytes){calls.push({ep,bytes:[...bytes]});return{status:'ok',bytesWritten:bytes.length};},async transferIn(){return{status:'ok',data:new DataView(new Uint8Array([0x83,1]).buffer)};}
 };
 const usbApi={async requestDevice(){return device;},addEventListener(){},removeEventListener(){}};
 const click=key=>root.querySelector(`[data-${key}]`).click(),bulk=()=>calls.filter(c=>c.ep===2);
 result.textContent='Running…';
 try{
  pod=mountLaser(root,{usbApi,settingsStorage:{getItem(){return null;},setItem(){}}});
  assert(root.querySelector('[data-size]').value==='20'&&root.querySelector('[data-power]').value==='5','Compact defaults');assert(!root.querySelector('details').open,'Advanced starts collapsed');
  click('usb');await sleep(30);assert(device.opened&&bulk().length===0,'Connect alone must never transmit frames');passed.push('PASS compact defaults; connection opens USB but stays dark');
  click('preview');await sleep(50);assert(bulk().length===0,'Preview cannot transmit frames');passed.push('PASS PREVIEW ONLY does not send frames');
  click('stop');click('output');for(let i=0;i<100&&bulk().length<2;i++)await sleep(10);
  assert(bulk().length>=2,'START OUTPUT must transfer blank prime then lit frames');assert(bulk().every(c=>c.bytes.at(-1)===2),'Every frame must use SINGLE_MODE');
  assert(bulk()[0].bytes.slice(0,-5).every((value,i)=>i%7<3||value===0),'Prime must be blank');assert(calls.some(c=>c.ep===6&&c.bytes[0]===2&&c.bytes[1]===1),'Explicit output opens shutter');passed.push('PASS START OUTPUT primes blank, opens shutter and transfers one-shot frames');
  const beforeLive=bulk().length;
  root.querySelector('[data-power]').value='0';root.querySelector('[data-power]').dispatchEvent(new Event('input'));await sleep(35);
  root.querySelector('[data-size]').value='30';root.querySelector('[data-size]').dispatchEvent(new Event('input'));await sleep(35);
  root.querySelector('[data-power]').value='5';root.querySelector('[data-power]').dispatchEvent(new Event('input'));await sleep(35);
  assert(bulk().length>beforeLive,'Live sliders must keep transferring frames');assert(root.querySelector('[data-output]').disabled,'Output remains enabled during live sliders');
  passed.push('PASS intensity zero/recovery and size update live without START');
  click('stop');const count=bulk().length;await sleep(70);assert(bulk().length===count,'Blackout must stop future transfers');assert(calls.some(c=>c.ep===6&&c.bytes[0]===2&&c.bytes[1]===0),'Close shutter');passed.push('PASS BLACKOUT cancels frame pump and requests shutter close / STOP');
  result.textContent=passed.join('\n')+'\n5/5 PASS';
 }catch(error){result.textContent=passed.join('\n')+'\nFAIL: '+error.message;}finally{pod?.dispose();}
};
