# ALOHA KPI Operational Synchronization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatizar desde agosto de 2026 el embudo, las ventas, los retiros, los motivos y los origenes del KPI sin alterar ningun mes cerrado.

**Architecture:** Un modulo puro calcula fechas, celdas semanales y conciliacion. Un modulo servidor consulta CRM y operaciones locales, inicializa un ajuste heredado por centro/mes y entrega una fotografia automatica al action KPI. La UI deja editables solo cobranza y meta, y muestra la procedencia de cada cifra.

**Tech Stack:** Next.js 15 Server Actions, React 18, Neon PostgreSQL, Node test runner.

## Global Constraints

- Automatizar solo meses abiertos con `year * 100 + month >= 202608`.
- Un mes cerrado no consulta CRM ni datos vivos y no recibe `UPDATE`.
- Una venta sin grupo no es un nuevo activo ni un nino pagable.
- Si la clase tiene un grupo valido y abierto, `Inscribir` lo preselecciona; si no, crea al nino sin grupo.
- `crm_registration_id` hace idempotente la inscripcion.
- Una falla del CRM conserva la fotografia guardada y bloquea guardar/cerrar.
- Cobranza y meta mensual permanecen manuales.

---

### Task 1: Pure automatic KPI engine

**Files:**
- Create: `lib/kpi-auto.mjs`
- Create: `test/kpi-auto.test.mjs`

**Interfaces:**
- Produces: `usaKpiAutomatico(year, month, estado)`, `celdaSemanal(fecha)`, `fuenteKpiAutomatica(input)`, `crearAjustes(saved, source)`, `aplicarAjustes(source, adjustments)`.

- [ ] **Step 1: Write failing tests for dates and sources**

```js
test('solo automatiza agosto 2026 en adelante mientras este abierto', () => {
  assert.equal(usaKpiAutomatico(2026, 7, 'abierto'), false)
  assert.equal(usaKpiAutomatico(2026, 8, 'abierto'), true)
  assert.equal(usaKpiAutomatico(2026, 8, 'cerrado'), false)
})

test('fin de semana cae en dia 5 sin perder el movimiento', () => {
  assert.deepEqual(celdaSemanal('2026-08-08'), { semana: 2, dia: 5 })
  assert.deepEqual(celdaSemanal('2026-08-31'), { semana: 5, dia: 1 })
})

test('separa ventas, matriculados, origenes y retiros', () => {
  const source = fuenteKpiAutomatica({
    year: 2026,
    month: 8,
    registros: [{ id: 'r1', event_id: 'ev1', attendance_status: 'attended', registered_at: '2026-08-02T12:00:00Z', checked_in_at: '2026-08-06T20:00:00Z' }],
    clases: [{ id: 'ev1', start_date: '2026-08-06T20:00:00Z' }],
    movimientos: [{ tipo: 'inscripcion', fecha: '2026-08-06', crm_registration_id: 'r1', origen_venta: 'referido' }],
  })
  assert.equal(source.cp_invitados, 1)
  assert.equal(source.cp_asistieron, 1)
  assert.equal(source.cp_matriculados, 1)
  assert.equal(source.orig_referido, 1)
})
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test test/kpi-auto.test.mjs`

Expected: FAIL because `lib/kpi-auto.mjs` does not exist.

- [ ] **Step 3: Implement the pure engine**

Use fixed keys for summary values and 5x5 arrays for `ing` and `des`. Normalize `Date` and ISO values to the Panama calendar day before month filtering. Count attendance by `checked_in_at`, falling back to the local class start date. Map unknown withdrawal motives to `mot_otro` and missing commercial origins to `orig_por_clasificar`.

```js
export const KPI_AUTO_DESDE = 202608
export function usaKpiAutomatico(year, month, estado) {
  return Number(year) * 100 + Number(month) >= KPI_AUTO_DESDE && estado === 'abierto'
}

export function celdaSemanal(fecha) {
  const date = new Date(`${iso10(fecha)}T12:00:00-05:00`)
  const dayOfMonth = Number(iso10(fecha).slice(8, 10))
  const weekDay = date.getDay()
  return {
    semana: Math.min(5, Math.floor((dayOfMonth - 1) / 7) + 1),
    dia: weekDay === 0 || weekDay === 6 ? 5 : weekDay,
  }
}
```

