// Subgrupos del aula y opciones de ancla en LOTE (R3 — spec
// docs/superpowers/specs/2026-08-08-remodelado-grupo-nino-design.md).
// PURO, sin BD ni React: la pantalla (app/centro/[id]/grupos/page.js) solo
// pinta lo que esto devuelve; aquí vive lo que se prueba en frío con node:test.
//
// El tab Itinerario del grupo tiene que responder dos preguntas:
//
//   1. ¿El aula va toda junta o va mezclada? Los niños que comparten
//      itinerario + nivel + ancla siguen EXACTAMENTE el mismo plan (es la
//      misma clave del memo de lib/plan-nino), así que cada combinación
//      distinta es UNA línea de tiempo distinta que el coach tiene que dictar.
//      Un grupo fusionado se ve así: dos niveles conviviendo en el mismo salón,
//      cada uno por su semana. El plan del GRUPO sigue siendo solo la
//      referencia del aula — nadie lo cursa por decreto.
//
//   2. ¿Qué fecha se le puede poner DE UNA a varios niños sin plan? Una opción
//      entra al lote solo si TODOS la tienen y con la MISMA fecha. La que no
//      (caso típico: cada quien se inscribió un día distinto) se descarta CON
//      MOTIVO — el lote no promedia fechas ni escoge por el admin: esos niños
//      se resuelven uno por uno.

import { ORIGENES_ANCLA } from './ancla-sugerencias.mjs'

// Fecha de la BD (Date del driver de Neon) o string ISO → 'AAAA-MM-DD' | null.
const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

const nivelDe = (n) => {
  const v = Number(n?.nivel)
  return Number.isFinite(v) ? v : null
}

// "KIDS 3" — el par itinerario+nivel es lo que comparte un montón homogéneo.
export function etiquetaNivel({ itinerario, nivel } = {}) {
  return `${itinerario || '—'} ${nivel ?? '?'}`
}

// Subgrupos homogéneos del aula: una entrada por combinación
// itinerario+nivel+ancla, con el plan derivado que YA trae el niño enriquecido
// (lib/plan-nino: e.plan.itinerario) — aquí no se deriva nada. Orden: los que
// arrancaron primero arriba; los que no tienen ancla, al final.
// → [{ clave, itinerario, nivel, ancla, estado, indiceSemana, semana, plan, ninos }]
export function subgruposDePlan(ninos) {
  const mapa = new Map()
  for (const n of ninos || []) {
    if (!n) continue
    const ancla = iso10(n.plan?.ancla ?? n.fecha_inicio_nivel)
    const nivel = nivelDe(n)
    const itinerario = n.itinerario || null
    const clave = `${itinerario}|${nivel}|${ancla || ''}`
    if (!mapa.has(clave)) {
      mapa.set(clave, {
        clave,
        itinerario,
        nivel,
        ancla,
        etiqueta: etiquetaNivel({ itinerario, nivel }),
        estado: n.plan?.estado || 'sin_plan',
        indiceSemana: n.plan?.indiceSemana ?? null,
        semana: n.plan?.semana || null,
        plan: n.plan?.itinerario || null,
        ninos: [],
      })
    }
    mapa.get(clave).ninos.push(n)
  }
  return [...mapa.values()].sort((a, b) => {
    if (!!a.ancla !== !!b.ancla) return a.ancla ? -1 : 1
    if (a.ancla && b.ancla && a.ancla !== b.ancla) return a.ancla < b.ancla ? -1 : 1
    if (a.itinerario !== b.itinerario) return String(a.itinerario).localeCompare(String(b.itinerario))
    return (a.nivel ?? 0) - (b.nivel ?? 0)
  })
}

// Los subgrupos que SÍ tienen línea de tiempo que dictar. El montón "sin plan"
// NO es otro plan: es el hueco del ancla que falta, y ya tiene su propio bloque
// (subgruposSinPlan). Contarlo como plan hacía que un aula homogénea con tres
// niños sin ancla se anunciara "mezclada" y pintara SU MISMA línea de tiempo
// dos veces (una como subgrupo, otra como referencia del aula).
export function subgruposConPlan(ninos) {
  return subgruposDePlan(ninos).filter((s) => s.ancla && s.estado !== 'sin_plan' && s.plan?.semanas?.length)
}

