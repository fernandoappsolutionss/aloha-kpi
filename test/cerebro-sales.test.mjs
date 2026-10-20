import { test } from 'node:test'
import assert from 'node:assert/strict'
import { invoiceEvidence, syncCerebroSales } from '../lib/cerebro-sales.mjs'

const invoice = { invoice_id: '100', customer_id: '200', email: ' Buyer@example.com ',
  status: 'paid', total: 100, balance: 0, currency_code: 'USD' }
const payments = [{ payment_id: '300', date: '2026-10-01', amount: 100 }]
test('only explicit invoice identity crosses the integration; no names or notes', () => {
  const result = invoiceEvidence('667522360', { ...invoice, customer_name: 'private', notes: 'private' }, payments)
  assert.deepEqual(result.emails, ['buyer@example.com'])
  assert.ok(!JSON.stringify(result).includes('private'))
})
test('missing payment array is an incomplete read, never an empty successful payment', () => {
  assert.throws(() => invoiceEvidence('667522360', invoice, undefined))
  assert.throws(() => invoiceEvidence('667522360', invoice, [{ amount: 100 }]))
})
test('resume retries the same page when CRM rejects a row', async () => {
  const actions = []
  const result = await syncCerebroSales('offline', {
    crm: async (action) => { actions.push(action); return action === 'sales_sync_cursor' ? { page: 3 } : { error: 'not saved' } },
    consultar: async (_org, path) => path === 'invoices' ? { invoices: [{ invoice_id: '100' }], page_context: { has_more_page: true } }
      : path.endsWith('/payments') ? { payments } : { invoice },
  })
  assert.equal(result.ok, false)
  assert.ok(!actions.includes('save_sales_sync_cursor'))
})
test('completed page advances once, completed scan wraps for reversals', async () => {
  const advances = []
  const result = await syncCerebroSales('offline', {
    crm: async (action, payload) => {
      if (action === 'sales_sync_cursor') return { page: 3 }
      if (action === 'save_sales_sync_cursor') advances.push(payload.page)
      return { linked: true, paid: true }
    },
    consultar: async (_org, path) => path === 'invoices' ? { invoices: [{ invoice_id: '100' }], page_context: { has_more_page: false } }
      : path.endsWith('/payments') ? { payments } : { invoice },
  })
  assert.equal(result.ok, true)
  assert.deepEqual(advances, [1, 1, 1, 1])
  assert.equal(result.organizations.reduce((sum, r) => sum + r.paid, 0), 4)
})
