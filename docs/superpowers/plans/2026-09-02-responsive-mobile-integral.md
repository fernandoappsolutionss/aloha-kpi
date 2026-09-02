# Experiencia móvil integral — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que todas las rutas de KPI ALOHA sean legibles y operables entre 320 px y escritorio, sin desbordamiento del documento, controles cortados ni pérdida de funciones.

**Architecture:** Un sistema responsive común resuelve tokens, tipografía, shell, drawer, diálogos, tablas y medición de gráficos. Cada familia de páginas adopta esas primitivas con una decisión explícita: listas operativas pasan a tarjetas; comparaciones densas conservan tablas dentro de una región local; formularios y acciones se apilan. Playwright mide geometría real en 6 viewports y `node:test` protege los contratos fuente.

**Tech Stack:** Next.js 15 App Router, React 18, CSS plano, Recharts 2.15, `node:test`, `@playwright/test` y `@axe-core/playwright` usando el Google Chrome instalado. Sin librería visual ni de focus-trap adicional.

**Spec:** `docs/superpowers/specs/2026-09-02-coordinador-usuarios-responsive-design.md`

**Dependency:** Ejecutar completo `docs/superpowers/plans/2026-09-02-coordinador-gestion-usuarios.md`, incluida Task 7; este plan consume `navigationContext`, `UsuariosClient` y su gate PostgreSQL.

## Global Constraints

- Preservar la identidad actual: petróleo `#00556D`, verde `#49B439`, lima `#BBE529`, azul ALOHA y Futura autoalojada.
- Escritorio `≥1025 px`: sidebar y composición actuales; `768–1024 px`: top bar + drawer y máximo 2 columnas; `320–767 px`: una columna.
- Cuerpo móvil mínimo 15 px, etiquetas/datos secundarios 13 px, leyendas 12 px e inputs editables 16 px.
- Botones y controles táctiles: área mínima 44 × 44 px en móvil.
- Nunca ocultar defectos con `body { overflow-x:hidden }`; el único overflow horizontal permitido vive dentro de `TableScroller`.
- Usar `100dvh`, safe areas, `overscroll-behavior:contain`, foco visible y `prefers-reduced-motion`.
- Quitar `transition: all`. Animar solo `transform` y `opacity` cuando sea posible.
- Navegación con `<Link>`; acciones con `<button>`; iconos decorativos con `aria-hidden`; controles de icono con `aria-label`.
- Inputs con `name`, etiqueta asociada, `autocomplete`, tipo/inputMode correcto y error cercano.
- No reducir ni ocultar datos operativos para hacerlos caber. Reordenar, envolver, convertir a tarjetas o usar scroller local.
- No cambiar reglas de negocio, cálculos, payloads ni Server Actions salvo el contrato de usuarios definido en el plan de permisos.
- Artefactos Playwright, storage states y capturas nunca se commitean.
- `E2E_*` y `USUARIOS_TEST_DATABASE_URL` son variables locales/CI de verificación; no se agregan al entorno productivo de Vercel. El arranque E2E local exige además `E2E_DATABASE_CONFIRM=disposable`, fuerza `DATABASE_URL` a esa URL y no reutiliza otro servidor. `E2E_VALID_ACCESS_TOKEN` pertenece a una cuenta fixture sin privilegios, se usa solo para renderizar el formulario y nunca se imprime ni se consume. `E2E_CENTRO_ID` es el primer centro compartido por la cuenta de centro y el coordinador fixture; `E2E_COORDINATOR_SECOND_CENTER_ID` identifica un segundo centro asignado al mismo coordinador. La prueba de mutaciones crea y elimina su propia cuenta activa; nunca reutiliza el dueño de `E2E_VALID_ACCESS_TOKEN`.
- Toda vista/estado final usa `data-page-state="ready"`; cargas usan `loading` y errores recuperables `error`. Geometría y Axe esperan `ready` en vez de inferirlo por textos variables.

---

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---:|
| `app/layout.js` | Skip link global y punto de entrada accesible | 1 |
| `app/globals.css` | Tokens, shell, grids, tarjetas, diálogos, tablas y breakpoints | 1–10 |
| `components/Dialog.js` | Diálogo accesible, foco, scroll y safe areas | 1, 3 |
| `components/TableScroller.js` | Región horizontal local con pista y primera columna fija | 1 |
| `components/OperationalCard.js` | Representación móvil de una fila operativa | 1 |
| `components/MeasuredChart.js` | Ancho real antes de montar gráficos | 1, 6, 8, 10 |
| `components/Sidebar.js`, `ThemeToggle.js` | Top bar, drawer y navegación táctil | 2 |
| `playwright.config.mjs`, `tests/e2e/**` | Auditoría geométrica y funcional con actores gerencia, coordinador y centro | 2–10 |
| `test/responsive-ui.test.mjs` | Contratos fuente y registro completo de rutas | 1–10 |
| `app/page.js`, `login`, `forgot-password`, `set-password`, `perfil` | Redirect, acceso y perfil | 4 |
| `components/PanelFilter.js`, `PeriodSelector.js` | Filtros compartidos | 4 |
| `app/dashboard/page.js`, `ranking`, `alertas`, `reporte`, `metas`, `centros` | Operación administrativa | 5 |
| `app/dashboard/crecimiento`, `historial`, `entrenamiento` | Comparaciones y gráficos administrativos | 6 |
| `app/dashboard/usuarios/UsuariosClient.js` | UI responsive por capacidades | 7 |
| `app/centro/[id]/page.js`, `ruta-nivel`, `kpi` | Resumen, ruta y captura KPI | 8 |
| `app/centro/[id]/grupos`, `eventos`, `coach/[token]`, `PlanNino` | Operación diaria | 9 |
| `app/centro/[id]/cuadro`, `cumplimiento`, `foda`, `historial`, `entrenamiento/**`, `components/foda/**` | Comparaciones, formularios y aprendizaje | 10 |
| `components/growth/GrowthBriefing.js`, `components/tour/TourHost.js` | Overlays compartidos | 3, 10 |
| `components/NivelBadge.js`, `components/SelectorAncla.js`, `components/growth/GrowthSummaryBand.js` | Tipografía y controles compartidos pequeños | 1, 6, 8 |
| `package.json`, `package-lock.json`, `.gitignore` | Scripts, Playwright y artefactos ignorados | 2 |

## Interfaces bloqueadas

```jsx
<Dialog
  open={boolean}
  title="Título visible"
  description="Descripción opcional"
  onClose={function}
  initialFocusRef={refOpcional}
  footer={node}
  width={560}
>
  {children}
</Dialog>

<TableScroller label="Comparación mensual" stickyFirstColumn>
  <table className="table">…</table>
</TableScroller>

<OperationalCard
  headingLevel={3}
  title="Nombre"
  subtitle="Correo o contexto"
  status={node}
  fields={[{ label: 'Centro', value: 'DAVID' }]}
  actions={node}
/>

<MeasuredChart label="Evolución de niños activos" minHeight={280}>
  {({ width, height }) => <Chart width={width} height={height} />}
</MeasuredChart>
```

Clases compartidas:

```text
page-actions       encabezado/acciones que envuelven
form-grid          1 columna móvil, 2 tablet, configuración desktop local
responsive-grid    auto-fit con min-width:0
mobile-only        visible <768
desktop-only       visible ≥768
operational-list   contenedor de OperationalCard
dialog-form-grid   1 columna móvil, 2 desde 768
dialog-actions     footer apilado móvil
table-scroller     única región de overflow-x
```

---

### Task 1: Fundaciones y primitivas responsive

**Files:**
- Modify: `app/layout.js`
- Modify: `app/globals.css`
- Create: `components/Dialog.js`
- Create: `components/TableScroller.js`
- Create: `components/OperationalCard.js`
- Create: `components/MeasuredChart.js`
- Create: `test/responsive-ui.test.mjs`

**Interfaces:**
- Consumes: design tokens y componentes React actuales.
- Produces: las cuatro interfaces y clases bloqueadas que usan todas las tareas siguientes.

- [ ] **Step 1: Crear el contrato fuente RED**

Crear `test/responsive-ui.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('el CSS global no contiene antipatrones que oculten o animen todo', () => {
  const css = read('../app/globals.css')
  assert.doesNotMatch(css, /transition:\s*all\b/)
  assert.doesNotMatch(css, /body[^}]*overflow-x:\s*hidden/s)
  assert.match(css, /100dvh/)
  assert.match(css, /safe-area-inset/)
  assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)/)
})

test('existen primitivas accesibles compartidas', () => {
  const dialog = read('../components/Dialog.js')
  assert.match(dialog, /role="dialog"/)
  assert.match(dialog, /aria-modal="true"/)
  assert.match(dialog, /Escape/)
  assert.match(dialog, /initialFocusRef/)
  assert.match(dialog, /focus\(\)/)
  const table = read('../components/TableScroller.js')
  assert.match(table, /role="region"/)
  assert.match(table, /tabIndex=\{0\}/)
  assert.match(table, /data-horizontal-scroll/)
  const card = read('../components/OperationalCard.js')
  assert.match(card, /headingLevel\s*=\s*3/)
  assert.match(card, /const Heading/)
})

test('los tokens móviles fijan tipografía y objetivos táctiles', () => {
  const css = read('../app/globals.css')
  assert.match(css, /--mobile-body:\s*15px/)
  assert.match(css, /--mobile-input:\s*16px/)
  assert.match(css, /--touch-target:\s*44px/)
  assert.match(css, /\.btn[^}]*min-height:\s*var\(--touch-target\)/s)
})

test('el layout ofrece salto visible al contenido', () => {
  const layout = read('../app/layout.js')
  assert.match(layout, /href="\#main-content"/)
  assert.match(layout, /Saltar al contenido/)
})
```

- [ ] **Step 2: Confirmar el fallo**

Run: `node --test test/responsive-ui.test.mjs`

Expected: FAIL por `transition: all`, falta de `100dvh`, skip link y componentes inexistentes.

- [ ] **Step 3: Añadir tokens y reglas base**

En `:root`:

```css
--mobile-body: 15px;
--mobile-label: 13px;
--mobile-caption: 12px;
--mobile-input: 16px;
--touch-target: 44px;
--mobile-bar-height: 64px;
```

Cambiar `.btn` a propiedades explícitas y mínimo táctil:

```css
.btn {
  min-height: var(--touch-target);
  touch-action: manipulation;
  transition: color .2s var(--ease), background-color .2s var(--ease), border-color .2s var(--ease), box-shadow .2s var(--ease), transform .2s var(--ease);
}
.btn:active { transform: translateY(1px); }
```

Agregar `.page-actions`, `.form-grid`, `.responsive-grid`, `.mobile-only`, `.desktop-only`, `.operational-list`, `.dialog-form-grid`, `.dialog-actions` y reglas de `overflow-wrap:anywhere`, `min-width:0`, `text-wrap:balance` para títulos.

```css
.page-actions,.dialog-actions { display:flex; align-items:center; justify-content:space-between; gap:12px; flex-wrap:wrap; }
.form-grid,.dialog-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
.responsive-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr)); gap:14px; }
.page-actions > *,.form-grid > *,.dialog-form-grid > *,.responsive-grid > * { min-width:0; }
.operational-list { display:grid; gap:12px; }
.mobile-only.operational-list { display:none!important; }
.operational-card { min-width:0; padding:16px; border:1px solid var(--border); border-radius:var(--r-sm); background:var(--surface-1); }
.operational-card__header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; min-width:0; }
.operational-card :is(h2,h3,h4),.operational-card p,.operational-card dd { overflow-wrap:anywhere; }
.operational-card dl { display:grid; gap:10px; margin:14px 0 0; }
.operational-card dl > div { display:grid; grid-template-columns:minmax(90px,.7fr) minmax(0,1.3fr); gap:10px; }
.operational-card dt { color:var(--text-dim); font-size:13px; }
.operational-card dd { margin:0; }
.operational-card__actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
.mobile-only { display:none!important; }
.desktop-only { display:block; }
```

En `app/layout.js`, justo al abrir `<body>`, agregar:

```jsx
<a className="skip-link" href="#main-content">Saltar al contenido</a>
```

Completar el export existente sin bloquear zoom:

```js
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#00556D',
}
```

```css
.skip-link { position:fixed; top:8px; left:8px; z-index:100; transform:translateY(-160%); padding:10px 14px; border-radius:var(--r-sm); background:var(--aloha-petroleo); color:#fff; }
.skip-link:focus { transform:translateY(0); }
```

Cada página renderizada tendrá exactamente un `id="main-content"`; `app/page.js` se convierte en redirect servidor en Task 4 y queda exenta.

En `@media (max-width:767px)`:

```css
body { font-size: var(--mobile-body); }
.main { min-width: 0; padding: 18px 14px max(24px, env(safe-area-inset-bottom)); }
.label { font-size: var(--mobile-label); letter-spacing: .08em; }
.table thead th, .pill { font-size: var(--mobile-caption); }
.h-sub { font-size: var(--mobile-label); }
.h-title { font-size: clamp(1.55rem, 8vw, 2.4rem); line-height: 1.12; text-wrap: balance; }
input, select, textarea, .input { font-size: var(--mobile-input); }
.kpi-grid, .responsive-grid, .form-grid, .dialog-form-grid { grid-template-columns: minmax(0, 1fr); }
.page-actions, .dialog-actions { align-items: stretch; flex-direction: column; }
.page-actions .btn, .dialog-actions .btn { width: 100%; }
.operational-card dl > div { grid-template-columns:minmax(0,1fr); gap:2px; }
.operational-card__actions .btn { flex:1 1 100%; width:100%; }
.mobile-only { display:block!important; }
.mobile-only.operational-list { display:grid!important; }
.desktop-only { display: none !important; }
}
```

En `@media (min-width:768px)` definir `.mobile-only{display:none!important}` y `.desktop-only{display:block}`. No aplicar `overflow-x:hidden` al documento.

En tableta limitar explícitamente las rejillas compartidas:

```css
@media (min-width:768px) and (max-width:1024px) {
  .responsive-grid,.kpi-grid { grid-template-columns:repeat(2,minmax(0,1fr)); }
}
```

Respetar movimiento reducido sin `transition:all`:

```css
@media (prefers-reduced-motion:reduce) {
  *,*::before,*::after { scroll-behavior:auto!important; animation-duration:.01ms!important; animation-iteration-count:1!important; transition-duration:.01ms!important; }
}
```

- [ ] **Step 4: Implementar `Dialog`**

`components/Dialog.js` debe:

- guardar `document.activeElement` al abrir;
- bloquear `document.body.style.overflow` y restaurar el valor exacto al cerrar;
- enfocar `initialFocusRef.current`, el primer elemento interactivo o el contenedor;
- en `keydown`, cerrar con `Escape` y ciclar `Tab` entre elementos enfocables;
- cerrar por backdrop solo cuando `event.target === event.currentTarget`;
- restaurar foco al disparador;
- usar IDs derivados de `useId()` para título/descripción.

Implementación exacta:

