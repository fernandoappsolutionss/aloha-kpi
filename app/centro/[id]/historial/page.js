'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { supabase } from '../../../../lib/supabase'

const MESES = ['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const TRIMESTRES = ['', 'Q1 (Ene-Mar)', 'Q2 (Abr-Jun)', 'Q3 (Jul-Sep)', 'Q4 (Oct-Dic)']

export default function HistorialPage() {
  const params = useParams()
  const sp = useSearchParams()
  const nombre = sp.get('nombre') || localStorage.getItem('aloha_centro_nombre') || 'MI CENTRO'
  const centroId = params.id === 'demo' ? null : params.id

  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState(null)
  const [anio, setAnio] = useState(2026)

  useEffect(() => { if (centroId) loadHistorial() }, [centroId, anio])

  async function loadHistorial() {
    setLoading(true)
    try {
      const { data: trimestres } = await supabase
        .from('trimestres')
        .select('id, trimestre, anio')
        .eq('centro_id', centroId)
        .eq('anio', anio)
        .order('trimestre')

      if (!trimestres || trimestres.length === 0) { setHistorial([]); setLoading(false); return }

      const resultados = []
      for (const trim of trimestres) {
        const [{ data: semanas }, { data: resumenes }, { data: cumplimientos }] = await Promise.all([
          supabase.from('kpi_semanas').select('*').eq('trimestre_id', trim.id).order('mes').order('semana'),
          supabase.from('resumen_mes').select('*').eq('trimestre_id', trim.id).order('mes'),
          supabase.from('cumplimiento').select('*').eq('trimestre_id', trim.id).order('mes'),
        ])

        const mesesData = [1, 2, 3].map(mes => {
          const semsDelMes = (semanas || []).filter(s => s.mes === mes)
          const resumen = (resumenes || []).find(r => r.mes === mes)
          const cumpl = (cumplimientos || []).find(c => c.mes === mes)

          const totNuevos = semsDelMes.reduce((a, s) => a + s.ing_d1 + s.ing_d2 + s.ing_d3 + s.ing_d4 + s.ing_d5, 0)
          const totDes = semsDelMes.reduce((a, s) => a + s.des_d1 + s.des_d2 + s.des_d3 + s.des_d4 + s.des_d5, 0)
          const cobFinal = semsDelMes.length > 0 ? Math.min(...semsDelMes.map(s => Math.min(s.cob_d1, s.cob_d2, s.cob_d3, s.cob_d4, s.cob_d5))) : null

          const checkKeys = cumpl ? Object.keys(cumpl).filter(k => !['id','trimestre_id','mes','updated_at'].includes(k)) : []
          const totalSi = checkKeys.filter(k => cumpl[k] === 'si').length
          const pctCumpl = checkKeys.length > 0 ? Math.round(totalSi / checkKeys.length * 100) : null

          return {
            mes,
            mesNombre: MESES[mes + (trim.trimestre - 1) * 3],
            tieneData: semsDelMes.length > 0 || resumen,
            nuevos: totNuevos,
            desercion: totDes,
            cobranza: cobFinal,
            ninos_final: resumen?.ninos_final_mes || 0,
            grupos: resumen?.grupos_activos || 0,
            cp_inv: resumen?.cp_invitados || 0,
            cp_mat: resumen?.cp_matriculados || 0,
            cumplimiento: pctCumpl,
          }
        })

        resultados.push({ ...trim, meses: mesesData })
      }
      setHistorial(resultados)
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'#f5f5f0'}}>
      <Sidebar rol="administradora" centroNombre={nombre} centroId={params.id}/>
      <main style={{flex:1,padding:28,overflowY:'auto'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <div>
            <h1 style={{fontSize:20,fontWeight:600,marginBottom:4}}>Historial de resultados</h1>
            <p style={{fontSize:12,color:'#888'}}>{nombre} · Registro mensual por trimestre</p>
          </div>
          <select value={anio} onChange={e=>setAnio(parseInt(e.target.value))}
            style={{padding:'8px 14px',border:'0.5px solid #e0e0dc',borderRadius:8,fontSize:13,background:'#fff',outline:'none'}}>
            <option value={2026}>2026</option>
            <option value={2025}>2025</option>
          </select>
        </div>

        {loading ? (
          <div style={{padding:40,textAlign:'center',color:'#888'}}>Cargando historial...</div>
        ) : historial.length === 0 ? (
          <div style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,padding:40,textAlign:'center',color:'#aaa'}}>
            <div style={{fontSize:32,marginBottom:12}}>📋</div>
            <div style={{fontSize:14,fontWeight:500}}>No hay registros para {anio}</div>
            <div style={{fontSize:12,marginTop:6}}>Los datos aparecerán aquí una vez que se registren los KPIs mensuales.</div>
          </div>
        ) : historial.map(trim => (
          <div key={trim.id} style={{marginBottom:20}}>
            <div style={{fontSize:13,fontWeight:700,color:'#533AB7',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.04em'}}>
              {TRIMESTRES[trim.trimestre]} {trim.anio}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
              {trim.meses.map(m => (
                <div key={m.mes} style={{background:'#fff',border:'0.5px solid #e8e8e4',borderRadius:12,overflow:'hidden',
                  opacity:m.tieneData?1:0.5}}>
                  <div style={{padding:'14px 18px',borderBottom:'0.5px solid #f0f0ec',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <span style={{fontSize:14,fontWeight:600}}>{m.mesNombre}</span>
                    {m.cumplimiento !== null ? (
                      <span style={{fontSize:12,fontWeight:700,color:m.cumplimiento>=85?'#0F6E56':m.cumplimiento>=70?'#854F0B':'#993C1D'}}>
                        {m.cumplimiento}% cumpl.
                      </span>
                    ) : (
                      <span style={{fontSize:11,color:'#bbb'}}>Sin datos</span>
                    )}
                  </div>
                  {m.tieneData ? (
                    <div style={{padding:'12px 18px'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                        {[
                          {l:'Nuevos ingresos', v:m.nuevos, ok:m.nuevos>=20, meta:'/ 20'},
                          {l:'Deserción', v:m.desercion, ok:m.desercion<=18, warn:m.desercion>18},
                          {l:'Niños activos', v:m.ninos_final},
                          {l:'Grupos', v:m.grupos},
                          {l:'CP invitados', v:m.cp_inv},
                          {l:'CP matriculados', v:m.cp_mat},
                        ].map((item,i) => (
                          <div key={i} style={{background:'#f8f8f5',borderRadius:8,padding:'8px 10px'}}>
                            <div style={{fontSize:10,color:'#888',marginBottom:2}}>{item.l}</div>
                            <div style={{fontSize:16,fontWeight:600,color:item.ok===false||item.warn?'#993C1D':item.ok?'#0F6E56':'#1a1a1a'}}>
                              {item.v ?? '—'} <span style={{fontSize:10,color:'#aaa'}}>{item.meta||''}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {m.cumplimiento !== null && (
                        <div style={{marginTop:10}}>
                          <div style={{height:6,background:'#eee',borderRadius:3,overflow:'hidden'}}>
                            <div style={{height:'100%',width:m.cumplimiento+'%',background:m.cumplimiento>=85?'#1D9E75':m.cumplimiento>=70?'#EF9F27':'#D85A30',borderRadius:3}}/>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{padding:20,textAlign:'center',color:'#ccc',fontSize:12}}>Pendiente de registro</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}
