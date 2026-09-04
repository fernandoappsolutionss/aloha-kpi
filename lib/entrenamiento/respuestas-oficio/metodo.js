// lib/entrenamiento/respuestas-oficio/metodo.js — SOLO SERVIDOR. No se importa nunca desde un componente de cliente.
// Índices 0-based en el orden de `quiz` de cursos/metodo.js.
//
// SIN BANCO GIFT. 00-como-se-estudia.html no trae banco, así que las 24
// preguntas se redactaron desde el propio texto de la fuente y se colocaron con
// la misma regla del resto del oficio, sobre IDS SINTÉTICOS:
//   of-met-1 → HCA1-01 … HCA1-07
//   of-met-2 → HCA2-01 … HCA2-07
//   of-met-3 → HCA3-01 … HCA3-10
//   pos = fnv1a32(id) % numeroDeOpciones
// Las Verdadero/Falso conservan Verdadero (0), Falso (1). Los ids están
// declarados en IDS_SINTETICOS (scripts/oficio-colocacion-bloque-a.mjs), que
// verifica estas claves al correr: sin esa declaración nadie podría
// reproducirlas desde el repo.
export const RESPUESTAS_METODO = {
  'of-met-1': [2, 3, 0, 1, 2, 0, 1],
  'of-met-2': [1, 0, 3, 2, 1, 1, 0],
  'of-met-3': [0, 1, 2, 3, 0, 1, 2, 1, 0, 1],
}
