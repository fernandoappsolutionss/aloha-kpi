// Backfill de Cobranza Vencida desde Zoho Books para un mes completo.
// Reconstruye el conteo diario (lunes-viernes) y escribe kpi_semanas.
//
//   node scripts/backfill-cobranza-zoho.mjs 2026 8 [--dry]
//
// Necesita DATABASE_URL y ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET /
// ZOHO_REFRESH_TOKEN en el entorno (.env.local).
//
// Aproximación histórica: una factura estaba vencida el día D si
// due_date < D y (sigue sin pagar, o se pagó en D o después según
// last_payment_date). Se descargan las no-pagadas con vencimiento hasta fin
// de mes + las pagadas modificadas desde el inicio del mes. Respeta meses
// cerrados (mes_kpi.estado = 'cerrado').
import { neon } from '@neondatabase/serverless'
import { ORGS_ZOHO, clasificarCentro, semanaDiaKpi, vencidaElDia, listarFacturas } from '../lib/zoho-cobranza.mjs'

const [year, month] = [Number(process.argv[2]), Number(process.argv[3])]
const dry = process.argv.includes('--dry')
if (!year || !month) {
  console.error('Uso: node scripts/backfill-cobranza-zoho.mjs <year> <month> [--dry]')
  process.exit(1)
}

const sql = neon(process.env.DATABASE_URL)
const mm = String(month).padStart(2, '0')
const finMes = new Date(Date.UTC(year, month, 0)).getUTCDate()
const hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' })

// Días laborables del mes (hasta hoy si el mes está en curso).
const dias = []
for (let d = 1; d <= finMes; d++) {
  const iso = `${year}-${mm}-${String(d).padStart(2, '0')}`
  if (iso > hoy) break
  if (semanaDiaKpi(iso)) dias.push(iso)
}

const conteo = {} // centroId -> { iso -> n }
const sinClasificar = []
for (const org of ORGS_ZOHO) {
  const unpaid = await listarFacturas(org.orgId, { status: 'unpaid', due_date_end: `${year}-${mm}-${finMes}` })
  const paid = await listarFacturas(org.orgId, {
    status: 'paid',
    due_date_end: `${year}-${mm}-${finMes}`,
    last_modified_time: `${year}-${mm}-01T00:00:00-0500`,
  })
  for (const inv of [...unpaid, ...paid]) {
    const centroId = clasificarCentro(org, inv)
    if (centroId === null) {
      sinClasificar.push({ org: org.nombre, invoice: inv.invoice_number, ref: inv.reference_number })
      continue
    }
    conteo[centroId] = conteo[centroId] || {}
    for (const iso of dias) {
      if (vencidaElDia(inv, iso)) conteo[centroId][iso] = (conteo[centroId][iso] || 0) + 1
    }
  }
  for (const c of org.centros) { conteo[c.centroId] = conteo[c.centroId] || {} }
}

for (const [centroIdStr, porDia] of Object.entries(conteo)) {
  const centroId = Number(centroIdStr)
  const [mes] = await sql`SELECT estado FROM mes_kpi WHERE centro_id = ${centroId} AND year = ${year} AND month = ${month}`
  if (mes?.estado === 'cerrado') {
    console.log(`centro ${centroId}: mes cerrado, no se toca`)
    continue
  }
  // Agrupa por semana y escribe las 5 casillas de cada semana con datos.
  const semanas = {}
  for (const iso of dias) {
    const { semana, dia } = semanaDiaKpi(iso)
    semanas[semana] = semanas[semana] || {}
    semanas[semana][dia] = porDia[iso] || 0
  }
  for (const [semana, porDiaSem] of Object.entries(semanas)) {
    const v = (d) => porDiaSem[d] ?? 0
    console.log(`centro ${centroId} semana ${semana}:`, [v(1), v(2), v(3), v(4), v(5)].join(','))
    if (dry) continue
    const escribe = (d) => porDiaSem[d] !== undefined // día futuro: no pisar
    await sql`
      INSERT INTO kpi_semanas (centro_id, year, month, semana, cob_d1, cob_d2, cob_d3, cob_d4, cob_d5)
      VALUES (${centroId}, ${year}, ${month}, ${Number(semana)}, ${v(1)}, ${v(2)}, ${v(3)}, ${v(4)}, ${v(5)})
      ON CONFLICT (centro_id, year, month, semana) DO UPDATE SET
        cob_d1 = CASE WHEN ${escribe(1)} THEN ${v(1)} ELSE kpi_semanas.cob_d1 END,
        cob_d2 = CASE WHEN ${escribe(2)} THEN ${v(2)} ELSE kpi_semanas.cob_d2 END,
        cob_d3 = CASE WHEN ${escribe(3)} THEN ${v(3)} ELSE kpi_semanas.cob_d3 END,
        cob_d4 = CASE WHEN ${escribe(4)} THEN ${v(4)} ELSE kpi_semanas.cob_d4 END,
        cob_d5 = CASE WHEN ${escribe(5)} THEN ${v(5)} ELSE kpi_semanas.cob_d5 END,
        updated_at = now()`
  }
}

if (sinClasificar.length) {
  console.log(`\nSin clasificar (${sinClasificar.length}, no cuentan para ningún centro):`)
  for (const s of sinClasificar) console.log(` - [${s.org}] ${s.invoice} "${s.ref}"`)
}
console.log(dry ? '\n(dry-run: no se escribió nada)' : '\nListo.')
