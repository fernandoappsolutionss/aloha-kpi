// Curso `coach` — bloque B del puesto de Coach ALOHA. Once módulos: of-coa-1 … of-coa-11.
// El módulo de puesto (of-hat-coa) vive en ./hat-coach.js, igual que of-hat-adm
// y of-hat-asi viven en sus propios archivos: el curso `hat` lo escriben varios
// frentes en paralelo y cursos/hat.js sólo los concatena.
//
// FUENTE (contenido ya escrito y auditado contra el Manual de Operaciones,
// sección 4 — COACH; aquí sólo se adaptó el FORMATO, conservando cifras,
// plazos, montos y responsables tal cual):
//   plataformas/aloha/training-moodle/curso-4-coach.html  §m2 … §m12
//   plataformas/aloha/training-moodle/curso-4-coach.gift  127 preguntas
// El mapeo de secciones a módulos es uno a uno: §m2 → of-coa-1, §m3 → of-coa-2,
// … §m12 → of-coa-11. La bienvenida (§m0) y §m1 se funden en of-hat-coa.
//
// LO QUE NO SE REPITE AQUÍ. El Coach lleva el bloque A completo, así que
// of-nor-5 (Confidencialidad y protección de datos, con la Ley 81 de 2019 y el
// acuerdo de no divulgación) y of-nor-8 (Accidentes) ya están estudiados. Los
// módulos de este curso se especializan sobre ellos en vez de copiarlos:
// of-coa-1 sólo trae la parte propia del Coach y of-coa-4 sólo el gesto que le
// toca a él dentro del salón.
//
// Los `id` son la CLAVE DE PROGRESO en entrenamiento_progreso.modulo:
// renombrar uno BORRA en silencio el avance de todo el mundo. No se renumeran.
// Los índices correctos del quiz viven en
// lib/entrenamiento/respuestas-oficio/coach.js (solo servidor) y NUNCA aquí:
// este archivo llega al cliente.
//
// ── VOCABULARIO ───────────────────────────────────────────────────────────
// Aquí se renombró solo lo VISIBLE. Los identificadores NO se tocaron: los
// campos `drills`, `masa`, `gradiente` y `pfv` siguen llamándose igual que en
// los otros cuatro cursos, y por eso el HTML de la fuente sigue diciendo
// "Drill". El mapeo completo vive en la cabecera de ./metodo.js.
//   drill → maniobra          · masa → lo que va a la vista
//   gradiente → el orden      · hat → tu puesto
//   checksheet → tu plan de puesto   · PFV → tu producto
//   Oficial de Entrenamiento → jefe entrenador
// Estos once módulos son operativos: cifras, plazos, montos, pasos y guiones
// van LITERALES, y no llevan ni una imagen marítima.
//
// LAS DOS DISCREPANCIAS DEL MANUAL que este curso NO resuelve por su cuenta
// —la semana desde la que procede el reforzamiento (of-coa-8) y quién queda de
// supervisor cuando el Manual nombra un cargo que no existe— van escritas como
// nota de "Pendiente con la Junta Directiva", igual que en of-hat-asi.
//
// EL DATO QUE NO SALE DEL MANUAL. La alerta de deserción por Coach
// (lib/desercion-coach.mjs) es instrumento del KPI, no norma del Manual: el
// Manual no le fija al Coach ninguna meta de deserción ni prima de producción.
// Se le presenta en of-coa-10 como un dato con su brecha, nunca como un juicio,
// que es exactamente el tono que fija la cabecera de ese módulo.

