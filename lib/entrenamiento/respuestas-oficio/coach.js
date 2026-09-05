// lib/entrenamiento/respuestas-oficio/coach.js — SOLO SERVIDOR. No lo importa
// nunca un componente de cliente. Índices 0-based en el orden de `quiz` de
// lib/entrenamiento/oficio/cursos/coach.js.
//
// CÓMO SE COLOCA. Misma regla que los otros cuatro cursos del oficio, para que
// la clave sea reproducible y auditable desde el repo. En el banco GIFT la
// correcta va siempre primera (`=`); publicada así, todo el quiz se aprobaría
// eligiendo la opción 1. Aquí la correcta va en
//   pos = fnv1a32(idDePreguntaDelBanco) % numeroDeOpciones
// con los distractores en el orden del GIFT. Las Verdadero/Falso NO se barajan:
// conservan Verdadero (0), Falso (1), porque invertirlas en pantalla es
// antinatural. Las funciones son las de scripts/oficio-colocacion-bloque-a.mjs
// (hash32, vf, antidegenerar): cambiar el hash rebarajaría todos los quizzes ya
// publicados, así que la regla es una sola para los cinco cursos.
//
// ANTIDEGENERAR NO MOVIÓ NADA EN ESTE CURSO. Los once módulos salieron ya
// repartidos: ninguno alcanza su mínimo de aprobación en un solo índice. El
// peor caso es of-coa-3, con seis ceros de diez y mínimo ocho.
//
// QUÉ PREGUNTA DEL BANCO ES CADA UNA, en orden. El banco tiene 127 preguntas en
// trece categorías; M1 (nueve preguntas del perfil del Coach) se la lleva
// of-hat-coa, que vive en cursos/hat-coach.js con su propia clave. Aquí se
// publican 107:
//   of-coa-1   C2-01 … C2-08
//   of-coa-2   C3-01 … C3-10
//   of-coa-3   C4-01 … C4-09  C13-07
//   of-coa-4   C5-01 … C5-10                (fuera: C5-11)
//   of-coa-5   C6-01 … C6-09  C13-01
//   of-coa-6   C7-01 … C7-09  C13-05
//   of-coa-7   C8-01 … C8-09
//   of-coa-8   C9-01 … C9-10                (fuera: C9-11, C9-12)
//   of-coa-9   C10-01 … C10-09  C13-09
//   of-coa-10  C11-01 … C11-10
//   of-coa-11  C12-01 C12-02 C12-03 C12-05 … C12-11   (fuera: C12-04, C12-12)
//
// LAS ONCE QUE QUEDAN FUERA, y por qué. El descarte es deliberado: sin esta
// nota, quien compare banco contra clave lo va a leer como preguntas perdidas.
//   C5-11  — el accidente leve que no se reporta. Duplica C5-10 y el protocolo
//            completo ya se evalúa en of-nor-8, que el Coach lleva en bloque A.
//   C9-11  — el recargo por avisar tarde la inasistencia a una reposición. El
//            precio y el cobro los maneja la administración, no el Coach.
//   C9-12  — abordar un tema delicado a solas con los padres. Es la materia de
//            of-coa-5, donde se evalúa con C6-03, C6-04 y C6-05.
//   C12-04 — la explicación gráfica en el pizarrón para Tiny. Queda en el
//            cuerpo del módulo y en el primer paso de su hoja.
//   C12-12 — el progreso del niño en otras áreas. Queda en el paso a paso.
//   C13-02, C13-03, C13-04, C13-06, C13-08, C13-10 — casos integradores cuyo
//            contenido ya se evalúa en el módulo del que salen, y que no caben
//            por el tope de 10 preguntas por módulo.
//
// Los cuatro integradores que SÍ entraron (C13-07, C13-01, C13-05 y C13-09)
// ocupan el décimo cupo de módulos que traían nueve, y cada uno cae en el
// módulo cuya regla pone a prueba.
export const RESPUESTAS_COACH = {
  'of-coa-1': [0, 1, 2, 0, 0, 1, 0, 1],
  'of-coa-2': [1, 0, 3, 2, 1, 0, 0, 0, 1, 3],
  'of-coa-3': [2, 0, 0, 0, 2, 3, 0, 1, 0, 0],
  'of-coa-4': [3, 0, 1, 0, 0, 2, 1, 0, 3, 0],
  'of-coa-5': [0, 1, 2, 3, 0, 1, 2, 0, 0, 2],
  'of-coa-6': [1, 0, 3, 2, 1, 0, 0, 2, 1, 2],
  'of-coa-7': [2, 3, 0, 1, 1, 3, 0, 1, 1],
  'of-coa-8': [3, 2, 1, 0, 0, 2, 1, 0, 0, 1],
  'of-coa-9': [1, 0, 3, 2, 1, 0, 3, 0, 0, 2],
  'of-coa-10': [0, 1, 2, 3, 0, 1, 2, 0, 1, 2],
  'of-coa-11': [3, 2, 1, 3, 2, 1, 0, 3, 1, 1],
}
