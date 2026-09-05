'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import PeriodSelector from '../../../components/PeriodSelector'
import { getCentrosKpi } from '../../actions/dashboard'
import { getMetasMarcadasPanel } from '../../actions/cumplimiento'
import AvisoDiscrepanciaMetas from '../../../components/AvisoDiscrepanciaMetas'
import AvisoDiscrepanciaHistorico from '../../../components/AvisoDiscrepanciaHistorico'
import { getCurrentPeriod, readStoredPeriod, writeStoredPeriod, periodLabel, quarterMonths } from '../../../lib/period'

const COLORS = {
  critico: { bg:'var(--bad-bg)', border:'var(--bad-line)', title:'var(--bad-text)', dot:'var(--bad)' },
  advertencia: { bg:'var(--warn-bg)', border:'var(--warn-line)', title:'var(--warn-text)', dot:'var(--warn)' },
  info: { bg:'var(--ok-bg)', border:'var(--ok-line)', title:'var(--ok-text)', dot:'var(--ok)' },
}

const nivelTxt = (n) => (n ? `Nivel ${n}` : 'Sin nivel')

// Genera VARIAS alertas por centro: el CUMPLIMIENTO siempre está presente (en su
// banda) y se le SUMAN las alertas de nivel, niños por grupo y tendencia.
// prevNivel: mapa centro_id -> nivel del trimestre anterior (para detectar bajadas).
function buildAlertas(centros, prevNivel, label) {
  const out = []
  for (const c of centros) {
    // ── PRODUCTO (siempre se muestra, según su semáforo) ──
    // Antes esta rama salía del checklist de 33 criterios: un centro que
    // decrecía emitía "Buen cumplimiento (88%)" en banda VERDE. El mensaje lo
    // escribe ahora el propio semáforo, que ya trae el motivo con su número.
    const s = c.semaforo
    const motivo = s?.motivo || ''
    if (c.estado === 'Crítico') {
      out.push({ tipo:'critico', centro:c.nombre, fecha: label,
        msg:`${motivo} Ventas ${c.ventasQ}/${c.metaQ} y ${c.desercionReal} bajas reales en el periodo.` })
    } else if (c.estado === 'Parcial') {
      out.push({ tipo:'advertencia', centro:c.nombre, fecha: label,
        msg:`${motivo}${c.ventasQ < c.metaQ ? ` Faltan ${c.metaQ - c.ventasQ} ventas para la meta.` : ''}` })
    } else {
      out.push({ tipo:'info', centro:c.nombre, fecha: label,
        msg:`${motivo}${c.nivel ? ` · ${nivelTxt(c.nivel)}` : ''}` })
    }

    // ── Críticas adicionales: bajada de nivel y niños por grupo ──
    const pv = prevNivel[c.id] || 0
    if (c.nivel < pv) {
      out.push({ tipo:'critico', centro:c.nombre, fecha: label,
        msg:`Bajó de ${nivelTxt(pv)} a ${nivelTxt(c.nivel)} este trimestre (${c.ninos} niños).` })
    }
    if (c.gpnBajo) {
      out.push({ tipo:'critico', centro:c.nombre, fecha: label,
        msg:`Niños por grupo por debajo de la meta: ${c.ninosGrupo.toFixed(1)} (meta ≥ ${c.metaGpn}). La baja ocupación golpea la rentabilidad.` })
    }

    // ── Advertencia adicional: tendencia a la baja ──
    if (c.trend === '↓') {
      out.push({ tipo:'advertencia', centro:c.nombre, fecha: label,
        msg:`Tendencia a la baja: los nuevos ingresos cayeron respecto al mes anterior.` })
    }
  }
  return out
}

