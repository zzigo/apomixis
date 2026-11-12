import { identityQuad, validateQuad } from '../../../packages/hylon-laser/quad.js';
export function mountQuadMapper(root, {getProfile, setQuad, onChange=()=>{}, isEnabled=()=>true, notify=()=>{}}) {
  const canvas=root.querySelector('canvas'), handles=root.querySelector('[data-map-handles]');
  const outline=root.querySelector('[data-map-outline]');
  const names=['top left','top right','bottom right','bottom left'];
  const buttons=names.map((name,index)=>{
    const button=document.createElement('button');button.type='button';button.className='map-corner';button.title=`Mapping ${name} · drag or arrow keys`;button.setAttribute('aria-label',`Mapping ${name}`);handles.append(button);
    let dragging=false;
    const commit=(x,y)=>{
      const next=(getProfile().warpQuad||identityQuad()).map(p=>[...p]);next[index]=[Math.max(0,Math.min(1,x)),Math.max(0,Math.min(1,y))];
      try {validateQuad(next);setQuad(next);sync();onChange();}catch(error){if(!dragging)notify(error.message);}
    };
    button.onpointerdown=event=>{event.preventDefault();dragging=true;button.setPointerCapture(event.pointerId);};
    button.onpointermove=event=>{
      if(!dragging)return;const rect=canvas.getBoundingClientRect(),p=getProfile();
      const x=(event.clientX-rect.left)/rect.width,y=(event.clientY-rect.top)/rect.height;
      commit(x,y);
    };
    button.onpointerup=button.onpointercancel=()=>{dragging=false;};
    button.onlostpointercapture=()=>{dragging=false;};
    button.onkeydown=event=>{
      const delta={ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,-.01],ArrowDown:[0,.01]}[event.key];if(!delta)return;
      event.preventDefault();const p=getProfile(),[x,y]=p.warpQuad[index],step=event.shiftKey?.1:1;
      commit(x+delta[0]*step,y+delta[1]*step);
    };
    return button;
  });
  function sync(p=getProfile(),locked=false){
    const enabled=isEnabled();handles.hidden=!enabled;outline.hidden=!enabled;outline.toggleAttribute('hidden',!enabled);
    outline.querySelector('polygon').setAttribute('points',p.warpQuad.map(([x,y])=>`${x*100},${y*100}`).join(' '));
    p.warpQuad.forEach(([px,py],i)=>{buttons[i].disabled=locked||!enabled;buttons[i].style.left=`${px*100}%`;buttons[i].style.top=`${py*100}%`;buttons[i].setAttribute('aria-description',`${px.toFixed(2)}, ${py.toFixed(2)}`);});
  }
  root.querySelector('[data-map-reset]').onclick=()=>{setQuad(identityQuad());sync();onChange();};
  sync();return{sync,dispose(){handles.replaceChildren();}};
}
