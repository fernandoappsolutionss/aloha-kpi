const numberOr = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const round = (value, decimals = 1) => {
  const factor = 10 ** decimals
  return Math.round((numberOr(value) + Number.EPSILON) * factor) / factor
}

const confidenceWeight = (confidence) => {
  if (confidence?.level === 'high') return 1
  if (confidence?.level === 'medium') return 0.7
  return 0.4
}

function candidate({ impact = 0, effort = 1, confidence = 1, priority, ...item }) {
  return {
    responsible: 'Administradora',
    dueDays: 7,
    ...item,
    estimatedImpact: round(impact, 1),
    effort,
    priority: round(priority ?? ((Math.max(0.1, impact) * confidence) / effort), 2),
  }
}

const attritionActions = {
  classLoss: {
    kind: 'class_loss',
    title: 'Recuperar ausencias antes del retiro',
    metric: 'Retiros por perdida de clases al mes',
    action: 'Revisar ausencias cada semana y contactar a la familia antes de la segunda clase perdida.',
  },
  technique: {
    kind: 'technique',
    title: 'Corregir retiros por tecnica',
    metric: 'Retiros por tecnica al mes',
    action: 'Observar la clase, acordar una correccion con el docente y dar seguimiento a la familia.',
  },
  schedule: {
    kind: 'schedule',
    title: 'Reubicar antes de aceptar el retiro',
    metric: 'Retiros por horario al mes',
    action: 'Ofrecer un grupo compatible y registrar el traslado antes de procesar la baja.',
  },
}

