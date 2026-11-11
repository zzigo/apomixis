import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { execFile } from 'node:child_process';
const root = resolve('dist'); const port = Number(process.env.PORT || 4173);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
try { await stat(resolve(root, 'index.html')); } catch { console.error('Build missing. Run npm run build first.'); process.exit(1); }
const server = http.createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const path = resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://localhost').pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const file = path === root ? resolve(root, 'index.html') : path;
    const data = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404).end('Not found'); }
});
server.on('error', error => { console.error(`Cannot start HYLON: ${error.message}. Close the other server or use PORT=4174 node tools/serve.mjs.`); process.exit(1); });
server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}`;
  console.log(`HYLON offline console: ${url}`);
  if (process.argv.includes('--open') && process.platform === 'darwin') execFile('open', ['-a', 'Google Chrome', url], error => { if (error) console.log(`Open ${url} in Chrome or Edge.`); });
});
