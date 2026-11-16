import {noteActivity} from './note-activity.js';
// Owned audition notes: stopping a lab releases its own voices, never a whole score.
// independent: the lab's K / LA voices bypass the header K / LA gates (its own destination assignment).
export function createNoteLabPlayer({id,audio,sampler,midiOut,independent=false,onError=()=>{}}){
 let serial=0,revision=0,disposed=false;const jobs=new Map();
 function release(owner){const job=jobs.get(owner);if(!job)return;jobs.delete(owner);noteActivity.off(`lab:${owner}`);clearTimeout(job.start);clearTimeout(job.end);if(job.klais)sampler.stopFollower(owner);if(job.midi)midiOut.stopTestOwner(owner);if(job.osc){try{job.osc.stop();}catch{}try{job.osc.disconnect();job.gain.disconnect();}catch{}}}
 function stop(){revision++;for(const owner of [...jobs.keys()])release(owner);}
 async function prepare(routes){const mine=revision;if(routes.audio||routes.klais){await audio.ensure();if(mine!==revision||disposed)throw new Error('Audition cancelled');await audio.context.resume();}if(routes.klais)await sampler.prepareScore();if(routes.midi)midiOut.assertReady();if(mine!==revision||disposed)throw new Error('Audition cancelled');}
 function dispatch(note,when,routes){
  if(disposed)return false;if(!routes.klais&&!routes.audio&&!routes.midi)return null;if(jobs.size>=2048)throw new Error('Audition voice budget reached');
  const now=performance.now()/1000;if(when<now-.08)return false;
  const owner=`${id}:${++serial}`,duration=Math.max(.01,Math.min(600,note.duration)),velocity=Math.max(1,Math.min(127,Math.round(note.velocity))),job={when,endTime:when+duration,velocity};jobs.set(owner,job);noteActivity.schedule(`lab:${owner}`,note.midi,note.channel,when,duration);
  try{
   if(routes.midi){job.midi=true;midiOut.scheduleTestNote({owner,channel:note.channel,note:note.midi,velocity,durationMs:duration*1000,whenMs:when*1000});}
   if(routes.audio&&audio.context?.state==='running'){
    const context=audio.context,at=context.currentTime+Math.max(0,when-now),gain=context.createGain(),osc=context.createOscillator();job.osc=osc;job.gain=gain;job.level=.08*velocity/127;osc.type='triangle';osc.frequency.value=440*2**((note.midi-69)/12);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.08*velocity/127,at+Math.min(.002,duration*.2));gain.gain.setValueAtTime(.08*velocity/127,at+duration*.8);gain.gain.linearRampToValueAtTime(0,at+duration);osc.connect(gain);gain.connect(independent?audio.directDestination('audio'):audio.localDestination());osc.start(at);osc.stop(at+duration+.005);osc.onended=()=>{job.audioEnded=true;try{osc.disconnect();gain.disconnect();}catch{}};
   }
   if(routes.klais){job.start=setTimeout(()=>{if(!jobs.has(owner))return;try{job.klais=!!sampler.startFollower(owner,note.midi,velocity,note.channel);}catch(error){release(owner);onError(error);}},Math.max(0,(when-now)*1000));}
   job.end=setTimeout(()=>release(owner),Math.max(0,(when-now+duration+.02)*1000));return owner;
  }catch(error){release(owner);throw error;}
 }
 function update(owner,{endTime,velocity}){
  const job=jobs.get(owner);if(!job)return false;const now=performance.now()/1000;
  if(!Number.isFinite(endTime))return false;endTime=Math.min(endTime,job.when+600);if(endTime<=now){release(owner);return true;}
  if(Math.abs(endTime-job.endTime)<.005&&velocity===job.velocity)return true;
  noteActivity.retime(`lab:${owner}`,endTime);job.endTime=endTime;job.velocity=velocity;
  if(job.midi)midiOut.retimeTestOwner(owner,endTime*1000);
  if(job.osc&&!job.audioEnded){const context=audio.context,delay=Math.max(0,job.when-now),at=context.currentTime+delay,remaining=Math.max(.001,endTime-now-delay),level=.08*velocity/127;if(delay){job.gain.gain.cancelScheduledValues(at);job.gain.gain.setValueAtTime(0,at);}else job.gain.gain.cancelAndHoldAtTime(at);job.gain.gain.linearRampToValueAtTime(level,at+Math.min(.008,remaining*.2));job.gain.gain.setValueAtTime(level,at+remaining*.8);job.gain.gain.linearRampToValueAtTime(0,at+remaining);try{job.osc.stop(at+remaining+.005);}catch{}}
  clearTimeout(job.end);job.end=setTimeout(()=>release(owner),Math.max(0,(endTime-now+.02)*1000));return true;
 }
 return {prepare,dispatch,update,release,has:owner=>jobs.has(owner),stop,get revision(){return revision},dispose(){stop();disposed=true;}};
}
