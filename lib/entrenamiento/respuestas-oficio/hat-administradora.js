// SOLO SERVIDOR. Nunca se importa desde un componente cliente.
// Índices 0-based en el orden del `quiz` de lib/entrenamiento/oficio/cursos/hat-administradora.js.
//
// SIN BANCO GIFT. El paquete del hat no trae banco: las seis preguntas se
// redactaron desde hat-administradora.html y curso-1-administradora.html#m0, y
// se colocaron con la misma regla determinista del resto del oficio, sobre los
// ids sintéticos HADM-01 … HADM-06:
//   pos = fnv1a32(id) % numeroDeOpciones
// Las Verdadero/Falso conservan Verdadero (0), Falso (1). Los ids están
// declarados en IDS_SINTETICOS (scripts/oficio-colocacion-bloque-a.mjs), que
// verifica esta clave al correr.
//
// Archivo propio por rol: respuestas-oficio/hat.js une of-hat-adm y of-hat-asi.
export const RESPUESTAS_HAT_ADM = { 'of-hat-adm': [3, 1, 1, 1, 3, 2] }
