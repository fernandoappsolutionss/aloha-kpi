import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import { pathToFileURL } from 'node:url'
import { cargarEnv, conCliente } from './migrate-caja.mjs'
import { cierreDocumental } from '../lib/cierre-documental.mjs'

export const canonical = value => JSON.stringify(normalize(JSON.parse(JSON.stringify(value ?? null))))
function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, normalize(value[k])]))
  return value
}
const same = (a, b) => canonical(a) === canonical(b)
const key = r => ({ centro_id: r.centro_id, year: r.year, month: r.month })
const matches = (r, k) => r && Object.keys(k).every(c => r[c] === k[c])
const hash = path => createHash('sha256').update(fs.readFileSync(path)).digest('hex')
const sum = (rows, field) => rows.reduce((n, r) => n + r[field], 0)

export function validarFuente(source) {
  assert.equal(source.year, 2026); assert.equal(source.month, 9)
  assert.equal(source.pendienteConfirmacion, false, 'Fuente pendiente de decisión')
  const d = source.snapshot, t = d.totales
  assert.ok(cierreDocumental(d), 'Balance/documento inválido')
  assert.equal(d.conciliacion.periodo, '2026-09')
  const counters = d.controlGrupos.filas.map(f => f.contadores)
  for (const name of ['mesAnterior', 'nuevos', 'reincorporados', 'retirados']) assert.equal(sum(counters, name), t[name])
  assert.equal(sum(counters, 'totalMes'), t.aPagar)
  assert.equal(d.deserciones.length, t.retirados)
  assert.equal(d.royalties.totales.totalNinos, t.aPagar)
  assert.equal(d.royalties.totales.totalNuevos, t.nuevos)
  assert.equal(d.royalties.totales.totalRoyalty, t.aPagar * d.royaltyRate)
  assert.equal(sum(d.royalties.filas, 'total'), t.aPagar)
  assert.equal(source.summary.ninos_inicio_mes, t.mesAnterior)
  assert.equal(source.summary.ninos_final_mes, t.aPagar)
  assert.equal(source.summary.nuevos_activos_mes, t.nuevos)
  assert.equal(source.summary.grupos_activos, t.gruposActivos)
  const motivos = ['mot_tecnica', 'mot_perdida_clase', 'mot_economico', 'mot_horario', 'mot_graduado', 'mot_otro']
  assert.equal(motivos.reduce((n,k) => n + source.summary[k], 0), t.retirados)
}

export function prepararPlan(sources, baseline, now) {
  const ready = sources.filter(s => !s.pendienteConfirmacion)
  const ids = ready.map(s => s.centro_id)
  assert.equal(new Set(ids).size, ids.length, 'Centro/mes duplicado')
  const changes = []
  const add = (table, before, after) => { if (!same(before, after)) changes.push({ table, key: key(after), before: before || null, after }) }
  // Cierres previos: congelar la captura existente, sin reconstruir un padrón
  // antiguo con fichas actuales ni atribuirle una validación documental nueva.
  for (const m of baseline.meses.filter(m => ids.includes(m.centro_id) && m.year >= 2000 && m.year * 100 + m.month < 202609 && m.estado === 'abierto' && baseline.resumen.some(r => matches(r,key(m))))) {
    const k = key(m), r = baseline.resumen.find(r => matches(r,k)), snap = baseline.cuadros.find(r => matches(r,k))
    assert.ok(r && snap, 'Falta captura/fotografía previa para cerrar')
    const d = structuredClone(snap.datos)
    const t = d.totales
    assert.equal(r.ninos_inicio_mes + r.nuevos_activos_mes + t.reincorporados - t.retirados, r.ninos_final_mes, 'Captura histórica sin balance: requiere revisión')
    d.totales = { ...t, mesAnterior:r.ninos_inicio_mes, nuevos:r.nuevos_activos_mes, aPagar:r.ninos_final_mes }
    d.controlGrupos.totales = d.totales
    d.cierreHistorico = { fuente:'captura_existente', cerradoAt:now, nota:'Se cierra la captura mensual existente. El Excel de septiembre no verifica el detalle de este mes.' }
    add('cuadro_mensual', snap, { ...snap, datos:d, cerrado_at:now })
    add('mes_kpi',m,{...m,estado:'cerrado',cerrado_at:now})
  }
  for (const s of ready) {
    validarFuente(s)
    const k = key(s), r = baseline.resumen.find(r=>matches(r,k)), m = baseline.meses.find(r=>matches(r,k)), snap = baseline.cuadros.find(r=>matches(r,k))
    assert.ok(r && m, 'Debe existir un mes y resumen a conciliar')
    const previous = baseline.resumen.find(r => matches(r,{...k,month:8}))
    assert.ok(previous, 'Falta cierre previo documentable')
    const d = structuredClone(s.snapshot)
    d.conciliacion.importado_at = snap?.datos?.conciliacion?.sha256 === d.conciliacion.sha256 ? snap.datos.conciliacion.importado_at : now
    d.conciliacion.ajusteInicio = { cierreAnterior:previous.ninos_final_mes, inicioDocumento:d.totales.mesAnterior, diferencia:d.totales.mesAnterior-previous.ninos_final_mes }
    const nuevoResumen = {...r,...s.summary}
    if (!same(r,nuevoResumen)) nuevoResumen.updated_at=now
    add('resumen_mes',r,nuevoResumen)
    add('cuadro_mensual',snap,{...(snap || k),datos:d,cerrado_at:m.cerrado_at || now})
    add('mes_kpi',m,{...m,estado:'cerrado',cerrado_at:m.cerrado_at || now})
  }
  return { version:1, cutoff:202609, createdAt:now, sources:ready.map(s=>({path:s.sourcePath,sha256:s.snapshot.conciliacion.sha256,centro_id:s.centro_id})), changes, pendientes:sources.filter(s=>s.pendienteConfirmacion).map(s=>s.centro_id) }
}

