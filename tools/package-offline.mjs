import { cp, mkdir, mkdtemp, readFile, rm, realpath, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { validateManifest } from '../packages/glip-klais/manifest.js';
const withKlais = process.argv.includes('--with-klais');
const scratch = await mkdtemp(join(tmpdir(), 'hylon-package-'));
const folder = join(scratch, 'HYLON-offline');
const output = resolve(`.local/${withKlais ? 'HYLON-Klais-offline' : 'HYLON-offline'}.zip`);
try {
  await readFile('dist/index.html');
  await mkdir(join(folder, 'tools'), { recursive: true });
  await cp('dist', join(folder, 'dist'), { recursive: true });
  await cp('tools/serve.mjs', join(folder, 'tools/serve.mjs'));
  await cp('tools/HYLON.command', join(folder, 'tools/HYLON.command'));
  await cp('docs/HYLON-FIELD-GUIDE.md', join(folder, 'README.md'));
  await cp('docs/KLAIS-SAMPLER-GUIDE.md', join(folder, 'KLAIS-SAMPLER-GUIDE.md'));
  await cp('docs/MIDI-OUT-GUIDE.md', join(folder, 'MIDI-OUT-GUIDE.md'));
  await cp('docs/SPORE-GUIDE.md', join(folder, 'SPORE-GUIDE.md'));
  await mkdir(join(folder, 'contracts'), { recursive: true });
  await cp('contracts/spore-score.schema.json', join(folder, 'contracts/spore-score.schema.json'));
  await mkdir(join(folder, 'scores'), { recursive: true });
  await cp('scores/apomixis/spore/0.1.0-draft.1/score.txt', join(folder, 'scores/SPORE.score.txt'));
  await cp('scores/apomixis/spore/0.1.0-draft.1/score.json', join(folder, 'scores/SPORE.score.json'));
  await cp('docs/AUDIO-POD-GUIDE.md', join(folder, 'AUDIO-POD-GUIDE.md'));
  await cp('docs/HELIOS-POD-GUIDE.md', join(folder, 'HELIOS-POD-GUIDE.md'));
  await cp('licenses/DOCKVIEW-MIT.txt', join(folder, 'DOCKVIEW-LICENSE'));
  if (withKlais) {
    const source = await realpath(process.env.HYLON_KLAIS_DIR || resolve('.local/klais'));
    const manifestText = await readFile(join(source, 'manifest.json'), 'utf8');
    const manifest = validateManifest(JSON.parse(manifestText));
    if (manifest.provenance?.partial) throw new Error('Refusing to label a partial bank as the prepared Klais library');
    const target = join(folder, 'instruments/klais'); await mkdir(target, { recursive: true });
    for (const sample of manifest.samples) {
      const relative = decodeURIComponent(sample.url);
      const original = await realpath(resolve(source, relative));
      if (!original.startsWith(source + sep)) throw new Error('Sample escapes the instrument directory');
      const info = await stat(original);
      if (info.size !== sample.bytes) throw new Error(`Sample length mismatch: ${sample.id}`);
      const data = await readFile(original);
      if (createHash('sha256').update(data).digest('hex') !== sample.hash) throw new Error(`Sample checksum mismatch: ${sample.id}`);
      const destination = resolve(target, relative); await mkdir(dirname(destination), { recursive: true });
      await cp(original, destination);
    }
    await cp(join(source, 'manifest.json'), join(target, 'manifest.json'));
    await cp('docs/KLAIS-ASSET-AUDIT.md', join(folder, 'KLAIS-ASSET-AUDIT.md'));
    console.log(`Packed ${manifest.samples.length} verified encoded files; no originals, receipts or unreferenced assets.`);
  }
  await mkdir(resolve('.local'), { recursive: true });
  await rm(output, { force: true });
  execFileSync('zip', ['-qr', output, 'HYLON-offline'], { cwd: scratch });
  console.log(output);
} finally { await rm(scratch, { recursive: true, force: true }); }
