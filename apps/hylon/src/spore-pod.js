import {noteActivity} from './note-activity.js';
import {registration} from '../../../packages/hylon-registers/score-registration.js';
import {registrationSignature} from '../../../packages/hylon-registers/score-programs.js';
import { morphologyState } from '../../../packages/hylon-visuals/morphology.js';
import { SCORE_ALIASES, normalizeScoreFile, describeScore, compareScoreFiles } from './score-catalog.js';
import { validParameter } from '../remote/schema.js';
import { decorateOutputControl } from './output-controls.js';
import scoreText from '../../../scores/01-SPORE-score.txt?raw';
import {enhanceScoreEditor} from './score-editor.js';
const scoreSources=import.meta.glob('../../../scores/*.txt',{query:'?raw',import:'default',eager:true});
const scoreFiles=Object.fromEntries(Object.entries(scoreSources).map(([path,text])=>[path.split('/').at(-1),text]));
import { compileSporeText } from '../../../packages/spore/text-score.js';
import { CATALOG } from '../../../packages/spore/catalog.js';
import { harmonicityAt, elongationAt, ambitusAt } from '../../../packages/spore/score.js';
import { createSporeGenerator } from '../../../packages/spore/engine.js';
import { attachAlgoLayer } from '../../../packages/hylon-algos/layer.js';
import { lyricsAt } from '../../../packages/hylon-visuals/lyrics.js';
import { createSporeAudition } from '../../../packages/spore/audition.js';
import { createGeneratorTransport } from '../../../packages/hylon-runtime/transport.js';
import { createSporeRenderer } from './spore-renderer.js';
import { createNoteLabPlayer } from './note-lab-player.js';
import { createPublicForm, publicNotes } from '../../../packages/hylon-public/sentence.js';
import './spore.css';
const formatTime = t => { const seconds=Math.max(0,Math.floor(t)); return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; };
const SAVE_KEY = 'hylon-score-draft:';
export function mountSpore(container, { audio, midiOut, sampler, laser, onOutputChange = () => {}, prepareRegistration=async()=>{},onRegistrationCue=()=>{},onRegistrationPreview=()=>{},onSection=()=>{}, notify = () => {} } = {}) {
  container.innerHTML = `<div class="panel-body spore-pod" tabindex="0">
    <div class="spore-controls"><label class="field">Seed<input data-seed type="number" min="0" max="4294967295" value="1931"></label><button data-reseed>APPLY SEED</button><label class="field">Texture<select data-texture><option value="auto">Score</option>${Object.keys(CATALOG.TEX).map(name => `<option>${name}</option>`).join('')}</select></label><label class="field checkbox"><input data-sat type="checkbox" checked>Polyembryony</label><div class="spore-output-buttons" role="group" aria-label="SPORE output"><button data-output="klais" aria-pressed="false">KLAIS</button><button data-output="audio" aria-pressed="false">LOCAL AUDIO</button><button data-output="midi" aria-pressed="false">MIDI OUT</button></div><output data-output-status hidden></output></div>
    <div class="spore-controls"><label class="field">Harmonicity<select data-harm-source><option value="score">Score curve</option><option value="manual">Manual</option></select></label><input data-harm type="range" min="0" max="16" step="0.01" value="0" aria-label="SPORE harmonicity"><output data-harm-label>m2</output><label class="field" title="Note duration calibre: Score curve follows the elongation breakpoints; Manual multiplies every SPORE note duration">Duration<select data-dur-source><option value="score">Score curve</option><option value="manual">Manual</option></select></label><input data-dur type="range" min="0.02" max="4" step="0.01" value="1" aria-label="SPORE duration factor"><output data-dur-label>×1.00</output><label class="field">Seek / seconds<input data-seek type="number" min="0" max="300" step="0.1" value="0"></label><button data-seek-button>SEEK</button><button data-export-score>EXPORT SCORE TXT</button><button data-export-session>EXPORT SESSION JSON</button></div>
    <p data-status class="status">Compiling bundled score…</p><div data-metrics class="scene-metrics" title="Active score transport and population"><div class="scene-metrics-main"><strong data-clock><span data-elapsed>00:00</span><span data-total> / 00:00</span></strong><span data-population>GEN 0 · POP 0 · GENOTYPES 0</span></div><small data-entropy>H 0.00 bit · DROPPED 0</small></div>
    <div class="toolbar"><label class="field">Score file<select data-score-file aria-label="Score TXT file"></select></label></div><details class="spore-editor"><summary>SCORE TXT / VOICE BINDINGS / COUPLINGS</summary><p class="muted">Edit declarative text. APPLY validates then replaces the active score with playback stopped. Saved drafts never auto-play or arm devices.</p><textarea data-editor maxlength="65536" aria-label="SPORE score text" spellcheck="false"></textarea><div class="toolbar"><button data-apply class="primary">APPLY SCORE TXT</button><button data-original>RESTORE BUNDLED TEXT</button><label class="file-button">IMPORT TXT<input data-import-text type="file" accept=".txt,text/plain"></label><button data-export-editor>EXPORT EDITOR TXT</button></div><p data-score-status class="status spore-score-status"></p></details>
    <div class="spore-grid">${[['macro', 'MACRO / FORM & ENTROPY'], ['meso', 'MESO / SUBSTRATE & LINEAGES'], ['morph', 'MORPHOLOGY / LOGICAL STOPS & COUPLINGS'], ['micro', 'MICRO / GENERATED NOTE INTENT'], ['harm', 'HARMONICITY / EMBRYO MODES']].map(([id, title]) => `<section class="spore-figure spore-${id}" data-pod="${id}"><h3>${title}</h3><canvas data-spore-id="c${id[0].toUpperCase() + id.slice(1)}" role="img" aria-label="SPORE ${id} visualization"></canvas></section>`).join('')}<section class="spore-figure spore-side" data-pod="side"><h3>GENOME / TRANSLATION</h3><pre data-spore-id="trans"></pre><pre data-spore-id="geno"></pre></section></div>
    </div>`;
  const overview=document.createElement('div');overview.className='spore-overview';
  for(const name of ['macro','micro','meso','morph'])overview.append(container.querySelector(`[data-pod="${name}"]`));
  container.querySelector('.spore-pod').prepend(overview);
  // LIVE: biological vector (controls) over a generation timeline of the notes actually generated.
  const VECTOR=[['mu','μ','Mutation: how fast lineages drift (score mu × factor)',3],['disp','δ','Dispersal: jumps of register and manual (score disp × factor)',3],['poly','π','Budding: extra adventitious embryos (score poly × factor; the embryo gene still buds)',3],['tuber','τ','Tuber: long held notes from the oldest cells (score tuber × factor)',4],['cap','ρ','Density: notes per generation (score cap × factor, max 96)',2]];
  const live=document.createElement('section');live.className='spore-figure spore-live';live.dataset.pod='live';
  live.innerHTML=`<div class="spore-vector" role="group" aria-label="Biological vector"><h3>VECTOR</h3>${VECTOR.map(([key,sym,title,max])=>`<label title="${title}"><span>${sym}</span><input type="range" min="0" max="${max}" step="0.05" value="1" data-vec="${key}" aria-label="${title}"><output data-vec-out="${key}">×1.00</output></label>`).join('')}<button type="button" data-vec-reset title="Back to the score as written (all ×1)">×1</button><button type="button" data-public title="Audience gesture in 01 SPORE: hold and release on a phone plays the three highest keys of manuals I and II, staccatissimo prestissimo, through the SPORE outputs. OFF by default." aria-pressed="false">PÚBLICO OFF</button><small data-live-tex></small></div><canvas data-live-timeline role="img" aria-label="SPORE generation timeline"></canvas>`;
  container.querySelector('.spore-pod').prepend(live);
  const vectorInputs=[...live.querySelectorAll('[data-vec]')],timelineCanvas=live.querySelector('[data-live-timeline]'),liveTex=live.querySelector('[data-live-tex]');
  const vectorValue=()=>Object.fromEntries(vectorInputs.map(input=>[input.dataset.vec,Number(input.value)]));
  function renderVector(){for(const input of vectorInputs){const out=live.querySelector(`[data-vec-out="${input.dataset.vec}"]`),v=Number(input.value);out.textContent=`×${v.toFixed(2)}`;out.classList.toggle('moved',v!==1);}}
  function resetVector(){for(const input of vectorInputs)input.value='1';renderVector();}
  for(const input of vectorInputs)input.addEventListener('input',()=>{renderVector();configure();});
  live.querySelector('[data-vec-reset]').onclick=()=>{resetVector();configure();};
  // PÚBLICO: audience releases (01 SPORE) → the three highest keys of I and II, interleaved,
  // staccatissimo prestissimo. Passes 1–3 by how long the phone was held. Bursts queue (max 4).
  const publicButton=live.querySelector('[data-public]'),publicPlayer=createNoteLabPlayer({id:'public',audio,sampler,midiOut,onError:error=>notify(`PÚBLICO · ${error.message}`)});
  let publicOn=false,publicCount=0,publicNext=0;
  const renderPublic=()=>{publicButton.textContent=publicOn?`PÚBLICO ${publicCount}`:'PÚBLICO OFF';publicButton.classList.toggle('active',publicOn);publicButton.setAttribute('aria-pressed',String(publicOn));};
  publicButton.onclick=async()=>{if(publicOn){publicOn=false;renderPublic();return;}try{await publicPlayer.prepare({...outputs});publicOn=true;publicNext=0;}catch(error){notify(`PÚBLICO · ${error.message}`);}renderPublic();};
  function publicBurst(charge){
    const top=div=>(Object.values(score.voiceBindings).find(b=>b.division===div)?.range||[36,96])[1],keys=[0,1,2].flatMap(k=>[{midi:top('go')-k,channel:1},{midi:top('po')-k,channel:2}]);
    const passes=1+Math.round(Math.max(0,Math.min(1,charge))*2),step=.028,length=.022,now=performance.now()/1000,start=Math.max(now+.02,publicNext);
    if(start-now>2)return false;let i=0;
    for(let p=0;p<passes;p++)for(const key of p%2?[...keys].reverse():keys)publicPlayer.dispatch({midi:key.midi,channel:key.channel,velocity:100,duration:length},start+step*i++,{...outputs});
    publicNext=start+step*i+.04;return true;
  }
  const ROWS=['so','re','po','go','pe'],ROW_LABEL={so:'IV',re:'III',po:'II',go:'I',pe:'P'},lineageHue=g=>90+((g*47)%110);
  function drawTimeline(){
    if(!generator||!transport||!score)return;const rect=timelineCanvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1),w=rect.width,h=rect.height;if(!w||!h)return;
    if(timelineCanvas.width!==Math.round(w*dpr)||timelineCanvas.height!==Math.round(h*dpr)){timelineCanvas.width=Math.round(w*dpr);timelineCanvas.height=Math.round(h*dpr);}
    const x=timelineCanvas.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);x.clearRect(0,0,w,h);
    const now=transport.view().positionMs/1000,past=8,ahead=2.5,left=24,nowX=left+(w-left)*past/(past+ahead),pxs=(w-left)/(past+ahead),top=4,rowH=(h-top-12)/5;
    const X=t=>nowX+(t-now)*pxs,range=div=>Object.values(score.voiceBindings).find(b=>b.division===div)?.range||[24,96];
    const Y=(div,midi,salt)=>{const [lo,hi]=range(div),f=Number.isFinite(midi)?1-(midi-lo)/Math.max(1,hi-lo):((salt*0.618)%1);return top+ROWS.indexOf(div)*rowH+2+Math.max(0,Math.min(1,f))*(rowH-7);};
    x.font='9px ui-monospace,SFMono-Regular,monospace';
    ROWS.forEach((div,i)=>{const y=top+i*rowH;if(i%2===0){x.fillStyle='rgba(255,255,255,.03)';x.fillRect(left,y,w-left,rowH);}x.fillStyle=CATALOG.DIVCOL?.[div]||'#8aa596';x.fillText(ROW_LABEL[div],4,y+rowH/2+3);});
    x.strokeStyle='rgba(255,255,255,.06)';x.fillStyle='#55695d';for(let s=Math.ceil(now-past);s<=now+ahead;s++){const sx=X(s);x.beginPath();x.moveTo(sx,top);x.lineTo(sx,h-12);x.stroke();if(s%5===0)x.fillText(formatTime(s),sx+2,h-2);}
    const draw=(e,i)=>{if(!ROWS.includes(e.div))return;const x0=X(e.t),x1=X(e.t+e.d);if(x1<left||x0>w)return;const future=e.t>now,a=future?.3:.95,hue=lineageHue(e.gid|0),y=Y(e.div,e.midi,i+(e.gid|0)),from=Math.max(left,x0);
      if(e.tuber){x.fillStyle=`hsla(${hue},45%,45%,${future?.12:.3})`;x.fillRect(from,y-2,Math.max(2,x1-from),Math.max(5,rowH*.45));return;}
      if(e.sat){if(Number.isFinite(e.pt)){x.strokeStyle=`hsla(${hue},55%,55%,${a*.45})`;x.beginPath();x.moveTo(Math.max(left,X(e.pt)),y+2);x.lineTo(from,y+2);x.stroke();}x.strokeStyle=`hsla(${hue},55%,60%,${a})`;x.strokeRect(from,y,Math.max(2,x1-from),4);return;}
      x.fillStyle=`hsla(${hue},55%,${e.hack?70:52}%,${a})`;x.fillRect(from,y,Math.max(2,x1-from),4);};
    const state=generator.view(),events=state.events||[];
    for(let i=events.length-1;i>=0;i--){const e=events[i];if(e.t<now-past-12)break;draw(e,i);}
    const extra=generator.recentNotes?.()||[];for(let i=extra.length-1;i>=0;i--){const e=extra[i];if(e.t<now-past-12)break;draw(e,i);}
    x.strokeStyle='#ff9d3c';x.lineWidth=1.5;x.beginPath();x.moveTo(nowX,top);x.lineTo(nowX,h-12);x.stroke();x.lineWidth=1;
    const tex=state.lastTex,repro=tex?CATALOG.TEX[tex]?.repro:'';if(liveTex.dataset.tex!==tex){liveTex.dataset.tex=tex||'';liveTex.textContent=tex?`${repro} · ${tex}`:'';}
  }
  container.querySelector('.spore-grid').classList.add('spore-secondary');
  const metricsRoot=container.querySelector('[data-metrics]');
  container.querySelectorAll('[data-output]').forEach(button=>decorateOutputControl(button,button.dataset.output,button.dataset.output==='audio'?'Global destination + selected MIDI IN':'Global destination'));
  // SCORE TXT lives in its own pod (composer 2026-11-12): detach file select + editor into scoreRoot.
  const scoreRoot = document.createElement('div'); scoreRoot.className = 'panel-body score-pod';
  { const fileBar = container.querySelector('[data-score-file]').closest('.toolbar'), editorBox = container.querySelector('.spore-editor');
    editorBox.open = true; editorBox.classList.add('score-pod-editor');
    // One sub-header: file select (no label) + square A/R/I/E commands, explained on hover.
    const sub = document.createElement('div'); sub.className = 'score-sub'; const select = fileBar.querySelector('select'); select.title = 'Score TXT file'; sub.append(select);
    const square = (el, letter, title) => { el.classList.add('score-square'); el.title = title; el.setAttribute('aria-label', title); for (const n of [...el.childNodes]) if (n.nodeType === 3) n.remove(); el.prepend(letter); sub.append(el); };
    square(editorBox.querySelector('[data-apply]'), 'A', 'APPLY · validate the editor text and replace the active score (playback stops)');
    square(editorBox.querySelector('[data-original]'), 'R', 'RESTORE · reload the bundled TXT for this file (discards the draft)');
    square(editorBox.querySelector('[data-import-text]').closest('label'), 'I', 'IMPORT · load a .txt file into the editor');
    square(editorBox.querySelector('[data-export-editor]'), 'E', 'EXPORT · download the editor text as .txt');
    for(const [key,title,path] of [
      ['export-score','Export active score TXT','M6 3h8l4 4v5M14 3v5h5M6 3v18h5M16 12v9m-4-4 4 4 4-4'],
      ['export-session','Export generator session JSON','M4 5h16v4H4zM4 12h6v7H4zM16 12v9m-4-4 4 4 4-4']
    ]){
      const button=container.querySelector(`[data-${key}]`);button.classList.add('score-square');button.title=title;button.setAttribute('aria-label',title);
      button.innerHTML=`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="${path}"/></svg>`;sub.append(button);
    }
    editorBox.querySelector('summary')?.remove(); editorBox.querySelector(':scope > .muted')?.remove(); editorBox.querySelector(':scope > .toolbar')?.remove();
    // <details> cannot flex-fill and shows a default "Details" label: move its content into a plain div.
    const box = document.createElement('div'); box.className = 'score-pod-editor'; box.append(...editorBox.childNodes);
    scoreRoot.append(sub, box); fileBar.remove(); editorBox.remove(); }
  const subheader=document.createElement('div');subheader.className='spore-subheader';
  for(const row of [...container.querySelectorAll('.spore-controls')]){subheader.append(...row.childNodes);row.remove();}
  const podStatus=container.querySelector('[data-status]');subheader.append(podStatus);
  overview.before(subheader);
  subheader.prepend(subheader.querySelector('.spore-output-buttons'));
  for(const label of subheader.querySelectorAll('.field')){
    const caption=[...label.childNodes].filter(node=>node.nodeType===3).map(node=>node.textContent).join('').trim();
    label.title=label.title||caption;for(const node of [...label.childNodes])if(node.nodeType===3)node.remove();
    const input=label.querySelector('input,select');if(input){input.title=input.title||label.title;input.setAttribute('aria-label',input.getAttribute('aria-label')||caption);}
    if(label.classList.contains('checkbox'))label.append(document.createTextNode('POLY'));
  }
  const seedButton=subheader.querySelector('[data-reseed]');seedButton.textContent='↻';seedButton.title='Apply seed and reset generator';seedButton.setAttribute('aria-label',seedButton.title);
  const seekButton=subheader.querySelector('[data-seek-button]');seekButton.textContent='→';seekButton.title='Seek to seconds · keep PLAY / HOLD state';seekButton.setAttribute('aria-label',seekButton.title);
  const controlTrack=document.createElement('div');controlTrack.className='spore-subheader-controls';controlTrack.append(...subheader.childNodes);subheader.append(controlTrack);
  // Find the smallest track width that packs the controls into at most two rows.
  // Narrow pods scroll horizontally instead of creating a third row.
  const packControls=()=>{
    if(!subheader.getBoundingClientRect().width)return;
    const widths=[...controlTrack.children].filter(node=>!node.hidden).map(node=>Math.ceil(node.getBoundingClientRect().width)),gap=7;
    if(!widths.length)return;
    const fits=width=>{let rows=1,line=0;for(const item of widths){if(line&&line+gap+item>width){rows++;line=0;}line+=(line?gap:0)+item;}return rows<=2;};
    let low=Math.max(...widths),high=widths.reduce((a,b)=>a+b,0)+gap*(widths.length-1);
    while(low<high){const mid=Math.floor((low+high)/2);if(fits(mid))high=mid;else low=mid+1;}
    const minimum=`${low+1}px`;if(controlTrack.style.minWidth!==minimum)controlTrack.style.minWidth=minimum;
  };
  const headerResize=new ResizeObserver(packControls);headerResize.observe(subheader);
  const q = key => container.querySelector(`[data-${key}]`) || scoreRoot.querySelector(`[data-${key}]`) || metricsRoot.querySelector(`[data-${key}]`);
  const performanceTargets={tempo:1,dur:1};
  let outputs={klais:true,audio:false,midi:true},selectedFile='01-SPORE-score.txt',activeText = scoreText, score, generator, transport, renderer, audition, disposed = false, visible = false, active = 'harm', drawFrame = 0, lastDraw = 0, speed = 1, revision = 0, compiling = 0, drag = null, scoreLoading=false, scoreLoadRevision=0;
  const status = text => { if (!disposed) { q('status').textContent=text;q('status').title=text; } };
  const handle = fn => async (...args) => { try { await fn(...args); } catch (error) { status(error.message); notify(`SPORE: ${error.message}`); } };
  const draftKey=()=>SAVE_KEY+selectedFile;
  const catalog=Object.keys(scoreFiles).sort(compareScoreFiles).map(describeScore),scoreButtonRoots=new Set();
  for(const entry of catalog){const option=document.createElement('option');option.value=entry.file;option.textContent=entry.label;q('score-file').append(option);}q('score-file').value=selectedFile;q('score-file').hidden=true;
  const initPicker=document.createElement('select');initPicker.className='score-init-picker';initPicker.title='00 · INIT / learning scores';initPicker.setAttribute('aria-label',initPicker.title);
  {const blank=document.createElement('option');blank.value='';blank.textContent='00';initPicker.append(blank);}
  for(const entry of catalog.filter(s=>s.init)){const option=document.createElement('option');option.value=entry.file;option.textContent=entry.label;initPicker.append(option);}
  initPicker.onchange=handle(()=>{if(initPicker.value)return loadScoreFile(initPicker.value);});
  function syncScoreButtons(){
    for(const root of scoreButtonRoots)for(const button of root.querySelectorAll('[data-score-load]')){
      const selected=button.dataset.scoreLoad===selectedFile;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));button.disabled=scoreLoading||disposed;
    }
    initPicker.value=describeScore(selectedFile).init?selectedFile:'';
  }
  function scoreButtons(){
    const root=document.createElement('div');root.className='score-fast-buttons';root.setAttribute('role','group');root.setAttribute('aria-label','Fast score loader');
    for(const entry of catalog.filter(s=>!s.init)){
      const button=document.createElement('button');button.type='button';button.className='score-fast-button';button.dataset.scoreLoad=entry.file;button.textContent=entry.short;button.title=`${entry.label}${entry.piece?' · APOMIXIS · '+entry.theme:entry.lab?' · LAB':''} · load TXT score and stop playback`;if(entry.piece){button.classList.add('piece');button.style.setProperty('--piece',`hsl(${entry.hue} 72% 68%)`);button.style.setProperty('--piece-soft',`hsl(${entry.hue} 72% 68% / .16)`);}else if(entry.lab){button.classList.add('lab');if(!root.querySelector('.lab'))button.classList.add('first-lab');}button.setAttribute('aria-label',button.title);button.onclick=handle(()=>loadScoreFile(entry.file));root.append(button);
    }
    scoreButtonRoots.add(root);syncScoreButtons();return root;
  }
  scoreRoot.querySelector('.score-sub').prepend(initPicker,scoreButtons());
  q('editor').value=scoreText;const editorHighlight=enhanceScoreEditor(q('editor'));
  const outputLabel=()=>Object.entries(outputs).filter(([,enabled])=>enabled).map(([name])=>name.toUpperCase()).join(' + ')||'GRAPHICS';
  function outputStatus(){container.querySelectorAll('[data-output]').forEach(button=>{const on=outputs[button.dataset.output];button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));});q('output-status').textContent=`OUTPUT: ${outputLabel()}${outputs.midi&&!midiOut.summary().armed?' · MIDI waiting for M ON':''}`;}
  async function prepareOutputs(){
    if(!outputs.audio&&!outputs.klais)return;
    const context=await audio.ensure();if(disposed)return;
    if(outputs.audio&&!audition)audition=createSporeAudition(context,audio.localDestination(),score);
    if(outputs.klais){try{await sampler?.prepareScore();}catch(error){notify(error.message);}}
  }
  // Score tape (header `tape`): decoded before the transport starts, started from the transport position.
  const tapeUrl=()=>score?.tape?`/audio/${score.tape.file}`:null;
  async function prepareTape(){const url=tapeUrl();if(!url||!audio)return null;await audio.ensure();const entry=await audio.prepareTape(url);if(score.tape.dry!==null||score.tape.tune!==null)audio.setMixerSettings({...(score.tape.dry!==null?{micDry:score.tape.dry}:{}),...(score.tape.tune!==null?{micTune:score.tape.tune}:{})});return entry;}
  function startTape(entry){if(!entry||!transport||!score?.tape)return;audio.startTape(entry,transport.view().positionMs/1000-score.tape.at,{gainDb:score.tape.gain,rate:speed});}
  function stopAudioOutputs(){audio?.recStopSoon?.();audio?.stopTape?.();noteActivity.clear('score:');audition?.stop();sampler?.stopScore();laser?.scoreStop?.();}
  async function play(){if(!transport)throw new Error('Apply a valid score first.');const mine=++revision;await prepareRegistration({file:selectedFile,text:activeText,hash:score.contentHash});if(disposed||mine!==revision)return;await prepareOutputs();if(disposed||mine!==revision)return;let tape=null;try{tape=await prepareTape();}catch(error){notify(`TAPE · ${error.message}`);}if(disposed||mine!==revision)return;try{await audio?.recStart?.(selectedFile);}catch(error){notify(`REC · ${error.message}`);}if(disposed||mine!==revision)return;transport.play();startTape(tape);publishRegistration(true);status(`Playing / ${outputLabel()}`);}
  function reset(){pause('reset');transport?.reset();hackCueTimes.clear();lastRegistrationKey='';publishRegistration(false,true);}
  async function toggle(){if(transport?.view().running){reset();return;}await play();}

  let lastRegistrationKey='',lastRegistrationTime=0;const hackCueTimes=new Map();
  function publishRegistration(forceFlash=false,allowStopped=false){
    if(!transport||!score||scoreLoading||selectedFile.startsWith('00-'))return;
    const view=transport.view();if(!view.running&&!allowStopped)return;
    if(view.positionMs<lastRegistrationTime)hackCueTimes.clear();lastRegistrationTime=view.positionMs;
    const section=score.sections[Math.max(0,score.sections.findLastIndex(item=>item.start*1000<=view.positionMs))];
    const hack=!!(section.hack&&section.hackRegs&&hackCueTimes.has(section.id)&&view.positionMs>=hackCueTimes.get(section.id));
    const key=`${score.contentHash}:${section.id}:${hack}`;
    if(!forceFlash&&!allowStopped&&key===lastRegistrationKey)return;
    const signature=registrationSignature(registration(score,section,hack).knobs);
    try{onRegistrationCue({file:selectedFile,hash:score.contentHash,section:section.id,variant:hack?'conditional hack':'base',signature,running:view.running,forceFlash});lastRegistrationKey=key;}catch(error){if(key!==lastRegistrationKey)notify(`REGISTERS · ${error.message}`);lastRegistrationKey=key;}
  }
  function pause(reason = 'paused') { revision++; transport?.pause(reason); stopAudioOutputs(); midiOut?.stop();  }

  function seekKeepingPlayback(ms){
    if(!transport)return;
    if(!Number.isFinite(ms)||ms<0||ms>score.duration*1000)throw new Error('Seek outside score');
    const wasRunning=transport.view().running;revision++;
    transport.seek(ms);hackCueTimes.clear();lastRegistrationKey='';q('seek').value=String(ms/1000);
    if(wasRunning&&ms<score.duration*1000){transport.play();transport.tick();if(score.tape){const url=tapeUrl();audio?.prepareTape(url).then(entry=>{if(transport.view().running)startTape(entry);}).catch(error=>notify(`TAPE · ${error.message}`));}publishRegistration(true);status(`Playing / ${outputLabel()}`);}
    else{publishRegistration(false,true);status(`Paused / seek · ${outputLabel()}`);}
  }

  function configure() {
    if (!generator) return;
    generator.configure({ texture: q('texture').value, polyembryony: q('sat').checked, harmonicity: q('harm-source').value === 'score' ? null : Number(q('harm').value), elongation: q('dur-source').value === 'score' ? null : Number(q('dur').value), vector: vectorValue() });
    q('dur-label').textContent = `×${Number(q('dur').value).toFixed(2)}`;
  }
  function connectScore(nextScore, text = scoreText) {
    activeText = text;
    pause('score-change'); midiOut?.stop(); transport?.dispose(); audition?.dispose(); audition = null;
    hackCueTimes.clear();lastRegistrationKey='';lastRegistrationTime=0;
    score = nextScore;

    const megasporeVectorHelp={mu:'MEGASPORE · melodic pitch variance: ×1 =15%, ×0 =literal, ×2 =30%. Rhythms unchanged; harmony follows phrase arrival.',disp:'MEGASPORE · auxiliary attack spread −6…+12ms; melody and pedal rhythm unchanged.',poly:'MEGASPORE · occasional soft octave buds on auxiliary arps/chords; never duplicate the lead or kick.',tuber:'MEGASPORE · auxiliary gates ±12%; lead, heterophonic siblings and pedal durations unchanged.',cap:'MEGASPORE · lightly thin or enrich auxiliary arps/chords; no change to form or main melodic rhythm.'};
    const oosphereVectorHelp={mu:'OOSPHERE · opening Sixteen glissandi only: subtle semitone mutation above ×1; ×1 keeps HORVITZ pitches.',disp:'OOSPHERE · opening only: spread the sixteen voice phases by small milliseconds; no global tempo change.',poly:'OOSPHERE · opening only: occasional soft octave buds above ×1.',tuber:'OOSPHERE · opening only: scale the short note gates; ×1 is the original50ms.',cap:'OOSPHERE · opening only: sixteen voices × factor, bounded0–24. Other rhythmicons retain their written voice counts.'};
    for(const input of vectorInputs){const key=input.dataset.vec,title=score.scoreId==='apomixis.megaspora'?megasporeVectorHelp[key]:score.scoreId==='apomixis.oosfera'?oosphereVectorHelp[key]:VECTOR.find(v=>v[0]===key)[2];input.closest('label').title=title;input.setAttribute('aria-label',title);}
    live.querySelector('[data-vec-reset]').title=score.scoreId==='apomixis.megaspora'?'Baseline: μ×1 =15% melodic variance; other vectors ×1 =written texture. Use μ×0 for literal pitches.':'Back to the score as written (all ×1)';
    generator = attachAlgoLayer(createSporeGenerator(score), score); renderer = createSporeRenderer(container, score);
    const noteRenderer=renderer,resetGenerator=generator.reset.bind(generator);generator.reset=(...args)=>{noteRenderer.clearNotes();return resetGenerator(...args);};
    resetVector(); q('seed').value = score.seed; q('seek').max = String(score.duration); q('texture').value = 'auto'; q('sat').checked = true; q('harm-source').value = 'score'; q('harm').value = 0; q('dur-source').value = 'score'; q('dur').value = elongationAt(score, 0);
    transport = createGeneratorTransport({ generator, durationMs: score.duration * 1000,
      onEvent(event,timing){
        renderer.note(event);if(event.kind==='note')noteActivity.schedule(`score:${timing.epoch}:${event.eventId}`,event.payload.note,({go:1,po:2,re:3,so:4,pe:5})[event.division]||1,timing.when,timing.durationSeconds);
        if(event.kind==='note'&&event.payload.hack&&!hackCueTimes.has(event.payload.sceneId))hackCueTimes.set(event.payload.sceneId,event.atSessionMs);
        if(outputs.audio&&audio.context?.state==='running')audition?.dispatch(event,{...timing,when:audio.context.currentTime+Math.max(0,timing.when-performance.now()/1000)});
        if(outputs.klais&&audio.context?.state==='running')sampler?.dispatchScore(event,timing);
        if(outputs.midi&&midiOut.summary().armed)midiOut.dispatch(event,timing);
        if(event.kind==='scene')try{onSection(score.sections.find(s=>s.id===event.payload.sceneId)||null);}catch{}
        if(event.kind==='scene'&&laser?.scoreScene)try{laser.scoreScene(score.sections.find(s=>s.id===event.payload.sceneId)?.laser||null);}catch{}
        if(event.kind==='note'&&laser?.scoreNote){const cue=score.sections.find(s=>s.id===event.payload.sceneId)?.laser;if(cue)try{laser.scoreNote(event,timing,cue);}catch{}}
      },
      onStop(reason) { stopAudioOutputs(); midiOut?.stop();  status(`Paused / ${reason} · ${outputLabel()} output stopped`);
        // attacca: the score ran to its end → the next piece loads and plays at once.
        if(reason==='ended'&&score?.attacca){const next=attaccaFile();if(next)setTimeout(()=>{loadScoreFile(next).then(()=>play()).then(()=>notify(`ATTACCA → ${next.replace(/-score\.txt$/,'')}`)).catch(error=>notify(`ATTACCA · ${error.message}`));},0);else notify(`ATTACCA ${score.attacca}: no score file`);}
      }
    });
    transport.setSpeed(speed);for(const [key,value] of Object.entries(performanceTargets))transport.setPerformance(key,value);
    q('score-status').textContent = ''; q('score-file').title = `ACTIVE ${score.scoreId} / ${score.scoreVersion} / ${score.contentHash}`;
    status('Ready / compiled TXT score · preview stopped · optional local additive audio'); notify('SPORE TXT score applied · playback stopped.');
  }
  async function applyText(text,saveDraft=true) {
    const mine = ++compiling; const next = await compileSporeText(text); if (disposed || mine !== compiling) return;
    connectScore(next, text); try { if(saveDraft)localStorage.setItem(draftKey(), text); } catch { notify('SPORE draft could not be saved locally. Export TXT.'); }
  }
  q('apply').onclick = handle(() => applyText(q('editor').value));
  q('editor').oninput = () => { compiling++; q('score-status').textContent = 'UNAPPLIED draft · A to apply'; try { if (q('editor').value.length <= 65536) localStorage.setItem(draftKey(), q('editor').value); } catch {} };
  q('original').onclick = () => { q('editor').value = scoreFiles[selectedFile]||scoreText; q('score-status').textContent = 'Bundled text restored to editor; APPLY to replace active score.'; };
  q('reseed').onclick=handle(()=>{if(!q('seed').value.trim())throw new Error('Enter a uint32 seed');pause('seed-change');transport?.reset(Number(q('seed').value));});
  async function setOutput(route,enabled){
    outputs[route]=enabled;if(route==='audio')audio.setMidiInputEnabled(enabled);if(!outputs.audio)audition?.stop();if(!outputs.klais)sampler?.stopScore();if(!outputs.midi)midiOut.stop();
    onOutputChange({...outputs});outputStatus();if(enabled&&['audio','klais'].includes(route))await prepareOutputs();outputStatus();
  }
  container.querySelectorAll('[data-output]').forEach(button=>button.onclick=handle(()=>setOutput(button.dataset.output,!outputs[button.dataset.output])));
  const attaccaFile=()=>score?.attacca?Object.keys(scoreFiles).sort(compareScoreFiles).find(f=>f.startsWith(`${score.attacca}-`))||null:null;
  async function loadScoreFile(name){
    name=normalizeScoreFile(name);if(!Object.hasOwn(scoreFiles,name))throw new Error('Unknown score file');
    const mine=++scoreLoadRevision;scoreLoading=true;pause('score-file');selectedFile=name;q('score-file').value=name;q('editor').value=scoreFiles[name];syncScoreButtons();
    try{
      await applyText(scoreFiles[name],false);if(disposed||mine!==scoreLoadRevision)return;
      try{
        const oldName=Object.keys(SCORE_ALIASES).find(old=>SCORE_ALIASES[old]===name);
        const draft=localStorage.getItem(draftKey())||(oldName?localStorage.getItem(SAVE_KEY+oldName):null)||(name==='01-SPORE-score.txt'?localStorage.getItem('hylon-spore-score-text-v1'):null);
        if(draft&&draft!==scoreFiles[name]&&draft.length<=65536){q('editor').value=draft;q('score-status').textContent='UNAPPLIED draft · A to apply';localStorage.setItem(draftKey(),draft);}
      }catch{}
    }finally{if(mine===scoreLoadRevision){scoreLoading=false;syncScoreButtons();}}
  }
  q('score-file').onchange=handle(event=>loadScoreFile(event.target.value));
  for (const key of ['texture', 'sat', 'harm-source', 'dur-source']) q(key).addEventListener('input', handle(configure));
  q('harm').addEventListener('input', handle(() => { q('harm-source').value='manual'; configure(); }));
  q('dur').addEventListener('input', handle(() => { q('dur-source').value = 'manual'; configure(); }));
  q('seek-button').onclick = handle(() => seekKeepingPlayback(Number(q('seek').value)*1000));
  function download(name, text, type) { const url = URL.createObjectURL(new Blob([text], { type })), link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  q('export-score').onclick = () => download(selectedFile, activeText, 'text/plain');
  q('export-editor').onclick = () => download(selectedFile.replace(/\.txt$/i,'.editor-draft.txt'), q('editor').value, 'text/plain');
  q('import-text').onchange = handle(async event => {
    const file = event.target.files?.[0]; if (!file) return; const mine = ++compiling;
    try { if (file.size > 65536) throw new Error('SPORE TXT exceeds 64 KiB'); const text = await file.text(); if (disposed || mine !== compiling) return; q('editor').value = text; q('editor').oninput(); }
    finally { event.target.value = ''; }
  });
  q('export-session').onclick = handle(() => { if (!generator) throw new Error('No active score'); download(selectedFile.replace(/\.txt$/i,'.session.json'), JSON.stringify({ kind: 'spore-local-draft-session', schemaVersion: 1, publicLive: false, scoreHash: score.contentHash, snapshot: generator.snapshot(), transport: transport.view(), outputs:{...outputs},scoreFile:selectedFile,midi:outputs.midi?midiOut.summary():null,audio:outputs.audio?'additive-study':'none', audition: audition?.stats() || null, generatedIntent: generator.view().allEvents, hist: generator.view().hist, mutations: generator.view().mutations }, null, 2), 'application/json'); });
  function setActive(name) { active = name; container.querySelectorAll('[data-pod]').forEach(element => element.classList.toggle('active', element.dataset.pod === active)); }
  container.querySelectorAll('[data-pod]').forEach(element => element.addEventListener('pointerdown', () => { setActive(element.dataset.pod); container.querySelector('.spore-pod').focus({ preventScroll: true }); }));
  function setHarm(value) { q('harm-source').value = 'manual'; q('harm').value = Math.max(0, Math.min(16, value)); configure(); }
  const harmonicityCanvas = container.querySelector('[data-spore-id="cHarm"]');
  harmonicityCanvas.onpointerdown = event => { drag = { y: event.clientY, value: Number(q('harm').value) }; harmonicityCanvas.setPointerCapture(event.pointerId); };
  harmonicityCanvas.onpointermove = event => { if (drag) { const value = drag.value + (drag.y - event.clientY) * .04; setHarm(value); } };
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) harmonicityCanvas.addEventListener(name, () => { drag = null; });
  harmonicityCanvas.addEventListener('wheel', event => { event.preventDefault(); setHarm(Number(q('harm').value) + (event.deltaY > 0 ? -.25 : .25)); }, { passive: false });
  container.querySelector('[data-spore-id="cMacro"]').onclick = handle(event => { if (!transport) return; const rect = event.target.getBoundingClientRect(); seekKeepingPlayback(Math.max(0, Math.min(score.duration*1000, (event.clientX-rect.left-(Number(event.currentTarget.dataset.plotLeft)||8))/Math.max(1,rect.width-(Number(event.currentTarget.dataset.plotLeft)||8)-(Number(event.currentTarget.dataset.plotRight)||8)) * score.duration*1000))); });
  const keydown=event=>{
    if(event.defaultPrevented||event.repeat||event.metaKey||event.ctrlKey||event.altKey||['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName)||event.target.isContentEditable||event.target.closest?.('dialog[open]'))return;
    const digit=/^(?:Digit|Numpad)([1-9])$/.exec(event.code)?.[1];
    if(digit){event.preventDefault();if(event.shiftKey){const mode=CATALOG.BANK1[Number(digit)-1];if(mode)setHarm(CATALOG.MODES.findIndex(item=>item.key===mode));}else{const section=score?.sections[Number(digit)-1];if(!section){notify(`SPORE has ${score?.sections.length||0} macro sections.`);return;}seekKeepingPlayback(section.start*1000);}return;}
  };
  document.addEventListener('keydown',keydown);setActive('harm');
  let cursorTick=0;
  const tick=setInterval(()=>{transport?.tick();publishRegistration();if(transport&&score&&!scoreLoading)try{const v=transport.view(),t=v.positionMs/1000,i=Math.max(0,score.sections.findLastIndex(s=>t>=s.start)),now=score.sections[i],next=score.sections[i+1];onRegistrationPreview({file:selectedFile,hash:score.contentHash,positionMs:v.positionMs,running:v.running,attacca:attaccaFile(),remaining:score.duration-t,gestures:now.gestures||null,progress:(t-now.start)/now.dur,elapsed:t-now.start,nextGestures:next?.gestures||null,nextIn:next?next.start-t:Infinity});}catch{}outputStatus();if(transport&&++cursorTick%4===0){const view=transport.view();editorHighlight?.setCursor?.(view.positionMs/1000,{follow:view.running});updateMetrics();}},25);
  function updateMetrics(){
    if(!generator||!transport)return;const state=generator.view(),view=transport.view();
    q('elapsed').textContent=formatTime(view.positionMs/1000);q('total').textContent=` / ${formatTime(score.duration)}`;
    q('population').textContent=`GEN ${state.gen} · POP ${state.pop} · GENOTYPES ${state.geno}`;
    q('entropy').textContent=`H ${state.H.toFixed(2)} bit · DROPPED ${view.dropped+(audition?.stats().dropped||0)}`;
  }
  function draw(now) {
    if (disposed || !visible || document.hidden) { drawFrame = 0; return; }
    try { drawTimeline(); } catch {}
    if (generator && now - lastDraw > 80) {
      lastDraw = now; const state = generator.view(), view = transport.view(), t = view.positionMs / 1000;
      renderer.render(state, t, generator.options);

      if (generator.options.harmonicity === null) { const curve = score.harmonicityCurve; let value = curve.at(-1)[1]; for (let i = 0; i < curve.length - 1; i++) if (t >= curve[i][0] && t < curve[i + 1][0]) { value = curve[i][1] + (curve[i + 1][1] - curve[i][1]) * (t - curve[i][0]) / (curve[i + 1][0] - curve[i][0]); break; } q('harm').value = value; }
      q('harm-label').textContent = CATALOG.MODES[Math.round(Number(q('harm').value))].label;
      if (generator.options.elongation === null) { q('dur').value = elongationAt(score, t); q('dur-label').textContent = `×${elongationAt(score, t).toFixed(2)} · ambitus ${Math.round(ambitusAt(score, t) * 100)}%`; }
    }
    drawFrame = requestAnimationFrame(draw);
  }
  function remoteState(){
    const state=generator?.view(),hist=state?.hist||[],stride=Math.max(1,Math.ceil(hist.length/240)),now=(transport?.view().positionMs||0)/1000;
    const harm=score&&generator?.options.harmonicity===null?harmonicityAt(score,now):Number(q('harm').value),duration=score&&generator?.options.elongation===null?elongationAt(score,now):Number(q('dur').value);
    return { manual:{seed:Number(q('seed').value),texture:q('texture').value,polyembryony:q('sat').checked,harmSource:q('harm-source').value,harm,harmLabel:CATALOG.MODES[Math.round(Math.max(0,Math.min(16,harm)))].label,durationSource:q('dur-source').value,duration,durationLabel:`×${duration.toFixed(2)}${score&&generator?.options.elongation===null?' · ambitus '+Math.round(ambitusAt(score,now)*100)+'%':''}`,seek:Number(q('seek').value),outputs:{...outputs},vector:vectorValue()},
      roll:score&&renderer?.roll?(()=>{try{return renderer.roll();}catch{return'';}})():'',
      macro:score?{duration:score.duration,sections:score.sections.map(s=>({id:s.id,name:s.name,start:s.start,dur:s.dur,bpm:s.bpm})),history:hist.filter((_,i)=>i%stride===0||i===hist.length-1).map(p=>[Math.round(p.t*10)/10,p.pop,Math.round(p.H*1000)/1000]),harmonicity:score.harmonicityCurve.map(p=>[p[0],p[1]])}:null,status:q('status').textContent };
  }
  function setPerformance(key,value){if(key==='gap'){if(!Number.isFinite(value)||value<0||value>5)throw new Error('Invalid performance control');transport?.setPerformance('gap',value);performanceTargets.gap=value;return;}if(!['tempo','dur'].includes(key)||!Number.isFinite(value)||value<(key==='tempo'?.25:.001)||value>(key==='tempo'?4:1))throw new Error('Invalid performance control');transport?.setPerformance(key,value);performanceTargets[key]=value;}
  async function remoteSet(key,value){
    if(!validParameter('spore',{key,value}))throw new Error('Invalid SPORE parameter');
    if(key==='performanceTempo'||key==='performanceDur'){setPerformance(key==='performanceTempo'?'tempo':'dur',value);return;}
    if(key==='vectorReset'){if(value){resetVector();configure();}return;}
    if(key.startsWith('vector.')){const input=vectorInputs.find(i=>i.dataset.vec===key.slice(7));if(!input)throw new Error('Unknown vector parameter');input.value=String(Math.min(Number(input.max),value));renderVector();configure();return;}
    if(key==='seed')q('seed').value=String(value);
    else if(key==='reseed'){if(value){pause('seed-change');transport?.reset(Number(q('seed').value));}}
    else if(key==='seek'){if(value>score.duration)throw new Error('Seek outside score');seekKeepingPlayback(value*1000);}
    else if(key.startsWith('output.')){
      const route=key.slice(7);if(value&&['audio','klais'].includes(route)&&audio.context?.state!=='running')throw new Error('Enable AUDIO locally on Mac first');
      await setOutput(route,value);
    }else{
      const field={texture:'texture',polyembryony:'sat',harmSource:'harm-source',harm:'harm',durationSource:'dur-source',duration:'dur'}[key];
      if(key==='polyembryony')q(field).checked=value;else q(field).value=String(value);
      if(key==='harm')q('harm-source').value='manual';if(key==='duration')q('dur-source').value='manual';configure();
    }
    updateMetrics();
  }
  function setVisible(value) { visible = value; cancelAnimationFrame(drawFrame); if (visible && !document.hidden) drawFrame = requestAnimationFrame(draw); }
  const visibility = () => { if (document.hidden) pause('page-hidden'); setVisible(visible); }; document.addEventListener('visibilitychange', visibility);
  handle(()=>loadScoreFile(selectedFile))();
  // A section with a `public` sentence defines the gesture; without one, 01 keeps the first-performance burst.
  let publicForm=null;
  function publicGestures(list){
    if(!publicOn||!score||!transport?.view().running)return;
    const position=transport.view().positionMs,section=score.sections[Math.max(0,score.sections.findLastIndex(item=>item.start*1000<=position))],spec=section?.public;
    if(!spec){if(!/^01-/.test(selectedFile))return;for(const g of list.slice(0,4))if(g.kind==='release'&&publicBurst(g.charge)){publicCount++;}renderPublic();return;}
    if(spec.off)return;if(publicForm?.spec!==spec)publicForm=createPublicForm(spec);
    const rangeOf=div=>Object.values(score.voiceBindings).find(b=>b.division===div)?.range||[36,96];
    for(const g of list.slice(0,4)){if(g.kind!=='release')continue;const now=performance.now()/1000,action=publicForm.mark(now,g.charge);
      if(action.type==='cancel')publicPlayer.stop();
      else if(action.type==='sound'){for(const note of publicNotes(spec,action,rangeOf))publicPlayer.dispatch({midi:note.midi,channel:note.channel,velocity:100,duration:note.dur},action.start+note.at,{...outputs});publicCount++;}}
    renderPublic();
  }
  return{publicGestures,performance:()=>({...performanceTargets}),activeSource:()=>score?{file:selectedFile,text:activeText,hash:score.contentHash}:null,lyrics(){return score&&transport&&!scoreLoading?lyricsAt(score,transport.view().positionMs/1000):null;},publicFrame(){if(!generator||!transport||scoreLoading)return null;const t=transport.view(),frame=morphologyState(score,generator.view(),t.positionMs/1000,t.running,selectedFile,generator.recentNotes?.()||[]),lyric=lyricsAt(score,t.positionMs/1000);if(lyric.now||lyric.prev)frame.lyric={now:lyric.now,prev:lyric.prev};const pub=score.sections[Math.max(0,score.sections.findLastIndex(item=>item.start*1000<=t.positionMs))]?.public;if(frame.garden&&pub&&!pub.off)frame.garden.pub={mark:pub.mark,feel:pub.feel};return frame;},remoteState,remoteSet,scoreButtons,metricsElement:()=>metricsRoot,scoreElement:()=>scoreRoot,loadScoreFile(name){return loadScoreFile(name);},scoreFiles:()=>Object.keys(scoreFiles).sort(compareScoreFiles),play,pause,hold:()=>pause('hold'),toggle,reset,stopAudioOutputs,setOutput,setPerformance,setSpeed(value){speed=value;transport?.setSpeed(value);audio?.setTapeRate?.(value);},state(){const view=transport?.view(),section=score&&view?score.sections[Math.max(0,score.sections.findLastIndex(item=>item.start*1000<=view.positionMs))]:null;return{sectionName:section?.name||'',sectionId:section?.id||'',sectionLeft:section&&view?section.start+section.dur-view.positionMs/1000:Infinity,ready:!!transport&&!scoreLoading,loadingScore:scoreLoading,title:score?.title||'SPORE',durationMs:(score?.duration||0)*1000,outputs:{...outputs},scene:'SPORE',file:selectedFile,...view};},setVisible,dispose(){if(disposed)return;pause('disposed');disposed=true;headerResize.disconnect();compiling++;clearInterval(tick);cancelAnimationFrame(drawFrame);audition?.dispose();transport?.dispose();generator?.dispose();editorHighlight.dispose();document.removeEventListener('visibilitychange',visibility);document.removeEventListener('keydown',keydown);container.replaceChildren();}};

}
