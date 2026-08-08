// Auth del cron de llenado — gate PURO y fail-closed del handler.
// El route (app/api/cron/llenado/route.js) delega aquí para que el gate se
// pruebe en espejo con Request de verdad (test/cron-auth.test.mjs), misma
// técnica que lib/llenado-outbox.mjs frente a lib/llenado-service.js.
//
// Regla (defecto 14): sin CRON_SECRET configurado el endpoint responde 401
// SIEMPRE. El guard `!secreto` cierra además la trampa clásica del template:
// con el secreto ausente, `Bearer ${undefined}` sería el string literal
// 'Bearer undefined' y quien lo mande a mano entraría gratis.

// ¿El request trae el secreto correcto? Fail-closed: sin secreto, nunca.
export function cronAutorizado(request, secreto) {
  if (!secreto) return false
  return request?.headers?.get('authorization') === `Bearer ${secreto}`
}

// Respuesta 401 del handler cuando el gate no pasa; null = autorizado, sigue.
export function rechazoCron(request, secreto) {
  if (cronAutorizado(request, secreto)) return null
  return Response.json({ error: 'No autorizado' }, { status: 401 })
}
