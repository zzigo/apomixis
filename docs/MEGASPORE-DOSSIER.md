# 04. MEGASPORE / Megáspora — sueño de una pista

**Dossier de composición y realización · 0.3.0-draft.1 · 14 noviembre 2026**

Partitura: `scores/04-MEGASPORE-score.txt`. Base: `scores/11-ANTHESIS-score.txt`, conservada intacta. Duración propuesta: **360 s / 6′00″**, negra **128**, **192 compases de4/4**. El antiguo placeholder de405s se conserva en `archive/scores/megaspore/`.

## 1. Tesis

MEGASPORE es la pieza más pop y más onírica del ciclo. Quiere que el cuerpo encuentre un pulso antes de que el oído lo identifique como una consigna de baile. El órgano no imita una batería completa ni recibe un acompañamiento electrónico: sus tubos, diferencias de ataque, octavas y registros construyen una pista imaginaria.

La referencia techno organiza la energía: introducción que deja adivinar el suelo, crecimiento, primera meseta, subida, suspensión, regreso más denso, irrupción trance y final melódico en tutti. El tempo permanece fijo. La curva no depende de acelerar cada sección, sino de densidad, espectro, duración, ausencia del pedal y retorno del grave.

El carácter onírico nace de que ese suelo estable sostiene armonías que cambian de mundo sin resolver por dominante, arpegios cuyos ciclos no encajan todos a la vez y una misma escena que puede oírse desde centros distintos. Pop significa aquí legibilidad del gesto, expectativa compartida y un final que se puede recordar; no una cita de una canción ni un beat de muestra añadido.

## 2. De ANTHESIS a MEGASPORE

Se conservan la semilla3111, la expansión de arpegios entre manuales, los objetos armónicos grandes, los ataques repetidos, los registros por familias y el uso de huecos para hacer perceptible el regreso. Los acordes M1/M2 se toman literalmente de ANTHESIS y reaparecen como objetos intermitentes.

Se recompone su macroforma: las seis secciones del lab no se copian con otros nombres. El material se distribuye en quince estados de una dramaturgia de pista, con un break central y una llegada melódica nueva. ANTHESIS conserva su propia partitura para comparar.

La cita mínima de SPORE es su campo inicial **C,D,F,G,A / do–re–fa–sol–la**, convertido en una célula aguda breve en el II durante Seed memory. Es una cita del vocabulario del score, no una transcripción de una salida aleatoria del autómata. Aparece una sola vez; el resto del tiempo la pieza sigue su lógica propia.

## 3. Macroforma y energía

| Estado | Tiempo | Compases | Suelo y transformación |
|---|---:|---:|---|
| A · Hypnagogia | 0–30s | 16 | Mi menor; cuatro figuras lentas, golpes graves incompletos |
| B · Seed memory | 30–60s | 16 | Se hace continuo el pulso; cuatro arpegios y cita de SPORE |
| C1 · First floor | 60–90s | 16 | Primera meseta en mi menor; objetos cortos a contratiempo |
| C2 · Mediant | 90–120s | 16 | Sol mayor; expansión de color sin cadencia dominante |
| D1 · Lift | 120–135s | 8 | Si mayor; aumenta la repetición y la densidad |
| D2 · Lift | 135–150s | 8 | Sol menor; presión, después un breve vacío |
| E · Dream break | 150–180s | 16 | Mi mayor; desaparece el bombo, se alargan las figuras, un compás vacío al final |
| F1 · Drop | 180–210s | 16 | Do menor; vuelve el pedal y se ensancha el enjambre |
| F2 · Drop | 210–240s | 16 | Mi menor; masa de ANTHESIS y arpegios expandidos |
| G · Polytonal canopy | 240–270s | 16 | Mi menor y si♭ mayor/lidio simultáneos |
| H · Trance flash | 270–300s | 16 | Primera entrada de74/75; notas repetidas del IV |
| T1 · Heterophonic spiral | 300–315s | 8 | Dos vueltas de la melodía tutti y sus variantes desplazadas |
| T2 · Third time / Ignition | 315–330s | 8 | Tercera vuelta: vuelven pedal, cuatro arpegios y politonalidad sobre la melodía |
| T3 · Overdrive / Dream rave | 330–352,5s | 12 | Masas de ANTHESIS, tresillos contra rectas, repetición del IV y melodía dentro de la masa |
| T4 · Apex | 352,5–360s | 4 | Pulso doble, arpegios altos, IV a1/64, heterofonía densa; corte en máxima energía |

La forma elegida es una propuesta compositiva, no una duración fijada previamente por el compositor. Las divisiones de15/30s son múltiplos completos de ocho/dieciséis compases a128BPM. El break no acelera ni detiene el reloj: retira el peso que permitía sentirlo.

