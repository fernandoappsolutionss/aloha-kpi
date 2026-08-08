// Preflight de datos del remodelado (rollout paso 1, spec
// docs/superpowers/specs/2026-08-08-remodelado-grupo-nino-design.md) —
// lógica PURA, sin BD. El script (scripts/preflight-remodelado-2026-08-08.mjs)
// pone el SQL, el manifiesto y el CAS por fila; aquí vive lo que se prueba en
// espejo en test/preflight-remodelado.test.mjs.
//
// Tres mediciones, en orden del rollout:
//   (a) g1-2 — grupos ACTIVOS con fecha_inicio_clases NULL: listado nominal
//       que BLOQUEA el rollout (con o sin itinerario; los resuelve un humano
//       o el backfill D7, nunca este preflight).
//   (b) g1-1 — grupos VETERANOS (nivel vigente >= 2) cuya fecha quedó en el
//       arranque FUTURO de su nivel (backfill D7) y tienen niños atribuidos:
//       se corrigen a LEAST(fecha actual, min inscripción atribuida) — la
//       cota que garantiza cero reclasificación (max(inscripción, fecha
//       grupo) = inscripción para TODOS sus niños). El comparable del cuadro
//       before/after debe ser IDÉNTICO: "antes" modela el comportamiento de
//       prod HOY (fecha efectivamente ignorada para el veterano → se simula
//       con NULL: grupo iniciado e inicio operativo = inscripción) y
//       "después" la fecha corregida.
//   (c) g1-3 — medición de historia: fecha_apertura <> día civil Panamá de
//       created_at (fechaPublicacion, el helper único). Solo se MIDE: la
//       columna fecha_apertura está congelada y nadie la reescribe.

import { fechaPublicacion } from './fecha-publicacion.mjs'
import { itInicioDe } from './backfill-fecha-inicio.mjs'

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

// Fecha de la BD (Date del driver de Neon) o string ISO → 'AAAA-MM-DD' | null.
const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

// itinerario_clases llega como objeto (JSONB) o, defensivamente, como string
// (mismo criterio que lib/llenado.mjs).
const itinerarioDe = (grupo) => {
  const it = grupo?.itinerario_clases
  if (it == null) return null
  if (typeof it === 'string') {
    try { return JSON.parse(it) } catch { return null }
  }
  return typeof it === 'object' ? it : null
}

// ── (a) g1-2: activos sin fecha de inicio ───────────────────────────────────

// Listado nominal de los grupos activos con fecha_inicio_clases NULL. Cada
// fila dice si el grupo TIENE itinerario (candidato del backfill D7) o no
// (fecha que debe poner un humano al crear el plan). Bloquea el rollout hasta
// quedar vacío; después se descomenta el CHECK de db/schema.sql (dos pasos).
export function activosSinFecha(grupos) {
  return (grupos || [])
    .filter((g) => g.estado === 'activo' && g.fecha_inicio_clases == null)
    .map((g) => ({
      grupoId: Number(g.id),
      centroId: Number(g.centro_id),
      numero: g.numero,
      itinerario: g.itinerario,
      tieneItinerario: itinerarioDe(g) != null,
      itInicio: itInicioDe(g),
      fechaPublicacion: fechaPublicacion(g.created_at),
    }))
}

// ── (b) g1-1: veteranos con arranque futuro ─────────────────────────────────

const activoOPotencial = (estado) => estado === 'activo' || estado === 'baja_potencial'

