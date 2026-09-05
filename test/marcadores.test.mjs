import test from 'node:test'
import assert from 'node:assert/strict'
import {
  evaluarProducto, mesesProducto, semaforo, verdictoCrecimiento, BANDA_CRECIMIENTO,
} from '../lib/marcadores.mjs'
import {
  CUMPLIMIENTO_KEYS, PRODUCTO_KEYS, DISCIPLINA_KEYS, DISCIPLINA_GRUPOS,
  DISCIPLINA_PESOS, DISCIPLINA_PUNTAJE_MAX, disciplinaPct, cumplimientoPct,
} from '../lib/checklist.js'

const METAS = { nuevos: 20, desercion: 8, cobranza: 3 }
const mesOk = (mesNum) => ({ mesNum, ventas: 25, bajas: 2, graduados: 0, ninosInicio: 150, cobranza: 1, tieneDatos: true })

test('la clasificación cubre los 33 sin borrar ni duplicar ninguno', () => {
  assert.equal(CUMPLIMIENTO_KEYS.length, 33)
  assert.equal(PRODUCTO_KEYS.length, 3)
  assert.equal(DISCIPLINA_KEYS.length, 30)
  assert.equal(new Set([...PRODUCTO_KEYS, ...DISCIPLINA_KEYS]).size, 33)
  for (const k of CUMPLIMIENTO_KEYS) assert.ok(PRODUCTO_KEYS.includes(k) || DISCIPLINA_KEYS.includes(k), k)
  assert.deepEqual(DISCIPLINA_GRUPOS.map((g) => [g.id, g.peso, g.claves.length]), [['A', 2, 10], ['B', 2, 6], ['C', 1, 14]])
  assert.equal(DISCIPLINA_PUNTAJE_MAX, 46)
  // "Aromatizante en recepción" vale 1 de 46 de un marcador que no pinta el semáforo.
  assert.equal(DISCIPLINA_PESOS.aromatizante, 1)
  assert.equal(DISCIPLINA_PESOS.asistencia_dias, 2)
})

test('disciplina pondera y NO cuenta como cumplido el mes sin registrar', () => {
  const mesPerfecto = Object.fromEntries(DISCIPLINA_KEYS.map((k) => [k, 'si']))
  // Dos meses guardados de un trimestre de tres: el 100% viaja con su denominador.
  const d = disciplinaPct([mesPerfecto, mesPerfecto])
  assert.equal(d.pct, 100)
  assert.equal(d.mesesRegistrados, 2)
  assert.equal(d.maximo, 92)
  // El mes que falta no suma ni resta: no existe.
  assert.equal(disciplinaPct([]).pct, null)
  // Un solo criterio de peso 1 en 'no' cuesta menos que uno de peso 2.
  const sinAromatizante = { ...mesPerfecto, aromatizante: 'no' }
  const sinAsistencia = { ...mesPerfecto, asistencia_dias: 'no' }
  assert.ok(disciplinaPct([sinAromatizante]).puntos > disciplinaPct([sinAsistencia]).puntos)
})

test('cumplimientoPct conserva su firma vieja y acepta acotar el marcador', () => {
  const fila = Object.fromEntries(CUMPLIMIENTO_KEYS.map((k) => [k, 'si']))
  assert.equal(cumplimientoPct([fila]), 100)
  assert.equal(cumplimientoPct([{ ...fila, meta_cobranza: 'no' }]), 97)
  assert.equal(cumplimientoPct([{ ...fila, meta_cobranza: 'no' }], PRODUCTO_KEYS), 67)
})

test('verdictoCrecimiento respeta la banda muerta de ±0,5', () => {
  assert.equal(verdictoCrecimiento(3.3), 'CRECE')
  assert.equal(verdictoCrecimiento(BANDA_CRECIMIENTO), 'CRECE')
  assert.equal(verdictoCrecimiento(0.3), 'PLANO')
  assert.equal(verdictoCrecimiento(-0.4), 'PLANO')
  assert.equal(verdictoCrecimiento(-0.5), 'DECRECE')
  assert.equal(verdictoCrecimiento(-2.7), 'DECRECE')
  assert.equal(verdictoCrecimiento(null), 'INDETERMINADO')
  assert.equal(verdictoCrecimiento(undefined), 'INDETERMINADO')
})

