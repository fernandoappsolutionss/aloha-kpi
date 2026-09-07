'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { getNavigationContext } from '../app/actions/navigation'
import { seccionesHistorial } from './historial-navigation.mjs'

export default function HistorialNavigation() {
  const path = usePathname()
  const [context, setContext] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    getNavigationContext()
      .then((data) => { if (active) setContext(data) })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [])

  return (
    <nav className="historial-navigation" aria-label="Secciones de Historial" aria-busy={!context && !error}>
      {seccionesHistorial(context).map(({ label, href }) => {
        const active = path === href || path.startsWith(`${href}/`)
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined}
            className={`btn${active ? ' btn--primary' : ''}`}>
            {label}
          </Link>
        )
      })}
      {error && <p role="status" className="h-sub">No se pudieron cargar las secciones de Historial. Recarga la página.</p>}
    </nav>
  )
}
