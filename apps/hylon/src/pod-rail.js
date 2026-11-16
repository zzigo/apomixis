const paths={
 capture:'<path d="M5 4H3v5m16-5h2v5M3 15v5h5m13-5v5h-5"/><circle cx="12" cy="12" r="4"/>',
 config:'<path d="M3 7h18M3 17h18M8 4v6m8 4v6"/>',
 sampler:'<path d="M3 5h18v14H3zM7 5v14m5-14v14m5-14v14M6 5v7m5-7v7m5-7v7"/>',
 laser:'<path d="m4 20 8-16 8 16ZM12 4v16M4 20h16"/>',
 audio:'<path d="M5 3v18m7-18v18m7-18v18M2 9h6m1 7h6m1-10h6"/>',
 spore:'<circle cx="12" cy="12" r="3"/><circle cx="5" cy="5" r="2"/><circle cx="19" cy="8" r="2"/><circle cx="7" cy="20" r="2"/><path d="m7 7 3 3m5 1 2-2m-6 6-3 3"/>',
 monitor:'<path d="M2 16h4l3-10 5 14 3-10h5"/>',
 registers:'<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><path d="M10 6h4m-4 12h4"/>',
 notation:'<path d="M3 6h18M3 10h18M3 14h18M3 18h18M15 4v11"/><ellipse cx="12" cy="16" rx="3" ry="2"/>',
 score:'<path d="M6 2h9l4 4v16H6zM10 9h5m-5 4h5m-5 4h5"/>',
 library:'<path d="M3 4h5v16H3zm7 0h4v16h-4zm7 0 4 1-2 15-4-1z"/>',
 lyrics:'<path d="M4 6h10M4 11h16M4 16h7"/><path d="M15 16l2 3 3-6"/>',
 attack:'<path d="M3 20V4l5 16V8l5 12v-8l5 8v-4"/>',
 impro:'<path d="M3 18V6m5 12V9m5 9v-6m5 6v-3"/><path d="M3 6c6 0 12 3 18 9" stroke-dasharray="2 2"/>',
 modal:'<path d="M3 5h18v14H3zM3 9h18m-5 2v6m-3-3h6"/>',
 reset:'<path d="M4 10a8 8 0 1 1 2 8M4 4v6h6"/>'
};
const icon=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const TYPE='application/x-hylon-pod';
export function mountPodRail({dock,titles,activate,workspace,workspaceState,notify}){
 const rail=document.querySelector('.pod-rail'),podButtons=[...rail.querySelectorAll('[data-panel]')];let dragging=null,suppressClickUntil=0;
 const allowed=event=>[...event.dataTransfer?.types||[]].includes(TYPE);
 const editable=()=>document.getElementById('workspace').inert;
 function sync(){for(const button of podButtons){const panel=dock.getPanel(button.dataset.panel);button.classList.toggle('active',dock.activePanel?.id===button.dataset.panel);button.classList.toggle('present',!!panel);button.setAttribute('aria-pressed',String(dock.activePanel?.id===button.dataset.panel));}
  for(const button of rail.querySelectorAll('[data-workspace]')){const number=Number(button.dataset.workspace),state=workspaceState(number);button.classList.toggle('active',state.active);button.classList.toggle('stored',state.stored);button.setAttribute('aria-pressed',String(state.active));button.title=`Workspace ${number} · click to recall · Shift+click to save${state.stored?'':' · empty'}`;}
 }
 for(const button of podButtons){const id=button.dataset.panel;button.innerHTML=icon(id);button.title=`${titles[id]} · click to open · drag to dock`;button.setAttribute('aria-label',titles[id]);button.draggable=true;
  button.onclick=()=>{if(editable()||Date.now()<suppressClickUntil)return;activate(id);sync();};
  button.ondragstart=event=>{if(editable()){event.preventDefault();return;}dragging=id;event.dataTransfer.setData(TYPE,id);event.dataTransfer.effectAllowed='move';if(dock.activePanel?.api.isMaximized())dock.activePanel.api.exitMaximized();button.classList.add('dragging');};
  button.ondragend=()=>{dragging=null;suppressClickUntil=Date.now()+200;button.classList.remove('dragging');sync();};
 }
 for(const button of rail.querySelectorAll('[data-workspace]'))button.onclick=event=>{event.preventDefault();if(editable()){notify('Workspace unavailable · use the active HYLON tab');return;}workspace(Number(button.dataset.workspace),event.shiftKey);sync();if(event.shiftKey){button.classList.remove('workspace-saved');void button.offsetWidth;button.classList.add('workspace-saved');}};
 document.getElementById('config-modal').innerHTML=icon('modal');document.getElementById('config-modal').title='I/O modal';document.getElementById('config-modal').setAttribute('aria-label','I/O modal');
 document.getElementById('reset-layout').innerHTML=icon('reset');document.getElementById('reset-layout').title='Reset pod layout';document.getElementById('reset-layout').setAttribute('aria-label','Reset pod layout');
 const subscriptions=[
  dock.onUnhandledDragOverEvent(event=>{if(!editable()&&allowed(event.nativeEvent))event.accept();}),
  dock.onDidDrop(event=>{
   if(editable()||!allowed(event.nativeEvent))return;
   const id=event.nativeEvent.dataTransfer.getData(TYPE)||dragging;if(!Object.hasOwn(titles,id))return;
   try{const panel=dock.getPanel(id),direction=event.position==='center'?'within':event.position;
    if(panel){if(event.group){if(panel.api.group!==event.group||event.position!=='center')panel.api.moveTo({group:event.group,position:event.position});}else if(direction!=='within'){const target=dock.addGroup({direction});panel.api.moveTo({group:target,position:'center'});}panel.api.setActive();}
    else{const position=event.group?{referenceGroup:event.group,direction}:direction==='within'?undefined:{direction};dock.addPanel({id,component:id,title:titles[id],...(position?{position}:{})});}
    sync();
   }catch(error){notify(`Docking: ${error.message}`);}
  }),
  dock.onDidActivePanelChange(sync),dock.onDidAddPanel(sync),dock.onDidRemovePanel(sync),dock.onDidLayoutChange(sync)
 ];
 sync();return {sync,dispose(){subscriptions.forEach(subscription=>subscription.dispose());for(const button of podButtons)button.onclick=button.ondragstart=button.ondragend=null;}};
}
