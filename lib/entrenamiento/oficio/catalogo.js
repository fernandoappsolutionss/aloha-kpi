// Catálogo del entrenamiento de OFICIO. Es la única puerta al contenido desde
// el andamiaje: nadie más importa lib/entrenamiento/oficio/cursos/*.
//
// El oficio SE SUMA a los 9 tours de "cómo usar el sistema"
// (lib/entrenamiento/modulos.js), que no se tocan. Las dos pistas escriben en
// la misma columna TEXT entrenamiento_progreso.modulo, así que los ids de
// oficio llevan el prefijo `of-` para que jamás colisionen con un tour.
//
// El `id` de un módulo es la CLAVE DE PROGRESO EN LA BASE DE DATOS: renombrarlo
// borra en silencio el avance de todo el mundo. No se renumera nunca. Si un
// módulo se parte en dos, uno de los dos conserva el id viejo.
import { MODULOS_OFICIO } from './cursos/todos.js'

export { MODULOS_OFICIO }

// Pistas del oficio. Bloque A = común a TODOS los puestos (método, normativa y
// el paquete del propio puesto); bloque B = el curso propio de cada puesto;
// bloque C = lo que no se estudia en pantalla porque se entrega en papel.
//
// El bloque A es de todo cargo, no de dos: el Coach y el Coordinador arrancan
// por él igual que la Administradora y la Asistente. El Coordinador
// especialmente — no puede vigilar que el Manual se cumpla si no lo estudió.
//
// OJO: se renombró el TÍTULO visible, nunca la CLAVE. `hat` y `metodo` son
// claves de datos y viajan en las URLs; el mapeo viejo→nuevo del vocabulario
// está en la cabecera de cursos/metodo.js.
const TODO_CARGO = ['administradora', 'asistente', 'coach', 'coordinador']
export const CURSOS = {
  metodo:       { bloque: 'A', titulo: 'Cómo se estudia en cubierta',     roles: TODO_CARGO },
  normativa:    { bloque: 'A', titulo: 'Normativa de la empresa',     roles: TODO_CARGO },
  hat:          { bloque: 'A', titulo: 'Tu puesto',                   roles: TODO_CARGO },
  centro:       { bloque: 'B', titulo: 'Administrar un Centro ALOHA', roles: ['administradora'] },
  zoho:         { bloque: 'B', titulo: 'Zoho Books y administración', roles: ['asistente'] },
  coach:        { bloque: 'B', titulo: 'Dar clase ALOHA',             roles: ['coach'] },
  coordinacion: { bloque: 'B', titulo: 'Coordinar la operación',      roles: ['coordinador'] },
  // BLOQUE C — PAPEL. El personal de aseo NO recibe cuenta en el sistema: sus
  // seis módulos son hojas imprimibles que firma en tinta la Asistente y que
  // van al file del colaborador. Por eso el único rol de este curso es el de
  // quien las ENTREGA (of-ase-0, que sí tiene cuestionario, drill y firma); las
  // seis hojas llevan `roles: []` y no están en el plan de nadie.
  aseo:         { bloque: 'C', titulo: 'Personal de aseo (en papel)', roles: ['asistente'] },
}

// Los bloques que existen, en orden de lectura. Se deriva de CURSOS para que
// una pista nueva aparezca en el checksheet sin tocar tres pantallas: el
// bloque C se agregó y las páginas seguían pintando ['A','B'] a mano.
export const BLOQUES = [...new Set(Object.values(CURSOS).map((c) => c.bloque))].sort()

export const TITULO_BLOQUE = {
  A: 'antes de tocar nada',
  B: 'tu puesto',
  C: 'lo que entregas en papel',
}

// Prefijo obligatorio de todo id de oficio. Sin `:` ni `_`: la columna es TEXT
// y estos ids viajan por la URL.
export const ID_OFICIO = /^of-(met|nor|hat|zoh|cen|coa|cop|ase)-[a-z0-9]+$/

export const MODULO_IDS_OFICIO = new Set(MODULOS_OFICIO.map((m) => m.id))

export function esModuloOficio(id) {
  return typeof id === 'string' && MODULO_IDS_OFICIO.has(id)
}

export function moduloOficio(id) {
  return MODULOS_OFICIO.find((m) => m.id === id) || null
}

// CAMPO OPCIONAL DEL MODELO — `voz` (string). Es el guion HABLADO con el que se
// presenta el módulo, con marcas <break time="0.3s"/> donde una persona
// respira. Lo consume scripts/entrenamiento-audio.mjs, que genera UN clip por
// módulo con la voz clonada de Fernando; mientras un módulo no lo traiga, el
// clip se arma con su título, su primer párrafo y el producto de su puesto.
// Es prosa: se queda en el servidor y NO viaja en metadatosOficio. Cómo se
// escribe para que no suene robotizada (frases cortas, dónde van los <break>,
// cifras en palabras, largo objetivo) está en la cabecera de ese script.

