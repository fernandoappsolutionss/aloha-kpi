# Entrenamiento en-app para administradoras — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que una administradora aprenda el sistema KPI con un tour guiado sobre la UI real (con voz de Fernando), demuestre que entendió con un quiz 3/3 por módulo, y que gerencia vea quién completó qué.

**Architecture:** Contenido como código (`lib/entrenamiento/modulos.js`), motor de tour propio (`components/tour/TourHost.js`) montado en un layout de `/centro/[id]` que lee `?tour=&paso=` de la URL y resalta elementos marcados con `data-tour`; progreso por usuario en `entrenamiento_progreso`; server actions que corrigen el quiz contra un archivo solo-servidor; páginas índice/módulo/matriz; script de audio con ElevenLabs y manifest de hashes.

**Tech Stack:** Next.js 15 App Router (JS, sin TS), React 18, Neon serverless (`lib/db.js` → `sql`), `node --test` para pruebas, CSS plano en `app/globals.css`. Sin dependencias nuevas.

**Spec:** `docs/superpowers/specs/2026-08-23-entrenamiento-administradoras-design.md` — leerlo antes de empezar. Contenido fuente: `docs/sop/sop-aloha-kpi.html`.

**Reglas para quien implementa:**
- Trabajar en `repos/aloha-kpi-entrenamiento` (rama `feat/entrenamiento`). **No correr comandos git** (lo hace Hermes al final de cada tarea).
- Correr pruebas con `npm test` (todas) o `node --test test/entrenamiento.test.mjs`.
- No tocar archivos fuera de los listados en cada tarea.
- Español en UI y mensajes. Tutear. Sin emojis nuevos salvo los que ya usa la app.

---

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `db/schema.sql` | tabla `entrenamiento_progreso` | 1 |
| `lib/entrenamiento/progreso.js` | funciones puras: completado, porcentaje, siguiente módulo, corrección del quiz | 1 |
| `lib/entrenamiento/modulos.js` | contenido: 9 módulos, pasos, quiz (sin respuestas), errores, FAQ | 2 |
| `lib/entrenamiento/respuestas.js` | índices correctos por módulo — solo servidor | 2 |
| `lib/entrenamiento/audio-manifest.json` | `{ "<modulo>/<paso>": { hash, file, seg } }` — vacío en PR 1 | 2 |
| `test/entrenamiento.test.mjs` | seguro de mantenimiento + pruebas de progreso/quiz | 1, 2, 3 |
| `components/Sidebar.js` | ítem Entrenamiento con badge `n/9`; `data-tour` en ítems del centro | 4, 8 |
| `app/centro/[id]/grupos/page.js`, `eventos/page.js`, `kpi/page.js`, `cuadro/page.js`, `page.js`, `ruta-nivel/page.js` | atributos `data-tour` | 4 |
| `components/PlanNino.js` | prop `tour` en `LineaTiempoPlan` (línea de chips del itinerario) | 4 |
| `components/tour/TourHost.js` | motor del tour | 5 |
| `app/globals.css` | estilos `.tour-*`, `.ent-*` | 5, 7 |
| `app/centro/[id]/layout.js` | monta `TourHost` | 5 |
| `app/actions/entrenamiento.js` | server actions | 6 |
| `app/centro/[id]/entrenamiento/page.js` | índice, errores, FAQ | 7 |
| `app/centro/[id]/entrenamiento/[modulo]/page.js` | intro, iniciar tour, quiz | 7 |
| `app/centro/[id]/page.js` | banner de progreso en Resumen | 8 |
| `app/dashboard/entrenamiento/page.js` | matriz para gerencia | 9 |
| `scripts/entrenamiento-audio.mjs` | generación de mp3 con ElevenLabs | 10 |
| `package.json` | script `entrenamiento:audio` | 10 |

---

### Task 1: Esquema + lógica pura de progreso (TDD)

**Files:**
- Modify: `db/schema.sql` (al final del archivo)
- Create: `lib/entrenamiento/progreso.js`
- Create: `test/entrenamiento.test.mjs`

- [ ] **Step 1: Escribir las pruebas de `progreso.js` (fallan porque el módulo no existe)**

Crear `test/entrenamiento.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { completado, porcentaje, siguienteModulo, corregirQuiz, rutaDePaso } from '../lib/entrenamiento/progreso.js'

const MODS = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

test('completado exige tour visto Y quiz aprobado', () => {
  assert.equal(completado(null), false)
  assert.equal(completado({}), false)
  assert.equal(completado({ tourVistoAt: '2026-08-23T10:00:00Z' }), false)
  assert.equal(completado({ quizAprobadoAt: '2026-08-23T10:00:00Z' }), false)
  assert.equal(completado({ tourVistoAt: '2026-08-23T10:00:00Z', quizAprobadoAt: '2026-08-23T10:05:00Z' }), true)
})

test('porcentaje cuenta módulos completados sobre el total', () => {
  const done = { tourVistoAt: 'x', quizAprobadoAt: 'y' }
  assert.deepEqual(porcentaje({}, MODS), { completados: 0, total: 3, pct: 0 })
  assert.deepEqual(porcentaje({ a: done }, MODS), { completados: 1, total: 3, pct: 33 })
  assert.deepEqual(porcentaje({ a: done, b: done, c: done }, MODS), { completados: 3, total: 3, pct: 100 })
  // un módulo con tour visto pero sin quiz NO cuenta
  assert.deepEqual(porcentaje({ a: { tourVistoAt: 'x' } }, MODS), { completados: 0, total: 3, pct: 0 })
})

test('siguienteModulo devuelve el primer no completado en orden, o null', () => {
  const done = { tourVistoAt: 'x', quizAprobadoAt: 'y' }
  assert.equal(siguienteModulo({}, MODS), 'a')
  assert.equal(siguienteModulo({ a: done }, MODS), 'b')
  assert.equal(siguienteModulo({ a: done, c: done }, MODS), 'b')
  assert.equal(siguienteModulo({ a: done, b: done, c: done }, MODS), null)
})

test('rutaDePaso: la página del paso n es la última ruta de los pasos anteriores, o inicio.ruta', () => {
  const m = { inicio: { ruta: '/a' }, pasos: [{}, {}, { ruta: '/b' }, {}] }
  assert.equal(rutaDePaso(m, 1), '/a')
  assert.equal(rutaDePaso(m, 3), '/a') // el hazlo con ruta vive en la página ORIGEN
  assert.equal(rutaDePaso(m, 4), '/b')
  assert.equal(rutaDePaso(m, 99), '/b') // fuera de rango: la última conocida
})

test('corregirQuiz: 3/3 aprueba, menos no, fuera de rango no cuenta', () => {
  assert.deepEqual(corregirQuiz([0, 2, 1], [0, 2, 1]), { puntaje: 3, correctas: [true, true, true], aprobado: true })
  assert.deepEqual(corregirQuiz([0, 1, 1], [0, 2, 1]), { puntaje: 2, correctas: [true, false, true], aprobado: false })
  assert.deepEqual(corregirQuiz([9, -1, 'x'], [0, 2, 1]), { puntaje: 0, correctas: [false, false, false], aprobado: false })
  assert.deepEqual(corregirQuiz([0], [0, 2, 1]), { puntaje: 1, correctas: [true, false, false], aprobado: false })
  assert.deepEqual(corregirQuiz(null, [0, 2, 1]), { puntaje: 0, correctas: [false, false, false], aprobado: false })
})
```

- [ ] **Step 2: Correr y ver que falla**

Run: `node --test test/entrenamiento.test.mjs`
Expected: FAIL — `Cannot find module '../lib/entrenamiento/progreso.js'`

- [ ] **Step 3: Implementar `lib/entrenamiento/progreso.js`**

```js
// Progreso del entrenamiento — cálculo puro, sin BD ni React.
// `progreso` es { [moduloId]: { tourVistoAt, quizAprobadoAt, intentos, ultimoPuntaje } }
// tal como lo devuelve cargarProgreso() (app/actions/entrenamiento.js).

export function completado(p) {
  return Boolean(p && p.tourVistoAt && p.quizAprobadoAt)
}

export function porcentaje(progreso, modulos) {
  const total = modulos.length
  const completados = modulos.filter((m) => completado(progreso?.[m.id])).length
  const pct = total ? Math.round((completados / total) * 100) : 0
  return { completados, total, pct }
}

export function siguienteModulo(progreso, modulos) {
  const m = modulos.find((x) => !completado(progreso?.[x.id]))
  return m ? m.id : null
}

// Página en la que vive el paso n (1-based): la última `ruta` de los pasos
// ANTERIORES a n, o inicio.ruta. Un paso hazlo con `ruta` vive en la página
// origen (el clic navega); el siguiente ya vive en el destino. El motor usa
// esto para que Omitir/Anterior/deep-link caigan en la página correcta.
export function rutaDePaso(modulo, n) {
  let r = modulo.inicio.ruta
  const tope = Math.min(Math.max(0, n - 1), modulo.pasos.length)
  for (let i = 0; i < tope; i++) if (modulo.pasos[i].ruta) r = modulo.pasos[i].ruta
  return r
}

// respuestas: índices elegidos por el usuario (puede venir corto, nulo o con basura).
// correctas: índices correctos del módulo (siempre 3).
export function corregirQuiz(respuestas, correctas) {
  const r = Array.isArray(respuestas) ? respuestas : []
  const marcas = correctas.map((c, i) => Number.isInteger(r[i]) && r[i] === c)
  const puntaje = marcas.filter(Boolean).length
  return { puntaje, correctas: marcas, aprobado: puntaje === correctas.length }
}
```

- [ ] **Step 4: Correr y ver que pasa**

Run: `node --test test/entrenamiento.test.mjs`
Expected: `# pass 5`

- [ ] **Step 5: Tabla en `db/schema.sql`** (agregar al final, antes de cualquier comentario de cierre si lo hay)

```sql
-- ══ ENTRENAMIENTO EN-APP (2026-08-23) ══
-- Progreso del entrenamiento por USUARIO (no por centro): dos administradoras
-- del mismo centro llevan cada una el suyo. Completado = tour_visto_at AND
-- quiz_aprobado_at. El contenido de los módulos vive en lib/entrenamiento/modulos.js.
CREATE TABLE IF NOT EXISTS entrenamiento_progreso (
  id               SERIAL PRIMARY KEY,
  usuario_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo           TEXT NOT NULL,
  tour_visto_at    TIMESTAMPTZ,
  quiz_aprobado_at TIMESTAMPTZ,
  intentos         INTEGER NOT NULL DEFAULT 0,
  ultimo_puntaje   INTEGER,
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (usuario_id, modulo)
);
-- (sin índice extra: el UNIQUE ya indexa usuario_id como primera columna)
```

- [ ] **Step 6: Aplicar el esquema a Neon** (Hermes lo corre; usa `.env.local`)

Run: `npm run db:migrate`
Expected: termina sin error; verificar con una consulta que `entrenamiento_progreso` existe.

- [ ] **Step 7: Commit** (Hermes)

```bash
git add db/schema.sql lib/entrenamiento/progreso.js test/entrenamiento.test.mjs
git commit -m "feat(entrenamiento): tabla de progreso y lógica pura de completado/quiz"
```

---

### Task 2: Contenido de los 9 módulos + respuestas + manifest vacío

**Files:**
- Create: `lib/entrenamiento/modulos.js`
- Create: `lib/entrenamiento/respuestas.js`
- Create: `lib/entrenamiento/audio-manifest.json`
- Modify: `test/entrenamiento.test.mjs` (agregar pruebas de forma del contenido)

- [ ] **Step 1: Pruebas de forma del contenido (fallan: los módulos no existen)**

Agregar al final de `test/entrenamiento.test.mjs`:

```js
import { MODULOS, ERRORES_GLOBALES, FAQ } from '../lib/entrenamiento/modulos.js'
import { RESPUESTAS } from '../lib/entrenamiento/respuestas.js'

test('hay 9 módulos con ids únicos y en orden 1..9', () => {
  assert.equal(MODULOS.length, 9)
  const ids = MODULOS.map((m) => m.id)
  assert.equal(new Set(ids).size, 9)
  assert.deepEqual(MODULOS.map((m) => m.orden), [1, 2, 3, 4, 5, 6, 7, 8, 9])
})

test('cada módulo tiene intro, inicio.ruta bajo /centro/{id}, 5-8 pasos y 1-3 errores', () => {
  for (const m of MODULOS) {
    assert.ok(m.titulo && m.intro?.texto, `${m.id}: falta título o intro`)
    assert.ok(Number.isInteger(m.duracionMin) && m.duracionMin > 0, `${m.id}: duracionMin`)
    assert.match(m.inicio.ruta, /^\/centro\/\{id\}/, `${m.id}: inicio.ruta`)
    assert.ok(m.pasos.length >= 5 && m.pasos.length <= 8, `${m.id}: ${m.pasos.length} pasos`)
    assert.ok(m.errores.length >= 1 && m.errores.length <= 3, `${m.id}: errores`)
  }
})

test('cada paso tiene id único global, tipo válido, target, título y texto', () => {
  const vistos = new Set()
  for (const m of MODULOS) for (const p of m.pasos) {
    assert.ok(!vistos.has(p.id), `paso repetido ${p.id}`); vistos.add(p.id)
    assert.ok(['mostrar', 'hazlo'].includes(p.tipo), `${p.id}: tipo ${p.tipo}`)
    assert.match(p.target, /^[a-z]+\.[a-z-]+$/, `${p.id}: target ${p.target}`)
    assert.ok(p.titulo && p.texto, `${p.id}: título/texto`)
    if (p.ruta) assert.match(p.ruta, /^\/centro\/\{id\}/, `${p.id}: ruta`)
  }
  // el último paso de cada módulo es mostrar (Terminar vive en la tarjeta)
  for (const m of MODULOS) assert.equal(m.pasos[m.pasos.length - 1].tipo, 'mostrar', `${m.id}: último paso debe ser mostrar`)
})

test('quiz: exactamente 3 preguntas con 2-4 opciones; respuestas válidas y sin índices en el cliente', () => {
  for (const m of MODULOS) {
    assert.equal(m.quiz.length, 3, `${m.id}: quiz`)
    for (const q of m.quiz) {
      assert.ok(q.pregunta && q.explicacion, `${m.id}: pregunta/explicación`)
      assert.ok(q.opciones.length >= 2 && q.opciones.length <= 4, `${m.id}: opciones`)
      assert.equal(q.correcta, undefined, `${m.id}: el índice correcto NO va en modulos.js`)
    }
    const r = RESPUESTAS[m.id]
    assert.ok(Array.isArray(r) && r.length === 3, `${m.id}: RESPUESTAS`)
    r.forEach((idx, i) => assert.ok(Number.isInteger(idx) && idx >= 0 && idx < m.quiz[i].opciones.length, `${m.id} q${i + 1}: índice ${idx}`))
  }
  assert.deepEqual(Object.keys(RESPUESTAS).sort(), MODULOS.map((m) => m.id).sort())
})

test('errores globales y FAQ apuntan a módulos existentes', () => {
  const ids = new Set(MODULOS.map((m) => m.id))
  assert.ok(ERRORES_GLOBALES.length >= 10)
  assert.ok(FAQ.length >= 12)
  for (const e of ERRORES_GLOBALES) { assert.ok(e.sintoma && e.causa && e.arreglo); assert.ok(ids.has(e.modulo), `error → ${e.modulo}`) }
  for (const f of FAQ) { assert.ok(f.pregunta && f.respuesta); assert.ok(ids.has(f.modulo), `faq → ${f.modulo}`) }
})

test('texto de cada paso ≤ 35 palabras (advertencia)', () => {
  for (const m of MODULOS) for (const p of m.pasos) {
    const n = p.texto.trim().split(/\s+/).length
    if (n > 35) console.warn(`⚠ ${p.id}: ${n} palabras (el clon lee lento)`)
  }
})
```

- [ ] **Step 2: Correr y ver que falla**

Run: `node --test test/entrenamiento.test.mjs`
Expected: FAIL — `Cannot find module '../lib/entrenamiento/modulos.js'`

- [ ] **Step 3: Crear `lib/entrenamiento/modulos.js`** con este contenido completo (texto en la voz de Fernando: directo, tutea, sin relleno):

