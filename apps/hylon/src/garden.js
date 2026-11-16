// Compact interactive garden surface; sound remains in AudioSystem on the Mac.
export function mountGarden(audio, anchor, run) {
  const button=document.createElement('button');button.id='command-garden';button.textContent='J';button.title='Sound garden · quiet 2′ apex, depth and reverb';button.setAttribute('aria-label',button.title);anchor.after(button);
  const surface=document.createElement('section');surface.className='sound-garden';surface.hidden=true;
  surface.innerHTML='<canvas aria-label="Sound garden · move or touch to plant sounds; vertical position controls depth"></canvas>';
  document.body.append(surface);const canvas=surface.querySelector('canvas');let frame=0;
  canvas.onpointermove=event=>{const r=canvas.getBoundingClientRect();audio.garden?.move((event.clientX-r.left)/r.width,(event.clientY-r.top)/r.height);};
  canvas.onpointerdown=event=>{canvas.setPointerCapture(event.pointerId);canvas.onpointermove(event);};
  function draw(){frame=0;if(!audio.garden?.active){sync();return;}const r=canvas.getBoundingClientRect(),d=devicePixelRatio||1;if(canvas.width!==Math.round(r.width*d)||canvas.height!==Math.round(r.height*d)){canvas.width=Math.round(r.width*d);canvas.height=Math.round(r.height*d);}const ctx=canvas.getContext('2d');ctx.setTransform(d,0,0,d,0,0);ctx.clearRect(0,0,r.width,r.height);for(const b of audio.garden.bursts){const age=(performance.now()-b.at)/7000;if(age<0||age>=1)continue;ctx.strokeStyle=`rgba(174,237,188,${(1-age)*.55})`;ctx.beginPath();ctx.ellipse(b.x*r.width,(.15+b.y*.7)*r.height,2+age*22,2+age*10,0,0,Math.PI*2);ctx.stroke();}frame=requestAnimationFrame(draw);}
  function sync(){const on=!!audio.garden?.active;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));surface.hidden=!on;if(on&&!frame)frame=requestAnimationFrame(draw);if(!on){cancelAnimationFrame(frame);frame=0;}}
  button.onclick=run(async()=>{button.disabled=true;try{await audio.setGarden(!audio.garden?.active);}finally{button.disabled=false;sync();}});
  const timer=setInterval(sync,250);window.addEventListener('pagehide',()=>{clearInterval(timer);cancelAnimationFrame(frame);audio.stopGarden();},{once:true});
  return {sync};
}
