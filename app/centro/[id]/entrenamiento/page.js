'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '../../../../components/Sidebar'
import { getCentroNombre } from '../../../actions/centros'
import { getNavigationContext } from '../../../actions/navigation'
import { cargarProgreso } from '../../../actions/entrenamiento'
import CarrilOficio from '../../../../components/entrenamiento/CarrilOficio'
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
  // EL COACH NO OPERA EL CENTRO, así que los 9 recorridos no son para él: los
  // nueve arrancan en /ruta-nivel, /grupos, /eventos, /cuadro o /kpi
  // (lib/entrenamiento/modulos.js), y el middleware le rebota esas cinco rutas
  // de vuelta aquí. Es además la pantalla donde ATERRIZA: destino() lo manda a
  // este árbol, o sea que lo primero que veía al entrar era una barra
  // "0 de 9 recorridos" que no puede llenar nunca, con su plan real debajo.
  // El rol se pregunta al servidor, como hace el menú; no se deduce de la ruta.
  // null mientras no se sabe; 'desconocido' si el servidor no contestó. Se
  // distinguen a propósito: la pista de los recorridos NO se pinta mientras el
  // rol está en el aire (si no, al Coach le parpadea delante lo que después se
  // le quita), pero SÍ se pinta si la consulta falló — dejar a todo el mundo
  // sin los 9 recorridos por un error de red sería peor que el parpadeo.
  const [rolActor, setRolActor] = useState(null)
  const esCoach = rolActor === 'coach'
  const veRecorridos = rolActor !== null && !esCoach

  useEffect(() => {
    let activo = true
    getNavigationContext()
      .then((c) => { if (activo) setRolActor(c?.actor?.role || 'desconocido') })
      .catch(() => { if (activo) setRolActor('desconocido') })
    return () => { activo = false }
  }, [])

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
            {/* El H1 nombra la PÁGINA, no una de las dos pistas: "Aprende a usar
                el sistema" es el título de la primera y hacía creer que aquí
                solo hay tours. */}
            <div className="label" style={{ marginBottom: 10 }}>Mi centro · Entrenamiento</div>
            <h1 className="h-title">Tu entrenamiento</h1>
            <p className="h-sub">
              {/* La frase espera al rol por lo mismo que la sección de abajo:
                  prometerle al Coach "dos cosas distintas" y quitarle una es
                  peor que decir el nombre del centro medio segundo antes. */}
              {nombre}
              {veRecorridos && <> · Son dos cosas distintas: <b>usar el sistema</b> ({MODULOS.length} recorridos guiados) y <b>tu oficio</b> (los módulos de tu puesto, cada uno con su maniobra).</>}
              {esCoach && <> · Los módulos de tu puesto, cada uno con su maniobra. Los recorridos de cómo operar el sistema no son de tu puesto: tu trabajo del día lo marcas desde tu enlace de Coach.</>}
            </p>
          </div>
        </div>

        {/* Pista 1 — cómo usar el sistema (los 9 tours). Intacta: el oficio se
            SUMA debajo y, si su action falla, este carril sigue funcionando solo.
            Al Coach no se le pinta: son nueve recorridos por pantallas que su
            cuenta no abre. Los tours en sí NO se tocan. */}
        {veRecorridos && (
        <section aria-labelledby="ent-sistema-titulo">
        <h2 id="ent-sistema-titulo" className="ent-seccion__titulo">Cómo usar el sistema</h2>

        {loading ? <div className="card ent-loading" role="status">Preparando tu siguiente paso…</div> : error ? (
          <div className="alert alert--error" role="alert">{error}<button type="button" className="btn" onClick={()=>setRetry(n=>n+1)}>Reintentar</button></div>
        ) : (
          <>
            <section className="ent-start" aria-labelledby="ent-start-title">
              <div className="ent-start__main">
                {/* "¡Entrenamiento completado!" era falso: cierra la pista 1 y
                    la persona todavía tiene por delante todo su oficio, que es
                    la parte larga. Este bloque solo habla de los recorridos. */}
                <div className="label">{recomendado ? 'Tu siguiente paso' : 'Tu avance'}</div>
                <h2 id="ent-start-title">{recomendado ? (iniciado ? 'Continúa tu entrenamiento' : 'Empieza aquí') : 'Terminaste de aprender el sistema'}</h2>
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
                    <p className="ent-start__description">
                      Completaste los recorridos y las preguntas de los {resumen.total} recorridos. Eso es la mitad:
                      ahora sigue tu oficio, los módulos de tu puesto con su maniobra.
                    </p>
                    <Link className="btn btn--primary ent-start__cta" href={`/centro/${id}/entrenamiento/oficio`}>Empezar mi oficio <span aria-hidden="true">→</span></Link>
                    <p className="ent-start__note"><Link className="tour-card__link" href={moduloHref(MODULOS[0].id)}>Repasar los recorridos del sistema</Link></p>
                  </>
                )}
              </div>
              {/* "recorridos", no "módulos": en esta pantalla hay tres barras y
                  tres denominadores distintos; si las tres dicen "módulos" no se
                  sabe cuál cuenta qué. Los del oficio son los "módulos". */}
              <div className="ent-start__aside">
                <div className="label">Tu progreso en el sistema</div>
                <div className="ent-start__count"><strong>{resumen.completados}</strong><span>de {resumen.total} recorridos<br />{' '}completados</span></div>
                <progress className="ent-start__progress" max={resumen.total} value={resumen.completados} aria-label="Recorridos completados" />
                <p className="ent-start__note">Tu avance se guarda al completar cada recorrido y al enviar tus respuestas.</p>
              </div>
            </section>

            <div className="ent-how" aria-label="Cómo completar cada módulo">
              <div><span className="ent-how__number" aria-hidden="true">1</span><p><strong>Haz el recorrido guiado</strong><span>Sigue las indicaciones en la pantalla.</span></p></div>
              <div><span className="ent-how__number" aria-hidden="true">2</span><p><strong>Responde 3 preguntas</strong><span>Al acertar las 3 y terminar el recorrido, completas el módulo.</span></p></div>
            </div>

            <details className="panel ent-help ent-modules">
              <summary><span>Ver los {resumen.total} recorridos</span><span className="ent-help__hint">Consultar o repasar</span></summary>
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
        </section>
        )}

        {/* Pista 2 — el oficio del puesto. Va INMEDIATAMENTE después de la
            pista 1 y antes de los acordeones de ayuda: son 389 minutos de
            contenido contra ~60 de recorridos, no puede quedar enterrada bajo
            el pie de página de la otra pista. */}
        <CarrilOficio centroId={id} />

        {/* Los dos acordeones hablan de los 9 recorridos y enlazan a ellos
            módulo por módulo: al Coach le ofrecerían justo lo que no puede
            abrir. Sus dudas se aclaran en el glosario, dentro de su puesto. */}
        {veRecorridos && (
        <div className="ent-resources">
          <h2>¿Necesitas ayuda con algo puntual?</h2>
          <p className="h-sub" style={{ marginTop: 0 }}>Sobre cómo usar el sistema. Las dudas de tu oficio se aclaran en el glosario, dentro de tu puesto.</p>
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
        )}
      </main>
    </div>
  )
}
