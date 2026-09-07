import { rolesQueFirma, tienePlanPropio } from '../lib/entrenamiento/oficio/progreso.js'
import { isMasterRole, isReadonlyGlobalRole } from './access-control.mjs'

export function hrefKpiMensual(path) {
  const match = typeof path === 'string' && path.match(/^\/centro\/([^/]+)\/(?:kpi|cumplimiento|encuestas|foda|historial)(?:\/|$)/)
  return match ? `/centro/${match[1]}/kpi` : null
}

export function seccionesCentro(centroId, section = 'kpi', rol = null) {
  if (!centroId) return []
  const base = `/centro/${centroId}`
  if (section === 'kpi') return [
    { label: 'KPI Mensual', href: `${base}/kpi` },
    { label: 'Cumplimiento', href: `${base}/cumplimiento` },
    { label: 'Encuestas', href: `${base}/encuestas` },
    { label: 'FODA', href: `${base}/foda` },
    { label: 'Historial', href: `${base}/historial` },
  ]
  if (section !== 'entrenamiento' || !rol) return []
  if (isReadonlyGlobalRole(rol)) return [
    { label: 'Entrenamiento', href: `${base}/entrenamiento` },
  ]
  if (isMasterRole(rol)) return [
    { label: 'Entrenamiento', href: `${base}/entrenamiento` },
    { label: 'Planes de puestos', href: `${base}/entrenamiento/oficio` },
    { label: 'Firmas de maniobra', href: `${base}/entrenamiento/firmas` },
  ]
  const plan = tienePlanPropio(rol)
  const firma = rolesQueFirma(rol).length > 0
  if (!plan && !firma) return []
  return [
    { label: 'Entrenamiento', href: `${base}/entrenamiento` },
    { label: plan ? 'Mi plan de puesto' : 'Planes de puestos', href: `${base}/entrenamiento/oficio` },
    ...(firma ? [{ label: 'Firmas de maniobra', href: `${base}/entrenamiento/firmas` }] : []),
  ]
}
