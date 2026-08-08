import test from 'node:test'
import assert from 'node:assert/strict'

import { generarItinerario, regenerarSufijo, versionesDe } from '../lib/itinerario.js'

// Día de la semana 1=lunes … 7=domingo de una fecha ISO (mismo criterio que
// el generador: getUTCDay con domingo → 7).
const dow = (f) => {
  const [y, m, d] = String(f).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay() || 7
}
const todasLasFechas = (it) => it.semanas.flatMap((s) => s.fechas)

// Plan base para los tests: nivel 2 (19 semanas), martes y jueves, arranca el
// martes 2026-04-07 en Panamá. En abril–agosto ningún feriado PA cae martes o
// jueves, así que el plan corre limpio: 19 semanas calendario seguidas.
const basePlan = () => generarItinerario({ fechaInicio: '2026-04-07', dias: [2, 4], nivel: 2, pais: 'PA' })

test('generarItinerario siembra versiones[] sin romper la forma actual', () => {
  const it = basePlan()
  assert.equal(it.semanas.length, 19)
  assert.deepEqual(it.versiones, [{ vigente_desde: '2026-04-07', dias: [2, 4] }])
  // La verdad aplanada sigue intacta: semanas[] con fechas por semana.
  assert.deepEqual(it.semanas[0].fechas, ['2026-04-07', '2026-04-09'])
})

test('cambio a mitad de nivel: conserva pasado + asistencias y solo mueve el futuro', () => {
  const it = basePlan()
  // El cambio rige desde el lunes 2026-06-01. Asistencias: una del pasado y
  // una marcada POR ADELANTADO en una clase futura del patrón viejo (jueves
  // 2026-06-04): ambas deben sobrevivir.
  const asistencia = new Set(['2026-04-09', '2026-06-04'])
  const nuevo = regenerarSufijo(it, {
    desde: '2026-06-01',
    diasNuevos: [6],
    excepciones: [],
    fechasConAsistencia: asistencia,
  })

  // Índice de contenido estable: mismas semanas, mismas etiquetas, mismo orden.
  assert.equal(nuevo.semanas.length, it.semanas.length)
  assert.deepEqual(nuevo.semanas.map((s) => s.corto), it.semanas.map((s) => s.corto))
  assert.deepEqual(nuevo.semanas.map((s) => s.etiqueta), it.semanas.map((s) => s.etiqueta))

  // Las 8 semanas ya vividas (clases hasta el 28-may) quedan IDÉNTICAS.
  for (let i = 0; i < 8; i++) assert.deepEqual(nuevo.semanas[i], it.semanas[i])

  // La semana de corte (índice 8) arrastra la clase con asistencia adelantada
  // y completa con el patrón nuevo (sábado de esa misma semana calendario).
  assert.deepEqual(nuevo.semanas[8].fechas, ['2026-06-04', '2026-06-06'])

  // Toda fecha protegida sobrevive; toda fecha regenerada cae en sábado.
  const fechas = todasLasFechas(nuevo)
  for (const f of asistencia) assert.ok(fechas.includes(f), `se perdió ${f}`)
  for (const f of fechas) {
    if (f < '2026-06-01' || asistencia.has(f)) continue
    assert.equal(dow(f), 6, `${f} debería ser sábado`)
    assert.ok(f >= '2026-06-01', `${f} regenerada antes de la vigencia`)
  }
  // Sin fechas duplicadas en el plan aplanado.
  assert.equal(new Set(fechas).size, fechas.length)

  // El calendario quedó versionado: la versión original + la nueva vigencia.
  assert.deepEqual(nuevo.versiones, [
    { vigente_desde: '2026-04-07', dias: [2, 4] },
    { vigente_desde: '2026-06-01', dias: [6] },
  ])
  // El cierre estimado sale del sufijo regenerado (último sábado del plan).
  assert.equal(nuevo.fecha_cierre_estimada, nuevo.semanas[18].fechas.slice(-1)[0])
  assert.equal(dow(nuevo.fecha_cierre_estimada), 6)
})

