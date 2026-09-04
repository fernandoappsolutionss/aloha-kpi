'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { login } from '../actions/auth'
import { getPublicStats } from '../actions/public'
import Logo from '../../components/Logo'
import { getCurrentPeriod } from '../../lib/period'

export default function LoginPage() {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const { year, quarter } = getCurrentPeriod()
  const [stats, setStats] = useState(null)
  useEffect(() => {
    setHydrated(true)
    getPublicStats().then(setStats).catch(() => {})
  }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setPending(true); setError('')
    try {
      const res = await login(form.email, form.password)
      if (res.error) throw new Error(res.error)

      localStorage.setItem('aloha_rol', res.rol)
      localStorage.setItem('aloha_centro_id', res.centro_id || '')
      localStorage.setItem('aloha_nombre', res.nombre || '')
      localStorage.setItem('aloha_email', res.email)

      if (res.rol === 'admin_general' || res.rol === 'supervisor' || res.rol === 'coordinador') {
        router.push('/dashboard')
      } else {
        router.push('/centro/' + res.centro_id)
      }
    } catch (err) { setError(err.message) }
    finally { setPending(false) }
  }

  return (
    <div className="login">

      {/* ---- Brand panel ---- */}
      <aside className="login__brand">
        <div className="login__kicker" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo size={52} />
          <div className="label" style={{ color: 'var(--text-muted)' }}>Sistema de gestión · KPI</div>
        </div>

        <div className="login__copy">
          <h1 className="login__headline">
            El desempeño de cada centro,<br /><em>medible en tiempo real.</em>
          </h1>
          <p className="login__lead">
            KPIs semanales, cumplimiento mensual, historial trimestral y reportes anuales —
            todos tus centros en un solo tablero.
          </p>

          <div className="login__stats">
            {[[stats ? String(stats.centros) : '—', 'Centros'], [stats ? String(stats.usuarios) : '—', 'Usuarios'], [`Q${quarter}`, String(year)]].map(([n, l]) => (
              <div key={l}>
                <div className="stat__num">{n}</div>
                <div className="stat__label">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="login__brandfoot">
          <Logo size={40} />
          <p className="label" style={{ marginTop: 12, color: 'var(--text-faint)' }}>
            ALOHA Mental Arithmetic · Panamá · Venezuela
          </p>
        </div>
      </aside>

      {/* ---- Login card ---- */}
      <main id="main-content" className="login__panel" data-page-state={pending ? 'loading' : error ? 'error' : 'ready'} data-hydrated={hydrated ? 'true' : 'false'}>
        <div className="login__card">
          <div className="login__cardhead">
            <div style={{ marginBottom: 22 }}><Logo size={44} /></div>
            <h2 className="login__welcome">Bienvenido de nuevo</h2>
            <p className="login__cardsub">Ingresa tus credenciales para acceder al panel.</p>
          </div>

          <form onSubmit={handleLogin} className="login__form">
            <div className="field">
              <label className="label" htmlFor="email">Correo electrónico</label>
              <input id="email" name="email" className="input" type="email" required autoComplete="email" spellCheck={false}
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="tu@correo.com" />
            </div>

            <div className="field">
              <label className="label" htmlFor="password">Contraseña</label>
              <input id="password" name="password" className="input" type="password" required autoComplete="current-password"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••" />
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <Link href="/forgot-password" className="label login__link">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            {error && (
              <div className="alert alert--error" role="alert">
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={pending} className="btn btn--primary btn--block login__submit">
              {pending ? 'Verificando…' : 'Ingresar al sistema'}
              {!pending && (
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </form>

          {pending && <p className="sr-only" role="status" aria-live="polite">Verificando credenciales…</p>}

          <p className="login__help">
            ¿Problemas para acceder? Contacta a tu administrador.<br />
            <a href="https://www.desarrolloweb.com.pa/" target="_blank" rel="noopener noreferrer" className="login__credit">Desarrollado por Appsolutionss</a>
          </p>
        </div>
      </main>
    </div>
  )
}