test('un graduado NO empeora la meta de deserción', () => {
  // 12 bajas sobre 135 = 8,9% > 8. Con 5 de esas 12 graduadas, la real es
  // 7 sobre 135 = 5,2% y la meta se cumple: graduarse es un logro.
  const conGraduados = evaluarProducto({
    meses: [{ mesNum: 7, ventas: 25, bajas: 12, graduados: 5, ninosInicio: 135, cobranza: 0, tieneDatos: true }],
    metas: METAS,
  })
  assert.equal(conGraduados.P2, true)
  const sinGraduados = evaluarProducto({
    meses: [{ mesNum: 7, ventas: 25, bajas: 12, graduados: 0, ninosInicio: 135, cobranza: 0, tieneDatos: true }],
    metas: METAS,
  })
  assert.equal(sinGraduados.P2, false)
  // Pero las bajas totales siguen contadas: el graduado también deja el cupo.
  assert.equal(conGraduados.bajasQ, 12)
  assert.equal(conGraduados.desRealQ, 7)
  assert.equal(conGraduados.graduadosQ, 5)
})

test('un mes sin registrar NO encoge la meta ni deja pasar el verde', () => {
  // Aquí renacía el 88%: con `metaQ = meta × mesesConDatos`, el mes que nadie
  // registraba desaparecía del numerador Y del denominador, así que ocultar el
  // mes malo bajaba la meta y pintaba el centro de verde.
  const p = evaluarProducto({
    meses: [mesOk(7), mesOk(8), { mesNum: 9, ventas: 0, bajas: 0, graduados: 0, ninosInicio: 0, cobranza: 0, tieneDatos: false }],
    metas: METAS,
    anio: 2025, // trimestre cerrado: los tres meses eran exigibles
  })
  assert.equal(p.mesesConDatos, 2)
  assert.equal(p.metaQ, 60, 'la meta sale del calendario, no de lo que alguien registró')
  assert.equal(p.ventasQ, 50)
  assert.equal(p.P1, false, '50 de 60 no es meta cumplida')
  assert.equal(p.registroCompleto, false)
  assert.deepEqual(p.mesesSinRegistrar, [9])

  // Y aunque las tres metas se cumplieran y el centro creciera, un trimestre a
  // medio contar NO puede ponerse en verde.
  const s = semaforo({
    metasFallidas: 0, metasQueFallan: [],
    crecimiento: 'CRECE', netMensual: 2, confianza: 'high',
    sinDatos: false, registroCompleto: false, mesesSinRegistrar: [9],
  })
  assert.equal(s.color, 'amarillo')
  assert.match(s.motivo, /Septiembre/)
})

test('ocultar el mes malo ya no convierte el amarillo en verde', () => {
  // El caso exacto que se reprodujo con la función real: ventas 22/8/22, agosto
  // con 12% de deserción y 9 vencidas. Con los 3 meses: 3 metas falladas.
  // Ocultando agosto daba 44 de 40 y VERDE.
  const serie = [
    { mesNum: 7, ventas: 22, bajas: 3, graduados: 0, ninosInicio: 100, cobranza: 0, tieneDatos: true },
    { mesNum: 8, ventas: 8, bajas: 12, graduados: 0, ninosInicio: 100, cobranza: 9, tieneDatos: true },
    { mesNum: 9, ventas: 22, bajas: 3, graduados: 0, ninosInicio: 100, cobranza: 0, tieneDatos: true },
  ]
  const conTodo = evaluarProducto({ meses: serie, metas: METAS, anio: 2025 })
  assert.equal(conTodo.metasFallidas, 3)

  const oculto = evaluarProducto({
    meses: serie.map((m) => (m.mesNum === 8 ? { ...m, tieneDatos: false } : m)),
    metas: METAS, anio: 2025,
  })
  assert.equal(oculto.metaQ, 60, 'la meta no se encoge al ocultar un mes')
  assert.equal(oculto.P1, false, '44 de 60 sigue fallando')
  const s = semaforo({ ...oculto, crecimiento: 'CRECE', netMensual: 1.8, confianza: 'high' })
  assert.notEqual(s.color, 'verde', 'ocultar el mes malo no puede dar verde')
})

