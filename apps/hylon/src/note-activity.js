// Shared notation activity. Passive: never starts audio, forwards MIDI or arms outputs.
const held=new Map(),jobs=new Map(),listeners=new Set(),sustain=new Set();
function emit(kind,owner,entry){for(const listener of listeners)listener(kind,owner,entry);}
function off(owner){jobs.delete(owner);const entry=held.get(owner);if(entry){held.delete(owner);emit('off',owner,entry);}}
function on(owner,note,channel=1){if(!Number.isInteger(note)||note<0||note>127||!Number.isInteger(channel)||channel<1||channel>16)return;if(!held.has(owner)&&held.size>=2048)off(held.keys().next().value);const entry={note,channel,down:true};held.set(owner,entry);emit('on',owner,entry);}
function clear(prefix=''){for(const owner of [...jobs.keys()])if(owner.startsWith(prefix))jobs.delete(owner);for(const owner of [...held.keys()])if(owner.startsWith(prefix))off(owner);for(const key of [...sustain])if(key.startsWith(prefix))sustain.delete(key);}
export const noteActivity={on,off,clear,
 subscribe(listener){listeners.add(listener);for(const [owner,entry] of held)listener('on',owner,entry);return()=>listeners.delete(listener);},
 schedule(owner,note,channel,when,duration){if(!Number.isFinite(when)||!Number.isFinite(duration)||duration<=0)return;if(jobs.size>=8192)off(jobs.keys().next().value);jobs.set(owner,{note,channel,start:when*1000,end:(when+duration)*1000,started:false});},
 retime(owner,end){const job=jobs.get(owner);if(job&&Number.isFinite(end))job.end=end*1000;},
 midi(source,bytes){if(bytes?.length!==3)return;const [status,note,velocity]=bytes;if(![status,note,velocity].every(Number.isInteger)||status<128||status>239||note<0||note>127||velocity<0||velocity>127)return;const kind=status&240,channel=(status&15)+1,prefix=`${source}:${channel}:`,owner=prefix+note;
  if(kind===144&&velocity)on(owner,note,channel);
  else if(kind===128||kind===144&&!velocity){const entry=held.get(owner);if(entry){entry.down=false;if(!sustain.has(prefix))off(owner);}}
  else if(kind===176){if(note===120||note===123){clear(prefix);}else if(note===64||note===121){if(note===64&&velocity>=64)sustain.add(prefix);else{sustain.delete(prefix);for(const [key,entry] of held)if(key.startsWith(prefix)&&!entry.down)off(key);}}}
 }
};
setInterval(()=>{const now=performance.now();for(const [owner,job] of jobs){if(now>=job.end){if(!job.started)on(owner,job.note,job.channel);off(owner);continue;}if(!job.started&&now>=job.start){job.started=true;on(owner,job.note,job.channel);}}},20);
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
