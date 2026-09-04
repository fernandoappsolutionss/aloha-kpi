// SOLO SERVIDOR. Índices correctos (0-based) del quiz de cada módulo del curso
// "hat", en el orden de su `quiz`. Nunca lo importa un componente cliente.
// ESQUELETO del frente de contenido: los índices salen del '=' del GIFT tras
// el barajado determinista del importador, nunca de un dedo.
//
// Un módulo por puesto, escritos por dos frentes en paralelo: cada rol vive en
// su archivo y este sólo los une.
import { RESPUESTAS_HAT_ADM } from './hat-administradora.js'
import { RESPUESTAS_HAT_ASI } from './hat-asistente.js'

export const RESPUESTAS_HAT = { ...RESPUESTAS_HAT_ADM, ...RESPUESTAS_HAT_ASI }