test('deserción y cobranza fallan si falla UN solo mes, y se reporta el peor', () => {
  const p = evaluarProducto({
    meses: [
      { mesNum: 7, ventas: 25, bajas: 13, graduados: 3, ninosInicio: 148, cobranza: 16, tieneDatos: true },
      { mesNum: 8, ventas: 25, bajas: 13, graduados: 1, ninosInicio: 135, cobranza: 5, tieneDatos: true },
      { mesNum: 9, ventas: 25, bajas: 0, graduados: 0, ninosInicio: 127, cobranza: 0, tieneDatos: true },
    ],
    metas: METAS,
  })
  assert.equal(p.P2, false)
  assert.equal(p.peorDesercion.mesNum, 8)      // 12/135 = 8,9%, no el de julio
  assert.equal(p.P3, false)
  assert.equal(p.peorCobranza.mesNum, 7)       // 16 vencidas, NO el último mes (0)
  assert.equal(p.cobranzaFuera, 2)
})

test('sin un solo mes con datos no se afirma nada', () => {
  const p = evaluarProducto({ meses: [{ mesNum: 7, tieneDatos: false }], metas: METAS })
  assert.equal(p.sinDatos, true)
  assert.deepEqual([p.P1, p.P2, p.P3], [null, null, null])
  assert.equal(p.metasFallidas, 0)
})

// ── SEMÁFORO ────────────────────────────────────────────────────────────────

test('R0 · REGLA DURA: ninguna meta en "No" puede dar verde, pase lo que pase', () => {
  for (const crecimiento of ['CRECE', 'PLANO', 'DECRECE', 'INDETERMINADO']) {
    for (const confianza of ['high', 'medium', 'low', null]) {
      for (const metasFallidas of [1, 2, 3]) {
        const s = semaforo({ metasFallidas, metasQueFallan: ['ventas'], crecimiento, netMensual: 9.9, confianza })
        assert.notEqual(s.color, 'verde', `${crecimiento}/${confianza}/${metasFallidas}`)
      }
    }
  }
  // Y tampoco por ignorancia.
  assert.notEqual(semaforo({ metasFallidas: 0, crecimiento: 'CRECE', netMensual: 5, sinDatos: true }).color, 'verde')
})

test('R1 · ROJO: falla metas Y decrece — la confianza baja no lo bloquea', () => {
  const s = semaforo({ metasFallidas: 3, metasQueFallan: ['ventas', 'deserción', 'cobranza'], crecimiento: 'DECRECE', netMensual: -2.7, confianza: 'low' })
  assert.equal(s.color, 'rojo')
  assert.equal(s.estado, 'ALERTA ROJA')
  assert.equal(s.motivo, 'El centro está perdiendo 2,7 niños al mes y falla 3 de 3 metas.')
})

test('R2 · VERDE sólo con las 3 metas, crecimiento y datos completos', () => {
  const s = semaforo({ metasFallidas: 0, crecimiento: 'CRECE', netMensual: 3.3, confianza: 'medium' })
  assert.equal(s.color, 'verde')
  assert.equal(s.motivo, 'Creces +3,3 niños/mes y cumples las 3 metas.')
  // Con confianza baja no se declara victoria.
  assert.equal(semaforo({ metasFallidas: 0, crecimiento: 'CRECE', netMensual: 3.3, confianza: 'low' }).color, 'amarillo')
})

test('R3 · AMARILLO: exactamente uno de los dos males', () => {
  const decrece = semaforo({ metasFallidas: 0, crecimiento: 'DECRECE', netMensual: -1.7, confianza: 'high' })
  assert.equal(decrece.color, 'amarillo')
  assert.equal(decrece.motivo, 'Cumples las metas pero el centro decrece 1,7 niños/mes.')

  const creceFallando = semaforo({ metasFallidas: 1, metasQueFallan: ['cobranza'], crecimiento: 'CRECE', netMensual: 0.9, confianza: 'high' })
  assert.equal(creceFallando.color, 'amarillo')
  assert.equal(creceFallando.motivo, 'Creces 0,9/mes pero fallas la meta de cobranza.')

  // Plano no es verde: quedarse quieto no acerca el Nivel 1.
  assert.equal(semaforo({ metasFallidas: 0, crecimiento: 'PLANO', netMensual: 0.3, confianza: 'high' }).color, 'amarillo')
  // Sin tendencia medible tampoco.
  assert.equal(semaforo({ metasFallidas: 0, crecimiento: 'INDETERMINADO', netMensual: null, confianza: 'high' }).color, 'amarillo')
})

