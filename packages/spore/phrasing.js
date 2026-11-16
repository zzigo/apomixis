// Concert-score phrasing after cellular generation; no timers or output routing.
// Separate deterministic noise leaves the automaton's random stream untouched.
const clamp = x => Math.max(0, Math.min(1, x));
function noise(seed, generation, index, salt) {
  let x = (seed ^ Math.imul(generation + 1, 374761393) ^ Math.imul(index + 1, 668265263) ^ salt) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
export function sporeBeat(scoreId, time, bpm) {
  if (scoreId !== 'apomixis.spore' || time < 29 || time >= 48) return 60 / bpm;
  const u = clamp((time - 29) / 19), smooth = u * u * (3 - 2 * u);
  return 60 / (48 + 24 * smooth);
}
export function phraseSporeNotes(notes, { scoreId, time, beat, generation, seed }) {
  if (scoreId !== 'apomixis.spore' || time >= 152) return notes;
  const cloud = clamp((time - 8) / 21) * clamp((60 - time) / 12);
  // Pedal participates as sparse cellular offspring, rather than a metrical bass.
  const unrest = clamp((time - 112) / 8);
  return notes.flatMap((note, index) => {
    let n = { ...note };
    const r = salt => noise(seed, generation, index, salt);
    if (cloud > 0) {
      n.on += cloud * r(17) * 1.65;
      n.dur *= Math.exp(cloud * ((r(31) * 2 - 1) * 1.05));
    }
    // Continuous cloud→striated articulation spans the formal boundary at48s.
    if (time >= 29 && time < 60 && !n.tuber) {
      const u = clamp((time - 29) / 31), blend = u * u * (3 - 2 * u);
      const sub = {go:4, po:5, re:3, so:7, pe:2}[n.div];
      const cloudOn = r(107) * 1.65, cellOn = Math.floor(r(109) * sub) / sub;
      n.on = cloudOn + (cellOn - cloudOn) * blend;
      const cloudDur = Math.max(.75, Math.min(3.2, (n.rh || 1) * 1.6)) * (.7 + .6 * r(113));
      const cellDur = (.55 + .4 * r(127)) / sub;
      n.dur = Math.exp(Math.log(cloudDur) * (1 - blend) + Math.log(cellDur) * blend);
    }
    if (n.div === 'pe') {
      // Remove the special long bass anchor, keeping notes drawn from the actual cells.
      if (n.tuber || r(47) > 0.62 - unrest * 0.28) return [];
      n.on += (0.15 + r(61) * (0.95 + unrest * 1.2));
      n.dur = (0.10 + r(79) ** 2 * (0.75 + unrest * 0.45)) / beat;
      if (time >= 48 && time < 150) {
        n.midi = Math.max(24, n.midi - 12);
        n.dur *= 2;
      }
      // The requested window ends exactly at 2:32; no displaced attack spills beyond it.
      if (time + n.on * beat >= 152) return [];
    }
    return [n];
  });
}
