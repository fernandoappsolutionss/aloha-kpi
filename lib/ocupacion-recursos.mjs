// Programación semanal del centro: grupos y reservas de prueba comparten el
// mismo inventario. Un hueco aquí no certifica la jornada laboral del coach.
import { aperturaDe, CIERRE_MIN, DIAS_OPERATIVOS, BUFFER_MIN } from './inventario.js'
import { ROL_LABEL, ROL_PIDE_COACH } from './reservas.js'

const id = value => String(value ?? '')
const time = value => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(value))) return null
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}
const active = value => value !== false
const validHorario = h => {
  const dia = Number(h.dia), inicio = time(h.hora_inicio), fin = time(h.hora_fin)
  return DIAS_OPERATIVOS.includes(dia) && inicio != null && fin > inicio && inicio >= aperturaDe(dia) && fin <= CIERRE_MIN
}
const sum = (items, field) => items.reduce((total, item) => total + item[field], 0)

function resumirGrupo(g) {
  const students = (g.estudiantes || []).filter(e => !e.estado || ['activo', 'baja_potencial'].includes(e.estado))
  const ninos = g.ninos == null ? students.length : Number(g.ninos)
  const ninosNoKinder = g.ninos_no_kinder == null
    ? (g.ninos == null ? students.filter(e => e.itinerario !== 'KINDER').length : g.itinerario === 'KINDER' ? 0 : ninos)
    : Number(g.ninos_no_kinder)
  return { id: g.id, numero: g.numero, itinerario: g.itinerario, es_online: Boolean(g.es_online), coachId: g.coach_id,
    ninos, ninosNoKinder, esKinder: ninos ? ninosNoKinder === 0 : g.itinerario === 'KINDER', horarios: g.horarios || [] }
}

function diaProgramado(sesiones, dia, completo) {
  const inicio = aperturaDe(dia), fin = CIERRE_MIN
  const ss = sesiones.filter(s => s.dia === dia)
  const puntos = [...new Set([inicio, fin, ...ss.flatMap(s => [s.inicio, s.fin, Math.max(inicio, s.inicio - BUFFER_MIN), Math.min(fin, s.fin + BUFFER_MIN)])])].sort((a, b) => a - b)
  const segmentos = []
  for (let i = 0; i < puntos.length - 1; i++) {
    const a = puntos[i], b = puntos[i + 1]
    const ocupan = ss.filter(s => s.inicio < b && a < s.fin)
    const cerca = ss.some(s => s.inicio - BUFFER_MIN < b && a < s.fin + BUFFER_MIN)
    const tipo = ocupan.length > 1 ? 'conflicto' : ocupan[0]?.tipo || (cerca ? 'transicion' : completo ? 'libre' : 'sin_verificar')
    const etiquetas = ocupan.map(s => s.etiqueta).sort()
    const anterior = segmentos.at(-1)
    if (anterior && anterior.tipo === tipo && anterior.etiquetas.join('|') === etiquetas.join('|')) {
      anterior.fin = b
      anterior.minutos += b - a
    } else segmentos.push({ inicio: a, fin: b, minutos: b - a, tipo, etiquetas })
  }
  // Medir la unión de intervalos: dos roles de prueba en un salón, o un
  // solape erróneo, no crean horas adicionales en el reloj.
  const minutosOcupados = segmentos.filter(s => ['grupo', 'prueba', 'conflicto'].includes(s.tipo)).reduce((n, s) => n + s.minutos, 0)
  const minutosTipo = tipo => puntos.slice(0, -1).reduce((n, a, i) => n + (ss.some(s => s.tipo === tipo && s.inicio < puntos[i + 1] && a < s.fin) ? puntos[i + 1] - a : 0), 0)
  return { dia, inicio, fin, segmentos, minutosOcupados, minutosGrupo: minutosTipo('grupo'), minutosPrueba: minutosTipo('prueba'),
    minutosTransicion: sum(segmentos.filter(s => s.tipo === 'transicion'), 'minutos'),
    minutosLibres: completo ? sum(segmentos.filter(s => s.tipo === 'libre'), 'minutos') : null }
}

