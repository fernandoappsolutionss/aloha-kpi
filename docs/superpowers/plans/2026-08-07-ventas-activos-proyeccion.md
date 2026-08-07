# Ventas, activos y proyeccion mensual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar ventas y nuevos activos, declarar los inicios de clase en el Cuadro de Negocio y proyectar los ninos del siguiente mes.

**Architecture:** Un modulo puro calculara la fecha operativa, la lista mensual de inicios, el balance de ninos y la proyeccion. KPI, Historial, Resumen, Cuadro de Negocio y Excel consumiran ese mismo resultado; `kpi_semanas` seguira siendo la fuente comercial y `resumen_mes.nuevos_activos_mes` recuperara su significado operativo.

**Tech Stack:** Next.js 15 App Router, React 18, Neon Postgres, ExcelJS, Recharts y `node:test`.

## Global Constraints

- `grupo.fecha_inicio_clases` determina cuando entra un grupo en operacion.
- `grupo.fecha_apertura` no participa en nuevos activos ni en la proyeccion.
- La meta mensual aplica solo a `Nuevos ingresos venta`.
- Los meses cerrados permanecen inmutables mediante `cuadro_mensual`.
- Las reincorporaciones suman al cierre, pero no cuentan como nuevos activos.
- No se agrega una columna de ventas a `resumen_mes`.

---

### Task 1: Motor puro de inicios y proyeccion

