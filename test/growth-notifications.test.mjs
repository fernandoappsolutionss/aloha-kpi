import test from 'node:test'
import assert from 'node:assert/strict'

import {
  briefingEligibility,
  growthWeekStart,
  recommendationStatusFor,
  snoozeUntilTomorrow,
} from '../lib/growth/notifications.mjs'

test('growthWeekStart usa lunes y la fecha local de Panama', () => {
  assert.equal(growthWeekStart('2026-08-10T03:30:00.000Z'), '2026-08-03')
  assert.equal(growthWeekStart('2026-08-10T05:30:00.000Z'), '2026-08-10')
})

test('el briefing se muestra en la primera visita semanal', () => {
  assert.deepEqual(
    briefingEligibility({ receipt: null, now: '2026-08-07T14:00:00.000Z' }),
    { shouldShow: true, reason: 'first_visit' },
  )
})

test('dos cargas simultaneas pueden compartir un recibo aun no mostrado', () => {
  assert.deepEqual(
    briefingEligibility({
      receipt: { shownAt: null, acknowledgedAt: null, snoozedUntil: null },
      now: '2026-08-07T14:00:00.000Z',
    }),
    { shouldShow: true, reason: 'first_visit' },
  )
})

test('un briefing reconocido no vuelve a mostrarse esa semana', () => {
  const result = briefingEligibility({
    receipt: { acknowledgedAt: '2026-08-07T14:01:00.000Z' },
    now: '2026-08-08T14:00:00.000Z',
  })
  assert.deepEqual(result, { shouldShow: false, reason: 'acknowledged' })
})

test('un recordatorio aplazado reaparece solo despues de la fecha indicada', () => {
  const receipt = {
    shownAt: '2026-08-07T14:00:00.000Z',
    snoozedUntil: '2026-08-08T14:00:00.000Z',
  }
  assert.deepEqual(
    briefingEligibility({ receipt, now: '2026-08-08T13:59:59.000Z' }),
    { shouldShow: false, reason: 'snoozed' },
  )
  assert.deepEqual(
    briefingEligibility({ receipt, now: '2026-08-08T14:00:00.000Z' }),
    { shouldShow: true, reason: 'reminder' },
  )
})

test('sin una accion explicita el popup no se repite en cada entrada', () => {
  const result = briefingEligibility({
    receipt: { shownAt: '2026-08-07T14:00:00.000Z' },
    now: '2026-08-08T14:00:00.000Z',
  })
  assert.deepEqual(result, { shouldShow: false, reason: 'already_shown' })
})

test('snoozeUntilTomorrow suma exactamente un dia', () => {
  assert.equal(
    snoozeUntilTomorrow('2026-08-07T14:00:00.000Z'),
    '2026-08-08T14:00:00.000Z',
  )
})

test('las acciones de recomendacion solo aceptan transiciones validas', () => {
  assert.equal(recommendationStatusFor('complete'), 'completed')
  assert.equal(recommendationStatusFor('dismiss'), 'dismissed')
  assert.equal(recommendationStatusFor('postpone'), 'postponed')
  assert.throws(() => recommendationStatusFor('archive'), /Accion no valida/)
})
