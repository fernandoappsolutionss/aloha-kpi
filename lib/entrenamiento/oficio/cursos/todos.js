// Barrel del catálogo de oficio. Las extensiones .js son obligatorias: los
// tests corren con `node --test` (ESM real), que no resuelve extensiones.
import { METODO } from './metodo.js'
import { NORMATIVA } from './normativa.js'
import { HAT } from './hat.js'
import { ZOHO } from './zoho.js'
import { CENTRO } from './centro.js'

export const MODULOS_OFICIO = [...METODO, ...NORMATIVA, ...HAT, ...ZOHO, ...CENTRO]
