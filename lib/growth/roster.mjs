import { iniciosClase, INICIOS_CLASE_DESDE_FECHA } from '../inicios-clase.mjs'

const iso = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10)
const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`))
  && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
const blocked = new Set(['cerrado', 'fusionado'])

// La presencia en el padrón no equivale a un primer inicio. Una reincorporación
// fechada acredita presencia sin volver a sumar una venta o un niño nuevo.
// El inicio del nivel vigente no sustituye la inscripción original.
export function buildGrowthRoster({ students = [], groups = [], events = [], starts = iniciosClase(students, groups, events) }) {
  const groupById = new Map(groups.map(group => [String(group.id), group]))
  const presenceByStudent = new Map(starts.map(start => [String(start.estudianteId), start.fechaInicio]))
  for (const event of events) {
    const date = iso(event.fecha), id = String(event.estudiante_id)
    if (event.tipo !== 'reincorporacion' || !validDate(date)) continue
    if (!presenceByStudent.has(id) || date > presenceByStudent.get(id)) presenceByStudent.set(id, date)
  }
  const active = students.filter(student => ['activo', 'baja_potencial'].includes(student.estado))
  const groupOf = student => groupById.get(String(student.grupo_id))
  const blockedStudents = active.filter(student => blocked.has(groupOf(student)?.estado))
  const pendingStudents = active.filter(student => !blocked.has(groupOf(student)?.estado) && groupOf(student)?.inicio_pendiente === true)
  const eligible = active.filter(student => !blocked.has(groupOf(student)?.estado) && groupOf(student)?.inicio_pendiente !== true)
  const undatedStudents = eligible.filter(student => !presenceByStudent.has(String(student.id)) && iso(student.created_at) >= INICIOS_CLASE_DESDE_FECHA)
  return { eligible, undatedStudents, pendingStudents, blockedStudents, presenceByStudent }
}
