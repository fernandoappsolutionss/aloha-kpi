// Atractivo de franjas horarias — cálculo puro, sin BD.
// Por ser extracurricular, unos horarios son mucho más atractivos que otros y
// cada centro tiene su dinámica. Este módulo usa la estadística que el centro
// va acumulando (tamaño de sus grupos por franja y deserciones por motivo
// HORARIO) para estimar qué tan rápido se llenaría un grupo nuevo en un hueco,
// y recomendar dónde abrir el próximo.
import { aMinutos, aHora12, DIAS_OPERATIVOS, huecosDe, coachesLibresEn, INICIO_VENDIBLE_SEMANA, FIN_VENDIBLE_SABADO, ventanaVendible } from './inventario'
import { DIAS } from './operaciones'

const TOLERANCIA_MIN = 60 // sesiones a ±1 h cuentan como "la misma franja"

// Regla de demanda (Fernando): entre semana los niños salen del colegio ~1 pm
// y los padres prefieren horarios desde las 3:30 pm; el sábado las jornadas
// van de 9 am a 5 pm. (Ventana vendible definida en lib/inventario.)
const esSabado = (d) => d === 6

// Dentro de un hueco, la hora a la que de verdad conviene abrir: entre semana
// se corre hasta las 3:30 pm si el hueco lo permite.
export function inicioVendible(dia, hueco) {
  const [vi] = ventanaVendible(dia)
  if (hueco.inicio >= vi) return hueco.inicio
  // Lo más tarde posible sin pasar del inicio vendible, dejando espacio para 1 h.
  return Math.max(hueco.inicio, Math.min(vi, hueco.fin - 60))
}

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
  // Sábado y entre-semana no se mezclan: son dinámicas de venta distintas.
  const mismoTipo = (o) => esSabado(o.dia) === esSabado(dia)
  const exacta = obs.filter((o) => o.dia === dia && cerca(o))
  const mismoDia = obs.filter((o) => o.dia === dia)
  const mismaHora = obs.filter((o) => cerca(o) && mismoTipo(o))
  const prom = (xs) => xs.reduce((a, o) => a + o.ninos, 0) / xs.length

  let base = null
  let razon = 'Sin historial en esta franja todavía.'
  let n = 0
  const plural = (x) => (x === 1 ? 'grupo promedia' : 'grupos promedian')
  if (exacta.length) {
    base = prom(exacta); n = exacta.length
    razon = `${n} ${plural(n)} ${base.toFixed(1)} niños en ${DIAS[dia].toLowerCase()} ~${aHora12(inicioMin)}.`
  } else if (mismoDia.length && mismaHora.length) {
    base = (prom(mismoDia) + prom(mismaHora)) / 2; n = mismoDia.length + mismaHora.length
    razon = `${DIAS[dia]} promedia ${prom(mismoDia).toFixed(1)} niños/grupo y la hora ~${aHora12(inicioMin)} promedia ${prom(mismaHora).toFixed(1)}.`
  } else if (mismoDia.length) {
    base = prom(mismoDia); n = mismoDia.length
    razon = `${n} ${plural(n)} ${base.toFixed(1)} niños los ${DIAS[dia].toLowerCase()}.`
  } else if (mismaHora.length) {
    base = prom(mismaHora); n = mismaHora.length
    razon = `${n} ${plural(n)} ${base.toFixed(1)} niños a ~${aHora12(inicioMin)} (otros días similares).`
  }
  const fugas = desercionesHorario(retirados, grupos).filter((d) => d.dia === dia && Math.abs(d.inicio - inicioMin) <= TOLERANCIA_MIN).length
  let score = base == null ? null : Math.max(0, base - fugas * 1.5)
  if (fugas && base != null) razon += ` Ojo: ${fugas} retiro${fugas === 1 ? '' : 's'} por horario en esta franja.`

  // Regla de demanda escolar: entre semana antes de 3:30 pm es muy difícil
  // vender. Solo la estadística REAL de esa franja exacta puede contradecirla
  // (cada centro tiene su dinámica; si un centro sí llena a esa hora, sus
  // datos mandan).
  if (!exacta.length) {
    const [vi, vf] = ventanaVendible(dia)
    if (inicioMin < vi || inicioMin >= vf) {
      score = score == null ? 3 : Math.min(score, 4)
      razon = esSabado(dia)
        ? 'Las jornadas del sábado van de 9:00 am a 5:00 pm; después casi no se vende.'
        : 'Entre semana antes de 3:30 pm casi no se vende: los niños salen del colegio ~1:00 pm y los padres prefieren desde las 3:30 pm.'
    }
  }

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
        // Entre semana el bloque recomendado arranca en la hora vendible (3:30 pm).
        const ini = inicioVendible(dia, h)
        const cabe2 = h.fin - ini >= 120
        const fin = ini + (cabe2 ? 120 : 60)
        const at = atractivoDe(grupos, retirados, dia, ini)
        out.push({
          dia,
          inicio: ini,
          fin,
          salon: s,
          cabe2h: cabe2,
          coachesLibres: coachesLibresEn(activos, coaches, dia, ini, fin),
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
