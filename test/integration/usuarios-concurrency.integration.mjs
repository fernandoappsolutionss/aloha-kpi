import test, { before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const cjsNeonConfig = createRequire(import.meta.url)('@neondatabase/serverless').neonConfig
if (process.env.USUARIOS_TEST_WSPROXY) {
  // tsx carga los módulos .js de la app por la exportación CJS del driver;
  // el fixture .mjs usa ESM. Ambas configuraciones deben apuntar al proxy local.
  for (const config of [neonConfig, cjsNeonConfig]) {
    config.wsProxy = (host, port) => `${process.env.USUARIOS_TEST_WSPROXY}/v1?address=${host}:${port}`
    config.useSecureWebSocket = false
    config.pipelineTLS = false
    config.pipelineConnect = false
  }
}

const url = process.env.USUARIOS_TEST_DATABASE_URL
if (!url || process.env.E2E_DATABASE_CONFIRM !== 'disposable') {
  throw new Error(
    'USUARIOS_TEST_DATABASE_URL y E2E_DATABASE_CONFIRM=disposable son obligatorias; esta prueba modifica una DB desechable.',
  )
}

process.env.DATABASE_URL = url

const pool = new Pool({ connectionString: url })
const marker = `codex-usuarios-${Date.now()}`
let ids = {}

before(async () => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const centers = await client.query(
      `INSERT INTO centros (nombre, region, pais)
       VALUES ($1, 'TEST', 'PA'), ($2, 'TEST', 'PA')
       RETURNING id`,
      [`${marker}-A`, `${marker}-B`],
    )
    const [centerA, centerB] = centers.rows.map((row) => Number(row.id))
    const users = await client.query(
      `INSERT INTO usuarios (nombre, email, password_hash, rol, centro_id)
       VALUES ($1, $2, 'hash', 'admin_general', NULL),
              ($3, $4, 'hash', 'coordinador', NULL),
              ($5, $6, 'hash', 'administradora', $11),
              ($7, $8, 'hash', 'asistente', $12),
              ($9, $10, 'hash', 'supervisor', $11)
       RETURNING id`,
      [
        `${marker}-admin`, `${marker}-admin@test.invalid`,
        `${marker}-coord`, `${marker}-coord@test.invalid`,
        `${marker}-target`, `${marker}-target@test.invalid`,
        `${marker}-outsider`, `${marker}-outsider@test.invalid`,
        `${marker}-privileged`, `${marker}-privileged@test.invalid`,
        centerA, centerB,
      ],
    )
    ids = {
      centerA,
      centerB,
      admin: Number(users.rows[0].id),
      coord: Number(users.rows[1].id),
      target: Number(users.rows[2].id),
      outsider: Number(users.rows[3].id),
      privileged: Number(users.rows[4].id),
    }
    await client.query(
      'INSERT INTO usuario_centros (usuario_id, centro_id) VALUES ($1, $2)',
      [ids.coord, ids.centerA],
    )
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
})

beforeEach(async () => {
  const fixtureUsers = [ids.admin, ids.coord, ids.target, ids.outsider, ids.privileged]
  await pool.query('DELETE FROM password_tokens WHERE user_id = ANY($1::int[])', [fixtureUsers])
  await pool.query(
    'DELETE FROM usuarios WHERE email LIKE $1 AND NOT (id = ANY($2::int[]))',
    [`${marker}%`, fixtureUsers],
  )
  await pool.query(
    "UPDATE usuarios SET rol = 'coordinador', centro_id = NULL, password_hash = 'hash' WHERE id = $1",
    [ids.coord],
  )
  await pool.query(
    "UPDATE usuarios SET rol = 'administradora', centro_id = $2, password_hash = 'hash' WHERE id = $1",
    [ids.target, ids.centerA],
  )
  await pool.query(
    "UPDATE usuarios SET rol = 'asistente', centro_id = $2, password_hash = 'hash' WHERE id = $1",
    [ids.outsider, ids.centerB],
  )
  await pool.query(
    "UPDATE usuarios SET rol = 'supervisor', centro_id = $2, password_hash = 'hash' WHERE id = $1",
    [ids.privileged, ids.centerA],
  )
  await pool.query('DELETE FROM usuario_centros WHERE usuario_id = $1', [ids.coord])
  await pool.query(
    'INSERT INTO usuario_centros (usuario_id, centro_id) VALUES ($1, $2)',
    [ids.coord, ids.centerA],
  )
})

