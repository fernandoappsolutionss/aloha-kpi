'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Sidebar from '../../../../components/Sidebar'
import { getCentroGrowth } from '../../../actions/growth'
import {
  confidenceMeta,
  formatGrowthPeriod,
  growthStageProgress,
  scenarioChartRows,
} from '../../../../lib/growth/presenter.mjs'

const SCENARIOS = {
  conservative: { label: 'Conservador', color: 'var(--chart-muted)' },
  base: { label: 'Ritmo actual', color: 'var(--ts-green)' },
  action: { label: 'Plan de acción', color: 'var(--warn)' },
}

const KIND_LABELS = {
  data_quality: 'Calidad de datos',
  capacity: 'Capacidad',
  invitations: 'Invitaciones',
  attendance: 'Asistencia',
  enrollment: 'Matrícula',
  class_loss: 'Pérdida de clases',
  technique: 'Técnica',
  schedule: 'Horario',
  activations: 'Activaciones',
}

const pct = (value) => `${Math.round((Number(value) || 0) * 100)}%`
const decimal = (value, digits = 1) => (Number(value) || 0).toFixed(digits)

function ProjectionTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="growth-tooltip">
      <strong>{label}</strong>
      {payload.map((item) => (
        <span key={item.dataKey} style={{ color: item.color }}>
          {SCENARIOS[item.dataKey]?.label}: <b className="num">{decimal(item.value, 0)}</b>
        </span>
      ))}
    </div>
  )
}

function FlowRow({ label, value, rate, tone = 'green' }) {
  const width = Math.max(0, Math.min(100, Number(rate) || 0))
  return (
    <div className="growth-flow-row">
      <div>
        <span>{label}</span>
        <strong className="num">{value}</strong>
      </div>
      <div className="growth-mini-track"><span className={`growth-mini-track--${tone}`} style={{ width: `${width}%` }} /></div>
      <small className="num">{Math.round(width)}%</small>
    </div>
  )
}

function MetricLine({ label, value, detail }) {
  return (
    <div className="growth-metric-line">
      <span>{label}</span>
      <div>
        <strong className="num">{value}</strong>
        {detail && <small>{detail}</small>}
      </div>
    </div>
  )
}

function etaLabel(scenario, confidence) {
  if (confidence === 'low') return 'Sin fecha confiable'
  if (scenario?.recognitionQuarter) return formatGrowthPeriod(scenario.recognitionQuarter)
  if (scenario?.etaReason === 'non_positive_growth') return 'Sin fecha al ritmo actual'
  if (scenario?.etaReason === 'beyond_horizon') return 'Más de 24 meses'
  if (scenario?.etaReason === 'max_level') return 'Nivel máximo'
  return 'Sin fecha'
}

