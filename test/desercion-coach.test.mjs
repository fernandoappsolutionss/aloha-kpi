import test from 'node:test'
import assert from 'node:assert/strict'

import {
  CANDADOS,
  MOTIVOS_CONTROLABLES,
  alertasDeCoach,
  consultarDesercionPorCoach,
  etiquetaPeriodo,
  ventanaTrimestre,
} from '../lib/desercion-coach.mjs'

const coach = (nombre, expuestos, bajas, graduados = 0, controlables = 0, motivo_top = null) => ({
  coach_id: nombre, nombre, expuestos, bajas_reales: bajas, graduados, controlables, motivo_top,
})

// Fotos reales de producción (2026-09-04) congeladas como fixture: si alguien
// mueve un candado, estos casos lo delatan con nombre y apellido.
const ANCLAS_Q3 = [
  coach('ROSA LÓPEZ', 44, 12, 0, 5, 'PERDIDA_CLASES'),
  coach('MAYERLINE', 1, 1, 0, 0, 'ECONOMICO'),
  coach('DIANA PINEDA', 25, 4, 0, 3, 'PERDIDA_CLASES'),
  coach('DAYANI', 0, 0),
  coach('KERSEE', 0, 0),
  coach('JOHANIS', 0, 0),
  coach('DESSIRÉ CHAMPSAUR', 45, 6, 6, 2, 'OTRO'),
  coach('SELENA PINEDA', 8, 0),
  coach('CRISTOPHER', 8, 0),
  coach('DIOSA OSORIO', 9, 0),
  coach('YOEMI VÁSQUEZ', 25, 2, 0, 0, 'ECONOMICO'),
]

const DAVID_Q3 = [
  coach('Aljhenz Pineda', 55, 8, 1, 2, 'ECONOMICO'),
  coach('Jean Rodriguez', 0, 0),
  coach('Daira López', 0, 0),
  coach('Soleid Del Cid', 5, 0),
  coach('Reichell González', 12, 0),
  coach('Sebastian Arroyo', 39, 1, 0, 0, 'ECONOMICO'),
  coach('María Guadamuz', 38, 1, 0, 0, 'ECONOMICO'),
]

const CONDADO_Q3 = [
  coach('DAMIANO CHIARI', 22, 6, 0, 0, 'OTRO'),
  coach('ROSARIO ROBLETO', 2, 0),
  coach('YANELYS BERGANTIÑO', 2, 0),
  coach('YAZURI GONZÁLEZ', 38, 5, 0, 0, 'OTRO'),
  coach('DANIELA QUINTERO', 30, 3, 0, 0, 'OTRO'),
]

const Q3 = { anio: 2026, trimestre: 3 }
const porNombre = (r, nombre) => r.coaches.find((c) => c.nombre === nombre)

test('ANCLAS Q3-2026: la alerta cae donde se concentra la deserción, y solo ahí', () => {
  const r = alertasDeCoach(ANCLAS_Q3, Q3)
  assert.equal(r.pctCentro, 15.2)
  assert.equal(r.bajasCentro, 25)
  assert.equal(r.expuestosCentro, 165)
  assert.deepEqual(r.alertas.map((c) => c.nombre), ['ROSA LÓPEZ'])

  const rosa = r.alertas[0]
  assert.equal(rosa.bajasReales, 12)
  assert.equal(rosa.expuestos, 44)
  assert.equal(rosa.pct, 27.3)
  assert.equal(rosa.exceso, 5.3)
  assert.equal(rosa.motivoTopLabel, 'Pérdida de clases')
  // La frase lleva el número, sobre cuántos niños y el periodo. Nunca un color pelado.
  assert.match(rosa.titular, /ROSA LÓPEZ: 12 retiros de 44 niños a cargo/)
  assert.match(rosa.detalle, /27,3% frente al 15,2% del centro en Jul–Sep 2026/)
  assert.match(rosa.detalle, /5 niños por encima de lo esperado/)
  assert.match(rosa.detalle, /5 de esas 12 salieron por causas del aula/)
})

test('DAVID Q3-2026: segunda alerta real, con su exceso en niños', () => {
  const r = alertasDeCoach(DAVID_Q3, Q3)
  assert.equal(r.pctCentro, 6.7)
  assert.deepEqual(r.alertas.map((c) => c.nombre), ['Aljhenz Pineda'])
  assert.equal(r.alertas[0].exceso, 4.3)
  assert.equal(r.alertas[0].pct, 14.5)
})

