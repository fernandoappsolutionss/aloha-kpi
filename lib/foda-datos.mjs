// FODA escrito DESDE LOS DATOS del trimestre, no desde las etiquetas del
// checklist. Módulo PURO (sin BD, sin React): recibe lo que ya calculan
// getCentroResumen y el motor de crecimiento, y devuelve las líneas de los
// cuatro cuadrantes. Se prueba con `npm test` (test/foda-datos.test.mjs).
//
// REGLA MADRE: ninguna línea sin un número. Si no tiene número no es un
// diagnóstico, es un comentario — y no entra.
//
// ponytail: los textos son plantillas fijas en español.
//   Techo: no se adaptan a los matices de cada centro (una debilidad de ventas
//   se lee igual en Anclas que en David) ni a otro idioma.
//   Salida: cuando exista un generador de texto, sustituir la plantilla
//   manteniendo el contrato (Fortalezas/Debilidades = dato + brecha, y
//   Oportunidades = acción · dueño · fecha · número que mueve).

import { cobranzaDeclarada, normalizarMetas } from './marcadores.mjs'
import { alertasDeCoach } from './desercion-coach.mjs'

export const PREFIJO_GENERADO = '· '

export const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const Q_MESES = { 1: [1, 2, 3], 2: [4, 5, 6], 3: [7, 8, 9], 4: [10, 11, 12] }

const num = (valor, porDefecto = 0) => {
  const n = Number(valor)
  return Number.isFinite(n) ? n : porDefecto
}

// Números en español: coma decimal y sin decimales cuando son redondos.
export function n1(valor) {
  const n = num(valor)
  const texto = (Math.round(n * 10) / 10).toFixed(1)
  return texto.replace('.0', '').replace('.', ',')
}

export function pct1(valor) {
  return `${n1(valor)}%`
}

// Índices de 0 a 1 (confianza): dos decimales, coma decimal.
export function n2(valor) {
  return (Math.round(num(valor) * 100) / 100).toFixed(2).replace('.', ',')
}

const entero = (valor) => String(Math.round(num(valor)))

// "1 baja" / "3 bajas": el plural mal puesto le quita seriedad al diagnóstico.
const plural = (n, singular, plural_) => `${entero(n)} ${Math.round(num(n)) === 1 ? singular : plural_}`

const periodoLargo = (periodo) => {
  const m = /^(\d{4})-(\d{2})$/.exec(String(periodo || ''))
  if (!m) return null
  return `${NOMBRES_MES[Number(m[2]) - 1].toLowerCase()} ${m[1]}`
}

