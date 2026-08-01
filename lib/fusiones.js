// Scoring de fusiones de grupos, portado del FUSIONEITOR 3000. Cálculo puro,
// sin BD: recibe grupos ya consultados con esta forma:
//   { id, numero, itinerario, es_online, estado,
//     coach: { id, nombre, nivel_kids, kinder1, kinder23 } | null,
//     horarios: [{ dia, hora_inicio, hora_fin, salon_id }],
//     estudiantes: [{ id, nombre, itinerario, nivel, fecha_cierre_nivel, estado }] }
// (estudiantes = SOLO activos + baja_potencial). Reglas: manual de operaciones ALOHA.
import { TINYMAP } from './operaciones'

// Bandas de nivel del manual: base 1–2, inicial 3–4, pro 5+.
export const bandOf = (nv) => (nv <= 2 ? 'base' : nv <= 4 ? 'ini' : 'pro')

// Manual: solo se fusionan niños de nivel 3+ (Kinder nunca entra en fusiones).
export const isFusKid = (e) => e.itinerario !== 'KINDER' && e.nivel >= 3

// ¿El coach puede dictar este itinerario/nivel? Sin coach o sin certificación
// registrada (nivel_kids 0) no se bloquea: se marca unknown.
// KINDER usa los flags kinder1 / kinder23; KIDS su nivel máximo; TINY el tope
// derivado del nivel KIDS (TINYMAP, regla del manual).
export function coachCanTeach(coach, itinerario, nivel) {
  if (!coach) return { ok: true, unknown: true }
  if (itinerario === 'KINDER') return { ok: nivel === 1 ? !!coach.kinder1 : !!coach.kinder23 }
  const nk = coach.nivel_kids || 0
  if (!nk) return { ok: true, unknown: true }
  if (itinerario === 'KIDS') return { ok: nivel <= nk }
  return { ok: nivel <= (TINYMAP[nk] || 0) }
}

// Grupo Kinder: todos sus niños son KINDER (o el itinerario del grupo si está vacío).
export function isKinderGroup(g) {
  if (!g.estudiantes.length) return g.itinerario === 'KINDER'
  return g.estudiantes.every((e) => e.itinerario === 'KINDER')
}

// Grupo "base": tiene niños y todos son nivel 1–2 (no Kinder).
export function isAllLow(g) {
  return g.estudiantes.length > 0 && g.estudiantes.every((e) => e.itinerario !== 'KINDER' && e.nivel <= 2)
}

// Exentos de alerta de fusión (manual/FUSIONEITOR): Online, Kinder y base 1–2.
export function isExempt(g) {
  return !!g.es_online || isKinderGroup(g) || isAllLow(g)
}

// Grupo activo, no exento, con niños pero por debajo de la meta (MIN = gpn_min).
export function underMeta(g, MIN) {
  const n = g.estudiantes.length
  return g.estado === 'activo' && !isExempt(g) && n > 0 && n < MIN
}

// Estado legible del grupo para pills de la UI.
export function groupStatus(g, MIN) {
  if (g.estado === 'fusionado') return { key: 'fusionado', label: 'Fusionado' }
  if (g.estado === 'cerrado') return { key: 'cerrado', label: 'Cerrado' }
  if (g.es_online) return { key: 'online', label: 'Online' }
  if (isKinderGroup(g)) return { key: 'kinder', label: 'Kinder' }
  if (isAllLow(g)) return { key: 'base', label: 'Base 1–2' }
  if (g.estudiantes.length >= MIN) return { key: 'estable', label: 'Estable' }
  return { key: 'bajo', label: 'Bajo meta' }
}

