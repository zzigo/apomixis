# 06. OOSPHERE / Oósfera — los relojes se vuelven cuerpo

**Dossier de composición y realización · 0.4.0-draft.1 · 14 noviembre 2026**

Partitura: `scores/06-OOSPHERE-score.txt`. **452s /7′32″,20secciones.** Cierra el ciclo después de09-MICROSPORE, manteniendo los números. Esta revisión responde a la escucha del compositor: la cámara inicial de la versión0.1 no tenía el Rhythmicon que interesaba; ahora los materiales reconocibles de HORVITZ abren directamente la pieza.

La versión anterior de370s y su dossier están en `archive/scores/oosphere/`. Los labs16-HORVITZ,15-BEFERA y11-ANTHESIS permanecen intactos.

## 1. Curva escrita

| Sección | Tiempo | Material y función |
|---|---:|---|
| H1 · Sixteen glissandi |0–70s | BloqueB de HORVITZ con sus notas, duración y arco; afectado por VECTOR |
| H2 · Rhythmicon / HORVITZ |70–130s | Relojes del bloqueC; nuevas quintas entrelazadas en dos estratos y pedalC1 |
| AP · Humus memory |130–136s | ap de BEFERA abreviado a6s; recuerdo de la materia32′ de03 |
| F0 · FM3:7 / First irruption |136–154s | Primera cita del módulo11 de BEFERA, con el mismo campoFM y pedalD1 |
| RM · Mega Rhythmicon / Into Bells |154–202s | Tres voces por manual, doce alturas politonales; convergencia gradual aE5 |
| SPI · s+p+i / Expanded interlock |202–232s | Timbres de BEFERA en los ritmos entrelazados de02, a118,8BPM |
| S1–S12 · Síntesis espectral |232–402s | Los doce módulosFM de BEFERA, incluido el regreso de3:7; sin extinción |
| M · Mega chords / Growing body |402–432s | Acordes espectrales recuperados y cluster diatónico que crece de5 a21teclas, cada150ms |
| T · Triumph / The same heights |432–452s | Mismo conjunto y retícula; el tutti completo continúa la mutación tímbrica |

La duración crece respecto de0.1 para conservar completos los70/60s de HORVITZ y los170s de los módulosFM. No se comprime lo que el compositor identifica como material que ya funciona. La reserva inicial contra repetir perceptual speed queda matizada por su pedido posterior explícito de abrir con Sixteen glissandi: se conserva el arco original de ese bloque, sin añadir aceleraciones a los dos rhythmicons siguientes.

## 2. La apertura es HORVITZ, no una alusión

### Sixteen glissandi

Se toma del lab la lista blancaC6–C3, `base5`, dieciséis voces, `step1`,70s, `arch on`, `accel1->4`, notas de50ms y la registración de flautas deI/II/III más73 enIV. El primer sonido pertenece ya a ese mecanismo: no hay cámara previa ni una introducción retunada a las alturas de BEFERA.

La referencia es el procedimiento local escrito en16-HORVITZ, no una transcripción de una obra de Seth Horvitz. La fuente del lab remite a sus estudios, Cowell y Tenney.

### Rhythmicon

A70s se conservan los relojes del bloqueC de HORVITZ, ahora con un perfil interválico más nítido:

```text
D2–A2 / Bb2–F3 / Gb3–Db4
C#4–G#4 / A4–E5 / F5–C6
```

Cada pareja es una quinta justa. Entre las quintas, las unionesA–Bb yF–Gb son semitonos; en el estrato agudo lo sonG#–A yE–F. La fricción está en el enlace entre parejas, no sustituyendo la quinta. El segundo estrato es la misma figura23semitonos más arriba, desdeC#4. Db4/C#4 es una altura compartida entre ambos estratos, asignada a voces/manuales diferentes: no se declara que las doce voces tengan doce alturas distintas aquí. Esa condición sigue perteneciendo al mega-Rhythmicon posterior.

Se mantienen `base6`, doce voces, modo armónico y gate80->200ms durante60s. El pedalC1 se conserva. No se aplica VECTOR a este bloque; el primer bloque de glissandi sigue intacto y con su VECTOR optativo.

## 3. VECTOR del inicio

La nueva opción explícita `rhythmicon … vector on` liga únicamente el primer bloque a los cinco controles existentes. Los demás rhythmicons mantienen sus cantidades y reglas escritas.

| Vector | Efecto en H1 |
|---|---|
| μ | Por encima de×1, pequeñas mutaciones de un semitono, deterministas por voz/pulso |
| δ | Desplaza levemente la fase de cada voz, hasta−30/+60ms en el rango visible; no cambia el tempo maestro |
| π | Por encima de×1, brotes ocasionales de octava, más suaves y cortos |
| τ | Escala las duraciones cortas, con piso10ms y factor acotado0,2–3 |
| ρ |16voces × factor, acotado0–24; en×1 permanecen las dieciséis |

Con todos los controles en×1 se conserva el bloque del lab. No se modifican los datos del TXT ni se habilitan salidas. Los efectos se calculan para nuevos eventos; los controles no reconstruyen notas ya enviadas. El patrón de espejo/arco y la aceleración originales siguen escritos en la partitura.

