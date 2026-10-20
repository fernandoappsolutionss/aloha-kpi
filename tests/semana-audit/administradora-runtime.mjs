// Next y PostgreSQL reales, exclusivos y desechables. Sin credenciales de producción.
import { spawn, execFileSync } from 'node:child_process'
import { mkdtemp, readFile, writeFile, mkdir, rm, readdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { connect, createServer as tcpServer } from 'node:net'
import { tmpdir } from 'node:os'
import { resolve, join } from 'node:path'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
import pg from 'pg'
import { WebSocketServer } from 'ws'
import bcrypt from 'bcryptjs'
import { fechaCivil, semanaAbierta, sumarDias, ultimasSemanas } from '../../lib/semana-cierre.mjs'

const out = resolve('.scratch/administradora-e2e')
if ((await readdir('.')).some(name => ['.env', '.env.local', '.env.development', '.env.development.local'].includes(name))) throw new Error('Usa un checkout sin archivos .env: esta prueba no carga credenciales externas.')
await mkdir(out, { recursive: true })
const dir = await mkdtemp(join(tmpdir(), 'aloha-admin-pg-'))
const bin = process.env.PG_BIN || '/opt/homebrew/opt/postgresql@17/bin'
const pgRun = (cmd, args) => execFileSync(join(bin, cmd), args, { stdio: 'pipe' })
const freePort = async () => { const s = tcpServer(); s.listen(0, '127.0.0.1'); await once(s, 'listening'); const port = s.address().port; await new Promise(r => s.close(r)); return port }
let pool, next, http, wss, started = false
const interrupted = Promise.race([once(process, 'SIGTERM'), once(process, 'SIGINT')])
const sockets = new Set()
const stop = async () => {
  if (next && next.exitCode == null) { next.kill('SIGTERM'); await once(next, 'exit') }
  for (const socket of sockets) socket.destroy()
  for (const client of wss?.clients || []) client.terminate()
  if (wss) await new Promise(r => wss.close(r))
  if (http) await new Promise(r => http.close(r))
  await pool?.end()
  if (started) pgRun('pg_ctl', ['-D', join(dir, 'data'), '-m', 'fast', '-w', 'stop'])
  await rm(dir, { recursive: true, force: true })
  await rm(resolve('.next/cache'), { recursive: true, force: true })
}
try {
  const port = await freePort(), nextPort = await freePort()
  pgRun('initdb', ['-D', join(dir, 'data'), '-A', 'trust', '-U', 'qa', '--no-locale'])
  pgRun('pg_ctl', ['-D', join(dir, 'data'), '-l', join(dir, 'postgres.log'), '-o', `-p ${port} -h 127.0.0.1 -k ${dir}`, '-w', 'start'])
  started = true
  pgRun('createdb', ['-h', '127.0.0.1', '-p', String(port), '-U', 'qa', 'administradora_test'])
  const database = `postgresql://qa@127.0.0.1:${port}/administradora_test`
  pool = new pg.Pool({ connectionString: database })
  for (const file of ['schema.sql', 'migrations/2026-09-03-entrenamiento-oficio.sql', 'migrations/2026-10-01-estadisticas-semana.sql', 'migrations/2026-10-01-plan-semana.sql', 'migrations/2026-10-01-cuotas-semana.sql', 'migrations/2026-10-02-ruta-plan-integrado.sql', 'migrations/2026-10-16-semana-continuidad.sql', 'migrations/2026-10-16-grupos-inicio-pendiente.sql', 'migrations/2026-10-20-semana-juegos.sql']) {
    await pool.query(await readFile(resolve('db', file), 'utf8'))
  }
  const hoy = fechaCivil(), fin = semanaAbierta(), referencia = sumarDias(fin, -7)
  const password = 'AdministradoraQA!2026', hash = await bcrypt.hash(password, 10)
  await pool.query("INSERT INTO centros(id,nombre,pais) VALUES (2,'Centro QA Administradora','PA'),(3,'Centro ajeno QA','PA')")
  await pool.query("INSERT INTO usuarios(id,nombre,email,password_hash,rol,centro_id) VALUES (101,'Administradora QA','admin@e2e.invalid',$1,'administradora',2),(102,'Coordinador QA','coord@e2e.invalid',$1,'coordinador',NULL)", [hash])
  await pool.query('INSERT INTO usuario_centros(usuario_id,centro_id) VALUES (102,2)')
  for (const week of ultimasSemanas(referencia, 12)) for (const [codigo, valor] of Object.entries({ ninos_activos: 100, nuevos_inscritos: 2, retiros: 0, facturas_vencidas: 3, cp_asistidas: 4 })) await pool.query("INSERT INTO estadisticas_semana(centro_id,semana_fin,codigo,valor,estado) VALUES (2,$1,$2,$3,'cerrada')", [week, codigo, valor])
  for (let i = 0; i < 2; i++) {
    const { rows: [student] } = await pool.query("INSERT INTO estudiantes(centro_id,nombre,itinerario,estado,fecha_inscripcion) VALUES (2,$1,'TINY','activo',$2) RETURNING id", [`Alumno ficticio ${i}`, hoy])
    await pool.query("INSERT INTO estudiante_eventos(estudiante_id,centro_id,tipo,fecha,year,month) VALUES ($1,2,'inscripcion',$2,$3,$4)", [student.id, hoy, Number(hoy.slice(0,4)), Number(hoy.slice(5,7))])
  }
  await pool.query('INSERT INTO cobranza_diaria(centro_id,fecha,vencidas) VALUES (2,$1,3)', [hoy])
  // Adaptador de transporte Neon: todas las consultas se ejecutan en PostgreSQL local.
  http = createServer(async (req, res) => {
    try {
      let raw = ''; for await (const chunk of req) { raw += chunk; if (raw.length > 5e6) throw new Error('Solicitud demasiado grande') }
      const body = JSON.parse(raw || '{}')
      if (req.url === '/api/integrations/aloha') {
        if (body.action !== 'list_events') throw new Error('CRM QA solo admite leer eventos vacíos')
        res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ events: [] })); return
      }
      if (req.headers['neon-connection-string'] !== database) throw new Error('Base ajena rechazada')
      const q = async item => {
        const result = await pool.query({ text: item.query, values: item.params, rowMode: 'array', types: { getTypeParser: () => value => value } })
        return { command: result.command, rowCount: result.rowCount, rows: result.rows, fields: result.fields }
      }
      if (body.queries) throw new Error('Usar WebSocket para transacciones locales')
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(await q(body)))
    } catch (error) { console.error('QA transport:', error.message); res.writeHead(500); res.end(JSON.stringify({ message: error.message, code: error.code })) }
  })
  wss = new WebSocketServer({ server: http, path: '/v1' })
  wss.on('connection', socket => {
    const tcp = connect(port, '127.0.0.1'); sockets.add(tcp)
    socket.on('message', data => tcp.write(data)); tcp.on('data', data => { if (socket.readyState === 1) socket.send(data) })
    tcp.on('error', () => socket.close()); tcp.on('close', () => { sockets.delete(tcp); socket.close() }); socket.on('close', () => tcp.destroy())
  })
  http.listen(0, '127.0.0.1'); await once(http, 'listening')
  const transport = `127.0.0.1:${http.address().port}`
  const env = { PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', DATABASE_URL: database, USUARIOS_TEST_DATABASE_URL: database, E2E_DATABASE_CONFIRM: 'disposable', E2E_NEON_HTTP: `http://${transport}/sql`, E2E_NEON_WSPROXY: transport, SESSION_SECRET: randomBytes(32).toString('hex'), CRM_API_URL: `http://${transport}`, CRM_SERVICE_TOKEN: 'local-qa', E2E_DELIVERY_MODE: 'stub' }
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(nextPort)], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  const log = chunk => process.stdout.write(chunk)
  next.stdout.on('data', log); next.stderr.on('data', log)
  await writeFile(join(out, 'runtime.json'), JSON.stringify({ pid: process.pid, baseURL: `http://127.0.0.1:${nextPort}`, database, password, hoy, fin, referencia }), { mode: 0o600 })
  console.log('QA_RUNTIME_READY', nextPort)
  await Promise.race([interrupted, once(next, 'exit')])
} finally { await stop(); console.log('QA_RUNTIME_CLOSED') }
