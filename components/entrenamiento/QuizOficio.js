'use client'
// Quiz del oficio: N preguntas (4 a 10) con umbral variable, reintento
// ilimitado. Recibe TODO por props — no importa el catálogo ni el glosario, así
// la prosa de los 40 módulos no entra al bundle del navegador.
//
// Nunca dice "módulo completado": aprobar el cuestionario es haberlo ESTUDIADO.
// El hat lo cierra el Oficial de Entrenamiento cuando firma el drill.
import { useState } from 'react'
import Link from 'next/link'
import { responderQuizOficio } from '../../app/actions/entrenamiento-oficio'

export default function QuizOficio({ moduloId, preguntas, minimo, yaAprobado, tieneDrill, hrefGlosario, bloqueado, motivoBloqueo }) {
  const total = preguntas.length
  const [sel, setSel] = useState(() => preguntas.map(() => null))
  const [resultado, setResultado] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const respondidas = sel.filter((v) => v !== null).length
  const corregido = Boolean(resultado && !resultado.error)

  async function corregir() {
    if (enviando || sel.some((v) => v === null)) return
    setEnviando(true)
    try {
      const r = await responderQuizOficio(moduloId, sel)
      if (r?.error) { setResultado({ error: r.error }); return }
      setResultado(r)
    } catch {
      setResultado({ error: 'No se pudo corregir. Recarga la página e intenta de nuevo.' })
    } finally { setEnviando(false) }
  }
  const reintentar = () => { setSel(preguntas.map(() => null)); setResultado(null) }

  return (
    <section id="quiz" className="card ent-module-card" aria-labelledby="quiz-oficio-titulo" tabIndex={-1} style={{ scrollMarginTop: 24 }}>
      <div className="label" style={{ marginBottom: 6 }}>Comprueba que lo estudiaste</div>
      <h2 id="quiz-oficio-titulo" style={{ fontSize: 20, margin: '0 0 8px' }}>Responde {total} preguntas</h2>
      <p className="h-sub" style={{ marginTop: 0 }}>
        Necesitas {minimo} de {total} correctas. Puedes volver a intentarlo cuantas veces quieras: aquí no se reprueba, se vuelve a estudiar.
      </p>

      {bloqueado ? (
        <div className="alert alert--warn" role="note">{motivoBloqueo || 'Antes de responder este módulo tienes que estudiar el anterior.'}</div>
      ) : (
        <>
          {yaAprobado && !corregido && <p className="ent-pill ent-pill--ok">✓ Ya lo estudiaste. Puedes repasar las preguntas si quieres.</p>}

          {preguntas.map((q, qi) => {
            const marcada = corregido ? resultado.correctas[qi] : null
            return (
              <div key={qi} className={`ent-q${marcada === true ? ' ent-q--ok' : marcada === false ? ' ent-q--bad' : ''}`} role="radiogroup" aria-labelledby={`ofi-p-${qi}`}>
                <h3 id={`ofi-p-${qi}`} className="ent-q__text" style={{ fontSize: 15, marginTop: 0 }}>{qi + 1}. {q.pregunta}</h3>
                {q.opciones.map((op, oi) => (
                  <label key={oi} className="ent-opt">
                    <input type="radio" name={`ofi-q${qi}`} checked={sel[qi] === oi} disabled={enviando || corregido}
                      onChange={() => setSel((s) => { const n = [...s]; n[qi] = oi; return n })} />
                    <span>{op}</span>
                  </label>
                ))}
                {marcada === false && (
                  <div className="ent-q__expl">
                    ✗ {resultado.explicaciones[qi]}
                    {/* `repasa` llega como [{slug, termino}]: se muestra el término
                        legible y cada uno enlaza su ancla dentro del glosario. */}
                    {resultado.repasa?.[qi]?.length > 0 && hrefGlosario && (
                      <> {' '}Repasa: {resultado.repasa[qi].map((r, ri) => (
                        <span key={r.slug}>
                          {ri > 0 && ', '}
                          <Link className="tour-card__link" href={`${hrefGlosario}#t-${r.slug}`}>{r.termino}</Link>
                        </span>
                      ))}</>
                    )}
                  </div>
                )}
                {marcada === true && <div className="ent-q__expl ent-q__expl--ok">✓ Correcto</div>}
              </div>
            )
          })}

          {resultado?.error && <div className="alert alert--error" role="alert">{resultado.error}</div>}

          <div aria-live="polite" style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {!corregido ? (
              <>
                <button className="btn btn--primary" onClick={corregir} disabled={enviando || respondidas < total}>
                  {enviando ? 'Comprobando…' : 'Comprobar respuestas'}
                </button>
                <span className="h-sub" style={{ margin: 0 }}>{respondidas} de {total} respondidas</span>
              </>
            ) : resultado.aprobado ? (
              <>
                <div className="ent-pill ent-pill--ok">✓ {resultado.puntaje} de {total} · Estudiado</div>
                <span className="h-sub" style={{ margin: 0 }}>
                  {tieneDrill ? 'Falta que tu Oficial de Entrenamiento te tome el drill y lo firme.' : 'Este módulo no lleva drill: con esto queda cerrado.'}
                </span>
              </>
            ) : (
              <>
                <div className="ent-pill ent-pill--bad">{resultado.puntaje} de {total} · faltan {minimo - resultado.puntaje} para el mínimo</div>
                <span className="h-sub" style={{ margin: 0 }}>Lee las explicaciones, aclara las palabras y vuelve a intentarlo.</span>
                <button className="btn btn--primary" onClick={reintentar}>Intentar de nuevo</button>
              </>
            )}
          </div>
        </>
      )}
    </section>
  )
}