// Metadatos para el índice y el plan de puesto: sin bloques, sin quiz y sin las
// maniobras. La prosa de un módulo pesa; el plan del rol se pinta con esto.
export function metadatosOficio(m) {
  return {
    id: m.id,
    curso: m.curso,
    orden: m.orden,
    roles: m.roles,
    titulo: m.titulo,
    duracionMin: m.duracionMin,
    requiere: m.requiere || [],
    pfv: m.pfv || '',
    // El temario viaja con los metadatos porque el índice del puesto lo usa para
    // que la persona vea de qué va cada módulo sin abrirlo. Son títulos, no
    // prosa: la regla de "la prosa se queda en el servidor" sigue en pie.
    temario: temarioDe(m),
    drills: (m.drills || []).length,
    preguntas: (m.quiz || []).length,
    // Si el módulo trae su procedimiento ESCRITO a mano. El plan de puesto ofrece
    // la hoja imprimible solo cuando lo trae: la derivación de sop-derivar.mjs
    // es una red de seguridad, no una hoja que se le ofrezca a nadie —en los 5
    // módulos de método y de puesto imprimiría el temario bajo el título "Los pasos",
    // que es una taxonomía, no un procedimiento que se ejecuta con la hoja al
    // lado. Es un booleano: el procedimiento entero no viaja al índice.
    sop: Boolean(m.sop),
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PORTADA DEL MÓDULO — la cabecera del Moodle (training.alohavenezuela.com)
// en la clave del Entrenamiento en Cubierta: "Objetivo del Módulo" y "Temas del
// Módulo".
//
// Tres campos OPCIONALES en el modelo del módulo. Ninguno se escribe si el
// módulo ya dice lo mismo por otra vía:
//   objetivo — string. Solo cuando el `pfv` no sirve de objetivo.
//   temario  — [string]. Solo cuando derivarlo de los `sub` queda pobre.
//   laminas  — [{ kicker?, titulo, texto?, items?, cierre? }]. Sin derivación:
//              ver laminasDe().
// ═══════════════════════════════════════════════════════════════════════════

// Sub-títulos que son ANDAMIAJE del ritmo de la página, no temas del módulo:
// marcan "aquí viene la teoría" o "aquí viene el ejercicio". "Lo que tienes que
// saber" abre 14 de los 40 módulos a propósito (convención de los cursos zoho y
// centro) y "Errores que cuestan dinero" cierra otros 4. En la página sirven;
// en un temario no dicen nada, así que no entran — pero NO se tocan en los
// bloques, que es donde hacen su trabajo.
export const SUBS_ANDAMIAJE = new Set([
  'Lo que tienes que saber',
  'Errores que cuestan dinero',
  'Cómo se siente',
  'Paso a paso',
  'Lo que este puesto NO hace',
  'Qué es esto',
])

// ponytail: el temario se DERIVA de los bloques `sub` y el campo `temario` es
// solo el escape para los módulos donde la derivación queda pobre (hoy 14 de
// 40; test/entrenamiento-portada-oficio.test.mjs los nombra uno por uno). Así
// el temario de los otros 26 no puede desincronizarse de la página: es
// literalmente la lista de sus encabezados. Un solo nivel, sin anidar: la
// jerarquía del Moodle (Normas Generales → 4 sub-viñetas) el KPI ya la expresa
// como granularidad de módulo (of-nor-2..of-nor-6). Si algún día hiciera falta
// anidar de verdad, ahí sí evaluar un segundo nivel de encabezado en
// BloquesOficio; hoy sería inventar jerarquía que el contenido no tiene.
export function temarioDe(m) {
  if (Array.isArray(m?.temario) && m.temario.length > 0) return m.temario.map(limpio)
  return (m?.bloques || [])
    .filter((b) => b.t === 'sub' && b.texto && !SUBS_ANDAMIAJE.has(b.texto))
    .map((b) => limpio(b.texto))
}

// El objetivo del módulo. Aquí el objetivo ES el producto del puesto —
// "qué vas a poder hacer", no "qué se te va a dar a conocer" —, así que el
// `pfv` que ya tienen los 40 módulos hace de objetivo por defecto. El campo
// `objetivo` es para el módulo cuyo pfv no se lee como objetivo.
export function objetivoDe(m) {
  return limpio(m?.objetivo || m?.pfv || '')
}

// El `pfv` solo se repite aparte cuando el objetivo NO es el producto. Si no, la
// portada diría dos veces la misma frase con dos rótulos distintos.
export function pfvAparte(m) {
  return m?.objetivo ? limpio(m.pfv || '') : ''
}

// ponytail: las láminas NO se derivan de los bloques. Derivarlas obligaría a
// recortar la prosa del Manual para que quepa en una lámina, y una cifra o un
// plazo cortado a la mitad deja de ser literal — que es la regla dura de este
// curso. Un módulo sin `laminas` simplemente no pinta el carrusel.
export function laminasDe(m) {
  return Array.isArray(m?.laminas) ? m.laminas : []
}

// El contrato de una lámina, en números. Existe porque la promesa de la
// diapositiva es "se ve completa de un vistazo": la lámina NO lleva scroll
// vertical interno, así que lo que no quepa no se corta — empuja la cinta
// entera hacia abajo y arruina las demás. El único lugar donde se puede
// impedir eso es en el dato, y por eso el test lo mide.
// Los topes salen del ancho real de la lámina en pantalla (min(560px, 84%)):
// ~55 caracteres por línea. MEDIDO en el navegador con una lámina que toca
// TODOS los topes a la vez: 556 px de alto en escritorio (entra de sobra) y
// 831 px en un teléfono de 375 px (la página scrollea un poco; la lámina no).
// Ese es el peor caso posible, no el normal: una lámina que llena los cinco
// campos al máximo está mal escrita antes que mal maquetada.
export const LIMITES_LAMINA = {
  porModulo: [3, 12],   // menos de 3 no es un carrusel; más de 12 no se repasa
  titulo: 70,
  kicker: 32,
  texto: 200,
  items: 5,
  item: 90,
  cierre: 120,
}

// El único énfasis del contenido es **negrita**, y lo parsea BloquesOficio (que
// es 'use client'). La portada y las láminas se pintan en el servidor y no van
// a duplicar ese parser por un rótulo de una línea: aquí la negrita no se
// admite —el test la prohíbe— y esto solo evita que un '**' que se cuele
// aparezca crudo en pantalla.
function limpio(s) {
  return String(s ?? '').replace(/\*\*/g, '').trim()
}
