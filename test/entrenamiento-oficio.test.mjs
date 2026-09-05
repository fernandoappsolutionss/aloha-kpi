// ANDAMIAJE del entrenamiento de OFICIO: el contrato de forma + el motor puro.
//
// NACIÓ pasando en verde con el catálogo VACÍO —sus aserciones eran "para cada
// módulo…", vacuamente ciertas mientras no hubiera contenido— y esa comodidad
// costó caro: con el Coach y el Coordinador escritos pero sin enchufar, la
// suite daba 960 verdes mientras dos de los cuatro puestos leían "tu puesto
// todavía no lleva plan cargado". Un test que pasa con la mitad del producto
// apagado mide actividad, no producto.
//
// Por eso ahora hay pisos: todo curso declarado tiene módulos, todo puesto que
// se entrena tiene plan y puerta, y el módulo de papel existe de verdad. Lo que
// exige VOLUMEN y trazabilidad línea a línea contra docs/entrenamiento/fuente/
// (cobertura del banco GIFT, que cada bloque venga de una línea del Manual) no
// está escrito todavía: no lo delegues a un archivo que no existe — hasta que
// se escriba, esa red no está puesta.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MODULOS } from '../lib/entrenamiento/modulos.js'
import { MODULOS_OFICIO, CURSOS, ID_OFICIO, MODULO_IDS_OFICIO, moduloOficio, metadatosOficio } from '../lib/entrenamiento/oficio/catalogo.js'
import { GLOSARIO } from '../lib/entrenamiento/oficio/glosario.js'
import { RESPUESTAS_OFICIO } from '../lib/entrenamiento/respuestas-oficio/todas.js'
import {
  UMBRAL, minimoAprobacion, corregirQuizOficio, estudiado, firmado, hatted,
  planDeRol, avanceOficio, siguienteOficio, gradienteAbierto, marcarTerminos,
  OFICIAL_DE, puedeFirmar, rolesQueFirma, esDePapel, rolesDelPapel,
  ROLES_CON_PLAN, tienePlanPropio,
} from '../lib/entrenamiento/oficio/progreso.js'

const ROOT = fileURLToPath(new URL('../', import.meta.url))
// Los puestos que se entrenan salen del CATÁLOGO, no de una lista a mano: eran
// dos, hoy son cuatro y el día que entre un quinto este archivo no se entera.
// Sigue pasando en verde con el catálogo vacío (queda en []).
const ROLES = [...new Set(MODULOS_OFICIO.flatMap((m) => m.roles || []))].sort()
const T_BLOQUE = new Set(['sub', 'p', 'lista', 'pasos', 'tabla', 'nota'])
const TONOS = new Set(['regla', 'ojo', 'alerta'])

// Recorre cada string de un módulo (textos, items, celdas, criterios…).
// EXCEPTO `voz`: ese campo no es contenido de pantalla, es el guion que se le
// manda a ElevenLabs, y lleva marcas de respiración <break time="0.3s"/> —
// obligatorias para que la locución no suene a robot. Nunca se pinta en el
// navegador (no viaja en metadatosOficio ni lo recibe ninguna isla cliente),
// así que el invariante anti-HTML de abajo no aplica ahí. Su forma la blinda
// test/entrenamiento-oficio-voz.test.mjs, que exige la marca y prohíbe el
// markdown, los "B/." y los "%".
const SIN_BARRIDO = new Set(['voz'])
function textos(v, out = []) {
  if (typeof v === 'string') out.push(v)
  else if (Array.isArray(v)) for (const x of v) textos(x, out)
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) { if (!SIN_BARRIDO.has(k)) textos(v[k], out) }
  return out
}

// ── 1. AISLAMIENTO ────────────────────────────────────────────────────────
// Las dos pistas escriben en la MISMA columna TEXT entrenamiento_progreso.modulo.
// Una colisión de ids mezclaría el progreso de dos módulos distintos sin error
// visible. Es el test más importante del archivo.
test('los ids de oficio llevan prefijo of- y no colisionan con los 9 tours', () => {
  for (const m of MODULOS_OFICIO) assert.match(m.id, ID_OFICIO, `id inválido: ${m.id}`)
  const idsTour = MODULOS.map((m) => m.id)
  const idsOficio = MODULOS_OFICIO.map((m) => m.id)
  assert.equal(new Set(idsOficio).size, idsOficio.length, 'ids de oficio repetidos')
  assert.equal(new Set([...idsTour, ...idsOficio]).size, idsTour.length + idsOficio.length, 'un id de oficio choca con un tour')
  assert.equal(MODULO_IDS_OFICIO.size, idsOficio.length)
  for (const id of idsOficio) assert.equal(moduloOficio(id).id, id)
  assert.equal(moduloOficio('meta'), null, 'moduloOficio no puede devolver un tour')
})

// ── 1 bis. NI UN CURSO FANTASMA, NI UN PUESTO APAGADO ─────────────────────
// CURSOS declaraba `aseo` con su bloque C, su título y su prefijo en ID_OFICIO
// —y BLOQUES se deriva de CURSOS, así que el checksheet pintaba un bloque C
// entero— sin que existiera un solo módulo con ese curso. No se veía en
// pantalla porque las dos pasadas hacen `if (suyos.length === 0) return null`:
// latente, y nada en la suite lo detectaba. Es una línea y cierra la clase.
test('todo curso declarado tiene módulos y todo puesto que se entrena tiene plan', () => {
  assert.ok(MODULOS_OFICIO.length > 0, 'el catálogo está vacío: ningún test de este archivo prueba nada')
  for (const id of Object.keys(CURSOS)) {
    const suyos = MODULOS_OFICIO.filter((m) => m.curso === id)
    assert.ok(suyos.length > 0, `curso "${id}" declarado en CURSOS y sin un solo módulo: pinta su bloque en el checksheet y no tiene nada dentro`)
  }
  assert.ok(ROLES.length > 0, 'ningún módulo declara roles: los planes están todos vacíos')
  for (const rol of ROLES) {
    assert.ok(planDeRol(rol, MODULOS_OFICIO).length > 0, `${rol} aparece en los roles del catálogo y su plan sale vacío`)
  }
})