## 4. Del ruido al primer objetoFM

AP deja sólo6s de la zona aperiódica32′ de BEFERA. Es un parentesco material con HUMUS/03: aire y batimiento grave, sin hacer otra exposición completa del ruido. No se lo presenta como cita literal de toda aquella sección.

Inmediatamente aparece **FM3:7**, usando la línea deS11 de BEFERA: `FM:D1:3:7:6 | FM:D1:1:2:6`, con sus ataques y su pedal. Es una primera irrupción; la misma familia volverá enS11 del tramo final. Así un objeto que después tendrá una función de llegada ya fue oído antes de la gran convergencia.

## 5. Mega-Rhythmicon: doce alturas, tres en cada manual

Un único algoritmo dura48s y conserva sus relojes durante toda la transformación. El reparto inicial es:

| Manual | Tres alturas | Campo inicial |
|---|---|---|
| I | E3 G4 B4 | Mi menor |
| II | Bb3 D5 F5 | Si♭ mayor |
| III | F#3 A4 C#5 | Fa♯ menor |
| IV | C4 Eb5 Ab4 | La♭ mayor, en inversión |

Las doce alturas iniciales son distintas y reúnen las doce clases. El orden de la lista intercala manuales, de modo que las voces1/5/9 van aI,2/6/10 aII,3/7/11 aIII y4/8/12 aIV. Es **un** rhythmicon de doce tasas1…12 sobre `base6`, no cuatro copias del mismo algoritmo que reinicien sus contadores.

```text
rhythmicon E3 Bb3 F#3 C4 G4 D5 A4 Eb5 B4 F5 C#5 Ab4
  base 6 voices 12 mode harmonic ms 80->600
  step 0 arch off accel 1 div manuals to E5 morph 0->1
```

`toE5 morph0->1` es la nueva interpolación de alturas por voz. En cada ataque se toma una altura cada vez más próxima al mi5 de **Bells**; se redondea al semitono del órgano. No se dobla el tempo ni se reinicia el generador. Las notas ya sostenidas no reciben pitch bend. El gate se abre de80 a600ms, y la coincidencia progresiva de alturas deja oír un cuerpo común con varias tasas internas.

Se cita aquí la altura de Bells. No se copia su cambio a modo subarmónico ni su reducción de velocidad: los mismos doce relojes continúan. Puede producirse coalescencia MIDI cuando varias voces del mismo manual alcanzanE5 y se superponen; se conserva la política de propiedad de notas del sistema, sin forzar Note Off ajenos.

## 6. s+p+i desde el ritmo de02

Los objetos siguen siendo los de BEFERA:

- seno: A4/E5/A4/C#5;
- inarmonía: las dos agregaciones deC4 con segundas, tritonos y extensiones;
- impulso: C5 con intervalos0/6/13/19.

I toma `X..x.x..` yII su complemento `.xx.x.xx`, como02-GAMETE. Juntos ocupan todos los lugares de1/16. III devuelve el seno en una cadena de satélites a1/32 yIV coloca impulsos en las casillas impares. Las duraciones más amplias70->160ms y250ms, el brillo de las registraciones y el pedalD1 hacen que la textura sea más expansiva y triunfal, no una copia de sus alturas frigio/lidias.

El tempo es **118,8BPM =132×0,9**. Se interpreta “10% más lento” como10% menos BPM, no como10% más duración por nota. No se modifica el reloj global de las otras piezas ni el selector general de velocidad.

## 7. LasFM continúan sin despedirse

Se conservan los doce módulos, sus alturas, relaciones y duraciones22/18/15/12/10/8/8/10/12/15/18/22s. Su recorrido ocupa232–402s. La cita3:7 inicial no elimina su regreso enS11.

Se retiran las extinciones: la curva de crescendo parte ahora de0,55 y llega a1;S12 ya no cae a0,55 ni reduce su probabilidad. No hay directivas `silence`. Las ventanas y la articulación interna de los patrones siguen teniendo espacios; “sin silencios” significa no abrir un vacío formal ni apagar el proceso entre bloques. No promete una señal acústica ininterrumpida en todo instante.

### Final: conservar los acordes y aumentar el cuerpo

La revisión0.4 recupera los acordes anteriores al cierre: **MASS1/MASS3/MASS2/MASS4** vuelven durante402–432s con sus ocho ataques cada4s, gates4,2–5,4s y arpegiado interno0/12/0/25ms. Sus alturas y su sucesión se conservan; se distribuyen por rango entre los manuales, en vez de duplicar todo el objeto en cada uno.

En paralelo, el cluster de **re mixolidio** no entra completo. Crece por conjuntos anidados de5/10/15/21teclas, elegidas a lo ancho del campo. Cada bloque de50ataques dura7,5s; `morph1` incorpora sus nuevas notas progresivamente. Las que ya están presentes no cambian de altura. Se completa el conjunto hacia424,5s y se mantiene hasta452s:

