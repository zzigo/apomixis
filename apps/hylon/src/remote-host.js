import { headerIcon } from './header-icons.js';
// Desktop bridge only. The iPad never instantiates the audio/MIDI/USB runtime.
export function mountRemoteHost({ getState, execute, notify = () => {} }) {
  const button=document.createElement('button');button.id='remote-control';button.innerHTML=headerIcon('remote');button.setAttribute('aria-label','Remote controller');button.title='Enable a paired LAN controller; device connections stay local';
  document.getElementById('fullscreen').after(button);
  const dialog=document.createElement('dialog');dialog.className='remote-dialog';
  dialog.innerHTML='<div class="dialog-head"><span>HYLON REMOTE</span><button data-close>CLOSE</button></div><div class="panel-body"><p data-status>Remote OFF</p><div data-links></div><p class="muted">Open this link in Safari on the iPad, on the same Wi-Fi. Keep HYLON open on the Mac. Transport, SPORE manual controls and MIXER share the Mac session.</p><button data-off class="danger">REMOTE OFF</button></div>';
  document.body.append(dialog);
  const q=key=>dialog.querySelector(`[data-${key}]`);
  let socket=null, timer=null, enabled=false, pending=false, disposed=false;
  async function post(path){const response=await fetch(`/__hylon_remote/${path}`,{method:'POST',credentials:'same-origin'});let data;try{data=await response.json();}catch{throw new Error('Remote requires the HYLON.command development server');}if(!response.ok)throw new Error(data.error||'Remote unavailable');return data;}
  function render(){button.classList.toggle('active',enabled);button.setAttribute('aria-pressed',String(enabled));button.disabled=pending;q('off').disabled=!enabled||pending;}
  function publish(){if(socket?.readyState===WebSocket.OPEN){try{socket.send(JSON.stringify({type:'state',state:getState()}));}catch{}}}
  async function disable(){pending=true;render();try{await post('disable');}catch(error){notify(error.message);}finally{socket?.close();clearInterval(timer);enabled=false;pending=false;q('status').textContent='Remote OFF';q('links').replaceChildren();render();}}
  button.onclick=async()=>{
    if(!dialog.open)dialog.showModal();
    if(enabled||pending)return;
    pending=true;render();
    try{
      const connection=await post('enable');
      if(disposed)return;
      q('links').replaceChildren();
      for(const link of connection.links){
        const row=document.createElement('div');row.className='remote-link';
        const input=document.createElement('input');input.readOnly=true;input.value=link;input.setAttribute('aria-label','iPad remote address');input.onclick=()=>input.select();
        const copy=document.createElement('button');copy.textContent='COPY';copy.onclick=async()=>{try{await navigator.clipboard.writeText(link);q('status').textContent='Address copied · paste into Safari on iPad';}catch{input.select();q('status').textContent='Select and copy this link';}};
        row.append(input,copy);q('links').append(row);
      }
      q('status').textContent=connection.links.length?'Connecting desktop bridge…':'No LAN address found · connect the Mac to Wi-Fi';
      const mine=new WebSocket(connection.hostUrl);socket=mine;
      mine.onopen=()=>{if(disposed||mine!==socket){mine.close();return;}enabled=true;q('status').textContent='Remote ON · persistent /remoto address';publish();timer=setInterval(publish,250);render();};
      mine.onmessage=async event=>{
        let command;try{command=JSON.parse(event.data);}catch{return;}
        if(command.type!=='command'||mine!==socket||!enabled)return;
        let error='';
        try{if(Date.now()>command.expiresAt)throw new Error('Expired command; not executed');await execute(command.action,command.value);}catch(reason){error=reason.message||String(reason);}
        if(mine.readyState===WebSocket.OPEN)mine.send(JSON.stringify({type:'result',id:command.id,ok:!error,error}));publish();
      };
      mine.onclose=()=>{if(mine!==socket)return;enabled=false;clearInterval(timer);q('status').textContent='Remote disconnected · enable again at the same address';q('links').replaceChildren();render();};
      mine.onerror=()=>{q('status').textContent='Remote connection failed · check port 4174 / local firewall';mine.close();};
    }catch(error){q('status').textContent=error.message;notify(error.message);}finally{pending=false;render();}
  };
  q('off').onclick=()=>void disable();q('close').onclick=()=>dialog.close();
  const close=()=>{clearInterval(timer);socket?.close();};window.addEventListener('pagehide',close);
  render();
  return {dispose(){disposed=true;close();window.removeEventListener('pagehide',close);button.remove();dialog.remove();}};
}
