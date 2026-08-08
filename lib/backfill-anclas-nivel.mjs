// Backfill de anclas por niño (R3, g1-12, spec
// docs/superpowers/specs/2026-08-08-remodelado-grupo-nino-design.md) —
// lógica PURA, sin BD. El script (scripts/backfill-anclas-nivel-2026-08-08.mjs)
// pone el SQL, el manifiesto y la transacción del --apply; aquí vive la
// cascada, probada en espejo en test/backfill-anclas-nivel.test.mjs.
//
// Cascada ESTRICTA del spec — NUNCA inferido:
//   1. Evento de cambio de nivel (cambio_nivel / graduacion_tiny) cuyo destino
//      concuerda con itinerario+nivel ACTUALES del niño y sin movimiento
//      posterior contradictorio → ancla = detalle.ancla_despues si existe, si
//      no la fecha del evento (así escriben la ancla las acciones vivas).
//   2. Inscripción canónica (la ÚNICA 'inscripcion'; duplicadas = dedupe
//      g1-17 pendiente → ambiguo): solo si el evento trae a_nivel concordante
//      con el nivel actual (sin a_nivel no se puede verificar que siga en su
//      nivel de entrada — cae a la referencia, no se adivina) → ancla =
//      anclaDeAlta(fecha canónica, fecha_inicio_clases del grupo) (g1-8).
//   3. Referencia del grupo (itinerario_clases): solo si itinerario del grupo
//      y nivel de la referencia coinciden EXACTAMENTE con los del niño y no
//      hay movimiento incompatible (movido después del arranque del nivel de
//      la referencia, o ficha que no calza con su último movimiento) →
//      ancla = fecha_inicio de la referencia (el niño legacy sigue al aula).
//   Todo lo demás → sin_resolver (falta fuente) / ambiguo (señales en
//   conflicto: decide un humano, no el backfill).
//
// Cierres manuales preservados (g1-11): este módulo y su script JAMÁS tocan
// fecha_cierre_nivel — los valores legacy quedan como override manual.

import { anclaDeAlta } from './retiros.mjs'
import { calendarioVersionadoDe, crearMemoPlanes, planNino, posicionPlanNino } from './plan-nino.mjs'

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

// Fecha de la BD (Date del driver de Neon) o string ISO → 'AAAA-MM-DD' | null.
const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

// Tipos que mueven el ancla (espejo de app/actions/estudiantes.js: cualquiera
// de estos re-ancla o pudo re-anclar al niño) y los que cambian de nivel.
export const MOVIMIENTOS = ['cambio_nivel', 'graduacion_tiny', 'fusion', 'cambio_grupo']
export const TRANSICIONES_NIVEL = ['cambio_nivel', 'graduacion_tiny']

// Espejo de compareEvents (lib/inicios-clase.mjs): fecha iso10 y luego id.
const compareEventos = (a, b) => {
  const porFecha = String(iso10(a?.fecha) || '').localeCompare(String(iso10(b?.fecha) || ''))
  if (porFecha !== 0) return porFecha
  return Number(a?.id || 0) - Number(b?.id || 0)
}

// detalle / itinerario_clases llegan como objeto (JSONB) o string defensivo.
const jsonDe = (v) => {
  if (v == null) return null
  if (typeof v === 'string') {
    try { return JSON.parse(v) } catch { return null }
  }
  return typeof v === 'object' ? v : null
}

const ambiguo = (motivo, detalle = null) =>
  ({ estado: 'ambiguo', fuente: null, ancla: null, motivo, detalle })
const sinResolver = (motivo, detalle = null) =>
  ({ estado: 'sin_resolver', fuente: null, ancla: null, motivo, detalle })
const resuelta = (fuente, ancla, detalle = null) =>
  ({ estado: 'resuelta', fuente, ancla, motivo: null, detalle })

