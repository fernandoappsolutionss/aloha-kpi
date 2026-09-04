'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import TableScroller from '../../../components/TableScroller'
import { getGrowthAdminOverview } from '../../actions/growth'
import { confidenceMeta, formatGrowthPeriod } from '../../../lib/growth/presenter.mjs'

const decimal = (value, digits = 1) => (Number(value) || 0).toFixed(digits)
const pct = (value) => `${Math.round((Number(value) || 0) * 100)}%`
const signed = (value) => {
  const number = Number(value) || 0
  return `${number > 0 ? '+' : ''}${decimal(number)}`
}

const priorityOf = (row) => {
  if (row.error) return 'error'
  if (row.confidence.level === 'low' || row.topAction?.kind === 'data_quality') return 'data'
  if (row.capacityBlocksLevel) return 'capacity'
  if (row.baseMonthlyNet <= 0) return 'stalled'
  return 'on_track'
}

const PRIORITY = {
  error: { label: 'Error de cálculo', tone: 'bad', weight: 0 },
  data: { label: 'Completar datos', tone: 'warn', weight: 1 },
  capacity: { label: 'Revisar capacidad', tone: 'warn', weight: 2 },
  stalled: { label: 'Ritmo detenido', tone: 'bad', weight: 3 },
  on_track: { label: 'Con avance', tone: 'ok', weight: 4 },
}

const GUARDRAIL = {
  insufficient_data: { label: 'Esperando muestra', tone: 'warn' },
  candidate: { label: 'Motor supera referencia', tone: 'ok' },
  hold: { label: 'Mantener versión actual', tone: 'bad' },
}

