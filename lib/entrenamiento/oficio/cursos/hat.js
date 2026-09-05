// Curso "hat" del entrenamiento de oficio. ESQUELETO del frente de contenido:
// lo llena scripts/oficio-importar.mjs desde docs/entrenamiento/fuente/.
// Los `id` son la clave de progreso en entrenamiento_progreso.modulo:
// renombrar uno BORRA el avance de todo el mundo. No se renumeran nunca.
// Los índices correctos del quiz viven en lib/entrenamiento/respuestas-oficio/hat.js
//
// El curso `hat` tiene un módulo por puesto y los escriben dos frentes en
// paralelo, así que cada rol vive en su propio archivo y este sólo los une.
import { HAT_ADM } from './hat-administradora.js'
import { HAT_ASI } from './hat-asistente.js'

export const HAT = [...HAT_ADM, ...HAT_ASI]

// PENDIENTE DE ENCHUFAR: HAT_COA (cursos/hat-coach.js) y HAT_COP
// (cursos/hat-coordinador.js), con sus claves en respuestas-oficio/hat.js. Ver
// la nota de cursos/todos.js: los cuatro hats comparten el orden 13 porque el
// orden es único DENTRO del plan de cada rol, no entre planes.