test('el color nunca viaja solo: forma, palabra y frase con números', () => {
  const formas = new Set(), estados = new Set()
  for (const [color, args] of [
    ['rojo', { metasFallidas: 2, metasQueFallan: ['ventas', 'cobranza'], crecimiento: 'DECRECE', netMensual: -12 }],
    ['amarillo', { metasFallidas: 0, crecimiento: 'PLANO', netMensual: 0.3 }],
    ['verde', { metasFallidas: 0, crecimiento: 'CRECE', netMensual: 3.3, confianza: 'high' }],
  ]) {
    const s = semaforo(args)
    assert.equal(s.color, color)
    formas.add(s.forma); estados.add(s.estado)
    assert.ok(s.titulo && s.motivo && s.resumen.includes(s.estado))
  }
  assert.equal(formas.size, 3, 'cada estado necesita su propia forma')
  assert.equal(estados.size, 3, 'cada estado necesita su propia palabra')
})

// ── FIXTURE CONGELADA: ANCLAS MALL Q3-2026 ──────────────────────────────────
// El caso que Fernando vio en pantalla: 88% "en verde" con las tres metas de
// resultado incumplidas y el centro perdiendo 2,7 niños al mes.
test('ANCLAS Q3-2026: 3 metas fallidas + net -2,7 = ROJO (y 88% de disciplina no lo salva)', () => {
  const filas = {
    rs: [
      { month: 7, ninos_inicio_mes: 148, ninos_final_mes: 135, nuevos_activos_mes: 0, mot_graduado: 3 },
      { month: 8, ninos_inicio_mes: 135, ninos_final_mes: 127, nuevos_activos_mes: 5, mot_graduado: 1 },
      { month: 9, ninos_inicio_mes: 127, ninos_final_mes: 138, nuevos_activos_mes: 6, mot_graduado: 0 },
    ],
    ks: [
      { month: 7, semana: 1, ing_d3: 1, des_d2: 1, des_d4: 1, des_d5: 1, cob_d3: 6 },
      { month: 7, semana: 2, des_d3: 1, des_d5: 2 },
      { month: 7, semana: 3, des_d3: 1, des_d5: 2 },
      { month: 7, semana: 4, ing_d3: 1, des_d1: 1, des_d2: 1, cob_d5: 1 },
      { month: 7, semana: 5, ing_d2: 1, des_d2: 1, des_d5: 1, cob_d5: 16 },
      { month: 8, semana: 1, ing_d4: 1, des_d1: 5, des_d5: 8, cob_d5: 18 },
      { month: 8, semana: 2, ing_d4: 1, cob_d5: 14 },
      { month: 8, semana: 3, ing_d5: 1, cob_d5: 24 },
      { month: 8, semana: 4, ing_d1: 1, ing_d5: 2, cob_d1: 21 },
      { month: 8, semana: 5, cob_d5: 5 },
      { month: 9, semana: 1, ing_d1: 2, ing_d2: 3, cob_d1: 5 },
      { month: 9, semana: 2 },
    ],
  }
  const meses = mesesProducto({ months: [7, 8, 9], ...filas })
  assert.deepEqual(meses.map((m) => m.ventas), [3, 6, 5])
  assert.deepEqual(meses.map((m) => m.bajas), [13, 13, 0])
  // Cobranza = el PEOR valor declarado del mes, no el último día de la última
  // semana. Agosto tocó 24 (semana 3) y con el criterio viejo puntuaba 5, que
  // es el dato de la última semana: el mes se aprobaba por el final. Y un mes
  // sin ningún cob_* escrito vale null (desconocido), nunca 0.
  assert.deepEqual(meses.map((m) => m.cobranza), [16, 24, 5])
  assert.deepEqual(meses.map((m) => m.cobranzaRegistrada), [true, true, true])

  const p = evaluarProducto({ meses, metas: METAS })
  assert.equal(p.mesesConDatos, 3)
  assert.equal(p.ventasQ, 14)  // el "14 de 60" que Fernando vio en pantalla
  assert.equal(p.metaQ, 60)
  assert.deepEqual([p.P1, p.P2, p.P3], [false, false, false])
  assert.equal(p.metasFallidas, 3)
  assert.equal(p.peorDesercion.mesNum, 8)
  assert.equal(Math.round(p.peorDesercion.pct * 10) / 10, 8.9)

  const s = semaforo({
    metasFallidas: p.metasFallidas,
    metasQueFallan: p.metasQueFallan,
    crecimiento: verdictoCrecimiento(-2.7),
    netMensual: -2.7,
    confianza: 'low',
    sinDatos: p.sinDatos,
  })
  assert.equal(s.color, 'rojo')

  // Y el marcador de disciplina, aunque esté casi perfecto, no lo toca.
  const casiPerfecto = Object.fromEntries(DISCIPLINA_KEYS.map((k) => [k, 'si']))
  const disciplina = disciplinaPct([casiPerfecto, { ...casiPerfecto, aromatizante: 'no' }])
  assert.ok(disciplina.pct >= 98)
  assert.equal(disciplina.mesesRegistrados, 2, 'septiembre sigue sin registrar')
  assert.equal(s.color, 'rojo', 'la disciplina no puede maquillar el semáforo')
})

