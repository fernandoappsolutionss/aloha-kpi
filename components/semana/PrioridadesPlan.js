'use client'
import { useState } from 'react'
import { updateGrowthRecommendation } from '../../app/actions/growth'

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
  superseded: 'Sustituida por datos actuales',
  expired: 'Vencida',
  completed: 'Tarea realizada',
  dismissed: 'Descartada',
  postponed: 'Pospuesta 7 días',
}

const decimal = (value, digits = 1) => (Number(value) || 0).toFixed(digits)

export default function PrioridadesPlan({ centroId, recommendations = [], historial = [], puedeEscribir, onRefresh }) {
  const [updatingRecommendation, setUpdatingRecommendation] = useState(null)
  const [recommendationError, setRecommendationError] = useState('')
  const [guardadas, setGuardadas] = useState({})
  const visibles = recommendations.map(item => ({ ...item, ...guardadas[item.id] }))
  async function changeRecommendation(recommendationId, command) {
    if (!puedeEscribir) return
    setUpdatingRecommendation(recommendationId); setRecommendationError('')
    let guardado = false
    try {
      const updated = await updateGrowthRecommendation(centroId, recommendationId, command)
      guardado = true
      setGuardadas(prev => ({ ...prev, [recommendationId]: { status: updated.status, due_date: updated.due_date } }))
      await onRefresh()
      setGuardadas({})
    } catch (cause) {
      setRecommendationError(guardado ? 'La decisión se guardó. Actualiza la vista sin repetir la acción.' : cause?.message || 'No se pudo actualizar la prioridad.')
    } finally { setUpdatingRecommendation(null) }
  }
  return <div className="semana-prioridades">
        <section className="growth-section" aria-labelledby="actions-title">
          <div className="growth-section__head">
            <div>
              <div className="label">Prioridad semanal</div>
              <h2 id="actions-title">Acciones y resultados por verificar</h2><p className="growth-explanation">Revisa la prioridad, el responsable y la fecha de cada acción. Al realizarla, comprueba su resultado con los registros del sistema.</p>
            </div>
          </div>
          {!puedeEscribir && (
            <div className="alert" role="status" style={{ marginBottom: 16 }}>
              Modo consulta global: ves la ruta y las prioridades, sin marcar, posponer ni descartar acciones.
            </div>
          )}
          {recommendationError && <div role="alert" className="alert alert--error">{recommendationError}<button type="button" className="btn" onClick={async () => {
            try { await onRefresh(); setGuardadas({}); setRecommendationError('') }
            catch { setRecommendationError('No se pudo actualizar. La última decisión guardada se conserva.') }
          }}>Actualizar resultados</button></div>}
          {visibles.length > 0 ? (
            <div className="growth-actions">
              {visibles.map((item, index) => (
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
                {puedeEscribir && item.status !== 'completed' && item.status !== 'dismissed' && (
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
              <strong>No hay prioridades pendientes</strong>
              <span>Mantén el seguimiento de retención, capacidad y calidad del dato.</span>
            </div>
          )}
        </section>

        {historial?.length > 0 && <details className="growth-assumptions">
          <summary>Historial de decisiones</summary>
          <ul>{historial.map(item => <li key={item.id}><strong>{item.title || KIND_LABELS[item.kind]}</strong> · {STATUS_LABELS[item.status] || item.status} · {String(item.completed_at || item.due_date || item.generated_for).slice(0, 10)}</li>)}</ul>
          <p>El historial registra decisiones y ejecución; el impacto se verifica con los resultados posteriores.</p>
        </details>}
  </div>
}
