'use server'
import { sql } from '../../lib/db.js'
import { requireCentroAccess, requireCurrentWriteCentro, requireCurrentMaster, requireCurrentPuedeCerrarMes, requireCurrentCoordinacion } from '../../lib/auth.js'
import { puedeEscribirCentro, esAdminDe } from '../../lib/current-user.mjs'
import { alcancePanel } from '../../lib/alcance.js'
import { fechaCivil, rangoSemana, semanaAbierta, sumarDias, ultimasSemanas, zonaHorariaCentro } from '../../lib/semana-cierre.mjs'
import { ESTADISTICAS_CENTRO } from '../../lib/estadisticas-semana/catalogo.mjs'
import { armarSeries, armarTablero } from '../../lib/estadisticas-semana/presentacion.mjs'
import { calcularSemanaCentro, guardarSemanaCentro, leerSerieCentros, completarSerieCentro } from '../../lib/estadisticas-semana/servicio.js'
import { cargarPlan, asignarCondicionEn, agregarObjetivoEn, editarObjetivoEn, marcarObjetivoEn, eliminarObjetivoEn, puedeAsignarCondicion, verificarObjetivoEn, programarObjetivoHoyEn } from '../../lib/plan-semana-servicio.js'
import { enriquecerTableroConPlanes } from '../../lib/plan-semana.mjs'
import { lecturaCondicion } from '../../lib/condiciones/lectura.mjs'
import { prepararCuotas, evaluarCuotasCerradas, ordenarReunion, periodosCentro } from '../../lib/cuotas-semana.mjs'
import { leerCuotasCentros, metasDeSemana, guardarCuotasEn, agregarOrdenEn, leerCompromiso, guardarCompromisoEn } from '../../lib/cuotas-semana-servicio.js'
import { superponerCobranzaTablero } from '../../lib/estadisticas-semana/cobranza-tablero.js'
import { cargarClasesPruebaTablero } from '../../lib/estadisticas-semana/clases-prueba-tablero.js'
import { cambiarAlineamientoEn } from '../../lib/alineamiento-semana-servicio.js'
import { leerInformeSemana } from '../../lib/informe-semana-servicio.js'
import { fallo } from '../../lib/errores.js'

export async function getInformeSemana(centroId, semanaFin) {
  const session = await requireCentroAccess(centroId)
  if (session.rol === 'coach') throw new Error('No autorizado para este centro')
  return await leerInformeSemana(centroId, semanaFin)
}

async function vistaCentro(centroId, session) {
  const [centro] = await sql`SELECT id, nombre, pais FROM centros WHERE id = ${centroId}`
  if (!centro) throw new Error('Centro desconocido.')
  const zonaHoraria = zonaHorariaCentro(centro)
  const now = new Date()
  const abierta = semanaAbierta(now, zonaHoraria)
  const semanas = ultimasSemanas(abierta, 12)
  const [guardadas, filasCuotas, metas, compromiso] = await Promise.all([
    leerSerieCentros([Number(centroId)], semanas),
    leerCuotasCentros([Number(centroId)], semanas),
    metasDeSemana(abierta),
    leerCompromiso(centroId, abierta.slice(0, 7)),
  ])
  const { filas, resultadosMes, avanceDiario } = await completarSerieCentro(centroId, semanas, guardadas, { now, diario: true })
  const { series: baseSeries, resumen } = armarSeries(semanas, filas)
  const { series, cuotas } = prepararCuotas({ catalogo: ESTADISTICAS_CENTRO, series: baseSeries, resumen, filasCuotas, metas, compromiso, semanaAbierta: abierta, hoy: fechaCivil(now, zonaHoraria) })
  const fechas = filas.map((fila) => fila.calculado_at).filter(Boolean).map((fecha) => new Date(fecha).getTime())
  const ultimaCerrada = sumarDias(abierta, -7)
  const plan = await cargarPlan(centroId, ultimaCerrada, { sesion: session })
  return {
    centro: { id: centro.id, nombre: centro.nombre, zonaHoraria },
    semanaAbierta: abierta,
    ultimaCerrada,
    semanas,
    catalogo: ESTADISTICAS_CENTRO,
    series,
    resumen,
    resultadosMes,
    avanceDiario,
    fechaDatos: fechaCivil(now, zonaHoraria),
    ultimoCalculo: fechas.length ? new Date(Math.max(...fechas)).toISOString() : null,
    puedeEscribir: puedeEscribirCentro(session, centroId),
    puedeAsignar: puedeAsignarCondicion(session),
    puedeAprobar: esAdminDe(session, centroId),
    cuotas,
    compromiso,
    plan,
  }
}

export async function getSemanaCentro(centroId) {
  const session = await requireCentroAccess(centroId)
  if (session.rol === 'coach') throw new Error('No autorizado para este centro')
  return await vistaCentro(centroId, session)
}