**Files:**
- Create: `lib/inicios-clase.mjs`
- Create: `test/inicios-clase.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `iniciosClaseMes(estudiantes, grupos, eventosInscripcion, year, month) -> InicioClase[]`.
- Produces: `balanceMensual({ inicio, nuevosActivos, reincorporados, retirados }) -> number`.
- Produces: `proyeccionSiguienteMes({ cierreActual, bajasPotenciales, iniciosProgramados }) -> number`.
- `InicioClase` includes `estudianteId`, `grupoId`, `nombre`, `coach`, `grupo`, `itinerario`, `nivel`, `fechaInscripcion`, `fechaInicioClases`, `fechaInicioOperativa`, `representante`, `correo`, and `telefono`.

- [ ] **Step 1: Write failing tests for operational start dates**

```js
test('counts a sale when the future group starts', () => {
  const rows = iniciosClaseMes(
    [{ id: 1, grupo_id: 10, fecha_inscripcion: '2026-06-10', estado: 'activo' }],
    [{ id: 10, numero: '101', fecha_inicio_clases: '2026-08-03' }],
    [{ estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-06-10', a_grupo_id: 10 }],
    2026,
    8,
  )
  assert.equal(rows.length, 1)
  assert.equal(rows[0].fechaInicioOperativa, '2026-08-03')
})
```

Add separate tests for a child joining an existing group, a withdrawal before start, a start and withdrawal in the same month, and a reincorporation that must not create a new active.

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test test/inicios-clase.test.mjs`

Expected: FAIL because `lib/inicios-clase.mjs` does not exist.

- [ ] **Step 3: Implement the smallest date and list functions**

```js
export function fechaInicioOperativa(estudiante, grupo, eventoInscripcion) {
  const venta = iso10(eventoInscripcion?.fecha || estudiante?.fecha_inscripcion)
  const inicioGrupo = iso10(grupo?.fecha_inicio_clases)
  if (!venta) return inicioGrupo
  if (!inicioGrupo) return venta
  return venta > inicioGrupo ? venta : inicioGrupo
}
```

Use the original inscription event's `a_grupo_id`; when it is null, use the student's current group. Exclude a row only when `fecha_retiro < fechaInicioOperativa`.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `node --test test/inicios-clase.test.mjs`

Expected: all operational-start tests PASS.

- [ ] **Step 5: Add failing balance and projection tests**

```js
test('projects next month from announced exits and scheduled starts', () => {
  assert.equal(proyeccionSiguienteMes({ cierreActual: 165, bajasPotenciales: 6, iniciosProgramados: 14 }), 173)
})

test('adds reincorporations without classifying them as new actives', () => {
  assert.equal(balanceMensual({ inicio: 150, nuevosActivos: 12, reincorporados: 2, retirados: 5 }), 159)
})
```

- [ ] **Step 6: Verify RED, implement both formulas, and verify GREEN**

Run before implementation: `node --test test/inicios-clase.test.mjs`

Expected: FAIL because the formula exports do not exist.

Run after implementation: `node --test test/inicios-clase.test.mjs`

Expected: all tests PASS.

- [ ] **Step 7: Add the project test script and commit**

```json
"test": "node --test test/*.test.mjs"
```

```bash
git add package.json lib/inicios-clase.mjs test/inicios-clase.test.mjs
git commit -m "Separa inicios operativos y proyeccion"
```

### Task 2: Cuadro de Negocio as source of new actives

**Files:**
- Modify: `lib/cuadro-calc.js`
- Modify: `lib/cuadro-snapshot.js`
- Modify: `app/actions/cuadro.js`
- Modify: `app/actions/kpi.js`
- Modify: `test/inicios-clase.test.mjs`

**Interfaces:**
- Consumes: `iniciosClaseMes` and `balanceMensual` from Task 1.
- Produces: `calcularCuadro(...).iniciosClase` and `totales.mesAnterior`.
- Produces: `motivosAuto.reincorporados`, `motivosAuto.retiros`, and `motivosAuto.nuevos`.

- [ ] **Step 1: Add failing tests for declared starts and movement balance**

Add fixtures where one child starts and retires during August. Assert that the start list contains the child and that the balance adds one start and subtracts one retirement.

- [ ] **Step 2: Run `npm test` and verify RED**

Expected: FAIL because the declared-start aggregation is absent.

- [ ] **Step 3: Integrate operational start IDs into Cuadro calculations**

```js
const iniciosClase = iniciosClaseMes(todosEst, todos, eventosInscripcion, y, m)
const nuevosActivosIds = new Set(iniciosClase.map((row) => row.estudianteId))
const controlGrupos = cuadroControlGrupos(grupos, estudiantes, eventos, nuevosActivosIds)
```

Pass the same ID set to royalties. Count start-and-retire children in both declarations, but exclude them from children payable at month end. Add `mesAnterior` to `controlGrupos.totales`.

- [ ] **Step 4: Use Cuadro totals when saving and closing KPI**

```js
const nuevosActivos = auto ? auto.nuevos : intOr(config.nuevos_activos_mes)
const reincorporados = auto ? auto.reincorporados : 0
const retirados = auto ? auto.retiros : totalDes
const ninosFinal = balanceMensual({ inicio: ninosInicio, nuevosActivos, reincorporados, retirados })
```

`sincronizarConKpi` and `cerrarMes` must write `ninos_inicio_mes: t.mesAnterior`, `ninos_final_mes: t.aPagar`, and `nuevos_activos_mes: datos.iniciosClase.length`.

- [ ] **Step 5: Run tests and build**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: Next.js build exits 0.

- [ ] **Step 6: Commit**

```bash
git add lib/cuadro-calc.js lib/cuadro-snapshot.js app/actions/cuadro.js app/actions/kpi.js test/inicios-clase.test.mjs
git commit -m "Usa inicios de clase como nuevos activos"
```

### Task 3: Declaracion de inicios in screen and Excel

**Files:**
- Modify: `app/centro/[id]/cuadro/page.js`
- Modify: `app/api/centro/[id]/cuadro/route.js`

**Interfaces:**
- Consumes: `data.iniciosClase` from Task 2.
- Produces: screen section `Inicios de clase del mes`.
- Produces: Excel worksheet `INICIOS DE CLASE`.

- [ ] **Step 1: Add the screen declaration table**

Render one row per start with columns `Niño`, `Grupo`, `Nivel`, `Fecha de inscripción`, `Fecha de inicio de clases`, and `Representante`. Use the same panel density and table styles as `Deserciones del mes`.

- [ ] **Step 2: Add the Excel worksheet**

```js
const h4 = wb.addWorksheet('INICIOS DE CLASE')
fila(h4, ['COACH', 'GRUPO', 'ITINERARIO', 'NIVEL', 'CANTIDAD', 'NIÑO',
  'FECHA DE INSCRIPCIÓN', 'FECHA DE INICIO DE CLASES', 'REPRESENTANTE', 'CORREO', 'TELÉFONO'],
  { bold: true, fill: FILL_HEADER })
```

For an open month, use the live `iniciosClase` list. For a closed month, use the snapshot list; if an old snapshot lacks it, keep the live reconstruction made before loading the snapshot.

- [ ] **Step 3: Update labels and comparison copy**

Rename ambiguous `Nuevos del mes` labels in Cuadro to `Nuevos activos` and state that the count comes from class starts.

- [ ] **Step 4: Verify**

Run: `npm test`

Run: `npm run build`

Run: `git diff --check`

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```bash
git add 'app/centro/[id]/cuadro/page.js' 'app/api/centro/[id]/cuadro/route.js'
git commit -m "Declara inicios de clase en el cuadro"
```

### Task 4: Separate KPI, Historial, and center forecast

**Files:**
- Modify: `app/centro/[id]/kpi/page.js`
- Modify: `app/actions/centro.js`
- Modify: `app/centro/[id]/historial/page.js`
- Modify: `app/centro/[id]/page.js`

**Interfaces:**
- Consumes: weekly sales, `resumen_mes.nuevos_activos_mes`, `iniciosClaseMes`, and `proyeccionSiguienteMes`.
- Produces: `getCentroResumen(...).proyeccion` with `label`, `cierreActual`, `bajasPotenciales`, `iniciosProgramados`, and `total`.

- [ ] **Step 1: Separate KPI values**

Show `Nuevos ingresos venta` from the weekly total and `Nuevos activos del mes` from Cuadro. Keep the sales target beside sales only. Calculate final children with operational starts, reincorporations, and declared withdrawals.

- [ ] **Step 2: Build the live next-month projection**

Use Panama's current date. Count active or potential-low children whose operational start is on or before current month end, subtract current operational children marked `baja_potencial`, and add active children whose operational start is in the next calendar month.

- [ ] **Step 3: Render the forecast in Resumen**

Add one full-width operational band near the current KPI cards:

```text
Proyeccion Septiembre 2026: 173 ninos
Cierre actual 165 - 6 bajas anunciadas + 14 inicios programados
```

Use existing surface, border, and typography variables. Keep the layout responsive without nested cards.

- [ ] **Step 4: Separate Historial series**

Remove the weekly-sales fallback from `nuevos_activos`. Keep `nuevos_ingresos_venta` from `kpi_semanas`. Add active starts to the summary cards, the commercial chart, and the detail table; the target line remains tied to sales.

- [ ] **Step 5: Verify**

Run: `npm test`

Run: `npm run build`

Run: `git diff --check`

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```bash
git add 'app/centro/[id]/kpi/page.js' app/actions/centro.js 'app/centro/[id]/historial/page.js' 'app/centro/[id]/page.js'
git commit -m "Separa ventas activos y proyeccion mensual"
```

### Task 5: Final verification and publication

**Files:**
- Modify only files required by verification findings.

**Interfaces:**
- Produces: ready pull request targeting `main`.

- [ ] **Step 1: Run the complete local gate**

```bash
npm test
npm run build
git diff --check main...HEAD
git status --short --branch
```

Expected: tests and build exit 0; diff check prints nothing; only intentional files differ from `main`.

- [ ] **Step 2: Review the full diff against the specification**

Check each definition, formula, UI location, snapshot behavior, and Excel field in `docs/superpowers/specs/2026-08-07-ventas-activos-proyeccion-design.md`.

- [ ] **Step 3: Push and open a ready PR**

```bash
git push -u origin codex/aloha-ventas-activos-proyeccion
```

Create a ready PR against `main` with root cause, behavior changes, and exact verification results.

- [ ] **Step 4: Wait for checks, merge, and verify production**

Wait until required checks pass, squash-merge the PR, update local `main`, and confirm the Vercel production deployment reports `Ready` for the merge commit.