test('un coach con 1 baja de 1 niño no dispara alerta: es ruido, no un caso', () => {
  const r = alertasDeCoach(ANCLAS_Q3, Q3)
  const mayerline = porNombre(r, 'MAYERLINE')
  assert.equal(mayerline.pct, 100) // el porcentaje grita…
  assert.equal(mayerline.estado, 'sin_muestra') // …y aun así no se evalúa
  assert.equal(r.alertas.includes(mayerline), false)
  assert.match(mayerline.detalle, /Con menos de 15 niños a cargo/)

  // El caso mínimo, aislado del fixture: 6 niños y 1 baja = 17% y no pasa nada.
  const micro = alertasDeCoach([coach('A', 6, 1), coach('B', 60, 2)], Q3)
  assert.equal(micro.alertas.length, 0)
  assert.equal(porNombre(micro, 'A').estado, 'sin_muestra')
})

test('el piso de eventos: dos bajas nunca son una alerta, por alta que sea la tasa', () => {
  // Centro casi sin deserción, coach con 2 bajas sobre 20 niños (10% vs 0,6%).
  const r = alertasDeCoach([coach('A', 20, 2), coach('B', 300, 0)], Q3)
  const a = porNombre(r, 'A')
  assert.equal(a.candados.exposicion, true)
  assert.equal(a.candados.eventos, false)
  assert.equal(a.estado, 'seguimiento')
  assert.equal(r.alertas.length, 0)
})

test('margen absoluto: 2,7 niños de más se sigue, no se alerta (DAMIANO CHIARI)', () => {
  const r = alertasDeCoach(CONDADO_Q3, Q3)
  assert.equal(r.alertas.length, 0)
  const damiano = porNombre(r, 'DAMIANO CHIARI')
  assert.equal(damiano.exceso, 2.7)
  assert.equal(damiano.candados.margenRelativo, true)
  assert.equal(damiano.candados.margenAbsoluto, false)
  assert.equal(damiano.estado, 'seguimiento')
})

test('graduar no penaliza: suma en el denominador, nunca en el numerador', () => {
  const sinGraduados = alertasDeCoach([coach('A', 45, 6, 0), coach('B', 120, 19)], Q3)
  const conGraduados = alertasDeCoach([coach('A', 45, 6, 6), coach('B', 120, 19)], Q3)
  // Mismas 6 bajas reales y misma tasa: los graduados ya venían dentro de `expuestos`.
  assert.equal(porNombre(sinGraduados, 'A').pct, porNombre(conGraduados, 'A').pct)
  assert.equal(porNombre(conGraduados, 'A').bajasReales, 6)
  assert.match(porNombre(conGraduados, 'A').detalle, /No cuentan sus 6 graduados: graduarse es un logro/)
  assert.doesNotMatch(porNombre(sinGraduados, 'A').detalle, /graduad/)
})

test('un centro sin bajas no inventa culpables ni divide por cero', () => {
  const r = alertasDeCoach([coach('A', 40, 0), coach('B', 30, 0)], Q3)
  assert.equal(r.pctCentro, 0)
  assert.equal(r.alertas.length, 0)
  assert.equal(porNombre(r, 'A').exceso, 0)
  assert.equal(porNombre(r, 'A').candados.margenRelativo, false)
  assert.equal(alertasDeCoach([], Q3).coaches.length, 0)
})

test('la lista se ordena por niños de más, y el tono no juzga a la persona', () => {
  const r = alertasDeCoach(ANCLAS_Q3, Q3)
  const excesos = r.coaches.map((c) => c.exceso)
  assert.deepEqual(excesos, [...excesos].sort((a, b) => b - a))
  for (const c of r.coaches) {
    assert.doesNotMatch(`${c.titular} ${c.detalle}`, /no cumple|incumple|culpa|sanci[oó]n|castigo|despido|mal desempe/i, c.nombre)
    assert.match(c.detalle, /\d/, `${c.nombre}: ninguna línea sin número`)
  }
})

