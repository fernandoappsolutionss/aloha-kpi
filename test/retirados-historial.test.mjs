import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { ORIGENES } from '../lib/operaciones.js'

const gruposSource = fs.readFileSync(new URL('../app/actions/grupos.js', import.meta.url), 'utf8')
const estudiantesSource = fs.readFileSync(new URL('../app/actions/estudiantes.js', import.meta.url), 'utf8')
const pageSource = fs.readFileSync(new URL('../app/centro/[id]/grupos/page.js', import.meta.url), 'utf8')

// Extrae una declaración sin intentar parsear los imports/JSX que rodean a las
// funciones. El escáner ignora strings y comentarios para no cerrar el bloque
// al encontrar una llave dentro de un SQL tagged template o de un comentario.
function extraerFuncion(source, nombre) {
  const re = new RegExp(`(?:export\\s+)?(?:async\\s+)?function\\s+${nombre}\\s*\\(`)
  const match = re.exec(source)
  assert.ok(match, `No se encontró la función ${nombre}`)
  // Primero salta los parámetros (que pueden incluir destructuring con sus
  // propias llaves), y recién después busca la llave del cuerpo.
  const paramsOpen = source.indexOf('(', match.index + match[0].length - 1)
  let paramsDepth = 0
  let paramsMode = 'code'
  let paramsEscaped = false
  let paramsClose = -1
  for (let i = paramsOpen; i < source.length; i++) {
    const c = source[i]
    if (paramsMode !== 'code') {
      if (paramsEscaped) { paramsEscaped = false; continue }
      if (c === '\\') { paramsEscaped = true; continue }
      if ((paramsMode === 'single' && c === "'") || (paramsMode === 'double' && c === '"') || (paramsMode === 'template' && c === '`')) paramsMode = 'code'
      continue
    }
    if (c === "'") { paramsMode = 'single'; continue }
    if (c === '"') { paramsMode = 'double'; continue }
    if (c === '`') { paramsMode = 'template'; continue }
    if (c === '(') paramsDepth++
    if (c === ')' && --paramsDepth === 0) { paramsClose = i; break }
  }
  assert.notEqual(paramsClose, -1, `Parámetros desbalanceados en ${nombre}`)
  const open = source.indexOf('{', paramsClose)
  assert.notEqual(open, -1, `La función ${nombre} no tiene cuerpo`)

  let depth = 0
  let mode = 'code'
  let escaped = false
  for (let i = open; i < source.length; i++) {
    const c = source[i]
    const n = source[i + 1]
    if (mode === 'line-comment') {
      if (c === '\n') mode = 'code'
      continue
    }
    if (mode === 'block-comment') {
      if (c === '*' && n === '/') { mode = 'code'; i++ }
      continue
    }
    if (mode === 'single' || mode === 'double' || mode === 'template') {
      if (escaped) { escaped = false; continue }
      if (c === '\\') { escaped = true; continue }
      if ((mode === 'single' && c === "'") || (mode === 'double' && c === '"') || (mode === 'template' && c === '`')) mode = 'code'
      continue
    }
    if (c === '/' && n === '/') { mode = 'line-comment'; i++; continue }
    if (c === '/' && n === '*') { mode = 'block-comment'; i++; continue }
    if (c === "'") { mode = 'single'; continue }
    if (c === '"') { mode = 'double'; continue }
    if (c === '`') { mode = 'template'; continue }
    if (c === '{') depth++
    if (c === '}' && --depth === 0) return source.slice(match.index, i + 1).replace(/^export\s+/, '')
  }
  assert.fail(`Llaves desbalanceadas al extraer ${nombre}`)
}

function ejecutarFuncion(source, nombre, globals = {}) {
  const codigo = `(${extraerFuncion(source, nombre)})`
  return vm.runInNewContext(codigo, { ...globals })
}

function ejecutarFiltroRetirados() {
  const norm = pageSource.match(/^const norm = .+$/m)?.[0]
  assert.ok(norm, 'No se encontró el normalizador de búsqueda')
  const codigo = `${norm}\n${extraerFuncion(pageSource, 'filtrarRetirados')}\nfiltrarRetirados`
  return vm.runInNewContext(codigo)
}

