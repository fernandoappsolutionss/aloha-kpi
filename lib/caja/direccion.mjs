import { isMaster } from '../current-user.mjs'
import { diasEntre, lunesDe, sumarDias } from './semanas.mjs'
import { FORMULAS } from '../condiciones/formulas.mjs'

export const esDirectoraCaja = (u) => u?.rol === 'coordinador' && String(u?.email || '').trim().toLowerCase() === 'admin@alohapanama.com'
export const puedeDirigirCaja = (u) => isMaster(u) || esDirectoraCaja(u)
export const asignacionesOficio = (u) => esDirectoraCaja(u) ? ['direccion-caja'] : []
export const TIPOS_ACCION = Object.freeze({ cobro: 'Recuperar cobros', ahorro: 'Reducir costos', reprogramacion: 'Reprogramar con acuerdo', operacion: 'Operación presupuestada', fuera_presupuesto: 'Pago fuera de presupuesto', nuevo_compromiso: 'Nuevo compromiso', credito: 'Uso de crédito' })
export const ES_EXCEPCION = new Set(['fuera_presupuesto', 'nuevo_compromiso', 'credito'])
export const CHECKS_VIERNES = Object.freeze({ extractos: 'Extractos de todas las cuentas cargados y saldos contrastados', clasificacion: 'Movimientos clasificados y traspasos sin duplicar ingresos', pagos: 'Pagos efectuados conciliados; vencimientos futuros completos', cobros: 'Cobros previstos revisados con responsable y fecha', reservas: 'Reservas, dueño y uso de línea contrastados', plan: 'Semanas de riesgo revisadas y plan de batalla preparado' })
export const CHECKS_LUNES = Object.freeze({ actualizacion: 'Datos y curva actualizados desde el cierre', rojos: 'Puntos rojos y ámbar revisados por empresa', decisiones: 'Acciones, responsables, fechas y excepciones revisados' })
export const CONDICIONES_CAJA = ['sin_asignar', 'inexistencia', 'peligro:superior', 'emergencia', 'normal', 'afluencia:financiera']
export function viernesCiclo(hoy) {
  const viernes = sumarDias(lunesDe(hoy), 4)
  return viernes > hoy ? sumarDias(viernes, -7) : viernes
}
export function calidadCaja(cuentas, pendientes, hoy) {
  const operativas = cuentas.filter(c => ['operativa', 'recaudadora'].includes(c.tipo))
  const problemas = operativas.flatMap(c => !c.base_fecha || c.base == null
    ? [`${c.nombre}: falta saldo bancario.`]
    : c.base_fecha > hoy ? [`${c.nombre}: saldo con fecha futura.`]
      : diasEntre(c.base_fecha, hoy) > 7 ? [`${c.nombre}: saldo de hace ${diasEntre(c.base_fecha, hoy)} días.`] : [])
  if (!operativas.length) problemas.push('No hay cuentas operativas registradas.')
  if (pendientes > 0) problemas.push(`${pendientes} movimientos por clasificar.`)
  return { confiable: problemas.length === 0, problemas }
}
export function diagnosticoCaja(curva) {
  return curva.semanas.map((s, i, todas) => ({
    semana: s.lunes, disponible: s.disponible, semaforo: s.semaforo,
    caida: i > 0 && s.disponible < todas[i - 1].disponible,
    variacion: i ? Math.round((s.disponible - todas[i - 1].disponible) * 100) / 100 : null,
    faltaParaCero: Math.max(0, -s.disponible),
    faltaParaPiso: Math.round(Math.max(0, curva.piso - s.disponible) * 100) / 100,
    excedeLinea: s.lineaExcedida,
  }))
}
const fecha = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) && new Date(v).toISOString().slice(0, 10) === v
function texto(v, max, obligatorio = false) {
  if (typeof v !== 'string' || v.length > max || (obligatorio && !v.trim())) throw new Error('Completa los textos requeridos y respeta su longitud máxima.')
  return v.trim()
}
export function validarPlanCaja(input, previo, usuario, hoy) {
  if (!puedeDirigirCaja(usuario)) throw new Error('Solo Dirección Operativa y Master pueden registrar este plan.')
  if (!input || !['altavia', 'ff'].includes(input.empresa)) throw new Error('Selecciona una empresa; el consolidado es de consulta.')
  if (!fecha(input.ciclo) || viernesCiclo(input.ciclo) !== input.ciclo || input.ciclo > hoy) throw new Error('El ciclo debe comenzar un viernes que ya llegó.')
  if (!Number.isInteger(input.version) || input.version < 0) throw new Error('Versión inválida; recarga el plan.')
  const d = input.documento
  if (!d || !Array.isArray(d.acciones) || d.acciones.length > 50) throw new Error('El plan admite hasta 50 acciones.')
  if (!CONDICIONES_CAJA.includes(d.condicion)) throw new Error('Condición inválida.')
  const fundamento = texto(d.fundamento, 4000, d.condicion !== 'sin_asignar')
  const formula = FORMULAS[d.condicion] || []
  const ids = new Set()
  const acciones = d.acciones.map(a => {
    if (typeof a.id !== 'string' || !/^[a-zA-Z0-9-]{1,64}$/.test(a.id) || ids.has(a.id)) throw new Error('Identificadores de acciones inválidos o repetidos.')
    ids.add(a.id)
    if (!Object.hasOwn(TIPOS_ACCION, a.tipo) || !['pendiente','en_curso','hecho','cancelada'].includes(a.estado)) throw new Error('Tipo o estado de acción inválido.')
    if (!fecha(a.fecha) || !fecha(a.semana) || lunesDe(a.semana) !== a.semana) throw new Error('Indica fecha límite y lunes de la semana afectada.')
    if (typeof a.monto !== 'number' || !Number.isFinite(a.monto) || a.monto < 0 || a.monto > 100000000) throw new Error('Monto inválido.')
    if (!Number.isInteger(a.paso) || a.paso < 0 || a.paso > formula.length) throw new Error('Paso de fórmula inválido.')
    const anterior = previo?.acciones?.find(x => x.id === a.id)
    if (anterior && ES_EXCEPCION.has(anterior.tipo) && !ES_EXCEPCION.has(a.tipo) && !isMaster(usuario)) throw new Error('Master debe revisar el cambio de una excepción a una facultad ordinaria.')
    const contenido = { id: a.id, tipo: a.tipo, objetivo: texto(a.objetivo, 600, true), responsable: texto(a.responsable, 120, true), fecha: a.fecha, semana: a.semana, monto: Math.round(a.monto * 100) / 100, paso: a.paso }
    const cambio = !anterior || Object.keys(contenido).some(k => contenido[k] !== anterior[k])
    // Una autorización no se hereda si se cambia el monto, destino, fecha o propósito.
    let aprobacion = ES_EXCEPCION.has(a.tipo) ? (cambio ? 'pendiente' : anterior.aprobacion) : 'facultad_actual'
    let aprobador = cambio ? null : anterior?.aprobador || null
    if (ES_EXCEPCION.has(a.tipo) && isMaster(usuario) && ['aprobada','rechazada'].includes(a.decision)) {
      aprobacion = a.decision
      aprobador = { id: usuario.id, nombre: usuario.nombre, fecha: hoy }
    }
    if (ES_EXCEPCION.has(a.tipo) && a.estado !== 'pendiente' && a.estado !== 'cancelada' && aprobacion !== 'aprobada') throw new Error('La excepción necesita aprobación de Master antes de ejecutarse.')
    return { ...contenido, estado: a.estado, evidencia: texto(a.evidencia, 1500, a.estado === 'hecho'), aprobacion, aprobador }
  })
  // Las acciones quedan en la bitácora: se cancelan con motivo, no se borran.
  if (previo?.acciones?.some(a => !ids.has(a.id))) throw new Error('Conserva las acciones anteriores; puedes marcarlas como canceladas y explicar el motivo.')
  for (const a of acciones) if (a.estado === 'cancelada' && !a.evidencia) throw new Error('Explica el motivo de cancelación.')
  const checks = (value, keys) => Object.fromEntries(Object.keys(keys).map(k => [k, value?.[k] === true]))
  return { condicion: d.condicion, fundamento, soportes: texto(d.soportes, 4000), bitacora: texto(d.bitacora, 6000, true), viernes: checks(d.viernes, CHECKS_VIERNES), lunes: checks(d.lunes, CHECKS_LUNES), acciones }
}
export function validarRitual(tipo, documento, contexto) {
  if (tipo === 'guardar') return
  if (!['cerrar_viernes','revisar_lunes'].includes(tipo)) throw new Error('Operación desconocida.')
  const { cuentas, pendientes, hoy, ciclo, cierre } = contexto
  if (tipo === 'revisar_lunes') {
    if (!cierre) throw new Error('Primero registra el cierre del viernes.')
    if (hoy < sumarDias(ciclo, 3)) throw new Error('La revisión del lunes se registra a partir del lunes siguiente al cierre.')
  }
  const calidad = calidadCaja(cuentas, pendientes, hoy)
  if (!calidad.confiable) throw new Error(`Actualiza la caja antes de completar el ritual: ${calidad.problemas.join(' ')}`)
  const sinCorte = cuentas.filter(c => ['operativa','recaudadora'].includes(c.tipo) && c.base_fecha < ciclo)
  if (sinCorte.length) throw new Error('Faltan saldos bancarios al menos al viernes del ciclo.')
  const checks = tipo === 'cerrar_viernes' ? documento.viernes : documento.lunes
  if (!Object.values(checks).every(Boolean) || !documento.soportes || !documento.acciones.length) throw new Error('Completa la lista, las referencias de soporte y al menos una acción del plan.')
  if (documento.condicion !== 'sin_asignar') {
    const formula = FORMULAS[documento.condicion] || []
    if (formula.some((_, i) => !documento.acciones.some(a => a.paso === i + 1 && a.estado !== 'cancelada'))) throw new Error('Escribe un objetivo concreto para cada paso de la fórmula, en su orden.')
  }
}
