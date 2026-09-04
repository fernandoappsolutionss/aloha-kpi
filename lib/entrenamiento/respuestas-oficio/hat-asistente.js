// SOLO SERVIDOR. Índices correctos (0-based) del quiz de `of-hat-asi`, en el
// orden de su `quiz`. Nunca lo importa un componente cliente.
//
// El hat no tiene banco GIFT: las seis preguntas se redactaron desde
// hca/hat-asistente.html y sus opciones se colocaron con la misma regla
// determinista del resto del oficio,
//   pos = fnv1a32(idDePregunta) % numeroDeOpciones
// con los ids HA-01 … HA-06. Las Verdadero/Falso conservan el orden
// Verdadero (0), Falso (1).
//
// Vive en su propio archivo porque el curso `hat` lo escriben dos frentes en
// paralelo, uno por rol. lib/entrenamiento/respuestas-oficio/hat.js sólo une:
//     import { RESPUESTAS_HAT_ADM } from './hat-administradora.js'
//     import { RESPUESTAS_HAT_ASI } from './hat-asistente.js'
//     export const RESPUESTAS_HAT = { ...RESPUESTAS_HAT_ADM, ...RESPUESTAS_HAT_ASI }
export const RESPUESTAS_HAT_ASI = {
  'of-hat-asi': [2, 3, 0, 1, 1, 3],
}
