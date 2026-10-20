// Reads the existing invoice OAuth scope. Never creates payments or invoices.
import { ORGS_ZOHO, consultarZoho } from './zoho-cobranza.mjs'
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

/** Bounded, restartable scan. Advance only after the entire page reached CRM. */
export async function syncCerebroSales(refreshToken, { consultar = consultarZoho, crm = crmCall, budgetMs = 240000 } = {}) {
  const started = Date.now()
  const results = []
  for (const org of ORGS_ZOHO) {
    if (Date.now() - started > budgetMs) { results.push({ organization_id: org.orgId, deferred: true }); continue }
    const report = { organization_id: org.orgId, documents: 0, linked: 0, paid: 0 }
    try {
      const cursor = await crm('sales_sync_cursor', { organization_id: org.orgId })
      if (cursor.error) throw new Error('Cursor CRM no disponible')
      const page = cursor.page
      if (!Number.isInteger(page) || page < 1) throw new Error('Cursor inválido')
      const list = await consultar(org.orgId, 'invoices', {
        per_page: '10', page: String(page), sort_column: 'created_time', sort_order: 'A',
      }, refreshToken)
      if (!Array.isArray(list.invoices) || typeof list.page_context?.has_more_page !== 'boolean')
        throw new Error('Paginación de facturas incompleta')
      for (const summary of list.invoices) {
        if (Date.now() - started > budgetMs) throw new Error('Presupuesto de ejecución agotado; página pendiente')
        const id = String(summary.invoice_id)
        if (!/^\d+$/.test(id)) throw new Error('ID inválido')
        const detail = await consultar(org.orgId, `invoices/${id}`, {}, refreshToken)
        if (String(detail.invoice?.invoice_id) !== id) throw new Error('Zoho devolvió otra factura')
        const payments = await consultar(org.orgId, `invoices/${id}/payments`, {}, refreshToken)
        const evidence = invoiceEvidence(org.orgId, detail.invoice, payments.payments)
        const saved = await crm('record_sales_invoice', { invoice: evidence })
        if (saved.error) throw new Error('CRM no confirmó la evidencia')
        report.documents++
        if (saved.linked) report.linked++
        if (saved.paid) report.paid++
        // Field names only, useful to diagnose provider versions without customer data.
        report.source_fields = { invoice: Object.keys(detail.invoice), payment: Object.keys(payments.payments?.[0] || {}) }
      }
      const next = list.page_context.has_more_page ? page + 1 : 1
      const saved = await crm('save_sales_sync_cursor', { organization_id: org.orgId, page: next })
      if (saved.error) throw new Error('CRM no confirmó el avance')
      report.page = page
      report.cycle_complete = next === 1
    } catch (error) {
      report.error = error.message
    }
    results.push(report)
  }
  return { ok: results.every(r => !r.error && !r.deferred), organizations: results }
}
