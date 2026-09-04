'use client'
import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { loadCumplimiento, saveCumplimiento } from '../../../actions/cumplimiento'
import { getCentroNombre } from '../../../actions/centros'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, quarterMonths, periodLabel } from '../../../../lib/period'
import PeriodSelector from '../../../../components/PeriodSelector'
import TableScroller from '../../../../components/TableScroller'

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

const CHECKS = [
  {g:'Classdojo',items:[{k:'classdojo_activo',l:'Classdojo activo'},{k:'ninos_completos_classdojo',l:'Niños completos en Classdojo'},{k:'padres_conectados',l:'Padres conectados'},{k:'muro_informacion',l:'Muro con información'},{k:'bienvenida',l:'Bienvenida publicada'},{k:'calendario',l:'Calendario publicado'},{k:'clase_padres',l:'Clase de padres'},{k:'fotos_grupo',l:'Fotos de grupo'},{k:'seguimiento_evolucion',l:'Seguimiento evolución'},{k:'asistente_classdojo',l:'Asistente activa'},{k:'portafolio',l:'Portafolio con retroalimentación'}]},
  {g:'Study',items:[{k:'grupo_study',l:'Grupo creado en Study'},{k:'ninos_activos_study',l:'Niños activos completos'},{k:'niveles_actualizados',l:'Niveles actualizados'},{k:'coach_activo',l:'Coach activo'},{k:'ninos_trabajando_study',l:'Niños trabajando (gráfica)'},{k:'asistencia_dias',l:'Asistencia con días trabajados'}]},
  {g:'Centro físico',items:[{k:'centro_buen_estado',l:'Centro en buen estado'},{k:'aromatizante',l:'Aromatizante en recepción'},{k:'mesa_cafe',l:'Mesa de café y té'},{k:'brochure',l:'Brochure en recepción'},{k:'cartel_qr',l:'Cartel QR para Google'},{k:'wifi_gratis',l:'Mensaje WIFI Gratis'},{k:'saludo_cordial',l:'Saludo cordial a padres'},{k:'encuestas_satisfaccion',l:'Encuestas de satisfacción'}]},
  {g:'Equipo',items:[{k:'coach_estrella',l:'Premiar Coach estrella del mes'},{k:'reuniones_mensuales',l:'Reuniones mensuales con equipo'},{k:'monitoreo_camaras',l:'Monitoreo de cámaras'},{k:'actividades_equipo',l:'Actividades internas del equipo'},{k:'encuestas_equipo',l:'Encuestas al equipo (semestral)'}]},
  {g:'Metas KPI',items:[{k:'meta_cobranza',l:'Meta de cobranza lograda'},{k:'meta_desercion',l:'Meta de deserción lograda'},{k:'meta_nuevos_ingresos',l:'Meta 20+ nuevos ingresos'}]},
]
const DEFS = {classdojo_activo:'si',ninos_completos_classdojo:'si',padres_conectados:'si',muro_informacion:'si',bienvenida:'si',calendario:'si',clase_padres:'si',fotos_grupo:'si',seguimiento_evolucion:'si',asistente_classdojo:'si',portafolio:'si',grupo_study:'si',ninos_activos_study:'si',niveles_actualizados:'si',coach_activo:'si',ninos_trabajando_study:'si',asistencia_dias:'si',centro_buen_estado:'si',aromatizante:'si',mesa_cafe:'si',brochure:'si',cartel_qr:'si',wifi_gratis:'si',saludo_cordial:'si',encuestas_satisfaccion:'si',coach_estrella:'no',reuniones_mensuales:'si',monitoreo_camaras:'si',actividades_equipo:'si',encuestas_equipo:'no',meta_cobranza:'no',meta_desercion:'si',meta_nuevos_ingresos:'no'}

