'use client'
import { useEffect, useRef, useState } from 'react'
import Dialog from '../Dialog'
import TableScroller from '../TableScroller'
import { getFacturasVencidas } from '../../app/actions/cobranza'

const fechaVisible = valor => valor?.split('-').reverse().join('/') || '—'
const saldoVisible = factura => `${Number(factura.saldo).toLocaleString('es-PA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${factura.moneda}`

function SaldoTotal({ saldos, destacado = false }) {
  return <div className={destacado ? 'cobranza-detalle__total' : 'cobranza-detalle__saldo'} aria-label="Saldo total vencido">
    <span className="h-sub">Saldo total vencido</span>
    {saldos == null ? <span className="h-sub">No disponible</span> : saldos.length === 0
      ? <strong>0.00</strong> : saldos.map(saldo => <strong key={saldo.moneda}>{saldoVisible(saldo)}</strong>)}
  </div>
}

export default function FacturasVencidas({ centro, sinDato }) {
  const [abierto, setAbierto] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [intento, setIntento] = useState(0)
  const botonRef = useRef(null)
  const total = centro.abierta.facturas_vencidas
  const { fecha, registradoAt, anterior, saldos } = centro.cobranza?.detalle || {}
  useEffect(() => {
    if (!abierto) return undefined
    let activo = true
    setResultado(null)
    getFacturasVencidas({ centroId: centro.id, fecha, registradoAt, total })
      .then(datos => { if (activo) setResultado(datos) })
      .catch(() => { if (activo) setResultado({ error: 'No se pudo cargar el detalle. Inténtalo de nuevo.' }) })
    return () => { activo = false }
  }, [abierto, centro.id, fecha, registradoAt, total, intento])

  return <>
    {total == null ? sinDato : <button ref={botonRef} type="button" className="operations-link cobranza-detalle__boton"
      aria-label={`Ver ${total} facturas vencidas de ${centro.nombre}`} aria-haspopup="dialog"
      onClick={() => { setResultado(null); setAbierto(true) }}>{Number(total).toLocaleString('es-PA')}<span className="h-sub">Ver detalle</span></button>}
    {total != null && <SaldoTotal saldos={saldos} />}
    {fecha && <div className="h-sub">Último conteo: {fechaVisible(fecha)}</div>}
    {anterior && <div className="h-sub">Dato anterior · pendiente de actualización</div>}
    <Dialog open={abierto} title={`Facturas vencidas · ${centro.nombre}`} width={900}
      description={`Último conteo: ${fechaVisible(fecha)} · ${total} facturas. Solo mensualidades con saldo vencido.`}
      onClose={() => setAbierto(false)} returnFocusRef={botonRef}>
      {!resultado && <p role="status">Cargando facturas…</p>}
      {resultado?.error && <div role="alert" className="alert alert--error">{resultado.error} <button type="button" className="btn" onClick={() => setIntento(n => n + 1)}>Reintentar</button></div>}
      {resultado?.facturas && <>
        <SaldoTotal saldos={resultado.saldos} destacado />
        <p className="h-sub">Saldos al momento del conteo. Los pagos posteriores aparecerán en la próxima actualización.</p>
        {resultado.facturas.length === 0 ? <p role="status">Este centro no tiene mensualidades vencidas en este conteo.</p> :
          <TableScroller label={`Detalle de facturas vencidas de ${centro.nombre}`}>
            <table className="table cobranza-detalle__tabla">
              <caption className="sr-only">{resultado.total} facturas vencidas de {centro.nombre}</caption>
              <thead><tr><th scope="col">Cliente</th><th scope="col">Número de factura</th><th scope="col">Saldo</th><th scope="col">Fecha de vencimiento</th></tr></thead>
              <tbody>{resultado.facturas.map(factura => <tr key={factura.id}>
                <th scope="row">{factura.cliente}</th><td>{factura.numero}</td>
                <td>{saldoVisible(factura)}</td><td>{fechaVisible(factura.vencimiento)}</td>
              </tr>)}</tbody>
            </table>
          </TableScroller>}
      </>}
    </Dialog>
  </>
}
