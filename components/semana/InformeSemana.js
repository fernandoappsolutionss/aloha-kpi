'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { getInformeSemana } from '../../app/actions/semana'
import { rangoSemana } from '../../lib/semana-cierre.mjs'
import { nombreCondicion } from '../../lib/condiciones/formulas.mjs'
import { cuotaCumplida } from '../../lib/cuotas-semana.mjs'
import { mostrarNumero as numero } from '../../lib/avance-semana.mjs'
import TableScroller from '../TableScroller'

export default function InformeSemana({ centroId, datos }) {
  const [semana, setSemana] = useState(datos.semanaAbierta)
  const [historico, setHistorico] = useState(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const turno = useRef(0)
  useEffect(() => {
    const solicitud = ++turno.current
    setHistorico(null); setError(''); setCargando(semana !== datos.semanaAbierta)
    if (semana === datos.semanaAbierta) return
    getInformeSemana(centroId, semana).then(r => { if (turno.current === solicitud) setHistorico(r) })
      .catch(() => { if (turno.current === solicitud) setError('No se pudo cargar el informe. Selecciona de nuevo la semana para reintentar.') })
      .finally(() => { if (turno.current === solicitud) setCargando(false) })
    return () => { turno.current++ }
  }, [centroId, semana, datos.semanaAbierta])
  const actual = { centro: datos.centro, semanaFin: datos.semanaAbierta, rango: rangoSemana(datos.semanaAbierta), referencia: datos.ultimaCerrada,
    cerrado: false, consultado: datos.ultimoCalculo, ...datos.plan,
    estadisticas: datos.catalogo.map(meta => { const c = datos.cuotas[meta.codigo] || {}; const valor = datos.resumen[meta.codigo]?.abierta; return { ...meta, valor, cuota: c.cuota, estadoCuota: c.estado, cumple: c.estado === 'aprobada' ? cuotaCumplida({ valor, cuota: c.cuota, inversa: meta.inversa }) : null } }) }
  const informe = semana === datos.semanaAbierta ? actual : historico?.semanaFin === semana ? historico : null
  return <section aria-labelledby="cumplimiento-semanal-title">
    <div className="semana-intro semana-no-imprimir"><div><p className="label">04 · Revisa y conserva</p><h2 id="cumplimiento-semanal-title">Mi cumplimiento semanal</h2><p>Comprueba los resultados y las evidencias. Imprime o guarda un PDF para tu reunión.</p></div></div>
    <div className="semana-informe__controles semana-no-imprimir"><label className="field"><span>Semana del informe</span><select className="input" value={semana} onChange={e => setSemana(e.target.value)}>{[...datos.semanas].reverse().map(fin => <option key={fin} value={fin}>Cierre {fin}{fin === datos.semanaAbierta ? ' · En curso' : ''}</option>)}</select></label><button type="button" className="btn btn--primary" disabled={cargando || !informe} onClick={() => window.print()}>Imprimir / guardar PDF</button><Link className="btn" href={`/centro/${centroId}/cumplimiento`}>Cumplimiento mensual →</Link></div>
    {cargando && <p role="status">Cargando informe…</p>}{error && <p role="alert">{error}</p>}
    {informe && !cargando && <article className="panel semana-informe" aria-label="Informe imprimible de cumplimiento">
      <header><p className="label">ALOHA · {informe.centro.nombre}</p><h2>Informe de cumplimiento semanal</h2><p>{informe.rango.desde} al {informe.rango.hasta} · <strong>{informe.cerrado ? 'Semana cerrada · registros guardados' : 'Avance provisional · semana en curso'}</strong></p><p className="h-sub">Condición y fórmula basadas en el cierre {informe.referencia}. {informe.consultado && `Consulta/cálculo: ${new Date(informe.consultado).toLocaleString('es-PA', { timeZone: datos.centro.zonaHoraria })}.`}</p></header>
      <h3>1. Resultados frente a cuotas</h3><TableScroller label="Resultados del informe semanal"><table className="table"><thead><tr><th>Estadística</th><th>Resultado</th><th>Cuota guardada</th><th>Evaluación</th></tr></thead><tbody>{informe.estadisticas.map(m => <tr key={m.codigo}><th scope="row">{m.nombre}{m.inversa && ' · máximo'}</th><td>{numero(m.valor)}</td><td>{numero(m.cuota)} · {m.estadoCuota === 'aprobada' ? 'Aprobada' : 'Sin aprobar'}</td><td>{m.cumple == null ? 'Sin evaluar' : m.cumple ? 'Cumple' : 'No cumple'}{!informe.cerrado && m.cumple != null && ' al corte'}</td></tr>)}</tbody></table></TableScroller>
      <p className="h-sub">Solo las cuotas aprobadas se evalúan. Un dato faltante no equivale a cero ni a incumplimiento. Los cierres automáticos conservan las estadísticas; imprimir no cierra la semana ni modifica datos.</p>
      <h3>2. Condición y razonamiento</h3><p><strong>{informe.plan.condicion ? nombreCondicion(informe.plan.condicion) : 'Sin condición asignada'}</strong>{informe.plan.condicion === 'peligro' && ` · ${informe.plan.alcance_peligro === 'superior' ? 'para el superior' : 'personal'}`}{informe.plan.condicion === 'afluencia' && ` · ${informe.plan.variante_afluencia === 'financiera' ? 'financiera' : 'de acción'}`}</p><p>{informe.plan.fundamento || 'No se registró fundamento.'}</p>
      <h3>3. Fórmula, acciones y evidencia</h3><p>{informe.ejecucion?.realizadas || 0} de {informe.ejecucion?.total || 0} acciones realizadas · {informe.ejecucion?.verificadas || 0} verificadas.</p>
      {(informe.pasos || []).length > 0 && <ol>{informe.pasos.map((paso, i) => <li key={i}>{paso}</li>)}</ol>}
      {!informe.objetivos.length && <p>No hay acciones registradas para esta semana.</p>}
      {informe.objetivos.map((o, i) => <section className="semana-informe__accion" key={o.id || i}><h4>{o.seccion === 'formula' ? `Fórmula · paso ${Number(o.paso) + 1}` : o.seccion === 'urgente' ? 'Urgente' : o.seccion === 'orden' ? 'Orden del coordinador' : 'Pendiente'} · {o.texto}</h4><p>{o.responsable || 'Sin responsable'} · {o.fecha ? (o.fecha instanceof Date ? o.fecha.toISOString() : String(o.fecha)).slice(0, 10) : 'Sin fecha'} · {o.verificado_at ? 'Verificada' : o.hecho ? 'Realizada, por verificar' : 'Pendiente'}</p><p><strong>Evidencia esperada:</strong> {o.evidencia_esperada || 'Sin completar'}</p><p><strong>Resultado:</strong> {o.evidencia_resultado || 'Sin evidencia registrada'}</p></section>)}
      <h3>4. Preparar la siguiente semana</h3><ol><li>Revisa las acciones pendientes y termina la fórmula anterior.</li><li>Analiza los nuevos cierres y fundamenta la condición.</li><li>Prepara objetivos con responsable, fecha y evidencia; acuerda las cinco cuotas con coordinación.</li></ol><p className="h-sub">Los pendientes se trasladan al abrir el siguiente plan, conservando su origen. El informe muestra las acciones y evidencias guardadas al consultar; no sustituye la revisión del coordinador.</p>
      <div className="semana-informe__firmas"><p>Administradora: ____________________</p><p>Coordinación: ____________________</p><p>Fecha de revisión: ____________________</p></div>
    </article>}
  </section>
}
