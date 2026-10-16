// Base exclusiva y local; nunca toma DATABASE_URL del entorno de producción.
import test, { before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { setTimeout as esperar } from 'node:timers/promises'
import pg from 'pg'
import * as reinicios from '../../lib/entrenamiento/oficio/reinicios.mjs'
import * as catalogo from '../../lib/entrenamiento/oficio/catalogo.js'
import * as progreso from '../../lib/entrenamiento/oficio/progreso.js'
import * as guia from '../../lib/entrenamiento/oficio/guia-pasos.js'
import { GLOSARIO } from '../../lib/entrenamiento/oficio/glosario.js'
import { RESPUESTAS_OFICIO } from '../../lib/entrenamiento/respuestas-oficio/todas.js'
import { assertMaster, assertOficio, isMaster } from '../../lib/current-user.mjs'

const url = process.env.ALOHA_REINICIOS_TEST_DATABASE_URL
if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)
  || !new URL(url).pathname.endsWith('_test')) throw new Error('Se requiere una base local exclusiva terminada en _test.')
const pool = new pg.Pool({ connectionString: url })
const tag = (client) => async (parts, ...values) => (await client.query(
  parts.reduce((s, p, i) => s + (i ? `$${i}` : '') + p, ''), values,
)).rows
const sql = tag(pool)
async function withTransaction(work) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN ISOLATION LEVEL READ COMMITTED')
    const result = await work(tag(client))
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally { client.release() }
}
let master, alumno, otro, actor
const solicitud = () => ({ id: randomUUID(), motivo: 'periodico', nota: 'Reentrenamiento anual' })
const source = readFileSync(new URL('../../app/actions/entrenamiento-oficio.js', import.meta.url), 'utf8')
  .replace(/import[\s\S]*?from ['"][^'"]+['"]\n/g, '')
  .replace(/export async function /g, 'async function ')
const deps = {
  sql, withTransaction, ...reinicios, ...catalogo, ...progreso, ...guia, GLOSARIO, RESPUESTAS_OFICIO, isMaster,
  requireCurrentMaster: async () => assertMaster(actor), requireCurrentOficio: async () => assertOficio(actor),
  fallo: (_name, e) => ({ error: e.message }),
}
const actions = new Function(...Object.keys(deps), `${source}\nreturn { reiniciarPuestoOficio, historialReiniciosOficio, matrizOficio, cargarOficio, cargarConceptos, responderQuizOficio, marcarEstudiado, guardarConcepto, firmarDrill, quitarFirmaDrill, colaFirmas };`)(...Object.values(deps))

before(async () => {
  await pool.query(readFileSync(new URL('../../db/schema.sql', import.meta.url), 'utf8'))
  // Applying the expansion twice must preserve the active progress and history.
  const migration = readFileSync(new URL('../../db/migrations/2026-10-16-oficio-reinicios.sql', import.meta.url), 'utf8')
  await pool.query(migration)
  await pool.query(migration)
})
beforeEach(async () => {
  await pool.query('TRUNCATE usuarios, centros RESTART IDENTITY CASCADE')
  await pool.query("INSERT INTO centros (nombre) VALUES ('Centro QA'), ('Otro centro QA')")
  const { rows } = await pool.query(`INSERT INTO usuarios (nombre,email,rol,centro_id,password_hash) VALUES
    ('Master QA','fperez@teamsolutionss.com','admin_master',NULL,'hash'),
    ('Persona anterior QA','persona@example.invalid','administradora',1,'hash'),
    ('Otra persona QA','otra@example.invalid','asistente',2,'hash') RETURNING *`)
  ;[master, alumno, otro] = rows.map((r) => ({ ...r, uid: r.id, centros: [] }))
  actor = master
  await pool.query(`INSERT INTO entrenamiento_progreso (usuario_id,modulo,tour_visto_at,quiz_aprobado_at,intentos,ultimo_puntaje,drill_firmado_at,drill_firmado_por) VALUES
    ($1,'of-met-3',now(),now(),2,5,now(),$2), ($1,'of-antiguo',now(),now(),1,4,NULL,NULL),
    ($1,'sistema',now(),now(),3,3,NULL,NULL), ($3,'of-met-1',now(),now(),1,5,now(),$2)`, [alumno.id, master.id, otro.id])
  await pool.query(`INSERT INTO entrenamiento_conceptos (usuario_id,modulo,slug,texto) VALUES
    ($1,'of-met-1','qa','Texto del ciclo anterior'),($2,'of-met-1','qa','Texto ajeno'),($1,'sistema','qa','Texto de otra pista')`, [alumno.id, otro.id])
})
after(async () => { await pool.end() })

