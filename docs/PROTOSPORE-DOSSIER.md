# 08. PROTOSPORE / Proto-espora · dossier conceptual y de sistema

> Tesis: la proto-espora es potencia retenida que germina de golpe, monstruosa. La pieza parte de
> una cita (la grabación de 2020), la vuelve masa, la deja respirar por inhibición, y deja que dos
> músicas ajenas se transformen una en otra encima, hasta un único destello de grands jeux.

Contexto en el ciclo: pieza `8` · `AUTO` · latencia / germinación · `PO SO PE` (tutti en un único
momento) · 315 s. Llega en *attacca* desde 07 PHYLLOTAXIS y prepara el final (09).
Partitura: `scores/08-PROTOSPORE-score.txt`.

---

## 1. La cita: la grabación de 2020

Fuente: `19 apomixis/apomixis tracks/apomixis-01-proto-espora.mp3` (79,8 s), generada desde
`archive/supercollider/08_ProtoEspora.scd`. Sus primeros 20 s se transcribieron segundo a segundo
desde el espectro (picos entre 50 Hz y 3 kHz) y abren la pieza, un acorde por segundo, con un
rasgueo de 60 ms; lo que está por debajo de C3 va al pedal, lo de C3–B4 a II, lo de C5 para arriba
a IV.

| s | alturas | | s | alturas |
|---|---|---|---|---|
| 0 | A#4 A#5 F6 A#6 F7 | | 10 | C2 E3 G#3 C4 G4 |
| 1 | D6 D#6 F6 G6 A#6 | | 11 | G#1 C2 C4 E5 G#5 |
| 2 | A#5 C6 D6 D#6 G6 | | 12 | C2 D3 C6 F6 C7 |
| 3 | F#3 G3 F#5 E6 F#6 | | 13 | E4 E5 G#5 C6 C7 |
| 4 | F5 F6 C7 F7 | | 14 | C3 E3 G#3 E4 C6 |
| 5 | A5 B5 C6 D6 A6 | | 15 | C3 D3 A3 E5 C6 |
| 6 | D5 E5 F#5 A5 G6 | | 16 | F2 G2 A2 F3 A3 |
| 7 | E4 B4 E5 G#5 B5 | | 17 | F3 F4 A5 A#5 C6 |
| 8 | C2 C3 E3 G#3 | | 18 | C2 C3 D3 A3 A5 |
| 9 | G#1 C2 G2 C4 E5 | | 19 | G2 F3 A3 G5 D#6 |

