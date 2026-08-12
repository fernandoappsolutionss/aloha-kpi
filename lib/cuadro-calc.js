// Cálculo puro del Cuadro de Negocio mensual (informe a la Junta, formato
// FF_CUADRO_DE_NEGOCIO: hojas Royalties / Cantidad de Niños / Niños Retirados).
// Sin BD: recibe estudiantes, eventos del mes (estudiante_eventos del year/month
// consultado) y grupos (con coach y horarios embebidos) ya consultados.
// Extensión explícita: los tests .mjs (node --test) importan este módulo
// directo en Node, que no resuelve especificadores sin extensión en ESM.
import { ITINERARIOS, NIVEL_MAX, DIAS, fechaIso10, grupoOperativoConNinos } from './operaciones.js'

// ── Población "as of" fin de mes por eventos (R5, g1-22) ────────────────────
//
// El cuadro de un mes ABIERTO no puede depender de `estudiantes.estado` de HOY:
// un retiro con evento de septiembre borraría al niño del cuadro de agosto
// aunque agosto siga abierto. La población se proyecta al cierre del mes desde
// los eventos de membresía (inscripcion / retiro / reincorporacion, por su
// year/month DECLARADO — la fecha lógica, no el día físico en que corrió el
// cron). La fórmula monetaria no cambia: cambia SOLO qué niños entran.

const TIPOS_MEMBRESIA = new Set(['inscripcion', 'retiro', 'reincorporacion'])

// Periodo AAAA*100+MM de un evento: manda el year/month declarado (NOT NULL en
// el schema); el fallback por fecha cubre datos legacy raros. Sin nada → null
// (se trata como pasado remoto: jamás inventa un futuro).
const periodoEvento = (ev) => {
  const y = Number(ev?.year)
  const m = Number(ev?.month)
  if (Number.isInteger(y) && y > 0 && Number.isInteger(m) && m >= 1 && m <= 12) return y * 100 + m
  const f = fechaIso10(ev?.fecha)
  if (f && /^\d{4}-\d{2}/.test(f)) return Number(f.slice(0, 4)) * 100 + Number(f.slice(5, 7))
  return null
}

// Estado del niño AL CIERRE de year/month, proyectado desde sus eventos de
// membresía. Regla de regresión cero: SIN eventos posteriores al mes, manda el
// estado actual de la ficha tal cual (paridad exacta con el cálculo viejo en
// los 6 centros de hoy, incluidos legacy sin eventos y bajas potenciales).
// CON eventos posteriores, la ficha ya fue reescrita por el futuro y hay que
// rebobinar: decide el último evento <= mes; si no hay ninguno, el estado
// PREVIO al primer evento posterior (antes de una inscripción el niño no
// existía → null, se excluye de la población; antes de un retiro estaba
// activo; antes de una reincorporación estaba retirado).
export function estadoAsOfMes(estudiante, eventosEstudiante, year, month) {
  const corte = Number(year) * 100 + Number(month)
  const membresia = (eventosEstudiante || [])
    .filter((ev) => TIPOS_MEMBRESIA.has(ev?.tipo))
    .map((ev) => ({ ev, periodo: periodoEvento(ev) ?? -Infinity }))
    .sort((a, b) =>
      (a.periodo - b.periodo) ||
      String(fechaIso10(a.ev.fecha) || '').localeCompare(String(fechaIso10(b.ev.fecha) || '')) ||
      ((Number(a.ev.id) || 0) - (Number(b.ev.id) || 0)))
  const futuros = membresia.filter((x) => x.periodo > corte)
  if (!futuros.length) return estudiante?.estado ?? null
  const pasados = membresia.filter((x) => x.periodo <= corte)
  if (pasados.length) {
    return pasados[pasados.length - 1].ev.tipo === 'retiro' ? 'retirado' : 'activo'
  }
  const primero = futuros[0].ev
  if (primero.tipo === 'inscripcion') return null // aún no inscrito al cierre del mes
  return primero.tipo === 'retiro' ? 'activo' : 'retirado'
}

// La población del cuadro con el estado proyectado al cierre del mes. Recibe
// TODOS los eventos de membresía del centro (histórico completo, no solo el
// mes) y devuelve los estudiantes con `estado` as-of; el que aún no estaba
// inscrito al cierre queda fuera (una venta de septiembre no infla agosto).
// El objeto original se conserva idéntico cuando el estado no cambia.
export function poblacionAsOfMes(estudiantes, eventos, year, month) {
  const porEstudiante = new Map()
  for (const ev of eventos || []) {
    if (!TIPOS_MEMBRESIA.has(ev?.tipo)) continue
    const key = String(ev.estudiante_id)
    const lista = porEstudiante.get(key)
    if (lista) lista.push(ev)
    else porEstudiante.set(key, [ev])
  }
  const out = []
  for (const e of estudiantes || []) {
    const estado = estadoAsOfMes(e, porEstudiante.get(String(e.id)) || [], year, month)
    if (estado == null) continue
    out.push(estado === e.estado ? e : { ...e, estado })
  }
  return out
}

