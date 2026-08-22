'use server'
// Conciliador bancario ↔ Zoho Books.
//
// Flujo: se adjunta el CSV del banco → se leen las líneas, se clasifican con
// las reglas y se cruzan contra lo que Zoho ya tiene en esa cuenta → se revisa
// en pantalla → se publica en Zoho lo que quedó como "nuevo".
//
// Ninguna acción lanza excepción hacia la UI (Next oculta el mensaje en
// producción): todas devuelven { error } legible, como el resto del panel.
import { requireCurrentUser } from '../../lib/auth'
import { ADMIN_ROLES } from '../../lib/current-user.mjs'
import { fallo } from '../../lib/errores'
import * as repo from '../../lib/conciliacion-repository'
import {
  zohoConfigurado,
  listarOrganizaciones,
  listarCuentasBancarias,
  listarCuentasContables,
  listarTransaccionesBancarias,
  crearTransaccionBancaria,
  ESPACIADO_MS,
} from '../../lib/zoho'
import { analizarExtracto, LIMITE_MOVIMIENTOS } from '../../lib/conciliacion/index.mjs'
import { conciliar, resumenLote } from '../../lib/conciliacion/conciliar.mjs'
import { reglaValida, MODOS, DIRECCIONES } from '../../lib/conciliacion/reglas.mjs'
import { payloadBancario } from '../../lib/conciliacion/zoho-payload.mjs'
import { fechaISO } from '../../lib/conciliacion/fecha-db.mjs'

// Tope del texto que llega en la server action. Un extracto mensual de una
// cuenta corriente ronda los 50 KB; 2 MB deja margen de sobra y corta el caso
// del archivo equivocado (un respaldo entero, por ejemplo).
const LIMITE_TEXTO = 2 * 1024 * 1024
// Presupuesto de una tanda de publicación. La función serverless se corta
// sola, así que se devuelve el avance y la UI ofrece continuar.
const PRESUPUESTO_MS = 45000

const esAdmin = (user) => ADMIN_ROLES.has(user.rol)

// Una cuenta corporativa (centro_id NULL) es solo de admin. Una cuenta de
// centro la ve ese centro y cualquier admin.
async function cuentaAccesible(user, cuentaId) {
  const cuenta = await repo.obtenerCuenta(cuentaId)
  if (!cuenta) throw new Error('La cuenta bancaria no existe o fue eliminada.')
  if (esAdmin(user)) return cuenta
  if (cuenta.centro_id === null) throw new Error('No autorizado para esta cuenta.')
  if (String(cuenta.centro_id) !== String(user.centro_id)) throw new Error('No autorizado para esta cuenta.')
  return cuenta
}

const dormir = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// ── Estado de la integración ─────────────────────────────────────────────────

export async function estadoConciliador() {
  try {
    const user = await requireCurrentUser()
    return {
      configurado: zohoConfigurado(),
      admin: esAdmin(user),
      centro_id: user.centro_id ?? null,
      limite_movimientos: LIMITE_MOVIMIENTOS,
    }
  } catch (e) {
    return fallo('estadoConciliador', e)
  }
}

// ── Catálogos de Zoho (para armar el mapeo y las reglas) ─────────────────────

export async function catalogoOrganizaciones() {
  try {
    const user = await requireCurrentUser()
    if (!esAdmin(user)) throw new Error('No autorizado')
    if (!zohoConfigurado()) return { error: 'Zoho no está configurado en este entorno.' }
    return { organizaciones: await listarOrganizaciones() }
  } catch (e) {
    return fallo('catalogoOrganizaciones', e)
  }
}

export async function catalogoCuentasBancarias(orgId) {
  try {
    const user = await requireCurrentUser()
    if (!esAdmin(user)) throw new Error('No autorizado')
    if (!zohoConfigurado()) return { error: 'Zoho no está configurado en este entorno.' }
    return { cuentas: await listarCuentasBancarias(String(orgId)) }
  } catch (e) {
    return fallo('catalogoCuentasBancarias', e)
  }
}

// Catálogo contable de una organización. Solo admin: es el que se necesita
// para armar el mapeo, cuando la cuenta todavía no existe en el KPI.
export async function catalogoCuentasContablesDeOrg(orgId) {
  try {
    const user = await requireCurrentUser()
    if (!esAdmin(user)) throw new Error('No autorizado')
    if (!zohoConfigurado()) return { error: 'Zoho no está configurado en este entorno.' }
    return { cuentas: await listarCuentasContables(String(orgId)) }
  } catch (e) {
    return fallo('catalogoCuentasContablesDeOrg', e)
  }
}

