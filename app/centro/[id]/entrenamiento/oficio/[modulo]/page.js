// Un módulo de oficio, en el orden que manda el método (Entrenamiento en Cubierta):
//   0. la portada  → objetivo, temario y qué actividades trae (con su restricción)
//   1. a la vista  → qué tener delante antes de leer
//   2. las palabras → lo que hay que entender para que el texto signifique algo
//   3. las láminas → la explicación en diapositivas, si el módulo las trae
//   4. el contenido → con el glosario auto-enlazado
//   5. las preguntas → comprobar que se estudió
//   6. la maniobra → te la toma y la firma tu jefe entrenador
//
// Server Component: la prosa se queda en el servidor. Las islas cliente
// (a la vista, bloques, cuestionario, maniobra) reciben solo lo que pintan.
import Link from 'next/link'
import Sidebar from '../../../../../../components/Sidebar'
import BloquesOficio from '../../../../../../components/entrenamiento/BloquesOficio'
import PortadaModulo from '../../../../../../components/entrenamiento/PortadaModulo'
import Diapositivas from '../../../../../../components/entrenamiento/Diapositivas'
import MasaOficio from '../../../../../../components/entrenamiento/MasaOficio'
import QuizOficio from '../../../../../../components/entrenamiento/QuizOficio'
import PanelDrill from '../../../../../../components/entrenamiento/PanelDrill'
import { getCentroNombre } from '../../../../../actions/centros'
import { cargarOficio } from '../../../../../actions/entrenamiento-oficio'
import { CURSOS, MODULOS_OFICIO, moduloOficio, temarioDe, objetivoDe, pfvAparte, laminasDe } from '../../../../../../lib/entrenamiento/oficio/catalogo'
import { GLOSARIO } from '../../../../../../lib/entrenamiento/oficio/glosario'
// La locución del módulo (voz clonada de Fernando). Mismo patrón que la página
// de los tours: si el módulo no tiene clip en el manifest, no se pinta nada.
// Los 40 guiones están escritos y probados; los mp3 se generan aparte con
// `npm run entrenamiento:audio -- --solo oficio` y el manifest los publica.
import manifestVoz from '../../../../../../lib/entrenamiento/audio-manifest-oficio.json'
import { minimoAprobacion, estudiado, gradienteAbierto, planDeRol, rolesQueFirma, nombreDeRol } from '../../../../../../lib/entrenamiento/oficio/progreso'

// Quien FIRMA un módulo puede LEERLO: necesita ver con qué va a evaluar. El
// permiso sale de rolesQueFirma(), que es la regla real — la Administradora es
// la jefa entrenadora de la Asistente, así que tiene que poder abrir
// los 13 módulos de Zoho y el puesto de la asistente para prepararse las maniobras.
// No lo estudia ni lo responde: solo lee.
const puedeLeerComoOficial = (rol, m) => rolesQueFirma(rol).some((r) => m.roles.includes(r))

