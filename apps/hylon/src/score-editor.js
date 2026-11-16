import './score-editor.css';
const editors=new WeakMap(),escape=value=>value.replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
// LAB sentences (scores 10+): macros, ms-gated chords, psalmody, micro-silences, follower and IMPRO states.
const LAB=/^(?:set|chord|psalm|impro|silence|follow|verse|cresc|exp2|exp3|rhythmicon|bind|lsys|mass|bands|morph|hoquetus|parasite)$/;
export function highlightScore(source){
  return source.split('\n').map(line=>{
    if(/^\s*#/.test(line))return `<span class="score-comment">${escape(line)}</span>`;
    let result='',end=0;
    const tokens=/"(?:[^"\\]|\\.)*"|[+-]?@[A-Za-z]\w*|\$[A-Za-z]\w*|\b-?\d+(?:\.\d+)?\b|->|[={}+,|~?&]|^[ \t]*[A-Za-z][\w-]*/g;
    for(const match of line.matchAll(tokens)){
      const token=match[0],kind=/^(?:pgm|pg)$/.test(token.trim())?'program':LAB.test(token.trim())?'lab':/^[+-]?@/.test(token)?'macro':token.startsWith('"')?'string':token.startsWith('$')?'voice':/^-?\d/.test(token)?'number':token==='->'||/^[={}+,|~?&]$/.test(token)?'operator':'key';
      result+=escape(line.slice(end,match.index))+`<span class="score-${kind}">${escape(token)}</span>`;end=match.index+token.length;
    }
    return result+escape(line.slice(end));
  }).join('\n')+'\n';
}
export function enhanceScoreEditor(textarea){
  if(editors.has(textarea))return editors.get(textarea);
  const shell=document.createElement('div'),paint=document.createElement('pre');shell.className='score-editor-shell';paint.className='score-editor-paint';paint.setAttribute('aria-hidden','true');textarea.before(shell);shell.append(paint,textarea);textarea.dataset.scoreEditor='true';textarea.wrap='off';textarea.spellcheck=false;
  const native=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
  const numbers=document.createElement('pre');numbers.className='score-line-numbers';numbers.setAttribute('aria-hidden','true');shell.append(numbers);let lineCount=0;
  const render=()=>{const text=native.get.call(textarea);paint.innerHTML=highlightScore(text);paint.scrollTop=textarea.scrollTop;paint.scrollLeft=textarea.scrollLeft;const count=text.split('\n').length;if(count!==lineCount){lineCount=count;numbers.textContent=Array.from({length:count},(_,i)=>i+1).join('\n')+'\n';}numbers.scrollTop=textarea.scrollTop;};
  Object.defineProperty(textarea,'value',{configurable:true,get(){return native.get.call(this);},set(value){native.set.call(this,value);render();}});
  // Playback follower: red triangle on the active section, hollow one on the active harmonicity line.
  const gutter=document.createElement('div');gutter.className='score-cursor-gutter';gutter.setAttribute('aria-hidden','true');
  const mark=document.createElement('span');mark.className='score-cursor';const sub=document.createElement('span');sub.className='score-cursor score-cursor-sub';
  gutter.append(mark,sub);shell.append(gutter);shell.classList.add('has-cursor');
  let timedSource=null,timed={sections:[],harmonicity:[]},cursor={t:null,section:-1,harm:-1};
  const parseTimed=text=>{
    if(text===timedSource)return timed;timedSource=text;const sections=[],harmonicity=[];
    text.split('\n').forEach((line,index)=>{
      const sec=line.match(/^\s*section\s+\S+\s+"[^"]*"\s+(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)/);
      if(sec){sections.push({line:index,start:Number(sec[1]),end:Number(sec[2])});return;}
      const rel=line.match(/^\s*section\s+\S+\s+"[^"]*"\s+for\s+(\d+(?:\.\d+)?)/);
      if(rel){const start=sections.length?sections.at(-1).end:0;sections.push({line:index,start,end:start+Number(rel[1])});return;}
      const harm=line.match(/^\s*harmonicity\s+(-?\d+(?:\.\d+)?)\b/);if(harm)harmonicity.push({line:index,time:Number(harm[1])});
    });
    return timed={sections,harmonicity};
  };
  const place=(element,line)=>{
    if(line<0){element.hidden=true;return;}
    const style=getComputedStyle(textarea),height=parseFloat(style.lineHeight)||18,top=parseFloat(style.paddingTop)||10;
    const y=top+line*height-textarea.scrollTop;element.hidden=y<-height||y>textarea.clientHeight;element.style.top=`${y}px`;element.style.height=`${height}px`;
  };
  const placeCursor=()=>{place(mark,cursor.section);place(sub,cursor.harm);};
  function setCursor(t,{follow=false}={}){
    if(!Number.isFinite(t)){cursor={t:null,section:-1,harm:-1};placeCursor();return;}
    const {sections,harmonicity}=parseTimed(native.get.call(textarea));
    const active=sections.find(s=>t>=s.start&&t<s.end)||(sections.length&&t>=sections.at(-1).end?sections.at(-1):null);
    let harm=null;for(const h of harmonicity)if(h.time<=t)harm=h;
    const line=active?active.line:-1,changed=line!==cursor.section;
    cursor={t,section:line,harm:harm?harm.line:-1};
    if(follow&&changed&&line>=0&&document.activeElement!==textarea){
      const height=parseFloat(getComputedStyle(textarea).lineHeight)||18,y=line*height;
      if(y<textarea.scrollTop||y>textarea.scrollTop+textarea.clientHeight-2*height)textarea.scrollTop=Math.max(0,y-textarea.clientHeight/3);
    }
    placeCursor();
  }
  const onScroll=()=>{render();placeCursor();};
  textarea.addEventListener('input',render);textarea.addEventListener('scroll',onScroll);render();
  const api={render,setCursor,dispose(){gutter.remove();numbers.remove();shell.classList.remove('has-cursor');textarea.removeEventListener('scroll',onScroll);textarea.removeEventListener('input',render);textarea.removeEventListener('scroll',render);delete textarea.value;shell.before(textarea);shell.remove();editors.delete(textarea);}};editors.set(textarea,api);return api;
}
export function installScoreHighlights(root=document){
  const selector='textarea[data-score-editor],textarea[data-score-text],textarea[data-editor][aria-label*="score" i]';
  const apply=node=>{if(node.nodeType!==1&&node.nodeType!==9)return;if(node.matches?.(selector))enhanceScoreEditor(node);node.querySelectorAll(selector).forEach(enhanceScoreEditor);};
  apply(root);const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)apply(node);});observer.observe(root,{childList:true,subtree:true});return()=>observer.disconnect();
}
