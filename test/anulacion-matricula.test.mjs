import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluarAnulacionMatricula, validarSolicitudAnulacion, periodosAnulacionMatricula, eventosSinMatriculasAnuladas } from '../lib/anulacion-matricula.mjs'
import { iniciosClase, retirosActivosMes, estudiantesConInicioAlCierre } from '../lib/inicios-clase.mjs'
import { estadoAsOfMes, cuadroDeserciones, cuadroControlGrupos, cuadroRoyalties } from '../lib/cuadro-calc.js'
import { calcularKpiSemanalAuto } from '../lib/kpi-semanal-auto.mjs'

const grupo = { id: 12, estado: 'activo', numero: '12', itinerario: 'TINY', fecha_inicio_clases: '2026-09-20' }
const estudiante = { id: 1, centro_id: 3, grupo_id: 12, nombre: 'Matrícula de prueba', itinerario: 'TINY', nivel: 1, estado: 'activo', fecha_inscripcion: '2026-08-20', fecha_inicio_nivel: '2026-09-20' }
const inscripcion = { id: 1, estudiante_id: 1, tipo: 'inscripcion', fecha: '2026-08-20', year: 2026, month: 8, a_grupo_id: 12, origen: 'directo' }
const retiro = { id: 2, estudiante_id: 1, tipo: 'retiro', fecha: '2026-08-25', year: 2026, month: 8, de_grupo_id: 12, motivo: 'ECONOMICO' }
const evaluar = (extra = {}) => evaluarAnulacionMatricula({ estudiante, grupo, eventos: [inscripcion], fecha: '2026-09-12', ...extra })

test('Anulación antes del inicio y reclasificación de retiro erróneo sin asistencia', () => {
  assert.equal(evaluar().fechaInicio, '2026-09-20')
  const evaluacion = evaluar({ estudiante: { ...estudiante, estado: 'retirado' }, eventos: [inscripcion, retiro] })
  assert.equal(evaluacion.error, undefined)
  assert.deepEqual(evaluacion.retiros, [retiro])
})

test('No basta con no haber marcado asistencia: inicio, presencia histórica y traslados bloquean anular', () => {
  assert.match(evaluar({ fecha: '2026-09-20' }).error, /inicio de clases/)
  assert.match(evaluar({ ultimaPresencia: '2026-08-01' }).error, /asistencia presente/)
  assert.match(evaluar({ estudiante: { ...estudiante, ultima_asistencia: '2026-08-01' } }).error, /asistencia presente/)
  for (const tipo of ['reincorporacion', 'cambio_nivel', 'fusion']) {
    assert.match(evaluar({ eventos: [inscripcion, { tipo }] }).error, /revisión histórica/)
  }
  assert.match(evaluar({ eventos: [inscripcion, { tipo: 'cambio_grupo', de_grupo_id: 8 }] }).error, /revisión histórica/)
  assert.match(evaluar({ grupo: { ...grupo, fecha_inicio_clases: null } }).error, /fecha de inicio confiable/)
  assert.match(evaluar({ estudiante: { ...estudiante, fecha_inicio_nivel: '2026-08-01' } }).error, /inicio de clases/)
  assert.match(evaluar({ estudiante: { ...estudiante, grupo_id: null, fecha_inicio_nivel: '2026-08-01' }, eventos: [] }).error, /inicio de clases/)
  assert.match(evaluar({ estudiante: { ...estudiante, grupo_id: null, nivel: 2 }, eventos: [] }).error, /revisión histórica/)
})

test('Solicitud valida fecha civil, fecha no futura, motivo y orden respecto a matrícula', () => {
  assert.match(validarSolicitudAnulacion({ fecha: '2026-02-30', motivo: 'Devolución', hoy: '2026-09-12' }), /fecha válida/)
  assert.match(validarSolicitudAnulacion({ fecha: '2026-09-13', motivo: 'Devolución', hoy: '2026-09-12' }), /futura/)
  assert.match(validarSolicitudAnulacion({ fecha: '2026-09-12', motivo: ' ', hoy: '2026-09-12' }), /motivo/)
  assert.match(validarSolicitudAnulacion({ fecha: {}, motivo: 'Devolución', hoy: '2026-09-12' }), /fecha válida/)
  assert.match(validarSolicitudAnulacion({ fecha: '2026-09-12', motivo: {}, hoy: '2026-09-12' }), /motivo/)
  assert.match(validarSolicitudAnulacion({ fecha: '2026-09-12', motivo: 'a'.repeat(1001), hoy: '2026-09-12' }), /1000/)
  assert.match(evaluar({ fecha: '2026-08-19' }).error, /anterior/)
})

test('Protege periodo original de venta, retiro y futuro inicio, incluso periodos discordantes', () => {
  const periodos = periodosAnulacionMatricula({ estudiante, grupo, eventos: [inscripcion, { ...retiro, month: 7 }], fecha: '2026-09-12', hoy: '2026-09-12' })
  assert.deepEqual(periodos, [{ year: 2026, month: 7 }, { year: 2026, month: 8 }, { year: 2026, month: 9 }])
})

test('Anulada conserva inscripción/retiro pero desaparece de ventas, nuevos activos, deserción y royalties', () => {
  const anulada = { ...estudiante, estado: 'matricula_anulada' }
  const estudiantes = [anulada]
  const eventos = [inscripcion, retiro]
  const ventas = eventosSinMatriculasAnuladas(estudiantes, eventos).filter((e) => e.tipo === 'inscripcion')
  assert.equal(calcularKpiSemanalAuto({ year: 2026, month: 8, inscripciones: ventas }).ingTotal, 0)
  assert.deepEqual(iniciosClase(estudiantes, [grupo], eventos), [])
  assert.deepEqual(retirosActivosMes(estudiantes, [grupo], eventos, 2026, 8), [])
  assert.deepEqual(estudiantesConInicioAlCierre(estudiantes, [grupo], eventos, 2026, 9), [])
  assert.deepEqual(cuadroDeserciones(estudiantes, eventos, [grupo]), [])
  assert.equal(cuadroControlGrupos([grupo], estudiantes, eventos).totales.aPagar, 0)
  assert.equal(cuadroRoyalties(estudiantes, eventos, 12).totales.totalRoyalty, 0)
  assert.equal(estadoAsOfMes(anulada, eventos, 2026, 7), null)
  assert.equal(estadoAsOfMes(anulada, eventos, 2026, 8), null)
  assert.equal(eventos.length, 2, 'El cálculo no borra evidencia')
})

test('Un retiro real sigue contando la venta y deserción', () => {
  const iniciado = { ...grupo, fecha_inicio_clases: '2026-08-21' }
  const retirado = { ...estudiante, estado: 'retirado' }
  const eventos = [inscripcion, retiro]
  const ventas = eventosSinMatriculasAnuladas([retirado], eventos).filter((e) => e.tipo === 'inscripcion')
  assert.equal(calcularKpiSemanalAuto({ year: 2026, month: 8, inscripciones: ventas }).ingTotal, 1)
  assert.equal(retirosActivosMes([retirado], [iniciado], eventos, 2026, 8).length, 1)
})
