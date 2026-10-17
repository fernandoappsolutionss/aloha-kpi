import test from 'node:test'
import assert from 'node:assert/strict'
import { ORGS_ZOHO, clasificarFactura, contarVencidasHoy, listarFacturas } from '../lib/zoho-cobranza.mjs'
import { cobranzaDeclarada } from '../lib/marcadores.mjs'
import { cobranzaAlCorte } from '../lib/estadisticas-semana/calculo.mjs'
import { sincronizarCobranza } from '../lib/cobranza-sync.js'

const altavia = ORGS_ZOHO[1]
const factura = (more = {}) => ({ invoice_id: '1', invoice_number: 'INV-1', balance: 120, total: 120,
  due_date: '2026-10-16', status: 'overdue', reference_number: '', salesperson_name: 'Otros',
  line_items: [{ name: 'MENSUALIDAD PROGRAMA EDUCATIVO ALOHA BRISAS DEL GOLF' }], ...more })

test('regresión: recupera Brisas por artículo aunque no aparezca en otros campos', () => {
  const r = clasificarFactura(altavia, factura(), '2026-10-17')
  assert.equal(r.estado, 'incluida'); assert.equal(r.centroId, 1)
})
test('regresión: reposición FAC-001426 no cuenta con referencia vacía', () => {
  const r = clasificarFactura(ORGS_ZOHO[3], factura({ line_items: [{ name: 'Clase de Reposición Los Naranjos' }] }), '2026-10-17')
  assert.equal(r.estado, 'excluida')
})
test('no inventa mensualidad ni centro cuando el artículo es desconocido o ambiguo', () => {
  assert.equal(clasificarFactura(altavia, factura({ line_items: [{ name: 'Servicio desconocido' }] }), '2026-10-17').estado, 'revisar')
  assert.equal(clasificarFactura(altavia, factura({ line_items: [{ name: 'Mensualidad Anclas y Brisas' }] }), '2026-10-17').estado, 'revisar')
})
test('saldo y vencimiento actuales mandan; parcial mensual cuenta, mixto parcial exige revisión', () => {
  for (const more of [{ balance: 0 }, { status: 'void' }, { status: 'draft' }, { due_date: '2026-10-17' }])
    assert.equal(clasificarFactura(altavia, factura(more), '2026-10-17').estado, 'excluida')
  assert.equal(clasificarFactura(altavia, factura({ status: 'partially_paid', balance: 10 }), '2026-10-17').estado, 'incluida')
  assert.equal(clasificarFactura(altavia, factura({ balance: 10, line_items: [...factura().line_items, { name: 'Matrícula' }] }), '2026-10-17').estado, 'revisar')
})
test('consulta parciales y deduplica por organización/factura sin contar dos veces', async () => {
  const r = await contarVencidasHoy('test', { hoy: '2026-10-17',
    listar: async id => id === altavia.orgId ? [factura()] : [], detalle: async () => factura() })
  assert.equal(r.revisados, 1); assert.equal(r.porCentro[1], 1); assert.equal(r.completo, true)
})
test('una organización incompleta rechaza todo el conteo', async () => {
  await assert.rejects(contarVencidasHoy('test', { hoy: '2026-10-17',
    listar: async id => { if (id === altavia.orgId) throw new Error('incompleta'); return [] } }), /incompleta/)
})
test('regresión mensual: viernes cero confirmado cierra cero; blancos no se convierten en cero', () => {
  assert.equal(cobranzaDeclarada([{ cob_d1: 8, cob_d2: 5, cob_d3: 3, cob_d4: 2, cob_d5: 0 }]), 0)
  assert.equal(cobranzaDeclarada([{ cob_d1: 8, cob_d5: null }]), 8)
  assert.equal(cobranzaDeclarada([{ cob_d1: 0, cob_nullable: false }]), null)
  assert.equal(cobranzaDeclarada([{ cob_d1: 8, cob_d5: 0, cob_nullable: false }]), 8)
})
test('regresión semanal: un cero heredado no certifica una carga; diario cero sí y conserva su fecha', () => {
  const datos = { desde: '2026-10-16', hasta: '2026-10-22', hoy: '2026-10-17',
    filasKpi: [{ year: 2026, month: 10, semana: 3, cob_d5: 0, cob_nullable: false }] }
  assert.equal(cobranzaAlCorte(datos).valor, null)
  const r = cobranzaAlCorte({ ...datos, diaria: [{ fecha: '2026-10-16', vencidas: 0, registrado_at: '2026-10-17T00:00:00Z' }] })
  assert.equal(r.valor, 0); assert.equal(r.detalle.fecha, '2026-10-16'); assert.equal(r.detalle.anterior, true)
})
const conteo = { completo: true, porCentro: { 1: 0 }, pendientes: [], organizaciones: [] }
const opciones = (queries, overrides = {}) => ({ hoy: '2026-10-17', token: async () => 'test', contar: async () => conteo,
  transaction: async fn => fn(async (strings, ...values) => {
    const sql = strings.join('?'); queries.push({ sql, values })
    if (sql.includes('pg_try_advisory')) return [{ tomado: true }]
    if (sql.includes('SELECT estado')) return [{ estado: 'abierto' }]
    return []
  }), ...overrides })
