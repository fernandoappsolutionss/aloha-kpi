import { pasosDe, nombreCondicion, claveFormula } from './condiciones/formulas.mjs'
import { lecturaCondicion, hayDiscrepancia } from './condiciones/lectura.mjs'
import { zonaHorariaCentro, sumarDias } from './semana-cierre.mjs'
import { estadoCalendarioPlan } from './reunion-semanal.mjs'

export const SECCIONES = Object.freeze(['formula', 'urgente', 'pendiente', 'orden', 'estrategico'])

const argsCondicion = (plan) => ({ condicion: plan.condicion, alcancePeligro: plan.alcance_peligro, varianteAfluencia: plan.variante_afluencia })

export function validarObjetivo(datos, { borrador = false } = {}) {
  const texto = String(datos?.texto || '').trim()
  const responsable = String(datos?.responsable || '').trim()
  const evidencia_esperada = String(datos?.evidencia_esperada || '').trim()
  if (!texto || texto.length > 500) throw new Error('Objetivo inválido.')
  if ((!borrador && !responsable) || responsable.length > 120) throw new Error('Indica un responsable de hasta 120 caracteres.')
  if ((!borrador && !evidencia_esperada) || evidencia_esperada.length > 1000) throw new Error('Indica la evidencia esperada (hasta 1000 caracteres).')
  const fecha = datos.fecha instanceof Date ? datos.fecha.toISOString().slice(0, 10) : datos.fecha
  if (!borrador || fecha) { try { sumarDias(fecha, 0) } catch { throw new Error('Fecha inválida.') } }
  return { texto, responsable: responsable || null, fecha: fecha || null, evidencia_esperada: evidencia_esperada || null }
}

export function objetivoPreparado(objetivo) {
  try { validarObjetivo(objetivo); return true } catch { return false }
}

export function ejecucionPlan(objetivos = []) {
  const propios = objetivos.filter(o => !['orden', 'estrategico'].includes(o.seccion))
  const realizadas = propios.filter(o => o.hecho && String(o.evidencia_resultado || '').trim())
  return { total: propios.length, realizadas: realizadas.length, verificadas: realizadas.filter(o => o.verificado_at).length }
}

export function origenFormula(plan, paso) {
  if (!plan?.condicion) return null
  const fecha = value => value instanceof Date ? value.toISOString() : String(value || '')
  return { grupo: `${plan.id}:${fecha(plan.asignada_at)}:${claveFormula(argsCondicion(plan))}`,
    planId: plan.id, semanaFin: fecha(plan.semana_fin).slice(0, 10), condicion: plan.condicion,
    nombre: nombreCondicion(plan.condicion), paso, textoPaso: pasosDe(argsCondicion(plan))[paso] }
}

// Se conserva la fórmula original incluso después de cambiar de semana o condición.
export function pendientesDesde(planAnterior) {
  if (!planAnterior) return []
  const objetivos = planAnterior.objetivos || []
  const nuevos = objetivos
    .filter((o) => !o.hecho && o.seccion !== 'estrategico')
    .map((o) => ({ seccion: 'pendiente', paso: null, texto: o.texto, responsable: o.responsable ?? null, fecha: o.fecha ?? null, evidencia_esperada: o.evidencia_esperada ?? null, origen_objetivo_id: o.id,
      origen_formula: o.origen_formula || (o.seccion === 'formula' ? origenFormula(planAnterior, Number(o.paso)) : null) }))
  if (planAnterior.condicion) {
    const pasos = pasosDe(argsCondicion(planAnterior))
    const nombre = nombreCondicion(planAnterior.condicion)
    pasos.forEach((texto, paso) => {
      const conObjetivo = objetivos.some((o) => o.seccion === 'formula' && Number(o.paso) === paso)
      if (!conObjetivo) nuevos.push({ seccion: 'pendiente', paso: null, texto: `Terminar el paso ${paso + 1} de ${nombre}: ${texto}`, responsable: null, fecha: null, origen_objetivo_id: null, origen_formula: origenFormula(planAnterior, paso) })
    })
  }
  return nuevos
}

export function estadoPlan({ condicion, fundamento, alcance_peligro = null, variante_afluencia = null, objetivos = [] }) {
  if (!condicion) return 'sin_condicion'
  if (!String(fundamento || '').trim()) return 'incompleto'
  return primerPasoSinObjetivo({ condicion, alcance_peligro, variante_afluencia, objetivos }) == null ? 'completo' : 'incompleto'
}

export function primerPasoSinObjetivo({ condicion, alcance_peligro = null, variante_afluencia = null, objetivos = [] }) {
  if (!condicion) return null
  const pasos = pasosDe({ condicion, alcancePeligro: alcance_peligro, varianteAfluencia: variante_afluencia })
  const index = pasos.findIndex((_, paso) => !objetivos.some((o) => o.seccion === 'formula' && Number(o.paso) === paso && objetivoPreparado(o)))
  return index < 0 ? null : index + 1
}

export function objetivosAlCambiarCondicion(objetivos = [], plan) {
  return objetivos.filter((o) => o.seccion === 'formula').map((o) => ({ id: o.id, seccion: 'urgente', paso: null,
    ...(plan ? { origen_formula: o.origen_formula || origenFormula(plan, Number(o.paso)) } : {}) }))
}

export function formulaAnteriorPendiente(objetivos) {
  return objetivos.filter(o => o.origen_formula && (!o.hecho || !String(o.evidencia_resultado || '').trim()))
    .sort((a, b) => a.origen_formula.semanaFin.localeCompare(b.origen_formula.semanaFin) || a.origen_formula.paso - b.origen_formula.paso)[0]?.origen_formula ?? null
}

export function pasoPrevioPendiente(objetivo, objetivos) {
  const realizado = o => o.hecho && String(o.evidencia_resultado || '').trim()
  if (objetivo.seccion === 'formula') {
    for (let paso = 0; paso < Number(objetivo.paso); paso++) {
      const acciones = objetivos.filter(o => o.seccion === 'formula' && Number(o.paso) === paso)
      if (!acciones.length || acciones.some(o => !realizado(o))) return paso + 1
    }
  } else if (objetivo.origen_formula) {
    const origen = objetivo.origen_formula
    const previos = objetivos.filter(o => o.origen_formula?.grupo === origen.grupo && o.origen_formula.paso < origen.paso && !realizado(o))
    if (previos.length) return Math.min(...previos.map(o => o.origen_formula.paso)) + 1
  }
  return null
}

export function enriquecerTableroConPlanes(centros, planes, objetivos, ultimaCerrada, now = new Date()) {
  const porCentro = new Map(planes.map((plan) => [Number(plan.centro_id), plan]))
  return centros.map((centro) => {
    const plan = porCentro.get(Number(centro.id))
    const propios = plan ? objetivos.filter((o) => Number(o.plan_id) === Number(plan.id)) : []
    const lectura = lecturaCondicion(centro.serie.filter((p) => p.semanaFin <= ultimaCerrada).map((p) => p.valor))
    return {
      ...centro,
      condicion: plan?.condicion ?? null,
      estadoPlan: estadoPlan({ ...plan, condicion: plan?.condicion ?? null, objetivos: propios }),
      ...estadoCalendarioPlan(ultimaCerrada, now, zonaHorariaCentro(centro)),
      discrepancia: hayDiscrepancia(plan?.condicion, lectura.condicion),
    }
  })
}
