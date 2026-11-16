# 06. OOSPHERE / Oósfera — los relojes se vuelven cuerpo

**Dossier de composición y realización · 0.2.0-draft.1 · 14 noviembre 2026**

Partitura: `scores/06-OOSPHERE-score.txt`. **452s /7′32″,20secciones.** Cierra el ciclo después de09-MICROSPORE, manteniendo los números. Esta revisión responde a la escucha del compositor: la cámara inicial de la versión0.1 no tenía el Rhythmicon que interesaba; ahora los materiales reconocibles de HORVITZ abren directamente la pieza.

La versión anterior de370s y su dossier están en `archive/scores/oosphere/`. Los labs16-HORVITZ,15-BEFERA y11-ANTHESIS permanecen intactos.

## 1. Curva escrita

| Sección | Tiempo | Material y función |
|---|---:|---|
| H1 · Sixteen glissandi |0–70s | BloqueB de HORVITZ con sus notas, duración y arco; afectado por VECTOR |
| H2 · Rhythmicon / HORVITZ |70–130s | BloqueC: las doce alturas originales, tasas armónicas y pedalC1 |
| AP · Humus memory |130–136s | ap de BEFERA abreviado a6s; recuerdo de la materia32′ de03 |
| F0 · FM3:7 / First irruption |136–154s | Primera cita del módulo11 de BEFERA, con el mismo campoFM y pedalD1 |
| RM · Mega Rhythmicon / Into Bells |154–202s | Tres voces por manual, doce alturas politonales; convergencia gradual aE5 |
| SPI · s+p+i / Expanded interlock |202–232s | Timbres de BEFERA en los ritmos entrelazados de02, a118,8BPM |
| S1–S12 · Síntesis espectral |232–402s | Los doce módulosFM de BEFERA, incluido el regreso de3:7; sin extinción |
| M · Mega chords / Integration |402–432s | Masas de ANTHESIS retunadas al espectroD1, ahora superpuestas |
| T · Triumph / Beginning |432–452s | Tres acontecimientos unidos por el sostén; el último1:2 alcanza el final |

La duración crece respecto de0.1 para conservar completos los70/60s de HORVITZ y los170s de los módulosFM. No se comprime lo que el compositor identifica como material que ya funciona. La reserva inicial contra repetir perceptual speed queda matizada por su pedido posterior explícito de abrir con Sixteen glissandi: se conserva el arco original de ese bloque, sin añadir aceleraciones a los dos rhythmicons siguientes.

## 2. La apertura es HORVITZ, no una alusión

### Sixteen glissandi

Se toma del lab la lista blancaC6–C3, `base5`, dieciséis voces, `step1`,70s, `arch on`, `accel1->4`, notas de50ms y la registración de flautas deI/II/III más73 enIV. El primer sonido pertenece ya a ese mecanismo: no hay cámara previa ni una introducción retunada a las alturas de BEFERA.

La referencia es el procedimiento local escrito en16-HORVITZ, no una transcripción de una obra de Seth Horvitz. La fuente del lab remite a sus estudios, Cowell y Tenney.

### Rhythmicon

A70s entra la lista original del bloqueC:

```text
C2 C3 G3 C4 E4 G4 Bb4 C5 D5 E5 F#5 G5
```

Se conservan `base6`, doce voces, modo armónico y gate80->200ms durante60s. Se añade73 a la registración del lab para que elIV asignado tenga un registro hablante; el pedalC1 se conserva. No se sustituyen las alturas por las de BEFERA y no se aplica VECTOR a este bloque.

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

Las masas finales piden gates4,2–5,4s con ataques cada4s, sobre pedalD1. Los tres acontecimientos finales ocurren a432/440/448s y duran8/8/4s. De ese modo ya no quedan los huecos largos de la primera versión: el último objeto1:2 sostiene hasta452s y deja la sala resonando.

## 8. Registración, infraestructura y alcance

Diez conjuntos distintos mantienen la pieza dentro de su decena prevista60–69: flautas del glissando; principales del Rhythmicon; ruido32′; conjuntoFM con mixturas; conjunto del mega-Rhythmicon; expansiónSPI; primerasFM; FM con mutaciones; masas; tutti terminal. El banco no se regeneró ni se transmitió al editar. El número de pieza sigue siendo06 aunque cierre después de09.

Los cambios de código son acotados: `rhythmicon` admite `vector on`, `to NOTE…` y `morph`; las opciones son inactivas por defecto y no cambian los labs antiguos. El vector viaja por el contexto del generador compartido. No se añaden DSP, dispositivos ni temporizadores de hardware. Todas las secciones mantienen `native off` y `laser off`.

09 conserva `attacca06` y sigue pendiente de convertirse en la canción triste definitiva. Las fuentes15/16/11 quedan intactas;0.1 se archiva como antecedente. El concepto de oósfera como potencial/activación se mantiene como interpretación artística, sin imponer un relato biológico al comportamiento de cada algoritmo. Antecedentes de investigación: [gametofito femenino](https://pmc.ncbi.nlm.nih.gov/articles/PMC3268550/) y [BBM1/partenogénesis](https://www.nature.com/articles/s41586-018-0785-8).

**Estado:** edición de score, implementación de las opciones necesarias y dossier. Sin tests, compilación, builds, audición, interfaz ni hardware. La respuesta de las doce voces al converger, el tamaño percibido deSPI y la continuidad real deben decidirse por escucha.
