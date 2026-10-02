// Capa de servidor: carga una vez las fuentes y guarda fotos independientes.
import { sql, withTransaction } from '../db.js'
import { cierreMesAnterior } from '../cadena.js'
import { cargarClasesCrm } from '../kpi-auto-server.js'
import { fechaCivil, mesesDeSemana, rangoSemana, semanaAbierta, zonaHorariaCentro } from '../semana-cierre.mjs'
import { CODIGOS_ESTADISTICA } from './catalogo.mjs'
import { poblacionAlCorte, ventasSemana, retirosSemana, cobranzaAlCorte, cpAsistidasSemana } from './calculo.mjs'

const iso10 = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
const fallo = (error) => ({ valor: null, detalle: { error: error?.message || String(error) } })

export async function calcularSemanaCentro(centroId, semanaFin, { query = sql, crm, now = new Date() } = {}) {
  const { desde } = rangoSemana(semanaFin)
  const [centro] = await query`SELECT id, nombre, pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error(`Centro desconocido: ${centroId}`)
  const zona = zonaHorariaCentro(centro)
  const hoy = fechaCivil(now, zona)
  const corte = hoy < semanaFin ? hoy : semanaFin
  const meses = mesesDeSemana(semanaFin)
  const lo = meses[0].year * 100 + meses[0].month
  const hi = meses.at(-1).year * 100 + meses.at(-1).month
  const [year, month] = corte.split('-').map(Number)
  const leer = async (fn) => { try { return { data: await fn() } } catch (error) { return { error } } }
  const [estudiantes, grupos, eventos, inicio, diaria, filasKpi, crmClases] = await Promise.all([
    leer(() => query`SELECT id, grupo_id, estado, fecha_inscripcion, ultima_asistencia FROM estudiantes WHERE centro_id = ${centroId}`),
    leer(() => query`SELECT id, estado, fecha_inicio_clases, itinerario_clases FROM grupos WHERE centro_id = ${centroId}`),
    leer(() => query`SELECT id, estudiante_id, tipo, fecha, year, month, origen, motivo, a_grupo_id FROM estudiante_eventos WHERE centro_id = ${centroId} AND tipo IN ('inscripcion','retiro','cambio_grupo','reincorporacion') ORDER BY fecha, id`),
    leer(() => cierreMesAnterior(centroId, year, month, query)),
    leer(() => query`SELECT fecha, vencidas FROM cobranza_diaria WHERE centro_id = ${centroId} AND fecha BETWEEN ${desde} AND ${semanaFin}`),
    leer(() => query`SELECT * FROM kpi_semanas WHERE centro_id = ${centroId} AND (year * 100 + month) BETWEEN ${lo} AND ${hi}`),
    leer(() => cargarClasesCrm(centroId, { query, crm })),
  ])
  const datos = () => {
    for (const fuente of [estudiantes, grupos, eventos]) if (fuente.error) throw fuente.error
    return { estudiantes: estudiantes.data, grupos: grupos.data, eventos: eventos.data }
  }
  const calcular = (fn) => { try { return fn() } catch (error) { return fallo(error) } }
  return {
    ninos_activos: calcular(() => {
      if (inicio.error) throw inicio.error
      return poblacionAlCorte({ ...datos(), inicioMes: inicio.data?.valor ?? null, corte })
    }),
    nuevos_inscritos: calcular(() => ventasSemana({ ...datos(), desde, hasta: corte })),
    retiros: calcular(() => retirosSemana({ ...datos(), desde, hasta: corte })),
    facturas_vencidas: calcular(() => {
      if (diaria.error) throw diaria.error
      if (filasKpi.error) throw filasKpi.error
      return cobranzaAlCorte({ diaria: diaria.data, filasKpi: filasKpi.data, desde, hasta: semanaFin, hoy })
    }),
    cp_asistidas: calcular(() => {
      if (crmClases.error) throw crmClases.error
      if (!crmClases.data.complete) throw new Error(crmClases.data.error)
      return cpAsistidasSemana({ clases: crmClases.data.clases, desde, hasta: corte, timeZone: zona, now })
    }),
  }
}

export async function guardarSemanaCentro(centroId, semanaFin, resultados, { estado = 'abierta', forzar = false, query = sql } = {}) {
  rangoSemana(semanaFin)
  if (!['abierta', 'cerrada'].includes(estado)) throw new Error(`Estado inválido: ${estado}`)
  const escribir = async (q) => {
    for (const codigo of CODIGOS_ESTADISTICA) {
      const item = resultados[codigo] || fallo(new Error('No se calculó la estadística.'))
      await q`
      INSERT INTO estadisticas_semana (centro_id, semana_fin, codigo, valor, estado, detalle, calculado_at)
      VALUES (${centroId}, ${semanaFin}, ${codigo}, ${item.valor}, ${estado}, ${JSON.stringify(item.detalle || {})}::jsonb, now())
      ON CONFLICT (centro_id, semana_fin, codigo) DO UPDATE SET
        valor = EXCLUDED.valor, estado = EXCLUDED.estado, detalle = EXCLUDED.detalle, calculado_at = now()
      WHERE estadisticas_semana.estado <> 'cerrada' OR ${forzar}`
    }
  }
  return query === sql ? withTransaction(escribir) : escribir(query)
}

export async function recalcularSemanas({ now = new Date(), query = sql, crm } = {}) {
  const centros = await query`SELECT id, nombre, pais FROM centros ORDER BY id`
  const resumen = { abiertas: 0, cerradas: 0, errores: [] }
  for (const centro of centros) {
    const hoy = fechaCivil(now, zonaHorariaCentro(centro))
    const abierta = semanaAbierta(now, zonaHorariaCentro(centro))
    const pendientes = await query`
      SELECT DISTINCT semana_fin FROM estadisticas_semana
      WHERE centro_id = ${centro.id} AND estado = 'abierta' AND semana_fin < ${hoy}
      ORDER BY semana_fin`
    for (const [semanaFin, estado] of [[abierta, 'abierta'], ...pendientes.map((fila) => [iso10(fila.semana_fin), 'cerrada'])]) {
      try {
        const resultados = await calcularSemanaCentro(centro.id, semanaFin, { query, crm, now })
        await guardarSemanaCentro(centro.id, semanaFin, resultados, { estado, query })
        if (estado === 'abierta') resumen.abiertas++
        else resumen.cerradas++
      } catch (error) {
        resumen.errores.push({ centroId: centro.id, semanaFin, error: error?.message || String(error) })
      }
    }
  }
  return resumen
}

export async function leerSerieCentros(centroIds, semanas, { query = sql } = {}) {
  if (!centroIds.length || !semanas.length) return []
  return await query`
    SELECT e.centro_id, e.semana_fin, e.codigo, e.valor, e.estado, e.detalle, e.calculado_at, p.condicion
    FROM estadisticas_semana e
    LEFT JOIN semana_planes p ON p.centro_id = e.centro_id AND p.semana_fin = e.semana_fin
    WHERE e.centro_id = ANY(${centroIds}::int[]) AND e.semana_fin = ANY(${semanas}::date[])
    ORDER BY e.centro_id, e.semana_fin, e.codigo`
}