- [ ] **Step 4: Add reconciliation tests**

```js
test('el ajuste conserva lo manual y no duplica una fuente ya presente', () => {
  const source = fixtureSource({ cp_invitados: 10, ing: weeklyCell(1, 1, 1) })
  const saved = fixtureSource({ cp_invitados: 15, ing: weeklyCell(1, 1, 2) })
  const adjustments = crearAjustes(saved, source)
  assert.equal(aplicarAjustes(source, adjustments).cp_invitados, 15)
  assert.equal(aplicarAjustes(source, adjustments).ing[0][0], 2)
})
```

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test test/kpi-auto.test.mjs`

```bash
git add lib/kpi-auto.mjs test/kpi-auto.test.mjs
git commit -m "feat: add automatic KPI calculation engine"
```

---

### Task 2: Correct the effective start for unassigned sales

**Files:**
- Modify: `lib/inicios-clase.mjs`
- Modify: `lib/cuadro-snapshot.js`
- Modify: `test/inicios-clase.test.mjs`

**Interfaces:**
- Consumes: first `inscripcion` and first later `cambio_grupo` with `a_grupo_id`.
- Produces: effective start `max(fecha_asignacion, grupo.fecha_inicio_clases)` or no start when no group exists.

- [ ] **Step 1: Write failing tests**

```js
test('una venta sin grupo no crea un nuevo activo', () => {
  const e = estudiante({ grupo_id: null })
  const ev = inscripcion({ a_grupo_id: null })
  assert.deepEqual(iniciosClaseMes([e], [], [ev], 2026, 8), [])
})

test('la asignacion posterior usa la fecha mayor entre asignacion e inicio', () => {
  const eventos = [
    inscripcion({ fecha: '2026-08-06', a_grupo_id: null }),
    { id: 101, estudiante_id: 1, tipo: 'cambio_grupo', fecha: '2026-08-20', a_grupo_id: 10 },
  ]
  assert.equal(iniciosClaseMes([estudiante()], [grupo({ fecha_inicio_clases: '2026-08-15' })], eventos, 2026, 8)[0].fechaInicio, '2026-08-20')
})
```

- [ ] **Step 2: Run and confirm RED**

Run: `node --test test/inicios-clase.test.mjs`

- [ ] **Step 3: Implement assignment-aware context**

Select the group and assignment event as follows:

```js
const asignacion = eventoInscripcion?.a_grupo_id
  ? eventoInscripcion
  : eventosOrdenados.find((evento) => evento.tipo === 'cambio_grupo' && evento.a_grupo_id)
const grupoId = asignacion?.a_grupo_id ?? null
const fechaInicio = grupoId == null ? null : fechaInicioOperativa(estudiante, grupo, asignacion)
```

For operational months, filter students without a started group out of `cuadroControlGrupos` and `cuadroRoyalties`; closed snapshots remain untouched.

- [ ] **Step 4: Run tests and commit**

Run: `node --test test/inicios-clase.test.mjs test/kpi-calc.test.mjs`

```bash
git add lib/inicios-clase.mjs lib/cuadro-snapshot.js test/inicios-clase.test.mjs
git commit -m "fix: count children active only after group start"
```

---

### Task 3: Persist commercial origin and reconciliation state

**Files:**
- Modify: `db/schema.sql`
- Modify: `lib/operaciones.js`
- Modify: `app/actions/estudiantes.js`
- Modify: `test/kpi-auto.test.mjs`

**Interfaces:**
- Produces: `estudiantes.origen_venta`, unique CRM registration identity, `resumen_mes.orig_por_clasificar`, and `kpi_auto_ajustes`.

- [ ] **Step 1: Add schema statements**

```sql
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS origen_venta TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_estudiantes_crm_registration
  ON estudiantes (centro_id, crm_registration_id)
  WHERE crm_registration_id IS NOT NULL;