// La decisión g1-12 por niño. `eventos` son los del niño (se filtra defensivo
// por estudiante_id); `grupo` es su grupo ACTUAL (o null si está suelto).
// → { estado: 'ya_tiene' | 'resuelta' | 'ambiguo' | 'sin_resolver',
//     fuente: 'evento_cambio' | 'inscripcion_canonica' | 'referencia_grupo' | null,
//     ancla, motivo, detalle }
export function decidirAncla({ estudiante, eventos = [], grupo = null }) {
  const previa = iso10(estudiante?.fecha_inicio_nivel)
  if (previa) return { estado: 'ya_tiene', fuente: null, ancla: previa, motivo: null, detalle: null }

  const propios = (eventos || [])
    .filter((e) => e.estudiante_id == null || String(e.estudiante_id) === String(estudiante.id))
    .sort(compareEventos)
  const movimientos = propios.filter((e) => MOVIMIENTOS.includes(e.tipo))
  const inscripciones = propios.filter((e) => e.tipo === 'inscripcion')
  const transiciones = movimientos.filter((e) => TRANSICIONES_NIVEL.includes(e.tipo))
  const nivelActual = Number(estudiante.nivel)

  // ── Peldaño 1: último evento de cambio de nivel ──────────────────────────
  if (transiciones.length) {
    const t = transiciones[transiciones.length - 1]
    const fechaT = iso10(t.fecha)
    if (!fechaT || !RE_FECHA.test(fechaT)) {
      return ambiguo('transicion_sin_fecha', { eventoId: Number(t.id) })
    }
    const concuerdaNivel = Number(t.a_nivel) === nivelActual
    const concuerdaItinerario = t.tipo !== 'graduacion_tiny' || estudiante.itinerario === 'KIDS'
    if (!concuerdaNivel || !concuerdaItinerario) {
      // La ficha no calza con su propia historia (nivel editado sin evento):
      // cualquier otra fuente sería adivinar — terminal.
      return ambiguo('transicion_discordante', {
        eventoId: Number(t.id),
        aNivel: t.a_nivel == null ? null : Number(t.a_nivel),
        nivelActual,
      })
    }
    const posteriores = movimientos.filter((e) => compareEventos(e, t) > 0)
    if (posteriores.length) {
      // Un traslado/fusión posterior pudo re-anclar (g1-9) y el legacy no
      // trae detalle: la fecha del cambio de nivel ya no es demostrable.
      return ambiguo('movimiento_posterior_a_transicion', {
        eventoId: Number(t.id),
        posteriores: posteriores.map((e) => Number(e.id)),
      })
    }
    const anclaDetalle = iso10(jsonDe(t.detalle)?.ancla_despues)
    const ancla = anclaDetalle && RE_FECHA.test(anclaDetalle) ? anclaDetalle : fechaT
    return resuelta('evento_cambio', ancla, { eventoId: Number(t.id), tipo: t.tipo })
  }

  // ── Peldaño 2: inscripción canónica (solo sin movimientos de por medio) ──
  if (!movimientos.length && inscripciones.length) {
    if (inscripciones.length > 1) {
      return ambiguo('inscripcion_multiple', { eventos: inscripciones.map((e) => Number(e.id)) })
    }
    const ins = inscripciones[0]
    const fechaI = iso10(ins.fecha)
    if (!fechaI || !RE_FECHA.test(fechaI)) {
      return ambiguo('inscripcion_sin_fecha', { eventoId: Number(ins.id) })
    }
    if (ins.a_grupo_id != null && String(ins.a_grupo_id) !== String(estudiante.grupo_id ?? '')) {
      // Cambió de grupo sin evento de movimiento: historia rota, terminal.
      return ambiguo('inscripcion_discordante_grupo', {
        eventoId: Number(ins.id),
        aGrupoId: Number(ins.a_grupo_id),
        grupoActual: estudiante.grupo_id == null ? null : Number(estudiante.grupo_id),
      })
    }
    const nivelIns = ins.a_nivel == null ? null : Number(ins.a_nivel)
    if (nivelIns != null && nivelIns !== nivelActual) {
      return ambiguo('inscripcion_discordante_nivel', {
        eventoId: Number(ins.id),
        aNivel: nivelIns,
        nivelActual,
      })
    }
    if (nivelIns != null) {
      const ancla = anclaDeAlta(fechaI, grupo?.fecha_inicio_clases)
      if (ancla) return resuelta('inscripcion_canonica', ancla, { eventoId: Number(ins.id) })
      return ambiguo('inscripcion_sin_fecha', { eventoId: Number(ins.id) })
    }
    // Sin a_nivel (legacy) no se puede verificar que siga en su nivel de
    // entrada: cae a la referencia del grupo — jamás se infiere.
  }

  // ── Peldaño 3: referencia del grupo ──────────────────────────────────────
  if (!grupo) return sinResolver('sin_grupo')
  const ref = jsonDe(grupo.itinerario_clases)
  const refInicio = iso10(ref?.fecha_inicio)
  const refNivel = Number(ref?.nivel)
  if (!refInicio || !RE_FECHA.test(refInicio) || !Number.isFinite(refNivel)) {
    return sinResolver('grupo_sin_referencia')
  }
  if (grupo.itinerario !== estudiante.itinerario || refNivel !== nivelActual) {
    // El niño va adelantado/atrasado respecto del aula sin eventos que lo
    // expliquen: no hay fuente usable (no es un conflicto de historia).
    return sinResolver('referencia_discordante', {
      refNivel,
      nivelActual,
      itinerarioGrupo: grupo.itinerario,
      itinerarioNino: estudiante.itinerario,
    })
  }
  for (const m of movimientos) {
    const fechaM = iso10(m.fecha)
    if (!fechaM || !RE_FECHA.test(fechaM)) {
      return ambiguo('movimiento_sin_fecha', { eventoId: Number(m.id) })
    }
  }
  const ultimo = movimientos[movimientos.length - 1] || null
  if (ultimo && ultimo.a_grupo_id != null && String(ultimo.a_grupo_id) !== String(estudiante.grupo_id ?? '')) {
    return ambiguo('movimiento_discordante_grupo', {
      eventoId: Number(ultimo.id),
      aGrupoId: Number(ultimo.a_grupo_id),
      grupoActual: estudiante.grupo_id == null ? null : Number(estudiante.grupo_id),
    })
  }
  const posterior = movimientos.find((m) => iso10(m.fecha) > refInicio)
  if (posterior) {
    // Se movió DESPUÉS de que arrancó el nivel de la referencia: su posición
    // puede diferir de la del aula (g1-9) y el legacy no trae detalle.
    return ambiguo('movimiento_posterior_a_referencia', {
      eventoId: Number(posterior.id),
      fecha: iso10(posterior.fecha),
      refInicio,
    })
  }
  return resuelta('referencia_grupo', refInicio, { refNivel })
}

