// Motor del entrenamiento de OFICIO — cálculo puro, sin BD ni React.
// `progreso` es { [moduloId]: { tourVistoAt, quizAprobadoAt, intentos,
// ultimoPuntaje, drillFirmadoAt, drillFirmadoPor } } tal como lo devuelve
// cargarOficio() (app/actions/entrenamiento-oficio.js).
//
// En una fila de oficio `tour_visto_at` significa "lo estudió con la masa
// delante": no hay tour que ver. Se reusa a propósito para no migrar una
// tercera columna (ver db/schema.sql).

export const UMBRAL = 0.8

// Cómo se le dice a cada rol delante de una persona. Vive aquí —y no en cada
// pantalla— porque ya había tres copias de estas cinco cadenas: la action de
// oficio, la derivación del SOP y ahora la página del módulo, que necesita
// nombrar el plan que está revisando. Un rol desconocido se dice tal cual.
export const NOMBRE_ROL = {
  administradora: 'Administradora del Centro',
  asistente: 'Asistente Administrativo',
  coordinador: 'Coordinador Operativo',
  supervisor: 'Supervisor',
  admin_general: 'Gerencia',
}

export const nombreDeRol = (rol) => NOMBRE_ROL[rol] || rol

// Aprobar exige el 80% de las preguntas, pero siempre se permite UN error y
// nunca se pide más de n-1: 4→3, 5→4, 6→5, 8→7, 10→8. Es lo que dice la
// propia fuente del curso.
export function minimoAprobacion(n) {
  return Math.max(2, Math.min(n - 1, Math.ceil(n * UMBRAL)))
}

// Copia deliberada de corregirQuiz (lib/entrenamiento/progreso.js) con el
// umbral variable: ese archivo está blindado por los tests de los 9 tours y no
// se toca para agregarle un tercer parámetro.
export function corregirQuizOficio(respuestas, correctas, minimo) {
  const r = Array.isArray(respuestas) ? respuestas : []
  const marcas = correctas.map((c, i) => Number.isInteger(r[i]) && r[i] === c)
  const puntaje = marcas.filter(Boolean).length
  return { puntaje, correctas: marcas, aprobado: puntaje >= minimo }
}

// Estudiado ≠ hatted. Lo primero lo declara la persona con el quiz aprobado;
// lo segundo lo firma su Oficial de Entrenamiento después de tomarle el drill.
export const estudiado = (p) => Boolean(p?.tourVistoAt && p?.quizAprobadoAt)
export const firmado = (p) => Boolean(p?.drillFirmadoAt)
export const hatted = (p, m) => estudiado(p) && ((m?.drills || []).length === 0 || firmado(p))

// El plan de un rol, en orden. Gerencia y coordinador no se entrenan: son
// quienes firman, y ningún módulo los lleva en `roles` → devuelve [].
export function planDeRol(rol, modulos) {
  return (modulos || [])
    .filter((m) => (m.roles || []).includes(rol))
    .slice()
    .sort((a, b) => a.orden - b.orden)
}

export function avanceOficio(plan, progreso) {
  const total = (plan || []).length
  const estudiados = (plan || []).filter((m) => estudiado(progreso?.[m.id])).length
  const conHat = (plan || []).filter((m) => hatted(progreso?.[m.id], m)).length
  return {
    estudiados,
    hatted: conHat,
    total,
    pctEstudio: total ? Math.round((estudiados / total) * 100) : 0,
    pctHat: total ? Math.round((conHat / total) * 100) : 0,
  }
}

// Las FIRMAS, contadas solo sobre los módulos que llevan drill. avanceOficio
// mide "hat completo" sobre el plan entero, y los módulos sin drill cuentan
// como completos en cuanto se estudian: con 11 de 26 sin drill, esa barra llega
// al 42 % sin una sola firma. Para rotular "drills firmados" hay que contar
// esto, no aquello.
// `drills` es un array en el catálogo y un número en los metadatos del plan
// (metadatosOficio); esto acepta las dos formas.
const cuantosDrills = (m) => (Array.isArray(m?.drills) ? m.drills.length : Number(m?.drills || 0))

export function avanceDrills(plan, progreso) {
  const conDrill = (plan || []).filter((m) => cuantosDrills(m) > 0)
  const firmados = conDrill.filter((m) => firmado(progreso?.[m.id])).length
  return {
    total: conDrill.length,
    firmados,
    pct: conDrill.length ? Math.round((firmados / conDrill.length) * 100) : 0,
  }
}

// El primero que la persona todavía no estudió. Null si ya los estudió todos
// (aunque le falten firmas: eso no depende de ella).
export function siguienteOficio(plan, progreso) {
  return (plan || []).find((m) => !estudiado(progreso?.[m.id])) || null
}

