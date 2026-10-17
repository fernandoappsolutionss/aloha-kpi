// Cobranza Vencida (N°) sincronizada desde Zoho Books.
// Módulo PURO + cliente REST (mismo patrón que lib/cron-auth.mjs: la lógica
// testeable vive aquí y el route solo orquesta).
//
// Cada centro factura desde una organización de Zoho Books. Dos organizaciones
// facturan para DOS centros a la vez; ahí el centro se distingue por texto en
// el artículo vendido; referencia, vendedor y dirección son respaldo:
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
const textoNormal = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
const NO_MENSUALIDAD = /matricul|inscripcion|campeonato|reposicion|material|uniforme|regalia|royalt|franquicia|seguro de accidente/
const MENSUALIDAD = /mensualidad|mensualidades|programa educativo/

export function tipoArticulo(item) {
  const texto = textoNormal(item.name)
  if (NO_MENSUALIDAD.test(texto)) return 'otro'
  if (MENSUALIDAD.test(texto)) return 'mensualidad'
  return 'desconocido'
}

export function esMensualidad(invoice) {
  return (invoice.line_items || []).some(item => tipoArticulo(item) === 'mensualidad')
}

export function clasificarCentro(org, invoice) {
  if (org.centros.length === 1) return org.centros[0].centroId
  // El artículo vendido es más fiable que el domicilio del representante.
  // Una señal ambigua nunca se resuelve por el orden de los centros.
  const mensualidades = (invoice.line_items || []).filter(item => tipoArticulo(item) === 'mensualidad')
  for (const texto of [mensualidades.map(item => item.name).join('|'), invoice.reference_number,
    invoice.salesperson_name, invoice.billing_address?.address]) {
    const centros = org.centros.filter(c => c.kw.some(k => textoNormal(texto).includes(k)))
    if (centros.length > 1) return null
    if (centros.length === 1) return centros[0].centroId
  }
  return null
}

// Una factura mixta cuenta una vez si conserva saldo de mensualidad cierto.
// Zoho no distribuye el saldo por artículo: si un pago parcial deja una
// mezcla mensualidad/otros sin atribución, se exige revisión, no una suposición.
export function clasificarFactura(org, invoice, hoy) {
  const base = { orgId: org.orgId, facturaId: String(invoice.invoice_id), numero: invoice.invoice_number,
    vencimiento: invoice.due_date, saldo: Number(invoice.balance),
    articulos: (invoice.line_items || []).map(item => ({ nombre: item.name, tipo: tipoArticulo(item) })) }
  if (!Number.isFinite(base.saldo) || !invoice.due_date)
    return { ...base, estado: 'revisar', motivo: 'Saldo o vencimiento sin confirmar' }
  if (['paid', 'void', 'draft'].includes(invoice.status) || !(Number(invoice.balance) > 0) || !invoice.due_date || invoice.due_date >= hoy)
    return { ...base, estado: 'excluida', motivo: 'Sin saldo vencido' }
  if (!base.articulos.length || base.articulos.some(item => item.tipo === 'desconocido'))
    return { ...base, estado: 'revisar', motivo: 'Artículo sin clasificación' }
  if (!esMensualidad(invoice)) return { ...base, estado: 'excluida', motivo: 'No es mensualidad' }
  if (base.articulos.some(item => item.tipo === 'otro') && Number(invoice.balance) < Number(invoice.total))
    return { ...base, estado: 'revisar', motivo: 'Factura mixta con pago parcial' }
  const centroId = clasificarCentro(org, invoice)
  return centroId == null ? { ...base, estado: 'revisar', motivo: 'Centro sin identificar' }
    : { ...base, estado: 'incluida', centroId }
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

// Cuenta externa que reúne las organizaciones de Zoho Books (confirmada
// por Fernando 2026-09-12). El Master del KPI administra la conexión con
// su propio correo; requireCurrentMaster valida ese acceso por separado.
export const EMAIL_ZOHO_AUTORIZADO = 'latinchinapanama@gmail.com'

export function emailAutorizado(email) {
  return String(email || '').trim().toLowerCase() === EMAIL_ZOHO_AUTORIZADO
}

// ---------------------------------------------------------------------------
// Cliente REST. El refresh token llega por parámetro (viene de la DB, tabla
// zoho_conexion, vía lib/zoho-conexion.js) o de ZOHO_REFRESH_TOKEN como
// override. ZOHO_CLIENT_ID/SECRET siempre vienen del entorno.
// ---------------------------------------------------------------------------
export const ZOHO_ACCOUNTS = 'https://accounts.zoho.com'
const ZOHO_BOOKS = 'https://www.zohoapis.com/books/v3'

let _token = null
let _tokenExpira = 0
let _tokenDe = null

export async function zohoToken(refreshToken = process.env.ZOHO_REFRESH_TOKEN) {
  if (_token && _tokenDe === refreshToken && Date.now() < _tokenExpira) return _token
  const { ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET } = process.env
  if (!ZOHO_CLIENT_ID || !ZOHO_CLIENT_SECRET) {
    throw new Error('Faltan ZOHO_CLIENT_ID / ZOHO_CLIENT_SECRET')
  }
  if (!refreshToken) {
    throw new Error('Zoho sin conectar: entra a /dashboard/zoho y conecta la cuenta')
  }
  const params = new URLSearchParams({
    refresh_token: refreshToken,
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
  if (!res.ok || !data.access_token) throw new Error('Zoho no entregó acceso. Revisa la conexión.')
  _token = data.access_token
  _tokenExpira = Date.now() + 50 * 60 * 1000
  _tokenDe = refreshToken
  return _token
}

// Límite documentado: 100 peticiones/minuto por organización. Cada org
// tiene su cola; las organizaciones se pueden leer en paralelo.
const siguientePeticion = new Map()
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms))
export async function consultarZoho(orgId, path, filtros = {}, refreshToken) {
  const token = await zohoToken(refreshToken)
  for (let intento = 0; intento < 3; intento++) {
    const turno = Math.max(Date.now(), siguientePeticion.get(orgId) || 0)
    siguientePeticion.set(orgId, turno + 700)
    await esperar(Math.max(0, turno - Date.now()))
    const qs = new URLSearchParams({ organization_id: orgId, ...filtros })
    const res = await fetch(`${ZOHO_BOOKS}/${path}?${qs}`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(20000),
    })
    if (res.status === 429 && intento < 2) { await esperar(10000 * (intento + 1)); continue }
    const data = await res.json()
    if (!res.ok || data.code !== 0) throw new Error(`Zoho org ${orgId}: consulta incompleta (HTTP ${res.status}, código ${data.code})`)
    return data
  }
}

