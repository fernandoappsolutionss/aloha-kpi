import { campoKpiDeMotivo } from './kpi-auto.mjs'
import {
  ERROR_RETIRO_CAMBIO, detalleConCorreccion, evaluarCorreccionMotivo, nombreMes, validarRazonCorreccion,
} from './retiros.mjs'

// Corrección del motivo del retiro VIGENTE, sin evento nuevo: el evento
// 'retiro' y la ficha cambian juntos, bajo el candado del mes del retiro.
// El caller autoriza centro/usuario (requireCurrentWriteCentro) y abre una
// transacción SERIALIZABLE. Las dependencias se reciben para probar que
// ninguna negación escribe.
//
// Concurrencia: la primera lectura fija el snapshot. Toda escritura de retiro
// o reincorporación actualiza la ficha, así que si otra transacción la cambió
// después, el FOR UPDATE de la ficha lanza 40001 (el caller lo traduce). La
// re-evaluación tras los locks es defensa, no el camino real.
// Leer kpi_auto_ajustes y resumen_mes aquí adentro es a propósito (SSI): o la
// corrección ve lo que un Guardar del mismo mes escribió, o uno de los dos
// aborta con 40001 y se reintenta. Sin esa lectura, un Guardar solapado podría
// congelar un ajuste con el motivo viejo. Solo se leen cuando el motivo cambia
// de campo del KPI: dentro de «Otro» no hay número que proteger.

const ETIQUETA_CAMPO = {
  mot_tecnica: 'Técnica',
  mot_perdida_clase: 'Pérdida de clases',
  mot_economico: 'Económico',
  mot_horario: 'Horario',
  mot_graduado: 'Graduado',
  mot_otro: 'Otro',
}

const idValido = (v) => Number.isSafeInteger(Number(v)) && Number(v) > 0
const enteroNoNegativo = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 0
}
const capital = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1)

// `ajustes` es JSONB: el driver lo entrega como objeto; se tolera texto JSON.
// Cualquier otra cosa ⇒ null y el caller frena: no se razona con lo ilegible.
function leerAjustes(valor) {
  let ajustes = valor
  if (typeof ajustes === 'string') {
    try { ajustes = JSON.parse(ajustes) } catch { return null }
  }
  return ajustes && typeof ajustes === 'object' && !Array.isArray(ajustes) ? ajustes : null
}

function respuestaSinCambios({ evento, periodo, eventoCambio, otrosRetirosMismoMes }) {
  return {
    ok: true,
    sinCambios: true,
    eventoId: Number(evento.id),
    eventoCambio,
    motivo: evento.motivo ?? null,
    year: periodo.year,
    month: periodo.month,
    otrosRetirosMismoMes,
  }
}

