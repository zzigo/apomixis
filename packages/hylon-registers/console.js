// Klais 2015 IV/56 (CCK Buenos Aires) — console draw-knob numbering 1–75.
// Source: composer photographs of the left/right stop jambs (2026-11-12) cross-checked
// against dev/data/klais_cck_stoplist.json. Numbers are console labels, NOT MIDI/SysEx
// addresses. All 75 knobs verified against console photographs. Pure data: no I/O.

// [number, division, name, footage, kind, side, extra]
// kind: stop | mixture | tremulant | coupler ; side: L/R jamb
const RAW = [
  // Pédale
  [1, 'pe', 'Flûte', '32', 'stop', 'L'],
  [2, 'pe', 'Soubasse', '32', 'stop', 'L'],
  [3, 'pe', 'Contrebasse', '16', 'stop', 'L'],
  [4, 'pe', 'Montre', '16', 'stop', 'L', { alias: 'Violonbasse 16 (stoplist)' }],
  [5, 'pe', 'Soubasse', '16', 'stop', 'L'],
  [6, 'pe', 'Flûte', '8', 'stop', 'L'],
  [7, 'pe', 'Violoncelle', '8', 'stop', 'L'],
  [8, 'pe', 'Bourdon', '8', 'stop', 'L'],
  [9, 'pe', 'Principal', '4', 'stop', 'L'],
  [10, 'pe', 'Contrebombarde', '32', 'stop', 'R'],
  [11, 'pe', 'Bombarde', '16', 'stop', 'R'],
  [12, 'pe', 'Trompette', '8', 'stop', 'R'],
  [13, 'pe', 'Clairon', '4', 'stop', 'R'],
  [14, 'pe', 'I – P', '', 'coupler', 'R'],
  [15, 'pe', 'II – P', '', 'coupler', 'R'],
  [16, 'pe', 'III – P', '', 'coupler', 'R'],
  [17, 'pe', "III 4' – P", '', 'coupler', 'R'],
  [18, 'pe', 'IV – P', '', 'coupler', 'R'],
  // Grand-Orgue (Manual I)
  [19, 'go', 'Montre', '16', 'stop', 'L'],
  [20, 'go', 'Montre', '8', 'stop', 'L', { alias: 'Diapason 8 (stoplist)' }],
  [21, 'go', 'Flûte harmonique', '8', 'stop', 'L'],
  [22, 'go', 'Dulciane', '8', 'stop', 'L'],
  [23, 'go', 'Bourdon', '8', 'stop', 'L'],
  [24, 'go', 'Prestant', '4', 'stop', 'L'],
  [25, 'go', 'Flûte douce', '4', 'stop', 'L'],
  [26, 'go', 'Quinte', '2 2/3', 'stop', 'L'],
  [27, 'go', 'Octave', '2', 'stop', 'L'],
  [28, 'go', 'Fourniture V', '2', 'mixture', 'R'],
  [29, 'go', 'Bombarde', '16', 'stop', 'R'],
  [30, 'go', 'Trompette', '8', 'stop', 'R'],
  [31, 'go', 'Clairon', '4', 'stop', 'R'],
  [32, 'go', 'Trémolo', '', 'tremulant', 'R'],
  [33, 'go', 'II – I', '', 'coupler', 'R'],
  [34, 'go', 'III – I', '', 'coupler', 'R'],
  [35, 'go', "III 16' – I", '', 'coupler', 'R'],
  [36, 'go', 'IV – I', '', 'coupler', 'R'],
  // Positif expressif (Manual II)
  [37, 'po', 'Bourdon', '16', 'stop', 'L'],
  [38, 'po', 'Principal', '8', 'stop', 'L'],
  [39, 'po', 'Salicional', '8', 'stop', 'L'],
  [40, 'po', 'Bourdon', '8', 'stop', 'L'],
  [41, 'po', 'Octave', '4', 'stop', 'L'],
  [42, 'po', 'Flûte traversière', '4', 'stop', 'L', { alias: 'Flûte octaviante 4 (stoplist)' }],
  [43, 'po', 'Doublette', '2', 'stop', 'L'],
  [44, 'po', 'Cornet V', '8', 'mixture', 'R'],
  [45, 'po', 'Plein jeu III', '1 1/3', 'mixture', 'R'],
  [46, 'po', 'Clarinette', '8', 'stop', 'R'],
  [47, 'po', 'Trémolo', '', 'tremulant', 'R'],
  [48, 'po', 'III – II', '', 'coupler', 'R'],
  [49, 'po', 'IV – II', '', 'coupler', 'R'],
  [50, 'po', "II 16' – II", '', 'coupler', 'R'],
  [51, 'po', "II 4' – II", '', 'coupler', 'R'],
  // Récit expressif (Manual III)
  [52, 're', 'Quintaton', '16', 'stop', 'L'],
  [53, 're', 'Diapason', '8', 'stop', 'L'],
  [54, 're', 'Flûte harmonique', '8', 'stop', 'L', { alias: 'Flûte traversière 8 (stoplist)' }],
  [55, 're', 'Viole de gambe', '8', 'stop', 'L'],
  [56, 're', 'Voix céleste', '8', 'stop', 'L'],
  [57, 're', 'Cor de nuit', '8', 'stop', 'L'],
  [58, 're', 'Flûte octaviante', '4', 'stop', 'L'],
  [59, 're', 'Viole', '4', 'stop', 'L'],
  [60, 're', 'Nazard harmonique', '2 2/3', 'stop', 'L'],
  [61, 're', 'Octavin', '2', 'stop', 'L'],
  [62, 're', 'Tierce harmonique', '1 3/5', 'stop', 'L'],
  [63, 're', 'Plein jeu harmonique IV', '2 2/3', 'mixture', 'R'],
  [64, 're', 'Basson', '16', 'stop', 'R'],
  [65, 're', 'Trompette harmonique', '8', 'stop', 'R'],
  [66, 're', 'Basson-Hautbois', '8', 'stop', 'R'],
  [67, 're', 'Voix humaine', '8', 'stop', 'R'],
  [68, 're', 'Clairon harmonique', '4', 'stop', 'R', { alias: 'Soprano harmonique 4 (stoplist)' }],
  [69, 're', 'Trémolo', '', 'tremulant', 'R'],
  [70, 're', 'IV – III', '', 'coupler', 'R'],
  [71, 're', "III 16' – III", '', 'coupler', 'R'],
  [72, 're', "III 4' – III", '', 'coupler', 'R'],
  // Solo (Manual IV)
  [73, 'so', 'Seraphon Flûte', '8', 'stop', 'R'],
  [74, 'so', 'Tuba magna', '16', 'stop', 'R'],
  [75, 'so', 'Tuba', '8', 'stop', 'R', { alias: 'Tuba anglais 8 (stoplist)' }],
];

