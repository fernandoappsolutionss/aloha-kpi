'use client'
import { useRouter, usePathname } from 'next/navigation'
export default function Sidebar({ rol, centroNombre, centroId }) {
  const router = useRouter()
  const path = usePathname()
  const isAdmin = rol === 'admin_general' || rol === 'supervisor'
  const adminItems = [
    { label: 'Todos los centros', icon: '🏠', href: '/dashboard' },
    { label: 'Ranking centros', icon: '🏆', href: '/dashboard/ranking' },
    { label: 'Alertas', icon: '🔔', href: '/dashboard/alertas' },
    { label: 'Reporte trimestral', icon: '📄', href: '/dashboard/reporte' },
    { label: 'Metas globales', icon: '⚙', href: '/dashboard/metas' },
    { label: 'Usuarios y centros', icon: '👤', href: '/dashboard/usuarios' },
  ]
  const centroItems = [
    { label: 'Resumen', icon: '📊', href: `/centro/${centroId}` },
    { label: 'KPI Semanal', icon: '📝', href: `/centro/${centroId}/kpi` },
    { label: 'Cumplimiento', icon: '✅', href: `/centro/${centroId}/cumplimiento` },
    { label: 'FODA', icon: '🔍', href: `/centro/${centroId}/foda` },
  ]
  const items = isAdmin ? adminItems : centroItems
  function logout() { localStorage.clear(); router.push('/login') }
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
        {isAdmin && (
          <>
            <div style={styles.section}>Centros</div>
            {['BRISAS DEL GOLF','ANCLAS MALL','CALLE 50','COSTA DEL ESTE','DAVID'].map(c => (
              <button key={c} onClick={() => router.push(`/centro/demo?nombre=${encodeURIComponent(c)}`)}
                style={styles.navItemSm}>
                <span style={styles.dot}></span>{c.split(' ').slice(0,2).join(' ')}
              </button>
            ))}
          </>
        )}
      </nav>
      <button onClick={logout} style={styles.logout}>⬅ Cerrar sesión</button>
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
  logout: { padding: '14px 16px', background: 'none', border: 'none', borderTop: '0.5px solid #e8e8e4', color: '#aaa', fontSize: 12, textAlign: 'left', cursor: 'pointer' },
}
