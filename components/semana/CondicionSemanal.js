import { colorCondicion } from '../../lib/condiciones/formulas.mjs'
import { estadoCondicion } from '../../lib/reunion-semanal.mjs'

export default function CondicionSemanal({ condicion, lectura }) {
  const vista = estadoCondicion({ condicion, lectura })
  return <div>
    <span className="semana-condicion" style={vista.condicion ? { '--condicion-color': colorCondicion(vista.condicion) } : undefined}>{vista.nombre}</span>
    <p className="h-sub">{vista.estado}</p>
  </div>
}