// ── 2. NO SON TOURS ───────────────────────────────────────────────────────
test('ningún módulo de oficio tiene pasos ni inicio (no es un pseudo-tour)', () => {
  for (const m of MODULOS_OFICIO) {
    assert.equal(m.pasos, undefined, `${m.id}: un módulo de oficio no lleva pasos`)
    assert.equal(m.inicio, undefined, `${m.id}: un módulo de oficio no lleva inicio.ruta`)
    assert.equal(m.target, undefined, `${m.id}: un módulo de oficio no apunta a data-tour`)
  }
})

// ── 3. FORMA ──────────────────────────────────────────────────────────────
test('forma del módulo: curso, roles, orden, duración, masa, palabras, drills y fuente', () => {
  for (const m of MODULOS_OFICIO) {
    assert.ok(CURSOS[m.curso], `${m.id}: curso desconocido ${m.curso}`)
    // `roles: []` es LEGAL y es el módulo DE PAPEL: no está en el plan de nadie
    // porque la persona que lo recibe (el aseo) no tiene cuenta en el sistema.
    // Lo que no puede es fallar el tipo.
    assert.ok(Array.isArray(m.roles), `${m.id}: roles tiene que ser un array`)
    for (const r of m.roles) assert.ok(CURSOS[m.curso].roles.includes(r), `${m.id}: rol ${r} fuera de su curso`)
    assert.ok(Number.isInteger(m.orden) && m.orden > 0, `${m.id}: orden`)
    assert.ok(m.titulo, `${m.id}: título`)
    assert.ok(Number.isInteger(m.duracionMin) && m.duracionMin > 0, `${m.id}: duracionMin`)
    assert.ok(Array.isArray(m.bloques) && m.bloques.length >= 3, `${m.id}: mínimo 3 bloques`)
    assert.ok(Array.isArray(m.masa) && m.masa.length >= 1 && m.masa.length <= 6, `${m.id}: masa 1..6`)
    assert.ok(Array.isArray(m.palabras) && m.palabras.length >= 1 && m.palabras.length <= 12, `${m.id}: palabras 1..12`)
    assert.ok(Array.isArray(m.drills) && m.drills.length <= 4, `${m.id}: drills 0..4`)
    assert.ok(Array.isArray(m.fuente) && m.fuente.length > 0, `${m.id}: fuente vacía`)
    assert.ok(Array.isArray(m.requiere), `${m.id}: requiere debe ser array`)
    assert.equal(m.minimoAprobacion, undefined, `${m.id}: minimoAprobacion no se escribe, se calcula`)
  }
  // El orden es único DENTRO del plan de cada rol (los dos hats comparten el 13).
  for (const rol of ROLES) {
    const ordenes = planDeRol(rol, MODULOS_OFICIO).map((m) => m.orden)
    assert.equal(new Set(ordenes).size, ordenes.length, `${rol}: dos módulos con el mismo orden`)
  }
})

// ── 4. BLOQUES ────────────────────────────────────────────────────────────
test('bloques: vocabulario cerrado, tablas cuadradas y NI UN "<" en todo el contenido', () => {
  for (const m of MODULOS_OFICIO) {
    for (const b of m.bloques) {
      assert.ok(T_BLOQUE.has(b.t), `${m.id}: tipo de bloque desconocido "${b.t}"`)
      if (b.t === 'sub' || b.t === 'p') assert.ok(b.texto, `${m.id}: ${b.t} sin texto`)
      if (b.t === 'lista' || b.t === 'pasos') {
        assert.ok(Array.isArray(b.items) && b.items.length > 0, `${m.id}: ${b.t} sin items`)
        for (const it of b.items) assert.ok(it, `${m.id}: item vacío en ${b.t}`)
      }
      if (b.t === 'tabla') {
        assert.ok(Array.isArray(b.encabezados) && b.encabezados.length > 0, `${m.id}: tabla sin encabezados`)
        for (const fila of b.filas || []) assert.equal(fila.length, b.encabezados.length, `${m.id}: fila de tabla con otro ancho`)
      }
      if (b.t === 'nota') {
        assert.ok(TONOS.has(b.tono), `${m.id}: tono de nota "${b.tono}"`)
        assert.ok(b.titulo && b.texto, `${m.id}: nota sin título o texto`)
      }
    }
    // Invariante duro: nada de HTML crudo en los datos. Sin '<' no hay
    // dangerouslySetInnerHTML posible ni camino a inyección.
    for (const s of textos(m)) assert.ok(!s.includes('<'), `${m.id}: "<" en el contenido → ${s.slice(0, 60)}`)
  }
  for (const g of Object.values(GLOSARIO)) {
    for (const s of textos(g)) assert.ok(!s.includes('<'), `glosario: "<" en → ${s.slice(0, 60)}`)
  }
})

// ── 5. QUIZ ───────────────────────────────────────────────────────────────
// El rango 4..10 se le exige al módulo QUE SE ESTUDIA EN PANTALLA. El módulo
// DE PAPEL no lleva cuestionario y no es un olvido: quien lo recibe no tiene
// cuenta en el sistema, así que no hay nadie que pueda responderlo (lo blinda
// el test 10 bis, que le exige `quiz: []`). Su clave sí existe y es `[]`, para
// que las claves y el catálogo sigan cuadrando módulo por módulo — que es la
// aserción del final de este test.
test('quiz: 4-10 preguntas, sin el índice correcto en el cliente, y clave completa', () => {
  for (const m of MODULOS_OFICIO) {
    const enPantalla = !esDePapel(m)
    if (enPantalla) assert.ok(m.quiz.length >= 4 && m.quiz.length <= 10, `${m.id}: ${m.quiz.length} preguntas (4..10)`)
    for (const q of m.quiz) {
      assert.ok(q.pregunta && q.explicacion, `${m.id}: pregunta o explicación vacía`)
      assert.ok(q.opciones.length >= 2 && q.opciones.length <= 4, `${m.id}: opciones 2..4`)
      assert.equal(q.correcta, undefined, `${m.id}: el índice correcto NO va en el archivo del módulo`)
      for (const slug of q.repasa || []) assert.ok(GLOSARIO[slug], `${m.id}: repasa → ${slug} no existe en GLOSARIO`)
    }
    const r = RESPUESTAS_OFICIO[m.id]
    assert.ok(Array.isArray(r) && r.length === m.quiz.length, `${m.id}: RESPUESTAS_OFICIO con otro largo`)
    r.forEach((idx, i) => assert.ok(Number.isInteger(idx) && idx >= 0 && idx < m.quiz[i].opciones.length, `${m.id} q${i + 1}: índice ${idx} fuera de rango`))
  }
  assert.deepEqual(Object.keys(RESPUESTAS_OFICIO).sort(), MODULOS_OFICIO.map((m) => m.id).sort())
})