test('sábado guarda conteo real diario y auditoría sin escribir viernes', async () => {
  const queries = []; const r = await sincronizarCobranza(opciones(queries))
  assert.equal(r.guardado, true)
  assert.equal(queries.filter(q => q.sql.includes('INSERT INTO cobranza_diaria')).length, 1)
  assert.equal(queries.filter(q => q.sql.includes('kpi_semanas')).length, 0)
})
test('ambigüedad persiste informe pero no escribe cifras parciales', async () => {
  const queries = []; const r = await sincronizarCobranza(opciones(queries, { contar: async () => ({ ...conteo, completo: false }) }))
  assert.equal(r.guardado, false)
  assert.equal(queries.some(q => q.sql.includes('INSERT INTO cobranza_diaria')), false)
  assert.equal(queries.some(q => q.sql.includes('INSERT INTO cobranza_conciliaciones')), true)
})
test('fallo al guardar el diario aborta antes de actualizar las casillas', async () => {
  await assert.rejects(sincronizarCobranza(opciones([], { hoy: '2026-10-19', transaction: fn => fn(async strings => {
    const sql = strings.join('?')
    if (sql.includes('pg_try_advisory')) return [{ tomado: true }]
    if (sql.includes('INSERT INTO cobranza_diaria')) throw new Error('DB caída')
    throw new Error('No debe seguir')
  }) })), /DB caída/)
})


test('seguro entre empresas no se confunde con mensualidad del centro', () => {
  const r = clasificarFactura(ORGS_ZOHO[0], factura({ line_items: [{ name: 'Afiliación Seguro de accidente opción 1  y 2 Centros Externos' }] }), '2026-10-17')
  assert.equal(r.estado, 'excluida')
})
test('paginación incompleta no puede producir un conteo certificado', async () => {
  await assert.rejects(listarFacturas('org', {}, 'test', async () => ({ invoices: [] })), /paginación sin confirmar/)
  const llamadas = []
  const r = await listarFacturas('org', {}, 'test', async (_org, _path, filtros) => {
    llamadas.push(filtros.page)
    return { invoices: [{ invoice_id: filtros.page }], page_context: { has_more_page: filtros.page === '1' } }
  })
  assert.deepEqual(llamadas, ['1', '2']); assert.equal(r.length, 2)
})
test('una respuesta sin saldo no se transforma silenciosamente en cero', async () => {
  await assert.rejects(contarVencidasHoy('test', { hoy: '2026-10-17',
    listar: async () => [factura({ balance: undefined })] }), /saldo o vencimiento sin confirmar/)
})
