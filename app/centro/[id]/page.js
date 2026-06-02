'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { getCentroResumen } from '../../actions/centro'

const NOMBRES_MES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const Q_MONTHS = { 1:[1,2,3], 2:[4,5,6], 3:[7,8,9], 4:[10,11,12] }

const cumplColor = (v) => v >= 85 ? 'var(--ok)' : v >= 70 ? 'var(--warn)' : 'var(--bad)'

function Bar({ val, max, color = 'var(--ts-green)' }) {
  const pct = Math.min((val / (max || 1)) * 100, 100)
  return (
    <div className="bar">
      <div className="bar__fill" style={{ width: pct + '%', background: color }} />
    </div>
  )
}

function Card({ l, v, s, warn }) {
  return (
    <div className="kpi">
      <div className="kpi__top">
        <span className="label">{l}</span>
      </div>
      <div className="kpi__value">{v}</div>
      <div className="kpi__sub" style={warn ? { color: 'var(--bad)' } : undefined}>{s}</div>
    </div>
  )
}

function Kpi({ l, v }) {
  return (
    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 14px' }}>
      <div className="label" style={{ fontSize: 10 }}>{l}</div>
      <div className="num" style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', marginTop: 3 }}>{v}</div>
    </div>
  )
}

const sectionTitle = {
  fontFamily: 'var(--font-mono)',
  fontSize: 10.5,
  fontWeight: 500,
  color: 'var(--text-dim)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: 14,
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

      const { nombre: cNombre, metas: m, rs, ks } = await getCentroResumen(id, year, trimestre)
      if (cNombre) setNombre(cNombre)

      const metaFetched = {
        nuevos: m?.meta_nuevos_ingresos_mes ?? 20,
        desercion: Number(m?.meta_desercion_mes ?? 18.4),
        cobranza: m?.meta_cobranza_max ?? 1,
      }
      setMeta(metaFetched)

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
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre || 'Centro'} centroId={id} />
      <main className="main" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)', fontSize: 14 }}>Cargando…</main>
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
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={id} />
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Resumen de centro · Q1 2026</div>
            <h1 className="h-title">{nombre}</h1>
            <p className="h-sub">Primer Trimestre 2026</p>
          </div>
          <span className={`pill ${cumplColor(cumplPct) === 'var(--ok)' ? 'pill--ok' : cumplColor(cumplPct) === 'var(--warn)' ? 'pill--warn' : 'pill--bad'}`}>
            <span className="dot" />{cumplPct}% cumplimiento
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 20 }}>
          <Card l="Niños activos" v={totals.ninosActivos} s={totals.grupos > 0 ? 'Prom/grupo: ' + promGrupo.toFixed(1) : '—'} />
          <Card l="Nuevos ingresos" v={totals.nuevosIngresos} s={'Meta: ' + metaNuevosTrim + ' · ' + (metaNuevosTrim ? Math.round(totals.nuevosIngresos / metaNuevosTrim * 100) : 0) + '%'} warn={totals.nuevosIngresos < metaNuevosTrim} />
          <Card l="Deserción" v={totals.desercion} s={'Meta máx: ' + metaMaxDesTrim} warn={totals.desercion > metaMaxDesTrim} />
          <Card l="Grupos activos" v={totals.grupos} s={totals.grupos > 0 ? 'GPN: $' + gpn.toFixed(2) : '—'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <h3 style={sectionTitle}>Resultados por mes</h3>
            <table className="table">
              <thead><tr>{['Mes', 'Nuevos', 'Deserción', 'Niños', 'Cobranza', 'Meta'].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{meses.map((m, i) => (
                <tr key={i} style={{ cursor: 'default' }}>
                  <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{m.mes}</td>
                  <td className="num" style={{ fontWeight: 600, color: m.nuevos >= meta.nuevos ? 'var(--ok)' : 'var(--bad)' }}>{m.nuevos}</td>
                  <td className="num" style={{ color: m.desercion > meta.desercion ? 'var(--bad)' : 'var(--text-muted)' }}>{m.desercion}</td>
                  <td className="num" style={{ color: 'var(--text)' }}>{m.ninos}</td>
                  <td className="num">{m.cobranza}</td>
                  <td>
                    <span className={`pill ${m.cumpl === 'Sí' ? 'pill--ok' : 'pill--bad'}`}><span className="dot" />{m.cumpl}</span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={sectionTitle}>Clase de prueba</h3>
            <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
              {[
                { l: 'Invitados', v: totals.cpInv },
                { l: 'Asistieron', v: totals.cpAsi, p: totals.cpInv ? pctCpAsi + '%' : null },
                { l: 'Matriculados', v: totals.cpMat, p: totals.cpAsi ? pctCpMat + '%' : null },
              ].map((item, i) => (
                <div key={i} style={{ textAlign: 'center', flex: 1, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '14px 8px' }}>
                  <div className="num" style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)' }}>{item.v}</div>
                  <div className="label" style={{ fontSize: 10, marginTop: 4 }}>{item.l}</div>
                  {item.p && <div className="num" style={{ fontSize: 11, color: 'var(--ts-green)', marginTop: 3 }}>{item.p}</div>}
                </div>
              ))}
            </div>

            <h3 style={sectionTitle}>Motivo deserción</h3>
            {[
              { l: 'Pérd. clase', n: totals.motivos.perdida },
              { l: 'Económico', n: totals.motivos.economico },
              { l: 'Técnica', n: totals.motivos.tecnica },
              { l: 'Horario', n: totals.motivos.horario },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span className="label" style={{ width: 100, fontSize: 10, textAlign: 'right' }}>{m.l}</span>
                <Bar val={m.n} max={maxMot} color="var(--warn)" />
                <span className="num" style={{ width: 24, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{m.n}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={sectionTitle}>Origen nuevos ingresos</h3>
            {[
              { l: 'Marketing', n: totals.origen.marketing },
              { l: 'Centro', n: totals.origen.centro },
              { l: 'Activaciones', n: totals.origen.activaciones },
              { l: 'Referidos', n: totals.origen.referidos },
              { l: 'Medios', n: totals.origen.medios },
            ].map((o, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span className="label" style={{ width: 90, fontSize: 10, textAlign: 'right' }}>{o.l}</span>
                <Bar val={o.n} max={maxOri} />
                <span className="num" style={{ width: 30, fontSize: 12, color: 'var(--text)' }}>{o.n}</span>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding: 20 }}>
            <h3 style={sectionTitle}>Cumplimiento trimestral</h3>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 38, fontWeight: 500, color: cumplColor(cumplPct), marginBottom: 10, letterSpacing: '-0.02em', lineHeight: 1 }}>{cumplPct}%</div>
            <div className="bar" style={{ height: 10, marginBottom: 16 }}>
              <div className="bar__fill" style={{ width: cumplPct + '%', background: cumplColor(cumplPct) }} />
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
