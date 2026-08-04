'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { listCentrosConUsuarios, createCentro, updateCentro, deleteCentro } from '../../actions/centros'

// El país del centro define las FECHAS PATRIAS que salta su calendario de
// itinerarios (Panamá o Venezuela).
const PAISES = { PA: 'Panamá', VE: 'Venezuela' }
const REGIONES = {
  PA: ['Ciudad de Panamá','Chiriquí','Coclé','Veraguas','Herrera','Los Santos','Colón','Darién','Panamá Oeste'],
  VE: ['Distrito Capital','Amazonas','Anzoátegui','Apure','Aragua','Barinas','Bolívar','Carabobo','Cojedes','Delta Amacuro','Falcón','Guárico','La Guaira','Lara','Mérida','Miranda','Monagas','Nueva Esparta','Portuguesa','Sucre','Táchira','Trujillo','Yaracuy','Zulia'],
}

export default function CentrosPage() {
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')
  const [form, setForm] = useState({ nombre: '', region: 'Ciudad de Panamá', pais: 'PA' })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => { loadCentros() }, [])

  async function loadCentros() {
    setLoading(true)
    try {
      const data = await listCentrosConUsuarios()
      setCentros(data || [])
    } catch { setCentros([]) }
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

  return (
    <div className="shell">
      <Sidebar rol="admin_general"/>
      <main className="main">

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Configuración · Centros</div>
            <h1 className="h-title">Gestión de centros</h1>
            <p className="h-sub">{centros.length} centros registrados</p>
          </div>
          <button onClick={() => { setEditing(null); setForm({nombre:'',region:'Ciudad de Panamá',pais:'PA'}); setShowForm(!showForm) }}
            className={`btn${showForm ? '' : ' btn--primary'}`}>
            {showForm ? '✕ Cancelar' : '+ Nuevo centro'}
          </button>
        </div>

        {status && (
          <div className={`alert${isError ? ' alert--error' : ''}`}
            style={isError ? { marginBottom: 16 } : { marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: '#6EE7B7' }}>
            {statusText}
          </div>
        )}

        {showForm && (
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 className="panel__title" style={{ marginBottom: 20 }}>{editing ? 'Editar centro' : 'Crear nuevo centro'}</h3>
            <form onSubmit={saveCentro}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 18 }}>
                <div className="field">
                  <label className="label">Nombre del centro *</label>
                  <input value={form.nombre} onChange={e=>setForm({...form,nombre:e.target.value})}
                    placeholder="Ej: BRISAS DEL GOLF" className="input"/>
                </div>
                <div className="field">
                  <label className="label">País *</label>
                  <select value={form.pais}
                    onChange={e=>{ const p = e.target.value; setForm({...form, pais: p, region: REGIONES[p][0]}) }}
                    className="input">
                    {Object.entries(PAISES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--text-dim)', marginTop: 4 }}>
                    Define las fechas patrias que salta el calendario de clases.
                  </div>
                </div>
                <div className="field">
                  <label className="label">Región</label>
                  <select value={form.region} onChange={e=>setForm({...form,region:e.target.value})} className="input">
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

        <div className="panel">
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>{['Centro','País','Región','Usuarios','Acciones'].map(h=>
                  <th key={h}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr style={{ cursor: 'default' }}><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando...</td></tr>
                ) : centros.map((c) => {
                  const userCount = c.user_count || 0
                  return (
                    <tr key={c.id} style={{ cursor: 'default' }}>
                      <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{c.nombre}</td>
                      <td style={{ color: 'var(--text-dim)' }}>{PAISES[c.pais] || 'Panamá'}</td>
                      <td style={{ color: 'var(--text-dim)' }}>{c.region || '—'}</td>
                      <td>
                        <span className="pill pill--ok"><span className="dot" />{userCount} usuario{userCount!==1?'s':''}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={()=>editCentro(c)}
                            style={{ padding: '5px 14px', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                            Editar
                          </button>
                          <button
                            onClick={()=>deleteCenter(c.id, c.nombre, userCount)}
                            disabled={deleting===c.id}
                            style={{ padding: '5px 14px', border: '1px solid var(--bad-line)', borderRadius: 'var(--r-sm)', background: 'transparent', color: '#FCA5A5', fontSize: 12, cursor: deleting===c.id?'wait':'pointer', opacity: deleting===c.id?0.6:1 }}>
                            {deleting===c.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!loading && centros.length === 0 && (
                  <tr style={{ cursor: 'default' }}><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>No hay centros. Crea el primero.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