## 4. Pedal como bass drum

El gesto de bombo se escribe con dos teclas, no con un cambio continuo de frecuencia ni un sintetizador añadido:

```text
bind midinote 36|24 dur 0.04|0.96 ms 12|85 div pe
```

Por negra, una nota una octava más alta solicita un ataque de12ms; aproximadamente18,75ms después entra la fundamental32′ durante85ms. Las transposiciones siguen las raíces armónicas y permanecen dentro del pedalero. La pareja funciona como un pequeño descenso de energía registral: ataque breve, después peso grave y espacio libre antes del siguiente golpe.

Los programas anteriores al tutti usan los dos fondos32′ del pedal,1 y2. En A el patrón está incompleto; en E desaparece; en F vuelve. En T1 el pedal participa en la melodía tutti, plegada por octavas a su tesitura. Desde la tercera vuelta, a315s, vuelve el gesto de bombo; en los últimos cuatro compases duplica su pulso a corcheas. El cierre transforma el canto colectivo en una nueva irrupción de pista.

El resultado de bass drum es una intención de escritura. El ataque del tubo, la acústica y el perfil mínimo de duración MIDI configurado pueden alargar o enmascarar el transitorio. No se afirma una respuesta física de12ms verificada; la partitura no modifica esos límites ni los anula.

## 5. Cuatro manuales arpegiando

AGO/APO/ARE/ASO son cuatro patrones explícitos, asignados a I/II/III/IV. No se confía su presencia a una selección aleatoria de manual. Comparten campo armónico pero no exactamente orden de alturas, octava ni sucesión de duraciones. Las figuras más rápidas tienen ataques cortos y aire entre notas; los ciclos de tres y ocho posiciones producen un desfase interno sobre el pulso común.

Las voces de la introducción y del break se vuelven más lentas. En los drops se superponen arpegios adicionales de ANTHESIS distribuidos entre los cuatro manuales, con expansión temporal por voz. Ese nivel de densidad no reemplaza el piso: flota sobre él. En Trance flash, el IV abandona su arpegio para concentrarse en la repetición; I–III conservan sus figuras.

## 6. Enlaces de mediantes y politonalidad

El recorrido de raíces hasta la segunda meseta es:

```text
E minor → G major → B major → G minor → E major → C minor → E minor
           +m3        +M3       −M3       −m3        −M3        +M3
```

Los cambios no se explican por una cadena de dominantes: cada tercera modifica la luz y, a veces, también el modo. Las notas comunes o próximas conservan una huella del campo anterior. Los objetos M1/M2 añaden extensiones y tensiones sin reducir la pieza a tríadas desnudas.

En G, I y III permanecen en mi menor mientras II toca si♭ mayor e IV si♭ lidio. El pedal insiste en mi. No se alternan dos acordes como pregunta y respuesta: dos centros coexisten dentro del mismo tiempo corporal. La relación mi/si♭ introduce una sombra de tritono antes del campo simétrico final.

## 7. Reserva del IV:74 y75

Los registros **74 / Tuba magna** y **75 / Tuba** están ausentes de todos los programas anteriores a270s. El IV participa antes con73. En Trance flash se retira73 y entran74/75, por primera vez como acontecimiento tímbrico reconocible.

La línea del IV repite una sola tecla por bloque, sobre **E5–G5–Bb5–C#6**, con cambios de tecla más lentos que los ataques. La retícula1/32 a128BPM solicita un ataque cada58,59ms en los lugares ocupados y duraciones de22ms. Acentos y huecos impiden una continuidad plana. Es el lugar más próximo a un trance psicodélico de órgano; su brillo no se gasta al comienzo.

Desde T1,74/75 se integran al tutti completo y a su melodía; en T3/T4 recuperan también la repetición rápida del IV. La reserva es temporal, no una prohibición de que esos registros canten después de su entrada.

## 8. Melodía final, ritmo y heterofonías

La escala de referencia es la octatónica **semitono–tono desde mi**:

```text
E F G Ab Bb B C# D
4 5 7 8 10 11 1 2  (clases de altura)
```

La primera línea es:

```text
E4 F4 G4 Ab4 B4 Bb4 Ab4 G4 F4 E4 C#5 D5 B4 Ab4 F4 E4
```

