# 07. PHYLLOTAXIS / Filotaxis · dossier conceptual y de sistema

> Tesis: la filotaxis es una regla de exclusión. Cada primordio nace donde el campo de inhibición de
> los anteriores es más débil, y dos hojas nunca ocupan el mismo lugar. *PHYLLOTAXIS* compone esa
> regla como una masa: un cluster total en el que cada tecla pertenece a un solo manual, y en el que
> cada manual cambia una tecla por vez, siempre hacia el lugar menos ocupado por las suyas.

Contexto en el ciclo: pieza `7` · `AUTO` · presto, inhibición / tutti · `GO PO RE SO PE` · 320 s.
Partitura: `scores/07-PHYLLOTAXIS-score.txt` (`HYLON-SCORE 1`). Nace del lab 18 RHIZOSPHERE
(2026-11-14, archivado en `archive/scores/labs/`), que se probó en el órgano y se pasó a la pieza.

---

## 1. Principio: unicidad entre procesos

Un solo proceso atraviesa toda la forma. La masa no se reinicia en los cambios de sección: los
algoritmos `mass` y `bands` se simulan una vez sobre un intervalo absoluto (`span`) y cada sección
emite las notas cuyo ataque le cae dentro; las duraciones cruzan las secciones. Por eso las 18
secciones de 3 s del trémolo de registración no vuelven a atacar el cluster.

| Regla | Botánica | En la pieza |
|---|---|---|
| Exclusión | dos primordios no comparten lugar | cada tecla C2–B6 tiene un solo dueño entre I II III IV |
| Conservación | la colonia clonal redistribuye recursos | lo que suelta un manual lo toma otro en su próximo cambio |
| Inhibición | el primordio nuevo aparece donde el campo es mínimo | el manual toma la tecla libre menos presionada por las suyas |
| Divergencia áurea | ángulo 137,5° entre primordios sucesivos | relojes con fases k·φ (mod 1) |

## 2. La masa (`mass`)

```
mass div manuals low C2 high B6 n 15~10 ms 70~100 period 200 span 0 295 out 210 295 stagger 60
```

- Comienzo: 4 × 15 = 60 teclas (C2–B6), repartidas al azar entre los manuales, atacadas dentro de
  los primeros 60 ms.
- Cambios: cada manual tiene su reloj, un cambio cada 70–100 ms. En un cambio suelta una tecla y
  toma otra; si la ventana se angosta solo suelta, si se ensancha solo toma.
- Ventana: una curva coseno de 200 s lleva de 15 a 10 voces por manual (mínimo a los 100 s) y
  vuelve a 15. La velocidad es inversa: a los 100 s, 100 ms; en los extremos, 70 ms.
- Salida: entre 210 y 295 s las voces de los manuales bajan a cero; acompañan el comienzo de la
  ondulación del pedal y desaparecen a las 04:55.

### 2.1 Inhibición y relojes áureos: probados y descartados

Se probaron dos refinamientos (parámetros `pick inhibit` y `clocks golden`, que siguen disponibles en
`mass`):

- Inhibición: el manual toma la tecla libre menos presionada por las suyas,
  $P_m(x) = \sum_{y \in S_m} 1 / (1 + (x - y)^2)$, y suelta la más presionada. Reparte cada manual de
  forma pareja (el mayor hueco entre teclas de un manual baja de 10,2 a 5,5 semitonos).
- Relojes áureos: fases $\{k\varphi\}$ y velocidades $\pm 6\,\%$ según la misma secuencia (teorema
  de las tres distancias, Sós 1958). Las razones de Fibonacci se descartaron antes: sacaban los
  cambios de la ventana 70–100 ms.

En el órgano, la inhibición cambió el carácter: al soltar siempre la tecla más amontonada y tomar la
más aislada, los clusters "salen y entran" en lugar de sostenerse macizos. Se volvió a la versión
del lab (elección al azar entre las libres, relojes libres con 7 ms de separación mínima, semilla
3181). Comprobado: las 7541 notas de los manuales que terminan antes de los 199 s son idénticas a las
del lab.

La lectura queda abierta: la regla de exclusión y conservación es filotáctica; la inhibición, que es
la otra mitad de la regla de Hofmeister, separa demasiado y deja de oírse como masa.

## 3. El pedal (`bands`)

- 120–262 s: clusters de teclas vecinas en C1–B1, de 2–3 teclas al comienzo hasta la octava
  entera, en franjas irregulares cada vez más largas (1,5 → 12 s) y con menos silencio (7 → 0 s).
  Los silencios entre franjas son parte de la forma y desaparecen hacia los 247 s.
