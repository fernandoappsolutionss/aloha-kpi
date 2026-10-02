// Reutiliza las reglas operativas del KPI mensual; solo cambia el corte temporal.
import { iniciosClase, retirosActivosMes } from '../inicios-clase.mjs'
import { inscripcionesCanonicas } from '../kpi-semanal-auto.mjs'
import { eventosSinMatriculasAnuladas } from '../anulacion-matricula.mjs'
import { semanaDiaKpi } from '../zoho-cobranza.mjs'
import { filtrarClasesPorMomento, resumirClases } from '../clases-prueba.mjs'
import { sumarDias, fechaCivil, juevesDeCierre } from '../semana-cierre.mjs'

const iso10 = (v) => !v ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
const finDeMes = (y, m) => `${y}-${String(m).padStart(2, '0')}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`
const enRango = (f, desde, hasta) => Boolean(f && f >= desde && f <= hasta)
const validarFecha = (f) => { if (f) juevesDeCierre(f); return f }

export function poblacionAlCorte({ inicioMes, estudiantes = [], grupos = [], eventos = [], corte }) {
  if (inicioMes == null) return { valor: null, detalle: { error: 'Falta el cierre del mes anterior.' } }
  const y = Number(corte.slice(0, 4))
  const m = Number(corte.slice(5, 7))
  const prefijo = corte.slice(0, 7)
  const fin = finDeMes(y, m)
  const nuevos = iniciosClase(estudiantes, grupos, eventos).filter((fila) => validarFecha(fila.fechaInicio).startsWith(prefijo) && fila.fechaInicio <= corte).length
  const delMes = (e) => e.year != null && e.month != null
    ? Number(e.year) === y && Number(e.month) === m
    : iso10(e.fecha)?.startsWith(prefijo)
  const reincorporados = eventos.filter((e) => e.tipo === 'reincorporacion' && delMes(e) && (validarFecha(iso10(e.fecha)) || fin) <= corte).length
  const retirados = retirosActivosMes(estudiantes, grupos, eventos, y, m).filter((e) => (validarFecha(iso10(e.fecha)) || fin) <= corte).length
  return { valor: Number(inicioMes) + nuevos + reincorporados - retirados, detalle: { inicioMes: Number(inicioMes), nuevos, reincorporados, retirados } }
}

export function ventasSemana({ estudiantes = [], eventos = [], desde, hasta }) {
  const canon = inscripcionesCanonicas(eventosSinMatriculasAnuladas(estudiantes, eventos).filter((e) => e.tipo === 'inscripcion'))
  let valor = 0; let sinFecha = 0
  for (const e of canon) {
    const fecha = iso10(e.fecha)
    if (!fecha) { sinFecha++; continue }
    validarFecha(fecha)
    if (e.origen !== 'traslado' && enRango(fecha, desde, hasta)) valor++
  }
  return { valor, detalle: sinFecha ? { excluidosSinFecha: sinFecha } : {} }
}

export function retirosSemana({ estudiantes = [], grupos = [], eventos = [], desde, hasta }) {
  const meses = new Map([desde, hasta].map((fecha) => [fecha.slice(0, 7), { y: Number(fecha.slice(0, 4)), m: Number(fecha.slice(5, 7)) }]))
  let valor = 0; let sinFecha = 0
  for (const { y, m } of meses.values()) {
    const fin = finDeMes(y, m)
    for (const e of retirosActivosMes(estudiantes, grupos, eventos, y, m)) {
      if (String(e.motivo || '').toUpperCase() === 'GRADUADO') continue
      if (!e.fecha) sinFecha++
      if (enRango(validarFecha(iso10(e.fecha)) || fin, desde, hasta)) valor++
    }
  }
  return { valor, detalle: sinFecha ? { retirosSinFechaAsignadosAFinDeMes: sinFecha } : {} }
}

export function cobranzaAlCorte({ diaria = [], filasKpi = [], desde, hasta, hoy }) {
  const tope = hoy < hasta ? hoy : hasta
  for (let d = tope; d >= desde; d = sumarDias(d, -1)) {
    const fila = diaria.find((r) => iso10(r.fecha) === d)
    if (fila) return { valor: Number(fila.vencidas), detalle: { fecha: d, fuente: 'cobranza_diaria' } }
  }
  for (let d = tope; d >= desde; d = sumarDias(d, -1)) {
    const casilla = semanaDiaKpi(d)
    if (!casilla) continue
    const fila = filasKpi.find((r) => Number(r.year) === Number(d.slice(0, 4)) && Number(r.month) === Number(d.slice(5, 7)) && Number(r.semana) === casilla.semana)
    const valor = fila?.[`cob_d${casilla.dia}`]
    if (valor != null) return { valor: Number(valor), detalle: { fecha: d, fuente: 'kpi_semanas' } }
  }
  return { valor: null, detalle: { error: 'No hay conteo de Zoho en la semana.' } }
}

export function cpAsistidasSemana({ clases = [], desde, hasta, timeZone = 'America/Panama', now = new Date() }) {
  const realizadas = filtrarClasesPorMomento(clases, 'realizadas', now)
    .filter((c) => enRango(fechaCivil(new Date(c.start_date), timeZone), desde, hasta))
  return { valor: resumirClases(realizadas).attended, detalle: { clases: realizadas.length } }
}