after(async () => {
  try {
    await pool.query(
      'DELETE FROM password_tokens WHERE user_id IN (SELECT id FROM usuarios WHERE email LIKE $1)',
      [`${marker}%`],
    )
    await pool.query('DELETE FROM usuarios WHERE email LIKE $1', [`${marker}%`])
    await pool.query('DELETE FROM centros WHERE nombre LIKE $1', [`${marker}%`])
  } finally {
    await pool.end()
  }
})

const [
  { usuariosRepository },
  { accessTokensRepository },
  { createUsuariosService },
  { createAccessTokenService },
] = await Promise.all([
  import('../../lib/usuarios-repository.js'),
  import('../../lib/access-tokens-repository.js'),
  import('../../lib/usuarios-service.mjs'),
  import('../../lib/access-tokens.mjs'),
])

const accessTokens = createAccessTokenService({ repo: accessTokensRepository })

function serviceFor(repo = usuariosRepository) {
  return createUsuariosService({
    repo,
    accessTokens,
    deliverAccess: async ({ purpose, token }) => ({
      emailSent: false,
      emailReason: 'disabled_in_test',
      ...(purpose === 'invite'
        ? { link: `https://test.invalid/set-password?token=${token}` }
        : {}),
    }),
  })
}

const service = serviceFor()

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

function settle(work) {
  return work().then(
    (value) => ({ status: 'fulfilled', value }),
    (reason) => ({ status: 'rejected', reason }),
  )
}

async function race(...works) {
  const gate = deferred()
  const runs = works.map((work) => settle(async () => {
    await gate.promise
    return work()
  }))
  gate.resolve()
  return Promise.all(runs)
}

function namedTransactions(base, applicationName) {
  return {
    ...base,
    transaction: (work) => base.transaction(async (query) => {
      await query("SELECT set_config('application_name', $1, true)", [applicationName])
      return work(query)
    }),
  }
}

function pauseAfterActorLock(base, actorId, barrier) {
  return {
    ...base,
    async loadActor(query, uid, options) {
      const actor = await base.loadActor(query, uid, options)
      if (Number(uid) === Number(actorId) && options?.lock) {
        barrier.locked.resolve()
        await barrier.release.promise
      }
      return actor
    },
  }
}

