import test from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as delay } from 'node:timers/promises'
import { prepareR8Fixture, cleanupR8Fixture, r8Pool, r8Crm, requireR8Gate, installR8SqlFault, removeR8SqlFault } from '../../tests/e2e/helpers/r8-fixture.mjs'

requireR8Gate()
const { fotoKpiAutomatica } = await import('../../lib/kpi-auto-server.js')

async function race({ cold = false, close = false } = {}) {
  await prepareR8Fixture()
  const pool = r8Pool(), holder = await pool.connect(), observer = await pool.connect()
  let jobs = [], released = false
  const errors = [], original = console.error
  console.error = (...args) => { errors.push(args); original(...args) }
  let crmCalls = 0
  const crm = (...args) => { crmCalls++; return r8Crm(...args) }
  try {
    if (!cold) assert.equal((await fotoKpiAutomatica(3,2026,9,{crm:r8Crm})).complete,true)
    const baseline = (await observer.query('SELECT ajustes FROM kpi_auto_ajustes WHERE centro_id=3 AND year=2026 AND month=9')).rows
    await holder.query('BEGIN')
    const pid = Number((await holder.query('SELECT pg_backend_pid() AS pid')).rows[0].pid)
    await holder.query(cold
      ? 'SELECT estado FROM mes_kpi WHERE centro_id=3 AND year=2026 AND month=9 FOR UPDATE'
      : `UPDATE mes_kpi SET estado=${close ? "'cerrado'" : 'estado'} WHERE centro_id=3 AND year=2026 AND month=9`)
    jobs = Array.from({length:cold ? 2 : 1}, () => fotoKpiAutomatica(3,2026,9,{crm}))
    const started = Date.now()
    let blocked = []
    while (Date.now()-started < 15_000) {
      blocked = (await observer.query(`WITH RECURSIVE waiting AS (
        SELECT pid,query,pg_blocking_pids(pid) AS blockers FROM pg_stat_activity WHERE datname=current_database() AND cardinality(pg_blocking_pids(pid))>0
      ), chain AS (
        SELECT pid,query,unnest(blockers) AS blocker FROM waiting
        UNION ALL SELECT chain.pid,chain.query,unnest(waiting.blockers) FROM chain JOIN waiting ON waiting.pid=chain.blocker
      ) SELECT DISTINCT pid,query FROM chain WHERE blocker=$1 AND query LIKE '%mes_kpi%'`,[pid])).rows
      if (blocked.length >= jobs.length) break
      await delay(20)
    }
    assert.equal(blocked.length,jobs.length,'La barrera debe observar a cada foto bloqueada, no liberar por tiempo.')
    console.log('R8 barrera real',JSON.stringify({holder:pid,blocked}))
    await holder.query('COMMIT'); released = true
    const results = await Promise.all(jobs)
    if (close) {
      assert.equal(results[0].complete,false)
      assert.match(results[0].error,/dejó de estar abierto/)
    } else {
      assert.ok(results.every(result => result.complete), `Fotos incompletas: ${results.map(r=>r.error).join('; ')}`)
      for (const result of results) {
        assert.equal(result.auto.ingTotal,1)
        assert.equal(result.auto.desTotal,1)
        assert.equal(result.data.mot_graduado,1)
        assert.equal(result.data.cp_matriculados,7)
        assert.equal(result.data._trial_funnel.valueSource,'manual_override')
      }
    }
    assert.equal(crmCalls,jobs.length*2,'El retry no debe recargar CRM/fuente canónica.')
    assert.equal((await observer.query('SELECT * FROM mes_kpi WHERE centro_id=3 AND year=2026 AND month=9')).rowCount,1)
    const current = (await observer.query('SELECT ajustes FROM kpi_auto_ajustes WHERE centro_id=3 AND year=2026 AND month=9')).rows
    assert.equal(current.length,1)
    if (!cold) assert.deepEqual(current,baseline,'No se reescriben ajustes existentes.')
    assert.deepEqual((await observer.query('SELECT cob_d5 FROM kpi_semanas WHERE centro_id=3 AND year=2026 AND month=9 ORDER BY semana')).rows.map(r=>r.cob_d5),[9,9,9,9,9])
    console.log('R8 SQLSTATE capturados', errors.flat().filter(x=>x?.code).map(x=>x.code))
  } finally {
    if (!released) await holder.query('ROLLBACK')
    await Promise.allSettled(jobs)
    console.error = original
    holder.release(); observer.release(); await pool.end()
    await cleanupR8Fixture()
  }
}
test('foto con escritor real concurrente recupera 40001 sin alterar ajustes ni fuente',()=>race())
test('dos inicializadores reales con snapshots anteriores al lock completan una sola conciliación',()=>race({cold:true}))
test('un cierre concurrente ganador se respeta tras reintento, sin editar cerrado',()=>race({close:true}))

for (const [code,attempts] of [['40001',3],['23514',1]]) test(`inyección artificial ${code}: ${attempts} intentos y fallo explícito`,async () => {
  await prepareR8Fixture()
  const pool = r8Pool()
  let installed = false
  try {
    await installR8SqlFault(code); installed = true
    const result = await fotoKpiAutomatica(3,2026,9,{crm:r8Crm})
    assert.equal(result.complete,false)
    assert.match(result.error,new RegExp(`R8 inyección SQLSTATE ${code}`))
    const [count] = (await pool.query('SELECT last_value,is_called FROM public.r8_kpi_fault_attempts')).rows
    assert.equal(count.is_called,true)
    assert.equal(Number(count.last_value),attempts)
    assert.equal((await pool.query('SELECT * FROM kpi_auto_ajustes WHERE centro_id=3')).rowCount,0)
  } finally {
    await pool.end()
    if (installed) await removeR8SqlFault()
    await cleanupR8Fixture()
  }
})

test('options.query conserva la transacción real abortada del caller sin retry local',async () => {
  await prepareR8Fixture()
  const pool = r8Pool(), db = await pool.connect()
  let reconciliationQueries = 0
  try {
    await db.query('BEGIN ISOLATION LEVEL SERIALIZABLE')
    const query = async (strings,...values) => {
      let text = strings[0]
      for (let i=0;i<values.length;i++) text+=`$${i+1}${strings[i+1]}`
      if (/SELECT ajustes FROM kpi_auto_ajustes/.test(text)) {
        reconciliationQueries++
        // Real PostgreSQL error aborts the real owner transaction.
        await db.query("DO $$ BEGIN RAISE EXCEPTION 'R8 caller 40001' USING ERRCODE='40001'; END $$")
      }
      return (await db.query(text,values)).rows
    }
    const result = await fotoKpiAutomatica(3,2026,9,{query,crm:r8Crm})
    assert.equal(result.complete,false)
    assert.match(result.error,/R8 caller 40001/)
    assert.equal(reconciliationQueries,1)
    await assert.rejects(db.query('SELECT 1'),error=>error.code === '25P02')
    assert.equal((await pool.query('SELECT * FROM kpi_auto_ajustes WHERE centro_id=3')).rowCount,0)
  } finally {
    await db.query('ROLLBACK'); db.release(); await pool.end()
    await cleanupR8Fixture()
  }
})
