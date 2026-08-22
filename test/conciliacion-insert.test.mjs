import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// El repositorio importa './db' sin extensión (lo resuelve el bundler de
// Next, no Node), así que para probar el constructor de SQL se carga el
// módulo aislando esa dependencia: se evalúa solo la función pura.
const fuente = readFileSync(new URL('../lib/conciliacion-repository.js', import.meta.url), 'utf8')
const cuerpo = fuente
  .replace(/^import .*$/m, '')
  .match(/export function construirInsertMovimientos[\s\S]*?\n}\n/)[0]
  .replace('export function', 'function')
const construirInsertMovimientos = new Function(`${cuerpo}; return construirInsertMovimientos`)()

// Reconstruye la sentencia igual que lo hace el tagged template de lib/db.js.
function armar(partes, valores) {
  let texto = partes[0]
  for (let i = 0; i < valores.length; i++) texto += `$${i + 1}${partes[i + 1]}`
  return texto
}

const COLS = ['a', 'b', 'c']

test('una sola fila produce una lista de valores bien cerrada', () => {
  const { partes, valores } = construirInsertMovimientos([{ a: 1, b: 2, c: 3 }], COLS)
  assert.deepEqual(valores, [1, 2, 3])
  assert.equal(armar(partes, valores), 'INSERT INTO conciliacion_movimientos (a, b, c) VALUES ($1, $2, $3)')
})

test('varias filas se separan con "), (" y no con coma suelta', () => {
  const { partes, valores } = construirInsertMovimientos([{ a: 1, b: 2, c: 3 }, { a: 4, b: 5, c: 6 }], COLS)
  assert.equal(
    armar(partes, valores),
    'INSERT INTO conciliacion_movimientos (a, b, c) VALUES ($1, $2, $3), ($4, $5, $6)',
  )
})

test('las columnas ausentes viajan como NULL, no como undefined', () => {
  const { valores } = construirInsertMovimientos([{ a: 1 }], COLS)
  assert.deepEqual(valores, [1, null, null])
})

// La invariante del tagged template: un trozo de texto más que valores.
test('partes tiene siempre un elemento más que valores', () => {
  for (const n of [1, 2, 7, 200]) {
    const filas = Array.from({ length: n }, (_, i) => ({ a: i, b: i, c: i }))
    const { partes, valores } = construirInsertMovimientos(filas, COLS)
    assert.equal(partes.length, valores.length + 1)
    assert.equal(valores.length, n * COLS.length)
  }
})
