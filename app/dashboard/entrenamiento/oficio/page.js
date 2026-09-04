'use client'
// Matriz de gerencia del ENTRENAMIENTO DE OFICIO. Página aparte de
// /dashboard/entrenamiento (los 9 tours): aquella usa matrizProgreso, que
// filtra rol='administradora' y dejaría fuera justo a las asistentes.
//
// Una columna por curso con "x de y" y tres estados por celda:
// pendiente / estudiado / firmado. No importa el catálogo: los metadatos de
// los cursos vienen en la respuesta de la action, así la prosa de los 40
// módulos no entra al bundle.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Sidebar from '../../../../components/Sidebar'
import { matrizOficio } from '../../../actions/entrenamiento-oficio'
import { listCentros } from '../../../actions/centros'

const ROL = { administradora: 'Administradora', asistente: 'Asistente' }

function Celda({ c }) {
  if (!c || c.total === 0) return <td style={{ textAlign: 'center', color: 'var(--text-faint)' }}>—</td>
  const color = c.hatted === c.total ? 'var(--ok)' : c.estudiados > 0 ? 'var(--warn)' : 'var(--text-dim)'
  return (
    <td style={{ textAlign: 'center', color, fontFamily: 'var(--font-mono)' }}
      title={`${c.estudiados} de ${c.total} estudiados · ${c.hatted} con el drill firmado`}>
      {c.hatted} / {c.estudiados} / {c.total}
    </td>
  )
}

export default function EntrenamientoOficioAdminPage() {
  const [data, setData] = useState(null)
  const [centros, setCentros] = useState([])
  const [centroId, setCentroId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => { listCentros().then((c) => setCentros(c || [])).catch(() => {}) }, [])
  useEffect(() => {
    setLoading(true)
    setError(null)
    matrizOficio(centroId ? Number(centroId) : null)
      .then((d) => { if (d?.error) { setError(d.error); setData(null) } else setData(d) })
      .catch(() => { setError('No se pudo cargar el oficio. Recarga la página.'); setData(null) })
      .finally(() => setLoading(false))
  }, [centroId])

  return (
    <div className="shell">
      <Sidebar rol="admin_general" />
      <main className="main">
        <div className="main__head">
          <div>
            <div className="label" style={{ marginBottom: 10 }}>Gerencia · Entrenamiento de oficio</div>
            <h1 className="h-title">Quién tiene su hat</h1>
            <p className="h-sub">
              Cada celda: <b>firmados / estudiados / total</b>. Estudiado lo declara la persona con su quiz aprobado; firmado lo pone su Oficial de
              Entrenamiento después de tomarle el drill. La columna <b>Cola de firmas</b> abre la pantalla donde se toma y se firma, en el centro de esa
              persona. <Link className="tour-card__link" href="/dashboard/entrenamiento">Ver el entrenamiento del sistema (los 9 recorridos)</Link>
            </p>
          </div>
          <select className="input" style={{ width: 240 }} value={centroId} onChange={(e) => setCentroId(e.target.value)} aria-label="Filtrar por centro">
            <option value="">Todos los centros</option>
            {centros.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>

        {loading ? <div className="h-sub">Cargando…</div> : error || !data ? (
          <div className="alert alert--error">{error || 'No se pudo cargar el oficio. Recarga la página.'}</div>
        ) : (
          <div className="panel" style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Persona</th><th>Puesto</th><th>Centro</th><th>Cola de firmas</th>
                  {data.cursos.map((c) => <th key={c.id} title={c.titulo} style={{ textAlign: 'center' }}>{c.titulo}</th>)}
                  <th style={{ textAlign: 'right' }}>Estudiado</th>
                  <th style={{ textAlign: 'right' }}>Hat</th>
                </tr>
              </thead>
              <tbody>
                {data.usuarios.length === 0 && (
                  <tr><td colSpan={data.cursos.length + 6} style={{ textAlign: 'center', padding: 30, color: 'var(--text-dim)' }}>
                    Sin administradoras ni asistentes en este filtro.
                  </td></tr>
                )}
                {data.usuarios.map((u) => (
                  <tr key={u.id}>
                    <td><b>{u.nombre}</b><div className="h-sub" style={{ margin: 0 }}>{u.email}</div></td>
                    <td>{ROL[u.rol] || u.rol}</td>
                    <td>{u.centro}</td>
                    {/* La única pantalla desde la que se firma un drill vive dentro
                        del centro. Desde /dashboard no había ninguna ruta hasta
                        ella: quien firma tenía que escribir la URL. */}
                    <td>
                      {u.centroId
                        ? <Link className="tour-card__link" href={`/centro/${u.centroId}/entrenamiento/firmas`}>Tomar drill <span aria-hidden="true">→</span></Link>
                        : <span style={{ color: 'var(--text-faint)' }}>sin centro</span>}
                    </td>
                    {data.cursos.map((c) => <Celda key={c.id} c={u.porCurso[c.id]} />)}
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: u.avance.pctEstudio === 100 ? 'var(--ok)' : 'var(--text)' }}>{u.avance.pctEstudio}%</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', color: u.avance.pctHat === 100 ? 'var(--ok)' : 'var(--text)' }}>{u.avance.pctHat}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ padding: '10px 16px', color: 'var(--text-dim)', fontSize: 12 }}>
              El plan no es el mismo para los dos puestos: la asistente no lleva el curso del Centro y la administradora no lleva el de Zoho. Un
              guion (—) significa que ese curso no es de su puesto, no que vaya atrasada.
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
