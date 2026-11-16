import './style.css';
import {defaultLaserProfile} from '../../../packages/hylon-laser/profile.js';
import {defaultOutputProfile} from '../../../packages/hylon-laser/frame.js';
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
  let saved=JSON.stringify({...defaultOutputProfile(defaultLaserProfile()),warpQuad:[[.15,.1],[.9,.05],[.8,.9],[.1,.8]]});
  pod=mountLaser(root,{usbApi,settingsStorage:{getItem(){return saved;},setItem(key,value){saved=value;}}});
  assert(root.querySelector('[data-size]').value==='20'&&root.querySelector('[data-power]').value==='5','Compact defaults');assert(!root.querySelector('details').open,'Advanced starts collapsed');
  assert(root.querySelector('[data-warp]').getAttribute('aria-pressed')==='false'&&root.querySelector('[data-map-handles]').hidden,'Warp starts OFF despite stored non-identity quad');
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
  const fieldBounds=frame=>{const points=[];for(let i=0;i<frame.bytes.length-5;i+=7)if(frame.bytes[i+6])points.push((frame.bytes[i]<<4)|(frame.bytes[i+1]>>4));return[Math.min(...points),Math.max(...points)];};
  const plain=fieldBounds(bulk().at(-1));assert(Math.abs(plain[0]-.35*4095)<2&&Math.abs(plain[1]-.65*4095)<2,'Stored warp is bypassed with OFF');
  click('warp');await sleep(40);assert(!root.querySelector('[data-map-outline]').hidden,'Dashed guide shown with warp');assert(getComputedStyle(root.querySelector('[data-map-outline] polygon')).strokeDasharray!=='none','Guide is dashed');
  const warped=fieldBounds(bulk().at(-1));assert(Math.abs(warped[0]-plain[0])>10,'Enabling warp changes projected coordinates');
  click('map-reset');await sleep(25);const corners=[...root.querySelectorAll('.map-corner')];assert(corners[0].style.left==='0%'&&corners[0].style.top==='0%'&&corners[2].style.left==='100%'&&corners[2].style.top==='100%','Default handles cover full W/H, independent of Size');
  click('warp');await sleep(20);passed.push('PASS stored warp bypassed on startup, live toggle, dashed full W/H guide');
  const change=(name,value,event='change')=>{const input=root.querySelector(`[data-${name}]`);input.value=value;input.dispatchEvent(new Event(event));};
  for(const [name,value] of [['shape','high'],['shape','low'],['shape','square'],['mode','sweep'],['direction','RL'],['mode','text'],['text','RGB'],['mode','midi']]){const count=bulk().length;change(name,value);await sleep(30);assert(bulk().length>count&&root.querySelector('[data-output]').disabled,`Live ${name}=${value}`);}
  assert(root.querySelector('[data-point-size]').value==='0','MIDI XY starts at minimum point size');pod.midi([0x90,60,127]);await sleep(30);assert(bulk().at(-1).bytes.slice(0,-5).some((v,i)=>i%7===6&&v>0),'Minimum MIDI point transfers lit moving geometry');change('point-size','80','input');await sleep(30);pod.midi([0x80,60,0]);
  passed.push('PASS pattern, geometry, direction, text and MIDI point size update without START');
  change('pps','18000','input');change('x','2','input');await sleep(35);
  assert(!root.querySelector('[data-apply]'),'No manual alignment apply step');assert(root.querySelector('[data-output]').disabled&&bulk().at(-1).bytes.at(-5)=== (18000&255),'Alignment/PPS applies automatically and live');
  click('defaults');await sleep(35);assert(root.querySelector('[data-output]').disabled,'Reset defaults keeps output running');passed.push('PASS scan/alignment and reset defaults apply without stopping');
  change('mode','frame');change('color-g','0','input');change('color-r','100','input');change('color-b','50','input');await sleep(35);
  const rgb=bulk().at(-1).bytes,lit=[];for(let i=0;i<rgb.length-5;i+=7)if(rgb[i+6])lit.push(rgb.slice(i+3,i+7));
  assert(lit.length&&lit.every(([r,g,b,i])=>r===i&&g===0&&b===Math.round(i*.5)),'RGB mix reaches actual frame bytes');passed.push('PASS live RGB mix reaches DAC frame channels');
  change('mode','text');const beforeInvalid=bulk().length;change('text','ü');await sleep(35);assert(root.querySelector('[data-text]').value==='RGB'&&bulk().length>beforeInvalid,'Invalid text rolls back while output continues');
  assert(calls.filter(c=>c.ep===6&&c.bytes[0]===2&&c.bytes[1]===1).length===1,'No extra shutter open / START during edits');passed.push('PASS invalid edits roll back and live updates never restart shutter');
  click('stop');const count=bulk().length;await sleep(70);assert(bulk().length===count,'Blackout must stop future transfers');assert(calls.some(c=>c.ep===6&&c.bytes[0]===2&&c.bytes[1]===0),'Close shutter');passed.push('PASS BLACKOUT cancels frame pump and requests shutter close / STOP');
  result.textContent=passed.join('\n')+'\n10/10 PASS';
 }catch(error){result.textContent=passed.join('\n')+'\nFAIL: '+error.message;}finally{pod?.dispose();}
};
