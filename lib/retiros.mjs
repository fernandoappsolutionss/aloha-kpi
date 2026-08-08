// Reglas puras del remodelado por niño que tocan a estudiantes (2026-08-08):
// ancla en el alta (g1-8), corrección de fecha_inscripcion (g1-19), evidencia
// de asistencia (g1-23) y retiro programado (g1-24). Cálculo puro, sin BD:
// app/actions/estudiantes.js, app/actions/coach.js y lib/retiros-service.js
// son los callers con transacción; aquí vive lo que se prueba en frío.

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

// Fecha de la BD (Date del driver de Neon) o string ISO → 'AAAA-MM-DD' | null.
const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

// ── Ancla en el alta (g1-8) ─────────────────────────────────────────────────

// Ancla del niño que entra CON grupo: max(fecha de inscripción/colocación,
// fecha_inicio_clases del grupo). El niño nunca arranca su nivel antes de que
// el grupo dé clases, ni antes de su propia venta. Sin fecha de grupo (legacy
// NULL) rige la de inscripción; sin ninguna → null (nada se inventa).
export function anclaDeAlta(fechaInscripcion, fechaInicioClasesGrupo) {
  const ins = iso10(fechaInscripcion)
  const grupo = iso10(fechaInicioClasesGrupo)
  if (ins && !RE_FECHA.test(ins)) return null
  if (!ins) return grupo && RE_FECHA.test(grupo) ? grupo : null
  if (!grupo || !RE_FECHA.test(grupo)) return ins
  return ins > grupo ? ins : grupo
}

// ── Corrección de fecha_inscripcion (g1-19) ─────────────────────────────────

// Los 4 periodos que la corrección debe bloquear ANTES de tocar nada: ficha
// vieja, year/month declarado del evento canónico, periodo real de la fecha
// del evento y periodo nuevo. Duplicados los depura bloquearMesesEditables;
// aquí solo se listan los válidos (una ficha vieja NULL no aporta periodo).
export function periodosCorreccionInscripcion({ fechaFichaVieja, evento, fechaNueva } = {}) {
  const periodos = []
  const de = (fecha) => {
    const f = iso10(fecha)
    if (!f || !RE_FECHA.test(f)) return null
    const [y, m] = f.split('-').map(Number)
    return { year: y, month: m }
  }
  const vieja = de(fechaFichaVieja)
  if (vieja) periodos.push(vieja)
  const yEv = Number(evento?.year)
  const mEv = Number(evento?.month)
  if (Number.isInteger(yEv) && Number.isInteger(mEv)) periodos.push({ year: yEv, month: mEv })
  const real = de(evento?.fecha)
  if (real) periodos.push(real)
  const nueva = de(fechaNueva)
  if (nueva) periodos.push(nueva)
  return periodos
}

// ── Evidencia de asistencia (g1-23) ─────────────────────────────────────────

// Todas las fechas de clase REALES del itinerario de referencia del grupo
// (semanas[].fechas ya es la verdad aplanada del calendario versionado, R2b:
// pasado conservado + sufijo vigente). Set para el chequeo O(1).
export function fechasDeClase(itinerario) {
  const out = new Set()
  for (const s of itinerario?.semanas || []) {
    for (const f of s.fechas || []) {
      const f10 = iso10(f)
      if (f10 && RE_FECHA.test(f10)) out.add(f10)
    }
  }
  return out
}

// Valida la fecha de una marca de asistencia (g1-23): debe ser una clase real
// del calendario versionado del grupo y no puede ser futura (<= hoy Panamá).
// Devuelve el mensaje de error o null. Grupo sin itinerario = fail closed:
// sin calendario no hay evidencia confiable que registrar.
export function errorFechaAsistencia(itinerario, fecha, hoy) {
  const f = iso10(fecha)
  if (!f || !RE_FECHA.test(f)) return 'Fecha inválida (AAAA-MM-DD).'
  const h = iso10(hoy)
  if (!h || !RE_FECHA.test(h)) return 'Fecha inválida (AAAA-MM-DD).'
  const fechas = fechasDeClase(itinerario)
  if (!fechas.size) {
    return 'El grupo aún no tiene itinerario de clases: pídele al administrador que genere el plan del grupo antes de marcar asistencia.'
  }
  if (!fechas.has(f)) {
    return `El ${f} no es una clase del itinerario de este grupo: la asistencia solo se marca sobre clases reales del calendario.`
  }
  if (f > h) {
    return `El ${f} todavía no llega: la asistencia se marca cuando la clase ya se dio (hoy es ${h}).`
  }
  return null
}

// ── Retiro programado (g1-24) ───────────────────────────────────────────────

// Día 1 del mes siguiente a `hoy` (iso10 Panamá): la fecha en que el retiro
// programado se hace efectivo ("sigue este mes, se va el próximo").
export function primerDiaMesSiguiente(hoy) {
  const h = iso10(hoy)
  if (!h || !RE_FECHA.test(h)) return null
  const [y, m] = h.split('-').map(Number)
  const ySig = m === 12 ? y + 1 : y
  const mSig = m === 12 ? 1 : m + 1
  return `${ySig}-${String(mSig).padStart(2, '0')}-01`
}

// Estado a restaurar al cancelar una programación: el previo guardado por
// programarRetiro en el detalle del evento (normalmente 'activo'). Fail safe:
// sin evento o con detalle raro se restaura 'activo' — jamás un estado
// inventado fuera de los dos posibles pre-programación.
export function estadoPrevioDeProgramacion(detalle) {
  return detalle?.estado_previo === 'baja_potencial' ? 'baja_potencial' : 'activo'
}
