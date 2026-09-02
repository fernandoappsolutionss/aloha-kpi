# Gestión de usuarios por coordinador — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que un coordinador gestione de forma segura administradoras y asistentes de sus centros vigentes, sin ampliar privilegios ni exponer enlaces de restablecimiento de cuentas activas.

**Architecture:** La política pura vive en `lib/current-user.mjs`; un servicio de usuarios inyectable orquesta lecturas, validaciones y mutaciones `Serializable`; repositorios pequeños concentran SQL y tokens. `/dashboard/usuarios` se convierte en una página servidor con guarda fresca y un cliente de interacción, mientras el Sidebar recibe capacidades autenticadas en vez de decidir desde `localStorage`.

**Tech Stack:** Next.js 15 App Router, React 18, JavaScript ESM, Neon PostgreSQL, `withTransaction()`, `node:test` y `tsx` solo como runner de integración de desarrollo. Sin dependencias runtime ni migraciones nuevas.

**Spec:** `docs/superpowers/specs/2026-09-02-coordinador-usuarios-responsive-design.md`

## Global Constraints

- Trabajar solo en `repos/worktrees/aloha-kpi-coordinator-mobile`, rama `codex/aloha-coordinator-mobile`, nacida de `origin/main` en `817ec49`.
- No tocar el checkout `repos/aloha-kpi`, sus modificaciones locales ni `docs/sop/`.
- El actor, su rol y sus centros se releen desde Neon en toda operación; el JWT y `localStorage` no son autoridad.
- `null` significa alcance global de gerencia; `[]` significa cero centros y nunca puede abrir una consulta global.
- El coordinador solo gestiona roles `administradora` y `asistente` en centros de `usuario_centros`.
- El coordinador no elimina cuentas, no gestiona roles privilegiados y no traslada cuentas fuera de sus centros.
- Una invitación pendiente puede devolver un enlace; un restablecimiento de cuenta activa jamás devuelve enlace ni token.
- Toda mutación de Neon autoriza y escribe dentro de una transacción `Serializable`; el correo se envía después del commit como `best effort`.
- La UI y los errores son en español. Las respuestas no enumeran cuentas privilegiadas ni cuentas de otros centros.
- No cambiar fórmulas KPI, esquema de datos, metas ni otros flujos operativos.
- `USUARIOS_TEST_DATABASE_URL` apunta solo a una base desechable local/CI y nunca se configura en producción.

---

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---:|
| `lib/current-user.mjs` | Política pura y capacidades de Gestión de usuarios | 1 |
| `test/current-user.test.mjs` | Matriz de autorización por rol, objetivo y centro | 1 |
| `lib/access-tokens.mjs` | Reemplazo, consumo e invalidación de tokens; testeable sin Next | 2 |
| `lib/access-tokens-repository.js` | SQL transaccional de `password_tokens` y contraseña | 2 |
| `test/access-tokens.test.mjs` | Vigencia, consumo único y revocación | 2 |
| `lib/usuarios-repository.js` | SQL de actor, centros, objetivos, usuarios y transacciones | 3–5 |
| `lib/usuarios-service.mjs` | Caso de uso testeable: pageData/create/update/resendAccess/delete | 3–5 |
| `test/usuarios-service.test.mjs` | Alcance, validaciones, escrituras y privacidad | 3–5 |
| `lib/invitations.js` | Construcción del enlace y entrega de correo después del commit | 5 |
| `app/actions/usuarios.js` | Adaptador de Server Actions al servicio | 5–6 |
| `app/actions/password.js` | Reset público y fijación de contraseña transaccional | 5 |
| `app/actions/auth.js` | Cambio de contraseña e invalidación de tokens | 5 |
| `app/actions/navigation.js` | Contexto fresco y serializable del Sidebar | 6 |
| `components/Sidebar.js` | Navegación por capacidades; sin autoridad en `localStorage` | 6 |
| `app/dashboard/usuarios/page.js` | Página servidor y guarda fresca | 6 |
| `app/dashboard/usuarios/UsuariosClient.js` | Interacción, formularios y resultados seguros | 6 |
| `test/roles-centro.test.mjs` | Contrato estático actualizado de guardas | 6 |
| `test/integration/usuarios-concurrency.integration.mjs` | Carreras reales PostgreSQL | 7 |
| `package.json` | Script de integración destructiva solo para DB desechable | 7 |

## Interfaces bloqueadas

`lib/current-user.mjs` debe exportar:

```js
puedeGestionarUsuarios(actor) -> boolean
rolesAsignablesUsuarios(actor) -> string[]
centrosDestinoUsuarios(actor) -> null | number[]
puedeGestionarUsuario(actor, objetivo) -> boolean
puedeAsignarUsuario(actor, { rol, centroId, centros }) -> boolean
accionesGestionUsuario(actor, objetivo) -> {
  editar: boolean,
  reenviarInvitacion: boolean,
  enviarRestablecimiento: boolean,
  eliminar: boolean,
}
assertGestionUsuarios(actor) -> actor | throws
```

`lib/usuarios-service.mjs` debe exportar:

```js
createUsuariosService({ repo, accessTokens, deliverAccess }) -> {
  pageData(session: { uid }): Promise<PageData>,
  create(session: { uid }, input): Promise<ActionResult>,
  update(session: { uid }, usuarioId, input): Promise<ActionResult>,
  resendAccess(session: { uid }, usuarioId): Promise<ActionResult>,
  delete(session: { uid }, usuarioId): Promise<ActionResult>,
}
```

`PageData` es serializable:

```js
{
  actor: { id, role },
  title: string,
  centers: [{ id, nombre }],
  assignableRoles: ['admin_general' | 'coordinador' | 'administradora' | 'asistente'],
  capabilities: { createUser, deleteUser },
  users: [{
    id, nombre, email, role, centerId, centerIds, centerNames, active,
    actions: { edit, resendInvitation, sendPasswordReset, delete },
  }],
}
```

Resultados de acceso:

```js
{ ok: true, kind: 'invitation', emailSent: boolean, link: string | null, deliveryError?: string }
{ ok: true, kind: 'reset', emailSent: boolean, deliveryError?: string }
```

El segundo objeto no contiene las claves `link` ni `token`.

---

### Task 1: Política pura de Gestión de usuarios

**Files:**
- Modify: `lib/current-user.mjs`
- Modify: `test/current-user.test.mjs`

**Interfaces:**
- Consumes: `esGerencia()`, `centrosDe()` y los roles existentes.
- Produces: las siete exportaciones de política bloqueadas arriba.

- [ ] **Step 1: Escribir la matriz RED**

Agregar a los imports de `test/current-user.test.mjs`:

```js
import {
  puedeGestionarUsuarios, rolesAsignablesUsuarios, centrosDestinoUsuarios,
  puedeGestionarUsuario, puedeAsignarUsuario, accionesGestionUsuario,
  assertGestionUsuarios,
} from '../lib/current-user.mjs'
```

Agregar estas pruebas:

```js
const gerencia = { id: 1, rol: 'admin_general', centros: [] }
const coordinador = { id: 2, rol: 'coordinador', centros: [10, 12] }
const sinCentros = { id: 3, rol: 'coordinador', centros: [] }
const admin10 = { id: 8, rol: 'administradora', centro_id: 10, password_hash: 'hash' }
const asistente12 = { id: 9, rol: 'asistente', centro_id: 12, password_hash: null }
const admin11 = { id: 10, rol: 'administradora', centro_id: 11, password_hash: 'hash' }
const otroCoord = { id: 11, rol: 'coordinador', centro_id: null, centros: [10] }

test('solo gerencia y coordinador abren Gestión de usuarios', () => {
  assert.equal(puedeGestionarUsuarios(gerencia), true)
  assert.equal(puedeGestionarUsuarios(coordinador), true)
  assert.equal(puedeGestionarUsuarios({ rol: 'administradora', centro_id: 10 }), false)
  assert.throws(() => assertGestionUsuarios({ rol: 'asistente', centro_id: 10 }), /No autorizado/)
})

test('roles y centros asignables dependen del actor vigente', () => {
  assert.deepEqual(rolesAsignablesUsuarios(gerencia), ['admin_general', 'coordinador', 'administradora', 'asistente'])
  assert.deepEqual(rolesAsignablesUsuarios(coordinador), ['administradora', 'asistente'])
  assert.deepEqual(centrosDestinoUsuarios(gerencia), null)
  assert.deepEqual(centrosDestinoUsuarios(coordinador), [10, 12])
  assert.deepEqual(centrosDestinoUsuarios(sinCentros), [])
})

test('coordinador gestiona solo cuentas operativas de sus centros', () => {
  assert.equal(puedeGestionarUsuario(coordinador, admin10), true)
  assert.equal(puedeGestionarUsuario(coordinador, asistente12), true)
  assert.equal(puedeGestionarUsuario(coordinador, admin11), false)
  assert.equal(puedeGestionarUsuario(coordinador, otroCoord), false)
  assert.equal(puedeGestionarUsuario(sinCentros, admin10), false)
})

test('coordinador solo asigna roles operativos a centros propios', () => {
  assert.equal(puedeAsignarUsuario(coordinador, { rol: 'administradora', centroId: 10 }), true)
  assert.equal(puedeAsignarUsuario(coordinador, { rol: 'asistente', centroId: 12 }), true)
  assert.equal(puedeAsignarUsuario(coordinador, { rol: 'asistente', centroId: 11 }), false)
  assert.equal(puedeAsignarUsuario(coordinador, { rol: 'coordinador', centros: [10] }), false)
  assert.equal(puedeAsignarUsuario(coordinador, { rol: 'administradora', centroId: null }), false)
})

test('acciones distinguen invitación, reset y borrado de gerencia', () => {
  assert.deepEqual(accionesGestionUsuario(coordinador, asistente12), {
    editar: true, reenviarInvitacion: true, enviarRestablecimiento: false, eliminar: false,
  })
  assert.deepEqual(accionesGestionUsuario(coordinador, admin10), {
    editar: true, reenviarInvitacion: false, enviarRestablecimiento: true, eliminar: false,
  })
  assert.equal(accionesGestionUsuario(coordinador, { ...admin10, password_hash: undefined, activo: true }).enviarRestablecimiento, true)
  assert.equal(accionesGestionUsuario(gerencia, { ...admin10, id: 1 }).eliminar, false)
  assert.equal(accionesGestionUsuario(gerencia, { id: 20, rol: 'admin_general', password_hash: 'x' }).eliminar, false)
  assert.equal(accionesGestionUsuario(gerencia, { id: 21, rol: 'supervisor', password_hash: 'x' }).eliminar, true)
})
```

