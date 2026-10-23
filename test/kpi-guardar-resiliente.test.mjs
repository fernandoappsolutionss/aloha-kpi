import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

// Guardar KPI resiliente: reintento ante cruces SERIALIZABLE, guardado sin
// foto automática (solo cerrar mes es estricto) y permisos con reintento.
// app/actions/kpi.js es 'use server' (solo exporta acciones async), así que
// sus helpers puros se extraen de la fuente y se evalúan aislados.

const fuente = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8')
const kpi = fuente('../app/actions/kpi.js')
const page = fuente('../app/centro/[id]/kpi/page.js')
const hook = fuente('../components/useCurrentAccess.js')

// Trozo de la fuente desde `inicio` hasta la línea que empieza por `fin`.
function trozo(src, inicio, fin) {
  const a = src.indexOf(inicio)
  assert.notEqual(a, -1, `no existe: ${inicio}`)
  const b = src.indexOf(`\n${fin}`, a)
  assert.notEqual(b, -1, `no existe el cierre: ${fin}`)
  return src.slice(a, b + 1)
}

function helpersKpi() {
  const constantes = trozo(kpi, "const REINTENTABLES = new Set", 'async function conReintentoSerializable')
  const intOr = trozo(kpi, 'const intOr = (v, d = 0) => {', 'const ymDe')
  const reintento = trozo(kpi, 'async function conReintentoSerializable', '// De dónde sale cada campo de resumen')
  // Se corta antes de AUTO_MOTIVOS_DESDE, que depende de un import.
  const origen = trozo(kpi, 'function origenResumen(', '// Desde AGOSTO 2026')
  return new Function(`${intOr}\n${constantes}\n${reintento}\n${origen}\nreturn { conReintentoSerializable, origenResumen, ERROR_CRUCE }`)()
}

test('conReintentoSerializable repite la transacción ante 40001/40P01 y luego habla en español', async () => {
  const { conReintentoSerializable, ERROR_CRUCE } = helpersKpi()
  const serializacion = Object.assign(new Error('could not serialize access'), { code: '40001' })
  const deadlock = Object.assign(new Error('deadlock detected'), { code: '40P01' })

  let llamadas = 0
  const ok = await conReintentoSerializable(async () => {
    llamadas++
    if (llamadas === 1) throw serializacion
    if (llamadas === 2) throw deadlock
    return { ok: true }
  })
  assert.deepEqual(ok, { ok: true })
  assert.equal(llamadas, 3)

  llamadas = 0
  const agotado = await conReintentoSerializable(async () => { llamadas++; throw serializacion })
  assert.deepEqual(agotado, { error: ERROR_CRUCE })
  assert.equal(llamadas, 3)
  assert.equal(ERROR_CRUCE, 'Otro cambio del centro se cruzó con el guardado. Intenta de nuevo.')

  // Cualquier otro error sigue subiendo tal cual (fallo() lo traduce).
  llamadas = 0
  await assert.rejects(
    conReintentoSerializable(async () => { llamadas++; throw Object.assign(new Error('boom'), { code: '23505' }) }),
    /boom/,
  )
  assert.equal(llamadas, 1)
})

