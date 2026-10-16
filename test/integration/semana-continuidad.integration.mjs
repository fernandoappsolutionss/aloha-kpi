import test, { before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import pg from 'pg'
import { cargarPlan, asignarCondicionEn, agregarObjetivoEn, editarObjetivoEn, marcarObjetivoEn, verificarObjetivoEn } from '../../lib/plan-semana-servicio.js'

const url = process.env.ALOHA_SEMANA_TEST_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith('_test')) throw new Error('Base local exclusiva _test requerida.')
const pool = new pg.Pool({ connectionString: url })
const tag = client => async (parts, ...values) => (await client.query(parts.reduce((s,p,i) => s+(i ? `$${i}` : '')+p, ''), values)).rows
const query = tag(pool)
const transaction = async work => {
  const client = await pool.connect()
  try { await client.query('BEGIN ISOLATION LEVEL READ COMMITTED'); const result=await work(tag(client)); await client.query('COMMIT'); return result }
  catch(e) { await client.query('ROLLBACK'); throw e } finally { client.release() }
}
const FIN='2026-10-15'
const opts={query,transaction,sesion:{id:1,rol:'admin_master'},now:new Date('2026-10-16T16:00:00Z')}
const accion=paso=>({seccion:'formula',paso,texto:`Acción ${paso+1}`,responsable:'QA',fecha:'2026-10-20',evidencia_esperada:'Registro fechado'})

before(async()=>{
  for(const file of ['schema.sql','migrations/2026-10-01-estadisticas-semana.sql','migrations/2026-10-01-plan-semana.sql','migrations/2026-10-02-ruta-plan-integrado.sql','migrations/2026-10-16-semana-continuidad.sql','migrations/2026-10-16-semana-continuidad.sql']) await pool.query(readFileSync(new URL(`../../db/${file}`,import.meta.url),'utf8'))
})
beforeEach(async()=>{
  await pool.query('TRUNCATE centros, usuarios RESTART IDENTITY CASCADE')
  await pool.query("INSERT INTO centros(nombre) VALUES ('Centro QA'),('Otro centro QA')")
  await pool.query("INSERT INTO usuarios(nombre,email,rol,centro_id) VALUES ('Master','fperez@teamsolutionss.com','admin_master',1)")
  await pool.query("INSERT INTO estadisticas_semana(centro_id,semana_fin,codigo,valor,estado) VALUES (1,'2026-09-24','ninos_activos',100,'cerrada'),(1,'2026-10-01','ninos_activos',101,'cerrada'),(1,'2026-10-08','ninos_activos',102,'cerrada'),(1,'2026-10-15','ninos_activos',103,'cerrada')")
})
after(async()=>{await pool.end()})

test('salto de semanas, contenedor vacío y aperturas concurrentes conservan pendientes sin duplicar',async()=>{
  const [anterior]=await query`INSERT INTO semana_planes(centro_id,semana_fin,condicion,arrastre_version,pendientes_copiados_at) VALUES (1,'2026-09-24','normal',1,now()) RETURNING *`
  const [original]=await query`INSERT INTO semana_objetivos(plan_id,seccion,paso,texto,responsable,fecha,evidencia_esperada) VALUES (${anterior.id},'formula',0,'Contactar familias','QA','2026-10-01','Citas confirmadas') RETURNING *`
  await query`INSERT INTO semana_planes(centro_id,semana_fin,pendientes_copiados_at) VALUES (1,'2026-10-08',now())`
  const planes=await Promise.all([cargarPlan(1,FIN,opts),cargarPlan(1,FIN,opts)])
  assert.equal(planes[0].objetivos.length,4)
  assert.equal(planes[1].objetivos.length,4)
  const copied=planes[0].objetivos.find(o=>o.origen_objetivo_id===original.id)
  assert.equal(copied.origen_formula.semanaFin,'2026-09-24')
  assert.equal(copied.origen_formula.nombre,'Normal')
  assert.equal(copied.origen_formula.paso,0)
  // Reparar un plan legado ya abierto tampoco duplica sus arrastres.
  await query`UPDATE semana_planes SET arrastre_version=0 WHERE id=${planes[0].plan.id}`
  assert.equal((await cargarPlan(1,FIN,opts)).objetivos.length,4)
  assert.equal((await query`SELECT hecho FROM semana_objetivos WHERE id=${original.id}`)[0].hecho,false)
})

test('acciones fuera de orden se rechazan; evidencia, revisión y cambio de fórmula conservan su origen',async()=>{
  await asignarCondicionEn(1,FIN,{condicion:'normal',fundamento:'Cierres comparables de 100 a 103'},opts)
  const acciones=[]
  for(let paso=0;paso<4;paso++) acciones.push(await agregarObjetivoEn(1,FIN,accion(paso),opts))
  await assert.rejects(marcarObjetivoEn(1,acciones[1].id,true,{...opts,evidencia:'Hecho'}),/paso 1/)
  const hecha=await marcarObjetivoEn(1,acciones[0].id,true,{...opts,evidencia:'Tres citas confirmadas'})
  await verificarObjetivoEn(1,hecha.id,{...opts,actorId:1,revision:{hechoAt:hecha.hecho_at,evidencia:hecha.evidencia_resultado}})
  const cambiado=await asignarCondicionEn(1,FIN,{condicion:'emergencia',fundamento:'Revisión de contexto'},opts)
  const viejo=cambiado.objetivos.find(o=>o.id===acciones[1].id)
  assert.equal(viejo.seccion,'urgente')
  assert.equal(viejo.origen_formula.nombre,'Normal')
  assert.equal(viejo.origen_formula.paso,1)
  assert.ok(cambiado.objetivos.find(o=>o.id===hecha.id).verificado_at)
  const nueva=await agregarObjetivoEn(1,FIN,accion(0),opts)
  await assert.rejects(marcarObjetivoEn(1,nueva.id,true,{...opts,evidencia:'Hecho'}),/fórmula anterior de Normal/)
  for(const a of acciones.slice(1)) await marcarObjetivoEn(1,a.id,true,{...opts,evidencia:'Resultado comprobable'})
  await marcarObjetivoEn(1,nueva.id,true,{...opts,evidencia:'Nueva acción comprobable'})
  await assert.rejects(marcarObjetivoEn(2,nueva.id,true,{...opts,evidencia:'No corresponde'}),/No autorizado/)
})

test('cambiar una fórmula incompleta conserva pasos sin acción como recordatorios editables',async()=>{
  await asignarCondicionEn(1,FIN,{condicion:'normal',fundamento:'Lectura inicial'},opts)
  await agregarObjetivoEn(1,FIN,accion(0),opts)
  const plan=await asignarCondicionEn(1,FIN,{condicion:'emergencia',fundamento:'Contexto revisado'},opts)
  assert.equal(plan.objetivos.length,4)
  const segundo=plan.objetivos.find(o=>o.origen_formula?.paso===1)
  assert.equal(segundo.responsable,null)
  await editarObjetivoEn(1,segundo.id,accion(1),opts)
  const recargado=await cargarPlan(1,FIN,opts)
  assert.equal(recargado.objetivos.find(o=>o.id===segundo.id).origen_formula.paso,1)
  await assert.rejects(marcarObjetivoEn(1,segundo.id,true,{...opts,evidencia:'Resultado'}),/paso 1/)
})