ALTER TABLE resumen_mes ADD COLUMN IF NOT EXISTS orig_por_clasificar INTEGER DEFAULT 0;
CREATE TABLE IF NOT EXISTS kpi_auto_ajustes (
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  ajustes JSONB NOT NULL DEFAULT '{}'::jsonb,
  initialized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (centro_id, year, month)
);
```

- [ ] **Step 2: Validate and persist origin**

Add `ORIGENES_VENTA = ['referido', 'marketing', 'centro', 'activaciones', 'medios']`. Require it for every new `inscripcion` from August 2026 onward and persist it in both create and edit actions.

- [ ] **Step 3: Keep duplicate protection inside the transaction**

Catch PostgreSQL unique violation `23505` on `idx_estudiantes_crm_registration` and return `Este registro ya fue inscrito.` so concurrent clicks cannot create two children.

- [ ] **Step 4: Run tests, migration parser, and commit**

Run: `node --test test/kpi-auto.test.mjs test/inicios-clase.test.mjs`

Run: `node --check scripts/migrate.mjs`

```bash
git add db/schema.sql lib/operaciones.js app/actions/estudiantes.js test/kpi-auto.test.mjs
git commit -m "feat: store commercial origin for enrollments"
```

---

### Task 4: Build the server synchronization source

**Files:**
- Create: `lib/kpi-auto-server.js`
- Modify: `app/actions/kpi.js`
- Modify: `test/kpi-auto.test.mjs`

**Interfaces:**
- Produces: `cargarFuenteKpi(centroId, year, month, query)`, `inicializarAjustesKpi(...)`, `fotoKpiAutomatica(...)`.
- Consumes: CRM action `list_registrations_by_event_ids` and local operational events.

- [ ] **Step 1: Query the source rows once**

```js
const clases = await query`
  SELECT crm_event_id AS id, start_date
  FROM centro_eventos WHERE centro_id = ${centroId}
`
const movimientos = await query`
  SELECT ee.tipo, ee.fecha, ee.motivo, e.crm_registration_id, e.origen_venta
  FROM estudiante_eventos ee
  JOIN estudiantes e ON e.id = ee.estudiante_id
  WHERE ee.centro_id = ${centroId} AND ee.year = ${year} AND ee.month = ${month}
    AND ee.tipo IN ('inscripcion', 'retiro')
  ORDER BY ee.fecha, ee.id
`
```

Call CRM once with all local event IDs. Return `{ error, complete: false }` on timeout/error; never turn that failure into zero registrations.

- [ ] **Step 2: Initialize adjustments once**

Read `resumen_mes` and `kpi_semanas`, calculate differences with `crearAjustes`, then use:

```sql
INSERT INTO kpi_auto_ajustes (centro_id, year, month, ajustes)
VALUES ($1, $2, $3, $4::jsonb)
ON CONFLICT (centro_id, year, month) DO NOTHING;
```

Read the row again after insert so concurrent requests use the same adjustment.

- [ ] **Step 3: Integrate open-month load and save**

In `loadKpiMes`, branch before live reads:

```js
if (usaKpiAutomatico(year, month, estado)) {
  const auto = await fotoKpiAutomatica(centroId, year, month)
  if (auto.complete) {
    resumen = { ...resumen, ...auto.resumen }
    semanas = mezclarCobranzaConAutomatico(semanas, auto)
  }
  autoSync = auto.complete ? { ok: true, adjusted: auto.adjusted } : { ok: false, error: auto.error }
}
```

In `guardarKpiMes`, require a complete source before the transaction writes summary/weekly data. Ignore client values for CP, sales, withdrawals, motives and origins. Keep client values only for cobranza and meta.

- [ ] **Step 4: Protect closed months**

Add a testable guard so `estado === 'cerrado'` skips `fotoKpiAutomatica`. `cerrarMes` is already preceded by `saveKpiMes`; a failed sync makes save return an error and the UI does not call close.

- [ ] **Step 5: Run tests and commit**

Run: `npm test`

```bash
git add lib/kpi-auto-server.js app/actions/kpi.js test/kpi-auto.test.mjs
git commit -m "feat: synchronize open KPI months from operations"
```

---

### Task 5: Complete enrollment and KPI interfaces

**Files:**
- Modify: `app/centro/[id]/eventos/page.js`
- Modify: `app/centro/[id]/grupos/page.js`
- Modify: `app/centro/[id]/kpi/page.js`

**Interfaces:**
- Consumes: `autoSync`, `orig_por_clasificar`, `ORIGENES_VENTA` and event `grupoId`.
- Produces: explicit commercial-origin capture and read-only automatic KPI fields.

- [ ] **Step 1: Add commercial-origin controls**

Both enrollment modals must render a required select:

```jsx
<select className="input" value={f.origen_venta} onChange={(event) => set('origen_venta', event.target.value)}>
  <option value="">Seleccionar origen</option>
  <option value="referido">Referido</option>
  <option value="marketing">Marketing</option>
  <option value="centro">Centro</option>
  <option value="activaciones">Activaciones</option>
  <option value="medios">Medios</option>
