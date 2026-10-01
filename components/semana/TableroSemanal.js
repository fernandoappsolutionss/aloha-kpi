'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import TableScroller from '../TableScroller'
import GraficaSemanal from './GraficaSemanal'
import { getTableroSemanal } from '../../app/actions/semana'

const mostrar = (valor) => valor == null ? 'Sin dato' : Number(valor).toLocaleString('es-PA')
const actual = (centro, codigo) => centro.abierta[codigo] ?? centro.cerrada[codigo]

export default function TableroSemanal() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [recarga, setRecarga] = useState(0)
  useEffect(() => {
    let active = true
    getTableroSemanal().then((result) => { if (active) { setDatos(result); setError('') } })
      .catch(() => { if (active) setError('No se pudo cargar la semana de cierre.') })
    return () => { active = false }
  }, [recarga])

  return <section className="panel semana-tablero">
    <div className="panel__head"><h2 className="panel__title">Semana de cierre</h2><span className="label">Niños activos · 12 semanas</span></div>
    <div className="semana-tablero__contenido">
      {error && <p role="alert" className="alert alert--error">{error} <button className="btn" type="button" onClick={() => setRecarga((n) => n + 1)}>Reintentar</button></p>}
      {!datos && !error && <p role="status">Cargando semana…</p>}
      {datos && <>
        {datos.consolidada.some((p) => p.incompleta) && <p role="status" className="h-sub">Las semanas incompletas suman solo los centros con dato.</p>}
        <GraficaSemanal puntos={datos.consolidada} titulo="Niños activos de todos los centros" unidad="niños" />
        <TableScroller label="Estadísticas semanales por centro" stickyFirstColumn>
          <table className="table semana-tablero__tabla">
            <caption className="sr-only">Estadísticas semanales por centro</caption>
            <thead><tr>{['Centro', 'Niños activos', 'Δ semana', '12 semanas', 'Nuevos', 'Retiros', 'Facturas vencidas', 'Clases de prueba'].map((label) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>{datos.centros.map((centro) => <tr key={centro.id}>
              <th scope="row"><Link className="operations-link" href={`/centro/${centro.id}/semana`}>{centro.nombre}</Link></th>
              <td>{mostrar(actual(centro, 'ninos_activos'))}</td>
              <td>{centro.delta == null ? 'Sin dato' : `${centro.delta > 0 ? '+' : ''}${centro.delta}`}</td>
              <td className="semana-tablero__mini"><GraficaSemanal puntos={centro.serie} titulo={`Niños activos de ${centro.nombre}`} compacta /></td>
              <td>{mostrar(actual(centro, 'nuevos_inscritos'))}</td>
              <td>{mostrar(actual(centro, 'retiros'))}</td>
              <td>{mostrar(actual(centro, 'facturas_vencidas'))}</td>
              <td>{mostrar(actual(centro, 'cp_asistidas'))}</td>
            </tr>)}
              {!datos.centros.length && <tr><td colSpan={8}>No hay centros en tu alcance.</td></tr>}
            </tbody>
          </table>
        </TableScroller>
      </>}
    </div>
  </section>
}