export default function CumplimientoPage() {
  const params = useParams()
  const sp = useSearchParams()
  // Período seleccionable (trimestre/año) — compartido con el resto del panel.
  // Permite registrar/editar el cumplimiento de meses de trimestres anteriores
  // (p. ej. Junio, que cae en Q2, aunque hoy el trimestre actual sea Q3).
  const [period, setPeriod] = useState(getCurrentPeriod())
  useEffect(() => { setPeriod(readStoredPeriod()) }, [])
  const { year, quarter } = period
  const label = periodLabel(year, quarter)
  const qMonths = quarterMonths(quarter)
  const [nombre, setNombre] = useState('Centro')
  const centroId = params.id === 'demo' ? null : params.id
  useEffect(() => { if (centroId) getCentroNombre(centroId).then((n) => { if (n) setNombre(n) }).catch(() => {}) }, [centroId])

  const [mes, setMes] = useState(1)
  const [vals, setVals] = useState(DEFS)
  const [trimestreId, setTrimestreId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const allKeys = CHECKS.flatMap(g => g.items.map(i => i.k))
  const totalSi = allKeys.filter(k => vals[k]==='si').length
  const pct = Math.round(totalSi/allKeys.length*100)

  // Al cambiar de trimestre/año se vuelve al primer mes y se recarga.
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p); setMes(1) }

  useEffect(() => { loadData() }, [mes, centroId, year, quarter])

  async function loadData() {
    if (!centroId) { setLoading(false); return }
    setLoading(true)
    setError('')
    try {
      const { trimestreId, vals } = await loadCumplimiento(centroId, year, quarter, mes)
      setTrimestreId(trimestreId)
      setVals(vals || {...DEFS})
    } catch (e) { setError('No se pudo cargar el cumplimiento. Intenta nuevamente.') }
    setLoading(false)
  }

  function toggle(k, v) { setVals(prev => ({...prev,[k]:v})) }

  async function save() {
    if (!centroId) { setStatus('Modo demo — conéctate con cuenta real para guardar.'); return }
    setSaving(true); setStatus('')
    try {
      const res = await saveCumplimiento(centroId, year, quarter, mes, vals)
      if (res.error) throw new Error(res.error)
      setStatus('✅ Cumplimiento guardado correctamente.')
      setTimeout(() => setStatus(''), 4000)
    } catch (e) { setStatus('❌ Error: ' + e.message) }
    setSaving(false)
  }

  const pctColor = pct >= 85 ? 'var(--ok)' : pct >= 70 ? 'var(--warn)' : 'var(--bad)'

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={params.id}/>
      <main id="main-content" data-page-state={loading ? 'loading' : error ? 'error' : 'ready'} className="main reports-page">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Checklist operativo · {label}</div>
            <h1 className="h-title">Cumplimiento mensual</h1>
            <p className="h-sub">{nombre} · {label}</p>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <PeriodSelector value={period} onChange={changePeriod} />
            {status && <span role="status" aria-live="polite" style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: status.includes('❌') ? 'var(--bad-text)' : 'var(--ok-text)', fontWeight: 500 }}>{status}</span>}
            <button type="button" onClick={save} disabled={saving||loading||Boolean(error)} className="btn btn--primary">
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>

        <div role="tablist" aria-label="Mes de cumplimiento" className="reports-tabs" style={{ display: 'flex', marginBottom: 20, borderBottom: '1px solid var(--border)', gap: 4 }}>
          {qMonths.map((mAbs,i)=>
            <button type="button" role="tab" id={`mes-tab-${i+1}`} aria-controls="cumplimiento-panel" aria-selected={mes===i+1} tabIndex={mes===i+1 ? 0 : -1} key={mAbs} onClick={()=>setMes(i+1)} onKeyDown={e => { const next = e.key==='ArrowRight' ? mes%3+1 : e.key==='ArrowLeft' ? (mes+1)%3+1 : e.key==='Home' ? 1 : e.key==='End' ? 3 : null; if(next) { e.preventDefault(); setMes(next); document.getElementById(`mes-tab-${next}`)?.focus() } }} style={{ minHeight:44, padding: '10px 20px', background: 'none', border: 'none', fontSize: 13, cursor: 'pointer', borderBottom: mes===i+1 ? '2px solid var(--ts-green)' : '2px solid transparent', color: mes===i+1 ? 'var(--text)' : 'var(--text-dim)', fontWeight: mes===i+1 ? 600 : 500, marginBottom: -1 }}>{NOMBRES_MES[mAbs-1]}</button>
          )}
        </div>

        {loading ? <div role="status" style={{ padding: 20, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando…</div> : error ? <div role="alert">{error}<button type="button" className="btn" onClick={loadData}>Reintentar</button></div> : <div role="tabpanel" id="cumplimiento-panel" aria-labelledby={`mes-tab-${mes}`}>
          <div className="card" style={{ padding: '18px 20px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Cumplimiento del mes</div>
                <div className="label" style={{ marginTop: 4 }}>{totalSi} de {allKeys.length} criterios cumplidos</div>
              </div>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 500, color: pctColor, letterSpacing: '-0.02em', lineHeight: 1 }}>{pct}%</div>
            </div>
            <div className="bar" style={{ height: 10 }}>
              <div className="bar__fill" style={{ width: `${pct}%`, background: pctColor }} />
            </div>
          </div>

          {CHECKS.map(group => (
            <div key={group.g} className="card" style={{ padding: '16px 20px', marginBottom: 12 }}>
              <h3 className="label" style={{ color: 'var(--ok-text)', marginBottom: 12 }}>{NOMBRES_MES[qMonths[mes-1]-1]} · {group.g}</h3>
              <TableScroller label={`${NOMBRES_MES[qMonths[mes-1]-1]} · ${group.g}`} stickyFirstColumn>
                <table className="table compliance-matrix"><thead><tr><th scope="col">Criterio</th><th scope="col">Sí</th><th scope="col">No</th></tr></thead><tbody>
                  {group.items.map(item => <tr key={item.k}><th scope="row">{item.l}</th>{['si','no'].map(value => <td key={value}><button type="button" className="btn btn--compact" aria-pressed={vals[item.k]===value} onClick={()=>toggle(item.k,value)}>{value==='si' ? 'Sí' : 'No'}</button></td>)}</tr>)}
                </tbody></table>
              </TableScroller>
            </div>
          ))}
        </div>}
      </main>
    </div>
  )
}