// Clasifica UN grupo con fecha_inicio_clases futura. `universo` son sus niños
// atribuidos (universosPorGrupo de lib/backfill-fecha-inicio.mjs, enriquecidos
// con `estado`): incluye retirados a propósito — también cuentan como inicios
// y la cota LEAST debe cubrirlos. Estados:
//   'no_aplica'           → sin fecha o fecha pasada/presente: fuera del caso.
//   'nivel_1_en_llenado'  → nivel vigente 1: la fecha futura es el llenado
//                            normal (venta anticipada), no un veterano roto.
//   'fecha_manual_futura' → la fecha NO es el arranque del nivel vigente del
//                            itinerario: la puso un humano, decide un humano.
//   'sin_ninos'           → veterano futuro sin niños atribuidos: no hay a
//                            quién reclasificar; entra al cuadro en su fecha.
//   'solo_retirados'      → atribuidos sin ningún activo/baja_potencial:
//                            revisión humana (el spec pide "con niños activos").
//   'universo_sin_fecha'  → algún atribuido sin fecha de inscripción: la cota
//                            LEAST no es demostrable; decide un humano.
//   'candidato'           → corrección automática: fechaNueva =
//                            LEAST(fecha actual, min inscripción atribuida).
export function clasificarVeteranoFuturo(grupo, universo, hoy) {
  const fecha = iso10(grupo?.fecha_inicio_clases)
  const h = iso10(hoy)
  if (!fecha || !h || fecha <= h) return { estado: 'no_aplica', fecha }

  const nivel = Number(itinerarioDe(grupo)?.nivel)
  const base = { fecha, nivel: Number.isFinite(nivel) ? nivel : null, itInicio: itInicioDe(grupo) }
  if (!Number.isFinite(nivel) || nivel < 2) return { ...base, estado: 'nivel_1_en_llenado' }
  if (base.itInicio !== fecha) return { ...base, estado: 'fecha_manual_futura' }

  const atribuidos = universo || []
  if (!atribuidos.length) return { ...base, estado: 'sin_ninos' }
  if (!atribuidos.some((u) => activoOPotencial(u.estado))) {
    return { ...base, estado: 'solo_retirados', universo: atribuidos.length }
  }
  if (atribuidos.some((u) => !iso10(u.fecha))) {
    return { ...base, estado: 'universo_sin_fecha', universo: atribuidos.length }
  }

  const minInscripcion = atribuidos.map((u) => iso10(u.fecha)).sort()[0]
  const fechaNueva = minInscripcion < fecha ? minInscripcion : fecha // LEAST
  return {
    ...base,
    estado: 'candidato',
    minInscripcion,
    fechaNueva,
    universo: atribuidos.length,
    activos: atribuidos.filter((u) => activoOPotencial(u.estado)).length,
  }
}

// Copia de grupos con la corrección simulada para la verificación (no muta).
// lado 'antes'   → fecha en NULL: modela el comportamiento vigente de prod
//   para el veterano (grupo iniciado, inicio operativo = inscripción; es
//   exactamente lo que hacen comparableMes y fechaInicioOperativa con NULL).
// lado 'despues' → fechaNueva del manifiesto.
// Solo pisa filas cuya fecha viva SIGUE siendo la futura auditada — la misma
// condición del CAS real del script.
export function patchCorreccionVeteranos(grupos, correcciones, lado) {
  return (grupos || []).map((g) => {
    const c = correcciones.get(String(g.id))
    if (!c || iso10(g.fecha_inicio_clases) !== c.fecha) return g
    return { ...g, fecha_inicio_clases: lado === 'antes' ? null : c.fechaNueva }
  })
}

// Estado de una entrada del manifiesto contra la fila viva (mismo vocabulario
// que lib/backfill-fecha-inicio.mjs): 'aplicada' si ya tiene la fechaNueva,
// 'pendiente' si conserva la fecha futura auditada Y la clasificación
// recalculada en vivo reproduce la misma corrección, 'conflicto' ante
// cualquier deriva.
export function estadoCorreccion(filaViva, entrada, clasificacionViva) {
  if (!filaViva) return 'conflicto'
  const fechaViva = iso10(filaViva.fecha_inicio_clases)
  if (fechaViva === entrada.fechaNueva) return 'aplicada'
  if (fechaViva !== entrada.fecha) return 'conflicto'
  if (clasificacionViva?.estado !== 'candidato') return 'conflicto'
  if (clasificacionViva.fechaNueva !== entrada.fechaNueva) return 'conflicto'
  return 'pendiente'
}

// ── (c) g1-3: medición de historia fecha_apertura vs publicación ────────────

// Compara fecha_apertura (columna congelada) contra el día civil Panamá de
// created_at — en SQL sería `fecha_apertura <> (created_at AT TIME ZONE
// 'America/Panama')::date`; aquí usa fechaPublicacion, el helper único (g1-3).
// Solo mide: nada se corrige. `muestras` lista las primeras discrepancias
// para el ojo humano.
export function medirHistoriaApertura(grupos, { maxMuestras = 50 } = {}) {
  let sinApertura = 0
  let coinciden = 0
  const distintas = []
  for (const g of grupos || []) {
    const apertura = iso10(g.fecha_apertura)
    if (!apertura || !RE_FECHA.test(apertura)) {
      sinApertura++
      continue
    }
    const publicacion = fechaPublicacion(g.created_at)
    if (apertura === publicacion) {
      coinciden++
    } else {
      distintas.push({
        grupoId: Number(g.id),
        centroId: Number(g.centro_id),
        numero: g.numero,
        fechaApertura: apertura,
        fechaPublicacion: publicacion,
      })
    }
  }
  return {
    total: (grupos || []).length,
    sinApertura,
    coinciden,
    distintos: distintas.length,
    muestras: distintas.slice(0, maxMuestras),
  }
}
