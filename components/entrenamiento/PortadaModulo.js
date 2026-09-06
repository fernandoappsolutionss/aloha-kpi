// Portada del módulo: OBJETIVO, TEMAS y las ACTIVIDADES con su restricción —
// la cabecera del Moodle de training.alohavenezuela.com, en clave del
// Entrenamiento en Cubierta.
//
// Server Component a propósito: son títulos y estados, no hay nada que pulsar.
// Así ni el temario ni el objetivo de los 40 módulos entran al bundle del
// navegador, igual que la prosa.
//
// LA RESTRICCIÓN NO SE INVENTA. Cada línea de "No disponible hasta que…" es una
// guarda que app/actions/entrenamiento-oficio.js ya aplica en el servidor:
//   Lección y Cuestionario → gradienteAbierto(): el módulo anterior estudiado
//     (marcarEstudiado y responderQuizOficio devuelven error si no).
//   Maniobra → estudiado(): tour_visto_at Y quiz_aprobado_at (firmarDrill lo exige).
// Si un día se afloja una guarda, esta pantalla miente: se cambian las dos.

const RESTRICCION_DRILL = 'la Lección esté marcada como realizada y el Cuestionario aprobado.'
const RESTRICCION_QUIZ = 'la Lección esté marcada como realizada.'

// El estado de una actividad, con el mismo vocabulario de píldoras del resto
// del entrenamiento (.ent-pill).
function Actividad({ nombre, detalle, estado, tono, restriccion }) {
  return (
    <li className="ofi-portada__act">
      <div className="ofi-portada__act-cab">
        <strong>{nombre}</strong>
        {estado && <span className={`ent-pill${tono ? ` ent-pill--${tono}` : ''}`}>{estado}</span>}
      </div>
      {detalle && <p className="h-sub" style={{ margin: '4px 0 0' }}>{detalle}</p>}
      {restriccion && (
        <p className="ofi-portada__restriccion">
          <span aria-hidden="true">🔒</span> <b>No disponible hasta que:</b> {restriccion}
        </p>
      )}
    </li>
  )
}

export default function PortadaModulo({
  objetivo,
  pfv,
  temario,
  preguntas,
  minimo,
  drills,
  leccionHecha,
  quizAprobado,
  drillFirmado,
  firmadoPor,
  // Texto de la restricción del orden, o '' si el módulo está abierto. Son
  // DOS porque el servidor responde dos frases distintas: "antes de MARCAR este
  // módulo…" (marcarEstudiado) y "antes de RESPONDER este módulo…"
  // (responderQuizOficio). Una sola frase para las dos actividades hacía que la
  // pantalla y el servidor nombraran distinto la misma guarda.
  bloqueoLeccion,
  bloqueoQuiz,
  // Falso cuando quien lee es el jefe entrenador y no el alumno: el
  // módulo no es de su puesto, así que no tiene progreso propio que mostrar.
  esMio,
}) {
  const temas = (temario || []).filter(Boolean)
  // Para el alumno el candado de la maniobra desaparece cuando ya cumplió las
  // dos condiciones. Para el jefe que solo está leyendo el módulo de otro puesto
  // nunca desaparece: ahí la línea no es su estado, es la regla del módulo.
  const drillAbierto = esMio && leccionHecha && quizAprobado
  const restriccionQuiz = [
    bloqueoQuiz,
    esMio && !leccionHecha ? RESTRICCION_QUIZ : '',
  ].filter(Boolean).join(' ')

  return (
    <section className="card ofi-portada" aria-labelledby="ofi-portada-titulo">
      <div className="label" style={{ marginBottom: 6 }}>Objetivo del módulo</div>
      <h2 id="ofi-portada-titulo" className="ofi-portada__objetivo">{objetivo}</h2>
      {pfv && (
        <p className="ofi-pfv__inline"><b>El producto del puesto que esto sostiene:</b> {pfv}</p>
      )}

      {temas.length > 0 && (
        <div className="ofi-portada__temas">
          <div className="label" style={{ marginBottom: 6 }}>Temas del módulo</div>
          <ul className="ofi-portada__lista">
            {temas.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </div>
      )}

      <div className="ofi-portada__temas">
        <div className="label" style={{ marginBottom: 6 }}>
          {/* El pie del Moodle dice "1 Lección, 1 Cuestionario". Aquí la maniobra
              también es una actividad: es lo que cierra el puesto. */}
          1 Lección, {preguntas > 0 ? '1 Cuestionario' : 'sin cuestionario'}
          {drills > 0 ? `, ${drills === 1 ? '1 maniobra' : `${drills} maniobras`}` : ''}
        </div>
        <ul className="ofi-portada__actividades">
          {/* EN REVISIÓN LA PORTADA NO LE HABLA AL ALUMNO. Quien lee esto sin
              ser su puesto ES el jefe entrenador: darle "márcala como
              realizada" o "te la toma tu jefe" es darle instrucciones de
              alumno a quien va a tomar la maniobra. Mismo dato, voz correcta. */}
          <Actividad
            nombre="Lección"
            detalle={esMio
              ? 'Léela con todo a la vista y márcala como realizada.'
              : 'Esto es lo que ella tiene que leer, con todo a la vista, y marcar como realizada.'}
            estado={esMio ? (leccionHecha ? '✓ Realizada' : 'Por hacer') : ''}
            tono={leccionHecha ? 'ok' : ''}
            restriccion={bloqueoLeccion}
          />
          {preguntas > 0 && (
            <Actividad
              nombre="Cuestionario"
              detalle={esMio
                ? `${preguntas} preguntas · necesitas ${minimo} correctas · reintento ilimitado.`
                : `${preguntas} preguntas · las aprueba con ${minimo} correctas · reintento ilimitado.`}
              estado={esMio ? (quizAprobado ? '✓ Aprobado' : 'Por responder') : ''}
              tono={quizAprobado ? 'ok' : ''}
              restriccion={restriccionQuiz}
            />
          )}
          {drills > 0 && (
            <Actividad
              nombre={drills === 1 ? 'Maniobra' : `Maniobra (${drills} ejercicios, una sola firma)`}
              detalle={esMio
                ? 'Te la toma tu jefe entrenador y la firma él, no tú.'
                : 'Este es el ejercicio que TÚ le tomas y firmas, desde la cola de firmas.'}
              estado={esMio ? (drillFirmado ? `✓ Firmado${firmadoPor ? ` por ${firmadoPor}` : ''}` : 'Sin firmar') : ''}
              tono={drillFirmado ? 'ok' : ''}
              // Esta sí es la restricción del Moodle tal cual, y aquí es cierta:
              // firmarDrill() rechaza al alumno que no tenga las dos marcas.
              // Se deja de mostrar en cuanto se cumple: un candado que sigue
              // ahí con la condición ya cumplida enseña a ignorar los candados.
              restriccion={bloqueoLeccion || (drillAbierto ? '' : RESTRICCION_DRILL)}
            />
          )}
        </ul>
        {!esMio && (
          <p className="h-sub" style={{ margin: '10px 0 0' }}>
            Estás viendo el plan de otro puesto: aquí no se marca tu avance. Esto es lo que tiene que cumplir quien lo estudia.
          </p>
        )}
      </div>
    </section>
  )
}
