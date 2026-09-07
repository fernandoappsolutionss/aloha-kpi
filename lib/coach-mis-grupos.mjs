// LO QUE VE EL COACH CUANDO ENTRA CON SU CUENTA.
// Su trabajo del día (marcar asistencia) ya vive en /coach/<token>, la lista sin
// sesión. Esto NO la duplica: arma el resumen de sus grupos —niños, itinerario y
// qué clases le faltan por marcar— y deja el link de esa lista a un clic.
// El puente entre la cuenta y el horario es coaches.usuario_id, no el nombre.
// Puro a propósito: la consulta vive en la acción, aquí solo se ordena el dato.

const ISO = /^\d{4}-\d{2}-\d{2}$/

// Las fechas del itinerario versionado del grupo, en orden y sin repetir.
export function clasesDelItinerario(itinerario) {
  const semanas = Array.isArray(itinerario?.semanas) ? itinerario.semanas : []
  const vistas = new Set()
  const clases = []
  for (const semana of semanas) {
    for (const fecha of (Array.isArray(semana?.fechas) ? semana.fechas : [])) {
      const iso = String(fecha || '').slice(0, 10)
      if (!ISO.test(iso) || vistas.has(iso)) continue
      vistas.add(iso)
      clases.push({ fecha: iso, corto: semana?.corto || '', etiqueta: semana?.etiqueta || 'Clase' })
    }
  }
  return clases.sort((a, b) => a.fecha.localeCompare(b.fecha))
}

// Una clase está COMPLETA cuando todos los niños del grupo tienen marca ese día.
// Sin niños no hay nada que marcar, así que nunca queda pendiente.
function estadoClase({ marcadas, total, fecha, hoy }) {
  if (fecha > hoy) return 'proxima'
  if (total === 0) return 'sin_ninos'
  return marcadas >= total ? 'completa' : 'pendiente'
}

export function presentarGrupoCoach(grupo, hoy) {
  const estudiantes = (grupo?.estudiantes || []).map((e) => ({
    id: e.id,
    nombre: e.nombre,
    itinerario: e.itinerario || '',
    nivel: e.nivel || '',
    estado: e.estado || 'activo',
    nota_coach: e.nota_coach || null,
  }))
  const total = estudiantes.length
  const porFecha = new Map()
  for (const a of (grupo?.asistencias || [])) {
    const iso = String(a?.fecha || '').slice(0, 10)
    if (!ISO.test(iso) || !a?.estado) continue
    porFecha.set(iso, (porFecha.get(iso) || 0) + 1)
  }
  const clases = clasesDelItinerario(grupo?.itinerarioClases).map((c) => {
    const marcadas = Math.min(porFecha.get(c.fecha) || 0, total)
    return { ...c, marcadas, total, estado: estadoClase({ marcadas, total, fecha: c.fecha, hoy }) }
  })
  const pendientes = clases.filter((c) => c.estado === 'pendiente')
  return {
    id: grupo.id,
    numero: grupo.numero,
    itinerario: grupo.itinerario,
    centro: grupo.centro || '',
    horarioTexto: grupo.horarioTexto || '',
    linkAsistencia: grupo.token ? `/coach/${grupo.token}` : null,
    estudiantes,
    clases,
    // Lo que el coach necesita ver de un vistazo: qué le falta y qué sigue.
    clasesPendientes: pendientes.length,
    proximaPendiente: pendientes[0]?.fecha || null,
    proximaClase: clases.find((c) => c.fecha >= hoy)?.fecha || null,
    dictadas: clases.filter((c) => c.fecha <= hoy).length,
    totalClases: clases.length,
  }
}

export function presentarMisGrupos({ grupos = [], hoy }) {
  const fecha = ISO.test(String(hoy || '')) ? String(hoy) : '9999-12-31'
  return grupos.map((grupo) => presentarGrupoCoach(grupo, fecha))
}
