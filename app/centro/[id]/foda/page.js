'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { getCentroNombre } from '../../../actions/centros'
import { loadFoda, saveFoda } from '../../../actions/foda'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../../../lib/period'
import PeriodSelector from '../../../../components/PeriodSelector'
import PeticionesPanel from '../../../../components/foda/PeticionesPanel'

export default function FodaPage() {
  const params = useParams()
  const sp = useSearchParams()
  const [nombre, setNombre] = useState('Centro')
  useEffect(() => { getCentroNombre(params.id).then((n) => { if (n) setNombre(n) }).catch(() => {}) }, [params.id])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [foda, setFoda] = useState({
    fortalezas: '',
    debilidades: '',
    oportunidades: 'Tendencias educativas digitales\nAlianzas con colegios locales\nEventos comunitarios del trimestre',
    amenazas: 'Competencia directa e indirecta\nFactores económicos familiares\nVacaciones escolares / verano',
    comentarios: '',
  })
  // Fortalezas/Debilidades derivadas del cumplimiento real (para pre-cargar/regenerar).
  const [vinculado, setVinculado] = useState({ fortalezas: [], debilidades: [] })
  const [estado, setEstado] = useState('')
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  // Período seleccionable (trimestre/año) — compartido con el resto del panel.
  // Permite editar el FODA de trimestres anteriores (p. ej. Junio en Q2).
  const [period, setPeriod] = useState(getCurrentPeriod())
  useEffect(() => { setPeriod(readStoredPeriod()) }, [])
  const { year, quarter } = period
  const label = periodLabel(year, quarter)
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p) }

  useEffect(() => {
    if (params.id === 'demo') { setLoading(false); return }
    let active = true
    setLoading(true); setError('')
    loadFoda(params.id, year, quarter).then((d) => {
      if (!active) return
      if (!d) return
      const vinc = d.vinculado || { fortalezas: [], debilidades: [] }
      setVinculado(vinc)
      const row = d.foda
      setFoda({
        // Si hay texto guardado se usa; si no, se pre-carga desde el cumplimiento real.
        fortalezas: (row?.fortalezas ?? '') || vinc.fortalezas.join('\n'),
        debilidades: (row?.debilidades ?? '') || vinc.debilidades.join('\n'),
        oportunidades: row?.oportunidades ?? '',
        amenazas: row?.amenazas ?? '',
        comentarios: row?.comentarios ?? '',
      })
      setEstado(row?.comentario_estado || '')
    }).catch(() => { if(active) setError('No se pudo cargar el FODA. Intenta nuevamente.') }).finally(() => { if(active) setLoading(false) })
    return () => { active = false }
  }, [params.id, year, quarter, retry])

  // Regenera Fortalezas/Debilidades desde el cumplimiento actual del trimestre.
  function actualizarDesdeCumplimiento(k) {
    const list = k === 'fortalezas' ? vinculado.fortalezas : vinculado.debilidades
    setFoda((f) => ({ ...f, [k]: (list || []).join('\n') }))
  }

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
  // Las 4 cuadrantes son editables. Fortalezas/Debilidades quedan vinculadas al
  // cumplimiento (se pre-cargan desde el checklist y pueden regenerarse).
  const cuads = [
    {t:'Fortalezas',      accent:'var(--ok)',       tone:'var(--ok-text)', k:'fortalezas', linked:true, prompts:['Se pre-cargan desde los criterios de cumplimiento marcados en “Sí”.']},
    {t:'Debilidades',     accent:'var(--bad)',      tone:'var(--bad-text)', k:'debilidades', linked:true, prompts:['Se pre-cargan desde los criterios de cumplimiento marcados en “No”.']},
    {t:'Oportunidades',   accent:'var(--ts-green)', tone:'var(--text)', k:'oportunidades', prompts:['Tendencias educativas: ¿nuevas demandas?','Alianzas locales: colegios, empresas','Eventos y actividades comunitarias']},
    {t:'Amenazas',        accent:'var(--warn)',     tone:'var(--warn-text)', k:'amenazas', prompts:['Competencia directa e indirecta','Factores económicos locales','Cambios en regulaciones']},
  ]

  const taStyle = { width:'100%', padding:'10px 12px', background:'var(--bg)', border:'1px solid var(--border-strong)', borderRadius:'var(--r-sm)', fontSize:13, resize:'vertical', marginTop:10, outline:'none', lineHeight:1.6, color:'var(--text)', minHeight:100, fontFamily:'var(--font-sans)' }

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={params.id}/>
      <main id="main-content" data-page-state={loading ? 'loading' : error ? 'error' : 'ready'} className="main reports-page">

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Análisis estratégico · {label}</div>
            <h1 className="h-title">FODA Trimestral</h1>
            <p className="h-sub">{nombre} · {label}</p>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <PeriodSelector value={period} onChange={changePeriod} />
            {status && <span role="status" aria-live="polite" style={{ fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-mono)', color: status.startsWith('Error') ? 'var(--bad-text)' : 'var(--ok-text)' }}>{status}</span>}
            <button type="button" onClick={save} disabled={saving||loading||Boolean(error)} className="btn btn--primary">{saving ? 'Guardando…' : 'Guardar FODA'}</button>
          </div>
        </div>

        {loading ? <p role="status">Cargando FODA…</p> : error ? <div role="alert">{error}<button type="button" className="btn" onClick={()=>setRetry(n=>n+1)}>Reintentar</button></div> : <>
        <div className="alert" style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-muted)', marginBottom: 20 }}>
          <span style={{ color: 'var(--ts-green)' }}>›</span>
          Las fortalezas y debilidades se pre-cargan desde tu checklist de cumplimiento (incluye el cumplimiento de metas) y quedan editables. Usa “Actualizar desde cumplimiento” para regenerarlas con los datos actuales.
        </div>

        <div className="reports-grid">
          {cuads.map(({t,accent,tone,k,prompts,linked})=>(
            <div key={t} className="card" style={{ padding: 18, borderTop: `2px solid ${accent}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <h3 className="label" style={{ color: tone, fontSize: 13 }}><label htmlFor={`foda-${k}`}>{t}</label></h3>
                {linked && (
                  <button type="button" onClick={()=>actualizarDesdeCumplimiento(k)} className="btn" style={{ padding: '4px 10px', fontSize: 13 }}>
                    Actualizar desde cumplimiento
                  </button>
                )}
              </div>
              <p className="h-sub" style={{ marginTop: 0, marginBottom: 8 }}>{linked ? 'Vinculado al cumplimiento · editable' : 'Editable por la administradora'}</p>
              {prompts.map((p,i)=><p key={i} style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 3, paddingLeft: 10, borderLeft: '2px solid var(--border-strong)' }}>{p}</p>)}
              <textarea id={`foda-${k}`} name={k} autoComplete="off" value={foda[k] ?? ''} onChange={e=>setFoda({...foda,[k]:e.target.value})} style={{...taStyle,fontSize:16}}/>
            </div>
          ))}
        </div>

        {params.id !== 'demo' && (
          <PeticionesPanel
            centroId={params.id}
            anio={year}
            trimestre={quarter}
            onStatus={setStatus}
          />
        )}
        </>}
      </main>
    </div>
  )
}
