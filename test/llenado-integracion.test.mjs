import test from 'node:test'
import assert from 'node:assert/strict'

// Tests de integración del gate (diseño 2026-08-08, fase 10) — la parte PURA:
// el CAS del cron simulado en memoria con la MISMA semántica que el statement
// CTE de lib/llenado-service.js, el contrato viejo/nuevo del payload CRM y la
// secuencia única `visibles` de la lista de grupos. Lo que necesita BD o red
// (SKIP LOCKED real, presupuesto, push al CRM) queda para el smoke en preview.

import { readFileSync } from 'node:fs'

import { fingerprintLlenado } from '../lib/llenado-outbox.mjs'
import { ventanaNuevos, ordenarPorCierreLlenado, fechaLimiteNuevos } from '../lib/llenado.mjs'
import { aceptaNuevosEnSelector, ordenarPorLimiteNuevos } from '../lib/colocacion.mjs'
import { armarAlohaGroupPayload } from '../lib/cupos-payload.mjs'

// --- Fixtures: misma forma de itinerario que genera lib/itinerario.js -------

const semana = (corto, tipo, fechas) => ({ etiqueta: String(corto), tipo, corto, fechas })

const itinerarioTiny = () => ({
  nivel: 1,
  fecha_inicio: '2026-08-17',
  semanas: [
    semana('I1', 'induccion', ['2026-08-17', '2026-08-19']),
    semana('1', 'clase', ['2026-08-31', '2026-09-02']),
    semana('2', 'clase', ['2026-09-07', '2026-09-09']),
    semana('3', 'clase', ['2026-09-14', '2026-09-16']),
    semana('4', 'clase', ['2026-09-21', '2026-09-23']),
  ],
})

const grupoTiny = (extra = {}) => ({
  id: 7,
  estado: 'activo',
  itinerario: 'TINY',
  inscripcion_abierta: true,
  itinerario_clases: itinerarioTiny(),
  ...extra,
})

// =============================================================================
// CAS del cron: dos detecciones concurrentes → UNA sola tanda de notificaciones
// =============================================================================

// Espejo en memoria del statement CTE de detectarTransicionesVentana
// (lib/llenado-service.js:87-102): el UPDATE con IS DISTINCT FROM es el CAS y
// el INSERT ... FROM cambiado ON CONFLICT (clave_idem) DO NOTHING solo encola
// si el CAS ganó. La BD serializa los UPDATE sobre la misma fila de grupos;
// aquí se reproduce aplicándolos en orden sobre el mismo store compartido.
const nuevoStore = (fingerprintInicial = null) => ({
  fingerprint: fingerprintInicial,
  outbox: new Map(), // clave_idem -> fila (UNIQUE de crm_sync_outbox)
})

function detectarConCas(store, grupo, hoyIso, eventos) {
  const fp = fingerprintLlenado(grupo, hoyIso)
  // UPDATE grupos SET llenado_fingerprint = $fp
  //   WHERE id = $id AND llenado_fingerprint IS DISTINCT FROM $fp RETURNING id
  const cambiado = store.fingerprint !== fp
  if (!cambiado) return { transiciones: 0, encoladas: 0 }
  store.fingerprint = fp
  // INSERT ... SELECT ... FROM cambiado, centro_eventos ce
  //   ON CONFLICT (clave_idem) DO NOTHING  (clave = fp || '|' || crm_event_id)
  let encoladas = 0
  for (const ev of eventos) {
    const clave = `${fp}|${ev.crm_event_id}`
    if (store.outbox.has(clave)) continue
    store.outbox.set(clave, { crm_event_id: ev.crm_event_id, grupo_id: grupo.id, op: 'sync_group', motivo: 'ventana', clave_idem: clave })
    encoladas += 1
  }
  return { transiciones: 1, encoladas }
}

test('dos detecciones concurrentes de la MISMA transición: una sola gana el CAS y encola', () => {
  const g = grupoTiny()
  const eventos = [{ crm_event_id: 'ev-a' }, { crm_event_id: 'ev-b' }]
  // Ambas corridas pasaron el pre-chequeo JS con el fingerprint viejo (el del
  // 23, ventana aún abierta); al cruzar al 24 la BD serializa los CAS: gana una.
  const store = nuevoStore(fingerprintLlenado(g, '2026-09-23'))
  const r1 = detectarConCas(store, g, '2026-09-24', eventos)
  const r2 = detectarConCas(store, g, '2026-09-24', eventos)
  assert.deepEqual(r1, { transiciones: 1, encoladas: 2 })
  assert.deepEqual(r2, { transiciones: 0, encoladas: 0 })
  assert.equal(store.outbox.size, 2) // una fila por evento CRM, ni una más
})

