import {FOLLOWER_COLUMNS,FOLLOWER_INTERVALS,validFollowerSend} from '../../../packages/hylon-audio/follower-matrix.js';
const signature=keys=>[...keys].sort().join('|');
const validKeys=keys=>Array.isArray(keys)&&keys.length<=95&&keys.every(key=>{if(typeof key!=='string')return false;const parts=key.split(':');return parts.length===2&&validFollowerSend(Number(parts[0]),Number(parts[1]));});
export function mountFollowerMatrix(container,routing){
 const storageKey='hylon-follower-matrix-v1',programKey='hylon-follower-matrix-programs-v1';
 try{const saved=localStorage.getItem(storageKey);if(saved)routing.setMatrix(JSON.parse(saved));}catch{}
 let programs=Array(5).fill(null),brush=null;const events=new AbortController();
 try{const saved=JSON.parse(localStorage.getItem(programKey)||'null');if(Array.isArray(saved))programs=programs.map((_,i)=>validKeys(saved[i])?[...new Set(saved[i])]:null);}catch{}
 container.className='follower-paint';
 const tools=document.createElement('div');tools.className='matrix-tools';
 const reset=document.createElement('button');reset.textContent='R';reset.title='Clear all follower sends';reset.setAttribute('aria-label',reset.title);tools.append(reset);
 const slots=programs.map((_,i)=>{const button=document.createElement('button');button.textContent=String(i+1);button.title=`Matrix ${i+1} · click to recall · Shift+click to save`;button.onclick=event=>{finish();if(event.shiftKey){programs[i]=[...routing.matrix()];try{localStorage.setItem(programKey,JSON.stringify(programs));}catch{}}else if(programs[i]){routing.setMatrix(programs[i]);persist();}sync();};tools.append(button);return button;});
 const grid=document.createElement('div');grid.className='follower-matrix';grid.setAttribute('role','group');grid.setAttribute('aria-label','Paint follower transposition sends to manuals and pedal');container.replaceChildren(tools,grid);
 grid.append(document.createElement('span'));
 for(const column of FOLLOWER_COLUMNS){const label=document.createElement('span');label.className='matrix-column';label.style.color=column.color;label.textContent=column.label;label.title=`${column.channel===5?'Pedal':'Manual '+column.label} · MIDI channel ${column.channel}`;grid.append(label);}
 const buttons=[];
 FOLLOWER_INTERVALS.forEach((row,rowIndex)=>{
  const label=document.createElement('span');label.className=`matrix-interval${row.semitones===0?' zero-row':''}`;label.textContent=row.label;label.title=`${row.semitones>=0?'+':''}${row.semitones} semitones`;grid.append(label);
  FOLLOWER_COLUMNS.forEach((column,columnIndex)=>{
   const button=document.createElement('button');button.type='button';button.className=`matrix-dot matrix-cell${row.semitones===0?' zero-row':''}`;button.style.setProperty('--division-color',column.color);button.dataset.row=rowIndex;button.dataset.column=columnIndex;button.dataset.send=`${row.semitones}:${column.channel}`;
   button.title=`${column.channel===5?'Pedal':'Manual '+column.label} · ${row.label} (${row.semitones>=0?'+':''}${row.semitones} semitones) · channel ${column.channel}`;button.setAttribute('aria-label',button.title);
   button.onclick=event=>{if(event.detail!==0)return;routing.setSend(row.semitones,column.channel,!routing.matrix().has(button.dataset.send));persist();sync();};
   button.onkeydown=event=>{const delta={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[event.key];if(!delta)return;event.preventDefault();event.stopPropagation();grid.querySelector(`[data-row="${rowIndex+delta[0]}"][data-column="${columnIndex+delta[1]}"]`)?.focus();};
   buttons.push(button);grid.append(button);
  });
 });
 function persist(){try{localStorage.setItem(storageKey,JSON.stringify([...routing.matrix()]));}catch{}}
 function sync(){const current=routing.matrix(),currentSignature=signature(current);for(const button of buttons){const on=current.has(button.dataset.send);button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));}slots.forEach((button,i)=>{const saved=programs[i],on=saved!==null&&signature(saved)===currentSignature;button.classList.toggle('stored',saved!==null);button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));button.title=`Matrix ${i+1} · click to recall · Shift+click to save${saved===null?' · empty':` · ${saved.length} sends`}`;});}
 function paint(button){if(!brush||!button||!grid.contains(button)||!button.dataset.send||brush.visited.has(button.dataset.send))return;brush.visited.add(button.dataset.send);const row=FOLLOWER_INTERVALS[Number(button.dataset.row)],column=FOLLOWER_COLUMNS[Number(button.dataset.column)];routing.setSend(row.semitones,column.channel,brush.on);sync();}
 function at(x,y){paint(document.elementFromPoint(x,y)?.closest('.matrix-cell'));}
 function finish(){if(!brush)return;const id=brush.id;brush=null;persist();if(grid.hasPointerCapture(id))grid.releasePointerCapture(id);}
 grid.addEventListener('pointerdown',event=>{const cell=event.target.closest('.matrix-cell');if(!cell||event.button!==0||brush)return;event.preventDefault();brush={id:event.pointerId,on:!routing.matrix().has(cell.dataset.send),visited:new Set(),x:event.clientX,y:event.clientY};grid.setPointerCapture(event.pointerId);paint(cell);},{signal:events.signal});
 grid.addEventListener('pointermove',event=>{if(!brush||brush.id!==event.pointerId)return;event.preventDefault();const {x,y}=brush,steps=Math.max(1,Math.ceil(Math.hypot(event.clientX-x,event.clientY-y)/5));for(let i=1;i<=steps;i++)at(x+(event.clientX-x)*i/steps,y+(event.clientY-y)*i/steps);brush.x=event.clientX;brush.y=event.clientY;},{signal:events.signal});
 for(const type of ['pointerup','pointercancel','lostpointercapture'])grid.addEventListener(type,finish,{signal:events.signal});
 window.addEventListener('blur',finish,{signal:events.signal});
 reset.onclick=()=>{finish();routing.setMatrix([]);persist();sync();};
 sync();return{sync,dispose(){finish();events.abort();container.replaceChildren();}};
}