- 255 s: el proceso de la octava entra por debajo de la última franja, con las mismas teclas. En el
  órgano no hay reataque: la salida MIDI une las notas superpuestas de una misma tecla. Así el fin
  de *Rhizosphere* (octava entera, últimos restos de los manuales, Contrebasse 16') no se corta.
- 260–290 s (desde 04:20): la octava se desarma tecla por tecla (orden sembrado) hacia un trémolo en
  el que las dos mitades (semitonos alternos) se turnan cada 300–360 ms, ondulando con período 6 s.
  Es una transición, no una yuxtaposición: a los 30 s ya no queda ninguna tecla sostenida.
- 290–320 s: péndulo. Un desplazamiento $\sin^2(\pi t / 20\,\mathrm{s})$ corre cada tecla k hasta
  $T \cdot k / (K-1)$: las mitades se deshacen en una onda que rueda por la octava y vuelven a
  juntarse en bloques.
- 300–320 s (05:00–05:20): rallentando escrito (`rall 20 3`). El paso se estira hasta ×3 (curva
  cuadrática) y cada tecla se desplaza al azar hasta ±40 % del paso, creciendo: el evento se alarga
  y se desordena. Medido: de 174 ataques en 290–300 s a 37 en 315–320 s (separación media de 57 a
  132 ms). Fin a 05:20.

Nota sobre el sampler K: sus voces duran como máximo 30 s y las muestras no tienen loop, así que en
K las teclas sostenidas más largas se apagan antes; en el órgano (MO) no hay ese límite.

## 4. Registración

| Programa | Registros | Uso |
|---|---|---|
| 70 | 73 40 23 1 2 56 | IV Seraphon 8' · II Bourdon 8' · I Bourdon 8' · III Voix céleste 8' · P Flûte 32', Soubasse 32' |
| 71 | 70 + 21 54 22 47 69 57 | I Flûte harmonique 8', Dulciane 8' · III Flûte harmonique 8', Cor de nuit 8' · trémolos II y III |
| 72 | 70 + 3 | P Contrebasse 16' |

90–144 s: trémolo de registración 71 ⇄ 70 cada 3 s (botones vecinos; el preview lo muestra como
bucle). III suena desde el comienzo con la Voix céleste; en 71 se le suman la Flûte harmonique y el
Cor de nuit con trémolo.

## 5. Láser

```
laser line span 0 320 color 1,0,0->1,1,1 curve log field 100 signal 100
```

Tamaño de campo y señal de intensidad al 100 % durante toda la pieza (el campo se limita a lo que
permite el offset guardado en el perfil).

Una línea vertical roja cruza el campo de izquierda a derecha durante toda la pieza. El verde y el
azul entran tarde, con la curva $(10^p - 1)/9$; al final la línea es blanca. Sigue el reloj de la
partitura (pausa, salto). La partitura nunca enciende el láser: solo da forma mientras el operador
tiene la vista previa o la salida en marcha y la ruta SCORE activa.

## 6. Público (apomixis.zztt.org)

Gesto previsto para 07: cada toque coloca un primordio en espiral áurea alrededor de un centro. No
controla nada; es testimonio. En el jardín, la masa crece como fragmentación y el pedal como rizoma.

## 7. Preguntas abiertas

1. Analítica: ¿qué distribución de huecos entre teclas de un manual se percibe como "pareja" en un
   cluster de 32' a 2'? La medida actual es solo sobre alturas MIDI.
2. Crítica: la exclusión vale en el teclado, no en el aire: los acoplamientos y las mutaciones
   superponen alturas reales entre manuales. ¿Dónde termina la unicidad, en la partitura o en la sala?
3. Especulativa: si la inhibición actuara también entre piezas, cada pieza del ciclo dejaría libres
   las alturas que la anterior ocupó más tiempo, una filotaxis de la obra entera.

## 8. Referencias

```bibtex
@book{hofmeister1868,
  author = {Hofmeister, Wilhelm},
  title = {Allgemeine Morphologie der Gew{\"a}chse},
  publisher = {Engelmann},
  address = {Leipzig},
  year = {1868},
  note = {regla de Hofmeister: el primordio nuevo aparece en el mayor espacio libre; páginas por verificar}
}
@article{douady1992,
  author = {Douady, St{\'e}phane and Couder, Yves},
  title = {Phyllotaxis as a physical self-organized growth process},
  journal = {Physical Review Letters},
  volume = {68},
  number = {13},
  pages = {2098--2101},
  year = {1992}
}
@article{reinhardt2003,
  author = {Reinhardt, Didier and Pesce, Eva-Rachele and Stieger, Pia and Mandel, Therese and Baltensperger, Kurt and Bennett, Malcolm and Traas, Jan and Friml, Ji{\v r}{\'\i} and Kuhlemeier, Cris},
  title = {Regulation of phyllotaxis by polar auxin transport},
  journal = {Nature},
  volume = {426},
  pages = {255--260},
  year = {2003}
}
@book{jean1994,
  author = {Jean, Roger V.},
  title = {Phyllotaxis: A Systemic Study in Plant Morphogenesis},
  publisher = {Cambridge University Press},
  address = {Cambridge},
  year = {1994}
}
@article{sos1958,
  author = {S{\'o}s, Vera T.},
  title = {On the distribution mod 1 of the sequence $n\alpha$},
  journal = {Annales Universitatis Scientiarum Budapestinensis de Rolando E{\"o}tv{\"o}s Nominatae, Sectio Mathematica},
  volume = {1},
  pages = {127--134},
  year = {1958}
}
```
