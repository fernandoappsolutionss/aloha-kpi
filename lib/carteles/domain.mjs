export const FORMATOS = { carta: [612, 792], a4: [595.28, 841.89] }

export function enlaceGoogle(valor) {
  const texto = String(valor || '').trim()
  let url
  try { url = new URL(texto) } catch { throw new Error('Pega el enlace de reseñas de Google de tu centro.') }
  const host = url.hostname.toLowerCase()
  const destino = (host === 'g.page' && /^\/r\/[^/]+\/review\/?$/.test(url.pathname))
    || (host === 'search.google.com' && url.pathname === '/local/writereview' && !!url.searchParams.get('placeid'))
    || (['www.google.com', 'google.com', 'maps.google.com'].includes(host) && /^\/maps(?:\/|$)/.test(url.pathname))
    || (host === 'maps.app.goo.gl' && url.pathname.length > 1)
    || (host === 'goo.gl' && url.pathname.startsWith('/maps/'))
  if (texto.length > 2000 || url.protocol !== 'https:' || url.username || url.password || url.port || !destino) {
    throw new Error('Usa un enlace HTTPS de reseñas o de Google Maps de tu centro.')
  }
  return url.href
}

const escaparWifi = texto => texto.replace(/([\\;,:" ])/g, letra => letra === ' ' ? letra : `\\${letra}`)
export function datosWifi(red = '', clave = '') {
  // El SSID y la contraseña son exactos: espacios y símbolos también cuentan.
  if (!red && clave) throw new Error('Escribe el nombre de la red de invitados.')
  if (!red) return { red: '', clave: '', qr: null }
  if (!red.trim() || new TextEncoder().encode(red).length > 32 || /[\r\n\x00-\x1f]/.test(red)) throw new Error('La red debe tener entre 1 y 32 bytes, sin saltos de línea.')
  if (clave && (clave.length < 8 || clave.length > 63 || /[^\x20-\x7e]/.test(clave))) throw new Error('La clave WiFi debe tener entre 8 y 63 caracteres imprimibles, sin acentos.')
  return { red, clave, qr: `WIFI:T:${clave ? 'WPA' : 'nopass'};S:${escaparWifi(red)};P:${escaparWifi(clave)};;` }
}

export function nombreArchivo({ tipo, centroId, anio, mes, formato = 'carta' }) {
  return `ALOHA-${tipo}-${String(centroId).replace(/[^a-zA-Z0-9-]/g, '')}${tipo === 'encuesta' ? `-${anio}-${String(mes).padStart(2, '0')}` : ''}-${formato}.pdf`
}
