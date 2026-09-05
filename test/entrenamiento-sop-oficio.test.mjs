// EL SOP DE UNA HOJA — components/entrenamiento/sop-derivar.mjs.
//
// El módulo que decide QUÉ va en cada hoja no tenía una sola prueba, y el único
// guardián del requisito central de Fernando ("que quepa en una hoja") era el
// ResizeObserver de SopHoja.js: corre en el cliente y solo si alguien abre esa
// hoja concreta en un navegador. Por eso of-cen-9 se imprimía en dos páginas con
// los 836 tests en verde y el build limpio: nada lo miraba.
//
// Aquí se mira: el contrato de la derivación, los invariantes de las 40 hojas y
// un PRESUPUESTO DE ALTO calibrado contra una medición real (ver abajo).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { MODULOS_OFICIO, moduloOficio } from '../lib/entrenamiento/oficio/catalogo.js'
import { derivarSop, TOPE, nombreDeRol } from '../components/entrenamiento/sop-derivar.mjs'
import { esDePapel } from '../lib/entrenamiento/oficio/progreso.js'

const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8')
const bloqueCss = (sel) => css.slice(css.indexOf(`${sel} {`)).split('}')[0]

// ── 1. CONTRATO DE LA DERIVACIÓN ──────────────────────────────────────────
test('derivarSop: el `sop` escrito manda sección por sección; si no, se deriva', () => {
  assert.equal(derivarSop(null), null)

  const base = {
    id: 'of-x-1',
    titulo: 'Título del módulo',
    roles: ['administradora'],
    pfv: 'El producto que sostiene el puesto.',
    bloques: [
      { t: 'pasos', items: ['Uno.', 'Dos.'] },
      { t: 'nota', tono: 'regla', titulo: 'La regla', texto: 'No se negocia.' },
      { t: 'nota', tono: 'alerta', titulo: 'Escala', texto: 'Lo resuelve la Junta Directiva.' },
      { t: 'nota', tono: 'alerta', titulo: 'Se cae', texto: 'Cobrar la mensualidad sin emitir la factura del mes. El resto del párrafo explica cómo se delata.' },
    ],
    drills: [{ pasos: ['Del drill.'], errorTipico: 'Firmar el drill sin habérselo tomado a la persona. Y después nadie sabe qué pasó.' }],
  }

  const derivada = derivarSop(base)
  assert.equal(derivada.escrito, false)
  assert.equal(derivada.codigo, 'of-x-1')
  assert.equal(derivada.proceso, 'Título del módulo', 'sin `sop`, el proceso es el título del módulo')
  assert.equal(derivada.producto, base.pfv, 'sin `sop`, el producto es el PFV')
  assert.deepEqual(derivada.pasos, ['Uno.', 'Dos.'], 'el bloque `pasos` gana sobre los pasos del drill')
  // Una nota `alerta` que nombra una autoridad es un punto de escalamiento; la
  // que no nombra a nadie es un error. Ninguna sale dos veces en la hoja.
  assert.deepEqual(derivada.decide, [
    { situacion: 'La regla', regla: 'No se negocia.' },
    { situacion: 'Escala', regla: 'Lo resuelve la Junta Directiva.' },
  ])
  assert.deepEqual(derivada.errores, [
    'Firmar el drill sin habérselo tomado a la persona.',
    'Se cae: Cobrar la mensualidad sin emitir la factura del mes.',
  ], 'del error típico se queda la primera oración, no el párrafo que lo explica')
  assert.deepEqual(derivada.vacios, [])
  assert.deepEqual(derivada.aplicaA, [nombreDeRol('administradora')])

  const escrita = derivarSop({
    ...base,
    sop: {
      proceso: 'Cerrar el mes',
      cuando: 'Los primeros cinco días.',
      producto: 'El cierre firmado.',
      pasos: ['Paso escrito.'],
      decide: ['Una regla suelta', { situacion: 'Con sitio', quien: 'La Junta' }],
      errores: ['Un error escrito.'],
    },
  })
  assert.equal(escrita.escrito, true)
  assert.equal(escrita.proceso, 'Cerrar el mes')
  assert.equal(escrita.cuando, 'Los primeros cinco días.')
  assert.deepEqual(escrita.pasos, ['Paso escrito.'])
  assert.deepEqual(escrita.decide, [
    { situacion: '', regla: 'Una regla suelta' },
    { situacion: 'Con sitio', regla: 'La Junta' },
  ], 'un punto de decisión vale como texto suelto, como {situacion,regla} y como {situacion,quien}')
  assert.deepEqual(escrita.errores, ['Un error escrito.'])

  // Lo que la hoja no puede sostener se DECLARA, no se rellena.
  const pelada = derivarSop({ id: 'of-x-2', titulo: 'Pelado', roles: [], bloques: [] })
  assert.deepEqual(pelada.vacios, ['producto', 'pasos', 'decide', 'errores'])
  assert.deepEqual(pelada.aplicaA, [])
})