```text
D3 E3 F#3 G3 A3 B3 C4
D4 E4 F#4 G4 A4 B4 C5
D5 E5 F#5 G5 A5 B5 C6
```

El conjunto de llegada se repite al final de la rueda de crecimiento para evitar volver a una capa escasa antes de terminarM. Los150ms se conservan: a100BPM,1/16. `voicing spread` ordena por altura las notas efectivamente presentes en cada ataque y reparte rangos vecinos entreI/II/III/IV. Cada manual recibe cada cuarta nota del campo vigente. `iris1` cambia su asignación en cada reiteración; se modifica el timbre, no se transponen las alturas del cluster.

En432s el tutti completo añade su color al cuerpo ya crecido. M tiene200pulsos, múltiplo de cuatro, y la misma rotación continúa enT. Las colas de los últimos acordes espectrales pueden entrar unos segundos en el tutti final; después no se solicitan nuevos ataques de esas masas. Permanece el cluster completo redistribuyéndose hasta452s, sobre pedalD1.

Hay así dos procesos superpuestos antes del cierre: la sucesión armónica recuperada y el crecimiento de un universo diatónico fijo. El final mantiene este último, sin nuevos cambios de altura. Los150ms son una solicitud de partitura sujeta al tempo de reproducción y al perfil MIDI; no una medición física.

## 8. Registración, infraestructura y alcance

Diez conjuntos distintos mantienen la pieza dentro de su decena prevista60–69: flautas del glissando; principales del Rhythmicon; ruido32′; conjuntoFM con mixturas; conjunto del mega-Rhythmicon; expansiónSPI; primerasFM; FM con mutaciones; masas; tutti terminal. El banco no se regeneró ni se transmitió al editar. El número de pieza sigue siendo06 aunque cierre después de09.

Para escribir el cluster se amplía el límite de un acorde literal de12 a32notas; se conservan los mismos modos de voicing y el mismo límite de16acordes por línea. No se crea un generador nuevo. Los conjuntos anidados y `morph` hacen el crecimiento; el modo optativo `voicing spread` reparte por rango actual e`iris` cambia la propiedad manual. Los modos anteriores split/stack se conservan.

Los cambios anteriores de código se conservan: `rhythmicon` admite `vector on`, `to NOTE…` y `morph`; las opciones son inactivas por defecto y no cambian los labs antiguos. El vector viaja por el contexto del generador compartido. No se añaden DSP, dispositivos ni temporizadores de hardware. Todas las secciones mantienen `native off` y `laser off`.

09 conserva `attacca06` y sigue pendiente de convertirse en la canción triste definitiva. Las fuentes15/16/11 quedan intactas;0.1 se archiva como antecedente. El concepto de oósfera como potencial/activación se mantiene como interpretación artística, sin imponer un relato biológico al comportamiento de cada algoritmo. Antecedentes de investigación: [gametofito femenino](https://pmc.ncbi.nlm.nih.gov/articles/PMC3268550/) y [BBM1/partenogénesis](https://www.nature.com/articles/s41586-018-0785-8).

**Estado:** edición de score, implementación de las opciones necesarias y dossier. Sin tests, compilación, builds, audición, interfaz ni hardware. La respuesta de las doce voces al converger, el tamaño percibido deSPI y la continuidad real deben decidirse por escucha.


Revisión0.3 autorizada por el compositor: perfil de quintas con semitonos en el primer Rhythmicon propiamente dicho, estrato agudo desde do♯ y final más cercano al cluster diatónico, con insistencia alrededor de150ms y mutación de timbre sin cambio de altura. Antecedente0.2 archivado. Sin tests, compilación, builds ni audición.


Revisión0.4: restituidos los acordes pre-finales, junto al crecimiento diatónico y la mutación tímbrica de150ms. Se conservan452s, registraciones, orden y resto de secciones. Sin tests ni builds.


## Revisión v0.5 · campos modales y acorde terminal

Duración actual: **458 s (7:38)**. Los primeros70s conservan los16relojes y el arco HORVITZ, pero mutan gradualmente entre do menor armónica, do lidia, pentatónica china (0/4/6/7/11) y octatónica tono–semitono. «China» identifica aquí esa colección concreta. La mezcla de campos vecinos ocurre por ataques, sin reiniciar las voces.

El cuerpo final conserva re mixolidio y agrega **mi bemol y sol sostenido** en tres octavas:27teclas, nueve clases. Tras el cuerpo, **452–453 silencio de generación**; **453–458** vuelve el último acorde literal del Triumph v0.2: `FM:D1:1:2:6`, simultáneo en tutti, cinco segundos. Las colas acústicas no se cortan artificialmente. Sin escucha ni pruebas.


### v0.6 · apertura del último acorde

El cierre conserva las clases D/A/F#/C/E/G#/Bb del espectro anterior, pero distribuidas desde D1 en pedal hasta C6, con coronas agudas en III/IV y sin apilar el mismo bloque grave en todos los manuales. Ataque único a453s, duración12s; pausa previa de un segundo intacta. Duración actual **465s (7:45)**. Sin escucha ni pruebas.
