import test from 'node:test'
import assert from 'node:assert/strict'
import { decisionEmail } from '../lib/peticion-notificaciones.mjs'

const basePeticion = {
  id: 4,
  centro_id: 10,
  categoria: 'reparacion',
  texto: 'Arreglar el aire acondicionado del salón 2',
  updated_at: '2026-08-22T15:00:00Z',
}
const actor = { id: 1, nombre: 'Gerencia General', email: 'g@aloha.com', rol: 'admin_general' }
const cotizacion = {
  id: 91,
  proveedor_razon_social: 'Frío Total S.A.',
  proveedor_pais: 'PA',
  archivo_nombre: 'oferta-frio-total.pdf',
}

test('correo de aprobación incluye centro, categoría, texto, proveedor ganador y enlace', () => {
  const { subject, html } = decisionEmail({
    peticion: basePeticion,
    estado: 'Aprobado',
    actor,
    cotizacionAprobada: cotizacion,
    centroNombre: 'Costa del Este',
    baseUrl: 'https://aloha-kpi.vercel.app',
  })
  assert.match(subject, /Costa del Este/)
  assert.match(subject, /aprobada/i)
  assert.match(html, /Reparación/)
  assert.match(html, /Arreglar el aire acondicionado del salón 2/)
  assert.match(html, /Frío Total S\.A\./)
  assert.match(html, /oferta-frio-total\.pdf/)
  assert.match(html, /Gerencia General/)
  assert.match(html, /\/centro\/10\/foda/)
  assert.doesNotMatch(html, /blob/i)
})

test('correo de negación no menciona proveedor ganador pero conserva centro y enlace', () => {
  const { subject, html } = decisionEmail({
    peticion: basePeticion,
    estado: 'Negado',
    actor,
    cotizacionAprobada: null,
    centroNombre: 'Costa del Este',
    baseUrl: 'https://aloha-kpi.vercel.app',
  })
  assert.match(subject, /Costa del Este/)
  assert.match(subject, /negada/i)
  assert.match(html, /Reparación/)
  assert.match(html, /Arreglar el aire acondicionado del salón 2/)
  assert.doesNotMatch(html, /Frío Total S\.A\./)
  assert.doesNotMatch(html, /oferta-frio-total\.pdf/)
  assert.match(html, /\/centro\/10\/foda/)
  assert.doesNotMatch(html, /blob/i)
})

test('categoría desconocida cae al código crudo sin romper', () => {
  const { html } = decisionEmail({
    peticion: { ...basePeticion, categoria: 'otra_cosa' },
    estado: 'Negado',
    actor,
    cotizacionAprobada: null,
    centroNombre: 'Costa del Este',
    baseUrl: 'https://aloha-kpi.vercel.app',
  })
  assert.match(html, /otra_cosa/)
})
