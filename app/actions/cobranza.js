'use server'
import { sql } from '../../lib/db'
import { requireCurrentCentroAccess } from '../../lib/auth'
import { leerDetalleCobranza } from '../../lib/cobranza-detalle.mjs'

export async function getFacturasVencidas(consulta) {
  try {
    return await leerDetalleCobranza(consulta, { autorizar: requireCurrentCentroAccess, query: sql })
  } catch {
    return { error: 'No se pudo consultar el detalle. Comprueba tu acceso al centro e inténtalo de nuevo.' }
  }
}
