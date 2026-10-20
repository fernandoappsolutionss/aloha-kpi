import { estadistica } from './estadisticas-semana/catalogo.mjs'

export function validarJuego(datos) {
  if (!datos || typeof datos !== 'object') throw new Error('Completa el juego.')
  estadistica(datos.codigo)
  const juego = { codigo: datos.codigo }
  for (const [campo, max] of [['titulo', 120], ['participantes', 300], ['reglas', 1500], ['premio', 300]]) {
    if (typeof datos[campo] !== 'string' || !datos[campo].trim() || datos[campo].trim().length > max) throw new Error(`Completa ${campo} (hasta ${max} caracteres).`)
    juego[campo] = datos[campo].trim()
  }
  if (!['number', 'string'].includes(typeof datos.meta) || String(datos.meta).trim() === '' || !Number.isSafeInteger(Number(datos.meta)) || Number(datos.meta) < 0 || Number(datos.meta) > 1000000) throw new Error('La meta debe ser un entero entre 0 y 1000000.')
  if (!Number.isSafeInteger(datos.version) || datos.version < 0) throw new Error('Recarga el juego antes de guardar.')
  return { ...juego, meta: Number(datos.meta), version: datos.version }
}

export function resultadoJuego(juego, valor, cerrado = false) {
  if (juego.estado !== 'aprobado') return 'Propuesta · pendiente de aprobación'
  if (valor == null) return 'Sin dato para evaluar'
  const inversa = estadistica(juego.codigo).inversa
  const cumple = inversa ? valor <= juego.meta : valor >= juego.meta
  if (!cerrado) return cumple ? 'Meta alcanzada al corte · sigue hasta el cierre' : 'Reto en curso'
  return cumple ? 'Meta lograda · coordinación verifica el premio' : 'Meta no alcanzada al cierre'
}
