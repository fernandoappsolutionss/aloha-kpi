'use client'
import { useEffect, useState } from 'react'
import Sidebar from '../Sidebar'
import ConciliadorPanel from './ConciliadorPanel'
import { getCentroNombre } from '../../app/actions/centros'

export default function VistaCentro({ centroId }) {
  const [nombre, setNombre] = useState('Centro')

  useEffect(() => {
    getCentroNombre(centroId).then((n) => { if (n) setNombre(n) }).catch(() => {})
  }, [centroId])

  return (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre} centroId={centroId} />
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Finanzas · {nombre}</div>
            <h1 className="h-title">Conciliación bancaria</h1>
            <p className="h-sub">
              Adjunta el CSV de tu cuenta y registra los movimientos en Zoho Books.
            </p>
          </div>
        </div>
        <ConciliadorPanel centroId={centroId} />
      </main>
    </div>
  )
}