// Ids de estudiantes con movimiento en el mes, por tipo de evento. Un retiro
// con motivo GRADUADO cuenta también como graduado (logro, no deserción real).
export function movimientosMes(eventos, nuevosActivosIds = null) {
  const nuevosIds = nuevosActivosIds == null ? new Set() : new Set([...nuevosActivosIds].map((id) => String(id)))
  const reincorporadosIds = new Set()
  const retiradosIds = new Set()
  const graduadosIds = new Set()
  for (const ev of eventos || []) {
    if (nuevosActivosIds == null && ev.tipo === 'inscripcion') nuevosIds.add(String(ev.estudiante_id))
    else if (ev.tipo === 'reincorporacion') reincorporadosIds.add(String(ev.estudiante_id))
    else if (ev.tipo === 'retiro') {
      retiradosIds.add(String(ev.estudiante_id))
      if (ev.motivo === 'GRADUADO') graduadosIds.add(String(ev.estudiante_id))
    }
  }
  return { nuevosIds, reincorporadosIds, retiradosIds, graduadosIds }
}

// Hoja Royalties: filas por itinerario+nivel (TINY 1..10, KIDS 1..8, KINDER 1..3,
// en ese orden, solo filas con niños). Regla del cuadro real: paga royalty quien
// está activo al cierre del mes (estado activo o baja_potencial); los retirados
// del mes NO pagan. "Nuevos" = con inicio operativo de clases en el mes; el resto
// (incluidos los reincorporados) cuenta como "continúan".
export function cuadroRoyalties(estudiantes, eventos, royaltyRate, nuevosActivosIds = null) {
  const { nuevosIds } = movimientosMes(eventos, nuevosActivosIds)
  const activos = (estudiantes || []).filter((e) => e.estado === 'activo' || e.estado === 'baja_potencial')
  const rate = Number(royaltyRate) || 0
  const filas = []
  let totalNinos = 0, totalNuevos = 0, totalContinuan = 0, totalRoyalty = 0
  for (const it of ITINERARIOS) {
    for (let nivel = 1; nivel <= NIVEL_MAX[it]; nivel++) {
      const del = activos.filter((e) => e.itinerario === it && Number(e.nivel) === nivel)
      if (!del.length) continue
      const nuevos = del.filter((e) => nuevosIds.has(String(e.id))).length
      const continuan = del.length - nuevos
      const royalty = del.length * rate
      filas.push({ itinerario: it, nivel, nuevos, continuan, total: del.length, royalty })
      totalNinos += del.length
      totalNuevos += nuevos
      totalContinuan += continuan
      totalRoyalty += royalty
    }
  }
  return { filas, totales: { totalNinos, totalNuevos, totalContinuan, totalRoyalty } }
}

// Horario legible de un grupo ("Lunes 15:00–17:00 · Miércoles 15:00–17:00").
const horarioTexto = (horarios) => (horarios || []).map((h) => `${DIAS[h.dia] || ''} ${h.hora_inicio}–${h.hora_fin}`.trim()).join(' · ')

