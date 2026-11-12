// Apple Wallet: pase storeCard firmado con el certificado de Pass Type ID.
// Sin las variables de entorno, Wallet de Apple queda apagado y la tarjeta web
// funciona igual.
import http2 from 'node:http2'
import { timingSafeEqual } from 'node:crypto'
import { PKPass } from 'passkit-generator'
import { IMAGENES_PASE } from './pase-imagenes.mjs'
import { centavos } from './reglas.mjs'

const pem = (v) => (v ? Buffer.from(v, 'base64').toString('utf8') : '')

export function appleConfig(env = process.env) {
  const c = {
    passTypeId: env.APPLE_PASS_TYPE_ID, teamId: env.APPLE_TEAM_ID,
    cert: pem(env.APPLE_PASS_CERT_PEM), key: pem(env.APPLE_PASS_KEY_PEM), wwdr: pem(env.APPLE_WWDR_PEM),
  }
  return c.passTypeId && c.teamId && c.cert && c.key && c.wwdr ? c : null
}

// El serial lleva la emisión: al reemitir, el pase anterior queda huérfano.
export const serialDe = (m) => `${m.id}-${m.emision}`

export function crearPase(m, { config, base }) {
  const pass = new PKPass(
    Object.fromEntries(Object.entries(IMAGENES_PASE).map(([nombre, b64]) => [nombre, Buffer.from(b64, 'base64')])),
    { wwdr: config.wwdr, signerCert: config.cert, signerKey: config.key },
    {
      formatVersion: 1,
      passTypeIdentifier: config.passTypeId,
      teamIdentifier: config.teamId,
      serialNumber: serialDe(m),
      organizationName: 'ALOHA Mental Arithmetic',
      description: 'Tarjeta ALOHA de referidos',
      logoText: 'ALOHA',
      foregroundColor: 'rgb(0, 85, 109)',
      backgroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(73, 180, 57)',
      webServiceURL: `${base}/api/wallet/apple`,
      authenticationToken: m.apple_auth,
    },
  )
  pass.type = 'storeCard'
  pass.primaryFields.push({ key: 'saldo', label: 'SALDO', value: centavos(m.saldo_cent), changeMessage: 'Tu saldo ALOHA ahora es %@' })
  pass.secondaryFields.push({ key: 'nombre', label: 'TITULAR', value: m.nombre || 'Familia ALOHA' })
  pass.auxiliaryFields.push({ key: 'codigo', label: 'CÓDIGO', value: m.codigo.toUpperCase() })
  pass.backFields.push({ key: 'reglas', label: 'Cómo funciona', value: 'Comparte tu código QR. Cuando la familia que invitaste se inscribe, ganas saldo. Canjéalo en tu mensualidad, en tu centro ALOHA.' })
  pass.setBarcodes({ format: 'PKBarcodeFormatQR', message: `${base}/r/${m.codigo}`, messageEncoding: 'iso-8859-1' })
  return pass.getAsBuffer()
}

// Authorization: ApplePass <token>, comparado en tiempo constante.
export function authValida(header, esperado) {
  const recibido = String(header || '').replace(/^ApplePass\s+/i, '')
  const a = Buffer.from(recibido), b = Buffer.from(String(esperado || ''))
  return a.length === b.length && a.length >= 16 && timingSafeEqual(a, b)
}

// Push vacío: le dice al teléfono que pida el pase nuevo. Devuelve los tokens
// que APNs dio por muertos (410) para borrarlos.
export async function avisarDispositivos(pushTokens, config) {
  if (!pushTokens.length) return { muertos: [], ok: true }
  const cliente = http2.connect('https://api.push.apple.com', { cert: config.cert, key: config.key })
  const muertos = []
  let ok = true
  try {
    await Promise.all(pushTokens.map((token) => new Promise((resolve) => {
      const req = cliente.request({ ':method': 'POST', ':path': `/3/device/${token}`, 'apns-topic': config.passTypeId, 'apns-push-type': 'background', 'apns-priority': '5' })
      req.setTimeout(10000, () => { ok = false; req.close(); resolve() })
      req.on('response', (h) => { if (h[':status'] === 410) muertos.push(token); else if (h[':status'] !== 200) ok = false })
      req.on('error', () => { ok = false; resolve() })
      req.on('close', resolve)
      req.end('{}')
    })))
  } finally { cliente.close() }
  return { muertos, ok }
}