// ───────────────────────── PRODUCTO (las 3 metas) ─────────────────────────
// Mismas fórmulas que el marcador de PRODUCTO del Resumen (lib/marcadores.mjs):
// P2 usa deserción REAL (bajas − graduados) y P3 mira el PEOR mes, no el
// último. Aquí se recalcula con detalle por mes porque el FODA necesita decir
// QUÉ mes falló y por cuánto, no solo si falló.
export function evaluarProductoFoda({ mesesCalc = [], rs = [], ks = [], metas = null, trimestre = null } = {}) {
  // Los defaults salen de normalizarMetas (lib/marcadores.mjs) y de ningún otro
  // sitio. Aquí había un `3` local frente al `1` del Resumen: sin fila en
  // `metas` —y NO hay fila para Q4-2026— un centro con 2 vencidas leía "Meta de
  // cobranza cumplida" en su FODA y "No cumple" en el Resumen, el mismo
  // trimestre y la misma meta.
  const metaNorm = normalizarMetas(metas)
  const metaNuevosMes = metaNorm.nuevos
  const metaDesercion = metaNorm.desercion
  const metaCobranza = metaNorm.cobranza
  const numerosMes = mesesCalc.length
    ? mesesCalc.map((m) => Number(m.mo))
    : (Q_MESES[trimestre] || [])

  const meses = numerosMes.map((mo) => {
    const calc = mesesCalc.find((m) => Number(m.mo) === mo) || {}
    const r = rs.find((x) => Number(x.month) === mo) || null
    const ws = ks.filter((x) => Number(x.month) === mo)
    const nuevos = num(calc.nuevos, ws.reduce((s, w) => s + num(w.ing_d1) + num(w.ing_d2) + num(w.ing_d3) + num(w.ing_d4) + num(w.ing_d5), 0))
    const bajas = num(calc.desercion, ws.reduce((s, w) => s + num(w.des_d1) + num(w.des_d2) + num(w.des_d3) + num(w.des_d4) + num(w.des_d5), 0))
    const graduados = num(r?.mot_graduado)
    const desReal = Math.max(0, bajas - graduados)
    const ninosInicio = num(calc.ninosInicio, num(r?.ninos_inicio_mes))
    const desPct = ninosInicio > 0 ? (desReal / ninosInicio) * 100 : (desReal > 0 ? 100 : 0)
    // Mismo criterio que el Resumen: el PEOR valor declarado del mes, y null
    // si no se declaró ninguno (un mes en blanco no es "cero vencidas").
    const cobranza = cobranzaDeclarada(ws)
    return {
      mo, nombre: NOMBRES_MES[mo - 1],
      // Y `conDatos` no puede salir de ws.length: la superposición fabrica
      // filas vacías hasta para meses que no han ocurrido.
      conDatos: Boolean(r) || nuevos > 0 || bajas > 0 || cobranza !== null,
      nuevos, bajas, graduados, desReal, ninosInicio, desPct,
      cobranza, cobranzaRegistrada: cobranza !== null,
    }
  })

  const conDatos = meses.filter((m) => m.conDatos)
  const ventasQ = conDatos.reduce((s, m) => s + m.nuevos, 0)
  const metaQ = metaNuevosMes * conDatos.length
  const desercionFallidos = conDatos.filter((m) => m.desPct > metaDesercion)
  const cobranzaFallidos = conDatos.filter((m) => m.cobranzaRegistrada && m.cobranza > metaCobranza)
  const peorDesercion = [...conDatos].sort((a, b) => b.desPct - a.desPct)[0] || null
  const peorCobranza = [...conDatos].filter((m) => m.cobranzaRegistrada).sort((a, b) => b.cobranza - a.cobranza)[0] || null

  const P1 = conDatos.length > 0 ? ventasQ >= metaQ : null
  const P2 = conDatos.length > 0 ? desercionFallidos.length === 0 : null
  const P3 = conDatos.some((m) => m.cobranzaRegistrada) ? cobranzaFallidos.length === 0 : null
  const metasFallidas = [P1, P2, P3].filter((p) => p === false).length

  return {
    P1, P2, P3, metasFallidas,
    metaNuevosMes, metaDesercion, metaCobranza,
    ventasQ, metaQ,
    metaTrimestreCompleto: metaNuevosMes * (numerosMes.length || 3),
    mesesDelTrimestre: numerosMes.length || 3,
    mesesConDatos: conDatos.length,
    desRealQ: conDatos.reduce((s, m) => s + m.desReal, 0),
    bajasQ: conDatos.reduce((s, m) => s + m.bajas, 0),
    graduadosQ: conDatos.reduce((s, m) => s + m.graduados, 0),
    peorDesercion, peorCobranza,
    mesesFueraDesercion: desercionFallidos.length,
    mesesFueraCobranza: cobranzaFallidos.length,
    meses, conDatos,
  }
}

// ───────────────────── Deserción por coach: UNA sola definición ────────────
// Los 4 candados y las frases viven en lib/desercion-coach.mjs. Aquí sólo se
// adapta su salida al vocabulario que usan las plantillas del FODA.
//
// Antes esto era una RÉPLICA a mano de los mismos umbrales (15 / 3 / 1,5 / 3) y
// ya divergía: la lista de "vigilar" se calculaba con `pctCoach > pctCentro` en
// vez del exceso ≥ 1 niño del módulo, así que el Resumen y el FODA señalaban a
// personas distintas, con nombre y apellido, en el mismo trimestre.
export function alertasCoachDesdeFilas(filas = [], { sinCoach = 0 } = {}) {
  const r = alertasDeCoach(filas, { sinCoach })
  const adaptar = (c) => ({
    ...c,
    pctCoach: c.pct ?? 0,
    pctCentro: r.pctCentro,
    excesoNinos: c.exceso,
    activos: Math.max(0, c.expuestos - c.bajasReales - c.graduados),
  })
  return {
    alertas: r.alertas.map(adaptar),
    vigilar: r.seguimiento.map(adaptar),
    retienen: r.enRango.map(adaptar).filter((c) => c.pctCoach < c.pctCentro),
    sinMuestra: r.sinMuestra.map(adaptar),
    totalBajas: r.bajasCentro,
    tasaCentro: r.pctCentro,
    sinCoach: r.sinCoach,
  }
}

