// lib/entrenamiento/respuestas-oficio/coordinador.js — SOLO SERVIDOR.
// No se importa NUNCA desde un componente de cliente: hay un test que lo caza.
// Índices 0-based en el orden de `quiz` de cursos/coordinador.js (curso
// `coordinacion`, módulos of-cop-1 … of-cop-10).
//
// CÓMO SE COLOCÓ, Y EN QUÉ SE DIFERENCIA DEL BLOQUE A.
// El curso del Coordinador Operativo es el ÚNICO sin banco .gift previo: no
// existía un curso escrito de este puesto, así que no hay un `=` del que
// derivar la posición ni un id de banco que hashear con
// scripts/oficio-colocacion-bloque-a.mjs. Las preguntas se redactaron aquí y la
// opción correcta se colocó a mano, mirando dos cosas a la vez:
//   1. Que la correcta NO quede siempre primera (que es como sale una pregunta
//      recién escrita, porque uno redacta primero la respuesta que tiene en la
//      cabeza y después los distractores).
//   2. Que ningún módulo se apruebe eligiendo siempre la misma opción. Eso lo
//      verifica un test contra minimoAprobacion(n), y aquí el peor caso es
//      of-cop-2 y of-cop-8 con 4 aciertos de 10 eligiendo siempre la opción 2,
//      contra un mínimo de 8.
// Las Verdadero/Falso NO se barajan: conservan Verdadero (0), Falso (1), igual
// que en normativa.js, porque invertirlas en pantalla es antinatural. Las cuatro
// de este curso (of-cop-1 q1, of-cop-2 q3, of-cop-4 q5 y of-cop-5 q6) son todas
// afirmaciones FALSAS a propósito: las cuatro son la confusión típica del
// puesto, y la persona tiene que poder decir que no.
//
// REPARTO REAL, contado sobre las 86 preguntas del curso:
//   opción 1 (índice 0) → 22 · opción 2 (índice 1) → 30
//   opción 3 (índice 2) → 23 · opción 4 (índice 3) → 11
// El índice 3 sale menos porque 4 preguntas son de dos opciones (V/F) y ahí no
// existe; y esas cuatro suman al índice 1, que es "Falso". Descontándolas, sobre
// las 82 de opción múltiple el reparto es 22/26/23/11.
//
// SI SE AGREGA O SE MUEVE UNA PREGUNTA, este archivo se corrige en la misma
// edición: el test compara el largo de cada arreglo contra `quiz.length` de su
// módulo y falla, pero un índice movido a otra pregunta correcta del mismo
// largo NO lo caza nadie — enseñaría lo contrario en silencio.
//
// Se registra en lib/entrenamiento/respuestas-oficio/todas.js:
//     import { RESPUESTAS_COORDINACION } from './coordinador.js'
//     export const RESPUESTAS_OFICIO = { …, ...RESPUESTAS_COORDINACION }
export const RESPUESTAS_COORDINACION = {
  // 1 Falso · 2 Ruta de Nivel · 3 más de 230 · 4 las tres salidas
  // 5 decide el Administrador · 6 sube a la Junta · 7 se recorre entera · 8 el mismo día
  'of-cop-1': [1, 1, 2, 2, 3, 0, 2, 1],

  // 1 noventa y uno por ciento · 2 Producto · 3 Falso · 4 las calcula el sistema
  // 5 falla meta Y decrece · 6 no puede ser verde · 7 medio niño al mes
  // 8 los dos marcadores por separado · 9 se escribe al lado · 10 color, meta, verdicto
  'of-cop-2': [3, 0, 1, 2, 1, 1, 0, 2, 0, 1],

  // 1 noventa · 2 cuarenta y nueve de cuarenta y nueve · 3 copia del mes anterior
  // 4 el 88 por ciento que decrece · 5 no tiene con qué compararlo · 6 el registro guarda Sí
  // 7 que se cargue el dato · 8 falta grave · 9 barrido completo · 10 tema de la Junta
  'of-cop-3': [3, 0, 1, 2, 3, 0, 2, 2, 0, 1],

  // 1 él solicita, tú confeccionas · 2 tres meses con uno de prueba
  // 3 colaborador y representante legal · 4 sello y Caja de Seguro Social · 5 Falso
  // 6 recibido de copia · 7 cinco documentos · 8 autorización escrita y firmada
  'of-cop-4': [0, 2, 1, 3, 1, 0, 2, 0],

  // 1 un año con tres meses de prueba · 2 a las 2 semanas · 3 el Administrador, cinco días antes
  // 4 un mes antes · 5 el último día de trabajo · 6 Falso · 7 a la Junta ese mismo día
  'of-cop-5': [1, 0, 2, 1, 0, 1, 3],

  // 1 inmediatamente · 2 a la Junta por correo · 3 con la firma del Administrador
  // 4 la ausencia, no el pago · 5 cuando lo pide la empresa · 6 reclamo escrito
  // 7 dieciocho · 8 no archivarlo
  'of-cop-6': [0, 1, 2, 0, 3, 1, 2, 2],

  // 1 el Coordinador pasa la lista · 2 la ficha del incobrable · 3 evidencia y aviso inmediato
  // 4 el Administrador del Centro · 5 día 31 al 45 · 6 la peor cifra del mes
  // 7 el tramo no se negocia · 8 amigable · 9 la fecha anotada
  'of-cop-7': [1, 0, 3, 2, 2, 2, 3, 0, 1],

  // 1 la fórmula del cuadro · 2 kits solicitados · 3 Zoho, cuadro y KPI
  // 4 factura de un mes cobrada en otro · 5 cerrar con la diferencia escrita · 6 falta grave
  // 7 dos errores que se anulan · 8 donde está el error · 9 se documenta igual · 10 a la Junta
  'of-cop-8': [0, 1, 2, 0, 1, 2, 1, 0, 1, 3],

  // 1 lo firma el jefe entrenador · 2 el de firmas · 3 quien firma no se sienta
  // 4 poniéndola a hacerlo · 5 no firmas y devuelves al estudio · 6 marcada como lista sin saber
  // 7 cada módulo se apoya en el anterior · 8 el Administrador con su formato
  'of-cop-9': [0, 2, 2, 1, 2, 1, 1, 1],

  // 1 el formato no cambia · 2 lo que solo tú viste · 3 correo electrónico
  // 4 exclusivamente el Corporativo · 5 el Corporativo con informe técnico
  // 6 contratos, inscripciones, permisos y files · 7 no se suaviza · 8 diez menciones sin sección
  'of-cop-10': [1, 2, 0, 3, 0, 1, 1, 1],
}

// Alias, por la misma razón que en cursos/coordinador.js: el curso se llama
// `coordinacion` y el archivo se llama por el puesto. Es el MISMO objeto.
export const RESPUESTAS_COORDINADOR = RESPUESTAS_COORDINACION