- [ ] **Step 2: Confirmar el fallo**

Run: `node --test test/current-user.test.mjs`

Expected: FAIL porque las nuevas exportaciones no existen.

- [ ] **Step 3: Implementar la política mínima**

Agregar a `lib/current-user.mjs`:

```js
export const ROLES_OPERATIVOS = Object.freeze(['administradora', 'asistente'])
export const ROLES_ASIGNABLES_GERENCIA = Object.freeze(['admin_general', 'coordinador', ...ROLES_OPERATIVOS])

export function puedeGestionarUsuarios(actor) {
  return Boolean(actor && (esGerencia(actor.rol) || actor.rol === ROL_COORDINADOR))
}

export function rolesAsignablesUsuarios(actor) {
  if (esGerencia(actor?.rol)) return [...ROLES_ASIGNABLES_GERENCIA]
  if (actor?.rol === ROL_COORDINADOR) return [...ROLES_OPERATIVOS]
  return []
}

export function centrosDestinoUsuarios(actor) {
  if (esGerencia(actor?.rol)) return null
  if (actor?.rol === ROL_COORDINADOR) return [...new Set((actor.centros || []).map(Number).filter(Number.isInteger))]
  return []
}

export function puedeGestionarUsuario(actor, objetivo) {
  if (!actor || !objetivo) return false
  if (esGerencia(actor.rol)) return true
  if (actor.rol !== ROL_COORDINADOR || !ROLES_OPERATIVOS.includes(objetivo.rol)) return false
  return centrosDestinoUsuarios(actor).includes(Number(objetivo.centro_id))
}

export function puedeAsignarUsuario(actor, { rol, centroId, centros = [] } = {}) {
  if (!rolesAsignablesUsuarios(actor).includes(rol)) return false
  if (esGerencia(actor?.rol)) {
    if (rol === ROL_COORDINADOR) return Array.isArray(centros) && centros.length > 0
    return true
  }
  return ROLES_OPERATIVOS.includes(rol) && Number.isInteger(Number(centroId)) && centrosDestinoUsuarios(actor).includes(Number(centroId))
}

export function accionesGestionUsuario(actor, objetivo) {
  const editar = puedeGestionarUsuario(actor, objetivo)
  const active = Boolean(objetivo?.active ?? objetivo?.activo ?? objetivo?.password_hash)
  return {
    editar,
    reenviarInvitacion: editar && !active,
    enviarRestablecimiento: editar && active,
    eliminar: Boolean(editar && esGerencia(actor?.rol) && actor.id !== objetivo?.id && objetivo?.rol !== 'admin_general'),
  }
}

export function assertGestionUsuarios(actor) {
  if (!puedeGestionarUsuarios(actor)) throw new Error('No autorizado.')
  return actor
}
```

- [ ] **Step 4: Ejecutar pruebas**

Run: `node --test test/current-user.test.mjs`

Expected: todas pasan.

- [ ] **Step 5: Commit**

```bash
git add lib/current-user.mjs test/current-user.test.mjs
git commit -m "feat(usuarios): definir política del coordinador"
```

---

### Task 2: Ciclo seguro de tokens de acceso

**Files:**
- Create: `lib/access-tokens.mjs`
- Create: `lib/access-tokens-repository.js`
- Create: `test/access-tokens.test.mjs`

**Interfaces:**
- Consumes: repositorio inyectado con `transaction`, `findUserByEmail`, `findToken`, `lockUser`, `lockTokensForUser`, `invalidateActive`, `insertToken` y `updatePassword`.
- Produces: `createAccessTokenService({ repo, now, makeToken })` con `replace`, `consume`, `changePassword` e `invalidate`; `replace` acepta un `cooldownMinutes` opcional para el reset público.

- [ ] **Step 1: Escribir pruebas RED del ciclo de tokens**

Crear `test/access-tokens.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { accessPurpose, createAccessTokenService } from '../lib/access-tokens.mjs'

function fakeRepo(seed = {}) {
  const state = { users: new Map([[8, { id: 8, email: 'u@aloha.com' }]]), tokens: new Map(), ...seed }
  return {
    state,
    transaction: async (work) => work('query'),
    findUserByEmail: async (_q, email) => [...state.users.values()].find((user) => user.email === email),
    lockUser: async (_q, id) => state.users.get(Number(id)),
    findToken: async (_q, token) => state.tokens.get(token),
    lockTokensForUser: async (_q, userId) => [...state.tokens.values()].filter((row) => row.user_id === Number(userId)).sort((a, b) => a.token.localeCompare(b.token)),
    invalidateActive: async (_q, userId) => {
      for (const row of state.tokens.values()) if (row.user_id === userId && !row.used_at) row.used_at = 'used'
    },
    insertToken: async (_q, row) => state.tokens.set(row.token, { ...row, used_at: null }),
    updatePassword: async (_q, userId, hash) => { state.users.get(userId).password_hash = hash },
  }
}

test('accessPurpose distingue cuenta pendiente de cuenta activa', () => {
  assert.equal(accessPurpose({ password_hash: null }), 'invite')
  assert.equal(accessPurpose({ password_hash: 'hash' }), 'reset')
})

test('replace invalida tokens anteriores e inserta uno nuevo', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('viejo', { token: 'viejo', user_id: 8, used_at: null })
  const service = createAccessTokenService({ repo, makeToken: () => 'nuevo', now: () => new Date('2026-09-02T12:00:00Z') })
  const issued = await repo.transaction((query) => service.replace(query, { userId: 8, purpose: 'invite', hours: 48 }))
  assert.equal(issued.token, 'nuevo')
  assert.equal(repo.state.tokens.get('viejo').used_at, 'used')
  assert.equal(repo.state.tokens.get('nuevo').purpose, 'invite')
})

test('replace suprime un reset público reciente sin invalidarlo ni enviar otro token', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('reciente', {
    token: 'reciente', user_id: 8, purpose: 'reset',
    created_at: '2026-09-02T11:55:00Z', expires_at: '2026-09-02T14:00:00Z', used_at: null,
  })
  const service = createAccessTokenService({ repo, makeToken: () => 'no-debe-crearse', now: () => new Date('2026-09-02T12:00:00Z') })
  const result = await repo.transaction((query) => service.replace(query, {
    userId: 8, purpose: 'reset', hours: 2, cooldownMinutes: 15,
  }))
  assert.deepEqual(result, { suppressed: true, user: repo.state.users.get(8) })
  assert.equal(repo.state.tokens.has('no-debe-crearse'), false)
  assert.equal(repo.state.tokens.get('reciente').used_at, null)
})

test('consume actualiza contraseña e invalida todos los tokens en una transacción', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('a', { token: 'a', user_id: 8, expires_at: '2026-09-03T00:00:00Z', used_at: null })
  repo.state.tokens.set('b', { token: 'b', user_id: 8, expires_at: '2026-09-03T00:00:00Z', used_at: null })
  const service = createAccessTokenService({ repo, now: () => new Date('2026-09-02T12:00:00Z') })
  const user = await service.consume({ token: 'a', passwordHash: 'hash-nuevo' })
  assert.equal(user.id, 8)
  assert.equal(repo.state.users.get(8).password_hash, 'hash-nuevo')
  assert.equal(repo.state.tokens.get('a').used_at, 'used')
  assert.equal(repo.state.tokens.get('b').used_at, 'used')
})

test('consume rechaza token usado o vencido sin escribir', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('usado', { token: 'usado', user_id: 8, expires_at: '2026-09-03T00:00:00Z', used_at: 'x' })
  repo.state.tokens.set('vencido', { token: 'vencido', user_id: 8, expires_at: '2026-09-01T00:00:00Z', used_at: null })
  const service = createAccessTokenService({ repo, now: () => new Date('2026-09-02T12:00:00Z') })
  await assert.rejects(() => service.consume({ token: 'usado', passwordHash: 'x' }), /usado/)
  await assert.rejects(() => service.consume({ token: 'vencido', passwordHash: 'x' }), /venció/)
  assert.equal(repo.state.users.get(8).password_hash, undefined)
})

test('changePassword invalida todo enlace pendiente', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('reset', { token: 'reset', user_id: 8, used_at: null })
  await createAccessTokenService({ repo }).changePassword({ userId: 8, passwordHash: 'perfil-hash' })
  assert.equal(repo.state.users.get(8).password_hash, 'perfil-hash')
  assert.equal(repo.state.tokens.get('reset').used_at, 'used')
})

test('invalidate revoca accesos dentro de una transacción externa', async () => {
  const repo = fakeRepo()
  repo.state.tokens.set('pendiente', { token: 'pendiente', user_id: 8, used_at: null })
  const service = createAccessTokenService({ repo })
  await repo.transaction((query) => service.invalidate(query, { userId: 8 }))
  assert.equal(repo.state.tokens.get('pendiente').used_at, 'used')
})
```

- [ ] **Step 2: Confirmar el fallo**

Run: `node --test test/access-tokens.test.mjs`

Expected: FAIL porque `lib/access-tokens.mjs` no existe.

- [ ] **Step 3: Implementar `createAccessTokenService`**

Crear `lib/access-tokens.mjs` con estas reglas exactas:

```js
const PURPOSES = new Set(['invite', 'reset'])

export function accessPurpose(user) {
  if (!user) throw new Error('Usuario no encontrado.')
  return user.password_hash ? 'reset' : 'invite'
}

function defaultToken() {
  const part = () => globalThis.crypto.randomUUID().replaceAll('-', '')
  return part() + part()
}

export function createAccessTokenService({ repo, now = () => new Date(), makeToken = defaultToken }) {
  async function replace(query, { userId, purpose, hours, cooldownMinutes = 0 }) {
    if (!PURPOSES.has(purpose)) throw new Error('Propósito de acceso inválido.')
    const user = await repo.lockUser(query, Number(userId))
    if (!user) throw new Error('Usuario no encontrado.')
    const tokens = await repo.lockTokensForUser(query, user.id)
    const issuedAt = now()
    const cooldownMs = Math.max(0, Number(cooldownMinutes) || 0) * 60_000
    const recent = cooldownMs > 0 && tokens.some((row) =>
      row.purpose === purpose
      && !row.used_at
      && new Date(row.expires_at) > issuedAt
      && issuedAt.getTime() - new Date(row.created_at).getTime() < cooldownMs
    )
    if (recent) return { suppressed: true, user }
    const token = makeToken()
    const expiresAt = new Date(issuedAt.getTime() + Number(hours) * 3600_000).toISOString()
    await repo.invalidateActive(query, user.id)
    await repo.insertToken(query, { token, user_id: user.id, purpose, expires_at: expiresAt })
    return { suppressed: false, token, expiresAt, user }
  }

  async function consume({ token, passwordHash }) {
    return repo.transaction(async (query) => {
      const found = await repo.findToken(query, token)
      if (!found) throw new Error('Enlace inválido.')
      const user = await repo.lockUser(query, found.user_id)
      if (!user) throw new Error('Enlace inválido.')
      const tokens = await repo.lockTokensForUser(query, user.id)
      const row = tokens.find((candidate) => candidate.token === token)
      if (!row) throw new Error('Enlace inválido.')
      if (row.used_at) throw new Error('Este enlace ya fue usado.')
      if (new Date(row.expires_at) < now()) throw new Error('Este enlace venció. Pide uno nuevo.')
      await repo.updatePassword(query, user.id, passwordHash)
      await repo.invalidateActive(query, user.id)
      return user
    })
  }

  async function changePassword({ userId, passwordHash }) {
    return repo.transaction(async (query) => {
      const user = await repo.lockUser(query, Number(userId))
      if (!user) throw new Error('No autenticado')
      await repo.lockTokensForUser(query, user.id)
      await repo.updatePassword(query, user.id, passwordHash)
      await repo.invalidateActive(query, user.id)
      return user
    })
  }

  async function invalidate(query, { userId }) {
    await repo.lockTokensForUser(query, Number(userId))
    await repo.invalidateActive(query, Number(userId))
  }

  return { replace, consume, changePassword, invalidate }
}
```

