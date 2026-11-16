// Mirrors every hylon-* localStorage key to .local/hylon-settings.json through the dev server
// (tools/hylon-settings.mjs). Checks every 5 s, sends only when something changed, and once more
// when the page is hidden or closed. Restoring happens in index.html before the app loads.
const ENDPOINT='/__hylon/settings';
let last='',failed=false;
function snapshot(){const items={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k?.startsWith('hylon-'))items[k]=localStorage.getItem(k);}return JSON.stringify({version:1,items});}
async function push(notify){
  let body;try{body=snapshot();}catch{return;}if(body===last)return;
  try{const r=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body,keepalive:body.length<60000});if(!r.ok)throw new Error((await r.json().catch(()=>({}))).error||`HTTP ${r.status}`);last=body;failed=false;}
  catch(error){if(!failed)notify?.(`Settings not saved to disk: ${error.message}`);failed=true;}
}
export function startSettingsBackup({notify}={}){
  if(!/^https?:$/.test(location.protocol))return;
  const restored=globalThis.__hylonSettingsRestored;
  if(restored?.keys)notify?.(`Settings restored from disk: ${restored.keys} item(s) · saved ${restored.savedAt?new Date(restored.savedAt).toLocaleString():'?'}`);
  setTimeout(()=>push(notify),3000);setInterval(()=>push(notify),5000);
  const final=()=>{try{const body=snapshot();if(body!==last&&navigator.sendBeacon?.(ENDPOINT,new Blob([body],{type:'application/json'})))last=body;}catch{}};
  addEventListener('pagehide',final);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')final();});
}
