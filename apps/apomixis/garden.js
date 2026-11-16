// GARDEN · public view v2. Every note in the live frame makes something grow, shaped by the
// reproduction mode of the moment; concepts flicker softly; the lyric stays in its HTML overlay.
// The audience's touch only changes this screen (docs: 02_SPORE_EVOMUSART §5), with one exception:
// in 01 SPORE a hold-and-release is sent to the organ (relay-limited; the composer must enable PÚBLICO).
const DIVS=['so','re','po','go','pe'],SITE={so:.12,re:.31,po:.5,go:.69,pe:.88},SUB={go:4,po:5,re:3,so:7,pe:2};
const PHRASES={
  tutti:['semilla sin padre','la madre se repite','clon','agamospermia','todos a la vez'],
  striated:['entrenudo','enraizar a distancia','la misma planta, más lejos','estolón','paso a paso'],
  hocket:['bajo tierra','brotar donde no se espera','una red sin centro','rizoma','alternar'],
  granulation:['cada fragmento vive','romperse es multiplicarse','fragmentación','polvo fértil'],
  sat:['yema','bulbilo','la hija pegada a la madre','poliembrionía'],
  tuber:['dormancia','reserva','esperar bajo tierra','tubérculo']};
const HINT={1:'mantené presionado y soltá',2:'pellizcá: del grano al campo',3:'tocá para estar',4:'quedate quieto',5:'arrastrá un estolón',6:'tenés tres toques',7:'cada toque, un primordio',8:'tocá el suelo para ver las raíces',9:'atrapá una semilla y soplala'};
const GOLDEN=137.508*Math.PI/180;
// Per-piece look, kept small: background tint from the piece hue (same hues as HYLON's score buttons)
// and a camera (zoom z, focus fx/fy as fractions of the screen; breath = slow zoom swing).
const PIECE_HUE={1:78,2:50,3:325,4:252,5:355,6:186,7:135,8:26,9:208};
const CAMERA={
  1:{z:1,fx:.5,fy:.5},                    // spore: the whole field, dispersal
  2:{z:1.12,fx:.5,fy:.48},                // grain: a little closer (pinch still works)
  3:{z:.92,fx:.5,fy:.58},                 // flower from humus: wider, weight on the soil
  4:{z:1,fx:.5,fy:.5,breath:.025,period:7.5}, // dream track: a slow breath
  5:{z:.88,fx:.5,fy:.52},                 // polygonum: room for every manual
  6:{z:1,fx:.5,fy:.5,grow:.3,span:452},   // oosphere: closes in over the whole piece
  7:{z:1.18,fx:.5,fy:.38},                // phyllotaxis: on the spiral
  8:{z:1.22,fx:.5,fy:.66},                // protospore: down into the roots
  9:{z:.95,fx:.5,fy:.42}};                // microspore: lifted, air
