// Paquete de hat del Administrador de Centro (bloque A, orden 13).
// Fuente: plataformas/aloha/training-moodle/hca/hat-administradora.html,
// curso-1-administradora.html#m0 y hca/drills-administradora.html#d1.
//
// Archivo propio por rol: hat.js es compartido con of-hat-asi (rol asistente) y lo
// escribe otro frente. El barril debe quedar así, sin perder ninguno de los dos:
//   import { HAT_ADM } from './hat-administradora'
//   import { HAT_ASI } from './hat-asistente'
//   export const HAT = [...HAT_ADM, ...HAT_ASI]
//
// El `id` es la clave de progreso en entrenamiento_progreso.modulo: no se renombra.
// Los índices correctos del quiz viven en lib/entrenamiento/respuestas-oficio/hat-administradora.js

export const HAT_ADM = [
  {
    id: 'of-hat-adm',
    curso: 'hat',
    orden: 13,
    roles: ['administradora'],
    titulo: 'Tu hat: Administradora del Centro',
    duracionMin: 20,
    requiere: ['of-nor-9'],
    fuente: [
      'hat-administradora.html#pfv',
      'hat-administradora.html#responsabilidades',
      'hat-administradora.html#no-hace',
      'hat-administradora.html#flujo',
      'curso-1-administradora.html#m0',
      'drills-administradora.html#d1',
    ],
    pfv: 'Matrícula activa creciente: niños inscritos, recibiendo clases de calidad y renovando de nivel en nivel, mes tras mes.',
    masa: [
      'La descripción del puesto de Administrador de Centro impresa: el objetivo de la posición y la lista de funciones.',
      'El organigrama del Centro dibujado en una hoja, o dibujado por ti en el momento.',
      'El último informe FODA entregado por el Centro, impreso.',
      'El cuadro de negocio del mes pasado, impreso, y el cuadro KPI vigente.',
      'Calculadora.',
    ],
    palabras: [
      'hat',
      'producto-final-valioso',
      'masa',
      'gradiente',
      'palabra-malentendida',
      'junta-directiva',
      'coordinador-operativo',
      'indicador',
      'desercion',
      'prima-de-produccion',
      'nivel-del-centro',
      'foda',
    ],
    bloques: [
      { t: 'sub', texto: 'El PFV, en una sola frase' },
      {
        t: 'p',
        texto: 'Antes de una sola tarea, esto: **un hat no es una lista de cosas que haces. Es una cosa que produces.** Si al final del mes esa cosa no existe, no importa cuántas horas estuviste en el Centro.',
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Producto Final Valioso del Administrador de Centro',
        texto: '**Matrícula activa creciente: niños inscritos, recibiendo clases de calidad y renovando de nivel en nivel, mes tras mes.**',
      },
      { t: 'p', texto: 'Las tres partes son obligatorias y ninguna sirve sola:' },
      {
        t: 'lista',
        items: [
          '**Inscritos** — entran niños nuevos todos los meses. Sin entrada, el Centro se apaga solo.',
          '**Recibiendo clases de calidad** — la clase se da bien. Es lo único que hace que la tercera parte ocurra.',
          '**Renovando de nivel en nivel** — se quedan. Un niño que entra en enero y se va en marzo no es producto, es rotación.',
        ],
      },
      { t: 'sub', texto: 'De dónde sale este producto (no es una opinión)' },
      {
        t: 'p',
        texto: 'El objetivo de tu posición, textual del manual: realizar labores de organización, planificación y control operativo del Centro, para garantizar el buen funcionamiento y resultados del programa ALOHA Mental Arithmetic; administrar e interpretar información e indicadores para el cumplimiento de los objetivos establecidos por la gerencia.',
      },
      {
        t: 'p',
        texto: 'Ese objetivo no dice cuál es el producto. Lo dice el bolsillo: mira por qué te pagan la prima. El manual te mide y te premia por exactamente dos cosas cada mes —niños nuevos y deserción— y por una tercera cada trimestre: cuántos niños tiene el Centro al cierre, que es lo que define el nivel del Centro y los recursos que te dan. Niños que entran, niños que no se van, niños acumulados. Eso es matrícula activa creciente.',
      },
      { t: 'sub', texto: 'Los seis sub-productos y cómo se mide cada uno' },
      {
        t: 'tabla',
        encabezados: ['Sub-producto', 'Qué es, en concreto', 'Con qué indicador del manual se cuenta'],
        filas: [
          [
            '1. Niños nuevos inscritos',
            'Cada mes entran niños al Centro por clase de prueba y apertura de grupos.',
            'Nuevos niños del mes: mínimo 20 → 75 USD; mínimo 25 → 90 USD; mínimo 30 → 105 USD. Trimestral: mínimo 60 nuevos. En el FODA: % de asistencia y % de inscripción de clase de prueba.',
          ],
          [
            '2. Niños que se quedan',
            'Los niños que ya están terminan el nivel y arrancan el siguiente.',
            'Deserción máximo 8 % al cierre de mes → 75 USD. Trimestral: 8 % por mes durante los tres meses, junto a los 60 nuevos → 200 USD. En el FODA: % de retiro y % de retirados cuyos padres no fueron a la Clase para Padres.',
          ],
          [
            '3. Matrícula acumulada del Centro',
            'El total de niños activos al cierre del trimestre.',
            'Nivel del Centro: 1 = más de 170 → 85 USD; 2 = más de 200 → 150 USD + Asistente Operativo; 3 = más de 230 → 200 USD; 4 = más de 325 → 243 USD; 5 = más de 410 → 285 USD.',
          ],
          [
            '4. Grupos abiertos y sostenibles',
            'La capacidad instalada donde caben esos niños: grupos con matrícula mínima y Coach asignado.',
            'Mínimos de apertura nivel 1: Tiny 8-10, Kids 10. Niveles 2 al 10: 6. Con 5 o menos y sin unión posible, el grupo lo tomas tú. Grupo compartido: desde 13 niños.',
          ],
          [
            '5. Calidad verificada de la clase',
            'La razón por la que el sub-producto 2 existe. No es buena actitud: son evaluaciones hechas y firmadas.',
            'Al menos dos evaluaciones a cada Coach por grupo, con retroalimentación y archivo en el expediente. Encuesta de satisfacción en cada Cierre de Nivel. % de asistencia a la Escuela de Padres.',
          ],
          [
            '6. Información veraz para que la Junta decida',
            'El informe FODA con los seis indicadores. Existe o no existe el día 5.',
            'Informe FODA entregado los primeros 5 días de cada mes a la Junta Directiva, con los seis indicadores obligatorios calculados.',
          ],
        ],
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'El FODA no es tu producto',
        texto: 'Es la evidencia de tu producto. Un FODA impecable con la matrícula cayendo no es trabajo bien hecho: es un buen reporte de un mal mes. Pero un mes bueno sin FODA entregado tampoco cuenta, porque la Junta no puede ver lo que no le llega.',
      },
      { t: 'sub', texto: 'Tu jefe inmediato y tu equipo' },
      {
        t: 'lista',
        items: [
          '**Reportas a:** la Junta Directiva y/o el personal que esta defina para el control y supervisión de sus intereses, que es tu Jefe Directo. A la Junta Directiva le notificas tus ausencias y tardanzas, y le solicitas tus permisos de tiempo por correo electrónico.',
          '**Supervisas:** Asistente Administrativo y Coaches.',
          '**No supervisas directamente al personal de apoyo y aseo:** su jefe directo es la Asistente, que supervisa el trabajo del personal de limpieza y vela porque el Centro se mantenga limpio y adecuado para dar las clases.',
        ],
      },
      { t: 'sub', texto: 'Lo que este hat NO hace' },
      {
        t: 'p',
        texto: 'Esto es tan importante como lo anterior. Un hat mal delimitado produce invasión de puesto: dos personas haciendo lo mismo, o una persona firmando lo que no le toca. Y en varios de estos casos, hacerlo es falta grave.',
      },
      {
        t: 'tabla',
        encabezados: ['Esto NO lo decides tú', 'De quién es', 'Qué te toca a ti'],
        filas: [
          [
            'Emitir constancias escolares o certificaciones académicas',
            'Corporativo ALOHA, exclusivamente.',
            'Recibir la solicitud del padre, remitirla al corporativo con la información del estudiante y el asunto Solicitud de constancia escolar – [Centro] – [Estudiante], y archivar la copia. El corporativo emite en máximo 3 días laborales.',
          ],
          [
            'Aprobar un caso especial de ingreso o de colocación de itinerario',
            'Departamento Académico del Corporativo ALOHA.',
            'Identificar el caso, elevarlo al evaluador designado, firmar el informe técnico y remitirlo. Esperar la resolución antes de inscribir.',
          ],
          [
            'Autorizar tus propios permisos',
            'Junta Directiva, por correo electrónico.',
            'Solicitarlos por escrito con mínimo 3 días de anticipación. Los permisos de la Asistente Administrativa sí los autorizas tú con tu firma, y van al Coordinador Operativo.',
          ],
          [
            'Confeccionar el contrato, buscar firmas, sellarlo en el Ministerio de Trabajo e inscribirlo en la Caja de Seguro Social',
            'Coordinador Operativo.',
            'Enviar el formato Solicitud de Contrato. Primer contrato: 3 meses con 1 mes de prueba. Segundo: un año con 3 meses de prueba.',
          ],
          [
            'La segunda entrevista y la decisión final de contratación',
            'Junta Directiva.',
            'Primera entrevista, verificación de documentos y envío de los candidatos con mayores posibilidades. La verificación de las 2 referencias la hace la Asistente Administrativa.',
          ],
          [
            'Montar la nómina y los pagos en Zoho',
            'Asistente Administrativo.',
            'Verificarla, enviar a cada Coach su factura desglosada y asegurar que los pagos sean los correctos, antes del 13 y del 28.',
          ],
          [
            'Aplicar una innovación tuya en el Centro',
            'Administración General, que la evalúa y aprueba, porque al ser franquicia se aplica en todos los Centros.',
            'Proponerla y notificarla. Tienes todo el derecho de innovar y proponer; no de implementar por tu cuenta.',
          ],
          [
            'Definir el programa de incentivos KPI y cuándo se aplica',
            'Junta Directiva del Centro.',
            'Cumplir los parámetros y reportar datos veraces.',
          ],
          [
            'Inventar un descuento',
            'Nadie. Solo existen cuatro ofertas autorizadas, con tope mensual.',
            'Elegir cuál aplicar, dejar evidencia y notificar de inmediato al Coordinador Operativo.',
          ],
          [
            'La cobranza a partir de los 30-45 días de vencimiento',
            'Coordinador Operativo, que pasa la lista al personal de cobro.',
            'Hasta ahí: decidir el arreglo de pago o el retiro deteniendo la factura recurrente cuando el vencimiento va de 1 a 15 días.',
          ],
          [
            'Capacitar técnicamente a los Coaches en el método',
            'Master Coach de ALOHA Panamá, que también te entrena a ti para la Clase para Padres y envía las notas de examen.',
            'Detectar la necesidad, coordinar la fecha según su agenda, dar seguimiento a las notas y coordinar la reválida.',
          ],
          [
            'Delegar la Clase para Padres',
            'Nadie más puede darla. Si no puedes, la cubre otro Administrador de Centro o el Master Coach, y eso tiene costo adicional para el Centro.',
            'Darla tú, acompañada de un Coach distinto en cada sesión, y notificar a la Administración si no puedes.',
          ],
        ],
      },
      { t: 'sub', texto: 'Las cuatro ofertas autorizadas y sus topes — de memoria' },
      {
        t: 'tabla',
        encabezados: ['Oferta', 'Qué es', 'Tope'],
        filas: [
          ['1', '10 % de descuento en factura vencida', 'Todas las que desee'],
          ['2', '15 % de descuento en factura vencida', 'Máximo 3 ofertas al mes'],
          ['3', '25 % en factura vencida', 'Máximo 2 ofertas al mes'],
          ['4', '25 % en factura vencida + 10 % para terminar el nivel', 'Máximo 1 oferta al mes'],
        ],
      },
      {
        t: 'p',
        texto: 'Para los motivos no entiende la técnica y pérdida de clase, la herramienta no es descuento: es de 1 a 2 clases de reposición gratis.',
      },
      { t: 'sub', texto: 'Lo que otros NO hacen sobre tu área, y tienes que hacer respetar' },
      {
        t: 'lista',
        items: [
          'Un Coach no le da su número directo a un representante. Se da el celular del Centro.',
          'Un Coach no comunica un comportamiento destructivo por su cuenta: eso se hace en conjunto contigo.',
          'Un Coach no se reúne con un padre sin ti presente.',
          'El Centro no abre grupos de WhatsApp de padres.',
          'No se despacha material de un rango de edad distinto sin autorización escrita del corporativo: el control interno rechaza el pedido.',
        ],
      },
      {
        t: 'nota',
        tono: 'alerta',
        titulo: 'Falta grave y causal de despido inmediato o revocación de franquicia',
        texto: 'Alterar o manipular la edad o fecha de nacimiento de un estudiante; tramitar inscripciones en itinerarios no autorizados; presentar informes falsificados o alterados; emitir constancias sin autorización corporativa; modificar, replicar o firmar formatos oficiales sin consentimiento. Ninguna de estas cosas se hace por ayudar a un padre. Se hacen y se pierde el puesto.',
      },
      { t: 'sub', texto: 'De quién recibes' },
      {
        t: 'tabla',
        encabezados: ['De quién', 'Qué recibes', 'Cuándo'],
        filas: [
          [
            'Junta Directiva (tu Jefe Inmediato)',
            'Estrategia comercial, aprobación de tus permisos, definición del programa KPI, resultado de la 2da entrevista de candidatos',
            'Según convocatoria',
          ],
          [
            'Corporativo ALOHA — Departamento Académico',
            'Aprobación o rechazo de casos especiales de ingreso; constancias escolares en PDF institucional',
            'Constancias: máximo 3 días hábiles desde la solicitud completa',
          ],
          [
            'C & C Soluciones Integrales, S.A. (info@alohapanama.com)',
            'Kits (Tiny, Kinder o Kids), suéteres y su orden de entrega',
            'Se revisan y contabilizan el mismo día de recibidos, para formalizar discrepancias',
          ],
          [
            'Área de venta',
            'Lista de personas inscritas a la clase de prueba',
            'El manual escribe un día antes en la sección del Administrador y dos días antes en la del Asistente; se aplican 2 días, que es la única versión compatible con la llamada de confirmación del día anterior',
          ],
          [
            'Master Coach',
            'Tu entrenamiento para la Clase para Padres; capacitaciones a Coaches y notas de examen',
            'Según agenda del Master Coach',
          ],
          [
            'Coach',
            'Aviso de niño con mínimo 2 ausencias; aviso de niño que no cumple expectativas; solicitud de Clase de Reforzamiento; formato de situaciones especiales; notificación inmediata ante un accidente',
            'Inmediato en todos los casos',
          ],
          [
            'Asistente Administrativo',
            'Nómina montada en Zoho; lista y estadísticas de clase de prueba; encuestas de satisfacción procesadas; referencias verificadas; situación de acudientes con factura vencida; cuadro KITS A PEDIR',
            'Nómina: antes de tu verificación del 13 y del 28',
          ],
          [
            'Padres',
            'Solicitud escrita de constancia; solicitud escrita de repetición de nivel; solicitud de continuidad de Tiny Tots a Kids; aviso de retiro por correo',
            'Constancia: la recibes en máximo 1 día hábil',
          ],
        ],
      },
      { t: 'sub', texto: 'A quién entregas' },
      {
        t: 'tabla',
        encabezados: ['A quién', 'Qué entregas', 'Cuándo'],
        filas: [
          [
            'Junta Directiva',
            'Informe FODA del mes anterior con los seis indicadores, e índices de cumplimiento mensual',
            'Primeros 5 días de cada mes',
          ],
          [
            'Coordinador Operativo',
            'Permisos autorizados de la Asistente; Solicitud de Contrato; evidencia de arreglos de pago',
            'Permisos: inmediatamente después de autorizados. Arreglos de pago: de inmediato',
          ],
          [
            'Asistente Administrativo',
            'Calendario del nuevo grupo y fecha de la Clase para Padres; cuadro KITS A PEDIR por prioridad de fechas de cierre; decisión de qué Coach da la Clase de Reforzamiento',
            'Al oficializar la apertura del grupo',
          ],
          [
            'Viralsolutionss Inc (promotor de redes y publicidad)',
            'Horarios de apertura de los nuevos grupos del mes, por WhatsApp al grupo correspondiente',
            'Apenas se define el horario de apertura',
          ],
          [
            'C & C Soluciones Integrales (info@alohapanama.com)',
            'Solicitud de kits con los 4 datos: número de kits, número y talla de suéteres, nombre del grupo y fecha de inicio. Y la orden de entrega firmada.',
            'Solicitud: inmediatamente al oficializar el grupo. Orden firmada: el mismo día de la revisión',
          ],
          [
            'Coaches',
            'Grupo asignado; evaluación y retroalimentación; expediente actualizado; protocolo de bono de puntualidad verbal y por escrito; calendario de entrenamiento',
            'Evaluaciones: al menos dos por grupo',
          ],
          [
            'Padres',
            'Clase para Padres; respuesta única a cada situación hasta cerrar el ciclo; presencia en cada reunión; Cierre de Nivel',
            'Clase para Padres: el día de inicio o a más tardar la 2da semana',
          ],
          [
            'Corporativo',
            'Cuadro de retiros: cantidad de alumnos, grupos, causas y Coach encargado',
            'A final de cada mes, para efectos de auditoría',
          ],
          [
            'Coaches y proveedores, vía Zoho',
            'Nómina verificada con su factura de servicio adjunta',
            'Verificada antes del 13 y del 28; pagos los 15 y 30',
          ],
        ],
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Pendientes con la Junta Directiva que arrastra este puesto',
        texto: 'El manual nombra las activaciones como función tuya y nunca las define: falta qué cuenta como activación, cuántas al mes y con qué presupuesto. Y el cuadro de retiros se envía a un segundo correo, vcampos@panama.com, cuyo dominio no corresponde a ninguna otra dirección de la organización y parece error de transcripción. Ninguna de las dos se resuelve por cuenta propia: el paso se ejecuta y se firma con la nota del pendiente al lado, y el Oficial de Entrenamiento las lleva a la Junta.',
      },
    ],
    drills: [
      {
        titulo: 'Drill 1 — Nombrar tu hat y tu producto final valioso',
        fuente: 'drills-administradora.html#d1',
        proposito: 'Que digas, sin leer, qué puesto ocupas, ante quién respondes, a quién supervisas y cuál es la cosa concreta y contable que tu puesto entrega al Centro.',
        gradiente: 'Es el primer drill del hat. No hay paso previo. Si aquí se traba, el problema es de palabras, no de puesto: aclara producto final valioso e indicador antes de seguir.',
        masa: [
          'La descripción del puesto de Administrador de Centro impresa: objetivo de la posición y lista de funciones.',
          'El organigrama del Centro dibujado en una hoja, o dibujado por ella en el momento.',
          'El cuadro de negocio del mes pasado impreso.',
          'El informe FODA del mes pasado impreso.',
        ],
        pasos: [
          'Lee en voz alta el objetivo de tu posición tal como está escrito en el Manual.',
          'Ciérralo y dilo con tus palabras, sin el papel delante.',
          'Dibuja tu organigrama: pon arriba a quién reportas y por cuál vía se manejan los temas de personal; pon abajo a quién supervisas.',
          'Escribe en una hoja, en una sola frase, el producto final valioso de tu puesto: la cosa concreta, contable y de calidad que entregas.',
          'Toma el cuadro de negocio y el FODA del mes pasado y señala con el dedo dónde se ve ese producto en números.',
          'Nombra tres decisiones que tomaste, o que tomarías, usando esos números y no tu opinión.',
        ],
        criterios: [
          'Dice su producto final valioso de memoria, en una sola frase, dos días distintos.',
          'En el cuadro de negocio señala sin dudar los tres números que lo componen: niños del mes anterior, niños nuevos y deserciones.',
          'Explica con sus palabras la diferencia entre reportar un número y usarlo para decidir.',
        ],
        errorTipico: 'Contesta con una lista de tareas —superviso, organizo, atiendo padres— en vez de un producto. Una lista de tareas no es un producto: el producto es lo que queda entregado cuando las tareas se hicieron bien. Mientras conteste tareas, no está hatted.',
      },
    ],
    quiz: [
      {
        pregunta: '¿Cuál es el Producto Final Valioso del Administrador de Centro?',
        opciones: [
          'Un Centro organizado, limpio y con los archivos al día',
          'El informe FODA entregado dentro de los primeros 5 días',
          'Coaches entrenados y evaluados',
          'Matrícula activa creciente: niños inscritos, recibiendo clases de calidad y renovando de nivel en nivel, mes tras mes',
        ],
        explicacion: 'La organización, el FODA y los Coaches entrenados son evidencia o insumo. Lo que se cuenta son niños que entran, que reciben clase de calidad y que renuevan de nivel en nivel.',
        repasa: ['producto-final-valioso'],
      },
      {
        pregunta: 'El informe FODA es el Producto Final Valioso del Administrador de Centro.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'El FODA es la evidencia del producto, no el producto. Si mañana el FODA desaparece, el Centro sigue teniendo niños; si los niños desaparecen, el FODA no tiene qué reportar.',
        repasa: ['foda', 'producto-final-valioso'],
      },
      {
        pregunta: '¿Ante quién responde la Administradora del Centro y a quién supervisa?',
        opciones: [
          'Reporta al Master Coach y supervisa únicamente a los Coaches',
          'Reporta a la Junta Directiva y/o al personal que esta defina, y supervisa al Asistente Administrativo y a los Coaches',
          'Reporta al Coordinador Operativo y supervisa a todo el personal, incluido el de apoyo y aseo',
          'Reporta al Corporativo ALOHA y supervisa únicamente a la Asistente',
        ],
        explicacion: 'Tu Jefe Directo es la Junta Directiva y/o el personal que esta defina. Supervisas Asistente Administrativo y Coaches.',
        repasa: ['junta-directiva'],
      },
      {
        pregunta: 'La Administradora supervisa directamente al personal de apoyo y aseo.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'El jefe directo del personal de limpieza es la Asistente, que supervisa su trabajo y vela porque el Centro se mantenga limpio y adecuado para dar las clases.',
        repasa: ['personal-de-apoyo-y-aseo'],
      },
      {
        pregunta: '¿Cuál de estas decisiones NO le corresponde a la Administradora del Centro?',
        opciones: [
          'Autorizar con su firma el permiso de la Asistente Administrativa',
          'Decidir el arreglo de pago o el retiro cuando una factura lleva de 1 a 15 días vencida',
          'Cambiar al Coach de un grupo que no está funcionando',
          'Aprobar un caso especial de ingreso fuera del rango de edad oficial',
        ],
        explicacion: 'El caso especial lo aprueba el Departamento Académico del Corporativo. Los centros no están autorizados a decidir ubicaciones excepcionales de forma unilateral ni discrecional.',
        repasa: ['caso-especial-de-ingreso', 'ubicacion-excepcional'],
      },
      {
        pregunta: 'Omitir, manipular o falsear un dato de un informe de indicadores se considera…',
        opciones: [
          'una imprecisión sin consecuencias si se corrige el mes siguiente',
          'una decisión válida de la Administradora sobre su propio informe',
          'falta grave de carácter laboral, ético y legal',
          'una observación menor que resuelve la auditoría',
        ],
        explicacion: 'El manual lo dice sin rodeos: los datos, informes e indicadores deben ser veraces, precisos, completos y verificables. Un producto inflado no es producto.',
        repasa: ['veraz', 'verificable', 'falta-grave'],
      },
    ],
  },
]
