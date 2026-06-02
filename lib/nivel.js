// Nivel de Centros ALOHA 2026
// El nivel se otorga por cantidad de niños activos, y SOLO si la deserción
// fue menor al 8% durante los 3 meses del trimestre (3 meses seguidos).
//   Nivel 1: > 170 niños   ·  Nivel 2: > 200   ·  Nivel 3: > 240
//   Nivel 4: > 325 niños   ·  Nivel 5: > 410
export const NIVELES = [
  { nivel: 5, min: 410 },
  { nivel: 4, min: 325 },
  { nivel: 3, min: 240 },
  { nivel: 2, min: 200 },
  { nivel: 1, min: 170 },
]

// Umbral máximo de deserción mensual (porcentaje) para optar a un nivel.
export const NIVEL_MAX_DESERCION_PCT = 8

// Nivel solo por cantidad de niños (sin considerar deserción).
export function nivelPorNinos(ninos) {
  for (const n of NIVELES) if (ninos > n.min) return n.nivel
  return 0
}

export function nivelLabel(nivel) {
  return nivel ? `Nivel ${nivel}` : 'Sin nivel'
}

// Próximo nivel a alcanzar según los niños actuales (para motivar la subida).
// Devuelve { nivel, min, faltan } o null si ya superó el nivel máximo.
export function siguienteNivel(ninos) {
  const asc = [...NIVELES].sort((a, b) => a.min - b.min)
  for (const n of asc) {
    if (ninos <= n.min) return { nivel: n.nivel, min: n.min, faltan: n.min + 1 - ninos }
  }
  return null
}