test('los candados y la ventana son los acordados, y se pueden leer desde fuera', () => {
  assert.deepEqual(CANDADOS, { expuestosMin: 15, bajasMin: 3, razonMin: 1.5, excesoMin: 3, seguimientoMin: 1 })
  assert.deepEqual(MOTIVOS_CONTROLABLES, ['PERDIDA_CLASES', 'TECNICA', 'HORARIO'])
  assert.deepEqual(ventanaTrimestre(3), { mesDesde: 7, mesHasta: 9 })
  assert.deepEqual(ventanaTrimestre(4), { mesDesde: 10, mesHasta: 12 })
  assert.equal(etiquetaPeriodo(2026, 3), 'Jul–Sep 2026')
})

test('la consulta viaja parametrizada y arrastra las bajas sin coach identificable', async () => {
  const llamadas = []
  const sql = (strings, ...values) => {
    llamadas.push({ texto: strings.join('?'), values })
    return Promise.resolve(llamadas.length === 1 ? ANCLAS_Q3 : [{ bajas_sin_coach: 4, retiros_totales: 4 }])
  }
  const { filas, sinCoach } = await consultarDesercionPorCoach(sql, { centroId: 2, anio: 2026, mesDesde: 7, mesHasta: 9 })
  assert.equal(filas.length, ANCLAS_Q3.length)
  assert.equal(sinCoach, 4)
  assert.equal(llamadas.length, 2)
  for (const { texto, values } of llamadas) {
    // Nada de centro/año interpolados en el texto: todo va por parámetro.
    assert.doesNotMatch(texto, /centro_id\s*=\s*\d/)
    assert.ok(values.includes(2) && values.includes(2026) && values.includes(7) && values.includes(9))
  }
  // De un retiro se llega al coach por el grupo de ORIGEN del niño.
  assert.match(llamadas[0].texto, /g\.id = e\.de_grupo_id/)
  assert.match(llamadas[0].texto, /motivo IS DISTINCT FROM 'GRADUADO'/)

  const r = alertasDeCoach(filas, { ...Q3, sinCoach })
  assert.equal(r.sinCoach, 4)
})

test('las bajas SIN coach identificable suben la vara del centro', () => {
  // Caso real DAVID Q3-2026: 15 bajas reales, sólo 10 atribuibles. Con las 5
  // huérfanas fuera del denominador, la tasa del centro salía 6,7% y Aljhenz
  // Pineda (8 de 55) disparaba alerta con razón 2,16 y exceso +4,3. Con ellas
  // dentro la tasa real es 9,7%: razón 1,49 (< 1,5) y exceso 2,6 (< 3) — los
  // dos candados de margen se caen. La alerta era un artefacto del denominador.
  const filas = [
    { coach_id: 1, nombre: 'Aljhenz Pineda', expuestos: 55, bajas_reales: 8, graduados: 0, controlables: 2, motivo_top: 'ECONOMICO' },
    { coach_id: 2, nombre: 'Otra', expuestos: 94, bajas_reales: 2, graduados: 0, controlables: 1, motivo_top: 'ECONOMICO' },
  ]
  const sinHuerfanas = alertasDeCoach(filas, { sinCoach: 0 })
  assert.equal(sinHuerfanas.alertas.length, 1, 'con la vara incompleta, se acusa')

  const conHuerfanas = alertasDeCoach(filas, { sinCoach: 5 })
  assert.equal(conHuerfanas.alertas.length, 0, 'con todas las bajas del centro en la vara, no hay caso')
  assert.equal(conHuerfanas.sinCoach, 5)
  assert.ok(conHuerfanas.pctCentro > sinHuerfanas.pctCentro)
})

test('un caso sólido sigue disparando aunque haya huérfanas', () => {
  // ANCLAS Q3-2026: ROSA LÓPEZ, 12 de 44 (27,3%) contra 15,2% del centro.
  const filas = [
    { coach_id: 1, nombre: 'ROSA LÓPEZ', expuestos: 44, bajas_reales: 12, graduados: 0, controlables: 5, motivo_top: 'PERDIDA_CLASES' },
    { coach_id: 2, nombre: 'Otra', expuestos: 121, bajas_reales: 13, graduados: 0, controlables: 4, motivo_top: 'ECONOMICO' },
  ]
  const r = alertasDeCoach(filas, { sinCoach: 0 })
  assert.equal(r.alertas.length, 1)
  assert.equal(r.alertas[0].nombre, 'ROSA LÓPEZ')
})
