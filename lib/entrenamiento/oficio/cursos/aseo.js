// Bloque C — PERSONAL DE APOYO Y ASEO. El único curso que NO se estudia en
// pantalla.
//
// DECISIÓN DE FERNANDO: el personal de aseo no recibe cuenta en el sistema. Su
// entrenamiento son HOJAS IMPRIMIBLES que alguien le entrega, le toma y archiva
// en el file del colaborador. Por eso este archivo tiene dos clases de módulo:
//
//   of-ase-0   roles: ['asistente'] · SÍ es de pantalla. Le enseña a la
//              Asistente Administrativa cómo entregar el paquete, cómo tomarlo
//              y dónde archivarlo. Lleva cuestionario, maniobras y firma.
//   of-ase-1..6  roles: [] · son las seis hojas. No están en el plan de nadie
//              (planDeRol las ignora), no piden cuestionario y no escriben
//              progreso: su campo `sop` ES la hoja que se imprime y se firma en
//              tinta. Ver esDePapel() y rolesDelPapel() en ../progreso.js.
//
// QUIÉN SUPERVISA AL ASEO: la ASISTENTE, no la Administradora. El Manual lo
// dice dos veces y las dos se conservan literales:
//   · 2.6 Coordinación de Mantenimiento de Centro — "El Asistente
//     Administrativo debe supervisar el trabajo del personal de limpieza".
//   · 3.4 Control de Calidad — "el Asistente Administrativo se encargará de
//     realizar las evaluaciones de desempeño".
//   · Y el perfil del puesto (3.1) escribe además que el personal de aseo
//     "estará bajo la supervisión de la Asistente de Gerencia, quien será su
//     Jefe directo". Las dos frases son del Manual y las dos se citan; aquí no
//     se elige una y se borra la otra.
//
// FUENTE (contenido ya auditado; aquí solo se adaptó el formato, conservando
// cifras, plazos, montos y responsables):
//   plataformas/aloha/training-moodle/curso-6-apoyo-aseo.html (bienvenida + m1..m6)
//   plataformas/aloha/manual-operaciones-completo.md
//     §2.6 Coordinación de Mantenimiento de Centro · §3 Personal de Apoyo y Aseo
//     (3.1 Perfil · 3.2 Calendarios y Horarios · 3.3 Detalles y Calendario de
//     Funciones · 3.4 Control de Calidad)
//
// El `id` es la CLAVE DE PROGRESO en entrenamiento_progreso.modulo: renombrarlo
// borra en silencio el avance de todo el mundo. No se renumera nunca.
//
// Los índices correctos del cuestionario de of-ase-0 viven en
// lib/entrenamiento/respuestas-oficio/aseo.js (solo servidor). Las seis hojas
// no tienen cuestionario: su clave es un array vacío, y así el barrido de
// RESPUESTAS_OFICIO sigue cuadrando módulo por módulo.
//
// VOCABULARIO: Entrenamiento en Cubierta. Aquí se renombró solo lo VISIBLE. El
// mapeo viejo -> nuevo vive en la cabecera de ./metodo.js. Estos siete módulos
// son OPERATIVOS: cifras, plazos, montos y pasos van literales, y no llevan ni
// una imagen marítima.

