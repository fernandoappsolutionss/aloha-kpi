const numero = valor => Number(valor).toLocaleString('es-PA', { maximumFractionDigits: 1 })
const fecha = valor => valor ? `${valor.slice(8, 10)}/${valor.slice(5, 7)}` : '—'

function Periodo({ titulo, datos }) {
  return <div className="semana-tablero__cp-periodo">
    <dt>{titulo}<span>{fecha(datos.desde)}–{fecha(datos.hasta)}</span></dt>
    <dd aria-label="Invitados">{numero(datos.invitados)}</dd>
    <dd aria-label="Asistieron">{numero(datos.asistentes)}</dd>
    <dd aria-label="Porcentaje de asistencia">{datos.porcentaje == null ? '—' : `${numero(datos.porcentaje)}%`}</dd>
  </div>
}

export default function ResumenClasesPrueba({ datos, centroId, centroNombre }) {
  if (!datos?.actual || datos.error) return <div className="semana-tablero__cp">
    <span>Sin dato</span><div className="h-sub">No se pudo consultar el CRM.</div>
  </div>
  return <div className="semana-tablero__cp">
    <div className="semana-tablero__cp-centro">{centroNombre}</div>
    <div className="semana-tablero__cp-agenda">
      <strong>{numero(datos.proximas.invitados)}</strong><span>Agendados · próximas clases</span>
    </div>
    <div className="h-sub">{numero(datos.proximas.estaSemana)} en la semana actual · {numero(datos.proximas.esteMes)} este mes</div>
    {datos.proximas.fechas.length > 0 && <details className="semana-tablero__cp-detalle">
      <summary>Ver fechas agendadas</summary>
      <ul>{datos.proximas.fechas.map(f => <li key={f.fecha}>{fecha(f.fecha)}/{f.fecha.slice(0, 4)}: {numero(f.invitados)} agendados</li>)}</ul>
    </details>}
    <div className="semana-tablero__cp-encabezado"><span>Clases ya iniciadas</span><span>Invitados</span><span>Asistieron</span><span>%</span></div>
    <dl className="semana-tablero__cp-periodos">
      <Periodo titulo="Actual · parcial" datos={datos.actual} />
      <Periodo titulo="Último cierre" datos={datos.ultimoCierre} />
      <Periodo titulo="Últimas 6 semanas" datos={datos.seisSemanas} />
      <Periodo titulo="Mes en curso" datos={datos.mes} />
    </dl>
    <details className="semana-tablero__cp-detalle">
      <summary>Comparar las 6 semanas</summary>
      <dl className="semana-tablero__cp-periodos">
        {datos.semanas.map(s => <Periodo key={s.hasta} titulo={s.abierta ? 'Actual · parcial' : 'Cerrada'} datos={s} />)}
      </dl>
    </details>
    <a className="operations-link" href={`/centro/${centroId}/eventos`}>Ver clases de prueba</a>
  </div>
}
