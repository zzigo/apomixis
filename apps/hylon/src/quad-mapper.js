import { identityQuad, validateQuad } from '../../../packages/hylon-laser/quad.js';
import { projectLaserPoint } from '../../../packages/hylon-laser/profile.js';
export function mountQuadMapper(root, {getProfile, setQuad, onChange=()=>{}, notify=()=>{}}) {
  const canvas=root.querySelector('canvas'), handles=root.querySelector('[data-map-handles]');
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
      let x=((event.clientX-rect.left)/rect.width-.5-p.offsetXPercent/200)/(p.widthPercent/100)+.5;
      let y=((event.clientY-rect.top)/rect.height-.5-p.offsetYPercent/200)/(p.heightPercent/100)+.5;
      if(p.flipX)x=1-x;if(p.flipY)y=1-y;commit(x,y);
    };
    button.onpointerup=button.onpointercancel=()=>{dragging=false;};
    button.onlostpointercapture=()=>{dragging=false;};
    button.onkeydown=event=>{
      const delta={ArrowLeft:[-.01,0],ArrowRight:[.01,0],ArrowUp:[0,-.01],ArrowDown:[0,.01]}[event.key];if(!delta)return;
      event.preventDefault();const p=getProfile(),[x,y]=p.warpQuad[index],step=event.shiftKey?.1:1;
      commit(x+delta[0]*step*(p.flipX?-1:1),y+delta[1]*step*(p.flipY?-1:1));
    };
    return button;
  });
  function sync(p=getProfile(),locked=false){identityQuad().forEach(([x,y],i)=>{const [px,py]=projectLaserPoint(p,x,y);buttons[i].disabled=locked;buttons[i].style.left=`${px*100}%`;buttons[i].style.top=`${py*100}%`;buttons[i].setAttribute('aria-description',`${p.warpQuad[i][0].toFixed(2)}, ${p.warpQuad[i][1].toFixed(2)}`);});}
  root.querySelector('[data-map-reset]').onclick=()=>{setQuad(identityQuad());sync();onChange();};
  sync();return{sync,dispose(){handles.replaceChildren();}};
}
