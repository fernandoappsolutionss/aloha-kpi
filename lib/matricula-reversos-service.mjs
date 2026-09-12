import { assertUsuarioNoBloqueado, assertWriteCentro } from './current-user.mjs'

const MAX_IMPORTE = 1_000_000
const CAMPOS_COMPROBANTE = ['factura', 'notaCredito', 'comprobanteDevolucion', 'importe', 'moneda']
const SERIALIZABLE = { isolationLevel: 'Serializable' }

function idValido(value, nombre) {
  if (!['number', 'string'].includes(typeof value) || !/^\d+$/.test(String(value))
    || !Number.isSafeInteger(Number(value)) || Number(value) < 1) {
    throw new Error(`${nombre} inválido.`)
  }
  return Number(value)
}

function fechaValida(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

function fechaEvento(value) {
  return value instanceof Date && Number.isFinite(value.getTime())
    ? value.toISOString().slice(0, 10)
    : value
}

function hoyPanama(now) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Panama', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
}

function referencia(value, nombre) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 180) {
    throw new Error(`${nombre} es obligatorio y admite hasta 180 caracteres.`)
  }
  return value.trim()
}

function normalizarComprobante(data, hoy) {
  if (!fechaValida(data?.fecha)) throw new Error('La fecha del reverso debe ser una fecha válida (AAAA-MM-DD).')
  if (data.fecha > hoy) throw new Error('La fecha del reverso no puede ser futura.')
  const { importe, moneda } = data
  if (!['number', 'string'].includes(typeof importe)
    || !/^\d+(?:\.\d{1,2})?$/.test(String(importe).trim())
    || !Number.isFinite(Number(importe)) || Number(importe) <= 0 || Number(importe) > MAX_IMPORTE) {
    throw new Error('El importe debe ser positivo, con hasta dos decimales y no mayor de 1.000.000.')
  }
  if (!['USD', 'VES'].includes(moneda)) throw new Error('Selecciona USD o VES como moneda del comprobante.')
  return {
    fecha: data.fecha,
    detalle: {
      factura: referencia(data.factura, 'La referencia de factura'),
      notaCredito: referencia(data.notaCredito, 'La nota de crédito'),
      comprobanteDevolucion: referencia(data.comprobanteDevolucion, 'El comprobante de devolución'),
      importe: Number(importe), moneda,
    },
  }
}

function detalleDe(value) {
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  return value
}

// Constancia administrativa de documentos emitidos fuera de la plataforma.
// No verifica Zoho, no emite notas de crédito y no devuelve dinero.
export function createMatriculaReversosService({ transaction, authorize, now = () => new Date() }) {
  if (typeof transaction !== 'function' || typeof authorize !== 'function') {
    throw new Error('El servicio de reversos requiere transacción y autorización.')
  }

  async function registrarReversoMatricula(centroIdInput, estudianteIdInput, data) {
    const centroId = idValido(centroIdInput, 'Centro')
    const estudianteId = idValido(estudianteIdInput, 'Estudiante')
    // authorize autentica contra DB y devuelve el usuario sin password_hash.
    const actor = assertWriteCentro(assertUsuarioNoBloqueado(await authorize(centroId)), centroId)
    const actorId = idValido(actor.id, 'Usuario')
    const comprobante = normalizarComprobante(data, hoyPanama(now()))

    return transaction(async (query) => {
      // Serializa contra otro reverso y contra cambios operativos de la ficha.
      // No toma mes_kpi: este evento no altera matrícula ni indicadores.
      const [estudiante] = await query`
        SELECT id, centro_id, estado FROM estudiantes
        WHERE id = ${estudianteId} AND centro_id = ${centroId} FOR UPDATE
      `
      if (!estudiante) throw new Error('El estudiante no pertenece a este centro.')
      if (estudiante.estado !== 'matricula_anulada') throw new Error('Primero debe estar anulada la matrícula del estudiante.')
      const [anulacion] = await query`
        SELECT id, fecha FROM estudiante_eventos
        WHERE estudiante_id = ${estudianteId} AND centro_id = ${centroId} AND tipo = 'anulacion_matricula'
        ORDER BY id DESC LIMIT 1
      `
      const fechaAnulacion = fechaEvento(anulacion?.fecha)
      if (!anulacion || !fechaValida(fechaAnulacion)) {
        throw new Error('Falta el evento de anulación con fecha válida. Solicita una revisión de la ficha.')
      }
      if (comprobante.fecha < fechaAnulacion) throw new Error('El reverso no puede ser anterior a la anulación de matrícula.')
      const anulacionId = idValido(anulacion.id, 'Evento de anulación')
      const anteriores = await query`
        SELECT id, fecha, detalle FROM estudiante_eventos
        WHERE estudiante_id = ${estudianteId} AND centro_id = ${centroId} AND tipo = 'reverso_matricula'
          AND detalle->>'anulacion_evento_id' = ${String(anulacionId)}
        ORDER BY id DESC
      `
      if (anteriores.length) {
        const anterior = anteriores[0]
        const detalle = detalleDe(anterior.detalle)
        if (anteriores.length === 1 && fechaEvento(anterior.fecha) === comprobante.fecha
          && CAMPOS_COMPROBANTE.every((campo) => detalle?.[campo] === comprobante.detalle[campo])) {
          return { ok: true, eventoId: anterior.id, yaRegistrado: true }
        }
        throw new Error('Esta anulación ya tiene un reverso con otros datos. Solicita una revisión; no se sobreescribirá el comprobante.')
      }
      const detalle = { ...comprobante.detalle, registrado_por: actorId, anulacion_evento_id: anulacionId }
      const [year, month] = comprobante.fecha.split('-').map(Number)
      const [evento] = await query`
        INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, detalle)
        VALUES (${estudianteId}, ${centroId}, 'reverso_matricula', ${year}, ${month}, ${comprobante.fecha}, ${JSON.stringify(detalle)})
        RETURNING id
      `
      return { ok: true, eventoId: evento.id, yaRegistrado: false }
    }, SERIALIZABLE)
  }

  return { registrarReversoMatricula }
}
