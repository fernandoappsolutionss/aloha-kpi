// CUÁL ENLACE DEL MENÚ ES "LA PÁGINA ACTUAL" — cálculo puro, sin React.
// Vive en .mjs y sin dependencias del framework (como components/dialog-lifetime.mjs)
// para que lo usen las dos puntas y no puedan divergir: el Sidebar lo usa para
// pintar aria-current, y el barrido R10 (tests/e2e/helpers/r10-audit.mjs) para
// saber qué enlace exigir activo en cada ruta.
//
// POR QUÉ EXISTE. La regla anterior era `path === href` más un caso especial
// para el árbol de entrenamiento (`href.endsWith('/entrenamiento') &&
// path.startsWith(href + '/')`), y con eso DOS enlaces se marcaban a la vez:
//   /dashboard/entrenamiento/oficio    → "Entrenamiento" (por el prefijo) Y "Oficio (hats)"
//   /centro/<id>/entrenamiento/firmas  → "Entrenamiento" (por el prefijo) Y "Firmas de maniobra"
// Dos "página actual" no dicen dónde estás: el lector de pantalla anuncia dos
// destinos actuales y la marca visual pierde el sentido (WCAG 2.4.8). Por eso
// gana UNO SOLO, y es el más específico.
//
// LA REGLA: de todos los enlaces del menú que CUBREN la ruta abierta —el
// enlace mismo, o un ancestro de ruta— gana el más largo. Así:
//   /dashboard/entrenamiento/oficio            → /dashboard/entrenamiento/oficio
//   /centro/2/entrenamiento/oficio/of-cen-1/sop → /centro/2/entrenamiento
//     (lo más adentro que llega el menú: el módulo y su hoja no son ítems)
//   /centro/2/kpi                              → /centro/2/kpi, no /centro/2
// Cubrir es por SEGMENTO de ruta, no por texto: /centro/21 no lo cubre
// /centro/2, aunque la cadena empiece igual.

import { esRutaHistorial, HISTORIAL_HREF } from './historial-navigation.mjs'

const cubre = (href, path) => path === href || path.startsWith(`${href}/`)

/**
 * @param {string} path   la ruta abierta (sin query ni hash)
 * @param {string[]} hrefs los href de los enlaces del menú
 * @returns {string|null} el href que debe llevar aria-current="page", o null
 *   si ninguno cubre la ruta (ahí no se marca nada, en vez de inventar uno)
 */
export function hrefActivo(path, hrefs) {
  if (typeof path !== 'string' || !path) return null
  // Metas, Alertas y Reportes conservan sus enlaces y se agrupan en Historial.
  // La agrupación solo rige si ese acceso existe en este menú (no en centros).
  if (hrefs?.includes(HISTORIAL_HREF) && esRutaHistorial(path)) return HISTORIAL_HREF
  let activo = null
  for (const href of hrefs || []) {
    if (typeof href !== 'string' || !href.startsWith('/')) continue
    if (!cubre(href, path)) continue
    if (activo === null || href.length > activo.length) activo = href
  }
  return activo
}
