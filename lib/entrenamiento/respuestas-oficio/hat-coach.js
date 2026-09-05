// lib/entrenamiento/respuestas-oficio/hat-coach.js — SOLO SERVIDOR.
// Índices correctos (0-based) del quiz de `of-hat-coa`, en el orden de su
// `quiz` en cursos/hat-coach.js. No se importa NUNCA desde un componente de
// cliente: hay un test que lo caza.
//
// CÓMO SE COLOCÓ. El paquete del puesto no tiene banco .gift previo (el
// curso-4-coach.gift cubre los módulos 2 a 12, que son of-coa-1..of-coa-11;
// las nueve preguntas C1-01…C1-09 del perfil se reescribieron aquí junto con
// las del producto, que el HTML no tenía). La correcta se colocó a mano
// mirando dos cosas: que NO quede siempre primera —que es como sale una
// pregunta recién escrita— y que ningún módulo se apruebe eligiendo siempre la
// misma opción. Aquí el peor caso son 4 aciertos de 8 eligiendo siempre la
// opción 2, contra un mínimo de 7.
//
// La Verdadero/Falso NO se baraja: conserva Verdadero (0), Falso (1), igual que
// en normativa.js. La de este módulo (q4) es una afirmación FALSA a propósito:
// es la confusión más cara del puesto —creer que le pagan por retención— y la
// persona tiene que poder decir que no.
//
// SI SE AGREGA O SE MUEVE UNA PREGUNTA, este archivo se corrige en la misma
// edición: el test compara el largo contra `quiz.length`, pero un índice movido
// a otra pregunta correcta del mismo largo NO lo caza nadie.
//
// Se registra en lib/entrenamiento/respuestas-oficio/hat.js:
//     import { RESPUESTAS_HAT_COA } from './hat-coach.js'
export const RESPUESTAS_HAT_COA = {
  // 1 niños que se quedan y suben · 2 llevarlo con el Administrador
  // 3 puesto tomado, el nivel es del Master Coach · 4 Falso
  // 5 el niño graduado · 6 veinte minutos antes con quince de tolerancia
  // 7 consultarlo con el Administrador antes · 8 no paga solo, pero sin él no se prueba nada
  'of-hat-coa': [2, 1, 1, 1, 0, 3, 1, 2],
}
