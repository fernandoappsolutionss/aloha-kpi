// Cobranza Vencida (N°) sincronizada desde Zoho Books.
// Módulo PURO + cliente REST (mismo patrón que lib/cron-auth.mjs: la lógica
// testeable vive aquí y el route solo orquesta).
//
// Cada centro factura desde una organización de Zoho Books. Dos organizaciones
// facturan para DOS centros a la vez; ahí el centro se distingue por texto en
// la factura (referencia, vendedor o dirección):
//   F & F Soluciones Integrales  → CALLE 50 (ref "Calle50-…") y DAVID (ref "David-…")
//   ALTAVIA GROUP                → ANCLAS ("…Anclas") y BRISAS ("Centro de Brisas"/dirección)
//   V & A Soluciones Integrales  → CONDADO DEL REY (todo)
//   FF Solutiones Integrales 2024 → LOS NARANJOS (todo)

export const ORGS_ZOHO = [
  {
    orgId: '667522360',
    nombre: 'F & F Soluciones Integrales',
    centros: [
      { centroId: 5, nombre: 'DAVID', kw: ['david'] },
      { centroId: 3, nombre: 'CALLE 50', kw: ['calle50', 'calle 50'] },
    ],
  },
  {
    orgId: '903355420',
    nombre: 'ALTAVIA GROUP',
    centros: [
      // "ancla" primero: hay facturas de Anclas con vendedor genérico ("Otros")
      // pero referencia "… Anclas"; las de Brisas se reconocen por vendedor
      // "Centro de Brisas" o por la dirección del cliente.
      { centroId: 2, nombre: 'ANCLAS MALL', kw: ['ancla'] },
      { centroId: 1, nombre: 'BRISAS DEL GOLF', kw: ['brisa'] },
    ],
  },
  { orgId: '886209250', nombre: 'V & A Soluciones Integrales', centros: [{ centroId: 6, nombre: 'CONDADO DEL REY' }] },
  { orgId: '854270088', nombre: 'FF Solutiones Integrales 2024', centros: [{ centroId: 10, nombre: 'LOS NARANJOS' }] },
]

// ¿A qué centro pertenece la factura? null = no se pudo clasificar (solo
// posible en orgs multi-centro; el cron las reporta para que no se pierdan
// en silencio).
export function clasificarCentro(org, invoice) {
  if (org.centros.length === 1) return org.centros[0].centroId
  const texto = [invoice.reference_number, invoice.salesperson_name, invoice.billing_address?.address]
    .filter(Boolean).join('|').toLowerCase()
  for (const c of org.centros) {
    if (c.kw.some((k) => texto.includes(k))) return c.centroId
  }
  return null
}

// Semana (1-5) y día (1=lun … 5=vie) de la casilla KPI que corresponde a una
// fecha. Convención ALOHA: cada semana es un bloque lunes-viernes; si el mes
// arranca martes-viernes, ese fragmento inicial es la semana 1. Sábado y
// domingo no se registran (null).
export function semanaDiaKpi(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  if (dow === 0 || dow === 6) return null
  let lunes = 0
  for (let i = 1; i <= d; i++) {
    if (new Date(Date.UTC(y, m - 1, i)).getUTCDay() === 1) lunes++
  }
  const dow1 = new Date(Date.UTC(y, m - 1, 1)).getUTCDay()
  const fragmentoInicial = dow1 >= 2 && dow1 <= 5
  // ponytail: clamp a 5 — la UI solo tiene 5 semanas; un 6.º bloque (mes de
  // 31 días que arranca viernes) cae en la semana 5.
  const semana = Math.min(5, Math.max(1, lunes + (fragmentoInicial ? 1 : 0)))
  return { semana, dia: dow }
}

// ¿La factura estaba vencida el día `iso`? Regla Zoho: vencida cuando
// due_date < hoy. Para días pasados aproximamos el estado con
// last_payment_date (si se pagó en o después del día, ese día seguía vencida).
export function vencidaElDia(invoice, iso) {
  if (invoice.status === 'void' || invoice.status === 'draft') return false
  if (!invoice.due_date || invoice.due_date >= iso) return false
  if (invoice.status !== 'paid') return true
  return Boolean(invoice.last_payment_date) && invoice.last_payment_date >= iso
}

// ---------------------------------------------------------------------------
// Cliente REST (necesita ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN)
// ---------------------------------------------------------------------------
const ZOHO_ACCOUNTS = 'https://accounts.zoho.com'
const ZOHO_BOOKS = 'https://www.zohoapis.com/books/v3'

let _token = null
let _tokenExpira = 0

export async function zohoToken() {
  if (_token && Date.now() < _tokenExpira) return _token
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN } = process.env
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET || !ZOHO_REFRESH_TOKEN) {
    throw new Error('Faltan ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET / ZOHO_REFRESH_TOKEN')
  }
  const params = new URLSearchParams({
    refresh_token: ZOHO_REFRESH_TOKEN,
    client_id: ZOHO_CLIENT_ID,
    client_secret: ZOHO_CLIENT_SECRET,
    grant_type: 'refresh_token',
  })
  const res = await fetch(`${ZOHO_ACCOUNTS}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Zoho no devolvió access_token: ${JSON.stringify(data)}`)
  _token = data.access_token
  _tokenExpira = Date.now() + 50 * 60 * 1000
  return _token
}

// Lista facturas de una org paginando hasta agotar. `filtros` = query params
// extra del endpoint /invoices (status, due_date_end, etc.).
export async function listarFacturas(orgId, filtros = {}) {
  const token = await zohoToken()
  const todas = []
  for (let page = 1; page <= 50; page++) {
    const qs = new URLSearchParams({ organization_id: orgId, per_page: '200', page: String(page), ...filtros })
    const res = await fetch(`${ZOHO_BOOKS}/invoices?${qs}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    })
    const data = await res.json()
    if (data.code !== 0) throw new Error(`Zoho org ${orgId}: ${data.message || 'error'} (code ${data.code})`)
    todas.push(...(data.invoices || []))
    if (!data.page_context?.has_more_page) break
  }
  return todas
}

// Conteo de facturas vencidas HOY por centro, consultando las 4 orgs.
// Devuelve { porCentro: {centroId: n}, sinClasificar: {orgNombre: n} }.
export async function contarVencidasHoy() {
  const porCentro = {}
  const sinClasificar = {}
  for (const org of ORGS_ZOHO) {
    const facturas = await listarFacturas(org.orgId, { status: 'overdue' })
    for (const c of org.centros) porCentro[c.centroId] = porCentro[c.centroId] || 0
    for (const inv of facturas) {
      const centroId = clasificarCentro(org, inv)
      if (centroId === null) {
        sinClasificar[org.nombre] = (sinClasificar[org.nombre] || 0) + 1
      } else {
        porCentro[centroId] = (porCentro[centroId] || 0) + 1
      }
    }
  }
  return { porCentro, sinClasificar }
}
