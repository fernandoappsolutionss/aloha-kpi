// Mismo formato de dinero que el Cuadro de Negocio (es-PA, USD).
export const usd = (n) => (Number(n) || 0).toLocaleString('es-PA', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 })
export const usdExacto = (n) => (Number(n) || 0).toLocaleString('es-PA', { style: 'currency', currency: 'USD' })
export const fechaCorta = (iso) => (iso ? new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-PA', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '—')
export const COLOR_SEMAFORO = { verde: 'var(--ok-text, #2F7A24)', ambar: 'var(--warn-text, #9A4A07)', rojo: 'var(--bad-text, #B3261E)' }
export const TEXTO_SEMAFORO = { verde: 'verde', ambar: 'ámbar', rojo: 'rojo' }
export const EMPRESAS = [{ id: 'altavia', nombre: 'Altavia' }, { id: 'ff', nombre: 'F&F' }, { id: 'consolidado', nombre: 'Consolidado' }]
