'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import TableScroller from '../../../components/TableScroller'
import OperationalCard from '../../../components/OperationalCard'
import { listCentrosConUsuarios, createCentro, updateCentro, deleteCentro } from '../../actions/centros'

// El país del centro define las FECHAS PATRIAS que salta su calendario de
// itinerarios (Panamá o Venezuela).
const PAISES = { PA: 'Panamá', VE: 'Venezuela' }
// Miembros del centro: Administrador y Asistente. El coordinador operativo no
// es del centro, pero manda en él, y por eso también aparece en el equipo.
const ROL_MIEMBRO = {
  administradora: { label: 'Administrador', pill: 'pill--ok' },
  asistente:      { label: 'Asistente',     pill: 'pill--warn' },
  coordinador:    { label: 'Coordinador',   pill: '' },
}
const REGIONES = {
  PA: ['Ciudad de Panamá','Chiriquí','Coclé','Veraguas','Herrera','Los Santos','Colón','Darién','Panamá Oeste'],
  VE: ['Distrito Capital','Amazonas','Anzoátegui','Apure','Aragua','Barinas','Bolívar','Carabobo','Cojedes','Delta Amacuro','Falcón','Guárico','La Guaira','Lara','Mérida','Miranda','Monagas','Nueva Esparta','Portuguesa','Sucre','Táchira','Trujillo','Yaracuy','Zulia'],
}

