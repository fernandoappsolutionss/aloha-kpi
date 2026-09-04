// SOLO SERVIDOR. Índices correctos (0-based) del quiz de cada módulo del curso
// "zoho", en el orden de su `quiz`. Nunca lo importa un componente cliente.
//
// De dónde salen: del `=` de curso-2-zoho-asistentes.gift, después de colocar
// la opción correcta en la posición determinista
//   pos = fnv1a32(idGiftDeLaPregunta) % numeroDeOpciones
// que documenta la cabecera de lib/entrenamiento/oficio/cursos/zoho.js. Las
// Verdadero/Falso conservan el orden Verdadero (0), Falso (1), así que el índice
// 0 sale más veces que los otros: el banco tiene más afirmaciones verdaderas que
// falsas. Ningún índice se puso a dedo.
//
// DESEMPATE ANTIDEGENERACIÓN. of-zoh-7 tiene 4 preguntas (mínimo 3) y el hash
// las dejaba en [2,0,0,0]: se aprobaba eligiendo siempre la opción 1. La regla
// rota +1 la última pregunta de opción múltiple hasta que ninguna opción fija
// alcanza el mínimo — por eso Z7-03 va en 1 y no en 0. Está en
// scripts/oficio-colocacion-bloque-a.mjs (antidegenerar) y lo verifica un test.
//
// Preguntas GIFT, en orden, por módulo:
//   of-zoh-1  Z1-01 Z1-02 Z1-03 Z1-04
//   of-zoh-2  Z2-01 … Z2-06
//   of-zoh-3  Z3-01 … Z3-07
//   of-zoh-4  Z4-01 … Z4-04
//   of-zoh-5  Z5-01 … Z5-07
//   of-zoh-6  Z6-01 … Z6-05
//   of-zoh-7  Z7-01 … Z7-04
//   of-zoh-8  Z8-01 … Z8-09
//   of-zoh-9  Z9-01 … Z9-06
//   of-zoh-10 Z10-01 … Z10-07
//   of-zoh-11 Z11-01 Z11-02 Z11-03 Z11-04 Z11-05 Z11-07 Z11-08 Z11-09 Z11-10 Z11-11
//             (Z11-06 fuera: el módulo trae 11 en el banco y el tope del quiz es 10)
//   of-zoh-12 Z12-01 … Z12-06
//   of-zoh-13 Z13-01 … Z13-05  (categoría "Casos integradores")
export const RESPUESTAS_ZOHO = {
  'of-zoh-1': [0, 0, 1, 3],
  'of-zoh-2': [3, 0, 1, 0, 3, 1],
  'of-zoh-3': [2, 3, 0, 1, 0, 3, 0],
  'of-zoh-4': [1, 1, 3, 2],
  'of-zoh-5': [0, 1, 1, 3, 0, 1, 2],
  'of-zoh-6': [3, 2, 0, 1, 3],
  'of-zoh-7': [2, 0, 1, 0],
  'of-zoh-8': [1, 0, 3, 2, 1, 0, 0, 2, 0],
  'of-zoh-9': [0, 1, 2, 0, 1, 1],
  'of-zoh-10': [0, 1, 0, 3, 0, 1, 2],
  'of-zoh-11': [1, 0, 3, 2, 1, 3, 2, 0, 3, 0],
  'of-zoh-12': [2, 3, 0, 1, 2, 0],
  'of-zoh-13': [3, 2, 1, 0, 3],
}
