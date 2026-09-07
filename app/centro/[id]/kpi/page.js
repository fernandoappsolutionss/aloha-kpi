'use client'
import { Fragment, useState, useEffect, useCallback, useRef } from 'react'
import TableScroller from '../../../../components/TableScroller'
import OperationalCard from '../../../../components/OperationalCard'
import { useEsAsistente } from '../../../../components/useRol'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import CentroNavigation from '../../../../components/CentroNavigation'
import { loadKpiMes, saveKpiMes, cerrarMes, reabrirMes } from '../../../actions/kpi'
import { contarGruposActivos } from '../../../actions/grupos'
import { ajusteHistoricoKpi, finalVisibleKpi, inicioVisibleKpi } from '../../../../lib/inicios-clase.mjs'

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const SEMANAS = [1, 2, 3, 4, 5]
const KPI_METRICS = [
  {tipo:'cob',label:'Cobranza Vencida (N°)'},
  {tipo:'des',label:'Deserción (Retirados)'},
  {tipo:'ing',label:'Nuevos Ingresos - Ventas'},
]

// Fórmulas KPI ALOHA (según Excel)
const calcRes = (tipo, dias) => {
  const v = dias.map(x => parseInt(x) || 0)
  if (tipo === 'cob') { for (let i = v.length-1; i >= 0; i--) if (v[i] > 0) return v[i]; return 0 }
  return v.reduce((a,b) => a+b, 0)
}
const calcMeta = (tipo, ni, metaN) => {
  if (tipo === 'cob') return Math.round(ni * 0.015 / 5 * 10) / 10
  if (tipo === 'des') return Math.round(ni * 0.08 / 5 * 10) / 10
  return Math.round(metaN / 5 * 10) / 10
}
const cumple = (tipo, res, meta) => tipo === 'cob' ? meta > res : tipo === 'des' ? meta >= res : res >= meta
const emptyW = () => ({ cob:['','','','',''], des:['','','','',''], ing:['','','','',''] })