- [ ] **Step 4: Implementar el repositorio SQL**

Crear `lib/access-tokens-repository.js`. Usar `withTransaction(work, { isolationLevel: 'Serializable' })`. Las consultas críticas son:

```sql
SELECT id, nombre, email, rol, centro_id, password_hash
FROM usuarios WHERE id = $1 FOR UPDATE;

SELECT id, nombre, email, rol, centro_id, password_hash
FROM usuarios WHERE email = $1;

SELECT token,user_id,purpose,expires_at,used_at,created_at
FROM password_tokens WHERE token = $1;

SELECT token,user_id,purpose,expires_at,used_at,created_at
FROM password_tokens WHERE user_id = $1
ORDER BY token FOR UPDATE;

UPDATE password_tokens
SET used_at = COALESCE(used_at, now())
WHERE user_id = $1 AND used_at IS NULL;

INSERT INTO password_tokens (token, user_id, purpose, expires_at)
VALUES ($1, $2, $3, $4);

UPDATE usuarios SET password_hash = $2 WHERE id = $1;
```

Exportar `accessTokensRepository` con la misma firma usada por el fake de las pruebas, incluido `findUserByEmail(query, email)`. Este método queda implementado y versionado en esta Task 2; Task 5 solo lo consume.

- [ ] **Step 5: Ejecutar pruebas y suite de roles**

Run: `node --test test/access-tokens.test.mjs test/current-user.test.mjs`

Expected: todas pasan.

- [ ] **Step 6: Commit**

```bash
git add lib/access-tokens.mjs lib/access-tokens-repository.js test/access-tokens.test.mjs
git commit -m "feat(auth): invalidar tokens de acceso de forma atómica"
```

---

### Task 3: Lectura fresca y filtrada para Gestión de usuarios

**Files:**
- Create: `lib/usuarios-repository.js`
- Create: `lib/usuarios-service.mjs`
- Create: `test/usuarios-service.test.mjs`

**Interfaces:**
- Consumes: política de Task 1 y `accessTokens.replace()` de Task 2.
- Produces: `createUsuariosService()` con `pageData()` y la base de las mutaciones.

- [ ] **Step 1: Escribir pruebas RED de `pageData`**

Crear `test/usuarios-service.test.mjs` con un fake que registra llamadas:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { createUsuariosService } from '../lib/usuarios-service.mjs'

const coord = { id: 2, rol: 'coordinador', centros: [10, 12], password_hash: 'hash' }
const rows = [
  { id: 8, nombre: 'A', email: 'a@aloha.com', rol: 'administradora', centro_id: 10, centro_nombre: 'ANCLAS', centros: [], centros_nombres: [], activo: true },
  { id: 9, nombre: 'B', email: 'b@aloha.com', rol: 'asistente', centro_id: 12, centro_nombre: 'DAVID', centros: [], centros_nombres: [], activo: false },
]

function readRepo(actor = coord, users = rows) {
  const calls = []
  const repo = {
    calls,
    transaction: async (work) => work(repo),
    loadActor: async (_q, uid, options) => { calls.push(['actor', uid, options]); return actor },
    listUsers: async (_q, scope) => { calls.push(['users', scope]); return users },
    listCenters: async (_q, scope) => { calls.push(['centers', scope]); return [{ id: 10, nombre: 'ANCLAS' }, { id: 12, nombre: 'DAVID' }] },
  }
  return repo
}

test('pageData usa el actor de DB y el alcance vigente', async () => {
  const repo = readRepo()
  const result = await createUsuariosService({ repo }).pageData({ uid: 2, rol: 'admin_general', centros: null })
  assert.equal(result.actor.role, 'coordinador')
  assert.deepEqual(result.centers.map((c) => c.id), [10, 12])
  assert.deepEqual(repo.calls.find((c) => c[0] === 'users')[1], [10, 12])
  assert.deepEqual(result.users.map((u) => u.role), ['administradora', 'asistente'])
  assert.deepEqual(result.users[0].centerIds, [10])
  assert.deepEqual(result.users[0].centerNames, ['ANCLAS'])
  assert.equal(result.users[0].active, true)
  assert.deepEqual(result.users[0].actions, {
    edit: true, resendInvitation: false, sendPasswordReset: true, delete: false,
  })
})

test('coordinador sin centros no cae en alcance global', async () => {
  const repo = readRepo({ ...coord, centros: [] }, [])
  const result = await createUsuariosService({ repo }).pageData({ uid: 2 })
  assert.deepEqual(result.centers, [])
  assert.deepEqual(result.users, [])
  assert.equal(result.capabilities.createUser, false)
  assert.deepEqual(repo.calls.find((c) => c[0] === 'users')[1], [])
})

test('rol sin gestión queda denegado antes de listar', async () => {
  const repo = readRepo({ id: 7, rol: 'administradora', centro_id: 10, password_hash: 'x' })
  await assert.rejects(() => createUsuariosService({ repo }).pageData({ uid: 7 }), /No autorizado/)
  assert.equal(repo.calls.some((c) => c[0] === 'users'), false)
})
```

- [ ] **Step 2: Confirmar el fallo**

Run: `node --test test/usuarios-service.test.mjs`

Expected: FAIL porque el servicio no existe.

- [ ] **Step 3: Implementar el presentador y `pageData`**

Crear `lib/usuarios-service.mjs`. `pageData()` debe:

```js
return repo.transaction(async (query) => {
  const actor = assertGestionUsuarios(await repo.loadActor(query, Number(session.uid), { lock: false }))
  const scope = centrosDestinoUsuarios(actor)
  const centers = await repo.listCenters(query, scope)
  const rows = await repo.listUsers(query, scope)
  return {
    actor: { id: actor.id, role: actor.rol },
    title: actor.rol === 'coordinador' ? 'Usuarios de mis centros' : 'Gestión de usuarios',
    centers,
    assignableRoles: rolesAsignablesUsuarios(actor),
    capabilities: { createUser: scope === null || scope.length > 0, deleteUser: esGerencia(actor.rol) },
    users: rows.map((row) => {
      const allowed = accionesGestionUsuario(actor, row)
      const relationshipCenterIds = Array.isArray(row.centros)
        ? row.centros.map(Number).filter(Number.isInteger)
        : []
      const centerIds = relationshipCenterIds.length > 0
        ? relationshipCenterIds
        : (row.centro_id == null ? [] : [Number(row.centro_id)])
      const relationshipCenterNames = Array.isArray(row.centros_nombres)
        ? row.centros_nombres.filter(Boolean)
        : []
      return {
        id: row.id,
        nombre: row.nombre,
        email: row.email,
        role: row.rol,
        centerId: row.centro_id,
        centerIds,
        centerNames: relationshipCenterNames.length > 0
          ? relationshipCenterNames
          : (row.centro_nombre ? [row.centro_nombre] : []),
        active: Boolean(row.activo ?? row.password_hash),
        actions: {
          edit: allowed.editar,
          resendInvitation: allowed.reenviarInvitacion,
          sendPasswordReset: allowed.enviarRestablecimiento,
          delete: allowed.eliminar,
        },
      }
    }),
  }
})
```

No incluir `password_hash` en el resultado.

- [ ] **Step 4: Implementar `usuariosRepository`**

Crear `lib/usuarios-repository.js` con `transaction`, `loadActor`, `listUsers` y `listCenters`.

Reglas SQL obligatorias:

- `loadActor(..., { lock:true })` bloquea primero `usuarios` y luego consulta `usuario_centros ORDER BY centro_id FOR SHARE`; no usa `ARRAY_AGG ... FOR UPDATE`.
- `listUsers(query, null)` usa el listado global actual y devuelve `centros int[]` ordenado para coordinadores.
- `listUsers(query, [])` devuelve `[]` sin ejecutar un SELECT global.
- `listUsers(query, ids)` incluye en SQL `u.rol = ANY($1::text[]) AND u.centro_id = ANY($2::int[])` con roles `administradora/asistente`; devuelve `centros:[]` para esos roles.
- `listCenters(query, null)` lista todos; `listCenters(query, [])` devuelve `[]`; el caso restringido usa `id = ANY($1::int[])`.

- [ ] **Step 5: Ejecutar pruebas**

Run: `node --test test/usuarios-service.test.mjs test/current-user.test.mjs`

Expected: todas pasan.

- [ ] **Step 6: Commit**

```bash
git add lib/usuarios-repository.js lib/usuarios-service.mjs test/usuarios-service.test.mjs
git commit -m "feat(usuarios): listar cuentas desde el alcance vigente"
```

---

### Task 4: Crear, editar y eliminar con autorización transaccional

**Files:**
- Modify: `lib/usuarios-repository.js`
- Modify: `lib/usuarios-service.mjs`
- Modify: `test/usuarios-service.test.mjs`

**Interfaces:**
- Consumes: `repo.loadActor(..., { lock:true })`, política de Task 1 y `accessTokens.replace()/invalidate()`.
- Produces: `create()`, `update()` y `delete()` completos.

- [ ] **Step 1: Agregar pruebas RED de validación y alcance**

Agregar casos con un repositorio fake que cuente escrituras:

```js
test('coordinador crea rol operativo en centro propio y recibe invitación', async () => {
  const fx = writeFixture()
  const result = await fx.service.create({ uid: 2 }, {
    nombre: ' Laura ', email: 'LAURA@ALOHA.COM', rol: 'asistente', centro_id: 10,
  })
  assert.equal(result.kind, 'invitation')
  assert.equal(result.link, 'https://app/set-password?token=t-1')
  assert.deepEqual(fx.inserted, [{ nombre: 'Laura', email: 'laura@aloha.com', rol: 'asistente', centro_id: 10 }])
})

