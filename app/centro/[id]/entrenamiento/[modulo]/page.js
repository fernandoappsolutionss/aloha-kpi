'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../../components/Sidebar'
import Link from 'next/link'
import { getCentroNombre } from '../../../../actions/centros'
import { cargarProgreso, responderQuiz } from '../../../../actions/entrenamiento'
import { MODULOS } from '../../../../../lib/entrenamiento/modulos'
import { completado } from '../../../../../lib/entrenamiento/progreso'
import manifest from '../../../../../lib/entrenamiento/audio-manifest.json'

export default function ModuloPage() {
  const { id, modulo: moduloId } = useParams()
  // Next puede conservar la página al navegar entre módulos. La clave reinicia
  // respuestas, resultados y peticiones de progreso para cada módulo y centro.
  return <ContenidoModulo key={`${id}/${moduloId}`} id={id} moduloId={moduloId} />
}

function ContenidoModulo({ id, moduloId }) {
  const modulo = useMemo(() => MODULOS.find((m) => m.id === moduloId), [moduloId])
  const idx = MODULOS.findIndex((m) => m.id === moduloId)
  const siguiente = MODULOS[idx + 1] || null
  const [nombre, setNombre] = useState('Centro')
  const [progreso, setProgreso] = useState(null)
  const [cargandoProgreso, setCargandoProgreso] = useState(true)
  const [errorProgreso, setErrorProgreso] = useState('')
  const [recargaProgreso, setRecargaProgreso] = useState(0)
  const [sel, setSel] = useState([null, null, null])
  const [resultado, setResultado] = useState(null) // { puntaje, correctas, explicaciones, aprobado }
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!id) return
    let activo = true
    getCentroNombre(id).then((n) => { if (activo && n) setNombre(n) }).catch(() => {})
    return () => { activo = false }
  }, [id])

  useEffect(() => {
    let activo = true
    setCargandoProgreso(true)
    setErrorProgreso('')
    cargarProgreso().then((p) => {
      if (!activo) return
      if (!p || p.error) {
        setErrorProgreso('No pudimos cargar tu progreso. Puedes seguir con el recorrido o las preguntas.')
        return
      }
      setProgreso(p)
    }).catch(() => {
      if (activo) setErrorProgreso('No pudimos cargar tu progreso. Puedes seguir con el recorrido o las preguntas.')
    }).finally(() => { if (activo) setCargandoProgreso(false) })
    return () => { activo = false }
  }, [recargaProgreso])

  if (!modulo) return <div className="shell"><Sidebar rol="usuario" centroNombre={nombre} centroId={id} /><main id="main-content" data-page-state="error" className="main ent-page"><Link className="tour-card__link" href={`/centro/${id}/entrenamiento`}>← Volver a Entrenamiento</Link><div role="alert" className="alert alert--error">Este módulo no existe.</div></main></div>

  const progresoConocido = progreso !== null
  const p = progreso?.[modulo.id]
  const tourVisto = Boolean(p?.tourVistoAt)
  const quizAprobado = Boolean(p?.quizAprobadoAt || resultado?.aprobado)
  // Una corrección exitosa ya está guardada en el servidor, aunque falle la
  // lectura posterior. El recorrido sigue siendo obligatorio para completar.
  const listo = completado(p) || (tourVisto && quizAprobado)
  const clipIntro = manifest[`${modulo.id}/intro`]
  const respondidas = sel.filter((v) => v !== null).length
  const estadoDesconocido = cargandoProgreso ? 'Consultando…' : 'Sin confirmar'
  const continuarHref = siguiente ? `/centro/${id}/entrenamiento/${siguiente.id}` : `/centro/${id}/entrenamiento`
  const iniciarHref = `${modulo.inicio.ruta.replace('{id}', String(id))}?tour=${modulo.id}&paso=1`

  async function corregir() {
    if (enviando || sel.some((v) => v === null)) return
    setEnviando(true)
    try {
      const r = await responderQuiz(modulo.id, sel)
      if (r?.error) { setResultado({ error: r.error }); return }
      setResultado(r)
      setRecargaProgreso((n) => n + 1)
    } catch {
      setResultado({ error: 'No se pudo corregir. Recarga la página e intenta de nuevo.' })
      return
    } finally { setEnviando(false) }
  }
  const reintentar = () => { setSel([null, null, null]); setResultado(null) }

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={id} />
      <main id="main-content" data-page-state={cargandoProgreso ? 'loading' : errorProgreso ? 'error' : 'ready'} className="main ent-page">
        <div className="main__head"><div>
          <Link className="tour-card__link" href={`/centro/${id}/entrenamiento`}>← Volver a Entrenamiento</Link>
          <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Módulo {modulo.orden} de {MODULOS.length} · {modulo.duracionMin} min</div>
          <h1 className="h-title">{modulo.titulo}</h1>
          {listo && <div className="ent-pill ent-pill--ok" style={{ display: 'inline-block', marginTop: 6 }}>✓ Completado</div>}
        </div></div>

        <section className="card ent-module-card" aria-labelledby="pasos-titulo">
          <h2 id="pasos-titulo" style={{ fontSize: 20, margin: '0 0 10px' }}>Completa este módulo en 2 pasos</h2>
          <ol className="ent-module-steps" aria-label="Pasos del módulo">
            <li className={`ent-module-step${tourVisto ? ' ent-module-step--done' : progresoConocido ? ' ent-module-step--current' : ''}`} aria-current={progresoConocido && !tourVisto ? 'step' : undefined}>
              <span className="ent-module-step__number" aria-hidden="true">{tourVisto ? '✓' : '1'}</span>
              <div><strong>Haz el recorrido guiado</strong><p className="h-sub" style={{ margin: '4px 0 0' }}>{tourVisto ? 'Completado' : progresoConocido ? 'Paso actual · conoce dónde hacer cada tarea' : estadoDesconocido}</p></div>
            </li>
            <li className={`ent-module-step${quizAprobado ? ' ent-module-step--done' : tourVisto ? ' ent-module-step--current' : ''}`} aria-current={tourVisto && !quizAprobado ? 'step' : undefined}>
              <span className="ent-module-step__number" aria-hidden="true">{quizAprobado ? '✓' : '2'}</span>
              <div><strong>Responde 3 preguntas</strong><p className="h-sub" style={{ margin: '4px 0 0' }}>{quizAprobado ? 'Completado · 3 de 3 correctas' : tourVisto ? 'Paso actual · comprueba lo aprendido' : progresoConocido ? 'Pendiente · puedes responderlas cuando quieras' : estadoDesconocido}</p></div>
            </li>
          </ol>
          {errorProgreso && <div className="alert alert--error" role="alert">
            <p style={{ margin: '0 0 8px' }}>{errorProgreso}</p>
            <button type="button" className="btn" onClick={() => setRecargaProgreso((n) => n + 1)} disabled={cargandoProgreso}>Reintentar cargar progreso</button>
          </div>}
          <div className="ent-module-action">
            {!progresoConocido && cargandoProgreso ? <p className="h-sub" role="status" style={{ margin: 0 }}>Cargando tu progreso…</p> : listo ? (
              <Link className="btn btn--primary" href={continuarHref}>{siguiente ? `Siguiente módulo: ${siguiente.titulo} →` : 'Volver a Entrenamiento'}</Link>
            ) : tourVisto ? (
              <a className="btn btn--primary" href="#quiz">Ir a las 3 preguntas →</a>
            ) : (
              <Link className="btn btn--primary" href={iniciarHref}>{progresoConocido ? 'Iniciar recorrido →' : 'Abrir recorrido →'}</Link>
            )}
            {tourVisto && <Link className="btn" href={iniciarHref}>Repetir recorrido</Link>}
          </div>
          <div className="ent-module-intro">
            <p>{modulo.intro.texto}</p>
            {clipIntro && <details>
              <summary>Escuchar explicación (opcional)</summary>
              <audio controls preload="none" aria-label={`Explicación de ${modulo.titulo}`} src={`/entrenamiento/${clipIntro.file}`} style={{ marginTop: 12, width: '100%' }} />
            </details>}
          </div>
        </section>

        <section id="quiz" className="card ent-module-card" aria-labelledby="quiz-titulo" tabIndex={-1} style={{ scrollMarginTop: 24 }}>
          <div className="label" style={{ marginBottom: 6 }}>Paso 2</div>
          <h2 id="quiz-titulo" style={{ fontSize: 20, margin: '0 0 8px' }}>Responde 3 preguntas</h2>
          <p className="h-sub" style={{ marginTop: 0 }}>Necesitas 3 respuestas correctas. Puedes volver a intentarlo cuantas veces quieras. El módulo se completa con el recorrido visto y las preguntas aprobadas.</p>
          {quizAprobado && !resultado && <p className="ent-pill ent-pill--ok">✓ Ya aprobaste estas preguntas. Puedes repasarlas si quieres.</p>}
          {modulo.quiz.map((q, qi) => {
            const marcada = resultado && !resultado.error ? resultado.correctas[qi] : null
            return (
              <div key={qi} className={`ent-q${marcada === true ? ' ent-q--ok' : marcada === false ? ' ent-q--bad' : ''}`} role="radiogroup" aria-labelledby={`pregunta-${qi}`} aria-describedby={marcada !== null ? `explicacion-${qi}` : undefined}>
                <h3 id={`pregunta-${qi}`} className="ent-q__text" style={{ fontSize: 15, marginTop: 0 }}>{qi + 1}. {q.pregunta}</h3>
                {q.opciones.map((op, oi) => (
                  <label key={oi} className="ent-opt">
                    <input type="radio" name={`q${qi}`} checked={sel[qi] === oi} disabled={enviando || Boolean(resultado && !resultado.error)}
                      onChange={() => setSel((s) => { const n = [...s]; n[qi] = oi; return n })} />
                    <span>{op}</span>
                  </label>
                ))}
                {marcada === false && <div id={`explicacion-${qi}`} className="ent-q__expl">✗ {resultado.explicaciones[qi]}</div>}
                {marcada === true && <div id={`explicacion-${qi}`} className="ent-q__expl ent-q__expl--ok">✓ Correcto</div>}
              </div>
            )
          })}
          {resultado?.error && <div className="alert alert--error" role="alert">{resultado.error}</div>}
          <div aria-live="polite" style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {!resultado || resultado.error ? (
              <>
                <button type="button" className="btn btn--primary" onClick={corregir} disabled={enviando || respondidas < modulo.quiz.length}>{enviando ? 'Comprobando…' : 'Comprobar respuestas'}</button>
                <span className="h-sub" style={{ margin: 0 }}>{respondidas} de 3 respondidas</span>
              </>
            ) : resultado.aprobado ? (
              <>
                <div className="ent-pill ent-pill--ok">✓ 3 de 3 · {listo ? 'Módulo completado' : 'Preguntas aprobadas'}</div>
                {listo ? <Link className="btn btn--primary" href={continuarHref}>{siguiente ? `Siguiente módulo: ${siguiente.titulo} →` : 'Volver a Entrenamiento'}</Link> : progresoConocido ? (
                  <><span className="h-sub" style={{ margin: 0 }}>Solo falta completar el recorrido.</span><Link className="btn btn--primary" href={iniciarHref}>Iniciar recorrido →</Link></>
                ) : <span className="h-sub" style={{ margin: 0 }}>{cargandoProgreso ? 'Comprobando el estado del recorrido…' : 'Falta confirmar el estado del recorrido. Reintenta cargar tu progreso arriba.'}</span>}
              </>
            ) : (
              <>
                <div className="ent-pill ent-pill--bad">{resultado.puntaje} de 3 · lee las explicaciones y vuelve a intentar</div>
                <button type="button" className="btn btn--primary" onClick={reintentar}>Intentar de nuevo</button>
                <Link className="btn" href={iniciarHref}>Repetir recorrido</Link>
              </>
            )}
          </div>
        </section>

        {modulo.errores.length > 0 && (
          <details className="card ent-help">
            <summary>¿Algo no salió como esperabas? Revisa los errores típicos</summary>
            <div className="ent-help__body">
              {modulo.errores.map((e, i) => (
                <div key={i} className="ent-error">
                  <div style={{ fontWeight: 600 }}>{e.sintoma}</div>
                  <div className="h-sub" style={{ margin: '2px 0 0' }}><b>Por qué:</b> {e.causa} · <b>Qué hacer:</b> {e.arreglo}</div>
                </div>
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  )
}
