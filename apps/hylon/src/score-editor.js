import './score-editor.css';
const editors=new WeakMap(),escape=value=>value.replace(/[&<>]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[ch]));
export function highlightScore(source){
  return source.split('\n').map(line=>{
    if(/^\s*#/.test(line))return `<span class="score-comment">${escape(line)}</span>`;
    let result='',end=0;
    const tokens=/"(?:[^"\\]|\\.)*"|\$[A-Za-z]\w*|\b-?\d+(?:\.\d+)?\b|->|=|^[ \t]*[A-Za-z][\w-]*/g;
    for(const match of line.matchAll(tokens)){
      const token=match[0],kind=token.startsWith('"')?'string':token.startsWith('$')?'voice':/^-?\d/.test(token)?'number':token==='->'||token==='='?'operator':'key';
      result+=escape(line.slice(end,match.index))+`<span class="score-${kind}">${escape(token)}</span>`;end=match.index+token.length;
    }
    return result+escape(line.slice(end));
  }).join('\n')+'\n';
}
export function enhanceScoreEditor(textarea){
  if(editors.has(textarea))return editors.get(textarea);
  const shell=document.createElement('div'),paint=document.createElement('pre');shell.className='score-editor-shell';paint.className='score-editor-paint';paint.setAttribute('aria-hidden','true');textarea.before(shell);shell.append(paint,textarea);textarea.dataset.scoreEditor='true';textarea.wrap='off';textarea.spellcheck=false;
  const native=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value');
  const render=()=>{paint.innerHTML=highlightScore(native.get.call(textarea));paint.scrollTop=textarea.scrollTop;paint.scrollLeft=textarea.scrollLeft;};
  Object.defineProperty(textarea,'value',{configurable:true,get(){return native.get.call(this);},set(value){native.set.call(this,value);render();}});
  textarea.addEventListener('input',render);textarea.addEventListener('scroll',render);render();
  const api={render,dispose(){textarea.removeEventListener('input',render);textarea.removeEventListener('scroll',render);delete textarea.value;shell.before(textarea);shell.remove();editors.delete(textarea);}};editors.set(textarea,api);return api;
}
export function installScoreHighlights(root=document){
  const selector='textarea[data-score-editor],textarea[data-score-text],textarea[data-editor][aria-label*="score" i]';
  const apply=node=>{if(node.nodeType!==1&&node.nodeType!==9)return;if(node.matches?.(selector))enhanceScoreEditor(node);node.querySelectorAll(selector).forEach(enhanceScoreEditor);};
  apply(root);const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)apply(node);});observer.observe(root,{childList:true,subtree:true});return()=>observer.disconnect();
}
