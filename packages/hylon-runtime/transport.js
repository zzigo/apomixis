// One bounded local transport. It dispatches typed events, never hardware bytes.
export function createGeneratorTransport({ generator, clock = () => performance.now() / 1000, wallClock = () => performance.now() / 1000, onEvent = () => {}, onStop = () => {}, onChange = () => {}, durationMs = 300000 }) {
  let running = false, position = 0, anchor = 0, speed = 1, queue = [], scheduled = [], lastWall = 0, disposed = false, epoch = 0, dropped = 0;
  const attacks = [];
  const nowPosition = () => running ? Math.min(durationMs, position + (clock() - anchor) * 1000 * speed) : position;
  function pause(reason = 'paused') {
    if (running) { const value = nowPosition(); if (Number.isFinite(value)) position = value; queue.push(...scheduled.filter(item => item.atSessionMs >= position)); }
    running = false; scheduled = []; generator.stop(); attacks.length = 0; epoch++; onStop(reason); onChange();
  }
  function play() {
    if (disposed || running) return; if (position >= durationMs) seek(0);
    anchor = clock(); lastWall = wallClock(); generator.start(); running = true; onChange();
  }
  function tick() {
    if (!running || disposed) return;
    const wall = wallClock(), now = clock(), current = nowPosition();
    if (!Number.isFinite(now) || wall - lastWall > .3 || wall < lastWall || now < anchor) { pause('clock-stall'); return; }
    lastWall = wall;
    const horizon = Math.min(durationMs, current + 100 * speed);
    const result = generator.step({ endMs: horizon });
    if (result.budgetExhausted || queue.length + result.events.length > 4096) { pause('scheduler-budget'); return; }
    queue.push(...result.events); queue.sort((a, b) => a.atSessionMs - b.atSessionMs || Number(a.kind !== 'scene') - Number(b.kind !== 'scene') || (a.eventId < b.eventId ? -1 : 1));
    scheduled = scheduled.filter(event => event.atSessionMs >= current);
    while (queue.length && queue[0].atSessionMs <= horizon) {
      const event = queue.shift(); if (event.atSessionMs < current - 75 * speed) { dropped++; continue; }
      const when = Math.max(now, anchor + (event.atSessionMs - position) / (1000 * speed));
      while (attacks.length && attacks[0] <= when - 1) attacks.shift();
      if (event.kind === 'note' && attacks.length >= 45) { dropped++; continue; }
      if (event.kind === 'note') attacks.push(when);
      scheduled.push(event);
      try { onEvent(event, { when, durationSeconds: (event.payload.durationMs || 0) / (1000 * speed), epoch }); }
      catch { pause('adapter-fault'); return; }
    }
    if (current >= durationMs) pause('ended');
  }
  function seek(ms) {
    if (!Number.isFinite(ms) || ms < 0 || ms > durationMs) throw new Error('Invalid seek time');
    pause('seek'); generator.reset(); generator.start(); queue = [];
    while (generator.view().tNext * 1000 < ms && !generator.view().ended) {
      const result = generator.step({ endMs: ms, maxGenerations: 32 }); queue.push(...result.events.filter(event => event.atSessionMs >= ms));
      if (!result.budgetExhausted) break;
    }
    generator.stop(); position = ms; scheduled = []; dropped = 0; onChange();
  }
  return { play, pause, tick, seek,
    setClock(next) { if (running) pause('clock-change'); clock = next; },
    setSpeed(value) { if (![1, 2, 4, 8, 16].includes(value)) throw new Error('Invalid transport speed'); const was = running; pause('speed-change'); speed = value; if (was) play(); },
    reset(seed) { pause('reset'); generator.reset(seed); queue = []; scheduled = []; position = 0; dropped = 0; onChange(); },
    view() { return { running, positionMs: nowPosition(), speed, queued: queue.length, dropped, epoch }; },
    dispose() { if (disposed) return; pause('disposed'); disposed = true; }
  };
}
