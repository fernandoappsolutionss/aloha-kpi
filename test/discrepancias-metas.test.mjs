import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import {
  CLAVES_PRODUCTO, NOTA_NEUTRAL, REGLA_TRIMESTRAL, clavesDisciplina, compararMetas,
  discrepanciasPorClave, encuadre, marca, resumenDiscrepancias, nombreMes,
} from '../lib/discrepancias-metas.mjs'
import { evaluarProducto } from '../lib/marcadores.mjs'
import { CUMPLIMIENTO_KEYS, DISCIPLINA_KEYS, PRODUCTO_KEYS } from '../lib/checklist.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

const MESES_Q3 = [7, 8, 9]
const METAS = { nuevos: 20, desercion: 8, cobranza: 3 }

// El trimestre real de ANCLAS MALL en Q3-2026: 22 ventas contra 43 exigibles,
// agosto en 8,9% de deserción con meta ≤8, y 11 cuotas vencidas con meta ≤3.
// Las tres metas fallan y las tres estaban marcadas "si" en julio y agosto.
const productoQ3 = () => evaluarProducto({
  meses: [
    { mesNum: 7, anio: 2026, ventas: 10, bajas: 9, graduados: 0, ninosInicio: 150, cobranza: 4, cobranzaRegistrada: true, tieneDatos: true },
    { mesNum: 8, anio: 2026, ventas: 12, bajas: 13, graduados: 0, ninosInicio: 146, cobranza: 11, cobranzaRegistrada: true, tieneDatos: true },
    { mesNum: 9, anio: 2026, ventas: 0, bajas: 0, graduados: 0, ninosInicio: 0, cobranza: null, cobranzaRegistrada: false, tieneDatos: false },
  ],
  metas: METAS,
  anio: 2026,
  hoy: '2026-09-05',
})

const filaMarcada = (mes, valor) => ({
  mes,
  meta_nuevos_ingresos: valor,
  meta_desercion: valor,
  meta_cobranza: valor,
})

test('las 3 claves del detector son las mismas 3 de PRODUCTO del checklist', () => {
  // El módulo escribe la lista a mano a propósito (no importa PRODUCTO_KEYS)
  // para poder compararse contra el checklist en vez de heredar de él. Este
  // test es el que impide que un renombre pase mudo.
  assert.deepEqual([...CLAVES_PRODUCTO].sort(), [...PRODUCTO_KEYS].sort())
  assert.equal(CLAVES_PRODUCTO.length, 3)
})

test('LA PUERTA: el formulario sólo puede escribir los 30 de disciplina', () => {
  const escribibles = clavesDisciplina(CUMPLIMIENTO_KEYS)
  assert.equal(escribibles.length, 30)
  assert.deepEqual([...escribibles].sort(), [...DISCIPLINA_KEYS].sort())
  for (const k of CLAVES_PRODUCTO) assert.equal(escribibles.includes(k), false, k)
  assert.deepEqual(clavesDisciplina(), [])
})

