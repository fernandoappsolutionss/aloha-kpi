'use client'
import { useState, useEffect } from 'react'
import Sidebar from '../../../components/Sidebar'
import { listUsuarios, createUsuario, updateUsuario, deleteUsuario, reenviarInvitacion } from '../../actions/usuarios'
import { listCentros } from '../../actions/centros'

// Gerencia manda en todo; el coordinador operativo solo en los centros que se
// le asignen; Administrador y Asistente son los dos miembros de un centro.
const ROLES = [
  { val:'admin_general',  label:'Administrador General', pill:'pill--ok',   ayuda:'Todos los centros y la configuración del sistema.' },
  { val:'coordinador',    label:'Coordinador Operativo', pill:'',           ayuda:'Entra al panel y a los centros que le asignes, con permisos de administrador en ellos. No toca centros ni usuarios.' },
  { val:'administradora', label:'Administrador',         pill:'pill--warn', ayuda:'Miembro del centro. Opera todo su centro, incluido cerrar y reabrir el mes.' },
  { val:'asistente',      label:'Asistente',             pill:'pill--warn', ayuda:'Miembro del centro. Registra la operación del día, pero no cierra ni reabre el mes ni elimina registros.' },
]
const ROL = (val) => ROLES.find((r) => r.val === val) || { label: val, pill: 'pill--warn' }
const UN_CENTRO = ['administradora', 'asistente']

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([])
  const [centros, setCentros] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [sending, setSending] = useState(null)
  const [invite, setInvite] = useState(null) // { nombre, email, link, emailSent, emailReason, purpose }
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ nombre:'', email:'', rol:'administradora', centro_id:'', centros:[] })

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
    setSaving(true); setStatus('')
    try {
      if (editing) {
        const res = await updateUsuario(editing, { nombre: form.nombre, rol: form.rol, centro_id: form.centro_id, centros: form.centros })
        if (res.error) throw new Error(res.error)
        setStatus('✅ Usuario actualizado.')
      } else {
        const res = await createUsuario({ nombre: form.nombre, email: form.email, rol: form.rol, centro_id: form.centro_id, centros: form.centros })
        if (res.error) throw new Error(res.error)
        setStatus('✅ Usuario creado.')
        setInvite({ nombre: form.nombre, email: form.email.trim().toLowerCase(), link: res.link, emailSent: res.emailSent, emailReason: res.emailReason, purpose: 'invite' })
        setCopied(false)
      }
      setShowForm(false); setEditing(null)
      setForm({ nombre:'', email:'', rol:'administradora', centro_id:'', centros:[] })
      loadData()
    } catch(e) { setStatus('❌ Error: ' + e.message) }
    setSaving(false)
  }

  async function enviarAcceso(u) {
    setSending(u.id); setStatus('')
    try {
      const res = await reenviarInvitacion(u.id)
      if (res.error) throw new Error(res.error)
      setInvite({ nombre: u.nombre, email: u.email, link: res.link, emailSent: res.emailSent, emailReason: res.emailReason, purpose: u.activo ? 'reset' : 'invite' })
      setCopied(false)
    } catch(e) { setStatus('❌ Error: ' + e.message) }
    setSending(null)
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(invite.link); setCopied(true); setTimeout(()=>setCopied(false), 2500) }
    catch { /* el usuario puede seleccionar el texto manualmente */ }
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
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol, centro_id: u.centro_id || '', centros: (u.centros || []).map(String) })
    setShowForm(true)
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
            <div className="label" style={{ marginBottom: 10 }}>Configuración · Usuarios</div>
            <h1 className="h-title">Gestión de usuarios</h1>
            <p className="h-sub">{usuarios.length} usuarios registrados</p>
          </div>
          <button onClick={()=>{ setEditing(null); setForm({nombre:'',email:'',rol:'administradora',centro_id:'',centros:[]}); setShowForm(!showForm) }}
            className={`btn${showForm ? '' : ' btn--primary'}`}>
            {showForm ? '✕ Cancelar' : '+ Nuevo usuario'}
          </button>
        </div>

        {status && (
          <div className={`alert${isError ? ' alert--error' : ''}`}
            style={isError ? { marginBottom: 16 } : { marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: 'var(--ok-text)' }}>
            {statusText}
          </div>
        )}

        {/* Enlace de acceso generado */}
        {invite && (
          <div className="card" style={{ padding: 22, marginBottom: 20, border: '1px solid var(--ok-line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h3 className="panel__title" style={{ marginBottom: 6 }}>
                  {invite.purpose === 'reset' ? '🔑 Enlace para restablecer contraseña' : '✉️ Enlace de acceso para ' + invite.nombre}
                </h3>
                <p className="h-sub" style={{ margin: 0 }}>
                  {invite.emailSent
                    ? <>Correo enviado a <b>{invite.email}</b>. También puedes compartir el enlace directamente:</>
                    : <>El correo automático no está configurado{invite.emailReason && invite.emailReason !== 'no_api_key' ? ` (${invite.emailReason})` : ''}. Copia este enlace y envíaselo al usuario (WhatsApp, etc.):</>}
                </p>
              </div>
              <button onClick={()=>setInvite(null)} className="btn" style={{ padding: '4px 10px', fontSize: 12 }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <input readOnly value={invite.link} onFocus={e=>e.target.select()} className="input"
                style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }} />
              <button onClick={copyLink} className="btn btn--primary" style={{ whiteSpace: 'nowrap' }}>
                {copied ? '✓ Copiado' : 'Copiar enlace'}
              </button>
            </div>
            <p className="label" style={{ marginTop: 10, color: 'var(--text-faint)' }}>El enlace vence en 48 horas y solo puede usarse una vez.</p>
          </div>
        )}

        {showForm && (
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 className="panel__title" style={{ marginBottom: 6 }}>{editing ? 'Editar usuario' : 'Crear nuevo usuario'}</h3>
            {!editing && <p className="h-sub" style={{ marginTop: 0, marginBottom: 20 }}>Se generará un enlace para que el usuario cree su propia contraseña. No necesitas asignarle una.</p>}
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
                <div className="field">
                  <label className="label">Rol</label>
                  <select value={form.rol} onChange={e=>setForm({...form,rol:e.target.value,centro_id:'',centros:[]})} className="input">
                    {ROLES.map(r=><option key={r.val} value={r.val}>{r.label}</option>)}
                  </select>
                  <p className="label" style={{ marginTop: 8, color: 'var(--text-faint)', textTransform: 'none', letterSpacing: 0 }}>{ROL(form.rol).ayuda}</p>
                </div>
                {UN_CENTRO.includes(form.rol) && (
                  <div className="field">
                    <label className="label">Centro asignado</label>
                    <select value={form.centro_id} onChange={e=>setForm({...form,centro_id:e.target.value})} className="input">
                      <option value="">— Sin asignar —</option>
                      {centros.map(c=><option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                )}
                {form.rol === 'coordinador' && (
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Centros asignados * <span style={{ color: 'var(--text-faint)' }}>({form.centros.length} de {centros.length})</span></label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginTop: 6 }}>
                      {centros.map(c=>{
                        const on = form.centros.includes(String(c.id))
                        return (
                          <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
                            border: `1px solid ${on ? 'var(--ok-line)' : 'var(--border)'}`, background: on ? 'var(--ok-bg)' : 'transparent' }}>
                            <input type="checkbox" checked={on} onChange={()=>setForm({...form, centros: on
                              ? form.centros.filter(id=>id!==String(c.id))
                              : [...form.centros, String(c.id)] })} />
                            <span style={{ fontSize: 13, color: 'var(--text)' }}>{c.nombre}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={()=>setShowForm(false)} className="btn">Cancelar</button>
                <button type="submit" disabled={saving} className="btn btn--primary">
                  {saving ? 'Guardando...' : (editing ? 'Actualizar' : 'Crear y generar acceso')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="panel">
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>{['Nombre','Correo','Rol','Centro asignado','Estado','Acciones'].map(h=>
                  <th key={h}>{h}</th>
                )}</tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr style={{ cursor: 'default' }}><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Cargando...</td></tr>
                ) : usuarios.map((u)=>(
                  <tr key={u.id} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{u.nombre}</td>
                    <td className="num" style={{ color: 'var(--text-dim)', fontSize: 12 }}>{u.email}</td>
                    <td>
                      <span className={`pill ${ROL(u.rol).pill}`}>
                        <span className="dot" />{ROL(u.rol).label}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {u.rol === 'coordinador'
                        ? (u.centros_nombres?.length
                            ? <span title={u.centros_nombres.join(', ')}>{u.centros_nombres.length} centro{u.centros_nombres.length===1?'':'s'}: {u.centros_nombres.join(' · ')}</span>
                            : <span style={{ color: 'var(--bad)', fontStyle: 'italic' }}>Sin centros asignados</span>)
                        : u.centro_nombre || (u.rol==='admin_general' || u.rol==='supervisor'
                            ? <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Todos los centros</span>
                            : <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Sin asignar</span>)}
                    </td>
                    <td>
                      {u.activo
                        ? <span style={{ color: 'var(--ok)', fontSize: 12, fontWeight: 600 }}>● Activo</span>
                        : <span style={{ color: 'var(--warn)', fontSize: 12, fontWeight: 600 }}>○ Pendiente</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={()=>enviarAcceso(u)} disabled={sending===u.id}
                          title={u.activo ? 'Generar enlace para restablecer contraseña' : 'Generar enlace de acceso'}
                          style={{ padding: '5px 14px', border: '1px solid var(--ok-line)', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--ts-green)', fontSize: 12, cursor: sending===u.id?'wait':'pointer', fontWeight: 500, opacity: sending===u.id?0.6:1 }}>
                          {sending===u.id ? 'Generando...' : (u.activo ? 'Restablecer' : 'Enviar acceso')}
                        </button>
                        <button onClick={()=>editUser(u)}
                          style={{ padding: '5px 14px', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer', fontWeight: 500 }}>
                          Editar
                        </button>
                        {u.rol !== 'admin_general' && (
                          <button onClick={()=>deleteUser(u.id, u.nombre)} disabled={deleting===u.id}
                            style={{ padding: '5px 14px', border: '1px solid var(--bad-line)', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--bad-text)', fontSize: 12, cursor: deleting===u.id?'wait':'pointer', opacity: deleting===u.id?0.6:1 }}>
                            {deleting===u.id ? 'Eliminando...' : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && usuarios.length===0 && (
                  <tr style={{ cursor: 'default' }}><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>No hay usuarios.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
