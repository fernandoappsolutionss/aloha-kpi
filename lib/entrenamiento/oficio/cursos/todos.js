// Barrel del catálogo de oficio. Las extensiones .js son obligatorias: los
// tests corren con `node --test` (ESM real), que no resuelve extensiones.
//
// El orden del spread NO importa: planDeRol() ordena por `orden` dentro del
// plan de cada rol. Se agrupa por bloque para que se lea como el checksheet:
// primero lo que estudia todo cargo (A), después el curso propio de cada
// puesto (B) y al final el paquete que se entrega en papel (C).
import { METODO } from './metodo.js'
import { NORMATIVA } from './normativa.js'
import { HAT } from './hat.js'
import { ZOHO } from './zoho.js'
import { CENTRO } from './centro.js'
import { COACH } from './coach.js'
import { COORDINACION } from './coordinador.js'
import { ASEO } from './aseo.js'

export const MODULOS_OFICIO = [
  // Bloque A — todo cargo.
  ...METODO, ...NORMATIVA, ...HAT,
  // Bloque B — el curso propio de cada puesto.
  ...CENTRO, ...ZOHO, ...COACH, ...COORDINACION,
  // Bloque C — el paquete que se imprime y se firma en tinta.
  ...ASEO,
]