```js
// Contenido del entrenamiento en-app. Fuente: docs/sop/sop-aloha-kpi.html.
// Regla: cada `target` debe existir como data-tour="<target>" en app/ o
// components/ (lo verifica test/entrenamiento.test.mjs). Cambiar un botón =
// cambiar este archivo en el mismo PR.
// `{id}` en rutas se sustituye por el centroId actual.
// El tour NUNCA pide confirmar una acción que escriba datos (spec §3).

export const MODULOS = [
  {
    id: 'meta',
    orden: 1,
    titulo: 'Tu meta: subir de nivel',
    duracionMin: 4,
    intro: {
      texto: 'ALOHA reconoce a cada centro por niveles: 170, 200, 230, 325 y 410 niños activos al cierre del trimestre, con deserción mensual por debajo del 8%. Este sistema existe para que tú sepas, cada día, cuántos niños te faltan y qué mover para llegar.',
      voz: 'ALOHA reconoce a cada centro por NIVELES. <break time="0.4s"/> Ciento setenta, doscientos, doscientos treinta, trescientos veinticinco y cuatrocientos diez niños activos al cierre del trimestre, <break time="0.3s"/> con deserción mensual por debajo del ocho por ciento. <break time="0.5s"/> Este sistema existe para que TÚ sepas, cada día, cuántos niños te faltan y qué mover para llegar.',
    },
    inicio: { ruta: '/centro/{id}' },
    pasos: [
      { id: 'meta-1', tipo: 'mostrar', target: 'resumen.ruta', titulo: 'Lo primero que ves', texto: 'Cuántos niños tienes y cuántos te faltan para el próximo nivel. Todo lo demás del sistema existe para mover esta barra.' },
      { id: 'meta-2', tipo: 'mostrar', target: 'resumen.metas', titulo: 'Tus metas por rol', texto: 'Las metas del trimestre separadas por administrador y asistente. Verde cumple, rojo no. Se calculan solas con lo que registras: aquí no se digita nada.' },
      { id: 'meta-3', tipo: 'mostrar', target: 'resumen.embudo', titulo: 'Tu embudo', texto: 'Invitados, asistieron, matriculados. Si la conversión de la clase de prueba baja, la barra de nivel se frena. Aquí se ve antes que en ningún lado.' },
      { id: 'meta-4', tipo: 'hazlo', target: 'nav.ruta', titulo: 'Vamos a la ruta', texto: 'Haz clic en Ruta de Nivel en el menú.', ruta: '/centro/{id}/ruta-nivel' },
      { id: 'meta-5', tipo: 'mostrar', target: 'ruta.barra', titulo: 'La barra no sube por vender', texto: 'Los niveles son 170, 200, 230, 325 y 410 niños activos al cierre del trimestre. La barra sube cuando el niño EMPIEZA clases, no cuando vendes.' },
      { id: 'meta-6', tipo: 'mostrar', target: 'ruta.escenarios', titulo: 'Tres escenarios', texto: 'Conservador, ritmo actual y plan de acción: en qué fecha llegarías con cada uno. Si dice "sin fecha confiable", faltan fechas de inicio por cargar, no vas mal.' },
    ],
    quiz: [
      { pregunta: '¿Qué hace subir la barra de tu nivel?', opciones: ['Vender un niño', 'Crear la clase de prueba', 'Que el niño empiece clases', 'Cerrar el mes'], explicacion: 'El nivel se mide por niños activos, y un niño es activo desde su fecha de inicio de clases. La venta sola no mueve la barra.' },
      { pregunta: 'Tu centro cierra el trimestre con 150 niños activos. ¿Qué nivel tiene?', opciones: ['Nivel 1', 'Sin nivel', 'Nivel 2', 'Nivel 0 por deserción'], explicacion: 'Nivel 1 exige 170 o más. Con 150 el centro queda sin nivel.' },
      { pregunta: 'La Ruta de Nivel dice "Sin fecha confiable". ¿Qué significa?', opciones: ['Que vas mal', 'Que el sistema está caído', 'Que ya llegaste a la meta', 'Que faltan fechas de inicio por cargar'], explicacion: 'Sin fechas de inicio el sistema no puede proyectar. Carga las fechas y la ruta se vuelve confiable.' },
    ],
    errores: [
      { sintoma: 'Vendí 5 niños y la barra de nivel no se movió.', causa: 'Los niños no tienen fecha de inicio de clases (su grupo no la tiene o están sin grupo).', arreglo: 'Ponle la fecha de inicio al grupo en Editar grupo, o asigna el grupo al niño en su ficha.' },
    ],
  },
  {
    id: 'modelo',
    orden: 2,
    titulo: 'El modelo: todo nace del grupo',
    duracionMin: 3,
    intro: {
      texto: 'En este sistema el niño no se inscribe al aire: se inscribe a un grupo. Y el grupo no aparece solo: tú lo aperturas y lo llenas. Aperturas el grupo, amarras la clase de prueba a ese grupo, inscribes al niño que asistió. El KPI, el Cuadro y tu ruta se llenan solos.',
      voz: 'En este sistema el niño NO se inscribe al aire. <break time="0.3s"/> Se inscribe a un GRUPO. <break time="0.4s"/> Y el grupo no aparece solo: tú lo aperturas y lo llenas. <break time="0.5s"/> Aperturas el grupo, <break time="0.2s"/> amarras la clase de prueba a ese grupo, <break time="0.2s"/> inscribes al niño que asistió. <break time="0.4s"/> El KPI, el Cuadro y tu ruta <break time="0.2s"/> se llenan SOLOS.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'modelo-1', tipo: 'mostrar', target: 'grupos.lista', titulo: 'El grupo es la unidad', texto: 'Todo nace del grupo. El niño no se inscribe al aire: se inscribe a un grupo. Y el grupo lo aperturas y lo llenas tú.' },
      { id: 'modelo-2', tipo: 'mostrar', target: 'grupos.aperturar', titulo: 'Paso uno', texto: 'Aperturas el grupo con día, hora, coach y fecha de inicio de clases.' },
      { id: 'modelo-3', tipo: 'mostrar', target: 'nav.eventos', titulo: 'Paso dos', texto: 'Creas la clase de prueba y la amarras a ese grupo. Así el sistema sabe a quién estás llenando y ventas ve los cupos.' },
      { id: 'modelo-4', tipo: 'mostrar', target: 'grupos.inscribir', titulo: 'Paso tres', texto: 'Inscribes al niño que asistió, en ese grupo.' },
      { id: 'modelo-5', tipo: 'mostrar', target: 'nav.kpi', titulo: 'Y el resto se llena solo', texto: 'El KPI, el Cuadro de Negocio y tu ruta de nivel salen de esos tres movimientos. Lo único que capturas a mano es la realidad operativa; los números los calcula el sistema.' },
      { id: 'modelo-6', tipo: 'mostrar', target: 'nav.cuadro', titulo: 'Si un número está mal', texto: 'No lo corrijas en el Cuadro ni en el KPI. Corrige el hecho que lo produjo: la fecha del grupo, el grupo del niño, su retiro. El número se recalcula solo.' },
    ],
    quiz: [
      { pregunta: '¿Qué es lo único que capturas a mano en el sistema?', opciones: ['Los royalties', 'La realidad operativa: grupos, clases de prueba, inscripciones, retiros', 'El KPI mensual', 'El promedio de niños por grupo'], explicacion: 'Los números los produce el sistema a partir de los hechos operativos que tú registras.' },
      { pregunta: 'El Cuadro muestra 0 nuevos activos aunque vendiste 5. ¿Qué haces?', opciones: ['Editar el número en el Cuadro', 'Cerrar el mes y seguir', 'Revisar que el grupo tenga fecha de inicio y los niños su grupo', 'Borrar los niños y volverlos a meter'], explicacion: 'Un número forzado descuadra al mes siguiente. Se corrige el hecho de origen y el Cuadro se recalcula.' },
      { pregunta: '¿Cuál es el orden correcto del modelo?', opciones: ['Niño → grupo → clase de prueba', 'Grupo → clase de prueba amarrada → niño en el grupo', 'Clase de prueba → niño → grupo', 'Da igual el orden'], explicacion: 'Primero existe el grupo; la clase de prueba lo llena; el niño entra a ese grupo.' },
    ],
    errores: [
      { sintoma: 'Corrijo un número en el KPI y al mes siguiente vuelve a salir mal.', causa: 'Se corrigió el resultado, no el hecho que lo produce.', arreglo: 'Corrige el grupo, el niño o el retiro de origen. El número se recalcula solo.' },
    ],
  },
  {
    id: 'aperturar',
    orden: 3,
    titulo: 'Aperturar un grupo',
    duracionMin: 4,
    intro: {
      texto: 'Aperturar un grupo es el primer movimiento de todo. Vas a ver cada campo del formulario y cuál de ellos decide si tus niños cuentan o no. Hoy solo miramos: no vas a crear nada.',
      voz: 'Aperturar un grupo es el PRIMER movimiento de todo. <break time="0.4s"/> Vas a ver cada campo del formulario <break time="0.2s"/> y cuál de ellos decide si tus niños cuentan o no. <break time="0.5s"/> Hoy solo miramos: <break time="0.2s"/> no vas a crear nada.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'ap-1', tipo: 'hazlo', target: 'grupos.aperturar', titulo: 'Abre el formulario', texto: 'Haz clic en Aperturar grupo. Hoy solo vamos a mirar: no vas a crear nada.' },
      { id: 'ap-2', tipo: 'mostrar', target: 'aperturar.numero', titulo: 'Número de grupo', texto: 'El número con el que el centro conoce al grupo. El sistema te propone el siguiente libre.' },
      { id: 'ap-3', tipo: 'mostrar', target: 'aperturar.itinerario', titulo: 'Itinerario', texto: 'TINY, KIDS o KINDER. Define la regla de llenado y los niveles disponibles.' },
      { id: 'ap-4', tipo: 'mostrar', target: 'aperturar.fecha-inicio', titulo: 'El campo más importante', texto: 'La fecha de inicio de clases mete al grupo en el Cuadro de Negocio y convierte a sus niños en activos. Sin fecha, tu nivel no avanza aunque hayas vendido.' },
      { id: 'ap-5', tipo: 'mostrar', target: 'aperturar.nivel', titulo: 'Nivel inicial', texto: 'Con qué nivel arranca. Casi siempre uno. Debajo el sistema te recuerda la apertura mínima del manual: con menos, abre igual pero bajo tu responsabilidad.' },
      { id: 'ap-6', tipo: 'mostrar', target: 'aperturar.online', titulo: 'Grupo online', texto: 'Márcalo solo si es virtual: queda exento de la alerta de fusión y del promedio de niños por grupo.' },
      { id: 'ap-7', tipo: 'hazlo', target: 'aperturar.cancelar', titulo: 'Cierra sin guardar', texto: 'Haz clic en Cancelar. Cuando abras uno de verdad, llenas esto y confirmas con el botón verde.' },
      { id: 'ap-8', tipo: 'mostrar', target: 'grupos.aperturar', titulo: 'Listo', texto: 'Eso es aperturar. Recuerda: la fecha de inicio es sagrada, y cuando llega, el grupo queda cerrado a edición salvo horario y coach.' },
    ],
    quiz: [
      { pregunta: '¿Cuál es el campo más importante al aperturar un grupo?', opciones: ['Número de grupo', 'Niños con los que abre', 'Grupo online', 'Fecha de inicio de clases'], explicacion: 'Esa fecha mete al grupo en el Cuadro y convierte a sus niños en activos. Sin ella, no hay nivel que suba.' },
      { pregunta: 'Abres un TINY nivel 1 con 5 niños. ¿Qué pasa?', opciones: ['Abre, pero queda bajo responsabilidad del centro (mínimo del manual: 8)', 'El sistema no lo deja abrir', 'Se marca como online', 'Se fusiona solo'], explicacion: 'El sistema avisa el mínimo del manual pero no bloquea: la responsabilidad queda en el centro.' },
      { pregunta: 'Llega la fecha de inicio del grupo. ¿Qué sigues pudiendo editar?', opciones: ['Todo', 'Nada', 'Solo horario y coach', 'Solo el número'], explicacion: 'Cuando el grupo inició, queda cerrado a edición salvo horario y coach.' },
    ],
    errores: [
      { sintoma: 'Aperturé el grupo pero no aparece en el Cuadro de Negocio.', causa: 'Sin fecha de inicio de clases, o con una fecha futura.', arreglo: 'El grupo entra al Cuadro en el mes de su fecha de inicio. Revísala en Editar grupo.' },
      { sintoma: 'Abrí el grupo con pocos niños y me sale "bajo meta".', causa: 'Quedó por debajo de la apertura mínima del manual.', arreglo: 'Es una alerta, no un bloqueo: llénalo en su ventana o busca fusión.' },
    ],
  },
  {
    id: 'clase-prueba',
    orden: 4,
    titulo: 'La clase de prueba amarrada al grupo',
    duracionMin: 4,
    intro: {
      texto: 'La clase de prueba es el motor de llenado. Pero solo sirve si está amarrada al grupo que estás llenando: así ventas ve los cupos y tú sabes qué clase te trajo a cada niño. Vamos a ver dónde se hace ese amarre.',
      voz: 'La clase de prueba es el MOTOR de llenado. <break time="0.4s"/> Pero solo sirve si está amarrada al grupo que estás llenando: <break time="0.3s"/> así ventas ve los cupos <break time="0.2s"/> y tú sabes qué clase te trajo a cada niño. <break time="0.5s"/> Vamos a ver dónde se hace ese amarre.',
    },
    inicio: { ruta: '/centro/{id}/eventos' },
    pasos: [
      { id: 'cp-1', tipo: 'mostrar', target: 'eventos.metricas', titulo: 'Tu tablero de conversión', texto: 'Registrados, asistieron, no asistieron, pagados. Aquí se mide si la clase de prueba sirvió.' },
      { id: 'cp-2', tipo: 'hazlo', target: 'eventos.nueva', titulo: 'Abre el formulario', texto: 'Haz clic en Nueva clase de prueba. Solo vamos a mirar.' },
      { id: 'cp-3', tipo: 'mostrar', target: 'evento.grupo', titulo: 'El amarre', texto: 'Este campo une la clase de prueba con el grupo que estás llenando. Si lo dejas en "Sin grupo", ventas no ve cupos y pierdes el rastro de qué clase te trajo al niño.' },
      { id: 'cp-4', tipo: 'mostrar', target: 'evento.inicio', titulo: 'Fecha y hora', texto: 'De aquí salen los recordatorios automáticos a los registrados. Ponla bien desde el principio.' },
      { id: 'cp-5', tipo: 'hazlo', target: 'evento.cancelar', titulo: 'Cierra sin guardar', texto: 'Haz clic en Cancelar. Los niños que asistan a una clase amarrada quedan como candidatos de ese grupo.' },
      { id: 'cp-6', tipo: 'mostrar', target: 'eventos.lista', titulo: 'La señal de alarma', texto: 'En la lista, "Sin grupo relacionado" es una clase que se creó sin amarre. Evítalo.' },
    ],
    quiz: [
      { pregunta: '¿Para qué sirve el campo "Grupo que se va a aperturar"?', opciones: ['Para el nombre de la clase', 'Para el precio', 'Para amarrar la clase al grupo que llenas y que ventas vea cupos', 'Para la zona horaria'], explicacion: 'Es el amarre del modelo: sin él, la clase de prueba queda suelta.' },
      { pregunta: 'Ves "Sin grupo relacionado" en la lista. ¿Qué significa?', opciones: ['La clase se canceló', 'Se creó sin amarre: nadie sabe qué grupo llenaba', 'No hubo registrados', 'Es una clase gratis'], explicacion: 'Se puede corregir editando la clase y eligiendo el grupo.' },
      { pregunta: '¿Dónde ves si tu clase de prueba sirvió?', opciones: ['En FODA', 'En Ruta de Nivel', 'En el Cuadro de Negocio', 'En el tablero de Clases de Prueba: asistieron y pagados'], explicacion: 'Ese tablero es tu embudo: registrados → asistieron → pagados.' },
    ],
    errores: [
      { sintoma: 'Ventas dice que no ve cupos del grupo nuevo.', causa: 'La clase de prueba se creó sin "Grupo que se va a aperturar".', arreglo: 'Edita la clase y elige el grupo. Los cupos viajan solos al CRM.' },
    ],
  },
  {
    id: 'inscribir',
    orden: 5,
    titulo: 'Inscribir al niño',
    duracionMin: 4,
    intro: {
      texto: 'Inscribir es el tercer movimiento. Vas a ver la ficha campo por campo: cuál te deja al niño fuera del conteo si lo dejas vacío, y cuál te dice de dónde vino. No vamos a guardar nada.',
      voz: 'Inscribir es el TERCER movimiento. <break time="0.4s"/> Vas a ver la ficha campo por campo: <break time="0.3s"/> cuál te deja al niño fuera del conteo si lo dejas vacío, <break time="0.2s"/> y cuál te dice de dónde vino. <break time="0.5s"/> No vamos a guardar nada.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'in-1', tipo: 'hazlo', target: 'grupos.inscribir', titulo: 'Abre la ficha', texto: 'Haz clic en Inscribir niño. Vamos a ver la ficha sin guardar.' },
      { id: 'in-2', tipo: 'mostrar', target: 'inscribir.grupo', titulo: 'El grupo', texto: 'Si lo dejas en "Sin grupo", el niño cae en la bolsa de niños sin grupo y NO cuenta como activo hasta que lo asignes. Úsalo solo si de verdad no sabes en cuál va.' },
      { id: 'in-3', tipo: 'mostrar', target: 'inscribir.origen', titulo: 'Origen', texto: 'Clase de prueba o inscripción directa. De aquí sale tu tasa de conversión.' },
      { id: 'in-4', tipo: 'mostrar', target: 'inscribir.origen-comercial', titulo: 'Origen comercial', texto: 'Obligatorio: de dónde vino el cliente. Sin esto no sabes qué canal te trae niños ni en cuál invertir.' },
      { id: 'in-5', tipo: 'mostrar', target: 'inscribir.fecha', titulo: 'Fecha de inscripción', texto: 'Es el día que pagó, no el día que empieza clases. El inicio lo da el grupo.' },
      { id: 'in-6', tipo: 'mostrar', target: 'inscribir.cierre-override', titulo: 'Cierre de nivel (override)', texto: 'Déjalo vacío. El cierre sale solo del plan del grupo; solo se llena si ese niño va a otro ritmo.' },
      { id: 'in-7', tipo: 'hazlo', target: 'inscribir.cancelar', titulo: 'Cierra sin guardar', texto: 'Haz clic en Cancelar. Recuerda: primero el grupo, después el niño.' },
      { id: 'in-8', tipo: 'mostrar', target: 'grupos.inscribir', titulo: 'Listo', texto: 'Eso es inscribir. Si ya sabes el grupo, nunca inscribas "para asignar luego": el niño no cuenta hasta que tenga grupo.' },
    ],
    quiz: [
      { pregunta: 'Inscribes un niño con Grupo = "Sin grupo". ¿Qué pasa?', opciones: ['Cuenta como activo igual', 'Se asigna solo al grupo más vacío', 'Queda en niños sin grupo y no cuenta como activo hasta asignarlo', 'Se borra a los 7 días'], explicacion: 'Sin grupo no hay fecha de inicio, y sin fecha de inicio no hay niño activo.' },
      { pregunta: '¿Qué fecha va en "Fecha de inscripción"?', opciones: ['La del inicio de clases', 'La de la clase de prueba', 'La del cierre de nivel', 'La del pago o inscripción'], explicacion: 'El inicio de clases lo da el grupo; la inscripción es cuando el representante pagó.' },
      { pregunta: '"Cierre de nivel (override)": ¿cuándo se llena?', opciones: ['Siempre', 'Solo si ese niño lleva un ritmo distinto al del grupo', 'Nunca', 'Solo para Kinder'], explicacion: 'Por defecto el cierre se deriva del plan del grupo. El override es la excepción.' },
    ],
    errores: [
      { sintoma: 'Tengo niños inscritos que no aparecen como activos.', causa: 'Están en "Sin grupo".', arreglo: 'Asígnales el grupo en su ficha; se vuelven activos en la fecha de inicio del grupo.' },
      { sintoma: 'No sé qué canal me trae niños.', causa: 'Se dejó vacío o genérico el origen comercial.', arreglo: 'Es obligatorio: llénalo en cada inscripción.' },
    ],
  },
  {
    id: 'llenado',
    orden: 6,
    titulo: 'El llenado que se controla solo',
    duracionMin: 5,
    intro: {
      texto: 'El manual dice que un grupo solo recibe niños nuevos en las primeras semanas del nivel: TINY hasta la semana 4 del libro, KIDS hasta la 2. Después, un niño nuevo va perdido. El sistema aplica esa regla solo, leyendo el itinerario. Tú no llevas la cuenta. Vamos a ver cómo se ve.',
      voz: 'El manual dice que un grupo solo recibe niños nuevos en las PRIMERAS semanas del nivel: <break time="0.3s"/> TINY hasta la semana cuatro del libro, <break time="0.2s"/> KIDS hasta la dos. <break time="0.4s"/> Después, un niño nuevo va perdido. <break time="0.5s"/> El sistema aplica esa regla SOLO, leyendo el itinerario. <break time="0.3s"/> Tú no llevas la cuenta. <break time="0.4s"/> Vamos a ver cómo se ve.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'll-1', tipo: 'hazlo', target: 'grupos.tarjeta', titulo: 'Abre un grupo', texto: 'Haz clic en el primer grupo de la lista para abrir su panel.' },
      { id: 'll-2', tipo: 'mostrar', target: 'grupo.llenado', titulo: 'El bloque LLENADO', texto: 'Cuántos niños contra la meta y hasta qué fecha acepta nuevos. TINY hasta la semana 4 del libro, KIDS hasta la 2. El sistema lo calcula solo con el itinerario.' },
      { id: 'll-3', tipo: 'mostrar', target: 'grupo.inscribir-aqui', titulo: 'Cuando el botón está gris', texto: 'Si este botón está gris, la ventana venció. No es un error: es el manual protegiendo al niño de entrar a un grupo que ya va por la semana 8.' },
      { id: 'll-4', tipo: 'mostrar', target: 'grupo.extender-ventana', titulo: 'La salida legítima', texto: 'Si de verdad el niño puede alcanzar al grupo, Extender ventana: queda el rastro de que fue decisión tuya y vence sola. Si no, apunta la venta al próximo grupo que abra.' },
      { id: 'll-5', tipo: 'mostrar', target: 'grupo.cerrar-inscripciones', titulo: 'La palanca manual', texto: 'Cerrar inscripciones bloquea a TODOS: nuevos, traslados y reincorporaciones. Úsala solo cuando el grupo está completo de verdad.' },
      { id: 'll-6', tipo: 'mostrar', target: 'grupos.lista', titulo: 'Léelo en la lista', texto: '"En llenado" es donde empujas ventas. "Sin fecha límite (exento)" en un grupo que no es Kinder significa que le falta la planificación: el sistema no puede protegerlo.' },
    ],
    quiz: [
      { pregunta: 'El botón "Inscribir niño aquí" está gris. ¿Qué pasó?', opciones: ['Venció la ventana de niños nuevos del manual', 'Un error del sistema', 'El grupo no tiene coach', 'El mes está cerrado'], explicacion: 'TINY hasta la semana 4, KIDS hasta la 2. El botón gris es el manual aplicado.' },
      { pregunta: 'Vendiste un niño y el grupo está cerrado a nuevos. ¿Qué haces?', opciones: ['Le pides al sistema que lo meta igual', 'Le borras la fecha de inicio al grupo', 'Extender ventana si el niño alcanza al grupo, o apuntarlo al próximo grupo', 'Le cambias el itinerario al grupo'], explicacion: 'Son las dos salidas legítimas. Forzarlo condena al niño a ir perdido.' },
      { pregunta: '¿Qué hace la palanca "Cerrar inscripciones"?', opciones: ['Solo bloquea niños nuevos', 'Cierra el mes', 'Borra el grupo', 'Bloquea a TODOS: nuevos, traslados y reincorporaciones'], explicacion: 'Es la palanca manual fuerte. La ventana automática solo frena a los nuevos.' },
    ],
    errores: [
      { sintoma: 'Le pedí a alguien que "abriera" el grupo para meter un niño en la semana 8.', causa: 'Se forzó la ventana del manual.', arreglo: 'Extiende solo si el niño alcanza al grupo; si no, próximo grupo. El niño perdido es deserción segura.' },
      { sintoma: 'Cerré inscripciones "para que no molesten" y ahora no puedo fusionar.', causa: 'La palanca manual bloquea también traslados y fusiones.', arreglo: 'Ábrela; la ventana automática ya frena a los nuevos.' },
    ],
  },
  {
    id: 'itinerario',
    orden: 7,
    titulo: 'Itinerario y lista del coach',
    duracionMin: 4,
    intro: {
      texto: 'El itinerario es el plan de clases del nivel: qué toca cada semana, los repasos, el Mental Day, el examen y el cierre. De él salen tres cosas: la ventana de niños nuevos, la lista de asistencia del coach y la fecha de cierre. Un grupo sin itinerario es un grupo ciego.',
      voz: 'El itinerario es el PLAN de clases del nivel: <break time="0.3s"/> qué toca cada semana, los repasos, el Mental Day, el examen y el cierre. <break time="0.5s"/> De él salen TRES cosas: <break time="0.2s"/> la ventana de niños nuevos, <break time="0.2s"/> la lista de asistencia del coach <break time="0.2s"/> y la fecha de cierre. <break time="0.5s"/> Un grupo sin itinerario <break time="0.2s"/> es un grupo CIEGO.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'it-1', tipo: 'hazlo', target: 'grupos.tarjeta', titulo: 'Abre un grupo', texto: 'Haz clic en el primer grupo para abrir su panel.' },
      { id: 'it-2', tipo: 'hazlo', target: 'grupo.tab-itinerario', titulo: 'Pestaña Itinerario', texto: 'Ahora haz clic en la pestaña Itinerario.' },
      { id: 'it-3', tipo: 'mostrar', target: 'grupo.itinerario-linea', titulo: 'El plan del nivel', texto: 'Inducción, semanas del libro, repasos, Mental Day, examen y cierre. De aquí salen la ventana de niños nuevos, la lista del coach y la fecha de cierre.' },
      { id: 'it-4', tipo: 'mostrar', target: 'grupo.ajustar-itinerario', titulo: 'Ajustar, con cuidado', texto: 'Corrige nivel, fecha de inicio y clases suspendidas. Reconstruye el plan completo del grupo: úsalo solo con la planificación real en la mano.' },
      { id: 'it-5', tipo: 'mostrar', target: 'grupo.link-coach', titulo: 'El link del coach', texto: 'Genera el enlace privado de este grupo: la coach lo abre en su teléfono sin clave y marca asistencia. Compártelo solo con ella, nunca en grupos de WhatsApp.' },
      { id: 'it-6', tipo: 'mostrar', target: 'grupo.panel', titulo: 'Un grupo sin itinerario', texto: 'Es un grupo ciego: la coach no ve clases y el llenado no se controla solo. Si aquí no hay plan, pide la planificación al centro y cárgala.' },
    ],
    quiz: [
      { pregunta: 'Un grupo sin itinerario cargado…', opciones: ['Funciona igual', 'Se cierra solo', 'Es ciego: la coach no ve clases y el llenado no se controla solo', 'No puede tener coach'], explicacion: 'Del itinerario salen la lista del coach, la ventana de nuevos y el cierre. Sin él, no hay nada de eso.' },
      { pregunta: '¿Qué hace "Ajustar itinerario"?', opciones: ['Reconstruye el plan completo del grupo: nivel, inicio, clases suspendidas', 'Solo cambia el coach', 'Cambia el nombre del grupo', 'Cierra el nivel'], explicacion: 'Por eso se usa con cuidado y con la planificación real a la vista.' },
      { pregunta: '¿Con quién compartes el link del coach?', opciones: ['En el grupo de WhatsApp del centro', 'Con los representantes', 'Con la junta', 'Solo con la coach de ese grupo: da acceso sin clave'], explicacion: 'Es un enlace privado por grupo. Quien lo tenga puede marcar asistencia.' },
    ],
    errores: [
      { sintoma: 'La coach dice que no le aparecen clases en su lista.', causa: 'El grupo no tiene itinerario cargado.', arreglo: 'Carga la planificación del nivel en curso; la lista se arma sola.' },
      { sintoma: 'Ajusté el itinerario "para probar" y se me desarmó el plan.', causa: 'Ajustar reconstruye el plan completo.', arreglo: 'Vuelve a ajustar con la planificación real del cuaderno de la coach.' },
    ],
  },
  {
    id: 'fusiones',
    orden: 8,
    titulo: 'Fusiones',
    duracionMin: 4,
    intro: {
      texto: 'Un grupo con pocos niños no es rentable y desgasta a la coach. El manual permite unirlo con otro, pero no de cualquier forma. El sistema hace el análisis por ti: con cuál conviene y qué problema tendrías. La conversación con la coach y los representantes la haces tú.',
      voz: 'Un grupo con pocos niños no es rentable <break time="0.2s"/> y desgasta a la coach. <break time="0.4s"/> El manual permite unirlo con otro, <break time="0.2s"/> pero NO de cualquier forma. <break time="0.4s"/> El sistema hace el análisis por ti: <break time="0.2s"/> con cuál conviene <break time="0.2s"/> y qué problema tendrías. <break time="0.5s"/> La conversación con la coach y los representantes <break time="0.2s"/> la haces TÚ.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'fu-1', tipo: 'hazlo', target: 'grupos.tab-fusiones', titulo: 'Pestaña Fusiones', texto: 'Haz clic en la pestaña Fusiones.' },
      { id: 'fu-2', tipo: 'mostrar', target: 'fusiones.reglas', titulo: 'Las reglas del manual', texto: 'Solo desde nivel 3. Kinder nunca. Online y base 1-2 exentos. Un niño TINY no entra a un grupo Kids; un KIDS de nivel 3 o más sí puede cruzar.' },
      { id: 'fu-3', tipo: 'mostrar', target: 'fusiones.bajo-meta', titulo: 'Grupos bajo meta', texto: 'Tienen menos niños que el mínimo del manual. "Ver destinos" te muestra con cuál conviene unirlos.' },
      { id: 'fu-4', tipo: 'mostrar', target: 'fusiones.sugeridas', titulo: 'El puntaje', texto: 'Mismo día y misma hora suma 50 porque el papá ni se entera. Días distintos suma cero: vas a perder niños. Las advertencias con triángulo no bloquean, te avisan.' },
      { id: 'fu-5', tipo: 'mostrar', target: 'fusiones.aplicar', titulo: 'Aplicar fusión', texto: 'Mueve a los niños. Habla con la coach y los representantes ANTES. Lo bloquean: destino base 1-2 recibiendo niveles 3 o más, cruces Tiny↔Kids prohibidos, coach sin certificación o pasarse del cupo.' },
    ],
    quiz: [
      { pregunta: '¿Qué niños NO se fusionan nunca?', opciones: ['Los de nivel 3 o más', 'Los Kinder y los de nivel 1-2', 'Los de grupos de sábado', 'Todos se fusionan'], explicacion: 'Nivel 1-2 está aprendiendo la base; Kinder queda fuera de toda fusión.' },
      { pregunta: 'Dos grupos, mismo día y misma hora. ¿Cuántos puntos suma el horario?', opciones: ['0', '28', '100', '50'], explicacion: 'Es la unión más natural: el representante no cambia nada. Días distintos suma 0.' },
      { pregunta: 'Antes de "Aplicar fusión" debes…', opciones: ['Cerrar el mes', 'Hablar con la coach y los representantes', 'Borrar el grupo de origen', 'Nada: el sistema hace todo'], explicacion: 'El sistema mueve niños; la conversación la haces tú, o se te caen en el camino.' },
    ],
    errores: [
      { sintoma: 'Apliqué la fusión y se me retiraron tres niños.', causa: 'No se habló con los representantes antes del cambio de horario.', arreglo: 'Primero la conversación, después el botón. Y mira el puntaje de horario: cero = días distintos.' },
    ],
  },
  {
    id: 'cierre',
    orden: 9,
    titulo: 'Cierre de mes',
    duracionMin: 5,
    intro: {
      texto: 'Cerrar el mes es tomarle una fotografía a tu centro. Esa foto queda como historial, alimenta el arranque del mes siguiente y la ve la junta. Por eso el mes cerrado no se edita, y por eso hay que revisar antes de cerrar.',
      voz: 'Cerrar el mes es tomarle una FOTOGRAFÍA a tu centro. <break time="0.4s"/> Esa foto queda como historial, <break time="0.2s"/> alimenta el arranque del mes siguiente <break time="0.2s"/> y la ve la junta. <break time="0.5s"/> Por eso el mes cerrado NO se edita, <break time="0.3s"/> y por eso hay que revisar ANTES de cerrar.',
    },
    inicio: { ruta: '/centro/{id}/cuadro' },
    pasos: [
      { id: 'ci-1', tipo: 'mostrar', target: 'cuadro.comparacion', titulo: 'Antes de cerrar, mira esto', texto: 'Cuadro contra KPI. Los tres números deben decir Coincide. Si hay descuadre, corrígelo ahora: después es más caro.' },
      { id: 'ci-2', tipo: 'mostrar', target: 'cuadro.royalties', titulo: 'Royalties', texto: 'Salen solos de los niños activos por nivel. No se digitan.' },
      { id: 'ci-3', tipo: 'hazlo', target: 'nav.kpi', titulo: 'Vamos al KPI', texto: 'Haz clic en KPI Semanal en el menú.', ruta: '/centro/{id}/kpi' },
      { id: 'ci-4', tipo: 'mostrar', target: 'kpi.config', titulo: 'Lo gris viene solo', texto: 'Niños de inicio arrastrados del cierre anterior, grupos activos, nuevos activos: vienen solos. Solo se digitan los campos blancos.' },
      { id: 'ci-5', tipo: 'mostrar', target: 'kpi.cerrar-mes', titulo: 'Cerrar mes', texto: 'Toma la fotografía. Antes: retiros cargados con su fecha real y fechas de inicio puestas. Al cerrar, el sistema ejecuta los retiros programados del mes y los cuenta en la deserción.' },
      { id: 'ci-6', tipo: 'mostrar', target: 'kpi.historial', titulo: 'Si te equivocaste', texto: 'Reabres, corriges y vuelves a cerrar. Ojo: si había meses cerrados después, hay que reabrirlos y cerrarlos en orden. Cada mes arranca con el cierre del anterior.' },
    ],
    quiz: [
      { pregunta: '¿Qué revisas antes de cerrar el mes?', opciones: ['Solo los royalties', 'La comparación Cuadro vs KPI (Coincide), retiros cargados y fechas de inicio', 'El FODA', 'Nada, el cierre lo revisa todo'], explicacion: 'El cierre congela lo que haya. Si hay descuadre, queda en el historial.' },
      { pregunta: 'Al cerrar, ¿qué hace el sistema con los retiros programados que vencían en el mes?', opciones: ['Los borra', 'Los pasa al mes siguiente', 'Los ejecuta y los cuenta en la deserción', 'No hace nada'], explicacion: 'El cierre no se traga la deserción: la aplica él mismo si el cron no lo hizo.' },
      { pregunta: 'Reabres junio para corregir y julio ya estaba cerrado. ¿Qué pasa con julio?', opciones: ['Se actualiza solo', 'Se borra', 'No pasa nada', 'Hay que reabrirlo y cerrarlo de nuevo, en orden'], explicacion: 'Cada mes arranca con el cierre del anterior; la cadena la rehaces tú.' },
    ],
    errores: [
      { sintoma: 'Cerré el mes y el KPI quedó distinto al Cuadro.', causa: 'No se verificó "Coincide" antes de cerrar.', arreglo: 'Reabre, corrige el hecho de origen, verifica Coincide y vuelve a cerrar.' },
      { sintoma: 'Reabrí un mes viejo y los siguientes quedaron raros.', causa: 'Los meses posteriores no se recalculan solos.', arreglo: 'Reábrelos y ciérralos otra vez en orden, del más antiguo al más reciente.' },
    ],
  },
]

export const ERRORES_GLOBALES = [
  { modulo: 'inscribir', sintoma: 'Inscribir "para asignar el grupo luego".', causa: 'El niño queda sin grupo y no cuenta como activo.', arreglo: 'Si ya sabes el grupo, ponlo al inscribir. Si no, asígnalo apenas lo sepas.' },
  { modulo: 'aperturar', sintoma: 'Grupo sin fecha de inicio de clases.', causa: 'Sus niños nunca se vuelven activos; la ruta de nivel no avanza.', arreglo: 'Editar grupo → fecha de inicio. Es el campo más importante de todos.' },
  { modulo: 'clase-prueba', sintoma: 'Clase de prueba sin grupo amarrado.', causa: 'Ventas no ve cupos y se pierde de qué clase vino cada niño.', arreglo: 'Al crearla, elige "Grupo que se va a aperturar". Si ya existe, edítala.' },
  { modulo: 'llenado', sintoma: 'Forzar un niño nuevo en un grupo cerrado a nuevos.', causa: 'Entra en la semana 8 y va perdido: deserción casi segura.', arreglo: 'Extender ventana solo si alcanza al grupo; si no, al próximo grupo que abra.' },
  { modulo: 'llenado', sintoma: 'Cerrar inscripciones "para que no molesten".', causa: 'Bloquea también traslados, reincorporaciones y fusiones.', arreglo: 'Úsala solo con el grupo completo. La ventana automática ya frena a los nuevos.' },
  { modulo: 'itinerario', sintoma: 'Grupo sin itinerario cargado.', causa: 'La coach no tiene lista y el llenado no se controla solo.', arreglo: 'Carga la planificación del nivel en curso.' },
  { modulo: 'itinerario', sintoma: 'Ajustar itinerario "para ver qué pasa".', causa: 'Reconstruye el plan completo del grupo.', arreglo: 'Solo con la planificación real del cuaderno de la coach a la vista.' },
  { modulo: 'cierre', sintoma: 'Borrar al niño que se retira.', causa: 'Desaparece de la deserción y descuadra el KPI del mes.', arreglo: 'Usa Retiro programado con la fecha real. La deserción es parte de tu KPI.' },
  { modulo: 'cierre', sintoma: 'Cerrar el mes con Cuadro ≠ KPI.', causa: 'El descuadre queda congelado en el historial y se arrastra.', arreglo: 'Verifica los tres "Coincide" antes de Cerrar mes.' },
  { modulo: 'cierre', sintoma: 'Reabrir un mes viejo y no volver a cerrar los posteriores.', causa: 'Cada mes arranca con el cierre del anterior; la cadena queda rota.', arreglo: 'Reabrir y cerrar en orden, del más antiguo al más reciente.' },
  { modulo: 'fusiones', sintoma: 'Aplicar fusión sin hablar con coach y representantes.', causa: 'Cambio de horario sin aviso = niños que se caen.', arreglo: 'Primero la conversación, después el botón.' },
  { modulo: 'modelo', sintoma: 'Corregir un número "a mano" en KPI o Cuadro.', causa: 'Vuelve a descuadrar al mes siguiente porque el hecho de origen sigue mal.', arreglo: 'Corrige el grupo, el niño o el retiro que lo produjo.' },
]

export const FAQ = [
  { modulo: 'llenado', pregunta: 'Vendí un niño y el grupo está cerrado a nuevos. ¿Qué hago?', respuesta: 'Extiende la ventana si el niño puede alcanzar al grupo (habla con la coach antes), o inscríbelo en el próximo grupo que abra. No lo fuerces: va a ir perdido.' },
  { modulo: 'fusiones', pregunta: 'Un grupo quedó con muy pocos niños.', respuesta: 'Pestaña Fusiones → Ver destinos. El sistema te propone con cuál unirlo y qué tan natural sería. Habla con la coach y los representantes antes de aplicar.' },
  { modulo: 'itinerario', pregunta: 'La coach dice que no le aparecen las clases.', respuesta: 'Al grupo le falta el itinerario. Pide la planificación del nivel en curso y cárgala; la lista se arma sola.' },
  { modulo: 'cierre', pregunta: 'El niño se retira. ¿Lo borro?', respuesta: 'No. Usa Retiro programado con la fecha real. La deserción es parte de tu KPI; borrarlo descuadra el mes.' },
  { modulo: 'cierre', pregunta: 'Me equivoqué en un mes que ya cerré.', respuesta: 'Reabre ese mes, corrige el hecho de origen y ciérralo de nuevo. Si había meses cerrados después, reábrelos y ciérralos en orden.' },
  { modulo: 'fusiones', pregunta: 'El sistema propone una fusión que no me convence.', respuesta: 'No estás obligada a aplicarla: el puntaje es una recomendación y tú conoces a los representantes. Pero mientras el grupo siga bajo meta, va a seguir apareciendo.' },
  { modulo: 'cierre', pregunta: 'Cerré el mes sin cargar un retiro.', respuesta: 'Reabre, carga el retiro con su fecha real y vuelve a cerrar. Ese niño estaba contando como activo en tu nivel.' },
  { modulo: 'cierre', pregunta: '¿Por qué el Cuadro y el KPI dicen números distintos?', respuesta: 'Algún hecho de origen está incompleto: un grupo sin fecha de inicio, un niño sin grupo, un retiro sin fecha. Corrígelo y la fila "Comparación con KPI" volverá a decir Coincide.' },
  { modulo: 'inscribir', pregunta: '¿Puedo inscribir antes de que el grupo tenga fecha de inicio?', respuesta: 'Sí, pero el niño no cuenta como activo hasta que el grupo tenga fecha y esa fecha llegue. Pon la fecha apenas la sepas.' },
  { modulo: 'meta', pregunta: '¿Qué es "Confianza baja" en la Ruta de Nivel?', respuesta: 'Faltan fechas de inicio en el pipeline y el sistema no puede proyectar con certeza. No significa que vayas mal: carga las fechas.' },
  { modulo: 'aperturar', pregunta: '¿Qué pasa si abro un grupo con menos del mínimo del manual?', respuesta: 'Abre igual, pero queda bajo responsabilidad del centro. Llénalo en su ventana de inducción o busca fusión.' },
  { modulo: 'itinerario', pregunta: '¿Cómo sé en qué semana va un grupo?', respuesta: 'En el panel del grupo, el bloque "Esta semana" lo dice. La pestaña Itinerario muestra el plan completo del nivel.' },
  { modulo: 'meta', pregunta: '¿Puedo repetir un recorrido del entrenamiento?', respuesta: 'Sí, las veces que quieras: Entrenamiento → el módulo → Repetir recorrido. El progreso no se pierde.' },
]
```

