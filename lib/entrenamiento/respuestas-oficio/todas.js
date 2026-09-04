// SOLO SERVIDOR. Barrel de las claves de respuesta del oficio.
// El directorio se llama respuestas-oficio a propósito: casa el regex
// /entrenamiento\/respuestas/ del guard que ya existe en
// test/entrenamiento.test.mjs, así queda protegido sin editar ese archivo.
import { RESPUESTAS_METODO } from './metodo.js'
import { RESPUESTAS_NORMATIVA } from './normativa.js'
import { RESPUESTAS_HAT } from './hat.js'
import { RESPUESTAS_ZOHO } from './zoho.js'
import { RESPUESTAS_CENTRO } from './centro.js'

export const RESPUESTAS_OFICIO = {
  ...RESPUESTAS_METODO,
  ...RESPUESTAS_NORMATIVA,
  ...RESPUESTAS_HAT,
  ...RESPUESTAS_ZOHO,
  ...RESPUESTAS_CENTRO,
}
