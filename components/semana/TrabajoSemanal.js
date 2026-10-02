import CompromisoMensual from './CompromisoMensual'
import TarjetaEstadistica from './TarjetaEstadistica'
import CuotasSemana from './CuotasSemana'
import PlanSemana from './PlanSemana'

export default function TrabajoSemanal({ centroId, datos, siguienteNivel, onRefresh }) {
  return <div className="semana-page" id="trabajo-semanal">
    <CompromisoMensual key={`${centroId}:${datos.semanaAbierta.slice(0, 7)}`} centroId={centroId} datos={datos} siguienteNivel={siguienteNivel} onRefresh={onRefresh} />
    <div className="semana-grid" data-tour="semana.graficas">{datos.catalogo.map(meta => <TarjetaEstadistica key={meta.codigo} meta={meta} principal={meta.principal} serie={datos.series[meta.codigo]} resumen={datos.resumen[meta.codigo]} cuota={datos.cuotas[meta.codigo]} />)}</div>
    <CuotasSemana centroId={centroId} semanaFin={datos.semanaAbierta} catalogo={datos.catalogo} resumen={datos.resumen} cuotas={datos.cuotas} puedeEscribir={datos.puedeEscribir} puedeAprobar={datos.puedeAprobar} onRefresh={onRefresh} />
    <PlanSemana centroId={centroId} semanaFin={datos.ultimaCerrada} datos={datos.plan} puedeEscribir={datos.puedeEscribir} puedeAsignar={datos.puedeAsignar} puedeVerificar={datos.puedeAprobar} onRefresh={onRefresh} />
  </div>
}
