import { sql } from './db.js'
import { rangoSemana, semanaAbierta, sumarDias, zonaHorariaCentro } from './semana-cierre.mjs'
import { ESTADISTICAS_CENTRO } from './estadisticas-semana/catalogo.mjs'
import { pasosDe } from './condiciones/formulas.mjs'
import { ejecucionPlan } from './plan-semana.mjs'
import { cuotaCumplida } from './cuotas-semana.mjs'

// Los informes históricos leen las filas guardadas; abrirlos no arrastra tareas.
export async function leerInformeSemana(centroId, semanaFin, { query = sql, now = new Date() } = {}) {
  const rango = rangoSemana(semanaFin)
  const [centro] = await query`SELECT id, nombre, pais FROM centros WHERE id=${centroId}`
  if (!centro) throw new Error('Centro desconocido.')
  if (semanaFin >= semanaAbierta(now, zonaHorariaCentro(centro))) throw new Error('Selecciona una semana anterior para consultar su cierre.')
  const referencia = sumarDias(semanaFin, -7)
  const [estadisticas, cuotas, planes] = await Promise.all([
    query`SELECT codigo, valor, estado, detalle, calculado_at FROM estadisticas_semana WHERE centro_id=${centroId} AND semana_fin=${semanaFin}`,
    query`SELECT codigo, cuota, estado FROM semana_cuotas WHERE centro_id=${centroId} AND semana_fin=${semanaFin}`,
    query`SELECT id, condicion, alcance_peligro, variante_afluencia, fundamento FROM semana_planes WHERE centro_id=${centroId} AND semana_fin=${referencia}`,
  ])
  const plan = planes[0] || {}
  const objetivos = plan.id ? await query`SELECT seccion, paso, texto, responsable, fecha, hecho, evidencia_esperada, evidencia_resultado, verificado_at, origen_formula FROM semana_objetivos WHERE plan_id=${plan.id} ORDER BY orden, id` : []
  return { centro, semanaFin, rango, referencia, cerrado: true, consultado: now.toISOString(), plan, objetivos,
    pasos: plan.condicion ? pasosDe({ condicion: plan.condicion, alcancePeligro: plan.alcance_peligro, varianteAfluencia: plan.variante_afluencia }) : [],
    ejecucion: ejecucionPlan(objetivos),
    estadisticas: ESTADISTICAS_CENTRO.map(meta => {
      const fila = estadisticas.find(f => f.codigo === meta.codigo && f.estado === 'cerrada')
      const c = cuotas.find(f => f.codigo === meta.codigo)
      const valor = fila?.valor == null ? null : Number(fila.valor)
      const cuota = c?.cuota == null ? null : Number(c.cuota)
      return { ...meta, valor, cuota, estadoCuota: c?.estado, cumple: c?.estado === 'aprobada' ? cuotaCumplida({ valor, cuota, inversa: meta.inversa }) : null }
    }) }
}