export default function AlertasPage() {
  const [alertas, setAlertas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  // Contraste entre lo GUARDADO en `cumplimiento` y lo CALCULADO. Va aparte de
  // `alertas` porque no es una alerta de gestión: es un aviso de que dos
  // fuentes del propio sistema no dicen lo mismo, y no se puede descartar.
  const [centrosKpi, setCentrosKpi] = useState([])
  const [metasMarcadas, setMetasMarcadas] = useState([])
  // Un fallo al leer las metas guardadas NO puede verse igual que "no hay
  // discrepancias": antes se tragaba con .catch(() => []) y la tarjeta
  // desaparecía sin decir nada, así que el supervisor concluía que ya estaba
  // corregido. Se guarda y se dice.
  const [errorMetas, setErrorMetas] = useState('')
  const [period, setPeriod] = useState(getCurrentPeriod())
  const label = periodLabel(period.year, period.quarter)
  function changePeriod(p) { writeStoredPeriod(p); setPeriod(p) }

  useEffect(() => { setPeriod(readStoredPeriod()) }, [])
  useEffect(() => {
    let active = true
    setLoading(true); setError(''); setErrorMetas('')
    const prevQ = period.quarter > 1 ? period.quarter - 1 : 4
    const prevY = period.quarter > 1 ? period.year : period.year - 1
    Promise.all([
      getCentrosKpi(period.year, period.quarter),
      getCentrosKpi(prevY, prevQ),
      // Las alertas de gestión siguen sirviendo aunque esta lectura falle,
      // pero el fallo se REPORTA: se marca con `fallo` en vez de degradar a
      // lista vacía, que se leería como "no hay nada que corregir".
      getMetasMarcadasPanel(period.year, period.quarter).catch((causa) => {
        console.error('[Alertas] no se pudieron leer las metas guardadas:', causa)
        return { fallo: true }
      }),
    ])
      .then(([cur, prev, marcadas]) => {
        if (!active) return
        const prevNivel = {}
        for (const c of (prev || [])) prevNivel[c.id] = c.nivel
        setAlertas(buildAlertas(cur || [], prevNivel, label))
        setCentrosKpi(cur || [])
        if (marcadas && marcadas.fallo) {
          setMetasMarcadas([])
          setErrorMetas('No se pudo contrastar las metas guardadas de este trimestre contra el cálculo. Recarga la página: esto no quiere decir que no haya discrepancias.')
        } else {
          setMetasMarcadas(marcadas || [])
        }
      })
      .catch(() => { if (active) setError('No se pudo cargar alertas. Intenta de nuevo.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [period])

  const criticas = alertas.filter(a => a.tipo === 'critico')
  const advertencias = alertas.filter(a => a.tipo === 'advertencia')
  const info = alertas.filter(a => a.tipo === 'info')

  return (
    <div className="shell">
      <Sidebar rol="admin_general"/>
      <main id="main-content" data-page-state={loading ? 'loading' : error ? 'error' : 'ready'} className="main operations-page">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Alertas · {label}</div>
            <h1 className="h-title">Alertas</h1>
            {!loading && !error && <p className="h-sub" role="status">{criticas.length} críticas · {advertencias.length} advertencias · {info.length} positivas</p>}
          </div>
          <PeriodSelector value={period} onChange={changePeriod} />
        </div>

        {/* Va ARRIBA de las alertas de gestión y fuera de su lista: esto no es
            "un centro va mal", es "el sistema no está de acuerdo consigo
            mismo". Se queda hasta que las dos fuentes coincidan.

            El histórico completo va PRIMERO y NO recibe período: es el número
            que no se puede apagar cambiando el trimestre de arriba. Debajo, la
            tarjeta del trimestre seleccionado, con el detalle por centro. */}
        <AvisoDiscrepanciaHistorico />

        {errorMetas && <p role="status" className="discrepancia-historico__error">{errorMetas}</p>}
        {!loading && !error && !errorMetas && (
          <AvisoDiscrepanciaMetas
            centros={centrosKpi}
            marcadas={metasMarcadas}
            mesesDelTrimestre={quarterMonths(period.quarter)}
            periodo={label}
          />
        )}

        {error ? <p role="alert" className="alert alert--error">{error}</p> : loading ? (
          <div role="status" className="panel" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Generando alertas…</div>
        ) : alertas.length === 0 ? (
          <div className="panel" style={{ padding: 48, textAlign: 'center', color: 'var(--text-dim)' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔔</div>
            <div style={{ fontWeight: 600, color: 'var(--text)' }}>No hay alertas todavía</div>
            <div style={{ marginTop: 6 }}>Las alertas se generan a partir del cumplimiento de cada centro.</div>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="responsive-grid operations-grid--three">
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
                      <article className="operations-alert" key={i} style={{ background: COLORS[a.tipo].bg, border: `1px solid ${COLORS[a.tipo].border}`, borderRadius: 'var(--r)', padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[a.tipo].dot, flexShrink: 0, marginTop: 7 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div className="operations-alert__head">
                            <h3 style={{ fontWeight: 600, color: COLORS[a.tipo].title }}>{a.centro}</h3>
                            <span className="label" style={{ color: 'var(--text-faint)' }}>{a.fecha}</span>
                          </div>
                          <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>{a.msg}</p>
                        </div>
                      </article>
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
