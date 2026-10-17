import { sql } from '../db.js'
import { rangoSemana } from '../semana-cierre.mjs'
import { cobranzaAlCorte } from './calculo.mjs'

const iso = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)

// La sincronización puede terminar después de la foto matinal. La semana
// abierta lee el libro diario al abrir el panel; no espera otro cron ni
// modifica fotos cerradas, población, planes o clases de prueba.
export async function superponerCobranzaTablero(centros, periodos, guardadas, { query = sql, now = new Date() } = {}) {
  if (!centros.length) return guardadas
  const ids = centros.map(c => Number(c.id))
  const inicios = centros.map(c => rangoSemana(periodos[c.id].semanaAbierta).desde).sort()
  const fines = centros.map(c => periodos[c.id].semanaAbierta).sort()
  const desde = inicios[0], hasta = fines.at(-1)
  const lo = Number(desde.slice(0, 7).replace('-', '')), hi = Number(hasta.slice(0, 7).replace('-', ''))
  let diaria = [], semanas = [], error = null
  try {
    ;[diaria, semanas] = await Promise.all([
      query`SELECT centro_id, fecha, vencidas, registrado_at FROM cobranza_diaria
        WHERE centro_id = ANY(${ids}::int[]) AND fecha BETWEEN ${desde} AND ${hasta}`,
      query`SELECT * FROM kpi_semanas WHERE centro_id = ANY(${ids}::int[]) AND (year * 100 + month) BETWEEN ${lo} AND ${hi}`,
    ])
  } catch { error = 'No se pudo leer el último conteo de cobranza.' }
  const filas = guardadas.filter(f => !(f.codigo === 'facturas_vencidas'
    && periodos[f.centro_id]?.semanaAbierta === iso(f.semana_fin)))
  for (const centro of centros) {
    const periodo = periodos[centro.id]
    const dato = error ? { valor: null, detalle: { error } } : cobranzaAlCorte({
      diaria: diaria.filter(f => Number(f.centro_id) === Number(centro.id)),
      filasKpi: semanas.filter(f => Number(f.centro_id) === Number(centro.id)),
      desde: rangoSemana(periodo.semanaAbierta).desde, hasta: periodo.semanaAbierta, hoy: periodo.hoy,
    })
    filas.push({ centro_id: centro.id, semana_fin: periodo.semanaAbierta, codigo: 'facturas_vencidas',
      estado: 'abierta', valor: dato.valor, detalle: dato.detalle, calculado_at: now.toISOString() })
  }
  return filas
}
