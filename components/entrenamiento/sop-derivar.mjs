// El SOP de UNA HOJA de un módulo de oficio: cálculo puro, sin React ni BD.
// Vive en .mjs y sin dependencias del framework (como components/dialog-lifetime.mjs):
// lo consume el Server Component de la hoja y se puede probar suelto. Su único
// import es lib/entrenamiento/oficio/progreso.js, que también es cálculo puro.
//
// REGLA DE ORO: aquí NO se inventa nada. Todo lo que sale en la hoja es texto
// que ya está escrito en el módulo (que a su vez sale del Manual de
// Operaciones). Esto ordena y recorta; no redacta.
//
// El campo `sop` del módulo es el ESCAPE, no la regla: cuando el frente de
// contenido escriba el procedimiento a mano, gana sección por sección. Mientras
// no exista, la hoja se deriva de lo que el módulo ya tiene (el producto del
// puesto, bloques `pasos`, notas y maniobras), igual que el temario se deriva
// de los `sub`.
// ponytail: la derivación es un andamio honesto, no la meta. Cuando los 40
// módulos declaren `sop`, esta función queda como red de seguridad para el
// módulo nuevo que alguien agregue sin escribirlo. Si algún día estorba,
// borrarla es un cambio de una línea (dejar solo `normalizar`).

// Tope de cada sección. Es LO QUE HACE QUE QUEPA EN UNA HOJA: un SOP de tres
// hojas no se usa, y el requisito central de Fernando es que quepa en una.
// Criterio del recorte: se conserva el ESQUELETO del proceso (los pasos en
// orden) y se sacrifica el detalle explicativo, que ya vive en el módulo —
// la hoja es para tenerla al lado mientras se ejecuta, no para estudiar.
export const TOPE = { pasos: 12, decide: 3, errores: 3 }

// Presentación del rol. Ya no se copia aquí: apareció la tercera copia (la
// página del módulo, que nombra el plan que se está revisando) y las cinco
// cadenas se fueron a lib/entrenamiento/oficio/progreso.js, que es cálculo puro
// igual que este archivo — se sigue pudiendo probar suelto, sin React ni BD.
import { nombreDeRol } from '../../lib/entrenamiento/oficio/progreso.js'

export { nombreDeRol }

// La hoja se imprime en texto plano: el **énfasis** del contenido se cae.
// ponytail: si algún día la negrita de las cifras importa en el papel, lo
// correcto es exportar `partirNegrita` de BloquesOficio y reusarlo — no
// duplicar aquí un segundo parser de negritas.
const plano = (s) => String(s ?? '').replace(/\*\*/g, '').trim()

// Autoridades que deciden por encima de quien ejecuta el proceso. Sirve para
// separar "aquí se escala" de "aquí te equivocas": una nota de alerta que
// nombra al Corporativo es un punto de decisión, no un error típico.
const AUTORIDAD = /\b(corporativ\w*|coordinador\w*|junta directiva|gerencia|master coach|franquicia|supervisor\w*|administrador\w*)\b/i

