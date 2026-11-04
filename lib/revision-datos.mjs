import { buildGrowthHistory, growthSalesByMonth } from './growth/source.mjs'
import { buildGrowthPayload } from './growth/engine.mjs'
import { buildGrowthRoster } from './growth/roster.mjs'
import { iniciosClase, retirosActivosMes } from './inicios-clase.mjs'
import { classifyTrialSales } from './trial-enrollments.mjs'

const iso = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10)
const periodOf = row => `${row.year}-${String(row.month).padStart(2, '0')}`
import { validPeriod, fichaHref, kpiHref } from './enlaces-datos.mjs'
export { validPeriod, fichaHref, kpiHref, revisionHref } from './enlaces-datos.mjs'

// Solo lectura. La lista usa exactamente las ventas y el balance del motor;
// una resta de totales nunca se convierte en nombres de supuestos culpables.
export function buildRevisionDatos(input, { problema, periodo } = {}) {
  const id = input.center.id
  const students = new Map(input.students.map(s => [String(s.id), s]))
  const groups = new Map(input.groups.map(g => [String(g.id), g]))
  const named = (studentId, extra = {}) => {
    const student = students.get(String(studentId))
    return { id: studentId, nombre: student?.nombre || `Ficha ${studentId}`, estado: student?.estado,
      grupo: groups.get(String(student?.grupo_id))?.numero || 'Sin grupo',
      href: student && student.estado !== 'matricula_anulada' ? fichaHref(id, studentId) : null, ...extra }
  }
  const history = buildGrowthHistory(input)
  const payload = buildGrowthPayload(input)
  const pendingPeriod = history.find(row => row.issues.some(issue => issue.code === 'cp_classification_incomplete'))
  const period = validPeriod(periodo) ? periodo : pendingPeriod && problema === 'cp_classification_incomplete' ? periodOf(pendingPeriod) : payload.operational.currentPeriod
  const common = { centroId: id, centroNombre: input.center.nombre, today: input.today, problema, periodo: period }
  if (problema === 'cp_classification_incomplete') {
    const month = history.find(row => periodOf(row) === period)
    const sales = growthSalesByMonth(input).get(period) || []
    const available = Boolean(month && input.weekly?.some(row => periodOf(row) === period))
    return { ...common, expected: available ? month.ventas : null, available,
      ...classifyTrialSales(sales), closed: Boolean(month?.closed),
      rows: sales.map(sale => {
        const classified = classifyTrialSales([sale])
        return named(sale.estudiante_id, { fecha: iso(sale.fecha),
          origen: classified.unknownSales ? 'Sin clasificar' : classified.directSales ? 'Directa' : 'Clase de prueba',
          anuladaDespues: input.events.some(e => e.tipo === 'anulacion_matricula' && String(e.estudiante_id) === String(sale.estudiante_id) && iso(e.fecha).slice(0, 7) > period),
        })
      }), kpiHref: kpiHref(id, period, 'ventas'),
    }
  }
  const currentPeriod = payload.operational.currentPeriod
  const [year, month] = currentPeriod.split('-').map(Number)
  const roster = buildGrowthRoster(input)
  const currentIndex = history.findIndex(row => periodOf(row) === currentPeriod)
  const prior = currentIndex > 0 ? history[currentIndex - 1] : history.filter(row => periodOf(row) < currentPeriod).at(-1)
  const previousDate = new Date(`${currentPeriod}-01T12:00:00Z`)
  previousDate.setUTCMonth(previousDate.getUTCMonth() - 1)
  const base = prior && periodOf(prior) === previousDate.toISOString().slice(0, 7) ? prior : null
  const current = history.find(row => periodOf(row) === currentPeriod)
  const starts = iniciosClase(input.students, input.groups, input.events).filter(row => row.fechaInicio?.startsWith(currentPeriod))
  const departures = retirosActivosMes(input.students, input.groups, input.events, year, month)
  const movements = [
    ...starts.map(s => named(s.estudianteId, { fecha: s.fechaInicio, tipo: 'Inicio de clases', href: fichaHref(id, s.estudianteId, 'plan') })),
    ...departures.map(e => named(e.estudiante_id, { fecha: iso(e.fecha), tipo: 'Retiro' })),
    ...input.events.filter(e => e.tipo === 'reincorporacion' && iso(e.fecha).startsWith(currentPeriod)).map(e => named(e.estudiante_id, { fecha: iso(e.fecha), tipo: 'Reincorporación' })),
  ].sort((a, b) => a.fecha.localeCompare(b.fecha))
  return { ...common, periodo: currentPeriod, population: payload.population, operational: payload.operational,
    base: current?.closed ? { periodo: currentPeriod, value: current.ninos_final_mes, href: kpiHref(id, currentPeriod), closedCurrent: true } : base ? { periodo: periodOf(base), value: base.ninos_final_mes, href: kpiHref(id, periodOf(base)) } : current ? { periodo: currentPeriod, value: current.ninos_inicio_mes, href: kpiHref(id, currentPeriod), initial: true } : null,
    currentInitial: current?.ninos_inicio_mes ?? null, kpiHref: kpiHref(id, currentPeriod), movements,
    blocked: roster.blockedStudents.map(s => named(s.id)),
    undated: roster.undatedStudents.map(s => named(s.id, { href: fichaHref(id, s.id, 'plan') })),
    roster: roster.eligible.map(s => named(s.id, { fecha: roster.presenceByStudent.get(String(s.id)) || null }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  }
}
