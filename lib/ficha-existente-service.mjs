import { matriculaAnulada } from './anulacion-matricula.mjs'

// DATE llega del driver como Date (no como texto): normalizar SIEMPRE antes de
// comparar meses (misma lección que fechaIso10 de lib/operaciones.js).
const iso10 = (v) => (v == null || v === '' ? null : v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10))
const mesDe = (fecha) => (fecha ? fecha.slice(0, 7) : null)

// "Es este niño" (2026-10-01): el registro de la clase de prueba resultó ser
// un niño que YA tiene ficha en el centro. No nace ficha nueva; el niño queda
// donde el centro lo quiere, con los caminos que ya existen:
//   - Retirado: vuelve como REINCORPORADO (manual: NUEVO ≠ REINCORPORADO) con
//     reincorporarEstudiante en el grupo elegido (que valida la colocación).
//   - Vivo con otro grupo elegido: «Editar niño» con ese grupo
//     (actualizarEstudiante): primera colocación si no tiene venta (nace su
//     venta), traslado si ya la tenía (re-anclaje g1-9; si no hay semana
//     equivalente, el error sale tal cual).
//   - Sin venta todavía (pendiente puro): la colocación lleva en la MISMA
//     llamada la fecha de ficha elegida y, si la ficha no lo tiene, el origen
//     comercial del formulario. Así la corrección posterior de la venta solo
//     bloquea el mes de esa fecha y el de hoy (no el de la ficha vieja, que
//     puede estar cerrado) y la venta no nace «por clasificar».
//   - Fecha de venta: solo si el centro la eligió, con el MISMO camino del PR
//     #150 (actualizarEstudiante con fecha_inscripcion: cuatro periodos, CAS,
//     ancla). Nunca hacia un mes POSTERIOR al de su venta (eso es «Editar
//     niño», a conciencia).
//   - Al final se vincula el registro (crm_registration_id) si la ficha no
//     tiene uno: nunca se pisa otro registro.
// El paso de grupo va primero: si falla, no se tocó nada. Si después falla la
// fecha, el niño ya quedó en su grupo y la respuesta lo dice (ok con aviso).
// El caller autoriza el centro y lee la ficha DEL centro (con fecha_venta =
// evento canónico y origen_venta); las dependencias llegan inyectadas (mismo
// patrón que anularMatriculaEn).
export async function vincularFichaExistenteCon(
  { ficha, crmId, fechaVenta, grupoId, origenVenta },
  { moverAGrupo, corregirFechaVenta, reincorporar, vincularRegistro },
) {
  if (!ficha) return { error: 'La ficha no pertenece a este centro.' }
  if (matriculaAnulada(ficha)) {
    return { error: 'La matrícula de esa ficha está anulada: no se puede vincular. Si el niño vuelve, se inscribe como venta nueva.' }
  }

  const resultado = { ok: true, vinculado: false, aviso: null, reincorporado: false, movido: false, fechaCorregida: false }
  const fecha = iso10(fechaVenta)
  if (ficha.estado === 'retirado') {
    if (!grupoId) {
      return { error: 'Esa ficha está retirada: si vuelve es una reincorporación. Elige el grupo al que vuelve.' }
    }
    const r = await reincorporar(ficha.id, grupoId)
    if (r?.error) return { error: r.error }
    resultado.reincorporado = true
  } else {
    const ventaActual = iso10(ficha.fecha_venta)
    if (fecha && ventaActual && mesDe(fecha) > mesDe(ventaActual)) {
      return { error: `Su venta es del ${ventaActual}: para pasarla a un mes posterior usa «Editar niño».` }
    }
    if (grupoId && String(grupoId) !== String(ficha.grupo_id ?? '')) {
      const extra = {}
      if (!ventaActual) {
        if (fecha) extra.fecha_inscripcion = fecha
        if (!ficha.origen_venta && origenVenta) extra.origen_venta = origenVenta
      }
      const m = await moverAGrupo(ficha.id, grupoId, extra)
      if (m?.error) return { error: m.error }
      resultado.movido = true
    }
    if (fecha) {
      const c = await corregirFechaVenta(ficha.id, fecha)
      if (c?.error && !resultado.movido) return { error: c.error }
      if (c?.error) resultado.aviso = `Quedó en el grupo, pero su fecha de venta no se pudo corregir: ${c.error} Corrígela con «Editar niño».`
      else resultado.fechaCorregida = true
    }
  }

  const actual = ficha.crm_registration_id == null ? null : String(ficha.crm_registration_id).trim() || null
  const avisos = resultado.aviso ? [resultado.aviso] : []
  if (crmId && actual === crmId) {
    resultado.vinculado = true
  } else if (crmId && actual) {
    avisos.push('La ficha ya estaba vinculada a otro registro de clase de prueba; se dejó el que tenía.')
  } else if (crmId) {
    const r = await vincularRegistro(ficha.id, crmId)
    if (r?.ok) resultado.vinculado = true
    else if (r?.yaUsado) avisos.push('Ese registro de la clase de prueba ya está vinculado a otra ficha del centro.')
    else avisos.push('La ficha cambió mientras la vinculabas: recarga para ver su estado.')
  }
  resultado.aviso = avisos.length ? avisos.join(' ') : null
  return resultado
}
