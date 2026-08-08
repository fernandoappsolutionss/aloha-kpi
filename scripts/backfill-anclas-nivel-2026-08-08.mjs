// Backfill de anclas por niño (R3, g1-12, spec
// docs/superpowers/specs/2026-08-08-remodelado-grupo-nino-design.md; patrón
// manifiesto de scripts/backfill-fecha-inicio-2026-08-08.mjs). PRERREQUISITO
// del rollout paso 3: sin ancla no hay plan por niño.
//
//   node scripts/backfill-anclas-nivel-2026-08-08.mjs           → dry-run:
//     decide el ancla de cada activo/baja_potencial SIN ancla con la cascada
//     estricta de lib/backfill-anclas-nivel.mjs (evento de cambio concordante
//     → inscripción canónica → referencia del grupo; el resto queda
//     sin_resolver/ambiguo — NUNCA inferido). Escribe el MANIFIESTO (fuente +
//     fingerprint por niño, conflictos y no-resueltos) en
//     scripts/out/backfill-anclas-nivel-2026-08-08.json, con la validación de
//     cobertura y el muestreo de posiciones. NO escribe en la BD.
//   node scripts/backfill-anclas-nivel-2026-08-08.mjs --apply   → aplica SOLO
//     el manifiesto del dry-run en UNA transacción SERIALIZABLE (withTransaction
//     de lib/db.js): bloquea las fichas (FOR UPDATE), recalcula cada decisión
//     EN VIVO y compara fingerprints (CAS), escribe las anclas, y re-valida
//     cobertura y muestreo DENTRO de la transacción. Cualquier conflicto,
//     CAS fallido o alerta ⇒ ROLLBACK TOTAL (ninguna ancla queda escrita).
//
// Cierres manuales preservados (g1-11): este script JAMÁS toca
// fecha_cierre_nivel; solo cuenta cuántos overrides legacy quedan intactos.
//
// Regla de la tarea 2026-08-08: este script queda listo pero NO SE EJECUTA
// contra la base (ni el dry-run) sin decisión explícita de Fernando.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'
import { withTransaction } from '../lib/db.js'
import { fechaPublicacion } from '../lib/fecha-publicacion.mjs'
import {
  MOVIMIENTOS,
  coberturaAnclas,
  decidirAncla,
  estadoAncla,
  fingerprintAncla,
  muestreoPosiciones,
} from '../lib/backfill-anclas-nivel.mjs'

if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.')

const aplicar = process.argv.includes('--apply')
const sql = neon(process.env.DATABASE_URL)
// Día CIVIL de Panamá para el muestreo de posiciones (helper único, g1-3).
const hoy = fechaPublicacion(new Date())
const outDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out')
const rutaManifiesto = path.join(outDir, 'backfill-anclas-nivel-2026-08-08.json')

const TIPOS_ANCLA = ['inscripcion', ...MOVIMIENTOS]

// Copia de paisDe (app/actions/estudiantes.js:31; ese módulo es de Next y no
// se importa desde node puro). Si cambia allá, cambia aquí.
const paisDe = (c) => (c?.pais === 'VE' || (!c?.pais && /naranjos/i.test(c?.nombre || '')) ? 'VE' : 'PA')

