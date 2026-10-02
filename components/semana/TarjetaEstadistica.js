import GraficaSemanal from './GraficaSemanal'

const mostrar = (valor) => valor == null ? 'Sin dato' : Number(valor).toLocaleString('es-PA')

export default function TarjetaEstadistica({ meta, serie = [], resumen = {}, cuota = {}, principal = false }) {
  const delta = resumen.delta
  const mejora = delta == null || delta === 0 ? null : meta.inversa ? delta < 0 : delta > 0
  const error = serie.at(-1)?.detalle?.error
  const objetivo = cuota.cuota ?? cuota.propuesta
  return (
    <section className={`card semana-tarjeta${principal ? ' semana-tarjeta--principal' : ''}`}>
      <div className="semana-tarjeta__head">
        <h2 className="panel__title">{meta.nombre}</h2>
        {meta.inversa && <span className="label">Menos es mejor</span>}
      </div>
      <div className="semana-tarjeta__valores">
        <div><span className="label">En curso</span><strong>{mostrar(resumen.abierta)}</strong></div>
        <div><span className="label">Última cerrada</span><strong>{mostrar(resumen.cerrada)}</strong></div>
        <div><span className="label">Cambio anterior</span><strong style={{ color: mejora == null ? 'var(--text-dim)' : mejora ? 'var(--ok)' : 'var(--bad)' }}>{delta == null ? 'Sin dato' : `${delta > 0 ? '↑ +' : delta < 0 ? '↓ ' : '→ '}${delta}`}</strong></div>
      </div>
      <p className="semana-tarjeta__cuota"><strong>Cuota de esta semana: {mostrar(objetivo)}</strong>{cuota.estado && <span className="label"> · {cuota.estado === 'aprobada' ? 'Aprobada' : 'Propuesta'}</span>}</p>
      {meta.tipo === 'flujo' && cuota.ritmo && <div className="semana-ritmo" role="status">
        <p>Van {mostrar(resumen.abierta)} de {mostrar(objetivo)}; a hoy deberían ir {mostrar(cuota.ritmo.esperado)}.</p>
        <progress value={Math.min(Number(resumen.abierta), Number(objetivo))} max={Math.max(Number(objetivo), 1)} aria-label={`Ritmo de ${meta.nombre}`} />
        <span className={cuota.ritmo.vaBien ? 'semana-ritmo--bien' : 'semana-ritmo--atras'}>{cuota.ritmo.vaBien ? 'Al ritmo' : 'Por debajo del ritmo'}</span>
      </div>}
      {error && <p role="status" className="alert alert--error">Sin dato: {error}</p>}
      <GraficaSemanal puntos={serie} inversa={meta.inversa} unidad={meta.unidad} titulo={meta.nombre} />
      <p className="h-sub semana-tarjeta__fuente">Fuente: {meta.fuente}</p>
    </section>
  )
}