- [ ] **Step 4: Crear `lib/entrenamiento/respuestas.js`** (índices correctos, 0-based, en el orden del quiz de cada módulo — revisar contra las opciones de arriba):

```js
// SOLO SERVIDOR. Índices correctos del quiz de cada módulo (0-based), en el
// orden de MODULOS[].quiz. Lo importa app/actions/entrenamiento.js; nunca un
// componente cliente. test/entrenamiento.test.mjs verifica forma y rango.
export const RESPUESTAS = {
  meta:           [2, 1, 3],
  modelo:         [1, 2, 1],
  aperturar:      [3, 0, 2],
  'clase-prueba': [2, 1, 3],
  inscribir:      [2, 3, 1],
  llenado:        [0, 2, 3],
  itinerario:     [2, 0, 3],
  fusiones:       [1, 3, 1],
  cierre:         [1, 2, 3],
}
```

- [ ] **Step 5: Crear `lib/entrenamiento/audio-manifest.json`** vacío (PR 1 sale sin audio):

```json
{}
```

- [ ] **Step 6: Correr y ver que pasa**

Run: `node --test test/entrenamiento.test.mjs`
Expected: `# pass 11` (las 5 de Task 1 + 6 nuevas). Si falla "índice N fuera de rango" en algún módulo, corregir `respuestas.js` contra el texto de las opciones (la respuesta correcta está descrita en cada `explicacion`).