export default function GrowthRoutePage() {
  const { id } = useParams()
  const router = useRouter()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeScenario, setActiveScenario] = useState('base')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setData(null)
    getCentroGrowth(id)
      .then((result) => { if (alive) setData(result) })
      .catch((cause) => {
        console.error('[GrowthRoutePage]', cause)
        if (alive) setError('No se pudo calcular la ruta de crecimiento.')
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  const chartRows = useMemo(() => scenarioChartRows(data?.projection), [data])

  if (loading) return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre="Centro" centroId={id} />
      <main className="main growth-loading">Calculando ruta de crecimiento...</main>
    </div>
  )

  if (error || !data) return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre="Centro" centroId={id} />
      <main className="main">
        <div className="alert alert--error">{error || 'No hay datos disponibles.'}</div>
      </main>
    </div>
  )

  const { center, projection, metrics, operational, recommendations = [] } = data
  const next = projection.nextLevel
  const confidence = confidenceMeta(metrics.confidence.level)
  const progress = growthStageProgress(projection)
  const scenario = projection.scenarios[activeScenario]
  const firstMonth = projection.scenarios.base.series[0]
  const pipelineEntries = Object.entries(operational.pipelineByMonth || {}).sort(([a], [b]) => a.localeCompare(b))
  const capacityPct = projection.capacityMax
    ? Math.min(100, (projection.currentChildren / projection.capacityMax) * 100)
    : 0

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={center.nombre} centroId={id} />
      <main className="main growth-page">
        <header className="main__head growth-page__head">
          <div>
            <div className="label">Gestión · crecimiento</div>
            <h1 className="h-title">Ruta al Próximo Nivel</h1>
            <p className="h-sub">{center.nombre} · actualización {data.snapshotDate}</p>
          </div>
          <button type="button" className="btn" onClick={() => router.push(`/centro/${id}`)}>
            Volver al resumen
          </button>
        </header>

        <section className="growth-overview" aria-labelledby="growth-overview-title">
          <div className="growth-overview__main">
            <div className="growth-overview__eyebrow">
              <span className={`pill pill--${confidence.tone}`}><span className="dot" />{confidence.label}</span>
              <span className="label">Motor {data.engineVersion}</span>
            </div>
            <h2 id="growth-overview-title">
              {next ? `Nivel ${next.level}` : 'Nivel máximo'}
              <span className="num">{projection.currentChildren}{next ? ` / ${next.threshold}` : ''}</span>
            </h2>
            <div className="growth-track growth-track--large" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="growth-overview__scale">
              <span>Nivel {projection.currentLevel || 0}</span>
              <b>{next ? `Faltan ${next.gap} niños` : 'Meta alcanzada'}</b>
              <span>{next ? `Nivel ${next.level}` : 'Nivel 5'}</span>
            </div>
          </div>
          <div className="growth-overview__facts">
            <div><span className="label">Ritmo actual</span><strong>{etaLabel(projection.scenarios.base, metrics.confidence.level)}</strong></div>
            <div><span className="label">Con el plan</span><strong>{etaLabel(projection.scenarios.action, metrics.confidence.level)}</strong></div>
            <div><span className="label">Meta mensual</span><strong className="num">+{projection.requirements.netChildrenPerMonth} niños netos</strong></div>
          </div>
        </section>

        {metrics.confidence.reasons?.length > 0 && (
          <div className={`growth-data-note growth-data-note--${confidence.tone}`}>
            <strong>{confidence.label}</strong>
            <span>{metrics.confidence.reasons.join(' ')}</span>
          </div>
        )}

        <section className="growth-section" aria-labelledby="projection-title">
          <div className="growth-section__head">
            <div>
              <div className="label">Trayectoria</div>
              <h2 id="projection-title">Escenarios de crecimiento</h2>
            </div>
            <div className="growth-segments" role="group" aria-label="Escenario de proyección">
              {Object.entries(SCENARIOS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  className={activeScenario === key ? 'growth-segments__active' : ''}
                  aria-pressed={activeScenario === key}
                  onClick={() => setActiveScenario(key)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="growth-scenario-strip">
            <div><span className="label">Crecimiento mensual</span><strong className="num">{scenario.monthlyNet > 0 ? '+' : ''}{decimal(scenario.monthlyNet)} niños</strong></div>
            <div><span className="label">Alcanza el umbral</span><strong>{scenario.targetMonth ? formatGrowthPeriod(scenario.targetMonth) : 'Sin fecha'}</strong></div>
            <div><span className="label">Reconocimiento trimestral</span><strong>{etaLabel(scenario, metrics.confidence.level)}</strong></div>
          </div>

          <div className="growth-chart" aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartRows} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-dim)', fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} interval="preserveStartEnd" />
                <YAxis width={42} tick={{ fill: 'var(--text-dim)', fontSize: 10 }} tickLine={false} axisLine={false} domain={['dataMin - 10', 'dataMax + 10']} />
                <Tooltip content={<ProjectionTooltip />} />
                {next && <ReferenceLine y={next.threshold} stroke="var(--warn)" strokeDasharray="5 5" />}
                {Object.entries(SCENARIOS).map(([key, item]) => (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={item.color}
                    strokeWidth={activeScenario === key ? 3 : 1.5}
                    strokeOpacity={activeScenario === key ? 1 : 0.45}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Proyección mensual de niños por escenario</caption>
            <thead><tr><th>Mes</th><th>Conservador</th><th>Ritmo actual</th><th>Plan de acción</th></tr></thead>
            <tbody>
              {chartRows.map((row) => (
                <tr key={row.period}>
                  <th>{formatGrowthPeriod(row.period)}</th>
                  <td>{row.conservative}</td>
                  <td>{row.base}</td>
                  <td>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="growth-chart-legend">
            {Object.entries(SCENARIOS).map(([key, item]) => <span key={key}><i style={{ background: item.color }} />{item.label}</span>)}
            {next && <span><i className="growth-chart-legend__target" />Meta Nivel {next.level}</span>}
          </div>
        </section>

        <section className="growth-section" aria-labelledby="actions-title">
          <div className="growth-section__head">
            <div>
              <div className="label">Prioridad semanal</div>
              <h2 id="actions-title">Tres acciones para mover el resultado</h2>
            </div>
          </div>
          {recommendations.length > 0 ? (
            <div className="growth-actions">
              {recommendations.map((item, index) => (
              <article className="growth-action" key={item.kind}>
                <div className="growth-action__top">
                  <span className="growth-action__rank num">0{index + 1}</span>
                  <span className="pill">{KIND_LABELS[item.kind] || item.kind}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.reason}</p>
                <div className="growth-action__metric">
                  <span>{item.metric}</span>
                  <strong className="num">{item.baseline} → {item.target} {item.unit}</strong>
                </div>
                <div className="growth-action__impact">
                  <span>Impacto estimado</span>
                  <strong className="num">
                    {Number(item.estimatedImpact) > 0 ? `+${decimal(item.estimatedImpact)} niño/mes` : 'Habilita la proyección'}
                  </strong>
                </div>
                <p className="growth-action__task">{item.action}</p>
              </article>
              ))}
            </div>
          ) : (
            <div className="growth-empty-state">
              <strong>Nivel máximo sostenido</strong>
              <span>El centro no tiene una brecha de nivel activa. Mantén el seguimiento de retención, capacidad y calidad del dato.</span>
            </div>
          )}
        </section>

        <div className="growth-drivers">
          <section className="growth-driver" aria-labelledby="funnel-title">
            <div className="label">Clase de prueba</div>
            <h2 id="funnel-title">Embudo comercial</h2>
            <FlowRow label="Invitados" value={metrics.totals.invited} rate={100} />
            <FlowRow label="Asistieron" value={metrics.totals.attended} rate={metrics.rates.attendance * 100} />
            <FlowRow label="Se matricularon" value={metrics.totals.trialEnrollments} rate={metrics.rates.inviteToEnrollment * 100} tone="warn" />
            <div className="growth-driver__foot">
              <span>Meta de invitaciones</span>
              <strong className="num">{projection.requirements.weeklyInvitations ?? '—'} por semana</strong>
            </div>
          </section>

          <section className="growth-driver" aria-labelledby="acquisition-title">
            <div className="label">Captación controlable</div>
            <h2 id="acquisition-title">Referidos, centro y activaciones</h2>
            <div className="growth-driver__headline">
              <strong className="num">{metrics.controls.acquisitionCount}</strong>
              <span>{pct(metrics.controls.acquisitionShare)} de los ingresos con origen</span>
            </div>
            <MetricLine label="Referidos / mes" value={decimal(metrics.originMedians.referred)} />
            <MetricLine label="Centro / mes" value={decimal(metrics.originMedians.center)} />
            <MetricLine label="Activaciones / mes" value={decimal(metrics.originMedians.activations)} />
          </section>

          <section className="growth-driver" aria-labelledby="attrition-title">
            <div className="label">Retención</div>
            <h2 id="attrition-title">Deserción que el centro puede mover</h2>
            <div className="growth-driver__headline">
              <strong className="num">{decimal(metrics.medians.realAttrition)}</strong>
              <span>retiros reales por mes · {pct(metrics.controls.attritionShare)} controlable</span>
            </div>
            <MetricLine label="Pérdida de clases / mes" value={decimal(metrics.causeMedians.classLoss)} />
            <MetricLine label="Técnica / mes" value={decimal(metrics.causeMedians.technique)} />
            <MetricLine label="Horario / mes" value={decimal(metrics.causeMedians.schedule)} />
          </section>

          <section className="growth-driver" aria-labelledby="capacity-title">
            <div className="label">Operación</div>
            <h2 id="capacity-title">Pipeline y capacidad</h2>
            <div className="growth-driver__headline">
              <strong className="num">{projection.capacityMax ?? '—'}</strong>
              <span>capacidad estimada · {projection.capacityMax ? `${Math.round(capacityPct)}% ocupada` : 'sin salones configurados'}</span>
            </div>
            <MetricLine label={firstMonth ? formatGrowthPeriod(firstMonth.period) : 'Próximo mes'} value={`${firstMonth?.endChildren ?? projection.currentChildren} niños`} detail={`${firstMonth?.withdrawals || 0} bajas · ${firstMonth?.newActives || 0} inicios`} />
            {pipelineEntries.length > 0 ? pipelineEntries.slice(0, 3).map(([period, total]) => (
              <MetricLine key={period} label={`Inicios ${formatGrowthPeriod(period)}`} value={total} />
            )) : <MetricLine label="Inicios futuros con fecha" value="0" />}
            <MetricLine label="Inicios sin fecha" value={operational.undatedStarts || 0} />
          </section>
        </div>
      </main>
    </div>
  )
}
