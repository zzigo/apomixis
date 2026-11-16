// Recordings are written to .local/recordings/ (git-ignored, not watched by Vite). Loopback and same-origin
// only; the name is reduced to a safe file name. Modes:
//   (default)       whole file in one POST (bus takes: K / LA / MIC WAV)
//   mode=append     append the body; a new .wav gets a 44-byte header first (rate, channels in the query)
//   mode=finalize   .wav: write the final sizes into the header
// Appending keeps a long take on disk as it happens: a crash loses at most the last couple of seconds.
import { createWriteStream, mkdirSync, existsSync, appendFileSync, writeFileSync, statSync, openSync, writeSync, closeSync } from 'node:fs';
import { resolve } from 'node:path';
const DIR = resolve('.local', 'recordings'), MAX = 700 * 1024 * 1024, MAX_APPEND = 32 * 1024 * 1024;
const wavHeader = (rate, channels, bytes) => { const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + bytes, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(channels, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * channels * 2, 28); h.writeUInt16LE(channels * 2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(bytes, 40); return h; };
export function hylonRecordingsPlugin() {
  return { name: 'hylon-recordings', configureServer(server) { server.middlewares.use((req, res, next) => {
    if (!req.url?.startsWith('/__hylon/recording')) return next();
    const send = (code, body) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); };
    let same = false; try { same = !req.headers.origin || new URL(req.headers.origin).host === req.headers.host; } catch {}
    if (!['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress) || !same) return send(403, { error: 'Local only' });
    if (req.method !== 'POST') return send(405, { error: 'POST' });
    const url = new URL(req.url, 'http://local'), name = (url.searchParams.get('name') || '').replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120), mode = url.searchParams.get('mode') || 'whole';
    if (!/\.(wav|mid|jsonl)$/i.test(name)) return send(400, { error: 'name must end in .wav, .mid or .jsonl' });
    mkdirSync(DIR, { recursive: true }); const path = resolve(DIR, name), isWav = /\.wav$/i.test(name);
    try {
      if (mode === 'finalize') { req.resume(); if (isWav && existsSync(path)) { const bytes = Math.max(0, statSync(path).size - 44), fd = openSync(path, 'r+'), rate = Number(url.searchParams.get('rate')) || 48000, channels = Number(url.searchParams.get('channels')) || 2; writeSync(fd, wavHeader(rate, channels, bytes), 0, 44, 0); closeSync(fd); } return send(200, { path }); }
      if (mode === 'append') {
        const chunks = []; let size = 0, failed = false;
        req.on('data', chunk => { size += chunk.length; if (size > MAX_APPEND) { if (!failed) { failed = true; send(413, { error: 'Too large' }); req.destroy(); } } else chunks.push(chunk); });
        req.on('end', () => { if (failed) return; try { if (isWav && !existsSync(path)) writeFileSync(path, wavHeader(Number(url.searchParams.get('rate')) || 48000, Number(url.searchParams.get('channels')) || 2, 0)); appendFileSync(path, Buffer.concat(chunks)); send(200, { path, bytes: size }); } catch (error) { send(500, { error: error.message }); } });
        return;
      }
      const file = createWriteStream(path); let size = 0, failed = false;
      req.on('data', chunk => { size += chunk.length; if (size > MAX && !failed) { failed = true; file.destroy(); send(413, { error: 'Too large' }); req.destroy(); } });
      req.pipe(file); file.on('error', error => { if (!failed) { failed = true; send(500, { error: error.message }); } });
      file.on('finish', () => { if (!failed) send(200, { path, bytes: size }); });
    } catch (error) { send(500, { error: error.message }); }
  }); } };
}
