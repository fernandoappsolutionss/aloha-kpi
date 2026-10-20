// Capa de servidor: carga una vez las fuentes y guarda fotos independientes.
import { sql, withTransaction } from '../db.js'
import { cierreMesAnterior } from '../cadena.js'
import { cargarClasesCrm } from '../kpi-auto-server.js'
import { fechaCivil, mesesDeSemana, rangoSemana, semanaAbierta, zonaHorariaCentro } from '../semana-cierre.mjs'
import { CODIGOS_ESTADISTICA } from './catalogo.mjs'
import { diasDeSemana } from '../avance-semana.mjs'
import { poblacionAlCorte, poblacionDesdeRegistros, ventasSemana, retirosSemana, cobranzaAlCorte, cpAsistidasSemana } from './calculo.mjs'

const iso10 = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10)
const fallo = (error) => ({ valor: null, detalle: { error: error?.message || String(error) } })

export async function calcularSemanaCentro(centroId, semanaFin, { query = sql, crm, now = new Date(), soloPoblacion = false, mensual = false, cargarCrm, corteDiario } = {}) {
  const rango = rangoSemana(semanaFin)
  const [centro] = await query`SELECT id, nombre, pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error(`Centro desconocido: ${centroId}`)
  const zona = zonaHorariaCentro(centro)
  const hoy = fechaCivil(now, zona)
  if (corteDiario && (!diasDeSemana(semanaFin).includes(corteDiario) || corteDiario > hoy)) throw new Error('Corte diario inválido.')
  const corte = corteDiario || (hoy < semanaFin ? hoy : semanaFin)
  const desde = mensual ? `${corte.slice(0, 7)}-01` : rango.desde
  const meses = mensual ? [{ year: Number(corte.slice(0, 4)), month: Number(corte.slice(5, 7)) }] : mesesDeSemana(semanaFin)
  const lo = meses[0].year * 100 + meses[0].month
  const hi = meses.at(-1).year * 100 + meses.at(-1).month
  const [year, month] = corte.split('-').map(Number)
  const leer = async (fn) => { try { return { data: await fn() } } catch (error) { return { error } } }
  const [estudiantes, grupos, eventos, inicio, diaria, filasKpi, crmClases] = await Promise.all([
    leer(() => query`SELECT id, grupo_id, estado, fecha_inscripcion, ultima_asistencia FROM estudiantes WHERE centro_id = ${centroId}`),
    leer(() => query`SELECT id, estado, fecha_inicio_clases, inicio_pendiente, itinerario_clases FROM grupos WHERE centro_id = ${centroId}`),
    leer(() => query`SELECT id, estudiante_id, tipo, fecha, year, month, origen, motivo, a_grupo_id FROM estudiante_eventos WHERE centro_id = ${centroId} AND tipo IN ('inscripcion','retiro','cambio_grupo','reincorporacion') ORDER BY fecha, id`),
    leer(() => cierreMesAnterior(centroId, year, month, query)),
    soloPoblacion ? {} : leer(() => query`SELECT fecha, vencidas, registrado_at FROM cobranza_diaria WHERE centro_id = ${centroId} AND fecha BETWEEN ${desde} AND ${semanaFin}`),
    soloPoblacion ? {} : leer(() => query`SELECT * FROM kpi_semanas WHERE centro_id = ${centroId} AND (year * 100 + month) BETWEEN ${lo} AND ${hi}`),
    soloPoblacion ? {} : leer(() => cargarCrm ? cargarCrm() : cargarClasesCrm(centroId, { query, crm })),
  ])
  const datos = () => {
    for (const fuente of [estudiantes, grupos, eventos]) if (fuente.error) throw fuente.error
    return { estudiantes: estudiantes.data, grupos: grupos.data, eventos: eventos.data }
  }
  const calcular = (fn) => { try { return fn() } catch (error) { return fallo(error) } }
  const respaldo = !inicio.error && inicio.data?.valor == null
    ? await leer(() => query`SELECT year, month, ninos_final_mes FROM resumen_mes WHERE centro_id = ${centroId} ORDER BY year, month`)
    : null
  const poblacion = calcular(() => {
    if (inicio.error) throw inicio.error
    if (respaldo?.error) throw respaldo.error
    return respaldo ? poblacionDesdeRegistros({ ...datos(), resumenes: respaldo.data, corte })
      : poblacionAlCorte({ ...datos(), inicioMes: inicio.data.valor, corte })
  })
  if (soloPoblacion) return { ninos_activos: poblacion }
  return {
    ninos_activos: poblacion,
    nuevos_inscritos: calcular(() => ventasSemana({ ...datos(), desde, hasta: corte })),
    retiros: calcular(() => retirosSemana({ ...datos(), desde, hasta: corte })),
    facturas_vencidas: calcular(() => {
      if (diaria.error) throw diaria.error
      if (filasKpi.error) throw filasKpi.error
      return cobranzaAlCorte({ diaria: diaria.data, filasKpi: filasKpi.data, desde, hasta: semanaFin, hoy: corte })
    }),
    cp_asistidas: calcular(() => {
      if (crmClases.error) throw crmClases.error
      if (!crmClases.data.complete) throw new Error(crmClases.data.error)
      return cpAsistidasSemana({ clases: crmClases.data.clases, desde, hasta: corte, timeZone: zona, now })
    }),
  }
}

export async function completarSerieCentro(centroId, semanas, filas, { query = sql, crm, now = new Date(), diario = false } = {}) {
  // Las fuentes compartidas se leen una vez por petición, sin caché entre usuarios.
  const cache = new Map()
  const leer = (strings, ...values) => {
    const clave = JSON.stringify([strings, values])
    if (!cache.has(clave)) cache.set(clave, query(strings, ...values))
    return cache.get(clave)
  }
  const abierta = semanas.at(-1)
  let clases
  const cargarCrm = () => clases ??= cargarClasesCrm(centroId, { query: leer, crm })
  const fechas = semanas.filter(fin => fin === abierta || !filas.some(fila =>
    fila.codigo === 'ninos_activos' && iso10(fila.semana_fin) === fin
    && (fila.valor != null || fila.detalle?.conciliacionPendiente)))
  const [resultados, resultadosMes] = await Promise.all([
    Promise.all(fechas.map(async fin => [fin, await calcularSemanaCentro(centroId, fin,
      { query: leer, crm, now, soloPoblacion: fin !== abierta, cargarCrm })])),
    calcularSemanaCentro(centroId, abierta, { query: leer, crm, now, mensual: true, cargarCrm }),
  ])
  const nuevas = filas.map(fila => ({ ...fila }))
  for (const [fin, calculo] of resultados) for (const [codigo, item] of Object.entries(calculo)) {
    const indice = nuevas.findIndex(fila => fila.codigo === codigo && iso10(fila.semana_fin) === fin)
    if (fin !== abierta && item.valor == null) continue
    const anterior = indice < 0 ? {} : nuevas[indice]
    const fila = { ...anterior, centro_id: centroId, semana_fin: fin, codigo, valor: item.valor,
      estado: fin === abierta ? 'abierta' : 'cerrada', calculado_at: now.toISOString(),
      detalle: { ...item.detalle, fuenteEnVivo: true, ...(fin !== abierta ? { reconstruida: true } : {}) } }
    if (indice < 0) nuevas.push(fila)
    else nuevas[indice] = fila
  }
  const [centro] = diario ? await leer`SELECT id, nombre, pais FROM centros WHERE id = ${centroId}` : []
  const hoy = diario ? fechaCivil(now, zonaHorariaCentro(centro)) : null
  const avanceDiario = diario ? await Promise.all(diasDeSemana(abierta).filter(fecha => fecha <= hoy).map(async fecha => {
    const valores = fecha === hoy ? Object.fromEntries(nuevas.filter(f => iso10(f.semana_fin) === abierta).map(f => [f.codigo, f.valor]))
      : Object.fromEntries(Object.entries(await calcularSemanaCentro(centroId, abierta, { query: leer, crm, now, cargarCrm, corteDiario: fecha })).map(([codigo, item]) => [codigo, item.valor]))
    return { fecha, valores }
  })) : []
  return { filas: nuevas, resultadosMes, avanceDiario }
}

export async function guardarSemanaCentro(centroId, semanaFin, resultados, { estado = 'abierta', forzar = false, query = sql } = {}) {
  rangoSemana(semanaFin)
  if (!['abierta', 'cerrada'].includes(estado)) throw new Error(`Estado inválido: ${estado}`)
  const escribir = async (q) => {
    if (forzar) {
      const pendientes = await q`SELECT codigo FROM estadisticas_semana
        WHERE centro_id = ${centroId} AND semana_fin = ${semanaFin}
          AND detalle ? 'conciliacionPendiente' FOR UPDATE`
      if (pendientes.length) throw new Error('Confirma las fechas pendientes de conciliación antes de recalcular este cierre.')
    }
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