test('origenResumen: en mes automático sin foto manda la fila guardada, nunca el formulario', () => {
  const { origenResumen } = helpersKpi()
  const config = { cp_invitados: '99', cp_matriculados: '77', orig_referido: '55', mot_tecnica: '44' }
  const previa = { cp_invitados: 12, cp_matriculados: 3, orig_referido: 4, mot_tecnica: 2 }

  // Sin foto, con fila previa: cp_*/orig_* de la fila; motivos del módulo si respondió.
  let o = origenResumen({ automaticData: null, auto: { mot_tecnica: 7 }, previa, config, periodoAutomatico: true })
  assert.equal(o.resumen('cp_invitados'), 12)
  assert.equal(o.resumen('cp_matriculados'), 3)
  assert.equal(o.resumen('orig_referido'), 4)
  assert.equal(o.mot('mot_tecnica'), 7)

  // Sin foto, sin módulo: motivos también de la fila previa.
  o = origenResumen({ automaticData: null, auto: null, previa, config, periodoAutomatico: true })
  assert.equal(o.mot('mot_tecnica'), 2)

  // Sin foto y sin fila previa: 0, jamás el 99 del cliente.
  o = origenResumen({ automaticData: null, auto: null, previa: null, config, periodoAutomatico: true })
  assert.equal(o.resumen('cp_invitados'), 0)
  assert.equal(o.resumen('orig_referido'), 0)
  assert.equal(o.mot('mot_tecnica'), 0)

  // Con foto completa, la foto manda sobre todo lo demás.
  o = origenResumen({ automaticData: { cp_invitados: 5, mot_tecnica: 1 }, auto: { mot_tecnica: 7 }, previa, config, periodoAutomatico: true })
  assert.equal(o.resumen('cp_invitados'), 5)
  assert.equal(o.mot('mot_tecnica'), 1)

  // Mes manual (antes del gate): se sigue aceptando el formulario, como siempre.
  o = origenResumen({ automaticData: null, auto: null, previa, config, periodoAutomatico: false })
  assert.equal(o.resumen('cp_invitados'), 99)
  assert.equal(o.mot('mot_tecnica'), 44)
})

