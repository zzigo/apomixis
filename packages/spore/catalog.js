// Sketch v2 vocabulary; logical stop labels are unverified, not device commands.
export const CATALOG = {
  "W": 61,
  "STRATA": 5,
  "DIVS": [
    "so",
    "re",
    "po",
    "go",
    "pe"
  ],
  "DIVCOL": {
    "go": "#b6ffcf",
    "po": "#8fe3ff",
    "re": "#c9a7ff",
    "so": "#ffa070",
    "pe": "#ffd27a"
  },
  "INT": [
    -5,
    -3,
    -2,
    0,
    2,
    3,
    5,
    7
  ],
  "RH": [
    0.25,
    0.3333333333333333,
    0.5,
    0.6666666666666666,
    0.75,
    1,
    1.5,
    2
  ],
  "EMB": [
    0,
    1,
    13,
    23
  ],
  "STOPS": {
    "go": [
      [
        "montre16",
        "Montre 16",
        0.5,
        "principal"
      ],
      [
        "diapason8",
        "Diapason 8",
        1,
        "principal"
      ],
      [
        "fluteHarmonique8",
        "Fl. harm. 8",
        1,
        "flute"
      ],
      [
        "dulciane8",
        "Dulciane 8",
        1,
        "string"
      ],
      [
        "bourdon8",
        "Bourdon 8",
        1,
        "stopped"
      ],
      [
        "prestant4",
        "Prestant 4",
        2,
        "principal"
      ],
      [
        "fluteDouce4",
        "Fl. douce 4",
        2,
        "flute"
      ],
      [
        "quinte223",
        "Quinte 2⅔",
        3,
        "mutation"
      ],
      [
        "octave2",
        "Octave 2",
        4,
        "principal"
      ],
      [
        "fournitureV2",
        "Fourniture V",
        4,
        "compound"
      ],
      [
        "bombarde16",
        "Bombarde 16",
        0.5,
        "reed"
      ],
      [
        "trompette8",
        "Trompette 8",
        1,
        "reed"
      ],
      [
        "clairon4",
        "Clairon 4",
        2,
        "reed"
      ]
    ],
    "po": [
      [
        "bourdon16",
        "Bourdon 16",
        0.5,
        "stopped"
      ],
      [
        "principal8",
        "Principal 8",
        1,
        "principal"
      ],
      [
        "salicional8",
        "Salicional 8",
        1,
        "string"
      ],
      [
        "bourdon8",
        "Bourdon 8",
        1,
        "stopped"
      ],
      [
        "octave4",
        "Octave 4",
        2,
        "principal"
      ],
      [
        "fluteOctaviante4",
        "Fl. oct. 4",
        2,
        "flute"
      ],
      [
        "doublette2",
        "Doublette 2",
        4,
        "principal"
      ],
      [
        "cornetV8",
        "Cornet V",
        1,
        "compound"
      ],
      [
        "pleinJeuIII113",
        "Plein jeu III",
        6,
        "compound"
      ],
      [
        "clarinette8",
        "Clarinette 8",
        1,
        "reed"
      ]
    ],
    "re": [
      [
        "quintaton16",
        "Quintaton 16",
        0.5,
        "stopped"
      ],
      [
        "diapason8",
        "Diapason 8",
        1,
        "principal"
      ],
      [
        "fluteTraversiere8",
        "Fl. trav. 8",
        1,
        "flute"
      ],
      [
        "violeDeGambe8",
        "Viole de gambe 8",
        1,
        "string"
      ],
      [
        "voixCeleste8",
        "Voix céleste 8",
        1,
        "celeste"
      ],
      [
        "corDeNuit8",
        "Cor de nuit 8",
        1,
        "stopped"
      ],
      [
        "fluteOctaviante4",
        "Fl. oct. 4",
        2,
        "flute"
      ],
      [
        "viole4",
        "Viole 4",
        2,
        "string"
      ],
      [
        "nazard223",
        "Nazard 2⅔",
        3,
        "mutation"
      ],
      [
        "octavin2",
        "Octavin 2",
        4,
        "flute"
      ],
      [
        "tierce135",
        "Tierce 1⅗",
        5,
        "mutation"
      ],
      [
        "pleinJeuIV223",
        "Plein jeu IV",
        3,
        "compound"
      ],
      [
        "basson16",
        "Basson 16",
        0.5,
        "reed"
      ],
      [
        "trompetteH8",
        "Trompette h. 8",
        1,
        "reed"
      ],
      [
        "bassonHautbois8",
        "Basson-Hautbois 8",
        1,
        "reed"
      ],
      [
        "voixHumaine8",
        "Voix humaine 8",
        1,
        "reed"
      ],
      [
        "soprano4",
        "Soprano h. 4 (?)",
        2,
        "flute"
      ]
    ],
    "so": [
      [
        "seraphon8",
        "Seraphon Flûte 8",
        1,
        "flute"
      ],
      [
        "tubaMagna16",
        "Tuba magna 16",
        0.5,
        "reed"
      ],
      [
        "tubaAnglais8",
        "Tuba anglais 8",
        1,
        "reed"
      ]
    ],
    "pe": [
      [
        "flute32",
        "Flûte 32",
        0.25,
        "flute"
      ],
      [
        "soubasse32",
        "Soubasse 32",
        0.25,
        "stopped"
      ],
      [
        "contrebasse16",
        "Contrebasse 16",
        0.5,
        "principal"
      ],
      [
        "violonbasse16",
        "Violonbasse 16",
        0.5,
        "string"
      ],
      [
        "soubasse16",
        "Soubasse 16",
        0.5,
        "stopped"
      ],
      [
        "flute8",
        "Flûte 8",
        1,
        "flute"
      ],
      [
        "violoncelle8",
        "Violoncelle 8",
        1,
        "string"
      ],
      [
        "bourdon8",
        "Bourdon 8",
        1,
        "stopped"
      ],
      [
        "principal4",
        "Principal 4",
        2,
        "principal"
      ],
      [
        "contrebombarde32",
        "Contrebombarde 32",
        0.25,
        "reed"
      ],
      [
        "bombarde16",
        "Bombarde 16",
        0.5,
        "reed"
      ],
      [
        "trompette8",
        "Trompette 8",
        1,
        "reed"
      ],
      [
        "clairon4",
        "Clairon 4",
        2,
        "reed"
      ]
    ]
  },
  "COMPOUND": {
    "fournitureV2": [
      4,
      6,
      8,
      12,
      16
    ],
    "cornetV8": [
      1,
      2,
      3,
      4,
      5
    ],
    "pleinJeuIII113": [
      6,
      8,
      12
    ],
    "pleinJeuIV223": [
      3,
      4,
      6,
      8
    ]
  },
  "COUPLERS": {
    "ii_i": {
      "from": "po",
      "to": "go",
      "tr": 0,
      "label": "II–I",
      "morph": "graft"
    },
    "iii_i": {
      "from": "re",
      "to": "go",
      "tr": 0,
      "label": "III–I",
      "morph": "graft"
    },
    "iv_i": {
      "from": "so",
      "to": "go",
      "tr": 0,
      "label": "IV–I",
      "morph": "graft"
    },
    "iii_ii": {
      "from": "re",
      "to": "po",
      "tr": 0,
      "label": "III–II",
      "morph": "graft"
    },
    "iv_ii": {
      "from": "so",
      "to": "po",
      "tr": 0,
      "label": "IV–II",
      "morph": "graft"
    },
    "iv_iii": {
      "from": "so",
      "to": "re",
      "tr": 0,
      "label": "IV–III",
      "morph": "graft"
    },
    "iii16_i": {
      "from": "re",
      "to": "go",
      "tr": -12,
      "label": "III 16'–I",
      "morph": "graft+root"
    },
    "ii16_ii": {
      "from": "po",
      "to": "po",
      "tr": -12,
      "label": "II 16'",
      "morph": "roots"
    },
    "ii4_ii": {
      "from": "po",
      "to": "po",
      "tr": 12,
      "label": "II 4'",
      "morph": "shoot"
    },
    "iii16_iii": {
      "from": "re",
      "to": "re",
      "tr": -12,
      "label": "III 16'",
      "morph": "roots"
    },
    "iii4_iii": {
      "from": "re",
      "to": "re",
      "tr": 12,
      "label": "III 4'",
      "morph": "shoot"
    },
    "i_p": {
      "from": "go",
      "to": "pe",
      "tr": 0,
      "label": "I–P",
      "morph": "stolon"
    },
    "ii_p": {
      "from": "po",
      "to": "pe",
      "tr": 0,
      "label": "II–P",
      "morph": "rhizome"
    },
    "iii_p": {
      "from": "re",
      "to": "pe",
      "tr": 0,
      "label": "III–P",
      "morph": "rhizome"
    },
    "iii4_p": {
      "from": "re",
      "to": "pe",
      "tr": 12,
      "label": "III 4'–P",
      "morph": "rhizome+shoot"
    },
    "iv_p": {
      "from": "so",
      "to": "pe",
      "tr": 0,
      "label": "IV–P",
      "morph": "rhizome"
    }
  },
  "FAMCOL": {
    "principal": "#b6ffcf",
    "flute": "#8fe3ff",
    "stopped": "#6fb6d0",
    "string": "#c9a7ff",
    "celeste": "#e6d6ff",
    "mutation": "#ff87ad",
    "compound": "#ffffff",
    "reed": "#ffd27a"
  },
  "PARTNER": {
    "go": [
      "re",
      "po",
      "so"
    ],
    "po": [
      "go",
      "re",
      "so"
    ],
    "re": [
      "po",
      "go",
      "so"
    ],
    "so": [
      "re",
      "po",
      "go"
    ],
    "pe": [
      "go",
      "re",
      "po"
    ]
  },
  "MODES": [
    {
      "key": "m2",
      "label": "m2",
      "group": "interval",
      "who": "discrete interval",
      "desc": "m2 · m2 + 8ve · inversion + 8ve",
      "slots": [
        [
          1
        ],
        [
          13
        ],
        [
          23
        ]
      ]
    },
    {
      "key": "M2",
      "label": "M2",
      "group": "interval",
      "who": "discrete interval",
      "desc": "M2 · M2 + 8ve · inversion + 8ve",
      "slots": [
        [
          2
        ],
        [
          14
        ],
        [
          22
        ]
      ]
    },
    {
      "key": "m3",
      "label": "m3",
      "group": "interval",
      "who": "discrete interval",
      "desc": "m3 · m3 + 8ve · inversion + 8ve",
      "slots": [
        [
          3
        ],
        [
          15
        ],
        [
          21
        ]
      ]
    },
    {
      "key": "M3",
      "label": "M3",
      "group": "interval",
      "who": "discrete interval",
      "desc": "M3 · M3 + 8ve · inversion + 8ve",
      "slots": [
        [
          4
        ],
        [
          16
        ],
        [
          20
        ]
      ]
    },
    {
      "key": "P4",
      "label": "P4",
      "group": "interval",
      "who": "discrete interval",
      "desc": "P4 · P4 + 8ve · inversion + 8ve",
      "slots": [
        [
          5
        ],
        [
          17
        ],
        [
          19
        ]
      ]
    },
    {
      "key": "TT 4+",
      "label": "TT 4+",
      "group": "interval",
      "who": "discrete interval",
      "desc": "TT 4+ · TT 4+ + 8ve · inversion + 8ve",
      "slots": [
        [
          6
        ],
        [
          18
        ],
        [
          18
        ]
      ]
    },
    {
      "key": "P5",
      "label": "P5",
      "group": "interval",
      "who": "discrete interval",
      "desc": "P5 · P5 + 8ve · inversion + 8ve",
      "slots": [
        [
          7
        ],
        [
          19
        ],
        [
          17
        ]
      ]
    },
    {
      "key": "m6",
      "label": "m6",
      "group": "interval",
      "who": "discrete interval",
      "desc": "m6 · m6 + 8ve · inversion + 8ve",
      "slots": [
        [
          8
        ],
        [
          20
        ],
        [
          16
        ]
      ]
    },
    {
      "key": "M6",
      "label": "M6",
      "group": "interval",
      "who": "discrete interval",
      "desc": "M6 · M6 + 8ve · inversion + 8ve",
      "slots": [
        [
          9
        ],
        [
          21
        ],
        [
          15
        ]
      ]
    },
    {
      "key": "m7",
      "label": "m7",
      "group": "interval",
      "who": "discrete interval",
      "desc": "m7 · m7 + 8ve · inversion + 8ve",
      "slots": [
        [
          10
        ],
        [
          22
        ],
        [
          14
        ]
      ]
    },
    {
      "key": "M7",
      "label": "M7",
      "group": "interval",
      "who": "discrete interval",
      "desc": "M7 · M7 + 8ve · inversion + 8ve",
      "slots": [
        [
          11
        ],
        [
          23
        ],
        [
          13
        ]
      ]
    },
    {
      "key": "P8",
      "label": "P8",
      "group": "interval",
      "who": "discrete interval",
      "desc": "octave · twelfth · double octave",
      "slots": [
        [
          12
        ],
        [
          19
        ],
        [
          24
        ]
      ]
    },
    {
      "key": "petrushka",
      "label": "PETRUSHKA",
      "group": "hyper",
      "who": "Stravinsky · Petrushka",
      "desc": "C major + F♯ major (tritone polytonality)",
      "slots": [
        [
          4,
          7
        ],
        [
          6,
          10,
          13
        ]
      ]
    },
    {
      "key": "augurs",
      "label": "AUGURS",
      "group": "hyper",
      "who": "Stravinsky · Rite of Spring",
      "desc": "E♭7 + F♭ major (semitone polytonality)",
      "slots": [
        [
          4,
          7,
          10
        ],
        [
          1,
          5,
          8
        ]
      ]
    },
    {
      "key": "axis",
      "label": "AXIS",
      "group": "hyper",
      "who": "Bartók · axis system",
      "desc": "major-minor on the pole + tritone counter-pole",
      "slots": [
        [
          3,
          4,
          7
        ],
        [
          6,
          9,
          10,
          13
        ]
      ]
    },
    {
      "key": "mode2",
      "label": "MODE 2",
      "group": "hyper",
      "who": "Messiaen · mode 2 (octatonic)",
      "desc": "major triads a minor third apart: C · E♭ · F♯ · A",
      "slots": [
        [
          3,
          7,
          10
        ],
        [
          6,
          10,
          13
        ],
        [
          9,
          13,
          16
        ]
      ]
    },
    {
      "key": "resonance",
      "label": "RÉSONANCE",
      "group": "hyper",
      "who": "Messiaen · accord de la résonance (approx.)",
      "desc": "upper partials folded into a chord",
      "slots": [
        [
          16,
          19,
          22
        ],
        [
          26,
          30,
          33
        ]
      ]
    }
  ],
  "BANK1": [
    "m2",
    "m3",
    "M3",
    "P4",
    "TT 4+",
    "P5",
    "P8",
    "petrushka",
    "mode2"
  ],
  "BANK2": [
    "M2",
    "m6",
    "M6",
    "m7",
    "M7",
    "augurs",
    "axis",
    "resonance"
  ],
  "PCN": [
    "C",
    "D♭",
    "D",
    "E♭",
    "E",
    "F",
    "F♯",
    "G",
    "A♭",
    "A",
    "B♭",
    "B"
  ],
  "TEX": {
    "tutti": {
      "repro": "AGAMOSPERMY",
      "note": "clonal block, staggered entries, unequal lengths"
    },
    "striated": {
      "repro": "STOLON",
      "note": "poly-striation: internodes 4:5:3:7:2 per division (Euclidean, rotated)"
    },
    "hocket": {
      "repro": "RHIZOME",
      "note": "additive slots from genome ratios, rotating divisions"
    },
    "granulation": {
      "repro": "FRAGMENTATION",
      "note": "clustered bursts, log-scaled grain lengths"
    }
  }
};
