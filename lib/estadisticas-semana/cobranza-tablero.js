import { sql } from '../db.js'
import { rangoSemana } from '../semana-cierre.mjs'
import { cobranzaAlCorte } from './calculo.mjs'
import { facturasConciliadasCentro, sumarSaldosVencidos } from '../cobranza-saldos.mjs'

const iso = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
const instante = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toISOString() : null

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
  const actuales = []
  for (const centro of centros) {
    const periodo = periodos[centro.id]
    const dato = error ? { valor: null, detalle: { error } } : cobranzaAlCorte({
      diaria: diaria.filter(f => Number(f.centro_id) === Number(centro.id)),
      filasKpi: semanas.filter(f => Number(f.centro_id) === Number(centro.id)),
      desde: rangoSemana(periodo.semanaAbierta).desde, hasta: periodo.semanaAbierta, hoy: periodo.hoy,
    })
    const fila = { centro_id: centro.id, semana_fin: periodo.semanaAbierta, codigo: 'facturas_vencidas',
      estado: 'abierta', valor: dato.valor, detalle: { ...dato.detalle, saldos: null }, calculado_at: now.toISOString() }
    filas.push(fila)
    actuales.push(fila)
  }
  // Una consulta por panel, solo para los instantes de los conteos visibles.
  // El cliente recibe los totales; los nombres y facturas quedan en el servidor.
  const confirmadas = actuales.filter(f => f.valor != null && f.detalle.fuente === 'cobranza_diaria' && instante(f.detalle.registradoAt))
  const instantes = [...new Set(confirmadas.map(f => instante(f.detalle.registradoAt)))]
  if (instantes.length) try {
    const informes = await query`SELECT fecha, terminado_at, informe FROM cobranza_conciliaciones
      WHERE guardado = true AND terminado_at = ANY(${instantes}::timestamptz[]) ORDER BY id DESC`
    for (const fila of confirmadas) {
      const informe = informes.find(r => iso(r.fecha) === fila.detalle.fecha
        && instante(r.terminado_at) === instante(fila.detalle.registradoAt))?.informe
      fila.detalle.saldos = sumarSaldosVencidos(facturasConciliadasCentro(informe, fila.centro_id, fila.valor))
    }
  } catch { /* Conserva el conteo; un saldo no disponible nunca se presenta como cero. */ }
  return filas
}