function sqlTexto(strings) {
  return Array.from(strings).join(' ')
}

test('loadOperaciones trae hasta 5000 retirados y no se queda en 30', async () => {
  const retirados = Array.from({ length: 5001 }, (_, i) => ({ id: i + 1, nombre: `Retirado ${i + 1}`, estado: 'retirado' }))
  const queries = []
  const sql = async (strings, ...values) => {
    const texto = sqlTexto(strings)
    queries.push({ texto, values })
    if (/SELECT nombre FROM centros/i.test(texto)) return [{ nombre: 'Centro de prueba' }]
    if (/estado\s*=\s*'retirado'/i.test(texto)) {
      const limit = Number(texto.match(/LIMIT\s+(\d+)/i)?.[1] || values.at(-1) || retirados.length)
      return retirados.slice(0, limit)
    }
    if (/SELECT \* FROM coaches/i.test(texto) || /SELECT \* FROM salones/i.test(texto)) return []
    if (/matricula_anulada/i.test(texto) || /grupo_id IS NULL/i.test(texto) || /centro_reservas/i.test(texto) || /asistencias/i.test(texto)) return []
    return []
  }
  const loadOperaciones = ejecutarFuncion(gruposSource, 'loadOperaciones', {
    sql,
    requireCentroAccess: async () => undefined,
    cargarGrupos: async () => [],
    metasOperativas: async () => ({ gpnMin: 8, cupoMax: 15 }),
    hoyISO: () => '2026-09-21',
    fechaIso10: (value) => String(value).slice(0, 10),
  })

  const resultado = await loadOperaciones(7)

  assert.equal(resultado.retirados.length, 5000)
  assert.equal(resultado.retirados.at(-1).id, 5000)
  assert.ok(queries.some(({ texto, values }) => /estado\s*=\s*'retirado'/i.test(texto) && (/LIMIT\s+5000/i.test(texto) || (/LIMIT\s*$/i.test(texto) && values.includes(5000)))))
})

test('filtrarRetirados busca nombres ignorando mayúsculas y acentos', () => {
  const filtrarRetirados = ejecutarFiltroRetirados()
  const filas = [
    { id: 1, nombre: 'José Álvarez' },
    { id: 2, nombre: 'MARÍA Fernanda' },
    { id: 3, nombre: 'Lucía Pérez' },
  ]

  assert.deepEqual(filtrarRetirados(filas, 'jose').map((fila) => fila.id), [1])
  assert.deepEqual(filtrarRetirados(filas, 'MARÍA').map((fila) => fila.id), [2])
  assert.deepEqual(filtrarRetirados(filas, '').map((fila) => fila.id), [1, 2, 3])
})

test('paginarRetirados usa 20 por página, informa el rango y ajusta páginas fuera de rango', () => {
  const paginarRetirados = ejecutarFuncion(pageSource, 'paginarRetirados')
  const filas = Array.from({ length: 55 }, (_, i) => ({ id: i + 1, nombre: `Retirado ${i + 1}` }))

  const pagina2 = paginarRetirados(filas, 2)
  assert.deepEqual(pagina2.items.map((fila) => fila.id), Array.from({ length: 20 }, (_, i) => i + 21))
  assert.deepEqual(
    { pagina: pagina2.pagina, porPagina: pagina2.porPagina, total: pagina2.total, desde: pagina2.desde, hasta: pagina2.hasta, totalPaginas: pagina2.totalPaginas },
    { pagina: 2, porPagina: 20, total: 55, desde: 21, hasta: 40, totalPaginas: 3 },
  )

  const fueraDeRango = paginarRetirados(filas, 999, 20)
  assert.equal(fueraDeRango.pagina, 3)
  assert.deepEqual(fueraDeRango.items.map((fila) => fila.id), Array.from({ length: 15 }, (_, i) => i + 41))
  assert.deepEqual({ desde: fueraDeRango.desde, hasta: fueraDeRango.hasta }, { desde: 41, hasta: 55 })

  assert.deepEqual(paginarRetirados(filas, 2, 10).items.map((fila) => fila.id), Array.from({ length: 10 }, (_, i) => i + 11))
  assert.deepEqual(paginarRetirados(filas, 2, 50).items.map((fila) => fila.id), [51, 52, 53, 54, 55])
})