test('reintento tras caída a mitad de encolado: ON CONFLICT no duplica filas', () => {
  const g = grupoTiny()
  const store = nuevoStore(fingerprintLlenado(g, '2026-09-23'))
  // Primera corrida encoló ev-a pero cayó antes de terminar... en el servicio
  // real el CTE es atómico (todo o nada); el escenario que SÍ existe es el
  // reintento con el fingerprint ya marcado tras un rollback parcial simulado:
  detectarConCas(store, g, '2026-09-24', [{ crm_event_id: 'ev-a' }])
  store.fingerprint = fingerprintLlenado(g, '2026-09-23') // la marca se revirtió
  const r = detectarConCas(store, g, '2026-09-24', [{ crm_event_id: 'ev-a' }, { crm_event_id: 'ev-b' }])
  assert.deepEqual(r, { transiciones: 1, encoladas: 1 }) // ev-a ya estaba: solo entra ev-b
  assert.equal(store.outbox.size, 2)
})

test('vencimiento y luego apertura del nivel nuevo: DOS transiciones con claves distintas', () => {
  const eventos = [{ crm_event_id: 'ev-a' }]
  const g1 = grupoTiny()
  const store = nuevoStore(fingerprintLlenado(g1, '2026-09-01'))
  // Cruza la fecha límite (misma fecha límite, hoy distinto ⇒ cerrada).
  const vencimiento = detectarConCas(store, g1, '2026-09-24', eventos)
  // Pasa de nivel: el itinerario trae semana límite nueva y la ventana reabre.
  const g2 = grupoTiny({
    itinerario_clases: {
      nivel: 2,
      fecha_inicio: '2027-01-11',
      semanas: [semana('2', 'clase', ['2027-01-18', '2027-01-20']), semana('4', 'clase', ['2027-02-01', '2027-02-03'])],
    },
  })
  const apertura = detectarConCas(store, g2, '2027-01-05', eventos)
  assert.deepEqual(vencimiento, { transiciones: 1, encoladas: 1 })
  assert.deepEqual(apertura, { transiciones: 1, encoladas: 1 })
  assert.equal(store.outbox.size, 2) // claves distintas: ninguna pisa a la otra
})

// =============================================================================
// Payload CRM: el contrato viejo sobrevive intacto junto al nuevo (defecto 11)
// =============================================================================

const CLAVES_VIEJAS = ['numero', 'centro', 'horario', 'cupos_total', 'cupos_disponibles', 'actualizado_at']
const CLAVES_NUEVAS = ['fecha_limite_nuevos', 'dias_para_iniciar', 'faltan_para_meta', 'ritmo_semanal_necesario']

test('CRM viejo y nuevo leen el MISMO payload: proyección de 6 claves intacta + 4 aditivas', () => {
  const payload = armarAlohaGroupPayload(grupoTiny({ numero: 12, centro: 'Albrook', ninos: 5 }), {
    horario: 'Lun/Mié 3:00–4:00',
    cuposTotal: 14,
    metaApertura: 6,
    gpnMin: 8,
    hoyIso: '2026-09-01',
    ahoraIso: '2026-09-01T12:00:00.000Z',
  })
  // Un CRM viejo proyecta solo sus 6 claves y obtiene exactamente lo de siempre
  // (nombres, tipos y valores).
  const viejo = Object.fromEntries(CLAVES_VIEJAS.map((k) => [k, payload[k]]))
  assert.deepEqual(viejo, {
    numero: '12',
    centro: 'Albrook',
    horario: 'Lun/Mié 3:00–4:00',
    cupos_total: 14,
    cupos_disponibles: 9,
    actualizado_at: '2026-09-01T12:00:00.000Z',
  })
  // El CRM nuevo ve además las notas del vendedor — y ni una clave más.
  assert.deepEqual(Object.keys(payload).sort(), [...CLAVES_VIEJAS, ...CLAVES_NUEVAS].sort())
})

