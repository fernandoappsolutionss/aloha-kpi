'use client'
import { useState } from 'react'
import TableScroller from '../TableScroller'
import { guardarCompromiso, desactivarCompromiso } from '../../app/actions/caja'
import { usd, fechaCorta } from './formato'

const VACIO = { concepto: '', clase: 'planilla', categoria: '', monto: '', frecuencia: 'mensual', dia: '', fecha: '', hasta: '' }
// Sin 'dueno': la separación del dueño la hacen los baldes solos; un pago
// programado de dueño contaría dos veces (el servidor también lo rechaza).
const EGRESOS = ['planilla', 'regalia', 'kits', 'alquiler', 'servicios', 'impuesto', 'operativo_otro', 'linea']
const cuando = (c) => (c.frecuencia === 'mensual' ? `día ${c.dia} de cada mes` : c.frecuencia === 'quincenal' ? '15 y último día' : c.frecuencia === 'anual' ? `cada año, ${fechaCorta(c.fecha)}` : fechaCorta(c.fecha))

export function Compromisos({ empresa, compromisos, clases, onCambio }) {
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const lista = compromisos.filter((c) => c.empresa === empresa)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  async function guardar(e) {
    e.preventDefault(); setError(''); setGuardando(true)
    try {
      const r = await guardarCompromiso({ ...form, empresa })
      if (r?.error) { setError(r.error); return }
      setForm(null); onCambio()
    } catch {
      setError('No se pudo guardar el pago. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }
  async function quitar(c) {
    if (!window.confirm(`¿Quitar "${c.concepto}" de la proyección?`)) return
    setError('')
    try {
      const r = await desactivarCompromiso(c.id)
      if (r?.error) setError(r.error)
      else onCambio()
    } catch {
      setError('No se pudo quitar el pago. Intenta de nuevo.')
    }
  }

  return (
    <section className="card" style={{ padding: 20, marginBottom: 16 }} aria-labelledby="caja-compromisos">
      <h2 id="caja-compromisos" style={{ marginTop: 0 }}>Pagos programados</h2>
      <p className="h-sub">Lo que la curva descuenta en el futuro. Los marcados &quot;(estimado)&quot; salen de Zoho: corrígelos con el monto real. La parte del dueño no va aquí: la separan los baldes.</p>
      {error && <p role="alert" className="alert alert--error">{error}</p>}
      {lista.length === 0 ? <p>Todavía no hay pagos programados para esta empresa.</p> : (
        <TableScroller label="Pagos programados">
          <table className="table">
            <thead><tr><th>Concepto</th><th>Clase</th><th>Monto</th><th>Cuándo</th><th><span className="sr-only">Acciones</span></th></tr></thead>
            <tbody>
              {lista.map((c) => (
                <tr key={c.id}>
                  <td style={{ minWidth: 160 }}>{c.concepto}</td>
                  <td>{clases[c.clase] || c.clase}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{usd(c.monto)}</td>
                  <td>{cuando(c)}{c.hasta ? ` · hasta ${fechaCorta(c.hasta)}` : ''}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn" type="button" aria-label={`Editar ${c.concepto}`}
                      onClick={() => { setError(''); setForm({ ...VACIO, ...c, monto: String(c.monto), dia: c.dia ?? '', fecha: c.fecha ?? '', hasta: c.hasta ?? '' }) }}>Editar</button>{' '}
                    <button className="btn btn--danger" type="button" aria-label={`Quitar ${c.concepto}`} onClick={() => quitar(c)}>Quitar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroller>
      )}
      {!form && <button className="btn btn--primary" type="button" onClick={() => { setError(''); setForm(VACIO) }} style={{ marginTop: 12 }}>Agregar pago</button>}
      {form && (
        <form onSubmit={guardar} style={{ display: 'grid', gap: 10, maxWidth: 480, marginTop: 12 }} aria-label={form.id ? 'Editar pago' : 'Agregar pago'}>
          <label className="field"><span className="label">Concepto</span>
            <input className="input" value={form.concepto} onChange={set('concepto')} required maxLength={120} style={{ fontSize: 16 }} />
          </label>
          <label className="field"><span className="label">Clase</span>
            <select className="select" value={form.clase} style={{ fontSize: 16 }}
              onChange={(e) => setForm({ ...form, clase: e.target.value, categoria: form.categoria === clases[form.clase] ? '' : form.categoria })}>
              {!EGRESOS.includes(form.clase) && <option value={form.clase} disabled>{clases[form.clase] || form.clase} (no programable)</option>}
              {EGRESOS.map((k) => <option key={k} value={k}>{clases[k]}</option>)}
            </select>
          </label>
          <label className="field"><span className="label">Monto (USD)</span>
            <input className="input" type="number" inputMode="decimal" min="0.01" step="0.01" value={form.monto} onChange={set('monto')} required style={{ fontSize: 16 }} />
          </label>
          <label className="field"><span className="label">Frecuencia</span>
            <select className="select" value={form.frecuencia} onChange={set('frecuencia')} style={{ fontSize: 16 }}>
              <option value="mensual">Mensual</option><option value="quincenal">Quincenal (15 y último día)</option>
              <option value="unico">Una sola vez</option><option value="anual">Anual</option>
            </select>
          </label>
          {form.frecuencia === 'mensual' && (
            <label className="field"><span className="label">Día del mes</span>
              <input className="input" type="number" inputMode="numeric" min="1" max="31" value={form.dia} onChange={set('dia')} required style={{ fontSize: 16 }} />
            </label>
          )}
          {['unico', 'anual'].includes(form.frecuencia) && (
            <label className="field"><span className="label">Fecha</span>
              <input className="input" type="date" value={form.fecha} onChange={set('fecha')} required style={{ fontSize: 16 }} />
            </label>
          )}
          <label className="field"><span className="label">Hasta (opcional)</span>
            <input className="input" type="date" value={form.hasta} onChange={set('hasta')} style={{ fontSize: 16 }} />
          </label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn--primary" type="submit" disabled={guardando}>Guardar</button>
            <button className="btn" type="button" onClick={() => setForm(null)}>Cancelar</button>
          </div>
        </form>
      )}
    </section>
  )
}