test('fallo del transporte no revierte la cuenta ni filtra el error', async () => {
  const fx = writeFixture({ deliveryError: Object.assign(new Error('SMTP: laura@aloha.com'), { code: 'ETIMEDOUT' }) })
  const result = await fx.service.create({ uid: 2 }, validInput())
  assert.equal(fx.inserted.length, 1)
  assert.equal(fx.tokens.length, 1)
  assert.deepEqual(result, {
    ok: true, kind: 'invitation', emailSent: false, link: null, deliveryError: 'delivery_failed',
  })
  assert.doesNotMatch(JSON.stringify(result), /laura@aloha\.com|SMTP|t-1/)
})

test('crear rechaza centro ajeno, rol privilegiado y payload inválido sin escribir', async () => {
  for (const input of [
    { nombre: 'A', email: 'a@a.com', rol: 'asistente', centro_id: 11 },
    ...['coordinador', 'supervisor', 'admin_general'].map((rol) => ({
      nombre: 'A', email: 'a@a.com', rol, centros: [10], centro_id: 10,
    })),
    { nombre: ' ', email: 'a@a.com', rol: 'asistente', centro_id: 10 },
    { nombre: 'A', email: 'correo-inválido', rol: 'asistente', centro_id: 10 },
    { nombre: 'A', email: 'a@a.com', rol: 'asistente', centro_id: null },
  ]) {
    const fx = writeFixture()
    await assert.rejects(() => fx.service.create({ uid: 2 }, input))
    assert.equal(fx.writes(), 0)
  }
})

test('update exige objetivo y destino dentro del alcance', async () => {
  const fx = writeFixture()
  await fx.service.update({ uid: 2 }, 8, { nombre: 'Nueva', rol: 'administradora', centro_id: 12 })
  assert.deepEqual(fx.updated, [{ id: 8, nombre: 'Nueva', rol: 'administradora', centro_id: 12 }])
  assert.deepEqual(fx.invalidated, [8])
  await assert.rejects(() => fx.service.update({ uid: 2 }, 8, { nombre: 'Nueva', rol: 'asistente', centro_id: 11 }), /No tienes permiso/)
  await assert.rejects(() => fx.service.update({ uid: 2 }, 20, { nombre: 'Jefe', rol: 'admin_general', centro_id: null }), /No tienes permiso/)
})

test('coordinador no elimina; gerencia respeta admin_general y autoborrado', async () => {
  const coordFx = writeFixture()
  await assert.rejects(() => coordFx.service.delete({ uid: 2 }, 8), /No tienes permiso/)
  const adminFx = writeFixture({ actor: { id: 1, rol: 'admin_general', password_hash: 'x' } })
  await assert.rejects(() => adminFx.service.delete({ uid: 1 }, 1), /propia cuenta/)
  await assert.rejects(() => adminFx.service.delete({ uid: 1 }, 20), /Administrador General/)
  await adminFx.service.delete({ uid: 1 }, 9)
  assert.deepEqual(adminFx.deleted, [9])
})

test('duplicado ajeno y 23505 no enumeran la cuenta', async () => {
  const hiddenAccount = { id: 20, rol: 'admin_general', centro_id: null }
  const hidden = writeFixture({ duplicate: hiddenAccount })
  await assert.rejects(() => hidden.service.create({ uid: 2 }, validInput()), /^Error: No tienes permiso para gestionar este usuario\.$/)
  const race = writeFixture({
    insertError: Object.assign(new Error('unique'), { code: '23505' }),
    duplicateAfterError: hiddenAccount,
  })
  await assert.rejects(() => race.service.create({ uid: 2 }, validInput()), /^Error: No tienes permiso para gestionar este usuario\.$/)
})

test('40001 abre transacción nueva, relee actor y nunca sale como código crudo', async () => {
  const visible = { id: 8, rol: 'administradora', centro_id: 10 }
  const fx = writeFixture({
    insertError: Object.assign(new Error('serialization'), { code: '40001' }),
    duplicateAfterError: visible,
    actorAfterError: { ...coord, centros: [] },
  })
  await assert.rejects(
    () => fx.service.create({ uid: 2 }, validInput()),
    /^Error: No tienes permiso para gestionar este usuario\.$/,
  )
  assert.ok(fx.transactionCount() >= 2)
  assert.ok(fx.actorReadCount() >= 2)
})

test('cada rol se persiste con una sola forma canónica de centros', async () => {
  const adminFx = writeFixture({ actor: { id: 1, rol: 'admin_general', centros: [] } })
  await adminFx.service.create({ uid: 1 }, {
    nombre: 'Coord', email: 'coord@test.invalid', rol: 'coordinador', centro_id: 10, centros: [12],
  })
  assert.equal(adminFx.inserted[0].centro_id, null)
  assert.deepEqual(adminFx.coordinatorCenters, [{ userId: 30, ids: [12] }])

  const opFx = writeFixture()
  await opFx.service.create({ uid: 2 }, {
    nombre: 'Operativa', email: 'op@test.invalid', rol: 'asistente', centro_id: 10, centros: [12],
  })
  assert.equal(opFx.inserted[0].centro_id, 10)
  assert.deepEqual(opFx.coordinatorCenters, [])

  const unassignedFx = writeFixture({ actor: { id: 1, rol: 'admin_general', centros: [] } })
  await unassignedFx.service.create({ uid: 1 }, {
    nombre: 'Sin centro', email: 'sin-centro@test.invalid', rol: 'administradora', centro_id: null, centros: [12],
  })
  assert.equal(unassignedFx.inserted[0].centro_id, null)
  assert.deepEqual(unassignedFx.coordinatorCenters, [])
})

test('duplicado ya visible puede identificarse sin revelar datos adicionales', async () => {
  const visible = writeFixture({ duplicate: { id: 8, rol: 'administradora', centro_id: 10 } })
  await assert.rejects(
    () => visible.service.create({ uid: 2 }, validInput()),
    /^Error: El correo ya está registrado en un usuario visible\.$/,
  )
})
```

Definir antes de esos tests:

```js
function validInput() {
  return { nombre: 'Laura', email: 'laura@aloha.com', rol: 'asistente', centro_id: 10 }
}

function writeFixture({ actor = coord, actorAfterError = null, duplicate = null, duplicateAfterError = null, insertError = null, deliveryError = null } = {}) {
  const inserted = []
  const updated = []
  const deleted = []
  const tokens = []
  const invalidated = []
  const deliveries = []
  const coordinatorCenters = []
  const targets = new Map([
    [1, { id: 1, rol: 'admin_general', centro_id: null, password_hash: 'x' }],
    [8, { id: 8, nombre: 'A', email: 'a@aloha.com', rol: 'administradora', centro_id: 10, password_hash: 'x' }],
    [9, { id: 9, nombre: 'B', email: 'b@aloha.com', rol: 'asistente', centro_id: 12, password_hash: null }],
    [20, { id: 20, nombre: 'Jefe', email: 'j@aloha.com', rol: 'admin_general', centro_id: null, password_hash: 'x' }],
  ])
  let writeCount = 0
  let duplicateReads = 0
  let actorReads = 0
  let transactions = 0
  const repo = {
    transaction: async (work) => { transactions++; return work(repo) },
    loadActor: async () => {
      actorReads++
      return actorReads > 1 && actorAfterError ? actorAfterError : actor
    },
    findByEmail: async () => {
      duplicateReads++
      return duplicateReads > 1 && duplicateAfterError ? duplicateAfterError : duplicate
    },
    lockUser: async (_q, id) => Number(id) === Number(actor.id) ? actor : targets.get(Number(id)),
    insertUser: async (_q, row) => {
      if (insertError) throw insertError
      inserted.push(row); writeCount++
      const saved = { id: 30, ...row, password_hash: null }
      targets.set(saved.id, saved)
      return saved
    },
    updateUser: async (_q, id, row) => { updated.push({ id, ...row }); writeCount++; return { ...targets.get(id), ...row } },
    replaceCoordinatorCenters: async (_q, userId, ids) => { coordinatorCenters.push({ userId, ids }); writeCount++ },
    deleteUser: async (_q, id) => { deleted.push(id); writeCount++ },
  }
  const accessTokens = {
    replace: async (_q, row) => { tokens.push(row); writeCount++; return { token: 't-1', user: targets.get(row.userId) } },
    invalidate: async (_q, { userId }) => { invalidated.push(userId); writeCount++ },
  }
  const deliverAccess = async (row) => {
    deliveries.push(row)
    if (deliveryError) throw deliveryError
    return { emailSent: true, link: `https://app/set-password?token=${row.token}` }
  }
  return {
    repo, inserted, updated, deleted, tokens, invalidated, deliveries, coordinatorCenters,
    transactionCount: () => transactions,
    actorReadCount: () => actorReads,
    writes: () => writeCount,
    service: createUsuariosService({ repo, accessTokens, deliverAccess }),
  }
}
```

- [ ] **Step 2: Confirmar los fallos**

Run: `node --test test/usuarios-service.test.mjs`

Expected: FAIL en `create`, `update` y `delete` inexistentes.

- [ ] **Step 3: Implementar normalización y validación**

En `lib/usuarios-service.mjs`, agregar funciones privadas:

```js
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DENIED = 'No tienes permiso para gestionar este usuario.'

function parseId(value) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) throw new Error('Identificador inválido.')
  return id
}

