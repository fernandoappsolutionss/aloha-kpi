// Inventario de horarios ALOHA — cálculo puro, sin BD.
// Regla del negocio: el inventario ES el bloque de horario; determina cuánto
// puede crecer un centro. Los centros abren de 12:30 pm a 8:30 pm, entre
// clases debe haber ~30 minutos, y un grupo ocupa bloques de 1 h o 2 h.

export const APERTURA_MIN = 12 * 60 + 30 // 12:30 pm (lunes a viernes)
export const APERTURA_SABADO_MIN = 9 * 60 // los sábados el centro abre a las 9:00 am
export const CIERRE_MIN = 20 * 60 + 30   // 8:30 pm
// Apertura efectiva según el día (6 = sábado).
export const aperturaDe = (dia) => (dia === 6 ? APERTURA_SABADO_MIN : APERTURA_MIN)

// Ventana VENDIBLE (demanda real, regla de Fernando): entre semana los niños
// salen del colegio ~1 pm y los padres compran desde las 3:30 pm; el sábado
// las jornadas van de 9 am a 5 pm. Las horas operativas fuera de esta ventana
// son "horas muertas": existen, pero no cuentan como inventario para crecer.
export const INICIO_VENDIBLE_SEMANA = 15 * 60 + 30 // 3:30 pm
export const FIN_VENDIBLE_SABADO = 17 * 60         // 5:00 pm
export const ventanaVendible = (dia) =>
  (dia === 6 ? [APERTURA_SABADO_MIN, FIN_VENDIBLE_SABADO] : [INICIO_VENDIBLE_SEMANA, CIERRE_MIN])
export const BUFFER_MIN = 30             // espacio entre clases en el mismo salón
export const DURACIONES_MIN = [60, 120]  // bloques válidos por sesión
export const SLOT_MIN = 30               // resolución visual del calendario
export const DIAS_OPERATIVOS = [1, 2, 3, 4, 5, 6] // lunes a sábado

export const aMinutos = (hora) => {
  const [h, m] = String(hora || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
export const aHora = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`
// Formato para mostrar al usuario: "3:30 pm" (los padres no hablan en hora militar).
export const aHora12 = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'pm' : 'am'}`
}

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

// Métricas del inventario semanal (lunes–sábado, salones activos), calculadas
// sobre la ventana VENDIBLE — las horas muertas no cuentan como espacio para
// crecer. La capacidad operativa total queda solo como referencia.
export function inventarioSemanal(grupos, salones) {
  const activos = salones.filter((s) => s.activo)
  const capacidadTotalMin = DIAS_OPERATIVOS.reduce((a, d) => a + (CIERRE_MIN - aperturaDe(d)), 0) * activos.length
  const vendibleMin = DIAS_OPERATIVOS.reduce((a, d) => { const [i, f] = ventanaVendible(d); return a + (f - i) }, 0) * activos.length
  const solape = (ini, fin, dia) => {
    const [vi, vf] = ventanaVendible(dia)
    return Math.max(0, Math.min(fin, vf) - Math.max(ini, vi))
  }
  let ocupadoMin = 0
  let cupos2h = 0
  let cupos1h = 0
  let huecosUtiles = 0
  for (const dia of DIAS_OPERATIVOS) {
    for (const s of activos) {
      for (const ses of sesionesDe(grupos, dia, s.id)) ocupadoMin += solape(ses.inicio, ses.fin, dia)
      for (const h of huecosDe(grupos, dia, s.id)) {
        // Solo el tramo vendible del hueco cuenta para cupos de grupos nuevos.
        const util = solape(h.inicio, h.fin, dia)
        cupos2h += bloquesQueCaben(util, 120)
        cupos1h += bloquesQueCaben(util, 60)
        if (util >= 60) huecosUtiles++
      }
    }
  }
  // Sesiones con horario pero sin salón también son inventario ocupado del centro.
  for (const dia of DIAS_OPERATIVOS) {
    for (const x of sinSalonDia(grupos, dia)) ocupadoMin += solape(x.inicio, x.fin, dia)
  }
  const pct = vendibleMin ? Math.min(100, Math.round((ocupadoMin / vendibleMin) * 100)) : 0
  return {
    capacidadHoras: Math.round(vendibleMin / 60),
    capacidadTotalHoras: Math.round(capacidadTotalMin / 60),
    ocupadoHoras: Math.round((ocupadoMin / 60) * 10) / 10,
    libreHoras: Math.max(0, Math.round(((vendibleMin - ocupadoMin) / 60) * 10) / 10),
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