// Cuentas contables destino. Se piden POR CUENTA MAPEADA y no por org suelta,
// para que un usuario de centro solo pueda mirar el catálogo de la
// organización con la que efectivamente trabaja.
export async function catalogoCuentasContables(cuentaId) {
  try {
    const user = await requireCurrentUser()
    const cuenta = await cuentaAccesible(user, cuentaId)
    if (!zohoConfigurado()) return { error: 'Zoho no está configurado en este entorno.' }
    return { cuentas: await listarCuentasContables(cuenta.zoho_org_id) }
  } catch (e) {
    return fallo('catalogoCuentasContables', e)
  }
}

// ── Mapeo centro ↔ cuenta de Zoho ────────────────────────────────────────────

export async function misCuentas() {
  try {
    const user = await requireCurrentUser()
    const cuentas = esAdmin(user)
      ? await repo.listarCuentas({})
      : await repo.listarCuentas({ centroId: user.centro_id, soloActivas: true })
    return { cuentas }
  } catch (e) {
    return fallo('misCuentas', e)
  }
}

export async function guardarCuenta(datos) {
  try {
    const user = await requireCurrentUser()
    if (!esAdmin(user)) throw new Error('No autorizado')
    const etiqueta = String(datos?.etiqueta || '').trim()
    if (!etiqueta) return { error: 'Ponle un nombre a la cuenta (por ejemplo "Banco General — Calle 50").' }
    if (!datos?.zoho_org_id || !datos?.zoho_account_id) {
      return { error: 'Falta elegir la organización y la cuenta bancaria de Zoho.' }
    }
    const fila = datos.id
      ? await repo.actualizarCuenta(datos.id, { ...datos, etiqueta })
      : await repo.crearCuenta({ ...datos, etiqueta })
    if (!fila) return { error: 'No se encontró la cuenta que se intentaba actualizar.' }
    return { cuenta: fila }
  } catch (e) {
    // 23505 = esa cuenta de Zoho ya está mapeada. Dejar dos filas apuntando al
    // mismo banco partiría el historial de huellas en dos y el mismo
    // movimiento podría publicarse por ambas.
    if (e?.code === '23505') {
      return { error: 'Esa cuenta bancaria de Zoho ya está asignada a un centro. Edita la asignación existente en vez de crear otra.' }
    }
    return fallo('guardarCuenta', e)
  }
}

export async function eliminarCuenta(id) {
  try {
    const user = await requireCurrentUser()
    if (!esAdmin(user)) throw new Error('No autorizado')
    await repo.eliminarCuenta(id)
    return { ok: true }
  } catch (e) {
    return fallo('eliminarCuenta', e)
  }
}

// ── Reglas de clasificación ──────────────────────────────────────────────────

export async function reglasDeCuenta(cuentaId) {
  try {
    const user = await requireCurrentUser()
    const cuenta = await cuentaAccesible(user, cuentaId)
    const reglas = await repo.listarReglas(cuenta.zoho_org_id)
    // Un usuario de centro solo ve (y toca) las reglas que le aplican.
    const visibles = esAdmin(user)
      ? reglas
      : reglas.filter((r) => r.cuenta_id === null || Number(r.cuenta_id) === Number(cuenta.id))
    return { reglas: visibles, admin: esAdmin(user) }
  } catch (e) {
    return fallo('reglasDeCuenta', e)
  }
}

