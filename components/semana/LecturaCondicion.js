import { nombreCondicion } from '../../lib/condiciones/formulas.mjs'
import { CRITERIO_LECTURA } from '../../lib/condiciones/lectura.mjs'

export default function LecturaCondicion({ lectura }) {
  const etiqueta = lectura.condicion ? nombreCondicion(lectura.condicion)
    : lectura.estado === 'recuperacion' ? 'Recuperación · requiere contexto'
      : lectura.estado === 'historial_insuficiente' ? 'Historial insuficiente' : 'Sin dato'
  return <div className="h-sub"><p>Lectura orientativa: <strong>{etiqueta}</strong>. {lectura.motivo}</p>
    <details><summary>Criterio de esta referencia</summary><p>{CRITERIO_LECTURA}</p></details>
  </div>
}
