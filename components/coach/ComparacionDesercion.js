'use client'
import { CANDADOS, es1 } from '../../lib/desercion-coach.mjs'
import { diferenciaPuntos } from '../../lib/desercion-referencias.mjs'

const porcentaje = tasa => tasa == null ? 'Sin base' : `${es1(tasa * 100)}%`
function Brecha({ coach, referencia, titulo }) {
  const valor = diferenciaPuntos(coach, referencia)
  const redondeado = valor == null ? null : Math.round(valor * 10) / 10
  return <div><dt>{titulo}</dt><dd>{redondeado == null ? 'Sin base para comparar' : `${redondeado > 0 ? '+' : ''}${es1(redondeado)} puntos porcentuales`}</dd></div>
}

export default function ComparacionDesercion({ coach, centro, global, periodo }) {
  if (!coach || !centro) return <p role="status">No hay una base de deserción para este coach en el periodo.</p>
  const propia = { tasa: coach.expuestos > 0 ? coach.bajasReales / coach.expuestos : null, bajasReales: coach.bajasReales, expuestos: coach.expuestos }
  const referencias = [{ titulo: 'Coach en este centro', base: propia }, { titulo: 'Su centro', base: centro }, { titulo: `Global · ${global?.centros.length || 0} centros`, base: global }]
  return <section className="desercion-comparada" aria-label={`Deserción de ${coach.nombre}`}>
    <h4>Deserción · {periodo}</h4>
    <div className="desercion-comparada__tasas">{referencias.map(({titulo,base}) => <div key={titulo}>
      <span>{titulo}</span><strong>{porcentaje(base?.tasa)}</strong>
      <small>{base ? `${base.bajasReales} bajas / ${base.expuestos} niños de base` : 'Referencia no disponible'}</small>
    </div>)}</div>
    <dl className="desercion-comparada__brechas"><Brecha coach={coach} referencia={centro} titulo="Diferencia frente al centro" /><Brecha coach={coach} referencia={global} titulo="Diferencia frente a la global" /></dl>
    <p>Menor tasa significa menos deserción. Una diferencia positiva indica más deserción que la referencia; una negativa, menos.</p>
    {coach.expuestos < CANDADOS.expuestosMin && <p className="desercion-comparada__muestra">{coach.expuestos ? `Muestra corta: ${coach.expuestos} niños. Con menos de ${CANDADOS.expuestosMin} no se evalúa al coach.` : 'Sin niños de base: no se evalúa al coach.'}</p>}
    <details><summary>Ver base y centros de la comparación</summary>
      <p>Bajas registradas del periodo, excluyendo graduados, divididas entre niños activos hoy más retiros y graduados del mismo periodo. Los graduados cuentan en la base, pero no como deserción.</p>
      <p>La referencia global suma las bajas y la base de los centros; no promedia sus porcentajes. Centros: {global?.centros.map(c => c.nombre).join(', ') || 'Sin referencia configurada'}.</p>
      {global && global.centrosConBase < global.centros.length && <p>Solo {global.centrosConBase} de {global.centros.length} centros tienen niños de base. Los demás no se interpretan como 0%.</p>}
      <p>Se usa el coach actualmente asignado al grupo. Para trimestres anteriores, la base actual no reconstruye la población histórica exacta. Los registros pendientes de conciliación también pueden cambiar estas tasas.</p>
      <p>La tasa mide retención registrada; el desempeño del coach también requiere revisar los motivos de salida. Las alertas mantienen la comparación con su propio centro.</p>
    </details>
  </section>
}