export async function guardarRegla(cuentaId, datos) {
  try {
    const user = await requireCurrentUser()
    const cuenta = await cuentaAccesible(user, cuentaId)

    // Una regla general (cuenta_id NULL) toca TODAS las cuentas de la
    // organización, incluidas las de otros centros: eso es de admin. El
    // usuario de centro crea reglas atadas a su propia cuenta.
    const general = Boolean(datos?.general) && esAdmin(user)
    const regla = {
      zoho_org_id: cuenta.zoho_org_id,
      cuenta_id: general ? null : Number(cuenta.id),
      patron: String(datos?.patron || '').trim().slice(0, 200),
      modo: MODOS.includes(datos?.modo) ? datos.modo : 'contiene',
      direccion: DIRECCIONES.includes(datos?.direccion) ? datos.direccion : 'ambas',
      zoho_account_id: String(datos?.zoho_account_id || '').trim(),
      zoho_account_nombre: datos?.zoho_account_nombre || null,
      prioridad: Number(datos?.prioridad ?? 0) || 0,
      activa: datos?.activa !== false,
      creado_por: user.id,
    }
    if (!reglaValida(regla)) {
      return { error: 'La regla necesita un texto a buscar y una cuenta contable de destino.' }
    }

    if (datos?.id) {
      const existentes = await repo.listarReglas(cuenta.zoho_org_id)
      const actual = existentes.find((r) => Number(r.id) === Number(datos.id))
      if (!actual) return { error: 'La regla ya no existe.' }
      if (!esAdmin(user) && actual.cuenta_id === null) {
        return { error: 'Esa regla es general de la organización; solo un administrador puede cambiarla.' }
      }
      const fila = await repo.actualizarRegla(datos.id, regla)
      return { regla: fila }
    }
    return { regla: await repo.crearRegla(regla) }
  } catch (e) {
    return fallo('guardarRegla', e)
  }
}

export async function eliminarRegla(cuentaId, reglaId) {
  try {
    const user = await requireCurrentUser()
    const cuenta = await cuentaAccesible(user, cuentaId)
    const existentes = await repo.listarReglas(cuenta.zoho_org_id)
    const actual = existentes.find((r) => Number(r.id) === Number(reglaId))
    if (!actual) return { ok: true }
    if (!esAdmin(user) && (actual.cuenta_id === null || Number(actual.cuenta_id) !== Number(cuenta.id))) {
      return { error: 'Solo un administrador puede borrar esa regla.' }
    }
    await repo.eliminarRegla(reglaId)
    return { ok: true }
  } catch (e) {
    return fallo('eliminarRegla', e)
  }
}

// ── Carga del extracto ───────────────────────────────────────────────────────

// Trae de Zoho lo que ya existe en la cuenta para el período del extracto,
// ampliado por la tolerancia (un movimiento del 1 de agosto puede estar
// asentado el 30 de julio).
async function transaccionesDelPeriodo(cuenta, periodo) {
  if (!zohoConfigurado() || !periodo?.desde) return { transacciones: [], aviso: null }
  const dias = Number(cuenta.tolerancia_dias ?? 3)
  const corre = (iso, delta) => {
    const d = new Date(`${iso}T00:00:00Z`)
    d.setUTCDate(d.getUTCDate() + delta)
    return d.toISOString().slice(0, 10)
  }
  try {
    const transacciones = await listarTransaccionesBancarias(cuenta.zoho_org_id, {
      accountId: cuenta.zoho_account_id,
      desde: corre(periodo.desde, -dias),
      hasta: corre(periodo.hasta || periodo.desde, dias),
    })
    return { transacciones, aviso: null }
  } catch (e) {
    // Que Zoho no conteste no puede tumbar la lectura del archivo: se guarda
    // el lote sin conciliar y se avisa, porque publicar sin haber comparado
    // sí duplicaría asientos.
    console.error('[conciliacion] no se pudo leer Zoho:', e)
    return { transacciones: [], aviso: `No se pudo consultar Zoho para comparar (${e.message}). Vuelve a conciliar antes de publicar.` }
  }
}

