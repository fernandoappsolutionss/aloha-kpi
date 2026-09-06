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
// reciben solo lo que pintan; la guía progresiva coordina los pasos como una
// isla cliente sobre slots ya renderizados.
import Link from 'next/link'
import Sidebar from '../../../../../../components/Sidebar'
import BloquesOficio from '../../../../../../components/entrenamiento/BloquesOficio'
import PortadaModulo from '../../../../../../components/entrenamiento/PortadaModulo'
import Diapositivas from '../../../../../../components/entrenamiento/Diapositivas'
import MasaOficio from '../../../../../../components/entrenamiento/MasaOficio'
import QuizOficio from '../../../../../../components/entrenamiento/QuizOficio'
import PanelDrill from '../../../../../../components/entrenamiento/PanelDrill'
import GuiaModulo from '../../../../../../components/entrenamiento/GuiaModulo'
import ConceptosOficio from '../../../../../../components/entrenamiento/ConceptosOficio'
import MarcarEstudiado from '../../../../../../components/entrenamiento/MarcarEstudiado'
import { getCentroNombre } from '../../../../../actions/centros'
import { cargarOficio, cargarConceptos } from '../../../../../actions/entrenamiento-oficio'
import { CURSOS, MODULOS_OFICIO, moduloOficio, temarioDe, objetivoDe, pfvAparte, laminasDe } from '../../../../../../lib/entrenamiento/oficio/catalogo'
import { GLOSARIO } from '../../../../../../lib/entrenamiento/oficio/glosario'
import manifestVoz from '../../../../../../lib/entrenamiento/audio-manifest-oficio.json'
import manifestGuia from '../../../../../../lib/entrenamiento/audio-manifest-guia.json'
import { pasosDe, hechosDe, puertaCerrada } from '../../../../../../lib/entrenamiento/oficio/guia-pasos'
import { minimoAprobacion, estudiado, gradienteAbierto, planDeRol, nombreDeRol, esDePapel, rolesDelPapel, puedeImprimirPapel } from '../../../../../../lib/entrenamiento/oficio/progreso'

const QUIZ_SIN_LECCION = 'Antes de responder marca la lección como realizada.'

function clipDePaso(m, pasoId) {
  if (pasoId === 'portada') return manifestVoz[`oficio/${m.id}`]?.file || null
  if (['vista', 'palabras', 'cierre'].includes(pasoId)) return manifestGuia[`guia/${m.id}/${pasoId}`]?.file || null
  if (['laminas', 'lectura', 'preguntas'].includes(pasoId)) return manifestGuia[`guia/general/${pasoId}`]?.file || null
  return null
}

