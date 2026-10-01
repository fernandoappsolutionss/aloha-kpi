// Reporte de fichas duplicadas por centro (2026-10-01) — cálculo PURO para el
// script de SOLO LECTURA scripts/listar-fichas-duplicadas-2026-10-01.mjs.
// Agrupa con las MISMAS reglas que frenan «Inscribir» (lib/ficha-existente.mjs)
// y junta la evidencia que un centro necesita para decidir: estado, grupo,
// nivel, origen, venta canónica (la que cuenta el KPI) y si su mes está
// cerrado, asistencias, retiros, la familia y si al inscribir ya confirmó que
// era otro niño. No decide cuál ficha sobra.

import { agruparFichasDuplicadas, compartenContacto, describirMotivos, enmascararTelefono } from './ficha-existente.mjs'
import { matriculaAnulada } from './anulacion-matricula.mjs'

const iso10 = (v) => (v == null || v === '' ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10))
const mes = (year, month) => (year && month ? `${year}-${String(month).padStart(2, '0')}` : null)

// Venta canónica = primer evento de inscripción por fecha (nulos primero) e id,
// el mismo criterio de lib/kpi-semanal-auto.mjs.
const compararEventos = (a, b) =>
  String(iso10(a.fecha) || '').localeCompare(String(iso10(b.fecha) || '')) || Number(a.id) - Number(b.id)

function detalleDe(valor) {
  if (valor == null) return null
  if (typeof valor === 'string') {
    try { return JSON.parse(valor) } catch { return null }
  }
  return valor
}

const ORDEN_FUERZA = { registro: 0, fuerte: 1, posible: 2 }