// Las mutaciones devuelven { error } (lib/errores.js): en producción Next
// oculta el mensaje de cualquier throw y la UI mostraría «An error occurred…».
// Las lecturas (get*) siguen lanzando: cada pantalla que las llama ya tiene
// su catch con mensaje propio, y varias viven fuera de /semana.
export async function actualizarSemanaCentro(centroId) {
  try {
    const session = await requireCurrentWriteCentro(centroId)
    const [centro] = await sql`SELECT id, pais FROM centros WHERE id = ${centroId}`
    if (!centro) throw new Error('Centro desconocido.')
    const abierta = semanaAbierta(new Date(), zonaHorariaCentro(centro))
    const resultados = await calcularSemanaCentro(centroId, abierta)
    await guardarSemanaCentro(centroId, abierta, resultados)
    return await vistaCentro(centroId, session)
  } catch (e) { return fallo('actualizarSemanaCentro', e) }
}

export async function recalcularSemanaCentro(centroId, semanaFin) {
  try {
    const session = await requireCurrentMaster()
    rangoSemana(semanaFin)
    const [centro] = await sql`SELECT id, pais FROM centros WHERE id = ${centroId}`
    if (!centro) throw new Error('Centro desconocido.')
    if (semanaFin >= fechaCivil(new Date(), zonaHorariaCentro(centro))) throw new Error('Solo se recalculan semanas cerradas.')
    const resultados = await calcularSemanaCentro(centroId, semanaFin)
    await guardarSemanaCentro(centroId, semanaFin, resultados, { estado: 'cerrada', forzar: true })
    return await vistaCentro(centroId, session)
  } catch (e) { return fallo('recalcularSemanaCentro', e) }
}

async function cargarTablero({ incluirClasesPrueba = false } = {}) {
  const { centros, sesion } = await alcancePanel()
  const now = new Date()
  const abierta = semanaAbierta(now, 'America/Panama')
  const semanas = ultimasSemanas(abierta, 12)
  const periodos = periodosCentro(centros, now)
  const todasSemanas = [...new Set([...semanas, ...Object.values(periodos).flatMap((periodo) => periodo.semanas)])]
  const cierres = [...new Set(Object.values(periodos).map((periodo) => periodo.ultimaCerrada))]
  const abiertas = [...new Set(Object.values(periodos).map((periodo) => periodo.semanaAbierta))]
  const ids = centros.map((centro) => centro.id)
  const [guardadas, filasCuotas, metasEntradas, planes, compromisos, clasesPrueba] = await Promise.all([
    leerSerieCentros(ids, todasSemanas),
    leerCuotasCentros(ids, todasSemanas),
    Promise.all(abiertas.map(async (semana) => [semana, await metasDeSemana(semana)])),
    ids.length ? sql`SELECT * FROM semana_planes WHERE centro_id = ANY(${ids}::int[]) AND semana_fin = ANY(${cierres}::date[])` : [],
    ids.length ? sql`SELECT * FROM ruta_compromisos_mes WHERE centro_id=ANY(${ids}::int[]) AND periodo=ANY(${abiertas.map(fin => fin.slice(0, 7))}::text[])` : [],
    incluirClasesPrueba ? cargarClasesPruebaTablero(centros, periodos, { now }) : {},
  ])
  const filas = await superponerCobranzaTablero(centros, periodos, guardadas, { now })
  const metasPorSemana = new Map(metasEntradas)
  const tablero = armarTablero(centros, semanas, filas)
  const ultimaCerrada = sumarDias(abierta, -7)
  const planIds = planes.map((plan) => plan.id)
  const objetivos = planIds.length ? await sql`SELECT * FROM semana_objetivos WHERE plan_id = ANY(${planIds}::bigint[])` : []
  const presentados = centros.map((centro) => {
    const periodo = periodos[centro.id]
    const propias = filas.filter((fila) => Number(fila.centro_id) === Number(centro.id))
    const cuotasCentro = filasCuotas.filter((fila) => Number(fila.centro_id) === Number(centro.id))
    const base = { ...armarTablero([centro], periodo.semanas, propias).centros[0], pais: centro.pais }
    const planCentro = planes.filter((plan) => Number(plan.centro_id) === Number(centro.id) && (plan.semana_fin instanceof Date ? plan.semana_fin.toISOString().slice(0, 10) : String(plan.semana_fin).slice(0, 10)) === periodo.ultimaCerrada)
    const conPlan = enriquecerTableroConPlanes([base], planCentro, objetivos, periodo.ultimaCerrada, now)[0]
    const { series, resumen } = armarSeries(periodo.semanas, propias)
    const compromiso = compromisos.find(f => Number(f.centro_id) === Number(centro.id) && f.periodo === periodo.semanaAbierta.slice(0, 7))
    const cuotaVista = prepararCuotas({ compromiso, catalogo: ESTADISTICAS_CENTRO, series, resumen, filasCuotas: cuotasCentro, metas: metasPorSemana.get(periodo.semanaAbierta), semanaAbierta: periodo.semanaAbierta, hoy: periodo.hoy })
    const evaluacionCuotas = evaluarCuotasCerradas({ catalogo: ESTADISTICAS_CENTRO, series, filasCuotas: cuotasCentro, semanaFin: periodo.ultimaCerrada })
    return { ...conPlan, zonaHoraria: zonaHorariaCentro(centro), semanaAbierta: periodo.semanaAbierta, ultimaCerrada: periodo.ultimaCerrada, serie: cuotaVista.series.ninos_activos, cuotas: cuotaVista.cuotas,
      cuotasCumplidas: evaluacionCuotas.porcentaje, evaluacionCuotas, clasesPrueba: clasesPrueba[centro.id],
      puedeAprobar: esAdminDe(sesion, centro.id),
      lectura: lecturaCondicion(base.serie.filter((punto) => punto.semanaFin <= periodo.ultimaCerrada).map((punto) => punto.valor)) }
  })
  return { semanaAbierta: abierta, ultimaCerrada, semanas, catalogo: ESTADISTICAS_CENTRO, centros: presentados, consolidada: tablero.consolidada }
}

