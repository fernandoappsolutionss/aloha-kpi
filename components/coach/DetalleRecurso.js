'use client'
import { useState } from 'react'
import { DIAS } from '../../lib/operaciones'
import { aHora12 } from '../../lib/inventario'

export function duracion(minutos) {
  if (minutos == null) return 'Por verificar'
  const h = Math.floor(minutos / 60), m = minutos % 60
  return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ') || '0 h'
}
export const promedioTexto = valor => valor == null ? 'Sin grupos para el promedio' : valor.toLocaleString('es', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const ETIQUETAS = { grupo: 'Grupo', prueba: 'Clase de prueba', conflicto: 'Horarios superpuestos', transicion: 'Transición entre clases', libre: 'Libre de clases', sin_verificar: 'Por verificar' }

export default function DetalleRecurso({ recurso }) {
  const [dia, setDia] = useState(1)
  if (!recurso) return null
  const agenda = recurso.dias.find(d => d.dia === dia)
  const coach = recurso.tipo === 'coach'
  return <div className="recurso-detalle">
    <p className="recurso-detalle__contexto">Programación semanal actual · {recurso.nombre}</p>
    <dl className="recurso-detalle__cifras">
      {coach && <div><dt>Promedio niños / grupo</dt><dd>{promedioTexto(recurso.promedio)}</dd></div>}
      <div><dt>Grupos asignados</dt><dd>{recurso.grupos.length}</dd></div>
      <div><dt>Niños en esos grupos</dt><dd>{recurso.ninos}</dd></div>
      <div><dt>Tiempo ocupado / semana</dt><dd>{duracion(recurso.minutosOcupados)}</dd></div>
      <div><dt>{coach ? 'Tiempo sin asignación / semana' : 'Tiempo libre / semana'}</dt><dd>{duracion(recurso.minutosLibres)}</dd></div>
    </dl>
    {coach && <p className="recurso-detalle__nota">Promedio de grupos presenciales con niños, sin Kinder: {recurso.gruposPromedio} grupos. Con Kinder: {promedioTexto(recurso.promedioConKinder)}. Online se muestra en el detalle y ocupa horario, pero no entra en este promedio.</p>}
    <p className="recurso-detalle__nota">Grupos: {duracion(recurso.minutosGrupo)} · Prueba: {duracion(recurso.minutosPrueba)} · Transiciones: {duracion(recurso.minutosTransicion)}. Los solapes cuentan una sola vez en el tiempo ocupado.</p>
    {!recurso.activo && <p className="recurso-detalle__aviso">{coach ? 'Coach inactivo' : 'Salón inactivo'}: no se ofrece tiempo libre para nuevas clases.</p>}
    {recurso.avisos.length > 0 && <details className="recurso-detalle__aviso"><summary>Completar {recurso.avisos.length} {recurso.avisos.length === 1 ? 'dato para confirmar los espacios libres' : 'datos para confirmar los espacios libres'}</summary><ul>{recurso.avisos.map(texto => <li key={texto}>{texto}</li>)}</ul></details>}
    <details className="recurso-detalle__grupos">
      <summary>Detalle de grupos ({recurso.grupos.length})</summary>
      {recurso.grupos.length ? <ul>{recurso.grupos.map(g => <li key={g.id}>
        <strong>Grupo {g.numero} · {g.ninos} niños</strong><span>{g.itinerario}{g.es_online ? ' · Online' : ''}</span>
        {g.horarios.length ? g.horarios.map((h, i) => <span key={i}>{DIAS[Number(h.dia)] || 'Día sin registrar'} · {h.hora_inicio}–{h.hora_fin} · {h.salon}</span>) : <span>Sin horario registrado</span>}
      </li>)}</ul> : <p>No tiene grupos activos asignados.</p>}
    </details>
    <div className="recurso-detalle__dias" aria-label={`Día del horario de ${recurso.nombre}`}>
      {recurso.dias.map(d => <button type="button" className="btn" key={d.dia} aria-pressed={dia === d.dia} onClick={() => setDia(d.dia)}>{DIAS[d.dia]}</button>)}
    </div>
    <p className="recurso-detalle__nota">{DIAS[dia]} · {aHora12(agenda.inicio)}–{aHora12(agenda.fin)} · {duracion(agenda.minutosOcupados)} ocupadas · {agenda.minutosLibres == null ? 'Tiempo libre por verificar' : `${duracion(agenda.minutosLibres)} libres`}</p>
    <ol className="recurso-detalle__agenda">
      {agenda.segmentos.map(s => <li key={s.inicio} className={`recurso-detalle__franja recurso-detalle__franja--${s.tipo}`}>
        <span className="recurso-detalle__hora">{aHora12(s.inicio)}–{aHora12(s.fin)}<small>{duracion(s.minutos)}</small></span>
        <div><strong>{ETIQUETAS[s.tipo]}</strong>{s.etiquetas.map(texto => <span key={texto}>{texto}</span>)}
          {s.tipo === 'libre' && <span>Sin grupo ni clase de prueba.{s.minutos < 60 ? ' No cabe una sesión de 1 hora.' : ''}</span>}
        </div>
      </li>)}
    </ol>
    <p className="recurso-detalle__nota">Semana base del centro: lunes a viernes de 12:30 pm a 8:30 pm; sábado de 9:00 am a 8:30 pm. Se descuentan las reservas de prueba y 15 minutos de transición junto a las clases.{coach ? ' Tiempo sin asignación en este centro; confirma la jornada del coach y sus compromisos en otras sedes antes de asignar un grupo.' : ' Las franjas sin clases fuera de los horarios de demanda no garantizan que se pueda abrir un grupo.'}</p>
  </div>
}
