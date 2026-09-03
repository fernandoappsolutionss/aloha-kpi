'use client'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { getNavigationContext } from '../app/actions/navigation'
import { logout as logoutAction } from '../app/actions/auth'
import { resumenProgreso } from '../app/actions/entrenamiento'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

/* Inline stroke icons (no emojis) */
const P = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' }
function Icon({ name }) {
  switch (name) {
    case 'grid': return <svg viewBox="0 0 24 24" {...P}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
    case 'trophy': return <svg viewBox="0 0 24 24" {...P}><path d="M6 4h12v4a6 6 0 0 1-12 0V4Z" /><path d="M6 6H4a2 2 0 0 0 0 4h2M18 6h2a2 2 0 0 1 0 4h-2" /><path d="M10 14.5V18M14 14.5V18M8 20h8" /></svg>
    case 'bell': return <svg viewBox="0 0 24 24" {...P}><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>
    case 'calendar': return <svg viewBox="0 0 24 24" {...P}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>
    case 'doc': return <svg viewBox="0 0 24 24" {...P}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M9 13h6M9 17h6" /></svg>
    case 'target': return <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>
    case 'building': return <svg viewBox="0 0 24 24" {...P}><rect x="4" y="3" width="16" height="18" rx="1" /><path d="M9 8h.01M15 8h.01M9 12h.01M15 12h.01M10 21v-3h4v3" /></svg>
    case 'users': return <svg viewBox="0 0 24 24" {...P}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13A4 4 0 0 1 16 11" /></svg>
    case 'edit': return <svg viewBox="0 0 24 24" {...P}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4Z" /></svg>
    case 'check': return <svg viewBox="0 0 24 24" {...P}><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
    case 'search': return <svg viewBox="0 0 24 24" {...P}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
    case 'user': return <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
    case 'groups': return <svg viewBox="0 0 24 24" {...P}><circle cx="12" cy="7" r="3" /><path d="M7 21v-1a5 5 0 0 1 10 0v1" /><circle cx="4.5" cy="9.5" r="2" /><path d="M1 19v-.5A3.5 3.5 0 0 1 4.5 15" /><circle cx="19.5" cy="9.5" r="2" /><path d="M23 19v-.5a3.5 3.5 0 0 0-3.5-3.5" /></svg>
    case 'sheet': return <svg viewBox="0 0 24 24" {...P}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M4 9h16M4 15h16M12 9v12" /></svg>
    case 'logout': return <svg viewBox="0 0 24 24" {...P}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
    case 'shield': return <svg viewBox="0 0 24 24" {...P}><path d="M12 2 4 5v6c0 5 3.5 8 8 11 4.5-3 8-6 8-11V5Z" /></svg>
    case 'book': return <svg viewBox="0 0 24 24" {...P}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" /></svg>
    case 'chevron': return <svg viewBox="0 0 24 24" {...P}><polyline points="6 9 12 15 18 9" /></svg>
    default: return null
  }
}

