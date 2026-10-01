// QA de servicios reales. Requiere exclusivamente el fixture local aloha_audit.
// source /private/tmp/aloha-semana-qa-20261001/env.sh
// node --experimental-default-type=module tests/semana-audit/integracion.mjs
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { sql, withTransaction } from '../../lib/db.js'
import { calcularSemanaCentro, guardarSemanaCentro, recalcularSemanas } from '../../lib/estadisticas-semana/servicio.js'
import { runBackfill } from '../../scripts/backfill-estadisticas-semana.mjs'
import { conciliarPoblacion } from '../../scripts/conciliar-poblacion-semanal.mjs'
import { poblacionAlCorte } from '../../lib/estadisticas-semana/calculo.mjs'
import { movimientosVivosMes } from '../../lib/inicios-clase.mjs'
import { cargarPlan, asignarCondicionEn, agregarObjetivoEn, marcarObjetivoEn, editarObjetivoEn, eliminarObjetivoEn } from '../../lib/plan-semana-servicio.js'
import { guardarCuotasEn, agregarOrdenEn } from '../../lib/cuotas-semana-servicio.js'
import { pasosDe } from '../../lib/condiciones/formulas.mjs'
import { assertCoordinacion, assertWriteCentro, assertPuedeCerrarMes, loadCurrentUser } from '../../lib/current-user.mjs'
const now = new Date('2026-10-01T15:00:00Z')
const out = process.env.SEMANA_QA_OUTPUT || '/private/tmp/aloha-semana-qa-20261001'
fs.mkdirSync(out,{recursive:true})
const report = {fecha:new Date().toISOString(),checks:[],mensual:[],semanas:[],hallazgos:[]}
const check = async (name, fn) => { try { const detalle = await fn(); report.checks.push({name,ok:true,detalle}); console.log(`PASS ${name}`) } catch(error) { report.checks.push({name,ok:false,error:error.stack}); console.error(`FAIL ${name}: ${error.message}`) } }
assert.equal(process.env.E2E_DATABASE_CONFIRM,'disposable')
assert.equal(process.env.DATABASE_URL,process.env.USUARIOS_TEST_DATABASE_URL)
const dburl = new URL(process.env.DATABASE_URL)
assert.equal(dburl.hostname,'aloha-hca-pg'); assert.equal(dburl.pathname,'/aloha_audit')
assert.equal(new URL(process.env.E2E_NEON_HTTP).hostname,'127.0.0.1')
assert.equal(process.env.CRM_API_URL,undefined);assert.equal(process.env.CRM_SERVICE_TOKEN,undefined)
const nativeFetch=globalThis.fetch
globalThis.fetch=(input,options)=>{const u=new URL(typeof input==='string'?input:input.url);assert.equal(u.hostname,'127.0.0.1','No se permiten integraciones externas en QA');return nativeFetch(input,options)}
const [identity]=await sql`SELECT current_database() db, current_user usuario`
assert.deepEqual(identity,{db:'aloha_audit',usuario:'e2e'})
const centros=await sql`SELECT id,nombre,pais FROM centros ORDER BY id`
assert.deepEqual(centros.map(c=>c.nombre),['Centro Demo Norte','Centro Demo Sur','Centro Demo Valencia'])
await check('Transportes HTTP y WebSocket reales',async()=>{assert.deepEqual(await withTransaction(q=>q`SELECT current_database() db`),[{db:'aloha_audit'}]);return identity})
await check('Backfill real 7 semanas × 3 centros × 5 estadísticas, dos ejecuciones idempotentes',async()=>{
  const logs=[];await runBackfill({apply:true,now,log:s=>logs.push(s)})
  const rows1=await sql`SELECT centro_id,semana_fin,codigo,valor,estado,detalle FROM estadisticas_semana WHERE semana_fin < '2026-10-01' ORDER BY centro_id,semana_fin,codigo`
  assert.equal(rows1.length,105);assert(rows1.every(r=>r.estado==='cerrada'))
  await runBackfill({apply:true,now,log:()=>{}})
  const rows2=await sql`SELECT centro_id,semana_fin,codigo,valor,estado,detalle FROM estadisticas_semana WHERE semana_fin < '2026-10-01' ORDER BY centro_id,semana_fin,codigo`
  assert.deepEqual(rows2,rows1);fs.writeFileSync(`${out}/backfill.log`,logs.join('\n'));return {filas:rows2.length}
})
await check('Conciliación fin de mes contra fixture y mensual vivo, con ultima_asistencia',async()=>{
  for(const c of centros){
    const estudiantes=await sql`SELECT id,grupo_id,estado,fecha_inscripcion,ultima_asistencia FROM estudiantes WHERE centro_id=${c.id}`
    const grupos=await sql`SELECT id,estado,fecha_inicio_clases,itinerario_clases FROM grupos WHERE centro_id=${c.id}`
    const eventos=await sql`SELECT * FROM estudiante_eventos WHERE centro_id=${c.id} ORDER BY fecha,id`
    const resumen=await sql`SELECT * FROM resumen_mes WHERE centro_id=${c.id} ORDER BY year,month`
    for(const r of resumen.filter(r=>r.month>=8 && r.month<=9)){
      const corte=`2026-${String(r.month).padStart(2,'0')}-${new Date(Date.UTC(2026,r.month,0)).getUTCDate()}`
      const p=poblacionAlCorte({inicioMes:r.ninos_inicio_mes,estudiantes,grupos,eventos,corte})
      const m=movimientosVivosMes({estudiantes,grupos,eventos,year:2026,month:r.month})
      const mensual=Number(r.ninos_inicio_mes)+m.totales.nuevos+m.totales.reincorporados-m.totales.retirados
      report.mensual.push({centro:c.nombre,corte,semanal:p.valor,mensual,fixture:Number(r.ninos_final_mes)})
      assert.equal(p.valor,mensual);assert.equal(p.valor,Number(r.ninos_final_mes))
      const servicio=await calcularSemanaCentro(c.id,r.month===8?'2026-09-03':'2026-10-01',{now:new Date(`${corte}T20:00:00Z`)})
      assert.equal(servicio.ninos_activos.valor,p.valor)
    }
  }
  assert.deepEqual(await conciliarPoblacion({now,log:()=>{}}),[])
  return report.mensual
})
await check('Semana abierta persiste y cron del viernes congela una sola vez',async()=>{
  const r=await recalcularSemanas({now});assert.equal(r.abiertas,3);assert.deepEqual(r.errores,[])
  // Guardar/restaurar el estado para conservar el jueves real que el navegador audita.
  const prev=await sql`SELECT * FROM estadisticas_semana WHERE semana_fin >= '2026-10-01'`
  try{
    const viernes=new Date('2026-10-02T11:00:00Z');const cierre=await recalcularSemanas({now:viernes})
    assert.equal(cierre.cerradas,3);assert.deepEqual(cierre.errores,[])
    const again=await recalcularSemanas({now:viernes});assert.equal(again.cerradas,0)
    const [n]=await sql`SELECT count(*) n FROM estadisticas_semana WHERE semana_fin='2026-10-01' AND estado='cerrada'`;assert.equal(Number(n.n),15)
  }finally{
    await sql`DELETE FROM estadisticas_semana WHERE semana_fin > '2026-10-01'`
    for(const r of prev)await sql`UPDATE estadisticas_semana SET valor=${r.valor},estado=${r.estado},detalle=${JSON.stringify(r.detalle)}::jsonb,calculado_at=${r.calculado_at} WHERE centro_id=${r.centro_id} AND semana_fin=${r.semana_fin} AND codigo=${r.codigo}`
  }
  report.semanas=await sql`SELECT centro_id,semana_fin,valor,estado FROM estadisticas_semana WHERE codigo='ninos_activos' ORDER BY centro_id,semana_fin`
})
await check('Una foto cerrada resiste actualización accidental y acepta forzar',async()=>{
  const fin='2026-09-24';const original=await calcularSemanaCentro(2,fin,{now})
  const cambiado={...original,ninos_activos:{valor:999,detalle:{qa:true}}}
  await guardarSemanaCentro(2,fin,cambiado,{estado:'cerrada'})
  const [fila]=await sql`SELECT valor FROM estadisticas_semana WHERE centro_id=2 AND semana_fin=${fin} AND codigo='ninos_activos'`;assert.equal(Number(fila.valor),original.ninos_activos.valor)
  try{await guardarSemanaCentro(2,fin,cambiado,{estado:'cerrada',forzar:true});const [f]=await sql`SELECT valor FROM estadisticas_semana WHERE centro_id=2 AND semana_fin=${fin} AND codigo='ninos_activos'`;assert.equal(Number(f.valor),999)}finally{await guardarSemanaCentro(2,fin,original,{estado:'cerrada',forzar:true})}
})
const sesiones={};for(const id of [1,2,3,4,5,6])sesiones[id]=await loadCurrentUser({uid:id},sql)
await check('Seis roles del fixture: alcance, aprobación y condición',async()=>{
  assertCoordinacion(sesiones[1],10);assertCoordinacion(sesiones[3],1)
  assert.throws(()=>assertCoordinacion(sesiones[3],10));for(const id of [2,4,5,6])assert.throws(()=>assertCoordinacion(sesiones[id],1))
  assertWriteCentro(sesiones[4],1);assertWriteCentro(sesiones[5],1)
  for(const id of [2,6])assert.throws(()=>assertWriteCentro(sesiones[id],1))
  assert.throws(()=>assertWriteCentro(sesiones[4],2));assertPuedeCerrarMes(sesiones[4]);assert.throws(()=>assertPuedeCerrarMes(sesiones[5]))
  return Object.values(sesiones).map(s=>({rol:s.rol,centro:s.centro_id,centros:s.centros}))
})
const options={sesion:sesiones[1],now};const a='2026-08-27',b='2026-09-03'
await check('Plan: condición, completitud, persistencia, cambio conserva texto y edición aislada',async()=>{
  await sql`DELETE FROM semana_planes WHERE centro_id=2 AND semana_fin IN (${a},${b})`
  let v=await cargarPlan(2,a,options);assert.equal(v.estado,'sin_condicion')
  await asignarCondicionEn(2,a,{condicion:'normal'},options)
  v=await cargarPlan(2,a,options);assert.equal(v.estado,'incompleto')
  const ids=[];for(let paso=0;paso<v.pasos.length;paso++)ids.push(await agregarObjetivoEn(2,a,{seccion:'formula',paso,texto:`QA objetivo ${paso+1}`,responsable:'Equipo demo',fecha:'2026-09-02'},options))
  assert.equal((await cargarPlan(2,a,options)).estado,'completo')
  await marcarObjetivoEn(2,ids[0].id,true);await editarObjetivoEn(2,ids[1].id,{texto:'QA texto conservado',responsable:'Demo',fecha:'2026-09-03'})
  await assert.rejects(()=>editarObjetivoEn(1,ids[1].id,{texto:'Intrusión'}),/No autorizado/)
  v=await asignarCondicionEn(2,a,{condicion:'emergencia'},options)
  assert(v.objetivos.every(o=>o.seccion==='urgente' && o.paso===null));assert(v.objetivos.some(o=>o.texto==='QA texto conservado'))
  const temporal=await agregarObjetivoEn(2,a,{seccion:'urgente',texto:'QA eliminar'},options);await eliminarObjetivoEn(2,temporal.id)
  assert(!(await cargarPlan(2,a,options)).objetivos.some(o=>String(o.id)===String(temporal.id)))
  return {objetivosConservados:v.objetivos.length,pasosEmergencia:v.pasos.length}
})
await check('Pendientes: 8 aperturas concurrentes copian una sola vez',async()=>{
  const anterior=await cargarPlan(2,a,options)
  const esperados=anterior.objetivos.filter(o=>!o.hecho).length+pasosDe({condicion:'emergencia'}).length
  const vistas=await Promise.all(Array.from({length:8},()=>cargarPlan(2,b,options)))
  for(const v of vistas){assert.equal(v.objetivos.length,esperados);assert(v.objetivos.every(o=>o.seccion==='pendiente'))}
  return {aperturas:8,pendientes:esperados}
})
await check('Lectura automática ausente para administradora/asistente, visible para gerencia',async()=>{
  for(const id of [4,5]){const v=await cargarPlan(1,'2026-09-24',{sesion:sesiones[id],now});assert(!('lectura' in v));assert(!('discrepancia' in v));assert(!('lectura_auto' in v.plan));assert(!('lectura_motivo' in v.plan))}
  const v=await cargarPlan(1,'2026-09-24',options);assert(v.lectura);assert('discrepancia' in v)
})
await check('Cuotas: propuesta, aprobación, cambio revoca aprobación y rechazo inválidos',async()=>{
  const fin='2026-10-01';await sql`DELETE FROM semana_cuotas WHERE centro_id=10 AND semana_fin=${fin}`
  const cuotas={ninos_activos:94,nuevos_inscritos:7,retiros:0,facturas_vencidas:2,cp_asistidas:1}
  let rows=await guardarCuotasEn(10,fin,cuotas,{actorId:1,now});assert(rows.every(r=>r.estado==='propuesta'))
  rows=await guardarCuotasEn(10,fin,cuotas,{actorId:1,now,aprobar:true});assert(rows.every(r=>r.estado==='aprobada'))
  rows=await guardarCuotasEn(10,fin,cuotas,{actorId:1,now});assert(rows.every(r=>r.estado==='aprobada'))
  await guardarCuotasEn(10,fin,{ninos_activos:95},{actorId:1,now});const [r]=await sql`SELECT * FROM semana_cuotas WHERE centro_id=10 AND semana_fin=${fin} AND codigo='ninos_activos'`;assert.equal(r.estado,'propuesta');assert.equal(r.aprobada_por,null);assert.equal(r.aprobada_at,null)
  for(const invalid of [-1,1.5,'',null])await assert.rejects(()=>guardarCuotasEn(10,fin,{retiros:invalid},{actorId:1,now}),/Cuota inválida/)
  await assert.rejects(()=>guardarCuotasEn(10,'2026-09-24',{retiros:1},{actorId:1,now}),/semana abierta/)
  return await sql`SELECT codigo,cuota,propuesta,estado FROM semana_cuotas WHERE centro_id=10 AND semana_fin=${fin} ORDER BY codigo`
})
await check('Orden de coordinador persiste y no se puede editar como objetivo',async()=>{
  const o=await agregarOrdenEn(2,'2026-09-24',{texto:'QA orden: revisar retiros con el equipo',fecha:'2026-10-01'},{actorId:3,now})
  assert.equal(o.seccion,'orden');await assert.rejects(()=>editarObjetivoEn(2,o.id,{texto:'Alterar orden'}),/No autorizado/)
  await sql`DELETE FROM semana_objetivos WHERE id=${o.id}`
})
// Tablas temporales de la conexión: ejercitan SQL real sin alterar el fixture compartido.
await check('Regresión de ultima_asistencia: servicio SQL concilia niño que aún no inicia',async()=>{
  return await withTransaction(async query=>{
    await query(`CREATE TEMP TABLE estudiantes (id int, centro_id int, grupo_id int, estado text, fecha_inscripcion date, ultima_asistencia date) ON COMMIT DROP`)
    await query(`CREATE TEMP TABLE grupos (id int, centro_id int, estado text, fecha_inicio_clases date, itinerario_clases jsonb) ON COMMIT DROP`)
    await query(`CREATE TEMP TABLE estudiante_eventos (id int, centro_id int, estudiante_id int, tipo text, fecha date, year int, month int, origen text, motivo text, a_grupo_id int) ON COMMIT DROP`)
    await query(`CREATE TEMP TABLE resumen_mes (centro_id int, year int, month int, ninos_final_mes int) ON COMMIT DROP`)
    await query(`INSERT INTO estudiantes VALUES (1,2,2,'activo','2026-09-01',NULL)`)
    await query(`INSERT INTO grupos VALUES (1,2,'activo','2026-09-10',NULL),(2,2,'activo','2026-10-10',NULL)`)
    await query(`INSERT INTO estudiante_eventos VALUES (1,2,1,'inscripcion','2026-09-01',2026,9,NULL,NULL,1),(2,2,1,'cambio_grupo','2026-09-12',2026,9,NULL,NULL,2)`)
    await query(`INSERT INTO resumen_mes VALUES (2,2026,8,100)`)
    const resultado=await calcularSemanaCentro(2,'2026-10-01',{query,now:new Date('2026-09-30T20:00:00Z')})
    if(resultado.ninos_activos.valor!==100)report.hallazgos.push({codigo:'ULTIMA_ASISTENCIA_SQL',esperado:100,servicio:resultado.ninos_activos})
    assert.equal(resultado.ninos_activos.valor,100,'SQL real: el servicio cuenta un niño que inicia en octubre')
    return resultado.ninos_activos
  })
})
await check('CRM inyectado: borde jueves/viernes Panamá/Caracas, canceladas y fallo preserva NULL',async()=>{
  return await withTransaction(async query=>{
    await query(`CREATE TEMP TABLE centro_eventos (centro_id int,crm_event_id text,start_date timestamptz) ON COMMIT DROP`)
    const make=(id,start_date,attended,status='completed')=>({id,start_date,status,stats:{total:attended,attended,not_attended:0,pending:0,paid:0,won:0,total_revenue:0}})
    const clases=[make('jueves-pa','2026-10-02T04:30:00Z',3),make('viernes-ve','2026-09-25T04:30:00Z',2),make('regular','2026-09-28T16:00:00Z',5),make('cancelada','2026-09-28T17:00:00Z',20,'cancelled'),make('borrador','2026-09-28T18:00:00Z',20,'draft')]
    for(const centro of [2,10])for(const c of clases)await query`INSERT INTO centro_eventos VALUES (${centro},${c.id},${c.start_date})`
    const crm=async(action,payload)=>{assert.equal(action,'list_events');return {events:clases.map(c=>({...c,account_id:payload.account_id}))}}
    const opts={query,crm,now:new Date('2026-10-02T20:00:00Z')}
    const pa=await calcularSemanaCentro(2,'2026-10-01',opts);const ve=await calcularSemanaCentro(10,'2026-10-01',opts)
    assert.equal(pa.cp_asistidas.valor,8);assert.equal(ve.cp_asistidas.valor,7)
    const fallo=await calcularSemanaCentro(2,'2026-10-01',{...opts,crm:async()=>({error:'CRM ficticio desconectado'})})
    assert.equal(fallo.cp_asistidas.valor,null);assert.match(fallo.cp_asistidas.detalle.error,/desconectado/)
    return {panama:pa.cp_asistidas,caracas:ve.cp_asistidas,fallo:fallo.cp_asistidas}
  })
})
fs.writeFileSync(`${out}/integracion-resultados.json`,JSON.stringify(report,null,2))
console.log(JSON.stringify({checks:report.checks.length,pass:report.checks.filter(c=>c.ok).length,fail:report.checks.filter(c=>!c.ok).length,resultados:`${out}/integracion-resultados.json`}))
process.exitCode=report.checks.some(c=>!c.ok)?1:0