export default function CentrosPage() {
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({ nombre: '', region: 'Ciudad de Panamá', pais: 'PA' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { loadCentros() }, [])

  async function loadCentros() {
    setLoading(true); setError('')
    try {
      const data = await listCentrosConUsuarios()
      setCentros(data || [])
    } catch { setError('No se pudieron cargar los centros. Intenta de nuevo.') }
    setLoading(false)
  }

  async function saveCentro(e) {
    e.preventDefault()
    if (!form.nombre.trim()) { setStatus('❌ El nombre es requerido.'); return }
    setSaving(true); setStatus('')
    try {
      if (editing) {
        const res = await updateCentro(editing, { nombre: form.nombre, region: form.region, pais: form.pais })
        if (res.error) throw new Error(res.error)
        setStatus('✅ Centro actualizado.')
      } else {
        const res = await createCentro({ nombre: form.nombre, region: form.region, pais: form.pais })
        if (res.error) throw new Error(res.error)
        setStatus('✅ Centro creado.')
      }
      setShowForm(false); setEditing(null); setForm({ nombre: '', region: 'Ciudad de Panamá', pais: 'PA' })
      loadCentros()
    } catch (e) { setStatus('❌ Error: ' + e.message) }
    setSaving(false)
  }

  async function deleteCenter(id, nombre, userCount) {
    const msg = userCount > 0
      ? `¿Eliminar "${nombre}"? Tiene ${userCount} usuario(s) asignado(s). Serán desvinculados del centro.`
      : `¿Eliminar "${nombre}"?`
    if (!confirm(msg)) return

    setDeleting(id); setStatus('')
    try {
      // Las FK se encargan: usuarios.centro_id -> NULL; resto en cascada.
      const res = await deleteCentro(id)
      if (res.error) throw new Error(res.error)
      setStatus('✅ Centro "' + nombre + '" eliminado correctamente.')
      loadCentros()
    } catch (e) {
      setStatus('❌ Error al eliminar: ' + e.message)
    }
    setDeleting(null)
  }

  function editCentro(c) {
    setEditing(c.id); setForm({ nombre: c.nombre, region: c.region || 'Ciudad de Panamá', pais: c.pais === 'VE' ? 'VE' : 'PA' }); setShowForm(true)
  }

  const isError = status.includes('❌')
  const statusText = status.replace(/^[❌✅]\s*/, '')

  function equipo(c) {
    return <div className="center-team">{(c.miembros || []).length === 0 ? <span>Sin miembros</span> : c.miembros.map(m => {
      const meta = ROL_MIEMBRO[m.rol] || { label: m.rol, pill: '' }
      return <div className="center-team__member" key={`${m.rol}-${m.id}`}>
        <span className={`pill ${meta.pill}`}>{meta.label}</span>
        <span>{m.nombre}{m.activo ? '' : ' (pendiente)'}</span>
        <span className="center-team__email">{m.email}</span>
      </div>
    })}</div>
  }

  function acciones(c) {
    return <div className="page-actions operations-center-actions">
      <button className="btn btn--compact" aria-label={`Editar ${c.nombre}`} onClick={() => editCentro(c)}>Editar</button>
      <button className="btn btn--compact" aria-label={`Eliminar ${c.nombre}`} disabled={deleting === c.id}
        onClick={() => deleteCenter(c.id, c.nombre, c.user_count || 0)}>{deleting === c.id ? 'Eliminando…' : 'Eliminar'}</button>
    </div>
  }

  return (
    <div className="shell">
      <Sidebar rol="admin_general"/>
      <main id="main-content" data-page-state={loading || saving || deleting ? 'loading' : error || isError ? 'error' : 'ready'} className="main operations-page">

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Configuración · Centros</div>
            <h1 className="h-title">Gestión de centros</h1>
            {!loading && !error && <p role="status" className="h-sub">{centros.length} centros registrados</p>}
          </div>
          <button onClick={() => { setEditing(null); setForm({nombre:'',region:'Ciudad de Panamá',pais:'PA'}); setShowForm(!showForm) }}
            disabled={loading || saving || !!error} className={`btn${showForm ? '' : ' btn--primary'}`}>
            {showForm ? '✕ Cancelar' : '+ Nuevo centro'}
          </button>
        </div>

        {status && (
          <div role={isError ? 'alert' : 'status'} className={`alert${isError ? ' alert--error' : ''}`}
            style={isError ? { marginBottom: 16 } : { marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: 'var(--ok-text)' }}>
            {statusText}
          </div>
        )}

        {showForm && (
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h2 id="center-form-title" className="panel__title" style={{ marginBottom: 20 }}>{editing ? 'Editar centro' : 'Crear nuevo centro'}</h2>
            <form role="form" aria-labelledby="center-form-title" autoComplete="off" onSubmit={saveCentro}>
              <div className="form-grid operations-center-form">
                <div className="field">
                  <label className="label" htmlFor="center-name">Nombre del centro *</label>
                  <input id="center-name" name="nombre" autoComplete="off" required value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}
                    placeholder="Ej: BRISAS DEL GOLF" className="input"/>
                </div>
                <div className="field">
                  <label className="label" htmlFor="center-country">País *</label>
                  <select id="center-country" name="pais" autoComplete="off" value={form.pais}
                    onChange={e=>{ const p = e.target.value; setForm({...form, pais: p, region: REGIONES[p][0]}) }}
                    className="input">
                    {Object.entries(PAISES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <div style={{ color: 'var(--text-dim)', marginTop: 4 }}>
                    Define las fechas patrias que salta el calendario de clases.
                  </div>
                </div>
                <div className="field">
                  <label className="label" htmlFor="center-region">Región</label>
                  <select id="center-region" name="region" autoComplete="off" value={form.region} onChange={e=>setForm({...form,region:e.target.value})} className="input">
                    {(REGIONES[form.pais] || []).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={()=>setShowForm(false)} className="btn">Cancelar</button>
                <button type="submit" disabled={saving} className="btn btn--primary">
                  {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear centro')}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? <p role="status">Cargando centros…</p> : error ? <p role="alert" className="alert alert--error">{error}</p> : <div className="panel">
          <h2 className="panel__title" style={{ padding: 18 }}>Centros y equipo</h2>
          <div className="desktop-only operational-table">
          <TableScroller label="Centros y equipo">
            <table className="table operations-table--centers">
              <caption className="sr-only">Centros, país, región y equipo asignado</caption>
              <thead>
                <tr>{['Centro','País','Región','Equipo','Acciones'].map(h=>
                  <th key={h}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {centros.map((c) => (
                    <tr key={c.id} style={{ cursor: 'default' }}>
                      <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{c.nombre}</td>
                      <td style={{ color: 'var(--text-dim)' }}>{PAISES[c.pais] || 'Panamá'}</td>
                      <td style={{ color: 'var(--text-dim)' }}>{c.region || '—'}</td>
                      <td>{equipo(c)}</td>
                      <td>{acciones(c)}</td>
                    </tr>
                ))}
                {centros.length === 0 && (
                  <tr style={{ cursor: 'default' }}><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>No hay centros. Crea el primero.</td></tr>
                )}
              </tbody>
            </table>
          </TableScroller>
          </div>
          <div className="mobile-only operational-list">
            {centros.map(c => <OperationalCard key={c.id} headingLevel={3} title={c.nombre}
              fields={[
                { label: 'País', value: PAISES[c.pais] || 'Panamá' },
                { label: 'Región', value: c.region || '—' },
                { label: 'Equipo', value: equipo(c) },
              ]} actions={acciones(c)} />)}
            {centros.length === 0 && <p>No hay centros. Crea el primero.</p>}
          </div>
        </div>}
      </main>
    </div>
  )
}