export default function Sidebar({ rol, centroNombre, centroId }) {
  const router = useRouter()
  const path = usePathname()
  const isAdmin = rol === 'admin_general' || rol === 'supervisor'
  const [centrosOpen, setCentrosOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [context, setContext] = useState(null)

  useEffect(() => {
    let mounted = true
    getNavigationContext()
      .then((data) => { if (mounted) setContext(data) })
      .catch(() => { if (mounted) setContext(null) })
      .finally(() => { if (mounted) setLoading(false) })
    return () => {
      mounted = false
    }
  }, [])

  const centros = context?.centers || []
  const esCoordinador = context?.actor.role === 'coordinador'

  const [ent, setEnt] = useState(null) // { completados, total } | null (gerencia no se entrena)
  useEffect(() => {
    if (loading || !context || isAdmin || !centroId || context.capabilities.viewUsers) return
    resumenProgreso().then((res) => { if (res && !res.error) setEnt(res) }).catch(() => {})
  }, [loading, context, isAdmin, centroId])

  const adminItems = [
    { label: 'Panel general', icon: 'grid', href: '/dashboard' },
    { label: 'Crecimiento', icon: 'target', href: '/dashboard/crecimiento' },
    { label: 'Ranking', icon: 'trophy', href: '/dashboard/ranking' },
    { label: 'Alertas', icon: 'bell', href: '/dashboard/alertas' },
    { label: 'Historial', icon: 'calendar', href: '/dashboard/historial' },
    { label: 'Reporte', icon: 'doc', href: '/dashboard/reporte' },
    ...(context?.capabilities.viewMetas ? [{ label: 'Metas', icon: 'target', href: '/dashboard/metas' }] : []),
    ...(context?.capabilities.viewAdminTraining ? [{ label: 'Entrenamiento', icon: 'book', href: '/dashboard/entrenamiento' }] : []),
  ]
  const configItems = [
    ...(context?.capabilities.viewCenters ? [{ label: 'Gestión centros', icon: 'building', href: '/dashboard/centros' }] : []),
    ...(context?.capabilities.viewUsers ? [{ label: 'Usuarios', icon: 'users', href: '/dashboard/usuarios' }] : []),
  ]
  const centroItems = [
    { label: 'Resumen', icon: 'grid', href: `/centro/${centroId}`, tour: 'nav.resumen' },
    { label: 'Ruta de Nivel', icon: 'target', href: `/centro/${centroId}/ruta-nivel`, tour: 'nav.ruta' },
    { label: 'KPI Semanal', icon: 'edit', href: `/centro/${centroId}/kpi`, tour: 'nav.kpi' },
    { label: 'Grupos y Fusiones', icon: 'groups', href: `/centro/${centroId}/grupos`, tour: 'nav.grupos' },
    { label: 'Cuadro de Negocio', icon: 'sheet', href: `/centro/${centroId}/cuadro`, tour: 'nav.cuadro' },
    { label: 'Clases de Prueba', icon: 'calendar', href: `/centro/${centroId}/eventos`, tour: 'nav.eventos' },
    { label: 'Cumplimiento', icon: 'check', href: `/centro/${centroId}/cumplimiento` },
    { label: 'FODA', icon: 'search', href: `/centro/${centroId}/foda` },
    { label: 'Historial', icon: 'calendar', href: `/centro/${centroId}/historial` },
    { label: 'Entrenamiento', icon: 'book', href: `/centro/${centroId}/entrenamiento`, tour: 'nav.entrenamiento', badge: ent && ent.completados < ent.total ? `${ent.completados}/${ent.total}` : null },
  ]
  const items = isAdmin ? adminItems : centroItems

  async function logout() {
    try { await logoutAction() } catch {}
    localStorage.clear()
    router.push('/login')
  }
  const isActive = (href) => path === href

  return (
    <aside className="sb">
      {/* Brand */}
      <div className="sb__brand">
        <Logo size={40} />
        <div className="sb__role">
          <span style={{ width: 14, height: 14, color: 'var(--ts-green)' }}><Icon name={isAdmin ? 'shield' : 'building'} /></span>
          <span className="label">{isAdmin ? (esCoordinador ? 'Coordinador Operativo' : 'Administrador') : (centroNombre || 'Centro')}</span>
        </div>
      </div>

      <nav className="sb__nav">
        <div className="sb__section label">{isAdmin ? 'Panel' : 'Mi centro'}</div>
        {items.map(item => (
          <button key={item.href} onClick={() => router.push(item.href)} title={item.label} data-tour={item.tour}
            className={`sb__item${isActive(item.href) ? ' sb__item--active' : ''}`}>
            <Icon name={item.icon} /><span>{item.label}</span>
            {item.badge && <span className="sb__badge">{item.badge}</span>}
          </button>
        ))}

        {/* Centros expandible (admin) */}
        {isAdmin && centros.length > 0 && (
          <>
            <button onClick={() => setCentrosOpen(!centrosOpen)} className="sb__item">
              <Icon name="building" /><span>Ir a centro</span>
              <span className="sb__chev" style={{ transform: centrosOpen ? 'rotate(180deg)' : 'none' }}><Icon name="chevron" /></span>
            </button>
            {centrosOpen && centros.map(c => {
              const active = path.startsWith(`/centro/${c.id}`)
              return (
                <button key={c.id} onClick={() => router.push(`/centro/${c.id}`)} title={c.nombre}
                  className={`sb__item sb__sub${active ? ' sb__item--active' : ''}`}>
                  <span style={{ width: 5, height: 5, borderRadius: 3, background: active ? 'var(--ts-green)' : 'var(--text-faint)', flexShrink: 0 }} />
                  <span>{c.nombre.length > 18 ? c.nombre.split(' ').slice(0, 2).join(' ') : c.nombre}</span>
                </button>
              )
            })}
          </>
        )}

        {isAdmin && configItems.length > 0 && (
          <>
            <div className="sb__section label" style={{ marginTop: 6 }}>Configuración</div>
            {configItems.map(item => (
              <button key={item.href} onClick={() => router.push(item.href)} title={item.label}
                className={`sb__item${isActive(item.href) ? ' sb__item--active' : ''}`}>
                <Icon name={item.icon} /><span>{item.label}</span>
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sb__foot">
        <ThemeToggle />
        <button onClick={() => router.push('/perfil')} className={`sb__item${isActive('/perfil') ? ' sb__item--active' : ''}`}>
          <Icon name="user" /><span>Mi perfil</span>
        </button>
        <button onClick={logout} className="sb__item">
          <Icon name="logout" /><span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  )
}
