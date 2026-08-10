// Colocación de niños en grupos + selector de grupos de la clase de prueba —
// cálculo puro, sin BD.
//
// La matriz Tiny↔Kids REPLICA los bloqueos de fusión de lib/fusiones.js
// (analyze, lib/fusiones.js:130-148; criterio LITERAL del manual, decisión de
// Fernando 2026-08-01): "los KIDS Niveles 3 en adelante se pueden unir con
// cualquier otro grupo tanto de Tiny como de KIDS". La misma regla que frena
// una fusión frena la colocación de un niño nuevo: Tiny no entra a un grupo
// Kids, y KIDS menor a nivel 3 no cruza a un grupo Tiny. Se replica en vez de
// importar `analyze` porque aquí se coloca UN niño sin coach/cupo/score de por
// medio — solo el cruce de itinerarios.
//
// Los helpers de selector trabajan sobre la forma que devuelve
// listarGruposActivos (app/actions/grupos.js): { id, numero, itinerario,
// nivel, inscripcionAbierta, fechaLimiteNuevos, razonLimiteNuevos, cupos,
// horarioTexto }.

const DIA_MS = 24 * 60 * 60 * 1000

// Normaliza Date o string ISO a 'AAAA-MM-DD' (misma lección que fechaIso10 de
// lib/operaciones.js, local para que el módulo siga siendo puro).
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

const MES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// '2026-08-20' → '20 ago' (para las opciones del select, donde no cabe el ISO).
export const fechaCortaEs = (fechaIso) => {
  const f = iso10(fechaIso)
  if (!f) return ''
  const [, m, d] = f.split('-').map(Number)
  return `${d} ${MES_CORTO[m - 1] || ''}`.trim()
}

// Matriz de colocación (réplica de los bloqueos de lib/fusiones.js:130-148).
// → mensaje de error o null si el niño puede entrar al grupo.
export function colocacionInvalida(nino, grupoItinerario) {
  const grupo = String(grupoItinerario || '').toUpperCase()
  const it = String(nino?.itinerario || '').toUpperCase()
  if (grupo === 'KIDS' && it === 'TINY') {
    return 'Un niño Tiny no entra a un grupo Kids (manual: solo KIDS nivel 3+ cruza de itinerario).'
  }
  if (grupo === 'TINY' && it === 'KIDS' && Number(nino?.nivel) < 3) {
    return 'Un niño KIDS menor a nivel 3 no se une a un grupo Tiny (manual).'
  }
  return null
}

// Razones de lib/llenado.fechaLimiteNuevos que dejan la fecha en null pero
// significan CERRADO, no "sin límite". Hoy solo 'nivel_avanzado' (del nivel 2
// en adelante el llenado del grupo ya pasó); 'exento' y 'sin_itinerario_valido'
// siguen fallando abiertos.
const RAZONES_CERRADAS = ['nivel_avanzado']

// ¿El grupo del selector acepta niños NUEVOS hoy? Palanca abierta, no cerrado
// por nivel y ventana derivada vigente. fechaLimiteNuevos null NO alcanza para
// decidir: null también lo devuelve el grupo cerrado por nivel avanzado, así
// que sin mirar `razonLimiteNuevos` el selector ofrecía como abierto un grupo
// que el server (grupoValido / grupoAceptaNinosNuevos) rechaza al guardar.
// Con razón desconocida o exenta se falla ABIERTO (nunca cerrar a ciegas),
// igual que ventanaNuevos en lib/llenado.mjs.
export function aceptaNuevosEnSelector(g, hoyIso) {
  if (!g) return false
  if (g.inscripcionAbierta === false) return false
  if (RAZONES_CERRADAS.includes(g.razonLimiteNuevos)) return false
  const limite = iso10(g.fechaLimiteNuevos)
  const hoy = iso10(hoyIso)
  return limite == null || hoy == null || hoy <= limite
}

// Orden del selector: el grupo cuya ventana cierra primero va primero; los sin
// fecha (exentos) al final en su orden original (sort estable). NO muta.
// Los cerrados por nivel no llegan aquí: aceptaNuevosEnSelector los saca antes.
export function ordenarPorLimiteNuevos(grupos) {
  return [...(Array.isArray(grupos) ? grupos : [])].sort((a, b) => {
    const la = iso10(a?.fechaLimiteNuevos)
    const lb = iso10(b?.fechaLimiteNuevos)
    if (la === lb) return 0
    if (la == null) return 1
    if (lb == null) return -1
    return la < lb ? -1 : 1
  })
}

// Aviso para el vínculo actual cuando el grupo ya no acepta nuevos: la opción
// se muestra deshabilitada, nunca se desvincula en silencio.
export const AVISO_CERRADO_A_NUEVOS = 'cerrado a nuevos — reasignar'

// Texto de cada opción del selector: "Grupo {n} · {itinerario} · {cupos}
// cupos · cierra {fecha} · falta(n) {x} día(s)". Los exentos (sin fecha
// límite) muestran solo grupo/itinerario/cupos.
export function etiquetaGrupoSelector(g, hoyIso) {
  const cupos = Math.max(0, Number(g?.cupos) || 0)
  const partes = [`Grupo ${g?.numero}`, String(g?.itinerario || ''), `${cupos} ${cupos === 1 ? 'cupo' : 'cupos'}`]
  const limite = iso10(g?.fechaLimiteNuevos)
  const hoy = iso10(hoyIso)
  if (limite && hoy) {
    partes.push(`cierra ${fechaCortaEs(limite)}`)
    const d = diasEntre(hoy, limite)
    partes.push(d <= 0 ? 'último día' : d === 1 ? 'falta 1 día' : `faltan ${d} días`)
  }
  return partes.filter(Boolean).join(' · ')
}
