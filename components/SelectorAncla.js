'use client'
import { useState, useId } from 'react'
import { useDialogCallback } from './Dialog'
import { errorFechaAncla, topeAncla } from '../lib/ancla-sugerencias.mjs'

// ── Bloque de creación rápida del plan de un niño (R3) ──────────────────────
// Pinta las opciones que arma lib/ancla-sugerencias.mjs como tarjetas
// seleccionables: cada una con la fecha REAL que la sostiene y la CONSECUENCIA
// que produce hoy ("va por S4"), la recomendada preseleccionada y, al final,
// el campo para escribir la fecha a mano. Así el admin escoge viendo dónde
// queda el niño, no adivinando.
//
// No sabe de BD ni de rutas: `onFijar({ fecha, origen })` lo pone el caller
// —la ficha del niño llama a fijarInicioNivel, el tab Itinerario del grupo a
// fijarInicioNivelLote— y devuelve `{ error }` para que el bloque lo muestre
// sin cerrar nada. La validación de la fecha es la MISMA del server
// (errorFechaAncla): aquí solo se adelanta el mensaje.
//
// Props:
//   opciones, recomendada, descartadas → lib/ancla-lote.opcionesComunes o
//     directamente lib/ancla-sugerencias.sugerenciasAncla (un solo niño).
//   hoy → fecha de negocio Panamá que devolvió el server (nunca el reloj del
//     navegador: la validación tiene que coincidir con la del server).

const fmtDia = (f) => (f ? `${String(f).slice(8, 10)}/${String(f).slice(5, 7)}/${String(f).slice(0, 4)}` : '—')
const BTN = { padding: '6px 14px', fontSize: 12 }

export default function SelectorAncla({
  opciones = [],
  recomendada = null,
  descartadas = [],
  hoy,
  nota = '',
  cta = 'Fijar el plan',
  onFijar,
  onCancelar,
  onBusyChange,
}) {
  const choiceId = useId()
  const notifyBusy = useDialogCallback(onBusyChange, choiceId)
  const reportError = useDialogCallback(setError => setError(), choiceId)
  const [clave, setClave] = useState(recomendada || opciones[0]?.clave || 'manual')
  const [manual, setManual] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [err, setErr] = useState('')

  const sel = opciones.find((o) => o.clave === clave) || null
  const fecha = clave === 'manual' ? manual : sel?.fecha || ''
  // Aviso en vivo de la fecha escrita a mano (formato, día que no existe, tope
  // de hoy + 1 año): el error del server no debería sorprender a nadie.
  const avisoFecha = fecha ? errorFechaAncla(fecha, hoy) : ''
  const tope = topeAncla(hoy)

  async function confirmar() {
    const problema = fecha
      ? errorFechaAncla(fecha, hoy)
      : 'Escoge una opción o escribe el día en que el niño empezó el nivel que cursa.'
    if (problema) { setErr(problema); return }
    setErr('')
    setGuardando(true)
    notifyBusy(true)
    try {
      const res = await onFijar({ fecha, origen: clave })
      if (res?.error) reportError(() => setErr(res.error))
    } catch {
      reportError(() => setErr('No se pudo fijar el plan. Revisa la conexión e intenta nuevamente.'))
    } finally {
      reportError(() => setGuardando(false))
      notifyBusy(false)
    }
  }

  function escoger(k) {
    setClave(k)
    setErr('')
  }

  return (
    <div className="anchor-selector" style={{ display: 'grid', gap: 10 }}>
      {nota && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>{nota}</div>}

      <fieldset disabled={guardando} style={{ display: 'grid', gap: 8, border: 0, padding: 0, margin: 0, minWidth: 0 }}><legend className="label">Cuándo empezó el nivel</legend>
        {opciones.map((o) => {
          const on = o.clave === clave
          return (
            <div key={o.clave}
              style={{
                display: 'grid', gap: 3, padding: '9px 12px', cursor: 'pointer',
                borderRadius: 'var(--r-sm)',
                background: on ? 'var(--ts-green-soft)' : 'var(--surface-3)',
                border: `1px solid ${on ? 'var(--ts-green-line)' : 'var(--border)'}`,
              }}
            >
              <label className="anchor-choice" htmlFor={`${choiceId}-${o.clave}`}>
                <input id={`${choiceId}-${o.clave}`} type="radio" name={choiceId} value={o.clave} checked={on} onChange={() => escoger(o.clave)} />
                <b style={{ color: 'var(--text)', fontSize: 12.5 }}>{o.etiqueta}</b>
                {o.fecha && (
                  <span className="num" style={{ fontSize: 12, color: on ? 'var(--ts-green)' : 'var(--text-muted)' }}>{fmtDia(o.fecha)}</span>
                )}
                {/* La marca es de PROBABILIDAD: escribir a mano nunca lo es,
                    aunque sea lo único que quede. */}
                {o.clave === recomendada && o.clave !== 'manual' && (
                  <span className="pill" style={{ fontSize: 9.5, background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text-dim)' }}>
                    la más probable
                  </span>
                )}
              </label>
              <div style={{ fontSize: 11.5, lineHeight: 1.6, color: 'var(--text-muted)', paddingLeft: 20 }}>{o.explicacion}</div>
              {o.clave === 'manual' && on && (
                <div style={{ paddingLeft: 20, marginTop: 3 }}>
                  <label htmlFor={`${choiceId}-date`}>Fecha manual de inicio</label>
                  <input id={`${choiceId}-date`} name="fecha_inicio_nivel"
                    type="date" className="input" style={{ width: 170 }} value={manual} max={tope || undefined}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { setManual(e.target.value); setErr('') }}
                  />
                </div>
              )}
            </div>
          )
        })}
      </fieldset>

      {/* Lo que NO se puede aplicar al lote, con su motivo: el bloque no
          promedia fechas ajenas — esos niños se resuelven uno por uno. */}
      {descartadas.length > 0 && (
        <ul style={{ margin: 0, paddingLeft: 16, display: 'grid', gap: 3, fontSize: 11, color: 'var(--text-dim)' }}>
          {descartadas.map((d) => (
            <li key={d.clave}><b style={{ color: 'var(--text-muted)' }}>{d.etiqueta}</b> no aplica en lote: {d.motivo}</li>
          ))}
        </ul>
      )}

      {(err || avisoFecha) && (
        <div role="alert" className="alert alert--error" style={{ fontSize: 12 }}>{err || avisoFecha}</div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
        {onCancelar && <button className="btn" style={BTN} onClick={onCancelar} disabled={guardando}>Cancelar</button>}
        <button className="btn btn--primary" style={BTN} onClick={confirmar} disabled={guardando || !fecha}>
          {guardando ? 'Guardando…' : cta}
        </button>
      </div>
    </div>
  )
}
