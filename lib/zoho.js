// Cliente servidor-a-servidor de Zoho Books.
//
// Autenticación: OAuth "self client" con refresh token permanente. El refresh
// token es de la CUENTA, no de una organización: el mismo token sirve para
// todas las orgs de Zoho de ALOHA (Panamá, Santiago, Venezuela…), y cada
// llamada dice sobre cuál trabaja con `organization_id`.
//
// Server-only: nada de esto puede llegar al navegador. Las server actions son
// las únicas que lo importan.

const TIMEOUT_MS = 20000
// Zoho Books permite ~100 llamadas por minuto y por organización. Al publicar
// se manda un POST por movimiento, así que se espacian para no chocar con el
// 429 (que además invalida el ritmo del resto del lote).
export const ESPACIADO_MS = 650

function dc() {
  // 'com' (global), 'eu', 'in', 'com.au', 'jp'… Es el dominio del centro de
  // datos donde vive la cuenta de Zoho.
  return (process.env.ZOHO_DC || 'com').replace(/^\.+|\.+$/g, '')
}

export function zohoConfigurado() {
  return Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN)
}

// Token de acceso cacheado en memoria del proceso. Dura 1 hora; se renueva un
// minuto antes para no perder una llamada por el filo del vencimiento.
let cache = { token: null, vence: 0 }

async function tokenAcceso({ forzar = false } = {}) {
  if (!zohoConfigurado()) throw new Error('Zoho no está configurado (faltan ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN).')
  if (!forzar && cache.token && Date.now() < cache.vence) return cache.token

  const cuerpo = new URLSearchParams({
    refresh_token: process.env.ZOHO_REFRESH_TOKEN,
    client_id: process.env.ZOHO_CLIENT_ID,
    client_secret: process.env.ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  })
  const res = await fetch(`https://accounts.zoho.${dc()}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: cuerpo.toString(),
    cache: 'no-store',
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    // El error de Zoho aquí suele ser 'invalid_client' o 'invalid_code'; se
    // reporta tal cual porque es lo único accionable para quien configura.
    throw new Error(`Zoho no entregó el token de acceso (${data.error || res.status}).`)
  }
  cache = { token: data.access_token, vence: Date.now() + (Number(data.expires_in || 3600) - 60) * 1000 }
  return cache.token
}

export function limpiarTokenCache() {
  cache = { token: null, vence: 0 }
}

function urlApi(ruta, params = {}) {
  const url = new URL(`https://www.zohoapis.${dc()}/books/v3${ruta}`)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }
  return url.toString()
}

// Llamada genérica. Reintenta UNA vez con token nuevo ante 401: el token
// cacheado puede haber sido revocado desde la consola de Zoho.
async function llamar(ruta, { metodo = 'GET', params = {}, cuerpo = null, reintento = false } = {}) {
  const token = await tokenAcceso({ forzar: reintento })
  let res
  try {
    res = await fetch(urlApi(ruta, params), {
      method: metodo,
      headers: {
        Authorization: `Zoho-oauthtoken ${token}`,
        ...(cuerpo ? { 'content-type': 'application/json' } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
  } catch (e) {
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') throw new Error('Zoho no respondió a tiempo.')
    throw e
  }

  if (res.status === 401 && !reintento) {
    limpiarTokenCache()
    return await llamar(ruta, { metodo, params, cuerpo, reintento: true })
  }

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 429) throw new Error('Zoho está limitando las llamadas por minuto. Espera un momento y continúa.')
    throw new Error(data?.message || `Zoho respondió ${res.status}.`)
  }
  return data
}

// Recorre las páginas de un listado hasta agotarlas (con tope de seguridad).
async function listarTodo(ruta, { params = {}, campo, maxPaginas = 25, porPagina = 200 } = {}) {
  const items = []
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const data = await llamar(ruta, { params: { ...params, page: pagina, per_page: porPagina } })
    items.push(...(data?.[campo] || []))
    if (!data?.page_context?.has_more_page) break
  }
  return items
}

export async function listarOrganizaciones() {
  const data = await llamar('/organizations')
  return (data.organizations || [])
    .filter((o) => o.is_org_active !== false)
    .map((o) => ({
      organization_id: String(o.organization_id),
      nombre: String(o.name || '').trim(),
      pais: o.country_code || '',
      moneda: o.currency_code || '',
    }))
}

export async function listarCuentasBancarias(orgId) {
  const cuentas = await listarTodo('/bankaccounts', {
    params: { organization_id: orgId, filter_by: 'Status.Active' },
    campo: 'bankaccounts',
  })
  return cuentas.map((c) => ({
    account_id: String(c.account_id),
    nombre: String(c.account_name || '').trim(),
    tipo: c.account_type || '',
    banco: c.bank_name || '',
    numero: c.account_number || '',
    moneda: c.currency_code || '',
    saldo: Number(c.balance ?? 0),
  }))
}

// Cuentas contables a las que puede apuntar una regla: ingresos, gastos y
// costo de ventas. Se dejan fuera bancos y cuentas de sistema para que nadie
// mande un gasto contra la propia cuenta bancaria.
const TIPOS_DESTINO = new Set(['income', 'other_income', 'expense', 'cost_of_goods_sold', 'other_expense', 'other_current_liability', 'other_current_asset', 'fixed_asset', 'equity', 'long_term_liability', 'accounts_payable', 'accounts_receivable'])

export async function listarCuentasContables(orgId) {
  const cuentas = await listarTodo('/chartofaccounts', {
    params: { organization_id: orgId, filter_by: 'AccountType.Active' },
    campo: 'chartofaccounts',
  })
  return cuentas
    .filter((c) => TIPOS_DESTINO.has(String(c.account_type || '')))
    .map((c) => ({
      account_id: String(c.account_id),
      nombre: String(c.account_name || '').trim(),
      tipo: String(c.account_type || ''),
      codigo: c.account_code || '',
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

// Movimientos que Zoho YA tiene en la cuenta, para conciliar contra ellos.
//
// Los filtros de fecha se mandan como pista al servidor, pero el recorte
// definitivo se hace aquí: si Zoho ignorara un parámetro de fecha (cambia
// entre versiones de la API), traer de más y filtrar en casa es inofensivo,
// mientras que confiar en un filtro que no se aplicó haría "conciliar" contra
// un rango equivocado.
export async function listarTransaccionesBancarias(orgId, { accountId, desde, hasta }) {
  const items = await listarTodo('/banktransactions', {
    params: {
      organization_id: orgId,
      account_id: accountId,
      date_start: desde,
      date_end: hasta,
      sort_column: 'date',
    },
    campo: 'banktransactions',
  })
  return items.filter((t) => {
    const fecha = String(t?.date || '').slice(0, 10)
    if (!fecha) return false
    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false
    return true
  })
}

export async function crearTransaccionBancaria(orgId, payload) {
  const data = await llamar('/banktransactions', {
    metodo: 'POST',
    params: { organization_id: orgId },
    cuerpo: payload,
  })
  const txn = data?.banktransaction || data?.bank_transaction || {}
  const id = txn.transaction_id || txn.banktransaction_id
  if (!id) throw new Error('Zoho creó el movimiento pero no devolvió su identificador.')
  return String(id)
}
