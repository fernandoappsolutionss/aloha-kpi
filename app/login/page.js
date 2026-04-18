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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: form.email, password: form.password
      })
      if (authError) throw new Error('Correo o contraseña incorrectos.')
      if (!authData.session) throw new Error('No se pudo iniciar sesión.')
      await supabase.auth.setSession(authData.session)

      const { data: usuario, error: userError } = await supabase
        .from('usuarios').select('rol, centro_id, nombre').eq('email', form.email).single()
      if (userError || !usuario) {
        await supabase.auth.signOut()
        throw new Error('Tu cuenta no está registrada en el sistema.')
      }
      localStorage.setItem('aloha_rol', usuario.rol)
      localStorage.setItem('aloha_centro_id', usuario.centro_id || '')
      localStorage.setItem('aloha_nombre', usuario.nombre || '')
      localStorage.setItem('aloha_email', form.email)

      if (usuario.rol === 'admin_general' || usuario.rol === 'supervisor') {
        router.push('/dashboard')
      } else {
        router.push('/centro/' + usuario.centro_id)
      }
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div style={{minHeight:'100vh',display:'flex',background:'linear-gradient(135deg,#1B4580 0%,#1D5FA6 50%,#4A90C4 100%)'}}>
      {/* Left panel */}
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',padding:'40px',color:'#fff',display:'none'}}>
      </div>

      {/* Right panel - Login card */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',flex:1,padding:'20px'}}>
        <div style={{background:'#fff',borderRadius:20,padding:'48px 44px',width:'100%',maxWidth:420,boxShadow:'0 20px 60px rgba(27,69,128,0.3)'}}>
          
          {/* Logo */}
          <div style={{textAlign:'center',marginBottom:36}}>
            <img src="https://raw.githubusercontent.com/fernandoappsolutionss/aloha-kpi/main/public/logo.png"
              alt="ALOHA Mental Arithmetic" 
              style={{height:64,objectFit:'contain'}}
              onError={e=>{e.target.style.display='none'; document.getElementById('logoFallback').style.display='block'}}
            />
            <div id="logoFallback" style={{display:'none',fontSize:28,fontWeight:800,color:'#1B4580',letterSpacing:2}}>ALOHA</div>
            <div style={{fontSize:12,color:'#8896A9',marginTop:8,letterSpacing:2,textTransform:'uppercase',fontWeight:500}}>
              Panel de Administración · KPI
            </div>
          </div>

          <div style={{height:1,background:'linear-gradient(to right,transparent,#E8EBF0,transparent)',marginBottom:28}}/>

          <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:18}}>
            <div>
              <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6,letterSpacing:'0.04em',textTransform:'uppercase'}}>
                Correo electrónico
              </label>
              <input type="email" required autoComplete="email"
                value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                placeholder="tu@aloha.com"
                style={{width:'100%',padding:'11px 14px',border:'1.5px solid #E8EBF0',borderRadius:10,fontSize:14,outline:'none',
                  background:'#F5F7FA',color:'#1A2744',transition:'border-color 0.2s',boxSizing:'border-box'}}
                onFocus={e=>e.target.style.borderColor='#1D5FA6'}
                onBlur={e=>e.target.style.borderColor='#E8EBF0'}
              />
            </div>
            <div>
              <label style={{fontSize:12,color:'#4A5568',fontWeight:600,display:'block',marginBottom:6,letterSpacing:'0.04em',textTransform:'uppercase'}}>
                Contraseña
              </label>
              <input type="password" required autoComplete="current-password"
                value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                placeholder="••••••••"
                style={{width:'100%',padding:'11px 14px',border:'1.5px solid #E8EBF0',borderRadius:10,fontSize:14,outline:'none',
                  background:'#F5F7FA',color:'#1A2744',boxSizing:'border-box'}}
                onFocus={e=>e.target.style.borderColor='#1D5FA6'}
                onBlur={e=>e.target.style.borderColor='#E8EBF0'}
              />
            </div>

            {error && (
              <div style={{padding:'10px 14px',borderRadius:8,background:'#FBE8E8',color:'#D63C3C',fontSize:13,display:'flex',gap:8,alignItems:'center'}}>
                <span>⚠</span><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{padding:'13px',background:'linear-gradient(135deg,#1B4580,#1D5FA6)',color:'#fff',border:'none',
                borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',marginTop:4,
                letterSpacing:'0.04em',textTransform:'uppercase',opacity:loading?0.7:1,
                boxShadow:'0 4px 15px rgba(27,69,128,0.3)',transition:'opacity 0.2s'}}>
              {loading ? 'Verificando...' : 'Ingresar al sistema'}
            </button>
          </form>

          <div style={{textAlign:'center',fontSize:11,color:'#B0BAC9',marginTop:24,lineHeight:1.5}}>
            ¿Problemas para acceder? Contacta a tu administrador.
          </div>

          <div style={{textAlign:'center',marginTop:16}}>
            <div style={{fontSize:10,color:'#C8D4E0',letterSpacing:1}}>ALOHA Mental Arithmetic · Panamá</div>
          </div>
        </div>
      </div>
    </div>
  )
}
