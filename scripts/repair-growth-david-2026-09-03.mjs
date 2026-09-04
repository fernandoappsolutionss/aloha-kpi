// Dry-run por defecto. Solo --apply escribe, con bloqueo, guardias y respaldo.
// node --env-file=.env.local scripts/repair-growth-david-2026-09-03.mjs
//   [--repair-open-balance] [--apply]
// No mueve la ficha 855, no cambia niveles/fechas y nunca cierra mayo.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const IDS = [198, 235, 305]
const iso = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10)
const guard = (valid, reason) => { if (!valid) throw new Error(`Guardia de reparación: ${reason}`) }

export function buildRepairPlan({ students = [], groups = [], events = [] }) {
  guard(students.length === IDS.length && IDS.every(id => students.some(row => Number(row.id) === id)), 'faltan fichas o sobran filas')
  const source = groups.find(row => Number(row.id) === 33)
  const target = groups.find(row => Number(row.id) === 34)
  guard(source?.estado === 'fusionado' && Number(source.fusionado_en) === 34 && Number(source.centro_id) === 5, 'origen de fusión distinto')
  guard(target?.estado === 'activo' && Number(target.centro_id) === 5 && target.inscripcion_abierta === true, 'destino no disponible en DAVID')
  guard(source.itinerario === 'TINY' && target.itinerario === 'TINY', 'itinerario de grupos distinto')
  guard(source.itinerario_clases == null && target.itinerario_clases == null, 'hay un nuevo plan de clases que requiere revisar las anclas')
  const pendingIds = [], alreadyAppliedIds = []
  for (const id of IDS) {
    const student = students.find(row => Number(row.id) === id)
    guard(Number(student.centro_id) === 5 && student.estado === 'activo', `centro/estado cambió en ficha ${id}`)
    guard(student.itinerario === 'TINY' && Number(student.nivel) === 5 && student.fecha_inicio_nivel == null, `nivel o ancla cambió en ficha ${id}`)
    guard(iso(student.fecha_inscripcion) === '2026-07-01', `inscripción cambió en ficha ${id}`)
    guard([33, 34].includes(Number(student.grupo_id)), `grupo cambió en ficha ${id}`)
    const ownEvents = events.filter(row => Number(row.estudiante_id) === id)
    const inscriptions = ownEvents.filter(row => row.tipo === 'inscripcion')
      .sort((a, b) => iso(a.fecha).localeCompare(iso(b.fecha)) || Number(a.id) - Number(b.id))
    const original = inscriptions[0]
    guard(original && Number(original.centro_id) === 5 && Number(original.a_grupo_id) === 34
      && iso(original.fecha) === '2026-06-01', `inscripción original no confirma destino en ficha ${id}`)
    guard(!ownEvents.some(row => ['fusion', 'cambio_grupo', 'retiro', 'reincorporacion'].includes(row.tipo)), `hay movimientos posteriores en ficha ${id}`)
    if (Number(student.grupo_id) === 34) alreadyAppliedIds.push(id)
    else pendingIds.push(id)
  }
  return { centroId: 5, fromGroupId: 33, toGroupId: 34, pendingIds, alreadyAppliedIds }
}

export function buildOpenBalanceRepair({ months = [], states = [], withdrawals, reincorporations }) {
  const month = number => months.find(row => Number(row.year) === 2026 && Number(row.month) === number)
  const state = number => states.find(row => Number(row.year) === 2026 && Number(row.month) === number)?.estado
  const april = month(4), may = month(5), june = month(6)
  guard(state(5) === 'abierto' && state(6) === 'cerrado', 'mayo debe seguir abierto y junio cerrado')
  guard(Number(april?.ninos_final_mes) === 173 && Number(may?.ninos_inicio_mes) === 173, 'arrastre abril/mayo distinto')
  guard(Number(may?.nuevos_activos_mes) === 2 && Number(withdrawals) === 12 && Number(reincorporations) === 0, 'movimientos declarados de mayo distintos')
  const after = Number(may.ninos_inicio_mes) + Number(may.nuevos_activos_mes) + Number(reincorporations) - Number(withdrawals)
  guard(after === 163 && Number(june?.ninos_inicio_mes) === after, 'junio no corrobora el saldo de mayo')
  const before = Number(may?.ninos_final_mes)
  guard([150, 163].includes(before), 'saldo de mayo cambió desde la auditoría')
  return { centroId: 5, year: 2026, month: 5, before, after, pending: before !== after }
}

