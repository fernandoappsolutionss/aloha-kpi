'use server'
import { sql, upsert } from '../../lib/db'
import { requireCentroAccess } from '../../lib/auth'
import { ITINERARIOS, PRODUCTOS_MATERIAL } from '../../lib/operaciones'
import { motivosParaKpi, cuadroControlGrupos, cuadroDeserciones } from '../../lib/cuadro-calc'
import { armarGrupos, calcularCuadro, guardarSnapshotCuadro, leerSnapshotCuadro } from '../../lib/cuadro-snapshot'

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
    return {
      nombre: c.nombre || '',
      ...snap.datos,
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
// grupos activos, nuevos del mes y motivos de deserción. No toca kpi_semanas
// ni los campos de clase de prueba, y respeta el candado del mes cerrado.
export async function sincronizarConKpi(centroId, year, month) {
  await requireCentroAccess(centroId)
  const y = intOr(year)
  const m = intOr(month)
  if (!mesValido(y, m)) return { error: 'Mes inválido.' }
  const [mes] = await sql`SELECT estado FROM mes_kpi WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}`
  if (mes?.estado === 'cerrado') return { error: 'Este mes está cerrado. Reábrelo en KPI Semanal para poder sincronizar.' }

  const grupos = await armarGrupos(centroId)
  const estudiantes = await sql`SELECT * FROM estudiantes WHERE centro_id = ${centroId}`
  const eventos = await sql`
    SELECT * FROM estudiante_eventos
    WHERE centro_id = ${centroId} AND year = ${y} AND month = ${m}
  `
  const control = cuadroControlGrupos(grupos, estudiantes, eventos)
  // motivosParaKpi devuelve exactamente las 6 columnas mot_* de resumen_mes.
  const motivos = motivosParaKpi(cuadroDeserciones(estudiantes, eventos, grupos))

  const aplicado = {
    grupos_activos: control.totales.gruposActivos,
    nuevos_activos_mes: control.totales.nuevos,
    mot_tecnica: motivos.mot_tecnica,
    mot_perdida_clase: motivos.mot_perdida_clase,
    mot_economico: motivos.mot_economico,
    mot_horario: motivos.mot_horario,
    mot_graduado: motivos.mot_graduado,
    mot_otro: motivos.mot_otro,
  }
  await upsert('resumen_mes', {
    centro_id: centroId, year: y, month: m,
    ...aplicado,
    updated_at: new Date().toISOString(),
  }, ['centro_id', 'year', 'month'])
  return { ok: true, aplicado }
}