function normalizeInput(input, { creating }) {
  const nombre = String(input?.nombre || '').trim()
  if (!nombre) throw new Error('Nombre es requerido.')
  const email = creating ? String(input?.email || '').trim().toLowerCase() : undefined
  if (creating && !EMAIL.test(email)) throw new Error('Escribe un correo válido.')
  const rol = String(input?.rol || '')
  const centerInputs = Array.isArray(input?.centros) ? input.centros : []
  const operationalCenterId = ROLES_OPERATIVOS.includes(rol)
    ? (input?.centro_id == null || input.centro_id === '' ? null : parseId(input.centro_id))
    : null
  return {
    nombre,
    email,
    rol,
    centro_id: ROLES_OPERATIVOS.includes(rol)
      ? operationalCenterId
      : null,
    centros: rol === ROL_COORDINADOR
      ? [...new Set(centerInputs.map(parseId))]
      : [],
  }
}
```

Importar `ROL_COORDINADOR` y `ROLES_OPERATIVOS` desde la política. La forma canónica es obligatoria: coordinador → `centro_id:null` y relaciones N:N; rol operativo → `centro_id` único o `null` y `centros:[]`; rol global → ambos vacíos. Un campo extraño no se persiste ni deja relaciones residuales. La política exige un centro entero al coordinador actor, mientras gerencia conserva la opción actual `Sin asignar` para cuentas operativas.

- [ ] **Step 4: Implementar mutaciones con el mismo orden de bloqueo**

Cada mutación debe ejecutar dentro de `repo.transaction`:

1. `repo.loadActor(query, uid, { lock:true })`.
2. `assertGestionUsuarios(actor)`.
3. Para objetivo existente: `repo.lockUser(query, usuarioId)`.
4. Validar objetivo actual con `puedeGestionarUsuario`.
5. Validar resultado con `puedeAsignarUsuario`.
6. Escribir usuario y relaciones.

En `create()`, llamar `replaceCoordinatorCenters()` solo si el rol canónico es coordinador. En `update()`, llamarlo siempre: con los IDs canónicos para coordinador y con `[]` para cualquier otro rol, eliminando relaciones N:N residuales al degradar o cambiar una cuenta.

`create()` emite una invitación con `accessTokens.replace(query, { userId, purpose:'invite', hours:48 })` dentro de la misma transacción. `update()` compara rol/centro antes y después; si cambia cualquiera, llama `accessTokens.invalidate(query, { userId })` antes del commit. `delete()` también invalida antes de borrar. `deliverAccess()` corre después de que `repo.transaction` retorne. Capturar `23505` y `40001` sin incluir correo, rol ni código SQL.

Todas las rutas administradas de entrega (`create()` y `resendAccess()`) usan este helper después del commit:

```js
async function deliverBestEffort(prepared) {
  try {
    return await deliverAccess(prepared)
  } catch (error) {
    const rawCode = String(error?.code || '')
    const code = /^[A-Z0-9_]{1,40}$/.test(rawCode) ? rawCode : 'DELIVERY_FAILED'
    console.error('[usuarios:delivery]', { code })
    return { emailSent: false, emailReason: 'delivery_failed', link: null }
  }
}
```

El resultado de invitación usa `link: delivery.link || null`; un error del proveedor nunca revierte la cuenta/token ya confirmados ni incluye el mensaje original del proveedor.

La colisión usa esta única función, tanto para `findByEmail()` como para `23505`:

```js
function duplicateError(actor, existing) {
  if (esGerencia(actor.rol)) return new Error('El correo ya está registrado.')
  if (puedeGestionarUsuario(actor, existing)) {
    return new Error('El correo ya está registrado en un usuario visible.')
  }
  return new Error(DENIED)
}
```

El precheck pasa a `duplicateError(actor, existing)`. Si el INSERT lanza `23505` o la transacción serializable lanza `40001`, la transacción se revierte y el servicio abre una nueva transacción de solo lectura, relee actor y duplicado con `loadActor(...,{lock:false})`/`findByEmail()`, y, si la fila ya existe, lanza la misma función. Si un `40001` aún no encuentra la fila ganadora, repetir una sola vez la operación completa con actor fresco; si vuelve a serializar, lanzar el mensaje seguro genérico de la action, nunca el código SQL. El coordinador solo recibe el mensaje visible cuando la fila ya pertenece a su listado autorizado; gerencia conserva el mensaje global. La prueba de carrera exige uno de los mensajes de `duplicateError`; no acepta `40001` crudo.

- [ ] **Step 5: Añadir métodos SQL al repositorio**

Implementar:

```js
findByEmail(query, email)
lockUser(query, id)
insertUser(query, { nombre, email, rol, centro_id })
updateUser(query, id, { nombre, rol, centro_id })
replaceCoordinatorCenters(query, usuarioId, ids)
deleteUser(query, id)
```

`replaceCoordinatorCenters` elimina e inserta con los IDs ordenados; no interpola identificadores ni valores.

- [ ] **Step 6: Ejecutar pruebas**

Run: `node --test test/usuarios-service.test.mjs test/current-user.test.mjs test/access-tokens.test.mjs`

Expected: todas pasan.

- [ ] **Step 7: Commit**

```bash
git add lib/usuarios-repository.js lib/usuarios-service.mjs test/usuarios-service.test.mjs
git commit -m "feat(usuarios): proteger altas ediciones y eliminaciones"
```

---

### Task 5: Invitaciones, restablecimientos y cambio de contraseña

**Files:**
- Modify: `lib/invitations.js`
- Modify: `lib/usuarios-service.mjs`
- Modify: `test/usuarios-service.test.mjs`
- Modify: `app/actions/password.js`
- Modify: `app/actions/auth.js`
- Modify: `test/access-tokens.test.mjs`

**Interfaces:**
- Consumes: `accessTokens.replace/consume/changePassword/invalidate` y `deliverAccess({ user, purpose, token, hours })`.
- Produces: `resendAccess()` y respuestas que discriminan `kind:'invitation'|'reset'` sin filtrar tokens.

- [ ] **Step 1: Agregar pruebas RED de envío administrado**

Agregar a `test/usuarios-service.test.mjs`:

```js
test('cuenta pendiente devuelve invitación y reemplaza token dentro de la transacción', async () => {
  const fx = accessFixture({ target: { id: 9, rol: 'asistente', centro_id: 12, password_hash: null } })
  const result = await fx.service.resendAccess({ uid: 2 }, 9)
  assert.equal(result.kind, 'invitation')
  assert.equal(result.link, 'https://app/set-password?token=t-1')
  assert.deepEqual(fx.tokens, [{ userId: 9, purpose: 'invite', hours: 48 }])
})

test('cuenta activa recibe reset por correo y la respuesta no contiene secreto', async () => {
  const fx = accessFixture({ target: { id: 8, rol: 'administradora', centro_id: 10, password_hash: 'hash' } })
  const result = await fx.service.resendAccess({ uid: 2 }, 8)
  assert.equal(result.kind, 'reset')
  assert.equal(result.emailSent, true)
  assert.equal(Object.hasOwn(result, 'link'), false)
  assert.equal(Object.hasOwn(result, 'token'), false)
  assert.doesNotMatch(JSON.stringify(result), /set-password|t-1/)
})

test('fallo de correo en reset activo no degrada a enlace copiable', async () => {
  const fx = accessFixture({
    target: { id: 8, rol: 'administradora', centro_id: 10, password_hash: 'hash' },
    delivery: { emailSent: false, emailReason: '/set-password?token=secreto-del-proveedor', link: 'https://app/set-password?token=t-1' },
  })
  const result = await fx.service.resendAccess({ uid: 2 }, 8)
  assert.deepEqual(result, { ok: true, kind: 'reset', emailSent: false, deliveryError: 'delivery_failed' })
  assert.doesNotMatch(JSON.stringify(result), /set-password|secreto-del-proveedor|t-1/)
})

test('throw del transporte tras confirmar reset se degrada sin exponer secreto', async () => {
  const fx = accessFixture({
    target: { id: 8, rol: 'administradora', centro_id: 10, password_hash: 'hash' },
    deliveryError: Object.assign(new Error('SMTP t-1'), { code: 'ETIMEDOUT' }),
  })
  const result = await fx.service.resendAccess({ uid: 2 }, 8)
  assert.equal(fx.tokens.length, 1)
  assert.deepEqual(result, { ok: true, kind: 'reset', emailSent: false, deliveryError: 'delivery_failed' })
  assert.doesNotMatch(JSON.stringify(result), /SMTP|t-1|set-password/)
})

test('reset ajeno o privilegiado no emite token ni correo', async () => {
  for (const target of [
    { id: 18, rol: 'administradora', centro_id: 11, password_hash: 'x' },
    { id: 20, rol: 'admin_general', centro_id: null, password_hash: 'x' },
  ]) {
    const fx = accessFixture({ target })
    await assert.rejects(() => fx.service.resendAccess({ uid: 2 }, target.id), /No tienes permiso/)
    assert.deepEqual(fx.tokens, [])
    assert.deepEqual(fx.deliveries, [])
  }
})

