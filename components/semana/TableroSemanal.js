'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import TableScroller from '../TableScroller'
import GraficaSemanal from './GraficaSemanal'
import { getTableroSemanal } from '../../app/actions/semana'
import CondicionSemanal from './CondicionSemanal'
import ArranqueSemanal from './ArranqueSemanal'
import GraficaResumenSemanal from './GraficaResumenSemanal'
import ResumenClasesPrueba from './ResumenClasesPrueba'
import TotalesClasesPrueba from './TotalesClasesPrueba'
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
  const actualCobertura = cobertura.find(p => p.semanaFin === datos?.semanaAbierta)
  const cierreCobertura = cobertura.find(p => p.semanaFin === datos?.ultimaCerrada)

  return <section className="panel semana-tablero">
    <div className="panel__head"><h2 className="panel__title">Semana operativa por centro</h2><span className="label">Niños activos · últimas 6 semanas</span></div>
    <div className="semana-tablero__contenido">
      {error && <p role="alert" className="alert alert--error">{error} <button className="btn" type="button" onClick={() => setRecarga((n) => n + 1)}>Reintentar</button></p>}
      {!datos && !error && <p role="status">Cargando semana…</p>}
      {datos && <>
        {datos.centros.length > 0 && <div className="semana-tablero__totales" role="region" aria-label="Resumen de niños activos">
          <div className="semana-tablero__total">
            <h3 className="label">Niños activos · semana en curso</h3>
            <div className="semana-tablero__total-valor">{mostrar(actualCobertura?.subtotal)}</div>
            <p className="h-sub">Suma de {actualCobertura?.disponibles ?? 0}/{datos.centros.length} centros con datos</p>
            <p className="h-sub">Semana que cierra el {fecha(datos.semanaAbierta)} · provisional</p>
          </div>
          <div className="semana-tablero__total">
            <h3 className="label">Niños activos · último cierre</h3>
            <div className="semana-tablero__total-valor">{mostrar(cierreCobertura?.subtotal)}</div>
            <p className="h-sub">Suma de {cierreCobertura?.disponibles ?? 0}/{datos.centros.length} centros con datos</p>
            <p className="h-sub">Cierre {fecha(datos.ultimaCerrada)}</p>
          </div>
        </div>}
        {datos.centros.length > 0 && <TotalesClasesPrueba centros={datos.centros} />}
        <ArranqueSemanal ultimaCerrada={datos.centros.map(c => c.ultimaCerrada).sort()[0]} />
        <p className="h-sub">Últimas 6 semanas, incluida la abierta. Cada centro usa su jueves de cierre local. La condición corresponde al último cierre; el dato abierto es provisional. El período mensual o trimestral elegido aplica al panel inferior.</p>
        <p className="h-sub">La escala usa el historial de 12 semanas y las cuotas de cada centro. Compara los valores; la inclinación depende de la escala. La administradora confirma la condición al preparar su plan. <Link className="operations-link" href="/dashboard/reunion-semanal">Preparar la reunión semanal</Link></p>
        <p className="semana-tablero__leyenda"><span className="hca-mejora">━ Azul: sube</span><span className="hca-empeora">━ Rojo: baja</span><span>━ Gris: sin cambio</span><span>┄ Abierta: provisional</span><span>┄ Ámbar: cuota</span></p>
        {datos.centros.some((centro) => centro.semanaAbierta !== datos.semanaAbierta) && <p role="status" className="h-sub">Por la diferencia horaria entre Caracas y Panamá, algunos centros ya están en la semana siguiente.</p>}
        {datos.centros.length > 0 && cobertura.length > 0 && <details className="semana-tablero__cobertura">
          <summary>Ver cobertura de las últimas 6 semanas</summary>
          <p>Las cifras suman los centros con datos en cada fecha. Los centros sin datos no se cuentan como cero ni impiden ver la suma disponible. La gráfica conjunta solo une fechas con datos de todos los centros.</p>
          <ul>{cobertura.map(p => <li key={p.semanaFin}>{fecha(p.semanaFin)}{p.semanaFin > datos.ultimaCerrada ? ' (abierta)' : ''}: {p.incompleta ? 'suma disponible' : 'total'} {mostrar(p.subtotal)} · {p.disponibles}/{p.total} centros{p.incompleta && ` · sin datos: ${p.faltantes.join(', ')}`}</li>)}</ul>
        </details>}
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
              <td>{mostrarActual(centro, 'facturas_vencidas')}
                {centro.cobranza?.detalle?.fecha && <div className="h-sub">Último conteo: {fecha(centro.cobranza.detalle.fecha)}</div>}
                {centro.cobranza?.detalle?.anterior && <div className="h-sub">Dato anterior · pendiente de actualización</div>}
              </td>
              <td><ResumenClasesPrueba datos={centro.clasesPrueba} centroId={centro.id} centroNombre={centro.nombre} /></td>
            </tr>)}
              {!datos.centros.length && <tr><td colSpan={11}>No hay centros en tu alcance.</td></tr>}
            </tbody>
          </table>
        </TableScroller>
        {datos.centros.length > 0 && <p className="h-sub">Facturas vencidas: solo mensualidades con saldo vencido. La fecha corresponde al último conteo disponible; la carga automática corre de lunes a viernes a las 7 p. m. de Panamá.</p>}
        {datos.centros.length > 0 && <p className="h-sub">Clases de prueba: agendados incluye los registros de todas las próximas clases. Invitados y asistentes comparan las mismas clases ya iniciadas; asistencia = asistentes ÷ invitados. Matriculados cuenta asistentes con negocio ganado en el CRM; conversión = matriculados ÷ asistentes. Las 6 semanas incluyen la actual, que es parcial. El mes en curso llega hasta hoy y es independiente del período del panel inferior. Borradores y clases canceladas quedan fuera. Un guion indica que faltan datos o no hay invitados/asistentes para calcular la tasa.</p>}
      </>}
    </div>
  </section>
}