- [ ] **Step 7: Commit** (Hermes)

```bash
git add lib/entrenamiento/modulos.js lib/entrenamiento/respuestas.js lib/entrenamiento/audio-manifest.json test/entrenamiento.test.mjs
git commit -m "feat(entrenamiento): contenido de los 9 módulos, quiz, errores y FAQ"
```

---

### Task 3: Seguro de mantenimiento — cada `target` existe en el código

**Files:**
- Modify: `test/entrenamiento.test.mjs`

- [ ] **Step 1: Agregar la prueba que lee el fuente** (falla ahora: todavía no hay `data-tour` en las páginas)

```js
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

function archivosJs(dir) {
  const out = []
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) out.push(...archivosJs(p))
    else if (/\.(js|jsx)$/.test(n)) out.push(p)
  }
  return out
}

test('cada target del contenido existe como data-tour (o prop tour) en app/ o components/', () => {
  const fuentes = [...archivosJs('app'), ...archivosJs('components')].map((p) => readFileSync(p, 'utf8')).join('\n')
  const presentes = new Set()
  // Casa data-tour="x.y", tour="x.y", tour: 'x.y' y data-tour={cond ? 'x.y' : undefined}:
  // cualquier literal entrecomillado con forma ns.nombre en la misma línea que la palabra tour.
  for (const m of fuentes.matchAll(/\btour\b[^\n]*?['"]([a-z]+\.[a-z-]+)['"]/g)) presentes.add(m[1])
  const faltan = []
  for (const m of MODULOS) for (const p of m.pasos) if (!presentes.has(p.target)) faltan.push(`${m.id}/${p.id} → ${p.target}`)
  assert.deepEqual(faltan, [], `targets sin data-tour en el código:\n  ${faltan.join('\n  ')}`)
})

// Spec §12.5 — contrato manifest ↔ mp3 que comparten TourHost, la página del
// módulo y scripts/entrenamiento-audio.mjs. En PR 1 el manifest está vacío y
// pasa trivialmente; en PR 2 (solo mp3 + manifest, sin código) es el único seguro.
const manifest = JSON.parse(readFileSync('lib/entrenamiento/audio-manifest.json', 'utf8'))
test('manifest de audio: cada clave es un módulo/paso real y su mp3 existe en public/entrenamiento', () => {
  const claves = new Set()
  for (const m of MODULOS) { claves.add(`${m.id}/intro`); for (const p of m.pasos) claves.add(`${m.id}/${p.id}`) }
  for (const [k, v] of Object.entries(manifest)) {
    assert.ok(claves.has(k), `clave huérfana en el manifest (paso renombrado o borrado): ${k}`)
    assert.ok(v?.file && existsSync(join('public/entrenamiento', v.file)), `falta el mp3 de ${k}: public/entrenamiento/${v?.file}`)
  }
  const sinClip = [...claves].filter((k) => !manifest[k])
  if (sinClip.length) console.warn(`⚠ ${sinClip.length} clips sin audio todavía (llegan en PR 2)`)
})

// Las respuestas correctas solo pueden importarse desde módulos 'use server'.
test('respuestas.js solo se importa desde módulos de servidor (use server)', () => {
  const malos = [...archivosJs('app'), ...archivosJs('components')].filter((p) => {
    const src = readFileSync(p, 'utf8')
    return /entrenamiento\/respuestas/.test(src) && !/^\s*['"]use server['"]/m.test(src)
  })
  assert.deepEqual(malos, [], `respuestas.js importado fuera del servidor: ${malos.join(', ')}`)
})
```

- [ ] **Step 2: Correr y ver que falla con la lista completa de targets**

Run: `node --test test/entrenamiento.test.mjs`
Expected: FAIL solo en el test de targets — lista de 50 targets faltantes (esa lista es la guía de la Task 4). El test del manifest pasa (manifest vacío) y el de respuestas.js pasa (nada lo importa aún).

---

### Task 4: Atributos `data-tour` en las páginas reales

**Files:**
- Modify: `components/Sidebar.js` (centroItems + render)
- Modify: `components/PlanNino.js` (prop `tour` en `LineaTiempoPlan`)
- Modify: `app/centro/[id]/page.js`
- Modify: `app/centro/[id]/ruta-nivel/page.js`
- Modify: `app/centro/[id]/grupos/page.js`
- Modify: `app/centro/[id]/eventos/page.js`
- Modify: `app/centro/[id]/cuadro/page.js`
- Modify: `app/centro/[id]/kpi/page.js`

Regla: **solo agregar atributos**; no cambiar lógica ni estilos. Un `data-tour` por elemento y por pantalla. **El id literal `'x.y'` va en la MISMA línea que la palabra `tour`/`data-tour`** (ternarios en una sola línea; en Sidebar el literal vive en `centroItems`, que ya lo cumple): el seguro de la Task 3 lee línea por línea.

- [ ] **Step 1: Sidebar** — agregar `tour` a cada ítem del centro y renderizarlo

En `centroItems` (líneas ~60-70):

```js
  const centroItems = [
    { label: 'Resumen', icon: 'grid', href: `/centro/${centroId}`, tour: 'nav.resumen' },
    { label: 'Ruta de Nivel', icon: 'target', href: `/centro/${centroId}/ruta-nivel`, tour: 'nav.ruta' },
    { label: 'KPI Semanal', icon: 'edit', href: `/centro/${centroId}/kpi`, tour: 'nav.kpi' },
    { label: 'Grupos y Fusiones', icon: 'groups', href: `/centro/${centroId}/grupos`, tour: 'nav.grupos' },
    { label: 'Cuadro de Negocio', icon: 'sheet', href: `/centro/${centroId}/cuadro`, tour: 'nav.cuadro' },
    { label: 'Clases de Prueba', icon: 'calendar', href: `/centro/${centroId}/eventos`, tour: 'nav.eventos' },
    { label: 'Cumplimiento', icon: 'check', href: `/centro/${centroId}/cumplimiento` },
    { label: 'FODA', icon: 'search', href: `/centro/${centroId}/foda` },
    { label: 'Historial', icon: 'calendar', href: `/centro/${centroId}/historial` },
  ]
```

En el render de `items.map` (línea ~93):

```js
          <button key={item.href} onClick={() => router.push(item.href)} title={item.label} data-tour={item.tour}
            className={`sb__item${isActive(item.href) ? ' sb__item--active' : ''}`}>
```

(React omite el atributo cuando `item.tour` es `undefined`.)

- [ ] **Step 2: Resumen (`app/centro/[id]/page.js`)**

Línea ~258, envolver `GrowthSummaryBand` en un `div`:
```js
        <div data-tour="resumen.ruta"><GrowthSummaryBand data={growth} onOpen={() => router.push(`/centro/${id}/ruta-nivel`)} /></div>
```
Línea ~261: `<div className="role-kpi-grid" data-tour="resumen.metas">`
Línea ~320 (la card cuyo `h3` dice "Clase de prueba"): `<div className="card" style={{ padding: 20 }} data-tour="resumen.embudo">`

- [ ] **Step 3: Ruta de nivel (`app/centro/[id]/ruta-nivel/page.js`)**

Línea ~198: `<div className="growth-track growth-track--large" role="progressbar" data-tour="ruta.barra" …>`
Línea ~220: `<section className="growth-section" aria-labelledby="projection-title" data-tour="ruta.escenarios">`

- [ ] **Step 4: Grupos (`app/centro/[id]/grupos/page.js`)**

