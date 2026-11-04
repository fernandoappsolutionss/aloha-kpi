import Link from 'next/link'
import { mesLargo } from '../../lib/higiene-datos.mjs'
import TableScroller from '../TableScroller'

function Fichas({ rows, movimientos = false }) {
  if (!rows.length) return <p>No hay registros en esta lista.</p>
  return <TableScroller label={movimientos ? 'Movimientos del mes' : 'Fichas del periodo'}><table className="table">
    <thead><tr><th>Niño · abrir registro</th><th>Grupo</th><th>Fecha</th><th>{movimientos ? 'Movimiento' : 'Detalle'}</th></tr></thead>
    <tbody>{rows.map((row, i) => <tr key={`${row.id}-${i}`}>
      <th scope="row">{row.href ? <Link href={row.href} aria-label={`Abrir ${row.href.includes('accion=plan') ? 'itinerario' : 'ficha'} de ${row.nombre}`}>{row.nombre} →</Link> : row.nombre}</th><td>{row.grupo}</td><td>{row.fecha || 'Sin fecha'}</td>
      <td>{row.tipo || row.origen || row.estado}{row.anuladaDespues && <p>Matrícula anulada después de este cierre; se conserva en el histórico.</p>}{!row.href && <p>{row.estado === 'matricula_anulada' ? 'Matrícula anulada · solo consulta' : 'Ficha no disponible en este centro'}</p>}</td>
    </tr>)}</tbody>
  </table></TableScroller>
}

export default function RevisionDatos({ data }) {
  const sales = data.problema === 'cp_classification_incomplete'
  const p = data.population
  return <div className="revision-datos">
    <div className="main__head"><div><div className="label">{data.centroNombre} · revisión al {data.today}</div>
      <h1 className="h-title">{sales ? 'Inscripciones y ventas de ' + mesLargo(data.periodo) : 'Conciliar el saldo y las fichas'}</h1>
      <p className="h-sub">Abre el registro señalado, comprueba su dato y guarda la corrección en su pantalla. Al volver, esta revisión consulta los datos actualizados.</p>
    </div></div>
    {sales ? <>
      <section className="card revision-datos__section" aria-labelledby="revision-ventas">
        <h2 id="revision-ventas">Qué no coincide</h2>
        {!data.available ? <p role="status">Faltan el resumen o los datos semanales de este mes para comparar ambas cantidades. Revisa el periodo antes de corregir.</p> : <>
          <dl className="revision-datos__totales"><div><dt>Ventas en el KPI</dt><dd>{data.expected}</dd></div><div><dt>Inscripciones identificadas</dt><dd>{data.totalSales}</dd></div><div><dt>Sin clasificar</dt><dd>{data.unknownSales}</dd></div></dl>
          <p>{data.unknownSales > 0 ? 'Las filas «Sin clasificar» necesitan comprobar su origen: clase de prueba o directa. El canal de marketing es un dato distinto.' : data.expected !== data.totalSales ? 'Todas las inscripciones identificadas tienen clasificación. La diferencia está entre su cantidad y las ventas declaradas en el KPI.' : 'Las cantidades y la clasificación ya coinciden. Vuelve al resumen para actualizar la alerta.'}</p>
        </>}
        <Link className="btn" href={data.kpiHref}>Revisar ventas de {mesLargo(data.periodo)} →</Link>
        {data.closed && <p>Este mes está cerrado. Su pantalla conserva el cierre y los permisos para reabrirlo; revisa la evidencia antes de cambiarlo.</p>}
      </section>
      <section className="card revision-datos__section"><h2>Inscripciones contadas en ese mes ({data.rows.length})</h2><Fichas rows={data.rows} /></section>
    </> : <>
      <section className="card revision-datos__section"><h2>Son dos fuentes para el mismo corte</h2>
        <TableScroller label="Comparación de saldos"><table className="table"><thead><tr><th>Corte</th><th>Saldo según KPI y movimientos</th><th>Fichas elegibles del padrón</th><th>Diferencia</th></tr></thead><tbody>
          <tr><th>Hoy · {data.today}</th><td>{p.todayChildren ?? 'Sin fecha suficiente'}</td><td>{p.operationalTodayChildren}</td><td>{p.todayChildren == null ? 'Por conciliar' : p.todayChildren - p.operationalTodayChildren}</td></tr>
          <tr><th>Cierre previsto · {mesLargo(data.periodo)}</th><td>{p.expectedMonthEndChildren}</td><td>{p.operationalMonthEndChildren}</td><td>{p.difference}</td></tr>
        </tbody></table></TableScroller>
        <p>El saldo parte del cierre anterior y suma entradas y salidas. El padrón cuenta fichas con estado, grupo y fecha elegibles. La resta indica cuánto difieren; por sí sola no identifica qué niños o qué cierre causan la diferencia.</p>
        <p>Inicios pendientes este mes: <strong>{data.operational.remainingMonthStarts}</strong>. Son movimientos futuros; no demuestran la causa de la diferencia.</p>
        {data.base && <p>{data.base.closedCurrent ? 'Saldo del mes ya cerrado' : data.base.initial ? 'Inicio declarado del mes' : 'Base del saldo'}: {mesLargo(data.base.periodo)}, <strong>{data.base.value}</strong> niños. <Link href={data.base.href}>Revisar ese cierre →</Link></p>}
        <Link className="btn" href={data.kpiHref}>Revisar el saldo de {mesLargo(data.periodo)} →</Link>
      </section>
      {data.blocked.length > 0 && <section className="card revision-datos__section"><h2>Fichas en grupos cerrados o fusionados</h2><Fichas rows={data.blocked} /></section>}
      {data.undated.length > 0 && <section className="card revision-datos__section"><h2>Fichas sin fecha de inicio</h2><Fichas rows={data.undated} /></section>}
      <section className="card revision-datos__section"><h2>Entradas y salidas de {mesLargo(data.periodo)}</h2><Fichas rows={data.movements} movimientos /></section>
      <details className="card revision-datos__section"><summary>Revisar fichas activas y sus fechas de presencia ({data.roster.length})</summary><p>Incluye fichas con inicio futuro. Una ficha en esta lista no implica un error.</p><Fichas rows={data.roster} /></details>
    </>}
  </div>
}
