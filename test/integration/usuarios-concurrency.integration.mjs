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
}, { timeout: 15_000 })

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
}, { timeout: 15_000 })

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
}, { timeout: 15_000 })

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
  return Promise.resolve().then(work).then(
    (value) => ({ status: 'fulfilled', value }),
    (reason) => ({ status: 'rejected', reason }),
  )
}

function withTimeout(promise, label, timeoutMs = 5_000) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} excedió ${timeoutMs} ms`)), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

function namedTransactions(base, applicationName) {
  return {
    ...base,
    transaction: (work, options) => base.transaction(async (query) => {
      await query(
        `SELECT set_config('application_name', $1, true),
                set_config('lock_timeout', '8000ms', true),
                set_config('statement_timeout', '12000ms', true)`,
        [applicationName],
      )
      return work(query)
    }, options),
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

function pauseAfterUserLock(base, userId, barrier) {
  return {
    ...base,
    async lockUser(query, id) {
      const user = await base.lockUser(query, id)
      if (Number(id) === Number(userId)) {
        barrier.locked.resolve()
        await barrier.release.promise
      }
      return user
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

async function observedBlockedRace({
  barrier,
  holderWork,
  waiterWork,
  waiterName,
  label,
  onWaitObserved,
}) {
  const holder = settle(holderWork)
  let waiter
  let observationError
  try {
    await withTimeout(barrier.locked.promise, `${label}: el holder no adquirió el lock`)
    waiter = settle(waiterWork)
    await waitForObservedLock(waiterName)
    onWaitObserved?.()
  } catch (error) {
    observationError = error
  } finally {
    barrier.release.resolve()
  }

  const works = waiter ? [holder, waiter] : [holder]
  let results
  try {
    results = await withTimeout(Promise.all(works), `${label}: las transacciones no terminaron`, 14_000)
  } catch (drainError) {
    if (observationError) {
      throw new AggregateError([observationError, drainError], `${label}: falló la observación y el drenaje`)
    }
    throw drainError
  }
  if (observationError) throw observationError
  if (!waiter) throw new Error(`${label}: el waiter no llegó a iniciarse`)
  return results
}

function assertSerializableOrFulfilled(result, label) {
  if (result.status === 'fulfilled') return
  assert.equal(
    result.reason?.code,
    '40001',
    `${label}: error inesperado ${result.reason?.code || result.reason?.message}`,
  )
}

test('pageData restringe en SQL por rol y centro antes de presentar filas', { timeout: 20_000 }, async () => {
  const data = await service.pageData({ uid: ids.coord })
  assert.deepEqual(data.users.map((user) => user.id), [ids.target])
  assert.deepEqual(data.users[0].centerIds, [ids.centerA])
  assert.equal(
    data.users.some((user) => [ids.admin, ids.outsider, ids.privileged].includes(user.id)),
    false,
  )
})

test('la revocación espera el lock y ninguna edición confirma después de revocar', { timeout: 20_000 }, async () => {
  const barrier = { locked: deferred(), release: deferred() }
  const editRepo = pauseAfterActorLock(
    namedTransactions(usuariosRepository, `${marker}-edit-holder`),
    ids.coord,
    barrier,
  )
  const revokeName = `${marker}-revoke`
  const revokeRepo = namedTransactions(usuariosRepository, revokeName)
  const events = []

  const revokeInput = {
    nombre: `${marker}-coord`,
    rol: 'coordinador',
    centro_id: null,
    centros: [ids.centerB],
  }
  const [editResult, revokeResult] = await observedBlockedRace({
    barrier,
    holderWork: () => serviceFor(editRepo).update({ uid: ids.coord }, ids.target, {
      nombre: `${marker}-updated`,
      rol: 'administradora',
      centro_id: ids.centerA,
      centros: [],
    }).then((value) => {
      events.push('edit-confirmed')
      return value
    }),
    waiterWork: () => serviceFor(revokeRepo).update(
      { uid: ids.admin },
      ids.coord,
      revokeInput,
    ),
    waiterName: revokeName,
    label: 'revocación',
    onWaitObserved: () => {
      assert.deepEqual(events, [], 'ninguna transacción debía confirmar mientras se retenía el lock')
    },
  })
  assert.equal(editResult.status, 'fulfilled', `edición falló: ${editResult.reason?.message}`)
  if (revokeResult.status === 'rejected') {
    assert.equal(revokeResult.reason?.code, '40001')
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

test('promover el objetivo y resetearlo nunca deja un token activo privilegiado', { timeout: 20_000 }, async () => {
  const barrier = { locked: deferred(), release: deferred() }
  const resetRepo = pauseAfterUserLock(
    namedTransactions(usuariosRepository, `${marker}-promote-holder`),
    ids.target,
    barrier,
  )
  const promotionName = `${marker}-promote`
  const promotionRepo = namedTransactions(usuariosRepository, promotionName)
  const promotionInput = {
    nombre: `${marker}-target`,
    rol: 'admin_general',
    centro_id: null,
    centros: [],
  }
  const [resetResult, promotionResult] = await observedBlockedRace({
    barrier,
    holderWork: () => serviceFor(resetRepo).resendAccess({ uid: ids.coord }, ids.target),
    waiterWork: () => serviceFor(promotionRepo).update({ uid: ids.admin }, ids.target, promotionInput),
    waiterName: promotionName,
    label: 'promoción contra reset',
  })
  assert.equal(resetResult.status, 'fulfilled', `reset falló: ${resetResult.reason?.message}`)
  if (promotionResult.status === 'rejected') {
    assert.equal(promotionResult.reason?.code, '40001')
    await service.update({ uid: ids.admin }, ids.target, {
      nombre: `${marker}-target`,
      rol: 'admin_general',
      centro_id: null,
      centros: [],
    })
  }
  const state = await pool.query(
    `SELECT u.rol, count(t.token) FILTER (WHERE t.used_at IS NULL) AS activos
     FROM usuarios u
     LEFT JOIN password_tokens t ON t.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [ids.target],
  )
  assert.equal(state.rows[0].rol, 'admin_general')
  assert.equal(Number(state.rows[0].activos), 0)
})

