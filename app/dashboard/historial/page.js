'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { getHistorialAdmin } from '../../actions/dashboard'
import { listCentros } from '../../actions/centros'

const MESES_BASE = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const TRIMESTRES_N = ['','Q1','Q2','Q3','Q4']

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
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="admin_general"/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Historial de resultados</h1>
            <p style={{fontSize:12,color:'#888'}}>Registro mensual por centro y trimestre</p>
          </div>
          <div style={{display:'flex',gap:10}}>
            <select value={centroSel} onChange={e=>setCentroSel(e.target.value)}
              style={{padding:'8px 14px',border:'0.5px solid #e0e0dc',borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}>
              <option value="todos">Todos los centros</option>
              {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            <select value={trimSel} onChange={e=>setTrimSel(e.target.value)}
              style={{padding:'8px 14px',border:'0.5px solid #e0e0dc',borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}>
              <option value="todos">Todos los trimestres</option>
              <option value="1">Q1 — Ene/Feb/Mar</option>
              <option value="2">Q2 — Abr/May/Jun</option>
              <option value="3">Q3 — Jul/Ago/Sep</option>
              <option value="4">Q4 — Oct/Nov/Dic</option>
            </select>
            <select value={anio} onChange={e=>setAnio(parseInt(e.target.value))}
              style={{padding:'8px 14px',border:'0.5px solid #e0e0dc',borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}>
              <option value={2026}>2026</option>
              <option value={2025}>2025</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div style={{padding:40,textAlign:'center',color:'#888'}}>Cargando historial...</div>
        ) : datos.length === 0 ? (
          <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:48,textAlign:'center',color:'#aaa'}}>
            <div style={{fontSize:32,marginBottom:12}}>📊</div>
            <div style={{fontSize:14,fontWeight:500}}>No hay registros con los filtros seleccionados</div>
            <div style={{fontSize:12,marginTop:6}}>Los datos aparecerán aquí cuando las administradoras registren sus KPIs.</div>
          </div>
        ) : datos.map(item => (
          <div key={item.key} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,marginBottom:16,overflow:'hidden'}}>
            <div style={{padding:'14px 20px',borderBottom:'0.5px solid #f0f0ec',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fafaf8',cursor:'pointer'}}
              onClick={() => router.push(`/centro/${item.centro_id}`)}>
              <div>
                <span style={{fontSize:15,fontWeight:700,color:'#533AB7'}}>{item.centro_nombre}</span>
                <span style={{fontSize:12,color:'#888',marginLeft:12}}>{TRIMESTRES_N[item.trimestre]} {item.anio}</span>
              </div>
              <span style={{fontSize:11,color:'#aaa'}}>Ver centro →</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:0}}>
              {item.meses.map((m,i) => {
                const mesNombre = MESES_BASE[m.month - 1]
                return (
                  <div key={m.month} style={{padding:'14px 18px',borderRight:i<2?'0.5px solid #f0f0ec':'none',borderTop:'0.5px solid #f0f0ec'}}>
                    <div style={{fontSize:12,fontWeight:600,color:'#444',marginBottom:10}}>{mesNombre}</div>
                    {m.tieneData ? (
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                        {[
                          {l:'Nuevos',v:m.nuevos,ok:m.nuevos>=20},
                          {l:'Deserción',v:m.des,ok:m.des<=18},
                          {l:'Niños',v:m.ninos},
                          {l:'Grupos',v:m.grupos},
                        ].map((it,j)=>(
                          <div key={j} style={{background:'#f8f8f5',borderRadius:6,padding:'6px 10px'}}>
                            <div style={{fontSize:10,color:'#aaa'}}>{it.l}</div>
                            <div style={{fontSize:15,fontWeight:600,color:it.ok===false?'#993C1D':it.ok===true?'#0F6E56':'#1a1a1a'}}>{it.v}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{color:'#ccc',fontSize:12,padding:'8px 0'}}>Sin datos registrados</div>
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
