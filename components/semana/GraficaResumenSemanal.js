'use client'
import { escalaSugerida, modeloMensual } from '../../lib/grafica-mensual-hca.mjs'
import { puntosResumen } from '../../lib/resumen-tablero-semanal.mjs'

const fmt = value => Number(value).toLocaleString('es-PA', { maximumFractionDigits: 1 })
const fecha = value => `${value.slice(8)}/${value.slice(5, 7)}`

export default function GraficaResumenSemanal({ serie, ultimaCerrada, titulo }) {
  const puntos = puntosResumen(serie, ultimaCerrada)
  if (!puntos.some(p => p.valor != null)) return <p className="h-sub">Sin datos en estas 6 semanas</p>
  // Mantener la escala de las 12 semanas disponibles evita recalibrarla solo
  // con los seis puntos visibles. Las cuotas también deben caber en el eje.
  const modelo = modeloMensual({ puntos, escala: escalaSugerida(serie), ancho: 340, alto: 172 })
  const { margen } = modelo
  return <figure className="semana-resumen-grafica">
    <svg viewBox="0 0 340 172" width="340" height="172" role="img" aria-label={`${titulo}. ${puntos.map(p => `${fecha(p.semanaFin)}: ${p.valor == null ? 'sin dato' : `${p.valor} niños`}${p.abierto ? ', abierta' : ', cerrada'}${p.cuota == null ? '' : `, cuota ${p.cuota}`}`).join('; ')}`}>
      {modelo.ticks.filter((_, i) => i % 5 === 0).map((t, i) => <g key={i}>
        <line x1={margen.izquierda} x2={modelo.ancho - margen.derecha} y1={t.y} y2={t.y} stroke="var(--border)" />
        <text x={margen.izquierda - 10} y={t.y + 4} textAnchor="end" className="semana-resumen-grafica__eje">{fmt(t.valor)}</text>
      </g>)}
      {modelo.tramos.map(({ a, b, color, provisional, sentido }) => <line key={b.periodo} data-tramo={sentido} data-provisional={provisional} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={color} strokeWidth="2.5" strokeDasharray={provisional ? '5 4' : undefined} />)}
      {modelo.puntos.map(p => <g key={p.periodo}>
        {p.yCuota != null && <line x1={p.x - 8} x2={p.x + 8} y1={p.yCuota} y2={p.yCuota} stroke="var(--warn)" strokeWidth="2" strokeDasharray="3 2"><title>Cuota: {fmt(p.cuota)}</title></line>}
        {p.y != null && <>
          <circle cx={p.x} cy={p.y} r="3.5" stroke="var(--text)" strokeWidth="1.5" fill={p.abierto ? 'var(--surface-1)' : 'var(--text)'}><title>{fecha(p.semanaFin)}: {fmt(p.valor)} niños · {p.abierto ? 'semana abierta' : 'cierre'}</title></circle>
          <text x={p.x} y={Math.max(12, p.y - 10)} textAnchor="middle" className="semana-resumen-grafica__valor">{fmt(p.valor)}</text>
        </>}
        {p.y == null && <text x={p.x} y={modelo.alto - margen.abajo - 8} textAnchor="middle" className="semana-resumen-grafica__eje">—</text>}
        <text x={p.x} y={modelo.alto - 21} textAnchor="middle" className="semana-resumen-grafica__eje">{fecha(p.semanaFin)}</text>
        {p.abierto && <text x={p.x} y={modelo.alto - 6} textAnchor="middle" className="semana-resumen-grafica__eje">Abierta</text>}
      </g>)}
    </svg>
    <figcaption>Escala {fmt(modelo.min)}–{fmt(modelo.max)} niños · referencia de 12 semanas</figcaption>
  </figure>
}
