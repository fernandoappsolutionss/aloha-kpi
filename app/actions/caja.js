'use server'
import { requireCurrentCaja } from '../../lib/auth'
import {
  listarCuentas, cuentaPorNumero, listarReglas, movimientosDesde, porClasificar, fitidsExistentes,
  listarCompromisos, listarAjustes, listarBaldes, guardarImportacion, clasificarMovimientoRepo,
  guardarCompromisoRepo, desactivarCompromisoRepo, guardarAjusteRepo,
} from '../../lib/caja/repo'
import { leerExtracto } from '../../lib/caja/extracto.mjs'
import { clasificar, CLASES, CLASES_FUERA_DE_CURVA } from '../../lib/caja/reglas.mjs'
import { hoyPanama, sumarDias, lunesDe } from '../../lib/caja/semanas.mjs'
import { perfilIngresos, estadoBaldes, calcularCurva, consolidar } from '../../lib/caja/curva.mjs'

const EMPRESAS = ['altavia', 'ff']
const ISO = /^\d{4}-\d{2}-\d{2}$/
const CLASES_NO_COMPROMISO = ['ingreso', 'por_clasificar', 'traspaso_propio', 'resguardo_cc', 'intercompania']
const r2 = (n) => Math.round(n * 100) / 100
const esClase = (c) => typeof c === 'string' && Object.hasOwn(CLASES, c)
const fallo = (e) => ({ error: e?.message === 'No autorizado' || e?.message === 'No autenticado' ? 'No autorizado' : e?.message || 'Error inesperado' })

function texto(v, max) {
  const s = String(v ?? '').trim()
  if (!s || s.length > max) throw new Error(`Texto vacío o de más de ${max} caracteres.`)
  return s
}

export async function getCaja() {
  try {
    await requireCurrentCaja()
    const hoy = hoyPanama()
    // La historia cubre el perfil de ingresos (3 meses cerrados) y, si los baldes son
    // más viejos, arranca en el primer balde: si no, el pendiente del dueño y la
    // reserva de impuesto se calcularían sobre una historia recortada.
    const cargarBaldesYMovs = listarBaldes().then(async (baldes) => {
      const primerBalde = baldes.map((b) => b.vigente_desde).sort()[0]
      const base = sumarDias(hoy, -150)
      const desde = primerBalde && primerBalde < base ? primerBalde : base
      return [baldes, await movimientosDesde(desde)]
    })
    const [cuentas, [baldes, movs], compromisos, ajustes, pendientes] = await Promise.all([
      listarCuentas(), cargarBaldesYMovs, listarCompromisos(), listarAjustes(lunesDe(hoy)), porClasificar(),
    ])
    const linea = cuentas.find((c) => c.tipo === 'linea_credito')
    const lineaDisponible = linea ? r2((linea.limite || 0) - ((linea.base || 0) + linea.posterior)) : 0
    const curvas = {}
    const resumen = {}
    for (const empresa of EMPRESAS) {
      const operativas = cuentas.filter((c) => c.empresa === empresa && (c.tipo === 'operativa' || c.tipo === 'recaudadora'))
      const saldoHoy = r2(operativas.reduce((s, c) => s + (c.base || 0) + c.posterior, 0))
      const ids = new Set(operativas.map((c) => c.id))
      const propios = movs.filter((m) => ids.has(m.cuenta_id) && !CLASES_FUERA_DE_CURVA.has(m.clase))
      const baldesEmpresa = baldes.filter((b) => b.empresa === empresa)
      const perfil = perfilIngresos(propios, hoy)
      const baldesEstado = estadoBaldes(propios, baldesEmpresa, hoy)
      curvas[empresa] = calcularCurva({
        hoy, saldoHoy, perfil, baldesEstado, lineaDisponible,
        compromisos: compromisos.filter((c) => c.empresa === empresa),
        ajustes: ajustes.filter((a) => a.empresa === empresa),
        baldes: baldesEmpresa,
      })
      resumen[empresa] = { saldoHoy, perfil, baldesEstado, balde: baldesEmpresa.at(-1) || null }
    }
    curvas.consolidado = consolidar(curvas.altavia, curvas.ff)
    return { hoy, cuentas, curvas, resumen, lineaDisponible, compromisos, pendientes, clases: CLASES }
  } catch (e) { return fallo(e) }
}

async function prepararExtracto(formData) {
  const archivo = formData?.get?.('archivo')
  if (!archivo || typeof archivo.arrayBuffer !== 'function') throw new Error('Falta el archivo.')
  const bytes = new Uint8Array(await archivo.arrayBuffer())
  const leido = await leerExtracto(archivo.name || '', bytes)
  const cuenta = await cuentaPorNumero(leido.cuenta)
  if (!cuenta) throw new Error(`La cuenta ${leido.cuenta} no está registrada en el módulo de caja.`)
  const reglas = await listarReglas()
  const movimientos = leido.movimientos.map((m) => ({ ...m, ...clasificar(m, reglas, cuenta.empresa) }))
  return { archivo: archivo.name, leido, cuenta, movimientos }
}