test('al vencer la ventana, para el CRM viejo solo se mueve cupos_disponibles (a 0)', () => {
  const args = { horario: 'h', cuposTotal: 14, metaApertura: 6, gpnMin: 8, ahoraIso: 'T' }
  const antes = armarAlohaGroupPayload(grupoTiny({ numero: 1, centro: 'C', ninos: 5 }), { ...args, hoyIso: '2026-09-23' })
  const despues = armarAlohaGroupPayload(grupoTiny({ numero: 1, centro: 'C', ninos: 5 }), { ...args, hoyIso: '2026-09-24' })
  assert.equal(antes.cupos_disponibles, 9) // el día del límite todavía entra
  assert.equal(despues.cupos_disponibles, 0) // fórmula nueva (g2-5): ventana vencida = 0
  for (const k of ['numero', 'centro', 'horario', 'cupos_total', 'actualizado_at']) {
    assert.deepEqual(despues[k], antes[k])
  }
})

// =============================================================================
// Secuencia única `visibles` de la lista de grupos (defecto 12)
// =============================================================================

// Espejo de la derivación de app/centro/[id]/grupos/page.js:241-247: TODO —
// render, visiblesKey, flechas ↑/↓, conteos — deriva de `visibles` y cada
// grupo aparece UNA sola vez.
function derivarVisibles(base, hoy) {
  const enLlenado = ordenarPorCierreLlenado(base.filter((g) => ventanaNuevos(g, hoy).abierta), hoy)
  const idsEnLlenado = new Set(enLlenado.map((g) => String(g.id)))
  const resto = base.filter((g) => !idsEnLlenado.has(String(g.id)))
  const visibles = [...enLlenado, ...resto]
  return { enLlenado, resto, visibles, visiblesKey: visibles.map((g) => g.id).join(',') }
}

// TINY activo con la semana 4 terminando en `ultima` (fecha límite derivada).
const conLimite = (id, ultima, extra = {}) => grupoTiny({
  id,
  itinerario_clases: { nivel: 1, fecha_inicio: '2026-08-17', semanas: [semana('4', 'clase', [ultima])] },
  ...extra,
})

// Orden del servidor (por número): mezcla de abiertos, exento, palanca cerrada,
// ventana vencida y grupo cerrado.
const baseServidor = () => [
  conLimite(30, '2026-09-30'),
  conLimite(10, '2026-09-10'),
  grupoTiny({ id: 50, itinerario: 'KINDER' }), // exento: en llenado, sin fecha
  conLimite(20, '2026-09-30', { inscripcion_abierta: false }), // palanca de Fernando
  conLimite(40, '2026-08-20'), // ventana vencida al 2026-09-01
  conLimite(60, '2026-09-30', { estado: 'cerrado' }),
]

test('orden visibles determinista: en-llenado por cierre asc (sin fecha al final) y resto en orden del servidor', () => {
  const { enLlenado, resto, visibles, visiblesKey } = derivarVisibles(baseServidor(), '2026-09-01')
  assert.deepEqual(enLlenado.map((g) => g.id), [10, 30, 50]) // cierra primero arriba; exento al final
  assert.deepEqual(resto.map((g) => g.id), [20, 40, 60]) // complemento, orden del servidor
  assert.equal(visiblesKey, '10,30,50,20,40,60')
  // Cada grupo UNA sola vez: el DOM y visiblesKey derivan del mismo arreglo.
  assert.equal(new Set(visibles.map((g) => String(g.id))).size, visibles.length)
})

test('la misma entrada produce SIEMPRE la misma visiblesKey y no muta el orden base', () => {
  const base = baseServidor()
  const a = derivarVisibles(base, '2026-09-01')
  const b = derivarVisibles(base, '2026-09-01')
  assert.equal(a.visiblesKey, b.visiblesKey)
  assert.deepEqual(base.map((g) => g.id), [30, 10, 50, 20, 40, 60]) // el servidor manda su orden intacto
})

test('al vencer una ventana el grupo pasa a resto sin duplicarse ni perderse', () => {
  // El 15 ya venció el límite del grupo 10 (2026-09-10): sale de en-llenado.
  const { enLlenado, resto, visibles, visiblesKey } = derivarVisibles(baseServidor(), '2026-09-15')
  assert.deepEqual(enLlenado.map((g) => g.id), [30, 50])
  assert.deepEqual(resto.map((g) => g.id), [10, 20, 40, 60])
  assert.equal(visiblesKey, '30,50,10,20,40,60')
  assert.equal(new Set(visibles.map((g) => String(g.id))).size, visibles.length)
})

