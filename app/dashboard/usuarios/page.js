'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import { listUsuarios, createUsuario, updateUsuario, deleteUsuario } from '../../actions/usuarios'
import { listCentros } from '../../actions/centros'

const ROLES = [ { val:'admin_general', label:'Administrador General' }, { val:'administradora', label:'Usuario Centro' } ]

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({ nombre:'', email:'', password:'', rol:'administradora', centro_id:'' })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [u, c] = await Promise.all([listUsuarios(), listCentros()])
      setUsuarios(u || [])
      setCentros(c || [])
    } catch { setUsuarios([]); setCentros([]) }
    setLoading(false)
  }

  async function saveUser(e) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.email.trim()) { setStatus('❌ Nombre y email son requeridos.'); return }
    if (!editing && !form.password.trim()) { setStatus('❌ La contraseña es requerida.'); return }
    setSaving(true); setStatus('')
    try {
      if (editing) {
        const res = await updateUsuario(editing, { nombre: form.nombre, rol: form.rol, centro_id: form.centro_id })
        if (res.error) throw new Error(res.error)
        setStatus('✅ Usuario actualizado.')
      } else {
        const res = await createUsuario({ nombre: form.nombre, email: form.email, password: form.password, rol: form.rol, centro_id: form.centro_id })
        if (res.error) throw new Error(res.error)
        setStatus('✅ Usuario creado.')
      }
      setShowForm(false); setEditing(null)
      setForm({ nombre:'', email:'', password:'', rol:'administradora', centro_id:'' })
      loadData()
    } catch(e) { setStatus('❌ Error: ' + e.message) }
    setSaving(false)
  }

  async function deleteUser(id, nombre) {
    if (!confirm(`¿Eliminar usuario "${nombre}"? Esta acción no se puede deshacer.`)) return
    setDeleting(id); setStatus('')
    try {
      const res = await deleteUsuario(id)
      if (res.error) throw new Error(res.error)
      setStatus(`✅ Usuario "${nombre}" eliminado.`)
      loadData()
    } catch(e) { setStatus('❌ Error: ' + e.message) }
    setDeleting(null)
  }

  function editUser(u) {
    setEditing(u.id)
    setForm({ nombre: u.nombre, email: u.email, password:'', rol: u.rol, centro_id: u.centro_id || '' })
    setShowForm(true)
  }

  const rolLabel = r => ROLES.find(x=>x.val===r)?.label || r
  const isError = status.includes('❌')
  const statusText = status.replace(/^[❌✅]\s*/, '')

  return (
    <div className="shell">
      <Sidebar rol="admin_general"/>
      <main className="main">

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Configuración · Usuarios</div>
            <h1 className="h-title">Gestión de usuarios</h1>
            <p className="h-sub">{usuarios.length} usuarios registrados</p>
          </div>
          <button onClick={()=>{ setEditing(null); setForm({nombre:'',email:'',password:'',rol:'administradora',centro_id:''}); setShowForm(!showForm) }}
            className={`btn${showForm ? '' : ' btn--primary'}`}>
            {showForm ? '✕ Cancelar' : '+ Nuevo usuario'}
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
            <h3 className="panel__title" style={{ marginBottom: 20 }}>{editing ? 'Editar usuario' : 'Crear nuevo usuario'}</h3>
            <form onSubmit={saveUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                {[['Nombre completo *','nombre','text','Ej: Laura Méndez'],['Correo electrónico *','email','email','usuario@ejemplo.com']].map(([label,key,type,ph])=>(
                  <div className="field" key={key}>
                    <label className="label">{label}</label>
                    <input type={type} value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})}
                      placeholder={ph} disabled={editing && key==='email'}
                      className="input"
                      style={editing && key==='email' ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}/>
                  </div>
                ))}
                {!editing && (
                  <div className="field">
                    <label className="label">Contraseña *</label>
                    <input type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                      placeholder="Mínimo 6 caracteres" className="input"/>
                  </div>
                )}
                <div className="field">
                  <label className="label">Rol</label>
                  <select value={form.rol} onChange={e=>setForm({...form,rol:e.target.value,centro_id:''})} className="input">
                    {ROLES.map(r=><option key={r.val} value={r.val}>{r.label}</option>)}
                  </select>
                </div>
                {form.rol !== 'admin_general' && (
                  <div className="field">
                    <label className="label">Centro asignado</label>
                    <select value={form.centro_id} onChange={e=>setForm({...form,centro_id:e.target.value})} className="input">
                      <option value="">— Sin asignar —</option>
                      {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={()=>setShowForm(false)} className="btn">Cancelar</button>
                <button type="submit" disabled={saving} className="btn btn--primary">
                  {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear usuario')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="panel">
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>{['Nombre','Correo','Rol','Centro asignado','Acciones'].map(h=>
                  <th key={h}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr style={{ cursor: 'default' }}><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando...</td></tr>
                ) : usuarios.map((u)=>(
                  <tr key={u.id} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{u.nombre}</td>
                    <td className="num" style={{ color: 'var(--text-dim)', fontSize: 12 }}>{u.email}</td>
                    <td>
                      <span className={`pill ${u.rol==='admin_general' ? 'pill--ok' : 'pill--warn'}`}>
                        <span className="dot" />{u.rol==='admin_general'?'Administrador':'Usuario Centro'}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {u.centro_nombre || (u.rol==='admin_general' ? <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Todos los centros</span> : <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Sin asignar</span>)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={()=>editUser(u)}
                          style={{ padding: '5px 14px', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                          Editar
                        </button>
                        {u.rol !== 'admin_general' && (
                          <button onClick={()=>deleteUser(u.id, u.nombre)} disabled={deleting===u.id}
                            style={{ padding: '5px 14px', border: '1px solid var(--bad-line)', borderRadius: 'var(--r-sm)', background: 'transparent', color: '#FCA5A5', fontSize: 12, cursor: deleting===u.id?'wait':'pointer', opacity: deleting===u.id?0.6:1 }}>
                            {deleting===u.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && usuarios.length===0 && (
                  <tr style={{ cursor: 'default' }}><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>No hay usuarios.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
