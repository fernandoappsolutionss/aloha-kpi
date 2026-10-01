import GraficaSemanal from './GraficaSemanal'

const mostrar = (valor) => valor == null ? 'Sin dato' : Number(valor).toLocaleString('es-PA')

export default function TarjetaEstadistica({ meta, serie = [], resumen = {}, principal = false }) {
  const delta = resumen.delta
  const mejora = delta == null || delta === 0 ? null : meta.inversa ? delta < 0 : delta > 0
  const error = serie.at(-1)?.detalle?.error
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
      {error && <p role="status" className="alert alert--error">Sin dato: {error}</p>}
      <GraficaSemanal puntos={serie} inversa={meta.inversa} unidad={meta.unidad} titulo={meta.nombre} />
      <p className="h-sub semana-tarjeta__fuente">Fuente: {meta.fuente}</p>
    </section>
  )
}
