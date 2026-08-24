import test from 'node:test'
import assert from 'node:assert/strict'

import { SLOTS_SEMANA, SLOT_KINDER, BLOQUE_VIERNES, JORNADAS_SABADO, RESUMEN_MODELO } from '../lib/modelo.js'
import {
  BUFFER_MIN, INICIO_VENDIBLE_SEMANA, KINDER_INICIO, KINDER_FIN, CIERRE_MIN, validarSesion, aHora12,
} from '../lib/inventario.js'
import { franjaSugerida } from '../lib/reservas.js'

// Regla de Fernando 2026-08-10: entre semana las clases corren DESDE LAS 4:00 pm,
// el espacio entre clases es el buffer de 15 min (no media hora) y la zona
// Kinder va de 2:45 a 3:45 pm. Los tres números encajan en una sola cadena:
// Kinder cierra 3:45 → +15 → primera clase 4:00.
test('la parrilla entre semana arranca a las 4:00 pm', () => {
  assert.equal(INICIO_VENDIBLE_SEMANA, 16 * 60)
  assert.equal(SLOTS_SEMANA[0].inicio, 16 * 60)
})

test('la zona Kinder va de 2:45 a 3:45 pm y cierra justo un buffer antes de la parrilla', () => {
  assert.equal(KINDER_INICIO, 14 * 60 + 45)
  assert.equal(KINDER_FIN, 15 * 60 + 45)
  assert.deepEqual(SLOT_KINDER, { inicio: 14 * 60 + 45, fin: 15 * 60 + 45 })
  assert.equal(KINDER_FIN + BUFFER_MIN, SLOTS_SEMANA[0].inicio)
})

test('entre bloques del modelo hay exactamente el buffer de 15 min, no 30', () => {
  for (let i = 1; i < SLOTS_SEMANA.length; i++) {
    assert.equal(
      SLOTS_SEMANA[i].inicio - SLOTS_SEMANA[i - 1].fin,
      BUFFER_MIN,
      `entre el bloque ${i} y el ${i + 1} debe haber ${BUFFER_MIN} min`,
    )
  }
})

test('los tres bloques duran 1 h y el último cierra antes de las 8:30 pm', () => {
  for (const s of SLOTS_SEMANA) assert.equal(s.fin - s.inicio, 60)
  assert.ok(SLOTS_SEMANA.at(-1).fin <= CIERRE_MIN)
})

test('el bloque del viernes son 2 h alineadas con el arranque de la parrilla', () => {
  assert.equal(BLOQUE_VIERNES.inicio, SLOTS_SEMANA[0].inicio)
  assert.equal(BLOQUE_VIERNES.fin - BLOQUE_VIERNES.inicio, 120)
})

test('un grupo real de 2 h de 4:00 a 6:00 pm es válido entre semana', () => {
  assert.equal(validarSesion(4, '16:00', '18:00'), null)
})

// La misma regla aplica al sábado: jornadas de 2 h separadas por el buffer de
// 15 min, no por media hora: 9–11 · 11:15–1:15 · 1:30–3:30.
test('las jornadas del sábado corren en la misma cadena de 15 min', () => {
  for (const j of JORNADAS_SABADO) assert.equal(j.fin - j.inicio, 120)
  for (let i = 1; i < JORNADAS_SABADO.length; i++) {
    assert.equal(
      JORNADAS_SABADO[i].inicio - JORNADAS_SABADO[i - 1].fin,
      BUFFER_MIN,
      `entre la jornada ${i} y la ${i + 1} debe haber ${BUFFER_MIN} min`,
    )
  }
})

test('la clase de prueba del sábado arranca un buffer después de la última jornada', () => {
  assert.equal(franjaSugerida(6).inicio, JORNADAS_SABADO.at(-1).fin + BUFFER_MIN)
})

// RESUMEN_MODELO es el texto que ve la administradora en "Dónde abrir el
// próximo grupo": si la parrilla cambia y el texto no, el dashboard miente
// (pasó con el ajuste del 2026-08-10).
test('el resumen del modelo refleja la parrilla vigente', () => {
  const corto = (min) => aHora12(min).replace(/\s*[ap]m$/, '')
  for (const s of SLOTS_SEMANA) assert.ok(RESUMEN_MODELO.includes(corto(s.inicio)), corto(s.inicio))
  assert.ok(RESUMEN_MODELO.includes(`${corto(SLOT_KINDER.inicio)}–${corto(SLOT_KINDER.fin)}`))
  assert.ok(RESUMEN_MODELO.includes(`${corto(JORNADAS_SABADO[1].inicio)}–${corto(JORNADAS_SABADO[1].fin)}`))
  assert.ok(RESUMEN_MODELO.includes(`${corto(JORNADAS_SABADO[2].inicio)}–${corto(JORNADAS_SABADO[2].fin)}`))
})