// ───────────────────────── Contrato de una Oportunidad ─────────────────────
// <ACCIÓN> · Dueño: <quién> · Al: <AAAA-MM-DD> · Mueve: <métrica de X a Y>
export function lineaOportunidad({ accion, dueno, fecha, mueve }) {
  const limpia = String(accion || '').trim().replace(/[.\s]+$/, '')
  return `${limpia} · Dueño: ${String(dueno || '').trim()} · Al: ${String(fecha || '').trim()} · Mueve: ${String(mueve || '').trim().replace(/\.$/, '')}.`
}

const CAMPOS_OPORTUNIDAD = [
  ['Dueño', /·\s*Dueño:\s*\S/],
  ['Fecha', /·\s*Al:\s*\S/],
  ['Número que mueve', /·\s*Mueve:\s*\S/],
]

// Qué le falta a una línea para ser accionable. [] = cumple el contrato.
export function faltantesOportunidad(linea) {
  const texto = String(linea || '').trim()
  if (!texto) return []
  const faltan = CAMPOS_OPORTUNIDAD.filter(([, re]) => !re.test(texto)).map(([campo]) => campo)
  if (!/\d/.test(texto) && !faltan.includes('Número que mueve')) faltan.push('Número que mueve')
  return faltan
}

// Una línea diagnostica cuando trae un número Y una comparación: contra la
// meta, contra el mes anterior o contra el centro. "Meta 20+ nuevos ingresos"
// tiene un número y no diagnostica nada — es el nombre de la casilla. Esto es
// lo que deja a la vista el FODA viejo sin borrarle nada a nadie.
// Se amplía con las formas que el propio generador escribe ("Faltan 35 niños",
// "3 de 10 criterios"): el validador estaba acusando a las líneas que el
// sistema mismo produce —la amenaza de Nivel de ANCLAS salía marcada en
// amarillo—, y un aviso que regaña al generador enseña a ignorar los avisos.
const COMPARACION = /:|\bde\s+[\d.,]|%|≤|≥|<|>|\/mes|\bvs\b|\bcontra\b|→|\bfaltan?\s+[\d.,]|[\d.,]+\s*niños?/i
export function lineasSinDiagnostico(texto) {
  return String(texto || '').split('\n')
    .map((l) => l.trim())
    // Las líneas del sistema (prefijo "· ") no se validan: ya pasaron por su
    // propio contrato al generarse.
    .filter((l) => l && !l.startsWith(PREFIJO_GENERADO))
    .filter((l) => !(/\d/.test(l) && COMPARACION.test(l)))
}

