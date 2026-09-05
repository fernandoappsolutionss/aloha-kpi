// ¿LO GUARDADO CONTRADICE LO CALCULADO?
//
// Las 3 metas de resultado (ventas, deserción, cobranza) viven en la tabla
// `cumplimiento` como TEXTO 'si'/'no' porque durante años se marcaron A MANO.
// Desde que las calcula lib/marcadores.mjs, la pantalla del centro pinta el
// valor CALCULADO — así que la marca vieja se volvió INVISIBLE ahí y siguió
// viva en la base, sumando en el % del panel del supervisor
// (app/actions/dashboard.js recorre los 33 criterios). Un 'si' viejo infla la
// Disciplina del panel sin que nadie pueda verlo ni corregirlo desde ninguna
// pantalla: es exactamente la forma del bug del 88%, sobreviviendo en la base.
//
// Este módulo hace UNA cosa: comparar las dos fuentes y devolver la brecha con
// sus números. No corrige nada (eso lo hace
// scripts/backfill-metas-cumplimiento-2026-09-05.mjs) y no borra nada.
//
// TONO — esto lo lee la persona que marcó la casilla.
// El sistema informa que DOS FUENTES NO COINCIDEN; no dictamina cuál miente.
// Hay explicaciones legítimas: cobranza cargada después del cierre, un cierre
// que se rehízo, un ajuste pactado. Por eso ninguna frase de aquí dice
// "incorrecto", "falso" ni "mal marcado": dice qué guarda el registro, qué
// dice el cálculo, y con qué números. El aviso se retira solo cuando las dos
// fuentes coinciden — no hay botón de "descartar", porque descartarlo sería
// volver al punto de partida.
//
// Módulo PURO: sin BD, sin React, sin 'use server'. Se testea con `npm test`.

import { dec1 } from './marcadores.mjs'

// Las 3 claves de PRODUCTO, escritas aquí a propósito en vez de importar
// PRODUCTO_KEYS de lib/checklist.js: este módulo tiene que poder compararse
// contra el checklist, no heredar de él. test/discrepancias-metas.test.mjs
// afirma que las dos listas son la misma, así que un renombre no pasa mudo.
export const CLAVES_PRODUCTO = ['meta_nuevos_ingresos', 'meta_desercion', 'meta_cobranza']

// LA PUERTA. Lo que un formulario SÍ puede escribir: todo el checklist MENOS
// las 3 metas de resultado. Vive aquí, en el módulo puro, para que la regla
// "estas tres no se marcan a mano" se pueda probar sin base de datos en vez de
// quedar escondida dentro de una server action.
export const clavesDisciplina = (todas = []) => (todas || []).filter((k) => !CLAVES_PRODUCTO.includes(k))

export const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export const nombreMes = (n) => NOMBRES_MES[Number(n) - 1] || ''

// Frase que acompaña SIEMPRE al aviso, en las dos pantallas. Está aquí y no
// duplicada en cada componente para que nadie pueda endurecer el tono en una
// sola de ellas.
export const NOTA_NEUTRAL =
  'El sistema no decide cuál de las dos fuentes tiene razón: informa que no coinciden. ' +
  'Puede haber una explicación legítima —cobranza cargada después del cierre, un cierre ' +
  'rehecho, un ajuste pactado—. El aviso desaparece solo cuando las dos coincidan.'

// EL ENCUADRE, ANTES DE CUALQUIER NOMBRE PROPIO. Con el sesgo cargado a un
// solo lado y casi todos los centros afectados, una línea de reparto puesta al
// lado de un nombre se lee como un señalamiento personal. El patrón no es de
// una persona: es que la meta dejó de ser un instrumento de medición y pasó a
// ser una casilla heredada. Vive aquí, junto a NOTA_NEUTRAL y por la misma
// razón: para que nadie pueda quitarlo en una sola de las dos pantallas.
export function encuadre(afectados = 0, total = 0) {
  if (!total || afectados < 2 || afectados * 2 <= total) return ''
  return `Esto aparece en ${afectados} de ${total} centros: es un problema de cómo se venía marcando la casilla, no de un centro.`
}