test('el panel conecta estado propio, buscador visual, paginación y acciones de cada retirado', () => {
  const inicio = pageSource.indexOf('{data?.retirados?.length > 0 ? (')
  const fin = pageSource.indexOf('No hay retiros recientes.', inicio)
  assert.notEqual(inicio, -1)
  assert.notEqual(fin, -1)
  const panel = pageSource.slice(inicio, fin)

  assert.match(pageSource, /const \[retiradosQuery, setRetiradosQuery\] = useState\(''\)/)
  assert.match(pageSource, /const \[retiradosPagina, setRetiradosPagina\] = useState\(1\)/)
  assert.match(pageSource, /const \[retiradosPorPagina, setRetiradosPorPagina\] = useState\(20\)/)
  assert.match(panel, /className="grp-search"[\s\S]*className="grp-search__icon"[\s\S]*className="input" value=\{retiradosQuery\}[\s\S]*className="grp-search__clear"/)
  assert.match(panel, /\{\[10, 20, 50\]\.map\(\(n\) => <option/)
  assert.match(panel, /Mostrando \$\{retiradosPaginados\.desde\}–\$\{retiradosPaginados\.hasta\} de \$\{retiradosPaginados\.total\}/)
  assert.match(panel, /retiradosPaginados\.items\.map\(\(e\) =>/)
  assert.doesNotMatch(panel, /data\.retirados\.map\(/)
  assert.match(panel, /setReincEst\(e\)/)
  assert.match(panel, /acciones\.anular\(e\)/)
  assert.match(panel, /className="btn"[\s\S]*>Anterior<\/button>[\s\S]*className="btn"[\s\S]*>Siguiente<\/button>/)
})

test('reincorporado es una opción con etiqueta legible', () => {
  const labelsSource = pageSource.match(/^const ORIGEN_LABELS = (.+)$/m)?.[1]
  assert.ok(labelsSource, 'No se encontró ORIGEN_LABELS')
  const labels = vm.runInNewContext(`(${labelsSource})`)

  assert.ok(ORIGENES.includes('reincorporado'))
  assert.equal(labels.reincorporado, 'Reincorporado')
})

test('reincorporarEstudiante conserva el evento y marca el origen por COALESCE', async () => {
  const ejecutadas = []
  const query = async (strings, ...values) => {
    const texto = sqlTexto(strings)
    ejecutadas.push({ texto, values })
    if (/SELECT \* FROM estudiantes/i.test(texto)) return [{ id: 22, estado: 'retirado', grupo_id: 4 }]
    return []
  }
  const reincorporarEstudiante = ejecutarFuncion(estudiantesSource, 'reincorporarEstudiante', {
    requireCurrentWriteCentro: async () => undefined,
    withTransaction: async (callback) => callback(query),
    grupoDe: async () => ({ id: 4, estado: 'activo', inscripcion_abierta: true, numero: '4' }),
    bloquearMesesEditables: async () => null,
    hoyISO: () => '2026-09-21',
    ym: () => ({ year: 2026, month: 9 }),
    grupoAceptaMovimientos: () => null,
    encolarSyncCrm: async () => undefined,
  })

  const resultado = await reincorporarEstudiante(7, 22, { grupoId: 4 })

  assert.equal(resultado.ok, true)
  const update = ejecutadas.find(({ texto }) => /^\s*UPDATE estudiantes/i.test(texto))
  assert.ok(update, 'debe ejecutar un UPDATE de estudiantes')
  assert.match(update.texto, /origen\s*=\s*COALESCE\(origen,\s*'reincorporado'\)/i)
  const evento = ejecutadas.find(({ texto }) => /INSERT INTO estudiante_eventos/i.test(texto))
  assert.ok(evento, 'debe conservar el INSERT del evento')
  assert.match(evento.texto, /\(estudiante_id, centro_id, tipo, year, month, fecha, a_grupo_id\)/i)
  assert.match(evento.texto, /'reincorporacion'/i)
  assert.deepEqual(evento.values, [22, 7, 2026, 9, '2026-09-21', 4])
})
