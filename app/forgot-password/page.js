'use client'
import { useState } from 'react'
import Link from 'next/link'
import Logo from '../../components/Logo'
import { requestPasswordReset } from '../actions/password'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try { await requestPasswordReset(email) } catch { /* no revelar nada */ }
    setSent(true); setLoading(false)
  }

  return (
    <div className="login">
      <main className="login__panel" style={{ width: '100%' }}>
        <div className="login__card">
          <div className="login__cardhead">
            <div style={{ marginBottom: 22 }}><Logo size={30} /></div>
            <h2 className="login__welcome">¿Olvidaste tu contraseña?</h2>
            <p className="login__cardsub">Te enviaremos un enlace para restablecerla.</p>
          </div>

          {sent ? (
            <div className="alert" style={{ background: 'var(--ok-bg)', border: '1px solid var(--ok-line)', color: '#6EE7B7', marginBottom: 8 }}>
              Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="login__form">
              <div className="field">
                <label className="label" htmlFor="email">Correo electrónico</label>
                <input id="email" className="input" type="email" required autoComplete="email"
                  value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />
              </div>
              <button type="submit" disabled={loading} className="btn btn--primary btn--block" style={{ marginTop: 6, padding: '13px' }}>
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
          )}

          <p className="login__help">
            <Link href="/login" style={{ color: 'var(--ts-green)', fontWeight: 600 }}>← Volver al inicio de sesión</Link><br />
            <b>Operado por Team Solutionss</b>
          </p>
        </div>
      </main>
    </div>
  )
}