Lectura: un brillo agudo sobre si bemol (si♭–re–mi♭–fa–sol) que cae registro por registro hasta el
acorde aumentado do–mi–sol# sobre do grave (8 s). Del segundo 20 al 56 de la grabación, el grave se
llena de clusters cromáticos (la#1–do2–do#2–sol2–sol#2): eso es el `SOIL` del pedal en A–C.

## 2. Forma

| Sección | Tiempo | Proceso | Programa |
|---|---|---|---|
| A Cita | 0–5,5 | la grabación ×4: cuatro acordes por segundo, non-legato (cada uno termina 30 ms antes del siguiente), rubato (dos senos lentos, hasta ±18 % del paso), repartidos por registro en todos los manuales; 5,0–5,5 megaglissando: cuatro pasos de 125 ms, todos los registros subiendo por terceras menores, pegado al cluster | 80 |
| B–C Allelopathy | 5,5–155 | el lab 18 ALLELOPATHY tal cual: la masa del reloj en I II III IV (inhibición, relojes áureos, semilla 2037), idéntica al lab en sus primeros 149,5 s; suelo grave en el pedal | 81 → 82 |
| D1–D8 Monster | 155–235 | Messiaen (*Le Banquet céleste*) se transforma en Elgar en todas las divisiones, nunca textual (ver §3); lengüetas ⇄ trémolos y clarinete cada 10 s; la masa se apaga | 83 ⇄ 84 |
| E Grands jeux | 235–242 | Couperin, *Offertoire sur les grands jeux*, 7 s, tutti, también desplazado y armonizado | 85 |
| F1–F5 Hoquetus | 242–315 | megahoquetus cristalino: una nota por vez en todas las divisiones y octavas, 35–90 ms con accelerando y rallentando cada 9 s, nunca dos veces seguidas en la misma división; el conjunto de alturas se angosta de ocho clases a la# sola (los últimos 11 s, monótono) | 83 ⇄ 84 → 86 |

## 3. Morphing, nunca textual (`morph`)

Material: `apps/hylon/public/midi/`, compilado a `packages/hylon-algos/midi-corpus.js` por
`tools/build-midi-corpus.mjs` (primeros 150 s de cada archivo). El algoritmo usa el modelo del pod
LIBRARY (`packages/hylon-midi-process/model.js`): en cada ventana mezcla A y B según `morph`.

Regla del compositor: las citas nunca son textuales. Por ventana, elección sembrada de
- una armonización: 0,7 | 0,10 | 0,4 | 0,7,10 | 0,4,7 (quinta, séptima, tercera, tríadas);
- una velocidad: 1 | 0,75 | 1,5 | 0,5 | 1,25 (variación rítmica);
- desplazamiento de octava al azar (35 → 60 % de las notas, hasta dos octavas);
- un corrimiento de ataque de ±25 ms, que además arpegia las armonizaciones.

Couperin (7 s, tutti) también: 35 % de octavas, armonización 0,4 | 0,7, velocidad 1 | 1,25. Su MIDI
empieza a los 19,8 s: la ventana arranca ahí.

## 4. Registración (del compositor, 2026-11-14)

| Programa | Registros | Carácter |
|---|---|---|
| 80 | 73 74 75 · 52 53 54 55 56 57 58 59 · 37 39 40 · 21 23 25 · 3 4 5 · 65 67 · 31 30 | la cita: tubas, fondos de III, trompetas |
| 81 | 80 sin 74 75 65 30 31 | hacia lo vocal |
| 82 | 73 54 56 57 67 69 37 39 40 47 21 23 32 3 5 | vocal: Voix humaine, trémolos |
| 83 | 73 74 75 30 31 65 66 64 40 37 21 3 4 11 12 | lengüetas |
| 84 | 46 47 39 40 56 67 69 32 21 23 73 5 8 | trémolos y Clarinette |
| 85 | tutti | 7 s, Couperin |
| 86 | 22 23 39 40 47 55 56 73 8 32 | final de 08 = comienzo de 09 |

81, 82, 83 y 84 los propuse yo sobre la indicación "pendula hacia un registro más vocal, hacia el
final idas y vueltas entre lengüetas, trémolos y clarinete": hay que confirmarlos en la consola.
83 ⇄ 84 son botones vecinos. 09 empieza con el mismo juego de registros (en su propia decena, 90).

Desde 07 llega en *attacca*: 07 termina en 72 y 08 empieza en 80, cambio de decena. El preview lo
anuncia (⇢ 80, cambio de decena) durante los últimos 30 s de 07.

## 5. Láser

```
laser text PROTO-SPORE span 0 315 mutate 0->0.1->0.15->0.7->0.25 rate 2 color 1,0.5,0 field 50 signal 100
```

La palabra en naranja, campo medio. Dos veces por segundo cada letra puede cambiar por otra con
probabilidad `mutate`: casi legible al comienzo, monstruosa en D (0,7), y vuelve a leerse a medias
al final.

## 6. Hacia el final (09)

El candidato para 09 MICROSPORE es material del lab 15 BEFERA. 08 termina en una sola nota (la#)
repartida por todas las octavas y divisiones, con el registro con el que empieza 09.

## 7. Preguntas abiertas

1. Analítica: ¿qué tan fiel es una transcripción espectral de 1 s a una grabación de síntesis? Los
   picos mezclan parciales y fundamentales; conviene revisar de oído los 20 acordes.
2. Crítica: Messiaen, Elgar y Couperin entran como material, no como cita reconocible. ¿Dónde está
   el límite entre el morphing como deformación y la apropiación?
3. Especulativa: si la cita de 2020 fuera el genoma y el resto de la pieza su fenotipo, ¿qué
   mutación devolvería, al final, la grabación original?

## 8. Referencias

```bibtex
@misc{azzigotti2020protoespora,
  author = {Azzigotti, Luciano},
  title = {apomixis-01-proto-espora},
  year = {2020},
  note = {audio, 79,8 s; 19 apomixis/apomixis tracks/apomixis-01-proto-espora.mp3; SuperCollider source archive/supercollider/08\_ProtoEspora.scd}
}
@misc{messiaen1928banquet,
  author = {Messiaen, Olivier},
  title = {Le Banquet c{\'e}leste, pour orgue},
  year = {1928},
  note = {MIDI file messiaen-lebanqueceleste.mid; edition and pages to verify}
}
@misc{couperin1690offertoire,
  author = {Couperin, Fran{\c c}ois},
  title = {Offertoire sur les grands jeux, Messe pour les paroisses},
  year = {1690},
  note = {MIDI file couperin-offertoire-grands-jeux.mid; edition and pages to verify}
}
@misc{elgar005,
  author = {Elgar, Edward},
  title = {elgar-005 (work to identify)},
  note = {MIDI file elgar-005.mid; title, year and edition to verify}
}
```
