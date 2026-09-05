'use server'
// HIGIENE DE DATOS — la mitad que necesita base de datos.
//
// El motor de crecimiento ya cuenta CUÁNTOS alumnos no tienen fecha de inicio y
// CUÁNTOS cierres faltan, pero sólo devuelve el número. Una alerta que dice
// "faltan 4 fechas" y no dice cuáles no se puede terminar. Esto pone los
// nombres: qué grupos, qué niños, qué meses.
//
// Sólo lecturas. El veredicto —qué se muestra, en qué orden y cuánta confianza
// recupera cada punto— vive en lib/higiene-datos.mjs, puro y testeable sin base
// de datos. Aquí no se decide nada.
//
// POR QUÉ NO SE RECALCULA EL CRECIMIENTO AQUÍ: la pantalla del centro ya trae
// el payload de `getCentroGrowth` en memoria. Volver a llamar al motor para
// pintar una alerta duplicaría una decena de consultas por visita; el
// componente le pasa el payload que ya tiene a la función pura.
import { requireCentroAccess } from '../../lib/auth'
import { sql } from '../../lib/db'
import { iniciosClase, INICIOS_CLASE_DESDE_FECHA } from '../../lib/inicios-clase.mjs'

// Mismos estados que descarta lib/growth/source.mjs para la población
// elegible: un niño colgado de un grupo cerrado o fusionado no es una fecha que
// falte, es una ficha que hay que reasignar (y esa sí la reporta el motor con
// su propia issue).
const GRUPOS_BLOQUEADOS = new Set(['cerrado', 'fusionado'])

const iso10 = (valor) => {
  if (!valor) return null
  return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10)
}

const periodo = (fila) => `${Number(fila.year)}-${String(Number(fila.month)).padStart(2, '0')}`

export async function getHigienePendientes(centroId) {
  await requireCentroAccess(centroId)
  const id = Number(centroId)

  const [grupos, estudiantes, eventos, estadosMes] = await Promise.all([
    sql`
      SELECT id, numero, estado, fecha_inicio_clases, itinerario_clases
      FROM grupos WHERE centro_id = ${id}
    `,
    sql`
      SELECT id, nombre, grupo_id, estado, fecha_inscripcion, created_at
      FROM estudiantes
      WHERE centro_id = ${id} AND estado IN ('activo', 'baja_potencial')
    `,
    sql`
      SELECT id, estudiante_id, tipo, fecha, a_grupo_id
      FROM estudiante_eventos
      WHERE centro_id = ${id} AND tipo IN ('inscripcion', 'retiro', 'cambio_grupo', 'reincorporacion')
      ORDER BY fecha, id
    `,
    sql`SELECT year, month, estado FROM mes_kpi WHERE centro_id = ${id}`,
  ])

  // El inicio operativo se calcula con el MISMO helper que usa el motor
  // (lib/inicios-clase.mjs): quien no aparece en su salida es exactamente
  // quien el motor cuenta como "sin fecha". Reimplementar la regla aquí sería
  // la forma más rápida de que la alerta pida cargar algo que ya está cargado.
  const conInicio = new Set(iniciosClase(estudiantes, grupos, eventos).map((fila) => String(fila.estudianteId)))
  const gruposPorId = new Map(grupos.map((grupo) => [String(grupo.id), grupo]))

  const alumnosSinInicio = estudiantes
    .filter((alumno) => {
      if (conInicio.has(String(alumno.id))) return false
      const grupo = alumno.grupo_id == null ? null : gruposPorId.get(String(alumno.grupo_id))
      if (grupo && GRUPOS_BLOQUEADOS.has(grupo.estado)) return false
      // Mismo corte del motor: sólo las fichas creadas desde que existe el
      // registro de inicios de clase. Antes de esa fecha no había dónde
      // cargarlo y pedirlo sería reclamar por un dato que nunca se pidió.
      return (iso10(alumno.created_at) || '') >= INICIOS_CLASE_DESDE_FECHA
    })
    .map((alumno) => ({
      id: alumno.id,
      nombre: alumno.nombre,
      grupoNumero: alumno.grupo_id == null ? null : (gruposPorId.get(String(alumno.grupo_id))?.numero ?? null),
      alta: iso10(alumno.created_at),
    }))
    .sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es'))

  const gruposSinFecha = grupos
    .filter((grupo) => grupo.estado === 'activo' && !grupo.fecha_inicio_clases)
    .map((grupo) => ({ id: grupo.id, numero: grupo.numero }))
    .sort((a, b) => String(a.numero || '').localeCompare(String(b.numero || ''), 'es', { numeric: true }))

  const mesesAbiertos = estadosMes
    .filter((fila) => fila.estado !== 'cerrado')
    .map(periodo)
    .sort()

  return { centroId: id, gruposSinFecha, alumnosSinInicio, mesesAbiertos }
}
