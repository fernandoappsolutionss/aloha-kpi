import test from 'node:test'
import assert from 'node:assert/strict'
import * as cuotas from '../lib/cuotas-semana.mjs'
import * as plan from '../lib/plan-semana.mjs'
import { ESTADISTICAS_CENTRO as catalogo } from '../lib/estadisticas-semana/catalogo.mjs'

const compromiso = { periodo: '2026-10', diagnostico: 'Revisar recuperación y sostener captación con evidencia.', metas: { ninos_activos: 170, nuevos_inscritos: 20, retiros: 4, facturas_vencidas: 1, cp_asistidas: 40 } }
const series = Object.fromEntries(catalogo.map((m, i) => [m.codigo, [{ semanaFin: '2026-10-01', estado: 'cerrada', valor: [150, 4, 1, 9, 8][i] }]]))
const objetivo = { seccion: 'formula', paso: 0, texto: 'Llamar familias', responsable: 'Ana', fecha: '2026-10-07', evidencia_esperada: 'Lista de llamadas con acuerdos.' }

test('refrescar otro panel conserva cuotas editadas y actualiza solo campos intactos', () => {
  const recibidas = { ninos_activos: { cuota: 155 }, nuevos_inscritos: { propuesta: 5 } }
  assert.deepEqual(cuotas.actualizarBorradorCuotas(catalogo.slice(0, 2), recibidas, { ninos_activos: '158', nuevos_inscritos: '4' }, new Set(['ninos_activos'])), { ninos_activos: '158', nuevos_inscritos: 5 })
  assert.equal(cuotas.actualizarBorradorCuotas(catalogo, recibidas, { ninos_activos: '158' }, new Set()).ninos_activos, 155)
})

test('compromiso mensual exige cinco enteros y diagnóstico, sin aceptar blancos, booleanos o fechas imposibles', () => {
  assert.equal(typeof cuotas.validarCompromiso, 'function')
  assert.deepEqual(cuotas.validarCompromiso(compromiso), compromiso)
  for (const metas of [{ ...compromiso.metas, retiros: '' }, { ...compromiso.metas, retiros: true }, { ...compromiso.metas, nuevos_inscritos: -1 }, { ninos_activos: 170 }]) assert.throws(() => cuotas.validarCompromiso({ ...compromiso, metas }), /meta/i)
  assert.throws(() => cuotas.validarCompromiso({ ...compromiso, periodo: '2026-13' }), /mes/i)
  assert.throws(() => cuotas.validarCompromiso({ ...compromiso, diagnostico: ' ' }), /diagnóstico/i)
})

test('reparte saldo restante y flujos pendientes de los cierres del mes, con dirección inversa', () => {
  assert.equal(typeof cuotas.propuestaDesdeCompromiso, 'function')
  const propuesta = codigo => cuotas.propuestaDesdeCompromiso({ codigo, compromiso, series, semanaFin: '2026-10-08' }).valor
  assert.equal(propuesta('ninos_activos'), 155) // (170 - 150) / 4 cierres
  assert.equal(propuesta('nuevos_inscritos'), 4) // (20 - 4) / 4
  assert.equal(propuesta('retiros'), 0) // piso del máximo restante (4 - 1) / 4
  assert.equal(propuesta('facturas_vencidas'), 7) // 9 → 1, cuatro cierres
  assert.equal(propuesta('cp_asistidas'), 8)
  assert.deepEqual(cuotas.cierresDelMes('2026-12'), ['2026-12-03','2026-12-10','2026-12-17','2026-12-24','2026-12-31'])
  assert.deepEqual(cuotas.cierresDelMes('2027-02'), ['2027-02-04','2027-02-11','2027-02-18','2027-02-25'])
})

test('no inventa faltantes, no mezcla el mes anterior, y conserva una cuota aprobada', () => {
  assert.equal(typeof cuotas.propuestaDesdeCompromiso, 'function')
  const obtener = (codigo, cambios = {}) => cuotas.propuestaDesdeCompromiso({ codigo, compromiso, series, semanaFin: '2026-10-08', ...cambios })
  assert.equal(obtener('nuevos_inscritos', { series: { nuevos_inscritos: [] } }).valor, null)
  assert.equal(obtener('nuevos_inscritos', { semanaFin: '2026-11-05' }), null)
  assert.equal(obtener('ninos_activos', { semanaFin: '2026-10-29', series: { ninos_activos: [{ semanaFin: '2026-10-22', estado: 'cerrada', valor: 168 }] } }).valor, 170)
  assert.equal(obtener('retiros', { series: { retiros: [{ semanaFin:'2026-10-01', estado:'cerrada', valor:6 }] } }).valor, 0)
  const vista = cuotas.prepararCuotas({ catalogo, compromiso, series, resumen: Object.fromEntries(catalogo.map((m,i)=>[m.codigo,{cerrada:[150,4,1,9,8][i]}])), filasCuotas:[{codigo:'ninos_activos',semana_fin:'2026-10-08',cuota:158,estado:'aprobada'}], metas:{nuevos:20,desercion:8,cobranza:1}, semanaAbierta:'2026-10-08', hoy:'2026-10-02' })
  assert.equal(vista.cuotas.ninos_activos.cuota, 158)
  assert.equal(vista.cuotas.ninos_activos.estado, 'aprobada')
  assert.equal(vista.cuotas.ninos_activos.propuesta, 155)
  assert.match(vista.cuotas.ninos_activos.explicacion, /170/)
})

test('plan preparado requiere objetivos completos y distingue ejecución de verificación', () => {
  const objetivos = Array.from({ length: 4 }, (_, paso) => ({ ...objetivo, paso }))
  assert.equal(plan.estadoPlan({ condicion:'normal', fundamento:'Serie 140, 142, 144: crecimiento sostenido.', objetivos }), 'completo')
  assert.equal(plan.estadoPlan({ condicion:'normal', objetivos: objetivos.map(o=>({...o,responsable:null})) }), 'incompleto')
  assert.equal(typeof plan.ejecucionPlan, 'function')
  assert.deepEqual(plan.ejecucionPlan([{...objetivo, hecho:true, evidencia_resultado:'Cuatro acuerdos'}, {...objetivo, hecho:true, evidencia_resultado:'Lista revisada', verificado_at:'2026-10-02'}]), { total:2, realizadas:2, verificadas:1 })
  assert.equal(typeof plan.validarObjetivo, 'function')
  assert.throws(()=>plan.validarObjetivo({...objetivo,fecha:'2026-02-30'}), /Fecha/)
  assert.throws(()=>plan.validarObjetivo({...objetivo,evidencia_esperada:''}), /evidencia/i)
})
