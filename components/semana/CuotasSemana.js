'use client'
import { useEffect, useState } from 'react'
import TableScroller from '../TableScroller'
import { guardarCuotas, aprobarCuotas } from '../../app/actions/semana'

const mostrar = (valor) => valor == null ? 'Sin dato' : Number(valor).toLocaleString('es-PA')

export default function CuotasSemana({ centroId, semanaFin, catalogo, resumen, cuotas, puedeEscribir, puedeAprobar, onRefresh }) {
  const [valores, setValores] = useState({})
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [estado, setEstado] = useState('')

  useEffect(() => {
    setValores(Object.fromEntries(catalogo.map((meta) => [meta.codigo, cuotas[meta.codigo]?.cuota ?? cuotas[meta.codigo]?.propuesta ?? ''])))
  }, [catalogo, cuotas])

  async function enviar(event) {
    event.preventDefault()
    const aprobar = event.nativeEvent.submitter?.value === 'aprobar'
    const payload = Object.fromEntries(Object.entries(valores).filter(([, valor]) => valor !== '').map(([codigo, valor]) => [codigo, Number(valor)]))
    if (!Object.keys(payload).length) { setError('Escribe al menos una cuota.'); return }
    setOcupado(true); setError(''); setEstado('')
    try {
      if (aprobar) await aprobarCuotas(centroId, semanaFin, payload)
      else await guardarCuotas(centroId, semanaFin, payload)
      await onRefresh()
      setEstado(aprobar ? 'Cuotas aprobadas.' : 'Cuotas guardadas para aprobación.')
    } catch (cause) { setError(cause?.message || 'No se pudieron guardar las cuotas.') }
    finally { setOcupado(false) }
  }

  return <section data-tour="semana.cuotas" className="panel semana-cuotas" aria-labelledby="semana-cuotas-title">
    <div className="panel__head"><div><p className="label">Semana abierta · cierre {semanaFin}</p><h2 id="semana-cuotas-title" className="panel__title">Cuotas semanales</h2></div></div>
    <form onSubmit={enviar}>
      <TableScroller label="Cuotas semanales por estadística" stickyFirstColumn>
        <table className="table semana-cuotas__tabla">
          <thead><tr>{['Estadística', 'Última cerrada', 'Propuesta', 'Cuota', 'Estado'].map((texto) => <th key={texto}>{texto}</th>)}</tr></thead>
          <tbody>{catalogo.map((meta) => {
            const cuota = cuotas[meta.codigo] || {}
            return <tr key={meta.codigo}>
              <th scope="row">{meta.nombre}</th>
              <td>{mostrar(resumen[meta.codigo]?.cerrada)}</td>
              <td>{mostrar(cuota.propuesta)}<p className="h-sub" style={{ maxWidth: 300, whiteSpace: 'normal' }}>{cuota.explicacion}</p></td>
              <td>{puedeEscribir ? <input aria-label={`Cuota de ${meta.nombre}`} className="input num" type="number" inputMode="numeric" min="0" step="1" value={valores[meta.codigo] ?? ''} onChange={(event) => setValores((anterior) => ({ ...anterior, [meta.codigo]: event.target.value }))} /> : mostrar(cuota.cuota)}</td>
              <td>{cuota.estado === 'aprobada' ? 'Aprobada' : cuota.estado === 'propuesta' ? 'Propuesta' : 'Sin guardar'}</td>
            </tr>
          })}</tbody>
        </table>
      </TableScroller>
      {(puedeEscribir || puedeAprobar) && <div className="semana-cuotas__acciones">
        {puedeEscribir && <button type="submit" className="btn" value="guardar" disabled={ocupado}>Guardar cuotas</button>}
        {puedeAprobar && <button type="submit" className="btn btn--primary" value="aprobar" disabled={ocupado}>Aprobar cuotas</button>}
      </div>}
    </form>
    {error && <p role="alert" className="alert alert--error">{error}</p>}
    {estado && <p role="status" className="h-sub">{estado}</p>}
  </section>
}
