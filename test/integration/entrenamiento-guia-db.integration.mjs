import test, { before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const url = process.env.ALOHA_GUIA_TEST_DATABASE_URL || process.env.USUARIOS_TEST_DATABASE_URL || process.env.DATABASE_URL
if (!url || process.env.E2E_DATABASE_CONFIRM !== 'disposable') {
  throw new Error('ALOHA_GUIA_TEST_DATABASE_URL/USUARIOS_TEST_DATABASE_URL/DATABASE_URL y E2E_DATABASE_CONFIRM=disposable son obligatorias; esta prueba modifica una DB desechable.')
}
process.env.DATABASE_URL = url

const [db, catalogo, glosario, respuestas, guiaPasos, progreso, errores, currentUser] = await Promise.all([
  import('../../lib/db.js'),
  import('../../lib/entrenamiento/oficio/catalogo.js'),
  import('../../lib/entrenamiento/oficio/glosario.js'),
  import('../../lib/entrenamiento/respuestas-oficio/todas.js'),
  import('../../lib/entrenamiento/oficio/guia-pasos.js'),
  import('../../lib/entrenamiento/oficio/progreso.js'),
  import('../../lib/errores.js'),
  import('../../lib/current-user.mjs'),
])

const { sql, withTransaction } = db
const { MODULOS_OFICIO, CURSOS, MODULO_IDS_OFICIO, moduloOficio, metadatosOficio } = catalogo
const { GLOSARIO } = glosario
const { RESPUESTAS_OFICIO } = respuestas
const { validarConcepto } = guiaPasos
const {
  minimoAprobacion, corregirQuizOficio, estudiado, hatted, planDeRol,
  avanceOficio, avanceDrills, siguienteOficio, gradienteAbierto, puedeFirmar,
  rolesQueFirma, rolesQueRevisa, OFICIAL_DE, NOMBRE_ROL,
} = progreso
const { fallo } = errores
const { loadCurrentUser, esGerencia } = currentUser

const MOD1 = 'of-met-1'
const MOD2 = 'of-met-2'
const AJENO = 'of-cen-1'
const slugs1 = [...new Set(moduloOficio(MOD1).palabras || [])].filter((slug) => GLOSARIO[slug])
const slugs2 = [...new Set(moduloOficio(MOD2).palabras || [])].filter((slug) => GLOSARIO[slug])
const marker = `codex-guia-${Date.now()}`
let ids = {}
let sesion = null

function texto(slug, n) {
  const nombre = slug.replace(/-/g, ' ')
  return `En mi rutina ${nombre} significa ubicar la situación ${n}, decidir la acción correcta y explicar cómo ayuda al equipo ese día.`
}

function textosCompletos() {
  return slugs1.map((slug, i) => [slug, texto(slug, i + 10)])
}

async function requireSession() {
  if (!sesion) throw new Error('No autenticado')
  return sesion
}

async function requireCurrentUser() {
  return await loadCurrentUser(await requireSession(), sql)
}

async function requireCurrentAdmin() {
  const user = await requireCurrentUser()
  if (!esGerencia(user.rol)) throw new Error('No autorizado')
  return user
}

const isAdminRole = (rol) => esGerencia(rol)

function cargarActions(sqlImpl = sql) {
  const fuente = readFileSync(join(ROOT, 'app/actions/entrenamiento-oficio.js'), 'utf8')
    .replace(/import[\s\S]*?from ['"][^'"]+['"]\n/g, '')
    .replace(/export async function /g, 'async function ')
  return new Function(
    'sql', 'withTransaction', 'requireSession', 'requireCurrentUser', 'requireCurrentAdmin', 'isAdminRole', 'fallo',
    'MODULOS_OFICIO', 'CURSOS', 'MODULO_IDS_OFICIO', 'moduloOficio', 'metadatosOficio', 'GLOSARIO', 'RESPUESTAS_OFICIO', 'validarConcepto',
    'minimoAprobacion', 'corregirQuizOficio', 'estudiado', 'hatted', 'planDeRol', 'avanceOficio', 'avanceDrills', 'siguienteOficio', 'gradienteAbierto', 'puedeFirmar', 'rolesQueFirma', 'rolesQueRevisa', 'OFICIAL_DE', 'NOMBRE_ROL',
    `${fuente}\nreturn { cargarOficio, cargarConceptos, guardarConcepto, marcarEstudiado, responderQuizOficio }`,
  )(
    sqlImpl, withTransaction, requireSession, requireCurrentUser, requireCurrentAdmin, isAdminRole, fallo,
    MODULOS_OFICIO, CURSOS, MODULO_IDS_OFICIO, moduloOficio, metadatosOficio, GLOSARIO, RESPUESTAS_OFICIO, validarConcepto,
    minimoAprobacion, corregirQuizOficio, estudiado, hatted, planDeRol, avanceOficio, avanceDrills, siguienteOficio, gradienteAbierto, puedeFirmar, rolesQueFirma, rolesQueRevisa, OFICIAL_DE, NOMBRE_ROL,
  )
}

function espiarSql(registro) {
  return async function sqlSpy(strings, ...values) {
    registro.push(Array.isArray(strings) ? strings.join('${}') : String(strings))
    return await sql(strings, ...values)
  }
}

async function guardarTodos(actions, usuarioId) {
  sesion = { uid: usuarioId, rol: 'administradora' }
  const resultados = []
  for (const [slug, value] of textosCompletos()) resultados.push(await actions.guardarConcepto(MOD1, slug, value))
  return resultados
}

async function filaProgreso(usuarioId, modulo = MOD1) {
  const rows = await sql`
    SELECT intentos, ultimo_puntaje, tour_visto_at, quiz_aprobado_at
    FROM entrenamiento_progreso
    WHERE usuario_id = ${usuarioId} AND modulo = ${modulo}
  `
  return rows[0] || null
}

before(async () => {
  const centros = await sql`
    INSERT INTO centros (nombre, region, pais)
    VALUES (${`${marker}-centro`}, 'TEST', 'PA')
    RETURNING id
  `
  const centroId = Number(centros[0].id)
  const users = await sql`
    INSERT INTO usuarios (nombre, email, password_hash, rol, centro_id)
    VALUES (${`${marker}-admin-a`}, ${`${marker}-admin-a@test.invalid`}, 'hash', 'administradora', ${centroId}),
           (${`${marker}-admin-b`}, ${`${marker}-admin-b@test.invalid`}, 'hash', 'administradora', ${centroId}),
           (${`${marker}-alumno-c`}, ${`${marker}-alumno-c@test.invalid`}, 'hash', 'administradora', ${centroId}),
           (${`${marker}-asistente`}, ${`${marker}-asistente@test.invalid`}, 'hash', 'asistente', ${centroId})
    RETURNING id
  `
  ids = {
    centroId,
    u1: Number(users[0].id),
    u2: Number(users[1].id),
    u3: Number(users[2].id),
    asistente: Number(users[3].id),
  }
}, { timeout: 15_000 })

beforeEach(async () => {
  const usuarios = [ids.u1, ids.u2, ids.u3, ids.asistente]
  sesion = null
  await sql`DELETE FROM entrenamiento_conceptos WHERE usuario_id = ANY(${usuarios})`
  await sql`DELETE FROM entrenamiento_progreso WHERE usuario_id = ANY(${usuarios})`
  await sql`UPDATE usuarios SET password_hash = 'hash', rol = 'administradora', centro_id = ${ids.centroId} WHERE id = ANY(${[ids.u1, ids.u2, ids.u3]})`
  await sql`UPDATE usuarios SET password_hash = 'hash', rol = 'asistente', centro_id = ${ids.centroId} WHERE id = ${ids.asistente}`
}, { timeout: 15_000 })

after(async () => {
  try {
    const usuarios = [ids.u1, ids.u2, ids.u3, ids.asistente].filter(Boolean)
    if (usuarios.length) {
      await sql`DELETE FROM entrenamiento_conceptos WHERE usuario_id = ANY(${usuarios})`
      await sql`DELETE FROM entrenamiento_progreso WHERE usuario_id = ANY(${usuarios})`
    }
    await sql`DELETE FROM usuarios WHERE email LIKE ${`${marker}%`}`
    await sql`DELETE FROM centros WHERE nombre LIKE ${`${marker}%`}`
  } finally {
    sesion = null
  }
}, { timeout: 15_000 })

test('cargarConceptos aísla usuario, módulo y slugs vivos; entradas inválidas no consultan conceptos', async () => {
  const actions = cargarActions()
  await sql`
    INSERT INTO entrenamiento_conceptos (usuario_id, modulo, slug, texto)
    VALUES (${ids.u1}, ${MOD1}, ${slugs1[0]}, ${texto(slugs1[0], 1)}),
           (${ids.u1}, ${MOD1}, 'slug-obsoleto', 'No debe viajar al cliente.'),
           (${ids.u2}, ${MOD1}, ${slugs1[1]}, ${texto(slugs1[1], 2)}),
           (${ids.u1}, ${MOD2}, ${slugs2[0]}, ${texto(slugs2[0], 3)})
  `

  sesion = { uid: ids.u1, rol: 'administradora' }
  assert.deepEqual(await actions.cargarConceptos(MOD1), { conceptos: { [slugs1[0]]: texto(slugs1[0], 1) } })
  assert.deepEqual(await actions.cargarConceptos(MOD2), { conceptos: { [slugs2[0]]: texto(slugs2[0], 3) } })

  sesion = { uid: ids.u2, rol: 'administradora' }
  assert.deepEqual(await actions.cargarConceptos(MOD1), { conceptos: { [slugs1[1]]: texto(slugs1[1], 2) } })

  const consultas = []
  const spyActions = cargarActions(espiarSql(consultas))
  sesion = { uid: ids.u1, rol: 'administradora' }
  assert.deepEqual(await spyActions.guardarConcepto('of-desconocido', slugs1[0], texto(slugs1[0], 4)), { error: 'Módulo desconocido.' })
  sesion = { uid: ids.asistente, rol: 'asistente' }
  assert.deepEqual(await spyActions.guardarConcepto(AJENO, slugs1[0], texto(slugs1[0], 5)), { error: 'Este módulo no es de tu puesto.' })
  assert.doesNotMatch(consultas.join('\n'), /entrenamiento_conceptos/, 'un módulo desconocido o ajeno no debe tocar la tabla de conceptos')
})

test('guardarConcepto serializa concurrencia, devuelve faltan/completo y rechaza duplicados concurrentes', async () => {
  const actions = cargarActions()
  sesion = { uid: ids.u1, rol: 'administradora' }
  const [a, b] = await Promise.all([
    actions.guardarConcepto(MOD1, slugs1[0], texto(slugs1[0], 10)),
    actions.guardarConcepto(MOD1, slugs1[1], texto(slugs1[1], 11)),
  ])
  assert.equal(a.ok, true)
  assert.equal(b.ok, true)
  assert.equal(a.completo || b.completo, false)
  assert.ok(Number.isInteger(a.faltan) && Number.isInteger(b.faltan))

  for (let i = 2; i < slugs1.length; i++) {
    const r = await actions.guardarConcepto(MOD1, slugs1[i], texto(slugs1[i], i + 12))
    assert.equal(r.ok, true)
    if (i === slugs1.length - 1) {
      assert.equal(r.completo, true)
      assert.equal(r.faltan, 0)
      assert.equal(r.texto, texto(slugs1[i], i + 12))
    }
  }
  assert.equal(Object.keys((await actions.cargarConceptos(MOD1)).conceptos).length, slugs1.length)

  await sql`DELETE FROM entrenamiento_conceptos WHERE usuario_id = ${ids.u2}`
  sesion = { uid: ids.u2, rol: 'administradora' }
  const igual = 'Esta explicación propia marca la misma idea operativa para decidir qué hacer y cómo ayudar al centro hoy.'
  const dup = await Promise.all([
    actions.guardarConcepto(MOD1, slugs1[0], igual),
    actions.guardarConcepto(MOD1, slugs1[1], igual),
  ])
  assert.equal(dup.filter((r) => r.ok).length, 1)
  assert.equal(dup.filter((r) => /Ya usaste ese mismo texto/.test(r.error || '')).length, 1)
  assert.doesNotMatch(JSON.stringify(dup), /40001|could not serialize/i)
})

test('marcarEstudiado exige conceptos salvo grandfathering y el quiz sin lección no cuenta intento', async () => {
  const actions = cargarActions()

  sesion = { uid: ids.u3, rol: 'administradora' }
  const bloqueado = await actions.marcarEstudiado(MOD1)
  assert.match(bloqueado.error, /escribe con tus palabras las \d+ palabras que faltan/)
  assert.equal(await filaProgreso(ids.u3), null)

  await sql`
    INSERT INTO entrenamiento_progreso (usuario_id, modulo, tour_visto_at, updated_at)
    VALUES (${ids.u2}, ${MOD1}, now(), now())
  `
  sesion = { uid: ids.u2, rol: 'administradora' }
  assert.deepEqual(await actions.marcarEstudiado(MOD1), { ok: true })

  await guardarTodos(actions, ids.u1)
  sesion = { uid: ids.u1, rol: 'administradora' }
  assert.deepEqual(await actions.marcarEstudiado(MOD1), { ok: true })
  assert.ok((await filaProgreso(ids.u1))?.tour_visto_at)

  sesion = { uid: ids.u3, rol: 'administradora' }
  assert.deepEqual(await actions.responderQuizOficio(MOD1, RESPUESTAS_OFICIO[MOD1]), { error: 'Antes de responder marca la lección como realizada.' })
  assert.equal(await filaProgreso(ids.u3), null)

  await sql`
    INSERT INTO entrenamiento_progreso (usuario_id, modulo, tour_visto_at, updated_at)
    VALUES (${ids.u3}, ${MOD1}, now(), now())
  `
  const quiz = await actions.responderQuizOficio(MOD1, RESPUESTAS_OFICIO[MOD1])
  assert.equal(quiz.aprobado, true)
  assert.equal(quiz.puntaje, RESPUESTAS_OFICIO[MOD1].length)
  const fila = await filaProgreso(ids.u3)
  assert.equal(Number(fila.intentos), 1)
  assert.ok(fila.quiz_aprobado_at)
})

test('cargarOficio relee rol y usuario desde base aunque la sesión sea vieja', async () => {
  const actions = cargarActions()
  sesion = { uid: ids.u3, rol: 'administradora' }
  assert.equal((await actions.cargarOficio()).rol, 'administradora')

  await sql`UPDATE usuarios SET rol = 'asistente' WHERE id = ${ids.u3}`
  const cambiado = await actions.cargarOficio()
  assert.equal(cambiado.rol, 'asistente')
  assert.notEqual(cambiado.rol, sesion.rol)

  await sql`UPDATE usuarios SET password_hash = NULL WHERE id = ${ids.u3}`
  assert.deepEqual(await actions.cargarOficio(), { error: 'Tu sesión expiró. Vuelve a entrar.' })
})
