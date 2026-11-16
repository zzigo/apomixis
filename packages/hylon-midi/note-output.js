import {createMidiTiming} from './timing.js';
import {ATTACK_DEFAULT,normalizeAttackProfile,shapeDuration,attackFloor} from './attack-profile.js';
// Note gateway plus explicit operator panic CC123/120 and operator-triggered Program Change
// (REGISTERS PGM OUT) and raw operator sends incl. SysEx/CC (CAPTURE tester, REGISTERS CC),
// composer request 2026-11-12: restrictions relaxed for wiring/console tests. No thru.
export function createMidiNoteOutput({ now = () => performance.now(), onChange = () => {}, onSend = () => {} } = {}) {
  let noteRouteEnabled=true;
  let port = null, armed = false, epoch = 0, fault = '', reason = 'startup', budget = 1000, lastTick = null, disposed = false;
  let queue = [], sent = 0, dropped = 0, coalesced = 0, panicJob = null, panicRevision = 0, sysexEnabled = false;
  const timing=createMidiTiming();
  // Attack floor (see attack-profile.js) and optional driver timestamps. With timestamps ON, notes
  // due within `lookahead` ms are handed to the driver with their exact time instead of waiting
  // for the 10 ms tick; a committed note can no longer be retimed, so the lookahead stays short.
  let profile=normalizeAttackProfile(ATTACK_DEFAULT),timestamped=false,lookahead=25,stretched=0;
  // Re-attack: a note arriving on a key that is still sounding releases it and attacks again after this gap (ms).
  // 0 = old behaviour (the new note only prolongs the sounding one, no new attack).
  let rearticulateMs=30,rearticulated=0;const lastOff=new Map();
  const owners = new Map(), pitches = new Map(), attacks = [];
  const changed = () => { try { onChange(); } catch {} };
  const integer = (n, a, b) => Number.isInteger(n) && n >= a && n <= b;
  function send(bytes, at) { if (!port || port.state !== 'connected') throw new Error('Selected MIDI output disconnected'); if (at === undefined) port.send(bytes); else port.send(bytes, at); try { onSend(bytes, port, at); } catch {} }
  function release(owner, at) {
    const item = owners.get(owner); if (!item) return;
    owners.delete(owner); const group = pitches.get(item.key); group?.delete(owner);
    // A note-on already handed to the driver with a future time must not be overtaken by its note-off.
    if (timestamped && at === undefined && item.sentAt > now()) at = item.sentAt + 1;
    if (!group?.size) { pitches.delete(item.key); try { send([0x80 | (item.channel - 1), item.note, 0], at); if (at !== undefined) lastOff.set(item.key, at); timing.record({type:'off',owner,channel:item.channel,note:item.note,targetMs:item.offMs,actualMs:at===undefined?now():Math.max(at,now())}); } catch (error) { throw new Error(`Note-off failed; release notes on the device manually: ${error.message}`); } }
  }
  function disarm(why = 'disabled') {
    epoch++; armed = false; reason = why; queue = []; attacks.length = 0; lastTick = null;
    // Try every owned key even if one note-off fails; failed delivery is visible.
    let failed = 0;
    const after = timestamped ? now() + lookahead + 5 : undefined; // after any note-on still waiting in the driver
    for (const key of pitches.keys()) { const item = owners.get(pitches.get(key).values().next().value); try { send([0x80 | (item.channel - 1), item.note, 0], after); } catch { failed++; } }
    owners.clear(); pitches.clear(); lastOff.clear(); if (failed) fault = `${failed} note-off(s) could not be delivered; check device manually`; changed();
  }
  function fail(error) { fault = error.message || String(error); disarm('fault'); }
  function select(nextPort) { if (panicJob) throw new Error('P2 running; wait before changing MIDI OUT'); const old = port; disarm('port-change'); port = nextPort || null; changed(); if (old && old !== port) Promise.resolve(old.close()).catch(() => {}); }
  async function arm() {
    if (panicJob) throw new Error('P2 running; MIDI stays disabled until complete');
    if (disposed || !port || port.state !== 'connected') throw new Error('Select a connected MIDI output in I/O');
    disarm('enabling'); const mine = epoch, selected = port;
    try { await selected.open(); }
    catch (error) { if (mine === epoch) fail(error); throw error; }
    if (disposed || mine !== epoch || selected !== port || selected.state !== 'connected') { if (selected !== port || disposed) Promise.resolve(selected.close()).catch(() => {}); throw new Error('MIDI enable cancelled'); }
    fault = ''; armed = true; reason = 'enabled'; lastTick = now(); changed();
  }
  function schedule({ owner, source, channel, note, velocity, durationMs, whenMs = now(), exact = false }) {
    if (disposed || !armed) throw new Error('MIDI NOTE OUT is disabled');
    if(!noteRouteEnabled)return false;
    const time = now();
    if (!['spore', 'tester', 'follower'].includes(source) || typeof owner !== 'string' || !owner.length || owner.length > 256 || !integer(channel, 1, 16) || !integer(note, 0, 127) || !integer(velocity, 1, 127) || !Number.isFinite(durationMs) || durationMs < 10 || durationMs > 600000 || !Number.isFinite(whenMs) || whenMs < time - 80 || whenMs > time + 250) throw new Error('Invalid bounded MIDI note');
    if (queue.length >= 8192 || owners.size >= 1024) { dropped++; timing.record({type:'dropped',owner,targetMs:whenMs,actualMs:time}); changed(); return false; }
    if (owners.has(owner) || queue.some(item => item.owner === owner)) throw new Error('Duplicate MIDI note owner');
    if (!exact && source !== 'follower') { const shaped = Math.min(600000, shapeDuration(profile, channel, durationMs)); if (shaped > durationMs + .5) stretched++; durationMs = shaped; }
    queue.push({ owner, source, channel, note, velocity, whenMs, offMs: whenMs + durationMs, key: `${channel}:${note}`, epoch, exact });
    timing.record({type:'scheduled',owner,channel,note,targetMs:whenMs,actualMs:time,durationMs});
    queue.sort((a, b) => a.whenMs - b.whenMs); changed(); return true;
  }
  function stopSource(source) {
    queue = queue.filter(item => item.source !== source);
    try { for (const [owner, item] of owners) if (item.source === source) release(owner); }
    catch (error) { fail(error); } changed();
  }
  function tick() {
    if (!armed || disposed) return; const time = now();
    if (port?.state !== 'connected') { fail(new Error('Selected MIDI output disconnected')); return; }
    if (!Number.isFinite(time) || lastTick !== null && (time - lastTick > 250 || time < lastTick)) { disarm('clock-stall'); return; }
    lastTick = time;
    try {
      // Release notes before new attacks, even if a whole batch is now late.
      const horizon = timestamped ? time + lookahead : time;
      for (const [owner, item] of owners) if (item.offMs <= horizon) release(owner, timestamped && item.offMs > time ? item.offMs : undefined);
      for (const [key, at] of lastOff) if (at <= time) lastOff.delete(key);
      while (attacks.length && attacks[0] <= time - 1000) attacks.shift();
      while (queue.length && queue[0].whenMs <= horizon) {
        const item = queue.shift();
        if (item.epoch !== epoch || item.offMs <= time || time - item.whenMs > 80 || owners.size >= 1024) { dropped++; timing.record({type:'dropped',owner:item.owner,targetMs:item.whenMs,actualMs:time}); continue; }
        if (pitches.has(item.key) && rearticulateMs > 0 && !item.rearticulated && item.source !== 'follower' && attacks.length < budget) {
          const offAt = timestamped ? Math.max(time, item.whenMs - rearticulateMs) : undefined;
          send([0x80 | (item.channel - 1), item.note, 0], offAt); lastOff.set(item.key, offAt ?? time);
          item.rearticulated = true; item.whenMs = (offAt ?? time) + rearticulateMs; if (item.offMs < item.whenMs + 10) item.offMs = item.whenMs + 10;
          queue.push(item); queue.sort((a, b) => a.whenMs - b.whenMs); rearticulated++; timing.record({type:'rearticulated',owner:item.owner,targetMs:item.whenMs,actualMs:time}); continue;
        }
        if (pitches.has(item.key) && !item.rearticulated) { pitches.get(item.key).add(item.owner); coalesced++; timing.record({type:'coalesced',owner:item.owner,targetMs:item.whenMs,actualMs:time}); }
        else {
          if (attacks.length >= budget) { dropped++; timing.record({type:'dropped',owner:item.owner,targetMs:item.whenMs,actualMs:time}); continue; }
          // Never before a note-off of the same key that is already waiting in the driver.
          const at = timestamped ? Math.max(item.whenMs, (lastOff.get(item.key) ?? -Infinity) + 1) : undefined, future = at !== undefined && at > time;
          send([0x90 | (item.channel - 1), item.note, item.velocity], future ? at : undefined); item.sentAt = future ? at : time; sent++; timing.record({type:'on',owner:item.owner,channel:item.channel,note:item.note,targetMs:item.whenMs,actualMs:future?at:now()}); attacks.push(time); if (pitches.has(item.key)) pitches.get(item.key).add(item.owner); else pitches.set(item.key, new Set([item.owner]));
        }
        owners.set(item.owner, item);
      }
    } catch (error) { fail(error); } changed();
  }
  function panic() {
    const late = timestamped ? now() + lookahead + 10 : undefined; disarm('SUPER PANIC'); let failed = 0;
    if (port?.state === 'connected') for (let channel = 0; channel < 16; channel++) for (const cc of [64, 120, 121, 123]) {
      try { send([0xb0 | channel, cc, 0]); } catch { failed++; }
    }
    if (port?.state === 'connected') for (let channel=0;channel<16;channel++){try{send([0xe0|channel,0,64]);}catch{failed++;}}
    // With driver timestamps a note-on may still be waiting: repeat all-notes-off after it.
    if (late !== undefined && port?.state === 'connected') for (let channel = 0; channel < 16; channel++) for (const cc of [120, 123]) { try { send([0xb0 | channel, cc, 0], late); } catch { failed++; } }
    if (!port || port.state !== 'connected') failed = Math.max(80, failed);
    if (failed) fault = `${failed} panic message(s) failed; release notes on the device manually`;
    changed(); return { failed, selected: !!port };
  }
  // P2 is an explicit operator recovery action, including pitches not owned by HYLON.
  // Pin the selected port; never arm notes or silently switch to a different device.
  function panic2({ onProgress = () => {}, passes = 3 } = {}) {
    if (panicJob) return panicJob;
    const target = port, mine = ++panicRevision; passes=Math.max(1,Math.min(5,Math.round(passes)||3));
    try { target?.clear?.(); } catch {} // Cancel queued Web MIDI messages before release.
    disarm('P2');
    const job = (async () => {
      if (disposed || !target || target.state !== 'connected') throw new Error('P2: select a connected MIDI OUT in I/O');
      await target.open();
      let delivered = 0, failed = 0, cancelled = false;
      const total = passes * (16 * 5 + 2048) + 16 * 5;
      let pass = 0;
      const progress = () => { try { onProgress({ sent: delivered, failed, total, pass, passes }); } catch {} };
      const transmit = bytes => {
        try { target.send(bytes); delivered++; try { onSend(bytes, target); } catch {} }
        catch { failed++; }
      };
      const resetChannels = () => {for (let channel=0;channel<16;channel++){
        for(const cc of [64,120,121,123])transmit([0xb0|channel,cc,0]);
        transmit([0xe0|channel,0,64]);
      }};
      // SC-style immediate sends separated by actual waits, not a timestamp backlog.
      // Browser timers can exceed 1ms; progress reports dispatch, not physical silence.
      sweep: for(pass=1;pass<=passes;pass++){
        resetChannels();progress();
        for(let channel=0;channel<16;channel++)for(let note=0;note<128;note++){
          if(disposed||mine!==panicRevision||target.state!=='connected'){
            failed+=total-delivered-failed;cancelled=true;break sweep;
          }
          transmit([0x80|channel,note,0]);
          if(note%32===0)progress();
          await new Promise(resolve=>setTimeout(resolve,1));
        }
      }
      pass=Math.min(pass,passes);if(!cancelled)resetChannels();progress();
      if (failed) fault = `P2: ${failed} messages failed; check the device`;
      else fault = '';
      reason = cancelled ? 'P2 interrupted' : failed ? 'P2 delivery failed' : 'P2 complete';
      changed();
      return { sent: delivered, failed, total, passes, cancelled, selected: true, portName: target.name || target.id };
    })();
    panicJob = job.finally(() => { panicJob = null; changed(); });
    return panicJob;
  }
  // One explicit local operator command: optional bank select CC0/CC32, then PC. Requires MIDI ON.
  function programChange({ channel, program, bankMsb = null, bankLsb = null }) {
    if (disposed || !armed) throw new Error('Turn MIDI ON in I/O or the header');
    if (!integer(channel, 1, 16) || !integer(program, 0, 127) || (bankMsb !== null && !integer(bankMsb, 0, 127)) || (bankLsb !== null && !integer(bankLsb, 0, 127))) throw new Error('Invalid Program Change');
    const messages = [];
    if (bankMsb !== null) messages.push([0xb0 | (channel - 1), 0, bankMsb]);
    if (bankLsb !== null) messages.push([0xb0 | (channel - 1), 32, bankLsb]);
    messages.push([0xc0 | (channel - 1), program]);
    try { for (const bytes of messages) { send(bytes); sent++; } } catch (error) { fail(error); throw error; }
    changed(); return messages;
  }
  // Any single well-formed MIDI message (channel, system common/realtime or complete SysEx F0…F7).
  function validRaw(b) {
    if (!Array.isArray(b) || !b.length || b.length > 4096 || !b.every(x => integer(x, 0, 255))) return false;
    if (b[0] === 0xf0) return b.length >= 2 && b.at(-1) === 0xf7 && b.slice(1, -1).every(x => x < 128);
    const length = b[0] >= 0x80 && b[0] < 0xf0 ? ([0xc, 0xd].includes(b[0] >> 4) ? 2 : 3) : ({ 0xf1: 2, 0xf2: 3, 0xf3: 2, 0xf6: 1, 0xf8: 1, 0xfa: 1, 0xfb: 1, 0xfc: 1, 0xfe: 1, 0xff: 1 })[b[0]];
    return !!length && b.length === length && b.slice(1).every(x => x < 128);
  }
  function sendRaw(bytes) {
    if (disposed || !armed) throw new Error('Turn MIDI ON in I/O or the header');
    const b = Array.from(bytes || []);
    if (!validRaw(b)) throw new Error('Not a single well-formed MIDI message');
    if(b[0]===0xf0&&!sysexEnabled)throw new Error('SysEx is OFF in I/O');
    try { send(b); sent++; }
    catch (error) {
      if (b[0] === 0xf0 && /access|permission|sysex/i.test(`${error.name} ${error.message}`)) throw new Error('Browser refused SysEx: tick SysEx in I/O, allow it when Chrome asks, then MIDI OFF/ON');
      throw error;
    }
    changed(); return b;
  }
  return { setNoteRouteEnabled(value){noteRouteEnabled=value===true;if(!noteRouteEnabled){queue=[];try{for(const owner of [...owners.keys()])release(owner);}catch(error){fail(error);}}changed();},startTiming(prefix='attack:'){timing.start(prefix,now());},stopTiming(){timing.stop();},timingReport:()=>timing.snapshot(),setSysexEnabled(value){sysexEnabled=value===true;changed();},select, arm, disarm, schedule, tick, stopSource, panic, panic2, cancelPanic(){panicRevision++;}, programChange, sendRaw, validRaw,
    retimeOwner(owner,offMs){const time=now();if(!Number.isFinite(offMs)||offMs>time+600250)throw new Error('Invalid note end');const item=owners.get(owner)||queue.find(item=>item.owner===owner);if(!item)return false;if(!item.exact)offMs=Math.max(offMs,item.whenMs+attackFloor(profile,item.channel));if(offMs<=time){queue=queue.filter(item=>item.owner!==owner);try{release(owner);}catch(error){fail(error);}return true;}item.offMs=offMs;return true;},
    setRearticulate(ms){if(!Number.isFinite(ms)||ms<0||ms>200)throw new Error('Re-attack gap must be 0–200 ms');rearticulateMs=ms;changed();return ms;},rearticulate:()=>rearticulateMs,
    setAttackProfile(next){profile=normalizeAttackProfile(next);changed();return{...profile,offsets:{...profile.offsets}};},attackProfile:()=>({...profile,offsets:{...profile.offsets}}),
    setTimestamped(value,ms=lookahead){if(!Number.isFinite(ms)||ms<5||ms>60)throw new Error('Timestamp lookahead must be 5–60 ms');disarm('timing-change');timestamped=value===true;lookahead=ms;changed();},
    stopOwner(owner){queue=queue.filter(item=>item.owner!==owner);try{release(owner);}catch(error){fail(error);}changed();},
    renew(owner,durationMs=350){if(!armed||!Number.isFinite(durationMs)||durationMs<10||durationMs>1000)return false;const item=owners.get(owner);if(!item)return false;item.offMs=now()+durationMs;return true;},
    setBudget(value) { if (!integer(value, 1, 5000)) throw new Error('Attack cap must be 1–5000 per second'); disarm('budget-change'); budget = value; changed(); },
    assertReady() { if (!armed || port?.state !== 'connected') throw new Error('Turn MIDI ON in I/O or the header'); },
    status: () => ({ armed,noteRouteEnabled,portId: port?.id || '', portName: port?.name || '', epoch, reason, fault, budget, sysexEnabled, sweeping:!!panicJob, queued: queue.length, active: owners.size, heldPitches: pitches.size, sent, dropped, coalesced, stretched, timestamped, lookahead }),
    dispose() { if (disposed) return; panicRevision++;disarm('disposed'); disposed = true; }
  };
}
