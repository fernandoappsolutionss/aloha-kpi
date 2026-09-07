import test, { before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
const bootstrap = await import('../../scripts/aplicar-master-access.mjs').catch(() => ({}))
const url = process.env.USUARIOS_TEST_DATABASE_URL
if (process.env.E2E_DATABASE_CONFIRM !== 'disposable' || !url || !['localhost','127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Esta prueba exige PostgreSQL local desechable.')
const db = new pg.Client({ connectionString: url })
const namespace = `master_bootstrap_${process.pid}`
before(async () => {
  await db.connect()
  await db.query(`CREATE SCHEMA ${namespace}`)
  await db.query(`SET search_path TO ${namespace}`)
  await db.query(`CREATE TABLE usuarios(id int primary key, email text unique, rol text, blocked_until timestamptz, password_hash text)`)
  await db.query('CREATE TABLE password_tokens(token text primary key,user_id int,used_at timestamptz)')
  await db.query(`CREATE TABLE usuario_acceso_historial(id serial primary key,user_id int,actor_id int,action text,previous_blocked_until timestamptz,new_blocked_until timestamptz,motivo text,created_at timestamptz default now())`)
})
beforeEach(async () => {
  await db.query('TRUNCATE usuarios,usuario_acceso_historial,password_tokens')
  await db.query(`INSERT INTO usuarios(id,email,rol,password_hash) VALUES
    (2,'fperez@teamsolutionss.com','admin_general','preservar-master'),
    (5,'froberts@alohapanama.com','admin_general','preservar-frederick'),
    (14,'vcampos@alohapanama.com','admin_general','preservar-vanessa'),
    (90,'tercero@e2e.invalid','administradora','preservar-tercero')`)
})
after(async () => { await db.query(`DROP SCHEMA ${namespace} CASCADE`); await db.end() })
const run = options => {
  assert.equal(typeof bootstrap.runMasterAccess, 'function', 'Debe existir la operación transaccional de acceso')
  return bootstrap.runMasterAccess(db, { now: new Date('2026-09-07T17:00:00Z'), log() {}, ...options })
}
test('dry-run mantiene roles, bloqueos, contraseñas y auditoría intactos', async () => {
  const before=(await db.query('SELECT * FROM usuarios ORDER BY id')).rows
  assert.equal((await run()).applied,false)
  assert.deepEqual((await db.query('SELECT * FROM usuarios ORDER BY id')).rows,before)
  assert.equal((await db.query('SELECT count(*)::int n FROM usuario_acceso_historial')).rows[0].n,0)
})
test('aplica solo tres identidades, mantiene credenciales y no duplica el bloqueo', async () => {
  await run({apply:true}); await run({apply:true})
  const rows=(await db.query('SELECT * FROM usuarios ORDER BY id')).rows
  assert.equal(rows[0].rol,'admin_master');assert.equal(rows[0].blocked_until,null)
  for(const row of rows.slice(1,3)){assert.equal(row.rol,'admin_general');assert.equal(row.blocked_until.toISOString(),'2026-09-10T05:00:00.000Z')}
  assert.equal(rows[3].rol,'administradora');assert.equal(rows[3].blocked_until,null)
  assert.deepEqual(rows.map(u=>u.password_hash),['preservar-master','preservar-frederick','preservar-vanessa','preservar-tercero'])
  assert.equal((await db.query('SELECT count(*)::int n FROM usuario_acceso_historial')).rows[0].n,2)
})
test('identidad cambiada aborta sin promover ni bloquear a nadie', async () => {
  await db.query("UPDATE usuarios SET email='cambiado@e2e.invalid' WHERE id=5")
  await assert.rejects(()=>run({apply:true}),/identidades/)
  assert.equal((await db.query("SELECT count(*)::int n FROM usuarios WHERE rol='admin_master' OR blocked_until IS NOT NULL")).rows[0].n,0)
})
test('fecha ya vencida aborta la aplicación completa', async () => {
  await assert.rejects(()=>run({apply:true,now:new Date('2026-09-10T05:00:00Z')}),/venció/)
  assert.equal((await db.query("SELECT count(*)::int n FROM usuarios WHERE rol='admin_master' OR blocked_until IS NOT NULL")).rows[0].n,0)
})
test('invalida enlaces pendientes solo de las dos cuentas bloqueadas', async () => {
  await db.query("INSERT INTO password_tokens VALUES('ficticio-master',2,NULL),('ficticio-frederick',5,NULL),('ficticio-vanessa',14,NULL)")
  await run({apply:true})
  const rows=(await db.query('SELECT user_id,used_at FROM password_tokens ORDER BY user_id')).rows
  assert.equal(rows[0].used_at,null)
  assert.ok(rows[1].used_at instanceof Date)
  assert.ok(rows[2].used_at instanceof Date)
})
test('reloj de PostgreSQL vencido prevalece sobre un reloj local atrasado', async () => {
  const client = { query: (sql, args) => sql === 'SELECT clock_timestamp() AS db_now'
    ? Promise.resolve({rows:[{db_now:new Date('2026-09-10T05:00:00Z')}]})
    : db.query(sql,args) }
  await assert.rejects(()=>bootstrap.runMasterAccess(client,{apply:true,now:new Date('2026-09-07T17:00:00Z'),log(){}}),/venció/)
  assert.equal((await db.query("SELECT count(*)::int n FROM usuarios WHERE rol='admin_master' OR blocked_until IS NOT NULL")).rows[0].n,0)
})
test('error intermedio revierte promoción, bloqueo, tokens y auditoría', async () => {
  await db.query("INSERT INTO password_tokens VALUES('ficticio-frederick',5,NULL),('ficticio-vanessa',14,NULL)")
  const before=(await db.query('SELECT * FROM usuarios ORDER BY id')).rows
  let updates=0
  const client={query:(sql,args)=>{
    if(sql.startsWith('UPDATE usuarios SET blocked_until') && ++updates===2) throw new Error('Fallo intermedio de prueba')
    return db.query(sql,args)
  }}
  await assert.rejects(()=>bootstrap.runMasterAccess(client,{apply:true,now:new Date('2026-09-07T17:00:00Z'),log(){}}),/Fallo intermedio/)
  assert.deepEqual((await db.query('SELECT * FROM usuarios ORDER BY id')).rows,before)
  assert.equal((await db.query('SELECT count(*)::int n FROM password_tokens WHERE used_at IS NOT NULL')).rows[0].n,0)
  assert.equal((await db.query('SELECT count(*)::int n FROM usuario_acceso_historial')).rows[0].n,0)
})
