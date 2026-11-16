# 06. OOSPHERE / Oósfera — propuesta para el final del ciclo

**Dossier de composición y realización · 0.1.0-draft.1 · 14 noviembre 2026**

Partitura escrita: `scores/06-OOSPHERE-score.txt`,370s /6′10″,23secciones. Borrador pendiente de escucha, sin pruebas de ejecución.

Decisión del compositor: **09-MICROSPORE será la canción, delicada y triste; 06-OOSPHERE cerrará Apomixis después de ella**. Se conservan los números y los nombres de archivo. El número06 deja de indicar su posición de escucha. La curva estudiada fue autorizada y trasladada al TXT. El dossier distingue esa escritura realizada de su respuesta sonora, todavía no comprobada.

Fuentes locales leídas: `scores/15-BEFERA-score.txt`, `scores/16-HORVITZ-score.txt`, `scores/11-ANTHESIS-score.txt`, `scores/06-OOSPHERE-score.txt`, `scores/09-MICROSPORE-score.txt` y `archive/supercollider/06_Oosfera.scd`.

## 1. Qué es una oósfera y qué puede aportar

La oósfera es la **célula huevo o gameto femenino**, no el óvulo completo, la semilla ni un embrión ya formado. En las plantas con flor está dentro del gametofito femenino, alojado a su vez en el óvulo. En reproducción sexual, su fusión con un espermatozoide origina el cigoto; la fecundación de la célula central corresponde a otro proceso asociado, el del endospermo. [Síntesis de referencia sobre el gametofito femenino](https://pmc.ncbi.nlm.nih.gov/articles/PMC3268550/).

La célula huevo no es un recipiente meramente pasivo: en Arabidopsis, proteínas EC1 secretadas por ella participan en la activación de los espermatozoides. [Sprunck y colaboradores,2012, investigación original](https://pubmed.ncbi.nlm.nih.gov/23180860/). En arroz, expresar BBM1 en la célula huevo puede iniciar partenogénesis, sin fecundación; eso no equivale por sí solo a reproducir todas las condiciones de una semilla clonal. [Khanday y colaboradores,2019, investigación original](https://www.nature.com/articles/s41586-018-0785-8).

La traducción musical propuesta es **potencia organizada → señal → activación → coexistencia → una forma que puede continuar**. No se ofrece como simulación del proceso celular. El fin del ciclo puede ser el comienzo de otra generación, sin necesitar ni una carrera final de velocidad ni una cadencia tonal que explique todo.

Esto diferencia el nuevo final del de MEGASPORE: aquella pieza culmina por baile, subdivisión, registro y sobrecarga. OOSPHERE podría culminar por **integración y peso**: al final aparecen juntos materiales que antes se habían oído como cuerpos separados.

## 2. Qué hay realmente en los archivos actuales

| Fuente | Estado y contenido | Lo que sirve para06 |
|---|---|---|
| 06-OOSPHERE TXT | Borrador compuesto de370s/23secciones; placeholder anterior archivado | Partitura activa del cierre |
| 06_Oosfera SC | Cámara latente en III/IV/P; hasta tres intervenciones humanas puntuales | Idea de activación por acontecimientos escasos; no se presume implementado su arbitraje |
| 09-MICROSPORE TXT | Todavía placeholder de330s | El carácter de canción triste es una decisión nueva del compositor; no hay melodía final de la que extraer alturas todavía |
| BEFERA |284s:114s de bloques tímbricos y170s de síntesis espectral | Cuerpo principal, contrastes de materia y dirección armónica |
| HORVITZ |270s de procedimientos de tasas enteras | Un inicio de relojes independientes, sin copiar sus arcos de aceleración |
| ANTHESIS |Mega chords70s, Triumph20s | Una irrupción vertical y una afirmación final; no todo su enjambre de arpegios |

El origen Befera/Guidarini, Verrando y Romitelli está consignado en la cabecera del lab. Aquí se analiza su realización local, no se afirma haber verificado el artículo original ni una transcripción de aquellas obras. Lo mismo vale para HORVITZ: el lab declara procedimientos inspirados en Horvitz/Cowell/Tenney, no citas literales de los estudios.

## 3. BEFERA tiene una curva propia que conviene conservar

### Primera parte: distinguir cuerpos —114s

```text
ap → s+p+i → s+r → s+p+i → r → s+r → r → s+p+i
```

- **ap:** ruido grave del pedal32′.
- **s:** línea A4–E5–A4–C#5 en un fondo tapado del III.
- **p:** dos objetos de C4 con segundas, tritonos y notas separadas por más de una octava.
- **r:** cluster E2,F2,F#2,G2,A2,Bb2 repartido entre III/II.
- **i:** impulsos sobre C5,F#5,C#6,G6, con desplazamientos de octava.

No es una subida uniforme de energía: los objetos vuelven, se interrumpen y permiten recordar qué cambió. Esa memoria de timbre es una alternativa útil a la ilusión de aceleración ya trabajada en el ciclo.

La segunda aparición de **s+r es F6**,79,5–85,5s dentro de BEFERA, y dura sólo6s. Es el sitio más claro para la transformación propuesta por el compositor: el material vuelve reconocible pero con otra organización temporal.

### Segunda parte: integrar un espectro —170s

Doce módulos parten de bandas de FM simbólica alrededor de D1 y descienden hacia relaciones sencillas:

```text
1:32 → 1:23 → 1:16 → 1:11 → 1:8 → 1:6
     → 1:5 → 1:4 → 2:7 → 1:3 → 3:7 → 1:2
```

Las duraciones son22,18,15,12,10,8 | 8,10,12,15,18,22s. La simetría temporal puede operar sin anunciarse como un arco perceptual de rapidez. El motor aproxima las bandas a semitonos del órgano; no produce un oscilador FM continuo ni parciales exactos microtonales.

Este proceso aporta una dirección que ANTHESIS por sí sola no ofrece: pasar de una materia espectral abierta a un objeto más organizado. Lo preservaría casi entero, incluido su tiempo para oír la transformación.

## 4. Qué tomar de HORVITZ sin repetir perceptual speed

Descartaría como base el A del lab con `accel1->12` y el B con glissandi y aceleración. Ya cumplieron otra función en el material del ciclo.

Tomaría el principio del Rhythmicon: **cada voz tiene su propio periodo constante**. Las alturas se sustituyen por el material de BEFERA. Tres posibles capas:

1. Primer plano muy escaso en A4/E5/C#5, ligado al objetoS.
2. Voces con C/Db/F#/B, ligadas a los objetosP.
3. En la vuelta de s+r, los seis sonidos del clusterR adquieren tasas distintas.

Sin rampas de tempo, sin glissando global y sin un aumento automático de voces que simule acelerar. Se oye alineación, separación y coincidencia entre relojes estables. El cambio principal es **qué notas coinciden y cuánto dura esa coincidencia**.

ParaF6, propongo mantener el gestoS y rhythmiconizarR con seis tasas constantes. Se conservaron los6s originales. La base elegida es6s, seis voces, modo armónico, sin aceleración ni arco: periodos6,3,2,1,5,1,2 y1s. Si la relación queda demasiado fugaz, su extensión será una revisión de escucha; no se aumentó aquí.

El inicio escrito dura36s. UsaA4/E5/C#5/A4/C5/F#5, seis voces repartidas entreI/II/III, base24s, modo armónico,700ms de duración, sin `arch`, sin `step` y con `accel1`. No suenan notas de pedal. Comparte registración de cuerdas/fondo con los primeros módulos espectrales, evitando un nuevo preset de inicio. La continuidad exacta con la última nota de MICROSPORE se decide cuando la canción exista; no usaría el si del placeholder como si fuera una cadencia aprobada.

## 5. ANTHESIS: elegir masa y decisión, no otro rave

### Mega chords

La secciónD del lab combinaM1/M3/M2/M4/M5, cambios de octava/transposición, arpegiado interno del acorde y cortes antes del siguiente. Es valiosa por su **verticalidad**. Se escribieron30s con cuatro objetos de FM simbólica sobreD1, relaciones1:6,1:4,2:7 y1:2. Así no vuelve a imponerse el mismo eje de mi de MEGASPORE. Se conserva el gesto de masas y el pequeño arpegiado interno0/12/0/25ms de ANTHESIS, ahora a negra60 y con un ataque cada4s: ocho masas en30s, más pedalD1 sostenido.

Evitaría superponerle otro enjambre veloz. El efecto grande puede venir de acordes claramente separados, mucho registro ocupado y variación en sus ataques internos. Una pausa corta entre masas permite que la sala termine de responder.

### Triumph

Tomaría sus20s como referencia de duración y la entrada completa de tubas y demás familias como llegada reservada para el final. El archivo usa una rueda de cuatro sonoridades, pero **no son sólo cuatro ataques**: su patrón se repite durante los20s. Si buscamos unos pocos acontecimientos conclusivos habrá que escribirlos expresamente.

La escritura final elige tres acontecimientos, a350,358 y366s, con relaciones1:4,2:7 y1:2. Sus duraciones son2,5/3,5/4s, en los cinco destinos del tutti. El último sostén alcanza370s; se retiran los eventos y queda la resonancia de la sala. Esa economía recuerda la activación puntual del dossierSC sin recuperar su runtime ni convertir el final en un protocolo biológico literal. Mantendría el nombre Triumph sólo como procedencia; musicalmente no tiene por qué ser una fanfarria feliz después de la canción triste.

## 6. Forma escrita —370s /6′10″

| Tramo | Tiempo | Procedencia | Función |
|---|---:|---|---|
| Cámara / potencial |0–36s | Rhythmicon de HORVITZ, retunado aS/P de BEFERA | Recibir la fragilidad de09; actividad interna sin urgencia |
| Diferenciación |36–150s | BEFERAF1–F8 completos | Hacer reconocibles ruido, seno, inarmonía, lengüetas e impulso |
| Activación interna |115,5–121,5s, dentro del tramo anterior | Segunda vuelta s+r /F6 | Mismo material, ahora con tasas independientes |
| Integración espectral |150–320s | BEFERAS1–S12 completos | Pasar de bandas separadas a un objeto armónico común |
| Irrupción vertical |320–350s | Mega chords, extracto/adaptación | La materia ya organizada ocupa todo el órgano |
| Umbral / comienzo |350–370s | Triumph, recomposición | Pocos acontecimientos completos, último sostén y resonancia |

Los370s adoptados no vienen del placeholder. La forma conserva los284s de BEFERA como cuerpo continuo, con la varianteF6 y la salida deS12 adaptadas. Las dos contribuciones de ANTHESIS no son piezas pegadas enteras: cumplen las dos últimas funciones del mismo proceso.

### BisagraS12 → masas: continuidad elegida

Se mantiene la apertura temporal deS12, pero se evita su extinción original: `cresc1->0.55`, `exp31->0.55`, probabilidad1->0.65. Las duraciones siguen800->4000ms, el arpegiado interno20->120ms y el pedalD1 permanece. El objeto1:2 deja un resto presente del que nace Mega chords, sin reiniciar por un vacío ni subir el BPM.

### Diez combinaciones, una decena

Para no desplazar las decenas de07/08/09, se agruparon registraciones vecinas de la parte espectral. El primer nivel se comparte entre la cámara yS1–S4: cuerdas, bordónII y voces de pedal; el pedal no entra musicalmente hastaS3. S5–S8 comparten el siguiente nivel de cuerdas/principales/flautas. S9–S10 añaden mutaciones yS11–S12 mixturas. Los cuatro conjuntos de filtering se conservan, y las dos llegadas finales completan diez conjuntos distintos.

Con el reparto actual,06 está pensada para60–69:60 cámara/primer espectro;61 ruido;62 s+p+i;63 s+r;64 lengüetas/trémolos;65 siguiente espectro;66 mutaciones;67 mixturas;68 masas sin74/75/10;69 tutti completo con acoplamientos de ANTHESIS. Son una previsión de preparación de consola a partir de los conjuntos escritos; el banco no se regeneró ni se transmitió durante esta edición.

## 7. Comparación de candidatos

| Opción | Ventaja | Coste |
|---|---|---|
| HORVITZ extenso como columna | Sistema temporal claro, muchos cruces de voces | Repite el protagonismo de la velocidad y posterga las armonías preferidas |
| BEFERA prácticamente sola | Unidad tímbrica y proceso espectral legible | Su final actual se retira; necesitaría una decisión explícita sobre cómo cerrar el ciclo |
| **BEFERA como cuerpo + HORVITZ injertado + ANTHESIS terminal** | Conserva lo mejor de cada fuente con funciones diferentes | Hay que componer con precisión la entrada desde09, F6 y la bisagra final |

Se adoptó la tercera. No necesita incorporar todos los recursos que ya existen. La pieza puede ser la que **termina de reunirlos**, sin ser la más veloz ni la de mayor número de notas.

## 8. Orden, versión y alcance de esta entrega

- Cierre: **09-MICROSPORE →06-OOSPHERE**, con archivos y números estables. El catálogo de HYLON/fast loaders/REMOTE adopta01,02,03,04,05,07,08,09,06 antes de los labs.
- `scores/09-MICROSPORE-score.txt` incorpora `attacca06`; su música sigue siendo el placeholder y no se declara compuesta la canción triste. Al reemplazarla debe conservarse el enlace si se mantiene esta continuidad de concierto.
- `scores/06-OOSPHERE-score.txt` reemplaza sólo el placeholder de06. El anterior queda en `archive/scores/oosphere/06-OOSPHERE-placeholder-score.txt`.
- Los labs15-BEFERA,16-HORVITZ y11-ANTHESIS permanecen intactos. No se cambian algoritmos, DSP ni temporizadores.
- Las23secciones usan el formato existente, con `native off`. Todos los cues de láser están enOFF; el score no conecta ni arma dispositivos.
- El nuevo orden de concierto no cambia el reparto numérico de los programas. No se modifica el orden histórico del SC archivado.

## 9. Criterios pendientes de escucha

- La cámara recibe la fragilidad de09 sin convertirla inmediatamente en un crescendo ni otra aceleración perceptual.
- El material deBEFERA sigue reconocible;F6 conserva las alturas deR pero sus coincidencias se oyen distintas.
- El procesoFM se entiende como transformación de materia, no como doce presets sin relación.
- S12 no se despide antes de la masa; los intervalos entre mega-acordes dejan oír respuesta y respiración.
- Las tres llegadas finales son inequívocas y la última relación1:2 alcanza el final sin pedir un rave adicional.
- Preparar los programas y escuchar sostén/articulación/colas en cada salida; ninguna afirmación acústica se deduce de esta edición.

**Edición de fuente y dossier. Sin tests, compilación, builds, audición, interfaz ni emisión de hardware.**
