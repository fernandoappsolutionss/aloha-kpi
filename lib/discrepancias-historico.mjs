// EL BARRIDO COMPLETO — todas las metas guardadas, de todos los trimestres.
//
// EL PROBLEMA QUE CIERRA. La tarjeta de discrepancias del panel leía SÓLO el
// trimestre seleccionado, y ese trimestre sale de `readStoredPeriod()`, que lo
// lee de localStorage ('ts_period') compartido con Panel, Ranking, Reporte y la
// pantalla del centro. O sea: de las 90 discrepancias, se dibujaban las 10 del
// trimestre en curso; las otras 80 eran invisibles salvo que alguien retrocediera
// trimestre por trimestre. Y si el supervisor había mirado 2025-Q2 en Ranking, al
// abrir Alertas la tarjeta arrancaba ahí y mostraba 3 en vez de 10.
//
// Eso es un descarte persistente en el navegador con otro nombre, y es
// exactamente lo que test/responsive-ui.test.mjs declara prohibido para las
// otras dos alertas. Fernando: "la alerta debe mantenerse hasta que se corrijan
// los datos". Este módulo hace que el número que se enseña NO dependa de ningún
// selector: barre todos los trimestres que tienen filas en `cumplimiento`.
//
// UNA SOLA DEFINICIÓN DE "DISCREPANCIA". El barrido no reimplementa la
// comparación: llama a `compararMetas` de lib/discrepancias-metas.mjs, la misma
// que usa la tarjeta del trimestre y la pantalla del centro. Y evalúa el
// trimestre con `evaluarTrimestre`, la misma función que usa
// scripts/backfill-metas-cumplimiento-2026-09-05.mjs para decidir qué corrige —
// así el aviso desaparece EXACTAMENTE cuando la fila se corrige, que es la
// única forma de que una alerta que no se puede descartar sea honesta.
//
// Módulo PURO: sin BD, sin React. Recibe las filas ya consultadas (la lectura
// vive en app/actions/cumplimiento.js) y se testea con `npm test`.

import { compararMetas } from './discrepancias-metas.mjs'
import { evaluarProducto, mesesProducto } from './marcadores.mjs'
import { quarterMetrics } from './kpi-calc.js'
import { Q_MONTHS } from './period.js'

const num = (valor, porDefecto = 0) => {
  const n = Number(valor)
  return Number.isFinite(n) ? n : porDefecto
}

// Verdicto de PRODUCTO de un (centro, año, trimestre) a partir de las filas
// crudas de resumen_mes + kpi_semanas + metas.
//
// Se omite a propósito la superposición viva de meses abiertos que sí hace
// getCentroResumen: el histórico que se audita está cerrado, y el mes en curso
// entra con su peso prorrateado (`pesoMes`) igual que en la pantalla. Es la
// misma decisión —y el mismo código— del backfill: dos criterios distintos
// harían que el aviso pidiera corregir algo que el script no corrige.
export function evaluarTrimestre({
  centroId, anio, trimestre, rsAll = [], ksAll = [], metasAll = [], estados = [], hoy,
} = {}) {
  const months = Q_MONTHS[trimestre] || [1, 2, 3]
  const lo = months[0]
  const mismoCentro = (fila) => String(fila.centro_id) === String(centroId)
  const rs = rsAll
    .filter((r) => mismoCentro(r) && num(r.year) === anio && months.includes(num(r.month)))
    .map((r) => ({
      ...r,
      month: num(r.month),
      estado_mes: estados.find((e) =>
        String(e.centro_id) === String(centroId) && num(e.year) === anio && num(e.month) === num(r.month)
      )?.estado || 'abierto',
    }))
  const ks = ksAll
    .filter((k) => mismoCentro(k) && num(k.year) === anio && months.includes(num(k.month)))
    .map((k) => ({ ...k, month: num(k.month) }))
  const py = lo === 1 ? anio - 1 : anio
  const pm = lo === 1 ? 12 : lo - 1
  const previo = rsAll.find((r) => mismoCentro(r) && num(r.year) === py && num(r.month) === pm)
  const cur = quarterMetrics(rs, ks, centroId, months, previo?.ninos_final_mes || 0)
  const mensual = mesesProducto({ months, rs, ks, mesesCalc: cur.months })
  const metas = metasAll.find((m) => num(m.anio) === anio && num(m.trimestre) === trimestre) || null
  return evaluarProducto({ meses: mensual, metas, anio, ...(hoy ? { hoy } : {}) })
}

const etiquetaTrimestre = (anio, trimestre) => `Q${trimestre} ${anio}`

