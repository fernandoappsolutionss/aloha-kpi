# Semana de cierre con estadísticas, condiciones y cuotas — plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada centro de ALOHA se dirija por semanas: estadísticas automáticas de viernes a jueves, gráfica que muestra la condición, fórmula oficial con objetivos por paso, cuotas aprobadas por el coordinador y un tablero claro para gerencia; y quitar el FODA.

**Architecture:** Lógica pura en `lib/` (semana, cálculo de estadísticas, lectura de condición, fórmulas, gráfica, cuotas, plan) probada con `node --test`; una capa de servidor que carga datos de Neon y del CRM y guarda fotos semanales en tablas nuevas; Server Actions registradas en `lib/access-matrix.mjs`; pantallas cliente que siguen el patrón de `app/centro/[id]/*`. Un cron diario recalcula y congela las semanas.

**Tech Stack:** Next.js 15 App Router (JS, sin TypeScript), React 18, `@neondatabase/serverless` (`sql`, `withTransaction` de `lib/db.js`), `node:test`, Playwright para e2e, Vercel Cron.

**Diseño aprobado:** `docs/superpowers/specs/2026-10-01-aloha-kpi-semana-hca-design.md`. Léelo completo antes de empezar: ahí están las definiciones exactas y las decisiones que no se reabren.

---

## Reglas para quien implementa

1. **Antes de escribir código**, recorre el plan contra el código real de `origin/main`. Si encuentras algo que hace imposible una tarea tal como está escrita (un archivo que no existe, una función con otra firma, un permiso que choca), **detente y repórtalo** con archivo y línea. Si es una diferencia menor (un nombre, una ruta), ajústala, sigue y anótala en el reporte final.
2. **No ejecutes comandos git** (ni `add`, ni `commit`, ni `checkout`, ni `stash`). Quien te lanzó hace los commits al final de cada fase.
3. **No toques la base de datos de producción** ni variables de Vercel. Las migraciones se escriben como archivos + script con modo solo lectura por defecto; las aplica Fernando.
4. Toda Server Action o Route Handler nuevo o borrado se refleja en `lib/access-matrix.mjs`; si no, falla `test/backend-access-matrix.test.mjs`.
5. Vocabulario visible: condición, fórmula, cuota, plan de batalla, producto del puesto, semana de cierre. **Prohibido** en texto visible: "HCA", "Hubbard", "hat", "PFV", "producto final valioso", "checksheet", "drill", "gradiente", "palabra malentendida" (lo vigila `test/entrenamiento-marca-oficio.test.mjs`).
6. Lógica nueva = módulo puro en `lib/` con su test en `test/*.test.mjs` primero (TDD). Las pantallas no calculan nada que no venga de esos módulos.
7. "Sin dato" nunca se muestra como 0.
8. Al terminar cada fase corre `npm test` y `npm run build`. Las dos tienen que pasar. Reporta los conteos.
9. Implementa **solo la fase que te pidan**. Cada fase termina con todo en verde.

## Mapa de archivos

**Nuevos (lógica pura):**
- `lib/semana-cierre.mjs` — semana viernes..jueves, plazos, zona horaria del centro.
- `lib/estadisticas-semana/catalogo.mjs` — las 5 estadísticas del centro.
- `lib/estadisticas-semana/calculo.mjs` — cálculo puro de cada estadística.
- `lib/grafica-semanal.mjs` — modelo de la gráfica (escala, tramos azul/rojo).
- `lib/condiciones/formulas.mjs` — condiciones y texto oficial de las fórmulas.
- `lib/condiciones/lectura.mjs` — lectura automática y discrepancia.
- `lib/plan-semana.mjs` — pendientes, estado del plan, cambio de condición.
- `lib/cuotas-semana.mjs` — propuesta de cuota y ritmo.

**Nuevos (servidor y UI):**
- `lib/estadisticas-semana/servicio.js` — carga datos, calcula, guarda fotos.
- `app/actions/semana.js` — Server Actions de la pestaña Semana, tablero y reunión.
- `app/api/cron/estadisticas-semana/route.js` — cron diario.
- `app/centro/[id]/semana/page.js`, `app/centro/[id]/peticiones/page.js`, `app/dashboard/reunion-semanal/page.js`.
- `components/semana/GraficaSemanal.js`, `TarjetaEstadistica.js`, `PlanSemana.js`, `TableroSemanal.js`, `CuotasSemana.js`.
- `db/migrations/2026-10-01-estadisticas-semana.sql`, `2026-10-01-plan-semana.sql`, `2026-10-01-cuotas-semana.sql`; `scripts/migrate-semana.mjs`.
- `scripts/backfill-estadisticas-semana.mjs`, `scripts/calibrar-lectura-condicion.mjs`, `scripts/conciliar-poblacion-semanal.mjs`.

**Modificados:** `lib/kpi-semanal-auto.mjs` (extraer canónico), `lib/kpi-auto-server.js` (extraer carga de clases CRM), `app/api/cron/cobranza-zoho/route.js` (escribir `cobranza_diaria`), `components/centro-navigation.mjs`, `components/Sidebar.js`, `app/dashboard/page.js`, `app/centro/[id]/kpi/page.js`, `lib/access-matrix.mjs`, `lib/auth.js`, `middleware.js` (si hace falta), `vercel.json`, contenido de entrenamiento (F5).

**Borrados (F1):** `app/actions/foda.js`, `lib/foda-datos.mjs`, `components/encuestas/EncuestasFoda.js`, `test/foda-datos.test.mjs`.

---

# FASE F1 — FODA fuera, Peticiones a su propia pestaña

### Task F1.1: Pestaña Peticiones

**Files:**
- Create: `app/centro/[id]/peticiones/page.js`
- Modify: `app/centro/[id]/foda/page.js` (pasa a ser redirección)
- Modify: `components/centro-navigation.mjs`
- Modify: `lib/peticion-notificaciones.mjs:31`, `lib/entrenamiento/peticiones.js:7`
- Test: `test/centro-navigation.test.mjs`, `test/peticion-notificaciones.test.mjs`

- [ ] **Step 1: Actualizar los tests de navegación primero.** En `test/centro-navigation.test.mjs` cambia la expectativa de las pestañas del grupo KPI a:

```js
assert.deepEqual(seccionesCentro(7, 'kpi').map((s) => s.label),
  ['KPI Mensual', 'Cumplimiento', 'Encuestas', 'Peticiones', 'Historial'])
assert.equal(seccionesCentro(7, 'kpi')[3].href, '/centro/7/peticiones')
assert.equal(hrefKpiMensual('/centro/7/peticiones'), '/centro/7/kpi')
assert.equal(hrefKpiMensual('/centro/7/foda'), '/centro/7/kpi')
```

En `test/peticion-notificaciones.test.mjs` cambia las expectativas del enlace del correo de `/centro/<id>/foda` a `/centro/<id>/peticiones`.

- [ ] **Step 2: Correr y ver fallar.** Run: `node --test test/centro-navigation.test.mjs test/peticion-notificaciones.test.mjs` — Expected: FAIL en las aserciones nuevas.

- [ ] **Step 3: Implementar.**
  - `components/centro-navigation.mjs`: en el grupo `kpi` reemplaza `{ label: 'FODA', href: \`${base}/foda\` }` por `{ label: 'Peticiones', href: \`${base}/peticiones\` }`; en la regex de `hrefKpiMensual` agrega `peticiones` y `semana` (deja `foda` para la redirección): `/^\/centro\/([^/]+)\/(?:kpi|cumplimiento|encuestas|foda|peticiones|semana|historial)(?:\/|$)/`.
  - `app/centro/[id]/peticiones/page.js`: página cliente con el mismo marco que hoy usa `app/centro/[id]/foda/page.js` (Sidebar, encabezado del centro, pestañas `seccionesCentro(id, 'kpi')`) pero con un único contenido: el `PeticionesPanel` con las mismas props que recibe hoy en `foda/page.js:292-299` (trimestre y año actuales con el selector de período que ya usa esa página). Mueve a esta página solo el código del panel y su selector de período; no copies el formulario FODA ni `EncuestasFoda`.
  - `app/centro/[id]/foda/page.js`: reemplaza todo por un Server Component que redirige:

```js
import { redirect } from 'next/navigation'

export default async function FodaRedirect({ params }) {
  const { id } = await params
  redirect(`/centro/${id}/peticiones`)
}
```

  - `lib/peticion-notificaciones.mjs:31` y `lib/entrenamiento/peticiones.js:7`: cambia `/foda` por `/peticiones`.
  - Renombra en `app/globals.css` las clases `.foda-*` a `.peticiones-*` y actualiza su uso en `components/foda/*`; mueve esos 5 componentes a `components/peticiones/` y corrige los imports.

- [ ] **Step 4: Correr.** `node --test test/centro-navigation.test.mjs test/peticion-notificaciones.test.mjs test/foda-peticiones-ui.test.mjs` — Expected: PASS (renombra `test/foda-peticiones-ui.test.mjs` a `test/peticiones-ui.test.mjs` y ajusta sus rutas de import).

### Task F1.2: Borrar FODA

**Files:**
- Delete: `app/actions/foda.js`, `lib/foda-datos.mjs`, `components/encuestas/EncuestasFoda.js`, `test/foda-datos.test.mjs`
- Modify: `lib/access-matrix.mjs:124-125`, `components/encuestas/EncuestasPanel.js:76-78`, `lib/encuestas/domain.mjs:60`, `app/actions/encuestas.js:5,45`, `scripts/verify-master-access-http.mjs:46,52,74`, `README.md`
- Test: `test/responsive-ui.test.mjs:46,125`, `tests/e2e/center-reports.spec.js`, `tests/e2e/responsive-states.spec.js`, `tests/e2e/accessibility.spec.js`, `tests/e2e/helpers/r10-fixture.mjs`, `tests/e2e/helpers/r10-audit.mjs`

- [ ] **Step 1:** Quita del test de la matriz de acceso y de `lib/access-matrix.mjs` las entradas `app/actions/foda.js#loadFoda` y `#saveFoda`.
- [ ] **Step 2:** Borra los cuatro archivos. Quita el botón "Abrir FODA" de `EncuestasPanel.js`, la función `textoFoda` de `lib/encuestas/domain.mjs` y `resumenEncuestasTrimestre` de `app/actions/encuestas.js` **solo si** nadie más la usa (`grep -rn resumenEncuestasTrimestre app components lib`); si alguien más la usa, déjala.
- [ ] **Step 3:** Actualiza los tests unitarios y e2e que navegaban a `/foda`: lo que probaban de peticiones pasa a `/peticiones`; lo que probaban del formulario FODA se borra. `scripts/verify-master-access-http.mjs`: cambia `/foda` por `/peticiones`.
- [ ] **Step 4:** Verifica que no quede código vivo: `grep -rni "foda" app components lib scripts test tests --include=*.js --include=*.mjs | grep -v "foda/page.js"` — Expected: solo coincidencias en `lib/entrenamiento/**` (eso es F5) y en `app/centro/[id]/foda/page.js` (la redirección). Ojo: el contenido de entrenamiento NO se toca en F1.
- [ ] **Step 5:** `npm test` y `npm run build` — Expected: PASS.

**La tabla `foda` no se toca** (no se borra, no hay migración).

---

# FASE F2 — Semana de cierre, estadísticas automáticas, gráfica, pestaña Semana (lectura) y tablero

### Task F2.1: `lib/semana-cierre.mjs`

**Files:**
- Create: `lib/semana-cierre.mjs`
- Test: `test/semana-cierre.test.mjs`

- [ ] **Step 1: Test.**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  juevesDeCierre, rangoSemana, ultimasSemanas, sumarDias, diaDeSemana,
  fechaCivil, semanaAbierta, plazoCondicionVencido, mesesDeSemana, zonaHorariaCentro,
} from '../lib/semana-cierre.mjs'

