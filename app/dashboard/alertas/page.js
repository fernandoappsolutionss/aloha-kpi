'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import PeriodSelector from '../../../components/PeriodSelector'
import { getCentrosKpi } from '../../actions/dashboard'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../../lib/period'

const COLORS = {
  critico: { bg:'var(--bad-bg)', border:'var(--bad-line)', title:'#FCA5A5', dot:'var(--bad)' },
  advertencia: { bg:'var(--warn-bg)', border:'var(--warn-line)', title:'#FCD34D', dot:'var(--warn)' },
  info: { bg:'var(--ok-bg)', border:'var(--ok-line)', title:'#6EE7B7', dot:'var(--ok)' },
}

function buildAlertas(centros, label) {
  const out = []
  for (const c of centros) {
    if (c.estado === 'Crítico') {
      out.push({ tipo:'critico', centro:c.nombre, icon:'🔴', fecha: label,
        msg:`Cumplimiento crítico (${c.cumpl}%). Nuevos ingresos ${c.nuevos}/${c.meta} y ${c.desercion} deserciones en el trimestre.` })
    } else if (c.estado === 'Parcial') {
      out.push({ tipo:'advertencia', centro:c.nombre, icon:'🟡', fecha: label,
        msg: c.nuevos < c.meta
          ? `Cumplimiento parcial (${c.cumpl}%). Faltan ${c.meta - c.nuevos} nuevos ingresos para alcanzar la meta.`
          : `Cumplimiento parcial (${c.cumpl}%). Revisar deserción y cobranza.` })
    } else {
      out.push({ tipo:'info', centro:c.nombre, icon:'🟢', fecha: label,
        msg:`Buen trimestre: ${c.cumpl}% de cumplimiento y ${c.nuevos} nuevos ingresos.` })
    }
  }
  return out
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(getCurrentPeriod())
  const label = periodLabel(period.year, period.quarter)
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p) }

  useEffect(() => { setPeriod(readStoredPeriod()) }, [])
  useEffect(() => {
    setLoading(true)
    getCentrosKpi(period.year, period.quarter)
      .then((data) => setAlertas(buildAlertas(data || [], label)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [period])

  const criticas = alertas.filter(a => a.tipo === 'critico')
  const advertencias = alertas.filter(a => a.tipo === 'advertencia')
  const info = alertas.filter(a => a.tipo === 'info')

  return (
    <div className="shell">
      <Sidebar rol="admin_general"/>
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Alertas · {label}</div>
            <h1 className="h-title">Alertas</h1>
            <p className="h-sub">{criticas.length} críticas · {advertencias.length} advertencias · {info.length} positivas</p>
          </div>
          <PeriodSelector value={period} onChange={changePeriod} />
        </div>

        {loading ? (
          <div className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Generando alertas…</div>
        ) : alertas.length === 0 ? (
          <div className="panel" style={{ padding: 48, textAlign: 'center', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>No hay alertas todavía</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Las alertas se generan a partir del cumplimiento de cada centro.</div>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 26 }}>
              {[{ l:'Alertas críticas', v:criticas.length, pill:'pill--bad', accent:'var(--bad)' },
                { l:'Advertencias', v:advertencias.length, pill:'pill--warn', accent:'var(--warn)' },
                { l:'Noticias positivas', v:info.length, pill:'pill--ok', accent:'var(--ts-green)' }]
                .map((m, i) => (
                  <div key={i} className="kpi" style={{ animationDelay: `${i * 0.06}s`, '--accent': m.accent }}>
                    <div className="kpi__top">
                      <span className="label">{m.l}</span>
                      <span className={`pill ${m.pill}`}><span className="dot" /></span>
                    </div>
                    <div className="kpi__value" style={{ color: m.accent }}>{m.v}</div>
                  </div>
                ))}
            </div>

            {[{ t:'Críticas — Acción inmediata requerida', items:criticas },
              { t:'Advertencias — Revisar esta semana', items:advertencias },
              { t:'Positivas', items:info }]
              .map(({ t, items }) => items.length > 0 && (
                <div key={t} style={{ marginBottom: 26 }}>
                  <h2 className="label" style={{ marginBottom: 12 }}>{t}</h2>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {items.map((a, i) => (
                      <div key={i} style={{ background: COLORS[a.tipo].bg, border: `1px solid ${COLORS[a.tipo].border}`, borderRadius: 'var(--r)', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[a.tipo].dot, flexShrink: 0, marginTop: 7 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS[a.tipo].title }}>{a.centro}</span>
                            <span className="label" style={{ color: 'var(--text-faint)' }}>{a.fecha}</span>
                          </div>
                          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.msg}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
          </>
        )}
      </main>
    </div>
  )
}