a) `Field` (línea ~3052) acepta `tour`:
```js
function Field({ label, full, tour, children }) {
  return <div className="field" data-tour={tour} style={full ? { gridColumn: '1 / -1', margin: 0 } : { margin: 0 }}><label className="label">{label}</label>{children}</div>
}
```
b) Botones de cabecera (líneas ~575-576):
```js
            <button className="btn" data-tour="grupos.inscribir" onClick={() => { setStatus(''); setInscribir({}) }}>Inscribir niño</button>
            <button className="btn btn--primary" data-tour="grupos.aperturar" onClick={() => abrirNuevoGrupo()}>➕ Aperturar grupo</button>
```
c) Pestañas (líneas ~597-601): el contenedor es `<div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>` sin className y el map destructura `[k, l]`. Queda así:
```js
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }} data-tour="grupos.tabs">
            {TABS.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`btn${tab === k ? ' btn--primary' : ''}`} style={{ padding: '8px 16px', fontSize: 13 }} data-tour={k === 'fusiones' ? 'grupos.tab-fusiones' : undefined}>{l}</button>
            ))}
          </div>
```
d) Lista de grupos: el padre de las `GrupoCard` es `<div className="grp-list">` (línea ~628) → `<div className="grp-list" data-tour="grupos.lista">`. Los arrays reales son `enLlenado` y `resto` (líneas ~329-332) y ya existe `visibles = [...enLlenado, ...resto]`. Tras esa línea agregar `const primeraTarjetaId = visibles[0]?.id`. En `GrupoCard` (línea ~825) aceptar `tour` y ponerlo en la raíz, que ya tiene `data-grupo`:
```js
function GrupoCard({ g, metas, activo, llenado, onAbrir, onEditar, tour }) {
  return (
    <div data-grupo={g.id} data-tour={tour} role="button"
      className={`grp-card${activo ? ' grp-card--on' : ''}`}
```
y en AMBOS map (líneas ~644-648 y ~653-656): `tour={g.id === primeraTarjetaId ? 'grupos.tarjeta' : undefined}`.
e) Panel del grupo: la raíz de `GrupoDetalle` es `<section className={`panel grp-detail${sheet ? ' grp-detail--sheet' : ''}`} aria-label=…>` (línea ~952; se renderiza inline o como sheet, nunca ambos) → agregar `data-tour="grupo.panel"` a ese `<section>`. Botones (líneas ~979-987):
```js
              data-tour="grupo.inscribir-aqui"   // en "+ Inscribir niño aquí"
              data-tour="grupo.cerrar-inscripciones"  // en el botón Abrir/Cerrar inscripciones
              data-tour="grupo.link-coach"       // en "🔗 Link del coach"
              data-tour="grupo.buscar-fusion"    // en "Buscar fusión"
```
Pestañas del panel (líneas ~996-999): `data-tour="grupo.tab-ninos"` en la de `vista === 'ninos'` y `data-tour="grupo.tab-itinerario"` en la de `'itinerario'`.
f) Bloque LLENADO: es el componente `BloqueLlenado` (línea ~1131); su raíz es `<div style={{ padding: '12px 18px', borderBottom: …, display: 'grid', gap: 8 }}>` (línea ~1152) → agregar `data-tour="grupo.llenado"` a ese div. Botón "Extender ventana" (línea ~1195, solo existe si `extensible && !extiendo`) → `data-tour="grupo.extender-ventana"`.
g) Itinerario: botón "✎ Ajustar itinerario" (línea ~1433) → `data-tour="grupo.ajustar-itinerario"`. La línea de chips INT/1/2/…/C **NO está en grupos/page.js**: vive en `components/PlanNino.js:86` (`<div className="itin-tl">` dentro de `LineaTiempoPlan`, línea ~71), que es compartida por varios sitios. Hacer: en `components/PlanNino.js` línea ~71 `export function LineaTiempoPlan({ it, estado, indice, onFecha, tour }) {` y línea ~86 `<div className="itin-tl" data-tour={tour}>`; pasar la prop SOLO desde `grupos/page.js` línea ~1414 (`planDelAula`): `<LineaTiempoPlan it={it} estado={pos.estado} indice={pos.indice} onFecha={(f) => onAjustar(f)} tour="grupo.itinerario-linea" />`. NO pasarla desde la línea ~1371 (`MontonPlan`) ni desde `PlanNino.js:319` (`PlanNinoModal`): así hay una sola línea con data-tour por pantalla.
h) Fusiones: el `div` que contiene "Reglas del manual:" (línea ~1510) → `data-tour="fusiones.reglas"`; el panel "Grupos bajo meta" (línea ~1534, el `div.panel` padre) → `data-tour="fusiones.bajo-meta"`; el panel "Fusiones sugeridas del mes" (línea ~1556, `div.panel` padre) → `data-tour="fusiones.sugeridas"`. El botón "Aplicar fusión" (línea ~1653) vive dentro de `FusionCard` (línea ~1606), que se renderiza en DOS maps (destinos ~1523 y sugeridas ~1560). Hacer: `function FusionCard({ from, to, analisis, onAplicar, busyFusion, tour })`; en el botón `data-tour={tour}`; y SOLO en el map de sugeridas (~1560): `fus.sugerencias.map((p, i) => (<FusionCard key={`${p.from.id}-${p.to.id}`} … tour={i === 0 ? 'fusiones.aplicar' : undefined} />))`. NO pasar `tour` en el map de destinos.
i) Modal Aperturar (líneas ~2385-2470):
```js
          <button className="btn" data-tour="aperturar.cancelar" onClick={onClose}>Cancelar</button>
          <button className="btn btn--primary" data-tour="aperturar.confirmar" onClick={save} disabled={saving}>…</button>
```
y en los `Field`: `tour="aperturar.numero"` (Número de grupo), `tour="aperturar.itinerario"`, `tour="aperturar.coach"`, `tour="aperturar.fecha-inicio"` (en **ambos** Field de fecha: el histórico y el normal — solo uno se renderiza a la vez), `tour="aperturar.nivel"` (Nivel inicial). Checkbox online: al `label`/`div` que envuelve el checkbox "Grupo online" → `data-tour="aperturar.online"`.
j) Modal Inscribir (líneas ~2634-2680): `tour="inscribir.nombre"`, `tour="inscribir.grupo"`, `tour="inscribir.origen"`, `tour="inscribir.origen-comercial"`, `tour="inscribir.fecha"`, `tour="inscribir.cierre-override"` en sus `Field`; en el footer del modal: `data-tour="inscribir.cancelar"` en Cancelar y `data-tour="inscribir.confirmar"` en Inscribir. **Solo en el modal de "Inscribir niño" (título exacto), no en los de editar/reincorporar** de las líneas ~2750+.

- [ ] **Step 5: Clases de prueba (`app/centro/[id]/eventos/page.js`)**

- Línea ~178: `data-tour="eventos.nueva"` en el botón "+ Nueva clase de prueba".
- Línea ~191: el contenedor de las tarjetas de stats → `data-tour="eventos.metricas"`.
- Línea ~220: el `div.panel` (o contenedor) de la `<table className="table">` → `data-tour="eventos.lista"`.
- `Field` (línea ~473): agregar prop `tour` igual que en grupos (`data-tour={tour}` en el div).
- Línea ~372: `<Field full tour="evento.grupo" label="Grupo que se va a aperturar">`.
- El `Field` de "Inicio *" (fecha/hora de inicio del evento, buscar `label="Inicio` ) → `tour="evento.inicio"`.
- Líneas ~465-466 (footer del modal de crear/editar): `data-tour="evento.cancelar"` en Cancelar, `data-tour="evento.crear"` en el botón primario.

- [ ] **Step 6: Cuadro (`app/centro/[id]/cuadro/page.js`)**

- Línea ~200: `<div className="panel" style={{ marginBottom: 20 }} data-tour="cuadro.comparacion">` (el de "Comparación con KPI semanal").
- Línea ~242: `<div className="panel" style={{ marginBottom: 20 }} data-tour="cuadro.royalties">` (el de "Royalties").
- Línea ~173: `data-tour="cuadro.excel"` en el `<a … download>` Descargar Excel.

- [ ] **Step 7: KPI (`app/centro/[id]/kpi/page.js`)**

- Línea ~244: `data-tour="kpi.reabrir"` en el botón Reabrir mes.
- Línea ~249: `data-tour="kpi.guardar"` en Guardar. Línea ~252: `data-tour="kpi.cerrar-mes"` en Cerrar mes.
- Línea ~294: el `div` que contiene "Historial cerrado:" y los chips → `data-tour="kpi.historial"`.
- Línea ~311: `<div className="card" style={{ padding: 18, marginBottom: 16 }} data-tour="kpi.config">`.

- [ ] **Step 8: Correr la prueba del seguro**

Run: `node --test test/entrenamiento.test.mjs`
Expected: `# pass 14` — todos los targets presentes. Si falta alguno, el mensaje dice cuál.

- [ ] **Step 9: Comprobar que la app arranca y las pantallas no cambiaron**

Run: `npm run build` (o `npm run dev` y abrir /centro/6/grupos)
Expected: build OK; visualmente idéntico (solo hay atributos nuevos).

- [ ] **Step 10: Commit** (Hermes)

```bash
git add components/Sidebar.js components/PlanNino.js app/centro test/entrenamiento.test.mjs
git commit -m "feat(entrenamiento): atributos data-tour en las pantallas del centro"
```

---

### Task 5: Motor del tour (`TourHost`) + estilos + layout

**Files:**
- Create: `components/tour/TourHost.js`
- Create: `app/centro/[id]/layout.js`
- Modify: `app/globals.css` (agregar bloque al final)

- [ ] **Step 1: Crear `components/tour/TourHost.js`**

```js
'use client'
// Motor del tour guiado. Lee ?tour=<modulo>&paso=<n> de la URL, busca el
// elemento [data-tour="<target>"] del paso, lo resalta con un spotlight y
// muestra la tarjeta con texto, audio y controles. No conoce el contenido:
// todo sale de lib/entrenamiento/modulos.js. Montado en app/centro/[id]/layout.js.
//
// TourHost vive en el layout del centro, que NO se desmonta al navegar entre
// páginas del mismo centro. Por eso el estado del tour vive en <TourActivo
// key={tourId}>: al cambiar de módulo React monta una instancia nueva (estado a
// cero) y sin ?tour se desmonta. Dentro de un módulo, los pasos con `ruta`
// conservan la key → el tour sobrevive a la navegación entre páginas.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation'
import { MODULOS } from '../../lib/entrenamiento/modulos'
import { rutaDePaso } from '../../lib/entrenamiento/progreso'
import manifest from '../../lib/entrenamiento/audio-manifest.json'
import { marcarTourVisto } from '../../app/actions/entrenamiento'

const ANCHO_TARJETA = 360
const MARGEN = 12
const AVISO_MS = 2500 // a los 2,5 s se avisa "todavía no veo…", pero se sigue buscando

export default function TourHost() {
  const sp = useSearchParams()
  const tourId = sp.get('tour')
  if (!tourId) return null
  return <TourActivo key={tourId} tourId={tourId} />
}

function TourActivo({ tourId }) {
  const params = useParams()
  const centroId = params?.id
  const pathname = usePathname()
  const router = useRouter()
  const sp = useSearchParams()
  const paso = Math.max(1, parseInt(sp.get('paso') || '1', 10) || 1)

  const modulo = useMemo(() => MODULOS.find((m) => m.id === tourId) || null, [tourId])
  const total = modulo?.pasos.length || 0
  const step = modulo?.pasos[paso - 1] || null
  const esUltimo = paso === total

  const [rect, setRect] = useState(null)
  const [estado, setEstado] = useState('buscando') // buscando | listo | ausente (aviso, no terminal)
  const [mute, setMute] = useState(false)
  const [reproduciendo, setReproduciendo] = useState(false)
  const [terminando, setTerminando] = useState(false)
  const [errorGuardar, setErrorGuardar] = useState('')
  const audioRef = useRef(null)
  const targetRef = useRef(null)
  const cardRef = useRef(null)   // para medir la altura real de la tarjeta al posicionarla
  const avanceRef = useRef(null) // timeout del avance tras un clic "hazlo" local

  useEffect(() => { try { setMute(localStorage.getItem('tour_mute') === '1') } catch {} }, [])

  const conCentro = useCallback((ruta) => String(ruta || '').replace('{id}', String(centroId)), [centroId])

  // Ir al paso n EN LA PÁGINA QUE LE CORRESPONDE (rutaDePaso): Omitir, Anterior
  // y deep-links caen siempre donde vive el target. Misma página → pushState
  // nativo (Next lo intercepta: actualiza useSearchParams sin fetch RSC ni salto
  // de scroll). Otra página → navegación real. n se acota a [1, total].
  const irA = useCallback((n) => {
    if (!modulo) return
    const destinoPaso = Math.min(Math.max(1, n), total || 1)
    const destino = conCentro(rutaDePaso(modulo, destinoPaso))
    const url = `${destino}?tour=${encodeURIComponent(tourId)}&paso=${destinoPaso}`
    if (destino === pathname) window.history.pushState(null, '', url)
    else router.push(url)
  }, [modulo, total, router, pathname, tourId, conCentro])

  // Quita ?tour sin fetch ni salto; TourHost deja de renderizar al no haber `tour`.
  const salir = useCallback(() => { window.history.pushState(null, '', pathname) }, [pathname])

  const terminar = useCallback(async () => {
    if (!modulo || terminando) return
    setTerminando(true); setErrorGuardar('')
    try {
      const r = await marcarTourVisto(modulo.id)
      if (r?.error) throw new Error(r.error)
      router.push(`/centro/${centroId}/entrenamiento/${modulo.id}#quiz`)
    } catch {
      setErrorGuardar('No se pudo guardar el recorrido. Revisa tu conexión y vuelve a pulsar Terminar.')
      setTerminando(false)
    }
  }, [modulo, terminando, router, centroId])

  // Mide el elemento del paso. Si la página lo re-creó (ya no está conectado),
  // lo vuelve a buscar por su data-tour para seguirlo; si no está, no toca rect.
  const medir = useCallback(() => {
    let el = targetRef.current
    if (!el || !el.isConnected) {
      el = step ? document.querySelector(`[data-tour="${step.target}"]`) : null
      if (!el) return
      targetRef.current = el
    }
    const r = el.getBoundingClientRect()
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }, [step])

  // Buscar el elemento del paso. El aviso "todavía no veo…" NO es terminal: las
  // pantallas del centro pintan "Cargando…" hasta que vuelve la server action y
  // en frío eso pasa de 2,5 s; cuando el elemento aparece, el paso pasa a 'listo'.
  useEffect(() => {
    if (!modulo || !step) return
    let cancelado = false, avisado = false, timer = null
    const t0 = Date.now()
    setEstado('buscando'); setRect(null); targetRef.current = null
    const buscar = () => {
      if (cancelado) return
      const el = document.querySelector(`[data-tour="${step.target}"]`)
      if (el) {
        targetRef.current = el
        try { el.scrollIntoView({ block: 'center', behavior: 'smooth' }) } catch {}
        medir()
        setEstado('listo')
        return
      }
      const t = Date.now() - t0
      if (t >= AVISO_MS && !avisado) { avisado = true; setEstado('ausente') }
      timer = setTimeout(buscar, t < AVISO_MS ? 150 : 400)
    }
    buscar()
    return () => { cancelado = true; if (timer) clearTimeout(timer) }
  }, [modulo, step, pathname, medir])

  // Re-medir en scroll/resize (y un par de veces tras el scroll suave; esas
  // re-mediciones también corrigen la posición con la altura real de la tarjeta).
  useEffect(() => {
    if (estado !== 'listo') return
    const on = () => medir()
    window.addEventListener('scroll', on, true)
    window.addEventListener('resize', on)
    const t1 = setTimeout(on, 250), t2 = setTimeout(on, 600)
    return () => { window.removeEventListener('scroll', on, true); window.removeEventListener('resize', on); clearTimeout(t1); clearTimeout(t2) }
  }, [estado, step, medir])

  // Paso "hazlo": avanzar cuando el usuario hace clic en el elemento real.
  useEffect(() => {
    if (estado !== 'listo' || step?.tipo !== 'hazlo') return
    const el = targetRef.current
    if (!el) return
    const onClick = (e) => {
      if (step.ruta) {
        // Navegación: la hacemos nosotros (irA resuelve la página del paso siguiente).
        e.preventDefault(); e.stopPropagation()
        irA(paso + 1)
        return
      }
      // Acción local (abrir modal, seleccionar, pestaña): dejamos pasar el clic y avanzamos.
      avanceRef.current = setTimeout(() => irA(paso + 1), 60)
    }
    el.addEventListener('click', onClick, { capture: true, once: true })
    return () => {
      el.removeEventListener('click', onClick, { capture: true })
      if (avanceRef.current) { clearTimeout(avanceRef.current); avanceRef.current = null }
    }
  }, [estado, step, paso, irA])

  // Audio del paso.
  useEffect(() => {
    const a = audioRef.current
    if (!a || !modulo || !step) return
    a.pause(); setReproduciendo(false)
    const clip = manifest[`${modulo.id}/${step.id}`]
    if (!clip || mute) { a.removeAttribute('src'); return }
    a.src = `/entrenamiento/${clip.file}`
    a.currentTime = 0
    a.play().then(() => setReproduciendo(true)).catch(() => setReproduciendo(false))
  }, [modulo, step, mute])

  // Teclado: Esc sale, → siguiente (solo en mostrar y nunca mientras se escribe
  // en un campo: en los pasos sobre un modal el foco suele estar en un input).
  useEffect(() => {
    if (!modulo) return
    const onKey = (e) => {
      if (e.key === 'Escape') { salir(); return }
      const t = e.target
      if (e.defaultPrevented || (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable))) return
      if (e.key === 'ArrowRight' && step?.tipo === 'mostrar' && !esUltimo) irA(paso + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modulo, step, paso, esUltimo, irA, salir])

  if (!modulo || !step) return null // módulo desconocido o paso fuera de rango

  const clip = manifest[`${modulo.id}/${step.id}`]
  const toggleMute = () => { const v = !mute; setMute(v); try { localStorage.setItem('tour_mute', v ? '1' : '0') } catch {} }
  const togglePlay = () => {
    const a = audioRef.current; if (!a || !clip) return
    if (a.paused) a.play().then(() => setReproduciendo(true)).catch(() => {}); else { a.pause(); setReproduciendo(false) }
  }

  // Posición de la tarjeta: debajo del elemento si cabe; si no, encima; si el
  // elemento es tan alto que tampoco cabe encima, al lado derecho. Siempre con
  // `top` acotado al viewport (nunca fuera de pantalla, ni con targets sticky de
  // 100vh). Centrada si aún no hay rect. La altura se mide en la tarjeta real;
  // el primer frame usa 260 y las re-mediciones de `medir` la corrigen.
  let cardStyle = { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }
  if (rect && estado === 'listo') {
    const vw = window.innerWidth, vh = window.innerHeight
    const ancho = Math.min(ANCHO_TARJETA, vw - 2 * MARGEN)
    const alto = cardRef.current?.offsetHeight || 260
    const cabeDerecha = rect.left + rect.width + MARGEN + ancho <= vw - MARGEN
    let left = Math.max(MARGEN, Math.min(rect.left, vw - ancho - MARGEN))
    let top = rect.top + rect.height + MARGEN                       // debajo
    if (top + alto > vh - MARGEN) top = rect.top - MARGEN - alto    // si no cabe, encima
    if (top < MARGEN && cabeDerecha) { left = rect.left + rect.width + MARGEN; top = rect.top } // target alto: al lado
    top = Math.max(MARGEN, Math.min(top, vh - alto - MARGEN))       // nunca fuera del viewport
    cardStyle = { left, top }
  }

  return (
    <>
      {rect && estado === 'listo' && (
        <div className="tour-spot" style={{ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 }} aria-hidden="true" />
      )}
      <div ref={cardRef} className="tour-card" style={cardStyle} role="dialog" aria-label={`Recorrido: ${modulo.titulo}`}>
        <div className="tour-card__head">
          <span className="label">Paso {paso} de {total} · {modulo.titulo}</span>
          <button className="tour-card__x" onClick={salir} title="Salir del recorrido (Esc)" aria-label="Salir del recorrido">×</button>
        </div>
        <h4 className="tour-card__title">{step.titulo}</h4>
        <p className="tour-card__text" aria-live="polite">{estado === 'ausente'
          ? 'Todavía no veo este elemento. Si la pantalla sigue cargando, espera un momento; si tu centro no tiene datos para mostrarlo, puedes omitir el paso.'
          : step.texto}</p>
        {clip && estado !== 'ausente' && (
          <div className="tour-card__audio">
            <button className="btn" onClick={togglePlay} title={reproduciendo ? 'Pausar' : 'Escuchar'} aria-label={reproduciendo ? 'Pausar' : 'Escuchar'}>{reproduciendo ? '❚❚' : '▶'}</button>
            <button className="btn" onClick={toggleMute} title={mute ? 'Activar voz' : 'Silenciar'} aria-label={mute ? 'Activar voz' : 'Silenciar'}>{mute ? '🔇' : '🔊'}</button>
            <span className="h-sub" style={{ margin: 0 }}>{mute ? 'Voz silenciada' : 'Con la voz de Fernando'}</span>
          </div>
        )}
        {errorGuardar && <div className="alert alert--error" style={{ marginBottom: 10, fontSize: 12.5 }}>{errorGuardar}</div>}
        <div className="tour-card__actions">
          {estado === 'ausente' ? (
            <>
              <button className="btn" onClick={salir}>Salir</button>
              {esUltimo ? <button className="btn btn--primary" onClick={terminar} disabled={terminando}>Terminar</button>
                        : <button className="btn btn--primary" onClick={() => irA(paso + 1)}>Omitir →</button>}
            </>
          ) : step.tipo === 'hazlo' ? (
            <>
              <span className="tour-card__hint">Haz clic en el elemento resaltado</span>
              <button className="tour-card__link" onClick={() => irA(paso + 1)}>Omitir este paso</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={() => irA(paso - 1)} disabled={paso <= 1}>← Anterior</button>
              {esUltimo ? <button className="btn btn--primary" onClick={terminar} disabled={terminando}>{terminando ? 'Guardando…' : 'Terminar ✓'}</button>
                        : <button className="btn btn--primary" onClick={() => irA(paso + 1)}>Siguiente →</button>}
            </>
          )}
        </div>
        <audio ref={audioRef} preload="none" onEnded={() => setReproduciendo(false)} />
      </div>
    </>
  )
}
```

- [ ] **Step 2: Crear `app/centro/[id]/layout.js`**

```js
import TourHost from '../../../components/tour/TourHost'

