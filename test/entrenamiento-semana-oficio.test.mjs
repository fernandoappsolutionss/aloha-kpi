import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { MODULOS_OFICIO, CURSOS } from '../lib/entrenamiento/oficio/catalogo.js'
import { planDeRol, avanceOficio, siguienteOficio, gradienteAbierto, hatted, corregirQuizOficio, minimoAprobacion } from '../lib/entrenamiento/oficio/progreso.js'
import { RESPUESTAS_OFICIO } from '../lib/entrenamiento/respuestas-oficio/todas.js'
import { FORMULAS } from '../lib/condiciones/formulas.mjs'
import { modeloGrafica } from '../lib/grafica-semanal.mjs'
import { GLOSARIO } from '../lib/entrenamiento/oficio/glosario.js'
import { GUIA } from '../lib/entrenamiento/oficio/guia.js'

const nuevos = MODULOS_OFICIO.filter((m) => m.curso === 'semana')
const roles = { administradora: 'adm', asistente: 'asi', coach: 'coa', coordinador: 'cop' }
const firma = { tourVistoAt: '2026-09-01', quizAprobadoAt: '2026-09-01', drillFirmadoAt: '2026-09-02' }
const lee = (ruta) => readFileSync(new URL(`../${ruta}`, import.meta.url), 'utf8')

test('la actualización tiene seis IDs: dos comunes y una práctica de cada puesto', () => {
  assert.equal(nuevos.length, 6)
  assert.deepEqual(CURSOS.semana.roles.slice().sort(), Object.keys(roles).sort())
  for (const [rol, sufijo] of Object.entries(roles)) {
    const plan = planDeRol(rol, MODULOS_OFICIO, 10)
    assert.deepEqual(plan.filter((m) => m.curso === 'semana').map((m) => m.id), ['of-sem-1', 'of-sem-2', `of-sem-${sufijo}`])
    const previo = plan.filter((m) => m.curso !== 'semana')
    const progreso = Object.fromEntries(previo.map((m) => [m.id, { ...firma }]))
    const copia = structuredClone(progreso)
    assert.equal(avanceOficio(previo, progreso).pctHat, 100)
    assert.equal(avanceOficio(plan, progreso).total - avanceOficio(plan, progreso).hatted, 3)
    assert.equal(siguienteOficio(plan, progreso).id, 'of-sem-1')
    assert.equal(gradienteAbierto(nuevos[0], progreso), true)
    assert.equal(gradienteAbierto(nuevos[1], progreso), false)
    assert.ok(previo.every((m) => hatted(progreso[m.id], m)))
    assert.deepEqual(progreso, copia, 'consultar la actualización conserva progreso y firmas')
  }
})

test('las nueve fórmulas y variantes se muestran completas desde la misma fuente', () => {
  const leccion = nuevos.find((m) => m.id === 'of-sem-2')
  const bloques = leccion.bloques.filter((b) => b.formula)
  assert.deepEqual(bloques.map((b) => b.formula).sort(), Object.keys(FORMULAS).sort())
  for (const bloque of bloques) assert.strictEqual(bloque.items, FORMULAS[bloque.formula])
  const ejemplos = leccion.bloques.filter((b) => b.t === 'tabla')
  assert.equal(ejemplos.length, Object.keys(FORMULAS).length)
  for (const b of ejemplos) {
    assert.match(b.titulo, /Ejemplo pedagógico/)
    assert.equal(b.filas[0].length, 5)
    assert.ok(b.filas[0].every(Boolean))
    assert.match(b.filas[0][3], /^\d{4}-\d{2}-\d{2}$/)
  }
})

test('las gráficas enseñan valores reales, cortes, inversa, igual escala y aprobación', () => {
  const graficas = nuevos[0].bloques.filter((b) => b.t === 'grafica')
  assert.equal(graficas.length, 9)
  assert.deepEqual(graficas[3].puntos.map((p) => p.valor), [20, 10, 12, 14])
  const inversa = modeloGrafica(graficas[4])
  assert.equal(graficas[4].inversa, true)
  assert.ok(inversa.puntos[3].y < inversa.puntos[0].y)
  const faltante = modeloGrafica(graficas[5])
  assert.equal(faltante.puntos[1].y, null)
  assert.equal(faltante.tramos.length, 1)
  const subida = modeloGrafica(graficas[0]); const caida = modeloGrafica(graficas[2])
  assert.equal(subida.min, caida.min)
  assert.equal(subida.max, caida.max)
  assert.deepEqual(graficas[0].puntos.map((p) => p.semanaFin), graficas[2].puntos.map((p) => p.semanaFin))
  assert.match(graficas[6].texto, /abierta/)
  assert.ok(graficas[7].puntos.every((p) => p.cuota == null))
  assert.ok(graficas[8].puntos.every((p) => p.cuota === 16))
  const renderer = lee('components/entrenamiento/BloquesOficio.js')
  assert.match(renderer, /<GraficaSemanal/)
  assert.match(renderer, /<figcaption>/)
  assert.match(renderer, /encabezados: \['Cierre', 'Valor', 'Cuota aprobada'\]/)
})

