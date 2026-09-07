'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getNavigationContext } from '../app/actions/navigation'
import { contadorFirmas } from '../app/actions/entrenamiento-oficio'
import { rolesQueFirma } from '../lib/entrenamiento/oficio/progreso'
import { seccionesCentro } from './centro-navigation.mjs'

export default function CentroNavigation({ centroId, section = 'kpi' }) {
  const path = usePathname()
  const [rol, setRol] = useState(null)
  const [firmas, setFirmas] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (section !== 'entrenamiento') return
    let active = true
    setRol(null); setFirmas(0); setError(false)
    getNavigationContext().then(async (context) => {
      if (!active) return
      const role = context?.actor?.role
      setRol(role)
      if (rolesQueFirma(role).length) {
        const result = await contadorFirmas(Number(centroId)).catch(() => null)
        if (active) setFirmas(result?.n || 0)
      }
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [centroId, section])

  const links = seccionesCentro(centroId, section, rol)
  const current = links.filter(({ href }) => path === href || path.startsWith(`${href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <nav className="section-navigation" aria-label={section === 'kpi' ? 'Secciones de KPI Mensual' : 'Secciones de Entrenamiento'}
      aria-busy={section === 'entrenamiento' && !rol && !error}>
      {links.map(({ label, href }) => (
        <Link key={href} href={href} aria-current={href === current ? 'page' : undefined}
          className={`btn${href === current ? ' btn--primary' : ''}`}>
          {label}{href.endsWith('/firmas') && firmas > 0 && <span className="sb__badge">{firmas}</span>}
        </Link>
      ))}
      {error && <p role="status" className="h-sub">No se pudieron cargar las secciones de Entrenamiento. Recarga la página.</p>}
    </nav>
  )
}