// Gradiente: el módulo N exige el N−1 ESTUDIADO. La firma del N−1 no bloquea
// nada — si bloqueara, un centro entero se traba el lunes que la
// administradora no entra.
export function gradienteAbierto(m, progreso) {
  return (m?.requiere || []).every((id) => estudiado(progreso?.[id]))
}

const ES_LETRA = /[\p{L}\p{N}_]/u

function limiteDePalabra(texto, i, largo) {
  const antes = i > 0 ? texto[i - 1] : ''
  const despues = i + largo < texto.length ? texto[i + largo] : ''
  if (antes && ES_LETRA.test(antes)) return false
  if (despues && ES_LETRA.test(despues)) return false
  return true
}

// Auto-enlace del glosario (barrera de palabra malentendida). Parte `texto` en
// segmentos { t:'texto', texto } y { t:'termino', slug, texto }; concatenar los
// `texto` reconstruye el original carácter por carácter.
// Solo marca los slugs de `permitidos` (los del módulo, no las 238 entradas
// del GLOSARIO publicado), solo la PRIMERA aparición de cada término, y
// respeta límites de palabra con acentos: "facturación" no marca "factura".
// `ya` es el Set de slugs ya marcados; se comparte entre bloques del mismo
// módulo y se muta a propósito para no repetir el enlace en cada párrafo.
export function marcarTerminos(texto, glosario, permitidos, ya) {
  const src = String(texto ?? '')
  const usados = ya instanceof Set ? ya : new Set(ya || [])
  const candidatos = []
  for (const slug of permitidos || []) {
    const g = glosario?.[slug]
    if (!g) continue
    const variantes = (g.variantes && g.variantes.length) ? g.variantes : [g.termino || slug]
    for (const v of variantes) if (v) candidatos.push({ slug, v: String(v).toLowerCase() })
  }
  // El más largo primero: "cuentas por cobrar" gana sobre "cuentas".
  candidatos.sort((a, b) => b.v.length - a.v.length)
  const bajo = src.toLowerCase()
  const out = []
  let cursor = 0
  let i = 0
  while (i < src.length) {
    let hit = null
    for (const c of candidatos) {
      if (usados.has(c.slug)) continue
      if (bajo.startsWith(c.v, i) && limiteDePalabra(src, i, c.v.length)) { hit = c; break }
    }
    if (hit) {
      if (i > cursor) out.push({ t: 'texto', texto: src.slice(cursor, i) })
      out.push({ t: 'termino', slug: hit.slug, texto: src.slice(i, i + hit.v.length) })
      usados.add(hit.slug)
      i += hit.v.length
      cursor = i
    } else i++
  }
  if (cursor < src.length || out.length === 0) out.push({ t: 'texto', texto: src.slice(cursor) })
  return out
}

// Quién es Oficial de Entrenamiento de quién: el jefe inmediato firma el drill.
// La Administradora firma a la Asistente; a la Administradora la firman
// coordinador, supervisor o admin_general. Un asistente no firma a nadie.
export const OFICIAL_DE = {
  asistente: ['administradora', 'coordinador', 'supervisor', 'admin_general'],
  administradora: ['coordinador', 'supervisor', 'admin_general'],
}

// firmante y alumno: { id, rol, centroId, centros? }.
export function puedeFirmar(firmante, alumno) {
  if (!firmante || !alumno) return false
  if (firmante.id === alumno.id) return false // nadie se firma solo
  if (!(OFICIAL_DE[alumno.rol] || []).includes(firmante.rol)) return false
  if (firmante.rol === 'supervisor' || firmante.rol === 'admin_general') return true
  if (firmante.rol === 'coordinador') {
    return (firmante.centros || []).map(Number).includes(Number(alumno.centroId))
  }
  // Administradora: solo dentro de su propio centro.
  return firmante.centroId != null && Number(firmante.centroId) === Number(alumno.centroId)
}

// Los roles de alumno a los que este usuario le puede tomar el drill.
export function rolesQueFirma(rol) {
  return Object.keys(OFICIAL_DE).filter((alumno) => OFICIAL_DE[alumno].includes(rol))
}

// REVISIÓN (lectura, sin progreso). planDeRol() le devuelve [] a gerencia y al
// coordinador — y así se queda: ellos no se entrenan —, pero el dueño tiene que
// poder LEER el entrenamiento que le da a su gente sin inventarse un usuario de
// prueba. Qué planes puede abrir no es una lista nueva: es la de OFICIAL_DE. Si
// le firmas el hat a alguien, puedes leer ese hat.
//
// Quien tiene plan propio NO entra aquí (revisa estudiando el suyo), y por eso
// la asistente sigue sin ver el curso de la administradora: rolesQueFirma
// ('asistente') es [] y su plan no está vacío.
export function rolesQueRevisa(rol, modulos) {
  if (planDeRol(rol, modulos).length > 0) return []
  return rolesQueFirma(rol)
}
