# MEIOSIS · La flor

**Apomixis, número III · dossier de composición y realización · 0.1.0-draft.1 · 12 noviembre 2026**

Estado: propuesta compositiva y primera implementación local, sin pruebas de ejecución. Modelo editorial: `dev/01_SPORE_dossier.md`; continuidad con `dev/02_GAMETE_dossier.md`. Este documento distingue el pedido del compositor, las decisiones de este borrador y las funciones que todavía faltan.

## 1. Tesis

MEIOSIS es la melodía: una línea que parece poder continuar indefinidamente, incluso cuando se interrumpe. Es también la flor: la atracción, la belleza y el ofrecimiento de una forma reconocible. La continuidad no depende de que siempre haya sonido; depende de que el oído siga esperando la próxima nota.

El pedido del compositor establece cuatro condiciones: una melodía cantabile con su antagónico; una línea larga, con luces y sombras; descansos y hoquetus rapidísimos, ultra staccato; y una llegada al cluster que se va agujereando tonalmente hasta dejar las notas de la melodía original con registración fija. La duración, las notas concretas y los nueve estados siguientes son decisiones **propuestas**, abiertas a composición posterior.

El final cambia la manera de recordar el tema. Al principio sus notas son sucesivas. Al final quedan simultáneas: el tiempo de la melodía se convierte en un objeto armónico. No reaparece una melodía nueva encima del cluster: la melodía ya estaba adentro y se revela quitando lo demás.

## 2. Lugar en Apomixis

SPORE trabaja la propagación de poblaciones; GAMETE, el grano y su impulso dirigido. MEIOSIS concentra la atención en una identidad melódica y en su transformación por encuentro con otra identidad. El motor musical no necesita heredar la genética ni el autómata de SPORE: usa su infraestructura de partitura, transporte y salidas, con algoritmos propios.

El archivo `archive/supercollider/03_Meiosis.scd` contiene una célula C–D–F–A en octavas y un protocolo ANTHROPOMIXIS III de ventanas humano/sistema. Esa célula se conserva como procedencia del nuevo tema. El archivo se consulta como documento histórico; SuperCollider no vuelve a ser el runtime.

El protocolo humano no se declara resuelto por esta implementación: el borrador TXT realiza automáticamente ambos materiales. Las tres ventanas humanas y la relación 50/50 del archivo siguen como cuestión de puesta en escena, con arbitraje y transferencia de control pendientes. No hay en este borrador un comando que entregue o retire el control del instrumento al intérprete.

## 3. Tema y antitema

### A · La línea ofrecida

```text
C4 D4 F4 A4 | G4 F4 E4 D4 | C4 E4 G4 Bb4 | A4 G4 E4 C4
2  1  1  4 | 2  1  1  2  | 2  1  1  4   | 2  1  1  4
```

Las duraciones son múltiplos de negra en `rate 1/4`. Son treinta negras más dos de respiración. La célula archivada abre el arco; A4 y Bb4 amplían su horizonte. El campo permite escuchar Fa mayor y su relativo Re menor, pero el final en C evita cerrar definitivamente sobre Fa. Esta ambigüedad sostiene la posibilidad de continuar.

Lo mozartiano se toma como claridad de perfil, equilibrio entre antecedente y respuesta y legibilidad de la identidad. Lo wagneriano aparece como aplazamiento, respiración amplia y sombra cromática. Son criterios de escritura, no citas ni un imitador de estilos históricos.

### B · La línea que oscurece

```text
A4 Ab4 G4 F#4 | F4 E4 Eb4 D4 | C#4 E4 G4 Bb4 | A4 Ab4 F#4 E4
2  1   1  4   | 2  1  1   2  | 2   1  1  4   | 2  1   1   4
```

B comparte la longitud y el ritmo de A para que puedan intercambiar segmentos, pero su primera dirección es descendente y cromática. El antagonismo no equivale a tocar más fuerte ni a sumar ruido. La misma respiración sostiene otra lógica de deseo y reposo.

