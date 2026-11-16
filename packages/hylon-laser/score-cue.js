// Score `laser` section cue (pure). The score never arms, starts or opens the laser: cues only
// shape content while the operator has laser preview/output running (see laser pod).
//   laser midixy src all size 0 prob 100 max 8 dur 1
//   laser off
//   laser line span 0 365 color 1,0,0->1,1,1 curve log
//     one vertical line moving left → right across the absolute span (seconds of the score);
//     colour goes from the first RGB to the second, linear or log (late: (10^p − 1) / 9).
//     field PERCENT / signal PERCENT (optional): field size and intensity signal while the cue runs.
//   laser text PROTO-SPORE span 0 330 mutate 0->0.6->0 rate 2 color 1,0.5,0 field 50 signal 100
//     a word (A–Z 0–9 -, up to 12) whose letters mutate: at each of `rate` steps per second every
//     letter is replaced by another with probability `mutate` (piecewise ramp over the span).
export const LASER_SOURCES = ['all', 'go', 'po', 're', 'so', 'pe'];
export const LASER_DEFAULT = { mode: 'midixy', src: ['all'], size: 0, prob: 100, max: 8, dur: 1 };
const num = (v, lo, hi, int = true) => { const n = Number(v); if (!Number.isFinite(n) || n < lo || n > hi || (int && !Number.isInteger(n))) throw new Error(`laser: ${v} outside ${lo}–${hi}`); return n; };
export function parseLaserCue(args) {
  if (args[0] === 'off') { if (args.length !== 1) throw new Error('laser off takes no parameters'); return { mode: 'off' }; }
  if(args[0]==='hex'){
    const cue={mode:'hex',src:['all'],prob:100,step:.1171875,turn:60,dur:.045,field:100,signal:100};
    for(let i=1;i<args.length;i+=2){const key=args[i],value=args[i+1];if(value===undefined)throw new Error(`laser hex: ${key} needs a value`);
      if(key==='src'){const list=value.split(',');if(!list.length||!list.every(s=>LASER_SOURCES.includes(s)))throw new Error('Invalid laser hex source');cue.src=list.includes('all')?['all']:list;}
      else if(key==='step')cue.step=num(value,.01,2,false);
      else if(key==='turn')cue.turn=num(value,1,600,false);
      else if(key==='dur')cue.dur=num(value,.02,.25,false);
      else if(key==='prob')cue.prob=num(value,0,100);
      else if(key==='field')cue.field=num(value,1,100);
      else if(key==='signal')cue.signal=num(value,0,100);
      else throw new Error(`laser hex: unknown parameter ${key}`);
    }return cue;
  }
  if (args[0] === 'text') {
    const word = String(args[1] || '');
    if (!/^[A-Z0-9-]{1,12}$/.test(word)) throw new Error('laser text WORD (A–Z, 0–9, -; up to 12)');
    const cue = { mode: 'text', text: word, span: null, mutate: [0], rate: 2, from: [1, 1, 1], to: [1, 1, 1], curve: 'lin', field: null, signal: null };
    for (let i = 2; i < args.length;) {
      const key = args[i++];
      if (key === 'span') { const a = Number(args[i++]), b = Number(args[i++]); if (!(a >= 0 && b > a && b <= 1800)) throw new Error('laser text span FROM TO (seconds)'); cue.span = [a, b]; }
      else if (key === 'mutate') { const v = String(args[i++] || '').split('->').map(Number); if (!v.length || v.length > 8 || v.some(x => !Number.isFinite(x) || x < 0 || x > 1)) throw new Error('laser text mutate P or P->P->P (0–1)'); cue.mutate = v; }
      else if (key === 'rate') cue.rate = num(args[i++], 0.1, 20, false);
      else if (key === 'color') { const v = String(args[i++] || '').split(',').map(Number); if (v.length !== 3 || v.some(x => !Number.isFinite(x) || x < 0 || x > 1)) throw new Error('laser text color R,G,B (0–1)'); cue.from = v; cue.to = v; }
      else if (key === 'field') cue.field = num(args[i++], 1, 100);
      else if (key === 'signal') cue.signal = num(args[i++], 0, 100);
      else throw new Error(`laser text: unknown parameter ${key}`);
    }
    if (!cue.span) throw new Error('laser text needs span FROM TO');
    return cue;
  }
  if (args[0] === 'line') {
    const cue = { mode: 'line', span: null, from: [1, 0, 0], to: [1, 1, 1], curve: 'log', field: null, signal: null }, rgb = text => { const v = text.split(',').map(Number); if (v.length !== 3 || v.some(x => !Number.isFinite(x) || x < 0 || x > 1)) throw new Error('laser line color R,G,B->R,G,B (0–1)'); return v; };
    for (let i = 1; i < args.length;) {
      const key = args[i++];
      if (key === 'span') { const a = Number(args[i++]), b = Number(args[i++]); if (!(a >= 0 && b > a && b <= 1800)) throw new Error('laser line span FROM TO (seconds)'); cue.span = [a, b]; }
      else if (key === 'color') { const [a, b] = String(args[i++] || '').split('->'); if (!a || !b) throw new Error('laser line color R,G,B->R,G,B'); cue.from = rgb(a); cue.to = rgb(b); }
      else if (key === 'field') cue.field = num(args[i++], 1, 100);
      else if (key === 'signal') cue.signal = num(args[i++], 0, 100);
      else if (key === 'curve') { const v = args[i++]; if (!['lin', 'log'].includes(v)) throw new Error('laser line curve lin|log'); cue.curve = v; }
      else throw new Error(`laser line: unknown parameter ${key}`);
    }
    if (!cue.span) throw new Error('laser line needs span FROM TO');
    return cue;
  }
  if (args[0] === 'flash') {
    // laser flash src po,re prob 100 dur 0.06 [color 1,1,1] [field 100] [signal 100]
    //   a full-field white frame lit for `dur` seconds on each accepted attack, dark in between.
    const cue = { mode: 'flash', src: ['all'], prob: 100, dur: 0.06, color: [1, 1, 1], field: 100, signal: 100 };
    for (let i = 1; i < args.length; i += 2) {
      const key = args[i], value = args[i + 1]; if (value === undefined) throw new Error(`laser flash: ${key} needs a value`);
      if (key === 'src') { const list = value.split(','); if (!list.every(s => LASER_SOURCES.includes(s))) throw new Error(`laser src ${LASER_SOURCES.join('|')} (comma list)`); cue.src = list.includes('all') ? ['all'] : list; }
      else if (key === 'prob') cue.prob = num(value, 0, 100);
      else if (key === 'dur') cue.dur = num(value, 0.02, 1, false);
      else if (key === 'color') { const v = value.split(',').map(Number); if (v.length !== 3 || v.some(x => !Number.isFinite(x) || x < 0 || x > 1)) throw new Error('laser flash color R,G,B (0–1)'); cue.color = v; }
      else if (key === 'field') cue.field = num(value, 1, 100);
      else if (key === 'signal') cue.signal = num(value, 0, 100);
      else throw new Error(`laser flash: unknown parameter ${key}`);
    }
    return cue;
  }
  if (args[0] !== 'midixy') throw new Error('laser midixy … | laser flash … | laser line … | laser text … | laser off');
  const cue = { ...LASER_DEFAULT, src: [...LASER_DEFAULT.src] };
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1]; if (value === undefined) throw new Error(`laser: ${key} needs a value`);
    if (key === 'src') { const list = value.split(','); if (!list.every(s => LASER_SOURCES.includes(s))) throw new Error(`laser src ${LASER_SOURCES.join('|')} (comma list)`); cue.src = list.includes('all') ? ['all'] : list; }
    else if (key === 'size') cue.size = num(value, 0, 100);
    else if (key === 'prob') cue.prob = num(value, 0, 100);
    else if (key === 'max') cue.max = num(value, 1, 8);
    else if (key === 'dur') cue.dur = num(value, 0.05, 4, false);
    // optional overrides while the cue runs: color R,G,B (0–1), field %, signal %
    else if (key === 'color') { const v = value.split(',').map(Number); if (v.length !== 3 || v.some(x => !Number.isFinite(x) || x < 0 || x > 1)) throw new Error('laser midixy color R,G,B (0–1)'); cue.color = v; }
    else if (key === 'field') cue.field = num(value, 1, 100);
    else if (key === 'signal') cue.signal = num(value, 0, 100);
    else throw new Error(`laser: unknown parameter ${key}`);
  }
  return cue;
}
export function formatLaserCue(cue) {
  if (cue.mode === 'off') return 'laser off';
  if(cue.mode==='hex')return `laser hex src ${cue.src.join(',')} step ${cue.step} turn ${cue.turn} dur ${cue.dur} field ${cue.field} signal ${cue.signal} prob ${cue.prob}`;
  if (cue.mode === 'text') return `laser text ${cue.text} span ${cue.span.join(' ')} mutate ${cue.mutate.join('->')} rate ${cue.rate} color ${cue.from.join(',')}${cue.field !== null ? ` field ${cue.field}` : ''}${cue.signal !== null ? ` signal ${cue.signal}` : ''}`;
  if (cue.mode === 'line') return `laser line span ${cue.span.join(' ')} color ${cue.from.join(',')}->${cue.to.join(',')} curve ${cue.curve}${cue.field !== null ? ` field ${cue.field}` : ''}${cue.signal !== null ? ` signal ${cue.signal}` : ''}`;
  if (cue.mode === 'flash') return `laser flash src ${cue.src.join(',')} prob ${cue.prob} dur ${cue.dur} color ${cue.color.join(',')} field ${cue.field} signal ${cue.signal}`;
  return `laser midixy src ${cue.src.join(',')} size ${cue.size} prob ${cue.prob} max ${cue.max} dur ${cue.dur}${cue.color ? ` color ${cue.color.join(',')}` : ''}${cue.field ? ` field ${cue.field}` : ''}${cue.signal !== undefined ? ` signal ${cue.signal}` : ''}`;
}
export const cueAccepts = (cue, division) => (cue?.mode === 'midixy' || cue?.mode === 'flash'||cue?.mode==='hex') && (cue.src.includes('all') || cue.src.includes(division));
