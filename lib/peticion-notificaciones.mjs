// Contenido del correo enviado al centro cuando gerencia aprueba o niega una
// petición. Función pura (sin I/O): la composición con sendEmail/consultas de
// centro vive en peticion-notificaciones-runtime.js, que sí es server-only.
import { PETICION_CATEGORIAS } from './peticiones-domain.mjs'

function categoriaLabel(value) {
  return PETICION_CATEGORIAS.find((c) => c.value === value)?.label || value || '—'
}

function formatFecha(value) {
  try {
    return new Date(value).toLocaleDateString('es-PA', { day: '2-digit', month: 'long', year: 'numeric' })
  } catch {
    return ''
  }
}

export function decisionEmail({ peticion, estado, actor, cotizacionAprobada, centroNombre, baseUrl }) {
  const aprobada = estado === 'Aprobado'
  const titulo = aprobada ? 'Petición aprobada' : 'Petición negada'
  const subject = `${titulo} — ${centroNombre}`
  const color = aprobada ? '#10B981' : '#DC2626'
  const link = `${baseUrl}/centro/${peticion.centro_id}/foda`
  const cotizacionBlock = aprobada && cotizacionAprobada
    ? `<p style="margin:12px 0;padding:10px;background:#F0FDF4;border-radius:8px;font-size:13px">
        <strong>Cotización aprobada:</strong> ${cotizacionAprobada.proveedor_razon_social} (${cotizacionAprobada.proveedor_pais}) — ${cotizacionAprobada.archivo_nombre}
       </p>`
    : ''
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#1a2744;padding:8px">
    <h2 style="color:${color};margin:0 0 12px">${titulo}</h2>
    <p style="margin:0 0 8px"><strong>Centro:</strong> ${centroNombre}</p>
    <p style="margin:0 0 8px"><strong>Categoría:</strong> ${categoriaLabel(peticion.categoria)}</p>
    <p style="margin:0 0 8px;line-height:1.5">${peticion.texto}</p>
    ${cotizacionBlock}
    <p style="margin:12px 0 0;font-size:12px;color:#555">Decidido por ${actor?.nombre || ''} el ${formatFecha(peticion.updated_at || new Date())}</p>
    <p style="margin:24px 0"><a href="${link}" style="background:${color};color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">Ver en el panel</a></p>
    <p style="font-size:12px;color:#888;margin-top:18px">Operado por Team Solutionss</p>
  </div>`
  return { subject, html }
}
