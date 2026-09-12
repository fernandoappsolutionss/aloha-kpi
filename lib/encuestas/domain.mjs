export const VERSION = 'satisfaccion-v1'
export const INICIO_AUTOMATICO = 202609
export const REGLA_PARTICIPACION = '30-inclusivo'
export const PREGUNTAS = [
  { id: 'general', texto: 'En general, ¿qué tan satisfecho estás con ALOHA?' },
  { id: 'avance', texto: '¿Qué tan satisfecho estás con el avance de tu hijo?' },
  { id: 'coach', texto: '¿Qué tan satisfecho estás con la enseñanza y el acompañamiento del coach?' },
  { id: 'atencion', texto: '¿Qué tan satisfecho estás con la atención y comunicación del centro?' },
]
export const ESCALA = ['Muy insatisfecho', 'Insatisfecho', 'Ni satisfecho ni insatisfecho', 'Satisfecho', 'Muy satisfecho']

export function periodoPanama(now = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const p = Object.fromEntries(partes.map(x => [x.type, x.value]))
  return { anio: Number(p.year), mes: Number(p.month), hoy: `${p.year}-${p.month}-${p.day}` }
}
export function validarPeriodo(anio, mes) {
  if (!Number.isInteger(anio) || anio < 2020 || anio > 2100 || !Number.isInteger(mes) || mes < 1 || mes > 12) throw new Error('Periodo inválido.')
}
export function periodoAbierto(anio, mes, now = new Date()) {
  const p = periodoPanama(now)
  return Number(anio) === p.anio && Number(mes) === p.mes
}
export function normalizarNombre(v) {
  return String(v || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}
export function telefonoIdentidad(v) {
  const t = String(v || '').replace(/\D/g, '')
  return t.length >= 8 && t.length <= 15 ? t.slice(-8) : null
}
export function resumenEncuesta(campana, respuestas = []) {
  const activos = Number(campana?.activos || 0)
  const total = respuestas.length
  const regla = campana?.regla_participacion || REGLA_PARTICIPACION
  const metaTexto = regla === '50-estricto' ? 'Más del 50%' : '30% o más'
  const necesarias = activos > 0 ? (regla === '50-estricto' ? Math.floor(activos / 2) + 1 : Math.ceil(activos * 3 / 10)) : 0
  const compartida = Boolean(campana?.compartida_at)
  const satisfechos = respuestas.filter(r => Number(r.general) >= 4).length
  return { activos, regla, metaTexto, respuestas: total, necesarias, faltan: Math.max(0, necesarias - total), compartida,
    participacion: activos ? Math.round(total * 1000 / activos) / 10 : 0,
    satisfaccion: total ? Math.round(satisfechos * 1000 / total) / 10 : null,
    cumple: activos > 0 && compartida && total >= necesarias,
    promedios: Object.fromEntries(PREGUNTAS.map(p => [p.id, total ? Math.round(respuestas.reduce((s, r) => s + Number(r[p.id]), 0) * 10 / total) / 10 : null])),
  }
}
export function validarRespuesta(input) {
  if (!input || input.consentimiento !== true) throw new Error('Confirma que eres el representante del niño y que aceptas enviar tus respuestas.')
  const out = {}
  for (const { id } of PREGUNTAS) {
    if (!Number.isInteger(input[id]) || input[id] < 1 || input[id] > 5) throw new Error('Responde las cuatro preguntas con una opción del 1 al 5.')
    out[id] = input[id]
  }
  for (const key of ['mejorar', 'destacar']) {
    if (input[key] != null && typeof input[key] !== 'string') throw new Error('Comentario inválido.')
    out[key] = (input[key] || '').trim()
    if (out[key].length > 1000) throw new Error('Cada comentario admite hasta 1.000 caracteres.')
  }
  return out
}
export function textoFoda(nombreMes, resumen) {
  if (!resumen.respuestas) return `${nombreMes}: sin respuestas de satisfacción. No se puede evaluar.`
  return `${nombreMes}: satisfacción ${resumen.satisfaccion}% (valoraciones generales 4 o 5 de 5); participación ${resumen.respuestas}/${resumen.activos} niños (${resumen.participacion}%). ${resumen.cumple ? 'Meta de participación cumplida.' : `Falta${resumen.faltan===1?'':'n'} ${resumen.faltan} respuesta${resumen.faltan===1?'':'s'}${resumen.compartida ? '' : ' y registrar la copia del enlace o descarga del QR'}.`}`
}