// ── Fingerprint para el CAS del --apply ─────────────────────────────────────

// Identidad de la decisión: la ficha que la sostiene (itinerario, nivel,
// grupo, estado, ancla previa y cierre manual preservado), los eventos
// considerados (ids ordenados: un evento nuevo la cambia) y el resultado.
// El --apply la recalcula EN VIVO dentro de la transacción y cualquier
// diferencia con la del manifiesto aborta con rollback total.
export function fingerprintAncla(estudiante, eventos, decision) {
  const ids = (eventos || [])
    .filter((e) => e.estudiante_id == null || String(e.estudiante_id) === String(estudiante.id))
    .filter((e) => MOVIMIENTOS.includes(e.tipo) || e.tipo === 'inscripcion')
    .map((e) => Number(e.id))
    .sort((a, b) => a - b)
  return JSON.stringify([
    Number(estudiante.id),
    estudiante.itinerario,
    Number(estudiante.nivel),
    estudiante.grupo_id == null ? null : Number(estudiante.grupo_id),
    estudiante.estado,
    iso10(estudiante.fecha_inicio_nivel),
    iso10(estudiante.fecha_cierre_nivel),
    ids,
    decision?.fuente ?? null,
    decision?.ancla ?? null,
  ])
}

// ── Validación: cobertura ───────────────────────────────────────────────────

