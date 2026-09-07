import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../', import.meta.url))

function jsFiles(dir) {
  return readdirSync(join(ROOT, dir), { withFileTypes: true })
    .flatMap((entry) => {
      const relative = `${dir}/${entry.name}`
      if (entry.isDirectory()) return jsFiles(relative)
      return entry.isFile() && entry.name.endsWith('.js') ? [relative] : []
    })
    .sort()
}

function exportedFunctions(relative) {
  const source = readFileSync(join(ROOT, relative), 'utf8')
  return [...source.matchAll(/^export async function\s+([A-Za-z0-9_]+)/gm)]
    .map((match) => match[1])
}

function functionSource(relative, name) {
  const source = readFileSync(join(ROOT, relative), 'utf8')
  const start = source.indexOf(`export async function ${name}`)
  assert.notEqual(start, -1, `${relative}#${name} no existe en la fuente`)
  const rest = source.slice(start)
  const next = rest.slice(1).search(/\nexport async function\s+/)
  return next === -1 ? rest : rest.slice(0, next + 1)
}

test('matriz backend cubre cada Server Action y Route Handler exportado', async () => {
  const { ACTION_ACCESS_MATRIX, API_ACCESS_MATRIX } = await import('../lib/access-matrix.mjs')
  const actions = jsFiles('app/actions').flatMap((file) =>
    exportedFunctions(file).map((name) => `${file}#${name}`)
  ).sort()
  const routes = jsFiles('app/api').flatMap((file) =>
    exportedFunctions(file).map((name) => `${file}#${name}`)
  ).sort()

  assert.deepEqual(Object.keys(ACTION_ACCESS_MATRIX).sort(), actions)
  assert.deepEqual(Object.keys(API_ACCESS_MATRIX).sort(), routes)
})

test('mutaciones autenticadas de centro usan guarda de escritura viva', async () => {
  const { ACTION_ACCESS_MATRIX, API_ACCESS_MATRIX, ACCESS_KINDS } = await import('../lib/access-matrix.mjs')
  for (const [key, kind] of Object.entries({ ...ACTION_ACCESS_MATRIX, ...API_ACCESS_MATRIX })) {
    if (kind !== ACCESS_KINDS.writeCentro) continue
    const [file, name] = key.split('#')
    const body = functionSource(file, name)
    assert.match(body, /requireCurrentWriteCentro\(/, `${key} esta clasificada como escritura y no llama requireCurrentWriteCentro`)
    assert.doesNotMatch(body, /requireCentroAccess\(/, `${key} conserva la guarda legacy de lectura`)
  }
})

test('acciones Master no quedan detras de General ni de claims del JWT', async () => {
  const { ACTION_ACCESS_MATRIX, API_ACCESS_MATRIX, ACCESS_KINDS } = await import('../lib/access-matrix.mjs')
  for (const [key, kind] of Object.entries({ ...ACTION_ACCESS_MATRIX, ...API_ACCESS_MATRIX })) {
    if (kind !== ACCESS_KINDS.master) continue
    const [file, name] = key.split('#')
    const body = functionSource(file, name)
    assert.match(body, /requireCurrentMaster\(/, `${key} debe releer Master vigente`)
    assert.doesNotMatch(body, /requireAdmin\(/, `${key} no puede usar admin_general como Master`)
    assert.doesNotMatch(body, /isAdminRole\(s?\.rol\)/, `${key} no puede decidir por rol del JWT`)
  }
})

test('lecturas Growth/KPI no inicializan filas para roles de solo lectura', () => {
  const growth = readFileSync(join(ROOT, 'app/actions/growth.js'), 'utf8')
  const getCentroGrowth = functionSource('app/actions/growth.js', 'getCentroGrowth')
  assert.match(getCentroGrowth, /puedeEscribirCentro\(session, centroId\)[\s\S]*options\?\.persist !== false/)
  const briefing = functionSource('app/actions/growth.js', 'getGrowthBriefing')
  assert.match(briefing, /const canWrite = puedeEscribirCentro\(session, centroId\)/)
  assert.match(briefing, /if \(!canWrite\)[\s\S]*reason: 'readonly'/)
  const overview = functionSource('app/actions/growth.js', 'getGrowthAdminOverview')
  assert.match(overview, /calculateCentroGrowth\(center\.id, \{ persist: puedeEscribirCentro\(sesion, center\.id\) \}/)
  assert.doesNotMatch(growth, /calculateCentroGrowth\(centroId\)\s*$/m)

  const kpi = functionSource('app/actions/kpi.js', 'loadKpiMes')
  assert.match(kpi, /fotoKpiAutomatica\(centroId,[\s\S]*\{ persist: false \}\)/)
  const centro = readFileSync(join(ROOT, 'app/actions/centro.js'), 'utf8')
  assert.equal((centro.match(/fotoKpiAutomatica\([^)]*\{ persist: false \}\)/g) || []).length, 2)
  const auto = readFileSync(join(ROOT, 'lib/kpi-auto-server.js'), 'utf8')
  assert.match(auto, /const shouldPersist = options\.persist !== false/)
  assert.match(auto, /if \(!shouldPersist\) return await conciliar\(sourceQuery\)/)
})