// Montones del aula por itinerario+nivel: EL LIBRO que se dicta. Dentro de un
// montón todos cursan lo mismo; lo que puede diferir es el día en que cada
// quien lo arrancó — el manual deja entrar niños hasta la semana 2 (KIDS) o 4
// (TINY) y `anclaDeAlta` (lib/retiros.mjs) le da a cada uno SU fecha. Esas
// cohortes son el mismo libro corrido, NO otro plan: un aula de 15 KIDS 2
// incorporados en semanas distintas es homogénea y su tab se ve como siempre
// (antes salían 15 líneas de tiempo y el cartel de "grupo mezclado").
// `ancla/plan/estado/indiceSemana/semana` solo se llenan cuando el montón
// tiene UNA cohorte: con varias no existe una línea de tiempo del montón, y
// pintar la de una cohorte con el nombre de todas sería mentir la fecha.
// → [{ clave, itinerario, nivel, etiqueta, ninos, cohortes[], ancla, plan, … }]
export function montonesConPlan(ninos) {
  const mapa = new Map()
  for (const sub of subgruposConPlan(ninos)) {
    const clave = `${sub.itinerario}|${sub.nivel}`
    if (!mapa.has(clave)) {
      mapa.set(clave, {
        clave,
        itinerario: sub.itinerario,
        nivel: sub.nivel,
        etiqueta: sub.etiqueta,
        cohortes: [],
        ninos: [],
      })
    }
    const m = mapa.get(clave)
    m.cohortes.push(sub)
    m.ninos.push(...sub.ninos)
  }
  // subgruposConPlan ya viene ordenado por ancla: el montón que arrancó
  // primero queda primero, y sus cohortes en el mismo orden.
  return [...mapa.values()].map((m) => {
    const unica = m.cohortes.length === 1 ? m.cohortes[0] : null
    return {
      ...m,
      ancla: unica?.ancla ?? null,
      estado: unica?.estado ?? null,
      indiceSemana: unica?.indiceSemana ?? null,
      semana: unica?.semana ?? null,
      plan: unica?.plan ?? null,
    }
  })
}

// ¿El aula va mezclada? Más de un LIBRO vivo (itinerario+nivel) en el mismo
// salón — el caso de la fusión: dos niveles conviviendo, cada uno por su
// semana. Sin niños, con todos en el mismo nivel (aunque hayan entrado en
// fechas distintas), o con la diferencia solo en los que no tienen ancla, el
// grupo es homogéneo y su tab se ve como siempre.
export function esGrupoMixto(ninos) {
  return montonesConPlan(ninos).length > 1
}

// ¿Este subgrupo (o montón de una sola cohorte) cursa EXACTAMENTE el plan de
// referencia del aula? Mismo itinerario, mismo nivel y misma fecha de inicio ⇒
// la misma línea de tiempo casilla por casilla (la plantilla depende solo del
// nivel). Se usa para no dibujarla dos veces en el mismo tab: la referencia del
// aula ya la pinta, y es la única que además deja suspender clases. Un montón
// escalonado (varias anclas) tiene `ancla: null` y nunca es la referencia.
export function siguePlanDelAula(sub, referencia) {
  const inicio = iso10(referencia?.fecha_inicio)
  const nivel = Number(referencia?.nivel)
  if (!sub?.ancla || !inicio || !Number.isFinite(nivel)) return false
  if (referencia?.itinerario && sub.itinerario !== referencia.itinerario) return false
  return sub.ancla === inicio && sub.nivel === nivel
}

// Los niños SIN plan agrupados por itinerario+nivel: cada montón comparte
// nivel, así que UNA sola fecha los resuelve a todos (fijarInicioNivelLote).
// El montón más grande va primero: es el que más pantalla ahorra.
export function subgruposSinPlan(ninos) {
  const mapa = new Map()
  for (const n of ninos || []) {
    if (!n) continue
    if ((n.plan?.estado || 'sin_plan') !== 'sin_plan') continue
    const nivel = nivelDe(n)
    const itinerario = n.itinerario || null
    const clave = `${itinerario}|${nivel}`
    if (!mapa.has(clave)) {
      mapa.set(clave, { clave, itinerario, nivel, etiqueta: etiquetaNivel({ itinerario, nivel }), ninos: [] })
    }
    mapa.get(clave).ninos.push(n)
  }
  return [...mapa.values()].sort(
    (a, b) =>
      b.ninos.length - a.ninos.length ||
      String(a.itinerario).localeCompare(String(b.itinerario)) ||
      (a.nivel ?? 0) - (b.nivel ?? 0),
  )
}

