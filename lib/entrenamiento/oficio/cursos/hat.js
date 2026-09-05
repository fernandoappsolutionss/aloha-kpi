// Curso "hat" del entrenamiento de oficio. ESQUELETO del frente de contenido:
// lo llena scripts/oficio-importar.mjs desde docs/entrenamiento/fuente/.
// Los `id` son la clave de progreso en entrenamiento_progreso.modulo:
// renombrar uno BORRA el avance de todo el mundo. No se renumeran nunca.
// Los índices correctos del quiz viven en lib/entrenamiento/respuestas-oficio/hat.js
//
// El curso `hat` tiene un módulo por puesto y los escriben varios frentes en
// paralelo, así que cada rol vive en su propio archivo y este sólo los une.
// Son los CUATRO puestos con cuenta en el sistema: administradora, asistente,
// coach y coordinador operativo. (El personal de aseo no entra: no recibe
// cuenta, su paquete es el bloque C y se firma en tinta.)
//
// LOS CUATRO COMPARTEN EL ORDEN 13 y no se pisan: el orden es único DENTRO del
// plan de cada rol, no entre planes, y ningún rol lleva el paquete de otro.
// El test de forma lo comprueba rol por rol.
import { HAT_ADM } from './hat-administradora.js'
import { HAT_ASI } from './hat-asistente.js'
import { HAT_COA } from './hat-coach.js'
import { HAT_COP } from './hat-coordinador.js'

export const HAT = [...HAT_ADM, ...HAT_ASI, ...HAT_COA, ...HAT_COP]