Sus dieciséis notas ocupan32corcheas: cuatro compases, con valores de media corchea, corchea, figuras de tres unidades y una nota final larga. El segundo estado recorre el campo desde arriba con otra sucesión de duraciones, conservando la misma longitud de frase. Las dos primeras vueltas ocupan300–315s. La tercera, a315s, dispara la vuelta de la máquina rítmica; no espera al final del bloque ni añade un break. En T2 la línea principal sube una octava y convive con esa masa. La segunda figura melódica reaparece en T3 y T4 con otro ritmo. Hay suficientes apoyos para reconocerla, pero el ritmo alterna aceleraciones, suspensiones y acentos desplazados.

El pedido de un gesto entre gitano y jazzero se interpreta como fraseo ornamentado, cromatismo cercano, energía de danza y movilidad rítmica. No se presenta esta línea como cita ni como representación de una tradición particular; la escala octatónica es el material concreto de esta escritura.

La primera exposición se duplica en los cinco destinos del tutti, con plegado de octava para el pedal. II y III añaden dos versiones emparentadas, no dos transposiciones paralelas: cambian ciertas notas del contorno y desplazan los ataques unos58,6/117,2ms. Las variantes rozan con frecuencia la línea por segunda menor; además sobreviven los pequeños ornamentos locales. Las notas vecinas permanecen escritas explícitamente: no son errores aleatorios ni un efecto que desplace toda la melodía por semitono.

Desde315s la melodía sigue en los manuales, una octava más alta, mientras el pedal vuelve al pulso. I/III sostienen mi menor y II/IV si♭ mayor/lidio; el enjambre adicional permanece octatónico. Se conserva así una figura reconocible dentro de una politonalidad que vuelve a abrirse.

### La tercera vuelta y el final arriba

El pedido posterior del compositor cambia la dirección del cierre: no hay una coda que retire energía. T2 suma todos los arpegios, el kick y los mega-objetos a la tercera vuelta. T3 enfrenta1/16 y1/32 con ataques de1/24; el IV vuelve a repetir teclas, mientras las versiones heterofónicas atraviesan la masa. En T4 el pedal pasa a corcheas, el arpegio agudo se ensancha y el IV solicita1/64. Las dos variantes siguen deformando la melodía principal, con más presencia y sin abandonar sus diferencias de ataque.

El reloj sigue a128BPM. La aceleración percibida procede de subdividir, superponer y subir el registro, no de subir el tempo global. No se introducen ventanas `silence` en T2/T3/T4 ni una bajada de registración. La pieza corta a360s en plena energía, dejando la resonancia; las duraciones y los mínimos físicos reales siguen dependiendo de los adaptadores y del instrumento. En particular1/64 solicita unos29,3ms entre casillas: no es una certificación de respuesta de las tubas.

## 9. Realización en HYLON

El material escrito usa `bind`, `arp`, `chord`, `cell`, `silence`, macros `set` y familias `pgm`. La revisión0.3 añade un adaptador puro de interpretación para el VECTOR de esta pieza y un cue láser `hex`; no añade DSP ni backend SC. `native off` permanece en cada sección; el pulso no depende del autómata celular.

Los niveles de registración se agrupan para poder derivar los programas del número04 sin escribir números de memoria en la música. El tutti final es `pgm @tutti`, con registros hablantes, y los cambios se anuncian por el sistema de programas existente. La partitura no envía tiradores ni recupera la antigua estrategia de SysEx.

### VECTOR: crecimiento microscópico, forma intacta

`packages/hylon-algos/megaspore-vector.js` interpreta los mismos cinco controles sólo para esta pieza. No cambia los segundos de las secciones, el BPM, los programas ni el momento de entrada de74/75. Los cambios se aplican a nuevos eventos y quedan sujetos al transporte y a las salidas existentes.

| Control | Efecto en MEGASPORE |
|---|---|
| μ | Porcentaje de alturas melódicas variadas:15% × factor; de0 a45%. Desde×1 modifica aproximadamente2–3 de las16 posiciones de cada frase. Por encima de×1 también permite discretas variaciones de acento/octava en capas auxiliares. |
| δ | Anticipación/dispersión de las capas auxiliares entre−6 y+12ms; nunca mueve la melodía ni el pedal. |
| π | Brotes ocasionales, más suaves y a la octava, sobre arpegios/objetos auxiliares; no sobre la línea principal ni el bombo. |
| τ | Duración de notas auxiliares hasta±12%; no altera las duraciones de la melodía, sus hermanos ni el pedal. |
| ρ | Aclara o enriquece ligeramente la densidad auxiliar; no elimina ataques de la melodía ni cambia el pulso principal. |

**La nueva base musical es μ×1 =15%**, por pedido del compositor; los otros×1 conservan la textura escrita. μ×0 recupera las alturas literales del TXT. Esos15% se aplican a posiciones melódicas, no como errores independientes en cada manual: todas las copias de una misma nota comparten su cambio y las líneas heterofónicas conservan sus desviaciones respecto de ella. Los instantes, figuras, duraciones y acentos escritos de la melodía permanecen intactos.

