'use client'
import { useEffect, useState } from 'react'
import Sidebar from '../../../components/Sidebar'
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

  useEffect(() => { listCentros().then((c) => setCentros(c || [])).catch(() => {}) }, [])
  useEffect(() => {
    setLoading(true)
    setError(null)
    matrizProgreso(centroId ? Number(centroId) : null)
      .then((d) => { if (d?.error) { setError(d.error); setData(null) } else setData(d) })
      .catch(() => { setError('No se pudo cargar el progreso. Recarga la página.'); setData(null) })
      .finally(() => setLoading(false))
  }, [centroId, recarga])

  async function reiniciar(u) {
    const ok = window.confirm(`¿Borrar el progreso de ${u.nombre} en esta pantalla?\n\nVuelve a 0 de ${data.modulos.length} módulos de "cómo usar el sistema". No toca su entrenamiento de oficio ni las firmas de drill de su Oficial de Entrenamiento.\n\nÚsalo cuando entra una administradora nueva que usa el mismo correo del centro.`)
    if (!ok) return
    const r = await reiniciarProgreso(u.id)
    if (r?.error) { setError(r.error); return }
    setRecarga((n) => n + 1)
  }

  return (
    <div className="shell">
      <Sidebar rol="admin_general" />
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Gerencia · Entrenamiento</div>
            <h1 className="h-title">Quién completó el entrenamiento</h1>
            <p className="h-sub">Por usuario y módulo. ✓ = recorrido visto y quiz 3/3 · <span style={{ color: 'var(--warn)' }}>tour</span> = vio el recorrido, falta el quiz · <span style={{ color: 'var(--warn)' }}>quiz</span> = aprobó sin ver el recorrido</p>
          </div>
          <select className="input" style={{ width: 240 }} value={centroId} onChange={(e) => setCentroId(e.target.value)} aria-label="Filtrar por centro">
            <option value="">Todos los centros</option>
            {centros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        {loading ? <div className="h-sub">Cargando…</div> : error || !data ? (
          <div className="alert alert--error">{error || 'No se pudo cargar el progreso. Recarga la página.'}</div>
        ) : (
          <div className="panel" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th><th>Centro</th>
                  {data.modulos.map((m, i) => <th key={m.id} title={m.titulo} style={{ textAlign: 'center' }}>{i + 1}</th>)}
                  <th style={{ textAlign: 'right' }}>%</th>
                  <th />
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
                        <button className="btn" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => reiniciar(u)} title="Borra el progreso y vuelve a 0. Para cuando entra una administradora nueva con el mismo correo.">
                          Reiniciar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', color: 'var(--text-dim)', fontSize: 12 }}>
              Módulos: {data.modulos.map((m, i) => `${i + 1} ${m.titulo}`).join(' · ')}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