export async function subirExtracto({ cuentaId, archivo, texto }) {
  try {
    const user = await requireCurrentUser()
    const cuenta = await cuentaAccesible(user, cuentaId)
    if (!cuenta.activa) return { error: 'Esa cuenta está inactiva. Actívala antes de conciliar.' }

    const contenido = String(texto || '')
    if (!contenido.trim()) return { error: 'El archivo llegó vacío.' }
    if (contenido.length > LIMITE_TEXTO) {
      return { error: 'El archivo pesa demasiado. Sube el extracto de un mes a la vez.' }
    }

    const reglas = await repo.listarReglasDeCuenta(cuenta)
    const defaults = {
      cuenta_ingreso_id: cuenta.cuenta_ingreso_id,
      cuenta_ingreso_nombre: cuenta.cuenta_ingreso_nombre,
      cuenta_gasto_id: cuenta.cuenta_gasto_id,
      cuenta_gasto_nombre: cuenta.cuenta_gasto_nombre,
    }

    // Primera pasada: solo para conocer el período que cubre el archivo.
    const previo = analizarExtracto(contenido, { reglas, defaults })
    if (previo.error) return { error: previo.error }

    const { transacciones, aviso } = await transaccionesDelPeriodo(cuenta, previo.periodo)
    const huellas = await repo.huellasDeCuenta(cuenta.id)

    const analisis = analizarExtracto(contenido, {
      reglas,
      defaults,
      transaccionesZoho: transacciones,
      huellasPrevias: huellas,
      toleranciaDias: Number(cuenta.tolerancia_dias ?? 3),
    })
    if (analisis.error) return { error: analisis.error }

    // Al duplicado se le dice de dónde viene: sin eso, "ya importado" obliga a
    // buscar a mano en qué carga anterior quedó.
    const movimientos = analisis.movimientos.map((m) => {
      if (m.estado !== 'duplicado') return m
      const previoMov = huellas.get(m.huella)
      return previoMov ? { ...m, nota: `Ya se importó en la carga #${previoMov.lote_id}.` } : m
    })

    const avisos = []
    if (aviso) avisos.push(aviso)
    if (!zohoConfigurado()) avisos.push('Zoho no está configurado: se leyó el archivo pero no se pudo comparar ni publicar.')
    if (analisis.descartadas.length) {
      avisos.push(`Se ignoraron ${analisis.descartadas.length} línea(s) sin fecha o sin monto (encabezados y totales del extracto).`)
    }
    if (analisis.resumen.sin_clasificar) {
      avisos.push(`${analisis.resumen.sin_clasificar} movimiento(s) sin cuenta contable: asígnalos o define una regla antes de publicar.`)
    }

    const lote = await repo.crearLote({
      cuenta,
      archivo: String(archivo || 'extracto.csv').slice(0, 200),
      periodo: analisis.periodo,
      resumen: analisis.resumen,
      avisos,
      usuarioId: user.id,
      movimientos,
    })

    return {
      lote_id: lote.id,
      resumen: analisis.resumen,
      avisos,
      descartadas: analisis.descartadas.slice(0, 20),
      columnas: analisis.columnas,
    }
  } catch (e) {
    return fallo('subirExtracto', e)
  }
}

// ── Consulta ─────────────────────────────────────────────────────────────────

export async function lotesDeCuenta(cuentaId) {
  try {
    const user = await requireCurrentUser()
    const cuenta = await cuentaAccesible(user, cuentaId)
    return { lotes: await repo.listarLotes(cuenta.id) }
  } catch (e) {
    return fallo('lotesDeCuenta', e)
  }
}

async function loteAccesible(user, loteId) {
  const lote = await repo.obtenerLote(loteId)
  if (!lote) throw new Error('La carga no existe o fue eliminada.')
  const cuenta = await cuentaAccesible(user, lote.cuenta_id)
  return { lote, cuenta }
}

export async function verLote(loteId) {
  try {
    const user = await requireCurrentUser()
    const { lote, cuenta } = await loteAccesible(user, loteId)
    const movimientos = await repo.movimientosDeLote(lote.id)
    return { lote, cuenta, movimientos, resumen: resumenLote(movimientos) }
  } catch (e) {
    return fallo('verLote', e)
  }
}

export async function borrarLote(loteId) {
  try {
    const user = await requireCurrentUser()
    const { lote } = await loteAccesible(user, loteId)
    const movimientos = await repo.movimientosDeLote(lote.id)
    // Borrar una carga con movimientos ya publicados dejaría a Zoho con
    // asientos que el KPI ya no reconoce: la próxima carga del mismo archivo
    // los volvería a proponer como nuevos.
    if (movimientos.some((m) => m.estado === 'publicado')) {
      return { error: 'Esta carga ya tiene movimientos publicados en Zoho y no se puede borrar.' }
    }
    await repo.eliminarLote(lote.id)
    return { ok: true }
  } catch (e) {
    return fallo('borrarLote', e)
  }
}

// ── Ajustes manuales sobre un movimiento ─────────────────────────────────────

