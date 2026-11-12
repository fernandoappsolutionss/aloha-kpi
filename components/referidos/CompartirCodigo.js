'use client'
import { useState } from 'react'

const TEXTO = 'Te invito a una clase de prueba en ALOHA. Reserva aquí:'

export default function CompartirCodigo({ enlace }) {
  const [copiado, setCopiado] = useState(false)
  async function compartir() {
    if (navigator.share) {
      try { await navigator.share({ text: TEXTO, url: enlace }); return } catch { /* canceló: cae a copiar */ }
    }
    try { await navigator.clipboard.writeText(`${TEXTO} ${enlace}`); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch { /* sin permiso */ }
  }
  return <button type="button" className="tarjeta__cta" onClick={compartir}>{copiado ? 'Enlace copiado' : 'Invitar a una familia'}</button>
}
