'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getNavigationContext } from '../app/actions/navigation'
import { contadorFirmas } from '../app/actions/entrenamiento-oficio'
import { rolesQueFirma } from '../lib/entrenamiento/oficio/progreso'
import { isReadonlyGlobalRole } from './access-control.mjs'
import { seccionesCentro } from './centro-navigation.mjs'

export default function CentroNavigation({ centroId, section = 'kpi' }) {
  const path = usePathname()
  const [rol, setRol] = useState(null)
  const [firmas, setFirmas] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (section !== 'entrenamiento') return
    let active = true
    setError(false)
    // `path` en las dependencias: el badge se vuelve a pedir al navegar (p. ej.
    // tras firmar en la cola). No se resetea `rol`: sin él seccionesCentro
    // devuelve [] y los enlaces parpadeaban en cada navegación.
    getNavigationContext().then(async (context) => {
      if (!active) return
      const role = context?.actor?.role
      setRol(role)
      const result = !isReadonlyGlobalRole(role) && rolesQueFirma(role).length
        ? await contadorFirmas(Number(centroId)).catch(() => null)
        : null
      if (active) setFirmas(result?.n || 0)
    }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [centroId, section, path])

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
