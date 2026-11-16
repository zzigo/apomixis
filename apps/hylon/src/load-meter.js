// Header load meter. A browser cannot read CPU use, so this measures what matters here: how late
// the main thread runs. MIDI notes leave from a 10 ms tick on that thread; when a 25 ms probe fires
// late, notes are late by about the same amount. Shown: worst lateness of the last 2 s, in ms.
//   < 8 ms phosphor green · 8–20 yellow · 20–40 orange · > 40 red (the gateway drops a note 80 ms late)
// Tooltip: mean lateness, JS heap (Chrome), MIDI queue / dropped notes, audio latency.
import './load-meter.css';
export function mountLoadMeter({getMidi=()=>null,getAudio=()=>null}={}){
 const root=document.createElement('div');root.className='load-meter';root.setAttribute('role','meter');root.setAttribute('aria-label','Main-thread lateness');root.setAttribute('aria-valuemin','0');root.setAttribute('aria-valuemax','80');
 root.innerHTML='<i><b></b></i><span>0</span>';
 const bar=root.querySelector('b'),text=root.querySelector('span'),PERIOD=25,samples=[];let expected=performance.now()+PERIOD,worstEver=0;
 const probe=setInterval(()=>{const now=performance.now(),late=Math.max(0,now-expected);expected=now+PERIOD;if(document.hidden)return;samples.push([now,late]);while(samples.length&&samples[0][0]<now-2000)samples.shift();},PERIOD);
 const hue=ms=>ms<8?130:ms<20?130-(ms-8)/12*75:ms<40?55-(ms-20)/20*35:Math.max(0,20-(ms-40)/20*20);
 const paint=setInterval(()=>{
  if(document.hidden){samples.length=0;expected=performance.now()+PERIOD;return;}
  const worst=samples.reduce((m,s)=>Math.max(m,s[1]),0),mean=samples.length?samples.reduce((a,s)=>a+s[1],0)/samples.length:0;worstEver=Math.max(worstEver,worst);
  const color=`hsl(${hue(worst)} 100% 58%)`;root.style.setProperty('--load',color);bar.style.width=`${Math.min(100,worst/60*100)}%`;text.textContent=String(Math.round(worst));
  root.classList.toggle('critical',worst>=40);root.setAttribute('aria-valuenow',String(Math.round(worst)));
  const midi=getMidi(),audio=getAudio(),heap=performance.memory?`${Math.round(performance.memory.usedJSHeapSize/1048576)} / ${Math.round(performance.memory.jsHeapSizeLimit/1048576)} MB`:'not reported by this browser';
  root.title=`LOAD · main-thread lateness\nworst in 2 s: ${worst.toFixed(1)} ms · mean: ${mean.toFixed(1)} ms · worst since start: ${worstEver.toFixed(0)} ms\nJS heap: ${heap}${midi?`\nMIDI queue ${midi.queued} · held ${midi.active} · dropped ${midi.dropped} · shared ${midi.coalesced}`:''}${audio?.context?`\naudio latency ${Math.round(((audio.context.baseLatency||0)+(audio.context.outputLatency||0))*1000)} ms`:''}\ngreen < 8 · yellow < 20 · orange < 40 · red: notes are audibly late (click to reset the maximum)`;
 },250);
 root.onclick=()=>{worstEver=0;};
 return{element:root,dispose(){clearInterval(probe);clearInterval(paint);root.remove();}};
}
