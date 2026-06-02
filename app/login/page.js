'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login } from '../actions/auth'
import { getPublicStats } from '../actions/public'
import Logo from '../../components/Logo'
import { getCurrentPeriod } from '../../lib/period'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })
  const { year, quarter } = getCurrentPeriod()
  const [stats, setStats] = useState(null)
  useEffect(() => { getPublicStats().then(setStats).catch(() => {}) }, [])

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await login(form.email, form.password)
      if (res.error) throw new Error(res.error)

      localStorage.setItem('aloha_rol', res.rol)
      localStorage.setItem('aloha_centro_id', res.centro_id || '')
      localStorage.setItem('aloha_nombre', res.nombre || '')
      localStorage.setItem('aloha_email', res.email)

      if (res.rol === 'admin_general' || res.rol === 'supervisor') {
        router.push('/dashboard')
      } else {
        router.push('/centro/' + res.centro_id)
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="login">

      {/* ---- Brand panel ---- */}
      <aside className="login__brand">
        <div className="login__kicker" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Logo size={46} animate wordmark={false} />
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
          <Logo size={26} />
          <p className="label" style={{ marginTop: 12, color: 'var(--text-faint)' }}>
            ALOHA Mental Arithmetic · Panamá · Venezuela
          </p>
        </div>
      </aside>

      {/* ---- Login card ---- */}
      <main className="login__panel">
        <div className="login__card">
          <div className="login__cardhead">
            <div style={{ marginBottom: 22 }}><Logo size={30} /></div>
            <h2 className="login__welcome">Bienvenido de nuevo</h2>
            <p className="login__cardsub">Ingresa tus credenciales para acceder al panel.</p>
          </div>

          <form onSubmit={handleLogin} className="login__form">
            <div className="field">
              <label className="label" htmlFor="email">Correo electrónico</label>
              <input id="email" className="input" type="email" required autoComplete="email"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="tu@correo.com" />
            </div>

            <div className="field">
              <label className="label" htmlFor="password">Contraseña</label>
              <input id="password" className="input" type="password" required autoComplete="current-password"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••" />
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
              {loading ? 'Verificando…' : 'Ingresar al sistema'}
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                </svg>
              )}
            </button>
          </form>

          <p className="login__help">
            ¿Problemas para acceder? Contacta a tu administrador.<br />
            <b>Operado por Team Solutionss</b>
          </p>
        </div>
      </main>
    </div>
  )
}
