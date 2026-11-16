// OSC bridge for TouchOSC (UDP). Lives inside the remote session (tools/hylon-remote.mjs): it only runs
// while REMOTE is ON, accepts private-LAN senders only, and turns each OSC address into the SAME closed
// command set as the web remote (schema.js validation; no new path to devices). State goes back as OSC
// feedback on the client's receive port. Addresses: docs/TOUCHOSC-GUIDE.md. No dependency: OSC 1.0 by hand.
import dgram from 'node:dgram';
import { readdirSync } from 'node:fs';
import { validParameter, MIX_GROUPS } from '../apps/hylon/remote/schema.js';

export const OSC_IN = Number(process.env.HYLON_OSC_IN) || 9000, OSC_OUT = Number(process.env.HYLON_OSC_OUT) || 9001;
const scoresDir = new URL('../scores/', import.meta.url);
const pad = bytes => Buffer.concat([bytes, Buffer.alloc(4 - bytes.length % 4)]);
const str = text => pad(Buffer.from(String(text), 'utf8'));
export function encode(address, args = []) {
  let tags = ','; const parts = [];
  for (const a of args) { if (typeof a === 'number') { tags += 'f'; const b = Buffer.alloc(4); b.writeFloatBE(a); parts.push(b); } else { tags += 's'; parts.push(str(String(a).slice(0, 200))); } }
  return Buffer.concat([str(address), str(tags), ...parts]);
}
export function decode(buffer, out = [], depth = 0) {
  const read = at => { let end = at; while (end < buffer.length && buffer[end] !== 0) end++; if (end >= buffer.length) throw new Error('unterminated'); return [buffer.toString('utf8', at, end), (end + 4) & ~3]; };
  let [address, at] = read(0);
  if (address === '#bundle') { at += 8; while (at + 4 <= buffer.length && depth < 4 && out.length < 32) { const size = buffer.readInt32BE(at); at += 4; if (size <= 0 || at + size > buffer.length) break; decode(buffer.subarray(at, at + size), out, depth + 1); at += size; } return out; }
  const args = []; if (at < buffer.length) { let tags; [tags, at] = read(at); for (const tag of tags.slice(1)) {
    if (tag === 'f') { args.push(buffer.readFloatBE(at)); at += 4; } else if (tag === 'i') { args.push(buffer.readInt32BE(at)); at += 4; }
    else if (tag === 's') { let s; [s, at] = read(at); args.push(s); } else if (tag === 'T') args.push(true); else if (tag === 'F') args.push(false); else if (tag === 'd') { args.push(buffer.readDoubleBE(at)); at += 8; } else break; } }
  out.push({ address, args }); return out;
}
const lin = (min, max) => ({ to: n => min + n * (max - min), from: v => (v - min) / (max - min) });
const log = (min, max) => ({ to: n => min * (max / min) ** n, from: v => Math.log(v / min) / Math.log(max / min) });
const SOURCES = ['pe', 'go', 'po', 're', 'so'], TARGETS = ['so', 're', 'po', 'go', 'pe', '*'], KINDS = ['TAP', 'TAPL', 'TAPR', 'TAPA', 'ARPU', 'ARPD', 'ARPB', 'ARPR', 'HOLDU', 'HOLDD', 'HOLDB', 'HOLDR'];
export const MIX_KEYS = ['samplerLevel', 'localLevel', 'micLevel', 'tapeLevel', 'reverbLevel', 'delayLevel', 'master'];
const MIX_BOUNDS = Object.fromEntries(MIX_GROUPS.flatMap(g => g.controls.map(([key, , min, max]) => [key, [min, max]])));
const P = '/hylon';
// Every address: kind trigger (button, no argument; `lit` is its lamp), fader (0–1 ↔ scaled value) or label.
function table() {
  const T = new Map(), trigger = (a, command, lit = null) => T.set(P + a, { kind: 'trigger', command, lit }), fader = (a, action, key, scale, get) => T.set(P + a, { kind: 'fader', action, key, scale, get }), label = (a, get) => T.set(P + a, { kind: 'label', get });
  trigger('/play', s => [s.running ? 'stop' : 'play'], s => s.running); trigger('/hold', () => ['hold']); trigger('/reset', () => ['reset']);
  trigger('/program/next', () => ['program', 1]); trigger('/program/prev', () => ['program', -1]);
  trigger('/panic', () => ['super-panic']); trigger('/stopall', () => ['stop-all']);
  for (let n = 1; n <= 9; n++) { const nn = String(n).padStart(2, '0'); trigger(`/score/${nn}`, () => { const file = readdirSync(scoresDir).find(f => f.startsWith(nn + '-') && f.endsWith('-score.txt')); if (!file) throw new Error(`No score ${nn}`); return ['score', file]; }, s => String(s.file || '').startsWith(nn + '-')); }
  fader('/tempo', 'spore', 'performanceTempo', log(.25, 4), s => s.performance?.tempo); fader('/dur', 'spore', 'performanceDur', log(.001, 1), s => s.performance?.dur);
  for (const k of ['mu', 'disp', 'poly', 'tuber', 'cap']) fader(`/vector/${k}`, 'spore', `vector.${k}`, lin(0, 4), s => s.spore?.manual?.vector?.[k]);
  trigger('/vector/reset', () => ['spore', { key: 'vectorReset', value: true }]);
  for (const k of ['klais', 'audio', 'midi']) trigger(`/out/${k}`, s => ['spore', { key: `output.${k}`, value: !s.spore?.manual?.outputs?.[k] }], s => s.spore?.manual?.outputs?.[k]);
  trigger('/impro/arm', () => ['impro', { key: 'arm', value: true }], s => s.impro?.armed);
  for (const k of ['klais', 'audio', 'midi']) trigger(`/impro/${k}`, () => ['impro', { key: k, value: true }], s => s.impro?.routes?.[k]);
  for (const k of ['stop', 'random', 'empty']) trigger(`/impro/${k}`, () => ['impro', { key: k, value: true }]);
  trigger('/impro/follow', s => ['impro', { key: 'follow', value: !s.impro?.follow }], s => s.impro?.follow);
  for (let n = 1; n <= 9; n++) trigger(`/impro/patch/${n}`, () => ['impro', { key: 'patch', value: n }], s => s.impro?.patch === n);
  for (const src of SOURCES) {
    for (const dst of TARGETS) if (dst !== src) trigger(`/impro/route/${src}/${dst === '*' ? 'R' : dst}`, () => ['impro', { key: 'route', value: `${src}:${dst}` }], s => !!s.impro?.pad?.matrix?.[src]?.includes(dst));
    for (const kind of KINDS) trigger(`/impro/kind/${src}/${kind}`, () => ['impro', { key: 'row', value: `${src}:kind:${kind}` }], s => s.impro?.pad?.rows?.[src]?.kind === kind);
  }
  for (const key of MIX_KEYS) fader(`/mix/${key}`, 'mixer', key, lin(...MIX_BOUNDS[key]), s => s.mixer?.values?.[key]);
  for (let n = 1; n <= 4; n++) trigger(`/mix/snapshot/${n}`, () => ['mixer', { key: 'snapshotRecall', value: n }], s => s.mixer?.snapshots?.active?.[n - 1]);
  for (const k of ['audio', 'midi', 'laser']) trigger(`/process/${k}`, s => ['process', { key: k, value: !s[k] }], s => s[k]);
  const clock = ms => { const t = Math.max(0, Math.floor((ms || 0) / 1000)); return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
  label('/fb/title', s => s.title || ''); label('/fb/section', s => s.osc?.section || ''); label('/fb/program', s => s.osc?.program || '');
  label('/fb/time', s => `${clock(s.positionMs)} / ${clock(s.durationMs)}`);
  return T;
}
const privateLan = ip => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|169\.254\.)/.test(ip.replace(/^::ffff:/, ''));
export function createOscBridge({ state, online, command }) {
  const T = table(), clients = new Map(), socket = dgram.createSocket({ type: 'udp4', reuseAddr: true }); let blink = false, closed = false;
  const out = (client, address, value) => socket.send(encode(address, [value]), OSC_OUT, client.ip, () => {});
  const say = (client, text) => out(client, P + '/fb/status', text);
  function feedback(client, s, force = false) {
    const now = Date.now();
    for (const [address, entry] of T) {
      let value; try { value = entry.kind === 'label' ? String(entry.get(s) ?? '') : entry.kind === 'fader' ? (v => Number.isFinite(v) ? Math.round(Math.max(0, Math.min(1, entry.scale.from(v))) * 1000) / 1000 : null)(entry.get(s)) : entry.lit ? (entry.lit(s) ? 1 : 0) : null; } catch { value = null; }
      if (value === null) continue;
      if (!force && client.sent.get(address) === value) continue;
      if (entry.kind === 'fader' && now - (client.touched.get(address) || 0) < 700) continue; // a finger is on it
      client.sent.set(address, value); out(client, address, value);
    }
    // Section-end warning: 0 normal, 1 / 2 alternate during the last 5 s of a section while running.
    const left = s.osc?.sectionLeft, alert = s.running && left > 0 && left <= 5 ? (blink ? 1 : 2) : 0;
    if (force || client.sent.get('alert') !== alert) { client.sent.set('alert', alert); out(client, P + '/fb/alert', alert); }
  }
  socket.on('error', () => {});
  socket.on('message', (buffer, rinfo) => {
    if (closed || buffer.length > 2048 || !privateLan(rinfo.address)) return;
    let messages; try { messages = decode(buffer); } catch { return; }
    let client = clients.get(rinfo.address);
    if (!client) { if (clients.size >= 4) return; client = { ip: rinfo.address, sent: new Map(), touched: new Map(), ticks: [], seen: 0 }; clients.set(rinfo.address, client); }
    client.seen = Date.now();
    for (const { address, args } of messages) {
      const s = state();
      if (address === P + '/sync') { if (s) feedback(client, s, true); continue; }
      if (address === P + '/ping') continue;
      const entry = T.get(address); if (!entry || entry.kind === 'label') continue;
      client.ticks = client.ticks.filter(t => t > Date.now() - 1000); if (client.ticks.length >= 60) continue; client.ticks.push(Date.now());
      if (!s || !online()) { say(client, 'Mac session unavailable'); continue; }
      try {
        let action, value;
        if (entry.kind === 'fader') {
          const n = Number(args[0]); if (!Number.isFinite(n)) continue;
          const norm = Math.max(0, Math.min(1, n));
          // An echo of our own feedback (the layout re-sends a fader when it is set): not a gesture.
          if (Math.abs((client.sent.get(address) ?? -1) - norm) < .0015 && Date.now() - (client.touched.get(address) || 0) > 700) continue;
          client.touched.set(address, Date.now()); client.sent.delete(address);
          action = entry.action; value = { key: entry.key, value: entry.scale.to(norm) };
        } else { if (args.length && (args[0] === 0 || args[0] === false)) continue; [action, value] = entry.command(s); }
        if (['mixer', 'spore', 'process', 'impro'].includes(action) && !validParameter(action, value)) throw new Error('Invalid parameter');
        command(action, value, (ok, error) => { if (!ok) say(client, error || 'Command failed'); else say(client, ''); });
      } catch (error) { say(client, error.message); }
    }
  });
  socket.bind(OSC_IN, '0.0.0.0');
  return {
    push(s) { blink = !blink; for (const [ip, client] of clients) { if (Date.now() - client.seen > 15000) { clients.delete(ip); continue; } feedback(client, s); } },
    close() { closed = true; try { socket.close(); } catch {} clients.clear(); },
    addresses: () => [...T].map(([address, entry]) => [address, entry.kind])
  };
}