// asistencias: [{ estudiante_id, fechas: ['AAAA-MM-DD', …] }] (solo presentes).
// meses: [{ centro_id, year, month, estado }] de mes_kpi.
export function armarReporteDuplicados({ centros = [], fichas = [], eventos = [], grupos = [], asistencias = [], meses = [] } = {}) {
  const nombreCentro = new Map(centros.map((c) => [String(c.id), c.nombre]))
  const numeroGrupo = new Map(grupos.map((g) => [String(g.id), g.numero]))
  const fichaPorId = new Map(fichas.map((f) => [String(f.id), f]))
  const presentesPorFicha = new Map(asistencias.map((a) => [String(a.estudiante_id), (a.fechas || []).map(iso10).filter(Boolean).sort()]))
  const estadoMes = new Map(meses.map((m) => [`${m.centro_id}|${mes(m.year, m.month)}`, m.estado]))
  const eventosPorFicha = new Map()
  for (const evento of eventos) {
    const key = String(evento.estudiante_id)
    if (!eventosPorFicha.has(key)) eventosPorFicha.set(key, [])
    eventosPorFicha.get(key).push(evento)
  }

  return agruparFichasDuplicadas(fichas).map((grupo) => {
    const miembros = grupo.ids.map((id) => {
      const f = fichaPorId.get(String(id))
      const propios = [...(eventosPorFicha.get(String(id)) || [])].sort(compararEventos)
      const venta = propios.find((e) => e.tipo === 'inscripcion') || null
      const confirmada = detalleDe(venta?.detalle)?.ficha_nueva_confirmada
      const presentes = presentesPorFicha.get(String(id)) || []
      const mesVenta = venta ? mes(venta.year, venta.month) : null
      return {
        id: Number(f.id),
        nombre: f.nombre,
        estado: f.estado,
        anulada: matriculaAnulada(f),
        grupo: f.grupo_id == null ? null : numeroGrupo.get(String(f.grupo_id)) ?? `id ${f.grupo_id}`,
        itinerario: f.itinerario ?? null,
        nivel: f.nivel == null ? null : Number(f.nivel),
        origen: f.origen ?? null,
        conRegistroCrm: f.crm_registration_id != null && String(f.crm_registration_id).trim() !== '',
        creada: iso10(f.created_at),
        venta: venta ? iso10(venta.fecha) : null,
        mesVenta,
        // La venta por traslado no es venta del KPI (va en `traslados`, aparte).
        ventaTraslado: venta?.origen === 'traslado',
        // Limpiar una venta de un mes que ya no está abierto exige reabrirlo.
        mesVentaEstado: mesVenta ? estadoMes.get(`${f.centro_id}|${mesVenta}`) || 'sin registro' : null,
        retiros: propios.filter((e) => e.tipo === 'retiro').map((e) => ({ fecha: iso10(e.fecha), motivo: e.motivo ?? null })),
        reincorporaciones: propios.filter((e) => e.tipo === 'reincorporacion').map((e) => iso10(e.fecha)),
        asistencias: { presentes: presentes.length, primera: presentes[0] || null, ultima: presentes[presentes.length - 1] || null },
        fechasPresente: presentes,
        // Sin venta y sin grupo: cuando lo coloquen sumará una venta.
        pendienteSinVenta: !venta && f.grupo_id == null && ['activo', 'baja_potencial'].includes(f.estado),
        telefono: enmascararTelefono(f.telefono),
        representante: f.representante || null,
        descartadas: Array.isArray(confirmada?.descartadas) ? confirmada.descartadas.map(Number) : [],
        motivoConfirmacion: confirmada?.motivo || null,
      }
    })
    const ids = new Set(miembros.map((m) => m.id))
    // Con la matrícula anulada la venta ya no cuenta (eventosSinMatriculasAnuladas),
    // y la de un traslado nunca contó como venta.
    const ventas = miembros.filter((m) => m.venta && !m.anulada && !m.ventaTraslado)
      .map((m) => ({ id: m.id, fecha: m.venta, mes: m.mesVenta, mesEstado: m.mesVentaEstado }))
      .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id)
    const fuerza = grupo.pares.map((p) => p.fuerza).sort((a, b) => ORDEN_FUERZA[a] - ORDEN_FUERZA[b])[0]

    // Presentes el MISMO día en dos fichas: un niño no va a dos clases a la vez
    // (o son dos niños, o alguien marcó doble).
    const mismosDias = []
    for (let i = 0; i < miembros.length; i++) {
      for (let j = i + 1; j < miembros.length; j++) {
        const dias = new Set(miembros[i].fechasPresente)
        const comunes = miembros[j].fechasPresente.filter((d) => dias.has(d))
        if (comunes.length) mismosDias.push({ a: miembros[i].id, b: miembros[j].id, dias: comunes.length, primero: comunes[0] })
      }
    }
    // Un retiro de una ficha DESPUÉS de crear la otra: si son el mismo niño,
    // probablemente fue para "tapar" el duplicado y es un retiro espurio.
    const retirosPosteriores = []
    for (const m of miembros) {
      for (const r of m.retiros) {
        const otra = miembros.find((o) => o.id !== m.id && o.creada && r.fecha && o.creada <= r.fecha)
        if (otra) retirosPosteriores.push({ ficha: m.id, fecha: r.fecha, otra: otra.id })
      }
    }
    // La familia: otras fichas del centro con el mismo teléfono o correo.
    const familia = fichas
      .filter((f) => !ids.has(Number(f.id)) && String(f.centro_id) === String(grupo.centroId))
      .filter((f) => grupo.ids.some((id) => compartenContacto(fichaPorId.get(String(id)), f)))
      .map((f) => ({ id: Number(f.id), nombre: f.nombre, estado: f.estado }))

    return {
      centroId: grupo.centroId,
      centro: nombreCentro.get(String(grupo.centroId)) || `Centro ${grupo.centroId}`,
      fuerza,
      completo: grupo.completo,
      pares: grupo.pares.map((p) => ({ ...p, texto: describirMotivos(p.motivos) })),
      miembros: miembros.map(({ fechasPresente, ...m }) => m),
      ventas,
      ventasDeMas: Math.max(0, ventas.length - 1),
      mismosDias,
      retirosPosteriores,
      familia,
      // El centro ya dijo "es otro niño" al inscribir: queda a la vista, no se oculta.
      confirmadasDistintas: miembros.flatMap((m) => m.descartadas.filter((d) => ids.has(d)).map((d) => ({ ficha: m.id, descartada: d, motivo: m.motivoConfirmacion }))),
    }
  })
}

const ESTADO = { activo: 'activo', baja_potencial: 'baja potencial', retirado: 'retirado', matricula_anulada: 'matrícula anulada' }
const FUERZA = { registro: 'mismo registro de CRM', fuerte: 'mismo nombre + contacto en común', posible: 'posible (nombre parecido o solo el nombre)' }