// ── 5 bis. ANTIDEGENERACIÓN ───────────────────────────────────────────────
// En el banco GIFT la correcta va siempre primera; el importador la coloca en
// una posición determinista. Si un módulo queda con el mínimo de respuestas en
// el MISMO índice, el quiz se aprueba eligiendo siempre esa opción sin haber
// leído nada — que es exactamente lo que la colocación existe para impedir.
// Pasó de verdad: of-zoh-7 salió [2,0,0,0] con 4 preguntas y mínimo 3.
test('quiz: ningún módulo se aprueba eligiendo siempre la misma opción', () => {
  for (const m of MODULOS_OFICIO) {
    const clave = RESPUESTAS_OFICIO[m.id]
    const minimo = minimoAprobacion(clave.length)
    const cuenta = {}
    for (const idx of clave) cuenta[idx] = (cuenta[idx] || 0) + 1
    for (const [idx, n] of Object.entries(cuenta)) {
      assert.ok(n < minimo, `${m.id}: eligiendo siempre la opción ${Number(idx) + 1} se acierta ${n} de ${clave.length} y el mínimo es ${minimo}`)
    }
  }
})

// ── 5 ter. LA FUENTE SE PUEDE ABRIR ───────────────────────────────────────
// `fuente` es la promesa de que cada módulo se puede auditar contra el material
// del que salió. Los cursos del Coach y del aseo la declaraban contra archivos
// que vivían FUERA del repo (curso-4-coach.html y curso-6-apoyo-aseo.html
// estaban solo en plataformas/aloha/training-moodle/), así que la clave de
// respuestas del Coach no se podía revisar desde aquí — que es exactamente lo
// que su cabecera promete que se puede hacer.
//
// Solo se comprueban los .html y .gift del banco: `manual-operaciones-completo.md`
// vive fuera del repo a propósito (es el Manual de la empresa), los `lib/…` y
// `app/…` son rutas de este código, y los tres anclajes sin extensión son
// fuentes habladas del dueño o hallazgos del sistema, que no son archivos.
test('cada archivo de banco que un módulo declara como fuente existe en docs/entrenamiento/fuente/', () => {
  const enDisco = new Set(readdirSync(join(ROOT, 'docs/entrenamiento/fuente')))
  const faltan = new Set()
  for (const m of MODULOS_OFICIO) {
    for (const f of m.fuente || []) {
      const archivo = String(f).split('#')[0]
      if (!/\.(html|gift)$/.test(archivo)) continue
      if (!enDisco.has(archivo)) faltan.add(`${archivo} (lo declara ${m.id})`)
    }
  }
  assert.deepEqual([...faltan].sort(), [], 'estos módulos dicen venir de un archivo que no está en el repo: su contenido y su clave de respuestas no se pueden auditar desde aquí')
})

// ── 6. GRADIENTE SIN CICLOS ───────────────────────────────────────────────
test('gradiente: todo `requiere` aparece ANTES en el plan de cada rol', () => {
  for (const rol of ROLES) {
    const plan = planDeRol(rol, MODULOS_OFICIO)
    const vistos = new Set()
    for (const m of plan) {
      for (const req of m.requiere || []) {
        assert.ok(vistos.has(req), `${rol}/${m.id}: requiere ${req}, que no está antes en su plan`)
      }
      vistos.add(m.id)
    }
    if (plan.length > 0) {
      const abiertos = plan.filter((m) => gradienteAbierto(m, {}))
      assert.equal(abiertos.length, 1, `${rol}: con progreso vacío debe haber exactamente 1 módulo abierto`)
      assert.equal(abiertos[0].id, plan[0].id, `${rol}: el módulo abierto no es el primero del plan`)
      assert.equal(siguienteOficio(plan, {}).id, plan[0].id)
    }
  }
  // El motor, sobre un plan sintético: siguienteOficio nunca salta un cerrado.
  const done = { tourVistoAt: 'x', quizAprobadoAt: 'y' }
  const plan = [
    { id: 'a', requiere: [], drills: [] },
    { id: 'b', requiere: ['a'], drills: [] },
    { id: 'c', requiere: ['b'], drills: [] },
  ]
  assert.equal(siguienteOficio(plan, {}).id, 'a')
  assert.equal(siguienteOficio(plan, { a: done }).id, 'b')
  assert.equal(siguienteOficio(plan, { a: done, b: done, c: done }), null)
  assert.equal(gradienteAbierto(plan[1], {}), false)
  assert.equal(gradienteAbierto(plan[1], { a: { tourVistoAt: 'x' } }), false, 'ver el módulo sin aprobar el quiz no abre el siguiente')
  assert.equal(gradienteAbierto(plan[1], { a: done }), true)
  // La firma del anterior NO bloquea: si bloqueara, un centro entero se traba
  // el lunes que la administradora no entra.
  assert.equal(gradienteAbierto({ id: 'z', requiere: ['a'] }, { a: done }), true)
})

