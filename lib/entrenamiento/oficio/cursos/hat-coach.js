// Paquete del puesto — Coach ALOHA. Un solo módulo: `of-hat-coa`.
// El mapeo de vocabulario viejo -> nuevo (hat, PFV, masa, gradiente, drill,
// checksheet, oficial de entrenamiento) vive en la cabecera de cursos/metodo.js.
// Aquí se renombró solo lo VISIBLE: ni un identificador, ni una cifra, ni un plazo.
//
// FUENTE (contenido ya auditado contra la sección 4 del Manual; aquí solo se
// adaptó el formato, conservando cifras, plazos, montos y responsables):
//   plataformas/aloha/training-moodle/curso-4-coach.html
//     §m0 (bienvenida: "el padre compró lo que pasa entre las 4 y las 6" y la
//          regla base "el Coach enseña y reporta, el Administrador decide")
//     §m1 (el perfil con la disponibilidad, los siete requisitos indispensables,
//          el Coach y la comunidad, el chaleco)
//   plataformas/aloha/manual-operaciones-completo.md §4 (Coach: puntualidad,
//     bono, asignación de grupos, evaluaciones del Administrador)
//   lib/desercion-coach.mjs (los cuatro candados de la alerta de deserción)
//
// LO QUE EL HTML NO TRAE Y UN PAQUETE DE PUESTO SÍ LLEVA, y por eso se escribió
// aquí: el producto, los cuatro sub-productos, la tabla de "lo que este puesto
// NO hace" y el flujo de quién le entrega y a quién entrega.
//
// LA LÍNEA QUE HAY QUE DEJAR CLAVADA. La ADMINISTRADORA le firma la maniobra de
// su puesto; el MASTER COACH le certifica el nivel de la técnica. Un puesto
// tomado no habilita un nivel, y un nivel certificado no cierra el puesto. Son
// dos cosas distintas y el sistema nuevo las puede confundir.
//
// HONESTIDAD SOBRE EL DINERO. El Manual NO le paga al Coach por retención: no
// le fija meta de deserción ni prima de producción. Sus dos palancas de dinero
// son el bono de puntualidad y la ASIGNACIÓN DE GRUPOS (los cinco criterios de
// of-coa-3). La alerta de deserción por Coach es instrumento del KPI, no norma
// del Manual, y así va escrita: como un dato con su brecha, nunca como juicio.
//
// POR QUÉ ESTE ARCHIVO Y NO cursos/hat.js: el curso `hat` tiene un módulo por
// puesto y cada rol vive en su archivo; cursos/hat.js solo los concatena.
// Lo mismo en lib/entrenamiento/respuestas-oficio/hat.js con RESPUESTAS_HAT_COA.
//
// El `id` es la CLAVE DE PROGRESO en entrenamiento_progreso.modulo: renombrarlo
// borra en silencio el avance de todo el mundo.
//
// Los índices correctos del quiz viven en
// lib/entrenamiento/respuestas-oficio/hat-coach.js (solo servidor).

