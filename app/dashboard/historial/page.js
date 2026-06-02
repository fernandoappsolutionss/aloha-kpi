'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { getHistorialAdmin } from '../../actions/dashboard'
import { listCentros } from '../../actions/centros'

const MESES_BASE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TRIMESTRES_N = ['','Q1','Q2','Q3','Q4']

const selectStyle = {
  padding: '10px 14px',
  background: 'var(--surface-1)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--r-sm)',
  color: 'var(--text)',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  outline: 'none',
  cursor: 'pointer',
}

export default function HistorialAdminPage() {
  const router = useRouter()
  const [centros, setCentros] = useState([])
  const [centroSel, setCentroSel] = useState('todos')
  const [anio, setAnio] = useState(2026)
  const [trimSel, setTrimSel] = useState('todos')
  const [datos, setDatos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadCentros() }, [])
  useEffect(() => { loadDatos() }, [centroSel, anio, trimSel])

  async function loadCentros() {
    try {
      const data = await listCentros()
      setCentros(data || [])
    } catch { setCentros([]) }
  }

  async function loadDatos() {
    setLoading(true)
    try {
      const data = await getHistorialAdmin(anio, centroSel, trimSel)
      setDatos(data || [])
    } catch (e) { console.error(e); setDatos([]) }
    setLoading(false)
  }

  return (
    <div className="shell">
      <Sidebar rol="admin_general"/>
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Registro histórico</div>
            <h1 className="h-title">Historial de resultados</h1>
            <p className="h-sub">Registro mensual por centro y trimestre</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <select value={centroSel} onChange={e=>setCentroSel(e.target.value)} style={selectStyle}>
              <option value="todos">Todos los centros</option>
              {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select value={trimSel} onChange={e=>setTrimSel(e.target.value)} style={selectStyle}>
              <option value="todos">Todos los trimestres</option>
              <option value="1">Q1 — Ene/Feb/Mar</option>
              <option value="2">Q2 — Abr/May/Jun</option>
              <option value="3">Q3 — Jul/Ago/Sep</option>
              <option value="4">Q4 — Oct/Nov/Dic</option>
            </select>
            <select value={anio} onChange={e=>setAnio(parseInt(e.target.value))} style={selectStyle}>
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando historial…</div>
        ) : datos.length === 0 ? (
          <div className="card" style={{ padding: 48, textAlign: 'center', color: 'var(--text-dim)' }}>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: '0 auto 14px', display: 'block', color: 'var(--text-faint)' }}>
              <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>No hay registros con los filtros seleccionados</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Los datos aparecerán aquí cuando las administradoras registren sus KPIs.</div>
          </div>
        ) : datos.map(item => (
          <div key={item.key} className="panel" style={{ marginBottom: 16 }}>
            <div className="panel__head" style={{ cursor: 'pointer' }}
              onClick={() => router.push(`/centro/${item.centro_id}`)}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                <span className="panel__title">{item.centro_nombre}</span>
                <span className="label">{TRIMESTRES_N[item.trimestre]} {item.anio}</span>
              </div>
              <span className="label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                Ver centro
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0 }}>
              {item.meses.map((m,i) => {
                const mesNombre = MESES_BASE[m.month - 1]
                return (
                  <div key={m.month} style={{ padding: '16px 20px', borderRight: i<2 ? '1px solid var(--border)' : 'none' }}>
                    <div className="label" style={{ color: 'var(--text-muted)', marginBottom: 12 }}>{mesNombre}</div>
                    {m.tieneData ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          {l:'Nuevos',v:m.nuevos,ok:m.nuevos>=20},
                          {l:'Deserción',v:m.des,ok:m.des<=18},
                          {l:'Niños',v:m.ninos},
                          {l:'Grupos',v:m.grupos},
                        ].map((it,j)=>(
                          <div key={j} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '8px 12px' }}>
                            <div className="label" style={{ fontSize: 10 }}>{it.l}</div>
                            <div className="num" style={{ fontSize: 17, fontWeight: 600, marginTop: 2, color: it.ok===false ? 'var(--bad)' : it.ok===true ? 'var(--ok)' : 'var(--text)' }}>{it.v}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-faint)', fontSize: 12, padding: '8px 0' }}>Sin datos registrados</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
