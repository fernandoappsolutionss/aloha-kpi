// Cálculo puro del Cuadro de Negocio mensual (informe a la Junta, formato
// FF_CUADRO_DE_NEGOCIO: hojas Royalties / Cantidad de Niños / Niños Retirados).
// Sin BD: recibe estudiantes, eventos del mes (estudiante_eventos del year/month
// consultado) y grupos (con coach y horarios embebidos) ya consultados.
import { ITINERARIOS, NIVEL_MAX, DIAS } from './operaciones'

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
  const gruposActivos = (grupos || []).filter((g) => g.estado === 'activo').length
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