export const COACH = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'of-coa-1',
    curso: 'coach',
    orden: 14,
    roles: ['coach'],
    titulo: 'Confidencialidad de la técnica y de la lista',
    duracionMin: 12,
    requiere: ['of-hat-coa'],
    fuente: ['curso-4-coach.html#m2'],

    pfv: 'Nada del Centro sale del Centro: la técnica, los libros y las fichas sin una sola copia fuera, la lista de tu grupo tratada como lista de clientes, y ningún registro borrado sin permiso.',

    voz: 'La confidencialidad ya la viste en Normativa. <break time="0.4s"/> Aquí va la parte que es tuya y de nadie más. <break time="0.5s"/> La técnica ALOHA es información confidencial del Programa. <break time="0.3s"/> Los libros, las fichas y la secuencia no se fotocopian ni se suben a redes. <break time="0.5s"/> La lista de tu grupo, con nombres y contactos, es una lista de clientes. <break time="0.3s"/> No sale del Centro. <break time="0.4s"/> Lo que un padre te cuenta de su hijo se conversa con el Administrador. <break time="0.3s"/> No con los otros padres. No con otro Coach en el pasillo. <break time="0.5s"/> Y hay una línea que se cruza sin darse cuenta. <break time="0.3s"/> No eliminas registros de los archivos sin permiso. <break time="0.3s"/> Ni una bitácora vieja, ni un examen, ni una hoja de asistencia. <break time="0.5s"/> La consecuencia está escrita y no exige que tú ganes nada. <break time="0.3s"/> Basta con que la información haya salido.',

    laminas: [
      {
        kicker: 'Por qué existe',
        titulo: 'La técnica es el activo de la empresa',
        texto: 'La protección de la información comercial, técnica confidencial y los secretos comerciales es vital para los intereses y el éxito de ALOHA Mental Arithmetic.',
        cierre: 'Todos los colaboradores firman un acuerdo de no divulgación como condición de empleo.',
      },
      {
        kicker: 'El alcance',
        titulo: 'Qué se considera información confidencial',
        items: [
          'Del método: la técnica ALOHA, los libros, las fichas y la secuencia.',
          'Del negocio: la compensación, las listas de clientes y sus referencias.',
          'La información financiera y las estrategias de comercialización.',
          'Los proyectos o propuestas pendientes y la investigación de materiales nuevos.',
        ],
        cierre: 'Para el Coach está además escrito como requisito indispensable número 6.',
      },
      {
        kicker: 'La consecuencia',
        titulo: 'No hace falta que ganes nada',
        texto: 'Quien divulgue o utilice de manera impropia secretos comerciales o información confidencial queda sujeto a acción disciplinaria, extinción de la relación laboral y acción legal.',
        cierre: 'Aún cuando no reciba beneficio real de la divulgación.',
      },
      {
        kicker: 'Tu día a día',
        titulo: 'Las cinco que se cruzan sin querer',
        items: [
          'El material del Programa no se fotocopia ni se sube a redes.',
          'La lista de tu grupo, con nombres y contactos, es lista de clientes.',
          'Lo que un padre te cuenta va al Administrador, no al pasillo.',
          'No eliminas registros de los archivos sin permiso.',
          'Lo que gana otro Coach es información sobre la compensación.',
        ],
      },
      {
        kicker: 'Lo que tienes que poder hacer',
        titulo: 'Decir que no, por escrito y sin pelear',
        items: [
          'Nombrar las tres consecuencias que contempla el Manual, de memoria.',
          'Contestar la petición sin ofender al que pide y sin ceder nada.',
          'Llevarle el caso al Administrador el mismo día, con la captura.',
        ],
        cierre: 'Y no borrar nunca un registro del archivo, por viejo que parezca.',
      },
    ],

    sop: {
      proceso: 'Responder a una petición de información del Centro',
      cuando: 'Cada vez que alguien te pide material del Programa, datos de un niño o la lista de tu grupo.',
      producto: 'La petición contestada sin que salga una sola copia, y el caso en manos del Administrador el mismo día.',
      pasos: [
        'Identifica qué te piden: técnica y material del Programa, datos de un niño, lista del grupo o información sobre la compensación.',
        'Si cae en cualquiera de esas cuatro, la respuesta es no. No la negocies ni la matices.',
        'Contesta por el mismo canal, en una línea: ese material es del Programa y no se comparte.',
        'No mandes la foto aclarando que es solo de referencia: la falta es que la información salga.',
        'Guarda la conversación tal como está. No borres el chat ni el correo.',
        'Repórtaselo al Administrador del Centro el mismo día, con la captura.',
        'Si quien pregunta es un padre de tu grupo, remítelo al celular del Centro y avisa al Administrador.',
        'Si lo que te piden es eliminar un registro del archivo, no lo hagas sin permiso.',
        'Deja el material donde vive: el libro en el salón y la bitácora en el Drive del Centro.',
      ],
      decide: [
        { situacion: 'Un colega de otra institución pide material', regla: 'No se comparte. El Manual contempla acción disciplinaria, extinción de la relación laboral y acción legal, aunque no recibas ningún beneficio.' },
        { situacion: 'Un padre te cuenta algo delicado de su hijo', regla: 'Se conversa con el Administrador del Centro, no con los otros padres ni con los otros Coaches.' },
        { situacion: 'Hay que eliminar un registro del archivo', regla: 'No se elimina sin permiso: ni una bitácora vieja, ni un examen, ni una hoja de asistencia.' },
      ],
      errores: [
        'Mandar la foto del material aclarando que es solo de referencia.',
        'Comentar en el pasillo lo que un padre contó en confianza.',
        'Comparar sueldos con otro Coach: la compensación es información confidencial.',
      ],
    },

    masa: [
      'El acuerdo de no divulgación que firmaste, impreso.',
      'La lista de tu grupo con nombres y contactos, en pantalla.',
      'Un libro y una ficha del nivel que estás dando.',
      'El teléfono, con un chat real donde alguien te pidió material.',
    ],

    palabras: [
      'contrato-de-confidencialidad',
      'ley-81-de-2019',
      'colaborador',
      'accion-disciplinaria',
      'falta-grave',
      'coach',
      'bitacora',
      'class-dojo',
      'representante',
      'drive',
      'examen-de-nivel',
    ],

    bloques: [
      { t: 'sub', texto: 'Lo que ya viste, y lo que agrega tu puesto' },
      { t: 'p', texto: 'La normativa de confidencialidad la estudiaste en el bloque A, con la **Ley 81 de 2019** y el acuerdo de no divulgación. Aquí no se repite: aquí va lo que es propio del Coach, que es lo que pasa dentro del salón y con la gente de tu grupo.' },
      { t: 'p', texto: 'La protección de la información comercial, técnica confidencial y los secretos comerciales es vital para los intereses y el éxito de ALOHA Mental Arithmetic. **Todos los colaboradores deben firmar un acuerdo de no divulgación como condición de empleo.** Para el Coach está además escrito como requisito indispensable número 6.' },

      { t: 'sub', texto: 'Qué se considera información confidencial' },
      {
        t: 'tabla',
        encabezados: ['Del negocio', 'Del método y la tecnología'],
        filas: [
          ['Información sobre la compensación', 'Técnica ALOHA'],
          ['Listas de clientes y referencias de clientes', 'Procesos computarizados y códigos de computación'],
          ['Información financiera', 'Estrategias de investigación y desarrollo'],
          ['Estrategias de comercialización', 'Información y prototipos tecnológicos'],
          ['Estrategia de relaciones laborales', 'Información, fórmulas y prototipos científicos'],
          ['Proyectos o propuestas pendientes', 'Investigación sobre materiales nuevos'],
        ],
      },

      { t: 'sub', texto: 'La consecuencia está escrita' },
      { t: 'nota', tono: 'alerta', titulo: 'No hace falta que ganes nada', texto: 'Los colaboradores que divulguen o utilicen de manera impropia secretos comerciales o información comercial confidencial estarán sujetos a **acción disciplinaria, la extinción de la relación laboral y acción legal**, aún cuando no reciban beneficio real de la divulgación. Basta con que la información haya salido.' },

      { t: 'sub', texto: 'Traducido a tu día a día' },
      {
        t: 'lista',
        items: [
          'El material del Programa, los libros, las fichas y la secuencia de la técnica **no se fotocopian**, no se comparten con otro instituto ni se suben a redes.',
          'Lo que un padre te cuenta de su hijo se conversa con el Administrador, no con los otros padres ni con los otros Coaches en el pasillo.',
          'No divulgas a nadie los documentos que no se han publicado oficialmente.',
          '**No eliminas registros de los archivos sin permiso.** Ni una bitácora vieja, ni un examen, ni una hoja de asistencia.',
          'Lo que ganas tú y lo que gana otro Coach es información sobre la compensación: es confidencial.',
        ],
      },

      { t: 'sub', texto: 'La lista de tu grupo es una lista de clientes' },
      { t: 'p', texto: 'Esta es la que más se cruza sin mala intención. La lista de niños de tu grupo, con nombres y contactos, entra en el renglón de **listas de clientes** del cuadro de arriba. No sale del Centro: ni a un grupo de mensajería, ni a un colega, ni a tu teléfono personal para tenerla a mano.' },
      { t: 'p', texto: 'El modelo de contrato de confidencialidad que firmas está en los formatos del Manual, y junto a él el Manual adjunta como documento de referencia la **Ley 81 del 2019 de protección de datos personales**. El Manual no desarrolla su articulado ni añade reglas propias a partir de ella: lo que te obliga en el día a día es el acuerdo de no divulgación que firmaste y la lista de información confidencial de arriba.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Un colega tuyo de otro instituto de cálculo mental te escribe por WhatsApp: "pásame una foto de la hoja de mentales de nivel 3, es para ver el nivel de dificultad, no la voy a usar". Escribe tu respuesta textual y di qué tres consecuencias contempla el Manual si la mandas.' },
    ],

    quiz: [
      {
        pregunta: 'La técnica ALOHA se considera información confidencial del Programa.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Encabeza la columna del método y la tecnología en el cuadro del Manual, junto con los procesos, los prototipos y la investigación.',
      },
      {
        pregunta: 'Firmar un acuerdo de no divulgación es…',
        opciones: [
          'opcional para los Coaches por servicios profesionales',
          'una condición de empleo para todos los colaboradores',
          'un requisito solo para el Administrador',
          'algo que se firma al cumplir un año',
        ],
        explicacion: 'Es condición de empleo, sin distinguir el tipo de contrato. Y para el Coach está además escrito como requisito indispensable número 6.',
        repasa: ['contrato-de-confidencialidad', 'colaborador'],
      },
      {
        pregunta: 'Un colaborador divulga información confidencial pero no obtiene ningún beneficio de ello. Según el Manual…',
        opciones: [
          'no hay consecuencia porque no hubo lucro',
          'solo aplica un llamado de atención verbal',
          'igual queda sujeto a acción disciplinaria, extinción de la relación laboral y acción legal',
          'se evalúa caso por caso sin sanción posible',
        ],
        explicacion: 'La falta es que la información haya salido, no que alguien gane algo con ella.',
        repasa: ['accion-disciplinaria'],
      },
      {
        pregunta: 'La lista de niños de tu grupo con nombres y contactos es información confidencial porque constituye lista de clientes.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Las listas de clientes y sus referencias están escritas en el cuadro del negocio. Tu lista de grupo es una de ellas.',
        repasa: ['representante'],
      },
      {
        pregunta: '¿Cuál de estos NO figura entre los ejemplos de información confidencial del Manual?',
        opciones: [
          'El calendario de feriados nacionales publicado por el Estado',
          'La información sobre la compensación',
          'Las estrategias de comercialización',
          'Las referencias de clientes',
        ],
        explicacion: 'Lo que ya es público no se protege. Los otros tres están en el cuadro, uno por uno.',
      },
      {
        pregunta: '¿Qué documento adjunta el Manual como referencia, junto al modelo de contrato de confidencialidad?',
        opciones: [
          'La Ley 45 de educación',
          'La Ley 81 del 2019 de protección de datos personales',
          'La Ley de Caja de Seguro Social',
          'Ninguno, es solo una política interna',
        ],
        explicacion: 'Va anexa como referencia. Lo que te obliga en el día a día es el acuerdo que firmaste y la lista de información confidencial.',
        repasa: ['ley-81-de-2019'],
      },
      {
        pregunta: 'Lo que gana otro Coach es información sobre la compensación y por lo tanto es confidencial.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'La compensación abre la columna del negocio. Comparar sueldos en el pasillo es divulgar información confidencial.',
        repasa: ['coach'],
      },
      {
        pregunta: 'Un Coach puede compartir con un colega de otra institución una foto del material de mentales si aclara que es solo de referencia.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'La aclaración no cambia nada: el material del Programa no se comparte con otro instituto, se aclare lo que se aclare.',
      },
    ],

    drills: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'of-coa-2',
    curso: 'coach',
    orden: 15,
    roles: ['coach'],
    titulo: 'Tu nivel lo certifica el Master Coach',
    duracionMin: 12,
    requiere: ['of-coa-1'],
    fuente: ['curso-4-coach.html#m3'],

    pfv: 'El nivel que puedes dar, certificado por el Master Coach: el examen pasado en su plazo, los cuatro pasos del entrenamiento completos y la nota en tu expediente.',

    voz: 'Este módulo tiene una sola idea, y hay que tenerla clavada. <break time="0.4s"/> El proceso de entrenamiento se hace con el Master Coach únicamente. <break time="0.3s"/> Él es el único que certifica los niveles del uno al ocho. <break time="0.5s"/> Ni el Administrador, ni el Coach más antiguo del Centro, ni un video. <break time="0.4s"/> El proceso tiene cuatro pasos. <break time="0.3s"/> Examen, observación, clase de prueba con un supervisor delante, y ver un Cierre de Nivel antes de hacer el tuyo. <break time="0.5s"/> Ojo con la segunda oportunidad, porque sube la vara. <break time="0.3s"/> La primera vez el corte es ochenta por ciento. <break time="0.3s"/> Si no pasas, tienes un mes calendario para presentarlo otra vez, y ahí el corte es noventa. <break time="0.4s"/> Pasado ese mes no hay tercer intento: se repite el entrenamiento completo. <break time="0.5s"/> Y el nivel que tienes aprobado es lo que define el grupo que puedes dar. <break time="0.3s"/> No la antigüedad. No la simpatía.',

    laminas: [
      {
        kicker: 'La regla dura',
        titulo: 'El Master Coach es el único que certifica',
        texto: 'Los Coaches deben realizar el proceso de entrenamiento con el Master Coach únicamente, que es el único encargado de certificar los niveles del Programa, del 1 al 8.',
        cierre: 'Ni el Administrador, ni otro Coach con más años, ni un video pueden certificarte un nivel.',
      },
      {
        kicker: 'El proceso',
        titulo: 'Los cuatro pasos del entrenamiento',
        items: [
          'Examen: se pasa con 80 % mínimo.',
          'Observación: dos clases completas de KIDS y TINY, y una Clase de Padres.',
          'Clase de prueba: dictarla con presencia de un supervisor.',
          'Cierre de Nivel: ver uno antes de realizar el de tu grupo.',
        ],
      },
      {
        kicker: 'La segunda vuelta',
        titulo: 'La reválida sube la vara',
        texto: 'Si no pasas, vuelves a presentarlo dentro de un rango de un mes calendario y lo pasas con un mínimo de 90 %. Si no, vuelves a cursar todo el entrenamiento con el Master Coach.',
        cierre: 'Pasado ese mes no hay tercer intento de examen.',
      },
      {
        kicker: 'Las horas',
        titulo: 'Cuánto dura cada capacitación',
        items: [
          'Niveles 1 y 2: aproximadamente 32 horas.',
          'Niveles 3, 4, 5, 6, 7 y 8: aproximadamente 16 horas.',
          'Las programa el Administrador del Centro en conjunto con el Master Coach.',
          'El Administrador hace seguimiento a que lleguen tus notas.',
        ],
      },
      {
        kicker: 'Lo que tienes que poder hacer',
        titulo: 'Decir qué nivel tienes y qué te habilita',
        items: [
          'Nombrar tu último nivel certificado y la fecha en que lo pasaste.',
          'Decir qué grupos te habilita ese nivel y cuáles no.',
          'Rechazar un grupo por encima de tu nivel sin sentirte mal.',
        ],
        cierre: 'Un puesto firmado no habilita un nivel: son dos cosas distintas y las firma gente distinta.',
      },
    ],

    sop: {
      proceso: 'Presentar y certificar un nivel con el Master Coach',
      cuando: 'Cada vez que el Centro te programa la capacitación de un nivel nuevo.',
      producto: 'El nivel certificado por el Master Coach, con su nota en tu expediente y el grupo que ese nivel habilita.',
      pasos: [
        'Confirma con el Administrador la fecha de la capacitación: 32 horas para los niveles 1 y 2, y 16 horas para los niveles 3 al 8.',
        'Cursa el entrenamiento completo con el Master Coach. Es el único que certifica.',
        'Presenta el examen. El corte del primer intento es 80 por ciento.',
        'Si no pasas, pide de inmediato al Administrador la fecha de la reválida dentro del mes calendario.',
        'En la reválida el corte sube a 90 por ciento. Si tampoco pasas, se repite el entrenamiento completo.',
        'Presencia dos clases completas de KIDS y TINY, y una Clase de Padres.',
        'Dicta una Clase de Prueba con presencia de un supervisor.',
        'Asiste como observador a un Cierre de Nivel antes de hacer el de tu grupo.',
        'Verifica con el Administrador que tu nota llegó y quedó en tu expediente.',
        'Anota tu nuevo nivel y no aceptes grupos por encima de él.',
      ],
      decide: [
        { situacion: 'Quién certifica un nivel', regla: 'El Master Coach, y nadie más. Certifica del nivel 1 al 8.' },
        { situacion: 'Te ofrecen un grupo de un nivel que no tienes aprobado', regla: 'No se toma. El nivel aprobado es lo que habilita a dar la clase, no la antigüedad ni la disponibilidad.' },
        { situacion: 'Pasó el mes calendario y no hubo reválida', regla: 'Se repite el entrenamiento completo con el Master Coach. Coordínalo con el Administrador, que es quien programa.' },
      ],
      errores: [
        'Aceptar el grupo por encima de tu nivel para sacar del apuro al Centro.',
        'Dejar correr el mes de la reválida esperando que te llamen.',
        'Dar por certificado un nivel porque hiciste la capacitación, sin la nota en el expediente.',
      ],
    },

    masa: [
      'Tu expediente de Coach abierto, con las notas de los niveles que ya presentaste.',
      'El calendario de capacitaciones del Centro para el trimestre.',
      'La lista de grupos activos del Centro con su nivel.',
    ],

    palabras: [
      'master-coach',
      'coach',
      'examen-de-nivel',
      'revalida',
      'nivel',
      'clase-de-prueba',
      'clase-para-padres',
      'cierre-de-nivel',
      'expediente-de-coach',
      'kids',
      'tiny-tots',
      'administrador-de-centro',
    ],

    bloques: [
      { t: 'sub', texto: 'Quién certifica un nivel' },
      { t: 'p', texto: 'Los Coaches deben realizar el proceso de entrenamiento con el **Master Coach ÚNICAMENTE**, quien es el único encargado de certificar los diferentes niveles del Programa, del **nivel 1 al 8**. Ni el Administrador, ni otro Coach con más años, ni un video pueden certificarte un nivel.' },

      { t: 'sub', texto: 'El proceso de entrenamiento, en cuatro pasos' },
      {
        t: 'tabla',
        encabezados: ['#', 'Paso', 'Detalle'],
        filas: [
          ['1', 'Examen', 'Pasar con 80 % mínimo. Si no pasas, debes volver a presentarlo dentro de un rango de un mes calendario y pasarlo con un mínimo de 90 %. De lo contrario, debes volver a cursar nuevamente todo el entrenamiento con el Master Coach.'],
          ['2', 'Observación', 'Presenciar dos clases completas de KIDS y TINY, y una Clase de Padres.'],
          ['3', 'Clase de prueba', 'Dictar una Clase de Prueba con presencia de un supervisor.'],
          ['4', 'Cierre de Nivel', 'Ver un Cierre de Nivel antes de realizar el de tu grupo.'],
        ],
      },

      { t: 'sub', texto: 'La segunda oportunidad sube la vara' },
      { t: 'nota', tono: 'ojo', titulo: 'Ochenta la primera vez, noventa la segunda', texto: 'La reválida no repite el corte: la primera vez es **80 %** y la segunda es **90 %**. Y solo tienes ese mes calendario. Pasado ese plazo no hay tercer intento de examen: se repite el entrenamiento completo.' },

      { t: 'sub', texto: 'Cuánto dura cada capacitación' },
      {
        t: 'lista',
        items: [
          '**Nivel 1 y 2:** aproximadamente 32 horas.',
          '**Niveles 3, 4, 5, 6, 7 y 8:** aproximadamente 16 horas.',
        ],
      },
      { t: 'p', texto: 'Quien programa esas capacitaciones es el **Administrador del Centro en conjunto con el Master Coach**, y es el Administrador quien hace seguimiento a que lleguen tus notas. Si no pasaste, es el Administrador quien coordina la reválida.' },

      { t: 'sub', texto: 'El nivel es lo que habilita el grupo' },
      { t: 'nota', tono: 'regla', titulo: 'No es antigüedad, es nivel certificado', texto: 'El nivel que tienes aprobado define el grupo que puedes dar. Por eso existe el paso 4: **nadie hace su primer Cierre de Nivel sin haber visto uno antes.**' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Presentaste el examen de nivel 4 y sacaste 74. Han pasado cinco semanas y todavía no te han llamado para la reválida, pero el Centro necesita cubrir un grupo de nivel 4 la semana que viene y te lo ofrecen. Explica qué dice el Manual sobre tu situación y qué le respondes al Administrador.' },
    ],

    quiz: [
      {
        pregunta: '¿Quién es el único encargado de certificar los niveles del Programa?',
        opciones: [
          'El Administrador de Centro',
          'El Master Coach',
          'El Coordinador Operativo',
          'El Coach más antiguo del Centro',
        ],
        explicacion: 'El proceso de entrenamiento se hace con el Master Coach únicamente, y certifica del nivel 1 al 8.',
        repasa: ['master-coach'],
      },
      {
        pregunta: '¿Cuál es la nota mínima para pasar el examen de entrenamiento en el primer intento?',
        opciones: ['80 por ciento', '70 por ciento', '90 por ciento', '60 por ciento'],
        explicacion: 'El 90 por ciento es el corte de la reválida, no el del primer intento.',
        repasa: ['examen-de-nivel'],
      },
      {
        pregunta: 'Si el Coach no pasa el examen en el primer intento, debe volver a presentarlo dentro de un mes calendario y pasarlo con un mínimo de…',
        opciones: [
          '80 por ciento',
          '85 por ciento',
          'la misma nota de 80 por ciento',
          '90 por ciento',
        ],
        explicacion: 'La reválida sube la vara: la primera vez el corte es 80 y la segunda es 90.',
        repasa: ['revalida'],
      },
      {
        pregunta: 'Si el Coach no pasa la segunda presentación del examen, la consecuencia es…',
        opciones: [
          'un tercer intento a los quince días',
          'pasar automáticamente con acompañamiento del Administrador',
          'volver a cursar nuevamente todo el entrenamiento con el Master Coach',
          'quedar habilitado solo para grupos Tiny Tots',
        ],
        explicacion: 'No hay tercer intento de examen. Se repite el entrenamiento entero.',
      },
      {
        pregunta: '¿Cuántos niveles del Programa certifica el Master Coach?',
        opciones: ['Del nivel 1 al 5', 'Del nivel 1 al 8', 'Del nivel 1 al 10', 'Solo los niveles 1 y 2'],
        explicacion: 'Del 1 al 8. Los diez niveles del itinerario Tiny Tots son otra numeración, la del niño.',
        repasa: ['nivel'],
      },
      {
        pregunta: 'El proceso de observación del entrenamiento exige presenciar…',
        opciones: [
          'dos clases completas de KIDS y TINY y una Clase de Padres',
          'una clase de KIDS únicamente',
          'tres clases de Tiny Tots',
          'un Campeonato Nacional',
        ],
        explicacion: 'Son los dos itinerarios y además el formato en el que se habla con los padres.',
        repasa: ['clase-para-padres'],
      },
      {
        pregunta: 'La Clase de Prueba que dicta el Coach en formación debe darse con presencia de un supervisor.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es el paso 3 del proceso, y no se sustituye por una clase regular observada de lejos.',
        repasa: ['clase-de-prueba'],
      },
      {
        pregunta: 'Antes de realizar el Cierre de Nivel de su propio grupo, el Coach debe haber visto un Cierre de Nivel.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es el paso 4 del entrenamiento: nadie hace su primer Cierre sin haber observado uno antes.',
        repasa: ['cierre-de-nivel'],
      },
      {
        pregunta: 'La duración aproximada de la capacitación de los niveles 3 al 8 es de…',
        opciones: ['32 horas', '16 horas', '8 horas', '40 horas'],
        explicacion: 'Las 32 horas son las de los niveles 1 y 2, que es donde se arma la base de la técnica.',
      },
      {
        pregunta: 'La duración aproximada de la capacitación de los niveles 1 y 2 es de…',
        opciones: ['16 horas', '24 horas', '48 horas', '32 horas'],
        explicacion: 'Del nivel 3 en adelante la capacitación baja a unas 16 horas.',
      },
    ],

    drills: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'of-coa-3',
    curso: 'coach',
    orden: 16,
    roles: ['coach'],
    titulo: 'Cómo se gana un grupo',
    duracionMin: 15,
    requiere: ['of-coa-2'],
    fuente: ['curso-4-coach.html#m4'],

    pfv: 'Los grupos que te asignan: tu nivel aprobado al día, los cinco criterios cumplidos y tu contrato de servicios profesionales firmado a la tercera clase dada.',

    voz: 'Todos los Coaches están entrenados igual y manejan el contenido del Programa. <break time="0.4s"/> Pero el nivel aprobado no es lo único que pesa cuando se reparten los grupos. <break time="0.5s"/> Hay cinco criterios, y están escritos. <break time="0.3s"/> La asistencia. Los entrenamientos trimestrales. <break time="0.3s"/> Las reuniones semanales con el Administrador. Los Campeonatos. <break time="0.3s"/> Y las evaluaciones de rendimiento que te hace el Administrador. <break time="0.5s"/> Faltar a una homologación no es perderse una charla. <break time="0.3s"/> Es restarte para el próximo reparto de grupos. <break time="0.4s"/> También pesa el encaje: hay Coaches que funcionan mejor con Tiny Tots y otros con Kids. <break time="0.5s"/> Y una fecha que casi nadie reclama. <break time="0.3s"/> El contrato por servicios profesionales se firma a la tercera clase dada. <break time="0.3s"/> Dos copias: una tuya y otra para tu expediente. <break time="0.4s"/> Con él te entregan la planificación y el calendario del grupo, y los dos se respetan.',

    laminas: [
      {
        kicker: 'El punto de partida',
        titulo: 'El nivel aprobado, y después el encaje',
        texto: 'Dependiendo del nivel del grupo se asigna un Coach apto para brindar esa clase. Además hay Coaches que funcionan mejor con TINY TOTS y otros que funcionan mejor con KIDS.',
        cierre: 'Esa característica pesa al momento de la asignación.',
      },
      {
        kicker: 'Lo que se mira',
        titulo: 'Los cinco criterios de escogencia',
        items: [
          'La asistencia.',
          'Los entrenamientos trimestrales.',
          'Las reuniones semanales con los Administradores de Centro.',
          'La asistencia a Campeonatos.',
          'Las evaluaciones y valores de rendimiento del Administrador.',
        ],
      },
      {
        kicker: 'Homologación',
        titulo: 'Las convocatorias que se cuentan',
        items: [
          'Reuniones mensuales con el Administrador.',
          'Reuniones trimestrales con el equipo ALOHA Panamá.',
          'Entrenamiento de niveles y entrenamientos varios.',
          'Campeonato Nacional y Actividades Especiales.',
        ],
        cierre: 'Faltar a una no es perderse una charla: es restarte para el próximo reparto de grupos.',
      },
      {
        kicker: 'El papel',
        titulo: 'El contrato de servicios profesionales',
        items: [
          'Dos copias: una para ti y otra para tu expediente de Coach.',
          'Se firma a la tercera clase dada.',
          'Con él se te entregan la planificación y el calendario del grupo.',
          'Cualquier cambio se notifica al Administrador antes de hacerlo.',
          'Las planificaciones viven en formato Drive compartido.',
        ],
      },
      {
        kicker: 'Lo que tienes que poder hacer',
        titulo: 'Reclamar tu contrato y leer tu año',
        items: [
          'Pedir el contrato si a la tercera clase no te lo han entregado.',
          'Decir cuántas homologaciones tienes y cuántas te faltaron este año.',
          'Ubicar la planificación de tu grupo en el Drive compartido.',
        ],
        cierre: 'El reparto de grupos no se reclama: se prepara durante todo el año.',
      },
    ],

    sop: {
      proceso: 'Recibir un grupo nuevo y dejarlo formalizado',
      cuando: 'El día que el Administrador te asigna un grupo, y hasta la tercera clase dada.',
      producto: 'El grupo tomado con el nivel que te habilita, el contrato firmado a la tercera clase y la planificación en tu poder.',
      pasos: [
        'Confirma el nivel del grupo y compáralo con tu último nivel certificado por el Master Coach.',
        'Si el grupo está por encima de tu nivel, dilo antes de empezar. No se toma.',
        'Recibe del Administrador la planificación y el calendario del grupo.',
        'Ubica esa planificación en el formato Drive compartido, que es donde vive.',
        'Da la primera clase con el calendario a la vista, sin adelantar ni recortar contenido.',
        'A la tercera clase dada, firma el contrato por servicios profesionales.',
        'Verifica que se sacaron dos copias: una para ti y otra para tu expediente de Coach.',
        'Revisa que los datos del contrato sean los tuyos: profesor, grupo, horario y demás.',
        'Si a la tercera clase nadie te lo entregó, solicítalo al Administrador ese mismo día.',
        'Si necesitas cambiar algo de la planificación o el calendario, notifícalo antes de hacer el cambio.',
      ],
      decide: [
        { situacion: 'La asignación del grupo', regla: 'La decide el Administrador de Centro con los cinco criterios: asistencia, entrenamientos trimestrales, reuniones semanales, Campeonatos y evaluaciones de rendimiento.' },
        { situacion: 'Un cambio en la planificación o el calendario', regla: 'Se notifica al Administrador antes de realizarlo. Nunca se hace y se informa después.' },
        { situacion: 'Te ofrecen un grupo de nivel superior al tuyo', regla: 'No se toma: el nivel aprobado es lo que habilita a dar la clase. Lo certifica el Master Coach.' },
      ],
      errores: [
        'Dar clases sin contrato porque nadie lo mencionó a la tercera clase.',
        'Faltar a las homologaciones y reclamar después por qué no hubo segundo grupo.',
        'Cambiar el calendario del grupo y avisar en el reporte de fin de nivel.',
      ],
    },

    masa: [
      'El contrato por servicios profesionales del Manual, en blanco.',
      'Tu registro de asistencia a homologaciones del año en curso.',
      'La planificación y el calendario de tu grupo abiertos en el Drive compartido.',
    ],

    palabras: [
      'contrato-de-servicios-profesionales',
      'expediente-de-coach',
      'homologacion',
      'campeonato-nacional',
      'reunion-trimestral',
      'evaluacion-de-desempeno',
      'master-coach',
      'nivel',
      'kids',
      'tiny-tots',
      'drive',
      'administrador-de-centro',
    ],

    bloques: [
      { t: 'sub', texto: 'Qué define si puedes dar un grupo' },
      { t: 'p', texto: 'Todos los Coaches de ALOHA Mental Arithmetic han sido entrenados de la misma manera y manejan el contenido y la técnica del Programa. **Sin embargo, existen niveles de entrenamiento que el Coach debe haber aprobado para poder dar la clase.** Dependiendo del nivel del grupo, se asigna un Coach que sea apto para brindar esa clase.' },
      { t: 'p', texto: 'Además se toma en cuenta el encaje: hay Coaches que funcionan mejor con grupos **TINY TOTS** y Coaches que funcionan mejor con grupos **KIDS**. Esa característica pesa al momento de la asignación.' },

      { t: 'sub', texto: 'Los cinco criterios de escogencia' },
      { t: 'p', texto: 'Para asignación de grupos se toma en cuenta a los Coaches que hayan cumplido con:' },
      {
        t: 'lista',
        items: [
          'La asistencia.',
          'Los entrenamientos trimestrales.',
          'Las reuniones semanales con los Administradores de Centro.',
          'La asistencia a Campeonatos.',
          'Pasar de forma óptima las evaluaciones y valores de rendimiento realizados a través de las evaluaciones que hace el Administrador de Centro.',
        ],
      },

      { t: 'sub', texto: 'Las convocatorias de homologación' },
      { t: 'p', texto: 'Los Coaches del Programa reciben entrenamiento y seguimiento periódico para mantener una capacitación continua, contar con herramientas pertinentes y **brindar el Programa de manera unificada** a los niños. Por eso es de suma importancia la asistencia puntual a estas actividades: reuniones mensuales con el Administrador, reuniones trimestrales con el equipo ALOHA Panamá, entrenamiento de niveles, entrenamientos varios, Campeonato Nacional, Actividades Especiales y otros.' },
      { t: 'nota', tono: 'regla', titulo: 'Estas asistencias se cuentan al repartir grupos', texto: 'Se le asigna grupo a los Coaches que cumplan con estos requisitos de entrenamiento. Faltar a una homologación no es perderse una charla: es restarte para el próximo reparto de grupos.' },

      { t: 'sub', texto: 'El contrato de servicios profesionales' },
      { t: 'p', texto: 'Se debe realizar un contrato por servicio profesional a cada Coach. El contrato ya está estructurado; lo que se modifica es la información principal: datos del profesor, grupo, horario y demás.' },
      {
        t: 'tabla',
        encabezados: ['Punto', 'Regla'],
        filas: [
          ['Copias', 'Dos: una para el Coach y otra que se guarda en el expediente del Coach'],
          ['Cuándo se firma', 'A la tercera clase dada'],
          ['Qué se te entrega', 'La planificación y el calendario del grupo, que deberán ser respetados'],
          ['Si necesitas cambiarlos', 'Debe ser notificado al Administrador antes de realizar el cambio'],
          ['Dónde viven', 'Estas planificaciones deben estar en formato DRIVE compartido'],
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Llevas dos ciclos sin que te asignen un segundo grupo, aunque tienes nivel 5 aprobado. Revisando tu año: faltaste a dos reuniones trimestrales con el equipo ALOHA Panamá y al Campeonato Nacional, porque coincidieron con compromisos personales. Explica, con el texto del Manual, por qué el Administrador está asignando los grupos a otros Coaches y qué tienes que hacer para revertirlo.' },
    ],

    quiz: [
      {
        pregunta: '¿Qué define principalmente si un Coach puede dar cierto grupo?',
        opciones: [
          'Su antigüedad en el Centro',
          'La cantidad de grupos que ya tiene',
          'El nivel de entrenamiento que tenga aprobado',
          'La cercanía de su casa al Centro',
        ],
        explicacion: 'Todos manejan el contenido, pero existen niveles de entrenamiento que hay que tener aprobados para poder dar la clase.',
        repasa: ['nivel'],
      },
      {
        pregunta: 'Al asignar grupos también se considera que hay Coaches que funcionan mejor con TINY TOTS y otros que funcionan mejor con KIDS.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'El encaje con el itinerario pesa en la asignación, además del nivel aprobado.',
        repasa: ['tiny-tots', 'kids'],
      },
      {
        pregunta: '¿Cuál de estos NO es un criterio de escogencia del Coach para asignación de grupos?',
        opciones: [
          'El promedio académico de su título universitario',
          'El cumplimiento de la asistencia',
          'Haber pasado por los entrenamientos trimestrales',
          'La asistencia a Campeonatos',
        ],
        explicacion: 'Los cinco criterios son asistencia, entrenamientos trimestrales, reuniones semanales con el Administrador, Campeonatos y evaluaciones de rendimiento.',
      },
      {
        pregunta: 'Las asistencias a las convocatorias de homologación se toman en cuenta al momento de la asignación de grupos.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Se le asigna grupo a los Coaches que cumplan con estos requisitos de entrenamiento.',
        repasa: ['homologacion'],
      },
      {
        pregunta: '¿Cuál de estas actividades figura en la lista de convocatorias de homologación?',
        opciones: [
          'Reuniones semestrales con la aseguradora',
          'Visitas mensuales a los colegios de la zona',
          'Reuniones trimestrales con el equipo ALOHA Panamá',
          'Auditorías contables del Centro',
        ],
        explicacion: 'La lista es reuniones mensuales con el Administrador, reuniones trimestrales con el equipo ALOHA Panamá, entrenamiento de niveles, entrenamientos varios, Campeonato Nacional y Actividades Especiales.',
        repasa: ['reunion-trimestral'],
      },
      {
        pregunta: '¿Cuántas copias se sacan del contrato por servicios profesionales del Coach y cuál es su destino?',
        opciones: [
          'Una sola, para el Coach',
          'Tres: Coach, Administrador y corporativo',
          'Dos, ambas para el archivo del Centro',
          'Dos: una para el Coach y otra para el expediente del Coach',
        ],
        explicacion: 'Una se queda contigo. La otra va al expediente, que es donde viven tus contratos por grupo y nivel.',
        repasa: ['expediente-de-coach'],
      },
      {
        pregunta: '¿En qué momento debe firmarse el contrato por servicios profesionales?',
        opciones: [
          'A la tercera clase dada',
          'Antes de la primera clase',
          'Al cierre del nivel',
          'Al mes de haber iniciado el grupo',
        ],
        explicacion: 'A la tercera clase dada. Si llegas a esa clase sin contrato, se solicita ese mismo día.',
        repasa: ['contrato-de-servicios-profesionales'],
      },
      {
        pregunta: 'Si el Coach necesita cambiar algo de la planificación o el calendario que se le entregó, debe…',
        opciones: [
          'informarlo en el reporte de fin de nivel',
          'notificarlo al Administrador antes de realizar el cambio',
          'hacerlo y anotarlo en la bitácora',
          'consultarlo con el Master Coach',
        ],
        explicacion: 'Antes, no después. El calendario es del nivel, no del Coach.',
      },
      {
        pregunta: 'Las planificaciones y calendarios de grupo deben estar en formato DRIVE compartido.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Ahí viven, para que el Centro entero pueda verlos sin pedírtelos a ti.',
        repasa: ['drive'],
      },
      {
        pregunta: 'Llevas tres clases dadas con tu grupo nuevo y nadie te ha entregado el contrato por servicios profesionales. ¿Qué corresponde?',
        opciones: [
          'Solicitarlo, porque el contrato debe firmarse a la tercera clase dada',
          'Esperar al cierre de nivel',
          'Seguir sin contrato: basta el acuerdo verbal',
          'Pedírselo al Master Coach',
        ],
        explicacion: 'El plazo ya se cumplió. Reclamarlo es parte de tu puesto, no una molestia.',
        repasa: ['contrato-de-servicios-profesionales'],
      },
    ],

    drills: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'of-coa-4',
    curso: 'coach',
    orden: 17,
    roles: ['coach'],
    titulo: 'Tus seis responsabilidades y la ausencia coordinada',
    duracionMin: 18,
    requiere: ['of-coa-3'],
    fuente: ['curso-4-coach.html#m5'],

    pfv: 'Tu grupo con clase siempre: las seis responsabilidades cumplidas, la ausencia coordinada con suplente del nivel correcto y el permiso firmado antes de faltar.',

    voz: 'Seis responsabilidades. Se dicen rápido y sostienen el puesto entero. <break time="0.4s"/> Enseñar el método siguiendo sus lineamientos. Entregar el aula como la recibiste. <break time="0.3s"/> Cuidar que los niños estén seguros, sin comparaciones entre compañeros. <break time="0.3s"/> Propiciar el orden dentro del salón. <break time="0.3s"/> Notificar a la empresa si un estudiante no asiste, no asimila o no se porta bien. <break time="0.4s"/> Y coordinar tu ausencia cuando no puedas ir. <break time="0.5s"/> Ojo con el orden de esa última. <break time="0.3s"/> Primero consigues el suplente con el nivel que el grupo necesita. <break time="0.3s"/> Después vas donde el Administrador. <break time="0.4s"/> Y no vas a avisar: vas a pedir permiso, por escrito, con tres días de anticipación. <break time="0.3s"/> Ese permiso solo existe cuando él lo firma, y te lo puede negar. <break time="0.5s"/> La puntualidad se mide llegando veinte minutos antes, con quince de tolerancia. <break time="0.3s"/> El bono es de quince balboas al mes con un grupo, y cinco más por cada grupo adicional.',

    laminas: [
      {
        kicker: 'El puesto',
        titulo: 'Las seis responsabilidades del Coach',
        items: [
          'Enseñar el método siguiendo fielmente lineamientos y protocolos.',
          'Entregar el aula en iguales condiciones a las recibidas.',
          'Niños seguros, sin comparaciones entre compañeros.',
          'Propiciar el orden y la disciplina: las actividades son dirigidas.',
          'Notificar a la Empresa lo que pasa con un estudiante.',
        ],
        cierre: 'La sexta es coordinar la ausencia, y tiene su propio paso a paso.',
      },
      {
        kicker: 'El orden importa',
        titulo: 'Primero el suplente, después el permiso',
        texto: 'Coordinas la suplencia con otro Coach según el nivel que requiere el grupo, y solo entonces vas donde el Administrador. Ir sin suplente no es coordinar una ausencia: es dejar un grupo sin clase.',
        cierre: 'Un suplente con nivel inferior al del grupo no es suplente.',
      },
      {
        kicker: 'La palabra exacta',
        titulo: 'No vas a avisar, vas a pedir permiso',
        texto: 'Los permisos se solicitan por escrito con un mínimo de tres días de anticipación. Quedan autorizados únicamente al momento de la firma del Administrador, y él está en todo su derecho de negarlos.',
        cierre: 'Una vez autorizada, la solicitud se envía al Coordinador Operativo y reposa en tu file personal.',
      },
      {
        kicker: 'El bono',
        titulo: 'Llegar a la hora es llegar tarde',
        items: [
          'Llegas 20 minutos antes del inicio, con tolerancia de 15 minutos.',
          'Un grupo asignado: B/.15.00 mensuales.',
          'Cada grupo adicional: B/.5.00 mensuales más.',
          'Se paga los 30 de cada mes, con mínimo un mes de trabajo con el grupo.',
        ],
      },
      {
        kicker: 'Cómo te miran',
        titulo: 'Dos evaluaciones por grupo',
        texto: 'El Administrador evalúa a cada Coach al menos dos veces dentro del tiempo estimado para cada grupo. Se pueden realizar en la semana 4, al inicio de mentales, y en la semana 9.',
        cierre: 'La escala mira puntualidad, material, estructura de clase, seguimiento del alumno, relación con el alumno y estrategias.',
      },
    ],

    sop: {
      proceso: 'Me tengo que ausentar de una clase',
      cuando: 'Apenas sepas que no vas a poder dar una clase, y siempre con tres días de anticipación como mínimo.',
      producto: 'El grupo con clase igual, el permiso firmado por el Administrador y el suplente con la programación en la mano.',
      pasos: [
        'Mira el nivel de tu grupo. El suplente tiene que tener ese nivel aprobado o uno superior.',
        'Coordina tú la suplencia con otro Coach. No es trabajo del Administrador buscarte reemplazo.',
        'Redacta la solicitud de permiso por escrito, con mínimo tres días de anticipación.',
        'Preséntasela al Administrador con el nombre del suplente y su nivel.',
        'Espera su firma. Presentar la solicitud no es aprobación, y él puede negarla.',
        'Si te la niega, la clase la das tú. No la canceles ni la muevas por tu cuenta.',
        'Autorizada, entrégale al Coach suplente la programación del grupo.',
        'Confirma con el suplente el día, la hora y el salón, y que puede dar la clase sin inconveniente.',
        'La solicitud autorizada se envía al Coordinador Operativo y reposa en tu file personal.',
        'A la vuelta, revisa la bitácora del suplente y retoma el calendario donde quedó.',
      ],
      decide: [
        { situacion: 'Autorizar el permiso', regla: 'El Administrador de Centro, y queda autorizado únicamente al momento de su firma. Está en todo su derecho de negarlo.' },
        { situacion: 'El único Coach libre tiene nivel inferior al del grupo', regla: 'No es suplente. Busca otro o da la clase tú: el nivel aprobado es lo que habilita.' },
        { situacion: 'Pasa un accidente en tu clase', regla: 'Brinda primeros auxilios básicos, asegura la integridad del niño y notifica de forma inmediata al Administrador. Todo incidente se reporta, por leve que parezca.' },
      ],
      errores: [
        'Ir donde el Administrador sin suplente conseguido.',
        'Dar por aprobado el permiso porque lo entregaste con tiempo.',
        'Dejar al suplente sin la programación del grupo.',
      ],
    },

    masa: [
      'El formato de Solicitud de Permisos del Manual, en blanco.',
      'La lista de Coaches del Centro con el nivel que tiene aprobado cada uno.',
      'El calendario y la programación de tu grupo.',
      'El Informe de Puntualidad de la última quincena.',
    ],

    palabras: [
      'permiso',
      'coordinador-operativo',
      'file-del-colaborador',
      'bono-por-puntualidad',
      'tolerancia',
      'evaluacion-de-desempeno',
      'administrador-de-centro',
      'coach',
      'nivel',
      'primeros-auxilios',
      'incidente',
      'incapacidad',
    ],

    bloques: [
      { t: 'sub', texto: 'Las seis responsabilidades del Coach' },
      {
        t: 'tabla',
        encabezados: ['#', 'Responsabilidad'],
        filas: [
          ['1', 'Enseñar el método ALOHA Mental Arithmetic siguiendo fielmente sus lineamientos, estándares y protocolos.'],
          ['2', 'Entregar el aula de clase en iguales condiciones a las recibidas.'],
          ['3', 'Asegurarse de que sus estudiantes estén seguros y de que todo el programa se realice bajo un ambiente positivo, donde no hay lugar para las comparaciones entre compañeros, respetando las individualidades de cada uno.'],
          ['4', 'Propiciar el orden y la disciplina dentro del área de clases, ya que las actividades deben ser dirigidas.'],
          ['5', 'Notificar a la Empresa si algún estudiante no está asistiendo, no está asimilando, no tiene buen comportamiento o cualquier otra situación que considere oportuna.'],
          ['6', 'De requerir ausentarse de una de sus clases, coordinar las posibles alternativas de reemplazo, notificar al Administrador del Centro y coordinar con el Coach que lo reemplazará para entregarle la programación, de modo que pueda dar su clase sin inconveniente.'],
        ],
      },

      { t: 'sub', texto: 'Me tengo que ausentar de una clase' },
      {
        t: 'pasos',
        items: [
          'Los permisos se solicitan **por escrito con un mínimo de tres (3) días de anticipación**.',
          'Como Coach, tú **coordinas tu suplencia con otro Coach**, basándote en el nivel que requiere el grupo y el nivel que tenga el Coach que te va a suplir.',
          'Luego te comunicas con el Administrador del Centro para que esté anuente, se asegure de que la suplencia sea óptima y pueda ser considerada para el pago de la planilla.',
          'El permiso **queda autorizado únicamente al momento de la firma del Administrador**. La solicitud la evalúa tu supervisor inmediato para que no entorpezca el funcionamiento normal del Centro y para verificar que la razón sea valedera, y el Administrador está en todo su derecho de negarla. Una vez autorizada, la solicitud se envía al Coordinador Operativo y reposa en tu file personal.',
          'Le entregas al Coach suplente la programación del grupo.',
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'El orden, y la palabra', texto: 'Primero consigues el suplente con el nivel correcto, después vas donde el Administrador. Y no vas a **avisar**: vas a **pedir permiso**, y ese permiso solo existe cuando él lo firma. Ir sin suplente no es coordinar una ausencia: es dejar un grupo sin clase. Y un suplente con nivel inferior al del grupo no es suplente.' },
      { t: 'p', texto: 'Para el personal en planilla, el Manual fija un máximo de **18 permisos al año con justificación médica** para que la empresa se haga cargo del pago; al exceder los 18, la Caja de Seguro Social se responsabiliza del pago.' },

      { t: 'sub', texto: 'Puntualidad: llegar a la hora es llegar tarde' },
      { t: 'p', texto: 'El bono por puntualidad se mide así: el Coach debe llegar **20 minutos antes de su hora de inicio de clase, con tolerancia de 15 minutos**, en todos sus grupos.' },
      {
        t: 'tabla',
        encabezados: ['Situación', 'Bono mensual por puntualidad perfecta'],
        filas: [
          ['Coach con un (1) grupo asignado', 'B/.15.00 mensual'],
          ['Coach con dos o más grupos asignados', 'B/.5.00 por cada grupo adicional, de manera mensual'],
        ],
      },
      { t: 'p', texto: 'El pago de la bonificación por puntualidad perfecta es **los 30 de cada mes**, siempre y cuando cumplas con un mínimo de un mes de trabajo con el grupo y llegues 20 minutos antes de cada clase durante todo el mes. Quien lo sustenta es la Asistente Administrativa con el Informe de Puntualidad quincenal.' },

      { t: 'sub', texto: 'Cómo te evalúa el Administrador' },
      { t: 'p', texto: 'El Administrador realiza una evaluación a cada Coach **al menos dos veces dentro del tiempo estimado para cada grupo**. Se pueden realizar en la **semana 4** (inicio de mentales) y en la **semana 9**. La escala toma en cuenta: puntualidad, material del Coach, estructura de clase, seguimiento del alumno, relación alumno-profesor y estrategias en clases. Después de la evaluación se te da retroalimentación, y esas hojas se anexan a tu expediente.' },

      { t: 'sub', texto: 'Si pasa un accidente en tu clase' },
      { t: 'nota', tono: 'alerta', titulo: 'Todo se reporta, por leve que parezca', texto: 'Todo incidente o accidente debe ser reportado y documentado. El Coach o personal presente debe **brindar primeros auxilios básicos y asegurar la integridad del niño**, y **notificar de forma inmediata al Administrador del Centro**. Un accidente no reportado constituye una falla grave en el protocolo de seguridad y puede derivar en sanción administrativa. El protocolo completo lo estudiaste en el bloque A.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Es martes y el jueves tienes una cita médica a la hora de tu clase de nivel 2. El único Coach libre ese día tiene nivel 1 aprobado. Escribe los pasos exactos que vas a dar, en orden, y di qué pasa si no consigues suplente con el nivel correcto.' },
    ],

    quiz: [
      {
        pregunta: 'Sobre el ambiente de clase, la responsabilidad del Coach establece que…',
        opciones: [
          'se debe premiar públicamente al mejor de cada clase',
          'la competencia entre niños acelera el aprendizaje',
          'el orden lo impone el niño más avanzado',
          'no hay lugar para las comparaciones entre compañeros y se respetan las individualidades de cada uno',
        ],
        explicacion: 'Es la tercera responsabilidad, y va junto con asegurarse de que los estudiantes estén seguros.',
      },
      {
        pregunta: 'Entregar el aula de clase en iguales condiciones a las recibidas es una responsabilidad del Coach.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es la segunda de las seis, escrita tal cual en el Manual.',
      },
      {
        pregunta: 'Cuando el Coach debe ausentarse de una clase, el primer paso es…',
        opciones: [
          'avisar al padre de familia',
          'coordinar las posibles alternativas de reemplazo con otro Coach del nivel requerido',
          'cancelar la clase y reponerla después',
          'notificar al Master Coach',
        ],
        explicacion: 'Primero el suplente, después el Administrador. Ir sin suplente es dejar un grupo sin clase.',
      },
      {
        pregunta: '¿Con cuánta anticipación mínima deben solicitarse los permisos, y en qué forma?',
        opciones: [
          'Por escrito, con un mínimo de tres días de anticipación',
          'Verbalmente, el mismo día',
          'Por escrito, con un día de anticipación',
          'Por escrito, con una semana de anticipación',
        ],
        explicacion: 'Y quedan autorizados únicamente al momento de la firma del Administrador.',
        repasa: ['permiso'],
      },
      {
        pregunta: 'El Coach coordina su suplencia basándose en el nivel que requiere el grupo y el nivel que tenga el Coach que lo va a suplir.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Un suplente con nivel inferior al del grupo no es suplente.',
        repasa: ['nivel'],
      },
      {
        pregunta: 'Para efectos del bono, la puntualidad del Coach se mide llegando…',
        opciones: [
          'a la hora exacta de inicio de clase',
          '10 minutos antes, sin tolerancia',
          '20 minutos antes de su hora de inicio de clase, con tolerancia de 15 minutos',
          '30 minutos antes, con tolerancia de 10 minutos',
        ],
        explicacion: 'En todos tus grupos, no solo en el primero del día.',
        repasa: ['bono-por-puntualidad', 'tolerancia'],
      },
      {
        pregunta: 'El bono mensual por puntualidad perfecta de un Coach con un solo grupo asignado es de…',
        opciones: ['B/.5.00', 'B/.15.00', 'B/.25.00', 'B/.50.00'],
        explicacion: 'Los B/.5.00 son lo que suma cada grupo adicional, no el bono base.',
      },
      {
        pregunta: 'Para un Coach con dos o más grupos, el bono por puntualidad perfecta agrega por cada grupo adicional…',
        opciones: ['B/.5.00 mensuales', 'B/.15.00 mensuales', 'B/.10.00 mensuales', 'nada adicional'],
        explicacion: 'B/.15.00 por el primer grupo y B/.5.00 por cada uno de los siguientes.',
      },
      {
        pregunta: '¿En qué fecha se paga la bonificación por puntualidad perfecta?',
        opciones: [
          'Los 13 de cada mes',
          'Los 28 de cada mes',
          'Al cierre de cada nivel',
          'Los 30 de cada mes',
        ],
        explicacion: 'Siempre que cumplas un mínimo de un mes de trabajo con el grupo y la puntualidad de todo el mes.',
      },
      {
        pregunta: 'Ante un accidente en clase, el Coach o personal presente debe brindar primeros auxilios básicos y notificar de forma inmediata al Administrador del Centro.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Todo incidente se reporta y se documenta, por leve que parezca. No reportarlo puede derivar en sanción administrativa.',
        repasa: ['primeros-auxilios', 'incidente'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — La ausencia de la semana que viene',
        fuente: 'curso-4-coach.html#m5',
        proposito: 'Que armes una ausencia completa en el orden correcto, con suplente del nivel que el grupo necesita y el permiso pedido por escrito, sin que el grupo pierda una sola clase.',
        gradiente: 'Exige tener claro el nivel de tu grupo y el nivel aprobado de cada Coach del Centro. Si todavía no puedes decir los dos de memoria, primero repasa la tabla de Coaches y niveles: la escena viene después.',
        masa: [
          'La lista de Coaches del Centro con el nivel aprobado de cada uno.',
          'El formato de Solicitud de Permisos en blanco.',
          'La programación de tu grupo, impresa.',
        ],
        pasos: [
          'Tu jefe entrenador te da una fecha real de la semana que viene y el nivel de tu grupo.',
          'Di en voz alta, sin mirar la lista, qué nivel necesita el suplente.',
          'Ubica en la lista a los Coaches que califican y di a cuál llamas primero y por qué.',
          'Llena la solicitud de permiso por escrito, con el nombre del suplente y su nivel.',
          'Entrégasela a tu jefe entrenador, que hace de Administrador y te la niega la primera vez.',
          'Di en voz alta qué haces con la clase cuando el permiso se niega.',
          'Segunda vuelta: te la autoriza. Di qué le entregas al suplente y a dónde va la solicitud firmada.',
        ],
        criterios: [
          'Consigue primero el suplente y solo después presenta el permiso, sin que se lo tengan que recordar.',
          'Verifica el nivel del suplente contra el nivel del grupo y descarta al que no califica.',
          'Dice que ante un permiso negado la clase la da él, y que no la cancela ni la mueve por su cuenta.',
          'Nombra las tres cosas que salen del proceso: programación al suplente, solicitud al Coordinador Operativo y copia en su file personal.',
        ],
        errorTipico: 'Presentar el permiso primero y prometer que el suplente aparece después. Se delata porque arranca la conversación con la fecha de su cita en vez de con el nombre del suplente, y el Administrador se queda buscándole reemplazo a tres días de la clase.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'of-coa-5',
    curso: 'coach',
    orden: 18,
    roles: ['coach'],
    titulo: 'Padres: la línea que no se cruza',
    duracionMin: 15,
    requiere: ['of-coa-4'],
    fuente: ['curso-4-coach.html#m6'],

    pfv: 'El padre atendido sin que tú abras un canal directo: la preocupación llevada al Administrador el mismo día, la reunión hecha con él delante y los acuerdos firmados en el Resumen de Reunión Colaborativa.',

    voz: 'Este módulo tiene una regla que ordena todo lo demás. <break time="0.4s"/> El Coach no está autorizado para dar su número directo a un representante. <break time="0.3s"/> Se da el celular del Centro, para que lo atienda la administración. <break time="0.5s"/> El Administrador es el contacto directo con los padres. <break time="0.3s"/> Tú reportas el inconveniente, y él decide contigo cómo se soluciona. <break time="0.4s"/> Puedes dar retroalimentación positiva y sugerencias para mejorar. <break time="0.3s"/> Pero el progreso y las deficiencias del alumno se informan a través de las autoridades apropiadas. <break time="0.5s"/> Y lo delicado se dice en conjunto con el Administrador. <break time="0.3s"/> Nunca a solas. Nunca por tu teléfono personal. <break time="0.3s"/> Nunca en la puerta del salón mientras salen los demás niños. <break time="0.5s"/> Si de la reunión salen acuerdos, se firma el Resumen de Reunión Colaborativa. <break time="0.3s"/> Y reposa en los archivos digitales del centro y en el portafolio del estudiante.',

    laminas: [
      {
        kicker: 'La regla base',
        titulo: 'Tu número personal no se da',
        texto: 'El Coach no está autorizado para dar su número directo a un representante. Debe dar el celular del Centro para que sea atendido por medio de la administración.',
        cierre: 'Los Coaches tienen prohibido establecer un contacto directo con los padres.',
      },
      {
        kicker: 'Quién habla con quién',
        titulo: 'Tú reportas, el Administrador responde',
        texto: 'El Administrador de Centro es el contacto directo con los padres. Tú le reportas cualquier inconveniente y él decide contigo cómo solventarlo. Es él quien se pone en contacto con el padre.',
      },
      {
        kicker: 'Las ocho reglas',
        titulo: 'Lo que sí puedes y lo que no',
        items: [
          'Comunicación siempre con respeto. Nunca tutear.',
          'Informar progreso y deficiencias a través de las autoridades apropiadas.',
          'Retroalimentación positiva y sugerencias, sí. Lo destructivo, con el Administrador.',
          'Escuchar las quejas con simpatía y desalentar las críticas injustas.',
          'Seguir el problema hasta cerrar el ciclo de la situación.',
        ],
      },
      {
        kicker: 'Cuando hay acuerdos',
        titulo: 'Resumen de Reunión Colaborativa',
        texto: 'Si de la reunión se desprenden cambios estructurales del programa o acuerdos consensuados, se deja por escrito y lo firman los representantes del Centro y el representante del estudiante.',
        cierre: 'Reposa en los archivos digitales del centro y en el portafolio de Class Dojo del estudiante.',
      },
      {
        kicker: 'Lo que tienes que poder hacer',
        titulo: 'Sostener la línea sin quedar mal',
        items: [
          'Contestar al padre que espera en la puerta sin abrir la conversación ahí.',
          'Llevar la preocupación al Administrador el mismo día.',
          'Dejarla por escrito en el formato de situaciones especiales.',
        ],
        cierre: 'Las reuniones con padres se realizan siempre en presencia del Administrador.',
      },
    ],

    sop: {
      proceso: 'Atender a un padre sin cruzar la línea',
      cuando: 'Cada vez que un representante te busca, te escribe o te espera a la salida del salón.',
      producto: 'El padre escuchado y su tema en manos del Administrador el mismo día, sin canal directo abierto y con lo delicado por escrito.',
      pasos: [
        'Escucha con respeto y sin tutear. Escuchar no compromete nada.',
        'Si te pide tu número, dale el celular del Centro y explícale que ahí lo atienden.',
        'Si el tema es el progreso o una deficiencia del niño, no lo resuelvas en la puerta.',
        'Dile que la administración le coordina una reunión, y no prometas fecha ni solución.',
        'Habla con el Administrador el mismo día, antes de que el padre vuelva a buscarte.',
        'Busquen la solución en conjunto y solo después se agenda la cita con el padre.',
        'Asiste a la reunión con el Administrador presente. Nunca a solas.',
        'Si hay que comunicar comportamientos destructivos, se hace en conjunto con él.',
        'Deja por escrito la inquietud en el formato de situaciones especiales.',
        'Si salen acuerdos, llenen el Resumen de Reunión Colaborativa y fírmenlo.',
        'Archívalo en los archivos digitales del centro y en el portafolio de Class Dojo del estudiante.',
        'Sigue el caso hasta cerrar el ciclo de la situación: respuesta con solución a satisfacción.',
      ],
      decide: [
        { situacion: 'Responder por una situación que involucra al padre', regla: 'El Administrador del Centro es el único encargado. Tú reportas y buscan la solución juntos.' },
        { situacion: 'Un padre te pide tu número personal', regla: 'Se le da el celular del Centro. El Coach no está autorizado a dar su número directo ni a establecer contacto directo.' },
        { situacion: 'Hay que comunicar un comportamiento destructivo', regla: 'Se hace en conjunto con el Administrador del Centro, en reunión y con el documento firmado si hay acuerdos.' },
      ],
      errores: [
        'Resolver el tema en la puerta del salón mientras salen los demás niños.',
        'Contestar por tu teléfono personal porque el padre ya te había escrito antes.',
        'Prometerle al padre una solución que no te toca decidir.',
      ],
    },

    masa: [
      'El formato de situaciones especiales del Manual, en blanco.',
      'El formato de Resumen de Reunión Colaborativa, en blanco.',
      'El número del celular del Centro, escrito donde lo puedas leer.',
      'Class Dojo abierto en el portafolio de un niño de tu grupo.',
    ],

    palabras: [
      'representante',
      'administrador-de-centro',
      'reporte-de-situaciones-especiales',
      'class-dojo',
      'portafolio',
      'coach',
      'clase-para-padres',
      'escuela-de-padres',
      'evidencia',
      'trazabilidad',
    ],

    bloques: [
      { t: 'sub', texto: 'La regla que ordena todo el módulo' },
      { t: 'nota', tono: 'alerta', titulo: 'Tu número personal no se da', texto: 'El Coach no está autorizado para dar su número directo a un representante. Debe dar el celular del Centro para que sea atendido por medio de la administración. **Los Coaches tienen prohibido dar su número personal y establecer un contacto directo con los padres.**' },
      { t: 'p', texto: 'El Administrador de Centro es el contacto directo con los padres. Tú reportas cualquier inconveniente o problema al Administrador, y es el Administrador quien, junto contigo, decide cómo solventarlo. El Administrador es quien se pone en contacto con el padre.' },

      { t: 'sub', texto: 'Las ocho reglas de comunicación y atención a padres' },
      {
        t: 'lista',
        items: [
          'Estableces y mantienes relaciones cordiales con los padres, y te conduces para merecer su confianza y respeto.',
          'La comunicación siempre es con respeto (**nunca tutear**), con disposición de servicio, clara y con mucho tacto.',
          'Informas a los padres, **a través de las autoridades apropiadas**, sobre el progreso y las deficiencias del alumno, con la mayor franqueza y tacto, buscando la cooperación de los padres.',
          'Puedes dar retroalimentación positiva y sugerencias para mejorar; pero cuando se trate de comunicar **comportamientos destructivos, debe hacerse en conjunto con el Administrador del Centro**.',
          'Escuchas las quejas de los padres con simpatía y comprensión, y desalientas las críticas injustas.',
          'Todo problema o inquietud de un padre se sigue **hasta cerrar el ciclo de la situación**: respuesta con solución a satisfacción, para que el padre perciba el interés y compromiso del Programa con su hijo.',
          'El Administrador es el único encargado de responder por una situación en la que se involucra al padre. Si quieres comunicar una preocupación específica sobre un niño, hablas primero con el Administrador, buscan soluciones en conjunto y solo después se agenda la cita. **Las reuniones con padres se realizan siempre en presencia del Administrador.**',
          'Usas el **formato de situaciones especiales** para dejar por escrito cualquier inquietud sobre una situación específica.',
        ],
      },

      { t: 'sub', texto: 'Cuando la reunión produce acuerdos' },
      { t: 'p', texto: 'Si de una reunión con el representante se desprenden cambios estructurales del programa o se llega a acuerdos consensuados, se deja por escrito mediante el documento **RESUMEN DE REUNIÓN COLABORATIVA**, firmado por los representantes del Centro y el representante del estudiante. Ese documento debe reposar en **los archivos digitales del centro y en el portafolio de Class Dojo del estudiante**.' },

      { t: 'sub', texto: 'El padre que te espera en la puerta' },
      { t: 'nota', tono: 'regla', titulo: 'Lo delicado se dice de a dos, y por escrito', texto: 'El progreso **y** las deficiencias del alumno se informan al padre a través de las autoridades apropiadas, nunca por tu cuenta. Sí puedes dar retroalimentación positiva y sugerencias para mejorar, pero eso no te abre un canal directo. Lo delicado lo dicen el Administrador y tú, juntos, y queda por escrito. Nunca a solas, nunca por tu teléfono personal, nunca en la puerta del salón mientras salen los demás niños.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Un papá te espera afuera del salón y te dice, molesto, que su hijo llegó llorando la semana pasada porque otro niño se burló de él y que "usted no hizo nada". Tienes su número porque él te escribió una vez. Describe qué haces en los próximos cinco minutos, qué NO haces, y qué documentos del Manual se van a usar si el caso avanza.' },
    ],

    quiz: [
      {
        pregunta: 'Un representante le pide al Coach su número de teléfono para coordinar mejor. El Coach debe…',
        opciones: [
          'dar el celular del Centro para que sea atendido por medio de la administración',
          'dar su número personal solo para temas académicos',
          'dar su número y avisarle al Administrador',
          'dar el número de otro Coach del Centro',
        ],
        explicacion: 'El Coach tiene prohibido dar su número personal y establecer contacto directo con los padres.',
        repasa: ['representante'],
      },
      {
        pregunta: 'En la comunicación con los padres se permite tutear cuando ya hay confianza.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'La comunicación es siempre con respeto, y nunca se tutea a un representante.',
      },
      {
        pregunta: '¿Quién es el único encargado de responder por una situación en la que se involucra al padre?',
        opciones: [
          'El Coach del grupo',
          'El Asistente Administrativo',
          'El Administrador del Centro',
          'El Master Coach',
        ],
        explicacion: 'Tú hablas primero con él, buscan la solución en conjunto y solo después se agenda la cita.',
        repasa: ['administrador-de-centro'],
      },
      {
        pregunta: 'Las reuniones con padres deben realizarse…',
        opciones: [
          'a solas con el Coach para mayor confianza',
          'por videollamada únicamente',
          'solo cuando el padre lo solicite por escrito',
          'siempre en presencia del Administrador',
        ],
        explicacion: 'Nunca a solas. Es lo que protege al niño, al padre y a ti.',
      },
      {
        pregunta: 'Cuando hay que comunicar comportamientos destructivos de un niño, el Coach…',
        opciones: [
          'debe hacerlo en conjunto con el Administrador del Centro',
          'lo comunica solo, con tacto',
          'lo escribe en Class Dojo y espera respuesta',
          'lo delega al Asistente Administrativo',
        ],
        explicacion: 'La retroalimentación positiva y las sugerencias sí son tuyas. Lo destructivo se dice de a dos.',
      },
      {
        pregunta: '¿Qué documento se usa cuando de una reunión con el representante se desprenden cambios estructurales o acuerdos consensuados?',
        opciones: [
          'El reporte de accidente escolar',
          'El Resumen de Reunión Colaborativa, firmado por los representantes del Centro y del estudiante',
          'La bitácora diaria de clases',
          'La plantilla de retroalimentación a niños',
        ],
        explicacion: 'Se firma por las dos partes y deja constancia de lo acordado.',
      },
      {
        pregunta: '¿Dónde debe reposar el Resumen de Reunión Colaborativa?',
        opciones: [
          'Solo en el expediente del Coach',
          'Solo en el correo del Administrador',
          'En los archivos digitales del centro y en el portafolio de Class Dojo del estudiante',
          'En el file físico del representante únicamente',
        ],
        explicacion: 'En los dos sitios: el del Centro y el del niño.',
        repasa: ['portafolio', 'class-dojo'],
      },
      {
        pregunta: 'Todo problema o inquietud de un padre se debe seguir hasta cerrar el ciclo de la situación, es decir, hasta dar respuesta con solución a satisfacción.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es la sexta regla: el padre tiene que percibir el interés y el compromiso del Programa con su hijo.',
      },
      {
        pregunta: '¿Qué formato usa el Coach para dejar por escrito una inquietud sobre una situación específica?',
        opciones: [
          'El formato de situaciones especiales',
          'El cuadro de deserciones',
          'La hoja de supervisión de Coach',
          'El calendario y asistencia',
        ],
        explicacion: 'Es el formato de la octava regla, y el mismo que se usa para los casos especiales de un niño.',
        repasa: ['reporte-de-situaciones-especiales'],
      },
      {
        pregunta: 'Una mamá te espera afuera del salón y te pide hablar cinco minutos sobre la conducta de su hijo, que ha estado pegándole a otros niños. ¿Qué haces?',
        opciones: [
          'Converso con ella ahí mismo, que es más rápido',
          'Le doy mi número para hablar con calma en la noche',
          'Le indico que la administración coordinará una reunión y hablo primero con el Administrador',
          'Le pido que lo escriba en Class Dojo',
        ],
        explicacion: 'Un comportamiento destructivo se comunica en conjunto con el Administrador, y la reunión se hace con él presente.',
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — El padre en la puerta',
        fuente: 'curso-4-coach.html#m6',
        proposito: 'Que sostengas la línea con un padre molesto sin abrir un canal directo, sin prometer lo que no decides y dejando el caso en manos del Administrador el mismo día.',
        gradiente: 'Exige tener las ocho reglas leídas y poder decir cuál de ellas aplica en cada momento. Si todavía se te mezclan, primero léelas en voz alta y di un ejemplo de cada una. La escena viene después.',
        masa: [
          'El formato de situaciones especiales en blanco, sobre la mesa.',
          'El número del celular del Centro escrito en un papel.',
        ],
        pasos: [
          'Tu jefe entrenador hace de padre molesto y te espera a la salida del salón.',
          'Recibe el reclamo de pie, sin tutear, y escucha sin interrumpir.',
          'Contesta sin abrir la conversación ahí y sin prometer una solución.',
          'El padre insiste y te pide tu número personal. Respóndele.',
          'El padre dice que ya te escribió una vez y que le contestaste. Sostén la línea igual.',
          'Cierra diciéndole qué va a pasar ahora y quién lo va a llamar.',
          'Delante de tu jefe entrenador, llena el formato de situaciones especiales con lo que acaba de ocurrir.',
        ],
        criterios: [
          'Escucha el reclamo completo sin interrumpir y sin tutear al representante en ningún momento.',
          'Entrega el celular del Centro y no su número personal, aunque el padre lo presione dos veces.',
          'Dice que la administración coordina la reunión, sin prometer fecha, solución ni castigo a otro niño.',
          'Llena el formato de situaciones especiales el mismo día y nombra al Administrador como quien responde.',
        ],
        errorTipico: 'Resolver el caso en la puerta para que el padre se vaya tranquilo. Se delata porque empieza a explicar lo que pasó en clase en vez de derivar, y termina prometiendo algo que después el Administrador tiene que desdecir.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'of-coa-6',
    curso: 'coach',
    orden: 19,
    roles: ['coach'],
    titulo: 'Asistencia, calendario en Drive y bitácora',
    duracionMin: 15,
    requiere: ['of-coa-5'],
    fuente: ['curso-4-coach.html#m7'],

    pfv: 'El registro de tu grupo al día: la asistencia marcada al instante con su leyenda de colores, el calendario en la clave del formato y la bitácora escrita clase por clase en el Drive del Centro.',

    voz: 'Este módulo no paga nada por sí solo, y sin él no se puede probar nada. <break time="0.5s"/> La asistencia se llena al instante de dar la clase. <break time="0.3s"/> No al final de la semana. No cuando llegues a la casa. Al instante. <break time="0.4s"/> Se marca con la leyenda de colores amarillo y rojo del formato. <break time="0.5s"/> El calendario va en clave. <break time="0.3s"/> Intro para la introducción. La letra S y el número para la semana. <break time="0.3s"/> R para los repasos. M D para el Mental Day. Y Cierre para el cierre de nivel. <break time="0.4s"/> La fecha va en día y mes: veintinueve barra cero ocho. <break time="0.5s"/> Y hay una obligación que se olvida sola. <break time="0.3s"/> Si un niño lleva dos faltas consecutivas, avisas a la Asistente Administrativa. <break time="0.3s"/> Dos. No tres. <break time="0.5s"/> La bitácora es diaria y vive en el Drive del Centro. <break time="0.3s"/> Es lo que te salva cuando un padre reclama tres meses después.',

    laminas: [
      {
        kicker: 'La regla dura',
        titulo: 'La asistencia se llena al instante',
        texto: 'Cada Coach llena la asistencia al instante de dar su clase, siguiendo la leyenda de colores amarillo y rojo colocada en el formato. No al final de la semana, no cuando llegue a la casa.',
      },
      {
        kicker: 'La clave del formato',
        titulo: 'Calendario y Asistencia, en clave',
        items: [
          'Introducción se escribe intro.',
          'Una semana: la letra S seguida del número de la semana.',
          'Repasos: R. Mental Day: MD. Cierres de nivel: Cierre.',
          'Fecha de la clase: día y mes, por ejemplo 29/08.',
          'Se divide por hoja: cada hoja lleva el nombre de un Coach y sus clases.',
        ],
      },
      {
        kicker: 'La obligación que se olvida',
        titulo: 'Dos faltas consecutivas, y avisas',
        texto: 'Es responsabilidad del Coach informar a la Asistente Administrativa en caso de dos faltas consecutivas de algún estudiante, para tomar las medidas necesarias.',
        cierre: 'Dos, no tres. Y es responsabilidad del Administrador hacer que esto se cumpla.',
      },
      {
        kicker: 'La bitácora',
        titulo: 'Diaria, y en el Drive del Centro',
        texto: 'Cada Coach lleva una Bitácora diaria de clases donde evalúa las aptitudes de cada niño y el conocimiento adquirido durante cada clase, y la comparte en el Drive entregado por el Administrador.',
        cierre: 'La imagen del formato de Clase de Reforzamiento firmada por el Coach va al portafolio de Class Dojo.',
      },
      {
        kicker: 'Por qué importa',
        titulo: 'Es lo que te salva tres meses después',
        texto: 'Si el niño no avanzó y tú lo escribiste clase por clase, el Centro tiene con qué responder. Si no lo escribiste, la conversación es tu palabra contra la del padre.',
        cierre: 'Y esa la pierde el Centro.',
      },
    ],

    sop: {
      proceso: 'Cerrar el registro de la clase del día',
      cuando: 'Al terminar cada clase, antes de salir del salón.',
      producto: 'La asistencia marcada al instante, el calendario en su clave y la bitácora del día escrita en el Drive del Centro.',
      pasos: [
        'Con el grupo todavía en el salón, marca la asistencia de cada niño.',
        'Usa la leyenda de colores amarillo y rojo que está en el formato.',
        'Anota la fecha de la clase en día y mes, por ejemplo 29/08.',
        'Escribe en el calendario lo que se dio, en su clave: intro, S y el número, R, MD o Cierre.',
        'Verifica que estás en tu hoja: cada hoja lleva el nombre de un Coach con sus clases.',
        'Revisa si algún niño acumula dos faltas consecutivas.',
        'Si las acumula, informa a la Asistente Administrativa ese mismo día.',
        'Escribe la bitácora del día: aptitudes de cada niño y conocimiento adquirido en la clase.',
        'Comparte la bitácora en el Drive entregado por el Administrador del Centro.',
        'Si hubo Clase de Reforzamiento, sube al portafolio de Class Dojo la imagen del formato firmado.',
      ],
      decide: [
        { situacion: 'Cuándo se llena la asistencia', regla: 'Al instante de dar la clase, con la leyenda de colores del formato. No al final de la semana ni en la casa.' },
        { situacion: 'Un niño llega a dos faltas consecutivas', regla: 'Avisas a la Asistente Administrativa. La segunda, no la tercera: el Administrador y ella hacen el seguimiento.' },
        { situacion: 'Dónde vive la bitácora', regla: 'En el Drive entregado por el Administrador del Centro, no en un cuaderno del salón ni en tu correo personal.' },
      ],
      errores: [
        'Llenar la asistencia de la semana el viernes, de memoria.',
        'Esperar a la tercera ausencia para avisar, o llamar tú al representante.',
        'Escribir la bitácora en un cuaderno del salón que nadie más puede leer.',
      ],
    },

    masa: [
      'El formato Calendario y Asistencia de tu grupo, abierto en el Drive.',
      'La leyenda de colores del formato, a la vista.',
      'La bitácora de tu grupo de la semana pasada.',
      'La lista real de tu grupo con las ausencias del mes.',
    ],

    palabras: [
      'calendario-y-asistencia',
      'bitacora',
      'drive',
      'mental-day',
      'dia-de-repaso',
      'clase-de-reforzamiento',
      'clase-de-reposicion',
      'class-dojo',
      'portafolio',
      'asistente-administrativo',
      'cierre-de-nivel',
      'coach',
    ],

    bloques: [
      { t: 'sub', texto: 'La asistencia de los niños' },
      { t: 'p', texto: 'Se debe llevar un registro de niños ausentes en cada grupo para cada clase. **Es responsabilidad del Coach informar a la Asistente Administrativa en caso de dos faltas consecutivas de algún estudiante**, para tomar las medidas necesarias. Y es responsabilidad del Administrador hacer que esto se cumpla.' },

      { t: 'sub', texto: 'El formato Calendario y Asistencia' },
      { t: 'p', texto: 'El calendario se coloca de manera resumida, con estos códigos:' },
      {
        t: 'tabla',
        encabezados: ['Se refiere a', 'Se escribe'],
        filas: [
          ['Introducción', 'intro'],
          ['Una semana', 'S seguido del número de la semana'],
          ['Repasos', 'R'],
          ['Mental Day', 'MD'],
          ['Cierres de nivel', 'Cierre'],
          ['Fecha de la clase', 'Día y mes. Por ejemplo, para el 29 de agosto se coloca 29/08'],
        ],
      },
      { t: 'p', texto: 'El formato también lleva el código de la clase, el día o los días y el horario. **Se divide por hoja: cada hoja debe tener el nombre de cada Coach con sus respectivas clases.**' },
      { t: 'nota', tono: 'regla', titulo: 'Al instante, y con la leyenda', texto: 'Cada Coach debe llenar la asistencia **al instante de dar su clase**, siguiendo la leyenda de colores amarillo y rojo colocada en el formato. No al final de la semana, no cuando llegue a la casa. Al instante.' },

      { t: 'sub', texto: 'Las dos ausencias que hay que avisar' },
      { t: 'p', texto: 'Tanto el Administrador como el Asistente Administrativo hacen seguimiento a los niños que han estado ausentes con mínimo dos clases. Y parte de tu responsabilidad es **avisar al Administrador y/o Asistente Administrativo cuando un niño lleva mínimo dos ausencias**. El correo al padre y la oferta de clase de reposición los hace la administración, no tú.' },

      { t: 'sub', texto: 'La bitácora diaria de clases' },
      { t: 'p', texto: 'Cada Coach debe llevar una **Bitácora diaria de clases**, donde evalúa las aptitudes de cada niño y el conocimiento adquirido durante cada clase. Los Coaches deben compartir esta información en el **DRIVE entregado por el Administrador del Centro**, para llevar un control y tener la información más detallada de cada niño.' },
      { t: 'p', texto: 'Además, se coloca en el portafolio de Class Dojo la **imagen del formato de Clase de Reforzamiento firmada por el Coach**.' },
      { t: 'nota', tono: 'ojo', titulo: 'La bitácora es lo que te salva', texto: 'Si un padre reclama tres meses después y el niño no avanzó, y tú lo escribiste clase por clase, el Centro tiene con qué responder. Si no lo escribiste, la conversación es tu palabra contra la del padre, y esa la pierde el Centro.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Uno de tus niños faltó el martes y el jueves. El siguiente martes tampoco llegó. Recién ahí te acordaste de avisar. Di en qué momento exacto debiste avisar, a quién, y qué se perdió el Centro por esas dos semanas de silencio.' },
    ],

    quiz: [
      {
        pregunta: '¿A partir de cuántas faltas consecutivas de un estudiante debe el Coach informar a la Asistente Administrativa?',
        opciones: [
          'Tres faltas consecutivas',
          'Dos faltas consecutivas',
          'Una falta',
          'Cuatro faltas en el mes',
        ],
        explicacion: 'Dos, no tres. Con ese aviso la administración envía el correo al padre y ofrece la clase de reposición.',
        repasa: ['asistente-administrativo'],
      },
      {
        pregunta: 'En el formato Calendario y Asistencia, ¿cómo se indica un Mental Day?',
        opciones: ['MD', 'M', 'MDay', 'D'],
        explicacion: 'La clave del formato es corta a propósito: intro, S con el número, R, MD y Cierre.',
        repasa: ['mental-day'],
      },
      {
        pregunta: 'En el formato Calendario y Asistencia, para referirse a una semana se coloca…',
        opciones: [
          'la palabra completa Semana',
          'la letra R seguida del número',
          'el número de la semana solo',
          'la letra S seguida del número de la semana',
        ],
        explicacion: 'La R es de repasos. La S con su número es la semana.',
        repasa: ['calendario-y-asistencia'],
      },
      {
        pregunta: 'En el formato Calendario y Asistencia, la letra R se usa para…',
        opciones: ['los recesos', 'las reposiciones', 'los repasos', 'los reforzamientos'],
        explicacion: 'Reposición y reforzamiento son clases aparte y tienen su propia plantilla.',
        repasa: ['dia-de-repaso'],
      },
      {
        pregunta: '¿Cuándo debe el Coach llenar la asistencia?',
        opciones: [
          'Al final de la semana',
          'Al instante de dar su clase',
          'Antes de empezar la clase',
          'Cuando lo solicite el Administrador',
        ],
        explicacion: 'Al instante, con la leyenda de colores del formato. Después se llena de memoria y deja de ser un registro.',
      },
      {
        pregunta: 'La asistencia en el formato de Drive se marca siguiendo una leyenda de colores amarillo y rojo.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'La leyenda viene colocada en el propio formato: no se inventa un código por Centro.',
      },
      {
        pregunta: 'El formato Calendario y Asistencia se divide por hoja, y cada hoja debe tener el nombre de cada Coach con sus respectivas clases.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Una hoja por Coach. Así el Centro puede leer el calendario de un grupo sin buscar entre todos.',
      },
      {
        pregunta: 'La bitácora que debe llevar el Coach es…',
        opciones: [
          'semanal, solo con la asistencia',
          'mensual, con el resumen del grupo',
          'diaria de clases, evaluando aptitudes de cada niño y el conocimiento adquirido en cada clase',
          'por nivel, al cerrar el grupo',
        ],
        explicacion: 'Diaria y por niño. Es lo que permite responderle a un padre tres meses después.',
        repasa: ['bitacora'],
      },
      {
        pregunta: '¿Dónde se comparte la bitácora del Coach?',
        opciones: [
          'En el grupo de WhatsApp del Centro',
          'En el DRIVE entregado por el Administrador del Centro',
          'En el cuaderno físico del salón',
          'En el correo personal del Coach',
        ],
        explicacion: 'En el Drive del Centro, para llevar el control y tener la información detallada de cada niño.',
        repasa: ['drive'],
      },
      {
        pregunta: 'Un niño lleva dos ausencias consecutivas. ¿Qué corresponde hacer?',
        opciones: [
          'Esperar a la tercera ausencia',
          'Llamar yo mismo al representante',
          'Notificar al Asistente Administrativo para que contacte al representante y ofrezca clase de reposición',
          'Anotarlo solo en la bitácora',
        ],
        explicacion: 'Tú avisas. El contacto con el padre y la oferta de reposición los hace la administración.',
        repasa: ['clase-de-reposicion'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Cerrar el registro sin salir del salón',
        fuente: 'curso-4-coach.html#m7',
        proposito: 'Que cierres el registro completo de una clase real antes de salir del salón: asistencia marcada, calendario en clave, ausencias revisadas y bitácora escrita en el Drive.',
        gradiente: 'Exige saber de memoria la clave del formato. Si todavía la miras, primero di en voz alta qué se escribe para introducción, semana, repaso, Mental Day y cierre, hasta que salga de corrido.',
        masa: [
          'El formato Calendario y Asistencia de tu grupo, abierto en el Drive.',
          'La lista real de tu grupo con las ausencias del mes.',
        ],
        pasos: [
          'Toma una clase real que acabas de dar y marca la asistencia de todos los niños.',
          'Escribe la fecha en día y mes, y lo que se dio en la clave del formato.',
          'Di en voz alta qué significa cada código que acabas de escribir.',
          'Recorre la lista y nombra a los niños que llegan a dos faltas consecutivas.',
          'Di a quién avisas, en qué momento y qué hace esa persona con tu aviso.',
          'Escribe la bitácora del día con las aptitudes de cada niño y lo que se aprendió.',
          'Muestra en pantalla dónde quedó guardada la bitácora.',
        ],
        criterios: [
          'Marca la asistencia con la leyenda de colores del formato, sin inventarse un código propio.',
          'Escribe la fecha y el código de la clase correctos, y explica cada uno sin mirar la tabla.',
          'Identifica por sí mismo al niño con dos ausencias y nombra a la Asistente Administrativa como destino del aviso.',
          'Deja la bitácora guardada en el Drive del Centro y la muestra en pantalla, no en un cuaderno.',
        ],
        errorTipico: 'Cerrar la asistencia de la semana el viernes de memoria. Se delata porque no puede decir qué día faltó cada niño, y el aviso de las dos ausencias llega cuando el niño ya lleva tres semanas fuera.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'of-coa-7',
    curso: 'coach',
    orden: 20,
    roles: ['coach'],
    titulo: 'La retroalimentación en sándwich',
    duracionMin: 20,
    requiere: ['of-coa-6'],
    fuente: ['curso-4-coach.html#m8'],

    pfv: 'La retroalimentación semanal de cada niño en su portafolio de Class Dojo, armada en sándwich, sin una sola frase negativa que no venga con su trabajaremos en ello.',

    voz: 'Dos frecuencias que no se confunden. <break time="0.4s"/> La evaluación en el libro es cada tres semanas de trabajo. <break time="0.3s"/> La retroalimentación a los niños es por semana. <break time="0.5s"/> Y va al portafolio de cada niño en su grupo de Class Dojo. <break time="0.4s"/> La estructura del sándwich es simple y no se negocia. <break time="0.3s"/> Abres con lo positivo. <break time="0.3s"/> En el medio pones lo que hay que trabajar. <break time="0.3s"/> Y cierras con confianza. <break time="0.5s"/> Se cumple siempre, incluso si el niño es excelente. <break time="0.3s"/> En ese caso dices por qué es excelente. <break time="0.5s"/> Y hay dos frases que no se escriben nunca. <break time="0.3s"/> No hizo la tarea. No se porta bien. <break time="0.3s"/> Se ve realmente feo y nos trae problemas con los padres. <break time="0.4s"/> Siempre que hables de una deficiencia, di que trabajaremos en ello. <break time="0.3s"/> Incluyéndote a ti, porque somos un equipo.',

    laminas: [
      {
        kicker: 'Dos frecuencias',
        titulo: 'Cada tres semanas y cada semana',
        items: [
          'Evaluación en el libro o el sistema indicado: cada 3 semanas de trabajo.',
          'Retroalimentación a los niños: por semana.',
          'Formato: PLANTILLA DE RETROALIMENTACIÓN A NIÑOS.',
          'Destino: el portafolio de cada niño en su grupo del app Class Dojo.',
        ],
      },
      {
        kicker: 'La estructura',
        titulo: 'Positivo, lo que hay que trabajar, confianza',
        texto: 'Se abre con lo positivo, en el medio va lo que hay que trabajar y se cierra con confianza. Es simple y no se negocia.',
        cierre: 'Se cumple siempre. Incluso si el niño es excelente: entonces dices por qué es excelente.',
      },
      {
        kicker: 'Cómo suena',
        titulo: 'Un sándwich armado, tal como queda',
        texto: 'Muy bien, siempre está dispuesto a participar y aprender. Se le complicaron los amigos menores en suma, seguiremos trabajando en ello. Tiene un gran potencial, vamos a desarrollarlo.',
        cierre: 'Las frases del banco no son obligatorias: hay muchas, y se usan de manera respetuosa.',
      },
      {
        kicker: 'Lo que nunca se escribe',
        titulo: 'NO HIZO LA TAREA y NO SE PORTA BIEN',
        texto: 'Se ve realmente feo y nos puede traer problemas con los padres. Siempre que hables de una deficiencia, di que trabajaremos en ello, incluyéndote como Coach, porque somos un equipo.',
      },
      {
        kicker: 'Lo que tienes que poder hacer',
        titulo: 'Tres niños, tres sándwiches, en una sentada',
        items: [
          'Escribir el de un niño excelente diciendo por qué lo es.',
          'Escribir el de un niño promedio sin frases de relleno.',
          'Escribir el del niño con dificultad sin una sola frase sin su solución.',
        ],
        cierre: 'Y subirlos al portafolio de cada uno en su grupo de Class Dojo.',
      },
    ],

    sop: {
      proceso: 'Escribir la retroalimentación semanal de un niño',
      cuando: 'Una vez por semana, por cada niño de tu grupo.',
      producto: 'El sándwich de la semana en el portafolio de Class Dojo del niño, sin una frase negativa suelta.',
      pasos: [
        'Abre la PLANTILLA DE RETROALIMENTACIÓN A NIÑOS y la bitácora de la semana.',
        'Elige la frase de inicio: algo real y positivo de esa semana, no una fórmula.',
        'Si el niño es excelente, di por qué lo es. El sándwich se cumple igual.',
        'Escribe en el medio lo que hay que trabajar, nombrando el contenido exacto.',
        'Acompaña cada deficiencia con lo que van a hacer: seguiremos trabajando en ello.',
        'Inclúyete como Coach en esa frase: somos un equipo.',
        'Cierra con una frase de confianza en el niño.',
        'Relee y borra cualquier frase que juzgue al niño sin ofrecer salida.',
        'Súbelo al portafolio de ese niño en su grupo del app Class Dojo.',
        'Si esta semana tocaba la evaluación en el libro, apunta también su resultado en la bitácora.',
      ],
      decide: [
        { situacion: 'El niño es excelente', regla: 'El sándwich se cumple igual: entonces se dice por qué es excelente, no se omite la estructura.' },
        { situacion: 'Quieres escribir NO HIZO LA TAREA o NO SE PORTA BIEN', regla: 'No se escribe. Se ve realmente feo y trae problemas con los padres. Se convierte en un vamos a trabajar en ello.' },
        { situacion: 'Las frases del banco no te encajan', regla: 'No son obligatorias. Hay muchas, y puedes escribir otras siempre que sean respetuosas y no causen impacto negativo en los padres.' },
      ],
      errores: [
        'Escribir una deficiencia sin decir qué van a hacer con ella.',
        'Copiar el mismo sándwich para todo el grupo cambiando el nombre.',
        'Dejar la retroalimentación para el cierre de nivel en vez de escribirla por semana.',
      ],
    },

    masa: [
      'La PLANTILLA DE RETROALIMENTACIÓN A NIÑOS, en blanco.',
      'El banco de frases de inicio, intermedias y de cierre, impreso.',
      'Class Dojo abierto en el portafolio de tres niños reales de tu grupo.',
      'Tu bitácora de la semana que vas a comentar.',
    ],

    palabras: [
      'sandwich-de-retroalimentacion',
      'plantilla-de-retroalimentacion',
      'class-dojo',
      'portafolio',
      'evaluacion',
      'practica-en-casa',
      'bitacora',
      'representante',
      'coach',
      'debilidad',
      'fortaleza',
    ],

    bloques: [
      { t: 'sub', texto: 'La evaluación de los niños' },
      { t: 'p', texto: '**Cada 3 semanas de trabajo en el libro** se realiza la evaluación en el libro o en cualquier sistema que se te indique, para que los padres puedan contar con el seguimiento del niño dentro del Programa.' },
      { t: 'p', texto: 'Como parte de la evaluación continua del Coach hacia los niños, debes realizar la retroalimentación **por semana**, bajo el formato **PLANTILLA DE RETROALIMENTACIÓN A NIÑOS**, colocándola en el portafolio de cada niño en su grupo del app **Class Dojo**.' },

      { t: 'sub', texto: 'El sándwich: cómo se arma' },
      { t: 'p', texto: 'La estructura es simple y no se negocia: **abres con lo positivo, pones en el medio lo que hay que trabajar, y cierras con confianza.**' },
      { t: 'p', texto: 'El banco del Manual tiene nueve frases para iniciar, **once** intermedias y ocho para culminar. Van completas: son las que ya están aprobadas y no le crean un problema al Centro.' },
      {
        t: 'tabla',
        titulo: 'El pan: con qué se abre y con qué se cierra',
        encabezados: ['Frases para iniciar', 'Frases para culminar'],
        filas: [
          ['Excelente, lo está haciendo fenomenal…', 'Sí se puede.'],
          ['Así se hace, maneja la técnica del ábaco de manera correcta…', 'Confiamos en que cada día lo hará mejor.'],
          ['Muy bien, siempre está dispuesto a participar y aprender…', 'Tiene un gran potencial, vamos a desarrollarlo.'],
          ['Cada día lo hace mejor…', 'Trabajaremos en ello y lograremos una gran mejoría.'],
          ['Ha tenido un gran avance…', 'Así se hace.'],
          ['Genial, buen comportamiento, disposición para trabajar, participación…', 'Sigue así y llegarás lejos.'],
          ['Con disciplina y esfuerzo siempre se puede llegar lejos…', 'Eres todo un niño ALOHA.'],
          ['Cada semana es un nuevo reto, y lo está superando de la mejor manera…', 'Cada día lo haces mejor.'],
          ['Buen trabajo…', ''],
        ],
      },
      { t: 'p', texto: 'Y el relleno, que es donde va lo que hay que trabajar. **Once**, no ocho: el banco del Manual se entrega entero o no se entrega.' },
      {
        t: 'lista',
        items: [
          'Es importante que recuerde practicar la semana (_).',
          'Se le complicó un poco los amigos menores en suma, por lo que seguiremos trabajando en ello.',
          'Se le complican los mentales, es importante que en casa se enfoque en practicar estos…',
          'Debemos seguir trabajando en el comportamiento, los mentales, los amigos menores o los amigos mayores…',
          'La concentración es la clave del éxito, vamos a seguir trabajando en ella.',
          'Hay que mejorar la disposición para trabajar, sí se puede…',
          'La disciplina es la clave del éxito, recuerda hacer tus prácticas en casa.',
          'La puntualidad es un factor muy importante, así no se pierde el JUEGO, recuerda que jugando también aprendemos.',
          'Vamos a trabajar en la participación, mientras más participemos más aprendemos y más amigos tendremos.',
          'Recuerda que las prácticas en casa son solo 10 minutos, pero traen muchísimos beneficios; te invito a realizarlas y verás el avance.',
          'Para hacerlo mejor, hay que comportarse mejor, así lograremos aprender de la mejor manera.',
        ],
      },

      { t: 'sub', texto: 'Sándwiches armados, tal como quedan' },
      {
        t: 'lista',
        items: [
          '"Muy bien, siempre está dispuesto a participar y aprender. Se le complicó un poco los amigos menores en suma (+4 y +3), por lo que seguiremos trabajando en ello. La disciplina es la clave del éxito, recuerda hacer las prácticas en casa. Tiene un gran potencial, vamos a desarrollarlo."',
          '"Excelente, lo está haciendo fenomenal, maneja la técnica del ábaco de manera correcta, buen comportamiento, disposición para trabajar, y participación. Sigue así y llegarás lejos."',
          '"Con disciplina y esfuerzo siempre se puede llegar lejos. La concentración es la clave del éxito, vamos a seguir trabajando en ella. Para hacerlo mejor, hay que comportarse mejor, así lograremos aprender de la mejor manera. Hay que mejorar la disposición para trabajar. Confiamos en que cada día lo hará mejor. Tiene un gran potencial, vamos a desarrollarlo."',
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'El sándwich se cumple SIEMPRE', texto: 'Incluso si el niño es excelente: entonces dices **por qué** es excelente. Las frases no son obligatorias, hay muchas, siempre y cuando se usen de manera respetuosa y no causen un impacto negativo en los padres.' },

      { t: 'sub', texto: 'Lo que nunca se escribe' },
      { t: 'nota', tono: 'alerta', titulo: 'NO HIZO LA TAREA y NO SE PORTA BIEN', texto: 'Poner eso **se ve realmente feo y nos puede traer problemas con los padres**. Siempre que hables de alguna deficiencia, di que trabajaremos en ello, incluyéndote como Coach, porque somos un equipo.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Un niño lleva tres semanas sin hacer las prácticas en casa y la mamá te va a leer en Class Dojo. Escribe el sándwich que sí puedes publicar. Después escribe la versión que NO puedes publicar y explica en una línea qué problema le crearía al Centro.' },
    ],

    quiz: [
      {
        pregunta: '¿Cada cuánto se realiza la evaluación en el libro o el sistema indicado?',
        opciones: [
          'Cada semana',
          'Cada mes calendario',
          'Cada 3 semanas de trabajo en el libro',
          'Solo al cierre de nivel',
        ],
        explicacion: 'Cada semana es la retroalimentación en Class Dojo, que es otra cosa. La evaluación en el libro va cada 3 semanas.',
        repasa: ['evaluacion'],
      },
      {
        pregunta: '¿Con qué frecuencia debe el Coach realizar la retroalimentación a los niños?',
        opciones: ['Cada tres semanas', 'Cada mes', 'Al cierre de nivel', 'Por semana'],
        explicacion: 'Semanal, con la PLANTILLA DE RETROALIMENTACIÓN A NIÑOS.',
        repasa: ['plantilla-de-retroalimentacion'],
      },
      {
        pregunta: '¿Dónde se coloca la retroalimentación de cada niño?',
        opciones: [
          'En el portafolio de cada niño en su grupo del app Class Dojo',
          'En la bitácora de clases',
          'En el formato de calendario y asistencia',
          'En el expediente físico del Centro',
        ],
        explicacion: 'En su portafolio, que es donde el padre la lee.',
        repasa: ['portafolio', 'class-dojo'],
      },
      {
        pregunta: '¿Cuál es la estructura del sándwich de retroalimentación?',
        opciones: [
          'Se abre con lo que falta y se cierra con lo positivo',
          'Se abre con lo positivo, en el medio va lo que hay que trabajar y se cierra con confianza',
          'Solo se escribe lo positivo',
          'Se alternan tres críticas y tres elogios',
        ],
        explicacion: 'Ese orden es el que hace que el padre lea la corrección sin sentirse atacado.',
        repasa: ['sandwich-de-retroalimentacion'],
      },
      {
        pregunta: 'Si el niño es excelente, se puede omitir el sándwich y escribir solo la nota.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'El sándwich se cumple siempre. Con un niño excelente, lo que se escribe es por qué es excelente.',
      },
      {
        pregunta: 'Escribir en la retroalimentación NO HIZO LA TAREA o NO SE PORTA BIEN…',
        opciones: [
          'es correcto porque es la verdad',
          'se permite si el padre ya fue advertido',
          'es obligatorio para dejar constancia',
          'se ve realmente feo y puede traer problemas con los padres',
        ],
        explicacion: 'La deficiencia se nombra, pero con lo que van a hacer con ella.',
      },
      {
        pregunta: 'Siempre que se habla de una deficiencia del niño, el Coach debe decir que trabajaremos en ello, incluyéndose como Coach, porque somos un equipo.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Esa palabra en plural es la que convierte una queja en un plan.',
      },
      {
        pregunta: '¿Cuál de estas es una frase intermedia válida del sándwich?',
        opciones: [
          'Su hijo no rinde en clase',
          'La concentración es la clave del éxito, vamos a seguir trabajando en ella',
          'No practica y por eso va mal',
          'Le recomiendo buscar otro programa',
        ],
        explicacion: 'Nombra lo que hay que trabajar y dice qué van a hacer. Las otras tres solo juzgan.',
      },
      {
        pregunta: 'Las frases sugeridas del sándwich son obligatorias y no se pueden cambiar.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Hay muchas y se pueden escribir otras, siempre que sean respetuosas y no causen impacto negativo en los padres.',
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Tres niños, tres sándwiches',
        fuente: 'curso-4-coach.html#m8',
        proposito: 'Que escribas la retroalimentación de tres niños reales de tu grupo, uno excelente, uno promedio y uno con dificultad, sin una sola frase negativa sin su trabajaremos en ello.',
        gradiente: 'Exige tener la bitácora de la semana escrita: sin ella no hay con qué armar la primera frase. Si la bitácora está en blanco, esa es la maniobra anterior, no esta.',
        masa: [
          'La PLANTILLA DE RETROALIMENTACIÓN A NIÑOS, en blanco.',
          'El banco de frases impreso, boca abajo sobre la mesa.',
          'Tu bitácora de la semana y los tres niños elegidos.',
        ],
        pasos: [
          'Elige tres niños reales de tu grupo: uno excelente, uno promedio y uno con dificultad.',
          'Escribe el sándwich completo del primero, con el banco de frases boca abajo.',
          'Léelo en voz alta a tu jefe entrenador y di cuál es la parte positiva, cuál la del medio y cuál el cierre.',
          'Repite con el segundo y con el tercero.',
          'Tu jefe entrenador te dicta una frase prohibida y tú la reescribes como sándwich.',
          'Sube los tres al portafolio de cada niño en su grupo de Class Dojo.',
        ],
        criterios: [
          'Escribe los tres sándwiches completos, con las tres partes reconocibles en cada uno.',
          'Nombra el contenido exacto que hay que trabajar y no una queja general sobre el niño.',
          'Acompaña cada deficiencia con la frase de trabajo conjunto, incluyéndose como Coach.',
          'Reescribe la frase prohibida sin perder la información que el padre necesita saber.',
          'Deja los tres publicados en el portafolio del niño, no en la bitácora ni en un cuaderno.',
        ],
        errorTipico: 'Escribir el mismo sándwich para los tres cambiando el nombre. Se delata porque ninguna de las frases del medio nombra un contenido concreto, y el padre que compara con otro padre se da cuenta el mismo día.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'of-coa-8',
    curso: 'coach',
    orden: 21,
    roles: ['coach'],
    titulo: 'El niño que no avanza: reforzamiento y reposición',
    duracionMin: 20,
    requiere: ['of-coa-7'],
    fuente: ['curso-4-coach.html#m9'],

    pfv: 'El niño que se traba, detectado a tiempo y con la clase que le toca en marcha: el caso reportado al Administrador, los tres requisitos verificados y la plantilla solicitada por la vía correcta.',

    voz: 'Aquí hay dos clases que se parecen y no son lo mismo. <break time="0.5s"/> El reforzamiento es para el niño que asiste bien y no está comprendiendo. <break time="0.3s"/> La reposición es para el niño que faltó a una clase con contenido nuevo. <break time="0.4s"/> Y las da gente distinta. <break time="0.3s"/> La reposición sí la puede dar el Coach del niño. <break time="0.3s"/> El reforzamiento no: lo da otro, para que otra voz explique lo mismo de otra manera. <break time="0.5s"/> Tres requisitos para que proceda el reforzamiento. <break time="0.3s"/> Tres asistencias consecutivas. <break time="0.3s"/> Sin Clase de Repaso siguiente a la petición. <break time="0.3s"/> Y el representante paz y salvo. <break time="0.5s"/> Quien autoriza es el Administrador de Centro. <break time="0.3s"/> Tú solicitas y reportas. <break time="0.4s"/> Y queda prohibido abordar un tema delicado solo con los padres. <break time="0.3s"/> Sin excepción. Ni aunque la mamá te pregunte en la puerta.',

    laminas: [
      {
        kicker: 'Primero el informe',
        titulo: 'Reporte de situaciones especiales',
        texto: 'Para abordar un tema específico de un niño, el Coach hace un informe para que el Administrador, en conjunto contigo, busque las mejores herramientas y alternativas para la situación.',
        cierre: 'Queda prohibido para el Coach abordar un tema delicado solo con los padres. Sin excepción.',
      },
      {
        kicker: 'Quién hace qué',
        titulo: 'La Clase de Reforzamiento',
        items: [
          'Solicita: el Coach y/o el Administrador.',
          'Autoriza: el Administrador de Centro.',
          'La solicita al padre y coordina: el Asistente Administrativo.',
          'Costo para el padre: ninguno. Pero sí se le paga al Coach que la imparte.',
        ],
        cierre: 'Preferiblemente no la da el Coach del niño: otra voz explica lo mismo de otra manera.',
      },
      {
        kicker: 'Los tres requisitos',
        titulo: 'Sin los tres, no procede',
        items: [
          'El niño debe tener tres asistencias consecutivas.',
          'El niño no debe tener Clase de Repaso siguiente a la petición.',
          'El representante debe estar paz y salvo.',
        ],
        cierre: 'Si no está paz y salvo, lo llama el Asistente Administrativo para informárselo.',
      },
      {
        kicker: 'No es lo mismo',
        titulo: 'Reposición contra reforzamiento',
        items: [
          'Reposición: el niño faltó a una clase con contenido nuevo.',
          'Reforzamiento: el niño asiste pero no comprende.',
          'La reposición sí la puede dictar el mismo Coach del niño.',
          'La reposición cuesta B/.25.00 y el cobro lo maneja la administración.',
        ],
      },
      {
        kicker: 'Lo que tienes que poder hacer',
        titulo: 'Decidir si procede, y con qué papel',
        items: [
          'Decir cuál de las dos clases necesita el niño, y por qué.',
          'Verificar los tres requisitos antes de pedir nada.',
          'Llenar la plantilla y entregarla por la vía correcta.',
        ],
        cierre: 'Y mientras tanto, reforzar dentro de la clase: eso no necesita autorización de nadie.',
      },
    ],

    sop: {
      proceso: 'Activar el reforzamiento de un niño que no avanza',
      cuando: 'Apenas detectes que un niño no está cumpliendo las expectativas de avance. Nunca a último momento.',
      producto: 'El caso reportado, los tres requisitos verificados y la clase solicitada por su plantilla.',
      pasos: [
        'Comunica al Administrador el caso que presenta la dificultad, con el informe de situaciones especiales.',
        'Mientras tanto, refuerza con el niño dentro de tu propia clase. Eso no requiere autorización.',
        'El Administrador observa al niño en clase para tener referencia de su comportamiento y su manejo de la técnica.',
        'Verifica los tres requisitos: tres asistencias consecutivas, sin Clase de Repaso siguiente y representante paz y salvo.',
        'Confirma con el Administrador desde qué semana procede en tu Centro. El Manual trae dos versiones.',
        'Si hace falta reforzamiento fuera del horario regular, solicítalo al Asistente Administrativo con la plantilla correspondiente.',
        'El Asistente ubica a los Coaches con el nivel requerido y disponibilidad, y se lo comunica al Administrador.',
        'El Administrador decide qué Coach es el más conveniente por sus aptitudes y personalidad.',
        'El Asistente confirma la hora y fecha con el representante y con el Coach designado, con mínimo 1 día de anticipación.',
        'Sube al portafolio de Class Dojo la imagen del formato de Clase de Reforzamiento firmada por el Coach.',
        'Si lo que el niño necesita es reposición porque faltó, pídesela al Asistente: esa sí la puedes dar tú.',
      ],
      decide: [
        { situacion: 'Autorizar la Clase de Reforzamiento', regla: 'El Administrador de Centro. Tú solicitas y reportas; el Asistente Administrativo la coordina con el padre.' },
        { situacion: 'Quién da el reforzamiento', regla: 'Lo decide el Administrador por aptitudes y personalidad. Preferiblemente no la da el Coach del niño; la reposición sí puede darla él.' },
        { situacion: 'Un tema delicado del niño', regla: 'Queda prohibido para el Coach abordarlo solo con los padres. Sin excepción y sin conversación rápida en la puerta.' },
      ],
      errores: [
        'Ofrecerle la clase al padre antes de que el Administrador la autorice.',
        'Pedir reforzamiento para un niño que lo que tiene son ausencias: eso es reposición.',
        'Esperar a la semana del examen para reportar que el niño no avanza.',
      ],
    },

    masa: [
      'El REPORTE DE SITUACIONES ESPECIALES en blanco.',
      'La PLANTILLA CLASE DE REPOSICIÓN Y REFORZAMIENTO en blanco.',
      'La asistencia y la bitácora del niño del que vas a hablar.',
      'El calendario del grupo, para ver si hay Clase de Repaso siguiente.',
    ],

    palabras: [
      'clase-de-reforzamiento',
      'clase-de-reposicion',
      'clase-de-repaso',
      'reporte-de-situaciones-especiales',
      'paz-y-salvo',
      'representante',
      'asistente-administrativo',
      'administrador-de-centro',
      'class-dojo',
      'portafolio',
      'junta-directiva',
      'coach',
    ],

    bloques: [
      { t: 'sub', texto: 'Informes de casos especiales' },
      { t: 'p', texto: 'De requerir abordar un tema específico de un niño, el Coach debe realizar un **informe** para que el Administrador del Centro, en conjunto contigo, busque las mejores herramientas y alternativas para abordar la situación, con el objetivo de ser efectivos y solucionarla para beneficio de todas las partes: niño, padre, Coach y Centro. El formato es el **REPORTE DE SITUACIONES ESPECIALES**.' },
      { t: 'nota', tono: 'alerta', titulo: 'Un tema delicado no se aborda a solas', texto: 'Queda prohibido para el Coach abordar un tema delicado solo con los padres. Sin excepción, sin "es que la mamá me preguntó", sin "fue rapidito en la puerta".' },

      { t: 'sub', texto: 'Los tres requisitos de la Clase de Reforzamiento' },
      { t: 'p', texto: 'Están diseñadas para aquellos niños que, **a pesar de que su asistencia sea excelente**, no están comprendiendo un contenido importante para su correcto seguimiento dentro del Programa. Cuando un niño no está cumpliendo las expectativas de avance, el Coach lo notifica al Administrador de Centro, quien en primera instancia se involucra observando al niño en clase. Luego, de considerarse necesario, **el Administrador autoriza** la Clase de Reforzamiento.' },
      {
        t: 'tabla',
        encabezados: ['Quién hace qué', 'Rol'],
        filas: [
          ['Solicita', 'El Coach y/o el Administrador'],
          ['Autoriza', 'El Administrador de Centro'],
          ['La solicita al padre y coordina', 'El Asistente Administrativo'],
          ['Costo para el padre', 'Ninguno. Pero la clase sí es pagada al Coach que la imparte'],
        ],
      },
      {
        t: 'lista',
        items: [
          'El niño debe tener **tres asistencias consecutivas**.',
          'El niño **no debe tener Clase de Repaso** siguiente a la petición.',
          'El representante debe estar **paz y salvo**. De no ser así, el Asistente Administrativo llama al representante para informarle que el Coach y/o Administrador considera necesaria la clase y que, para llevarse a cabo, debe estar paz y salvo.',
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva: desde qué semana procede', texto: 'El Manual trae dos versiones de la misma regla. La sección del Administrador de Centro dice que en KIDS procede posterior a la **2.ª semana** de libro y en Tiny Tots posterior a la **semana 2**; la del Asistente Administrativo dice posterior a la **3.ª semana** en KIDS y posterior a la **semana 4** en Tiny Tots. La sección del Coach no trae el dato. Como quien autoriza es el Administrador de Centro, **confirma con él a partir de qué semana procede en tu Centro** y no la des por sabida. Hasta que la Junta Directiva defina cuál rige, conoce las dos y no elijas por tu cuenta.' },

      { t: 'sub', texto: 'El paso a paso de la solicitud' },
      {
        t: 'pasos',
        items: [
          'El Coach comunica al Administrador el caso que presenta la dificultad.',
          'El Administrador observa el caso y atiende al niño dentro de su misma clase en la medida de lo posible, buscando el reforzamiento inmediato.',
          'Si se requiere reforzamiento personalizado fuera del horario regular, el Coach hace partícipe al Administrador y solicita al Asistente Administrativo, **por medio de la plantilla correspondiente**, dicha Clase de Reforzamiento.',
          'El Asistente Administrativo ubica a los Coaches que tienen el nivel requerido y la disponibilidad, y se lo comunica al Administrador.',
          'El Administrador decide qué Coach es el más conveniente, tomando en cuenta sus aptitudes y personalidad.',
          'El Asistente Administrativo confirma con el Coach elegido su disponibilidad para la hora y fecha coordinada con el padre.',
          'El horario y la fecha se coordinan de manera que convengan tanto al padre de familia como al Coach del Centro.',
          'El Asistente Administrativo confirma con **mínimo 1 día de anticipación** la hora y fecha, tanto con el representante como con el Coach designado.',
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'Dos cosas que se olvidan', texto: 'La Clase de Reforzamiento la puede dar un Coach o el Administrador, y el Manual pide que **preferiblemente no la dé el Coach del niño**. La idea es que otra voz explique lo mismo de otra manera.' },

      { t: 'sub', texto: 'Reposición no es reforzamiento' },
      { t: 'p', texto: 'La reposición es para el niño que **faltó** a una o varias clases con contenido nuevo; el reforzamiento es para el niño que **asiste pero no comprende**.' },
      {
        t: 'lista',
        items: [
          'El Coach notifica al Asistente Administrativo si un niño tiene **2 ausencias**, con el fin de enviar correo a los padres y ofrecerles clase de reposición.',
          'Si un niño faltó a una clase importante, el Coach le solicita al Asistente Administrativo una clase de reposición. **Esta clase sí puede ser dictada por el mismo Coach del niño.**',
          'La reposición tiene un costo de **B/.25.00** y su inasistencia debe notificarse con mínimo **2 horas de anticipación** para no incurrir en el recargo. El precio y el cobro los maneja la administración, no tú.',
          'Lo óptimo es que el niño asista con mínimo tres días antes de su clase, para que pueda practicar. Si va a faltar varias semanas, es mejor darle la reposición antes de que se vaya.',
        ],
      },
      { t: 'p', texto: 'El formato es la **PLANTILLA CLASE DE REPOSICIÓN Y REFORZAMIENTO**. Y recuerda que la imagen del formato de Clase de Reforzamiento firmada por el Coach va al portafolio de Class Dojo.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Un niño de tu grupo asiste a todo, se porta bien, y lleva cuatro semanas trancado con los amigos menores. La mamá está paz y salvo y el niño tiene repaso la semana que viene. ¿Procede la Clase de Reforzamiento? Justifica con los tres requisitos y di qué haces mientras tanto.' },
    ],

    quiz: [
      {
        pregunta: 'La Clase de Reforzamiento está diseñada para el niño que…',
        opciones: [
          'faltó a varias clases con contenido nuevo',
          'quiere adelantar el nivel siguiente',
          'necesita practicar para el Campeonato',
          'a pesar de tener excelente asistencia no está comprendiendo un contenido importante',
        ],
        explicacion: 'El que faltó necesita reposición, que es otra clase, con otro costo y otro Coach posible.',
        repasa: ['clase-de-reforzamiento'],
      },
      {
        pregunta: '¿Quién autoriza la Clase de Reforzamiento?',
        opciones: [
          'El Coach del niño',
          'El Asistente Administrativo',
          'El Administrador de Centro',
          'El representante',
        ],
        explicacion: 'El Coach solicita, el Asistente coordina con el padre y el Administrador autoriza.',
        repasa: ['administrador-de-centro'],
      },
      {
        pregunta: '¿Cuál es el costo de la Clase de Reforzamiento para el padre?',
        opciones: [
          'Tiene el mismo costo que una clase de reposición',
          'No tiene costo para el padre, pero sí es pagada al Coach que la imparte',
          'La paga el padre y no se le paga al Coach',
          'Es gratis y tampoco se le paga al Coach',
        ],
        explicacion: 'Para el padre es gratuita. Para el Centro no: la clase se le paga a quien la da.',
      },
      {
        pregunta: '¿Cuántas asistencias consecutivas debe tener el niño para que se le otorgue una Clase de Reforzamiento?',
        opciones: [
          'Tres asistencias consecutivas',
          'Dos asistencias consecutivas',
          'Cuatro asistencias consecutivas',
          'No hay requisito de asistencia',
        ],
        explicacion: 'Es el primero de los tres requisitos, y es lo que distingue al que no entiende del que no viene.',
      },
      {
        pregunta: 'Uno de los requisitos para otorgar la Clase de Reforzamiento es que el niño no tenga Clase de Repaso siguiente a la petición.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Si el repaso viene, ahí se refuerza. La clase extra se reserva para cuando no hay esa oportunidad.',
        repasa: ['clase-de-repaso'],
      },
      {
        pregunta: 'Si el representante no está paz y salvo, ¿qué ocurre con la Clase de Reforzamiento?',
        opciones: [
          'Se realiza igual y se cobra después',
          'Se cancela definitivamente el caso',
          'El Asistente Administrativo lo llama para informarle que se considera necesaria y que para llevarse a cabo debe estar paz y salvo',
          'La autoriza el Coach por excepción',
        ],
        explicacion: 'La llamada la hace el Asistente Administrativo, no tú.',
        repasa: ['paz-y-salvo'],
      },
      {
        pregunta: '¿Con cuánta anticipación mínima debe confirmarse la Clase de Reforzamiento con el representante y con el Coach designado?',
        opciones: [
          'Mínimo 3 días de anticipación',
          'Mínimo 1 día de anticipación',
          'Mínimo 2 horas de anticipación',
          'El mismo día',
        ],
        explicacion: 'Las 2 horas son el plazo para avisar la inasistencia a una reposición, que es otra cosa.',
      },
      {
        pregunta: '¿Quién no debe dar la Clase de Reforzamiento de un niño?',
        opciones: [
          'El Coach del niño',
          'El Administrador de Centro',
          'Un Coach con el nivel requerido',
          'Cualquier Coach disponible del Centro',
        ],
        explicacion: 'La idea es que otra voz explique lo mismo de otra manera.',
      },
      {
        pregunta: 'La Clase de Reposición es para el niño que faltó a una o varias clases con contenido nuevo, y puede ser dictada por el mismo Coach del niño.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Aquí sí puedes darla tú. En el reforzamiento, preferiblemente no.',
        repasa: ['clase-de-reposicion'],
      },
      {
        pregunta: '¿Cuál es el costo de la Clase de Reposición?',
        opciones: ['B/.15.00', 'B/.25.00', 'No tiene costo', 'B/.35.00'],
        explicacion: 'El precio y el cobro los maneja la administración, no el Coach.',
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — ¿Procede o no procede?',
        fuente: 'curso-4-coach.html#m9',
        proposito: 'Que ante un niño que no avanza digas cuál de las dos clases le toca, verifiques los tres requisitos con el papel delante y entregues la solicitud por la vía correcta.',
        gradiente: 'Exige distinguir de memoria reforzamiento de reposición. Si todavía se te mezclan, primero di en voz alta a quién va cada una y quién puede darla, hasta que salga sin pensarlo.',
        masa: [
          'La asistencia y la bitácora de tres niños reales de tu grupo.',
          'El calendario del grupo, para ver si viene Clase de Repaso.',
          'La PLANTILLA CLASE DE REPOSICIÓN Y REFORZAMIENTO en blanco.',
        ],
        pasos: [
          'Tu jefe entrenador te da el primer caso: niño con asistencia perfecta y trancado en un contenido.',
          'Di cuál de las dos clases le corresponde y por qué.',
          'Verifica los tres requisitos en voz alta, señalando dónde se comprueba cada uno.',
          'Segundo caso: niño con dos ausencias. Di qué le corresponde y quién puede dársela.',
          'Tercer caso: niño con asistencia perfecta pero con repaso la semana siguiente. Decide.',
          'Llena la plantilla del caso que sí procede y di a quién se la entregas.',
          'Di qué haces mientras tanto con el niño, dentro de tu propia clase.',
        ],
        criterios: [
          'Separa reposición de reforzamiento en los tres casos, sin equivocarse ni una vez.',
          'Verifica los tres requisitos señalando el documento donde se comprueba cada uno.',
          'Dice que el Administrador autoriza y que el Asistente Administrativo coordina con el padre.',
          'Reconoce que él mismo no debe dar el reforzamiento de su niño, pero sí la reposición.',
          'Nombra lo que hace mientras tanto: reforzar dentro de su propia clase, sin esperar autorización.',
        ],
        errorTipico: 'Prometerle la clase al padre antes de que el Administrador la autorice. Se delata porque habla de fechas con la mamá antes de haber entregado la plantilla, y después el Centro tiene que desdecirlo.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'of-coa-9',
    curso: 'coach',
    orden: 22,
    roles: ['coach'],
    titulo: 'La estructura de clase y el calendario',
    duracionMin: 15,
    requiere: ['of-coa-8'],
    fuente: ['curso-4-coach.html#m10'],

    pfv: 'La clase completa cada vez: los diez pasos cumplidos, la ficha de Campeonato cada dos clases desde la semana 4 y el calendario del nivel respetado sin recortes.',

    voz: 'El Programa tiene una estructura que debe cumplirse en cada una de las clases. <break time="0.4s"/> Son diez pasos, y no son un menú. <break time="0.5s"/> Juego de entrada. Dojo Kun. <break time="0.3s"/> La actividad, donde se hacen dos de tres entre flashcard, dictado de número y test de velocidad. <break time="0.3s"/> Repaso de la semana anterior. El trabajo del calendario. Orales. <break time="0.3s"/> Revisión de libros. Juego final. Recordatorio de próximas actividades. <break time="0.3s"/> Y el pasaporte de salida. <break time="0.5s"/> Cada dos clases se sustituye una actividad por una ficha de Campeonato. <break time="0.3s"/> Empezando después de la semana cuatro de entrenamiento. <break time="0.4s"/> Y el calendario no es tuyo: es del nivel. <break time="0.3s"/> Si te adelantas o te saltas un Mental Day, el grupo llega al examen incompleto. <break time="0.4s"/> Si vas atrasado, se avisa. No se recorta.',

    laminas: [
      {
        kicker: 'La estructura',
        titulo: 'Los diez pasos de toda clase ALOHA',
        items: [
          'Juego de entrada. ALOHA Dojo Kun.',
          'Actividad: Flashcard, Dictado de número y Test de velocidad. Hacer 2 de 3.',
          'Repaso de la semana anterior. Trabajo respectivo al calendario. Orales.',
          'Revisión de libros: clase y práctica en casa de la semana anterior.',
          'Juego final. Recordatorio de próximas actividades. Pasaporte de salida.',
        ],
      },
      {
        kicker: 'Lo que se sustituye',
        titulo: 'La ficha de Campeonato cada dos clases',
        texto: 'Cada dos clases se sustituye una actividad por una ficha de Campeonato, iniciando después de la semana 4 de entrenamiento. Se reemplaza una de las tres actividades del paso 3.',
        cierre: 'No es un extra para cuando sobra tiempo: es parte de la estructura.',
      },
      {
        kicker: 'La planificación',
        titulo: 'El calendario no es tuyo, es del nivel',
        texto: 'Las clases y la programación están estructuradas y deben ser respetadas. De requerir cambios, deben ser consultados y aprobados por el Administrador del Centro.',
        cierre: 'La planificación y el calendario se te entregan con el contrato y viven en Drive compartido.',
      },
      {
        kicker: 'Si vas atrasado',
        titulo: 'Se avisa, no se recorta',
        texto: 'Si te adelantas una semana o te saltas un Mental Day, el grupo llega al examen con contenido incompleto, el Cierre de Nivel se cae y quien queda mal frente a los padres es el Centro.',
      },
      {
        kicker: 'Lo que tienes que poder hacer',
        titulo: 'Dar la clase entera, incluso apurado',
        items: [
          'Nombrar los diez pasos en orden, sin leerlos.',
          'Decir cuáles dos actividades del paso 3 vas a hacer hoy y por qué.',
          'Saber en qué semana del calendario está tu grupo hoy.',
        ],
        cierre: 'Y pedir el ajuste al Administrador antes de tocar la planificación.',
      },
    ],

    sop: {
      proceso: 'Correr la clase completa y sostener el calendario',
      cuando: 'En cada clase, y cada vez que el grupo se atrase respecto del calendario.',
      producto: 'La clase con sus diez pasos cumplidos, la ficha de Campeonato en su turno y el calendario del nivel al día o su ajuste aprobado.',
      pasos: [
        'Abre con el juego de entrada y el ALOHA Dojo Kun.',
        'Haz dos de las tres actividades: Flashcard, Dictado de número o Test de velocidad.',
        'Si toca ficha de Campeonato, sustituye con ella una de esas tres actividades.',
        'Repasa la semana anterior antes de entrar en contenido nuevo.',
        'Trabaja lo que manda el calendario del grupo para esta clase, ni más ni menos.',
        'Haz los orales.',
        'Revisa los libros: la clase y la práctica en casa de la semana anterior.',
        'Cierra con el juego final y el recordatorio de próximas actividades.',
        'Termina con el pasaporte de salida ALOHA.',
        'Anota en el calendario lo que se dio y compáralo con lo planificado.',
        'Si el grupo quedó atrasado, avísale al Administrador y pide el ajuste de la planificación.',
      ],
      decide: [
        { situacion: 'Cambiar la programación o el calendario', regla: 'Los cambios deben ser consultados y aprobados por el Administrador del Centro, antes de realizarlos.' },
        { situacion: 'Vas atrasado dos semanas', regla: 'Se avisa y se pide el ajuste. No se recorta contenido ni se eliminan pasos de la estructura.' },
        { situacion: 'Cuándo empieza la ficha de Campeonato', regla: 'Cada dos clases, iniciando después de la semana 4 de entrenamiento, sustituyendo una actividad del paso 3.' },
      ],
      errores: [
        'Quitar el juego de entrada y el juego final para recuperar tiempo.',
        'Saltarse un Mental Day: el grupo llega al examen con contenido incompleto.',
        'Dejar la ficha de Campeonato para cuando sobre tiempo.',
      ],
    },

    masa: [
      'El calendario y la planificación de tu grupo, abiertos en el Drive.',
      'Los diez pasos de la estructura de clase, impresos.',
      'Las fichas de Campeonato del nivel que estás dando.',
      'El libro del nivel, en la semana que toca hoy.',
    ],

    palabras: [
      'dojo-kun',
      'flashcards',
      'dictado-de-numeros',
      'test-de-velocidad',
      'orales',
      'pasaporte-de-salida',
      'ficha-de-campeonato',
      'mental-day',
      'practica-en-casa',
      'cierre-de-nivel',
      'drive',
      'administrador-de-centro',
    ],

    bloques: [
      { t: 'sub', texto: 'Los diez pasos de toda clase ALOHA' },
      { t: 'p', texto: 'El Programa ALOHA cuenta con una estructura que debe cumplirse en **cada una** de las clases:' },
      {
        t: 'tabla',
        encabezados: ['#', 'Paso'],
        filas: [
          ['1', 'Juego de entrada'],
          ['2', 'ALOHA Dojo Kun'],
          ['3', 'Actividad: Flashcard, Dictado de número y Test de velocidad. Hacer 2 de 3'],
          ['4', 'Repaso de la semana anterior'],
          ['5', 'ALOHA: trabajo respectivo al calendario'],
          ['6', 'Orales'],
          ['7', 'Revisión de libros: clase y práctica en casa de la semana anterior'],
          ['8', 'Juego final'],
          ['9', 'Recordatorio de próximas actividades'],
          ['10', 'Pasaporte de salida ALOHA'],
        ],
      },

      { t: 'sub', texto: 'La ficha de Campeonato cada dos clases' },
      { t: 'nota', tono: 'regla', titulo: 'Es parte de la estructura, no un extra', texto: 'Cada dos clases se debe sustituir una actividad por una **ficha de Campeonato**, **iniciando después de la semana 4 de entrenamiento**. Lo que se reemplaza es una de las tres actividades del paso 3: dictado de números, flashcards o test de velocidad. No es un extra para cuando sobra tiempo.' },

      { t: 'sub', texto: 'El calendario no es tuyo, es del nivel' },
      { t: 'p', texto: 'Las clases y la programación **están estructuradas y deben ser respetadas**. De requerir cambios, deben ser consultados y aprobados por el Administrador del Centro. Recuerda que la planificación y el calendario del grupo se te entregan con el contrato, viven en Drive compartido, y cualquier cambio se notifica al Administrador **antes** de realizarlo.' },

      { t: 'sub', texto: 'Si vas atrasado' },
      { t: 'nota', tono: 'ojo', titulo: 'Se avisa, no se recorta', texto: 'Si te adelantas una semana o te saltas un Mental Day, el grupo llega al examen con contenido incompleto, el Cierre de Nivel se cae y quien queda mal frente a los padres es el Centro. Si vas atrasado, se avisa; no se recorta.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Vas retrasado dos semanas con el libro porque tuviste dos clases cortas por actividades del local. Se te ocurre saltarte el juego de entrada y el juego final durante un mes para recuperar. Di si puedes hacerlo, con qué norma lo justificas o lo descartas, y cuál es la vía correcta.' },
    ],

    quiz: [
      {
        pregunta: '¿Cuántos pasos tiene la estructura de clase del Programa ALOHA?',
        opciones: ['8', '10', '12', '6'],
        explicacion: 'Del juego de entrada al pasaporte de salida, y los diez se cumplen en cada clase.',
      },
      {
        pregunta: '¿Cuál es el primer paso de la estructura de clase?',
        opciones: [
          'Juego de entrada',
          'ALOHA Dojo Kun',
          'Repaso de la semana anterior',
          'Revisión de libros',
        ],
        explicacion: 'El Dojo Kun es el segundo. La clase abre jugando.',
        repasa: ['dojo-kun'],
      },
      {
        pregunta: 'En el paso de Actividad, ¿qué corresponde hacer?',
        opciones: [
          'Las tres actividades siempre',
          'Solo Flashcard',
          'Solo Test de velocidad',
          'Dos de las tres actividades entre Flashcard, Dictado de número y Test de velocidad',
        ],
        explicacion: 'Dos de tres. Y cada dos clases una de ellas se sustituye por la ficha de Campeonato.',
        repasa: ['flashcards', 'test-de-velocidad'],
      },
      {
        pregunta: '¿Cuál es el último paso de la estructura de clase?',
        opciones: [
          'Juego final',
          'Recordatorio de próximas actividades',
          'Pasaporte de salida ALOHA',
          'Revisión de libros',
        ],
        explicacion: 'El pasaporte de salida cierra la clase, después del recordatorio.',
        repasa: ['pasaporte-de-salida'],
      },
      {
        pregunta: '¿Cada cuántas clases se debe sustituir una actividad por una ficha de Campeonato?',
        opciones: ['Cada clase', 'Cada dos clases', 'Cada cuatro clases', 'Solo en semana de repaso'],
        explicacion: 'Cada dos clases, iniciando después de la semana 4 de entrenamiento.',
        repasa: ['ficha-de-campeonato'],
      },
      {
        pregunta: 'Las clases y la programación están estructuradas y deben ser respetadas.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'De requerir cambios, se consultan y los aprueba el Administrador del Centro.',
      },
      {
        pregunta: 'Si el Coach necesita cambiar la programación, esos cambios…',
        opciones: [
          'los decide el Coach y luego los informa',
          'los aprueba el Master Coach',
          'se pueden hacer si el grupo va atrasado',
          'deben ser consultados y aprobados por el Administrador del Centro',
        ],
        explicacion: 'Ir atrasado no autoriza a recortar: autoriza a pedir el ajuste.',
      },
      {
        pregunta: 'La revisión de libros incluye la clase y la práctica en casa de la semana anterior.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es el paso 7, y es donde se ve si la práctica en casa se está haciendo.',
        repasa: ['practica-en-casa'],
      },
      {
        pregunta: 'El ALOHA Dojo Kun forma parte de la estructura obligatoria de cada clase.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es el paso 2, y no es decoración del salón: son los cinco principios del estudiante.',
        repasa: ['dojo-kun'],
      },
      {
        pregunta: 'Vas atrasado dos semanas con el calendario del grupo. ¿Qué corresponde?',
        opciones: [
          'Eliminar los juegos de entrada y de salida para recuperar',
          'Saltar el Mental Day',
          'Consultar con el Administrador y que él apruebe el ajuste de la planificación',
          'Adelantar contenido en casa por Class Dojo',
        ],
        explicacion: 'Los diez pasos no se recortan y el Mental Day tampoco. Se avisa y se ajusta.',
        repasa: ['mental-day'],
      },
    ],

    drills: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'of-coa-10',
    curso: 'coach',
    orden: 23,
    roles: ['coach'],
    titulo: 'Cierre de Nivel',
    duracionMin: 20,
    requiere: ['of-coa-9'],
    fuente: ['curso-4-coach.html#m11'],

    pfv: 'El Cierre montado completo: la demostración repartida por técnica y ensayada desde el último Mental Day, los certificados y reconocimientos entregados, y los padres saliendo con la encuesta y con ganas del siguiente nivel.',

    voz: 'El Cierre de Nivel existe por tres razones. <break time="0.4s"/> Mostrar a los padres lo que los niños aprendieron. <break time="0.3s"/> Incentivar la inscripción al siguiente nivel. <break time="0.3s"/> Y preparar a los niños para presentar sus habilidades en el futuro. <break time="0.5s"/> Se practica desde el último Mental Day y el repaso de examen. <break time="0.3s"/> No el día antes. <break time="0.4s"/> La demostración se reparte por técnica, para que todos se luzcan. <break time="0.3s"/> Con ocho niños de Kids: dos con manos, dos con ábaco, dos mentales y dos leyendo flashcards. <break time="0.5s"/> Se dicta a la velocidad que los niños están acostumbrados a escuchar. <break time="0.3s"/> Y se dice la palabra YA para que respondan al unísono. <break time="0.5s"/> Dos cosas que se olvidan. <break time="0.3s"/> Antes de terminar, pide a los padres que respondan la encuesta de satisfacción. <break time="0.3s"/> Y no se abren grupos de WhatsApp del salón. Ni por esta vez.',

    laminas: [
      {
        kicker: 'Para qué existe',
        titulo: 'Las tres razones del Cierre',
        items: [
          'Mostrar a los padres los logros alcanzados en el nivel.',
          'Incentivar la inscripción al siguiente nivel.',
          'Preparar a los niños para presentaciones futuras de sus habilidades.',
        ],
        cierre: 'Se practica con los niños a partir del último Mental Day y del repaso de examen.',
      },
      {
        kicker: 'El reparto',
        titulo: 'Por técnica, para que todos se luzcan',
        items: [
          'Con 8 estudiantes de Kids: 2 cálculo con manos.',
          '2 cálculo con ábaco.',
          '2 cálculos mentales.',
          '2 demostración de lectura de Flashcard.',
        ],
        cierre: 'La logística queda a criterio del Coach y del espacio que tenga.',
      },
      {
        kicker: 'El dictado',
        titulo: 'A la máxima velocidad conocida, y YA',
        texto: 'La metodología del dictado es la misma de las clases: se dicta la operación a la máxima velocidad que los niños estén acostumbrados a escuchar, y se dice la palabra YA para que respondan al unísono.',
      },
      {
        kicker: 'La entrega',
        titulo: 'Certificados y reconocimientos',
        items: [
          'Certificados de Nivel, nombrando una fortaleza de cada niño.',
          'Reconocimiento de asistencia al 100 %.',
          'Reconocimiento de prácticas en casa al 100 %.',
          'Reconocimientos especiales: perseverancia y excelencia.',
          'Y la encuesta de satisfacción, antes de finalizar.',
        ],
      },
      {
        kicker: 'Lo que tienes que poder hacer',
        titulo: 'Montarlo sin improvisar el último día',
        items: [
          'Repartir las técnicas de tu grupo real por nombre.',
          'Decir desde cuándo lo vienes ensayando y en qué clases.',
          'Nombrar los reconocimientos que vas a entregar y a quién.',
        ],
        cierre: 'Y no abrir un grupo de WhatsApp del salón, ni para las fotos.',
      },
    ],

    sop: {
      proceso: 'Montar y correr el Cierre de Nivel',
      cuando: 'Desde el último Mental Day y el repaso de examen, hasta la Clase 3 del cierre.',
      producto: 'El Cierre corrido completo: demostración por técnica, certificados y reconocimientos entregados y la encuesta de satisfacción pedida.',
      pasos: [
        'Desde el último Mental Day y el repaso de examen, ensaya la demostración dentro de las clases.',
        'Reparte a los niños por técnica según la cantidad del grupo, para que todos se luzcan.',
        'Programa la mejor posición de mesas y sillas para el salón, y que así sea siempre.',
        'Abre la presentación dando las gracias por permitir entrenar a los niños durante el nivel.',
        'Explica lo que aprendieron, las técnicas enseñadas y sus objetivos.',
        'Menciona lo que aprenderán en el siguiente nivel, para reforzar la importancia de seguir.',
        'Inicia la demostración. Dicta a la velocidad que conocen y di YA para que respondan al unísono.',
        'Entrega los Certificados de Nivel nombrando una fortaleza de cada niño, junto con su dulce.',
        'Entrega los reconocimientos de asistencia al 100 por ciento, prácticas en casa al 100 por ciento, perseverancia y excelencia.',
        'Toma las fotos y cierra con un brindis o un detalle pequeño para los niños.',
        'Antes de finalizar, pide a los padres que respondan la encuesta de satisfacción enviada al correo y al WhatsApp.',
      ],
      decide: [
        { situacion: 'Quién hace cada técnica en la demostración', regla: 'Lo decide el Coach: se escoge por técnica a los mejores, con el fin de que todos los niños se luzcan.' },
        { situacion: 'Abrir un grupo de WhatsApp con los padres del salón', regla: 'No se abre. La encuesta llega al correo y al WhatsApp de cada representante desde el Centro.' },
        { situacion: 'Es tu primer Cierre de Nivel', regla: 'Debes haber asistido antes como observador a un Cierre de Nivel. Es el paso 4 de tu entrenamiento.' },
      ],
      errores: [
        'Ensayar la demostración la semana del cierre en vez de desde el último Mental Day.',
        'Poner a los mejores en todo y dejar a dos niños sin salir.',
        'Terminar sin pedir la encuesta de satisfacción a los padres.',
      ],
    },

    masa: [
      'El Protocolo de Cierre de Nivel del Manual, impreso.',
      'La lista real de tu grupo con la técnica más fuerte de cada niño.',
      'Los Certificados de Nivel y los reconocimientos en blanco.',
      'El salón con las mesas y sillas como van a quedar el día del cierre.',
    ],

    palabras: [
      'cierre-de-nivel',
      'certificado-de-nivel',
      'mental-day',
      'flashcards',
      'abaco',
      'calculo-mental',
      'encuesta-de-satisfaccion',
      'representante',
      'desercion',
      'kids',
      'matricula',
      'fortaleza',
    ],

    bloques: [
      { t: 'sub', texto: 'Para qué existe el Cierre de Nivel' },
      {
        t: 'lista',
        items: [
          'Mostrar a los padres lo que los niños han aprendido en el nivel, es decir, los logros alcanzados.',
          '**Incentivar la inscripción al siguiente nivel**, reforzando el compromiso con el Programa.',
          'Preparar a los niños para que realicen presentaciones futuras de sus habilidades: entrevistas, televisión, etcétera.',
        ],
      },
      { t: 'p', texto: 'Los Cierres de Grupos son muy importantes y deben tener planificación. Se practican con los niños a partir del **último Mental Day** y del **repaso de examen**. Se deben cumplir todos los puntos del Protocolo de Cierre de Nivel.' },

      { t: 'sub', texto: 'El reparto por técnica' },
      { t: 'p', texto: 'Se prepara a los niños para presentar a sus padres una demostración de operaciones utilizando **diferentes técnicas**, para demostrar la amplitud de herramientas trabajadas en clase. Las operaciones se hacen en grupo, dividiendo a los niños según la cantidad. Por ejemplo, con un grupo de 8 estudiantes se podría preparar:' },
      {
        t: 'tabla',
        encabezados: ['Cuántos', 'Para qué'],
        filas: [
          ['2', 'Cálculo con manos (caso de Kids)'],
          ['2', 'Cálculo con ábaco'],
          ['2', 'Cálculos mentales'],
          ['2', 'Demostración de lectura de Flashcard'],
        ],
      },
      { t: 'p', texto: 'La logística de la demostración queda **a criterio del Coach** y al espacio que tenga. La metodología del dictado es la misma de las clases: se dicta la operación a la máxima velocidad que los niños estén acostumbrados a escuchar, y se dice la palabra **YA** para que al unísono los niños den el resultado.' },
      { t: 'nota', tono: 'regla', titulo: 'Ensayado, no improvisado', texto: 'Todos los Cierres de Nivel deben estar practicados durante las semanas de clases. Cada clase debe ser también una preparación para que los niños estén acostumbrados a responder al unísono. Y el Coach, como parte de su entrenamiento, **debe asistir como observador a un Cierre de Nivel antes de hacer el suyo por primera vez**.' },

      { t: 'sub', texto: 'Los ocho pasos de la presentación' },
      {
        t: 'pasos',
        items: [
          'Programa la mejor posición para las mesas y sillas con respecto a cada salón, **y que así sea siempre**.',
          'El Coach realiza la presentación, dando las gracias por permitir entrenar a los niños durante el periodo del nivel.',
          'Explica todo lo que los niños aprendieron en clase, las técnicas enseñadas y sus objetivos: el Flashcard estimula la memoria de corto plazo y la memoria fotográfica; el ábaco estimula la coordinación viso motora, promueve la atención y la concentración y maximiza la comprensión numérica; el cálculo mental facilita la creación de nuevas conexiones neuronales.',
          'Menciona lo que los niños aprenderán **en el siguiente nivel**, para reforzar la importancia de seguir con los entrenamientos.',
          'Inicia la demostración de los niños. Se escoge **por técnica a los mejores**, con el fin de que todos los niños se luzcan.',
          'Entrega los **Certificados de Nivel**, intentando nombrar alguna fortaleza de cada niño al llamarlo, junto con su dulce. Se toman fotos y se puede culminar con un pequeño brindis o un detallito para los niños.',
          'Entrega los reconocimientos de **asistencia al 100 %**, **prácticas en casa al 100 %** y reconocimientos especiales como **perseverancia** y **excelencia**, basándote en el desempeño que tuvo cada niño en el Nivel.',
          'Antes de finalizar, pide a los padres que respondan la **encuesta de satisfacción** enviada al correo y al WhatsApp.',
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'No se pueden abrir grupos de WhatsApp', texto: 'La encuesta llega al correo y al WhatsApp de cada representante desde el Centro. Tú no armas un grupo del salón, ni para el cierre, ni para las fotos, ni "solo por esta vez".' },

      { t: 'sub', texto: 'El número que mide si los niños se quedan' },
      { t: 'p', texto: 'Este es el módulo donde tu producto se ve. Tu producto no es la fiesta del cierre: son **los niños que llegan al Cierre y se inscriben en el siguiente nivel**. El KPI del Centro lleva ese número por Coach. **Tú no lo ves en pantalla**: vive en el Resumen del Centro, que tu cuenta no abre. Te llega hablado, en la reunión con tu Administradora — y por eso conviene que sepas exactamente qué mide antes de que te lo pongan delante.' },
      {
        t: 'tabla',
        encabezados: ['Qué hace la alerta de deserción por Coach', 'Cómo lo hace'],
        filas: [
          ['De qué niños habla', 'De los retiros del trimestre, llegando al Coach por el grupo del niño'],
          ['A quién NO cuenta', 'Al niño graduado. Graduar es el trabajo bien hecho y jamás cuenta como falta tuya'],
          ['Qué motivos mira', 'Los que el aula sí controla: pérdida de clases, técnica y horario'],
          ['Contra qué te compara', 'Contra tu propio Centro, no contra un umbral de manual ni contra otro Centro'],
          ['Cuándo se emite', 'Solo con los cuatro candados: 15 niños expuestos, 3 bajas, razón de 1,5 veces y 3 niños de exceso'],
          ['Qué se te dice', 'El dato y su brecha: "son 5 niños de más". Nunca un juicio sobre ti'],
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Esto es del KPI, no del Manual', texto: 'El Manual **no** le fija al Coach una meta de deserción ni una prima por retención. Tus dos palancas de dinero siguen siendo el bono de puntualidad y la asignación de grupos por los cinco criterios. La alerta es un instrumento del sistema para saber dónde mirar, con cuatro candados puestos justamente para no señalar a nadie por ruido. Si alguna vez aparece tu nombre, lo que se abre es una conversación con el Administrador sobre qué se puede corregir, no una sanción.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Es tu primer Cierre de Nivel. Tienes 6 niños, dos de ellos flojos en mentales, y la mamá de uno te pidió que su hijo "haga algo bonito". Arma el reparto de técnicas, di qué reconocimientos vas a entregar y explica qué hiciste durante las semanas previas para que este día no sea una improvisación.' },
    ],

    quiz: [
      {
        pregunta: '¿Cuál de estos es un objetivo del Cierre de Nivel?',
        opciones: [
          'Incentivar la inscripción al siguiente nivel, reforzando el compromiso con el Programa',
          'Comparar el rendimiento de los niños entre grupos',
          'Recaudar el pago de las mensualidades pendientes',
          'Evaluar al Coach frente a los padres',
        ],
        explicacion: 'Es la segunda de las tres razones, y es la que convierte el cierre en la matrícula del nivel siguiente.',
        repasa: ['cierre-de-nivel', 'matricula'],
      },
      {
        pregunta: '¿A partir de qué momento se practican los Cierres de Nivel con los niños?',
        opciones: [
          'En la primera semana del nivel',
          'A partir del último Mental Day y el repaso de examen',
          'El mismo día del cierre',
          'A partir de la semana 4',
        ],
        explicacion: 'La semana 4 es cuando empieza la ficha de Campeonato, que es otra cosa.',
        repasa: ['mental-day'],
      },
      {
        pregunta: 'En un grupo de 8 estudiantes de Kids, el reparto sugerido de técnicas es…',
        opciones: [
          '4 con ábaco y 4 mentales',
          'todos hacen las cuatro técnicas',
          '2 con manos, 2 con ábaco, 2 mentales y 2 en lectura de Flashcard',
          '8 mentales, que es lo más vistoso',
        ],
        explicacion: 'El reparto por técnica demuestra la amplitud de herramientas y deja que todos se luzcan.',
        repasa: ['abaco', 'flashcards'],
      },
      {
        pregunta: '¿Cuál es la palabra que se dice para que los niños den el resultado al unísono?',
        opciones: ['AHORA', 'ALOHA', 'LISTO', 'YA'],
        explicacion: 'Es la misma metodología del dictado de las clases, por eso se ensaya todo el nivel.',
      },
      {
        pregunta: 'El Coach debe asistir como observador a un Cierre de Nivel antes de hacer el suyo por primera vez.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es el paso 4 del proceso de entrenamiento con el Master Coach.',
      },
      {
        pregunta: '¿Cómo se escogen los niños para la demostración?',
        opciones: [
          'Se escoge solo a los tres mejores del grupo',
          'Por técnica se escoge a los mejores, con el fin de que todos los niños se luzcan',
          'Se escoge al azar el mismo día',
          'Los escogen los padres',
        ],
        explicacion: 'Cada niño sale en la técnica en la que está más fuerte. Nadie se queda sentado.',
      },
      {
        pregunta: '¿Cuáles reconocimientos entrega el Coach en el Cierre de Nivel?',
        opciones: [
          'Solo el certificado de nivel',
          'Primer, segundo y tercer lugar del grupo',
          'Asistencia al 100 por ciento, prácticas en casa al 100 por ciento y reconocimientos especiales como perseverancia y excelencia',
          'Un reconocimiento al mejor promedio',
        ],
        explicacion: 'No hay podio: no hay lugar para las comparaciones entre compañeros.',
        repasa: ['practica-en-casa'],
      },
      {
        pregunta: 'Antes de finalizar el Cierre de Nivel se le pide a los padres que respondan la encuesta de satisfacción enviada al correo y al WhatsApp.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es el octavo paso de la presentación, y la envía el Centro, no tú.',
        repasa: ['encuesta-de-satisfaccion'],
      },
      {
        pregunta: 'Para coordinar mejor el Cierre de Nivel, el Coach puede abrir un grupo de WhatsApp con los padres del salón.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'No se abren grupos del salón: ni para el cierre, ni para las fotos, ni por esta vez.',
      },
      {
        pregunta: 'La logística de la demostración del Cierre de Nivel queda…',
        opciones: [
          'definida por el corporativo para todos los centros',
          'a criterio del Asistente Administrativo',
          'a criterio del Coach y al espacio que tenga para realizar las demostraciones',
          'definida por los padres el mismo día',
        ],
        explicacion: 'La logística es tuya. Lo que no es negociable son los ocho pasos de la presentación.',
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Montar el Cierre de tu grupo real',
        fuente: 'curso-4-coach.html#m11',
        proposito: 'Que armes el Cierre de tu grupo real con nombre y apellido: reparto por técnica, orden de la presentación, reconocimientos por niño y la encuesta pedida al final.',
        gradiente: 'Exige haber asistido antes como observador a un Cierre de Nivel. Si todavía no has visto uno, esa es la maniobra: ir a mirar. Esta viene después.',
        masa: [
          'La lista real de tu grupo con la técnica más fuerte de cada niño.',
          'Los Certificados de Nivel y los reconocimientos en blanco.',
          'El Protocolo de Cierre de Nivel, impreso.',
        ],
        pasos: [
          'Reparte a los niños de tu grupo por técnica, diciendo el nombre de cada uno y por qué va ahí.',
          'Comprueba en voz alta que ningún niño se queda sin salir.',
          'Di los ocho pasos de la presentación en orden, sin leerlos.',
          'Ensaya el dictado con tu jefe entrenador haciendo de grupo, incluyendo la palabra YA.',
          'Nombra qué reconocimiento le entregas a cada niño y con qué fortaleza lo vas a llamar.',
          'Di desde cuándo lo vienes ensayando y en qué clases lo metiste.',
          'Cierra diciendo qué le pides a los padres antes de que se vayan.',
        ],
        criterios: [
          'Reparte a todo el grupo por técnica y demuestra que ningún niño se queda sentado.',
          'Nombra los ocho pasos de la presentación en orden y sin leerlos.',
          'Ejecuta el dictado a la velocidad que el grupo conoce y da la señal para la respuesta al unísono.',
          'Dice una fortaleza distinta y verdadera para cada niño al entregar su certificado.',
          'Recuerda pedir la encuesta de satisfacción sin que su jefe entrenador se lo sugiera.',
        ],
        errorTipico: 'Dejar el ensayo para la semana del cierre y repartir por técnica el mismo día. Se delata porque los niños no responden al unísono y dos se quedan sin salir, y los padres se van sin ver a su hijo hacer nada.',
      },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'of-coa-11',
    curso: 'coach',
    orden: 24,
    roles: ['coach'],
    titulo: 'Exámenes y el niño que no pasó',
    duracionMin: 18,
    requiere: ['of-coa-10'],
    fuente: ['curso-4-coach.html#m12'],

    pfv: 'El examen del grupo aplicado en sus tres clases, las notas subidas al Drive y notificadas, y cada niño con el certificado que le corresponde sin que ningún padre se entere el mismo día del cierre.',

    voz: 'El examen y el cierre van en tres clases. <break time="0.4s"/> En la primera, repaso general y arranque del examen, empezando por los orales. <break time="0.3s"/> En la segunda se culmina, y ahí lo presenta el que faltó a la primera. <break time="0.3s"/> En la tercera se ultiman detalles y se hace el Cierre de Nivel. <break time="0.5s"/> El cierre administrativo tiene un paso que se olvida. <break time="0.3s"/> Los exámenes se entregan a la Administración, las notas se suben al Drive, <break time="0.3s"/> y se notifica que ya están en la plataforma. <break time="0.4s"/> Subirlas y no avisar cuenta como no haberlas subido. <break time="0.5s"/> Y el error caro de este módulo es el tiempo. <break time="0.3s"/> Esto no se hace a último momento. <break time="0.4s"/> Apenas veas que al niño se le dificulta el contenido, refuerzas dentro de la clase y lo reportas. <break time="0.3s"/> Si lo dejas para la clase del examen, el padre se entera el día del cierre. <break time="0.3s"/> Y ahí ya no queda margen para hacer nada.',

    laminas: [
      {
        kicker: 'El calendario',
        titulo: 'El examen y el cierre van en tres clases',
        items: [
          'Clase 1: repaso general y comienzo del examen, iniciando con los orales.',
          'Clase 2: se culmina el examen. El que faltó lo presenta este día.',
          'Clase 3: detalles, certificados firmados, operaciones y Cierre de Nivel.',
          'En Tiny, el Coach explica gráficamente en el pizarrón cómo se hace cada parte.',
        ],
      },
      {
        kicker: 'El paso que se olvida',
        titulo: 'Subir las notas y avisar',
        texto: 'Los exámenes del grupo se entregan a la Administración del Centro, las notas se suben al DRIVE y se notifica que ya están en la plataforma.',
        cierre: 'Subirlas y no avisar cuenta como no haberlas subido.',
      },
      {
        kicker: 'El que no pasa',
        titulo: 'Certificado de Participación, y sigue en el cierre',
        texto: 'Si el Coach prevé que el niño no pasará, notifica con tiempo al Administrador que ese certificado es de Participación, no de culminación y cumplimiento.',
        cierre: 'El niño igualmente realiza la Presentación de Cierre de Nivel con su grupo.',
      },
      {
        kicker: 'Si tampoco pasa la reválida',
        titulo: 'Repetir el nivel, con dos opciones',
        items: [
          'Antes de repetir el examen, un repaso de lo que específicamente no comprendió.',
          'Si no pasa, repite el Nivel con un grupo completamente nuevo.',
          'O sigue en su grupo trabajando su Nivel mientras los demás avanzan: clase multinivel.',
          'El Administrador te pide información del progreso del niño en otras áreas.',
        ],
      },
      {
        kicker: 'El error caro',
        titulo: 'Esto no se hace a último momento',
        texto: 'Apenas veas que al niño se le dificulta el contenido, se refuerza dentro de la clase, se reporta al Administrador y se le hace seguimiento.',
        cierre: 'Si lo dejas para la clase del examen, el padre se entera el día del cierre y ya no hay margen.',
      },
    ],

    sop: {
      proceso: 'Aplicar el examen y cerrar el caso del niño que no pasó',
      cuando: 'En las tres clases del examen y el cierre, y desde mucho antes con el niño que se traba.',
      producto: 'El examen aplicado y calificado, las notas en el Drive y notificadas, y cada niño con el certificado que le corresponde.',
      pasos: [
        'Trabaja la metodología del examen clases antes, para ir preparando al grupo.',
        'En Tiny, explica gráficamente en el pizarrón cómo debe realizarse cada parte.',
        'Clase 1: haz un repaso general y comienza el examen, iniciando con los orales.',
        'Clase 2: culmina el examen. Si un niño faltó a la clase pasada, lo presenta este día.',
        'Durante el examen, observa el desenvolvimiento del niño que venías siguiendo.',
        'Si prevés que no pasará, notifica con tiempo al Administrador que su certificado es de Participación.',
        'Ese niño igualmente hace la Presentación de Cierre de Nivel con su grupo.',
        'Califica. Si un niño no pasa, notifica al Administrador para que él y el Asistente escriban al padre.',
        'Antes de repetir el examen, dale un repaso de lo que específicamente no comprendió.',
        'Si con repaso y reválida tampoco pasa, propón al Administrador grupo nuevo o clase multinivel.',
        'Clase 3: revisa que los Certificados estén completos y firmados, y realiza el Cierre de Nivel.',
        'Entrega los exámenes a la Administración, sube las notas al Drive y notifica que ya están.',
      ],
      decide: [
        { situacion: 'Comunicar al padre que el niño no pasó', regla: 'Lo hace el Administrador junto con el Asistente Administrativo, por correo. Tú notificas al Administrador.' },
        { situacion: 'Que el certificado sea de Participación', regla: 'Se notifica con tiempo al Administrador al momento de hacer los Certificados de Cierre de Nivel, no el mismo día.' },
        { situacion: 'El niño flojo que falta mucho y no practica', regla: 'El Coach valora si es rescatable y, si justifica que es mejor repetir el Nivel, lo notifica al Administrador para que tome las medidas.' },
      ],
      errores: [
        'Reportar al niño con dificultad la semana del examen.',
        'Subir las notas al Drive y no notificar que ya están en la plataforma.',
        'Decirle tú al padre que su hijo no pasó.',
      ],
    },

    masa: [
      'El examen del nivel que estás cerrando y su hoja de respuestas.',
      'Los Certificados de Nivel y de Participación en blanco.',
      'El Drive del Centro donde se suben las notas, abierto.',
      'La bitácora del niño que venías siguiendo por dificultad.',
    ],

    palabras: [
      'examen-de-nivel',
      'certificado-de-nivel',
      'certificado-de-participacion',
      'revalida',
      'repeticion-de-nivel',
      'clase-multinivel',
      'clase-de-reforzamiento',
      'dia-de-repaso',
      'orales',
      'drive',
      'tiny-tots',
      'las-tres-clases-de-cierre',
    ],

    bloques: [
      { t: 'sub', texto: 'Las tres clases del examen' },
      {
        t: 'tabla',
        encabezados: ['Clase', 'Qué se hace'],
        filas: [
          ['Clase 1', 'El Coach realiza un repaso general y procede a comenzar el Examen, iniciando con los orales y luego dejando que los niños realicen el resto.'],
          ['Clase 2', 'Se culmina el Examen. Si un niño faltó a la clase pasada, realiza el examen este día.'],
          ['Clase 3', 'Ultimar detalles, revisar que los Certificados estén completos y firmados por el Coach si lo amerita, preparar operaciones para la Presentación a los Padres y realizar el Cierre de Nivel.'],
        ],
      },
      { t: 'p', texto: 'La metodología del Examen debe ser trabajada **clases antes** para ir preparando al grupo. En el caso de los Tiny, el Coach debe **explicar gráficamente, utilizando el pizarrón**, cómo debe realizarse cada parte del examen.' },

      { t: 'sub', texto: 'Cierre administrativo del examen' },
      { t: 'nota', tono: 'regla', titulo: 'Subir y avisar son dos pasos', texto: 'Los exámenes del grupo se entregan a la Administración del Centro, las notas se suben al **DRIVE** y **se notifica que ya están en la plataforma**. Subirlas y no avisar cuenta como no haberlas subido.' },

      { t: 'sub', texto: 'El niño que no pasó: Certificado de Participación' },
      {
        t: 'pasos',
        items: [
          'Cuando a un niño se le dificulta la comprensión del contenido, el Coach debe intentar reforzar con él dentro de la clase e igualmente reportar la situación al Administrador de Centro. **Esto no se hace a último momento**: se le hace seguimiento, por ejemplo con Clase de Reforzamiento o reforzando en días de repaso. Si aun así el contenido no se absorbe, el Administrador va teniendo un acercamiento con el representante.',
          'Si a pesar del seguimiento el contenido se le sigue dificultando, al momento de hacer los Certificados de Cierre de Nivel el Coach debe **notificar con tiempo al Administrador que ese certificado es de Participación**, no de culminación y cumplimiento.',
          'Durante el examen, el Coach observa el desenvolvimiento del niño. Si considera que no pasará, confirma la entrega del **Certificado de Participación**. **El niño igualmente realiza la Presentación de Cierre de Nivel con su grupo.**',
          'Al calificar, si el niño no pasa, el Coach notifica al Administrador para que este, junto con el Asistente Administrativo, envíe un correo al padre diciendo que el niño no pasó y debe repetirlo; antes de eso debe repasar el contenido, la **reválida**.',
          'Lo óptimo al repetir el examen es que el niño reciba **un repaso de lo que específicamente no comprendió** antes de volver a presentarlo.',
          'Si el niño tuvo repaso, repitió el examen y no lo pasó, **debe repetir el Nivel**, con dos opciones: que repita el Nivel con un grupo completamente nuevo, o que siga en su grupo trabajando el Nivel que necesita repetir mientras los demás avanzan al siguiente, convirtiendo la clase en **multinivel**.',
          'Otro caso es el niño **flojo**: no hace entrenamiento en casa, falta mucho. El Coach debe ver si el niño es rescatable, es decir, si tiene probabilidades de pasar la repetición del examen, y analizar qué es mejor para él. Si considera de manera justificada que es mejor que repita el Nivel, lo notifica al Administrador para que tome las medidas.',
          'Si el niño debe repetir el Nivel, el Administrador se comunica con el Coach para obtener información sobre **el progreso del niño en otras áreas**: si no se ven resultados directamente en la técnica, sí puede haber avance en otras áreas, y con eso se habla con el representante.',
        ],
      },

      { t: 'sub', texto: 'El error caro de este protocolo es el tiempo' },
      { t: 'nota', tono: 'alerta', titulo: 'Esto no se debe hacer a último momento', texto: 'El Manual no fija una semana, pero sí fija la regla. Apenas veas que al niño se le dificulta el contenido, se refuerza dentro de la clase, se le reporta y se le hace seguimiento, para que el Administrador pueda ir teniendo un acercamiento con el representante. Si lo dejas para la clase del examen, el padre se entera el mismo día del Cierre y ya no queda margen para hacer nada.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Estás calificando y dos niños no pasaron. Uno asistió a todo y se esforzó; el otro faltó siete clases y nunca practicó en casa. Di qué certificado le corresponde a cada uno, quién le escribe al padre, qué se hace antes de repetir el examen, y qué le propones al Administrador para cada caso si tampoco pasan la segunda vez.' },
    ],

    quiz: [
      {
        pregunta: '¿En cuántas clases se divide el Examen y Cierre de Nivel?',
        opciones: ['Dos clases', 'Cuatro clases', 'Una sola clase', 'Tres clases'],
        explicacion: 'Comienzo del examen, culminación, y detalles más Cierre de Nivel.',
        repasa: ['las-tres-clases-de-cierre'],
      },
      {
        pregunta: '¿Qué se hace en la Clase 1 del examen?',
        opciones: [
          'Culminar el examen y entregar certificados',
          'Solo repasar, sin examen',
          'Un repaso general y luego comenzar el examen iniciando con los orales',
          'Realizar el Cierre de Nivel',
        ],
        explicacion: 'Los orales van primero, y después los niños hacen el resto.',
        repasa: ['orales'],
      },
      {
        pregunta: 'Un niño faltó a la Clase 1 del examen. ¿Cuándo lo presenta?',
        opciones: [
          'En la Clase 3, junto con el cierre',
          'En la Clase 2, que es para culminar el examen',
          'En una clase de reposición pagada',
          'Pierde el examen y repite nivel',
        ],
        explicacion: 'La Clase 2 es justamente donde se culmina el examen del grupo.',
      },
      {
        pregunta: '¿Qué hace el Coach con los exámenes y las notas del grupo?',
        opciones: [
          'Los guarda en su carpeta personal',
          'Solo entrega los exámenes físicos',
          'Sube las notas al DRIVE sin avisar a nadie',
          'Entrega los exámenes a la Administración del Centro, sube las notas al DRIVE y notifica que ya están en la plataforma',
        ],
        explicacion: 'Son tres pasos, y el tercero es el que se olvida: subirlas y no avisar cuenta como no haberlas subido.',
        repasa: ['drive'],
      },
      {
        pregunta: 'Cuando el Coach prevé que un niño no pasará el examen, ¿qué certificado corresponde?',
        opciones: [
          'Certificado de culminación y cumplimiento igual que los demás',
          'Ningún certificado',
          'Certificado de Participación, notificando con tiempo al Administrador',
          'Certificado condicionado hasta el próximo nivel',
        ],
        explicacion: 'Con tiempo, al momento de hacer los certificados, no el día del cierre.',
        repasa: ['certificado-de-participacion'],
      },
      {
        pregunta: 'El niño que recibirá Certificado de Participación queda fuera de la Presentación de Cierre de Nivel.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Hace la presentación con su grupo igual que todos. El certificado es otra cosa.',
      },
      {
        pregunta: 'Cuando un niño no pasa el examen, ¿quién comunica al padre que debe repetirlo?',
        opciones: [
          'El Administrador, junto con el Asistente Administrativo, por correo',
          'El Coach directamente al padre',
          'El Master Coach',
          'Nadie, se entera en el cierre',
        ],
        explicacion: 'Tú notificas al Administrador. El contacto con el padre es de él.',
      },
      {
        pregunta: 'Antes de repetir el examen, lo óptimo es que el niño…',
        opciones: [
          'lo presente de inmediato para no perder tiempo',
          'pase directo al siguiente nivel',
          'cambie de Coach',
          'reciba un repaso de lo que específicamente no comprendió',
        ],
        explicacion: 'Repetir el mismo examen sin haber repasado lo que falló no cambia el resultado.',
        repasa: ['revalida'],
      },
      {
        pregunta: 'Si el niño tuvo repaso, repitió el examen y no lo pasó, debe repetir el Nivel. ¿Cuáles son las dos opciones?',
        opciones: [
          'Repetir solo el examen una tercera vez, o retirarse',
          'Repetir el Nivel con un grupo completamente nuevo, o seguir en su grupo trabajando su Nivel mientras los demás avanzan, convirtiendo la clase en multinivel',
          'Pasar de nivel con seguimiento, o repetir el ciclo completo del itinerario',
          'Cambiar de itinerario, o esperar seis meses',
        ],
        explicacion: 'La segunda opción deja al niño con sus compañeros y convierte la clase en multinivel.',
        repasa: ['repeticion-de-nivel', 'clase-multinivel'],
      },
      {
        pregunta: 'El Coach debe reportar al Administrador el caso del niño con dificultad a último momento, cuando ya se acerca el examen.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Al revés: apenas se detecte. Si se deja para la clase del examen, el padre se entera el día del Cierre.',
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Dos niños que no pasaron',
        fuente: 'curso-4-coach.html#m12',
        proposito: 'Que resuelvas el protocolo completo del niño que no pasó, con dos casos distintos, diciendo qué certificado le toca a cada uno, quién escribe al padre y qué se hace antes de la reválida.',
        gradiente: 'Exige tener la bitácora del nivel escrita: sin ella no puedes justificar por qué un niño es rescatable y el otro no. Si la bitácora está incompleta, ese hueco es de la maniobra de registro.',
        masa: [
          'La bitácora y la asistencia de dos niños reales que te preocupen.',
          'Los Certificados de Nivel y de Participación en blanco.',
          'El calendario de las tres clases del examen y el cierre.',
        ],
        pasos: [
          'Toma dos niños reales: uno que asiste a todo y se esfuerza, y uno que falta y no practica.',
          'Di qué certificado le corresponde a cada uno y en qué momento se decide.',
          'Di quién le escribe al padre de cada uno y por qué canal.',
          'Explica qué se hace antes de que repitan el examen.',
          'Para el que asiste, di en qué semana debiste haber reportado su dificultad.',
          'Para el que falta, justifica si es rescatable y qué le propones al Administrador.',
          'Cierra diciendo los tres pasos administrativos del examen, en orden.',
        ],
        criterios: [
          'Asigna el certificado correcto a cada caso y dice en qué momento se notifica al Administrador.',
          'Reconoce que el niño con Certificado de Participación hace igual la presentación con su grupo.',
          'Nombra al Administrador y al Asistente Administrativo como quienes escriben al padre, no a sí mismo.',
          'Justifica con la bitácora si el niño flojo es rescatable, en vez de opinar sin papel delante.',
          'Cierra nombrando los tres pasos: entregar los exámenes, subir las notas al Drive y notificar que ya están.',
        ],
        errorTipico: 'Descubrir el caso el día que califica. Se delata porque no puede decir en qué semana reportó la dificultad, y el padre se entera el mismo día del Cierre de que su hijo repite el nivel.',
      },
    ],
  },
]
