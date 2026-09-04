// lib/entrenamiento/respuestas-oficio/normativa.js — SOLO SERVIDOR. No se importa nunca desde un componente de cliente.
// Índices 0-based en el orden de `quiz` de cursos/normativa.js.
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
// Reproducible con `node scripts/oficio-colocacion-bloque-a.mjs`.
//
// Preguntas del banco, en orden, por módulo. of-nor-9 es el último del curso y
// se lleva además la categoría N10 hasta el tope de 10 preguntas:
//   of-nor-1  N1-01 … N1-10
//   of-nor-2  N2-01 … N2-05
//   of-nor-3  N3-01 … N3-08
//   of-nor-4  N4-01 … N4-05
//   of-nor-5  N5-01 … N5-05
//   of-nor-6  N6-01 … N6-08 N6-10 N6-13   (fuera: N6-09 N6-11 N6-12)
//   of-nor-7  N7-01 … N7-06
//   of-nor-8  N8-01 … N8-10               (fuera: N8-11)
//   of-nor-9  N9-01 … N9-07 N10-01 N10-03 N10-04   (fuera: N10-02 N10-05)
// Las 6 que quedan fuera se descartaron por el tope de 10 por módulo. El
// descarte es deliberado: sin esta nota, quien compare banco contra clave lo
// va a leer como preguntas perdidas.
export const RESPUESTAS_NORMATIVA = {
  'of-nor-1': [0, 1, 0, 3, 0, 0, 2, 3, 0, 0],
  'of-nor-2': [3, 2, 1, 0, 0],
  'of-nor-3': [2, 3, 1, 1, 2, 0, 1, 1],
  'of-nor-4': [1, 0, 0, 2, 1],
  'of-nor-5': [0, 0, 2, 3, 0],
  'of-nor-6': [3, 1, 1, 0, 3, 2, 1, 0, 1, 0],
  'of-nor-7': [2, 0, 0, 1, 2, 0],
  'of-nor-8': [0, 0, 3, 2, 1, 0, 3, 2, 1, 3],
  'of-nor-9': [0, 1, 2, 3, 0, 1, 2, 0, 2, 3],
}