export async function corregirMotivoRetiroEn(query, {
  centroId, estudianteId, motivo, razon, eventoIdEsperado, motivoEsperado, actor = {}, ahora,
}, { bloquearMesesEditables }) {
  if (!idValido(centroId) || !idValido(estudianteId)) return { error: 'Solicitud inválida: recarga la pantalla.' }
  const centro = Number(centroId)
  const estudiante = Number(estudianteId)
  const errorRazon = validarRazonCorreccion(razon)
  if (errorRazon) return { error: errorRazon }
  const pedido = { centroId: centro, motivo, eventoIdEsperado, motivoEsperado }

  // 1. Lectura previa, sin lock: el periodo del retiro decide qué mes se
  //    bloquea (orden del repo: mes_kpi → estudiantes).
  const [ficha] = await query`SELECT * FROM estudiantes WHERE id = ${estudiante} AND centro_id = ${centro}`
  const eventos = await query`
    SELECT * FROM estudiante_eventos
    WHERE estudiante_id = ${estudiante} AND tipo IN ('retiro', 'reincorporacion')
    ORDER BY id
  `
  const previa = evaluarCorreccionMotivo({ ficha, eventos, ...pedido })
  if (previa.error) return { error: previa.error }
  // Reintento de una corrección que ya se guardó: nada que bloquear ni escribir.
  if (previa.sinCambios) return respuestaSinCambios(previa)
  const { evento, periodo } = previa
  const mes = nombreMes(periodo.year, periodo.month)

  // 2. Candado del mes donde cuenta el retiro (year/month: la evaluación ya
  //    garantizó que su fecha cae en ese mismo mes).
  const errorMes = await bloquearMesesEditables(query, centro, [periodo])
  if (errorMes) {
    const [estadoMes] = await query`
      SELECT estado FROM mes_kpi
      WHERE centro_id = ${centro} AND year = ${periodo.year} AND month = ${periodo.month}
    `
    return {
      error: estadoMes?.estado === 'cerrado'
        ? `${capital(mes)} está cerrado. Para corregir el motivo hay que reabrirlo en KPI Mensual, corregir y volver a cerrarlo (lo hace quien cierra el mes).`
        : errorMes,
    }
  }

  // 3. Ficha y evento bloqueados; se re-evalúa con la lista completa y el
  //    evento bloqueado en su lugar.
  const [fichaBloqueada] = await query`
    SELECT * FROM estudiantes WHERE id = ${estudiante} AND centro_id = ${centro} FOR UPDATE
  `
  const [eventoBloqueado] = await query`
    SELECT * FROM estudiante_eventos
    WHERE id = ${evento.id} AND estudiante_id = ${estudiante} AND centro_id = ${centro} AND tipo = 'retiro'
    FOR UPDATE
  `
  if (!fichaBloqueada || !eventoBloqueado) return { error: ERROR_RETIRO_CAMBIO }
  const vigente = evaluarCorreccionMotivo({
    ficha: fichaBloqueada,
    eventos: eventos.map((e) => (Number(e.id) === Number(eventoBloqueado.id) ? eventoBloqueado : e)),
    ...pedido,
  })
  if (vigente.error) return { error: vigente.error }
  if (Number(vigente.evento.id) !== Number(evento.id) ||
    vigente.periodo.year !== periodo.year || vigente.periodo.month !== periodo.month) {
    return { error: ERROR_RETIRO_CAMBIO }
  }
  if (vigente.sinCambios) return respuestaSinCambios(vigente)

  // 4. Conciliación del KPI del mes. Solo importa si el motivo cambia de campo
  //    (entre NO_CONFIRMO/INASISTENCIA/CAMBIO_CENTRO/OTRO todo es mot_otro).
  //    a) KPI guardado sin ajuste: el primer Guardar posterior tomaría el
  //       motivo viejo como "declarado a mano" y dejaría un retiro fantasma.
  //    b) Ajuste manual > 0 en el campo destino: si ese niño era uno de los
  //       declarados a mano, el KPI lo contaría dos veces. No hay pantalla
  //       para revisar el ajuste: se frena y se pide revisión.
  const campoNuevo = campoKpiDeMotivo(motivo)
  const campoAnterior = campoKpiDeMotivo(eventoBloqueado.motivo)
  let requiereGuardar = false
  if (campoNuevo !== campoAnterior) {
    const [filaAjustes] = await query`
      SELECT ajustes FROM kpi_auto_ajustes
      WHERE centro_id = ${centro} AND year = ${periodo.year} AND month = ${periodo.month}
    `
    const [filaResumen] = await query`
      SELECT 1 AS guardado FROM resumen_mes
      WHERE centro_id = ${centro} AND year = ${periodo.year} AND month = ${periodo.month}
    `
    if (filaResumen && !filaAjustes) {
      return { error: `El KPI de ${mes} está guardado pero todavía no se concilió con los retiros registrados. Abre KPI Mensual de ${mes}, pulsa Guardar y después corrige el motivo.` }
    }
    if (filaAjustes) {
      const ajustes = leerAjustes(filaAjustes.ajustes)
      if (!ajustes) return { error: `El ajuste del KPI de ${mes} no se puede leer: avísale a Administración antes de corregir el motivo.` }
      const declarados = enteroNoNegativo(ajustes[campoNuevo])
      if (declarados > 0) {
        return { error: `En ${mes} el KPI tiene ${declarados} retiro(s) «${ETIQUETA_CAMPO[campoNuevo]}» declarados a mano además de los registrados (ajuste de conciliación). Si este niño era uno de ellos, el KPI lo contaría dos veces. Pide a Administración que revise ese ajuste antes de corregir el motivo.` }
      }
    }
    // El KPI del mes ya estaba guardado: su resumen_mes queda con el motivo
    // viejo hasta que alguien vuelva a Guardar (el cierre también lo rehace).
    requiereGuardar = Boolean(filaResumen)
  }

  // 5. Escrituras: todo lo que podía frenar ya pasó. De aquí en adelante solo
  //    throw (aborta la transacción completa), nunca un { error } que se
  //    confirme a medias. Ningún INSERT ni DELETE en estudiante_eventos.
  const entrada = {
    motivo_anterior: eventoBloqueado.motivo ?? null,
    motivo_ficha_anterior: fichaBloqueada.motivo_retiro ?? null,
    motivo_nuevo: motivo,
    razon: razon.trim(),
    actor: { uid: actor.uid ?? null, email: actor.email ?? null, nombre: actor.nombre ?? null },
    corregido_at: ahora,
    evento_id: Number(eventoBloqueado.id),
    year: periodo.year,
    month: periodo.month,
  }
  const nuevoDetalle = detalleConCorreccion(eventoBloqueado.detalle, entrada)
  if (nuevoDetalle.error) return { error: nuevoDetalle.error }
  const eventoActualizado = await query`
    UPDATE estudiante_eventos SET motivo = ${motivo}, detalle = ${JSON.stringify(nuevoDetalle.detalle)}
    WHERE id = ${eventoBloqueado.id} AND estudiante_id = ${estudiante} AND centro_id = ${centro} AND tipo = 'retiro'
    RETURNING id
  `
  if (eventoActualizado.length !== 1) throw new Error('La corrección del motivo no encontró el retiro bloqueado.')
  const fichaActualizada = await query`
    UPDATE estudiantes SET motivo_retiro = ${motivo}, updated_at = ${ahora}
    WHERE id = ${estudiante} AND centro_id = ${centro} AND estado = 'retirado'
    RETURNING id
  `
  if (fichaActualizada.length !== 1) throw new Error('La corrección del motivo no encontró la ficha bloqueada.')

  return {
    ok: true,
    eventoId: Number(eventoBloqueado.id),
    motivoAnterior: eventoBloqueado.motivo ?? null,
    motivo,
    year: periodo.year,
    month: periodo.month,
    mismoCampoKpi: campoNuevo === campoAnterior,
    otrosRetirosMismoMes: vigente.otrosRetirosMismoMes,
    requiereGuardar,
  }
}
