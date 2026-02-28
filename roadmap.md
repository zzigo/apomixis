# Apomixis - roadmap de desarrollo

## 1. Diagnostico del material existente

- `APOMIXIS GENERATOR.scd` y `klais organ generator.scd` son, en la practica, el mismo boceto.
- El material actual sirve solo como prueba inicial de `Pbind`, transposiciones modales y un L-system simple.
- No existe todavia una arquitectura para:
  - macroforma de 9 piezas;
  - capas texturales fijas por manual/pedal;
  - procedimientos biologicos formalizados;
  - mapeo estable de registros, acoplamientos y pedales de expresion/crescendo;
  - exportacion sistematica de tempo-maps y metadata para una futura partitura.
- `klais1.maxpat` sugiere una organizacion historica por 5 manuales/capas (`1..5`), pero no expone una tabla clara de `CC` por registro.
- Los patches actuales muestran `noteout` y `pgmout`; no aparece un protocolo completo y verificable de stops por `CC`.
- El rango historico del patch (`36..97`, `36..69`) no coincide con la especificacion actual del proyecto. La nueva implementacion debe obedecer:
  - manuales: `midinote 24..84`;
  - pedalera: `midinote 24..55`.

## 2. Principio general de trabajo

La estrategia propuesta es separar el proyecto en dos niveles:

1. Un nivel de infraestructura reusable.
2. Un nivel de composicion pieza por pieza.

Esto evita repetir codigo, permite corregir el backend MIDI una sola vez y mantiene el ciclo compositivo legible.

Regla editorial confirmada:

- el lenguaje de salida para notas de partitura, instrucciones e interfaces del proyecto sera ingles;
- `Microspora` queda fijada como pieza final del ciclo.

## 3. Arquitectura propuesta de archivos

### 3.1 Infraestructura comun

- `ApomixisSetKlais.scd`
  - configuracion global;
  - nombre de puerto MIDI;
  - canales logicos y conversion a canales fisicos de SuperCollider;
  - rangos oficiales por manual/pedal;
  - backend de control de registros: `CC`, `Program Change`, `SysEx` o `scene recall`;
  - tabla de registros y acoplamientos;
  - envolventes de crescendo/expresion;
  - funciones de seguridad para limitar rango, densidad y velocidad de cambios timbricos.

- `ApomixisCore.scd`
  - funciones compositivas generales;
  - generadores de secciones formales;
  - libreria de procedimientos biologicos;
  - motor de modulacion metrica;
  - utilidades para comentarios/metadata;
  - exportacion de nodos de tempo y, si conviene, de archivos MIDI.

### 3.2 Piezas del ciclo

- `01_Esporo.scd`
- `02_Gameto.scd`
- `03_Meiosis.scd`
- `04_Megaspora.scd`
- `05_Polygonum.scd`
- `06_Oosfera.scd`
- `07_Filotaxis.scd`
- `08_ProtoEspora.scd`
- `09_Microspora.scd`

### 3.3 Exportes utiles para partitura / metaforma

- `exports/apomixis_tempo_nodes.csv`
- `exports/apomixis_metaforma.md`
- `exports/midi/` para renders de prueba por pieza

## 4. Modelo de ruteo MIDI propuesto

### 4.1 Canales logicos por layer

Se propone conservar 5 canales logicos principales, uno por layer:

- `1 = GRAND ORGUE`
- `2 = POSITIF`
- `3 = RECIT`
- `4 = SOLO`
- `5 = PEDALE`

En SuperCollider esto puede traducirse internamente a `0..4` si el backend lo requiere. La idea es separar:

- canal logico legible para composicion;
- canal fisico efectivo para envio MIDI.

### 4.2 Capas texturales fijas

- `LAYER 1 GO`
  - melodias, lineas en octavas, arpegios, perfiles lineales.
- `LAYER 2 PO`
  - textura armonica expresiva, arpegios, halos, relleno espectral.
