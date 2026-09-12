import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { resolveNeonE2EConfig } from '../lib/neon-e2e-config.mjs'

export async function runThresholdMigration(client, { apply = false, log = console.log } = {}) {
  const { rows: [report] } = await client.query(`SELECT
    count(*)::int AS campanas,
    count(*) FILTER (WHERE c.anio=EXTRACT(YEAR FROM now() AT TIME ZONE 'America/Panama')::int
      AND c.mes=EXTRACT(MONTH FROM now() AT TIME ZONE 'America/Panama')::int
      AND NOT EXISTS (SELECT 1 FROM mes_kpi m WHERE m.centro_id=c.centro_id AND m.year=c.anio AND m.month=c.mes AND m.estado<>'abierto'))::int AS vigentes_abiertas
    FROM encuesta_campanas c`)
  log(JSON.stringify({modo:apply?'aplicar':'solo-lectura',...report}))
  if (!apply) return { applied:false, report }
  try {
    await client.query(readFileSync(new URL('../db/migrations/2026-09-12-encuestas-30.sql',import.meta.url),'utf8'))
    log('Meta inclusiva de 30% activada para campañas nuevas y el mes vigente abierto. Los históricos conservan su regla y sus resultados.')
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
  if(process.argv.slice(2).some(x=>x!=='--apply'))throw new Error('Uso: node scripts/migrate-encuestas-30.mjs [--apply]')
  neonConfig.webSocketConstructor=ws
  const transport=resolveNeonE2EConfig(process.env)
  if(transport)for(const key of ['wsProxy','useSecureWebSocket','forceDisablePgSSL','pipelineTLS','pipelineConnect'])neonConfig[key]=transport[key]
  const pool=new Pool({connectionString:process.env.DATABASE_URL}),client=await pool.connect()
  try {await runThresholdMigration(client,{apply:process.argv.includes('--apply')})}
  finally {client.release();await pool.end()}
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url)await main()
