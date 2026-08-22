// De filas crudas de CSV a movimientos normalizados.
//
// Ningún banco panameño exporta con los mismos encabezados: Banco General
// manda "Fecha / Descripción / Débito / Crédito / Saldo total", BAC manda
// "Fecha / Concepto / Monto", St Georges mete el número de documento en
// "Referencia". En vez de una plantilla por banco (que se rompe cada vez que
// el banco cambia una tilde) se detectan las columnas por sinónimos, y el
// resto del módulo trabaja sobre un movimiento canónico:
//
//   { fecha: 'YYYY-MM-DD', descripcion, referencia, monto: 125.5,
//     direccion: 'entrada' | 'salida', saldo, fila }
//
// `monto` SIEMPRE es positivo; el signo vive en `direccion`.

const MESES = {
  ene: 1, enero: 1, jan: 1, january: 1,
  feb: 2, febrero: 2, february: 2,
  mar: 3, marzo: 3, march: 3,
  abr: 4, abril: 4, apr: 4, april: 4,
  may: 5, mayo: 5,
  jun: 6, junio: 6, june: 6,
  jul: 7, julio: 7, july: 7,
  ago: 8, agosto: 8, aug: 8, august: 8,
  sep: 9, sept: 9, septiembre: 9, september: 9,
  oct: 10, octubre: 10, october: 10,
  nov: 11, noviembre: 11, november: 11,
  dic: 12, diciembre: 12, dec: 12, december: 12,
}

