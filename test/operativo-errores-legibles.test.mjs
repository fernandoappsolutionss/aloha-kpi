import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { fallo } from '../lib/errores.js'

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

// Cuerpo de una Server Action: desde su firma hasta la siguiente exportada.
function cuerpo(source, name) {
  const start = source.indexOf(`export async function ${name}`)
  assert.notEqual(start, -1, `${name} no existe`)
  const rest = source.slice(start)
  const next = rest.slice(1).search(/\nexport async function\s+/)
  return next === -1 ? rest : rest.slice(0, next + 1)
}

// ── Cumplimiento: las acciones devuelven { error } en vez de lanzar ─────────
// En producción Next enmascara el mensaje de un `throw` dentro de una Server
// Action ("An error occurred in the Server Components render…"), así que la
// coordinadora veía "no guarda" sin saber si era sesión, permiso o base.
test('acciones de cumplimiento envuelven el cuerpo en try/catch → fallo(nombre, e)', () => {
  const accion = read('../app/actions/cumplimiento.js')
  assert.match(accion, /import \{ fallo \} from '\.\.\/\.\.\/lib\/errores'/)
  for (const name of ['loadCumplimiento', 'getDisciplinaTrimestre', 'getMetasMarcadas', 'saveCumplimiento']) {
    const body = cuerpo(accion, name)
    assert.match(body, /^  try \{$/m, `${name}: sin try`)
    assert.match(body, new RegExp(`\\} catch \\(e\\) \\{ return fallo\\('${name}', e\\) \\}`), `${name}: no devuelve fallo()`)
    // La guarda de acceso sigue DENTRO del cuerpo (lo exige backend-access-matrix).
    const guarda = name === 'saveCumplimiento' ? /requireCurrentWriteCentro\(/ : /requireCentroAccess\(/
    assert.match(body, guarda, `${name}: perdió la guarda de acceso`)
    assert.ok(body.indexOf('try {') < body.search(guarda), `${name}: la guarda debe quedar dentro del try`)
  }
})

test('fallo() traduce sesión y permiso a mensajes legibles', () => {
  const silencio = console.error
  console.error = () => {}
  try {
    assert.deepEqual(fallo('x', new Error('No autenticado')), { error: 'Tu sesión expiró. Vuelve a entrar.' })
    assert.deepEqual(fallo('x', new Error('No autorizado para este centro')), { error: 'Tu usuario no tiene acceso a este centro.' })
    assert.deepEqual(fallo('x', new Error('Cotización no encontrada.')), { error: 'Cotización no encontrada.' })
  } finally { console.error = silencio }
})

// ── Cumplimiento (pantalla): guardia de versión y { error } del servidor ────
test('la pantalla de cumplimiento descarta respuestas tardías antes de pintar', () => {
  const pagina = read('../app/centro/[id]/cumplimiento/page.js')
  assert.match(pagina, /import \{[^}]*\buseRef\b[^}]*\} from 'react'/)
  assert.match(pagina, /const revisionMes = useRef\(0\)/)
  assert.match(pagina, /const revisionTrimestre = useRef\(0\)/)

  const loadData = pagina.slice(pagina.indexOf('async function loadData()'), pagina.indexOf('async function loadProducto()'))
  assert.match(loadData, /const v = \+\+revisionMes\.current/)
  // Tras el await y ANTES de cualquier setState (incluido setLoading(false)).
  const await_ = loadData.indexOf('await loadCumplimiento(')
  const guarda = loadData.indexOf('if (v !== revisionMes.current) return', await_)
  assert.ok(guarda > await_, 'loadData: la guarda va después del await')
  for (const set of ['setTrimestreId(', 'setExiste(', 'setVals(', 'setLoading(false)']) {
    assert.ok(loadData.indexOf(set, await_) > guarda, `loadData: ${set} antes de la guarda`)
  }
  // El catch también respeta la guarda.
  assert.match(loadData, /catch \(e\) \{\n\s*if \(v !== revisionMes\.current\) return/)

  const loadProducto = pagina.slice(pagina.indexOf('async function loadProducto()'), pagina.indexOf('function toggle('))
  assert.match(loadProducto, /const v = \+\+revisionTrimestre\.current/)
  const all = loadProducto.indexOf('await Promise.all(')
  const guardaQ = loadProducto.indexOf('if (v !== revisionTrimestre.current) return', all)
  assert.ok(guardaQ > all)
  for (const set of ['setDisciplinaQ(', 'setMetasMarcadas(', 'setProducto(', 'setSerie(', 'setEstado(']) {
    assert.ok(loadProducto.indexOf(set) > guardaQ, `loadProducto: ${set} antes de la guarda`)
  }
})

test('la pantalla muestra el { error } del servidor con Reintentar y no lo confunde con datos', () => {
  const pagina = read('../app/centro/[id]/cumplimiento/page.js')
  const loadData = pagina.slice(pagina.indexOf('async function loadData()'), pagina.indexOf('async function loadProducto()'))
  assert.match(loadData, /if \(res\.error\) setError\(res\.error\)/)
  assert.doesNotMatch(loadData, /const \{ trimestreId[^}]*\} = await loadCumplimiento/, 'destructurar un { error } dejaba el mes como "sin registrar"')
  assert.match(pagina, /error \? <div role="alert">\{error\}<button[^>]*onClick=\{loadData\}>Reintentar<\/button>/)
  // Guardar sigue enseñando el mensaje del servidor.
  const save = pagina.slice(pagina.indexOf('async function save()'), pagina.indexOf('const nombreMes ='))
  assert.match(save, /if \(res\.error\) throw new Error\(res\.error\)/)
  assert.match(save, /setStatus\('❌ Error: ' \+ e\.message\)/)
  // Contexto del trimestre: un { error } no es un dato.
  const helper = pagina.match(/^const sinError = .*$/m)
  assert.ok(helper, 'falta sinError')
  const sinError = runInNewContext(`${helper[0]};\nsinError`)
  assert.equal(sinError({ error: 'x' }), null)
  assert.equal(sinError(null), null)
  assert.deepEqual(sinError({ pct: 50 }), { pct: 50 })
  assert.deepEqual(sinError([]), [])
  assert.match(pagina, /setDisciplinaQ\(sinError\(disciplina\)\)/)
  assert.match(pagina, /setMetasMarcadas\(sinError\(marcadas\) \|\| \[\]\)/)
  assert.doesNotMatch(pagina, /\.then\(setDisciplinaQ\)/, 'ningún then() puede guardar un { error } como disciplina')
})

// ── Cotización: el sondeo no esconde el error real de la acción ─────────────
test('el sondeo de la cotización corta ante un { error } sin upload_status', () => {
  const card = read('../components/peticiones/CotizacionCard.js')
  const loop = card.slice(card.indexOf('for (let attempt = 0; attempt < 40; attempt++)'), card.indexOf('if (!finalState)'))
  assert.match(loop, /if \(state\?\.error && !state\?\.upload_status\) throw new Error\(state\.error\)/)
  assert.ok(loop.indexOf('!state?.upload_status') < loop.indexOf("upload_status === 'valid'"), 'el fallo de la acción se mira antes que el estado')
  // El `error` de una validación fallida (con upload_status) sigue su camino.
  assert.match(loop, /if \(state\?\.upload_status === 'invalid'\) throw new Error\(state\.error \|\| /)
})

// ── Encuestas: el portapapeles no condiciona el registro de la difusión ────
test('Copiar enlace registra la difusión aunque el portapapeles falle', () => {
  const panel = read('../components/encuestas/EncuestasPanel.js')
  const ejecutar = panel.slice(panel.indexOf('async function ejecutar('), panel.indexOf('const nombreMes='))
  // El fallo del portapapeles ya no lanza: deja constancia y sigue.
  assert.match(ejecutar, /try \{await navigator\.clipboard\.writeText\(url\)\} catch \{copiado=false\}/)
  assert.doesNotMatch(ejecutar, /catch \{throw new Error\('El navegador no permitió copiar/)
  // El enlace manual se muestra antes de intentar copiar.
  assert.ok(ejecutar.indexOf('setLinkManual(url)') < ejecutar.indexOf('navigator.clipboard.writeText'))
  // La difusión se registra en el mismo flujo, sin depender del resultado del portapapeles.
  const registro = ejecutar.indexOf('await registrarDifusionEncuesta(centroId,c.id,tipo)')
  assert.ok(registro > ejecutar.indexOf('navigator.clipboard.writeText'))
  assert.ok(ejecutar.indexOf('await cargar(v)') > registro, 'cargar(v) también en ese camino')
  // Y el estado dice la verdad: difusión registrada, copia el enlace visible.
  assert.match(ejecutar, /!copiado\?'Difusión del mes registrada\. El navegador no permitió copiar: usa el enlace visible/)
})
