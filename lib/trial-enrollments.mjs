// El origen técnico de la venta manda; un vínculo CRM solo respalda ventas
// sin origen. No confundirlo con origen_venta (referido, marketing, etc.).
export function classifyTrialSales(sales = []) {
  let trialEnrollments = 0
  let directSales = 0
  let unknownSales = 0
  let crmFallbackCount = 0
  for (const sale of sales) {
    const origin = String(sale.origen || '').toLowerCase()
    if (origin === 'traslado') continue
    if (origin === 'clase_prueba') trialEnrollments += 1
    else if (origin === 'directo') directSales += 1
    else if (sale.crm_registration_id) {
      trialEnrollments += 1
      crmFallbackCount += 1
    } else unknownSales += 1
  }
  const classifiedSales = trialEnrollments + directSales
  const totalSales = classifiedSales + unknownSales
  return {
    totalSales, classifiedSales, trialEnrollments, directSales, unknownSales,
    crmFallbackCount, coverage: totalSales ? classifiedSales / totalSales : 1,
    reliable: unknownSales === 0,
  }
}
