import test from 'node:test'
import assert from 'node:assert/strict'
import { aplicarCierreDocumental, ajusteDocumentado, cierreDocumental } from '../lib/cierre-documental.mjs'
import { conCierresDocumentales } from '../lib/cierre-documental-server.js'
import { aplicarPlan, prepararPlan } from '../scripts/conciliar-cuadros-documentales.mjs'
import { buildGrowthHistory } from '../lib/growth/source.mjs'
import { buildGrowthMetrics } from '../lib/growth/metrics.mjs'

const t={mesAnterior:146,nuevos:8,reincorporados:1,retirados:8,aPagar:147,gruposActivos:19}
const source=()=>({centro_id:3,year:2026,month:9,pendienteConfirmacion:false,sourcePath:'/fuente.xlsx',summary:{ninos_inicio_mes:146,ninos_final_mes:147,nuevos_activos_mes:8,grupos_activos:19,mot_tecnica:0,mot_perdida_clase:0,mot_economico:1,mot_horario:1,mot_graduado:1,mot_otro:5},snapshot:{totales:{...t},controlGrupos:{filas:[{contadores:{...t,totalMes:147}}]},deserciones:Array(8).fill({}),royaltyRate:12,royalties:{totales:{totalNinos:147,totalNuevos:8,totalRoyalty:1764},filas:[{total:147}]},conciliacion:{version:1,tipo:'cuadro_negocio_documental',periodo:'2026-09',sha256:'a'.repeat(64),archivo:'fuente.xlsx',ajusteInicio:{cierreAnterior:145,inicioDocumento:146,diferencia:1}}}})
const summary=()=>({centro_id:3,year:2026,month:9,...source().summary})

test('cierre válido conserva cero y no se aplica al mes abierto ni a otro período',()=>{
  const s=source(),r=summary()
  assert.equal(aplicarCierreDocumental(r,s.snapshot,'cerrado').retiros_operativos_mes,8)
  assert.equal(aplicarCierreDocumental(r,s.snapshot,'abierto'),r)
  assert.equal(aplicarCierreDocumental({...r,month:10},s.snapshot,'cerrado').retiros_operativos_mes,undefined)
  s.snapshot.totales={...t,mesAnterior:138,retirados:0}
  assert.equal(cierreDocumental(s.snapshot).totales.retirados,0)
})
test('fuente corrupta, balance inválido y resumen divergente no sustituyen cifras',()=>{
  const s=source(),r=summary()
  s.snapshot.conciliacion.sha256='mal'
  assert.equal(cierreDocumental(s.snapshot),null)
  assert.equal(cierreDocumental({...source().snapshot,totales:{...t,aPagar:148}}),null)
  assert.equal(aplicarCierreDocumental({...r,ninos_final_mes:150},source().snapshot,'cerrado').retiros_operativos_mes,undefined)
})
test('lectura documental respeta centro, período, estado y no trae datos personales',async()=>{
  const r=summary()
  const result=await conCierresDocumentales([r,{...r,centro_id:6},{...r,month:10}],async(strings,...values)=>{
    assert.match(strings.join('?'),/m.estado = 'cerrado'/)
    assert.match(strings.join('?'),/jsonb_build_object/)
    assert.deepEqual(values[0],[3,6])
    return [{centro_id:3,year:2026,month:9,estado:'cerrado',datos:source().snapshot}]
  })
  assert.equal(result[0].retiros_operativos_mes,8)
  assert.equal(result[1].retiros_operativos_mes,undefined)
  assert.equal(result[2].retiros_operativos_mes,undefined)
})
test('el motor usa retiros y reincorporaciones documentales sin cambiar ventas',()=>{
  const r=aplicarCierreDocumental(summary(),source().snapshot,'cerrado')
  const [month]=buildGrowthHistory({summaries:[r],states:[{year:2026,month:9,estado:'cerrado'}],weekly:[{year:2026,month:9,nuevos_ingresos_venta:4,total_desercion:10}],reincorporations:[{year:2026,month:9,total:7}],students:[],events:[]})
  assert.equal(month.retiros,8);assert.equal(month.reincorporados,1);assert.equal(month.ventas,4)
})
test('un ajuste solo resuelve el salto exacto respaldado, nunca un cambio posterior',()=>{
  const r=aplicarCierreDocumental(summary(),source().snapshot,'cerrado')
  assert.equal(ajusteDocumentado(r,145),true)
  assert.equal(ajusteDocumentado(r,144),false)
  const previous={year:2026,month:8,closed:true,ninos_inicio_mes:145,ninos_final_mes:145,nuevos_activos_mes:0,retiros:0,reincorporados:0}
  const current={...r,closed:true,retiros:8,reincorporados:1}
  assert.equal(buildGrowthMetrics([previous,current],{currentPeriod:'2026-10'}).issues.some(i=>i.code==='stock_discontinuity'),false)
  assert.equal(buildGrowthMetrics([previous,{...current,conciliacion_cuadro:null}],{currentPeriod:'2026-10'}).issues.some(i=>i.code==='stock_discontinuity'),true)
})
test('plan conserva períodos anteriores/octubre y excluye fuentes pendientes',()=>{
  const r=summary(),base={resumen:[{...r,month:8,ninos_final_mes:145},{...r,ninos_final_mes:148},{...r,month:10}],meses:[{centro_id:3,year:2026,month:9,estado:'cerrado',cerrado_at:'2026-10-01T00:00:00Z'}],cuadros:[]}
  const plan=prepararPlan([source(),{...source(),centro_id:2,pendienteConfirmacion:true}],base,'2026-10-15T00:00:00Z')
  assert.ok(plan.changes.every(c=>c.key.centro_id===3&&c.key.month===9))
  assert.deepEqual(plan.pendientes,[2])
  assert.equal(plan.changes.find(c=>c.table==='cuadro_mensual').after.datos.conciliacion.ajusteInicio.diferencia,1)
  assert.throws(()=>prepararPlan([source(),source()],base,'now'),/duplicado/)
})

