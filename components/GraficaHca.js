'use client'
import { useEffect, useId, useMemo, useState } from 'react'
import TableScroller from './TableScroller'
import { escalaSugerida, escalaValida, modeloMensual } from '../lib/grafica-mensual-hca.mjs'

const fmt = value => new Intl.NumberFormat('es-PA', { maximumFractionDigits: 4 }).format(value)

export default function GraficaHca({ titulo, unidad, puntos, baseEscala = puntos, storageKey, inversa = false, contextual = false, descripcion, proyeccion = false, referencia = 'Meta', incluirCero = false }) {
  const id = useId()
  const sugerida = useMemo(() => escalaSugerida(incluirCero ? [...baseEscala, { valor: 0 }] : baseEscala), [baseEscala, incluirCero])
  const tieneReferencia = puntos.some(p => p.cuota != null)
  const estadoProvisional = proyeccion ? 'Proyectado' : 'Abierto · provisional'
  const etiqueta = p => p.etiqueta || `${p.mes} ${p.year}`
  const [elegida, setElegida] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    setElegida(null); setDraft(null); setError('')
    try { const value = JSON.parse(localStorage.getItem(storageKey)); if (escalaValida(value)) setElegida(value) } catch { /* Preferencia local opcional. */ }
  }, [storageKey])
  const escala = elegida || sugerida
  const inputs = draft || escala
  const modelo = modeloMensual({ puntos, escala, inversa, incluirCero, ancho: Math.max(660, puntos.length * 48 + 88) })
  const last = puntos.at(-1)
  function aplicar(event) {
    event.preventDefault()
    if (!escalaValida(inputs)) { setError('El máximo debe ser mayor que el mínimo. Completa ambos números.'); return }
    const next = { min: Number(inputs.min), max: Number(inputs.max) }
    setElegida(next); setDraft(null); setError('')
    try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { setError('Escala aplicada en esta vista; el navegador no permite guardarla.') }
  }
  return <article className="card hca-monthly" aria-labelledby={`${id}-title`}>
    <div className="hca-monthly__head">
      <div><h3 id={`${id}-title`} className="panel__title">{titulo}</h3><p className="h-sub">{unidad} · {inversa ? 'Inversa: menos es mejor' : contextual ? 'Lectura contextual: subida y bajada' : 'Más es mejor'}</p></div>
      {last?.abierto && <span className="pill pill--warn">{proyeccion ? 'Proyección · 13 semanas' : 'Mes abierto · provisional'}</span>}
    </div>
    {descripcion && <p className="h-sub">{descripcion}</p>}
    <div className="hca-monthly__scroll"><TableScroller label={`Gráfica ${proyeccion ? 'semanal proyectada' : 'mensual'}: ${titulo}`}>
      <svg className="hca-monthly__svg" viewBox={`0 0 ${modelo.ancho} ${modelo.alto}`} style={{ minWidth: modelo.ancho }} role="img" aria-label={`${titulo}. ${inversa ? 'Inversa. ' : ''}${puntos.map(p => `${p.periodo}: ${p.valor == null ? 'sin dato' : `${fmt(p.valor)} ${unidad}`}${p.abierto ? ` (${estadoProvisional})` : ''}`).join('; ')}`}>
        {modelo.ticks.map((t, i) => <g key={i}>
          <line x1={modelo.margen.izquierda} x2={modelo.ancho - modelo.margen.derecha} y1={t.y} y2={t.y} stroke="var(--border)" opacity={t.major ? 1 : .45}/>
          {t.major && <text x={modelo.margen.izquierda - 8} y={t.y + 4} textAnchor="end">{fmt(t.valor)}</text>}
        </g>)}
        {modelo.puntos.map(p => <g key={p.periodo}>
          <line x1={p.x} x2={p.x} y1={modelo.margen.arriba} y2={modelo.alto - modelo.margen.abajo} stroke="var(--border)"/>
          <text x={p.x} y={modelo.alto - 21} textAnchor="middle">{p.etiqueta || p.mes}</text><text x={p.x} y={modelo.alto - 6} textAnchor="middle">{p.subetiqueta || p.year}</text>
          {p.yCuota != null && <line data-meta="true" x1={Math.max(modelo.margen.izquierda, p.x - 12)} x2={Math.min(modelo.ancho - modelo.margen.derecha, p.x + 12)} y1={p.yCuota} y2={p.yCuota} stroke="var(--warn)" strokeWidth="2" strokeDasharray="4 3"><title>{referencia} {p.periodo}: {fmt(p.cuota)}</title></line>}
        </g>)}
        {incluirCero && <line data-cero="true" x1={modelo.margen.izquierda} x2={modelo.ancho - modelo.margen.derecha} y1={modelo.yCero} y2={modelo.yCero} stroke="var(--text-muted)" strokeWidth="1.5"><title>Cero</title></line>}
        {modelo.tramos.map(({ a, b, color, provisional, sentido }) => <line key={b.periodo} data-tramo={sentido} data-provisional={provisional} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="3" strokeDasharray={provisional ? '6 4' : undefined}/>) }
        {modelo.puntos.filter(p => p.y != null).map(p => <circle key={p.periodo} cx={p.x} cy={p.y} r="4" stroke="var(--text-muted)" strokeWidth="2" fill={p.abierto ? 'var(--surface-1)' : 'var(--text-muted)'} tabIndex={0} aria-label={`${p.periodo}: ${fmt(p.valor)} ${unidad}${p.abierto ? `, ${estadoProvisional}` : ''}`}><title>{p.periodo}: {fmt(p.valor)} {unidad}{p.abierto ? ` · ${estadoProvisional}` : ''}</title></circle>)}
      </svg>
    </TableScroller></div>
    <p className="hca-monthly__legend">{proyeccion ? <span>┄ Gris: proyección, no resultado realizado</span> : <><span className="hca-mejora">━ Azul: {contextual ? 'sube' : 'mejora'}</span><span className="hca-empeora">━ Rojo: {contextual ? 'baja' : 'empeora'}</span><span>━ Gris: sin cambio</span><span>┄ Abierto: provisional</span></>}{tieneReferencia && <span>┄ Marca ámbar: {referencia.toLowerCase()}</span>}{incluirCero && <span>━ Referencia: cero</span>}</p>
    <p className="h-sub">Escala {elegida ? 'elegida' : 'sugerida'}: {fmt(modelo.min)} a {fmt(modelo.max)} {unidad}.{modelo.expandida && ' Ampliada para incluir todos los datos y referencias.'}</p>
    <details className="chart-data"><summary>Ajustar escala de {titulo}</summary>
      <p className="h-sub">Define el mínimo esperado y el máximo probable en los próximos 3 meses. {proyeccion ? 'La sugerencia usa las 13 semanas proyectadas y sus referencias. Se guarda solo en este navegador para esta empresa.' : 'La sugerencia usa los últimos 12 meses y las metas; no es un pronóstico. Se guarda solo en este navegador para este centro.'}</p>
      <form onSubmit={aplicar} className="hca-monthly__scale">
        <label>Mínimo esperado<input className="input" aria-label={`Mínimo esperado de ${titulo}`} type="number" step="any" value={inputs.min} onChange={e => setDraft({ ...inputs, min: e.target.value })}/></label>
        <label>Máximo probable en 3 meses<input className="input" aria-label={`Máximo probable de ${titulo}`} type="number" step="any" value={inputs.max} onChange={e => setDraft({ ...inputs, max: e.target.value })}/></label>
        <button className="btn" type="submit">Aplicar escala</button><button className="btn" type="button" onClick={() => { setElegida(null); setDraft(null); setError(''); try { localStorage.removeItem(storageKey) } catch {} }}>Usar sugerencia</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
    <details className="chart-data"><summary>Ver datos de {titulo}</summary>
      <TableScroller label={`Datos: ${titulo}`} stickyFirstColumn><table className="table"><thead><tr><th scope="col">{proyeccion ? 'Semana' : 'Mes'}</th><th scope="col">{titulo}</th><th scope="col">Estado</th>{tieneReferencia && <th scope="col">{referencia}</th>}</tr></thead><tbody>{puntos.map(p => <tr key={p.periodo}><th scope="row">{etiqueta(p)}{proyeccion ? ` · ${p.periodo}` : ''}</th><td>{p.valor == null ? 'Sin dato' : fmt(p.valor)}</td><td>{p.valor == null ? 'Sin dato' : p.abierto ? estadoProvisional : 'Cerrado'}</td>{tieneReferencia && <td>{p.cuota == null ? '—' : fmt(p.cuota)}</td>}</tr>)}</tbody></table></TableScroller>
    </details>
  </article>
}
