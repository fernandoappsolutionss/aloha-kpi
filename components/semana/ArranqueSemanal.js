import { PRIMER_CIERRE_REUNION, calendarioPlan } from '../../lib/reunion-semanal.mjs'

const fecha = (valor) => valor.split('-').reverse().join('/')

export default function ArranqueSemanal({ ultimaCerrada }) {
  if (!ultimaCerrada || ultimaCerrada > PRIMER_CIERRE_REUNION) return null
  const primera = calendarioPlan(PRIMER_CIERRE_REUNION)
  const preparacion = ultimaCerrada < PRIMER_CIERRE_REUNION
  return <div className="alert" role="note">
    <div>
    <strong>{preparacion ? 'Preparación para la primera reunión' : 'Primera reunión semanal'} · viernes {fecha(primera.reunion)}</strong>
    <p>Cierre que se revisará: jueves {fecha(primera.cierre)}. Plan a ejecutar: del {fecha(primera.desde)} al {fecha(primera.hasta)}.</p>
    <p>{preparacion ? 'La referencia actual usa el último cierre disponible. Al cerrar el jueves 22 se actualizará para la reunión. Las semanas de preparación no se marcan como atrasadas.' : 'Revisa los resultados, confirma la condición y prepara las cuotas y acciones del nuevo plan.'}</p>
    </div>
  </div>
}
