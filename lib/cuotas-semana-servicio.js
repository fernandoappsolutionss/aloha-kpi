import { sql, withTransaction } from './db.js'
import { estadistica } from './estadisticas-semana/catalogo.mjs'
import { normalizarMetas } from './marcadores.mjs'
import { proponerCuota, propuestaDesdeCompromiso, validarCompromiso } from './cuotas-semana.mjs'
import { cargarPlan } from './plan-semana-servicio.js'
import { rangoSemana, semanaAbierta, sumarDias, zonaHorariaCentro } from './semana-cierre.mjs'

export async function leerCuotasCentros(centroIds, semanas, { query = sql } = {}) {
  if (!centroIds.length || !semanas.length) return []
  return await query`SELECT centro_id, semana_fin, codigo, cuota, propuesta, estado FROM semana_cuotas
    WHERE centro_id = ANY(${centroIds}::int[]) AND semana_fin = ANY(${semanas}::date[])`
}

export async function metasDeSemana(semanaFin, { query = sql } = {}) {
  const year = Number(semanaFin.slice(0, 4))
  const trimestre = Math.ceil(Number(semanaFin.slice(5, 7)) / 3)
  const [fila] = await query`SELECT * FROM metas WHERE anio = ${year} AND trimestre = ${trimestre}`
  return normalizarMetas(fila)
}

export async function leerCompromiso(centroId, periodo, { query = sql } = {}) {
  const [fila] = await query`SELECT periodo, diagnostico, metas, updated_at FROM ruta_compromisos_mes WHERE centro_id = ${centroId} AND periodo = ${periodo}`
  return fila ?? null
}

export async function guardarCompromisoEn(centroId, datos, { query = sql, actorId, now = new Date() } = {}) {
  const limpio = validarCompromiso(datos)
  const [centro] = await query`SELECT id, pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error('Centro desconocido.')
  if (limpio.periodo !== semanaAbierta(now, zonaHorariaCentro(centro)).slice(0, 7)) throw new Error('La meta corresponde al mes de la semana abierta.')
  const [fila] = await query`INSERT INTO ruta_compromisos_mes (centro_id, periodo, diagnostico, metas, actualizado_por)
    VALUES (${centroId}, ${limpio.periodo}, ${limpio.diagnostico}, ${JSON.stringify(limpio.metas)}::jsonb, ${actorId})
    ON CONFLICT (centro_id, periodo) DO UPDATE SET diagnostico=EXCLUDED.diagnostico, metas=EXCLUDED.metas, actualizado_por=EXCLUDED.actualizado_por, updated_at=now()
    RETURNING periodo, diagnostico, metas, updated_at`
  return fila
}

export async function guardarCuotasEn(centroId, semanaFin, cuotas, { query = sql, transaction, actorId, now = new Date(), aprobar = false } = {}) {
  rangoSemana(semanaFin)
  const entradas = Object.entries(cuotas || {})
  if (!entradas.length) throw new Error('Indica al menos una cuota.')
  for (const [codigo, cuota] of entradas) {
    estadistica(codigo)
    if (typeof cuota === 'boolean' || String(cuota).trim() === '' || cuota == null || !Number.isInteger(Number(cuota)) || Number(cuota) < 0) throw new Error('Cuota inválida.')
  }
  const [centro] = await query`SELECT id, pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error('Centro desconocido.')
  if (semanaFin !== semanaAbierta(now, zonaHorariaCentro(centro))) throw new Error('Las cuotas solo se guardan para la semana abierta.')
  const ultimaCerrada = sumarDias(semanaFin, -7)
  const [filas, metas, compromiso] = await Promise.all([
    query`SELECT codigo, valor, semana_fin, estado FROM estadisticas_semana WHERE centro_id = ${centroId} AND semana_fin >= ${sumarDias(semanaFin, -35)} AND semana_fin <= ${ultimaCerrada} AND estado = 'cerrada' ORDER BY semana_fin`,
    metasDeSemana(semanaFin, { query }),
    leerCompromiso(centroId, semanaFin.slice(0, 7), { query }),
  ])
  const fecha = v => v instanceof Date ? v.toISOString().slice(0, 10) : String(v)
  const ultimos = new Map(filas.filter(f => fecha(f.semana_fin) === ultimaCerrada).map(f => [f.codigo, f.valor]))
  const series = {}
  for (const fila of filas) (series[fila.codigo] ||= []).push({ semanaFin: fecha(fila.semana_fin), valor: fila.valor, estado: fila.estado })
  const run = transaction || (query === sql ? (work) => withTransaction(work) : (work) => work(query))
  return await run(async (q) => {
    const resultado = []
    for (const [codigo, cuota] of entradas) {
      const mensual = propuestaDesdeCompromiso({ codigo, compromiso, series, semanaFin })
      const propuesta = mensual ? mensual.valor : proponerCuota({ codigo, ultimo: ultimos.get(codigo) ?? null, ninosActivos: ultimos.get('ninos_activos') ?? null, metas })
      const [fila] = await q`INSERT INTO semana_cuotas
        (centro_id, semana_fin, codigo, cuota, propuesta, propuesta_por, estado, aprobada_por, aprobada_at)
        VALUES (${centroId}, ${semanaFin}, ${codigo}, ${Number(cuota)}, ${propuesta}, ${actorId}, ${aprobar ? 'aprobada' : 'propuesta'}, ${aprobar ? actorId : null}, ${aprobar ? now : null})
        ON CONFLICT (centro_id, semana_fin, codigo) DO UPDATE SET
          cuota = EXCLUDED.cuota, propuesta = EXCLUDED.propuesta,
          estado = CASE WHEN ${aprobar} THEN 'aprobada' WHEN semana_cuotas.cuota = EXCLUDED.cuota THEN semana_cuotas.estado ELSE 'propuesta' END,
          propuesta_por = EXCLUDED.propuesta_por,
          aprobada_por = CASE WHEN ${aprobar} THEN EXCLUDED.aprobada_por WHEN semana_cuotas.cuota = EXCLUDED.cuota THEN semana_cuotas.aprobada_por ELSE NULL END,
          aprobada_at = CASE WHEN ${aprobar} THEN EXCLUDED.aprobada_at WHEN semana_cuotas.cuota = EXCLUDED.cuota THEN semana_cuotas.aprobada_at ELSE NULL END,
          updated_at = now()
        RETURNING codigo, cuota, propuesta, estado`
      resultado.push(fila)
    }
    return resultado
  })
}

export async function agregarOrdenEn(centroId, semanaFin, datos, { query = sql, cargar = cargarPlan, actorId, now = new Date() } = {}) {
  rangoSemana(semanaFin)
  const texto = String(datos?.texto || '').trim()
  const fecha = datos?.fecha || null
  if (!texto || texto.length > 500) throw new Error('Orden inválida.')
  if (fecha && (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(`${fecha}T00:00:00Z`)))) throw new Error('Fecha inválida.')
  const [centro] = await query`SELECT id, pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error('Centro desconocido.')
  if (semanaFin !== sumarDias(semanaAbierta(now, zonaHorariaCentro(centro)), -7)) throw new Error('La orden corresponde a la última semana cerrada.')
  const { plan } = await cargar(centroId, semanaFin, { query, sesion: { id: actorId }, now })
  const [orden] = await query`INSERT INTO semana_objetivos (plan_id, seccion, paso, texto, fecha, creado_por)
    VALUES (${plan.id}, 'orden', NULL, ${texto}, ${fecha}, ${actorId}) RETURNING id, texto, seccion, fecha`
  return orden
}
