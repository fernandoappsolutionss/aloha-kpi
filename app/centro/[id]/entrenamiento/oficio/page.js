// Entrenamiento de OFICIO — la página de tu puesto. Ruta hermana de los 9 tours:
// el segmento estático "oficio" gana sobre el dinámico [modulo], así que
// app/centro/[id]/entrenamiento/[modulo]/page.js no se toca.
//
// Server Component: la prosa del catálogo se queda en el servidor y al
// navegador solo baja lo que se pinta.
import Link from 'next/link'
import Sidebar from '../../../../../components/Sidebar'
import { getCentroNombre } from '../../../../actions/centros'
import { cargarOficio } from '../../../../actions/entrenamiento-oficio'
import { CURSOS, BLOQUES, TITULO_BLOQUE, MODULOS_OFICIO } from '../../../../../lib/entrenamiento/oficio/catalogo'
import { estudiado, esDePapel, puedeImprimirPapel, gradienteAbierto } from '../../../../../lib/entrenamiento/oficio/progreso'
import { puertaCerrada } from '../../../../../lib/entrenamiento/oficio/guia-pasos'

const fmt = (iso) => iso ? new Date(iso).toLocaleDateString('es-PA', { day: 'numeric', month: 'short' }) : ''

// El plan mide horas, no minutos: "395 min" no le dice a nadie cuánto es.
// El carril de revisión ya redondeaba a horas enteras (7 h para 6 h 35), que
// para el revisor da igual y para quien lo va a estudiar no: se dicen las dos
// unidades.
const formatoDuracion = (min) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

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

  // LAS HOJAS QUE SE ENTREGAN EN PAPEL. No están en el plan de nadie —planDeRol
  // ignora los módulos con `roles: []`— así que el plan las dejaba fuera y NO
  // HABÍA UN SOLO ENLACE hacia ellas en todo el sistema: of-ase-0 le dice a la
  // Asistente "imprime las seis hojas del paquete desde este sistema" y la
  // única forma de abrirlas era escribir la URL a mano. La máquina estaba
  // completa por detrás (la página de la hoja y su botón de imprimir); faltaba
  // la puerta.
  //
  // Dos candados, y los dos ya existían: puedeImprimirPapel() —la MISMA guarda
  // que aplica la página de destino— dice QUIÉN puede abrirlas, y el curso del
  // plan que se está mirando dice DÓNDE se pintan. Por eso la Administradora no
  // se las encuentra dentro de su propio plan (no lleva el curso del aseo) sino
  // cuando abre el plan de su Asistente, que es de quien son.
  const hojasQuePuedeImprimir = MODULOS_OFICIO
    .filter((m) => esDePapel(m) && puedeImprimirPapel(rol, m, MODULOS_OFICIO))
    .slice()
    .sort((a, b) => a.orden - b.orden)
  const hojasDe = (modulos, bloque) => {
    const cursos = new Set((modulos || []).map((m) => m.curso))
    return hojasQuePuedeImprimir.filter((m) => cursos.has(m.curso) && CURSOS[m.curso]?.bloque === bloque)
  }

  // ── REVISIÓN ────────────────────────────────────────────────────────────
  // ponytail: la revisión vive en ESTA misma ruta con ?revisar=<rol>, no en una
  // /oficio/revision/<rol> propia. El techo: no se puede enlazar un estado más
  // fino que "qué plan estoy mirando". Si la gerencia llega a necesitar dejar
  // notas de revisión o filtrar por curso, eso ya es una ruta con su página.
  // Quien le FIRMA el hat a alguien tiene que poder LEER ese hat. Es la misma
  // prosa, sin nada de lo que es del alumno: no hay barras de avance, no hay
  // "tu siguiente paso", no hay cuestionario y no se firma nada desde aquí.
  //
  // El plan que se revisa se elige con ?revisar=<rol> y se acepta solo si el
  // servidor lo mandó en `revision`. Ya NO basta con `modo === 'revision'`: la
  // Administradora y el Coordinador Operativo tienen plan propio Y revisan
  // planes ajenos, así que su modo es 'entrenamiento' y aun así entran aquí.
  const elegido = (revision || []).find((r) => r.rol === sp?.revisar) || null
  if (elegido || (modo === 'revision' && (revision || []).length > 0)) {
    // Quien tiene plan propio vuelve a SU puesto; quien no, al selector.
    const volverDeRevision = modo === 'entrenamiento'
      ? { href: base, texto: '← Volver a mi puesto' }
      : { href: base, texto: '← Volver a la revisión' }
    const encabezado = (
      <div className="main__head"><div>
        <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Entrenamiento de oficio · Revisión</div>
        <h1 className="h-title">{elegido ? `Plan de ${elegido.rolNombre}` : 'Revisa el entrenamiento de tu gente'}</h1>
        <p className="h-sub">
          {elegido
            ? <>Estás revisando el plan de <b>{elegido.rolNombre}</b>. No es tu entrenamiento: no acumulas progreso, no respondes el cuestionario y la firma de la maniobra se pone en la cola de firmas, después de tomársela a la persona. Los módulos que <b>no</b> están en tu propio plan los lees completos; los que sí, en tu orden.</>
            : <>Como {rolNombre || rol} tú no te entrenas en estos planes: los firmas. Ábrelos en modo lectura para prepararte las maniobras, revisar qué se está enseñando o corregir un módulo.</>}
        </p>
      </div></div>
    )

    if (!elegido) {
      return shell('ready', <>
        <Link className="tour-card__link" href={`/centro/${id}/entrenamiento`}>← Volver a Entrenamiento</Link>
        {encabezado}
        <section className="ofi-checksheet" aria-labelledby="revision-planes">
          <h2 id="revision-planes">Los planes que firmas</h2>
          <ul className="ofi-carril__cursos">
            {revision.map((r) => (
              <li key={r.rol}>
                <span className="label">{r.rolNombre}</span>
                <strong>{r.total} módulos · {r.minutos >= 60 ? `${Math.round(r.minutos / 60)} h` : `${r.minutos} min`} · {r.conDrill} con maniobra</strong>
                <span className="ent-pill">{r.cursos.map((c) => c.titulo).join(' · ')}</span>
                <Link className="btn btn--primary" href={`${base}?revisar=${r.rol}`}>Revisar este plan <span aria-hidden="true">→</span></Link>
              </li>
            ))}
          </ul>
        </section>
        <div className="ofi-nav">
          <Link className="btn" href={`${base}/glosario`}>Glosario de términos</Link>
          <Link className="btn" href={`/centro/${id}/entrenamiento/firmas`}>Firmas pendientes</Link>
          {veMatriz && <Link className="btn" href="/dashboard/entrenamiento/oficio">Quién tiene su puesto tomado</Link>}
        </div>
      </>)
    }

    const suPlan = elegido.plan || []
    return shell('ready', <>
      <Link className="tour-card__link" href={volverDeRevision.href}>{volverDeRevision.texto}</Link>
      {encabezado}
      <div className="alert alert--warn" role="note">
        Estás revisando el plan de {elegido.rolNombre}. Es lectura: nada de lo que abras aquí cuenta como entrenamiento tuyo.
      </div>
      <section className="ofi-checksheet" aria-labelledby="revision-checksheet">
        <h2 id="revision-checksheet">Los {suPlan.length} módulos, en orden</h2>
        <p className="h-sub">El orden no es decorativo: cada módulo abre con el anterior estudiado. Los que llevan maniobra son los que tú le vas a tomar y firmar.</p>
        {BLOQUES.map((b) => {
          const suyos = suPlan.filter((m) => CURSOS[m.curso]?.bloque === b)
          const hojas = hojasDe(suyos, b)
          if (suyos.length === 0 && hojas.length === 0) return null
          return (
            <div key={b} className="ofi-checksheet__bloque">
              {/* En revisión se habla de OTRA persona: "tu puesto" y "lo que
                  entregas" son de ella, no del que revisa. */}
              <div className="label">Bloque {b} · {b === 'B' ? 'su puesto' : b === 'C' ? 'lo que entrega en papel' : TITULO_BLOQUE[b]}</div>
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
                            {m.drills > 0 ? `${m.drills} maniobra${m.drills > 1 ? 's' : ''} que tú firmas` : 'Sin maniobra'}
                          </span>
                          {m.sop && <span className="ent-pill">Hoja SOP</span>}
                        </span>
                      </span>
                      <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ol>
              {hojas.length > 0 && (
                <>
                  <div className="label" style={{ marginTop: 10 }}>
                    Las {hojas.length} hojas del paquete, en papel
                  </div>
                  <p className="h-sub" style={{ marginTop: 0 }}>
                    Esta persona no las estudia en pantalla: las imprime y se las toma a quien no tiene cuenta en el
                    sistema. Ábrelas para verlas o para mandarlas a imprimir tú.
                  </p>
                  <ol className="ofi-checksheet__lista">
                    {hojas.map((m, i) => (
                      <li key={m.id}>
                        <Link className="ofi-fila" href={`${base}/${m.id}`}>
                          <span className="ent-route__number" aria-hidden="true">{i + 1}</span>
                          <span className="ent-route__content">
                            <span className="label">{CURSOS[m.curso]?.titulo} · {m.duracionMin} min</span>
                            <strong>{m.titulo}</strong>
                            <span className="ofi-fila__estados">
                              <span className="ent-pill">Se entrega impresa</span>
                              <span className="ent-pill">Se firma en tinta</span>
                            </span>
                          </span>
                          <span aria-hidden="true">→</span>
                        </Link>
                      </li>
                    ))}
                  </ol>
                </>
              )}
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
        <p className="h-sub">
          Cada puesto tiene su propio plan. El tuyo ({rolNombre || rol}) todavía no lleva uno cargado en el sistema.
        </p>
      </div></div>
      {/* Solo si de verdad le firma a alguien: ofrecerle la cola a quien no
          firma a nadie es mandarlo a una pantalla vacía. */}
      {(oficio.puedeFirmarA || []).length > 0 && (
        <Link className="btn btn--primary" href={`/centro/${id}/entrenamiento/firmas`}>Ver las firmas pendientes <span aria-hidden="true">→</span></Link>
      )}
    </>)
  }

  const hat = plan.find((m) => m.curso === 'hat')
  // El módulo del propio puesto es de los últimos del bloque A: para quien
  // empieza está cerrado. Prometerle ahí su producto y un botón "Estudiar mi
  // puesto" que solo lleva a la puerta es enseñar el final y cerrar la puerta en
  // la misma pantalla. Mientras esté cerrado se dice qué falta y se manda ahí.
  const hatBloqueado = hat ? puertaCerrada(true, gradienteAbierto(hat, progreso), progreso[hat.id]) : false

  // EL TAMAÑO DEL PLAN, DICHO DE FRENTE. El total en horas SOLO lo veía el
  // revisor; al alumno se le daban los minutos módulo a módulo y nunca la
  // suma, así que empezaba sin saber en qué se estaba metiendo y no podía
  // repartirlo. Son horas de ESTUDIO, no un turno: se hacen en tandas, y por
  // eso además del total se le dice un ritmo con el que cabe en la semana.
  const RITMO_MIN_DIA = 20
  const minutosPlan = plan.reduce((n, m) => n + (m.duracionMin || 0), 0)
  const conManiobra = plan.filter((m) => m.drills > 0).length
  const semanasPlan = Math.max(1, Math.round(minutosPlan / (RITMO_MIN_DIA * 5)))

  return shell('ready', <>
    <Link className="tour-card__link" href={`/centro/${id}/entrenamiento`}>← Volver a Entrenamiento</Link>

    <div className="main__head"><div>
      <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Mi centro · Entrenamiento de oficio</div>
      <h1 className="h-title">{hat ? hat.titulo : 'Tu oficio'}</h1>
      <p className="h-sub">{nombre || 'Tu centro'} · Estudiar es la mitad. La otra mitad la firma tu jefe entrenador cuando te toma la maniobra.</p>
      {/* El flujo entero dice "pídesela a tu jefe entrenador": aquí se
          dice quién es esa persona, con nombre. Si no hay, es un bloqueo
          operativo y hay que decirlo, no callarlo. */}
      <p className="h-sub" style={{ marginTop: 4 }}>
        {quien
          ? <>Tu jefe entrenador: <b>{quien}</b>. Es quien te toma las maniobras y las firma.</>
          : <>Todavía no tienes un jefe entrenador asignado en el sistema. Avísale a gerencia: sin él no puedes cerrar ningún módulo con maniobra.</>}
      </p>
      <p className="h-sub" style={{ marginTop: 4 }}>
        Tu plan completo: <b>{plan.length} módulos</b> · {formatoDuracion(minutosPlan)} de estudio · {conManiobra} con maniobra que te toman y te firman.
        {' '}A {RITMO_MIN_DIA} minutos por día son unas {semanasPlan} semanas.
      </p>
    </div></div>

    {hat?.pfv && !hatBloqueado && (
      <section className="ofi-pfv" aria-labelledby="pfv-titulo">
        <div className="label">El producto de tu puesto</div>
        <h2 id="pfv-titulo">{hat.pfv}</h2>
        <p className="h-sub">El reto es decirlo sin leerlo. Si no puedes, todavía no es tuyo: vuelve al módulo de tu puesto.</p>
        <Link className="btn btn--primary" href={`${base}/${hat.id}`}>Estudiar mi puesto <span aria-hidden="true">→</span></Link>
      </section>
    )}
    {hat && hatBloqueado && siguiente && (
      <section className="ofi-pfv" aria-labelledby="pfv-titulo">
        <div className="label">El producto de tu puesto</div>
        <h2 id="pfv-titulo">Lo vas a poder decir en una frase cuando llegues a &quot;{hat.titulo}&quot;.</h2>
        <p className="h-sub">Ese módulo se abre más adelante en tu plan. Empieza por donde te toca y llegas.</p>
        <Link className="btn btn--primary" href={`${base}/${siguiente.id}`}>Seguir por &quot;{siguiente.titulo}&quot; <span aria-hidden="true">→</span></Link>
      </section>
    )}

    <div className="ofi-barras">
      <div>
        <div className="label">Estudiado</div>
        <progress className="ent-start__progress" max={avance.total} value={avance.estudiados} aria-label="Módulos estudiados" />
        <p className="ent-start__note">{avance.estudiados} de {avance.total} · {avance.pctEstudio}%</p>
      </div>
      {/* Sobre los módulos QUE LLEVAN MANIOBRA: los que no llevan cierran solos
          al estudiarlos y llenarían esta barra sin una sola firma. */}
      <div>
        <div className="label">Maniobras firmadas</div>
        <progress className="ent-start__progress" max={drills?.total || 0} value={drills?.firmados || 0} aria-label="Maniobras firmadas por tu jefe entrenador" />
        <p className="ent-start__note">
          {drills?.total ? `${drills.firmados} de ${drills.total} maniobras · ${drills.pct}%` : 'Tu plan no lleva maniobras.'}
        </p>
      </div>
      <div>
        <div className="label">Tu siguiente paso</div>
        {siguiente
          ? <p style={{ margin: '6px 0 0' }}><Link className="tour-card__link" href={`${base}/${siguiente.id}`}>{siguiente.titulo} <span aria-hidden="true">→</span></Link></p>
          : <p className="h-sub" style={{ margin: '6px 0 0' }}>Estudiaste todo tu plan. Lo que falta lo firma tu jefe entrenador.</p>}
        <p className="ent-start__note"><Link className="tour-card__link" href={`${base}/glosario`}>Glosario de términos</Link></p>
      </div>
    </div>

    <section className="ofi-checksheet" aria-labelledby="checksheet-titulo">
      <h2 id="checksheet-titulo">Tu plan</h2>
      <p className="h-sub">Tu plan de puesto, en orden. El orden no es decorativo: cada módulo se abre cuando el anterior queda estudiado. Aquí no se salta ningún paso.</p>
      {BLOQUES.map((b) => {
        const suyos = plan.filter((m) => CURSOS[m.curso]?.bloque === b)
        const hojas = hojasDe(suyos, b)
        if (suyos.length === 0 && hojas.length === 0) return null
        return (
          <div key={b} className="ofi-checksheet__bloque">
            <div className="label">Bloque {b} · {TITULO_BLOQUE[b]}</div>
            <ol className="ofi-checksheet__lista">
              {suyos.map((m) => {
                const p = progreso[m.id]
                const est = estudiado(p)
                const firmadoOk = Boolean(p?.drillFirmadoAt)
                const completo = est && (m.drills === 0 || firmadoOk)
                // MISMA REGLA QUE LA PÁGINA DEL MÓDULO, no una copia: los
                // metadatos del plan traen `requiere`, que es lo único que mira
                // gradienteAbierto. La fila bloqueada SIGUE siendo enlace a
                // propósito: quien pulse tiene que encontrarse la razón, no un
                // clic muerto que parezca que el sistema se rompió.
                const bloqueado = puertaCerrada(true, gradienteAbierto(m, progreso), p)
                return (
                  <li key={m.id}>
                    <Link className={`ofi-fila${bloqueado ? ' ofi-fila--bloqueada' : ''}${m.id === siguiente?.id ? ' ofi-fila--siguiente' : ''}`} href={`${base}/${m.id}`}>
                      <span className={`ent-route__number${completo ? ' ent-route__number--done' : ''}`} aria-hidden="true">{completo ? '✓' : bloqueado ? '🔒' : m.orden}</span>
                      <span className="ent-route__content">
                        <span className="label">{CURSOS[m.curso]?.titulo} · {m.duracionMin} min</span>
                        <strong>{m.titulo}</strong>
                        <span className="ofi-fila__estados">
                          <span className={`ent-pill${est ? ' ent-pill--ok' : ''}`}>{est ? `✓ Estudiado ${fmt(p.quizAprobadoAt)}` : bloqueado ? 'Se abre con el anterior' : 'Por estudiar'}</span>
                          {m.drills > 0 && (
                            <span className={`ent-pill${firmadoOk ? ' ent-pill--ok' : est ? ' ent-pill--mid' : ''}`}>
                              {firmadoOk
                                ? `✓ Maniobra firmada ${fmt(p.drillFirmadoAt)}${p.drillFirmadoPor?.nombre ? ` · ${p.drillFirmadoPor.nombre}` : ''}`
                                : 'Maniobra sin firmar'}
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
            {/* Las hojas van APARTE y sin estado: no se estudian, no llevan
                cuestionario y no cuentan para tu avance. Se abren, se imprimen
                y se firman en tinta con la persona delante. */}
            {hojas.length > 0 && (
              <>
                <div className="label" style={{ marginTop: 10 }}>
                  Las {hojas.length} hojas del paquete, en papel
                </div>
                <p className="h-sub" style={{ marginTop: 0 }}>
                  No se estudian ni cuentan para tu avance. Imprímelas y tómaselas a la persona con ella delante:
                  las dos firman al pie, en tinta, y la hoja va al file del colaborador.
                </p>
                <ol className="ofi-checksheet__lista">
                  {hojas.map((m, i) => (
                    <li key={m.id}>
                      <Link className="ofi-fila" href={`${base}/${m.id}`}>
                        <span className="ent-route__number" aria-hidden="true">{i + 1}</span>
                        <span className="ent-route__content">
                          <span className="label">{CURSOS[m.curso]?.titulo} · {m.duracionMin} min</span>
                          <strong>{m.titulo}</strong>
                          <span className="ofi-fila__estados">
                            <span className="ent-pill">Se entrega impresa</span>
                            <span className="ent-pill">Se firma en tinta</span>
                          </span>
                        </span>
                        <span aria-hidden="true">→</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </div>
        )
      })}
      {plan.length === 0 && <p className="h-sub">El contenido de tu plan todavía no está cargado.</p>}
    </section>

    {/* EL SEGUNDO CARRIL. Quien tiene plan propio Y le firma el hat a alguien
        —la Administradora al Coach y a la Asistente; el Coordinador Operativo a
        los tres— necesita las dos cosas en la misma pantalla. Antes el servidor
        elegía una: el que revisaba perdía su plan, o el que estudiaba perdía la
        lectura de los planes que audita. */}
    {(revision || []).length > 0 && (
      <section className="ofi-checksheet" aria-labelledby="revisa-titulo">
        <h2 id="revisa-titulo">Los planes que tú firmas</h2>
        <p className="h-sub">
          No son tuyos y no cuentan para tu avance: los abres en lectura para prepararte las maniobras que le vas a tomar
          a esa persona y para ver qué se le está enseñando.
        </p>
        <div className="ofi-nav">
          {revision.map((r) => (
            <Link key={r.rol} className="btn" href={`${base}?revisar=${r.rol}`}>
              Plan de {r.rolNombre} · {r.total} módulos
            </Link>
          ))}
          <Link className="btn" href={`/centro/${id}/entrenamiento/firmas`}>Firmas pendientes</Link>
        </div>
      </section>
    )}
  </>)
}
