// Curso `coach` - bloque Online del puesto de Coach ALOHA.
//
// Estos tres módulos integran el anexo "Clases de ALOHA Online" al plan vivo
// del Coach sin renumerar los once módulos publicados. La fuente principal
// auditada es el Manual actualizado, sección 7, líneas 2500-2605 del texto
// limpio de auditoría. El curso Moodle anterior `curso-5-aloha-online` se usó
// como apoyo editorial y banco de preguntas, no como autoridad para ampliar
// reglas que el Manual no fija en esta sección.

const RECURSOS_ONLINE = {
  requerimientosCoach: {
    titulo: 'Requerimientos para el coach',
    href: 'https://drive.google.com/file/d/1n9mp_z549oSSnEAwNY_f3Zd061hLBgeQ/view?usp=sharing',
  },
  requerimientosAlumno: {
    titulo: 'Requerimientos para el alumno',
    href: 'https://drive.google.com/file/d/1rlrv-M8nVIDOezS51ClqBvCgtMXq_RwW/view?usp=sharing',
  },
  tipsGenerales: {
    titulo: 'Tips para coaches: generales',
    href: 'https://drive.google.com/file/d/1fe8K7pVZ3IHav5N1QBR3mqIAxbiW_C7I/view?usp=sharing',
  },
  tipsKinder: {
    titulo: 'Tips para coaches: kinder',
    href: 'https://drive.google.com/file/d/1i4nviYqVi54ZkES-8QhsFjToMXcP97Yp/view?usp=sharing',
  },
  estructuraClase: {
    titulo: 'Estructura de clase (texto y tiempo)',
    href: 'https://drive.google.com/file/d/1zdixSsdSRSTNzSFIG6hV1hMRBPe830b3/view?usp=sharing',
  },
  estructuraPresentacion: {
    titulo: 'Estructura de presentación de clase',
    href: 'https://drive.google.com/file/d/1wo5lVTJg20pQSDtlkz8Mp0Nt-bfyLdYd/view?usp=sharing',
  },
  busquedaTesoro: {
    titulo: 'Cierre de Nivel - Búsqueda del Tesoro',
    href: 'https://drive.google.com/drive/folders/1WLBMiw2fWWVr6Z4yp6nnvM6arEoNGBPy?usp=sharing',
  },
  dossierJuegos: {
    titulo: 'Dossier de juegos online',
    href: 'https://drive.google.com/file/d/1qEn-O4kmpV3Lu44dw-8OdD0rnOZeBWK6/view?usp=sharing',
  },
  brainGym: {
    titulo: 'Brain Gym',
    href: 'https://drive.google.com/file/d/1XrBP-X6MFDjInGokzLCqyrPckag95rK6/view?usp=sharing',
  },
  guiaBrainGym: {
    titulo: 'Guía para Brain Gym',
    href: 'https://drive.google.com/file/d/1d70hVlbV7Carp8jHfWjcAgnoNDP4ihIP/view?usp=sharing',
  },
  brainBreaks: {
    titulo: 'Brain Breaks',
    href: 'https://drive.google.com/file/d/12BIzQPgtNlNKGSDfOP_TjgG2MVF78lgo/view?usp=sharing',
  },
  brainBreaksFlashcards: {
    titulo: 'Brain Breaks Flashcards',
    href: 'https://drive.google.com/file/d/117fm3A3XOMTc5hXkYBOjk8jYHszLUATO/view?usp=sharing',
  },
  instruccionesBrainBreaks: {
    titulo: 'Instrucciones para Brain Breaks',
    href: 'https://drive.google.com/file/d/1VnVU_rUd2Hy8nLl18hGWUAxeHingaPKr/view?usp=sharing',
  },
  actividadesKids: {
    titulo: 'Actividades Cognitivas Kids',
    href: 'https://drive.google.com/file/d/1iJvm-hNbzSJkIqv4oX_kL6WXVD3pgSUi/view?usp=sharing',
  },
  guiaActividadesKids: {
    titulo: 'Guía para Actividades Cognitivas Kids',
    href: 'https://drive.google.com/file/d/1iFJfh8AVa1lOm7p--jPrWkLYSAg39u-c/view?usp=sharing',
  },
  actividadesTinyTots: {
    titulo: 'Actividades Cognitivas Tiny Tots',
    href: 'https://drive.google.com/file/d/1KS8d6PXy5lH_fC2pBQj_QV0kXf2kc0Ol/view?usp=sharing',
  },
  guiaActividadesTinyTots: {
    titulo: 'Guía para Actividades Cognitivas Tiny Tots',
    href: 'https://drive.google.com/file/d/1zdDcpee-S8kicgHaWIV1U-q647sGBBW4/view?usp=sharing',
  },
  plantillaRetroalimentacion: {
    titulo: 'Plantilla de Retroalimentación',
    href: 'https://drive.google.com/file/d/149joytvqCavEh_rLcS5ecoU74z1xf1AF/view?usp=sharing',
  },
  faqCoaches: {
    titulo: 'Preguntas frecuentes de los Coaches',
    href: 'https://drive.google.com/file/d/1tw7ZFVr5VTAu0bDyxRW1UrrtnQMFmkh1/view?usp=sharing',
  },
  faqPadres: {
    titulo: 'Preguntas frecuentes de los Padres',
    href: 'https://drive.google.com/file/d/1TWayV-AfZlGbTihDZ27N3NVWBE9katSi/view?usp=sharing',
  },
}