test('derivarSop: los topes recortan el NÚMERO, nunca el TEXTO de un paso', () => {
  const largo = Array.from({ length: TOPE.pasos + 3 }, (_, i) => `Paso ${i + 1} con su cifra del Manual.`)
  const h = derivarSop({ id: 'of-x-3', titulo: 'T', roles: [], pfv: 'P', bloques: [{ t: 'pasos', items: largo }] })
  assert.equal(h.pasos.length, TOPE.pasos)
  assert.equal(h.pasosOmitidos, 3, 'la hoja tiene que poder decir cuántos pasos quedaron fuera')
  assert.deepEqual(h.pasos, largo.slice(0, TOPE.pasos), 'ni un paso recortado a la mitad: ahí viven las cifras y los plazos')
})

// ── 2. TODAS LAS HOJAS ────────────────────────────────────────────────────
// Los cinco módulos de método y hat no declaran `sop` todavía. Su hoja derivada
// imprime el TEMARIO bajo el título "Los pasos" —una taxonomía, no un
// procedimiento—, y por eso NO se les ofrece desde ninguna pantalla (la píldora
// del checksheet y el enlace del módulo salen de metadatosOficio().sop). La
// derivación queda como red de seguridad del módulo nuevo, no como oferta.
const SIN_SOP_ESCRITO = new Set(['of-met-1', 'of-met-2', 'of-met-3', 'of-hat-adm', 'of-hat-asi'])
// Y la única sección que hoy nadie puede sostener. Cuando of-met-1 declare sus
// errores típicos, este test pide que salga de aquí.
const VACIOS_CONOCIDOS = { 'of-met-1': ['errores'] }

// El conteo NO va en el nombre: el catálogo crece (40 → los del Coach, los del
// Coordinador y las seis hojas de papel del aseo) y un número en el título
// envejece en silencio mientras el test sigue en verde. El barrido es sobre
// MODULOS_OFICIO entero, que es la afirmación de verdad.
test('cada hoja del oficio: nada queda fuera del papel y lo que falta se declara', () => {
  const sinEscribir = []
  for (const m of MODULOS_OFICIO) {
    const h = derivarSop(m)
    assert.ok(h, `${m.id}: sin hoja`)
    assert.equal(h.codigo, m.id)
    assert.ok(h.proceso, `${m.id}: hoja sin nombre de proceso`)
    assert.ok(h.pasos.length <= TOPE.pasos, `${m.id}: ${h.pasos.length} pasos (tope ${TOPE.pasos})`)
    assert.ok(h.decide.length <= TOPE.decide, `${m.id}: ${h.decide.length} puntos de decisión (tope ${TOPE.decide})`)
    assert.ok(h.errores.length <= TOPE.errores, `${m.id}: ${h.errores.length} errores (tope ${TOPE.errores})`)
    // Si esto falla, la hoja imprime "Quedan N pasos fuera": el procedimiento
    // se escribió más largo de lo que cabe y hay que partirlo en dos procesos.
    assert.equal(h.pasosOmitidos, 0, `${m.id}: quedan ${h.pasosOmitidos} pasos fuera de la hoja`)
    assert.deepEqual(h.vacios, VACIOS_CONOCIDOS[m.id] || [], `${m.id}: secciones que la hoja no puede sostener`)
    // De qué puesto es la hoja. Se deriva de `roles`, salvo en las hojas DE
    // PAPEL: el personal de aseo no es un rol del sistema —no tiene cuenta— y
    // su nombre solo puede venir escrito en el `sop` del módulo.
    if (esDePapel(m)) {
      assert.ok(h.papel, `${m.id}: la hoja de un módulo sin roles tiene que marcarse como papel`)
      assert.ok(h.aplicaA.length > 0, `${m.id}: una hoja de papel tiene que decir a quién se le entrega (escríbelo en sop.aplicaA)`)
    } else {
      assert.equal(h.papel, false, `${m.id}: solo un módulo sin roles es de papel`)
      assert.deepEqual(h.aplicaA, m.roles.map(nombreDeRol), `${m.id}: la hoja tiene que decir de qué puestos es`)
    }
    if (!h.escrito) sinEscribir.push(m.id)
  }
  assert.deepEqual(
    sinEscribir.sort(), [...SIN_SOP_ESCRITO].sort(),
    'estos módulos no declaran `sop`: escríbeselo, o si es deuda conocida agrégalo a SIN_SOP_ESCRITO (y recuerda que a esos no se les ofrece la hoja)',
  )
})

