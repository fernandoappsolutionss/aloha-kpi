'use client'
import { useState, useEffect } from 'react'
import { tienePanel, ETIQUETA_ROL } from '../../components/useRol'
import { useRouter } from 'next/navigation'
import { changePassword } from '../actions/auth'
import Sidebar from '../../components/Sidebar'

export default function PerfilPage() {
  const router = useRouter()
  const [rol, setRol] = useState('')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [centroId, setCentroId] = useState('')
  const [form, setForm] = useState({ actual: '', nueva: '', confirmar: '' })
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setRol(localStorage.getItem('aloha_rol') || '')
    setNombre(localStorage.getItem('aloha_nombre') || '')
    setEmail(localStorage.getItem('aloha_email') || '')
    setCentroId(localStorage.getItem('aloha_centro_id') || '')
  }, [])

  async function cambiarPassword(e) {
    e.preventDefault()
    if (form.nueva.length < 8) { setStatus('❌ La contraseña debe tener al menos 8 caracteres.'); return }
    if (form.nueva !== form.confirmar) { setStatus('❌ Las contraseñas no coinciden.'); return }
    setLoading(true); setStatus('')
    try {
      const res = await changePassword(form.nueva)
      if (res.error) throw new Error(res.error)
      setStatus('✅ Contraseña actualizada exitosamente.')
      setForm({ actual: '', nueva: '', confirmar: '' })
    } catch (err) {
      setStatus('❌ Error: ' + err.message)
    }
    setLoading(false)
  }

  const isAdmin = tienePanel(rol)
  const coinciden = form.nueva && form.confirmar && form.nueva === form.confirmar
  const isError = status.includes('❌')

  return (
    <div className="shell">
      <Sidebar rol={rol} centroNombre={nombre} centroId={centroId}/>
      <main className="main" style={{ maxWidth: 640 }}>

        {/* Header */}
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Cuenta · Seguridad</div>
            <h1 className="h-title">Mi perfil</h1>
            <p className="h-sub">Información de tu cuenta y seguridad</p>
          </div>
        </div>

        {/* Info de usuario */}
        <div className="card" style={{ padding: 24, marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--ts-green-soft)', border: '1px solid var(--ts-green-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 600, color: 'var(--ts-green)', fontFamily: 'var(--font-serif)', flexShrink: 0 }}>
              {nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', fontFamily: 'var(--font-serif)' }}>{nombre}</div>
              <div className="num" style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 3 }}>{email}</div>
              <span className={`pill ${isAdmin ? 'pill--ok' : 'pill--ok'}`} style={{ marginTop: 9 }}>
                <span className="dot" />{ETIQUETA_ROL[rol] || 'Usuario'}
              </span>
            </div>
          </div>
        </div>

        {/* Cambio de contraseña */}
        <div className="card" style={{ padding: 24 }}>
          <h3 className="panel__title" style={{ fontSize: 17, marginBottom: 4 }}>Cambiar contraseña</h3>
          <p className="h-sub" style={{ marginTop: 0, marginBottom: 22 }}>Usa mínimo 8 caracteres. Te recomendamos usar letras, números y símbolos.</p>

          <form onSubmit={cambiarPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="field">
              <label className="label" htmlFor="nueva">Nueva contraseña</label>
              <input id="nueva" className="input" type="password" value={form.nueva}
                onChange={e=>setForm({...form,nueva:e.target.value})}
                placeholder="Mínimo 8 caracteres" required />
            </div>
            <div className="field">
              <label className="label" htmlFor="confirmar">Confirmar contraseña</label>
              <input id="confirmar" className="input" type="password" value={form.confirmar}
                onChange={e=>setForm({...form,confirmar:e.target.value})}
                placeholder="Repite la nueva contraseña" required />
            </div>

            {form.nueva && form.confirmar && (
              <div className={`alert ${coinciden ? '' : 'alert--error'}`}
                style={coinciden ? { background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: '#6EE7B7' } : undefined}>
                {coinciden ? '✓ Las contraseñas coinciden' : '✗ Las contraseñas no coinciden'}
              </div>
            )}

            {status && (
              <div className={`alert ${isError ? 'alert--error' : ''}`}
                style={isError ? undefined : { background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: '#6EE7B7' }}>
                {status}
              </div>
            )}

            <button type="submit" disabled={loading||form.nueva!==form.confirmar||form.nueva.length<8}
              className="btn btn--primary btn--block" style={{ marginTop: 6, padding: '13px' }}>
              {loading ? 'Actualizando…' : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}