No se impone una serie dodecafónica estricta. Se abre la escala original hacia las doce clases de altura en una pequeña parte de la línea. Se conserva el arranque de la frase y se da prioridad a variar su nota de llegada, evitando que las ocho vueltas terminen insistentemente en mi. La selección de posiciones y clases es determinista para semilla/frase/vector, con aproximadamente19 posiciones variadas de128 en la configuración15%.

El acompañamiento del último minuto se desplaza por el menor intervalo cromático hacia la clase de llegada de cada frase. Se desplazan juntos el eje principal, su contrapolo politonal y el pedal de kick: la relación entre centros se conserva, aunque ya no sea siempre mi/si♭. Es una adaptación por clase de altura de frase, no una rearmonización acorde por acorde de cada ataque. El pedal cambia de altura cuando corresponde; **su ritmo no cambia**.

### Láser: seis colores, secuenciador hexagonal

```text
laser hex src all step 0.1171875 turn 60 dur 0.045 field 100 signal 100
```

Cada ataque ilumina durante45ms el vértice correspondiente a la casilla1/16 del score. Las notas simultáneas comparten paso; el secuenciador recorre seis posiciones y no inventa un segundo pulso independiente. Cada vértice tiene un color fijo: rojo, amarillo, verde, cian, azul o magenta. El conjunto gira una vuelta por minuto según el tiempo del score y ocupa un campo abierto, limitado también por el offset y el warp existentes.

Entre ataques no quedan puntos de referencia encendidos. La representación conserva seis sitios fijos respecto del hexágono, no destinos XY aleatorios por nota. El cue pide100% de señal DAC y pulso de intensidad constante: no es una medición de potencia óptica. Los colores por trazo pasan al compilador de frames y al preview. Los puntos visuales conservan el pequeño anillo escaneado de MIDI loci; no se introduce una posición DAC iluminada e inmóvil.

El cue sólo cambia contenido mientras el operador mantiene preview/salida L en marcha y Score notes habilitado. No conecta, arma ni inicia el láser. La duración física de cada destello y su alineación dependen también de los paquetes de escaneo y sus ajustes; no se afirma exactitud de hardware comprobada.

## 10. Criterios de escucha pendientes

- El pulso debe sentirse corporalmente antes de hacerse evidente como patrón.
- El break debe conservar la expectativa sin un bombo sonando debajo.
- Los cuatro manuales deben aportar líneas diferenciables; aumentar densidad no debe borrar todas las articulaciones.
- Las mediantes deben cambiar el mundo armónico, no sonar como cambios arbitrarios de preset.
- El primer ataque de74/75 debe ocurrir en Trance flash y conservar valor de aparición.
- Las dos primeras vueltas deben fijar la melodía y permitir oír sus hermanos heterofónicos. Desde la tercera debe sentirse un regreso inequívoco de ritmo, arpegios y politonalidad.
- El último tramo debe crecer por subdivisión y registro, sin perder toda memoria del contorno; el corte debe llegar en máxima energía, sin coda descendente.
- μ debe variar aproximadamente15% de las posiciones sin mover ningún ataque ni duración de la melodía; las llegadas y el acompañamiento deben perder la insistencia en mi sin perder el contorno.
- El hexágono debe seguir los ataques en seis colores, conservar sus posiciones relativas y girar por tiempo de score; detener el score debe apagar sus pulsos.
- El transitorio del pedal, el perfil de ataques MIDI y la respuesta del órgano se decidirán por escucha; el éxito de una síntesis local no certifica la mecánica física.

**Entrega de fuente, sin ejecutar pruebas, compilación, build, interfaz ni hardware**, conforme a la regla de esta sesión.

## 11. Procedencia

- Revisión posterior del14/11/2026: tercera vuelta de la melodía como disparador de mega-tutti rítmico/arpegiado/politonal, más heterofonía y final arriba.
- Pedido inicial del compositor del14/11/2026: pieza más pop/onírica, danza no obvia, bass drum con pedal, cuatro manuales arpegiando, reserva74/75, forma techno, mediantes/politonalidad y melodía tutti semitono–tono con heterofonías.
- `scores/11-ANTHESIS-score.txt`: materiales de densidad, familias, mega-acordes y repetición; conservado intacto.
- `scores/01-SPORE-score.txt`: campo inicial0,2,5,7,9; cita mínima en Seed memory.
- `archive/scores/megaspore/04-MEGASPORE-placeholder-score.txt`: forma provisional anterior, conservada como antecedente.
