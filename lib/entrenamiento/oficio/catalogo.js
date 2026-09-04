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

// Pistas del oficio. Bloque A = común a los dos roles (método, normativa y el
// hat); bloque B = el curso propio de cada puesto.
export const CURSOS = {
  metodo:    { bloque: 'A', titulo: 'Cómo se estudia esto',        roles: ['administradora', 'asistente'] },
  normativa: { bloque: 'A', titulo: 'Normativa de la empresa',     roles: ['administradora', 'asistente'] },
  hat:       { bloque: 'A', titulo: 'Tu hat',                      roles: ['administradora', 'asistente'] },
  centro:    { bloque: 'B', titulo: 'Administrar un Centro ALOHA', roles: ['administradora'] },
  zoho:      { bloque: 'B', titulo: 'Zoho Books y administración', roles: ['asistente'] },
}

// Prefijo obligatorio de todo id de oficio. Sin `:` ni `_`: la columna es TEXT
// y estos ids viajan por la URL.
export const ID_OFICIO = /^of-(met|nor|hat|zoh|cen)-[a-z0-9]+$/

export const MODULO_IDS_OFICIO = new Set(MODULOS_OFICIO.map((m) => m.id))

export function esModuloOficio(id) {
  return typeof id === 'string' && MODULO_IDS_OFICIO.has(id)
}

export function moduloOficio(id) {
  return MODULOS_OFICIO.find((m) => m.id === id) || null
}

// Metadatos para el índice y el checksheet: sin bloques, sin quiz y sin drills.
// La prosa de un módulo pesa; el plan del rol se pinta con esto.
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
    drills: (m.drills || []).length,
    preguntas: (m.quiz || []).length,
  }
}