test('una hoja = un proceso: of-cen-9 dejó de arrastrar las reglas de permisos', () => {
  // El SOP de of-cen-9 es "Contratar a un colaborador y armar su file". Dos de
  // sus tres puntos de decisión eran de permisos —otro proceso, con su propia
  // hoja en of-nor-6— y con ellos la hoja medía 1148 px contra los 1122,5 de
  // una A4: la única de las 40 que no cabía.
  const cen9 = derivarSop(moduloOficio('of-cen-9'))
  assert.equal(cen9.decide.length, 1)
  assert.doesNotMatch(JSON.stringify(cen9.decide), /permiso/i, 'los permisos son otro proceso: van en la hoja de of-nor-6')
  const nor6 = derivarSop(moduloOficio('of-nor-6'))
  assert.match(nor6.proceso, /permiso/i, 'of-nor-6 es la hoja de los permisos, y la llevan los dos puestos')
  assert.deepEqual(moduloOficio('of-nor-6').roles.slice().sort(), ['administradora', 'asistente'])
})

// ── 3. QUE QUEPA EN UNA HOJA ──────────────────────────────────────────────
// La geometría de .sop-hoja sale de app/globals.css y la hoja se compone de
// renglones enteros, así que su alto se puede estimar sin navegador. Los
// caracteres por línea de cada sección están MEDIDOS: se generaron las 40 hojas
// con el CSS real y se comparó el alto de cada bloque contra el número de
// caracteres. Residuo de la estimación contra la medición: ±2 renglones
// (máximo 36 px, media 6 px sobre 40 hojas).
//
// No sustituye al ResizeObserver de SopHoja.js, que mide de verdad y en el
// navegador de quien la va a imprimir. Sirve para lo que aquel no puede: que el
// frente de contenido se entere en CI, no cuando alguien abra esa hoja.
//
// SI CAMBIA EL CSS DE .sop-*, ESTAS CONSTANTES HAY QUE VOLVER A MEDIRLAS. El
// test de abajo falla si se mueve cualquiera de las declaraciones de las que
// cuelgan, para que el aviso llegue en vez de que la estimación derive en
// silencio. Cómo se miden: se genera un HTML con las 40 hojas (el mismo marcado
// de SopHoja.js más el bloque .sop-* de globals.css tal cual), se abre en
// Chrome y, con `minHeight = 0` en cada .sop-hoja, se lee el alto de la hoja y
// el de cada sección. El alto siempre cae en múltiplos del renglón, así que los
// caracteres por línea salen de dividir. El cuerpo de la hoja NO usa la Futura
// de next/font (solo .sop-proceso), así que la medición fuera de la app vale.
const A4_PX = 297 / 25.4 * 96          // 1122.5 px: el alto de una A4 a 96 dpi
const RENGLON = 16 * 0.78 * 1.42       // cuerpo de la hoja
const RENGLON_H1 = 16 * 1.32 * 1.15    // .sop-proceso
const RENGLON_PROD = 16 * 0.86 * 1.35  // .sop-producto p
const GAP = 1.7 / 25.4 * 96            // gap entre pasos y entre puntos de decisión
const CABEZA_MIN = 81.1                // la columna del "Código / Aplica a / Emisión"
const CABEZA_BASE = 56.8               // marca + centro + márgenes + borde inferior
const CUANDO_MARGEN = 5.67             // margin-top de .sop-cuando (1.5 mm)
const FIJO = 403.1                     // padding de 14 mm ×2, los tres <h2>, el pie y los márgenes entre secciones
// Caracteres por línea, medidos sección por sección en el ancho real de cada una.
const CPL = { proceso: 32.5, cuando: 48.5, producto: 100.5, pasos: 108, decide: 49.5, errores: 51.5 }

