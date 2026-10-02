// Actualización adicional. Los IDs anteriores y sus firmas no cambian.
import { TODO_CARGO } from './roles.js'
import { CONDICIONES, FORMULAS } from '../../../condiciones/formulas.mjs'

const FUENTE = ['lib/condiciones/formulas.mjs', 'app/centro/[id]/semana/page.js', 'components/semana/PlanSemana.js', 'components/semana/CuotasSemana.js']
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

// Significado orientativo: no es un clasificador ni añade umbrales a la fuente.
const significados = {
  inexistencia: 'Una actividad todavía no tiene una producción establecida o no logra hacerse conocer y entregar lo que se necesita. Averigua qué producto hace falta antes de decidir.',
  peligro: 'Una situación amenaza la continuidad y necesita intervención inmediata. Identifica qué peligro existe y quién debe intervenir; una bajada aislada no basta para declararlo.',
  emergencia: 'La producción se estanca o retrocede y exige actuar para recuperarla. Revisa la tendencia y las causas, no solo el último punto.',
  normal: 'La actividad funciona y mantiene una mejora que puede sostenerse. Identifica qué funciona y corrige los deterioros sin desorganizar lo que entrega resultados.',
  afluencia: 'Hay un aumento marcado de producción. Comprueba que es real, de qué viene y cómo sostenerlo; un rebote desde una caída no demuestra afluencia por sí solo.',
  poder: 'La producción se sostiene en un nivel alto y estable. Requiere continuidad demostrada y una organización que pueda seguir entregando, no una semana excepcional.',
  cambio_poder: 'Una persona recibe un puesto que ya funciona en poder. Antes de modificarlo, entiende sus funciones y comunicaciones; cambiar de persona no demuestra por sí solo esta condición.',
}
const ejemplosFormula = {
  inexistencia: ['Encontrar una línea de comunicación', 'Identificar al responsable de cada escuela aliada y concertar una conversación sobre sus necesidades.', 'Administradora', '2026-10-05', 'Directorio verificado y citas confirmadas.'],
  'peligro:personal': ['Pasar por alto hábitos o rutinas normales', 'Reorganizar la primera hora de trabajo para atender las tres incidencias que impiden dar clase.', 'Administradora', '2026-10-02', 'Registro de incidencias atendidas y servicio restablecido.'],
  'peligro:superior': ['Resolver personalmente la situación', 'Intervenir en el centro sin cobertura de clase y confirmar un reemplazo autorizado antes del inicio.', 'Coordinador', '2026-10-02', 'Confirmación del reemplazo y clase efectivamente atendida.'],
  emergencia: ['Promocionar o producir', 'Contactar a las diez familias que pidieron información y confirmar las citas de prueba posibles.', 'Administradora', '2026-10-06', 'Registro de contactos, respuestas y citas confirmadas.'],
  normal: ['Investigar qué mejoró la estadística', 'Revisar las altas de cuatro semanas e identificar cuáles vinieron del seguimiento a clases de prueba.', 'Administradora', '2026-10-06', 'Relación de altas con su origen y decisión de mantener la acción comprobada.'],
  'afluencia:financiera': ['Economizar', 'Revisar gastos previstos y retirar compras duplicadas antes de comprometer el excedente.', 'Administradora', '2026-10-07', 'Comparación de presupuesto original y corregido, con soportes.'],
  'afluencia:accion': ['Economizar acciones dispersas', 'Comparar actividades de captación y concentrar el horario en las que produjeron citas verificadas.', 'Administradora', '2026-10-07', 'Agenda ajustada y registro que justifica qué acciones se conservaron.'],
  poder: ['No desconectarse', 'Documentar los contactos que sostienen el servicio y acordar cómo se mantendrá su atención.', 'Coordinador', '2026-10-08', 'Registro de comunicaciones con responsables y continuidad confirmada.'],
  cambio_poder: ['Conocer el puesto antes de cambiarlo', 'Recorrer con la persona saliente cada función y observar su ejecución antes de proponer cambios.', 'Administradora entrante', '2026-10-08', 'Entrega del puesto documentada, dudas resueltas y funciones verificadas.'],
}
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
    masa: ['Las gráficas y tablas de ejemplo de esta lección.', 'Una hoja para anotar valores, fechas y conclusiones.'],
    temario: ['Valores, período y fuente', 'Subida, caída y recuperación', 'Estadísticas inversas y datos faltantes', 'Semana abierta y cuotas aprobadas'],
    laminas: [
      { titulo: 'Lee el dato antes que la forma', items: ['Nombre y unidad.', 'Período y fecha del cálculo.', 'Fuente y cobertura.'] },
      { titulo: 'Una subida necesita contexto', texto: 'Pasar de 10 a 14 mejora el último punto. Si antes había 20, todavía no recuperaste ese nivel.' },
      { titulo: 'Dato, propuesta y aprobación son distintos', texto: 'Sin dato no es cero. Abierta no es cerrada. Una cuota propuesta solo se vuelve aprobada cuando coordinación la aprueba.' },
    ],
    bloques: [
      { t: 'p', texto: 'Todos los números de esta lección son ejemplos pedagógicos. Las cinco estadísticas pertenecen al centro; no son estadísticas personales. El coach aprende con estos ejemplos y aplica lo aprendido a su trabajo autorizado.' },
      { t: 'sub', texto: 'Primero identifica qué estás comparando' },
      { t: 'p', texto: 'Lee nombre, unidad, fechas, fuente y momento del cálculo. Compara semanas de la misma duración y usa la misma escala para comparar inclinaciones. El gráfico ajusta su escala a los datos: dos líneas parecidas pueden representar cambios muy distintos. Los valores escritos evitan esa confusión.' },
      grafica('Subida: 10, 12, 14, 16 niños', [10, 12, 14, 16], 'Hay aumento en las cuatro semanas. Investiga qué acción lo produjo y si se puede sostener antes de elegir una condición.'),
      grafica('Estable: 14, 14, 14, 14 niños', [14, 14, 14, 14], 'La producción se mantiene. Revisa contexto, capacidad y objetivo: una línea plana no demuestra por sí sola que todo esté bien.'),
      grafica('Caída: 16, 14, 12, 10 niños', [16, 14, 12, 10], 'Usa el mismo período y escala que la subida anterior. Aquí se pierden seis niños; identifica las causas y las acciones que te corresponden.'),
      grafica('Recuperación después de una caída', [20, 10, 12, 14], 'El último dato mejora frente a 12, pero 14 todavía está por debajo de 20. Una subida aislada no determina la condición.'),
      grafica('Estadística inversa: retiros', [8, 6, 4, 2], 'Aquí menos es mejor: se retiran menos niños. La gráfica inversa dibuja la mejora hacia arriba aunque el número baja. Verifica también las causas de los retiros.', { inversa: true, unidad: 'retiros' }),
      grafica('Dato faltante: 10, sin dato, 12, 14', [10, null, 12, 14], 'El corte significa que falta información. No unas esos puntos como si conocieras lo ocurrido ni escribas cero para completar la serie.'),
      { t: 'sub', texto: 'La semana abierta todavía es provisional' },
      grafica('Tres semanas cerradas y una abierta provisional', [10, 12, 14, 8], 'En este caso de estudio, el 24/09 es una semana todavía abierta con valor parcial 8. No la compares como cierre definitivo contra el 17/09. En el sistema revisa las fechas reales y su zona horaria.'),
      { t: 'p', texto: 'En Semana, las cuotas corresponden a la semana abierta; condición y plan se identifican con la última cerrada. El Panel general distingue esa semana del período mensual o trimestral elegido abajo. Niños puede mostrar el último dato mensual declarado del período, con fecha y fuente: no significa necesariamente el mes anterior ni un mes cerrado. Si las fechas o fuentes difieren, explica esa diferencia antes de comparar.' },
      { t: 'nota', tono: 'ojo', titulo: 'Sin cálculo nuevo no hay resultado nuevo', texto: 'Una semana recién empezada puede no tener cálculo. Un cálculo realizado también puede contener un dato faltante. Comprueba el aviso y la fecha; no copies silenciosamente el valor de la semana anterior. En un consolidado incompleto, el subtotal de centros disponibles no representa el total de todos.' },
      { t: 'sub', texto: 'Cuota propuesta y cuota aprobada' },
      grafica('Cuota propuesta de 16: pendiente de aprobación', [10, 12, 14, 14], 'La propuesta de 16 es un objetivo pendiente de revisión. Todavía no se usa como una cuota aprobada para reconocimiento.'),
      grafica('Cuota aprobada de 16: referencia confirmada', [10, 12, 14, 14], 'Las marcas discontinuas muestran una cuota aprobada de 16 en este ejemplo. En el último cierre, 14 no alcanza 16. Comprueba el estado de aprobación y la semana exacta.', { puntos: [10, 12, 14, 14].map((valor, i) => ({ semanaFin: fechas[i], valor, cuota: 16 })) }),
      { t: 'p', texto: 'Los colores ayudan a localizar cambios; no prueban una causa ni asignan una condición. La lectura automática de ALOHA usa reglas del sistema y solo se muestra a gerencia y coordinación. Sus umbrales no son texto de las fórmulas oficiales.' },
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
      "cuando": "Después de revisar la tendencia y el contexto de la semana cerrada.",
      "producto": "Cada paso oficial con objetivo, responsable, fecha y evidencia.",
      "pasos": [
            "Confirma qué datos sostienen la condición y qué falta comprobar.",
            "Elige condición y su variante cuando corresponda.",
            "Guarda la condición y lee todos los pasos de la fórmula.",
            "Escribe y agrega al menos un objetivo por paso, con responsable, fecha y evidencia esperada.",
            "Revisa las demás secciones y da seguimiento hasta comprobar cada resultado."
      ],
      "decide": [
            {
                  "situacion": "Un paso no tiene objetivo",
                  "regla": "El plan está incompleto: agrega trabajo concreto para ese paso."
            },
            {
                  "situacion": "Debes cambiar la condición",
                  "regla": "Revisa la evidencia y los objetivos anteriores que pasarán a Urgentes."
            }
      ],
      "errores": [
            "Reescribir los pasos oficiales como si fueran el objetivo.",
            "Confundir plan completo con trabajo ejecutado."
      ]
},
    pfv: 'Distingues las siete condiciones y sus variantes; conviertes cada paso de la fórmula elegida en objetivos con responsable, fecha y evidencia.',
    voz: 'La condición sirve para orientar el trabajo del centro. <break time="0.4s"/> No es una etiqueta para juzgar a una persona. <break time="0.4s"/> Revisa la tendencia, la calidad del dato y lo que está pasando antes de elegirla. <break time="0.4s"/> Cada condición tiene una fórmula, y aquí leerás sus pasos completos. <break time="0.4s"/> Después verás ejemplos de cómo llevarlos a un objetivo con responsable, fecha y evidencia. <break time="0.4s"/> La fórmula orienta; el objetivo dice qué se va a producir. <break time="0.4s"/> Si falta un objetivo bajo algún paso, el plan todavía está incompleto.',
    masa: ['Las fórmulas y ejemplos de esta lección.', 'Una hoja con la lectura de gráficas del módulo anterior.'],
    temario: ['Siete condiciones y contexto', 'Fórmulas oficiales y variantes', 'Objetivos, responsables y evidencia', 'Guardar condición y completar el plan'],
    laminas: [
      { titulo: 'Sin condición significa pendiente', texto: 'Falta asignarla. No describe el valor de una persona ni permite suponer que no produjo.' },
      { titulo: 'Lee la fórmula completa', texto: 'Peligro tiene alcance personal o para el superior. Afluencia tiene variante de acción o financiera. Elige según la situación.' },
      { titulo: 'Un paso necesita trabajo verificable', items: ['Qué se va a producir.', 'Quién responde.', 'Para qué fecha.', 'Qué evidencia demuestra que se hizo.'] },
    ],
    bloques: [
      { t: 'p', texto: 'La Administradora revisa los datos, elige y guarda la condición del centro. Coordinación revisa la condición y el plan; solo las cuotas propuestas requieren aprobación. Sin condición significa pendiente de asignación, no un juicio sobre una persona.' },
      { t: 'sub', texto: 'Decide con contexto y conserva la fuente' },
      { t: 'p', texto: 'Las descripciones siguientes orientan la comprensión; no son umbrales automáticos. Mira varias semanas comparables, verifica los datos y averigua qué produjo el cambio. Si la evidencia no alcanza, registra lo que falta comprobar y revísalo con tu jefe. No declares afluencia o poder por una sola subida.' },
      ...formulas,
      { t: 'sub', texto: 'De la fórmula al plan de batalla' },
      { t: 'pasos', items: ['Confirma la semana cerrada a la que corresponde el plan.', 'Elige condición y, cuando corresponda, alcance de Peligro o variante de Afluencia. Poder y Cambio de Poder están en Más condiciones.', 'Pulsa Guardar condición. La fórmula muestra sus pasos oficiales; no se marcan como hechos.', 'Debajo de cada paso, escribe al menos un objetivo concreto, responsable y fecha. Incluye en el texto qué evidencia vas a conservar.', 'Guarda cada objetivo con Agregar objetivo. Revisa Urgentes, Pendientes, Órdenes del coordinador y Plan estratégico.', 'Marca el objetivo como hecho cuando exista evidencia. Un plan completo exige objetivos en todos los pasos, pero no significa que ya se hayan ejecutado.'] },
      { t: 'nota', tono: 'ojo', titulo: 'Si cambia la condición', texto: 'Revisa primero la evidencia. Al guardar otra condición, los objetivos anteriores de la fórmula pasan a Urgentes. Revísalos para no abandonar un trabajo que sigue haciendo falta. No cambies una condición real solo para ensayar.' },
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
    id: 'of-sem-adm', curso: 'semana', orden: 102, roles: ['administradora'], requiere: ['of-sem-2'], duracionMin: 20,
    titulo: 'Administradora: guardar condición, plan y cuotas', fuente: FUENTE, palabras,
    sop: {
      "proceso": "Preparar el plan y las cuotas semanales",
      "cuando": "Al revisar la última semana cerrada y organizar la nueva.",
      "producto": "Condición y plan guardados, cinco cuotas propuestas y seguimiento.",
      "pasos": [
            "Abre Semana y verifica las cinco estadísticas, fechas y fuentes.",
            "Elige y guarda la condición para la semana cerrada.",
            "Agrega objetivos con responsable, fecha y evidencia bajo todos los pasos.",
            "Revisa pendientes, urgentes, órdenes y plan estratégico.",
            "Propón las cinco cuotas de la semana abierta con Guardar cuotas y verifica su aprobación posterior.",
            "Ejecuta objetivos y marca lo hecho cuando tengas evidencia."
      ],
      "decide": [
            {
                  "situacion": "Las cuotas figuran propuestas",
                  "regla": "Coordina su revisión; todavía no están aprobadas."
            },
            {
                  "situacion": "El dato mensual difiere del semanal",
                  "regla": "Compara fechas y fuentes antes de atribuir una causa."
            }
      ],
      "errores": [
            "Esperar aprobación para guardar condición y plan.",
            "Practicar con cifras ficticias en un centro real."
      ]
},
    pfv: 'Dejas condición y plan guardados para la semana cerrada, cuotas propuestas para la abierta y objetivos con seguimiento verificable.',
    voz: 'Tu semana empieza revisando datos que puedas explicar. <break time="0.4s"/> Abre Semana y mira las cinco estadísticas del centro, las fechas y el último cálculo. <break time="0.4s"/> Tú eliges y guardas la condición. No tienes que enviarla como propuesta de aprobación. <break time="0.4s"/> Después completas cada paso de la fórmula con objetivos, responsables y fechas. <break time="0.4s"/> Las cuotas sí las propones para que coordinación las apruebe. <break time="0.4s"/> Durante la semana ejecutas los objetivos y conservas evidencia. <break time="0.4s"/> Guardar el plan organiza el trabajo; cumplirlo exige producir lo que escribiste.',
    masa: ['La página Semana de tu centro, con las fechas visibles.', 'Una hoja para preparar un plan de ejemplo sin modificar datos reales.'],
    temario: ['Verificar estadísticas y fechas', 'Guardar condición y objetivos', 'Proponer las cinco cuotas', 'Ejecutar y comprobar resultados'],
    laminas: [
      { titulo: 'Lee las cinco, identifica la principal', texto: 'La gráfica de niños activos orienta la condición del centro. Las demás ayudan a explicar el resultado y decidir acciones.' },
      { titulo: 'Guarda la condición y completa el plan', texto: 'Selecciona la condición, su variante si aplica y Guarda condición. Agrega objetivos bajo todos los pasos oficiales.' },
      { titulo: 'Propón cuotas y comprueba su estado', texto: 'Guardar cuotas deja la propuesta de la semana abierta. La aprobación corresponde a coordinación.' },
    ],
    bloques: [
      { t: 'p', texto: 'Tu producto es una semana con dirección: datos comprobados, condición guardada, plan completo, cuotas propuestas y objetivos ejecutados con evidencia. Los ejemplos se preparan fuera de los registros reales.' },
      { t: 'sub', texto: 'Revisa la semana antes de escribir' },
      { t: 'pasos', items: ['Abre Semana desde el enlace de esta lección. Identifica centro, rango de fechas, zona horaria y Último cálculo.', 'Revisa niños activos y las otras cuatro estadísticas. Si falta un dato, verifica su fuente antes de interpretarlo. Actualizar ahora vuelve a calcular; no inventa un registro ausente.', 'Distingue el resultado provisional de la semana abierta de la última cerrada que aparece en Condición y plan. No uses una cifra mensual como si fuera semanal.'] },
      { t: 'sub', texto: 'Guarda la condición y cada objetivo' },
      { t: 'pasos', items: ['En Plan de batalla, confirma la semana que cerró y elige la condición con la evidencia delante.', 'Escoge la variante cuando corresponda y pulsa Guardar condición. No esperas aprobación para guardarla.', 'Bajo cada paso oficial, escribe un objetivo, responsable y fecha; incluye la evidencia esperada en el texto y pulsa Agregar objetivo.', 'Revisa Urgentes, Pendientes, Órdenes del coordinador y Plan estratégico. Completa el plan antes del viernes a las 10:00, según el procedimiento del centro.'] },
      { t: 'sub', texto: 'Propón las cinco cuotas de la semana abierta' },
      { t: 'pasos', items: ['En Cuotas semanales, confirma el jueves de cierre de la semana abierta.', 'Escribe una cuota para cada una de las cinco estadísticas y pulsa Guardar cuotas.', 'Comprueba el estado: guardar es proponer. Coordina su revisión y verifica que figuren aprobadas; no interpretes un valor escrito como aprobación.', 'Durante la semana ejecuta los objetivos, conserva el soporte y marca como hecho solo lo realizado. Si surge un bloqueo, comunícalo con responsable y fecha.'] },
      { t: 'nota', tono: 'ojo', titulo: 'Tu criterio no depende de una sugerencia automática', texto: 'La lectura automática está reservada a gerencia y coordinación. Tú estudias los datos, eliges y guardas la condición y explicas el plan. En el panel, la cifra mensual puede ser el último dato declarado del período: revisa su fecha y fuente antes de compararla con Semana.' },
      { t: 'enlaces', titulo: 'Abrir tu trabajo', recursos: [{ titulo: 'Semana del centro', href: '/centro/{centroId}/semana' }, { titulo: 'Plan de batalla', href: '/centro/{centroId}/semana#plan-batalla' }, { titulo: 'Cuotas semanales', href: '/centro/{centroId}/semana#semana-cuotas-title' }] },
    ],
    quiz: [
      pregunta('Ya revisaste los datos y elegiste condición. ¿Qué sigue?', ['Guardar condición y completar sus objetivos', 'Esperar que coordinación apruebe la condición', 'Usar solo la última subida'], 'La Administradora elige y guarda condición y plan. Coordinación revisa; las cuotas tienen aprobación.', 'condicion'),
      pregunta('Pulsaste Guardar cuotas. ¿Puedes tratarlas como aprobadas?', ['Sí, porque tienen número', 'No, verifica su aprobación por coordinación', 'Sí, si la condición es normal'], 'La propuesta y la aprobación son estados distintos de la cuota.', 'cuota-semanal'),
      pregunta('Un paso de fórmula sigue sin objetivo. ¿Qué falta?', ['Cambiar la condición para ocultarlo', 'Marcar la fórmula como hecha', 'Agregar un objetivo concreto con responsable, fecha y evidencia'], 'La fórmula guía; cada paso necesita al menos un objetivo verificable.', 'plan-de-batalla'),
      pregunta('El panel mensual y Semana muestran cifras distintas de niños. ¿Qué revisas?', ['Fechas y fuentes antes de compararlas', 'Eliges la cifra mayor', 'Copias la cifra mensual a la semana'], 'El último dato mensual declarado puede pertenecer a otra fecha y fuente; no equivale al dato semanal.', 'estadistica-semanal'),
    ],
    drills: [maniobra('Maniobra 1: preparar una semana completa', ['Ensaya primero el caso en una hoja. Con el Coordinador, elige una semana real que corresponda preparar y revisa fechas, fuentes y las cinco estadísticas.', 'Justifica la condición con la evidencia disponible y guarda la condición real. Agrega bajo cada paso objetivos reales con responsable, fecha y evidencia esperada.', 'Completa las demás secciones pertinentes y guarda las cinco cuotas reales como propuestas para la semana abierta.', 'Recarga Semana y muestra la condición, los objetivos y las propuestas persistidas. Identifica el estado de aprobación sin darlo por aprobado.', 'Ejecuta un objetivo real que te corresponda y presenta su evidencia. El Coordinador observa la ejecución, verifica los registros guardados y el resultado antes de firmar.'], ['Explica por qué el plan y las cuotas corresponden a sus semanas respectivas.', 'Guarda condición, objetivos y cinco propuestas reales y verifica su persistencia al recargar.', 'Entrega evidencia de un objetivo ejecutado y distingue propuesta de cuota de aprobación.'])],
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
    titulo: 'Coordinador: revisar planes, aprobar cuotas y reconocer resultados', fuente: [...FUENTE, 'app/dashboard/reunion-semanal/page.js', 'app/dashboard/ranking/page.js'], palabras,
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
    voz: 'Tu revisión empieza por saber qué semana estás mirando y qué datos están disponibles. <break time="0.4s"/> Revisa la condición que guardó la Administradora y los objetivos de su plan. <break time="0.4s"/> Las cuotas propuestas sí requieren tu aprobación para la semana correspondiente. <break time="0.4s"/> En la reunión revisas resultados, pendientes y compromisos con responsables y fechas. <break time="0.4s"/> El ranking reconoce las cinco cuotas aprobadas cumplidas en la misma semana cerrada. <break time="0.4s"/> Cuatro de cinco no es cinco de cinco, y una propuesta no reemplaza una aprobación.',
    masa: ['El Panel general y la Reunión semanal de tus centros asignados.', 'Una hoja con cinco cuotas y sus estados para practicar la revisión.'],
    temario: ['Interpretar período, fuente y cobertura', 'Revisar condición y plan', 'Aprobar cuotas por semana', 'Reunión y ranking cinco de cinco'],
    laminas: [
      { titulo: 'Revisa fechas y cobertura', texto: 'Un subtotal con centros sin dato no es el total. El período mensual elegido abajo no cambia la semana operativa de arriba.' },
      { titulo: 'La aprobación corresponde a las cuotas', texto: 'La Administradora guarda condición y plan. Tú los revisas con evidencia y apruebas las cuotas de la semana indicada.' },
      { titulo: 'Cinco de cinco, en la semana cerrada exacta', items: ['Las cinco cuotas están aprobadas.', 'Las cinco están cumplidas.', 'Todos los datos corresponden a ese cierre.'] },
    ],
    bloques: [
      { t: 'p', texto: 'Empieza por tus centros asignados. Una lectura automática sirve como apoyo de revisión, no sustituye la evidencia ni reescribe las fórmulas oficiales. La Administradora elige y guarda condición y plan; la aprobación explícita se aplica a cuotas.' },
      { t: 'sub', texto: 'Lee el panel con período y fuente' },
      { t: 'pasos', items: ['En Panel general, identifica la semana operativa y la zona horaria de cada centro. La medianoche puede dejar a Panamá y Caracas en semanas diferentes.', 'Lee la cobertura del consolidado. Si falta un centro, usa el subtotal identificado como parcial; no lo interpretes como una caída del total.', 'Separa la semana operativa del selector mensual o trimestral inferior. La tarjeta de niños y las filas muestran el último dato mensual declarado del período con su fecha y fuente, no necesariamente el mes anterior ni cerrado.', 'Entra a Semana del centro asignado para contrastar tendencia, último cálculo, condición y objetivos.'] },
      { t: 'sub', texto: 'Revisa el plan y aprueba las cuotas' },
      { t: 'pasos', items: ['Confirma la semana cerrada del plan y pregunta por la evidencia que sostiene la condición elegida.', 'Verifica objetivos debajo de todos los pasos oficiales y revisa responsables, fechas, pendientes y órdenes. Pide corregir lo que no se puede ejecutar o comprobar.', 'En Cuotas semanales, confirma la semana abierta y revisa las cinco propuestas.', 'Pulsa Aprobar cuotas cuando corresponda y verifica el estado aprobado. Un dato ausente se resuelve, no se sustituye por una cuota imaginada.'] },
      { t: 'sub', texto: 'Conduce la reunión y comprueba el reconocimiento' },
      { t: 'pasos', items: ['Abre Reunión semanal y confirma el cierre y los centros revisados. Recorre estadísticas, condición, plan, pendientes y cuotas.', 'Deja los compromisos con responsable, fecha y evidencia esperada. Da seguimiento al resultado, no solo a la promesa.', 'Abre Ranking y comprueba la semana cerrada exacta. El reconocimiento exige las cinco cuotas aprobadas y cumplidas de esa misma semana.', 'Cuatro de cinco, una cuota sin aprobar o un dato faltante no justifican reconocimiento de cinco de cinco. No mezcles cuotas de otra semana para completarlo.'] },
      { t: 'enlaces', titulo: 'Abrir revisión y seguimiento', recursos: [{ titulo: 'Panel general', href: '/dashboard' }, { titulo: 'Semana del centro asignado', href: '/centro/{centroId}/semana' }, { titulo: 'Reunión semanal', href: '/dashboard/reunion-semanal' }, { titulo: 'Ranking', href: '/dashboard/ranking' }] },
    ],
    quiz: [
      pregunta('Falta dato de un centro en el consolidado. ¿Qué puedes afirmar?', ['Que el subtotal representa el total', 'Que ese centro produjo cero', 'Que el subtotal corresponde solo a los centros con dato'], 'La cobertura incompleta no permite afirmar un total ni una caída general.', 'estadistica-semanal'),
      pregunta('La Administradora ya guardó condición y plan. ¿Qué requiere aprobación explícita?', ['Las cuotas propuestas para la semana indicada', 'La existencia de la condición', 'Cada palabra de la fórmula oficial'], 'Coordinación revisa el plan y aprueba las cuotas. La condición la guarda la Administradora.', 'cuota-semanal'),
      pregunta('Hay cuatro cuotas cumplidas y la quinta solo propuesta. ¿Corresponde cinco de cinco?', ['Sí, si la propuesta es baja', 'No: deben estar las cinco aprobadas y cumplidas', 'Sí, con la cuota aprobada de otra semana'], 'El ranking exige las cinco aprobadas y cumplidas en la semana cerrada exacta.', 'cuota-semanal'),
      pregunta('El Panel general muestra una cifra mensual y otra semanal distinta. ¿Qué revisas?', ['Solo el color', 'Cambias el registro para igualarlas', 'Período, fuente y fechas de cada cifra'], 'La cifra mensual puede ser el último dato declarado del período; la semanal responde a otro corte y cálculo.', 'estadistica-semanal'),
    ],
    drills: [maniobra('Maniobra 1: revisar un cierre y aprobar cuotas reales', ['Ensaya en una hoja tres casos: cinco cuotas cumplidas y aprobadas, cuatro cumplidas y una cuota sin aprobar. Justifica cuál recibe reconocimiento.', 'Con tu jefe entrenador, selecciona un centro asignado con cinco propuestas reales pendientes y una semana abierta que corresponda revisar.', 'Revisa la condición guardada, la fórmula y los objetivos con evidencia. Resuelve con la Administradora los ajustes necesarios antes de aprobar las cuotas reales.', 'Pulsa Aprobar cuotas, recarga Semana y comprueba el estado aprobado de las cinco en la semana exacta.', 'Conduce la revisión semanal real y deja acuerdos con responsable, fecha y evidencia. Consulta Ranking del último cierre y explica quién cumple cinco de cinco, aunque no haya reconocidos.', 'Entrega los acuerdos y la evidencia de aprobación persistida al jefe entrenador, que observa y verifica la ejecución antes de firmar.'], ['Revisa condición y plan con sus fuentes y períodos correctos.', 'Aprueba cinco propuestas reales autorizadas y comprueba su estado al recargar.', 'Entrega acuerdos verificables y solo reconoce cinco cuotas aprobadas y cumplidas del mismo cierre.'])],
  },
]
