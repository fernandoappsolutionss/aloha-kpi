// Retiro guiado por asistencia (R5, g1-24) — servicio server-only.
// Módulo server-only (usa sql/withTransaction; el repo no usa el paquete
// 'server-only', así que la regla es esta línea): se importa desde el route
// del cron (auth por CRON_SECRET) y desde server actions (auth por sesión),
// NUNCA desde componentes de cliente.
//
// ejecutarRetiroEn es EL retiro: ficha + evento + outbox con la conexión de la
// transacción que se le pase. Lo comparten retirarEstudiante (acción), el cron
// de retiros programados y cerrarMes (la reconciliación g2-4): un solo camino,
// cero retiros a medias.
import { sql, withTransaction } from './db'
import { fechaIso10 } from './operaciones'
import { encolarSyncCrm } from './llenado-service'
import { bloquearMesesEditables } from './mes-kpi'

const ym = (fecha) => {
  const [y, m] = String(fecha).split('-').map(Number)
  return { year: y, month: m }
}

// Ejecuta UN retiro con la conexión dada (el `query` de withTransaction, o
// `sql` si el caller ya garantiza atomicidad por fuera — no lo hace nadie hoy).
// El caller es responsable de: bloquear el mes de `fecha`, tener al estudiante
// bajo FOR UPDATE y haber validado la evidencia de asistencia (g1-23).
// Escribe ficha (estado, motivo, fecha_retiro, LIMPIA retiro_programado_para —
// el CHECK de coherencia exige limpiar en el mismo statement), evento 'retiro'
// con year/month de la FECHA LÓGICA (jamás el día físico de ejecución) y
// encola el sync de cupos al CRM en la misma transacción.
export async function ejecutarRetiroEn(query, { estudiante, centroId, motivo, fecha, detalle = null }) {
  const { year, month } = ym(fecha)
  const now = new Date().toISOString()
  await query`
    UPDATE estudiantes SET estado = 'retirado', status_plataforma = 'DESACTIVAR', motivo_retiro = ${motivo},
      fecha_retiro = ${fecha}, retiro_programado_para = NULL, updated_at = ${now}
    WHERE id = ${estudiante.id}
  `
  await query`
    INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, de_grupo_id, motivo, detalle)
    VALUES (${estudiante.id}, ${centroId}, 'retiro', ${year}, ${month}, ${fecha}, ${estudiante.grupo_id}, ${motivo},
      ${detalle ? JSON.stringify(detalle) : null})
  `
  if (estudiante.grupo_id) await encolarSyncCrm([estudiante.grupo_id], 'retiro', query)
}

// Fase del cron (g1-24): ejecuta los retiros programados vencidos
// (retiro_programado_para <= hoy). Una transacción POR NIÑO con el orden de
// locks del repo (mes_kpi → estudiantes) y FOR UPDATE SKIP LOCKED sobre la
// fila re-verificada: dos corridas concurrentes jamás retiran dos veces, y un
// niño trabado por otra transacción queda para la próxima pasada.
// - fecha del evento = retiro_programado_para (el cron atrasado NO usa el día
//   físico; created_at del evento conserva cuándo corrió).
// - Mes lógico CERRADO ⇒ jamás un evento nuevo: la fila queda intacta y se
//   reporta en `reparacion` para reparación manual (patrón antes/después de
//   g2-4; la reconciliación de cerrarMes hace este caso excepcional).
// - Bajas legacy (baja_potencial SIN fecha programada) NO entran al cron: se
//   listan en `legacy` para decisión humana — nada se les inventa.
// El reporte va con ids y contadores, sin nombres (misma regla del cron).
export async function procesarRetirosProgramados({ hoyIso, limite = 200, budgetMs = null } = {}) {
  const inicio = Date.now()
  const sinTiempo = () => budgetMs != null && Date.now() - inicio >= budgetMs
  const resumen = { ejecutados: 0, omitidos: 0, reparacion: [], legacy: [], porCentro: {} }

  const legacy = await sql`
    SELECT id, centro_id FROM estudiantes
    WHERE estado = 'baja_potencial' AND retiro_programado_para IS NULL
    ORDER BY id
  `
  resumen.legacy = legacy.map((f) => ({ estudianteId: f.id, centroId: f.centro_id }))

  const candidatos = await sql`
    SELECT id, centro_id, retiro_programado_para FROM estudiantes
    WHERE estado = 'baja_potencial' AND retiro_programado_para IS NOT NULL
      AND retiro_programado_para <= ${hoyIso}
    ORDER BY id
    LIMIT ${limite}
  `

  for (const c of candidatos) {
    if (sinTiempo()) { resumen.omitidos += 1; continue }
    const fechaLogica = fechaIso10(c.retiro_programado_para)
    const { year, month } = ym(fechaLogica)
    try {
      const r = await withTransaction(async (query) => {
        // El mes LÓGICO primero (orden mes_kpi → estudiantes). Cerrado ⇒
        // reparación manual, sin tocar la fila; 'cerrando' ⇒ transitorio, la
        // próxima corrida lo reintenta.
        const [mes] = await query`
          SELECT estado FROM mes_kpi
          WHERE centro_id = ${c.centro_id} AND year = ${year} AND month = ${month}
        `
        if (mes?.estado === 'cerrado') {
          return { reparacion: { estudianteId: c.id, centroId: c.centro_id, fecha: fechaLogica } }
        }
        const errorMes = await bloquearMesesEditables(query, c.centro_id, [{ year, month }])
        if (errorMes) return { skip: true } // cerrándose en paralelo: mañana
        // Re-verificación bajo lock (SKIP LOCKED): la fila debe seguir siendo
        // EXACTAMENTE la programación que listamos — si la cancelaron, la
        // reprogramaron o ya la retiró otro, no hay nada que hacer aquí.
        const [est] = await query`
          SELECT * FROM estudiantes
          WHERE id = ${c.id} AND centro_id = ${c.centro_id} AND estado = 'baja_potencial'
            AND retiro_programado_para = ${fechaLogica}::date
            AND retiro_programado_para <= ${hoyIso}
          FOR UPDATE SKIP LOCKED
        `
        if (!est) return { skip: true }
        // El motivo vive en el evento de programación (obligatorio en
        // programarRetiro); un evento perdido no frena el retiro: OTRO.
        const [evProg] = await query`
          SELECT motivo FROM estudiante_eventos
          WHERE estudiante_id = ${est.id} AND tipo = 'retiro_programado'
          ORDER BY id DESC LIMIT 1
        `
        await ejecutarRetiroEn(query, {
          estudiante: est,
          centroId: est.centro_id,
          motivo: evProg?.motivo || 'OTRO',
          fecha: fechaLogica,
          detalle: { origen: 'cron_retiro_programado', programado_para: fechaLogica },
        })
        return { ejecutado: { centroId: est.centro_id } }
      })
      if (r?.ejecutado) {
        resumen.ejecutados += 1
        const key = String(r.ejecutado.centroId)
        resumen.porCentro[key] = (resumen.porCentro[key] || 0) + 1
      } else if (r?.reparacion) {
        resumen.reparacion.push(r.reparacion)
      } else {
        resumen.omitidos += 1
      }
    } catch (e) {
      // Un niño fallido (deadlock, aborto SERIALIZABLE) no frena a los demás:
      // queda programado y la próxima corrida lo reintenta.
      console.error(`cron retiros: falló el estudiante ${c.id}:`, e)
      resumen.omitidos += 1
    }
  }
  return resumen
}
