import test from 'node:test'
import assert from 'node:assert/strict'
import * as notifications from '../lib/growth/notifications.mjs'

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

test('la proxima accion excluye completadas, descartadas y pospuestas', () => {
  const pending = { id: 4, kind: 'schedule', status: 'pending' }
  const recommendations = [
    { id: 1, status: 'completed' }, { id: 2, status: 'dismissed' },
    { id: 3, status: 'postponed' }, pending,
  ]
  assert.deepEqual(notifications.nextPendingRecommendation?.(recommendations), pending)
  assert.equal(notifications.nextPendingRecommendation?.(recommendations.slice(0, 3)), null)
})

test('completar la tarea conserva la hipotesis pero nunca acredita impacto observado', () => {
  const recommendations = [
    { kind: 'invitations', target: 40 },
    { kind: 'enrollment', status: 'pending', target: 50 },
    { kind: 'schedule', status: 'completed', target: 2 },
    { kind: 'activations', status: 'dismissed', target: 2 },
    { kind: 'attendance', status: 'postponed', target: 60 },
    { kind: 'technique', status: 'expired', target: 0 },
    { kind: 'class_loss', status: 'superseded', target: 0 },
  ]
  assert.deepEqual(notifications.planInterventions?.(recommendations), recommendations.slice(0, 3))
  assert.deepEqual(notifications.planInterventions?.([]), [])
  assert.equal(notifications.nextPendingRecommendation?.([recommendations[0]]), recommendations[0])
})

test('una tarea nueva vence desde su fecha real de alta, no desde el lunes', () => {
  assert.equal(notifications.dueDateForRecommendation?.({ createdOn: '2026-09-03', dueDays: 2 }), '2026-09-05')
  assert.equal(notifications.dueDateForRecommendation?.({ createdOn: '2026-12-30', dueDays: 7 }), '2027-01-06')
})

test('recalcular una recomendacion conserva su vencimiento incluso si ya paso', () => {
  assert.equal(notifications.dueDateForRecommendation?.({ createdOn: '2026-09-03', dueDays: 7, existingDueDate: '2026-09-01' }), '2026-09-01')
  assert.equal(notifications.dueDateForRecommendation?.({ createdOn: '2026-09-03', dueDays: 7, existingDueDate: new Date('2026-09-12T00:00:00Z') }), '2026-09-12')
})