export async function previsualizarExtracto(formData) {
  try {
    await requireCurrentCaja()
    const { leido, cuenta, movimientos } = await prepararExtracto(formData)
    const existentes = await fitidsExistentes(cuenta.id, movimientos.map((m) => m.fitid))
    const nuevos = movimientos.filter((m) => !existentes.has(m.fitid))
    const fechas = movimientos.map((m) => m.fecha).sort()
    return {
      cuenta: cuenta.nombre, empresa: cuenta.empresa, formato: leido.formato, saldo: leido.saldo,
      descuadre: leido.descuadre ?? null,
      total: movimientos.length, nuevos: nuevos.length, duplicados: movimientos.length - nuevos.length,
      porClasificar: nuevos.filter((m) => m.clase === 'por_clasificar').length,
      desde: fechas[0] || null, hasta: fechas.at(-1) || null,
    }
  } catch (e) { return fallo(e) }
}

export async function confirmarExtracto(formData) {
  try {
    const user = await requireCurrentCaja()
    const { archivo, leido, cuenta, movimientos } = await prepararExtracto(formData)
    const r = await guardarImportacion({ cuentaId: cuenta.id, archivo, formato: leido.formato, usuarioId: user.id, saldo: leido.saldo, movimientos })
    return { ...r, descuadre: leido.descuadre ?? null }
  } catch (e) { return fallo(e) }
}

export async function clasificarMovimiento(input) {
  try {
    const user = await requireCurrentCaja()
    const id = Number(input?.id)
    if (!Number.isInteger(id) || id <= 0) throw new Error('Movimiento inválido.')
    if (!esClase(input?.clase) || input.clase === 'por_clasificar') throw new Error('Clase inválida.')
    const patron = input?.patron ? texto(input.patron, 80) : null
    if (patron && patron.length < 3) throw new Error('El texto de la regla necesita al menos 3 caracteres.')
    return await clasificarMovimientoRepo({ id, clase: input.clase, categoria: texto(input.categoria, 80), patron, usuarioId: user.id })
  } catch (e) { return fallo(e) }
}

export async function guardarCompromiso(input) {
  try {
    await requireCurrentCaja()
    const id = input?.id ? Number(input.id) : null
    if (id !== null && !(Number.isInteger(id) && id > 0)) throw new Error('Compromiso inválido.')
    const clase = input?.clase
    // Los baldes separan al dueño solos: un pago programado de dueño contaría dos veces.
    if (clase === 'dueno') throw new Error('La separación del dueño es automática: no se programa como pago.')
    if (!esClase(clase) || CLASES_NO_COMPROMISO.includes(clase)) throw new Error('Clase de egreso inválida.')
    const c = {
      id,
      empresa: EMPRESAS.includes(input?.empresa) ? input.empresa : null,
      concepto: texto(input?.concepto, 120),
      clase,
      categoria: texto(input?.categoria || CLASES[clase], 80),
      monto: Number(input?.monto),
      frecuencia: input?.frecuencia,
      dia: input?.dia ? Number(input.dia) : null,
      fecha: input?.fecha || null,
      hasta: input?.hasta || null,
    }
    if (!c.empresa) throw new Error('Empresa inválida.')
    if (!Number.isFinite(c.monto) || c.monto <= 0) throw new Error('El monto debe ser mayor que cero.')
    if (!['unico', 'mensual', 'quincenal', 'anual'].includes(c.frecuencia)) throw new Error('Frecuencia inválida.')
    if (c.frecuencia === 'mensual' && !(Number.isInteger(c.dia) && c.dia >= 1 && c.dia <= 31)) throw new Error('El día debe ir de 1 a 31.')
    if (['unico', 'anual'].includes(c.frecuencia) && !ISO.test(c.fecha || '')) throw new Error('Falta la fecha.')
    if (c.hasta && !ISO.test(c.hasta)) throw new Error('Fecha "hasta" inválida.')
    if (c.frecuencia !== 'mensual') c.dia = null
    if (!['unico', 'anual'].includes(c.frecuencia)) c.fecha = null
    return { id: await guardarCompromisoRepo(c) }
  } catch (e) { return fallo(e) }
}

export async function desactivarCompromiso(id) {
  try {
    await requireCurrentCaja()
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) throw new Error('Compromiso inválido.')
    await desactivarCompromisoRepo(Number(id))
    return { ok: true }
  } catch (e) { return fallo(e) }
}

export async function guardarAjusteSemana(input) {
  try {
    await requireCurrentCaja()
    const empresa = EMPRESAS.includes(input?.empresa) ? input.empresa : null
    const semana = ISO.test(input?.semana || '') && lunesDe(input.semana) === input.semana ? input.semana : null
    if (!empresa || !semana) throw new Error('Empresa o semana inválida.')
    const ingreso = input?.ingreso === null || input?.ingreso === '' ? null : Number(input.ingreso)
    if (ingreso !== null && !(Number.isFinite(ingreso) && ingreso >= 0)) throw new Error('El ingreso debe ser 0 o más.')
    await guardarAjusteRepo({ empresa, semana, ingreso, nota: input?.nota ? texto(input.nota, 200) : null })
    return { ok: true }
  } catch (e) { return fallo(e) }
}