test('el jueves de cierre de cada día', () => {
  assert.equal(juevesDeCierre('2026-10-01'), '2026-10-01') // jueves
  assert.equal(juevesDeCierre('2026-10-02'), '2026-10-08') // viernes abre la semana siguiente
  assert.equal(juevesDeCierre('2026-09-26'), '2026-10-01') // sábado
  assert.equal(juevesDeCierre('2026-09-28'), '2026-10-01') // lunes
  assert.equal(juevesDeCierre('2026-12-31'), '2026-12-31')
  assert.equal(juevesDeCierre('2027-01-01'), '2027-01-07')
})

test('rango viernes..jueves y validación', () => {
  assert.deepEqual(rangoSemana('2026-10-01'), { desde: '2026-09-25', hasta: '2026-10-01' })
  assert.throws(() => rangoSemana('2026-09-30'), /no es jueves de cierre/)
  assert.throws(() => juevesDeCierre('2026-02-30'), /Fecha inválida/)
  assert.throws(() => juevesDeCierre(null), /Fecha inválida/)
})

test('últimas semanas en orden ascendente', () => {
  assert.deepEqual(ultimasSemanas('2026-10-01', 3), ['2026-09-17', '2026-09-24', '2026-10-01'])
  assert.equal(ultimasSemanas('2026-10-01').length, 12)
  assert.equal(sumarDias('2026-02-28', 1), '2026-03-01')
})

test('día de la semana: viernes 1 … jueves 7', () => {
  assert.equal(diaDeSemana('2026-09-25'), 1)
  assert.equal(diaDeSemana('2026-09-28'), 4)
  assert.equal(diaDeSemana('2026-10-01'), 7)
})

test('fecha civil por zona horaria', () => {
  const instante = new Date('2026-10-01T04:30:00Z')
  assert.equal(fechaCivil(instante, 'America/Panama'), '2026-09-30')
  assert.equal(fechaCivil(instante, 'America/Caracas'), '2026-10-01')
  assert.equal(semanaAbierta(instante, 'America/Panama'), '2026-10-01')
})

test('plazo de la condición: viernes 10:00 hora del centro', () => {
  const tz = 'America/Panama'
  assert.equal(plazoCondicionVencido('2026-10-01', new Date('2026-10-01T20:00:00Z'), tz), false)
  assert.equal(plazoCondicionVencido('2026-10-01', new Date('2026-10-02T14:59:00Z'), tz), false)
  assert.equal(plazoCondicionVencido('2026-10-01', new Date('2026-10-02T15:00:00Z'), tz), true)
  assert.equal(plazoCondicionVencido('2026-10-01', new Date('2026-10-03T12:00:00Z'), tz), true)
})

test('meses que toca una semana', () => {
  assert.deepEqual(mesesDeSemana('2026-10-01'), [{ year: 2026, month: 9 }, { year: 2026, month: 10 }])
  assert.deepEqual(mesesDeSemana('2026-09-24'), [{ year: 2026, month: 9 }])
})

test('zona horaria del centro por país', () => {
  assert.equal(zonaHorariaCentro({ pais: 'VE' }), 'America/Caracas')
  assert.equal(zonaHorariaCentro({ pais: 'PA' }), 'America/Panama')
  assert.equal(zonaHorariaCentro({}), 'America/Panama')
})
```

- [ ] **Step 2:** `node --test test/semana-cierre.test.mjs` — Expected: FAIL (módulo no existe).

- [ ] **Step 3: Implementación.**

```js
// Semana de cierre de ALOHA: viernes..jueves (fechas civiles), nombrada por su
// jueves de cierre. Puro: todo en ISO 'YYYY-MM-DD', sin depender de la zona
// horaria del servidor. Diseño: docs/superpowers/specs/2026-10-01-aloha-kpi-semana-hca-design.md
const RE_ISO = /^\d{4}-\d{2}-\d{2}$/
const DIA_MS = 86400000
const JUEVES = 4

function aMs(iso) {
  if (!RE_ISO.test(String(iso || ''))) throw new Error(`Fecha inválida: ${iso}`)
  const [y, m, d] = iso.split('-').map(Number)
  const ms = Date.UTC(y, m - 1, d)
  if (new Date(ms).toISOString().slice(0, 10) !== iso) throw new Error(`Fecha inválida: ${iso}`)
  return ms
}
const aIso = (ms) => new Date(ms).toISOString().slice(0, 10)

export function sumarDias(iso, dias) {
  return aIso(aMs(iso) + dias * DIA_MS)
}

export function juevesDeCierre(iso) {
  const ms = aMs(iso)
  const dow = new Date(ms).getUTCDay()
  return aIso(ms + ((JUEVES - dow + 7) % 7) * DIA_MS)
}

export function rangoSemana(semanaFin) {
  if (juevesDeCierre(semanaFin) !== semanaFin) throw new Error(`${semanaFin} no es jueves de cierre`)
  return { desde: sumarDias(semanaFin, -6), hasta: semanaFin }
}

export function ultimasSemanas(semanaFin, n = 12) {
  rangoSemana(semanaFin)
  return Array.from({ length: n }, (_, i) => sumarDias(semanaFin, -7 * (n - 1 - i)))
}

export function diaDeSemana(iso) {
  const fin = juevesDeCierre(iso)
  return 7 - Math.round((aMs(fin) - aMs(iso)) / DIA_MS)
}

export function fechaCivil(now = new Date(), timeZone = 'America/Panama') {
  return new Date(now).toLocaleDateString('en-CA', { timeZone })
}

export function semanaAbierta(now = new Date(), timeZone = 'America/Panama') {
  return juevesDeCierre(fechaCivil(now, timeZone))
}