export default function KPIPage() {
  const { id } = useParams()
  const now = new Date()
  // El asistente registra el KPI, pero no cierra ni reabre el mes.
  const esAsistente = useEsAsistente()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [centroNombre, setCentroNombre] = useState('')
  const [mesEstado, setMesEstado] = useState('abierto')
  const [saving, setSaving] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const loadSequence = useRef(0)
  const [config, setConfig] = useState({ ninos_inicio:0, grupos_activos:0, meta_nuevos_mensual:20, nuevos_activos_mes:0, cp_invitados:0, cp_asistieron:0, cp_matriculados:0, cp_matriculados_override:null, mot_tecnica:0, mot_perdida_clase:0, mot_economico:0, mot_horario:0, mot_graduado:0, mot_otro:0, orig_referido:0, orig_marketing:0, orig_centro:0, orig_activaciones:0, orig_medios:0, orig_por_clasificar:0 })
  const [semanas, setSemanas] = useState(SEMANAS.map(() => emptyW()))
  const [historial, setHistorial] = useState([])
  const [finalGuardado, setFinalGuardado] = useState(null)
  const [cierreAnterior, setCierreAnterior] = useState(null)
  // Cierre del mes anterior: encadena como "niños inicio" de este mes.
  const [arrastrado, setArrastrado] = useState(null)
  // Motivos de deserción que vienen del módulo (retiros registrados).
  const [motivosAuto, setMotivosAuto] = useState(null)
  const [autoSync, setAutoSync] = useState(null)
  const [gruposModulo, setGruposModulo] = useState(null) // conteo del módulo de grupos
  // KPI sin manos (g1-16/g1-20): resultado discriminado del módulo. 'auto'
  // bloquea ing/des (el cero también es auto); 'fallo' las deja editables con
  // advertencia; null = mes cerrado o anterior al gate (todo manual).
  const [kpiAuto, setKpiAuto] = useState(null)

  // Mes por enlace: /centro/3/kpi?year=2026&month=8 abre agosto directamente.
  // Lo usa la alerta de higiene de datos, que nombra el mes que falta cerrar —
  // decirle a alguien "cierra agosto" y dejarlo buscando el selector es la
  // diferencia entre una tarea y un reclamo.
  // ponytail: se lee de window.location en vez de useSearchParams (techo: no
  // reacciona si el query cambia sin recargar, cosa que hoy no ocurre; salida:
  // useSearchParams el día que la página se envuelva en un Suspense propio —
  // hoy ese hook obligaría a un boundary sólo para esto).
  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = new URLSearchParams(window.location.search)
    const y = Number(query.get('year'))
    const m = Number(query.get('month'))
    if (Number.isInteger(y) && y >= 2000 && y <= 2999) setYear(y)
    if (Number.isInteger(m) && m >= 1 && m <= 12) setMonth(m)
  }, [])

  const loadData = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoadError('')
    setLoading(true); setStatus(''); setAutoSync(null)
    let datos
    try {
      datos = await loadKpiMes(id, year, month)
      if (!datos || datos.error) throw new Error(datos?.error || 'Respuesta no disponible')
    } catch (e) {
      if (sequence !== loadSequence.current) return
      // Sin este catch la página se quedaba en "Cargando…" para siempre.
      setLoadError('No se pudo cargar el KPI: ' + (e?.message || 'desconocido'))
      setLoading(false)
      return
    }
    if (sequence !== loadSequence.current) return
    const { centroNombre: cNombre, estado, resumen: res, semanas: kpi, historial: hist, cierreAnterior: cierrePrevio, inicioArrastrado: arr, motivosAuto: mAuto, kpiAuto: kAuto, autoSync: sync } = datos
    setCentroNombre(cNombre || '')
    const estadoActual = estado || 'abierto'
    setMesEstado(estadoActual)
    setArrastrado(arr || null)
    setCierreAnterior(cierrePrevio || null)
    setMotivosAuto(mAuto || null)
    setKpiAuto(kAuto || null)
    setAutoSync(sync || null)
    setFinalGuardado(res?.ninos_final_mes ?? null)

    // Resumen del mes. El "niños inicio" se arrastra del cierre del mes
    // anterior solo mientras esta abierto. Un cierre conserva su propia foto.
    const ninosInicio = inicioVisibleKpi({
      estado: estadoActual,
      guardado: res?.ninos_inicio_mes,
      arrastrado: arr?.valor,
    })
    if (res) {
      setConfig({ ninos_inicio: ninosInicio, grupos_activos: res.grupos_activos||0, meta_nuevos_mensual: res.meta_nuevos_mensual||20, nuevos_activos_mes: res.nuevos_activos_mes||0, cp_invitados: res.cp_invitados||0, cp_asistieron: res.cp_asistieron||0, cp_matriculados: res.cp_matriculados||0, cp_matriculados_override: res.cp_matriculados_override ?? null, mot_tecnica: res.mot_tecnica||0, mot_perdida_clase: res.mot_perdida_clase||0, mot_economico: res.mot_economico||0, mot_horario: res.mot_horario||0, mot_graduado: res.mot_graduado||0, mot_otro: res.mot_otro||0, orig_referido: res.orig_referido||0, orig_marketing: res.orig_marketing||0, orig_centro: res.orig_centro||0, orig_activaciones: res.orig_activaciones||0, orig_medios: res.orig_medios||0, orig_por_clasificar: res.orig_por_clasificar||0 })
    } else {
      setConfig({ ninos_inicio: ninosInicio, grupos_activos:0, meta_nuevos_mensual:20, nuevos_activos_mes:0, cp_invitados:0, cp_asistieron:0, cp_matriculados:0, cp_matriculados_override:null, mot_tecnica:0, mot_perdida_clase:0, mot_economico:0, mot_horario:0, mot_graduado:0, mot_otro:0, orig_referido:0, orig_marketing:0, orig_centro:0, orig_activaciones:0, orig_medios:0, orig_por_clasificar:0 })
    }

    if (mAuto) setConfig(c => ({
      ...c,
      nuevos_activos_mes: mAuto.nuevos,
      grupos_activos: mAuto.grupos || c.grupos_activos,
      mot_tecnica: mAuto.mot_tecnica,
      mot_perdida_clase: mAuto.mot_perdida_clase,
      mot_economico: mAuto.mot_economico,
      mot_horario: mAuto.mot_horario,
      mot_graduado: mAuto.mot_graduado,
      mot_otro: mAuto.mot_otro,
    }))

    // Semanas
    const sems = SEMANAS.map(s => {
      const r = kpi?.find(x => x.semana === s)
      if (!r) return emptyW()
      return { cob:[r.cob_d1??'',r.cob_d2??'',r.cob_d3??'',r.cob_d4??'',r.cob_d5??''], des:[r.des_d1??'',r.des_d2??'',r.des_d3??'',r.des_d4??'',r.des_d5??''], ing:[r.ing_d1??'',r.ing_d2??'',r.ing_d3??'',r.ing_d4??'',r.ing_d5??''] }
    })
    setSemanas(sems)

    // Historial: meses cerrados
    setHistorial(hist || [])
    setLoading(false)
  }, [id, year, month])

  useEffect(() => { loadData(); return () => { loadSequence.current++ } }, [loadData])
  useEffect(() => { contarGruposActivos(id).then(n => setGruposModulo(n)).catch(() => {}) }, [id])

  const navMonth = (dir) => {
    let m = month + dir, y = year
    if (m > 12) { m = 1; y++ }
    if (m < 1) { m = 12; y-- }
    setMonth(m); setYear(y)
  }

  async function handleSave() {
    if (mesEstado === 'cerrado') { setStatus('❌ Este mes está cerrado. No se puede editar.'); return }
    setSaving(true); setStatus('')
    try {
      const res = await saveKpiMes(id, year, month, config, semanas)
      if (res.error) throw new Error(res.error)
      setStatus('✅ KPI de ' + NOMBRES_MES[month-1] + ' ' + year + ' guardado.')
      setSaving(false)
      return true
    } catch(e) { setStatus('❌ Error: ' + e.message) }
    setSaving(false)
    return false
  }

  // Sin try/finally, un error del servidor dejaba el botón en "Cerrando…" para
  // siempre y sin mensaje: desde el centro se ve como "no me deja cerrar mes".
  async function handleCerrarMes() {
    if (!confirm('¿Cerrar ' + NOMBRES_MES[month-1] + ' ' + year + '? El mes quedará bloqueado como historial y no podrá editarse.')) return
    setCerrando(true)
    try {
      const res = await cerrarMes(id, year, month, config, semanas)
      if (res?.error) throw new Error(res.error)
      await loadData()
      setStatus(res?.warn ? '🔒 Mes cerrado. ' + res.warn : '🔒 Mes cerrado. Datos guardados como historial.')
    } catch (e) {
      setStatus('❌ Error al cerrar: ' + (e?.message || 'desconocido'))
    } finally {
      setCerrando(false)
    }
  }

  // Un mes cerrado por error no puede quedar congelado para siempre: la
  // administradora lo reabre, corrige y vuelve a cerrar.
  async function handleReabrirMes() {
    if (!confirm('¿Reabrir ' + NOMBRES_MES[month-1] + ' ' + year + '? Volverá a ser editable y tendrás que cerrarlo de nuevo para que quede como historial.')) return
    setCerrando(true)
    try {
      const res = await reabrirMes(id, year, month)
      if (res?.error) throw new Error(res.error)
      await loadData()
      setStatus(res?.warn ? '🔓 Mes reabierto. ⚠️ ' + res.warn : '🔓 Mes reabierto: ya puedes corregirlo. Recuerda cerrarlo otra vez.')
    } catch (e) {
      setStatus('❌ Error al reabrir: ' + (e?.message || 'desconocido'))
    } finally {
      setCerrando(false)
    }
  }

  const ni = parseInt(config.ninos_inicio)||0
  const nA = parseInt(config.nuevos_activos_mes)||0
  const gA = parseInt(config.grupos_activos)||1
  const metaN = parseInt(config.meta_nuevos_mensual)||20
  const totalDes = semanas.reduce((a,s) => a + s.des.reduce((b,v) => b+(parseInt(v)||0), 0), 0)
  const totalIng = semanas.reduce((a,s) => a + s.ing.reduce((b,v) => b+(parseInt(v)||0), 0), 0)
  const retiradosOperativos = motivosAuto ? motivosAuto.total : totalDes
  const reincorporados = motivosAuto?.reincorporados || 0
  const ninosFinalCalculado = Math.max(0, ni + nA + reincorporados - retiradosOperativos)
  const ninosFinal = finalVisibleKpi({ estado: mesEstado, guardado: finalGuardado, calculado: ninosFinalCalculado })
  const ajusteHistorico = ajusteHistoricoKpi({ estado: mesEstado, inicioGuardado: ni, cierreAnterior: cierreAnterior?.valor })
  const promG = gA > 0 ? ninosFinal / gA : 0
  const pcv = promG > 0 ? (120/promG) + 16 : 0
  const gpn = ninosFinal > 0 ? (((ninosFinal*108)*(1-pcv/100)-7800)/ninosFinal) : 0

  const upd = (semIdx, tipo, di, val) => setSemanas(p => p.map((s,i) => i===semIdx ? {...s,[tipo]:s[tipo].map((d,j) => j===di?val:d)} : s))
  const weekInput = (semIdx, tipo, day, presentation) => {
    const inputId = `kpi-${presentation}-${semIdx}-${tipo}-${day}`
    const metric = KPI_METRICS.find(item=>item.tipo === tipo)
    return <>
      {presentation === 'desktop' && <label htmlFor={inputId} className="sr-only">{`${metric.label} · semana ${SEMANAS[semIdx]} · día ${day+1}`}</label>}
      <input id={inputId} name={`semanas.${semIdx}.${tipo}.${day}`} type="number" inputMode="numeric" min="0"
        value={semanas[semIdx][tipo][day]} onChange={e=>upd(semIdx,tipo,day,e.target.value)} disabled={locked || (autoIngDes && tipo !== 'cob')}
        className="input num kpi-mobile-input" />
    </>
  }
  const badge = ok => <span className={`pill ${ok ? 'pill--ok' : 'pill--bad'}`}><span className="dot" />{ok ? 'Sí' : 'No'}</span>
  const locked = mesEstado === 'cerrado'
  // (g1-20) Solo el estado 'auto' bloquea ventas y retiros (el CERO también es
  // auto); en 'fallo' quedan editables con la advertencia visible.
  const autoIngDes = kpiAuto?.estado === 'auto'
  const cpDerivado = autoIngDes ? kpiAuto.cp : null
  // Sincronización de los campos de RESUMEN (clase de prueba, motivos, origen
  // comercial). Es independiente del motor semanal: su fallo NO bloquea el KPI.
  const automatic = autoSync?.ok === true
  const syncFailed = autoSync?.ok === false
  const autoPeriod = automatic

  const kpiRow = (tipo, label, semIdx) => {
    const s = semanas[semIdx], dias = s[tipo]
    const res = calcRes(tipo, dias), meta = calcMeta(tipo, ni, metaN)
    const ok = cumple(tipo, res, meta)
    const resColor = tipo==='cob' ? 'var(--text)' : tipo==='des' ? 'var(--bad)' : 'var(--ok)'
    const deModulo = autoIngDes && (tipo === 'ing' || tipo === 'des')
    return (
      <tr key={tipo}>
        <td style={{padding:'8px 16px',width:210,fontWeight:600,color:'var(--text-muted)',fontSize: 13}}>
          {label}
          {deModulo && <span style={{ display: 'block', fontSize: 13, color: 'var(--ok-text)', fontWeight: 500 }}>🔗 del módulo</span>}
        </td>
        {dias.map((d,di) => <td key={di} style={{padding:'5px 3px',textAlign:'center'}}>{weekInput(semIdx,tipo,di,'desktop')}</td>)}
        <td className="num" style={{padding:'5px 8px',textAlign:'center',fontWeight:700,color:resColor,minWidth:50}}>{res}</td>
        <td className="num" style={{padding:'5px 6px',textAlign:'center',color:'var(--text-dim)',fontSize: 13}}>{meta}</td>
        <td style={{padding:'5px 6px',textAlign:'center'}}>{badge(ok)}</td>
      </tr>
    )
  }

  if (loading) return (
    <div className="shell center-core-shell">
      <Sidebar rol="usuario" centroNombre={centroNombre || 'Centro'} centroId={id} />
      <main id="main-content" data-page-state="loading" className="main kpi-page">
        <CentroNavigation centroId={id} />
        <div className="empty" role="status" aria-live="polite">Cargando KPI…</div>
      </main>
    </div>
  )

  if (loadError) return <div className="shell center-core-shell">
    <Sidebar rol="usuario" centroNombre={centroNombre || 'Centro'} centroId={id} />
    <main id="main-content" data-page-state="error" className="main kpi-page">
      <CentroNavigation centroId={id} />
      <div role="alert" className="alert alert--error">{loadError}</div>
    </main>
  </div>

  // Estilo input de "Configuración" / cards de categoría
  const cfgInput = (key, full, bloqueado = false) => (
    <input id={`kpi-config-${key}`} name={`config.${key}`} inputMode="numeric" type="number" min="0" value={config[key]} disabled={locked || bloqueado}
      onChange={e=>setConfig(c=>({...c,[key]:e.target.value}))}
      className="input num"
      style={{ width: full ? '100%' : 65, padding: full ? '10px 12px' : '6px 8px', textAlign: full ? 'left' : 'center', opacity: (locked || bloqueado) ? 0.6 : 1, background: (locked || bloqueado) ? 'var(--surface-3)' : 'var(--bg)' }}/>
  )

  return (
    <div className="shell center-core-shell">
      <Sidebar rol="usuario" centroNombre={centroNombre} centroId={id}/>
      <main id="main-content" data-page-state="ready" className="main kpi-page">
        <CentroNavigation centroId={id} />

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Captura mensual · KPI</div>
            <h1 className="h-title">Registro KPI Mensual</h1>
            <p className="h-sub">{centroNombre}</p>
          </div>
          <div className="kpi-page-actions">
            {locked ? (
              esAsistente
                ? <span className="label" style={{ color: 'var(--text-faint)' }}>Mes cerrado — lo reabre el administrador del centro</span>
                : (
                  <button onClick={handleReabrirMes} disabled={cerrando} className="btn" data-tour="kpi.reabrir">
                    {cerrando ? 'Reabriendo…' : 'Reabrir mes'}
                  </button>
                )
            ) : (
              <>
                <button onClick={handleSave} disabled={saving} className="btn btn--primary" data-tour="kpi.guardar">
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                {!esAsistente && (
                  <button onClick={handleCerrarMes} disabled={cerrando} className="btn" data-tour="kpi.cerrar-mes">
                    {cerrando ? 'Cerrando…' : 'Cerrar mes'}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Estado del mes */}
        {locked && (
          <div className="alert" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: 'var(--warn-text)', marginBottom: 16 }}>
            Mes cerrado — Solo lectura. Los datos están guardados como historial. Si quedó mal, usa “Reabrir mes”, corrige y vuelve a cerrarlo.
          </div>
        )}

        {!locked && automatic && (
          <div className="alert" style={{ marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: 'var(--ok)' }}>
            Sincronizado con Clases de Prueba, Grupos y Cuadro de Negocio.{autoSync.adjusted ? ' Se conserva el ajuste inicial de agosto.' : ''}
          </div>
        )}

        {!locked && syncFailed && (
          <div role="alert" className="alert alert--error" style={{ marginBottom: 16 }}>
            {autoSync.error || 'No se pudo sincronizar el KPI.'} Clase de prueba, motivos y origen comercial quedan con los últimos valores guardados: revísalos antes de guardar.
          </div>
        )}

        {status && (
          <div role={status.includes('❌') ? 'alert' : 'status'} aria-live="polite" className={`alert ${status.includes('❌') ? 'alert--error' : ''}`}
            style={status.includes('❌') ? { marginBottom: 16 } : { marginBottom: 16, background: status.includes('🔒') ? 'var(--warn-bg)' : 'var(--ok-bg)', border: `1px solid ${status.includes('🔒') ? 'var(--warn-line)' : 'var(--ok-line)'}`, color: status.includes('🔒') ? 'var(--warn-text)' : 'var(--ok-text)' }}>
            {status.replace(/^[❌✅🔒]\s*/, '')}
          </div>
        )}

        {/* Navegador de mes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button aria-label="Mes anterior" onClick={()=>navMonth(-1)} className="btn" style={{ padding: '10px 16px', fontSize: 16 }}>‹</button>
          <div className="card kpi-month-title" style={{ padding: '12px 16px', textAlign: 'center' }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{NOMBRES_MES[month-1]}</p>
            <p className="num" style={{ fontSize: 15, color: 'var(--text-dim)', margin: 0 }}>{year}</p>
          </div>
          <button aria-label="Mes siguiente" onClick={()=>navMonth(1)} className="btn" style={{ padding: '10px 16px', fontSize: 16 }}>›</button>
          {historial.length > 0 && (
            <div style={{ marginLeft: 16, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }} data-tour="kpi.historial">
              <span className="label">Historial cerrado:</span>
              {historial.map(h => {
                const on = year===h.year && month===h.month
                return (
                  <button className="btn" key={h.year+'-'+h.month} onClick={()=>{setYear(h.year);setMonth(h.month)}}
                    style={{ padding: '4px 11px', background: on ? 'var(--ts-green-soft)' : 'transparent', color: on ? 'var(--ts-green)' : 'var(--text-dim)', border: `1px solid ${on ? 'var(--ts-green-line)' : 'var(--border-strong)'}`, borderRadius: 'var(--r-pill)', fontFamily: 'var(--font-mono)', fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
                    {NOMBRES_MES[h.month-1].slice(0,3)} {h.year}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Config del mes */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }} data-tour="kpi.config">
          <h3 className="label" style={{ marginBottom: 14 }}>Configuración — {NOMBRES_MES[month-1]} {year}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14 }}>
            {[['Niños inicio mes','ninos_inicio'],['Grupos activos','grupos_activos'],['Meta ingresos venta (mensual)','meta_nuevos_mensual']].map(([lbl,key]) => (
              <div key={key} className="field">
                <label htmlFor={`kpi-config-${key}`} className="label">{lbl}</label>
                {cfgInput(key, true, (key === 'ninos_inicio' && !!arrastrado) || (autoPeriod && key !== 'meta_nuevos_mensual'))}
                {key === 'ninos_inicio' && arrastrado && (
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                    🔗 Arrastrado del cierre de {NOMBRES_MES[arrastrado.month-1]}: los meses encadenan y este número no se digita.
                  </span>
                )}
                {key === 'ninos_inicio' && ajusteHistorico !== null && (
                  <span style={{ fontSize: 13, color: 'var(--warn)' }}>
                    Ajuste histórico: {ajusteHistorico > 0 ? '+' : ''}{ajusteHistorico} vs cierre de {NOMBRES_MES[cierreAnterior.month-1]}.
                  </span>
                )}
                {key === 'grupos_activos' && gruposModulo !== null && (
                  <span style={{ fontSize: 13, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    El módulo de grupos cuenta {gruposModulo} activos
                    <button onClick={()=>setConfig(c=>({...c,grupos_activos:gruposModulo}))} disabled={locked || autoPeriod}
                      className="btn" style={{ padding: '2px 8px', fontSize: 13 }}>Usar</button>
                  </span>
                )}
              </div>
            ))}
            <div className="field">
              <label htmlFor="kpi-total-ing" className="label">Nuevos ingresos venta</label>
              <input id="kpi-total-ing" name="totals.ing" inputMode="numeric" min="0" type="number" value={totalIng} disabled className="input num" style={{ width: '100%', padding: '10px 12px', opacity: 0.75, background: 'var(--surface-3)' }} />
            </div>
            <div className="field">
              <label htmlFor="kpi-config-nuevos_activos_mes" className="label">Nuevos activos del mes</label>
              {cfgInput('nuevos_activos_mes', true, autoPeriod || !!motivosAuto)}
              {motivosAuto && <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{nA} inicio{nA === 1 ? '' : 's'} de clase declarado{nA === 1 ? '' : 's'} en Cuadro de Negocio</span>}
            </div>
          </div>
        </div>

        {/* Indicadores calculados */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 16 }}>
          {[
            {l:'Retiros del mes', v:retiradosOperativos, c:'var(--bad)'},
            {l:'Nuevos ingresos venta', v:totalIng, c:'var(--ok)'},
            // (g1-17) Traslados aparte: entran al centro pero NO son venta
            // nueva, por eso jamás suman en ing_* ni en la meta comercial.
            ...(autoIngDes ? [{l:'Traslados (fuera de venta)', v:kpiAuto.traslados, c:'var(--text-dim)'}] : []),
            {l:'Nuevos activos del mes', v:nA, c:'var(--ok)'},
            {l:'Niños Final Mes', v:ninosFinal, c:'var(--text)'},
            {l:'Prom. Niños/Grupo', v:promG.toFixed(2), c:promG>=8?'var(--ok)':'var(--bad)', m:'≥ 8', ok:promG>=8},
            {l:'%CV', v:pcv.toFixed(1)+'%', c:'var(--text)'},
          ].map(({l,v,c,m,ok}) => (
            <div key={l} className="kpi" style={{ padding: '16px 16px 14px' }}>
              <div className="kpi__top"><span className="label">{l}</span></div>
              <div className="kpi__value num" style={{ fontSize: 28, color: c }}>{v}</div>
              {m && <div className="kpi__sub" style={{ color: ok ? 'var(--ok)' : 'var(--bad)' }}>{ok ? '✓ meta '+m : '✗ meta '+m}</div>}
            </div>
          ))}
        </div>

        {/* GPN */}
        <div className="card" style={{ background: gpn>=0 ? 'var(--ok-bg)' : 'var(--bad-bg)', border: `1px solid ${gpn>=0 ? 'var(--ok-line)' : 'var(--bad-line)'}`, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span className="label" style={{ color: gpn>=0 ? 'var(--ok-text)' : 'var(--bad-text)' }}>GPN — Ganancia por Niño:</span>
          <span className="num" style={{ fontSize: 24, fontWeight: 700, color: gpn>=0 ? 'var(--ok)' : 'var(--bad)', fontFamily: 'var(--font-serif)' }}>${gpn.toFixed(2)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-dim)', flex: 1 }}>= ((niños final × 108) × (1 − %CV/100) − 7800) ÷ niños final</span>
        </div>

        {/* KPI sin manos: fuente visible y fallback explícito (g1-20) */}
        {!locked && autoIngDes && (
          <div className="alert" style={{ background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: 'var(--ok-text)', marginBottom: 16 }}>
            🔗 Ventas y retiros vienen del módulo (inscripciones y retiros registrados; el cero también cuenta). Para cambiarlos, corrige el evento del niño — aquí no se digitan.
          </div>
        )}
        {!locked && kpiAuto?.estado === 'fallo' && (
          <div className="alert" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: 'var(--warn-text)', marginBottom: 16 }}>
            ⚠️ El cálculo automático falló: {kpiAuto.mensaje} Mientras se repara el dato, ventas y retiros quedan editables a mano.
          </div>
        )}

        {/* Tabla KPI semanal */}
        <div className="panel desktop-only" style={{ marginBottom: 20 }}>
          <TableScroller label="KPI semanal">
            <table className="table">
              <caption className="sr-only">KPI semanal</caption>
              <thead>
                <tr>
                  <th style={{ width: 210 }}>Semana / Indicador</th>
                  {['Día 1','Día 2','Día 3','Día 4','Día 5'].map(d=><th key={d} style={{ textAlign: 'center', width: 70 }}>{d}</th>)}
                  <th style={{ textAlign: 'center', width: 65 }}>Resultado</th>
                  <th style={{ textAlign: 'center', width: 60 }}>Meta</th>
                  <th style={{ textAlign: 'center', width: 65 }}>¿Cumple?</th>
                </tr>
              </thead>
              <tbody>
                {SEMANAS.map((s,i) => (
                  <Fragment key={s}>
                    <tr key={'sh'+i} style={{ cursor: 'default', background: 'var(--surface-2)' }}>
                      <td colSpan={9} className="label" style={{ padding: '8px 16px', color: 'var(--ok-text)' }}>Semana {s}</td>
                    </tr>
                    {KPI_METRICS.map(metric=>kpiRow(metric.tipo,metric.label,i))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </TableScroller>
        </div>
        <div className="mobile-only operational-list kpi-week-cards">
          {SEMANAS.flatMap((week,semIdx)=>KPI_METRICS.map(({tipo,label})=>{
            const result = calcRes(tipo,semanas[semIdx][tipo]), goal = calcMeta(tipo,ni,metaN)
            return <OperationalCard key={`${week}-${tipo}`} headingLevel={2} title={`Semana ${week} · ${label}`}
              subtitle={autoIngDes && tipo !== 'cob' ? 'Del módulo · solo lectura' : undefined}
              fields={[
                ...[0,1,2,3,4].map(day=>({label:<label htmlFor={`kpi-mobile-${semIdx}-${tipo}-${day}`} className="kpi-day-label">Día {day+1}</label>,value:weekInput(semIdx,tipo,day,'mobile')})),
                {label:'Resultado',value:result}, {label:'Meta',value:goal}, {label:'¿Cumple?',value:badge(cumple(tipo,result,goal))},
              ]} />
          }))}
        </div>

        {/* Clase de prueba / Motivos / Origen */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 16, marginBottom: 20 }}>
          {[
            {title:'Clase de Prueba', accent:'var(--ts-green)', auto:autoPeriod, source:automatic ? (autoIngDes && cpDerivado == null ? 'Invitados y asistentes sincronizados. Matrículas: valor guardado mientras se completa la clasificación.' : 'Datos sincronizados desde Clases de Prueba.') : 'Última foto guardada; sincronización pendiente.', fields:[['Invitados','cp_invitados'],['Asistieron','cp_asistieron'],['Matriculados','cp_matriculados']]},
            {title:'Motivo Deserción', accent:'var(--bad)', auto:autoPeriod || !!motivosAuto, source:automatic ? 'Datos sincronizados desde los retiros registrados.' : syncFailed ? 'Última foto guardada; sincronización pendiente.' : '', fields:[['Técnica','mot_tecnica'],['Pérdida de clase','mot_perdida_clase'],['Económico','mot_economico'],['Horario','mot_horario'],['Graduado 🎓','mot_graduado'],['Otro','mot_otro']]},
            {title:'Origen Nuevos Ingresos', accent:'var(--ok)', auto:autoPeriod, source:automatic ? 'Datos sincronizados desde las inscripciones.' : 'Última foto guardada; sincronización pendiente.', fields:[['Referido','orig_referido'],['Marketing','orig_marketing'],['Centro','orig_centro'],['Activaciones','orig_activaciones'],['Medios','orig_medios'],['Por clasificar','orig_por_clasificar']]},
          ].map(({title,accent,fields,auto,source}) => (
            <div key={title} className="panel">
              <div className="panel__head" style={{ padding: '12px 16px', borderTop: `2px solid ${accent}` }}>
                <span className="label">{title}</span>
              </div>
              <div style={{ padding: 14 }}>
                {auto && (
                  <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.5 }}>
                    {source || `Se llena con los ${motivosAuto?.total || 0} retiros registrados este mes.`}
                  </div>
                )}
                {fields.map(([lbl,key]) => {
                  // (g1-21) cp_matriculados: efectivo = override ?? derivado.
                  // Editar fija el override; "Usar valor del módulo" lo limpia.
                  // Invitados/Asistieron siguen manuales: el módulo no los sabe.
                  if (key === 'cp_matriculados') {
                    const override = config.cp_matriculados_override
                    const tieneOverride = override !== null && override !== undefined && override !== ''
                    const efectivo = override ?? cpDerivado ?? config.cp_matriculados
                    return (
                      <div key={key} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label htmlFor="kpi-config-cp_matriculados" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{lbl}</label>
                          <input id="kpi-config-cp_matriculados" name="config.cp_matriculados_override" inputMode="numeric" type="number" min="0" value={efectivo} disabled={locked}
                            onChange={e=>setConfig(c=>({...c, cp_matriculados_override: e.target.value}))}
                            className="input num"
                            style={{ width: 65, padding: '6px 8px', textAlign: 'center', opacity: locked ? 0.6 : 1, background: locked ? 'var(--surface-3)' : 'var(--bg)' }}/>
                        </div>
                        {cpDerivado != null && (
                          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                            {tieneOverride ? (
                              <>
                                <span>Ajustado a mano · del módulo: {cpDerivado}</span>
                                <button onClick={()=>setConfig(c=>({...c, cp_matriculados_override: null}))} disabled={locked}
                                  className="btn" style={{ padding: '2px 8px', fontSize: 13 }}>Usar valor del módulo</button>
                              </>
                            ) : (
                              <span>🔗 del módulo</span>
                            )}
                          </div>
                        )}
                        {autoIngDes && cpDerivado == null && (
                          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4, lineHeight: 1.5 }}>
                            {tieneOverride ? 'Se conserva tu ajuste manual. ' : 'Se conserva el valor guardado. '}
                            Falta clasificar el origen de algunas ventas para calcular las matrículas de prueba.
                          </div>
                        )}
                      </div>
                    )
                  }
                  return (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <label htmlFor={`kpi-config-${key}`} style={{ fontSize: 13, color: 'var(--text-muted)' }}>{lbl}</label>
                      {cfgInput(key, false, !!auto)}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Nota fórmulas */}
        <div className="card" style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--ok-text)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Fórmulas ALOHA:</strong> Cobranza = último día | Retiros = suma | Ventas = suma | Niños final = inicio + nuevos activos + reincorporados − retirados | Meta Cob = niños×1.5%÷5 | Meta Des = niños×8%÷5 | %CV = (120÷prom)+16 | GPN = ((niños×108)×(1−%CV%)−7800)÷niños
        </div>
      </main>
    </div>
  )
}
