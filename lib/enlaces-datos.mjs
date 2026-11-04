export const validPeriod = value => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ''))
export const fichaHref = (id, ficha, accion = 'editar') => `/centro/${id}/grupos?ficha=${ficha}&accion=${accion}`
export const kpiHref = (id, period, section = 'saldo') => {
  if (!validPeriod(period)) return `/centro/${id}/kpi`
  const [year, month] = period.split('-')
  return `/centro/${id}/kpi?year=${year}&month=${Number(month)}&revision=${section}#kpi-${section}`
}
export const revisionHref = (id, problema, periodo) => `/centro/${id}/revision-datos?problema=${encodeURIComponent(problema)}${validPeriod(periodo) ? `&periodo=${periodo}` : ''}`

