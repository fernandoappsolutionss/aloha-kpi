import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash, generateKeyPairSync } from 'node:crypto'
import { jwtVerify, decodeJwt } from 'jose'
import { appleConfig, authValida, crearPase, serialDe } from '../lib/referidos/wallet-apple.mjs'
import { cuerpoObjeto, enlaceGuardar, googleConfig, objetoGoogleDe, publicarObjeto } from '../lib/referidos/wallet-google.mjs'

const miembro = { id: 7, emision: 2, nombre: 'Familia Pérez', codigo: 'abc234', apple_auth: 'x'.repeat(32), saldo_cent: 1250 }
const base = 'https://kpi.example.com'

test('Apple: el pase trae pass.json correcto, manifest con hashes reales y firma', () => {
  const dir = mkdtempSync(join(tmpdir(), 'pase-'))
  try {
    // Certificado de prueba autofirmado (hace de WWDR y de firmante). No prueba
    // la instalación en un iPhone: eso exige el certificado real de Apple.
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '2', '-subj', '/CN=Prueba',
      '-keyout', join(dir, 'k.pem'), '-out', join(dir, 'c.pem')], { stdio: 'ignore' })
    const b64 = (f) => readFileSync(join(dir, f)).toString('base64')
    const config = appleConfig({ APPLE_PASS_TYPE_ID: 'pass.com.aloha.referidos', APPLE_TEAM_ID: 'ABCDE12345',
      APPLE_PASS_CERT_PEM: b64('c.pem'), APPLE_PASS_KEY_PEM: b64('k.pem'), APPLE_WWDR_PEM: b64('c.pem') })
    assert.ok(config)
    writeFileSync(join(dir, 'p.pkpass'), crearPase(miembro, { config, base }))
    const leer = (nombre) => execFileSync('unzip', ['-p', join(dir, 'p.pkpass'), nombre])
    const pass = JSON.parse(leer('pass.json'))
    assert.equal(pass.serialNumber, '7-2')
    assert.equal(pass.passTypeIdentifier, 'pass.com.aloha.referidos')
    assert.equal(pass.webServiceURL, `${base}/api/wallet/apple`)
    assert.equal(pass.authenticationToken, miembro.apple_auth)
    assert.equal(pass.storeCard.primaryFields[0].value, '$12.50')
    assert.equal(pass.barcodes[0].message, `${base}/r/abc234`)
    const manifest = JSON.parse(leer('manifest.json'))
    for (const nombre of ['pass.json', 'icon.png', 'logo.png']) {
      assert.equal(manifest[nombre], createHash('sha1').update(leer(nombre)).digest('hex'), nombre)
    }
    assert.ok(leer('signature').length > 500)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('Apple: sin variables queda apagado; el token se compara completo', () => {
  assert.equal(appleConfig({}), null)
  assert.equal(serialDe({ id: 3, emision: 1 }), '3-1')
  assert.equal(authValida(`ApplePass ${miembro.apple_auth}`, miembro.apple_auth), true)
  assert.equal(authValida(`ApplePass ${'y'.repeat(32)}`, miembro.apple_auth), false)
  assert.equal(authValida('ApplePass corto', 'corto'), false)
  assert.equal(authValida(null, miembro.apple_auth), false)
})

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const google = googleConfig({ GOOGLE_WALLET_ISSUER_ID: '3388000000012345678', GOOGLE_WALLET_SA_EMAIL: 'sa@proyecto.iam.gserviceaccount.com',
  GOOGLE_WALLET_SA_KEY: Buffer.from(privateKey.export({ type: 'pkcs8', format: 'pem' })).toString('base64') })

test('Google: el enlace de guardado lleva el JWT con todos los campos del contrato', async () => {
  const enlace = await enlaceGuardar(miembro, { config: google, base })
  assert.ok(enlace.startsWith('https://pay.google.com/gp/v/save/'))
  const jwt = enlace.split('/save/')[1]
  await jwtVerify(jwt, publicKey, { audience: 'google', issuer: google.email })
  const claims = decodeJwt(jwt)
  assert.equal(claims.typ, 'savetowallet')
  assert.ok(claims.iat)
  assert.deepEqual(claims.origins, [base])
  assert.deepEqual(claims.payload, { loyaltyObjects: [{ id: '3388000000012345678.m7_2' }] })
})

test('Google: el objeto lleva el saldo en micros y el id cambia con la emisión', () => {
  const cuerpo = cuerpoObjeto(miembro, { config: google, base })
  assert.equal(cuerpo.loyaltyPoints.balance.money.micros, '12500000')
  assert.equal(cuerpo.classId, '3388000000012345678.aloha_referidos')
  assert.notEqual(objetoGoogleDe({ ...miembro, emision: 3 }, google.issuer), cuerpo.id)
  assert.equal(googleConfig({}), null)
})

test('Google: asegura la clase antes del objeto y crea el objeto si no existe', async () => {
  const llamadas = []
  const fetchFn = async (url, opciones = {}) => {
    const metodo = opciones.method || 'GET'
    llamadas.push(`${metodo} ${url.replace('https://walletobjects.googleapis.com/walletobjects/v1', '')}`)
    if (url.includes('oauth2')) return { ok: true, status: 200, json: async () => ({ access_token: 't' }) }
    if (metodo === 'GET' || metodo === 'PATCH') return { ok: false, status: 404 }
    return { ok: true, status: 200 }
  }
  await publicarObjeto(miembro, { config: google, base, fetchFn })
  assert.deepEqual(llamadas.slice(1), [
    'GET /loyaltyClass/3388000000012345678.aloha_referidos', 'POST /loyaltyClass',
    'PATCH /loyaltyObject/3388000000012345678.m7_2', 'POST /loyaltyObject',
  ])
})
