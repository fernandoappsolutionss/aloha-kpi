import { AVISO_PRIMER_CICLO } from './planificacion.js'
// Actualización adicional. Los IDs anteriores y sus firmas no cambian.
import { TODO_CARGO } from './roles.js'
import { CONDICIONES, FORMULAS } from '../../../condiciones/formulas.mjs'

const FUENTE = ['planificacion-aloha.md', 'lib/condiciones/formulas.mjs', 'app/centro/[id]/semana/page.js', 'components/semana/PlanSemana.js', 'components/semana/CuotasSemana.js', 'components/semana/AvanceDiario.js', 'components/semana/AlineamientoSemana.js', 'components/semana/JuegosSemana.js', 'components/semana/InformeSemana.js']
const fechas = ['2026-09-03', '2026-09-10', '2026-09-17', '2026-09-24']
const grafica = (titulo, valores, texto, opciones = {}) => ({
  t: 'grafica', titulo, texto, unidad: 'niños',
  puntos: valores.map((valor, i) => ({ semanaFin: fechas[i], valor })), ...opciones,
})
const pregunta = (pregunta, opciones, explicacion, repasa) => ({ pregunta, opciones, explicacion, repasa: [repasa] })
const maniobra = (titulo, pasos, criterios) => ({
  titulo, fuente: FUENTE[1], proposito: 'Demostrar el trabajo con datos, fechas y evidencia verificable.',
  gradiente: 'Completa la lectura y el cuestionario. Ensaya los ejemplos en una hoja, sin guardar datos ficticios. La maniobra final de tu puesto exige trabajo real autorizado y observado por tu jefe entrenador. Si todavía no hay una tarea real válida, espera para ejecutarla y firmarla.',
  masa: ['Los ejemplos de esta lección.', 'Una hoja para dejar la evidencia y las decisiones.'], pasos, criterios,
  errorTipico: 'Dar una opinión sin mostrar el dato, su fecha o la evidencia. El jefe entrenador pide repetir ese paso antes de firmar.',
})
const palabras = ['estadistica-semanal', 'condicion', 'formula-de-la-condicion', 'cuota-semanal', 'plan-de-batalla', 'evidencia']

import { significados, ejemplosFormula } from '../../../condiciones/ayuda.mjs'
const formulas = Object.entries(FORMULAS).flatMap(([clave, pasos]) => {
  const [codigo, variante] = clave.split(':')
  const nombre = CONDICIONES.find((c) => c.codigo === codigo).nombre
  return [
    { t: 'sub', texto: `${nombre}${variante ? ` · ${variante === 'accion' ? 'de acción' : variante}` : ''}` },
    ...(!variante || ['personal', 'accion'].includes(variante) ? [{ t: 'p', texto: significados[codigo] }] : []),
    { t: 'nota', tono: 'regla', titulo: 'Texto oficial de la fórmula', texto: 'Estos son los mismos pasos que encontrarás en Plan de batalla. El ejemplo de después te enseña a aplicarlos y no sustituye estos pasos.' },
    { t: 'pasos', items: pasos, formula: clave },
    { t: 'tabla', titulo: 'Ejemplo pedagógico: un paso convertido en trabajo verificable', encabezados: ['Paso trabajado', 'Objetivo concreto', 'Responsable', 'Fecha', 'Evidencia'], filas: [ejemplosFormula[clave]] },
  ]
})

