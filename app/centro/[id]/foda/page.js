'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { getCentroNombre } from '../../../actions/centros'
import { loadFoda, saveFoda, listPeticiones, addPeticion, updatePeticion, deletePeticion } from '../../../actions/foda'
import { getCurrentPeriod, periodLabel } from '../../../../lib/period'

const ESTADOS = ['Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido']
const estadoColor = (s) =>
  (s === 'Aprobado' || s === 'Cumplido') ? { bg: 'var(--ok-bg)', line: 'var(--ok-line)', fg: 'var(--ok)' }
  : s === 'En proceso' ? { bg: 'var(--ts-green-soft)', line: 'var(--ts-green-line)', fg: 'var(--ts-green)' }
  : s === 'Negado' ? { bg: 'var(--bad-bg)', line: 'var(--bad-line)', fg: 'var(--bad)' }
  : { bg: 'var(--surface-3)', line: 'var(--border-strong)', fg: 'var(--text-muted)' }

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
  const [peticiones, setPeticiones] = useState([])
  const [nueva, setNueva] = useState('')
  const [pBusy, setPBusy] = useState(false)
  const { year, quarter } = getCurrentPeriod()
  const label = periodLabel(year, quarter)

  useEffect(() => {
    if (params.id === 'demo') return
    loadFoda(params.id, year, quarter).then((d) => {
      if (!d) return
      const vinc = d.vinculado || { fortalezas: [], debilidades: [] }
      setVinculado(vinc)
      const row = d.foda
      setFoda((prev) => ({
        // Si hay texto guardado se usa; si no, se pre-carga desde el cumplimiento real.
        fortalezas: (row?.fortalezas ?? '') || vinc.fortalezas.join('\n'),
        debilidades: (row?.debilidades ?? '') || vinc.debilidades.join('\n'),
        oportunidades: row?.oportunidades ?? prev.oportunidades,
        amenazas: row?.amenazas ?? prev.amenazas,
        comentarios: row?.comentarios ?? '',
      }))
      if (row?.comentario_estado) setEstado(row.comentario_estado)
    }).catch(() => {})
    listPeticiones(params.id, year, quarter).then((d) => setPeticiones(d || [])).catch(() => {})
  }, [params.id])

  // Regenera Fortalezas/Debilidades desde el cumplimiento actual del trimestre.
  function actualizarDesdeCumplimiento(k) {
    const list = k === 'fortalezas' ? vinculado.fortalezas : vinculado.debilidades
    setFoda((f) => ({ ...f, [k]: (list || []).join('\n') }))
  }

  async function agregarPeticion() {
    const t = nueva.trim()
    if (!t || params.id === 'demo') return
    setPBusy(true)
    try {
      const res = await addPeticion(params.id, year, quarter, t)
      if (res?.error) throw new Error(res.error)
      setPeticiones(p => [...p, res.peticion]); setNueva('')
    } catch (e) { setStatus('Error: ' + (e?.message || '')) }
    setPBusy(false)
  }
  async function cambiarEstadoPeticion(id, est) {
    setPeticiones(p => p.map(x => x.id === id ? { ...x, estado: est } : x))
    try { await updatePeticion(params.id, id, { estado: est }) } catch { setStatus('Error al actualizar estado.') }
  }
  async function guardarTextoPeticion(id, texto) {
    try { await updatePeticion(params.id, id, { texto }) } catch { setStatus('Error al guardar el texto.') }
  }
  async function eliminarPeticion(id) {
    setPeticiones(p => p.filter(x => x.id !== id))
    try { await deletePeticion(params.id, id) } catch { setStatus('Error al eliminar.') }
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
    {t:'Fortalezas',      accent:'var(--ok)',       tone:'#6EE7B7', k:'fortalezas', linked:true, prompts:['Se pre-cargan desde los criterios de cumplimiento marcados en “Sí”.']},
    {t:'Debilidades',     accent:'var(--bad)',      tone:'#FCA5A5', k:'debilidades', linked:true, prompts:['Se pre-cargan desde los criterios de cumplimiento marcados en “No”.']},
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
          Las fortalezas y debilidades se pre-cargan desde tu checklist de cumplimiento (incluye el cumplimiento de metas) y quedan editables. Usa “Actualizar desde cumplimiento” para regenerarlas con los datos actuales.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {cuads.map(({t,accent,tone,k,prompts,linked})=>(
            <div key={t} className="card" style={{ padding: 18, borderTop: `2px solid ${accent}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <h3 className="label" style={{ color: tone, fontSize: 12 }}>{t}</h3>
                {linked && (
                  <button type="button" onClick={()=>actualizarDesdeCumplimiento(k)} className="btn" style={{ padding: '4px 10px', fontSize: 11 }}>
                    Actualizar desde cumplimiento
                  </button>
                )}
              </div>
              <p className="h-sub" style={{ marginTop: 0, marginBottom: 8 }}>{linked ? 'Vinculado al cumplimiento · editable' : 'Editable por la administradora'}</p>
              {prompts.map((p,i)=><p key={i} style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 3, paddingLeft: 10, borderLeft: '2px solid var(--border-strong)' }}>{p}</p>)}
              <textarea value={foda[k] ?? ''} onChange={e=>setFoda({...foda,[k]:e.target.value})} style={taStyle}/>
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 18, marginTop: 16 }}>
          <h3 className="panel__title" style={{ fontSize: 16, marginBottom: 4 }}>Comentarios y peticiones del administrador</h3>
          <p className="h-sub" style={{ marginTop: 0, marginBottom: 14 }}>Solicitudes de presupuesto, sugerencias, notas para la gerencia. Agrega cada una y asígnale su estado.</p>

          {/* Agregar nueva petición */}
          <div style={{ display: 'flex', gap: 8, marginBottom: peticiones.length ? 16 : 4, alignItems: 'flex-start' }}>
            <textarea value={nueva} onChange={e=>setNueva(e.target.value)}
              onKeyDown={e=>{ if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) agregarPeticion() }}
              placeholder="Escribe una solicitud o comentario… (⌘/Ctrl+Enter para agregar)"
              style={{ ...taStyle, marginTop: 0, minHeight: 60, flex: 1 }} />
            <button onClick={agregarPeticion} disabled={pBusy || !nueva.trim()} className="btn btn--primary" style={{ whiteSpace: 'nowrap' }}>+ Agregar</button>
          </div>

          {/* Lista de peticiones */}
          {peticiones.length === 0 ? (
            <p className="h-sub" style={{ textAlign: 'center', padding: '16px 0 4px', color: 'var(--text-dim)' }}>Aún no hay peticiones. Agrega la primera arriba.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {peticiones.map(p => (
                <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '12px 14px', background: 'var(--surface-2)' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <textarea value={p.texto}
                      onChange={e=>setPeticiones(ps=>ps.map(x=>x.id===p.id?{...x,texto:e.target.value}:x))}
                      onBlur={e=>guardarTextoPeticion(p.id, e.target.value)}
                      style={{ ...taStyle, marginTop: 0, minHeight: 42, flex: 1 }} />
                    <button onClick={()=>eliminarPeticion(p.id)} title="Eliminar"
                      style={{ flexShrink: 0, width: 32, height: 32, border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-dim)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    <span className="label" style={{ color: 'var(--text-muted)', marginRight: 2 }}>Estado:</span>
                    {ESTADOS.map(s => {
                      const on = p.estado === s
                      const col = estadoColor(s)
                      return (
                        <button key={s} onClick={()=>cambiarEstadoPeticion(p.id, s)}
                          style={{ padding: '4px 11px', border: `1px solid ${on ? col.line : 'var(--border-strong)'}`, borderRadius: 'var(--r-pill)', background: on ? col.bg : 'transparent', fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.02em', color: on ? col.fg : 'var(--text-dim)', cursor: 'pointer', fontWeight: on ? 600 : 500, transition: 'all 0.15s' }}>
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
