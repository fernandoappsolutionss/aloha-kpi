'use server'
import { sql, upsertWith, withTransaction } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { ITINERARIOS, PRODUCTOS_MATERIAL } from '../../lib/operaciones'
import { motivosParaKpi } from '../../lib/cuadro-calc'
import { calcularCuadro, guardarSnapshotCuadro, leerSnapshotCuadro } from '../../lib/cuadro-snapshot'
import { balanceMensual, usaIniciosClaseOperativos } from '../../lib/inicios-clase.mjs'
import { cierreMesAnterior } from '../../lib/cadena'
import { bloquearMesesEditables } from '../../lib/mes-kpi'

const intOr = (v, d = 0) => {
  const n = parseInt(v)
  return Number.isFinite(n) ? n : d
}

const mesValido = (y, m) => y >= 2000 && y <= 2100 && m >= 1 && m <= 12

// Carga única del Cuadro de Negocio del mes: royalties, control de grupos,
// deserciones, pedidos de material, promedios y comparación con el KPI capturado.
// Mes ABIERTO → cálculo en vivo. Mes CERRADO → la foto congelada al cierre
// (si el mes se cerró antes de existir el historial, se congela la mejor foto
// disponible en ese momento y queda marcada como retroactiva).
export async function loadCuadro(centroId, year, month) {
  await requireCentroAccess(centroId)
  const y = intOr(year)
  const m = intOr(month)
  if (!mesValido(y, m)) return { error: 'Mes inválido.' }

  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${centroId}`
  if (!c) return { error: 'Centro no encontrado.' }
  const [mes] = await sql`SELECT estado FROM mes_kpi WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}`

  if (mes?.estado === 'cerrado') {
    let snap = await leerSnapshotCuadro(centroId, y, m)
    let retroactivo = false
    if (!snap) {
      const datos = await guardarSnapshotCuadro(centroId, y, m)
      snap = { datos, cerradoAt: new Date().toISOString() }
      retroactivo = true
    }
    let datos = snap.datos
    if (usaIniciosClaseOperativos(y, m) && !Array.isArray(datos.iniciosClase)) {
      try {
        const reconstruido = await calcularCuadro(centroId, y, m)
        datos = { ...datos, iniciosClase: reconstruido.iniciosClase || [] }
      } catch (e) {
        console.error('[loadCuadro] no se pudieron reconstruir los inicios de clase:', e)
        datos = { ...datos, iniciosClase: [] }
      }
    }
    return {
      nombre: c.nombre || '',
      ...datos,
      mesEstado: 'cerrado',
      congelado: true,
      congeladoAt: snap.cerradoAt,
      congeladoRetroactivo: retroactivo,
    }
  }

  const datos = await calcularCuadro(centroId, y, m)
  return { nombre: c.nombre || '', ...datos, mesEstado: 'abierto' }
}

// Crea o actualiza un pedido de material del mes (id opcional = update).
export async function savePedido(centroId, data) {
  await requireCentroAccess(centroId)
  const y = intOr(data?.year)
  const m = intOr(data?.month)
  if (!mesValido(y, m)) return { error: 'Mes inválido.' }
  const producto = data?.producto || 'KIT'
  if (!PRODUCTOS_MATERIAL.includes(producto)) return { error: 'Producto inválido.' }
  const itinerario = data?.itinerario || null
  if (itinerario && !ITINERARIOS.includes(itinerario)) return { error: 'Itinerario inválido.' }

  let grupoId = null
  if (data?.grupo_id) {
    const [g] = await sql`SELECT id FROM grupos WHERE id = ${data.grupo_id} AND centro_id = ${centroId}`
    if (!g) return { error: 'El grupo no pertenece a este centro.' }
    grupoId = g.id
  }

  const fecha = data?.fecha || null
  const numeroOe = data?.numero_oe?.trim() || null
  const nivel = data?.nivel ? intOr(data.nivel) : null
  const cantidad = intOr(data?.cantidad)
  const monto = Number(data?.monto) || 0
  const observaciones = data?.observaciones?.trim() || null
  const now = new Date().toISOString()

  if (data?.id) {
    const r = await sql`
      UPDATE pedidos_material SET
        year = ${y}, month = ${m}, fecha = ${fecha}, numero_oe = ${numeroOe},
        producto = ${producto}, itinerario = ${itinerario}, nivel = ${nivel}, grupo_id = ${grupoId},
        cantidad = ${cantidad}, monto = ${monto}, observaciones = ${observaciones}, updated_at = ${now}
      WHERE id = ${data.id} AND centro_id = ${centroId}
      RETURNING id
    `
    if (!r.length) return { error: 'Pedido no encontrado.' }
    return { ok: true, id: r[0].id }
  }

  const [nuevo] = await sql`
    INSERT INTO pedidos_material
      (centro_id, year, month, fecha, numero_oe, producto, itinerario, nivel, grupo_id, cantidad, monto, observaciones, updated_at)
    VALUES
      (${centroId}, ${y}, ${m}, ${fecha}, ${numeroOe}, ${producto}, ${itinerario}, ${nivel}, ${grupoId}, ${cantidad}, ${monto}, ${observaciones}, ${now})
    RETURNING id
  `
  return { ok: true, id: nuevo.id }
}

export async function deletePedido(centroId, id) {
  await requireCentroAccess(centroId)
  const r = await sql`DELETE FROM pedidos_material WHERE id = ${id} AND centro_id = ${centroId} RETURNING id`
  if (!r.length) return { error: 'Pedido no encontrado.' }
  return { ok: true }
}

// Vuelca al KPI mensual (resumen_mes) SOLO los campos que salen del cuadro:
// niños al inicio y al cierre del mes, grupos activos, nuevos activos y
// motivos de deserción. No toca kpi_semanas ni los campos de clase de
// prueba, y respeta el candado del mes cerrado.
export async function sincronizarConKpi(centroId, year, month) {
  await requireCentroAccess(centroId)
  const y = intOr(year)
  const m = intOr(month)
  if (!mesValido(y, m)) return { error: 'Mes inválido.' }
  if (!usaIniciosClaseOperativos(y, m)) {
    return { error: 'Los meses anteriores a agosto de 2026 conservan su captura histórica. Corrígelos desde KPI Semanal.' }
  }

  return await withTransaction(async (query) => {
    const errorMes = await bloquearMesesEditables(query, centroId, [{ year: y, month: m }])
    if (errorMes) return { error: errorMes }

    // El cálculo y el guardado ocurren bajo el mismo bloqueo mensual para que
    // ningún movimiento deje el resumen desactualizado a mitad del proceso.
    const datos = await calcularCuadro(centroId, y, m, query)
    const t = datos.controlGrupos.totales
    const motivos = motivosParaKpi(datos.deserciones)
    const arrastrado = await cierreMesAnterior(centroId, y, m, query)
    const ninosInicio = arrastrado ? arrastrado.valor : t.mesAnterior
    const nuevosActivos = datos.iniciosClase?.length ?? t.nuevos ?? 0
    const retirados = Array.isArray(datos.deserciones) ? datos.deserciones.length : (t.retirados || 0)
    const aplicado = {
      ninos_inicio_mes: ninosInicio,
      ninos_final_mes: Math.max(0, balanceMensual({
        inicio: ninosInicio,
        nuevosActivos,
        reincorporados: t.reincorporados || 0,
        retirados,
      })),
      grupos_activos: t.gruposActivos,
      nuevos_activos_mes: nuevosActivos,
      mot_tecnica: motivos.mot_tecnica,
      mot_perdida_clase: motivos.mot_perdida_clase,
      mot_economico: motivos.mot_economico,
      mot_horario: motivos.mot_horario,
      mot_graduado: motivos.mot_graduado,
      mot_otro: motivos.mot_otro,
    }
    await upsertWith(query, 'resumen_mes', {
      centro_id: centroId,
      year: y,
      month: m,
      ...aplicado,
      updated_at: new Date().toISOString(),
    }, ['centro_id', 'year', 'month'])
    return { ok: true, aplicado }
  })
}