async function waitForObservedLock(applicationName) {
  for (let attempt = 0; attempt < 250; attempt++) {
    const { rows } = await pool.query(
      `SELECT pid FROM pg_stat_activity
       WHERE application_name = $1
         AND wait_event_type = 'Lock'
         AND state = 'active'`,
      [applicationName],
    )
    if (rows.length) return
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error(`No se observó el lock de ${applicationName}`)
}

function assertExpectedRaceError(result) {
  if (result.status === 'fulfilled') return
  assert.ok(
    result.reason?.code === '40001'
      || /No tienes permiso|No autorizado|ya fue usado/.test(result.reason?.message || ''),
    `error inesperado: ${result.reason?.code || result.reason?.message}`,
  )
}

test('pageData restringe en SQL por rol y centro antes de presentar filas', async () => {
  const data = await service.pageData({ uid: ids.coord })
  assert.deepEqual(data.users.map((user) => user.id), [ids.target])
  assert.deepEqual(data.users[0].centerIds, [ids.centerA])
  assert.equal(
    data.users.some((user) => [ids.admin, ids.outsider, ids.privileged].includes(user.id)),
    false,
  )
})

test('la revocación espera el lock y ninguna edición confirma después de revocar', async () => {
  const barrier = { locked: deferred(), release: deferred() }
  const editRepo = pauseAfterActorLock(usuariosRepository, ids.coord, barrier)
  const revokeName = `${marker}-revoke`
  const revokeRepo = namedTransactions(usuariosRepository, revokeName)
  const events = []

  const edit = serviceFor(editRepo).update({ uid: ids.coord }, ids.target, {
    nombre: `${marker}-updated`,
    rol: 'administradora',
    centro_id: ids.centerA,
    centros: [],
  }).then((value) => {
    events.push('edit-confirmed')
    return value
  })

  await barrier.locked.promise
  const revokeInput = {
    nombre: `${marker}-coord`,
    rol: 'coordinador',
    centro_id: null,
    centros: [ids.centerB],
  }
  const revoke = settle(() => serviceFor(revokeRepo).update(
    { uid: ids.admin },
    ids.coord,
    revokeInput,
  ))
  await waitForObservedLock(revokeName)
  assert.deepEqual(events, [], 'ninguna transacción debía confirmar mientras se retenía el lock')
  barrier.release.resolve()
  await edit
  const revokeResult = await revoke
  if (revokeResult.status === 'rejected') {
    if (revokeResult.reason?.code !== '40001') throw revokeResult.reason
    await service.update({ uid: ids.admin }, ids.coord, revokeInput)
  }
  events.push('revoke-confirmed')
  assert.deepEqual(events, ['edit-confirmed', 'revoke-confirmed'])

  await assert.rejects(
    () => service.update({ uid: ids.coord }, ids.target, {
      nombre: `${marker}-forbidden`,
      rol: 'administradora',
      centro_id: ids.centerA,
      centros: [],
    }),
    /No tienes permiso/,
  )
  const memberships = await pool.query(
    'SELECT centro_id FROM usuario_centros WHERE usuario_id = $1 ORDER BY centro_id',
    [ids.coord],
  )
  assert.deepEqual(
    memberships.rows.map((row) => Number(row.centro_id)),
    [ids.centerB],
  )
})

test('promover el objetivo y resetearlo nunca deja un token activo privilegiado', async () => {
  const results = await race(
    () => service.resendAccess({ uid: ids.coord }, ids.target),
    () => service.update({ uid: ids.admin }, ids.target, {
      nombre: `${marker}-target`,
      rol: 'admin_general',
      centro_id: null,
      centros: [],
    }),
  )
  results.forEach(assertExpectedRaceError)
  const state = await pool.query(
    `SELECT u.rol, count(t.token) FILTER (WHERE t.used_at IS NULL) AS activos
     FROM usuarios u
     LEFT JOIN password_tokens t ON t.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [ids.target],
  )
  if (state.rows[0].rol === 'admin_general') {
    assert.equal(Number(state.rows[0].activos), 0)
  }
})

test('dos altas con el mismo correo dejan una fila y no filtran 23505', async () => {
  const email = `${marker}-duplicate@test.invalid`
  const input = {
    nombre: `${marker}-duplicate`,
    email,
    rol: 'asistente',
    centro_id: ids.centerA,
  }
  const results = await race(
    () => service.create({ uid: ids.coord }, input),
    () => service.create({ uid: ids.coord }, input),
  )
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  const rejected = results.find((result) => result.status === 'rejected')
  assert.ok(rejected)
  assert.notEqual(rejected.reason?.code, '23505')
  assert.notEqual(rejected.reason?.code, '40001')
  assert.ok([
    'No tienes permiso para gestionar este usuario.',
    'El correo ya está registrado en un usuario visible.',
  ].includes(rejected.reason?.message))
  const count = await pool.query(
    'SELECT count(*)::int AS n FROM usuarios WHERE email = $1',
    [email],
  )
  assert.equal(count.rows[0].n, 1)
})

test('dos reemplazos simultáneos dejan un solo token activo', async () => {
  const results = await race(
    () => accessTokensRepository.transaction((query) => accessTokens.replace(
      query,
      { userId: ids.target, purpose: 'reset', hours: 2 },
    )),
    () => accessTokensRepository.transaction((query) => accessTokens.replace(
      query,
      { userId: ids.target, purpose: 'reset', hours: 2 },
    )),
  )
  results.forEach(assertExpectedRaceError)
  assert.ok(results.some((result) => result.status === 'fulfilled'))
  const active = await pool.query(
    'SELECT count(*)::int AS n FROM password_tokens WHERE user_id = $1 AND used_at IS NULL',
    [ids.target],
  )
  assert.equal(active.rows[0].n, 1)
})

test('dos tokens consumidos a la vez permiten una sola contraseña y revocan ambos', async () => {
  const expires = new Date(Date.now() + 3_600_000)
  const tokenA = `${marker}-consume-a`
  const tokenB = `${marker}-consume-b`
  await pool.query(
    `INSERT INTO password_tokens (token, user_id, purpose, expires_at)
     VALUES ($1, $3, 'reset', $4), ($2, $3, 'reset', $4)`,
    [tokenA, tokenB, ids.target, expires],
  )
  const results = await race(
    () => accessTokens.consume({ token: tokenA, passwordHash: 'hash-a' }),
    () => accessTokens.consume({ token: tokenB, passwordHash: 'hash-b' }),
  )
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  results.forEach(assertExpectedRaceError)
  const state = await pool.query(
    `SELECT u.password_hash,
            count(t.token) FILTER (WHERE t.used_at IS NULL) AS activos
     FROM usuarios u
     JOIN password_tokens t ON t.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [ids.target],
  )
  assert.ok(['hash-a', 'hash-b'].includes(state.rows[0].password_hash))
  assert.equal(Number(state.rows[0].activos), 0)
})