const renglones = (texto, cpl) => Math.max(1, Math.ceil(String(texto || '').length / cpl))
const columna = (items, cpl) => items.length === 0
  ? 0
  : items.reduce((alto, t) => alto + renglones(t, cpl) * RENGLON, 0) + (items.length - 1) * GAP

export function altoEstimado(h) {
  const cabeza = Math.max(
    CABEZA_BASE + RENGLON_H1 * renglones(h.proceso, CPL.proceso)
      + (h.cuando ? CUANDO_MARGEN + RENGLON * renglones(h.cuando, CPL.cuando) : 0),
    CABEZA_MIN,
  )
  const producto = RENGLON_PROD * renglones(h.producto, CPL.producto)
  const pasos = columna(h.pasos, CPL.pasos)
  // "Quién decide qué" y "Errores que cuestan" van en dos columnas a la par:
  // el alto de esa fila es el de la más alta, no la suma.
  const cierre = Math.max(
    columna(h.decide.map((d) => `${d.situacion}. ${d.regla}`), CPL.decide),
    columna(h.errores, CPL.errores),
  )
  return FIJO + cabeza + producto + pasos + cierre
}

// LA HOJA DE PAPEL. El paquete del personal de aseo se imprime desde ESTA misma
// ruta —no hay un segundo sistema de impresión—, con dos diferencias: quién
// puede abrirla y el pie, que lleva tres firmas en tinta en vez de la del jefe
// entrenador. Las tres van en UNA FILA del grid: si envolvieran, el pie
// crecería y el presupuesto de alto de abajo dejaría de valer sin avisar.
test('la hoja de papel se marca, nombra a quién se le entrega y firma en tinta', () => {
  const base = { id: 'of-ase-9', titulo: 'Hoja suelta', roles: [], pfv: 'El producto.', bloques: [], drills: [] }
  const sinNombre = derivarSop(base)
  assert.equal(sinNombre.papel, true)
  assert.deepEqual(sinNombre.aplicaA, [], 'sin roles y sin sop.aplicaA no hay a quién nombrar: la hoja lo declara vacío, no lo inventa')

  const conNombre = derivarSop({ ...base, sop: { proceso: 'P', aplicaA: ['Personal de Aseo'], pasos: ['Uno.'] } })
  assert.deepEqual(conNombre.aplicaA, ['Personal de Aseo'], 'el nombre del puesto que no es rol del sistema solo puede venir escrito')
  assert.equal(conNombre.papel, true)

  // Y un módulo con roles NUNCA es de papel, aunque escriba aplicaA.
  const normal = derivarSop({ ...base, roles: ['asistente'], sop: { proceso: 'P', aplicaA: ['Otra cosa'], pasos: ['Uno.'] } })
  assert.equal(normal.papel, false)

  const hoja = readFileSync(new URL('../components/entrenamiento/SopHoja.js', import.meta.url), 'utf8')
  assert.match(hoja, /hoja\.papel \? ' sop-firmas--papel' : ''/, 'el pie de papel tiene que pedir su propia rejilla')
  assert.match(hoja, /Quien lo recibió/, 'firma quien recibió el entrenamiento')
  assert.match(hoja, /Quien lo tomó/, 'y firma quien se lo tomó')
  const papelCss = bloqueCss('.sop-firmas--papel')
  assert.match(papelCss, /grid-template-columns:\s*minmax\(0, 1fr\) minmax\(0, 1fr\) 34mm/, 'tres columnas en UNA fila: el pie no puede crecer')
})