export default async function ModuloOficioPage({ params, searchParams }) {
  const { id, modulo: moduloId } = await params
  // ?revisar=<rol> lo trae el plan de la REVISIÓN, para que el "volver" y
  // el "siguiente" se queden dentro del plan que se está revisando. Es una
  // preferencia de vista: abajo solo se acepta si el rol pedido es uno de los
  // del módulo, y quién puede leerlo lo sigue decidiendo cargarOficio().
  const sp = searchParams ? await searchParams : {}
  const [nombre, oficio] = await Promise.all([
    getCentroNombre(id).catch(() => null),
    cargarOficio(),
  ])

  const base = `/centro/${id}/entrenamiento/oficio`
  const shell = (estado, contenido) => (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre || 'Centro'} centroId={id} />
      <main className="main ent-page" id="main-content" data-page-state={estado}>{contenido}</main>
    </div>
  )
  const volverAlHat = <Link className="tour-card__link" href={base}>← Volver a mi puesto</Link>

  if (oficio?.error) return shell('error', <>{volverAlHat}<div className="alert alert--error" role="alert">{oficio.error}</div></>)

  const m = moduloOficio(moduloId)
  if (!m) return shell('error', <>{volverAlHat}<div className="alert alert--error" role="alert">Este módulo no existe.</div></>)

  const { rol, progreso, oficiales } = oficio
  const esMio = m.roles.includes(rol)
  const esOficial = puedeLeerComoOficial(rol, m)
  if (!esMio && !esOficial) {
    return shell('error', <>
      {volverAlHat}
      <div className="main__head"><div>
        <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Entrenamiento de oficio</div>
        <h1 className="h-title">Este módulo no es de tu puesto</h1>
        <p className="h-sub">
          &quot;{m.titulo}&quot; es del entrenamiento de {m.roles.join(' y ')}. No cuenta para tu avance ni te lo van a pedir.
          Tu plan está en tu puesto.
        </p>
      </div></div>
    </>)
  }

  const p = progreso[m.id]
  const yaEstudiado = estudiado(p)
  const abierto = gradienteAbierto(m, progreso)
  const anterior = (m.requiere || [])[0] ? moduloOficio(m.requiere[0]) : null
  // EL PLAN QUE SE ESTÁ MIRANDO. Para el alumno es el suyo. Para quien revisa,
  // planDeRol(su rol) es [] —gerencia y coordinador no se entrenan—, y con eso
  // no había "Módulo 15 de …", no había "Siguiente" y revisar los 26 módulos de
  // la Administradora eran 26 idas y vueltas al selector de planes.
  const rolPlan = esMio ? rol : (m.roles.includes(sp?.revisar) ? sp.revisar : m.roles[0])
  const plan = planDeRol(rolPlan, MODULOS_OFICIO)
  // Una sola raíz para las frases de bloqueo de las tres pantallas: la portada y
  // lo que va a la vista hablan de MARCAR el módulo, el cuestionario de RESPONDERLO, que es
  // exactamente lo que contesta el servidor en cada caso (marcarEstudiado y
  // responderQuizOficio). Escribirlas aparte es como se desincronizan.
  const bloqueo = (verbo) => anterior
    ? `Antes de ${verbo} este módulo tienes que estudiar "${anterior.titulo}". Puedes leer este texto igual: el método dice devuélvete, no te prohíbe mirar.`
    : ''
  const bloqueoMarcar = bloqueo('marcar')
  const idx = plan.findIndex((x) => x.id === m.id)
  const siguiente = idx >= 0 ? plan[idx + 1] : null
  // La revisión arrastra su ?revisar= por todos los enlaces internos: sin eso,
  // cada salto devuelve a gerencia al selector de planes.
  const cola = esMio ? '' : `?revisar=${rolPlan}`
  const volver = esMio
    ? volverAlHat
    : <Link className="tour-card__link" href={`${base}${cola}`}>← Volver al plan de {nombreDeRol(rolPlan)}</Link>

  // Solo los términos de ESTE módulo viajan al cliente, no los del glosario entero.
  // Y solo los que de verdad resuelven: si un slug no está en el GLOSARIO no se
  // promete una tarjeta ni un subrayado que después no se pintan.
  const palabrasVivas = (m.palabras || []).filter((slug) => GLOSARIO[slug])
  const terminos = {}
  for (const slug of palabrasVivas) terminos[slug] = GLOSARIO[slug]

  const clipVoz = manifestVoz[`oficio/${m.id}`]

  return shell('ready', <>
    {volver}

    <div className="main__head"><div>
      {/* La portada de cada módulo nombra el método: no hay método nuevo, es la
          misma O·L·A aplicada a un puesto en vez de a un negocio. */}
      <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>
        Entrenamiento en Cubierta · {CURSOS[m.curso]?.titulo || 'Oficio'} · Módulo {m.orden} de {plan.length} · {m.duracionMin} min
      </div>
      <h1 className="h-title">{m.titulo}</h1>
      {!esMio && esOficial && (
        <div className="alert alert--warn" role="note">
          Estás leyendo un módulo del puesto de {m.roles.join(' y ')} como su jefe entrenador. No cuenta para tu avance.
        </div>
      )}
    </div></div>

    {/* La portada va ANTES de lo que va a la vista: la persona tiene que saber
        para qué es este módulo y qué le van a pedir antes de buscar nada. */}
    <PortadaModulo
      objetivo={objetivoDe(m)}
      pfv={pfvAparte(m)}
      temario={temarioDe(m)}
      preguntas={(m.quiz || []).length}
      minimo={(m.quiz || []).length > 0 ? minimoAprobacion(m.quiz.length) : 0}
      drills={(m.drills || []).length}
      leccionHecha={esMio && Boolean(p?.tourVistoAt)}
      quizAprobado={esMio && Boolean(p?.quizAprobadoAt)}
      drillFirmado={esMio && Boolean(p?.drillFirmadoAt)}
      firmadoPor={p?.drillFirmadoPor?.nombre || ''}
      bloqueoLeccion={esMio && !abierto ? bloqueoMarcar : ''}
      bloqueoQuiz={esMio && !abierto ? bloqueo('responder') : ''}
      esMio={esMio}
    />

    {/* La presentación hablada del módulo. Va dentro de un <details> cerrado,
        como en los tours: es opcional y no debe empujar el contenido. */}
    {clipVoz && (
      <details className="card ofi-voz">
        <summary>Escuchar la presentación de este módulo (opcional)</summary>
        <audio
          controls
          preload="none"
          aria-label={`Presentación hablada de ${m.titulo}`}
          src={`/entrenamiento/${clipVoz.file}`}
          style={{ marginTop: 12, width: '100%' }}
        />
      </details>
    )}

    {esMio && (m.masa || []).length > 0 && (
      <MasaOficio
        moduloId={m.id}
        masa={m.masa}
        yaEstudiado={Boolean(p?.tourVistoAt)}
        bloqueado={!abierto}
        motivoBloqueo={bloqueoMarcar}
      />
    )}

    {palabrasVivas.length > 0 && (
      <section className="card ofi-palabras" aria-labelledby="palabras-titulo">
        <div className="label" style={{ marginBottom: 6 }}>Aclara estas palabras primero</div>
        <h2 id="palabras-titulo" style={{ fontSize: 20, margin: '0 0 8px' }}>Lo que tiene que significar algo</h2>
        <p className="h-sub" style={{ marginTop: 0 }}>
          Una sola palabra que pasaste por encima te deja en blanco tres párrafos después. En el texto aparecen subrayadas: púlsalas cuando quieras.
        </p>
        <dl className="ofi-palabras__lista">
          {palabrasVivas.map((slug) => {
            const g = GLOSARIO[slug]
            return (
              <div key={slug}>
                <dt>{g.termino}</dt>
                <dd>{g.que}{g.ejemplo ? <span className="h-sub"> · Ejemplo: {g.ejemplo}</span> : null}</dd>
              </div>
            )
          })}
        </dl>
        <Link className="tour-card__link" href={`${base}/glosario`}>Ver el glosario completo <span aria-hidden="true">→</span></Link>
      </section>
    )}

    {/* Las láminas explican; los bloques son la fuente. Van antes porque
        entrar por la lámina hace que el texto de abajo signifique algo. */}
    <Diapositivas laminas={laminasDe(m)} moduloId={m.id} />

    <section className="card ent-module-card" aria-label="Contenido del módulo">
      <BloquesOficio bloques={m.bloques} terminos={terminos} />
    </section>

    {esMio && (m.quiz || []).length > 0 && (
      <QuizOficio
        moduloId={m.id}
        preguntas={m.quiz.map((q) => ({ pregunta: q.pregunta, opciones: q.opciones }))}
        minimo={minimoAprobacion(m.quiz.length)}
        yaAprobado={Boolean(p?.quizAprobadoAt)}
        tieneDrill={(m.drills || []).length > 0}
        hrefGlosario={`${base}/glosario`}
        bloqueado={!abierto}
        motivoBloqueo={bloqueo('responder')}
      />
    )}

    {(m.drills || []).length > 0 && (
      <PanelDrill
        drills={m.drills}
        indice={m.id}
        usuarioId={null}
        moduloId={m.id}
        moduloTitulo={m.titulo}
        firmadoAt={p?.drillFirmadoAt || null}
        firmadoPor={p?.drillFirmadoPor || null}
        puedoFirmar={false}
        estudiado={yaEstudiado}
        oficiales={esMio ? oficiales : []}
      />
    )}

    <div className="ofi-nav">
      <Link className="btn" href={`${base}${cola}`}>
        {esMio ? 'Volver a mi puesto' : `Volver al plan de ${nombreDeRol(rolPlan)}`}
      </Link>
      {/* LA HOJA DEL PROCESO. Existía la ruta, existían los 35 procedimientos
          escritos y no había un solo enlace: solo se llegaba escribiendo la URL.
          Se ofrece únicamente cuando el módulo declara `sop`: la derivación es la
          red de seguridad del módulo nuevo, no una hoja que se le proponga a
          nadie (en método y puesto imprimiría el temario bajo "Los pasos"). */}
      {m.sop && (
        <Link className="btn" href={`${base}/${m.id}/sop${cola}`}>Hoja del proceso (imprimible)</Link>
      )}
      {siguiente && <Link className="btn btn--primary" href={`${base}/${siguiente.id}${cola}`}>Siguiente: {siguiente.titulo} <span aria-hidden="true">→</span></Link>}
    </div>
  </>)
}
