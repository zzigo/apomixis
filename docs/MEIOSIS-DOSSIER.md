# 03. MEIOSIS / La flor — del humus al acorde

**Dossier de composición y realización · 0.2.0-draft.1 · 14 noviembre 2026**

Partitura activa: `scores/03-MEIOSIS-score.txt`. Duración: **270 s / 4′30″**. Base: lab12 HUMUS, semilla3121. Revisión solicitada por el compositor: pasar HUMUS a MEIOSIS con pocos cambios y superponer, desde CUT SOIL, los dos estados armónicos finales de la MEIOSIS anterior al bajo de pedal existente.

El lab `scores/12-HUMUS-score.txt` queda intacto. La anterior versión cantabile de330s y su dossier se conservan en `archive/scores/meiosis/`. Las piezas SC permanecen como fuentes históricas; esta revisión es una partitura TXT para HYLON, sin cambio de motor.

## 1. Planteo

La flor no se presenta ahora como una melodía expuesta desde el comienzo. Aparece como una posibilidad armónica que se vuelve audible dentro de una materia previamente indiferenciada. La obra parte del humus: aire, batimientos, ruido grave y familias de tubos que se suceden y se cortan unas a otras. Al final, una forma reconocible aparece por sustracción.

Este reemplazo cambia la jerarquía de la propuesta anterior. El tema y el antitema cantabiles, el crossover melódico y su hoquetus ya no organizan la macroforma activa. Se conserva su memoria vertical: el cluster de Perforation y las siete alturas de Residue. La melodía anterior queda latente en esas alturas, sin recuperar su orden sucesivo ni añadir una reexposición.

HUMUS aporta la forma, los algoritmos, las velocidades, las articulaciones y casi toda la registración. MEIOSIS aporta el objeto terminal que se sostiene por encima del suelo grave. No se añade una segunda pieza después del lab: ambos materiales se encuentran durante sus últimos treinta segundos.

## 2. Polaridades y materiales

| Polo | Material | Función |
|---|---|---|
| Suelo | Pedal32′, C1–E1 y F1–B1 | Aire, ruido y batimiento; continuidad material |
| Familias | Flautas/bordones, lengüetas, metales,2′/mixturas | Contrastes de construcción y espectro |
| Corte | Alternancia F1–F5 en bloques8–12s | Hacer oír los límites entre materias |
| Perforation | Cluster C4–D5, quince alturas | Objeto denso que pierde notas |
| Residue | C4 D4 E4 F4 G4 A4 Bb4 | Identidad armónica que permanece |

Los dos estados finales siguen vivos. No son dos acordes independientes reatacados: son dos momentos de un mismo sostén. Las notas protegidas entran con el cluster y permanecen hasta el final; las otras ocho se retiran.

## 3. Macroforma

Se conserva la duración y la sucesión temporal de HUMUS.

| Sección | Tiempo | Material principal |
|---|---:|---|
| A · Substrate | 0–40s | CLOUD: C1–E1,32′ |
| B · Flutes | 40–80s | SWARM de flautas/bordones + SOIL en pedal |
| C · Reeds | 80–120s | Masa grave de lengüetas, trémolos, expresión alternada |
| D · Brass | 120–160s | Clusters percusivos y pedal; huecos rítmicos |
| E · Cloud | 160–200s | Nube aguda de2′ y mixturas |
| F1 · Cut flutes | 200–212s | Bloque de flautas |
| F2 · Cut brass | 212–220s | Bloque de metales |
| F3 · Cut reeds | 220–232s | Bloque de lengüetas |
| F4 · Cut cloud | 232–240s | Bloque de nube aguda |
| F5 · Cut soil / Perforation | 240–250s | SOIL original + entrada y perforación del cluster en III |
| Z · Humus / Residue | 250–270s | CLOUD original sin Contrebombarde + siete notas sostenidas en III |

Los primeros240s mantienen las líneas musicales de HUMUS. Desde240s se suma una sola capa sostenida; no se sustituye el pedal. Se conservan sus dos zonas: SOIL en F5 y CLOUD en Z.

La adaptación comprime Perforation al bloque de10s disponible y mantiene Residue durante los20s finales. No conserva los36/18s del borrador anterior ni añade su sección Cluster de30s. Es la decisión de encaje adoptada para mantener HUMUS en4′30″.

## 4. Los dos estados finales

### Perforation: 4:00–4:10

A240s entran simultáneamente las quince alturas cromáticas **C4–D5 / MIDI60–74** en ManualIII. El pedal continúa con SOIL, sin cambio de notas ni algoritmo. Se añade **registro57 / III.Cor de nuit8′** a la registración de32′.

