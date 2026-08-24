'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { getCentroNombre } from '../../../actions/centros'
import { cargarProgreso } from '../../../actions/entrenamiento'
import { MODULOS, ERRORES_GLOBALES, FAQ } from '../../../../lib/entrenamiento/modulos'
import { completado, porcentaje, siguienteModulo } from '../../../../lib/entrenamiento/progreso'

const fmtFecha = (iso) => iso ? new Date(iso).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' }) : ''

export default function EntrenamientoPage() {
  const { id } = useParams()
  const router = useRouter()
  const [nombre, setNombre] = useState('Centro')
  const [progreso, setProgreso] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!id) return
    getCentroNombre(id).then((n) => { if (n) setNombre(n) }).catch(() => {})
    // Éxito = mapa por id de módulo; { error } = fallo de la action (auth/SQL).
    cargarProgreso()
      .then((r) => { if (r?.error) setError(r.error); else setProgreso(r || {}) })
      .catch(() => setError('No se pudo cargar tu progreso. Recarga la página.'))
      .finally(() => setLoading(false))
  }, [id])

  const resumen = useMemo(() => porcentaje(progreso, MODULOS), [progreso])
  const siguiente = useMemo(() => siguienteModulo(progreso, MODULOS), [progreso])

  const estadoDe = (m) => {
    const p = progreso[m.id]
    if (completado(p)) return { k: 'ok', label: `✓ Completado · ${fmtFecha(p.quizAprobadoAt)}` }
    if (p?.tourVistoAt) return { k: 'mid', label: 'Recorrido visto · falta el quiz' }
    if (p?.quizAprobadoAt) return { k: 'mid', label: 'Quiz aprobado · falta el recorrido' }
    return { k: 'pend', label: 'Pendiente' }
  }

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={id} />
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Mi centro · Entrenamiento</div>
            <h1 className="h-title">Cómo se usa el sistema</h1>
            <p className="h-sub">{nombre} — recorridos sobre la app real, con tu meta al frente: subir de nivel</p>
          </div>
          {!error && (
            <div className="ent-progress">
              <div className="ent-ring" style={{ '--pct': resumen.pct }}><span>{resumen.completados}/{resumen.total}</span></div>
              <div>
                <div style={{ fontWeight: 600 }}>{resumen.pct}% completado</div>
                {siguiente
                  ? <button className="btn btn--primary" style={{ marginTop: 6 }} onClick={() => router.push(`/centro/${id}/entrenamiento/${siguiente}`)}>Continuar →</button>
                  : <div className="h-sub" style={{ color: 'var(--ok)' }}>Entrenamiento completo</div>}
              </div>
            </div>
          )}
        </div>

        {loading ? <div className="h-sub">Cargando…</div> : error ? (
          <div className="alert alert--error">{error}</div>
        ) : (
          <div className="ent-grid">
            {MODULOS.map((m) => {
              const e = estadoDe(m)
              return (
                <div key={m.id} className={`card ent-card ent-card--${e.k}`} onClick={() => router.push(`/centro/${id}/entrenamiento/${m.id}`)} role="button" tabIndex={0}
                  onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); router.push(`/centro/${id}/entrenamiento/${m.id}`) } }}>
                  <div className="label">Módulo {m.orden} · {m.duracionMin} min</div>
                  <h3 className="ent-card__title">{m.titulo}</h3>
                  <div className={`ent-pill ent-pill--${e.k}`}>{e.label}</div>
                </div>
              )
            })}
          </div>
        )}

        <section className="panel" style={{ marginTop: 28 }}>
          <div className="panel__head"><h3 className="panel__title">Errores que más cuestan</h3><span className="label">Síntoma → causa → cómo se arregla</span></div>
          <table className="table">
            <thead><tr><th>Lo que pasa</th><th>Por qué</th><th>Qué hacer</th><th></th></tr></thead>
            <tbody>
              {ERRORES_GLOBALES.map((e, i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 600 }}>{e.sintoma}</td><td>{e.causa}</td><td>{e.arreglo}</td>
                  <td style={{ whiteSpace: 'nowrap' }}><button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => router.push(`/centro/${id}/entrenamiento/${e.modulo}`)}>Ver módulo</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="panel" style={{ marginTop: 20 }}>
          <div className="panel__head"><h3 className="panel__title">Preguntas frecuentes</h3></div>
          <div style={{ padding: '6px 18px 14px' }}>
            {FAQ.map((f, i) => (
              <details key={i} className="ent-faq">
                <summary>{f.pregunta}</summary>
                <p>{f.respuesta} <button className="tour-card__link" onClick={() => router.push(`/centro/${id}/entrenamiento/${f.modulo}`)}>Ver en el entrenamiento</button></p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
