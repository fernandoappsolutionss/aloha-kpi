'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { supabase } from '../../../lib/supabase'

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
    const { data } = await supabase.from('centros').select('id, nombre').order('nombre')
    setCentros(data || [])
  }

  async function loadDatos() {
    setLoading(true)
    try {
      let query = supabase.from('trimestres').select(`
        id, trimestre, anio,
        centros(id, nombre),
        resumen_mes(mes, ninos_final_mes, grupos_activos, cp_invitados, cp_matriculados),
        kpi_semanas(mes, ing_d1, ing_d2, ing_d3, ing_d4, ing_d5, des_d1, des_d2, des_d3, des_d4, des_d5),
        cumplimiento(mes, meta_desercion, meta_nuevos_ingresos, meta_cobranza)
      `).eq('anio', anio).order('trimestre')

      if (centroSel !== 'todos') query = query.eq('centro_id', centroSel)
      if (trimSel !== 'todos') query = query.eq('trimestre', parseInt(trimSel))

      const { data } = await query
      setDatos(data || [])
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  function calcMes(trim, mes) {
    const sems = (trim.kpi_semanas || []).filter(s => s.mes === mes)
    const res = (trim.resumen_mes || []).find(r => r.mes === mes)
    const cum = (trim.cumplimiento || []).find(c => c.mes === mes)
    const nuevos = sems.reduce((a,s) => a+s.ing_d1+s.ing_d2+s.ing_d3+s.ing_d4+s.ing_d5, 0)
    const des = sems.reduce((a,s) => a+s.des_d1+s.des_d2+s.des_d3+s.des_d4+s.des_d5, 0)
    return { nuevos, des, ninos: res?.ninos_final_mes||0, grupos: res?.grupos_activos||0, cp_inv: res?.cp_invitados||0, cp_mat: res?.cp_matriculados||0, tieneData: sems.length > 0 }
  }

  const mesOffset = (trimestre) => (trimestre - 1) * 3

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
        ) : datos.map(trim => {
          const offset = mesOffset(trim.trimestre)
          return (
            <div key={trim.id} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,marginBottom:16,overflow:'hidden'}}>
              <div style={{padding:'14px 20px',borderBottom:'0.5px solid #f0f0ec',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fafaf8',cursor:'pointer'}}
                onClick={() => router.push(`/centro/${trim.centros?.id}`)}>
                <div>
                  <span style={{fontSize:15,fontWeight:700,color:'#533AB7'}}>{trim.centros?.nombre}</span>
                  <span style={{fontSize:12,color:'#888',marginLeft:12}}>{TRIMESTRES_N[trim.trimestre]} {trim.anio}</span>
                </div>
                <span style={{fontSize:11,color:'#aaa'}}>Ver centro →</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:0}}>
                {[1,2,3].map((mes,i) => {
                  const m = calcMes(trim, mes)
                  const mesNombre = MESES_BASE[offset + mes - 1]
                  return (
                    <div key={mes} style={{padding:'14px 18px',borderRight:i<2?'0.5px solid #f0f0ec':'none',borderTop:'0.5px solid #f0f0ec'}}>
                      <div style={{fontSize:12,fontWeight:600,color:'#444',marginBottom:10}}>{mesNombre}</div>
                      {m.tieneData ? (
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                          {[
                            {l:'Nuevos',v:m.nuevos,ok:m.nuevos>=20},
                            {l:'Deserción',v:m.des,ok:m.des<=18},
                            {l:'Niños',v:m.ninos},
                            {l:'Grupos',v:m.grupos},
                          ].map((item,j)=>(
                            <div key={j} style={{background:'#f8f8f5',borderRadius:6,padding:'6px 10px'}}>
                              <div style={{fontSize:10,color:'#aaa'}}>{item.l}</div>
                              <div style={{fontSize:15,fontWeight:600,color:item.ok===false?'#993C1D':item.ok===true?'#0F6E56':'#1a1a1a'}}>{item.v}</div>
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
          )
        })}
      </main>
    </div>
  )
}