export async function getTableroSemanal() {
  return await cargarTablero({ incluirClasesPrueba: true })
}

export async function getReunionSemanal() {
  const tablero = await cargarTablero()
  return { ...tablero, centros: ordenarReunion(tablero.centros) }
}

export async function asignarCondicion(centroId, semanaFin, datos) {
  try {
    const sesion = await requireCurrentPuedeCerrarMes(centroId)
    return await asignarCondicionEn(centroId, semanaFin, datos, { sesion })
  } catch (e) { return fallo('asignarCondicion', e) }
}

export async function agregarObjetivo(centroId, semanaFin, datos) {
  try {
    const sesion = await requireCurrentWriteCentro(centroId)
    return await agregarObjetivoEn(centroId, semanaFin, datos, { sesion })
  } catch (e) { return fallo('agregarObjetivo', e) }
}

export async function editarObjetivo(centroId, objetivoId, datos) {
  try {
    await requireCurrentWriteCentro(centroId)
    return await editarObjetivoEn(centroId, objetivoId, datos)
  } catch (e) { return fallo('editarObjetivo', e) }
}

export async function marcarObjetivo(centroId, objetivoId, hecho, evidencia) {
  try {
    await requireCurrentWriteCentro(centroId)
    return await marcarObjetivoEn(centroId, objetivoId, hecho, { evidencia })
  } catch (e) { return fallo('marcarObjetivo', e) }
}

export async function eliminarObjetivo(centroId, objetivoId) {
  try {
    await requireCurrentWriteCentro(centroId)
    return await eliminarObjetivoEn(centroId, objetivoId)
  } catch (e) { return fallo('eliminarObjetivo', e) }
}

export async function guardarCuotas(centroId, semanaFin, cuotas) {
  try {
    const sesion = await requireCurrentWriteCentro(centroId)
    return await guardarCuotasEn(centroId, semanaFin, cuotas, { actorId: sesion.id })
  } catch (e) { return fallo('guardarCuotas', e) }
}

export async function aprobarCuotas(centroId, semanaFin, cuotas) {
  try {
    const sesion = await requireCurrentCoordinacion(centroId)
    return await guardarCuotasEn(centroId, semanaFin, cuotas, { actorId: sesion.id, aprobar: true })
  } catch (e) { return fallo('aprobarCuotas', e) }
}

export async function agregarOrden(centroId, semanaFin, datos) {
  try {
    const sesion = await requireCurrentCoordinacion(centroId)
    return await agregarOrdenEn(centroId, semanaFin, datos, { actorId: sesion.id })
  } catch (e) { return fallo('agregarOrden', e) }
}

export async function guardarCompromiso(centroId, datos) {
  try {
    const sesion = await requireCurrentPuedeCerrarMes(centroId)
    return await guardarCompromisoEn(centroId, datos, { actorId: sesion.id })
  } catch (e) { return fallo('guardarCompromiso', e) }
}

export async function verificarObjetivo(centroId, objetivoId, revision) {
  try {
    const sesion = await requireCurrentCoordinacion(centroId)
    return await verificarObjetivoEn(centroId, objetivoId, { actorId: sesion.id, revision })
  } catch (e) { return fallo('verificarObjetivo', e) }
}

export async function cambiarAlineamiento(centroId, semanaFin, cambio) {
  try {
    await requireCurrentWriteCentro(centroId)
    return await cambiarAlineamientoEn(centroId, semanaFin, cambio)
  } catch (e) { return fallo('cambiarAlineamiento', e) }
}

export async function programarObjetivoHoy(centroId, objetivoId, datos) {
  try {
    await requireCurrentWriteCentro(centroId)
    return await programarObjetivoHoyEn(centroId, objetivoId, datos)
  } catch (e) { return fallo('programarObjetivoHoy', e) }
}
