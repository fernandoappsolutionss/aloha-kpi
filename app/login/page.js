'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email: '', password: '' })

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: form.email,
        password: form.password
      })
      if (authError) throw authError

      const { data: usuario, error: userError } = await supabase
        .from('usuarios')
        .select('rol, centro_id, nombre')
        .eq('email', form.email)
        .single()

      if (userError || !usuario) throw new Error('Usuario no encontrado en el sistema. Contacta al administrador.')

      localStorage.setItem('aloha_rol', usuario.rol)
      localStorage.setItem('aloha_centro_id', usuario.centro_id || '')
      localStorage.setItem('aloha_nombre', usuario.nombre || '')

      if (usuario.rol === 'admin_general' || usuario.rol === 'supervisor') {
        router.push('/dashboard')
      } else {
        router.push('/centro/' + usuario.centro_id)
      }
    } catch (err) {
      setError(err.message || 'Correo o contraseña incorrectos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logoWrap}>
          <div style={s.logo}>ALOHA</div>
          <div style={s.logoSub}>Mental Arithmetic · KPI Dashboard</div>
        </div>

        <form onSubmit={handleLogin} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Correo electrónico</label>
            <input
              type="email"
              style={s.input}
              placeholder="tu@aloha.com"
              required
              autoComplete="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div style={s.field}>
            <label style={s.label}>Contraseña</label>
            <input
              type="password"
              style={s.input}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
            />
          </div>

          {error && (
            <div style={s.error}>
              <span style={{marginRight:6}}>⚠</span>{error}
            </div>
          )}

          <button type="submit" style={{...s.btn, opacity: loading ? 0.7 : 1}} disabled={loading}>
            {loading ? 'Verificando...' : 'Ingresar al sistema'}
          </button>
        </form>

        <div style={s.footer}>
          ¿Problemas para acceder? Contacta a tu administrador.
        </div>
      </div>
    </div>
  )
}

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f5f5f0 0%, #EEEDFE 100%)',
    padding: 20
  },
  card: {
    background: '#ffffff',
    border: '0.5px solid #e8e8e4',
    borderRadius: 16,
    padding: '44px 40px 32px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 4px 24px rgba(83,58,183,0.08)'
  },
  logoWrap: { textAlign: 'center', marginBottom: 36 },
  logo: { fontSize: 32, fontWeight: 700, color: '#533AB7', letterSpacing: 3 },
  logoSub: { fontSize: 12, color: '#888', marginTop: 6 },
  form: { display: 'flex', flexDirection: 'column', gap: 18 },
  field: { display: 'flex', flexDirection: 'column', gap: 7 },
  label: { fontSize: 12, color: '#555', fontWeight: 600, letterSpacing: '0.02em' },
  input: {
    padding: '11px 14px',
    border: '1px solid #e0e0dc',
    borderRadius: 8,
    fontSize: 14,
    outline: 'none',
    background: '#fafaf8',
    transition: 'border-color 0.2s',
    color: '#1a1a1a'
  },
  error: {
    background: '#FAECE7',
    color: '#993C1D',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 13,
    display: 'flex',
    alignItems: 'center'
  },
  btn: {
    padding: '12px',
    background: '#533AB7',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 4,
    letterSpacing: '0.02em'
  },
  footer: {
    textAlign: 'center',
    fontSize: 11,
    color: '#bbb',
    marginTop: 24,
    lineHeight: 1.5
  }
}
