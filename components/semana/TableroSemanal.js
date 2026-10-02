'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import TableScroller from '../TableScroller'
import GraficaSemanal from './GraficaSemanal'
import { getTableroSemanal } from '../../app/actions/semana'
import { colorCondicion, nombreCondicion } from '../../lib/condiciones/formulas.mjs'

const mostrar = (valor) => valor == null ? 'Sin dato' : Number(valor).toLocaleString('es-PA')
const actual = (centro, codigo) => centro.abierta[codigo]
const fecha = (valor) => valor?.split('-').reverse().join('/') || '—'
const mostrarActual = (centro, codigo) => {
  const valor = actual(centro, codigo)
  if (valor != null) return mostrar(valor)
  if (!centro.calculoAbierto[codigo]) return 'Sin cálculo todavía'
  const error = codigo === 'ninos_activos' ? centro.serie.at(-1)?.detalle?.error : null
  return error === 'Falta el cierre del mes anterior.' ? error : 'Sin dato del cálculo'
}
const estado = { sin_condicion: 'Pendiente de asignar condición', incompleto: 'Plan incompleto', completo: 'Plan completo' }

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
    <div className="panel__head"><h2 className="panel__title">Semana operativa por centro</h2><span className="label">Niños activos · 12 semanas</span></div>
    <div className="semana-tablero__contenido">
      {error && <p role="alert" className="alert alert--error">{error} <button className="btn" type="button" onClick={() => setRecarga((n) => n + 1)}>Reintentar</button></p>}
      {!datos && !error && <p role="status">Cargando semana…</p>}
      {datos && <>
        <p className="h-sub">Cada centro usa su jueves de cierre local. La gráfica compara fechas de cierre iguales; solo dibuja el total cuando hay datos de todos los centros visibles. El período mensual o trimestral elegido aplica al panel inferior.</p>
        {datos.centros.some((centro) => centro.semanaAbierta !== datos.semanaAbierta) && <p role="status" className="h-sub">Por la diferencia horaria entre Caracas y Panamá, algunos centros ya están en la semana siguiente.</p>}
        {datos.consolidada.some((p) => p.incompleta) && <details open><summary>Consolidado con cobertura incompleta</summary><ul>
          {datos.consolidada.filter((p) => p.incompleta).map((p) => <li key={p.semanaFin}>Cierre {fecha(p.semanaFin)}: total sin dato · subtotal disponible {mostrar(p.subtotal)} · {p.disponibles}/{p.total} centros</li>)}
        </ul></details>}
        <GraficaSemanal puntos={datos.consolidada} titulo="Total de niños activos de todos los centros con cobertura completa" unidad="niños" />
        <TableScroller label="Estadísticas semanales por centro" stickyFirstColumn>
          <table className="table semana-tablero__tabla">
            <caption className="sr-only">Estadísticas semanales por centro</caption>
            <thead><tr>{['Centro', 'Niños activos', 'Δ semana', '12 semanas', 'Condición', 'Plan', 'Cuotas', 'Nuevos', 'Retiros', 'Facturas vencidas', 'Clases de prueba'].map((label) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>{datos.centros.map((centro) => <tr key={centro.id}>
              <th scope="row"><Link className="operations-link" href={`/centro/${centro.id}/semana`}>{centro.nombre}</Link><div className="h-sub">Abierta: {fecha(centro.semanaAbierta)} · {centro.zonaHoraria === 'America/Caracas' ? 'Caracas (VE)' : 'Panamá (PA)'}</div><div className="h-sub">Condición, plan y cuotas evaluadas: cierre {fecha(centro.ultimaCerrada)}</div></th>
              <td>{mostrarActual(centro, 'ninos_activos')}</td>
              <td>{centro.delta == null ? 'Sin dato' : `${centro.delta > 0 ? '+' : ''}${centro.delta}`}<div className="h-sub">{actual(centro, 'ninos_activos') == null ? 'entre semanas cerradas' : 'abierta vs. última cerrada'}</div></td>
              <td className="semana-tablero__mini"><GraficaSemanal puntos={centro.serie} titulo={`Niños activos de ${centro.nombre}`} compacta /></td>
              <td>{centro.condicion ? <span className="semana-condicion" style={{ '--condicion-color': colorCondicion(centro.condicion) }}>{nombreCondicion(centro.condicion)}</span> : 'Sin condición'}{centro.discrepancia && <span className="semana-discrepancia" role="img" aria-label="Discrepancia"> ⚠ Discrepancia</span>}</td>
              <td className={centro.plazoVencido && centro.estadoPlan !== 'completo' ? 'semana-plan--vencido' : ''}>{estado[centro.estadoPlan] || 'Pendiente'}</td>
              <td><Link className="operations-link" href="/dashboard/ranking">{centro.cuotasCumplidas == null ? 'Sin evaluar' : `${centro.cuotasCumplidas}%`}</Link></td>
              <td>{mostrarActual(centro, 'nuevos_inscritos')}</td>
              <td>{mostrarActual(centro, 'retiros')}</td>
              <td>{mostrarActual(centro, 'facturas_vencidas')}</td>
              <td>{mostrarActual(centro, 'cp_asistidas')}</td>
            </tr>)}
              {!datos.centros.length && <tr><td colSpan={11}>No hay centros en tu alcance.</td></tr>}
            </tbody>
          </table>
        </TableScroller>
      </>}
    </div>
  </section>
}
