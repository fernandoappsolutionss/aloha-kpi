'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import MeasuredChart from '../../../../components/MeasuredChart'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import Sidebar from '../../../../components/Sidebar'
import { getCentroGrowth, updateGrowthRecommendation } from '../../../actions/growth'
import {
  confidenceMeta,
  formatGrowthPeriod,
  growthStageProgress,
  scenarioChartRows,
} from '../../../../lib/growth/presenter.mjs'

const SCENARIOS = {
  conservative: { label: 'Escenario adverso', color: 'var(--chart-muted)' },
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

const STATUS_LABELS = {
  completed: 'Tarea realizada',
  dismissed: 'Descartada',
  postponed: 'Pospuesta 7 días',
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
          {item.dataKey === 'observed' ? 'Cierre registrado' : SCENARIOS[item.dataKey]?.label}: <b className="num">{decimal(item.value, 0)}</b>
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
  if (scenario?.etaReason === 'beyond_horizon') return 'Fuera del horizonte mostrado'
  if (scenario?.etaReason === 'max_level') return 'Nivel máximo'
  return 'Sin fecha'
}

export default function GrowthRoutePage() {
  const { id } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeScenario, setActiveScenario] = useState('base')
  const [updatingRecommendation, setUpdatingRecommendation] = useState(null)
  const [recommendationError, setRecommendationError] = useState('')

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

  const chartRows = useMemo(() => scenarioChartRows(data?.projection, { history: data?.metrics?.months, currentPeriod: data?.operational?.currentPeriod, startPeriod: data?.metrics?.window?.startPeriod }), [data])

  if (loading) return (
    <div className="shell center-core-shell">
      <Sidebar rol="usuario" centroNombre="Centro" centroId={id} />
      <main id="main-content" data-page-state="loading" className="main growth-loading"><div role="status" aria-live="polite">Calculando ruta de crecimiento...</div></main>
    </div>
  )

  if (error || !data) return (
    <div className="shell center-core-shell">
      <Sidebar rol="usuario" centroNombre="Centro" centroId={id} />
      <main id="main-content" data-page-state="error" className="main growth-page">
        <div role="alert" className="alert alert--error">{error || 'No hay datos disponibles.'}</div>
      </main>
    </div>
  )

  const { center, projection, metrics, operational, population = {}, recommendations = [] } = data
  const next = projection.nextLevel
  const confidence = confidenceMeta(metrics.confidence.level)
  const progress = growthStageProgress(projection)
  const scenario = projection.scenarios[activeScenario]
  const firstMonth = projection.scenarios.base.series[0]
  const pipelineEntries = Object.entries(operational.pipelineByMonth || {}).sort(([a], [b]) => a.localeCompare(b))


  const changeRecommendation = async (recommendationId, command) => {
    setUpdatingRecommendation(recommendationId)
    setRecommendationError('')
    try {
      const updated = await updateGrowthRecommendation(id, recommendationId, command)
      if (updated.growth) setData(updated.growth)
      else {
        setData(current => ({ ...current, recommendations: current.recommendations.map(item => String(item.id) === String(updated.id) ? { ...item, ...updated } : item) }))
        setRecommendationError(updated.refreshError || 'La decisión se guardó. Actualiza el escenario.')
      }
    } catch (cause) {
      console.error('[GrowthRoutePage recommendation]', cause)
      setRecommendationError('No se pudo actualizar la recomendación.')
    } finally {
      setUpdatingRecommendation(null)
    }
  }

  return (
    <div className="shell center-core-shell">
      <Sidebar rol="usuario" centroNombre={center.nombre} centroId={id} />
      <main id="main-content" data-page-state="ready" className="main growth-page">
        <header className="main__head growth-page__head">
          <div>
            <div className="label">Gestión · crecimiento</div>
            <h1 className="h-title">Ruta al Próximo Nivel</h1>
            <p className="h-sub">{center.nombre} · actualización {data.snapshotDate}</p>
          </div>
          <Link className="btn" href={`/centro/${id}`}>
            Volver al resumen
          </Link>
        </header>

        <section className="growth-overview" aria-labelledby="growth-overview-title">
          <div className="growth-overview__main">
            <div className="growth-overview__eyebrow">
              <span className={`pill pill--${confidence.tone}`}><span className="dot" />{confidence.label}</span>
              <span className="label">Cierre previsto · {formatGrowthPeriod(operational.currentPeriod)}</span>
            </div>
            <h2 id="growth-overview-title">
              {next ? `Nivel ${next.level}` : 'Nivel máximo'}
              <span className="num">{projection.currentChildren}{next ? ` / ${next.threshold}` : ''}</span>
            </h2>
            <div className="growth-track growth-track--large" role="progressbar" aria-label="Progreso al próximo nivel" aria-valuetext={`${Math.round(progress)}% · ${projection.currentChildren} niños`} data-tour="ruta.barra" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
              <span style={{ width: `${progress}%` }} />
            </div>
            <div className="growth-overview__scale">
              <span>Nivel {projection.currentLevel || 0}</span>
              <b>{next ? `Faltarían ${next.gap} al cierre` : 'Umbral previsto al cierre'}</b>
              <span>{next ? `Nivel ${next.level}` : 'Nivel 5'}</span>
            </div>
          </div>
          <div className="growth-overview__facts">
            <div><span className="label">Ritmo actual</span><strong>{etaLabel(projection.scenarios.base, metrics.confidence.level)}</strong></div>
            <div><span className="label">Si se cumplen las acciones</span><strong>{etaLabel(projection.scenarios.action, metrics.confidence.level)}</strong></div>
            <div><span className="label">Mínimo neto para el nivel</span><strong className="num">+{projection.requirements.netChildrenPerMonth} niños netos</strong></div>
          </div>
        </section>

        <section className="growth-population" aria-label="Población y fechas de inicio">
          <MetricLine label={`Activos al ${population.today || data.snapshotDate}`} value={population.todayChildren ?? 'Por conciliar'} detail="Según cierre anterior y movimientos fechados" />
          <MetricLine label="Inicios pendientes este mes" value={operational.remainingMonthStarts ?? 0} detail="Con fecha de inicio registrada" />
          <MetricLine label={`Cierre previsto · ${formatGrowthPeriod(operational.currentPeriod)}`} value={population.expectedMonthEndChildren ?? projection.currentChildren} detail="Incluye los movimientos programados del mes" />
        </section>

        {metrics.confidence.reasons?.length > 0 && (
          <div className={`growth-data-note growth-data-note--${confidence.tone}`}>
            <strong>{confidence.label}</strong>
            <details><summary>Ver qué falta conciliar</summary><ul>{metrics.confidence.reasons.map((reason, index) => <li key={index}>{reason}</li>)}</ul></details>
          </div>
        )}

        <section className="growth-section" aria-labelledby="projection-title" data-tour="ruta.escenarios">
          <div className="growth-section__head">
            <div>
              <div className="label">Trayectoria</div>
              <h2 id="projection-title">Escenarios de crecimiento</h2>
              <p className="growth-explanation">Base: {metrics.monthsUsed} de 6 meses cerrados · {formatGrowthPeriod(metrics.window?.startPeriod)} a {formatGrowthPeriod(metrics.window?.endPeriod)}.</p>
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
            <div><span className="label">Saldo del primer mes estimado</span><strong className="num">{scenario.monthlyNet > 0 ? '+' : ''}{decimal(scenario.monthlyNet)} niños</strong></div>
            <div><span className="label">Alcanza el umbral</span><strong>{scenario.targetMonth ? formatGrowthPeriod(scenario.targetMonth) : 'Sin fecha'}</strong></div>
            <div><span className="label">Reconocimiento trimestral</span><strong>{etaLabel(scenario, metrics.confidence.level)}</strong></div>
          </div>

          <p className="growth-explanation">Los escenarios dependen de los supuestos y no son una promesa. El cierre inmediato usa movimientos programados; los siguientes meses incorporan estimaciones.</p>
          <details className="growth-assumptions"><summary>Cómo se calcula este escenario</summary>
            <ul>{(scenario.assumptions || projection.assumptions || []).map((text, index) => <li key={index}>{text}</li>)}</ul>
            <p>{scenario.monthlyNetDefinition}</p>
          </details>
          <div className="growth-chart" aria-hidden="true">
            <MeasuredChart label="Escenarios de crecimiento" minHeight={280}>
              {({width,height}) => <LineChart width={width} height={height} data={chartRows} margin={{ top: 12, right: 12, bottom: 8, left: 0 }}>
                <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--text-dim)', fontSize: 12 }} tickLine={false} axisLine={{ stroke: 'var(--chart-axis)' }} interval="preserveStartEnd" />
                <YAxis width={42} tick={{ fill: 'var(--text-dim)', fontSize: 12 }} tickLine={false} axisLine={false} domain={[0, 'dataMax + 10']} />
                <Tooltip content={<ProjectionTooltip />} />
                <Line type="linear" dataKey="observed" name="Cierre registrado" stroke="var(--text)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                {next && <ReferenceLine y={next.threshold} stroke="var(--warn)" strokeDasharray="5 5" />}
                {Object.entries(SCENARIOS).map(([key, item]) => (
                  <Line
                    key={key}
                    type="linear"
                    dataKey={key}
                    stroke={item.color}
                    strokeWidth={activeScenario === key ? 3 : 1.5}
                    strokeOpacity={activeScenario === key ? 1 : 0.45}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>}
            </MeasuredChart>
          </div>
          <div className="sr-only"><table>
            <caption>Proyección mensual de niños por escenario</caption>
            <thead><tr><th>Mes</th><th>Cierre registrado</th><th>Escenario adverso</th><th>Ritmo actual</th><th>Plan de acción</th></tr></thead>
            <tbody>
              {chartRows.map((row) => (
                <tr key={row.period}>
                  <th>{formatGrowthPeriod(row.period)}</th>
                  <td>{row.observed ?? '—'}</td><td>{row.conservative ?? '—'}</td>
                  <td>{row.base}</td>
                  <td>{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="growth-chart-legend"><span><i style={{ background: 'var(--text)' }} />Cierre registrado</span>
            {Object.entries(SCENARIOS).map(([key, item]) => <span key={key}><i style={{ background: item.color }} />{item.label}</span>)}
            {next && <span><i className="growth-chart-legend__target" />Meta Nivel {next.level}</span>}
          </div>
        </section>

        <div className="growth-data-note">
          <strong>Precisión histórica</strong>
          <span>{metrics.precision?.sampleSize >= 6 ? `${metrics.precision.sampleSize} cierres evaluados · error medio ${metrics.precision.engineMae ?? '—'} niños` : `Aún sin muestra suficiente: ${metrics.precision?.sampleSize || 0} cierres evaluados. La calidad de los datos no equivale a precisión del pronóstico.`}</span>
        </div>
        <section className="growth-section" aria-labelledby="actions-title">
          <div className="growth-section__head">
            <div>
              <div className="label">Prioridad semanal</div>
              <h2 id="actions-title">Acciones y resultados por verificar</h2><p className="growth-explanation">El escenario del plan usa las metas de estas acciones. Posponer o descartar una acción retira su supuesto; realizarla no confirma que ya produjo el resultado.</p>
            </div>
          </div>
          {recommendationError && <div role="alert" className="alert alert--error">{recommendationError}<button type="button" className="btn" onClick={async () => {
            try { setData(await getCentroGrowth(id)); setRecommendationError('') }
            catch { setRecommendationError('No se pudo actualizar. La última decisión guardada se conserva.') }
          }}>Actualizar escenario</button></div>}
          {recommendations.length > 0 ? (
            <div className="growth-actions">
              {recommendations.map((item, index) => (
              <article className={`growth-action growth-action--${item.status || 'pending'}`} key={item.id || item.kind}>
                <div className="growth-action__top">
                  <span className="growth-action__rank num">0{index + 1}</span>
                  <div className="growth-action__badges">
                    <span className="pill">{KIND_LABELS[item.kind] || item.kind}</span>
                    {STATUS_LABELS[item.status] && (
                      <span className={`pill ${item.status === 'completed' ? 'pill--ok' : item.status === 'dismissed' ? 'pill--bad' : 'pill--warn'}`}>
                        <span className="dot" />{STATUS_LABELS[item.status]}
                      </span>
                    )}
                  </div>
                </div>
                <h3>{item.title}</h3>
                <p>{item.reason}</p>
                <div className="growth-action__metric">
                  <span>{item.metric}</span>
                  <strong className="num">{item.baseline} → {item.target} {item.unit}</strong>
                </div>
                <div className="growth-action__impact">
                  <span>Impacto si se alcanza la meta</span>
                  <strong className="num">
                    {item.impactStatus === 'blocked' ? 'Por validar' : Number(item.estimatedImpact) > 0 ? `+${decimal(item.estimatedImpact)} ${item.impactUnit || 'niños/mes'}` : 'Habilita la proyección'}
                  </strong>
                </div>
                {item.impactStatus === 'provisional' && <small className="growth-explanation">Hipótesis provisional · revisa la clasificación del embudo</small>}
                <p className="growth-action__task">{item.action}</p>
                <div className="growth-action__owner"><span>{item.responsible}</span><span>Fecha: {String(item.due_date || '').slice(0, 10) || `en ${item.dueDays} días`}</span></div>
                {item.status === 'completed' && <p className="growth-explanation">Tarea realizada · resultado todavía por verificar con los próximos datos.</p>}
                <details className="growth-assumptions"><summary>Supuesto y cálculo del impacto</summary><p>{item.assumption}</p><p>{item.formula}</p><p>{item.priorityExplanation}</p></details>
                {item.status !== 'completed' && item.status !== 'dismissed' && (
                  <div className="growth-action__commands" aria-label={`Seguimiento de ${item.title}`}>
                    <button
                      type="button"
                      className="btn btn--primary"
                      disabled={updatingRecommendation != null}
                      onClick={() => changeRecommendation(item.id, 'complete')}
                    >
                      {String(updatingRecommendation) === String(item.id) ? 'Guardando...' : 'Marcar tarea realizada'}
                    </button>
                    {item.status !== 'postponed' && (
                      <button
                        type="button"
                        className="btn"
                        disabled={updatingRecommendation != null}
                        onClick={() => changeRecommendation(item.id, 'postpone')}
                      >
                        Posponer 7 días
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn growth-action__dismiss"
                      disabled={updatingRecommendation != null}
                      onClick={() => changeRecommendation(item.id, 'dismiss')}
                    >
                      Descartar
                    </button>
                  </div>
                )}
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

        {data.recommendationHistory?.length > 0 && <details className="growth-assumptions">
          <summary>Historial de decisiones</summary>
          <ul>{data.recommendationHistory.map(item => <li key={item.id}><strong>{item.title || KIND_LABELS[item.kind]}</strong> · {STATUS_LABELS[item.status] || item.status} · {String(item.completed_at || item.due_date || item.generated_for).slice(0, 10)}</li>)}</ul>
          <p>El historial registra decisiones y ejecución; el impacto se verifica con los resultados posteriores.</p>
        </details>}
        <div className="growth-drivers">
          <section className="growth-driver" aria-labelledby="funnel-title">
            <div className="label">Clase de prueba</div>
            <h2 id="funnel-title">Embudo comercial</h2><p className="growth-explanation">Totales de los {metrics.monthsUsed} meses cerrados de la ventana.</p>
            <FlowRow label="Invitados" value={metrics.totals.invited} rate={100} />
            <FlowRow label="Asistieron" value={metrics.totals.attended} rate={metrics.rates.attendance * 100} />
            <FlowRow label="Se matricularon" value={metrics.totals.trialEnrollments} rate={metrics.rates.inviteToEnrollment * 100} tone="warn" />
            <div className="growth-driver__foot">
              <span>Invitaciones para la meta comercial</span>
              <strong className="num">{projection.requirements.commercial?.weeklyInvitations ?? 'Por estimar'} por semana</strong>
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
            <MetricLine label="Horario / mes" value={decimal(metrics.causeMedians.schedule)} /><MetricLine label="Graduados / mes" value={decimal(metrics.medians.graduates)} detail="Se reponen en el balance; no son deserción" />
          </section>

          <section className="growth-driver" aria-labelledby="capacity-title">
            <div className="label">Operación</div>
            <h2 id="capacity-title">Pipeline y capacidad</h2>
            <div className="growth-driver__headline">
              <strong className="num">{operational.capacityEstimate?.total ?? '—'}</strong>
              <span>Cupos teóricos de grupos actuales. Confirma disponibilidad por horario, nivel y docente.</span>
            </div>
            <MetricLine label={firstMonth ? formatGrowthPeriod(firstMonth.period) : 'Próximo mes'} value={`${firstMonth?.endChildren ?? projection.currentChildren} niños`} detail={`${firstMonth?.withdrawals || 0} bajas · ${firstMonth?.newActives || 0} inicios`} />
            {pipelineEntries.length > 0 ? pipelineEntries.slice(0, 3).map(([period, total]) => (
              <MetricLine key={period} label={`Inicios ${formatGrowthPeriod(period)}`} value={total} />
            )) : <MetricLine label="Inicios futuros con fecha" value="0" />}
            <MetricLine label="Inicios sin fecha" value={operational.undatedStarts || 0} /><MetricLine label="Meta comercial mensual" value={`${data.monthlySalesTarget ?? '—'} ventas`} />
          </section>
        </div>
      </main>
    </div>
  )
}
