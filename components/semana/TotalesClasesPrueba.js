'use client'
import { useId, useState } from 'react'
import { PERIODOS_CLASES_PRUEBA, totalClasesPrueba } from '../../lib/resumen-clases-prueba-total.mjs'

const numero = n => n == null ? 'Sin dato' : n.toLocaleString('es-PA', { maximumFractionDigits: 1 })
const fecha = f => f?.split('-').reverse().join('/') || '—'

export default function TotalesClasesPrueba({ centros }) {
  const [periodo, setPeriodo] = useState('mes')
  const id = useId()
  const total = totalClasesPrueba(centros, periodo)
  const tarjetas = [
    { titulo: 'Invitados', valor: numero(total.invitados), nota: 'En clases ya iniciadas' },
    { titulo: 'Asistentes', valor: numero(total.asistentes), nota: 'De esas mismas clases' },
    { titulo: 'Asistencia', valor: total.porcentaje == null ? '—' : `${numero(total.porcentaje)}%`,
      nota: total.invitados == null ? 'Sin datos para calcular' : total.invitados === 0 ? 'Sin invitados para calcular' : `${numero(total.asistentes)} de ${numero(total.invitados)} invitados` },
    { titulo: 'Matriculados', valor: numero(total.matriculados), nota: 'Asistieron y tienen matrícula en CRM' },
    { titulo: 'Conversión a matrícula', valor: total.conversion == null ? '—' : `${numero(total.conversion)}%`,
      nota: total.matriculados == null ? 'Sin datos para calcular' : total.asistentesConversion === 0 ? 'Sin asistentes para calcular' : `${numero(total.matriculados)} de ${numero(total.asistentesConversion)} asistentes` },
    { titulo: 'Próximos agendados', valor: numero(total.agendados), nota: 'Todas las fechas futuras' },
  ]
  return <div className="semana-cp-totales" role="region" aria-label="Resumen general de clases de prueba">
    <div className="semana-cp-totales__cabecera">
      <div>
        <h3 className="panel__title">Clases de prueba · resumen general</h3>
        <p className="h-sub">{PERIODOS_CLASES_PRUEBA[periodo]}{total.rangoComun && ` · ${fecha(total.rangoComun.desde)} al ${fecha(total.rangoComun.hasta)}`}</p>
      </div>
      <label className="semana-cp-totales__selector" htmlFor={id}>
        <span>Período de resultados</span>
        <select id={id} className="select" value={periodo} onChange={e => setPeriodo(e.target.value)}>
          {Object.entries(PERIODOS_CLASES_PRUEBA).map(([valor, titulo]) => <option key={valor} value={valor}>{titulo}</option>)}
        </select>
      </label>
    </div>
    <p className="h-sub">{total.disponibles < total.total ? 'Suma disponible · ' : ''}{total.disponibles}/{total.total} centros con datos{total.faltantes.length > 0 && ` · sin datos: ${total.faltantes.join(', ')}`}</p>
    {total.conversionDisponibles < total.total && <p className="h-sub">Matrículas y conversión: {total.conversionDisponibles}/{total.total} centros con datos · sin datos: {total.conversionFaltantes.join(', ')}. La tasa usa solo los asistentes de centros con matrícula verificada.</p>}
    <p className="h-sub">Matrícula: negocio ganado en el CRM de una persona que asistió. Conversión: matriculados ÷ asistentes de las mismas clases.</p>
    {!total.rangoComun && total.disponibles > 0 && <details className="semana-tablero__cp-detalle">
      <summary>Ver períodos locales por centro</summary>
      <ul>{total.rangos.map((r, i) => <li key={i}>{r.centro}: {fecha(r.desde)} al {fecha(r.hasta)}</li>)}</ul>
    </details>}
    <div className="semana-cp-totales__tarjetas" aria-live="polite" aria-atomic="true">
      {tarjetas.map(t => <div className="semana-tablero__total" key={t.titulo}>
        <h4 className="label">{t.titulo}</h4>
        <div className="semana-tablero__total-valor">{t.valor}</div>
        <p className="h-sub">{t.nota}</p>
      </div>)}
    </div>
  </div>
}
