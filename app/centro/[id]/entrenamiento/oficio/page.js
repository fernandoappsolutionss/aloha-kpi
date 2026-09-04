// Entrenamiento de OFICIO — la página del hat. Ruta hermana de los 9 tours:
// el segmento estático "oficio" gana sobre el dinámico [modulo], así que
// app/centro/[id]/entrenamiento/[modulo]/page.js no se toca.
//
// Server Component: la prosa del catálogo se queda en el servidor y al
// navegador solo baja lo que se pinta.
import Link from 'next/link'
import Sidebar from '../../../../../components/Sidebar'
import { getCentroNombre } from '../../../../actions/centros'
import { cargarOficio } from '../../../../actions/entrenamiento-oficio'
import { CURSOS } from '../../../../../lib/entrenamiento/oficio/catalogo'
import { estudiado } from '../../../../../lib/entrenamiento/oficio/progreso'

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' }) : ''

export default async function OficioPage({ params }) {
  const { id } = await params
  const [nombre, oficio] = await Promise.all([
    getCentroNombre(id).catch(() => null),
    cargarOficio(),
  ])

  const shell = (contenido) => (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre || 'Centro'} centroId={id} />
      <main className="main ent-page">{contenido}</main>
    </div>
  )

  if (oficio?.error) {
    return shell(<>
      <Link className="tour-card__link" href={`/centro/${id}/entrenamiento`}>← Volver a Entrenamiento</Link>
      <div className="alert alert--error" role="alert">{oficio.error}</div>
    </>)
  }

  const { rol, plan, progreso, avance, drills, siguiente, oficiales } = oficio
  const base = `/centro/${id}/entrenamiento/oficio`
  const quien = (oficiales || []).length > 0
    ? `${oficiales.map((o) => o.nombre).join(' o ')} (${oficiales[0].rolNombre || oficiales[0].rol})`
    : ''

  if (plan.length === 0) {
    return shell(<>
      <Link className="tour-card__link" href={`/centro/${id}/entrenamiento`}>← Volver a Entrenamiento</Link>
      <div className="main__head"><div>
        <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Mi centro · Entrenamiento de oficio</div>
        <h1 className="h-title">El oficio se estudia por puesto</h1>
        <p className="h-sub">Este entrenamiento es de la Administradora del Centro y de la Asistente Administrativo. Tu rol ({rol}) no lleva plan propio: lo tuyo es tomar los drills y firmarlos.</p>
      </div></div>
      <Link className="btn btn--primary" href={`/centro/${id}/entrenamiento/firmas`}>Ver las firmas pendientes <span aria-hidden="true">→</span></Link>
    </>)
  }

  const hat = plan.find((m) => m.curso === 'hat')
  const bloques = ['A', 'B']

  return shell(<>
    <Link className="tour-card__link" href={`/centro/${id}/entrenamiento`}>← Volver a Entrenamiento</Link>

    <div className="main__head"><div>
      <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Mi centro · Entrenamiento de oficio</div>
      <h1 className="h-title">{hat ? hat.titulo : 'Tu oficio'}</h1>
      <p className="h-sub">{nombre || 'Tu centro'} · Estudiar es la mitad. La otra mitad la firma tu Oficial de Entrenamiento cuando te toma el drill.</p>
      {/* El flujo entero dice "pídeselo a tu Oficial de Entrenamiento": aquí se
          dice quién es esa persona, con nombre. Si no hay, es un bloqueo
          operativo y hay que decirlo, no callarlo. */}
      <p className="h-sub" style={{ marginTop: 4 }}>
        {quien
          ? <>Tu Oficial de Entrenamiento: <b>{quien}</b>. Es quien te toma los drills y los firma.</>
          : <>Todavía no tienes un Oficial de Entrenamiento asignado en el sistema. Avísale a gerencia: sin él no puedes cerrar ningún módulo con drill.</>}
      </p>
    </div></div>

    {hat?.pfv && (
      <section className="ofi-pfv" aria-labelledby="pfv-titulo">
        <div className="label">Tu Producto Final Valioso</div>
        <h2 id="pfv-titulo">{hat.pfv}</h2>
        <p className="h-sub">El reto es decirlo sin leerlo. Si no puedes, todavía no es tuyo: vuelve al módulo del hat.</p>
        <Link className="btn btn--primary" href={`${base}/${hat.id}`}>Estudiar mi hat <span aria-hidden="true">→</span></Link>
      </section>
    )}

    <div className="ofi-barras">
      <div>
        <div className="label">Estudiado</div>
        <progress className="ent-start__progress" max={avance.total} value={avance.estudiados} aria-label="Módulos estudiados" />
        <p className="ent-start__note">{avance.estudiados} de {avance.total} · {avance.pctEstudio}%</p>
      </div>
      {/* Sobre los módulos QUE LLEVAN DRILL: los que no llevan cierran solos al
          estudiarlos y llenarían esta barra sin una sola firma. */}
      <div>
        <div className="label">Drills firmados</div>
        <progress className="ent-start__progress" max={drills?.total || 0} value={drills?.firmados || 0} aria-label="Drills firmados por tu Oficial de Entrenamiento" />
        <p className="ent-start__note">
          {drills?.total ? `${drills.firmados} de ${drills.total} drills · ${drills.pct}%` : 'Tu plan no lleva drills.'}
        </p>
      </div>
      <div>
        <div className="label">Tu siguiente paso</div>
        {siguiente
          ? <p style={{ margin: '6px 0 0' }}><Link className="tour-card__link" href={`${base}/${siguiente.id}`}>{siguiente.titulo} <span aria-hidden="true">→</span></Link></p>
          : <p className="h-sub" style={{ margin: '6px 0 0' }}>Estudiaste todo tu plan. Lo que falta lo firma tu Oficial.</p>}
        <p className="ent-start__note"><Link className="tour-card__link" href={`${base}/glosario`}>Glosario de términos</Link></p>
      </div>
    </div>

    <section className="ofi-checksheet" aria-labelledby="checksheet-titulo">
      <h2 id="checksheet-titulo">Tu checksheet</h2>
      <p className="h-sub">El orden no es decorativo: cada módulo abre con el anterior estudiado. Leer siempre se puede; responder sus preguntas, no.</p>
      {bloques.map((b) => {
        const suyos = plan.filter((m) => CURSOS[m.curso]?.bloque === b)
        if (suyos.length === 0) return null
        return (
          <div key={b} className="ofi-checksheet__bloque">
            <div className="label">Bloque {b} · {b === 'A' ? 'antes de tocar nada' : 'tu puesto'}</div>
            <ol className="ofi-checksheet__lista">
              {suyos.map((m) => {
                const p = progreso[m.id]
                const est = estudiado(p)
                const firmadoOk = Boolean(p?.drillFirmadoAt)
                const completo = est && (m.drills === 0 || firmadoOk)
                return (
                  <li key={m.id}>
                    <Link className={`ofi-fila${m.id === siguiente?.id ? ' ofi-fila--siguiente' : ''}`} href={`${base}/${m.id}`}>
                      <span className={`ent-route__number${completo ? ' ent-route__number--done' : ''}`} aria-hidden="true">{completo ? '✓' : m.orden}</span>
                      <span className="ent-route__content">
                        <span className="label">{CURSOS[m.curso]?.titulo} · {m.duracionMin} min</span>
                        <strong>{m.titulo}</strong>
                        <span className="ofi-fila__estados">
                          <span className={`ent-pill${est ? ' ent-pill--ok' : ''}`}>{est ? `✓ Estudiado ${fmt(p.quizAprobadoAt)}` : 'Por estudiar'}</span>
                          {m.drills > 0 && (
                            <span className={`ent-pill${firmadoOk ? ' ent-pill--ok' : est ? ' ent-pill--mid' : ''}`}>
                              {firmadoOk
                                ? `✓ Drill firmado ${fmt(p.drillFirmadoAt)}${p.drillFirmadoPor?.nombre ? ` · ${p.drillFirmadoPor.nombre}` : ''}`
                                : 'Drill sin firmar'}
                            </span>
                          )}
                        </span>
                      </span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                )
              })}
            </ol>
          </div>
        )
      })}
      {plan.length === 0 && <p className="h-sub">El contenido de tu plan todavía no está cargado.</p>}
    </section>
  </>)
}
