'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'
import AlohaLogo from '../../components/AlohaLogo'

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
    <div style={{minHeight:'100vh',display:'flex',background:'linear-gradient(135deg,#0E2B5E 0%,#1B4580 40%,#1D5FA6 100%)'}}>
      
      {/* Left decorative panel */}
      <div style={{flex:1,display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',padding:60,color:'#fff'}}>
        <div style={{maxWidth:400}}>
          <div style={{fontSize:13,fontWeight:600,color:'rgba(184,212,50,1)',letterSpacing:3,textTransform:'uppercase',marginBottom:20}}>
            Sistema de gestión
          </div>
          <h2 style={{fontSize:36,fontWeight:800,lineHeight:1.2,marginBottom:16,color:'#fff'}}>
            Monitorea el desempeño de todos tus centros en tiempo real
          </h2>
          <p style={{fontSize:15,color:'rgba(255,255,255,0.65)',lineHeight:1.7}}>
            KPIs semanales, cumplimiento mensual, historial trimestral y reportes anuales — todo en un solo lugar.
          </p>
          <div style={{display:'flex',gap:20,marginTop:32}}>
            {[['9','Centros'],['10','Usuarios'],['Q1','2026']].map(([n,l])=>(
              <div key={l} style={{textAlign:'center'}}>
                <div style={{fontSize:28,fontWeight:800,color:'#B8D432'}}>{n}</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginTop:2,textTransform:'uppercase',letterSpacing:1}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{width:1,background:'rgba(255,255,255,0.1)',margin:'60px 0'}}/>

      {/* Right login card */}
      <div style={{flex:'0 0 480px',display:'flex',alignItems:'center',justifyContent:'center',padding:40}}>
        <div style={{background:'#fff',borderRadius:20,padding:'44px 40px',width:'100%',maxWidth:400,boxShadow:'0 25px 60px rgba(0,0,0,0.3)'}}>
          
          <div style={{textAlign:'center',marginBottom:32}}>
            <AlohaLogo height={44}/>
            <div style={{height:1,background:'linear-gradient(to right,transparent,#E8EBF0,transparent)',marginTop:24}}/>
            <p style={{fontSize:12,color:'#8896A9',marginTop:16,fontWeight:500}}>Panel de administración · Panamá</p>
          </div>

          <form onSubmit={handleLogin} style={{display:'flex',flexDirection:'column',gap:16}}>
            <div>
              <label style={{fontSize:11,color:'#4A5568',fontWeight:700,display:'block',marginBottom:6,letterSpacing:'0.06em',textTransform:'uppercase'}}>
                Correo electrónico
              </label>
              <input type="email" required autoComplete="email"
                value={form.email} onChange={e=>setForm({...form,email:e.target.value})}
                placeholder="tu@aloha.com"
                style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8EBF0',borderRadius:10,fontSize:14,outline:'none',
                  background:'#F5F7FA',color:'#1A2744',boxSizing:'border-box'}}
                onFocus={e=>{e.target.style.borderColor='#1D5FA6';e.target.style.background='#fff'}}
                onBlur={e=>{e.target.style.borderColor='#E8EBF0';e.target.style.background='#F5F7FA'}}
              />
            </div>
            <div>
              <label style={{fontSize:11,color:'#4A5568',fontWeight:700,display:'block',marginBottom:6,letterSpacing:'0.06em',textTransform:'uppercase'}}>
                Contraseña
              </label>
              <input type="password" required autoComplete="current-password"
                value={form.password} onChange={e=>setForm({...form,password:e.target.value})}
                placeholder="••••••••"
                style={{width:'100%',padding:'12px 14px',border:'1.5px solid #E8EBF0',borderRadius:10,fontSize:14,outline:'none',
                  background:'#F5F7FA',color:'#1A2744',boxSizing:'border-box'}}
                onFocus={e=>{e.target.style.borderColor='#1D5FA6';e.target.style.background='#fff'}}
                onBlur={e=>{e.target.style.borderColor='#E8EBF0';e.target.style.background='#F5F7FA'}}
              />
            </div>

            {error && (
              <div style={{padding:'10px 14px',borderRadius:8,background:'#FBE8E8',color:'#C0392B',fontSize:13,display:'flex',gap:8,alignItems:'center',fontWeight:500}}>
                <span>⚠</span><span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              style={{padding:'13px',background:'linear-gradient(135deg,#1B4580 0%,#1D5FA6 100%)',color:'#fff',border:'none',
                borderRadius:10,fontSize:14,fontWeight:700,cursor:'pointer',marginTop:6,
                letterSpacing:'0.04em',opacity:loading?0.75:1,
                boxShadow:'0 4px 16px rgba(27,69,128,0.35)',transition:'all 0.2s'}}>
              {loading ? 'Verificando...' : 'Ingresar al sistema'}
            </button>
          </form>

          <div style={{textAlign:'center',fontSize:11,color:'#C0C8D4',marginTop:24,lineHeight:1.6}}>
            ¿Problemas para acceder? Contacta a tu administrador.<br/>
            <span style={{color:'#B8D432',fontWeight:600}}>ALOHA Mental Arithmetic · Panamá</span>
          </div>
        </div>
      </div>
    </div>
  )
}