- `LAYER 3 RE`
  - mezcla de 1+2, refuerzo melodico, tuttis y bronces.
- `LAYER 4 SO`
  - eventos unicos, soli, divergencias, contramelodias.
- `LAYER 5 PE`
  - eventos largos, basso continuo, cantus firmus, masas graves, FX con `32'`.

### 4.3 Control continuo

Propuesta logica para los tres pedales:

- `CTRL 11 = Crescendo global`
- `CTRL 12 = Expresion Man II`
- `CTRL 13 = Expresion Man III`

Importante:

- estos son canales logicos de control, no una afirmacion sobre el protocolo real del organo;
- `ApomixisSetKlais.scd` debe abstraer el backend para poder remapear luego a los canales/CC reales.

## 5. Convencion de comentarios en todos los .scd

Cada archivo debe ser profusamente comentado con dos etiquetas obligatorias:

- `MusStrat:`
  - describe la decision musical, formal, timbrica o ritmica.
- `Context:`
  - justifica la relacion con biologia, matematica, filosofia, historia cultural o el concepto general de apomixis.

Ademas, cada capa aparecera indicada de forma explicita:

- `// LAYER 1 GO`
- `// LAYER 2 PO`
- `// LAYER 3 RE`
- `// LAYER 4 SO`
- `// LAYER 5 PE`

Cuando varias capas entren como bloque:

- `// PO + RE`
- `// GO + PO + PE`

## 6. Meta-biologia del proyecto

La idea central no sera "reproduccion asexual" en sentido biologico literal, sino:

> reproduccion automata de comportamiento musical sin dependencia continua del gesto humano.

Para eso propongo formalizar 8 metodos META:

### META 1 - Inscripcion clonal

Un gesto minimo deja una traza que se replica sin interprete.

### META 2 - Mutacion somatica acumulativa

La variacion no viene de un tema nuevo sino de pequenas desviaciones heredables.

### META 3 - Dispersion vectorial

Eventos, registros o perfiles ritmicos se distribuyen como esporas o granos bajo distintos vectores.

### META 4 - Inhibicion local

Una activacion impide otras cercanas. Base para filotaxis, mosaicos y espaciado no periodico.

### META 5 - Latencia y germinacion por umbral

Materiales aparentemente inertes se activan al superar densidad, energia, tiempo o registro.

### META 6 - Reduplicacion sin reduccion

Inspirado en la "meiosis invertida": en lugar de simplificar, el sistema expande.

### META 7 - Camara autonoma

El material se auto-sostiene desde un interior: saco, nucleo, oosfera, camara embrionaria.

### META 8 - Antropomixis

La apomixis se modula con energia humana puntual o continua:

- voz;
- improvisacion;
- ventanas 50/50;
- intervenciones raras y localizadas.

## 7. Procedimientos transversales y sus 4 variaciones

Los 6 procedimientos del ciclo seran estables, pero cada uno tendra 4 variaciones biologico-algoritmicas.

### Variaciones compartidas

- `V1 Clonal branching`
  - L-systems, reglas de reescritura, ramificacion determinista o semi-determinista.
- `V2 Somatic drift`
  - random walk acotado, Ornstein-Uhlenbeck, mutacion gradual de pitch, duracion o registro.
- `V3 Dispersive kernel`
  - Levy flight, log-normal, colas largas, distribuciones de dispersion no gaussianas.
- `V4 Inhibitory packing`
  - Poisson-disk, ventanas refractarias, exclusion local, phyllotaxis y empaquetamiento.

### Procedimiento A - Generative inscription in automata and random forms

- `V1`: gramatica de gestos
- `V2`: deformacion heredable del gesto
- `V3`: esparcimiento del gesto en registros y tiempo
- `V4`: aparicion del gesto solo si hay suficiente separacion local

### Procedimiento B - Massively varied transition