En la primera exposición cada tema se oye separado. En la sinapsis, ambos coexisten con respiraciones distintas. Durante el cruce se intercambia un segmento contiguo interior; se conserva el comienzo y el final de la frase parental elegida. `shadow` decide qué progenitor conduce cada ciclo; `cross` regula cuánto material interior viene del otro. `drift` permite desplazamientos acotados de la frase completa.

La infinitud es una regla de continuación, no una duración informática ilimitada. El procedimiento puede prolongarse repitiendo frases y variando sus cruces; el borrador de ensayo termina a los 330 segundos. La actual macroforma reinicia el ciclo al entrar en una sección: una continuidad de frase sin reinicio entre secciones queda como refinamiento posterior.

## 4. Hoquetus y descanso

Hay dos escalas de silencio. La respiración separa las frases; el hoquetus perfora el interior de una nota larga. El oído sigue un contorno lento aunque su presencia física se reparta en pequeñas apariciones.

`hocket 0` conserva toda la nota cantabile. Entre 0 y 1, su primera parte permanece ligada y su tramo final se fragmenta. En 1, toda la duración se convierte en una trama de pulsos y huecos. Las alturas siguen siendo las del tema en curso: no se reemplaza la melodía por un arpegiador genérico.

La sección central usa una retícula de 1/128 a negra = 132: aproximadamente 14,2 ms por casilla. Entre el 65 y el 80 % de esas casillas se deja en silencio. Las duraciones solicitadas al transporte tienen un mínimo de 10 ms; el sistema no promete aperturas menores ni que la mecánica del órgano reproduzca cada pulso. En LOCAL AUDIO se añade una envolvente breve específica para esta articulación, sin alterar la de las demás notas.

La distribución entre GO, PO, RE y SO es sucesiva: una sola trama viaja entre manuales. El hoquetus no significa cuatro copias simultáneas de cada impulso. El pedal permanece libre en este borrador.

Las repeticiones y los huecos son deterministas para una misma semilla, algoritmo y posición de frase. La reverberación del espacio puede unir perceptivamente lo que los ataques separan. Las colas de FX son parte de la audición y pueden enmascarar los huecos; conviene decidirlas musicalmente en sala.

## 5. Macroforma candidata · 5′30″

| Estado | Tiempo | Gesto | Material y respiración |
|---|---:|---|---|
| I · Flower | 0–36 s | Presentación | A en GO, negra 60, respiración de dos unidades |
| A · Shadow | 36–72 s | Respuesta | B en RE, misma escala temporal |
| S · Synapsis | 72–108 s | Encuentro | A y B simultáneos, respiraciones de dos/cuatro unidades |
| X · Crossover | 108–156 s | Intercambio | Cruces interiores; aumenta la fragmentación y entra la distribución entre manuales |
| H · Hocket | 156–204 s | Máxima discontinuidad | Retícula 1/128, numerosos huecos, ultrastaccato itinerante |
| R · Long return | 204–246 s | Recuperación del arco | A vuelve a predominar; disminuye la fragmentación |
| C · Cluster | 246–276 s | Compresión del tiempo | C4–D5 cromático sostenido; empieza la registración fija |
| P · Perforation | 276–312 s | Sustracción tonal | Se retiran notas sin volver a atacar las restantes |
| O · Residue | 312–330 s | Memoria simultánea | Permanecen las alturas exactas de A; liberación final |

Los nueve estados caben en los atajos de macroforma 1–9 existentes. Son estados de esta propuesta, no una afirmación de que la meiosis celular tenga nueve fases equivalentes.

## 6. Cluster, agujeros y registración fija

La entrada es un cluster de quince alturas, C4 a D5 inclusive. El conjunto protegido es:

```text
C4 D4 E4 F4 G4 A4 Bb4
60 62 64 65 67 69 70
```

Se protegen esas alturas MIDI exactas, no todas sus octavas. A partir de 276 s se retiran primero las notas ajenas a Fa mayor, después las notas diatónicas que no pertenecen a ese conjunto exacto. Dentro de cada grupo, la salida se ordena por distancia al centro del conjunto protegido, con desempate por altura. Son ocho liberaciones espaciadas; la última ocurre a 312 s.

