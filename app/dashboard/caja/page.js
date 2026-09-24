'use client'
import { useCallback, useEffect, useState } from 'react'
import Sidebar from '../../../components/Sidebar'
import TableScroller from '../../../components/TableScroller'
import { getCaja } from '../../actions/caja'
import { CurvaCaja } from '../../../components/caja/CurvaCaja'
import { ImportarExtracto } from '../../../components/caja/ImportarExtracto'
import { BandejaClasificar } from '../../../components/caja/BandejaClasificar'
import { Compromisos } from '../../../components/caja/Compromisos'
import { usd, fechaCorta, EMPRESAS } from '../../../components/caja/formato'

export default function CajaPage() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [empresa, setEmpresa] = useState('altavia')

  const cargar = useCallback(() => {
    getCaja().then((r) => { if (r?.error) setError(r.error); else { setError(''); setDatos(r) } })
      .catch(() => setError('No se pudo cargar la caja. Intenta de nuevo.'))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const res = datos && empresa !== 'consolidado' ? datos.resumen[empresa] : null
  const cuentas = datos ? datos.cuentas.filter((c) => empresa === 'consolidado' || c.empresa === empresa) : []
  const saldoHoy = datos ? (res ? res.saldoHoy : datos.resumen.altavia.saldoHoy + datos.resumen.ff.saldoHoy) : 0

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
              {res && <div><div className="label">Cobro promedio / mes</div><b>{usd(res.perfil.promedioMensual)}</b></div>}
              {res?.balde && <div><div className="label">Baldes vigentes</div><b>Dueño {res.balde.dueno_pct}% · Impuesto {res.balde.impuesto_pct}%</b></div>}
              <div><div className="label">Línea de tormenta disponible</div><b>{usd(datos.lineaDisponible)}</b></div>
            </div>
            <h2 style={{ fontSize: 16, margin: '16px 0 8px' }}>Saldo por cuenta</h2>
            <TableScroller label="Saldo por cuenta">
              <table className="table">
                <thead><tr><th>Cuenta</th><th>Saldo</th><th>Dato del banco</th><th>Último movimiento</th></tr></thead>
                <tbody>
                  {cuentas.map((c) => (
                    <tr key={c.id}>
                      <td style={{ minWidth: 160 }}>{c.nombre}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{usd((c.base || 0) + c.posterior)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{c.base_fecha ? `al ${fechaCorta(c.base_fecha)}` : 'sin saldo del banco'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>{fechaCorta(c.ultimo_movimiento)}</td>
                    </tr>
                  ))}
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