export const SEMANA = [
  {
    id: 'of-sem-1', curso: 'semana', orden: 100, roles: TODO_CARGO, requiere: ['of-nor-9'], duracionMin: 20,
    titulo: 'Leer una gráfica semanal antes de decidir', fuente: [...FUENTE, 'lib/grafica-semanal.mjs'], palabras,
    sop: {
      "proceso": "Leer una gráfica semanal",
      "cuando": "Antes de interpretar resultados o proponer acciones.",
      "producto": "Una lectura con valores, fechas, fuente y dudas pendientes.",
      "pasos": [
            "Identifica nombre, unidad, período y fuente.",
            "Revisa toda la serie y compara períodos y escalas equivalentes.",
            "Distingue tendencia, recuperación y dirección favorable.",
            "Identifica faltantes y separa semana abierta de cerrada.",
            "Comprueba si la cuota está propuesta o aprobada antes de concluir."
      ],
      "decide": [
            {
                  "situacion": "Falta un dato",
                  "regla": "Conserva el hueco y pide verificarlo; no uses cero ni copies otro período."
            },
            {
                  "situacion": "La serie sube después de caer",
                  "regla": "Compara también con el nivel anterior a la caída."
            }
      ],
      "errores": [
            "Decidir una condición por un único punto.",
            "Confundir un subtotal incompleto con el total."
      ]
},
    pfv: 'Explicas una tendencia con valores, fechas y fuente; distingues un dato faltante, una semana abierta y una cuota sin aprobar.',
    voz: 'Una gráfica sirve para decidir qué hacer, si entiendes qué está midiendo. <break time="0.4s"/> Empieza por el nombre del dato, su unidad y las fechas. <break time="0.4s"/> Después mira la serie completa. Una subida después de una caída puede ser apenas recuperación. <break time="0.4s"/> Un espacio sin dato no vale cero, y una semana abierta todavía puede cambiar. <break time="0.4s"/> Aquí vas a comparar ejemplos con sus números delante. <break time="0.4s"/> Al terminar podrás explicar qué sabes, qué falta comprobar y por qué una propuesta de cuota no es una aprobación.',
    masa: ['Una hoja para anotar valores, fechas y conclusiones.'],
    temario: ['Valores, período y fuente', 'Subida, caída y recuperación', 'Estadísticas inversas y datos faltantes', 'Semana abierta y cuotas aprobadas'],
    laminas: [
      { titulo: 'Lee el dato antes que la forma', items: ['Nombre y unidad.', 'Período y fecha del cálculo.', 'Fuente y cobertura.'] },
      { titulo: 'Una subida necesita contexto', texto: 'Pasar de 10 a 14 mejora el último punto. Si antes había 20, todavía no recuperaste ese nivel.' },
      { titulo: 'Dato, propuesta y aprobación son distintos', texto: 'Sin dato no es cero. Abierta no es cerrada. Una cuota propuesta solo se vuelve aprobada cuando coordinación la aprueba.' },
    ],
    bloques: [
      { t: 'nota', tono: 'ojo', titulo: 'Primer ciclo y fuentes de la ampliación', texto: AVISO_PRIMER_CICLO + ' Fuentes: Estadísticas: definiciones, pp. 1–13; Las fórmulas de las condiciones, pp. 1–3; Guía general del Consejo Asesor, p. 2. Adaptación al funcionamiento vigente de ALOHA KPI.' },
      { t: 'p', texto: 'Todos los números de esta lección son ejemplos pedagógicos. Las cinco estadísticas pertenecen al centro; no son estadísticas personales. El coach aprende con estos ejemplos y aplica lo aprendido a su trabajo autorizado.' },
      { t: 'sub', texto: 'Primero identifica qué estás comparando' },
      { t: 'p', texto: 'Lee nombre, unidad, fechas, fuente y momento del cálculo. Compara semanas de la misma duración y usa la misma escala para comparar inclinaciones. Las estadísticas no negativas parten de cero y muestran su rango de escala. El límite superior puede cambiar con los datos o cuotas: compara los valores y las fechas, no asignes la condición por el ángulo de la línea.' },
      grafica('Subida: 10, 12, 14, 16 niños', [10, 12, 14, 16], 'Hay aumento en las cuatro semanas. Investiga qué acción lo produjo y si se puede sostener antes de elegir una condición.'),
      grafica('Estable: 14, 14, 14, 14 niños', [14, 14, 14, 14], 'La producción se mantiene. Revisa contexto, capacidad y objetivo: una línea plana no demuestra por sí sola que todo esté bien.'),
      grafica('Caída: 16, 14, 12, 10 niños', [16, 14, 12, 10], 'Usa el mismo período y escala que la subida anterior. Aquí se pierden seis niños; identifica las causas y las acciones que te corresponden.'),
      grafica('Recuperación después de una caída', [20, 10, 12, 14], 'El último dato mejora frente a 12, pero 14 todavía está por debajo de 20. Una subida aislada no determina la condición.'),
      grafica('Estadística inversa: retiros', [8, 6, 4, 2], 'Aquí menos es mejor: se retiran menos niños. La gráfica inversa dibuja la mejora hacia arriba aunque el número baja. Verifica también las causas de los retiros.', { inversa: true, unidad: 'retiros' }),
      grafica('Dato faltante: 10, sin dato, 12, 14', [10, null, 12, 14], 'El corte significa que falta información. No unas esos puntos como si conocieras lo ocurrido ni escribas cero para completar la serie.'),
      { t: 'nota', tono: 'regla', titulo: 'Calendario operativo de ALOHA', texto: 'En ALOHA la semana civil va de viernes a jueves, con zona horaria del centro. Condición y plan se preparan antes del viernes a las 10:00. La base teórica describe jueves a las 14:00; esta plataforma usa el corte civil indicado, sin mezclar esos períodos.' },
      { t: 'nota', tono: 'ojo', titulo: 'Historial insuficiente y recuperación', texto: 'La referencia automática necesita cuatro cierres consecutivos con dato. Tener menos registros no demuestra Inexistencia. Una subida que todavía no supera el nivel anterior a la caída se muestra como recuperación y requiere contexto, no como Afluencia automática.' },
      { t: 'sub', texto: 'La semana abierta todavía es provisional' },
      grafica('Tres semanas cerradas y una abierta provisional', [10, 12, 14, 8], 'En este caso de estudio, el 24/09 es una semana todavía abierta con valor parcial 8. No la compares como cierre definitivo contra el 17/09. En el sistema revisa las fechas reales y su zona horaria.'),
      { t: 'p', texto: 'En Semana, las cuotas corresponden a la semana abierta; condición y plan se identifican con la última cerrada. El Panel general distingue esa semana del período mensual o trimestral elegido abajo. Niños puede mostrar el último dato mensual declarado del período, con fecha y fuente: no significa necesariamente el mes anterior ni un mes cerrado. Si las fechas o fuentes difieren, explica esa diferencia antes de comparar.' },
      { t: 'nota', tono: 'ojo', titulo: 'Sin cálculo nuevo no hay resultado nuevo', texto: 'Una semana recién empezada puede no tener cálculo. Un cálculo realizado también puede contener un dato faltante. Comprueba el aviso y la fecha; no copies silenciosamente el valor de la semana anterior. En un consolidado incompleto, el subtotal de centros disponibles no representa el total de todos.' },
      { t: 'sub', texto: 'Cuota propuesta y cuota aprobada' },
      grafica('Cuota propuesta de 16: pendiente de aprobación', [10, 12, 14, 14], 'La propuesta de 16 es un objetivo pendiente de revisión. Todavía no se usa como una cuota aprobada para reconocimiento.'),
      grafica('Cuota aprobada de 16: referencia confirmada', [10, 12, 14, 14], 'Las marcas discontinuas muestran una cuota aprobada de 16 en este ejemplo. En el último cierre, 14 no alcanza 16. Comprueba el estado de aprobación y la semana exacta.', { puntos: [10, 12, 14, 14].map((valor, i) => ({ semanaFin: fechas[i], valor, cuota: 16 })) }),
      { t: 'p', texto: 'Los colores ayudan a localizar cambios; no prueban una causa ni asignan una condición. La lectura automática de ALOHA usa reglas del sistema y también está disponible para la Administradora como apoyo de revisión. Sus umbrales no son texto de las fórmulas oficiales.' },
    ],
    quiz: [
      pregunta('La serie es 20, 10, 12, 14. ¿Qué puedes afirmar?', ['Hay recuperación, pero aún no vuelve a 20', 'Una subida demuestra poder', 'La condición se decide solo con 14'], '14 mejora frente a 12, pero sigue por debajo de 20. Revisa la tendencia y las causas.', 'estadistica-semanal'),
      pregunta('El segundo jueves no tiene registro. ¿Cómo lo lees?', ['Como cero', 'Como dato faltante que hay que verificar', 'Repites el valor anterior'], 'La ausencia de registro no demuestra producción cero ni autoriza copiar otro período.', 'estadistica-semanal'),
      pregunta('En retiros, la serie baja de 8 a 2. ¿Qué significa?', ['Siempre empeora porque baja', 'Demuestra una condición específica', 'Mejora: es una estadística inversa'], 'La dirección favorable depende de qué mide el dato. Menos retiros es mejor.', 'estadistica-semanal'),
      pregunta('Ves 8 en semana abierta y cuota propuesta 16. ¿Qué haces?', ['Declaras incumplimiento definitivo', 'Compruebas fechas, cierre y aprobación antes de concluir', 'Das la cuota por aprobada'], 'Un resultado provisional y una propuesta pendiente no son un cierre contra cuota aprobada.', 'cuota-semanal'),
    ],
    drills: [maniobra('Maniobra 1: explicar tres gráficas sin inventar datos', ['El jefe entrenador elige recuperación, dato faltante e inversa.', 'Anota valores, fechas, unidad y qué falta confirmar en cada ejemplo.', 'Explica abierta frente a cerrada y propuesta frente a aprobada. Entrega la hoja al jefe entrenador para revisión y firma.'], ['Explica el rebote sin asignar condición por un punto.', 'Conserva el dato faltante y explica por qué menos puede ser mejor.', 'Entrega una hoja con las tres lecturas y las comprobaciones pendientes antes de la firma.'])],
  },
  {
    id: 'of-sem-2', curso: 'semana', orden: 101, roles: TODO_CARGO, requiere: ['of-sem-1'], duracionMin: 30,
    titulo: 'Elegir una condición y convertir su fórmula en objetivos', fuente: FUENTE, palabras,
    sop: {
      "proceso": "Convertir una fórmula en objetivos",
      "cuando": "La Administradora lo ejecuta en el centro. Los demás puestos ensayan en una hoja y siguen la práctica de su puesto.",
      "producto": "Cada paso oficial con objetivo, responsable, fecha y evidencia.",
      "pasos": [
            "Confirma qué datos sostienen la condición y qué falta comprobar.",
            "La Administradora elige la condición y su variante cuando corresponda.",
            "La Administradora selecciona la condición y ve su fórmula inmediatamente; explica los datos que la sostienen.",
            "La Administradora escribe en Objetivo para este paso y pulsa Agregar; el primer objetivo guarda también la condición. Completa responsable, fecha y evidencia esperada.",
            "La Administradora revisa las demás secciones y da seguimiento a cada resultado."
      ],
      "decide": [
            {
                  "situacion": "Un paso no tiene objetivo",
                  "regla": "La Administradora completa ese paso con un objetivo concreto."
            },
            {
                  "situacion": "La condición necesita cambiar",
                  "regla": "La Administradora revisa la evidencia y los objetivos que pasarán a Urgentes."
            }
      ],
      "errores": [
            "Reescribir los pasos oficiales como si fueran el objetivo.",
            "Confundir plan completo con trabajo ejecutado."
      ]
},
    pfv: 'Distingues las siete condiciones y sus variantes; conviertes cada paso de la fórmula elegida en objetivos con responsable, fecha y evidencia.',
    voz: 'La condición sirve para orientar el trabajo del centro. <break time="0.4s"/> No es una etiqueta para juzgar a una persona. <break time="0.4s"/> Revisa la tendencia, la calidad del dato y lo que está pasando antes de elegirla. <break time="0.4s"/> Cada condición tiene una fórmula, y aquí leerás sus pasos completos. <break time="0.4s"/> Al seleccionar la condición verás la fórmula inmediatamente. <break time="0.3s"/> Escribe el objetivo debajo de su paso y pulsa Agregar; el primer objetivo guarda también la condición. <break time="0.3s"/> Después completa responsable, fecha, evidencia esperada y el fundamento. <break time="0.4s"/> La fórmula orienta; el objetivo dice qué se va a producir. <break time="0.4s"/> Si falta un objetivo bajo algún paso, el plan todavía está incompleto. <break time="0.4s"/> Usa la flecha hacia Hoy para ejecutar la misma actividad y registrar su evidencia. <break time="0.4s"/> Si cambias de condición, el trabajo pendiente conserva su fórmula y paso de origen para que lo termines.',
    masa: ['La hoja con tu lectura de gráficas del módulo anterior.', 'Una hoja para preparar objetivos con responsable, fecha y evidencia.'],
    temario: ['Siete condiciones y contexto', 'Fórmulas oficiales y variantes', 'Objetivos, responsables y evidencia', 'Quién guarda condición y completa el plan'],
    laminas: [
      { titulo: 'Sin condición significa pendiente', texto: 'Falta asignarla. No describe el valor de una persona ni permite suponer que no produjo.' },
      { titulo: 'Lee la fórmula completa', texto: 'Peligro tiene alcance personal o para el superior. Afluencia tiene variante de acción o financiera. La variante depende de la situación.' },
      { titulo: 'Un paso necesita trabajo verificable', items: ['Qué se va a producir.', 'Quién responde.', 'Para qué fecha.', 'Qué evidencia demuestra que se hizo.'] },
    ],
    bloques: [
      { t: 'nota', tono: 'ojo', titulo: 'Primer ciclo y fuentes de la ampliación', texto: AVISO_PRIMER_CICLO + ' Fuentes: Estadísticas: definiciones, pp. 1–13; Las fórmulas de las condiciones, pp. 1–3; Guía general del Consejo Asesor, p. 2. Adaptación al funcionamiento vigente de ALOHA KPI.' },
      { t: 'p', texto: 'La Administradora revisa los datos, elige y guarda la condición del centro. Coordinación revisa la condición y el plan; las cuotas y los juegos propuestos requieren aprobación. Sin condición significa pendiente de asignación, no un juicio sobre una persona.' },
      { t: 'sub', texto: 'Decide con contexto y conserva la fuente' },
      { t: 'p', texto: 'Las descripciones siguientes orientan la comprensión; no son umbrales automáticos. Mira varias semanas comparables, verifica los datos y averigua qué produjo el cambio. Si la evidencia no alcanza, registra lo que falta comprobar y revísalo con tu jefe. No declares afluencia o poder por una sola subida.' },
      ...formulas,
      { t: 'sub', texto: 'De la fórmula al plan de batalla' },
      { t: 'nota', tono: 'regla', titulo: 'Qué hace cada puesto', texto: 'La Administradora ejecuta los pasos siguientes en el centro. Asistente, coach y coordinación analizan y ensayan el caso en una hoja, sin cambiar registros por estudiar esta lección común. Después cada persona realiza la práctica de su puesto con sus permisos habituales.' },
      { t: 'pasos', items: ['La Administradora confirma la semana cerrada a la que corresponde el plan.', 'La Administradora elige condición y, cuando corresponda, alcance de Peligro o variante de Afluencia. Poder y Cambio de Poder están en Más condiciones.', 'La Administradora ve los pasos oficiales al seleccionar la condición, sin tener que guardarla primero. Abre Explicar y guardar la condición para registrar datos y razonamiento.', 'La Administradora escribe bajo cada paso un objetivo concreto, responsable y fecha, e incluye la evidencia esperada.', 'La Administradora pulsa Agregar bajo el paso: guarda el objetivo y, si es el primero, también la condición seleccionada. Usa → Hoy para trabajar esa misma actividad; revisa las demás secciones en Mis acciones.', 'La Administradora registra en Hoy la acción realizada con Evidencia del resultado, después de completar las acciones de los pasos anteriores. La misma evidencia queda en el paso del plan y en Mi cumplimiento. Coordinación usa Verificar evidencia. Plan preparado no significa objetivos ejecutados ni verificados.'] },
      { t: 'nota', tono: 'ojo', titulo: 'Si cambia la condición', texto: 'La Administradora revisa primero la evidencia. Al guardar otra condición, los objetivos anteriores y los pasos sin acción pasan a Urgentes, conservando condición, semana y paso de origen. Ella completa los recordatorios que no tienen responsable, fecha o evidencia y termina lo pendiente en orden. Ningún puesto cambia una condición real solo para ensayar.' },
    ],
    quiz: [
      pregunta('La pantalla dice Sin condición. ¿Qué significa?', ['Que alguien falló como persona', 'Que falta asignar la condición', 'Que el centro produjo cero'], 'Es un estado pendiente de asignación. No es un juicio ni un resultado numérico.', 'condicion'),
      pregunta('Una lectura automática clasifica una gráfica. ¿Qué relación tiene con la fórmula?', ['Sus umbrales sustituyen los pasos oficiales', 'Obliga a todos los puestos a asignar esa condición', 'Es una regla de ALOHA; hay que revisar evidencia y fórmula oficial'], 'La lectura automática no convierte un umbral del software en doctrina de la fuente.', 'formula-de-la-condicion'),
      pregunta('¿Cuál convierte un paso en un objetivo verificable?', ['Ana confirma las citas el 6 de octubre y conserva el registro de respuestas', 'Mejorar bastante', 'Cumplir la fórmula'], 'El objetivo indica trabajo concreto, responsable, fecha y evidencia.', 'plan-de-batalla'),
      pregunta('Todos los pasos tienen un objetivo guardado. ¿Ya están ejecutados?', ['Sí, guardar equivale a cumplir', 'No: cada objetivo se ejecuta y se verifica con evidencia', 'Solo falta aprobar la condición'], 'Plan completo y objetivos ejecutados son cosas distintas. Las cuotas sí requieren aprobación; la condición la guarda la Administradora.', 'evidencia'),
    ],
    drills: [maniobra('Maniobra 1: pasar una fórmula a objetivos', ['Elige con el jefe entrenador un caso de las gráficas y justifica qué condición estudiarías y qué falta comprobar.', 'Copia la fórmula canónica completa en una hoja. Escribe un objetivo por paso, con responsable, fecha y evidencia.', 'Explica las variantes de Peligro y Afluencia, y qué pasa con objetivos anteriores al cambiar condición. Entrega el plan de ejemplo para revisión y firma.'], ['No elige la condición por un único punto.', 'Respeta todos los pasos oficiales y distingue el ejemplo pedagógico.', 'Cada paso tiene un objetivo con responsable, fecha y evidencia; el jefe entrenador comprueba la hoja antes de firmar.'])],
  },
  {
    id: 'of-sem-adm', curso: 'semana', orden: 102, roles: ['administradora'], requiere: ['of-sem-2'], duracionMin: 30,
    titulo: 'Administradora: de la fórmula a Hoy y al cumplimiento', fuente: FUENTE, palabras,
    sop: {
      proceso: 'Preparar, ejecutar y demostrar la semana',
      cuando: 'Al preparar la semana y al revisar cada día el trabajo del centro.',
      producto: 'Plan fundamentado, cuotas propuestas, acciones con evidencia y cumplimiento listo para revisión.',
      pasos: [
        'En Avance y cuotas, verifica centro, fechas, fuentes y ritmo diario de las cinco estadísticas.',
        'En Condición y fórmula, selecciona condición y variante: aparecen los pasos. Explica los datos que la sostienen.',
        'Escribe en Objetivo para este paso y pulsa Agregar. El primer objetivo guarda también la condición. Completa responsable, fecha y evidencia esperada.',
        'Usa → Hoy en el objetivo original. En Mis acciones, ejecuta en orden y registra Evidencia del resultado antes de Registrar acción realizada.',
        'En Alineamiento, elige resultado y agrega oportunidades con nombre y cantidad. Usa evidencia para marcar una partida hecha.',
        'En Avance y cuotas, abre Metas y cuotas · editar y enviar a coordinación. Guarda las cinco propuestas y comprueba su aprobación posterior.',
        'Si conviene un juego, define meta, participantes, reglas y premio en Juegos. Guarda la propuesta; coordinación aprueba.',
        'En Mi cumplimiento, elige la semana, revisa el informe y pulsa Imprimir / guardar PDF. Recarga y comprueba que los registros persisten.'
      ],
      decide: [
        { situacion: 'La actividad ya existe en un paso de fórmula', regla: 'Usa su flecha → Hoy; no la vuelvas a crear como tarea independiente.' },
        { situacion: 'La cuota o el juego figuran como propuesta', regla: 'Coordina su revisión; todavía no están aprobados.' },
        { situacion: 'El resultado todavía no tiene soporte', regla: 'Conserva la tarea pendiente. Esperada es la prueba que planeas obtener; del resultado es la prueba real conseguida.' }
      ],
      errores: ['Confundir seleccionar una condición con guardar un plan completo.', 'Contar el alineamiento como producción oficial.', 'Practicar con cifras ficticias en un centro real.']
    },
    pfv: 'Preparas la semana basada en el último cierre, ejecutas objetivos desde Hoy con evidencia y presentas un cumplimiento verificable.',
    voz: 'Tu semana tiene cinco secciones. <break time="0.4s"/> Avance y cuotas muestra tus datos automáticos y el ritmo diario. <break time="0.4s"/> En Condición y fórmula, selecciona la condición: aparecen sus pasos. <break time="0.3s"/> Escribe debajo el objetivo y pulsa Agregar. <break time="0.3s"/> El primero guarda también la condición. <break time="0.3s"/> Completa su fundamento, responsable, fecha y evidencia esperada. <break time="0.4s"/> La flecha hacia Hoy lleva esa misma actividad a tu día. <break time="0.3s"/> En Mis acciones registras lo logrado y su evidencia. <break time="0.4s"/> Alineamiento pone nombre y cantidad a tus oportunidades; no aumenta las estadísticas. <break time="0.4s"/> En Juegos propones el reto; coordinación aprueba, igual que las cuotas. <break time="0.4s"/> Mi cumplimiento permite revisar e imprimir o guardar un PDF. <break time="0.3s"/> Imprimir no cierra la semana. <break time="0.4s"/> Ensaya primero en una hoja y demuestra después trabajo real con tu Coordinador.',
    masa: ['Las cinco secciones de Mi semana de tu centro, con fechas visibles.', 'Una hoja para ensayar el caso de Peligro sin cambiar la condición real.', 'Un objetivo real autorizado, su soporte y el informe de esa misma semana.'],
    temario: ['Qué va en cada sección', 'Del paso de fórmula a Hoy y a la evidencia', 'Ritmo diario y alineamiento', 'Juego propuesto y cumplimiento imprimible'],
    laminas: [
      { titulo: 'Cada cosa tiene su lugar', items: ['Avance y cuotas: datos y metas.', 'Condición y fórmula: decidir y preparar.', 'Mis acciones: ejecutar desde Hoy.', 'Mi cumplimiento: revisar e imprimir.', 'Juegos: proponer un reto al equipo.'] },
      { titulo: 'Una actividad, tres vistas', texto: 'El objetivo del paso, Hoy y el cumplimiento comparten la misma actividad y evidencia. La flecha organiza; no duplica ni ejecuta.' },
      { titulo: 'Oportunidad, resultado y aprobación', texto: 'Alineado es trabajo previsto; Hecho exige evidencia. Los resultados oficiales llegan de sus fuentes. Coordinación aprueba cuotas y juegos y verifica acciones.' },
    ],
    bloques: [
      { t: 'nota', tono: 'ojo', titulo: 'Primer ciclo y fuentes de la ampliación', texto: AVISO_PRIMER_CICLO + ' Adaptación al funcionamiento vigente de ALOHA KPI: semana de viernes a jueves en la hora del centro; conserva las fórmulas oficiales.' },
      { t: 'tabla', encabezados: ['Sección', 'Qué haces allí', 'Qué se guarda o se consulta'], filas: [
        ['Avance y cuotas', 'Revisa cada estadística, tabla diaria y fuente. Abre Metas y cuotas para proponer las cinco metas.', 'Los resultados llegan automáticamente; tú guardas las propuestas. Coordinación aprueba.'],
        ['Condición y fórmula', 'Elige condición y variante, explica los datos y escribe objetivos debajo de cada paso. Prepara el alineamiento.', 'El primer Agregar guarda objetivo y condición. Completa el fundamento para dejar el plan preparado.'],
        ['Mis acciones', 'Pasa objetivos a Hoy, organiza hora y registra evidencia. Revisa urgentes, pendientes, órdenes y Ruta de Nivel.', 'La misma actividad se actualiza en el plan. Coordinación verifica después.'],
        ['Mi cumplimiento', 'Elige la semana, revisa resultados, cuotas, condición, acciones, evidencia y alineamiento.', 'Imprime o guarda PDF. En curso es provisional; imprimir no cierra ni aprueba.'],
        ['Juegos', 'Propón nombre, resultado, meta, participantes, reglas y premio.', 'Queda pendiente hasta que coordinación apruebe. El avance llega del sistema.']
      ] },
      { t: 'sub', texto: 'Cómo leer el avance diario' },
      { t: 'p', texto: 'Pulsa una estadística en Avance y cuotas. Para nuevos inscritos y clases de prueba, compara resultado del día, acumulado real y esperado acumulado. La cuota diaria orientativa reparte la semanal entre siete días; no es una nueva cuota que debas cargar. Activos es valor al corte y no se divide entre siete. Retiros y facturas vencidas son máximos: menos es mejor. Un día futuro o Sin dato no significa cero. Los días pasados se reconstruyen con los registros disponibles y pueden cambiar al corregir la fuente.' },
      { t: 'sub', texto: 'De un paso de Peligro a una actividad de Hoy' },
      { t: 'nota', tono: 'ojo', titulo: 'Ensayo en hoja antes de guardar', texto: 'El caso siguiente enseña el recorrido; no diagnostica tu centro. En producción usa la condición real que sostienen los datos. No selecciones Peligro solo para aprobar la maniobra.' },
      { t: 'pasos', items: [
        'En Condición y fórmula, revisa los cierres y elige Peligro y la variante que corresponde. La fórmula aparece inmediatamente. Si hay otra condición guardada, Cambiar abre el selector; conservarás los pendientes anteriores en Urgentes al guardar el cambio.',
        'En el paso 1 escribe en Objetivo para este paso una acción concreta, no una copia de la fórmula. Ejemplo de ensayo: revisar personalmente las confirmaciones pendientes de una clase en riesgo y resolver su causa con el equipo.',
        'Abre Responsable, fecha y evidencia esperada. Anota quién lo hará, el día acordado y la prueba: registro de confirmaciones revisado con fecha y causa resuelta. Pulsa Agregar. Si omites responsable y fecha, quedan a tu nombre y al cierre; revisa esos valores.',
        'El primer objetivo guarda también la condición seleccionada. Abre Explicar y guardar la condición, escribe los datos y el razonamiento y guarda el fundamento. Ver la fórmula o agregar un objetivo no completa todos sus pasos.',
        'Pulsa → Hoy en el objetivo recién agregado. Arriba aparece en Hoy con Fórmula · paso 1. Puedes fijar una hora. No crees otra tarea con el mismo texto.',
        'En Mis acciones, realiza la acción. Si falta evidencia esperada, usa Editar para completarla. Escribe Evidencia del resultado con el resultado real y la referencia que permite comprobarlo. Pulsa Registrar acción realizada.',
        'Recarga y comprueba el mismo estado y evidencia en Hoy, en su paso de fórmula y en Mi cumplimiento. Realizada todavía no significa verificada: coordinación revisa el soporte. Completa los pasos anteriores antes de registrar los siguientes.'
      ] },
      { t: 'tabla', encabezados: ['Campo', 'Qué va allí', 'Ejemplo de ensayo'], filas: [
        ['Objetivo para este paso', 'Acción concreta y resultado que producirás.', 'Revisar las confirmaciones pendientes y resolver la causa de las citas en riesgo.'],
        ['Responsable y fecha', 'Persona que responde y plazo de ejecución.', 'Administradora; día acordado de esta semana.'],
        ['Evidencia esperada', 'Prueba que te propones conseguir y dónde quedará.', 'Registro de confirmaciones con fecha, respuesta y siguiente acción.'],
        ['Evidencia del resultado', 'Lo que efectivamente lograste y referencia comprobable.', 'Indica la cantidad real revisada, las incidencias resueltas y el registro autorizado. No copies una cifra del ejemplo.']
      ] },
      { t: 'nota', tono: 'regla', titulo: 'Agregar en Hoy o quitar de Hoy', texto: 'Una tarea creada directamente en Hoy queda también en Pendientes de la semana. Si pertenece a la fórmula, agrégala debajo del paso y usa la flecha. Quitar de Hoy solo la retira del día: no borra el objetivo semanal. Revisa cada día qué sigue pendiente.' },
      { t: 'sub', texto: 'Alineamiento: de dónde saldrá la cuota' },
      { t: 'pasos', items: [
        'Debajo de la fórmula, en Alineamiento elige Nuevos inscritos o Clases de prueba asistidas. La cuota semanal es la misma de Avance y cuotas; Guardar cuota deja una propuesta para coordinación.',
        'En Producción u Otra partida escribe Cliente, grupo o producto y Cantidad, y pulsa Agregar. Por ejemplo, en un ensayo: familias de la prueba del sábado, cuatro oportunidades. No repitas las mismas oportunidades en ambas partidas.',
        'Alineado suma las cantidades previstas y la cobertura las compara con la cuota. Cuatro oportunidades no garantizan cuatro asistentes ni cuatro matrículas. Prepara en el plan las acciones necesarias y pásalas a Hoy.',
        'Después de lograr la partida, completa Evidencia de la partida y pulsa Marcar partida hecha. Hecho es seguimiento del equipo; no cambia inscritos ni asistencias oficiales. La partida no crea por sí sola una tarea en Hoy.'
      ] },
      { t: 'sub', texto: 'Proponer un juego con sentido' },
      { t: 'p', texto: 'Úsalo para concentrar al equipo en un resultado que pueda influir y hacer visible el avance. En Juegos, elige Semana del juego y completa nombre, Resultado a mejorar, Meta al cierre, Quiénes participan, reglas de qué cuenta y cómo se comprueba, y premio o reconocimiento. Puede ser un reconocimiento sin costo. Ejemplo en hoja: bienvenida a las familias, asistentes a pruebas como resultado y registro de asistencia como comprobación. Adapta la meta a la capacidad real del centro.' },
      { t: 'pasos', items: ['Pulsa Guardar propuesta de juego. Recarga y comprueba Propuesta pendiente. La administradora propone y el coordinador aprueba antes de activarlo.', 'Si editas un juego aprobado, vuelve a propuesta y requiere otra aprobación. Revisa el avance automático y la meta en la misma semana.', 'Al cierre, coordinación comprueba el resultado y organiza el reconocimiento acordado. El sistema no paga premios ni modifica primas. El juego acompaña la fórmula y las cinco cuotas; no las sustituye.'] },
      { t: 'sub', texto: 'Preparar e imprimir el cumplimiento semanal' },
      { t: 'pasos', items: ['Abre Mi cumplimiento y selecciona Semana del informe. Comprueba centro, fechas y si está en curso o cerrada.', 'Revisa las cinco estadísticas y cuotas, condición y fundamento, acciones con su evidencia y alineamiento. Una cuota sin aprobar queda sin evaluar. El informe muestra los registros guardados al consultar.', 'Pulsa Imprimir / guardar PDF y elige impresora o Guardar como PDF en la ventana de impresión. Revisa la vista previa antes de conservarlo; imprimir no cierra la semana ni verifica acciones.', 'Llévalo a la reunión y acuerda correcciones con responsable y fecha. El enlace Cumplimiento mensual es otro informe. Al abrir el siguiente plan se recuperan los pendientes conservando su origen.'] },
      { t: 'enlaces', titulo: 'Abrir las cinco secciones', recursos: [
        { titulo: 'Avance y cuotas', href: '/centro/{centroId}/semana' },
        { titulo: 'Condición y fórmula', href: '/centro/{centroId}/semana/condicion' },
        { titulo: 'Mis acciones', href: '/centro/{centroId}/semana/acciones' },
        { titulo: 'Mi cumplimiento', href: '/centro/{centroId}/semana/cumplimiento' },
        { titulo: 'Juegos', href: '/centro/{centroId}/semana/juegos' }
      ] },
    ],
    quiz: [
      pregunta('¿Cómo llevas a Hoy una acción del paso 1 de Peligro?', ['La agregas bajo el paso y usas → Hoy en ese objetivo', 'La copias en otra tarea y borras el original', 'Marcas la fórmula completa como realizada'], 'La flecha conserva el mismo objetivo, su paso y su evidencia. Elegir Peligro muestra la fórmula; el primer Agregar guarda también la condición.', 'plan-de-batalla'),
      pregunta('Guardaste cuotas y una propuesta de juego. ¿Ya están aprobados?', ['Sí, porque tienen números', 'No: coordinación debe aprobarlos', 'Solo hace falta imprimirlos'], 'Guardar no equivale a aprobar. El juego tiene su aprobación separada de las cuotas.', 'cuota-semanal'),
      pregunta('¿Qué prueba permite registrar una acción realizada?', ['La evidencia que esperabas conseguir, aunque no ocurrió', 'Que la tarea esté en Hoy', 'Lo realmente logrado y una referencia comprobable, después de ejecutar los pasos anteriores'], 'La evidencia esperada prepara el trabajo; la evidencia del resultado demuestra su ejecución. Coordinación verifica después.', 'evidencia'),
      pregunta('Imprimes el cumplimiento de la semana en curso. ¿Qué obtienes?', ['Un informe provisional; imprimir no cierra ni modifica datos', 'Un cierre definitivo', 'La aprobación automática de cuotas y juegos'], 'Comprueba semana y estado. El PDF conserva la consulta y permite revisar las evidencias con coordinación.', 'estadistica-semanal'),
    ],
    drills: [maniobra('Maniobra 1: del paso de fórmula al cumplimiento', [
      'Ensaya primero en una hoja el caso de Peligro: paso 1, objetivo, responsable, fecha, evidencia esperada y resultado que demostrarías. Explica qué condición real corresponde a tu centro sin cambiarla por practicar.',
      'Con el Coordinador, elige una semana y trabajo real autorizado. Revisa las cinco estadísticas, fechas y fuentes; prepara o completa la condición fundamentada y los objetivos reales bajo sus pasos.',
      'Agrega un objetivo real debajo del paso que corresponde, completa sus detalles y usa → Hoy. Muestra que conserva el paso de fórmula; fija una hora si la necesita.',
      'Prepara oportunidades reales de alineamiento y las cinco cuotas propuestas. Recarga y comprueba que cuota y estado coinciden en Avance y cuotas y Alineamiento.',
      'Ejecuta el objetivo real en orden, registra su evidencia desde Hoy y recarga. Muestra que la misma acción queda realizada en el paso del plan y en Mi cumplimiento, pendiente de verificación.',
      'Prepara el juego en una hoja. Si existe un reto real autorizado, guarda su propuesta y recarga para comprobar el estado pendiente; si no, explica al Coordinador los campos y la aprobación usando la hoja, sin crear un juego ficticio.',
      'Selecciona la semana correcta en Mi cumplimiento, revisa sus datos y genera la vista de impresión o guarda el PDF. El Coordinador observa la ejecución, comprueba el soporte, la persistencia y el informe antes de firmar.'
    ], ['Distingue datos automáticos, ritmo diario, oportunidades de alineamiento y cuotas aprobadas.', 'Comprueba al recargar el objetivo real, su paso, Hoy y la misma evidencia en el cumplimiento.', 'Explica la propuesta y aprobación del juego, y presenta un informe del período correcto sin confundir impresión con cierre.'])],
  },
  {
    id: 'of-sem-asi', curso: 'semana', orden: 102, roles: ['asistente'], requiere: ['of-sem-2'], duracionMin: 15,
    titulo: 'Asistente: registrar y verificar los datos de la semana', fuente: [...FUENTE, 'app/centro/[id]/kpi/page.js'], palabras,
    sop: {
      "proceso": "Verificar y entregar datos con soporte",
      "cuando": "Al registrar el período y antes de informar una diferencia.",
      "producto": "Registros verificados y diferencias comunicadas con soporte.",
      "pasos": [
            "Confirma centro, período y soporte del registro.",
            "Usa solo campos habilitados para tu cuenta y datos reales.",
            "Guarda y vuelve a consultar para verificar el resultado.",
            "Compara con Semana y su fecha de cálculo.",
            "Entrega a la Administradora diferencias, soportes y pendientes con responsable y fecha."
      ],
      "decide": [
            {
                  "situacion": "Falta soporte",
                  "regla": "Identifica el faltante y a quién corresponde verificarlo."
            },
            {
                  "situacion": "Tu cuenta no permite la operación",
                  "regla": "Eleva la tarea a la persona autorizada."
            }
      ],
      "errores": [
            "Completar con cero o con otro período.",
            "Usar la cuenta de otra persona."
      ]
},
    pfv: 'Entregas datos con fecha y soporte, identificas faltantes y comunicas diferencias a la Administradora sin asumir decisiones de su puesto.',
    voz: 'La semana se puede leer bien si los datos se registraron bien. <break time="0.4s"/> Tu parte empieza por identificar el centro, la fecha y el soporte de cada registro. <break time="0.4s"/> Cuando algo falta, lo señalas. No lo sustituyes por cero ni por el dato del mes pasado. <break time="0.4s"/> Usa las pantallas que tu cuenta permite y verifica que el registro quedó guardado. <break time="0.4s"/> Si encuentras una diferencia, informa a la Administradora con el dato y su evidencia. <break time="0.4s"/> Ella elige la condición y dirige el plan; tú dejas la información que necesita para decidir.',
    masa: ['Los registros y soportes del período que vas a comprobar.', 'Una hoja con fecha, fuente y diferencias encontradas.'],
    temario: ['Registrar en el período correcto', 'Verificar soportes', 'Distinguir faltantes de cero', 'Comunicar diferencias y dar seguimiento'],
    laminas: [
      { titulo: 'Cada dato tiene fecha y soporte', texto: 'Antes de guardar, confirma centro, período y fuente. Después comprueba lo que quedó registrado.' },
      { titulo: 'Falta un dato: deja visible la falta', texto: 'No copies el mes anterior ni escribas cero por comodidad. Identifica qué soporte falta y quién puede conseguirlo.' },
      { titulo: 'Entrega una diferencia que se pueda revisar', items: ['Dato observado y fecha.', 'Fuente y soporte.', 'Diferencia encontrada.', 'Responsable y fecha para resolverla.'] },
    ],
    bloques: [
      { t: 'nota', tono: 'regla', titulo: 'Tu parte en las cinco secciones', texto: 'En Avance y cuotas comprueba datos, fuentes y ritmo diario. En Mis acciones trabaja lo acordado con la administradora: usa → Hoy en el objetivo existente y entrega evidencia real, sin duplicar la tarea. Mi cumplimiento permite revisar el soporte de la semana. La administradora elige condición y propone juegos; coordinación aprueba cuotas y juegos y verifica acciones. El coach conserva su recorrido de Mis grupos y entrega los soportes de clase.' },
      { t: 'nota', tono: 'ojo', titulo: 'Primer ciclo y fuentes de la ampliación', texto: AVISO_PRIMER_CICLO + ' Fuentes: Estadísticas: definiciones, pp. 1–13; Las fórmulas de las condiciones, pp. 1–3; Guía general del Consejo Asesor, p. 2. Adaptación al funcionamiento vigente de ALOHA KPI.' },
      { t: 'p', texto: 'Tu trabajo sostiene la lectura semanal: registras información autorizada y verificas su calidad. No necesitas lectura automática para detectar que dos datos tienen fechas o fuentes distintas.' },
      { t: 'sub', texto: 'Registra y verifica en la pantalla correcta' },
      { t: 'pasos', items: ['Abre el registro que corresponde a tu tarea: mensual en KPI Mensual, grupos en Grupos y Fusiones o pruebas en Clases de Prueba.', 'Confirma centro, período y soporte antes de usar los campos habilitados para tu cuenta. No cambies otro período para que una cifra coincida.', 'Guarda solo información real autorizada y vuelve a consultar para verificar que quedó registrada.', 'Abre Semana para leer el resultado y la fecha del cálculo. Si el registro y el cálculo difieren, informa esa diferencia con ambos momentos.'] },
      { t: 'sub', texto: 'Lo que falta no vale cero' },
      { t: 'p', texto: 'Si no hay soporte suficiente, anota qué falta y quién lo verificará. Un cero solo se registra cuando el resultado real es cero. No copies un valor mensual en el cierre semanal: el último dato mensual declarado no siempre pertenece al mes anterior ni a un período cerrado.' },
      { t: 'sub', texto: 'Entrega la evidencia a la Administradora' },
      { t: 'p', texto: 'Entrega una relación breve: centro, fecha, dato, fuente, soporte y diferencia. La Administradora elige y guarda la condición, organiza el plan y propone cuotas; coordinación aprueba las cuotas. Cumple los objetivos que te asignen y entrega evidencia. No uses una cuenta ajena para ampliar permisos.' },
      { t: 'enlaces', titulo: 'Registros de tu centro', recursos: [{ titulo: 'KPI Mensual', href: '/centro/{centroId}/kpi' }, { titulo: 'Grupos y Fusiones', href: '/centro/{centroId}/grupos' }, { titulo: 'Clases de Prueba', href: '/centro/{centroId}/eventos' }, { titulo: 'Revisar Semana', href: '/centro/{centroId}/semana' }] },
    ],
    quiz: [
      pregunta('Falta el soporte de un dato del período. ¿Qué haces?', ['Copias el anterior', 'Identificas el faltante y a quién corresponde verificarlo', 'Registras cero'], 'La ausencia de soporte se investiga; no se transforma en un valor inventado.', 'evidencia'),
      pregunta('Dos cifras tienen fuentes o fechas distintas. ¿Qué entregas?', ['Solo la más alta', 'Una condición elegida por ti', 'La diferencia con fechas, fuentes y soportes'], 'Una diferencia trazable permite a la Administradora revisar y decidir.', 'estadistica-semanal'),
      pregunta('Tu cuenta no permite una operación. ¿Qué haces?', ['La elevas a la persona autorizada', 'Pides prestada una cuenta', 'La resuelves alterando otro registro'], 'Cada puesto actúa dentro de sus permisos y eleva lo que corresponde a otro.', 'plan-de-batalla'),
      pregunta('¿Quién elige y guarda la condición del centro?', ['El coach', 'La Administradora', 'Se asigna sola al completar el registro'], 'La Asistente prepara y verifica datos; la Administradora decide la condición y guarda el plan.', 'condicion'),
    ],
    drills: [maniobra('Maniobra 1: registrar y verificar un dato real', ['Ensaya con los ejemplos la diferencia entre período distinto, dato faltante y cero verificado.', 'Con la Administradora, selecciona un registro real pendiente que tu puesto y cuenta estén autorizados a completar; confirma centro, período y soporte.', 'Registra el dato real en la pantalla correspondiente, guarda y recarga para comprobar que quedó persistido.', 'Compara el registro con la fecha y fuente que muestra Semana. Si existe una diferencia, entrégala con soporte y responsable de resolverla; no inventes una para el ejercicio.', 'La Administradora observa la ejecución, verifica el registro y su soporte y firma la maniobra.'], ['Identifica la fecha y la fuente del dato real antes de registrarlo.', 'Registra un dato autorizado y verifica el mismo valor al recargar la pantalla.', 'Entrega el soporte verificable y explica cualquier diferencia sin inventar valores ni usar permisos de otro puesto.'])],
  },
  {
    id: 'of-sem-coa', curso: 'semana', orden: 102, roles: ['coach'], requiere: ['of-sem-2'], duracionMin: 15,
    titulo: 'Coach: aplicar la lectura a tus clases y su evidencia', fuente: ['app/centro/[id]/mis-grupos/page.js', 'app/coach/[token]/page.js', ...FUENTE], palabras,
    sop: {
      "proceso": "Verificar asistencia y reportar incidencias",
      "cuando": "Al revisar las clases y su registro de asistencia.",
      "producto": "Asistencia real registrada e incidencias entregadas con evidencia.",
      "pasos": [
            "Abre Mis grupos y confirma grupo, clase y fecha.",
            "Revisa si figura marcada, pendiente, próxima o sin niños.",
            "Abre la Lista de asistencia asignada y comprueba lo ocurrido.",
            "Registra solo asistencia real y verifica que quedó guardada.",
            "Reporta incidencias a la Administradora con grupo, fecha, hecho y evidencia."
      ],
      "decide": [
            {
                  "situacion": "La asistencia está sin marcar",
                  "regla": "Verifica lo ocurrido; no equivale a ausencia."
            },
            {
                  "situacion": "Falta enlace o itinerario",
                  "regla": "Pídelo a la Administradora; no uses accesos de otro grupo."
            }
      ],
      "errores": [
            "Declarar ausencia porque falta un registro.",
            "Entrar a datos administrativos para completar esta tarea."
      ]
},
    pfv: 'Mantienes asistencia y evidencia de tus clases al día y comunicas incidencias con fechas, sin entrar en datos administrativos.',
    voz: 'Ya sabes leer una tendencia y distinguir un dato faltante de un cero. <break time="0.4s"/> Ahora úsalo en lo que te corresponde: tus grupos y tus clases. <break time="0.4s"/> Abre Mis grupos y revisa qué asistencias faltan por marcar. <break time="0.4s"/> Una asistencia sin registrar no significa que el niño faltó. <break time="0.4s"/> Comprueba lo ocurrido y deja el registro correcto en la lista de asistencia. <break time="0.4s"/> Reporta incidencias a tu Administradora con grupo, fecha y evidencia. <break time="0.4s"/> Ella relacionará esa información con el trabajo del centro y su plan semanal.',
    masa: ['Mis grupos y la lista de asistencia de una clase autorizada.', 'Una hoja con un caso de asistencia pendiente para practicar.'],
    temario: ['Leer tus grupos y fechas', 'Registrar asistencia real', 'Reportar incidencias con evidencia', 'Cumplir los objetivos de tu puesto'],
    laminas: [
      { titulo: 'La gráfica del centro no es una nota personal', texto: 'Las cinco estadísticas corresponden al centro. Tú contribuyes con clases bien dadas, asistencia y evidencia.' },
      { titulo: 'Sin marcar no significa ausente', texto: 'Comprueba la clase y su fecha. Registra lo ocurrido; no completes por suposición.' },
      { titulo: 'Un reporte permite actuar', items: ['Grupo y clase.', 'Fecha y hecho observado.', 'Evidencia.', 'Qué necesitas de la Administradora.'] },
    ],
    bloques: [
      { t: 'nota', tono: 'ojo', titulo: 'Primer ciclo y fuentes de la ampliación', texto: AVISO_PRIMER_CICLO + ' Fuentes: Estadísticas: definiciones, pp. 1–13; Las fórmulas de las condiciones, pp. 1–3; Guía general del Consejo Asesor, p. 2. Adaptación al funcionamiento vigente de ALOHA KPI.' },
      { t: 'p', texto: 'El curso común te ayuda a comprender cómo se revisa el centro. Tu cuenta de coach mantiene sus rutas propias: Mis grupos, la lista de asistencia asignada y Entrenamiento. No necesitas abrir Semana ni datos administrativos para hacer tu trabajo.' },
      { t: 'sub', texto: 'Revisa tus clases y su estado' },
      { t: 'pasos', items: ['Abre Mis grupos y elige el grupo que te corresponde.', 'Revisa fecha, itinerario y estado: Marcada, Falta marcar, Próxima o Sin niños. No conviertas una clase próxima en una clase ya dada.', 'Usa Lista de asistencia del grupo. Si no tiene enlace o itinerario, pídeselo a tu Administradora; no busques el acceso de otro grupo.', 'Comprueba la fecha de clase y registra lo realmente ocurrido. Verifica que quedó guardado y avisa si no puedes completar el registro.'] },
      { t: 'sub', texto: 'Una ausencia y un registro pendiente son distintos' },
      { t: 'p', texto: 'Si una asistencia no se marcó, primero comprueba lo ocurrido. No declares ausencia solo porque falta registro. Para interpretar varias clases compara fechas y el mismo grupo; el ejemplo inverso de retiros enseña que una cifra menor puede ser mejora, pero no crea estadísticas personales ni una condición automática del coach.' },
      { t: 'sub', texto: 'Entrega evidencia y cumple tu parte del plan' },
      { t: 'p', texto: 'Reporta a la Administradora grupo, fecha, hecho observado y evidencia disponible, sin difundir datos del niño fuera del canal autorizado. Si te asigna un objetivo del plan, confirma qué debes producir, para cuándo y cómo se comprobará. Reporta el resultado; la Administradora actualiza el seguimiento que le corresponde.' },
      { t: 'enlaces', titulo: 'Abrir tu trabajo autorizado', recursos: [{ titulo: 'Mis grupos y listas de asistencia', href: '/centro/{centroId}/mis-grupos' }] },
    ],
    quiz: [
      pregunta('Una clase figura Falta marcar. ¿Qué sabes?', ['Que todos faltaron', 'Que se canceló', 'Que falta verificar y registrar la asistencia real'], 'El estado del registro no prueba que los niños hayan faltado.', 'evidencia'),
      pregunta('Necesitas registrar asistencia. ¿Por dónde entras?', ['Mis grupos y su Lista de asistencia', 'El panel administrativo', 'Una cuenta prestada'], 'Usa el enlace del grupo que tienes asignado. Si falta, pídeselo a la Administradora.', 'plan-de-batalla'),
      pregunta('Observas una incidencia repetida. ¿Qué reportas?', ['Una condición personal inventada', 'Grupo, fechas, hechos y evidencia a la Administradora', 'Solo que todo va mal'], 'La evidencia concreta permite relacionar la incidencia con acciones del centro.', 'estadistica-semanal'),
      pregunta('Te asignan un objetivo del plan del centro. ¿Cómo lo cierras?', ['Al decir que lo intentaste', 'Al estudiar la fórmula', 'Produciendo el resultado y entregando evidencia en la fecha acordada'], 'El objetivo se demuestra con el resultado observable, no solo con intención.', 'evidencia'),
    ],
    drills: [maniobra('Maniobra 1: registrar asistencia y reportar con evidencia', ['Ensaya en una hoja la diferencia entre registro faltante y ausencia confirmada.', 'Con tu Administradora, identifica una clase efectivamente dictada de un grupo asignado cuya asistencia real esté pendiente de registrar.', 'Abre Mis grupos y su Lista de asistencia, comprueba fecha y registra lo que realmente ocurrió con tu propia cuenta.', 'Guarda y recarga la lista para verificar la persistencia. Comprueba también el estado que muestra Mis grupos y comunica cualquier diferencia.', 'Entrega a la Administradora la evidencia autorizada del registro y un reporte de incidencias si las hubo. Ella observa la ejecución y comprueba la asistencia guardada antes de firmar.'], ['Abre solamente sus grupos asignados y confirma una clase efectivamente dictada.', 'Registra asistencia real y verifica que persiste al recargar la lista.', 'Entrega evidencia del registro y explica la diferencia entre dato faltante y ausencia confirmada.'])],
  },
  {
    id: 'of-sem-cop', curso: 'semana', orden: 102, roles: ['coordinador'], requiere: ['of-sem-2'], duracionMin: 20,
    titulo: 'Coordinador: verificar ejecución, aprobar cuotas y juegos', fuente: [...FUENTE, 'app/dashboard/reunion-semanal/page.js', 'app/dashboard/ranking/page.js'], palabras,
    sop: {
      "proceso": "Revisar planes y aprobar cuotas",
      "cuando": "En la revisión y reunión semanal de tus centros asignados.",
      "producto": "Planes revisados, cuotas aprobadas y acuerdos verificables.",
      "pasos": [
            "Identifica período, fecha, fuente y cobertura del panel.",
            "Revisa condición, fórmula y objetivos de la semana cerrada.",
            "Confirma responsables, fechas y evidencia de cada compromiso.",
            "Revisa las cinco propuestas de la semana abierta, aprueba y comprueba su estado.",
            "Conduce la reunión y deja acuerdos con responsable y fecha.",
            "Comprueba en Ranking las cinco cuotas aprobadas y cumplidas de la semana cerrada exacta."
      ],
      "decide": [
            {
                  "situacion": "Falta dato de un centro",
                  "regla": "El subtotal disponible no es el total consolidado."
            },
            {
                  "situacion": "Una cuota falta o no está aprobada",
                  "regla": "No corresponde reconocimiento cinco de cinco."
            }
      ],
      "errores": [
            "Mezclar cuotas de diferentes semanas.",
            "Confundir una regla automática con la fórmula oficial."
      ]
},
    pfv: 'Revisas condición y plan con evidencia, apruebas cuotas por semana y conduces la reunión con reconocimiento solo por cinco de cinco.',
    voz: 'Tu revisión empieza por saber qué semana estás mirando y qué datos están disponibles. <break time="0.4s"/> En las cinco secciones de Mi semana revisa condición, objetivos por paso, Hoy y evidencia. <break time="0.4s"/> Las cuotas y los juegos propuestos requieren tu aprobación para la semana correspondiente. <break time="0.4s"/> En Mi cumplimiento revisas e imprimes el informe con evidencia y alineamiento; imprimir no cierra la semana. <break time="0.3s"/> En la reunión revisas resultados y pendientes con responsables y fechas. <break time="0.4s"/> El ranking reconoce las cinco cuotas aprobadas cumplidas en la misma semana cerrada. <break time="0.4s"/> Cuatro de cinco no es cinco de cinco, y una propuesta no reemplaza una aprobación.',
    masa: ['El Panel general y la Reunión semanal de tus centros asignados.', 'Una hoja con cinco cuotas y sus estados para practicar la revisión.'],
    temario: ['Interpretar período, fuente y cobertura', 'Revisar condición y plan', 'Aprobar cuotas por semana', 'Reunión y ranking cinco de cinco'],
    laminas: [
      { titulo: 'Revisa fechas y cobertura', texto: 'Un subtotal con centros sin dato no es el total. El período mensual elegido abajo no cambia la semana operativa de arriba.' },
      { titulo: 'Apruebas cuotas y juegos; verificas evidencia', texto: 'La Administradora guarda condición y plan. Tú los revisas con evidencia y apruebas las cuotas de la semana indicada.' },
      { titulo: 'Cinco de cinco, en la semana cerrada exacta', items: ['Las cinco cuotas están aprobadas.', 'Las cinco están cumplidas.', 'Todos los datos corresponden a ese cierre.'] },
    ],
    bloques: [
      { t: 'nota', tono: 'ojo', titulo: 'Primer ciclo y fuentes de la ampliación', texto: AVISO_PRIMER_CICLO + ' Fuentes: Estadísticas: definiciones, pp. 1–13; Las fórmulas de las condiciones, pp. 1–3; Guía general del Consejo Asesor, p. 2. Adaptación al funcionamiento vigente de ALOHA KPI.' },
      { t: 'p', texto: 'Empieza por tus centros asignados. Una lectura automática sirve como apoyo de revisión, no sustituye la evidencia ni reescribe las fórmulas oficiales. La Administradora elige y guarda condición y plan; la aprobación explícita se aplica a cuotas y juegos. En tu perfil, Tu entrenamiento es tu avance personal; la revisión del equipo muestra a las personas de tus centros asignados, sin mezclar sus firmas con las tuyas.' },
      { t: 'sub', texto: 'Lee el panel con período y fuente' },
      { t: 'pasos', items: ['En Panel general, identifica la semana operativa y la zona horaria de cada centro. La medianoche puede dejar a Panamá y Caracas en semanas diferentes.', 'Lee la cobertura del consolidado. Si falta un centro, usa el subtotal identificado como parcial; no lo interpretes como una caída del total.', 'Separa la semana operativa del selector mensual o trimestral inferior. La tarjeta de niños y las filas muestran el último dato mensual declarado del período con su fecha y fuente, no necesariamente el mes anterior ni cerrado.', 'Entra a Semana del centro asignado para contrastar tendencia, último cálculo, condición y objetivos.'] },
      { t: 'sub', texto: 'Revisa el plan y aprueba las cuotas' },
      { t: 'pasos', items: ['Confirma la semana cerrada del plan y pregunta por la evidencia que sostiene la condición elegida.', 'Verifica objetivos debajo de todos los pasos oficiales y revisa responsables, fechas, pendientes y órdenes. Pide corregir lo que no se puede ejecutar o comprobar.', 'En Avance y cuotas, abre Metas y cuotas · editar y enviar a coordinación, confirma la semana abierta y revisa las cinco propuestas.', 'Pulsa Aprobar cuotas cuando corresponda y verifica el estado aprobado. Un dato ausente se resuelve, no se sustituye por una cuota imaginada.'] },
      { t: 'sub', texto: 'Verifica la ejecución desde Hoy y el cumplimiento' },
      { t: 'pasos', items: ['En Mis acciones pide a la administradora que muestre el objetivo debajo de su paso y en Hoy. Es la misma actividad; no sumes ambas vistas como dos tareas.', 'Comprueba responsable, fecha, evidencia esperada y Evidencia del resultado. Usa Verificar evidencia cuando el soporte demuestre lo ejecutado. No confundas Realizada con Verificada ni con mejora de la estadística.', 'Revisa Alineamiento: oportunidades con nombre y cantidad, sin duplicados. Hecho requiere soporte, pero los resultados oficiales llegan del centro, Clases de Prueba y Zoho.', 'En Mi cumplimiento elige la semana exacta y revisa el informe con la administradora. Imprimir / guardar PDF no cierra la semana ni aprueba cuotas. Conserva las comprobaciones y acuerdos de la revisión.'] },
      { t: 'sub', texto: 'Revisar y aprobar un juego propuesto' },
      { t: 'pasos', items: ['En Juegos del centro asignado, confirma semana, meta, resultado a mejorar, participantes, reglas verificables y premio viable. La administradora propone; tú apruebas antes de activarlo.', 'Si corresponde, pulsa Aprobar juego y recarga para comprobar Aprobado por coordinación. Si faltan ajustes, pídelos a la administradora antes de aprobar. Editar un juego aprobado lo devuelve a propuesta y exige nueva aprobación.', 'Revisa el avance automático y al cierre comprueba el resultado y organiza el reconocimiento acordado. El juego no sustituye las cinco cuotas ni la fórmula, no modifica primas y no paga premios automáticamente.'] },
      { t: 'sub', texto: 'Conduce la reunión y comprueba el reconocimiento' },
      { t: 'pasos', items: ['Abre Reunión semanal y confirma el cierre y los centros revisados. Recorre estadísticas, condición, plan, pendientes y cuotas.', 'Deja los compromisos con responsable, fecha y evidencia esperada. Da seguimiento al resultado, no solo a la promesa.', 'Abre Ranking y comprueba la semana cerrada exacta. El reconocimiento exige las cinco cuotas aprobadas y cumplidas de esa misma semana.', 'Cuatro de cinco, una cuota sin aprobar o un dato faltante no justifican reconocimiento de cinco de cinco. No mezcles cuotas de otra semana para completarlo.'] },
      { t: 'enlaces', titulo: 'Abrir revisión y seguimiento', recursos: [{ titulo: 'Panel general', href: '/dashboard' }, { titulo: 'Avance y cuotas del centro asignado', href: '/centro/{centroId}/semana' }, { titulo: 'Mis acciones y Hoy', href: '/centro/{centroId}/semana/acciones' }, { titulo: 'Mi cumplimiento semanal', href: '/centro/{centroId}/semana/cumplimiento' }, { titulo: 'Juegos del centro', href: '/centro/{centroId}/semana/juegos' }, { titulo: 'Reunión semanal', href: '/dashboard/reunion-semanal' }, { titulo: 'Ranking', href: '/dashboard/ranking' }] },
    ],
    quiz: [
      pregunta('Falta dato de un centro en el consolidado. ¿Qué puedes afirmar?', ['Que el subtotal representa el total', 'Que ese centro produjo cero', 'Que el subtotal corresponde solo a los centros con dato'], 'La cobertura incompleta no permite afirmar un total ni una caída general.', 'estadistica-semanal'),
      pregunta('La Administradora ya guardó condición y plan. ¿Qué requiere aprobación explícita?', ['Las cuotas y el juego propuestos para la semana indicada', 'La existencia de la condición', 'Cada palabra de la fórmula oficial'], 'Coordinación revisa el plan, verifica evidencia y aprueba cuotas y juegos por separado. La condición la guarda la Administradora.', 'cuota-semanal'),
      pregunta('Hay cuatro cuotas cumplidas y la quinta solo propuesta. ¿Corresponde cinco de cinco?', ['Sí, si la propuesta es baja', 'No: deben estar las cinco aprobadas y cumplidas', 'Sí, con la cuota aprobada de otra semana'], 'El ranking exige las cinco aprobadas y cumplidas en la semana cerrada exacta.', 'cuota-semanal'),
      pregunta('El Panel general muestra una cifra mensual y otra semanal distinta. ¿Qué revisas?', ['Solo el color', 'Cambias el registro para igualarlas', 'Período, fuente y fechas de cada cifra'], 'La cifra mensual puede ser el último dato declarado del período; la semanal responde a otro corte y cálculo.', 'estadistica-semanal'),
    ],
    drills: [maniobra('Maniobra 1: revisar un cierre y aprobar cuotas reales', ['Ensaya en una hoja tres casos: cinco cuotas cumplidas y aprobadas, cuatro cumplidas y una cuota sin aprobar. Justifica cuál recibe reconocimiento.', 'Con tu jefe entrenador, selecciona un centro asignado con cinco propuestas reales pendientes y una semana abierta que corresponda revisar.', 'Revisa la condición guardada, la fórmula y los objetivos con evidencia. Resuelve con la Administradora los ajustes necesarios antes de aprobar las cuotas reales.', 'Pulsa Aprobar cuotas, recarga Semana y comprueba el estado aprobado de las cinco en la semana exacta.', 'Conduce la revisión semanal real y deja acuerdos con responsable, fecha y evidencia. Consulta Ranking del último cierre y explica quién cumple cinco de cinco, aunque no haya reconocidos.', 'Comprueba un objetivo real desde su paso, Hoy y Mi cumplimiento. Revisa la evidencia y verifica la acción cuando corresponda. Selecciona la semana del informe y muestra su vista de impresión.', 'Revisa un juego real propuesto y apruébalo si corresponde; si no hay una propuesta válida, ensaya su revisión en hoja sin inventar registros. Explica qué cambia si la administradora edita un juego aprobado.', 'Entrega los acuerdos y la evidencia de aprobación persistida al jefe entrenador, que observa y verifica la ejecución antes de firmar.'], ['Revisa condición y plan con sus fuentes y períodos correctos.', 'Aprueba cinco propuestas reales autorizadas y comprueba su estado al recargar.', 'Entrega acuerdos verificables y solo reconoce cinco cuotas aprobadas y cumplidas del mismo cierre.'])],
  },
]
