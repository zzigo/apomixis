import {FOLLOWER_COLUMNS,FOLLOWER_INTERVALS} from '../../../packages/hylon-audio/follower-matrix.js';
export function mountFollowerMatrix(container,routing){
  const storageKey='hylon-follower-matrix-v1';
  try{const saved=localStorage.getItem(storageKey);if(saved)routing.setMatrix(JSON.parse(saved));}catch{}
  container.className='follower-matrix';container.setAttribute('role','group');container.setAttribute('aria-label','Follower transposition sends to manuals and pedal');
  container.append(document.createElement('span'));
  for(const column of FOLLOWER_COLUMNS){const label=document.createElement('span');label.className='matrix-column';label.textContent=column.label;label.title=`${column.channel===5?'Pedal':'Manual '+column.label} · MIDI channel ${column.channel}`;container.append(label);}
  const buttons=[];
  FOLLOWER_INTERVALS.forEach((row,rowIndex)=>{
    const label=document.createElement('span');label.className='matrix-interval';label.textContent=row.label;label.title=`${row.semitones>=0?'+':''}${row.semitones} semitones`;container.append(label);
    FOLLOWER_COLUMNS.forEach((column,columnIndex)=>{
      const button=document.createElement('button');button.type='button';button.className='matrix-dot';button.dataset.row=rowIndex;button.dataset.column=columnIndex;
      button.title=`${column.channel===5?'Pedal':'Manual '+column.label} · ${row.label} (${row.semitones>=0?'+':''}${row.semitones} semitones) · channel ${column.channel}`;button.setAttribute('aria-label',button.title);
      const sync=()=>{const on=routing.matrix().has(`${row.semitones}:${column.channel}`);button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));};
      button.onclick=()=>{routing.setSend(row.semitones,column.channel,button.getAttribute('aria-pressed')!=='true');sync();try{localStorage.setItem(storageKey,JSON.stringify([...routing.matrix()]));}catch{}};
      button.onkeydown=event=>{const delta={ArrowLeft:[0,-1],ArrowRight:[0,1],ArrowUp:[-1,0],ArrowDown:[1,0]}[event.key];if(!delta)return;event.preventDefault();container.querySelector(`[data-row="${rowIndex+delta[0]}"][data-column="${columnIndex+delta[1]}"]`)?.focus();};
      sync();buttons.push(button);container.append(button);
    });
  });
  return{dispose(){container.replaceChildren();}};
}
