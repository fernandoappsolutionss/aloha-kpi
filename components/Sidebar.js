'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const A = {
  blue: '#1B4580', blueMid: '#1D5FA6', blueLight: '#4A90C4',
  bluePale: 'rgba(255,255,255,0.08)', blueActive: 'rgba(255,255,255,0.15)',
  greenLime: '#B8D432', white: '#fff', textLight: 'rgba(255,255,255,0.7)'
}

export default function Sidebar({ rol, centroNombre, centroId }) {
  const router = useRouter()
  const path = usePathname()
  const isAdmin = rol === 'admin_general' || rol === 'supervisor'
  const [centros, setCentros] = useState([])
  const [centrosOpen, setCentrosOpen] = useState(false)

  useEffect(() => {
    if (isAdmin) {
      supabase.from('centros').select('id, nombre').order('nombre').then(({ data }) => {
        if (data) setCentros(data)
      })
    }
  }, [isAdmin])

  const adminItems = [
    { label: 'Panel general', icon: '▦', href: '/dashboard' },
    { label: 'Ranking', icon: '🏆', href: '/dashboard/ranking' },
    { label: 'Alertas', icon: '🔔', href: '/dashboard/alertas' },
    { label: 'Historial', icon: '📅', href: '/dashboard/historial' },
    { label: 'Reporte', icon: '📄', href: '/dashboard/reporte' },
    { label: 'Metas', icon: '⚙', href: '/dashboard/metas' },
  ]

  const adminConfig = [
    { label: 'Centros', icon: '🏫', href: '/dashboard/centros' },
    { label: 'Usuarios', icon: '👥', href: '/dashboard/usuarios' },
  ]

  const centroItems = [
    { label: 'Resumen', icon: '▦', href: `/centro/${centroId}` },
    { label: 'KPI Semanal', icon: '📝', href: `/centro/${centroId}/kpi` },
    { label: 'Cumplimiento', icon: '✅', href: `/centro/${centroId}/cumplimiento` },
    { label: 'FODA', icon: '🔍', href: `/centro/${centroId}/foda` },
    { label: 'Historial', icon: '📅', href: `/centro/${centroId}/historial` },
  ]

  const items = isAdmin ? adminItems : centroItems

  function logout() {
    supabase.auth.signOut()
    localStorage.clear()
    router.push('/login')
  }

  const isActive = (href) => path === href

  return (
    <aside style={{
      width: 220, minHeight: '100vh', flexShrink: 0,
      background: `linear-gradient(180deg, ${A.blue} 0%, #163870 100%)`,
      display: 'flex', flexDirection: 'column',
      boxShadow: '4px 0 20px rgba(27,69,128,0.3)'
    }}>
      {/* Logo Header */}
      <div style={{padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:36,height:36,background:'rgba(255,255,255,0.15)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#fff',flexShrink:0}}>A</div>
          <div>
            <div style={{fontSize:14,fontWeight:800,color:'#fff',letterSpacing:1.5}}>ALOHA KPI</div>
            <div style={{fontSize:10,color:A.textLight,marginTop:1}}>{isAdmin ? '🛡 Administrador' : '🏫 ' + (centroNombre || 'Centro')}</div>
          </div>
        </div>
      </div>

      <nav style={{flex: 1, padding: '12px 0', overflowY: 'auto'}}>
        {/* Main items */}
        <div style={{padding:'8px 12px 4px',fontSize:10,color:A.textLight,textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600}}>
          {isAdmin ? 'Panel' : 'Mi Centro'}
        </div>

        {items.map(item => (
          <button key={item.href} onClick={() => router.push(item.href)}
            style={{
              width:'100%', display:'flex', alignItems:'center', gap:10,
              padding:'9px 14px', background: isActive(item.href) ? A.blueActive : 'none',
              border:'none', textAlign:'left', fontSize:13, cursor:'pointer',
              color: isActive(item.href) ? '#fff' : A.textLight,
              fontWeight: isActive(item.href) ? 600 : 400,
              borderLeft: isActive(item.href) ? `3px solid ${A.greenLime}` : '3px solid transparent',
              borderRadius: isActive(item.href) ? '0 8px 8px 0' : 0,
              transition: 'all 0.15s', margin:'1px 0'
            }}
            onMouseEnter={e => { if (!isActive(item.href)) { e.currentTarget.style.background=A.bluePale; e.currentTarget.style.color='#fff' }}}
            onMouseLeave={e => { if (!isActive(item.href)) { e.currentTarget.style.background='none'; e.currentTarget.style.color=A.textLight }}}>
            <span style={{fontSize:14,width:18,textAlign:'center'}}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}

        {/* Centros list for admin */}
        {isAdmin && centros.length > 0 && (
          <>
            <button onClick={() => setCentrosOpen(!centrosOpen)}
              style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'9px 14px',background:'none',border:'none',cursor:'pointer',color:A.textLight,fontSize:13,margin:'4px 0 0'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:14,width:18,textAlign:'center'}}>🏫</span>
                <span>Centros</span>
              </div>
              <span style={{fontSize:10,transition:'transform 0.2s',transform:centrosOpen?'rotate(180deg)':'rotate(0deg)'}}>▼</span>
            </button>

            {centrosOpen && centros.map(c => {
              const active = path.startsWith(`/centro/${c.id}`)
              return (
                <button key={c.id} onClick={() => router.push(`/centro/${c.id}`)}
                  style={{width:'100%',display:'flex',alignItems:'center',gap:8,
                    padding:'7px 14px 7px 40px',background:active?A.blueActive:'none',
                    border:'none',textAlign:'left',fontSize:11.5,cursor:'pointer',
                    color:active?'#fff':A.textLight,fontWeight:active?600:400,
                    borderLeft:active?`3px solid ${A.greenLime}`:'3px solid transparent'}}>
                  <span style={{width:5,height:5,borderRadius:3,background:active?A.greenLime:'rgba(255,255,255,0.3)',flexShrink:0}}/>
                  {c.nombre.length > 16 ? c.nombre.split(' ').slice(0,2).join(' ') : c.nombre}
                </button>
              )
            })}
          </>
        )}

        {/* Admin config */}
        {isAdmin && (
          <>
            <div style={{padding:'12px 12px 4px',fontSize:10,color:A.textLight,textTransform:'uppercase',letterSpacing:'0.08em',fontWeight:600,marginTop:8}}>
              Configuración
            </div>
            {adminConfig.map(item => (
              <button key={item.href} onClick={() => router.push(item.href)}
                style={{
                  width:'100%', display:'flex', alignItems:'center', gap:10,
                  padding:'9px 14px', background: isActive(item.href) ? A.blueActive : 'none',
                  border:'none', textAlign:'left', fontSize:13, cursor:'pointer',
                  color: isActive(item.href) ? '#fff' : A.textLight,
                  fontWeight: isActive(item.href) ? 600 : 400,
                  borderLeft: isActive(item.href) ? `3px solid ${A.greenLime}` : '3px solid transparent',
                }}>
                <span style={{fontSize:14,width:18,textAlign:'center'}}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div style={{borderTop:'1px solid rgba(255,255,255,0.1)'}}>
        <button onClick={() => router.push('/perfil')}
          style={{width:'100%',padding:'11px 14px',background:'none',border:'none',color:A.textLight,fontSize:12,textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:8}}
          onMouseEnter={e=>{e.currentTarget.style.color='#fff';e.currentTarget.style.background=A.bluePale}}
          onMouseLeave={e=>{e.currentTarget.style.color=A.textLight;e.currentTarget.style.background='none'}}>
          <span>👤</span><span>Mi perfil / Contraseña</span>
        </button>
        <button onClick={logout}
          style={{width:'100%',padding:'11px 14px',background:'none',border:'none',color:A.textLight,fontSize:12,textAlign:'left',cursor:'pointer',display:'flex',alignItems:'center',gap:8,borderTop:'1px solid rgba(255,255,255,0.06)'}}
          onMouseEnter={e=>{e.currentTarget.style.color='#fff';e.currentTarget.style.background=A.bluePale}}
          onMouseLeave={e=>{e.currentTarget.style.color=A.textLight;e.currentTarget.style.background='none'}}>
          <span>⬅</span><span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
