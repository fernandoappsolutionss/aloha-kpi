// Grupos y Fusiones (app/centro/[id]/grupos/page.js): el cliente no se queda
// mudo ni trabado cuando una Server Action LANZA, el {error} del detalle se ve
// también cuando el detalle es panel deslizante (<1180px), y "Editar niño"
// ofrece solo los grupos que el server va a aceptar. Aserciones sobre el
// fuente, igual que itinerario-mixto-vista y retirados-historial.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const src = readFileSync(new URL('../app/centro/[id]/grupos/page.js', import.meta.url), 'utf8')

// Cuerpo de una función declarada con `async function nombre(` hasta su cierre
// (`}` en la misma indentación que la declaración).
function cuerpo(nombre) {
  const m = src.match(new RegExp(`\\n( *)async function ${nombre}\\(`))
  assert.ok(m, `existe async function ${nombre}`)
  const ini = m.index
  const fin = src.indexOf(`\n${m[1]}}\n`, ini)
  assert.ok(fin > ini, `cierre de ${nombre}`)
  return src.slice(ini, fin)
}
// Función/componente declarado en el nivel del módulo (cierre `}` en columna 0).
function componente(nombre) {
  const m = src.match(new RegExp(`\\n(?:async )?function ${nombre}\\(`))
  assert.ok(m, `existe function ${nombre}`)
  return src.slice(m.index, src.indexOf('\n}\n', m.index))
}

const ACCIONES = ['setInscripcionAbierta', 'extenderVentanaLlenado', 'cerrarGrupo', 'reabrirGrupo', 'graduarTiny',
  'revertirBajaPotencial', 'cancelarRetiroProgramado', 'aplicarFusion', 'linkCoach', 'eliminarReserva', 'toggleCoach', 'toggleSalon']

test('conFallo: una action que LANZA pinta ❌ legible, recarga y devuelve null', () => {
  const h = componente('conFallo')
  assert.match(h, /catch \(e\) \{/)
  assert.match(h, /setStatus\('❌ No se pudo guardar: ' \+ \(e\?\.message \|\| 'revisa tu conexión o vuelve a entrar'\)\)/)
  assert.match(h, /recarga\?\.\(\)/)
  assert.match(h, /return null/)
})

test('ninguna action del panel, fusiones, horarios ni recursos se espera a pelo', () => {
  const aPelo = new RegExp(`await (?:${ACCIONES.join('|')})\\(`, 'g')
  assert.deepEqual([...src.matchAll(aPelo)].map((m) => m[0]), [])
  for (const a of ACCIONES) assert.match(src, new RegExp(`conFallo\\(\\(\\) => ${a}\\(`), `${a} pasa por conFallo`)
  // Tras conFallo, el caller corta si devolvió null (no lee res.error de null).
  for (const fn of ['onToggleInscripcion', 'onExtenderVentana', 'onCerrarGrupo', 'onReabrirGrupo', 'onGraduar', 'onRevertirBaja', 'onCancelarRetiro', 'onAplicarFusion', 'onLinkCoach', 'quitarReserva', 'onToggleCoach', 'onToggleSalon']) {
    assert.match(cuerpo(fn), /if \(!res\) return/, `${fn} corta si conFallo devolvió null`)
  }
})

test('los busy se liberan SIEMPRE en finally', () => {
  for (const [fn, busy] of [
    ['onAplicarFusion', 'setBusyFusion(null)'],
    ['guardar', 'setGuardando(false)'],
    ['quitarReserva', 'setBorrando(false)'],
    ['onToggleCoach', 'setBusy(null)'],
    ['onToggleSalon', 'setBusy(null)'],
  ]) {
    const c = cuerpo(fn)
    assert.match(c, new RegExp(`finally \\{[^}]*${busy.replace(/[()]/g, '\\$&')}`), `${fn}: ${busy} en finally`)
    // Ya no se libera "a mano" entre el await y el if: solo en el finally.
    assert.equal((c.match(new RegExp(busy.replace(/[()]/g, '\\$&'), 'g')) || []).length, 1, `${fn}: un solo ${busy}`)
  }
})

test('el retiro ya guardado recarga aunque el cierre del grupo vacío lance', () => {
  assert.match(cuerpo('retiroGuardado'), /conFallo\(\(\) => cerrarGrupo\(id, est\.grupo_id\), setStatus, refresca\)/)
})

test('pantalla angosta: el banner ✅/❌ se repite dentro de la cabecera del sheet', () => {
  const alerta = componente('StatusAlert')
  assert.match(alerta, /role=\{isError \? 'alert' : 'status'\}/)
  assert.match(alerta, /status\.includes\('❌'\)/)
  // El banner principal sigue en <main>…
  assert.match(src, /<main id="main-content"[^]*?<StatusAlert status=\{status\} \/>/)
  // …y el sheet recibe el mismo status y lo pinta en su cabecera.
  assert.match(src, /<GrupoSheet\n[^]*?status=\{status\}[^]*?onClose=\{\(\) => setOpenId\(null\)\}/)
  assert.match(componente('GrupoSheet'), /status=\{status\}/)
  const detalle = componente('GrupoDetalle')
  assert.match(detalle, /function GrupoDetalle\(\{[^)]*\bstatus\b/)
  const head = detalle.slice(detalle.indexOf('<header className="grp-detail__head">'), detalle.indexOf('</header>'))
  assert.match(head, /\{sheet && <StatusAlert status=\{status\}/)
})

test('Editar niño sin grupo e inscripción respetan la apertura manual', () => {
  const modal = componente('EstudianteModal')
  assert.match(modal, /const primeraColocacion = est\.grupo_id == null/)
  assert.match(modal, /ventanaNuevos\(g, hoyISO\(\)\)/)
  assert.match(modal, /const permitido = aceptaInscripciones\(g\)/)
  assert.match(modal, /primeraColocacion \? marcaNoAcepta\(v\) : ' · 🔒 cerrado'/)
  // Misma marca que en Inscribir niño.
  assert.match(componente('InscribirModal'), /const marca = permitido \? '' : marcaNoAcepta\(v\)/)
  const marca = componente('marcaNoAcepta')
  assert.match(marca, /'palanca_cerrada'\) return ' · 🔒 cerrado'/)
  assert.match(marca, /'vencida'\) return ' · ventana de nuevos vencida'/)
  assert.match(marca, /return ' · cerrado a nuevos'/)
})

test('Horarios: los bloques verdes del calendario son botones reales que aperturan', () => {
  assert.match(src, /const Bloque = canWrite \? 'button' : 'div'/)
  assert.match(src, /onClick: \(\) => onAbrirGrupo\(\{ horarios: sl\.horarios, itinerario: esKinder \? 'KINDER' : undefined \}\)/)
  assert.doesNotMatch(src, /clickHueco|unidadParaHueco|inicioVendible/)
})
