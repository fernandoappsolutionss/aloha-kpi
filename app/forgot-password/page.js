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
      <main id="main-content" className="login__panel login__panel--single" data-page-state={loading ? 'loading' : 'ready'}>
        <div className="login__card">
          <div className="login__cardhead">
            <div style={{ marginBottom: 22 }}><Logo size={44} /></div>
            <h1 className="login__welcome">¿Olvidaste tu contraseña?</h1>
            <p className="login__cardsub">Te enviaremos un enlace para restablecerla.</p>
          </div>

          {sent ? (
            <div className="alert login__success" role="status" aria-live="polite">
              Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja de entrada (y spam).
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="login__form">
              <div className="field">
                <label className="label" htmlFor="email">Correo electrónico</label>
                <input id="email" name="email" className="input" type="email" required autoComplete="email" spellCheck={false}
                  value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@correo.com" />
              </div>
              <button type="submit" disabled={loading} className="btn btn--primary btn--block login__submit">
                {loading ? 'Enviando…' : 'Enviar enlace'}
              </button>
            </form>
          )}

          <p className="login__help">
            <Link href="/login" className="login__link">← Volver al inicio de sesión</Link><br />
            <a href="https://www.desarrolloweb.com.pa/" target="_blank" rel="noopener noreferrer" className="login__credit">Desarrollado por Appsolutionss</a>
          </p>
        </div>
      </main>
    </div>
  )
}
