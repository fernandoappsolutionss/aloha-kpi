// Catálogo de lectura: el sentido pertenece a la estadística, no al tipo de gráfico.
export const COMPARATIVA_HCA = [
  { id: 'captacion', titulo: 'Origen de nuevos ingresos', descripcion: 'Cantidad mensual por canal. La participación corresponde al total del rango visible.', series: [
    { campo: 'orig_referido', titulo: 'Ingresos por referidos', unidad: 'niños' },
    { campo: 'orig_marketing', titulo: 'Ingresos por marketing', unidad: 'niños' },
    { campo: 'orig_centro', titulo: 'Ingresos por el centro', unidad: 'niños' },
    { campo: 'orig_activaciones', titulo: 'Ingresos por activaciones', unidad: 'niños' },
  ] },
  { id: 'retiros', titulo: 'Motivos de deserción', descripcion: 'Cada motivo se lee como estadística inversa: menos retiros es mejor.', series: [
    { campo: 'mot_perdida_clase', titulo: 'Retiros por pérdida de clases', unidad: 'retiros', inversa: true },
    { campo: 'mot_economico', titulo: 'Retiros por motivo económico', unidad: 'retiros', inversa: true },
    { campo: 'mot_tecnica', titulo: 'Retiros por técnica', unidad: 'retiros', inversa: true },
    { campo: 'mot_horario', titulo: 'Retiros por horario', unidad: 'retiros', inversa: true },
  ] },
  { id: 'clase-prueba', titulo: 'Clase de prueba', descripcion: 'Invitados, asistentes y matriculados se comparan con la misma etapa de los meses anteriores.', base: 'cp_invitados', series: [
    { campo: 'cp_invitados', titulo: 'Invitados a clase de prueba', unidad: 'invitados' },
    { campo: 'cp_asistieron', titulo: 'Asistentes a clase de prueba', unidad: 'asistentes' },
    { campo: 'cp_matriculados', titulo: 'Matriculados de clase de prueba', unidad: 'matriculados' },
  ] },
  { id: 'grupos', titulo: 'Capacidad operativa', descripcion: 'La cantidad de grupos se interpreta junto con su ocupación y rentabilidad.', series: [
    { campo: 'grupos_activos', titulo: 'Grupos activos por mes', unidad: 'grupos', contextual: true },
  ] },
]
export const CUADRO_HCA = [
  { campo: 'cuadro_aPagar', titulo: 'Niños a pagar al cierre', unidad: 'niños' },
  { campo: 'cuadro_nuevos', titulo: 'Nuevos activos del cuadro', unidad: 'niños' },
  { campo: 'cuadro_retirados', titulo: 'Retiros del cuadro', unidad: 'retiros', inversa: true },
  { campo: 'cuadro_royalty', titulo: 'Royalty mensual', unidad: 'USD', contextual: true, descripcion: 'Importe del cuadro cerrado. Su variación depende de los niños sujetos a royalty y la tarifa; no mide por sí sola la rentabilidad.' },
]
export function numeroRegistrado(value) {
  return value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value)
}
export function resumenComparativo(rows, grupo, campo) {
  const campos = grupo.series.map(s => s.campo)
  const meses = rows.map(r => Number(r.year) * 12 + Number(r.month)).sort((a,b) => a-b)
  const continuo = meses.every((mes,i) => !i || mes === meses[i-1] + 1)
  const completo = rows.length > 0 && continuo && rows.every(r => campos.every(k => numeroRegistrado(r[k]) != null))
  const total = rows.reduce((sum,r) => sum + (numeroRegistrado(r[campo]) ?? 0), 0)
  const base = rows.reduce((sum,r) => sum + (grupo.base ? (numeroRegistrado(r[grupo.base]) ?? 0) : campos.reduce((n,k) => n + (numeroRegistrado(r[k]) ?? 0),0)),0)
  return { total: rows.some(r => numeroRegistrado(r[campo]) != null) ? total : null, completo, porcentaje: completo && campos.length > 1 && base > 0 ? total / base * 100 : null }
}
// Solo fotos congeladas: jamás promover un cuadro vivo a cierre histórico.
export function mesesConCuadro(meses) {
  return meses.filter(m => m.cuadro && !m.cuadro.vivo).map(m => ({ ...m, estado: 'cerrado' }))
}
