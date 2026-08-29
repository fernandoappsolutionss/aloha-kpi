// Envío de correo vía Resend (HTTP API). Si no hay RESEND_API_KEY configurada,
// no envía nada (la app sigue funcionando: el admin copia el enlace de invitación).
export async function sendEmail({ to, subject, html }) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { sent: false, reason: 'no_api_key' }
  const from = process.env.EMAIL_FROM || 'ALOHA KPI <onboarding@resend.dev>'
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, html }),
    })
    if (!res.ok) return { sent: false, reason: `resend ${res.status}: ${(await res.text()).slice(0, 180)}` }
    return { sent: true }
  } catch (e) {
    return { sent: false, reason: e.message }
  }
}

// Plantilla HTML para invitación / restablecimiento.
export function invitacionHtml({ nombre, link, tipo }) {
  const reset = tipo === 'reset'
  const titulo = reset ? 'Restablece tu contraseña' : 'Bienvenido a ALOHA KPI'
  const intro = reset
    ? 'Recibimos una solicitud para restablecer tu contraseña.'
    : 'Se creó tu cuenta en el sistema de KPIs. Crea tu contraseña para acceder.'
  const cta = reset ? 'Restablecer contraseña' : 'Crear mi contraseña'
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;color:#00556D;padding:8px">
    <h2 style="color:#1A3C6A;margin:0 0 12px">${titulo}</h2>
    <p style="margin:0 0 8px">Hola ${nombre || ''},</p>
    <p style="margin:0 0 8px;line-height:1.5">${intro}</p>
    <p style="margin:24px 0"><a href="${link}" style="background:#BBE529;color:#00556D;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block">${cta}</a></p>
    <p style="font-size:12px;color:#888;line-height:1.5">O copia este enlace en tu navegador:<br><a href="${link}" style="color:#00556D">${link}</a></p>
    <p style="font-size:12px;color:#888">El enlace vence pronto. Si no esperabas este correo, ignóralo.</p>
    <p style="font-size:12px;color:#888;margin-top:18px"><a href="https://www.desarrolloweb.com.pa/" style="color:#888">Desarrollado por Appsolutionss</a></p>
  </div>`
}
