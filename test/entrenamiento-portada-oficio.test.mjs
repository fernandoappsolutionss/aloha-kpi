// PORTADA DEL MÓDULO DE OFICIO — objetivo, temario y diapositivas.
// Réplica en clave HCA de la cabecera del Moodle de training.alohavenezuela.com.
//
// Vive aparte de entrenamiento-oficio.test.mjs (que blinda el contrato del
// módulo entero) para no cruzarse con el frente que mantiene ese archivo.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  MODULOS_OFICIO, metadatosOficio, temarioDe, objetivoDe, pfvAparte,
  laminasDe, SUBS_ANDAMIAJE, LIMITES_LAMINA,
} from '../lib/entrenamiento/oficio/catalogo.js'

const lee = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
// Estos archivos están comentados a conciencia y los comentarios NOMBRAN lo que
// el test prohíbe ("sin overflow", "ni 'use client'"). Se miden las
// declaraciones, no la prosa que las explica.
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// ── LA DEUDA, CONTADA ─────────────────────────────────────────────────────
// Los módulos cuyo temario DERIVADO queda pobre (menos de 4 temas informativos,
// una vez descontado el andamiaje) y que por eso deben declarar `temario`.
// Esta lista está aquí para que la deuda se vea y se pueda contar, no para que
// se olvide: en cuanto el frente de contenido le escriba el temario a uno, el
// test falla pidiendo que salga de aquí. Medido sobre los 40 módulos.
const TEMARIO_PENDIENTE = new Set([
  // Los cuatro de normativa (of-nor-3, of-nor-4, of-nor-8 y of-nor-9) ya
  // declaran su `temario` escrito a mano: salieron de esta lista.
  // Los ocho de zoho (of-zoh-2, 3, 4, 6, 7, 8, 11 y 13) ya declaran su
  // `temario` escrito a mano: salieron de esta lista.
  // Los dos de centro (of-cen-11 y of-cen-13) ya declaran su `temario`
  // escrito a mano: salieron de esta lista.
])

const MIN_TEMAS = 4

// ── 1. DERIVACIÓN ─────────────────────────────────────────────────────────
test('temarioDe: deriva de los `sub`, descuenta el andamiaje y el campo manda', () => {
  const conSubs = {
    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'prosa que no es un tema' },
      { t: 'sub', texto: 'Historia' },
      { t: 'tabla', encabezados: ['a'], filas: [['b']], titulo: 'Tampoco es un tema' },
      { t: 'sub', texto: 'La palabra **ALOHA**' },
    ],
  }
  assert.deepEqual(temarioDe(conSubs), ['Historia', 'La palabra ALOHA'], 'ni andamiaje, ni títulos de tabla, ni asteriscos')
  assert.deepEqual(temarioDe({ ...conSubs, temario: ['Uno', 'Dos'] }), ['Uno', 'Dos'], 'el campo `temario` gana sobre la derivación')
  assert.deepEqual(temarioDe({ ...conSubs, temario: [] }), ['Historia', 'La palabra ALOHA'], 'un temario vacío no borra la derivación')
  assert.deepEqual(temarioDe({}), [])
  assert.deepEqual(temarioDe(null), [])
})

test('objetivoDe / pfvAparte: el objetivo por defecto ES el PFV, y nunca se dice dos veces', () => {
  const m = { pfv: 'Puedes armar el cuadro de cierre sin ayuda.' }
  assert.equal(objetivoDe(m), m.pfv, 'sin campo `objetivo`, el PFV hace de objetivo')
  assert.equal(pfvAparte(m), '', 'y entonces NO se repite abajo con otro rótulo')
  const conObjetivo = { ...m, objetivo: 'Conocer el flujo del dinero del Centro.' }
  assert.equal(objetivoDe(conObjetivo), conObjetivo.objetivo)
  assert.equal(pfvAparte(conObjetivo), m.pfv, 'con objetivo propio, el PFV sí se muestra aparte')
  assert.equal(objetivoDe({}), '')
})

// ── 2. LOS 40 MÓDULOS ─────────────────────────────────────────────────────
test('todo módulo tiene objetivo, y su temario no arrastra andamiaje', () => {
  for (const m of MODULOS_OFICIO) {
    assert.ok(objetivoDe(m).length > 10, `${m.id}: sin objetivo utilizable`)
    for (const t of temarioDe(m)) {
      assert.ok(t.length > 0, `${m.id}: tema vacío en el temario`)
      assert.ok(!SUBS_ANDAMIAJE.has(t), `${m.id}: "${t}" es andamiaje de la página, no un tema`)
      assert.ok(!t.includes('<'), `${m.id}: "<" en el temario`)
      assert.ok(!t.includes('**'), `${m.id}: negrita en el temario → "${t}"`)
      assert.ok(t.length <= 90, `${m.id}: tema de ${t.length} caracteres, no es un título → "${t}"`)
    }
  }
})

