'use client'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import { createUsuario, updateUsuario, deleteUsuario, reenviarInvitacion } from '../../actions/usuarios'
import { presentAccessNotice } from '../../../lib/access-presentation.mjs'

const ROLES = [
  { val: 'admin_general', label: 'Administrador General', pill: 'pill--ok', ayuda: 'Todos los centros y la configuración del sistema.' },
  { val: 'coordinador', label: 'Coordinador Operativo', pill: '', ayuda: 'Administra cuentas operativas únicamente dentro de los centros que le asignes.' },
  { val: 'administradora', label: 'Administrador', pill: 'pill--warn', ayuda: 'Miembro del centro. Opera todo su centro, incluido cerrar y reabrir el mes.' },
  { val: 'asistente', label: 'Asistente', pill: 'pill--warn', ayuda: 'Miembro del centro. Registra la operación del día, pero no cierra ni reabre el mes ni elimina registros.' },
]
const ROL = (value) => ROLES.find((role) => role.val === value) || { label: value, pill: 'pill--warn', ayuda: '' }
const UN_CENTRO = ['administradora', 'asistente']

export default function UsuariosClient({ initialData }) {
  const router = useRouter()
  const EMPTY_FORM = {
    nombre: '',
    email: '',
    rol: initialData.assignableRoles[0] || '',
    centro_id: initialData.centers[0]?.id || '',
    centros: [],
  }
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')
  const [accessResult, setAccessResult] = useState(null)
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [centerFilter, setCenterFilter] = useState('all')
  const [pendingAction, setPendingAction] = useState(null)
  const pendingRef = useRef(false)

  const visibleUsers = useMemo(() => {
    if (centerFilter === 'all') return initialData.users
    const selected = Number(centerFilter)
    return initialData.users.filter((user) => user.centerIds.includes(selected))
  }, [initialData.users, centerFilter])

  async function submitOnce(key, work) {
    if (pendingRef.current) return
    pendingRef.current = true
    setPendingAction(key)
    setStatus('')
    try {
      return await work()
    } catch {
      setStatus('❌ No pudimos completar la operación. Intenta de nuevo.')
    } finally {
      pendingRef.current = false
      setPendingAction(null)
    }
  }

  function resetEditor() {
    setEditing(null)
    setForm(EMPTY_FORM)
  }

  function closeForm() {
    setShowForm(false)
    resetEditor()
    setStatus('')
    setAccessResult(null)
  }

  function openNewUser() {
    resetEditor()
    setStatus('')
    setAccessResult(null)
    setShowForm(true)
  }

  function editUser(user) {
    setEditing(user.id)
    setForm({
      nombre: user.nombre,
      email: user.email,
      rol: user.role,
      centro_id: user.centerId ?? '',
      centros: user.centerIds,
    })
    setStatus('')
    setAccessResult(null)
    setShowForm(true)
  }

  async function saveUser(event) {
    event.preventDefault()
    if (!form.nombre.trim() || (!editing && !form.email.trim())) {
      setStatus('❌ Nombre y email son requeridos.')
      return
    }
    return submitOnce('save', async () => {
      const userSnapshot = { nombre: form.nombre, email: form.email }
      const input = {
        nombre: form.nombre,
        rol: form.rol,
        centro_id: form.centro_id,
        centros: form.centros,
        ...(!editing ? { email: form.email } : {}),
      }
      const result = editing
        ? await updateUsuario(editing, input)
        : await createUsuario(input)
      if (result?.error) {
        setStatus(`❌ ${result.error}`)
        return
      }
      const wasEditing = Boolean(editing)
      resetEditor()
      setShowForm(false)
      setStatus(wasEditing ? '✅ Usuario actualizado.' : '✅ Usuario creado.')
      setAccessResult(wasEditing ? null : presentAccessNotice({ result, user: userSnapshot }))
      setCopied(false)
      router.refresh()
    })
  }

  async function sendAccess(user) {
    return submitOnce(`access:${user.id}`, async () => {
      const result = await reenviarInvitacion(user.id)
      if (result?.error) {
        setStatus(`❌ ${result.error}`)
        return
      }
      setAccessResult(presentAccessNotice({ result, user }))
      setCopied(false)
      router.refresh()
    })
  }

  async function copyLink() {
    if (accessResult?.kind !== 'invitation' || !accessResult.canCopy || !accessResult.link) return
    try {
      await navigator.clipboard.writeText(accessResult.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // El usuario todavía puede seleccionar el enlace manualmente.
    }
  }

  async function removeUser(user) {
    if (!confirm(`¿Eliminar usuario "${user.nombre}"? Esta acción no se puede deshacer.`)) return
    return submitOnce(`delete:${user.id}`, async () => {
      const result = await deleteUsuario(user.id)
      if (result?.error) {
        setStatus(`❌ ${result.error}`)
        return
      }
      setAccessResult(null)
      setStatus(`✅ Usuario "${user.nombre}" eliminado.`)
      router.refresh()
    })
  }

  const isError = status.startsWith('❌')
  const statusText = status.replace(/^[❌✅]\s*/, '')
  const disabled = Boolean(pendingAction)

  return (
    <div className="shell">
      <Sidebar rol="admin_general" />
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Configuración · Usuarios</div>
            <h1 className="h-title">{initialData.title}</h1>
            <p className="h-sub">{initialData.users.length} usuarios registrados</p>
          </div>
          {initialData.capabilities.createUser && (
            <button
              type="button"
              onClick={showForm ? closeForm : openNewUser}
              disabled={disabled}
              className={`btn${showForm ? '' : ' btn--primary'}`}
            >
              {showForm ? '✕ Cancelar' : '+ Nuevo usuario'}
            </button>
          )}
        </div>

        {initialData.centers.length > 1 && (
          <div className="field" style={{ maxWidth: 320, marginBottom: 18 }}>
            <label className="label" htmlFor="usuarios-center-filter">Centro</label>
            <select
              id="usuarios-center-filter"
              aria-label="Filtrar usuarios por centro"
              className="input"
              value={centerFilter}
              onChange={(event) => setCenterFilter(event.target.value)}
              disabled={disabled}
            >
              <option value="all">Todos mis centros</option>
              {initialData.centers.map((center) => <option key={center.id} value={center.id}>{center.nombre}</option>)}
            </select>
          </div>
        )}

        {status && (
          <div
            className={`alert${isError ? ' alert--error' : ''}`}
            style={isError ? { marginBottom: 16 } : { marginBottom: 16, background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: 'var(--ok-text)' }}
          >
            {statusText}
          </div>
        )}

        {accessResult && (
          <div className="card" style={{ padding: 22, marginBottom: 20, border: '1px solid var(--ok-line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div>
                <h3 className="panel__title" style={{ marginBottom: 6 }}>
                  {accessResult.kind === 'reset' ? '🔑 Restablecimiento de contraseña' : `✉️ Enlace de acceso para ${accessResult.nombre}`}
                </h3>
                <p className="h-sub" style={{ margin: 0 }}>
                  {accessResult.kind === 'reset'
                    ? (accessResult.emailSent
                        ? <>Correo de restablecimiento enviado a <b>{accessResult.email}</b>.</>
                        : <>No pudimos enviar el correo de restablecimiento. Intenta nuevamente.</>)
                    : (accessResult.emailSent
                        ? <>Correo enviado a <b>{accessResult.email}</b>. También puedes compartir el enlace directamente:</>
                        : (accessResult.canCopy
                            ? <>No pudimos enviar el correo. Comparte este enlace directamente con el usuario:</>
                            : <>No pudimos enviar el correo ni preparar un enlace copiable. Intenta nuevamente.</>))}
                </p>
              </div>
              <button type="button" onClick={() => setAccessResult(null)} disabled={disabled} className="btn" style={{ padding: '4px 10px', fontSize: 12 }}>✕</button>
            </div>
            {accessResult.kind === 'invitation' && accessResult.canCopy && (
              <>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <input readOnly value={accessResult.link} onFocus={(event) => event.target.select()} className="input" style={{ flex: 1, fontFamily: 'var(--font-mono, monospace)', fontSize: 12 }} />
                  <button type="button" onClick={copyLink} disabled={disabled} className="btn btn--primary" style={{ whiteSpace: 'nowrap' }}>
                    {copied ? '✓ Copiado' : 'Copiar enlace'}
                  </button>
                </div>
                <p className="label" style={{ marginTop: 10, color: 'var(--text-faint)' }}>El enlace vence en 48 horas y solo puede usarse una vez.</p>
              </>
            )}
          </div>
        )}

        {showForm && (
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 className="panel__title" style={{ marginBottom: 6 }}>{editing ? 'Editar usuario' : 'Crear nuevo usuario'}</h3>
            {!editing && <p className="h-sub" style={{ marginTop: 0, marginBottom: 20 }}>Se generará un enlace para que el usuario cree su propia contraseña. No necesitas asignarle una.</p>}
            <form onSubmit={saveUser}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                {[
                  ['Nombre completo *', 'nombre', 'text', 'Ej: Laura Méndez'],
                  ['Correo electrónico *', 'email', 'email', 'usuario@ejemplo.com'],
                ].map(([label, key, type, placeholder]) => (
                  <div className="field" key={key}>
                    <label className="label">{label}</label>
                    <input
                      type={type}
                      value={form[key]}
                      onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                      placeholder={placeholder}
                      disabled={disabled || (Boolean(editing) && key === 'email')}
                      className="input"
                      style={editing && key === 'email' ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}
                    />
                  </div>
                ))}
                <div className="field">
                  <label className="label">Rol</label>
                  <select
                    value={form.rol}
                    onChange={(event) => setForm({ ...form, rol: event.target.value, centro_id: '', centros: [] })}
                    className="input"
                    disabled={disabled}
                  >
                    {initialData.assignableRoles.map((role) => <option key={role} value={role}>{ROL(role).label}</option>)}
                  </select>
                  <p className="label" style={{ marginTop: 8, color: 'var(--text-faint)', textTransform: 'none', letterSpacing: 0 }}>{ROL(form.rol).ayuda}</p>
                </div>
                {UN_CENTRO.includes(form.rol) && (
                  <div className="field">
                    <label className="label">Centro asignado</label>
                    <select value={form.centro_id} onChange={(event) => setForm({ ...form, centro_id: event.target.value })} className="input" disabled={disabled}>
                      <option value="">— Sin asignar —</option>
                      {initialData.centers.map((center) => <option key={center.id} value={center.id}>{center.nombre}</option>)}
                    </select>
                  </div>
                )}
                {form.rol === 'coordinador' && (
                  <div className="field" style={{ gridColumn: '1 / -1' }}>
                    <label className="label">Centros asignados * <span style={{ color: 'var(--text-faint)' }}>({form.centros.length} de {initialData.centers.length})</span></label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8, marginTop: 6 }}>
                      {initialData.centers.map((center) => {
                        const selected = form.centros.includes(Number(center.id))
                        return (
                          <label key={center.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 'var(--r-sm)', cursor: 'pointer', border: `1px solid ${selected ? 'var(--ok-line)' : 'var(--border)'}`, background: selected ? 'var(--ok-bg)' : 'transparent' }}>
                            <input
                              type="checkbox"
                              checked={selected}
                              disabled={disabled}
                              onChange={() => setForm({
                                ...form,
                                centros: selected
                                  ? form.centros.filter((id) => Number(id) !== Number(center.id))
                                  : [...form.centros, Number(center.id)],
                              })}
                            />
                            <span style={{ fontSize: 13, color: 'var(--text)' }}>{center.nombre}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeForm} disabled={disabled} className="btn">Cancelar</button>
                <button type="submit" disabled={disabled} className="btn btn--primary">
                  {pendingAction === 'save' ? 'Guardando…' : (editing ? 'Actualizar' : 'Crear y generar acceso')}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="panel">
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>{['Nombre', 'Correo', 'Rol', 'Centro asignado', 'Estado', 'Acciones'].map((heading) => <th key={heading}>{heading}</th>)}</tr>
              </thead>
              <tbody>
                {visibleUsers.map((user) => (
                  <tr key={user.id} style={{ cursor: 'default' }}>
                    <td style={{ fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-sans)' }}>{user.nombre}</td>
                    <td className="num" style={{ color: 'var(--text-dim)', fontSize: 12 }}>{user.email}</td>
                    <td><span className={`pill ${ROL(user.role).pill}`}><span className="dot" />{ROL(user.role).label}</span></td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {user.role === 'coordinador'
                        ? (user.centerNames.length
                            ? <span title={user.centerNames.join(', ')}>{user.centerNames.length} centro{user.centerNames.length === 1 ? '' : 's'}: {user.centerNames.join(' · ')}</span>
                            : <span style={{ color: 'var(--bad)', fontStyle: 'italic' }}>Sin centros asignados</span>)
                        : (user.centerNames[0] || (user.role === 'admin_general' || user.role === 'supervisor'
                            ? <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Todos los centros</span>
                            : <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>Sin asignar</span>))}
                    </td>
                    <td>
                      {user.active
                        ? <span style={{ color: 'var(--ok)', fontSize: 12, fontWeight: 600 }}>● Activo</span>
                        : <span style={{ color: 'var(--warn)', fontSize: 12, fontWeight: 600 }}>○ Pendiente</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {(user.actions.resendInvitation || user.actions.sendPasswordReset) && (
                          <button
                            type="button"
                            onClick={() => sendAccess(user)}
                            disabled={disabled}
                            title={user.actions.sendPasswordReset ? 'Enviar correo para restablecer contraseña' : 'Generar enlace de acceso'}
                            style={{ padding: '5px 14px', border: '1px solid var(--ok-line)', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--ts-green)', fontSize: 12, cursor: disabled ? 'wait' : 'pointer', fontWeight: 500, opacity: disabled ? 0.6 : 1 }}
                          >
                            {pendingAction === `access:${user.id}` ? 'Enviando…' : (user.actions.sendPasswordReset ? 'Restablecer' : 'Enviar acceso')}
                          </button>
                        )}
                        {user.actions.edit && (
                          <button type="button" onClick={() => editUser(user)} disabled={disabled} style={{ padding: '5px 14px', border: '1px solid var(--border-strong)', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--text-muted)', fontSize: 12, cursor: disabled ? 'wait' : 'pointer', fontWeight: 500 }}>Editar</button>
                        )}
                        {user.actions.delete && (
                          <button type="button" onClick={() => removeUser(user)} disabled={disabled} style={{ padding: '5px 14px', border: '1px solid var(--bad-line)', borderRadius: 'var(--r-sm)', background: 'transparent', color: 'var(--bad-text)', fontSize: 12, cursor: disabled ? 'wait' : 'pointer', opacity: disabled ? 0.6 : 1 }}>
                            {pendingAction === `delete:${user.id}` ? 'Eliminando…' : 'Eliminar'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleUsers.length === 0 && (
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
