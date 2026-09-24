'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import Sidebar from '../../../components/Sidebar'
import TableScroller from '../../../components/TableScroller'
import { getCaja } from '../../actions/caja'
import { CurvaCaja } from '../../../components/caja/CurvaCaja'
import { ImportarExtracto } from '../../../components/caja/ImportarExtracto'
import { BandejaClasificar } from '../../../components/caja/BandejaClasificar'
import { Compromisos } from '../../../components/caja/Compromisos'
import { usd, fechaCorta, EMPRESAS } from '../../../components/caja/formato'
import { diasEntre } from '../../../lib/caja/semanas.mjs'

const DIAS_SALDO_VIEJO = 7
const OPERATIVAS = new Set(['operativa', 'recaudadora'])
// Días desde el último saldo del banco de una cuenta que alimenta la curva; null si está al día.
function atraso(c, hoy) {
  if (!OPERATIVAS.has(c.tipo) || !c.base_fecha) return null
  const dias = diasEntre(c.base_fecha, hoy)
  return dias > DIAS_SALDO_VIEJO ? dias : null
}

export default function CajaPage() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [empresa, setEmpresa] = useState('altavia')

  // Solo pinta la respuesta de la última petición: una recarga lenta no pisa a una más nueva.
  const pedido = useRef(0)
  const cargar = useCallback(() => {
    const n = ++pedido.current
    getCaja().then((r) => {
      if (n !== pedido.current) return
      if (r?.error) setError(r.error); else { setError(''); setDatos(r) }
    }).catch(() => { if (n === pedido.current) setError('No se pudo cargar la caja. Intenta de nuevo.') })
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const res = datos && empresa !== 'consolidado' ? datos.resumen[empresa] : null
  const cuentas = datos ? datos.cuentas.filter((c) => empresa === 'consolidado' || c.empresa === empresa) : []
  const saldoHoy = datos ? (res ? res.saldoHoy : datos.resumen.altavia.saldoHoy + datos.resumen.ff.saldoHoy) : 0
  const viejas = datos ? cuentas.map((c) => ({ c, dias: atraso(c, datos.hoy) })).filter((x) => x.dias !== null) : []

  return (
    <div className="shell">
      <Sidebar rol="admin_general" />
      <main id="main-content" data-page-state={!datos && !error ? 'loading' : error ? 'error' : 'ready'} className="main operations-page">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Finanzas · Altavia y F&amp;F</div>
            <h1 className="h-title">Curva de 13 semanas</h1>
            <p className="h-sub">Caja real del banco, pagos programados y cuánto queda disponible cada semana.</p>
          </div>
        </div>
        {error && <p role="alert" className="alert alert--error">{error}</p>}
        {!datos && !error && <p role="status">Cargando caja…</p>}
        {datos && <>
          <div role="group" aria-label="Empresa" style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {EMPRESAS.map((e) => (
              <button key={e.id} aria-pressed={empresa === e.id} type="button"
                className={`btn${empresa === e.id ? ' btn--primary' : ''}`} onClick={() => setEmpresa(e.id)}>{e.nombre}</button>
            ))}
          </div>

          <section className="card" style={{ padding: 20, marginBottom: 16 }} aria-label="Resumen">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
              <div><div className="label">Saldo en bancos hoy</div><b>{usd(saldoHoy)}</b></div>
              {res && <div><div className="label">Dueño por separar</div><b>{usd(res.baldesEstado.duenoPendiente)}</b></div>}
              {res && <div><div className="label">Reserva de impuesto</div><b>{usd(res.baldesEstado.reservaImpuesto)}</b></div>}
              {res && <div><div className="label">Cobro promedio / mes</div><b>{usd(res.perfil.promedioMensual)}</b>{res.perfil.estimado && <div className="h-sub" style={{ margin: 0 }}>(estimado desde Zoho — sube extractos)</div>}</div>}
              {res?.balde && <div><div className="label">Baldes vigentes</div><b>Dueño {res.balde.dueno_pct}% · Impuesto {res.balde.impuesto_pct}%</b></div>}
              <div><div className="label">Línea de tormenta disponible</div><b>{usd(datos.lineaDisponible)}</b></div>
            </div>
            {viejas.length > 0 && (
              <p role="alert" className="alert" style={{ marginTop: 12, background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: 'var(--warn-text)' }}>
                ⚠️ Saldo viejo en {viejas.map(({ c, dias }) => `${c.nombre} (${dias} días)`).join(', ')}: sube el estado más reciente.
              </p>
            )}
            <h2 style={{ fontSize: 16, margin: '16px 0 8px' }}>Saldo por cuenta</h2>
            <TableScroller label="Saldo por cuenta">
              <table className="table">
                <thead><tr><th>Cuenta</th><th>Saldo</th><th>Dato del banco</th><th>Último movimiento</th></tr></thead>
                <tbody>
                  {cuentas.length === 0 && <tr><td colSpan={4}>Sin cuentas registradas.</td></tr>}
                  {cuentas.map((c) => {
                    const dias = atraso(c, datos.hoy)
                    return (
                      <tr key={c.id}>
                        <td style={{ minWidth: 160 }}>{c.nombre}</td>
                        <td style={{ whiteSpace: 'nowrap' }}>{usd((c.base || 0) + c.posterior)}</td>
                        <td style={{ minWidth: 140 }}>
                          {c.base_fecha ? `al ${fechaCorta(c.base_fecha)}` : 'sin saldo del banco'}
                          {dias !== null && <div style={{ color: 'var(--warn-text)', fontWeight: 600 }}>⚠️ saldo de hace {dias} días — sube el estado más reciente</div>}
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>{fechaCorta(c.ultimo_movimiento)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </TableScroller>
          </section>

          <CurvaCaja key={empresa} empresa={empresa} curva={datos.curvas[empresa]} clases={datos.clases} onCambio={cargar} />
          <ImportarExtracto onCambio={cargar} />
          <BandejaClasificar pendientes={datos.pendientes.filter((p) => empresa === 'consolidado' || p.empresa === empresa)} clases={datos.clases} onCambio={cargar} />
          {empresa !== 'consolidado' && <Compromisos key={empresa} empresa={empresa} compromisos={datos.compromisos} clases={datos.clases} onCambio={cargar} />}
        </>}
      </main>
    </div>
  )
}
