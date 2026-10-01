import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { ORIGENES } from '../lib/operaciones.js'

const gruposSource = fs.readFileSync(new URL('../app/actions/grupos.js', import.meta.url), 'utf8')
const estudiantesSource = fs.readFileSync(new URL('../app/actions/estudiantes.js', import.meta.url), 'utf8')
const pageSource = fs.readFileSync(new URL('../app/centro/[id]/grupos/page.js', import.meta.url), 'utf8')
const cuadroSource = fs.readFileSync(new URL('../app/centro/[id]/cuadro/page.js', import.meta.url), 'utf8')

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

// ── Corregir motivo del retiro (David, agosto 2026) ─────────────────────────
// Lo que se ejecuta en vm vive en otro realm: se compara vía JSON/spread.
const plano = (valor) => JSON.parse(JSON.stringify(valor))

test('loadOperaciones adjunta a cada retirado su retiro vigente, con correcciones sin email ni uid', async () => {
  const retirados = [
    { id: 230, nombre: 'Ivannis', estado: 'retirado', motivo_retiro: 'GRADUADO' },
    { id: 999, nombre: 'Sin evento', estado: 'retirado', motivo_retiro: 'OTRO' },
  ]
  const vigentes = [{
    estudiante_id: 230, id: 1130, motivo: 'GRADUADO', year: 2026, month: 8, fecha: '2026-08-15',
    correcciones: [{
      motivo_anterior: 'ECONOMICO', motivo_ficha_anterior: 'ECONOMICO', motivo_nuevo: 'GRADUADO', razon: 'Terminó el programa.',
      corregido_at: '2026-10-01T15:00:00.000Z', actor: { uid: 9, email: 'admin@centro.test', nombre: 'Admin David' }, evento_id: 1130,
    }],
  }]
  const queries = []
  const sql = async (strings, ...values) => {
    const texto = sqlTexto(strings)
    queries.push({ texto, values })
    if (/SELECT nombre FROM centros/i.test(texto)) return [{ nombre: 'David' }]
    if (/estado\s*=\s*'retirado'/i.test(texto)) return retirados.map((r) => ({ ...r }))
    if (/DISTINCT ON \(estudiante_id\)/i.test(texto)) return vigentes
    return []
  }
  const loadOperaciones = ejecutarFuncion(gruposSource, 'loadOperaciones', {
    sql,
    requireCentroAccess: async () => undefined,
    cargarGrupos: async () => [],
    metasOperativas: async () => ({ gpnMin: 8, cupoMax: 15 }),
    hoyISO: () => '2026-10-01',
    fechaIso10: (value) => String(value).slice(0, 10),
  })

  const resultado = await loadOperaciones(5)

  assert.deepEqual(plano(resultado.retirados.find((e) => e.id === 230).retiro), {
    id: 1130, motivo: 'GRADUADO', year: 2026, month: 8, fecha: '2026-08-15',
    correcciones: [{ fecha: '2026-10-01T15:00:00.000Z', nombre: 'Admin David', antes: 'ECONOMICO', despues: 'GRADUADO', razon: 'Terminó el programa.' }],
  })
  assert.doesNotMatch(JSON.stringify(resultado.retirados), /admin@centro\.test|"uid"/)
  assert.equal(resultado.retirados.find((e) => e.id === 999).retiro, null)
  const consulta = queries.find(({ texto }) => /DISTINCT ON \(estudiante_id\)/i.test(texto))
  assert.match(consulta.texto, /tipo = 'retiro'/)
  assert.match(consulta.texto, /ORDER BY estudiante_id, id DESC/)
  assert.doesNotMatch(consulta.texto, /LIMIT/, 'sin LIMIT: el test de 5000 lee el primer LIMIT del texto')
  assert.deepEqual([...consulta.values[0]], [230, 999])
})

