export const MAX_EVIDENCIA = 2 * 1024 * 1024

export async function leerArchivoEvidencia(archivo) {
  if (!archivo || typeof archivo.arrayBuffer !== 'function' || !archivo.size) throw new Error('Selecciona un archivo PDF, PNG o JPG.')
  if (archivo.size > MAX_EVIDENCIA) throw new Error('El adjunto admite hasta 2 MB.')
  const bytes = new Uint8Array(await archivo.arrayBuffer())
  if (!bytes.length || bytes.length > MAX_EVIDENCIA) throw new Error('El adjunto admite hasta 2 MB.')
  const comienza = firma => firma.every((n, i) => bytes[i] === n)
  const tipo = comienza([37, 80, 68, 70, 45]) ? 'application/pdf'
    : comienza([137, 80, 78, 71, 13, 10, 26, 10]) ? 'image/png'
      : comienza([255, 216, 255]) ? 'image/jpeg' : null
  if (!tipo) throw new Error('El contenido debe ser PDF, PNG o JPG; cambiar la extensión no convierte el archivo.')
  const nombre = String(archivo.name || 'evidencia').split(/[\\/]/).at(-1).replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 160) || 'evidencia'
  return { bytes, tipo, nombre }
}
