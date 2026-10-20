import { randomUUID } from 'node:crypto'
import { sql, withTransaction } from './db.js'
import { semanaAbierta, sumarDias, zonaHorariaCentro } from './semana-cierre.mjs'
import { cambiarAlineamiento } from './alineamiento-semana.mjs'

export async function cambiarAlineamientoEn(centroId, semanaFin, cambio, { query = sql, transaction, now = new Date() } = {}) {
  const [centro] = await query`SELECT pais FROM centros WHERE id=${centroId}`
  if (!centro || semanaFin !== sumarDias(semanaAbierta(now, zonaHorariaCentro(centro)), -7)) throw new Error('El alineamiento corresponde al plan de la semana actual.')
  const run = transaction || (query === sql ? work => withTransaction(work, { isolationLevel: 'ReadCommitted' }) : work => work(query))
  return run(async q => {
    const [plan] = await q`SELECT id, alineamiento FROM semana_planes WHERE centro_id=${centroId} AND semana_fin=${semanaFin} FOR UPDATE`
    if (!plan) throw new Error('Abre el plan de esta semana antes de agregar partidas.')
    const items = cambiarAlineamiento(plan.alineamiento || [], cambio, randomUUID())
    await q`UPDATE semana_planes SET alineamiento=${JSON.stringify(items)}::jsonb, updated_at=now() WHERE id=${plan.id}`
    return items
  })
}