function statements(includeBalance, lock) {
  const suffix = lock ? ' FOR UPDATE' : ''
  const queries = [{ key: 'groups', sql: `SELECT id,centro_id,estado,fusionado_en,itinerario,itinerario_clases,inscripcion_abierta FROM grupos WHERE id IN(33,34) ORDER BY id${suffix}` }]
  // Orden de bloqueo compatible con operaciones: grupos → meses → estudiantes.
  if (includeBalance) queries.push(
    { key: 'states', sql: `SELECT centro_id,year,month,estado,cerrado_at FROM mes_kpi WHERE centro_id=5 AND year=2026 AND month BETWEEN 4 AND 6 ORDER BY year,month${suffix}` },
    { key: 'months', sql: `SELECT centro_id,year,month,ninos_inicio_mes,ninos_final_mes,nuevos_activos_mes,updated_at FROM resumen_mes WHERE centro_id=5 AND year=2026 AND month BETWEEN 4 AND 6 ORDER BY year,month${suffix}` },
    { key: 'weeks', sql: `SELECT semana,des_d1,des_d2,des_d3,des_d4,des_d5 FROM kpi_semanas WHERE centro_id=5 AND year=2026 AND month=5 ORDER BY semana${suffix}` },
    { key: 'rejoined', sql: `SELECT id FROM estudiante_eventos WHERE centro_id=5 AND tipo='reincorporacion' AND year=2026 AND month=5 ORDER BY id${suffix}` },
  )
  queries.push(
    { key: 'students', sql: `SELECT id,centro_id,grupo_id,itinerario,nivel,fecha_inicio_nivel,fecha_inscripcion,estado,updated_at FROM estudiantes WHERE id IN(198,235,305) ORDER BY id${suffix}` },
    { key: 'events', sql: `SELECT id,centro_id,estudiante_id,tipo,fecha,a_grupo_id FROM estudiante_eventos WHERE estudiante_id IN(198,235,305) ORDER BY id${suffix}` },
  )
  return queries
}

function proposal(data, includeBalance) {
  return {
    students: buildRepairPlan(data),
    openBalance: includeBalance ? buildOpenBalanceRepair({
      ...data,
      withdrawals: data.weeks.reduce((sum, row) => sum + [1, 2, 3, 4, 5].reduce((n, day) => n + Number(row[`des_d${day}`] || 0), 0), 0),
      reincorporations: data.rejoined.length,
    }) : null,
  }
}

function writeBackup(data, plan) {
  const backup = path.join(os.tmpdir(), `aloha-growth-david-before-${Date.now()}-${process.pid}.json`)
  const fd = fs.openSync(backup, 'wx', 0o600)
  try {
    fs.writeFileSync(fd, JSON.stringify({ phase: 'before_commit', capturedAt: new Date().toISOString(), plan, data }, null, 2))
    fs.fsyncSync(fd)
  } finally { fs.closeSync(fd) }
  return backup
}

export async function main(args = process.argv.slice(2)) {
  guard(args.every(arg => ['--apply', '--repair-open-balance'].includes(arg)), 'argumento no reconocido')
  guard(Boolean(process.env.DATABASE_URL), 'falta DATABASE_URL')
  const apply = args.includes('--apply'), includeBalance = args.includes('--repair-open-balance')
  if (!apply) {
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(process.env.DATABASE_URL)
    const queries = statements(includeBalance, false)
    const rows = await sql.transaction(queries.map(item => sql(item.sql)), { readOnly: true, isolationLevel: 'RepeatableRead' })
    const data = Object.fromEntries(queries.map((item, index) => [item.key, rows[index]]))
    return { mode: 'dry-run', ...proposal(data, includeBalance), excludedStudentIds: [855] }
  }
  const { withTransaction } = await import('../lib/db.js')
  return withTransaction(async query => {
    const data = {}
    for (const item of statements(includeBalance, true)) data[item.key] = await query(item.sql)
    const plan = proposal(data, includeBalance)
    if (!plan.students.pendingIds.length && !plan.openBalance?.pending) return { mode: 'already-applied', studentIds: [], balanceUpdated: false }
    // Respaldo completo de los campos afectados, con fsync, antes de cualquier UPDATE.
    const backup = writeBackup(data, plan)
    let updated = []
    if (plan.students.pendingIds.length) {
      updated = await query(`UPDATE estudiantes SET grupo_id=34,updated_at=now()
        WHERE centro_id=5 AND id=ANY($1::int[]) AND grupo_id=33 AND estado='activo'
          AND itinerario='TINY' AND nivel=5 AND fecha_inicio_nivel IS NULL
          AND fecha_inscripcion::date='2026-07-01'::date RETURNING id`, [plan.students.pendingIds])
      guard(updated.length === plan.students.pendingIds.length, 'concurrencia al restaurar grupos; se revierte todo')
    }
    if (plan.openBalance?.pending) {
      const changed = await query(`UPDATE resumen_mes SET ninos_final_mes=163,updated_at=now()
        WHERE centro_id=5 AND year=2026 AND month=5 AND ninos_final_mes=150
          AND ninos_inicio_mes=173 AND nuevos_activos_mes=2
          AND EXISTS(SELECT 1 FROM mes_kpi WHERE centro_id=5 AND year=2026 AND month=5 AND estado='abierto')
        RETURNING centro_id`)
      guard(changed.length === 1, 'concurrencia al restaurar el saldo abierto; se revierte todo')
    }
    return { mode: 'applied', backup, studentIds: updated.map(row => row.id), balanceUpdated: Boolean(plan.openBalance?.pending), excludedStudentIds: [855] }
  })
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
    console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]'))
    process.exitCode = 1
  })
}
