import { cp, mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';
const scratch = await mkdtemp(join(tmpdir(), 'hylon-package-'));
const folder = join(scratch, 'HYLON-offline');
const output = resolve('.local/HYLON-offline.zip');
try {
  await readFile('dist/index.html');
  await mkdir(join(folder, 'tools'), { recursive: true });
  await cp('dist', join(folder, 'dist'), { recursive: true });
  await cp('tools/serve.mjs', join(folder, 'tools/serve.mjs'));
  await cp('tools/HYLON.command', join(folder, 'tools/HYLON.command'));
  await cp('docs/HYLON-FIELD-GUIDE.md', join(folder, 'README.md'));
  await cp('licenses/DOCKVIEW-MIT.txt', join(folder, 'DOCKVIEW-LICENSE'));
  await mkdir(resolve('.local'), { recursive: true });
  await rm(output, { force: true });
  execFileSync('zip', ['-qr', output, 'HYLON-offline'], { cwd: scratch });
  console.log(output);
} finally { await rm(scratch, { recursive: true, force: true }); }
