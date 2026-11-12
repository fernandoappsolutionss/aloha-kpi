'use client'
import { useState } from 'react'

// Enlace de la tarjeta de un inscrito: lo copia y abre WhatsApp con el mensaje
// ya escrito. Lo envía la persona del centro, no el sistema.
export function enlaceTarjeta(token) {
  return `${window.location.origin}/tarjeta/${token}`
}

export function mensajeTarjeta(nombre, enlace) {
  return `Hola${nombre ? `, ${nombre}` : ''}. Esta es tu tarjeta ALOHA: ahí ves tu saldo y tu código para invitar a otras familias. ${enlace}`
}

export default function TarjetaBoton({ token, nombre, telefono, className = 'btn' }) {
  const [copiado, setCopiado] = useState(false)
  if (!token) return null
  async function entregar() {
    const enlace = enlaceTarjeta(token)
    try { await navigator.clipboard.writeText(enlace); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch { /* sin permiso de portapapeles */ }
    const digitos = String(telefono || '').replace(/\D/g, '')
    if (digitos.length >= 7) window.open(`https://wa.me/${digitos}?text=${encodeURIComponent(mensajeTarjeta(nombre, enlace))}`, '_blank', 'noopener')
  }
  return <button type="button" className={className} onClick={entregar} title="Copia el enlace y abre WhatsApp con el mensaje escrito">{copiado ? 'Enlace copiado' : 'Tarjeta'}</button>
}

export function EtiquetaReferido({ referidos }) {
  if (!referidos) return null
  if (referidos.sinTelefono) return <div style={{ fontSize: 12, color: 'var(--warn-text)' }}>Sin teléfono válido: no tiene tarjeta</div>
  if (!referidos.referidor) return null
  return <div style={{ fontSize: 12, color: 'var(--ok-text)' }}>Referido por {referidos.referidor}</div>
}