// minúsculas, sin tildes y sin signos: "Débito (B/.)" → "debito b"
export function normalizarEncabezado(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// Sinónimos por campo. El orden importa: gana el primero que coincide, y
// `debito`/`credito` se prueban ANTES que `monto` porque "monto debito" debe
// caer en débito, no en el monto único.
const SINONIMOS = [
  ['fecha', ['fecha', 'fecha transaccion', 'fecha de transaccion', 'fecha operacion', 'fecha de operacion', 'fecha valor', 'fecha efectiva', 'fecha proceso', 'date', 'transaction date', 'f transaccion']],
  ['debito', ['debito', 'debitos', 'monto debito', 'cargo', 'cargos', 'retiro', 'retiros', 'egreso', 'egresos', 'salida', 'salidas', 'debit', 'withdrawal', 'debe']],
  ['credito', ['credito', 'creditos', 'monto credito', 'abono', 'abonos', 'deposito', 'depositos', 'ingreso', 'ingresos', 'entrada', 'entradas', 'credit', 'deposit', 'haber']],
  ['monto', ['monto', 'montos', 'importe', 'valor', 'amount', 'monto transaccion', 'monto de la transaccion', 'valor transaccion', 'transaction amount']],
  ['saldo', ['saldo', 'saldo total', 'saldo disponible', 'saldo actual', 'balance', 'running balance']],
  ['referencia', ['referencia', 'referencias', 'ref', 'nro referencia', 'numero de referencia', 'documento', 'no documento', 'nro documento', 'numero de documento', 'num documento', 'comprobante', 'cheque', 'no cheque', 'reference', 'reference number', 'document']],
  ['descripcion', ['descripcion', 'descripcion de la transaccion', 'concepto', 'concepto de la transaccion', 'detalle', 'detalles', 'transaccion', 'tipo de transaccion descripcion', 'description', 'memo', 'narrative', 'beneficiario', 'nombre']],
  ['tipo', ['tipo', 'tipo transaccion', 'tipo de transaccion', 'naturaleza', 'd c', 'dc', 'debito credito', 'tipo movimiento']],
]

// Empareja un encabezado con un campo canónico. Coincidencia exacta primero;
// si no, por prefijo/inclusión, para tolerar "fecha de la transaccion (dd/mm)".
function campoDeEncabezado(encabezado, yaUsados) {
  const norm = normalizarEncabezado(encabezado)
  if (!norm) return null
  for (const [campo, opciones] of SINONIMOS) {
    if (yaUsados.has(campo)) continue
    if (opciones.includes(norm)) return campo
  }
  for (const [campo, opciones] of SINONIMOS) {
    if (yaUsados.has(campo)) continue
    if (opciones.some((o) => norm === o || norm.startsWith(`${o} `) || norm.includes(` ${o} `) || norm.endsWith(` ${o}`))) return campo
  }
  return null
}

// Mapea una fila de encabezados a { campo: índice }.
export function mapearEncabezados(fila) {
  const mapa = {}
  const usados = new Set()
  fila.forEach((celda, indice) => {
    const campo = campoDeEncabezado(celda, usados)
    if (campo && mapa[campo] === undefined) { mapa[campo] = indice; usados.add(campo) }
  })
  return mapa
}

// Un mapa sirve si hay fecha y al menos una columna de dinero.
export function mapaUtil(mapa) {
  const hayDinero = mapa.monto !== undefined || mapa.debito !== undefined || mapa.credito !== undefined
  return mapa.fecha !== undefined && hayDinero
}

// Busca la fila de encabezados dentro de las primeras `ventana` filas: los
// extractos traen títulos, número de cuenta y líneas en blanco antes de la
// tabla. Gana la primera fila que produce un mapa utilizable.
export function detectarColumnas(filas, { ventana = 25 } = {}) {
  const limite = Math.min(filas.length, ventana)
  for (let i = 0; i < limite; i++) {
    const mapa = mapearEncabezados(filas[i])
    if (mapaUtil(mapa)) return { filaEncabezado: i, mapa }
  }
  return { filaEncabezado: -1, mapa: {} }
}

// ── Montos ───────────────────────────────────────────────────────────────────

// "1,234.56" → 1234.56 · "1.234,56" → 1234.56 · "(125.40)" → -125.40
// "B/. 80.00" → 80 · "125.40-" → -125.40 · "" → null
export function parsearMonto(valor) {
  if (valor === null || valor === undefined) return null
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null
  let texto = String(valor).trim()
  if (!texto) return null

  let negativo = false
  if (/^\(.*\)$/.test(texto)) { negativo = true; texto = texto.slice(1, -1) }
  if (/(^|\s)(db|dr|debito|débito)\b/i.test(texto)) negativo = true
  if (/[-]\s*$/.test(texto)) { negativo = true; texto = texto.replace(/-\s*$/, '') }

  // Fuera el prefijo de moneda ANTES de limpiar: "B/. 80.00" limpiado a lo
  // bruto queda ".80.00" y el punto huérfano se leería como separador de miles
  // (8000). Se corta todo lo que no sea dígito ni signo al inicio.
  texto = texto.replace(/^[^0-9(+-]+/, '')
  // Fuera símbolos de moneda, letras y espacios; quedan dígitos, . , y -
  texto = texto.replace(/[^0-9.,-]/g, '').replace(/[.,]+$/, '')
  if (!texto || !/[0-9]/.test(texto)) return null
  if (texto.startsWith('-')) { negativo = true }
  texto = texto.replace(/-/g, '')

  const ultimaComa = texto.lastIndexOf(',')
  const ultimoPunto = texto.lastIndexOf('.')
  let decimal = null
  if (ultimaComa >= 0 && ultimoPunto >= 0) {
    // Manda el que aparece más a la derecha: "1.234,56" vs "1,234.56".
    decimal = ultimaComa > ultimoPunto ? ',' : '.'
  } else if (ultimaComa >= 0 || ultimoPunto >= 0) {
    const sep = ultimaComa >= 0 ? ',' : '.'
    const pos = ultimaComa >= 0 ? ultimaComa : ultimoPunto
    const decimales = texto.length - pos - 1
    const ocurrencias = texto.split(sep).length - 1
    // Un único separador con 1 o 2 decimales es coma decimal; "1,234" o
    // "1.234.567" son miles.
    decimal = ocurrencias === 1 && decimales > 0 && decimales <= 2 ? sep : null
  }

  let limpio
  if (decimal) {
    const miles = decimal === ',' ? '.' : ','
    limpio = texto.split(miles).join('').replace(decimal, '.')
  } else {
    limpio = texto.replace(/[.,]/g, '')
  }
  const n = Number(limpio)
  if (!Number.isFinite(n)) return null
  return negativo ? -n : n
}

// ── Fechas ───────────────────────────────────────────────────────────────────

function iso(anio, mes, dia) {
  if (!(mes >= 1 && mes <= 12) || !(dia >= 1 && dia <= 31)) return null
  const y = anio < 100 ? 2000 + anio : anio
  const d = new Date(Date.UTC(y, mes - 1, dia))
  if (d.getUTCFullYear() !== y || d.getUTCMonth() !== mes - 1 || d.getUTCDate() !== dia) return null
  return `${String(y).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
}

// Parte una fecha en sus tres componentes sin decidir todavía qué es día y qué
// es mes: eso lo resuelve `orden` (detectado para todo el archivo).
function partirFecha(valor) {
  const texto = String(valor || '').trim()
  if (!texto) return null
  // ISO: 2026-08-01 (o con hora)
  let m = texto.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/)
  if (m) return { tipo: 'iso', a: Number(m[1]), b: Number(m[2]), c: Number(m[3]) }
  // Con nombre de mes: 01-ago-2026 / 1 ago 2026
  m = texto.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .match(/^(\d{1,2})[-/\s]([a-zA-Z]{3,10})\.?[-/\s](\d{2,4})/)
  if (m) {
    const mes = MESES[m[2].toLowerCase()]
    return mes ? { tipo: 'mes-nombre', dia: Number(m[1]), mes, anio: Number(m[3]) } : null
  }
  // Numérica: 01/08/2026, 1-8-26
  m = texto.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/)
  if (m) return { tipo: 'numerica', a: Number(m[1]), b: Number(m[2]), anio: Number(m[3]) }
  // Compacta: 20260801
  m = texto.match(/^(\d{4})(\d{2})(\d{2})$/)
  if (m) return { tipo: 'iso', a: Number(m[1]), b: Number(m[2]), c: Number(m[3]) }
  return null
}

// Panamá escribe dd/mm/yyyy, pero un export en inglés puede traer mm/dd/yyyy.
// Se decide mirando TODO el archivo: si algún primer componente pasa de 12 es
// día-mes; si algún segundo componente pasa de 12 es mes-día. Sin evidencia,
// se asume día-mes (el uso local).
export function detectarOrdenFecha(valores) {
  let dma = 0
  let mda = 0
  for (const v of valores) {
    const p = partirFecha(v)
    if (!p || p.tipo !== 'numerica') continue
    if (p.a > 12) dma++
    if (p.b > 12) mda++
  }
  if (dma && !mda) return 'dma'
  if (mda && !dma) return 'mda'
  return 'dma'
}

export function parsearFecha(valor, orden = 'dma') {
  const p = partirFecha(valor)
  if (!p) return null
  if (p.tipo === 'iso') return iso(p.a, p.b, p.c)
  if (p.tipo === 'mes-nombre') return iso(p.anio, p.mes, p.dia)
  const dia = orden === 'mda' ? p.b : p.a
  const mes = orden === 'mda' ? p.a : p.b
  return iso(p.anio, mes, dia)
}

// ── Filas → movimientos ──────────────────────────────────────────────────────

const ENTRADA_TIPO = /^(c|cr|credito|credit|abono|deposito|haber|entrada|ingreso)/
const SALIDA_TIPO = /^(d|db|dr|debito|debit|cargo|retiro|debe|salida|egreso)/

function direccionPorTipo(texto) {
  const norm = normalizarEncabezado(texto)
  if (!norm) return null
  if (ENTRADA_TIPO.test(norm)) return 'entrada'
  if (SALIDA_TIPO.test(norm)) return 'salida'
  return null
}

const celda = (fila, indice) => (indice === undefined ? '' : String(fila[indice] ?? '').trim())

// Convierte las filas de datos en movimientos canónicos. Devuelve también las
// filas descartadas con su motivo: un extracto trae totales al pie ("SALDO
// FINAL") que no son movimientos, y quien concilia necesita ver que se
// ignoraron a propósito y no por un error de lectura.
export function normalizarFilas(filas, mapa, { orden } = {}) {
  const datos = filas.filter((f) => f.some((c) => String(c || '').trim() !== ''))
  const ordenFecha = orden || detectarOrdenFecha(datos.map((f) => celda(f, mapa.fecha)))
  const movimientos = []
  const descartadas = []

  datos.forEach((fila, indice) => {
    const fechaCruda = celda(fila, mapa.fecha)
    const fecha = parsearFecha(fechaCruda, ordenFecha)
    if (!fecha) {
      descartadas.push({ fila: indice + 1, motivo: 'sin fecha válida', crudo: fila.join(' | ').slice(0, 160) })
      return
    }

    const debito = mapa.debito !== undefined ? parsearMonto(celda(fila, mapa.debito)) : null
    const credito = mapa.credito !== undefined ? parsearMonto(celda(fila, mapa.credito)) : null
    const monto = mapa.monto !== undefined ? parsearMonto(celda(fila, mapa.monto)) : null

    let valor = null
    let direccion = null
    if (credito !== null && credito !== 0) { valor = Math.abs(credito); direccion = 'entrada' }
    else if (debito !== null && debito !== 0) { valor = Math.abs(debito); direccion = 'salida' }
    else if (monto !== null && monto !== 0) {
      valor = Math.abs(monto)
      direccion = direccionPorTipo(celda(fila, mapa.tipo)) || (monto < 0 ? 'salida' : 'entrada')
    }

    if (valor === null || !(valor > 0)) {
      descartadas.push({ fila: indice + 1, motivo: 'sin monto', crudo: fila.join(' | ').slice(0, 160) })
      return
    }

    movimientos.push({
      fecha,
      descripcion: celda(fila, mapa.descripcion) || celda(fila, mapa.tipo) || 'Movimiento bancario',
      referencia: celda(fila, mapa.referencia) || '',
      monto: Math.round(valor * 100) / 100,
      direccion,
      saldo: mapa.saldo !== undefined ? parsearMonto(celda(fila, mapa.saldo)) : null,
      fila: indice + 1,
    })
  })

  return { movimientos, descartadas, orden: ordenFecha }
}
