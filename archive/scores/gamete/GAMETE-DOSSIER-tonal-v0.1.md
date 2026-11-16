# 02. GAMETE / Gameto — el grano · dossier conceptual y de sistema

> **Tesis:** el grano de polen es un gametofito completo reducido a una cápsula: una célula cerrada que
> sólo existe para viajar y encontrarse. *GAMETE* compone ese encuentro como **tonalidad**: una
> célula melódica cerrada (si–re–do#–mi) que se abre, se polariza contra su dominante, crece como un
> tubo hacia el óvulo y, tras una doble fecundación, vuelve a cerrarse en semilla.

Contexto en el ciclo: pieza `2` · `AUTO` · capas dominantes `PO+RE` (el tutti abre y cierra) ·
`05:00–09:30` (270 s) · *encuentro suspendido*. Partitura: `apps/hylon/scores/GAMETE-score.txt`
(`HYLON-SCORE 1`). Sucede a *SPORE* (dispersión, sin altura fija) y precede a *MEIOSIS*.

---

## 1. Género

**Tocata-coral tonal sobre célula en cruz.**

| Rasgo | Tradición | En GAMETE |
|---|---|---|
| *Cantus firmus* / célula | coral luterano, organum | la célula **si3–re4–do#4–mi4** (mi4 algo más largo) es el *grano*: se expone en **tutti al unísono**, sin armonía, como un coral desnudo, y vuelve igual al final |
| Figura de cruz (*Kreuzfigur*) | B‑A‑C‑H (−2m, +3m, −2m) | la célula invierte/retrograda esa forma: **+3m, −2m, +3m**. Dos trayectorias que se cruzan: dos gametos |
| Tocata arpegiada | tocata francesa (Widor, Vierne, Duruflé) | los arpegiadores entran **incrementalmente** (1 → 40 voces) sobre pedales tónicos, como una tocata que se va engrosando |
| Tonalidad funcional | — | si menor, eje **i ↔ V**; nada nuevo a propósito: el grano no innova, transporta |

GAMETE es **eminentemente tonal**: es el único número del ciclo donde la altura se organiza por
funciones. SPORE (la dispersión) deja de sonar: en toda la partitura `native off`; sólo suenan las
líneas `cell`, `arp`, `pedal` y `laser`.

## 2. Polaridades

La polaridad es el **5.º grado**: si menor (i: si–re–fa#) contra **fa# mayor con séptima disminuida**
(V♭9: fa#–la#–do#–mi–sol = fa# mayor + la#°7). Nada nuevo, deliberadamente: la tensión dominante
es la atracción química del óvulo.

| Polo | Conjunto (`pcs`) | Biología | Lectura |
|---|---|---|---|
| **i** — tónica | `B,D,F#` | el grano: haploide, cerrado, en reposo | arpegios ascendentes, pedal si1 (35) |
| **V♭9** — dominante | `F#,A#,C#,E,G` | el óvulo atrae: péptidos LURE (Okuda et al., *Nature* 2009) guían el tubo polínico por quimiotropismo | arpegios *updown*/*down*, ostinato fa#1–do#2 |

Las secciones alternan i → V → i y en **Oscillation** ambos polos suenan a la vez (dos
arpegiadores): los dos núcleos espermáticos viajando juntos por el tubo.

## 3. Escalas micro–macro: el CALIBRE por yuxtaposición no transitiva

El arpegiador tiene **calibre** = distancia en semitonos entre sus voces simultáneas
(0/1 unísono, 2 semitono, 3 segunda mayor… toroidal: lo que pasa el agudo reentra en el grave,
conservando la clase de altura).

- Durante casi toda la obra el calibre es **0 (unísono)**: todas las voces arpegian el mismo acorde;
  crece la **densidad** (voces 1 → 40) y el **hoquetus** (`rexp` 0 → 0.6), no la textura armónica.
- Hacia el final (**Juxtaposition**, 196–232 s) el calibre se **cierra y abre por yuxtaposición**:
  `calibre 1|12|2|8|0|5|1|10`. Cada ciclo del arpegio salta a otro valor **sin glissando ni
  interpolación** y sin orden transitivo (1 no lleva a 2 ni a 12): micro (unísono, semitono) y macro
  (octava, décima) se tocan sin pasar por el medio. Biológicamente: la **doble fecundación**, dos
  fusiones simultáneas a escalas distintas (óvulo / endosperma).

## 4. El objeto hipergrave: tres apariciones con láser XY

Un objeto ajeno a la tonalidad: **cluster del 32′ del pedal** (Flûte 32′, Soubasse 32′,
Contrebombarde 32′) en la octava más grave (do1 = 24 …), con pulsos de **láser MIDI XY** sincronizados
con cada nota del pedal (`laser midixy src pe`). Es la zozobra y el temblor del grano antes de germinar.

| # | Sección | Tiempo | Material | Láser |
|---|---|---|---|---|
| 1 | **Tremor 1** | 60–72 s | `pedal ostinato 24 25 26 27 rate 1/16 dur 4` — cluster temblado | size 30 · prob 70 % · max 4 · dur 0.5 |
| 2 | **Tremor 2** | 140–154 s | ídem más ancho (24–28) y más denso (`1/24`, `dur 6`) | size 50 · prob 80 % · max 6 · dur 1 |
| 3 | **Ultra-beats** | 232–252 s | **ultra batimentos**: notas largas superpuestas que **pendulan** en la octava más grave (24 25 26 27 26 25, `dur 3`, `rdur 25`) — las segundas menores a 32′ baten entre sí | size 80 · prob 100 % · max 8 · dur 1.5 |

Biología: choque de hidratación del grano sobre el estigma; resistencia del estilo; fusión de dos
genomas que "baten" antes de ser uno. El láser nunca se enciende desde la partitura: el operador
corre PREVIEW/OUTPUT y la partitura sólo modula el contenido (ver `docs/HELIOS-POD-GUIDE.md`).

## 5. Forma

| Sección | Tiempo | bpm | Función | Material principal | Biología |
|---|---|---|---|---|---|
| **I** Cell | 0–24 | 60 | exposición | `cell B3 D4 C#4 E4 dur 1 1 1 1.5` tutti unísono ×3 | grano liberado |
| **A1** Encounter i | 24–60 | 60 | i | arp i, voces 1 → 4, pedal si1 | polinización |
| **T1** Tremor 1 | 60–72 | 40 | objeto | cluster 32′ + láser | choque de hidratación |
| **A2** Polarity V | 72–108 | 66 | V♭9 | arp V, voces 4 → 12, `rexp 0.2` | germinación, quimiotropismo |
| **A3** Return i | 108–140 | 66 | i | arp i, voces 12 → 20, `rexp 0.4` | crecimiento apical del tubo |
| **T2** Tremor 2 | 140–154 | 40 | objeto | cluster ampliado + láser | resistencia del estilo |
| **A4** Oscillation | 154–196 | 72 | i + V | dos arpegiadores (20 → 28 / 4 → 12) | dos núcleos en el tubo |
| **J** Juxtaposition | 196–232 | 72 | micro–macro | `calibre 1\|12\|2\|8\|0\|5\|1\|10`, voces 28 → 40 | doble fecundación |
| **T3** Ultra-beats | 232–252 | 30 | objeto | péndulo 32′ batiente + láser | fusión |
| **R** Re-exposition | 252–264 | 60 | reexposición | la célula, tutti unísono | semilla |
| **Z** Silence | 264–270 | — | silencio | — | dormancia → MEIOSIS |

## 6. Modelo computacional (mensajes de partitura)

Todos son líneas de sección del lenguaje común (`HYLON-SCORE 1` / `SPORE-SCORE 1`) y se componen
en el pod **LIBRARY** (o LASER) y se pegan con **P** en el cursor de SCORE TXT.

| Mensaje | Sintaxis | Rol en GAMETE |
|---|---|---|
| `cell` | `cell B3 D4 C#4 E4 dur 1 1 1 1.5 rate 1/4 div tutti at 1 repeat 3 gap 2 art 0.95 vel 90 tr 0` | **discretiza células melódicas**: notas (nombre o MIDI), duración por nota en unidades de `rate`, divisiones (`tutti`, `manuals`, lista), comienzo en pulsos, repeticiones con pausa, articulación, transposición |
| `arp … pcs` | `arp dir up pcs B,D,F# root 59 len 6 rate 1/8 calibre 0 voices 1->4 …` | arpegio sobre **notas del acorde** (escalera por clases de altura) en lugar de intervalo fijo |
| juxtaposición | `calibre 1\|12\|2\|8` (también `voices`, `step`…) | cambia de valor **por ciclo de arpegio**, sin interpolar |
| rampas | `voices 4->12` | crecimiento incremental a lo largo de la sección |
| `pedal` | `pedal drone 35` / `pedal ostinato 24 25 26 27 rate 1/16 dur 4` | pedal tónico, ostinato de dominante, objeto hipergrave |
| `laser` | `laser midixy src pe size 80 prob 100 max 8 dur 1.5` | pulsos XY con las notas del pedal |
| `native off` | — | silencia el generador genético de SPORE (la grilla sigue viva visualmente) |

Toroide: toda nota fuera del ámbito de su división reentra por el extremo opuesto **conservando la
clase de altura** (la célula en el pedal suena si1–re2–do#2–mi2).

## 7. Abierto / a verificar

- Registraciones lógicas por sección (claves del catálogo) **no verificadas** en la consola; el
  láser responde sólo si el operador lo tiene corriendo.
- Densidades de 28–40 voces a `1/16` exigen probar el sampler (límite real) y la respuesta del órgano
  por MIDI (sin límite en software).
- ¿La célula debe reaparecer transportada en V (`tr 7`) antes de la reexposición?
- Dinámica de cajas expresivas (PO/RE) para el crecimiento del tubo: pendiente de un mensaje `swell`.
