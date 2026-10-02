import assert from 'node:assert/strict'
import { conCliente } from '../../scripts/migrate-caja.mjs'
import { persistGrowth } from '../../lib/growth/server.js'
import { marcarObjetivoEn, editarObjetivoEn, verificarObjetivoEn } from '../../lib/plan-semana-servicio.js'
if (process.env.E2E_DATABASE_CONFIRM !== 'disposable') throw new Error('Solo base desechable.')
await conCliente(async client => {
  await client.query('BEGIN')
  const query = async (parts, ...values) => (await client.query(parts.reduce((s,p,i)=>s+(i?`$${i}`:'')+p,''), values)).rows
  const transaction = work => work(query)
  try {
    const [{ id: centro }] = await query`SELECT id FROM centros ORDER BY id LIMIT 1`
    const [{ id: actor }] = await query`SELECT id FROM usuarios ORDER BY id LIMIT 1`
    const [{ id: plan }] = await query`INSERT INTO semana_planes (centro_id, semana_fin) VALUES (${centro}, '2099-10-01') ON CONFLICT (centro_id, semana_fin) DO UPDATE SET condicion=NULL RETURNING id`
    const [{id}] = await query`INSERT INTO semana_objetivos (plan_id,seccion,texto,responsable,fecha,evidencia_esperada) VALUES (${plan},'urgente','Llamar familias','Ana','2099-10-07','Registro de acuerdos') RETURNING id`
    const opts = {query,transaction,actorId:actor}
    await assert.rejects(marcarObjetivoEn(centro,id,true,opts), /evidencia/i)
    await marcarObjetivoEn(centro,id,true,{...opts,evidencia:'Tres acuerdos registrados'})
    await verificarObjetivoEn(centro,id,opts)
    let [row] = await query`SELECT * FROM semana_objetivos WHERE id=${id}`
    assert.equal(row.hecho,true); assert.ok(row.verificado_at)
    await editarObjetivoEn(centro,id,{texto:'Nueva acción',responsable:'Ana',fecha:'2099-10-08',evidencia_esperada:'Nuevo registro'},opts)
    ;[row] = await query`SELECT * FROM semana_objetivos WHERE id=${id}`
    assert.equal(row.hecho,false); assert.equal(row.verificado_at,null)
    await assert.rejects(verificarObjetivoEn(centro,id,opts), /realizada/i)
    await assert.rejects(marcarObjetivoEn(-1,id,true,{...opts,evidencia:'No'}), /No autorizado/)
    const payload={metrics:{confidence:{level:'low'}}}
    const rec=kind=>({kind,title:kind,reason:'Prueba',action:'Acción de prueba',metric:'active',baseline:1,target:2,unit:'niños',estimatedImpact:1,effort:1,priority:1,responsible:'Administradora',dueDays:7})
    await persistGrowth(centro,'2099-10-02',payload,[rec('fill_groups'),rec('improve_conversion')],opts)
    await persistGrowth(centro,'2099-10-02',payload,[rec('fill_groups')],opts)
    const stale = await query`SELECT status FROM growth_recommendations WHERE centro_id=${centro} AND kind='improve_conversion' AND generated_for='2099-09-28'`
    assert.equal(stale.length,1); assert.equal(stale[0].status,'superseded')
    console.log('OK: evidencia, verificación, edición, aislamiento y acciones obsoletas en la misma semana.')
  } finally { await client.query('ROLLBACK') }
})