// Primera oración: el error, sin el párrafo que lo explica. Solo corta si lo
// que queda sigue siendo una frase completa (>40 caracteres) y hay un punto
// seguido de mayúscula, para no partir "Ley 81 de 2019." ni una abreviatura.
function primeraOracion(texto) {
  const t = plano(texto)
  const corte = t.search(/\.\s+(?=[A-ZÁÉÍÓÚÑ¿¡"(])/)
  return corte > 40 ? t.slice(0, corte + 1) : t
}

const bloques = (m, t) => (m?.bloques || []).filter((b) => b.t === t)
const notas = (m, tono) => bloques(m, 'nota').filter((b) => b.tono === tono)

// LOS PASOS. En orden de confianza: el bloque `pasos` del módulo (que es
// literalmente el paso a paso del proceso) → los pasos de la primera maniobra (que es
// el proceso ejecutado de verdad) → la primera lista. Nunca se recorta el TEXTO
// de un paso: ahí viven las cifras y los plazos del Manual. Se recorta el
// NÚMERO de pasos, y se dice cuántos quedaron fuera.
function derivarPasos(m) {
  const delBloque = bloques(m, 'pasos')[0]?.items || []
  const delDrill = (m?.drills || []).flatMap((d) => d.pasos || [])
  const deLista = bloques(m, 'lista')[0]?.items || []
  const fuente = delBloque.length ? delBloque : delDrill.length ? delDrill : deLista
  return fuente.map(plano).filter(Boolean)
}

// QUIÉN DECIDE QUÉ. Las notas `regla` son, en este contenido, exactamente las
// reglas que no se negocian; las `alerta` que nombran una autoridad son los
// puntos donde hay que escalar. Las `alerta` que no nombran a nadie son errores
// y se van a la otra sección: ninguna nota sale dos veces en la hoja.
function derivarDecide(m) {
  const reglas = notas(m, 'regla').map((b) => ({ situacion: plano(b.titulo), regla: plano(b.texto) }))
  const escalan = notas(m, 'alerta')
    .filter((b) => AUTORIDAD.test(`${b.titulo} ${b.texto}`))
    .map((b) => ({ situacion: plano(b.titulo), regla: plano(b.texto) }))
  return [...reglas, ...escalan]
}

// ERRORES QUE CUESTAN. El `errorTipico` de la maniobra es justo eso, escrito para
// que se reconozca en el trabajo real. Se queda su primera oración: el resto
// del párrafo explica cómo se delata, y eso es material de módulo, no de hoja.
function derivarErrores(m) {
  const deDrills = (m?.drills || []).map((d) => d.errorTipico).filter(Boolean).map(primeraOracion)
  const deAlertas = notas(m, 'alerta')
    .filter((b) => !AUTORIDAD.test(`${b.titulo} ${b.texto}`))
    .map((b) => `${plano(b.titulo)}: ${primeraOracion(b.texto)}`)
  return [...deDrills, ...deAlertas]
}

// Un punto de decisión escrito a mano puede venir como texto suelto o como
// { situacion, regla } / { situacion, quien }. Las dos formas valen.
function normalizarDecide(v) {
  if (typeof v === 'string') return { situacion: '', regla: plano(v) }
  return { situacion: plano(v?.situacion), regla: plano(v?.regla ?? v?.quien) }
}

const lista = (v) => (Array.isArray(v) ? v.map(plano).filter(Boolean) : [])

/**
 * @param {object} m  módulo de oficio del catálogo
 * @returns {{codigo,proceso,aplicaA,producto,pasos,pasosOmitidos,decide,errores,escrito,vacios}}
 *   `escrito` dice si el procedimiento lo escribió una persona (campo `sop`) o
 *   si esto es la derivación. `vacios` nombra las secciones que el módulo
 *   todavía no puede sostener: la hoja las declara en vez de inventarlas.
 */
export function derivarSop(m) {
  if (!m) return null
  // Si un módulo llegara a declarar varios procesos, la hoja es del primero:
  // una hoja = un proceso. El resto necesitaría su propia ruta, no media hoja.
  const escrito = Array.isArray(m.sop) ? m.sop[0] : m.sop

  const pasos = lista(escrito?.pasos).length ? lista(escrito.pasos) : derivarPasos(m)
  const decide = Array.isArray(escrito?.decide) && escrito.decide.length
    ? escrito.decide.map(normalizarDecide)
    : derivarDecide(m)
  const errores = lista(escrito?.errores).length ? lista(escrito.errores) : derivarErrores(m)

  const hoja = {
    codigo: m.id,
    proceso: plano(escrito?.proceso) || plano(m.titulo),
    cuando: plano(escrito?.cuando),
    aplicaA: (m.roles || []).map(nombreDeRol),
    producto: plano(escrito?.producto) || plano(m.pfv),
    pasos: pasos.slice(0, TOPE.pasos),
    pasosOmitidos: Math.max(0, pasos.length - TOPE.pasos),
    decide: decide.slice(0, TOPE.decide).filter((d) => d.regla),
    errores: errores.slice(0, TOPE.errores),
    escrito: Boolean(escrito),
  }
  hoja.vacios = ['producto', 'pasos', 'decide', 'errores'].filter((k) => !hoja[k] || hoja[k].length === 0)
  return hoja
}