// ── 7. PLAN POR ROL (criterio 2 de Fernando, blindado) ────────────────────
test('el plan de cada rol es el suyo: la asistente no ve el curso del Centro ni al revés', () => {
  const asistente = planDeRol('asistente', MODULOS_OFICIO)
  const administradora = planDeRol('administradora', MODULOS_OFICIO)
  assert.ok(!asistente.some((m) => m.curso === 'centro'), 'la asistente no lleva el curso del Centro')
  assert.ok(!asistente.some((m) => m.id === 'of-cen-10'), 'of-cen-10 (Supervisión de nómina) no es de la asistente')
  assert.ok(!administradora.some((m) => m.curso === 'zoho'), 'la administradora no lleva el curso de Zoho')
  // Ningún puesto lleva el curso B de otro puesto. Es el criterio 2 de Fernando
  // y ahora hay cuatro planes, no dos: el Coach no ve Zoho ni el Centro, y el
  // Coordinador no ve el curso del Coach.
  const CURSO_B_DE = { administradora: 'centro', asistente: 'zoho', coach: 'coach', coordinador: 'coordinacion' }
  for (const rol of ROLES) {
    const plan = planDeRol(rol, MODULOS_OFICIO)
    for (const [otro, curso] of Object.entries(CURSO_B_DE)) {
      if (otro === rol) continue
      assert.ok(!plan.some((m) => m.curso === curso), `${rol} no puede llevar el curso "${curso}", que es de ${otro}`)
    }
  }
  // Gerencia no se entrena: firma. (El coordinador SÍ tiene plan propio ahora.)
  for (const rol of ['admin_general', 'supervisor']) {
    assert.deepEqual(planDeRol(rol, MODULOS_OFICIO), [], `${rol} no debe tener plan`)
  }
  // Y los módulos DE PAPEL no están en el plan de NADIE, ni siquiera de quien
  // los reparte: se imprimen, no se estudian en pantalla.
  const papel = MODULOS_OFICIO.filter(esDePapel)
  for (const rol of [...ROLES, 'admin_general', 'supervisor']) {
    const plan = planDeRol(rol, MODULOS_OFICIO)
    for (const m of papel) assert.ok(!plan.some((x) => x.id === m.id), `${m.id} es de papel y se coló en el plan de ${rol}`)
  }
  // Si el método ya está cargado, es por donde empiezan los dos.
  if (MODULO_IDS_OFICIO.has('of-met-1')) {
    assert.equal(asistente[0].id, 'of-met-1')
    assert.equal(administradora[0].id, 'of-met-1')
  }
  // metadatosOficio no filtra prosa al índice.
  for (const m of MODULOS_OFICIO) {
    const meta = metadatosOficio(m)
    assert.equal(meta.bloques, undefined)
    assert.equal(meta.quiz, undefined)
    assert.equal(typeof meta.drills, 'number')
  }
})

