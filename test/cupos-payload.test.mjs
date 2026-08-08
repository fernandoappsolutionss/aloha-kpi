import test from 'node:test'
import assert from 'node:assert/strict'

import { armarAlohaGroupPayload, nivelDe } from '../lib/cupos-payload.mjs'

// --- Fixtures ----------------------------------------------------------------
// "Viejo" = grupo como existía antes del diseño 2026-08-08: sin itinerario
// cargado (legacy) — el contrato debe comportarse IGUAL que siempre.
// "Nuevo" = grupo con itinerario vigente (misma forma que genera
// lib/itinerario.js) — el contrato suma las claves aditivas y la fórmula g2-5.

const semana = (corto, tipo, fechas) => ({ etiqueta: String(corto), tipo, corto, fechas })

const itinerarioTiny = () => ({
  nivel: 1,
  fecha_inicio: '2026-08-17',
  semanas: [
    semana('I1', 'induccion', ['2026-08-17', '2026-08-19']),
    semana('I2', 'induccion', ['2026-08-24', '2026-08-26']),
    semana('1', 'clase', ['2026-08-31', '2026-09-02']),
    semana('2', 'clase', ['2026-09-07', '2026-09-09']),
    semana('3', 'clase', ['2026-09-14', '2026-09-16']),
    semana('4', 'clase', ['2026-09-21', '2026-09-23']), // límite TINY = 2026-09-23
  ],
})

const grupoViejo = (extra = {}) => ({
  id: 3,
  numero: 3,
  estado: 'activo',
  itinerario: 'TINY',
  inscripcion_abierta: true,
  itinerario_clases: null,
  llenado_extendido_hasta: null,
  centro: 'ALOHA Panamá',
  ninos: 6,
  ...extra,
})

const grupoNuevo = (extra = {}) => grupoViejo({ id: 7, numero: 7, itinerario_clases: itinerarioTiny(), ...extra })

// Opciones que en producción resuelve lib/cupos-sync.js con BD/reloj.
const opciones = (extra = {}) => ({
  horario: 'Lun y Mié 3:30–4:30 pm',
  cuposTotal: 10,
  metaApertura: 8,
  gpnMin: 8,
  hoyIso: '2026-09-01',
  ahoraIso: '2026-09-01T12:00:00.000Z',
  ...extra,
})

// --- Contrato: claves y tipos ------------------------------------------------

test('contrato: las 6 claves originales conservan nombre y tipo (fixture viejo)', () => {
  const p = armarAlohaGroupPayload(grupoViejo(), opciones())
  assert.equal(p.numero, '3') // numero SIEMPRE string, aunque la BD dé int
  assert.equal(p.centro, 'ALOHA Panamá')
  assert.equal(p.horario, 'Lun y Mié 3:30–4:30 pm')
  assert.equal(p.cupos_total, 10)
  assert.equal(p.cupos_disponibles, 4) // 10 − 6, igual que siempre
  assert.equal(p.actualizado_at, '2026-09-01T12:00:00.000Z')
})

test('contrato: el payload trae exactamente las 6 claves viejas + las 4 aditivas', () => {
  const claves = Object.keys(armarAlohaGroupPayload(grupoNuevo(), opciones())).sort()
  assert.deepEqual(claves, [
    'actualizado_at', 'centro', 'cupos_disponibles', 'cupos_total',
    'dias_para_iniciar', 'faltan_para_meta', 'fecha_limite_nuevos',
    'horario', 'numero', 'ritmo_semanal_necesario',
  ])
})

test('fixture viejo (sin itinerario): claves aditivas null-safe, cupos como antes', () => {
  const p = armarAlohaGroupPayload(grupoViejo(), opciones())
  assert.equal(p.fecha_limite_nuevos, null) // exento: no hay límite que anunciar
  assert.equal(p.dias_para_iniciar, null)
  assert.equal(p.faltan_para_meta, 2) // 8 − 6: la meta sí es calculable
  assert.equal(p.ritmo_semanal_necesario, null) // sin límite no hay ritmo exigible
})

// --- Fórmula de cupos (corrección g2-5) --------------------------------------

test('palanca manual cerrada = 0 cupos (regla de siempre, intacta)', () => {
  const viejo = armarAlohaGroupPayload(grupoViejo({ inscripcion_abierta: false }), opciones())
  const nuevo = armarAlohaGroupPayload(grupoNuevo({ inscripcion_abierta: false }), opciones())
  assert.equal(viejo.cupos_disponibles, 0)
  assert.equal(nuevo.cupos_disponibles, 0)
})

test('FÓRMULA NUEVA: ventana de nuevos vencida = 0 cupos aunque la palanca esté abierta', () => {
  const p = armarAlohaGroupPayload(grupoNuevo(), opciones({ hoyIso: '2026-09-24' })) // límite fue el 23
  assert.equal(p.cupos_disponibles, 0)
  assert.equal(p.fecha_limite_nuevos, '2026-09-23') // el vendedor ve POR QUÉ no hay cupo
  assert.equal(p.ritmo_semanal_necesario, null) // vencida: ya no hay ritmo que pedir
})