export function createGarden(canvas,{onRelease=null}={}){
  const cx=canvas.getContext('2d'),agents=[],words=[],seen=new Map(),sites={},pointers=new Map(),phyllo=[],free=[];
  const heard=new Map();
  let w=0,h=0,s=1,ground=0,active=false,frame=null,piece,zoom=1,lastInput=performance.now(),nextWord=0,nextSeed=0,lastBud=0,lastTuber=0;
  let charge=null,drag=null,caught=null,count=0;
  let camZ=1,camX=.5,camY=.5,bgH=150,bgS=20,bgL=4;
  const now=()=>performance.now(),rnd=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
  const hue=g=>90+((g*47)%110),col=(hh,a,l=62)=>`hsla(${hh},45%,${l}%,${Math.max(0,a)})`;
  function resize(){
    const r=canvas.getBoundingClientRect(),d=Math.min(2,devicePixelRatio||1);w=r.width;h=r.height;if(!w||!h)return;
    canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);cx.setTransform(d,0,0,d,0,0);
    s=Math.max(.6,Math.min(1.6,Math.min(w,h)/600));ground=h*.6;
    for(const div of DIVS){const st=sites[div]||(sites[div]={dir:div==='so'||div==='re'?1:-1,tip:null,rh:[],last:null});st.x=w*SITE[div];}
  }
  new ResizeObserver(()=>{if(active)resize();}).observe(canvas);
  function spawn(e){
    const st=sites[e.div];if(!st||agents.length>700)return;const hh=hue(e.g),t=now();
    if(e.k===2){lastTuber=t;agents.push({type:'tuber',x:st.x+rnd(-20,20)*s,y:ground+rnd(30,60)*s,born:t,life:(e.l+20)*1000,grow:Math.max(1,e.l)*1000,r:rnd(14,26)*s,h:hh});return;}
    if(e.k===1){lastBud=t;const at=st.last||{x:st.x,y:ground-20*s};agents.push({type:'bud',x:at.x+rnd(-10,10)*s,y:at.y+rnd(-12,6)*s,ax:at.x,ay:at.y,born:t,life:18000,h:hh});return;}
    const tex=e.x||frame?.garden?.tex;heard.set(tex,t);
    if(tex==='tutti'){const x=st.x+rnd(-40,40)*s,y=ground-rnd(40,110)*s;agents.push({type:'head',x,y,born:t,life:11000,h:hh,n:9+Math.floor(Math.random()*5),r:rnd(9,16)*s,released:false});st.last={x,y};}
    else if(tex==='striated'){
      const step=(8+SUB[e.div]*6)*s;let from=st.tip||{x:st.x,y:ground},x=from.x+st.dir*step;
      if(x<-10||x>w+10){st.dir*=-1;from={x:st.x,y:ground};x=st.x+st.dir*step;}
      const y=ground+rnd(-2,2)*s;agents.push({type:'node',fx:from.x,fy:from.y,x,y,born:t,life:40000,h:hh,leaf:rnd(5,9)*s,side:Math.random()<.5?-1:1});st.tip={x,y};st.last={x,y:y-6*s};
    } else if(tex==='hocket'){
      const base=st.rh.length&&Math.random()<.85?pick(st.rh):{x:st.x,y:ground+10*s},a=rnd(-.6,.6)+(Math.random()<.5?0:Math.PI),len=rnd(15,35)*s;
      const x=base.x+Math.cos(a)*len,y=Math.max(ground+8*s,Math.min(h-20,base.y+Math.abs(Math.sin(a))*len*(Math.random()<.6?1:-1)));
      st.rh.push({x,y});if(st.rh.length>40)st.rh.shift();const shoot=Math.random()<.28?rnd(20,70)*s:0;
      agents.push({type:'rh',fx:base.x,fy:base.y,x,y,born:t,life:45000,h:hh,shoot});if(shoot)st.last={x,y:ground-shoot};
    } else {
      const x=st.x+rnd(-70,70)*s,y=ground-rnd(30,140)*s,dots=Array.from({length:3+Math.floor(Math.random()*4)},()=>({dx:rnd(-5,5)*s,dy:rnd(-4,4)*s,r:rnd(.8,2)*s}));
      agents.push({type:'moss',x,y,vy:rnd(6,14)*s,born:t,life:14000,h:hh,dots});st.last={x,y};
    }
  }
  function draw(a,t){
    const age=t-a.born,f=age/a.life;if(f>=1)return false;const fade=f<.8?1:1-(f-.8)/.2;cx.lineWidth=1;
    switch(a.type){
      case 'head':{const g=Math.min(1,age/1200);cx.strokeStyle=col(a.h,.5*fade);cx.beginPath();cx.moveTo(a.x,ground);cx.quadraticCurveTo(a.x+6*s,(ground+a.y)/2,a.x,a.y);cx.stroke();
        if(!a.released&&age>2600){a.released=true;for(let i=0;i<3;i++)agents.push({type:'seed',x:a.x,y:a.y,vx:rnd(4,18)*s,vy:-rnd(6,16)*s,born:t,life:9000,h:a.h,ph:Math.random()*6});}
        cx.strokeStyle=col(a.h,.75*fade,72);for(let i=0;i<a.n;i++){const an=i/a.n*Math.PI*2;cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(a.x+Math.cos(an)*a.r*g,a.y+Math.sin(an)*a.r*g);cx.stroke();}break;}
      case 'seed':{const q=age/1000,x=a.x+a.vx*q+Math.sin(q*1.7+a.ph)*6*s,y=a.y+a.vy*q;cx.strokeStyle=col(a.h,.6*fade,78);cx.beginPath();cx.moveTo(x,y);cx.lineTo(x,y+6*s);for(const d of[-1,0,1]){cx.moveTo(x,y);cx.lineTo(x+d*3*s,y-3*s);}cx.stroke();break;}
      case 'node':{const g=Math.min(1,age/700);cx.strokeStyle=col(a.h,.55*fade);cx.lineWidth=1.2;cx.beginPath();cx.moveTo(a.fx,a.fy);cx.quadraticCurveTo((a.fx+a.x)/2,Math.min(a.fy,a.y)-5*s,a.fx+(a.x-a.fx)*g,a.fy+(a.y-a.fy)*g);cx.stroke();cx.lineWidth=1;
        if(g>=1){const lg=Math.min(1,(age-700)/900);cx.fillStyle=col(a.h,.5*fade,55);cx.beginPath();cx.ellipse(a.x+a.side*a.leaf*.6*lg,a.y-a.leaf*.7*lg,a.leaf*.55*lg+.1,a.leaf*.25*lg+.1,a.side*-.6,0,7);cx.fill();
          cx.strokeStyle=col(a.h,.35*fade,45);cx.beginPath();for(const d of[-1,0,1]){cx.moveTo(a.x,a.y);cx.lineTo(a.x+d*3*s,a.y+9*s*lg);}cx.stroke();}break;}
      case 'rh':{const g=Math.min(1,age/900);cx.strokeStyle=col(a.h,.42*fade,48);cx.beginPath();cx.moveTo(a.fx,a.fy);cx.lineTo(a.fx+(a.x-a.fx)*g,a.fy+(a.y-a.fy)*g);cx.stroke();cx.fillStyle=col(a.h,.5*fade,55);cx.beginPath();cx.arc(a.x,a.y,1.6*s,0,7);cx.fill();
        if(a.shoot&&age>900){const sg=Math.min(1,(age-900)/1500),top=ground-a.shoot*sg;cx.strokeStyle=col(a.h,.55*fade,62);cx.beginPath();cx.moveTo(a.x,a.y);cx.lineTo(a.x,top);cx.stroke();cx.beginPath();cx.arc(a.x,top,2.2*s*sg+.1,0,7);cx.stroke();}break;}
      case 'moss':{const y=Math.min(ground-2*s,a.y+a.vy*age/1000);cx.fillStyle=col(a.h,.6*fade,58);for(const d of a.dots){cx.beginPath();cx.arc(a.x+d.dx,y+d.dy,d.r,0,7);cx.fill();}break;}
      case 'bud':{const g=Math.min(1,age/500);cx.strokeStyle=col(a.h,.4*fade);cx.beginPath();cx.moveTo(a.ax,a.ay);cx.lineTo(a.x,a.y);cx.stroke();cx.fillStyle=col(a.h,.75*fade,70);cx.beginPath();cx.arc(a.x,a.y,2.4*s*g+.1,0,7);cx.fill();
        if(age<1400){cx.strokeStyle=col(a.h,.5*(1-age/1400),80);cx.beginPath();cx.arc(a.x,a.y,2.4*s+age/1400*10*s,0,7);cx.stroke();}break;}
      case 'tuber':{const g=Math.min(1,age/a.grow),br=1+.06*Math.sin(age/900);cx.strokeStyle=col(a.h,.45*fade,55);cx.fillStyle=col(a.h,.12*fade,40);cx.beginPath();cx.ellipse(a.x,a.y,a.r*g*br+.1,a.r*.6*g*br+.1,0,0,7);cx.fill();cx.stroke();break;}
      case 'pulse':{cx.strokeStyle=col(a.h,.6*(1-f),78);cx.lineWidth=a.lw||1;cx.beginPath();cx.arc(a.x,a.y,a.r0+(a.r1-a.r0)*f,0,7);cx.stroke();break;}
      case 'spore':{const q=age/1000;cx.fillStyle=col(a.h,.8*(1-f),80);cx.beginPath();cx.arc(a.x+a.vx*q,a.y+a.vy*q+20*s*q*q,1.5*s,0,7);cx.fill();break;}
      case 'runner':{cx.strokeStyle=col(a.h,.6*fade,64);cx.lineWidth=1.3;cx.beginPath();cx.moveTo(a.fx,a.fy);cx.lineTo(a.x,a.y);cx.stroke();cx.lineWidth=1;const lg=Math.min(1,age/800);cx.strokeStyle=col(a.h,.4*fade,48);cx.beginPath();for(const d of[-1,0,1]){cx.moveTo(a.x,a.y);cx.lineTo(a.x+d*3*s,a.y+10*s*lg);}cx.stroke();break;}
      case 'word':{const fl=.85+.15*Math.sin(age/170+a.x);cx.fillStyle=`rgba(182,255,207,${Math.sin(Math.PI*f)*.6*fl})`;cx.font=`${a.size}px ui-monospace,SFMono-Regular,monospace`;cx.textAlign=a.align||'left';cx.fillText(a.text,a.x,a.y);cx.textAlign='left';break;}
    }
    return true;
  }
  function word(t){
    if(t<nextWord||words.length>=3||!frame?.garden)return;nextWord=t+rnd(2500,5000);const g=frame.garden;let text;
    if(Math.random()<.6){const keys=[...heard].filter(([,at])=>t-at<8000).map(([k])=>k);if(!keys.length)keys.push(g.tex);if(t-lastBud<8000)keys.push('sat');if(t-lastTuber<12000)keys.push('tuber');text=pick(PHRASES[pick(keys)]);}
    else text=pick([`μ ${g.mu.toFixed(2)}`,`entropía ${g.H.toFixed(1)} bits`,`${g.geno} linajes`,`generación ${g.gen}`,`población ${g.pop}`,`gemación ${Math.round(g.poly*100)} %`]);
    const under=Math.random()<.3;words.push({type:'word',text,x:rnd(.06,.7)*w,y:under?rnd(ground+30*s,h*.8):rnd(h*.1,ground-30*s),born:t,life:rnd(6000,9500),size:Math.round(11+3*s)});
  }
  function onPiece(){
    phyllo.length=0;free.length=0;count=0;charge=drag=caught=null;zoom=1;
    if(piece===6)count=Number(sessionStorage.getItem('apomixis-taps-6')||0);
    if(HINT[piece])words.push({type:'word',text:HINT[piece],x:w/2,y:h*.12,align:'center',born:now(),life:7000,size:Math.round(12+3*s)});
  }
  // Touches are mapped into the garden's space (camera zoom/focus), so they land where they are drawn.
  const point=e=>{const r=canvas.getBoundingClientRect(),z=zoom*camZ||1;return{x:(e.clientX-r.left-w/2)/z+w*camX,y:(e.clientY-r.top-h/2)/z+h*camY};};
  canvas.style.touchAction='none';
  canvas.addEventListener('pointerdown',e=>{
    if(!active)return;lastInput=now();const p=point(e);pointers.set(e.pointerId,{...p,t:now()});canvas.setPointerCapture?.(e.pointerId);const t=now();
    if(piece===1)charge={...p,start:t};
    else if(piece===3)agents.push({type:'pulse',x:p.x,y:p.y,r0:4,r1:40*s,born:t,life:1500,h:130});
    else if(piece===5)drag={...p};
    else if(piece===6){if(count<3){count++;sessionStorage.setItem('apomixis-taps-6',String(count));agents.push({type:'pulse',x:p.x,y:p.y,r0:6,r1:Math.max(w,h),born:t,life:2600,h:120,lw:2});}}
    else if(piece===7)phyllo.push({born:t});
    else if(piece===9){const c=free.find(sd=>!sd.caught&&Math.hypot(sd.x-p.x,sd.y-p.y)<34*s);if(c){c.caught=true;c.vx=c.vy=0;caught={seed:c,id:e.pointerId,p,t};}}
    else if(piece!==2&&piece!==4&&piece!==8)for(let i=0;i<4;i++)agents.push({type:'bud',x:p.x+rnd(-14,14)*s,y:p.y+rnd(-14,14)*s,ax:p.x,ay:p.y,born:t,life:6000,h:hue(i+7)});
  });
  canvas.addEventListener('pointermove',e=>{
    if(!active||!pointers.has(e.pointerId))return;lastInput=now();const p=point(e),prev=pointers.get(e.pointerId);
    if(piece===2&&pointers.size===2){const [a,b]=[...pointers.values()],other=a===prev?b:a,d0=Math.hypot(prev.x-other.x,prev.y-other.y),d1=Math.hypot(p.x-other.x,p.y-other.y);if(d0>10)zoom=Math.max(.6,Math.min(3,zoom*d1/d0));}
    if(piece===5&&drag&&Math.hypot(p.x-drag.x,p.y-drag.y)>=28*s){agents.push({type:'runner',fx:drag.x,fy:drag.y,x:p.x,y:p.y,born:now(),life:25000,h:150});drag={...p};}
    if(caught?.id===e.pointerId){caught.seed.x=p.x;caught.seed.y=p.y;caught.v={x:(p.x-caught.p.x)/Math.max(1,now()-caught.t)*1000,y:(p.y-caught.p.y)/Math.max(1,now()-caught.t)*1000};caught.p=p;caught.t=now();}
    pointers.set(e.pointerId,{...p,t:now()});
  });
  const up=e=>{
    pointers.delete(e.pointerId);if(!active)return;const t=now();
    if(piece===1&&charge){const held=Math.min(1,(t-charge.start)/1500),k=6+Math.round(held*30);for(let i=0;i<k;i++){const an=Math.random()*Math.PI*2,v=rnd(30,90+120*held)*s;agents.push({type:'spore',x:charge.x,y:charge.y,vx:Math.cos(an)*v,vy:Math.sin(an)*v,born:t,life:3000,h:110});}agents.push({type:'pulse',x:charge.x,y:charge.y,r0:8,r1:(40+120*held)*s,born:t,life:900,h:110,lw:1.5});count+=k;{const feel=frame?.garden?.pub?.feel,pulse=feel?Math.round(feel[0]+(feel[1]-feel[0])*held):0;if(pulse>0)try{navigator.vibrate?.(pulse);}catch{}}try{onRelease?.(Math.round(held*100)/100);}catch{}charge=null;}
    if(piece===5)drag=null;
    if(caught?.id===e.pointerId){const sd=caught.seed;sd.caught=false;sd.thrown=true;sd.vx=Math.max(-900,Math.min(900,caught.v?.x||60));sd.vy=Math.max(-900,Math.min(900,caught.v?.y||-60));count++;caught=null;}
  };
  canvas.addEventListener('pointerup',up);canvas.addEventListener('pointercancel',up);
  canvas.addEventListener('wheel',e=>{if(active&&piece===2){e.preventDefault();zoom=Math.max(.6,Math.min(3,zoom*Math.exp(-e.deltaY*.001)));}},{passive:false});
  function overlays(t){
    if(piece===1&&charge){const held=Math.min(1,(t-charge.start)/1500);cx.strokeStyle=col(110,.4+.4*held,78);cx.lineWidth=1+held*2;cx.beginPath();cx.arc(charge.x,charge.y,6+held*40*s,0,7);cx.stroke();cx.lineWidth=1;}
    if(piece===7){const c={x:w/2,y:ground-h*.22};phyllo.forEach((p,i)=>{const n=i+1,r=7*s*Math.sqrt(n),an=n*GOLDEN,g=Math.min(1,(t-p.born)/600);cx.fillStyle=col(95+(n*3)%60,.75,64);cx.beginPath();cx.arc(c.x+Math.cos(an)*r,c.y+Math.sin(an)*r,(2+Math.min(3,n/40))*s*g+.1,0,7);cx.fill();});}
    if(piece===9){
      if(t>nextSeed&&free.length<14){nextSeed=t+rnd(900,1800);free.push({x:-10,y:rnd(.12,.5)*h,vx:rnd(20,40)*s,vy:0,ph:Math.random()*6,born:t});}
      for(let i=free.length-1;i>=0;i--){const sd=free[i];if(!sd.caught){const dt=1/60;sd.x+=sd.vx*dt;sd.y+=(sd.vy+Math.sin((t-sd.born)/600+sd.ph)*8*s)*dt;if(sd.thrown){sd.vx*=.995;sd.vy*=.995;}}
        if(sd.x>w+30||sd.x<-40||sd.y<-40||sd.y>h+40){free.splice(i,1);continue;}
        cx.strokeStyle=col(80,.75,80);cx.beginPath();cx.moveTo(sd.x,sd.y);cx.lineTo(sd.x,sd.y+7*s);for(const d of[-1,-.5,0,.5,1]){cx.moveTo(sd.x,sd.y);cx.lineTo(sd.x+d*4*s,sd.y-4*s);}cx.stroke();}
    }
  }
  function screen(t){
    if(piece===4){const still=Math.max(0,Math.min(1,(t-lastInput-5000)/20000));if(still>0){const g=cx.createRadialGradient(w/2,h*.45,0,w/2,h*.45,Math.max(w,h)*.7);g.addColorStop(0,`rgba(182,255,207,${.18*still})`);g.addColorStop(1,'rgba(182,255,207,0)');cx.fillStyle=g;cx.fillRect(0,0,w,h);}}
    if(piece===8){const p=[...pointers.values()][0];cx.fillStyle=`hsla(${bgH},${bgS}%,${bgL}%,.9)`;cx.beginPath();cx.rect(-w,-h,3*w,3*h);if(p)cx.arc(p.x,p.y,80*s,0,7,true);cx.fill('evenodd');}
    const label={1:'esporas liberadas',6:'toques',7:'primordios',9:'semillas en vuelo'}[piece];
    if(label){const n=piece===7?phyllo.length:piece===6?`${count}/3`:count;cx.fillStyle='rgba(112,133,120,.85)';cx.font='10px ui-monospace,SFMono-Regular,monospace';cx.fillText(`${label} ${n}`,10,16);}
  }
  function loop(){
    requestAnimationFrame(loop);if(!active||!w)return;const t=now();cx.clearRect(0,0,w,h);
    const H=PIECE_HUE[piece],cam=CAMERA[piece]||{z:1,fx:.5,fy:.5},k=.02;
    if(H!==undefined){let dh=((H-bgH+540)%360)-180;bgH=(bgH+dh*k+360)%360;bgS+=(38-bgS)*k;bgL+=(6-bgL)*k;}else{bgS+=(20-bgS)*k;bgL+=(4-bgL)*k;}
    cx.fillStyle=`hsl(${bgH},${bgS}%,${bgL}%)`;cx.fillRect(0,0,w,h);
    cx.fillStyle=`hsla(${bgH},${bgS*.8}%,${bgL+5}%,.55)`;cx.fillRect(0,ground,w,h-ground);cx.strokeStyle=`hsla(${bgH},30%,${bgL+18}%,.8)`;cx.beginPath();cx.moveTo(0,ground+.5);cx.lineTo(w,ground+.5);cx.stroke();
    const sec=Number(frame?.time)||0;let tz=cam.z;if(cam.breath)tz*=1+cam.breath*Math.sin(2*Math.PI*sec/cam.period);if(cam.grow)tz*=1+cam.grow*Math.min(1,sec/cam.span);
    camZ+=(tz-camZ)*.015;camX+=(cam.fx-camX)*.015;camY+=(cam.fy-camY)*.015;
    if(piece!==2)zoom+=(1-zoom)*.05;
    cx.save();cx.translate(w/2,h/2);cx.scale(zoom*camZ,zoom*camZ);cx.translate(-w*camX,-h*camY);
    for(let i=agents.length-1;i>=0;i--)if(!draw(agents[i],t))agents.splice(i,1);
    overlays(t);cx.restore();
    word(t);for(let i=words.length-1;i>=0;i--)if(!draw(words[i],t))words.splice(i,1);
    screen(t);
  }
  requestAnimationFrame(loop);
  return{
    update(f){
      frame=f;const g=f?.garden;if(!g)return;if(g.piece!==piece){piece=g.piece;onPiece();}
      for(const [k,v] of seen)if(v<f.time-6)seen.delete(k);
      for(const e of g.ev){const key=`${e.t}:${e.div}:${e.g}:${e.k}`;if(seen.has(key))continue;seen.set(key,e.t);if(active)spawn(e);}
    },
    setActive(on){if(on===active)return;active=on;if(on){resize();lastInput=now();}},
  };
}
