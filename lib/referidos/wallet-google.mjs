// Google Wallet: objeto loyalty con el saldo. Sin las variables de entorno
// queda apagado y la tarjeta web funciona igual.
import { SignJWT, importPKCS8 } from 'jose'

const API = 'https://walletobjects.googleapis.com/walletobjects/v1'

export function googleConfig(env = process.env) {
  const c = {
    issuer: env.GOOGLE_WALLET_ISSUER_ID, email: env.GOOGLE_WALLET_SA_EMAIL,
    key: env.GOOGLE_WALLET_SA_KEY ? Buffer.from(env.GOOGLE_WALLET_SA_KEY, 'base64').toString('utf8') : '',
  }
  return c.issuer && c.email && c.key ? c : null
}

// El id lleva la emisión: al reemitir se crea otro objeto y el anterior se desactiva.
export const objetoGoogleDe = (m, issuer = process.env.GOOGLE_WALLET_ISSUER_ID) => `${issuer}.m${m.id}_${m.emision}`
const claseDe = (config) => `${config.issuer}.aloha_referidos`

const firmar = async (config, claims) =>
  new SignJWT(claims).setProtectedHeader({ alg: 'RS256', typ: 'JWT' }).sign(await importPKCS8(config.key, 'RS256'))

async function tokenOAuth(config, fetchFn) {
  const ahora = Math.floor(Date.now() / 1000)
  const assertion = await firmar(config, {
    iss: config.email, scope: 'https://www.googleapis.com/auth/wallet_object.issuer',
    aud: 'https://oauth2.googleapis.com/token', iat: ahora, exp: ahora + 600,
  })
  const res = await fetchFn('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  })
  if (!res.ok) throw new Error(`Google OAuth respondió ${res.status}`)
  return (await res.json()).access_token
}

export function cuerpoObjeto(m, { config, base }) {
  return {
    id: objetoGoogleDe(m, config.issuer),
    classId: claseDe(config),
    state: 'ACTIVE',
    accountId: m.codigo.toUpperCase(),
    accountName: m.nombre || 'Familia ALOHA',
    barcode: { type: 'QR_CODE', value: `${base}/r/${m.codigo}` },
    loyaltyPoints: { label: 'Saldo', balance: { money: { micros: String(Number(m.saldo_cent || 0) * 10000), currencyCode: 'USD' } } },
  }
}

// Asegura la clase y el objeto (crea o actualiza) con el saldo vigente.
export async function publicarObjeto(m, { config, base, fetchFn = fetch }) {
  const auth = { authorization: `Bearer ${await tokenOAuth(config, fetchFn)}`, 'content-type': 'application/json' }
  const clase = await fetchFn(`${API}/loyaltyClass/${claseDe(config)}`, { headers: auth })
  if (clase.status === 404) {
    const creada = await fetchFn(`${API}/loyaltyClass`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({
        id: claseDe(config), issuerName: 'ALOHA Mental Arithmetic', programName: 'Referidos ALOHA', reviewStatus: 'UNDER_REVIEW',
        programLogo: { sourceUri: { uri: `${base}/aloha/icon.png` }, contentDescription: { defaultValue: { language: 'es', value: 'ALOHA' } } },
        hexBackgroundColor: '#00556D',
      }),
    })
    if (!creada.ok && creada.status !== 409) throw new Error(`Google Wallet (clase) respondió ${creada.status}`)
  } else if (!clase.ok) throw new Error(`Google Wallet (clase) respondió ${clase.status}`)
  const cuerpo = cuerpoObjeto(m, { config, base })
  let res = await fetchFn(`${API}/loyaltyObject/${cuerpo.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify(cuerpo) })
  if (res.status === 404) res = await fetchFn(`${API}/loyaltyObject`, { method: 'POST', headers: auth, body: JSON.stringify(cuerpo) })
  if (!res.ok) throw new Error(`Google Wallet (objeto) respondió ${res.status}`)
}

export async function desactivarObjeto(objetoId, { config, fetchFn = fetch }) {
  const auth = { authorization: `Bearer ${await tokenOAuth(config, fetchFn)}`, 'content-type': 'application/json' }
  const res = await fetchFn(`${API}/loyaltyObject/${objetoId}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ state: 'INACTIVE' }) })
  if (!res.ok && res.status !== 404) throw new Error(`Google Wallet (baja) respondió ${res.status}`)
}

// Enlace «Agregar a Google Wallet»: JWT que solo referencia el objeto ya creado.
export async function enlaceGuardar(m, { config, base }) {
  const jwt = await firmar(config, {
    iss: config.email, aud: 'google', typ: 'savetowallet', iat: Math.floor(Date.now() / 1000),
    origins: [new URL(base).origin],
    payload: { loyaltyObjects: [{ id: objetoGoogleDe(m, config.issuer) }] },
  })
  return `https://pay.google.com/gp/v/save/${jwt}`
}
