import { createHash } from 'node:crypto'

// Huella de un movimiento: identifica la MISMA línea del extracto entre
// cargas repetidas para que volver a subir el archivo de agosto no duplique
// nada en Zoho.
//
// El detalle fino: un extracto legítimamente repite líneas idénticas (dos
// pagos de $80 el mismo día al mismo beneficiario). Si la huella fuera solo
// el contenido, la segunda se descartaría como duplicado y ese movimiento
// jamás llegaría a Zoho. Por eso la huella lleva el número de ocurrencia
// dentro de su propio grupo: la primera es "…#1", la segunda "…#2". Al
// resubir el archivo completo, ambas vuelven a calcular #1 y #2 y ambas se
// reconocen como ya importadas.

// Texto comparable: sin tildes, sin dobles espacios, en mayúsculas.
export function normalizarDescripcion(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

export function claveMovimiento(mov) {
  const monto = Math.abs(Number(mov.monto) || 0).toFixed(2)
  return [
    mov.fecha,
    mov.direccion,
    monto,
    normalizarDescripcion(mov.referencia),
    normalizarDescripcion(mov.descripcion),
  ].join('|')
}

export function huellaDe(mov, ocurrencia = 1) {
  const base = `${claveMovimiento(mov)}#${ocurrencia}`
  return createHash('sha1').update(base).digest('hex')
}

// Asigna huella a cada movimiento respetando el orden del archivo.
export function asignarHuellas(movimientos) {
  const vistas = new Map()
  return movimientos.map((mov) => {
    const clave = claveMovimiento(mov)
    const ocurrencia = (vistas.get(clave) || 0) + 1
    vistas.set(clave, ocurrencia)
    return { ...mov, huella: huellaDe(mov, ocurrencia), ocurrencia }
  })
}
