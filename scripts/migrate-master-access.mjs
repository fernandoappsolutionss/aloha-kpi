import {readFileSync} from 'node:fs'
import {Pool,neonConfig} from '@neondatabase/serverless'
import ws from 'ws'
import {resolveNeonE2EConfig} from '../lib/neon-e2e-config.mjs'

if(!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL explícita.')
if(process.argv.slice(2).some(x=>x!=='--apply')) throw new Error('Uso: node --env-file=<entorno> scripts/migrate-master-access.mjs [--apply]')
neonConfig.webSocketConstructor=ws
const transport=resolveNeonE2EConfig(process.env)
if(transport) Object.assign(neonConfig,transport)
const pool=new Pool({connectionString:process.env.DATABASE_URL})
const client=await pool.connect()
try{
  const before=await client.query("SELECT rol,count(*)::int cuentas FROM usuarios GROUP BY rol ORDER BY rol")
  console.log(JSON.stringify({mode:process.argv.includes('--apply')?'apply':'dry-run',roles:before.rows}))
  if(process.argv.includes('--apply')){
    await client.query(readFileSync(new URL('../db/migrations/2026-09-07-master-access.sql',import.meta.url),'utf8'))
    const after=await client.query("SELECT rol,count(*)::int cuentas FROM usuarios GROUP BY rol ORDER BY rol")
    if(JSON.stringify(before.rows)!==JSON.stringify(after.rows)) throw new Error('La comprobación de roles cambió; revisar concurrencia antes del bootstrap.')
    console.log('Expansión Master instalada; roles y bloqueos iniciales sin aplicar.')
  }
}catch(error){await client.query('ROLLBACK').catch(()=>{});throw error}
finally{client.release();await pool.end()}
