// Normalized screen geometry, without device authority.
export const SWEEPS = ['LR', 'RL', 'TD', 'DT'];
const line = (a, b) => ({ points: [a, b], intensity: 1 });
export function testFrame(shape = 'square') {
  if (shape === 'square') return [line([0, 0], [1, 0]), line([1, 0], [1, 1]), line([1, 1], [0, 1]), line([0, 1], [0, 0])];
  if (shape === 'high') return [line([0, 0], [1, 0])];
  if (shape === 'low') return [line([0, 1], [1, 1])];
  throw new Error('Unknown frame shape');
}
export function sweepFrame(seconds, duration = 2, direction = 'sequence') {
  if (!Number.isFinite(seconds) || seconds < 0 || !Number.isFinite(duration) || duration < .1 || duration > 30) throw new Error('Invalid sweep timing');
  if (direction !== 'sequence' && !SWEEPS.includes(direction)) throw new Error('Unknown direction');
  const pass = seconds / duration, current = direction === 'sequence' ? SWEEPS[Math.floor(pass) % 4] : direction;
  const t = pass % 1, p = ['RL', 'DT'].includes(current) ? 1 - t : t;
  return { direction: current, strokes: ['LR', 'RL'].includes(current) ? [line([p, 0], [p, 1])] : [line([0, p], [1, p])] };
}
export class MidiPoints {
  constructor({ random = Math.random, limit = 32 } = {}) {
    if (!Number.isInteger(limit) || limit < 1 || limit > 128) throw new Error('Invalid point limit');
    this.random = random; this.limit = limit; this.notes = new Map();
  }
  clear() { this.notes.clear(); }
  receive(bytes, channel = 'all') {
    if (!bytes || bytes.length !== 3 || !Array.from(bytes).every(n => Number.isInteger(n) && n >= 0 && n <= 255)) return false;
    const [status, note, velocity] = bytes;
    if (note > 127 || velocity > 127 || status < 128 || status > 239) return false;
    const kind = status & 240, ch = (status & 15) + 1;
    if (channel !== 'all' && ch !== channel) return false;
    if (kind === 176 && [120, 123].includes(note)) {
      for (const [key, value] of this.notes) if (value.channel === ch) this.notes.delete(key);
      return true;
    }
    if (![128, 144].includes(kind)) return false;
    const key = `${ch}:${note}`;
    if (kind === 128 || velocity === 0) { this.notes.delete(key); return true; }
    const x = this.random(), y = this.random();
    if (![x, y].every(n => Number.isFinite(n) && n >= 0 && n <= 1)) throw new Error('Invalid random coordinate');
    this.notes.delete(key);
    if (this.notes.size >= this.limit) this.notes.delete(this.notes.keys().next().value);
    this.notes.set(key, { x, y, intensity: velocity / 127, note, channel: ch });
    return true;
  }
  snapshot() { return Array.from(this.notes.values(), p => ({ ...p })); }
}
