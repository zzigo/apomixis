import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.aif': 'audio/aiff', '.aiff': 'audio/aiff' };

export function createHylonServer({ root = resolve('dist'), instrumentRoot = resolve('.local/klais') } = {}) {
  return http.createServer(async (req, res) => {
    try {
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
      const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      const library = pathname.startsWith('/instruments/klais/');
      const base = library ? instrumentRoot : root;
      const relative = library ? pathname.slice('/instruments/klais/'.length) : pathname === '/' ? 'index.html' : pathname.slice(1);
      if (!relative || relative.includes('\0') || relative.split(/[\\/]/).some(part => part === '..' || part === '.')) { res.writeHead(403).end(); return; }
      const safeBase = await realpath(base), file = await realpath(resolve(base, relative));
      if (!file.startsWith(safeBase + sep)) { res.writeHead(403).end(); return; }
      const info = await stat(file);
      if (!info.isFile()) { res.writeHead(404).end(); return; }
      let start = 0, end = info.size - 1, status = 200;
      if (req.headers.range) {
        const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
        if (!range || (!range[1] && !range[2])) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
        start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
        end = range[1] && range[2] ? Math.min(Number(range[2]), end) : end;
        if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= info.size) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
        status = 206;
      }
      res.writeHead(status, {
        'Content-Type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream',
        'Content-Length': Math.max(0, end - start + 1), 'Accept-Ranges': 'bytes',
        ...(status === 206 ? { 'Content-Range': `bytes ${start}-${end}/${info.size}` } : {}),
        'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff'
      });
      if (req.method === 'HEAD' || !info.size) { res.end(); return; }
      const stream = createReadStream(file, { start, end });
      stream.on('error', () => res.destroy()); res.on('close', () => stream.destroy()); stream.pipe(res);
    } catch { if (!res.headersSent) res.writeHead(404).end('Not found'); else res.destroy(); }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = resolve('dist'), port = Number(process.env.PORT || 4173);
  try { await stat(resolve(root, 'index.html')); } catch { console.error('Build missing. Run npm run build first.'); process.exit(1); }
  let instrumentRoot = process.env.HYLON_KLAIS_DIR ? resolve(process.env.HYLON_KLAIS_DIR) : resolve('.local/klais');
  if (!process.env.HYLON_KLAIS_DIR) { try { await stat(resolve('instruments/klais/manifest.json')); instrumentRoot = resolve('instruments/klais'); } catch {} }
  const server = createHylonServer({ root, instrumentRoot });
  server.on('error', error => { console.error(`Cannot start HYLON: ${error.message}. Close the other server or choose another PORT.`); process.exit(1); });
  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${server.address().port}`;
    console.log(`HYLON offline console: ${url}`);
    if (process.argv.includes('--open') && process.platform === 'darwin') execFile('open', ['-a', 'Google Chrome', url], error => { if (error) console.log(`Open ${url} in Chrome or Edge.`); });
  });
}
