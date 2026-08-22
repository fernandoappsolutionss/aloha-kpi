'use client'
import { useEffect, useState } from 'react'
import { reglasDeCuenta, guardarRegla, eliminarRegla, catalogoCuentasContables } from '../../app/actions/conciliacion'

const MODOS = [
  { k: 'contiene', l: 'contiene' },
  { k: 'empieza', l: 'empieza con' },
  { k: 'termina', l: 'termina con' },
  { k: 'palabras', l: 'tiene las palabras' },
]
const DIRECCIONES = [
  { k: 'ambas', l: 'entradas y salidas' },
  { k: 'salida', l: 'solo salidas' },
  { k: 'entrada', l: 'solo entradas' },
]
const VACIA = { patron: '', modo: 'contiene', direccion: 'ambas', zoho_account_id: '', prioridad: 0, general: false }

export default function ReglasPanel({ cuenta }) {
  const [reglas, setReglas] = useState([])
  const [contables, setContables] = useState([])
  const [admin, setAdmin] = useState(false)
  const [form, setForm] = useState(VACIA)
  const [mensaje, setMensaje] = useState(null)
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const res = await reglasDeCuenta(cuenta.id)
    if (res?.error) { setMensaje({ tipo: 'error', texto: res.error }); return }
    setReglas(res.reglas || [])
    setAdmin(Boolean(res.admin))
  }

  useEffect(() => {
    cargar()
    catalogoCuentasContables(cuenta.id).then((res) => { if (res?.cuentas) setContables(res.cuentas) })
  }, [cuenta.id])

  async function guardar() {
    setGuardando(true)
    setMensaje(null)
    const elegida = contables.find((c) => c.account_id === form.zoho_account_id)
    const res = await guardarRegla(cuenta.id, { ...form, zoho_account_nombre: elegida?.nombre || null })
    if (res?.error) setMensaje({ tipo: 'error', texto: res.error })
    else {
      setForm(VACIA)
      setMensaje({ tipo: 'ok', texto: form.id ? 'Regla actualizada.' : 'Regla creada.' })
      await cargar()
    }
    setGuardando(false)
  }

  async function borrar(id) {
    const res = await eliminarRegla(cuenta.id, id)
    if (res?.error) setMensaje({ tipo: 'error', texto: res.error })
    else await cargar()
  }

  return (
    <div className="conc-reglas">
      <p className="conc-ayuda">
        Cada regla lee la descripción que manda el banco y decide a qué cuenta contable de Zoho va el
        movimiento. Gana la de mayor prioridad; a igual prioridad, la más específica. Lo que ninguna
        regla atrape cae en las cuentas puente de la cuenta bancaria.
      </p>

      {mensaje && (
        <div className={mensaje.tipo === 'error' ? 'alert alert--error' : 'conc-ok'}>{mensaje.texto}</div>
      )}

      <div className="conc-form">
        <div className="field">
          <label className="label">Si la descripción</label>
          <select className="input" value={form.modo} onChange={(e) => setForm({ ...form, modo: e.target.value })}>
            {MODOS.map((m) => <option key={m.k} value={m.k}>{m.l}</option>)}
          </select>
        </div>
        <div className="field conc-form__ancho">
          <label className="label">Texto</label>
          <input className="input" value={form.patron} placeholder="ACH NOMINA"
            onChange={(e) => setForm({ ...form, patron: e.target.value })} />
        </div>
        <div className="field">
          <label className="label">Aplica a</label>
          <select className="input" value={form.direccion} onChange={(e) => setForm({ ...form, direccion: e.target.value })}>
            {DIRECCIONES.map((d) => <option key={d.k} value={d.k}>{d.l}</option>)}
          </select>
        </div>
        <div className="field conc-form__ancho">
          <label className="label">Registrar en la cuenta</label>
          <select className="input" value={form.zoho_account_id}
            onChange={(e) => setForm({ ...form, zoho_account_id: e.target.value })}>
            <option value="">Elegir cuenta contable…</option>
            {contables.map((c) => <option key={c.account_id} value={c.account_id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="field conc-form__corto">
          <label className="label">Prioridad</label>
          <input className="input num" type="number" value={form.prioridad}
            onChange={(e) => setForm({ ...form, prioridad: Number(e.target.value) || 0 })} />
        </div>
        {admin && (
          <label className="conc-check">
            <input type="checkbox" checked={form.general}
              onChange={(e) => setForm({ ...form, general: e.target.checked })} />
            Aplicar a todas las cuentas de esta organización
          </label>
        )}
        <div className="conc-form__botones">
          {form.id && <button className="btn" onClick={() => setForm(VACIA)}>Cancelar</button>}
          <button className="btn btn--primary" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Agregar regla')}
          </button>
        </div>
      </div>

      <div className="conc-tabla-wrap">
        <table className="conc-tabla">
          <thead>
            <tr>
              <th>Regla</th><th>Aplica a</th><th>Cuenta contable</th>
              <th className="num">Prioridad</th><th>Alcance</th><th />
            </tr>
          </thead>
          <tbody>
            {reglas.map((r) => (
              <tr key={r.id} className={r.activa ? '' : 'conc-fila--apagada'}>
                <td><strong>{MODOS.find((m) => m.k === r.modo)?.l}</strong> “{r.patron}”</td>
                <td>{DIRECCIONES.find((d) => d.k === r.direccion)?.l}</td>
                <td>{r.zoho_account_nombre || r.zoho_account_id}</td>
                <td className="num">{r.prioridad}</td>
                <td>{r.cuenta_id === null ? 'Toda la organización' : (r.cuenta_etiqueta || 'Esta cuenta')}</td>
                <td className="conc-acciones-celda">
                  <button className="conc-link" onClick={() => setForm({
                    id: r.id, patron: r.patron, modo: r.modo, direccion: r.direccion,
                    zoho_account_id: r.zoho_account_id, prioridad: r.prioridad,
                    general: r.cuenta_id === null,
                  })}>Editar</button>
                  <button className="conc-link conc-link--peligro" onClick={() => borrar(r.id)}>Borrar</button>
                </td>
              </tr>
            ))}
            {!reglas.length && (
              <tr><td colSpan={6} className="conc-vacio">Todavía no hay reglas: todo caerá en las cuentas puente.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