test('LA PUERTA: ninguna otra ruta escribe en la tabla `cumplimiento`', () => {
  // El bucle que copia lo que manda el cliente NO puede recorrer los 33: si
  // recorriera CUMPLIMIENTO_KEYS, un POST a la server action con
  // `meta_cobranza:'si'` volvería a auto-aprobar la meta. Eso es lo que se
  // cerró y esto es lo que impide que se reabra sin querer.
  const accion = read('../app/actions/cumplimiento.js')
  assert.doesNotMatch(accion, /for \(const k of CUMPLIMIENTO_KEYS\) row\[k\] = incoming/)
  assert.match(accion, /for \(const k of CLAVES_DISCIPLINA\) row\[k\] = incoming/)
  assert.match(accion, /clavesDisciplina\(CUMPLIMIENTO_KEYS\)/)
  // Y la pantalla ya no manda las 3 en el guardado.
  assert.doesNotMatch(read('../app/centro/[id]/cumplimiento/page.js'), /productoVals/)

  // Barrido: sólo app/actions/cumplimiento.js puede escribir esa tabla.
  const escritura = /(?:INSERT\s+INTO|UPDATE|DELETE\s+FROM)\s+cumplimiento\b|upsert(?:With)?\([^)]*['"]cumplimiento['"]/i
  const infractores = []
  for (const raiz of ['app', 'lib']) {
    for (const relativo of readdirSync(new URL(`../${raiz}/`, import.meta.url), { recursive: true })) {
      const ruta = `${raiz}/${String(relativo)}`
      if (!/\.(?:js|mjs)$/.test(ruta)) continue
      if (ruta === 'app/actions/cumplimiento.js') continue
      if (escritura.test(read(`../${ruta}`))) infractores.push(ruta)
    }
  }
  assert.deepEqual(infractores, [])
})

test('un NULL de la base NO es un "no": es sin marcar', () => {
  assert.equal(marca('si'), 'si')
  assert.equal(marca('SÍ'), 'si')
  assert.equal(marca(' no '), 'no')
  for (const v of [null, undefined, '', '  ', 0, false, 'tal vez']) assert.equal(marca(v), null, String(v))
  // Con la fila entera en NULL no hay nada que contrastar: cero discrepancias,
  // cero celdas marcadas. Si esto se rompiera, el detector inventaría 3
  // discrepancias "de menos" por cada fila que nadie marcó.
  const c = compararMetas({ producto: productoQ3(), filas: [filaMarcada(1, null)], mesesDelTrimestre: MESES_Q3 })
  assert.equal(c.marcadas, 0)
  assert.deepEqual(c.discrepancias, [])
})

test('detecta las 3 metas marcadas "si" que el cálculo da en "no", con su evidencia', () => {
  const c = compararMetas({
    producto: productoQ3(),
    filas: [filaMarcada(1, 'si'), filaMarcada(2, 'si')],
    mesesDelTrimestre: MESES_Q3,
  })
  assert.equal(c.disponible, true)
  assert.equal(c.casos, 3)
  // 3 metas × 2 meses = 6 filas de la base que el backfill tendría que tocar.
  assert.equal(c.celdas, 6)
  assert.equal(c.marcadas, 6)
  assert.equal(c.coinciden, 0)
  assert.equal(c.noVerificables.length, 0)

  const porClave = discrepanciasPorClave(c)
  for (const clave of CLAVES_PRODUCTO) {
    const d = porClave[clave]
    assert.ok(d, clave)
    assert.equal(d.direccion, 'de_mas')
    assert.equal(d.guardado, 'si')
    assert.equal(d.calculado, false)
    assert.deepEqual(d.meses, [1, 2])
    assert.equal(d.nombresMeses, 'Julio y Agosto')
    assert.match(d.titulo, /El registro dice «Sí» y el cálculo dice «No»/)
  }
  // La evidencia lleva los números, no un adjetivo.
  assert.equal(porClave.meta_nuevos_ingresos.evidencia, 'Ventas del trimestre: 22 de 43 (meta 20 por mes).')
  assert.equal(porClave.meta_desercion.evidencia, 'Peor mes: Agosto, 13 bajas reales sobre 146 niños = 8,9% (meta ≤ 8% mensual).')
  assert.equal(porClave.meta_cobranza.evidencia, 'Peor mes: Agosto, 11 cuotas vencidas (meta ≤ 3).')
  assert.match(porClave.meta_cobranza.detalle, /^Julio y Agosto: la casilla guardada dice «Sí»\./)
})

test('la discrepancia al revés también se reporta, y sólo en los meses que la traen', () => {
  const producto = evaluarProducto({
    meses: [
      { mesNum: 7, anio: 2026, ventas: 30, bajas: 2, graduados: 0, ninosInicio: 150, cobranza: 1, cobranzaRegistrada: true, tieneDatos: true },
      { mesNum: 8, anio: 2026, ventas: 30, bajas: 2, graduados: 0, ninosInicio: 150, cobranza: 1, cobranzaRegistrada: true, tieneDatos: true },
    ],
    metas: METAS, anio: 2026, hoy: '2026-09-05',
  })
  // Julio dice "sí" (coincide), agosto dice "no" (no coincide).
  const c = compararMetas({
    producto,
    filas: [filaMarcada(1, 'si'), filaMarcada(2, 'no')],
    mesesDelTrimestre: MESES_Q3,
  })
  assert.equal(c.casos, 3)
  assert.equal(c.celdas, 3)
  assert.equal(c.coinciden, 3)
  const d = discrepanciasPorClave(c).meta_desercion
  assert.equal(d.direccion, 'de_menos')
  assert.deepEqual(d.meses, [2])
  assert.equal(d.nombresMeses, 'Agosto')
  assert.match(d.titulo, /El registro dice «No» y el cálculo dice «Sí»/)
})

test('"no se puede saber" NO es "no cumple": se reporta aparte y nunca como discrepancia', () => {
  // Trimestre sin un solo mes con datos: los tres verdictos son null.
  const producto = evaluarProducto({
    meses: [{ mesNum: 7, anio: 2026, ventas: 0, bajas: 0, graduados: 0, ninosInicio: 0, cobranza: null, cobranzaRegistrada: false, tieneDatos: false }],
    metas: METAS, anio: 2026, hoy: '2026-09-05',
  })
  const c = compararMetas({ producto, filas: [filaMarcada(1, 'si')], mesesDelTrimestre: MESES_Q3 })
  assert.deepEqual(c.discrepancias, [])
  assert.equal(c.noVerificables.length, 3)
  assert.equal(c.noVerificables[0].motivo, 'el trimestre no tiene un solo mes con datos')
  assert.deepEqual(c.noVerificables[0].marcas, [{ valor: 'si', meses: [1], nombresMeses: 'Julio' }])

  // Cobranza sin declarar en un trimestre que por lo demás sí tiene datos.
  const sinCobranza = evaluarProducto({
    meses: [{ mesNum: 7, anio: 2026, ventas: 30, bajas: 2, graduados: 0, ninosInicio: 150, cobranza: null, cobranzaRegistrada: false, tieneDatos: true }],
    metas: METAS, anio: 2026, hoy: '2026-09-05',
  })
  const c2 = compararMetas({ producto: sinCobranza, filas: [filaMarcada(1, 'si')], mesesDelTrimestre: MESES_Q3 })
  assert.deepEqual(c2.noVerificables.map((n) => n.clave), ['meta_cobranza'])
  assert.equal(c2.noVerificables[0].motivo, 'con los datos cargados esta meta todavía no se puede juzgar')
})

test('sin cálculo no se afirma nada: cero discrepancias y disponible:false', () => {
  for (const producto of [null, undefined, {}, { detalle: null }]) {
    const c = compararMetas({ producto, filas: [filaMarcada(1, 'si')], mesesDelTrimestre: MESES_Q3 })
    assert.equal(c.disponible, false)
    assert.deepEqual(c.discrepancias, [])
  }
  // Y sin filas guardadas tampoco: el mes que nadie registró no discrepa.
  const c = compararMetas({ producto: productoQ3(), filas: [], mesesDelTrimestre: MESES_Q3 })
  assert.equal(c.disponible, true)
  assert.equal(c.marcadas, 0)
  assert.deepEqual(c.discrepancias, [])
})

test('sin meses del trimestre el aviso sigue siendo legible', () => {
  const c = compararMetas({ producto: productoQ3(), filas: [filaMarcada(2, 'si')] })
  assert.equal(discrepanciasPorClave(c).meta_cobranza.nombresMeses, 'mes 2')
  assert.equal(nombreMes(9), 'Septiembre')
  assert.equal(nombreMes(13), '')
})

test('el resumen del supervisor cuenta metas, filas, centros y dirección', () => {
  const centroA = {
    centroId: 1, centro: 'ANCLAS MALL',
    comparacion: compararMetas({ producto: productoQ3(), filas: [filaMarcada(1, 'si'), filaMarcada(2, 'si')], mesesDelTrimestre: MESES_Q3 }),
  }
  const centroB = {
    centroId: 2, centro: 'CALLE 50',
    comparacion: compararMetas({
      producto: productoQ3(),
      filas: [{ mes: 1, meta_cobranza: 'si', meta_desercion: 'no', meta_nuevos_ingresos: 'no' }],
      mesesDelTrimestre: MESES_Q3,
    }),
  }
  const limpio = { centroId: 3, centro: 'CONDADO DEL REY', comparacion: compararMetas({ producto: productoQ3(), filas: [], mesesDelTrimestre: MESES_Q3 }) }

  const r = resumenDiscrepancias([centroA, centroB, limpio])
  assert.equal(r.hay, true)
  assert.equal(r.casos, 4)      // 3 de ANCLAS + 1 de CALLE 50
  assert.equal(r.celdas, 7)     // 6 filas de ANCLAS + 1 de CALLE 50
  assert.equal(r.centros, 2)    // el centro sin marcas no aparece
  assert.equal(r.deMas, 4)
  assert.equal(r.deMenos, 0)
  assert.deepEqual(r.porMeta, { ventas: 1, 'deserción': 1, cobranza: 2 })
  assert.equal(r.titular, '4 metas guardadas no coinciden con el cálculo en 2 centros.')
  assert.match(r.reparto, /^4 guardadas como «Sí» que el cálculo da en «No» · 0 al revés\.$/)
  assert.equal(r.detalle.map((c) => c.centro).join('|'), 'ANCLAS MALL|CALLE 50')

  // Sin discrepancias la tarjeta no existe: un tablero que grita todos los
  // días deja de leerse.
  const nada = resumenDiscrepancias([limpio])
  assert.equal(nada.hay, false)
  assert.equal(nada.titular, '')
  assert.deepEqual(nada.detalle, [])
  assert.equal(resumenDiscrepancias().hay, false)
})

test('el singular no se rompe con un solo caso en un solo centro', () => {
  const uno = {
    centroId: 9, centro: 'DAVID',
    comparacion: compararMetas({
      producto: productoQ3(),
      filas: [{ mes: 1, meta_cobranza: 'si' }],
      mesesDelTrimestre: MESES_Q3,
    }),
  }
  const r = resumenDiscrepancias([uno])
  assert.equal(r.titular, '1 meta guardada no coincide con el cálculo en 1 centro.')
  assert.equal(r.celdas, 1)
})

test('el tono informa una brecha, no imputa una mentira', () => {
  const c = compararMetas({
    producto: productoQ3(),
    filas: [filaMarcada(1, 'si'), filaMarcada(2, 'si')],
    mesesDelTrimestre: MESES_Q3,
  })
  const r = resumenDiscrepancias([{ centroId: 1, centro: 'ANCLAS MALL', comparacion: c }])
  const textos = [
    NOTA_NEUTRAL, r.titular, r.reparto,
    ...c.discrepancias.flatMap((d) => [d.titulo, d.detalle, d.evidencia]),
  ]
  // Lo lee la persona que marcó la casilla. Ninguna de estas palabras vuelve a
  // entrar: el sistema informa que dos fuentes no coinciden, no dictamina.
  const prohibidas = /mentir|mentira|falso|falsear|fraude|trampa|incorrect|erróne|inflad|maquill|culpa|miente|engañ/i
  for (const t of textos) assert.doesNotMatch(t, prohibidas, t)
  // Y la nota neutra tiene que nombrar la salida legítima.
  assert.match(NOTA_NEUTRAL, /explicación legítima/)
  assert.match(NOTA_NEUTRAL, /desaparece solo cuando las dos coincidan/)
})


// ── LO QUE SE CUENTA Y CÓMO SE NOMBRA ───────────────────────────────────────

test('UNA ENTRADA NO ES UN CENTRO: se cuentan centroId distintos', () => {
  // Con el llamador del panel (una entrada por centro) daba igual; al pasarle
  // varios trimestres del MISMO centro —que es la lectura natural del nombre
  // del parámetro— el titular decía "en 2 centros" existiendo uno.
  const comparacion = compararMetas({
    producto: productoQ3(), filas: [filaMarcada(1, 'si')], mesesDelTrimestre: MESES_Q3,
  })
  const r = resumenDiscrepancias([
    { centroId: 1, centro: 'ANCLAS MALL', comparacion },
    { centroId: 1, centro: 'ANCLAS MALL', comparacion },
    { centroId: 2, centro: 'CALLE 50', comparacion },
  ])
  assert.equal(r.centros, 2)
  assert.match(r.titular, /en 2 centros\.$/)
})

test('CELDAS NO SON FILAS: tres metas del mismo mes son 3 celdas y 1 fila', () => {
  // La píldora del panel decía "{celdas} filas" y sobrecontaba hasta 3×, en la
  // única alerta cuyo tema es que los números guardados no son de fiar.
  const c = compararMetas({
    producto: productoQ3(),
    filas: [filaMarcada(1, 'si'), filaMarcada(2, 'si'), filaMarcada(3, 'si')],
    mesesDelTrimestre: MESES_Q3,
  })
  assert.equal(c.casos, 3)     // 3 metas
  assert.equal(c.celdas, 9)    // 3 metas × 3 meses
  assert.equal(c.filas, 3)     // 3 filas de `cumplimiento`
  const r = resumenDiscrepancias([
    { centroId: 1, centro: 'ANCLAS MALL', comparacion: c },
    { centroId: 2, centro: 'CALLE 50', comparacion: c },
  ])
  assert.equal(r.celdas, 18)
  assert.equal(r.filas, 6, 'las filas se desduplican por centro + mes, no se suman las celdas')
  // Sin discrepancias, `filas` es 0 y no undefined.
  assert.equal(compararMetas({}).filas, 0)
})

test('LA REGLA TRIMESTRAL SE DICE, no se queda en el comentario', () => {
  // El aviso nombraba tres meses y ponía debajo la evidencia de UNO (el peor).
  // Una administradora que sabe que su marzo cerró limpio leía eso como un
  // error del sistema — y tenía parte de razón.
  const c = compararMetas({
    producto: productoQ3(),
    filas: [filaMarcada(1, 'si'), filaMarcada(2, 'si')],
    mesesDelTrimestre: MESES_Q3,
  })
  const porClave = discrepanciasPorClave(c)
  for (const clave of ['meta_desercion', 'meta_cobranza']) {
    assert.match(porClave[clave].detalle, /Peor mes:/, clave)
    assert.ok(porClave[clave].detalle.includes(REGLA_TRIMESTRAL),
      `${clave}: si se nombra un mes concreto como evidencia, hay que decir por qué`)
    // Y la regla va ANTES de la evidencia, no después.
    assert.ok(porClave[clave].detalle.indexOf(REGLA_TRIMESTRAL) < porClave[clave].detalle.indexOf('Peor mes:'), clave)
  }
  // Ventas ya trae evidencia trimestral ("Ventas del trimestre: 22 de 43"):
  // ahí no hay mes acusado contra mes citado y la regla sería ruido.
  assert.ok(!porClave.meta_nuevos_ingresos.detalle.includes(REGLA_TRIMESTRAL))
  // El tono de la regla no acusa a nadie.
  assert.doesNotMatch(REGLA_TRIMESTRAL, /mentir|falso|incorrect|erróne|culpa/i)
})

test('una marca que NO se puede contrastar también levanta la tarjeta', () => {
  // Antes `hay` sólo miraba discrepancias, así que el bloque que reporta las
  // no verificables estaba DESPUÉS del `return null` y era inalcanzable: 3
  // metas marcadas a mano sobre un trimestre sin datos quedaban mudas. Es el
  // caso peligroso, porque es donde vive la marca heredada.
  const sinDatos = evaluarProducto({
    meses: [{ mesNum: 7, anio: 2026, ventas: 0, bajas: 0, graduados: 0, ninosInicio: 0, cobranza: null, cobranzaRegistrada: false, tieneDatos: false }],
    metas: METAS, anio: 2026, hoy: '2026-09-05',
  })
  const r = resumenDiscrepancias([{
    centroId: 1, centro: 'ANCLAS MALL',
    comparacion: compararMetas({ producto: sinDatos, filas: [filaMarcada(1, 'si')], mesesDelTrimestre: MESES_Q3 }),
  }])
  assert.equal(r.casos, 0)
  assert.equal(r.noVerificables, 3)
  assert.equal(r.hay, true, 'la tarjeta tiene que dibujarse')
  assert.equal(r.soloNoVerificables, true, 'y en modo informativo, sin píldora de alerta')
  // Sin nada de nada sigue sin dibujarse: un tablero que grita todos los días
  // deja de leerse.
  const limpio = resumenDiscrepancias([{
    centroId: 1, centro: 'X',
    comparacion: compararMetas({ producto: productoQ3(), filas: [], mesesDelTrimestre: MESES_Q3 }),
  }])
  assert.equal(limpio.hay, false)
  assert.equal(limpio.soloNoVerificables, false)
})

test('EL ENCUADRE VA ANTES DEL NOMBRE cuando el patrón es de casi todos', () => {
  // 86 de 90 discrepancias en la misma dirección y los seis centros afectados:
  // una línea de reparto junto a un nombre propio se lee como señalamiento
  // personal. El problema es cómo se marcaba la casilla, no quién la marcó.
  assert.match(encuadre(6, 6), /^Esto aparece en 6 de 6 centros/)
  assert.match(encuadre(4, 6), /no de un centro\.$/)
  // Con pocos centros afectados no hay patrón que encuadrar: la frase sería
  // una excusa puesta por el sistema.
  assert.equal(encuadre(3, 6), '')
  assert.equal(encuadre(1, 6), '')
  assert.equal(encuadre(2, 2), 'Esto aparece en 2 de 2 centros: es un problema de cómo se venía marcando la casilla, no de un centro.')
  assert.equal(encuadre(0, 0), '')
  // Y no imputa una mentira.
  assert.doesNotMatch(encuadre(6, 6), /mentir|falso|fraude|trampa|culpa|inflad/i)
})

test('GUARDAR NO PUEDE FINGIR que confirmó una meta que el sistema no juzgó', () => {
  // `saveCumplimiento` devuelve `metasEscritas` justamente para esto: si el
  // cálculo falla o el trimestre no es evaluable, la columna NO se toca y la
  // marca vieja sobrevive intacta. La pantalla tiraba ese dato y mostraba
  // "✅ Cumplimiento guardado correctamente" en el caso exacto que el servidor
  // teme — un tick verde sobre una meta que nadie pudo verificar.
  const accion = read('../app/actions/cumplimiento.js')
  assert.match(accion, /metasEscritas: CLAVES_PRODUCTO\.filter\(\(k\) => producto\?\.\[k\]\)/)

  const pagina = read('../app/centro/[id]/cumplimiento/page.js')
  assert.match(pagina, /res\.metasEscritas/, 'la pantalla tiene que leer la salvaguarda')
  assert.match(pagina, /Se recalcularon \$\{escritas\} de \$\{CLAVES_PRODUCTO\.length\} metas/)
  assert.doesNotMatch(pagina, /Cumplimiento guardado correctamente/,
    'el mensaje fijo no distinguía haber recalculado 3 metas de no haber recalculado ninguna')

  // Y el aviso dice cómo se corrige: pulsar Guardar vuelve a derivar la meta.
  // Una alerta que no se puede descartar y no dice qué hacer es una condena.
  assert.match(pagina, /Para corregirlo, pulsa <b>Guardar<\/b> en este mes/)
  assert.match(pagina, /repítelo en las otras pestañas del trimestre/)
})