// ── 7 bis. LA PUERTA AL PROPIO PLAN ───────────────────────────────────────
// Un puesto puede tener sus 23 módulos cargados y NINGUNA forma de llegar a
// ellos. Le pasó al Coordinador Operativo: es `isPanel`, su menú es adminItems,
// y ahí no había una sola ruta a /centro/<id>/entrenamiento/oficio. El catálogo
// estaba bien y la persona leía "tu puesto todavía no lleva plan cargado".
//
// El menú es 'use client' y no puede importar el catálogo (test 13), así que
// pregunta por tienePlanPropio(), que sale de OFICIAL_DE. Esto amarra esa lista
// contra los `roles` del catálogo: si entra un quinto puesto, no puede quedarse
// sin puerta sin que CI lo diga.
test('todo puesto con plan propio tiene puerta en el menú', () => {
  assert.deepEqual(
    ROLES_CON_PLAN.slice().sort(), ROLES.slice().sort(),
    'ROLES_CON_PLAN (lo que el menú sabe) y los roles del catálogo se desincronizaron: hay un puesto con plan y sin puerta, o una puerta a un plan que no existe',
  )
  for (const rol of ROLES) {
    assert.ok(tienePlanPropio(rol), `${rol} tiene plan y el menú no le abre la puerta`)
    assert.ok(planDeRol(rol, MODULOS_OFICIO).length > 0, `${rol} tiene puerta a un plan vacío`)
  }
  for (const rol of ['supervisor', 'admin_general']) {
    assert.equal(tienePlanPropio(rol), false, `${rol} no se entrena: no puede llevar "Mi plan de puesto" en el menú`)
  }
  // Y el menú tiene que seguir preguntándolo, no listar puestos a mano.
  const sidebar = readFileSync(join(ROOT, 'components/Sidebar.js'), 'utf8')
  assert.match(sidebar, /tienePlanPropio\(actorRole\)/, 'el menú decide la puerta con tienePlanPropio, no con una lista de roles escrita ahí')
  assert.match(sidebar, /entrenamiento\/oficio`/, 'el menú no enlaza a ningún plan de puesto')
})

// ── 8. el método EN LOS DATOS ───────────────────────────────────────────────────
const VERBO_VAGO = /\b(entiende|sabe|conoce|comprende)\b/i
const VERBO_ACCION = /\b(hace|registra|explica|dice|arma|abre|llena|entrega|muestra|ejecuta|corrige|identifica|aplica|calcula|redacta|clasifica|ubica|anota|reporta|resuelve|demuestra|completa|revisa|firma|carga|emite|cierra|convierte|localiza|cita|responde|toma|coloca|verifica|separa|compara|prepara|actualiza|contacta|escribe|nombra|repite|simula|conduce|atiende)\b/i

test('método: lo que va a la vista, palabras del glosario y maniobras con criterios observables', () => {
  for (const m of MODULOS_OFICIO) {
    assert.ok(m.masa.length >= 1, `${m.id}: sin masa`)
    assert.ok(m.pfv && m.pfv.length > 10, `${m.id}: pfv vacío o de una palabra`)
    for (const slug of m.palabras) assert.ok(GLOSARIO[slug], `${m.id}: palabra "${slug}" no existe en GLOSARIO`)
    for (const d of m.drills) {
      assert.ok(d.titulo && d.proposito, `${m.id}: drill sin título o propósito`)
      assert.ok(Array.isArray(d.pasos) && d.pasos.length >= 3, `${m.id}: drill con menos de 3 pasos`)
      assert.ok(Array.isArray(d.criterios) && d.criterios.length >= 2, `${m.id}: drill con menos de 2 criterios`)
      assert.ok(d.errorTipico, `${m.id}: drill sin errorTipico`)
      for (const c of d.criterios) {
        const palabras = c.trim().split(/\s+/).length
        assert.ok(palabras >= 8, `${m.id}: criterio de ${palabras} palabras, no se puede firmar → "${c}"`)
        if (VERBO_VAGO.test(c)) {
          assert.ok(VERBO_ACCION.test(c), `${m.id}: criterio no observable (dice "entiende/sabe" sin una acción que se vea) → "${c}"`)
        }
      }
    }
  }
})

// ── 9. EL TEST QUE SOSTIENE LA DOCTRINA ───────────────────────────────────
test('hatted: aprobar el cuestionario NO es completar el hat si el módulo tiene drill', () => {
  const conDrill = { drills: [{ titulo: 'd' }] }
  const sinDrill = { drills: [] }
  const est = { tourVistoAt: 'x', quizAprobadoAt: 'y' }
  const estYFirmado = { ...est, drillFirmadoAt: 'z' }
  assert.equal(estudiado(est), true)
  assert.equal(firmado(est), false)
  assert.equal(hatted(est, conDrill), false, 'estudiado + quiz NO cierra un módulo con drill')
  assert.equal(hatted(estYFirmado, conDrill), true)
  assert.equal(hatted(est, sinDrill), true, 'un módulo sin drill se cierra al estudiarlo')
  // Firmado sin estudiar tampoco: el Oficial no puede saltarse el estudio.
  assert.equal(hatted({ drillFirmadoAt: 'z' }, conDrill), false)
  assert.equal(hatted({ tourVistoAt: 'x', drillFirmadoAt: 'z' }, conDrill), false)
  // Avance: las dos barras cuentan cosas distintas.
  const plan = [conDrill, sinDrill].map((m, i) => ({ ...m, id: `m${i}` }))
  assert.deepEqual(avanceOficio(plan, { m0: est, m1: est }), { estudiados: 2, hatted: 1, total: 2, pctEstudio: 100, pctHat: 50 })
  assert.deepEqual(avanceOficio([], {}), { estudiados: 0, hatted: 0, total: 0, pctEstudio: 0, pctHat: 0 })
})

// ── 10. FIRMA ─────────────────────────────────────────────────────────────
test('puedeFirmar: nadie se firma solo, ni una administradora de otro centro', () => {
  assert.ok(!OFICIAL_DE.asistente.includes('asistente'), 'un asistente no le firma a otro asistente')
  assert.ok(!OFICIAL_DE.administradora.includes('administradora'), 'una administradora no le firma a otra administradora')
  const alumnoAsi = { id: 2, rol: 'asistente', centroId: 7 }
  const alumnoAdm = { id: 3, rol: 'administradora', centroId: 7 }
  const admiMismo = { id: 1, rol: 'administradora', centroId: 7 }
  const admiOtro = { id: 4, rol: 'administradora', centroId: 9 }
  assert.equal(puedeFirmar(admiMismo, alumnoAsi), true)
  assert.equal(puedeFirmar(admiOtro, alumnoAsi), false, 'una administradora de OTRO centro no firma')
  assert.equal(puedeFirmar({ id: 2, rol: 'asistente', centroId: 7 }, alumnoAsi), false, 'auto-firma')
  assert.equal(puedeFirmar(admiMismo, { ...alumnoAsi, id: 1 }), false, 'auto-firma aunque el rol calce')
  assert.equal(puedeFirmar(admiMismo, alumnoAdm), false, 'una administradora no firma a otra administradora')
  assert.equal(puedeFirmar({ id: 5, rol: 'asistente', centroId: 7 }, alumnoAdm), false)
  // Gerencia: cualquier centro. Coordinador: solo los suyos.
  for (const rol of ['supervisor', 'admin_general']) {
    assert.equal(puedeFirmar({ id: 9, rol, centroId: null }, alumnoAdm), true)
    assert.equal(puedeFirmar({ id: 9, rol, centroId: 99 }, alumnoAsi), true)
  }
  assert.equal(puedeFirmar({ id: 8, rol: 'coordinador', centros: [7, 8] }, alumnoAdm), true)
  assert.equal(puedeFirmar({ id: 8, rol: 'coordinador', centros: [1, 2] }, alumnoAdm), false)
  assert.equal(puedeFirmar({ id: 8, rol: 'coordinador', centros: [] }, alumnoAdm), false)
  // Una administradora sin centro no firma a nadie "por defecto".
  assert.equal(puedeFirmar({ id: 1, rol: 'administradora', centroId: null }, { id: 2, rol: 'asistente', centroId: null }), false)
  assert.equal(puedeFirmar(null, alumnoAsi), false)
  assert.equal(puedeFirmar(admiMismo, null), false)
  // Quien no le firma a nadie: la asistente y el coach son el final de la línea.
  assert.deepEqual(rolesQueFirma('asistente'), [])
  assert.deepEqual(rolesQueFirma('coach'), [])
  assert.deepEqual(rolesQueFirma('administradora').sort(), ['asistente', 'coach'])
  assert.deepEqual(rolesQueFirma('coordinador').sort(), ['administradora', 'asistente', 'coach'])
  for (const rol of ['supervisor', 'admin_general']) {
    assert.deepEqual(rolesQueFirma(rol).sort(), ['administradora', 'asistente', 'coach', 'coordinador'], `${rol} firma a los cuatro puestos`)
  }
  // NADIE SE QUEDA SIN OFICIAL: los cuatro puestos que se entrenan tienen al
  // menos un firmante posible. Un puesto sin oficial no puede cerrar un módulo.
  for (const rol of ROLES) {
    assert.ok((OFICIAL_DE[rol] || []).length > 0, `${rol} se entrena y nadie le puede firmar el drill`)
    assert.ok(!OFICIAL_DE[rol].includes(rol), `${rol} no se puede firmar a sí mismo`)
  }
  // El coach lo firma su administradora, dentro del centro; la de otro no.
  const coach7 = { id: 20, rol: 'coach', centroId: 7 }
  assert.equal(puedeFirmar(admiMismo, coach7), true)
  assert.equal(puedeFirmar(admiOtro, coach7), false, 'una administradora de OTRO centro no le firma al coach')
  assert.equal(puedeFirmar({ id: 21, rol: 'coach', centroId: 7 }, coach7), false, 'un coach no le firma a otro coach')
  assert.equal(puedeFirmar({ id: 8, rol: 'coordinador', centros: [7] }, coach7), true)
  // Al coordinador solo lo firma la Junta Directiva: supervisor y admin_general.
  const coord = { id: 30, rol: 'coordinador', centroId: null }
  for (const rol of ['supervisor', 'admin_general']) {
    assert.equal(puedeFirmar({ id: 9, rol, centroId: null }, coord), true)
  }
  assert.equal(puedeFirmar({ id: 31, rol: 'coordinador', centros: [7] }, coord), false, 'un coordinador no le firma a otro coordinador')
  assert.equal(puedeFirmar(admiMismo, coord), false, 'una administradora no le firma a su coordinador')
})

// ── 10 bis. EL MÓDULO DE PAPEL ────────────────────────────────────────────
// El personal de aseo NO tiene cuenta: no entra a usuarios.rol y nunca escribe
// en entrenamiento_progreso. Su entrenamiento es papel con id.
test('los módulos de papel no piden cuenta, no piden quiz y solo los abre quien los reparte', () => {
  const papel = MODULOS_OFICIO.filter(esDePapel)
  // Sin esta línea el test entero itera sobre un array vacío y pasa en verde
  // sin ejercitar una sola de sus aserciones, que fue exactamente lo que pasó
  // mientras el paquete del aseo no existía.
  assert.ok(papel.length > 0, 'no hay ni un módulo de papel: este test no está probando nada')
  for (const m of papel) {
    assert.deepEqual(m.roles, [], `${m.id}: un módulo de papel no lleva roles`)
    assert.deepEqual(m.quiz || [], [], `${m.id}: un módulo de papel no pide cuestionario (nadie puede responderlo: no tiene cuenta)`)
    assert.deepEqual(m.drills || [], [], `${m.id}: un módulo de papel no lleva maniobra que firmar en el sistema`)
    assert.ok(m.sop, `${m.id}: un módulo de papel ES su hoja imprimible; sin \`sop\` no hay nada que entregar`)
    // Y lo abre quien reparte el paquete más quien le firma a esa persona.
    const quienes = rolesDelPapel(m, MODULOS_OFICIO)
    assert.ok(quienes.length > 0, `${m.id}: nadie puede imprimir esta hoja`)
    for (const r of quienes) assert.ok(OFICIAL_DE[r] || rolesQueFirma(r).length > 0, `${m.id}: ${r} no es un rol del sistema`)
  }
  // Un módulo normal nunca es de papel.
  for (const m of MODULOS_OFICIO.filter((m) => !esDePapel(m))) {
    assert.deepEqual(rolesDelPapel(m, MODULOS_OFICIO), [], `${m.id}: no es de papel y rolesDelPapel devolvió algo`)
  }
})

