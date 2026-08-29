'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Logo from '../../components/Logo'
import { getTokenInfo, setPassword } from '../actions/password'

function SetPasswordInner() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token') || ''

  const [info, setInfo] = useState(null) // null=cargando, {valid:false}|{valid:true,...}
  const [form, setForm] = useState({ pass: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) { setInfo({ valid: false }); return }
    getTokenInfo(token).then(setInfo).catch(() => setInfo({ valid: false }))
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (form.pass.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (form.pass !== form.confirm) { setError('Las contraseñas no coinciden.'); return }
    setLoading(true)
    try {
      const res = await setPassword(token, form.pass)
      if (res.error) throw new Error(res.error)
      localStorage.setItem('aloha_rol', res.rol)
      localStorage.setItem('aloha_centro_id', res.centro_id || '')
      localStorage.setItem('aloha_nombre', res.nombre || '')
      localStorage.setItem('aloha_email', res.email || '')
      if (res.rol === 'admin_general' || res.rol === 'supervisor' || res.rol === 'coordinador') router.push('/dashboard')
      else router.push('/centro/' + res.centro_id)
    } catch (err) { setError(err.message); setLoading(false) }
  }

  const reset = info?.purpose === 'reset'

  return (
    <div className="login">
      <main className="login__panel" style={{ width: '100%' }}>
        <div className="login__card">
          <div className="login__cardhead">
            <div style={{ marginBottom: 22 }}><Logo size={44} /></div>

            {info === null && <p className="login__cardsub">Verificando enlace…</p>}

            {info && info.valid === false && (
              <>
                <h2 className="login__welcome">Enlace no válido</h2>
                <p className="login__cardsub">
                  {info.reason === 'usado' ? 'Este enlace ya fue usado.'
                    : info.reason === 'vencido' ? 'Este enlace venció.'
                    : 'El enlace es inválido o está incompleto.'}
                  {' '}Pide a tu administrador que te envíe uno nuevo, o usa “¿Olvidaste tu contraseña?”.
                </p>
              </>
            )}

            {info && info.valid && (
              <>
                <h2 className="login__welcome">{reset ? 'Restablece tu contraseña' : '¡Bienvenido a ALOHA KPI!'}</h2>
                <p className="login__cardsub">
                  {reset ? 'Crea una nueva contraseña para ' : 'Hola '}<b>{info.nombre}</b>
                  {reset ? '.' : ', define tu contraseña para acceder.'}
                </p>
              </>
            )}
          </div>

          {info && info.valid && (
            <form onSubmit={handleSubmit} className="login__form">
              <div className="field">
                <label className="label" htmlFor="pass">Nueva contraseña</label>
                <input id="pass" className="input" type="password" required autoComplete="new-password"
                  value={form.pass} onChange={e => setForm({ ...form, pass: e.target.value })}
                  placeholder="Mínimo 8 caracteres" />
              </div>
              <div className="field">
                <label className="label" htmlFor="confirm">Confirmar contraseña</label>
                <input id="confirm" className="input" type="password" required autoComplete="new-password"
                  value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })}
                  placeholder="Repite la contraseña" />
              </div>

              {error && (
                <div className="alert alert--error" role="alert">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn--primary btn--block" style={{ marginTop: 6, padding: '13px' }}>
                {loading ? 'Guardando…' : (reset ? 'Restablecer y entrar' : 'Crear contraseña y entrar')}
              </button>
            </form>
          )}

          <p className="login__help">
            <Link href="/login" style={{ color: 'var(--ts-green)', fontWeight: 600 }}>← Volver al inicio de sesión</Link><br />
            <a href="https://www.desarrolloweb.com.pa/" target="_blank" rel="noopener noreferrer" className="login__credit">Desarrollado por Appsolutionss</a>
          </p>
        </div>
      </main>
    </div>
  )
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div className="login"><main className="login__panel" style={{ width: '100%' }}><div className="login__card"><p className="login__cardsub">Cargando…</p></div></main></div>}>
      <SetPasswordInner />
    </Suspense>
  )
}
