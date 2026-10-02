import { test } from 'node:test'
import assert from 'node:assert/strict'
import { proponerCuota, ritmoCuota, cuotaCumplida, prepararCuotas, porcentajeCuotasCumplidas, ordenarReunion, periodosCentro } from '../lib/cuotas-semana.mjs'
import { ESTADISTICAS_CENTRO } from '../lib/estadisticas-semana/catalogo.mjs'

const metas = { nuevos: 20, desercion: 8, cobranza: 1 }

test('propone superar la última semana respetando pisos y techos trimestrales', () => {
  assert.equal(proponerCuota({ codigo: 'nuevos_inscritos', ultimo: 3, metas }), 5)
  assert.equal(proponerCuota({ codigo: 'nuevos_inscritos', ultimo: 7, metas }), 8)
  assert.equal(proponerCuota({ codigo: 'ninos_activos', ultimo: 180, metas }), 181)
  assert.equal(proponerCuota({ codigo: 'cp_asistidas', ultimo: 6, metas }), 7)
  assert.equal(proponerCuota({ codigo: 'retiros', ultimo: 4, ninosActivos: 200, metas }), 3)
  assert.equal(proponerCuota({ codigo: 'retiros', ultimo: 2, ninosActivos: 200, metas }), 1)
  assert.equal(proponerCuota({ codigo: 'retiros', ultimo: 0, ninosActivos: 200, metas }), 0)
  assert.equal(proponerCuota({ codigo: 'facturas_vencidas', ultimo: 5, metas }), 1)
  assert.equal(proponerCuota({ codigo: 'nuevos_inscritos', ultimo: null, metas }), null)
})

test('el ritmo de flujos cuenta viernes como día 1 y jueves como día 7', () => {
  assert.deepEqual(ritmoCuota({ cuota: 7, valor: 2, dia: 3, inversa: false }), { esperado: 3, vaBien: false })
  assert.deepEqual(ritmoCuota({ cuota: 7, valor: 4, dia: 3, inversa: false }), { esperado: 3, vaBien: true })
  assert.deepEqual(ritmoCuota({ cuota: 7, valor: 2, dia: 3, inversa: true }), { esperado: 3, vaBien: true })
  assert.equal(ritmoCuota({ cuota: null, valor: 2, dia: 3 }), null)
  assert.equal(ritmoCuota({ cuota: 7, valor: null, dia: 3 }), null)
})

test('la cuota cumplida respeta la dirección y los datos ausentes', () => {
  assert.equal(cuotaCumplida({ valor: 5, cuota: 5, inversa: false }), true)
  assert.equal(cuotaCumplida({ valor: 4, cuota: 5, inversa: false }), false)
  assert.equal(cuotaCumplida({ valor: 1, cuota: 1, inversa: true }), true)
  assert.equal(cuotaCumplida({ valor: 2, cuota: 1, inversa: true }), false)
  assert.equal(cuotaCumplida({ valor: null, cuota: 1, inversa: true }), null)
})

test('presenta propuesta, ritmo de flujo y marcas históricas sin convertir ausencias en cero', () => {
  const series = {
    nuevos_inscritos: [
      { semanaFin: '2026-09-24', valor: 3, estado: 'cerrada' },
      { semanaFin: '2026-10-01', valor: 2, estado: 'abierta' },
    ],
  }
  const resumen = { nuevos_inscritos: { cerrada: 3, abierta: 2 } }
  const filasCuotas = [
    { codigo: 'nuevos_inscritos', semana_fin: '2026-09-24', cuota: '4', estado: 'aprobada' },
    { codigo: 'nuevos_inscritos', semana_fin: '2026-10-01', cuota: '7', estado: 'propuesta' },
  ]
  const result = prepararCuotas({ catalogo: ESTADISTICAS_CENTRO, series, resumen, filasCuotas, metas, semanaAbierta: '2026-10-01', hoy: '2026-09-27' })
  assert.equal(result.series.nuevos_inscritos[0].cuota, 4)
  assert.equal(result.series.nuevos_inscritos[1].cuota, 7)
  assert.deepEqual(result.cuotas.nuevos_inscritos, { cuota: 7, propuesta: 5, estado: 'propuesta', ritmo: { esperado: 3, vaBien: false } })
  assert.deepEqual(result.cuotas.ninos_activos, { cuota: null, propuesta: null, estado: null, ritmo: null })
})