// ── 11. UMBRAL ────────────────────────────────────────────────────────────
test('minimoAprobacion: 80% pero siempre con derecho a un error', () => {
  assert.equal(UMBRAL, 0.8)
  assert.equal(minimoAprobacion(4), 3)
  assert.equal(minimoAprobacion(5), 4)
  assert.equal(minimoAprobacion(6), 5)
  assert.equal(minimoAprobacion(8), 7)
  assert.equal(minimoAprobacion(10), 8)
  for (let n = 4; n <= 10; n++) {
    assert.ok(minimoAprobacion(n) < n, `n=${n}: siempre se permite un error`)
    assert.ok(minimoAprobacion(n) >= 2, `n=${n}: nunca menos de 2`)
  }
  // corregirQuizOficio no está clavado en 3.
  assert.deepEqual(corregirQuizOficio([0, 1, 2, 3], [0, 1, 2, 3], 3), { puntaje: 4, correctas: [true, true, true, true], aprobado: true })
  assert.deepEqual(corregirQuizOficio([0, 1, 2, 0], [0, 1, 2, 3], 3), { puntaje: 3, correctas: [true, true, true, false], aprobado: true })
  assert.deepEqual(corregirQuizOficio([0, 1, 0, 0], [0, 1, 2, 3], 3), { puntaje: 2, correctas: [true, true, false, false], aprobado: false })
  const diez = [0, 1, 2, 3, 0, 1, 2, 3, 0, 1]
  assert.equal(corregirQuizOficio(diez, diez, minimoAprobacion(10)).aprobado, true)
  assert.equal(corregirQuizOficio([9, 9, ...diez.slice(2)], diez, minimoAprobacion(10)).puntaje, 8)
  assert.deepEqual(corregirQuizOficio(null, [0, 1, 2, 3], 3), { puntaje: 0, correctas: [false, false, false, false], aprobado: false })
  assert.deepEqual(corregirQuizOficio([0, 'x', undefined, 3], [0, 1, 2, 3], 3).correctas, [true, false, false, true])
})

// ── 12. AUTO-ENLACE ───────────────────────────────────────────────────────
const GLO = {
  factura: { termino: 'Factura', variantes: ['factura', 'facturas'], que: 'El cobro emitido.' },
  saldo: { termino: 'Saldo', variantes: ['saldo', 'saldos'], que: 'Lo que falta por pagar.' },
  'cuentas-por-cobrar': { termino: 'Cuentas por cobrar', variantes: ['cuentas por cobrar'], que: 'Lo que te deben.' },
  nivel: { termino: 'Nivel', que: 'El nivel del centro.' },
}

