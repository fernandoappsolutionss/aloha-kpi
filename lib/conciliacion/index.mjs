// Orquestador puro del conciliador: texto del CSV → movimientos listos para
// revisar. No toca base de datos ni red; quien le pasa las reglas, las cuentas
// puente, las huellas ya importadas y lo que Zoho ya tiene es la capa de
// servicio (lib/conciliacion-repository.js + app/actions/conciliacion.js).

import { parsearCSV } from './csv.mjs'
import { detectarColumnas, normalizarFilas } from './columnas.mjs'
import { asignarHuellas } from './huella.mjs'
import { clasificarLote } from './reglas.mjs'
import { conciliar, resumenLote } from './conciliar.mjs'

export const LIMITE_MOVIMIENTOS = 5000

export function analizarExtracto(texto, {
  reglas = [],
  defaults = {},
  transaccionesZoho = [],
  huellasPrevias = new Set(),
  toleranciaDias = 3,
  orden = null,
} = {}) {
  const { filas, separador } = parsearCSV(texto)
  if (!filas.length) {
    return { error: 'El archivo está vacío.' }
  }

  const { filaEncabezado, mapa } = detectarColumnas(filas)
  if (filaEncabezado < 0) {
    const muestra = filas.slice(0, 3).map((f) => f.join(' | ')).join('  ·  ').slice(0, 240)
    return {
      error: 'No se reconocieron las columnas del archivo. Se necesita una columna de fecha y otra de monto '
        + '(o débito/crédito). Primeras líneas leídas: ' + (muestra || '(vacío)'),
    }
  }

  const { movimientos: crudos, descartadas, orden: ordenFecha } =
    normalizarFilas(filas.slice(filaEncabezado + 1), mapa, { orden })

  if (!crudos.length) {
    return { error: 'Se leyeron las columnas pero ninguna fila tenía fecha y monto válidos.' }
  }
  if (crudos.length > LIMITE_MOVIMIENTOS) {
    return { error: `El archivo trae ${crudos.length} movimientos y el máximo por carga es ${LIMITE_MOVIMIENTOS}. Divide el extracto por mes.` }
  }

  const conHuella = asignarHuellas(crudos)
  const clasificados = clasificarLote(conHuella, reglas, defaults)
  const movimientos = conciliar(clasificados, transaccionesZoho, { toleranciaDias, huellasPrevias })

  const fechas = movimientos.map((m) => m.fecha).sort()
  return {
    movimientos,
    descartadas,
    resumen: resumenLote(movimientos),
    columnas: { separador, filaEncabezado, mapa, orden: ordenFecha },
    periodo: { desde: fechas[0], hasta: fechas[fechas.length - 1] },
  }
}

export { parsearCSV } from './csv.mjs'
export { detectarColumnas, normalizarFilas, parsearMonto, parsearFecha } from './columnas.mjs'
export { asignarHuellas, huellaDe } from './huella.mjs'
export { clasificar, clasificarLote, MODOS, DIRECCIONES, reglaValida } from './reglas.mjs'
export { conciliar, resumenLote } from './conciliar.mjs'
export { payloadBancario } from './zoho-payload.mjs'
