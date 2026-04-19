'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../../components/Sidebar'
import { supabase } from '../../../../lib/supabase'

const MESES = ['Enero', 'Febrero', 'Marzo']
const SEMANAS = [1, 2, 3, 4, 5]
const DIAS = ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5']
const A = { blue: '#1B4580', blueMid: '#1D5FA6', green: '#4A8C3F', lime: '#B8D432', red: '#D63C3C', orange: '#E67E22', gray: '#F5F7FA', text: '#1A2744' }

// ======= FÓRMULAS SEGÚN EXCEL KPI ALOHA =======
// COBRANZA: Resultado = ÚLTIMO día ingresado (no suma). Meta = (niños_inicio × 1.5%) / 5. Cumple = Meta > Resultado
// DESERCIÓN: Resultado = SUMA todos los días. Meta = (niños_inicio × 8%) / 5. Cumple = Meta >= Resultado
// NUEVOS INGRESOS: Resultado = SUMA todos los días. Meta = meta_mensual / num_semanas. Cumple = Meta <= Resultado
// NIÑOS ACTIVOS semana = inicio + nuevos_sem - desercion_sem (acumulado)
// NIÑOS FINAL MES = ninos_inicio + nuevos_activos - total_desercion
// PROM NIÑOS/GRUPO = niños_final / grupos_activos (Meta: > 8)
// %CV = (120 / prom_niños_grupo) + 16
// GPN = ((niños_final × 108) × (1 - %CV/100) - 7800) / niños_final

function calcResultado(tipo, dias) {
  const vals = dias.map(v => parseInt(v) || 0)
  if (tipo === 'cob') {
    // Cobranza = último día CON valor ingresado (de derecha a izquierda)
    for (let i = vals.length - 1; i >= 0; i--) {
      if (vals[i] > 0) return vals[i]
    }
    return 0
  }
  return vals.reduce((a, b) => a + b, 0)
}

function calcMeta(tipo, ninos_inicio, meta_nuevos, num_semanas = 5) {
  if (tipo === 'cob') return Math.round((ninos_inicio * 0.015) / 5 * 10) / 10
  if (tipo === 'des') return Math.round((ninos_inicio * 0.08) / 5 * 10) / 10
  return Math.round(meta_nuevos / num_semanas * 10) / 10
}

function cumple(tipo, resultado, meta) {
  if (tipo === 'cob') return meta > resultado
  if (tipo === 'des') return meta >= resultado
  return resultado >= meta
}

