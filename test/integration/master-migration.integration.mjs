import test, {before,after} from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import pg from 'pg'
const url=process.env.USUARIOS_TEST_DATABASE_URL
if(process.env.E2E_DATABASE_CONFIRM!=='disposable'||!url||!['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Exige PostgreSQL local desechable.')
const db=new pg.Client({connectionString:url})
const schema=`master_migration_${process.pid}`
const migration=new URL('../../db/migrations/2026-09-07-master-access.sql',import.meta.url)
before(async()=>{
  await db.connect();await db.query(`CREATE SCHEMA ${schema}`);await db.query(`SET search_path TO ${schema}`)
  await db.query('CREATE TABLE usuarios(id int PRIMARY KEY,email text UNIQUE NOT NULL,rol text NOT NULL,password_hash text)')
  await db.query("INSERT INTO usuarios VALUES(2,'fperez@teamsolutionss.com','admin_general','mantener'),(5,'froberts@alohapanama.com','admin_general','mantener'),(14,'vcampos@alohapanama.com','admin_general','mantener')")
})
after(async()=>{await db.query('ROLLBACK');await db.query(`DROP SCHEMA ${schema} CASCADE`);await db.end()})
test('expansión idempotente preserva cuentas y restringe Master sin promoverlo prematuramente',async()=>{
  assert.ok(existsSync(migration),'Debe existir la migración expand compatible')
  const before=(await db.query('SELECT * FROM usuarios ORDER BY id')).rows
  await db.query(readFileSync(migration,'utf8'));await db.query(readFileSync(migration,'utf8'))
  assert.deepEqual((await db.query('SELECT id,email,rol,password_hash FROM usuarios ORDER BY id')).rows,before)
  assert.equal((await db.query('SELECT count(*)::int n FROM usuarios WHERE blocked_until IS NOT NULL')).rows[0].n,0)
  await assert.rejects(()=>db.query("UPDATE usuarios SET rol='admin_master' WHERE id=5"),/usuarios_master_email/)
  await db.query("UPDATE usuarios SET rol='admin_master' WHERE id=2")
  await assert.rejects(()=>db.query("INSERT INTO usuarios(id,email,rol) VALUES(99,'FPEREZ@TEAMSOLUTIONSS.COM','admin_master')"),/usuarios_unico_master/)
  await db.query("INSERT INTO usuario_acceso_historial(user_id,actor_id,action,motivo) VALUES(5,2,'block','Verificación de auditoría')")
  await db.query('DELETE FROM usuarios WHERE id=5')
  assert.equal((await db.query('SELECT user_id FROM usuario_acceso_historial')).rows[0].user_id,5)
})