// ───────────────────────────── FORTALEZAS ──────────────────────────────────
function fortalezas({ producto, crecimiento, net, monthsUsed, coach, graduacion, disciplina }) {
  const lineas = []
  if (producto.P1 === true) {
    lineas.push(`Meta de ventas cumplida: ${entero(producto.ventasQ)} nuevos ingresos contra ${entero(producto.metaQ)} exigidos en ${producto.mesesConDatos} ${producto.mesesConDatos === 1 ? 'mes' : 'meses'} con datos.`)
  }
  if (producto.P2 === true && producto.peorDesercion) {
    lineas.push(`Meta de deserción cumplida: el peor mes fue ${producto.peorDesercion.nombre} con ${pct1(producto.peorDesercion.desPct)} de deserción real (meta <${n1(producto.metaDesercion)}%).`)
  }
  if (producto.P3 === true && producto.peorCobranza) {
    lineas.push(`Meta de cobranza cumplida: el peor mes fue ${producto.peorCobranza.nombre} con ${entero(producto.peorCobranza.cobranza)} vencidas (meta ≤${entero(producto.metaCobranza)}).`)
  }
  if (crecimiento === 'CRECE' && net != null) {
    lineas.push(`El centro crece +${n1(net)} niños/mes al ritmo mediano de los últimos ${entero(monthsUsed)} cierres.`)
  }
  const retiene = (coach?.retienen || [])[0]
  if (retiene) {
    lineas.push(`${retiene.nombre} retiene: ${plural(retiene.bajasReales, 'baja', 'bajas')} en ${entero(retiene.expuestos)} niños (${pct1(retiene.pctCoach)}) contra ${pct1(retiene.pctCentro)} del centro.`)
  }
  // La graduación se mide por AÑO (graduarse toma 4–5 años); si no llega ese
  // dato se cae al trimestre y el texto lo dice, en vez de mentir el periodo.
  const anual = graduacion?.graduados != null
  const graduados = anual ? num(graduacion.graduados) : producto.graduadosQ
  const bajas = anual ? num(graduacion.bajas) : producto.bajasQ
  if (graduados > 0) {
    lineas.push(`${entero(graduados)} graduados en el ${anual ? 'año' : 'trimestre'}: son logro, no deserción (${entero(graduados)} de ${entero(bajas)} bajas).`)
  }
  const retencion = disciplina?.grupos?.retencion
  if (retencion && num(retencion.total) > 0 && num(retencion.si) === num(retencion.total)) {
    lineas.push(`Disciplina de retención completa: ${entero(retencion.si)} de ${entero(retencion.total)} criterios de peso alto en ${entero(disciplina.mesesRegistrados)} ${num(disciplina.mesesRegistrados) === 1 ? 'mes registrado' : 'meses registrados'}.`)
  }
  if (!lineas.length) {
    lineas.push(`Sin fortalezas medibles este trimestre: 0 de 3 metas de resultado cumplidas y ${net == null ? 'crecimiento sin calcular' : `crecimiento de ${n1(net)} niños/mes`}.`)
  }
  return lineas.slice(0, 5)
}