```jsx
'use client'
import { useEffect, useId, useRef } from 'react'

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export default function Dialog({ open, title, description, onClose, initialFocusRef, footer, width = 560, children }) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = `${useId()}-title`
  const descriptionId = `${useId()}-description`

  useEffect(() => { onCloseRef.current = onClose }, [onClose])
  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const dialog = dialogRef.current
    const focusables = () => [...dialog.querySelectorAll(FOCUSABLE)]
    const frame = requestAnimationFrame(() => {
      ;(initialFocusRef?.current || focusables()[0] || dialog).focus()
    })
    const onKeyDown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab') return
      const nodes = focusables()
      if (nodes.length === 0) { event.preventDefault(); dialog.focus(); return }
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus?.()
    }
  }, [open, initialFocusRef])

  const onBackdrop = (event) => {
    if (event.target === event.currentTarget) onClose()
  }

  return open ? (
    <div className="dialog-backdrop" onPointerDown={onBackdrop}>
      <section ref={dialogRef} className="dialog" style={{ '--dialog-width': `${width}px` }}
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined} tabIndex={-1}>
        <header className="dialog__header">
          <div><h2 id={titleId}>{title}</h2>{description && <p id={descriptionId}>{description}</p>}</div>
          <button type="button" className="dialog__close" onClick={onClose} aria-label="Cerrar diálogo">×</button>
        </header>
        <div className="dialog__body">{children}</div>
        {footer && <footer className="dialog__footer">{footer}</footer>}
      </section>
    </div>
  ) : null
}
```

CSS exacto:

```css
.dialog-backdrop { position:fixed; inset:0; z-index:80; display:grid; place-items:center; min-height:100dvh; padding:max(12px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left)); background:rgba(0,0,0,.58); overscroll-behavior:contain; }
.dialog { display:grid; grid-template-rows:auto minmax(0,1fr) auto; width:min(var(--dialog-width),100%); max-height:calc(100dvh - 24px - env(safe-area-inset-top) - env(safe-area-inset-bottom)); border:1px solid var(--border); border-radius:var(--r); background:var(--surface-1); box-shadow:var(--chart-tooltip-shadow); }
.dialog__header,.dialog__footer { display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px 16px; }
.dialog__body { min-width:0; overflow:auto; overscroll-behavior:contain; padding:16px; }
.dialog__close { flex:0 0 44px; width:44px; height:44px; }
@media (max-width:767px) { .dialog-backdrop { place-items:end center; padding-inline:0; } .dialog { width:100%; border-radius:var(--r) var(--r) 0 0; } .dialog__footer { align-items:stretch; flex-direction:column; } .dialog__footer .btn { width:100%; } }
```

- [ ] **Step 5: Implementar tabla, tarjeta y gráfico**

`TableScroller`:

```jsx
export default function TableScroller({ label, stickyFirstColumn = false, children }) {
  return (
    <div className={`table-scroller${stickyFirstColumn ? ' table-scroller--sticky' : ''}`}
      role="region" aria-label={label} tabIndex={0} data-horizontal-scroll="">
      <p className="table-scroller__hint">Desliza para comparar →</p>
      <div className="table-scroller__viewport">{children}</div>
    </div>
  )
}
```

```css
.table-scroller { max-width:100%; overflow-x:auto; overscroll-behavior-inline:contain; border-radius:var(--r-sm); }
.table-scroller:focus-visible { outline:3px solid var(--ts-green); outline-offset:3px; }
.table-scroller__hint { position:sticky; left:0; width:max-content; margin:0 0 6px; color:var(--text-dim); font-size:12px; }
.table-scroller__viewport { width:max-content; min-width:100%; }
.table-scroller--sticky th:first-child,.table-scroller--sticky td:first-child { position:sticky; left:0; z-index:2; background:var(--surface-1); box-shadow:1px 0 0 var(--border); }
@media (min-width:768px) { .table-scroller__hint { display:none; } }
```

`OperationalCard`:

```jsx
export default function OperationalCard({ headingLevel = 3, title, subtitle, status, fields = [], actions }) {
  const Heading = headingLevel === 2 ? 'h2' : headingLevel === 4 ? 'h4' : 'h3'
  const visibleFields = fields.filter(({ value }) => value !== null && value !== undefined && value !== '')
  return <article className="operational-card">
    <header className="operational-card__header">
      <div><Heading>{title}</Heading>{subtitle && <p>{subtitle}</p>}</div>
      {status && <div className="operational-card__status">{status}</div>}
    </header>
    {visibleFields.length > 0 && <dl>
      {visibleFields.map(({ label, value }, index) => <div key={`${label}-${index}`}>
        <dt>{label}</dt><dd>{value}</dd>
      </div>)}
    </dl>}
    {actions && <footer className="operational-card__actions">{actions}</footer>}
  </article>
}
```

`MeasuredChart`:

```jsx
'use client'
import { useEffect, useRef, useState } from 'react'

export default function MeasuredChart({ label, minHeight = 280, children }) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const node = ref.current
    if (!node) return undefined
    const measure = () => setWidth(Math.max(0, Math.round(node.getBoundingClientRect().width)))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [])
  return <div ref={ref} className="measured-chart" role="img" aria-label={label}
    style={{ minHeight }}>
    {width > 0 ? children({ width, height: minHeight }) : null}
  </div>
}
```

El dato equivalente continúa en HTML junto al gráfico; no se esconde dentro del `role="img"`.

```css
.measured-chart { width:100%; max-width:100%; min-width:0; }
```

Cada uso de `OperationalCard` fija `headingLevel` según el encabezado anterior de la página; si no existe un `<h2>` de sección, usa `headingLevel={2}`.

- [ ] **Step 6: Ejecutar pruebas y build**

Run: `node --test test/responsive-ui.test.mjs`

Expected: 4 pruebas pasan.

Run: `npm run build`

Expected: build exitoso.

- [ ] **Step 7: Commit**

```bash
git add app/layout.js app/globals.css components/Dialog.js components/TableScroller.js components/OperationalCard.js components/MeasuredChart.js test/responsive-ui.test.mjs
git commit -m "feat(ui): agregar primitivas responsive accesibles"
```

---

### Task 2: Auditoría Playwright, top bar y drawer

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Create: `playwright.config.mjs`
- Create: `tests/e2e/auth.setup.js`
- Create: `tests/e2e/helpers/audit-page.js`
- Create: `tests/e2e/navigation-drawer.spec.js`
- Create: `tests/e2e/rollback-smoke.mjs`
- Modify: `components/Sidebar.js`
- Modify: `components/ThemeToggle.js`
- Modify: `app/globals.css`
- Modify: `test/responsive-ui.test.mjs`

**Interfaces:**
- Consumes: `navigationContext` del plan de permisos.
- Produces: shell responsive y helper `auditPage(page, { mobile })` usado por todas las rutas.

- [ ] **Step 1: Instalar Playwright y Axe sin descargar otro navegador**

Run: `npm install --save-dev @playwright/test @axe-core/playwright`

Expected: `package.json` y `package-lock.json` incluyen ambas dependencias; no ejecutar `playwright install` porque las pruebas usan `channel:'chrome'`.

Agregar scripts:

```json
"test:responsive": "playwright test",
"test:responsive:update": "playwright test --update-snapshots"
```

Agregar a `.gitignore`:

```text
/playwright-report/
/test-results/
/tests/e2e/.auth/
/artifacts/responsive-audit/
```

- [ ] **Step 2: Crear configuración de 6 viewports**

`playwright.config.mjs`:

```js
import { defineConfig } from '@playwright/test'

const baseURL = process.env.RESPONSIVE_BASE_URL || 'http://127.0.0.1:3000'
const remoteRun = Boolean(process.env.RESPONSIVE_BASE_URL)
const testDatabase = process.env.USUARIOS_TEST_DATABASE_URL
if (!remoteRun && (!testDatabase || process.env.E2E_DATABASE_CONFIRM !== 'disposable')) {
  throw new Error('E2E local exige USUARIOS_TEST_DATABASE_URL y E2E_DATABASE_CONFIRM=disposable.')
}
const sizes = [
  ['phone-320', 320, 568], ['phone-375', 375, 667], ['phone-390', 390, 844],
  ['phone-430', 430, 932], ['tablet-768', 768, 1024], ['desktop-1440', 1440, 900],
]

export default defineConfig({
  testDir: './tests/e2e',
  outputDir: 'test-results',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  expect: { timeout: 10_000 },
  use: { baseURL, channel: 'chrome', trace: 'off', screenshot: 'only-on-failure' },
  webServer: remoteRun ? undefined : {
    command: 'npm run dev', url: baseURL, reuseExistingServer: false, timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: testDatabase,
      E2E_DATABASE_CONFIRM: 'disposable',
      E2E_DELIVERY_MODE: 'stub',
      NODE_ENV: 'development',
    },
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.js/ },
    ...sizes.map(([name, width, height]) => ({
      name,
      dependencies: ['setup'],
      testIgnore: /(auth\.setup|users-coordinator\.spec|center-user\.spec|users-mutations\.local\.spec)\.js/,
      use: { viewport: { width, height }, storageState: 'tests/e2e/.auth/admin.json' },
    })),
    {
      name: 'coordinator-audit',
      testMatch: /users-coordinator\.spec\.js/,
      dependencies: ['setup'],
      use: { viewport: { width: 390, height: 844 }, storageState: 'tests/e2e/.auth/coordinator.json' },
    },
    {
      name: 'center-audit',
      testMatch: /center-user\.spec\.js/,
      dependencies: ['setup'],
      use: { viewport: { width: 390, height: 844 }, storageState: 'tests/e2e/.auth/center.json' },
    },
    {
      name: 'users-mutations-local',
      testMatch: /users-mutations\.local\.spec\.js/,
      dependencies: ['setup'],
      use: { viewport: { width: 390, height: 844 }, storageState: 'tests/e2e/.auth/admin.json' },
    },
  ],
})
```

`auth.setup.js` valida `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_COORDINATOR_EMAIL`, `E2E_COORDINATOR_PASSWORD`, `E2E_CENTER_EMAIL`, `E2E_CENTER_PASSWORD` y `E2E_CENTRO_ID`; crea tres contextos aislados y guarda `admin.json`, `coordinator.json` y `center.json`. Gerencia/coordinador esperan `/dashboard`; la cuenta de centro —fixture `administradora` o `asistente` asignada a `E2E_CENTRO_ID`— espera `/centro/${E2E_CENTRO_ID}`. Nunca imprime credenciales.

- [ ] **Step 3: Crear el helper geométrico**

`tests/e2e/helpers/audit-page.js`:

```js
import { expect } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join, resolve } from 'node:path'

export async function auditPage(page, { mobile, state = 'ready' }) {
  await expect(page.locator(`#main-content[data-page-state="${state}"]`)).toHaveCount(1, { timeout: 15_000 })
  const result = await page.evaluate(({ mobile }) => {
    const visible = (el) => {
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) !== 0 && r.width > 0 && r.height > 0
    }
    const failures = []
    const root = document.documentElement
    if (root.scrollWidth > root.clientWidth + 1) failures.push(`document overflow ${root.scrollWidth}/${root.clientWidth}`)
    if (mobile) {
      for (const el of document.querySelectorAll('a[href],button,.btn,[role="button"],[role="radio"],[role="tab"],[role="menuitem"],summary,select,textarea,input:not([type="hidden"])')) {
        if (!visible(el) || el.matches('.skip-link:not(:focus)')) continue
        const target = ['checkbox', 'radio'].includes(el.type) ? el.closest('label') || el : el
        const r = target.getBoundingClientRect()
        if (!el.closest('[data-horizontal-scroll]') && (r.left < -1 || r.right > window.innerWidth + 1)) failures.push(`clipped ${el.tagName}.${el.className || ''} ${Math.round(r.left)}..${Math.round(r.right)}`)
        if (r.width < 44 || r.height < 44) failures.push(`${el.tagName}.${el.className || ''} ${Math.round(r.width)}x${Math.round(r.height)}`)
      }
      for (const el of document.querySelectorAll('input:not([type="hidden"]),select,textarea')) {
        if (visible(el) && parseFloat(getComputedStyle(el).fontSize) < 16) failures.push(`input font ${getComputedStyle(el).fontSize}`)
      }
      for (const el of document.body.querySelectorAll('*')) {
        const ownText = [...el.childNodes].some((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim())
        if (!ownText || !visible(el) || el.matches('script,style,.skip-link:not(:focus)') || el.classList.contains('sr-only') || el.getAttribute('aria-hidden') === 'true') continue
        const size = parseFloat(getComputedStyle(el).fontSize)
        if (size < 12) failures.push(`text font ${el.tagName}.${el.className || ''} ${size}px`)
        if (el.matches('label,.label,.h-sub,td,dt,dd') && size < 13) failures.push(`secondary font ${el.tagName}.${el.className || ''} ${size}px`)
        if (el.matches('p:not(.h-sub):not(.label):not(.caption):not(.chart-legend):not(.table-scroller__hint),li') && size < 15) failures.push(`body font ${el.tagName}.${el.className || ''} ${size}px`)
      }
    }
    return failures
  }, { mobile })
  expect(result, result.join('\n')).toEqual([])
}

export async function capturePage(page, { name, testInfo }) {
  if (!process.env.E2E_CAPTURE_DIR) return
  const folder = resolve(process.env.E2E_CAPTURE_DIR, testInfo.project.name)
  await mkdir(folder, { recursive: true })
  const filename = `${name.replaceAll(/[^a-z0-9]+/gi, '-') || 'root'}.png`
  await page.screenshot({ path: join(folder, filename), fullPage: true })
}
```

`full-route-audit.spec.js` llama `capturePage(page,{name:route,testInfo})`; `public-responsive.spec.js` usa nombres fijos `root`, `login`, `forgot-password`, `set-password-invalid` y `set-password-valid`, nunca la URL que contiene el token.

Crear además `tests/e2e/rollback-smoke.mjs`, un harness deliberadamente compatible con la versión anterior y posterior al cambio. Importa Playwright con `pathToFileURL(resolve(process.cwd(), 'node_modules/playwright/index.mjs'))`, recibe `RESPONSIVE_BASE_URL` y las credenciales E2E sin imprimirlas, y comprueba en 390×844: Login público, login de gerencia y acceso a `/dashboard`, login del usuario de centro y acceso a `/centro/${E2E_CENTRO_ID}`, denegación de `/dashboard/usuarios` para el usuario de centro y ausencia de overflow raíz en las dos vistas principales. No usa `data-page-state`, drawer ni selectores nuevos, de modo que puede ejecutarse después de revertir el commit que lo agregó. Step 5 lo ejecuta obligatoriamente contra preview y contra la producción anterior antes del merge; no se acepta un harness sin ese doble gate.

```js
import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const { chromium } = await import(pathToFileURL(resolve(process.cwd(), 'node_modules/playwright/index.mjs')).href)
const baseURL = String(process.env.RESPONSIVE_BASE_URL || '').replace(/\/$/, '')
const required = ['RESPONSIVE_BASE_URL', 'E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD', 'E2E_CENTER_EMAIL', 'E2E_CENTER_PASSWORD', 'E2E_CENTRO_ID']
for (const name of required) assert.ok(process.env[name], `${name} es obligatorio`)