// Layout del centro: no cambia las páginas (cada una sigue pintando su
// Sidebar); solo monta el motor del tour, que lee ?tour= de la URL y no
// renderiza nada si no hay recorrido activo. Sin <Suspense>: todas las rutas
// /centro/[id]/* son dinámicas (la exigencia de Suspense con useSearchParams
// solo aplica al prerender estático) y así TourHost hidrata junto con la
// página, no después de su primera server action.
export default function CentroLayout({ children }) {
  return (
    <>
      {children}
      <TourHost />
    </>
  )
}
```

- [ ] **Step 3: Estilos** — agregar al final de `app/globals.css`:

```css
/* ═══ Tour guiado (entrenamiento) ═══ */
.tour-spot {
  position: fixed; z-index: 9000; pointer-events: none;
  border: 2px solid var(--ts-green); border-radius: 10px;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55), 0 0 0 4px var(--ts-green-soft);
  transition: top .2s ease, left .2s ease, width .2s ease, height .2s ease;
  animation: tourPulse 1.6s ease-in-out infinite;
}
@keyframes tourPulse { 0%,100% { box-shadow: 0 0 0 9999px rgba(0,0,0,.55), 0 0 0 3px var(--ts-green-soft); } 50% { box-shadow: 0 0 0 9999px rgba(0,0,0,.55), 0 0 0 8px var(--ts-green-soft); } }
.tour-card {
  position: fixed; z-index: 9001; width: min(360px, calc(100vw - 24px));
  background: var(--surface-1); color: var(--text); border: 1px solid var(--ts-green-line);
  border-radius: var(--r-lg); padding: 14px 16px 12px; box-shadow: 0 18px 50px rgba(0,0,0,.45);
  max-height: calc(100vh - 24px); overflow-y: auto;
  animation: fadeIn .18s both;
}
.tour-card__head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px; }
.tour-card__x { background: none; border: 0; color: var(--text-muted); font-size: 20px; line-height: 1; cursor: pointer; padding: 0 4px; }
.tour-card__x:hover { color: var(--text); }
.tour-card__title { font-family: var(--font-serif); font-size: 18px; margin: 0 0 6px; color: var(--text); }
.tour-card__text { font-size: 13.5px; line-height: 1.6; color: var(--text-muted); margin: 0 0 10px; }
.tour-card__audio { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.tour-card__audio .btn { padding: 4px 10px; font-size: 12px; }
.tour-card__actions { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.tour-card__actions .btn { padding: 7px 12px; font-size: 12.5px; }
.tour-card__hint { font-size: 12.5px; color: var(--ts-green); font-weight: 600; }
.tour-card__link { background: none; border: 0; color: var(--text-dim); font-size: 12px; text-decoration: underline; cursor: pointer; }
.tour-card__link:hover { color: var(--text); }
```

(`fadeIn` ya existe en globals.css — la usa `.grp-backdrop`.)

- [ ] **Step 4: Comprobar a mano** — `npm run dev`, entrar como administradora, abrir `http://localhost:3000/centro/6/grupos?tour=aperturar&paso=1`.

Expected: spotlight sobre "➕ Aperturar grupo", tarjeta "Paso 1 de 8 · Aperturar un grupo" con el texto y el aviso "Haz clic en el elemento resaltado"; al hacer clic se abre el modal y la URL pasa a `paso=2` con spotlight sobre "Número de grupo"; "Siguiente" avanza **sin que la página salte arriba** y sin fetch `?_rsc=` en la pestaña Network; en el paso 7 el clic en Cancelar cierra el modal y avanza; el paso 8 muestra "Terminar ✓". (`Terminar` fallará con el aviso de "No se pudo guardar" hasta la Task 6 — es esperado.) En frío (recargar la página con `?tour=`), mientras la página dice "Cargando…" la tarjeta muestra "Todavía no veo este elemento…" y al cargar pasa sola al spotlight. Sin `?tour` en la URL no se ve nada. `Esc` quita el `?tour` sin recargar.

- [ ] **Step 5: Commit** (Hermes)

```bash
git add components/tour/TourHost.js app/centro/\[id\]/layout.js app/globals.css
git commit -m "feat(entrenamiento): motor del tour guiado sobre la UI real"
```

---

### Task 6: Server actions de progreso y quiz

**Files:**
- Create: `app/actions/entrenamiento.js`

- [ ] **Step 1: Crear el archivo**

```js
'use server'
// Progreso del entrenamiento. Siempre escribe sobre el usuario de la sesión
// (session.uid, firmado en el JWT por lib/auth.js) — nunca sobre un id que
// venga del cliente. Las respuestas del quiz viven en respuestas.js (solo
// servidor): el cliente recibe opciones y explicaciones, nunca el índice.
import { sql } from '../../lib/db'
import { requireSession, requireCurrentUser, requireCurrentAdmin, isAdminRole } from '../../lib/auth'
import { MODULOS } from '../../lib/entrenamiento/modulos'
import { RESPUESTAS } from '../../lib/entrenamiento/respuestas'
import { corregirQuiz, porcentaje } from '../../lib/entrenamiento/progreso'

const MODULO_IDS = new Set(MODULOS.map((m) => m.id))

function aCamel(row) {
  return {
    tourVistoAt: row.tour_visto_at ? new Date(row.tour_visto_at).toISOString() : null,
    quizAprobadoAt: row.quiz_aprobado_at ? new Date(row.quiz_aprobado_at).toISOString() : null,
    intentos: Number(row.intentos || 0),
    ultimoPuntaje: row.ultimo_puntaje == null ? null : Number(row.ultimo_puntaje),
  }
}

// → { [modulo]: { tourVistoAt, quizAprobadoAt, intentos, ultimoPuntaje } }
export async function cargarProgreso() {
  const s = await requireSession()
  const rows = await sql`SELECT * FROM entrenamiento_progreso WHERE usuario_id = ${s.uid}`
  const out = {}
  for (const r of rows) out[r.modulo] = aCamel(r)
  return out
}

// → { completados, total, pct } (badge del menú y banner de Resumen).
// null para gerencia: admin_general/supervisor no se entrenan (spec §14).
export async function resumenProgreso() {
  const s = await requireSession()
  if (isAdminRole(s.rol)) return null
  return porcentaje(await cargarProgreso(), MODULOS)
}

// Las escrituras releen el usuario en BD (requireCurrentUser): una cookie de 7
// días de un usuario borrado o con acceso revocado no debe poder escribir.
export async function marcarTourVisto(modulo) {
  const u = await requireCurrentUser()
  if (!MODULO_IDS.has(modulo)) return { error: 'Módulo desconocido.' }
  await sql`
    INSERT INTO entrenamiento_progreso (usuario_id, modulo, tour_visto_at, updated_at)
    VALUES (${u.id}, ${modulo}, now(), now())
    ON CONFLICT (usuario_id, modulo) DO UPDATE
      SET tour_visto_at = COALESCE(entrenamiento_progreso.tour_visto_at, now()), updated_at = now()
  `
  return { ok: true }
}

// respuestas: [idx, idx, idx] elegidos por el usuario.
// → { puntaje, correctas:[bool×3], explicaciones:[string×3], aprobado }
export async function responderQuiz(modulo, respuestas) {
  const u = await requireCurrentUser()
  if (!MODULO_IDS.has(modulo)) return { error: 'Módulo desconocido.' }
  // Forma estricta: 3 enteros. Un payload malformado no cuenta como intento.
  const r = Array.isArray(respuestas) ? respuestas : null
  if (!r || r.length !== 3 || !r.every(Number.isInteger)) return { error: 'Respuestas inválidas.' }
  const correctas = RESPUESTAS[modulo]
  const m = MODULOS.find((x) => x.id === modulo)
  const res = corregirQuiz(r, correctas) // fuera de rango → incorrecta
  await sql`
    INSERT INTO entrenamiento_progreso (usuario_id, modulo, intentos, ultimo_puntaje, quiz_aprobado_at, updated_at)
    VALUES (${u.id}, ${modulo}, 1, ${res.puntaje}, ${res.aprobado ? new Date().toISOString() : null}, now())
    ON CONFLICT (usuario_id, modulo) DO UPDATE SET
      intentos = entrenamiento_progreso.intentos + 1,
      ultimo_puntaje = EXCLUDED.ultimo_puntaje,
      quiz_aprobado_at = COALESCE(entrenamiento_progreso.quiz_aprobado_at, EXCLUDED.quiz_aprobado_at),
      updated_at = now()
  `
  return { puntaje: res.puntaje, correctas: res.correctas, aprobado: res.aprobado, explicaciones: m.quiz.map((q) => q.explicacion) }
}

// Gerencia: usuarios administradora (+centro) × módulos. requireCurrentAdmin
// relee el rol desde la BD (como peticiones.js y deleteCentro): un JWT de 7
// días de alguien degradado o borrado no debe leer nombres/emails/progreso.
// → { modulos:[{id,titulo}], usuarios:[{ id, nombre, email, centro, centroId, progreso:{[modulo]:{…}}, completados, pct }] }
export async function matrizProgreso(centroId = null) {
  await requireCurrentAdmin()
  const cid = Number.isInteger(centroId) && centroId > 0 ? centroId : null
  const usuarios = cid
    ? await sql`SELECT u.id, u.nombre, u.email, u.centro_id, c.nombre AS centro FROM usuarios u LEFT JOIN centros c ON c.id = u.centro_id WHERE u.rol = 'administradora' AND u.centro_id = ${cid} ORDER BY c.nombre, u.nombre`
    : await sql`SELECT u.id, u.nombre, u.email, u.centro_id, c.nombre AS centro FROM usuarios u LEFT JOIN centros c ON c.id = u.centro_id WHERE u.rol = 'administradora' ORDER BY c.nombre, u.nombre`
  const ids = usuarios.map((x) => x.id)
  const rows = ids.length ? await sql`SELECT * FROM entrenamiento_progreso WHERE usuario_id = ANY(${ids})` : []
  const porUsuario = {}
  for (const r of rows) (porUsuario[r.usuario_id] ||= {})[r.modulo] = aCamel(r)
  return {
    modulos: MODULOS.map((m) => ({ id: m.id, titulo: m.titulo })),
    usuarios: usuarios.map((u) => {
      const progreso = porUsuario[u.id] || {}
      const p = porcentaje(progreso, MODULOS)
      return { id: u.id, nombre: u.nombre, email: u.email, centro: u.centro || '—', centroId: u.centro_id, progreso, completados: p.completados, pct: p.pct }
    }),
  }
}
```

- [ ] **Step 2: Seguro de auth fresca** — agregar al final de `test/entrenamiento.test.mjs` (mismo patrón que `test/peticiones-actions.test.mjs`):

```js
test('matrizProgreso usa auth fresca (requireCurrentAdmin), no el rol del JWT', () => {
  const src = readFileSync('app/actions/entrenamiento.js', 'utf8')
  const start = src.indexOf('export async function matrizProgreso')
  assert.ok(start >= 0, 'no se encontró matrizProgreso')
  const next = src.indexOf('export ', start + 1)
  const body = src.slice(start, next === -1 ? src.length : next)
  assert.match(body, /requireCurrentAdmin\(\)/)
  assert.doesNotMatch(body, /\brequireAdmin\(\)/)
})
```
Run: `node --test test/entrenamiento.test.mjs` → `# pass 15`.

- [ ] **Step 3: Prueba rápida manual** (con la app corriendo, desde la consola del navegador no se puede llamar server actions; se verifica en la Task 7 al usar el quiz). Alternativa inmediata: `node -e` contra Neon para confirmar que la tabla acepta el upsert:

Run (Hermes, con `.env.local`):
```bash
node -e "const {readFileSync}=require('fs');for(const l of readFileSync('.env.local','utf8').split('\n')){const m=l.match(/^([A-Z_]+)=\"?([^\"]*)\"?\$/);if(m)process.env[m[1]]=m[2]};(async()=>{const{neon}=await import('@neondatabase/serverless');const sql=neon(process.env.DATABASE_URL);console.log(await sql\`SELECT count(*) FROM entrenamiento_progreso\`)})()"
```
Expected: `[ { count: '0' } ]`

- [ ] **Step 4: Commit** (Hermes)

```bash
git add app/actions/entrenamiento.js test/entrenamiento.test.mjs
git commit -m "feat(entrenamiento): server actions de progreso, tour visto y quiz"
```

---

### Task 7: Páginas del entrenamiento (índice + módulo con quiz)

**Files:**
- Create: `app/centro/[id]/entrenamiento/page.js`
- Create: `app/centro/[id]/entrenamiento/[modulo]/page.js`
- Modify: `app/globals.css` (estilos `.ent-*`)

- [ ] **Step 1: Índice — `app/centro/[id]/entrenamiento/page.js`**

```js
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { getCentroNombre } from '../../../actions/centros'
import { cargarProgreso } from '../../../actions/entrenamiento'
import { MODULOS, ERRORES_GLOBALES, FAQ } from '../../../../lib/entrenamiento/modulos'
import { completado, porcentaje, siguienteModulo } from '../../../../lib/entrenamiento/progreso'

const fmtFecha = (iso) => iso ? new Date(iso).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' }) : ''

export default function EntrenamientoPage() {
  const { id } = useParams()
  const router = useRouter()
  const [nombre, setNombre] = useState('Centro')
  const [progreso, setProgreso] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    getCentroNombre(id).then((n) => { if (n) setNombre(n) }).catch(() => {})
    cargarProgreso().then((p) => setProgreso(p || {})).catch(() => {}).finally(() => setLoading(false))
  }, [id])

  const resumen = useMemo(() => porcentaje(progreso, MODULOS), [progreso])
  const siguiente = useMemo(() => siguienteModulo(progreso, MODULOS), [progreso])

  const estadoDe = (m) => {
    const p = progreso[m.id]
    if (completado(p)) return { k: 'ok', label: `✓ Completado · ${fmtFecha(p.quizAprobadoAt)}` }
    if (p?.tourVistoAt) return { k: 'mid', label: 'Recorrido visto · falta el quiz' }
    if (p?.quizAprobadoAt) return { k: 'mid', label: 'Quiz aprobado · falta el recorrido' }
    return { k: 'pend', label: 'Pendiente' }
  }

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={id} />
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Mi centro · Entrenamiento</div>
            <h1 className="h-title">Cómo se usa el sistema</h1>
            <p className="h-sub">{nombre} — recorridos sobre la app real, con tu meta al frente: subir de nivel</p>
          </div>
          <div className="ent-progress">
            <div className="ent-ring" style={{ '--pct': resumen.pct }}><span>{resumen.completados}/{resumen.total}</span></div>
            <div>
              <div style={{ fontWeight: 600 }}>{resumen.pct}% completado</div>
              {siguiente
                ? <button className="btn btn--primary" style={{ marginTop: 6 }} onClick={() => router.push(`/centro/${id}/entrenamiento/${siguiente}`)}>Continuar →</button>
                : <div className="h-sub" style={{ color: 'var(--ok)' }}>Entrenamiento completo</div>}
            </div>
          </div>
        </div>

        {loading ? <div className="h-sub">Cargando…</div> : (
          <div className="ent-grid">
            {MODULOS.map((m) => {
              const e = estadoDe(m)
              return (
                <div key={m.id} className={`card ent-card ent-card--${e.k}`} onClick={() => router.push(`/centro/${id}/entrenamiento/${m.id}`)} role="button" tabIndex={0}
                  onKeyDown={(ev) => { if (ev.key === 'Enter') router.push(`/centro/${id}/entrenamiento/${m.id}`) }}>
                  <div className="label">Módulo {m.orden} · {m.duracionMin} min</div>
                  <h3 className="ent-card__title">{m.titulo}</h3>
                  <div className={`ent-pill ent-pill--${e.k}`}>{e.label}</div>
                </div>
              )
            })}
          </div>
        )}

        <section className="panel" style={{ marginTop: 28 }}>
          <div className="panel__head"><h3 className="panel__title">Errores que más cuestan</h3><span className="label">Síntoma → causa → cómo se arregla</span></div>
          <table className="table">
            <thead><tr><th>Lo que pasa</th><th>Por qué</th><th>Qué hacer</th><th></th></tr></thead>
            <tbody>
              {ERRORES_GLOBALES.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{e.sintoma}</td><td>{e.causa}</td><td>{e.arreglo}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => router.push(`/centro/${id}/entrenamiento/${e.modulo}`)}>Ver módulo</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel" style={{ marginTop: 20 }}>
          <div className="panel__head"><h3 className="panel__title">Preguntas frecuentes</h3></div>
          <div style={{ padding: '6px 18px 14px' }}>
            {FAQ.map((f, i) => (
              <details key={i} className="ent-faq">
                <summary>{f.pregunta}</summary>
                <p>{f.respuesta} <button className="tour-card__link" onClick={() => router.push(`/centro/${id}/entrenamiento/${f.modulo}`)}>Ver en el entrenamiento</button></p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
```

(Contenedores: `.shell` > `Sidebar` + `main.main` > `div.main__head` — exactamente como `app/centro/[id]/cumplimiento/page.js`.)

- [ ] **Step 2: Módulo — `app/centro/[id]/entrenamiento/[modulo]/page.js`**

```js
'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '../../../../../components/Sidebar'
import { getCentroNombre } from '../../../../actions/centros'
import { cargarProgreso, responderQuiz } from '../../../../actions/entrenamiento'
import { MODULOS } from '../../../../../lib/entrenamiento/modulos'
import { completado } from '../../../../../lib/entrenamiento/progreso'
import manifest from '../../../../../lib/entrenamiento/audio-manifest.json'

export default function ModuloPage() {
  const { id, modulo: moduloId } = useParams()
  const router = useRouter()
  const modulo = useMemo(() => MODULOS.find((m) => m.id === moduloId), [moduloId])
  const idx = MODULOS.findIndex((m) => m.id === moduloId)
  const siguiente = MODULOS[idx + 1] || null
  const [nombre, setNombre] = useState('Centro')
  const [progreso, setProgreso] = useState({})
  const [sel, setSel] = useState([null, null, null])
  const [resultado, setResultado] = useState(null) // { puntaje, correctas, explicaciones, aprobado }
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!id) return
    getCentroNombre(id).then((n) => { if (n) setNombre(n) }).catch(() => {})
    cargarProgreso().then((p) => setProgreso(p || {})).catch(() => {})
  }, [id])

  if (!modulo) return <div className="shell"><Sidebar rol="usuario" centroNombre={nombre} centroId={id} /><main className="main"><div className="alert alert--error">Este módulo no existe.</div></main></div>

  const p = progreso[modulo.id]
  const tourVisto = Boolean(p?.tourVistoAt)
  const listo = completado(p)
  const clipIntro = manifest[`${modulo.id}/intro`]

  const iniciar = () => router.push(`${modulo.inicio.ruta.replace('{id}', String(id))}?tour=${modulo.id}&paso=1`)

  async function corregir() {
    if (sel.some((v) => v === null)) return
    setEnviando(true)
    try {
      const r = await responderQuiz(modulo.id, sel)
      if (r?.error) { setResultado({ error: r.error }); return }
      setResultado(r)
      const np = await cargarProgreso(); setProgreso(np || {})
    } catch {
      setResultado({ error: 'No se pudo corregir. Recarga la página e intenta de nuevo.' })
    } finally { setEnviando(false) }
  }
  const reintentar = () => { setSel([null, null, null]); setResultado(null) }

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={id} />
      <main className="main">
        <div className="main__head"><div>
          <button className="tour-card__link" onClick={() => router.push(`/centro/${id}/entrenamiento`)}>← Todos los módulos</button>
          <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Módulo {modulo.orden} de {MODULOS.length} · {modulo.duracionMin} min</div>
          <h1 className="h-title">{modulo.titulo}</h1>
          {listo && <div className="ent-pill ent-pill--ok" style={{ display: 'inline-block', marginTop: 6 }}>✓ Completado</div>}
        </div></div>

        <div className="card" style={{ padding: 20, marginBottom: 18 }}>
          <div className="label" style={{ marginBottom: 8 }}>Por qué importa</div>
          <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>{modulo.intro.texto}</p>
          {clipIntro && <audio controls preload="none" src={`/entrenamiento/${clipIntro.file}`} style={{ marginTop: 12, width: '100%' }} />}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={iniciar}>{tourVisto ? 'Repetir recorrido' : 'Iniciar recorrido →'}</button>
            {tourVisto && <span className="h-sub" style={{ margin: 0, alignSelf: 'center' }}>Recorrido visto. {listo ? 'Quiz aprobado.' : 'Te falta el quiz de abajo.'}</span>}
          </div>
        </div>

        {modulo.errores.length > 0 && (
          <div className="card" style={{ padding: 20, marginBottom: 18 }}>
            <div className="label" style={{ marginBottom: 10 }}>Errores típicos de este módulo</div>
            {modulo.errores.map((e, i) => (
              <div key={i} className="ent-error">
                <div style={{ fontWeight: 600 }}>{e.sintoma}</div>
                <div className="h-sub" style={{ margin: '2px 0 0' }}><b>Por qué:</b> {e.causa} · <b>Qué hacer:</b> {e.arreglo}</div>
              </div>
            ))}
          </div>
        )}

        <div id="quiz" className="card" style={{ padding: 20 }}>
          <div className="label" style={{ marginBottom: 4 }}>Quiz · necesitas 3 de 3</div>
          <p className="h-sub" style={{ marginTop: 0 }}>{tourVisto ? 'Demuestra que lo entendiste.' : 'Puedes responderlo ya, pero el módulo solo queda completo con el recorrido visto y el quiz aprobado.'}</p>
          {modulo.quiz.map((q, qi) => {
            const marcada = resultado && !resultado.error ? resultado.correctas[qi] : null
            return (
              <div key={qi} className={`ent-q${marcada === true ? ' ent-q--ok' : marcada === false ? ' ent-q--bad' : ''}`}>
                <div className="ent-q__text">{qi + 1}. {q.pregunta}</div>
                {q.opciones.map((op, oi) => (
                  <label key={oi} className="ent-opt">
                    <input type="radio" name={`q${qi}`} checked={sel[qi] === oi} disabled={Boolean(resultado && !resultado.error)}
                      onChange={() => setSel((s) => { const n = [...s]; n[qi] = oi; return n })} />
                    <span>{op}</span>
                  </label>
                ))}
                {marcada === false && <div className="ent-q__expl">✗ {resultado.explicaciones[qi]}</div>}
                {marcada === true && <div className="ent-q__expl ent-q__expl--ok">✓ Correcto</div>}
              </div>
            )
          })}
          {resultado?.error && <div className="alert alert--error">{resultado.error}</div>}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {!resultado || resultado.error ? (
              <button className="btn btn--primary" onClick={corregir} disabled={enviando || sel.some((v) => v === null)}>{enviando ? 'Corrigiendo…' : 'Corregir'}</button>
            ) : resultado.aprobado ? (
              <>
                <div className="ent-pill ent-pill--ok">✓ 3 de 3 · {listo ? 'Módulo completado' : 'Quiz aprobado — te falta ver el recorrido'}</div>
                {siguiente && <button className="btn btn--primary" onClick={() => router.push(`/centro/${id}/entrenamiento/${siguiente.id}`)}>Siguiente módulo: {siguiente.titulo} →</button>}
                {!siguiente && <button className="btn" onClick={() => router.push(`/centro/${id}/entrenamiento`)}>Volver al índice</button>}
              </>
            ) : (
              <>
                <div className="ent-pill ent-pill--bad">{resultado.puntaje} de 3 · lee las explicaciones y vuelve a intentar</div>
                <button className="btn btn--primary" onClick={reintentar}>Intentar de nuevo</button>
                <button className="btn" onClick={iniciar}>Repetir recorrido</button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Estilos `.ent-*`** — agregar al final de `app/globals.css`:

```css
/* ═══ Entrenamiento ═══ */
.ent-progress { display: flex; align-items: center; gap: 14px; }
.ent-ring { --pct: 0; width: 64px; height: 64px; border-radius: 50%; display: grid; place-items: center; font-family: var(--font-mono); font-size: 13px; font-weight: 600;
  background: conic-gradient(var(--ts-green) calc(var(--pct) * 1%), var(--surface-3) 0); }
.ent-ring span { width: 50px; height: 50px; border-radius: 50%; background: var(--surface-1); display: grid; place-items: center; }
.ent-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 14px; }
.ent-card { padding: 18px; cursor: pointer; border-left: 4px solid var(--border); transition: transform .12s ease, border-color .12s ease; }
.ent-card:hover { transform: translateY(-1px); border-color: var(--ts-green-line); }
.ent-card--ok { border-left-color: var(--ok); }
.ent-card--mid { border-left-color: var(--warn); }
.ent-card__title { font-family: var(--font-serif); font-size: 18px; margin: 6px 0 10px; }
.ent-pill { display: inline-block; font-size: 11.5px; padding: 3px 9px; border-radius: 999px; border: 1px solid var(--border); color: var(--text-muted); }
.ent-pill--ok { color: var(--ok); border-color: var(--ok-line); background: var(--ok-bg); }
.ent-pill--mid { color: var(--warn); border-color: var(--warn-line); background: var(--warn-bg); }
.ent-pill--bad { color: var(--bad); border-color: var(--bad-line); background: var(--bad-bg); }
.ent-faq { border-bottom: 1px solid var(--border); padding: 10px 0; }
.ent-faq summary { cursor: pointer; font-weight: 600; }
.ent-faq p { color: var(--text-muted); margin: 8px 0 0; line-height: 1.6; }
.ent-error { padding: 8px 0; border-bottom: 1px solid var(--border); }
.ent-error:last-child { border-bottom: 0; }
.ent-q { padding: 12px 0; border-bottom: 1px solid var(--border); }
.ent-q__text { font-weight: 600; margin-bottom: 6px; }
.ent-opt { display: flex; gap: 8px; align-items: center; padding: 4px 0; cursor: pointer; color: var(--text-muted); }
.ent-opt input { accent-color: var(--ts-green); }
.ent-q--ok .ent-q__text { color: var(--ok); }
.ent-q--bad .ent-q__text { color: var(--bad); }
.ent-q__expl { margin-top: 6px; font-size: 13px; color: var(--bad); }
.ent-q__expl--ok { color: var(--ok); }
```

- [ ] **Step 4: Comprobar a mano** — `/centro/6/entrenamiento`: 9 tarjetas "Pendiente", anillo 0/9, "Continuar →" lleva a `meta`. En `/centro/6/entrenamiento/aperturar`: "Iniciar recorrido" abre el tour en Grupos; "Terminar ✓" vuelve a la página con `#quiz` y la tarjeta dice "Recorrido visto"; responder 3/3 → "✓ Módulo completado" y en el índice la tarjeta pasa a verde con fecha; responder 2/3 → marca la errada con su explicación y "Intentar de nuevo". Recargar conserva el estado (viene de la BD).

- [ ] **Step 5: Commit** (Hermes)

```bash
git add app/centro/\[id\]/entrenamiento app/globals.css
git commit -m "feat(entrenamiento): índice de módulos, página de módulo con quiz, errores y FAQ"
```

---

### Task 8: Menú con badge y banner en Resumen

**Files:**
- Modify: `components/Sidebar.js`
- Modify: `app/centro/[id]/page.js`
- Modify: `components/growth/GrowthBriefing.js` (guarda: no abrir con `?tour=`)

- [ ] **Step 1: Sidebar** — importar la action y cargar el resumen cuando no es admin

```js
import { resumenProgreso } from '../app/actions/entrenamiento'
```
Dentro del componente:
```js
  const [ent, setEnt] = useState(null) // { completados, total } | null (gerencia no se entrena)
  useEffect(() => {
    if (isAdmin || !centroId) return
    // En /centro/* el prop `rol` llega como "usuario" aunque sea un admin visitando el centro:
    // leer el rol real. La action devuelve null para gerencia de todas formas.
    const r = localStorage.getItem('aloha_rol')
    if (r === 'admin_general' || r === 'supervisor') return
    resumenProgreso().then((res) => { if (res && !res.error) setEnt(res) }).catch(() => {})
  }, [isAdmin, centroId])
```
Agregar el ítem al final de `centroItems`:
```js
    { label: 'Entrenamiento', icon: 'check', href: `/centro/${centroId}/entrenamiento`, tour: 'nav.entrenamiento', badge: ent && ent.completados < ent.total ? `${ent.completados}/${ent.total}` : null },
```
En el render del ítem, después del `<span>{item.label}</span>`:
```js
            {item.badge && <span className="sb__badge">{item.badge}</span>}
```
Estilo (agregar a `app/globals.css`, junto a los `.sb__*` existentes o al final):
```css
.sb__badge { margin-left: auto; font-family: var(--font-mono); font-size: 10.5px; padding: 1px 7px; border-radius: 999px; background: var(--ts-green-soft); color: var(--ts-green); border: 1px solid var(--ts-green-line); }
```
(Si `.sb__item` no es `display:flex`, agregar `display:flex; align-items:center; gap:10px` a la regla existente de `.sb__item` — comprobar primero.)

- [ ] **Step 2: Banner en Resumen** (`app/centro/[id]/page.js`)

Importar `resumenProgreso`. La página ya lee el rol en su efecto de montaje (líneas ~108-111: `localStorage.getItem('aloha_rol')` → `setIsAdmin`). Agregar el estado y meter la carga en ESE mismo efecto (no crear otro):
```js
  const [ent, setEnt] = useState(null)
  // dentro del useEffect de montaje existente, después de setIsAdmin(admin):
  if (!admin) resumenProgreso().then((res) => { if (res && !res.error) setEnt(res) }).catch(() => {})
```
Justo antes de `<div data-tour="resumen.ruta">…` (la banda de crecimiento):
```js
        {!isAdmin && ent && ent.completados < ent.total && (
          <div className="alert" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)' }}>
            <span>Tu entrenamiento: <b>{ent.completados} de {ent.total}</b> módulos completados.</span>
            <button className="btn btn--primary" style={{ padding: '6px 14px', fontSize: 12 }} onClick={() => router.push(`/centro/${id}/entrenamiento`)}>Continuar →</button>
          </div>
        )}
```

- [ ] **Step 2b: La Guía semanal no se abre encima del tour** (`components/growth/GrowthBriefing.js`, primer `useEffect`, línea ~33). El briefing semanal de crecimiento se abre solo en Resumen, bloquea el scroll del body y atrapa el foco: encima de un recorrido activo lo tapa. Guarda de una línea al inicio del efecto, ANTES de `loadBriefing` (así tampoco consume el recibo semanal):
```js
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('tour')) return undefined
```
Agregar `components/growth/GrowthBriefing.js` a Files y al `git add` del Step 4.

- [ ] **Step 3: Comprobar** — como administradora: menú muestra `Entrenamiento 0/9`; Resumen muestra el banner; completar un módulo y recargar → `1/9`. Como admin_general entrando a un centro: el ítem Entrenamiento se ve (sirve para previsualizar) pero **sin badge**, y Resumen **sin banner**.

- [ ] **Step 4: Commit** (Hermes)

```bash
git add components/Sidebar.js components/growth/GrowthBriefing.js app/centro/\[id\]/page.js app/globals.css
git commit -m "feat(entrenamiento): ítem de menú con progreso y banner en Resumen"
```

---

### Task 9: Matriz para gerencia

**Files:**
- Create: `app/dashboard/entrenamiento/page.js`
- Modify: `components/Sidebar.js` (`adminItems`)

- [ ] **Step 1: Página**

```js
'use client'
import { useEffect, useState } from 'react'
import Sidebar from '../../../components/Sidebar'
import { matrizProgreso } from '../../actions/entrenamiento'
import { listCentros } from '../../actions/centros'
import { completado } from '../../../lib/entrenamiento/progreso'

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit' }) : ''

export default function EntrenamientoAdminPage() {
  const [data, setData] = useState(null)
  const [centros, setCentros] = useState([])
  const [centroId, setCentroId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { listCentros().then((c) => setCentros(c || [])).catch(() => {}) }, [])
  useEffect(() => {
    setLoading(true)
    matrizProgreso(centroId ? Number(centroId) : null).then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [centroId])

  return (
    <div className="shell">
      <Sidebar rol="admin_general" />
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Gerencia · Entrenamiento</div>
            <h1 className="h-title">Quién completó el entrenamiento</h1>
            <p className="h-sub">Por usuario y módulo. ✓ = recorrido visto y quiz 3/3 · <span style={{ color: 'var(--warn)' }}>tour</span> = vio el recorrido, falta el quiz · <span style={{ color: 'var(--warn)' }}>quiz</span> = aprobó sin ver el recorrido</p>
          </div>
          <select className="input" style={{ width: 240 }} value={centroId} onChange={(e) => setCentroId(e.target.value)}>
            <option value="">Todos los centros</option>
            {centros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        {loading || !data ? <div className="h-sub">Cargando…</div> : (
          <div className="panel" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th><th>Centro</th>
                  {data.modulos.map((m, i) => <th key={m.id} title={m.titulo} style={{ textAlign: 'center' }}>{i + 1}</th>)}
                  <th style={{ textAlign: 'right' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {data.usuarios.length === 0 && <tr><td colSpan={data.modulos.length + 3} style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)' }}>Sin usuarios administradora.</td></tr>}
                {data.usuarios.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.nombre}</b><div className="h-sub" style={{ margin: 0 }}>{u.email}</div></td>
                    <td>{u.centro}</td>
                    {data.modulos.map((m) => {
                      const p = u.progreso[m.id]
                      if (completado(p)) return <td key={m.id} style={{ textAlign: 'center', color: 'var(--ok)' }} title={`Quiz aprobado ${fmt(p.quizAprobadoAt)} · ${p.intentos} intento(s)`}>✓ {fmt(p.quizAprobadoAt)}</td>
                      if (p?.tourVistoAt) return <td key={m.id} style={{ textAlign: 'center', color: 'var(--warn)' }} title={`Tour visto ${fmt(p.tourVistoAt)} · ${p.intentos} intento(s) de quiz`}>tour</td>
                      if (p?.quizAprobadoAt) return <td key={m.id} style={{ textAlign: 'center', color: 'var(--warn)' }} title={`Quiz 3/3 ${fmt(p.quizAprobadoAt)} · falta el recorrido`}>quiz</td>
                      return <td key={m.id} style={{ textAlign: 'center', color: 'var(--text-faint)' }}>—</td>
                    })}
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: u.pct === 100 ? 'var(--ok)' : 'var(--text)' }}>{u.pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', color: 'var(--text-dim)', fontSize: 12 }}>
              Módulos: {data.modulos.map((m, i) => `${i + 1} ${m.titulo}`).join(' · ')}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
```

(`<Sidebar rol="admin_general"/>` es exactamente como lo invoca `app/dashboard/usuarios/page.js`.)

- [ ] **Step 2: Ítem de menú admin** — en `components/Sidebar.js`, `adminItems`, después de "Metas":
```js
    { label: 'Entrenamiento', icon: 'check', href: '/dashboard/entrenamiento' },
```

- [ ] **Step 3: Comprobar** — entrar como admin_general → `/dashboard/entrenamiento` muestra la matriz; filtrar por Condado del Rey; la fila del usuario que completó un módulo muestra `✓ dd/mm`.

- [ ] **Step 4: Commit** (Hermes)

```bash
git add app/dashboard/entrenamiento/page.js components/Sidebar.js
git commit -m "feat(entrenamiento): matriz de progreso por usuario y módulo para gerencia"
```

---

### Task 10: Script de audio con ElevenLabs (no se ejecuta en PR 1)

**Files:**
- Create: `scripts/entrenamiento-audio.mjs`
- Modify: `package.json` (script)

- [ ] **Step 1: Crear el script**

```js
// Genera los clips de voz del entrenamiento con ElevenLabs (voz clonada de
// Fernando) y mantiene lib/entrenamiento/audio-manifest.json con un hash por
// clip: solo regenera lo que cambió de texto. Se corre en la Mac; los mp3 se
// commitean en public/entrenamiento/.
//   node scripts/entrenamiento-audio.mjs --muestra      # 3 clips de audición
//   node scripts/entrenamiento-audio.mjs                # todo lo que falte/cambió
//   node scripts/entrenamiento-audio.mjs --solo llenado # un módulo
// API key: ELEVENLABS_API_KEY en el entorno o en ~/.studio-reels-assembler/credentials.env
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULOS } from '../lib/entrenamiento/modulos.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const MANIFEST = join(ROOT, 'lib/entrenamiento/audio-manifest.json')
const PUB = join(ROOT, 'public/entrenamiento')
const VOICE_ID = 'I0uPgrx2Hf3g0QzMYLnq' // clon profesional de Fernando
const SETTINGS = { model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.38, similarity_boost: 0.85, style: 0.45, use_speaker_boost: true, speed: 1.0 } }

function apiKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY
  try {
    const env = readFileSync(join(homedir(), '.studio-reels-assembler/credentials.env'), 'utf8')
    const m = env.match(/^ELEVENLABS_API_KEY=["']?([^"'\n]+)/m)
    if (m) return m[1]
  } catch {}
  throw new Error('Falta ELEVENLABS_API_KEY')
}

const args = process.argv.slice(2)
const MUESTRA = args.includes('--muestra')
const SOLO = args.includes('--solo') ? args[args.indexOf('--solo') + 1] : null

// Clips a producir: intro de cada módulo + cada paso.
const clips = []
for (const m of MODULOS) {
  if (SOLO && m.id !== SOLO) continue
  clips.push({ clave: `${m.id}/intro`, file: `${m.id}/intro.mp3`, texto: m.intro.voz || m.intro.texto })
  for (const p of m.pasos) clips.push({ clave: `${m.id}/${p.id}`, file: `${m.id}/${p.id}.mp3`, texto: p.voz || p.texto })
}
const MUESTRAS = new Set(['meta/intro', 'aperturar/ap-1', 'llenado/ll-3'])
const lista = MUESTRA ? clips.filter((c) => MUESTRAS.has(c.clave)) : clips

const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}
const hashDe = (texto) => createHash('sha1').update(texto + JSON.stringify(SETTINGS)).digest('hex').slice(0, 12)

let generados = 0, saltados = 0
for (const c of lista) {
  const hash = hashDe(c.texto)
  const destino = join(PUB, c.file)
  if (manifest[c.clave]?.hash === hash && existsSync(destino)) { saltados++; continue }
  mkdirSync(dirname(destino), { recursive: true })
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_64`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: c.texto, ...SETTINGS }),
  })
  if (!res.ok) { console.error(`✗ ${c.clave}: ${res.status} ${await res.text()}`); process.exitCode = 1; continue }
  const buf = Buffer.from(await res.arrayBuffer())
  writeFileSync(destino, buf)
  // Duración aproximada: mp3 a 64 kbps → bytes*8/64000 segundos.
  manifest[c.clave] = { hash, file: c.file, seg: Math.round((buf.length * 8) / 64000) }
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + '\n')
  generados++
  console.log(`✓ ${c.clave} (${manifest[c.clave].seg}s)`)
}
console.log(`\n${generados} generados · ${saltados} sin cambios · manifest: ${Object.keys(manifest).length} clips`)
```

- [ ] **Step 2: `package.json`** — en `scripts` agregar:
```json
    "entrenamiento:audio": "node scripts/entrenamiento-audio.mjs"