// ───────────────────────────── DEBILIDADES ─────────────────────────────────
// Cada línea = BRECHA + TRAYECTORIA. El dato, cuánto falta y a dónde lleva.
function debilidades({ producto, crecimiento, net, monthsUsed, ninosHoy, proyeccion6, coach, disciplina }) {
  const lineas = []
  if (producto.P1 === false) {
    const ritmo = producto.mesesConDatos > 0 ? producto.ventasQ / producto.mesesConDatos : 0
    const proy = Math.round(ritmo * producto.mesesDelTrimestre)
    const faltan = Math.max(0, producto.metaTrimestreCompleto - proy)
    lineas.push(`Ventas: ${entero(producto.ventasQ)} de ${entero(producto.metaQ)} (${entero(producto.metaQ > 0 ? (producto.ventasQ / producto.metaQ) * 100 : 0)}%). Al ritmo de ${n1(ritmo)}/mes cierras el trimestre en ${entero(proy)}; faltan ${entero(faltan)}.`)
  }
  if (producto.P2 === false && producto.peorDesercion) {
    const m = producto.peorDesercion
    lineas.push(`Deserción real sobre meta en ${m.nombre}: ${entero(m.desReal)} de ${entero(m.ninosInicio)} = ${pct1(m.desPct)} (meta <${n1(producto.metaDesercion)}%). En el trimestre ${entero(producto.desRealQ)} bajas reales.`)
  }
  if (producto.P3 === false && producto.peorCobranza) {
    lineas.push(`Cobranza vencida llegó a ${entero(producto.peorCobranza.cobranza)} en ${producto.peorCobranza.nombre} (meta ≤${entero(producto.metaCobranza)}). Meses fuera de meta: ${entero(producto.mesesFueraCobranza)} de ${entero(producto.mesesConDatos)}.`)
  }
  if (crecimiento === 'DECRECE' && net != null) {
    const destino = proyeccion6?.periodo ? ` ${entero(ninosHoy)} hoy → ${entero(proyeccion6.ninos)} en ${periodoLargo(proyeccion6.periodo)}.` : ''
    lineas.push(`El centro pierde ${n1(Math.abs(net))} niños/mes al ritmo mediano de los últimos ${entero(monthsUsed)} cierres:${destino || ` ${entero(ninosHoy)} hoy.`}`)
  } else if (crecimiento === 'PLANO' && net != null) {
    lineas.push(`El centro está plano: ${n1(net)} niños/mes en los últimos ${entero(monthsUsed)} cierres. Quedarse quieto no acerca el Nivel.`)
  }
  const alerta = (coach?.alertas || [])[0]
  if (alerta) {
    lineas.push(`La deserción se concentra en ${alerta.nombre}: ${entero(alerta.bajasReales)} de ${entero(coach.totalBajas)} bajas con coach identificado (${pct1(alerta.pctCoach)} de sus ${entero(alerta.expuestos)} niños contra ${pct1(alerta.pctCentro)} del centro).`)
  }
  const retencion = disciplina?.grupos?.retencion
  if (retencion && num(retencion.total) > 0 && num(retencion.si) < num(retencion.total)) {
    const faltan = num(retencion.total) - num(retencion.si)
    lineas.push(`Retención con huecos: ${entero(faltan)} de ${entero(retencion.total)} criterios de peso alto sin cumplir; son los que atacan las causas de retiro que el centro sí controla.`)
  }
  if (num(disciplina?.mesesRegistrados) < num(disciplina?.mesesEsperados)) {
    lineas.push(`Cumplimiento a medio registrar: ${entero(disciplina.mesesRegistrados)} de ${entero(disciplina.mesesEsperados)} meses del trimestre tienen checklist. Un mes sin registrar no es un mes cumplido.`)
  }
  if (!lineas.length) {
    lineas.push(`Sin debilidades de producto: las 3 metas se cumplen y el centro ${net == null ? 'no tiene crecimiento calculable' : `crece ${n1(net)} niños/mes`}.`)
  }
  return lineas.slice(0, 5)
}

// ──────────────────────────── OPORTUNIDADES ────────────────────────────────
// No se inventan: salen del motor (growth.recommendations), que ya trae acción,
// responsable, fecha y métrica con línea base y objetivo. Si a una le falta la
// métrica o el objetivo, se descarta — sin número no es una oportunidad.
const UNIDADES_SUFIJO = { indice: '', '%': '', ninos: ' niños', plazas: ' plazas' }

// El motor escribe sus métricas sin acentos (son claves internas). Aquí se
// traducen a español legible por `kind`, que es estable; si aparece un kind
// nuevo se cae al texto del motor y se lee igual de bien, solo sin tildes.
const METRICA_LEGIBLE = {
  data_quality: 'confianza de la proyección',
  capacity: 'capacidad máxima estimada',
  invitations: 'invitaciones a clase de prueba al mes',
  attendance: 'asistencia a clase de prueba',
  enrollment: 'conversión de asistencia a matrícula',
  class_loss: 'retiros por pérdida de clases al mes',
  technique: 'retiros por técnica al mes',
  schedule: 'retiros por horario al mes',
  activations: 'ingresos por activaciones al mes',
}

function textoMueve(rec) {
  const metrica = String(rec.metric || '').trim()
  const nombre = METRICA_LEGIBLE[rec.kind] || (metrica.charAt(0).toLowerCase() + metrica.slice(1))
  const unidad = rec.unit == null ? '' : (UNIDADES_SUFIJO[rec.unit] ?? ` ${rec.unit}`)
  const marca = rec.unit === '%' ? '%' : ''
  // Un índice de confianza se redondea a 2 decimales: 0,49 no es 0,5 — la
  // diferencia es justo la que separa "dato flojo" de "dato usable".
  const cifra = rec.unit === 'indice' ? n2 : n1
  // La unidad va UNA sola vez, al final: "de 2 a 1,5 retiros/mes".
  return `${nombre} de ${cifra(rec.baseline)}${marca} a ${cifra(rec.target)}${marca}${unidad}`
}