export const DIVISIONS = {
  so: { manual: 'IV', label: 'Solo' },
  re: { manual: 'III', label: 'Récit expressif' },
  po: { manual: 'II', label: 'Positif expressif' },
  go: { manual: 'I', label: 'Grand-Orgue' },
  pe: { manual: 'P', label: 'Pédale' },
};
// Top-to-bottom row order on both jambs (matches the console terraces).
export const ROW_ORDER = ['so', 're', 'po', 'go', 'pe'];

// Border colour class from footage. Fractional footages (mutations) get their own class.
export function footClass(knob) {
  if (knob.kind === 'coupler' || knob.kind === 'tremulant') return 'aux';
  if (knob.kind === 'mixture') return 'mix';
  if (knob.foot.includes('/')) return 'mut';
  return ['32', '16', '8', '4', '2'].includes(knob.foot) ? `f${knob.foot}` : 'aux';
}

export const KNOBS = RAW.map(([n, division, name, foot, kind, side, extra = {}]) => {
  const knob = { n, division, name, foot, kind, side, verify: !!extra.verify, alias: extra.alias || '' };
  knob.cls = footClass(knob);
  knob.label = foot ? `${name} ${foot}'` : name;
  return Object.freeze(knob);
});
export const KNOB = new Map(KNOBS.map(k => [k.n, k]));
export const SPEAKING = n => { const k = KNOB.get(n); return !!k && (k.kind === 'stop' || k.kind === 'mixture'); };
export function rows(side) {
  return ROW_ORDER.map(division => ({ division, knobs: KNOBS.filter(k => k.division === division && k.side === side) }));
}

// Interpret recorded-sample folder names as knob-number sets (HYPOTHESIS, filename-derived):
//   "2manual_38_39" → {38,39}; "pedal_2_4_7" → {2,4,7}; "pedal1_flauta32" → {1};
//   "<div>tutti" → every speaking stop of that division; "tutti-39-43" → minus 39, 43.
// cresc / crom / clusters are gestures, not registrations → null.
const DIV_BY_PREFIX = { 1: 'go', 2: 'po', 3: 're', 4: 'so' };
export function parseBankId(id) {
  if (typeof id !== 'string' || /cresc|crom|cluster/i.test(id)) return null;
  let division, rest;
  const manual = id.match(/^(\d)manual(.*)$/i), pedal = id.match(/^pedal(.*)$/i);
  if (manual) { division = DIV_BY_PREFIX[manual[1]]; rest = manual[2]; }
  else if (pedal) { division = 'pe'; rest = pedal[1]; }
  else return null;
  if (!division) return null;
  const set = new Set(); let tutti = false;
  for (const [, sep, token] of rest.matchAll(/([_-]?)([^_-]+)/g)) {
    if (/^tutti$/i.test(token)) { tutti = true; KNOBS.filter(k => k.division === division && SPEAKING(k.n)).forEach(k => set.add(k.n)); continue; }
    if (!/^\d{1,2}$/.test(token)) continue;
    const n = Number(token); if (!KNOB.has(n)) continue;
    if (tutti && sep === '-') set.delete(n); else set.add(n);
  }
  return set.size ? { id, division, stops: set, tutti } : null;
}

// Greedy cover of the drawn speaking stops by recorded banks whose stop set is a subset.
// Larger banks first; ties prefer a bank recorded on the stops' own division.
export function matchBanks(drawn, library, max = 8) {
  const speaking = new Set([...drawn].filter(SPEAKING));
  const candidates = library.filter(b => b.playable).map(b => ({ ...b, parsed: parseBankId(b.id) }))
    .filter(b => b.parsed && [...b.parsed.stops].every(n => speaking.has(n)));
  const ownDivision = b => [...b.parsed.stops].every(n => KNOB.get(n).division === b.division);
  candidates.sort((a, b) => b.parsed.stops.size - a.parsed.stops.size || ownDivision(b) - ownDivision(a));
  const covered = new Set(), layers = [];
  for (const b of candidates) {
    if (layers.length >= max) break;
    if ([...b.parsed.stops].some(n => covered.has(n))) continue;
    b.parsed.stops.forEach(n => covered.add(n)); layers.push(b.id);
  }
  return { layers, covered, missing: [...speaking].filter(n => !covered.has(n)).sort((a, b) => a - b) };
}

// Knobs that appear in at least one playable recorded bank (for the "sampled" marker).
export function sampledKnobs(library) {
  const out = new Set();
  for (const b of library) if (b.playable) parseBankId(b.id)?.stops.forEach(n => out.add(n));
  return out;
}
