import test from 'node:test'
import assert from 'node:assert/strict'
import { insertarImportacion } from '../lib/caja/persistencia.mjs'

function queryFalso(respuestas) {
  const llamadas = []
  const query = async (strings, ...values) => { llamadas.push({ sql: strings.join('?'), values }); return respuestas.shift() || [] }
  return { query, llamadas }
}

test('inserta importación y movimientos en lote; cuenta nuevos y duplicados', async () => {
  const { query, llamadas } = queryFalso([[{ id: 7 }], [{ id: 1 }, { id: 2 }], []])
  const r = await insertarImportacion(query, {
    cuentaId: 3, archivo: 'x.ofx', formato: 'ofx', usuarioId: 9,
    saldo: { monto: 10, fecha: '2026-09-24' },
    movimientos: [
      { fecha: '2026-09-01', monto: 5, memo: 'a', fitid: '1', clase: 'ingreso', categoria: 'Yappy', regla_id: 4 },
      { fecha: '2026-09-02', monto: -5, memo: 'b', fitid: '2', clase: 'por_clasificar', categoria: 'Por clasificar', regla_id: null },
      { fecha: '2026-09-03', monto: 1, memo: 'c', fitid: '3', clase: 'ingreso', categoria: 'Yappy', regla_id: 4 },
    ],
  })
  assert.deepEqual(r, { importacionId: 7, nuevos: 2, duplicados: 1 })
  assert.match(llamadas[1].sql, /ON CONFLICT \(cuenta_id, fitid\) DO NOTHING/)
  // values: [cuentaId, importacionId, fechas, montos, …]
  assert.deepEqual(llamadas[1].values[2], ['2026-09-01', '2026-09-02', '2026-09-03'])
  assert.match(llamadas[2].sql, /UPDATE caja_importaciones/)
})

test('saldo incompleto (monto sin fecha) se guarda como NULL en ambos campos', async () => {
  const { query, llamadas } = queryFalso([[{ id: 1 }], [], []])
  await insertarImportacion(query, {
    cuentaId: 3, archivo: 'x.pdf', formato: 'pdf_stgeorges',
    saldo: { monto: 10, fecha: null },
    movimientos: [],
  })
  // values de la importación: [cuentaId, archivo, formato, desde, hasta, saldo_banco, saldo_banco_fecha, usuario_id]
  assert.deepEqual(llamadas[0].values.slice(3), [null, null, null, null, null])
})