// LA RED DE SEGURIDAD. Un temario de una línea, o de puras frases de
// andamiaje, no le dice nada al que va a estudiar — y es exactamente lo que
// Fernando quiere replicar del Moodle. Que se entere el equipo al correr los
// tests, no el alumno al abrir la página.
test('temario: o lo declara el módulo, o los `sub` dan al menos 4 temas informativos', () => {
  const pobres = []
  for (const m of MODULOS_OFICIO) {
    const declara = Array.isArray(m.temario) && m.temario.length > 0
    if (declara) {
      assert.ok(
        !TEMARIO_PENDIENTE.has(m.id),
        `${m.id}: ya declara temario → bórralo de TEMARIO_PENDIENTE en este test`,
      )
      assert.ok(m.temario.length >= 3, `${m.id}: un temario declarado de ${m.temario.length} líneas no vale la duplicación; o lo escribes completo o lo dejas derivar`)
      continue
    }
    if (temarioDe(m).length < MIN_TEMAS) pobres.push(m.id)
  }
  assert.deepEqual(
    pobres.sort(),
    [...TEMARIO_PENDIENTE].sort(),
    'estos módulos derivan un temario pobre (menos de 4 temas informativos) y no declaran `temario`: escríbeselo, o si es deuda conocida agrégalo a TEMARIO_PENDIENTE',
  )
})

test('metadatosOficio lleva el temario al índice sin filtrar prosa', () => {
  for (const m of MODULOS_OFICIO) {
    const meta = metadatosOficio(m)
    assert.deepEqual(meta.temario, temarioDe(m), `${m.id}: el temario del índice y el de la página no coinciden`)
    assert.equal(meta.bloques, undefined, `${m.id}: los bloques no viajan al índice`)
    assert.equal(meta.laminas, undefined, `${m.id}: las láminas no viajan al índice`)
  }
})

// ── 3. DIAPOSITIVAS ───────────────────────────────────────────────────────
test('láminas: forma cerrada y topes que garantizan que la lámina se ve completa', () => {
  const CAMPOS = new Set(['kicker', 'titulo', 'texto', 'items', 'cierre'])
  for (const m of MODULOS_OFICIO) {
    const lams = laminasDe(m)
    if (lams.length === 0) continue // un módulo sin láminas no pinta el carrusel
    const [min, max] = LIMITES_LAMINA.porModulo
    assert.ok(lams.length >= min && lams.length <= max, `${m.id}: ${lams.length} láminas (${min}..${max})`)
    lams.forEach((l, i) => {
      const donde = `${m.id} lámina ${i + 1}`
      for (const k of Object.keys(l)) assert.ok(CAMPOS.has(k), `${donde}: campo desconocido "${k}"`)
      assert.ok(l.titulo, `${donde}: sin título`)
      assert.ok(l.titulo.length <= LIMITES_LAMINA.titulo, `${donde}: título de ${l.titulo.length} caracteres`)
      if (l.kicker) assert.ok(l.kicker.length <= LIMITES_LAMINA.kicker, `${donde}: kicker de ${l.kicker.length} caracteres`)
      if (l.texto) assert.ok(l.texto.length <= LIMITES_LAMINA.texto, `${donde}: texto de ${l.texto.length} caracteres, no cabe sin scroll`)
      if (l.cierre) assert.ok(l.cierre.length <= LIMITES_LAMINA.cierre, `${donde}: cierre de ${l.cierre.length} caracteres`)
      if (l.items) {
        assert.ok(Array.isArray(l.items) && l.items.length <= LIMITES_LAMINA.items, `${donde}: ${l.items?.length} items (máx ${LIMITES_LAMINA.items})`)
        for (const it of l.items) assert.ok(it && it.length <= LIMITES_LAMINA.item, `${donde}: item de ${it?.length} caracteres`)
      }
      assert.ok(l.texto || (l.items || []).length > 0, `${donde}: una lámina con solo título no explica nada`)
      // Mismos invariantes que los bloques: nada de HTML y nada de negrita
      // (el parser de **negrita** es 'use client' y estas se pintan en el servidor).
      for (const s of [l.kicker, l.titulo, l.texto, l.cierre, ...(l.items || [])]) {
        if (!s) continue
        assert.ok(!s.includes('<'), `${donde}: "<" en el contenido`)
        assert.ok(!s.includes('**'), `${donde}: negrita, que aquí no se renderiza → "${s.slice(0, 50)}"`)
      }
    })
  }
})

