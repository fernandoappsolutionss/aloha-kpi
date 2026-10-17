export default function RevisionHistorica({ revision }) {
  if (revision?.version !== 1 || typeof revision.resumen !== 'string') return null
  const correcciones = Array.isArray(revision.correcciones) ? revision.correcciones.filter(x => typeof x === 'string') : []
  const pendientes = Array.isArray(revision.pendientes) ? revision.pendientes.filter(x => typeof x === 'string') : []
  return (
    <section className="alert" aria-label="Revisión del cierre histórico" style={{ display: 'block', marginBottom: 16, overflowWrap: 'anywhere' }}>
      <strong>Revisión del cierre histórico</strong>
      <p>{revision.resumen}</p>
      {correcciones.length > 0 && <ul>{correcciones.map((texto, i) => <li key={i}>{texto}</li>)}</ul>}
      {pendientes.length > 0 && <div>
        <strong>Pendiente de confirmar</strong>
        <ul>{pendientes.map((texto, i) => <li key={i}>{texto}</li>)}</ul>
      </div>}
    </section>
  )
}