// --- Carga común (dry-run con neon; apply re-lee DENTRO de la transacción) ---
// `q` es un tagged-template (neon o el query de withTransaction).
async function cargarUniverso(q, estudianteIds = null) {
  const poblacion = estudianteIds
    ? await q`SELECT * FROM estudiantes WHERE id = ANY(${estudianteIds}) ORDER BY id FOR UPDATE`
    : await q`SELECT * FROM estudiantes WHERE estado IN ('activo', 'baja_potencial') ORDER BY id`
  const ids = poblacion.map((e) => Number(e.id))
  const eventos = ids.length
    ? await q`
        SELECT * FROM estudiante_eventos
        WHERE estudiante_id = ANY(${ids}) AND tipo = ANY(${TIPOS_ANCLA})
        ORDER BY estudiante_id, fecha, id
      `
    : []
  const grupoIds = [...new Set(poblacion.map((e) => e.grupo_id).filter((g) => g != null).map(Number))]
  const grupos = grupoIds.length ? await q`SELECT * FROM grupos WHERE id = ANY(${grupoIds})` : []
  const horarios = grupoIds.length
    ? await q`SELECT grupo_id, dia FROM grupo_horarios WHERE grupo_id = ANY(${grupoIds})`
    : []
  const centros = await q`SELECT id, nombre, pais FROM centros`

  // El calendario versionado necesita los horarios colgados del grupo (mismo
  // armado que ladoPlanDe, app/actions/estudiantes.js).
  const horariosPorGrupo = new Map()
  for (const h of horarios) {
    const key = String(h.grupo_id)
    const lista = horariosPorGrupo.get(key) || []
    lista.push({ dia: h.dia })
    horariosPorGrupo.set(key, lista)
  }
  const gruposPorId = new Map(grupos.map((g) => [String(g.id), { ...g, horarios: horariosPorGrupo.get(String(g.id)) || [] }]))
  const eventosPorNino = new Map()
  for (const e of eventos) {
    const key = String(e.estudiante_id)
    const lista = eventosPorNino.get(key) || []
    lista.push(e)
    eventosPorNino.set(key, lista)
  }
  const paisPorCentro = new Map(centros.map((c) => [Number(c.id), paisDe(c)]))
  return { poblacion, eventosPorNino, gruposPorId, paisPorCentro }
}

// Decide el ancla de cada niño de la población. Devuelve las estructuras del
// manifiesto: candidatas (resueltas con fingerprint), noResueltas, ambiguas.
function decidirTodas({ poblacion, eventosPorNino, gruposPorId }) {
  const decisiones = new Map()
  const candidatas = []
  const noResueltas = []
  const ambiguas = []
  for (const est of poblacion) {
    const eventos = eventosPorNino.get(String(est.id)) || []
    const grupo = est.grupo_id == null ? null : gruposPorId.get(String(est.grupo_id)) || null
    const decision = decidirAncla({ estudiante: est, eventos, grupo })
    decisiones.set(String(est.id), decision)
    const base = {
      estudianteId: Number(est.id),
      centroId: Number(est.centro_id),
      grupoId: est.grupo_id == null ? null : Number(est.grupo_id),
      itinerario: est.itinerario,
      nivel: Number(est.nivel),
      estadoNino: est.estado,
    }
    if (decision.estado === 'resuelta') {
      candidatas.push({
        ...base,
        fuente: decision.fuente,
        ancla: decision.ancla,
        fingerprint: fingerprintAncla(est, eventos, decision),
      })
    } else if (decision.estado === 'ambiguo') {
      ambiguas.push({ ...base, motivo: decision.motivo, detalle: decision.detalle })
    } else if (decision.estado === 'sin_resolver') {
      noResueltas.push({ ...base, motivo: decision.motivo, detalle: decision.detalle })
    }
    // 'ya_tiene' solo cuenta en la cobertura: nada que decidir ni escribir.
  }
  return { decisiones, candidatas, noResueltas, ambiguas }
}

fs.mkdirSync(outDir, { recursive: true })