// Las opciones que se pueden aplicar a TODO un lote a la vez, a partir de las
// sugerencias por niño (lib/ancla-sugerencias.sugerenciasAncla): una fuente
// sobrevive solo si todos los niños la tienen y coinciden en la fecha. Con un
// solo niño devuelve sus opciones tal cual, así la pantalla usa el MISMO
// bloque para uno o para siete.
// → { opciones, recomendada, descartadas: [{ clave, etiqueta, motivo }] }
export function opcionesComunes(sugerencias) {
  const lista = (sugerencias || []).filter((s) => s && Array.isArray(s.opciones))
  if (!lista.length) return { opciones: [], recomendada: null, descartadas: [] }
  const opciones = []
  const descartadas = []
  for (const clave of ORIGENES_ANCLA) {
    const presentes = lista.map((s) => s.opciones.find((o) => o.clave === clave) || null).filter(Boolean)
    // Fuente que nadie tiene: no se ofrece ni se explica (no existe el caso).
    if (!presentes.length) continue
    const etiqueta = presentes[0].etiqueta
    // 'manual' siempre entra: es la salida de emergencia del admin.
    if (clave !== 'manual') {
      if (presentes.length < lista.length) {
        const faltan = lista.length - presentes.length
        descartadas.push({
          clave,
          etiqueta,
          motivo: `${faltan} de los ${lista.length} niños no tienen esa fuente: a esos hay que fijarlos uno por uno.`,
        })
        continue
      }
      const fechas = [...new Set(presentes.map((o) => o.fecha))].sort()
      if (fechas.length > 1) {
        descartadas.push({
          clave,
          etiqueta,
          motivo: `cada niño tiene su propia fecha (${fechas.join(' · ')}): en lote se pondría una sola y sería falsa para el resto.`,
        })
        continue
      }
    }
    opciones.push({ ...presentes[0] })
  }
  return { opciones, recomendada: opciones[0]?.clave || null, descartadas }
}

// ── Qué se escribe al fijar el ancla ────────────────────────────────────────
// La regla de fijarInicioNivel / fijarInicioNivelLote (app/actions/estudiantes.js)
// SIN BD: la acción trae las filas ya bloqueadas (FOR UPDATE) y esto decide a
// quién se le escribe. Aquí vive lo que se prueba en frío.

// Los ids del lote: únicos, enteros positivos y ORDENADOS — el orden ascendente
// es el mismo del lock (patrón de aplicarFusion), así dos ediciones cruzadas del
// mismo grupo no se traban entre sí.
export function idsDeLote(ids) {
  return [...new Set((ids || []).map(Number).filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b)
}

// → { error } | { ancla, cambios: [{ id, nombre, nivel, anclaAntes, cambia }], actualizados }
//
// IDEMPOTENTE: el niño que YA tiene esa misma fecha sale con `cambia: false` —
// ni UPDATE ni evento de rastro. Repetir el botón (o el doble clic) no ensucia
// la historia ni duplica eventos.
// TODO O NADA: un retirado, un niño sin grupo o una fila que ya no está en el
// centro abortan el LOTE COMPLETO con un error legible; nunca se escribe a
// medias (la acción corre todo esto dentro de UNA transacción).
export function preparaFijadoAncla({ ninos, ids, ancla } = {}) {
  const ancla10 = iso10(ancla)
  if (!ancla10) return { error: 'Falta la fecha de inicio de nivel.' }
  const pedidos = idsDeLote(ids)
  if (!pedidos.length) return { error: 'Selecciona al menos un niño para fijarle el inicio de nivel.' }
  const filas = (ninos || []).filter(Boolean)
  const encontrados = new Set(filas.map((n) => Number(n.id)))
  if (filas.length !== pedidos.length || pedidos.some((id) => !encontrados.has(id))) {
    return { error: 'Alguno de los niños ya no está en este centro. Recarga la pantalla antes de continuar.' }
  }
  const retirado = filas.find((n) => n.estado === 'retirado')
  if (retirado) {
    return { error: `${retirado.nombre} está retirado: su nivel ya no se planifica. Reincorpóralo primero si de verdad sigue en clases.` }
  }
  // (g1-8) El pendiente sin grupo NO lleva ancla: nace en su primera colocación,
  // junto con su evento de venta. Ponérsela aquí backdatearía el modelo.
  const suelto = filas.find((n) => n.grupo_id == null)
  if (suelto) {
    return { error: `${suelto.nombre} no tiene grupo: su inicio de nivel nace cuando lo coloques en uno. Asígnale grupo desde su ficha.` }
  }
  const cambios = filas.map((n) => {
    const anclaAntes = iso10(n.fecha_inicio_nivel)
    return {
      id: Number(n.id),
      nombre: n.nombre,
      nivel: Number(n.nivel),
      anclaAntes,
      cambia: anclaAntes !== ancla10,
    }
  })
  return { ancla: ancla10, cambios, actualizados: cambios.filter((c) => c.cambia).length }
}