export function plazoCondicionVencido(semanaFin, now = new Date(), timeZone = 'America/Panama') {
  const viernes = sumarDias(semanaFin, 1)
  const hoy = fechaCivil(now, timeZone)
  if (hoy !== viernes) return hoy > viernes
  const hora = Number(new Date(now).toLocaleString('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }))
  return hora >= 10
}

export function mesesDeSemana(semanaFin) {
  const { desde, hasta } = rangoSemana(semanaFin)
  const meses = []
  for (const iso of [desde, hasta]) {
    const year = Number(iso.slice(0, 4))
    const month = Number(iso.slice(5, 7))
    if (!meses.some((m) => m.year === year && m.month === month)) meses.push({ year, month })
  }
  return meses
}

export function zonaHorariaCentro(centro = {}) {
  return String(centro?.pais || '').toUpperCase() === 'VE' ? 'America/Caracas' : 'America/Panama'
}
```

- [ ] **Step 4:** `node --test test/semana-cierre.test.mjs` — Expected: PASS.

### Task F2.2: Extraer el canónico de inscripciones (una sola regla)

**Files:**
- Modify: `lib/kpi-semanal-auto.mjs`
- Test: `test/kpi-semanal-auto.test.mjs` (ya existe; agrega un caso)

- [ ] **Step 1:** Agrega al test existente:

```js
import { inscripcionesCanonicas } from '../lib/kpi-semanal-auto.mjs'

test('inscripcionesCanonicas toma el primer evento global por niño', () => {
  const eventos = [
    { id: 9, estudiante_id: 1, fecha: '2026-09-10' },
    { id: 3, estudiante_id: 1, fecha: '2026-08-20' },
    { id: 4, estudiante_id: 2, fecha: '2026-09-01' },
  ]
  assert.deepEqual(inscripcionesCanonicas(eventos).map((e) => e.id).sort(), [3, 4])
})
```

- [ ] **Step 2:** Run: `node --test test/kpi-semanal-auto.test.mjs` — Expected: FAIL (`inscripcionesCanonicas` no exportada).
- [ ] **Step 3:** En `lib/kpi-semanal-auto.mjs` exporta y usa:

```js
export function inscripcionesCanonicas(inscripciones = []) {
  const canonicaPorNino = new Map()
  for (const evento of [...inscripciones].sort(compararEventos)) {
    const key = String(evento.estudiante_id)
    if (!canonicaPorNino.has(key)) canonicaPorNino.set(key, evento)
  }
  return [...canonicaPorNino.values()]
}
```

y dentro de `calcularKpiSemanalAuto` reemplaza el bloque que arma `canonicaPorNino` por `for (const evento of inscripcionesCanonicas(inscripciones)) { … }` sin cambiar nada más.
- [ ] **Step 4:** `node --test test/kpi-semanal-auto.test.mjs` y `npm test` — Expected: PASS, sin cambios en los demás tests.

### Task F2.3: Catálogo y cálculo puro de las estadísticas

**Files:**
- Create: `lib/estadisticas-semana/catalogo.mjs`, `lib/estadisticas-semana/calculo.mjs`
- Test: `test/estadisticas-semana-calculo.test.mjs`

- [ ] **Step 1: Catálogo** (`lib/estadisticas-semana/catalogo.mjs`):

```js
// Las 5 estadísticas semanales del centro. Fijas en código: no hay pantalla
// para configurarlas (YAGNI). `tipo`: 'nivel' (se lee al corte) o 'flujo'
// (se suma en la semana). `inversa`: menos es mejor.
export const ESTADISTICAS_CENTRO = Object.freeze([
  { codigo: 'ninos_activos', nombre: 'Niños activos al cierre', principal: true, tipo: 'nivel', inversa: false, unidad: 'niños',
    fuente: 'Balance del mes cortado el jueves: cierre del mes anterior + inicios de clase + reincorporaciones − retiros' },
  { codigo: 'nuevos_inscritos', nombre: 'Nuevos inscritos', principal: false, tipo: 'flujo', inversa: false, unidad: 'niños',
    fuente: 'Primer evento de inscripción de cada niño, sin traslados ni matrículas anuladas' },
  { codigo: 'retiros', nombre: 'Retiros', principal: false, tipo: 'flujo', inversa: true, unidad: 'niños',
    fuente: 'Retiros operativos de la semana, sin graduados' },
  { codigo: 'facturas_vencidas', nombre: 'Facturas de mensualidad vencidas', principal: false, tipo: 'nivel', inversa: true, unidad: 'facturas',
    fuente: 'Último conteo de Zoho de la semana' },
  { codigo: 'cp_asistidas', nombre: 'Clases de prueba asistidas', principal: false, tipo: 'flujo', inversa: false, unidad: 'asistentes',
    fuente: 'Asistentes del CRM en clases realizadas en la semana' },
])

export const CODIGOS_ESTADISTICA = ESTADISTICAS_CENTRO.map((e) => e.codigo)
export const ESTADISTICA_PRINCIPAL = 'ninos_activos'
export function estadistica(codigo) {
  const e = ESTADISTICAS_CENTRO.find((x) => x.codigo === codigo)
  if (!e) throw new Error(`Estadística desconocida: ${codigo}`)
  return e
}
```

- [ ] **Step 2: Tests del cálculo** (`test/estadisticas-semana-calculo.test.mjs`). Usa fixtures mínimos con la forma real de las filas (`estudiantes`: `id, grupo_id, estado, fecha_inscripcion`; `grupos`: `id, estado, fecha_inicio_clases, itinerario_clases`; `estudiante_eventos`: `id, estudiante_id, tipo, fecha, year, month, origen, motivo, a_grupo_id`). Antes de escribirlos, lee `lib/inicios-clase.mjs` (`iniciosClase`, `retirosActivosMes`) y `lib/anulacion-matricula.mjs` (`matriculaAnulada`) para armar fixtures que esas funciones acepten. Casos obligatorios:

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  poblacionAlCorte, ventasSemana, retirosSemana, cobranzaAlCorte, cpAsistidasSemana,
} from '../lib/estadisticas-semana/calculo.mjs'

// Grupo iniciado en agosto; niños 1-3 inscritos en septiembre.
const grupos = [{ id: 10, estado: 'activo', fecha_inicio_clases: '2026-08-01', itinerario_clases: null }]
const estudiantes = [
  { id: 1, grupo_id: 10, estado: 'activo', fecha_inscripcion: '2026-09-02' },
  { id: 2, grupo_id: 10, estado: 'activo', fecha_inscripcion: '2026-09-24' },
  { id: 3, grupo_id: 10, estado: 'retirado', fecha_inscripcion: '2026-09-03' },
]
const eventos = [
  { id: 1, estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-09-02', year: 2026, month: 9, origen: 'venta', motivo: null, a_grupo_id: 10 },
  { id: 2, estudiante_id: 2, tipo: 'inscripcion', fecha: '2026-09-24', year: 2026, month: 9, origen: 'venta', motivo: null, a_grupo_id: 10 },
  { id: 3, estudiante_id: 3, tipo: 'inscripcion', fecha: '2026-09-03', year: 2026, month: 9, origen: 'traslado', motivo: null, a_grupo_id: 10 },
  { id: 4, estudiante_id: 3, tipo: 'retiro', fecha: '2026-09-23', year: 2026, month: 9, origen: null, motivo: 'ECONOMICO', a_grupo_id: null },
]

test('población al corte del jueves = cierre del mes anterior + movimientos hasta el jueves', () => {
  const r = poblacionAlCorte({ inicioMes: 100, estudiantes, grupos, eventos, corte: '2026-09-24' })
  // inicios: 1 (02-sep), 2 (24-sep), 3 (03-sep) = 3; retiros: 1 (23-sep)
  assert.equal(r.valor, 102)
  assert.deepEqual(r.detalle, { inicioMes: 100, nuevos: 3, reincorporados: 0, retirados: 1 })
  // al 17: inicios 1 y 3 (el 2 entra el 24), sin retiros todavía
  assert.equal(poblacionAlCorte({ inicioMes: 100, estudiantes, grupos, eventos, corte: '2026-09-17' }).valor, 102)
})

test('población sin cierre del mes anterior = sin dato, no cero', () => {
  const r = poblacionAlCorte({ inicioMes: null, estudiantes, grupos, eventos, corte: '2026-09-24' })
  assert.equal(r.valor, null)
  assert.match(r.detalle.error, /cierre del mes anterior/)
})

test('ventas de la semana: canónico, sin traslados', () => {
  assert.equal(ventasSemana({ estudiantes, eventos, desde: '2026-09-18', hasta: '2026-09-24' }).valor, 1)
  assert.equal(ventasSemana({ estudiantes, eventos, desde: '2026-08-28', hasta: '2026-09-03' }).valor, 1) // el traslado no cuenta
})

test('retiros de la semana, sin graduados', () => {
  const conGraduado = [...eventos, { id: 5, estudiante_id: 1, tipo: 'retiro', fecha: '2026-09-22', year: 2026, month: 9, origen: null, motivo: 'GRADUADO', a_grupo_id: null }]
  assert.equal(retirosSemana({ estudiantes, grupos, eventos: conGraduado, desde: '2026-09-18', hasta: '2026-09-24' }).valor, 1)
})

test('cobranza: prefiere cobranza_diaria; si no, kpi_semanas; nunca un día futuro', () => {
  const diaria = [{ fecha: '2026-09-23', vencidas: 7 }, { fecha: '2026-09-24', vencidas: 5 }]
  assert.equal(cobranzaAlCorte({ diaria, filasKpi: [], desde: '2026-09-18', hasta: '2026-09-24', hoy: '2026-09-30' }).valor, 5)
  assert.equal(cobranzaAlCorte({ diaria, filasKpi: [], desde: '2026-09-18', hasta: '2026-09-24', hoy: '2026-09-23' }).valor, 7)
  const sin = cobranzaAlCorte({ diaria: [], filasKpi: [], desde: '2026-09-18', hasta: '2026-09-24', hoy: '2026-09-30' })
  assert.equal(sin.valor, null)
})

test('clases de prueba asistidas en la semana (fecha civil del centro)', () => {
  const clases = [
    { start_date: '2026-09-20T15:00:00Z', status: 'completed', stats: { total: 4, attended: 3, not_attended: 1, pending: 0, paid: 1, won: 1, total_revenue: 0 } },
    { start_date: '2026-09-25T02:00:00Z', status: 'completed', stats: { total: 2, attended: 2, not_attended: 0, pending: 0, paid: 0, won: 0, total_revenue: 0 } },
  ]
  // 2026-09-25T02:00Z es 24-sep 21:00 en Panamá: cuenta en la semana del 24
  const r = cpAsistidasSemana({ clases, desde: '2026-09-18', hasta: '2026-09-24', timeZone: 'America/Panama', now: new Date('2026-09-30T12:00:00Z') })
  assert.equal(r.valor, 5)
})
```

Agrega también un caso de reincorporación (evento `reincorporacion` el 2026-09-22 suma 1 a la población del 24) y uno de retiro sin fecha (cuenta el último día del mes: entra en la semana que contiene el 30-sep y no en la del 24).

- [ ] **Step 3:** Run: `node --test test/estadisticas-semana-calculo.test.mjs` — Expected: FAIL.

- [ ] **Step 4: Implementación** (`lib/estadisticas-semana/calculo.mjs`). Reglas exactas:

```js
// Cálculo puro de las estadísticas semanales del centro. Reusa las MISMAS
// reglas del KPI mensual (inicios de clase, retiros operativos, canónico de
// inscripción): jamás una segunda copia del criterio.
import { iniciosClase, retirosActivosMes } from '../inicios-clase.mjs'
import { inscripcionesCanonicas } from '../kpi-semanal-auto.mjs'
import { eventosSinMatriculasAnuladas } from '../anulacion-matricula.mjs'
import { semanaDiaKpi } from '../zoho-cobranza.mjs'
import { filtrarClasesPorMomento, resumirClases } from '../clases-prueba.mjs'
import { sumarDias, fechaCivil } from '../semana-cierre.mjs'

const iso10 = (v) => (!v ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10))
const finDeMes = (y, m) => `${y}-${String(m).padStart(2, '0')}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
const enRango = (f, desde, hasta) => Boolean(f) && f >= desde && f <= hasta

export function poblacionAlCorte({ inicioMes, estudiantes = [], grupos = [], eventos = [], corte }) {
  if (inicioMes == null) return { valor: null, detalle: { error: 'Falta el cierre del mes anterior.' } }
  const y = Number(corte.slice(0, 4)); const m = Number(corte.slice(5, 7))
  const prefijo = corte.slice(0, 7); const primero = `${prefijo}-01`; const fin = finDeMes(y, m)
  const nuevos = iniciosClase(estudiantes, grupos, eventos)
    .filter((f) => f.fechaInicio.startsWith(prefijo) && f.fechaInicio <= corte).length
  const delMes = (e) => (e.year != null && e.month != null) ? Number(e.year) === y && Number(e.month) === m : iso10(e.fecha)?.startsWith(prefijo)
  const reincorporados = eventos.filter((e) => e.tipo === 'reincorporacion' && delMes(e) && (iso10(e.fecha) || fin) >= primero && (iso10(e.fecha) || fin) <= corte).length
  const retirados = retirosActivosMes(estudiantes, grupos, eventos, y, m)
    .filter((e) => (iso10(e.fecha) || fin) <= corte).length
  return { valor: Number(inicioMes) + nuevos + reincorporados - retirados, detalle: { inicioMes: Number(inicioMes), nuevos, reincorporados, retirados } }
}

export function ventasSemana({ estudiantes = [], eventos = [], desde, hasta }) {
  const canon = inscripcionesCanonicas(eventosSinMatriculasAnuladas(estudiantes, eventos).filter((e) => e.tipo === 'inscripcion'))
  let valor = 0; let sinFecha = 0
  for (const e of canon) {
    const f = iso10(e.fecha)
    if (!f) { sinFecha += 1; continue }
    if (e.origen === 'traslado') continue
    if (enRango(f, desde, hasta)) valor += 1
  }
  return { valor, detalle: sinFecha ? { excluidosSinFecha: sinFecha } : {} }
}

export function retirosSemana({ estudiantes = [], grupos = [], eventos = [], desde, hasta }) {
  const meses = new Map()
  for (const f of [desde, hasta]) meses.set(f.slice(0, 7), { y: Number(f.slice(0, 4)), m: Number(f.slice(5, 7)) })
  let valor = 0
  for (const { y, m } of meses.values()) {
    const fin = finDeMes(y, m)
    valor += retirosActivosMes(estudiantes, grupos, eventos, y, m)
      .filter((e) => String(e.motivo || '').toUpperCase() !== 'GRADUADO')
      .filter((e) => enRango(iso10(e.fecha) || fin, desde, hasta)).length
  }
  return { valor, detalle: {} }
}

export function cobranzaAlCorte({ diaria = [], filasKpi = [], desde, hasta, hoy }) {
  const tope = hoy < hasta ? hoy : hasta
  for (let d = tope; d >= desde; d = sumarDias(d, -1)) {
    const fila = diaria.find((r) => iso10(r.fecha) === d)
    if (fila) return { valor: Number(fila.vencidas), detalle: { fecha: d, fuente: 'cobranza_diaria' } }
  }
  for (let d = tope; d >= desde; d = sumarDias(d, -1)) {
    const casilla = semanaDiaKpi(d)
    if (!casilla) continue
    const fila = filasKpi.find((r) => Number(r.year) === Number(d.slice(0, 4)) && Number(r.month) === Number(d.slice(5, 7)) && Number(r.semana) === casilla.semana)
    const v = fila?.[`cob_d${casilla.dia}`]
    if (v != null) return { valor: Number(v), detalle: { fecha: d, fuente: 'kpi_semanas' } }
  }
  return { valor: null, detalle: { error: 'No hay conteo de Zoho en la semana.' } }
}

export function cpAsistidasSemana({ clases = [], desde, hasta, timeZone = 'America/Panama', now = new Date() }) {
  const realizadas = filtrarClasesPorMomento(clases, 'realizadas', now)
    .filter((c) => enRango(fechaCivil(new Date(c.start_date), c.timezone || timeZone), desde, hasta))
  return { valor: resumirClases(realizadas).attended, detalle: { clases: realizadas.length } }
}
```

Si `semanaDiaKpi` o `retirosActivosMes` tienen otra firma de la que aquí se asume, adapta las llamadas (no las reglas) y anótalo. `kpi_semanas` puede tener ceros falsos en días que el cron de Zoho no corrió (el `INSERT` pone 0 en los demás días); por eso la fuente preferida es `cobranza_diaria`.

- [ ] **Step 5:** `node --test test/estadisticas-semana-calculo.test.mjs` — Expected: PASS.

### Task F2.4: Modelo de la gráfica

**Files:**
- Create: `lib/grafica-semanal.mjs`
- Test: `test/grafica-semanal.test.mjs`

- [ ] **Step 1: Test.**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { modeloGrafica, COLOR_MEJORA, COLOR_EMPEORA } from '../lib/grafica-semanal.mjs'

const p = (valores, extra = {}) => valores.map((valor, i) => ({ semanaFin: `2026-09-${String(3 + i * 7).padStart(2, '0')}`, valor, cuota: null, condicion: null, ...extra }))

test('azul cuando mejora o se mantiene, rojo cuando empeora', () => {
  const m = modeloGrafica({ puntos: p([10, 12, 11, 11]) })
  assert.deepEqual(m.tramos.map((t) => t.color), [COLOR_MEJORA, COLOR_EMPEORA, COLOR_MEJORA])
  assert.ok(m.puntos[1].y < m.puntos[0].y) // 12 queda más arriba que 10
})

test('en las inversas bajar es mejorar y se dibuja hacia arriba', () => {
  const m = modeloGrafica({ puntos: p([5, 3, 4]), inversa: true })
  assert.deepEqual(m.tramos.map((t) => t.color), [COLOR_MEJORA, COLOR_EMPEORA])
  assert.ok(m.puntos[1].y < m.puntos[0].y) // 3 queda más arriba que 5
})

test('sin dato corta la línea y no se vuelve cero', () => {
  const m = modeloGrafica({ puntos: p([10, null, 12]) })
  assert.equal(m.tramos.length, 0)
  assert.equal(m.puntos[1].y, null)
})

test('escala: incluye la cuota, margen, y no baja de 0 si no hay negativos', () => {
  const m = modeloGrafica({ puntos: [{ semanaFin: '2026-09-17', valor: 10, cuota: null }, { semanaFin: '2026-09-24', valor: 11, cuota: 20 }] })
  assert.ok(m.max >= 20)
  assert.equal(modeloGrafica({ puntos: p([0, 1]) }).min, 0)
  const plana = modeloGrafica({ puntos: p([7, 7, 7]) })
  assert.equal(plana.min, 6); assert.equal(plana.max, 8)
})

test('todo sin dato = gráfica vacía', () => {
  const m = modeloGrafica({ puntos: p([null, null]) })
  assert.equal(m.vacia, true); assert.deepEqual(m.tramos, [])
})
```

- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3: Implementación.**

```js
// Modelo puro de la gráfica semanal: escala, coordenadas y tramos coloreados.
// Azul = mejora o se mantiene; rojo = empeora. En las inversas el eje se
// invierte para que mejorar siempre sea subir.
export const COLOR_MEJORA = '#385AE2'
export const COLOR_EMPEORA = '#C8423B'
const MARGEN = { arriba: 16, derecha: 16, abajo: 28, izquierda: 44 }

export function modeloGrafica({ puntos = [], inversa = false, ancho = 640, alto = 220, margen = MARGEN } = {}) {
  const numeros = []
  for (const pt of puntos) {
    if (pt.valor != null) numeros.push(Number(pt.valor))
    if (pt.cuota != null) numeros.push(Number(pt.cuota))
  }
  const w = ancho - margen.izquierda - margen.derecha
  const h = alto - margen.arriba - margen.abajo
  if (!numeros.length) return { ancho, alto, min: 0, max: 1, vacia: true, ticks: [], tramos: [], puntos: puntos.map((pt) => ({ ...pt, x: null, y: null, yCuota: null })) }
  const minDato = Math.min(...numeros); const maxDato = Math.max(...numeros)
  const rango = maxDato - minDato
  const pad = rango === 0 ? 1 : Math.max(rango * 0.1, 1)
  let min = minDato - pad
  const max = maxDato + pad
  if (minDato >= 0 && min < 0) min = 0
  const y = (v) => (inversa ? margen.arriba + ((v - min) / (max - min)) * h : margen.arriba + ((max - v) / (max - min)) * h)
  const n = puntos.length
  const x = (i) => margen.izquierda + (n === 1 ? w / 2 : (i * w) / (n - 1))
  const out = puntos.map((pt, i) => ({ ...pt, x: x(i), y: pt.valor == null ? null : y(Number(pt.valor)), yCuota: pt.cuota == null ? null : y(Number(pt.cuota)) }))
  const tramos = []
  for (let i = 1; i < out.length; i++) {
    const a = out[i - 1]; const b = out[i]
    if (a.valor == null || b.valor == null) continue
    const mejora = inversa ? Number(b.valor) <= Number(a.valor) : Number(b.valor) >= Number(a.valor)
    tramos.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, color: mejora ? COLOR_MEJORA : COLOR_EMPEORA })
  }
  const ticks = [0, 1, 2, 3].map((k) => { const v = min + ((max - min) * k) / 3; return { valor: Math.round(v), y: y(v) } })
  return { ancho, alto, min, max, vacia: false, ticks, tramos, puntos: out }
}
```

- [ ] **Step 4:** Run — Expected: PASS.

### Task F2.5: Migración, script y escritura de `cobranza_diaria`

**Files:**
- Create: `db/migrations/2026-10-01-estadisticas-semana.sql`, `scripts/migrate-semana.mjs`
- Modify: `app/api/cron/cobranza-zoho/route.js`
- Test: `test/migrate-semana.test.mjs`

- [ ] **Step 1: SQL.**

```sql
BEGIN;
CREATE TABLE IF NOT EXISTS estadisticas_semana (
  centro_id    INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  semana_fin   DATE NOT NULL CHECK (EXTRACT(ISODOW FROM semana_fin) = 4),
  codigo       TEXT NOT NULL CHECK (codigo IN ('ninos_activos','nuevos_inscritos','retiros','facturas_vencidas','cp_asistidas')),
  valor        NUMERIC,
  estado       TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','cerrada')),
  detalle      JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (centro_id, semana_fin, codigo)
);
CREATE INDEX IF NOT EXISTS estadisticas_semana_fin_idx ON estadisticas_semana (semana_fin);
CREATE TABLE IF NOT EXISTS cobranza_diaria (
  centro_id     INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  vencidas      INTEGER NOT NULL CHECK (vencidas >= 0),
  registrado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (centro_id, fecha)
);
COMMIT;
```

- [ ] **Step 2: Script** `scripts/migrate-semana.mjs`, copiando el patrón de `scripts/migrate-caja.mjs` (`runMigration(client, { apply, log })`, `cargarEnv`, `conCliente`, solo lectura salvo `--apply`). Debe aplicar, en orden y solo los que existan, los archivos de la lista `MIGRACIONES = ['2026-10-01-estadisticas-semana.sql']` (F3 y F4 agregarán los suyos). En modo solo lectura imprime qué tablas existen (`to_regclass`). Test `test/migrate-semana.test.mjs` con un cliente falso (como el test de migrate-caja si existe; si no, un objeto con `query` que registra llamadas): sin `--apply` no ejecuta SQL de escritura; con `apply` ejecuta los archivos en orden.
- [ ] **Step 3: Cron de cobranza.** En `app/api/cron/cobranza-zoho/route.js`, después de escribir `kpi_semanas` de cada centro, agrega:

```js
try {
  await sql`
    INSERT INTO cobranza_diaria (centro_id, fecha, vencidas) VALUES (${centroId}, ${hoy}, ${vencidas})
    ON CONFLICT (centro_id, fecha) DO UPDATE SET vencidas = EXCLUDED.vencidas, registrado_at = now()`
} catch (error) {
  console.error('[cobranza-zoho] cobranza_diaria no disponible:', error?.message)
}
```

  El `try` es a propósito: si la migración aún no se aplicó, el cron de siempre sigue funcionando. Escribe también en `cobranza_diaria` los centros con mes cerrado (el conteo diario no depende del cierre mensual).

- [ ] **Step 4:** `npm test` — Expected: PASS.

### Task F2.6: Servicio de servidor

**Files:**
- Create: `lib/estadisticas-semana/servicio.js`
- Modify: `lib/kpi-auto-server.js` (extraer `cargarClasesCrm`)
- Test: `test/estadisticas-semana-servicio.test.mjs` (con `query` y `crm` falsos)

- [ ] **Step 1:** En `lib/kpi-auto-server.js` extrae a una función exportada el bloque de `cargarFuenteKpi` que lee `centro_eventos`, pide `list_events` al CRM, valida y filtra (líneas ~137-152), con firma `export async function cargarClasesCrm(centroId, { query = sql, crm = crmCall } = {})` → `{ complete: true, clases }` o `{ complete: false, error }`. `cargarFuenteKpi` pasa a usarla; su comportamiento no cambia (los tests existentes lo cubren). Las clases que devuelve deben traer `start_date`, `status` y `stats` del evento CRM (revisa qué objeto devuelve hoy `filtrarClasesVigentesCrm` y, si solo trae `id` y `start_date`, une cada clase con su evento CRM de `eventosCrm.events` por id para tener `status` y `stats`, igual que hace hoy `fuenteKpiAutomatica` al resumir).
- [ ] **Step 2:** `lib/estadisticas-semana/servicio.js` (server-only, sin `'use server'`), con esta API:

```js
// calcularSemanaCentro(centroId, semanaFin, { query, crm, now }) →
//   { ninos_activos: { valor, detalle }, nuevos_inscritos: {…}, retiros: {…}, facturas_vencidas: {…}, cp_asistidas: {…} }
//   Cada estadística se calcula en su propio try/catch: si una falla queda { valor: null, detalle: { error } } y las demás siguen.
// guardarSemanaCentro(centroId, semanaFin, resultados, { estado = 'abierta', forzar = false, query })
//   Upsert de las 5 filas. Si la fila existente está 'cerrada' y forzar = false, NO la toca.
// recalcularSemanas({ now, query, crm }) → { abiertas, cerradas, errores }
//   Para cada centro: recalcula y guarda la semana abierta (zona horaria del centro); y toda semana 'abierta'
//   con semana_fin < hoy (hora del centro) se recalcula y se guarda 'cerrada'.
// leerSerieCentros(centroIds, semanas, { query }) → filas de estadisticas_semana para esos centros y jueves.
```

  Datos que carga `calcularSemanaCentro` (una vez por llamada):
  - `centros`: `id, nombre, pais` → zona horaria con `zonaHorariaCentro`.
  - `estudiantes` y `grupos`: mismas columnas que `cargarDatosCentro` de `lib/kpi-semanal-service.js` más las que necesite `matriculaAnulada` (revísalo).
  - `estudiante_eventos` con `tipo IN ('inscripcion','retiro','cambio_grupo','reincorporacion')`.
  - `inicioMes`: `cierreMesAnterior(centroId, year, month, query)` de `lib/cadena` para el mes del jueves.
  - `kpi_semanas` de los meses que toca la semana y `cobranza_diaria` del rango.
  - Clases del CRM con `cargarClasesCrm`; si falla, `cp_asistidas` queda sin dato con el error y lo demás sigue.
  - `hoy` = `fechaCivil(now, zona)`. Para la semana abierta, el corte de la población es `min(hoy, semanaFin)`.
- [ ] **Step 3:** Tests con `query` falso (función de template tag que devuelve filas según el texto del SQL) y `crm` falso: (a) una estadística que lanza no tumba a las demás; (b) `guardarSemanaCentro` no pisa una fila cerrada sin `forzar`; (c) `recalcularSemanas` cierra la semana anterior y deja abierta la actual.
- [ ] **Step 4:** `npm test` — Expected: PASS.

### Task F2.7: Server Actions, cron y backfill

**Files:**
- Create: `app/actions/semana.js`, `app/api/cron/estadisticas-semana/route.js`, `scripts/backfill-estadisticas-semana.mjs`, `scripts/conciliar-poblacion-semanal.mjs`
- Modify: `lib/access-matrix.mjs`, `vercel.json`

- [ ] **Step 1: Actions** (`'use server'`), con las guardas de `lib/auth.js` que ya usan acciones del mismo tipo:
  - `getSemanaCentro(centroId)` — `readCentro` (`requireCentroAccess`). Devuelve `{ centro: { id, nombre, zonaHoraria }, semanaAbierta, ultimaCerrada, semanas: ultimasSemanas(semanaAbierta, 12), catalogo: ESTADISTICAS_CENTRO, series: { [codigo]: [{ semanaFin, valor, estado, detalle }] }, puedeEscribir }`. Las semanas sin fila salen con `valor: null`.
  - `actualizarSemanaCentro(centroId)` — `writeCentro` (`requireCurrentWriteCentro`). Recalcula y guarda la semana abierta; devuelve lo mismo que `getSemanaCentro`.
  - `recalcularSemanaCentro(centroId, semanaFin)` — `master` (`requireCurrentMaster`). Recalcula una semana cerrada con `forzar: true`.
  - `getTableroSemanal()` — `readGlobal`, con el alcance de `alcancePanel()` como `getCentrosKpiRango`. **Una sola llamada** que devuelve, por centro: nombre, serie de 12 semanas de `ninos_activos`, último valor cerrado y abierto de las 5 estadísticas y Δ de la semana; y la serie consolidada (suma por semana de los centros con dato en esa semana; si a una semana le falta algún centro, se marca `incompleta: true`).
- [ ] **Step 2: Cron** `app/api/cron/estadisticas-semana/route.js`: `GET` con `rechazoCron(request, process.env.CRON_SECRET)`, `maxDuration = 300`, `dynamic = 'force-dynamic'`, llama a `recalcularSemanas({ now: new Date() })` y responde el resumen. En `vercel.json` agrega `{ "path": "/api/cron/estadisticas-semana", "schedule": "0 11 * * *" }` (06:00 Panamá).
- [ ] **Step 3: Matriz de acceso:** agrega las 4 acciones y la ruta (`ACCESS_KINDS.cron`).
- [ ] **Step 4: Backfill** `scripts/backfill-estadisticas-semana.mjs`: solo lectura por defecto (imprime una tabla centro × semana × estadística), `--apply` guarda. Recorre los jueves desde `2026-08-13` hasta la última semana cerrada y guarda cada una como `cerrada` usando `calcularSemanaCentro` + `guardarSemanaCentro` con `forzar: true`. Acepta `--centro=<id>` y `--desde=<jueves>`.
- [ ] **Step 5: Conciliación** `scripts/conciliar-poblacion-semanal.mjs` (solo lectura): para cada centro y cada mes desde agosto de 2026 cuyo último día sea o caiga en una semana calculable, compara `poblacionAlCorte` en el último día del mes contra el balance del KPI del mismo mes (`resumenConCuadroVivo`/`balanceMensual`, el mismo camino que usa el Resumen del centro) e imprime las diferencias. Ninguna diferencia esperada; si aparecen, se reportan, no se "arreglan" cambiando la regla.
- [ ] **Step 6:** `npm test` — Expected: PASS.

### Task F2.8: Gráfica, tarjetas, pestaña Semana y tablero

**Files:**
- Create: `components/semana/GraficaSemanal.js`, `components/semana/TarjetaEstadistica.js`, `components/semana/TableroSemanal.js`, `app/centro/[id]/semana/page.js`
- Modify: `components/centro-navigation.mjs`, `app/dashboard/page.js`, `middleware.js` (solo si hace falta para que el coach NO entre y los demás sí)
- Test: `test/centro-navigation.test.mjs`, un test de render estático si el repo tiene el patrón (`test/responsive-ui.test.mjs`), e2e en `tests/e2e/`

- [ ] **Step 1:** Navegación: el grupo `kpi` queda `['KPI Mensual', 'Semana', 'Cumplimiento', 'Encuestas', 'Peticiones', 'Historial']` con Semana en `/centro/<id>/semana`. Actualiza el test primero.
- [ ] **Step 2: `GraficaSemanal`** (cliente): recibe `{ puntos, inversa, unidad, titulo, compacta }` y dibuja con `modeloGrafica` un `<svg viewBox="0 0 {ancho} {alto}" width="100%" role="img" aria-label="…">`: líneas de los ticks, una `<line>` por tramo con su color (grosor 3), un círculo por punto con dato (relleno con el color de su condición si tiene; ver `colorCondicion` en F3 — en F2, gris), la cuota como guion horizontal punteado sobre cada semana que la tenga, y etiquetas de semana (día/mes) abajo. En modo `compacta` (minigráfica del tablero) sin ejes ni etiquetas, alto 48. **No uses `<title>` con varios hijos dentro del SVG** (rompe la hidratación de React); el texto accesible va en `aria-label`. Si `vacia`, muestra "Sin datos todavía".
- [ ] **Step 3: `TarjetaEstadistica`**: nombre, valor de la semana abierta ("en curso"), valor de la última cerrada, Δ contra la cerrada anterior (con flecha y color según mejora/empeora considerando `inversa`), la etiqueta "menos es mejor" en las inversas, la fuente (texto del catálogo) y, si la última fila tiene `detalle.error`, el aviso "Sin dato: <error>". Abajo, la `GraficaSemanal`.
- [ ] **Step 4: Página** `app/centro/[id]/semana/page.js`: mismo marco que las demás pestañas del grupo KPI (revisa `app/centro/[id]/cumplimiento/page.js`). Encabezado: "Semana del <viernes> al <jueves>" de la semana abierta y la fecha/hora del último cálculo. La tarjeta de la estadística principal va primero y más grande; las otras 4 en grilla (1 columna en móvil, 2 en escritorio). Botón "Actualizar ahora" solo si `puedeEscribir`. Estados de carga y error con los componentes que ya usa el repo.
- [ ] **Step 5: Tablero** `components/semana/TableroSemanal.js` arriba de todo en `app/dashboard/page.js` (antes de las tarjetas actuales), con una sola llamada a `getTableroSemanal()`: título "Semana de cierre", gráfica consolidada de niños activos (12 semanas, avisando las semanas incompletas), y una tabla (con `TableScroller`, como la tabla de centros actual) con columnas Centro · Niños activos · Δ semana · 12 semanas (minigráfica) · Nuevos · Retiros · Facturas vencidas · Clases de prueba. Cada fila enlaza a `/centro/<id>/semana`. En F3 y F4 se agregan columnas de condición, plan y cuota.
- [ ] **Step 6: Acceso por rol.** Revisa `middleware.js` y `components/access-control.mjs`: `/centro/<id>/semana` y `/centro/<id>/peticiones` deben abrir para quien hoy abre `/centro/<id>/cumplimiento` y **no** para el coach. Agrega o ajusta e2e en `tests/e2e/` que lo prueben si existe el patrón para otras rutas.
- [ ] **Step 7:** `npm test` y `npm run build` — Expected: PASS.

---

# FASE F3 — Condición, fórmula, plan de batalla, lectura y discrepancia

### Task F3.1: Fórmulas oficiales

**Files:**
- Create: `lib/condiciones/formulas.mjs`
- Test: `test/condiciones-formulas.test.mjs`

- [ ] **Step 1: Test** que congela el texto (copia el texto de abajo tal cual en el test; si alguien lo cambia, el test falla):

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CONDICIONES, FORMULAS, pasosDe, claveFormula, colorCondicion } from '../lib/condiciones/formulas.mjs'

test('las fórmulas tienen el texto oficial y el número de pasos correcto', () => {
  assert.equal(FORMULAS.inexistencia.length, 4)
  assert.equal(FORMULAS['peligro:personal'].length, 6)
  assert.equal(FORMULAS['peligro:superior'].length, 6)
  assert.equal(FORMULAS.emergencia.length, 5)
  assert.equal(FORMULAS.normal.length, 4)
  assert.equal(FORMULAS['afluencia:financiera'].length, 4)
  assert.equal(FORMULAS['afluencia:accion'].length, 4)
  assert.equal(FORMULAS.poder.length, 4)
  assert.equal(FORMULAS.cambio_poder.length, 1)
  assert.equal(FORMULAS.emergencia[1], 'Cambie su forma de actuar.')
  assert.ok(!JSON.stringify(FORMULAS).includes('base de operación'))
})

test('clave de fórmula por alcance y variante', () => {
  assert.equal(claveFormula({ condicion: 'peligro' }), 'peligro:personal')
  assert.equal(claveFormula({ condicion: 'peligro', alcancePeligro: 'superior' }), 'peligro:superior')
  assert.equal(claveFormula({ condicion: 'afluencia' }), 'afluencia:accion')
  assert.equal(claveFormula({ condicion: 'afluencia', varianteAfluencia: 'financiera' }), 'afluencia:financiera')
  assert.equal(pasosDe({ condicion: 'normal' })[0].startsWith('La manera de mantener'), true)
  assert.throws(() => pasosDe({ condicion: 'confusion' }), /Condición desconocida/)
})

test('Poder y Cambio de Poder quedan detrás de "Más condiciones"', () => {
  assert.deepEqual(CONDICIONES.filter((c) => c.visible).map((c) => c.codigo), ['inexistencia', 'peligro', 'emergencia', 'normal', 'afluencia'])
  assert.match(colorCondicion('emergencia'), /^#/)
})
```

- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3: Implementación** (texto literal del documento "Las fórmulas de las condiciones" de HCA Venezuela, incluido su cambio de usted a tú; solo se corrigieron erratas de tipeo como "ÁERA", "CUIDADOSATMENTE", "POCA SEVERA" y "conversamos"):

```js
// Condiciones y fórmulas oficiales (material de HCA Venezuela). La fórmula es
// GUÍA: sus pasos no se marcan; debajo de cada paso se escriben objetivos.
// No cambiar el texto sin el documento fuente: lo congela test/condiciones-formulas.test.mjs.
export const CONDICIONES = Object.freeze([
  { codigo: 'inexistencia', nombre: 'Inexistencia', visible: true, color: '#6B7280' },
  { codigo: 'peligro', nombre: 'Peligro', visible: true, color: '#C8423B' },
  { codigo: 'emergencia', nombre: 'Emergencia', visible: true, color: '#E08A1E' },
  { codigo: 'normal', nombre: 'Normal', visible: true, color: '#2E9E5B' },
  { codigo: 'afluencia', nombre: 'Afluencia', visible: true, color: '#385AE2' },
  { codigo: 'poder', nombre: 'Poder', visible: false, color: '#5B3FD1' },
  { codigo: 'cambio_poder', nombre: 'Cambio de Poder', visible: false, color: '#5B3FD1' },
])

export const FORMULAS = Object.freeze({
  inexistencia: [
    'Encuentre una línea de comunicación.',
    'Date a conocer.',
    'Descubra lo que se necesita o se desea.',
    'Hágalo, prodúzcalo y/o preséntelo.',
  ],
  'peligro:personal': [
    'Pase por alto hábitos o rutinas normales.',
    'Resuelva la situación y cualquier peligro que haya en ella.',
    'Asígnese una condición de peligro.',
    'Descubra qué está haciendo que es contrario a los ideales o a los mejores intereses del grupo o actividad y use autodisciplina para corregirlo y vuélvase honesto y recto.',
    'Reorganice su vida para que la situación peligrosa no le esté ocurriendo continuamente.',
    'Formule y adopte una política firme que de aquí en adelante detecte la misma situación e impida que vuelva a ocurrir.',
  ],
  'peligro:superior': [
    'Pase por alto (ignore al subordinado o subordinados que normalmente se encargan del área y resuélvalo personalmente).',
    'Resuelva la situación y cualquier peligro que haya en ella.',
    'Asigne al área en que se tuvo que resolver la situación una condición de peligro.',
    'Asigne a cada individuo relacionado con la condición de peligro una condición de peligro para el subordinado, y haga que sigan la fórmula completamente, asegurándose de que lo hagan.',
    'Reorganice la unidad para que la situación no se repita.',
    'Recomiende cualquier política firme que a partir de entonces detecte la condición o impida que se repita.',
  ],
  emergencia: [
    'Promocione. Eso se aplica a una organización; para un individuo es mejor decir «produzca».',
    'Cambie su forma de actuar.',
    'Economice.',
    'Entonces prepárese para dar el servicio.',
    'Haga más estricta la disciplina.',
  ],
  normal: [
    'La manera de mantener un aumento, cuando se encuentra en un estado de funcionamiento normal, es no cambiar nada.',
    'La ética es muy poco severa. El factor justicia es bastante ligero y bastante razonable. No se toma ninguna medida brutal en particular.',
    'Si una estadística mejora, examínela cuidadosamente y averigüe qué la mejoró, y luego haga eso sin abandonar lo que estaba haciendo antes.',
    'Cada vez que una estadística empeore ligeramente, encuentre rápidamente por qué y remédielo.',
  ],
  'afluencia:financiera': [
    'Economice.',
    'Pague todas sus deudas.',
    'Invierta el resto en mejorar el servicio; haga que sea más factible entregar.',
    'Descubra qué causó la condición de afluencia y refuércelo.',
  ],
  'afluencia:accion': [
    'Economiza en acciones dispersas o innecesarias que no contribuyeron a la condición actual. Economiza financieramente eliminando todo derroche.',
    'Haz que toda acción cuente y no tomes parte en ninguna acción inútil. Cada nueva acción debe contribuir y ser del mismo tipo que la que sí contribuyó.',
    'Consolida todas las ganancias. En cualquier área en que hayamos obtenido una ganancia, la conservamos. No dejes que las cosas se relajen o decaigan o hagan montaña rusa. Cualquier ventaja o ganancia que tengamos, la conservamos, la mantenemos.',
    'Descubre por ti mismo y para ti mismo qué fue lo que causó la condición de afluencia en tu área inmediata y refuérzalo.',
  ],
  poder: [
    'La primera ley de una condición de poder es no desconectarse.',
    'Lo primero que tiene que hacer es elaborar un registro de todas las líneas de comunicación de su trabajo.',
    'La responsabilidad es redactar en detalle todas las funciones y ponerlas en manos de la persona que se va a hacer cargo del puesto.',
    'Haga todo lo posible para hacer que el trabajo o el puesto se pueda ocupar.',
  ],
  cambio_poder: [
    'Cuando asumas un nuevo puesto no cambies nada hasta que te hayas familiarizado totalmente con tu nueva zona de poder.',
  ],
})

export function claveFormula({ condicion, alcancePeligro, varianteAfluencia } = {}) {
  if (condicion === 'peligro') return `peligro:${alcancePeligro === 'superior' ? 'superior' : 'personal'}`
  if (condicion === 'afluencia') return `afluencia:${varianteAfluencia === 'financiera' ? 'financiera' : 'accion'}`
  return condicion
}

export function pasosDe(args = {}) {
  const pasos = FORMULAS[claveFormula(args)]
  if (!pasos) throw new Error(`Condición desconocida: ${args.condicion}`)
  return pasos
}

export function nombreCondicion(codigo) {
  return CONDICIONES.find((c) => c.codigo === codigo)?.nombre || codigo
}

export function colorCondicion(codigo) {
  return CONDICIONES.find((c) => c.codigo === codigo)?.color || '#9CA3AF'
}
```

- [ ] **Step 4:** Run — Expected: PASS.

### Task F3.2: Lectura automática

**Files:**
- Create: `lib/condiciones/lectura.mjs`
- Test: `test/condiciones-lectura.test.mjs`

- [ ] **Step 1: Test.**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { lecturaCondicion, hayDiscrepancia } from '../lib/condiciones/lectura.mjs'

const c = (serie) => lecturaCondicion(serie).condicion

test('lectura por inclinación de la última semana', () => {
  assert.equal(c([100, 101, 102]), 'inexistencia')      // menos de 4 semanas con dato
  assert.equal(c([100, 101, 102, 103]), 'normal')       // +0,98 %
  assert.equal(c([100, 101, 102, 105]), 'afluencia')    // +2,9 %
  assert.equal(c([100, 101, 102, 102]), 'emergencia')   // sin cambio
  assert.equal(c([100, 101, 102, 99]), 'peligro')       // −2,9 %
  assert.equal(c([10, 11, 12, 0]), 'inexistencia')      // valor 0
})

test('rachas que llevan a peligro', () => {
  assert.equal(c([104, 103, 102, 101]), 'peligro')      // 3 semanas seguidas bajando
  assert.equal(c([100, 100, 100, 100]), 'peligro')      // emergencia prolongada
})

test('sin dato no hay lectura', () => {
  assert.equal(c([100, 101, 102, null]), null)
  assert.equal(c([99, 100, 101, null, 103]), null)      // falta la semana anterior
})

test('discrepancia solo cuando la asignada está por encima de la lectura', () => {
  assert.equal(hayDiscrepancia('normal', 'emergencia'), true)
  assert.equal(hayDiscrepancia('emergencia', 'normal'), false)
  assert.equal(hayDiscrepancia('poder', 'normal'), true)
  assert.equal(hayDiscrepancia('normal', 'normal'), false)
  assert.equal(hayDiscrepancia(null, 'normal'), false)
  assert.equal(hayDiscrepancia('normal', null), false)
})
```

- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3: Implementación.**

```js
// Lectura automática de la condición sobre la estadística principal.
// CONVENCIÓN DE ALOHA, NO DE HCA: la base teórica no fija porcentajes. Se
// calibra con scripts/calibrar-lectura-condicion.mjs antes de encender alertas.
export const UMBRAL_CAIDA_PELIGRO = -0.02
export const UMBRAL_AFLUENCIA = 0.02
export const SEMANAS_MINIMAS = 4
export const RACHA_PELIGRO = 3
export const RANGO = Object.freeze({ inexistencia: 0, peligro: 1, emergencia: 2, normal: 3, cambio_poder: 3, afluencia: 4, poder: 5 })

function lecturaSimple(valores, i) {
  const a = valores[i]; const b = valores[i - 1]
  if (a == null || b == null) return null
  const d = a - b
  const r = d / Math.max(b, 1)
  if (r <= UMBRAL_CAIDA_PELIGRO) return 'peligro'
  if (d <= 0) return 'emergencia'
  if (r >= UMBRAL_AFLUENCIA) return 'afluencia'
  return 'normal'
}

export function lecturaCondicion(serie = []) {
  const valores = serie.map((v) => (v == null ? null : Number(v)))
  const n = valores.length - 1
  const actual = valores[n]
  if (actual == null) return { condicion: null, motivo: 'Sin dato de la semana.' }
  if (valores.filter((v) => v != null).length < SEMANAS_MINIMAS || actual === 0) {
    return { condicion: 'inexistencia', motivo: 'Menos de 4 semanas con dato o valor en cero.' }
  }
  const base = lecturaSimple(valores, n)
  if (base == null) return { condicion: null, motivo: 'Falta la semana anterior.' }
  const bajando = (i) => valores[i] != null && valores[i - 1] != null && valores[i] < valores[i - 1]
  if (n >= RACHA_PELIGRO && [0, 1, 2].every((k) => bajando(n - k))) return { condicion: 'peligro', motivo: 'Tres semanas seguidas bajando.' }
  if (n >= RACHA_PELIGRO && [0, 1, 2].every((k) => { const l = lecturaSimple(valores, n - k); return l != null && RANGO[l] <= RANGO.emergencia })) {
    return { condicion: 'peligro', motivo: 'Emergencia durante tres semanas.' }
  }
  return { condicion: base, motivo: 'Inclinación de la última semana.' }
}

export function hayDiscrepancia(asignada, lectura) {
  if (!asignada || !lectura || RANGO[asignada] == null || RANGO[lectura] == null) return false
  return RANGO[asignada] > RANGO[lectura]
}
```

- [ ] **Step 4:** Run — Expected: PASS.

### Task F3.3: Lógica pura del plan

**Files:**
- Create: `lib/plan-semana.mjs`
- Test: `test/plan-semana.test.mjs`

- [ ] **Step 1: Test.**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { pendientesDesde, estadoPlan, objetivosAlCambiarCondicion, SECCIONES } from '../lib/plan-semana.mjs'

test('secciones del plan', () => {
  assert.deepEqual(SECCIONES, ['formula', 'urgente', 'pendiente', 'orden', 'estrategico'])
})

test('pendientes: lo no hecho y los pasos de fórmula sin ningún objetivo hecho', () => {
  const anterior = {
    condicion: 'emergencia', alcance_peligro: null, variante_afluencia: null,
    objetivos: [
      { id: 1, seccion: 'formula', paso: 0, texto: 'Campaña referidos', responsable: 'Ana', fecha: '2026-09-27', hecho: true },
      { id: 2, seccion: 'formula', paso: 1, texto: 'Nuevo horario sábado', responsable: 'Ana', fecha: null, hecho: false },
      { id: 3, seccion: 'urgente', paso: null, texto: 'Llamar a 5 padres', responsable: null, fecha: null, hecho: false },
    ],
  }
  const nuevos = pendientesDesde(anterior)
  assert.deepEqual(nuevos.map((o) => o.texto), [
    'Nuevo horario sábado',
    'Llamar a 5 padres',
    'Terminar el paso 2 de Emergencia: Cambie su forma de actuar.',
    'Terminar el paso 3 de Emergencia: Economice.',
    'Terminar el paso 4 de Emergencia: Entonces prepárese para dar el servicio.',
    'Terminar el paso 5 de Emergencia: Haga más estricta la disciplina.',
  ])
  assert.ok(nuevos.every((o) => o.seccion === 'pendiente'))
  assert.equal(nuevos[0].origen_objetivo_id, 2)
  assert.equal(pendientesDesde(null).length, 0)
  assert.equal(pendientesDesde({ condicion: null, objetivos: [] }).length, 0)
})

test('estado del plan', () => {
  assert.equal(estadoPlan({ condicion: null, objetivos: [] }), 'sin_condicion')
  const obj = (paso) => ({ seccion: 'formula', paso, texto: 'x' })
  assert.equal(estadoPlan({ condicion: 'inexistencia', objetivos: [obj(0), obj(1), obj(2)] }), 'incompleto')
  assert.equal(estadoPlan({ condicion: 'inexistencia', objetivos: [obj(0), obj(1), obj(2), obj(3)] }), 'completo')
})

test('al cambiar de condición los objetivos de fórmula pasan a urgentes', () => {
  const r = objetivosAlCambiarCondicion([{ id: 1, seccion: 'formula', paso: 2, texto: 'a' }, { id: 2, seccion: 'orden', paso: null, texto: 'b' }])
  assert.deepEqual(r, [{ id: 1, seccion: 'urgente', paso: null }])
})
```

- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3: Implementación.**

```js
import { pasosDe, nombreCondicion } from './condiciones/formulas.mjs'

export const SECCIONES = Object.freeze(['formula', 'urgente', 'pendiente', 'orden', 'estrategico'])

const argsCondicion = (plan) => ({ condicion: plan.condicion, alcancePeligro: plan.alcance_peligro, varianteAfluencia: plan.variante_afluencia })

// Lo que pasa del plan J−7 al plan J. Se ejecuta UNA vez por plan
// (semana_planes.pendientes_copiados_at lo garantiza en el servidor).
export function pendientesDesde(planAnterior) {
  if (!planAnterior) return []
  const objetivos = planAnterior.objetivos || []
  const nuevos = objetivos
    .filter((o) => !o.hecho && o.seccion !== 'estrategico')
    .map((o) => ({ seccion: 'pendiente', paso: null, texto: o.texto, responsable: o.responsable ?? null, fecha: o.fecha ?? null, origen_objetivo_id: o.id }))
  if (planAnterior.condicion) {
    const pasos = pasosDe(argsCondicion(planAnterior))
    const nombre = nombreCondicion(planAnterior.condicion)
    pasos.forEach((texto, paso) => {
      const conAlgoHecho = objetivos.some((o) => o.seccion === 'formula' && Number(o.paso) === paso && o.hecho)
      if (!conAlgoHecho) nuevos.push({ seccion: 'pendiente', paso: null, texto: `Terminar el paso ${paso + 1} de ${nombre}: ${texto}`, responsable: null, fecha: null, origen_objetivo_id: null })
    })
  }
  return nuevos
}

export function estadoPlan({ condicion, alcance_peligro = null, variante_afluencia = null, objetivos = [] }) {
  if (!condicion) return 'sin_condicion'
  const pasos = pasosDe({ condicion, alcancePeligro: alcance_peligro, varianteAfluencia: variante_afluencia })
  const completo = pasos.every((_, paso) => objetivos.some((o) => o.seccion === 'formula' && Number(o.paso) === paso))
  return completo ? 'completo' : 'incompleto'
}

export function objetivosAlCambiarCondicion(objetivos = []) {
  return objetivos.filter((o) => o.seccion === 'formula').map((o) => ({ id: o.id, seccion: 'urgente', paso: null }))
}
```

  Nota para quien implementa: en el test, el paso 1 (índice 0) tiene un objetivo hecho, así que no genera "Terminar el paso 1"; el paso 2 tiene un objetivo NO hecho, que ya pasa como pendiente por sí mismo, **y además** genera "Terminar el paso 2 de Emergencia…" porque ese paso no tiene ningún objetivo hecho. El orden esperado es el del test: primero los objetivos no hechos en su orden, después los pasos.

- [ ] **Step 4:** Run — Expected: PASS.

### Task F3.4: Migración del plan

**Files:**
- Create: `db/migrations/2026-10-01-plan-semana.sql`
- Modify: `scripts/migrate-semana.mjs` (agrega el archivo a `MIGRACIONES`)

```sql
BEGIN;
CREATE TABLE IF NOT EXISTS semana_planes (
  id                     BIGSERIAL PRIMARY KEY,
  centro_id              INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  semana_fin             DATE NOT NULL CHECK (EXTRACT(ISODOW FROM semana_fin) = 4),
  condicion              TEXT CHECK (condicion IN ('inexistencia','peligro','emergencia','normal','afluencia','poder','cambio_poder')),
  alcance_peligro        TEXT CHECK (alcance_peligro IN ('personal','superior')),
  variante_afluencia     TEXT CHECK (variante_afluencia IN ('financiera','accion')),
  asignada_por           INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  asignada_at            TIMESTAMPTZ,
  lectura_auto           TEXT,
  lectura_motivo         TEXT,
  pendientes_copiados_at TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (centro_id, semana_fin)
);
CREATE TABLE IF NOT EXISTS semana_objetivos (
  id                 BIGSERIAL PRIMARY KEY,
  plan_id            BIGINT NOT NULL REFERENCES semana_planes(id) ON DELETE CASCADE,
  seccion            TEXT NOT NULL CHECK (seccion IN ('formula','urgente','pendiente','orden','estrategico')),
  paso               INTEGER CHECK (paso >= 0),
  texto              TEXT NOT NULL CHECK (length(btrim(texto)) BETWEEN 1 AND 500),
  responsable        TEXT CHECK (responsable IS NULL OR length(responsable) <= 120),
  fecha              DATE,
  hecho              BOOLEAN NOT NULL DEFAULT false,
  hecho_at           TIMESTAMPTZ,
  origen_objetivo_id BIGINT REFERENCES semana_objetivos(id) ON DELETE SET NULL,
  orden              INTEGER NOT NULL DEFAULT 0,
  creado_por         INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((seccion = 'formula') = (paso IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS semana_objetivos_plan_idx ON semana_objetivos (plan_id);
COMMIT;
```

- [ ] Agrega el archivo a `MIGRACIONES` en `scripts/migrate-semana.mjs` y su caso al test del script.

### Task F3.5: Servidor y acciones del plan

**Files:**
- Modify: `app/actions/semana.js`, `lib/estadisticas-semana/servicio.js` (o crea `lib/plan-semana-servicio.js`), `lib/access-matrix.mjs`
- Test: `test/plan-semana-servicio.test.mjs`

- [ ] **Step 1:** Función de servidor `cargarPlan(centroId, semanaFin, { query, sesion })`:
  - Busca o crea (en transacción con `withTransaction`) la fila de `semana_planes`. Si `pendientes_copiados_at` es NULL: carga el plan de `semanaFin − 7` con sus objetivos, inserta `pendientesDesde(anterior)` y marca `pendientes_copiados_at = now()` en la misma transacción (idempotente aunque dos personas abran a la vez: usa `SELECT … FOR UPDATE` sobre la fila del plan).
  - Devuelve `{ plan, objetivos, pasos, estado: estadoPlan(...), plazoVencido: plazoCondicionVencido(semanaFin, now, zona), estrategico }`, donde `estrategico` son las `growth_recommendations` del centro con `status = 'pending'` (título, acción, responsable, fecha límite), solo lectura.
  - **Lectura y discrepancia**: calcula `lecturaCondicion` con la serie de 12 semanas de `ninos_activos` cerrada hasta `semanaFin` y `hayDiscrepancia(plan.condicion, lectura)`. **Solo** las incluye en la respuesta si el rol de la sesión es coordinador, admin_master, admin_general o supervisor (usa los helpers de `components/access-control.mjs` / `lib/current-user.mjs`); para administradora y asistente, esos campos no existen en el objeto devuelto.
- [ ] **Step 2: Acciones** (todas validan que el objetivo o plan pertenece al `centroId` recibido; si no, `fallo('No autorizado.')`):
  - `getSemanaCentro` agrega `plan` = `cargarPlan(centroId, ultimaCerrada)` (el plan se escribe sobre la última semana cerrada).
  - `asignarCondicion(centroId, semanaFin, { condicion, alcancePeligro, varianteAfluencia })` — kind `closeMonth` (`requireCurrentPuedeCerrarMes`: administradora, coordinador, master; la asistente no). Solo para semanas cerradas. Guarda `asignada_por`, `asignada_at`, `lectura_auto` y `lectura_motivo` del momento. Si cambia de condición, aplica `objetivosAlCambiarCondicion` en la misma transacción.
  - `agregarObjetivo(centroId, semanaFin, { seccion, paso, texto, responsable, fecha })` — `writeCentro`. `seccion` ∈ `formula|urgente|pendiente`; `orden` y `estrategico` no se aceptan aquí. Para `formula`, `paso` debe existir en la fórmula vigente.
  - `editarObjetivo(centroId, objetivoId, { texto, responsable, fecha })`, `marcarObjetivo(centroId, objetivoId, hecho)`, `eliminarObjetivo(centroId, objetivoId)` — `writeCentro`.
  - Registra todo en `lib/access-matrix.mjs`.
- [ ] **Step 3: Tests** con `query` falso: (a) abrir dos veces no duplica pendientes; (b) administradora no recibe `lectura` ni `discrepancia`, coordinador sí; (c) `asignarCondicion` rechaza la semana abierta; (d) no se puede marcar un objetivo de otro centro.
- [ ] **Step 4:** `npm test` — Expected: PASS.

### Task F3.6: UI del plan, colores de condición y tablero

**Files:**
- Create: `components/semana/PlanSemana.js`
- Modify: `app/centro/[id]/semana/page.js`, `components/semana/GraficaSemanal.js`, `components/semana/TableroSemanal.js`, `app/actions/semana.js` (`getTableroSemanal`)

- [ ] **Step 1: `PlanSemana`** debajo de las tarjetas, titulado "Condición y plan — semana que cerró el <jueves>":
  - Si no hay condición: el selector. Botones grandes (área táctil ≥ 44 px) para las 5 condiciones visibles con su color; enlace "Más condiciones" que despliega Poder y Cambio de Poder. Al elegir Peligro aparece el conmutador "Personal / Para el superior"; al elegir Afluencia, "De acción / Financiera" (por defecto De acción). Guardar llama a `asignarCondicion`. Si el usuario no puede asignar (asistente), ve "La condición la asigna la administradora".
  - Con condición: insignia con nombre y color, y botón "Cambiar" (avisa que los objetivos de la fórmula pasarán a Urgentes).
  - La fórmula: cada paso numerado con su texto (no tiene casilla) y, debajo, sus objetivos (texto, responsable, fecha, casilla "hecho") y un formulario corto para agregar otro.
  - Secciones Urgentes, Pendientes, Órdenes del coordinador (solo lectura aquí) y Plan estratégico (recomendaciones de Ruta al próximo nivel, solo lectura, con enlace a esa pantalla).
  - Estado del plan arriba a la derecha: "Sin condición" / "Falta un objetivo en el paso N" / "Plan completo", en rojo si `plazoVencido` y no está completo, con el texto del plazo ("Plazo: viernes 10:00").
  - Si la respuesta trae `lectura` (coordinador/gerencia): una línea "Lectura de la gráfica: <condición> (<motivo>)" y, si `discrepancia`, una alerta visible "La condición asignada está por encima de lo que muestra la gráfica".
- [ ] **Step 2: Gráfica:** el punto de cada semana se pinta con `colorCondicion(condicion)` de su plan; incluye la condición en la serie que devuelve `getSemanaCentro` (join con `semana_planes`).
- [ ] **Step 3: Tablero:** agrega las columnas Condición (insignia), Plan (estado, en rojo si venció el plazo), y un ícono de alerta con texto accesible "Discrepancia" cuando aplique (el tablero solo lo ven roles que pueden ver la lectura). Todo sigue en la misma llamada.
- [ ] **Step 4:** Script `scripts/calibrar-lectura-condicion.mjs` (solo lectura): para cada centro y cada semana cerrada con historia suficiente, imprime la lectura y al final la distribución por condición y por centro. Se corre antes de dar por buenas las alertas.
- [ ] **Step 5:** `npm test` y `npm run build` — Expected: PASS.

---

# FASE F4 — Cuotas, ritmo y Reunión semanal

### Task F4.1: Propuesta de cuota y ritmo

**Files:**
- Create: `lib/cuotas-semana.mjs`
- Test: `test/cuotas-semana.test.mjs`

- [ ] **Step 1: Test.**

```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { proponerCuota, ritmoCuota, cuotaCumplida } from '../lib/cuotas-semana.mjs'

const metas = { nuevos: 20, desercion: 8, cobranza: 1 }

test('propuesta de cuota (convención ALOHA)', () => {
  assert.equal(proponerCuota({ codigo: 'nuevos_inscritos', ultimo: 3, metas }), 5)   // piso ceil(20×12/52)=5
  assert.equal(proponerCuota({ codigo: 'nuevos_inscritos', ultimo: 7, metas }), 8)
  assert.equal(proponerCuota({ codigo: 'ninos_activos', ultimo: 180, metas }), 181)
  assert.equal(proponerCuota({ codigo: 'cp_asistidas', ultimo: 6, metas }), 7)
  assert.equal(proponerCuota({ codigo: 'retiros', ultimo: 4, ninosActivos: 200, metas }), 3) // techo floor(200×8%×12/52)=3
  assert.equal(proponerCuota({ codigo: 'retiros', ultimo: 2, ninosActivos: 200, metas }), 1)
  assert.equal(proponerCuota({ codigo: 'retiros', ultimo: 0, ninosActivos: 200, metas }), 0)
  assert.equal(proponerCuota({ codigo: 'facturas_vencidas', ultimo: 5, metas }), 1)
  assert.equal(proponerCuota({ codigo: 'nuevos_inscritos', ultimo: null, metas }), null)
})

test('ritmo de los flujos: viernes = 1 … jueves = 7', () => {
  assert.deepEqual(ritmoCuota({ cuota: 7, valor: 2, dia: 3, inversa: false }), { esperado: 3, vaBien: false })
  assert.deepEqual(ritmoCuota({ cuota: 7, valor: 4, dia: 3, inversa: false }), { esperado: 3, vaBien: true })
  assert.deepEqual(ritmoCuota({ cuota: 7, valor: 2, dia: 3, inversa: true }), { esperado: 3, vaBien: true })
  assert.equal(ritmoCuota({ cuota: null, valor: 2, dia: 3 }), null)
})

test('cuota cumplida según la dirección', () => {
  assert.equal(cuotaCumplida({ valor: 5, cuota: 5, inversa: false }), true)
  assert.equal(cuotaCumplida({ valor: 4, cuota: 5, inversa: false }), false)
  assert.equal(cuotaCumplida({ valor: 1, cuota: 1, inversa: true }), true)
  assert.equal(cuotaCumplida({ valor: 2, cuota: 1, inversa: true }), false)
  assert.equal(cuotaCumplida({ valor: null, cuota: 1, inversa: true }), null)
})
```

- [ ] **Step 2:** Run — Expected: FAIL.
- [ ] **Step 3: Implementación.**

```js
// Cuotas semanales. La propuesta es CONVENCIÓN DE ALOHA (no HCA): superar la
// semana anterior sin salir del piso/techo de las metas del trimestre.
import { estadistica } from './estadisticas-semana/catalogo.mjs'

const SEMANAS_POR_MES = 52 / 12

export function proponerCuota({ codigo, ultimo, ninosActivos = null, metas }) {
  if (ultimo == null) return null
  const u = Number(ultimo)
  switch (codigo) {
    case 'nuevos_inscritos': return Math.max(u + 1, Math.ceil(Number(metas.nuevos) / SEMANAS_POR_MES))
    case 'retiros': {
      const base = Math.max(0, u - 1)
      if (ninosActivos == null) return base
      return Math.min(base, Math.floor((Number(ninosActivos) * Number(metas.desercion)) / 100 / SEMANAS_POR_MES))
    }
    case 'facturas_vencidas': return Math.min(Math.max(0, u - 1), Number(metas.cobranza))
    default: estadistica(codigo); return u + 1
  }
}

export function ritmoCuota({ cuota, valor, dia, inversa = false }) {
  if (cuota == null || valor == null) return null
  const esperado = Math.round((Number(cuota) * Number(dia)) / 7)
  return { esperado, vaBien: inversa ? Number(valor) <= esperado : Number(valor) >= esperado }
}

export function cuotaCumplida({ valor, cuota, inversa = false }) {
  if (valor == null || cuota == null) return null
  return inversa ? Number(valor) <= Number(cuota) : Number(valor) >= Number(cuota)
}
```

  Verifica a mano el primer caso del test: `ceil(20 / 4,333) = ceil(4,615) = 5`; el de retiros: `floor(200 × 8 / 100 / 4,333) = floor(3,69) = 3`. En `ritmoCuota`, `round(7 × 3 / 7) = 3`.

- [ ] **Step 4:** Run — Expected: PASS.

### Task F4.2: Migración, guarda de coordinación y acciones de cuotas

**Files:**
- Create: `db/migrations/2026-10-01-cuotas-semana.sql`
- Modify: `scripts/migrate-semana.mjs`, `lib/auth.js`, `lib/access-matrix.mjs`, `test/backend-access-matrix.test.mjs`, `app/actions/semana.js`

- [ ] **Step 1: SQL.**

```sql
BEGIN;
CREATE TABLE IF NOT EXISTS semana_cuotas (
  centro_id     INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  semana_fin    DATE NOT NULL CHECK (EXTRACT(ISODOW FROM semana_fin) = 4),
  codigo        TEXT NOT NULL CHECK (codigo IN ('ninos_activos','nuevos_inscritos','retiros','facturas_vencidas','cp_asistidas')),
  cuota         NUMERIC NOT NULL CHECK (cuota >= 0),
  propuesta     NUMERIC,
  estado        TEXT NOT NULL DEFAULT 'propuesta' CHECK (estado IN ('propuesta','aprobada')),
  propuesta_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  aprobada_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  aprobada_at   TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (centro_id, semana_fin, codigo)
);
COMMIT;
```

  Agrégala a `MIGRACIONES`.
- [ ] **Step 2: Guarda nueva** en `lib/auth.js`: `requireCurrentCoordinacion(centroId)` = usuario `coordinador` con ese centro asignado vigente, o `admin_master`. Cualquier otro → `fallo('No autorizado.')`. Agrega `ACCESS_KINDS.coordinacion = 'coordinacion'` y enseña al test de la matriz qué guarda exige ese tipo (mira cómo exige `requireCurrentWriteCentro` para `writeCentro` y replica el patrón).
- [ ] **Step 3: Acciones.**
  - `getSemanaCentro` agrega `cuotas`: para la semana abierta, por estadística, `{ cuota, propuesta, estado }`, donde `propuesta = proponerCuota({ codigo, ultimo: valor de la última semana cerrada, ninosActivos: niños activos de la última cerrada, metas: normalizarMetas(metas del trimestre de la semana abierta) })`; y `ritmo` con `ritmoCuota` para los flujos usando `diaDeSemana(hoy del centro)`.
  - `guardarCuotas(centroId, semanaFin, { [codigo]: cuota })` — `writeCentro`. Solo la semana abierta. Upsert con `estado='propuesta'`, `propuesta` del momento y `propuesta_por`. Si estaba `aprobada` y cambia el número, vuelve a `propuesta`.
  - `aprobarCuotas(centroId, semanaFin, { [codigo]: cuota })` — `coordinacion`. Guarda y marca `aprobada`, `aprobada_por`, `aprobada_at`.
  - `agregarOrden(centroId, semanaFin, { texto, fecha })` — `coordinacion`. Inserta en `semana_objetivos` con `seccion='orden'` en el plan de esa semana (lo crea si no existe, usando `cargarPlan`).
  - `getReunionSemanal()` — `readGlobal` con `alcancePanel()`. Por centro: serie principal, Δ de la última semana cerrada, condición y estado del plan, lectura y discrepancia, cuotas de la semana abierta (propuesta/aprobada), y `puedeAprobar` (true solo para coordinador del centro o Master). Orden: Δ de niños activos descendente (los centros sin dato al final).
- [ ] **Step 4:** Tests de las acciones con `query` falso: la administradora no puede aprobar; el coordinador no puede aprobar en un centro que no es suyo; editar una cuota aprobada la devuelve a propuesta.
- [ ] **Step 5:** `npm test` — Expected: PASS.

### Task F4.3: UI de cuotas, Reunión semanal y limpieza del KPI Mensual

**Files:**
- Create: `components/semana/CuotasSemana.js`, `app/dashboard/reunion-semanal/page.js`
- Modify: `components/semana/TarjetaEstadistica.js`, `components/semana/GraficaSemanal.js`, `components/semana/TableroSemanal.js`, `components/Sidebar.js`, `app/centro/[id]/kpi/page.js`

- [ ] **Step 1:** En cada `TarjetaEstadistica`: cuota de la semana abierta (con "aprobada" o "propuesta"), barra de ritmo para los flujos ("Van 2 de 7; a hoy deberían ir 3") y la cuota de cada semana pasada como marca punteada en la gráfica (ya soportado por `modeloGrafica`).
- [ ] **Step 2: `CuotasSemana`** en la pestaña Semana, para quien puede escribir: tabla estadística · última cerrada · propuesta · cuota (campo numérico, entero ≥ 0, `inputMode="numeric"`, tipografía ≥ 16 px para que Safari no haga zoom) · estado; botón "Guardar cuotas". Para el coordinador del centro aparece además "Aprobar cuotas".
- [ ] **Step 3: Reunión semanal** `app/dashboard/reunion-semanal/page.js`: una sola llamada a `getReunionSemanal()`. Texto de cabecera: "Primero el centro que más creció. Al que va abajo se le pide su plan." Por centro, una tarjeta: nombre, gráfica principal compacta, Δ, condición con color, estado del plan, alerta de discrepancia, cuotas con botón Aprobar (si `puedeAprobar`) y un campo "Dejar una orden" (texto + fecha) que llama a `agregarOrden`. Enlace a la pestaña Semana del centro. Gerencia de solo lectura la ve sin botones.
- [ ] **Step 4: Sidebar:** en el bloque Panel agrega "Reunión semanal" (`/dashboard/reunion-semanal`) para coordinador, admin_master, admin_general y supervisor. Ajusta `middleware.js` si las rutas de `/dashboard/*` necesitan la entrada explícita.
- [ ] **Step 5: Tablero:** agrega la columna "Cuotas" con el % de cuotas cumplidas de la última semana cerrada (`cuotaCumplida` sobre las estadísticas que tenían cuota aprobada).
- [ ] **Step 6: KPI Mensual:** en `app/centro/[id]/kpi/page.js` quita las cuotas semanales automáticas "meta ÷ 5" (líneas ~29-34) y la marca "¿Cumple?" de cada semana; en su lugar pon una línea "Las cuotas de cada semana se fijan en la pestaña Semana" con enlace. No toques el resto del KPI Mensual (captura, cierre, cálculos).
- [ ] **Step 7:** `npm test` y `npm run build` — Expected: PASS.

---

# FASE F5 — Entrenamiento

### Task F5.1: Cierre semanal en lugar del informe FODA

**Files:**
- Modify: `lib/entrenamiento/oficio/cursos/centro.js` (módulo `of-cen-11`, ~3160-3270, y las demás menciones de FODA), `lib/entrenamiento/oficio/cursos/hat-administradora.js` (sub-producto 6, ~119, y menciones), `lib/entrenamiento/oficio/cursos/zoho.js`, `lib/entrenamiento/oficio/glosario.js`, `lib/entrenamiento/oficio/guia.js:83-88`, `lib/entrenamiento/encuestas.js`, `lib/entrenamiento/modulos.js:117,259`, fuentes en `docs/entrenamiento/fuente/*`
- Create: `docs/entrenamiento/audios-pendientes-semana.md`

- [ ] **Step 1:** Lee primero `test/entrenamiento-marca-oficio.test.mjs` y los tests de oficio/glosario: dicen qué estructura y vocabulario se exige.
- [ ] **Step 2:** `of-cen-11` pasa a enseñar el **cierre semanal** de la administradora: cada viernes antes de las 10:00 revisa las 5 estadísticas de la pestaña Semana, asigna la condición del centro según la gráfica de niños activos, escribe objetivos debajo de cada paso de la fórmula, revisa pendientes y órdenes, y propone las cuotas de la semana; el coordinador las aprueba en la Reunión semanal. Conserva el formato de módulo del curso (recorrido, pasos, preguntas de práctica/maniobra que use el resto del curso). El producto del paso: "plan de la semana completo antes del viernes 10:00".
- [ ] **Step 3:** En el puesto de administradora, el sub-producto 6 deja de ser el FODA y pasa a ser "Cierre semanal completo" con su indicador "plan completo y cuotas propuestas antes del viernes 10:00". Quita las demás menciones al FODA en `centro.js`, `hat-administradora.js` y `zoho.js`, reemplazándolas por el cierre semanal cuando el texto lo pida o borrando la frase si solo citaba el FODA de pasada.
- [ ] **Step 4: Glosario.** Quita la entrada `foda`. Agrega entradas para `condición`, `fórmula de la condición`, `semana de cierre`, `cuota semanal` y `plan de batalla` (definición corta y "cómo se usa en ALOHA"). Ojo (memoria del repo): `glosario.js` dice "GENERADO" pero hoy no coincide con su fuente; **no lo regeneres** (pisarías ediciones a mano): edita la fuente `docs/entrenamiento/fuente/glosario-*.md` correspondiente e inserta en `glosario.js` solo los bloques nuevos y la eliminación de `foda`. Si `scripts/oficio-glosario-importar.mjs --verificar` ya fallaba en `origin/main`, déjalo anotado y no lo "arregles".
- [ ] **Step 5:** Reemplaza las preguntas de quiz que hablaban del FODA en `lib/entrenamiento/encuestas.js` y `lib/entrenamiento/modulos.js` por preguntas sobre el cierre semanal (mismo formato y número de opciones).
- [ ] **Step 6: Audios.** No generes audio. Revisa cómo el repo asocia texto y audio (busca la carpeta de mp3 y si hay un manifiesto o hash). Lista en `docs/entrenamiento/audios-pendientes-semana.md` cada audio cuyo texto cambió (módulo, archivo, texto nuevo completo) para que Fernando autorice regenerarlos. Si un test exige que el texto coincida con el audio, documenta el fallo esperado en ese archivo y en el reporte, sin desactivar el test.
- [ ] **Step 7:** `grep -rni "foda" lib/entrenamiento docs/entrenamiento` — Expected: sin coincidencias (salvo el histórico de la carpeta de fuentes congeladas si el repo exige conservarlo; en ese caso anótalo).
- [ ] **Step 8:** `npm test` y `npm run build` — Expected: PASS (o solo el fallo de audio documentado en el Step 6).

---

## Verificación final (después de cada fase)

- [ ] `npm test`: todo en verde (reporta el número de tests antes y después).
- [ ] `npm run build`: sin errores.
- [ ] `grep -rn "HCA\|Hubbard\|PFV\|producto final valioso" app components lib/entrenamiento` — Expected: nada en texto visible.
- [ ] Reporte final: archivos creados/modificados/borrados, desviaciones del plan con su motivo, y lo que queda para Fernando (migraciones a aplicar con `node scripts/migrate-semana.mjs --apply`, backfill con `node scripts/backfill-estadisticas-semana.mjs --apply`, calibración, audios).