Se deja un segundo inicial de presencia íntegra. La sustracción se calcula desde241 hasta250s: ocho liberaciones, ordenadas por la regla heredada del algoritmo `cluster`. Primero salen las notas ajenas al conjunto de clases C,D,E,F,G,A,Bb; después las diatónicas que no son las alturas exactas protegidas. La última liberación ocurre a250s.

### Residue: 4:10–4:30

Permanecen exactamente:

```text
C4 D4 E4 F4 G4 A4 Bb4
60 62 64 65 67 69 70
```

Al pasar a Z no se solicita un nuevo ataque de esas siete notas. El registro57 se mantiene; el pedal pasa al CLOUD de HUMUS y retira la Contrebombarde como antes. El final conserva esa superposición hasta270s.

Se eliminan los dos silencios globales que HUMUS tenía en Z, a264 y267s. Es una modificación explícita para mantener el cierre vivo y evitar que los huecos interrumpan el acorde, especialmente al reconstruir un salto del transporte. El patrón CLOUD se conserva; esos dos cortes, no.

## 5. Escritura y continuidad

Las dos secciones finales invocan la misma definición absoluta:

```text
set RESIDUE = cluster C4 D5 keep C4 D4 E4 F4 G4 A4 Bb4 pcs C,D,E,F,G,A,Bb origin 240 holes-from 241 holes-to 250 until 270 div re
```

F5 mantiene `@SOIL` y añade `@RESIDUE`; Z mantiene `@CLOUD` y añade `@RESIDUE`. La segunda invocación describe continuidad y reconstrucción tras seek; no pide repetir el cluster en reproducción normal. Un salto dentro del final debe reconstruir las alturas aún vigentes con su duración restante.

Las voces, rangos y semilla son los de HUMUS. `native off` sigue presente en todas las secciones; no se añade generación celular nativa. La curva de harmonicity permanece en m2 hasta CUT SOIL y llega a P5 en Residue como referencia visual: no transforma las alturas literales del cluster.

Los programas se derivan de las combinaciones de `pgm`; la modificación necesaria es sumar57 en las dos últimas secciones. No se fijan números de memoria manualmente en el TXT. El banco generado debe corresponder al nuevo contenido antes de usar sus indicaciones de consola.

## 6. Biología y escucha

El humus es el medio material de este planteo, no una etapa celular de la meiosis. La flor designa la aparición de una forma atractiva y legible. La perforación es una operación musical de selección de alturas, no una descripción científica de la meiosis. La continuidad con el título se apoya en separación, coexistencia y supervivencia de una identidad dentro de una materia común.

La escucha cambia de régimen sin borrar el suelo: al principio atiende a la familia de tubos y a su ruido; al final puede seguir una identidad armónica sostenida por encima de ese ruido. El residuo no resuelve toda la obra en una melodía romántica: mantiene una memoria vertical de la propuesta anterior.

## 7. Realización y pendientes

HYLON conserva su transporte, K/LA/MO y control del operador. Los cues de láser son los de HUMUS, incluido el MIDI XY del pedal en CUT SOIL; el score no conecta ni arma la salida física. No se modifican DSP, parser, algoritmos ni límites de salida en esta revisión.

La continuidad solicitada cubre30s para las notas protegidas. La respuesta real del sampler, los sostienes del órgano y los mínimos de ataque configurados deben decidirse por escucha; no se afirma una duración acústica verificada ni una correspondencia aislada de muestras con cada tirador.

Criterios pendientes para una sesión solicitada de comprobación:

- Primeros240s y pedal de F5 conservan el material de HUMUS.
- A240s el cluster del III se superpone al pedal; no lo reemplaza.
- A250s quedan sólo las siete alturas protegidas; no se reatacan al cambiar de sección.
- El registro57 permanece en ambas secciones finales.
- Seek reconstruye el estado armónico; STOP/PANIC lo interrumpen.
- El final llega a270s con el residuo sostenido sobre CLOUD.

**Estado de esta entrega:** edición de fuente y dossier. No se ejecutaron tests, compilación, builds, interfaz ni hardware.

## 8. Procedencia

- Pedido del compositor del14/11/2026: HUMUS como nueva03-MEIOSIS; acordes de Perforation/Residue sobre el pedal desde CUT SOIL.
- `scores/12-HUMUS-score.txt`: fuente del material y la forma, conservada intacta.
- `archive/scores/meiosis/03-MEIOSIS-cantabile-v0.1-score.txt`: fuente de las alturas y de la regla de perforación.
- `archive/scores/meiosis/MEIOSIS-DOSSIER-cantabile-v0.1.md`: planteo anterior completo, conservado como memoria.
- `packages/hylon-algos/meiosis.js`: algoritmo `cluster` existente; `packages/hylon-algos/layer.js`: ventanas y continuidad.
