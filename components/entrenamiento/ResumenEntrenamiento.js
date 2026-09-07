export default function ResumenEntrenamiento({ datos, compacto = false }) {
  if (!datos?.plataforma && !datos?.oficio) return null
  const filas = [
    { nombre: 'Plataforma', dato: datos.plataforma, valor: datos.plataforma?.completados, unidad: 'recorridos completados' },
    { nombre: 'Aprende tu oficio', dato: datos.oficio, valor: datos.oficio?.estudiados, unidad: 'módulos estudiados' },
  ]
  return (
    <span className={`ent-progress${compacto ? ' ent-progress--compact' : ''}`}>
      {filas.filter((f) => f.dato).map(({ nombre, dato, valor, unidad }) => (
        <span className="ent-progress__row" key={nombre}
          aria-label={dato.error ? `${nombre}: no se pudo cargar el avance` : `${nombre}: ${valor} de ${dato.total} ${unidad}`}
          title={dato.error ? 'No se pudo cargar el avance. Recarga la página.' : `${valor} de ${dato.total} ${unidad}`}>
          <span>{nombre}</span>
          <strong>{dato.error ? 'Sin datos' : <>{valor}/{dato.total}</>}</strong>
          {!compacto && !dato.error && <span className="ent-progress__unit">{unidad}</span>}
        </span>
      ))}
    </span>
  )
}
