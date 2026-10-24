'use client'
import { useState } from 'react'
import TableScroller from '../TableScroller'
import { usdExacto, fechaCorta } from './formato'

export default function MovimientosCaja({ movimientos = [], desde, clases }) {
  const [filtro, setFiltro] = useState('todos')
  const [limite, setLimite] = useState(50)
  const filas = movimientos.filter(m => filtro === 'todos' || (filtro === 'salidas' ? m.monto < 0 : m.clase === filtro)).slice().reverse()
  return <section className="card" style={{ padding: 20, marginBottom: 16 }} aria-labelledby="caja-movimientos">
    <h2 id="caja-movimientos">Movimientos importados</h2>
    <p>Operaciones bancarias desde {fechaCorta(desde)}. Incluye las ya clasificadas. El extracto muestra pagos realizados; los gastos aún por pagar se registran en Pagos programados.</p>
    <label className="field"><span>Filtrar movimientos</span><select aria-label="Filtrar movimientos" className="select" value={filtro} onChange={e => { setFiltro(e.target.value); setLimite(50) }}><option value="todos">Todos</option><option value="salidas">Todas las salidas</option><option value="dueno">Transferencias al socio / dueño</option><option value="por_clasificar">Por clasificar</option></select></label>
    <p role="status">Mostrando {Math.min(limite, filas.length)} de {filas.length} movimientos.</p>
    <TableScroller label="Movimientos bancarios importados"><table className="table"><thead><tr><th>Fecha</th><th>Cuenta</th><th>Detalle</th><th>Monto</th><th>Clasificación</th></tr></thead><tbody>{filas.slice(0, limite).map(m => <tr key={m.id}><td>{fechaCorta(m.fecha)}</td><td>{m.cuenta_nombre}</td><td style={{ overflowWrap: 'anywhere', maxWidth: 320 }}>{m.memo}</td><td>{usdExacto(m.monto)}</td><td>{clases[m.clase] || m.clase}</td></tr>)}{!filas.length && <tr><td colSpan={5}>No hay movimientos con este filtro.</td></tr>}</tbody></table></TableScroller>
    {limite < filas.length && <button className="btn" onClick={() => setLimite(n => n + 50)}>Ver 50 más</button>}
  </section>
}
