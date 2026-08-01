// GET /api/centro/[id]/cuadro?year=&month= — descarga el Cuadro de Negocio del
// mes en Excel (hojas ROYALTIES / CANTIDAD DE NIÑOS / NIÑOS RETIRADOS),
// replicando el formato del cuadro real que se entrega a la Junta.
import ExcelJS from 'exceljs'
import { sql } from '../../../../../lib/db'
import { getSession, isAdminRole } from '../../../../../lib/auth'
import { MOTIVOS_RETIRO_LABELS } from '../../../../../lib/operaciones'
import { cuadroRoyalties, cuadroControlGrupos, cuadroDeserciones } from '../../../../../lib/cuadro-calc'
import { leerSnapshotCuadro } from '../../../../../lib/cuadro-snapshot'

const MESES = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE']

// Redacción de la columna "Status plataforma" del cuadro real.
const STATUS_LABELS = { INCLUIR: 'INCLUIR', ACTIVO: 'ACTIVO', DESACTIVAR: 'DESACTIVAR', CAMBIAR_NIVEL: 'CAMBIAR DE NIVEL', CAMBIAR_GRUPO: 'CAMBIAR DE GRUPO' }

const FONT = { name: 'Arial', size: 10 }
const FONT_BOLD = { name: 'Arial', size: 10, bold: true }
const FILL_HEADER = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE6F1' } }
const FILL_TOTAL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }
const MONEY = '"$"#,##0.00'

// Agrega una fila aplicando Arial a todas las celdas (negrita/fondo opcionales).
function fila(ws, values, { bold = false, fill = null } = {}) {
  const row = ws.addRow(values)
  row.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = bold ? FONT_BOLD : FONT
    if (fill) cell.fill = fill
  })
  return row
}

// Etiqueta de nivel del cuadro real: "TINY 1 NIVEL", "KIDS 3 NIVEL", "KINDER 1".
const nivelLabel = (itinerario, nivel) => (itinerario === 'KINDER' ? `KINDER ${nivel}` : `${itinerario} ${nivel} NIVEL`)

// Columna "Observación" de la hoja Cantidad de Niños.
const observacion = (e) =>
  e.esRetirado ? 'RETIRADO'
  : e.esNuevo ? 'NUEVO'
  : e.esReincorporado ? 'REINCORPORADO'
  : e.estado === 'baja_potencial' ? 'BAJA POTENCIAL'
  : 'CONTINÚA'

// Nombre de archivo sin acentos ni espacios raros.
const limpio = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')

