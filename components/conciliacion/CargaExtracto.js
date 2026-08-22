'use client'
import { useRef, useState } from 'react'
import { leerArchivoComoTexto } from './formato'

const MAX_BYTES = 2 * 1024 * 1024

export default function CargaExtracto({ cuenta, onSubir, ocupado }) {
  const input = useRef(null)
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState('')
  const [arrastrando, setArrastrando] = useState(false)

  async function procesar(archivo) {
    setError('')
    if (!archivo) return
    if (archivo.size > MAX_BYTES) {
      setError('El archivo pesa más de 2 MB. Sube el extracto de un mes a la vez.')
      return
    }
    if (!/\.(csv|txt)$/i.test(archivo.name)) {
      setError('Por ahora se lee el CSV que exporta la banca en línea. Si tienes Excel, guárdalo como CSV.')
      return
    }
    setNombre(archivo.name)
    const texto = await leerArchivoComoTexto(archivo)
    await onSubir({ archivo: archivo.name, texto })
  }

  return (
    <div
      className={`conc-drop${arrastrando ? ' conc-drop--activo' : ''}`}
      onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        e.preventDefault()
        setArrastrando(false)
        if (!ocupado) procesar(e.dataTransfer.files?.[0])
      }}
    >
      <input
        ref={input}
        type="file"
        accept=".csv,.txt,text/csv"
        style={{ display: 'none' }}
        onChange={(e) => { procesar(e.target.files?.[0]); e.target.value = '' }}
      />
      <div className="conc-drop__titulo">Adjunta el movimiento bancario</div>
      <p className="conc-drop__texto">
        Arrastra aquí el CSV de {cuenta?.zoho_account_nombre || 'la cuenta'} o
        {' '}
        <button type="button" className="conc-link" onClick={() => input.current?.click()} disabled={ocupado}>
          búscalo en tu equipo
        </button>.
        Se leen las columnas de fecha, descripción, referencia y débito/crédito.
      </p>
      {nombre && <div className="conc-drop__archivo">{ocupado ? 'Leyendo' : 'Último archivo'}: {nombre}</div>}
      {error && <div className="alert alert--error" style={{ marginTop: 10 }}>{error}</div>}
    </div>
  )
}