test('guardarKpiBloqueado solo rechaza sin foto en modo estricto y avisa al guardar sin ella', () => {
  const bloqueado = trozo(kpi, 'async function guardarKpiBloqueado(', 'async function guardarKpiMes(')
  assert.match(bloqueado, /\{ estricto = false \} = \{\}\)/)
  assert.match(bloqueado, /if \(estricto\) throw new Error\('No se pudieron verificar las clases de prueba/)
  // El throw ya no es incondicional.
  assert.doesNotMatch(bloqueado, /if \(periodoAutomatico && !automaticData\) \{\s*\n\s*throw/)
  // Sin foto se lee la fila ya guardada dentro de la misma transacción (query).
  assert.match(bloqueado, /\[previa\] = await query`SELECT \* FROM resumen_mes WHERE centro_id = \$\{centroId\} AND year = \$\{year\} AND month = \$\{month\}`/)
  assert.match(bloqueado, /origenResumen\(\{ automaticData, auto, previa, config, periodoAutomatico \}\)/)
  // cp_*/orig_* pasan por resumen(); nada sale de config directamente.
  for (const k of ['cp_invitados', 'cp_asistieron', 'cp_matriculados', 'orig_referido', 'orig_marketing', 'orig_centro', 'orig_activaciones', 'orig_medios', 'orig_por_clasificar']) {
    assert.match(bloqueado, new RegExp(`resumen\\('${k}'\\)`), `${k} debe resolverse con resumen()`)
    assert.doesNotMatch(bloqueado, new RegExp(`intOr\\(config\\.${k}\\)`), `${k} no puede venir del cliente`)
  }
  // cob_* sigue siendo captura del cliente; ing/des solo se materializan en 'auto'.
  assert.match(bloqueado, /cob_d1: intOr\(w\.cob\?\.\[0\], null\)/)
  assert.match(bloqueado, /const ingSemana = esAuto \? kpiAuto\.ing\[i\] : null/)
  assert.match(bloqueado, /return sinFoto \? \{ ok: true, warn: WARN_SIN_FOTO \} : \{ ok: true \}/)
  assert.match(kpi, /const WARN_SIN_FOTO = 'El KPI se guardó sin sincronizar clases de prueba\/motivos; se conservaron los últimos valores guardados\.'/)
})

test('guardar reintenta y no es estricto; cerrar mes sí; reabrir también reintenta', () => {
  const save = trozo(kpi, 'export async function saveKpiMes(', 'export async function cerrarMes(')
  assert.match(save, /await requireCurrentWriteCentro\(centroId\)\n\s*return await conReintentoSerializable\(\(\) => guardarKpiMes\(/)
  assert.match(save, /guardarKpiBloqueado\(query, centroId, year, month, config, semanas, automatic, kpiAuto\)\n/)
  assert.doesNotMatch(save, /estricto: true/)

  const cerrar = trozo(kpi, 'export async function cerrarMes(', 'export async function reabrirMes(')
  assert.match(cerrar, /return await conReintentoSerializable\(\(\) => withTransaction\(async \(query\) => \{/)
  assert.match(cerrar, /guardarKpiBloqueado\(query, centroId, y, m, config, semanas, automatic, kpiAuto, \{ estricto: true \}\)/)

  const reabrir = kpi.slice(kpi.indexOf('export async function reabrirMes('))
  assert.match(reabrir, /return await conReintentoSerializable\(\(\) => withTransaction\(async \(query\) => \{/)
  // Ninguna transacción del KPI queda sin el bucle de reintento.
  assert.equal((kpi.match(/withTransaction\(/g) || []).length, 3)
  assert.equal((kpi.match(/conReintentoSerializable\(\(\) => /g) || []).length, 3)
})

test('la pantalla KPI muestra el aviso del guardado y deja de prometer edición de resumen', () => {
  assert.match(page, /guardado\.' \+ \(res\.warn \? ' ⚠️ ' \+ res\.warn : ''\)/)
  assert.doesNotMatch(page, /revísalos antes de guardar/)
  assert.match(page, /se quedan con los últimos valores guardados y no se editan aquí/)
  // Clase de prueba, motivos y origen bloqueados en mes automático aunque la sincronización falle.
  assert.match(page, /const resumenAutomatico = usaKpiAutomatico\(year, month, mesEstado\)/)
  assert.match(page, /title:'Clase de Prueba'[^\n]*auto:resumenAutomatico,/)
  assert.match(page, /title:'Motivo Deserción'[^\n]*auto:resumenAutomatico \|\| !!motivosAuto,/)
  assert.match(page, /title:'Origen Nuevos Ingresos'[^\n]*auto:resumenAutomatico,/)
})

test('la pantalla KPI distingue permiso en carga, permiso fallido y modo consulta real', () => {
  const save = page.slice(page.indexOf('async function handleSave()'), page.indexOf('async function handleCerrarMes()'))
  // Primero loading, después el permiso: nunca «modo consulta» mientras se comprueba.
  assert.ok(save.indexOf('if (access.loading)') < save.indexOf('if (!access.canWriteOperations)'))
  assert.match(save, /Comprobando tu permiso…/)
  assert.match(save, /access\.error \? '❌ No se pudo comprobar tu permiso\./)
  assert.match(page, /\{access\.error && !access\.loading && \(/)
  assert.match(page, /<button onClick=\{\(\) => access\.reload\(\)\} className="btn">Reintentar permisos<\/button>/)
  assert.match(page, /access\.loading \? \(\s*\n\s*<button disabled className="btn btn--primary">Comprobando permiso…<\/button>/)
})

test('useCurrentAccess reintenta la carga del contexto antes de rendirse y expone reload()', async () => {
  const src = trozo(hook, 'async function cargarContexto(', 'export function useCurrentAccess()')
  const cargarContexto = new Function('getNavigationContext', 'pausa', 'REINTENTOS_CONTEXTO', 'PAUSA_REINTENTO_MS', `${src}\nreturn cargarContexto`)(
    () => { throw new Error('no debería usarse') }, () => Promise.resolve(), 2, 800,
  )
  const esperas = []
  const esperar = async (ms) => { esperas.push(ms) }

  let intentos = 0
  const data = await cargarContexto({ cargar: async () => { intentos++; if (intentos < 3) throw new Error('red'); return { actor: { role: 'coordinador' } } }, esperar })
  assert.deepEqual(data, { actor: { role: 'coordinador' } })
  assert.equal(intentos, 3)
  assert.deepEqual(esperas, [800, 800])

  intentos = 0
  await assert.rejects(cargarContexto({ cargar: async () => { intentos++; throw new Error('caído') }, esperar }), /caído/)
  assert.equal(intentos, 3)

  assert.match(hook, /const REINTENTOS_CONTEXTO = 2/)
  assert.match(hook, /const PAUSA_REINTENTO_MS = 800/)
  assert.match(hook, /\}, \[intento\]\)/)
  assert.match(hook, /const reload = useCallback\(\(\) => setIntento\(\(n\) => n \+ 1\), \[\]\)/)
  assert.match(hook, /return \{ \.\.\.access, context, loading, error, loaded: !loading, reload \}/)
})
