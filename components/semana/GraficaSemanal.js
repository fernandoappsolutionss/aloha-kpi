'use client'
import { modeloGrafica } from '../../lib/grafica-semanal.mjs'

export default function GraficaSemanal({ puntos = [], inversa = false, unidad = '', titulo = 'Estadística semanal', compacta = false }) {
  const margen = compacta ? { arriba: 4, derecha: 4, abajo: 4, izquierda: 4 } : undefined
  const modelo = modeloGrafica({ puntos, inversa, ancho: compacta ? 160 : 640, alto: compacta ? 48 : 220, margen })
  if (modelo.vacia) return <p className="h-sub" role="status">Sin datos todavía</p>
  const etiqueta = `${titulo}. ${inversa ? 'Menos es mejor. ' : ''}${modelo.puntos.map((p) => `${p.semanaFin}: ${p.valor == null ? 'sin dato' : `${p.valor} ${unidad}`}`).join('; ')}`
  return (
    <svg viewBox={`0 0 ${modelo.ancho} ${modelo.alto}`} width="100%" role="img" aria-label={etiqueta} className="semana-grafica">
      {!compacta && modelo.ticks.map((tick, i) => <g key={i}>
        <line x1="44" x2={modelo.ancho - 16} y1={tick.y} y2={tick.y} stroke="var(--border)" />
        <text x="38" y={tick.y + 4} textAnchor="end" fill="var(--text-dim)" fontSize="11">{tick.valor}</text>
      </g>)}
      {modelo.tramos.map((tramo, i) => <line key={i} {...tramo} stroke={tramo.color} strokeWidth={compacta ? 2.5 : 3} strokeLinecap="round" />)}
      {modelo.puntos.map((p, i) => <g key={`${p.semanaFin}-${i}`}>
        {p.yCuota != null && <line x1={p.x - 7} x2={p.x + 7} y1={p.yCuota} y2={p.yCuota} stroke="var(--text-dim)" strokeWidth="2" strokeDasharray="3 2" />}
        {p.y != null && <circle cx={p.x} cy={p.y} r={compacta ? 2.5 : 4} fill="#6B7280" />}
        {!compacta && p.semanaFin && <text x={p.x} y={modelo.alto - 5} textAnchor="middle" fill="var(--text-dim)" fontSize="10">{p.semanaFin.slice(8)}/{p.semanaFin.slice(5, 7)}</text>}
      </g>)}
    </svg>
  )
}
