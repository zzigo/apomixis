import {noteActivity} from './note-activity.js';
import { KNOB } from '../../../packages/hylon-registers/console.js';
import {Renderer,Stave,StaveNote,Accidental,TickContext,ModifierContext} from 'vexflow/bravura';
import {soundingPitches,FOOT_COLORS} from '../../../packages/hylon-registers/sounding-pitches.js';
const WRITTEN='#f1f5f2',KEYS=['c','c#','d','d#','e','f','f#','g','g#','a','a#','b'];
const STAVES=[{clef:'treble',annotation:'8va',shift:12},{clef:'treble',shift:0},{clef:'bass',shift:0},{clef:'bass',annotation:'8vb',shift:-12}];
const ZOOM_KEY='hylon-organ-staff-zoom-v1',STEP=.15;
const lane=pitch=>pitch>=84?0:pitch>=60?1:pitch>=36?2:3;
const spelling=pitch=>{const pc=((pitch%12)+12)%12;return {key:`${KEYS[pc]}/${Math.floor(pitch/12)-1}`,sharp:KEYS[pc].includes('#')};};
export function mountOrganStaff(host){
 const topbar=document.createElement('div');topbar.className='organ-staff-topbar';
 const registers=document.createElement('div');registers.className='organ-staff-registers';registers.setAttribute('aria-label','Active register numbers');
 const tools=document.createElement('div');tools.className='organ-staff-zoom';tools.setAttribute('role','group');tools.setAttribute('aria-label','Staff size');
 const minus=document.createElement('button'),plus=document.createElement('button');minus.textContent='−';plus.textContent='+';
 minus.type=plus.type='button';minus.setAttribute('aria-label','Decrease staff size');plus.setAttribute('aria-label','Increase staff size');
 tools.append(minus,plus);topbar.append(registers,tools);
 const drawing=document.createElement('div');drawing.className='organ-staff-drawing';host.append(topbar,drawing);
 drawing.setAttribute('role','img');drawing.setAttribute('aria-label','Written and nominal sounding organ pitches');
 const notes=new Map(),releases=new Map();let active=[],timer=null,disposed=false,pedal=false,zoom=1,effectiveZoom=1;
 try{const saved=Number(localStorage.getItem(ZOOM_KEY));if(Number.isFinite(saved)&&saved>=.5&&saved<=3)zoom=saved;}catch{}
 function schedule(){if(!disposed&&!timer)timer=setTimeout(()=>{timer=null;draw();},80);}
 function changeZoom(delta){zoom=Math.round(Math.max(.5,Math.min(3,(delta<0?Math.min(zoom,effectiveZoom):zoom)+delta))*100)/100;try{localStorage.setItem(ZOOM_KEY,String(zoom));}catch{}schedule();}
 minus.onclick=()=>changeZoom(-STEP);plus.onclick=()=>changeZoom(STEP);
 function draw(){
  const width=host.clientWidth;if(!width)return;
  registers.replaceChildren();
  for(const n of [...active].sort((a,b)=>a-b)){const knob=KNOB.get(n);if(!knob)continue;const label=document.createElement('span');label.textContent=String(n);label.style.color=FOOT_COLORS[knob.cls];label.title=`${n} ${knob.label}`;registers.append(label);}
  registers.hidden=!registers.childElementCount;
  const availableHeight=host.clientHeight-topbar.offsetHeight-6;if(availableHeight<=0)return;
  const groups=STAVES.map(()=>new Map()),descriptions=[];
  function add(pitch,color,written=false,isPedal=false){if(!Number.isFinite(pitch)||pitch<0||pitch>127)return;const row=written&&isPedal?2:lane(pitch),key=written?'written':color;if(!groups[row].has(key))groups[row].set(key,{color,pitches:new Set(),written});groups[row].get(key).pitches.add(pitch);}
  for(const entry of notes.values()){
   add(entry.note,WRITTEN,true,entry.channel===5);
   for(const result of soundingPitches(entry.note,entry.channel,active)){add(result.pitch,result.color);descriptions.push(`${result.knob} ${result.label}: MIDI ${result.pitch}${result.cents?` (${result.cents>0?'+':''}${result.cents} cents)`:''}${result.mixture?' · mixture model':''}`);}
  }
  // Measure note positions in logical coordinates before laying out the four staves.
  // Clearance includes ledger notes, muted MIDI labels and octave-clef numerals.
  const chords=STAVES.map(()=>[]);
  const bounds=STAVES.map((spec,row)=>{
   const probe=new Stave(1,0,230,{spacing_between_lines_px:7});
   let top=probe.getYForLine(0)-28,bottom=probe.getYForLine(4)+26;
   for(const group of groups[row].values()){
    const pitches=[...group.pitches].sort((a,b)=>a-b),keys=pitches.map(p=>spelling(p-spec.shift));
    const note=new StaveNote({clef:spec.clef,keys:keys.map(k=>k.key),duration:'w',glyph_font_scale:24}).setStave(probe);
    for(const y of note.getYs()){top=Math.min(top,y-12);bottom=Math.max(bottom,y+22);}
    chords[row].push({group,pitches,keys,note});
   }
   return {top,bottom};
  });
  const compact=[4-bounds[0].top],natural=[compact[0]];
  for(let i=1;i<4;i++){
   const clearance=bounds[i-1].bottom-bounds[i].top+6;
   compact.push(compact[i-1]+clearance);natural.push(natural[i-1]+Math.max(98,clearance));
  }
  const compactHeight=compact[3]+bounds[3].bottom+4,naturalHeight=natural[3]+bounds[3].bottom+4;
  const baseScale=Math.min(1.2,width/230,availableHeight/naturalHeight);
  const maximumScale=Math.min(3,width/230,availableHeight/compactHeight);
  const scale=Math.min(baseScale*zoom,maximumScale),logicalWidth=width/scale;effectiveZoom=scale/baseScale;
  const room=availableHeight/scale;
  const spread=naturalHeight===compactHeight?0:Math.max(0,Math.min(1,(room-compactHeight)/(naturalHeight-compactHeight)));
  const positions=compact.map((y,i)=>y+(natural[i]-y)*spread),height=(positions[3]+bounds[3].bottom+4)*scale;
  minus.disabled=zoom<=.5;
  plus.disabled=zoom>=3||Math.min(baseScale*(zoom+STEP),maximumScale)<=scale+.001;
  minus.title=`Decrease staff size · ${Math.round(scale*100)}%`;
  plus.title=plus.disabled?'Maximum staff size that fits this pod':`Increase staff size · ${Math.round(scale*100)}%`;
  drawing.replaceChildren();const renderer=new Renderer(drawing,Renderer.Backends.SVG);renderer.resize(width,height);drawing.style.height=`${height}px`;
  const ctx=renderer.getContext();ctx.scale(scale,scale);ctx.setFillStyle('#71877a');ctx.setStrokeStyle('#354b3d');
  const staves=STAVES.map((spec,i)=>new Stave(1,positions[i],logicalWidth-3,{spacing_between_lines_px:7}).addClef(spec.clef,'small').setContext(ctx));
  staves.forEach((stave,index)=>{
   const extreme=index===0||index===3;
   ctx.save();ctx.setFillStyle(extreme?'#607165':'#9aafa0');ctx.setStrokeStyle(extreme?'#26372d':'#405b49');stave.draw();
   if(extreme){ctx.setFont('serif',10);ctx.setFillStyle('#7d9283');ctx.fillText('8',stave.getX()+14,index===0?stave.getYForLine(0)-16:stave.getYForLine(4)+16);}ctx.restore();
  });
  const colors=Object.values(FOOT_COLORS),midiLabels=[];
  for(let row=0;row<4;row++)for(const {group,pitches,keys,note} of chords[row]){
   keys.forEach((key,i)=>{note.setKeyStyle(i,{fillStyle:group.color,strokeStyle:group.color});if(key.sharp)note.addModifier(new Accidental('#').setStyle({fillStyle:group.color,strokeStyle:group.color}),i);});
   note.setStyle({fillStyle:group.color,strokeStyle:group.color});note.setStave(staves[row]);
   const modifiers=new ModifierContext();note.addToModifierContext(modifiers);modifiers.preFormat();
   const resultRoom=Math.max(0,logicalWidth-staves[row].getNoteStartX()-70);
   const x=group.written?12:42+Math.max(0,colors.indexOf(group.color))*resultRoom/Math.max(1,colors.length-1);
   new TickContext().addTickable(note).preFormat().setX(x);note.setContext(ctx).draw();
   note.getYs().forEach((y,index)=>{const head=note.noteHeads[index];midiLabels.push({text:String(pitches[index]),x:head.getAbsoluteX()+head.getGlyphWidth()/2,y:y+12});});
  }
  ctx.save();ctx.setFont('monospace',7);ctx.setFillStyle('#718175');
  for(const label of midiLabels)ctx.fillText(label.text,label.x-ctx.measureText(label.text).width/2,label.y);ctx.restore();
  drawing.title=`${pedal?'PEDAL · bass notation':'MANUAL · written pitch'} / white=W, colours=nominal stop pitches\n${[...new Set(descriptions)].join('\n')}\nAll-source note activity · brief attacks held visually for100ms · not a hardware delivery confirmation. Mixture breaks and recorded acoustic pitches are unverified.`;
  drawing.setAttribute('aria-label',drawing.title);
 }
 const resize=new ResizeObserver(schedule);resize.observe(host);schedule();
 const view={noteOn(owner,note,channel=1){if(!Number.isInteger(note)||note<0||note>127)return;clearTimeout(releases.get(owner));releases.delete(owner);notes.set(owner,{note,channel,shownAt:performance.now()});pedal=channel===5;schedule();},noteOff(owner){const entry=notes.get(owner);if(!entry)return;clearTimeout(releases.get(owner));const finish=()=>{releases.delete(owner);notes.delete(owner);if(notes.size)pedal=[...notes.values()].at(-1).channel===5;schedule();};const wait=100-(performance.now()-entry.shownAt);if(wait>0)releases.set(owner,setTimeout(finish,wait));else finish();},clearChannel(channel){for(const [owner,note]of notes)if(note.channel===channel)notes.delete(owner);schedule();},clear(){notes.clear();schedule();},setRegistration(knobs){active=[...new Set(knobs)];schedule();},setPedal(value){pedal=!!value;schedule();},dispose(){unsubscribe();for(const timer of releases.values())clearTimeout(timer);releases.clear();disposed=true;clearTimeout(timer);resize.disconnect();minus.onclick=plus.onclick=null;host.replaceChildren();}};
 const unsubscribe=noteActivity.subscribe((kind,owner,entry)=>kind==='on'?view.noteOn(owner,entry.note,entry.channel):view.noteOff(owner));
 return view;
}