Las notas protegidas se atacan a 246 s y continúan hasta 330 s. Cambiar de C a P y de P a O no debería reatacarlas: las tres secciones describen el mismo proceso absoluto. Un salto del transporte reconstruye solamente las notas que aún deben estar presentes, con su duración restante. Detener el transporte o usar PANIC conserva la autoridad de interrumpirlo.

La propuesta tímbrica es RE / `corDeNuit8`, sin cambio durante C/P/O. Es un registro lógico de la síntesis local. **No es un envío automático de tiradores, SysEx ni una garantía de correspondencia con los bancos Klais.** En MIDI OUT se mantiene el canal fijo de RE = 3 y la registración física debe prepararse en la consola. La regla general del proyecto sigue siendo manuales I–IV = canales 1–4; pedal = 5.

LOCAL AUDIO y la API de notas MIDI permiten solicitar los 84 segundos del sostén. El sampler actual tiene grabaciones con decaimiento y una duración acotada; no hay un bucle de sostén verificado que garantice ese resultado. El borrador no fabrica loops ni disfraza esa limitación con reataques. La continuidad real del órgano y los límites del mecanismo siguen pendientes de escucha autorizada.

El residuo es un acorde que recuerda el vocabulario del tema; no conserva por sí solo su orden temporal. Una reexposición monódica final, si se desea, sería otra decisión compositiva: no está añadida aquí.

## 7. Traducción biológica

La flor nombra la dimensión escénica y afectiva. No se identifica toda la flor con el proceso celular de meiosis. Los términos biológicos funcionan aquí como un mapa de relaciones compositivas, sin pretender una simulación científica.

| Imagen | Operación musical propuesta |
|---|---|
| Dos líneas parentales | Tema y antitema, identificables antes del cruce |
| Sinapsis | Coexistencia y correspondencia entre posiciones de ambas frases |
| Recombinación | Intercambio de un segmento interior contiguo |
| Segregación | Distribución temporal de fragmentos entre manuales |
| Flor / atracción | Contorno cantabile, memoria, expectativa y respiración |
| Perforación tonal | Sustracción compositiva que revela un conjunto protegido |

La última operación es una licencia poética. No se presenta la sustracción de notas como explicación literal de la meiosis ni se confunde con apoptosis. La belleza tampoco es una consecuencia biológica calculada: es el problema de escucha que guía la pieza.

## 8. Realización en HYLON

```text
MEIOSIS-score.txt
  → compilador cerrado HYLON-SCORE
  → capa de algoritmos: melody / cluster
  → eventos de nota con tiempo, división, duración y articulación
  → transporte compartido
  → LOCAL AUDIO / KLAIS / MIDI OUT, seleccionados por el operador
```

`packages/hylon-algos/meiosis.js` concentra el parser y la generación musical, sin temporizadores, acceso a dispositivos ni autoridad de salida. `algos.js` delega allí los dos comandos nuevos; `layer.js` aporta ventanas temporales, límites del score y reconstrucción tras saltos. `packages/spore/text-score.js` reconoce esos comandos. Se conserva el contenedor actual de score y sus cinco voces; `native off` silencia las notas de SPORE. Su representación celular puede seguir visible: no es todavía la visualización de la flor.

La partitura real está en `apps/hylon/scores/MEIOSIS-score.txt`, disponible por el mismo catálogo TXT del editor existente. La copia versionada está en `scores/apomixis/meiosis/0.1.0-draft.1/score.txt`. Se entrega como borrador editable, sin JSON compilado publicado, sin crear otra aplicación ni un runtime SuperCollider.

### Comando de melodía

```text
melody C4 D4 F4 A4 dur 2 1 1 4 anti A4 Ab4 G4 F#4 rate 1/4 div re shadow 0 cross 0 hocket 0 legato 1.02 breath 2 vel 72
```

