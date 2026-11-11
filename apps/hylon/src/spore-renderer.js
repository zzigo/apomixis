import { CATALOG } from '../../../packages/spore/catalog.js';
import { harmonicityAt } from '../../../packages/spore/score.js';
export function createSporeRenderer(container, score) {
  const { W, STRATA, DIVS, DIVCOL, STOPS, FAMCOL, MODES, TEX, PCN } = CATALOG, H=STRATA*DIVS.length;
  const COUPLERS=score.couplings, SECTIONS=score.sections, HARM_SCORE=score.harmonicityCurve, PIECE_END=score.duration;
  const OPEN=score.fertility.open,CLOSE=score.fertility.close;
  const BAND=Object.fromEntries(DIVS.map((d,i)=>[d,{div:d,r0:i*STRATA,idx:i}]));
  const fertile=(d,t)=>t>=OPEN[d]&&t<CLOSE[d],divOf=r=>DIVS[Math.floor(r/STRATA)];
  const secAt=t=>{for(let i=SECTIONS.length-1;i>=0;i--)if(t>=SECTIONS[i].start)return i;return 0;};
  const $=id=>container.querySelector(`[data-spore-id="${id}"]`);
  const cv=Object.fromEntries(['macro','meso','morph','micro','harm'].map(name=>[name,$('c'+name[0].toUpperCase()+name.slice(1))]));
  let S, texOverride='', satOn=true, harm={pos:0,src:'score'}, tNow=0;
  const pieceNow=()=>tNow,harmAt=t=>harmonicityAt(score,t);
function fit(c){ const r=c.getBoundingClientRect(), d=devicePixelRatio||1;
  if (c.width!==Math.round(r.width*d)||c.height!==Math.round(r.height*d)){ c.width=Math.round(r.width*d); c.height=Math.round(r.height*d); }
  const x=c.getContext('2d'); x.setTransform(d,0,0,d,0,0); return [x,r.width,r.height]; }
const mmss=t=>{ const m=Math.floor(t/60), s=t-m*60; return String(m).padStart(2,'0')+':'+s.toFixed(1).padStart(4,'0'); };
function hueFor(gid,div){ const base={go:135,po:190,re:265,so:20,pe:45}[div]; const h=base+((gid*37)%30)-15; return `hsl(${h},85%,${60+(gid%3)*8}%)`; }

function drawMacro(t){
  const [x,w,h]=fit(cv.macro); x.clearRect(0,0,w,h);
  const X=s=>8+s/PIECE_END*(w-16), top=8, bot=h-18;
  x.font='9px ui-monospace,monospace';
  // fertility lanes (growth across the instrument)
  DIVS.forEach((d,k)=>{ const y=bot-4-k*4; x.strokeStyle=DIVCOL[d]; x.globalAlpha=.55; x.beginPath(); x.moveTo(X(OPEN[d]),y); x.lineTo(X(Math.min(PIECE_END,CLOSE[d])),y); x.stroke(); x.globalAlpha=1; });
  for (let i=0;i<SECTIONS.length;i++){ const s=SECTIONS[i], tx=texOverride||s.texture;
    x.strokeStyle=i===S.si?'#618e70':'#27352f';
    if (i===S.si){ x.fillStyle='#b6ffcf0d'; x.fillRect(X(s.start),top,X(s.start+s.dur)-X(s.start),bot-top); }
    x.strokeRect(X(s.start)+.5,top+.5,X(s.start+s.dur)-X(s.start)-1,bot-top);
    x.fillStyle=i===S.si?'#b6ffcf':'#80948a'; x.fillText(`${s.id} ${s.bpm} · ${s.ruleName}`,X(s.start)+5,top+12);
    x.fillStyle='#4c5f55'; x.fillText(`${tx.toUpperCase()} ← ${TEX[tx].repro}`,X(s.start)+5,top+24);
    x.fillText(`μ ${s.mu} |F| ${s.field.length} poly ${s.poly}`,X(s.start)+5,top+36);
  }
  const yH=v=>bot-26-v/9*(bot-top-62), yP=v=>bot-26-v/(W*H)*(bot-top-62);
  x.beginPath(); S.hist.forEach((p,i)=>{ i?x.lineTo(X(p.t),yP(p.pop)):x.moveTo(X(p.t),yP(p.pop)); }); x.strokeStyle='#8fe3ff55'; x.stroke();
  x.beginPath(); S.hist.forEach((p,i)=>{ i?x.lineTo(X(p.t),yH(p.H)):x.moveTo(X(p.t),yH(p.H)); }); x.strokeStyle='#b6ffcf'; x.lineWidth=1.4; x.stroke(); x.lineWidth=1;
  x.fillStyle='#4c5f55'; for (let b=0;b<=8;b+=4) x.fillText(b+'b',w-22,yH(b)+3);
  x.fillStyle='#80948a'; for (let m=0;m<=5;m++) x.fillText(`${m}:00`,X(m*60)-10,h-5);
  // score harmonicity curve (modes 0..16), manual override drawn as a marker
  const yM=v=>top+42+(1-v/(MODES.length-1))*(bot-top-74);
  x.setLineDash([2,2]); x.strokeStyle='#ff87ad99'; x.beginPath();
  for (let tt=0;tt<=PIECE_END;tt+=.5){ const py=yM(harmAt(tt)); tt?x.lineTo(X(tt),py):x.moveTo(X(tt),py); } x.stroke(); x.setLineDash([]);
  x.fillStyle='#ff87ad99'; x.fillText('harm',w-30,yM(MODES.length-1)+3);
  if (harm.src==='manual'){ x.fillStyle='#ffd27a'; x.fillRect(X(t)-3,yM(harm.pos)-3,6,6); }
  x.strokeStyle='#ff87ad'; x.beginPath(); x.moveTo(X(t)+.5,top); x.lineTo(X(t)+.5,bot); x.stroke();
}
function drawMeso(){
  const [x,w,h]=fit(cv.meso); x.clearRect(0,0,w,h);
  const L=30, cw=(w-L-6)/W, ch=(h-12)/H, tt=S.tNext;
  x.font='9px ui-monospace,monospace';
  for (const d of DIVS){ const b=BAND[d], y0=4+b.r0*ch;
    if (!fertile(d,tt)){ x.fillStyle='#0d1310'; x.fillRect(L,y0,W*cw,STRATA*ch); x.fillStyle='#35463c'; x.fillText(OPEN[d]>tt?`opens ${mmss(OPEN[d])}`:'closed', L+8, y0+STRATA*ch/2+3); }
    x.fillStyle=DIVCOL[d]; x.globalAlpha=fertile(d,tt)?.9:.3; x.fillText(d.toUpperCase(),4,y0+STRATA*ch/2+3); x.globalAlpha=1;
    x.strokeStyle='#35463c'; x.beginPath(); x.moveTo(L,y0+.5); x.lineTo(w-6,y0+.5); x.stroke();
  }
  x.strokeStyle='#141d18'; for (let c=0;c<=W;c+=12){ x.beginPath(); x.moveTo(L+c*cw+.5,4); x.lineTo(L+c*cw+.5,h-8); x.stroke(); }
  const pr=BAND.pe.r0; x.fillStyle='#0f1512'; x.fillRect(L+30*cw,4+pr*ch,(W-30)*cw,STRATA*ch);
  const sec=SECTIONS[S.si];
  for (let r=0;r<H;r++) for (let c=0;c<W;c++){
    const i=r*W+c, gid=S.grid[i]; if (gid<0) continue;
    const G=S.genomes[gid].g;
    x.fillStyle=(sec.hack&&G.hack)?'#ff87ad':hueFor(gid,divOf(r));
    x.globalAlpha=S.born[i]?1:Math.max(.22,.8-S.age[i]*.05);
    x.fillRect(L+c*cw+1,4+r*ch+1,Math.max(1,cw-2),Math.max(1,ch-2));
    if (G.emb){ x.globalAlpha=.9; x.fillStyle='#070909'; x.fillRect(L+c*cw+cw/2-1,4+r*ch+ch/2-1,2,2); }   // embryo mark
  }
  x.globalAlpha=1; x.fillStyle='#4c5f55'; for (let c=0;c<W;c+=12) x.fillText('C'+(1+c/12),L+c*cw+2,h-1);
}
function drawMorph(){
  const [x,w,h]=fit(cv.morph); x.clearRect(0,0,w,h);
  const sec=SECTIONS[S.si], ground=h*.64, top=h*.07, tt=S.tNext;
  const pos={so:w*.09, re:w*.3, po:w*.5, go:w*.7, pe:w*.9};
  const yOf=hm=>ground-(Math.log2(hm)+2.3)/(2.3+2.6)*(ground-top);
  x.font='8px ui-monospace,monospace';
  x.strokeStyle='#35463c'; x.beginPath(); x.moveTo(4,ground+.5); x.lineTo(w-4,ground+.5); x.stroke();
  x.fillStyle='#4c5f55'; x.fillText('soil / wind-chest',6,ground+11);
  const act=new Set(); for (const d of DIVS) (sec.regs[d]||[]).forEach(k=>act.add(d+':'+k));
  const hackOn=sec.hack && [...S.counts.keys()].some(g=>S.genomes[g].g.hack);
  if (hackOn && sec.hackRegs) for (const d in sec.hackRegs) sec.hackRegs[d].forEach(k=>act.add(d+':'+k));
  for (const d of DIVS){
    const X0=pos[d], fe=fertile(d,tt), grown=fe?Math.min(1,(tt-OPEN[d])/20):0;
    const stemTop=ground-(ground-top)*Math.max(.12,grown);
    x.setLineDash(fe?[]:[2,4]); x.strokeStyle=DIVCOL[d]; x.globalAlpha=fe?.75:.3;
    x.beginPath(); x.moveTo(X0,ground); x.lineTo(X0,fe?stemTop:top+30); x.stroke(); x.setLineDash([]); x.globalAlpha=1;
    x.fillStyle=DIVCOL[d]; x.globalAlpha=fe?1:.4; x.fillText(d.toUpperCase()+' '+(S.perDiv?S.perDiv[d]:0),X0-10,top-2); x.globalAlpha=1;
    STOPS[d].forEach((s,j)=>{
      const on=act.has(d+':'+s[0]), y=yOf(s[2])-(j%4)*3, side=j%2?1:-1, len=on?20:6;
      if (y<stemTop && !on) return;
      x.strokeStyle=on?FAMCOL[s[3]]:'#22302a'; x.lineWidth=on?1.6:1;
      x.beginPath(); x.moveTo(X0,y); x.lineTo(X0+side*len,y-len*.45); x.stroke(); x.lineWidth=1;
      if (on){ x.fillStyle=FAMCOL[s[3]]; x.textAlign=side>0?'left':'right'; x.fillText(s[1],X0+side*(len+3),y-len*.45+3); x.textAlign='left'; }
    });
  }
  // couplers as clonal integration
  const used=new Set(SECTIONS.flatMap(s=>s.couplers)); let lane=0;
  for (const k of used){ const C=COUPLERS[k], on=sec.couplers.includes(k);
    x.strokeStyle=on?'#b6ffcf':'#1a2520'; x.fillStyle=on?'#b6ffcf':'#2c3b33'; x.setLineDash(on?[]:[3,3]);
    if (C.from===C.to){
      const X0=pos[C.to];
      if (C.tr<0){ for (const a of [-10,0,10]){ x.beginPath(); x.moveTo(X0,ground); x.lineTo(X0+a,ground+26); x.stroke(); } x.fillText(C.label+' roots',X0-26,ground+36); }
      else { x.beginPath(); x.moveTo(X0-7,top+12); x.lineTo(X0,top+2); x.lineTo(X0+7,top+12); x.stroke(); x.fillText(C.label+' shoot',X0+9,top+10); }
    } else if (C.to==='pe'){
      const dy=18+lane*9; x.beginPath(); x.moveTo(pos[C.from],ground+3); x.bezierCurveTo(pos[C.from],ground+dy,pos.pe,ground+dy,pos.pe,ground+3); x.stroke();
      x.fillText(`${C.label} ${C.morph}`,(pos[C.from]+pos.pe)/2-20,ground+dy*.75+8); lane++;
    } else {
      const y=yOf(1)-6-lane*7, dy=-16-lane*4;
      x.beginPath(); x.moveTo(pos[C.from],y); x.bezierCurveTo(pos[C.from],y+dy,pos[C.to],y+dy,pos[C.to],y); x.stroke();
      if (on) x.fillText(`${C.label} ${C.morph}`,(pos[C.from]+pos[C.to])/2-16,y+dy*.75-2); lane++;
    }
    x.setLineDash([]);
  }
  for (const d of ['po','re']){ const sy=ground-12; x.strokeStyle=DIVCOL[d]; x.beginPath(); x.ellipse(pos[d]-16,sy,6,1+4*sec.swell,0,0,Math.PI*2); x.stroke(); }
  x.fillStyle='#4c5f55'; x.fillText('swell = stomata',pos.re-12,ground-22);
  x.strokeStyle='#27352f'; x.strokeRect(6.5,h-12.5,w-13,6); x.fillStyle='#ffd27a88'; x.fillRect(7,h-12,(w-14)*sec.cresc,5);
  x.fillStyle='#4c5f55'; x.fillText('crescendo = turgor pressure',8,h-16);
}
function drawMicro(t){
  const [x,w,h]=fit(cv.micro); x.clearRect(0,0,w,h);
  const sec=SECTIONS[secAt(t)], beat=60/sec.bpm, span=4*beat, t0=t-span*.75, L=26;
  const X=tt=>L+(tt-t0)/span*(w-L-4), Y=m=>h-10-(m-24)/(98-24)*(h-20);
  x.font='8px ui-monospace,monospace';
  for (let m=24;m<=96;m+=12){ x.strokeStyle='#141d18'; x.beginPath(); x.moveTo(L,Y(m)+.5); x.lineTo(w,Y(m)+.5); x.stroke(); x.fillStyle='#4c5f55'; x.fillText('C'+(m/12-1),4,Y(m)+3); }
  const b0=sec.start+Math.floor((t0-sec.start)/beat)*beat;
  for (let b=b0;b<t0+span;b+=beat){ x.strokeStyle='#27352f'; x.beginPath(); x.moveTo(X(b)+.5,4); x.lineTo(X(b)+.5,h-6); x.stroke(); }
  for (const e of S.events){ if (e.t+e.d<t0||e.t>t0+span) continue;
    x.globalAlpha=e.t<=t?1:.35;
    if (e.sat){ x.strokeStyle='#ffffff22'; x.setLineDash([1,2]); x.beginPath(); x.moveTo(X(e.pt),Y(e.pm)); x.lineTo(X(e.t),Y(e.midi)); x.stroke(); x.setLineDash([]); }
    x.strokeStyle=e.hack?'#ff87ad':DIVCOL[e.div]; x.lineWidth=e.sat?1:e.tuber?3:2;
    x.beginPath(); x.moveTo(X(e.t),Y(e.midi)); x.lineTo(Math.max(X(e.t)+2,X(e.t+e.d)),Y(e.midi)); x.stroke(); }
  x.globalAlpha=1; x.lineWidth=1;
  x.strokeStyle='#ff87ad'; x.beginPath(); x.moveTo(X(t)+.5,4); x.lineTo(X(t)+.5,h-6); x.stroke();
  const tex=texOverride||sec.texture; x.fillStyle='#b6ffcf'; x.font='10px ui-monospace,monospace';
  x.fillText(`${tex.toUpperCase()}  ←  ${TEX[tex].repro}   + EMBRYO MODE ${satOn?harmLabel():'off'}`,L+6,14);
  x.fillStyle='#80948a'; x.font='9px ui-monospace,monospace'; x.fillText(TEX[tex].note,L+6,26);
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

  return { render(state, time, options) {
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
