'use client'
import { useEffect } from 'react'
import { revelarDestino } from '../../lib/revelar-destino.mjs'
import CompromisoMensual from './CompromisoMensual'
import TarjetaEstadistica from './TarjetaEstadistica'
import CuotasSemana from './CuotasSemana'
import PlanSemana from './PlanSemana'
import PrioridadesPlan from './PrioridadesPlan'
import ResumenAutomatico from './ResumenAutomatico'
import AvanceDiario from './AvanceDiario'
import InformeSemana from './InformeSemana'
import JuegosSemana from './JuegosSemana'

export default function TrabajoSemanal({ centroId, datos, siguienteNivel, growth, onRefresh, seccion = 'integrada' }) {
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
  const planProps = { centroId, semanaFin: datos.ultimaCerrada, datos: datos.plan, puedeEscribir: datos.puedeEscribir, puedeAsignar: datos.puedeAsignar, puedeVerificar: datos.puedeAprobar, onRefresh }
  if (seccion === 'cumplimiento') return <InformeSemana centroId={centroId} datos={datos} />
  if (seccion === 'juegos') return <JuegosSemana centroId={centroId} datos={datos} />
  if (seccion === 'condicion') return <><div className="semana-intro"><div><p className="label">02 · Entiende y prepara</p><h2>De los datos a un plan de batalla</h2><p>Revisa la tendencia, fundamenta tu condición y convierte cada paso de su fórmula en acciones concretas.</p></div></div><details className="panel semana-historico"><summary>Consultar gráficas antes de decidir</summary><div data-tour="semana.graficas" className="semana-grid">{datos.catalogo.map(meta => <TarjetaEstadistica key={meta.codigo} meta={meta} serie={datos.series[meta.codigo]} resumen={datos.resumen[meta.codigo]} cuota={datos.cuotas[meta.codigo]} />)}</div></details><PlanSemana {...planProps} vista="condicion" /></>
  if (seccion === 'acciones') return <><div className="semana-intro"><div><p className="label">03 · Ejecuta y demuestra</p><h2>Mis acciones de esta semana</h2><p>Empieza por el primer paso pendiente de la fórmula. Registra lo que lograste y su evidencia; coordinación verifica el resultado.</p></div></div><PlanSemana {...planProps} vista="acciones" /></>
  if (seccion === 'avance') return <>
    <AvanceDiario centroId={centroId} datos={datos} />
    <details className="panel semana-historico"><summary>Gráficas · comparar los cierres anteriores</summary><div className="semana-grid" data-tour="semana.graficas">{datos.catalogo.map(meta => <TarjetaEstadistica key={meta.codigo} meta={meta} serie={datos.series[meta.codigo]} resumen={datos.resumen[meta.codigo]} cuota={datos.cuotas[meta.codigo]} />)}</div></details>
    <section className="panel semana-historico"><h2 className="panel__title">Plan de batalla · metas y cuotas</h2><details className="semana-ajustes"><summary>Metas y cuotas · editar y enviar a coordinación</summary><p>Guardar cuotas deja una propuesta. Coordinación revisa y aprueba. Los resultados se cargan automáticamente.</p><CuotasSemana centroId={centroId} semanaFin={datos.semanaAbierta} catalogo={datos.catalogo} resumen={datos.resumen} cuotas={datos.cuotas} puedeEscribir={datos.puedeEscribir} puedeAprobar={datos.puedeAprobar} onRefresh={onRefresh} /><CompromisoMensual centroId={centroId} datos={datos} siguienteNivel={siguienteNivel} onRefresh={onRefresh} /></details></section>
    <details className="panel semana-historico"><summary>Ver el resultado acumulado del mes</summary><ResumenAutomatico datos={datos} /></details>
  </>
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