function textoImpacto(rec, nextLevel) {
  if (rec.impactType === 'enabler') {
    return nextLevel ? `desbloquea la fecha de Nivel ${nextLevel.level}` : 'desbloquea la proyección'
  }
  if (rec.impactType === 'capacity') return `${entero(rec.estimatedImpact)} plazas`
  if (rec.estimatedImpact == null) return 'impacto por validar'
  return `${num(rec.estimatedImpact) >= 0 ? '+' : ''}${n1(rec.estimatedImpact)} niños/mes`
}

// Fecha límite de una recomendación: la persistida manda; si el motor corrió
// sin persistir (el FODA solo lee) se reconstruye con sus días de plazo.
function fechaLimite(rec, hoy, fechaFinDeMes) {
  const persistida = rec.due_date || rec.dueDate
  // Una fecha ya vencida no es un plan, es una deuda: se dice así en vez de
  // entregar una tarea nacida tarde. (El compositor manual de la pantalla ya
  // exige fecha futura con `min={hoyISO()}`; el sistema no puede pedir algo que
  // él mismo incumple: el FODA de ANCLAS emitía "Al: 2026-09-02" un día 4.)
  if (persistida) {
    const f = String(persistida).slice(0, 10)
    return hoy && f < hoy ? `${fechaFinDeMes} (reprogramada; vencía el ${f})` : f
  }
  const dias = Number(rec.dueDays)
  if (hoy && Number.isFinite(dias)) {
    const d = new Date(`${hoy}T12:00:00Z`)
    d.setUTCDate(d.getUTCDate() + dias)
    const f = d.toISOString().slice(0, 10)
    return f < hoy ? fechaFinDeMes : f
  }
  return fechaFinDeMes
}

function oportunidades({ growth, fechaFinDeMes, hoy, ventasRitmo }) {
  const recs = (growth?.recommendations || []).filter((r) => r && r.metric && r.target != null && r.baseline != null)
  const orden = { data_quality: 0, capacity: 1 }
  const ordenadas = [...recs].sort((a, b) => (orden[a.kind] ?? 5) - (orden[b.kind] ?? 5) || num(b.priority) - num(a.priority))
  const nextLevel = growth?.projection?.nextLevel || null
  const lineas = ordenadas.map((rec) => lineaOportunidad({
    accion: rec.action || rec.title,
    dueno: rec.responsible || 'Administradora',
    fecha: fechaLimite(rec, hoy, fechaFinDeMes),
    mueve: `${textoMueve(rec)} (${textoImpacto(rec, nextLevel)})`,
  }))

  // El embudo que exige la meta comercial: sale de projection.requirements y
  // suele ser la más dura ("con 17 invitaciones al mes, 20 ventas es
  // aritméticamente imposible"). Solo si el motor no la trajo ya como
  // recomendación de invitaciones.
  const req = growth?.projection?.requirements
  const com = req?.commercial
  const tieneInvitaciones = ordenadas.some((r) => r.kind === 'invitations')
  if (!tieneInvitaciones && com?.weeklyInvitations != null && com?.monthlyInvitations != null && com?.salesPerMonth) {
    // El ritmo de ventas que se muestra es el MISMO del trimestre que aparece
    // en la debilidad de ventas. Dos ritmos distintos en el mismo FODA (la
    // mediana de 6 meses y el ritmo del trimestre) se leen como un error.
    const ventasHoy = ventasRitmo != null ? ventasRitmo : num(growth?.metrics?.medians?.sales)
    const conversion = num(growth?.metrics?.rates?.inviteToEnrollment) * 100
    lineas.push(lineaOportunidad({
      accion: `Subir invitaciones a clase de prueba a ${entero(com.weeklyInvitations)} por semana`,
      dueno: 'Administradora',
      fecha: fechaFinDeMes,
      mueve: `ventas de ${n1(ventasHoy)} a ${entero(com.salesPerMonth)}/mes (requiere ${entero(com.monthlyInvitations)} invitaciones/mes con la conversión actual de ${pct1(conversion)})`,
    }))
  }
  return lineas.slice(0, 5)
}