export function ocupacionRecursos({ grupos = [], coaches = [], salones = [], reservas = [] } = {}) {
  const coachMap = new Map(coaches.map(c => [id(c.id), c]))
  const salonMap = new Map(salones.map(s => [id(s.id), s]))
  const gs = grupos.filter(g => g.estado === 'activo').map(resumirGrupo)
  const sesiones = []
  const avisosCoach = new Map(), avisosSalon = new Map()
  const avisar = (map, keys, texto) => keys.forEach(key => map.set(id(key), [...(map.get(id(key)) || []), texto]))
  for (const g of gs) {
    const destinoCoach = coachMap.has(id(g.coachId)) ? [g.coachId] : [...coachMap.keys()]
    if (!coachMap.has(id(g.coachId))) avisar(avisosCoach, destinoCoach, `Grupo ${g.numero}: sin coach asignado.`)
    if (!g.horarios.length) {
      avisar(avisosCoach, destinoCoach, `Grupo ${g.numero}: sin horario registrado.`)
      if (!g.es_online) avisar(avisosSalon, [...salonMap.keys()], `Grupo ${g.numero}: sin horario ni salón confirmado.`)
    }
    for (const h of g.horarios) {
      const salon = salonMap.get(id(h.salon_id))
      if (!salon && !g.es_online) avisar(avisosSalon, [...salonMap.keys()], `Grupo ${g.numero}: falta asignar un salón a su horario.`)
      if (!validHorario(h)) {
        avisar(avisosCoach, destinoCoach, `Grupo ${g.numero}: horario incompleto o fuera de la semana operativa.`)
        if (!g.es_online || salon) avisar(avisosSalon, salon ? [salon.id] : [...salonMap.keys()], `Grupo ${g.numero}: horario incompleto o fuera de la semana operativa.`)
        continue
      }
      const coach = coachMap.get(id(g.coachId))
      sesiones.push({ key: `g:${g.id}:${h.dia}:${h.hora_inicio}:${h.hora_fin}:${h.salon_id}`, grupoId: g.id, coachId: g.coachId, salonId: h.salon_id,
        dia: Number(h.dia), inicio: time(h.hora_inicio), fin: time(h.hora_fin), tipo: 'grupo',
        etiqueta: `Grupo ${g.numero} · ${g.ninos} niños · ${coach?.nombre || 'Sin coach'} · ${salon?.nombre || (g.es_online ? 'Online' : 'Sin salón')}` })
    }
  }
  for (const r of reservas.filter(r => active(r.activo))) {
    if (!r.salones?.length) {
      avisar(avisosSalon, [...salonMap.keys()], 'Clase de prueba: sin salón asignado.')
      avisar(avisosCoach, [...coachMap.keys()], 'Clase de prueba: sin coaches asignados.')
    }
    for (const s of r.salones || []) {
      const salon = salonMap.get(id(s.salon_id)), coach = coachMap.get(id(s.coach_id))
      const destinoCoach = coach ? [coach.id] : ROL_PIDE_COACH[s.rol] ? [...coachMap.keys()] : []
      if (!salon) avisar(avisosSalon, [...salonMap.keys()], 'Clase de prueba: falta asignar un salón válido.')
      if (!coach && destinoCoach.length) avisar(avisosCoach, destinoCoach, `Clase de prueba ${ROL_LABEL[s.rol] || s.rol}: sin coach asignado.`)
      if (!validHorario(r)) {
        avisar(avisosSalon, salon ? [salon.id] : [...salonMap.keys()], 'Clase de prueba: horario incompleto o fuera de la semana operativa.')
        avisar(avisosCoach, destinoCoach, 'Clase de prueba: horario incompleto o fuera de la semana operativa.')
        continue
      }
      sesiones.push({ key: `r:${r.id}:${s.salon_id}`, coachId: s.coach_id, salonId: s.salon_id,
        dia: Number(r.dia), inicio: time(r.hora_inicio), fin: time(r.hora_fin), tipo: 'prueba',
        etiqueta: `Clase de prueba · ${ROL_LABEL[s.rol] || s.rol} · ${coach?.nombre || 'Administración / sin coach'} · ${salon?.nombre || 'Sin salón'}` })
    }
  }
  function recurso(item, tipo) {
    const avisos = [...new Set((tipo === 'coach' ? avisosCoach : avisosSalon).get(id(item.id)) || [])]
    const completo = active(item.activo) && !avisos.length
    const ss = sesiones.filter(s => id(tipo === 'coach' ? s.coachId : s.salonId) === id(item.id))
    const merged = new Map()
    for (const s of ss) {
      const prev = merged.get(s.key)
      merged.set(s.key, prev ? { ...prev, etiqueta: `${prev.etiqueta} / ${s.etiqueta}` } : s)
    }
    const dias = DIAS_OPERATIVOS.map(d => diaProgramado([...merged.values()], d, completo))
    const propios = gs.filter(g => tipo === 'coach' ? id(g.coachId) === id(item.id) : g.horarios.some(h => id(h.salon_id) === id(item.id)))
    const presenciales = propios.filter(g => !g.es_online && g.ninos > 0)
    const promedioGrupos = presenciales.filter(g => !g.esKinder)
    return { id: item.id, nombre: item.nombre, tipo, activo: active(item.activo), completo, avisos, dias,
      grupos: propios.map(g => ({ id: g.id, numero: g.numero, ninos: g.ninos, itinerario: g.itinerario, es_online: g.es_online,
        horarios: g.horarios.map(h => ({ ...h, salon: salonMap.get(id(h.salon_id))?.nombre || (g.es_online ? 'Online' : 'Sin salón') })) })),
      ninos: sum(propios, 'ninos'), gruposPromedio: promedioGrupos.length,
      promedio: promedioGrupos.length ? sum(promedioGrupos, 'ninosNoKinder') / promedioGrupos.length : null,
      promedioConKinder: presenciales.length ? sum(presenciales, 'ninos') / presenciales.length : null,
      minutosOcupados: sum(dias, 'minutosOcupados'), minutosGrupo: sum(dias, 'minutosGrupo'), minutosPrueba: sum(dias, 'minutosPrueba'),
      minutosTransicion: sum(dias, 'minutosTransicion'), minutosLibres: completo ? sum(dias, 'minutosLibres') : null }
  }
  return { coaches: coaches.map(c => recurso(c, 'coach')), salones: salones.map(s => recurso(s, 'salon')) }
}
