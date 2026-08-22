// Normaliza a 'YYYY-MM-DD' lo que devuelve la base para una columna DATE.
//
// El driver de Postgres parsea DATE a un objeto Date de JavaScript (medianoche
// en la zona del proceso), no a texto. `String(fecha).slice(0, 10)` sobre eso
// devuelve "Fri Aug 01" — que ni es fecha ISO ni pasa la validación del payload
// de Zoho, así que TODOS los movimientos fallarían al publicarse. Se leen los
// componentes locales (no toISOString) para no correr un día cuando el proceso
// no está en UTC.
export function fechaISO(valor) {
  if (!valor) return null
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null
    const y = valor.getFullYear()
    const m = String(valor.getMonth() + 1).padStart(2, '0')
    const d = String(valor.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const texto = String(valor).trim()
  return /^\d{4}-\d{2}-\d{2}/.test(texto) ? texto.slice(0, 10) : null
}