const allowed = new Set(['resumen_mes','cuadro_mensual','mes_kpi'])
function cleanRow(row, expected) {
  if (!row) return null
  if (expected && !Object.hasOwn(expected,'id')) { const {id, ...rest}=row; return rest }
  return row
}
export async function aplicarPlan(client, plan, { apply=false, backupPath, writeBackup }={}) {
  assert.equal(plan.version,1); assert.equal(plan.cutoff,202609)
  for (const change of plan.changes) {
    assert.ok(allowed.has(change.table)); assert.ok(change.key.year*100+change.key.month<=plan.cutoff)
    assert.ok(matches(change.after, change.key))
    for (const col of Object.keys(change.after)) assert.match(col,/^[a-z_]+$/)
  }
  await client.query(apply ? 'BEGIN ISOLATION LEVEL SERIALIZABLE' : 'BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY')
  try {
    // Mismo orden de bloqueo que la app: mes_kpi antes de cualquier escritura.
    const keys = [...new Map(plan.changes.map(c=>[canonical(c.key),c.key])).values()].sort((a,b)=>a.centro_id-b.centro_id || a.year-b.year || a.month-b.month)
    if (apply) for (const k of keys) await client.query('SELECT * FROM mes_kpi WHERE centro_id=$1 AND year=$2 AND month=$3 FOR UPDATE',[k.centro_id,k.year,k.month])
    const pending=[], backup=[]
    for (const c of plan.changes) {
      const result=await client.query(`SELECT * FROM ${c.table} WHERE centro_id=$1 AND year=$2 AND month=$3${apply ? ' FOR UPDATE':''}`,[c.key.centro_id,c.key.year,c.key.month])
      const actual=result.rows[0] || null
      if (same(cleanRow(actual,c.after),c.after)) continue
      assert.ok(same(actual,c.before), `Cambió ${c.table} ${canonical(c.key)}; no se sobrescribe`)
      pending.push(c); backup.push({table:c.table,key:c.key,row:actual})
    }
    if (apply && pending.length) {
      assert.ok(backupPath && writeBackup, 'Respaldo obligatorio')
      await writeBackup(backupPath, { version:1, planSha256:createHash('sha256').update(canonical(plan)).digest('hex'), rows:backup })
      for (const c of pending) {
        const cols=Object.keys(c.after), vals=cols.map(k=>c.after[k])
        const params=cols.map((_,i)=>`$${i+1}`).join(',')
        const assignments=cols.filter(k=>!['id','centro_id','year','month'].includes(k)).map(k=>`${k}=EXCLUDED.${k}`).join(',')
        await client.query(`INSERT INTO ${c.table} (${cols.join(',')}) VALUES (${params}) ON CONFLICT (centro_id,year,month) DO UPDATE SET ${assignments}`,vals)
      }
      for (const c of pending) {
        const {rows:[actual]}=await client.query(`SELECT * FROM ${c.table} WHERE centro_id=$1 AND year=$2 AND month=$3`,[c.key.centro_id,c.key.year,c.key.month])
        assert.ok(same(cleanRow(actual,c.after),c.after), `Verificación falló en ${c.table}`)
      }
    }
    await client.query('COMMIT')
    return { applied:apply ? pending.length:0, pending:apply ? 0:pending.length, alreadyApplied:plan.changes.length-pending.length }
  } catch (error) { await client.query('ROLLBACK').catch(()=>{}); throw error }
}

export function guardarRespaldo(path, data) {
  const body=JSON.stringify(data,null,2), fd=fs.openSync(path,'wx',0o600)
  try { fs.writeFileSync(fd,body); fs.fsyncSync(fd) } finally { fs.closeSync(fd) }
  const sha=createHash('sha256').update(body).digest('hex')
  assert.equal(hash(path),sha,'Respaldo ilegible')
  fs.writeFileSync(`${path}.sha256`,`${sha}\n`,{flag:'wx',mode:0o600})
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href===import.meta.url) {
  const [planPath, backupPath, mode]=process.argv.slice(2)
  assert.ok(planPath && backupPath && ['--dry-run','--apply'].includes(mode), 'Uso: node scripts/conciliar-cuadros-documentales.mjs PLAN BACKUP --dry-run|--apply')
  const plan=JSON.parse(fs.readFileSync(planPath,'utf8'))
  for (const source of plan.sources) assert.equal(hash(source.path),source.sha256,'Cambió el archivo fuente')
  cargarEnv()
  console.log(JSON.stringify(await conCliente(c=>aplicarPlan(c,plan,{apply:mode==='--apply',backupPath,writeBackup:guardarRespaldo}))))
}
