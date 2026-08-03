// Errores de Server Actions que sí se pueden leer.
//
// En producción Next.js oculta el mensaje de CUALQUIER excepción lanzada dentro
// de un Server Action y lo reemplaza por "An error occurred in the Server
// Components render. The specific message is omitted in production builds…",
// que no le dice nada a quien está usando el panel y deja el diagnóstico a
// ciegas. Por eso una acción que puede fallar nunca debe `throw`: devuelve
// { error: 'mensaje legible' } y la UI lo muestra. El detalle técnico (stack,
// SQLSTATE) queda en los logs de runtime de Vercel.

export function fallo(donde, e) {
  console.error(`[${donde}]`, e)
  const msg = e?.message || 'error desconocido'
  if (/No autenticado/i.test(msg)) return { error: 'Tu sesión expiró. Vuelve a entrar.' }
  if (/No autorizado/i.test(msg)) return { error: 'Tu usuario no tiene acceso a este centro.' }
  return { error: msg }
}