const listar = (items) => {
  const xs = (items || []).filter(Boolean)
  if (xs.length <= 1) return xs[0] || ''
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`
}

// 'si' / 'no' / null. Cualquier otra cosa —NULL de la base, cadena vacía, un
// valor de un import viejo— es SIN MARCAR, no es un "no".
//
// Esto importa: app/actions/cumplimiento.js:22 normaliza `row[k] || 'no'` al
// cargar, así que un NULL llegaría disfrazado de "no cumple" y el detector
// inventaría una discrepancia "de menos" que nadie marcó. Por eso la comparación
// se hace contra el valor CRUDO de la fila (`metasGuardadas`), no contra `vals`.
export function marca(valor) {
  const v = typeof valor === 'string' ? valor.trim().toLowerCase() : valor
  if (v === 'si' || v === 'sí') return 'si'
  if (v === 'no') return 'no'
  return null
}

const PALABRA = { si: 'Sí', no: 'No' }

// EL VERDICTO ES TRIMESTRAL Y LA FILA ES MENSUAL. Esa asimetría estaba
// explicada en el comentario de `compararMetas` y en ninguna frase de pantalla,
// así que el aviso nombraba tres meses y ponía debajo la evidencia de UNO —
// el peor. Una administradora que sabe que su marzo cerró en 0% leía eso como
// un error del sistema, y tenía parte de razón. La regla se dice donde se lee.
export const REGLA_TRIMESTRAL =
  'La meta se juzga por el trimestre completo: basta un mes fuera de meta para que el trimestre falle.'

// La evidencia numérica de cada meta, sacada del MISMO objeto que pinta la
// pantalla (`producto.detalle`, lib/marcadores.mjs). No se recalcula nada aquí:
// si el detector recalculara por su cuenta podría discrepar de la pantalla, y
// entonces habría TRES fuentes en vez de dos.
export function evidenciaDeMeta(d) {
  const meta = d?.meta ? ` (meta ${d.meta})` : ''
  if (d.clave === 'meta_nuevos_ingresos') {
    return `Ventas del trimestre: ${d.valor}${meta}.`
  }
  if (d.clave === 'meta_desercion') {
    const p = d.peorMes
    if (!p) return `Deserción real del trimestre: ${d.valor}${meta}.`
    return `Peor mes: ${nombreMes(p.mesNum)}, ${p.desReal} bajas reales sobre ${p.ninosInicio} niños = ${dec1(p.pct)}%${meta}.`
  }
  const p = d.peorMes
  if (!p) return `Cobranza del trimestre: ${d.valor}${meta}.`
  return `Peor mes: ${nombreMes(p.mesNum)}, ${p.cobranza} ${p.cobranza === 1 ? 'cuota vencida' : 'cuotas vencidas'}${meta}.`
}

// ── EL DETECTOR ─────────────────────────────────────────────────────────────
// `producto`  = lo que devuelve evaluarProducto() para ese trimestre.
// `filas`     = las filas guardadas de `cumplimiento` del trimestre, con `mes`
//               1..3 y el valor CRUDO de las 3 columnas.
// `mesesDelTrimestre` = los meses calendario del trimestre ([7,8,9]), para
//               poder nombrarlos. Si no vienen, se nombra "mes 1/2/3".
//
// ponytail: el verdicto de PRODUCTO es TRIMESTRAL y la fila guardada es
// MENSUAL, así que los 3 meses de un trimestre se comparan contra el mismo
// verdicto. Es la misma simplificación que ya hace la pantalla al guardar
// (app/centro/[id]/cumplimiento/page.js mete P1/P2/P3 del trimestre en la fila
// del mes). Techo: un mes que cumplió dentro de un trimestre que falla se
// reporta como discrepante. Salida: cuando la meta pase a juzgarse por mes,
// `producto` traerá un verdicto por mes y esta función recibe el del mes.
export function compararMetas({ producto = null, filas = [], mesesDelTrimestre = [] } = {}) {
  const vacio = {
    disponible: false, discrepancias: [], noVerificables: [],
    celdas: 0, filas: 0, casos: 0, coinciden: 0, marcadas: 0,
  }
  if (!producto || !Array.isArray(producto.detalle)) return vacio

  const nombreDe = (mes) => {
    const calendario = (mesesDelTrimestre || [])[Number(mes) - 1]
    return calendario ? nombreMes(calendario) : `mes ${mes}`
  }

  const discrepancias = []
  const noVerificables = []
  let marcadas = 0
  let coinciden = 0

  for (const clave of CLAVES_PRODUCTO) {
    const d = producto.detalle.find((x) => x.clave === clave)
    if (!d) continue

    // Todas las filas del trimestre que traen una marca EXPLÍCITA en esta meta.
    const conMarca = (filas || [])
      .map((f) => ({ mes: Number(f?.mes), valor: marca(f?.[clave]) }))
      .filter((f) => f.valor !== null && Number.isFinite(f.mes))
      .sort((a, b) => a.mes - b.mes)
    marcadas += conMarca.length
    if (!conMarca.length) continue

    // La meta no se puede juzgar (trimestre sin datos, sin población base, sin
    // cobranza declarada). "No se puede saber" NO es "no cumple": se reporta
    // aparte y jamás como discrepancia.
    if (d.cumple === null) {
      const porValor = ['si', 'no'].map((valor) => {
        const meses = conMarca.filter((f) => f.valor === valor).map((f) => f.mes)
        return { valor, meses, nombresMeses: listar(meses.map(nombreDe)) }
      }).filter((x) => x.meses.length)
      noVerificables.push({
        clave, etiqueta: d.etiqueta, corta: d.corta,
        meta: d.meta, valor: d.valor,
        marcas: porValor,
        celdas: conMarca.length,
        motivo: producto.sinDatos
          ? 'el trimestre no tiene un solo mes con datos'
          : 'con los datos cargados esta meta todavía no se puede juzgar',
      })
      continue
    }

    // `cumple` es booleano, así que toda fila discrepante lleva la marca
    // contraria: hay como mucho UNA discrepancia por meta, con la lista de
    // meses en los que aparece.
    const fuera = conMarca.filter((f) => (f.valor === 'si') !== d.cumple)
    coinciden += conMarca.length - fuera.length
    if (!fuera.length) continue

    const guardado = fuera[0].valor
    const meses = fuera.map((f) => f.mes)
    const nombresMeses = listar(meses.map(nombreDe))
    const direccion = guardado === 'si' ? 'de_mas' : 'de_menos'
    const evidencia = evidenciaDeMeta(d)
    discrepancias.push({
      clave, etiqueta: d.etiqueta, corta: d.corta,
      guardado, calculado: d.cumple, direccion,
      meses, nombresMeses, celdas: fuera.length,
      valor: d.valor, meta: d.meta, evidencia,
      titulo: `El registro dice «${PALABRA[guardado]}» y el cálculo dice «${PALABRA[guardado === 'si' ? 'no' : 'si']}»`,
      // La regla sólo se explica cuando la evidencia nombra un mes concreto
      // (deserción y cobranza traen `peorMes`): es ahí donde el lector ve un
      // mes acusado y otro citado, y necesita saber por qué no se contradicen.
      detalle: `${nombresMeses}: la casilla guardada dice «${PALABRA[guardado]}».`
        + `${d.peorMes ? ` ${REGLA_TRIMESTRAL}` : ''} ${evidencia}`,
    })
  }

  return {
    disponible: true,
    discrepancias,
    noVerificables,
    // Tres números distintos que antes se confundían en pantalla:
    // `casos`  = una meta discrepante (lo que se le enseña a una persona).
    // `celdas` = celdas meta × mes (lo que reescribe el backfill, columna a columna).
    // `filas`  = filas de `cumplimiento` tocadas. NO es la suma de `celdas`: tres
    //   metas discrepantes en un mismo mes son 3 celdas y UNA sola fila. La
    //   píldora del panel decía "filas" mostrando `celdas` y sobrecontaba hasta
    //   3×, en la única alerta cuyo tema es que los números no son de fiar.
    casos: discrepancias.length,
    celdas: discrepancias.reduce((total, d) => total + d.celdas, 0),
    filas: new Set(discrepancias.flatMap((d) => d.meses || [])).size,
    marcadas,
    coinciden,
  }
}

// Índice por clave para la pantalla de Cumplimiento, que dibuja el aviso
// pegado a cada meta y no quiere recorrer el arreglo tres veces.
export function discrepanciasPorClave(comparacion) {
  const out = {}
  for (const d of comparacion?.discrepancias || []) out[d.clave] = d
  return out
}

// ── RESUMEN PARA EL SUPERVISOR ──────────────────────────────────────────────
// `centros` = [{ centroId, centro, comparacion }]. Devuelve el agregado y el
// titular.
//
// UNA ENTRADA NO ES UN CENTRO. Con el llamador del panel (una entrada por
// centro, un solo trimestre) daba igual, pero al alimentar esta misma función
// con todos los trimestres —una entrada por centro-trimestre, que es la lectura
// natural del nombre del parámetro— el titular decía "en 23 centros" existiendo
// seis. Se cuentan `centroId` distintos.
export function resumenDiscrepancias(centros = []) {
  const conDiscrepancia = (centros || [])
    .map((c) => ({ ...c, comparacion: c?.comparacion || null }))
    .filter((c) => (c.comparacion?.discrepancias || []).length)

  const todas = conDiscrepancia.flatMap((c) => c.comparacion.discrepancias)
  const porMeta = {}
  for (const d of todas) porMeta[d.corta] = (porMeta[d.corta] || 0) + 1

  const casos = todas.length
  const celdas = todas.reduce((total, d) => total + d.celdas, 0)
  // Filas de `cumplimiento` afectadas, no celdas: la misma fila puede traer las
  // 3 metas discrepantes. Se desduplica por centro + mes.
  const filas = new Set(conDiscrepancia.flatMap((c) =>
    (c.comparacion.discrepancias || []).flatMap((d) => (d.meses || []).map((mes) => `${c.centroId}:${mes}`))
  )).size
  const deMas = todas.filter((d) => d.direccion === 'de_mas').length
  const nCentros = new Set(conDiscrepancia.map((c) => c.centroId)).size
  const noVerificables = (centros || [])
    .reduce((total, c) => total + (c?.comparacion?.noVerificables?.length || 0), 0)

  return {
    // MARCAS QUE NO SE PUEDEN CONTRASTAR TAMBIÉN LEVANTAN LA TARJETA. Antes
    // `hay` sólo miraba las discrepancias, así que un trimestre sin datos con
    // las 3 metas marcadas a mano devolvía hay:false y el aviso no se dibujaba:
    // el bloque que las reportaba era código inalcanzable. Ese es justo el caso
    // peligroso —una marca heredada sobre un trimestre que el sistema no puede
    // juzgar—, así que se dice, en tono informativo y sin píldora de alerta.
    hay: casos > 0 || noVerificables > 0,
    soloNoVerificables: casos === 0 && noVerificables > 0,
    casos, celdas, filas, deMas, deMenos: casos - deMas,
    centros: nCentros,
    porMeta,
    noVerificables,
    detalle: conDiscrepancia,
    titular: casos === 0 ? '' : `${casos} ${casos === 1 ? 'meta guardada no coincide' : 'metas guardadas no coinciden'} con el cálculo en ${nCentros} ${nCentros === 1 ? 'centro' : 'centros'}.`,
    // El desglose por dirección va SIEMPRE a la vista: un reparto mitad y mitad
    // se lee como despiste; uno cargado a un solo lado, no. Que el número lo
    // diga el sistema y no el que lo mira.
    reparto: `${deMas} ${deMas === 1 ? 'guardada' : 'guardadas'} como «Sí» que el cálculo da en «No» · ${casos - deMas} al revés.`,
  }
}