const minutos = (hora) => {
  const [h, m] = String(hora || '').split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

// Compatibilidad de horarios (manual): mismo día y misma hora +50 · mismo día
// ±1h +42 · mismos días pero otra jornada +28 · solo comparten algún día +34 ·
// días distintos 0. Se compara por conjunto de días y hora_inicio en minutos.
export function schedScore(horariosA, horariosB) {
  const da = [...new Set((horariosA || []).map((h) => h.dia))].sort()
  const db = [...new Set((horariosB || []).map((h) => h.dia))].sort()
  if (!da.length || !db.length) return { s: 0, t: 'Sin horario registrado' }
  if (!da.some((d) => db.includes(d))) return { s: 0, t: 'Días distintos' }
  const mismosDias = da.length === db.length && da.every((d, i) => d === db[i])
  if (!mismosDias) return { s: 34, t: 'Solo comparten día' }
  let delta = Infinity
  for (const a of horariosA) for (const b of horariosB) delta = Math.min(delta, Math.abs(minutos(a.hora_inicio) - minutos(b.hora_inicio)))
  if (delta === 0) return { s: 50, t: 'Mismo día y misma hora' }
  if (delta <= 60) return { s: 42, t: 'Mismo día, 1 hora de diferencia' }
  return { s: 28, t: 'Mismo día, otra jornada' }
}

// Cierres de nivel cercanos (manual): misma semana (±7 días) +18, mismo mes +12.
// null si algún lado no tiene fechas de cierre o no hay coincidencia.
export function cierreScore(moveKids, tgtKids, cierreA = null, cierreB = null) {
  const fechas = (arr, extra) => {
    const out = (arr || []).map((e) => e.fecha_cierre_nivel && new Date(e.fecha_cierre_nivel)).filter((d) => d && !isNaN(d))
    // Sin fechas por niño, cae al cierre estimado del itinerario del grupo.
    if (!out.length && extra) {
      const d = new Date(extra)
      if (!isNaN(d)) out.push(d)
    }
    return out
  }
  const fa = fechas(moveKids, cierreA)
  const fb = fechas(tgtKids, cierreB)
  if (!fa.length || !fb.length) return null
  let dias = Infinity
  for (const a of fa) for (const b of fb) dias = Math.min(dias, Math.abs(a - b) / 86400000)
  if (dias <= 7) return { s: 18, t: 'Cierres de nivel la misma semana' }
  const mismoMes = fa.some((a) => fb.some((b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()))
  if (mismoMes) return { s: 12, t: 'Cierres de nivel el mismo mes' }
  return null
}

// Banda de nivel dominante entre los niños no-Kinder (para el +10 del scoring).
const bandaDominante = (kids) => {
  const cuenta = {}
  for (const e of kids || []) {
    if (e.itinerario === 'KINDER') continue
    const b = bandOf(e.nivel)
    cuenta[b] = (cuenta[b] || 0) + 1
  }
  let mejor = null
  for (const b of Object.keys(cuenta)) if (!mejor || cuenta[b] > cuenta[mejor]) mejor = b
  return mejor
}

// Evalúa mover moveKids del grupo origen al destino. Devuelve
// { score, blocked, newN, reasons: [{ t, k: 'ok'|'mb'|'no' }] }.
// Bloqueos (manual): destino base 1–2 recibiendo niveles 3+ · coach destino no
// certificado para algún niño movido · excede el cupo máximo (MAX).
export function analyze(moveKids, srcGrupo, tgtGrupo, { MIN, MAX }) {
  const reasons = []
  let score = 0
  let blocked = false
  const newN = tgtGrupo.estudiantes.length + moveKids.length

  // Cruce Tiny↔Kids al criterio LITERAL del manual (decisión de Fernando,
  // 2026-08-01): solo los niños KIDS nivel 3+ pueden unirse a cualquier grupo
  // ("los KIDS Niveles 3 en adelante se pueden unir con cualquier otro grupo
  // tanto de Tiny como de KIDS"). Niños TINY no entran a un grupo Kids, y
  // KIDS menor a nivel 3 no cruza. El cruce permitido queda con la advertencia
  // fuerte de grupo mixto del propio manual.
  if (tgtGrupo.itinerario === 'KIDS' && moveKids.some((e) => e.itinerario === 'TINY')) {
    blocked = true
    reasons.push({ t: 'Niños Tiny no entran a un grupo Kids (manual: solo KIDS nivel 3+ cruza de itinerario)', k: 'no' })
  }
  if (tgtGrupo.itinerario === 'TINY') {
    const kidsCruzan = moveKids.filter((e) => e.itinerario === 'KIDS')
    if (kidsCruzan.some((e) => Number(e.nivel) < 3)) {
      blocked = true
      reasons.push({ t: 'KIDS menor a nivel 3 no se une a un grupo Tiny (manual)', k: 'no' })
    } else if (kidsCruzan.length) {
      reasons.push({ t: '⚠ Grupo MIXTO Tiny+Kids: requiere coach con manejo comprobado de ambos itinerarios (manual)', k: 'mb' })
    }
  }

  if (isAllLow(tgtGrupo) && moveKids.some((e) => isFusKid(e))) {
    blocked = true
    reasons.push({ t: 'El destino es base 1–2 y recibiría niveles 3+', k: 'no' })
  }
  const sinCert = moveKids.filter((e) => !coachCanTeach(tgtGrupo.coach, e.itinerario, e.nivel).ok)
  if (sinCert.length) {
    blocked = true
    reasons.push({ t: `Coach destino no certificado para ${sinCert.length} niño(s)`, k: 'no' })
  }
  if (newN > MAX) {
    blocked = true
    reasons.push({ t: `Excede el cupo máximo (${newN}/${MAX})`, k: 'no' })
  } else {
    score += 20
    reasons.push({ t: `Cabe en el cupo (${newN}/${MAX})`, k: 'ok' })
  }

  const sched = schedScore(srcGrupo.horarios, tgtGrupo.horarios)
  score += sched.s
  reasons.push({ t: sched.t, k: sched.s > 0 ? 'ok' : 'no' })

  if (newN >= MIN) {
    score += 15
    reasons.push({ t: `Queda en meta (${newN} ≥ ${MIN})`, k: 'ok' })
  }
  if (srcGrupo.coach && tgtGrupo.coach && String(srcGrupo.coach.id) === String(tgtGrupo.coach.id)) {
    score += 15
    reasons.push({ t: 'Mismo coach', k: 'ok' })
  }
  if (srcGrupo.itinerario === tgtGrupo.itinerario) {
    score += 10
    reasons.push({ t: 'Mismo itinerario', k: 'ok' })
  }
  const banda = bandaDominante(moveKids)
  if (banda && banda === bandaDominante(tgtGrupo.estudiantes)) {
    score += 10
    reasons.push({ t: 'Misma banda de nivel dominante', k: 'ok' })
  }
  const cierre = cierreScore(moveKids, tgtGrupo.estudiantes,
    srcGrupo.itinerario_clases?.fecha_cierre_estimada, tgtGrupo.itinerario_clases?.fecha_cierre_estimada)
  if (cierre) {
    score += cierre.s
    reasons.push({ t: cierre.t, k: 'ok' })
  }
  // Aviso sin puntos (manual): las uniones Tiny con Tiny se recomiendan desde nivel 4.
  if (srcGrupo.itinerario === 'TINY' && tgtGrupo.itinerario === 'TINY' && moveKids.some((e) => e.nivel === 3)) {
    reasons.push({ t: 'El manual recomienda uniones Tiny-Tiny desde nivel 4', k: 'mb' })
  }
  return { score, blocked, newN, reasons }
}

// Banda del score: bloqueado no es viable; ≥85 Alta, ≥55 Media, <55 Baja.
export function scoreBand(score, blocked) {
  if (blocked) return 'Bloqueado'
  if (score >= 85) return 'Alta'
  if (score >= 55) return 'Media'
  return 'Baja'
}

// Candidatos de fusión para un grupo: activos, no online, no Kinder, con niños.
// Si el origen mueve niños de nivel 3+ se excluyen los destinos base 1–2.
// Devuelve [{ grupo, analisis }] ordenado por no-bloqueado y score descendente.
export function sugerenciasPara(grupoOrigen, todosGrupos, opts) {
  const moveKids = grupoOrigen.estudiantes
  const hayAltos = moveKids.some((e) => isFusKid(e))
  const out = []
  for (const g of todosGrupos) {
    if (String(g.id) === String(grupoOrigen.id)) continue
    if (g.estado !== 'activo' || g.es_online || isKinderGroup(g) || !g.estudiantes.length) continue
    if (hayAltos && isAllLow(g)) continue
    out.push({ grupo: g, analisis: analyze(moveKids, grupoOrigen, g, opts) })
  }
  out.sort((a, b) => (a.analisis.blocked === b.analisis.blocked ? b.analisis.score - a.analisis.score : a.analisis.blocked ? 1 : -1))
  return out
}

// Plan greedy de fusiones del mes: recorre los grupos bajo meta de menor a
// mayor tamaño y les asigna su mejor sugerencia aún no usada. Máximo 6 pares.
export function proximasFusiones(grupos, opts) {
  const pendientes = grupos.filter((g) => underMeta(g, opts.MIN)).sort((a, b) => a.estudiantes.length - b.estudiantes.length)
  const usados = new Set()
  const pares = []
  for (const g of pendientes) {
    if (pares.length >= 6) break
    if (usados.has(String(g.id))) continue
    const sugs = sugerenciasPara(g, grupos, opts).filter((s) => !s.analisis.blocked && !usados.has(String(s.grupo.id)))
    if (!sugs.length) continue
    pares.push({ from: g, to: sugs[0].grupo, analisis: sugs[0].analisis })
    usados.add(String(g.id))
    usados.add(String(sugs[0].grupo.id))
  }
  return pares
}

// Promedios de niños por grupo (manual: la meta se mide SIN Kinder; se reporta
// también con Kinder; Online se excluye siempre del promedio).
// sinK: niños no-Kinder de grupos no-online no-Kinder ÷ esos grupos.
// conK: niños de grupos no-online ÷ grupos no-online. pctMeta = sinK / MIN × 100.
export function promedios(grupos, MIN) {
  const activos = grupos.filter((g) => g.estado === 'activo' && g.estudiantes.length > 0)
  const total = activos.reduce((s, g) => s + g.estudiantes.length, 0)
  const noOnline = activos.filter((g) => !g.es_online)
  const gConK = noOnline.length
  const gruposSinK = noOnline.filter((g) => !isKinderGroup(g))
  const gSinK = gruposSinK.length
  const kidsSinK = gruposSinK.reduce((s, g) => s + g.estudiantes.filter((e) => e.itinerario !== 'KINDER').length, 0)
  const kidsConK = noOnline.reduce((s, g) => s + g.estudiantes.length, 0)
  const sinK = gSinK ? kidsSinK / gSinK : 0
  const conK = gConK ? kidsConK / gConK : 0
  const pctMeta = MIN ? (sinK / MIN) * 100 : 0
  return { total, gConK, gSinK, kidsSinK, sinK, conK, pctMeta }
}