- `V1`: transicion por proliferacion de copias
- `V2`: transicion por deriva continua
- `V3`: transicion por saltos dispersivos
- `V4`: transicion por sustitucion de zonas inhibidas

### Procedimiento C - Hyperclarity against hypercrystallinity

- `V1`: cristal por iteracion exacta
- `V2`: claridad erosionada por micro-mutacion
- `V3`: cristal roto por dispersion asimetrica
- `V4`: claridad por vacios y exclusion local

### Procedimiento D - Canonical disproportion

- `V1`: canon clonal escalado
- `V2`: canon con deriva de intervalo y tempo
- `V3`: canon descentrado por kernels de retraso
- `V4`: canon horadado por inhibicion y huecos

### Procedimiento E - Multi-temporality

- `V1`: ramas temporales paralelas
- `V2`: aceleracion/deceleracion por drift
- `V3`: tiempos con colas largas y rarefaccion
- `V4`: capas que solo pueden reingresar tras refraccion

### Procedimiento F - Sound masses filtered by convolution

- `V1`: masas como multiplicacion clonal de grano
- `V2`: masas con erosion somatica
- `V3`: masas como nube dispersiva
- `V4`: masas punteadas por huecos inhibidos

## 8. Macroforma comun por pieza

Forma base propuesta:

1. `Introduction`
2. `Replication`
3. `Bridge`
4. `Climax`
5. `Coda`

Regla compositiva:

- `Introduction`
  - conducta minima;
  - una sola accion, gesto o bucle;
  - puede ser mono-sonido o tutti, pero siempre con insistencia unica.
- `Replication`
  - desarrollo del gesto inicial;
  - hasta 8 layers internos de actividad distintiva.
- `Bridge`
  - zona de transferencia, recombinacion o vaciamiento.
- `Climax`
  - punto de mayor densidad, mayor friccion o mayor expansion.
- `Coda`
  - residuo, memoria, germen o agotamiento.

Reservo 2 excepciones formales tentativas:

- `Filotaxis`
  - bridge absorbido por el climax para mantener el impulso presto.
- `Microspora`
  - introduction muy reducida, casi absorbida por la entrada vocal.

## 9. Reparto preliminar de las 9 piezas

| # | Pieza | Dur. aprox | Regimen | Idea central |
|---|---|---:|---|---|
| 1 | Esporo / La planta | 5:00 | Automata | dispersion sin destino fijo |
| 2 | Gameto / El grano | 4:30 | Automata | encuentro suspendido, polaridad retenida |
| 3 | Meiosis / Flor | 5:30 | Anthropomixis III | 50/50 entre ventanas de impro y generacion |
| 4 | Megaspora / Espora | 6:45 | Automata | pieza larga, onirica, expansiva |
| 5 | Polygonum / Saco embrionario | 5:30 | Anthropomixis II | improvisacion libre guiada, sistema responsivo |
| 6 | Oosfera | 4:30 | Anthropomixis IV | maximo 3 eventos humanos puntuales |
| 7 | Filotaxis | 4:00 | Automata | presto corto, full tutti, inhibicion local |
| 8 | Proto-espora | 4:45 | Automata | potencia sin direccion, latencia y germinacion |
| 9 | Microspora / Grano de polen | 5:30 | Anthropomixis I | voz + pitch follower ornamental, cierre confirmado |

Duracion total estimada: `46:00`.

## 10. Reparto preliminar de procedimientos por pieza

### 1. Esporo

- foco: dispersion vectorial, inscripcion generativa, multi-temporalidad
- color: GO + PO + PE

### 2. Gameto

- foco: hiperclaridad contra hipercristalinidad
- color: PO + RE, tensiones suspendidas, encuentros que no llegan

### 3. Meiosis

- foco: canonical disproportion, reduplicacion sin reduccion
- intervencion humana:
  - ventanas alternadas de improvisacion;
  - el sistema absorbe y redistribuye materiales del performer.

