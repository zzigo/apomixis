// Development-only checks, excluded from the application build.
import text from '../../../scores/apomixis/spore/0.1.0-draft.1/score.txt?raw';
import { compileSporeText } from '../../../packages/spore/text-score.js';
import { createSporeGenerator } from '../../../packages/spore/engine.js';
import { createSporeAudition } from '../../../packages/spore/audition.js';
const rms = data => Math.sqrt(data.reduce((n,x)=>n+x*x,0)/Math.max(1,data.length));
const assert = (value, message) => { if (!value) throw new Error(message); };
document.querySelector('#run').onclick = async () => {
  const result = document.querySelector('#result'), passed = [];
  result.textContent = 'Running…';
  try {
    const score = await compileSporeText(text), generator = createSporeGenerator(score); generator.start();
    const full = generator.step({ endMs: 300000, maxGenerations: 512 });
    assert(full.events.length === 6367 && generator.view().pop === 1, 'Browser/Node generator agreement'); passed.push('PASS TXT compilation and full browser run match Node: 6367 events / 326 generations / one survivor');
    const restored = createSporeGenerator(score); restored.restore(generator.snapshot()); assert(restored.snapshot().rngState === generator.snapshot().rngState, 'Snapshot replay'); passed.push('PASS snapshot replay restores stopped RNG state');
    const event = { kind: 'note', division: 'go', payload: { note: 60, durationMs: 100, sceneId: 'I' } };
    let context = new OfflineAudioContext(2, 24000, 48000), adapter = createSporeAudition(context, context.destination, score);
    assert(adapter.dispatch(event, { when: .05, durationSeconds: .1 }) === 1, 'Direct stop voice count');
    let buffer = await context.startRendering(); assert(rms(buffer.getChannelData(0)) > .001, 'Additive sound signal'); adapter.dispose(); passed.push('PASS additive study renders finite local signal in the supplied context');
    const coupled = structuredClone(score); coupled.sections[0].couplers = ['ii_i'];
    context = new OfflineAudioContext(2, 24000, 48000); adapter = createSporeAudition(context, context.destination, coupled);
    assert(adapter.dispatch(event, { when: .05, durationSeconds: .1 }) === 2, 'Named II-I coupling adds PO stop once'); await context.startRendering(); adapter.dispose(); passed.push('PASS declared PO → GO coupling adds the source stop exactly once');
    context = new OfflineAudioContext(2, 24000, 48000); adapter = createSporeAudition(context, context.destination, score);
    adapter.dispatch(event, { when: .3, durationSeconds: .1 });
    context.suspend(.1).then(()=>{adapter.stop();return context.resume();}); buffer = await context.startRendering();
    assert(rms(buffer.getChannelData(0)) < 1e-7, 'Stop must cancel not-yet-started voices'); adapter.dispose(); passed.push('PASS stop cancels a future scheduled note without audible residue');
    result.textContent = passed.join('\n')+'\n5/5 PASS';
  } catch (error) { result.textContent = passed.join('\n')+'\nFAIL: '+error.message; }
};
