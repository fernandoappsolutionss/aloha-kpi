// Un módulo de oficio, en el orden que manda el método (HCA):
//   1. la masa    → qué tener delante antes de leer
//   2. las palabras → lo que hay que entender para que el texto signifique algo
//   3. el contenido → con el glosario auto-enlazado
//   4. las preguntas → comprobar que se estudió
//   5. el drill    → lo toma y lo firma el Oficial de Entrenamiento
//
// Server Component: la prosa se queda en el servidor. Las islas cliente
// (masa, bloques, quiz, drill) reciben solo lo que pintan.
import Link from 'next/link'
import Sidebar from '../../../../../../components/Sidebar'
import BloquesOficio from '../../../../../../components/entrenamiento/BloquesOficio'
import MasaOficio from '../../../../../../components/entrenamiento/MasaOficio'
import QuizOficio from '../../../../../../components/entrenamiento/QuizOficio'
import PanelDrill from '../../../../../../components/entrenamiento/PanelDrill'
import { getCentroNombre } from '../../../../../actions/centros'
import { cargarOficio } from '../../../../../actions/entrenamiento-oficio'
import { CURSOS, MODULOS_OFICIO, moduloOficio } from '../../../../../../lib/entrenamiento/oficio/catalogo'
import { GLOSARIO } from '../../../../../../lib/entrenamiento/oficio/glosario'
import { minimoAprobacion, estudiado, gradienteAbierto, planDeRol, rolesQueFirma } from '../../../../../../lib/entrenamiento/oficio/progreso'

// Quien FIRMA un módulo puede LEERLO: necesita ver con qué va a evaluar. El
// permiso sale de rolesQueFirma(), que es la regla real — la Administradora es
// la Oficial de Entrenamiento de la Asistente, así que tiene que poder abrir
// los 13 módulos de Zoho y el hat de la asistente para prepararse los drills.
// No lo estudia ni lo responde: solo lee.
const puedeLeerComoOficial = (rol, m) => rolesQueFirma(rol).some((r) => m.roles.includes(r))

export default async function ModuloOficioPage({ params }) {
  const { id, modulo: moduloId } = await params
  const [nombre, oficio] = await Promise.all([
    getCentroNombre(id).catch(() => null),
    cargarOficio(),
  ])

  const base = `/centro/${id}/entrenamiento/oficio`
  const shell = (contenido) => (
    <div className="shell">
      <Sidebar rol="usuario" centroNombre={nombre || 'Centro'} centroId={id} />
      <main className="main ent-page">{contenido}</main>
    </div>
  )
  const volver = <Link className="tour-card__link" href={base}>← Volver a mi hat</Link>

  if (oficio?.error) return shell(<>{volver}<div className="alert alert--error" role="alert">{oficio.error}</div></>)

  const m = moduloOficio(moduloId)
  if (!m) return shell(<>{volver}<div className="alert alert--error" role="alert">Este módulo no existe.</div></>)

  const { rol, progreso, oficiales } = oficio
  const esMio = m.roles.includes(rol)
  const esOficial = puedeLeerComoOficial(rol, m)
  if (!esMio && !esOficial) {
    return shell(<>
      {volver}
      <div className="main__head"><div>
        <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>Entrenamiento de oficio</div>
        <h1 className="h-title">Este módulo no es de tu puesto</h1>
        <p className="h-sub">
          &quot;{m.titulo}&quot; es del entrenamiento de {m.roles.join(' y ')}. No cuenta para tu avance ni te lo van a pedir.
          Tu plan está en tu hat.
        </p>
      </div></div>
    </>)
  }

  const p = progreso[m.id]
  const yaEstudiado = estudiado(p)
  const abierto = gradienteAbierto(m, progreso)
  const anterior = (m.requiere || [])[0] ? moduloOficio(m.requiere[0]) : null
  const plan = planDeRol(rol, MODULOS_OFICIO)
  const idx = plan.findIndex((x) => x.id === m.id)
  const siguiente = idx >= 0 ? plan[idx + 1] : null

  // Solo los términos de ESTE módulo viajan al cliente, no los del glosario entero.
  // Y solo los que de verdad resuelven: si un slug no está en el GLOSARIO no se
  // promete una tarjeta ni un subrayado que después no se pintan.
  const palabrasVivas = (m.palabras || []).filter((slug) => GLOSARIO[slug])
  const terminos = {}
  for (const slug of palabrasVivas) terminos[slug] = GLOSARIO[slug]

  return shell(<>
    {volver}

    <div className="main__head"><div>
      <div className="label" style={{ marginTop: 8, marginBottom: 10 }}>
        {CURSOS[m.curso]?.titulo || 'Oficio'} · Módulo {m.orden} de {plan.length || '—'} · {m.duracionMin} min
      </div>
      <h1 className="h-title">{m.titulo}</h1>
      {m.pfv && <p className="ofi-pfv__inline"><b>Qué producto sostiene esto:</b> {m.pfv}</p>}
      {!esMio && esOficial && (
        <div className="alert alert--warn" role="note">
          Estás leyendo un módulo del puesto de {m.roles.join(' y ')} como Oficial de Entrenamiento. No cuenta para tu avance.
        </div>
      )}
    </div></div>

    {esMio && (m.masa || []).length > 0 && (
      <MasaOficio
        moduloId={m.id}
        masa={m.masa}
        yaEstudiado={Boolean(p?.tourVistoAt)}
        bloqueado={!abierto}
        motivoBloqueo={anterior ? `Antes de marcar este módulo tienes que estudiar "${anterior.titulo}". Puedes leer este texto igual: el método dice devuélvete, no te prohíbe mirar.` : ''}
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
        motivoBloqueo={anterior ? `Antes de responder este módulo tienes que estudiar "${anterior.titulo}". Puedes leer este texto igual: el método dice devuélvete, no te prohíbe mirar.` : ''}
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
      <Link className="btn" href={base}>Volver a mi hat</Link>
      {siguiente && <Link className="btn btn--primary" href={`${base}/${siguiente.id}`}>Siguiente: {siguiente.titulo} <span aria-hidden="true">→</span></Link>}
    </div>
  </>)
}
