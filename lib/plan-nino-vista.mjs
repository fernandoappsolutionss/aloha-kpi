// Presentación del plan (R3, g1-13) — lo que la línea de tiempo COMPARTIDA
// necesita para pintar, ya sea la referencia del aula o el plan derivado de un
// niño. Puro: sin React, sin BD y SIN volver a derivar nada. El motor único
// sigue siendo lib/plan-nino.mjs (planNino / posicionPlanNino); aquí solo se
// LEE la posición que ya vino resuelta y se traduce a píxeles: cuántas semanas
// van hechas, cuál es la de hoy y qué texto lleva la barra.
//
// Estados explícitos (los mismos de posicionPlanNino):
//   por_iniciar | en_curso | cerrado | sin_plan — jamás se interpreta un -1.

// El grupo trae su posición como el índice legacy de `semanaEnCurso`
// (lib/itinerario.js): -1 = nivel terminado, 0..n = semana en curso. Esta es la
// ÚNICA traducción de ese índice al vocabulario de estados, para que la línea
// de tiempo no tenga que conocer las dos formas.
export function posicionDeIndice(idxHoy, total = 0) {
  const t = Math.max(0, Number(total) || 0)
  if (!t) return { estado: 'sin_plan', indice: null }
  const i = Number(idxHoy)
  if (!Number.isFinite(i) || i < 0) return { estado: 'cerrado', indice: t - 1 }
  return { estado: 'en_curso', indice: Math.min(Math.trunc(i), t - 1) }
}

// Cómo se pinta la casilla `i` de la línea de tiempo.
//   cerrado    → todas hechas, ninguna es "hoy" (el nivel ya pasó).
//   en_curso   → hechas las anteriores, hoy la del índice.
//   por_iniciar / sin_plan → ninguna hecha y ninguna de hoy: el niño no ha
//   arrancado, así que atenuar semanas sería mentir sobre lo que ya vio.
export function estadoCasilla(i, { estado, indice } = {}) {
  if (estado === 'cerrado') return { hoy: false, pasada: true }
  if (estado !== 'en_curso') return { hoy: false, pasada: false }
  const idx = Number(indice)
  if (!Number.isFinite(idx)) return { hoy: false, pasada: false }
  return { hoy: i === idx, pasada: i < idx }
}

// Progreso del plan para la barra: semanas hechas, porcentaje y el texto de la
// izquierda. `etiqueta` es la de la semana en curso (o la primera, si el nivel
// aún no arranca); sin ella el texto cae al número de semana.
export function progresoPlan({ total, estado, indice, etiqueta } = {}) {
  const t = Math.max(0, Number(total) || 0)
  if (!t || estado === 'sin_plan' || !estado) {
    return { hechas: 0, pct: 0, texto: 'Sin plan derivable' }
  }
  if (estado === 'cerrado') return { hechas: t, pct: 100, texto: 'Nivel terminado' }
  if (estado === 'por_iniciar') {
    return { hechas: 0, pct: 0, texto: etiqueta ? `Aún no arranca (empieza por ${etiqueta})` : 'Aún no arranca' }
  }
  const idx = Number.isFinite(Number(indice)) ? Math.min(Math.max(0, Math.trunc(Number(indice))), t - 1) : 0
  const pct = Math.round((idx / t) * 100)
  return {
    hechas: idx,
    pct,
    texto: etiqueta ? `En curso: ${etiqueta} (${idx + 1} de ${t})` : `En curso: semana ${idx + 1} de ${t}`,
  }
}