### 4. Megaspora

- foco: masas filtradas por convolucion, temporalidad dilatada
- funcion especial:
  - pieza mas larga;
  - pieza mas onirica del ciclo.

### 5. Polygonum

- foco: camara autonoma, capas responsivas
- intervencion humana:
  - improvisacion libre dentro de las 5 partes;
  - referencia a repertorios medievales y renacentistas.

### 6. Oosfera

- foco: autoactivacion, nucleo interior
- intervencion humana:
  - hasta 3 eventos;
  - cada evento cambia un regimen de capas o timbre.

### 7. Filotaxis

- foco: inhibicion local iterada
- funcion especial:
  - pieza corta;
  - presto full tutti;
  - maxima precision de espaciado y densidad.

### 8. Proto-espora

- foco: latencia, potencia contenida, activacion por umbral
- color: estacionario con germinaciones locales

### 9. Microspora

- foco: antropomixis vocal, prosodia, ornamento parasitario
- intervencion humana:
  - la voz dispara o modula el pitch-follower;
  - el sistema la parasita ornamentalmente sin imitarla de forma servil.

## 11. Anthropomixis: asignacion propuesta

Se proponen estas 4 piezas con intervencion humana:

- `Microspora`
  - voz + pitch follower ornamental;
  - cierre confirmado del ciclo.
- `Polygonum`
  - improvisacion libre guiada, en las 5 partes.
- `Meiosis`
  - 50/50 con ventanas de improvisacion.
- `Oosfera`
  - maximo 3 eventos humanos puntuales.

Razon de esta distribucion:

- deja 5 piezas de apomixis mas estricta;
- concentra la humanizacion en distintos grados de energia;
- permite que el final vocal aparezca como reingreso humano despues de una larga autonomizacion del sistema.

## 12. Instrucciones preliminares para la improvisacion humana

Esto se desarrollara por pieza, pero propongo como vocabulario base:

- organum paralelo y oblicuo;
- fauxbourdon;
- hocket;
- isorritmia local;
- tenores sostenidos;
- cadencias modales sobre finalis y repercussa;
- diminuciones y passaggi;
- alternancia entre canto llano ornamentado y articulacion seca.

En `Polygonum`, la improvisacion debe comportarse mas como si entrara en un ecosistema ya vivo que como si "dirigiera" el sistema.

## 13. Estrategia timbrica y de registros

### 13.1 Nivel abstracto

Cada pieza trabajara con:

- escenas de registros estacionarias;
- escenas transicionales;
- mosaicos micro-sonicos;
- acoplamientos selectivos;
- respiraciones por expresion/crescendo.

### 13.2 Nivel tecnico

Para no escribir codigo fragil ni asumir un protocolo falso, la capa timbrica se abstraera asi:

- `~stopBackend`
  - `\\cc`, `\\pc`, `\\sysex` o `\\scene`
- `~stops`
  - diccionario de registros por manual
- `~couplers`
  - diccionario de acoplamientos
- `~controllers`
  - crescendo y expresiones
- `~scenes`
  - presets texturales reutilizables

### 13.3 Criterio compositivo

Los cambios timbricos posthumanos no deben equivaler necesariamente a "encender/apagar registros por nota".

Propongo 3 escalas de cambio:

- `macro`
  - cambio de escena o combinacion;
- `meso`
  - mutacion gradual de 1 a 3 registros, acoples o expresiones;
- `micro`
  - movimiento de expresion, crescendos, acentos de pedal y superposicion de capas.

Esto permite complejidad textural alta sin depender de una velocidad mecanica irreal o peligrosa para el sistema del organo.

## 14. Estrategia de tempo y modulacion metrica

Objetivo:

- alrededor de `45` cambios de tempo distribuidos en el ciclo;
- todos codificados como modulaciones metricas proporcionales;
- exportables a un grafo de metaforma.

Modelo propuesto:

