# Ruta al Proximo Nivel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> `superpowers:test-driven-development`, `superpowers:requesting-code-review`
> and `superpowers:verification-before-completion` for every PR.

**Goal:** Convertir el historial ALOHA en una ruta accionable al siguiente
nivel, con proyeccion auditable, recomendaciones, briefing semanal y control
administrativo.

**Architecture:** Un nucleo puro en `lib/growth/` recibe series mensuales y
estado operativo. Las acciones servidoras cargan datos y persisten snapshots.
Resumen, Ruta de Nivel, popup y dashboard consumen el mismo resultado.

**Tech Stack:** Next.js 15, React 18, Neon PostgreSQL, Recharts y `node:test`.

## PR1: Motor, datos y pruebas

**Branch:** `codex/aloha-ruta-nivel-motor`

**Files:**

- Create: `lib/growth/metrics.mjs`
- Create: `lib/growth/projector.mjs`
- Create: `lib/growth/recommendations.mjs`
- Create: `lib/growth/serialize.mjs`
- Create: `test/growth-metrics.test.mjs`
- Create: `test/growth-projector.test.mjs`
- Create: `test/growth-recommendations.test.mjs`
- Create: `app/actions/growth.js`
- Modify: `db/schema.sql`
- Modify: `scripts/migrate.mjs`

- [ ] Write failing tests for rolling metrics, missing data and no double count.
- [ ] Implement normalized monthly metrics and confidence.
- [ ] Write failing tests for conservative/base/action simulations.
- [ ] Implement month simulation, threshold date and quarter recognition.
- [ ] Write failing tests for trigger, ranking and max-three recommendations.
- [ ] Implement strategy catalog and deterministic priority.
- [ ] Add idempotent tables and server action to calculate/persist a snapshot.
- [ ] Run `npm test`, `npm run build`, `git diff --check`.
- [ ] Independent review, push, PR, checks and squash merge.

## PR2: Resumen and Ruta de Nivel

**Branch:** `codex/aloha-ruta-nivel-ui`

**Files:**

- Create: `app/centro/[id]/crecimiento/page.js`
- Create: `components/growth/GrowthSummary.js`
- Create: `components/growth/GrowthActions.js`
- Create: `components/growth/GrowthScenarioChart.js`
- Modify: `app/centro/[id]/page.js`
- Modify: `components/Sidebar.js`
- Modify: `app/globals.css`

- [ ] Expose one server payload for summary and full route.
- [ ] Render summary band without nested cards.
- [ ] Build scenario, funnel, attrition, capacity and action views.
- [ ] Add responsive navigation and loading/error/low-confidence states.
- [ ] Verify light/dark and desktop/mobile with browser screenshots.
- [ ] Run full gate, independent review, PR, checks and squash merge.

## PR3: Briefing and action lifecycle

**Branch:** `codex/aloha-ruta-nivel-notificaciones`

**Files:**

- Create: `components/growth/GrowthBriefing.js`
- Create: `app/actions/growth-notifications.js`
- Modify: `app/centro/[id]/page.js`
- Modify: `app/centro/[id]/crecimiento/page.js`
- Modify: `db/schema.sql`

- [ ] Write failing pure tests for weekly eligibility, snooze and material change.
- [ ] Persist shown/acknowledged/snoozed receipts per user.
- [ ] Persist recommendation states: pending/completed/dismissed.
- [ ] Render maximum three actions and accessible modal controls.
- [ ] Verify no repeated popup in the same week.
- [ ] Run full gate, independent review, PR, checks and squash merge.

## PR4: Admin, benchmark and backtesting

**Branch:** `codex/aloha-ruta-nivel-admin`

**Files:**

- Create: `app/dashboard/crecimiento/page.js`
- Create: `lib/growth/backtest.mjs`
- Create: `test/growth-backtest.test.mjs`
- Modify: `app/actions/growth.js`
- Modify: `components/Sidebar.js`

- [ ] Write failing tests for rolling-origin backtesting and baseline comparison.
- [ ] Implement MAE, bias, range coverage and keep-baseline guard.
- [ ] Build admin table with level, gap, ETA, confidence and active action.
- [ ] Add center comparison without exposing personal student data.
- [ ] Verify filters, empty states and responsive table.
- [ ] Run tests/build/diff check and full visual regression.
- [ ] Independent review, PR, checks, squash merge and production verification.

## Final Gate

```bash
npm test
npm run build
git diff --check
git rev-list --left-right --count origin/main...HEAD
```

Verify the production deployment for the final merge commit and smoke-test:

- center summary;
- Ruta de Nivel;
- weekly briefing persistence;
- recommendation state change;
- admin growth panel;
- light/dark and desktop/mobile.
