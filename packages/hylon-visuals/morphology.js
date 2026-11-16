import { CATALOG } from '../spore/catalog.js';
import { DIVISION_UI } from '../hylon-midi/divisions.js';
const {DIVS,DIVCOL,STOPS,FAMCOL}=CATALOG;
// Closed visual projection: no score text, MIDI, devices or executable content.
// Garden projection for the public viewer: reproduction mode, a few population values and the
// notes heard in the last moment, reduced to division, kind (0 primary · 1 bud · 2 tuber), lineage
// and length. No pitches, no score text.
function gardenState(state,section,time,file,extra=[]){
  const piece=/^(\d{2})-/.exec(file||'')?.[1],ev=[];
  for(const source of [state.events||[],extra])for(let i=source.length-1;i>=0&&ev.length<40;i--){const e=source[i];if(e.t<time-3)break;if(e.t>time||e.t<time-.8)continue;ev.push({t:Math.round(e.t*1000)/1000,div:e.div,k:e.tuber?2:e.sat?1:0,...(e.x?{x:e.x}:{}),g:Math.max(0,Math.min(1e6,e.gid|0)),l:Math.round(Math.min(60,e.d)*100)/100});}
  return{piece:piece?Number(piece):null,tex:state.lastTex||section.texture,gen:state.gen|0,H:Math.round((state.H||0)*1000)/1000,geno:state.geno|0,pop:state.pop|0,mu:section.mu,poly:section.poly,tuber:section.tuber,ev};
}
export function morphologyState(score,state,time,running=false,file=null,extra=[]){
  const section=score.sections[Math.max(0,score.sections.findLastIndex(s=>time>=s.start))];
  const usedCouplers=[...new Set(score.sections.flatMap(s=>s.couplers))];
  return {v:1,title:score.title.slice(0,120),time:Math.max(0,time),running:!!running,
    tt:state.tNext,open:{...score.fertility.open},close:{...score.fertility.close},perDiv:{...state.perDiv},
    sec:{regs:section.regs,hackRegs:section.hackRegs||{},couplers:section.couplers,swell:section.swell,cresc:section.cresc},
    hackOn:!!(section.hack&&[...state.counts.keys()].some(g=>state.genomes[g]?.g.hack)),
    usedCouplers,couplings:Object.fromEntries(usedCouplers.map(k=>[k,score.couplings[k]])),garden:gardenState(state,section,Math.max(0,time),file,extra)};
}
export function drawMorphology(canvas,frame){
  if(!frame)return;
  const rect=canvas.getBoundingClientRect(),d=Math.min(2,globalThis.devicePixelRatio||1),w=rect.width,h=rect.height;
  if(!w||!h)return;
  if(canvas.width!==Math.round(w*d)||canvas.height!==Math.round(h*d)){canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);}
  const x=canvas.getContext('2d');x.setTransform(d,0,0,d,0,0);x.clearRect(0,0,w,h);
  const sec=frame.sec,COUPLERS=frame.couplings,OPEN=frame.open,tt=frame.tt;
  const fertile=(div,t)=>t>=OPEN[div]&&t<frame.close[div];
  const ground=h*.64,top=h*.07;
  const pos={so:w*.09, re:w*.3, po:w*.5, go:w*.7, pe:w*.9};
  const yOf=hm=>ground-(Math.log2(hm)+2.3)/(2.3+2.6)*(ground-top);
  x.font='8px ui-monospace,monospace';
  x.strokeStyle='#35463c'; x.beginPath(); x.moveTo(4,ground+.5); x.lineTo(w-4,ground+.5); x.stroke();
  x.fillStyle='#4c5f55'; x.fillText('soil / wind-chest',6,ground+11);
  const act=new Set(); for (const d of DIVS) (sec.regs[d]||[]).forEach(k=>act.add(d+':'+k));
  const hackOn=frame.hackOn;
  if (hackOn && sec.hackRegs) for (const d in sec.hackRegs) sec.hackRegs[d].forEach(k=>act.add(d+':'+k));
  for (const d of DIVS){
    const X0=pos[d], fe=fertile(d,tt), grown=fe?Math.min(1,(tt-OPEN[d])/20):0;
    const stemTop=ground-(ground-top)*Math.max(.12,grown);
    x.setLineDash(fe?[]:[2,4]); x.strokeStyle=DIVCOL[d]; x.globalAlpha=fe?.75:.3;
    x.beginPath(); x.moveTo(X0,ground); x.lineTo(X0,fe?stemTop:top+30); x.stroke(); x.setLineDash([]); x.globalAlpha=1;
    x.fillStyle=DIVCOL[d]; x.globalAlpha=fe?1:.4; x.fillText(DIVISION_UI[d].label+' '+(frame.perDiv?frame.perDiv[d]:0),X0-10,top-2); x.globalAlpha=1;
    STOPS[d].forEach((s,j)=>{
      const on=act.has(d+':'+s[0]), y=yOf(s[2])-(j%4)*3, side=j%2?1:-1, len=on?20:6;
      if (y<stemTop && !on) return;
      x.strokeStyle=on?FAMCOL[s[3]]:'#22302a'; x.lineWidth=on?1.6:1;
      x.beginPath(); x.moveTo(X0,y); x.lineTo(X0+side*len,y-len*.45); x.stroke(); x.lineWidth=1;
      if (on){ x.fillStyle=FAMCOL[s[3]]; x.textAlign=side>0?'left':'right'; x.fillText(s[1],X0+side*(len+3),y-len*.45+3); x.textAlign='left'; }
    });
  }
  // couplers as clonal integration
  const used=new Set(frame.usedCouplers); let lane=0;
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
