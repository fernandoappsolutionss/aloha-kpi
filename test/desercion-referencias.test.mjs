import test from 'node:test'
import assert from 'node:assert/strict'
import { alertasDeCoach } from '../lib/desercion-coach.mjs'
import { referenciaCentro, referenciaGlobal, diferenciaPuntos } from '../lib/desercion-referencias.mjs'
import { consultarDesercionComparada } from '../lib/desercion-comparada.mjs'

const centro = (id, n, bajas, sinCoach = 0) => ({ id, nombre: `Centro ${id}`,
  resultado: alertasDeCoach([{ coach_id: 1, nombre: 'Coach', expuestos: n, bajas_reales: bajas }], { sinCoach }) })

test('global ponderada suma niños y bajas, no promedia tasas', () => {
  const global = referenciaGlobal([centro(1, 10, 5), centro(2, 90, 9), centro(3, 100, 10), centro(4, 200, 16)])
  assert.equal(global.bajasReales, 40)
  assert.equal(global.expuestos, 400)
  assert.equal(global.tasa, 0.1)
  assert.equal(global.centros.length, 4)
})

test('las bajas sin coach entran en ambas referencias sin atribuirlas a un coach', () => {
  const c = centro(1, 90, 9, 10)
  assert.equal(referenciaCentro(c.resultado).tasa, 19 / 100)
  assert.equal(referenciaGlobal([c]).tasa, 19 / 100)
  assert.equal(c.resultado.coaches[0].bajasReales, 9)
})

test('no duplica centros ni representa ausencia de base como cero por ciento', () => {
  const c = centro(1, 10, 0)
  const r = referenciaGlobal([c, c, centro(2, 0, 0)])
  assert.equal(r.expuestos, 10)
  assert.equal(r.tasa, 0)
  assert.equal(r.centrosConBase, 1)
  assert.equal(referenciaGlobal([]).tasa, null)
  assert.equal(diferenciaPuntos({ expuestos: 0, bajasReales: 0 }, r), null)
  assert.equal(diferenciaPuntos({ expuestos: 10, bajasReales: 1 }, { tasa: null }), null)
})

test('las brechas usan tasas sin redondear y se expresan en puntos porcentuales', () => {
  const c = { expuestos: 44, bajasReales: 12 }
  assert.ok(Math.abs(diferenciaPuntos(c, { tasa: 0.1 }) - 17.27272727) < 0.000001)
  assert.equal(diferenciaPuntos({ expuestos: 100, bajasReales: 5 }, { tasa: 0.1 }), -5)
})

test('graduados permanecen fuera de bajas y dentro de la base de exposición', () => {
  const resultado = alertasDeCoach([{ coach_id: 1, expuestos: 100, bajas_reales: 4, graduados: 6 }])
  assert.equal(referenciaCentro(resultado).tasa, 0.04)
  assert.equal(referenciaCentro(resultado).graduados, 6)
})

test('consulta todos los centros con la misma ventana y no entrega coaches ajenos', async () => {
  const llamadas = []
  const sql = async (strings, ...values) => {
    const texto = strings.join('?')
    llamadas.push({ texto, values })
    if (texto.includes('SELECT id, nombre FROM centros')) return [{ id: 2, nombre: 'Local' }, { id: 9, nombre: 'Otra sede' }]
    if (texto.includes('WITH activos_centros')) return [{ id: 2, activos: 90, bajas: 10, graduados: 0 }, { id: 9, activos: 80, bajas: 20, graduados: 0 }]
    if (texto.includes('WITH salidas')) return [{ coach_id: values[0] === 2 ? 21 : 91,
      nombre: values[0] === 2 ? 'Coach propio' : 'Nombre privado de otra sede', expuestos: 100, bajas_reales: values[0] === 2 ? 10 : 20 }]
    return [{ bajas_sin_coach: 0 }]
  }
  const r = await consultarDesercionComparada(sql, { centroId: 2, anio: 2026, trimestre: 3 })
  assert.equal(r.referenciaCentro.tasa, 0.1)
  assert.equal(r.referenciaGlobal.tasa, 0.15)
  assert.equal(r.referenciaGlobal.centros.length, 2)
  assert.equal(r.coaches.length, 1)
  assert.equal(r.coaches[0].coachId, 21)
  assert.ok(!JSON.stringify(r).includes('Nombre privado'))
  assert.equal(llamadas.length, 4)
  assert.equal(llamadas[2].values[0], 2)
  for (const llamada of llamadas.slice(1)) assert.ok(llamada.values.includes(2026) && llamada.values.includes(7) && llamada.values.includes(9))
})

test('una consulta fallida no publica una referencia global parcial', async () => {
  const sql = async (strings, ...values) => {
    if (strings.join('').includes('SELECT id, nombre FROM centros')) return [{ id: 1 }, { id: 2 }]
    if (strings.join('').includes('WITH activos_centros')) throw new Error('Sin conexión')
    return []
  }
  await assert.rejects(consultarDesercionComparada(sql, { centroId: 1, anio: 2026, trimestre: 3 }), /Sin conexión/)
})

test('el centro incluye activos y graduados sin coach y usa esa misma base en sus alertas', () => {
  const resultado = alertasDeCoach([{ coach_id: 1, nombre: 'Coach', expuestos: 40, bajas_reales: 8 }],
    { baseCentro: { bajasReales: 10, expuestos: 100, graduados: 5 } })
  assert.equal(referenciaCentro(resultado).tasa, 0.1)
  assert.equal(referenciaGlobal([{ id: 1, resultado }]).tasa, 0.1)
  assert.equal(resultado.pctCentro, 10)
  assert.equal(resultado.coaches[0].exceso, 4)
  assert.equal(resultado.coaches[0].bajasReales, 8)
})