function fakeClient(row) {
  const calls=[]
  return {calls,row,async query(sql,values){calls.push(sql); if(sql.startsWith('SELECT'))return{rows:this.row?[structuredClone(this.row)]:[]};if(sql.startsWith('INSERT')){this.row={centro_id:values[0],year:values[1],month:values[2],estado:values[3],cerrado_at:values[4]};return{rows:[]}};return{rows:[]}}}
}
const plan=()=>({version:1,cutoff:202609,changes:[{table:'mes_kpi',key:{centro_id:3,year:2026,month:9},before:{centro_id:3,year:2026,month:9,estado:'abierto',cerrado_at:null},after:{centro_id:3,year:2026,month:9,estado:'cerrado',cerrado_at:'2026-10-15T00:00:00Z'}}]})
test('dry-run no escribe; un cambio concurrente aborta sin sobrescribir',async()=>{
  const p=plan(),client=fakeClient(p.changes[0].before)
  assert.equal((await aplicarPlan(client,p)).pending,1)
  assert.ok(!client.calls.some(c=>c.startsWith('INSERT')))
  const modified=fakeClient({...p.changes[0].before,estado:'cerrando'})
  await assert.rejects(aplicarPlan(modified,p,{apply:true}),/Cambió/)
  assert.equal(modified.calls.at(-1),'ROLLBACK')
})
test('respaldo obligatorio antes de escribir; falla de respaldo revierte',async()=>{
  const p=plan(),client=fakeClient(p.changes[0].before)
  await assert.rejects(aplicarPlan(client,p,{apply:true,backupPath:'/backup',writeBackup:()=>{throw Error('disco')}}),/disco/)
  assert.ok(!client.calls.some(c=>c.startsWith('INSERT')))
  assert.equal(client.calls.at(-1),'ROLLBACK')
})
test('aplicar y repetir es idempotente; octubre se rechaza',async()=>{
  const p=plan(),client=fakeClient(p.changes[0].before)
  let backups=0
  assert.equal((await aplicarPlan(client,p,{apply:true,backupPath:'/backup',writeBackup:()=>backups++})).applied,1)
  assert.equal((await aplicarPlan(client,p,{apply:true,backupPath:'/backup',writeBackup:()=>backups++})).applied,0)
  assert.equal(backups,1)
  p.changes[0].key.month=10
  await assert.rejects(aplicarPlan(client,p))
})
