// Store layout plus view state omitted by Dockview serialization. Slots are width-independent.
export function createWorkspaceStore({dock,storage,titles,width=()=>innerWidth}){
 const key=n=>`hylon-workspace-slot-${n}`;
 function read(n){
  const mode=width()<760?'mobile':'desktop',other=mode==='mobile'?'desktop':'mobile';
  for(const name of [key(n),`hylon-workspace-${n}-${mode}`,`hylon-workspace-${n}-${other}`]){const raw=storage.getItem(name);if(!raw)continue;const saved=JSON.parse(raw);return saved.version===2?saved:{version:2,layout:saved,activePanel:null,maximizedPanel:null};}return null;
 }
 function snapshot(){const active=dock.activePanel;return {version:2,layout:dock.toJSON(),activePanel:active?.id||null,maximizedPanel:active?.api.isMaximized()?active.id:null};}
 function restore(saved){
  if(!saved?.layout?.grid||!saved.layout.panels||Object.keys(saved.layout.panels).some(id=>!Object.hasOwn(titles,id)))throw new Error('Invalid workspace layout');
  if(dock.activePanel?.api.isMaximized())dock.activePanel.api.exitMaximized();
  dock.fromJSON(saved.layout,{reuseExistingPanels:true});
  for(const panel of dock.panels)if(titles[panel.id])panel.api.setTitle(titles[panel.id]);
  if(saved.activePanel)dock.getPanel(saved.activePanel)?.api.setActive();
  if(saved.maximizedPanel)dock.getPanel(saved.maximizedPanel)?.api.maximize();
 }
 return {stored:n=>!!read(n),save(n){if(![1,2,3,4].includes(n))throw new Error('Workspace must be 1–4');const saved=snapshot();storage.setItem(key(n),JSON.stringify(saved));return saved;},recall(n){const saved=read(n);if(!saved)return false;const previous=snapshot();try{restore(saved);}catch(error){try{restore(previous);}catch{}throw error;}return true;}};
}