test('corregirMotivoRetiro: guarda de escritura primero, Serializable explícito y 40001/40P01 legibles', async () => {
  const sesion = { uid: 9, email: 'admin@centro.test', nombre: 'Admin David' }
  const crear = (llamadas, extra = {}) => ejecutarFuncion(estudiantesSource, 'corregirMotivoRetiro', {
    requireCurrentWriteCentro: async (centroId) => { llamadas.push(['guarda', centroId]); return sesion },
    MOTIVOS_RETIRO: ['GRADUADO', 'ECONOMICO', 'OTRO'],
    withTransaction: async (callback, opciones) => { llamadas.push(['tx', plano(opciones)]); return callback('QUERY') },
    corregirMotivoRetiroEn: async (query, args, deps) => { llamadas.push(['servicio', query, plano(args), Object.keys(deps)]); return { ok: true } },
    bloquearMesesEditables: async () => null,
    ...extra,
  })

  const llamadas = []
  const datos = { motivo: 'GRADUADO', razon: 'Terminó el programa.', eventoIdEsperado: 1130, motivoEsperado: 'ECONOMICO' }
  assert.equal((await crear(llamadas)('5', 230, datos)).ok, true)
  assert.deepEqual(llamadas.map(([tipo]) => tipo), ['guarda', 'tx', 'servicio'])
  assert.deepEqual(llamadas[1][1], { isolationLevel: 'Serializable' })
  const [, query, args, deps] = llamadas[2]
  assert.equal(query, 'QUERY')
  assert.deepEqual(deps, ['bloquearMesesEditables'])
  assert.equal(args.centroId, '5')
  assert.equal(args.estudianteId, 230)
  assert.equal(args.motivo, 'GRADUADO')
  assert.equal(args.razon, 'Terminó el programa.')
  assert.equal(args.eventoIdEsperado, 1130)
  assert.equal(args.motivoEsperado, 'ECONOMICO')
  assert.deepEqual(args.actor, sesion)
  assert.match(args.ahora, /^\d{4}-\d{2}-\d{2}T/)

  const sinPermiso = []
  await assert.rejects(crear(sinPermiso, { requireCurrentWriteCentro: async () => { throw new Error('Tu rol es de solo lectura.') } })('5', 230, datos), /solo lectura/)
  assert.equal(sinPermiso.length, 0, 'sin permiso no se abre transacción')

  const motivoMalo = []
  assert.equal((await crear(motivoMalo)('5', 230, { ...datos, motivo: 'INVENTADO' })).error, 'Motivo de retiro inválido.')
  assert.deepEqual(motivoMalo.map(([tipo]) => tipo), ['guarda'])

  for (const code of ['40001', '40P01']) {
    const choque = crear([], { withTransaction: async () => { throw Object.assign(new Error('could not serialize'), { code }) } })
    assert.match((await choque('5', 230, datos)).error, /La ficha o su mes cambió mientras corregías/)
  }
  const otro = crear([], { withTransaction: async () => { throw new Error('se cayó la base') } })
  await assert.rejects(otro('5', 230, datos), /se cayó la base/)
})

test('retirados: "Corregir motivo" solo con escritura, modal con token del evento y razón, hash #retirados', () => {
  const inicio = pageSource.indexOf('{data?.retirados?.length > 0 ? (')
  const fin = pageSource.indexOf('No hay retiros recientes.', inicio)
  const panel = pageSource.slice(inicio, fin)

  assert.match(panel, /\{canWrite && <><button className="btn" style=\{BTN_XS\} onClick=\{\(\) => \{ setStatus\(''\); setMotivoEst\(e\) \}\}>Corregir motivo<\/button>/)
  assert.match(panel, /etiquetaMotivo\(motivoRetiroVigente\(e\)\)/)
  assert.match(panel, /Motivo corregido el \{fmtDia\(diaPanama\(e\.retiro\.correcciones\.at\(-1\)\.fecha\)\)\}/)
  assert.match(pageSource, /\{canWrite && motivoEst && \(\s*<CorregirMotivoModal centroId=\{id\} est=\{motivoEst\}/)
  assert.match(pageSource, /const hayModal = !!\([^)]*\bmotivoEst\b[^)]*\)/)
  assert.match(pageSource, /window\.location\.hash === '#retirados'\) setTab\('alumnos'\)/)

  const modal = extraerFuncion(pageSource, 'CorregirMotivoModal')
  assert.match(modal, /corregirMotivoRetiro\(centroId, est\.id, \{\s*motivo, razon, eventoIdEsperado: retiro\?\.id, motivoEsperado: retiro\?\.motivo \?\? null,\s*\}\)/)
  assert.match(modal, /disabled=\{saving \|\| !retiro \|\| historico \|\| !motivo \|\| sinCambio \|\| !razon\.trim\(\)\}/)
  assert.match(modal, /maxLength=\{500\}/)
  assert.match(modal, /usaIniciosClaseOperativos\(retiro\.year, retiro\.month\)/)
  assert.match(modal, /No hace falta reincorporarlo ni volver a retirarlo/)
})

