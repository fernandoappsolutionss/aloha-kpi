// SOLO SERVIDOR. Índices correctos (0-based) del quiz de cada módulo del curso
// "hat", en el orden de su `quiz`. Nunca lo importa un componente cliente.
// ESQUELETO del frente de contenido: los índices salen del '=' del GIFT tras
// el barajado determinista del importador, nunca de un dedo.
//
// Un módulo por puesto, escritos por frentes en paralelo: cada rol vive en su
// archivo y este sólo los une. Los cuatro puestos del sistema tienen su
// paquete: administradora, asistente, coach y coordinador operativo.
//
// Los dos últimos NO traen banco GIFT —el paquete del puesto no lo tiene, y al
// Coordinador el Manual ni siquiera le escribe sección— así que sus preguntas
// se redactaron a mano y la correcta se colocó a mano. El porqué de cada
// colocación vive en la cabecera de su propio archivo.
import { RESPUESTAS_HAT_ADM } from './hat-administradora.js'
import { RESPUESTAS_HAT_ASI } from './hat-asistente.js'
import { RESPUESTAS_HAT_COA } from './hat-coach.js'
import { RESPUESTAS_HAT_COP } from './hat-coordinador.js'

export const RESPUESTAS_HAT = {
  ...RESPUESTAS_HAT_ADM,
  ...RESPUESTAS_HAT_ASI,
  ...RESPUESTAS_HAT_COA,
  ...RESPUESTAS_HAT_COP,
}