// % de la población (activos + baja_potencial) que queda CON ancla tras el
// backfill: los que ya la tenían + las resueltas. Sin umbral inventado: el
// número se reporta y decide un humano; lo que sí es duro son las alertas del
// muestreo y los conflictos del CAS.
export function coberturaAnclas(poblacion, decisiones) {
  const total = (poblacion || []).length
  let yaTienen = 0
  let resueltas = 0
  let sinResolverN = 0
  let ambiguas = 0
  for (const est of poblacion || []) {
    const d = decisiones.get(String(est.id))
    if (d?.estado === 'ya_tiene') yaTienen++
    else if (d?.estado === 'resuelta') resueltas++
    else if (d?.estado === 'ambiguo') ambiguas++
    else sinResolverN++
  }
  const conAncla = yaTienen + resueltas
  return {
    poblacion: total,
    yaTienen,
    resueltas,
    ambiguas,
    sinResolver: sinResolverN,
    conAncla,
    cobertura: total ? Math.round((conAncla / total) * 1000) / 10 : 100,
  }
}

// ── Validación: muestreo de posiciones ──────────────────────────────────────

// Deriva el plan (planNino, el generador único g1-13) de una muestra
// determinista de resueltas (ordenadas por estudianteId, una de cada `cada`,
// tope `max`) y reporta la posición de cada niño a la fecha `hoy` (iso10
// Panamá). Alertas DURAS (abortan el --apply): el grupo tiene calendario pero
// el plan no deriva — la ancla propuesta no produce plan y algo está mal.
// Un grupo sin calendario da `sin_plan` explícito y NO alerta (g1-2: jamás se
// inventa horario). `entradas` = [{ estudiante, decision }] solo resueltas;
// `paisPorCentro` = Map(centroId → 'PA'|'VE').
export function muestreoPosiciones({ entradas, gruposPorId, paisPorCentro = new Map(), hoy, cada = 7, max = 30 }) {
  const ordenadas = [...(entradas || [])].sort(
    (a, b) => Number(a.estudiante.id) - Number(b.estudiante.id)
  )
  const paso = Math.max(1, Number(cada) || 1)
  const memo = crearMemoPlanes()
  const muestras = []
  const alertas = []
  for (let i = 0; i < ordenadas.length && muestras.length < max; i += paso) {
    const { estudiante, decision } = ordenadas[i]
    const grupo = estudiante.grupo_id == null ? null : gruposPorId.get(String(estudiante.grupo_id)) || null
    const calendario = grupo ? calendarioVersionadoDe(grupo) : []
    const pais = paisPorCentro.get(Number(estudiante.centro_id)) || 'PA'
    const it = grupo ? jsonDe(grupo.itinerario_clases) : null
    const plan = grupo
      ? planNino({
          ancla: decision.ancla,
          nivel: estudiante.nivel,
          pais,
          calendarioVersionado: calendario,
          excepciones: it?.excepciones || [],
        }, memo)
      : null
    const posicion = posicionPlanNino(plan, hoy)
    muestras.push({
      estudianteId: Number(estudiante.id),
      grupoId: estudiante.grupo_id == null ? null : Number(estudiante.grupo_id),
      fuente: decision.fuente,
      ancla: decision.ancla,
      nivel: Number(estudiante.nivel),
      estado: posicion.estado,
      indice: posicion.indice,
      semana: posicion.semana?.etiqueta ?? null,
    })
    if (calendario.length && !plan) {
      alertas.push({ tipo: 'plan_no_derivable', estudianteId: Number(estudiante.id), ancla: decision.ancla })
    }
  }
  return { muestras, alertas }
}

// ── Estado del manifiesto contra la fila viva (CAS del --apply) ─────────────

// 'aplicada' si la ancla decidida ya está puesta (idempotencia), 'pendiente'
// si sigue NULL y el fingerprint recalculado EN VIVO coincide con el del
// manifiesto, 'conflicto' ante cualquier deriva (ancla ajena, ficha movida,
// evento nuevo).
export function estadoAncla(filaViva, entrada, fingerprintVivo) {
  if (!filaViva) return 'conflicto'
  const anclaViva = iso10(filaViva.fecha_inicio_nivel)
  if (anclaViva) return anclaViva === entrada.ancla ? 'aplicada' : 'conflicto'
  return fingerprintVivo === entrada.fingerprint ? 'pendiente' : 'conflicto'
}
