import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Clases de Prueba: lo que el coordinador reportaba como "no guarda" eran
// errores tragados o pantallas que se vaciaban. Estas aserciones fijan el
// contrato: las actions devuelven { error } y la UI nunca pierde la tabla.
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')
const page = read('../app/centro/[id]/eventos/page.js')
const actions = read('../app/actions/eventos.js')

test('todas las actions de eventos devuelven { error } en vez de lanzar (fallo)', () => {
  assert.match(actions, /import \{ fallo \} from '\.\.\/\.\.\/lib\/errores'/)
  const exportadas = [...actions.matchAll(/^export async function\s+([A-Za-z0-9_]+)/gm)].map((m) => m[1])
  for (const nombre of exportadas) {
    if (nombre === 'eventosConfig') continue // no toca red ni BD
    const inicio = actions.indexOf(`export async function ${nombre}`)
    const resto = actions.slice(inicio + 1)
    const fin = resto.search(/\nexport async function\s+/)
    const cuerpo = fin < 0 ? resto : resto.slice(0, fin)
    assert.match(cuerpo, new RegExp(`return fallo\\('${nombre}', e\\)`), `${nombre} debe terminar en fallo()`)
  }
})

test('la tabla de registrados solo se oculta por error de CARGA, no por un error de acción', () => {
  assert.match(page, /const \[loadError, setLoadError\] = useState\(''\)[\s\S]*function Registrations|function Registrations[\s\S]*const \[loadError, setLoadError\] = useState\(''\)/)
  assert.match(page, /: loadError \? null : regs\.length === 0 \?/)
  assert.doesNotMatch(page, /status\.includes\('❌'\) \? null/)
  assert.match(page, /\{loadError && <div role="alert"[^>]*>\{loadError\} <button[^>]*onClick=\{load\}>Reintentar<\/button><\/div>\}/)
})

test('asistencia, pago e invitado liberan el botón siempre y avisan si la action revienta', () => {
  const registrations = page.slice(page.indexOf('function Registrations('))
  for (const fn of ['setAsist', 'setPagoR', 'addInv']) {
    const inicio = registrations.indexOf(`async function ${fn}(`)
    assert.ok(inicio >= 0, `${fn} existe`)
    const cuerpo = registrations.slice(inicio, registrations.indexOf('\n  }\n', inicio))
    assert.match(cuerpo, /try \{/, `${fn} usa try`)
    assert.match(cuerpo, /catch \{ setStatus\(ERROR_RED\) \}/, `${fn} avisa en el catch`)
    assert.match(cuerpo, /finally \{ (setBusy\(null\)|setSaving\(false\)) \}/, `${fn} libera en finally`)
  }
})

test('inscribir desde la clase refresca registros y cupos; eliminar y duplicar no quedan mudos', () => {
  assert.match(page, /onSaved=\{\(msg\) => \{ setInscribir\(null\); setStatus\('✅ ' \+ msg\); load\(\); onChange && onChange\(\) \}\}/)
  assert.match(page, /async function onDelete\(ev\) \{[\s\S]*?try \{[\s\S]*?\} catch \{ setStatus\('❌ No se pudo eliminar/)
  assert.match(page, /async function onDuplicate\(ev\) \{[\s\S]*?try \{[\s\S]*?\} catch \{ setStatus\('❌ No se pudo duplicar/)
})

test('un fallo de equipos/etapas del CRM no esconde la lista de clases', () => {
  assert.match(page, /if \(evRes\.error\) setLoadError\(evRes\.error\)\n\s+else if \(opRes\.error\) setStatus\('❌ Las clases cargaron/)
  assert.doesNotMatch(page, /if \(evRes\.error \|\| opRes\.error\) setLoadError/)
})