export async function GET(request, { params }) {
  const s = await getSession()
  if (!s) return Response.json({ error: 'No autenticado' }, { status: 401 })
  const { id } = await params
  // Mismo criterio que requireCentroAccess: admin ve cualquier centro; una
  // administradora solo el suyo.
  if (!isAdminRole(s.rol) && String(s.centro_id) !== String(id)) {
    return Response.json({ error: 'No autorizado para este centro' }, { status: 403 })
  }

  const hoy = new Date()
  const { searchParams } = new URL(request.url)
  const year = parseInt(searchParams.get('year')) || hoy.getFullYear()
  const month = parseInt(searchParams.get('month')) || hoy.getMonth() + 1
  if (year < 2000 || year > 2100 || month < 1 || month > 12) {
    return Response.json({ error: 'Mes inválido' }, { status: 400 })
  }

  const [c] = await sql`SELECT nombre FROM centros WHERE id = ${id}`
  if (!c) return Response.json({ error: 'Centro no encontrado' }, { status: 404 })

  const gruposRaw = await sql`SELECT * FROM grupos WHERE centro_id = ${id} ORDER BY numero`
  const coaches = await sql`SELECT * FROM coaches WHERE centro_id = ${id}`
  const horarios = await sql`
    SELECT gh.* FROM grupo_horarios gh
    JOIN grupos g ON g.id = gh.grupo_id
    WHERE g.centro_id = ${id}
    ORDER BY gh.dia, gh.hora_inicio
  `
  const estudiantes = await sql`SELECT * FROM estudiantes WHERE centro_id = ${id}`
  const eventos = await sql`
    SELECT * FROM estudiante_eventos
    WHERE centro_id = ${id} AND year = ${year} AND month = ${month}
    ORDER BY fecha, id
  `
  let pedidos = await sql`
    SELECT * FROM pedidos_material
    WHERE centro_id = ${id} AND year = ${year} AND month = ${month}
    ORDER BY fecha, id
  `
  const tri = Math.ceil(month / 3)
  const [metas] = await sql`SELECT royalty_por_nino FROM metas WHERE anio = ${year} AND trimestre = ${tri}`
  let royaltyRate = Number(metas?.royalty_por_nino) || 12

  const porCoach = new Map(coaches.map((x) => [String(x.id), x]))
  const grupos = gruposRaw.map((g) => ({
    ...g,
    coach: g.coach_id == null ? null : porCoach.get(String(g.coach_id)) || null,
    horarios: horarios.filter((h) => String(h.grupo_id) === String(g.id)),
  }))

  let royalties = cuadroRoyalties(estudiantes, eventos, royaltyRate)
  let control = cuadroControlGrupos(grupos, estudiantes, eventos)
  let deserciones = cuadroDeserciones(estudiantes, eventos, grupos)

  // Mes cerrado → el Excel sale de la foto congelada del cuadro (la misma
  // verdad histórica que muestra la página), no del estado actual.
  const [mesRow] = await sql`SELECT estado FROM mes_kpi WHERE centro_id = ${id} AND year = ${year} AND month = ${month}`
  if (mesRow?.estado === 'cerrado') {
    const snap = await leerSnapshotCuadro(id, year, month)
    if (snap?.datos) {
      royalties = snap.datos.royalties
      control = snap.datos.controlGrupos
      deserciones = snap.datos.deserciones
      pedidos = snap.datos.pedidos || []
      royaltyRate = snap.datos.royaltyRate || royaltyRate
    }
  }
  const mesNombre = MESES[month - 1]

  const wb = new ExcelJS.Workbook()
  wb.creator = 'ALOHA Panamá'
  wb.created = hoy

  // ── Hoja 1: ROYALTIES ─────────────────────────────────────────────────────
  const h1 = wb.addWorksheet('ROYALTIES')
  h1.columns = [{ width: 24 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 12 }, { width: 12 }, { width: 30 }]
  fila(h1, ['Name:', `CENTRO ALOHA ${c.nombre}`], { bold: true })
  fila(h1, ['Country:', 'PANAMÁ'])
  fila(h1, ['Address:', ''])
  fila(h1, [])
  fila(h1, [`ROYALTIES MES DE ${mesNombre} ${year}`], { bold: true })
  fila(h1, [])
  fila(h1, ['REGULAR GROUP', 'Students New', 'Continuing', 'Enrollment $', `Royalty x ${royaltyRate}$`], { bold: true, fill: FILL_HEADER })
  for (const f of royalties.filas) {
    const r = fila(h1, [nivelLabel(f.itinerario, f.nivel), f.nuevos, f.continuan, '', f.royalty])
    r.getCell(5).numFmt = MONEY
  }
  const rTot = fila(h1, ['TOTAL', royalties.totales.totalNuevos, royalties.totales.totalContinuan, '', royalties.totales.totalRoyalty], { bold: true, fill: FILL_TOTAL })
  rTot.getCell(5).numFmt = MONEY
  fila(h1, ['TOTAL NIÑOS', royalties.totales.totalNinos], { bold: true })
  const rGrand = fila(h1, ['GRAND TOTAL', '', '', '', royalties.totales.totalRoyalty], { bold: true, fill: FILL_TOTAL })
  rGrand.getCell(5).numFmt = MONEY

  fila(h1, [])
  fila(h1, ['PEDIDOS DE MATERIAL (KIT / ÁBACO)'], { bold: true })
  fila(h1, ['FECHA', 'N° O/E', 'PRODUCTO', 'GRUPO', 'NIVEL', 'CANTIDAD', 'MONTO', 'OBSERVACIONES'], { bold: true, fill: FILL_HEADER })
  let totalPedidos = 0
  for (const p of pedidos) {
    const g = grupos.find((x) => String(x.id) === String(p.grupo_id))
    const monto = Number(p.monto) || 0
    totalPedidos += monto
    const r = fila(h1, [p.fecha || '', p.numero_oe || '', p.producto || '', g ? `GRUPO ${g.numero}` : '', p.nivel ?? '', p.cantidad || 0, monto, p.observaciones || ''])
    r.getCell(7).numFmt = MONEY
  }
  const rPed = fila(h1, ['', '', '', '', '', 'TOTAL', totalPedidos, ''], { bold: true, fill: FILL_TOTAL })
  rPed.getCell(7).numFmt = MONEY

  // ── Hoja 2: CANTIDAD DE NIÑOS ─────────────────────────────────────────────
  const h2 = wb.addWorksheet('CANTIDAD DE NIÑOS')
  h2.columns = [
    { width: 18 }, { width: 12 }, { width: 12 }, { width: 8 }, { width: 14 }, { width: 10 },
    { width: 16 }, { width: 11 }, { width: 13 }, { width: 30 }, { width: 16 }, { width: 18 },
    { width: 26 }, { width: 28 }, { width: 14 }, { width: 15 },
  ]
  fila(h2, [`CENTRO ALOHA ${c.nombre}`], { bold: true })
  fila(h2, [`MES: ${mesNombre} ${year}`], { bold: true })
  fila(h2, [])
  fila(h2, [
    'COACH', '# DE GRUPO', 'ITINERARIO', 'NIVEL', 'CANT. NIÑOS MES ANTERIOR', 'NUEVOS',
    'REINCORPORADOS', 'RETIRADOS', 'TOTAL DEL MES', 'NOMBRE DEL ESTUDIANTE', 'OBSERVACIÓN',
    'STATUS PLATAFORMA', 'REPRESENTANTE', 'CORREO', 'TELÉFONO', 'FECHA DE CIERRE',
  ], { bold: true, fill: FILL_HEADER })
  for (const f of control.filas) {
    const cts = f.contadores
    if (!f.porNiño.length) {
      fila(h2, [f.coach?.nombre || '', `GRUPO ${f.grupo.numero}`, f.grupo.itinerario || '', '', cts.mesAnterior, cts.nuevos, cts.reincorporados, cts.retirados, cts.totalMes, '', '', '', '', '', '', ''])
      continue
    }
    f.porNiño.forEach((e, i) => {
      const primera = i === 0
      fila(h2, [
        primera ? f.coach?.nombre || '' : '',
        primera ? `GRUPO ${f.grupo.numero}` : '',
        e.itinerario || '',
        e.nivel ?? '',
        primera ? cts.mesAnterior : '',
        primera ? cts.nuevos : '',
        primera ? cts.reincorporados : '',
        primera ? cts.retirados : '',
        primera ? cts.totalMes : '',
        e.nombre || '',
        observacion(e),
        STATUS_LABELS[e.status_plataforma] || e.status_plataforma || '',
        e.representante || '',
        e.correo || '',
        e.telefono || '',
        e.fecha_cierre_nivel || '',
      ])
    })
  }
  fila(h2, [])
  fila(h2, ['NIÑOS QUE CONTINÚAN', control.totales.continuan], { bold: true })
  fila(h2, ['NUEVOS', control.totales.nuevos], { bold: true })
  fila(h2, ['REINCORPORADOS', control.totales.reincorporados], { bold: true })
  fila(h2, ['NIÑOS A PAGAR', control.totales.aPagar], { bold: true, fill: FILL_TOTAL })
  fila(h2, ['GRUPOS ACTIVOS', control.totales.gruposActivos], { bold: true })

  // ── Hoja 3: NIÑOS RETIRADOS ───────────────────────────────────────────────
  const h3 = wb.addWorksheet('NIÑOS RETIRADOS')
  h3.columns = [
    { width: 18 }, { width: 12 }, { width: 12 }, { width: 8 }, { width: 10 }, { width: 30 },
    { width: 24 }, { width: 15 }, { width: 15 }, { width: 17 }, { width: 26 }, { width: 28 }, { width: 14 },
  ]
  fila(h3, [`LISTA DE NIÑOS RETIRADOS — ${mesNombre} ${year}`], { bold: true })
  fila(h3, [])
  fila(h3, [
    'COACH', 'GRUPO', 'ITINERARIO', 'NIVEL', 'CANTIDAD', 'NIÑO', 'MOTIVO',
    'FECHA DE INICIO', 'FECHA DE RETIRO', 'ÚLTIMA ASISTENCIA', 'REPRESENTANTE', 'CORREO', 'TELÉFONO',
  ], { bold: true, fill: FILL_HEADER })
  for (const d of deserciones) {
    fila(h3, [
      d.coach || '', d.grupo ? `GRUPO ${d.grupo}` : '', d.itinerario || '', d.nivel ?? '', 1, d.nombre || '',
      (MOTIVOS_RETIRO_LABELS[d.motivo] || d.motivo || '').toUpperCase(),
      d.fechaInicio || '', d.fechaRetiro || '', d.ultimaAsistencia || '',
      d.representante || '', d.correo || '', d.telefono || '',
    ])
  }
  fila(h3, ['TOTAL', '', '', '', deserciones.length, '', '', '', '', '', '', '', ''], { bold: true, fill: FILL_TOTAL })

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `CUADRO_DE_NEGOCIO_${limpio(c.nombre)}_${mesNombre}_${year}.xlsx`
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