test('la action pública fija cooldown sin alterar su respuesta uniforme', () => {
  const source = readFileSync(new URL('../app/actions/password.js', import.meta.url), 'utf8')
  assert.match(source, /cooldownMinutes:\s*15/)
  assert.match(source, /issued\.suppressed/)
  assert.match(source, /return \{ ok: true \}/)
})
```

Agregar `readFileSync` de `node:fs` al import de `test/usuarios-service.test.mjs` para este contrato fuente.

Definir el fake exacto en el mismo archivo:

```js
function accessFixture({
  target,
  delivery = { emailSent: true, link: 'https://app/set-password?token=t-1' },
  deliveryError = null,
}) {
  const tokens = []
  const deliveries = []
  const repo = {
    transaction: async (work) => work(repo),
    loadActor: async () => ({ id: 2, rol: 'coordinador', centros: [10, 12], password_hash: 'actor' }),
    lockUser: async (_q, id) => Number(id) === Number(target.id) ? target : null,
  }
  const accessTokens = {
    replace: async (_q, row) => { tokens.push(row); return { token: 't-1', user: target } },
  }
  const deliverAccess = async (row) => {
    deliveries.push(row)
    if (deliveryError) throw deliveryError
    return delivery
  }
  return { repo, tokens, deliveries, service: createUsuariosService({ repo, accessTokens, deliverAccess }) }
}
```

- [ ] **Step 2: Confirmar los fallos**

Run: `node --test test/usuarios-service.test.mjs`

Expected: FAIL porque `resendAccess()` no existe.

- [ ] **Step 3: Implementar `resendAccess()`**

Importar `accessPurpose` desde `lib/access-tokens.mjs`. Dentro de una transacción `Serializable`:

```js
const prepared = await repo.transaction(async (query) => {
  const actor = assertGestionUsuarios(await repo.loadActor(query, Number(session.uid), { lock: true }))
  const target = await repo.lockUser(query, parseId(usuarioId))
  if (!puedeGestionarUsuario(actor, target)) throw new Error(DENIED)
  const purpose = accessPurpose(target)
  const issued = await accessTokens.replace(query, { userId: target.id, purpose, hours: purpose === 'reset' ? 2 : 48 })
  return { purpose, token: issued.token, user: { id: target.id, nombre: target.nombre, email: target.email } }
})
const delivery = await deliverBestEffort(prepared)
if (prepared.purpose === 'reset') {
  return {
    ok: true,
    kind: 'reset',
    emailSent: Boolean(delivery.emailSent),
    ...(delivery.emailSent ? {} : { deliveryError: 'delivery_failed' }),
  }
}
return {
  ok: true,
  kind: 'invitation',
  emailSent: Boolean(delivery.emailSent),
  link: delivery.link || null,
  ...(delivery.emailSent ? {} : { deliveryError: 'delivery_failed' }),
}
```

`deliveryError` es un código cerrado del dominio; nunca reenviar `emailReason`, mensajes ni códigos del proveedor al navegador.

- [ ] **Step 4: Convertir `lib/invitations.js` en transporte**

Mantener `baseUrl()` y el HTML actual. Reemplazar `crearInvitacion()` por:

```js
export async function deliverAccess({ user, purpose, token }) {
  const link = `${await baseUrl()}/set-password?token=${token}`
  const result = await sendEmail({
    to: user.email,
    subject: purpose === 'reset' ? 'Restablece tu contraseña · ALOHA KPI' : 'Crea tu contraseña · ALOHA KPI',
    html: invitacionHtml({ nombre: user.nombre, link, tipo: purpose }),
  })
  return { link, emailSent: result.sent, emailReason: result.reason }
}
```

Este módulo no inserta ni invalida tokens.

- [ ] **Step 5: Adaptar reset público y contraseña**

En ambos archivos, crear el adaptador una sola vez:

```js
import { accessTokensRepository } from '../../lib/access-tokens-repository'
import { accessPurpose, createAccessTokenService } from '../../lib/access-tokens.mjs'
const accessTokens = createAccessTokenService({ repo: accessTokensRepository })
```

En `app/actions/password.js`, conservar `getTokenInfo()` como lectura y reemplazar los otros exports por:

```js
export async function requestPasswordReset(email) {
  const mail = String(email || '').trim().toLowerCase()
  if (!mail) return { ok: true }
  try {
    const prepared = await accessTokensRepository.transaction(async (query) => {
      const user = await accessTokensRepository.findUserByEmail(query, mail)
      if (!user) return null
      const purpose = accessPurpose(user)
      const hours = purpose === 'reset' ? 2 : 48
      const issued = await accessTokens.replace(query, {
        userId: user.id, purpose, hours, cooldownMinutes: 15,
      })
      if (issued.suppressed) return null
      return { user: issued.user, purpose, token: issued.token }
    })
    if (prepared) await deliverAccess(prepared)
  } catch (error) {
    const rawCode = String(error?.code || '')
    console.error('[password:request-reset]', {
      code: /^[A-Z0-9_]{1,40}$/.test(rawCode) ? rawCode : 'DELIVERY_FAILED',
    })
  }
  return { ok: true }
}