test('reinicia todo el oficio, conserva otras pistas/personas y archiva identidad, conceptos y firmas', async () => {
  assert.deepEqual(await actions.reiniciarPuestoOficio(alumno.id, solicitud()), { ok: true })
  const rows = await sql`SELECT usuario_id, modulo FROM entrenamiento_progreso ORDER BY usuario_id, modulo`
  assert.deepEqual(rows, [{ usuario_id: alumno.id, modulo: 'sistema' }, { usuario_id: otro.id, modulo: 'of-met-1' }])
  const [hist] = await sql`SELECT * FROM entrenamiento_oficio_reinicios`
  assert.equal(hist.progreso.length, 2, 'incluye módulos retirados del catálogo')
  assert.equal(hist.progreso.find((p) => p.modulo === 'of-met-3').firmante_nombre, master.nombre)
  assert.equal(hist.conceptos[0].texto, 'Texto del ciclo anterior')
  assert.equal(hist.persona.nombre, alumno.nombre)
  assert.equal(hist.responsable.email, master.email)
  assert.equal((await sql`SELECT * FROM entrenamiento_conceptos`).length, 2)
  const matriz = await actions.matrizOficio()
  assert.equal(matriz.usuarios.find((u) => u.id === alumno.id).avance.pctEstudio, 0)
  assert.equal(matriz.usuarios.find((u) => u.id === alumno.id).avance.pctHat, 0)
  actor = alumno
  const oficio = await actions.cargarOficio()
  assert.deepEqual(oficio.progreso, {})
  assert.equal(oficio.siguiente.id, 'of-met-1')
  assert.ok((await actions.responderQuizOficio('of-met-1', RESPUESTAS_OFICIO['of-met-1'])).error)
  assert.ok((await actions.marcarEstudiado('of-met-2')).error)
  assert.deepEqual((await actions.cargarConceptos('of-met-1')).conceptos, {})
})

test('solo Master: ni jefes entrenadores, gerencia de lectura, ni sesión ausente pueden reiniciar o consultar historial', async () => {
  for (const rol of ['administradora', 'asistente', 'coordinador', 'coach', 'supervisor', 'admin_general']) {
    actor = { ...alumno, rol }
    assert.ok((await actions.reiniciarPuestoOficio(alumno.id, solicitud())).error, rol)
    assert.ok((await actions.historialReiniciosOficio(alumno.id)).error, rol)
  }
  actor = null
  assert.ok((await actions.reiniciarPuestoOficio(alumno.id, solicitud())).error)
  actor = { ...alumno, rol: 'admin_master' }
  assert.ok((await actions.reiniciarPuestoOficio(alumno.id, solicitud())).error)
  assert.equal((await sql`SELECT * FROM entrenamiento_progreso`).length, 4)
  assert.equal((await sql`SELECT * FROM entrenamiento_oficio_reinicios`).length, 0)
})

test('valida usuario, puesto, motivo, identificador y nota antes de modificar datos', async () => {
  for (const id of [0, -1, '2', 1.5, 99999, master.id]) assert.ok((await actions.reiniciarPuestoOficio(id, solicitud())).error)
  for (const data of [null, { ...solicitud(), motivo: 'toString' }, { ...solicitud(), id: 'x' }, { ...solicitud(), nota: 'x'.repeat(501) }]) {
    assert.ok((await actions.reiniciarPuestoOficio(alumno.id, data)).error)
  }
  assert.equal((await sql`SELECT * FROM entrenamiento_oficio_reinicios`).length, 0)
})

test('reintento y doble envío no vuelven a borrar avances del ciclo nuevo', async () => {
  const data = solicitud()
  const results = await Promise.all([actions.reiniciarPuestoOficio(alumno.id, data), actions.reiniciarPuestoOficio(alumno.id, data)])
  assert.ok(results.every((r) => r.ok))
  await sql`INSERT INTO entrenamiento_progreso (usuario_id,modulo,intentos) VALUES (${alumno.id},'of-met-1',1)`
  assert.deepEqual(await actions.reiniciarPuestoOficio(alumno.id, data), { ok: true, repetido: true })
  assert.equal((await sql`SELECT * FROM entrenamiento_progreso WHERE usuario_id = ${alumno.id} AND modulo LIKE 'of-%'`).length, 1)
  assert.equal((await sql`SELECT * FROM entrenamiento_oficio_reinicios`).length, 1)
  assert.ok((await actions.reiniciarPuestoOficio(otro.id, data)).error)
})

test('sin avance no crea un ciclo vacío; conceptos solos sí pueden reiniciarse', async () => {
  await actions.reiniciarPuestoOficio(alumno.id, solicitud())
  assert.ok((await actions.reiniciarPuestoOficio(alumno.id, solicitud())).error)
  await sql`INSERT INTO entrenamiento_conceptos (usuario_id,modulo,slug,texto) VALUES (${alumno.id},'of-met-1','qa','Nuevo concepto')`
  assert.ok((await actions.reiniciarPuestoOficio(alumno.id, solicitud())).ok)
  assert.equal((await sql`SELECT * FROM entrenamiento_oficio_reinicios`).length, 2)
})

