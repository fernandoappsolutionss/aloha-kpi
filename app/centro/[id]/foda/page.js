'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { getCentroNombre } from '../../../actions/centros'
import { loadFoda, saveFoda } from '../../../actions/foda'
import { getCurrentPeriod, periodLabel } from '../../../../lib/period'

export default function FodaPage() {
  const params = useParams()
  const sp = useSearchParams()
  const [nombre, setNombre] = useState('Centro')
  useEffect(() => { getCentroNombre(params.id).then((n) => { if (n) setNombre(n) }).catch(() => {}) }, [params.id])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [foda, setFoda] = useState({
    oportunidades: 'Tendencias educativas digitales\nAlianzas con colegios locales\nEventos comunitarios del trimestre',
    amenazas: 'Competencia directa e indirecta\nFactores económicos familiares\nVacaciones escolares / verano',
    comentarios: '',
  })
  const [estado, setEstado] = useState('')
  const [status, setStatus] = useState('')
  const { year, quarter } = getCurrentPeriod()
  const label = periodLabel(year, quarter)

  useEffect(() => {
    if (params.id === 'demo') return
    loadFoda(params.id, year, quarter).then((d) => {
      if (!d) return
      setFoda({
        oportunidades: d.oportunidades ?? '',
        amenazas: d.amenazas ?? '',
        comentarios: d.comentarios ?? '',
      })
      if (d.comentario_estado) setEstado(d.comentario_estado)
    }).catch(() => {})
  }, [params.id])

  const fortalezas = ['Classdojo activo y completo','Padres conectados','Grupo Study activo','Centro en buen estado','Reuniones mensuales con equipo','Meta de deserción lograda']
  const debilidades = ['No se premió al Coach estrella','Sin encuestas de satisfacción al equipo','Meta de cobranza no cumplida','Meta de 20+ nuevos ingresos no alcanzada']

  async function save() {
    if (params.id === 'demo') { setStatus('Modo demo — no se guarda.'); return }
    setSaving(true); setStatus('')
    try {
      const res = await saveFoda(params.id, year, quarter, { ...foda, comentario_estado: estado })
      if (res?.error) throw new Error(res.error)
      setSaved(true); setStatus('✓ Guardado'); setTimeout(() => { setSaved(false); setStatus('') }, 3500)
    } catch (e) {
      setStatus('Error al guardar: ' + (e?.message || 'desconocido'))
    }
    setSaving(false)
  }

  // accent = color de la barra superior y del título · tone = color del cuerpo
  const cuads = [
    {t:'Fortalezas',      accent:'var(--ok)',       tone:'#6EE7B7', auto:true, items:fortalezas},
    {t:'Debilidades',     accent:'var(--bad)',      tone:'#FCA5A5', auto:true, items:debilidades},
    {t:'Oportunidades',   accent:'var(--ts-green)', tone:'var(--text)', k:'oportunidades', prompts:['Tendencias educativas: ¿nuevas demandas?','Alianzas locales: colegios, empresas','Eventos y actividades comunitarias']},
    {t:'Amenazas',        accent:'var(--warn)',     tone:'#FCD34D', k:'amenazas', prompts:['Competencia directa e indirecta','Factores económicos locales','Cambios en regulaciones']},
  ]

  const taStyle = { width:'100%', padding:'10px 12px', background:'var(--bg)', border:'1px solid var(--border-strong)', borderRadius:'var(--r-sm)', fontSize:13, resize:'vertical', marginTop:10, outline:'none', lineHeight:1.6, color:'var(--text)', minHeight:100, fontFamily:'var(--font-sans)' }

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={params.id}/>
      <main className="main">

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Análisis estratégico · {label}</div>
            <h1 className="h-title">FODA Trimestral</h1>
            <p className="h-sub">{nombre} · {label}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {status && <span style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', color: status.startsWith('Error') ? 'var(--bad)' : 'var(--ok)' }}>{status}</span>}
            <button onClick={save} disabled={saving} className="btn btn--primary">{saving ? 'Guardando…' : 'Guardar FODA'}</button>
          </div>
        </div>

        <div className="alert" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', marginBottom: 20 }}>
          <span style={{ color: 'var(--ts-green)' }}>›</span>
          Las fortalezas y debilidades se generan automáticamente desde tu checklist de cumplimiento.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {cuads.map(({t,accent,tone,auto,items,k,prompts})=>(
            <div key={t} className="card" style={{ padding: 18, borderTop: `2px solid ${accent}` }}>
              <h3 className="label" style={{ color: tone, fontSize: 12, marginBottom: 8 }}>{t}</h3>
              {auto ? (
                <>
                  <p className="h-sub" style={{ marginTop: 0, marginBottom: 12, fontStyle: 'italic' }}>Generado automáticamente del cumplimiento</p>
                  <ul style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {items.map((f,i)=><li key={i} style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{f}</li>)}
                  </ul>
                </>
              ) : (
                <>
                  <p className="h-sub" style={{ marginTop: 0, marginBottom: 8 }}>Editable por la administradora</p>
                  {prompts.map((p,i)=><p key={i} style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3, paddingLeft: 10, borderLeft: '2px solid var(--border-strong)' }}>{p}</p>)}
                  <textarea value={foda[k]} onChange={e=>setFoda({...foda,[k]:e.target.value})} style={taStyle}/>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 18, marginTop: 16 }}>
          <h3 className="panel__title" style={{ fontSize: 16, marginBottom: 4 }}>Comentarios del administrador</h3>
          <p className="h-sub" style={{ marginTop: 0, marginBottom: 12 }}>Solicitudes de presupuesto, sugerencias, notas para la gerencia</p>
          <textarea value={foda.comentarios} onChange={e=>setFoda({...foda,comentarios:e.target.value})}
            style={{ ...taStyle, marginTop: 0 }}
            placeholder="Escribe aquí tus comentarios, solicitudes o sugerencias..."/>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <span className="label" style={{ color: 'var(--text-muted)' }}>Estado:</span>
            {['Próximo trimestre','Negado','Aprobado','En proceso','Cumplido'].map(s=>{
              const on = estado === s
              return (
                <button key={s} onClick={()=>setEstado(s)}
                  style={{ padding: '5px 13px', border: `1px solid ${on ? 'var(--ts-green-line)' : 'var(--border-strong)'}`, borderRadius: 'var(--r-pill)', background: on ? 'var(--ts-green-soft)' : 'transparent', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.02em', color: on ? 'var(--ts-green)' : 'var(--text-dim)', cursor: 'pointer', fontWeight: 500, transition: 'all 0.15s' }}>
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
