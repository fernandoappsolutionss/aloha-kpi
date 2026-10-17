const numero = valor => Number(valor).toLocaleString('es-PA')

export default function ResumenClasesPrueba({ datos }) {
  if (datos?.invitados == null || datos?.asistentes == null) return <div className="semana-tablero__cp">
    <span>Sin dato</span><div className="h-sub">No se pudo consultar el CRM.</div>
  </div>
  return <div className="semana-tablero__cp">
    <dl className="semana-tablero__cp-cifras">
      <div><dt>Invitados</dt><dd>{numero(datos.invitados)}</dd></div>
      <div><dt>Asistieron</dt><dd>{numero(datos.asistentes)}</dd></div>
    </dl>
    <div className="semana-tablero__cp-tasa">{datos.porcentaje == null ? 'Sin base para porcentaje' : `${datos.porcentaje.toLocaleString('es-PA', { maximumFractionDigits: 1 })}% de asistencia`}</div>
    <div className="h-sub">{datos.clases === 0 ? 'Sin clases iniciadas esta semana' : 'Clases iniciadas esta semana'}</div>
  </div>
}