export default async function ModuloOficioPage({ params, searchParams }) {
  const { id, modulo: moduloId } = await params
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

  const { rol, progreso = {}, oficiales = [] } = oficio

  // Los módulos de papel mantienen la salida anterior: no tienen guía digital,
  // conceptos guardados ni progreso en base.
  if (esDePapel(m)) {
    if (!puedeImprimirPapel(rol, m, MODULOS_OFICIO)) {
      return shell('error', <>
        {volverAlHat}
        <div className="main__head"><div>
          <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Entrenamiento de oficio</div>
          <h1 className="h-title">Esta hoja no es de tu puesto</h1>
          <p className="h-sub">
            &quot;{m.titulo}&quot; se entrega impresa y la toma {rolesDelPapel(m, MODULOS_OFICIO).map(nombreDeRol)[0] || 'otro puesto'}.
            Tu plan está en tu puesto.
          </p>
        </div></div>
      </>)
    }
    return shell('ready', <>
      {volverAlHat}
      <div className="main__head"><div>
        <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>
          Entrenamiento en Cubierta · ALOHA · {CURSOS[m.curso]?.titulo || 'Oficio'} · {m.duracionMin} min
        </div>
        <h1 className="h-title">{m.titulo}</h1>
        <p className="h-sub">
          Este módulo se entrega EN PAPEL: la persona no tiene cuenta en el sistema. Imprime la hoja, tómasela con ella
          delante y que firmen las dos al pie. La hoja firmada va al file del colaborador — el sistema no guarda nada de esto.
        </p>
      </div></div>
      <div className="ofi-nav">
        <Link className="btn btn--primary" href={`${base}/${m.id}/sop`}>Abrir la hoja para imprimir <span aria-hidden="true">→</span></Link>
        <Link className="btn" href={base}>Volver a mi puesto</Link>
      </div>
    </>)
  }

  const revisionSolicitada = (oficio.revision || []).find((r) =>
    r.rol === sp?.revisar && (r.plan || []).some((x) => x.id === m.id))
  const revisionDisponible = (oficio.revision || []).find((r) =>
    (r.plan || []).some((x) => x.id === m.id))
  const modoRevision = Boolean(revisionSolicitada)
  const esAlumno = !modoRevision && m.roles.includes(oficio.rol)
  const esOficial = Boolean(revisionSolicitada || revisionDisponible)

  if (!esAlumno && !esOficial) {
    return shell('error', <>
      {volverAlHat}
      <div className="main__head"><div>
        <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Entrenamiento de oficio</div>
        <h1 className="h-title">Este módulo no es de tu puesto</h1>
        <p className="h-sub">
          &quot;{m.titulo}&quot; es del entrenamiento de {m.roles.map(nombreDeRol).join(' y ')}. No cuenta para tu avance ni te lo van a pedir.
          Tu plan está en tu puesto.
        </p>
      </div></div>
    </>)
  }

  // EL MÓDULO ESTÁ EN MI PLAN, revise o no. Es lo que decide la puerta, y no lo
  // cambia ningún parámetro de la URL: `esAlumno` se apaga con ?revisar=, y con
  // eso la Administradora se abría un módulo compartido con la Asistente que
  // ella todavía no puede estudiar. Leerlo como jefa entrenadora no la exime:
  // le toca estudiarlo igual, y en orden.
  const esSuyo = m.roles.includes(oficio.rol)
  const propio = progreso?.[m.id] || {}
  const abiertoParaMi = gradienteAbierto(m, progreso || {})
  const p = esAlumno ? propio : null
  const yaEstudiado = esAlumno ? estudiado(p) : false
  const abierto = esAlumno && abiertoParaMi
  const anterior = (m.requiere || [])[0] ? moduloOficio(m.requiere[0]) : null
  const rolPlan = esAlumno ? oficio.rol : (revisionSolicitada || revisionDisponible).rol
  const plan = planDeRol(rolPlan, MODULOS_OFICIO)
  const idx = plan.findIndex((x) => x.id === m.id)
  const siguiente = idx >= 0 ? plan[idx + 1] : null
  const cola = esAlumno ? '' : `?revisar=${rolPlan}`
  const volver = esAlumno
    ? volverAlHat
    : <Link className="tour-card__link" href={`${base}${cola}`}>← Volver al plan de {nombreDeRol(rolPlan)}</Link>

  // ── LA PUERTA ───────────────────────────────────────────────────────────
  // Hasta hoy este módulo se abría igual y solo se bloqueaban las escrituras:
  // la pantalla decía "puedes leer este texto igual". Se podía saltar el paso,
  // que es justo lo que el orden existe para impedir. Ahora el módulo no se
  // abre, y se dice por qué.
  //
  // Va ANTES de todo lo demás a propósito: sin la puerta abierta no se consulta
  // el progreso de conceptos del alumno ni se arma una línea del contenido.
  if (puertaCerrada(esSuyo, abiertoParaMi, propio)) {
    const falta = anterior?.titulo || 'el módulo anterior de tu plan'
    return shell('bloqueado', <>
      {volverAlHat}
      <div className="main__head"><div>
        <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>
          Entrenamiento en Cubierta · ALOHA · {CURSOS[m.curso]?.titulo || 'Oficio'} · Módulo {m.orden} de {plan.length}
        </div>
        <h1 className="h-title">{m.titulo}</h1>
      </div></div>
      <section className="card ofi-puerta" role="note" aria-labelledby="ofi-puerta-titulo">
        <div className="label">Todavía no</div>
        <h2 id="ofi-puerta-titulo"><span aria-hidden="true">🔒</span> No te saltes el paso</h2>
        <p>
          Este módulo se abre cuando termines <b>&quot;{falta}&quot;</b>.
        </p>
        <p className="h-sub">
          No es un trámite. Cada módulo se para sobre el anterior, y entrar antes de tiempo es lo que hace
          que después no entiendas, te aburras y lo dejes. Termina el que falta y este se abre solo.
        </p>
        <div className="ofi-nav">
          {anterior && (
            <Link className="btn btn--primary" href={`${base}/${anterior.id}`}>
              Ir a &quot;{anterior.titulo}&quot; <span aria-hidden="true">→</span>
            </Link>
          )}
          <Link className="btn" href={base}>Volver a mi plan</Link>
        </div>
      </section>
    </>)
  }

  // El orden ya no se avisa aquí: si estuviera cerrado, no se llega. Lo que sí
  // queda es el candado del cuestionario, que depende de marcar la lección.
  const quizBloqueado = esAlumno && !p?.tourVistoAt

  const laminas = laminasDe(m)
  const palabrasVivas = [...new Set(m.palabras || [])].filter((slug) => GLOSARIO[slug])
  const terminos = {}
  for (const slug of palabrasVivas) terminos[slug] = GLOSARIO[slug]
  const terminosGuia = palabrasVivas.map((slug) => ({ slug, ...GLOSARIO[slug] }))
  const preguntasQuiz = m.quiz || []
  const drills = m.drills || []
  const minimoQuiz = preguntasQuiz.length > 0 ? minimoAprobacion(preguntasQuiz.length) : 0
  const clipVoz = manifestVoz[`oficio/${m.id}`]

  let conceptosIniciales = {}
  if (esAlumno && abierto) {
    const carga = await cargarConceptos(m.id)
    if (carga?.error) return shell('error', <>{volver}<div className="alert alert--error" role="alert">{carga.error}</div></>)
    conceptosIniciales = carga?.conceptos || {}
  }

  const descriptor = {
    vista: (m.masa || []).length,
    palabras: palabrasVivas.length,
    laminas: laminas.length,
    preguntas: preguntasQuiz.length,
    drills: drills.length,
  }
  const pasos = pasosDe(descriptor).map((paso) => ({ ...paso, clip: clipDePaso(m, paso.id) }))
  const hechosServidor = esAlumno ? [...hechosDe(p || {}, conceptosIniciales, palabrasVivas, [])] : []

  const portada = (
    <PortadaModulo
      key="portada"
      objetivo={objetivoDe(m)}
      pfv={pfvAparte(m)}
      temario={temarioDe(m)}
      preguntas={preguntasQuiz.length}
      minimo={minimoQuiz}
      drills={drills.length}
      leccionHecha={esAlumno && Boolean(p?.tourVistoAt)}
      quizAprobado={esAlumno && Boolean(p?.quizAprobadoAt)}
      drillFirmado={esAlumno && Boolean(p?.drillFirmadoAt)}
      firmadoPor={p?.drillFirmadoPor?.nombre || ''}
      bloqueoLeccion=""
      bloqueoQuiz={quizBloqueado ? QUIZ_SIN_LECCION : ''}
      esMio={esAlumno}
    />
  )

  const masa = (m.masa || []).length > 0 ? (
    <MasaOficio
      key="vista"
      moduloId={m.id}
      masa={m.masa}
      yaEstudiado={esAlumno && Boolean(p?.tourVistoAt)}
    />
  ) : null

  const palabrasPreview = palabrasVivas.length > 0 ? (
    <section key="palabras-preview" className="card ofi-palabras" aria-labelledby="palabras-titulo">
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
  ) : null

  const conceptos = palabrasVivas.length > 0 ? (
    <ConceptosOficio key="palabras" moduloId={m.id} terminos={terminosGuia} iniciales={conceptosIniciales} />
  ) : null

  const diapositivas = <Diapositivas key="laminas" laminas={laminas} moduloId={m.id} />
  const lectura = (
    <section key="lectura" className="card ent-module-card" aria-label="Contenido del módulo">
      <BloquesOficio bloques={m.bloques} terminos={terminos} />
      {esAlumno && (
        <MarcarEstudiado
          moduloId={m.id}
          yaEstudiado={Boolean(p?.tourVistoAt)}
        />
      )}
    </section>
  )

  const quiz = esAlumno && preguntasQuiz.length > 0 ? (
    <QuizOficio
      key="preguntas"
      moduloId={m.id}
      preguntas={preguntasQuiz.map((q) => ({ pregunta: q.pregunta, opciones: q.opciones }))}
      minimo={minimoQuiz}
      yaAprobado={Boolean(p?.quizAprobadoAt)}
      tieneDrill={drills.length > 0}
      hrefGlosario={`${base}/glosario`}
      bloqueado={quizBloqueado}
      motivoBloqueo={QUIZ_SIN_LECCION}
    />
  ) : null

  const drill = drills.length > 0 ? (
    <PanelDrill
      key="drill"
      drills={drills}
      indice={m.id}
      usuarioId={null}
      moduloId={m.id}
      moduloTitulo={m.titulo}
      firmadoAt={p?.drillFirmadoAt || null}
      firmadoPor={p?.drillFirmadoPor || null}
      puedoFirmar={false}
      estudiado={yaEstudiado}
      oficiales={esAlumno ? oficiales : []}
    />
  ) : null

  const navegacion = (
    <div key="navegacion" className="ofi-nav">
      <Link className="btn" href={`${base}${cola}`}>
        {esAlumno ? 'Volver a mi puesto' : `Volver al plan de ${nombreDeRol(rolPlan)}`}
      </Link>
      {m.sop && (
        <Link className="btn" href={`${base}/${m.id}/sop${cola}`}>Hoja del proceso (imprimible)</Link>
      )}
      {siguiente && <Link className="btn btn--primary" href={`${base}/${siguiente.id}${cola}`}>Siguiente: {siguiente.titulo} <span aria-hidden="true">→</span></Link>}
    </div>
  )

  const encabezado = (
    <div className="main__head"><div>
      <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>
        Entrenamiento en Cubierta · ALOHA · {CURSOS[m.curso]?.titulo || 'Oficio'} · Módulo {m.orden} de {plan.length} · {m.duracionMin} min
      </div>
      <h1 className="h-title">{m.titulo}</h1>
      {!esAlumno && esOficial && (
        <div className="alert alert--warn" role="note">
          Estás leyendo el plan de {nombreDeRol(rolPlan)} como jefe entrenador. Aquí no se marca tu avance.
        </div>
      )}
    </div></div>
  )

  if (esAlumno && abierto) {
    return shell('ready', <>
      {volver}
      {encabezado}
      <GuiaModulo
        usuarioId={oficio.usuarioId}
        moduloId={m.id}
        pasos={pasos}
        hechosServidor={hechosServidor}
        portada={portada}
        vista={masa}
        palabras={conceptos}
        laminas={diapositivas}
        lectura={lectura}
        preguntas={quiz}
        cierre={<div key="cierre" className="ofi-guia__slot ofi-guia__slot--cierre">{drill}{navegacion}</div>}
      />
    </>)
  }

  return shell('ready', <>
    {volver}
    {encabezado}
    {portada}
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
    {masa}
    {palabrasPreview}
    {diapositivas}
    {lectura}
    {quiz}
    {drill}
    {navegacion}
  </>)
}
