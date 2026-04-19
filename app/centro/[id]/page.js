'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { supabase } from '../../../lib/supabase'

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const Q_MONTHS = { 1:[1,2,3], 2:[4,5,6], 3:[7,8,9], 4:[10,11,12] }

function Bar({ val, max, color = '#533AB7' }) {
  const pct = Math.min((val / (max || 1)) * 100, 100)
  return (
    <div style={{ flex: 1, height: 8, background: '#f0f0ec', borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 4 }} />
    </div>
  )
}

function Card({ l, v, s, warn }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #e8e8e4', borderRadius: 10, padding: '14px 16px' }}>
      <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 6 }}>{l}</label>
      <div style={{ fontSize: 24, fontWeight: 600 }}>{v}</div>
      <div style={{ fontSize: 11, marginTop: 4, color: warn ? '#993C1D' : '#888' }}>{s}</div>
    </div>
  )
}

function Kpi({ l, v }) {
  return (
    <div style={{ background: '#f8f8f5', borderRadius: 8, padding: '10px 12px' }}>
      <div style={{ fontSize: 11, color: '#888' }}>{l}</div>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{v}</div>
    </div>
  )
}

export default function CentroPage() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [nombre, setNombre] = useState('')
  const [meses, setMeses] = useState([])
  const [totals, setTotals] = useState({
    ninosActivos: 0, nuevosIngresos: 0, desercion: 0, grupos: 0,
    cpInv: 0, cpAsi: 0, cpMat: 0,
    motivos: { tecnica: 0, perdida: 0, economico: 0, horario: 0 },
    origen: { marketing: 0, centro: 0, activaciones: 0, referidos: 0, medios: 0 },
  })
  const [meta, setMeta] = useState({ nuevos: 20, desercion: 18.4, cobranza: 1 })

  useEffect(() => {
    (async () => {
      setLoading(true)
      const year = 2026
      const trimestre = 1
      const months = Q_MONTHS[trimestre]

      const { data: c } = await supabase.from('centros').select('nombre').eq('id', id).single()
      if (c) setNombre(c.nombre)

      const { data: m } = await supabase.from('metas').select('*').eq('anio', year).eq('trimestre', trimestre).single()
      const metaFetched = {
        nuevos: m?.meta_nuevos_ingresos_mes ?? 20,
        desercion: Number(m?.meta_desercion_mes ?? 18.4),
        cobranza: m?.meta_cobranza_max ?? 1,
      }
      setMeta(metaFetched)

      const { data: rs } = await supabase.from('resumen_mes').select('*').eq('centro_id', id).eq('year', year).in('month', months).order('month')
      const { data: ks } = await supabase.from('kpi_semanas').select('*').eq('centro_id', id).eq('year', year).in('month', months)

      const mensual = months.map(mo => {
        const r = (rs || []).find(x => x.month === mo)
        const ws = (ks || []).filter(x => x.month === mo)
        const nuevos = ws.reduce((s, w) => s + (w.ing_d1 || 0) + (w.ing_d2 || 0) + (w.ing_d3 || 0) + (w.ing_d4 || 0) + (w.ing_d5 || 0), 0)
        const desercion = ws.reduce((s, w) => s + (w.des_d1 || 0) + (w.des_d2 || 0) + (w.des_d3 || 0) + (w.des_d4 || 0) + (w.des_d5 || 0), 0)
        let cobMes = 0
        if (ws.length) {
          const lastSem = [...ws].sort((a, b) => b.semana - a.semana)[0]
          cobMes = lastSem.cob_d5 || lastSem.cob_d4 || lastSem.cob_d3 || lastSem.cob_d2 || lastSem.cob_d1 || 0
        }
        const ninosInicio = r?.ninos_inicio_mes || 0
        const nuevosActivosMes = r?.nuevos_activos_mes || 0
        const ninosFin = Math.max(0, ninosInicio + nuevosActivosMes - desercion)
        const cumple = nuevos >= metaFetched.nuevos && desercion <= metaFetched.desercion && cobMes <= metaFetched.cobranza
        return {
          mes: NOMBRES_MES[mo - 1],
          mesNum: mo,
          nuevos, desercion, cobranza: cobMes, ninos: ninosFin,
          ninosInicio, nuevosActivos: nuevosActivosMes,
          cumpl: cumple ? 'Sí' : 'No'
        }
      })
      setMeses(mensual)

      const lastMonth = mensual[mensual.length - 1]
      const ultResumen = (rs || [])[(rs || []).length - 1]
      setTotals({
        ninosActivos: lastMonth.ninos,
        nuevosIngresos: mensual.reduce((s, mm) => s + mm.nuevos, 0),
        desercion: mensual.reduce((s, mm) => s + mm.desercion, 0),
        grupos: ultResumen?.grupos_activos || 0,
        cpInv: (rs || []).reduce((s, r) => s + (r.cp_invitados || 0), 0),
        cpAsi: (rs || []).reduce((s, r) => s + (r.cp_asistieron || 0), 0),
        cpMat: (rs || []).reduce((s, r) => s + (r.cp_matriculados || 0), 0),
        motivos: {
          tecnica: (rs || []).reduce((s, r) => s + (r.mot_tecnica || 0), 0),
          perdida: (rs || []).reduce((s, r) => s + (r.mot_perdida_clase || 0), 0),
          economico: (rs || []).reduce((s, r) => s + (r.mot_economico || 0), 0),
          horario: (rs || []).reduce((s, r) => s + (r.mot_horario || 0), 0),
        },
        origen: {
          marketing: (rs || []).reduce((s, r) => s + (r.orig_marketing || 0), 0),
          centro: (rs || []).reduce((s, r) => s + (r.orig_centro || 0), 0),
          activaciones: (rs || []).reduce((s, r) => s + (r.orig_activaciones || 0), 0),
          referidos: (rs || []).reduce((s, r) => s + (r.orig_referido || 0), 0),
          medios: (rs || []).reduce((s, r) => s + (r.orig_medios || 0), 0),
        },
      })
      setLoading(false)
    })()
  }, [id])

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f0' }}>
      <Sidebar rol="usuario" centroNombre={nombre || 'Centro'} centroId={id} />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 14 }}>Cargando…</main>
    </div>
  )

  const cumplCount = meses.filter(m => m.cumpl === 'Sí').length
  const cumplPct = meses.length ? Math.round((cumplCount / meses.length) * 100) : 0
  const maxMot = Math.max(totals.motivos.tecnica, totals.motivos.perdida, totals.motivos.economico, totals.motivos.horario, 1)
  const maxOri = Math.max(totals.origen.marketing, totals.origen.centro, totals.origen.activaciones, totals.origen.referidos, totals.origen.medios, 1)
  const metaNuevosTrim = meta.nuevos * meses.length
  const metaMaxDesTrim = Math.ceil(meta.desercion * meses.length)
  const promGrupo = totals.grupos > 0 ? (totals.ninosActivos / totals.grupos) : 0
  const pcv = promGrupo > 0 ? (120 / promGrupo) + 16 : 0
  const gpn = totals.ninosActivos > 0 ? ((totals.ninosActivos * 108) * (1 - pcv / 100) - 7800) / totals.ninosActivos : 0
  const pctCpAsi = totals.cpInv ? Math.round(totals.cpAsi / totals.cpInv * 100) : 0
  const pctCpMat = totals.cpAsi ? Math.round(totals.cpMat / totals.cpAsi * 100) : 0

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f0' }}>
      <Sidebar rol="usuario" centroNombre={nombre} centroId={id} />
      <main style={{ flex: 1, padding: 28, overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>{nombre}</h1>
            <p style={{ fontSize: 12, color: '#888' }}>Primer Trimestre 2026</p>
          </div>
          <span style={{ background: '#EEEDFE', color: '#533AB7', fontSize: 12, padding: '5px 14px', borderRadius: 20, fontWeight: 600 }}>{cumplPct}% cumplimiento</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
          <Card l="Niños activos" v={totals.ninosActivos} s={totals.grupos > 0 ? 'Prom/grupo: ' + promGrupo.toFixed(1) : '—'} />
          <Card l="Nuevos ingresos" v={totals.nuevosIngresos} s={'Meta: ' + metaNuevosTrim + ' · ' + (metaNuevosTrim ? Math.round(totals.nuevosIngresos / metaNuevosTrim * 100) : 0) + '%'} warn={totals.nuevosIngresos < metaNuevosTrim} />
          <Card l="Deserción" v={totals.desercion} s={'Meta máx: ' + metaMaxDesTrim} warn={totals.desercion > metaMaxDesTrim} />
          <Card l="Grupos activos" v={totals.grupos} s={totals.grupos > 0 ? 'GPN: $' + gpn.toFixed(2) : '—'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#fff', border: '0.5px solid #e8e8e4', borderRadius: 12, padding: 18 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Resultados por mes</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead><tr>{['Mes', 'Nuevos', 'Deserción', 'Niños', 'Cobranza', 'Meta'].map(h => <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 10, fontWeight: 500, color: '#aaa', borderBottom: '0.5px solid #f0f0ec' }}>{h}</th>)}</tr></thead>
              <tbody>{meses.map((m, i) => (
                <tr key={i}>
                  <td style={{ padding: '9px 8px', borderBottom: '0.5px solid #f5f5f2', fontSize: 13, fontWeight: 500 }}>{m.mes}</td>
                  <td style={{ padding: '9px 8px', borderBottom: '0.5px solid #f5f5f2', fontSize: 13, color: m.nuevos >= meta.nuevos ? '#0F6E56' : '#993C1D' }}>{m.nuevos}</td>
                  <td style={{ padding: '9px 8px', borderBottom: '0.5px solid #f5f5f2', fontSize: 13, color: m.desercion > meta.desercion ? '#993C1D' : 'inherit' }}>{m.desercion}</td>
                  <td style={{ padding: '9px 8px', borderBottom: '0.5px solid #f5f5f2', fontSize: 13 }}>{m.ninos}</td>
                  <td style={{ padding: '9px 8px', borderBottom: '0.5px solid #f5f5f2', fontSize: 13 }}>{m.cobranza}</td>
                  <td style={{ padding: '9px 8px', borderBottom: '0.5px solid #f5f5f2' }}>
                    <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 500, background: m.cumpl === 'Sí' ? '#E1F5EE' : '#FAECE7', color: m.cumpl === 'Sí' ? '#0F6E56' : '#993C1D' }}>{m.cumpl}</span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #e8e8e4', borderRadius: 12, padding: 18 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Clase de prueba</h3>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              {[
                { l: 'Invitados', v: totals.cpInv },
                { l: 'Asistieron', v: totals.cpAsi, p: totals.cpInv ? pctCpAsi + '%' : null },
                { l: 'Matriculados', v: totals.cpMat, p: totals.cpAsi ? pctCpMat + '%' : null },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: 'center', flex: 1, background: '#f8f8f5', borderRadius: 8, padding: '12px 8px' }}>
                  <div style={{ fontSize: 22, fontWeight: 600 }}>{item.v}</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{item.l}</div>
                  {item.p && <div style={{ fontSize: 10, color: '#0F6E56', marginTop: 2 }}>{item.p}</div>}
                </div>
              ))}
            </div>

            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Motivo deserción</h3>
            {[
              { l: 'Pérd. clase', n: totals.motivos.perdida },
              { l: 'Económico', n: totals.motivos.economico },
              { l: 'Técnica', n: totals.motivos.tecnica },
              { l: 'Horario', n: totals.motivos.horario },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ width: 100, fontSize: 11, color: '#666', textAlign: 'right' }}>{m.l}</span>
                <Bar val={m.n} max={maxMot} color="#D85A30" />
                <span style={{ width: 24, fontSize: 12, fontWeight: 500 }}>{m.n}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #e8e8e4', borderRadius: 12, padding: 18 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Origen nuevos ingresos</h3>
            {[
              { l: 'Marketing', n: totals.origen.marketing },
              { l: 'Centro', n: totals.origen.centro },
              { l: 'Activaciones', n: totals.origen.activaciones },
              { l: 'Referidos', n: totals.origen.referidos },
              { l: 'Medios', n: totals.origen.medios },
            ].map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ width: 90, fontSize: 11, color: '#666', textAlign: 'right' }}>{o.l}</span>
                <Bar val={o.n} max={maxOri} />
                <span style={{ width: 30, fontSize: 11 }}>{o.n}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '0.5px solid #e8e8e4', borderRadius: 12, padding: 18 }}>
            <h3 style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cumplimiento trimestral</h3>
            <div style={{ fontSize: 36, fontWeight: 700, color: '#533AB7', marginBottom: 8 }}>{cumplPct}%</div>
            <div style={{ height: 12, background: '#eee', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
              <div style={{ height: '100%', width: cumplPct + '%', background: '#533AB7', borderRadius: 6 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Kpi l="Meses cumplidos" v={cumplCount + '/' + meses.length} />
              <Kpi l="Niños inicio trim." v={meses[0]?.ninosInicio || 0} />
              <Kpi l="Niños final trim." v={totals.ninosActivos} />
              <Kpi l="Nuevos ingresos" v={totals.nuevosIngresos} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
