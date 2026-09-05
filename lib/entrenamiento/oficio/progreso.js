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
  coach: 'Coach ALOHA',
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

// El plan de un rol, en orden. Gerencia (supervisor y admin_general) no se
// entrena: son quienes firman, y ningún módulo los lleva en `roles` → [].
// Los MÓDULOS DE PAPEL (`roles: []`) no entran en el plan de nadie: se
// imprimen y se firman en tinta. Ver esDePapel().
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

// QUIÉN ES OFICIAL DE ENTRENAMIENTO DE QUIÉN: el jefe inmediato firma el drill.
// La jerarquía entera vive en ESTE dato: puedeFirmar(), rolesQueFirma() y
// rolesQueRevisa() se derivan de él y no hay una segunda lista que mantener.
// El orden de cada array importa: el PRIMERO es el escalón más cercano, y es
// el que oficialesDe() le nombra al alumno ("pídesela a tu administradora",
// no "pídesela a la gerencia").
//
//  · coach ← administradora. El Manual se lo da: el Administrador evalúa a cada
//    Coach dos veces por grupo (semanas 4 y 9), programa sus capacitaciones con
//    el Master Coach y autoriza sus permisos. Ojo con la confusión que el
//    sistema nuevo puede sembrar: la Administradora le firma el DRILL DE SU
//    PUESTO; quien le certifica el NIVEL DE LA TÉCNICA es el Master Coach, que
//    no es un rol de este sistema. Un hat firmado no habilita un nivel.
//  · coordinador ← [supervisor, admin_general] y nadie más. La única línea del
//    Manual que dice de quién depende el Coordinador Operativo es la del
//    permiso, que eleva a la JUNTA DIRECTIVA por correo; la Junta, en el
//    sistema, son esos dos roles. No lleva 'coordinador': puedeFirmar ya
//    bloquea la auto-firma, pero un segundo coordinador firmándole a otro no
//    lo respalda nada.
//  · A coach y asistente se les agregan coordinador/supervisor/admin_general
//    por la misma razón: un centro sin administradora no puede dejar a su
//    gente sin quien le firme.
//
// El PERSONAL DE ASEO no aparece: no es rol del sistema y su firma es de tinta.
export const OFICIAL_DE = {
  asistente: ['administradora', 'coordinador', 'supervisor', 'admin_general'],
  administradora: ['coordinador', 'supervisor', 'admin_general'],
  coach: ['administradora', 'coordinador', 'supervisor', 'admin_general'],
  coordinador: ['supervisor', 'admin_general'],
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

// LOS PUESTOS QUE TIENEN PLAN PROPIO. Existe para el andamiaje que NO puede
// preguntarle al catálogo: el menú es 'use client', y meterle cursos/ le
// mandaría la prosa de los 70 módulos al navegador de cada centro (lo prohíbe
// el test de higiene de bundle). Este archivo es cálculo puro y sí viaja.
//
// Se deriva de OFICIAL_DE y no es una lista nueva: tener plan propio y ser
// alumno de alguien son la misma cosa —a quien no estudia no hay quién le
// firme, y a quien estudia no se le puede dejar sin firmante—.
// test/entrenamiento-oficio.test.mjs lo amarra contra los `roles` del catálogo,
// así que si mañana entra un quinto puesto no puede quedarse sin puerta al
// menú sin que CI lo diga.
export const ROLES_CON_PLAN = Object.keys(OFICIAL_DE)

export const tienePlanPropio = (rol) => ROLES_CON_PLAN.includes(rol)

// REVISIÓN (lectura, sin progreso). El dueño tiene que poder LEER el
// entrenamiento que le da a su gente sin inventarse un usuario de prueba. Qué
// planes puede abrir no es una lista nueva: es la de OFICIAL_DE. LA REGLA ES
// UNA SOLA — si le firmas el hat a alguien, puedes leer ese hat.
//
// Antes esto cortaba a quien tuviera plan propio ("revisa estudiando el suyo").
// Con el Coordinador Operativo teniendo sus 23 módulos, ese corte le arrebataba
// justo a él la lectura de los planes que su puesto existe para auditar, y le
// negaba a la Administradora el plan del Coach al que le firma. El candado real
// nunca fue "tiene plan": es rolesQueFirma, que devuelve [] para la asistente y
// para el coach — que es exactamente lo que impide que la asistente se asome al
// curso de la administradora.
//
// `modulos` ya no se usa; se conserva en la firma porque las tres llamadas lo
// pasan y quitarlo no compra nada.
export function rolesQueRevisa(rol, _modulos) {
  return rolesQueFirma(rol)
}

// ── EL MÓDULO DE PAPEL ────────────────────────────────────────────────────
// Un módulo con `roles: []` no está en el plan de nadie: planDeRol() lo ignora,
// no pide cuestionario, no genera progreso y no cuenta para el avance de nadie.
// Es papel con id. Existe para el PERSONAL DE ASEO, que no recibe cuenta en el
// sistema: se le imprime la hoja, la firma en tinta y va al file del
// colaborador, que es donde el Manual pide que repose.
export const esDePapel = (m) => Array.isArray(m?.roles) && m.roles.length === 0

// Quién puede ABRIR e IMPRIMIR una hoja de papel. No es una lista escrita a
// mano: es quien lleva en SU plan los módulos del mismo curso —el paquete del
// aseo lo reparte la Asistente, con su propio módulo of-ase-0— más quien le
// firma a esa persona. Así la hoja se imprime desde la sesión de la Asistente y
// también desde la de su Administradora, sin darle cuenta a nadie más.
export function rolesDelPapel(m, modulos) {
  if (!esDePapel(m)) return []
  const duenos = new Set()
  for (const otro of modulos || []) {
    if (otro.curso !== m.curso) continue
    for (const r of otro.roles || []) duenos.add(r)
  }
  const out = new Set(duenos)
  for (const dueno of duenos) for (const jefe of OFICIAL_DE[dueno] || []) out.add(jefe)
  return [...out]
}

export function puedeImprimirPapel(rol, m, modulos) {
  return rolesDelPapel(m, modulos).includes(rol)
}
