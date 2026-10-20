'use client'
import { useState } from 'react'
import Link from 'next/link'
import TableScroller from '../TableScroller'
import { avanceCuota, filasAvanceDiario, mostrarNumero as numero } from '../../lib/avance-semana.mjs'
import { diaDeSemana } from '../../lib/semana-cierre.mjs'

export default function AvanceDiario({ datos, centroId }) {
  const [codigo, setCodigo] = useState('nuevos_inscritos')
  const meta = datos.catalogo.find(m => m.codigo === codigo)
  const cuota = datos.cuotas[codigo]?.cuota ?? datos.cuotas[codigo]?.propuesta
  const dias = filasAvanceDiario({ semanaFin: datos.semanaAbierta, hoy: datos.fechaDatos, meta, cuota, diario: datos.avanceDiario })
  const flujo = meta.tipo === 'flujo'
  return <section className="semana-avance" aria-labelledby="avance-title">
    <div className="semana-intro"><div><p className="label">01 · Mira cómo vas</p><h2 id="avance-title">Tu avance, día a día</h2><p>Los resultados llegan del centro, Clases de Prueba y Zoho. Tú revisas el ritmo y decides qué hacer hoy.</p></div><Link className="btn" href={`/centro/${centroId}/semana/acciones`}>Ir a mis acciones →</Link></div>
    <div className="semana-marcadores">{datos.catalogo.map(m => {
      const c = datos.cuotas[m.codigo] || {}
      const objetivo = c.cuota ?? c.propuesta
      const valor = datos.resumen[m.codigo]?.abierta
      const avance = avanceCuota({ meta: m, cuota: objetivo, valor, dia: diaDeSemana(datos.fechaDatos) })
      return <button type="button" key={m.codigo} className={`semana-marcador${codigo === m.codigo ? ' semana-marcador--activo' : ''}`} aria-pressed={codigo === m.codigo} onClick={() => setCodigo(m.codigo)}>
        <span>{m.nombre}</span><strong>{numero(valor)}</strong><span>{m.inversa ? 'Máximo' : 'Cuota'}: {numero(objetivo)} · {c.estado === 'aprobada' ? 'Aprobada' : 'Propuesta'}</span>
        <span>{avance.estado}</span><small>{m.inversa ? 'Menos es mejor · límite semanal' : m.tipo === 'nivel' ? 'Valor al corte · no se suma cada día' : `A hoy: ${numero(avance.esperado)} esperados`}</small>
      </button>
    })}</div>
    <div className="panel semana-diaria">
      <div className="panel__head"><h3 className="panel__title">{meta.nombre} · semana completa</h3></div>
      <p className="h-sub">{flujo && !meta.inversa ? 'La cuota diaria orientativa reparte la cuota semanal entre siete días. El acumulado permite compensar un día con otro.' : meta.inversa ? 'Este es un máximo que no queremos superar. No es una cantidad que debas producir cada día.' : 'Se compara el valor al corte con la meta de cierre. Dividir los niños activos entre siete daría una meta falsa.'}</p>
      <TableScroller label={`Avance diario de ${meta.nombre}`}><table className="table semana-diaria__tabla"><thead><tr><th>Día</th>{flujo && <th>Resultado del día</th>}{flujo && !meta.inversa && <th>Cuota diaria orientativa</th>}<th>{flujo ? 'Acumulado real' : 'Valor al corte'}</th><th>{meta.inversa ? 'Máximo semanal' : flujo ? 'Esperado acumulado' : 'Meta de cierre'}</th><th>Lectura</th></tr></thead>
        <tbody>{dias.map(d => <tr key={d.fecha} className={d.fecha === datos.fechaDatos ? 'semana-diaria--hoy' : ''}><th scope="row">{new Date(`${d.fecha}T12:00:00Z`).toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}{d.fecha === datos.fechaDatos && <small> · HOY, en curso</small>}</th>{flujo && <td>{d.futuro ? '—' : numero(d.realizadoDia)}</td>}{flujo && !meta.inversa && <td>{numero(d.cuotaDia)}</td>}<td>{d.futuro ? '—' : numero(d.valor)}</td><td>{numero(d.esperado)}</td><td>{d.estado}</td></tr>)}</tbody></table></TableScroller>
      <p className="h-sub">Fuente: {meta.fuente}. Los días anteriores se reconstruyen con los registros disponibles hoy; pueden cambiar si se corrige un registro. Un día futuro no cuenta como cero. En cobranza se conserva el último conteo disponible hasta cada fecha.</p>
    </div>
  </section>
}
