import { matriculaAnulada } from './anulacion-matricula.mjs'
import { colocacionInvalida } from './colocacion.mjs'

const mesDe = (fecha) => (fecha ? String(fecha).slice(0, 7) : null)

// "Es este niño" (2026-10-01): el registro de la clase de prueba resultó ser
// un niño que YA tiene ficha en el centro. No nace ficha nueva; el niño queda
// donde el centro lo quiere, con los caminos que ya existen:
//   - Retirado: vuelve como REINCORPORADO (manual: NUEVO ≠ REINCORPORADO) con
//     reincorporarEstudiante en el grupo elegido, si la colocación es válida
//     (la reincorporación de Grupos no la valida: un Tiny no entra a Kids).
//   - Vivo con otro grupo elegido: «Editar niño» con ese grupo
//     (actualizarEstudiante): primera colocación si estaba pendiente (nace su
//     venta), traslado si ya tenía grupo (re-anclaje g1-9; si no hay semana
//     equivalente, el error sale tal cual).
//   - Fecha de venta: solo si el centro la eligió, con el MISMO camino del PR
//     #150 (actualizarEstudiante con fecha_inscripcion: cuatro periodos, CAS,
//     ancla). Nunca hacia un mes POSTERIOR al de su venta (eso es «Editar
//     niño», a conciencia).
//   - Al final se vincula el registro (crm_registration_id) si la ficha no
//     tiene uno: nunca se pisa otro registro.
// El paso de grupo va primero: si falla, no se tocó nada. Si después falla la
// fecha, el niño ya quedó en su grupo y la respuesta lo dice (ok con aviso).
// El caller autoriza el centro, lee la ficha DEL centro (con fecha_venta =
// evento canónico) y el grupo destino DEL centro; las dependencias llegan
// inyectadas (mismo patrón que anularMatriculaEn).
export async function vincularFichaExistenteCon(
  { ficha, crmId, fechaVenta, grupoId, grupoDestino },
  { moverAGrupo, corregirFechaVenta, reincorporar, vincularRegistro },
) {
  if (!ficha) return { error: 'La ficha no pertenece a este centro.' }
  if (matriculaAnulada(ficha)) {
    return { error: 'La matrícula de esa ficha está anulada: no se puede vincular. Si el niño vuelve, se inscribe como venta nueva.' }
  }
  if (grupoId && !grupoDestino) return { error: 'El grupo no pertenece a este centro.' }

  const resultado = { ok: true, vinculado: false, aviso: null, reincorporado: false, movido: false, fechaCorregida: false }
  if (ficha.estado === 'retirado') {
    if (!grupoId) {
      return { error: 'Esa ficha está retirada: si vuelve es una reincorporación. Elige el grupo al que vuelve.' }
    }
    const errorColocacion = colocacionInvalida({ itinerario: ficha.itinerario, nivel: ficha.nivel }, grupoDestino.itinerario)
    if (errorColocacion) return { error: errorColocacion }
    const r = await reincorporar(ficha.id, grupoId)
    if (r?.error) return { error: r.error }
    resultado.reincorporado = true
  } else {
    const ventaActual = ficha.fecha_venta ? String(ficha.fecha_venta).slice(0, 10) : null
    if (fechaVenta && ventaActual && mesDe(fechaVenta) > mesDe(ventaActual)) {
      return { error: `Su venta es del ${ventaActual}: para pasarla a un mes posterior usa «Editar niño».` }
    }
    if (grupoId && String(grupoId) !== String(ficha.grupo_id ?? '')) {
      const m = await moverAGrupo(ficha.id, grupoId)
      if (m?.error) return { error: m.error }
      resultado.movido = true
    }
    if (fechaVenta) {
      const c = await corregirFechaVenta(ficha.id, fechaVenta)
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
