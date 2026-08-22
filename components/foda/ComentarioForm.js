'use client'
import { useState } from 'react'
import { createComentario } from '../../app/actions/peticiones'

// Comentario libre (sin categoría, sin cotizaciones): la vía rápida para una
// nota o sugerencia. El texto solo se limpia si el servidor confirma el guardado
// — un error lo deja intacto para que la persona no tenga que reescribirlo.
export default function ComentarioForm({ centroId, anio, trimestre, disabled, onCreate, onStatus }) {
  const [texto, setTexto] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    const valor = texto.trim()
    if (!valor || busy || disabled) return
    setBusy(true)
    try {
      const res = await createComentario(centroId, anio, trimestre, valor)
      if (res?.error) throw new Error(res.error)
      setTexto('')
      await onCreate?.()
    } catch (e) {
      onStatus?.(`Error: ${e?.message || 'No se pudo guardar el comentario.'}`)
    }
    setBusy(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submit() }
  }

  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'flex-start' }}>
      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={busy || disabled}
        placeholder="Escribe un comentario para la administradora… (⌘/Ctrl+Enter para enviar)"
        className="input"
        style={{ flex: 1, minHeight: 60, resize: 'vertical' }}
      />
      <button type="button" onClick={submit} disabled={busy || disabled || !texto.trim()} className="btn btn--primary" style={{ whiteSpace: 'nowrap' }}>
        {busy ? 'Enviando…' : '+ Comentario'}
      </button>
    </div>
  )
}
