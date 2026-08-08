// Llenado de grupos — ventana de niños NUEVOS, ritmo de llenado y sugerencias
// del manual. Cálculo puro, sin BD.
//
// El cierre de llenado es un ESTADO DERIVADO del itinerario vigente: este
// módulo no muta ningún flag. La palanca manual `inscripcion_abierta` sigue
// siendo de Fernando (cerrada = no entra NADIE, db/schema.sql:355-359); lo que
// se deriva aquí es solo la ventana de niños NUEVOS del manual. Al pasar de
// nivel el itinerario trae una semana límite nueva y la ventana se reabre sola.
//
// Regla del manual (lib/itinerario.js:6-7): "Las 2 PRIMERAS semanas son de
// INDUCCIÓN (permiten incorporar niños nuevos; TINY acepta nuevos hasta la
// semana 4 del libro, KIDS solo hasta la 2)". KINDER no tiene semana límite.

const DIA_MS = 24 * 60 * 60 * 1000

// Una fecha de la BD llega como Date (el driver de Neon devuelve DATE así) o
// como string ISO. SIEMPRE normalizar a 'AAAA-MM-DD' antes de comparar —
// misma lección que fechaIso10 de lib/operaciones.js, local aquí para que el
// módulo siga siendo puro e importable desde los tests .mjs.
const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

