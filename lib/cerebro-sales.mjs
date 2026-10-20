// Reads the existing invoice OAuth scope. Never creates payments or invoices.
import { ORGS_ZOHO, consultarZoho, zohoToken } from './zoho-cobranza.mjs'
import { crmCall } from './crm.js'

export function invoiceEvidence(orgId, invoice, paymentRows) {
  if (!/^\d+$/.test(String(invoice?.invoice_id)) || !/^\d+$/.test(String(invoice?.customer_id)))
    throw new Error('Factura sin identidad')
  if (!Array.isArray(paymentRows)) throw new Error('Pagos de factura incompletos')
  const emails = [...new Set([
    invoice.email,
    ...(invoice.contact_persons_details || []).filter(p => p.is_primary_contact === true || invoice.contact_persons_details.length === 1).map(p => p.email),
  ].filter(e => typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim())).map(e => e.trim().toLowerCase()))]
  return {
    organization_id: orgId, invoice_id: String(invoice.invoice_id), customer_id: String(invoice.customer_id),
    emails, status: invoice.status, total: Number(invoice.total), balance: Number(invoice.balance),
    currency: invoice.currency_code,
    payments: paymentRows.map(p => {
      if (!/^\d+$/.test(String(p.payment_id)) || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) ||
        !Number.isFinite(Number(p.amount)) || !(Number(p.amount) > 0)) throw new Error('Pago sin referencia, fecha o importe')
      return { payment_id: String(p.payment_id), date: p.date, amount: Number(p.amount) }
    }),
  }
}

/** Recent changes, stale linked invoices and history progress independently. */
export async function syncCerebroSales(refreshToken, { consultar = consultarZoho, crm = crmCall, budgetMs = 240000 } = {}) {
  const started = Date.now()
  if (consultar === consultarZoho) await zohoToken(refreshToken)
  const results = await Promise.all(ORGS_ZOHO.map(async org => {
    const report = { organization_id: org.orgId, documents: 0, linked: 0, paid: 0, settled: 0, with_email: 0 }
    try {
      const cursor = await crm('sales_sync_cursor', { organization_id: org.orgId })
      if (cursor.error) throw new Error('Cursor CRM no disponible')
      const state = { page: cursor.page, recent_page: cursor.recent_page ?? 1,
        recent_since: cursor.recent_since ?? new Date(started - 30 * 86400000).toISOString(),
        recent_started_at: cursor.recent_started_at ?? new Date(started).toISOString() }
      if (![state.page, state.recent_page].every(page => Number.isInteger(page) && page >= 1 && page <= 10000)
        || !Number.isFinite(Date.parse(state.recent_since)) || !Number.isFinite(Date.parse(state.recent_started_at))
        || Date.parse(state.recent_since) > Date.parse(state.recent_started_at)
        || Date.parse(state.recent_started_at) > started) throw new Error('Cursor inválido')
      const seen = new Set()
      const readInvoice = async id => {
        if (!/^\d+$/.test(id)) throw new Error('ID inválido')
        if (seen.has(id)) return
        if (Date.now() - started > budgetMs) throw new Error('Presupuesto de ejecución agotado; página pendiente')
        const detail = await consultar(org.orgId, `invoices/${id}`, {}, refreshToken)
        if (String(detail.invoice?.invoice_id) !== id) throw new Error('Zoho devolvió otra factura')
        const payments = await consultar(org.orgId, `invoices/${id}/payments`, {}, refreshToken)
        const evidence = invoiceEvidence(org.orgId, detail.invoice, payments.payments)
        const saved = await crm('record_sales_invoice', { invoice: evidence })
        if (saved.error) throw new Error('CRM no confirmó la evidencia')
        report.documents++
        if (saved.linked) report.linked++
        if (saved.paid) report.paid++
        if (saved.settled) report.settled++
        if (evidence.emails.length) report.with_email++
        seen.add(id)
      }
      // Recheck positive/contact-linked evidence before its seven-day freshness expires.
      for (const id of cursor.recheck_ids ?? []) await readInvoice(id)
      const readPage = async filters => {
        const list = await consultar(org.orgId, 'invoices', {
          per_page: '10', sort_column: 'created_time', sort_order: 'A', ...filters,
        }, refreshToken)
        if (!Array.isArray(list.invoices) || typeof list.page_context?.has_more_page !== 'boolean')
          throw new Error('Paginación de facturas incompleta')
        for (const summary of list.invoices) await readInvoice(String(summary.invoice_id))
        return list.page_context.has_more_page
      }
      const checkpoint = async () => {
        const saved = await crm('save_sales_sync_cursor', { organization_id: org.orgId, cursor: { ...state } })
        if (saved.error) throw new Error('CRM no confirmó el avance')
      }
      // Freeze the lower bound until all pages finish. Next cycle overlaps its
      // START, not its end, so modifications during a multi-run scan are replayed.
      for (let n = 0; n < 2; n++) {
        const more = await readPage({ page: String(state.recent_page),
          last_modified_time: state.recent_since.replace('.000Z', '+0000').replace(/\.\d{3}Z$/, '+0000') })
        if (more) state.recent_page++
        else {
          state.recent_since = new Date(Date.parse(state.recent_started_at) - 600000).toISOString()
          state.recent_started_at = new Date(started).toISOString()
          state.recent_page = 1
        }
        await checkpoint()
        report.recent_complete = !more
        if (!more) break
      }
      for (let n = 0; n < 5; n++) {
        const page = state.page
        const more = await readPage({ page: String(page) })
        state.page = more ? page + 1 : 1
        await checkpoint()
        report.page = page
        report.cycle_complete = !more
        if (!more) break
      }
    } catch (error) {
      report.error = error.message
    }
    return report
  }))
  return { ok: results.every(r => !r.error && !r.deferred), organizations: results }
}