function lineaMiembro(m) {
  const partes = [
    `${String(m.id).padEnd(5)} ${m.nombre}`,
    ESTADO[m.estado] || m.estado,
    m.grupo != null ? `grupo ${m.grupo}` : 'sin grupo',
    m.itinerario ? `${m.itinerario}${m.nivel ? ` ${m.nivel}` : ''}` : null,
    `origen ${m.origen || '—'}`,
    m.conRegistroCrm ? 'con registro CRM' : 'sin registro CRM',
    `creada ${m.creada || '—'}`,
    m.venta && m.ventaTraslado
      ? `llegó por traslado el ${m.venta} (no cuenta como venta)`
      : m.venta
      ? `venta ${m.venta} (KPI ${m.mesVenta}${m.mesVentaEstado && m.mesVentaEstado !== 'abierto' ? `, mes ${m.mesVentaEstado}` : ''})`
      : m.pendienteSinVenta ? 'sin venta (sumará una al colocarlo)' : 'sin venta',
    m.asistencias.presentes ? `${m.asistencias.presentes} presentes (${m.asistencias.primera} a ${m.asistencias.ultima})` : 'sin asistencias',
    `tel ${m.telefono}`,
    m.representante ? `rep. ${m.representante}` : null,
  ].filter(Boolean)
  const extras = [
    ...m.retiros.map((r) => `retiro ${r.fecha}${r.motivo ? ` (${r.motivo})` : ''}`),
    ...m.reincorporaciones.map((f) => `reincorporación ${f}`),
  ]
  return `    ${partes.join(' · ')}${extras.length ? `\n          ${extras.join(' · ')}` : ''}`
}

export function textoReporteDuplicados(reporte = []) {
  if (!reporte.length) return 'Sin fichas duplicadas con las reglas de lib/ficha-existente.mjs.'
  const lineas = []
  const porCentro = new Map()
  for (const g of reporte) {
    if (!porCentro.has(g.centroId)) porCentro.set(g.centroId, [])
    porCentro.get(g.centroId).push(g)
  }
  for (const [centroId, grupos] of porCentro) {
    lineas.push(`══ ${grupos[0].centro} (centro ${centroId}) — ${grupos.length} ${grupos.length === 1 ? 'posible duplicado' : 'posibles duplicados'} ══`)
    grupos.forEach((g, i) => {
      lineas.push('', `[${i + 1}] Evidencia: ${FUERZA[g.fuerza] || g.fuerza}${g.completo ? '' : ' · EN CADENA: no todos coinciden entre sí, revisar (pueden ser hermanos)'}`)
      for (const p of g.pares) lineas.push(`    ${p.a} ~ ${p.b}: ${p.texto}`)
      for (const m of g.miembros) lineas.push(lineaMiembro(m))
      if (g.completo && g.ventasDeMas > 0) {
        lineas.push(`    Si son el mismo niño sobra${g.ventasDeMas === 1 ? '' : 'n'} ${g.ventasDeMas} venta${g.ventasDeMas === 1 ? '' : 's'}: hoy cuentan ${g.ventas.map((v) => `${v.id} (KPI ${v.mes})`).join(', ')}.`)
      }
      for (const d of g.mismosDias) lineas.push(`    ${d.a} y ${d.b} tienen presente el mismo día ${d.dias} ${d.dias === 1 ? 'vez' : 'veces'} (desde ${d.primero}): ¿dos niños o marcado doble?`)
      for (const r of g.retirosPosteriores) lineas.push(`    El retiro de ${r.ficha} (${r.fecha}) es posterior a la ficha ${r.otra}: si son el mismo niño, es un retiro espurio.`)
      for (const c of g.confirmadasDistintas) lineas.push(`    Al inscribir ${c.ficha} el centro confirmó que NO es ${c.descartada}${c.motivo ? ` (${c.motivo})` : ''}.`)
      if (g.familia.length) lineas.push(`    Misma familia (teléfono o correo): ${g.familia.map((f) => `${f.id} ${f.nombre} (${ESTADO[f.estado] || f.estado})`).join('; ')}`)
    })
    lineas.push('')
  }
  const total = reporte.length
  const ventasDeMas = reporte.filter((g) => g.completo).reduce((s, g) => s + g.ventasDeMas, 0)
  const porFuerza = reporte.reduce((acc, g) => ({ ...acc, [g.fuerza]: (acc[g.fuerza] || 0) + 1 }), {})
  const enCadena = reporte.filter((g) => !g.completo).length
  lineas.push(`Total: ${total} ${total === 1 ? 'grupo' : 'grupos'} · ventas de más si se confirman: ${ventasDeMas}${enCadena ? ` (sin contar ${enCadena} en cadena)` : ''} · por evidencia: ${Object.entries(porFuerza).map(([k, n]) => `${FUERZA[k] || k} ${n}`).join(', ')}`)
  lineas.push('Nada se corrigió: limpiar requiere el OK de Fernando y la confirmación de cada centro (¿es el mismo niño? ¿qué ficha queda?). Retirar la ficha sobrante no es limpiar: suma un retiro espurio.')
  return lineas.join('\n')
}