`dur` y `anti` deben tener la misma cantidad de elementos que la melodía; se permiten de 2 a 32 notas. `div` admite una división, lista separada por comas o `manuals`. `shadow`, `cross`, `hocket`, `rest`, `gate`, `legato`, `drift` y `vel` admiten rampas `inicio->fin`, evaluadas al comienzo de cada ciclo. `pulse` define la retícula del hoquetus; `breath`, el descanso final en unidades de `rate`; `tr`, una transposición fija. `gate` se aplica sujeto al piso temporal de 10 ms. No se ejecuta código desde el TXT.

### Comando de cluster

```text
cluster C4 D5 keep C4 D4 E4 F4 G4 A4 Bb4 pcs C,D,E,F,G,A,Bb origin 246 holes-from 276 holes-to 312 until 330 div re vel 64
```

Los tiempos de este comando son segundos absolutos del score. Al editar la macroforma deben actualizarse juntos en las tres secciones finales. `pcs` define la prioridad de sustracción; `keep` es la supervivencia exacta. No admite más de 36 semitonos de extensión. El límite de fin de score prevalece sobre el sostén solicitado.

## 9. Intérprete, público y luz

Una futura versión puede convertir las ventanas humanas del archivo en lugares de exposición, contradicción y memoria: el intérprete enuncia A; el sistema devuelve B o una recombinación; ambos negocian una línea larga antes del cluster. Hace falta componer esa negociación y definir cómo el runtime conoce quién tiene la palabra. No se ha implementado un detector automático de intención ni una cuota 50/50.

Para el público, la flor podría mostrar dos contornos parentales, pétalos que se abren con la respiración y discontinuidades que migran entre ellos. El final podría borrar elementos hasta conservar una geometría correspondiente a las siete alturas protegidas. Es una propuesta visual pendiente, no un viewer ya construido.

La partitura candidata lleva `laser off` en todas las secciones. La futura luz podrá seguir duraciones y ausencias mediante la interfaz de cues existente, siempre bajo control local. El score no conecta, arma ni inicia el DAC. El cluster no se traduce aquí en puntos láser estacionarios.

## 10. Decisiones abiertas y criterios de aceptación

Antes de fijar una versión de concierto quedan por decidir la duración, el tema definitivo, la cantidad de cromatismo, la registración física final y el papel del intérprete. También si la última liberación debe ser simultánea, escalonada o abrir hacia el siguiente número.

Cuando el compositor solicite una sesión de pruebas, los criterios son:

- A debe reconocerse antes de la fragmentación; B debe ser un antagonista perceptible, no sólo otra transposición.
- El hoquetus debe contener silencios reales y permitir seguir el contorno lento.
- La semilla y la posición temporal deben reproducir los mismos fragmentos, sin ráfagas de recuperación tras un salto.
- C/P/O deben conservar la misma registración; sólo salen alturas durante la perforación, sin reataques en los límites normales.
- A 312 s deben quedar exactamente 60, 62, 64, 65, 67, 69 y 70; un salto a O debe reconstruir ese residuo.
- STOP y PANIC deben liberar las notas propias y conservar las reglas compartidas de salida.
- La sostenibilidad del cluster y la legibilidad del ultrastaccato deben decidirse escuchando cada destino; un éxito en síntesis no certifica el órgano.

Estos son criterios pendientes, **no resultados obtenidos**. Por instrucción de la sesión no se ejecutaron tests, builds, comprobaciones de interfaz ni pruebas de hardware.

## 11. Procedencia

- Pedido del compositor del 12/11/2026: melodía infinita, hoquetus, belleza/flor, antagonismo, línea larga y cluster agujereado con registración fija.
- `dev/01_SPORE_dossier.md`: modelo de dossier y lectura micro–macro; sus diagramas históricos SC/OSC no describen el runtime actual.
- `dev/02_GAMETE_dossier.md` y `docs/GAMETE-DOSSIER.md`: continuidad del trabajo de Antigravity y del lenguaje de algoritmos independientes.
- `archive/supercollider/03_Meiosis.scd`: célula C–D–F–A y protocolo humano/sistema archivado.
- Código local actual: `packages/hylon-algos/`, `packages/spore/`, `packages/hylon-runtime/`, `apps/hylon/`. Lectura de fuente, no certificación de funcionamiento.
