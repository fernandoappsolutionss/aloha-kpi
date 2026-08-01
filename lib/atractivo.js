// Atractivo de franjas horarias — cálculo puro, sin BD.
// Por ser extracurricular, unos horarios son mucho más atractivos que otros y
// cada centro tiene su dinámica. Este módulo usa la estadística que el centro
// va acumulando (tamaño de sus grupos por franja y deserciones por motivo
// HORARIO) para estimar qué tan rápido se llenaría un grupo nuevo en un hueco,
// y recomendar dónde abrir el próximo.
import { aMinutos, aHora, DIAS_OPERATIVOS, huecosDe, coachesLibresEn } from './inventario'
import { DIAS } from './operaciones'

const TOLERANCIA_MIN = 60 // sesiones a ±1 h cuentan como "la misma franja"

// Muestras: cada sesión de un grupo con niños es una observación del apetito
// por esa franja (se incluyen grupos cerrados/fusionados: también son historia).
function muestras(grupos) {
  const out = []
  for (const g of grupos) {
    const n = (g.estudiantes || []).length
    if (!n) continue
    for (const h of g.horarios || []) {
      out.push({ dia: h.dia, inicio: aMinutos(h.hora_inicio), ninos: n, numero: g.numero })
    }
  }
  return out
}

// Deserciones por motivo HORARIO agrupadas por franja del grupo de origen.
function desercionesHorario(retirados, grupos) {
  const porGrupo = new Map(grupos.map((g) => [String(g.id), g]))
  const out = []
  for (const r of retirados || []) {
    if (r.motivo_retiro !== 'HORARIO') continue
    const g = porGrupo.get(String(r.grupo_id))
    for (const h of g?.horarios || []) out.push({ dia: h.dia, inicio: aMinutos(h.hora_inicio) })
  }
  return out
}

// Atractivo estimado de abrir un grupo en (dia, inicioMin).
// → { score, etiqueta, razon, n } — score ≈ niños esperados por franja.
export function atractivoDe(grupos, retirados, dia, inicioMin) {
  const obs = muestras(grupos)
  const cerca = (o) => Math.abs(o.inicio - inicioMin) <= TOLERANCIA_MIN
  const exacta = obs.filter((o) => o.dia === dia && cerca(o))
  const mismoDia = obs.filter((o) => o.dia === dia)
  const mismaHora = obs.filter((o) => cerca(o))
  const prom = (xs) => xs.reduce((a, o) => a + o.ninos, 0) / xs.length

  let base = null
  let razon = 'Sin historial en esta franja todavía.'
  let n = 0
  const plural = (x) => (x === 1 ? 'grupo promedia' : 'grupos promedian')
  if (exacta.length) {
    base = prom(exacta); n = exacta.length
    razon = `${n} ${plural(n)} ${base.toFixed(1)} niños en ${DIAS[dia].toLowerCase()} ~${aHora(inicioMin)}.`
  } else if (mismoDia.length && mismaHora.length) {
    base = (prom(mismoDia) + prom(mismaHora)) / 2; n = mismoDia.length + mismaHora.length
    razon = `${DIAS[dia]} promedia ${prom(mismoDia).toFixed(1)} niños/grupo y la hora ~${aHora(inicioMin)} promedia ${prom(mismaHora).toFixed(1)}.`
  } else if (mismoDia.length) {
    base = prom(mismoDia); n = mismoDia.length
    razon = `${n} ${plural(n)} ${base.toFixed(1)} niños los ${DIAS[dia].toLowerCase()}.`
  } else if (mismaHora.length) {
    base = prom(mismaHora); n = mismaHora.length
    razon = `${n} ${plural(n)} ${base.toFixed(1)} niños a ~${aHora(inicioMin)} (otros días).`
  }
  const fugas = desercionesHorario(retirados, grupos).filter((d) => d.dia === dia && Math.abs(d.inicio - inicioMin) <= TOLERANCIA_MIN).length
  const score = base == null ? null : Math.max(0, base - fugas * 1.5)
  if (fugas && base != null) razon += ` Ojo: ${fugas} retiro${fugas === 1 ? '' : 's'} por horario en esta franja.`

  let etiqueta = 'Sin historial'
  if (score != null) {
    if (score >= 9) etiqueta = 'Caliente'
    else if (score >= 7) etiqueta = 'Buena'
    else if (score >= 5.5) etiqueta = 'Media'
    else etiqueta = 'Difícil'
  }
  return { score, etiqueta, razon, n }
}

// Recomendaciones: los mejores huecos de la semana para abrir el próximo grupo,
// rankeados por probabilidad de llenarse rápido (estadística del propio centro).
// → [{ dia, inicio, fin, salon, score, etiqueta, razon, coachesLibres, cabe2h }]
export function recomendacionesApertura(grupos, salones, coaches, retirados, max = 5) {
  const activos = grupos.filter((g) => g.estado === 'activo')
  const out = []
  for (const dia of DIAS_OPERATIVOS) {
    for (const s of salones.filter((x) => x.activo)) {
      for (const h of huecosDe(activos, dia, s.id)) {
        const at = atractivoDe(grupos, retirados, dia, h.inicio)
        out.push({
          dia,
          inicio: h.inicio,
          fin: h.inicio + (h.cabe2h ? 120 : 60),
          salon: s,
          cabe2h: h.cabe2h,
          coachesLibres: coachesLibresEn(activos, coaches, dia, h.inicio, h.inicio + (h.cabe2h ? 120 : 60)),
          ...at,
        })
      }
    }
  }
  return out
    .sort((a, b) => (b.cabe2h - a.cabe2h) || ((b.score ?? -1) - (a.score ?? -1)) || (b.coachesLibres.length - a.coachesLibres.length))
    .slice(0, max)
}

// Guía del manual para franjas difíciles de llenar (fuentes: "Establecimiento
// de Calendarios" y "Protocolo de Salida de niños — herramientas de no salida").
// El manual no fija un descuento específico por horario difícil; estas son sus
// herramientas aprobadas más cercanas. Toda promo nueva la aprueba la
// Administración General (regla de franquicia).
export const GUIA_FRANJAS_DIFICILES = [
  'Apertura pegada a la quincena: los padres tienen flujo de efectivo para inscribir (estrategia comercial del manual).',
  'Usa las 2 primeras semanas de inducción para seguir sumando niños al grupo: Tiny acepta hasta la semana 4 del libro y Kids hasta la semana 2.',
  'Dirige la clase de prueba semanal hacia esa franja e informa el horario a VIRALSOLUTIONSS para la pauta en redes.',
  'Ofertas económicas escalonadas del protocolo (uso medido): 10% (sin límite) · 15% (máx. 3/mes) · 25% (máx. 2/mes) · 25% + 10% para terminar el nivel (máx. 1/mes).',
  'Clases de reposición gratis (1–2) como gancho de permanencia cuando el motivo es técnica o pérdida de clases.',
]
