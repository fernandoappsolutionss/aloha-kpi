import { pasosDe, nombreCondicion } from './condiciones/formulas.mjs'
import { lecturaCondicion, hayDiscrepancia } from './condiciones/lectura.mjs'
import { plazoCondicionVencido, zonaHorariaCentro, sumarDias } from './semana-cierre.mjs'

export const SECCIONES = Object.freeze(['formula', 'urgente', 'pendiente', 'orden', 'estrategico'])

const argsCondicion = (plan) => ({ condicion: plan.condicion, alcancePeligro: plan.alcance_peligro, varianteAfluencia: plan.variante_afluencia })

export function validarObjetivo(datos) {
  const texto = String(datos?.texto || '').trim()
  const responsable = String(datos?.responsable || '').trim()
  const evidencia_esperada = String(datos?.evidencia_esperada || '').trim()
  if (!texto || texto.length > 500) throw new Error('Objetivo inválido.')
  if (!responsable || responsable.length > 120) throw new Error('Indica un responsable de hasta 120 caracteres.')
  if (!evidencia_esperada || evidencia_esperada.length > 1000) throw new Error('Indica la evidencia esperada (hasta 1000 caracteres).')
  const fecha = datos.fecha instanceof Date ? datos.fecha.toISOString().slice(0, 10) : datos.fecha
  try { sumarDias(fecha, 0) } catch { throw new Error('Fecha inválida.') }
  return { texto, responsable, fecha, evidencia_esperada }
}

export function objetivoPreparado(objetivo) {
  try { validarObjetivo(objetivo); return true } catch { return false }
}

export function ejecucionPlan(objetivos = []) {
  const propios = objetivos.filter(o => !['orden', 'estrategico'].includes(o.seccion))
  const realizadas = propios.filter(o => o.hecho && String(o.evidencia_resultado || '').trim())
  return { total: propios.length, realizadas: realizadas.length, verificadas: realizadas.filter(o => o.verificado_at).length }
}

// Lo que pasa del plan J−7 al plan J. Se ejecuta UNA vez por plan
// (semana_planes.pendientes_copiados_at lo garantiza en el servidor).
export function pendientesDesde(planAnterior) {
  if (!planAnterior) return []
  const objetivos = planAnterior.objetivos || []
  const nuevos = objetivos
    .filter((o) => !o.hecho && o.seccion !== 'estrategico')
    .map((o) => ({ seccion: 'pendiente', paso: null, texto: o.texto, responsable: o.responsable ?? null, fecha: o.fecha ?? null, evidencia_esperada: o.evidencia_esperada ?? null, origen_objetivo_id: o.id }))
  if (planAnterior.condicion) {
    const pasos = pasosDe(argsCondicion(planAnterior))
    const nombre = nombreCondicion(planAnterior.condicion)
    pasos.forEach((texto, paso) => {
      const conAlgoHecho = objetivos.some((o) => o.seccion === 'formula' && Number(o.paso) === paso && o.hecho)
      if (!conAlgoHecho) nuevos.push({ seccion: 'pendiente', paso: null, texto: `Terminar el paso ${paso + 1} de ${nombre}: ${texto}`, responsable: null, fecha: null, origen_objetivo_id: null })
    })
  }
  return nuevos
}

export function estadoPlan({ condicion, alcance_peligro = null, variante_afluencia = null, objetivos = [] }) {
  if (!condicion) return 'sin_condicion'
  return primerPasoSinObjetivo({ condicion, alcance_peligro, variante_afluencia, objetivos }) == null ? 'completo' : 'incompleto'
}

export function primerPasoSinObjetivo({ condicion, alcance_peligro = null, variante_afluencia = null, objetivos = [] }) {
  if (!condicion) return null
  const pasos = pasosDe({ condicion, alcancePeligro: alcance_peligro, varianteAfluencia: variante_afluencia })
  const index = pasos.findIndex((_, paso) => !objetivos.some((o) => o.seccion === 'formula' && Number(o.paso) === paso && objetivoPreparado(o)))
  return index < 0 ? null : index + 1
}

export function objetivosAlCambiarCondicion(objetivos = []) {
  return objetivos.filter((o) => o.seccion === 'formula').map((o) => ({ id: o.id, seccion: 'urgente', paso: null }))
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
      plazoVencido: plazoCondicionVencido(ultimaCerrada, now, zonaHorariaCentro(centro)),
      discrepancia: hayDiscrepancia(plan?.condicion, lectura.condicion),
    }
  })
}