// =============================================================================
// El selector del vendedor y el server tienen que decir LO MISMO (2026-08-10)
// =============================================================================

// Espejo de la proyección de listarGruposActivos (app/actions/grupos.js:939-961):
// lo ÚNICO que el navegador recibe del llenado de cada grupo. Si esa proyección
// pierde información, el cliente decide distinto que el server y el vendedor
// escoge un grupo que al guardar se rechaza.
const proyectarParaSelector = (g) => ({
  id: g.id,
  numero: g.numero ?? 1,
  itinerario: g.itinerario,
  nivel: Number(g.itinerario_clases?.nivel) || 1,
  inscripcionAbierta: g.inscripcion_abierta !== false,
  fechaLimiteNuevos: fechaLimiteNuevos(g).fechaLimite,
  razonLimiteNuevos: fechaLimiteNuevos(g).razon,
  cupos: 4,
})

// Un TINY veterano: itinerario del nivel 10 recién regenerado (semana 4 del
// libro cayendo dentro de la ventana). El manual NO lo reabre a nuevos: su
// llenado fue en el arranque del grupo.
const veteranoNivel10 = (extra = {}) => grupoTiny({
  id: 22,
  itinerario_clases: {
    nivel: 10,
    fecha_inicio: '2026-08-03',
    semanas: [semana('4', 'clase', ['2026-09-30'])],
  },
  ...extra,
})

test('selector ≡ server: la razón viaja en el payload y nadie ofrece lo que el server rechaza', () => {
  const hoy = '2026-08-10'
  const casos = [
    ['nivel 1 en ventana', conLimite(10, '2026-09-30')],
    ['nivel 1 vencido', conLimite(40, '2026-08-01')],
    ['exento (KINDER)', grupoTiny({ id: 50, itinerario: 'KINDER' })],
    ['palanca cerrada', conLimite(20, '2026-09-30', { inscripcion_abierta: false })],
    ['veterano nivel 10', veteranoNivel10()],
    ['veterano con extensión vigente', veteranoNivel10({ llenado_extendido_hasta: '2026-08-31' })],
    ['veterano con extensión vencida', veteranoNivel10({ llenado_extendido_hasta: '2026-08-01' })],
  ]
  for (const [nombre, g] of casos) {
    const server = ventanaNuevos(g, hoy).abierta
    const cliente = aceptaNuevosEnSelector(proyectarParaSelector(g), hoy)
    assert.equal(cliente, server, `${nombre}: el selector dice ${cliente} y el server ${server}`)
  }
})

test('selector: el veterano de nivel 10 no se ordena como exento — ni siquiera entra a la lista', () => {
  const hoy = '2026-08-10'
  const grupos = [conLimite(10, '2026-09-30'), veteranoNivel10(), grupoTiny({ id: 50, itinerario: 'KINDER' })]
    .map(proyectarParaSelector)
  const abiertos = ordenarPorLimiteNuevos(grupos.filter((g) => aceptaNuevosEnSelector(g, hoy)))
  assert.deepEqual(abiertos.map((g) => g.id), [10, 50]) // el 22 (nivel 10) no se ofrece
  // Y su etiqueta jamás se pinta como un exento con cupos libres.
  assert.equal(abiertos.some((g) => g.id === 22), false)
})

// =============================================================================
// La superficie tiene que nombrar TODA razón de cierre (defecto Calle 50 G22)
// =============================================================================

// La pantalla de grupos es JSX y el repo no corre React en los tests: lo que sí
// se puede verificar en frío es que ninguna razón de cierre se quede sin
// tratamiento en el archivo. El defecto real fue exactamente ese — la regla se
// arregló en lib/llenado.mjs y el panel siguió pintando "En llenado".
test('la pantalla de grupos trata cada razón por la que un grupo NO acepta nuevos', () => {
  const fuente = readFileSync(new URL('../app/centro/[id]/grupos/page.js', import.meta.url), 'utf8')
  for (const razon of ['no_activo', 'palanca_cerrada', 'vencida', 'nivel_avanzado']) {
    assert.ok(fuente.includes(`'${razon}'`), `la pantalla no contempla la razón ${razon}`)
  }
})
