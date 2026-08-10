// Atractivo de franjas horarias — cálculo puro, sin BD.
// Por ser extracurricular, unos horarios son mucho más atractivos que otros y
// cada centro tiene su dinámica. Este módulo usa la estadística que el centro
// va acumulando (tamaño de sus grupos por franja y deserciones por motivo
// HORARIO) para estimar qué tan rápido se llenaría un grupo nuevo en un hueco,
// y recomendar dónde abrir el próximo.
import { aMinutos, aHora12, DIAS_OPERATIVOS, huecosDe, coachesLibresEn, ventanaVendible, aHora } from './inventario'
import { unidadesLibres } from './modelo'
import { DIAS } from './operaciones'

const TOLERANCIA_MIN = 60 // sesiones a ±1 h cuentan como "la misma franja"

// Regla de demanda (Fernando): entre semana los niños salen del colegio ~1 pm
// y las clases entre semana corren desde las 4:00 pm; el sábado las jornadas
// van de 9 am a 5 pm. (Ventana vendible definida en lib/inventario.)
const esSabado = (d) => d === 6

// Dentro de un hueco, la hora a la que de verdad conviene abrir: entre semana
// se corre hasta las 4:00 pm si el hueco lo permite.
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

  // Regla de demanda escolar: entre semana antes de 4:00 pm es muy difícil
  // vender. Solo la estadística REAL de esa franja exacta puede contradecirla
  // (cada centro tiene su dinámica; si un centro sí llena a esa hora, sus
  // datos mandan).
  if (!exacta.length) {
    const [vi, vf] = ventanaVendible(dia)
    if (inicioMin < vi || inicioMin >= vf) {
      score = score == null ? 3 : Math.min(score, 4)
      razon = esSabado(dia)
        ? 'Las jornadas del sábado van de 9:00 am a 5:00 pm; después casi no se vende.'
        : 'Entre semana antes de las 4:00 pm casi no se vende: los niños salen del colegio ~1:00 pm y la parrilla del modelo arranca a las 4:00 pm (zona Kinder: 2:45–3:45).'
    }
  }

  return { score, etiqueta: etiquetaDe(score), razon, n }
}

export function etiquetaDe(score) {
  if (score == null) return 'Sin historial'
  if (score >= 9) return 'Caliente'
  if (score >= 7) return 'Buena'
  if (score >= 5.5) return 'Media'
  return 'Difícil'
}

// Recomendaciones: SIEMPRE optimizan hacia el modelo de horarios del negocio
// (lib/modelo). Cada recomendación es una unidad completa del modelo (par
// Lun+Mié o Mar+Jue de 1 h, viernes 2 h, o jornada de sábado), rankeada con la
// estadística del propio centro.
// → [{ tipo, titulo, sesiones, salon, score, etiqueta, razon, coachesLibres, horariosForm }]
export function recomendacionesApertura(grupos, salones, coaches, retirados, max = 5) {
  const activos = grupos.filter((g) => g.estado === 'activo')
  const out = unidadesLibres(activos, salones).map((u) => {
    const ats = u.sesiones.map((ses) => atractivoDe(grupos, retirados, ses.dia, ses.inicio))
    const conDatos = ats.filter((x) => x.score != null)
    const score = conDatos.length ? conDatos.reduce((acc, x) => acc + x.score, 0) / conDatos.length : null
    // Coaches libres en TODAS las sesiones de la unidad (el grupo es uno solo).
    let libres = coaches.filter((c) => c.activo)
    for (const ses of u.sesiones) {
      const ids = new Set(coachesLibresEn(activos, coaches, ses.dia, ses.inicio, ses.fin).map((c) => String(c.id)))
      libres = libres.filter((c) => ids.has(String(c.id)))
    }
    return {
      ...u,
      score,
      etiqueta: etiquetaDe(score),
      razon: (conDatos[0] || ats[0]).razon,
      coachesLibres: libres,
      horariosForm: u.sesiones.map((ses) => ({ dia: ses.dia, hora_inicio: aHora(ses.inicio), hora_fin: aHora(ses.fin), salon_id: String(ses.salon_id) })),
    }
  })
  return out
    .sort((x, y) => ((y.score ?? -1) - (x.score ?? -1)) || (y.coachesLibres.length - x.coachesLibres.length))
    .slice(0, max)
}

// Para el click en un hueco del calendario: la unidad del modelo que mejor
// encaja ahí (una de sus sesiones cae en ese día/salón dentro del hueco).
export function unidadParaHueco(grupos, salones, dia, salonId, hueco) {
  const activos = grupos.filter((g) => g.estado === 'activo')
  const candidatas = unidadesLibres(activos, salones.filter((s) => String(s.id) === String(salonId)))
    .filter((u) => u.sesiones.some((ses) => ses.dia === dia && ses.inicio >= hueco.inicio && ses.fin <= hueco.fin))
  if (!candidatas.length) return null
  candidatas.sort((x, y) => x.sesiones[0].inicio - y.sesiones[0].inicio)
  return candidatas[0]
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
