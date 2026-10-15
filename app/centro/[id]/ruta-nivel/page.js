'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import TrabajoSemanal from '../../../../components/semana/TrabajoSemanal'
import GuiaRutaPlan from '../../../../components/semana/GuiaRutaPlan'
import { getSemanaCentro } from '../../../actions/semana'
import { getCentroGrowth } from '../../../actions/growth'
import {
  confidenceMeta,
  formatGrowthPeriod,
  growthStageProgress,
} from '../../../../lib/growth/presenter.mjs'

const pct = (value) => `${Math.round((Number(value) || 0) * 100)}%`
const decimal = (value, digits = 1) => (Number(value) || 0).toFixed(digits)

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
  const [semana, setSemana] = useState(null)
  const [errorSemana, setErrorSemana] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setData(null)
    setSemana(null)
    setErrorSemana('')
    getCentroGrowth(id)
      .then(async (result) => {
        if (!alive) return
        setData(result)
        try { const weekly = await getSemanaCentro(id); if (alive) { setSemana(weekly); setErrorSemana('') } }
        catch { if (alive) setErrorSemana('No se pudo cargar el plan semanal. Reintenta para trabajar las cuotas y la condición.') }
      })
      .catch((cause) => {
        console.error('[GrowthRoutePage]', cause)
        if (alive) setError('No se pudo calcular la ruta de crecimiento.')
      })
      .finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id])

  async function refrescarPlan() {
    const growth = await getCentroGrowth(id)
    setData(growth)
    setSemana(await getSemanaCentro(id))
    setErrorSemana('')
  }


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

  const { center, projection, metrics, operational, population = {} } = data
  const next = projection.nextLevel
  const confidence = confidenceMeta(metrics.confidence.level)
  const progress = growthStageProgress(projection)
  const firstMonth = projection.scenarios.base.series[0]
  const pipelineEntries = Object.entries(operational.pipelineByMonth || {}).sort(([a], [b]) => a.localeCompare(b))


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
          <a className="btn btn--primary" href="#trabajo-semanal">Preparar mes y plan de batalla</a>
        </header>

        <GuiaRutaPlan centroId={id} />
        <nav aria-label="Recorrido de la ruta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}><a className="btn" href="#growth-overview-title">Progreso al nivel</a><a className="btn" href="#resultados-mes">Resultados del mes</a><a className="btn" href="#trabajo-semanal">Estadísticas semanales</a><a className="btn" href="#plan-batalla">Plan de batalla</a></nav>
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

        {errorSemana && <p className="alert alert--error" role="alert">{errorSemana} <button className="btn" onClick={() => refrescarPlan().catch(() => setErrorSemana('No se pudo cargar el plan. Intenta nuevamente.'))}>Reintentar plan</button></p>}
        {semana && <TrabajoSemanal centroId={id} datos={semana} siguienteNivel={next} growth={data} onRefresh={refrescarPlan} />}
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