// Hoja Cantidad de Niños (control de grupos): una fila por grupo activo (y los
// cerrados/fusionados con movimientos en el mes), con sus niños y contadores.
// El "total del mes" son los que pagan (activos + baja potencial); la cantidad
// del mes anterior se reconstruye: total − nuevos − reincorporados + retirados.
// Los niños sin grupo asignado van en una fila propia al final: pagan en
// Royalties y sus retiros cuentan por evento, así que dejarlos fuera
// descuadraría los totales del centro (y el sync con el KPI mensual).
export function cuadroControlGrupos(grupos, estudiantes, eventos, nuevosActivosIds = null) {
  const { nuevosIds, reincorporadosIds, retiradosIds } = movimientosMes(eventos, nuevosActivosIds)
  const filas = []
  let mesAnteriorTot = 0, continuan = 0, nuevosTot = 0, reincorporadosTot = 0, retiradosTot = 0, aPagarTot = 0
  // porNiño + contadores de un conjunto de niños; acumula los totales del centro.
  const armarFila = (kids) => {
    const porNiño = kids
      .map((e) => ({
        ...e,
        esNuevo: nuevosIds.has(String(e.id)),
        esReincorporado: reincorporadosIds.has(String(e.id)),
        esRetirado: e.estado === 'retirado' && retiradosIds.has(String(e.id)),
      }))
      .sort((a, b) => (a.esRetirado === b.esRetirado ? String(a.nombre).localeCompare(String(b.nombre)) : a.esRetirado ? 1 : -1))
    const activosG = porNiño.filter((e) => !e.esRetirado)
    const nuevos = porNiño.filter((e) => e.esNuevo).length
    const reincorporados = porNiño.filter((e) => e.esReincorporado).length
    const retirados = porNiño.filter((e) => retiradosIds.has(String(e.id))).length
    const totalMes = activosG.length
    const mesAnterior = totalMes - nuevos - reincorporados + retirados
    mesAnteriorTot += mesAnterior
    continuan += activosG.filter((e) => !e.esNuevo && !e.esReincorporado).length
    nuevosTot += nuevos
    reincorporadosTot += reincorporados
    retiradosTot += retirados
    aPagarTot += totalMes
    return { porNiño, contadores: { mesAnterior, nuevos, reincorporados, retirados, totalMes } }
  }
  for (const g of grupos || []) {
    const kids = (estudiantes || []).filter((e) => String(e.grupo_id) === String(g.id) &&
      (e.estado === 'activo' || e.estado === 'baja_potencial' || (e.estado === 'retirado' && retiradosIds.has(String(e.id)))))
    const conMovimientos = kids.length > 0 || (eventos || []).some((ev) => String(ev.de_grupo_id) === String(g.id) || String(ev.a_grupo_id) === String(g.id))
    if (g.estado !== 'activo' && !conMovimientos) continue
    filas.push({ grupo: g, coach: g.coach || null, horarioTexto: horarioTexto(g.horarios), ...armarFila(kids) })
  }
  filas.sort((a, b) => String(a.grupo.numero).localeCompare(String(b.grupo.numero), 'es', { numeric: true }))
  // Niños sin grupo (la UI permite inscribir "Sin grupo" y asignar después, y
  // también retirarlos): fila propia al final, con un grupo sintético para que
  // la página y el Excel la rendericen igual que las demás.
  const sueltos = (estudiantes || []).filter((e) => e.grupo_id == null &&
    (e.estado === 'activo' || e.estado === 'baja_potencial' || (e.estado === 'retirado' && retiradosIds.has(String(e.id)))))
  if (sueltos.length) {
    filas.push({ grupo: { id: 'sin-grupo', numero: 'SIN ASIGNAR', itinerario: '—', estado: 'activo' }, coach: null, horarioTexto: '', ...armarFila(sueltos) })
  }
  const gruposActivos = (grupos || []).filter((g) => grupoOperativoConNinos(g, estudiantes)).length
  return {
    filas,
    totales: {
      mesAnterior: mesAnteriorTot,
      continuan,
      nuevos: nuevosTot,
      reincorporados: reincorporadosTot,
      retirados: retiradosTot,
      aPagar: aPagarTot,
      gruposActivos,
    },
  }
}

// Hoja Niños Retirados (cuadro de deserciones): retirados del mes consultado,
// a partir de los eventos de retiro (así los meses pasados no cambian si el
// niño se reincorpora después). `grupos` es opcional: resuelve numero de grupo
// y nombre del coach desde ev.de_grupo_id (el grupo del que salió, guardado en
// el evento; e.grupo_id solo como fallback — el actual puede ser otro si el
// niño se reincorporó o cambió de grupo después); sin él quedan en null.
export function cuadroDeserciones(estudiantes, eventos, grupos) {
  const porId = new Map((estudiantes || []).map((e) => [e.id, e]))
  const filas = []
  for (const ev of eventos || []) {
    if (ev.tipo !== 'retiro') continue
    const e = porId.get(ev.estudiante_id)
    if (!e) continue
    const grupoId = ev.de_grupo_id ?? e.grupo_id
    const g = (grupos || []).find((x) => String(x.id) === String(grupoId)) || null
    filas.push({
      coach: g?.coach?.nombre || null,
      grupo: g?.numero || null,
      itinerario: e.itinerario,
      nivel: e.nivel,
      nombre: e.nombre,
      motivo: ev.motivo || e.motivo_retiro || 'OTRO',
      fechaInicio: e.fecha_inscripcion || null,
      fechaRetiro: ev.fecha || e.fecha_retiro || null,
      ultimaAsistencia: e.ultima_asistencia || null,
      representante: e.representante || null,
      correo: e.correo || null,
      telefono: e.telefono || null,
    })
  }
  filas.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre)))
  return filas
}

// Motivos de deserción del mes en las columnas de resumen_mes (para sincronizar
// con el KPI mensual). NO_CONFIRMO / INASISTENCIA / CAMBIO_CENTRO / OTRO caen
// en mot_otro (la inasistencia NO es pérdida de clases del centro).
export function motivosParaKpi(desertados) {
  const out = { mot_tecnica: 0, mot_perdida_clase: 0, mot_economico: 0, mot_horario: 0, mot_graduado: 0, mot_otro: 0 }
  for (const d of desertados || []) {
    if (d.motivo === 'TECNICA') out.mot_tecnica++
    else if (d.motivo === 'PERDIDA_CLASES') out.mot_perdida_clase++
    else if (d.motivo === 'ECONOMICO') out.mot_economico++
    else if (d.motivo === 'HORARIO') out.mot_horario++
    else if (d.motivo === 'GRADUADO') out.mot_graduado++
    else out.mot_otro++
  }
  return out
}