test('el CSS del que cuelga la estimación no se movió', () => {
  const hoja = bloqueCss('.sop-hoja')
  assert.match(hoja, /width:\s*210mm/, 'la hoja dejó de medir 210 mm de ancho: vuelve a medir los CPL')
  assert.match(hoja, /min-height:\s*297mm/, 'la hoja dejó de medir una A4')
  assert.match(hoja, /padding:\s*14mm/, 'cambiaron los márgenes de la hoja: vuelve a medir')
  assert.match(hoja, /font-size:\s*0\.78rem/, 'cambió el cuerpo de la hoja: vuelve a medir los CPL')
  assert.match(hoja, /line-height:\s*1\.42/, 'cambió el interlineado: vuelve a medir el renglón')
  assert.match(bloqueCss('.sop-proceso'), /font-size:\s*1\.32rem/)
  assert.match(bloqueCss('.sop-producto p'), /font-size:\s*0\.86rem/)
  assert.match(bloqueCss('.sop-cierre'), /grid-template-columns:\s*1fr 1fr/, 'decide y errores van a la par: si dejan de ir, la fórmula suma en vez de tomar el máximo')
  assert.match(bloqueCss('.sop-pasos'), /gap:\s*1\.7mm/)
  // Y el facsímil sigue midiendo una A4 en pantalla ancha: si se encogiera, la
  // vista previa mentiría sobre lo que cabe.
  assert.match(css, /@media screen and \(max-width: 899px\)/, 'debajo de 900 px la hoja fluye en una columna para poder leerse en el teléfono')
})

test('cada hoja del oficio cabe en una A4', () => {
  const desbordan = []
  for (const m of MODULOS_OFICIO) {
    const alto = altoEstimado(derivarSop(m))
    if (alto > A4_PX) desbordan.push(`${m.id} ≈ ${Math.round(alto)} px`)
  }
  assert.deepEqual(
    desbordan, [],
    `estas hojas no caben en una página (A4 = ${Math.round(A4_PX)} px). Un SOP de dos hojas no se usa: parte el procedimiento en dos procesos, o saca de la hoja lo que ya vive en otra`,
  )
})

test('la estimación reconoce la hoja que de verdad se desbordaba', () => {
  // El caso real: of-cen-9 con sus dos puntos de decisión de permisos puestos
  // de vuelta. Medido en Chrome con el CSS real, así medía 1148 px contra los
  // 1122,5 de una A4. Si la estimación no lo ve, no sirve para lo que se hizo.
  const cen9 = moduloOficio('of-cen-9')
  const conPermisos = derivarSop({
    ...cen9,
    sop: {
      ...cen9.sop,
      decide: [
        ...cen9.sop.decide,
        { situacion: 'Una solicitud de permiso', regla: 'Por escrito y con mínimo 3 días de anticipación. La evalúas para que no entorpezca el funcionamiento normal y estás en tu derecho de negarla. Solo queda autorizada con tu firma.' },
        { situacion: 'El pago del tiempo del permiso', regla: 'El permiso justifica al empleado, pero no justifica el pago: no se paga tiempo por tiempo salvo días puente, no se rebaja de vacaciones y se descuenta automáticamente del salario.' },
      ],
    },
  })
  assert.equal(conPermisos.decide.length, TOPE.decide)
  const antes = altoEstimado(conPermisos)
  const ahora = altoEstimado(derivarSop(cen9))
  assert.ok(antes > A4_PX, `la estimación tiene que ver desbordarse la hoja que se desbordaba (estimó ${Math.round(antes)} px)`)
  assert.ok(ahora <= A4_PX, `y tiene que ver caber la que cabe (estimó ${Math.round(ahora)} px)`)
})
