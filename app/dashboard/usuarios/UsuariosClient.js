'use client'
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '../../../components/Sidebar'
import OperationalCard from '../../../components/OperationalCard'
import TableScroller from '../../../components/TableScroller'
import Dialog from '../../../components/Dialog'
import { createUsuario, updateUsuario, deleteUsuario, reenviarInvitacion } from '../../actions/usuarios'
import { presentAccessNotice } from '../../../lib/access-presentation.mjs'

const ROLES = {
  admin_general: { label: 'Administrador General', help: 'Todos los centros y la configuración del sistema.' },
  supervisor: { label: 'Supervisor', help: '' },
  coordinador: { label: 'Coordinador Operativo', help: 'Administra cuentas operativas únicamente dentro de los centros que le asignes.' },
  administradora: { label: 'Administradora', help: 'Opera todo su centro, incluido cerrar y reabrir el mes.' },
  asistente: { label: 'Asistente', help: 'Registra la operación del día, pero no cierra ni reabre el mes ni elimina registros.' },
  coach: { label: 'Coach', help: 'Entra solo a su entrenamiento: no opera el centro. Si da clases en dos centros, se le asigna su centro base — el de la administradora que le firma.' },
}
const roleLabel = role => ROLES[role]?.label || role
const UN_CENTRO = ['administradora', 'asistente', 'coach']
const centerNames = user => user.centerNames.join(' · ') || (['admin_general', 'supervisor'].includes(user.role) ? 'Todos los centros' : 'Sin centro asignado')

function UserActions({ user, disabled, pendingAction, onEdit, onAccess, onDelete }) {
  return <div className="users-actions">
    {user.actions.edit && <button type="button" className="btn" disabled={disabled} onClick={() => onEdit(user)}>Editar</button>}
    {(user.actions.resendInvitation || user.actions.sendPasswordReset) && <button type="button" className="btn" disabled={disabled} onClick={() => onAccess(user)}>
      {pendingAction === `access:${user.id}` ? 'Enviando…' : user.actions.resendInvitation ? 'Reenviar invitación' : 'Enviar restablecimiento'}
    </button>}
    {user.actions.delete && <button type="button" className="btn btn--danger" disabled={disabled} onClick={() => onDelete(user)}>Eliminar</button>}
  </div>
}

function InvitationResult({ result, disabled, onClose }) {
  const [copied, setCopied] = useState(false)
  if (result.kind !== 'invitation') return null
  async function copyLink() {
    if (!result.link) return
    try { await navigator.clipboard.writeText(result.link); setCopied(true) } catch { /* El enlace sigue seleccionable. */ }
  }
  return <section className="card users-notice" aria-label="Resultado de invitación">
    <div className="users-notice__header">
      <div role="status" aria-live="polite">
        <h2 className="panel__title">Enlace de acceso para {result.nombre}</h2>
        <p>{!result.link
          ? 'La cuenta quedó creada, pero no pudimos generar el enlace de entrega. Contacta a gerencia.'
          : result.emailSent ? `Correo enviado a ${result.email}. También puedes compartir el enlace directamente.`
            : 'No pudimos enviar el correo. Comparte este enlace directamente con el usuario.'}</p>
      </div>
      <button type="button" className="btn users-notice__close" aria-label="Cerrar resultado" disabled={disabled} onClick={onClose}>×</button>
    </div>
    {result.link && <>
      <div className="users-notice__delivery">
        <div className="field">
          <label className="label" htmlFor="users-invitation-link">Enlace de invitación</label>
          <input id="users-invitation-link" name="invitationLink" autoComplete="off" className="input" readOnly value={result.link} onFocus={event => event.target.select()} />
        </div>
        <button type="button" className="btn btn--primary" disabled={disabled} onClick={copyLink}>{copied ? 'Copiado' : 'Copiar enlace'}</button>
      </div>
      <p className="caption">El enlace vence en 48 horas y solo puede usarse una vez.</p>
    </>}
  </section>
}

