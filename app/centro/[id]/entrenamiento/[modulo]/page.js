'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '../../../../../components/Sidebar'
import { getCentroNombre } from '../../../../actions/centros'
import { cargarProgreso, responderQuiz } from '../../../../actions/entrenamiento'
import { MODULOS } from '../../../../../lib/entrenamiento/modulos'
import { completado } from '../../../../../lib/entrenamiento/progreso'
import manifest from '../../../../../lib/entrenamiento/audio-manifest.json'

export default function ModuloPage() {
  const { id, modulo: moduloId } = useParams()
  const router = useRouter()
  const modulo = useMemo(() => MODULOS.find((m) => m.id === moduloId), [moduloId])
  const idx = MODULOS.findIndex((m) => m.id === moduloId)
  const siguiente = MODULOS[idx + 1] || null
  const [nombre, setNombre] = useState('Centro')
  const [progreso, setProgreso] = useState({})
  const [sel, setSel] = useState([null, null, null])
  const [resultado, setResultado] = useState(null) // { puntaje, correctas, explicaciones, aprobado }
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    if (!id) return
    getCentroNombre(id).then((n) => { if (n) setNombre(n) }).catch(() => {})
    // { error } se ignora aquí: el quiz funciona igual sin el progreso previo.
    cargarProgreso().then((p) => { if (p && !p.error) setProgreso(p) }).catch(() => {})
  }, [id])

  if (!modulo) return <div className="shell"><Sidebar rol="usuario" centroNombre={nombre} centroId={id} /><main className="main"><div className="alert alert--error">Este módulo no existe.</div></main></div>

  const p = progreso[modulo.id]
  const tourVisto = Boolean(p?.tourVistoAt)
  const listo = completado(p)
  const clipIntro = manifest[`${modulo.id}/intro`]

  const iniciar = () => router.push(`${modulo.inicio.ruta.replace('{id}', String(id))}?tour=${modulo.id}&paso=1`)

  async function corregir() {
    if (sel.some((v) => v === null)) return
    setEnviando(true)
    try {
      const r = await responderQuiz(modulo.id, sel)
      if (r?.error) { setResultado({ error: r.error }); return }
      setResultado(r)
    } catch {
      setResultado({ error: 'No se pudo corregir. Recarga la página e intenta de nuevo.' })
      return
    } finally { setEnviando(false) }
    // El quiz ya quedó corregido: si el refresco del progreso falla, no es un
    // error de corrección — se ignora y el resultado en pantalla manda.
    const np = await cargarProgreso().catch(() => null)
    if (np && !np.error) setProgreso(np)
  }
  const reintentar = () => { setSel([null, null, null]); setResultado(null) }

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={id} />
      <main className="main">
        <div className="main__head"><div>
          <button className="tour-card__link" onClick={() => router.push(`/centro/${id}/entrenamiento`)}>← Todos los módulos</button>
          <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Módulo {modulo.orden} de {MODULOS.length} · {modulo.duracionMin} min</div>
          <h1 className="h-title">{modulo.titulo}</h1>
          {listo && <div className="ent-pill ent-pill--ok" style={{ display: 'inline-block', marginTop: 6 }}>✓ Completado</div>}
        </div></div>

        <div className="card" style={{ padding: 20, marginBottom: 18 }}>
          <div className="label" style={{ marginBottom: 8 }}>Por qué importa</div>
          <p style={{ fontSize: 15, lineHeight: 1.7, margin: 0 }}>{modulo.intro.texto}</p>
          {clipIntro && <audio controls preload="none" src={`/entrenamiento/${clipIntro.file}`} style={{ marginTop: 12, width: '100%' }} />}
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" onClick={iniciar}>{tourVisto ? 'Repetir recorrido' : 'Iniciar recorrido →'}</button>
            {tourVisto && <span className="h-sub" style={{ margin: 0, alignSelf: 'center' }}>Recorrido visto. {listo ? 'Quiz aprobado.' : 'Te falta el quiz de abajo.'}</span>}
          </div>
        </div>

        {modulo.errores.length > 0 && (
          <div className="card" style={{ padding: 20, marginBottom: 18 }}>
            <div className="label" style={{ marginBottom: 10 }}>Errores típicos de este módulo</div>
            {modulo.errores.map((e, i) => (
              <div key={i} className="ent-error">
                <div style={{ fontWeight: 600 }}>{e.sintoma}</div>
                <div className="h-sub" style={{ margin: '2px 0 0' }}><b>Por qué:</b> {e.causa} · <b>Qué hacer:</b> {e.arreglo}</div>
              </div>
            ))}
          </div>
        )}

        <div id="quiz" className="card" style={{ padding: 20 }}>
          <div className="label" style={{ marginBottom: 4 }}>Quiz · necesitas 3 de 3</div>
          <p className="h-sub" style={{ marginTop: 0 }}>{tourVisto ? 'Demuestra que lo entendiste.' : 'Puedes responderlo ya, pero el módulo solo queda completo con el recorrido visto y el quiz aprobado.'}</p>
          {modulo.quiz.map((q, qi) => {
            const marcada = resultado && !resultado.error ? resultado.correctas[qi] : null
            return (
              <div key={qi} className={`ent-q${marcada === true ? ' ent-q--ok' : marcada === false ? ' ent-q--bad' : ''}`}>
                <div className="ent-q__text">{qi + 1}. {q.pregunta}</div>
                {q.opciones.map((op, oi) => (
                  <label key={oi} className="ent-opt">
                    <input type="radio" name={`q${qi}`} checked={sel[qi] === oi} disabled={Boolean(resultado && !resultado.error)}
                      onChange={() => setSel((s) => { const n = [...s]; n[qi] = oi; return n })} />
                    <span>{op}</span>
                  </label>
                ))}
                {marcada === false && <div className="ent-q__expl">✗ {resultado.explicaciones[qi]}</div>}
                {marcada === true && <div className="ent-q__expl ent-q__expl--ok">✓ Correcto</div>}
              </div>
            )
          })}
          {resultado?.error && <div className="alert alert--error">{resultado.error}</div>}
          <div aria-live="polite" style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {!resultado || resultado.error ? (
              <button className="btn btn--primary" onClick={corregir} disabled={enviando || sel.some((v) => v === null)}>{enviando ? 'Corrigiendo…' : 'Corregir'}</button>
            ) : resultado.aprobado ? (
              <>
                <div className="ent-pill ent-pill--ok">✓ 3 de 3 · {listo ? 'Módulo completado' : 'Quiz aprobado — te falta ver el recorrido'}</div>
                {siguiente && <button className="btn btn--primary" onClick={() => router.push(`/centro/${id}/entrenamiento/${siguiente.id}`)}>Siguiente módulo: {siguiente.titulo} →</button>}
                {!siguiente && <button className="btn" onClick={() => router.push(`/centro/${id}/entrenamiento`)}>Volver al índice</button>}
              </>
            ) : (
              <>
                <div className="ent-pill ent-pill--bad">{resultado.puntaje} de 3 · lee las explicaciones y vuelve a intentar</div>
                <button className="btn btn--primary" onClick={reintentar}>Intentar de nuevo</button>
                <button className="btn" onClick={iniciar}>Repetir recorrido</button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
