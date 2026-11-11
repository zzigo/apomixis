import { KLAIS_CHANNELS, KLAIS_ROUTING_VERSION } from '../../../packages/hylon-midi/klais-routing.js';
import { createMidiNoteOutput } from '../../../packages/hylon-midi/note-output.js';
export function mountMidiOut(container, { notify = () => {}, onRouteChange = () => {}, onEnable = () => {} } = {}) {
  container.innerHTML = `<div class="eyebrow">NOTE OUTPUT / EXPLICIT LOCAL ENABLE</div><div class="toolbar"><button data-enable class="primary">ENABLE NOTE OUT</button><button data-disable class="danger">STOP / DISABLE MIDI OUT</button></div><p data-state class="status" role="status">DISABLED</p><p data-alert class="status" role="status"></p>
    <div class="toolbar"><label class="field">Test channel<select data-test-channel>${Array.from({length:16},(_,i)=>`<option value="${i+1}">${i+1}</option>`).join('')}</select></label><label class="field">Test note / MIDI<input data-test-note type="number" min="0" max="127" value="60"></label><label class="field">Velocity<input data-test-velocity type="number" min="1" max="127" value="64"></label><label class="field">Duration / ms<input data-test-duration type="number" min="10" max="2000" value="250"></label><button data-test>TEST NOTE</button><button data-test-stop>STOP TEST NOTES</button></div>
    <p class="muted">C4 = MIDI 60. Tester sends a finite note only to the selected output; no local sampler audition. Channel numbers are 1–16.</p><div class="eyebrow">SPORE / FIXED KLAIS MAP · I=1 / II=2 / III=3 / IV=4 / PEDAL=5</div><div class="toolbar">${Object.entries(KLAIS_CHANNELS).map(([d,ch])=>`<label class="field">${d.toUpperCase()} / ${ch===5?'PEDAL':'MANUAL '+ch}<select data-division="${d}" disabled><option value="${ch}">Channel ${ch}</option></select></label>`).join('')}</div>
    <div class="toolbar"><label class="field">Software attack cap / second<input data-budget type="number" min="1" max="50" value="10"></label><button data-set-budget>SET CAP / DISARM</button></div>
    <p class="muted">SPORE uses the fixed channel map specified by the composer. Voice variables resolve through logical divisions; no per-session channel assignment is required. Performance sends notes only. SUPER PANIC additionally sends CC123/120 to all 16 channels of the selected output. Score stops/couplers, SysEx and PC are not transmitted. Attack cap is a software setting, not a verified instrument limit. Capture, reload, disconnect and hidden pages disable note output.</p>`;
  const q = key => container.querySelector(`[data-${key}]`), mapping = KLAIS_CHANNELS;
  let unmapped = 0, disposed = false, lastText = '', serial = 0;
  const gateway = createMidiNoteOutput();
  const handle = fn => async (...args) => { try { await fn(...args); } catch(error) { notify(error.message); q('alert').textContent=error.message; } };
  function render() {
    if(disposed)return;const s=gateway.status();
    const text=`${s.armed?'ENABLED':'DISABLED'} · ${s.portName||'No output selected'} · TX ${s.sent} note-on(s) · HELD ${s.heldPitches} · QUEUE ${s.queued} · DROPPED ${s.dropped} · SHARED ${s.coalesced} · UNMAPPED ${unmapped}${s.fault?' · '+s.fault:' · '+s.reason}`;
    if(text!==lastText){q('state').textContent=text;lastText=text;}
  }
  q('enable').onclick=handle(async()=>{onEnable();await gateway.arm();q('alert').textContent='Note output enabled for the selected port.';render();});
  q('disable').onclick=()=>{gateway.disarm('operator-stop');onRouteChange();render();};
  q('test').onclick=handle(()=>{
    const read=key=>{if(!q(key).value.trim())throw new Error('Fill all note tester fields');return Number(q(key).value);};
    const durationMs=read('test-duration');if(durationMs>2000)throw new Error('Test duration is at most 2000 ms');
    gateway.schedule({owner:`tester:${++serial}`,source:'tester',channel:read('test-channel'),note:read('test-note'),velocity:read('test-velocity'),durationMs});gateway.tick();render();
  });
  q('test-stop').onclick=()=>{gateway.stopSource('tester');render();};
  q('set-budget').onclick=handle(()=>{gateway.setBudget(Number(q('budget').value));onRouteChange();render();});
  const timer=setInterval(()=>{gateway.tick();render();},10);
  render();
  return { select(port){onRouteChange();gateway.select(port);render();}, disarm(reason){gateway.disarm(reason);render();}, stop(){gateway.stopSource('spore');render();}, panic(){const result=gateway.panic();render();return result;},
    assertReady(){gateway.assertReady();},
    dispatch(event,{when,durationSeconds,epoch}){if(event.kind!=='note')return;const channel=mapping[event.division];if(!channel){unmapped++;return;}gateway.schedule({owner:`spore:${epoch}:${event.eventId}`,source:'spore',channel,note:event.payload.note,velocity:event.payload.velocity,durationMs:Math.max(10,Math.min(10000,durationSeconds*1000)),whenMs:when*1000});},
    summary(){const s=gateway.status();return { ...s,routingVersion:KLAIS_ROUTING_VERSION,mapping:{...mapping},unmapped };},
    dispose(){if(disposed)return;gateway.dispose();disposed=true;clearInterval(timer);container.replaceChildren();}
  };
}
