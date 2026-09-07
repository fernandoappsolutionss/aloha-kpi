'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import HistorialNavigation from '../../../components/HistorialNavigation'
import PeriodSelector from '../../../components/PeriodSelector'
import { getMetas, saveMetas } from '../../actions/metas'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel } from '../../../lib/period'

const METAS_INIT = {
  nuevos_mes: 20,
  desercion_mes: 8,
  cobranza_max: 1,
  gpn_min: 8,
  cp_conversion: 50,
}

export default function MetasPage() {
  const [metas, setMetas] = useState(METAS_INIT)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [dirty, setDirty] = useState(false)
  const [period, setPeriod] = useState(getCurrentPeriod())

  useEffect(() => { setPeriod(readStoredPeriod()) }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setSaveError(''); setSaved(false); setDirty(false)
    getMetas(period.year, period.quarter).then((m) => {
      if (!active) return
      if (m) setMetas({
        nuevos_mes: m.meta_nuevos_ingresos_mes ?? 20,
        desercion_mes: Number(m.meta_desercion_mes ?? 8),
        cobranza_max: Number(m.meta_cobranza_max ?? 1),
        gpn_min: Number(m.gpn_min ?? 8),
        cp_conversion: Number(m.cp_conversion ?? 50),
      })
      else setMetas(METAS_INIT)
    }).catch(() => { if (active) setError('No se pudieron cargar las metas. Intenta de nuevo.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [period])

  const label = periodLabel(period.year, period.quarter)
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p) }

  async function save() {
    setSaving(true); setSaveError('')
    try {
      const res = await saveMetas(period.year, period.quarter, {
        meta_nuevos_ingresos_mes: metas.nuevos_mes,
        meta_desercion_mes: metas.desercion_mes,
        meta_cobranza_max: metas.cobranza_max,
        gpn_min: metas.gpn_min,
        cp_conversion: metas.cp_conversion,
      })
      if (res.error) throw new Error(res.error)
      setSaved(true); setDirty(false)
    } catch { setSaveError('No se pudieron guardar las metas. Intenta de nuevo.') }
    setSaving(false)
  }

  const campos = [
    { k:'nuevos_mes', l:'Meta nuevos ingresos por mes', desc:'Número mínimo de nuevas matrículas que cada centro debe lograr mensualmente.', suffix:'alumnos', tipo:'number' },
    { k:'desercion_mes', l:'Meta máxima de deserción mensual (%)', desc:'Porcentaje máximo de retiros sobre los niños activos del mes. Si se supera ese %, el mes no cumple.', suffix:'%', tipo:'number' },
    { k:'cobranza_max', l:'Meta máxima de cobranza vencida', desc:'Número máximo de facturas vencidas al cierre del mes.', suffix:'facturas', tipo:'number' },
    { k:'gpn_min', l:'Promedio mínimo niños por grupo (GPN)', desc:'Cada grupo activo debe tener al menos este número de alumnos en promedio.', suffix:'niños/grupo', tipo:'number' },
    { k:'cp_conversion', l:'Meta efectividad clase de prueba', desc:'Porcentaje mínimo de invitados que deben matricularse tras asistir a la clase de prueba.', suffix:'%', tipo:'number' },
  ]

  return (
    <div className="shell">
      <Sidebar rol="admin_general"/>
      <main id="main-content" data-page-state={loading || saving ? 'loading' : error || saveError ? 'error' : 'ready'} className="main operations-page">
        <HistorialNavigation />
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Configuración · {label}</div>
            <h1 className="h-title">Metas globales</h1>
            <p className="h-sub">Estas metas aplican a todos los centros · {label}</p>
          </div>
          <div className="page-actions operations-actions">
            <PeriodSelector value={period} onChange={changePeriod} />
            <button onClick={save} disabled={saving || loading || !!error} className="btn btn--primary">
              {saving ? 'Guardando…' : 'Guardar metas'}
            </button>
          </div>
        </div>

        {loading ? <p role="status">Cargando metas…</p> : error ? <p role="alert" className="alert alert--error">{error}</p> : <>
        <p role="status">{saving ? 'Guardando metas…' : saved ? 'Metas guardadas' : dirty ? 'Cambios sin guardar' : 'Metas cargadas'}</p>
        {saveError && <p role="alert" className="alert alert--error">{saveError}</p>}

        <div className="card" style={{ padding: '13px 18px', marginBottom: 22, color: 'var(--text-muted)', lineHeight: 1.6, borderLeft: '2px solid var(--ts-green)' }}>
          <strong style={{ color: 'var(--text)' }}>Nota:</strong> Los cambios en estas metas se aplicarán al cálculo de cumplimiento de todos los centros a partir del siguiente registro semanal.
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {campos.map(f => (
            <div key={f.k} className="card form-grid operations-meta">
              <div style={{ flex: 1 }}>
                <label htmlFor={`meta-${f.k}`} style={{ fontWeight: 600, color: 'var(--text)' }}>{f.l}</label>
                <p id={`meta-${f.k}-help`} className="caption" style={{ color: 'var(--text-dim)', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
              <div className="operations-meta__control">
                <input
                  id={`meta-${f.k}`} name={f.k} autoComplete="off" inputMode={f.k === 'desercion_mes' ? 'decimal' : 'numeric'} aria-describedby={`meta-${f.k}-help`}
                  type={f.tipo}
                  className="input num"
                  value={metas[f.k]}
                  min="0"
                  step={f.k === 'desercion_mes' ? '0.1' : '1'}
                  disabled={saving}
                  onChange={e => { setMetas({ ...metas, [f.k]: parseFloat(e.target.value) || 0 }); setDirty(true); setSaved(false); setSaveError('') }}
                  style={{ width: 96, textAlign: 'center', fontSize: 16, fontWeight: 600, color: 'var(--ts-green)' }}
                />
                <span className="label" style={{ minWidth: 84, color: 'var(--text-dim)' }}>{f.suffix}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="panel" style={{ marginTop: 22 }}>
          <div className="panel__head">
            <h2 className="panel__title">Resumen de metas actuales</h2>
          </div>
          <div className="responsive-grid operations-grid--five">
            {campos.map(f => (
              <div key={f.k} style={{ textAlign: 'center', background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '16px 8px' }}>
                <div className="num" style={{ fontSize: 24, fontWeight: 700, color: 'var(--ts-green)', fontFamily: 'var(--font-serif)' }}>{metas[f.k]}</div>
                <div className="label" style={{ marginTop: 6, lineHeight: 1.4, color: 'var(--text-dim)' }}>{f.suffix}</div>
              </div>
            ))}
          </div>
        </div>
        </>}
      </main>
    </div>
  )
}