// ─────────────────────────────────────────────────────────────────────────────
// REGRESIONES DE LOS AGUJEROS QUE DEJABAN VER VERDE A UN CENTRO QUE DECRECE
// ─────────────────────────────────────────────────────────────────────────────

test('las filas vacías que fabrica la superposición NO son "meses con datos"', () => {
  // superponerSemanasAuto crea 5 filas por mes con ing/des en cero y cob_* en
  // null para todo mes no cerrado, incluidos los que aún no han ocurrido.
  // Verificado contra producción: el centro 2 en Q4-2026 tenía 0 filas crudas
  // y llegaban 15 superpuestas, así que el trimestre que no ha empezado
  // reportaba "3 meses con datos" y la meta completa ya fallada.
  const fabricadas = [7, 8, 9].flatMap((month) =>
    [1, 2, 3, 4, 5].map((semana) => ({
      month, semana,
      ing_d1: 0, ing_d2: 0, ing_d3: 0, ing_d4: 0, ing_d5: 0,
      des_d1: 0, des_d2: 0, des_d3: 0, des_d4: 0, des_d5: 0,
      cob_d1: null, cob_d2: null, cob_d3: null, cob_d4: null, cob_d5: null,
    }))
  )
  const meses = mesesProducto({ months: [7, 8, 9], rs: [], ks: fabricadas, mesesCalc: [] })
  assert.deepEqual(meses.map((m) => m.tieneDatos), [false, false, false])

  const p = evaluarProducto({ meses, metas: METAS, anio: 2026 })
  assert.equal(p.sinDatos, true, 'sin señal real no hay trimestre que juzgar')
  assert.deepEqual([p.P1, p.P2, p.P3], [null, null, null])
  assert.equal(p.metasFallidas, 0, 'no se falla una meta por un mes que no ha ocurrido')

  // Y la rama "Sin datos del trimestre" es alcanzable (antes era código muerto).
  const s = semaforo({ ...p, crecimiento: 'DECRECE', netMensual: -2.7, confianza: 'low' })
  assert.equal(s.color, 'amarillo')
  assert.equal(s.titulo, 'Sin datos del trimestre')
})

test('cobranza en blanco NO es cobranza perfecta', () => {
  // Tres fallas del criterio viejo, las tres a favor del centro: sólo miraba la
  // última semana, se saltaba los ceros con `||`, y un mes sin filas valía 0.
  const meses = mesesProducto({
    months: [7],
    rs: [{ month: 7, ninos_inicio_mes: 100 }],
    ks: [{ month: 7, semana: 1, ing_d1: 25, cob_d1: null, cob_d5: null }],
    mesesCalc: [],
  })
  assert.equal(meses[0].cobranza, null)
  assert.equal(meses[0].cobranzaRegistrada, false)

  const p = evaluarProducto({ meses, metas: METAS, anio: 2025 })
  assert.equal(p.P3, null, 'sin un solo valor declarado, la meta no es evaluable')
  assert.equal(p.registroCompleto, false)
  assert.deepEqual(p.mesesSinCobranza, [7])
  // Y por tanto no puede dar verde aunque todo lo demás vaya bien.
  const s = semaforo({ ...p, crecimiento: 'CRECE', netMensual: 3, confianza: 'high' })
  assert.notEqual(s.color, 'verde')
})

test('la cobranza del mes es el PEOR valor declarado, no el último', () => {
  const meses = mesesProducto({
    months: [8],
    rs: [{ month: 8, ninos_inicio_mes: 100 }],
    ks: [
      { month: 8, semana: 1, cob_d5: 18 },
      { month: 8, semana: 3, cob_d5: 24 },
      { month: 8, semana: 5, cob_d5: 5 },   // el mes NO cierra en 5
    ],
    mesesCalc: [],
  })
  assert.equal(meses[0].cobranza, 24)
})

