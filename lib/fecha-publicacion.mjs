// Fecha de publicación de un grupo — helper ÚNICO del remodelado (R1, g1-3).
//
// Regla de Fernando 2026-08-08: el grupo tiene UNA sola fecha (la de inicio de
// clases); `created_at` es la historia de publicación. Cuando hace falta un
// respaldo (auditoría, protección de meses, display, métrica de edad del
// llenado) se usa SIEMPRE el día CIVIL de Panamá en que se publicó el grupo:
// `(created_at AT TIME ZONE 'America/Panama')::date` en SQL, y esta función en
// JS. JAMÁS `fecha_inicio_clases` (es justo la fecha que puede estar
// cambiando) ni `fecha_apertura` (columna congelada: se conserva sin
// escrituras nuevas).
//
// La conversión civil importa en el borde de medianoche: un grupo creado a las
// 19:30 de Panamá queda guardado como 00:30 UTC del día SIGUIENTE; cortar el
// ISO con slice(0, 10) lo publicaría un día después de lo que vivió Fernando.
// Cálculo puro, sin BD — mismo patrón de zona horaria que hoyISO
// (lib/operaciones.js), local aquí para que el módulo sea importable desde los
// tests .mjs de node puro.

const RE_FECHA_CIVIL = /^\d{4}-\d{2}-\d{2}$/

export function fechaPublicacion(createdAt) {
  if (!createdAt) return null
  // Una fecha civil ya resuelta ('AAAA-MM-DD') se respeta tal cual: pasarla
  // por new Date() la leería como medianoche UTC y la correría un día.
  if (typeof createdAt === 'string' && RE_FECHA_CIVIL.test(createdAt)) return createdAt
  const instante = createdAt instanceof Date ? createdAt : new Date(createdAt)
  if (Number.isNaN(instante.getTime())) return null
  // 'en-CA' formatea AAAA-MM-DD; timeZone hace la conversión civil correcta.
  return instante.toLocaleDateString('en-CA', { timeZone: 'America/Panama' })
}
