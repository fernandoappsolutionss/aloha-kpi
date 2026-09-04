import {
  confidenceMeta,
  formatGrowthPeriod,
  growthStageProgress,
} from '../../lib/growth/presenter.mjs'

const rangeText = (data) => {
  const confidence = data?.metrics?.confidence?.level
  if (confidence === 'low') return 'Completa los datos para estimar una fecha'
  const conservative = data?.projection?.scenarios?.conservative?.recognitionQuarter
  const action = data?.projection?.scenarios?.action?.recognitionQuarter
  if (conservative && action && conservative !== action) {
    return `${formatGrowthPeriod(action)} a ${formatGrowthPeriod(conservative)}`
  }
  const estimate = action || data?.projection?.scenarios?.base?.recognitionQuarter
  return estimate ? formatGrowthPeriod(estimate) : 'Sin fecha al ritmo actual'
}

export default function GrowthSummaryBand({ data, onOpen }) {
  if (!data?.projection) return null
  const { projection, metrics, operational, recommendations = [] } = data
  const next = projection.nextLevel
  const confidence = confidenceMeta(metrics?.confidence?.level)
  const progress = growthStageProgress(projection)
  const nextMonth = projection.scenarios?.base?.series?.[0]
  const principal = recommendations[0]

  return (
    <section className="growth-band" aria-labelledby="growth-band-title">
      <div className="growth-band__top">
        <div>
          <div className="label">Ruta de crecimiento</div>
          <h2 id="growth-band-title" className="growth-band__title">
            {next ? `Ruta al Nivel ${next.level}` : 'Nivel máximo alcanzado'}
          </h2>
        </div>
        <span className={`pill pill--${confidence.tone}`}>
          <span className="dot" />{confidence.label}
        </span>
      </div>

      <div className="growth-band__body">
        <div className="growth-band__progress">
          <div className="growth-band__numberline">
            <strong className="num">{projection.currentChildren}</strong>
            <span>{next ? `de ${next.threshold} · inicio confirmado` : 'con inicio confirmado'}</span>
            {next && <b className="num">Faltan {next.gap}</b>}
          </div>
          <div className="growth-track" role="progressbar" aria-label={next ? `Avance al Nivel ${next.level}` : 'Nivel máximo alcanzado'} aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div className="growth-band__stage">
            <span>Nivel actual: {projection.currentLevel || 'sin nivel'}</span>
            <span>{progress}% de esta etapa</span>
          </div>
        </div>

        <div className="growth-band__facts">
          <div>
            <span className="label">Rango estimado</span>
            <strong>{rangeText(data)}</strong>
          </div>
          <div>
            <span className="label">Próximo mes</span>
            <strong className="num">{nextMonth?.endChildren ?? projection.currentChildren} niños</strong>
            {nextMonth && (
              <small className="num">
                {nextMonth.startChildren} - {nextMonth.withdrawals} + {nextMonth.newActives}
              </small>
            )}
          </div>
          <div>
            <span className="label">Acción principal</span>
            <strong>{principal?.title || 'Mantener el ritmo y la calidad del dato'}</strong>
            {operational?.undatedStarts > 0 && <small>{operational.undatedStarts} inicio sin fecha</small>}
          </div>
        </div>
      </div>

      <button type="button" className="btn btn--primary growth-band__button" onClick={onOpen}>
        Ver ruta completa
      </button>
    </section>
  )
}