test('ventana vigente: cupos normales y fecha límite anunciada', () => {
  const p = armarAlohaGroupPayload(grupoNuevo(), opciones({ hoyIso: '2026-09-23' })) // último día cuenta
  assert.equal(p.cupos_disponibles, 4)
  assert.equal(p.fecha_limite_nuevos, '2026-09-23')
})

test('grupo no activo = 0 cupos para ventas (nunca vender un grupo cerrado)', () => {
  const p = armarAlohaGroupPayload(grupoNuevo({ estado: 'cerrado' }), opciones())
  assert.equal(p.cupos_disponibles, 0)
})

test('llenado_extendido_hasta posterior al límite reabre los cupos (override con rastro)', () => {
  const g = grupoNuevo({ llenado_extendido_hasta: '2026-09-30' })
  const p = armarAlohaGroupPayload(g, opciones({ hoyIso: '2026-09-24' }))
  assert.equal(p.cupos_disponibles, 4)
  assert.equal(p.fecha_limite_nuevos, '2026-09-30') // el límite anunciado es el extendido
})

test('la matrícula nunca deja cupos negativos', () => {
  const p = armarAlohaGroupPayload(grupoNuevo({ ninos: 12 }), opciones())
  assert.equal(p.cupos_disponibles, 0)
})

// --- Meta vigente y ritmo (notas del vendedor) -------------------------------

test('nivel sin iniciar: rige la apertura mínima y se anuncian los días para iniciar', () => {
  // hoy 10-ago, el nivel inicia el 17-ago: metaApertura 10 manda sobre gpnMin 8.
  const p = armarAlohaGroupPayload(grupoNuevo(), opciones({ hoyIso: '2026-08-10', metaApertura: 10 }))
  assert.equal(p.dias_para_iniciar, 7)
  assert.equal(p.faltan_para_meta, 4) // 10 − 6
})

test('nivel ya iniciado: rige gpn_min y dias_para_iniciar es null', () => {
  const p = armarAlohaGroupPayload(grupoNuevo(), opciones({ metaApertura: 10, gpnMin: 8 }))
  assert.equal(p.dias_para_iniciar, null)
  assert.equal(p.faltan_para_meta, 2) // 8 − 6
})

test('ritmo semanal necesario: faltan contra las semanas de ventana que quedan', () => {
  // hoy 1-sep, límite 23-sep → 22 días (3.14 semanas); faltan 2 → 0.6/semana.
  const p = armarAlohaGroupPayload(grupoNuevo(), opciones())
  assert.equal(p.ritmo_semanal_necesario, 0.6)
})

test('meta cumplida: faltan 0 y ritmo 0 (no se pide nada)', () => {
  const p = armarAlohaGroupPayload(grupoNuevo({ ninos: 9 }), opciones())
  assert.equal(p.faltan_para_meta, 0)
  assert.equal(p.ritmo_semanal_necesario, 0)
})

test('KINDER exento: sin fecha límite, cupos abiertos y sin ritmo exigible', () => {
  const g = grupoNuevo({ itinerario: 'KINDER', itinerario_clases: { nivel: 1, fecha_inicio: '2026-08-17', semanas: [] } })
  const p = armarAlohaGroupPayload(g, opciones())
  assert.equal(p.cupos_disponibles, 4)
  assert.equal(p.fecha_limite_nuevos, null)
  assert.equal(p.ritmo_semanal_necesario, null)
})

test('itinerario legacy sin tipo/corto: falla ABIERTO y sin límite anunciado', () => {
  // Preflight del diseño: NUNCA cerrar a ciegas con datos viejos.
  const g = grupoNuevo({ itinerario_clases: { nivel: 1, semanas: [{ etiqueta: 'Semana 4', fechas: ['2026-09-23'] }] } })
  const p = armarAlohaGroupPayload(g, opciones({ hoyIso: '2026-12-01' }))
  assert.equal(p.cupos_disponibles, 4)
  assert.equal(p.fecha_limite_nuevos, null)
})

test('itinerario_clases como string JSONB también arma el payload completo', () => {
  const g = grupoNuevo({ itinerario_clases: JSON.stringify(itinerarioTiny()) })
  const p = armarAlohaGroupPayload(g, opciones())
  assert.equal(p.fecha_limite_nuevos, '2026-09-23')
  assert.equal(nivelDe(g), 1)
})

// --- nivelDe (insumo de aperturaMinima en lib/cupos-sync.js) -----------------

test('nivelDe: nivel del itinerario vigente o null si no hay', () => {
  assert.equal(nivelDe(grupoNuevo()), 1)
  assert.equal(nivelDe(grupoViejo()), null)
  assert.equal(nivelDe({ itinerario_clases: 'esto no es json' }), null)
})
