// Sincronización de cupos del "grupo por aperturar" hacia el CRM (server-only).
// Cada clase de prueba puede quedar vinculada a un grupo (centro_eventos.grupo_id);
// cuando cambia la matrícula de ese grupo, se empuja el bloque `aloha_group`
// actualizado al evento del CRM para que ventas vea los cupos reales.
// Best effort: si el CRM falla, el flujo local NUNCA se rompe (devuelve warn).
import { sql } from './db'
import { crmCall } from './crm'
import { NINOS_POR_GRUPO_MODELO, horarioTextoDe } from './modelo'

// Arma el bloque `aloha_group` del contrato del CRM para un grupo del centro:
// { numero, centro, horario, cupos_total, cupos_disponibles, actualizado_at }.
// Devuelve null si el grupo no existe o no pertenece al centro.
export async function armarAlohaGroup(centroId, grupoId) {
  const [g] = await sql`
    SELECT g.id, g.numero, g.inscripcion_abierta, c.nombre AS centro,
      (SELECT COUNT(*)::int FROM estudiantes e
        WHERE e.grupo_id = g.id AND e.estado IN ('activo', 'baja_potencial')) AS ninos
    FROM grupos g JOIN centros c ON c.id = g.centro_id
    WHERE g.id = ${grupoId} AND g.centro_id = ${centroId}
  `
  if (!g) return null
  const horarios = await sql`
    SELECT dia, hora_inicio, hora_fin FROM grupo_horarios
    WHERE grupo_id = ${grupoId} ORDER BY dia, hora_inicio
  `
  return {
    numero: String(g.numero),
    centro: g.centro || '',
    horario: horarioTextoDe(horarios),
    cupos_total: NINOS_POR_GRUPO_MODELO,
    // Grupo cerrado a inscripciones = 0 cupos para ventas, aunque tenga espacio.
    cupos_disponibles: g.inscripcion_abierta === false ? 0 : Math.max(0, NINOS_POR_GRUPO_MODELO - g.ninos),
    actualizado_at: new Date().toISOString(),
  }
}

// Timeout corto de los pushes best-effort: el loop es serial y corre dentro de
// inscribir/retirar/fusionar — con N eventos vinculados el peor caso queda acotado.
const PUSH_TIMEOUT_MS = 5000

// Recalcula los cupos del grupo y los empuja a TODOS los eventos del centro
// vinculados a él. Nunca lanza: los actions lo llaman tras inscribir/retirar/
// reincorporar/fusionar/cambiar de grupo sin arriesgar su { ok } (el CRM se
// corrige en el próximo push).
export async function pushCuposAlCrm(centroId, grupoId) {
  try {
    if (!grupoId) return { ok: true }
    const eventos = await sql`
      SELECT crm_event_id FROM centro_eventos
      WHERE centro_id = ${centroId} AND grupo_id = ${grupoId}
    `
    if (!eventos.length) return { ok: true }
    const aloha_group = await armarAlohaGroup(centroId, grupoId)
    if (!aloha_group) return { ok: true }
    let warn = null
    for (const ev of eventos) {
      const res = await crmCall('update_event', { event_id: ev.crm_event_id, event: { aloha_group } }, { timeoutMs: PUSH_TIMEOUT_MS })
      if (res.error) warn = res.error
    }
    return warn ? { warn } : { ok: true }
  } catch (e) {
    return { warn: e.message }
  }
}

// Al cerrar o fusionar un grupo, las clases de prueba que apuntaban a él quedan
// sin grupo (centro_eventos.grupo_id = NULL) y el CRM recibe aloha_group = null,
// para que ventas no siga viendo cupos de un grupo que ya no existe operativamente.
// Mismo patrón best effort: nunca lanza ni rompe el { ok } del action.
export async function desvincularGrupoEnEventos(centroId, grupoId) {
  try {
    if (!grupoId) return { ok: true }
    const eventos = await sql`
      UPDATE centro_eventos SET grupo_id = NULL
      WHERE centro_id = ${centroId} AND grupo_id = ${grupoId}
      RETURNING crm_event_id
    `
    if (!eventos.length) return { ok: true }
    let warn = null
    for (const ev of eventos) {
      const res = await crmCall('update_event', { event_id: ev.crm_event_id, event: { aloha_group: null } }, { timeoutMs: PUSH_TIMEOUT_MS })
      if (res.error) warn = res.error
    }
    return warn ? { warn } : { ok: true }
  } catch (e) {
    return { warn: e.message }
  }
}