test('las rutas de práctica existen y el coach no recibe enlaces administrativos', () => {
  for (const m of nuevos) {
    for (const bloque of m.bloques.filter((b) => b.t === 'enlaces')) {
      for (const recurso of bloque.recursos) {
        assert.match(recurso.href, /^\/(centro\/\{centroId\}\/|dashboard)/)
        const ruta = recurso.href.split('#')[0].replace('{centroId}', '[id]')
        assert.ok(existsSync(new URL(`../app${ruta}/page.js`, import.meta.url)), recurso.href)
        if (m.roles.includes('coach')) assert.equal(recurso.href, '/centro/{centroId}/mis-grupos')
      }
    }
  }
  assert.match(lee('app/centro/[id]/entrenamiento/oficio/[modulo]/page.js'), /<BloquesOficio bloques=\{m.bloques\} terminos=\{terminos\} centroId=\{id\}/)
})

test('los nuevos casos tienen claves servidor, retroalimentación, firma y tres guiones', () => {
  for (const m of nuevos) {
    assert.equal(m.quiz.length, 4)
    const clave = RESPUESTAS_OFICIO[m.id]
    assert.equal(corregirQuizOficio(clave, clave, minimoAprobacion(m.quiz.length)).aprobado, true)
    for (let opcion = 0; opcion < 3; opcion++) {
      assert.equal(corregirQuizOficio(Array(4).fill(opcion), clave, minimoAprobacion(4)).aprobado, false)
    }
    assert.ok(m.quiz.every((q) => q.explicacion && q.repasa.length && !('correcta' in q)))
    assert.equal(m.drills.length, 1)
    assert.match(m.drills[0].pasos.join(' '), /firma/)
    assert.deepEqual(Object.keys(GUIA[m.id]).sort(), ['cierre', 'palabras', 'vista'])
  }
})

test('los términos nuevos y corregidos conservan la misma definición en la fuente', () => {
  const fuente = lee('docs/entrenamiento/fuente/glosario-aloha.md')
  for (const slug of ['estadistica-semanal', 'condicion']) {
    assert.ok(fuente.includes(`### ${GLOSARIO[slug].termino}\n`))
    assert.ok(fuente.includes(`**Qué es.** ${GLOSARIO[slug].que}`))
  }
})

test('las maniobras por puesto exigen operación real supervisada, guardado y recarga', () => {
  for (const m of nuevos.filter((x) => x.roles.length === 1)) {
    const practica = m.drills[0]
    const pasos = practica.pasos.join(' ')
    assert.match(pasos, /real/)
    assert.match(pasos, /guarda|registra|aprobar/i)
    assert.match(pasos, /recarga/i)
    assert.match(pasos, /observa/)
    assert.match(pasos, /firma/)
    assert.match(practica.gradiente, /Si todavía no hay una tarea real válida, espera/)
  }
})

test('la lección común delimita las operaciones del plan a la Administradora', () => {
  const comun = nuevos.find((m) => m.id === 'of-sem-2')
  assert.equal(comun.roles.length, 4)
  assert.match(comun.sop.cuando, /Administradora.*ejecuta/)
  assert.match(comun.sop.cuando, /demás puestos ensayan en una hoja/)
  const aviso = comun.bloques.find((b) => b.titulo === 'Qué hace cada puesto')
  assert.match(aviso.texto, /Asistente, coach y coordinación analizan y ensayan.*hoja/)
  assert.match(aviso.texto, /práctica de su puesto con sus permisos habituales/)
  const operativos = comun.bloques.filter((b) => b.t === 'pasos' && !b.formula)
  for (const paso of [...comun.sop.pasos, ...operativos.flatMap((b) => b.items)]) {
    if (/elige|guarda|agrega|pulsa|marca/i.test(paso)) {
      assert.match(paso, /^La Administradora /, `operación común sin delimitar autoridad: ${paso}`)
    }
  }
  assert.ok(comun.drills[0].pasos.some((paso) => /en una hoja/.test(paso)))
})