test('un centro que abre sin población no reprueba la meta de deserción', () => {
  // 0 niños al inicio y 1 baja daba 100% y P2=false: aritmética, no gestión.
  const p = evaluarProducto({
    meses: [{ mesNum: 7, ventas: 6, bajas: 1, graduados: 0, ninosInicio: 0, cobranza: 0, tieneDatos: true }],
    metas: METAS, anio: 2025,
  })
  assert.equal(p.P2, null, 'sin población base no hay porcentaje que medir')
  assert.ok(!p.metasQueFallan.includes('deserción'))
})

test('el mes en curso se prorratea: nadie abre el trimestre en rojo por el calendario', () => {
  // 1 de octubre, día 1 de 31: la meta exigible es ~20/31, no 20 ni 60.
  const p = evaluarProducto({
    meses: [
      { mesNum: 10, ventas: 0, bajas: 0, graduados: 0, ninosInicio: 100, cobranza: 0, tieneDatos: true },
      { mesNum: 11, ventas: 0, bajas: 0, graduados: 0, ninosInicio: 0, cobranza: 0, tieneDatos: false },
      { mesNum: 12, ventas: 0, bajas: 0, graduados: 0, ninosInicio: 0, cobranza: 0, tieneDatos: false },
    ],
    metas: METAS, anio: 2026, hoy: '2026-10-01',
  })
  assert.equal(p.metaQ, 1, 'el día 1 no se exige el trimestre completo')
  // Y un trimestre ya cerrado sí se cobra entero.
  const cerrado = evaluarProducto({
    meses: [mesOk(1), mesOk(2), mesOk(3)], metas: METAS, anio: 2025, hoy: '2026-10-01',
  })
  assert.equal(cerrado.metaQ, 60)
})

test('decrecer por GRADUACIONES nunca pinta rojo', () => {
  // El saldo de población usa bajas totales a propósito, pero un centro que
  // baja porque sus niños TERMINARON el programa no está perdiendo gente.
  const rojo = semaforo({
    metasFallidas: 2, metasQueFallan: ['ventas', 'cobranza'],
    crecimiento: 'DECRECE', netMensual: -2, confianza: 'high',
    graduadosMedianos: 0,
  })
  assert.equal(rojo.color, 'rojo')

  // Graduarse es el motivo dominante de salida (5 de 8): no es sangría.
  const porGraduar = semaforo({
    metasFallidas: 2, metasQueFallan: ['ventas', 'cobranza'],
    crecimiento: 'DECRECE', netMensual: -2, confianza: 'high',
    graduadosMedianos: 5, retirosMedianos: 8,
  })
  assert.equal(porGraduar.color, 'amarillo')
  assert.match(porGraduar.motivo, /graduaciones/)
  // Pero sigue sin ser verde: las metas falladas mandan.
  assert.notEqual(porGraduar.color, 'verde')
})

test('el perdón por graduaciones NO cubre a un centro que se desangra', () => {
  // CALLE 50 en producción: cae −1,7/mes con mediana de 1 graduado y de 10,5
  // salidas. Mirando sólo el neto, ese graduado "explica" el 59% de la caída
  // —el neto es pequeño porque las altas casi compensan—, pero 9,5 de cada
  // 10,5 salidas son deserción real. Tiene que seguir en ROJO.
  const s = semaforo({
    metasFallidas: 2, metasQueFallan: ['ventas', 'cobranza'],
    crecimiento: 'DECRECE', netMensual: -1.7, confianza: 'low',
    graduadosMedianos: 1, retirosMedianos: 10.5,
  })
  assert.equal(s.color, 'rojo')
  assert.equal(s.decrecePorGraduacion, false)
})

test('un fallo del motor no suaviza un rojo a amarillo', () => {
  const s = semaforo({
    metasFallidas: 3, metasQueFallan: ['ventas', 'deserción', 'cobranza'],
    crecimiento: 'INDETERMINADO', netMensual: null, confianza: null,
    crecimientoNoDisponible: true,
  })
  assert.match(s.motivo, /No se pudo calcular la tendencia/)
  assert.notEqual(s.color, 'verde')
})

test('el VERDE es alcanzable: la rama R2 no es código muerto', () => {
  const p = evaluarProducto({
    meses: [mesOk(1), mesOk(2), mesOk(3)], metas: METAS, anio: 2025,
  })
  assert.equal(p.metasFallidas, 0)
  assert.equal(p.registroCompleto, true)
  const s = semaforo({ ...p, crecimiento: 'CRECE', netMensual: 2.5, confianza: 'high' })
  assert.equal(s.color, 'verde')
})
