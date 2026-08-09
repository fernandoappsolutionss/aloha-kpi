import test from 'node:test'
import assert from 'node:assert/strict'

import { cargarDatosCuadroExportacion, grupoPedidoCongelado } from '../lib/cuadro-export.mjs'

test('un mes cerrado usa solo el snapshot y no consulta el cuadro vivo', async () => {
  let consultasVivas = 0
  const datos = { royalties: { filas: [] }, pedidos: [{ grupo_id: 7 }] }

  const result = await cargarDatosCuadroExportacion({
    estado: 'cerrado',
    snapshot: { datos },
    calcular: async () => {
      consultasVivas += 1
      return { royalties: { filas: [{ total: 99 }] } }
    },
  })

  assert.equal(consultasVivas, 0)
  assert.equal(result, datos)
})

test('un mes abierto calcula el cuadro vivo', async () => {
  const vivo = { royalties: { filas: [] } }
  assert.equal(await cargarDatosCuadroExportacion({
    estado: 'abierto',
    snapshot: null,
    calcular: async () => vivo,
  }), vivo)
})

test('un pedido cerrado resuelve el grupo desde datos congelados', () => {
  const control = {
    filas: [{ grupo: { id: 7, numero: 'A-7' } }],
  }

  assert.deepEqual(grupoPedidoCongelado({ grupo_id: 7 }, control), { id: 7, numero: 'A-7' })
  assert.deepEqual(grupoPedidoCongelado({ grupo_id: 8, grupoNumero: 'A-8' }, control), { id: 8, numero: 'A-8' })
})
