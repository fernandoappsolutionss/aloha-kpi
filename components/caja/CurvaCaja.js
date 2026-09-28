'use client'
import { useState } from 'react'
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ReferenceLine, Legend } from 'recharts'
import TableScroller from '../TableScroller'
import { usd, fechaCorta, COLOR_SEMAFORO, TEXTO_SEMAFORO } from './formato'
import { guardarAjusteSemana } from '../../app/actions/caja'

// La semana en curso solo proyecta de mañana al domingo (lo de hoy ya está en el
// saldo del banco): si alguien escribe el ingreso de la semana entera, lo cuenta doble.
const etiquetaAjuste = (i) => (i === 0 ? 'Ingreso esperado de mañana al domingo' : 'Ingreso esperado de la semana')

export function CurvaCaja({ empresa, curva, clases, onCambio }) {
  const [editando, setEditando] = useState(null)
  const [valor, setValor] = useState('')
  const [error, setError] = useState('')
  const [guardando, setGuardando] = useState(false)
  const datos = curva.semanas.map((s, i) => ({ nombre: `S${i + 1}`, ingresos: s.ingresos, egresos: -(s.egresoTotal + s.dueno), disponible: s.disponible }))
  const primeraAlerta = curva.semanas.findIndex((s) => s.semaforo !== 'verde')
  const editable = empresa !== 'consolidado'

  async function guardar(semana, ingreso) {
    setError('')
    setGuardando(true)
    try {
      const r = await guardarAjusteSemana({ empresa, semana, ingreso })
      if (r?.error) { setError(r.error); return }
      setEditando(null)
      onCambio()
    } catch {
      setError('No se pudo guardar el ajuste. Intenta de nuevo.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <section className="card" style={{ padding: 20, marginBottom: 16 }} aria-label="Curva de 13 semanas">
      <p style={{ marginTop: 0 }}>
        {primeraAlerta === -1
          ? '🟢 Las 13 semanas cierran en verde.'
          : <>⚠️ Semana {primeraAlerta + 1} ({fechaCorta(curva.semanas[primeraAlerta].lunes)}) en {TEXTO_SEMAFORO[curva.semanas[primeraAlerta].semaforo]}: disponible {usd(curva.semanas[primeraAlerta].disponible)}.</>}
        {' '}Piso de seguridad (2 semanas de gasto): {usd(curva.piso)} · Línea disponible: {usd(curva.lineaDisponible)}.
      </p>
      <div style={{ width: '100%', height: 280 }} aria-hidden="true">
        <ResponsiveContainer>
          <ComposedChart data={datos} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
            <YAxis width={44} tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v / 1000)}K`} />
            <Tooltip formatter={(v) => usd(v)} />
            <Legend />
            <ReferenceLine y={0} stroke="var(--bad, #C62828)" />
            <ReferenceLine y={curva.piso} stroke="var(--warn, #B45309)" strokeDasharray="4 4" />
            <Bar dataKey="ingresos" name="Ingresos" fill="var(--ok, #2F7A24)" />
            <Bar dataKey="egresos" name="Egresos + dueño" fill="var(--text-faint, #94a3b8)" />
            <Line dataKey="disponible" name="Disponible" stroke="var(--accent, #0284c7)" strokeWidth={2} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {error && <p role="alert" className="alert alert--error">{error}</p>}
      <TableScroller label="Curva de 13 semanas por semana" stickyFirstColumn>
        <table className="table">
          <thead>
            <tr>
              <th>Semana</th><th>Saldo inicial</th><th>Ingresos</th><th>Egresos</th><th>Dueño</th>
              <th>Reserva impuesto</th><th>Disponible</th><th>Línea</th>
            </tr>
          </thead>
          <tbody>
            {curva.semanas.map((s, i) => (
              <tr key={s.lunes}>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <span aria-hidden="true" style={{ color: COLOR_SEMAFORO[s.semaforo] }}>●</span> S{i + 1} · {fechaCorta(s.lunes)}
                  <span className="sr-only"> ({TEXTO_SEMAFORO[s.semaforo]})</span>
                </td>
                <td>{usd(s.saldoInicial)}</td>
                <td>
                  {editable && editando === s.lunes ? (
                    <form onSubmit={(e) => { e.preventDefault(); guardar(s.lunes, valor) }} style={{ display: 'grid', gap: 6, minWidth: 180 }}>
                      <label style={{ display: 'grid', gap: 4 }}>
                        <span>{etiquetaAjuste(i)}</span>
                        <input className="input" type="number" inputMode="decimal" min="0" step="1" value={valor}
                          onChange={(e) => setValor(e.target.value)} style={{ width: 140, fontSize: 16 }} autoFocus />
                      </label>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn--primary" type="submit" disabled={guardando}>Guardar</button>
                        {s.ajustado && <button className="btn" type="button" disabled={guardando} onClick={() => guardar(s.lunes, null)}>Volver a la proyección</button>}
                        <button className="btn" type="button" disabled={guardando} onClick={() => setEditando(null)}>Cancelar</button>
                      </div>
                    </form>
                  ) : editable ? (
                    <button type="button" className="btn" title={`${etiquetaAjuste(i)}: toca para ajustarlo`}
                      aria-label={`${etiquetaAjuste(i)} S${i + 1}: ${usd(s.ingresos)}${s.ajustado ? ', ajustado a mano' : ''}. Ajustar`}
                      onClick={() => { setError(''); setEditando(s.lunes); setValor(String(Math.round(s.ingresos))) }}>
                      {usd(s.ingresos)}{s.ajustado ? ' ✎' : ''}
                    </button>
                  ) : (
                    <>{usd(s.ingresos)}{s.ajustado ? ' ✎' : ''}</>
                  )}
                </td>
                <td>
                  {usd(s.egresoTotal)}
                  {Object.keys(s.egresos).length > 0 && (
                    <ul style={{ margin: '4px 0 0', padding: 0, listStyle: 'none', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {Object.entries(s.egresos).map(([k, v]) => <li key={k}>{clases[k] || k}: {usd(v)}</li>)}
                    </ul>
                  )}
                </td>
                <td>{usd(s.dueno)}</td>
                <td>{usd(s.reservaImpuesto)}</td>
                <td style={{ color: COLOR_SEMAFORO[s.semaforo], fontWeight: 600 }}>{usd(s.disponible)}</td>
                <td>{s.lineaNecesaria > 0 ? `${usd(s.lineaNecesaria)}${s.lineaExcedida ? ' ⛔ excede la línea' : ''}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroller>
    </section>
  )
}