test('pre-inicio (nada protegido): regenera todo el plan con el patrón nuevo', () => {
  const it = basePlan()
  const nuevo = regenerarSufijo(it, {
    desde: '2026-04-01',
    diasNuevos: [6],
    excepciones: [],
    fechasConAsistencia: new Set(),
  })
  assert.equal(nuevo.semanas.length, it.semanas.length)
  const fechas = todasLasFechas(nuevo)
  for (const f of fechas) assert.equal(dow(f), 6, `${f} debería ser sábado`)
  assert.ok(fechas[0] >= '2026-04-01')
  // La versión vieja (vigente_desde 2026-04-07 >= desde) queda supersedida:
  // solo rige la nueva.
  assert.deepEqual(nuevo.versiones, [{ vigente_desde: '2026-04-01', dias: [6] }])
})

test('itinerario legado sin versiones[]: siembra la versión 1 inferida de sus fechas', () => {
  const it = basePlan()
  delete it.versiones
  assert.deepEqual(versionesDe(it), [{ vigente_desde: '2026-04-07', dias: [2, 4] }])
  const nuevo = regenerarSufijo(it, {
    desde: '2026-06-01',
    diasNuevos: [6],
    excepciones: [],
    fechasConAsistencia: new Set(),
  })
  assert.deepEqual(nuevo.versiones, [
    { vigente_desde: '2026-04-07', dias: [2, 4] },
    { vigente_desde: '2026-06-01', dias: [6] },
  ])
})

test('el sufijo regenerado salta feriados del país y los registra', () => {
  const it = basePlan()
  // Cambio a viernes desde el 2026-04-20: el 1-may-2026 (viernes, Día del
  // Trabajo PA) cae en el sufijo nuevo → se salta y corre el plan.
  const nuevo = regenerarSufijo(it, {
    desde: '2026-04-20',
    diasNuevos: [5],
    excepciones: [],
    fechasConAsistencia: new Set(),
  })
  const fechas = todasLasFechas(nuevo)
  assert.ok(!fechas.includes('2026-05-01'), 'el feriado no puede ser clase')
  assert.ok(nuevo.feriados_saltados.includes('2026-05-01'))
  // La semana que perdió el viernes cuelga el porqué (saltadas) de la
  // siguiente semana con clases, igual que el generador completo.
  const conSaltada = nuevo.semanas.find((s) => (s.saltadas || []).some((x) => x.fecha === '2026-05-01'))
  assert.ok(conSaltada, 'el feriado saltado debe quedar visible en la agenda')
})

test('excepción futura en el sufijo: la clase se suspende y el contenido corre', () => {
  const it = basePlan()
  const nuevo = regenerarSufijo(it, {
    desde: '2026-06-01',
    diasNuevos: [6],
    excepciones: [{ fecha: '2026-06-06', motivo: 'Coach enfermo' }],
    fechasConAsistencia: new Set(),
  })
  // La semana de corte (índice 8) perdió su sábado 6-jun → su contenido cae el
  // sábado siguiente, con la suspensión colgada como explicación.
  assert.deepEqual(nuevo.semanas[8].fechas, ['2026-06-13'])
  assert.equal(nuevo.semanas[8].saltadas[0].fecha, '2026-06-06')
  assert.ok(nuevo.clases_suspendidas.some((s) => s.fecha === '2026-06-06'))
  assert.ok(!todasLasFechas(nuevo).includes('2026-06-06'))
})

test('plan ya completamente vivido: no se toca, solo se versiona', () => {
  const it = basePlan()
  const nuevo = regenerarSufijo(it, {
    desde: '2027-01-01',
    diasNuevos: [6],
    excepciones: [],
    fechasConAsistencia: new Set(),
  })
  assert.deepEqual(nuevo.semanas, it.semanas)
  assert.equal(nuevo.fecha_cierre_estimada, it.fecha_cierre_estimada)
  assert.deepEqual(nuevo.versiones, [
    { vigente_desde: '2026-04-07', dias: [2, 4] },
    { vigente_desde: '2027-01-01', dias: [6] },
  ])
})

test('input inválido: sin semanas, sin días o fecha rota devuelve null', () => {
  const it = basePlan()
  assert.equal(regenerarSufijo(null, { desde: '2026-06-01', diasNuevos: [6] }), null)
  assert.equal(regenerarSufijo(it, { desde: 'no-fecha', diasNuevos: [6] }), null)
  assert.equal(regenerarSufijo(it, { desde: '2026-06-01', diasNuevos: [] }), null)
  assert.equal(regenerarSufijo({ semanas: [] }, { desde: '2026-06-01', diasNuevos: [6] }), null)
})