export async function listarFacturas(orgId, filtros = {}, refreshToken, consultar = consultarZoho) {
  const todas = []
  for (let page = 1; page <= 50; page++) {
    const data = await consultar(orgId, 'invoices', { ...filtros, per_page: '200', page: String(page) }, refreshToken)
    if (!Array.isArray(data.invoices)) throw new Error(`Zoho org ${orgId}: faltan facturas en la respuesta`)
    todas.push(...data.invoices)
    if (typeof data.page_context?.has_more_page !== 'boolean') throw new Error(`Zoho org ${orgId}: paginación sin confirmar`)
    if (!data.page_context.has_more_page) return todas
  }
  throw new Error(`Zoho org ${orgId}: paginación incompleta`)
}

export async function contarVencidasHoy(refreshToken, { hoy = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Panama' }),
  listar = listarFacturas, detalle = async (orgId, id, token) => {
    const data = await consultarZoho(orgId, `invoices/${encodeURIComponent(id)}`, {}, token)
    if (!data.invoice || !Array.isArray(data.invoice.line_items)) throw new Error(`Zoho org ${orgId}: falta detalle de factura`)
    return data.invoice
  } } = {}) {
  // Renueva una vez antes de iniciar las cuatro colas.
  if (listar === listarFacturas) await zohoToken(refreshToken)
  const organizaciones = await Promise.all(ORGS_ZOHO.map(async org => {
    const vencidas = await listar(org.orgId, { status: 'overdue' }, refreshToken)
    const parciales = await listar(org.orgId, { status: 'partially_paid' }, refreshToken)
    const unicas = [...new Map([...vencidas, ...parciales].map(inv => [String(inv.invoice_id), inv])).values()]
    const facturas = []
    for (const inv of unicas) {
      if (!inv.invoice_id || inv.balance == null || !Number.isFinite(Number(inv.balance)) || !inv.due_date)
        throw new Error(`Zoho org ${org.orgId}: saldo o vencimiento sin confirmar`)
      if (!(Number(inv.balance) > 0) || !inv.due_date || inv.due_date >= hoy) continue
      const completa = await detalle(org.orgId, inv.invoice_id, refreshToken)
      if (String(completa.invoice_id) !== String(inv.invoice_id)) throw new Error('Zoho devolvió otra factura')
      facturas.push(clasificarFactura(org, completa, hoy))
    }
    return { orgId: org.orgId, nombre: org.nombre, facturas }
  }))
  const facturas = organizaciones.flatMap(org => org.facturas)
  const porCentro = Object.fromEntries(ORGS_ZOHO.flatMap(org => org.centros.map(c => [c.centroId, 0])))
  for (const f of facturas) if (f.estado === 'incluida') porCentro[f.centroId]++
  const pendientes = facturas.filter(f => f.estado === 'revisar')
  return { completo: pendientes.length === 0, porCentro, organizaciones, pendientes,
    incluidos: facturas.filter(f => f.estado === 'incluida').length,
    excluidos: facturas.filter(f => f.estado === 'excluida').length, revisados: facturas.length }
}
