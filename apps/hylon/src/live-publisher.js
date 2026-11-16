import { headerIcon } from './header-icons.js';
// The visual publisher drops frames while a request is pending; no musical scheduling dependencies.
export function mountLivePublisher({getFrame,notify=()=>{},onGestures=()=>{}}){
  const button=document.createElement('button');button.id='live-control';button.innerHTML=headerIcon('live');
  document.getElementById('remote-control').after(button);
  let enabled=false,pending=false,busy=false,lastStatus=0,revision=0,stopFailed=false,detail='';
  async function post(route,frame){const response=await fetch(`/__apomixis/${route}`,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:frame?JSON.stringify(frame):undefined,signal:AbortSignal.timeout(2000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'Live relay unavailable');return data;}
  function render(){
    const on=enabled||stopFailed;
    button.classList.toggle('active',on);button.disabled=pending;button.setAttribute('aria-pressed',String(on));
    button.setAttribute('aria-label',on?'Stop live morphology broadcast':'Start live morphology broadcast');
    button.title=stopFailed?`LIVE · stop failed · click to retry · ${detail}`:`LIVE ${enabled?'ON':'OFF'} · ${detail||(enabled?'Click to stop':'Click to broadcast morphology')}`;
  }
  button.onclick=async()=>{
    if(pending)return;const turnOff=enabled||stopFailed;pending=true;revision++;
    if(turnOff)enabled=false;detail=turnOff?'Stopping…':'Connecting…';render();
    try{const data=await post(turnOff?'stop':'start');enabled=!turnOff;stopFailed=false;detail=enabled?data.status:'';notify(enabled?`LIVE ON · ${data.status}`:'LIVE OFF');}
    catch(error){detail=error.message;stopFailed=turnOff;if(!turnOff){enabled=false;try{await post('stop');}catch{stopFailed=true;}}notify(`LIVE · ${error.message}`);}
    finally{pending=false;render();}
  };
  const timer=setInterval(async()=>{
    if(!enabled||pending||busy)return;busy=true;const mine=revision;
    try{const frame=getFrame();let data;if(frame)data=await post('frame',frame);else if(Date.now()-lastStatus>2000){lastStatus=Date.now();data=await post('status');}if(data&&mine===revision&&enabled){detail=data.status;render();if(Array.isArray(data.gestures)&&data.gestures.length)try{onGestures(data.gestures);}catch{}}}
    catch(error){if(mine===revision&&enabled){detail=`Signal interrupted · ${error.message}`;render();}}finally{busy=false;}
  },200);
  const stop=()=>{enabled=false;revision++;fetch('/__apomixis/stop',{method:'POST',keepalive:true}).catch(()=>{});};
  window.addEventListener('pagehide',stop);
  const dispose=()=>{clearInterval(timer);window.removeEventListener('pagehide',stop);stop();button.remove();};
  if(import.meta.hot)import.meta.hot.dispose(dispose);
  render();return {dispose};
}
