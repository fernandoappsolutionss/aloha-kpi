// Manifiesto PRIVADO fuera del repositorio. Solo --apply escribe.
// node --env-file=/ruta/privada/.env.local scripts/apply-audit-repair.mjs /ruta/plan.json [--apply]
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const monthKey = ['centro_id', 'year', 'month']
const motives = ['mot_tecnica', 'mot_perdida_clase', 'mot_economico', 'mot_horario', 'mot_graduado', 'mot_otro']
const TABLES = {
  mes_kpi: { key: monthKey, fields: [] },
  estudiantes: { key: ['id'], fields: [] },
  resumen_mes: { key: monthKey, fields: [...motives, 'ninos_inicio_mes', 'ninos_final_mes', 'nuevos_activos_mes'], timestamp: true },
  kpi_semanas: { key: [...monthKey, 'semana'], fields: Array.from({ length: 5 }, (_, i) => `des_d${i + 1}`), timestamp: true },
  cuadro_mensual: { key: monthKey, fields: ['datos'] },
  estudiante_eventos: { key: ['id'], fields: ['detalle'], delete: true },
}
const guard = (condition, message) => { if (!condition) throw new Error(`Reparación cancelada: ${message}`) }
const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key)

export function validatePlan(plan) {
  guard(Array.isArray(plan?.operations) && plan.operations.length > 0, 'faltan operaciones')
  const touched = new Set()
  for (const op of plan.operations) {
    const config = TABLES[op.table]
    guard(config && op.key && Object.keys(op.key).length === config.key.length, 'tabla o clave no permitida')
    guard(config.key.every(key => Number.isSafeInteger(op.key[key]) && op.key[key] > 0), 'falta alcance completo de fila')
    guard(op.expected && Object.keys(op.expected).length > 0 && typeof op.reason === 'string' && op.reason.trim(), 'falta guarda o evidencia')
    guard([Boolean(op.check), Boolean(op.delete), Boolean(op.set)].filter(Boolean).length === 1, 'operación ambigua')
    if (op.delete) guard(config.delete, 'eliminación no permitida')
    if (op.set) {
      const fields = Object.keys(op.set)
      guard(fields.length > 0 && fields.every(key => config.fields.includes(key) && own(op.expected, key)), 'campo no permitido o sin valor esperado')
      guard(fields.every(key => ['datos', 'detalle'].includes(key) || op.set[key] === null || (Number.isSafeInteger(op.set[key]) && op.set[key] >= 0)), 'valor no válido')
    }
    const key = `${op.table}:${config.key.map(key => op.key[key]).join(':')}`
    guard(!touched.has(key), 'fila repetida en el manifiesto')
    touched.add(key)
  }
  return plan
}

export function assertExpected(row, expected) {
  guard(Boolean(row), 'fila ausente')
  for (const [key, wanted] of Object.entries(expected)) {
    const actual = row[key] instanceof Date ? row[key].toISOString() : row[key]
    try { assert.deepEqual(actual, wanted) }
    catch { throw new Error(`Reparación cancelada: cambió el campo ${key}`) }
  }
}

export async function runRepair(client, plan, { apply = false, backup } = {}) {
  validatePlan(plan)
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  try {
    await client.query("SET LOCAL lock_timeout = '5s'")
    await client.query("SET LOCAL statement_timeout = '30s'")
    const prepared = []
    // El manifiesto ordena candados: meses → fichas → eventos → derivados.
    // TODAS las guardas se comprueban antes del respaldo y del primer cambio.
    for (const op of plan.operations) {
      const columns = TABLES[op.table].key
      const where = columns.map((key, i) => `"${key}"=$${i + 1}`).join(' AND ')
      const values = columns.map(key => op.key[key])
      const result = await client.query(`SELECT * FROM "${op.table}" WHERE ${where}${apply ? ' FOR UPDATE' : ''}`, values)
      guard(result.rows.length === 1, 'alcance distinto de una fila')
      assertExpected(result.rows[0], op.expected)
      prepared.push({ op, where, values, before: result.rows[0] })
    }
    if (!apply) {
      await client.query('ROLLBACK')
      return { mode: 'dry-run', operations: prepared.filter(item => !item.op.check).length, guards: prepared.length }
    }
    guard(typeof backup === 'function', 'falta respaldo persistente')
    const backupPath = backup({ plan, before: prepared.map(item => ({ table: item.op.table, key: item.op.key, row: item.before })) })
    guard(typeof backupPath === 'string' && backupPath.length > 0, 'respaldo sin confirmar')
    let changed = 0
    for (const { op, where, values } of prepared) {
      if (op.check) continue
      let result
      if (op.delete) {
        result = await client.query(`DELETE FROM "${op.table}" WHERE ${where} RETURNING *`, values)
      } else {
        const entries = Object.entries(op.set)
        const assignments = entries.map(([key], index) => `"${key}"=$${values.length + index + 1}`)
        if (TABLES[op.table].timestamp) assignments.push('updated_at=now()')
        result = await client.query(`UPDATE "${op.table}" SET ${assignments.join(',')} WHERE ${where} RETURNING *`,
          [...values, ...entries.map(([key, value]) => ['datos', 'detalle'].includes(key) ? JSON.stringify(value) : value)])
      }
      guard(result.rows.length === 1, 'cambió el alcance al escribir')
      if (op.set) assertExpected(result.rows[0], op.set)
      changed++
    }
    await client.query('COMMIT')
    return { mode: 'applied', changed, backup: backupPath }
  } catch (error) {
    try { await client.query('ROLLBACK') } catch {}
    throw error
  }
}

export async function main(args = process.argv.slice(2)) {
  guard(args.length >= 1 && args.length <= 2 && (args.length === 1 || args[1] === '--apply'), 'argumentos inválidos')
  guard(Boolean(process.env.DATABASE_URL), 'falta DATABASE_URL')
  const plan = JSON.parse(fs.readFileSync(args[0], 'utf8'))
  validatePlan(plan)
  const { Pool, neonConfig } = await import('@neondatabase/serverless')
  const { default: ws } = await import('ws')
  neonConfig.webSocketConstructor = ws
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()
  try {
    return await runRepair(client, plan, { apply: args.includes('--apply'), backup: data => {
      const filename = path.join(os.tmpdir(), `aloha-audit-before-${Date.now()}-${process.pid}.json`)
      const fd = fs.openSync(filename, 'wx', 0o600)
      try {
        fs.writeFileSync(fd, JSON.stringify({ capturedAt: new Date().toISOString(), ...data }, null, 2))
        fs.fsyncSync(fd)
      } finally { fs.closeSync(fd) }
      return filename
    } })
  } finally { client.release(); await pool.end() }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
    console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/g, '[redacted]'))
    process.exitCode = 1
  })
}