test('fallo después de guardar la copia revierte historial y borrados juntos', async () => {
  const before = (await sql`SELECT * FROM entrenamiento_progreso ORDER BY id`)
  await assert.rejects(withTransaction(async (query) => {
    const failing = async (parts, ...values) => {
      if (parts.join('').includes('DELETE FROM entrenamiento_progreso')) throw new Error('fallo simulado')
      return query(parts, ...values)
    }
    await reinicios.archivarYReiniciar(failing, alumno.id, master, solicitud())
  }), /fallo simulado/)
  assert.deepEqual(await sql`SELECT * FROM entrenamiento_progreso ORDER BY id`, before)
  assert.equal((await sql`SELECT * FROM entrenamiento_conceptos`).length, 3)
  assert.equal((await sql`SELECT * FROM entrenamiento_oficio_reinicios`).length, 0)
})

test('un reinicio que termina primero impide firmar o aprobar con progreso anterior', async () => {
  let desbloquear, bloqueado
  const listo = new Promise((resolve) => { bloqueado = resolve })
  const continuar = new Promise((resolve) => { desbloquear = resolve })
  const reset = withTransaction(async (query) => {
    await reinicios.bloquearOficio(query, alumno.id)
    bloqueado()
    await continuar
    return reinicios.archivarYReiniciar(query, alumno.id, master, solicitud())
  })
  await listo
  let firmaTerminada = false
  const firma = actions.firmarDrill(alumno.id, 'of-met-3').then((r) => { firmaTerminada = true; return r })
  actor = alumno
  const quiz = actions.responderQuizOficio('of-met-1', RESPUESTAS_OFICIO['of-met-1'])
  try {
    await esperar(50)
    assert.equal(firmaTerminada, false, 'la firma debe esperar al reinicio que mantiene el candado')
  } finally { desbloquear() }
  assert.ok((await reset).ok)
  assert.match((await firma).error, /Todavía no lo ha estudiado/)
  assert.ok((await quiz).error)
  assert.equal((await sql`SELECT * FROM entrenamiento_progreso WHERE usuario_id = ${alumno.id} AND modulo LIKE 'of-%'`).length, 0)
})

test('el historial conserva persona anterior tras renombrar la cuenta y centro múltiple', async () => {
  await sql`UPDATE usuarios SET rol = 'coordinador', centro_id = NULL WHERE id = ${alumno.id}`
  await sql`INSERT INTO usuario_centros (usuario_id,centro_id) VALUES (${alumno.id},1),(${alumno.id},2)`
  await actions.reiniciarPuestoOficio(alumno.id, { ...solicitud(), motivo: 'persona_nueva' })
  await sql`UPDATE usuarios SET nombre = 'Persona nueva QA' WHERE id = ${alumno.id}`
  const { reinicios: [h] } = await actions.historialReiniciosOficio(alumno.id)
  assert.equal(h.persona.nombre, 'Persona anterior QA')
  assert.equal(h.persona.rol, 'coordinador')
  assert.deepEqual(h.persona.centros, [1, 2])
  assert.equal(h.estudiados, 2)
  assert.equal(h.firmados, 1)
  assert.equal(h.conceptos, 1)
})

test('puede estudiar, aprobar y recibir una firma nueva después del reinicio', async () => {
  await actions.reiniciarPuestoOficio(alumno.id, solicitud())
  actor = alumno
  for (const id of ['of-met-1', 'of-met-2', 'of-met-3']) {
    const modulo = catalogo.moduloOficio(id)
    for (const slug of new Set(modulo.palabras.filter((s) => GLOSARIO[s]))) {
      await sql`INSERT INTO entrenamiento_conceptos (usuario_id,modulo,slug,texto)
        VALUES (${alumno.id},${modulo.id},${slug},${`Concepto nuevo de prueba: ${slug}`})`
    }
    assert.ok((await actions.marcarEstudiado(modulo.id)).ok)
    assert.ok((await actions.responderQuizOficio(modulo.id, RESPUESTAS_OFICIO[modulo.id])).aprobado)
  }
  actor = master
  assert.ok((await actions.firmarDrill(alumno.id, 'of-met-3')).ok)
  assert.ok((await actions.reiniciarPuestoOficio(alumno.id, solicitud())).ok)
  const { reinicios: historial } = await actions.historialReiniciosOficio(alumno.id)
  assert.equal(historial.length, 2)
  assert.equal(historial[0].estudiados, 3)
  assert.equal(historial[0].firmados, 1)
  assert.equal(historial[1].estudiados, 2)
})
