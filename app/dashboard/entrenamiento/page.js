'use client'
import { useEffect, useState } from 'react'
import Sidebar from '../../../components/Sidebar'
import TableScroller from '../../../components/TableScroller'
import { matrizProgreso, reiniciarProgreso } from '../../actions/entrenamiento'
import { listCentros } from '../../actions/centros'
import { completado } from '../../../lib/entrenamiento/progreso'

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit' }) : ''

export default function EntrenamientoAdminPage() {
  const [data, setData] = useState(null)
  const [centros, setCentros] = useState([])
  const [centroId, setCentroId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [recarga, setRecarga] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    Promise.all([listCentros(), matrizProgreso(centroId ? Number(centroId) : null)])
      .then(([centers, d]) => {
        if (!active) return
        setCentros(centers || [])
        if (d?.error) { setError(d.error); setData(null) } else setData(d)
      })
      .catch(() => { if (active) { setError('No se pudo cargar el progreso. Recarga la página.'); setData(null) } })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [centroId, recarga])

  async function reiniciar(u) {
    const ok = window.confirm(`¿Borrar todo el progreso de ${u.nombre}?\n\nVuelve a 0 de ${data.modulos.length} módulos. Úsalo cuando entra una administradora nueva que usa el mismo correo del centro.`)
    if (!ok) return
    const r = await reiniciarProgreso(u.id)
    if (r?.error) { setError(r.error); return }
    setRecarga((n) => n + 1)
  }

  return (
    <div className="shell">
      <Sidebar rol="admin_general" />
      <main id="main-content" data-page-state={loading ? 'loading' : error || !data ? 'error' : 'ready'} className="main comparisons-page training-admin-page">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Gerencia · Entrenamiento</div>
            <h1 className="h-title">Quién completó el entrenamiento</h1>
            <p className="h-sub">Por usuario y módulo. ✓ = recorrido visto y quiz 3/3 · <span style={{ color: 'var(--warn)' }}>tour</span> = vio el recorrido, falta el quiz · <span style={{ color: 'var(--warn)' }}>quiz</span> = aprobó sin ver el recorrido</p>
          </div>
          <label className="training-filter" htmlFor="training-center">Filtrar por centro
          <select id="training-center" name="centro" autoComplete="off" className="input" value={centroId} onChange={(e) => setCentroId(e.target.value)}>
            <option value="">Todos los centros</option>
            {centros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          </label>
        </div>
        {loading ? <div role="status" className="h-sub">Cargando…</div> : error || !data ? (
          <div role="alert" className="alert alert--error">{error || 'No se pudo cargar el progreso. Recarga la página.'}</div>
        ) : (
          <div className="panel">
            <TableScroller label="Progreso de entrenamiento" stickyFirstColumn>
            <table className="table training-admin-table">
              <caption className="sr-only">Progreso por usuario y módulo de entrenamiento</caption>
              <thead>
                <tr>
                  <th>Usuario</th><th>Centro</th>
                  {data.modulos.map((m, i) => <th key={m.id} aria-label={`Módulo ${i + 1}: ${m.titulo}`} title={m.titulo} style={{ textAlign: 'center' }}>{i + 1}</th>)}
                  <th aria-label="Porcentaje completado" style={{ textAlign: 'right' }}>%</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {data.usuarios.length === 0 && <tr><td colSpan={data.modulos.length + 4} style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)' }}>Sin usuarios administradora.</td></tr>}
                {data.usuarios.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.nombre}</b><div className="h-sub" style={{ margin: 0 }}>{u.email}</div></td>
                    <td>{u.centro}</td>
                    {data.modulos.map((m) => {
                      const p = u.progreso[m.id]
                      if (completado(p)) return <td key={m.id} style={{ textAlign: 'center', color: 'var(--ok)' }} title={`Quiz aprobado ${fmt(p.quizAprobadoAt)} · ${p.intentos} intento(s)`}>✓ {fmt(p.quizAprobadoAt)}</td>
                      if (p?.tourVistoAt) return <td key={m.id} style={{ textAlign: 'center', color: 'var(--warn)' }} title={`Tour visto ${fmt(p.tourVistoAt)} · ${p.intentos} intento(s) de quiz`}>tour</td>
                      if (p?.quizAprobadoAt) return <td key={m.id} style={{ textAlign: 'center', color: 'var(--warn)' }} title={`Quiz 3/3 ${fmt(p.quizAprobadoAt)} · falta el recorrido`}>quiz</td>
                      return <td key={m.id} style={{ textAlign: 'center', color: 'var(--text-faint)' }}>—</td>
                    })}
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: u.pct === 100 ? 'var(--ok)' : 'var(--text)' }}>{u.pct}%</td>
                    <td style={{ textAlign: 'right' }}>
                      {Object.keys(u.progreso).length > 0 && (
                        <button type="button" className="btn btn--compact" aria-label={`Reiniciar progreso de ${u.nombre}`} onClick={() => reiniciar(u)} title="Borra el progreso y vuelve a 0. Para cuando entra una administradora nueva con el mismo correo.">
                          Reiniciar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </TableScroller>
            <div style={{ padding: '10px 16px', color: 'var(--text-dim)', fontSize: 12 }}>
              Módulos: {data.modulos.map((m, i) => `${i + 1} ${m.titulo}`).join(' · ')}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