async function assertNoRootOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1, `${label}: overflow ${geometry.scrollWidth}/${geometry.clientWidth}`)
}

async function login(context, email, password, expectedPath) {
  const page = await context.newPage()
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => expectedPath.test(url.pathname), { timeout: 15_000 })
  return page
}

const browser = await chromium.launch({ channel: 'chrome' })
try {
  const publicContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const publicPage = await publicContext.newPage()
  await publicPage.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' })
  assert.ok(await publicPage.locator('input[type="email"]').isVisible())
  await assertNoRootOverflow(publicPage, 'login')
  await publicContext.close()

  const adminContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const adminPage = await login(adminContext, process.env.E2E_ADMIN_EMAIL, process.env.E2E_ADMIN_PASSWORD, /^\/dashboard/)
  await assertNoRootOverflow(adminPage, 'dashboard gerencia')
  await adminContext.close()

  const centerContext = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const centerPath = new RegExp(`^/centro/${Number(process.env.E2E_CENTRO_ID)}(?:/|$)`)
  const centerPage = await login(centerContext, process.env.E2E_CENTER_EMAIL, process.env.E2E_CENTER_PASSWORD, centerPath)
  await assertNoRootOverflow(centerPage, 'inicio centro')
  await centerPage.goto(`${baseURL}/dashboard/usuarios`, { waitUntil: 'domcontentloaded' })
  await centerPage.waitForURL((url) => url.pathname !== '/dashboard/usuarios', { timeout: 15_000 })
  await centerContext.close()
} finally {
  await browser.close()
}
```

- [ ] **Step 4: Escribir pruebas RED del drawer**

`navigation-drawer.spec.js`:

```js
import { test, expect } from '@playwright/test'
import { auditPage } from './helpers/audit-page'

