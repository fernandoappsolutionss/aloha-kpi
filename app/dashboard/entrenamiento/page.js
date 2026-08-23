'use client'
import { useEffect, useState } from 'react'
import Sidebar from '../../../components/Sidebar'
import { matrizProgreso } from '../../actions/entrenamiento'
import { listCentros } from '../../actions/centros'
import { completado } from '../../../lib/entrenamiento/progreso'

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('es-PA', { day: '2-digit', month: '2-digit' }) : ''

export default function EntrenamientoAdminPage() {
  const [data, setData] = useState(null)
  const [centros, setCentros] = useState([])
  const [centroId, setCentroId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { listCentros().then((c) => setCentros(c || [])).catch(() => {}) }, [])
  useEffect(() => {
    setLoading(true)
    matrizProgreso(centroId ? Number(centroId) : null).then(setData).catch(() => setData(null)).finally(() => setLoading(false))
  }, [centroId])

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
          <select className="input" style={{ width: 240 }} value={centroId} onChange={(e) => setCentroId(e.target.value)}>
            <option value="">Todos los centros</option>
            {centros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        {loading || !data ? <div className="h-sub">Cargando…</div> : (
          <div className="panel" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Usuario</th><th>Centro</th>
                  {data.modulos.map((m, i) => <th key={m.id} title={m.titulo} style={{ textAlign: 'center' }}>{i + 1}</th>)}
                  <th style={{ textAlign: 'right' }}>%</th>
                </tr>
              </thead>
              <tbody>
                {data.usuarios.length === 0 && <tr><td colSpan={data.modulos.length + 3} style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)' }}>Sin usuarios administradora.</td></tr>}
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
