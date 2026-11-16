import {drawMorphology} from '/packages/hylon-visuals/morphology.js';
import {validLiveFrame} from '/packages/hylon-visuals/live-frame.js';
import {createGarden} from '/garden.js';
const canvas=document.querySelector('canvas'),clock=document.querySelector('#clock'),status=document.querySelector('#status'),waiting=document.querySelector('#waiting'),idle=document.querySelector('#idle');
let frame,last=0,connected=false,socket,retry,live=false;
// Two views of the same frame: JARDÍN (garden.js, default) and ESQUEMA (the morphology drawing).
const garden=createGarden(canvas,{onRelease:charge=>{if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'gesture',kind:'release',charge}));}}),viewButton=document.querySelector('#view-mode');
let view='garden';try{if(localStorage.getItem('apomixis-view')==='schema')view='schema';}catch{}
function render(){if(frame&&view==='schema')drawMorphology(canvas,frame);}
function applyView(){viewButton.textContent=view==='garden'?'JARDÍN':'ESQUEMA';viewButton.setAttribute('aria-label',`Vista: ${viewButton.textContent} · tocar para cambiar`);garden.setActive(live&&view==='garden');render();}
viewButton.onclick=()=>{view=view==='garden'?'schema':'garden';try{localStorage.setItem('apomixis-view',view);}catch{}applyView();};
const lyric=document.querySelector('#lyric'),lyricNow=document.querySelector('#lyric-now'),lyricPrev=document.querySelector('#lyric-prev');
function renderLyric(live){const l=live?frame?.lyric:null;lyric.hidden=!l?.now&&!l?.prev;lyricNow.textContent=l?.now||'';lyricPrev.textContent=l?.prev||'';}
new ResizeObserver(render).observe(canvas);
function refresh(){
  live=connected&&Date.now()-last<2500;const wasIdle=!idle.hidden;garden.setActive(live&&view==='garden');
  status.dataset.live=String(live);status.title=live?(frame?.running?'Live':'Hold'):'Not broadcasting';status.setAttribute('aria-label',status.title);
  idle.hidden=live;canvas.hidden=!live;renderLyric(live);
  waiting.textContent=frame?'Transmisión interrumpida · en espera':'En espera de transmisión';
  if(live&&wasIdle)render();
}
function connect(){clearTimeout(retry);socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/live/view`);socket.onmessage=event=>{try{const data=JSON.parse(event.data);if(data.type==='offline'){connected=false;refresh();return;}if(!validLiveFrame(data))return;frame=data;last=Date.now();connected=true;garden.update(frame);document.querySelector('#piece').textContent=frame.title;const sec=Math.floor(frame.time);clock.textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;render();refresh();}catch{}};socket.onclose=()=>{connected=false;refresh();retry=setTimeout(connect,2000);};socket.onerror=()=>socket.close();}
setInterval(refresh,500);connect();applyView();
document.querySelector('#fullscreen').onclick=async()=>{const root=document.documentElement;try{if(document.fullscreenElement)await document.exitFullscreen();else if(root.requestFullscreen)await root.requestFullscreen();else if(root.webkitRequestFullscreen)root.webkitRequestFullscreen();else document.querySelector('dialog').showModal();}catch{document.querySelector('dialog').showModal();}};
document.querySelector('#close-help').onclick=()=>document.querySelector('dialog').close();
