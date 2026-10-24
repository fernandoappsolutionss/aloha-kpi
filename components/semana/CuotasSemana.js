'use client'
import { useEffect, useRef, useState } from 'react'
import { actualizarBorradorCuotas } from '../../lib/cuotas-semana.mjs'
import { sumarDias } from '../../lib/semana-cierre.mjs'
import TableScroller from '../TableScroller'
import { guardarCuotas, aprobarCuotas } from '../../app/actions/semana'

const mostrar = (valor) => valor == null ? 'Sin dato' : Number(valor).toLocaleString('es-PA')

export default function CuotasSemana({ centroId, semanaFin, catalogo, resumen, cuotas, puedeEscribir, puedeAprobar, onRefresh }) {
  const [valores, setValores] = useState({})
  const editados = useRef(new Set())
  const [ocupado, setOcupado] = useState(false)
  const [error, setError] = useState('')
  const [estado, setEstado] = useState('')

  useEffect(() => {
    setValores(previos => actualizarBorradorCuotas(catalogo, cuotas, previos, editados.current))
  }, [catalogo, cuotas])

  async function enviar(event) {
    event.preventDefault()
    const aprobar = event.nativeEvent.submitter?.value === 'aprobar'
    const payload = Object.fromEntries(Object.entries(valores).filter(([, valor]) => valor !== '').map(([codigo, valor]) => [codigo, Number(valor)]))
    if (!Object.keys(payload).length) { setError('Escribe al menos una cuota.'); return }
    setOcupado(true); setError(''); setEstado('')
    let guardado = false
    try {
      const r = aprobar ? await aprobarCuotas(centroId, semanaFin, payload) : await guardarCuotas(centroId, semanaFin, payload)
      if (r?.error) throw new Error(r.error)
      guardado = true
      editados.current.clear()
      await onRefresh()
      setEstado(aprobar ? 'Cuotas aprobadas.' : 'Cuotas guardadas para aprobación.')
    } catch (cause) { setError(guardado ? 'Las cuotas se guardaron. Recarga para actualizar la vista sin repetir el envío.' : cause?.message || 'No se pudieron guardar las cuotas.') }
    finally { setOcupado(false) }
  }

  return <section data-tour="semana.cuotas" className="panel semana-cuotas" aria-labelledby="semana-cuotas-title">
    <div className="panel__head"><div><p className="label">Semana abierta · cierre {semanaFin}</p><h2 id="semana-cuotas-title" className="panel__title">Cuotas semanales</h2></div></div>
    <p className="h-sub">Última cerrada: {sumarDias(semanaFin, -7)}. Son resultados al corte del jueves; no son las metas de esta semana.</p>
    <p className="h-sub">{puedeAprobar ? 'Revisa los valores y pulsa Aprobar cuotas para dejarlos acordados.' : 'Guarda tu propuesta. El coordinador operativo la revisa y aprueba en la reunión semanal.'} Cambiar una cuota aprobada la devuelve a propuesta.</p>
    {puedeEscribir && <button type="button" className="btn" disabled={ocupado} onClick={() => {
      setValores(Object.fromEntries(catalogo.map(({ codigo }) => [codigo, cuotas[codigo]?.propuesta ?? ''])))
      editados.current = new Set(catalogo.map(({ codigo }) => codigo))
      setEstado('Propuesta automática copiada. Revisa los valores y guarda o aprueba.'); setError('')
    }}>Usar propuesta automática</button>}
    <form onSubmit={enviar}>
      <TableScroller label="Cuotas semanales por estadística" stickyFirstColumn>
        <table className="table semana-cuotas__tabla">
          <thead><tr>{['Estadística', 'Última cerrada', 'Propuesta', 'Cuota', 'Estado'].map((texto) => <th key={texto}>{texto}</th>)}</tr></thead>
          <tbody>{catalogo.map((meta) => {
            const cuota = cuotas[meta.codigo] || {}
            return <tr key={meta.codigo}>
              <th scope="row">{meta.nombre}<p className="h-sub">{meta.tipo === 'nivel' ? 'Total al cierre, no cantidad a sumar.' : meta.inversa ? 'Máximo de la semana.' : 'Total a lograr en la semana.'}</p></th>
              <td>{mostrar(resumen[meta.codigo]?.cerrada)}<details className="semana-ayuda"><summary>Origen del dato</summary><p>{meta.fuente}</p></details></td>
              <td>{mostrar(cuota.propuesta)}<p className="h-sub" style={{ maxWidth: 300, whiteSpace: 'normal' }}>{cuota.explicacion}</p></td>
              <td>{puedeEscribir ? <input disabled={ocupado} aria-label={`Cuota de ${meta.nombre}`} className="input num" type="number" inputMode="numeric" min="0" step="1" value={valores[meta.codigo] ?? ''} onChange={(event) => { editados.current.add(meta.codigo); setValores((anterior) => ({ ...anterior, [meta.codigo]: event.target.value })) }} /> : mostrar(cuota.cuota)}{meta.codigo === 'ninos_activos' && valores[meta.codigo] !== '' && resumen[meta.codigo]?.cerrada != null && Number(valores[meta.codigo]) < Number(resumen[meta.codigo].cerrada) && <p className="h-sub">Estás fijando un total menor al último cierre. Para sumar {mostrar(valores[meta.codigo])} niños, el total sería {mostrar(Number(resumen[meta.codigo].cerrada) + Number(valores[meta.codigo]))}.</p>}</td>
              <td>{editados.current.has(meta.codigo) && Number(valores[meta.codigo]) !== cuota.cuota ? 'Cambio sin guardar' : cuota.cuota == null ? 'Sugerida · sin guardar' : cuota.estado === 'aprobada' ? 'Aprobada' : 'Propuesta'}</td>
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