export const ASEO = [
  // ═══════════════════════════════════════════════════════════════════════
  // of-ase-0 — DE PANTALLA. El módulo de la Asistente.
  // Va de último en su plan (orden 27, después de of-zoh-13): el bloque C es
  // "lo que entregas en papel" y no se entrega un paquete que no se ha
  // estudiado. `requiere` apunta al último módulo de su curso B para que el
  // orden del plan y el orden del gradiente digan lo mismo.
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'of-ase-0',
    curso: 'aseo',
    orden: 27,
    roles: ['asistente'],
    titulo: 'Entregar y tomar el paquete del personal de aseo',
    duracionMin: 20,
    requiere: ['of-zoh-13'],
    fuente: [
      'curso-6-apoyo-aseo.html#bienvenida',
      'manual-operaciones-completo.md#2.6-coordinacion-de-mantenimiento-de-centro',
      'manual-operaciones-completo.md#3-personal-de-apoyo-y-aseo',
      'manual-operaciones-completo.md#3.4-control-de-calidad',
    ],

    pfv: 'El paquete del personal de aseo entregado hoja por hoja y tomado con la persona delante, firmado en tinta por las dos y archivado en el file del colaborador.',
    voz: 'Este módulo no es sobre limpieza. <break time="0.4s"/> Es sobre cómo le entregas su entrenamiento a la persona de aseo. <break time="0.5s"/> Ella no tiene cuenta en el sistema. <break time="0.3s"/> No hay pantalla, no hay cuestionario, y no hay progreso que se guarde. <break time="0.4s"/> Su entrenamiento son seis hojas. Tú las imprimes, se las entregas y se las tomas. <break time="0.4s"/> Y las dos firman al pie, en tinta. <break time="0.5s"/> Esa firma no es un trámite. <break time="0.3s"/> Es lo único que deja constancia de que ese entrenamiento ocurrió. <break time="0.4s"/> La hoja firmada va al file del colaborador, que reposa en el Centro. <break time="0.5s"/> Y ojo con quién supervisa. El Manual te lo asigna a ti. <break time="0.3s"/> Tú supervisas su trabajo y tú haces su evaluación de desempeño. <break time="0.4s"/> Seis parámetros, y los seis están escritos. <break time="0.4s"/> Cuando termines, tienes que poder entregar el paquete completo sin abrir el Manual.',

    masa: [
      'Las seis hojas del paquete, ya impresas, encima de la mesa.',
      'El Manual de Operaciones abierto en el capítulo de Descripción de Puestos, punto 3 — Personal de Apoyo y Aseo.',
      'El file del colaborador de la persona de aseo de tu Centro.',
      'El calendario y el horario de trabajo que tu Centro le fijó al aseo.',
      'Un bolígrafo. Las firmas de estas hojas son de tinta, no de pantalla.',
    ],

    // 12 exactas. Van las del puesto que se entrega (contrato, quincena,
    // permiso, evaluación) y las tres del método que la Asistente necesita para
    // TOMAR una hoja: la maniobra, lo que va a la vista y su plan.
    palabras: [
      'personal-de-apoyo-y-aseo',
      'contrato-de-servicios-profesionales',
      'contrato-de-trabajo',
      'quincena',
      'permiso',
      'file-del-colaborador',
      'evaluacion-de-desempeno',
      'colaborador',
      'administrador-de-centro',
      'drill',
      'masa',
      'bitacora',
    ],

    laminas: [
      {
        kicker: 'Por qué en papel',
        titulo: 'El aseo no tiene cuenta en el sistema',
        items: [
          'No hay usuario, no hay pantalla y no hay cuestionario que responder.',
          'Su entrenamiento son seis hojas que se imprimen desde aquí.',
          'Se firman en tinta: una firma de quien la recibió y otra de quien la tomó.',
          'La hoja firmada va al file del colaborador, que reposa en el Centro.',
        ],
      },
      {
        titulo: 'Quién supervisa al personal de aseo',
        items: [
          'El Manual te asigna a ti supervisar su trabajo.',
          'Y te asigna a ti realizar su evaluación de desempeño.',
          'El perfil del puesto nombra además a la Asistente de Gerencia como su Jefe directo.',
        ],
        cierre: 'Su línea de reporte no pasa por el Coach ni por el padre que pregunta en el pasillo.',
      },
      {
        kicker: 'Las reglas de su contrato',
        titulo: 'Lo que no se negocia en el Centro',
        items: [
          'Trabaja por contrato de servicio y el pago es quincenal.',
          'Si falta un día, se le descuenta.',
          'Lunes a viernes de 12:30 a 3:00 p.m.; sábados de 12:00 a 1:00 p.m.',
          'Recibe y respeta el calendario que fijaron las autoridades del Centro.',
        ],
      },
      {
        titulo: 'Una hoja se toma, no se reparte',
        texto: 'Entregar las seis hojas para que se las lea sola no es entrenar. Se lee cada hoja con ella, se aclara toda palabra que no entienda y se le pide que lo haga en el área real.',
        cierre: 'Si no lo puede hacer, se vuelve al punto anterior de la hoja.',
      },
    ],

    sop: {
      proceso: 'Entregar el paquete del personal de aseo',
      cuando: 'El primer día de la persona en el Centro, y otra vez cuando cambie una regla.',
      producto: 'Las seis hojas tomadas una por una, firmadas en tinta por las dos y archivadas en el file del colaborador.',
      pasos: [
        'Imprime las seis hojas del paquete desde este sistema, antes de que la persona llegue.',
        'Siéntate con ella: ninguna hoja se entrega para que se la lleve a leer sola.',
        'Lee la hoja con ella y aclara toda palabra que no entienda antes de seguir.',
        'Pídele que te diga con sus palabras qué le toca hacer, y que te lo señale en el área real.',
        'Si no lo puede hacer, vuelve al punto anterior de la hoja; no repitas el mismo más fuerte.',
        'Firma tú al pie como quien la tomó, y que ella firme como quien la recibió, con la fecha.',
        'Archiva la hoja firmada en el file del colaborador, que reposa en el Centro.',
        'Repite hoja por hoja hasta completar las seis.',
        'Entrégale copia del calendario y del horario de trabajo que fijó el Centro.',
        'Anota en la bitácora la fecha en que quedó completo el paquete.',
      ],
      decide: [
        { situacion: 'Pide un permiso', regla: 'Por escrito, con mínimo tres días de anticipación, en el Formato de Solicitud de Permisos y dirigido al Administrador del Centro. Solo queda autorizado con su firma.' },
        { situacion: 'Falta un día de trabajo', regla: 'Se le descuenta. El pago es quincenal y por contrato de servicio: esa regla no la negocia el Centro.' },
        { situacion: 'Hay algo que reparar en el local', regla: 'No es de su puesto. El mantenimiento lo gestiona la Administración con SUPLIDORES DEL ISTMO, S.A.' },
      ],
      errores: [
        'Entregar las seis hojas juntas para que las lea sola: sin tomarlas no hubo entrenamiento.',
        'Poner en la hoja la fecha en que se imprimió y no la del día en que se tomó.',
        'Dejar la hoja firmada en la gaveta: va al file del colaborador o no existe.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Qué es esto' },
      { t: 'p', texto: 'Este es el único paquete de entrenamiento del Centro que **no se estudia en pantalla**. El personal de apoyo y aseo no recibe cuenta en el sistema: no tiene usuario, no responde cuestionarios y no acumula progreso. Su entrenamiento son seis hojas que tú imprimes, le entregas, le tomas y archivas.' },
      { t: 'p', texto: 'Y te toca a ti por escrito. El Manual le asigna al Asistente Administrativo dos cosas concretas sobre este puesto: **supervisar el trabajo del personal de limpieza** y **realizar las evaluaciones de desempeño**. Este módulo es cómo se hace lo primero desde el primer día.' },
      { t: 'nota', tono: 'regla', titulo: 'Regla clave del paquete', texto: 'Una hoja se TOMA, no se reparte. Se lee con la persona delante, se aclara toda palabra que no entienda, se le pide que lo haga en el área real del Centro y recién ahí firman las dos.' },

      { t: 'sub', texto: 'Por qué este paquete no vive en el sistema' },
      { t: 'p', texto: 'No es un descuido: es la decisión. Dar cuenta en el sistema a quien no la necesita crea un usuario que nadie mantiene, una contraseña que se pierde y un progreso que no refleja nada. La firma en tinta al pie de la hoja es la evidencia, y esa evidencia tiene un solo lugar: el file del colaborador, que reposa en el Centro.' },
      { t: 'nota', tono: 'ojo', titulo: 'El sistema no guarda nada de esto', texto: 'Las seis hojas no generan avance, no aparecen en ninguna barra y no se pueden firmar desde una pantalla. Si la hoja de papel no está en el file, para efectos de auditoría ese entrenamiento no ocurrió.' },

      { t: 'sub', texto: 'Las seis hojas del paquete' },
      {
        t: 'tabla',
        encabezados: ['Hoja', 'Qué le enseña', 'Minutos'],
        filas: [
          ['1', 'Su puesto: el objetivo de la posición, el perfil, quién la supervisa y qué tipo de contrato tiene', '15'],
          ['2', 'Horario, pago y permisos: la quincena, el descuento por día faltado y cómo se pide un permiso', '15'],
          ['3', 'Las funciones, una por una, más la de anticiparse con los implementos y lo que NO le toca', '20'],
          ['4', 'Imagen, trato y confidencialidad: vestimenta, cómo responde a un padre y qué no se cuenta afuera', '15'],
          ['5', 'Qué hace si un niño se accidenta y ella está presente', '15'],
          ['6', 'Control de calidad: los seis parámetros con los que tú la evalúas', '15'],
        ],
      },
      { t: 'p', texto: 'Las seis se entregan en ese orden. La hoja 6 se toma de última a propósito: es la que le dice con qué la vas a medir, y no se puede medir a alguien por algo que todavía no se le entregó.' },

      { t: 'sub', texto: 'Quién supervisa al personal de aseo' },
      { t: 'p', texto: 'El Manual escribe dos cosas y las dos son suyas. En el perfil del puesto dice que el personal de aseo **estará bajo la supervisión de la Asistente de Gerencia, quien será su Jefe directo**. Y en Coordinación de Mantenimiento de Centro y en Control de Calidad le asigna al **Asistente Administrativo** supervisar el trabajo y realizar la evaluación de desempeño. En la práctica del Centro, la persona que tiene el trabajo delante todos los días eres tú.' },
      {
        t: 'tabla',
        encabezados: ['Qué', 'De quién es', 'Dónde lo dice el Manual'],
        filas: [
          ['Supervisar el trabajo de limpieza', 'Asistente Administrativo', 'Coordinación de Mantenimiento de Centro'],
          ['Realizar la evaluación de desempeño', 'Asistente Administrativo', 'Control de Calidad del puesto'],
          ['Jefe directo del puesto', 'Asistente de Gerencia', 'Perfil del puesto'],
          ['Autorizar un permiso', 'Administrador del Centro, con su firma', 'Normas de permisos'],
          ['Gestionar el mantenimiento y su proveedor', 'Administración del Centro', 'Coordinación de Mantenimiento de Centro'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'Lo que no puedes delegar en el Coach', texto: 'Un Coach no le da instrucciones al personal de aseo ni le cambia el calendario. Si lo hace, la persona termina con dos jefes y ninguna evaluación posible. La línea de reporte va por ti.' },

      { t: 'sub', texto: 'Cómo se entrega y cómo se toma' },
      {
        t: 'pasos',
        items: [
          'Imprime las seis hojas antes de que la persona llegue. Impresas, no en pantalla.',
          'Siéntate con ella y toma una sola hoja por sesión si hace falta.',
          'Lee la hoja con ella y para en cada palabra que no entienda. Una palabra sin aclarar más adelante se convierte en una función que no se hace.',
          'Pídele que te lo diga con sus palabras y que te lo señale en el área real: la puerta de vidrio, el baño, el salón.',
          'Si se traba, el hueco está en el punto anterior de la hoja, no en el que estás. Devuélvete a ese.',
          'Firma tú al pie como quien la tomó y que ella firme como quien la recibió, con la fecha del día.',
          'Archiva la hoja firmada en el file del colaborador.',
          'Anota en la bitácora la fecha en que el paquete quedó completo.',
        ],
      },
      { t: 'p', texto: 'Lo que va a la vista aquí no es un formato: es el Centro. Las funciones de la hoja 3 se toman caminando el local, no sentadas en la oficina.' },

      { t: 'sub', texto: 'Lo que tú tienes que poder responder' },
      { t: 'p', texto: 'Estas cinco preguntas te las va a hacer la persona, o te las va a hacer tu jefe entrenador. Se responden sin buscar en el Manual.' },
      {
        t: 'tabla',
        encabezados: ['Pregunta', 'La respuesta del Manual'],
        filas: [
          ['¿Cuál es el horario?', 'Lunes a viernes de 12:30 a 3:00 p.m. y sábados de 12:00 a 1:00 p.m.'],
          ['¿Cómo se paga?', 'Por contrato de servicio, pago quincenal. Si falta un día, se le descuenta'],
          ['¿Qué contrato tiene?', 'Contrato de servicios profesionales, que el Manual reserva para los Coaches y el Servicio de Limpieza. No es contrato de trabajo'],
          ['¿Cómo pide un permiso?', 'Por escrito, con mínimo 3 días de anticipación, en el Formato de Solicitud de Permisos y dirigido al Administrador del Centro'],
          ['¿Con qué la evalúan?', 'Con seis parámetros: asistencia y puntualidad, realización de funciones, cumplimiento de calendarios, buena ejecución (velocidad y efectividad), buen trato y disposición de servicio, y buena presencia y buenas maneras'],
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'El tope de 18 permisos médicos no está resuelto para este puesto', texto: 'El Manual fija un máximo de 18 permisos al año con justificación médica para los colaboradores que forman parte de la planilla, y no dice si el personal de limpieza entra en ese conteo. Lo único que sí deja escrito para este puesto es que si falta un día se le descuenta. No inventes la respuesta: pregúntale al Administrador del Centro antes de darla por hecha.' },

      { t: 'sub', texto: 'Errores que cuestan dinero' },
      { t: 'nota', tono: 'alerta', titulo: 'Los tres que se repiten', texto: 'Entregar las hojas para que se las lea sola. Firmarlas todas el mismo día para salir del trámite. Y dejarlas en la gaveta en vez de archivarlas en el file del colaborador. Los tres dejan al Centro sin cómo sostener una evaluación de desempeño cuando llegue el reclamo.' },
    ],

    quiz: [
      {
        pregunta: 'El personal de aseo no recibe cuenta en el sistema. Su entrenamiento…',
        opciones: [
          'se le da de palabra el primer día y se anota en la bitácora',
          'lo carga la Administradora dentro de su propio usuario',
          'son seis hojas que se imprimen, se entregan, se toman y se firman en tinta',
          'no existe: es un puesto que no lleva entrenamiento',
        ],
        explicacion: 'Es papel con firma. La evidencia de que ese entrenamiento ocurrió es la hoja firmada, no una casilla en pantalla.',
        repasa: ['personal-de-apoyo-y-aseo'],
      },
      {
        pregunta: '¿Dónde reposa cada hoja una vez firmada por las dos?',
        opciones: [
          'En el file del colaborador, que reposa en el Centro',
          'En el sistema, dentro del entrenamiento de la Asistente',
          'En la bitácora de información importante del Centro',
          'Se la lleva la persona de aseo y no queda copia',
        ],
        explicacion: 'El file del colaborador es donde el Manual pide que repose todo lo del personal. Si la hoja no está ahí, no está.',
        repasa: ['file-del-colaborador'],
      },
      {
        pregunta: 'Según el Manual, ¿quién supervisa el trabajo del personal de aseo y realiza su evaluación de desempeño?',
        opciones: [
          'El Coach del grupo que esté en clase en ese momento',
          'El Corporativo ALOHA',
          'El Administrador del Centro, nunca el Asistente',
          'El Asistente Administrativo',
        ],
        explicacion: 'El Manual se lo asigna al Asistente Administrativo en dos secciones: Coordinación de Mantenimiento de Centro y Control de Calidad.',
        repasa: ['evaluacion-de-desempeno', 'personal-de-apoyo-y-aseo'],
      },
      {
        pregunta: 'El personal de aseo trabaja bajo contrato de trabajo, igual que los Asistentes Administrativos.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'El Manual reserva el contrato de servicios profesionales para los Coaches y el Servicio de Limpieza; el contrato de trabajo es para asistentes administrativos y administradores.',
        repasa: ['contrato-de-servicios-profesionales', 'contrato-de-trabajo'],
      },
      {
        pregunta: 'La persona de aseo falta un día de trabajo. Según el Manual…',
        opciones: [
          'lo repone otro día y el pago no se afecta',
          'se le descuenta',
          'se le paga igual si avisó con anticipación',
          'se descuenta solo si falta dos veces en la misma quincena',
        ],
        explicacion: 'El Manual lo escribe en una línea y sin matices: se realiza por contrato de servicio, el pago es quincenal, y si falta un día se le descuenta.',
        repasa: ['quincena'],
      },
      {
        pregunta: 'Le entregas las seis hojas de una vez para que se las lea en su casa y te las devuelva firmadas.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Una hoja se toma, no se reparte: se lee con la persona delante, se aclara toda palabra que no entienda, se le pide que lo haga en el área real y ahí firman las dos.',
        repasa: ['drill'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Tomar una hoja del paquete con la persona delante',
        fuente: 'curso-6-apoyo-aseo.html#m3',
        proposito: 'Que puedas tomar una hoja completa del paquete: leerla con la persona, aclararle las palabras, hacerle demostrar la función en el área real y cerrar con las dos firmas y el archivo.',
        gradiente: 'Exige este módulo estudiado y las seis hojas ya impresas. Si la persona se traba en la hoja 3, el hueco está en la hoja 1 o 2, no en la maniobra.',
        masa: [
          'La hoja 3 del paquete, impresa, y un bolígrafo.',
          'El Centro abierto: entrada, salón y baño disponibles para caminarlos.',
          'El file del colaborador de la persona de aseo.',
        ],
        pasos: [
          'Lee la hoja 3 con la persona, en voz alta, parando en cada palabra que no entienda.',
          'Camina con ella el Centro y pídele que señale cada área que nombra la lista de funciones.',
          'Pídele que te explique con sus palabras qué significa anticiparse con los implementos.',
          'Pregúntale qué NO es su función y por qué, hasta que nombre el mantenimiento y el proveedor.',
          'Firma al pie como quien la tomó, que ella firme como quien la recibió, con la fecha del día.',
          'Archiva la hoja firmada en su file del colaborador delante de ella.',
        ],
        criterios: [
          'La persona recorre el Centro y señala cada área de la lista de funciones sin que se le vaya ninguna.',
          'Explica con sus palabras que anticiparse es avisar mientras todavía queda producto para trabajar.',
          'Dice que la reparación no es de su puesto y nombra a la Administración como quien la gestiona.',
          'La hoja queda firmada por las dos, con la fecha del día en que se tomó, y archivada en el file.',
        ],
        errorTipico: 'Leerle la hoja completa sin pararse en una sola palabra y firmar al final. La persona sale con el papel firmado y sin poder decir qué le toca hacer, que es justo lo que la evaluación de desempeño va a medir.',
      },
      {
        titulo: 'Maniobra 2 — Las cinco preguntas del contrato, de memoria',
        fuente: 'manual-operaciones-completo.md#3-personal-de-apoyo-y-aseo',
        proposito: 'Que respondas al instante y sin abrir el Manual las cinco preguntas que la persona de aseo te va a hacer: horario, pago, contrato, permisos y evaluación.',
        gradiente: 'Exige este módulo estudiado. Si fallas una, el hueco está en la tabla de respuestas de este mismo módulo, no en la maniobra.',
        masa: [
          'Ninguna. De memoria.',
          'Para la verificación: el Manual de Operaciones abierto en el punto 3 del capítulo de puestos.',
        ],
        pasos: [
          'Tu jefe entrenador te pregunta el horario de lunes a viernes y el de sábado.',
          'Te pregunta cómo se paga el trabajo y qué pasa si falta un día.',
          'Te pregunta qué tipo de contrato tiene y para quiénes reserva el Manual ese contrato.',
          'Te pregunta cómo se pide un permiso, con cuánta anticipación y a quién se dirige.',
          'Te pregunta los seis parámetros de la evaluación de desempeño.',
          'Al final, te pregunta qué haces si la persona te pide que le confirmes el tope de permisos médicos.',
        ],
        criterios: [
          'Da los dos horarios completos con sus horas exactas, sin redondear ni aproximar ninguna.',
          'Dice que el pago es quincenal y que si falta un día se le descuenta, sin agregar excepciones.',
          'Nombra el contrato de servicios profesionales y dice que el Manual lo reserva para Coaches y limpieza.',
          'Enumera los seis parámetros de la evaluación sin mirar el Manual ni la hoja 6.',
          'Ante el tope de permisos médicos responde que el Manual no lo resuelve para este puesto y que se le pregunta al Administrador.',
        ],
        errorTipico: 'Rellenar el hueco del tope de 18 permisos médicos con una respuesta inventada para no quedar mal delante de la persona. Ese número quedaría dicho por el Centro y después habría que desdecirlo.',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // HOJAS 1 a 6 — DE PAPEL. `roles: []`, sin cuestionario y sin maniobra: la
  // persona que las recibe no tiene cuenta en el sistema, así que nadie puede
  // responder ni firmar nada en pantalla. El campo `sop` ES la hoja.
  // `sop.aplicaA` es obligatorio: sin `roles`, el nombre del puesto solo puede
  // venir escrito (ver sop-derivar.mjs).
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: 'of-ase-1',
    curso: 'aseo',
    orden: 28,
    roles: [],
    titulo: 'Hoja 1 · Tu puesto: qué se espera de ti y quién te supervisa',
    duracionMin: 15,
    requiere: [],
    fuente: [
      'curso-6-apoyo-aseo.html#m1',
      'manual-operaciones-completo.md#3.1-perfil',
    ],

    pfv: 'Puedes decir el objetivo de tu puesto y nombrar a quién le reportas, sin buscarlo en ningún papel.',
    voz: 'Cuando un padre entra por primera vez a un Centro, todavía no sabe nada del método. <break time="0.4s"/> Lo primero que juzga es lo que ve. <break time="0.3s"/> La entrada, el piso, el baño, el salón donde se va a sentar su hijo. <break time="0.4s"/> Eso lo haces tú. <break time="0.5s"/> El objetivo de tu posición está escrito en el Manual. <break time="0.3s"/> Realizar labores de limpieza y mantenimiento de orden en todas las áreas del Centro. <break time="0.4s"/> No es pasar limpiando. Es sostener las condiciones en las que se puede dar clase. <break time="0.5s"/> Tu perfil pide cuatro competencias, y las cuatro en nivel alto. <break time="0.3s"/> Estabilidad emocional. Orientación al logro. Actitud de servicio. Y rigor profesional. <break time="0.4s"/> Rigor profesional es hacer el trabajo como está establecido. <break time="0.3s"/> No como uno lo haría en su casa. Ahí es donde más se pierde calidad. <break time="0.4s"/> Y una cosa más. Tu contrato es de servicios profesionales, no de trabajo. <break time="0.3s"/> Eso cambia cómo se te paga. La conducta dentro del Centro se te exige igual.',

    masa: [
      'Esta hoja impresa y el Manual de Operaciones abierto en el punto 3 del capítulo de puestos.',
      'El recorrido real del Centro: entrada, salones, baños y oficina.',
      'Tu contrato firmado, para ver de qué tipo es.',
    ],

    palabras: [
      'personal-de-apoyo-y-aseo',
      'asistente-administrativo',
      'contrato-de-servicios-profesionales',
      'contrato-de-trabajo',
      'colaborador',
      'evaluacion-de-desempeno',
      'aloha-mental-arithmetic',
      'dojo-kun',
    ],

    sop: {
      proceso: 'Tu puesto: qué se espera de ti y quién te supervisa',
      cuando: 'Tu primer día en el Centro, con la Asistente Administrativa al lado.',
      aplicaA: ['Personal de apoyo y aseo'],
      producto: 'Puedes decir el objetivo de tu puesto y nombrar a quién le reportas, sin buscarlo en ningún papel.',
      pasos: [
        'Lee el objetivo de tu posición y dilo con tus palabras antes de seguir.',
        'Camina el Centro completo: entrada, salones, baños y oficina. Todas son tus áreas.',
        'Repasa las cuatro competencias del perfil y quédate con rigor profesional.',
        'Rigor profesional es hacer el trabajo como está establecido, no como uno lo haría en su casa.',
        'Aprende quién te supervisa: el Asistente Administrativo supervisa tu trabajo y te evalúa.',
        'Aprende a quién NO le reportas: ni al Coach, ni a otro compañero, ni al padre del pasillo.',
        'Lee qué tipo de contrato tienes: de servicios profesionales, no de trabajo.',
        'Pregunta ahora todo lo que no entendiste. Después de la firma se te va a exigir.',
      ],
      decide: [
        { situacion: 'Un Coach te pide algo fuera de tu lista', regla: 'No lo decides tú ni él. Se lo consultas al Asistente Administrativo, que es quien supervisa tu trabajo.' },
        { situacion: 'Un padre te pregunta algo del Centro', regla: 'Lo recibes con atención y lo diriges a tu Supervisor Inmediato. No opinas.' },
        { situacion: 'Tu contrato', regla: 'Es de servicios profesionales, el que el Manual reserva para los Coaches y el Servicio de Limpieza. Las normas de conducta del Centro te aplican igual.' },
      ],
      errores: [
        'Recibir instrucciones de tres personas distintas y terminar sin poder cumplirle a ninguna.',
        'Creer que limpiar es solo el pasillo de entrada: el objetivo dice todas las áreas del Centro.',
        'Guardarse una duda del primer día y descubrirla en la evaluación de desempeño.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'Cuando un padre entra por primera vez a un Centro ALOHA, todavía no sabe nada del ábaco ni del método. Lo primero que juzga es lo que ve: la puerta de vidrio, el piso, el baño, el salón donde va a sentarse su hijo. Eso lo haces tú.' },
      { t: 'nota', tono: 'regla', titulo: 'El punto 2 del ALOHA Dojo Kun', texto: 'Todo niño del Programa lo aprende de memoria y dice: "Mantengo orden y limpieza". Tú no apoyas esa norma desde afuera. Tú eres quien la hace verdad todos los días.' },

      { t: 'sub', texto: 'El objetivo de tu posición' },
      { t: 'p', texto: 'Tal como está escrito en el Manual de Operaciones: **realizar labores de limpieza y mantenimiento de orden en todas las áreas del Centro, para garantizar el buen funcionamiento y ambiente óptimo del Programa ALOHA Mental Arithmetic.** No es "pasar limpiando": es sostener las condiciones en las que se puede dar clase.' },

      { t: 'sub', texto: 'Las cinco áreas de aplicación del Centro' },
      { t: 'p', texto: 'El Manual describe tu posición dentro de las cinco áreas de aplicación del Centro: Operativa, Administrativa, Ejecutiva, **Aseo** y Mantenimiento. Aseo es un área con nombre propio, no un añadido.' },

      { t: 'sub', texto: 'El perfil del puesto' },
      { t: 'p', texto: 'El Manual pide personal femenino de 25 a 50 años, buena apariencia y trato amable, con personalidad y compromiso de servicio. Y define cuatro competencias, todas en nivel alto.' },
      {
        t: 'tabla',
        encabezados: ['Competencia', 'Nivel', 'Qué significa en el Manual'],
        filas: [
          ['Estabilidad emocional', 'Alto', 'Madurez y control de los impulsos emocionales, con adecuados niveles de tolerancia a la frustración y seguridad en sí mismo'],
          ['Orientación al logro', 'Alto', 'Capacidad para dirigir sus acciones hacia el cumplimiento total de los objetivos establecidos en su cargo'],
          ['Actitud de servicio', 'Alto', 'Disposición a satisfacer las necesidades inmediatas de los clientes internos y externos, porque con eso se contribuye a los objetivos comunes de toda la organización'],
          ['Rigor profesional', 'Alto', 'Capacidad para usar la información dada, las normas, los procedimientos y las políticas de la empresa con precisión y eficacia, para lograr los estándares de calidad en tiempo y forma'],
        ],
      },
      { t: 'p', texto: 'Lee otra vez la última: **rigor profesional es hacer el trabajo como está establecido, no como uno lo haría en su casa.** Ese es el punto donde más se pierde calidad.' },

      { t: 'sub', texto: 'Quién es tu jefe' },
      { t: 'p', texto: 'En el perfil del puesto, el Manual dice que el personal de aseo estará bajo la supervisión de la **Asistente de Gerencia**, quien será su jefe directo. Y en Coordinación de Mantenimiento de Centro y en el control de calidad de tu puesto, le asigna al **Asistente Administrativo** dos cosas concretas: supervisar tu trabajo y realizar tu evaluación de desempeño.' },
      { t: 'nota', tono: 'ojo', titulo: 'Las dos frases son del Manual y las dos te aplican', texto: 'Tu Jefe directo es la Asistente de Gerencia. Y el Asistente Administrativo es quien supervisa tu trabajo y quien realiza tu evaluación de desempeño. Tu línea de reporte va por ahí: no por el Coach, no por otro compañero, no por el padre que te pregunta en el pasillo.' },

      { t: 'sub', texto: 'Tu contrato no es un contrato de trabajo' },
      { t: 'p', texto: 'El Manual lo separa de forma expresa: el **contrato de servicios profesionales** se utiliza únicamente para los Coaches y para el Servicio de Limpieza. El **contrato de trabajo** se utiliza para los asistentes administrativos y los administradores.' },
      { t: 'p', texto: 'Eso no cambia lo que se espera de tu conducta dentro del Centro: las normas generales del colaborador te aplican igual. Sí cambia cómo se te paga, y eso está en la hoja 2.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Llevas tres semanas en el Centro. Un Coach te pide que, mientras él termina una clase, te quedes vigilando a dos niños que ya salieron y esperan a su mamá. ¿Está dentro de tus funciones? ¿A quién le corresponde decidirlo y a quién se lo consultas tú antes de decir que sí?' },
    ],

    quiz: [],
    drills: [],
  },

  {
    id: 'of-ase-2',
    curso: 'aseo',
    orden: 29,
    roles: [],
    titulo: 'Hoja 2 · Horario, pago y permisos',
    duracionMin: 15,
    requiere: [],
    fuente: [
      'curso-6-apoyo-aseo.html#m2',
      'manual-operaciones-completo.md#2.6-coordinacion-de-mantenimiento-de-centro',
      'manual-operaciones-completo.md#3.2-establecimiento-de-calendarios-y-horarios',
    ],

    pfv: 'Cumples tu horario completo, sabes exactamente qué pasa con tu pago si faltas, y pides un permiso por la vía correcta y a tiempo.',
    voz: 'Tu trabajo se presta por contrato de servicio y el pago es quincenal. <break time="0.4s"/> Y hay una regla que el Manual escribe en una sola línea, sin matices. <break time="0.3s"/> Si faltas un día, se te descuenta. <break time="0.5s"/> El horario es de lunes a viernes, de doce y media a tres de la tarde. <break time="0.3s"/> Y los sábados, de doce a una. <break time="0.4s"/> Llegar tarde no se arregla quedándote después. <break time="0.3s"/> El turno es el convenido, y sobre él te miden la asistencia y la puntualidad. <break time="0.5s"/> Los permisos ahora. <break time="0.3s"/> Se piden por escrito. Nunca de palabra en el pasillo. <break time="0.4s"/> Con un mínimo de tres días de anticipación. <break time="0.3s"/> En el formato de Solicitud de Permisos, dirigido al Administrador del Centro. <break time="0.5s"/> Y ojo con esto: un permiso solicitado no es un permiso aprobado. <break time="0.4s"/> Solo queda autorizado con la firma del Administrador. <break time="0.3s"/> Y un permiso autorizado tampoco es tiempo pagado.',

    masa: [
      'Esta hoja impresa y el calendario de trabajo que te entregó el Centro.',
      'El Formato de Solicitud de Permisos en blanco.',
      'El comprobante de tu última quincena.',
    ],

    palabras: [
      'quincena',
      'permiso',
      'tiempo-compensatorio',
      'caja-de-seguro-social',
      'administrador-de-centro',
      'coordinador-operativo',
      'file-del-colaborador',
      'colaborador',
    ],

    sop: {
      proceso: 'Horario, pago y solicitud de permisos',
      cuando: 'Al entrar al Centro, y cada vez que necesites ausentarte un día.',
      aplicaA: ['Personal de apoyo y aseo'],
      producto: 'El turno cumplido completo y, si hay ausencia, un permiso pedido por escrito con tres días de anticipación.',
      pasos: [
        'Cumple el horario: lunes a viernes de 12:30 a 3:00 p.m. y sábados de 12:00 a 1:00 p.m.',
        'Recibe el calendario de trabajo del Centro y respétalo tal como te lo entregaron.',
        'Si vas a faltar, escribe la solicitud. De palabra no vale y por mensaje de voz tampoco.',
        'Presenta la solicitud con un mínimo de tres (3) días de anticipación.',
        'Usa el formato de SOLICITUD DE PERMISOS y dirígelo al Administrador del Centro.',
        'Espera: la solicitud no significa aprobación. El supervisor inmediato la evalúa.',
        'El permiso queda autorizado únicamente con la firma del Administrador del Centro.',
        'Ese documento se entrega al Coordinador Operativo y reposa en tu file personal.',
        'Cuenta con el descuento: el permiso justifica la ausencia, no el pago del tiempo.',
      ],
      decide: [
        { situacion: 'Llegaste tarde', regla: 'No se arregla quedándote después: el turno es el convenido y sobre él te miden la asistencia y la puntualidad.' },
        { situacion: 'Quieres cambiar el calendario', regla: 'El calendario no se acomoda entre compañeras. Lo entregan las autoridades del Centro y se cumple; un cambio se pide por la vía de permisos.' },
        { situacion: 'El tope de 18 permisos médicos', regla: 'El Manual lo escribe para los colaboradores de planilla y no dice si este puesto entra. Pregúntaselo a la Administración antes de darlo por hecho.' },
      ],
      errores: [
        'Avisar de palabra o por mensaje de voz: el permiso se solicita por escrito o no existe.',
        'Dar por aprobado el permiso al entregarlo: lo evalúa el supervisor inmediato.',
        'Contar con que el día autorizado se paga: cuando lo pides tú, no hay tiempo compensatorio.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'Tu trabajo se presta **por contrato de servicio y el pago es quincenal**. Y hay una regla que el Manual escribe en una sola línea, sin matices: **si falta un día, se le descuenta.**' },

      { t: 'sub', texto: 'El horario establecido' },
      {
        t: 'tabla',
        encabezados: ['Días', 'Horario'],
        filas: [
          ['Lunes a viernes', '12:30 a 3:00 p.m.'],
          ['Sábados', '12:00 a 1:00 p.m.'],
        ],
      },
      { t: 'p', texto: 'El Manual fija ese horario y no lo explica: lo que exige es cumplirlo. Llegar tarde no se arregla quedándose después, porque el turno es el convenido y sobre él te miden la asistencia y la puntualidad.' },
      { t: 'nota', tono: 'regla', titulo: 'Puntualidad es una función, no una cortesía', texto: '"Puntualidad y asistencia en los horarios convenidos" es una de las funciones formales de tu cargo, escrita en la misma lista que "limpieza de baños completos". No es un extra de buena conducta: es parte del trabajo contratado.' },

      { t: 'sub', texto: 'Calendarios y horarios' },
      { t: 'p', texto: 'El Manual dice que el personal de limpieza **recibirá y respetará los calendarios y horarios establecidos por las autoridades del Centro**. Es decir: el calendario no se negocia entre compañeras ni se acomoda por conveniencia. Te lo entregan, y se cumple. Si necesitas un cambio, se pide por la vía de permisos.' },

      { t: 'sub', texto: 'Cómo se pide un permiso' },
      {
        t: 'pasos',
        items: [
          'Los permisos se solicitan **por escrito**. No por mensaje de voz, no de palabra en el pasillo.',
          'Con un mínimo de **tres (3) días de anticipación**.',
          'Se presentan mediante el formato de **SOLICITUD DE PERMISOS** y van dirigidos al **Administrador del Centro**.',
          'El supervisor inmediato evalúa que la ausencia no entorpezca el funcionamiento normal de la empresa y que la razón sea valedera.',
          'El permiso queda autorizado **únicamente con la firma del Administrador**.',
          'Ese documento se entrega al **Coordinador Operativo** inmediatamente después de autorizado y reposa en tu file personal.',
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'Un permiso solicitado no es un permiso aprobado', texto: 'El Manual es explícito: la solicitud de tiempo no significa una aprobación por parte de la empresa, y el Administrador está en todo su derecho de negar el permiso solicitado a fin de no perjudicar el desempeño de la empresa.' },

      { t: 'sub', texto: 'Un permiso no es tiempo pagado' },
      { t: 'p', texto: 'El Manual lo dice para todos los colaboradores: los permisos son una **justificación ante ALOHA, no una justificación para el pago** del tiempo solicitado. Cuando el permiso lo pide el propio colaborador, no se maneja tiempo compensatorio. Y en tu caso, además, tu contrato ya trae la regla propia: si faltas un día, se te descuenta.' },
      { t: 'nota', tono: 'ojo', titulo: 'El tope de 18 permisos médicos no está resuelto para este puesto', texto: 'El Manual establece que los colaboradores que forman parte de la planilla tienen un máximo de 18 permisos al año con justificación médica para que la empresa se haga cargo del pago, y que al exceder ese tope el pago lo asume la Caja de Seguro Social. El Manual no dice si el personal de limpieza entra o no en ese conteo. Lo único que deja escrito para tu puesto es la regla de pago. Si necesitas saber cómo se aplica el tope en tu caso, pregúntalo a la Administración del Centro antes de darlo por hecho.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Es jueves y te avisan que el lunes tienes cita en la Caja de Seguro Social a las 11:00 a.m. Escribe: (a) cuándo a más tardar debes entregar la solicitud, (b) a quién se la entregas, (c) qué pasa con el pago de ese día si te autorizan el permiso, y (d) qué pasa si en vez de pedirlo simplemente no vas.' },
    ],

    quiz: [],
    drills: [],
  },

  {
    id: 'of-ase-3',
    curso: 'aseo',
    orden: 30,
    roles: [],
    titulo: 'Hoja 3 · Las funciones: la lista completa, sin que te la recuerden',
    duracionMin: 20,
    requiere: [],
    fuente: [
      'curso-6-apoyo-aseo.html#m3',
      'manual-operaciones-completo.md#3-personal-de-apoyo-y-aseo',
      'manual-operaciones-completo.md#3.3-detalles-y-calendario-de-funciones',
    ],

    pfv: 'Ejecutas la lista completa de funciones del puesto sin que nadie te la recuerde, y avisas del reemplazo de un implemento mientras todavía queda producto para trabajar.',
    voz: 'El Manual enumera tus funciones una por una. <break time="0.4s"/> No hay un y lo que salga: lo que sale también está en la lista. <break time="0.3s"/> Porque la lista incluye la verificación visual de todas las áreas. <break time="0.5s"/> Entrada principal, puertas de vidrio y marco. Paredes y esquinas, altas y bajas. <break time="0.3s"/> Pisos. Mesas, patas de mesas y sillas. Salones completos. Baños completos. <break time="0.4s"/> Y el retiro de basuras de todas las áreas. De todas. <break time="0.5s"/> Ahora la función que más se pierde. <break time="0.3s"/> Asegurar contar con todos los implementos y notificar su próximo reemplazo. <break time="0.4s"/> El Manual agrega la palabra clave entre paréntesis: anticiparse. <break time="0.3s"/> Avisar el día que se acabó no es anticiparse. <break time="0.4s"/> La compra pasa por el proceso administrativo del Centro y toma tiempo. <break time="0.5s"/> Y una cosa que NO es tuya. <break time="0.3s"/> Pintura, instalaciones y reparaciones tienen proveedor propio y las gestiona la Administración.',

    masa: [
      'Esta hoja impresa y el recorrido completo del Centro para caminarlo mientras se lee.',
      'El calendario de trabajo que te entregó el Centro.',
      'El armario de implementos de limpieza, abierto, para ver qué queda de cada producto.',
    ],

    palabras: [
      'personal-de-apoyo-y-aseo',
      'asistente-administrativo',
      'proveedor',
      'caja-menuda',
      'balboa',
      'proyeccion-de-necesidades',
    ],

    sop: {
      proceso: 'Las funciones del puesto y el aviso de implementos',
      cuando: 'Cada turno, y el aviso de implementos apenas veas que un producto se acaba.',
      aplicaA: ['Personal de apoyo y aseo'],
      producto: 'Las áreas del Centro completas al final del turno, y el próximo reemplazo de implementos avisado con tiempo.',
      pasos: [
        'Limpia la entrada principal, las puertas de vidrio y el marco.',
        'Sacude paredes y esquinas, altas y bajas. Las altas son las que se saltan con prisa.',
        'Limpia los pisos de todas las áreas, no solo el pasillo de entrada.',
        'Limpia mesas, patas de mesas y sillas: el Manual las nombra aparte.',
        'Limpia los salones completos y los baños completos.',
        'Retira las basuras de todas las áreas: oficina, salones y baños.',
        'Revisa los implementos y notifica el próximo reemplazo mientras todavía queda producto.',
        'Haz la verificación visual de todas las áreas antes de irte.',
        'Si algo quedó sin cerrar dentro del turno, avísale a tu Supervisor Inmediato antes de salir.',
      ],
      decide: [
        { situacion: 'Un producto se está acabando', regla: 'Se notifica ahora, mientras todavía queda para trabajar. La compra pasa por el proceso administrativo del Centro y no es inmediata.' },
        { situacion: 'Algo del local está roto', regla: 'No es de tu puesto. Pintura, instalaciones y reparaciones las gestiona la Administración con SUPLIDORES DEL ISTMO, S.A.' },
        { situacion: 'Hay que comprar algo', regla: 'Tú no compras. Las compras menores van por Caja Menuda, con un máximo de B/.45,00, y las gestiona la parte administrativa.' },
      ],
      errores: [
        'Avisar el día que se acabó el producto: eso no es anticiparse, y ese día el área no queda.',
        'Saltarse las esquinas altas y las patas de las mesas porque hay que agacharse.',
        'Irse sin la verificación visual final: es una función escrita, no un detalle.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'El Manual enumera tus funciones una por una. No hay "y lo que salga": lo que sale también está en la lista, porque la lista incluye la **verificación visual de todas las áreas**. Esta es la lista, agrupada para que te sirva de recorrido.' },

      { t: 'sub', texto: 'Las áreas físicas' },
      {
        t: 'tabla',
        encabezados: ['Función (texto del Manual)', 'Nota práctica'],
        filas: [
          ['Limpieza de entrada principal, puertas de vidrio y marco', 'Es lo primero que ve el padre. El vidrio con huellas y el marco con polvo se notan desde la calle'],
          ['Sacudir paredes, esquinas altas y bajas', 'Las esquinas altas son las que se saltan cuando se va con prisa'],
          ['Limpieza de pisos', 'Todas las áreas, no solo el pasillo de entrada'],
          ['Limpieza de mesas, patas de mesas y sillas', 'El Manual las nombra aparte, así que se limpian aunque haya que agacharse'],
          ['Limpieza de salones completos', 'Completos quiere decir completos'],
          ['Limpieza de baños completos', 'El baño es el punto donde el padre decide si el Centro es serio'],
          ['Retiro de basuras de todas las áreas', 'De todas. Incluye oficina, salones y baños'],
          ['Verificación visual de mantener en orden todas las áreas del Centro', 'Recorrer y mirar al final, antes de irte'],
        ],
      },

      { t: 'sub', texto: 'Los implementos: la función de anticiparse' },
      { t: 'p', texto: 'Tu lista incluye **asegurar contar con todos los implementos de limpieza y notificar su próximo reemplazo**. El Manual agrega entre paréntesis la palabra clave: **(anticiparse)**.' },
      { t: 'p', texto: 'Avisar el día que se acabó no es anticiparse. El Manual no fija ningún número —ni medio envase, ni tantos días de reserva—: escribe la palabra anticiparse, y eso significa notificar el próximo reemplazo mientras todavía queda producto para trabajar. La compra no es inmediata: el Asistente Administrativo tiene que redactar el informe de necesidades de suministros, útiles de oficina y materiales de aseo, y esa compra pasa por el proceso administrativo del Centro.' },
      { t: 'nota', tono: 'alerta', titulo: 'Lo que cuesta avisar tarde', texto: 'El día que no hay desinfectante, el baño igual tiene que quedar limpio, y no va a quedar. La función que quedó sin cumplir no es la limpieza del baño: es la de notificar el próximo reemplazo a tiempo.' },
      { t: 'p', texto: 'Las compras menores del Centro se manejan por **Caja Menuda**, con un máximo de **B/.45,00** por compra, y quien las gestiona y las repone en el sistema es la parte administrativa. Tú no compras: tú reportas con tiempo.' },

      { t: 'sub', texto: 'Lo que no es tu función' },
      { t: 'p', texto: 'El mantenimiento —entiéndase pintura, instalaciones, reparaciones— tiene proveedor propio: **SUPLIDORES DEL ISTMO, S.A.**, y es la Administración del Centro la que lo gestiona. Una llave que gotea, un tomacorriente flojo o una pared golpeada no se reparan desde tu puesto: la reparación no aparece en tu lista de funciones. Lo que sí aparece es la verificación visual de mantener en orden todas las áreas del Centro.' },

      { t: 'sub', texto: 'El calendario de funciones' },
      { t: 'p', texto: 'El Manual abre una sección llamada **Detalles y Calendario de Funciones**, pero no fija ahí un calendario único para todos los Centros. Lo que sí establece, y es lo que te obliga, es que recibes y respetas los calendarios y horarios establecidos por las autoridades del Centro. Sobre ese calendario te evalúan el cumplimiento.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Llegas un lunes y encuentras el salón 2 con papelitos de una actividad del sábado, el vidrio de la entrada con marcas de manos, y el frasco de limpiavidrios casi vacío. Solo tienes tu horario normal. Escribe en qué orden lo resuelves y qué reportas, a quién y en qué momento del turno.' },
    ],

    quiz: [],
    drills: [],
  },

  {
    id: 'of-ase-4',
    curso: 'aseo',
    orden: 31,
    roles: [],
    titulo: 'Hoja 4 · Imagen, trato y confidencialidad',
    duracionMin: 15,
    requiere: [],
    fuente: [
      'curso-6-apoyo-aseo.html#m4',
      'manual-operaciones-completo.md#protocolo-de-vestimenta',
      'manual-operaciones-completo.md#confidencialidad',
    ],

    pfv: 'Te presentas y hablas dentro del Centro como pide el protocolo, y la información del Centro y de las familias no sale de ahí por tu boca.',
    voz: 'El Manual tiene un protocolo de vestimenta que se cumple en todos los Centros. <break time="0.4s"/> Y dedica un punto a ti. <break time="0.3s"/> Aunque no uses uniforme oficial, debes vestir de forma adecuada a tus funciones. <break time="0.3s"/> Con ropa limpia y en buen estado. <break time="0.5s"/> No llevar uniforme no es una excepción al protocolo. <break time="0.3s"/> Es una responsabilidad mayor, porque no tienes una camisa institucional que resuelva la imagen por ti. <break time="0.4s"/> Dos de tus funciones escritas son de conducta, no de limpieza. <break time="0.3s"/> Vestimenta de decoro y profesionalismo. Y vocabulario adecuado dentro del Centro. <break time="0.4s"/> Eso incluye lo que se habla entre compañeras mientras se trabaja. <break time="0.3s"/> Hay niños y hay padres esperando. Lo que se dice en el pasillo se oye. <break time="0.5s"/> Y la parte más seria. <break time="0.3s"/> Las listas de clientes y la información financiera del Centro son confidenciales. <break time="0.4s"/> Divulgarlas es causal de acción disciplinaria, despido y acción legal.',

    masa: [
      'Esta hoja impresa y el acuerdo de no divulgación que firmaste.',
      'El protocolo de vestimenta del Centro.',
      'La recepción del Centro, para ver desde dónde se oye lo que se habla en el pasillo.',
    ],

    palabras: [
      'contrato-de-confidencialidad',
      'ley-81-de-2019',
      'falta-grave',
      'accion-disciplinaria',
      'representante',
      'cliente',
      'colaborador',
    ],

    sop: {
      proceso: 'Imagen, trato al cliente y confidencialidad',
      cuando: 'Todos los días, desde que entras al Centro hasta que sales.',
      aplicaA: ['Personal de apoyo y aseo'],
      producto: 'Una presentación que proyecta orden y cuidado, y ninguna información del Centro saliendo por tu boca.',
      pasos: [
        'Preséntate con ropa limpia, en buen estado y adecuada a tus funciones.',
        'Cabello limpio y peinado de forma ordenada, aretes y accesorios discretos, uñas arregladas.',
        'Cuida el vocabulario dentro del Centro, también lo que hablas con las compañeras.',
        'Recibe a cada persona con cortesía y disposición de servicio, estés en lo que estés.',
        'Si un padre te hace un comentario o una queja, escúchalo con amabilidad.',
        'Dirígelo a tu Supervisor Inmediato. No opinas del Coach, del avance de un niño ni de los pagos.',
        'No fotografíes documentos ni pantallas del Centro.',
        'No comentes afuera qué niño se retiró o qué representante debe.',
        'No pases el número de teléfono de un representante a nadie, por conocido que sea.',
      ],
      decide: [
        { situacion: 'Un padre te pide tu opinión', regla: 'Lo escuchas con amabilidad, no opinas y lo diriges a tu Supervisor Inmediato. Esa conversación no es de tu puesto.' },
        { situacion: 'Alguien te pide un dato de una familia', regla: 'No se da. Las listas y referencias de clientes son información confidencial, protegida por el acuerdo de no divulgación y por la Ley 81 de 2019.' },
        { situacion: 'No usas uniforme oficial', regla: 'No es una excepción al protocolo: es una responsabilidad mayor. La presentación tiene que proyectar orden y cuidado igual.' },
      ],
      errores: [
        'Hablar en el pasillo como si no hubiera nadie: hay niños y padres esperando, y se oye.',
        'Contar afuera qué niño se retiró o qué representante está atrasado con su pago.',
        'Opinar sobre el Coach delante de un padre para quedar bien en el momento.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'El Manual tiene un **Protocolo de Vestimenta** que se cumple en todos los Centros, y dedica un punto específico al personal de limpieza.' },

      { t: 'sub', texto: 'Vestimenta y presentación' },
      { t: 'nota', tono: 'regla', titulo: 'Lo que dice el Manual para tu puesto', texto: 'Aunque no utilicen uniforme oficial de ALOHA, deberán vestir de forma adecuada a sus funciones, con ropa limpia y en buen estado, y mantener siempre una presentación que proyecte orden y cuidado.' },
      { t: 'p', texto: 'No llevar uniforme **no es una excepción** al protocolo: es una responsabilidad mayor, porque no tienes una camisa institucional que resuelva la imagen por ti.' },
      {
        t: 'lista',
        items: [
          'Cabello siempre limpio y peinado de forma ordenada.',
          'Aretes y accesorios discretos.',
          'Uñas arregladas.',
        ],
      },

      { t: 'sub', texto: 'Dos funciones que son de conducta' },
      {
        t: 'lista',
        items: [
          'Realizar tu trabajo con **vestimenta de decoro y profesionalismo**.',
          'Utilizar **expresiones y vocabulario adecuado** dentro del Centro.',
        ],
      },
      { t: 'p', texto: 'La segunda incluye lo que se habla entre compañeras mientras se trabaja. En un Centro ALOHA hay niños de 4 a 13 años y padres esperando en la recepción; lo que se dice en el pasillo se oye.' },

      { t: 'sub', texto: 'Relaciones con el cliente' },
      { t: 'p', texto: 'El Manual lo pone así: cada miembro del equipo es la cara visible de ALOHA Mental Arithmetic ante nuestros clientes y el público en general, y nada es más importante que ser cortés, ameno, servicial y bien dispuesto a la hora de atender al cliente. Los clientes juzgan a la organización por el trato que reciben de cada colaborador. **Cada uno** incluye al que está trapeando cuando el padre entra.' },
      { t: 'p', texto: 'Si un padre te hace un comentario o una queja, el Manual establece que los clientes que deseen realizar comentarios o quejas específicas deben ser **recibidos con atención y dirigidos a su Supervisor Inmediato**. Escuchas con amabilidad y lo diriges. No opinas sobre el Coach, ni sobre el avance de un niño, ni sobre los pagos.' },

      { t: 'sub', texto: 'Qué es información confidencial' },
      { t: 'p', texto: 'Trabajas dentro de las oficinas del Centro. Ves papeles sobre los escritorios, listas pegadas en la pared y pantallas encendidas. El Manual clasifica como información confidencial, entre otras: **listas de clientes, referencias de clientes, información financiera, información sobre la compensación, estrategias de comercialización y la Técnica ALOHA**.' },
      { t: 'p', texto: 'Todos los colaboradores deben firmar un **acuerdo de no divulgación**. En la práctica: no fotografíes documentos ni pantallas, no comentes afuera qué niño se retiró o qué padre debe, y no pases números de teléfono de representantes a nadie, por más conocido que sea.' },

      { t: 'sub', texto: 'La consecuencia está escrita' },
      { t: 'nota', tono: 'alerta', titulo: 'Falta grave', texto: 'Quien divulgue o utilice de manera impropia secretos comerciales o información comercial confidencial queda sujeto a acción disciplinaria, extinción de la relación laboral y acción legal, aun cuando no reciba ningún beneficio real de esa divulgación.' },
      { t: 'p', texto: 'El Manual además se apoya en la **Ley 81 de 2019** de Protección de Datos Personales: los datos de los niños y de sus representantes están protegidos por ley, no solo por norma interna.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Mientras limpias la recepción, una señora que espera te dice: "usted que anda por todos lados, dígame la verdad, ¿la maestra de mi hijo sí es la que estaba antes o la cambiaron?". Escribe qué le respondes, qué no le respondes y qué haces después.' },
    ],

    quiz: [],
    drills: [],
  },

  {
    id: 'of-ase-5',
    curso: 'aseo',
    orden: 32,
    roles: [],
    titulo: 'Hoja 5 · Si hay un accidente y tú estás ahí',
    duracionMin: 15,
    requiere: [],
    fuente: [
      'curso-6-apoyo-aseo.html#m5',
      'manual-operaciones-completo.md#protocolo-de-accidentes',
    ],

    pfv: 'Si un niño se accidenta y tú estás presente, lo aseguras, avisas de inmediato al Administrador y puedes decir después la hora exacta, cómo ocurrió, dónde y quiénes estaban.',
    voz: 'El protocolo de accidentes aplica a todos los que estén dentro del Centro. <break time="0.4s"/> Estudiantes, coaches, administradores y personal. <break time="0.3s"/> Personal te incluye a ti. Si estás en el Centro, estás dentro del protocolo. <break time="0.5s"/> Tres principios y ninguno se negocia. <break time="0.3s"/> La seguridad del estudiante es prioridad en todo momento. <break time="0.3s"/> Todo incidente, por leve que parezca, se reporta y se documenta. <break time="0.3s"/> Y la notificación es inmediata, veraz y responsable. <break time="0.5s"/> Si tú eres quien está presente, haces tres cosas. <break time="0.3s"/> Primero, primeros auxilios básicos y asegurar la integridad del niño. <break time="0.4s"/> Segundo, notificar de inmediato al Administrador del Centro. <break time="0.3s"/> De inmediato quiere decir en ese momento, no al terminar tu turno. <break time="0.4s"/> Y tercero, quedarte y observar. <break time="0.3s"/> Hora exacta, cómo ocurrió, dónde y quiénes estaban presentes. <break time="0.4s"/> Eso te lo van a preguntar como testigo. <break time="0.4s"/> Y no decides tú si el golpe amerita reporte. Eso no es tuyo.',

    masa: [
      'Esta hoja impresa y el Reporte de Accidente Escolar ALOHA en blanco, para verlo.',
      'El teléfono del Administrador del Centro, a mano.',
      'El recorrido del Centro para señalar dónde ocurren los tropiezos: pasillo, escalón, baño.',
    ],

    palabras: [
      'primeros-auxilios',
      'incidente',
      'reporte-de-accidente-escolar',
      'sancion-administrativa',
      'administrador-de-centro',
      'representante',
      'veraz',
    ],

    sop: {
      proceso: 'Qué haces si un niño se accidenta y tú estás presente',
      cuando: 'En el momento en que ocurre, no al terminar el turno.',
      aplicaA: ['Personal de apoyo y aseo'],
      producto: 'El niño asegurado, el Administrador avisado en ese momento y los datos del hecho listos para el reporte.',
      pasos: [
        'Brinda primeros auxilios básicos y asegura la integridad del niño.',
        'Notifica de inmediato al Administrador del Centro. De inmediato es ahora, no al salir.',
        'Quédate y observa. No sigas con tu tarea como si no hubiera pasado.',
        'Fíjate en la hora exacta en que ocurrió.',
        'Fíjate en cómo ocurrió y en dónde ocurrió, con el sitio exacto.',
        'Fíjate en quiénes estaban presentes: es lo que te van a preguntar como testigo.',
        'Cuando te pregunten, di lo que viste, aunque el resultado incomode a alguien.',
        'No decidas tú si el hecho amerita reporte: todo incidente se reporta, por leve que parezca.',
      ],
      decide: [
        { situacion: 'El niño dice que no le duele', regla: 'Igual se reporta. Todo incidente o accidente, por leve que parezca, debe ser reportado y documentado; no lo decides tú.' },
        { situacion: 'Hay que llamar al representante o trasladar al niño', regla: 'Eso lo hace la Administración. El traslado por el servicio de ambulancia contratado va siempre con autorización del representante.' },
        { situacion: 'Te preguntan qué viste', regla: 'No se omiten ni se alteran datos. Toda la información debe ser objetiva y verificable, aunque incomode.' },
      ],
      errores: [
        'Avisar al terminar el turno: la notificación tiene que ser inmediata.',
        'Decidir por tu cuenta que el golpe fue leve y no vale la pena reportarlo.',
        'Suavizar lo que viste para no meter a nadie en problemas.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'El protocolo de accidentes de ALOHA aplica a todos los estudiantes, coaches, administradores y **personal** que se encuentren dentro de las instalaciones o en actividades oficiales del Centro. Personal incluye al personal de apoyo y aseo. Si estás en el Centro, estás dentro del protocolo.' },

      { t: 'sub', texto: 'Los tres principios' },
      {
        t: 'lista',
        items: [
          'La seguridad y el bienestar del estudiante son prioridad en todo momento.',
          'Todo incidente o accidente, **por leve que parezca**, debe ser reportado y documentado.',
          'La notificación debe ser **inmediata, veraz y responsable**.',
        ],
      },

      { t: 'sub', texto: 'Qué haces tú si estás presente' },
      {
        t: 'pasos',
        items: [
          'Brinda **primeros auxilios básicos** y asegura la integridad del niño.',
          'Notifica **de inmediato** al Administrador del Centro. De inmediato quiere decir en ese momento, no al terminar tu turno.',
          'Quédate y observa. Fíjate en la hora exacta, en cómo ocurrió, dónde y quiénes estaban presentes: el Reporte de Accidente Escolar ALOHA pide justamente eso, y a ti te lo van a preguntar como testigo.',
        ],
      },

      { t: 'sub', texto: 'Qué hace la Administración después' },
      {
        t: 'lista',
        items: [
          'Completar el reporte el mismo día.',
          'Contactar al representante.',
          'Coordinar el traslado por el servicio de ambulancia contratado por el Centro si hace falta, **siempre con autorización del representante**.',
          'Verificar la cobertura de la póliza.',
          'Archivar copia digital en el portafolio del estudiante dentro de las 24 horas.',
        ],
      },

      { t: 'sub', texto: 'Lo que no se puede omitir' },
      { t: 'nota', tono: 'alerta', titulo: 'Un accidente no reportado', texto: 'Constituye una falla grave en el protocolo de seguridad y puede derivar en sanción administrativa. El Manual agrega: no se deben omitir ni alterar datos; toda la información debe ser objetiva y verificable.' },
      { t: 'p', texto: 'Si te preguntan qué viste, dices lo que viste, aunque el resultado incomode a alguien.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Estás limpiando el pasillo. Un niño viene corriendo, resbala y se golpea el codo contra la pared. Se levanta solo, dice que no le duele y entra al salón. Nadie más lo vio. Escribe qué haces en los siguientes cinco minutos y por qué, según el principio del Manual, no es una decisión tuya si eso "amerita reporte" o no.' },
    ],

    quiz: [],
    drills: [],
  },

  {
    id: 'of-ase-6',
    curso: 'aseo',
    orden: 33,
    roles: [],
    titulo: 'Hoja 6 · Control de calidad: con qué te miden',
    duracionMin: 15,
    requiere: [],
    fuente: [
      'curso-6-apoyo-aseo.html#m6',
      'manual-operaciones-completo.md#3.4-control-de-calidad',
    ],

    pfv: 'Sabes los seis parámetros con los que te evalúan, y llegas a tu evaluación con el calendario a la vista y los avisos que diste ya registrados.',
    voz: 'Tu evaluación no queda al criterio del día. <break time="0.4s"/> El Manual establece que el Asistente Administrativo realiza las evaluaciones de desempeño. <break time="0.3s"/> Y fija seis parámetros. Estos seis. <break time="0.5s"/> Asistencia y puntualidad. <break time="0.3s"/> Realización de funciones. <break time="0.3s"/> Cumplimiento de calendarios de trabajo. <break time="0.3s"/> Buena ejecución de los trabajos realizados, en velocidad y efectividad. <break time="0.3s"/> Buen trato y disposición de servicios. <break time="0.3s"/> Y buena presencia y buenas maneras, verbal y no verbal. <break time="0.5s"/> Fíjate en el cuarto. <break time="0.3s"/> Se te mide por las dos cosas juntas: rápido y bien. <break time="0.4s"/> Rápido y mal no cuenta. Lento y bien tampoco. <break time="0.5s"/> Y para prepararte, tres cosas. <break time="0.3s"/> Ten a la vista el calendario que te entregó el Centro. <break time="0.3s"/> Marca qué funciones te cuesta cerrar dentro del horario, y dilo antes de la evaluación. <break time="0.4s"/> Y deja constancia de cuándo avisaste que un producto se estaba acabando.',

    masa: [
      'Esta hoja impresa y el calendario de trabajo que te entregó el Centro.',
      'La hoja 3, con la lista de funciones, para marcar cuáles cuestan dentro del horario.',
      'La constancia de los avisos de implementos que diste en el período.',
    ],

    palabras: [
      'evaluacion-de-desempeno',
      'asistente-administrativo',
      'file-del-colaborador',
      'sancion-administrativa',
      'contrato-de-confidencialidad',
      'quincena',
    ],

    sop: {
      proceso: 'Control de calidad: los seis parámetros de tu evaluación',
      cuando: 'Todo el período, y con más razón la semana antes de la evaluación.',
      aplicaA: ['Personal de apoyo y aseo'],
      producto: 'Tu evaluación de desempeño discutida con datos: el calendario a la vista y los avisos que diste con fecha.',
      pasos: [
        'Aprende los seis parámetros: son los mismos con los que te van a evaluar siempre.',
        'Ten a la vista el calendario de trabajo que te entregó el Centro.',
        'Repasa la lista de funciones y marca cuáles te cuesta cerrar dentro del horario.',
        'Habla de esas antes de la evaluación con el Asistente Administrativo, no después.',
        'Reporta los implementos con anticipación y deja constancia de cuándo lo hiciste.',
        'Pide retroalimentación cuando termines un área a la que le pusiste esfuerzo extra.',
        'Recuerda que el parámetro de ejecución mide velocidad y efectividad juntas.',
        'Si un área quedó sin cerrar, infórmalo antes de irte: eso también es realización de funciones.',
      ],
      decide: [
        { situacion: 'Una función no cabe en el horario', regla: 'Se dice antes de la evaluación, no después. Esa es la conversación honesta con el Asistente Administrativo.' },
        { situacion: 'Te marcan bajo en un parámetro', regla: 'Se discute con evidencia: el calendario del período y la fecha de los avisos que diste. Sin datos es tu palabra contra la nota.' },
        { situacion: 'Terminaste rápido pero a medias', regla: 'No cuenta. El parámetro mide velocidad y efectividad juntas, y un salón limpiado a medias se nota apenas entran los niños.' },
      ],
      errores: [
        'Trabajar más rápido solo la semana de la evaluación: el parámetro mide el período completo.',
        'Callar que una función no cabe en el horario y explicarlo cuando ya está la nota puesta.',
        'Avisar de un implemento de palabra y sin fecha: después no hay cómo demostrarlo.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'El Manual no deja tu evaluación al criterio del día. Establece que, para garantizar la calidad de los servicios prestados, **el Asistente Administrativo se encargará de realizar las evaluaciones de desempeño** siguiendo seis parámetros.' },

      { t: 'sub', texto: 'Quién te evalúa' },
      { t: 'p', texto: 'El Asistente Administrativo del Centro. Es el mismo que supervisa tu trabajo día a día, según Coordinación de Mantenimiento de Centro. No te evalúa el Coach, ni un compañero con más antigüedad, ni el Corporativo.' },

      { t: 'sub', texto: 'Los seis parámetros' },
      {
        t: 'tabla',
        encabezados: ['#', 'Parámetro', 'Dónde se decide'],
        filas: [
          ['1', 'Asistencia y puntualidad', 'En la hora de entrada de cada día, no en el promedio del mes'],
          ['2', 'Realización de funciones', 'La lista completa de la hoja 3, incluida la verificación visual final'],
          ['3', 'Cumplimiento de calendarios de trabajo', 'El calendario que te entregó el Centro, no el orden que a ti te acomoda'],
          ['4', 'Buena ejecución de los trabajos realizados (velocidad y efectividad)', 'Las dos cosas juntas: rápido y bien. Rápido y mal no cuenta; lento y bien tampoco'],
          ['5', 'Buen trato y disposición de servicios', 'Cómo respondes cuando te piden algo fuera de lo previsto'],
          ['6', 'Buena presencia y buenas maneras (verbal y no verbal)', 'Cómo te ves y cómo hablas, y también la cara con la que lo haces'],
        ],
      },

      { t: 'sub', texto: 'El parámetro que más se pierde' },
      { t: 'p', texto: 'Fíjate en el parámetro 4. Dos de tus funciones escritas son "realizar su trabajo con rapidez y eficiencia" y que las áreas queden **completas**. El Manual te mide por las dos a la vez, porque un Centro que abre tarde porque el salón no estaba listo pierde clase, y un salón limpiado a medias en tiempo récord se nota apenas entran los niños.' },

      { t: 'sub', texto: 'Las consecuencias que sí están escritas' },
      {
        t: 'tabla',
        encabezados: ['Situación', 'Lo que dice el Manual'],
        filas: [
          ['Faltas un día', 'Se te descuenta de la quincena'],
          ['Divulgas información confidencial', 'Acción disciplinaria, extinción de la relación laboral y acción legal'],
          ['Presencias un accidente y no lo reportas', 'Falla grave del protocolo de seguridad; puede derivar en sanción administrativa'],
        ],
      },

      { t: 'sub', texto: 'Cómo prepararte para tu evaluación' },
      {
        t: 'lista',
        items: [
          'Ten a la vista el calendario de trabajo que te entregó el Centro.',
          'Repasa la lista de funciones de la hoja 3 y marca cuáles te cuesta cerrar dentro del horario. Esa es la conversación honesta que hay que tener con el Asistente Administrativo **antes** de la evaluación, no después.',
          'Reporta los implementos con anticipación y deja constancia de cuándo lo hiciste: notificar el próximo reemplazo es una de tus funciones escritas.',
          'Pide retroalimentación cuando termines un área a la que le pusiste esfuerzo extra. La evaluación mide lo que se ve.',
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'En tu evaluación te marcan bajo en "cumplimiento de calendarios de trabajo". Tú sientes que el Centro siempre quedó limpio. Escribe qué evidencia deberías haber tenido guardada durante el período para discutir esa nota con datos, y qué vas a hacer distinto desde mañana.' },
    ],

    quiz: [],
    drills: [],
  },
]
