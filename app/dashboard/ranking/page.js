'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../../components/Sidebar'
import TableScroller from '../../../components/TableScroller'
import OperationalCard from '../../../components/OperationalCard'
import { getTableroSemanal } from '../../actions/semana'
import { ordenarRankingSemanal } from '../../../lib/cuotas-semana.mjs'

const ESTADOS = { cumplido: 'Cumple las cinco cuotas', incumplido: 'Cuotas por cumplir', sin_cuotas: 'Sin cuotas aprobadas', cuotas_incompletas: 'Faltan cuotas por aprobar', datos_pendientes: 'Faltan datos de cierre' }
const numero = (v) => v == null ? 'Sin dato' : Number(v).toLocaleString('es-PA')
const fecha = (v) => v.split('-').reverse().join('/')
const resultado = (d) => d.cuota == null ? 'Sin cuota aprobada' : d.valor == null ? 'Sin dato de cierre' : d.cumple ? 'Cumplida' : d.inversa ? `Exceso: ${numero(d.falta)}` : `Faltan: ${numero(d.falta)}`

function DetalleCuotas({ centro }) {
  return <details><summary>Ver las cinco cuotas</summary><ul>
    {centro.evaluacionCuotas.detalles.map((d) => <li key={d.codigo} style={{ marginTop: 8 }}>
      <strong>{d.nombre}</strong><br />Resultado: {numero(d.valor)} · {d.inversa ? 'Máximo' : 'Cuota'}: {numero(d.cuota)}<br />{resultado(d)}
    </li>)}
  </ul></details>
}

export default function RankingPage() {
  const [datos, setDatos] = useState(null)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)
  async function cargar() {
    setCargando(true); setError('')
    try { setDatos(await getTableroSemanal()) }
    catch { setError('No se pudo cargar el ranking semanal.') }
    finally { setCargando(false) }
  }
  useEffect(() => { cargar() }, [])
  const centros = ordenarRankingSemanal(datos?.centros || [])
  const podio = centros.filter((c) => c.medalla)

  return <div className="shell">
    <Sidebar rol="admin_general" />
    <main id="main-content" data-page-state={cargando ? 'loading' : error ? 'error' : 'ready'} className="main operations-page">
      <div className="main__head"><div><p className="label">Ranking · cuotas semanales</p><h1 className="h-title">Ranking de centros</h1>
        <p className="h-sub">Última semana cerrada de cada centro. El reconocimiento exige cumplir las cinco cuotas aprobadas.</p>
      </div><Link className="btn" href="/dashboard/reunion-semanal">Reunión semanal</Link></div>
      {error && <p role="alert" className="alert alert--error">{error} <button className="btn" onClick={cargar}>Reintentar</button></p>}
      {cargando ? <p role="status">Cargando ranking…</p> : !error && (!centros.length ? <div className="panel" style={{ padding: 24 }}><div>Aún no hay datos para clasificar</div></div> : <>
        <p className="h-sub">Orden por porcentaje de cuotas cumplidas; desempate por superación porcentual de la cuota de niños activos. Los empates comparten puesto. Las cuotas sin aprobar o sin datos no clasifican.</p>
        {podio.length ? <div className="responsive-grid operations-grid--three" aria-label="Podio de cumplimiento">
          {podio.map((c) => <section className="kpi" key={c.id} style={{ padding: 24, textAlign: 'center' }}>
            <span role="img" aria-label={`Puesto ${c.posicion}`} style={{ fontSize: 30 }}>{c.medalla}</span>
            <h2 className="panel__title">{c.nombre}</h2><p className="kpi__value" style={{ color: 'var(--ok)' }}>5 de 5</p>
            <p>Cuotas cumplidas · 100%</p><p className="h-sub">Cierre {fecha(c.ultimaCerrada)}</p>
            <Link className="btn" href={`/centro/${c.id}/semana`}>Abrir Semana</Link>
          </section>)}
        </div> : <p role="status" className="alert">Sin reconocimientos esta semana. Ningún centro ha cumplido las cinco cuotas aprobadas con datos de cierre completos.</p>}
        <section className="panel"><div className="panel__head"><h2 className="panel__title">Clasificación completa</h2></div>
          <div className="desktop-only operational-table"><TableScroller label="Clasificación completa">
            <table className="table operations-table--ranking"><caption className="sr-only">Clasificación por cuotas de la última semana cerrada</caption>
              <thead><tr>{['Puesto', 'Centro', 'Cierre', 'Estado', 'Cumplidas', 'Cumplimiento', 'Detalle'].map((t) => <th key={t}>{t}</th>)}</tr></thead>
              <tbody>{centros.map((c) => <tr key={c.id}>
                <td>{c.medalla || c.posicion || '—'}</td><th scope="row"><Link className="operations-link" href={`/centro/${c.id}/semana`}>{c.nombre}</Link></th>
                <td>{fecha(c.ultimaCerrada)}</td><td><span className={`pill ${c.evaluacionCuotas.estado === 'cumplido' ? 'pill--ok' : 'pill--warn'}`}>{ESTADOS[c.evaluacionCuotas.estado]}</span></td>
                <td>{c.evaluacionCuotas.cumplidas} de {c.evaluacionCuotas.total}</td><td>{c.evaluacionCuotas.porcentaje == null ? 'Sin clasificar' : `${c.evaluacionCuotas.porcentaje}%`}</td>
                <td><DetalleCuotas centro={c} /></td>
              </tr>)}</tbody>
            </table>
          </TableScroller></div>
          <div className="mobile-only operational-list">{centros.map((c) => <OperationalCard key={c.id} headingLevel={3} title={`${c.medalla || c.posicion || '—'} · ${c.nombre}`} subtitle={`Cierre ${fecha(c.ultimaCerrada)}`}
            fields={[
              { label: 'Estado', value: ESTADOS[c.evaluacionCuotas.estado] },
              { label: 'Cuotas cumplidas', value: `${c.evaluacionCuotas.cumplidas} de ${c.evaluacionCuotas.total}` },
              { label: 'Cumplimiento', value: c.evaluacionCuotas.porcentaje == null ? 'Sin clasificar' : `${c.evaluacionCuotas.porcentaje}%` },
              { label: 'Cuotas y resultados', value: <DetalleCuotas centro={c} /> },
              { label: 'Centro', value: <Link className="operations-link" href={`/centro/${c.id}/semana`}>Abrir Semana</Link> },
            ]} />)}</div>
        </section>
      </>)}
    </main>
  </div>
}