function SummaryMetric({ label, value, detail, tone }) {
  return (
    <div className="growth-admin-stat">
      <span className="label">{label}</span>
      <strong className="num" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function EmptyModel({ model }) {
  const guardrail = GUARDRAIL[model.guardrail] || GUARDRAIL.insufficient_data
  return (
    <section className="growth-model-band" aria-labelledby="model-band-title">
      <div>
        <span className="label">Control del motor</span>
        <h2 id="model-band-title">Precisión de la versión actual</h2><p className="growth-explanation">Comparación con cierres posteriores a cada pronóstico. Menos de seis cierres evaluados no permiten validar la precisión.</p>
      </div>
      <div className="growth-model-band__metrics">
        <span><small>Muestra</small><strong className="num">{model.sampleSize}</strong></span>
        <span><small>MAE motor</small><strong className="num">{model.engineMae ?? '—'}</strong></span>
        <span><small>MAE referencia</small><strong className="num">{model.baselineMae ?? '—'}</strong></span>
        <span><small>Mejora</small><strong className="num">{model.improvementPct == null ? '—' : `${model.improvementPct}%`}</strong></span>
      </div>
      <div className={`pill pill--${guardrail.tone}`}><span className="dot" />{guardrail.label}</div>
    </section>
  )
}

export default function GrowthAdminPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [confidence, setConfidence] = useState('all')
  const [priority, setPriority] = useState('all')
  const [sort, setSort] = useState('priority')

  const load = () => {
    setLoading(true)
    setError('')
    getGrowthAdminOverview()
      .then(setData)
      .catch((cause) => {
        console.error('[GrowthAdminPage]', cause)
        setError('No se pudo calcular el crecimiento de los centros.')
      })
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const filtered = (data?.rows || []).filter((row) => {
      if (needle && !row.name.toLowerCase().includes(needle)) return false
      if (confidence !== 'all' && row.confidence?.level !== confidence) return false
      if (priority !== 'all' && priorityOf(row) !== priority) return false
      return true
    })

    return [...filtered].sort((a, b) => {
      if (sort === 'gap') return (a.nextLevel?.gap ?? Infinity) - (b.nextLevel?.gap ?? Infinity)
      if (sort === 'growth') return (b.actionMonthlyNet ?? -Infinity) - (a.actionMonthlyNet ?? -Infinity)
      if (sort === 'children') return (b.currentChildren ?? -Infinity) - (a.currentChildren ?? -Infinity)
      const priorityDelta = PRIORITY[priorityOf(a)].weight - PRIORITY[priorityOf(b)].weight
      return priorityDelta || (a.nextLevel?.gap ?? Infinity) - (b.nextLevel?.gap ?? Infinity)
    })
  }, [confidence, data, priority, search, sort])

  return (
    <div className="shell">
      <Sidebar rol="admin_general" />
      <main id="main-content" data-page-state={loading ? 'loading' : error ? 'error' : 'ready'} className="main growth-admin-page comparisons-page">
        <header className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Franquicia · proyección</div>
            <h1 className="h-title">Crecimiento de centros</h1>
            <p className="h-sub">Nivel, brecha, palancas controlables y precisión del motor</p>
          </div>
          <button type="button" className="btn" onClick={load} disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar'}
          </button>
        </header>

        {error && <div role="alert" className="alert alert--error">{error}</div>}
        {loading && data && <div role="status">Actualizando crecimiento…</div>}

        {data && (
          <>
            <section className="growth-admin-summary" aria-label="Resumen de crecimiento">
              <SummaryMetric label="Centros calculados" value={`${data.summary.calculated}/${data.summary.centers}`} detail="con ruta disponible" />
              <SummaryMetric label="Datos insuficientes" value={data.summary.lowConfidence} detail="requieren completar datos" tone={data.summary.lowConfidence ? 'warn' : 'ok'} />
              <SummaryMetric label="Ritmo positivo" value={data.summary.positiveBase} detail="centros con crecimiento base" tone="ok" />
              <SummaryMetric label="Bloqueo de capacidad" value={data.summary.capacityBlocked} detail="no sostienen el próximo nivel" tone={data.summary.capacityBlocked ? 'warn' : 'ok'} />
              <SummaryMetric label="Crecimiento proyectado" value={signed(data.summary.projectedMonthlyNet)} detail="niños netos por mes" />
            </section>

            <EmptyModel model={data.model} />

            <div className="growth-admin-controls">
              <input
                className="input"
                type="search"
                name="centro"
                autoComplete="off"
                aria-label="Buscar centro"
                placeholder="Buscar centro..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <select className="select" name="confianza" autoComplete="off" aria-label="Filtrar por calidad de datos" value={confidence} onChange={(event) => setConfidence(event.target.value)}>
                <option value="all">Toda calidad de datos</option>
                <option value="high">Datos completos</option>
                <option value="medium">Datos por revisar</option>
                <option value="low">Datos insuficientes</option>
              </select>
              <select className="select" name="prioridad" autoComplete="off" aria-label="Filtrar por prioridad" value={priority} onChange={(event) => setPriority(event.target.value)}>
                <option value="all">Toda prioridad</option>
                <option value="data">Completar datos</option>
                <option value="capacity">Revisar capacidad</option>
                <option value="stalled">Ritmo detenido</option>
                <option value="on_track">Con avance</option>
              </select>
              <select className="select" name="orden" autoComplete="off" aria-label="Ordenar centros" value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="priority">Orden: prioridad</option>
                <option value="gap">Menor brecha</option>
                <option value="growth">Mayor crecimiento</option>
                <option value="children">Más niños</option>
              </select>
              <span className="label growth-admin-controls__count">{rows.length} centro{rows.length === 1 ? '' : 's'}</span>
            </div>
          </>
        )}

        {loading && !data ? (
          <div className="growth-admin-loading" role="status">
            <strong>Calculando rutas de todos los centros</strong>
            <span>Este primer cálculo puede tomar unos segundos.</span>
          </div>
        ) : data && rows.length ? (
          <TableScroller label="Crecimiento por centro" stickyFirstColumn>
            <table className="table growth-admin-table">
              <caption className="sr-only">Crecimiento por centro: nivel, proyección y prioridades</caption>
              <thead>
                <tr>
                  <th>Centro</th>
                  <th>Cierre previsto y brecha</th>
                  <th>Proyección</th>
                  <th>Próximo mes</th>
                  <th>Control local</th>
                  <th>Prioridad</th>
                  <th>Precisión</th>
                  <th aria-label="Abrir ruta" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  if (row.error) return (
                    <tr key={row.id}>
                      <td><strong>{row.name}</strong></td>
                      <td colSpan="6" style={{ color: 'var(--bad)' }}>No se pudo calcular este centro.</td>
                      <td><Link className="btn" href={`/centro/${row.id}`} aria-label={`Abrir centro ${row.name}`}>Abrir</Link></td>
                    </tr>
                  )
                  const confidenceInfo = confidenceMeta(row.confidence.level)
                  const priorityInfo = PRIORITY[priorityOf(row)]
                  const progress = row.nextLevel
                    ? Math.min(100, (row.currentChildren / row.nextLevel.threshold) * 100)
                    : 100
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong className="growth-admin-table__name">{row.name}</strong>
                        <span className="label">Nivel previsto {row.currentLevel || 0}</span>
                      </td>
                      <td>
                        <div className="growth-admin-gap">
                          <strong className="num">{row.currentChildren}</strong>
                          <span>{row.nextLevel ? `faltarían ${row.nextLevel.gap} para N${row.nextLevel.level}` : 'nivel máximo'}</span>
                        </div>
                        <div className="growth-mini-track"><span style={{ width: `${progress}%` }} /></div>
                      </td>
                      <td>
                        <div className="growth-admin-pair"><span>Base</span><strong className="num">{signed(row.baseMonthlyNet)}/mes</strong></div>
                        <div className="growth-admin-pair"><span>Si se cumple</span><strong className="num growth-admin-positive">{signed(row.actionMonthlyNet)}/mes</strong></div>
                        <small>{row.actionQuarter ? formatGrowthPeriod(row.actionQuarter) : 'Sin trimestre confiable'}</small>
                      </td>
                      <td>
                        {row.nextMonth ? (
                          <>
                            <div className="growth-admin-equation num">{row.nextMonth.startChildren} − {row.nextMonth.withdrawals} + {row.nextMonth.newActives} + {row.nextMonth.reincorporations || 0} = <b>{row.nextMonth.endChildren}</b></div>
                            <small>{formatGrowthPeriod(row.nextMonth.period)}</small>
                          </>
                        ) : '—'}
                      </td>
                      <td>
                        <div className="growth-admin-pair"><span>Captación propia</span><strong className="num">{pct(row.acquisitionShare)}</strong></div>
                        <div className="growth-admin-pair"><span>Bajas controlables</span><strong className="num">{pct(row.attritionShare)}</strong></div>
                        {row.capacityBlocksLevel && <small className="growth-admin-warning">Capacidad insuficiente</small>}
                      </td>
                      <td>
                        <div className="growth-admin-badges">
                          <span className={`pill pill--${priorityInfo.tone}`}><span className="dot" />{priorityInfo.label}</span>
                          <span className={`pill pill--${confidenceInfo.tone}`}><span className="dot" />{confidenceInfo.label}</span>
                        </div>
                        <small className="growth-admin-action-copy">{row.topAction?.title || 'Sin acción pendiente'}</small>
                      </td>
                      <td>
                        <div className="growth-admin-pair"><span>Muestra</span><strong className="num">{row.backtest.sampleSize}</strong></div>
                        <div className="growth-admin-pair"><span>MAE</span><strong className="num">{row.backtest.engineMae ?? '—'}</strong></div>
                        <small>{GUARDRAIL[row.backtest.guardrail]?.label}</small>
                      </td>
                      <td>
                        <Link className="btn growth-admin-open" aria-label={`Abrir ruta de ${row.name}`} href={`/centro/${row.id}/ruta-nivel`}>
                          Abrir
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </TableScroller>
        ) : data ? (
          <div className="growth-admin-loading"><strong>No hay centros con estos filtros.</strong></div>
        ) : null}
      </main>
    </div>
  )
}
