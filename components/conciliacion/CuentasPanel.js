'use client'
import { useEffect, useState } from 'react'
import {
  misCuentas, guardarCuenta, eliminarCuenta,
  catalogoOrganizaciones, catalogoCuentasBancarias, catalogoCuentasContablesDeOrg,
} from '../../app/actions/conciliacion'
import { listCentros } from '../../app/actions/centros'

const VACIA = {
  centro_id: '', etiqueta: '', zoho_org_id: '', zoho_account_id: '',
  cuenta_ingreso_id: '', cuenta_gasto_id: '', tolerancia_dias: 3, activa: true,
}

// Mapeo centro ↔ organización y cuenta bancaria de Zoho. Es la pieza que
// contestó Fernando: cada centro trabaja contra el Zoho que le corresponde.
export default function CuentasPanel({ onCambio }) {
  const [cuentas, setCuentas] = useState([])
  const [centros, setCentros] = useState([])
  const [orgs, setOrgs] = useState([])
  const [bancarias, setBancarias] = useState([])
  const [contables, setContables] = useState([])
  const [form, setForm] = useState(VACIA)
  const [mensaje, setMensaje] = useState(null)
  const [cargandoZoho, setCargandoZoho] = useState(false)
  const [guardando, setGuardando] = useState(false)

  async function cargar() {
    const res = await misCuentas()
    if (res?.error) setMensaje({ tipo: 'error', texto: res.error })
    else setCuentas(res.cuentas || [])
  }

  useEffect(() => {
    cargar()
    listCentros().then((data) => { if (data) setCentros(data) }).catch(() => {})
    catalogoOrganizaciones().then((res) => {
      if (res?.error) setMensaje({ tipo: 'error', texto: res.error })
      else setOrgs(res.organizaciones || [])
    })
  }, [])

  // Al elegir organización se traen sus cuentas bancarias y su catálogo
  // contable: sin eso el formulario pediría pegar identificadores a mano.
  async function elegirOrg(orgId) {
    setForm((f) => ({ ...f, zoho_org_id: orgId, zoho_account_id: '', cuenta_ingreso_id: '', cuenta_gasto_id: '' }))
    setBancarias([])
    setContables([])
    if (!orgId) return
    setCargandoZoho(true)
    const [banco, contable] = await Promise.all([
      catalogoCuentasBancarias(orgId),
      catalogoCuentasContablesDeOrg(orgId),
    ])
    if (banco?.error) setMensaje({ tipo: 'error', texto: banco.error })
    setBancarias(banco?.cuentas || [])
    setContables(contable?.cuentas || [])
    setCargandoZoho(false)
  }

  async function guardar() {
    setGuardando(true)
    setMensaje(null)
    const org = orgs.find((o) => o.organization_id === form.zoho_org_id)
    const banco = bancarias.find((b) => b.account_id === form.zoho_account_id)
    const ingreso = contables.find((c) => c.account_id === form.cuenta_ingreso_id)
    const gasto = contables.find((c) => c.account_id === form.cuenta_gasto_id)
    const res = await guardarCuenta({
      ...form,
      centro_id: form.centro_id === '' ? null : Number(form.centro_id),
      zoho_org_nombre: org?.nombre || null,
      zoho_account_nombre: banco?.nombre || form.zoho_account_nombre || null,
      moneda: banco?.moneda || 'USD',
      cuenta_ingreso_nombre: ingreso?.nombre || null,
      cuenta_gasto_nombre: gasto?.nombre || null,
    })
    if (res?.error) setMensaje({ tipo: 'error', texto: res.error })
    else {
      setForm(VACIA)
      setBancarias([])
      setMensaje({ tipo: 'ok', texto: 'Cuenta guardada.' })
      await cargar()
      onCambio?.()
    }
    setGuardando(false)
  }

  async function editar(cuenta) {
    setForm({
      id: cuenta.id,
      centro_id: cuenta.centro_id ?? '',
      etiqueta: cuenta.etiqueta,
      zoho_org_id: cuenta.zoho_org_id,
      zoho_account_id: cuenta.zoho_account_id,
      zoho_account_nombre: cuenta.zoho_account_nombre,
      cuenta_ingreso_id: cuenta.cuenta_ingreso_id || '',
      cuenta_gasto_id: cuenta.cuenta_gasto_id || '',
      tolerancia_dias: cuenta.tolerancia_dias ?? 3,
      activa: cuenta.activa,
    })
    setCargandoZoho(true)
    const [banco, contable] = await Promise.all([
      catalogoCuentasBancarias(cuenta.zoho_org_id),
      catalogoCuentasContablesDeOrg(cuenta.zoho_org_id),
    ])
    setBancarias(banco?.cuentas || [])
    setContables(contable?.cuentas || [])
    setCargandoZoho(false)
  }

  async function borrar(cuenta) {
    const res = await eliminarCuenta(cuenta.id)
    if (res?.error) setMensaje({ tipo: 'error', texto: res.error })
    else { await cargar(); onCambio?.() }
  }

  return (
    <div className="conc-cuentas">
      <p className="conc-ayuda">
        Aquí se ordena qué organización y qué cuenta bancaria de Zoho le toca a cada centro. Una cuenta
        sin centro es corporativa: solo la ve un administrador. Cada cuenta de Zoho se asigna una sola
        vez, para que el historial de lo ya importado no se parta en dos.
      </p>

      {mensaje && (
        <div className={mensaje.tipo === 'error' ? 'alert alert--error' : 'conc-ok'}>{mensaje.texto}</div>
      )}

      <div className="conc-form">
        <div className="field conc-form__ancho">
          <label className="label">Organización de Zoho</label>
          <select className="input" value={form.zoho_org_id} disabled={Boolean(form.id)}
            onChange={(e) => elegirOrg(e.target.value)}>
            <option value="">Elegir organización…</option>
            {orgs.map((o) => <option key={o.organization_id} value={o.organization_id}>{o.nombre}</option>)}
          </select>
        </div>
        <div className="field conc-form__ancho">
          <label className="label">Cuenta bancaria</label>
          <select className="input" value={form.zoho_account_id} disabled={Boolean(form.id) || cargandoZoho}
            onChange={(e) => {
              const banco = bancarias.find((b) => b.account_id === e.target.value)
              setForm({ ...form, zoho_account_id: e.target.value, etiqueta: form.etiqueta || banco?.nombre || '' })
            }}>
            <option value="">{cargandoZoho ? 'Consultando Zoho…' : 'Elegir cuenta…'}</option>
            {bancarias.map((b) => (
              <option key={b.account_id} value={b.account_id}>
                {b.nombre}{b.numero ? ` · ${b.numero}` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Centro</label>
          <select className="input" value={form.centro_id}
            onChange={(e) => setForm({ ...form, centro_id: e.target.value })}>
            <option value="">Corporativa (solo admin)</option>
            {centros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="field conc-form__ancho">
          <label className="label">Nombre en el panel</label>
          <input className="input" value={form.etiqueta} placeholder="Banco General — Calle 50"
            onChange={(e) => setForm({ ...form, etiqueta: e.target.value })} />
        </div>
        <div className="field conc-form__ancho">
          <label className="label">Cuenta puente de entradas</label>
          <select className="input" value={form.cuenta_ingreso_id}
            onChange={(e) => setForm({ ...form, cuenta_ingreso_id: e.target.value })}>
            <option value="">Sin puente (quedan sin cuenta)</option>
            {contables.map((c) => <option key={c.account_id} value={c.account_id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="field conc-form__ancho">
          <label className="label">Cuenta puente de salidas</label>
          <select className="input" value={form.cuenta_gasto_id}
            onChange={(e) => setForm({ ...form, cuenta_gasto_id: e.target.value })}>
            <option value="">Sin puente (quedan sin cuenta)</option>
            {contables.map((c) => <option key={c.account_id} value={c.account_id}>{c.nombre}</option>)}
          </select>
        </div>
        <div className="field conc-form__corto">
          <label className="label">Tolerancia (días)</label>
          <input className="input num" type="number" min="0" max="15" value={form.tolerancia_dias}
            onChange={(e) => setForm({ ...form, tolerancia_dias: Number(e.target.value) || 0 })} />
        </div>
        <label className="conc-check">
          <input type="checkbox" checked={form.activa !== false}
            onChange={(e) => setForm({ ...form, activa: e.target.checked })} />
          Activa
        </label>
        <div className="conc-form__botones">
          {form.id && <button className="btn" onClick={() => { setForm(VACIA); setBancarias([]) }}>Cancelar</button>}
          <button className="btn btn--primary" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : (form.id ? 'Guardar cambios' : 'Asignar cuenta')}
          </button>
        </div>
      </div>

      <div className="conc-tabla-wrap">
        <table className="conc-tabla">
          <thead>
            <tr>
              <th>Cuenta</th><th>Centro</th><th>Organización de Zoho</th>
              <th>Cuentas puente</th><th className="num">Tolerancia</th><th />
            </tr>
          </thead>
          <tbody>
            {cuentas.map((c) => (
              <tr key={c.id} className={c.activa ? '' : 'conc-fila--apagada'}>
                <td>
                  <div className="conc-desc">{c.etiqueta}</div>
                  <div className="conc-nota">{c.zoho_account_nombre}</div>
                </td>
                <td>{c.centro_nombre || 'Corporativa'}</td>
                <td>{c.zoho_org_nombre || c.zoho_org_id}</td>
                <td className="conc-nota">
                  {c.cuenta_ingreso_nombre || '—'} / {c.cuenta_gasto_nombre || '—'}
                </td>
                <td className="num">{c.tolerancia_dias} d</td>
                <td className="conc-acciones-celda">
                  <button className="conc-link" onClick={() => editar(c)}>Editar</button>
                  <button className="conc-link conc-link--peligro" onClick={() => borrar(c)}>Quitar</button>
                </td>
              </tr>
            ))}
            {!cuentas.length && (
              <tr><td colSpan={6} className="conc-vacio">Todavía no hay cuentas asignadas.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
