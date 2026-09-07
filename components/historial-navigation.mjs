export const HISTORIAL_HREF = '/dashboard/historial'

const SECCIONES = [
  { label: 'Historial', href: HISTORIAL_HREF },
  { label: 'Metas', href: '/dashboard/metas', capability: 'viewMetas' },
  { label: 'Alertas', href: '/dashboard/alertas' },
  { label: 'Reportes', href: '/dashboard/reporte' },
]

export function esRutaHistorial(path) {
  return typeof path === 'string' && SECCIONES.some(({ href }) => path === href || path.startsWith(`${href}/`))
}

export function seccionesHistorial(context) {
  if (!['admin_general', 'supervisor', 'coordinador'].includes(context?.actor?.role)) return []
  return SECCIONES.filter(({ capability }) => !capability || context?.capabilities?.[capability] === true)
}
