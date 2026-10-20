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
test('reads the documented Zoho v3 associated contact and rejects multiple recipients', () => {
  const one = { ...invoice, email: undefined, contact_persons_associated: [
    { contact_person_email: 'buyer@example.com', first_name: 'private', phone: 'private' },
  ] }
  assert.deepEqual(invoiceEvidence('667522360', one, payments).emails, ['buyer@example.com'])
  assert.deepEqual(invoiceEvidence('667522360', { ...one, contact_persons_associated: [
    ...one.contact_persons_associated, { contact_person_email: 'other@example.com' },
  ] }, payments).emails, [])
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
      if (action === 'save_sales_sync_cursor') advances.push(payload.cursor.page)
      return { linked: true, paid: true }
    },
    consultar: async (_org, path) => path === 'invoices' ? { invoices: [{ invoice_id: '100' }], page_context: { has_more_page: false } }
      : path.endsWith('/payments') ? { payments } : { invoice },
  })
  assert.equal(result.ok, true)
  assert.equal(advances.filter(page => page === 1).length, 4)
  assert.equal(advances.filter(page => page === 3).length, 4)
  assert.equal(result.organizations.reduce((sum, r) => sum + r.paid, 0), 4)
})

test('recent modified invoices and stale linked sales precede historical scan, without double counting', async () => {
  const reads = []
  const saved = []
  const result = await syncCerebroSales('offline', {
    crm: async (action, payload) => {
      if (action === 'sales_sync_cursor') return { page: 9, recheck_ids: ['100'],
        recent_page: 4, recent_since: '2026-09-01T00:00:00.000Z', recent_started_at: '2026-09-02T00:00:00.000Z' }
      if (action === 'save_sales_sync_cursor') saved.push(payload)
      return { linked: true, paid: true, settled: true }
    },
    consultar: async (org, path, filters) => {
      reads.push({ org, path, ...filters })
      return path === 'invoices'
        ? { invoices: [{ invoice_id: '100' }], page_context: { has_more_page: false } }
        : path.endsWith('/payments') ? { payments } : { invoice }
    },
  })
  assert.equal(result.ok, true)
  for (const org of result.organizations) {
    const calls = reads.filter(r => r.org === org.organization_id)
    assert.equal(calls[0].path, 'invoices/100')
    assert.equal(calls[2].last_modified_time, '2026-09-01T00:00:00+0000')
    assert.equal(calls[2].page, '4')
    assert.equal(calls[3].page, '9')
    assert.equal(org.documents, 1)
    assert.equal(org.settled, 1)
    assert.equal(org.with_email, 1)
    assert.equal(saved.find(s => s.organization_id === org.organization_id).cursor.recent_since, '2026-09-01T23:50:00.000Z')
  }
})

test('incomplete recent scan retains its window and resumes on the next page', async () => {
  const states = []
  await syncCerebroSales('offline', {
    crm: async (action, payload) => {
      if (action === 'sales_sync_cursor') return { page: 8, recent_page: 4,
        recent_since: '2026-09-01T00:00:00.000Z', recent_started_at: '2026-09-02T00:00:00.000Z' }
      if (action === 'save_sales_sync_cursor') states.push(payload.cursor)
      return {}
    },
    consultar: async (_org, path, filters) => ({
      invoices: [], page_context: { has_more_page: Boolean(filters.last_modified_time) },
    }),
  })
  assert.ok(states.every(s => s.recent_since === '2026-09-01T00:00:00.000Z'))
  assert.equal(states.filter(s => s.recent_page === 6).length, 8)
  assert.ok(states.some(s => s.page === 1))
})