// ── EL BARRIDO ──────────────────────────────────────────────────────────────
// `centros`      [{ id, nombre }] los del alcance de quien mira.
// `trimestres`   [{ id, centro_id, anio, trimestre }] tabla `trimestres`.
// `cumplimiento` [{ trimestre_id, mes, meta_* }] filas crudas, sin `|| 'no'`.
// `rsAll` `ksAll` `metasAll` `estados`  las tablas de apoyo, ya filtradas.
//
// Devuelve el agregado de TODOS los trimestres con filas, más el desglose por
// trimestre y por centro. Nunca lanza: un trimestre que no se puede evaluar
// cae en `noVerificables`, jamás en discrepancias.
export function barrerHistorico({
  centros = [], trimestres = [], cumplimiento = [],
  rsAll = [], ksAll = [], metasAll = [], estados = [], hoy,
} = {}) {
  const nombreDe = new Map(centros.map((c) => [String(c.id), c.nombre]))
  const enAlcance = new Set(centros.map((c) => String(c.id)))
  const triById = new Map(trimestres.map((t) => [String(t.id), t]))

  // Filas agrupadas por (centro, año, trimestre). Una fila huérfana —sin su
  // trimestre— se cuenta aparte: es un dato roto, no una discrepancia.
  const porTrimestre = new Map()
  let huerfanas = 0
  for (const fila of cumplimiento) {
    const t = triById.get(String(fila.trimestre_id))
    if (!t || !enAlcance.has(String(t.centro_id))) { if (!t) huerfanas++; continue }
    const clave = `${t.centro_id}|${num(t.anio)}|${num(t.trimestre)}`
    if (!porTrimestre.has(clave)) {
      porTrimestre.set(clave, {
        centroId: t.centro_id, centro: nombreDe.get(String(t.centro_id)) || `Centro ${t.centro_id}`,
        anio: num(t.anio), trimestre: num(t.trimestre), filas: [],
      })
    }
    porTrimestre.get(clave).filas.push({ ...fila, mes: num(fila.mes) })
  }

  const detalle = []
  for (const grupo of porTrimestre.values()) {
    const producto = evaluarTrimestre({
      centroId: grupo.centroId, anio: grupo.anio, trimestre: grupo.trimestre,
      rsAll, ksAll, metasAll, estados, hoy,
    })
    const comparacion = compararMetas({
      producto,
      filas: grupo.filas,
      mesesDelTrimestre: Q_MONTHS[grupo.trimestre] || [],
    })
    detalle.push({
      centroId: grupo.centroId, centro: grupo.centro,
      anio: grupo.anio, trimestre: grupo.trimestre,
      etiqueta: etiquetaTrimestre(grupo.anio, grupo.trimestre),
      comparacion,
    })
  }

  const conDiscrepancia = detalle.filter((d) => d.comparacion.discrepancias.length)
  const todas = conDiscrepancia.flatMap((d) => d.comparacion.discrepancias)
  const casos = todas.length
  const celdas = todas.reduce((total, d) => total + d.celdas, 0)
  // Filas de la base: centro + trimestre + mes. Tres metas discrepantes en el
  // mismo mes son 3 celdas y UNA fila.
  const filas = new Set(conDiscrepancia.flatMap((d) =>
    d.comparacion.discrepancias.flatMap((x) => (x.meses || []).map((mes) =>
      `${d.centroId}:${d.anio}:${d.trimestre}:${mes}`))
  )).size
  const deMas = todas.filter((d) => d.direccion === 'de_mas').length
  const nCentros = new Set(conDiscrepancia.map((d) => String(d.centroId))).size
  const noVerificables = detalle.reduce((total, d) => total + d.comparacion.noVerificables.length, 0)

  // Desglose por trimestre, del más reciente al más viejo: el trimestre en
  // curso es el que todavía se puede corregir a tiempo.
  const trimestral = new Map()
  for (const d of conDiscrepancia) {
    const clave = `${d.anio}|${d.trimestre}`
    if (!trimestral.has(clave)) {
      trimestral.set(clave, {
        anio: d.anio, trimestre: d.trimestre, etiqueta: d.etiqueta,
        casos: 0, celdas: 0, centros: new Set(), filas: new Set(),
      })
    }
    const acc = trimestral.get(clave)
    acc.centros.add(String(d.centroId))
    for (const x of d.comparacion.discrepancias) {
      acc.casos++
      acc.celdas += x.celdas
      for (const mes of x.meses || []) acc.filas.add(`${d.centroId}:${mes}`)
    }
  }
  const porTrimestreLista = [...trimestral.values()]
    .map((t) => ({ ...t, centros: t.centros.size, filas: t.filas.size }))
    .sort((a, b) => b.anio - a.anio || b.trimestre - a.trimestre)

  const porCentro = new Map()
  for (const d of conDiscrepancia) {
    const clave = String(d.centroId)
    if (!porCentro.has(clave)) {
      porCentro.set(clave, { centroId: d.centroId, centro: d.centro, casos: 0, celdas: 0, trimestres: 0 })
    }
    const acc = porCentro.get(clave)
    acc.trimestres++
    for (const x of d.comparacion.discrepancias) { acc.casos++; acc.celdas += x.celdas }
  }
  const porCentroLista = [...porCentro.values()].sort((a, b) => b.casos - a.casos || String(a.centro).localeCompare(String(b.centro), 'es'))

  return {
    disponible: true,
    hay: casos > 0,
    casos, celdas, filas,
    centros: nCentros,
    centrosMirados: centros.length,
    trimestres: porTrimestreLista.length,
    trimestresMirados: detalle.length,
    deMas, deMenos: casos - deMas,
    noVerificables,
    huerfanas,
    porTrimestre: porTrimestreLista,
    porCentro: porCentroLista,
    detalle: conDiscrepancia,
    titular: casos === 0
      ? ''
      : `${casos} ${casos === 1 ? 'meta guardada no coincide' : 'metas guardadas no coinciden'} con el cálculo`
        + `, en ${filas} ${filas === 1 ? 'fila' : 'filas'} de ${nCentros} ${nCentros === 1 ? 'centro' : 'centros'}`
        + ` y ${porTrimestreLista.length} ${porTrimestreLista.length === 1 ? 'trimestre' : 'trimestres'}.`,
    // El reparto por dirección va SIEMPRE: un error mitad y mitad se lee como
    // despiste; uno cargado a un solo lado, no. Que lo diga el sistema.
    reparto: `${deMas} ${deMas === 1 ? 'guardada' : 'guardadas'} como «Sí» que el cálculo da en «No» · ${casos - deMas} al revés.`,
  }
}