```

- [ ] **Step 3: Verificar que el script carga sin llamar a la API**

Run: `node -e "import('./scripts/entrenamiento-audio.mjs')" 2>&1 | head -3` — NO: eso dispararía llamadas. En su lugar, comprobar sintaxis: `node --check scripts/entrenamiento-audio.mjs`
Expected: sin salida (sintaxis OK). La prueba del seguro (`manifest` vs mp3) sigue en verde con el manifest vacío.

- [ ] **Step 4: Commit** (Hermes)

```bash
git add scripts/entrenamiento-audio.mjs package.json
git commit -m "feat(entrenamiento): script de generación de voz con ElevenLabs y manifest de clips"
```

---

### Task 11: Verificación final, prueba E2E y PR 1

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: todas las pruebas existentes + las de `entrenamiento` en verde. `npm run build` OK.

- [ ] **Step 2: Smoke E2E en navegador** (Sonnet 5 o Playwright, sobre el worktree con `npm run dev` o sobre el preview de Vercel):
  1. Login como administradora de Condado del Rey (usuario temporal creado por Hermes).
  2. `/centro/6/entrenamiento` → 9 tarjetas Pendiente, anillo 0/9.
  3. Módulo `aperturar` → Iniciar recorrido → spotlight sobre "➕ Aperturar grupo" → clic → modal abierto, paso 2 sobre "Número de grupo" → Siguiente × 5 → paso 7 "Haz clic en Cancelar" → clic → paso 8 → Terminar ✓ → vuelve a la página del módulo con "Recorrido visto".
  3b. **Sin recargar**, ir a `clase-prueba` → Iniciar recorrido → llegar al último paso → el botón dice "Terminar ✓" y está habilitado → Terminar funciona (el estado del tour anterior no contamina). Volver a `aperturar` → Repetir recorrido → arranca en el paso 1 sin spotlight residual.
  3c. Con la página desplazada (p. ej. pestaña Fusiones), pulsar Siguiente: la página NO salta arriba y Network no muestra `?_rsc=` por clic.
  4. Quiz: responder mal una → "2 de 3" con explicación; Intentar de nuevo; 3/3 → "✓ Módulo completado".
  5. Índice: tarjeta `aperturar` verde con fecha; menú muestra `1/9`; Resumen muestra banner "1 de 9".
  6. Módulo `meta` → paso 4 (hazlo sobre "Ruta de Nivel" del menú) → el clic navega a `/centro/6/ruta-nivel?tour=meta&paso=5` y el tour continúa.
  6b. Módulo `meta` → paso 4 → clic en **Omitir este paso** (sin tocar el menú) → la URL pasa igualmente a `/centro/6/ruta-nivel?tour=meta&paso=5` y el spotlight cae sobre la barra de nivel. Luego **← Anterior** vuelve a `/centro/6?tour=meta&paso=4` (la página origen).
  6c. Recargar en frío `/centro/6/grupos?tour=llenado&paso=1`: mientras dice "Cargando…" la tarjeta avisa "Todavía no veo…" y al cargar pasa sola al spotlight.
  7. Módulo `cierre` → el paso 3 navega a KPI y sigue; Esc sale y quita `?tour`.
  8. Login como admin_general → `/dashboard/entrenamiento` → fila del usuario con `✓ dd/mm` en módulo 3. Ir a un centro (`/centro/6`): el ítem Entrenamiento existe pero **sin badge** y Resumen **sin banner**.
  9. `?tour=aperturar&paso=99` → no revienta (paso fuera de rango: `step` es null → no renderiza).
  10. Borrar el usuario temporal.

- [ ] **Step 3: PR**

```bash
git push -u origin feat/entrenamiento
gh pr create --title "Entrenamiento en-app para administradoras: tour guiado, quiz y progreso" --body "$(cat <<'EOF'
## Qué
Módulo de entrenamiento dentro del sistema: tour guiado sobre la UI real (motor propio, `data-tour`), quiz 3/3 por módulo, progreso por usuario (menú `n/9`, banner en Resumen) y matriz para gerencia. 9 módulos con contenido en código, errores frecuentes y FAQ. Spec: docs/superpowers/specs/2026-08-23-entrenamiento-administradoras-design.md.

