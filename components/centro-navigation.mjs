import { rolesQueFirma, tienePlanPropio } from '../lib/entrenamiento/oficio/progreso.js'

export function hrefKpiMensual(path) {
  const match = typeof path === 'string' && path.match(/^\/centro\/([^/]+)\/(?:kpi|cumplimiento|foda|historial)(?:\/|$)/)
  return match ? `/centro/${match[1]}/kpi` : null
}

export function seccionesCentro(centroId, section = 'kpi', rol = null) {
  if (!centroId) return []
  const base = `/centro/${centroId}`
  if (section === 'kpi') return [
    { label: 'KPI Mensual', href: `${base}/kpi` },
    { label: 'Cumplimiento', href: `${base}/cumplimiento` },
    { label: 'FODA', href: `${base}/foda` },
    { label: 'Historial', href: `${base}/historial` },
  ]
  if (section !== 'entrenamiento' || !rol) return []
  const plan = tienePlanPropio(rol)
  const firma = rolesQueFirma(rol).length > 0
  if (!plan && !firma) return []
  return [
    { label: 'Entrenamiento', href: `${base}/entrenamiento` },
    { label: plan ? 'Mi plan de puesto' : 'Planes de puestos', href: `${base}/entrenamiento/oficio` },
    ...(firma ? [{ label: 'Firmas de maniobra', href: `${base}/entrenamiento/firmas` }] : []),
  ]
}
