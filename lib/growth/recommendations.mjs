import { acquisitionModelStatus } from './metrics.mjs'

const numberOr = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

const round = (value, decimals = 1) => {
  const factor = 10 ** decimals
  return Math.round((numberOr(value) + Number.EPSILON) * factor) / factor
}

const rate = (value) => Math.min(1, Math.max(0, numberOr(value)))

const confidenceWeight = (confidence) => {
  if (confidence?.level === 'high') return 1
  if (confidence?.level === 'medium') return 0.7
  return 0.4
}

function candidate({ impact = 0, effort = 1, confidence = 1, priority, ...item }) {
  return {
    responsible: 'Administradora',
    dueDays: 7,
    impactType: 'estimated',
    impactUnit: 'niños/mes',
    observedImpact: null,
    ...item,
    estimatedImpact: round(impact, 1),
    effort,
    priority: round(priority ?? ((Math.max(0.1, impact) * confidence) / effort), 2),
    priorityExplanation: priority != null
      ? 'Primero se resuelven los datos y la capacidad necesarios para la ruta.'
      : `Impacto aislado estimado × confianza del dato (${confidence}) ÷ esfuerzo relativo (${effort}). No mide resultados obtenidos.`,
  }
}

const issueDescription = (issue) => {
  if (typeof issue === 'string') return issue
  if (issue?.message) return issue.message
  const messages = {
    invalid_funnel: 'Revisar el número de invitados, asistentes y matriculados: sus totales no son consistentes.',
    missing_month: 'Falta un cierre mensual en la ventana de cálculo.',
    partial_operational_population: 'La población operativa está incompleta frente al resumen mensual.',
  }
  const description = messages[issue?.code] || 'Revisar la información pendiente del cierre.'
  return issue?.period ? `${description} Periodo ${issue.period}.` : description
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
  const acquisition = acquisitionModelStatus(metrics)
  const activePerSale = rate(rates.activePerSale)
  const attendance = rate(rates.attendance)
  const enrollment = rate(rates.enrollment)
  const inviteToEnrollment = rate(rates.inviteToEnrollment)
  const window = metrics?.window || {}
  const baseWindow = {
    ...window,
    months: window.months ?? metrics?.monthsUsed ?? confidence.months ?? 0,
    startPeriod: window.startPeriod ?? null,
    endPeriod: window.endPeriod ?? null,
    periods: [...(window.periods || [])],
  }

  if (confidence.level === 'low' || (metrics?.issues || []).length || activePerSale === 0) {
    const details = [
      ...(confidence.reasons || []),
      ...(metrics?.issues || []).map(issueDescription),
      ...(activePerSale === 0 ? ['No hay conversión observada de ventas a niños activos; no se estima crecimiento por captación.'] : []),
    ]
    candidates.push(candidate({
      kind: 'data_quality',
      title: 'Completar los datos para confiar en la ruta',
      reason: [...new Set(details)].join(' ') || 'Faltan datos suficientes para calcular una fecha confiable.',
      action: 'Revisar los periodos y datos señalados, completar las fechas de inicio y volver a calcular la ruta.',
      metric: 'Confianza de la proyeccion',
      baseline: round(numberOr(confidence.score), 2),
      target: 0.9,
      unit: 'indice',
      impact: 0,
      impactType: 'enabler',
      impactUnit: 'confianza del dato',
      assumption: 'Corregir la información permite evaluar la ruta; no añade niños a la población.',
      formula: 'Sin incremento de población atribuido a corregir datos.',
      effort: 1,
      priority: 1000,
      dueDays: 2,
    }))
  }

  const capacity = projection?.capacityMax
  if (nextLevel && capacity != null && capacity < nextLevel.threshold) {
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
      impactType: 'capacity',
      impactUnit: 'plazas',
      assumption: 'La capacidad debe confirmarse operativamente. Disponer de plazas no equivale a matricular niños.',
      formula: `${nextLevel.threshold} plazas necesarias − ${capacity} plazas actuales.`,
      effort: 2,
      priority: 900,
      dueDays: 14,
    }))
  }

  const currentInvitations = numberOr(medians.invitations)
  const neededInvitations = requirements.monthlyInvitations
  if (neededInvitations != null && neededInvitations > currentInvitations * 1.05) {
    const impact = (neededInvitations - currentInvitations)
      * inviteToEnrollment
      * activePerSale
    candidates.push(candidate({
      kind: 'invitations',
      title: `Lograr ${requirements.weeklyInvitations} invitaciones por semana`,
      reason: `La mediana del centro es ${round(currentInvitations)} invitaciones al mes y el objetivo requiere ${neededInvitations}.`,
      action: 'Asignar una meta diaria de contactos y publicar cada clase con cupos concretos y seguimiento.',
      metric: 'Invitaciones a clase de prueba al mes',
      baseline: round(currentInvitations),
      target: neededInvitations,
      unit: 'invitaciones',
      impact,
      assumption: 'Supone alcanzar las invitaciones objetivo conservando las conversiones observadas. Se combina con las otras mejoras del mismo embudo; no se suman sus impactos aislados.',
      formula: `(${neededInvitations} − ${round(currentInvitations)}) invitaciones × ${round(inviteToEnrollment * 100, 2)}% matrícula × ${round(activePerSale * 100, 2)}% inicio.`,
      overlapGroup: 'acquisition',
      effort: 2,
      confidence: weight,
    }))
  }

  const attendanceTarget = rate(benchmarks.attendance ?? 0.6)
  if (attendance < attendanceTarget && currentInvitations > 0) {
    const impact = currentInvitations
      * (attendanceTarget - attendance)
      * enrollment
      * activePerSale
    candidates.push(candidate({
      kind: 'attendance',
      title: 'Confirmar cada clase de prueba',
      reason: `Asiste ${round(attendance * 100)}% de los invitados; la meta operativa propuesta es ${round(attendanceTarget * 100)}%.`,
      action: 'Confirmar 24 horas antes, reenviar ubicacion y recuperar a todo ausente el mismo dia.',
      metric: 'Asistencia a clase de prueba',
      baseline: round(attendance * 100),
      target: round(attendanceTarget * 100),
      baselineRatio: attendance,
      targetRatio: attendanceTarget,
      unit: '%',
      impact,
      assumption: 'Supone alcanzar la asistencia propuesta manteniendo las demás conversiones. El impacto se calcula de forma aislada y se combina en el embudo del plan.',
      formula: `${round(currentInvitations)} invitaciones × (${round(attendanceTarget * 100, 2)}% − ${round(attendance * 100, 2)}%) asistencia × ${round(enrollment * 100, 2)}% matrícula × ${round(activePerSale * 100, 2)}% inicio.`,
      overlapGroup: 'acquisition',
      effort: 1,
      confidence: weight,
    }))
  }

  const enrollmentTarget = rate(benchmarks.enrollment ?? 0.5)
  if (enrollment < enrollmentTarget && currentInvitations > 0) {
    const impact = currentInvitations
      * attendance
      * (enrollmentTarget - enrollment)
      * activePerSale
    candidates.push(candidate({
      kind: 'enrollment',
      title: 'Cerrar la matricula el dia de la prueba',
      reason: `Se matricula ${round(enrollment * 100)}% de quienes asisten; el objetivo configurado es ${round(enrollmentTarget * 100)}%.`,
      action: 'Presentar un grupo con fecha de inicio y cerrar el seguimiento antes de terminar el dia.',
      metric: 'Conversion de asistencia a matricula',
      baseline: round(enrollment * 100),
      target: round(enrollmentTarget * 100),
      baselineRatio: enrollment,
      targetRatio: enrollmentTarget,
      unit: '%',
      impact,
      assumption: 'Supone alcanzar la conversión objetivo con las invitaciones y la asistencia observadas. Completar el seguimiento no demuestra que se haya alcanzado esa conversión.',
      formula: `${round(currentInvitations)} invitaciones × ${round(attendance * 100, 2)}% asistencia × (${round(enrollmentTarget * 100, 2)}% − ${round(enrollment * 100, 2)}%) matrícula × ${round(activePerSale * 100, 2)}% inicio.`,
      overlapGroup: 'acquisition',
      effort: 1,
      confidence: weight,
    }))
  }

  const causes = metrics?.causeMedians || {}
  const [topCause] = Object.entries(causes).filter(([kind]) => attritionActions[kind]).sort((a, b) => numberOr(b[1]) - numberOr(a[1]))
  if (topCause && numberOr(topCause[1]) > 0 && attritionActions[topCause[0]]) {
    const baseline = numberOr(topCause[1])
    const action = attritionActions[topCause[0]]
    candidates.push(candidate({
      ...action,
      reason: `${round(baseline)} retiros mensuales provienen de una causa que el centro puede intervenir.`,
      baseline: round(baseline),
      target: round(baseline * 0.75, 2),
      unit: 'retiros/mes',
      impact: baseline * 0.25,
      assumption: 'Hipótesis operativa: reducir un 25% esta causa de retiro. No incluye graduaciones ni acredita una reducción ya conseguida.',
      formula: `${round(baseline)} retiros/mes − ${round(baseline * 0.75, 2)} retiros/mes propuestos.`,
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
      impact: Math.max(0, 2 - numberOr(origins.activations)) * activePerSale,
      assumption: 'Meta propuesta de 2 ingresos por activaciones, con la conversión observada a niños activos. Puede solaparse con la clase de prueba: no sumar ambos impactos; el plan toma el mayor incremento.',
      formula: `(2 − ${round(numberOr(origins.activations))}) ingresos/mes × ${round(activePerSale * 100, 2)}% inicio.`,
      overlapGroup: 'acquisition',
      effort: 2,
      confidence: weight,
      dueDays: 14,
    }))
  }

  return candidates
    .map((item) => {
      const common = { ...item, baseWindow, impactStatus: 'conditional' }
      if (item.overlapGroup !== 'acquisition') return common
      if (acquisition.blocked) return {
        ...common,
        estimatedImpact: null,
        impactStatus: 'blocked',
        priority: 0,
        priorityExplanation: 'El impacto está por validar; no se incorpora crecimiento por captación al escenario.',
        assumption: `Por validar: ${acquisition.reasons.join(' ')} No se aplica un aumento al escenario hasta conciliar estos datos. ${item.assumption}`,
      }
      if (acquisition.provisional) return {
        ...common,
        impactStatus: 'provisional',
        assumption: `Hipótesis provisional: ${acquisition.reasons.join(' ')} ${item.assumption}`,
      }
      return common
    })
    .sort((a, b) => b.priority - a.priority || a.kind.localeCompare(b.kind))
    .slice(0, 3)
}