test('marcarTerminos: no pierde ni un carácter, marca solo lo permitido y respeta la palabra', () => {
  const texto = 'La factura queda con saldo y entra en cuentas por cobrar.'
  const segs = marcarTerminos(texto, GLO, ['factura', 'saldo', 'cuentas-por-cobrar'], new Set())
  assert.equal(segs.map((s) => s.texto).join(''), texto, 'reconstruir los segmentos debe dar el texto original')
  assert.deepEqual(segs.filter((s) => s.t === 'termino').map((s) => s.slug), ['factura', 'saldo', 'cuentas-por-cobrar'])
  for (const s of segs) assert.ok(s.t === 'texto' || s.t === 'termino', `tipo de segmento raro: ${s.t}`)

  // Solo los permitidos, no los 258.
  const soloUno = marcarTerminos(texto, GLO, ['saldo'], new Set())
  assert.deepEqual(soloUno.filter((s) => s.t === 'termino').map((s) => s.slug), ['saldo'])
  assert.equal(soloUno.map((s) => s.texto).join(''), texto)

  // Primera aparición y no las siguientes.
  const dos = 'La factura y la otra factura.'
  const segs2 = marcarTerminos(dos, GLO, ['factura'], new Set())
  assert.equal(segs2.filter((s) => s.t === 'termino').length, 1)
  assert.equal(segs2.map((s) => s.texto).join(''), dos)

  // No parte palabras por dentro, con acentos incluidos.
  const dentro = 'La facturación mensual.'
  assert.deepEqual(marcarTerminos(dentro, GLO, ['factura'], new Set()), [{ t: 'texto', texto: dentro }])
  const conEnie = 'señafactura'
  assert.deepEqual(marcarTerminos(conEnie, GLO, ['factura'], new Set()), [{ t: 'texto', texto: conEnie }])
  assert.deepEqual(marcarTerminos('niveles del centro', GLO, ['nivel'], new Set()), [{ t: 'texto', texto: 'niveles del centro' }])
  // Sin variantes explícitas usa el término.
  assert.equal(marcarTerminos('el nivel del centro', GLO, ['nivel'], new Set()).filter((s) => s.t === 'termino').length, 1)

  // Texto sin términos: un solo segmento.
  assert.deepEqual(marcarTerminos('Hola, nada que marcar.', GLO, ['factura'], new Set()), [{ t: 'texto', texto: 'Hola, nada que marcar.' }])
  assert.deepEqual(marcarTerminos('', GLO, ['factura'], new Set()), [{ t: 'texto', texto: '' }])
  assert.deepEqual(marcarTerminos('Sin permitidos.', GLO, [], new Set()), [{ t: 'texto', texto: 'Sin permitidos.' }])
  // Un slug que no existe en el glosario no revienta.
  assert.deepEqual(marcarTerminos('nada', GLO, ['no-existe'], new Set()), [{ t: 'texto', texto: 'nada' }])

  // El Set compartido no repite el término entre bloques del mismo módulo.
  const ya = new Set()
  marcarTerminos('La factura del mes.', GLO, ['factura'], ya)
  assert.equal(marcarTerminos('Otra factura distinta.', GLO, ['factura'], ya).filter((s) => s.t === 'termino').length, 0)

  // El más largo gana: "cuentas por cobrar" no se parte en "cuentas".
  const largo = marcarTerminos('Revisa cuentas por cobrar hoy.', { ...GLO, cuentas: { termino: 'Cuentas', variantes: ['cuentas'], que: 'x' } }, ['cuentas', 'cuentas-por-cobrar'], new Set())
  assert.deepEqual(largo.filter((s) => s.t === 'termino').map((s) => s.texto), ['cuentas por cobrar'])
})

// ── 12 bis. EL TERCER SENTIDO DE "CICLO" ──────────────────────────────────
// En ALOHA "ciclo" nombra dos cosas oficiales y el entrenamiento las separa con
// dos tarjetas: `ciclo` (el del Programa: Ciclo 1 y Ciclo 2) y
// `ciclo-de-matricula` (el paquete que pagó el padre). Pero hay un TERCER uso
// vivo en el contenido —"cerrar el ciclo" de un reclamo, "el ciclo completo de
// las operaciones"— que no es ninguno de los dos.
//
// Hoy no sale ningún tooltip equivocado porque ningún módulo con esos textos
// declara 'ciclo' en `palabras`. Nada lo sostenía: el día que alguien agregue
// 'ciclo' a of-nor-3 o a of-cen-8, "cerrar el ciclo" se lleva el popover
// "Ciclo 1: los niveles 1 al 4" delante de la persona que está estudiando cómo
// atender un reclamo. Esto lo caza en CI.
const TERCER_SENTIDO = /cerrar el ciclo|cierra el ciclo|ciclo completo de las operaciones/i
// Lo que BloquesOficio pasa por el auto-enlace: `tabla` y `sub` se pintan planos.
const textoEnlazable = (m) => (m.bloques || []).flatMap((b) => {
  if (b.t === 'p' || b.t === 'nota') return [b.texto]
  if (b.t === 'lista' || b.t === 'pasos') return b.items || []
  return []
})

test('ningún módulo que declare "ciclo" usa la palabra en su tercer sentido', () => {
  const choques = []
  for (const m of MODULOS_OFICIO) {
    if (!(m.palabras || []).includes('ciclo')) continue
    for (const t of textoEnlazable(m)) {
      if (TERCER_SENTIDO.test(t)) choques.push(`${m.id}: "${String(t).match(TERCER_SENTIDO)[0]}"`)
    }
  }
  assert.deepEqual(
    choques, [],
    'este módulo declara la tarjeta `ciclo` (la etapa del Programa) y su texto usa "ciclo" con el sentido de "hasta cerrar el caso": el auto-enlace le va a poner el tooltip equivocado. Cambia la redacción a "hasta cerrar el caso" o saca `ciclo` de `palabras`',
  )
})

// ── 13. HIGIENE DE BUNDLE ─────────────────────────────────────────────────
function archivosJs(dir) {
  const out = []
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) out.push(...archivosJs(p))
    else if (/\.(js|jsx)$/.test(n)) out.push(p)
  }
  return out
}
const fuentesApp = () => [...archivosJs(join(ROOT, 'app')), ...archivosJs(join(ROOT, 'components'))]
// Un comentario que nombra la ruta NO cuenta como import.
const sinComentarios = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