export const HAT_COA = [
  {
    id: 'of-hat-coa',
    curso: 'hat',
    orden: 13,
    roles: ['coach'],
    titulo: 'Tu puesto: Coach ALOHA',
    duracionMin: 22,
    requiere: ['of-nor-9'],
    fuente: [
      'curso-4-coach.html#m0',
      'curso-4-coach.html#m1',
      'manual-operaciones-completo.md#coach-puntualidad-y-bono',
      'manual-operaciones-completo.md#asignacion-de-grupos',
      'lib/desercion-coach.mjs#candados',
    ],

    pfv: 'Niños que se quedan y suben de nivel — tu grupo entero llegando al Cierre, con su asistencia marcada al instante, su bitácora escrita clase por clase y su retroalimentación en el portafolio.',

    voz: 'El padre no compró un ábaco ni un libro. <break time="0.4s"/> Compró lo que pasa entre las cuatro y las seis de la tarde en tu salón. <break time="0.5s"/> Esto no es un módulo más. Esto es tu puesto. <break time="0.4s"/> Qué produces, qué decides y qué no decides. <break time="0.3s"/> De quién recibes y a quién le entregas. <break time="0.5s"/> La regla base de todo lo que viene es una sola. <break time="0.3s"/> El Coach enseña y reporta. El Administrador decide y habla con el padre. <break time="0.5s"/> Y tu producto no es dar la clase. <break time="0.4s"/> Son niños que se quedan y suben de nivel. <break time="0.3s"/> Tu grupo entero llegando al Cierre. <break time="0.5s"/> Con la asistencia marcada al instante. <break time="0.3s"/> La bitácora escrita clase por clase. <break time="0.3s"/> Y la retroalimentación en el portafolio. <break time="0.5s"/> Ojo con una confusión que este sistema puede sembrar. <break time="0.4s"/> Tu Administradora te firma la maniobra de tu puesto. <break time="0.3s"/> Tu nivel de la técnica te lo certifica el Master Coach. <break time="0.4s"/> Son dos cosas distintas, y ninguna sustituye a la otra.',

    masa: [
      'El paquete de tu puesto, impreso.',
      'El Manual de Operaciones abierto en la sección del Coach.',
      'Tu lista de asistencia y tu bitácora del grupo que tienes hoy.',
      'Tu certificado de nivel vigente, o la fecha de tu próximo entrenamiento con el Master Coach.',
    ],

    palabras: [
      'hat',
      'producto-final-valioso',
      'drill',
      'oficial-de-entrenamiento',
      'checksheet',
      'master-coach',
      'coach-de-planta',
      'contrato-de-servicios-profesionales',
      'bono-por-puntualidad',
      'cierre-de-nivel',
      'desercion',
      'administrador-de-centro',
    ],

    laminas: [
      {
        kicker: 'Por qué existe tu puesto',
        titulo: 'El padre compró lo que pasa entre las 4 y las 6',
        texto: 'No compró un ábaco ni un libro. Tú eres la parte del Programa que la familia ve, y la única que puede hacer que un niño se quede tres niveles o se retire en el primero.',
      },
      {
        kicker: 'La regla base',
        titulo: 'El Coach enseña y reporta',
        texto: 'El Administrador decide y habla con el padre. Cada vez que se cruza esa línea no se está ayudando: se está creando un problema que después alguien tiene que apagar.',
      },
      {
        kicker: 'Tu producto',
        titulo: 'Niños que se quedan y suben de nivel',
        items: [
          'Tu grupo entero llegando al Cierre de Nivel.',
          'Asistencia marcada al instante, clase por clase.',
          'Bitácora diaria y retroalimentación semanal.',
        ],
        cierre: 'Dar la clase es cómo se consigue. El producto es que el niño siga ahí en el nivel siguiente.',
      },
      {
        kicker: 'Los cuatro sub-productos',
        titulo: 'Dos se pagan, dos sostienen a los otros dos',
        items: [
          'Niños que llegan al Cierre de Nivel.',
          'Niños que pasan con Certificado de Nivel.',
          'Registro al día: asistencia, bitácora y portafolio.',
          'Puntualidad perfecta: 20 minutos antes, tolerancia de 15.',
        ],
      },
      {
        kicker: 'La confusión que hay que evitar',
        titulo: 'Dos firmas distintas, dos cosas distintas',
        items: [
          'La Administradora firma la maniobra de tu puesto.',
          'El Master Coach certifica tu nivel de la técnica.',
        ],
        cierre: 'Un puesto tomado no habilita un nivel. Un nivel certificado no cierra tu puesto.',
      },
      {
        kicker: 'El dinero, dicho claro',
        titulo: 'A ti no te pagan por retención',
        items: [
          'El Manual no te fija meta de deserción ni prima por ella.',
          'Te paga el bono de puntualidad, mensual.',
          'Y te asigna grupos por cinco criterios.',
        ],
        cierre: 'La alerta de deserción es un instrumento del sistema para saber dónde mirar. No es una sanción.',
      },
      {
        kicker: 'La disponibilidad',
        titulo: 'De 3:00 a 8:00 p.m., de lunes a viernes',
        texto: 'Y los sábados de 8:00 a 7:30 p.m. No es un detalle del currículum: es la razón por la que el Centro puede armar los grupos de un nivel completo.',
      },
      {
        kicker: 'La prueba del puesto',
        titulo: 'Decirlo de memoria, sin leerlo',
        texto: 'Tu Administradora te va a preguntar sin aviso cuál es tu producto. Si contestas con una lista de tareas o con dar buenas clases, el paso no está aprobado.',
      },
    ],

    bloques: [
      { t: 'sub', texto: 'Qué es esto' },
      { t: 'p', texto: 'El padre no compró un ábaco ni un libro. Compró **lo que pasa entre las 4 y las 6 de la tarde en tu salón**. Tú eres la parte del Programa que la familia ve, y la única que puede hacer que un niño se quede tres niveles o se retire en el primero.' },
      { t: 'p', texto: 'Este paquete no te enseña la técnica ALOHA: eso lo da el Master Coach en tu entrenamiento de nivel. Este paquete te enseña **cómo se opera el trabajo alrededor de la clase**: qué se registra, a quién se avisa, quién decide qué, y cuáles son las tres o cuatro cosas que si se hacen mal cuestan un niño, un grupo o el contrato.' },
      { t: 'nota', tono: 'regla', titulo: 'La regla base de todo lo que viene', texto: 'El Coach enseña y reporta. El Administrador decide y habla con el padre. Cada vez que te saltas esa línea no estás ayudando: estás creando un problema que después alguien tiene que apagar.' },

      { t: 'sub', texto: 'El producto de tu puesto' },
      { t: 'p', texto: 'El producto de un puesto no es una lista de tareas ni una actitud. Es una cosa que al final del mes existe o no existe, y que se puede contar. Si el puesto desaparece, ese producto deja de existir. Ese es el examen.' },
      { t: 'p', texto: '**Niños que se quedan y suben de nivel — tu grupo entero llegando al Cierre, con su asistencia marcada al instante, su bitácora escrita clase por clase y su retroalimentación en el portafolio.**' },
      { t: 'p', texto: '"Dar buenas clases" no es un producto: es la manera de conseguirlo. "Que los niños me quieran" tampoco. Un producto se cuenta, y este se cuenta: el Centro sabe cuántos niños empezaron tu nivel y cuántos llegaron al Cierre.' },

      { t: 'sub', texto: 'Los cuatro sub-productos que lo componen' },
      {
        t: 'tabla',
        encabezados: ['#', 'Sub-producto', 'Qué es exactamente', 'Dónde vive'],
        filas: [
          ['1', 'Niños que llegan al Cierre de Nivel', 'Los que empezaron tu grupo y siguen ahí el día de la presentación, sin haberse retirado por pérdida de clases, por técnica o por horario', 'Lista del grupo · cuadro de deserciones del Centro'],
          ['2', 'Niños que pasan con Certificado de Nivel', 'Los que aprobaron el examen. No los que recibieron Certificado de Participación, que reconoce que estuvo, no que aprobó', 'Actas de examen · certificados entregados en el Cierre'],
          ['3', 'Registro al día', 'Asistencia marcada al instante, bitácora diaria y retroalimentación semanal en el portafolio del niño', 'Lista de asistencia · calendario en Drive · Class Dojo'],
          ['4', 'Puntualidad perfecta', '20 minutos antes del inicio de tu clase, con 15 minutos de tolerancia', 'Informe de Puntualidad quincenal que arma la Asistente'],
        ],
      },
      { t: 'p', texto: 'El sub-producto 3 no paga nada por sí solo. Existe porque **sin él los dos primeros no se pueden probar**: un niño que se quedó y una retroalimentación que nunca se escribió son, para el Centro, lo mismo que un niño que se fue. Es medio de producción, no adorno.' },

      { t: 'sub', texto: 'Cómo se mide cada uno' },
      { t: 'p', texto: 'De los cuatro, el único que el sistema ya cuenta solo es el primero, y conviene que sepas exactamente qué mide antes de que alguien te lo enseñe en una pantalla.' },
      {
        t: 'tabla',
        titulo: 'Sub-producto 1 — La alerta de deserción por Coach',
        encabezados: ['Qué hace', 'Cómo lo hace'],
        filas: [
          ['De qué niños habla', 'De los retiros del trimestre, llegando al Coach por el grupo del niño'],
          ['A quién NO cuenta', 'Al niño graduado. Graduar es el trabajo bien hecho y jamás cuenta como falta tuya'],
          ['Qué motivos mira', 'Los que el aula sí controla: pérdida de clases, técnica y horario'],
          ['Contra qué te compara', 'Contra tu propio Centro. No contra un umbral del Manual ni contra otro Centro'],
          ['Cuándo se emite', 'Solo con los cuatro candados puestos: 15 niños expuestos, 3 bajas, razón de 1,5 veces y 3 niños de exceso'],
          ['Qué se te dice', 'El dato y su brecha: "son 5 niños de más". Nunca un juicio sobre ti'],
        ],
      },
      {
        t: 'tabla',
        titulo: 'Sub-productos 2, 3 y 4 — dónde se miran',
        encabezados: ['Sub-producto', 'Con qué se comprueba', 'Frecuencia'],
        filas: [
          ['Niños que pasan con Certificado de Nivel', 'El acta del examen y los certificados entregados; el de Participación no cuenta como aprobado', 'Por nivel'],
          ['Asistencia marcada', 'La lista del grupo, con la leyenda de colores del formato', 'Al instante de dar la clase'],
          ['Bitácora', 'El libro de record del Centro, con fecha y firma', 'Diaria'],
          ['Retroalimentación', 'La plantilla de retroalimentación en el portafolio del niño, en Class Dojo', 'Semanal'],
          ['Puntualidad', 'El Informe de Puntualidad que arma la Asistente con tu hora de llegada', 'Quincenal'],
        ],
      },

      { t: 'sub', texto: 'El dinero: lo que el Manual sí te paga y lo que no' },
      { t: 'p', texto: 'Aquí no se inventa nada. **El Manual no te paga por retención**: no te fija una meta de deserción ni una prima de producción por ella. Tus dos palancas de dinero son otras dos, y las dos están escritas.' },
      {
        t: 'tabla',
        encabezados: ['Palanca', 'Qué dice el Manual', 'Quién lo mide'],
        filas: [
          ['Bono por puntualidad perfecta', 'Llegar 20 minutos antes del inicio de tu clase, con 15 minutos de tolerancia. B/.15,00 mensuales con un grupo, más B/.5,00 por cada grupo adicional', 'La Asistente Administrativa, con el Informe de Puntualidad quincenal'],
          ['Asignación de grupos', 'Se decide por cinco criterios: asistencia, entrenamientos trimestrales, reuniones semanales con el Administrador, Campeonatos y evaluaciones de rendimiento', 'El Administrador del Centro'],
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'La alerta de deserción es del KPI, no del Manual', texto: 'Es un instrumento del sistema para saber dónde mirar, con cuatro candados puestos justamente para no señalar a nadie por ruido. Si alguna vez aparece tu nombre, lo que se abre es una conversación con tu Administradora sobre qué se puede corregir. No es una sanción, no te quita el bono y no está escrita en el Manual. Eso hay que decirlo así, y no al revés.' },

      { t: 'sub', texto: 'El perfil del puesto y la disponibilidad' },
      { t: 'p', texto: 'El perfil del Coach ALOHA es un profesional de la educación o de las ciencias de la pedagogía, psicología y afines, de entre **22 y 45 años**, con experiencia en manejo de grupos de niños de **4 a 16 años**, y con trabajo estable en horarios de la mañana. Es decir, con disponibilidad **de 3:00 a 8:00 p.m. de lunes a viernes y de 8:00 a 7:30 p.m. los sábados**.' },
      { t: 'p', texto: 'Esa última línea no es un detalle de currículum: es la razón por la que el Centro puede armar los grupos. Un Coach que "casi siempre" puede en la tarde no sirve para el calendario de un nivel completo.' },

      { t: 'sub', texto: 'Los siete requisitos indispensables' },
      {
        t: 'tabla',
        encabezados: ['#', 'Requisito'],
        filas: [
          ['1', 'Certificación de ALOHA Panamá.'],
          ['2', 'Cumplimiento de entrenamientos, actualizaciones y seguimientos del Programa ALOHA.'],
          ['3', 'Cumplir con el Código de Ética y la vestimenta establecida.'],
          ['4', 'Cumplimiento de los protocolos del Programa, de las políticas de los Centros y de las observaciones de su Administrador.'],
          ['5', 'No participar en la promoción de ningún interés político, religioso u otro partido; y no solicitar, exigir, cobrar ni recibir, directa o indirectamente, dinero, servicio u otro material valioso de ninguna persona o entidad para tales fines.'],
          ['6', 'Mantener inviolable toda la información confidencial de los estudiantes, el Centro y el Programa. No divulgar documentos no publicados oficialmente ni eliminar registros de los archivos sin permiso.'],
          ['7', 'Si no puede cumplir con sus obligaciones, organizar para quien asuma el cargo los registros y demás datos necesarios para llevar a cabo el trabajo.'],
        ],
      },
      { t: 'p', texto: 'El **requisito 5 se malinterpreta seguido, y casi siempre de más**. Lo que prohíbe es promover un interés político, religioso o de partido, y solicitar, exigir, cobrar o recibir dinero, servicios o materiales valiosos para esos fines. Usar tu grupo para promover una causa o una iglesia entra ahí de lleno. Otros casos que suelen meterse en el mismo saco —vender un producto dentro del Centro, cobrarle algo a un padre por fuera— el Manual no los tipifica en ninguno de los siete requisitos: caen bajo las políticas del Centro y las observaciones de tu Administrador, que es el requisito 4. Así que se consultan con él **antes**, no después.' },
      { t: 'p', texto: 'Y el **requisito 7** significa que si te vas, te vas dejando la bitácora, el calendario y las notas ordenadas para quien llega. Irte con la información en la cabeza es incumplir.' },

      { t: 'sub', texto: 'El Coach y la comunidad' },
      {
        t: 'lista',
        items: [
          'Eres un facilitador del aprendizaje y del desarrollo de la juventud: brindas el mejor servicio proporcionando un ambiente propicio para ese aprendizaje y crecimiento.',
          'Proporcionas liderazgo e iniciativa para participar activamente en los movimientos comunitarios de mejoramiento moral, social, educativo, económico y cívico.',
          'Mereces un reconocimiento social razonable: te comportas con honor y dignidad en todo momento y te abstienes de actividades como el juego, fumar, la embriaguez y otros excesos, y mucho menos las relaciones ilícitas.',
          'Vives para y con la comunidad: estudias y comprendes las costumbres y tradiciones locales para tener una actitud comprensiva, y te abstienes de menospreciar a la comunidad.',
          'Mantienes relaciones personales y oficiales armoniosas y agradables con otros profesionales, con funcionarios del gobierno y con la gente, individual o colectivamente.',
          'Tienes libertad para asistir a la iglesia y adorar, según corresponda, pero no usas tu posición e influencia para hacer proselitismo.',
        ],
      },

      { t: 'sub', texto: 'La imagen: el chaleco no es opcional' },
      { t: 'p', texto: 'El protocolo de vestimenta es específico para Coaches: **uso obligatorio del chaleco oficial ALOHA al momento de impartir clases**, vestimenta adecuada para el trabajo con niños (evitar prendas ajustadas, escotes, ombligos descubiertos, accesorios inadecuados o tatuajes visibles) y presentación personal limpia y ordenada en todo momento.' },

      { t: 'sub', texto: 'Lo que este puesto NO hace' },
      { t: 'p', texto: 'Esto es tan importante como lo anterior. Un puesto mal delimitado hace que se pise el puesto ajeno: dos personas decidiendo lo mismo, o una decidiendo lo que no le toca. Cuando eso pasa, la responsabilidad se diluye y el producto desaparece.' },
      { t: 'nota', tono: 'regla', titulo: 'Regla clave', texto: 'Tú enseñas, registras, propones y reportas. Las decisiones de esta tabla no son tuyas. Llevarlas a quien le toca no es debilidad: es tu puesto funcionando bien.' },
      {
        t: 'tabla',
        encabezados: ['Decisión', 'De quién es', 'Qué haces tú'],
        filas: [
          ['Autorizar un descuento por retención', 'Administrador de Centro: son sus herramientas de no salida', 'Le reportas la situación del niño con lo que ves en clase'],
          ['Hablar a solas con el padre de un tema delicado', 'Administrador de Centro', 'Le pides la reunión y participas con él, con el formato de RESUMEN DE REUNIÓN COLABORATIVA'],
          ['Autorizar una Clase de Reforzamiento', 'Administrador de Centro', 'Llenas la plantilla de solicitud con los tres requisitos verificados y se la entregas'],
          ['Elegir qué Coach da esa Clase de Reforzamiento', 'Administrador de Centro, tomando en cuenta aptitudes y personalidad', 'Nada. Y no la das tú: el Coach del niño no debe darla'],
          ['Fijar el precio de una Clase de Reposición', 'Administrador de Centro y la administración del Centro', 'Explicas al padre que la reposición es otra cosa que el reforzamiento y lo mandas a la Administración'],
          ['Abrir un grupo de WhatsApp del salón', 'Nadie: no se abren. Ni para el Cierre, ni para las fotos', 'Toda comunicación va por Class Dojo y por el Centro'],
          ['Emitir o firmar una constancia escolar', 'Exclusivamente el Corporativo ALOHA', 'Mandas al padre a la Administración del Centro'],
          ['Certificarte un nivel de la técnica', 'Master Coach', 'Cumples los cuatro pasos del entrenamiento y das el examen'],
          ['Dar tu número personal a un padre', 'Nadie: el Manual lo prohíbe', 'Toda comunicación pasa por el Centro'],
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Dos firmas distintas que el sistema puede confundir', texto: 'Tu ADMINISTRADORA te firma la maniobra de tu puesto, dentro de tu Centro base. Tu MASTER COACH te certifica el nivel de la técnica, que no es un rol de este sistema. Un puesto tomado no habilita un nivel, y un nivel certificado no cierra tu puesto. Si das clases en dos Centros, quien te firma es la Administradora de tu Centro base, que es el que aparece en tu cuenta.' },

      { t: 'sub', texto: 'De quién recibes y a quién entregas' },
      { t: 'p', texto: 'Tu puesto es un nodo, no una isla. Si un insumo no te llega, tu producto no sale, y es tu trabajo reclamarlo, no esperarlo.' },
      {
        t: 'tabla',
        titulo: 'Lo que te llega',
        encabezados: ['Insumo', 'De quién', 'Cuándo'],
        filas: [
          ['La lista de asistencia de tu grupo', 'Asistente Administrativa', 'Antes de tu clase; tú firmas y ella coloca tu hora de llegada'],
          ['El grupo asignado', 'Administrador de Centro, con los cinco criterios', 'Al abrirse el grupo, con contrato de servicios profesionales a la tercera clase'],
          ['Tu certificación de nivel', 'Master Coach', 'Tras los cuatro pasos del entrenamiento, con el 80 por ciento; la reválida al 90 por ciento dentro del mes calendario'],
          ['La autorización de la Clase de Reforzamiento', 'Administrador de Centro', 'Después de que tú entregues la plantilla con los tres requisitos'],
          ['Las dos evaluaciones de tu grupo', 'Administrador de Centro', 'Semana 4 y semana 9 de cada grupo'],
          ['El suplente cuando te ausentas', 'Administrador de Centro, del nivel que corresponda', 'Tras tu solicitud de permiso por escrito'],
        ],
      },
      {
        t: 'tabla',
        titulo: 'Lo que entregas',
        encabezados: ['Entrega', 'A quién', 'Cuándo'],
        filas: [
          ['La asistencia marcada con la leyenda de colores', 'Formato Calendario y Asistencia', 'Al instante de dar la clase, no al final de la semana'],
          ['El aviso del niño con dos ausencias', 'Asistente Administrativa y Administrador', 'Apenas ocurre la segunda: avisar es responsabilidad tuya'],
          ['La bitácora del día', 'El libro de record del Centro', 'Diaria, con fecha y firma'],
          ['La retroalimentación en sándwich', 'Portafolio del niño en Class Dojo', 'Semanal'],
          ['La evaluación del niño en el libro', 'Portafolio y Administrador', 'Cada 3 semanas de trabajo en el libro'],
          ['La ficha de Campeonato', 'Administrador', 'Cada dos clases desde la semana 4'],
          ['La solicitud de Clase de Reforzamiento', 'Administrador de Centro', 'Cuando se cumplen los tres requisitos'],
          ['La factura de servicio con nombre, cédula y dígito verificador', 'Asistente Administrativa', 'Al momento de la revisión del pago de la nómina'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'El error caro de esta sección', texto: 'Guardarse la asistencia para marcarla "de una sola vez" el viernes. Sin asistencia al instante no hay aviso de dos ausencias; sin aviso no hay reforzamiento a tiempo; sin reforzamiento el niño se atrasa, y el niño que se atrasa es el que se retira. Tu producto se cae por ahí, no por la clase.' },

      { t: 'sub', texto: 'La prueba del puesto' },
      { t: 'p', texto: 'Si no puedes decir el producto de tu puesto de memoria, no lo tienes tomado. No importa cuántos módulos hayas leído. Tu Administradora te va a preguntar, sin aviso, en cualquier momento del entrenamiento: "¿Cuál es tu producto?". Si contestas con una lista de tareas o con "dar buenas clases", el paso no está aprobado.' },
      { t: 'nota', tono: 'alerta', titulo: 'Falta grave', texto: 'Alterar datos de un estudiante, presentar informes falsificados o alterados y emitir constancias sin autorización corporativa están listados como falta grave y causal de despido inmediato. Una asistencia marcada de memoria tres días después no es un descuido administrativo: es un registro que no ocurrió como está escrito.' },
    ],

    quiz: [
      {
        pregunta: '¿Cuál es el producto de tu puesto como Coach ALOHA?',
        opciones: [
          'Dar buenas clases y que los niños se sientan cómodos',
          'Cumplir la estructura de clase de diez pasos todos los días',
          'Niños que se quedan y suben de nivel, con su registro al día',
          'Entregar los certificados el día del Cierre de Nivel',
        ],
        explicacion: 'Dar buenas clases es la manera de conseguirlo, no el producto. Un producto se cuenta: cuántos empezaron tu nivel y cuántos llegaron al Cierre.',
        repasa: ['producto-final-valioso'],
      },
      {
        pregunta: 'Un padre te para en el pasillo para hablarte del retiro de su hijo y del precio. Lo correcto es…',
        opciones: [
          'explicarle tú las opciones de descuento para que no se vaya',
          'escucharlo y llevarlo con el Administrador, que es quien decide y quien habla de eso',
          'darle tu número para conversarlo con calma',
          'decirle que lo hable con la Asistente cuando pague',
        ],
        explicacion: 'El Coach enseña y reporta. El Administrador decide y habla con el padre: los descuentos por retención son sus herramientas de no salida.',
        repasa: ['administrador-de-centro', 'herramientas-de-no-salida'],
      },
      {
        pregunta: 'La Administradora te firmó la maniobra de tu puesto. Eso significa que…',
        opciones: [
          'ya puedes dar el nivel siguiente sin pasar por el Master Coach',
          'tienes tu puesto tomado; el nivel de la técnica lo certifica el Master Coach, aparte',
          'quedas certificada en todos los niveles del Programa',
          'tu entrenamiento de nivel se da por aprobado con el 80 por ciento',
        ],
        explicacion: 'Son dos firmas distintas. Un puesto tomado no habilita un nivel, y un nivel certificado no cierra tu puesto.',
        repasa: ['master-coach', 'oficial-de-entrenamiento'],
      },
      {
        pregunta: 'El Manual le paga al Coach por bajar la deserción de su grupo.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'No le fija meta de deserción ni prima por ella. Las dos palancas de dinero del Coach son el bono de puntualidad y la asignación de grupos por los cinco criterios.',
        repasa: ['desercion', 'bono-por-puntualidad'],
      },
      {
        pregunta: 'La alerta de deserción por Coach del sistema NO cuenta como baja tuya…',
        opciones: [
          'al niño graduado',
          'al niño que perdió clases',
          'al niño que se cambió de horario',
          'al niño que se fue por la técnica',
        ],
        explicacion: 'Graduar es el trabajo bien hecho. Los motivos que sí mira son los que el aula controla: pérdida de clases, técnica y horario.',
        repasa: ['desercion'],
      },
      {
        pregunta: 'El bono por puntualidad perfecta exige llegar…',
        opciones: [
          '10 minutos antes, con 5 de tolerancia',
          'a la hora exacta del inicio de la clase',
          '30 minutos antes, sin tolerancia',
          '20 minutos antes del inicio de tu clase, con 15 minutos de tolerancia',
        ],
        explicacion: 'Son B/.15,00 mensuales con un grupo, más B/.5,00 por cada grupo adicional. Lo mide la Asistente con el Informe de Puntualidad quincenal.',
        repasa: ['bono-por-puntualidad', 'tolerancia'],
      },
      {
        pregunta: 'Una mamá de tu grupo te pide que pases su flyer de meriendas por Class Dojo. ¿Qué haces?',
        opciones: [
          'lo pasas: ninguno de los siete requisitos lo prohíbe expresamente',
          'lo consultas con tu Administrador antes, porque cae bajo las políticas del Centro',
          'le dices que está prohibido por el requisito 5',
          'lo pasas solo si el producto es bueno y la mamá es de confianza',
        ],
        explicacion: 'El requisito 5 prohíbe promover intereses políticos, religiosos o de partido. Este caso no está tipificado en los siete: cae en el requisito 4, políticas del Centro y observaciones de tu Administrador. Se consulta antes, no después.',
        repasa: ['administrador-de-centro'],
      },
      {
        pregunta: 'El sub-producto "registro al día" (asistencia, bitácora y retroalimentación)…',
        opciones: [
          'es opcional cuando el grupo va bien',
          'lo lleva la Asistente Administrativa, no tú',
          'no paga nada por sí solo, pero sin él los otros dos no se pueden probar',
          'sustituye a la evaluación del libro cada 3 semanas',
        ],
        explicacion: 'Un niño que se quedó y una retroalimentación que nunca se escribió son, para el Centro, lo mismo que un niño que se fue.',
        repasa: ['bitacora', 'class-dojo'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra del puesto — Decir tu producto de memoria y sostener los cuatro sub-productos',
        fuente: 'curso-4-coach.html#m0',
        proposito: 'Que puedas decir el producto de tu puesto sin leerlo, nombrar los cuatro sub-productos y dar el número de cada uno en tu grupo de hoy, señalando el documento que lo respalda.',
        gradiente: 'Es el último paso de este paquete: exige haber estudiado los bloques anteriores. Si contestas con una lista de tareas, el paso no está aprobado y se vuelve al estudio del paquete, no se repite esta.',
        masa: [
          'Ninguna para la primera parte. De memoria.',
          'Para la segunda: tu lista de asistencia, tu bitácora y el portafolio de tu grupo en Class Dojo.',
        ],
        pasos: [
          'Sin apuntes, di en una sola frase cuál es el producto de tu puesto.',
          'Nombra los cuatro sub-productos y di el número exacto de cada uno en tu grupo de hoy.',
          'Señala el documento que respalda cada número: la lista, la bitácora y el portafolio.',
          'Di cuál de los cuatro está más flojo y qué vas a corregir esta semana.',
        ],
        criterios: [
          'Enuncia el producto de su puesto sin leerlo y sin rodeos, dos veces en días distintos.',
          'Nombra los cuatro sub-productos y da el número de cada uno señalando el documento real que lo respalda.',
          'Identifica por sí misma el sub-producto más débil sin que su jefe entrenador se lo diga.',
          'Dice que el Manual no le paga por retención y nombra sus dos palancas reales de dinero.',
        ],
        errorTipico: 'Contestar la pregunta del producto con una lista de tareas o con "dar buenas clases". No tiene su puesto tomado aunque tenga todas las casillas firmadas: se devuelve al estudio del paquete.',
      },
      {
        titulo: 'Maniobra del puesto — Las seis situaciones: de quién es la decisión',
        fuente: 'curso-4-coach.html#m1',
        proposito: 'Que ante cualquier situación real del salón sepas al instante si la decisión es tuya o de quién es, y qué te toca hacer a ti en cada caso.',
        gradiente: 'Exige haber estudiado la tabla de lo que este puesto NO hace, con el Manual abierto en la sección del Coach. Si fallas, el hueco está en ese bloque, no en la maniobra.',
        masa: [
          'El paquete de tu puesto, impreso.',
          'El Manual de Operaciones abierto en la sección del Coach.',
          'Seis situaciones reales del mes pasado, escritas por tu Administradora.',
        ],
        pasos: [
          'Tu Administradora te dicta la primera: un padre pide descuento para no retirar al niño. Di de quién es la decisión y qué te toca a ti.',
          'Segunda: un niño lleva tres semanas sin avanzar y hace falta reforzamiento.',
          'Tercera: una mamá te pide tu número personal para avisarte cuando falte.',
          'Cuarta: los padres quieren armar un grupo de WhatsApp del salón.',
          'Quinta: te ofrecen un grupo de un nivel que todavía no tienes certificado.',
          'Sexta: te tienes que ausentar de una clase el jueves.',
          'En cada una, di además a quién le entregas y con qué plazo.',
        ],
        criterios: [
          'Acierta las seis situaciones seguidas sin mirar la tabla de lo que este puesto NO hace.',
          'En cada caso dice no solo de quién es la decisión, sino qué produce ella: reportar, llenar la plantilla o escalar.',
          'Ante el caso del reforzamiento, nombra los tres requisitos y dice que ella no lo autoriza ni lo da.',
          'Ante el caso del nivel sin certificar, separa la firma de su puesto de la certificación del Master Coach.',
        ],
        errorTipico: 'Resolver por buena voluntad lo que no le toca: prometerle el descuento al padre, dar su número "para que le avisen", o aceptar el grupo del nivel que todavía no tiene certificado.',
      },
    ],
  },
]