export const COACH_ONLINE = [
  {
    id: 'of-coa-12',
    curso: 'coach',
    orden: 25,
    roles: ['coach'],
    titulo: 'Online: cámara, equipo y presentación lista',
    duracionMin: 14,
    requiere: ['of-coa-11'],
    fuente: ['manual-texto-auditado.md#L2500-L2533', 'curso-5-aloha-online#m1-m3'],

    pfv: 'La clase online abierta con cámara y audio bajo control, los requerimientos del alumno publicados antes de la primera clase y la presentación lista sin tocar el archivo de otro Coach.',

    voz: 'Online no es poner la clase presencial en una pantalla. <break time="0.4s"/> Tu salón ahora depende de tres cosas: cámara, audio y una presentación abierta antes de que entren los niños. <break time="0.5s"/> La cámara del alumno se queda encendida toda la clase, porque por ahí ves el material, la técnica, la comprensión y la velocidad. <break time="0.4s"/> Bocinas o audífonos y micrófono tienen que funcionar, y el micrófono lo controlas tú según el momento. <break time="0.5s"/> Antes de la primera clase, publicas los requerimientos del alumno en la Historia de la Clase. <break time="0.4s"/> Y con las presentaciones hay una regla simple: si vas a cambiar una que hizo otro Coach, primero haces copia. <break time="0.4s"/> La clase empieza con la diapositiva azul ya compartida.',

    laminas: [
      {
        kicker: 'La base',
        titulo: 'La cámara es parte del servicio',
        texto: 'El niño mantiene la cámara encendida toda la clase para que puedas ver material, técnica, comprensión, ritmo y conducta.',
        cierre: 'Sin cámara, no puedes evaluar lo que el representante pagó.',
      },
      {
        kicker: 'Audio',
        titulo: 'Bocinas o audífonos y micrófono funcional',
        texto: 'El alumno debe oír y poder responder. El Coach puede activar o desactivar el micrófono según lo que requiera la actividad.',
      },
      {
        kicker: 'Antes de iniciar',
        titulo: 'Requerimientos en la Historia de la Clase',
        texto: 'La imagen de requerimientos del alumno se coloca antes de la primera clase del grupo en Class Dojo.',
        cierre: 'Así el padre sabe qué se necesita antes de reclamar.',
      },
      {
        kicker: 'Material de Apoyo',
        titulo: 'Primero copia, después modifica',
        items: [
          'Si la presentación lista sirve, revísala con antelación.',
          'Actualiza fecha y plantilla si hace falta.',
          'Si vas a cambiar algo, crea una copia primero.',
          'Guarda con el nombre del contenido de la clase.',
        ],
      },
      {
        kicker: 'Inicio',
        titulo: 'La diapositiva azul ya está compartida',
        texto: 'Cuando los niños ingresan, lo primero que ven es la diapositiva azul de ALOHA, no tu escritorio ni carpetas abiertas.',
      },
    ],

    sop: {
      proceso: 'Preparar la primera clase online del grupo',
      cuando: 'Antes de abrir la primera clase y antes de cada sesión online.',
      producto: 'Requerimientos publicados, equipo funcional y presentación lista en pantalla antes de que entren los niños.',
      pasos: [
        'Pide a la Administradora el material de requerimientos del alumno y confirma que tienes el de requerimientos del Coach.',
        'Publica los requerimientos del alumno en la Historia de la Clase antes de la primera clase del grupo.',
        'Comprueba tu cámara, audio y micrófono antes de exigirlos al alumno.',
        'Al iniciar la clase, exige cámara encendida durante toda la sesión.',
        'Confirma que bocinas o audífonos y micrófono del alumno funcionen.',
        'Controla el micrófono del alumno según lo que requiera cada actividad.',
        'Ubica la presentación en Material de Apoyo por categoría y nivel.',
        'Si usas una presentación lista, revisa fecha y plantilla con antelación.',
        'Si vas a modificar una presentación ajena, crea una copia antes de tocarla.',
        'Comparte pantalla con la diapositiva azul de ALOHA antes de dejar entrar a los niños.',
      ],
      decide: [
        { situacion: 'El niño entra sin cámara', regla: 'No lo trates como detalle menor: sin cámara no puedes evaluar técnica ni comprensión. Repórtalo a la Administradora y deja constancia.' },
        { situacion: 'El micrófono interrumpe la clase', regla: 'El Coach tiene potestad para activarlo o desactivarlo según lo que se requiere en el momento.' },
        { situacion: 'La presentación de otro Coach casi sirve', regla: 'Si vas a hacer cambios, primero creas una copia y trabajas sobre esa copia.' },
      ],
      errores: [
        'Publicar los requerimientos después de que el grupo ya empezó.',
        'Editar el archivo original de otro Coach en la carpeta compartida.',
        'Abrir la clase con el escritorio visible en vez de la diapositiva azul.',
      ],
    },

    masa: [
      'La Historia de la Clase de Class Dojo abierta.',
      'La imagen de requerimientos del alumno lista para publicar.',
      'La carpeta Material de Apoyo con presentaciones por categoría y nivel.',
      'La presentación de la próxima clase y su copia de trabajo.',
      'La reunión online abierta en modo prueba, con audio y micrófono comprobados.',
    ],

    palabras: [
      'clases-aloha-online',
      'class-dojo',
      'historia-de-la-clase',
      'coach',
      'administrador-de-centro',
      'drive',
      'representante',
      'checksheet',
    ],

    bloques: [
      { t: 'sub', texto: 'La cámara es el salón del Coach' },
      { t: 'p', texto: 'En online no caminas entre mesas ni revisas el libro por encima del hombro. La cámara del niño es lo que te permite observar el material con el que se trabaja y las actividades que se hacen en clase.' },
      {
        t: 'lista',
        items: [
          'El niño debe mantener la cámara encendida durante toda la clase.',
          'Debe poder escucharte con bocinas o audífonos que funcionen.',
          'Debe tener micrófono funcional.',
          'El Coach puede activar y desactivar el micrófono según lo que se requiere en el momento.',
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'Sin cámara no hay evaluación completa', texto: 'Cuando el niño muestra el trabajo en cámara, tú evalúas técnica, comprensión del contenido, seguimiento de instrucciones, resolución de ejercicios, velocidad y comportamiento. Si eso no se ve, la clase queda a ciegas.' },

      { t: 'sub', texto: 'Los requerimientos se publican antes de la primera clase' },
      { t: 'p', texto: 'La imagen de requerimientos del alumno debe colocarse previamente a la primera clase del grupo en la Historia de la Clase de Class Dojo. No se espera a que el padre reclame ni a que un niño entre sin equipo.' },
      { t: 'nota', tono: 'regla', titulo: 'Primero se avisa, después se exige', texto: 'Si el representante ya vio los requerimientos antes de empezar, la conversación es cómo resolver. Si se entera dentro de la clase, la falla parece del Centro.' },
      {
        t: 'recursos',
        titulo: 'Recursos oficiales 7.1',
        recursos: [
          RECURSOS_ONLINE.requerimientosCoach,
          RECURSOS_ONLINE.requerimientosAlumno,
          RECURSOS_ONLINE.tipsGenerales,
          RECURSOS_ONLINE.tipsKinder,
        ],
      },

      { t: 'sub', texto: 'Material de Apoyo y presentaciones' },
      {
        t: 'tabla',
        encabezados: ['Situación', 'Qué haces'],
        filas: [
          ['Hay una presentación lista que sirve', 'La revisas con antelación y modificas fecha y plantilla si hace falta.'],
          ['Hay una presentación que sirve como base', 'Creas una copia y modificas la copia, actualizando el nombre.'],
          ['No hay una presentación útil', 'Creas la presentación con el nombre que corresponda al contenido de esa clase.'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'No trabajes sobre el original', texto: 'Una presentación compartida puede servirle a otro Coach mañana. Si la cambias encima del archivo original, cambias también la clase de otro grupo.' },
      {
        t: 'recursos',
        titulo: 'Recurso oficial 7.2 para presentación',
        recursos: [RECURSOS_ONLINE.estructuraPresentacion],
      },

      { t: 'sub', texto: 'La primera imagen que ve el niño' },
      { t: 'p', texto: 'Al momento de iniciar la clase, la diapositiva a utilizar debe estar en la pantalla compartida. Cuando los niños ingresen, lo primero que deben ver es la diapositiva azul de ALOHA.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Vas a dar la primera clase online del grupo mañana. La presentación que encontraste tiene la fecha de otro grupo y te falta publicar requerimientos. Escribe el orden exacto de acciones antes de abrir la sala.' },
    ],

    quiz: [
      {
        pregunta: '¿Durante cuánto tiempo debe estar encendida la cámara del niño en una clase online?',
        opciones: ['Solo cuando el Coach pregunta', 'Durante toda la clase', 'Solo al inicio', 'Solo cuando usa el ábaco'],
        explicacion: 'La cámara se mantiene encendida toda la clase porque es la forma de observar el trabajo real del alumno.',
        repasa: ['clases-aloha-online'],
      },
      {
        pregunta: 'Además de la cámara, ¿qué debe funcionar en el equipo del alumno?',
        opciones: ['Bocinas o audífonos y micrófono', 'Un segundo monitor', 'Solo las bocinas', 'Solo el chat'],
        explicacion: 'Sin audio y micrófono funcional se cae el dictado, la participación y el control de la clase.',
      },
      {
        pregunta: '¿Quién puede activar o desactivar el micrófono del alumno según el momento?',
        opciones: ['El representante', 'El niño', 'El Coach', 'Otro alumno del grupo'],
        explicacion: 'El Manual le da esa potestad al Coach, según lo que se requiere en el momento.',
        repasa: ['coach'],
      },
      {
        pregunta: '¿Cuándo se publica la imagen de requerimientos del alumno en Class Dojo?',
        opciones: ['Al cierre del primer mes', 'Después del primer reclamo', 'En la segunda clase', 'Antes de la primera clase del grupo'],
        explicacion: 'Debe estar en la Historia de la Clase antes de la primera clase.',
        repasa: ['historia-de-la-clase', 'class-dojo'],
      },
      {
        pregunta: 'Vas a modificar una presentación de la carpeta Material de Apoyo. ¿Qué haces primero?',
        opciones: ['Creas una copia y trabajas sobre la copia', 'Editas el archivo original', 'Cambias solo la fecha sin revisar', 'La dejas con el nombre viejo'],
        explicacion: 'Si vas a cambiar una presentación ajena, primero creas copia y modificas esa copia.',
      },
      {
        pregunta: 'Si una presentación lista te sirve tal cual, ¿qué debes revisar antes de usarla?',
        opciones: ['Solo el color de fondo', 'La fecha y la plantilla, con antelación', 'El nombre del representante', 'La lista de asistencia'],
        explicacion: 'El Manual pide revisar con antelación y modificar fecha y plantilla si hace falta.',
      },
      {
        pregunta: '¿Qué debe ver el niño al ingresar a la clase online?',
        opciones: ['El escritorio del Coach', 'La lista de archivos del Drive', 'La diapositiva azul de ALOHA ya compartida', 'El chat de Class Dojo'],
        explicacion: 'La diapositiva azul debe estar compartida al iniciar la clase.',
      },
      {
        pregunta: 'Cuando el niño muestra su trabajo por cámara, el Coach evalúa técnica, comprensión, seguimiento de instrucciones, resolución, velocidad y comportamiento.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Esas son las evidencias que la cámara le devuelve al Coach en online.',
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 - Abrir la clase sin improvisar',
        fuente: 'manual-texto-auditado.md#L2510-L2533',
        proposito: 'Que prepares una clase online real dejando publicados los requerimientos, lista la presentación y controlado el equipo antes de abrir la sala.',
        gradiente: 'Se hace con la próxima clase real. Si no tienes grupo online asignado, simula con una presentación y una Historia de Clase de prueba aprobada por tu Administradora.',
        masa: [
          'Historia de la Clase de Class Dojo.',
          'Imagen de requerimientos del alumno.',
          'Presentación de la próxima clase.',
          'Reunión online en prueba.',
        ],
        pasos: [
          'Muestra dónde quedó publicada la imagen de requerimientos y la fecha de la primera clase.',
          'Abre la presentación que usarás y confirma que nombre, fecha y plantilla corresponden al contenido.',
          'Si partiste de una presentación ajena, muestra la copia y no el original.',
          'Comprueba cámara, audio y micrófono de tu lado.',
          'Comparte pantalla con la diapositiva azul de ALOHA.',
          'Di en voz alta qué exigirás al niño sobre cámara, audio y micrófono.',
        ],
        criterios: [
          'Muestra requerimientos publicados antes de la primera clase, con fecha visible o evidencia equivalente.',
          'Presenta una copia cuando hubo cambios sobre material creado por otro Coach.',
          'Deja la diapositiva azul compartida antes de admitir niños a la sala.',
          'Explica que el micrófono del alumno lo controla el Coach según la actividad.',
        ],
        errorTipico: 'Abrir la sala y ponerse a buscar archivos delante de los niños. Se delata porque lo primero que ven no es la diapositiva azul de ALOHA.',
      },
    ],
  },

  {
    id: 'of-coa-13',
    curso: 'coach',
    orden: 26,
    roles: ['coach'],
    titulo: 'Online: Challenge y cierre de nivel',
    duracionMin: 15,
    requiere: ['of-coa-12'],
    fuente: ['manual-texto-auditado.md#L2524-L2568', 'manual-texto-auditado.md#L2598-L2602', 'curso-5-aloha-online#m2-m4'],

    pfv: 'La clase online conducida con el ALOHA Challenge en su lugar exacto y el Cierre de Nivel preparado sin repetir la Búsqueda del Tesoro con el mismo grupo.',

    temario: [
      'ALOHA Challenge en la segunda clase',
      'Quince minutos con conexión incluida',
      'Cierre de Nivel online',
      'Materiales y FAQ oficiales',
    ],

    voz: 'La estructura online tiene una trampa de reloj. <break time="0.4s"/> Cada segunda clase del grupo termina con ALOHA Challenge. <break time="0.3s"/> Y esos quince minutos incluyen la conexión de los niños a Kahoot y el arranque de la actividad. <break time="0.5s"/> El juego debe estar preparado antes de usar ese bloque de tiempo. <break time="0.5s"/> La regla del cierre también es simple. <break time="0.3s"/> Búsqueda del Tesoro se hace una vez por grupo. <break time="0.4s"/> En los cierres posteriores usas la misma estructura de presentación con repaso y juegos. <break time="0.5s"/> Abre los materiales y las guías oficiales antes de preparar actividades. <break time="0.4s"/> Usa los documentos FAQ para consultar dudas de Coaches y representantes.',

    laminas: [
      {
        kicker: 'Reloj',
        titulo: 'El Challenge va al final de cada segunda clase',
        texto: 'La última actividad de cada segunda clase del grupo es el ALOHA Challenge.',
        cierre: 'No se mueve al inicio ni se deja para cuando sobre tiempo.',
      },
      {
        kicker: 'Quince minutos',
        titulo: 'La conexión cuenta dentro del tiempo',
        texto: 'Los quince minutos incluyen que los niños entren a www.kahoot.it y que la actividad inicie.',
      },
      {
        kicker: 'Preparación',
        titulo: 'Kahoot listo antes de la clase',
        texto: 'Si preparas el enlace o el código en vivo, consumes el tiempo del propio Challenge.',
      },
      {
        kicker: 'Cierre online',
        titulo: 'Búsqueda del Tesoro una sola vez por grupo',
        texto: 'La actividad se realiza una vez por grupo. Repetirla en cierres posteriores le quita efecto y rompe la instrucción.',
      },
      {
        kicker: 'Después',
        titulo: 'Repaso y juegos sobre la misma estructura',
        texto: 'Los cierres posteriores usan la Estructura de presentación de clase con actividades de repaso y juegos.',
      },
    ],

    sop: {
      proceso: 'Conducir una clase online con Challenge y preparar su cierre',
      cuando: 'En cada segunda clase del grupo y en cada Cierre de Nivel online.',
      producto: 'Challenge completo en los quince minutos previstos y cierre online preparado con la actividad correcta para ese grupo.',
      pasos: [
        'Marca en el calendario cuáles son las segundas clases del grupo.',
        'Deja el ALOHA Challenge como última actividad de esas clases.',
        'Ten Kahoot creado, probado y listo antes de iniciar la sesión.',
        'Reserva los quince minutos contando conexión a www.kahoot.it e inicio de la actividad.',
        'Cierra la clase sin comerte la indicación de práctica en casa.',
        'Para el primer Cierre de Nivel online del grupo, prepara la Búsqueda del Tesoro.',
        'Después de usar Búsqueda del Tesoro una vez, no la repitas con ese mismo grupo.',
        'En cierres posteriores usa la misma estructura de presentación con repaso y juegos.',
        'Verifica antes de la sesión que el cierre de la clase no se coma la práctica en casa.',
      ],
      decide: [
        { situacion: 'Empieza el bloque de quince minutos del Challenge', regla: 'El tiempo ya incluye conexión a www.kahoot.it e inicio de la actividad; no lo trates como tiempo aparte.' },
        { situacion: 'El grupo ya hizo Búsqueda del Tesoro', regla: 'No se repite con el mismo grupo. Usas la estructura de presentación con repaso y juegos.' },
        { situacion: 'Necesitas juegos o actividades online', regla: 'Consulta los recursos oficiales de juegos y actividades antes de preparar la sesión.' },
      ],
      errores: [
        'Llegar al bloque del Challenge sin la actividad preparada.',
        'Repetir Búsqueda del Tesoro en cada Cierre de Nivel.',
        'Recortar práctica en casa para que quepa el juego.',
      ],
    },

    masa: [
      'El calendario del grupo online con las segundas clases marcadas.',
      'El Kahoot del próximo ALOHA Challenge, ya creado.',
      'La estructura de presentación de clase online.',
      'La presentación del próximo Cierre de Nivel online.',
      'La nota de si el grupo ya hizo o no Búsqueda del Tesoro.',
      'Recursos oficiales para juegos, actividades y preguntas frecuentes.',
    ],

    palabras: [
      'aloha-challenge',
      'cierre-de-nivel',
      'class-dojo',
      'practica-en-casa',
      'ficha-de-campeonato',
      'calendario-y-asistencia',
      'coach',
      'drive',
    ],

    bloques: [
      { t: 'sub', texto: 'El Challenge tiene lugar fijo' },
      { t: 'p', texto: 'Dentro de la estructura de clase online, cada segunda clase del grupo tiene como última actividad el ALOHA Challenge. No es un premio si sobra tiempo: es parte de la estructura.' },
      { t: 'nota', tono: 'regla', titulo: 'Los quince minutos incluyen la conexión', texto: 'El tiempo estimado del ALOHA Challenge es de 15 minutos, incluyendo la conexión de los niños a www.kahoot.it y el inicio de la actividad. Si empiezas a preparar la sala en ese momento, ya estás usando el tiempo del juego.' },

      { t: 'sub', texto: 'La segunda clase se prepara antes' },
      {
        t: 'pasos',
        items: [
          'Marca la segunda clase del grupo en tu calendario.',
          'Arma el Kahoot antes de iniciar la clase.',
          'Deja el Challenge como última actividad.',
          'Cuenta los 15 minutos desde que empiezas a conectar a los niños.',
          'Cierra con la indicación de práctica en casa.',
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'La conexión también es clase', texto: 'Esperar a que los niños entren al juego no es un tiempo aparte. Forma parte de los 15 minutos del Challenge.' },

      { t: 'sub', texto: 'Cierre de Nivel online' },
      { t: 'p', texto: 'La Búsqueda del Tesoro se realiza una vez por grupo. Eso quiere decir que en los posteriores Cierres de Nivel del mismo grupo se utiliza como base la misma Estructura de presentación de clase con actividades de repaso y juegos.' },
      {
        t: 'tabla',
        encabezados: ['Situación del grupo', 'Actividad correcta'],
        filas: [
          ['Primer cierre donde no han hecho Búsqueda del Tesoro', 'Se puede usar la Búsqueda del Tesoro.'],
          ['Cierre posterior del mismo grupo', 'Repaso y juegos sobre la misma estructura de presentación.'],
          ['Grupo que necesita variedad', 'Consultar los recursos oficiales antes de preparar juegos o actividades.'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'No quemes la sorpresa dos veces', texto: 'Si repites Búsqueda del Tesoro con el mismo grupo, los niños ya conocen la dinámica y el cierre pierde fuerza frente a los padres.' },
      {
        t: 'recursos',
        titulo: 'Recursos oficiales 7.2',
        recursos: [
          RECURSOS_ONLINE.estructuraClase,
          RECURSOS_ONLINE.estructuraPresentacion,
          RECURSOS_ONLINE.busquedaTesoro,
        ],
      },
      { t: 'sub', texto: 'Materiales y preguntas frecuentes nombradas por el Manual' },
      {
        t: 'recursos',
        titulo: 'Recursos oficiales 7.3',
        recursos: [
          RECURSOS_ONLINE.dossierJuegos,
          RECURSOS_ONLINE.brainGym,
          RECURSOS_ONLINE.guiaBrainGym,
          RECURSOS_ONLINE.brainBreaks,
          RECURSOS_ONLINE.brainBreaksFlashcards,
          RECURSOS_ONLINE.instruccionesBrainBreaks,
          RECURSOS_ONLINE.actividadesKids,
          RECURSOS_ONLINE.guiaActividadesKids,
          RECURSOS_ONLINE.actividadesTinyTots,
          RECURSOS_ONLINE.guiaActividadesTinyTots,
        ],
      },
      {
        t: 'recursos',
        titulo: 'Recursos oficiales 7.5',
        recursos: [
          RECURSOS_ONLINE.faqCoaches,
          RECURSOS_ONLINE.faqPadres,
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Antes de preparar actividades', texto: 'Abre los recursos oficiales correspondientes antes de preparar juegos o actividades. Usa las guías para planificar y los documentos FAQ para consultar dudas.' },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Es la segunda clase del grupo y empieza el bloque del Challenge. Di qué incluye ese tiempo, qué debe quedar como última actividad y qué referencia usarías si necesitas un juego online.' },
    ],

    quiz: [
      {
        pregunta: '¿En qué clase del grupo se realiza el ALOHA Challenge?',
        opciones: ['En cada segunda clase del grupo', 'Solo una vez al mes', 'En cada primera clase', 'Solo cuando lo pida el representante'],
        explicacion: 'El Manual lo fija en cada segunda clase del grupo.',
        repasa: ['aloha-challenge'],
      },
      {
        pregunta: 'Dentro de la estructura de clase, el ALOHA Challenge va como última actividad.',
        opciones: ['Falso', 'Verdadero'],
        explicacion: 'Va al final de la clase, no al inicio ni cuando sobre tiempo.',
      },
      {
        pregunta: '¿Qué incluye el tiempo estimado de quince minutos del ALOHA Challenge?',
        opciones: ['Solo el juego ya iniciado', 'Solo la explicación del Coach', 'La conexión a www.kahoot.it y el inicio de la actividad', 'La práctica en casa'],
        explicacion: 'La conexión entra en los quince minutos. Por eso el juego se deja listo antes.',
      },
      {
        pregunta: '¿Qué significa que el Challenge dure quince minutos incluyendo conexión?',
        opciones: ['Que la conexión a www.kahoot.it cuenta dentro del bloque', 'Que son quince minutos después de conectar', 'Que puede ir al inicio', 'Que no necesita preparación previa'],
        explicacion: 'El tiempo incluye conexión a www.kahoot.it e inicio de la actividad.',
        repasa: ['aloha-challenge'],
      },
      {
        pregunta: '¿Cuántas veces se realiza la Búsqueda del Tesoro con un mismo grupo?',
        opciones: ['Una vez por grupo', 'Una vez por nivel', 'En todos los cierres', 'Dos veces por ciclo'],
        explicacion: 'La instrucción es una vez por grupo.',
        repasa: ['cierre-de-nivel'],
      },
      {
        pregunta: 'Después de que el grupo ya hizo Búsqueda del Tesoro, ¿qué se usa en cierres posteriores?',
        opciones: ['La Búsqueda del Tesoro otra vez', 'La misma actividad con pistas nuevas', 'La misma estructura de presentación con repaso y juegos', 'Solo entrega de certificados'],
        explicacion: 'La base sigue siendo la estructura de presentación de clase, con repaso y juegos.',
      },
      {
        pregunta: '¿Cuál de estos recursos oficiales pertenece a juegos y actividades online?',
        opciones: ['Preguntas frecuentes de los Padres', 'Brain Breaks, flashcards e instrucciones', 'La lista de precios del Centro', 'El formato de nómina'],
        explicacion: 'Brain Breaks, flashcards e instrucciones es un recurso oficial de juegos y actividades. Las FAQ se usan para consultar dudas.',
      },
      {
        pregunta: '¿Qué NO debe hacer el Coach para que quepa el Challenge?',
        opciones: ['Preparar Kahoot antes de clase', 'Marcar las segundas clases en calendario', 'Recortar la práctica en casa por su cuenta', 'Reservar el tiempo completo'],
        explicacion: 'La práctica en casa no desaparece por meter el Challenge. El bloque se prepara y se ejecuta completo.',
        repasa: ['practica-en-casa'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 - Reloj de la segunda clase',
        fuente: 'manual-texto-auditado.md#L2526-L2539',
        proposito: 'Que armes una segunda clase online con el Challenge al final y decidas correctamente el cierre online de ese grupo.',
        gradiente: 'Usa un calendario real. Si no tienes cierre cercano, marca el historial del grupo y di si Búsqueda del Tesoro ya se usó.',
        masa: [
          'Calendario del grupo online.',
          'Kahoot preparado.',
          'Presentación de clase.',
          'Historial de Cierre de Nivel del grupo.',
        ],
        pasos: [
          'Marca la próxima segunda clase del grupo.',
          'Ubica los quince minutos finales y di desde qué momento empiezan a contar.',
          'Muestra el Kahoot listo antes de iniciar.',
          'Explica cómo cerrarás la clase sin saltarte práctica en casa.',
          'Di si ese grupo puede usar Búsqueda del Tesoro en su próximo cierre.',
          'Si ya no puede, nombra qué tipo de repaso y juegos usarás.',
        ],
        criterios: [
          'Cuenta la conexión a www.kahoot.it dentro de los quince minutos del Challenge.',
          'Mantiene el Challenge como última actividad de cada segunda clase.',
          'No repite Búsqueda del Tesoro cuando el grupo ya la hizo.',
          'Conserva la práctica en casa al cerrar la clase.',
        ],
        errorTipico: 'Tratar la conexión a www.kahoot.it como un tiempo aparte. Se delata porque el juego o la práctica en casa terminan recortados.',
      },
    ],
  },

  {
    id: 'of-coa-14',
    curso: 'coach',
    orden: 27,
    roles: ['coach'],
    titulo: 'Online: Class Dojo, portafolio y seguimiento',
    duracionMin: 18,
    requiere: ['of-coa-13'],
    fuente: ['manual-texto-auditado.md#L2570-L2602', 'curso-5-aloha-online#m6-m7'],

    pfv: 'Cada clase online cerrada con asistencia en Drive y Class Dojo, puntos cargados, Historia publicada, portafolios corregidos semanalmente y alertas de ausencia activadas a tiempo.',

    voz: 'La clase online no termina cuando se apaga la cámara. <break time="0.4s"/> Termina cuando dejaste el rastro escrito. <break time="0.4s"/> Asistencia en Drive y en Class Dojo. <break time="0.3s"/> Puntos cargados al finalizar la clase. <break time="0.4s"/> Historia de la Clase con saludo motivador, contenido dado y práctica en casa. <break time="0.5s"/> Si un niño falta, llega tarde o se va temprano dos clases seguidas, <break time="0.3s"/> marcas según la leyenda, informas a la Administradora y escribes al representante por Class Dojo. <break time="0.5s"/> La práctica en casa tiene ritmo: primera clase se asigna, segunda se recuerda y el primer día de la semana siguiente se corrige. <break time="0.5s"/> Después va al portafolio del estudiante. <break time="0.3s"/> Cada semana corriges ese portafolio, escribes retroalimentación real y la subes a la plataforma de cada niño.',

    laminas: [
      {
        kicker: 'Cierre diario',
        titulo: 'Asistencia en dos lugares y puntos al final',
        texto: 'La asistencia va en el formato de Drive y en Class Dojo. Los puntos se cargan al finalizar la clase.',
      },
      {
        kicker: 'Alerta',
        titulo: 'Dos clases seguidas activan protocolo',
        texto: 'Falta, tardanza o salida temprana por dos clases consecutivas exige marcar, informar y contactar al representante.',
      },
      {
        kicker: 'Historia',
        titulo: 'Saludo, contenido y práctica en casa',
        texto: 'La Historia de la Clase se publica al finalizar con saludo motivador, resumen del contenido y práctica asignada.',
        cierre: 'La imagen tomada durante la clase puede adjuntarse, pero no es requisito.',
      },
      {
        kicker: 'Semana',
        titulo: 'La práctica en casa tiene tres momentos',
        items: [
          'Primera clase: se asigna lo que deben comenzar.',
          'Segunda clase: se repite como seguimiento.',
          'Primer día de la semana siguiente: se corrige.',
          'Después de corregir: se pide subirla al portafolio.',
        ],
      },
      {
        kicker: 'Portafolio',
        titulo: 'Solo cuenta de estudiante',
        texto: 'El portafolio está ubicado únicamente en la cuenta de estudiante y se corrige semanalmente.',
        cierre: 'De ahí sale la retroalimentación de cada niño.',
      },
    ],

    sop: {
      proceso: 'Cerrar la clase online y sostener el seguimiento semanal',
      cuando: 'Al finalizar cada clase online, cada semana y cuando un niño acumula dos incidencias seguidas.',
      producto: 'Clase cerrada con asistencia, puntos, Historia, práctica, portafolio al día y retroalimentación semanal subida a la plataforma de cada niño.',
      pasos: [
        'Durante la clase, registra asistencia en el formato de Drive.',
        'Registra la misma asistencia en el grupo correspondiente de Class Dojo.',
        'Carga los puntos de cada niño según la clase dada.',
        'Publica la Historia de la Clase con saludo motivador, contenido dado y práctica en casa.',
        'Si adjuntas imagen de actividad, verifica que corresponda a esa clase.',
        'En la primera clase de la semana, asigna la práctica que deben comenzar.',
        'En la segunda clase, repite la práctica como seguimiento.',
        'El primer día de la semana siguiente, corrige la práctica lista.',
        'Pide al niño o representante subir práctica, videos y fichas al portafolio de la cuenta de estudiante.',
        'Corrige el portafolio semanalmente y usa esa corrección para la retroalimentación de cada niño.',
        'Sube la retroalimentación semanal a la plataforma de cada niño.',
        'Si hay dos faltas, tardanzas o salidas tempranas seguidas, marca según la leyenda, informa a la Administradora y escribe al representante por Class Dojo.',
      ],
      decide: [
        { situacion: 'Dos tardanzas seguidas', regla: 'Cuenta igual que dos faltas para el protocolo: se marca, se informa y se contacta al representante.' },
        { situacion: 'El representante no ve el portafolio', regla: 'Revisa que lo esté buscando desde la cuenta de estudiante, porque ahí es donde vive el portafolio.' },
        { situacion: 'No corregiste portafolios esa semana', regla: 'No inventes retroalimentación genérica. Corrige primero y escribe con base en lo revisado.' },
      ],
      errores: [
        'Marcar asistencia solo en Drive y olvidar Class Dojo.',
        'Escribir la misma retroalimentación para todos porque no se corrigió el portafolio.',
        'Esperar a la tercera falta para avisar, cuando el protocolo se activa con dos seguidas.',
      ],
    },

    masa: [
      'El formato de asistencia en Drive.',
      'El grupo de Class Dojo abierto.',
      'La Historia de la Clase de la última sesión.',
      'El portafolio de dos estudiantes.',
      'La Plantilla de Retroalimentación semanal.',
      'La práctica en casa corregida de la semana.',
    ],

    palabras: [
      'class-dojo',
      'drive',
      'historia-de-la-clase',
      'practica-en-casa',
      'portafolio',
      'plantilla-de-retroalimentacion',
      'representante',
      'ficha-de-campeonato',
      'coach',
    ],

    bloques: [
      { t: 'sub', texto: 'Lo que se registra al finalizar la clase' },
      { t: 'p', texto: 'Al momento de dar la clase online, el Coach coloca la asistencia en su formato de Drive y aparte en el grupo respectivo de Class Dojo. Al finalizar la clase, asigna los puntos correspondientes a cada niño según la clase dada.' },
      {
        t: 'tabla',
        encabezados: ['Qué', 'Dónde', 'Cuándo'],
        filas: [
          ['Asistencia', 'Formato de Drive', 'Al momento de dar la clase.'],
          ['Asistencia', 'Grupo de Class Dojo', 'La misma clase.'],
          ['Puntos', 'Class Dojo', 'Al finalizar la clase.'],
          ['Historia de la Clase', 'Class Dojo', 'Al finalizar la clase.'],
        ],
      },

      { t: 'sub', texto: 'Ausencias, tardanzas y salidas tempranas' },
      { t: 'p', texto: 'Si algún niño falta, llega tarde o se va temprano a 2 clases seguidas, se le coloca en el formato de asistencia según la leyenda y se informa al Administrador de Centro.' },
      { t: 'p', texto: 'Luego se procede a comunicarse con el representante por Class Dojo, saludando y preguntando amablemente la razón de las ausencias o tardanzas. La comunicación debe ser transparente entre Coach, Administrador y representante, porque el objetivo es buscar solución.' },
      { t: 'nota', tono: 'alerta', titulo: 'Irse temprano también cuenta', texto: 'El disparador no es solo faltar. Llegar tarde o irse temprano dos clases seguidas activa el mismo protocolo.' },

      { t: 'sub', texto: 'Historia de la Clase' },
      { t: 'p', texto: 'Al finalizar la clase online, el Coach coloca una breve información pertinente al contenido dado y lo que toca hacer de práctica en casa. Ese párrafo comienza con un saludo de motivación a los niños.' },
      { t: 'nota', tono: 'ojo', titulo: 'La imagen es opcional', texto: 'El Manual dice que la información puede tener adjunta una imagen tomada durante la clase. Puede, no debe. No conviertas una opción en requisito.' },

      { t: 'sub', texto: 'Práctica en casa y portafolio' },
      {
        t: 'tabla',
        encabezados: ['Momento', 'Acción del Coach'],
        filas: [
          ['Primera clase', 'Indica qué asignación deben comenzar.'],
          ['Segunda clase', 'La repite como seguimiento.'],
          ['Primer día de la semana siguiente', 'Corrige la práctica ya lista.'],
          ['Después de corregir', 'Pide subirla al portafolio de Class Dojo.'],
        ],
      },
      { t: 'p', texto: 'El portafolio de Class Dojo está ubicado únicamente en la cuenta de estudiante. También se piden subir videos practicando en casa, fichas de campeonato y otras actividades.' },
      { t: 'nota', tono: 'regla', titulo: 'La retroalimentación sale de lo corregido', texto: 'La Plantilla de Retroalimentación se realiza semanalmente para cada niño, tomando puntos a mejorar y fortalezas. Después se sube a la plataforma de cada niño.' },
      {
        t: 'recursos',
        titulo: 'Recurso oficial 7.4',
        recursos: [RECURSOS_ONLINE.plantillaRetroalimentacion],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'Un niño se fue temprano dos clases seguidas y su representante dice que nunca le avisaron. Escribe qué debió quedar en Drive, qué debió quedar en Class Dojo y qué mensaje correspondía enviar.' },
    ],

    quiz: [
      {
        pregunta: '¿Dónde registra el Coach la asistencia de una clase online?',
        opciones: ['Solo en Class Dojo', 'Solo en la bitácora', 'Solo en el chat', 'En el formato de Drive y en Class Dojo'],
        explicacion: 'El Manual pide ambos lugares: Drive y el grupo respectivo de Class Dojo.',
        repasa: ['drive', 'class-dojo'],
      },
      {
        pregunta: '¿Cuándo se asignan los puntos correspondientes a cada niño?',
        opciones: ['Al finalizar la clase', 'Al final de la semana', 'Al cierre del nivel', 'Cuando el representante pregunte'],
        explicacion: 'Los puntos se asignan al finalizar la clase, según la clase dada.',
        repasa: ['class-dojo'],
      },
      {
        pregunta: '¿Qué activa el protocolo de ausencias y tardanzas?',
        opciones: ['Cinco tardanzas en el nivel', 'Una falta aislada', 'Faltar, llegar tarde o irse temprano a 2 clases seguidas', 'No prender la cámara una vez'],
        explicacion: 'El disparador exacto es dos clases seguidas con falta, tardanza o salida temprana.',
      },
      {
        pregunta: 'Después de marcar al niño según la leyenda por dos incidencias seguidas, ¿qué corresponde?',
        opciones: ['Esperar a la tercera incidencia', 'Bajarle puntos y cerrar', 'Llamar desde tu número personal', 'Informar al Administrador y escribir al representante por Class Dojo'],
        explicacion: 'La comunicación va con Administrador informado y representante contactado por Class Dojo.',
        repasa: ['representante'],
      },
      {
        pregunta: '¿Qué debe contener la Historia de la Clase?',
        opciones: ['Saludo motivador, contenido dado y práctica en casa', 'La factura del mes', 'Solo la lista de asistencia', 'El plan completo del nivel'],
        explicacion: 'Es breve, con saludo de motivación a los niños, contenido dado y práctica en casa.',
        repasa: ['historia-de-la-clase'],
      },
      {
        pregunta: 'La imagen tomada durante la clase puede adjuntarse a la Historia de la Clase, pero no es requisito.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'El Manual dice que puede adjuntarse. Es opcional.',
      },
      {
        pregunta: '¿Dónde está ubicado el portafolio de Class Dojo?',
        opciones: ['En el muro general del grupo', 'En la cuenta del representante', 'Únicamente en la cuenta de estudiante', 'En el Drive del Centro'],
        explicacion: 'Está únicamente en la cuenta de estudiante.',
        repasa: ['portafolio'],
      },
      {
        pregunta: '¿Con qué frecuencia corrige el Coach el contenido del portafolio?',
        opciones: ['Cada cierre de nivel', 'Diariamente', 'Semanalmente', 'Cuando el padre reclama'],
        explicacion: 'Se corrige semanalmente y esa revisión alimenta la retroalimentación.',
        repasa: ['plantilla-de-retroalimentacion'],
      },
      {
        pregunta: 'En la práctica en casa, ¿qué pasa el primer día de la semana siguiente?',
        opciones: ['Se asigna por primera vez', 'Se corrige la práctica lista', 'Se elimina del portafolio', 'Se borra del seguimiento'],
        explicacion: 'Primera clase se asigna, segunda se recuerda y al primer día de la semana siguiente se corrige.',
        repasa: ['practica-en-casa'],
      },
      {
        pregunta: 'Además de la práctica en casa, ¿qué puede pedirse subir al portafolio?',
        opciones: ['Contratos y facturas', 'Videos practicando en casa y fichas de campeonato', 'La nómina del Coach', 'El calendario de todo el Centro'],
        explicacion: 'El Manual menciona videos practicando en casa, fichas de campeonato y otras actividades.',
        repasa: ['ficha-de-campeonato'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 - Cierre escrito de la clase',
        fuente: 'manual-texto-auditado.md#L2572-L2591',
        proposito: 'Que cierres una clase online con asistencia, puntos, Historia, práctica y portafolio sin dejar huecos de seguimiento.',
        gradiente: 'Se hace con una clase real reciente. Si no tienes grupo online, usa un caso de entrenamiento con datos ficticios aprobados por tu Administradora.',
        masa: [
          'Formato de asistencia en Drive.',
          'Grupo de Class Dojo.',
          'Historia de la Clase.',
          'Portafolio de dos estudiantes.',
          'Plantilla de Retroalimentación.',
        ],
        pasos: [
          'Muestra la asistencia registrada en Drive.',
          'Muestra la misma asistencia en Class Dojo.',
          'Muestra puntos cargados al finalizar la clase.',
          'Lee la Historia de la Clase y verifica saludo, contenido y práctica.',
          'Toma dos estudiantes y revisa si su portafolio está corregido esta semana.',
          'Redacta una retroalimentación breve para cada uno con fortaleza y punto a mejorar.',
          'Muestra dónde queda subida esa retroalimentación en la plataforma de cada niño.',
          'Revisa si alguien tiene dos faltas, tardanzas o salidas tempranas seguidas.',
          'Si existe, escribe el mensaje al representante por Class Dojo e indica a quién informaste.',
        ],
        criterios: [
          'La asistencia aparece tanto en Drive como en Class Dojo para la misma clase.',
          'La Historia de la Clase tiene saludo motivador, contenido dado y práctica en casa.',
          'La retroalimentación sale de portafolios corregidos, no de frases genéricas.',
          'La retroalimentación semanal queda subida a la plataforma de cada niño.',
          'Activa el protocolo con dos incidencias seguidas, incluyendo salida temprana.',
        ],
        errorTipico: 'Dejar el seguimiento para el fin de semana. Se delata porque no hay puntos al cierre, la Historia sale tarde y la retroalimentación parece copiada.',
      },
    ],
  },
]
