// Lectura automática de la condición sobre la estadística principal.
// CONVENCIÓN DE ALOHA, NO DE HCA: la base teórica no fija porcentajes. Se
// calibra con scripts/calibrar-lectura-condicion.mjs antes de encender alertas.
export const UMBRAL_CAIDA_PELIGRO = -0.02
export const UMBRAL_AFLUENCIA = 0.02
export const SEMANAS_MINIMAS = 4
export const RACHA_PELIGRO = 3
export const RANGO = Object.freeze({ inexistencia: 0, peligro: 1, emergencia: 2, normal: 3, cambio_poder: 3, afluencia: 4, poder: 5 })

function lecturaSimple(valores, i) {
  const a = valores[i]; const b = valores[i - 1]
  if (a == null || b == null) return null
  const d = a - b
  const r = d / Math.max(b, 1)
  if (r <= UMBRAL_CAIDA_PELIGRO) return 'peligro'
  if (d <= 0) return 'emergencia'
  if (r >= UMBRAL_AFLUENCIA) return 'afluencia'
  return 'normal'
}

export function lecturaCondicion(serie = []) {
  const valores = serie.map((v) => (v == null ? null : Number(v)))
  const n = valores.length - 1
  const actual = valores[n]
  if (actual == null) return { condicion: null, motivo: 'Sin dato de la semana.' }
  if (valores.filter((v) => v != null).length < SEMANAS_MINIMAS || actual === 0) {
    return { condicion: 'inexistencia', motivo: 'Menos de 4 semanas con dato o valor en cero.' }
  }
  const base = lecturaSimple(valores, n)
  if (base == null) return { condicion: null, motivo: 'Falta la semana anterior.' }
  const bajando = (i) => valores[i] != null && valores[i - 1] != null && valores[i] < valores[i - 1]
  if (n >= RACHA_PELIGRO && [0, 1, 2].every((k) => bajando(n - k))) return { condicion: 'peligro', motivo: 'Tres semanas seguidas bajando.' }
  if (n >= RACHA_PELIGRO && [0, 1, 2].every((k) => { const l = lecturaSimple(valores, n - k); return l != null && RANGO[l] <= RANGO.emergencia })) {
    return { condicion: 'peligro', motivo: 'Emergencia durante tres semanas.' }
  }
  return { condicion: base, motivo: 'Inclinación de la última semana.' }
}

export function hayDiscrepancia(asignada, lectura) {
  if (!asignada || !lectura || RANGO[asignada] == null || RANGO[lectura] == null) return false
  return RANGO[asignada] > RANGO[lectura]
}
