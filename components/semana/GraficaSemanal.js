'use client'
import { useEffect, useState } from 'react'
import { modeloGrafica } from '../../lib/grafica-semanal.mjs'
import { escalaValida } from '../../lib/escala-grafica.mjs'
import { colorCondicion } from '../../lib/condiciones/formulas.mjs'
import TableScroller from '../TableScroller'

const fmt = value => Number(value).toLocaleString('es-PA', { maximumFractionDigits: 2 })
const fecha = value => value ? `${value.slice(8)}/${value.slice(5, 7)}` : ''

export default function GraficaSemanal({ puntos = [], inversa = false, unidad = '', titulo = 'Estadística semanal', compacta = false, ultimaCerrada, storageKey }) {
  const [elegida, setElegida] = useState(null)
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const [incluirCuotas, setIncluirCuotas] = useState(false)
  useEffect(() => {
    setElegida(null); setDraft(null); setError(''); setIncluirCuotas(false)
    if (!storageKey) return
    try { const saved = JSON.parse(localStorage.getItem(storageKey)); if (escalaValida(saved)) setElegida(saved) } catch { /* Preferencia local opcional. */ }
  }, [storageKey])
  const serie = puntos.map(p => ({ ...p, abierto: p.abierto ?? Boolean(ultimaCerrada && p.semanaFin > ultimaCerrada) }))
  const margen = compacta ? { arriba: 4, derecha: 4, abajo: 4, izquierda: 4 } : undefined
  const modelo = modeloGrafica({ puntos: serie, inversa, escala: elegida, incluirCuotas,
    ancho: compacta ? 160 : Math.max(820, puntos.length * 60 + 88), alto: compacta ? 48 : 360, margen })
  const inputs = draft || elegida || modelo.sugerida
  const tieneCuotas = serie.some(p => p.cuota != null)
  function aplicar(event) {
    event.preventDefault()
    if (!escalaValida(inputs)) { setError('Completa ambos números. El máximo debe ser mayor que el mínimo.'); return }
    const next = { min: Number(inputs.min), max: Number(inputs.max) }
    setElegida(next); setDraft(null); setError('')
    if (storageKey) try { localStorage.setItem(storageKey, JSON.stringify(next)) } catch { setError('Escala aplicada; el navegador no permite guardarla.') }
  }
  function restablecer() {
    setElegida(null); setDraft(null); setError('')
    if (storageKey) try { localStorage.removeItem(storageKey) } catch { /* La vista ya está restablecida. */ }
  }
  if (modelo.vacia) return <p className="h-sub" role="status">Sin datos todavía</p>
  const etiqueta = `${titulo}. ${inversa ? 'Inversa: menos es mejor. ' : ''}Escala ${fmt(modelo.min)} a ${fmt(modelo.max)} ${unidad}. ${modelo.puntos.map(p => `${p.semanaFin}: ${p.valor == null ? 'sin dato' : `${fmt(p.valor)} ${unidad}`}${p.abierto ? ', semana abierta, provisional' : ''}${p.cuota == null ? '' : `; cuota ${fmt(p.cuota)}`}`).join('; ')}`
  const svg = <svg viewBox={`0 0 ${modelo.ancho} ${modelo.alto}`} width={compacta ? '100%' : modelo.ancho} height={compacta ? undefined : modelo.alto} role="img" aria-label={etiqueta} className={`semana-grafica${compacta ? '' : ' semana-grafica--hca'}`}>
    {!compacta && modelo.ticks.map(tick => <g key={tick.valor}>
      <line x1={modelo.margen.izquierda} x2={modelo.ancho - modelo.margen.derecha} y1={tick.y} y2={tick.y} stroke="var(--border)" />
      <text x={modelo.margen.izquierda - 10} y={tick.y + 5} textAnchor="end" className="semana-grafica__eje">{fmt(tick.valor)}</text>
    </g>)}
    {!compacta && modelo.puntos.map((p, i) => <line key={i} x1={p.x} x2={p.x} y1={modelo.margen.arriba} y2={modelo.alto - modelo.margen.abajo} stroke="var(--border)" opacity=".6" />)}
    {modelo.tramos.map(({ sentido, provisional, ...tramo }, i) => <line key={i} {...tramo} data-tramo={sentido} data-provisional={provisional} stroke={tramo.color} strokeWidth={compacta ? 2.5 : 3} strokeLinecap="round" strokeDasharray={provisional ? '7 5' : undefined} />)}
    {modelo.puntos.map((p, i) => <g key={`${p.semanaFin}-${i}`}>
      {p.yCuota != null && <line x1={p.x - 10} x2={p.x + 10} y1={p.yCuota} y2={p.yCuota} stroke="var(--warn)" strokeWidth="2" strokeDasharray="4 3"><title>Cuota {fecha(p.semanaFin)}: {fmt(p.cuota)}</title></line>}
      {p.y != null && <>
        <circle cx={p.x} cy={p.y} r={compacta ? 2.5 : 4.5} stroke={p.condicion ? colorCondicion(p.condicion) : 'var(--text)'} strokeWidth="2" fill={p.abierto ? 'var(--surface-1)' : p.condicion ? colorCondicion(p.condicion) : 'var(--text)'}>
          <title>{fecha(p.semanaFin)}: {fmt(p.valor)} {unidad}{p.abierto ? ' · En curso, provisional' : ' · Cerrada'}</title>
        </circle>
        {!compacta && <text x={p.x} y={Math.max(16, p.y - 14)} textAnchor="middle" className="semana-grafica__valor">{fmt(p.valor)}</text>}
      </>}
      {!compacta && <>
        {p.y == null && <text x={p.x} y={modelo.alto - modelo.margen.abajo - 10} textAnchor="middle" className="semana-grafica__eje">—</text>}
        <text x={p.x} y={modelo.alto - 24} textAnchor="middle" className="semana-grafica__eje">{fecha(p.semanaFin)}</text>
        {p.abierto && <text x={p.x} y={modelo.alto - 6} textAnchor="middle" className="semana-grafica__estado">En curso</text>}
      </>}
    </g>)}
  </svg>
  if (compacta) return svg
  return <div className="semana-grafica-hca">
    <p className="semana-grafica__lectura">{puntos.length} semanas · {unidad}{inversa ? ' · Inversa: menos es mejor; el eje está invertido.' : ''}</p>
    <TableScroller label={`Gráfica semanal: ${titulo}`}>{svg}</TableScroller>
    <div className="hca-monthly__legend">
      <span className="hca-mejora">━ Azul: mejora</span><span className="hca-empeora">━ Rojo: empeora</span><span>━ Gris: sin cambio</span><span>┄ En curso: provisional</span>
      {incluirCuotas && <span>┄ Marca ámbar: cuota</span>}
    </div>
    <p className="h-sub">Escala {elegida ? 'fijada' : 'sugerida'}: {fmt(modelo.min)}–{fmt(modelo.max)} {unidad}.{modelo.expandida && ' Ampliada para incluir todos los valores visibles.'} {modelo.min > 0 && 'El eje no comienza en cero.'}</p>
    {tieneCuotas && <label className="semana-grafica__opcion"><input type="checkbox" checked={incluirCuotas} onChange={e => setIncluirCuotas(e.target.checked)} /> Mostrar cuotas en la gráfica (amplía la escala)</label>}
    <details className="chart-data"><summary>Ajustar escala de {titulo}</summary>
      <p className="h-sub">Define el mínimo esperado y el máximo probable en los próximos 3 meses. La sugerencia usa estas {puntos.length} semanas; no es un pronóstico. {storageKey ? 'La escala fijada se guarda en este navegador para este centro y esta estadística.' : 'La escala fijada se conserva mientras esta vista esté abierta.'} Una cuota alta puede aplanar la línea: todas las cuotas están disponibles en la tabla.</p>
      <form onSubmit={aplicar} className="hca-monthly__scale">
        <label>Mínimo esperado<input className="input" aria-label={`Mínimo esperado de ${titulo}`} type="number" step="any" value={inputs.min} onChange={e => setDraft({ ...inputs, min: e.target.value })} /></label>
        <label>Máximo probable en 3 meses<input className="input" aria-label={`Máximo probable de ${titulo}`} type="number" step="any" value={inputs.max} onChange={e => setDraft({ ...inputs, max: e.target.value })} /></label>
        <button className="btn" type="submit">Aplicar escala</button><button className="btn" type="button" onClick={restablecer}>Usar sugerencia</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </details>
    <details className="chart-data"><summary>Ver datos y cuotas de {titulo}</summary>
      <TableScroller label={`Datos semanales: ${titulo}`}><table className="table"><thead><tr><th scope="col">Cierre</th><th scope="col">Resultado ({unidad})</th><th scope="col">Estado</th><th scope="col">Cuota</th></tr></thead><tbody>{serie.map(p => <tr key={p.semanaFin}><th scope="row">{p.semanaFin}</th><td>{p.valor == null ? 'Sin dato' : fmt(p.valor)}</td><td>{p.abierto ? 'En curso · provisional' : 'Cerrada'}</td><td>{p.cuota == null ? '—' : fmt(p.cuota)}</td></tr>)}</tbody></table></TableScroller>
    </details>
  </div>
}