// ─────────────────────────────── AMENAZAS ──────────────────────────────────
// Lo que el centro no controla del todo, cuantificado.
function amenazas({ producto, growth, coach, motivos, crecimiento }) {
  const lineas = []
  const alerta = (coach?.alertas || [])[0]
  if (alerta && coach.totalBajas > 0) {
    const share = (alerta.bajasReales / coach.totalBajas) * 100
    lineas.push(`${alerta.nombre} concentra el ${pct1(share)} de las bajas con coach identificado del trimestre (${entero(alerta.bajasReales)} de ${entero(coach.totalBajas)}); si se va, se va con ${entero(alerta.activos)} niños a cargo.`)
  }
  const economico = num(motivos?.economico)
  if (economico > 0 && producto.desRealQ > 0) {
    lineas.push(`${entero(economico)} de ${entero(producto.desRealQ)} bajas reales del trimestre son económicas: es el bolsillo del padre, no la operación.`)
  }
  const faltantes = growth?.metrics?.window?.missingPeriods || []
  const confianza = growth?.metrics?.confidence
  if (faltantes.length) {
    const meses = faltantes.map((p) => periodoLargo(p)).filter(Boolean).join(', ')
    const sinFecha = !growth?.projection?.scenarios?.base?.targetMonth
    lineas.push(`Sin cierre en la ventana de 6 meses: ${meses}. La confianza cae a ${n2(confianza?.score)}${sinFecha ? ' y no hay fecha estimada de Nivel' : ''}.`)
  }
  const nextLevel = growth?.projection?.nextLevel
  const nivelActual = growth?.projection?.currentLevel
  if (nextLevel) {
    const objetivo = growth?.projection?.scenarios?.base?.targetMonth
    const rumbo = crecimiento === 'DECRECE' ? 'y al ritmo actual el centro se aleja, no se acerca'
      : crecimiento === 'PLANO' ? 'y al ritmo actual el centro no se mueve'
      : objetivo ? `y al ritmo actual llegas en ${periodoLargo(objetivo)}`
      : 'y al ritmo actual la fecha queda fuera de los 12 meses proyectados'
    lineas.push(`Nivel ${entero(nivelActual)}. Faltan ${entero(nextLevel.gap)} niños para el Nivel ${entero(nextLevel.level)} ${rumbo}.`)
  }
  const capacidad = growth?.projection?.capacityMax
  if (nextLevel && capacidad == null) {
    lineas.push(`Capacidad física sin verificar: no hay un tope confirmado para los ${entero(nextLevel.gap)} niños que faltan al Nivel ${entero(nextLevel.level)}.`)
  } else if (nextLevel && capacidad != null && capacidad < nextLevel.threshold) {
    lineas.push(`Capacidad configurada en ${entero(capacidad)} niños contra ${entero(nextLevel.threshold)} que exige el Nivel ${entero(nextLevel.level)}: faltan ${entero(nextLevel.threshold - capacidad)} plazas.`)
  }
  if (!lineas.length && producto.mesesConDatos > 0) {
    lineas.push(`Sin amenazas cuantificadas: ${entero(producto.mesesConDatos)} de ${entero(producto.mesesDelTrimestre)} meses con datos y sin concentración de deserción por coach.`)
  }
  return lineas.slice(0, 5)
}

// ─────────────────────── Veredicto de crecimiento ──────────────────────────
// Misma banda muerta que el semáforo del Resumen: ±0,5 niños/mes es ruido de
// redondeo del proyector, no una tendencia.
export function verdictoCrecimientoFoda(monthlyNet) {
  if (monthlyNet == null || !Number.isFinite(Number(monthlyNet))) return 'INDETERMINADO'
  const net = Number(monthlyNet)
  if (net >= 0.5) return 'CRECE'
  if (net <= -0.5) return 'DECRECE'
  return 'PLANO'
}