</select>
```

Pass `origen_venta` to `inscribirEstudiante`. Keep the linked opening group preselected; fall back to `Sin grupo (asignar despues)` when invalid.

- [ ] **Step 2: Make automatic KPI cells read-only**

For open automatic months disable CP, weekly sales, weekly withdrawals, motives and origins. Add `Por clasificar` and compact source notes. Do not disable weekly cobranza or monthly meta.

- [ ] **Step 3: Render synchronization status**

Show a success line when CRM and local operations are current. If `autoSync.ok === false`, show an error alert explaining that the last saved values remain visible and saving/closing is blocked.

- [ ] **Step 4: Run build and commit**

Run: `npm run build`

```bash
git add 'app/centro/[id]/eventos/page.js' 'app/centro/[id]/grupos/page.js' 'app/centro/[id]/kpi/page.js'
git commit -m "feat: show synchronized KPI sources"
```

---

### Task 6: Reconcile, audit, and release all centers

**Files:**
- Modify only if verification finds a defect.

**Interfaces:**
- Produces: migrated production schema, initialized August adjustments for all six centers, merged ALOHA PR.

- [ ] **Step 1: Run complete local verification**

Run: `npm test`

Run: `npm run build`

Run: `git diff --check origin/main...HEAD`

- [ ] **Step 2: Push and create the ready PR**

```bash
git push -u origin codex/aloha-kpi-sincronizacion-agosto
gh pr create --base main --head codex/aloha-kpi-sincronizacion-agosto --title "Sincronizar KPI con clases de prueba y operaciones" --body-file /tmp/aloha-kpi-sync-pr.md
```

- [ ] **Step 3: Wait for all PR checks**

Run: `gh pr checks <PR_NUMBER> --watch`

- [ ] **Step 4: Apply the idempotent schema before deploying the code**

Run against production: `npm run db:migrate`

Expected: schema completes without changing closed-month rows.

- [ ] **Step 5: Merge and wait for production**

Run: `gh pr merge <PR_NUMBER> --squash --delete-branch`

Wait for the Vercel production deployment to report `Ready`.

- [ ] **Step 6: Initialize August in every center**

Open `/centro/<id>/kpi` for centers 1 through 6 with August 2026 selected. Each load initializes at most one `kpi_auto_ajustes` row.

- [ ] **Step 7: Audit database invariants**

Verify for every center:

```sql
SELECT c.id, c.nombre, a.year, a.month, a.ajustes, a.initialized_at
FROM centros c
LEFT JOIN kpi_auto_ajustes a
  ON a.centro_id = c.id AND a.year = 2026 AND a.month = 8
ORDER BY c.id;
```

Also verify no closed month changed by comparing its prior `updated_at`, `ninos_inicio_mes`, `ninos_final_mes`, and weekly values.

- [ ] **Step 7: Verify the two known trial enrollments**

Confirm Denny Li and Angie Chong each produce exactly one August sale and one matriculation. If they remain without group, each produces zero new active until assignment. Verify one linked class preselects its open group and one unlinked class saves a child without group.

- [ ] **Step 8: Verify production visually**

Check desktop and mobile widths for the KPI page: automatic fields readable, no overlap, failure alert visible, and `Por clasificar` present when needed.
