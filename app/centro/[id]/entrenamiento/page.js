'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '../../../../components/Sidebar'
import { getCentroNombre } from '../../../actions/centros'
import { cargarProgreso } from '../../../actions/entrenamiento'
import { MODULOS, ERRORES_GLOBALES, FAQ } from '../../../../lib/entrenamiento/modulos'
import { completado, porcentaje, siguienteModulo } from '../../../../lib/entrenamiento/progreso'

const fmtFecha = (iso) => iso ? new Date(iso).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' }) : ''

export default function EntrenamientoPage() {
  const { id } = useParams()
  const [nombre, setNombre] = useState('Centro')
  const [progreso, setProgreso] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    if (!id) return
    let activo = true
    setLoading(true)
    setError(null)
    getCentroNombre(id).then((n) => { if (activo && n) setNombre(n) }).catch(() => {})
    // Éxito = mapa por id de módulo; { error } = fallo de la action (auth/SQL).
    cargarProgreso()
      .then((r) => { if (activo) { if (r?.error) setError(r.error); else setProgreso(r || {}) } })
      .catch(() => { if (activo) setError('No se pudo cargar tu progreso. Recarga la página.') })
      .finally(() => { if (activo) setLoading(false) })
    return () => { activo = false }
  }, [id, retry])

  const resumen = useMemo(() => porcentaje(progreso, MODULOS), [progreso])
  const siguiente = useMemo(() => siguienteModulo(progreso, MODULOS), [progreso])
  const recomendado = MODULOS.find((m) => m.id === siguiente)
  const iniciado = MODULOS.some((m) => {
    const p = progreso[m.id]
    return p?.tourVistoAt || p?.quizAprobadoAt || p?.intentos > 0
  })
  const faltanPreguntas = recomendado && progreso[recomendado.id]?.tourVistoAt && !progreso[recomendado.id]?.quizAprobadoAt
  const moduloHref = (modulo) => `/centro/${id}/entrenamiento/${modulo}`

  const estadoDe = (m) => {
    const p = progreso[m.id]
    if (completado(p)) return { k: 'ok', label: `✓ Completado · ${fmtFecha(p.quizAprobadoAt)}` }
    if (p?.tourVistoAt) return { k: 'mid', label: 'Falta responder las preguntas' }
    if (p?.quizAprobadoAt) return { k: 'mid', label: 'Falta hacer el recorrido' }
    if (p?.intentos > 0) return { k: 'mid', label: 'En curso' }
    return { k: 'pend', label: 'Por comenzar' }
  }

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={id} />
      <main id="main-content" data-page-state={loading ? 'loading' : error ? 'error' : 'ready'} className="main ent-page">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Mi centro · Entrenamiento</div>
            <h1 className="h-title">Aprende a usar el sistema</h1>
            <p className="h-sub">{nombre} · Un módulo a la vez, a tu ritmo.</p>
          </div>
        </div>

        {loading ? <div className="card ent-loading" role="status">Preparando tu siguiente paso…</div> : error ? (
          <div className="alert alert--error" role="alert">{error}<button type="button" className="btn" onClick={()=>setRetry(n=>n+1)}>Reintentar</button></div>
        ) : (
          <>
            <section className="ent-start" aria-labelledby="ent-start-title">
              <div className="ent-start__main">
                <div className="label">{recomendado ? 'Tu siguiente paso' : 'Tu avance'}</div>
                <h2 id="ent-start-title">{recomendado ? (iniciado ? 'Continúa tu entrenamiento' : 'Empieza aquí') : '¡Entrenamiento completado!'}</h2>
                {recomendado ? (
                  <>
                    <p className="ent-start__module">{recomendado.orden}. {recomendado.titulo}</p>
                    <p className="ent-start__description">{faltanPreguntas
                      ? 'Ya viste el recorrido. Responde las 3 preguntas para completar este módulo.'
                      : 'Te guiamos por las pantallas y los botones del sistema. Después respondes 3 preguntas para comprobar lo aprendido.'}</p>
                    <Link className="btn btn--primary ent-start__cta" href={`${moduloHref(recomendado.id)}${faltanPreguntas ? '#quiz' : ''}`}>
                      {faltanPreguntas ? 'Responder las 3 preguntas' : iniciado ? `Continuar con el módulo ${recomendado.orden}` : 'Comenzar mi primer módulo'} <span aria-hidden="true">→</span>
                    </Link>
                    <p className="ent-start__note">Módulo {recomendado.orden} de {resumen.total} · Aproximadamente {recomendado.duracionMin} minutos</p>
                  </>
                ) : (
                  <>
                    <p className="ent-start__description">Completaste los recorridos y las preguntas de los {resumen.total} módulos. Puedes volver a cualquiera cuando lo necesites.</p>
                    <Link className="btn btn--primary ent-start__cta" href={moduloHref(MODULOS[0].id)}>Repasar el entrenamiento <span aria-hidden="true">→</span></Link>
                  </>
                )}
              </div>
              <div className="ent-start__aside">
                <div className="label">Tu progreso</div>
                <div className="ent-start__count"><strong>{resumen.completados}</strong><span>de {resumen.total} módulos<br />{' '}completados</span></div>
                <progress className="ent-start__progress" max={resumen.total} value={resumen.completados} aria-label="Módulos completados" />
                <p className="ent-start__note">Tu avance se guarda al completar cada recorrido y al enviar tus respuestas.</p>
              </div>
            </section>

            <div className="ent-how" aria-label="Cómo completar cada módulo">
              <div><span className="ent-how__number" aria-hidden="true">1</span><p><strong>Haz el recorrido guiado</strong><span>Sigue las indicaciones en la pantalla.</span></p></div>
              <div><span className="ent-how__number" aria-hidden="true">2</span><p><strong>Responde 3 preguntas</strong><span>Al acertar las 3 y terminar el recorrido, completas el módulo.</span></p></div>
            </div>

            <details className="panel ent-help ent-modules">
              <summary><span>Ver los {resumen.total} módulos</span><span className="ent-help__hint">Consultar o repasar</span></summary>
              <div className="ent-help__body">
                <p className="h-sub">Sigue el orden recomendado o abre el tema que necesitas consultar.</p>
                <ol className="ent-route">
                  {MODULOS.map((m) => {
                    const e = estadoDe(m)
                    return (
                      <li key={m.id}>
                        <Link className={`ent-route__item${m.id === siguiente ? ' ent-route__item--current' : ''}`} href={moduloHref(m.id)}>
                          <span className={`ent-route__number${e.k === 'ok' ? ' ent-route__number--done' : ''}`} aria-hidden="true">{e.k === 'ok' ? '✓' : m.orden}</span>
                          <span className="ent-route__content"><span className="label">Módulo {m.orden} · {m.duracionMin} min{m.id === siguiente ? ' · Siguiente' : ''}</span><strong>{m.titulo}</strong><span className={`ent-pill ent-pill--${e.k}`}>{e.label}</span></span>
                          <span aria-hidden="true">→</span>
                        </Link>
                      </li>
                    )
                  })}
                </ol>
              </div>
            </details>
          </>
        )}

        <div className="ent-resources">
          <h2>¿Necesitas ayuda con algo puntual?</h2>
          <details className="panel ent-help">
            <summary><span>Errores frecuentes y cómo resolverlos</span></summary>
            <div className="ent-help__body">
              {ERRORES_GLOBALES.map((e, i) => (
                <div key={i} className="ent-error">
                  <h3>{e.sintoma}</h3>
                  <p><b>Por qué pasa:</b> {e.causa}</p>
                  <p><b>Qué hacer:</b> {e.arreglo}</p>
                  <Link className="tour-card__link" href={moduloHref(e.modulo)}>Ver el módulo relacionado <span aria-hidden="true">→</span></Link>
                </div>
              ))}
            </div>
          </details>

          <details className="panel ent-help">
            <summary><span>Preguntas frecuentes</span></summary>
            <div className="ent-help__body">
              {FAQ.map((f, i) => (
                <details key={i} className="ent-faq">
                  <summary>{f.pregunta}</summary>
                  <p>{f.respuesta} <Link className="tour-card__link" href={moduloHref(f.modulo)}>Ver en el entrenamiento</Link></p>
                </details>
              ))}
            </div>
          </details>
        </div>
      </main>
    </div>
  )
}