test('una propuesta automática visible da ritmo aunque todavía no esté guardada', () => {
  const result = prepararCuotas({
    catalogo: ESTADISTICAS_CENTRO.filter((meta) => meta.codigo === 'nuevos_inscritos'),
    series: { nuevos_inscritos: [{ semanaFin: '2026-10-01', valor: 1, estado: 'abierta' }] },
    resumen: { nuevos_inscritos: { cerrada: 3, abierta: 1 }, ninos_activos: { cerrada: 200 } },
    filasCuotas: [], metas, semanaAbierta: '2026-10-01', hoy: '2026-09-27',
  })
  assert.deepEqual(result.cuotas.nuevos_inscritos, { cuota: null, propuesta: 5, estado: 'propuesta', ritmo: { esperado: 2, vaBien: false } })
})

test('porcentaje exige todas las cuotas aprobadas y fotos cerradas del catálogo', () => {
  const series = {
    nuevos_inscritos: [{ semanaFin: '2026-09-24', estado: 'cerrada', valor: 5 }],
    retiros: [{ semanaFin: '2026-09-24', estado: 'cerrada', valor: 2 }],
    cp_asistidas: [{ semanaFin: '2026-09-24', estado: 'cerrada', valor: null }],
  }
  const filasCuotas = [
    { codigo: 'nuevos_inscritos', semana_fin: '2026-09-24', cuota: 5, estado: 'aprobada' },
    { codigo: 'retiros', semana_fin: '2026-09-24', cuota: 1, estado: 'aprobada' },
    { codigo: 'cp_asistidas', semana_fin: '2026-09-24', cuota: 3, estado: 'aprobada' },
    { codigo: 'ninos_activos', semana_fin: '2026-09-24', cuota: 100, estado: 'propuesta' },
  ]
  assert.equal(porcentajeCuotasCumplidas({ catalogo: ESTADISTICAS_CENTRO, series, filasCuotas, semanaFin: '2026-09-24' }), null)
  assert.equal(porcentajeCuotasCumplidas({ catalogo: ESTADISTICAS_CENTRO.filter(m => ['nuevos_inscritos', 'retiros'].includes(m.codigo)), series, filasCuotas, semanaFin: '2026-09-24' }), 50)
  assert.equal(porcentajeCuotasCumplidas({ catalogo: ESTADISTICAS_CENTRO, series, filasCuotas: [], semanaFin: '2026-09-24' }), null)
})

test('reunión ordena por cambio de la última semana cerrada y deja sin dato al final', () => {
  const centros = [
    { id: 1, ultimaCerrada: '2026-09-24', serie: [{ semanaFin: '2026-09-17', estado: 'cerrada', valor: 10 }, { semanaFin: '2026-09-24', estado: 'cerrada', valor: 8 }, { semanaFin: '2026-10-01', estado: 'abierta', valor: 99 }] },
    { id: 2, ultimaCerrada: '2026-09-24', serie: [{ semanaFin: '2026-09-17', estado: 'cerrada', valor: 10 }, { semanaFin: '2026-09-24', estado: 'cerrada', valor: 14 }, { semanaFin: '2026-10-01', estado: 'abierta', valor: 1 }] },
    { id: 3, ultimaCerrada: '2026-09-24', serie: [{ semanaFin: '2026-09-17', estado: 'cerrada', valor: 4 }, { semanaFin: '2026-09-24', estado: null, valor: null }] },
  ]
  assert.deepEqual(ordenarReunion(centros).map((c) => [c.id, c.deltaCerrada]), [[2, 4], [1, -2], [3, null]])
})

test('reunión no usa crecimiento antiguo cuando falta la foto recién cerrada', () => {
  const centro = { id: 7, ultimaCerrada: '2026-09-24', serie: [
    { semanaFin: '2026-09-10', estado: 'cerrada', valor: 10 },
    { semanaFin: '2026-09-17', estado: 'cerrada', valor: 20 },
    { semanaFin: '2026-09-24', estado: null, valor: null },
  ] }
  assert.equal(ordenarReunion([centro])[0].deltaCerrada, null)
})

test('cada centro usa su fecha civil al cambiar de semana', () => {
  const periodos = periodosCentro([{ id: 10, pais: 'VE' }, { id: 7, pais: 'PA' }], new Date('2026-10-02T04:30:00Z'))
  assert.equal(periodos[10].semanaAbierta, '2026-10-08')
  assert.equal(periodos[10].ultimaCerrada, '2026-10-01')
  assert.equal(periodos[7].semanaAbierta, '2026-10-01')
  assert.equal(periodos[7].ultimaCerrada, '2026-09-24')
})
