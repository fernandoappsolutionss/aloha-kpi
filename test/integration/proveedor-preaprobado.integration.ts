import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { sql, withTransaction } from '../../lib/db.js'
import { peticionesRepository as repo } from '../../lib/peticiones-repository.js'
import { createPeticionesService } from '../../lib/peticiones-service.mjs'

const url = new URL(process.env.DATABASE_URL || 'https://invalid.test')
if (process.env.E2E_DATABASE_CONFIRM !== 'disposable' || !['127.0.0.1','localhost'].includes(url.hostname) || url.pathname !== '/aloha_proveedor_test') throw new Error('Solo base local exclusiva aloha_proveedor_test.')
const autora = { id: 8, nombre: 'Administradora ficticia', rol: 'administradora', centro_id: 10 }
const coordinator = { id: 2, nombre: 'Coordinador ficticio', rol: 'coordinador', centros: [10] }
const datos = { centroId: 10, anio: 2026, trimestre: 3, texto: 'DB TEST: reparar servicio', categoria: 'reparacion', proveedor_preaprobado: true, proveedor_preaprobado_nombre: '  Servicio ficticio  ' }
const service = createPeticionesService({ repo })

test('migración repetible y repositorio real: borrador, cambio de nombre, envío concurrente, aprobación y límites de rol', async () => {
  const ddl = readFileSync('db/migrations/2026-09-07-peticion-proveedor-preaprobado.sql','utf8')
  await withTransaction(q=>q(ddl,[]))
  await withTransaction(q=>q(ddl,[]))
  const { draft } = await service.createDraft(autora, datos)
  try {
    assert.equal(draft.proveedor_preaprobado, true)
    assert.equal(draft.proveedor_preaprobado_nombre, 'Servicio ficticio')
    const update = await service.updateDraft(autora, { ...datos, id:draft.id, proveedor_preaprobado_nombre:'Servicio corregido' })
    assert.equal(update.draft.proveedor_preaprobado_nombre, 'Servicio corregido')
    const panel = await service.listPanel(autora, datos)
    assert.equal(panel.drafts.find(p=>p.id===draft.id).proveedor_preaprobado_nombre, 'Servicio corregido')
    const result = await Promise.all([service.submitPeticion(autora,{centroId:10,id:draft.id}),service.submitPeticion(autora,{centroId:10,id:draft.id})])
    assert.deepEqual(result.map(p=>p.alreadySubmitted).sort(), [false,true])
    assert.equal(result[0].peticion.estado,'Próximo trimestre')
    await assert.rejects(service.changeStatus(autora,{centroId:10,id:draft.id,estado:'Aprobado'}),/autorizado/)
    await assert.rejects(service.changeStatus({...coordinator,centros:[11]},{centroId:10,id:draft.id,estado:'Aprobado'}),/autorizado/)
    const approved = await service.changeStatus(coordinator,{centroId:10,id:draft.id,estado:'Aprobado'})
    assert.equal(approved.peticion.cotizacion_aprobada_id,null)
    assert.equal(approved.peticion.proveedor_preaprobado_nombre,'Servicio corregido')
    const history = await sql('SELECT estado_nuevo, changed_by FROM peticion_estado_historial WHERE peticion_id=$1 ORDER BY id',[draft.id])
    assert.deepEqual(history.map(h=>h.estado_nuevo),['Próximo trimestre','Aprobado'])
    assert.equal(history[1].changed_by,2)
    await assert.rejects(sql("UPDATE peticiones SET proveedor_preaprobado_nombre='' WHERE id=$1",[draft.id]),/check constraint/)
    assert.equal((await service.changeStatus(coordinator,{centroId:10,id:draft.id,estado:'Aprobado'})).unchanged,true)
  } finally {
    await withTransaction(async q=>{await q('DELETE FROM peticion_estado_historial WHERE peticion_id=$1',[draft.id]);await q('DELETE FROM peticiones WHERE id=$1',[draft.id])})
  }
})

test('modalidad normal usa la misma persistencia y conserva mínimo de tres cotizaciones',async()=>{
  const {draft}=await service.createDraft(autora,{...datos,proveedor_preaprobado:false})
  try {
    assert.equal(draft.proveedor_preaprobado,false)
    assert.equal(draft.proveedor_preaprobado_nombre,null)
    await assert.rejects(service.submitPeticion(autora,{centroId:10,id:draft.id}),/tres cotizaciones/)
  } finally {await service.discardDraft(autora,{centroId:10,id:draft.id})}
})