export default function UsuariosClient({ initialData }) {
  const router = useRouter()
  const EMPTY_FORM = { nombre: '', email: '', rol: initialData.assignableRoles[0] || '', centro_id: initialData.centers[0]?.id || '', centros: [] }
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')
  const [accessResult, setAccessResult] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [centerFilter, setCenterFilter] = useState('all')
  const [pendingAction, setPendingAction] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const pendingRef = useRef(false)
  const cancelDeleteRef = useRef(null)
  const noCenters = initialData.actor.role === 'coordinador' && initialData.centers.length === 0
  const visibleUsers = useMemo(() => centerFilter === 'all' ? initialData.users : initialData.users.filter(user => user.centerIds.includes(Number(centerFilter))), [initialData.users, centerFilter])

  async function submitOnce(key, work) {
    if (pendingRef.current) return
    pendingRef.current = true
    setPendingAction(key)
    setStatus('')
    try { return await work() }
    catch { setStatus('❌ No pudimos completar la operación. Intenta de nuevo.') }
    finally { pendingRef.current = false; setPendingAction(null) }
  }
  function resetEditor() { setEditing(null); setForm(EMPTY_FORM) }
  function closeForm() { setShowForm(false); resetEditor(); setStatus('') }
  function openNewUser() {
    if (!initialData.capabilities.createUser || noCenters) return
    resetEditor(); setStatus(''); setAccessResult(null); setShowForm(true)
  }
  function editUser(user) {
    if (!user.actions.edit) return
    setEditing(user.id)
    setForm({ nombre: user.nombre, email: user.email, rol: user.role, centro_id: user.centerId ?? '', centros: user.centerIds })
    setStatus(''); setAccessResult(null); setShowForm(true)
  }
  async function saveUser(event) {
    event.preventDefault()
    return submitOnce('save', async () => {
      setAccessResult(null)
      const snapshot = { nombre: form.nombre, email: form.email }
      const input = { nombre: form.nombre, rol: form.rol, centro_id: form.centro_id, centros: form.centros, ...(!editing ? { email: form.email } : {}) }
      const result = editing ? await updateUsuario(editing, input) : await createUsuario(input)
      if (result?.error) { setStatus(`❌ ${result.error}`); return }
      const wasEditing = Boolean(editing)
      resetEditor(); setShowForm(false)
      setStatus(wasEditing ? '✅ Usuario actualizado.' : '✅ Usuario creado.')
      setAccessResult(wasEditing ? null : presentAccessNotice({ result, user: snapshot }))
      router.refresh()
    })
  }
  async function sendAccess(user) {
    if (!user.actions.resendInvitation && !user.actions.sendPasswordReset) return
    return submitOnce(`access:${user.id}`, async () => {
      setAccessResult(null)
      const result = await reenviarInvitacion(user.id)
      if (result?.error) { setStatus(`❌ ${result.error}`); return }
      setAccessResult(presentAccessNotice({ result, user }))
      router.refresh()
    })
  }
  async function removeUser() {
    if (!deleting?.actions.delete) return
    const user = deleting
    return submitOnce(`delete:${user.id}`, async () => {
      const result = await deleteUsuario(user.id)
      if (result?.error) { setStatus(`❌ ${result.error}`); return }
      setDeleting(null); setAccessResult(null)
      setStatus(`✅ Usuario "${user.nombre}" eliminado.`)
      router.refresh()
    })
  }
  const disabled = Boolean(pendingAction)
  const isError = status.startsWith('❌')
  const notice = status && <div className={`alert${isError ? ' alert--error' : ''}`} role={isError ? 'alert' : 'status'}>{status.replace(/^[❌✅]\s*/, '')}</div>
  const actions = user => <UserActions user={user} disabled={disabled} pendingAction={pendingAction} onEdit={editUser} onAccess={sendAccess} onDelete={user => { setStatus(''); setDeleting(user) }} />

  return <div className="shell">
    <Sidebar />
    <main id="main-content" className="main users-page" data-page-state="ready">
      <div className="main__head page-actions">
        <div><div className="label">Configuración · Usuarios</div><h1 className="h-title">{initialData.title}</h1><p className="h-sub">{visibleUsers.length} cuentas</p></div>
        <button type="button" className="btn btn--primary" disabled={disabled || !initialData.capabilities.createUser || noCenters} onClick={openNewUser}>Crear usuario</button>
      </div>
      {noCenters && <div className="alert" role="alert">No tienes centros asignados. Contacta a gerencia para poder crear y gestionar usuarios.</div>}
      {initialData.centers.length > 1 && <div className="field users-filter">
        <label className="label" htmlFor="usuarios-center-filter">Centro</label>
        <select id="usuarios-center-filter" name="centerFilter" aria-label="Filtrar usuarios por centro" className="input" value={centerFilter} onChange={event => setCenterFilter(event.target.value)} disabled={disabled}>
          <option value="all">Todos mis centros</option>
          {initialData.centers.map(center => <option key={center.id} value={center.id}>{center.nombre}</option>)}
        </select>
      </div>}
      {!deleting && notice}
      {accessResult?.kind === 'invitation' && <InvitationResult result={accessResult} disabled={disabled} onClose={() => setAccessResult(null)} />}
      {accessResult?.kind === 'reset' && <div className="alert users-notice__header">
        <div role="status" aria-live="polite">{accessResult.emailSent ? 'Enviamos el restablecimiento al correo registrado.' : 'No pudimos enviar el correo. Contacta a gerencia.'}</div>
        <button type="button" className="btn users-notice__close" aria-label="Cerrar resultado" disabled={disabled} onClick={() => setAccessResult(null)}>×</button>
      </div>}
      {showForm && !noCenters && <section className="card users-editor">
        <h2 className="panel__title">{editing ? 'Editar usuario' : 'Crear nuevo usuario'}</h2>
        {!editing && <p>Se generará un enlace para que el usuario cree su propia contraseña.</p>}
        <form aria-label="Editor de usuario" onSubmit={saveUser}>
          <div className="form-grid">
            <div className="field"><label className="label" htmlFor="users-name">Nombre</label>
              <input id="users-name" name="nombre" type="text" autoComplete="name" required className="input" value={form.nombre} onChange={event => setForm({ ...form, nombre: event.target.value })} disabled={disabled} />
            </div>
            <div className="field"><label className="label" htmlFor="users-email">Correo</label>
              <input id="users-email" name="email" type="email" autoComplete="email" spellCheck={false} required className="input" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} disabled={disabled || Boolean(editing)} />
            </div>
            <div className="field"><label className="label" htmlFor="users-role">Rol</label>
              <select id="users-role" name="rol" required className="input" value={form.rol} onChange={event => setForm({ ...form, rol: event.target.value, centro_id: initialData.centers.length === 1 ? initialData.centers[0].id : form.centro_id, centros: [] })} disabled={disabled}>
                {initialData.assignableRoles.map(role => <option key={role} value={role}>{roleLabel(role)}</option>)}
              </select>
              <p className="h-sub">{ROLES[form.rol]?.help}</p>
            </div>
            {UN_CENTRO.includes(form.rol) && <div className="field"><label className="label" htmlFor="users-center">Centro</label>
              <select id="users-center" name="centro_id" required={initialData.actor.role === 'coordinador'} className="input" value={form.centro_id} onChange={event => setForm({ ...form, centro_id: event.target.value })} disabled={disabled}>
                {initialData.actor.role !== 'coordinador' && <option value="">Sin asignar</option>}
                {initialData.centers.map(center => <option key={center.id} value={center.id}>{center.nombre}</option>)}
              </select>
            </div>}
            {form.rol === 'coordinador' && <fieldset className="users-centers"><legend className="label">Centros asignados ({form.centros.length} de {initialData.centers.length})</legend>
              <div className="responsive-grid">{initialData.centers.map(center => {
                const selected = form.centros.includes(Number(center.id))
                return <label key={center.id} htmlFor={`users-center-${center.id}`} className="users-center-option">
                  <input id={`users-center-${center.id}`} name="centros" value={center.id} type="checkbox" checked={selected} disabled={disabled} onChange={() => setForm({ ...form, centros: selected ? form.centros.filter(id => Number(id) !== Number(center.id)) : [...form.centros, Number(center.id)] })} />
                  <span>{center.nombre}</span>
                </label>
              })}</div>
            </fieldset>}
          </div>
          <div className="dialog-actions users-editor__actions">
            <button type="button" className="btn" onClick={closeForm} disabled={disabled}>Cancelar</button>
            <button type="submit" className="btn btn--primary" disabled={disabled}>{pendingAction === 'save' ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cuenta'}</button>
          </div>
        </form>
      </section>}
      <div className="panel desktop-only">
        <TableScroller label="Usuarios y acciones por cuenta"><table className="table users-table">
          <caption className="sr-only">Usuarios autorizados y acciones disponibles</caption>
          <thead><tr>{['Nombre', 'Correo', 'Rol', 'Centro', 'Estado', 'Acciones'].map(heading => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
          <tbody>{visibleUsers.map(user => <tr key={user.id} data-user-email={user.email}>
            <td>{user.nombre}</td><td className="users-email">{user.email}</td><td>{roleLabel(user.role)}</td><td>{centerNames(user)}</td><td>{user.active ? 'Cuenta activa' : 'Invitación pendiente'}</td><td>{actions(user)}</td>
          </tr>)}{visibleUsers.length === 0 && <tr><td colSpan={6}>No hay usuarios.</td></tr>}</tbody>
        </table></TableScroller>
      </div>
      <div className="users-cards mobile-only operational-list">
        {visibleUsers.map(user => <div key={user.id} data-user-email={user.email}><OperationalCard headingLevel={2} title={user.nombre}
          fields={[{ label: 'Correo', value: user.email }, { label: 'Rol', value: roleLabel(user.role) }, { label: 'Centro', value: centerNames(user) }, { label: 'Estado', value: user.active ? 'Cuenta activa' : 'Invitación pendiente' }]}
          actions={actions(user)} /></div>)}
        {visibleUsers.length === 0 && <p>No hay usuarios.</p>}
      </div>
      <Dialog open={Boolean(deleting)} title="Eliminar usuario" description={`¿Eliminar a ${deleting?.nombre || 'este usuario'}? Esta acción no se puede deshacer.`} initialFocusRef={cancelDeleteRef} closeDisabled={disabled} onClose={() => setDeleting(null)}
        footer={<><button type="button" className="btn" ref={cancelDeleteRef} disabled={disabled} onClick={() => setDeleting(null)}>Cancelar</button><button type="button" className="btn btn--danger" disabled={disabled} onClick={removeUser}>{disabled ? 'Eliminando…' : 'Confirmar eliminación'}</button></>}>
        {deleting && notice}
      </Dialog>
    </main>
  </div>
}
