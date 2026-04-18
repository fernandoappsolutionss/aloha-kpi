'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Sidebar({ rol, centroNombre, centroId }) {
  const router = useRouter()
  const path = usePathname()
  const isAdmin = rol === 'admin_general' || rol === 'supervisor'
  const [centros, setCentros] = useState([])

  useEffect(() => {
    if (isAdmin) {
      supabase.from('centros').select('id, nombre').order('nombre').then(({ data }) => {
        if (data) setCentros(data)
      })
    }
  }, [isAdmin])

  const adminItems = [
    { label: 'Todos los centros', icon: '🏠', href: '/dashboard' },
    { label: 'Ranking centros', icon: '🏆', href: '/dashboard/ranking' },
    { label: 'Alertas', icon: '🔔', href: '/dashboard/alertas' },
    { label: 'Historial', icon: '📅', href: '/dashboard/historial' },
    { label: 'Reporte trimestral', icon: '📄', href: '/dashboard/reporte' },
    { label: 'Metas globales', icon: '⚙', href: '/dashboard/metas' },
    { label: 'Usuarios y centros', icon: '👤', href: '/dashboard/usuarios' },
  ]

  const centroItems = [
    { label: 'Resumen', icon: '📊', href: `/centro/${centroId}` },
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

  return (
    <aside style={styles.sidebar}>
      <div style={styles.logo}>
        <span style={styles.logoText}>ALOHA KPI</span>
        <span style={styles.logoBadge}>{isAdmin ? 'Admin General' : centroNombre}</span>
      </div>

      <nav style={styles.nav}>
        {isAdmin && <div style={styles.section}>Panel</div>}
        {!isAdmin && <div style={styles.section}>Mi Centro</div>}

        {items.map(item => {
          const active = path === item.href
          return (
            <button key={item.href} onClick={() => router.push(item.href)}
              style={{ ...styles.navItem, ...(active ? styles.navActive : {}) }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          )
        })}

        {isAdmin && centros.length > 0 && (
          <>
            <div style={styles.section}>Centros</div>
            {centros.map(c => {
              const active = path.startsWith(`/centro/${c.id}`)
              return (
                <button key={c.id} onClick={() => router.push(`/centro/${c.id}`)}
                  style={{ ...styles.navItemSm, ...(active ? { color: '#533AB7', fontWeight: 600 } : {}) }}>
                  <span style={styles.dot}></span>
                  {c.nombre.split(' ').slice(0, 2).join(' ')}
                </button>
              )
            })}
          </>
        )}
      </nav>

      <div style={styles.footer}>
        <button onClick={() => router.push('/perfil')}
          style={{ ...styles.footerBtn, borderBottom: '0.5px solid #e8e8e4' }}>
          👤 Mi perfil / Contraseña
        </button>
        <button onClick={logout} style={styles.footerBtn}>
          ⬅ Cerrar sesión
        </button>
      </div>
    </aside>
  )
}

const styles = {
  sidebar: { width: 210, background: '#fff', borderRight: '0.5px solid #e8e8e4', display: 'flex', flexDirection: 'column', minHeight: '100vh', flexShrink: 0 },
  logo: { padding: '20px 16px 16px', borderBottom: '0.5px solid #e8e8e4' },
  logoText: { display: 'block', fontSize: 15, fontWeight: 700, color: '#533AB7', letterSpacing: 1 },
  logoBadge: { display: 'block', fontSize: 10, color: '#888', marginTop: 3 },
  nav: { flex: 1, padding: '8px 0', overflowY: 'auto' },
  section: { fontSize: 10, color: '#aaa', padding: '12px 16px 4px', textTransform: 'uppercase', letterSpacing: '0.06em' },
  navItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'none', border: 'none', textAlign: 'left', fontSize: 12.5, color: '#555', borderLeft: '2px solid transparent', cursor: 'pointer' },
  navActive: { background: '#EEEDFE', color: '#533AB7', fontWeight: 600, borderLeftColor: '#533AB7' },
  navItemSm: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '6px 16px 6px 24px', background: 'none', border: 'none', textAlign: 'left', fontSize: 11.5, color: '#888', cursor: 'pointer' },
  dot: { width: 6, height: 6, borderRadius: 3, background: '#AFA9EC', flexShrink: 0 },
  footer: { borderTop: '0.5px solid #e8e8e4' },
  footerBtn: { width: '100%', padding: '11px 16px', background: 'none', border: 'none', color: '#888', fontSize: 12, textAlign: 'left', cursor: 'pointer' },
}
