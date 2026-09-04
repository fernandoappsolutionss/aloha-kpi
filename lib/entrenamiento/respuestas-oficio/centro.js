// SOLO SERVIDOR. Nunca se importa desde un componente cliente.
// Índices 0-based en el orden del `quiz` de lib/entrenamiento/oficio/cursos/centro.js.
//
// CÓMO SE COLOCA (y qué garantiza y qué no). En el banco GIFT la correcta va
// siempre primera; publicada así, todo el quiz se aprobaría eligiendo la opción
// 1. Aquí va en la posición
//   pos = fnv1a32(idDePreguntaDelBanco) % numeroDeOpciones
// Las Verdadero/Falso NO se barajan: conservan Verdadero (0), Falso (1) porque
// invertirlas en pantalla es antinatural. Por eso el índice 0 sale más veces que
// los otros en el total del oficio (100 de 296): el banco tiene más afirmaciones
// verdaderas que falsas. En las de opción múltiple el reparto sí es parejo
// (47/57/57/59 de 220). Lo que SÍ está garantizado, y lo caza un test, es que
// ningún módulo se aprueba eligiendo siempre la misma opción.
// Reproducible con `node scripts/oficio-colocacion-centro.mjs`, que además
// imprime el mapeo módulo↔banco (la constante ORDEN) y lo que quedó fuera.
//
// FUERA DEL QUIZ, a propósito: 15 preguntas del banco, por el tope de 10 por
// módulo o por decir lo mismo que otra. Sin esta nota, quien compare el banco
// contra la clave las va a leer como preguntas perdidas:
//   of-cen-3   A3-09 (duplica A3-08) · A3-10 · A3-13 (duplica A3-12)
//   of-cen-5   A5-05 · A5-07 · A5-10 · A5-12 (duplica A5-11) · A5-15
//   of-cen-7   A7-02 (duplica el par de A7-01)
//   of-cen-9   A9-06 · A9-07 · A9-13 · A9-14
//   of-cen-11  A11-08 (duplica el par de A11-07) · A11-11
export const RESPUESTAS_CENTRO = {
  'of-cen-1': [1, 0, 0, 2, 1, 0, 3, 2],
  'of-cen-2': [2, 0, 0, 1, 0, 3, 0, 0],
  'of-cen-3': [3, 2, 1, 0, 3, 2, 0, 0, 2, 3],
  'of-cen-4': [0, 0, 2, 3, 0, 0, 2, 3],
  'of-cen-5': [1, 0, 3, 2, 0, 2, 1, 0, 2, 3],
  'of-cen-6': [2, 3, 0, 1, 2, 3, 1, 1],
  'of-cen-7': [3, 1, 0, 0, 2, 1, 1, 3, 1, 0],
  'of-cen-8': [0, 1, 0, 3, 0, 0, 1, 3, 0],
  'of-cen-9': [1, 0, 3, 2, 1, 2, 1, 3, 0, 1],
  'of-cen-10': [3, 0, 1, 0, 0, 2],
  'of-cen-11': [2, 3, 1, 1, 2, 3, 0, 2, 0, 1],
  'of-cen-12': [1, 0, 3, 2, 1, 0, 3, 0, 1],
  'of-cen-13': [0, 1, 2, 3, 0],
}