test('shell no desborda y drawer conserva navegación, foco y Escape', async ({ page }, testInfo) => {
  await page.goto('/dashboard')
  const mobile = testInfo.project.use.viewport.width <= 1024
  await auditPage(page, { mobile })
  if (!mobile) {
    await expect(page.getByRole('complementary')).toBeVisible()
    return
  }
  const trigger = page.getByRole('button', { name: 'Abrir menú' })
  await trigger.click()
  const dialog = page.getByRole('dialog', { name: 'Navegación principal' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('body')).toHaveCSS('overflow', 'hidden')
  const focusables = dialog.locator('a[href],button:not([disabled]),select,input')
  await focusables.last().focus()
  await page.keyboard.press('Tab')
  await expect(focusables.first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await dialog.getByRole('button', { name: 'Cerrar menú' }).click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await page.getByRole('button', { name: 'Cerrar menú al tocar fuera' }).click()
  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await dialog.getByRole('link', { name: 'Crecimiento' }).click()
  await expect(page).toHaveURL(/\/dashboard\/crecimiento$/)
  await expect(dialog).toBeHidden()
})
```

Run: `npx playwright test tests/e2e/navigation-drawer.spec.js --project=phone-390`

Expected: FAIL porque el rail móvil no tiene trigger ni drawer.

- [ ] **Step 5: Implementar top bar y drawer en `Sidebar`**

Usar `<Link>` para destinos. Añadir estado `drawerOpen`, refs de trigger/drawer y el mismo ciclo de foco de `Dialog`. Estructura:

```jsx
<>
  <header className="mobile-bar">
    <button ref={triggerRef} type="button" className="mobile-bar__menu"
      aria-label="Abrir menú" aria-expanded={drawerOpen} onClick={() => setDrawerOpen(true)}>
      <Icon name="menu" />
    </button>
    <Logo size={34} />
    <span className="mobile-bar__context">{centroNombre || roleLabel}</span>
  </header>
  {drawerOpen && <button className="sb-backdrop" aria-label="Cerrar menú al tocar fuera" onClick={closeDrawer} />}
  <aside ref={drawerRef} className={`sb${drawerOpen ? ' sb--open' : ''}`}
    aria-label="Navegación principal" role={isMobile ? 'dialog' : undefined}
    aria-modal={isMobile ? 'true' : undefined}
    aria-hidden={isMobile ? !drawerOpen : undefined}
    inert={isMobile && !drawerOpen ? '' : undefined}>
    <button type="button" className="sb__close mobile-only" aria-label="Cerrar menú" onClick={closeDrawer}>×</button>
    {sidebarContent}
  </aside>
</>
```

No guardar `isMobile` con una lectura única de `window.innerWidth`; usar `matchMedia('(max-width:1024px)')` con listener. Cerrar drawer al cambiar `pathname`.

- [ ] **Step 6: Sustituir el rail de 64 px por CSS de drawer**

Eliminar el bloque `@media (max-width:680px)` que reduce `.sb` a 64 px. Añadir:

```css
.mobile-bar { display:none; }
@media (max-width:1024px) {
  .shell { display:block; min-height:100dvh; }
  .mobile-bar { position:sticky; top:0; z-index:45; display:grid; grid-template-columns:44px auto minmax(0,1fr); min-height:var(--mobile-bar-height); padding:max(8px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) 8px max(12px,env(safe-area-inset-left)); }
  .mobile-bar__menu { width:44px; height:44px; }
  .sb__close { width:44px; height:44px; margin-left:auto; }
  .sb { position:fixed; inset:0 auto 0 0; z-index:60; width:min(320px,calc(100vw - 32px)); min-height:100dvh; padding-top:max(0px,env(safe-area-inset-top)); padding-bottom:max(12px,env(safe-area-inset-bottom)); visibility:hidden; transform:translateX(-100%); transition:transform .2s var(--ease),visibility 0s .2s; }
  .sb--open { visibility:visible; transform:translateX(0); transition-delay:0s; }
  .sb-backdrop { position:fixed; inset:0; z-index:55; width:100%; height:100%; border:0; background:rgba(0,0,0,.55); }
  .main { width:100%; overflow:visible; }
}
```

Agregar padding seguro inferior al footer del drawer y `overscroll-behavior:contain` al nav.

- [ ] **Step 7: Verificar y commit**

Run: `node --test test/responsive-ui.test.mjs`

Run: `npx playwright test tests/e2e/navigation-drawer.spec.js --project=phone-320 --project=tablet-768 --project=desktop-1440`

Expected: todos pasan.

```bash
git add package.json package-lock.json .gitignore playwright.config.mjs tests/e2e components/Sidebar.js components/ThemeToggle.js app/globals.css test/responsive-ui.test.mjs
git commit -m "feat(ui): agregar navegación móvil y auditoría geométrica"
```

---

### Task 3: Unificar overlays, diálogos y tour

**Files:**
- Modify: `components/growth/GrowthBriefing.js`
- Modify: `components/PlanNino.js`
- Modify: `components/tour/TourHost.js`
- Modify: `app/centro/[id]/grupos/page.js`
- Modify: `app/centro/[id]/cuadro/page.js`
- Modify: `app/centro/[id]/eventos/page.js`
- Modify: `app/globals.css`
- Create: `tests/e2e/dialogs.spec.js`
- Modify: `test/responsive-ui.test.mjs`

**Interfaces:**
- Consumes: `Dialog` y clases de Task 1.
- Produces: todos los overlays con semántica, foco, altura dinámica y footer móvil.

- [ ] **Step 1: Extender contrato fuente RED**

Agregar al test unitario:

```js
test('los modales operativos usan Dialog compartido', () => {
  for (const path of [
    '../components/PlanNino.js', '../components/growth/GrowthBriefing.js',
    '../app/centro/[id]/grupos/page.js', '../app/centro/[id]/cuadro/page.js',
    '../app/centro/[id]/eventos/page.js',
  ]) assert.match(read(path), /from ['"].*Dialog['"]/)
  assert.doesNotMatch(read('../app/centro/[id]/eventos/page.js'), /overflowX:\s*['"]visible/)
})
```

Run: `node --test test/responsive-ui.test.mjs`

Expected: FAIL; los overlays están duplicados.

- [ ] **Step 2: Migrar bases modales**

- `grupos/page.js`: reemplazar `BaseModal` por un wrapper de `Dialog`; conservar firma `BaseModal({ title, onClose, children, width })` para no modificar cada formulario.
- `cuadro/page.js`: reemplazar `Modal` local por `Dialog` y mantener `width`.
- `eventos/page.js`: reemplazar los dos backdrops por `Dialog`; mover acciones a `footer`; `dialog-form-grid` sustituye grids inline `1fr 1fr`.
- `PlanNino.js`: usar `Dialog` con título `Plan de …` y footer existente.
- `GrowthBriefing.js`: usar `Dialog`; conservar comandos y foco inicial en el título.

Agregar `id="main-content"` a los `<main>` de Grupos, Cuadro y Eventos si todavía no lo incorporaron otras tareas; cada ruta conserva un solo target.

En cada caso, quitar `onClick={e=>e.stopPropagation()}` y estilos fixed duplicados. Inputs y payloads no cambian.

- [ ] **Step 3: Adaptar overlays no modales**

- Menú de acciones de Eventos: medir el botón, fijar `left = clamp(8, x, innerWidth-width-8)` y `top = clamp(8, y, innerHeight-height-8)` después de render; cerrar con Escape y devolver foco.
- Sheet de Grupos: `max-height:100dvh`, safe area, botón cerrar de 44 px y `overscroll-behavior:contain`.
- Tour: `max-height:calc(100dvh - 24px - env(safe-area-inset-bottom))`; controles 44 px; `ResizeObserver`/listeners recalculan posición; la tarjeta usa `role="dialog"` con título asociado y no se sale de 320 px.

El menú flotante usa este cálculo, compartido en el componente y cubierto a 320 px:

```js
const clamp = (min, value, max) => Math.min(Math.max(value, min), Math.max(min, max))
function positionFloating(trigger, menu) {
  const t = trigger.getBoundingClientRect()
  const m = menu.getBoundingClientRect()
  return {
    left: clamp(8, t.right - m.width, window.innerWidth - m.width - 8),
    top: clamp(8, t.bottom + 6, window.innerHeight - m.height - 8),
  }
}
```

El sheet y tour aplican clases, no estilos inline duplicados:

```css
.mobile-sheet { max-height:100dvh; padding-bottom:max(16px,env(safe-area-inset-bottom)); overflow:auto; overscroll-behavior:contain; }
.tour-card { width:min(360px,calc(100vw - 24px)); max-height:calc(100dvh - 24px - env(safe-area-inset-bottom)); overflow:auto; }
.mobile-sheet__close,.tour-card button { min-width:44px; min-height:44px; }
```

- [ ] **Step 4: Crear prueba funcional de diálogos**

`tests/e2e/dialogs.spec.js` usa fixtures con grupo, niño con plan, clase de prueba y registro pendiente. Mantener un inventario ejecutable; si falta un disparador, la prueba falla explicando qué dato requiere:

```js
const cases = [
  { suffix: '/grupos', trigger: /Aperturar grupo/i },
  { suffix: '/grupos', trigger: /^Inscribir niño$/i },
  { suffix: '/grupos', trigger: /va por S\d+|sin plan/i, dialog: /Plan de/i },
  { suffix: '/eventos', trigger: /Nueva clase de prueba/i },
  { suffix: '/eventos', trigger: /^Inscribir$/i, dialog: /Inscribir niño/i },
  { suffix: '/cuadro', trigger: /Retirar|Reincorporar/i },
]
```

Si falta un caso, no se usa `test.skip`: falla con `E2E_CENTRO_ID no cumple fixture para <caso>`. Para cada diálogo, probar 320×568 y 844×390; enfocar el último campo, desplazar el cuerpo y exigir que footer/cerrar sigan alcanzables. Después rotar de vuelta a 390×844 y repetir `auditPage`:

```js
await trigger.click()
const dialog = page.getByRole('dialog')
await expect(dialog).toBeVisible()
await expect(dialog.getByRole('button', { name: /cerrar/i })).toBeVisible()
await auditPage(page, { mobile: true })
const axe = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze()
expect(axe.violations, JSON.stringify(axe.violations, null, 2)).toEqual([])
await page.keyboard.press('Escape')
await expect(dialog).toBeHidden()
await expect(trigger).toBeFocused()
```

No guardar formularios; cancelar siempre.

El mismo spec importa `AxeBuilder`, abre el botón de acciones `⋯` de la primera clase (al implementarlo recibe `aria-label="Acciones de <clase>"` y `role="menu"`), comprueba geometría y WCAG A/AA del menú a 320×568, cierra con Escape y verifica foco restaurado. Luego abre el tour directamente en `/centro/${id}?tour=meta&paso=1`, espera `role="dialog"`, navega un paso de solo lectura, rota 390×844 → 844×390 → 390×844 y comprueba foco, rectángulo y Axe en cada tamaño.

`GrowthBriefing` queda cubierto por el contrato fuente de migración a `Dialog` y por una prueba local con `E2E_BRIEFING_CENTRO_ID` en la DB desechable; no se fuerza en preview/producción porque abrirlo escribe un recibo `shown` y el smoke remoto debe ser read-only. Esa prueba local exige que aparezca y lo cierra solo con Escape, restaurando el fixture en `after`.

```js
test('GrowthBriefing cabe y conserva foco en DB desechable', async ({ page }) => {
  test.skip(Boolean(process.env.RESPONSIVE_BASE_URL), 'el smoke remoto es estrictamente read-only')
  const briefingCenter = process.env.E2E_BRIEFING_CENTRO_ID
  if (!briefingCenter) throw new Error('E2E_BRIEFING_CENTRO_ID es obligatorio en el gate local.')
  await page.goto(`/centro/${briefingCenter}`)
  const dialog = page.getByRole('dialog', { name: /faltan|reto ahora/i })
  await expect(dialog).toBeVisible()
  await auditPage(page, { mobile: true })
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
})
```

El fixture/`after` se implementa contra `USUARIOS_TEST_DATABASE_URL`, registra exactamente los IDs/recibos creados y solo revierte esos registros; nunca usa la DB productiva ni un patrón amplio de borrado.

- [ ] **Step 5: Verificar y commit**

Run: `node --test test/responsive-ui.test.mjs`

Run: `npx playwright test tests/e2e/dialogs.spec.js --project=phone-320 --project=phone-390 --project=tablet-768`

Run: `npm run build`

Expected: todo pasa.

```bash
git add components/growth/GrowthBriefing.js components/PlanNino.js components/tour/TourHost.js 'app/centro/[id]/grupos/page.js' 'app/centro/[id]/cuadro/page.js' 'app/centro/[id]/eventos/page.js' app/globals.css tests/e2e/dialogs.spec.js test/responsive-ui.test.mjs
git commit -m "refactor(ui): unificar diálogos y overlays responsive"
```

---

### Task 4: Acceso, perfil y filtros compartidos

**Files:**
- Modify: `app/page.js`
- Modify: `app/login/page.js`
- Modify: `app/forgot-password/page.js`
- Modify: `app/set-password/page.js`
- Modify: `app/perfil/page.js`
- Modify: `components/PanelFilter.js`
- Modify: `components/PeriodSelector.js`
- Modify: `app/globals.css`
- Create: `tests/e2e/public-responsive.spec.js`
- Modify: `test/responsive-ui.test.mjs`

**Interfaces:**
- Consumes: tokens, `.page-actions`, `.form-grid` y `auditPage`.
- Produces: acceso y filtros sin zoom, cortes ni controles pequeños.

- [ ] **Step 1: Añadir rutas públicas al contrato**

En el test fuente, registrar exactamente:

```js
export const PUBLIC_ROUTES = ['/', '/login', '/forgot-password', '/set-password']
export const AUTH_ACCOUNT_ROUTES = ['/perfil']
```

Leer `app/page.js` y exigir `redirect('/login')`. Leer los otros cuatro `page.js` y exigir un `<main` o `role="main"`; para inputs visibles exigir literales `name=`, `autoComplete=` y tipo adecuado.

- [ ] **Step 2: Escribir prueba RED a 320/390**

`public-responsive.spec.js` crea un contexto sin storage state para `/`, `/login`, `/forgot-password` y `/set-password`. Para `/perfil` usa el contexto del proyecto. En cada ruta espera `[data-page-state="ready"]` y llama `auditPage`; en login verifica que Email use `type="email"`, `autocomplete="email"` y que el botón Entrar quede visible.

Además exige `E2E_VALID_ACCESS_TOKEN`, declara `test.use({ trace:'off' })`, abre `/set-password?token=${encodeURIComponent(token)}`, espera el formulario válido, comprueba input de contraseña a 16 px y CTA visible, y ejecuta `auditPage` sin enviar el formulario. El título, captura y mensajes usan solo `set-password-valid`; nunca incluyen la URL/token. `/set-password` sin token conserva su prueba separada del estado inválido.

Run: `npx playwright test tests/e2e/public-responsive.spec.js --project=phone-320`

Expected: FAIL por padding, inputs de 14 px o controles menores de 44 px.

- [ ] **Step 3: Corregir acceso y perfil**

- `.login`, paneles de recuperación y set-password: `min-height:100dvh`; cada lado del padding móvil usa `max(16px, env(safe-area-inset-*));`; tarjeta `max-width:100%`.
- `app/page.js`: eliminar cliente, `useEffect` y `router.push`; usar `import { redirect } from 'next/navigation'` y `export default function Home() { redirect('/login') }`.
- Inputs: `name`, `autoComplete`, `spellCheck={false}` en correo; password `autoComplete="current-password"` o `new-password`.
- Textos de carga usan `…`, no `...`.
- Perfil: correo con `overflow-wrap:anywhere`; formulario a una columna móvil; botones ancho completo.
- Agregar `id="main-content" data-page-state="ready"` a cada main final; sus ramas de carga/error declaran el estado correspondiente.
- En Login, el mismo `<main>` usa `data-page-state={pending ? 'loading' : error ? 'error' : 'ready'}`; el submit cambia a `pending` antes de resolver la Server Action, el mensaje inválido lleva `role="alert"` y no se sustituye el árbol por una pantalla distinta. Esto permite auditar estados reales con una petición POST retenida en Playwright.

- [ ] **Step 4: Corregir filtros**

`PanelFilter` y `PeriodSelector` pasan a `display:flex; flex-wrap:wrap`; selectores y botones tienen `min-height:44px`; las etiquetas son ≥13 px en móvil. Si exceden el ancho, cada selector crece `flex:1 1 140px` en lugar de salir del viewport.

```css
.panel-filter,.period { display:flex; flex-wrap:wrap; gap:8px; min-width:0; }
.panel-filter > label,.period > label,.panel-filter > select,.period > select { flex:1 1 140px; min-width:0; min-height:44px; }
@media (max-width:767px) { .panel-filter,.period { width:100%; } }
```

- [ ] **Step 5: Verificar y commit**

Run: `node --test test/responsive-ui.test.mjs`

Run: `npx playwright test tests/e2e/public-responsive.spec.js --project=phone-320 --project=phone-390 --project=tablet-768`

Expected: todo pasa.

```bash
git add app/page.js app/login/page.js app/forgot-password/page.js app/set-password/page.js app/perfil/page.js components/PanelFilter.js components/PeriodSelector.js app/globals.css tests/e2e/public-responsive.spec.js test/responsive-ui.test.mjs
git commit -m "fix(ui): adaptar acceso perfil y filtros a móvil"
```

---

### Task 5: Panel administrativo operativo

**Files:**
- Modify: `components/NivelBadge.js`
- Modify: `app/dashboard/page.js`
- Modify: `app/dashboard/ranking/page.js`
- Modify: `app/dashboard/alertas/page.js`
- Modify: `app/dashboard/reporte/page.js`
- Modify: `app/dashboard/metas/page.js`
- Modify: `app/dashboard/centros/page.js`
- Modify: `app/globals.css`
- Create: `tests/e2e/dashboard-operations.spec.js`
- Modify: `test/responsive-ui.test.mjs`

**Interfaces:**
- Consumes: `OperationalCard`, `.responsive-grid`, `.form-grid`, `.page-actions` y `auditPage`.
- Produces: seis rutas administrativas sin tablas operativas comprimidas.

- [ ] **Step 1: Registrar el grupo de rutas y crear RED geométrico**

```js
const routes = ['/dashboard', '/dashboard/ranking', '/dashboard/alertas', '/dashboard/reporte', '/dashboard/metas', '/dashboard/centros']
for (const route of routes) test(`${route} no desborda`, async ({ page }, info) => {
  await page.goto(route)
  await auditPage(page, { mobile: info.project.use.viewport.width <= 1024 })
})
```

Run: `npx playwright test tests/e2e/dashboard-operations.spec.js --project=phone-320`

Expected: FAIL en grids fijos, tabla de centros o controles pequeños.

- [ ] **Step 2: Aplicar tratamientos exactos por ruta**

| Ruta | Escritorio | `<768 px` |
|---|---|---|
| `/dashboard` | tabla Estado de centros | `.desktop-only` tabla + `.mobile-only operational-list` con una tarjeta por centro |
| `/ranking` | podio 3 columnas + tabla | podio apilado en orden 1–2–3 + tarjetas del ranking |
| `/alertas` | resumen 3 columnas | una columna; encabezados `min-width:0` y texto con wrap |
| `/reporte` | KPIs 4 columnas + tabla | KPIs una columna + tarjetas; exportación full-width visible |
| `/metas` | filas de controles | cada meta en `.form-grid`; resumen de 5 cifras pasa a una columna |
| `/centros` | formulario 3 columnas + tabla | formulario 1 columna; tarjetas con equipo y acciones |

Cada lista reutiliza el mismo array de datos para tabla y tarjetas; no hace otra consulta. Acciones de tarjeta llaman los handlers existentes.

Patrón exacto para las listas operativas de este bloque:

```jsx
<div className="desktop-only operational-table"><table className="table">{renderRows(rows)}</table></div>
<div className="mobile-only operational-list">
  {rows.map((row) => (
    <OperationalCard key={row.id} headingLevel={2} title={row.nombre} subtitle={row.contexto}
      status={renderStatus(row)} fields={fieldsFor(row)} actions={actionsFor(row)} />
  ))}
</div>
```

Cada página define `fieldsFor/actionsFor` a partir del mismo objeto que usa `renderRows`; un estado vacío se renderiza una vez por breakpoint con el mismo texto.

- [ ] **Step 3: Corregir semántica y controles**

- Sustituir `<tr onClick>` del dashboard por `<Link>` visible `Ver ranking` o enlace en la celda principal.
- Agregar `aria-live="polite"` a cargas, resultados y errores.
- Convertir botones inline de `padding:'5px 14px'` a `.btn btn--compact`; en móvil `min-height:44px`.
- `NivelBadge` elimina tamaños menores de 12 px; nombre/estado secundario mide al menos 13 px en móvil.
- Agregar `id="main-content"` a los seis `<main>`.
- Inputs de metas/centros: etiquetas `htmlFor`, `name`, `autoComplete="off"`, `inputMode` numérico cuando corresponde.

- [ ] **Step 4: Verificar y commit**

Run: `node --test test/responsive-ui.test.mjs`

Run: `npx playwright test tests/e2e/dashboard-operations.spec.js --project=phone-320 --project=phone-390 --project=tablet-768 --project=desktop-1440`

Run: `npm run build`

Expected: todo pasa.

```bash
git add app/dashboard/page.js app/dashboard/ranking/page.js app/dashboard/alertas/page.js app/dashboard/reporte/page.js app/dashboard/metas/page.js app/dashboard/centros/page.js components/NivelBadge.js app/globals.css tests/e2e/dashboard-operations.spec.js test/responsive-ui.test.mjs
git commit -m "feat(ui): adaptar operación administrativa a móvil"
```

---

### Task 6: Comparaciones y gráficos del dashboard

**Files:**
- Modify: `app/dashboard/crecimiento/page.js`
- Modify: `app/dashboard/historial/page.js`
- Modify: `app/dashboard/entrenamiento/page.js`
- Modify: `app/dashboard/page.js`
- Modify: `components/growth/GrowthSummaryBand.js`
- Modify: `app/globals.css`
- Create: `tests/e2e/dashboard-comparisons.spec.js`
- Modify: `test/responsive-ui.test.mjs`

**Interfaces:**
- Consumes: `TableScroller`, `MeasuredChart`, `PeriodSelector` y `auditPage`.
- Produces: comparaciones densas con overflow local y gráficos con ancho medido.

- [ ] **Step 1: Crear pruebas RED del grupo**

Rutas: `/dashboard/crecimiento`, `/dashboard/historial`, `/dashboard/entrenamiento` y el gráfico de `/dashboard`.

Para cada tabla densa:

```js
const region = page.getByRole('region', { name: /comparación|crecimiento|entrenamiento/i })
await expect(region).toHaveAttribute('data-horizontal-scroll', '')
const overflow = await region.evaluate((el) => el.scrollWidth > el.clientWidth)
expect(overflow).toBe(true)
await expect(page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).resolves.toBe(true)
```

Para cada gráfico, afirmar wrapper `role="img"`, ancho `<= viewport` y texto equivalente visible.

Run: `npx playwright test tests/e2e/dashboard-comparisons.spec.js --project=phone-320`

Expected: FAIL por wrappers sin región, filtros fijos o gráficos comprimidos.

- [ ] **Step 2: Aplicar tratamientos exactos**

- Crecimiento: envolver tabla `growth-admin-table` en `<TableScroller label="Crecimiento por centro" stickyFirstColumn>`; mantener `min-width:1120px` dentro del scroller; controles flexibles 44 px; textos internos que hoy miden 8.5–10.5 px suben a 12 px móvil.
- `GrowthSummaryBand`: eliminar tamaños de 9–11 px; mantener leyendas ≥12 px y datos secundarios ≥13 px en móvil.
- Historial admin: filtros en `.form-grid`; meses en una columna móvil; cada comparación densa usa `TableScroller`.
- Entrenamiento admin: matriz dentro de `TableScroller label="Progreso de entrenamiento" stickyFirstColumn`; reset como `.btn btn--compact` y 44 px móvil.
- Dashboard: reemplazar tamaño implícito del gráfico por `MeasuredChart`; leyenda bajo el gráfico y ≥12 px.
- Agregar `id="main-content"` a Crecimiento, Historial y Entrenamiento administrativo; Dashboard ya lo recibe en Task 5.

```jsx
<TableScroller label="Crecimiento por centro" stickyFirstColumn>
  <table className="table growth-admin-table">{tableContent}</table>
</TableScroller>

<MeasuredChart label="Evolución de niños activos" minHeight={280}>
  {({ width, height }) => <LineChart width={width} height={height} data={series}>{chartContent}</LineChart>}
</MeasuredChart>
```

No envolver `TableScroller` dentro de otro contenedor con `overflow-x`; la prueba geométrica identifica cualquier segundo scroller.

- [ ] **Step 3: Verificar y commit**

Run: `node --test test/responsive-ui.test.mjs`

Run: `npx playwright test tests/e2e/dashboard-comparisons.spec.js --project=phone-320 --project=phone-390 --project=tablet-768 --project=desktop-1440`

Expected: todo pasa.

```bash
git add app/dashboard/crecimiento/page.js app/dashboard/historial/page.js app/dashboard/entrenamiento/page.js app/dashboard/page.js components/growth/GrowthSummaryBand.js app/globals.css tests/e2e/dashboard-comparisons.spec.js test/responsive-ui.test.mjs
git commit -m "feat(ui): adaptar comparaciones y gráficos administrativos"
```

---

### Task 7: Gestión de usuarios responsive por capacidades

**Files:**
- Modify: `app/dashboard/usuarios/UsuariosClient.js`
- Modify: `app/globals.css`
- Modify: `playwright.config.mjs`
- Create: `tests/e2e/users-manager.spec.js`
- Create: `tests/e2e/users-coordinator.spec.js`
- Create: `tests/e2e/users-mutations.local.spec.js`
- Modify: `test/responsive-ui.test.mjs`

**Interfaces:**
- Consumes: `PageData`, resultados `invitation/reset` y `OperationalCard` de los planes anteriores.
- Produces: tabla desktop + tarjetas móviles sin renderizar secretos de reset.

- [ ] **Step 1: Crear RED de gerencia, coordinador y mutaciones reales desechables**

El setup crea también `tests/e2e/.auth/coordinator.json` con `E2E_COORDINATOR_EMAIL` y `E2E_COORDINATOR_PASSWORD`. Agregar proyecto `coordinator-audit` con viewport base 390×844.

Ese proyecto declara `testMatch:/users-coordinator\.spec\.js/`, `testIgnore:/auth\.setup\.js/`, `dependencies:['setup']` y su propio `storageState`. Los seis proyectos administrativos excluyen `auth.setup.js`, `users-coordinator.spec.js`, `center-user.spec.js` y `users-mutations.local.spec.js`; así nunca ejecutan aserciones con el actor equivocado. `users-manager.spec.js` sí corre en los seis proyectos administrativos, `center-audit` queda reservado para la cuenta de centro y `users-mutations-local` ejecuta una sola prueba transaccional a 390×844.

Pruebas:

```js
test('gerencia ve tabla desktop y tarjetas mobile sin overflow', async ({ page }, info) => {
  await page.goto('/dashboard/usuarios')
  await auditPage(page, { mobile: info.project.use.viewport.width <= 1024 })
  if (info.project.use.viewport.width < 768) {
    await expect(page.locator('.users-table')).toBeHidden()
    await expect(page.locator('.users-cards article').first()).toBeVisible()
  }
})

const coordinatorViewports = [
  [320,568], [375,667], [390,844], [430,932], [768,1024], [1440,900],
]
for (const [width, height] of coordinatorViewports) {
  test(`coordinador conserva alcance y acciones a ${width}x${height}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      storageState: 'tests/e2e/.auth/coordinator.json',
      viewport: { width, height },
    })
    try {
      const page = await context.newPage()
      await page.goto('/dashboard/usuarios')
      await expect(page.locator('[data-page-state="ready"]')).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Usuarios de mis centros' })).toBeVisible()
      await expect(page.getByRole('button', { name: /eliminar/i })).toHaveCount(0)
      await expect(page.getByLabel('Rol')).not.toContainText('Coordinador Operativo')
      await auditPage(page, { mobile: width <= 1024 })
    } finally {
      await context.close()
    }
  })
}
```

`users-mutations.local.spec.js` cubre UI → Server Action → PostgreSQL real y se salta antes de leer secretos cuando `RESPONSIVE_BASE_URL` está presente. Exige `USUARIOS_TEST_DATABASE_URL`, `E2E_DATABASE_CONFIRM=disposable` y `E2E_COORDINATOR_SECOND_CENTER_ID`. Usa `coordinator.json` para crear una cuenta con correo único, comprobar que el editor se cierre pero el enlace de invitación siga visible, editar nombre, moverla al segundo centro y reenviar invitación. El test demuestra por conteos SQL que el token inicial quedó usado y existe uno nuevo activo. Luego activa esa misma cuenta fixture con un hash no utilizable fuera de la prueba, recarga, ejecuta `Enviar restablecimiento`, confirma por SQL un único reset activo y exige que no exista input/enlace copiable. Finalmente abre `admin.json`, elimina por la UI la cuenta creada y confirma `count(*)=0`; el coordinador nunca ve Eliminar. No comparte usuario ni token con otra prueba.

Esqueleto obligatorio:

```js
import { test, expect } from '@playwright/test'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws

test('crear, mover, reenviar, resetear y eliminar atraviesa UI Action y DB', async ({ browser }, testInfo) => {
  test.skip(Boolean(process.env.RESPONSIVE_BASE_URL), 'mutaciones solo contra DB local desechable')
  test.setTimeout(180_000)
  const required = ['USUARIOS_TEST_DATABASE_URL', 'E2E_COORDINATOR_SECOND_CENTER_ID', 'E2E_CENTRO_ID']
  for (const name of required) expect(process.env[name], `${name} es obligatorio`).toBeTruthy()
  expect(process.env.E2E_DATABASE_CONFIRM).toBe('disposable')

  const pool = new Pool({ connectionString: process.env.USUARIOS_TEST_DATABASE_URL })
  const email = `codex-ui-${Date.now()}@test.invalid`
  const centerA = Number(process.env.E2E_CENTRO_ID)
  const centerB = Number(process.env.E2E_COORDINATOR_SECOND_CENTER_ID)
  expect(Number.isInteger(centerA) && centerA > 0).toBe(true)
  expect(Number.isInteger(centerB) && centerB > 0).toBe(true)
  expect(centerA, 'los centros A y B deben ser distintos').not.toBe(centerB)
  let createdUserId = null
  try {
    const coordinator = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      storageState: 'tests/e2e/.auth/coordinator.json',
      viewport: { width: 390, height: 844 },
    })
    const page = await coordinator.newPage()
    await page.goto('/dashboard/usuarios')
    await page.getByRole('button', { name: 'Crear usuario' }).click()
    let editor = page.getByRole('form', { name: 'Editor de usuario' })
    const availableCenters = await editor.getByLabel('Centro', { exact: true }).locator('option').evaluateAll(
      (options) => options.map((option) => option.value),
    )
    expect(availableCenters).toEqual(expect.arrayContaining([String(centerA), String(centerB)]))
    await editor.getByLabel('Nombre', { exact: true }).fill('Cuenta E2E')
    await editor.getByLabel('Correo', { exact: true }).fill(email)
    await editor.getByLabel('Rol', { exact: true }).selectOption('asistente')
    await editor.getByLabel('Centro', { exact: true }).selectOption(String(centerA))
    await editor.getByRole('button', { name: /Crear cuenta|Guardar/ }).click()
    await expect(page.getByRole('status').filter({ hasText: /creada|invitación/i }).first()).toBeVisible()
    await expect(page.locator('input[readonly][value*="/set-password?token="]')).toBeVisible()

    let dbUser = (await pool.query('SELECT id,nombre,rol,centro_id FROM usuarios WHERE email=$1', [email])).rows[0]
    expect(dbUser).toMatchObject({ nombre: 'Cuenta E2E', rol: 'asistente', centro_id: centerA })
    createdUserId = Number(dbUser.id)
    let tokenState = await pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE used_at IS NULL)::int AS active,
              count(*) FILTER (WHERE used_at IS NOT NULL)::int AS used
       FROM password_tokens WHERE user_id=$1 AND purpose='invite'`,
      [createdUserId],
    )
    expect(tokenState.rows[0]).toMatchObject({ total: 1, active: 1, used: 0 })
    let row = page.locator(`[data-user-email="${email}"]:visible`)
    await expect(row.getByRole('button', { name: /Eliminar/i })).toHaveCount(0)
    await row.getByRole('button', { name: 'Editar' }).click()
    editor = page.getByRole('form', { name: 'Editor de usuario' })
    await editor.getByLabel('Nombre', { exact: true }).fill('Cuenta E2E movida')
    await editor.getByLabel('Centro', { exact: true }).selectOption(String(centerB))
    await editor.getByRole('button', { name: /Guardar cambios/ }).click()
    await expect(page.getByRole('status').filter({ hasText: /actualiz/i }).first()).toBeVisible()
    dbUser = (await pool.query('SELECT id,nombre,rol,centro_id FROM usuarios WHERE email=$1', [email])).rows[0]
    expect(dbUser).toMatchObject({ nombre: 'Cuenta E2E movida', centro_id: centerB })

    row = page.locator(`[data-user-email="${email}"]:visible`)
    await row.getByRole('button', { name: /Reenviar invitación/ }).click()
    await expect(page.locator('input[readonly][value*="/set-password?token="]')).toBeVisible()
    tokenState = await pool.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE used_at IS NULL)::int AS active,
              count(*) FILTER (WHERE used_at IS NOT NULL)::int AS used
       FROM password_tokens WHERE user_id=$1 AND purpose='invite'`,
      [createdUserId],
    )
    expect(tokenState.rows[0]).toMatchObject({ total: 2, active: 1, used: 1 })

    await pool.query("UPDATE usuarios SET password_hash='e2e-active-not-a-login-hash' WHERE id=$1", [createdUserId])
    await page.reload()
    row = page.locator(`[data-user-email="${email}"]:visible`)
    await row.getByRole('button', { name: /Enviar restablecimiento/ }).click()
    await expect(page.getByRole('status').filter({ hasText: /Enviamos el restablecimiento/i }).first()).toBeVisible()
    await expect(page.locator('input[readonly][value*="/set-password?token="]')).toHaveCount(0)
    const afterReset = await pool.query(
      `SELECT count(*) FILTER (WHERE purpose='reset' AND used_at IS NULL)::int AS active_resets,
              count(*) FILTER (WHERE purpose='invite' AND used_at IS NULL)::int AS active_invites
       FROM password_tokens WHERE user_id=$1`,
      [createdUserId],
    )
    expect(afterReset.rows[0]).toMatchObject({ active_resets: 1, active_invites: 0 })
    await coordinator.close()

    const admin = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      storageState: 'tests/e2e/.auth/admin.json',
      viewport: { width: 390, height: 844 },
    })
    const adminPage = await admin.newPage()
    await adminPage.goto('/dashboard/usuarios')
    await adminPage.locator(`[data-user-email="${email}"]:visible`).getByRole('button', { name: /Eliminar/i }).click()
    const confirm = adminPage.getByRole('dialog', { name: /Eliminar usuario/i })
    await confirm.getByRole('button', { name: /Confirmar eliminación/i }).click()
    await expect(adminPage.locator(`[data-user-email="${email}"]:visible`)).toHaveCount(0)
    expect((await pool.query('SELECT count(*)::int AS n FROM usuarios WHERE email=$1', [email])).rows[0].n).toBe(0)
    await admin.close()
  } finally {
    if (createdUserId) {
      await pool.query('DELETE FROM password_tokens WHERE user_id=$1', [createdUserId])
      await pool.query('DELETE FROM usuarios WHERE id=$1', [createdUserId])
    } else {
      const created = await pool.query('SELECT id FROM usuarios WHERE email=$1', [email])
      if (created.rows[0]) {
        await pool.query('DELETE FROM password_tokens WHERE user_id=$1', [created.rows[0].id])
        await pool.query('DELETE FROM usuarios WHERE id=$1', [created.rows[0].id])
      }
    }
    await pool.end()
  }
})
```

El único correo es un fixture único `@test.invalid`; el servidor local usa `E2E_DELIVERY_MODE=stub` del helper fail-closed del plan de permisos. El `finally` borra tokens y usuario por el ID exacto creado; nunca usa `LIKE`, nunca comparte cuenta y no puede invalidar tokens de otra prueba.

Run: `npx playwright test tests/e2e/users-manager.spec.js --project=phone-390 && npx playwright test tests/e2e/users-coordinator.spec.js --project=coordinator-audit`

Run: `npx playwright test tests/e2e/users-mutations.local.spec.js --project=users-mutations-local`

Expected: FAIL mientras la UI siga siendo tabla y formulario fijo.

- [ ] **Step 2: Construir composición responsive**

- Header `.page-actions`; acción Crear full-width móvil.
- Mantener `centerFilter`; `visibleUsers` filtra en cliente solo el `initialData.users` ya autorizado y el header muestra `${visibleUsers.length} cuentas`. Con un centro, el selector se oculta y el formulario conserva ese ID preseleccionado.
- El editor usa `<form aria-label="Editor de usuario">`; sus controles llevan labels exactos `Nombre`, `Correo`, `Rol` y `Centro`, y los submits conservan `Crear cuenta`/`Guardar cambios` para que el contrato accesible y el E2E coincidan.
- Formulario `.form-grid`; correo `overflow-wrap:anywhere`; inputs 16 px.
- Escritorio: tabla con clase `users-table desktop-only`.
- Móvil: `users-cards mobile-only operational-list`; una `OperationalCard` por `visibleUsers`.
- La fila desktop y el wrapper de cada tarjeta llevan `data-user-email={user.email}` para ubicar la misma cuenta sin depender del orden; el correo ya es visible y el atributo no agrega datos.
- `fields`: Correo, Rol, Centro y Estado.
- `actions`: renderizar botones solo cuando `user.actions` sea `true`; cada botón full-width móvil.
- Filtro Centro solo si `centers.length > 1`; con cero centros, alerta explicativa y Crear deshabilitado.
- `aria-live="polite"` para status y entrega.
- El `<main>` movido a `UsuariosClient` lleva `id="main-content"`.

```jsx
const ROLE_LABELS = {
  admin_general: 'Administrador General', supervisor: 'Supervisor', coordinador: 'Coordinador Operativo',
  administradora: 'Administradora', asistente: 'Asistente',
}

function UserActions({ user, onEdit, onAccess, onDelete }) {
  return <div className="operational-card__actions">
    {user.actions.edit && <button type="button" className="btn" onClick={() => onEdit(user)}>Editar</button>}
    {(user.actions.resendInvitation || user.actions.sendPasswordReset) && (
      <button type="button" className="btn" onClick={() => onAccess(user.id)}>
        {user.actions.resendInvitation ? 'Reenviar invitación' : 'Enviar restablecimiento'}
      </button>
    )}
    {user.actions.delete && <button type="button" className="btn btn--danger" onClick={() => onDelete(user.id)}>Eliminar</button>}
  </div>
}

<div className="users-cards mobile-only operational-list">
  {visibleUsers.map((user) => (
    <OperationalCard key={user.id} headingLevel={2} title={user.nombre} subtitle={user.email}
      status={user.active ? 'Cuenta activa' : 'Invitación pendiente'}
      fields={[
        { label: 'Rol', value: ROLE_LABELS[user.role] || user.role },
        { label: 'Centro', value: user.centerNames.join(', ') || 'Sin centro' },
      ]}
      actions={<UserActions user={user} onEdit={openEdit} onAccess={resendAccess} onDelete={removeUser} />} />
  ))}
</div>
```

`UserActions` comprueba `user.actions.edit/resendInvitation/sendPasswordReset/delete` antes de crear cada botón; no decide por el rol del navegador.

Bloque de resultado:

```jsx
{accessResult?.kind === 'invitation' && <InvitationResult result={accessResult} />}
{accessResult?.kind === 'reset' && (
  <div className="alert" role="status">
    {accessResult.emailSent ? 'Enviamos el restablecimiento al correo registrado.' : 'No pudimos enviar el correo. Contacta a gerencia.'}
  </div>
)}
```

`InvitationResult` es el único componente que recibe/renderiza `link`; si `link` es `null`, muestra `La cuenta quedó creada, pero no pudimos generar el enlace de entrega. Contacta a gerencia.` sin input ni botón Copiar. La rama reset nunca crea input ni botón Copiar.

Eliminar usa el `Dialog` compartido con título `Eliminar usuario` y botón `Confirmar eliminación`, tanto en tabla como en tarjeta; no usa `window.confirm`.

- [ ] **Step 3: Verificar y commit**

Run: `node --test test/responsive-ui.test.mjs test/usuarios-service.test.mjs`

Run: `npx playwright test tests/e2e/users-manager.spec.js --project=phone-320 --project=phone-375 --project=phone-390 --project=phone-430 --project=tablet-768 --project=desktop-1440`

Run: `npx playwright test tests/e2e/users-coordinator.spec.js --project=coordinator-audit`

Run: `npx playwright test tests/e2e/users-mutations.local.spec.js --project=users-mutations-local`

Expected: todo pasa.

```bash
git add app/dashboard/usuarios/UsuariosClient.js app/globals.css tests/e2e/users-manager.spec.js tests/e2e/users-coordinator.spec.js tests/e2e/users-mutations.local.spec.js playwright.config.mjs tests/e2e/auth.setup.js test/responsive-ui.test.mjs
git commit -m "feat(ui): adaptar Gestión de usuarios a móvil"
```

---

### Task 8: Resumen de centro, Ruta de Nivel y KPI

**Files:**
- Modify: `app/centro/[id]/page.js`
- Modify: `app/centro/[id]/ruta-nivel/page.js`
- Modify: `app/centro/[id]/kpi/page.js`
- Modify: `components/SelectorAncla.js`
- Modify: `app/globals.css`
- Create: `tests/e2e/center-core.spec.js`
- Modify: `test/responsive-ui.test.mjs`

**Interfaces:**
- Consumes: `OperationalCard`, `TableScroller`, `MeasuredChart` y `auditPage`.
- Produces: resumen, proyección y captura semanal utilizables a 320 px.

- [ ] **Step 1: Crear RED por las tres rutas**

Usar `E2E_CENTRO_ID` y llamar `auditPage` en:

```js
[`/centro/${id}`, `/centro/${id}/ruta-nivel`, `/centro/${id}/kpi`]
```

En KPI verificar que cada input numérico móvil tenga 44 px de alto, font-size 16 px y etiqueta visible. En Resumen verificar tarjetas móviles para la tabla inferior. En Ruta de Nivel verificar que escenarios y controles no se corten.

- [ ] **Step 2: Adaptar Resumen**

- Grid inferior `1fr 1fr` recibe clase `.center-summary-grid`: una columna móvil.
- Tabla de 7 columnas se mantiene desktop y se representa con tarjetas móviles usando el mismo array.
- Barras/etiquetas usan `min-width:0`; nombres largos parten línea.
- Botones Volver/Continuar cambian a `<Link className="btn">`.
- Gráfico usa `MeasuredChart` y equivalente textual existente.
- Los tres `<main>` llevan `id="main-content"`, incluyendo estados de carga/error.

- [ ] **Step 3: Adaptar Ruta de Nivel**

- Controles y escenarios a `.responsive-grid`; una columna móvil, máximo dos tablet.
- Botones de 32–34 px pasan a 44 px.
- Leyendas y chips suben a 12 px mínimo móvil.
- `SelectorAncla` garantiza 44×44 px para cada `[role="radio"]` y fuente secundaria ≥13 px.
- Conservar tabla accesible `sr-only`; no eliminar equivalencia textual.

- [ ] **Step 4: Adaptar KPI**

- Tabla semanal: `.desktop-only` desde 768; crear `.mobile-only` con una tarjeta por semana/categoría y los mismos handlers.
- Inputs numéricos `inputMode="numeric"`, `name` estable, etiqueta ligada y clase `kpi-mobile-input`.
- Configuración, navegación mensual, Cerrar/Reabrir y acciones se envuelven; acción principal full-width móvil.
- Tablas históricas densas usan `TableScroller`; no overflow del documento.

La vista móvil de KPI conserva los handlers originales mediante un componente presentacional:

```jsx
const KPI_METRICS = [
  { tipo: 'cob', label: 'Cobranza' },
  { tipo: 'des', label: 'Deserción' },
  { tipo: 'ing', label: 'Nuevos ingresos' },
]

<div className="mobile-only operational-list">
  {SEMANAS.map((semanaLabel, semIdx) => (
    <OperationalCard key={semanaLabel} headingLevel={2} title={`Semana ${semanaLabel}`}
      fields={KPI_METRICS.flatMap((metric) => [0,1,2,3,4].map((dayIndex) => ({
        label: `${metric.label} · día ${dayIndex + 1}`,
        value: <input
          id={`kpi-${semIdx}-${metric.tipo}-${dayIndex}`}
          name={`semanas.${semIdx}.${metric.tipo}.${dayIndex}`}
          aria-label={`${metric.label} · semana ${semanaLabel} · día ${dayIndex + 1}`}
          className="input kpi-mobile-input" inputMode="numeric" type="number" min="0"
          disabled={locked || (autoIngDes && metric.tipo !== 'cob')}
          value={semanas[semIdx][metric.tipo][dayIndex] ?? ''}
          onChange={(event) => upd(semIdx, metric.tipo, dayIndex, event.target.value)}
        />,
      })))} />
  ))}
</div>
```

Tabla y tarjetas leen `SEMANAS`/`semanas` y llaman el handler existente `upd`; no cambian el payload de `saveKpiMes`.

- [ ] **Step 5: Verificar y commit**

Run: `node --test test/responsive-ui.test.mjs`

Run: `npx playwright test tests/e2e/center-core.spec.js --project=phone-320 --project=phone-390 --project=tablet-768 --project=desktop-1440`

Run: `npm run build`

Expected: todo pasa.

```bash
git add 'app/centro/[id]/page.js' 'app/centro/[id]/ruta-nivel/page.js' 'app/centro/[id]/kpi/page.js' components/SelectorAncla.js app/globals.css tests/e2e/center-core.spec.js test/responsive-ui.test.mjs
git commit -m "feat(ui): adaptar resumen ruta y KPI del centro"
```

---

### Task 9: Grupos, Eventos, Coach y Plan individual

**Files:**
- Modify: `app/centro/[id]/grupos/page.js`
- Modify: `app/centro/[id]/eventos/page.js`
- Modify: `app/coach/[token]/page.js`
- Modify: `components/PlanNino.js`
- Modify: `app/globals.css`
- Create: `tests/e2e/center-operations.spec.js`
- Modify: `test/responsive-ui.test.mjs`

**Interfaces:**
- Consumes: `Dialog`, `OperationalCard`, `.operational-list` y `auditPage`.
- Produces: operación diaria con controles de 44 px y listas móviles completas.

- [ ] **Step 1: Crear RED operativo**

Abrir `/centro/${E2E_CENTRO_ID}/grupos`, `/eventos` y `/coach/${E2E_COACH_TOKEN}`. Verificar:

- documento sin overflow;
- Grupos permite seleccionar un grupo y abrir/cerrar el sheet;
- Eventos muestra tarjetas y abre/cancela formulario;
- Coach muestra cada alumno como tarjeta móvil, conserva acceso a cada fecha del calendario y presenta los tres estados de asistencia como botones ≥44 px.

Run: `npx playwright test tests/e2e/center-operations.spec.js --project=phone-320`

Expected: FAIL en tablas/Eventos, controles Coach o modales.

- [ ] **Step 2: Adaptar Grupos sin reescribir su dominio**

- Conservar master/detail actual y breakpoint de sheet.
- Extender `.grp-roster__item`/`OperationalCard` a niños del grupo, sin grupo, retirados y grupos bajo meta debajo de 768 px.
- Tablas de itinerario/comparación que requieren columnas usan `TableScroller`; listas accionables usan tarjetas.
- Todos los botones de búsqueda, chips, tabs, editar, inscribir, cerrar y fechas interactivas alcanzan 44 px por padding o pseudoárea.
- Grids inline `1fr 1fr` de formularios cambian a `dialog-form-grid`.
- Mantener payloads, Server Actions y `data-tour` sin cambios.

- [ ] **Step 3: Adaptar Eventos**

- Métricas `repeat(6,1fr)` pasan a `.responsive-grid`: una columna teléfono, dos tablet.
- Tabla principal y registrados: tabla desktop + tarjetas móviles; quitar `overflowX:'visible'`.
- Menú flotante usa clamp de Task 3 y acciones 44 px.
- Formularios usan `Dialog` y `dialog-form-grid`; `datetime-local` 16 px; footer apilado.

- [ ] **Step 4: Adaptar Coach y PlanNino**

- Coach desktop conserva tabla; móvil renderiza un selector/navegador de fecha global y una tarjeta por alumno con botones `Presente`, `Ausente`, `Justificado` y `Nota` de 44 px.
- Coach cambia su contenedor principal a `<main id="main-content">`; la tarjeta y la tabla desktop comparten el mismo arreglo de alumnos.
- No usar `<td onClick>` en móvil; los botones tienen `aria-pressed` y texto/estado además de color.
- Nombres y notas usan `overflow-wrap:anywhere`.
- PlanNino usa `Dialog`, chips táctiles y grids de una columna móvil.
- Grupos y Eventos llevan `id="main-content"` en sus estados principales y de carga; Coach usa el `<main>` definido arriba.

Coach conserva el arreglo completo `fechas`. Inicializa `selectedDate` con hoy si existe o la fecha pasada más reciente; un `<select aria-label="Fecha de clase">` y botones `Clase anterior`/`Clase siguiente` permiten llegar a todas las fechas sin escribir datos. Cada opción muestra semana, etiqueta y `DD/MM`; la tarjeta informa la fecha seleccionada y lee `marcas.get(student.id + '|' + selectedDate)`. El desktop sigue mostrando todas las columnas. Coach usa botones explícitos, no ciclo oculto en una celda:

```jsx
<div className="attendance-actions" role="group" aria-label={`Asistencia de ${student.nombre}`}>
  {[
    ['presente', 'Presente'], ['ausente', 'Ausente'], ['justificada', 'Justificado'],
  ].map(([value, label]) => (
    <button key={value} type="button" className="btn btn--compact"
      aria-pressed={attendance === value} onClick={() => saveAttendance(student.id, selectedDate, value)}>
      {label}
    </button>
  ))}
  <button type="button" className="btn btn--compact" aria-label={`Nota de ${student.nombre}`}
    onClick={() => openNote(student.id)}>Nota</button>
</div>
```

Eventos y Grupos usan el patrón tabla/tarjeta de Task 5 y pasan sus formularios existentes como `children`/`footer` de `Dialog`; no duplican llamadas de carga.

`center-operations.spec.js` exige un fixture Coach con al menos dos fechas. Cambia el selector entre ambas, confirma que etiqueta/estado de cada fecha sigue accesible y no pulsa ningún botón de asistencia durante el smoke read-only.

- [ ] **Step 5: Verificar y crear un commit autocontenido**

Run: `node --test test/responsive-ui.test.mjs`

Run: `npx playwright test tests/e2e/center-operations.spec.js --project=phone-320 --project=phone-390 --project=tablet-768 --project=desktop-1440`

Expected: todo pasa.

```bash
git add 'app/centro/[id]/grupos/page.js' 'app/centro/[id]/eventos/page.js' 'app/coach/[token]/page.js' components/PlanNino.js app/globals.css tests/e2e/center-operations.spec.js test/responsive-ui.test.mjs
git commit -m "feat(ui): adaptar operación diaria a móvil"
```

---

### Task 10: Cuadro, Cumplimiento, FODA, Historial y Entrenamiento

**Files:**
- Modify: `app/centro/[id]/cuadro/page.js`
- Modify: `app/centro/[id]/cumplimiento/page.js`
- Modify: `app/centro/[id]/foda/page.js`
- Modify: `components/foda/ComentarioForm.js`
- Modify: `components/foda/CotizacionCard.js`
- Modify: `components/foda/PeticionDraftForm.js`
- Modify: `components/foda/PeticionesList.js`
- Modify: `components/foda/PeticionesPanel.js`
- Modify: `app/centro/[id]/historial/page.js`
- Modify: `app/centro/[id]/entrenamiento/page.js`
- Modify: `app/centro/[id]/entrenamiento/[modulo]/page.js`
- Modify: `components/tour/TourHost.js`
- Modify: `app/globals.css`
- Create: `tests/e2e/center-reports.spec.js`
- Create: `tests/e2e/full-route-audit.spec.js`
- Create: `tests/e2e/center-user.spec.js`
- Create: `tests/e2e/responsive-states.spec.js`
- Create: `tests/e2e/accessibility.spec.js`
- Modify: `test/responsive-ui.test.mjs`

**Interfaces:**
- Consumes: todas las primitivas y helpers anteriores.
- Produces: cobertura completa de rutas y gate responsive final.

- [ ] **Step 1: Crear RED de reportes y formación**

Rutas:

```js
[
  `/centro/${id}/cuadro`, `/centro/${id}/cumplimiento`, `/centro/${id}/foda`,
  `/centro/${id}/historial`, `/centro/${id}/entrenamiento`,
]
```

`center-reports.spec.js` llama `auditPage`, prueba tabs/segmentos con teclado, abre/cancela un formulario FODA y abre un módulo de entrenamiento.

- [ ] **Step 2: Aplicar estrategia exacta**

| Área | Tratamiento móvil |
|---|---|
| Cuadro | cada tabla comparativa dentro de `TableScroller stickyFirstColumn`; pedidos/formularios en `Dialog` de una columna |
| Cumplimiento | tabs de mes con wrap/scroller local; cada grupo conserva una matriz `Criterio / Sí / No` dentro de `TableScroller stickyFirstColumn`; controles 44 px con `aria-pressed` |
| FODA | cuadrantes `1fr`; textarea 16 px; tabs 44 px; peticiones/cotizaciones una columna y acciones full-width |
| Historial | filtros apilados; gráficos en una columna con `MeasuredChart`; tablas dentro de `TableScroller` |
| Entrenamiento índice | tarjetas de módulos; tabla de errores pasa a tarjetas móviles; FAQ sin texto pequeño |
| Entrenamiento módulo/tour | radios con label de 44 px; acciones apiladas; tour dentro de viewport dinámico |

Agregar `id="main-content"`, `data-page-state="ready"`, nombres accesibles, `aria-live` y etiquetas de formulario en todos los archivos tocados. Las ramas de carga/error usan `loading`/`error`; cada Task 4–10 aplica el mismo contrato a sus páginas.

Patrones exactos del bloque:

```jsx
<TableScroller label="Comparación mensual" stickyFirstColumn>
  <table className="table">{comparisonRows}</table>
</TableScroller>

<button type="button" className="btn btn--compact" aria-pressed={answer === true}
  onClick={() => setAnswer(true)}>Sí</button>
<button type="button" className="btn btn--compact" aria-pressed={answer === false}
  onClick={() => setAnswer(false)}>No</button>

<label htmlFor={fieldId} className="label">{label}</label>
<textarea id={fieldId} name={fieldName} className="input" value={value}
  onChange={(event) => onChange(event.target.value)} />
```

Los nombres concretos provienen de los arrays/handlers existentes de cada página; no se crean estados paralelos para desktop y móvil.

En Cumplimiento, el nombre del mes activo y el grupo se anuncian antes de cada tabla. La primera celda contiene el criterio completo y permanece fija; `center-reports.spec.js` desplaza horizontalmente la matriz y confirma que mes, grupo y criterio siguen identificables, además de que cada fila conserva exactamente las opciones Sí/No. No convertir esta vista en tarjetas.

- [ ] **Step 3: Completar registro de todas las rutas**

En `test/responsive-ui.test.mjs`, definir la lista literal completa:

```js
const ROUTE_FILES = [
  'app/page.js',
  'app/login/page.js',
  'app/forgot-password/page.js',
  'app/set-password/page.js',
  'app/perfil/page.js',
  'app/dashboard/page.js',
  'app/dashboard/alertas/page.js',
  'app/dashboard/centros/page.js',
  'app/dashboard/crecimiento/page.js',
  'app/dashboard/entrenamiento/page.js',
  'app/dashboard/historial/page.js',
  'app/dashboard/metas/page.js',
  'app/dashboard/ranking/page.js',
  'app/dashboard/reporte/page.js',
  'app/dashboard/usuarios/page.js',
  'app/centro/[id]/page.js',
  'app/centro/[id]/cuadro/page.js',
  'app/centro/[id]/cumplimiento/page.js',
  'app/centro/[id]/entrenamiento/page.js',
  'app/centro/[id]/entrenamiento/[modulo]/page.js',
  'app/centro/[id]/eventos/page.js',
  'app/centro/[id]/foda/page.js',
  'app/centro/[id]/grupos/page.js',
  'app/centro/[id]/historial/page.js',
  'app/centro/[id]/kpi/page.js',
  'app/centro/[id]/ruta-nivel/page.js',
  'app/coach/[token]/page.js',
]
```

Afirmar que contiene 27 valores únicos. Una prueba recorre `app/` con `readdirSync({ recursive:true })`, filtra `page.js`, normaliza separadores y compara ambos arrays ordenados; así una ruta nueva obliga a entrar en el gate.

```js
import { readdirSync } from 'node:fs'

test('el registro incluye cada page.js exactamente una vez', () => {
  const actual = readdirSync(new URL('../app/', import.meta.url), { recursive: true })
    .map((path) => String(path).replaceAll('\\', '/'))
    .filter((path) => path === 'page.js' || path.endsWith('/page.js'))
    .map((path) => `app/${path}`)
    .sort()
  assert.equal(ROUTE_FILES.length, 27)
  assert.equal(new Set(ROUTE_FILES).size, 27)
  assert.deepEqual([...ROUTE_FILES].sort(), actual)
})
```

- [ ] **Step 4: Crear auditoría final completa**

`full-route-audit.spec.js` usa las rutas de gerencia y Coach con `admin.json`:

```js
const admin = [
  '/dashboard', '/dashboard/crecimiento', '/dashboard/ranking', '/dashboard/alertas',
  '/dashboard/historial', '/dashboard/reporte', '/dashboard/metas', '/dashboard/centros',
  '/dashboard/usuarios', '/dashboard/entrenamiento', '/perfil',
]
const coach = [`/coach/${process.env.E2E_COACH_TOKEN}`]
```

Para cada ruta, ejecutar exactamente:

```js
await page.goto(route, { waitUntil: 'domcontentloaded' })
await expect(page.locator('#main-content')).toHaveCount(1)
await expect(page.locator('#main-content[data-page-state="ready"]')).toBeVisible({ timeout: 15_000 })
await auditPage(page, { mobile: testInfo.project.use.viewport.width <= 1024 })
```

Después, solo en rutas que renderizan `Sidebar`, comprobar que el drawer contenga el destino activo; Coach no tiene drawer y queda exento de esa aserción. Playwright captura screenshot solo al fallar mediante la configuración global; no se escriben capturas manuales en ejecuciones exitosas.

`center-user.spec.js` usa realmente `center.json`, no la sesión de gerencia. Dentro del único proyecto `center-audit`, abre un contexto aislado por cada uno de los seis viewports y recorre:

```js
const sizes = [[320,568], [375,667], [390,844], [430,932], [768,1024], [1440,900]]
const centerRoutes = [
  '', '/ruta-nivel', '/kpi', '/grupos', '/cuadro', '/eventos', '/cumplimiento',
  '/foda', '/historial', '/entrenamiento', '/entrenamiento/meta',
]

for (const [width, height] of sizes) {
  test(`usuario de centro opera sus 11 rutas a ${width}x${height}`, async ({ browser }, testInfo) => {
    test.setTimeout(240_000)
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      storageState: 'tests/e2e/.auth/center.json',
      viewport: { width, height },
    })
    try {
      const page = await context.newPage()
      for (const suffix of centerRoutes) {
        const route = `/centro/${process.env.E2E_CENTRO_ID}${suffix}`
        await page.goto(route, { waitUntil: 'domcontentloaded' })
        await auditPage(page, { mobile: width <= 1024 })
        await capturePage(page, { name: `center-${width}x${height}${suffix || '-home'}`, testInfo })
      }
      if (width <= 1024) await page.getByRole('button', { name: 'Abrir menú' }).click()
      const nav = width <= 1024
        ? page.getByRole('dialog', { name: 'Navegación principal' })
        : page.getByRole('complementary')
      await expect(nav.getByRole('link', { name: 'Usuarios' })).toHaveCount(0)
      await expect(nav.getByRole('link', { name: 'Gestión centros' })).toHaveCount(0)
      await page.goto('/dashboard/usuarios')
      await expect(page).not.toHaveURL(/\/dashboard\/usuarios$/)
    } finally {
      await context.close()
    }
  })
}
```

La cuenta debe ser `administradora` o `asistente`, pertenecer al centro fixture y no tener permisos de gerencia. Así las once rutas de centro se validan con el actor que las usa en producción, incluido el Sidebar y el guard de Usuarios.

Para la revisión visual deliberada de preview, el mismo test usa el helper ignorado:

```js
await capturePage(page, { name: route, testInfo })
```

Sin `E2E_CAPTURE_DIR`, las ejecuciones normales conservan screenshots solo al fallar.

`responsive-states.spec.js` separa estados deterministas de la rotación para no mezclar viewports:

```js
test('vacío y texto largo siguen dentro de cada viewport', async ({ page }, testInfo) => {
  const id = process.env.E2E_CENTRO_ID
  await page.goto(`/centro/${id}/eventos`)
  await page.getByPlaceholder('Buscar por nombre…').fill('SIN-RESULTADOS-CODEX-999999')
  await expect(page.getByText(/Sin resultados|no hay/i)).toBeVisible()
  await auditPage(page, { mobile: testInfo.project.use.viewport.width <= 1024 })

  await page.goto('/dashboard')
  await expect(page.locator('#main-content[data-page-state="ready"]')).toBeVisible()
  await page.locator('h1:visible,p:visible,td:visible').first().evaluate((node) => {
    node.textContent = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.repeat(8)
  })
  await auditPage(page, { mobile: testInfo.project.use.viewport.width <= 1024 })
})

test('gráfico se vuelve a medir al rotar 390x844', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone-390', 'La rotación parte explícitamente del viewport 390')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/dashboard')
  const chart = page.locator('.measured-chart').first()
  const portraitWidth = await chart.evaluate((node) => Math.round(node.getBoundingClientRect().width))
  await page.setViewportSize({ width: 844, height: 390 })
  await expect.poll(() => chart.evaluate((node) => Math.round(node.getBoundingClientRect().width)))
    .not.toBe(portraitWidth)
  await auditPage(page, { mobile: true })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect.poll(() => chart.evaluate((node) => Math.round(node.getBoundingClientRect().width)))
    .toBe(portraitWidth)
  await auditPage(page, { mobile: true })
})

test('Login expone loading y error reales sin desbordar', async ({ browser }, testInfo) => {
  const publicContext = await browser.newContext({
    baseURL: testInfo.project.use.baseURL,
    viewport: testInfo.project.use.viewport,
  })
  try {
    const publicPage = await publicContext.newPage()
    let releaseRequest
    await publicPage.route('**/login', async (route) => {
      if (route.request().method() === 'POST') {
        await new Promise((resolve) => { releaseRequest = resolve })
      }
      await route.continue()
    })
    await publicPage.goto('/login')
    await publicPage.getByLabel(/correo/i).fill('no-existe-responsive@test.invalid')
    await publicPage.getByLabel(/contraseña/i).fill('credencial-invalida')
    await publicPage.getByRole('button', { name: /entrar/i }).click()
    await expect.poll(() => Boolean(releaseRequest)).toBe(true)
    await auditPage(publicPage, {
      mobile: testInfo.project.use.viewport.width <= 1024,
      state: 'loading',
    })
    releaseRequest()
    await expect(publicPage.getByRole('alert')).toBeVisible()
    await auditPage(publicPage, {
      mobile: testInfo.project.use.viewport.width <= 1024,
      state: 'error',
    })
  } finally {
    await publicContext.close()
  }
})
```

Task 4 implementa en Login `data-page-state={pending ? 'loading' : error ? 'error' : 'ready'}` sobre el mismo `main`; el botón conserva su etiqueta/estado disabled y el error lleva `role="alert"`. No se simulan esos estados cambiando atributos desde Playwright.

Para un diálogo abierto, reducir la altura a 390 px, enfocar el último input y afirmar que el footer puede alcanzarse con scroll y su botón queda dentro del rectángulo visible; esto simula la pérdida de alto útil por teclado sin depender de emulación iOS.

`accessibility.spec.js` ejecuta WCAG A/AA en móvil y desktop:

```js
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const auditedProjects = new Set(['phone-390', 'desktop-1440'])
const authenticatedRoutes = [
  '/dashboard', '/dashboard/crecimiento', '/dashboard/ranking', '/dashboard/alertas',
  '/dashboard/historial', '/dashboard/reporte', '/dashboard/metas', '/dashboard/centros',
  '/dashboard/usuarios', '/dashboard/entrenamiento', '/perfil',
  ...['', '/ruta-nivel', '/kpi', '/grupos', '/cuadro', '/eventos', '/cumplimiento',
    '/foda', '/historial', '/entrenamiento', '/entrenamiento/meta']
    .map((suffix) => `/centro/${process.env.E2E_CENTRO_ID}${suffix}`),
  `/coach/${process.env.E2E_COACH_TOKEN}`,
]

for (const route of authenticatedRoutes) {
  test(`WCAG A/AA ${route}`, async ({ page }, testInfo) => {
    test.skip(!auditedProjects.has(testInfo.project.name), 'Axe se ejecuta en móvil 390 y desktop 1440')
    await page.goto(route)
    await expect(page.locator('#main-content[data-page-state="ready"]')).toBeVisible({ timeout: 15_000 })
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze()
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
  })
}

test('WCAG A/AA en tema oscuro', async ({ page }, testInfo) => {
  test.skip(!auditedProjects.has(testInfo.project.name), 'Axe se ejecuta en móvil 390 y desktop 1440')
  await page.goto('/dashboard')
  await expect(page.locator('#main-content[data-page-state="ready"]')).toBeVisible({ timeout: 15_000 })
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; localStorage.setItem('aloha_theme', 'light') })
  if (testInfo.project.use.viewport.width <= 1024) {
    await page.getByRole('button', { name: 'Abrir menú' }).click()
  }
  await page.getByRole('button', { name: 'Cambiar tema claro u oscuro' }).click()
  if (testInfo.project.use.viewport.width <= 1024) {
    await page.getByRole('dialog', { name: 'Navegación principal' }).getByRole('button', { name: 'Cerrar menú' }).click()
  }
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
})
```

Agregar contextos sin storage para las rutas públicas; `/` queda cubierto por su redirect a Login. El token válido nunca forma parte del título/reporter:

```js
const accessToken = process.env.E2E_VALID_ACCESS_TOKEN
if (!accessToken) throw new Error('E2E_VALID_ACCESS_TOKEN es obligatorio para auditar set-password válido.')
const publicCases = [
  { label: 'login', route: '/login' },
  { label: 'forgot-password', route: '/forgot-password' },
  { label: 'set-password inválido', route: '/set-password' },
  { label: 'set-password válido', route: `/set-password?token=${encodeURIComponent(accessToken)}` },
]
for (const publicCase of publicCases) {
  test(`WCAG A/AA pública ${publicCase.label}`, async ({ browser }, testInfo) => {
    test.skip(!auditedProjects.has(testInfo.project.name), 'Axe se ejecuta en móvil 390 y desktop 1440')
    const context = await browser.newContext({
      baseURL: testInfo.project.use.baseURL,
      viewport: testInfo.project.use.viewport,
    })
    try {
      const page = await context.newPage()
      await page.goto(publicCase.route)
      await expect(page.locator('#main-content[data-page-state="ready"]')).toBeVisible({ timeout: 15_000 })
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([])
    } finally {
      await context.close()
    }
  })
}
```

Cualquier violación se corrige en el componente/página y se agrega al test fuente si admite un contrato estable.

Ejecutar en los 6 proyectos. Public routes siguen cubiertas por Task 4.

- [ ] **Step 5: Ejecutar gate completo responsive**

Run: `node --test test/responsive-ui.test.mjs`

Run: `npm test`

Run: `npx playwright test`

Run: `npm run build`

Run: `git diff --check`

Expected: todos pasan; cero rutas omitidas; cero overflow del documento; controles táctiles e inputs cumplen medidas.

- [ ] **Step 6: Revisión final contra Web Interface Guidelines**

Referencia primaria: `https://github.com/vercel-labs/web-interface-guidelines` y, para el gate WCAG, `https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright`.

Buscar y corregir antes del commit:

```bash
rg -n "transition:\s*all|overflowX:\s*['\"]visible|<(div|span|tr|td)[^>]*onClick|font(Size|-size):\s*['\"]?(8|9|10|11)(px)?(\D|$)" app components
```

Cada resultado debe desaparecer. Solo se acepta un handler de backdrop semántico cubierto por la prueba de diálogo; no se aceptan excepciones visuales sin corregir. Revisar además labels, `aria-label`, foco, navegación semántica, `Intl.*`, contenido largo y estados vacíos.

- [ ] **Step 7: Commit autocontenido del bloque**

```bash
git add 'app/centro/[id]/cuadro/page.js' 'app/centro/[id]/cumplimiento/page.js' 'app/centro/[id]/foda/page.js' 'app/centro/[id]/historial/page.js' 'app/centro/[id]/entrenamiento' components/foda components/tour/TourHost.js components/MeasuredChart.js components/TableScroller.js app/globals.css tests/e2e/center-reports.spec.js tests/e2e/full-route-audit.spec.js tests/e2e/center-user.spec.js tests/e2e/responsive-states.spec.js tests/e2e/accessibility.spec.js test/responsive-ui.test.mjs
git commit -m "feat(ui): completar reportes formación y auditoría móvil"
```

---

### Task 11: Preview, PR, merge y verificación productiva

**Files:**
- No cambia código; consume la rama completa y los checks remotos.

**Interfaces:**
- Consumes: los gates de ambos planes, GitHub y el deployment preview de Vercel.
- Produces: un único PR squash-merged a `main` y smoke read-only sobre producción.

- [ ] **Step 1: Confirmar alcance exacto y árbol limpio**

```bash
set -euo pipefail
git status --short
test -z "$(git status --porcelain)"
git diff --check origin/main...HEAD
git diff --name-only origin/main...HEAD
git log --oneline origin/main..HEAD
```

Expected: solo archivos de KPI ALOHA y estos dos documentos/spec; ningún `.env`, storage state, reporte, screenshot ni `docs/sop/`. El worktree queda limpio.

- [ ] **Step 2: Repetir gate local final**

```bash
set -euo pipefail
npm test
npm run test:usuarios:db
npx playwright test
npm run build
```

Ejecutar con `USUARIOS_TEST_DATABASE_URL`, `E2E_DATABASE_CONFIRM=disposable`, `E2E_ADMIN_*`, `E2E_COORDINATOR_*`, `E2E_CENTER_EMAIL`, `E2E_CENTER_PASSWORD`, `E2E_CENTRO_ID`, `E2E_COORDINATOR_SECOND_CENTER_ID`, `E2E_COACH_TOKEN`, `E2E_VALID_ACCESS_TOKEN` y `E2E_BRIEFING_CENTRO_ID` ya configurados. Expected: cero fallos; si falta una credencial, token fixture o DB desechable, detener la entrega y resolver el entorno, no omitir el gate.

- [ ] **Step 3: Sincronizar y publicar la rama**

```bash
set -euo pipefail
git fetch origin
git rev-list --left-right --count origin/main...HEAD
```

Si el primer número es `0`, publicar:

```bash
git push -u origin codex/aloha-coordinator-mobile
```

Si el primer número es mayor que `0`, rebasar la rama sobre `origin/main`, resolver únicamente conflictos de esta rama, repetir gates y después publicar:

```bash
set -euo pipefail
git rebase origin/main
npm test
npm run test:usuarios:db
npx playwright test
npm run build
git diff --check
git push -u origin codex/aloha-coordinator-mobile
```

El bloque de rebase se ejecuta solo cuando el conteo izquierdo es mayor que cero. Como la rama se publica después del rebase, no requiere force push; si ya existiera una rama remota homónima, inspeccionarla antes y no sobreescribir commits ajenos.

- [ ] **Step 4: Crear un solo PR y esperar checks**

```bash
set -euo pipefail
gh pr create --base main --head codex/aloha-coordinator-mobile --title "Usuarios por coordinador y experiencia móvil integral" --body $'## Resumen\n- habilita Gestión de usuarios para coordinadores dentro de sus centros vigentes\n- serializa autorización, mutaciones y ciclo de tokens sin exponer resets activos\n- adapta las 27 páginas a 320–1440 px con drawer, tarjetas, scrollers y diálogos accesibles\n\n## Verificación\n- npm test\n- npm run test:usuarios:db\n- npx playwright test\n- npm run build\n- git diff --check\n\n## Entrega\n- preview Vercel auditado con gerencia, coordinador y usuario de centro\n- sin migraciones ni variables productivas nuevas'
gh pr checks --watch
gh pr view --json url,number,headRefName,statusCheckRollup
```

El cuerpo enumera: matriz de permisos, transacciones/tokens, las 27 rutas, los 6 viewports, pruebas ejecutadas y riesgos operativos. La URL preview se toma del `targetUrl` del check Vercel exitoso; no se inventa.

- [ ] **Step 5: Ejecutar smoke contra preview**

```bash
set -euo pipefail
ALOHA_REPO_SLUG=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
ALOHA_HEAD_SHA=$(git rev-parse HEAD)
ALOHA_DEPLOYMENT_ID=$(gh api "repos/$ALOHA_REPO_SLUG/deployments?sha=$ALOHA_HEAD_SHA&environment=Preview" --jq '.[0].id // empty')
test -n "$ALOHA_DEPLOYMENT_ID"
test "$(gh api "repos/$ALOHA_REPO_SLUG/deployments/$ALOHA_DEPLOYMENT_ID" --jq .sha)" = "$ALOHA_HEAD_SHA"
ALOHA_PREVIEW_URL=$(gh api "repos/$ALOHA_REPO_SLUG/deployments/$ALOHA_DEPLOYMENT_ID/statuses" --jq 'map(select(.state == "success"))[0].environment_url // empty')
: "${ALOHA_PREVIEW_URL:?No se encontró una URL Preview exitosa para HEAD}"
vercel ls aloha-kpi --environment=preview --status=READY --meta "githubCommitSha=$ALOHA_HEAD_SHA" --yes
ALOHA_PREVIEW_HOST=${ALOHA_PREVIEW_URL#https://}
vercel api "/v13/deployments/$ALOHA_PREVIEW_HOST" \
  | jq -e --arg sha "$ALOHA_HEAD_SHA" '.target != "production" and .meta.githubCommitSha == $sha'
E2E_CAPTURE_DIR=artifacts/responsive-audit RESPONSIVE_BASE_URL="$ALOHA_PREVIEW_URL" npx playwright test
RESPONSIVE_BASE_URL="$ALOHA_PREVIEW_URL" node tests/e2e/rollback-smoke.mjs
RESPONSIVE_BASE_URL=https://aloha-kpi.vercel.app node tests/e2e/rollback-smoke.mjs
```

Expected: GitHub, la API de Vercel y `vercel ls` encuentran un deployment Preview `READY` cuyo `githubCommitSha` es exactamente `HEAD`; no se acepta el primer preview exitoso de otra revisión. La suite remota completa incluye públicas, drawer, gerencia, coordinador y usuario de centro en seis viewports, diálogos seguros, menú, tour, estados, las 27 rutas y Axe. El harness de rollback pasa tanto contra preview como contra la producción anterior; si esta última falla, corregir el harness para que mida disponibilidad/guardas compatibles antes de fusionar.

Revisar las capturas de las 27 páginas —`public-responsive`, `full-route-audit` y `center-user` llaman el mismo helper `capturePage`— y abrir en navegador al menos `/dashboard`, `/dashboard/usuarios`, `/centro/$E2E_CENTRO_ID/grupos`, `/eventos`, `/cuadro` y Coach en 320, 390, 768 y 1440 px. En 390×844: abrir/cerrar drawer, entrar a Usuarios como coordinador, abrir/cancelar Crear usuario, abrir/cancelar un diálogo de Grupos, recorrer un paso del tour y alternar tema. No crear, editar, borrar, guardar asistencia ni enviar correos en preview.

- [ ] **Step 6: Merge squash y verificación productiva**

```bash
set -euo pipefail
ALOHA_EXPECTED_HEAD_SHA=$(git rev-parse HEAD)
test "$(gh pr view --json headRefOid --jq .headRefOid)" = "$ALOHA_EXPECTED_HEAD_SHA"
git fetch origin
test "$(git rev-list --left-right --count origin/main...HEAD | awk '{print $1}')" = "0"
gh pr checks --watch
gh pr merge --squash --match-head-commit "$ALOHA_EXPECTED_HEAD_SHA"
ALOHA_MERGE_SHA=$(gh pr view --json mergeCommit --jq .mergeCommit.oid)
test -n "$ALOHA_MERGE_SHA"
gh pr view --json state,mergedAt,mergeCommit,url
git fetch origin
test "$(git rev-parse origin/main)" = "$ALOHA_MERGE_SHA"
ALOHA_REPO_SLUG=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
ALOHA_PROD_DEPLOYMENT_ID=''
ALOHA_PROD_URL=''
for attempt in {1..30}; do
  ALOHA_PROD_DEPLOYMENT_ID=$(gh api "repos/$ALOHA_REPO_SLUG/deployments?sha=$ALOHA_MERGE_SHA&environment=Production" --jq '.[0].id // empty')
  if test -n "$ALOHA_PROD_DEPLOYMENT_ID"; then
    ALOHA_PROD_URL=$(gh api "repos/$ALOHA_REPO_SLUG/deployments/$ALOHA_PROD_DEPLOYMENT_ID/statuses" --jq 'map(select(.state == "success"))[0].environment_url // empty')
  fi
  if test -n "$ALOHA_PROD_URL"; then break; fi
  sleep 10
done
: "${ALOHA_PROD_URL:?No se encontró Production exitosa para el merge SHA}"
test "$(gh api "repos/$ALOHA_REPO_SLUG/deployments/$ALOHA_PROD_DEPLOYMENT_ID" --jq .sha)" = "$ALOHA_MERGE_SHA"
vercel ls aloha-kpi --environment=production --status=READY --meta "githubCommitSha=$ALOHA_MERGE_SHA" --yes
vercel inspect "$ALOHA_PROD_URL" --wait --timeout=5m
vercel api /v13/deployments/aloha-kpi.vercel.app \
  | jq -e --arg sha "$ALOHA_MERGE_SHA" '.target == "production" and .meta.githubCommitSha == $sha'
RESPONSIVE_BASE_URL="$ALOHA_PROD_URL" npx playwright test
RESPONSIVE_BASE_URL=https://aloha-kpi.vercel.app npx playwright test
```

Expected: PR `MERGED`; `origin/main`, GitHub Deployment, Vercel Production y el alias `aloha-kpi.vercel.app` apuntan al mismo `mergeCommit.oid`; tanto la URL inmutable como el alias pasan la suite read-only completa. La consulta REST del alias es obligatoria: probar solo el dominio no demuestra qué revisión lo sirve.

Si falla un gate antes del merge, no fusionar. Si falla build o smoke después del merge, conservar evidencia y ejecutar inmediatamente una reversión mediante PR —el squash es un commit simple, no usa `-m`—:

```bash
set -euo pipefail
ALOHA_REPO_SLUG=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
ALOHA_MERGE_SHA=$(gh pr list --repo "$ALOHA_REPO_SLUG" --state merged --head codex/aloha-coordinator-mobile --limit 1 --json mergeCommit --jq '.[0].mergeCommit.oid // empty')
: "${ALOHA_MERGE_SHA:?No se pudo resolver el merge SHA del PR original}"
ALOHA_ROLLBACK_SMOKE_DIR=$(mktemp -d)
cp tests/e2e/rollback-smoke.mjs "$ALOHA_ROLLBACK_SMOKE_DIR/rollback-smoke.mjs"
git fetch origin
git switch -c "codex/revert-aloha-$ALOHA_MERGE_SHA" origin/main
git revert --no-edit "$ALOHA_MERGE_SHA"
ALOHA_REVERT_HEAD_SHA=$(git rev-parse HEAD)
git push -u origin "codex/revert-aloha-$ALOHA_MERGE_SHA"
ALOHA_REVERT_PR_URL=$(gh pr create --base main --head "codex/revert-aloha-$ALOHA_MERGE_SHA" --title "Revert: usuarios por coordinador y responsive móvil" --body "Revierte $ALOHA_MERGE_SHA porque el smoke productivo falló. La evidencia y el gate afectado quedan documentados en este PR.")
test -n "$ALOHA_REVERT_PR_URL"
gh pr checks "$ALOHA_REVERT_PR_URL" --watch
test "$(gh pr view "$ALOHA_REVERT_PR_URL" --json headRefOid --jq .headRefOid)" = "$ALOHA_REVERT_HEAD_SHA"
ALOHA_REVERT_PREVIEW_ID=$(gh api "repos/$ALOHA_REPO_SLUG/deployments?sha=$ALOHA_REVERT_HEAD_SHA&environment=Preview" --jq '.[0].id // empty')
: "${ALOHA_REVERT_PREVIEW_ID:?No se encontró Preview para el commit de reversión}"
test "$(gh api "repos/$ALOHA_REPO_SLUG/deployments/$ALOHA_REVERT_PREVIEW_ID" --jq .sha)" = "$ALOHA_REVERT_HEAD_SHA"
ALOHA_REVERT_PREVIEW_URL=$(gh api "repos/$ALOHA_REPO_SLUG/deployments/$ALOHA_REVERT_PREVIEW_ID/statuses" --jq 'map(select(.state == "success"))[0].environment_url // empty')
: "${ALOHA_REVERT_PREVIEW_URL:?No se encontró URL Preview exitosa para la reversión}"
ALOHA_REVERT_PREVIEW_HOST=${ALOHA_REVERT_PREVIEW_URL#https://}
vercel api "/v13/deployments/$ALOHA_REVERT_PREVIEW_HOST" \
  | jq -e --arg sha "$ALOHA_REVERT_HEAD_SHA" '.target != "production" and .meta.githubCommitSha == $sha'
RESPONSIVE_BASE_URL="$ALOHA_REVERT_PREVIEW_URL" node "$ALOHA_ROLLBACK_SMOKE_DIR/rollback-smoke.mjs"
gh pr merge "$ALOHA_REVERT_PR_URL" --squash --match-head-commit "$ALOHA_REVERT_HEAD_SHA"
ALOHA_REVERT_SHA=$(gh pr view "$ALOHA_REVERT_PR_URL" --json mergeCommit --jq .mergeCommit.oid)
test -n "$ALOHA_REVERT_SHA"
git fetch origin
test "$(git rev-parse origin/main)" = "$ALOHA_REVERT_SHA"
ALOHA_REVERT_DEPLOYMENT_ID=''
ALOHA_REVERT_PROD_URL=''
for attempt in {1..30}; do
  ALOHA_REVERT_DEPLOYMENT_ID=$(gh api "repos/$ALOHA_REPO_SLUG/deployments?sha=$ALOHA_REVERT_SHA&environment=Production" --jq '.[0].id // empty')
  if test -n "$ALOHA_REVERT_DEPLOYMENT_ID"; then
    ALOHA_REVERT_PROD_URL=$(gh api "repos/$ALOHA_REPO_SLUG/deployments/$ALOHA_REVERT_DEPLOYMENT_ID/statuses" --jq 'map(select(.state == "success"))[0].environment_url // empty')
  fi
  if test -n "$ALOHA_REVERT_PROD_URL"; then break; fi
  sleep 10
done
: "${ALOHA_REVERT_PROD_URL:?No se encontró Production exitosa para el SHA de reversión}"
test "$(gh api "repos/$ALOHA_REPO_SLUG/deployments/$ALOHA_REVERT_DEPLOYMENT_ID" --jq .sha)" = "$ALOHA_REVERT_SHA"
vercel ls aloha-kpi --environment=production --status=READY --meta "githubCommitSha=$ALOHA_REVERT_SHA" --yes
vercel inspect "$ALOHA_REVERT_PROD_URL" --wait --timeout=5m
vercel api /v13/deployments/aloha-kpi.vercel.app \
  | jq -e --arg sha "$ALOHA_REVERT_SHA" '.target == "production" and .meta.githubCommitSha == $sha'
RESPONSIVE_BASE_URL="$ALOHA_REVERT_PROD_URL" node "$ALOHA_ROLLBACK_SMOKE_DIR/rollback-smoke.mjs"
RESPONSIVE_BASE_URL=https://aloha-kpi.vercel.app node "$ALOHA_ROLLBACK_SMOKE_DIR/rollback-smoke.mjs"
```

El SHA válido de reversión es `mergeCommit.oid` del PR squash, no el commit local creado por `git revert`. Antes de fusionar, el harness mínimo debe pasar contra el Preview exacto del commit de reversión. La suite responsive nueva ya no existe después de revertir y la versión anterior no debe pasar sus expectativas; por eso el harness se copia antes y, después del squash, se repite contra la URL inmutable y el alias. No hacer una corrección directa sobre `main` ni dejar el deployment defectuoso activo mientras se desarrolla otro arreglo.

---

## Criterio de salida de este plan

- Las 27 páginas reales están registradas y auditadas; ninguna ruta visible queda fuera.
- Los viewports 320×568, 375×667, 390×844, 430×932, 768×1024 y 1440×900 pasan.
- `documentElement.scrollWidth <= clientWidth` en todas las rutas.
- Ningún botón/control móvil auditado mide menos de 44 × 44 px; inputs editables miden al menos 16 px de fuente.
- El Sidebar es drawer hasta 1024 px, ofrece `Ir a centro`, cierra por backdrop/Escape/ruta y restaura foco.
- Modales y sheets usan `100dvh`, safe areas, scroll interno, semántica y foco controlado.
- Listas operativas son tarjetas móviles; comparaciones densas tienen overflow exclusivamente local.
- Gráficos conocen su ancho, apilan leyendas y mantienen equivalente textual.
- No quedan `transition:all`, navegación con `div/tr onClick`, inputs sin etiqueta ni icon buttons sin nombre en el alcance auditado.
- Desktop conserva identidad ALOHA y no presenta regresiones visuales o funcionales.
- La prueba local desechable demuestra crear, mover, reenviar, restablecer y eliminar desde la UI hasta PostgreSQL sin enviar correo real.
- `npm test`, `npx playwright test`, `npm run build` y `git diff --check` pasan.
- El único PR queda squash-merged a `main`; preview y producción pasan el smoke read-only.