- cada cambio de tempo se guarda como un nodo con:
  - pieza;
  - seccion;
  - pulso origen;
  - pulso destino;
  - ratio;
  - bpm origen;
  - bpm destino;
  - comentario conceptual.

Promedio por pieza:

- `4 a 6` nodos de tempo.

Ejemplos de relaciones:

- negra = corchea con puntillo de quintillo
- corchea = tresillo de semicorchea
- blanca = negra de septillo

`ApomixisCore.scd` debe guardar estas relaciones en estructuras racionales, no solo en BPM sueltos.

## 15. Roadmap por fases

### Fase 0 - Validacion del marco

- aprobar este roadmap;
- confirmar asignacion de antropomixis;
- confirmar orden y duraciones;
- confirmar politica de excepciones formales.

### Fase 1 - Infraestructura Klais

Entregables:

- `ApomixisSetKlais.scd`
- abstraccion de backend MIDI
- tabla de canales, rangos y escenas base

Dependencia critica:

- protocolo real de registros/acoplamientos/crescendo (`CC`, `PC` o `SysEx`)

### Fase 2 - Core compositivo

Entregables:

- `ApomixisCore.scd`
- procedimientos META
- motor de secciones
- motor de tempo map
- exportes de metadata

### Fase 3 - Blueprints de las 9 piezas

Entregables:

- esqueleto de cada pieza con:
  - secciones;
  - layers dominantes;
  - escenas timbricas;
  - mapa preliminar de tempo;
  - comentarios `MusStrat` y `Context`.

### Fase 4 - Piezas automatas puras

Entregables:

- `01_Esporo.scd`
- `02_Gameto.scd`
- `04_Megaspora.scd`
- `07_Filotaxis.scd`
- `08_ProtoEspora.scd`

### Fase 5 - Piezas de anthropomixis

Entregables:

- `03_Meiosis.scd`
- `05_Polygonum.scd`
- `06_Oosfera.scd`
- `09_Microspora.scd`

### Fase 6 - Consolidacion para partitura y ensayo

Entregables:

- tempo graph data
- exportes MIDI por pieza
- escenas de registros consolidadas
- version comentada para lectura compositiva

## 16. Riesgos y bloqueos reales

### Bloqueo 1 - Mapa MIDI del organo

No tengo aun una tabla verificada de:

- `CC` por registro;
- `CC` o equivalente para acoplamientos;
- `CC` o equivalente para crescendo/expresion;
- si las combinaciones libres se controlan por `Program Change`, `SysEx` o ambos.

Sin eso, puedo escribir la abstraccion y placeholders, pero no el backend definitivo.

### Bloqueo 2 - Pitch follower de la voz

Hay que decidir si el seguimiento se hace:

- enteramente en SuperCollider;
- o reutilizando un front-end externo como `fidlo.maxpat`.

### Bloqueo 3 - Velocidad segura de cambios timbricos

Antes de automatizar mosaicos muy finos, conviene fijar un limite practico de:

- recalls de combinacion;
- cambios de stop;
- barridos de expresion/crescendo.

## 17. Decision editorial propuesta para seguir

Propongo trabajar en este orden:

1. aprobar/corregir este roadmap;
2. construir `ApomixisSetKlais.scd` con backend abstracto;
3. construir `ApomixisCore.scd`;
4. escribir primero 3 piezas ancla:
   - `04_Megaspora` como pieza larga onirica;
   - `07_Filotaxis` como pieza corta presto full tutti;
   - `09_Microspora` como cierre vocal;
5. usar esas 3 como calibracion del resto del ciclo.

## 18. Puntos a validar contigo antes de pasar al codigo del ciclo

- si aceptas la asignacion propuesta de las 4 piezas de anthropomixis;
- si quieres conservar exactamente este orden del ciclo;
- si tienes la tabla MIDI real del Klais para registros/acoples/pedales;
- `Microspora` queda fijada como cierre vocal del ciclo.
