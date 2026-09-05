'use client'
// Carril "Tu oficio" del índice de Entrenamiento. Llama resumenOficio() y ya:
// NO importa nada de lib/entrenamiento/oficio, por eso la prosa de los 40
// módulos nunca entra al bundle de la página índice (que es 'use client').
//
// Dos carriles distintos según lo que responda el SERVIDOR:
//   modo 'entrenamiento' → "Tu oficio": tus barras, tus cursos, tu siguiente.
//   modo 'revision'      → "Revisar el entrenamiento": gerencia y coordinador
//     no se entrenan, pero tienen que poder leer el plan que le dan a su gente.
//     Sin barras y sin "tu": no es su entrenamiento, es lectura.
// Si la action falla o devuelve null (nadie a quien firmarle, ningún plan
// propio), no pinta nada: el carril de los 9 tours sigue funcionando solo.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { resumenOficio } from '../../app/actions/entrenamiento-oficio'

export default function CarrilOficio({ centroId }) {
  const [datos, setDatos] = useState(null)
  // 'cargando' | 'sin-plan' | 'error' | 'listo' | 'revision'. Antes devolvía
  // null en los cuatro primeros casos: en un centro con mala conexión la
  // segunda pista simplemente no existía y nadie se enteraba.
  const [estado, setEstado] = useState('cargando')

  useEffect(() => {
    let activo = true
    resumenOficio()
      .then((r) => {
        if (!activo) return
        if (!r) { setEstado('sin-plan'); return }
        if (r.error) { setEstado('error'); return }
        if (r.modo === 'revision') {
          if (!(r.revision?.length > 0)) { setEstado('error'); return }
          setDatos(r); setEstado('revision'); return
        }
        if (!(r.avance?.total > 0)) { setEstado('error'); return }
        setDatos(r); setEstado('listo')
      })
      .catch(() => { if (activo) setEstado('error') })
    return () => { activo = false }
  }, [])

  if (estado === 'sin-plan') return null

  // REVISIÓN — gerencia y coordinador. Se dice con todas sus letras que es
  // lectura: sin barras de avance, sin "continuar", sin "tu puesto". El dueño
  // entra a leer lo que estudia su gente, no a acumular progreso.
  if (estado === 'revision') {
    const base = `/centro/${centroId}/entrenamiento/oficio`
    return (
      <section className="ofi-carril" aria-labelledby="ofi-carril-title">
        <div className="ofi-carril__head">
          <div>
            <div className="label">Entrenamiento de oficio</div>
            <h2 id="ofi-carril-title">Revisa el entrenamiento de tu gente</h2>
            <p className="h-sub" style={{ marginTop: 4 }}>
              Tú no te entrenas en estos planes: los firmas. Aquí los abres en modo lectura — los módulos completos, el glosario y las maniobras con
              las que vas a evaluar. No acumulas progreso ni respondes cuestionarios.
            </p>
          </div>
          <Link className="btn" href={`/centro/${centroId}/entrenamiento/firmas`}>Firmas pendientes <span aria-hidden="true">→</span></Link>
        </div>

        <ul className="ofi-carril__cursos">
          {datos.revision.map((p) => (
            <li key={p.rol}>
              <span className="label">Plan de {p.rolNombre}</span>
              <strong>{p.total} módulos · {p.minutos >= 60 ? `${Math.round(p.minutos / 60)} h` : `${p.minutos} min`} de estudio</strong>
              <span className="ent-pill">{p.conDrill} llevan maniobra que tú firmas</span>
              <Link className="tour-card__link" href={`${base}?revisar=${p.rol}`}>Revisar este plan <span aria-hidden="true">→</span></Link>
            </li>
          ))}
        </ul>

        <p className="ofi-carril__next">
          También: <Link className="tour-card__link" href={`${base}/glosario`}>el glosario de términos</Link>
          {datos.veMatriz && <> y <Link className="tour-card__link" href="/dashboard/entrenamiento/oficio">quién tiene su puesto tomado</Link></>}.
        </p>
      </section>
    )
  }
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
          <Link className="btn" href={`/centro/${centroId}/entrenamiento/oficio`}>Ver mi puesto <span aria-hidden="true">→</span></Link>
        </div>
      </section>
    )
  }

  const { avance, drills, cursos, siguiente, revision } = datos
  const base = `/centro/${centroId}/entrenamiento/oficio`
  // LOS DOS CARRILES A LA VEZ. Quien tiene plan propio y además le firma el hat
  // a alguien —la Administradora al Coach y a la Asistente; el Coordinador
  // Operativo a los tres— tiene que ver las dos cosas. Antes el servidor elegía
  // una y el que estudiaba perdía la lectura de los planes que audita.
  const revisa = revision || []

  return (
    <section className="ofi-carril" aria-labelledby="ofi-carril-title">
      <div className="ofi-carril__head">
        <div>
          <div className="label">Tu oficio</div>
          <h2 id="ofi-carril-title">Aprende tu puesto</h2>
          <p className="h-sub" style={{ marginTop: 4 }}>
            Los procesos del Centro, la normativa y tu puesto. Estudiar es la mitad: la maniobra te la firma tu jefe entrenador.
          </p>
        </div>
        <Link className="btn btn--primary" href={base}>{avance.estudiados > 0 ? 'Continuar mi oficio' : 'Ver mi puesto'} <span aria-hidden="true">→</span></Link>
      </div>

      <div className="ofi-carril__barras">
        <div>
          <div className="label">Estudiado</div>
          <progress className="ent-start__progress" max={avance.total} value={avance.estudiados} aria-label="Módulos estudiados" />
          <p className="ent-start__note">{avance.estudiados} de {avance.total} módulos · {avance.pctEstudio}%</p>
        </div>
        {/* Se cuenta sobre los módulos QUE LLEVAN MANIOBRA. Rotular "maniobra
            firmada" una barra que incluye los que no la llevan la deja al 42 %
            sin una sola firma del jefe entrenador. */}
        <div>
          <div className="label">Maniobras firmadas</div>
          <progress className="ent-start__progress" max={drills?.total || 0} value={drills?.firmados || 0} aria-label="Maniobras firmadas por tu jefe entrenador" />
          <p className="ent-start__note">
            {drills?.total
              ? `${drills.firmados} de ${drills.total} maniobras · ${drills.pct}%`
              : 'Este plan no lleva maniobras.'}
          </p>
        </div>
      </div>

      <ul className="ofi-carril__cursos">
        {cursos.map((c) => (
          <li key={c.id}>
            <span className="label">Bloque {c.bloque}</span>
            <strong>{c.titulo}</strong>
            <span className={`ent-pill${c.hatted === c.total ? ' ent-pill--ok' : c.estudiados > 0 ? ' ent-pill--mid' : ''}`}>
              {c.estudiados} de {c.total} estudiados · {c.hatted} con el puesto tomado
            </span>
          </li>
        ))}
      </ul>

      {siguiente && (
        <p className="ofi-carril__next">
          Siguiente: <Link className="tour-card__link" href={`${base}/${siguiente.id}`}>{siguiente.titulo} <span aria-hidden="true">→</span></Link>
        </p>
      )}

      {revisa.length > 0 && (
        <p className="ofi-carril__next">
          Y tú firmas {revisa.length === 1 ? 'el plan de' : 'los planes de'}{' '}
          {revisa.map((p, i) => (
            <span key={p.rol}>
              {i > 0 && (i === revisa.length - 1 ? ' y ' : ', ')}
              <Link className="tour-card__link" href={`${base}?revisar=${p.rol}`}>{p.rolNombre}</Link>
            </span>
          ))}
          : ábrelos en lectura para prepararte las maniobras que le vas a tomar.
        </p>
      )}
    </section>
  )
}