export function buildGrowthRecommendations({ metrics, projection, benchmarks = {} }) {
  const candidates = []
  const confidence = metrics?.confidence || { level: 'low', score: 0 }
  const weight = confidenceWeight(confidence)
  const medians = metrics?.medians || {}
  const rates = metrics?.rates || {}
  const requirements = projection?.requirements || {}
  const nextLevel = projection?.nextLevel

  if (confidence.level === 'low' || (metrics?.issues || []).length) {
    const details = [
      ...(confidence.reasons || []),
      ...(metrics?.issues || []).map(() => 'Hay datos inconsistentes en el embudo.'),
    ]
    candidates.push(candidate({
      kind: 'data_quality',
      title: 'Completar los datos para confiar en la ruta',
      reason: details.join(' ') || 'Faltan datos suficientes para calcular una fecha confiable.',
      action: 'Completar fechas de inicio y revisar invitados, asistentes y matriculados antes del proximo cierre.',
      metric: 'Confianza de la proyeccion',
      baseline: round(numberOr(confidence.score), 2),
      target: 0.9,
      unit: 'indice',
      impact: 0,
      effort: 1,
      priority: 1000,
      dueDays: 2,
    }))
  }

  const capacity = projection?.capacityMax
  const capacityLimited = projection?.scenarios?.action?.series?.some((row) => row.capacityLimited)
  if (nextLevel && capacity != null && (capacity < nextLevel.threshold || capacityLimited)) {
    candidates.push(candidate({
      kind: 'capacity',
      title: 'Preparar capacidad para el proximo nivel',
      reason: `La capacidad configurada es ${capacity} y el Nivel ${nextLevel.level} exige ${nextLevel.threshold} ninos.`,
      action: 'Revisar ocupacion, fusiones y aperturas con fecha antes de acelerar nuevas ventas.',
      metric: 'Capacidad maxima estimada',
      baseline: capacity,
      target: nextLevel.threshold,
      unit: 'ninos',
      impact: Math.max(0, nextLevel.threshold - capacity),
      effort: 2,
      priority: 900,
      dueDays: 14,
    }))
  }

  const currentInvitations = numberOr(medians.invitations)
  const neededInvitations = requirements.monthlyInvitations
  if (neededInvitations != null && neededInvitations > currentInvitations * 1.05) {
    const impact = (neededInvitations - currentInvitations)
      * numberOr(rates.inviteToEnrollment)
      * numberOr(rates.activePerSale)
    candidates.push(candidate({
      kind: 'invitations',
      title: `Lograr ${requirements.weeklyInvitations} invitaciones por semana`,
      reason: `El centro promedia ${round(currentInvitations)} invitaciones al mes y la ruta requiere ${neededInvitations}.`,
      action: 'Asignar una meta diaria de contactos y publicar cada clase con cupos concretos y seguimiento.',
      metric: 'Invitaciones a clase de prueba al mes',
      baseline: round(currentInvitations),
      target: neededInvitations,
      unit: 'invitaciones',
      impact,
      effort: 2,
      confidence: weight,
    }))
  }

  const attendanceTarget = numberOr(benchmarks.attendance, 0.6)
  if (numberOr(rates.attendance) < attendanceTarget && currentInvitations > 0) {
    const impact = currentInvitations
      * (attendanceTarget - numberOr(rates.attendance))
      * numberOr(rates.enrollment)
      * numberOr(rates.activePerSale)
    candidates.push(candidate({
      kind: 'attendance',
      title: 'Confirmar cada clase de prueba',
      reason: `Asiste ${round(numberOr(rates.attendance) * 100)}% de los invitados; la meta operativa es ${round(attendanceTarget * 100)}%.`,
      action: 'Confirmar 24 horas antes, reenviar ubicacion y recuperar a todo ausente el mismo dia.',
      metric: 'Asistencia a clase de prueba',
      baseline: round(numberOr(rates.attendance) * 100),
      target: round(attendanceTarget * 100),
      unit: '%',
      impact,
      effort: 1,
      confidence: weight,
    }))
  }

  const enrollmentTarget = numberOr(benchmarks.enrollment, 0.5)
  if (numberOr(rates.enrollment) < enrollmentTarget && currentInvitations > 0) {
    const impact = currentInvitations
      * numberOr(rates.attendance)
      * (enrollmentTarget - numberOr(rates.enrollment))
      * numberOr(rates.activePerSale)
    candidates.push(candidate({
      kind: 'enrollment',
      title: 'Cerrar la matricula el dia de la prueba',
      reason: `Se matricula ${round(numberOr(rates.enrollment) * 100)}% de quienes asisten; la referencia es ${round(enrollmentTarget * 100)}%.`,
      action: 'Presentar un grupo con fecha de inicio y cerrar el seguimiento antes de terminar el dia.',
      metric: 'Conversion de asistencia a matricula',
      baseline: round(numberOr(rates.enrollment) * 100),
      target: round(enrollmentTarget * 100),
      unit: '%',
      impact,
      effort: 1,
      confidence: weight,
    }))
  }

  const causes = metrics?.causeMedians || {}
  const [topCause] = Object.entries(causes).sort((a, b) => numberOr(b[1]) - numberOr(a[1]))
  if (topCause && numberOr(topCause[1]) > 0 && attritionActions[topCause[0]]) {
    const baseline = numberOr(topCause[1])
    const action = attritionActions[topCause[0]]
    candidates.push(candidate({
      ...action,
      reason: `${round(baseline)} retiros mensuales provienen de una causa que el centro puede intervenir.`,
      baseline: round(baseline),
      target: round(baseline * 0.75),
      unit: 'retiros/mes',
      impact: baseline * 0.25,
      effort: 1,
      confidence: weight,
    }))
  }

  const origins = metrics?.originMedians || {}
  if (numberOr(origins.activations) < 2) {
    candidates.push(candidate({
      kind: 'activations',
      title: 'Programar una activacion local',
      reason: `El centro genera ${round(numberOr(origins.activations))} ingresos mensuales por activaciones.`,
      action: 'Acordar una demostracion o alianza local con fecha, responsable y QR de registro.',
      metric: 'Ingresos por activaciones al mes',
      baseline: round(numberOr(origins.activations)),
      target: 2,
      unit: 'ingresos/mes',
      impact: Math.max(0.5, 2 - numberOr(origins.activations)),
      effort: 2,
      confidence: weight,
      dueDays: 14,
    }))
  }

  return candidates
    .sort((a, b) => b.priority - a.priority || a.kind.localeCompare(b.kind))
    .slice(0, 3)
}
