'use client'
// LA PANTALLA DEL COACH CON CUENTA.
// No duplica la lista de asistencia (esa vive en /coach/<token>, y desde aquí
// se abre): muestra sus grupos, los niños de cada uno y el itinerario con lo
// que ya marcó, para que sepa qué le falta antes de entrar a marcarlo.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { misGruposCoach } from '../../../actions/coach'
import Sidebar from '../../../../components/Sidebar'
import TableScroller from '../../../../components/TableScroller'

const fmtDia = (f) => `${String(f).slice(8, 10)}/${String(f).slice(5, 7)}`
const ESTADO = {
  completa: '✅ Marcada',
  pendiente: '⚠ Falta marcar',
  proxima: 'Próxima',
  sin_ninos: 'Sin niños',
}

function Grupo({ grupo }) {
  return (
    <section className="card" aria-label={`Grupo ${grupo.numero}`}>
      <div className="page-actions">
        <div>
          <h2 className="panel__title">Grupo {grupo.numero} · {grupo.itinerario}</h2>
          <p className="h-sub">{[grupo.centro, grupo.horarioTexto].filter(Boolean).join(' · ')}</p>
        </div>
        {grupo.linkAsistencia
          ? <Link className="btn btn--primary" href={grupo.linkAsistencia}>Lista de asistencia</Link>
          : <span className="h-sub">Pídele el link a tu administradora.</span>}
      </div>

      <p role="status">
        {grupo.estudiantes.length} niños · {grupo.dictadas} de {grupo.totalClases} clases dictadas
        {grupo.clasesPendientes > 0
          ? ` · ${grupo.clasesPendientes} sin marcar (la más vieja: ${fmtDia(grupo.proximaPendiente)})`
          : ' · asistencia al día'}
      </p>

      <h3 className="label">Niños del grupo</h3>
      {grupo.estudiantes.length === 0
        ? <p>Este grupo todavía no tiene niños. Avísale a tu administradora.</p>
        : <ul className="operational-list">
          {grupo.estudiantes.map((e) => (
            <li key={e.id}>
              {e.nombre} · {e.itinerario} {e.nivel}
              {e.estado === 'baja_potencial' ? ' · baja potencial' : ''}
            </li>
          ))}
        </ul>}

      <h3 className="label">Itinerario</h3>
      {grupo.clases.length === 0
        ? <p>Este grupo aún no tiene itinerario. Pídele a tu administradora que le ponga fecha de inicio y horario.</p>
        : <TableScroller label={`Itinerario del grupo ${grupo.numero}`}>
          <table className="table">
            <thead><tr><th scope="col">Clase</th><th scope="col">Fecha</th><th scope="col">Asistencia</th></tr></thead>
            <tbody>
              {grupo.clases.map((c) => (
                <tr key={c.fecha}>
                  <th scope="row">{[c.corto, c.etiqueta].filter(Boolean).join(' · ')}</th>
                  <td>{fmtDia(c.fecha)}</td>
                  <td>{ESTADO[c.estado]}{c.estado === 'pendiente' ? ` (${c.marcadas} de ${c.total})` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroller>}
    </section>
  )
}

export default function MisGruposPage() {
  const [grupos, setGrupos] = useState(null)
  const [error, setError] = useState('')
  const [intento, setIntento] = useState(0)

  useEffect(() => {
    let activo = true
    setGrupos(null); setError('')
    misGruposCoach()
      .then((res) => { if (activo) setGrupos(res?.grupos || []) })
      .catch(() => { if (activo) setError('No pudimos cargar tus grupos.') })
    return () => { activo = false }
  }, [intento])

  return (
    <div className="shell">
      <Sidebar />
      <main id="main-content" className="main" data-page-state={error ? 'error' : grupos ? 'ready' : 'loading'}>
        <div className="main__head">
          <div className="label">Mi trabajo</div>
          <h1 className="h-title">Mis grupos</h1>
          <p className="h-sub">Tus grupos activos, sus niños y lo que falta por marcar.</p>
        </div>
        {error && <div className="alert alert--error" role="alert">
          {error} <button type="button" className="btn" onClick={() => setIntento((n) => n + 1)}>Reintentar</button>
        </div>}
        {!error && !grupos && <div role="status">Cargando…</div>}
        {grupos?.length === 0 && <div className="alert" role="status">
          Todavía no tienes grupos asignados. Tu administradora te asigna en Grupos y Fusiones.
        </div>}
        {grupos?.map((grupo) => <Grupo key={grupo.id} grupo={grupo} />)}
      </main>
    </div>
  )
}
