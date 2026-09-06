'use client'
// BARRERA 1 · O · OBSERVAR — ESTUDIAR A CIEGAS. Antes de leer, la persona
// confirma que tiene delante lo que el módulo necesita: el sistema abierto, el
// documento real, la bitácora física. Estudiar sobre la nada no deja nada.
//
// "Ya lo estudié" no se habilita hasta tildarlas todas. No es un candado
// burocrático: es la primera barrera del método, y quien tilda sin tenerlo a la
// vista se delata solo en la maniobra.
import { useState } from 'react'
import { useGuia } from './GuiaModulo'

export default function MasaOficio({ moduloId, masa, yaEstudiado }) {
  const guia = useGuia()
  const [tildados, setTildados] = useState(() => masa.map(() => false))
  const [listo, setListo] = useState(Boolean(yaEstudiado))
  const todos = tildados.length > 0 && tildados.every(Boolean)

  function declararVista() {
    if (!todos) return
    setListo(true)
    guia?.completar('vista')
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
      <div className="ofi-masa__acciones" aria-live="polite">
        {listo ? (
          <span className="ent-pill ent-pill--ok">✓ Todo a la vista</span>
        ) : (
          <>
            {guia ? (
              <button type="button" className="btn btn--primary" onClick={declararVista} disabled={!todos}>
                Ya lo tengo a la vista
              </button>
            ) : null}
            <span className="h-sub" style={{ margin: 0 }}>
              {todos
                ? (guia ? 'Sigue al próximo paso.' : 'Listo: ahora lee el módulo con esto delante.')
                : `Tilda las ${masa.length} cosas de la lista antes de seguir.`}
            </span>
          </>
        )}
      </div>
    </section>
  )
}
