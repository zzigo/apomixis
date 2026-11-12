// Note gateway plus explicit operator panic CC123/120. No SysEx/PC/clock/thru or browser queue.
export function createMidiNoteOutput({ now = () => performance.now(), onChange = () => {} } = {}) {
  let port = null, armed = false, epoch = 0, fault = '', reason = 'startup', budget = 10, lastTick = null, disposed = false;
  let queue = [], sent = 0, dropped = 0, coalesced = 0;
  const owners = new Map(), pitches = new Map(), attacks = [];
  const changed = () => { try { onChange(); } catch {} };
  const integer = (n, a, b) => Number.isInteger(n) && n >= a && n <= b;
  function send(bytes) { if (!port || port.state !== 'connected') throw new Error('Selected MIDI output disconnected'); port.send(bytes); }
  function release(owner) {
    const item = owners.get(owner); if (!item) return;
    owners.delete(owner); const group = pitches.get(item.key); group?.delete(owner);
    if (!group?.size) { pitches.delete(item.key); try { send([0x80 | (item.channel - 1), item.note, 0]); } catch (error) { throw new Error(`Note-off failed; release notes on the device manually: ${error.message}`); } }
  }
  function disarm(why = 'disabled') {
    epoch++; armed = false; reason = why; queue = []; attacks.length = 0; lastTick = null;
    // Try every owned key even if one note-off fails; failed delivery is visible.
    let failed = 0;
    for (const key of pitches.keys()) { const item = owners.get(pitches.get(key).values().next().value); try { send([0x80 | (item.channel - 1), item.note, 0]); } catch { failed++; } }
    owners.clear(); pitches.clear(); if (failed) fault = `${failed} note-off(s) could not be delivered; check device manually`; changed();
  }
  function fail(error) { fault = error.message || String(error); disarm('fault'); }
  function select(nextPort) { const old = port; disarm('port-change'); port = nextPort || null; changed(); if (old && old !== port) Promise.resolve(old.close()).catch(() => {}); }
  async function arm() {
    if (disposed || !port || port.state !== 'connected') throw new Error('Select a connected MIDI output in I/O');
    disarm('enabling'); const mine = epoch, selected = port;
    try { await selected.open(); }
    catch (error) { if (mine === epoch) fail(error); throw error; }
    if (disposed || mine !== epoch || selected !== port || selected.state !== 'connected') { if (selected !== port || disposed) Promise.resolve(selected.close()).catch(() => {}); throw new Error('MIDI enable cancelled'); }
    fault = ''; armed = true; reason = 'enabled'; lastTick = now(); changed();
  }
  function schedule({ owner, source, channel, note, velocity, durationMs, whenMs = now() }) {
    if (disposed || !armed) throw new Error('MIDI NOTE OUT is disabled');
    const time = now();
    if (!['spore', 'tester'].includes(source) || typeof owner !== 'string' || !owner.length || owner.length > 256 || !integer(channel, 1, 16) || !integer(note, 0, 127) || !integer(velocity, 1, 127) || !Number.isFinite(durationMs) || durationMs < 10 || durationMs > 10000 || !Number.isFinite(whenMs) || whenMs < time - 80 || whenMs > time + 250) throw new Error('Invalid bounded MIDI note');
    if (queue.length >= 512 || owners.size >= 64) { dropped++; changed(); return false; }
    if (owners.has(owner) || queue.some(item => item.owner === owner)) throw new Error('Duplicate MIDI note owner');
    queue.push({ owner, source, channel, note, velocity, whenMs, offMs: whenMs + durationMs, key: `${channel}:${note}`, epoch });
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
      for (const [owner, item] of owners) if (item.offMs <= time) release(owner);
      while (attacks.length && attacks[0] <= time - 1000) attacks.shift();
      while (queue.length && queue[0].whenMs <= time) {
        const item = queue.shift();
        if (item.epoch !== epoch || item.offMs <= time || time - item.whenMs > 80 || owners.size >= 64) { dropped++; continue; }
        if (pitches.has(item.key)) { pitches.get(item.key).add(item.owner); coalesced++; }
        else {
          if (attacks.length >= budget) { dropped++; continue; }
          send([0x90 | (item.channel - 1), item.note, item.velocity]); sent++; attacks.push(time); pitches.set(item.key, new Set([item.owner]));
        }
        owners.set(item.owner, item);
      }
    } catch (error) { fail(error); } changed();
  }
  function panic() {
    disarm('SUPER PANIC'); let failed = 0;
    if (port?.state === 'connected') for (let channel = 0; channel < 16; channel++) for (const cc of [123, 120]) {
      try { send([0xb0 | channel, cc, 0]); } catch { failed++; }
    }
    if (port && port.state !== 'connected') failed = Math.max(32, failed);
    if (failed) fault = `${failed} panic message(s) failed; release notes on the device manually`;
    changed(); return { failed, selected: !!port };
  }
  return { select, arm, disarm, schedule, tick, stopSource, panic,
    setBudget(value) { if (!integer(value, 1, 50)) throw new Error('Attack cap must be 1–50 per second'); disarm('budget-change'); budget = value; changed(); },
    assertReady() { if (!armed || port?.state !== 'connected') throw new Error('Turn MIDI ON in I/O or the header'); },
    status: () => ({ armed, portId: port?.id || '', portName: port?.name || '', epoch, reason, fault, budget, queued: queue.length, active: owners.size, heldPitches: pitches.size, sent, dropped, coalesced }),
    dispose() { if (disposed) return; disarm('disposed'); disposed = true; }
  };
}
