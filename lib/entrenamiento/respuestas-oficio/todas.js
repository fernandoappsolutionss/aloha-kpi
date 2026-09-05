// SOLO SERVIDOR. Barrel de las claves de respuesta del oficio.
// El directorio se llama respuestas-oficio a propósito: casa el regex
// /entrenamiento\/respuestas/ del guard que ya existe en
// test/entrenamiento.test.mjs, así queda protegido sin editar ese archivo.
//
// Un curso sin su archivo aquí tumba el barrido de quiz de
// test/entrenamiento-oficio.test.mjs: la clave y el catálogo se enchufan JUNTOS.
// Las seis hojas de papel del aseo (of-ase-1..6) no tienen cuestionario: sí
// aparecen en RESPUESTAS_ASEO, con la clave en un array vacío, para que
// Object.keys(RESPUESTAS_OFICIO) siga cuadrando módulo por módulo con el
// catálogo. La única con preguntas es of-ase-0, que sí se estudia en pantalla.
// La explicación larga vive en la cabecera de ./aseo.js.
import { RESPUESTAS_METODO } from './metodo.js'
import { RESPUESTAS_NORMATIVA } from './normativa.js'
import { RESPUESTAS_HAT } from './hat.js'
import { RESPUESTAS_ZOHO } from './zoho.js'
import { RESPUESTAS_CENTRO } from './centro.js'
import { RESPUESTAS_COACH } from './coach.js'
import { RESPUESTAS_COORDINACION } from './coordinador.js'
import { RESPUESTAS_ASEO } from './aseo.js'

export const RESPUESTAS_OFICIO = {
  ...RESPUESTAS_METODO,
  ...RESPUESTAS_NORMATIVA,
  ...RESPUESTAS_HAT,
  ...RESPUESTAS_ZOHO,
  ...RESPUESTAS_CENTRO,
  ...RESPUESTAS_COACH,
  ...RESPUESTAS_COORDINACION,
  ...RESPUESTAS_ASEO,
}