## Sin audio todavía
PR 2 trae los mp3 (voz clonada de Fernando) tras la audición de 3 muestras. El motor ya lee el manifest; con manifest vacío las tarjetas son solo texto.

## Seguro de mantenimiento
`test/entrenamiento.test.mjs` falla si un `data-tour` del contenido desaparece del código.

## Migración
`entrenamiento_progreso` (aplicada en Neon con `npm run db:migrate`).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---

## Self-review (hecho al escribir el plan)

- **Cobertura del spec:** §3 regla de seguridad → contenido (Task 2) sin hazlo en confirmar; §4 archivos → todos en el mapa; §5 tabla → Task 1; §6 esquema → Task 2 + pruebas; §7 atributos → Task 4; §8 motor → Task 5 (fallback ausente, hazlo con ruta, audio, teclado, Terminar → marcarTourVisto); §9 páginas → Tasks 7, 8, 9; §10 actions → Task 6; §11 audio → Task 10 (gate humano antes del lote); §12 seguro → Tasks 1-3 (los 7 puntos: 1→Task 3, 2→Task 2, 3→Task 2 regex de ruta, 4→Task 2 warn, 5→manifest vacío en PR 1 (la verificación mp3↔manifest se agrega en PR 2), 6→Task 1, 7→Task 1); §13 entrega → Task 11.
- **Consistencia de nombres:** `cargarProgreso / marcarTourVisto / responderQuiz / resumenProgreso / matrizProgreso` iguales en Tasks 6, 7, 8, 9. Forma de progreso `{ tourVistoAt, quizAprobadoAt, intentos, ultimoPuntaje }` igual en lib, action y páginas. `manifest[`${modulo}/${paso}`]` y `${modulo}/intro` iguales en TourHost, página de módulo y script.
- **Sin placeholders.** Los únicos puntos "adaptar a la forma real" son posicionales (qué contenedor envuelve qué) en Task 4; el qué y el valor exacto del atributo están definidos.
