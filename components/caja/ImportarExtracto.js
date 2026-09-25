'use client'
import { useRef, useState } from 'react'
import { previsualizarExtracto, confirmarExtracto } from '../../app/actions/caja'
import { usd, usdExacto, fechaCorta } from './formato'

// St. Georges: el resumen del PDF no cuadra con la suma del detalle. El saldo se
// toma del resumen (es el del banco), pero falta identificar el movimiento.
function AvisoDescuadre({ descuadre }) {
  if (!descuadre) return null
  return (
    <p role="alert" className="alert" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-line)', color: 'var(--warn-text)' }}>
      ⚠️ Al estado de cuenta le falta {Number(descuadre.monto) < 0 ? 'un débito' : 'un crédito'} de {usdExacto(Math.abs(Number(descuadre.monto)))}{descuadre.fecha ? ` al ${fechaCorta(descuadre.fecha)}` : ''}: el saldo se toma del resumen del banco. Baja el estado oficial para identificarlo.
    </p>
  )
}

// Un saldo sin fecha no sirve de ancla (la tabla exige los dos): sin ambos no hay "solo saldo".
const saldoUtil = (saldo) => Boolean(saldo?.fecha) && saldo.monto !== null && saldo.monto !== undefined

export function ImportarExtracto({ onCambio }) {
  const input = useRef(null)
  const [archivo, setArchivo] = useState(null)
  const [vista, setVista] = useState(null)
  const [estado, setEstado] = useState('')
  const [error, setError] = useState('')
  const [descuadreGuardado, setDescuadreGuardado] = useState(null)
  const [ocupado, setOcupado] = useState(false)

  const limpiarInput = () => { if (input.current) input.current.value = '' }

  async function revisar(file) {
    setArchivo(file); setVista(null); setError(''); setDescuadreGuardado(null); setEstado('Leyendo el archivo…'); setOcupado(true)
    try {
      const fd = new FormData(); fd.set('archivo', file)
      const r = await previsualizarExtracto(fd)
      setEstado('')
      if (r?.error) { setError(r.error); setArchivo(null); limpiarInput() }
      else setVista(r)
    } catch {
      setEstado('')
      setError('No se pudo leer el archivo. Intenta de nuevo.')
      setArchivo(null); limpiarInput()
    } finally {
      setOcupado(false)
    }
  }

  async function guardar() {
    if (!archivo) return
    setError(''); setEstado('Guardando…'); setOcupado(true)
    try {
      const fd = new FormData(); fd.set('archivo', archivo)
      const r = await confirmarExtracto(fd)
      setEstado('')
      if (r?.error) { setError(r.error); return }
      const cuenta = vista?.cuenta || 'la cuenta'
      setEstado(r.nuevos === 0 && saldoUtil(vista?.saldo)
        ? `✅ Saldo del banco actualizado al ${fechaCorta(vista.saldo.fecha)} (${cuenta}).`
        : `✅ ${cuenta}: ${r.nuevos} movimientos nuevos (${r.duplicados} ya estaban).`)
      setVista(null); setArchivo(null); limpiarInput()
      setDescuadreGuardado(r.descuadre || null)
      onCambio()
    } catch {
      setEstado('')
      setError('No se pudo guardar el extracto. Intenta de nuevo.')
    } finally {
      setOcupado(false)
    }
  }

  const soloSaldo = Boolean(vista) && vista.nuevos === 0 && saldoUtil(vista.saldo)

  return (
    <section className="card" style={{ padding: 20, marginBottom: 16 }} aria-labelledby="caja-subir">
      <h2 id="caja-subir" style={{ marginTop: 0 }}>Subir extracto</h2>
      <p className="h-sub">OFX de Banco General, o Excel de St. Georges (la descarga de movimientos) o el PDF de su estado de cuenta. Subir el mismo archivo dos veces no duplica nada.</p>
      <label style={{ display: 'grid', gap: 6, maxWidth: '100%' }}>
        <span className="label">Archivo del banco</span>
        <input ref={input} type="file" accept=".ofx,.xls,.pdf" disabled={ocupado} style={{ fontSize: 16, maxWidth: '100%' }}
          onChange={(e) => e.target.files?.[0] && revisar(e.target.files[0])} />
      </label>
      {estado && <p role="status">{estado}</p>}
      {error && <p role="alert" className="alert alert--error">{error}</p>}
      <AvisoDescuadre descuadre={descuadreGuardado} />
      {vista && (
        <div style={{ marginTop: 12 }}>
          <p style={{ overflowWrap: 'anywhere' }}>
            <b>{vista.cuenta}</b> · {fechaCorta(vista.desde)} → {fechaCorta(vista.hasta)} · saldo del banco {vista.saldo ? `${usd(vista.saldo.monto)} al ${fechaCorta(vista.saldo.fecha)}` : '—'}
          </p>
          <p>{vista.nuevos} nuevos · {vista.duplicados} ya cargados · {vista.porClasificar} quedarán por clasificar.</p>
          <AvisoDescuadre descuadre={vista.descuadre} />
          <button className="btn btn--primary" type="button" onClick={guardar} disabled={ocupado || (vista.nuevos === 0 && !soloSaldo)}>
            {soloSaldo ? 'Guardar solo el saldo del banco' : `Guardar ${vista.nuevos} movimientos`}
          </button>
        </div>
      )}
    </section>
  )
}
