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

export default async function OficioPage({ params, searchParams }) {
  const { id } = await params
  // ?revisar=<rol> solo lo usa la REVISIÓN de gerencia. Es una preferencia de
  // vista, no un permiso: qué planes se pueden abrir lo decide cargarOficio()
  // en el servidor, y abajo se busca el rol pedido DENTRO de esa lista.
  const sp = searchParams ? await searchParams : {}
  const [nombre, oficio] = await Promise.all([
    getCentroNombre(id).catch(() => null),
    cargarOficio(),
  ])

  const shell = (estado, contenido) => (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre || 'Centro'} centroId={id} />
      {/* id + data-page-state: el "Saltar al contenido" de app/layout.js apunta
          a #main-content y sin esto caía al vacío justo en las pantallas del
          oficio (WCAG 2.4.1), y sin data-page-state la ruta no puede entrar al
          barrido R10. */}
      <main className="main ent-page" id="main-content" data-page-state={estado}>{contenido}</main>
    </div>
  )

  if (oficio?.error) {
    return shell('error', <>
      <Link className="tour-card__link" href={`/centro/${id}/entrenamiento`}>← Volver a Entrenamiento</Link>
      <div className="alert alert--error" role="alert">{oficio.error}</div>
    </>)
  }

  const { modo, rol, rolNombre, plan, progreso, avance, drills, siguiente, oficiales, revision, veMatriz } = oficio
  const base = `/centro/${id}/entrenamiento/oficio`
  const quien = (oficiales || []).length > 0
    ? `${oficiales.map((o) => o.nombre).join(' o ')} (${oficiales[0].rolNombre || oficiales[0].rol})`
    : ''

  // ── REVISIÓN ────────────────────────────────────────────────────────────
  // ponytail: la revisión vive en ESTA misma ruta con ?revisar=<rol>, no en una
  // /oficio/revision/<rol> propia. El techo: no se puede enlazar un estado más
  // fino que "qué plan estoy mirando". Si la gerencia llega a necesitar dejar
  // notas de revisión o filtrar por curso, eso ya es una ruta con su página.
  // Gerencia y coordinador no se entrenan aquí, pero tienen que poder LEER el
  // entrenamiento que le dan a su gente. Es la misma prosa, sin nada de lo que
  // es del alumno: no hay barras de avance, no hay "tu siguiente paso", no hay
  // cuestionario y no se firma nada desde esta pantalla.
  if (modo === 'revision' && (revision || []).length > 0) {
    const elegido = (revision || []).find((r) => r.rol === sp?.revisar) || null
    const encabezado = (
      <div className="main__head"><div>
        <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Entrenamiento de oficio · Revisión</div>
        <h1 className="h-title">{elegido ? `Plan de ${elegido.rolNombre}` : 'Revisa el entrenamiento de tu gente'}</h1>
        <p className="h-sub">
          {elegido
            ? <>Estás revisando el plan de <b>{elegido.rolNombre}</b>. No es tu entrenamiento: puedes leer cada módulo completo, pero no acumulas progreso, no respondes el cuestionario y la firma del drill se pone en la cola de firmas, después de tomárselo a la persona.</>
            : <>Como {rolNombre || rol} tú no te entrenas en estos planes: los firmas. Ábrelos en modo lectura para prepararte los drills, revisar qué se está enseñando o corregir un módulo.</>}
        </p>
      </div></div>
    )

    if (!elegido) {
      return shell('ready', <>
        <Link className="tour-card__link" href={`/centro/${id}/entrenamiento`}>← Volver a Entrenamiento</Link>
        {encabezado}
        <section className="ofi-checksheet" aria-labelledby="revision-planes">
          <h2 id="revision-planes">Los dos planes</h2>
          <ul className="ofi-carril__cursos">
            {revision.map((r) => (
              <li key={r.rol}>
                <span className="label">{r.rolNombre}</span>
                <strong>{r.total} módulos · {r.minutos >= 60 ? `${Math.round(r.minutos / 60)} h` : `${r.minutos} min`} · {r.conDrill} con drill</strong>
                <span className="ent-pill">{r.cursos.map((c) => c.titulo).join(' · ')}</span>
                <Link className="btn btn--primary" href={`${base}?revisar=${r.rol}`}>Revisar este plan <span aria-hidden="true">→</span></Link>
              </li>
            ))}
          </ul>
        </section>
        <div className="ofi-nav">
          <Link className="btn" href={`${base}/glosario`}>Glosario de términos</Link>
          <Link className="btn" href={`/centro/${id}/entrenamiento/firmas`}>Firmas pendientes</Link>
          {veMatriz && <Link className="btn" href="/dashboard/entrenamiento/oficio">Quién tiene su hat</Link>}
        </div>
      </>)
    }

    const suPlan = elegido.plan || []
    return shell('ready', <>
      <Link className="tour-card__link" href={base}>← Volver a la revisión</Link>
      {encabezado}
      <div className="alert alert--warn" role="note">
        Estás revisando el plan de {elegido.rolNombre}. Es lectura: nada de lo que abras aquí cuenta como entrenamiento tuyo.
      </div>
      <section className="ofi-checksheet" aria-labelledby="revision-checksheet">
        <h2 id="revision-checksheet">Los {suPlan.length} módulos, en orden</h2>
        <p className="h-sub">El orden no es decorativo: cada módulo abre con el anterior estudiado. Los que llevan drill son los que tú le vas a tomar y firmar.</p>
        {['A', 'B'].map((b) => {
          const suyos = suPlan.filter((m) => CURSOS[m.curso]?.bloque === b)
          if (suyos.length === 0) return null
          return (
            <div key={b} className="ofi-checksheet__bloque">
              <div className="label">Bloque {b} · {b === 'A' ? 'antes de tocar nada' : 'su puesto'}</div>
              <ol className="ofi-checksheet__lista">
                {suyos.map((m) => (
                  <li key={m.id}>
                    {/* El ?revisar= viaja con el enlace: sin él, el módulo no
                        sabe qué plan se está revisando y su "volver" y su
                        "siguiente" devuelven al selector en cada salto. */}
                    <Link className="ofi-fila" href={`${base}/${m.id}?revisar=${elegido.rol}`}>
                      <span className="ent-route__number" aria-hidden="true">{m.orden}</span>
                      <span className="ent-route__content">
                        <span className="label">{CURSOS[m.curso]?.titulo} · {m.duracionMin} min</span>
                        <strong>{m.titulo}</strong>
                        <span className="ofi-fila__estados">
                          <span className="ent-pill">{m.preguntas} preguntas</span>
                          <span className={`ent-pill${m.drills > 0 ? ' ent-pill--mid' : ''}`}>
                            {m.drills > 0 ? `${m.drills} drill${m.drills > 1 ? 's' : ''} que tú firmas` : 'Sin drill'}
                          </span>
                          {m.sop && <span className="ent-pill">Hoja SOP</span>}
                        </span>
                      </span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ol>
            </div>
          )
        })}
      </section>
      <div className="ofi-nav">
        {revision.filter((r) => r.rol !== elegido.rol).map((r) => (
          <Link key={r.rol} className="btn" href={`${base}?revisar=${r.rol}`}>Ver el plan de {r.rolNombre}</Link>
        ))}
        <Link className="btn" href={`${base}/glosario`}>Glosario de términos</Link>
      </div>
    </>)
  }

  if (plan.length === 0) {
    return shell('ready', <>
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

  return shell('ready', <>
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
                          {/* La hoja del proceso, para tenerla al lado mientras se
                              ejecuta. Solo en los módulos que la traen escrita. */}
                          {m.sop && <span className="ent-pill">Hoja SOP</span>}
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
