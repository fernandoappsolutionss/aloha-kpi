'use client'
// Carril "Tu oficio" del índice de Entrenamiento. Llama resumenOficio() y ya:
// NO importa nada de lib/entrenamiento/oficio, por eso la prosa de los 40
// módulos nunca entra al bundle de la página índice (que es 'use client').
//
// Si la action falla o el rol no tiene plan (gerencia, coordinador), no pinta
// nada: el carril de los 9 tours sigue funcionando solo.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { resumenOficio } from '../../app/actions/entrenamiento-oficio'

export default function CarrilOficio({ centroId }) {
  const [datos, setDatos] = useState(null)
  // 'cargando' | 'sin-plan' | 'error' | 'listo'. Antes devolvía null en los
  // cuatro casos: en un centro con mala conexión la segunda pista simplemente
  // no existía y nadie se enteraba.
  const [estado, setEstado] = useState('cargando')

  useEffect(() => {
    let activo = true
    resumenOficio()
      .then((r) => {
        if (!activo) return
        if (!r) { setEstado('sin-plan'); return }
        if (r.error || !(r.avance?.total > 0)) { setEstado('error'); return }
        setDatos(r); setEstado('listo')
      })
      .catch(() => { if (activo) setEstado('error') })
    return () => { activo = false }
  }, [])

  if (estado === 'sin-plan') return null
  if (estado !== 'listo') {
    return (
      <section className="ofi-carril" aria-labelledby="ofi-carril-title">
        <div className="ofi-carril__head">
          <div>
            <div className="label">Tu oficio</div>
            <h2 id="ofi-carril-title">Aprende tu puesto</h2>
            <p className="h-sub" style={{ marginTop: 4 }} role="status">
              {estado === 'cargando'
                ? 'Cargando tu plan de oficio…'
                : 'No se pudo cargar tu plan de oficio. Recarga la página; el enlace de abajo funciona igual.'}
            </p>
          </div>
          <Link className="btn" href={`/centro/${centroId}/entrenamiento/oficio`}>Ver mi hat <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    )
  }

  const { avance, drills, cursos, siguiente } = datos
  const base = `/centro/${centroId}/entrenamiento/oficio`

  return (
    <section className="ofi-carril" aria-labelledby="ofi-carril-title">
      <div className="ofi-carril__head">
        <div>
          <div className="label">Tu oficio</div>
          <h2 id="ofi-carril-title">Aprende tu puesto</h2>
          <p className="h-sub" style={{ marginTop: 4 }}>
            Los procesos del Centro, la normativa y tu hat. Estudiar es la mitad: el drill te lo firma tu Oficial de Entrenamiento.
          </p>
        </div>
        <Link className="btn btn--primary" href={base}>{avance.estudiados > 0 ? 'Continuar mi oficio' : 'Ver mi hat'} <span aria-hidden="true">→</span></Link>
      </div>

      <div className="ofi-carril__barras">
        <div>
          <div className="label">Estudiado</div>
          <progress className="ent-start__progress" max={avance.total} value={avance.estudiados} aria-label="Módulos estudiados" />
          <p className="ent-start__note">{avance.estudiados} de {avance.total} módulos · {avance.pctEstudio}%</p>
        </div>
        {/* Se cuenta sobre los módulos QUE LLEVAN DRILL. Rotular "drill firmado"
            una barra que incluye los que no lo llevan la deja al 42 % sin una
            sola firma del Oficial. */}
        <div>
          <div className="label">Drills firmados</div>
          <progress className="ent-start__progress" max={drills?.total || 0} value={drills?.firmados || 0} aria-label="Drills firmados por tu Oficial de Entrenamiento" />
          <p className="ent-start__note">
            {drills?.total
              ? `${drills.firmados} de ${drills.total} drills · ${drills.pct}%`
              : 'Este plan no lleva drills.'}
          </p>
        </div>
      </div>

      <ul className="ofi-carril__cursos">
        {cursos.map((c) => (
          <li key={c.id}>
            <span className="label">Bloque {c.bloque}</span>
            <strong>{c.titulo}</strong>
            <span className={`ent-pill${c.hatted === c.total ? ' ent-pill--ok' : c.estudiados > 0 ? ' ent-pill--mid' : ''}`}>
              {c.estudiados} de {c.total} estudiados · {c.hatted} con el hat completo
            </span>
          </li>
        ))}
      </ul>

      {siguiente && (
        <p className="ofi-carril__next">
          Siguiente: <Link className="tour-card__link" href={`${base}/${siguiente.id}`}>{siguiente.titulo} <span aria-hidden="true">→</span></Link>
        </p>
      )}
    </section>
  )
}
