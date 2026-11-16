// LYRICS pod: the current `verse` of the playing score, accented, with the previous one muted
// above it. − / + change the font size (stored locally). Display only: no audio, MIDI or laser.
import './lyrics.css';
const STORAGE='hylon-lyrics-size-v1';
export function mountLyrics(container,{getLyrics=()=>null}={}){
 container.innerHTML='<div class="lyrics-pod empty"><div class="lyrics-tools"><output data-count></output><button data-smaller title="Smaller text" aria-label="Smaller text">−</button><button data-larger title="Larger text" aria-label="Larger text">+</button></div><div class="lyrics-prev" data-prev></div><div class="lyrics-now" data-now aria-live="polite"></div></div>';
 const root=container.firstElementChild,q=key=>root.querySelector(`[data-${key}]`);
 let size=28,shown='\u0000';try{const saved=Number(localStorage.getItem(STORAGE));if(saved>=10&&saved<=200)size=saved;}catch{}
 const resize=factor=>{size=Math.max(10,Math.min(200,Math.round(size*factor)));root.style.fontSize=`${size}px`;try{localStorage.setItem(STORAGE,String(size));}catch{}};
 q('smaller').onclick=()=>resize(1/1.15);q('larger').onclick=()=>resize(1.15);resize(1);
 // "/" is the caesura: drawn as a coloured mark so the singer sees the half-breath.
 function line(element,text){element.replaceChildren();String(text).split('/').forEach((part,i)=>{if(i){const mark=document.createElement('span');mark.className='caesura';mark.textContent='/';element.append(mark);}element.append(part.trim());});}
 function render(){
  const state=getLyrics()||{now:'',prev:'',index:-1,count:0},key=`${state.now}\u0001${state.prev}`;if(key===shown)return;shown=key;
  root.classList.toggle('empty',!state.now);line(q('prev'),state.prev);
  if(state.now)line(q('now'),state.now);else q('now').textContent='no verse in this section';
  q('count').textContent=state.count?`${state.index+1}/${state.count}`:'';
 }
 const timer=setInterval(render,200);render();
 return{render,dispose(){clearInterval(timer);container.replaceChildren();}};
}
