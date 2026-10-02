// Solo base desechable. Por defecto, los cambios se revierten al terminar.
// --demo deja dos casos de cuotas históricas ficticias para revisar en navegador.
import assert from 'node:assert/strict'
import { sql, withTransaction } from '../../lib/db.js'
import { cargarPlan } from '../../lib/plan-semana-servicio.js'
import { evaluarCuotasCerradas, ordenarRankingSemanal } from '../../lib/cuotas-semana.mjs'
import { ESTADISTICAS_CENTRO as catalogo } from '../../lib/estadisticas-semana/catalogo.mjs'
import { armarSeries } from '../../lib/estadisticas-semana/presentacion.mjs'

assert.equal(process.env.E2E_DATABASE_CONFIRM, 'disposable')
assert.equal(process.env.DATABASE_URL, process.env.USUARIOS_TEST_DATABASE_URL)
const destino = new URL(process.env.DATABASE_URL)
assert.equal(destino.hostname, 'aloha-hca-pg'); assert.equal(destino.pathname, '/aloha_audit')
assert.equal(new URL(process.env.E2E_NEON_HTTP).hostname, '127.0.0.1')
const centros = await sql`SELECT id, nombre FROM centros ORDER BY id`
assert.deepEqual(centros.map(c => c.nombre), ['Centro Demo Norte', 'Centro Demo Sur', 'Centro Demo Valencia'])
const fin = '2026-09-24'

async function cuotasDemo(q) {
  for (const [centroId, valores] of [[1, [148, 3, 1, 2, 0]], [2, [132, 3, 1, 1, 0]]]) {
    for (const [i, meta] of catalogo.entries()) await q`INSERT INTO semana_cuotas (centro_id, semana_fin, codigo, cuota, estado, aprobada_at)
      VALUES (${centroId}, ${fin}, ${meta.codigo}, ${valores[i]}, 'aprobada', now())
      ON CONFLICT (centro_id, semana_fin, codigo) DO UPDATE SET cuota=EXCLUDED.cuota, estado='aprobada', aprobada_at=now()`
  }
  await q`UPDATE semana_cuotas SET estado='propuesta' WHERE centro_id=10 AND semana_fin=${fin}`
}

const rollback = new Error('QA rollback')
try {
  await withTransaction(async q => {
    await cuotasDemo(q)
    const centrosEvaluados = []
    for (const c of centros) {
      const filas = await q`SELECT * FROM estadisticas_semana WHERE centro_id=${c.id} AND semana_fin=${fin}`
      const filasCuotas = await q`SELECT * FROM semana_cuotas WHERE centro_id=${c.id} AND semana_fin=${fin}`
      const { series } = armarSeries([fin], filas)
      centrosEvaluados.push({ ...c, evaluacionCuotas: evaluarCuotasCerradas({ catalogo, series, filasCuotas, semanaFin: fin }) })
    }
    assert.deepEqual(ordenarRankingSemanal(centrosEvaluados).map(c => [c.id, c.evaluacionCuotas.porcentaje, c.medalla]), [[1,100,'🥇'],[2,20,null],[10,null,null]])
    console.log('PASS SQL real: ranking 5/5, 1/5 y sin cuotas; solo el primero gana medalla')
    const [snapshot] = await q`INSERT INTO growth_snapshots (centro_id,snapshot_date,engine_version,confidence,payload) VALUES (1,'2099-01-01','qa-cierre','low','{}') RETURNING id`
    const creadas = []
    for (const [centroId, estado] of [[1,'pending'], [1,'postponed'], [1,'completed'], [1,'dismissed'], [2,'pending']]) {
      const [r] = await q`INSERT INTO growth_recommendations (centro_id,snapshot_id,kind,generated_for,title,reason,action,metric,status,due_date)
        VALUES (${centroId},${snapshot.id},${'qa-'+estado},'2099-01-01','QA seguimiento compartido','QA','QA acción','QA',${estado},'2099-01-08') RETURNING id`
      creadas.push(String(r.id))
    }
    const plan = await cargarPlan(1,fin,{query:q,transaction:work=>work(q),sesion:{rol:'administradora'}})
    assert.deepEqual(plan.estrategico.filter(r=>creadas.includes(String(r.id))).map(r=>r.status).sort(),['pending','postponed'])
    assert.equal('lectura' in plan, false)
    console.log('PASS SQL real: plan conserva pendientes y pospuestas del centro, excluye realizadas, descartadas y ajenas')
    throw rollback
  })
} catch (e) { if(e !== rollback) throw e }
if (process.argv.includes('--demo')) {
  await withTransaction(cuotasDemo)
  console.log('DEMO local preparada: Norte cumple 5/5; Sur 1/5; Valencia sin aprobación. Datos ficticios.')
}
