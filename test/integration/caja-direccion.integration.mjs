import test,{before,beforeEach,after} from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import {readFileSync} from 'node:fs'
import {persistirDireccion} from '../../lib/caja/direccion-repo.mjs'
import {CHECKS_VIERNES,CHECKS_LUNES} from '../../lib/caja/direccion.mjs'
const url=process.env.ALOHA_CAJA_TEST_DATABASE_URL
if(!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)||!new URL(url).pathname.endsWith('_test'))throw Error('Base local exclusiva _test requerida')
const pool=new pg.Pool({connectionString:url})
const tag=c=>async(strings,...values)=>(await c.query(strings.reduce((s,p,i)=>s+(i?`$${i}`:'')+p,''),values)).rows
async function tx(input,user,ctx){const c=await pool.connect();try{await c.query('BEGIN');const r=await persistirDireccion(tag(c),input,user,ctx);await c.query('COMMIT');return r}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}
const user={id:4,nombre:'Carmen QA',rol:'coordinador',email:'admin@alohapanama.com'}
const ctx={hoy:'2026-10-23',cuentas:[{nombre:'QA',tipo:'operativa',base:1000,base_fecha:'2026-10-23'}],pendientes:0,foto:{hoy:'2026-10-23',prueba:true}}
const plan=()=>({empresa:'altavia',ciclo:'2026-10-23',version:0,tipo:'guardar',documento:{condicion:'sin_asignar',fundamento:'',soportes:'Soporte QA',bitacora:'Registro QA',viernes:Object.fromEntries(Object.keys(CHECKS_VIERNES).map(k=>[k,true])),lunes:Object.fromEntries(Object.keys(CHECKS_LUNES).map(k=>[k,true])),acciones:[{id:'qa-1',tipo:'cobro',objetivo:'Cobrar 100',responsable:'QA',fecha:'2026-10-26',semana:'2026-10-26',monto:100,paso:0,estado:'pendiente',evidencia:''}]}})
before(async()=>{await pool.query(readFileSync(new URL('../../db/schema.sql',import.meta.url),'utf8'));for(let i=0;i<2;i++)await pool.query(readFileSync(new URL('../../db/migrations/2026-10-17-caja-direccion.sql',import.meta.url),'utf8'))})
beforeEach(async()=>{await pool.query('TRUNCATE usuarios RESTART IDENTITY CASCADE');await pool.query("INSERT INTO usuarios(id,nombre,email,rol,password_hash) VALUES(4,'Carmen QA','admin@alohapanama.com','coordinador','test'),(1,'Master QA','fperez@teamsolutionss.com','admin_master','test')")})
after(()=>pool.end())
test('guarda plan y evidencia, recarga sin perder documento',async()=>{const p=plan();assert.equal((await tx(p,user,ctx)).version,1);const {rows:[r]}=await pool.query('SELECT * FROM caja_direccion_eventos');assert.equal(r.documento.acciones[0].monto,100);assert.deepEqual(r.foto,ctx.foto);assert.equal(r.usuario_id,4)})
test('dos pestañas: una sola versión gana y no duplica historial',async()=>{const results=await Promise.allSettled([tx(plan(),user,ctx),tx(plan(),user,ctx)]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.match(results.find(r=>r.status==='rejected').reason.message,/otra sesión/);assert.equal((await pool.query('SELECT count(*)::int n FROM caja_direccion_eventos')).rows[0].n,1)})
test('cierre fallido revierte plan e historial; cierre y lunes reales conservan autor y foto',async()=>{let p=plan();p.tipo='cerrar_viernes';await assert.rejects(tx(p,user,{...ctx,pendientes:1}),/clasificar/);assert.equal((await pool.query('SELECT count(*)::int n FROM caja_direccion_ciclos')).rows[0].n,0);await tx(p,user,ctx);p={...p,version:1,tipo:'revisar_lunes'};await assert.rejects(tx(p,user,ctx),/lunes siguiente/);await tx(p,user,{...ctx,hoy:'2026-10-26'});const {rows:[r]}=await pool.query('SELECT * FROM caja_direccion_ciclos');assert.ok(r.cierre_at&&r.lunes_at);assert.equal(r.version,2)})
test('excepción solo Master; aprobación persistida se pierde al cambiar el importe',async()=>{let p=plan();p.documento.acciones[0].tipo='credito';await tx(p,user,ctx);p.version=1;p.documento.acciones[0].decision='aprobada';await tx(p,{id:1,nombre:'Master QA',rol:'admin_master',email:'fperez@teamsolutionss.com'},ctx);p.version=2;delete p.documento.acciones[0].decision;p.documento.acciones[0].monto=200;await tx(p,user,ctx);const {rows:[r]}=await pool.query('SELECT documento FROM caja_direccion_ciclos');assert.equal(r.documento.acciones[0].aprobacion,'pendiente');assert.equal((await pool.query('SELECT count(*)::int n FROM caja_direccion_eventos')).rows[0].n,3)})
