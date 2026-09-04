import { test, expect } from '@playwright/test'
import { Pool, neonConfig } from '@neondatabase/serverless'
import ws from 'ws'
import { resolveNeonE2EConfig } from '../../lib/neon-e2e-config.mjs'
import { auditPage } from './helpers/audit-page.js'

test.use({ trace: 'off', screenshot: 'off', video: 'off' })

test('crear, revocar, mover, reenviar, resetear y eliminar atraviesa UI Action y DB', async ({ browser }, info) => {
  test.skip(Boolean(process.env.RESPONSIVE_BASE_URL), 'mutaciones solo locales')
  test.skip(process.env.E2E_RUN_MUTATIONS !== '1', 'requiere consentimiento explícito de mutaciones')
  test.setTimeout(180_000)
  for (const name of ['USUARIOS_TEST_DATABASE_URL', 'E2E_COORDINATOR_SECOND_CENTER_ID', 'E2E_CENTRO_ID', 'E2E_COORDINATOR_EMAIL']) expect(Boolean(process.env[name]), `${name} obligatorio`).toBe(true)
  expect(process.env.E2E_DATABASE_CONFIRM).toBe('disposable')
  expect(process.env.E2E_DELIVERY_MODE).toBe('stub')
  const transport = resolveNeonE2EConfig(process.env)
  expect(Boolean(transport)).toBe(true)
  Object.assign(neonConfig, transport, { webSocketConstructor: ws })
  const pool = new Pool({ connectionString: process.env.USUARIOS_TEST_DATABASE_URL, connectionTimeoutMillis: 10_000, query_timeout: 10_000 })
  const email = `codex-ui-${Date.now()}-${Math.random().toString(16).slice(2)}@test.invalid`
  const centerA = Number(process.env.E2E_CENTRO_ID)
  const centerB = Number(process.env.E2E_COORDINATOR_SECOND_CENTER_ID)
  expect(Number.isInteger(centerA) && centerA > 0).toBe(true)
  expect(Number.isInteger(centerB) && centerB > 0).toBe(true)
  expect(centerA).not.toBe(centerB)
  let createdUserId = null
  let actorId = null
  let snapshot = null
  const contexts = []
  const relationIds = async () => (await pool.query('SELECT centro_id FROM usuario_centros WHERE usuario_id=$1 ORDER BY centro_id', [actorId])).rows.map(row => row.centro_id)
  const contextFor = async actor => {
    const context = await browser.newContext({ baseURL: info.project.use.baseURL, storageState: `tests/e2e/.auth/${actor}.json`, viewport: { width: 390, height: 844 } })
    contexts.push(context)
    return context
  }
  const inviteState = async () => (await pool.query("SELECT count(*)::int AS total, count(*) FILTER (WHERE used_at IS NULL)::int AS active, count(*) FILTER (WHERE used_at IS NOT NULL)::int AS used FROM password_tokens WHERE user_id=$1 AND purpose='invite'", [createdUserId])).rows[0]
  try {
    const actor = await test.step('resolver actor disposable por email exacto', async () => (await pool.query('SELECT id,rol FROM usuarios WHERE email=$1', [process.env.E2E_COORDINATOR_EMAIL])).rows[0])
    expect(actor?.rol).toBe('coordinador')
    actorId = actor.id
    snapshot = await relationIds()
    expect(snapshot).toEqual(expect.arrayContaining([centerA, centerB]))
    const page = await (await contextFor('coordinator')).newPage()
    await page.goto('/dashboard/usuarios')
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click({ timeout: 10_000 })
    let editor = page.getByRole('form', { name: 'Editor de usuario' })
    await editor.getByLabel('Nombre', { exact: true }).fill('Cuenta E2E')
    await editor.getByLabel('Correo', { exact: true }).fill(email)
    await editor.getByLabel('Rol', { exact: true }).selectOption('asistente')
    await editor.getByLabel('Centro', { exact: true }).selectOption(String(centerA))
    await editor.getByRole('button', { name: 'Crear cuenta', exact: true }).click()
    await expect(editor).toHaveCount(0)
    await expect(page.getByRole('status').filter({ hasText: /Usuario creado/ })).toBeVisible()
    // Assert boolean, never the value: a failure must not print a bearer token.
    const hasInvite = () => page.evaluate(() => Boolean(document.querySelector('input[readonly][value*="/set-password?token="]')))
    await expect.poll(hasInvite).toBe(true)
    let dbUser = (await pool.query('SELECT id,nombre,rol,centro_id FROM usuarios WHERE email=$1', [email])).rows[0]
    createdUserId = dbUser.id
    expect(dbUser).toMatchObject({ nombre: 'Cuenta E2E', rol: 'asistente', centro_id: centerA })
    expect(await inviteState()).toEqual({ total: 1, active: 1, used: 0 })
    await auditPage(page, { mobile: true })
    await page.getByRole('button', { name: 'Cerrar resultado', exact: true }).click()
    await expect.poll(hasInvite).toBe(false)
    let row = page.locator(`[data-user-email="${email}"]:visible`)
    await expect(row.getByRole('button', { name: 'Eliminar', exact: true })).toHaveCount(0)
    await row.getByRole('button', { name: 'Editar', exact: true }).click()
    editor = page.getByRole('form', { name: 'Editor de usuario' })
    await expect(editor.getByLabel('Centro', { exact: true }).locator(`option[value="${centerB}"]`)).toHaveCount(1)
    await editor.getByLabel('Nombre', { exact: true }).fill('Cuenta E2E movida')
    await editor.getByLabel('Centro', { exact: true }).selectOption(String(centerB))
    await pool.query('DELETE FROM usuario_centros WHERE usuario_id=$1 AND centro_id=$2', [actorId, centerB])
    await editor.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(page.locator('main').getByRole('alert')).toHaveText('No tienes permiso para gestionar este usuario.')
    expect((await pool.query('SELECT centro_id FROM usuarios WHERE id=$1', [createdUserId])).rows[0].centro_id).toBe(centerA)
    const centerAName = (await pool.query('SELECT nombre FROM centros WHERE id=$1', [centerA])).rows[0].nombre
    await expect(row).toContainText(centerAName)
    await pool.query('INSERT INTO usuario_centros(usuario_id,centro_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [actorId, centerB])
    expect(await relationIds()).toEqual(snapshot)
    await editor.getByRole('button', { name: 'Guardar cambios', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Usuario actualizado.' })).toBeVisible()
    expect((await pool.query('SELECT nombre,centro_id FROM usuarios WHERE id=$1', [createdUserId])).rows[0]).toEqual({ nombre: 'Cuenta E2E movida', centro_id: centerB })
    row = page.locator(`[data-user-email="${email}"]:visible`)
    await row.getByRole('button', { name: 'Reenviar invitación', exact: true }).click()
    await expect.poll(hasInvite).toBe(true)
    expect(await inviteState()).toEqual({ total: 2, active: 1, used: 1 })
    // La siguiente petición falla por revocación real; el resultado viejo debe desaparecer.
    await pool.query('DELETE FROM usuario_centros WHERE usuario_id=$1 AND centro_id=$2', [actorId, centerB])
    await row.getByRole('button', { name: 'Reenviar invitación', exact: true }).click()
    await expect(page.locator('main').getByRole('alert')).toHaveText('No tienes permiso para gestionar este usuario.')
    await expect.poll(hasInvite).toBe(false)
    expect(await inviteState()).toEqual({ total: 2, active: 1, used: 1 })
    await pool.query('INSERT INTO usuario_centros(usuario_id,centro_id) VALUES($1,$2) ON CONFLICT DO NOTHING', [actorId, centerB])
    await pool.query("UPDATE usuarios SET password_hash='e2e-active-not-a-login-hash' WHERE id=$1", [createdUserId])
    await page.reload()
    await page.locator(`[data-user-email="${email}"]:visible`).getByRole('button', { name: 'Enviar restablecimiento', exact: true }).click()
    await expect(page.getByRole('status').filter({ hasText: 'Enviamos el restablecimiento al correo registrado.' })).toBeVisible()
    await expect.poll(hasInvite).toBe(false)
    expect(await page.evaluate(() => document.documentElement.outerHTML.includes('/set-password?token='))).toBe(false)
    await expect(page.getByRole('button', { name: /Copiar/ })).toHaveCount(0)
    const reset = (await pool.query("SELECT count(*) FILTER (WHERE purpose='reset' AND used_at IS NULL)::int AS active_resets, count(*) FILTER (WHERE purpose='invite' AND used_at IS NULL)::int AS active_invites FROM password_tokens WHERE user_id=$1", [createdUserId])).rows[0]
    expect(reset).toEqual({ active_resets: 1, active_invites: 0 })
    for (const id of snapshot.filter(id => id !== centerA)) await pool.query('DELETE FROM usuario_centros WHERE usuario_id=$1 AND centro_id=$2', [actorId, id])
    await page.reload()
    await expect(page.getByLabel('Filtrar usuarios por centro')).toHaveCount(0)
    await page.getByRole('button', { name: 'Crear usuario', exact: true }).click()
    editor = page.getByRole('form', { name: 'Editor de usuario' })
    for (const role of ['administradora', 'asistente', 'administradora']) {
      await editor.getByLabel('Rol', { exact: true }).selectOption(role)
      await expect(editor.getByLabel('Centro', { exact: true })).toHaveValue(String(centerA))
    }
    await pool.query('DELETE FROM usuario_centros WHERE usuario_id=$1 AND centro_id=$2', [actorId, centerA])
    await page.reload()
    await expect(page.locator('main').getByRole('alert')).toContainText('No tienes centros asignados')
    await expect(page.getByRole('button', { name: 'Crear usuario', exact: true })).toBeDisabled()
    await expect(page.getByRole('form', { name: 'Editor de usuario' })).toHaveCount(0)
    const adminPage = await (await contextFor('admin')).newPage()
    await adminPage.goto('/dashboard/usuarios')
    await adminPage.locator(`[data-user-email="${email}"]:visible`).getByRole('button', { name: 'Eliminar', exact: true }).click()
    const dialog = adminPage.getByRole('dialog', { name: 'Eliminar usuario', exact: true })
    await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeFocused()
    await dialog.getByRole('button', { name: 'Confirmar eliminación', exact: true }).click()
    await expect(dialog).toHaveCount(0)
    await expect(adminPage.locator(`[data-user-email="${email}"]`)).toHaveCount(0)
    expect((await pool.query('SELECT count(*)::int AS n FROM usuarios WHERE id=$1', [createdUserId])).rows[0].n).toBe(0)
  } finally {
    try {
      if (snapshot !== null) {
        const db = await pool.connect()
        try {
          await db.query('BEGIN')
          await db.query('DELETE FROM usuario_centros WHERE usuario_id=$1', [actorId])
          for (const id of snapshot) await db.query('INSERT INTO usuario_centros(usuario_id,centro_id) VALUES($1,$2)', [actorId, id])
          await db.query('COMMIT')
        } catch (error) {
          await db.query('ROLLBACK')
          throw error
        } finally { db.release() }
        expect(await relationIds()).toEqual(snapshot)
      }
    } finally {
      try {
        if (!createdUserId) createdUserId = (await pool.query('SELECT id FROM usuarios WHERE email=$1', [email])).rows[0]?.id
        if (createdUserId) {
          await pool.query('DELETE FROM password_tokens WHERE user_id=$1', [createdUserId])
          await pool.query('DELETE FROM usuarios WHERE id=$1', [createdUserId])
        }
      } finally {
        try { await Promise.all(contexts.map(context => context.close())) }
        finally { await pool.end() }
      }
    }
  }
})
