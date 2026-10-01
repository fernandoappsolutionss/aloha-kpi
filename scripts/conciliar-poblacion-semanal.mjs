import { pathToFileURL } from 'node:url'
import { sql } from '../lib/db.js'
import { cargarEnv } from './migrate-caja.mjs'
import { cierreMesAnterior } from '../lib/cadena.js'
import { movimientosVivosMes, resumenConCuadroVivo } from '../lib/inicios-clase.mjs'
import { poblacionAlCorte } from '../lib/estadisticas-semana/calculo.mjs'
import { fechaCivil, zonaHorariaCentro } from '../lib/semana-cierre.mjs'

export async function conciliarPoblacion({ query = sql, now = new Date(), log = console.log } = {}) {
  const centros = await query`SELECT id, nombre, pais FROM centros ORDER BY id`
  const diferencias = []
  for (const centro of centros) {
    const hoy = fechaCivil(now, zonaHorariaCentro(centro))
    const [estudiantes, grupos, eventos] = await Promise.all([
      query`SELECT id, grupo_id, estado, fecha_inscripcion FROM estudiantes WHERE centro_id = ${centro.id}`,
      query`SELECT id, estado, fecha_inicio_clases, itinerario_clases FROM grupos WHERE centro_id = ${centro.id}`,
      query`SELECT id, estudiante_id, tipo, fecha, year, month, origen, motivo, a_grupo_id FROM estudiante_eventos WHERE centro_id = ${centro.id} AND tipo IN ('inscripcion','retiro','cambio_grupo','reincorporacion') ORDER BY fecha, id`,
    ])
    for (let year = 2026, month = 8; year * 100 + month <= Number(hoy.slice(0, 4)) * 100 + Number(hoy.slice(5, 7)); month++) {
      if (month === 13) { month = 1; year++ }
      const fin = `${year}-${String(month).padStart(2, '0')}-${String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, '0')}`
      if (fin > hoy) continue
      const inicioMes = (await cierreMesAnterior(centro.id, year, month, query))?.valor ?? null
      const semanal = poblacionAlCorte({ inicioMes, estudiantes, grupos, eventos, corte: fin })
      const [resumen] = await query`SELECT * FROM resumen_mes WHERE centro_id = ${centro.id} AND year = ${year} AND month = ${month}`
      const [estado] = await query`SELECT estado FROM mes_kpi WHERE centro_id = ${centro.id} AND year = ${year} AND month = ${month}`
      const cuadro = movimientosVivosMes({ estudiantes, grupos, eventos, year, month })
      const [vivo] = resumenConCuadroVivo(resumen ? [resumen] : [], { centroId: centro.id, year, month, estado: estado?.estado, cuadro, inicioArrastrado: inicioMes })
      const mensual = vivo?.ninos_final_mes == null ? null : Number(vivo.ninos_final_mes)
      const diferencia = semanal.valor == null || mensual == null ? null : semanal.valor - mensual
      log(`${centro.id}\t${centro.nombre}\t${year}-${String(month).padStart(2, '0')}\t${semanal.valor ?? 'sin dato'}\t${mensual ?? 'sin dato'}\t${diferencia ?? 'sin dato'}`)
      if (diferencia !== 0) diferencias.push({ centroId: centro.id, year, month, semanal: semanal.valor, mensual, diferencia })
    }
  }
  return diferencias
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  if (process.argv.length > 2) throw new Error('Uso: node scripts/conciliar-poblacion-semanal.mjs')
  cargarEnv()
  console.log('centro_id\tcentro\tmes\tsemana\tmensual\tdiferencia')
  const diferencias = await conciliarPoblacion()
  console.log(`Diferencias: ${diferencias.length}`)
}
