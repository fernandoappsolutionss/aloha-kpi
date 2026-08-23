// SOLO SERVIDOR. Índices correctos del quiz de cada módulo (0-based), en el
// orden de MODULOS[].quiz. Lo importa app/actions/entrenamiento.js; nunca un
// componente cliente. test/entrenamiento.test.mjs verifica forma y rango.
export const RESPUESTAS = {
  meta:           [2, 1, 3],
  modelo:         [1, 2, 1],
  aperturar:      [3, 0, 2],
  'clase-prueba': [2, 1, 3],
  inscribir:      [2, 3, 1],
  llenado:        [0, 2, 3],
  itinerario:     [2, 0, 3],
  fusiones:       [1, 3, 1],
  cierre:         [1, 2, 3],
}
