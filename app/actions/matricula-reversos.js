'use server'

import { requireCurrentWriteCentro } from '../../lib/auth'
import { withTransaction } from '../../lib/db'
import { createMatriculaReversosService } from '../../lib/matricula-reversos-service.mjs'

// Registra la constancia aportada por el centro; no ejecuta un reverso en Zoho.
export async function registrarReversoMatricula(centroId, estudianteId, data) {
  try {
    const service = createMatriculaReversosService({
      transaction: withTransaction,
      authorize: (id) => requireCurrentWriteCentro(id),
    })
    return await service.registrarReversoMatricula(centroId, estudianteId, data)
  } catch (error) {
    if (error?.code) {
      console.error('[matricula-reversos]', error.code)
      return { error: 'No se pudo guardar el comprobante. Actualiza la ficha e intenta nuevamente.' }
    }
    return { error: error?.message || 'No se pudo guardar el comprobante.' }
  }
}
