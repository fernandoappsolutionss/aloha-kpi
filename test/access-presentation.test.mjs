import test from 'node:test'
import assert from 'node:assert/strict'
import { presentAccessNotice } from '../lib/access-presentation.mjs'

const user = { nombre: 'Ana', email: 'ana@aloha.invalid' }

test('reset confirma el correo sin convertir un link recibido en copiable', () => {
  assert.deepEqual(presentAccessNotice({
    result: {
      ok: true,
      kind: 'reset',
      emailSent: true,
      link: 'https://evil.example/set-password?token=secreto',
    },
    user,
  }), {
    kind: 'reset',
    nombre: 'Ana',
    email: 'ana@aloha.invalid',
    emailSent: true,
    link: null,
    canCopy: false,
  })
})

test('invitación conserva el enlace copiable emitido por el servicio', () => {
  assert.deepEqual(presentAccessNotice({
    result: {
      ok: true,
      kind: 'invitation',
      emailSent: true,
      link: 'https://kpi.aloha.test/set-password?token=invite-1',
    },
    user,
  }), {
    kind: 'invitation',
    nombre: 'Ana',
    email: 'ana@aloha.invalid',
    emailSent: true,
    link: 'https://kpi.aloha.test/set-password?token=invite-1',
    canCopy: true,
  })
})

test('resultado fallido o desconocido no inventa un enlace', () => {
  for (const result of [
    { ok: true, kind: 'invitation', emailSent: false, deliveryError: 'delivery_failed', link: null },
    { ok: true, emailSent: false, link: 'https://evil.example/token' },
  ]) {
    const notice = presentAccessNotice({ result, user })
    assert.equal(notice.link, null)
    assert.equal(notice.canCopy, false)
  }
})