test('motivoRetiroVigente: manda el motivo del evento (el que cuenta en el KPI); la ficha solo sin evento', () => {
  const linea = pageSource.match(/^const motivoRetiroVigente = .+$/m)?.[0]
  assert.ok(linea, 'No se encontró motivoRetiroVigente')
  const motivoRetiroVigente = vm.runInNewContext(`${linea}\nmotivoRetiroVigente`)
  assert.equal(motivoRetiroVigente({ motivo_retiro: 'ECONOMICO', retiro: { motivo: 'GRADUADO' } }), 'GRADUADO')
  assert.equal(motivoRetiroVigente({ motivo_retiro: 'ECONOMICO', retiro: { motivo: null } }), null)
  assert.equal(motivoRetiroVigente({ motivo_retiro: 'ECONOMICO', retiro: null }), 'ECONOMICO')
})

test('mensajeMotivoCorregido dice qué cambió y qué queda pendiente', () => {
  const mensaje = ejecutarFuncion(pageSource, 'mensajeMotivoCorregido', {
    nombreMes: (y, m) => `${m === 8 ? 'agosto' : m} ${y}`,
    etiquetaMotivo: (m) => ({ GRADUADO: 'Graduado', ECONOMICO: 'Económico', OTRO: 'Otro', NO_CONFIRMO: 'No confirmó continuidad' }[m] || ''),
  })
  const base = { ok: true, year: 2026, month: 8, otrosRetirosMismoMes: [] }
  assert.equal(mensaje('Ivannis', { ...base, motivoAnterior: 'ECONOMICO', motivo: 'GRADUADO' }), '✅ Motivo del retiro de Ivannis corregido: Económico → Graduado (retiro de agosto 2026).')
  const completo = mensaje('Ivannis', { ...base, motivoAnterior: 'ECONOMICO', motivo: 'GRADUADO', otrosRetirosMismoMes: [1128], requiereGuardar: true })
  assert.match(completo, /Ojo: Ivannis tiene otro retiro registrado en agosto 2026 y también cuenta\. Si fue un error, avísale a Administración; si el niño se retiró dos veces ese mes, está bien\./)
  assert.match(completo, /El KPI de agosto 2026 ya estaba guardado: abre KPI Mensual y vuelve a Guardar/)
  assert.match(mensaje('Ana', { ...base, motivoAnterior: 'OTRO', motivo: 'NO_CONFIRMO', mismoCampoKpi: true }), /cuentan como «Otro»: los totales no cambian/)
  assert.match(mensaje('Ana', { ...base, sinCambios: true, eventoCambio: true, motivo: 'OTRO' }), /^✅ No había nada que corregir: el retiro de Ana ya tiene el motivo Otro\. La lista que tenías abierta estaba desactualizada/)
  assert.match(mensaje('Ana', { ...base, motivoAnterior: null, motivo: 'OTRO' }), /corregido: sin motivo → Otro/)
})

test('el Cuadro deja de enseñar el rodeo y enlaza a donde se corrige el motivo', () => {
  assert.match(cuadroSource, /^import Link from 'next\/link'$/m)
  assert.match(cuadroSource, /<Link href=\{`\/centro\/\$\{id\}\/grupos#retirados`\}>Grupos › Sin grupo y retirados<\/Link>/)
  assert.doesNotMatch(cuadroSource, /si fue un error o el niño volvió/)
  assert.match(cuadroSource, /Reincorporar y volver a retirar cuenta un retiro de más/)
  assert.match(cuadroSource, /Si después ves que el motivo quedó mal, se corrige en Grupos › Sin grupo y retirados/)
})
