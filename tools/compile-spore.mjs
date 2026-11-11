import { readFile, writeFile } from 'node:fs/promises';
import { compileSporeText } from '../packages/spore/text-score.js';
const base = new URL('../scores/apomixis/spore/0.1.0-draft.1/', import.meta.url);
const score = await compileSporeText(await readFile(new URL('score.txt', base), 'utf8'));
const output = JSON.stringify(score, null, 2) + '\n';
if (process.argv.includes('--check')) {
  if (await readFile(new URL('score.json', base), 'utf8') !== output) throw new Error('SPORE compiled score is stale. Run npm run build:spore');
} else await writeFile(new URL('score.json', base), output);
console.log(`SPORE TXT ${score.scoreVersion} / ${score.contentHash}`);
