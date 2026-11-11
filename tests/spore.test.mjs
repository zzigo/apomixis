import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { compileSporeText } from '../packages/spore/text-score.js';
import { canonicalJSON } from '../packages/spore/score.js';
import { createSporeGenerator } from '../packages/spore/engine.js';
const base = new URL('../scores/apomixis/spore/0.1.0-draft.1/', import.meta.url);
const text = readFileSync(new URL('score.txt', base), 'utf8');
const score = JSON.parse(readFileSync(new URL('score.json', base), 'utf8'));
const hash = value => createHash('sha256').update(value).digest('hex');
function finish(generator, endMs = 300000) { generator.start(); const result = generator.step({ endMs, maxGenerations: 512 }); assert.equal(result.budgetExhausted, false); return result.events; }
test('TXT is canonical score source; compiled JSON and archived source hashes agree', async () => {
  const compiled = await compileSporeText(text); assert.deepEqual(compiled, score);
  const { contentHash, ...payload } = score; assert.equal(hash(canonicalJSON(payload)), contentHash);
  assert.equal(hash(readFileSync(new URL('../references/spore/sketch-v2.html', import.meta.url))), score.provenance.sourceSha256);
  assert.equal(score.duration, 300); assert.deepEqual(score.sections.map(s => s.start), [0, 48, 150, 192, 258]);
});
test('header voice variables and named couplings compile independently of device ports', async () => {
  const compiled = await compileSporeText(text.replaceAll('$GO', '$GROUND').replace(/\bii_i\b/g, 'graft'));
  assert.deepEqual(compiled.voiceBindings.$GROUND, { division: 'go', range: [24, 84] });
  assert.equal(compiled.couplings.graft.toVoice, '$GROUND'); assert.equal(compiled.couplings.graft.fromVoice, '$PO');
  assert(compiled.sections.some(s => s.couplers.includes('graft')));
  const events = finish(createSporeGenerator(compiled), 10000);
  assert(events.filter(e => e.division === 'go').every(e => e.payload.voice === '$GROUND'));
});
test('TXT parser rejects executable directives, undefined voices, invalid couplings and malformed scores', async () => {
  for (const bad of [text + '\nscript eval(1)', text.replace('voice $GO = go', 'voice $GO = xx'), text.replace('transpose -12', 'transpose -24'), text.replace('registers $GO bourdon8', 'registers $NO bourdon8'), text.replace('rule B3/S23', 'rule B99/S23'), text.replace('seed 1931', 'seed -1'), text.replace('bpm 48', 'bpm 0'), text.replace('registers $GO bourdon8', 'registers $GO unknown'), text.replace('section I "Introduction"', 'section I "unclosed'), 'x'.repeat(65537)]) await assert.rejects(compileSporeText(bad));
});
test('full deterministic SPORE run is bounded, reaches one survivor and does not share RNG state', () => {
  const a = createSporeGenerator(score), b = createSporeGenerator(score);
  const first = finish(a), second = finish(b); assert.deepEqual(first, second);
  assert.equal(first.length, 6367); assert.equal(a.view().gen, 326); assert.equal(a.view().pop, 1);
  for (const e of first.filter(e => e.kind === 'note')) {
    assert(Number.isFinite(e.atSessionMs) && e.atSessionMs >= 0 && e.atSessionMs < 300000);
    assert(e.payload.durationMs > 0 && e.atSessionMs + e.payload.durationMs <= 300000 + 1e-6);
    const range = score.voiceBindings[e.payload.voice].range; assert(e.payload.note >= range[0] && e.payload.note <= range[1]);
  }
  assert(a.view().genomes.length <= 20000); assert(a.view().events.length <= 4000); assert(a.view().allEvents.length <= 60000);
  assert.notEqual(hash(JSON.stringify(first)), hash(JSON.stringify(finish(createSporeGenerator(score, { seed: 1932 })))));
});
test('snapshot replay restores RNG, lineage and manual controls without starting output', () => {
  const a = createSporeGenerator(score, { seed: 0 }); finish(a, 80000); a.configure({ harmonicity: 12.5, texture: 'hocket' }); finish(a, 160000);
  const b = createSporeGenerator(score); b.restore(a.snapshot()); assert.deepEqual(b.view(), a.view());
  assert.equal(b.step({ endMs: 180000 }).events.length, 0); // restored stopped
  assert.deepEqual(finish(a, 180000), finish(b, 180000));
  b.configure({ polyembryony: false }); b.reset(); const c = createSporeGenerator(score); c.restore(b.snapshot()); assert.deepEqual(c.options, b.options);
});
test('invalid snapshot restore is transactional and unknown authority cannot be imported', () => {
  const g = createSporeGenerator(score); finish(g, 2000); const before = g.snapshot();
  for (const value of [{ ...before, armed: true }, { ...before, rngState: before.rngState ^ 1 }, { ...before, scoreHash: '0'.repeat(64) }, { ...before, generation: 99999 }, { ...before, commands: [{ generation: 0, options: { texture: 'script' } }] }]) {
    assert.throws(() => g.restore(value)); assert.deepEqual(g.snapshot(), before);
  }
  assert.throws(() => g.configure({ midiPort: 'organ' })); assert.throws(() => g.step({ endMs: Infinity }));
  g.stop(); assert.equal(g.step({ endMs: 3000 }).events.length, 0); g.dispose(); assert.throws(() => g.start());
});