export async function clasificarMovimiento(movimientoId, { zoho_account_id, zoho_account_nombre }) {
  try {
    const user = await requireCurrentUser()
    const actual = await repo.obtenerMovimiento(movimientoId)
    if (!actual) return { error: 'El movimiento ya no existe.' }
    await cuentaAccesible(user, actual.cuenta_id)
    if (['publicado', 'publicando'].includes(actual.estado)) {
      return { error: 'Ese movimiento ya está en Zoho; cámbialo desde Zoho.' }
    }
    // Asignarle cuenta a un movimiento ya conciliado lo devolvería a "nuevo" y
    // habilitaría registrarlo por segunda vez. Si de verdad hay que forzarlo,
    // el camino es volver a conciliar y ver por qué Zoho lo dio por existente.
    if (['ya_en_zoho', 'duplicado'].includes(actual.estado)) {
      return { error: 'Ese movimiento ya está conciliado; no hace falta asignarle cuenta.' }
    }
    if (!String(zoho_account_id || '').trim()) return { error: 'Elige una cuenta contable.' }
    const fila = await repo.actualizarEstadoMovimiento(movimientoId, {
      estado: 'nuevo',
      zoho_account_id: String(zoho_account_id),
      zoho_account_nombre: zoho_account_nombre || null,
    })
    return { movimiento: fila }
  } catch (e) {
    return fallo('clasificarMovimiento', e)
  }
}

export async function ignorarMovimiento(movimientoId, ignorar = true) {
  try {
    const user = await requireCurrentUser()
    const actual = await repo.obtenerMovimiento(movimientoId)
    if (!actual) return { error: 'El movimiento ya no existe.' }
    await cuentaAccesible(user, actual.cuenta_id)
    if (['publicado', 'publicando'].includes(actual.estado)) {
      return { error: 'Ese movimiento ya está en Zoho.' }
    }
    const estado = ignorar ? 'ignorado' : (actual.zoho_account_id ? 'nuevo' : 'sin_clasificar')
    const fila = await repo.actualizarEstadoMovimiento(movimientoId, { estado })
    return { movimiento: fila }
  } catch (e) {
    return fallo('ignorarMovimiento', e)
  }
}

// ── Volver a conciliar contra Zoho ───────────────────────────────────────────

// Reevalúa los movimientos pendientes contra el estado actual de Zoho. Es
// también la vía de recuperación: si una publicación se cortó a la mitad, la
// fila quedó en 'publicando' y aquí se descubre si el asiento alcanzó a
// crearse (queda conciliado) o no (vuelve a quedar pendiente).
export async function reconciliarLote(loteId) {
  try {
    const user = await requireCurrentUser()
    const { lote, cuenta } = await loteAccesible(user, loteId)
    return await reconciliarInterno(lote, cuenta)
  } catch (e) {
    return fallo('reconciliarLote', e)
  }
}

async function reconciliarInterno(lote, cuenta) {
  if (!zohoConfigurado()) return { error: 'Zoho no está configurado en este entorno.' }

  const movimientos = await repo.movimientosDeLote(lote.id)
  const pendientes = movimientos.filter((m) => ['nuevo', 'sin_clasificar', 'publicando', 'error'].includes(m.estado))
  if (!pendientes.length) return { ok: true, resumen: resumenLote(movimientos), cambios: 0 }

  const { transacciones, aviso } = await transaccionesDelPeriodo(cuenta, {
    desde: fechaISO(lote.periodo_desde),
    hasta: fechaISO(lote.periodo_hasta),
  })
  if (aviso) return { error: aviso }

  // Lo ya publicado o conciliado ocupa su transacción de Zoho: se saca de
  // las candidatas para no "conciliar" dos veces contra el mismo asiento.
  const tomadas = new Set(movimientos.filter((m) => m.zoho_transaction_id).map((m) => String(m.zoho_transaction_id)))
  const disponibles = transacciones.filter((t) => !tomadas.has(String(t.transaction_id ?? t.banktransaction_id ?? '')))

  const entrada = pendientes.map((m) => ({
    ...m,
    monto: Number(m.monto),
    fecha: fechaISO(m.fecha),
    estado: m.estado === 'publicando' || m.estado === 'error' ? 'nuevo' : m.estado,
  }))
  const resultado = conciliar(entrada, disponibles, { toleranciaDias: Number(cuenta.tolerancia_dias ?? 3) })

  let cambios = 0
  for (let i = 0; i < resultado.length; i++) {
    const antes = pendientes[i]
    const despues = resultado[i]
    const estadoFinal = despues.estado === 'nuevo' && !despues.zoho_account_id ? 'sin_clasificar' : despues.estado
    if (estadoFinal === antes.estado && (despues.zoho_transaction_id || null) === (antes.zoho_transaction_id || null)) continue
    await repo.refrescarConciliacion(antes.id, {
      estado: estadoFinal,
      zohoTransactionId: despues.zoho_transaction_id || null,
      nota: despues.nota || null,
    })
    cambios++
  }

  const actualizados = await repo.movimientosDeLote(lote.id)
  const resumen = resumenLote(actualizados)
  await repo.guardarResumenLote(lote.id, { resumen, estado: estadoDeLote(resumen) })
  return { ok: true, resumen, cambios }
}