// ── 4. LA REGLA "SIN LIBRERÍAS", HECHA EJECUTABLE ─────────────────────────
test('el carrusel es CSS puro: ni librería, ni estado, ni una línea de JS', () => {
  const src = sinComentarios(lee('../components/entrenamiento/Diapositivas.js'))
  assert.doesNotMatch(src, /'use client'|"use client"/, 'Diapositivas es Server Component: las láminas no van al bundle')
  assert.doesNotMatch(src, /useState|useEffect|useRef|onClick|onScroll/, 'el carrusel no lleva estado ni handlers: lo mueve el navegador')
  assert.doesNotMatch(src, /^import .*from ['"](?!\.)/m, 'Diapositivas no importa nada de node_modules')
  // Enfocable con nombre accesible, y cada lámina alcanzable por ancla.
  assert.match(src, /tabIndex=\{0\}/)
  assert.match(src, /aria-label=/)
  assert.match(src, /href=\{`#\$\{idDe\(i\)\}`\}/, 'el índice son anclas de verdad, no botones con JS')
})

test('el CSS del carrusel hace el trabajo: scroll-snap, foco visible y láminas sin scroll interno', () => {
  const css = sinComentarios(lee('../app/globals.css'))
  const cinta = css.slice(css.indexOf('.ofi-slides__cinta {')).split('}')[0]
  assert.match(cinta, /scroll-snap-type:\s*x mandatory/)
  assert.match(cinta, /overflow-x:\s*auto/)
  const lam = css.slice(css.indexOf('.ofi-slides__lam {')).split('}')[0]
  assert.match(lam, /scroll-snap-align:\s*center/)
  // La promesa "cada lámina se ve completa": si tuviera overflow propio,
  // scrollearía por dentro y dejaría contenido escondido.
  assert.doesNotMatch(lam, /overflow/, 'la lámina no puede scrollear por dentro')
  assert.match(css, /\.ofi-slides__cinta:focus-visible/, 'un contenedor enfocable necesita foco visible')
  // NADA de scroll-behavior en la cinta. Medido en Chrome con estas mismas
  // reglas: `scroll-behavior: smooth` junto a scroll-snap congela el contenedor
  // para todo lo que no venga del dedo — las flechas, Inicio/Fin y el
  // scrollIntoView del ancla del índice dejan scrollLeft en 0 —, y pasa igual
  // con `x proximity`. Esta línea antes BLINDABA la regla que rompía el
  // carrusel: solo funcionaba para quien pedía menos animación, porque el
  // bloque global de prefers-reduced-motion la anulaba.
  // El lookbehind evita casar `overscroll-behavior-x`, que sí va y es otra cosa.
  assert.doesNotMatch(cinta, /(?<![\w-])scroll-behavior\s*:/, 'la cinta no puede declarar scroll-behavior: con scroll-snap congela el teclado y el índice')
  // 44px de blanco táctil en los números del índice, como el resto del móvil.
  const indice = css.slice(css.indexOf('.ofi-slides__indice a {')).split('}')[0]
  assert.match(indice, /min-width:\s*44px/)
  assert.match(indice, /min-height:\s*44px/)
})

// ── 5. LA RESTRICCIÓN DICE LA VERDAD ──────────────────────────────────────
// El candado del Moodle ("No disponible hasta que…") solo se puede pintar
// sobre una guarda que el SERVIDOR aplique de verdad. Si alguien afloja la
// guarda y deja el candado, la pantalla miente.
test('la restricción que pinta la portada es la que el servidor aplica', () => {
  const portada = sinComentarios(lee('../components/entrenamiento/PortadaModulo.js'))
  const actions = sinComentarios(lee('../app/actions/entrenamiento-oficio.js'))
  assert.match(portada, /No disponible hasta que:/)
  // Lección y Cuestionario: el gradiente.
  assert.match(actions, /export async function marcarEstudiado[\s\S]*?gradienteAbierto\(m, previo\)/)
  assert.match(actions, /export async function responderQuizOficio[\s\S]*?gradienteAbierto\(m, progreso\)/)
  // Drill: lección marcada Y cuestionario aprobado (eso es estudiado()).
  assert.match(actions, /export async function firmarDrill[\s\S]*?if \(!estudiado\(suyo\[modulo\]\)\)/)
  assert.match(portada, /RESTRICCION_DRILL = 'la Lección esté marcada como realizada y el Cuestionario aprobado\.'/)
})