// ─────────────────────────── Ensamblado final ──────────────────────────────
export function construirFoda(entrada = {}) {
  const { growth = null, coach = null, disciplina = null, graduacion = null, motivos = null, fechaFinDeMes = '', hoy = null } = entrada
  const producto = entrada.producto || evaluarProductoFoda(entrada)
  const net = growth?.projection?.scenarios?.base?.monthlyNet ?? null
  const crecimiento = verdictoCrecimientoFoda(net)
  const monthsUsed = num(growth?.metrics?.monthsUsed ?? growth?.metrics?.window?.months)
  const ninosHoy = num(growth?.projection?.currentChildren)
  const serie = growth?.projection?.scenarios?.base?.series || []
  const seisMeses = serie[5] || serie[serie.length - 1] || null
  const proyeccion6 = seisMeses ? { periodo: seisMeses.period, ninos: seisMeses.endChildren } : null

  return {
    producto,
    crecimiento,
    monthlyNet: net,
    fortalezas: fortalezas({ producto, crecimiento, net, monthsUsed, coach, graduacion, disciplina }),
    debilidades: debilidades({ producto, crecimiento, net, monthsUsed, ninosHoy, proyeccion6, coach, disciplina }),
    oportunidades: oportunidades({
      growth, fechaFinDeMes, hoy,
      ventasRitmo: producto.mesesConDatos > 0 ? producto.ventasQ / producto.mesesConDatos : null,
    }),
    amenazas: amenazas({ producto, growth, coach, motivos, crecimiento }),
  }
}

// Quita el prefijo SOLO si abre la línea: una oportunidad lleva '·' también en
// el medio ("acción · Dueño: …") y un replace suelto la partiría.
export function sinPrefijo(linea) {
  const texto = String(linea || '').trim()
  return texto.startsWith(PREFIJO_GENERADO) ? texto.slice(PREFIJO_GENERADO.length).trim() : texto
}

// ── Fusión con lo que escribió la administradora ───────────────────────────
// Lo generado lleva el prefijo '· '. Regenerar reemplaza SOLO esas líneas y
// conserva, al final, todo lo que ella escribió a mano (incluido el FODA viejo
// de etiquetas: no se borra nada de nadie).
//
// ponytail: el prefijo '· ' es TODA la marca de autoría.
//   Techo: si la administradora empieza una línea suya con '· ', al regenerar
//   se la lleva por delante — no hay forma de distinguirlas en un TEXT plano.
//   Salida: cuando el FODA deje de ser un textarea y pase a filas propias
//   (una tabla con origen y autor), la marca sale del texto y esto desaparece.
export function fusionarGenerado(textoActual, lineasGeneradas) {
  const propias = String(textoActual || '').split('\n')
    .filter((l) => l.trim() && !l.trim().startsWith(PREFIJO_GENERADO))
  const generadas = (lineasGeneradas || []).map((l) => `${PREFIJO_GENERADO}${l}`)
  return [...generadas, ...propias].join('\n')
}

// Líneas CON prefijo que ya no coinciden con ninguna que el motor produzca
// ahora: o las editó una persona, o su diagnóstico desapareció. En ambos casos
// `fusionarGenerado` las va a reescribir.
//
// Por qué no se conservan automáticamente: los números de una línea generada
// cambian en cuanto cambian los datos ("Ventas: 14 de 60" → "20 de 60"), así
// que "no coincide" NO puede leerse como "la tocó un humano" — hacerlo llenaría
// el cuadrante de diagnósticos viejos duplicados en cada regeneración. Lo que
// sí se puede hacer es no perder nada en silencio: la pantalla avisa antes de
// reescribir, que era el problema real (la pantalla prometía "lo que escribas
// tú se conserva" y a la vez se comía la línea editada).
export function edicionesGeneradas(textoActual, lineasGeneradas) {
  const nuevas = new Set((lineasGeneradas || []).map((l) => String(l).trim()))
  return String(textoActual || '').split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith(PREFIJO_GENERADO))
    .filter((l) => !nuevas.has(l.slice(PREFIJO_GENERADO.length).trim()))
}