// 'conciliado' significa "no queda nada por hacer con esta carga", que no es lo
// mismo que "se publicó todo": un extracto entero que Zoho ya tenía cierra sin
// haber creado un solo asiento.
function estadoDeLote(resumen) {
  if (resumen.nuevos === 0 && resumen.sin_clasificar === 0 && resumen.errores === 0) return 'conciliado'
  if (resumen.publicados > 0) return 'parcial'
  return 'borrador'
}

// ── Publicación en Zoho ──────────────────────────────────────────────────────

export async function publicarLote(loteId) {
  try {
    const user = await requireCurrentUser()
    const { lote, cuenta } = await loteAccesible(user, loteId)
    if (!zohoConfigurado()) return { error: 'Zoho no está configurado en este entorno.' }

    // Se vuelve a comparar contra Zoho ANTES de escribir, siempre. Si la
    // comparación de la carga falló (Zoho caído en ese momento) o alguien
    // asentó el movimiento a mano desde entonces, publicar sin este paso
    // duplicaría el asiento. Que la comparación falle aborta la tanda: es
    // preferible no registrar nada a registrar dos veces.
    const previo = await reconciliarInterno(lote, cuenta)
    if (previo?.error) return { error: previo.error }

    const movimientos = await repo.movimientosDeLote(lote.id)
    const porPublicar = movimientos.filter((m) => m.estado === 'nuevo' && m.zoho_account_id)
    if (!porPublicar.length) {
      const resumen = resumenLote(movimientos)
      await repo.guardarResumenLote(lote.id, { resumen, estado: estadoDeLote(resumen) })
      return { ok: true, publicados: 0, fallidos: 0, pendientes: 0, resumen }
    }

    const inicio = Date.now()
    let publicados = 0
    let fallidos = 0
    let cortadoPor = null

    for (let i = 0; i < porPublicar.length; i++) {
      if (Date.now() - inicio > PRESUPUESTO_MS) { cortadoPor = 'tiempo'; break }
      const mov = porPublicar[i]

      const reclamado = await repo.reclamarMovimiento(mov.id)
      if (!reclamado) continue // otro proceso lo tomó, o ya estaba publicado

      try {
        const payload = payloadBancario({
          fecha: fechaISO(reclamado.fecha),
          descripcion: reclamado.descripcion,
          referencia: reclamado.referencia,
          monto: Number(reclamado.monto),
          direccion: reclamado.direccion,
          zoho_account_id: reclamado.zoho_account_id,
          transaction_type: reclamado.transaction_type,
        }, cuenta.zoho_account_id)
        const transactionId = await crearTransaccionBancaria(cuenta.zoho_org_id, payload)
        await repo.marcarPublicado(reclamado.id, transactionId)
        publicados++
      } catch (e) {
        await repo.marcarError(reclamado.id, e.message)
        fallidos++
        // El 429 corta la tanda: seguir empujando solo consigue más rechazos.
        if (/limitando las llamadas/i.test(e.message)) { cortadoPor = 'limite'; break }
      }

      if (i < porPublicar.length - 1) await dormir(ESPACIADO_MS)
    }

    const actualizados = await repo.movimientosDeLote(lote.id)
    const resumen = resumenLote(actualizados)
    await repo.guardarResumenLote(lote.id, { resumen, estado: estadoDeLote(resumen) })

    return {
      ok: true,
      publicados,
      fallidos,
      pendientes: resumen.nuevos,
      cortadoPor,
      resumen,
    }
  } catch (e) {
    return fallo('publicarLote', e)
  }
}
