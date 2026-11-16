import {createNoteDensity} from './note-density.js';
import { drawMorphology, morphologyState } from '../../../packages/hylon-visuals/morphology.js';
import { DIVISION_UI, DIVISION_ORDER } from '../../../packages/hylon-midi/divisions.js';
import { CATALOG } from '../../../packages/spore/catalog.js';
import { harmonicityAt } from '../../../packages/spore/score.js';
export function createSporeRenderer(container, score) {
  const { W, STRATA, DIVS, DIVCOL, STOPS, FAMCOL, MODES, TEX, PCN } = CATALOG, H=STRATA*DIVS.length;
  const density=createNoteDensity(score.duration),rollCache=document.createElement('canvas'),microCache=document.createElement('canvas');
  let rollKey='',microKey='',rollStamp=0,microStamp=0,microZoom=0;
  const microHeader=container.querySelector('[data-pod="micro"] h3');
  microHeader.querySelector('.micro-zoom')?.remove();
  const zoomControls=document.createElement('span');zoomControls.className='micro-zoom';
  const minus=document.createElement('button'),plus=document.createElement('button');minus.textContent='−';plus.textContent='+';minus.title='Zoom out · full score matches MACRO';plus.title='Zoom in around playhead';
  zoomControls.append(minus,plus);microHeader.append(zoomControls);
  const zoomState=()=>{minus.disabled=microZoom===0;plus.disabled=microZoom===8;zoomControls.title=microZoom?`×${2**microZoom} · playhead centred`:'Full score · aligned with MACRO';};
  minus.onclick=()=>{microZoom=Math.max(0,microZoom-1);zoomState();};plus.onclick=()=>{microZoom=Math.min(8,microZoom+1);zoomState();};zoomState();
  const COUPLERS=score.couplings, SECTIONS=score.sections, HARM_SCORE=score.harmonicityCurve, PIECE_END=score.duration;
  const OPEN=score.fertility.open,CLOSE=score.fertility.close;
  const BAND=Object.fromEntries(DIVS.map((d,i)=>[d,{div:d,r0:i*STRATA,idx:i}]));
  const fertile=(d,t)=>t>=OPEN[d]&&t<CLOSE[d],divOf=r=>DIVS[Math.floor(r/STRATA)];
  const secAt=t=>{for(let i=SECTIONS.length-1;i>=0;i--)if(t>=SECTIONS[i].start)return i;return 0;};
  const $=id=>container.querySelector(`[data-spore-id="${id}"]`);
  const cv=Object.fromEntries(['macro','meso','morph','micro','harm'].map(name=>[name,$('c'+name[0].toUpperCase()+name.slice(1))]));
  cv.macro.onpointermove=event=>{const rect=cv.macro.getBoundingClientRect(),left=Number(cv.macro.dataset.plotLeft)||8,right=Number(cv.macro.dataset.plotRight)||8,time=Math.max(0,Math.min(PIECE_END,(event.clientX-rect.left-left)/Math.max(1,rect.width-left-right)*PIECE_END)),section=SECTIONS[secAt(time)];cv.macro.title=`${section.id} · ${section.name} / ${section.bpm} BPM / ${section.ruleName} / ${(texOverride||section.texture).toUpperCase()} / μ ${section.mu} / field ${section.field.length} / poly ${section.poly} · BPM curve 0–${Math.max(...SECTIONS.map(s=>s.bpm))} · bottom: transport note intent P/I/II/III/IV (not hardware feedback)`;};
  let S, texOverride='', satOn=true, harm={pos:0,src:'score'}, tNow=0;
  const pieceNow=()=>tNow,harmAt=t=>harmonicityAt(score,t);
function fit(c){ const r=c.getBoundingClientRect(), d=devicePixelRatio||1;
  if (c.width!==Math.round(r.width*d)||c.height!==Math.round(r.height*d)){ c.width=Math.round(r.width*d); c.height=Math.round(r.height*d); }
  const x=c.getContext('2d'); x.setTransform(d,0,0,d,0,0); return [x,r.width,r.height]; }
const mmss=t=>{ const m=Math.floor(t/60), s=t-m*60; return String(m).padStart(2,'0')+':'+s.toFixed(1).padStart(4,'0'); };
function hueFor(gid,div){ return `hsl(${DIVISION_UI[div].hue},78%,${60+(gid%3)*6}%)`; }

function drawMacro(t){
  const [x,w,h]=fit(cv.macro);x.clearRect(0,0,w,h);if(w<1||h<1)return;
  const left=w<300?38:49,right=8,plotWidth=Math.max(1,w-left-right),X=s=>left+s/PIECE_END*plotWidth;
  cv.macro.dataset.plotLeft=String(left);cv.macro.dataset.plotRight=String(right);
  const active=secAt(t),current=SECTIONS[active],rowHeight=12,metaTop=20,graphTop=88,graphBottom=Math.max(graphTop+12,h-83);
  const shorten=(text,width)=>{if(width<5)return '';if(x.measureText(text).width<=width)return text;let value=text;while(value&&x.measureText(value+'…').width>width)value=value.slice(0,-1);return value?value+'…':'';};
  x.font='600 10px ui-monospace,monospace';x.fillStyle='#ffbd69';x.fillText(shorten(`${current.id} · ${current.name}`,w-16),8,12);
  const labels=['SECTION','BPM','RULE','TEXTURE','GENES'];
  x.font='6.5px ui-monospace,monospace';x.fillStyle='#607b69';labels.forEach((label,i)=>x.fillText(label,3,metaTop+9+i*rowHeight));
  for(let i=0;i<SECTIONS.length;i++){
    const section=SECTIONS[i],start=X(section.start),width=X(section.start+section.dur)-start,texture=texOverride||section.texture,on=i===active;
    x.fillStyle=on?'#b6ffcf0b':'#070909';x.fillRect(start,metaTop,width,graphBottom-metaTop);
    x.strokeStyle=on?'#618e70':'#27352f';x.beginPath();x.moveTo(start+.5,metaTop);x.lineTo(start+.5,graphBottom);x.stroke();
    // Each cell clips independently; short sections never paint into their neighbours.
    const values=[`${section.id} · ${section.name}`,String(section.bpm),section.ruleName,texture.toUpperCase(),`μ ${section.mu} · F ${section.field.length} · p ${section.poly}`];
    x.save();x.beginPath();x.rect(start+1,metaTop,Math.max(0,width-2),rowHeight*5);x.clip();
    for(let row=0;row<values.length;row++){
      x.font=`${row===0?'600 ':''}${row===0?8:7.5}px ui-monospace,monospace`;
      x.fillStyle=row===0?(on?'#ffbd69':'#c2ae82'):(on?'#b0c6b7':'#607b69');
      const text=row===0&&x.measureText(values[row]).width>width-6?section.id:values[row];
      x.fillText(shorten(text,Math.max(0,width-6)),start+3,metaTop+9+row*rowHeight);
    }
    x.restore();
  }
  x.strokeStyle='#27352f';x.beginPath();x.moveTo(left,metaTop+rowHeight);x.lineTo(w-right,metaTop+rowHeight);x.moveTo(left,graphTop-4);x.lineTo(w-right,graphTop-4);x.stroke();
  const graphHeight=graphBottom-graphTop,yH=v=>graphBottom-v/9*graphHeight,yP=v=>graphBottom-v/(W*H)*graphHeight,yM=v=>graphBottom-v/(MODES.length-1)*graphHeight;
  x.save();x.beginPath();x.rect(left,graphTop,plotWidth,graphHeight);x.clip();
  x.beginPath();S.hist.forEach((p,i)=>{i?x.lineTo(X(p.t),yP(p.pop)):x.moveTo(X(p.t),yP(p.pop));});x.strokeStyle='#8fe3ff55';x.stroke();
  x.beginPath();S.hist.forEach((p,i)=>{i?x.lineTo(X(p.t),yH(p.H)):x.moveTo(X(p.t),yH(p.H));});x.strokeStyle='#b6ffcf';x.lineWidth=1.4;x.stroke();x.lineWidth=1;
  x.setLineDash([2,2]);x.strokeStyle='#ff87ad99';x.beginPath();for(let tt=0;tt<=PIECE_END;tt+=.5){tt?x.lineTo(X(tt),yM(harmAt(tt))):x.moveTo(X(tt),yM(harmAt(tt)));}x.stroke();x.setLineDash([]);
  const bpmMax=Math.max(...SECTIONS.map(section=>section.bpm)),yB=value=>graphBottom-value/bpmMax*graphHeight;
  x.setLineDash([5,3]);x.strokeStyle='#e5c58b77';x.beginPath();SECTIONS.forEach((section,i)=>{const start=X(section.start),end=X(section.start+section.dur),y=yB(section.bpm);if(i)x.lineTo(start,y);else x.moveTo(start,y);x.lineTo(end,y);});x.stroke();x.setLineDash([]);
  if(harm.src==='manual'){x.fillStyle='#ffd27a';x.fillRect(X(t)-3,yM(harm.pos)-3,6,6);}
  x.strokeStyle='#ff87ad';x.beginPath();x.moveTo(X(t)+.5,graphTop);x.lineTo(X(t)+.5,graphBottom);x.stroke();x.restore();
  x.font='7px ui-monospace,monospace';x.fillStyle='#607b69';x.fillText('H / POP',3,graphTop+9);x.fillStyle='#ff87ad88';x.fillText('harm',3,graphTop+20);
  x.fillStyle='#e5c58b88';x.fillText('BPM',3,graphTop+31);
  const rollTop=h-75,laneHeight=9,activeNotes=density.activity(t),pixelWidth=Math.max(1,Math.ceil(plotWidth)),key=`${pixelWidth}:${density.version}`;
  if(key!==rollKey&&(performance.now()-rollStamp>100||rollCache.width!==pixelWidth)){
    rollCache.width=pixelWidth;rollCache.height=45;const ctx=rollCache.getContext('2d');
    for(let k=0;k<5;k++){ctx.fillStyle=DIVISION_UI[DIVISION_ORDER[k]].color;for(let px=0;px<pixelWidth;px++){const [a,b]=density.columnRange(px,pixelWidth);let bits=0;for(let c=a;c<b;c++)bits|=density.lanes[k][c];for(let row=0;row<8;row++)if(bits&(1<<row))ctx.fillRect(px,k*laneHeight+row,1,1);}}
    rollKey=key;rollStamp=performance.now();
  }
  x.save();x.beginPath();x.rect(left,rollTop,Math.max(0,X(t)-left),45);x.clip();x.globalAlpha=.85;x.drawImage(rollCache,left,rollTop,plotWidth,45);x.restore();
  DIVISION_ORDER.forEach((d,k)=>{const y=rollTop+k*laneHeight;x.fillStyle=DIVISION_UI[d].color;x.globalAlpha=activeNotes[k]?1:.45;x.font=`${activeNotes[k]?'bold ':''}7px ui-monospace,monospace`;x.fillText(DIVISION_UI[d].label,left-16,y+7);if(activeNotes[k])x.fillRect(left-5,y+2,2,4);x.globalAlpha=1;x.strokeStyle='#293c302e';x.beginPath();x.moveTo(left,y+8.5);x.lineTo(w-right,y+8.5);x.stroke();});
  x.strokeStyle='#ff87ad';x.beginPath();x.moveTo(X(t)+.5,graphBottom);x.lineTo(X(t)+.5,rollTop+45);x.stroke();
  const maxTicks=Math.max(2,Math.floor(plotWidth/48)),step=[15,30,60,120,300,600].find(value=>PIECE_END/value<=maxTicks)||600;
  x.font='8px ui-monospace,monospace';x.fillStyle='#80948a';for(let seconds=0;seconds<=PIECE_END;seconds+=step){const label=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;x.fillText(label,Math.max(left,Math.min(w-right-x.measureText(label).width,X(seconds)-10)),h-15);}
}
function drawMeso(){
  const [x,w,h]=fit(cv.meso); x.clearRect(0,0,w,h);
  const L=30, cw=(w-L-6)/W, ch=(h-12)/H, tt=S.tNext;
  x.font='9px ui-monospace,monospace';
  for (const d of DIVS){ const b=BAND[d], y0=4+DIVISION_ORDER.indexOf(d)*STRATA*ch;
    if (!fertile(d,tt)){ x.fillStyle='#0d1310'; x.fillRect(L,y0,W*cw,STRATA*ch); x.fillStyle='#35463c'; x.fillText(OPEN[d]>tt?`opens ${mmss(OPEN[d])}`:'closed', L+8, y0+STRATA*ch/2+3); }
    x.fillStyle=DIVCOL[d]; x.globalAlpha=fertile(d,tt)?.9:.3; x.fillText(DIVISION_UI[d].label,4,y0+STRATA*ch/2+3); x.globalAlpha=1;
    x.strokeStyle='#35463c'; x.beginPath(); x.moveTo(L,y0+.5); x.lineTo(w-6,y0+.5); x.stroke();
  }
  x.strokeStyle='#141d18'; for (let c=0;c<=W;c+=12){ x.beginPath(); x.moveTo(L+c*cw+.5,4); x.lineTo(L+c*cw+.5,h-8); x.stroke(); }
  const pr=DIVISION_ORDER.indexOf('pe')*STRATA; x.fillStyle='#0f1512'; x.fillRect(L+30*cw,4+pr*ch,(W-30)*cw,STRATA*ch);
  const sec=SECTIONS[S.si];
  for (let r=0;r<H;r++) for (let c=0;c<W;c++){
    const i=r*W+c, gid=S.grid[i]; if (gid<0) continue;
    const G=S.genomes[gid].g,displayRow=DIVISION_ORDER.indexOf(divOf(r))*STRATA+(r%STRATA);
    x.fillStyle=(sec.hack&&G.hack)?'#ff87ad':hueFor(gid,divOf(r));
    x.globalAlpha=S.born[i]?1:Math.max(.22,.8-S.age[i]*.05);
    x.fillRect(L+c*cw+1,4+displayRow*ch+1,Math.max(1,cw-2),Math.max(1,ch-2));
    if (G.emb){ x.globalAlpha=.9; x.fillStyle='#070909'; x.fillRect(L+c*cw+cw/2-1,4+displayRow*ch+ch/2-1,2,2); }   // embryo mark
  }
  x.globalAlpha=1; x.fillStyle='#4c5f55'; for (let c=0;c<W;c+=12) x.fillText('C'+(1+c/12),L+c*cw+2,h-1);
}
function drawMorph(){drawMorphology(cv.morph,morphologyState(score,S,tNow));}
function drawMicro(t){
  const [x,w,h]=fit(cv.micro);x.clearRect(0,0,w,h);if(w<1||h<1)return;
  const L=w<300?38:49,R=8,width=Math.max(1,w-L-R),span=PIECE_END/2**microZoom,start=microZoom?Math.max(0,Math.min(PIECE_END-span,t-span*.5)):0,end=start+span;
  const X=time=>L+(time-start)/span*width,Y=note=>h-14-(note+.5)/128*(h-20),pixelWidth=Math.max(1,Math.ceil(width)),key=`${pixelWidth}:${start.toFixed(3)}:${end.toFixed(3)}:${density.version}`;
  if(key!==microKey&&(performance.now()-microStamp>100||microCache.width!==pixelWidth)){
    microCache.width=pixelWidth;microCache.height=128;const ctx=microCache.getContext('2d');
    // OR every source time-bin into each visible pixel: downsampling cannot erase an attack.
    for(let px=0;px<pixelWidth;px++){const [a,b]=density.columnRange(px,pixelWidth,start,end);for(let note=0;note<128;note++){let bits=0;for(let c=a;c<b;c++)bits|=density.pitches[c*128+note];if(!bits)continue;const lane=Math.floor(Math.log2(bits&-bits));ctx.fillStyle=(bits&(bits-1))?'#d5e8cf':DIVISION_UI[DIVISION_ORDER[lane]].color;ctx.fillRect(px,127-note,1,1);}}
    microKey=key;microStamp=performance.now();
  }
  x.save();x.beginPath();x.rect(L,4,width,h-18);x.clip();x.imageSmoothingEnabled=false;x.globalAlpha=.8;x.drawImage(microCache,L,4,width,h-18);x.restore();x.globalAlpha=1;
  x.font='7px ui-monospace,monospace';for(let note=24;note<=108;note+=12){x.strokeStyle='#27352f66';x.beginPath();x.moveTo(L,Y(note)+.5);x.lineTo(w-R,Y(note)+.5);x.stroke();x.fillStyle='#607b69';x.fillText('C'+(note/12-1),4,Y(note)+3);}
  x.strokeStyle='#ff87ad';x.beginPath();x.moveTo(X(t)+.5,4);x.lineTo(X(t)+.5,h-14);x.stroke();
  const maxTicks=Math.max(2,Math.floor(width/48)),step=[1,2,5,10,15,30,60,120,300,600].find(value=>span/value<=maxTicks)||Math.ceil(span/maxTicks/600)*600;
  x.fillStyle='#80948a';for(let seconds=Math.ceil(start/step)*step;seconds<=end;seconds+=step){const label=`${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;x.fillText(label,Math.max(L,Math.min(w-R-x.measureText(label).width,X(seconds)-10)),h-3);}
  cv.micro.title=`${microZoom?'×'+2**microZoom:'Full score · aligned with MACRO'} · transport note intent · P/I/II/III/IV colours · overlapping divisions pale · no hardware feedback`;
}
function harmLabel(){
  const p=harm.pos, lo=Math.floor(p), hi=Math.min(MODES.length-1,lo+1), f=p-lo;
  if (f<.02 || lo===hi) return MODES[lo].label;
  if (f>.98) return MODES[hi].label;
  return `${MODES[lo].label} ${Math.round((1-f)*100)}% · ${MODES[hi].label} ${Math.round(f*100)}%`;
}
const ivName = iv => PCN[((iv%12)+12)%12] + (iv>=12 ? '′'.repeat(Math.floor(iv/12)) : '');
function drawHarm(){
  const [x,w,h]=fit(cv.harm); x.clearRect(0,0,w,h);
  const cx=Math.min(w*.26,h*.62), cy=h*.55, r=Math.min(h*.36,w*.2), N=MODES.length;
  const ang=i=>(135+i/(N-1)*270)*Math.PI/180;
  x.font='8px ui-monospace,monospace'; x.lineWidth=1;
  x.strokeStyle='#27352f'; x.beginPath(); x.arc(cx,cy,r,ang(0),ang(N-1)); x.stroke();
  x.strokeStyle='#b6ffcf'; x.lineWidth=2; x.beginPath(); x.arc(cx,cy,r,ang(0),ang(harm.pos)); x.stroke(); x.lineWidth=1;
  const near=Math.round(harm.pos);
  MODES.forEach((m,i)=>{
    const a=ang(i), c=m.group==='hyper'?'#ff87ad':'#b6ffcf', on=i===near;
    x.strokeStyle=on?c:c+'55'; x.beginPath(); x.moveTo(cx+Math.cos(a)*(r-4),cy+Math.sin(a)*(r-4)); x.lineTo(cx+Math.cos(a)*(r+4),cy+Math.sin(a)*(r+4)); x.stroke();
    const lx=cx+Math.cos(a)*(r+13), ly=cy+Math.sin(a)*(r+13);
    x.fillStyle=on?c:'#4c5f55'; x.textAlign=Math.cos(a)<-.2?'right':Math.cos(a)>.2?'left':'center';
    x.fillText(m.group==='hyper'?m.label.slice(0,5):m.label.replace(' 4+',''), lx, ly+3);
  });
  x.textAlign='left';
  const a=ang(harm.pos); x.strokeStyle='#ff87ad'; x.beginPath(); x.moveTo(cx,cy); x.lineTo(cx+Math.cos(a)*(r-8),cy+Math.sin(a)*(r-8)); x.stroke();
  x.beginPath(); x.arc(cx,cy,3,0,Math.PI*2); x.stroke();
  // right column: current mode
  const M=MODES[near], tx=cx+r+48, col=M.group==='hyper'?'#ff87ad':'#b6ffcf';
  x.fillStyle=col; x.font='16px ui-monospace,monospace'; x.fillText(M.label, tx, 22);
  x.font='9px ui-monospace,monospace'; x.fillStyle='#80948a'; x.fillText(M.who, tx, 36); x.fillText(M.desc, tx, 48);
  x.fillStyle='#d3ddd8'; x.fillText(satOn?harmLabel():'POLYEMBRYONY OFF (0)', tx, 62);
  x.fillStyle=harm.src==='score'?'#b6ffcf':'#ffd27a'; x.font='9px ui-monospace,monospace';
  const cur=[...HARM_SCORE].reverse().find(b=>b[0]<=pieceNow() && b[2]);
  x.fillText(harm.src==='score' ? `SCORE CURVE · ${cur?cur[2]:''}` : 'MANUAL OVERRIDE · press S to return to the score curve', tx, h-38);
  x.font='8px ui-monospace,monospace';
  x.fillStyle='#4c5f55'; x.textAlign='center'; x.fillText(harm.src==='score'?'SCORE':'MANUAL', cx, cy+r*.55); x.textAlign='left';
  M.slots.forEach((sl,k)=>{ x.fillStyle='#4c5f55'; x.fillText(`slot ${'ABC'[k]}`, tx, 78+k*12);
    x.fillStyle=col; x.fillText(sl.map(v=>'+'+v).join(' ')+'   C → '+sl.map(ivName).join(' '), tx+42, 78+k*12); });
  x.fillStyle='#4c5f55'; x.font='8px ui-monospace,monospace';
  x.fillText('1 m2  2 m3  3 M3  4 P4  5 TT  6 P5  7 P8  8 PETRUSHKA  9 MODE 2', tx, h-26);
  x.fillText('⇧1 M2 ⇧2 m6 ⇧3 M6 ⇧4 m7 ⇧5 M7 ⇧6 AUGURS ⇧7 AXIS ⇧8 RÉSONANCE', tx, h-15);
  x.fillText('←/→ step · drag/wheel = continuous · dbl-click snap · 0 poly on/off · S score/manual', tx, h-4);
}

  // Compact copy of the five pitch-roll lanes for the remote: 384 time columns x 5 divisions, one byte of
  // 8 pitch rows each (same data as the MACRO lanes), base64. Rebuilt only when the note history changes.
  let rollVersion=-1,rollText='';
  function roll(columns=384){
    if(density.version===rollVersion)return rollText;
    const bytes=new Uint8Array(5*columns);for(let k=0;k<5;k++)for(let px=0;px<columns;px++){const [a,b]=density.columnRange(px,columns);let bits=0;for(let c=a;c<b;c++)bits|=density.lanes[k][c];bytes[k*columns+px]=bits;}
    let binary='';for(let i=0;i<bytes.length;i+=4096)binary+=String.fromCharCode(...bytes.subarray(i,i+4096));
    rollVersion=density.version;rollText=btoa(binary);return rollText;
  }
  return { roll,note:event=>density.add(event),clearNotes(){density.clear();rollKey='';microKey='';},render(state, time, options) {
    if(!cv.macro.getBoundingClientRect().width)return;
    S=state; tNow=time;texOverride=options.texture==='auto'?'':options.texture;satOn=options.polyembryony;
    harm={pos:options.harmonicity??harmonicityAt(score,time),src:options.harmonicity===null?'score':'manual'};
    drawMacro(time);drawMeso();drawMorph();drawMicro(time);drawHarm();
    const section=SECTIONS[secAt(time)];
    $('trans').textContent=`${section.id} / ${section.name} · ${section.bpm} BPM · ${section.rule}\n${section.rel}\n${section.bio}\n${Object.keys(score.voiceBindings).join(' · ')}\nCouplings: ${section.couplers.join(' · ')||'none'}\nPopulation ${S.pop} / entropy ${S.H.toFixed(2)} bit / generation ${S.gen}`;
    const top=[...S.counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);
    $('geno').textContent=top.map(([id,count])=>`g${id} / ${count} cells / parent ${S.genomes[id].parent??'seed'} / embryo ${S.genomes[id].g.emb}`).join('\n')+'\n'+S.mutations.slice(-5).map(m=>`g${m.id} ← g${m.parent} / ${m.slot}`).join('\n');
  } };
}
