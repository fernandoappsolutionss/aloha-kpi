'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { loadKpiMes, saveKpiMes, cerrarMes, reabrirMes } from '../../../actions/kpi'
import { contarGruposActivos } from '../../../actions/grupos'

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const SEMANAS = [1, 2, 3, 4, 5]

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
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [centroNombre, setCentroNombre] = useState('')
  const [mesEstado, setMesEstado] = useState('abierto')
  const [saving, setSaving] = useState(false)
  const [cerrando, setCerrando] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState({ ninos_inicio:0, grupos_activos:0, meta_nuevos_mensual:20, nuevos_activos_mes:0, cp_invitados:0, cp_asistieron:0, cp_matriculados:0, mot_tecnica:0, mot_perdida_clase:0, mot_economico:0, mot_horario:0, mot_graduado:0, mot_otro:0, orig_referido:0, orig_marketing:0, orig_centro:0, orig_activaciones:0, orig_medios:0 })
  const [semanas, setSemanas] = useState(SEMANAS.map(() => emptyW()))
  const [historial, setHistorial] = useState([])
  // Cierre del mes anterior: encadena como "niños inicio" de este mes.
  const [arrastrado, setArrastrado] = useState(null)
  // Motivos de deserción que vienen del módulo (retiros registrados).
  const [motivosAuto, setMotivosAuto] = useState(null)
  const [gruposModulo, setGruposModulo] = useState(null) // conteo del módulo de grupos

  const loadData = useCallback(async () => {
    setLoading(true); setStatus('')
    let datos
    try {
      datos = await loadKpiMes(id, year, month)
    } catch (e) {
      // Sin este catch la página se quedaba en "Cargando…" para siempre.
      setStatus('❌ No se pudo cargar el KPI: ' + (e?.message || 'desconocido'))
      setLoading(false)
      return
    }
    const { centroNombre: cNombre, estado, resumen: res, semanas: kpi, historial: hist, inicioArrastrado: arr, motivosAuto: mAuto } = datos
    setCentroNombre(cNombre || '')
    setMesEstado(estado || 'abierto')
    setArrastrado(arr || null)
    setMotivosAuto(mAuto || null)

    // Resumen del mes. El "niños inicio" se arrastra del cierre del mes
    // anterior cuando existe (el servidor también lo impone al guardar).
    if (res) {
      setConfig({ ninos_inicio: arr ? arr.valor : (res.ninos_inicio_mes||0), grupos_activos: res.grupos_activos||0, meta_nuevos_mensual: res.meta_nuevos_mensual||20, nuevos_activos_mes: res.nuevos_activos_mes||0, cp_invitados: res.cp_invitados||0, cp_asistieron: res.cp_asistieron||0, cp_matriculados: res.cp_matriculados||0, mot_tecnica: res.mot_tecnica||0, mot_perdida_clase: res.mot_perdida_clase||0, mot_economico: res.mot_economico||0, mot_horario: res.mot_horario||0, mot_graduado: res.mot_graduado||0, mot_otro: res.mot_otro||0, orig_referido: res.orig_referido||0, orig_marketing: res.orig_marketing||0, orig_centro: res.orig_centro||0, orig_activaciones: res.orig_activaciones||0, orig_medios: res.orig_medios||0 })
    } else {
      setConfig({ ninos_inicio: arr ? arr.valor : 0, grupos_activos:0, meta_nuevos_mensual:20, nuevos_activos_mes:0, cp_invitados:0, cp_asistieron:0, cp_matriculados:0, mot_tecnica:0, mot_perdida_clase:0, mot_economico:0, mot_horario:0, mot_graduado:0, mot_otro:0, orig_referido:0, orig_marketing:0, orig_centro:0, orig_activaciones:0, orig_medios:0 })
    }

    if (mAuto) setConfig(c => ({ ...c, mot_tecnica: mAuto.mot_tecnica, mot_perdida_clase: mAuto.mot_perdida_clase, mot_economico: mAuto.mot_economico, mot_horario: mAuto.mot_horario, mot_graduado: mAuto.mot_graduado, mot_otro: mAuto.mot_otro }))

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

  useEffect(() => { loadData() }, [loadData])
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
    } catch(e) { setStatus('❌ Error: ' + e.message) }
    setSaving(false)
  }

  // Sin try/finally, un error del servidor dejaba el botón en "Cerrando…" para
  // siempre y sin mensaje: desde el centro se ve como "no me deja cerrar mes".
  async function handleCerrarMes() {
    if (!confirm('¿Cerrar ' + NOMBRES_MES[month-1] + ' ' + year + '? El mes quedará bloqueado como historial y no podrá editarse.')) return
    setCerrando(true)
    try {
      await handleSave()
      const res = await cerrarMes(id, year, month)
      if (res?.error) throw new Error(res.error)
      setMesEstado('cerrado')
      setStatus(res?.warn ? '🔒 Mes cerrado. ' + res.warn : '🔒 Mes cerrado. Datos guardados como historial.')
    } catch (e) {
      setStatus('❌ Error al cerrar: ' + (e?.message || 'desconocido'))
    }
    setCerrando(false)
  }

  async function handleReabrirMes() {
    if (!confirm('¿Reabrir ' + NOMBRES_MES[month-1] + ' ' + year + ' para edición?')) return
    try {
      const res = await reabrirMes(id, year, month)
      if (res?.error) throw new Error(res.error)
      setMesEstado('abierto'); setStatus('✅ Mes reabierto para edición.')
    } catch (e) {
      setStatus('❌ Error al reabrir: ' + (e?.message || 'desconocido'))
    }
  }

  const ni = parseInt(config.ninos_inicio)||0
  const nA = parseInt(config.nuevos_activos_mes)||0
  const gA = parseInt(config.grupos_activos)||1
  const metaN = parseInt(config.meta_nuevos_mensual)||20
  const totalDes = semanas.reduce((a,s) => a + s.des.reduce((b,v) => b+(parseInt(v)||0), 0), 0)
  const totalIng = semanas.reduce((a,s) => a + s.ing.reduce((b,v) => b+(parseInt(v)||0), 0), 0)
  const ninosFinal = Math.max(0, ni + nA - totalDes)
  const promG = gA > 0 ? ninosFinal / gA : 0
  const pcv = promG > 0 ? (120/promG) + 16 : 0
  const gpn = ninosFinal > 0 ? (((ninosFinal*108)*(1-pcv/100)-7800)/ninosFinal) : 0

  const upd = (semIdx, tipo, di, val) => setSemanas(p => p.map((s,i) => i===semIdx ? {...s,[tipo]:s[tipo].map((d,j) => j===di?val:d)} : s))
  const inp = (val, onChange, disabled) => <input type="number" min="0" value={val} onChange={e=>onChange(e.target.value)} disabled={disabled} className="num" style={{width:58,padding:'5px 6px',border:'1px solid var(--border-strong)',borderRadius:6,fontSize:13,textAlign:'center',background:disabled?'var(--surface-3)':'var(--bg)',color:'var(--text)',outline:'none',opacity:disabled?0.6:1}}/>
  const badge = ok => <span className={`pill ${ok ? 'pill--ok' : 'pill--bad'}`}><span className="dot" />{ok ? 'Sí' : 'No'}</span>
  const locked = mesEstado === 'cerrado'

  const kpiRow = (tipo, label, semIdx) => {
    const s = semanas[semIdx], dias = s[tipo]
    const res = calcRes(tipo, dias), meta = calcMeta(tipo, ni, metaN)
    const ok = cumple(tipo, res, meta)
    const resColor = tipo==='cob' ? 'var(--text)' : tipo==='des' ? 'var(--bad)' : 'var(--ok)'
    return (
      <tr key={tipo}>
        <td style={{padding:'8px 16px',width:210,fontWeight:600,color:'var(--text-muted)',fontSize:12}}>{label}</td>
        {dias.map((d,di) => <td key={di} style={{padding:'5px 3px',textAlign:'center'}}>{inp(d, v => upd(semIdx,tipo,di,v), locked)}</td>)}
        <td className="num" style={{padding:'5px 8px',textAlign:'center',fontWeight:700,color:resColor,minWidth:50}}>{res}</td>
        <td className="num" style={{padding:'5px 6px',textAlign:'center',color:'var(--text-dim)',fontSize:12}}>{meta}</td>
        <td style={{padding:'5px 6px',textAlign:'center'}}>{badge(ok)}</td>
      </tr>
    )
  }

  if (loading) return <div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center',background:'var(--bg)',color:'var(--text-dim)'}}>Cargando…</div>

  // Estilo input de "Configuración" / cards de categoría
  const cfgInput = (key, full, bloqueado = false) => (
    <input type="number" min="0" value={config[key]} disabled={locked || bloqueado}
      onChange={e=>setConfig(c=>({...c,[key]:e.target.value}))}
      className="input num"
      style={{ width: full ? '100%' : 65, padding: full ? '10px 12px' : '6px 8px', textAlign: full ? 'left' : 'center', opacity: (locked || bloqueado) ? 0.6 : 1, background: (locked || bloqueado) ? 'var(--surface-3)' : 'var(--bg)' }}/>
  )

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={centroNombre} centroId={id}/>
      <main className="main">

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Captura mensual · KPI</div>
            <h1 className="h-title">Registro KPI Mensual</h1>
            <p className="h-sub">{centroNombre}</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {!locked ? (
              <>
                <button onClick={handleSave} disabled={saving} className="btn btn--primary">
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
                <button onClick={handleCerrarMes} disabled={cerrando} className="btn">
                  {cerrando ? 'Cerrando…' : 'Cerrar mes'}
                </button>
              </>
            ) : (
              <button onClick={handleReabrirMes} className="btn" style={{ borderColor: 'var(--warn-line)', color: 'var(--warn)' }}>
                Reabrir mes
              </button>
            )}
          </div>
        </div>

        {/* Estado del mes */}
        {locked && (
          <div className="alert" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: '#FCD34D', marginBottom: 16 }}>
            Mes cerrado — Solo lectura. Los datos están guardados como historial.
          </div>
        )}

        {status && (
          <div className={`alert ${status.includes('❌') ? 'alert--error' : ''}`}
            style={status.includes('❌') ? { marginBottom: 16 } : { marginBottom: 16, background: status.includes('🔒') ? 'var(--warn-bg)' : 'var(--ok-bg)', border: `1px solid ${status.includes('🔒') ? 'var(--warn-line)' : 'var(--ok-line)'}`, color: status.includes('🔒') ? '#FCD34D' : '#6EE7B7' }}>
            {status.replace(/^[❌✅🔒]\s*/, '')}
          </div>
        )}

        {/* Navegador de mes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <button onClick={()=>navMonth(-1)} className="btn" style={{ padding: '10px 16px', fontSize: 16 }}>‹</button>
          <div className="card" style={{ padding: '12px 28px', textAlign: 'center', minWidth: 180 }}>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500, color: 'var(--text)', margin: 0 }}>{NOMBRES_MES[month-1]}</p>
            <p className="num" style={{ fontSize: 12, color: 'var(--text-dim)', margin: 0 }}>{year}</p>
          </div>
          <button onClick={()=>navMonth(1)} className="btn" style={{ padding: '10px 16px', fontSize: 16 }}>›</button>
          {historial.length > 0 && (
            <div style={{ marginLeft: 16, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className="label">Historial cerrado:</span>
              {historial.map(h => {
                const on = year===h.year && month===h.month
                return (
                  <button key={h.year+'-'+h.month} onClick={()=>{setYear(h.year);setMonth(h.month)}}
                    style={{ padding: '4px 11px', background: on ? 'var(--ts-green-soft)' : 'transparent', color: on ? 'var(--ts-green)' : 'var(--text-dim)', border: `1px solid ${on ? 'var(--ts-green-line)' : 'var(--border-strong)'}`, borderRadius: 'var(--r-pill)', fontFamily: 'var(--font-mono)', fontSize: 11, cursor: 'pointer', fontWeight: 500 }}>
                    {NOMBRES_MES[h.month-1].slice(0,3)} {h.year}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Config del mes */}
        <div className="card" style={{ padding: 18, marginBottom: 16 }}>
          <h3 className="label" style={{ marginBottom: 14 }}>Configuración — {NOMBRES_MES[month-1]} {year}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {[['Niños inicio mes','ninos_inicio'],['Grupos activos','grupos_activos'],['Meta ingresos venta (mensual)','meta_nuevos_mensual'],['Nuevos ingresos venta','nuevos_activos_mes']].map(([lbl,key]) => (
              <div key={key} className="field">
                <label className="label">{lbl}</label>
                {cfgInput(key, true, key === 'ninos_inicio' && !!arrastrado)}
                {key === 'ninos_inicio' && arrastrado && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                    🔗 Arrastrado del cierre de {NOMBRES_MES[arrastrado.month-1]}: los meses encadenan y este número no se digita.
                  </span>
                )}
                {key === 'grupos_activos' && gruposModulo !== null && (
                  <span style={{ fontSize: 11, color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    El módulo de grupos cuenta {gruposModulo} activos
                    <button onClick={()=>setConfig(c=>({...c,grupos_activos:gruposModulo}))} disabled={locked}
                      className="btn" style={{ padding: '2px 8px', fontSize: 11 }}>Usar</button>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Indicadores calculados */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 14, marginBottom: 16 }}>
          {[
            {l:'Total Deserción', v:totalDes, c:'var(--bad)'},
            {l:'Total Nuevos', v:totalIng, c:'var(--ok)'},
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
          <span className="label" style={{ color: gpn>=0 ? '#6EE7B7' : '#FCA5A5' }}>GPN — Ganancia por Niño:</span>
          <span className="num" style={{ fontSize: 24, fontWeight: 700, color: gpn>=0 ? 'var(--ok)' : 'var(--bad)', fontFamily: 'var(--font-serif)' }}>${gpn.toFixed(2)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-dim)', flex: 1 }}>= ((niños final × 108) × (1 − %CV/100) − 7800) ÷ niños final</span>
        </div>

        {/* Tabla KPI semanal */}
        <div className="panel" style={{ marginBottom: 20 }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
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
                  <>
                    <tr key={'sh'+i} style={{ cursor: 'default', background: 'var(--surface-2)' }}>
                      <td colSpan={9} className="label" style={{ padding: '8px 16px', color: 'var(--ts-green)' }}>Semana {s}</td>
                    </tr>
                    {kpiRow('cob','Cobranza Vencida (N°)',i)}
                    {kpiRow('des','Deserción (Retirados)',i)}
                    {kpiRow('ing','Nuevos Ingresos - Ventas',i)}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Clase de prueba / Motivos / Origen */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          {[
            {title:'Clase de Prueba', accent:'var(--ts-green)', fields:[['Invitados','cp_invitados'],['Asistieron','cp_asistieron'],['Matriculados','cp_matriculados']]},
            {title:'Motivo Deserción', accent:'var(--bad)', auto: !!motivosAuto, fields:[['Técnica','mot_tecnica'],['Pérdida de clase','mot_perdida_clase'],['Económico','mot_economico'],['Horario','mot_horario'],['Graduado 🎓','mot_graduado'],['Otro','mot_otro']]},
            {title:'Origen Nuevos Ingresos', accent:'var(--ok)', fields:[['Referido','orig_referido'],['Marketing','orig_marketing'],['Centro','orig_centro'],['Activaciones','orig_activaciones'],['Medios','orig_medios']]},
          ].map(({title,accent,fields,auto}) => (
            <div key={title} className="panel">
              <div className="panel__head" style={{ padding: '12px 16px', borderTop: `2px solid ${accent}` }}>
                <span className="label">{title}</span>
              </div>
              <div style={{ padding: 14 }}>
                {auto && (
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 10, lineHeight: 1.5 }}>
                    🔗 Se llena solo con los {motivosAuto.total} retiro{motivosAuto.total === 1 ? '' : 's'} registrado{motivosAuto.total === 1 ? '' : 's'} este mes en Cuadro de Negocio o Grupos. Para cambiarlo, corrige el motivo al retirar al niño.
                  </div>
                )}
                {fields.map(([lbl,key]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{lbl}</span>
                    {cfgInput(key, false, !!auto)}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Nota fórmulas */}
        <div className="card" style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.7 }}>
          <strong style={{ color: 'var(--ts-green)', fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>Fórmulas ALOHA:</strong> Cobranza = último día | Deserción = suma | Nuevos = suma | Meta Cob = niños×1.5%÷5 | Meta Des = niños×8%÷5 | %CV = (120÷prom)+16 | GPN = ((niños×108)×(1−%CV%)−7800)÷niños
        </div>
      </main>
    </div>
  )
}
