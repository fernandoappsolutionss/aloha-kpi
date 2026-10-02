'use client'
import { useState } from 'react'
import { guardarCompromiso } from '../../app/actions/semana'
import { cierresDelMes } from '../../lib/cuotas-semana.mjs'

export default function CompromisoMensual({ centroId, datos, siguienteNivel, onRefresh }) {
  const periodo = datos.semanaAbierta.slice(0, 7)
  const [error, setError] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [ocupado, setOcupado] = useState(false)
  async function guardar(event) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const metas = Object.fromEntries(datos.catalogo.map(meta => [meta.codigo, form.get(meta.codigo)]))
    let guardado = false
    setOcupado(true); setError(''); setMensaje('')
    try {
      await guardarCompromiso(centroId, { periodo, metas, diagnostico: form.get('diagnostico') }); guardado = true
      await onRefresh(); setMensaje('Meta mensual guardada. Revisa las propuestas semanales y solicita aprobación.')
    } catch (cause) { setError(guardado ? 'La meta se guardó; recarga para ver las propuestas sin repetir el guardado.' : cause.message) }
    finally { setOcupado(false) }
  }
  return <section className="panel semana-cuotas" id="compromiso-mensual" aria-labelledby="compromiso-title">
    <h2 id="compromiso-title">Compromiso mensual · {periodo}</h2>
    <p className="h-sub">Cierres: {cierresDelMes(periodo).join(' · ')}. Niños activos y vencidas: saldo al último cierre. Inscritos, retiros y asistencias: total de esas semanas, que pueden cruzar el mes calendario.</p>
    {siguienteNivel && <p>Referencia de la ruta: Nivel {siguienteNivel.level}, {siguienteNivel.threshold} niños. Decide cuánto de esa brecha es alcanzable este mes.</p>}
    {!datos.compromiso && <p className="alert">Todavía no hay compromiso mensual guardado. Las cuotas muestran referencias generales.</p>}
    <form onSubmit={guardar}>
      <div className="semana-grid">{datos.catalogo.map(meta => <label className="field" key={meta.codigo}><span>{meta.nombre} · {meta.inversa ? 'máximo' : 'mínimo'}</span><input className="input" name={meta.codigo} type="number" min="0" max="1000000" step="1" required disabled={!datos.puedeAsignar || ocupado} defaultValue={datos.compromiso?.metas?.[meta.codigo] ?? ''} /></label>)}</div>
      <label className="field"><span>Diagnóstico y estrategia del mes</span><textarea className="input" name="diagnostico" rows={3} maxLength={2000} required disabled={!datos.puedeAsignar || ocupado} defaultValue={datos.compromiso?.diagnostico || ''} placeholder="Datos observados, causa por comprobar y cómo tus acciones acercarán al nivel" /></label>
      {datos.puedeAsignar && <button className="btn btn--primary" disabled={ocupado}>Guardar meta mensual</button>}
    </form>
    <p className="h-sub">Guardar recalcula las propuestas; conserva las cuotas guardadas y sus aprobaciones. La proyección sigue siendo una estimación, no esta meta acordada.</p>
    {error && <p className="alert alert--error" role="alert">{error}</p>}{mensaje && <p role="status">{mensaje}</p>}
  </section>
}
