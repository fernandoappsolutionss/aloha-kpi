'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import TableScroller from '../TableScroller'
import GraficaSemanal from './GraficaSemanal'
import { getTableroSemanal } from '../../app/actions/semana'
import CondicionSemanal from './CondicionSemanal'
import ArranqueSemanal from './ArranqueSemanal'
import GraficaResumenSemanal from './GraficaResumenSemanal'
import { comparacionCierres, coberturaResumen } from '../../lib/resumen-tablero-semanal.mjs'

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
const estado = { sin_condicion: 'Preparar condición y plan en la reunión', incompleto: 'Plan incompleto', completo: 'Plan preparado' }
const cambio = valor => `${valor > 0 ? '+' : ''}${Number(valor).toLocaleString('es-PA', { maximumFractionDigits: 1 })}`

function ReferenciaCierre({ centro }) {
  const comparacion = comparacionCierres(centro)
  return <div className="semana-tablero__referencia">
    <p>Cierre {fecha(centro.ultimaCerrada)}</p>
    {comparacion && <p><strong>{mostrar(comparacion.anterior)} → {mostrar(comparacion.actual)}</strong> · {cambio(comparacion.delta)}{comparacion.porcentaje != null && ` (${cambio(comparacion.porcentaje)}%)`}</p>}
    {centro.lectura?.motivo && <p>{centro.lectura.motivo}</p>}
  </div>
}

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
  const cobertura = datos ? coberturaResumen(datos) : []
  const cierreCobertura = cobertura.find(p => p.semanaFin === datos?.ultimaCerrada)
  const incompletas = cobertura.filter(p => p.incompleta)

  return <section className="panel semana-tablero">
    <div className="panel__head"><h2 className="panel__title">Semana operativa por centro</h2><span className="label">Niños activos · últimas 6 semanas</span></div>
    <div className="semana-tablero__contenido">
      {error && <p role="alert" className="alert alert--error">{error} <button className="btn" type="button" onClick={() => setRecarga((n) => n + 1)}>Reintentar</button></p>}
      {!datos && !error && <p role="status">Cargando semana…</p>}
      {datos && <>
        <ArranqueSemanal ultimaCerrada={datos.centros.map(c => c.ultimaCerrada).sort()[0]} />
        <p className="h-sub">Últimas 6 semanas, incluida la abierta. Cada centro usa su jueves de cierre local. La condición corresponde al último cierre; el dato abierto es provisional. El período mensual o trimestral elegido aplica al panel inferior.</p>
        <p className="h-sub">La escala usa el historial de 12 semanas y las cuotas de cada centro. Compara los valores; la inclinación depende de la escala. La administradora confirma la condición al preparar su plan. <Link className="operations-link" href="/dashboard/reunion-semanal">Preparar la reunión semanal</Link></p>
        <p className="semana-tablero__leyenda"><span className="hca-mejora">━ Azul: sube</span><span className="hca-empeora">━ Rojo: baja</span><span>━ Gris: sin cambio</span><span>┄ Abierta: provisional</span><span>┄ Ámbar: cuota</span></p>
        {datos.centros.some((centro) => centro.semanaAbierta !== datos.semanaAbierta) && <p role="status" className="h-sub">Por la diferencia horaria entre Caracas y Panamá, algunos centros ya están en la semana siguiente.</p>}
        {incompletas.length > 0 && <div className="semana-tablero__cobertura">
          <strong>{cierreCobertura?.incompleta ? 'Faltan datos para el total de centros' : 'Hay semanas sin datos de todos los centros'}</strong>
          {cierreCobertura?.incompleta && <p>Cierre {fecha(cierreCobertura.semanaFin)}: {cierreCobertura.disponibles} de {cierreCobertura.total} centros con datos{cierreCobertura.subtotal != null ? ` · subtotal: ${mostrar(cierreCobertura.subtotal)} niños` : ''}. Falta: {cierreCobertura.faltantes.join(', ')}.</p>}
          <p>El total suma los niños activos de todos los centros visibles en la misma fecha. Si falta un centro, se muestra solo el subtotal disponible y se deja un hueco en la gráfica del total.</p>
          <details><summary>Ver cobertura de las últimas 6 semanas</summary><ul>
            {cobertura.map(p => <li key={p.semanaFin}>{fecha(p.semanaFin)}{p.semanaFin > datos.ultimaCerrada ? ' (abierta)' : ''}: {p.incompleta ? 'subtotal' : 'total'} {mostrar(p.subtotal)} · {p.disponibles}/{p.total} centros{p.incompleta && ` · falta: ${p.faltantes.join(', ')}`}</li>)}
          </ul></details>
        </div>}
        {cobertura.some(p => p.valor != null) && <GraficaSemanal puntos={cobertura} titulo="Total de niños activos de todos los centros con cobertura completa" unidad="niños" />}
        <TableScroller label="Estadísticas semanales por centro" stickyFirstColumn>
          <table className="table semana-tablero__tabla">
            <caption className="sr-only">Estadísticas semanales por centro</caption>
            <thead><tr>{['Centro', 'Niños activos', 'Δ semana', 'Últimas 6 semanas', 'Condición · último cierre', 'Plan', 'Cuotas', 'Nuevos', 'Retiros', 'Facturas vencidas', 'Clases de prueba'].map((label) => <th key={label}>{label}</th>)}</tr></thead>
            <tbody>{datos.centros.map((centro) => <tr key={centro.id}>
              <th scope="row"><Link className="operations-link" href={`/centro/${centro.id}/semana`}>{centro.nombre}</Link><div className="h-sub">Abierta: {fecha(centro.semanaAbierta)} · {centro.zonaHoraria === 'America/Caracas' ? 'Caracas (VE)' : 'Panamá (PA)'}</div><div className="h-sub">Condición, plan y cuotas evaluadas: cierre {fecha(centro.ultimaCerrada)}</div></th>
              <td>{mostrarActual(centro, 'ninos_activos')}</td>
              <td>{centro.delta == null ? 'Sin dato' : `${centro.delta > 0 ? '+' : ''}${centro.delta}`}<div className="h-sub">{actual(centro, 'ninos_activos') == null ? 'entre semanas cerradas' : 'abierta vs. última cerrada'}</div></td>
              <td className="semana-tablero__tendencia"><GraficaResumenSemanal serie={centro.serie} ultimaCerrada={centro.ultimaCerrada} titulo={`Niños activos de ${centro.nombre}`} /></td>
              <td className="semana-tablero__condicion"><CondicionSemanal condicion={centro.condicion} lectura={centro.lectura} /><ReferenciaCierre centro={centro} />{centro.discrepancia && <span className="semana-discrepancia" role="img" aria-label="Discrepancia"> ⚠ Discrepancia</span>}</td>
              <td className={centro.plazoVencido && centro.estadoPlan !== 'completo' ? 'semana-plan--vencido' : ''}>{centro.preparacion && <p className="h-sub">Preparación</p>}{estado[centro.estadoPlan] || 'Pendiente'}</td>
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
