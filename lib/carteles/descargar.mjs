import { nombreArchivo } from './domain.mjs'

let assetsPromise
async function cargarAssets() {
  if (!assetsPromise) assetsPromise = Promise.all([
    '/carteles/logo-oficial.png', '/fonts/FuturaMdBT.ttf', '/fonts/FuturaMdBT-Bold.ttf', '/carteles/mono-oficial.pdf',
  ].map(async path => {
    const res = await fetch(path)
    if (!res.ok) throw new Error('No se pudo cargar el diseño ALOHA. Revisa la conexión e intenta nuevamente.')
    return res.arrayBuffer()
  })).then(([logo,regular,bold,mono])=>({logo,regular,bold,mono})).catch(error=>{assetsPromise=null;throw error})
  return assetsPromise
}
export function descargarArchivo(blob, nombre) {
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(()=>URL.revokeObjectURL(url), 60000)
}
export async function prepararCartel(opciones) {
  const [{crearCartelPdf}, assets] = await Promise.all([import('./pdf.mjs'), cargarAssets()])
  const bytes = await crearCartelPdf(opciones, assets)
  return {blob: new Blob([bytes], {type:'application/pdf'}), nombre: nombreArchivo(opciones)}
}
