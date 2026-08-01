// Inventario de horarios ALOHA — cálculo puro, sin BD.
// Regla del negocio: el inventario ES el bloque de horario; determina cuánto
// puede crecer un centro. Los centros abren de 12:30 pm a 8:30 pm, entre
// clases debe haber ~30 minutos, y un grupo ocupa bloques de 1 h o 2 h.

export const APERTURA_MIN = 12 * 60 + 30 // 12:30 pm (lunes a viernes)
export const APERTURA_SABADO_MIN = 9 * 60 // los sábados el centro abre a las 9:00 am
export const CIERRE_MIN = 20 * 60 + 30   // 8:30 pm
// Apertura efectiva según el día (6 = sábado).
export const aperturaDe = (dia) => (dia === 6 ? APERTURA_SABADO_MIN : APERTURA_MIN)
export const BUFFER_MIN = 30             // espacio entre clases en el mismo salón
export const DURACIONES_MIN = [60, 120]  // bloques válidos por sesión
export const SLOT_MIN = 30               // resolución visual del calendario
export const DIAS_OPERATIVOS = [1, 2, 3, 4, 5, 6] // lunes a sábado

export const aMinutos = (hora) => {
  const [h, m] = String(hora || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
export const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// ¿Dos sesiones chocan en el mismo salón? (solape real o sin los 30 min de espacio)
export function chocanConBuffer(inicioA, finA, inicioB, finB) {
  return inicioA < finB + BUFFER_MIN && inicioB < finA + BUFFER_MIN
}

// Valida una sesión contra la ventana operativa y las duraciones permitidas.
// Devuelve un mensaje de error o null.
export function validarSesion(dia, horaInicio, horaFin) {
  const ini = aMinutos(horaInicio)
  const fin = aMinutos(horaFin)
  const apertura = aperturaDe(dia)
  if (!(fin > ini)) return 'La hora de fin debe ser mayor que la de inicio.'
  if (ini < apertura || fin > CIERRE_MIN) {
    return `El horario del ${dia === 6 ? 'sábado' : 'día'} debe estar dentro de la ventana operativa (${aHora(apertura)}–${aHora(CIERRE_MIN)}).`
  }
  if (!DURACIONES_MIN.includes(fin - ini)) {
    return 'Cada sesión debe durar 1 hora o 2 horas (bloques del inventario ALOHA).'
  }
  return null
}

// Sesiones ocupadas de un día/salón: [{ grupo, horario, inicio, fin }] ordenadas.
function sesionesDe(grupos, dia, salonId) {
  const out = []
  for (const g of grupos) {
    if (g.estado !== 'activo') continue
    for (const h of g.horarios || []) {
      if (h.dia !== dia) continue
      if (String(h.salon_id || '') !== String(salonId || '')) continue
      out.push({ grupo: g, horario: h, inicio: aMinutos(h.hora_inicio), fin: aMinutos(h.hora_fin) })
    }
  }
  return out.sort((a, b) => a.inicio - b.inicio)
}

// Huecos disponibles de un día/salón, ya descontando el buffer contra las
// clases vecinas (los bordes de apertura/cierre no llevan buffer).
// → [{ inicio, fin, minutos, cabe1h, cabe2h }]
export function huecosDe(grupos, dia, salonId) {
  const sesiones = sesionesDe(grupos, dia, salonId)
  const huecos = []
  let cursor = aperturaDe(dia)
  for (const s of sesiones) {
    const fin = Math.min(s.inicio - BUFFER_MIN, CIERRE_MIN)
    if (fin - cursor >= Math.min(...DURACIONES_MIN)) {
      huecos.push({ inicio: cursor, fin, minutos: fin - cursor, cabe1h: fin - cursor >= 60, cabe2h: fin - cursor >= 120 })
    }
    cursor = Math.max(cursor, s.fin + BUFFER_MIN)
  }
  if (CIERRE_MIN - cursor >= Math.min(...DURACIONES_MIN)) {
    huecos.push({ inicio: cursor, fin: CIERRE_MIN, minutos: CIERRE_MIN - cursor, cabe1h: true, cabe2h: CIERRE_MIN - cursor >= 120 })
  }
  return huecos
}

// Calendario de un día: por salón activo, sus sesiones y sus huecos.
export function calendarioDia(grupos, salones, dia) {
  return salones
    .filter((s) => s.activo)
    .map((s) => ({ salon: s, sesiones: sesionesDe(grupos, dia, s.id), huecos: huecosDe(grupos, dia, s.id) }))
}

// Grupos activos con sesiones ese día pero sin salón asignado (no entran al grid).
export function sinSalonDia(grupos, dia) {
  const out = []
  for (const g of grupos) {
    if (g.estado !== 'activo') continue
    for (const h of g.horarios || []) {
      if (h.dia === dia && !h.salon_id) out.push({ grupo: g, horario: h, inicio: aMinutos(h.hora_inicio), fin: aMinutos(h.hora_fin) })
    }
  }
  return out.sort((a, b) => a.inicio - b.inicio)
}

// Cuántos bloques de una duración caben en un hueco, respetando el buffer
// entre bloques consecutivos.
export function bloquesQueCaben(minutosHueco, duracionMin) {
  if (minutosHueco < duracionMin) return 0
  return 1 + Math.floor((minutosHueco - duracionMin) / (duracionMin + BUFFER_MIN))
}

// Métricas del inventario semanal (lunes–sábado, salones activos):
// capacidad, ocupación y cupos reales para abrir grupos nuevos.
export function inventarioSemanal(grupos, salones) {
  const activos = salones.filter((s) => s.activo)
  const capacidadMin = DIAS_OPERATIVOS.reduce((a, d) => a + (CIERRE_MIN - aperturaDe(d)), 0) * activos.length
  let ocupadoMin = 0
  let cupos2h = 0
  let cupos1h = 0
  let huecosUtiles = 0
  for (const dia of DIAS_OPERATIVOS) {
    for (const s of activos) {
      for (const ses of sesionesDe(grupos, dia, s.id)) ocupadoMin += ses.fin - ses.inicio
      for (const h of huecosDe(grupos, dia, s.id)) {
        cupos2h += bloquesQueCaben(h.minutos, 120)
        cupos1h += bloquesQueCaben(h.minutos, 60)
        huecosUtiles++
      }
    }
  }
  // Sesiones con horario pero sin salón también son inventario ocupado del centro.
  for (const dia of DIAS_OPERATIVOS) {
    for (const x of sinSalonDia(grupos, dia)) ocupadoMin += x.fin - x.inicio
  }
  const pct = capacidadMin ? Math.min(100, Math.round((ocupadoMin / capacidadMin) * 100)) : 0
  return {
    capacidadHoras: Math.round(capacidadMin / 60),
    ocupadoHoras: Math.round((ocupadoMin / 60) * 10) / 10,
    libreHoras: Math.max(0, Math.round(((capacidadMin - ocupadoMin) / 60) * 10) / 10),
    pctOcupacion: pct,
    cupos2h,
    cupos1h,
    huecosUtiles,
  }
}

// Coaches activos que NO dictan clase en el rango [inicio, fin) de ese día.
export function coachesLibresEn(grupos, coaches, dia, inicio, fin) {
  const ocupados = new Set()
  for (const g of grupos) {
    if (g.estado !== 'activo' || !g.coach_id) continue
    for (const h of g.horarios || []) {
      if (h.dia !== dia) continue
      const a = aMinutos(h.hora_inicio)
      const b = aMinutos(h.hora_fin)
      if (a < fin && inicio < b) ocupados.add(String(g.coach_id))
    }
  }
  return coaches.filter((c) => c.activo && !ocupados.has(String(c.id)))
}
