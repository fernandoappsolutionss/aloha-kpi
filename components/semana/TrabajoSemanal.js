'use client'
import { useEffect } from 'react'
import { revelarDestino } from '../../lib/revelar-destino.mjs'
import CompromisoMensual from './CompromisoMensual'
import TarjetaEstadistica from './TarjetaEstadistica'
import CuotasSemana from './CuotasSemana'
import PlanSemana from './PlanSemana'
import PrioridadesPlan from './PrioridadesPlan'
import ResumenAutomatico from './ResumenAutomatico'

export default function TrabajoSemanal({ centroId, datos, siguienteNivel, growth, onRefresh }) {
  useEffect(() => {
    const abrirDestino = () => {
      const id = window.location.hash.slice(1)
      if (!['compromiso-mensual', 'semana-cuotas-title', 'plan-batalla'].includes(id)) return
      const destino = document.getElementById(id)
      revelarDestino(destino)
      destino?.scrollIntoView({ block: 'start' })
    }
    abrirDestino()
    window.addEventListener('hashchange', abrirDestino)
    return () => window.removeEventListener('hashchange', abrirDestino)
  }, [centroId])
  return <div className="semana-page" id="trabajo-semanal">
    <ResumenAutomatico datos={datos} />
    <div className="semana-grid" data-tour="semana.graficas">{datos.catalogo.map(meta => <TarjetaEstadistica key={meta.codigo} meta={meta} principal={meta.principal} serie={datos.series[meta.codigo]} resumen={datos.resumen[meta.codigo]} cuota={datos.cuotas[meta.codigo]} />)}</div>
    <PlanSemana centroId={centroId} semanaFin={datos.ultimaCerrada} datos={datos.plan} puedeEscribir={datos.puedeEscribir} puedeAsignar={datos.puedeAsignar} puedeVerificar={datos.puedeAprobar} onRefresh={onRefresh}
      prioridades={growth ? <PrioridadesPlan centroId={centroId} recommendations={growth.recommendations} historial={growth.recommendationHistory} puedeEscribir={datos.puedeEscribir} onRefresh={onRefresh} /> : null}
      ajustes={<details className="semana-plan__seccion semana-ajustes"><summary><strong>Metas y cuotas · edición opcional</strong></summary>
        <p className="h-sub">Los resultados se actualizan desde el sistema. Aquí solo acuerdas objetivos; no necesitas volver a registrar inscritos, retiros ni asistencias.</p>
        <CompromisoMensual key={`${centroId}:${datos.semanaAbierta.slice(0, 7)}`} centroId={centroId} datos={datos} siguienteNivel={siguienteNivel} onRefresh={onRefresh} />
        <CuotasSemana key={`${centroId}:${datos.semanaAbierta}`} centroId={centroId} semanaFin={datos.semanaAbierta} catalogo={datos.catalogo} resumen={datos.resumen} cuotas={datos.cuotas} puedeEscribir={datos.puedeEscribir} puedeAprobar={datos.puedeAprobar} onRefresh={onRefresh} />
      </details>} />
  </div>
}