export async function setPassword(token, nueva) {
  if (!token) return { error: 'Enlace inválido.' }
  if (!nueva || String(nueva).length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  try {
    const passwordHash = await hashPassword(String(nueva))
    const user = await accessTokens.consume({ token, passwordHash })
    await createSession(user)
    return { ok: true, rol: user.rol, centro_id: user.centro_id, nombre: user.nombre, email: user.email }
  } catch (error) {
    const safe = ['Enlace inválido.', 'Este enlace ya fue usado.', 'Este enlace venció. Pide uno nuevo.']
    return { error: safe.includes(error?.message) ? error.message : 'No pudimos actualizar la contraseña.' }
  }
}
```

Consumir `findUserByEmail(query, email)` de `accessTokensRepository`, implementado en Task 2; devuelve únicamente `id,nombre,email,rol,centro_id,password_hash`.

En `app/actions/auth.js`, reemplazar `changePassword()` por:

```js
export async function changePassword(nueva) {
  const session = await requireSession()
  if (!nueva || String(nueva).length < 8) {
    return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  }
  const passwordHash = await hashPassword(String(nueva))
  await accessTokens.changePassword({ userId: Number(session.uid), passwordHash })
  return { ok: true }
}
```

El cooldown se decide bajo los mismos locks de usuario/tokens. Durante 15 minutos, una nueva solicitud pública para el mismo propósito no invalida el enlace vigente ni dispara otro correo; la respuesta externa sigue siendo `{ ok:true }` exista o no la cuenta. Las acciones autenticadas de gerencia/coordinación no pasan `cooldownMinutes` y conservan el reemplazo explícito solicitado por el operador.

Ninguna action ejecuta un `UPDATE usuarios` o `UPDATE password_tokens` directo; agregar esa prohibición a la prueba fuente de Task 6.

- [ ] **Step 6: Ejecutar pruebas focalizadas**

Run: `node --test test/usuarios-service.test.mjs test/access-tokens.test.mjs`

Expected: todas pasan.

- [ ] **Step 7: Ejecutar suite completa**

Run: `npm test`

Expected: toda la suite pasa; si una prueba fuente espera `crearInvitacion`, actualizarla al nuevo contrato sin debilitar la aserción.

- [ ] **Step 8: Commit**

```bash
git add lib/invitations.js lib/usuarios-service.mjs test/usuarios-service.test.mjs app/actions/password.js app/actions/auth.js test/access-tokens.test.mjs
git commit -m "fix(auth): no exponer restablecimientos de cuentas activas"
```

---

### Task 6: Server Actions, guarda de página y Sidebar autoritativo

**Files:**
- Modify: `app/actions/usuarios.js`
- Create: `app/actions/navigation.js`
- Create: `lib/usuarios-delivery.mjs`
- Modify: `app/dashboard/usuarios/page.js`
- Create: `app/dashboard/usuarios/UsuariosClient.js`
- Modify: `components/Sidebar.js`
- Modify: `test/roles-centro.test.mjs`
- Create: `test/usuarios-delivery.test.mjs`

**Interfaces:**
- Consumes: `createUsuariosService()` y `PageData` de Task 3.
- Produces: Server Actions públicas, `navigationContext` y el límite servidor/cliente que usará el plan responsive.

- [ ] **Step 1: Reemplazar la prueba fuente obsoleta con contratos RED**

En `test/roles-centro.test.mjs`, sustituir `gestionar usuarios y centros sigue siendo solo de gerencia` por:

```js
test('Gestión de usuarios usa actor fresco y servicio; centros sigue solo en gerencia', () => {
  const usuarios = fuente('../app/actions/usuarios.js')
  assert.match(usuarios, /requireSession\(\)/)
  assert.match(usuarios, /createUsuariosService/)
  assert.doesNotMatch(usuarios, /requireAdmin\(\)/)
  assert.doesNotMatch(usuarios, /SELECT\s|INSERT\s|UPDATE\s|DELETE\s/i)

  const page = fuente('../app/dashboard/usuarios/page.js')
  assert.doesNotMatch(page, /['"]use client['"]/)
  assert.match(page, /getUsuariosPageData/)
  assert.match(page, /UsuariosClient/)

  const sidebar = fuente('../components/Sidebar.js')
  assert.doesNotMatch(sidebar, /aloha_rol/)
  assert.doesNotMatch(sidebar, /localStorage\.getItem\(['"]aloha_rol/)
  assert.match(sidebar, /viewUsers/)
  assert.match(sidebar, /viewCenters/)

  const centros = fuente('../app/actions/centros.js')
  assert.match(centros.slice(centros.indexOf('export async function createCentro')).slice(0, 240), /requireAdmin\(\)/)
})
```

Crear `test/usuarios-delivery.test.mjs`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import { usuariosDeliveryForRuntime } from '../lib/usuarios-delivery.mjs'

test('sin modo E2E conserva el transporte real', () => {
  const live = async () => ({ emailSent: true })
  assert.equal(usuariosDeliveryForRuntime({ env: {}, live }), live)
})

test('stub falla cerrado fuera de desarrollo desechable', () => {
  const live = async () => ({ emailSent: true })
  for (const env of [
    { E2E_DELIVERY_MODE: 'stub', NODE_ENV: 'production', E2E_DATABASE_CONFIRM: 'disposable' },
    { E2E_DELIVERY_MODE: 'stub', NODE_ENV: 'development' },
    { E2E_DELIVERY_MODE: 'stub', NODE_ENV: 'test', E2E_DATABASE_CONFIRM: 'disposable' },
    { E2E_DELIVERY_MODE: 'stub', E2E_DATABASE_CONFIRM: 'disposable' },
  ]) {
    assert.throws(() => usuariosDeliveryForRuntime({ env, live }), /solo se permite/)
  }
})

test('stub desechable no llama correo real y solo devuelve enlace de invitación', async () => {
  let liveCalls = 0
  const deliver = usuariosDeliveryForRuntime({
    env: { E2E_DELIVERY_MODE: 'stub', NODE_ENV: 'development', E2E_DATABASE_CONFIRM: 'disposable' },
    live: async () => { liveCalls++; return {} },
  })
  const invite = await deliver({ purpose: 'invite', token: 'secreto' })
  const reset = await deliver({ purpose: 'reset', token: 'secreto' })
  assert.equal(invite.emailSent, true)
  assert.match(invite.link, /set-password/)
  assert.equal(Object.hasOwn(reset, 'link'), false)
  assert.equal(liveCalls, 0)
})
```

- [ ] **Step 2: Confirmar el fallo**

Run: `node --test test/roles-centro.test.mjs`

Expected: FAIL en actions, página y Sidebar aún antiguos.

- [ ] **Step 3: Crear transporte E2E fail-closed y adaptar `app/actions/usuarios.js`**

Crear `lib/usuarios-delivery.mjs`:

```js
export function usuariosDeliveryForRuntime({ env = process.env, live }) {
  if (env.E2E_DELIVERY_MODE !== 'stub') return live
  if (env.NODE_ENV !== 'development' || env.E2E_DATABASE_CONFIRM !== 'disposable') {
    throw new Error('E2E_DELIVERY_MODE=stub solo se permite en desarrollo con DB desechable.')
  }
  return async ({ purpose, token }) => ({
    emailSent: true,
    emailReason: 'e2e_stub',
    ...(purpose === 'invite'
      ? { link: `https://e2e.invalid/set-password?token=${token}` }
      : {}),
  })
}
```

Este helper no se activa por `NODE_ENV` solo: exige las dos banderas explícitas y falla cerrado si alguien intenta configurar el stub en un build/deployment productivo.

El archivo conserva solo exports `async` y delega:

```js
'use server'
import { requireSession } from '../../lib/auth'
import { usuariosRepository } from '../../lib/usuarios-repository'
import { accessTokensRepository } from '../../lib/access-tokens-repository'
import { createAccessTokenService } from '../../lib/access-tokens.mjs'
import { createUsuariosService } from '../../lib/usuarios-service.mjs'
import { deliverAccess } from '../../lib/invitations'
import { usuariosDeliveryForRuntime } from '../../lib/usuarios-delivery.mjs'

const service = createUsuariosService({
  repo: usuariosRepository,
  accessTokens: createAccessTokenService({ repo: accessTokensRepository }),
  deliverAccess: usuariosDeliveryForRuntime({ live: deliverAccess }),
})

async function sessionRef() {
  const session = await requireSession()
  return { uid: Number(session.uid) }
}

const SAFE_MESSAGES = new Set([
  'No autorizado.',
  'No tienes permiso para gestionar este usuario.',
  'Identificador inválido.',
  'Nombre es requerido.',
  'Escribe un correo válido.',
  'El correo ya está registrado.',
  'El correo ya está registrado en un usuario visible.',
  'Selecciona un rol permitido.',
  'Selecciona un centro permitido.',
  'No puedes eliminar esta cuenta.',
  'No puedes eliminar un Administrador General.',
  'No puedes eliminar tu propia cuenta.',
  'Usuario no encontrado.',
])

async function runAction(name, work) {
  try {
    return await work()
  } catch (error) {
    const rawCode = String(error?.code || '')
    console.error(`[usuarios:${name}]`, {
      name: error?.name || 'Error',
      code: /^[A-Z0-9_]{1,40}$/.test(rawCode) ? rawCode : 'UNEXPECTED',
    })
    return {
      error: SAFE_MESSAGES.has(error?.message)
        ? error.message
        : 'No pudimos completar la operación. Intenta de nuevo.',
    }
  }
}

export async function getUsuariosPageData() {
  return runAction('pageData', async () => service.pageData(await sessionRef()))
}
export async function createUsuario(input) {
  return runAction('create', async () => service.create(await sessionRef(), input))
}
export async function updateUsuario(id, input) {
  return runAction('update', async () => service.update(await sessionRef(), id, input))
}
export async function reenviarInvitacion(id) {
  return runAction('resendAccess', async () => service.resendAccess(await sessionRef(), id))
}
export async function deleteUsuario(id) {
  return runAction('delete', async () => service.delete(await sessionRef(), id))
}
```

El adaptador solo devuelve mensajes de la lista segura y registra nombre de operación y código PostgreSQL, nunca correo, token ni enlace.

- [ ] **Step 4: Crear contexto fresco de navegación**

Crear `app/actions/navigation.js` con `getNavigationContext()`:

```js
'use server'
import { sql } from '../../lib/db'
import { requireCurrentUser } from '../../lib/auth'
import { centrosDe, esGerencia, puedeGestionarUsuarios } from '../../lib/current-user.mjs'

export async function getNavigationContext() {
  const user = await requireCurrentUser()
  const scope = centrosDe(user)
  const centers = scope === null
    ? await sql`SELECT id,nombre FROM centros ORDER BY nombre`
    : scope.length === 0
      ? []
      : await sql`SELECT id,nombre FROM centros WHERE id=ANY(${scope}::int[]) ORDER BY nombre`
  return {
    actor: { id: user.id, role: user.rol },
    centers: centers.map(({ id, nombre }) => ({ id: Number(id), nombre })),
    capabilities: {
      viewUsers: puedeGestionarUsuarios(user),
      viewCenters: esGerencia(user.rol),
      viewAdminTraining: esGerencia(user.rol),
      viewMetas: esGerencia(user.rol),
    },
  }
}
```

Para `centrosDe(user) === []`, la rama devuelve `centers:[]` sin consulta global.

- [ ] **Step 5: Dividir página servidor/cliente**

`app/dashboard/usuarios/page.js` pasa a:

```js
import { redirect } from 'next/navigation'
import { getUsuariosPageData } from '../../actions/usuarios'
import UsuariosClient from './UsuariosClient'

export const dynamic = 'force-dynamic'

export default async function UsuariosPage() {
  const data = await getUsuariosPageData()
  if (!data || data.error) redirect('/perfil')
  return <UsuariosClient initialData={data} />
}
```

Mover el estado y handlers actuales a `UsuariosClient.js`. Cambiar nombres de campos al contrato `role`, `centerId`, `centerIds`, `centerNames`, `active`, `actions`. Después de una mutación exitosa: limpiar formulario/status/invitación según el resultado y llamar `router.refresh()`; la data recargada llega por props. Nunca llamar `listCentros()` desde este cliente.

La colección autoritativa se deriva siempre de props; no inicializarla con `useState(initialData.users)`, porque `router.refresh()` entregaría props nuevas pero conservaría la copia vieja. Implementar el filtro por centro así:

```js
const [centerFilter, setCenterFilter] = useState('all')
const visibleUsers = useMemo(() => {
  if (centerFilter === 'all') return initialData.users
  const selected = Number(centerFilter)
  return initialData.users.filter((user) => user.centerIds.includes(selected))
}, [initialData.users, centerFilter])
```

Si `initialData.centers.length > 1`, mostrar un `<select aria-label="Filtrar usuarios por centro">` con `Todos mis centros` y una opción por centro. Tabla/tarjetas iteran `visibleUsers`. Al editar, precargar `centros: user.centerIds`; así una cuenta coordinadora abierta por gerencia conserva todas sus relaciones N:N.

Usar una única llave de envío para impedir repeticiones y limpiar siempre al cerrar:

```js
const EMPTY_FORM = { nombre: '', email: '', rol: initialData.assignableRoles[0] || '', centro_id: initialData.centers[0]?.id || '', centros: [] }
const [pendingAction, setPendingAction] = useState(null)
const pendingRef = useRef(false)

async function submitOnce(key, work) {
  if (pendingRef.current) return
  pendingRef.current = true
  setPendingAction(key)
  setStatus('')
  try { return await work() } finally { pendingRef.current = false; setPendingAction(null) }
}

function resetEditor() {
  setEditing(null)
  setForm(EMPTY_FORM)
}

function closeForm() {
  resetEditor()
  setStatus('')
  setAccessResult(null)
}
```

Cada botón usa `disabled={Boolean(pendingAction)}` y muestra `Guardando…`/`Enviando…` según `pendingAction`. Cancelar usa `closeForm()`. Después de un éxito, usar `resetEditor()`, fijar después `status`/`accessResult` con el resultado confirmado y llamar `router.refresh()`; no llamar `closeForm()`, porque borraría la confirmación o el enlace. Agregar a `test/roles-centro.test.mjs` un contrato fuente que verifique que `EMPTY_FORM` contiene `centros: []`, que existe `resetEditor()` y que el camino de éxito conserva `setAccessResult(...)`; la prueba Playwright de Task 7 del plan responsive confirma además que el resultado queda visible tras cerrar el editor.

Cuando `kind === 'reset'`, renderizar solo confirmación de correo. El bloque con input/copiar enlace existe únicamente para `kind === 'invitation'`.

- [ ] **Step 6: Quitar autoridad del Sidebar**

`Sidebar` llama `getNavigationContext()` al montar, mantiene estado `loading/context` y construye Configuración así:

```js
const configItems = [
  ...(context?.capabilities.viewCenters ? [{ label: 'Gestión centros', icon: 'building', href: '/dashboard/centros' }] : []),
  ...(context?.capabilities.viewUsers ? [{ label: 'Usuarios', icon: 'users', href: '/dashboard/usuarios' }] : []),
]
```

Metas y Entrenamiento administrativo usan sus capacidades. El selector `Ir a centro` usa `context.centers`. El código no lee `aloha_rol`; conservar `localStorage` únicamente para tema si aplica en otro componente.

- [ ] **Step 7: Ejecutar pruebas y build**

Run: `node --test test/roles-centro.test.mjs test/current-user.test.mjs test/usuarios-service.test.mjs test/access-tokens.test.mjs test/usuarios-delivery.test.mjs`

Expected: todas pasan.

Run: `npm run build`

Expected: build exitoso y `/dashboard/usuarios` dinámica.

- [ ] **Step 8: Commit**

```bash
git add app/actions/usuarios.js app/actions/navigation.js lib/usuarios-delivery.mjs app/dashboard/usuarios/page.js app/dashboard/usuarios/UsuariosClient.js components/Sidebar.js test/roles-centro.test.mjs test/usuarios-delivery.test.mjs
git commit -m "feat(usuarios): habilitar gestión segura para coordinadores"
```

---

### Task 7: Filtros SQL, carreras PostgreSQL y gate del subsistema

**Files:**
- Create: `test/integration/usuarios-concurrency.integration.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: repositorios y servicios terminados.
- Produces: prueba destructiva aislada que demuestra filtro SQL, orden de locks, serialización, unicidad y consumo único en PostgreSQL real.

- [ ] **Step 1: Agregar script explícito para DB desechable**

Instalar el runner ESM compatible con los módulos `.js` de Next y registrar el script:

```bash
npm install --save-dev tsx
```

En `package.json`:

```json
"test:usuarios:db": "tsx --test --test-concurrency=1 test/integration/usuarios-concurrency.integration.mjs"
```

La prueba exige `USUARIOS_TEST_DATABASE_URL` y la confirmación literal `E2E_DATABASE_CONFIRM=disposable`; si falta cualquiera, falla antes de abrir una conexión con un mensaje que diga que la base será modificada. No usa `DATABASE_URL` de producción por defecto. `tsx` es deliberado: el paquete no declara `type:module`, soporta Node 20 y los módulos `.js` de Next usan ESM/imports internos sin extensión; no sustituirlo por `node --test` nativo.

- [ ] **Step 2: Crear fixture PostgreSQL con limpieza garantizada**

En `test/integration/usuarios-concurrency.integration.mjs`:

```js
import test, { before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'

neonConfig.webSocketConstructor = ws
const url = process.env.USUARIOS_TEST_DATABASE_URL
if (!url || process.env.E2E_DATABASE_CONFIRM !== 'disposable') {
  throw new Error('USUARIOS_TEST_DATABASE_URL y E2E_DATABASE_CONFIRM=disposable son obligatorias; esta prueba modifica una DB desechable.')
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
      `INSERT INTO centros (nombre, region, pais) VALUES ($1,'TEST','PA'),($2,'TEST','PA') RETURNING id`,
      [`${marker}-A`, `${marker}-B`]
    )
    const [centerA, centerB] = centers.rows.map((row) => Number(row.id))
    const users = await client.query(
      `INSERT INTO usuarios (nombre,email,password_hash,rol,centro_id)
       VALUES ($1,$2,'hash','admin_general',NULL),
              ($3,$4,'hash','coordinador',NULL),
              ($5,$6,'hash','administradora',$11),
              ($7,$8,'hash','asistente',$12),
              ($9,$10,'hash','supervisor',$11)
       RETURNING id`,
      [
        `${marker}-admin`, `${marker}-admin@test.invalid`,
        `${marker}-coord`, `${marker}-coord@test.invalid`,
        `${marker}-target`, `${marker}-target@test.invalid`,
        `${marker}-outsider`, `${marker}-outsider@test.invalid`,
        `${marker}-privileged`, `${marker}-privileged@test.invalid`,
        centerA, centerB,
      ]
    )
    ids = {
      centerA, centerB,
      admin: Number(users.rows[0].id), coord: Number(users.rows[1].id),
      target: Number(users.rows[2].id), outsider: Number(users.rows[3].id),
      privileged: Number(users.rows[4].id),
    }
    await client.query('INSERT INTO usuario_centros (usuario_id,centro_id) VALUES ($1,$2)', [ids.coord, ids.centerA])
    await client.query('COMMIT')
  } catch (error) { await client.query('ROLLBACK'); throw error } finally { client.release() }
})

beforeEach(async () => {
  const fixtureUsers = [ids.admin, ids.coord, ids.target, ids.outsider, ids.privileged]
  await pool.query('DELETE FROM password_tokens WHERE user_id = ANY($1::int[])', [fixtureUsers])
  await pool.query('DELETE FROM usuarios WHERE email LIKE $1 AND NOT (id = ANY($2::int[]))', [`${marker}%`, fixtureUsers])
  await pool.query("UPDATE usuarios SET rol='coordinador', centro_id=NULL, password_hash='hash' WHERE id=$1", [ids.coord])
  await pool.query("UPDATE usuarios SET rol='administradora', centro_id=$2, password_hash='hash' WHERE id=$1", [ids.target, ids.centerA])
  await pool.query("UPDATE usuarios SET rol='asistente', centro_id=$2, password_hash='hash' WHERE id=$1", [ids.outsider, ids.centerB])
  await pool.query("UPDATE usuarios SET rol='supervisor', centro_id=$2, password_hash='hash' WHERE id=$1", [ids.privileged, ids.centerA])
  await pool.query('DELETE FROM usuario_centros WHERE usuario_id=$1', [ids.coord])
  await pool.query('INSERT INTO usuario_centros (usuario_id,centro_id) VALUES ($1,$2)', [ids.coord, ids.centerA])
})

after(async () => {
  try {
    await pool.query('DELETE FROM password_tokens WHERE user_id IN (SELECT id FROM usuarios WHERE email LIKE $1)', [`${marker}%`])
    await pool.query('DELETE FROM usuarios WHERE email LIKE $1', [`${marker}%`])
    await pool.query('DELETE FROM centros WHERE nombre LIKE $1', [`${marker}%`])
  } finally {
    await pool.end()
  }
})
```

- [ ] **Step 3: Montar servicios y sincronización observable**

Después de crear el fixture, importar repositorios/servicios y evitar correo real:

```js
const [{ usuariosRepository }, { accessTokensRepository }, { createUsuariosService }, { createAccessTokenService }] = await Promise.all([
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
      ...(purpose === 'invite' ? { link: `https://test.invalid/set-password?token=${token}` } : {}),
    }),
  })
}
const service = serviceFor()

