import { ORGAN_VELOCITY, KLAIS_CHANNELS, KLAIS_ROUTING_VERSION } from '../../../packages/hylon-midi/klais-routing.js';
import { createMidiNoteOutput } from '../../../packages/hylon-midi/note-output.js';
export function mountMidiOut(container, { notify = () => {}, onRouteChange = () => {}, onEnable = () => {}, getLevel = () => 1, onSend = () => {} } = {}) {
  container.innerHTML = `<p data-state class="status" role="status">DISABLED</p><p data-alert class="status" role="status"></p>
    <div class="note-test-grid"><label class="field">Ch<select data-test-channel>${Array.from({length:16},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label><label class="field">Note<input data-test-note type="number" min="0" max="127" value="60"></label><label class="field">ms<input data-test-duration type="number" min="10" max="2000" value="250"></label><button data-test title="Send one note using these settings">TEST NOTE</button><button data-sequence title="Note 60 · channels 1–5 · every 300 ms · duration 100 ms">TEST 1 → 5</button><button data-test-stop>STOP TEST NOTES</button></div>
    <p class="muted" title="SPORE fixed Klais routing: manuals I–IV on channels 1–4; pedal on channel 5">I 1 · II 2 · III 3 · IV 4 · P 5</p>
    <details><summary title="Software limit, not an instrument rating">ATTACK LIMIT</summary><div class="toolbar"><label class="field">Notes / s<input data-budget type="number" min="1" max="5000" value="1000"></label><button data-set-budget>APPLY</button></div></details>
    <p class="muted" title="Notes and explicitly captured registration ON/OFF messages. Disconnect and hidden pages stop note output. SUPER PANIC releases notes and sends CC123/120.">No MIDI thru · captured registration replay</p>`;
  const q = key => container.querySelector(`[data-${key}]`), mapping = KLAIS_CHANNELS;
  let sequence = 0, sequenceTimer = 0;
  let unmapped = 0, disposed = false, lastText = '', serial = 0;
  const gateway = createMidiNoteOutput({ onSend });
  const handle = fn => async (...args) => { try { await fn(...args); } catch(error) { notify(error.message); q('alert').textContent=error.message; } };
  function render() {
    if(disposed)return;const s=gateway.status();
    const text=`${s.armed?'ENABLED':'DISABLED'} · ${s.portName||'No output selected'} · TX ${s.sent} note-on(s) · HELD ${s.heldPitches} · QUEUE ${s.queued} · DROPPED ${s.dropped} · SHARED ${s.coalesced} · UNMAPPED ${unmapped}${s.fault?' · '+s.fault:' · '+s.reason}`;
    if(text!==lastText){q('state').textContent=`${s.armed?'ON':'OFF'} · ${s.portName||'Select OUT'}`;q('state').title=text;lastText=text;}
  }
  function cancelTest() { sequence++; clearTimeout(sequenceTimer); gateway.stopSource('tester'); }
  async function enable() { onEnable(); await gateway.arm(); q('alert').textContent=''; render(); }
  function testSequence() {
    gateway.assertReady(); cancelTest(); const token = sequence;
    const send = channel => {
      if (token !== sequence || !gateway.status().armed) return;
      gateway.schedule({owner:`tester:${++serial}`,source:'tester',channel,note:60,velocity:ORGAN_VELOCITY,durationMs:100}); gateway.tick(); render();
      if (channel < 5) sequenceTimer = setTimeout(() => { try { send(channel + 1); } catch(error) { cancelTest(); notify(error.message); } }, 300);
    };
    send(1);
  }
  q('sequence').onclick=handle(testSequence);
  q('test').onclick=handle(()=>{
    const read=key=>{if(!q(key).value.trim())throw new Error('Fill all note tester fields');return Number(q(key).value);};
    const durationMs=read('test-duration');if(durationMs>2000)throw new Error('Test duration is at most 2000 ms');
    gateway.schedule({owner:`tester:${++serial}`,source:'tester',channel:read('test-channel'),note:read('test-note'),velocity:ORGAN_VELOCITY,durationMs});gateway.tick();render();
  });
  q('test-stop').onclick=()=>{cancelTest();render();};
  q('set-budget').onclick=handle(()=>{gateway.setBudget(Number(q('budget').value));onRouteChange();render();});
  const timer=setInterval(()=>{gateway.tick();render();},10);
  render();
  return { setNoteRouteEnabled:value=>gateway.setNoteRouteEnabled(value),startTiming:prefix=>gateway.startTiming(prefix),stopTiming:()=>gateway.stopTiming(),timingReport:()=>gateway.timingReport(),enable, testSequence, select(port){cancelTest();onRouteChange();gateway.select(port);render();}, disarm(reason){cancelTest();gateway.disarm(reason);render();}, stop(){gateway.stopSource('spore');render();}, panic(){cancelTest();const result=gateway.panic();render();return result;},
    setSysexEnabled(value){gateway.setSysexEnabled(value);render();},
    cancelPanic(){gateway.cancelPanic();},
    async panic2(options){cancelTest();try{return await gateway.panic2(options);}finally{render();}},
    programChange(options){const messages=gateway.programChange(options);render();return messages;},
    sendRaw(bytes){const sent=gateway.sendRaw(bytes);render();return sent;},validRaw:bytes=>gateway.validRaw(Array.from(bytes||[])),
    assertReady(){gateway.assertReady();},
    scheduleTestNote({owner,channel,note,velocity,durationMs,whenMs}){const level=getLevel();gateway.assertReady();if(level<=0)return false;return gateway.schedule({owner,source:'tester',channel,note,velocity:ORGAN_VELOCITY,durationMs,whenMs,exact:owner.startsWith('attack:')});},
    setRearticulate:ms=>gateway.setRearticulate(ms),rearticulate:()=>gateway.rearticulate(),setAttackProfile:profile=>gateway.setAttackProfile(profile),attackProfile:()=>gateway.attackProfile(),setTimestamped(value,ms){gateway.setTimestamped(value,ms);onRouteChange();render();},setBudget(value){gateway.setBudget(value);onRouteChange();render();},
    stopTestOwner(owner){gateway.stopOwner(owner);},
    retimeTestOwner(owner,offMs){return gateway.retimeOwner(owner,offMs);},
    startFollower({channel,note,velocity}){const owner=`mic-follower:${++serial}`,level=getLevel();if(level<=0)return null;gateway.schedule({owner,source:'follower',channel,note,velocity:ORGAN_VELOCITY,durationMs:350});gateway.tick();return gateway.renew(owner)?owner:null;},
    renewFollower(owner){return gateway.renew(owner);},stopFollower(owner){if(owner)gateway.stopOwner(owner);else gateway.stopSource('follower');render();},
    dispatch(event,{when,durationSeconds,epoch}){if(event.kind!=='note'||getLevel()<=0)return;const channel=mapping[event.division];if(!channel){unmapped++;return;}gateway.schedule({owner:`spore:${epoch}:${event.eventId}`,source:'spore',channel,note:event.payload.note,velocity:ORGAN_VELOCITY,durationMs:Math.max(10,Math.min(600000,durationSeconds*1000)),whenMs:when*1000});},
    summary(){const s=gateway.status();return { ...s,routingVersion:KLAIS_ROUTING_VERSION,mapping:{...mapping},unmapped };},
    dispose(){if(disposed)return;cancelTest();gateway.dispose();disposed=true;clearInterval(timer);container.replaceChildren();}
  };
}
