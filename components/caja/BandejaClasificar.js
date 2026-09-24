'use client'
import { useState } from 'react'
import TableScroller from '../TableScroller'
import { clasificarMovimiento } from '../../app/actions/caja'
import { usdExacto, fechaCorta } from './formato'

function Fila({ m, clases, onCambio }) {
  const [clase, setClase] = useState('')
  const [categoria, setCategoria] = useState('')
  const [regla, setRegla] = useState(false)
  const [patron, setPatron] = useState((m.memo || '').slice(0, 60))
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  async function guardar(e) {
    e.preventDefault()
    if (guardando) return
    setError(''); setGuardando(true)
    try {
      const r = await clasificarMovimiento({ id: m.id, clase, categoria: categoria || clases[clase], patron: regla ? patron : null })
      if (r?.error) { setError(r.error); setGuardando(false); return }
      // Éxito: el botón queda apagado hasta que la recarga saque la fila (sin doble envío).
      onCambio()
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.')
      setGuardando(false)
    }
  }
  const quien = `movimiento del ${fechaCorta(m.fecha)} por ${usdExacto(m.monto)}`
  return (
    <tr>
      <td style={{ whiteSpace: 'nowrap' }}>{fechaCorta(m.fecha)}</td>
      <td style={{ whiteSpace: 'nowrap' }}>{m.cuenta_nombre || (m.empresa === 'ff' ? 'F&F' : 'Altavia')}</td>
      <td style={{ whiteSpace: 'nowrap', color: m.monto < 0 ? 'var(--bad-text, #B3261E)' : undefined }}>{usdExacto(m.monto)}</td>
      <td style={{ minWidth: 200, maxWidth: 320, overflowWrap: 'anywhere' }}>{m.memo}</td>
      <td>
        <form onSubmit={guardar} style={{ display: 'grid', gap: 6, minWidth: 220 }}>
          <select className="select" aria-label={`Clase del ${quien}`} value={clase} onChange={(e) => setClase(e.target.value)} required style={{ fontSize: 16 }}>
            <option value="">Elegir…</option>
            {Object.entries(clases).filter(([k]) => k !== 'por_clasificar').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input className="input" aria-label={`Categoría del ${quien} (opcional)`} placeholder="Categoría (opcional)" value={categoria} onChange={(e) => setCategoria(e.target.value)} style={{ fontSize: 16 }} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', minHeight: 44 }}>
            <input type="checkbox" aria-label={`Crear regla con el texto del ${quien}`} checked={regla} onChange={(e) => setRegla(e.target.checked)} /> Crear regla con este texto
          </label>
          {regla && <input className="input" aria-label={`Texto de la regla para el ${quien}`} value={patron} onChange={(e) => setPatron(e.target.value)} style={{ fontSize: 16 }} />}
          <button className="btn" type="submit" disabled={guardando} aria-label={`Guardar clasificación del ${quien}`}>{guardando && !error ? 'Guardando…' : 'Guardar'}</button>
          {error && <span role="alert" className="alert alert--error">{error}</span>}
        </form>
      </td>
    </tr>
  )
}

export function BandejaClasificar({ pendientes, clases, onCambio }) {
  if (!pendientes.length) {
    return (
      <section className="card" style={{ padding: 20, marginBottom: 16 }} aria-labelledby="caja-bandeja">
        <h2 id="caja-bandeja" style={{ marginTop: 0 }}>Por clasificar</h2>
        <p>✅ Todo clasificado.</p>
      </section>
    )
  }
  return (
    <section className="card" style={{ padding: 20, marginBottom: 16 }} aria-labelledby="caja-bandeja">
      <h2 id="caja-bandeja" style={{ marginTop: 0 }}>Por clasificar ({pendientes.length})</h2>
      <p className="h-sub">Lo que el sistema no reconoce. Marca &quot;Crear regla&quot; y los próximos se clasifican solos.</p>
      <TableScroller label="Movimientos por clasificar">
        <table className="table">
          <thead><tr><th>Fecha</th><th>Cuenta</th><th>Monto</th><th>Detalle del banco</th><th>Clasificar</th></tr></thead>
          <tbody>{pendientes.map((m) => <Fila key={m.id} m={m} clases={clases} onCambio={onCambio} />)}</tbody>
        </table>
      </TableScroller>
    </section>
  )
}