test('dos altas con el mismo correo dejan una fila y no filtran 23505', { timeout: 20_000 }, async () => {
  const barrier = { locked: deferred(), release: deferred() }
  const holderRepo = pauseAfterActorLock(
    namedTransactions(usuariosRepository, `${marker}-create-holder`),
    ids.coord,
    barrier,
  )
  const waiterName = `${marker}-create-waiter`
  const waiterRepo = namedTransactions(usuariosRepository, waiterName)
  const email = `${marker}-duplicate@test.invalid`
  const input = {
    nombre: `${marker}-duplicate`,
    email,
    rol: 'asistente',
    centro_id: ids.centerA,
  }
  const results = await observedBlockedRace({
    barrier,
    holderWork: () => serviceFor(holderRepo).create({ uid: ids.coord }, input),
    waiterWork: () => serviceFor(waiterRepo).create({ uid: ids.coord }, input),
    waiterName,
    label: 'alta duplicada',
  })
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

test('dos reemplazos simultáneos dejan un solo token activo', { timeout: 20_000 }, async () => {
  const barrier = { locked: deferred(), release: deferred() }
  const holderRepo = pauseAfterUserLock(
    namedTransactions(accessTokensRepository, `${marker}-replace-holder`),
    ids.target,
    barrier,
  )
  const holderTokens = createAccessTokenService({ repo: holderRepo })
  const waiterName = `${marker}-replace-waiter`
  const waiterRepo = namedTransactions(accessTokensRepository, waiterName)
  const waiterTokens = createAccessTokenService({ repo: waiterRepo })
  const results = await observedBlockedRace({
    barrier,
    holderWork: () => holderRepo.transaction((query) => holderTokens.replace(
      query,
      { userId: ids.target, purpose: 'reset', hours: 2 },
    )),
    waiterWork: () => waiterRepo.transaction((query) => waiterTokens.replace(
      query,
      { userId: ids.target, purpose: 'reset', hours: 2 },
    )),
    waiterName,
    label: 'reemplazo concurrente',
  })
  // Tras observar el lock, ambos reemplazos pueden confirmar en serie o el waiter
  // puede abortar con 40001; cualquier otro rechazo viola el contrato.
  results.forEach((result) => assertSerializableOrFulfilled(result, 'reemplazo concurrente'))
  assert.ok(results.some((result) => result.status === 'fulfilled'))
  const active = await pool.query(
    'SELECT count(*)::int AS n FROM password_tokens WHERE user_id = $1 AND used_at IS NULL',
    [ids.target],
  )
  assert.equal(active.rows[0].n, 1)
})

test('dos tokens consumidos a la vez permiten una sola contraseña y revocan ambos', { timeout: 20_000 }, async () => {
  const expires = new Date(Date.now() + 3_600_000)
  const tokenA = `${marker}-consume-a`
  const tokenB = `${marker}-consume-b`
  await pool.query(
    `INSERT INTO password_tokens (token, user_id, purpose, expires_at)
     VALUES ($1, $3, 'reset', $4), ($2, $3, 'reset', $4)`,
    [tokenA, tokenB, ids.target, expires],
  )
  const barrier = { locked: deferred(), release: deferred() }
  const holderRepo = pauseAfterUserLock(
    namedTransactions(accessTokensRepository, `${marker}-consume-holder`),
    ids.target,
    barrier,
  )
  const holderTokens = createAccessTokenService({ repo: holderRepo })
  const waiterName = `${marker}-consume-waiter`
  const waiterRepo = namedTransactions(accessTokensRepository, waiterName)
  const waiterTokens = createAccessTokenService({ repo: waiterRepo })
  const results = await observedBlockedRace({
    barrier,
    holderWork: () => holderTokens.consume({ token: tokenA, passwordHash: 'hash-a' }),
    waiterWork: () => waiterTokens.consume({ token: tokenB, passwordHash: 'hash-b' }),
    waiterName,
    label: 'consumo concurrente',
  })
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  const rejected = results.find((result) => result.status === 'rejected')
  assert.ok(rejected)
  assert.ok(
    rejected.reason?.code === '40001'
      || rejected.reason?.message === 'Este enlace ya fue usado.',
    `consumo concurrente: error inesperado ${rejected.reason?.code || rejected.reason?.message}`,
  )
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
