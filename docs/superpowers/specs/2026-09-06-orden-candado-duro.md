# El orden deja de ser un aviso y pasa a ser un candado — diseño

Fecha: 2026-09-06 · Autor: Hermes · Pedido por Fernando en chat.
Base: `origin/main = 330b52a` (PR #115). Rama: `feat/entrenamiento-orden-candado`.

## 1. Qué pidió Fernando (literal)

> importante si yo no he visto el anterior módulo y completado no se puede liberar el otro para mantener el proceso de que no te puedes saltar el paso, actualmente sale no disponible pero igual me permite entrar. Debe salir el mensaje indicación **No te saltes el paso** y mantiene toda la filosofía del entrenamiento.

Hoy `gradienteAbierto()` bloquea las ESCRITURAS (marcar, responder, guardar conceptos) y la pantalla pinta "🔒 No disponible hasta que…", pero **el módulo se abre y se lee completo**. La frase actual lo dice en voz alta: *"Puedes leer este texto igual: el método dice devuélvete, no te prohíbe mirar."*

**Decisión de Fernando (2026-09-06): eso cambia.** Un módulo cuyo anterior no está estudiado **no se abre**: se muestra una puerta cerrada que dice *No te saltes el paso* y manda al módulo que falta.

Es un cambio de política deliberado y contradice la decisión de #111 ("leer siempre se puede"). Manda Fernando: el dueño del entrenamiento decide su rigor.

## 2. Alcance exacto

Cambia para quien tiene el módulo **en su plan**, cuando está **cerrado por orden** y **no lo ha marcado nunca**:

```js
const esSuyo = m.roles.includes(rol)            // NO es `esAlumno`: ver abajo
puertaCerrada(esSuyo, gradienteAbierto(m, progreso), progreso[m.id])
```

- **Corrección sobre el borrador (encontrada en el navegador, no en el papel):** la puerta NO puede depender de `esAlumno`, porque `esAlumno` es `!modoRevision && m.roles.includes(rol)` y `?revisar=` lo apaga. `of-met-3` está en el plan de la Administradora **y** en el de la Asistente, y la Administradora le firma a la Asistente: con `…/of-met-3?revisar=asistente` la página la trataba como revisora y le abría un módulo que ella todavía no puede estudiar. **Se saltaba su propio orden con un parámetro en la URL.** La puerta se decide con "el módulo está en mi plan", que ninguna URL cambia. Leerlo como jefa entrenadora no exime: le toca estudiarlo igual, y en orden. Revisar un módulo **ajeno** (p. ej. `of-zoh-1`, solo de la Asistente) sigue abierto, que es su trabajo.
- `gradienteAbierto(m, progreso)` = el módulo anterior está estudiado (`tourVistoAt && quizAprobadoAt`).
- `!p?.tourVistoAt` = **red de seguridad de progreso**: quien ya marcó ese módulo alguna vez (progreso viejo, o el anterior se reabrió) puede releerlo siempre. Cerrarle un módulo que ya estudió sería un candado nuevo sobre trabajo hecho.

**No cambia nada** para:
- el **jefe entrenador** que revisa un módulo que **no está en su plan**: lee todo, sin candado — necesita prepararse la maniobra;
- **gerencia, supervisor y coordinador sin plan propio**: `m.roles.includes(rol)` es falso para ellos, así que nunca ven la puerta;
- los **módulos de papel** (`roles: []`): su salida es la hoja imprimible, ya resuelta antes de esta rama;
- el **glosario** (`/oficio/glosario`): es transversal, no es contenido de un módulo;
- las **guardas del servidor**: siguen exactamente como están (fail-closed). La pantalla ahora dice lo mismo que el servidor ya aplicaba.

## 3. La puerta cerrada (pantalla)

En `app/centro/[id]/entrenamiento/oficio/[modulo]/page.js`, **antes** de calcular láminas, conceptos, pasos y de llamar `cargarConceptos`:

```
{volverAlHat}
label:  Entrenamiento en Cubierta · ALOHA · {curso} · Módulo {orden} de {plan.length}
h1:     {m.titulo}
tarjeta .ofi-puerta (role="note"):
  🔒  No te saltes el paso
  "Este módulo se abre cuando termines «{anterior.titulo}». No es un trámite:
   cada módulo se apoya en el anterior, y entrar antes de tiempo es justo lo que
   hace que después no entiendas y lo dejes."
  "Termina el que falta y este se abre solo."
  [Ir a «{anterior.titulo}» →]   [Volver a mi plan]
```

- El contenido del módulo (bloques, láminas, conceptos, quiz, maniobra, presentación hablada) **no se renderiza**: no viaja al navegador.
- `anterior = moduloOficio(m.requiere[0])`. Hoy **ningún** módulo tiene más de un `requiere` (verificado) y solo `of-met-1` no tiene ninguno, así que la puerta siempre puede nombrar el módulo que falta. Si algún día un módulo declara varios requisitos, se nombra **el primero no estudiado** y se listan los demás; si `anterior` no existiera, la puerta cae al texto genérico "el módulo anterior de tu plan" y el botón lleva al plan.
- `data-page-state="bloqueado"` en el `<main>`, para que los tests de navegador lo detecten sin depender del copy.

## 4. La hoja del proceso (SOP)

`app/centro/[id]/entrenamiento/oficio/[modulo]/sop/page.js` es el procedimiento del módulo: contenido. Con el mismo `puertaCerrada` muestra la misma puerta (versión corta) en vez de la hoja. El revisor y el papel, sin cambios. Sin esto, el candado se esquiva con una URL.

## 5. El índice del plan

`app/centro/[id]/entrenamiento/oficio/page.js`, carril del alumno (`modo === 'entrenamiento'`):

- Cada fila calcula `bloqueado = !gradienteAbierto(m, progreso) && !progreso[m.id]?.tourVistoAt` con el **mismo helper** que la página (`gradienteAbierto` sobre los metadatos del plan, que ya traen `requiere`).
- La fila bloqueada: sigue siendo enlace (para que pueda ver POR QUÉ y no parezca que el sistema se rompió), con clase `ofi-fila--bloqueada`, el número sustituido por 🔒 y una píldora **"Se abre con el anterior"**.
- El párrafo del checksheet cambia: ~~"Leer siempre se puede; responder sus preguntas, no."~~ → **"Cada módulo se abre cuando el anterior queda estudiado. Aquí no se salta ningún paso."**
- El carril de revisión (`?revisar=`) mantiene su texto y no pinta candados: ahí no hay progreso.

## 6. Lo que se limpia (ramas muertas)

Con la puerta, el alumno **nunca** ve un módulo cerrado por orden, así que:
- `bloqueo(verbo)` y sus dos usos (`bloqueoMarcar`, `bloqueoResponder`) quedan sin sentido: se eliminan y `MasaOficio`/`MarcarEstudiado` reciben `bloqueado={false}`.
- `quizBloqueado` pasa a ser solo `esAlumno && !p?.tourVistoAt`, con motivo `QUIZ_SIN_LECCION`. La restricción de la portada por gradiente desaparece; la de la lección y la de la maniobra se quedan.
- El comentario de `responderQuizOficio` que dice "leer siempre se puede (el método dice devuélvete, no te prohíbe avanzar)" se corrige: ahora la pantalla tampoco deja leer, y la guarda del servidor es la red, no el aviso.
- Las **guardas del servidor no se tocan**: `marcarEstudiado`, `responderQuizOficio` y `guardarConcepto` siguen comprobando `gradienteAbierto`.

## 7. Pruebas

`test/entrenamiento-orden.test.mjs` (nuevo):
- `puertaCerrada` es una función pura exportada desde `lib/entrenamiento/oficio/guia-pasos.js` (`sin imports`): `puertaCerrada(esAlumno, abierto, progresoDelModulo)` → true solo con alumno + cerrado + sin `tourVistoAt`. Casos: alumno primer módulo (false), alumno con el anterior a medias (true), alumno que ya marcó ese módulo (false), revisor (false).
- Estáticos sobre la página: renderiza la puerta **antes** de `cargarConceptos` y antes de `BloquesOficio`; el SOP aplica la misma guarda; el índice pinta `ofi-fila--bloqueada`.
- El texto viejo ("no te prohíbe mirar", "Leer siempre se puede") no queda en ninguna fuente.
- Marca y vocabulario: la puerta entra al barrido de `entrenamiento-marca-oficio.test.mjs` (ya recorre `app/centro/**/entrenamiento/**`), así que su copy no puede traer vocabulario viejo ni imágenes marítimas.
- `entrenamiento-portada-oficio.test.mjs` se actualiza: la portada ya no pinta restricción por gradiente (el alumno no llega); sigue ligando la restricción del cuestionario con `tourVistoAt` y la de la maniobra con `estudiado()`.
- Navegador (base disposable): alumno nuevo entra a `of-met-3` → puerta, sin bloques ni quiz en el DOM; el botón lleva a `of-met-2`; el índice muestra 🔒 en los bloqueados; tras estudiar `of-met-2`, `of-met-3` abre solo; el revisor con `?revisar=` sigue leyendo todo; el SOP de un módulo cerrado también muestra la puerta.

## 8. Riesgo

Un alumno con el plan a medias verá cerrados los módulos que hoy podía ojear. Es exactamente lo pedido. La red de progreso (`!p?.tourVistoAt`) evita que alguien pierda acceso a algo que ya estudió.

## 9. Auditoría adversarial (3 auditores + verificación, 2026-09-06)

Catorce hallazgos revisados uno por uno contra el código; **doce confirmados, dos falsos positivos**. Corregidos en esta rama:

1. **La portada pintaba la restricción del cuestionario dos veces**: `PortadaModulo` ya deriva `RESTRICCION_QUIZ` sola, y la página le pasaba la misma frase. Ahora solo pasa la del orden (que solo puede darse en el camino de la red de progreso).
2. **La pantalla ofrecía un cuestionario que el servidor iba a rechazar**: quien entra por la red de progreso (`tourVistoAt`) con el anterior ya no estudiado tenía el quiz habilitado; `responderQuizOficio` lo rechaza por orden. `quizBloqueado` vuelve a mirar las dos condiciones y el motivo dice cuál falta.
3. **La puerta botaba al revisor fuera de su carril**: sus salidas perdían el `?revisar=`. Ahora el "volver" respeta `cola` en el módulo y en el SOP; el "ir al que falta" no lo lleva, porque esa acción es de alumno.
4. **Contraste**: `opacity: 0.62` sobre el enlace entero bajaba el título de 7,9:1 a 3,2:1, justo donde vive la única explicación. Se cambió por fondo + borde punteado + candado en lugar del número (no es solo color).
5. **El índice prometía el producto de un puesto cerrado** y su botón "Estudiar mi puesto" llevaba derecho a la puerta. Mientras esté cerrado se dice cuándo se abre y se manda al módulo que toca.
6. **El carril de revisión decía "puedes leer cada módulo completo"**, que dejó de ser cierto para los módulos compartidos. Ahora distingue: los que no están en tu plan, completos; los que sí, en tu orden.
7. **Comentarios caducos**: el de `responderQuizOficio` ("leer siempre se puede") y el del SOP, que describía una variable del borrador que no existe.
8. **Código muerto**: `bloqueado`/`motivoBloqueo` de `MasaOficio` y `MarcarEstudiado` y `bloqueoLeccion` de `PortadaModulo` ya no los pasa nadie; fuera con sus ramas.
9. **El barrido de marca no cubría el copy de la puerta** (`frasesDe()` solo mira literales de una línea y la puerta es texto JSX suelto). Se mide en `entrenamiento-orden.test.mjs` con su propio extractor.
10. **Un `requiere` mal puesto ahora es un muro permanente**: prueba nueva que recorre cada plan en orden acumulando progreso y exige que todos los módulos lleguen a abrirse. Hoy los cuatro planes pasan.

### Lo que NO entra, y por qué

- **La cola de firmas entrega los criterios de la maniobra de un módulo que la puerta le cierra al propio firmante** (módulo compartido que la Administradora aún no estudió, con la Asistente esperando firma). Confirmado. **No se bloquea aquí**: trabaría la operación del centro —una asistente lista se quedaría sin firma porque su jefa va más atrás en su propio plan— y eso es una decisión de Fernando, no una corrección técnica. Queda anotado para él.
- **Los mp3 del entrenamiento son públicos** (`public/entrenamiento/**`, fuera del matcher del middleware): con la URL se oye la presentación o la guía de cualquier módulo, incluso sin sesión. **Es anterior a esta rama** (viene de #115) y sacarlos de `public/` a una ruta autenticada es un cambio propio, con su impacto en caché y rendimiento. Anotado como pendiente, no arreglado aquí.
