// GET /api/cron/llenado — cron diario del llenado (vercel.json: 0 10 * * * UTC
// ≈ 5am Panamá). Tres fases con presupuesto de tiempo compartido:
//   1) detectarTransicionesVentana por CENTRO, con try/catch por centro — el
//      fallo de uno NO aborta a los demás (corrección Sol, tests gate 2).
//   1b) retiros PROGRAMADOS vencidos (R5, g1-24): una transacción por niño con
//      FOR UPDATE SKIP LOCKED y re-verificación; el evento lleva la fecha
//      LÓGICA (retiro_programado_para — el cron atrasado no usa el día
//      físico); mes lógico cerrado ⇒ nada se escribe y la fila se reporta como
//      requiere_reparacion; bajas legacy sin fecha quedan excluidas y listadas
//      para decisión humana. Corre ANTES del outbox para que sus syncs de
//      cupos se empujen en esta misma corrida.
//   2) procesarOutbox global (el claim con SKIP LOCKED ya serializa) con el
//      presupuesto restante; lo que no alcance queda pendiente para mañana.
// Auth fail-closed por CRON_SECRET: sin secreto configurado el endpoint
// responde 401 SIEMPRE (defecto 14) — Vercel manda "Authorization: Bearer
// ${CRON_SECRET}" solo cuando la variable existe en el proyecto. El gate vive
// en lib/cron-auth.mjs (puro) para probarse en espejo con Request real. Nunca
// se invocan server actions con cookie desde aquí: la lógica vive en el
// servicio server-only lib/llenado-service.js.
import { sql } from '../../../../lib/db'
import { hoyISO } from '../../../../lib/operaciones'
import { rechazoCron } from '../../../../lib/cron-auth.mjs'
import { detectarTransicionesVentana, pendientesPorCentro, procesarOutbox } from '../../../../lib/llenado-service'
import { procesarRetirosProgramados } from '../../../../lib/retiros-service'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

// Margen para responder antes de que Vercel corte la función.
const MARGEN_MS = 20000

export async function GET(request) {
  const rechazo = rechazoCron(request, process.env.CRON_SECRET)
  if (rechazo) return rechazo

  const inicio = Date.now()
  const budgetTotal = maxDuration * 1000 - MARGEN_MS
  const restante = () => budgetTotal - (Date.now() - inicio)
  const hoy = hoyISO()

  // El reporte va por centro y SIN datos sensibles: ids y contadores, nada de
  // nombres de niños ni errores crudos (el detalle queda en los logs).
  const porCentro = {}
  const filaDe = (key) =>
    porCentro[key] || (porCentro[key] = { transiciones: 0, encoladas: 0, procesadas: 0, fallidas: 0, pendientes: 0 })

  // Fase 1: detección de transiciones de ventana, centro por centro.
  const centros = await sql`SELECT id FROM centros ORDER BY id`
  for (const c of centros) {
    const fila = filaDe(String(c.id))
    if (restante() <= 0) { fila.omitido = true; continue }
    try {
      const det = await detectarTransicionesVentana(hoy, { centroId: c.id })
      fila.transiciones = det.transiciones
      fila.encoladas = det.encoladas
    } catch (e) {
      console.error(`cron llenado: detección falló en centro ${c.id}:`, e)
      fila.error = 'deteccion_fallida'
    }
  }

  // Fase 1b: retiros programados vencidos (R5, g1-24). Fail-soft: si la fase
  // completa revienta, el reporte lo dice y las filas quedan programadas para
  // la próxima corrida — jamás un retiro a medias (transacción por niño).
  let retiros = { ejecutados: 0, omitidos: 0, reparacion: [], legacy: [], porCentro: {} }
  try {
    retiros = await procesarRetirosProgramados({ hoyIso: hoy, budgetMs: Math.max(0, restante()) })
    for (const [key, n] of Object.entries(retiros.porCentro || {})) filaDe(key).retiros = n
  } catch (e) {
    console.error('cron llenado: retiros programados fallaron:', e)
    retiros.error = 'retiros_fallidos'
  }

  // Fase 2: consumo del outbox con el presupuesto que quede.
  let consumo = { procesadas: 0, fallidas: 0, pendientes: 0, porCentro: {} }
  try {
    consumo = await procesarOutbox({ budgetMs: Math.max(0, restante()) })
    for (const [key, r] of Object.entries(consumo.porCentro || {})) {
      const fila = filaDe(key)
      fila.procesadas = r.procesadas
      fila.fallidas = r.fallidas
    }
  } catch (e) {
    console.error('cron llenado: consumo del outbox falló:', e)
  }

  // Pendientes que quedaron para la próxima corrida, atribuidas por centro.
  try {
    for (const [key, n] of Object.entries(await pendientesPorCentro())) filaDe(key).pendientes = n
  } catch (e) {
    console.error('cron llenado: conteo de pendientes falló:', e)
  }

  return Response.json({
    ok: true,
    hoy,
    duracionMs: Date.now() - inicio,
    procesadas: consumo.procesadas,
    fallidas: consumo.fallidas,
    pendientes: consumo.pendientes,
    warn: consumo.warn,
    // Retiros programados (R5): contadores e ids, sin nombres. `reparacion`
    // lista los retiros cuyo mes lógico ya está CERRADO (reparación manual,
    // patrón antes/después de g2-4); `legacy` las bajas sin fecha programada
    // que NO entran al cron (decisión humana).
    retiros: {
      ejecutados: retiros.ejecutados,
      omitidos: retiros.omitidos,
      requierenReparacion: retiros.reparacion,
      legacy: retiros.legacy,
      error: retiros.error,
    },
    porCentro,
  })
}
