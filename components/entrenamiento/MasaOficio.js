'use client'
// BARRERA 1 · O · OBSERVAR — ESTUDIAR A CIEGAS. Antes de leer, la persona
// confirma que tiene delante lo que el módulo necesita: el sistema abierto, el
// documento real, la bitácora física. Estudiar sobre la nada no deja nada.
//
// "Ya lo estudié" no se habilita hasta tildarlas todas. No es un candado
// burocrático: es la primera barrera del método, y quien tilda sin tenerlo a la
// vista se delata solo en la maniobra.
import { useState } from 'react'
import { marcarEstudiado } from '../../app/actions/entrenamiento-oficio'

export default function MasaOficio({ moduloId, masa, yaEstudiado, bloqueado, motivoBloqueo }) {
  const [tildados, setTildados] = useState(() => masa.map(() => false))
  const [listo, setListo] = useState(Boolean(yaEstudiado))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const todos = tildados.length > 0 && tildados.every(Boolean)

  async function declarar() {
    setGuardando(true); setError('')
    try {
      const r = await marcarEstudiado(moduloId)
      if (r?.error) { setError(r.error); return }
      setListo(true)
    } catch { setError('No se pudo guardar. Recarga la página e intenta de nuevo.') } finally { setGuardando(false) }
  }

  return (
    <section className="card ofi-masa" aria-labelledby="masa-titulo">
      <div className="label" style={{ marginBottom: 6 }}>Antes de leer</div>
      <h2 id="masa-titulo" style={{ fontSize: 20, margin: '0 0 8px' }}>Ten esto a la vista</h2>
      <p className="h-sub" style={{ marginTop: 0 }}>
        Esto es lo que va a la vista antes de leer. Sin la cosa real delante, lo que leas se te olvida. Búscalo primero y tíldalo.
      </p>
      <ul className="ofi-masa__lista">
        {masa.map((m, i) => (
          <li key={i}>
            <label className="ent-opt">
              <input type="checkbox" checked={tildados[i] || false} onChange={() => setTildados((t) => { const n = [...t]; n[i] = !n[i]; return n })} />
              <span>{m}</span>
            </label>
          </li>
        ))}
      </ul>
      {error && <div className="alert alert--error" role="alert">{error}</div>}
      {/* El orden lo vuelve a comprobar el servidor en marcarEstudiado: aquí
          solo se evita ofrecer un botón que va a devolver error. */}
      {bloqueado && !listo && (
        <div className="alert alert--warn" role="note">{motivoBloqueo || 'Antes de marcar este módulo tienes que estudiar el anterior.'}</div>
      )}
      <div className="ofi-masa__acciones" aria-live="polite">
        {listo ? (
          <span className="ent-pill ent-pill--ok">✓ Estudiado con todo a la vista</span>
        ) : bloqueado ? null : (
          <>
            <button className="btn btn--primary" onClick={declarar} disabled={!todos || guardando}>
              {guardando ? 'Guardando…' : 'Ya lo estudié'}
            </button>
            {!todos && <span className="h-sub" style={{ margin: 0 }}>Tilda las {masa.length} cosas de la lista para habilitar el botón.</span>}
          </>
        )}
      </div>
    </section>
  )
}