if (!aplicar) {
  // --- Dry-run: manifiesto + validación, sin tocar la BD ---------------------
  const universo = await cargarUniverso(sql)
  const { decisiones, candidatas, noResueltas, ambiguas } = decidirTodas(universo)
  const cobertura = coberturaAnclas(universo.poblacion, decisiones)
  const entradasMuestreo = universo.poblacion
    .filter((e) => decisiones.get(String(e.id))?.estado === 'resuelta')
    .map((e) => ({ estudiante: e, decision: decisiones.get(String(e.id)) }))
  const muestreo = muestreoPosiciones({
    entradas: entradasMuestreo,
    gruposPorId: universo.gruposPorId,
    paisPorCentro: universo.paisPorCentro,
    hoy,
  })
  const cierresManualesPreservados = universo.poblacion.filter((e) => e.fecha_cierre_nivel != null).length

  const reporte = {
    script: 'backfill-anclas-nivel-2026-08-08',
    modo: 'dry-run',
    generado_at: new Date().toISOString(),
    hoy,
    cobertura,
    cierresManualesPreservados,
    candidatas,
    noResueltas,
    ambiguas,
    muestreo,
  }
  if (muestreo.alertas.length) {
    const ruta = path.join(outDir, 'backfill-anclas-nivel-2026-08-08-dry-run-abortado.json')
    fs.writeFileSync(ruta, JSON.stringify({ ...reporte, ok: false, motivo: 'alertas del muestreo de posiciones' }, null, 2))
    console.error(JSON.stringify({ ok: false, motivo: 'alertas del muestreo de posiciones', alertas: muestreo.alertas, reporte: ruta }, null, 2))
    process.exitCode = 1
  } else {
    fs.writeFileSync(rutaManifiesto, JSON.stringify({ ...reporte, ok: true }, null, 2))
    console.log(JSON.stringify({
      ok: true,
      modo: 'dry-run',
      poblacion: cobertura.poblacion,
      yaTienen: cobertura.yaTienen,
      candidatas: candidatas.length,
      sinResolver: noResueltas.length,
      ambiguas: ambiguas.length,
      coberturaProyectada: cobertura.cobertura,
      muestras: muestreo.muestras.length,
      manifiesto: rutaManifiesto,
    }, null, 2))
  }
} else {
  // --- Apply: UNA transacción, CAS por fingerprint, rollback total -----------
  if (!fs.existsSync(rutaManifiesto)) {
    throw new Error(`No existe el manifiesto ${rutaManifiesto}. Corre primero el dry-run.`)
  }
  const manifiesto = JSON.parse(fs.readFileSync(rutaManifiesto, 'utf8'))
  if (manifiesto.modo !== 'dry-run' || !Array.isArray(manifiesto.candidatas)) {
    throw new Error('El manifiesto no viene de un dry-run de este script.')
  }

  class Aborto extends Error {
    constructor(motivo, datos) {
      super(motivo)
      this.datos = datos
    }
  }

  let resultado
  try {
    resultado = await withTransaction(async (query) => {
      const ids = manifiesto.candidatas.map((c) => Number(c.estudianteId))
      if (!ids.length) return { aplicadas: [], yaAplicadas: [], cobertura: null, muestreo: { muestras: [], alertas: [] } }

      // Fichas BLOQUEADAS + su historia, releídas dentro de la transacción.
      const universo = await cargarUniverso(query, ids)
      const vivosPorId = new Map(universo.poblacion.map((e) => [Number(e.id), e]))

      // CAS: cada decisión se recalcula EN VIVO y su fingerprint debe calzar
      // con el auditado; cualquier deriva (ficha movida, evento nuevo, ancla
      // ajena) aborta la transacción COMPLETA.
      const pendientes = []
      const yaAplicadas = []
      const conflictos = []
      for (const entrada of manifiesto.candidatas) {
        const vivo = vivosPorId.get(Number(entrada.estudianteId)) || null
        const eventos = vivo ? universo.eventosPorNino.get(String(vivo.id)) || [] : []
        const grupo = vivo?.grupo_id == null ? null : universo.gruposPorId.get(String(vivo.grupo_id)) || null
        const decisionViva = vivo ? decidirAncla({ estudiante: vivo, eventos, grupo }) : null
        const fpVivo = vivo ? fingerprintAncla(vivo, eventos, decisionViva) : null
        const estado = estadoAncla(vivo, entrada, fpVivo)
        if (estado === 'pendiente') pendientes.push({ entrada, vivo, decisionViva })
        else if (estado === 'aplicada') yaAplicadas.push(entrada.estudianteId)
        else conflictos.push({ estudianteId: entrada.estudianteId, esperado: entrada, vivo: vivo ? { ancla: vivo.fecha_inicio_nivel, fingerprint: fpVivo } : 'fila_ausente' })
      }
      if (conflictos.length) throw new Aborto('conflictos: la fila viva no coincide con el manifiesto auditado', { conflictos })

      // Escritura con CAS por fila (la ficha completa que sostiene la
      // decisión, no solo el NULL): cualquier fallo ⇒ rollback total.
      const aplicadas = []
      for (const { entrada } of pendientes) {
        const filas = await query`
          UPDATE estudiantes
          SET fecha_inicio_nivel = ${entrada.ancla}, updated_at = now()
          WHERE id = ${entrada.estudianteId}
            AND fecha_inicio_nivel IS NULL
            AND nivel = ${entrada.nivel}
            AND itinerario = ${entrada.itinerario}
            AND estado = ${entrada.estadoNino}
            AND grupo_id IS NOT DISTINCT FROM ${entrada.grupoId}
          RETURNING id
        `
        if (filas.length !== 1) {
          throw new Aborto('CAS fallido al escribir el ancla', { estudianteId: entrada.estudianteId })
        }
        aplicadas.push(entrada.estudianteId)
      }

      // Validación DENTRO de la transacción (ve las anclas recién escritas):
      // cobertura viva + muestreo de posiciones sobre lo aplicado.
      const [conteo] = await query`
        SELECT COUNT(*)::int AS poblacion,
               COUNT(*) FILTER (WHERE fecha_inicio_nivel IS NOT NULL)::int AS con_ancla
        FROM estudiantes
        WHERE estado IN ('activo', 'baja_potencial')
      `
      const cobertura = {
        poblacion: conteo.poblacion,
        conAncla: conteo.con_ancla,
        cobertura: conteo.poblacion ? Math.round((conteo.con_ancla / conteo.poblacion) * 1000) / 10 : 100,
      }
      const muestreo = muestreoPosiciones({
        entradas: pendientes.map(({ vivo, decisionViva }) => ({ estudiante: vivo, decision: decisionViva })),
        gruposPorId: universo.gruposPorId,
        paisPorCentro: universo.paisPorCentro,
        hoy,
      })
      if (muestreo.alertas.length) {
        throw new Aborto('alertas del muestreo de posiciones', { alertas: muestreo.alertas })
      }
      return { aplicadas, yaAplicadas, cobertura, muestreo }
    })
  } catch (error) {
    // ROLLBACK TOTAL ya ocurrió en withTransaction: ninguna ancla quedó escrita.
    const ruta = path.join(outDir, `backfill-anclas-nivel-2026-08-08-apply-abortado-${Date.now()}.json`)
    fs.writeFileSync(ruta, JSON.stringify({
      script: 'backfill-anclas-nivel-2026-08-08',
      modo: 'apply',
      generado_at: new Date().toISOString(),
      ok: false,
      motivo: error.message,
      datos: error.datos || null,
    }, null, 2))
    console.error(JSON.stringify({ ok: false, motivo: error.message, datos: error.datos || null, reporte: ruta }, null, 2))
    process.exitCode = 1
    process.exit()
  }

  const ruta = path.join(outDir, `backfill-anclas-nivel-2026-08-08-apply-${Date.now()}.json`)
  fs.writeFileSync(ruta, JSON.stringify({
    script: 'backfill-anclas-nivel-2026-08-08',
    modo: 'apply',
    generado_at: new Date().toISOString(),
    ok: true,
    aplicadas: resultado.aplicadas,
    yaAplicadas: resultado.yaAplicadas,
    cobertura: resultado.cobertura,
    muestreo: resultado.muestreo,
  }, null, 2))
  console.log(JSON.stringify({
    ok: true,
    modo: 'apply',
    aplicadas: resultado.aplicadas.length,
    yaAplicadas: resultado.yaAplicadas.length,
    de: manifiesto.candidatas.length,
    cobertura: resultado.cobertura,
    muestras: resultado.muestreo.muestras.length,
    reporte: ruta,
  }, null, 2))
}
