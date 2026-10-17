import { filtrarClasesPorMes, filtrarClasesPorMomento, resumirClases, mesClase, conversionClases } from '../clases-prueba.mjs'
import { fechaCivil, rangoSemana, ultimasSemanas } from '../semana-cierre.mjs'
import { resumenCpSemana } from './calculo.mjs'

// Una lectura del CRM alimenta agenda, semanas y mes; el porcentaje siempre
// compara personas de las mismas clases iniciadas, nunca incluye futuras.
export function resumenClasesPrueba({ clases = [], semanaAbierta, timeZone = 'America/Panama', now = new Date() }) {
  const hoy = fechaCivil(now, timeZone)
  const mes = mesClase(now, timeZone)
  const realizadas = filtrarClasesPorMomento(clases, 'realizadas', now)
  const resumen = rango => ({ ...rango, ...resumenCpSemana({ clases, ...rango, timeZone, now }),
    ...conversionClases(realizadas.filter(c => {
      const fecha = fechaCivil(c.start_date, timeZone)
      return fecha >= rango.desde && fecha <= rango.hasta
    })) })
  const semanas = ultimasSemanas(semanaAbierta, 6).map(fin => ({
    ...resumen(rangoSemana(fin)), abierta: fin === semanaAbierta,
  }))
  const futuras = filtrarClasesPorMomento(clases, 'proximas', now)
  const registros = resumirClases(futuras).total
  const porFecha = new Map()
  for (const clase of futuras) {
    if (!clase.stats.total) continue
    const fecha = fechaCivil(clase.start_date, timeZone)
    porFecha.set(fecha, (porFecha.get(fecha) || 0) + clase.stats.total)
  }
  const fechas = [...porFecha].sort(([a], [b]) => a.localeCompare(b)).map(([fecha, invitados]) => ({ fecha, invitados }))
  const actual = semanas.at(-1)
  // El mes usa el mismo filtro de zona horaria que la pantalla de Clases de Prueba.
  const clasesMes = filtrarClasesPorMes(clases, mes, timeZone)
  const realizadasMes = filtrarClasesPorMomento(clasesMes, 'realizadas', now)
  const totalesMes = resumirClases(realizadasMes)
  return {
    actual,
    ultimoCierre: semanas.at(-2),
    seisSemanas: resumen({ desde: semanas[0].desde, hasta: actual.hasta }),
    semanas,
    mes: { desde: `${mes}-01`, hasta: hoy, invitados: totalesMes.total, asistentes: totalesMes.attended,
      porcentaje: totalesMes.total ? totalesMes.attended / totalesMes.total * 100 : null, clases: realizadasMes.length, ...conversionClases(realizadasMes) },
    proximas: { invitados: registros, fechas,
      estaSemana: fechas.filter(f => f.fecha >= actual.desde && f.fecha <= actual.hasta).reduce((n, f) => n + f.invitados, 0),
      esteMes: resumirClases(filtrarClasesPorMomento(clasesMes, 'proximas', now)).total },
  }
}