test('ningún componente cliente importa el catálogo, los cursos ni el glosario', () => {
  const malos = fuentesApp().filter((p) => {
    const src = readFileSync(p, 'utf8')
    if (!/^\s*['"]use client['"]/m.test(src)) return false
    return /['"][^'"]*entrenamiento\/oficio\/(catalogo|cursos|glosario)[^'"]*['"]/.test(sinComentarios(src))
  })
  assert.deepEqual(malos, [], `la prosa del oficio se le va al navegador de cada centro: ${malos.join(', ')}`)
})

test('las respuestas del oficio solo se importan desde módulos de servidor', () => {
  const malos = fuentesApp().filter((p) => {
    const src = readFileSync(p, 'utf8')
    return /respuestas-oficio/.test(sinComentarios(src)) && !/^\s*['"]use server['"]/m.test(src)
  })
  assert.deepEqual(malos, [], `clave de respuestas fuera del servidor: ${malos.join(', ')}`)
})

// ── 14. CONTRATO SQL Y DE LAS ACTIONS ─────────────────────────────────────
const ACTIONS = join(ROOT, 'app/actions/entrenamiento-oficio.js')
function cuerpo(src, nombre) {
  const start = src.indexOf(`export async function ${nombre}`)
  assert.ok(start >= 0, `no se encontró ${nombre}`)
  const next = src.indexOf('export ', start + 1)
  return src.slice(start, next === -1 ? src.length : next)
}

test('schema: la firma del drill existe y borrar al firmante no borra el progreso', () => {
  const schema = readFileSync(join(ROOT, 'db/schema.sql'), 'utf8')
  assert.match(schema, /drill_firmado_at\s+TIMESTAMPTZ/)
  assert.match(schema, /drill_firmado_por\s+INTEGER REFERENCES usuarios\(id\) ON DELETE SET NULL/)
  const migracion = readFileSync(join(ROOT, 'db/migrations/2026-09-03-entrenamiento-oficio.sql'), 'utf8')
  assert.match(migracion, /ADD COLUMN IF NOT EXISTS drill_firmado_at/)
  assert.match(migracion, /ADD COLUMN IF NOT EXISTS drill_firmado_por/)
  assert.match(migracion, /ON DELETE SET NULL/)
})

test('firmarDrill: permiso verificado en el servidor y con auth fresca', () => {
  const body = cuerpo(readFileSync(ACTIONS, 'utf8'), 'firmarDrill')
  assert.match(body, /requireCurrentUser\(\)/)
  assert.match(body, /puedeFirmar\(/)
  assert.match(body, /Number\.isInteger\(usuarioId\)/)
  assert.match(body, /MODULO_IDS_OFICIO\.has\(modulo\)/)
})

test('responderQuizOficio: valida el largo contra SU quiz y el gradiente ANTES de corregir', () => {
  const body = cuerpo(readFileSync(ACTIONS, 'utf8'), 'responderQuizOficio')
  assert.match(body, /requireCurrentUser\(\)/)
  assert.match(body, /MODULO_IDS_OFICIO\.has\(modulo\)/)
  assert.match(body, /m\.quiz\.length/)
  assert.doesNotMatch(body, /length !== 3\b/, 'el largo no puede estar clavado en 3')
  assert.match(body, /Number\.isInteger/)
  assert.match(body, /minimoAprobacion\(/)
  const iGrad = body.indexOf('gradienteAbierto(')
  const iCorr = body.indexOf('corregirQuizOficio(')
  assert.ok(iGrad >= 0 && iCorr >= 0, 'faltan gradienteAbierto o corregirQuizOficio')
  assert.ok(iGrad < iCorr, 'el gradiente se comprueba ANTES de corregir, no después')
})

test('marcarEstudiado: solo ids de oficio y solo módulos del puesto de quien escribe', () => {
  const body = cuerpo(readFileSync(ACTIONS, 'utf8'), 'marcarEstudiado')
  assert.match(body, /requireCurrentUser\(\)/)
  assert.match(body, /MODULO_IDS_OFICIO\.has\(modulo\)/)
  assert.match(body, /m\.roles\.includes\(u\.rol\)/)
  assert.match(body, /INSERT INTO entrenamiento_progreso/)
})

// EL COORDINADOR TIENE DÓNDE FIRMARLE. usuarios.centro_id es NULL para él —sus
// centros viven en usuario_centros— y la columna "Cola de firmas" armaba el
// enlace con ese campo: para todo un puesto salía "sin centro" y la única
// pantalla desde la que se le toma la maniobra quedaba inalcanzable.
test('matrizOficio trae los centros de usuario_centros y la pantalla arma el enlace con el que exista', () => {
  const body = cuerpo(readFileSync(ACTIONS, 'utf8'), 'matrizOficio')
  assert.match(body, /ARRAY_AGG\(uc\.centro_id/, 'matrizOficio tiene que devolver los centros de usuario_centros, no solo filtrar por ellos')
  assert.match(body, /centroFirma/, 'la fila tiene que decir por qué centro se entra a firmarle')
  const pagina = readFileSync(join(ROOT, 'app/dashboard/entrenamiento/oficio/page.js'), 'utf8')
  assert.match(pagina, /u\.centroFirma/, 'la columna Cola de firmas sigue armando el enlace con el centro propio')
  assert.doesNotMatch(pagina, /\$\{u\.centroId\}\/entrenamiento\/firmas/, 'el enlace de la firma no puede depender de usuarios.centro_id: para el Coordinador es NULL')
})

test('las actions del oficio no tocan las de los 9 tours', () => {
  const src = readFileSync(ACTIONS, 'utf8')
  assert.match(src, /^'use server'/)
  assert.doesNotMatch(src, /entrenamiento\/modulos/, 'el oficio no importa el catálogo de tours')
  assert.doesNotMatch(src, /entrenamiento\/respuestas['"]/, 'el oficio no importa las respuestas de los tours')
  // Y el archivo de los tours sigue sin saber nada del oficio.
  const tours = readFileSync(join(ROOT, 'app/actions/entrenamiento.js'), 'utf8')
  assert.doesNotMatch(tours, /oficio/i, 'app/actions/entrenamiento.js no se toca')
})