function deferred() {
  let resolve
  let reject
  const promise = new Promise((res, rej) => { resolve = res; reject = rej })
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
  const runs = works.map((work) => settle(async () => { await gate.promise; return work() }))
  gate.resolve()
  return Promise.all(runs)
}

function namedTransactions(base, applicationName) {
  return {
    ...base,
    transaction: (work) => base.transaction(async (query) => {
      await query("SELECT set_config('application_name',$1,true)", [applicationName])
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
       WHERE application_name=$1 AND wait_event_type='Lock' AND state='active'`,
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
```

Agregar primero el filtro real y la carrera crítica con una barrera posterior al lock del actor:

```js
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
    nombre: `${marker}-updated`, rol: 'administradora', centro_id: ids.centerA, centros: [],
  }).then((value) => { events.push('edit-confirmed'); return value })

  await barrier.locked.promise
  const revokeInput = {
    nombre: `${marker}-coord`, rol: 'coordinador', centro_id: null, centros: [ids.centerB],
  }
  const revoke = settle(() => serviceFor(revokeRepo).update({ uid: ids.admin }, ids.coord, revokeInput))
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
      nombre: `${marker}-forbidden`, rol: 'administradora', centro_id: ids.centerA, centros: [],
    }),
    /No tienes permiso/,
  )
  const memberships = await pool.query('SELECT centro_id FROM usuario_centros WHERE usuario_id=$1 ORDER BY centro_id', [ids.coord])
  assert.deepEqual(memberships.rows.map((row) => Number(row.centro_id)), [ids.centerB])
})
```

La barrera se activa solo después de que la edición bloqueó actor y asignaciones reales. La prueba observa a PostgreSQL esperando el lock, libera la edición, confirma la revocación y exige que la siguiente edición ya sea denegada; no acepta una coincidencia temporal como evidencia.

- [ ] **Step 4: Probar promoción, unicidad, reemplazo y consumo concurrente**

```js

test('promover el objetivo y resetearlo nunca deja un token activo privilegiado', async () => {
  const results = await race(
    () => service.resendAccess({ uid: ids.coord }, ids.target),
    () => service.update({ uid: ids.admin }, ids.target, {
      nombre: `${marker}-target`, rol: 'admin_general', centro_id: null, centros: [],
    }),
  )
  results.forEach(assertExpectedRaceError)
  const state = await pool.query(
    `SELECT u.rol, count(t.token) FILTER (WHERE t.used_at IS NULL) AS activos
     FROM usuarios u LEFT JOIN password_tokens t ON t.user_id=u.id
     WHERE u.id=$1 GROUP BY u.id`,
    [ids.target],
  )
  if (state.rows[0].rol === 'admin_general') assert.equal(Number(state.rows[0].activos), 0)
})

test('dos altas con el mismo correo dejan una fila y no filtran 23505', async () => {
  const email = `${marker}-duplicate@test.invalid`
  const input = { nombre: `${marker}-duplicate`, email, rol: 'asistente', centro_id: ids.centerA }
  const results = await race(
    () => service.create({ uid: ids.coord }, input),
    () => service.create({ uid: ids.coord }, input),
  )
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  const rejected = results.find((result) => result.status === 'rejected')
  assert.ok(rejected)
  assert.notEqual(rejected?.reason?.code, '23505')
  assert.notEqual(rejected?.reason?.code, '40001')
  assert.ok([
    'No tienes permiso para gestionar este usuario.',
    'El correo ya está registrado en un usuario visible.',
  ].includes(rejected.reason?.message))
  const count = await pool.query('SELECT count(*)::int AS n FROM usuarios WHERE email=$1', [email])
  assert.equal(count.rows[0].n, 1)
})

test('dos reemplazos simultáneos dejan un solo token activo', async () => {
  const results = await race(
    () => accessTokensRepository.transaction((query) => accessTokens.replace(query, { userId: ids.target, purpose: 'reset', hours: 2 })),
    () => accessTokensRepository.transaction((query) => accessTokens.replace(query, { userId: ids.target, purpose: 'reset', hours: 2 })),
  )
  results.forEach(assertExpectedRaceError)
  assert.ok(results.some((result) => result.status === 'fulfilled'))
  const active = await pool.query('SELECT count(*)::int AS n FROM password_tokens WHERE user_id=$1 AND used_at IS NULL', [ids.target])
  assert.equal(active.rows[0].n, 1)
})

test('dos tokens consumidos a la vez permiten una sola contraseña y revocan ambos', async () => {
  const expires = new Date(Date.now() + 3_600_000)
  const tokenA = `${marker}-consume-a`
  const tokenB = `${marker}-consume-b`
  await pool.query(
    `INSERT INTO password_tokens (token,user_id,purpose,expires_at)
     VALUES ($1,$3,'reset',$4),($2,$3,'reset',$4)`,
    [tokenA, tokenB, ids.target, expires],
  )
  const results = await race(
    () => accessTokens.consume({ token: tokenA, passwordHash: 'hash-a' }),
    () => accessTokens.consume({ token: tokenB, passwordHash: 'hash-b' }),
  )
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1)
  results.forEach(assertExpectedRaceError)
  const state = await pool.query(
    `SELECT u.password_hash,count(t.token) FILTER (WHERE t.used_at IS NULL) AS activos
     FROM usuarios u JOIN password_tokens t ON t.user_id=u.id
     WHERE u.id=$1 GROUP BY u.id`,
    [ids.target],
  )
  assert.ok(['hash-a', 'hash-b'].includes(state.rows[0].password_hash))
  assert.equal(Number(state.rows[0].activos), 0)
})
```

Las consultas finales usan `pool`, una tercera conexión lógica fuera de ambas transacciones. Las pruebas generales de carreras pueden aceptar `40001` donde el contrato solo exige serialización segura; la carrera específica de alta duplicada no lo acepta y exige el mensaje uniforme tras la relectura fresca.

- [ ] **Step 5: Ejecutar integración**

Precondición: `USUARIOS_TEST_DATABASE_URL` ya apunta a la base desechable y `E2E_DATABASE_CONFIRM=disposable` está presente.

Run: `npm run test:usuarios:db`

Expected: 6 pruebas pasan y el hook `after` no deja filas con el marcador.

- [ ] **Step 6: Ejecutar gate completo del subsistema**

Run: `npm test`

Expected: toda la suite pasa.

Run: `npm run build`

Expected: build exitoso.

Run: `git diff --check`

Expected: sin salida.

- [ ] **Step 7: Commit**

```bash
git add test/integration/usuarios-concurrency.integration.mjs package.json package-lock.json
git commit -m "test(usuarios): cubrir filtros y carreras reales"
```

---

## Criterio de salida de este plan

- Las 23 pruebas de autorización de la spec tienen caso unitario o de integración identificable.
- `getUsuariosPageData()` nunca usa rol ni centros del JWT como autoridad.
- Un coordinador con `centros:[]` recibe cero usuarios y cero centros.
- El SQL restringido filtra roles y centros antes de devolver filas.
- Crear, editar, mover, resetear y eliminar autorizan dentro de la misma transacción que escribe.
- Un reset activo no contiene `link`, `token` ni `/set-password` al serializar la respuesta.
- El reset público suprime reemisiones durante 15 minutos bajo lock sin revelar si la cuenta existe.
- Fijar o cambiar contraseña invalida todo token restante.
- Gerencia conserva alcance global, no se borra a sí misma y no elimina `admin_general`.
- `npm test`, la integración protegida por `E2E_DATABASE_CONFIRM=disposable`, `npm run build` y `git diff --check` pasan.
- El cliente de usuarios expone el contrato estable que consumirá el plan responsive.
