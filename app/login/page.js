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
      const { error: authError } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
      if (authError) throw authError
      const { data: usuario } = await supabase.from('usuarios').select('rol, centro_id').eq('email', form.email).single()
      if (usuario?.rol === 'admin_general' || usuario?.rol === 'supervisor') router.push('/dashboard')
      else router.push(`/centro/${usuario?.centro_id}`)
    } catch { setError('Credenciales incorrectas.') }
    finally { setLoading(false) }
  }

  function demoLogin(rol) {
    if (rol === 'admin') { localStorage.setItem('demo_rol','admin_general'); router.push('/dashboard') }
    else { localStorage.setItem('demo_rol','administradora'); localStorage.setItem('demo_centro','BRISAS DEL GOLF'); router.push('/centro/demo') }
  }

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>ALOHA</div>
        <div style={s.logoSub}>Mental Arithmetic · KPI Dashboard</div>
        <form onSubmit={handleLogin} style={s.form}>
          <div style={s.field}>
            <label style={s.label}>Correo electrónico</label>
            <input type="email" style={s.input} placeholder="tu@aloha.com"
              value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div style={s.field}>
            <label style={s.label}>Contraseña</label>
            <input type="password" style={s.input} placeholder="••••••••"
              value={form.password} onChange={e => setForm({...form, password: e.target.value})} />
          </div>
          {error && <div style={s.error}>{error}</div>}
          <button type="submit" style={s.btn} disabled={loading}>{loading ? 'Ingresando...' : 'Ingresar'}</button>
        </form>
        <div style={s.divider}><span>o accede en modo demo</span></div>
        <div style={s.demoRow}>
          <button onClick={() => demoLogin('admin')} style={s.demoBtn}>👑 Admin general</button>
          <button onClick={() => demoLogin('centro')} style={s.demoBtnOutline}>🏫 Administradora</button>
        </div>
      </div>
    </div>
  )
}
const s = {
  page: { minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--bg)', padding:20 },
  card: { background:'var(--white)', border:'0.5px solid var(--border)', borderRadius:16, padding:'40px 36px', width:'100%', maxWidth:380 },
  logo: { fontSize:28, fontWeight:700, color:'var(--purple)', letterSpacing:2, marginBottom:4 },
  logoSub: { fontSize:12, color:'var(--text-muted)', marginBottom:32 },
  form: { display:'flex', flexDirection:'column', gap:16 },
  field: { display:'flex', flexDirection:'column', gap:6 },
  label: { fontSize:12, color:'var(--text-muted)', fontWeight:500 },
  input: { padding:'10px 12px', border:'0.5px solid var(--border)', borderRadius:8, fontSize:14, outline:'none', background:'#fafaf8' },
  error: { background:'var(--red-light)', color:'var(--red)', padding:'10px 12px', borderRadius:8, fontSize:12 },
  btn: { padding:11, background:'var(--purple)', color:'#fff', border:'none', borderRadius:8, fontSize:14, fontWeight:500, marginTop:4, cursor:'pointer' },
  divider: { textAlign:'center', color:'var(--text-hint)', fontSize:12, margin:'24px 0 16px', borderTop:'0.5px solid var(--border)', paddingTop:16 },
  demoRow: { display:'flex', gap:8 },
  demoBtn: { flex:1, padding:'9px 0', background:'var(--purple-light)', color:'var(--purple)', border:'none', borderRadius:8, fontSize:12, fontWeight:500, cursor:'pointer' },
  demoBtnOutline: { flex:1, padding:'9px 0', background:'var(--white)', color:'var(--text-muted)', border:'0.5px solid var(--border)', borderRadius:8, fontSize:12, cursor:'pointer' },
}
