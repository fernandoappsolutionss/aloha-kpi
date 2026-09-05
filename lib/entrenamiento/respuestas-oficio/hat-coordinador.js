// lib/entrenamiento/respuestas-oficio/hat-coordinador.js — SOLO SERVIDOR.
// Índices correctos (0-based) del quiz de `of-hat-cop`, en el orden de su
// `quiz` en cursos/hat-coordinador.js. No se importa NUNCA desde un componente
// de cliente: hay un test que lo caza.
//
// CÓMO SE COLOCÓ. El paquete del puesto no tiene banco .gift previo, y este
// puesto menos que ninguno: el Manual no le escribe sección, así que no hay
// preguntas heredadas que barajar. Las nueve se redactaron aquí y la correcta
// se colocó a mano mirando dos cosas: que NO quede siempre primera —que es como
// sale una pregunta recién escrita— y que ningún módulo se apruebe eligiendo
// siempre la misma opción. Con 9 preguntas el mínimo es 8; el peor caso aquí
// son 4 aciertos de 9 eligiendo siempre la opción 2.
//
// La Verdadero/Falso NO se baraja: conserva Verdadero (0), Falso (1), igual que
// en normativa.js. La de este módulo (q3) es una afirmación FALSA a propósito:
// creer que el Manual le fija una prima es la confusión más cara del puesto
// —no se la fija: ni prima, ni bono, ni un indicador con monto— y la persona
// tiene que poder decir que no sin dudar.
//
// SI SE AGREGA O SE MUEVE UNA PREGUNTA, este archivo se corrige en la misma
// edición: el test compara el largo contra `quiz.length`, pero un índice movido
// a otra pregunta correcta del mismo largo NO lo caza nadie.
//
// Se registra en lib/entrenamiento/respuestas-oficio/hat.js:
//     import { RESPUESTAS_HAT_COP } from './hat-coordinador.js'
export const RESPUESTAS_HAT_COP = {
  // 1 centros que cumplen y números que cuadran · 2 diez menciones de trámite
  // 3 Falso · 4 el centro en 88 % que decrece · 5 entrenados y números que cuadran
  // 6 sale de su evaluación de desempeño · 7 buscar la diferencia y reportarla
  // 8 el de firmas de maniobra · 9 se eleva a la Junta Directiva por correo
  'of-hat-cop': [1, 2, 1, 0, 2, 2, 1, 1, 3],
}
