// KPI semanal SIN MANOS (R4, g1-16/g1-17/g1-20) — cálculo puro, sin BD.
//
// Desde el gate VENTAS_AUTO_DESDE las filas ing_* (ventas) y des_* (retiros)
// del KPI semanal NO se digitan: salen de los eventos del módulo.
//   - Venta = el PRIMER evento GLOBAL de inscripción de cada niño (por fecha e
//     id) — se elige el canónico ANTES de filtrar por mes u origen (g1-17):
//     una inscripción duplicada de la historia jamás vuelve a contar.
//   - origen = 'traslado' sale de la meta comercial: va en `traslados`
//     (contador aparte), jamás en ing_* (regla de Fernando, CONFIRMADO).
//   - Retiro = los retiros OPERATIVOS del mes (los que descuentan población:
//     el caller los filtra con retirosActivosMes, la misma vara del Cuadro).
//   - Ambos caen en su celda S{semana}/D{día} con el bucket de día hábil civil
//     exacto (lib/bucket-habil, g1-18).
//
// Resultado DISCRIMINADO (g1-20):
//   { estado: 'manual_pre_gate' }                      → mes anterior al gate.
//   { estado: 'auto', ing, des, ingTotal, desTotal,
//     cp, traslados }                                  → cálculo válido
//     (CERO también es auto: sin eventos las matrices van en 0 y bloquean).
//   { estado: 'fallo', mensaje }                       → dato roto: fecha
//     nula/inválida/discordante con year-month. NUNCA se clampa ni se adivina;
//     el consumidor cae a captura manual explícita.

import { bucketDiaHabil } from './bucket-habil.mjs'

export const VENTAS_AUTO_DESDE = 202608

const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

export function usaKpiSemanalAuto(year, month) {
  return (Number(year) * 100) + Number(month) >= VENTAS_AUTO_DESDE
}

// Matriz 5 semanas × 5 días en cero.
const matrizVacia = () => Array.from({ length: 5 }, () => [0, 0, 0, 0, 0])

// Orden canónico de eventos: fecha ascendente (nulos primero) y luego id —
// el mismo criterio de lib/inicios-clase.mjs para el evento de inscripción.
const compararEventos = (a, b) => {
  const porFecha = String(iso10(a?.fecha) || '').localeCompare(String(iso10(b?.fecha) || ''))
  if (porFecha !== 0) return porFecha
  return Number(a?.id || 0) - Number(b?.id || 0)
}

export function calcularKpiSemanalAuto({ year, month, inscripciones = [], retiros = [] } = {}) {
  const y = Number(year)
  const m = Number(month)
  if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) {
    return { estado: 'fallo', mensaje: `Periodo inválido (${year}-${month}).` }
  }
  if (!usaKpiSemanalAuto(y, m)) return { estado: 'manual_pre_gate' }

  const ing = matrizVacia()
  const des = matrizVacia()
  let ingTotal = 0
  let desTotal = 0
  let traslados = 0

  // ── Ventas: primer evento GLOBAL por niño, LUEGO filtro de mes/origen ─────
  const canonicaPorNino = new Map()
  for (const evento of [...inscripciones].sort(compararEventos)) {
    const key = String(evento.estudiante_id)
    if (!canonicaPorNino.has(key)) canonicaPorNino.set(key, evento)
  }
  for (const evento of canonicaPorNino.values()) {
    if (Number(evento.year) !== y || Number(evento.month) !== m) continue
    const fecha = iso10(evento.fecha)
    // El bucket valida fecha civil real Y coincidencia con year/month: nula,
    // inexistente o discordante ⇒ FALLO del cálculo, no clamp (g1-17/g1-18).
    const bucket = bucketDiaHabil(fecha, y, m)
    if (!bucket) {
      return {
        estado: 'fallo',
        mensaje: `La inscripción del estudiante ${evento.estudiante_id} tiene fecha nula, inválida o fuera de ${y}-${String(m).padStart(2, '0')} (${fecha ?? 'sin fecha'}). Corrígela en su ficha.`,
      }
    }
    if (evento.origen === 'traslado') {
      traslados += 1
      continue
    }
    ing[bucket.semana - 1][bucket.dia - 1] += 1
    ingTotal += 1
  }

  // ── Retiros operativos del mes, mismo bucket ──────────────────────────────
  for (const evento of retiros) {
    const fecha = iso10(evento.fecha)
    const bucket = bucketDiaHabil(fecha, y, m)
    if (!bucket) {
      return {
        estado: 'fallo',
        mensaje: `El retiro del estudiante ${evento.estudiante_id} tiene fecha nula, inválida o fuera de ${y}-${String(m).padStart(2, '0')} (${fecha ?? 'sin fecha'}). Repara el evento antes de confiar en el KPI.`,
      }
    }
    des[bucket.semana - 1][bucket.dia - 1] += 1
    desTotal += 1
  }

  return {
    estado: 'auto',
    ing,
    des,
    ingTotal,
    desTotal,
    // cp_matriculados DERIVADO (g1-21): matriculados del mes = ventas contadas
    // (sin traslados). El override manual vive en resumen_mes y manda si existe.
    cp: ingTotal,
    traslados,
  }
}

// Superpone un resultado 'auto' sobre filas con la forma de kpi_semanas
// (g1-16): reemplaza ing_d1..5 y des_d1..5 de las 5 semanas del (centro, mes)
// y conserva cob_* intacto. Las semanas que aún no existen en la tabla se
// agregan con cob en NULL (nada capturado): así el CERO auto también se ve y
// bloquea. Filas de otros centros o meses pasan intactas. No muta la entrada.
export function superponerSemanasAuto(filas, { centroId, year, month, auto } = {}) {
  if (!auto || auto.estado !== 'auto') return filas
  const y = Number(year)
  const m = Number(month)
  const esDelMes = (fila) =>
    (centroId == null || String(fila.centro_id) === String(centroId)) &&
    Number(fila.year) === y && Number(fila.month) === m

  const vistas = new Set()
  const resultado = (filas || []).map((fila) => {
    if (!esDelMes(fila)) return fila
    const s = Number(fila.semana)
    vistas.add(s)
    if (s < 1 || s > 5) return fila
    return {
      ...fila,
      ing_d1: auto.ing[s - 1][0], ing_d2: auto.ing[s - 1][1], ing_d3: auto.ing[s - 1][2], ing_d4: auto.ing[s - 1][3], ing_d5: auto.ing[s - 1][4],
      des_d1: auto.des[s - 1][0], des_d2: auto.des[s - 1][1], des_d3: auto.des[s - 1][2], des_d4: auto.des[s - 1][3], des_d5: auto.des[s - 1][4],
    }
  })
  for (let s = 1; s <= 5; s++) {
    if (vistas.has(s)) continue
    resultado.push({
      centro_id: centroId != null ? Number(centroId) : null,
      year: y,
      month: m,
      semana: s,
      cob_d1: null, cob_d2: null, cob_d3: null, cob_d4: null, cob_d5: null,
      ing_d1: auto.ing[s - 1][0], ing_d2: auto.ing[s - 1][1], ing_d3: auto.ing[s - 1][2], ing_d4: auto.ing[s - 1][3], ing_d5: auto.ing[s - 1][4],
      des_d1: auto.des[s - 1][0], des_d2: auto.des[s - 1][1], des_d3: auto.des[s - 1][2], des_d4: auto.des[s - 1][3], des_d5: auto.des[s - 1][4],
    })
  }
  return resultado
}
