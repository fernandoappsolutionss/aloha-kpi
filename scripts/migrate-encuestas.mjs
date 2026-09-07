import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { resolveNeonE2EConfig } from '../lib/neon-e2e-config.mjs'

export async function runMigration(client, { apply = false, log = console.log } = {}) {
  const { rows: [report] } = await client.query(`SELECT
    to_regclass('public.encuesta_campanas') IS NOT NULL AS instalada,
    count(*)::int AS meses_desde_lanzamiento,
    count(*) FILTER (WHERE cu.encuestas_satisfaccion='si')::int AS marcados_si
    FROM cumplimiento cu JOIN trimestres t ON t.id=cu.trimestre_id
    WHERE t.anio*100+(t.trimestre-1)*3+cu.mes >= 202609`)
  log(JSON.stringify({modo:apply?'aplicar':'solo-lectura',...report}))
  if (!apply) return { applied:false, report }
  try {
    // El archivo incluye BEGIN/COMMIT, candado y timeout. No dividir por punto y coma.
    await client.query(readFileSync(new URL('../db/migrations/2026-09-07-encuestas.sql',import.meta.url),'utf8'))
    log('Encuestas activadas. Los meses anteriores a septiembre de 2026 conservan su criterio manual.')
    return { applied:true, report }
  } catch (error) {
    await client.query('ROLLBACK').catch(()=>{})
    throw error
  }
}

async function main() {
  try {
    const env=readFileSync(new URL('../.env.local',import.meta.url),'utf8')
    for(const line of env.split('\n')) {
      const m=line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if(m&&!process.env[m[1]])process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')
    }
  } catch { /* entorno explícito o archivo opcional */ }
  if(!process.env.DATABASE_URL)throw new Error('Falta DATABASE_URL.')
  if(process.argv.slice(2).some(x=>x!=='--apply'))throw new Error('Uso: node scripts/migrate-encuestas.mjs [--apply]')
  neonConfig.webSocketConstructor=ws
  const transport=resolveNeonE2EConfig(process.env)
  if(transport)for(const key of ['wsProxy','useSecureWebSocket','forceDisablePgSSL','pipelineTLS','pipelineConnect'])neonConfig[key]=transport[key]
  const pool=new Pool({connectionString:process.env.DATABASE_URL}),client=await pool.connect()
  try {await runMigration(client,{apply:process.argv.includes('--apply')})}
  finally {client.release();await pool.end()}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await main()
