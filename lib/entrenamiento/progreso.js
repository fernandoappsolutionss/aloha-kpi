// Progreso del entrenamiento — cálculo puro, sin BD ni React.
// `progreso` es { [moduloId]: { tourVistoAt, quizAprobadoAt, intentos, ultimoPuntaje } }
// tal como lo devuelve cargarProgreso() (app/actions/entrenamiento.js).

export function completado(p) {
  return Boolean(p && p.tourVistoAt && p.quizAprobadoAt)
}

export function porcentaje(progreso, modulos) {
  const total = modulos.length
  const completados = modulos.filter((m) => completado(progreso?.[m.id])).length
  const pct = total ? Math.round((completados / total) * 100) : 0
  return { completados, total, pct }
}

export function siguienteModulo(progreso, modulos) {
  const m = modulos.find((x) => !completado(progreso?.[x.id]))
  return m ? m.id : null
}

// Página en la que vive el paso n (1-based): la última `ruta` de los pasos
// ANTERIORES a n, o inicio.ruta. Un paso hazlo con `ruta` vive en la página
// origen (el clic navega); el siguiente ya vive en el destino. El motor usa
// esto para que Omitir/Anterior/deep-link caigan en la página correcta.
export function rutaDePaso(modulo, n) {
  let r = modulo.inicio.ruta
  const tope = Math.min(Math.max(0, n - 1), modulo.pasos.length)
  for (let i = 0; i < tope; i++) if (modulo.pasos[i].ruta) r = modulo.pasos[i].ruta
  return r
}

// respuestas: índices elegidos por el usuario (puede venir corto, nulo o con basura).
// correctas: índices correctos del módulo (siempre 3).
export function corregirQuiz(respuestas, correctas) {
  const r = Array.isArray(respuestas) ? respuestas : []
  const marcas = correctas.map((c, i) => Number.isInteger(r[i]) && r[i] === c)
  const puntaje = marcas.filter(Boolean).length
  return { puntaje, correctas: marcas, aprobado: puntaje === correctas.length }
}