export default function KPIPage() {
  const { id } = useParams()
  const [mesActivo, setMesActivo] = useState(0)
  const [centroNombre, setCentroNombre] = useState('')
  const [trimId, setTrimId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(true)

  // Config del mes
  const [config, setConfig] = useState({
    ninos_inicio: 0,
    grupos_activos: 0,
    meta_nuevos_mensual: 20,
    nuevos_activos_mes: 0,
    cp_invitados: 0,
    cp_asistieron: 0,
    cp_matriculados: 0,
    mot_tecnica: 0,
    mot_perdida_clase: 0,
    mot_economico: 0,
    mot_horario: 0,
    orig_referido: 0,
    orig_marketing: 0,
    orig_centro: 0,
    orig_activaciones: 0,
    orig_medios: 0,
  })

  // Semanas: [{ cob:[5], des:[5], ing:[5] }, ...]
  const emptyWeek = () => ({ cob: ['','','','',''], des: ['','','','',''], ing: ['','','','',''] })
  const [semanas, setSemanas] = useState(SEMANAS.map(() => emptyWeek()))

  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: centro } = await supabase.from('centros').select('nombre').eq('id', id).single()
    if (centro) setCentroNombre(centro.nombre)

    const { data: trim } = await supabase.from('trimestres').select('id').eq('centro_id', id).order('created_at', { ascending: false }).limit(1)
    const tId = trim?.[0]?.id
    setTrimId(tId)

    if (!tId) { setLoading(false); return }

    // Load resumen del mes
    const mes = mesActivo + 1
    const { data: resumen } = await supabase.from('resumen_mes').select('*').eq('trimestre_id', tId).eq('mes', mes).single()
    if (resumen) {
      setConfig({
        ninos_inicio: resumen.ninos_inicio_mes || 0,
        grupos_activos: resumen.grupos_activos || 0,
        meta_nuevos_mensual: resumen.meta_nuevos_mensual || 20,
        nuevos_activos_mes: resumen.nuevos_activos_mes || 0,
        cp_invitados: resumen.cp_invitados || 0,
        cp_asistieron: resumen.cp_asistieron || 0,
        cp_matriculados: resumen.cp_matriculados || 0,
        mot_tecnica: resumen.mot_tecnica || 0,
        mot_perdida_clase: resumen.mot_perdida_clase || 0,
        mot_economico: resumen.mot_economico || 0,
        mot_horario: resumen.mot_horario || 0,
        orig_referido: resumen.orig_referido || 0,
        orig_marketing: resumen.orig_marketing || 0,
        orig_centro: resumen.orig_centro || 0,
        orig_activaciones: resumen.orig_activaciones || 0,
        orig_medios: resumen.orig_medios || 0,
      })
    }

    // Load semanas
    const { data: kpiRows } = await supabase.from('kpi_semanas').select('*').eq('trimestre_id', tId).eq('mes', mes).order('semana')
    const newSems = SEMANAS.map((s) => {
      const row = kpiRows?.find(r => r.semana === s)
      if (!row) return emptyWeek()
      return {
        cob: [row.cob_d1 ?? '', row.cob_d2 ?? '', row.cob_d3 ?? '', row.cob_d4 ?? '', row.cob_d5 ?? ''],
        des: [row.des_d1 ?? '', row.des_d2 ?? '', row.des_d3 ?? '', row.des_d4 ?? '', row.des_d5 ?? ''],
        ing: [row.ing_d1 ?? '', row.ing_d2 ?? '', row.ing_d3 ?? '', row.ing_d4 ?? '', row.ing_d5 ?? ''],
      }
    })
    setSemanas(newSems)
    setLoading(false)
  }, [id, mesActivo])

  useEffect(() => { loadData() }, [loadData])

  async function handleSave() {
    if (!trimId) { setStatus('❌ No hay trimestre activo.'); return }
    setSaving(true); setStatus('')
    const mes = mesActivo + 1
    try {
      // Save config (resumen_mes)
      const configData = {
        trimestre_id: trimId, mes,
        ninos_inicio_mes: parseInt(config.ninos_inicio) || 0,
        grupos_activos: parseInt(config.grupos_activos) || 0,
        meta_nuevos_mensual: parseInt(config.meta_nuevos_mensual) || 20,
        nuevos_activos_mes: parseInt(config.nuevos_activos_mes) || 0,
        cp_invitados: parseInt(config.cp_invitados) || 0,
        cp_asistieron: parseInt(config.cp_asistieron) || 0,
        cp_matriculados: parseInt(config.cp_matriculados) || 0,
        mot_tecnica: parseInt(config.mot_tecnica) || 0,
        mot_perdida_clase: parseInt(config.mot_perdida_clase) || 0,
        mot_economico: parseInt(config.mot_economico) || 0,
        mot_horario: parseInt(config.mot_horario) || 0,
        orig_referido: parseInt(config.orig_referido) || 0,
        orig_marketing: parseInt(config.orig_marketing) || 0,
        orig_centro: parseInt(config.orig_centro) || 0,
        orig_activaciones: parseInt(config.orig_activaciones) || 0,
        orig_medios: parseInt(config.orig_medios) || 0,
        updated_at: new Date().toISOString()
      }
      const { error: resErr } = await supabase.from('resumen_mes').upsert(configData, { onConflict: 'trimestre_id,mes' })
      if (resErr) throw new Error('Resumen: ' + resErr.message)

      // Save semanas
      for (let i = 0; i < SEMANAS.length; i++) {
        const s = semanas[i]
        const kpiData = {
          trimestre_id: trimId, mes, semana: i + 1,
          cob_d1: parseInt(s.cob[0]) || 0, cob_d2: parseInt(s.cob[1]) || 0,
          cob_d3: parseInt(s.cob[2]) || 0, cob_d4: parseInt(s.cob[3]) || 0,
          cob_d5: parseInt(s.cob[4]) || 0,
          des_d1: parseInt(s.des[0]) || 0, des_d2: parseInt(s.des[1]) || 0,
          des_d3: parseInt(s.des[2]) || 0, des_d4: parseInt(s.des[3]) || 0,
          des_d5: parseInt(s.des[4]) || 0,
          ing_d1: parseInt(s.ing[0]) || 0, ing_d2: parseInt(s.ing[1]) || 0,
          ing_d3: parseInt(s.ing[2]) || 0, ing_d4: parseInt(s.ing[3]) || 0,
          ing_d5: parseInt(s.ing[4]) || 0,
          updated_at: new Date().toISOString()
        }
        const { error: kErr } = await supabase.from('kpi_semanas').upsert(kpiData, { onConflict: 'trimestre_id,mes,semana' })
        if (kErr) throw new Error('Semana ' + (i+1) + ': ' + kErr.message)
      }
      setStatus('✅ KPI guardado correctamente.')
    } catch(e) { setStatus('❌ Error al guardar: ' + e.message) }
    setSaving(false)
  }

  // Calculated totals
  const nI = parseInt(config.ninos_inicio) || 0
  const nA = parseInt(config.nuevos_activos_mes) || 0
  const gA = parseInt(config.grupos_activos) || 1
  const metaN = parseInt(config.meta_nuevos_mensual) || 20
  const totalDes = semanas.reduce((a,s) => a + s.des.reduce((b,v) => b + (parseInt(v)||0), 0), 0)
  const totalIng = semanas.reduce((a,s) => a + s.ing.reduce((b,v) => b + (parseInt(v)||0), 0), 0)
  const ninosFinal = Math.max(0, nI + nA - totalDes)
  const promGrupo = gA > 0 ? (ninosFinal / gA) : 0
  const pcv = gA > 0 ? ((120 / Math.max(promGrupo, 0.1)) + 16) : 0
  const gpn = ninosFinal > 0 ? (((ninosFinal * 108) * (1 - pcv/100) - 7800) / ninosFinal) : 0

  function updateDia(semIdx, tipo, diaIdx, val) {
    setSemanas(prev => {
      const next = prev.map((s,i) => i === semIdx ? { ...s, [tipo]: s[tipo].map((d,j) => j === diaIdx ? val : d) } : s)
      return next
    })
  }

  const inp = (val, onChange) => (
    <input type="number" min="0" value={val} onChange={e => onChange(e.target.value)}
      style={{ width: 60, padding: '4px 6px', border: '1px solid #D0D7E3', borderRadius: 6, fontSize: 13, textAlign: 'center', background: '#fff', outline: 'none' }}/>
  )

  const badge = (ok) => (
    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: ok ? '#E6F4EC' : '#FBE8E8', color: ok ? A.green : A.red }}>
      {ok ? 'Sí ✓' : 'No ✗'}
    </span>
  )

  const sectionHeader = (title, color = A.blue) => (
    <div style={{ background: color, color: '#fff', padding: '6px 14px', borderRadius: '8px 8px 0 0', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{title}</div>
  )

  const kpiTable = (tipo, label, semIdx) => {
    const s = semanas[semIdx]
    const dias = s[tipo]
    const res = calcResultado(tipo, dias)
    const meta = calcMeta(tipo, nI, metaN)
    const ok = cumple(tipo, res, meta)
    return (
      <div style={{ marginBottom: 2 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <tbody>
            <tr style={{ background: '#F9FAFC' }}>
              <td style={{ padding: '6px 10px', width: 200, fontWeight: 600, color: A.text, fontSize: 11 }}>{label}</td>
              {dias.map((d, di) => (
                <td key={di} style={{ padding: '4px 3px', textAlign: 'center' }}>
                  {inp(d, v => updateDia(semIdx, tipo, di, v))}
                </td>
              ))}
              <td style={{ padding: '4px 8px', textAlign: 'center', fontWeight: 700, color: tipo === 'cob' ? A.blue : tipo === 'des' ? A.red : A.green, minWidth: 50 }}>{res}</td>
              <td style={{ padding: '4px 6px', textAlign: 'center', color: '#666', fontSize: 11, minWidth: 55 }}>{meta}</td>
              <td style={{ padding: '4px 6px', textAlign: 'center', minWidth: 55 }}>{badge(ok)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    )
  }

  if (loading) return <div style={{display:'flex',minHeight:'100vh',alignItems:'center',justifyContent:'center'}}>Cargando KPI...</div>

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: A.gray }}>
      <Sidebar/>
      <main style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: A.text }}>Registro KPI Semanal</h1>
            <p style={{ fontSize: 12, color: '#8896A9' }}>{centroNombre} · Q1 2026</p>
          </div>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '10px 28px', background: `linear-gradient(135deg,${A.blue},${A.blueMid})`, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1, boxShadow: '0 4px 12px rgba(27,69,128,0.25)' }}>
            {saving ? 'Guardando...' : '💾 Guardar'}
          </button>
        </div>

        {status && (
          <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 16, background: status.includes('❌') ? '#FBE8E8' : '#E6F4EC', color: status.includes('❌') ? A.red : A.green, fontSize: 13, fontWeight: 500 }}>
            {status}
          </div>
        )}

        {/* Tabs meses */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
          {MESES.map((m, i) => (
            <button key={m} onClick={() => setMesActivo(i)}
              style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: mesActivo === i ? A.blue : '#fff', color: mesActivo === i ? '#fff' : '#4A5568', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              {m}
            </button>
          ))}
        </div>

        {/* Config del mes */}
        <div style={{ background: '#fff', border: '1px solid #E8EBF0', borderRadius: 12, padding: 16, marginBottom: 20, boxShadow: '0 2px 8px rgba(27,69,128,0.06)' }}>
          <h3 style={{ fontSize: 12, fontWeight: 700, color: A.blue, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Configuración del mes — {MESES[mesActivo]}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[['Niños inicio mes', 'ninos_inicio'], ['Grupos activos', 'grupos_activos'], ['Meta nuevos (mensual)', 'meta_nuevos_mensual'], ['Nuevos activos mes', 'nuevos_activos_mes']].map(([lbl, key]) => (
              <div key={key}>
                <label style={{ fontSize: 11, color: '#4A5568', fontWeight: 600, display: 'block', marginBottom: 4 }}>{lbl}</label>
                <input type="number" min="0" value={config[key]}
                  onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '8px 10px', border: '1.5px solid #E8EBF0', borderRadius: 8, fontSize: 13, background: '#F5F7FA', boxSizing: 'border-box' }}/>
              </div>
            ))}
          </div>
        </div>

        {/* Indicadores calculados */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Total Deserción', val: totalDes, color: A.red },
            { label: 'Total Nuevos', val: totalIng, color: A.green },
            { label: 'Niños Final Mes', val: ninosFinal, color: A.blue },
            { label: 'Prom. Niños/Grupo', val: promGrupo.toFixed(2), color: promGrupo >= 8 ? A.green : A.red, meta: '≥ 8', ok: promGrupo >= 8 },
            { label: '%CV', val: pcv.toFixed(1) + '%', color: '#7B68EE' },
          ].map(({ label, val, color, meta, ok }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #E8EBF0', borderRadius: 10, padding: '12px 14px', textAlign: 'center', boxShadow: '0 1px 6px rgba(27,69,128,0.06)' }}>
              <p style={{ fontSize: 10, color: '#8896A9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</p>
              <p style={{ fontSize: 22, fontWeight: 800, color }}>{val}</p>
              {meta && <p style={{ fontSize: 10, color: ok ? A.green : A.red, fontWeight: 600, marginTop: 2 }}>{ok ? '✓ Cumple (meta ' + meta + ')' : '✗ No cumple (meta ' + meta + ')'}</p>}
            </div>
          ))}
        </div>

        {/* GPN */}
        <div style={{ background: gpn >= 0 ? '#E6F4EC' : '#FBE8E8', border: '1px solid ' + (gpn >= 0 ? '#4A8C3F' : A.red), borderRadius: 10, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: gpn >= 0 ? A.green : A.red, textTransform: 'uppercase', letterSpacing: '0.06em' }}>GPN (Ganancia por Niño):</span>
          <span style={{ fontSize: 24, fontWeight: 800, color: gpn >= 0 ? A.green : A.red }}>${gpn.toFixed(2)}</span>
          <span style={{ fontSize: 11, color: '#666' }}>Fórmula: ((Niños final × 108) × (1 - %CV/100) - 7800) / Niños final</span>
        </div>

        {/* Tabla encabezado columnas */}
        <div style={{ background: '#fff', border: '1px solid #E8EBF0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(27,69,128,0.06)', marginBottom: 20 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: `linear-gradient(135deg,${A.blue},${A.blueMid})` }}>
                <th style={{ padding: '10px 10px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#fff', width: 200 }}>Semana / Indicador</th>
                {DIAS.map(d => <th key={d} style={{ padding: '10px 3px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff', width: 70 }}>{d}</th>)}
                <th style={{ padding: '10px 8px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff', width: 60 }}>Resultado</th>
                <th style={{ padding: '10px 6px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff', width: 60 }}>Meta</th>
                <th style={{ padding: '10px 6px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#fff', width: 65 }}>¿Cumple?</th>
              </tr>
            </thead>
          </table>

          {SEMANAS.map((s, i) => (
            <div key={s} style={{ borderBottom: i < SEMANAS.length - 1 ? '2px solid #E8EBF0' : 'none', padding: '10px 0 6px' }}>
              <div style={{ padding: '2px 10px 6px', fontSize: 11, fontWeight: 700, color: '#8896A9', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Semana {s}</div>
              {kpiTable('cob', 'Cobranza Vencida (N°)', i)}
              {kpiTable('des', 'Deserción (Retirados)', i)}
              {kpiTable('ing', 'Nuevos Ingresos - Ventas', i)}
            </div>
          ))}
        </div>

        {/* Clase de prueba y motivos */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
          <div style={{ background: '#fff', border: '1px solid #E8EBF0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(27,69,128,0.06)' }}>
            {sectionHeader('Clase de Prueba')}
            <div style={{ padding: 16 }}>
              {[['Invitados', 'cp_invitados'], ['Asistieron', 'cp_asistieron'], ['Matriculados', 'cp_matriculados']].map(([lbl, key]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: A.text }}>{lbl}</span>
                  <input type="number" min="0" value={config[key]}
                    onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                    style={{ width: 70, padding: '5px 8px', border: '1.5px solid #E8EBF0', borderRadius: 6, fontSize: 13, textAlign: 'center', background: '#F5F7FA' }}/>
                </div>
              ))}
              {config.cp_invitados > 0 && (
                <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                  Efectividad: {Math.round((parseInt(config.cp_asistieron)||0)/(parseInt(config.cp_invitados)||1)*100)}% asistencia · {Math.round((parseInt(config.cp_matriculados)||0)/(parseInt(config.cp_asistieron)||1)*100)}% conversión
                </div>
              )}
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E8EBF0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(27,69,128,0.06)' }}>
            {sectionHeader('Motivo Deserción', A.red)}
            <div style={{ padding: 16 }}>
              {[['Técnica', 'mot_tecnica'], ['Pérdida de clase', 'mot_perdida_clase'], ['Económico', 'mot_economico'], ['Horario', 'mot_horario']].map(([lbl, key]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: A.text }}>{lbl}</span>
                  <input type="number" min="0" value={config[key]}
                    onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                    style={{ width: 70, padding: '5px 8px', border: '1.5px solid #E8EBF0', borderRadius: 6, fontSize: 13, textAlign: 'center', background: '#F5F7FA' }}/>
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                Total: {['mot_tecnica','mot_perdida_clase','mot_economico','mot_horario'].reduce((a,k) => a + (parseInt(config[k])||0), 0)}
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E8EBF0', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 6px rgba(27,69,128,0.06)' }}>
            {sectionHeader('Origen Nuevos Ingresos', A.green)}
            <div style={{ padding: 16 }}>
              {[['Referido', 'orig_referido'], ['Marketing', 'orig_marketing'], ['Centro', 'orig_centro'], ['Activaciones', 'orig_activaciones'], ['Medios (Radio/TV)', 'orig_medios']].map(([lbl, key]) => (
                <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: A.text }}>{lbl}</span>
                  <input type="number" min="0" value={config[key]}
                    onChange={e => setConfig(c => ({ ...c, [key]: e.target.value }))}
                    style={{ width: 70, padding: '5px 8px', border: '1.5px solid #E8EBF0', borderRadius: 6, fontSize: 13, textAlign: 'center', background: '#F5F7FA' }}/>
                </div>
              ))}
              <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                Total: {['orig_referido','orig_marketing','orig_centro','orig_activaciones','orig_medios'].reduce((a,k) => a + (parseInt(config[k])||0), 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Nota sobre fórmulas */}
        <div style={{ background: '#F0F4FF', border: '1px solid #C5D5F5', borderRadius: 10, padding: '10px 16px', fontSize: 11, color: '#4A5568' }}>
          <strong style={{ color: A.blue }}>Fórmulas según KPI ALOHA:</strong> Cobranza = último día registrado | Deserción = suma de días | Nuevos = suma de días | 
          Meta Cob = (niños_inicio × 1.5%) ÷ 5 semanas | Meta Des = (niños_inicio × 8%) ÷ 5 semanas | 
          %CV = (120 ÷ prom_niños_grupo) + 16 | GPN = ((niños_final × 108) × (1 − %CV%) − 7800) ÷ niños_final
        </div>
      </main>
    </div>
  )
}