const utcDe = (fechaIso) => {
  const [y, m, d] = String(fechaIso).slice(0, 10).split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

// Días entre dos fechas iso10 (hasta − desde; negativo = ya pasó).
const diasEntre = (desde, hasta) => Math.round((utcDe(hasta) - utcDe(desde)) / DIA_MS)

const round1 = (x) => Math.round(x * 10) / 10

// Semana del LIBRO hasta la que un grupo iniciado acepta niños nuevos
// (regla del manual, lib/itinerario.js:6-7). KINDER no aparece: exento.
export const SEMANA_LIMITE_NUEVOS = { TINY: 4, KIDS: 2 }

// itinerario_clases llega como objeto (JSONB) o, defensivamente, como string.
const itinerarioDe = (grupo) => {
  const it = grupo?.itinerario_clases
  if (it == null) return null
  if (typeof it === 'string') {
    try { return JSON.parse(it) } catch { return {} } // corrupto ≠ ausente: se marca inválido, no exento
  }
  return it
}

// Fecha límite para incorporar niños NUEVOS al grupo, derivada del itinerario
// del nivel VIGENTE. Lookup EXACTO por etiqueta `corto` de la semana (nunca por
// índice: los feriados corren el plan y los repasos/mental days se intercalan).
// → { fechaLimite: 'AAAA-MM-DD'|null, razon: 'exento'|'sin_itinerario_valido'|null, extendida }
//   - 'exento': KINDER, programa sin regla o grupo sin itinerario (no hay límite).
//   - 'sin_itinerario_valido': itinerario legacy sin tipo/corto o sin la semana
//     límite — preflight: NUNCA cerrar a ciegas con datos viejos.
//   - `llenado_extendido_hasta` (override manual con rastro) manda solo si es
//     POSTERIOR a la fecha límite derivada; vence sola.
export function fechaLimiteNuevos(grupo) {
  const programa = String(grupo?.itinerario || '').toUpperCase()
  const semanaLimite = SEMANA_LIMITE_NUEVOS[programa]
  if (!semanaLimite) return { fechaLimite: null, razon: 'exento', extendida: false }
  if (grupo?.itinerario_clases == null) return { fechaLimite: null, razon: 'exento', extendida: false }

  const it = itinerarioDe(grupo)
  const semanas = Array.isArray(it?.semanas) ? it.semanas : []
  const semana = semanas.find((s) => s?.tipo === 'clase' && String(s?.corto) === String(semanaLimite))
  const fechas = Array.isArray(semana?.fechas) ? semana.fechas : []
  const ultima = fechas.length ? iso10(fechas[fechas.length - 1]) : null
  if (!ultima) return { fechaLimite: null, razon: 'sin_itinerario_valido', extendida: false }

  const extension = iso10(grupo?.llenado_extendido_hasta)
  if (extension && extension > ultima) return { fechaLimite: extension, razon: null, extendida: true }
  return { fechaLimite: ultima, razon: null, extendida: false }
}

// Ventana de niños NUEVOS del grupo, evaluada a la fecha del negocio (hoy en
// hora de Panamá, ver hoyISO en lib/operaciones.js — aquí llega como parámetro).
// Abierta = grupo activo + palanca manual abierta + (exento || hoy <= límite).
// OJO: la convención del cliente se mantiene — `inscripcion_abierta !== false`
// cuenta como abierta (NULL = abierta).
// → { abierta, fechaLimite, razon, diasHastaLimite }
//   razon: 'no_activo' | 'palanca_cerrada' | 'exento' | 'sin_itinerario_valido'
//        | 'vencida' | 'extendida' | 'en_ventana'
export function ventanaNuevos(grupo, hoyIso) {
  const hoy = iso10(hoyIso)
  const { fechaLimite, razon: razonLimite, extendida } = fechaLimiteNuevos(grupo)
  const diasHastaLimite = fechaLimite && hoy ? diasEntre(hoy, fechaLimite) : null
  const activo = grupo?.estado === 'activo'
  const palanca = grupo?.inscripcion_abierta !== false
  const sinLimite = razonLimite === 'exento' || razonLimite === 'sin_itinerario_valido'
  // Sin días calculables (exento o sin hoy) se falla ABIERTO: nunca cerrar a ciegas.
  const vigente = sinLimite || diasHastaLimite == null || diasHastaLimite >= 0

  let razon
  if (!activo) razon = 'no_activo'
  else if (!palanca) razon = 'palanca_cerrada'
  else if (sinLimite) razon = razonLimite
  else if (!vigente) razon = 'vencida'
  else razon = extendida ? 'extendida' : 'en_ventana'

  return { abierta: activo && palanca && vigente, fechaLimite, razon, diasHastaLimite }
}

// Ritmo de llenado del grupo contra su meta (aperturaMinima si no inició,
// gpnMin si ya inició — la meta la decide quien llama, aquí solo se mide).
// → { ninos, meta, faltan, diasParaInicio, diasHastaLimite, fechaLimite,
//     ritmoSemanalNecesario, ritmoSemanalObservado, estado }
//   - ninos: activos + baja_potencial (siguen ocupando cupo este mes).
//   - ritmoSemanalNecesario = faltan / max(1, diasHastaLimite/7), 1 decimal;
//     0 si faltan=0; null si la ventana venció o el grupo es exento.
//   - ritmoSemanalObservado: inscripciones al grupo en los últimos 14 días
//     llevadas a semana (× 7/14 = × 0.5), 1 decimal; 'sin_datos' si el grupo
//     tiene menos de 14 días creado (aún no hay historia que mirar).
//   - estado: 'meta_cumplida' | 'a_ritmo' | 'apretado' | 'vencida' | 'sin_datos'
export function ritmoLlenado(grupo, meta, eventosInscripcion, hoyIso) {
  const hoy = iso10(hoyIso)
  const estudiantes = Array.isArray(grupo?.estudiantes) ? grupo.estudiantes : []
  const ninos = estudiantes.filter((e) => !e?.estado || e.estado === 'activo' || e.estado === 'baja_potencial').length
  const metaNum = Math.max(0, Number(meta) || 0)
  const faltan = Math.max(0, metaNum - ninos)

  // Días hasta el inicio del NIVEL vigente (itinerario.fecha_inicio); null = ya inició.
  const inicioNivel = iso10(itinerarioDe(grupo)?.fecha_inicio)
  const diasParaInicio = inicioNivel && hoy && hoy < inicioNivel ? diasEntre(hoy, inicioNivel) : null

  const { fechaLimite } = fechaLimiteNuevos(grupo)
  const diasHastaLimite = fechaLimite && hoy ? diasEntre(hoy, fechaLimite) : null
  const vencida = diasHastaLimite != null && diasHastaLimite < 0

  let ritmoSemanalNecesario
  if (faltan === 0) ritmoSemanalNecesario = 0
  else if (vencida || diasHastaLimite == null) ritmoSemanalNecesario = null
  else ritmoSemanalNecesario = round1(faltan / Math.max(1, diasHastaLimite / 7))

  const creado = iso10(grupo?.created_at) || iso10(grupo?.fecha_apertura)
  const edadDias = creado && hoy ? diasEntre(creado, hoy) : null
  let ritmoSemanalObservado
  if (edadDias != null && edadDias < 14) {
    ritmoSemanalObservado = 'sin_datos'
  } else {
    const recientes = (eventosInscripcion || []).filter((ev) => {
      if (ev?.tipo && ev.tipo !== 'inscripcion') return false
      if (String(ev?.a_grupo_id) !== String(grupo?.id)) return false
      const fecha = iso10(ev?.fecha)
      if (!fecha || !hoy) return false
      const hace = diasEntre(fecha, hoy)
      return hace >= 0 && hace < 14
    })
    ritmoSemanalObservado = round1(recientes.length * 0.5)
  }

  let estado
  if (faltan === 0) estado = 'meta_cumplida'
  else if (vencida) estado = 'vencida'
  else if (ritmoSemanalObservado === 'sin_datos') estado = 'sin_datos'
  else if (ritmoSemanalNecesario == null || ritmoSemanalObservado >= ritmoSemanalNecesario) estado = 'a_ritmo'
  else estado = 'apretado'

  return { ninos, meta: metaNum, faltan, diasParaInicio, diasHastaLimite, fechaLimite, ritmoSemanalNecesario, ritmoSemanalObservado, estado }
}

// Regla de franquicia: toda promo nueva la aprueba la Administración General
// (misma línea de GUIA_FRANJAS_DIFICILES, lib/atractivo.js:158-164).
export const LINEA_APROBACION = 'Toda promoción nueva la aprueba la Administración General (regla de franquicia).'

const reglaSemanaTexto = (programa) => {
  if (programa === 'KIDS') return 'Kids acepta niños nuevos hasta la semana 2 del libro'
  if (programa === 'TINY') return 'Tiny acepta niños nuevos hasta la semana 4 del libro'
  return 'Tiny acepta nuevos hasta la semana 4 del libro y Kids hasta la 2'
}

// Sugerencias para llenar el grupo, escalonadas por presión (estado del ritmo
// y días de ventana que quedan). SOLO herramientas aprobadas del manual
// (GUIA_FRANJAS_DIFICILES, lib/atractivo.js:158-164) y el protocolo de ofertas
// escalonadas: 10% sin límite · 15% máx. 3/mes · 25% máx. 2/mes · 25% + 10%
// para terminar el nivel máx. 1/mes. Devuelve dato estructurado
// [{ texto, descuento|null, tope|null }] — la UI pinta esto tal cual, nadie
// inventa promos nuevas; la línea de aprobación cierra SIEMPRE la lista.
export function sugerenciasLlenado(ritmo, grupo) {
  if (!ritmo || ritmo.estado === 'meta_cumplida') return []
  const programa = String(grupo?.itinerario || '').toUpperCase()
  const aprobacion = { texto: LINEA_APROBACION, descuento: null, tope: null }

  if (ritmo.estado === 'vencida') {
    // Ventana vencida: los descuentos ya no aplican para NUEVOS; la venta se
    // apunta a la próxima inducción (al pasar de nivel la ventana se reabre sola).
    return [
      {
        texto: `La ventana de niños nuevos venció (${reglaSemanaTexto(programa)}): apunta la venta a la inducción del próximo nivel o extiende la ventana con registro.`,
        descuento: null,
        tope: null,
      },
      aprobacion,
    ]
  }

  const out = []
  // Canal natural de llenado: la clase de prueba semanal + pauta en redes.
  out.push({
    texto: 'Dirige la clase de prueba semanal hacia este grupo e informa el horario a VIRALSOLUTIONSS para la pauta en redes.',
    descuento: null,
    tope: null,
  })
  if (ritmo.diasParaInicio != null) {
    // Aún no inicia el nivel: el empuje comercial del manual es la quincena.
    out.push({
      texto: 'Apertura pegada a la quincena: los padres tienen flujo de efectivo para inscribir.',
      descuento: null,
      tope: null,
    })
  } else {
    out.push({
      texto: `Aprovecha las semanas de ventana que quedan para seguir sumando niños: ${reglaSemanaTexto(programa)}.`,
      descuento: null,
      tope: null,
    })
  }
  out.push({ texto: 'Oferta escalonada del protocolo: 10% de descuento.', descuento: 10, tope: 'sin límite' })
  if (ritmo.estado === 'apretado') {
    out.push({ texto: 'Sube el escalón del protocolo: 15% de descuento.', descuento: 15, tope: 'máx. 3/mes' })
    out.push({ texto: 'Clases de reposición gratis (1–2) como gancho de permanencia.', descuento: null, tope: null })
    if (ritmo.diasHastaLimite != null && ritmo.diasHastaLimite <= 7) {
      out.push({ texto: 'Última semana de ventana: 25% de descuento.', descuento: 25, tope: 'máx. 2/mes' })
    }
    if (ritmo.diasHastaLimite != null && ritmo.diasHastaLimite <= 3) {
      out.push({ texto: 'Cierre de ventana: 25% + 10% para terminar el nivel.', descuento: 25, tope: 'máx. 1/mes' })
    }
  }
  out.push(aprobacion)
  return out
}

// Orden de la sección "En llenado": el grupo que cierra primero va primero;
// los sin fecha (exentos, sin itinerario, legacy inválido) van al final en su
// orden original (sort estable). NO muta el arreglo recibido.
export function ordenarPorCierreLlenado(grupos, hoyIso) {
  const lista = Array.isArray(grupos) ? grupos : []
  const limites = new Map(lista.map((g) => [g, ventanaNuevos(g, hoyIso).fechaLimite]))
  return [...lista].sort((a, b) => {
    const la = limites.get(a)
    const lb = limites.get(b)
    if (la === lb) return 0
    if (la == null) return 1
    if (lb == null) return -1
    return la < lb ? -1 : 1
  })
}
