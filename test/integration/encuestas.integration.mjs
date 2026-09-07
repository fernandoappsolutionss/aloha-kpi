import test from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import {readFileSync} from 'node:fs'
import {crearServicioEncuestas} from '../../lib/encuestas/service.mjs'
import {runMigration} from '../../scripts/migrate-encuestas.mjs'
const url=process.env.ENCUESTAS_TEST_DATABASE_URL
if(!url || !['localhost','127.0.0.1'].includes(new URL(url).hostname) || !new URL(url).pathname.endsWith('_test'))throw new Error('Esta prueba solo corre en una base local cuyo nombre termina en _test.')
const pool=new pg.Pool({connectionString:url,max:12})
pg.types.setTypeParser(1082,x=>x)
const tag=db=>async(strings,...values)=>{
  const text=strings.reduce((s,x,i)=>s+(i?`$${i}`:'')+x,'')
  return (await db.query(text,values)).rows
}
const query=tag(pool)
const transaction=async work=>{const c=await pool.connect();try{await c.query('BEGIN');const r=await work(tag(c));await c.query('COMMIT');return r}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
let reloj=new Date('2026-09-07T13:00:00Z')
const svc=crearServicioEncuestas({query,transaction,now:()=>reloj})
const respuesta={general:4,avance:5,coach:4,atencion:3,consentimiento:true}
let centro,user,grupo,campana,participantes
test('sistema mensual contra PostgreSQL real',async t=>{
  await pool.query(readFileSync(new URL('../../db/schema.sql',import.meta.url),'utf8'))
  await pool.query(readFileSync(new URL('../../db/migrations/2026-09-07-encuestas.sql',import.meta.url),'utf8'))
  await t.test('migración repetible',async()=>{await pool.query(readFileSync(new URL('../../db/migrations/2026-09-07-encuestas.sql',import.meta.url),'utf8'))})
  await t.test('el comando de migración empieza en solo lectura',async()=>{
    const result=await runMigration(pool,{log:()=>{}})
    assert.equal(result.applied,false);assert.equal(result.report.instalada,true)
  })
  ;[centro]=await query`INSERT INTO centros(nombre) VALUES('Centro ficticio de pruebas') RETURNING *`
  ;[user]=await query`INSERT INTO usuarios(nombre,email,rol,centro_id) VALUES('Administradora ficticia',${`encuestas-${centro.id}@example.test`},'administradora',${centro.id}) RETURNING *`
  ;[grupo]=await query`INSERT INTO grupos(centro_id,numero,fecha_inicio_clases) VALUES(${centro.id},'TEST-1','2026-08-01') RETURNING *`
  for(let i=1;i<=4;i++)await query`INSERT INTO estudiantes(centro_id,grupo_id,nombre,telefono,fecha_inscripcion) VALUES(${centro.id},${grupo.id},${`Niño Prueba ${i}`},${i===4?null:`6000000${i}`},'2026-08-01')`
  await query`INSERT INTO estudiantes(centro_id,grupo_id,nombre,telefono,fecha_inscripcion) VALUES(${centro.id},${grupo.id},'Venta futura','60000009','2026-10-01')`
  await query`INSERT INTO estudiantes(centro_id,grupo_id,nombre,telefono,fecha_inscripcion,estado,retiro_programado_para) VALUES(${centro.id},${grupo.id},'Baja ya efectiva','60000008','2026-08-01','baja_potencial','2026-09-07')`
  await t.test('leer no crea campaña; excluye inicio futuro y retiro ya efectivo aunque falte ejecutar el cron',async()=>{
    const d=await svc.cargar(centro.id,2026,9);assert.equal(d.resumen.activos,4);assert.equal(d.campana,null)
  })
  await t.test('dos aperturas concurrentes conservan un único token y un solo corte',async()=>{
    const [a,b]=await Promise.all([svc.preparar(centro.id,2026,9),svc.preparar(centro.id,2026,9)])
    assert.equal(a.token,b.token);campana=a
    const d=await svc.cargar(centro.id,2026,9);assert.equal(d.participantes.length,4);participantes=d.participantes
    assert.equal('identity_salt' in d.campana,false);assert.equal('identity_hash' in participantes[0],false)
  })
  await t.test('no expone el padrón por el enlace público y el token ajeno falla',async()=>{
    assert.deepEqual(Object.keys(await svc.publica(campana.token)).sort(),['abierta','anio','individual','mes','nombre','version'])
    assert.equal(await svc.publica(campana.token,'f'.repeat(48)),null)
    assert.equal(await svc.publica('123'),null)
  })
  await t.test('identidad incorrecta no aumenta participación',async()=>{
    await assert.rejects(svc.responder(campana.token,{...respuesta,nombre:'Niño Prueba 1',telefono:'69999999'},'test-ip'),/validar/)
    assert.equal((await svc.cargar(centro.id,2026,9)).resumen.respuestas,0)
  })
  await t.test('misma respuesta concurrente es idempotente y no se sobrescribe',async()=>{
    const input={...respuesta,nombre:'NINO PRUEBA 1',telefono:'+507 6000-0001'}
    await Promise.all([svc.responder(campana.token,input,'test-ip'),svc.responder(campana.token,input,'test-ip')])
    await svc.responder(campana.token,{...input,general:1},'test-ip')
    const d=await svc.cargar(centro.id,2026,9);assert.equal(d.resumen.respuestas,1);assert.equal(d.respuestas[0].general,4)
  })
  await t.test('exactamente 50% no cumple ni inventa mes registrado',async()=>{
    await svc.registrarDifusion(centro.id,campana.id,'copiar',user.id)
    await svc.responder(campana.token,{...respuesta,individual:participantes[1].token},'test-ip')
    const d=await svc.cargar(centro.id,2026,9);assert.equal(d.resumen.respuestas,2);assert.equal(d.resumen.cumple,false)
    const rows=await query`SELECT cu.* FROM cumplimiento cu JOIN trimestres t ON t.id=cu.trimestre_id WHERE t.centro_id=${centro.id}`;assert.equal(rows.length,0)
  })
  await t.test('más del 50% marca el mes correcto sin clic en Guardar',async()=>{
    await svc.responder(campana.token,{...respuesta,individual:participantes[2].token},'test-ip')
    const d=await svc.cargar(centro.id,2026,9);assert.equal(d.resumen.cumple,true)
    const [row]=await query`SELECT cu.*,t.anio,t.trimestre FROM cumplimiento cu JOIN trimestres t ON t.id=cu.trimestre_id WHERE t.centro_id=${centro.id}`
    assert.equal(row.anio,2026);assert.equal(row.trimestre,3);assert.equal(row.mes,3);assert.equal(row.encuestas_satisfaccion,'si')
  })
  await t.test('guardar otro criterio preserva encuesta; intento de manipularla se recalcula',async()=>{
    await query`UPDATE cumplimiento cu SET brochure='si',encuestas_satisfaccion='no' FROM trimestres t WHERE t.id=cu.trimestre_id AND t.centro_id=${centro.id}`
    const [r]=await query`SELECT cu.* FROM cumplimiento cu JOIN trimestres t ON t.id=cu.trimestre_id WHERE t.centro_id=${centro.id}`
    assert.equal(r.encuestas_satisfaccion,'si');assert.equal(r.brochure,'si')
  })
  await t.test('agosto conserva el criterio manual incluso al repetir la migración',async()=>{
    const [trim]=await query`SELECT id FROM trimestres WHERE centro_id=${centro.id} AND anio=2026 AND trimestre=3`
    await query`INSERT INTO cumplimiento(trimestre_id,mes,encuestas_satisfaccion) VALUES(${trim.id},2,'si')`
    assert.equal((await runMigration(pool,{apply:true,log:()=>{}})).applied,true)
    const rows=await query`SELECT mes,encuestas_satisfaccion FROM cumplimiento WHERE trimestre_id=${trim.id} ORDER BY mes`
    assert.deepEqual(rows.map(r=>r.encuestas_satisfaccion),['si','si'])
  })
  await t.test('sin teléfono, el enlace individual es suficiente; el corte queda fijo',async()=>{
    await svc.responder(campana.token,{...respuesta,individual:participantes[3].token},'test-ip')
    await query`UPDATE estudiantes SET estado='retirado' WHERE id=(SELECT estudiante_id FROM encuesta_participantes WHERE id=${participantes[3].id})`
    const d=await svc.cargar(centro.id,2026,9);assert.equal(d.resumen.activos,4);assert.equal(d.resumen.respuestas,4)
  })
  await t.test('no admite distribución por centro ajeno ni payload inválido',async()=>{
    await assert.rejects(svc.registrarDifusion(centro.id+99999,campana.id,'copiar',user.id),/no disponible/)
    await assert.rejects(svc.responder(campana.token,{...respuesta,general:6,individual:participantes[0].token},'test-ip'),/cuatro preguntas/)
  })
  await t.test('enlace permanente usa el token inicial de la sede y no expone fichas',async()=>{
    const c=await svc.preparar(centro.id,2026,9)
    assert.equal(c.token_permanente,campana.token)
    assert.equal((await svc.cargar(centro.id,2026,9)).campana.token_permanente,campana.token)
    const actual=await svc.vigente(c.token_permanente)
    assert.equal(actual.token,campana.token)
    assert.deepEqual(Object.keys(actual).sort(),['datos','token'])
    assert.deepEqual(Object.keys(actual.datos).sort(),['abierta','anio','individual','mes','nombre','version'])
    assert.equal(await svc.vigente('123'),null)
    assert.equal(await svc.vigente('f'.repeat(48)),null)
    assert.equal(await svc.vigente(participantes[0].token),null)
  })
  await t.test('el mismo QR respeta medianoche de Panamá y abre un único corte nuevo',async()=>{
    reloj=new Date('2026-10-01T04:59:59Z')
    assert.equal((await svc.vigente(campana.token)).token,campana.token)
    reloj=new Date('2026-10-01T05:00:00Z')
    const [a,b]=await Promise.all([svc.vigente(campana.token),svc.vigente(campana.token)])
    assert.notEqual(a.token,campana.token);assert.equal(a.token,b.token)
    assert.equal(a.datos.mes,10);assert.equal(a.datos.abierta,true)
    const d=await svc.cargar(centro.id,2026,10)
    assert.equal(d.campana.token_permanente,campana.token)
    assert.equal(d.resumen.activos,4) // sale el retirado y entra la venta cuyo inicio ya llegó
    assert.equal(d.resumen.respuestas,0);assert.equal(d.resumen.compartida,false);assert.equal(d.resumen.cumple,false)
    assert.equal((await query`SELECT id FROM encuesta_campanas WHERE centro_id=${centro.id} AND anio=2026 AND mes=10`).length,1)
    assert.equal((await svc.vigente(a.token)).token,a.token) // cualquier alias emitido conserva la sede
  })
  await t.test('al cambiar el mes, la encuesta anterior cierra y no se arrastra',async()=>{
    reloj=new Date('2026-10-01T05:00:01Z')
    assert.equal((await svc.publica(campana.token)).abierta,false)
    await assert.rejects(svc.responder(campana.token,{...respuesta,individual:participantes[0].token},'test-ip'),/cerrada/)
    await assert.rejects(svc.registrarDifusion(centro.id,campana.id,'copiar',user.id),/cerrada/)
    const d=await svc.cargar(centro.id,2026,10);assert.notEqual(d.campana.token,campana.token);assert.equal(d.resumen.respuestas,0)
    const c=await svc.preparar(centro.id,2026,10);assert.notEqual(c.token,campana.token)
    assert.equal(c.token_permanente,campana.token)
    // El intento de marcar manualmente un nuevo mes sigue en no.
    const [trim]=await query`SELECT id FROM trimestres WHERE centro_id=${centro.id} AND anio=2026 AND trimestre=4`
    await query`INSERT INTO cumplimiento(trimestre_id,mes,encuestas_satisfaccion) VALUES(${trim.id},1,'si')`
    const [cu]=await query`SELECT encuestas_satisfaccion FROM cumplimiento WHERE trimestre_id=${trim.id} AND mes=1`;assert.equal(cu.encuestas_satisfaccion,'no')
  })
  await t.test('mayoría sin copia o descarga sigue pendiente; registrar QR sincroniza de inmediato',async()=>{
    const d=await svc.cargar(centro.id,2026,10)
    for(const p of d.participantes.slice(0,d.resumen.necesarias))await svc.responder(d.campana.token,{...respuesta,individual:p.token},'octubre-ip')
    const antes=await svc.cargar(centro.id,2026,10);assert.equal(antes.resumen.cumple,false);assert.equal(antes.resumen.faltan,0)
    await svc.registrarDifusion(centro.id,d.campana.id,'qr',user.id)
    assert.equal((await svc.cargar(centro.id,2026,10)).resumen.cumple,true)
  })
  await t.test('más de 60 intentos en diez minutos queda limitado sin memoria de proceso',async()=>{
    const [c]=await query`SELECT * FROM encuesta_campanas WHERE id=${campana.id}`
    const {createHash}=await import('node:crypto')
    const clave=createHash('sha256').update(`${c.identity_salt}:limited-ip`).digest('hex'),ventana=Math.floor(reloj.getTime()/600000)
    await query`INSERT INTO encuesta_intentos(campana_id,clave,ventana,intentos) VALUES(${c.id},${clave},${ventana},60)`
    await assert.rejects(svc.responder(campana.token,{...respuesta,individual:participantes[0].token},'limited-ip'),/demasiados intentos/)
  })
  await t.test('QR de otra sede nunca abre este centro; sin activos no crea campañas vacías',async()=>{
    const [otro]=await query`INSERT INTO centros(nombre) VALUES('Otra sede ficticia') RETURNING id`
    const [g]=await query`INSERT INTO grupos(centro_id,numero,fecha_inicio_clases) VALUES(${otro.id},'OTRO','2026-08-01') RETURNING id`
    await query`INSERT INTO estudiantes(centro_id,grupo_id,nombre,telefono,fecha_inscripcion) VALUES(${otro.id},${g.id},'Otra ficha','60000007','2026-08-01')`
    const c=await svc.preparar(otro.id,2026,10)
    assert.notEqual(c.token_permanente,campana.token)
    assert.equal((await svc.vigente(c.token_permanente)).datos.nombre,'Otra sede ficticia')
    await assert.rejects(svc.responder(c.token,{...respuesta,individual:participantes[0].token},'test-ip'),/validar/)
    await query`UPDATE estudiantes SET estado='retirado' WHERE centro_id=${otro.id}`
    reloj=new Date('2027-01-01T05:00:00Z')
    await assert.rejects(svc.vigente(c.token_permanente),/No hay niños activos/)
    assert.equal((await query`SELECT id FROM encuesta_campanas WHERE centro_id=${otro.id} AND anio=2027`).length,0)
    const enero=await svc.vigente(campana.token)
    assert.equal(enero.datos.anio,2027);assert.equal(enero.datos.mes,1)
    assert.equal((await svc.preparar(centro.id,2027,1)).token_permanente,campana.token)
    assert.equal((await svc.cargar(centro.id,2026,9)).resumen.respuestas,4)
  })
}).finally(async()=>{await pool.end()})
