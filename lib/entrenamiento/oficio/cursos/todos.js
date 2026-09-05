// Barrel del catálogo de oficio. Las extensiones .js son obligatorias: los
// tests corren con `node --test` (ESM real), que no resuelve extensiones.
import { METODO } from './metodo.js'
import { NORMATIVA } from './normativa.js'
import { HAT } from './hat.js'
import { ZOHO } from './zoho.js'
import { CENTRO } from './centro.js'

export const MODULOS_OFICIO = [...METODO, ...NORMATIVA, ...HAT, ...ZOHO, ...CENTRO]

// PENDIENTE DE ENCHUFAR — los tres cursos nuevos. El andamiaje ya los espera
// (catalogo.js los declara en CURSOS, ID_OFICIO acepta of-coa/of-cop/of-ase, la
// jerarquía los firma y la hoja de papel se imprime), pero sus archivos los
// escribe el frente de contenido y no se importan hasta que los tres existan
// CON su clave de respuestas: un curso sin su archivo en respuestas-oficio/
// tumba el barrido de quiz de test/entrenamiento-oficio.test.mjs.
//
// Cuando estén, esto es una línea de import por archivo y sumarlos arriba:
//   import { COACH }        from './coach.js'          + respuestas-oficio/coach.js
//   import { COORDINACION } from './coordinador.js'    + respuestas-oficio/coordinacion.js
//   import { ASEO }         from './aseo.js'           + respuestas-oficio/aseo.js
// y en cursos/hat.js, HAT_COA y HAT_COP (+ respuestas-oficio/hat.js).
// Las extensiones .js son obligatorias: node --test es ESM real.
