// Bloque A — Normativa de la empresa. Obligatoria para los dos roles.
// Convertido desde curso-3-normativa.html (m0..m9) y curso-3-normativa.gift (75 preguntas) por el frente de contenido y revisado a mano.
// Los `id` son la clave de progreso en entrenamiento_progreso.modulo:
// renombrar uno BORRA el avance de todo el mundo. No se renumeran nunca.
// Los índices correctos del quiz viven en lib/entrenamiento/respuestas-oficio/normativa.js (solo servidor).
// ── VOCABULARIO: Entrenamiento a Bordo ────────────────────────────────────
// Aquí se renombró solo lo VISIBLE. Los identificadores NO se tocaron: los
// campos `drills`, `masa`, `gradiente`, `pfv`, los ids `of-*` y las anclas de
// `fuente` siguen exactamente igual, y por eso los HTML congelados de
// docs/entrenamiento/fuente/ siguen diciendo "Drill" y "masa": son la fuente
// original, no un desvío del módulo.
//   drill → maniobra          · masa → a la vista (largo: lo que va a la vista)
//   gradiente → el orden      · hat → puesto (largo: tu puesto a bordo)
//   checksheet → tu plan (largo: tu plan de puesto)
//   PFV / producto final valioso → tu producto (largo: el producto de tu puesto)
//   Oficial de Entrenamiento → jefe entrenador
//   palabra malentendida → palabra sin aclarar
// Sin cambio: "aclaración de palabras", "Demostración" (paso del plan Y cierre
// de nivel de ALOHA), "el cuestionario", "el Manual de Operaciones".
// Palabras quemadas que NO se usan para nada nuevo: bitácora, escala/escalón/
// escalar, demostración, ruta, tramo, prueba, entrega, ciclo, nivel, kit.
// La cabecera completa vive en ./metodo.js y en
// docs/entrenamiento/fuente/glosario-aloha.md.
// Estos 35 módulos son operativos: cifras, plazos, montos, pasos y guiones van
// LITERALES, y no llevan ni una imagen marítima. El vocabulario sí; la
// imaginería no.

export const NORMATIVA = [
  // minimoAprobacion(10) = 8 de 10. No se escribe: lo calcula el motor.
  {
    id: 'of-nor-1',
    curso: 'normativa',
    orden: 4,
    roles: ['administradora', 'asistente'],
    titulo: 'Quiénes somos',
    // 18 y no 12: con "Ciclos dentro del Programa" el cuerpo creció un 60 %
    // (de 764 a más de 1.200 palabras), más dos láminas, una tabla y la maniobra.
    // La portada y el índice del puesto prometen estos minutos y con ellos la
    // administradora planifica la semana de entrenamiento.
    duracionMin: 18,
    requiere: ['of-met-3'],
    fuente: ['curso-3-normativa.html#m0', 'curso-3-normativa.html#m1'],
    pfv: 'Puedes decir de dónde viene ALOHA, qué defiende y de qué responde tu cargo delante de un padre, sin leerlo, y separarle el Ciclo del Programa del ciclo de matrícula que le facturaste sin decir que ningún papel de la empresa está mal.',
    voz: 'Este es el módulo con el que empieza todo. <break time="0.4s"/> Aquí no vas a aprender un procedimiento. Vas a poder contar de dónde viene ALOHA. <break time="0.3s"/> Nació en Malasia, en mil novecientos noventa y tres. Y se apoya en un método que en China y Taiwán tiene más de novecientos años. <break time="0.4s"/> Hoy el programa está en más de cuarenta países. Panamá entró de número treinta y tres. <break time="0.5s"/> Lo importante viene ahora. Los valores caben en la propia palabra ALOHA. Amor, lograr, objetivos, honestidad, autocontrol. <break time="0.3s"/> Y el Dojo Kun es del NIÑO, no tuyo. Que quede claro, porque ahí se equivoca casi todo el mundo. <break time="0.4s"/> Falta una palabra que te va a dar guerra. Ciclo. <break time="0.3s"/> En ALOHA nombra dos cosas distintas, y las dos son oficiales. <break time="0.4s"/> El Ciclo del Programa es lo que el niño aprende. Y el ciclo de matrícula es lo que el padre pagó. <break time="0.4s"/> Por eso la web dice un número y la factura dice otro. <break time="0.3s"/> Ninguna de las dos está mal. <break time="0.5s"/> Cuando termines, un padre te pregunta qué es esto y tú se lo cuentas sin leer nada. <break time="0.3s"/> Y si te llega con los tres números en la mano, se los separas sin desautorizar ni un papel de la empresa.',
    masa: [
      'El Manual de Operaciones de tu Centro, abierto en el prólogo.',
      'Los cinco puntos del Dojo Kun a la vista, tal como se les enseñan a los niños.',
      'Papel y lápiz para la reflexión del cierre: una situación real de tu semana pasada.',
      'Una factura real de matrícula de tu Centro, donde se lea "1er ciclo" y el número de niveles.',
    ],
    palabras: [
      'aloha-mental-arithmetic',
      'dojo-kun',
      'administrador-de-centro',
      'asistente-administrativo',
      'colaborador',
      // Entran las dos con "Ciclos dentro del Programa". 'ciclo' es el del
      // Programa (Ciclo 1 y Ciclo 2, la web); 'ciclo-de-matricula' es el
      // paquete que el padre pagó (el Manual y Zoho). Las dos tarjetas tienen
      // que estar arriba: es la confusión que el padre trae a la recepción.
      'ciclo',
      'ciclo-de-matricula',
      'nivel',
      // La tabla nueva se lee por itinerario y el guion se apoya en una
      // factura que dice "1er ciclo": las dos palabras se estrenaban aquí sin
      // tarjeta y quedaban cupos libres.
      'itinerario',
      'primer-ciclo',
    ],
    laminas: [
      {
        kicker: 'Historia',
        titulo: 'De dónde viene ALOHA',
        items: [
          'ALOHA: Abacus Learning of Higher Arithmetic, el ábaco para una aritmética superior.',
          'Nació en Malasia en 1993. Su fundador es el Sr. Loh Mun Sun.',
          'Se inspira en el método de China y Taiwán, de hace más de 900 años.',
          'Hoy está en más de 40 países de los 5 continentes.',
          'Panamá fue el país número 33 en incorporarse.',
        ],
      },
      {
        kicker: 'Valores',
        titulo: 'Los valores caben en la palabra ALOHA',
        items: [
          'A de Amor hacia el trabajo, los compañeros y los clientes.',
          'L de Lograr superarse y ser mejor cada día.',
          'O de Objetivos claros y respeto a los procesos establecidos.',
          'H de Honestidad, rectitud al actuar.',
          'A de Autocontrol.',
        ],
      },
      {
        kicker: 'Hacia dónde vamos',
        titulo: 'Visión y misión',
        items: [
          'Visión: impulsar a los estudiantes de 4 a 13 años con el ábaco.',
          'Misión: impactar a la mayor cantidad de niños con un desarrollo integral.',
          'Lo que ALOHA añadió al método fueron juegos estructurados.',
        ],
      },
      {
        titulo: 'ALOHA Dojo Kun: lo que se le exige al niño',
        items: [
          'Me supero día a día.',
          'Mantengo orden y limpieza.',
          'Soy puntual, constante y disciplinado.',
          'Soy humilde y ayudo a los demás.',
          'Practico autocontrol.',
        ],
        cierre: 'La frase del fundador cierra el punto: siempre haz tu mejor esfuerzo. No es decoración del salón.',
      },
      // El punto "Ciclos dentro del Programa" del índice del Manual tiene que
      // estar en bloque A, que llevan los dos puestos. Va en dos láminas
      // porque "ciclo" nombra dos cosas distintas y las dos son oficiales: la
      // etapa del Programa (web) y el paquete que se cobra (Manual y Zoho).
      {
        kicker: 'Ciclos del Programa',
        titulo: 'Cada itinerario está dividido en dos Ciclos',
        items: [
          'Ciclo 1: niveles 1 al 4, igual en Tiny Tots y en Kids.',
          'Ciclo 2: niveles 5 al 10 en Tiny Tots; niveles 5 al 8 en Kids.',
          'Tiny Tots tiene 10 niveles en total. Kids tiene 8.',
          'Kinder es preescolar: no lleva esta numeración de ciclos.',
        ],
        cierre: 'Así lo publica la web oficial de la empresa: alohapanama.com/program.',
      },
      {
        kicker: 'Ciclo de matrícula',
        titulo: 'Y "ciclo" en la factura es otra cosa',
        items: [
          'Es el paquete de niveles que el padre compró, no la etapa del Programa.',
          'El Manual describe el caso normal: la matrícula cubre 2 niveles.',
          'En Zoho el artículo puede ser de 1, 2 o 3 niveles: se factura el contratado.',
          'Un nivel dura 19 a 22 semanas, unos 5 meses según calendario.',
        ],
        cierre: 'El calendario del grupo se arma en bloques de dos niveles, iguales para todos.',
      },
      {
        kicker: 'Tu cargo',
        titulo: 'De qué responde cada quien',
        items: [
          'Administrador: verificar que se utilicen las herramientas que se han brindado.',
          'Asistente Administrativo: velar por la aplicación de las normas del Centro.',
          'Áreas: operativa, administrativa, ejecutiva, aseo y mantenimiento.',
        ],
        cierre: 'Al cerrar puedes decirle a un padre de dónde viene ALOHA y qué defiende, sin leerlo.',
      },
    ],
    sop: {
      proceso: 'Responder qué es ALOHA cuando alguien pregunta',
      cuando: 'Cada vez que un representante, un visitante o un candidato pregunta qué es ALOHA.',
      producto: 'La misma respuesta institucional en cualquier Centro, dicha sin leer, y el Ciclo del Programa separado del ciclo de matrícula cuando el padre los mezcla.',
      pasos: [
        'Di el nombre completo: ALOHA Mental Arithmetic, Abacus Learning of Higher Arithmetic, el aprendizaje del ábaco para una aritmética superior.',
        'Ubica el origen: nació en Malasia en 1993, de la mano del Sr. Loh Mun Sun, sobre el método que se seguía en China y Taiwán desde hace más de 900 años.',
        'Da el tamaño: más de 40 países en los 5 continentes; Panamá fue el país número 33.',
        'Nombra la visión: impulsar a los estudiantes de 4 a 13 años a crecer y desarrollarse con el ábaco.',
        'Nombra los valores por la palabra ALOHA: Amor, Lograr, Objetivos, Honestidad, Autocontrol.',
        'Explica el Dojo Kun como lo que se le pide al estudiante, no al colaborador, y di los cinco puntos.',
        'Cierra con lo que responde tu cargo, y remite a la Administradora cualquier tema del niño.',
        'Si confronta la web con su factura, separa los dos sentidos antes de defender el precio: el Ciclo del Programa es lo que el niño aprende (Ciclo 1, niveles 1 al 4; Ciclo 2, del 5 al 10 en Tiny Tots y del 5 al 8 en Kids); el ciclo de matrícula son los niveles que él contrató.',
        'Y quítale el miedo: los niveles que compró se le dan completos y al terminarlos matricula el siguiente tramo. Nunca digas que la web está mal ni que la factura está mal.',
      ],
      decide: [
        { situacion: 'Te preguntan por una situación de su hijo', regla: 'Sale de este guion: la Administradora del Centro es la única encargada de responder por una situación que involucra al padre.' },
        { situacion: 'No sabes la respuesta', regla: 'Discútelo abiertamente con tu superior inmediato para obtener asesoramiento. Preguntar nunca es la falta.' },
        { situacion: 'El dato no está en el Manual', regla: 'No lo improvises: la información que sale de tu mano debe ser veraz, precisa, completa y verificable.' },
      ],
      errores: [
        'Presentar el Dojo Kun como reglas del colaborador: es del estudiante.',
        'Decir que ALOHA nació en China: nació en Malasia en 1993, inspirado en China y Taiwán.',
        'Cruzar las responsabilidades: el Administrador verifica las herramientas, el Asistente vela por las normas.',
      ],
    },
    bloques: [
      {
        t: 'p',
        texto: 'Este curso reúne las normas que aplican a **todo colaborador** de ALOHA Mental Arithmetic, sin importar el cargo. No es letra menuda: son las reglas que sostienen la marca frente a los padres, frente al corporativo y frente a la ley.',
      },
      {
        t: 'p',
        texto: 'Al terminar el curso deberías poder responder tres preguntas sin dudar: qué se espera de mí, qué no puedo hacer nunca, y a quién acudo cuando no sé.',
      },
      { t: 'sub', texto: 'Prólogo del Manual' },
      {
        t: 'p',
        texto: 'La finalidad del Manual es lograr mayor eficiencia, optimización de los recursos y coordinación de acciones y esfuerzos para el logro de los objetivos y metas del Programa ALOHA Mental Arithmetic. Es una guía clara y específica que garantiza la óptima operación del Centro, y un instrumento de apoyo y mejora.',
      },
      {
        t: 'p',
        texto: 'Está sujeto a actualización cada vez que cambien los procedimientos, la normativa, la estructura del Programa o cualquier aspecto que influya en su operatividad.',
      },
      { t: 'sub', texto: 'Objetivo del Manual' },
      {
        t: 'p',
        texto: 'El objetivo del Manual de Procedimientos Administrativos de los Centros ALOHA Mental Arithmetic Panamá es **recopilar todas las normas y procedimientos establecidos para el buen funcionamiento del Centro**, con el fin de manejar el mismo de una forma óptima, ética y profesional.',
      },
      { t: 'sub', texto: 'De dónde viene el nombre' },
      {
        t: 'p',
        texto: '**ALOHA** son las siglas en inglés de Abacus Learning of Higher Arithmetic: el aprendizaje del ábaco para una aritmética superior.',
      },
      { t: 'sub', texto: 'Historia' },
      {
        t: 'p',
        texto: 'El programa ALOHA Mental Arithmetic nació en **Malasia en 1993**, inspirándose en el método que se seguía en China y Taiwán desde hace más de 900 años, y le añadió juegos estructurados para mejorar habilidades cognitivas específicas y potenciar la transformación neuronal en el cerebro de los niños. Su fundador es el **Sr. Loh Mun Sun**.',
      },
      {
        t: 'p',
        texto: 'Por el impacto que tuvo en Malasia, el método se extendió hasta convertirse en el Programa de Desarrollo Mental que existe hoy en **más de 40 países en los 5 continentes**. Panamá fue el **país número 33** en incorporarse.',
      },
      { t: 'sub', texto: 'Los valores: la palabra ALOHA' },
      {
        t: 'tabla',
        encabezados: ['Letra', 'Valor'],
        filas: [
          [
            'A',
            '**Amor** hacia nuestro trabajo, nuestros compañeros y nuestros clientes.',
          ],
          [
            'L',
            '**Lograr** superarse, ser mejor cada día y hacer de nuestro desempeño nuestro sello personal.',
          ],
          [
            'O',
            '**Objetivos** claros y respeto a los procesos establecidos.',
          ],
          ['H', '**Honestidad**, rectitud al actuar.'],
          ['A', '**Autocontrol.**'],
        ],
      },
      { t: 'sub', texto: 'Visión' },
      {
        t: 'p',
        texto: 'El concepto de ALOHA Mental Arithmetic está basado en el uso de una herramienta: **el ábaco**. Esta herramienta milenaria es esencial para incrementar la habilidad de calcular mentalmente, de manera fácil y rápida, operaciones largas, y desarrolla habilidades esenciales en el cerebro del niño en sus años formativos. La visión es **impulsar a los estudiantes de 4 a 13 años** a crecer y desarrollarse exitosamente con este concepto.',
      },
      { t: 'sub', texto: 'Misión' },
      {
        t: 'p',
        texto: 'Impactar a la mayor cantidad de niños posible para que alcancen un desarrollo integral, mediante el compromiso del equipo de trabajo en el perfeccionamiento de las técnicas y herramientas del Programa.',
      },
      { t: 'sub', texto: 'ALOHA Dojo Kun' },
      {
        t: 'p',
        texto: 'Conjunto de normas y principios que todo estudiante de ALOHA debe cumplir y aplicar, no solo en sus clases sino en su vida cotidiana.',
      },
      {
        t: 'pasos',
        items: [
          'Me supero día a día.',
          'Mantengo orden y limpieza.',
          'Soy puntual, constante y disciplinado.',
          'Soy humilde y ayudo a los demás.',
          'Practico autocontrol.',
        ],
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Siempre haz tu mejor esfuerzo',
        texto: 'Es la frase de Loh Mun Sun, fundador de ALOHA. El Dojo Kun no es decoración del salón: es lo que se le exige al niño y lo que se espera de ti.',
      },
      // "Ciclos dentro del Programa" es un punto del índice del Manual y estaba
      // escrito SOLO en of-cen-1, que es del curso `centro` y por tanto solo de
      // la Administradora: la Asistente no lo veía en ningún módulo, y es ella
      // quien factura "1er ciclo Matrícula" y quien tiene que explicarle al
      // padre el costo del primer ciclo completo (Manual, charla de padres).
      // Aquí va en bloque A, que llevan los dos puestos, en el mismo lugar del
      // índice del Manual: después del Dojo Kun y antes de Responsables.
      //
      // DECISIÓN DE FERNANDO (opción B, 2026-09-04): "ciclo" nombra DOS cosas
      // en ALOHA y las dos fuentes son oficiales; ninguna se corrige. El
      // entrenamiento entrega las dos palabras separadas — Ciclo del Programa
      // (alohapanama.com/program) y ciclo de matrícula (Manual + catálogo de
      // Zoho) — más la frase con la que la asistente desarma la confusión
      // delante del padre. De paso queda resuelto lo que el Manual parecía
      // contradecir (nivel 1-8, niveles 2-10, niveles 1 al 10): no se
      // contradice, mezclaba los dos itinerarios sin nombrarlos. 1 al 8 es
      // KIDS y 1 al 10 es TINY TOTS.
      { t: 'sub', texto: 'Ciclos dentro del Programa' },
      {
        t: 'p',
        texto: 'Cuidado con esta palabra, porque en ALOHA nombra dos cosas distintas y las dos son oficiales. Una es el **Ciclo del Programa**, que es aprendizaje. La otra es el **ciclo de matrícula**, que es lo que el padre paga. Tienes que manejar las dos, porque el padre te las va a mezclar de frente.',
      },
      {
        t: 'p',
        texto: 'El **Ciclo del Programa**: cada itinerario está dividido en dos ciclos, y en cada uno el niño completa distintos niveles de aprendizaje. Así lo publica la web oficial de la empresa, alohapanama.com/program.',
      },
      {
        t: 'tabla',
        titulo: 'Los dos Ciclos del Programa, por itinerario',
        encabezados: ['Ciclo, y qué se aprende en él', 'Tiny Tots (5 a 7 años)', 'Kids (8 a 13 años)'],
        filas: [
          ['Ciclo 1 — fundamentos del cálculo con ábaco y de la aritmética mental', 'Niveles 1, 2, 3 y 4', 'Niveles 1, 2, 3 y 4'],
          ['Ciclo 2 — potenciación de la aritmética mental y estimulación máxima de las capacidades intelectuales', 'Niveles 5, 6, 7, 8, 9 y 10', 'Niveles 5, 6, 7 y 8'],
          ['Niveles en todo el itinerario', '10 niveles', '8 niveles'],
        ],
      },
      {
        t: 'p',
        texto: '**Kinder Tiny Tots**, alrededor de los 4 años, es preescolar y prepara para Tiny Tots: con él las tres franjas cubren los 4 a 13 años de la visión. La web no le asigna esta numeración de ciclos, así que no le inventes un Ciclo 1 ni un Ciclo 2 a un padre de Kinder, ni un número de niveles: ese dato lo confirma el corporativo.',
      },
      {
        t: 'p',
        texto: 'El **ciclo de matrícula** es otra cosa: es el paquete de niveles que ese padre compró, y es la unidad con la que se **cobra**. El Manual describe el caso normal, una matrícula anual que comprende **2 niveles**. Pero en el catálogo de Zoho no siempre son dos: hay artículos de "1er ciclo Matrícula" de 1, 2 y 3 niveles, y las matrículas se numeran **1er ciclo, 2do Ciclo, 3er Ciclo** y así. Factura los niveles que el padre contrató, no los que tú supones.',
      },
      {
        t: 'lista',
        items: [
          'Cada nivel dura aproximadamente **5 meses (19 a 22 semanas de clases)**, según calendario y días libres.',
          'Las **2 primeras semanas son de inducción**: permiten incorporar niños nuevos si el grupo no está completo, y asegurar que la base esté dominada antes de la semana 1 del libro.',
          'En **diciembre** las últimas dos semanas son vacaciones.',
          'El calendario del grupo se arma en **bloques de dos niveles**, iguales para todo el grupo: eso no cambia por lo que haya comprado cada padre. Lo que varía padre por padre es cuántos niveles le cubre su matrícula.',
          '**No se deja semana de vacaciones dentro de los dos niveles de un mismo bloque.** Al cerrar el bloque y pasar al siguiente, sí. Ejemplo: no hay vacaciones entre nivel 1 y 2; al terminar el 2 y pasar al 3, se deja una semana.',
          'El nivel siguiente **arranca en el mismo mes en que cierra el anterior**. Correrlo al mes siguiente le deja al Centro un mes sin mensualidades de ese grupo.',
        ],
      },
      // El guion iba dentro de una nota de 686 caracteres, la segunda más larga
      // de las 91 del entrenamiento y en el formato que menos se escanea. Va
      // en `pasos`, que es el bloque que se lee en orden, y con su propio
      // `sub` para que el temario lo anuncie: la línea del índice decía
      // "Ciclos dentro del Programa", que suena a teoría y no a "qué le digo".
      { t: 'sub', texto: 'Qué le dices al padre que trae los tres números' },
      {
        t: 'p',
        texto: 'Te va a pasar: el padre leyó en la web que el Ciclo 2 tiene seis niveles, en la recepción le hablaron de un ciclo de dos, y la factura le dice "1er ciclo, 3 niveles". Tres papeles de la misma empresa con tres números, y él llega preguntando si le están cobrando la mitad. Va en este orden:',
      },
      {
        t: 'pasos',
        items: [
          'Sepáralo antes de defender ningún precio: "Son dos cosas distintas, señora, y las dos dicen la verdad."',
          'Primero el Programa, con el número exacto del itinerario de su hijo: "El Programa está dividido en dos Ciclos. El Ciclo 1 son los niveles 1 al 4. El **Ciclo 2 es del 5 al 10 si su hijo está en Tiny Tots, o del 5 al 8 si está en Kids**. Eso es lo que el niño aprende."',
          'Después lo que ella pagó: "Lo que usted contrató es otra cosa: son tres niveles. Su hijo empieza en el nivel 1, que está dentro del Ciclo 1, y lo que pagó le alcanza hasta el nivel 3."',
          'Y cierra el hueco antes de que lo abra ella: "**No le estamos cobrando la mitad de nada.** Usted compró tres niveles y esos tres se los damos completos. Cuando su hijo los termine, usted matricula el siguiente tramo y sigue avanzando; el Ciclo 2 lo alcanza más adelante, sin perder nada de lo que pagó."',
          'Si te pregunta cuándo son las vacaciones de su hijo, contéstale con el calendario del grupo y no con su factura: el grupo descansa una semana al cerrar cada bloque de dos niveles.',
        ],
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Ningún papel de la empresa está mal',
        texto: 'Nunca le digas al padre que la web está equivocada, ni que la factura está equivocada. La web habla del Ciclo del Programa y la factura del ciclo de matrícula: cada una dice la verdad de una cosa distinta. Desautorizar un papel de la empresa delante de un representante cuesta más caro que el número que estaban discutiendo.',
      },
      { t: 'sub', texto: 'Responsables y áreas de aplicación' },
      {
        t: 'tabla',
        encabezados: ['Responsable', 'De qué responde'],
        filas: [
          [
            'Administrador',
            'Verificar que se utilicen las herramientas que se han brindado',
          ],
          [
            'Asistente Administrativo',
            'Velar por la aplicación de las normas establecidas para el debido funcionamiento del Centro',
          ],
        ],
      },
      {
        t: 'p',
        texto: '**Áreas de aplicación:** operativa, administrativa, ejecutiva, aseo y mantenimiento.',
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Reflexión de cierre',
        texto: 'Elige uno de los cinco puntos del Dojo Kun y describe una situación concreta de tu trabajo de la semana pasada donde lo aplicaste, o donde debiste aplicarlo y no lo hiciste.',
      },
    ],
    quiz: [
      {
        pregunta: 'ALOHA son las siglas en inglés de…',
        opciones: [
          'Abacus Learning of Higher Arithmetic',
          'Advanced Learning of Higher Arithmetic',
          'Abacus Learning of Human Arithmetic',
          'Academy of Learning and Higher Arithmetic',
        ],
        explicacion: 'El aprendizaje del ábaco para una aritmética superior.',
        repasa: ['aloha-mental-arithmetic'],
      },
      {
        pregunta: 'El programa ALOHA Mental Arithmetic nació en…',
        opciones: [
          'China, en 1993',
          'Malasia, en 1993',
          'Taiwán, hace 900 años',
          'Panamá, en 2005',
        ],
        explicacion: 'Nació en Malasia en 1993, inspirándose en el método que se seguía en China y Taiwán desde hace más de 900 años.',
      },
      {
        pregunta: 'El fundador de ALOHA es el Sr. Loh Mun Sun.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Suya es también la frase que cierra el capítulo: "Siempre haz tu mejor esfuerzo".',
      },
      {
        pregunta: 'Panamá fue el país número…',
        opciones: ['1', '40', '10', '33 en incorporarse al programa'],
        explicacion: 'El programa existe hoy en más de 40 países en los 5 continentes; Panamá entró de número 33.',
      },
      {
        pregunta: 'En los valores ALOHA, la letra O corresponde a…',
        opciones: [
          'Objetivos claros y respeto a los procesos establecidos',
          'Orden y limpieza',
          'Orientación al logro',
          'Optimización de recursos',
        ],
        explicacion: 'Orden y limpieza es un punto del Dojo Kun, que es otra cosa: el Dojo Kun es para el estudiante.',
        repasa: ['dojo-kun'],
      },
      {
        pregunta: 'En los valores ALOHA, la letra H corresponde a Honestidad, rectitud al actuar.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'A de Amor, L de Lograr, O de Objetivos, H de Honestidad, A de Autocontrol.',
      },
      {
        pregunta: 'La visión de ALOHA se enfoca en impulsar a estudiantes de…',
        opciones: ['3 a 10 años', '5 a 15 años', '4 a 13 años', '6 a 12 años'],
        explicacion: 'Son los años formativos en los que el programa desarrolla habilidades esenciales en el cerebro del niño.',
      },
      {
        pregunta: '¿Cuál NO es uno de los cinco puntos del ALOHA Dojo Kun?',
        opciones: [
          'Me supero día a día',
          'Mantengo orden y limpieza',
          'Practico autocontrol',
          'Cumplo el horario de la empresa',
        ],
        explicacion: 'El Dojo Kun es del estudiante, no del colaborador: son cinco principios de vida, no reglas laborales.',
        repasa: ['dojo-kun'],
      },
      {
        pregunta: 'Según el Manual, ¿quién debe velar por la aplicación de las normas establecidas para el debido funcionamiento del Centro?',
        opciones: [
          'El Asistente Administrativo',
          'El Administrador',
          'El Coach',
          'El personal de aseo',
        ],
        explicacion: 'Al Administrador el Manual le asigna otra cosa: verificar que se utilicen las herramientas que se han brindado.',
        repasa: ['asistente-administrativo'],
      },
      {
        pregunta: 'Según el Manual, la responsabilidad del Administrador es verificar que se utilicen las herramientas que se han brindado.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Son dos responsabilidades distintas y complementarias: el Administrador verifica el uso de las herramientas, el Asistente vela por la aplicación de las normas.',
        repasa: ['administrador-de-centro'],
      },
    ],
    // El módulo tenía `drills: []`, y por progreso.js `hatted()` un módulo sin
    // maniobra se cierra con solo aprobar el cuestionario. Su quiz son las 10
    // preguntas del banco GIFT (N1-01…N1-10) y el tope del quiz es 10, así que
    // ninguna cubre lo único del módulo que se ejecuta EN VOZ ALTA delante de
    // una persona molesta. Eso no se evalúa con una opción múltiple: se evalúa
    // diciéndolo. Con la maniobra, of-nor-1 ya no queda completo sin la firma
    // del jefe entrenador. El orden no se toca: abrir el módulo
    // siguiente solo exige el anterior ESTUDIADO, así que nadie se traba.
    drills: [
      {
        titulo: 'Maniobra 1 — Los tres números del padre',
        fuente: 'curso-3-normativa.html#m1',
        proposito: 'Que le separes a un padre el Ciclo del Programa del ciclo de matrícula que le facturaste, con los números exactos del itinerario de su hijo y sin desautorizar ningún papel de la empresa.',
        gradiente: 'Si todavía no distingue los dos sentidos leyéndolos, no le montes la escena: hazle leer en voz alta la tabla de los dos Ciclos y decir cuántos niveles tiene Tiny Tots y cuántos Kids, hasta que salga de corrido. La escena viene después.',
        masa: [
          'Una factura real de matrícula de tu Centro, donde se lea "1er ciclo" y el número de niveles.',
          'La tabla de los dos Ciclos del Programa impresa, boca abajo sobre la mesa.',
        ],
        pasos: [
          'Di en voz alta, sin mirar nada, cuántos niveles tiene Tiny Tots y cuántos tiene Kids, y qué niveles caen en el Ciclo 1 y cuáles en el Ciclo 2 de cada uno.',
          'Tu jefe entrenador hace de madre molesta: llega con la factura de 3 niveles en la mano y con que en la web leyó que el Ciclo 2 tiene seis niveles. Pregunta: "¿me están cobrando la mitad?".',
          'Contéstale de pie, con la hoja boca abajo: separa los dos sentidos, dale el número exacto del Ciclo 2 según el itinerario del niño y cierra diciéndole qué pasa cuando su hijo termine los niveles que compró.',
          'El jefe entrenador repite la escena cambiando el itinerario del niño (Tiny Tots en vez de Kids) y el paquete (2 niveles en vez de 3).',
          'Última vuelta: el jefe entrenador te empuja a decir que la web está desactualizada. Sostén que las dos fuentes dicen la verdad de cosas distintas.',
        ],
        criterios: [
          'Separa los dos sentidos de "ciclo" antes de hablar de dinero, y lo hace de pie y sin leer la hoja.',
          'Da el número exacto del Ciclo 2 según el itinerario del niño: del 5 al 10 en Tiny Tots, del 5 al 8 en Kids, las dos veces que le cambian el caso.',
          'Cierra explicando que los niveles contratados se dan completos y que después se matricula el siguiente tramo, sin que el jefe entrenador se lo tenga que pedir.',
          'No dice en ningún momento que la web esté mal ni que la factura esté mal, ni siquiera cuando el jefe entrenador la empuja a decirlo.',
        ],
        errorTipico: 'Defender el precio antes de separar las dos palabras. Se delata porque arranca la respuesta con "es que la matrícula incluye" en vez de con "son dos cosas distintas", y el padre se va convencido de que le cobraron de más.',
      },
    ],
  },

  // minimoAprobacion(5) = 4 de 5. No se escribe: lo calcula el motor.
  {
    id: 'of-nor-2',
    curso: 'normativa',
    orden: 5,
    roles: ['administradora', 'asistente'],
    titulo: 'Imagen ALOHA: protocolo de vestimenta',
    duracionMin: 8,
    requiere: ['of-nor-1'],
    fuente: ['curso-3-normativa.html#m2'],
    pfv: 'Todo el que da la cara por el Centro se presenta dentro del protocolo, todos los días, sin que haya que recordárselo.',
    voz: 'La imagen no es un tema de gusto personal. <break time="0.4s"/> Es parte del estándar de calidad de ALOHA, y se cumple en TODOS los Centros. <break time="0.3s"/> Aquí hay dos cosas que se olvidan siempre. La primera: el pantalón deportivo y las licras de ejercicio no entran. <break time="0.3s"/> La segunda: las sandalias informales tampoco. Zapato cerrado o zapatilla. <break time="0.5s"/> Y el chaleco del Coach. <break time="0.3s"/> Es obligatorio al momento de impartir clases. No es que haga calor. Es obligatorio. <break time="0.4s"/> Cuando termines este módulo vas a poder pararte frente a cualquiera del equipo, <break time="0.3s"/> decirle qué está fuera de norma, <break time="0.3s"/> y decirle con cuál norma lo sustentas.',
    masa: [
      'Tu uniforme oficial de ALOHA, puesto o delante de ti.',
      'El chaleco oficial ALOHA del Centro, en la mano.',
      'Un espejo: la revisión de presentación personal se hace mirándote.',
    ],
    palabras: ['coach', 'colaborador', 'personal-de-apoyo-y-aseo'],
    laminas: [
      {
        kicker: 'Por qué',
        titulo: 'La imagen es parte del estándar',
        texto: 'El objetivo es mantener una imagen profesional, coherente y alineada con los estándares de calidad de ALOHA. Este protocolo se cumple en todos los Centros.',
      },
      {
        titulo: 'Presentación personal y uniforme',
        items: [
          'Cabello limpio y peinado; rostro afeitado o barba cuidada; uñas arregladas.',
          'Maquillaje diario y accesorios discretos.',
          'Camisa o uniforme oficial de ALOHA; jacket oficial cuando sea necesario.',
          'Pantalón o falda de ambiente laboral, sin prendas excesivamente ajustadas.',
          'No está permitido el pantalón deportivo ni las licras de ejercicio.',
        ],
      },
      {
        titulo: 'Calzado: lo que entra y lo que no',
        items: [
          'Permitido: zapatos cerrados, con o sin tacón.',
          'Permitido: zapatillas.',
          'No permitido: sandalias sin tacón o sin punta cerrada.',
        ],
      },
      {
        titulo: 'Coaches y personal de limpieza',
        items: [
          'El Coach usa el chaleco oficial ALOHA de forma obligatoria al impartir clases.',
          'Sin prendas ajustadas, escotes, ombligos descubiertos ni tatuajes visibles.',
          'El personal de limpieza no usa uniforme, pero viste limpio y adecuado.',
        ],
        cierre: 'Al cerrar revisas a cualquiera que dé la cara por el Centro y sabes con qué norma lo sustentas.',
      },
    ],
    sop: {
      proceso: 'Revisión de presentación e imagen ALOHA',
      cuando: 'Antes de abrir el Centro y antes de que empiece cada clase.',
      producto: 'Todo el que da la cara por el Centro está dentro del protocolo de vestimenta, todos los días.',
      pasos: [
        'Revisa tu presentación personal: cabello limpio y peinado, rostro afeitado o barba prolijamente cuidada, uñas arregladas.',
        'Verifica maquillaje diario y que aretes y accesorios sean discretos.',
        'Ponte la camisa o el uniforme oficial de ALOHA, y el jacket oficial cuando sea necesario.',
        'Confirma la parte inferior: pantalón o falda acordes a un ambiente laboral, sin prendas excesivamente ajustadas. Nada de pantalón deportivo ni licras.',
        'Revisa el calzado: zapatos cerrados con o sin tacón, o zapatillas. Nunca sandalias sin tacón o sin punta cerrada.',
        'Antes de que empiece la clase, verifica que cada Coach lleve puesto el chaleco oficial ALOHA.',
        'Verifica que el personal de limpieza vista ropa limpia y en buen estado, adecuada a sus funciones.',
      ],
      decide: [
        { situacion: 'Un Coach va a dar clase sin el chaleco', regla: 'El uso del chaleco oficial ALOHA es obligatorio al momento de impartir clases. El clima no lo vuelve opcional.' },
        { situacion: 'Dudas si una prenda entra o no', regla: 'El protocolo se cumple en todos los Centros. Si no está en la lista de permitidos, consúltalo con tu superior inmediato antes de usarla.' },
      ],
      errores: [
        'Tratar el chaleco del Coach como opcional cuando hace calor.',
        'Dar por permitidas las sandalias informales: no lo están.',
        'Olvidar al personal de limpieza: no usa uniforme, pero sí debe proyectar orden y cuidado.',
      ],
    },
    bloques: [
      {
        t: 'p',
        texto: 'El objetivo es mantener una imagen profesional, coherente y alineada con los estándares de calidad de ALOHA. Este protocolo se cumple en **todos los Centros**.',
      },
      { t: 'sub', texto: '1. Presentación personal' },
      {
        t: 'lista',
        items: [
          'Cabello siempre limpio y peinado de forma ordenada.',
          'Rostro afeitado, o barba prolijamente cuidada.',
          'Uso de maquillaje diario para proyectar una imagen cuidada.',
          'Aretes y accesorios discretos.',
          'Uñas arregladas.',
        ],
      },
      { t: 'sub', texto: '2. Uniforme' },
      {
        t: 'lista',
        items: [
          'Camisa o uniforme oficial de ALOHA.',
          'Jacket oficial de ALOHA cuando sea necesario.',
          'Parte inferior: pantalón o falda acordes a un ambiente laboral, evitando prendas excesivamente ajustadas.',
          '**No está permitido** pantalón tipo deportivo (licras de ejercicio).',
        ],
      },
      { t: 'sub', texto: '3. Calzado' },
      {
        t: 'lista',
        items: [
          'Permitido: zapatos cerrados, con o sin tacón.',
          'Permitido: zapatillas.',
          '**No permitido:** sandalias sin tacón o sin punta cerrada (sandalias informales).',
        ],
      },
      { t: 'sub', texto: '4. Coaches' },
      {
        t: 'lista',
        items: [
          '**Uso obligatorio del chaleco oficial ALOHA** al momento de impartir clases.',
          'Vestimenta adecuada para el trabajo con niños: evitar prendas ajustadas, escotes, ombligos descubiertos, accesorios inadecuados o tatuajes visibles.',
          'Presentación personal limpia y ordenada en todo momento.',
        ],
      },
      { t: 'sub', texto: '5. Personal de limpieza' },
      {
        t: 'lista',
        items: [
          'Aunque no usen el uniforme oficial, deben vestir de forma adecuada a sus funciones, con ropa limpia y en buen estado.',
          'Mantener siempre una presentación que proyecte orden y cuidado.',
        ],
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Caso para pensar',
        texto: 'Un Coach llega a dar clase con el chaleco en la mochila porque "hace calor". Escribe qué le dices y con qué norma lo sustentas.',
      },
    ],
    quiz: [
      {
        pregunta: '¿Cuál de estas prendas NO está permitida?',
        opciones: [
          'Pantalón de vestir',
          'Falda acorde a un ambiente laboral',
          'Camisa oficial de ALOHA',
          'Pantalón tipo deportivo o licras de ejercicio',
        ],
        explicacion: 'La parte inferior debe ser acorde a un ambiente laboral, evitando prendas excesivamente ajustadas.',
      },
      {
        pregunta: '¿Qué calzado NO está permitido?',
        opciones: [
          'Zapatos cerrados con tacón',
          'Zapatos cerrados sin tacón',
          'Sandalias sin tacón o sin punta cerrada',
          'Zapatillas',
        ],
        explicacion: 'Las zapatillas sí están permitidas; las sandalias informales no.',
      },
      {
        pregunta: 'El uso del chaleco oficial ALOHA por parte del Coach al impartir clases es…',
        opciones: [
          'recomendado',
          'obligatorio',
          'opcional según el clima',
          'solo para cierres de nivel',
        ],
        explicacion: 'Obligatorio al momento de impartir clases. El clima no lo vuelve opcional.',
        repasa: ['coach'],
      },
      {
        pregunta: 'Los Coaches deben evitar prendas ajustadas, escotes, ombligos descubiertos, accesorios inadecuados y tatuajes visibles.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es vestimenta adecuada para el trabajo con niños, además del chaleco obligatorio.',
        repasa: ['coach'],
      },
      {
        pregunta: 'El personal de limpieza, aunque no use uniforme oficial, debe vestir de forma adecuada a sus funciones, con ropa limpia y en buen estado.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'No usan el uniforme, pero sí deben proyectar orden y cuidado en todo momento.',
        repasa: ['personal-de-apoyo-y-aseo'],
      },
    ],
    drills: [],
  },

  // minimoAprobacion(8) = 7 de 8. No se escribe: lo calcula el motor.
  {
    id: 'of-nor-3',
    curso: 'normativa',
    orden: 6,
    roles: ['administradora', 'asistente'],
    titulo: 'Relaciones con el cliente',
    duracionMin: 10,
    requiere: ['of-nor-2'],
    fuente: ['curso-3-normativa.html#m3'],
    pfv: 'Ningún padre se va del Centro con una inquietud sin respuesta ni con un ciclo abierto.',
    // Derivado daría dos líneas ("Lo que se espera de ti" y "Reglas de
    // comunicación con padres") y dejaría fuera lo que de verdad se evalúa:
    // quién responde ante el padre y por qué canal.
    temario: [
      'El cliente es la razón de ser del Centro',
      'Cada colaborador es la cara visible de ALOHA',
      'Lo que se espera de ti al atender',
      'Reglas de comunicación con padres',
      'Quién responde por una situación con un padre',
      'El canal con el representante es del Centro, no personal',
    ],
    voz: 'Los clientes son la razón de ser del Centro. <break time="0.4s"/> Y a ti te juzgan por el trato que reciben. No por el método, ni por el ábaco. Por el trato. <break time="0.5s"/> Hay dos reglas que no se negocian. <break time="0.3s"/> La primera: nunca se tutea a un representante. Ni con años de confianza. <break time="0.3s"/> La segunda: la ADMINISTRADORA es la única que responde por una situación con un padre. <break time="0.3s"/> Por eso las reuniones con padres son siempre con ella delante. <break time="0.4s"/> Y el Coach no da su número personal. Da el celular del Centro. <break time="0.4s"/> Cuando termines, ningún padre se va de tu Centro con una inquietud sin respuesta.',
    masa: [
      'El celular del Centro, en la mano: es el número que se le da al representante.',
      'La recepción de tu Centro: párate donde recibes al padre y mira lo que él ve.',
      'El Manual abierto en el capítulo de relaciones con el cliente.',
    ],
    palabras: ['representante', 'reclamo', 'coach', 'administrador-de-centro'],
    laminas: [
      {
        kicker: 'Por qué importa',
        titulo: 'El cliente es la razón de ser',
        texto: 'Los clientes son uno de los bienes más valiosos de la organización. El objetivo fundamental es impactar positivamente sobre los niños, los padres y las familias.',
      },
      {
        titulo: 'Lo que se espera de ti',
        items: [
          'Nada es más importante que ser cortés, ameno, servicial y bien dispuesto.',
          'Recibe mirando a los ojos, con una sonrisa y disposición de servicio.',
          'Nunca se tutea a un representante.',
          'Las quejas se reciben con atención y se dirigen al Supervisor Inmediato.',
        ],
      },
      {
        titulo: 'Reglas de comunicación con padres',
        items: [
          'Todo problema se sigue hasta cerrar el ciclo, con respuesta y solución.',
          'La Administradora es la única encargada de responder ante el padre.',
          'Las reuniones con padres son siempre en presencia de la Administradora.',
          'El Coach no da su número directo: da el celular del Centro.',
        ],
      },
      {
        titulo: 'Lo que queda cuando lo haces bien',
        items: [
          'Mejor imagen pública del Centro.',
          'Mayor fidelidad de las familias.',
          'Más niños a los que el Programa puede impactar.',
        ],
        cierre: 'Al cerrar, ningún padre se va del Centro con una inquietud sin respuesta ni con un ciclo abierto.',
      },
    ],
    sop: {
      proceso: 'Atención de un representante y manejo de una queja',
      cuando: 'Cada vez que un representante llega al Centro, llama o plantea una queja.',
      producto: 'El representante sale con respuesta y con el ciclo cerrado, y la Administradora sabe lo que pasó.',
      pasos: [
        'Recibe mirando a los ojos, con una sonrisa y disposición de servicio.',
        'Trátalo de usted: nunca se tutea a un representante.',
        'Escucha la queja completa con simpatía y comprensión, y desalienta las críticas injustas.',
        'Si es un comentario o una queja específica, recíbela con atención y dirígela a tu Supervisor Inmediato.',
        'Si el tema involucra al padre, pásalo a la Administradora: es la única encargada de responder.',
        'Si hay reunión con el padre, agéndala con la Administradora presente.',
        'Entrega siempre el celular del Centro como canal de contacto, nunca un número personal.',
        'Sigue el problema hasta cerrar el ciclo, con respuesta y solución a satisfacción.',
      ],
      decide: [
        { situacion: 'El padre plantea una situación', regla: 'La Administradora del Centro es la única encargada de responder por una situación que involucra al padre.' },
        { situacion: 'Queja o comentario específico', regla: 'Se recibe con atención y se dirige al Supervisor Inmediato para tomar las medidas pertinentes.' },
        { situacion: 'El padre pide tu número', regla: 'El Coach no puede dar su número directo al representante: da siempre el celular del Centro.' },
      ],
      errores: [
        'Tutear al representante por confianza o por antigüedad: no hay excepción.',
        'Reunirse con un padre sin la Administradora presente.',
        'Dejar la inquietud a medias: el ciclo se cierra con respuesta y solución a satisfacción.',
      ],
    },
    bloques: [
      {
        t: 'p',
        texto: 'Los clientes son uno de los bienes más valiosos de la organización: son la razón de ser. El objetivo fundamental es **impactar positivamente sobre los niños, los padres y las familias**, y cada protocolo y procedimiento está pensado para favorecer esa misión.',
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Cada miembro del equipo es la cara visible de ALOHA',
        texto: 'Ante los clientes y ante el público. El modo en que realizamos nuestro trabajo es un reflejo de la organización. Los clientes nos juzgan por el trato que reciben de cada colaborador.',
      },
      { t: 'sub', texto: 'Lo que se espera de ti' },
      {
        t: 'lista',
        items: [
          'Nada es más importante que **ser cortés, ameno, servicial y bien dispuesto** al atender al cliente.',
          'Los clientes que deseen hacer comentarios o quejas específicas deben ser **recibidos con atención y dirigidos a su Supervisor Inmediato**, para tomar las medidas pertinentes.',
          'El contacto personal, los modales al teléfono y los mensajes que damos reflejan no solo a la persona, sino el profesionalismo de ALOHA.',
          '**Nunca se tutea a un representante.**',
          'El recibimiento es siempre mirando a los ojos, con una sonrisa y disposición de servicio.',
        ],
      },
      {
        t: 'p',
        texto: 'ALOHA brinda capacitación sobre los servicios y las relaciones con el cliente a todos los colaboradores que tengan contacto directo con él. Las relaciones positivas con el cliente no solo mejoran la imagen pública: generan mayor fidelidad y aumentan la cantidad de niños que el Programa puede impactar.',
      },
      { t: 'sub', texto: 'Reglas de comunicación con padres' },
      {
        t: 'lista',
        items: [
          'Siempre con respeto, disposición de servicio, claridad y mucho tacto.',
          'Todo problema o inquietud se sigue **hasta cerrar el ciclo**, con respuesta y solución a satisfacción.',
          '**La Administradora es la única encargada de responder** por una situación que involucra al padre.',
          'Las reuniones con padres se realizan **siempre en presencia de la Administradora**.',
          'El Coach **no puede dar su número directo** al representante: da siempre el celular del Centro.',
          'El Coach escucha las quejas con simpatía y comprensión, y desalienta las críticas injustas.',
        ],
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Caso para pensar',
        texto: 'Una madre te aborda molesta en el pasillo porque su hija "no ha aprendido nada en dos meses". Tú eres el Coach. Escribe qué haces en ese momento, a quién involucras y qué NO haces.',
      },
    ],
    quiz: [
      {
        pregunta: 'Según el Manual, al atender a un cliente nada es más importante que…',
        opciones: [
          'resolver rápido',
          'cumplir el horario',
          'ser cortés, ameno, servicial y bien dispuesto',
          'cerrar la venta',
        ],
        explicacion: 'Los clientes nos juzgan por el trato que reciben de cada colaborador.',
      },
      {
        pregunta: 'Los clientes que deseen realizar comentarios o quejas específicas deben ser…',
        opciones: [
          'atendidos por quien esté disponible',
          'remitidos por escrito al corporativo',
          'invitados a volver otro día',
          'recibidos con atención y dirigidos a su Supervisor Inmediato',
        ],
        explicacion: 'Se reciben con atención, no se despachan: se dirigen al Supervisor Inmediato para tomar las medidas pertinentes.',
        repasa: ['reclamo'],
      },
      {
        pregunta: 'Está permitido tutear a un representante si hay confianza de varios años.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Nunca se tutea a un representante. No hay excepción por confianza ni por antigüedad.',
        repasa: ['representante'],
      },
      {
        pregunta: 'El recibimiento a cada cliente debe ser…',
        opciones: [
          'desde el escritorio, sin interrumpir la tarea',
          'mirando a los ojos, con una sonrisa y mucha disposición de servicio',
          'por teléfono',
          'delegado al personal de aseo',
        ],
        explicacion: 'El recibimiento es lo primero que el padre ve de ALOHA.',
      },
      {
        pregunta: '¿Quién es el único encargado de responder por una situación en la que se involucra a un padre?',
        opciones: [
          'El Coach del niño',
          'El Asistente Administrativo',
          'El Administrador del Centro',
          'El Coordinador Operativo',
        ],
        explicacion: 'Por eso las reuniones con padres se hacen siempre en presencia de la Administradora.',
        repasa: ['administrador-de-centro'],
      },
      {
        pregunta: 'Las reuniones con padres deben realizarse siempre en presencia del Administrador.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es la contracara de la regla anterior: si la Administradora es la única que responde, tiene que estar presente.',
        repasa: ['administrador-de-centro'],
      },
      {
        pregunta: 'Un Coach puede entregar su número de teléfono personal al representante.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'El Coach da siempre el celular del Centro. El canal con el padre es institucional, no personal.',
        repasa: ['coach'],
      },
      {
        pregunta: '¿Qué debe dar el Coach al representante en lugar de su número personal?',
        opciones: [
          'El correo del Master Coach',
          'El celular del Centro',
          'El número de la Junta Directiva',
          'Su correo personal',
        ],
        explicacion: 'Todo canal alterno saca la conversación del control de la Administradora, que es quien responde.',
        repasa: ['coach'],
      },
    ],
    drills: [],
  },

  // minimoAprobacion(5) = 4 de 5. No se escribe: lo calcula el motor.
  {
    id: 'of-nor-4',
    curso: 'normativa',
    orden: 7,
    roles: ['administradora', 'asistente'],
    titulo: 'Ética y conducta comercial',
    duracionMin: 10,
    requiere: ['of-nor-3'],
    fuente: ['curso-3-normativa.html#m4'],
    pfv: 'Todo dato que sale de tu mano es veraz, preciso, completo y verificable, aunque el número real no te convenga.',
    // El módulo tiene un solo `sub`: derivado, el temario sería una línea. Sus
    // temas reales viven en los párrafos y en las notas, que no son temario.
    temario: [
      'Negociación justa y conducta ética',
      'La confianza del cliente sostiene el negocio',
      'Cumplimiento de leyes y reglamentos',
      'La regla práctica: cuando no sabes, pregunta',
      'Cumplir acuerdos, contratos y promesas',
      'Veracidad de la información',
      'Falsear un dato es falta grave',
    ],
    voz: 'Este módulo es corto y es el más caro de todos. <break time="0.4s"/> Todo dato que sale de tu mano tiene que cumplir cuatro condiciones. Veraz. Preciso. Completo. Y verificable. <break time="0.5s"/> Verificable quiere decir que otra persona lo puede comprobar contra la fuente. <break time="0.3s"/> Si un número no te conviene, se manda igual. <break time="0.4s"/> Porque omitir, manipular o falsear un dato no es un error administrativo. <break time="0.3s"/> El Manual lo llama falta GRAVE. <break time="0.3s"/> Laboral, ética y legal, las tres a la vez. <break time="0.4s"/> Y si no sabes cómo proceder, tienes una salida escrita: <break time="0.3s"/> lo discutes abiertamente con tu superior inmediato. <break time="0.3s"/> Preguntar nunca es la falta.',
    masa: [
      'El último informe de indicadores que entregaste, con sus números en pantalla.',
      'El Manual abierto en la política de ética y conducta comercial.',
      'Tu contrato de trabajo firmado.',
    ],
    palabras: ['veraz', 'verificable', 'indicador', 'falta-grave', 'evidencia'],
    laminas: [
      {
        kicker: 'La base',
        titulo: 'La reputación se sostiene en la conducta',
        texto: 'El desempeño y la reputación comercial de ALOHA se basan en los principios de negociación justa y conducta ética de sus colaboradores.',
      },
      {
        titulo: 'Lo que se espera de cada colaborador',
        items: [
          'Actuar de modo que se genere confianza y fidelidad del público.',
          'Cumplir el contenido, el espíritu y la intención de cada ley vigente.',
          'Evitar conductas ilegales, deshonestas o poco éticas.',
          'Cumplir los acuerdos, contratos y promesas hechos a los clientes.',
        ],
      },
      {
        titulo: 'El dato: cuatro condiciones que van juntas',
        items: [
          'Veraz: dice lo que de verdad ocurrió.',
          'Preciso: el número es el número.',
          'Completo: no falta la parte que incomoda.',
          'Verificable: otro puede comprobarlo contra la fuente.',
        ],
      },
      {
        titulo: 'Cuando no sabes qué hacer',
        items: [
          'Discútelo abiertamente con tu superior inmediato para obtener asesoramiento.',
          'Omitir, manipular o falsear información es falta grave laboral, ética y legal.',
          'La omisión o el incumplimiento pueden extinguir la relación laboral.',
        ],
        cierre: 'Al cerrar, todo dato que sale de tu mano se puede comprobar contra su fuente, aunque no te convenga.',
      },
    ],
    sop: {
      proceso: 'Emisión de un dato, informe o reporte',
      cuando: 'Antes de enviar cualquier informe de indicadores, reporte o dato de impacto para la empresa.',
      producto: 'Un dato veraz, preciso, completo y verificable, que otro puede comprobar contra su fuente.',
      pasos: [
        'Levanta el dato de su fuente, no de memoria ni de una copia anterior.',
        'Comprueba que sea veraz: que diga lo que de verdad ocurrió.',
        'Comprueba que sea preciso: el número exacto, no el aproximado presentable.',
        'Comprueba que sea completo: incluye también la parte que no te conviene.',
        'Déjalo verificable: anota de dónde salió, para que otro lo pueda comprobar.',
        'Si no está claro cuál es el procedimiento adecuado, discútelo abiertamente con tu superior inmediato antes de enviar.',
        'Envía conforme a los estándares y lineamientos establecidos.',
      ],
      decide: [
        { situacion: 'El número real no te conviene', regla: 'Se envía el número real. Omitir, manipular o falsear información constituye una falta grave de carácter laboral, ético y legal.' },
        { situacion: 'No sabes cómo proceder', regla: 'Discútelo abiertamente con tu superior inmediato para obtener asesoramiento.' },
        { situacion: 'Un acuerdo con el cliente no se va a poder cumplir', regla: 'Hay que cumplir los acuerdos, contratos y promesas: el incumplimiento puede derivar en acción disciplinaria e incluso en la extinción de la relación laboral.' },
      ],
      errores: [
        'Redondear un indicador para que cuadre con la meta: eso es manipular el dato.',
        'Enviar un dato sin dejar su fuente: lo que no es verificable no cumple la política.',
        'Callar la parte incómoda del reporte: la omisión también es incumplimiento.',
      ],
    },
    bloques: [
      {
        t: 'p',
        texto: 'El desempeño y la reputación comercial de ALOHA se basan en los principios de **negociación justa y conducta ética** de sus colaboradores. La reputación de integridad y excelencia requiere observancia cuidadosa del espíritu y contenido de cada ley y reglamento vigente, y un cuidado especial por los estándares más altos de conducta e integridad personal.',
      },
      {
        t: 'p',
        texto: 'El éxito permanente de ALOHA está directamente relacionado con la **confianza de nuestros clientes**. Los colaboradores deben actuar ante ALOHA, sus clientes y accionistas de modo que generen confianza y fidelidad por parte del público.',
      },
      {
        t: 'p',
        texto: 'ALOHA cumple con todas las leyes y reglamentos vigentes, y espera que directores, funcionarios y colaboradores realicen negocios conforme al contenido, el espíritu y la intención de todas las leyes relevantes, **evitando conductas ilegales, deshonestas o poco éticas**.',
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'La regla práctica',
        texto: 'En general, tu buen juicio basado en altos principios éticos te guiará sobre las líneas de conducta aceptables. Si se genera una situación en la que es difícil determinar el procedimiento adecuado, debes discutirlo abiertamente con tu superior inmediato para obtener asesoramiento.',
      },
      {
        t: 'p',
        texto: 'Cada miembro del equipo debe cumplir con la política de ética y conducta comercial, cumpliendo los acuerdos, contratos y promesas realizados a los clientes. **La omisión o el incumplimiento pueden tener como consecuencia una acción disciplinaria e incluso la extinción de la relación laboral.**',
      },
      { t: 'sub', texto: 'Veracidad de la información' },
      {
        t: 'p',
        texto: 'Los datos, informes de indicadores, reportes y cualquier información de impacto para la empresa deben ser **veraces, precisos, completos y verificables**, conforme a los estándares y lineamientos establecidos.',
      },
      {
        t: 'nota',
        tono: 'alerta',
        titulo: 'Falsear un dato es falta grave',
        texto: 'Omitir, manipular o falsear cualquier información constituye una falta grave de carácter laboral, ético y legal.',
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Caso para pensar',
        texto: 'Estás cerrando el informe del mes y el número de niños nuevos te queda uno por debajo del mínimo para la prima. Nadie va a revisar ese dato hoy. Escribe qué haces y cuál es la consecuencia formal de la alternativa.',
      },
    ],
    quiz: [
      {
        pregunta: 'El éxito permanente de ALOHA está directamente relacionado con…',
        opciones: [
          'el número de centros abiertos',
          'la confianza de nuestros clientes',
          'el precio del programa',
          'la publicidad en redes',
        ],
        explicacion: 'Por eso el estándar de conducta se exige antes que cualquier resultado comercial.',
      },
      {
        pregunta: 'Si se genera una situación en la que es difícil determinar el procedimiento adecuado, el colaborador debe…',
        opciones: [
          'discutirlo abiertamente con su superior inmediato para obtener asesoramiento',
          'decidir según su criterio y avisar después',
          'consultarlo con un compañero del mismo nivel',
          'esperar a que la situación se resuelva sola',
        ],
        explicacion: 'Preguntar nunca es la falta. La falta es inventarse el procedimiento y no decírselo a nadie.',
      },
      {
        pregunta: 'El incumplimiento de la política de ética y conducta comercial puede tener como consecuencia una acción disciplinaria e incluso la extinción de la relación laboral.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'La omisión también: no hace falta una acción activa para incumplir.',
      },
      {
        pregunta: 'Los datos, informes de indicadores y reportes deben ser…',
        opciones: [
          'aproximados pero presentables',
          'revisados solo al cierre trimestral',
          'veraces, precisos, completos y verificables',
          'elaborados por el Coordinador Operativo',
        ],
        explicacion: 'Las cuatro condiciones van juntas: verificable quiere decir que otro puede comprobarlo con la fuente.',
        repasa: ['veraz', 'verificable'],
      },
      {
        pregunta: 'Omitir, manipular o falsear información de impacto para la empresa constituye…',
        opciones: [
          'una falta leve',
          'una falta grave de carácter laboral, ético y legal',
          'un error administrativo sin consecuencias',
          'una práctica tolerada bajo presión de tiempo',
        ],
        explicacion: 'Los tres caracteres a la vez: laboral, ético y legal. No es un descuido administrativo.',
        repasa: ['falta-grave'],
      },
    ],
    drills: [],
  },

  // minimoAprobacion(5) = 4 de 5. No se escribe: lo calcula el motor.
  {
    id: 'of-nor-5',
    curso: 'normativa',
    orden: 8,
    roles: ['administradora', 'asistente'],
    titulo: 'Confidencialidad y protección de datos',
    duracionMin: 10,
    requiere: ['of-nor-4'],
    fuente: ['curso-3-normativa.html#m5'],
    pfv: 'La información del Centro y de sus familias no sale de aquí: ni por confianza, ni por favor, ni por descuido.',
    voz: 'Piensa en la lista de clientes de tu Centro. <break time="0.4s"/> Los nombres, los teléfonos de los papás, lo que paga cada quien. <break time="0.3s"/> Eso es exactamente lo que estás obligada a proteger. <break time="0.3s"/> Está en la lista de información confidencial del Manual, junto con la Técnica ALOHA. <break time="0.5s"/> Y aquí viene lo que casi nadie sabe. <break time="0.3s"/> No hace falta que ganes NADA. <break time="0.3s"/> Quien divulga información confidencial queda expuesto a acción disciplinaria, <break time="0.3s"/> a la salida de la empresa, y a acción legal. <break time="0.4s"/> Aunque lo haya hecho por hacerle un favor a alguien. <break time="0.4s"/> Todos firmamos un acuerdo de no divulgación al entrar. Ese papel sigue vivo hoy.',
    masa: [
      'El acuerdo de no divulgación que firmaste al entrar, o el modelo de Contrato de Confidencialidad del Manual.',
      'La lista de clientes de tu Centro en pantalla: es exactamente lo que estás obligada a proteger.',
      'El Manual abierto en el capítulo de confidencialidad, con la Ley 81 de 2019 adjunta.',
    ],
    palabras: [
      'contrato-de-confidencialidad',
      'ley-81-de-2019',
      'falta-grave',
      'coach',
      'representante',
    ],
    laminas: [
      {
        kicker: 'Por qué',
        titulo: 'Proteger la información es vital',
        texto: 'La protección de la información comercial, técnica confidencial y de los secretos comerciales es vital para los intereses y el éxito de ALOHA.',
      },
      {
        titulo: 'Qué es información confidencial',
        items: [
          'Listas de clientes y referencias de clientes.',
          'La Técnica ALOHA.',
          'Información financiera y sobre la compensación.',
          'Estrategias de comercialización, investigación y relaciones laborales.',
          'Códigos, programas y procesos computarizados privilegiados.',
        ],
      },
      {
        titulo: 'El acuerdo que firmaste',
        items: [
          'Todos los colaboradores lo firman como condición de empleo.',
          'Divulgarla lleva a acción disciplinaria, extinción de la relación laboral y acción legal.',
          'Aplica aun cuando no recibas ningún beneficio de la divulgación.',
          'El Manual adjunta la Ley 81 de 2019 de Protección de Datos Personales.',
        ],
      },
      {
        titulo: 'La regla propia del Coach',
        items: [
          'Mantiene inviolable la información de estudiantes, Centro y Programa.',
          'No divulga documentos que no se han publicado oficialmente.',
          'No elimina registros de los archivos sin permiso.',
          'Si deja el cargo, organiza los registros para quien lo asuma.',
        ],
        cierre: 'Al cerrar sabes decir que no a un pedido de datos, y sabes qué te cuesta decir que sí.',
      },
    ],
    sop: {
      proceso: 'Pedido de información del Centro o de sus familias',
      cuando: 'Cada vez que alguien, de dentro o de fuera, te pide datos de clientes, del Centro o del Programa.',
      producto: 'Ningún dato confidencial sale del Centro, y el pedido queda escalado a quien decide.',
      pasos: [
        'Comprueba si lo que te piden está en la lista de información confidencial: listas y referencias de clientes, información financiera, la Técnica ALOHA.',
        'Si lo está, no la entregues, aunque quien la pida sea un compañero o un excompañero.',
        'Recuerda que el acuerdo de no divulgación que firmaste es condición de empleo y sigue vigente.',
        'Escala el pedido a tu superior inmediato y deja escrito quién pidió qué.',
        'No elimines registros de los archivos ni saques documentos sin permiso.',
        'Si dejas el cargo o el grupo, organiza los registros y datos necesarios para quien lo asuma.',
      ],
      decide: [
        { situacion: 'Dudas si un dato es confidencial', regla: 'Consúltalo con tu superior inmediato antes de entregarlo: la lista del Manual es la que manda.' },
        { situacion: 'No ganas nada con entregarlo', regla: 'Da igual: la sanción aplica aun cuando no se reciba beneficio real de la divulgación.' },
        { situacion: 'Hace falta sacar un documento del archivo', regla: 'No se elimina ni se saca un registro de los archivos sin permiso.' },
      ],
      errores: [
        'Pasar teléfonos de representantes a un conocido: las listas de clientes son confidenciales.',
        'Creer que sin beneficio no hay falta: el Manual lo dice expresamente.',
        'Compartir documentos que no se han publicado oficialmente.',
      ],
    },
    bloques: [
      {
        t: 'p',
        texto: 'La protección de la información comercial, técnica confidencial y de los secretos comerciales es **vital para los intereses y el éxito** de ALOHA.',
      },
      { t: 'sub', texto: 'Qué se considera información confidencial' },
      {
        t: 'lista',
        items: [
          'Información sobre la compensación.',
          'Proyectos o propuestas pendientes.',
          'Procesos computarizados y procesos de producción privilegiados.',
          'Códigos y programas de computación.',
          'Estrategias de investigación y desarrollo.',
          '**Listas de clientes** y **referencias de clientes**.',
          'Información científica, fórmulas científicas y prototipos científicos.',
          'Información financiera.',
          'Estrategia de relaciones laborales.',
          'Estrategias de comercialización.',
          'Información tecnológica y prototipos tecnológicos.',
          'Investigación sobre materiales nuevos.',
          '**La Técnica ALOHA.**',
        ],
      },
      // El nombre que usa el índice del Manual es "Contrato de Confidencialidad";
      // el temario se DERIVA de los `sub`, así que el rótulo tiene que ser ese o
      // quien ponga el índice al lado del temario del KPI no encuentra el punto.
      { t: 'sub', texto: 'Contrato de Confidencialidad: el acuerdo de no divulgación' },
      {
        t: 'p',
        texto: '**Todos los colaboradores deben firmar un acuerdo de no divulgación como condición de empleo.**',
      },
      {
        t: 'nota',
        tono: 'alerta',
        titulo: 'No hace falta que ganes algo',
        texto: 'Quienes divulguen o utilicen de manera impropia secretos comerciales o información comercial confidencial estarán sujetos a acción disciplinaria, extinción de la relación laboral y acción legal, aun cuando no reciban beneficio real de la divulgación.',
      },
      { t: 'sub', texto: 'Ley 81 de 2019, Protección de Datos Personales' },
      {
        t: 'p',
        texto: 'Junto al modelo de Contrato de Confidencialidad, el Manual adjunta la **Ley 81 del 2019 de Protección de Datos Personales** como documento de referencia. El Manual no desarrolla su articulado ni añade reglas prácticas propias: lo exigible es lo que firmas en el **acuerdo de no divulgación** y la lista de información confidencial de arriba, donde entran expresamente las **listas de clientes** y las **referencias de clientes**.',
      },
      { t: 'sub', texto: 'La regla propia del Coach' },
      {
        t: 'p',
        texto: 'A los Coaches el Manual les fija además, dentro de su código de conducta, una obligación específica: un Coach mantendrá inviolable toda la información confidencial relacionada con los estudiantes, el Centro y el Programa, y no divulgará a nadie los documentos que no se han publicado oficialmente, ni eliminará los registros de los archivos sin permiso.',
      },
      {
        t: 'p',
        texto: 'Y si un Coach no puede seguir cumpliendo sus obligaciones, debe **organizar para quien asuma el cargo los registros y demás datos necesarios** para llevar a cabo el trabajo.',
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Caso para pensar',
        texto: 'Una excompañera que ahora trabaja en otro centro de refuerzo escolar te pide "solo los teléfonos de los papás del grupo que se cerró". Escribe tu respuesta y la consecuencia formal de acceder.',
      },
    ],
    quiz: [
      {
        pregunta: '¿Cuál de estos NO se lista como información confidencial en el Manual?',
        opciones: [
          'El horario de apertura del Centro publicado en redes',
          'Las listas de clientes',
          'La información financiera',
          'La Técnica ALOHA',
        ],
        explicacion: 'Lo que ya es público no es confidencial. Las listas de clientes y la Técnica ALOHA sí están en la lista.',
      },
      {
        pregunta: 'Firmar un acuerdo de no divulgación es una condición de empleo para todos los colaboradores.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Todos, sin importar el cargo. Es condición de empleo, no un trámite posterior.',
        repasa: ['contrato-de-confidencialidad'],
      },
      {
        pregunta: 'Un colaborador que divulga información confidencial pero no obtiene ningún beneficio de ello…',
        opciones: [
          'no tiene responsabilidad, porque no hubo beneficio',
          'solo recibe un llamado de atención',
          'queda igualmente sujeto a acción disciplinaria, extinción de la relación laboral y acción legal',
          'debe firmar de nuevo el acuerdo',
        ],
        explicacion: 'El Manual lo dice expresamente: aun cuando no reciban beneficio real de la divulgación.',
        repasa: ['falta-grave'],
      },
      {
        pregunta: 'Junto al modelo de Contrato de Confidencialidad, el Manual adjunta como documento de referencia…',
        opciones: [
          'el Código de Trabajo únicamente',
          'la Ley de Propiedad Intelectual',
          'un acuerdo interno sin base legal',
          'la Ley 81 del 2019 de Protección de Datos Personales',
        ],
        explicacion: 'Se adjunta como referencia: lo exigible en el día a día es el acuerdo que firmaste y la lista de información confidencial.',
        repasa: ['ley-81-de-2019'],
      },
      {
        pregunta: 'Según el Manual, un Coach no divulgará a nadie los documentos que no se han publicado oficialmente ni eliminará registros de los archivos sin permiso.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es una obligación específica de su código de conducta, además del acuerdo que firma como todo colaborador.',
        repasa: ['coach'],
      },
    ],
    drills: [],
  },

  // minimoAprobacion(10) = 8 de 10. No se escribe: lo calcula el motor.
  {
    id: 'of-nor-6',
    curso: 'normativa',
    orden: 9,
    roles: ['administradora', 'asistente'],
    titulo: 'Permisos, feriados y ausencias',
    duracionMin: 15,
    requiere: ['of-nor-5'],
    fuente: ['curso-3-normativa.html#m6'],
    pfv: 'Ninguna ausencia del Centro toma a nadie por sorpresa: se pidió por escrito, se autorizó por la vía que toca y el documento llegó a donde tenía que llegar.',
    voz: 'Los permisos son donde más se pelea, y donde el Manual es más claro. <break time="0.4s"/> Se piden por escrito. Con tres días de anticipación como mínimo. <break time="0.3s"/> Y pedirlo no es que te lo aprobaron: lo evalúa tu supervisor inmediato. <break time="0.5s"/> Ahora lo que duele. Un permiso justifica tu ausencia. NO justifica el pago. Se descuenta del salario. <break time="0.4s"/> Y el tiempo compensatorio no es una moneda de cambio: aplica solo cuando el tiempo lo pide la empresa. <break time="0.4s"/> Con justificación médica tienes hasta dieciocho al año pagados por la empresa. De ahí en adelante responde la Caja de Seguro Social. <break time="0.3s"/> Y apenas te lo autorizan, ese papel va al Coordinador Operativo. Ese mismo día.',
    masa: [
      'El Formato de Solicitud de Permisos en blanco, impreso.',
      'El cronograma de días libres y puentes del año, publicado por ALOHA.',
      'El file personal donde reposan los permisos autorizados.',
      'El comprobante de pago de tu última quincena, para ver dónde se refleja el descuento.',
    ],
    palabras: [
      'permiso',
      'tiempo-compensatorio',
      'dia-puente',
      'feriado',
      'caja-de-seguro-social',
      'incapacidad',
      'ficha-del-seguro-social',
      'coordinador-operativo',
      'planilla',
      'file-del-colaborador',
    ],
    laminas: [
      {
        kicker: 'La regla base',
        titulo: 'Un permiso se pide por escrito y con tiempo',
        items: [
          'Mínimo tres días de anticipación, siempre por escrito.',
          'La solicitud no significa aprobación: la evalúa el supervisor inmediato.',
          'Se revisa que no entorpezca el funcionamiento y que la razón sea valedera.',
        ],
      },
      {
        titulo: 'Un permiso justifica la ausencia, no el pago',
        items: [
          'Se descuenta automáticamente del salario.',
          'No se paga tiempo por tiempo, salvo los días puente.',
          'No se rebaja del periodo de vacaciones.',
          'El tiempo compensatorio aplica solo cuando el tiempo lo pide la empresa.',
        ],
      },
      {
        titulo: 'La ruta según tu cargo',
        items: [
          'Asistente Administrativa: al Administrador, en el Formato de Solicitud de Permisos.',
          'Administradores y Coordinador Operativo: a la Junta Directiva, por correo.',
          'Coaches: coordinan la suplencia con otro Coach y luego avisan al Administrador.',
          'Autorizado el permiso, el documento va de inmediato al Coordinador Operativo.',
        ],
      },
      {
        kicker: 'El límite médico',
        titulo: 'Hasta 18 al año los paga la empresa',
        texto: 'Los colaboradores de planilla tienen un máximo de 18 permisos al año con justificación médica. Al exceder los 18, la Caja de Seguro Social se responsabiliza del pago.',
        items: [
          'Sin ficha de la Caja de Seguro Social hay un certificado específico para llenar.',
        ],
      },
      {
        titulo: 'Feriados y días especiales',
        items: [
          'ALOHA otorga tiempo libre para los feriados de ley.',
          'Si el feriado cae domingo, el lunes siguiente es descanso obligatorio.',
          'Lunes de Carnaval y Sábado de Gloria: libres, con previo pago de horas.',
          'Sábado de Carnaval, 24 y 31 de diciembre: se labora hasta la 1:30 p.m.',
        ],
        cierre: 'Al cerrar, ninguna ausencia de tu Centro toma a nadie por sorpresa.',
      },
    ],
    sop: {
      proceso: 'Solicitud y trámite de un permiso',
      cuando: 'Apenas sabes que vas a faltar, y siempre con un mínimo de tres días de anticipación.',
      producto: 'El permiso pedido por escrito, autorizado por quien corresponde y entregado al Coordinador Operativo.',
      pasos: [
        'Pide el permiso por escrito con un mínimo de tres (3) días de anticipación.',
        'Si eres Asistente Administrativa, llena el Formato de Solicitud de Permisos y entrégaselo al Administrador del Centro.',
        'Si eres Administrador o Coordinador Operativo, envía el correo electrónico de Solicitud de Permiso a la Junta Directiva.',
        'Si eres Coach, coordina primero la suplencia con otro Coach según el nivel que requiere el grupo, y luego avísale al Administrador.',
        'Espera la autorización: la solicitud no significa aprobación.',
        'Con la firma o el correo de autorización, envía el documento al Coordinador Operativo inmediatamente.',
        'Deja el permiso autorizado reposando en el file personal del colaborador.',
        'Si el permiso es con justificación médica, cuenta cuántos van en el año contra el máximo de 18.',
      ],
      decide: [
        { situacion: 'Falta un Administrador a una clase de padres o de muestra', regla: 'Si la ausencia no está justificada con certificado médico, se le descuenta del salario el monto pagado a quien lo reemplace.' },
        { situacion: 'Se pasan los 18 permisos médicos del año', regla: 'La Caja de Seguro Social se responsabiliza del pago. Sin ficha de la Caja hay un certificado específico para llenar.' },
        { situacion: 'El colaborador quiere compensar el tiempo', regla: 'El tiempo compensatorio aplica solo cuando la propia empresa solicita el tiempo, no cuando lo pide el colaborador.' },
      ],
      errores: [
        'Avisar de palabra: el permiso se solicita por escrito o no existe.',
        'Dar por aprobado el permiso al entregarlo: lo evalúa el supervisor inmediato.',
        'Dejar el permiso firmado en la gaveta: va al Coordinador Operativo inmediatamente.',
      ],
    },
    bloques: [
      { t: 'sub', texto: 'Reglas generales de los permisos' },
      {
        t: 'lista',
        items: [
          'Se solicitan **por escrito, con un mínimo de tres (3) días de anticipación**.',
          'La solicitud **no significa aprobación**: la evalúa el supervisor inmediato para que no entorpezca el funcionamiento normal de la empresa y para verificar que la razón sea valedera.',
          'Los permisos otorgados son una **justificación del empleado, no una justificación de pago** del tiempo solicitado.',
          'No se paga tiempo por tiempo (salvo los días puente), no se rebaja del periodo de vacaciones, y se descuenta automáticamente del salario.',
          'Cuando el permiso lo pide el propio colaborador, **no** se maneja con tiempo compensatorio; el compensatorio aplica solo cuando lo solicita la empresa.',
          'Todos los documentos de permiso se entregan al Coordinador Operativo **inmediatamente después de autorizados**.',
        ],
      },
      { t: 'sub', texto: 'La ruta según tu cargo' },
      {
        t: 'tabla',
        encabezados: ['Cargo', 'A quién solicita', 'Cómo'],
        filas: [
          [
            'Asistente Administrativa',
            'Administrador del Centro',
            'Formato de Solicitud de Permisos. Queda autorizada solo con la firma del Administrador; se envía al Coordinador Operativo y reposa en el file personal',
          ],
          [
            'Coordinador Operativo',
            'Junta Directiva',
            'Correo electrónico de Solicitud de Permiso; el descuento se refleja en el comprobante de pago de la quincena',
          ],
          ['Administradores', 'Junta Directiva', 'Correo electrónico'],
          [
            'Coaches',
            'Coordinan suplencia con otro Coach y luego avisan al Administrador',
            'Según el nivel que requiere el grupo y el nivel del Coach suplente; el Administrador se asegura de que la suplencia sea óptima y pueda considerarse en el pago de la planilla',
          ],
        ],
      },
      {
        t: 'nota',
        tono: 'alerta',
        titulo: 'Administradores, atención',
        texto: 'Si tu ausencia requiere ser sustituida por otro personal en una clase de padres o clase de muestra, y no está justificada con certificado médico, se te descontará del salario el monto pagado a quien te reemplace en esa actividad.',
      },
      { t: 'sub', texto: 'Límite de permisos con justificación médica' },
      {
        t: 'p',
        texto: 'Los colaboradores de planilla tienen un máximo de **18 permisos al año con justificación médica** para que la empresa se haga cargo del pago. Al exceder los 18, **la Caja de Seguro Social** se responsabiliza del pago. En caso de ausencia de ficha de la Caja de Seguro Social, existe un certificado específico para llenar.',
      },
      { t: 'sub', texto: 'Feriados' },
      { t: 'p', texto: 'ALOHA otorga tiempo libre para los feriados de ley.' },
      {
        t: 'tabla',
        encabezados: ['Fecha', 'Acontecimiento'],
        filas: [
          ['1 de enero', 'Año Nuevo (fiesta nacional)'],
          ['9 de enero', 'Día de los Mártires (duelo nacional)'],
          ['Febrero', 'Martes de Carnaval'],
          ['Abril', 'Viernes Santo (duelo nacional)'],
          ['1 de mayo', 'Día del Trabajo (fiesta nacional)'],
          ['3 de noviembre', 'Separación de Panamá de Colombia'],
          [
            '5 de noviembre',
            'Conmemoración Patriótica de la Ciudad de Colón',
          ],
          [
            '10 de noviembre',
            'Grito de la Independencia de la Villa de Los Santos',
          ],
          ['28 de noviembre', 'Independencia de Panamá de España'],
          ['8 de diciembre', 'Día de las Madres (fiesta nacional)'],
          ['25 de diciembre', 'Celebración de la Natividad'],
        ],
      },
      {
        t: 'p',
        texto: 'Cuando un día de fiesta o duelo nacional fijado por ley coincide con domingo, **el lunes siguiente se habilita como día de descanso semanal obligatorio** (artículo 47 del Código de Trabajo).',
      },
      { t: 'sub', texto: 'Días especiales' },
      {
        t: 'lista',
        items: [
          '**Lunes de Carnaval y Sábado de Gloria:** libres, con **previo pago de horas**, sin excepción.',
          '**Sábado de Carnaval, 24 y 31 de diciembre:** se permite laborar hasta la 1:30 p.m. si caen en día laboral.',
          'ALOHA establece un cronograma de días libres y puentes en las fiestas nacionales. Esta programación **puede ser modificada en cualquier momento** por trabajos o proyectos especiales.',
        ],
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Caso para pensar',
        texto: 'Es martes. Un Coach te avisa que el sábado no puede dar su clase. Escribe qué debe hacer él, qué verificas tú y qué pasa con el pago de esa clase en la planilla.',
      },
    ],
    quiz: [
      {
        pregunta: 'Los permisos deben solicitarse por escrito con un mínimo de…',
        opciones: [
          'un día de anticipación',
          'cinco días de anticipación',
          'dos semanas de anticipación',
          'tres días de anticipación',
        ],
        explicacion: 'Tres días es el mínimo, y por escrito. El aviso verbal no es una solicitud.',
        repasa: ['permiso'],
      },
      {
        pregunta: 'La solicitud de permiso equivale automáticamente a su aprobación.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'La evalúa el supervisor inmediato: que no entorpezca el funcionamiento normal de la empresa y que la razón sea valedera.',
        repasa: ['permiso'],
      },
      {
        pregunta: 'La solicitud de permiso de la Asistente Administrativa queda autorizada…',
        opciones: [
          'al entregarla en recepción',
          'únicamente al momento de la firma del Administrador',
          'cuando el Coordinador Operativo la recibe',
          'con el aviso verbal al Administrador',
        ],
        explicacion: 'Después de la firma se envía al Coordinador Operativo y reposa en el file personal, pero quien autoriza es el Administrador.',
        repasa: ['file-del-colaborador'],
      },
      {
        pregunta: 'El pago del tiempo de un permiso solicitado por el colaborador…',
        opciones: [
          'se descuenta automáticamente del salario',
          'se paga tiempo por tiempo',
          'se rebaja del periodo de vacaciones',
          'lo cubre la Caja de Seguro Social',
        ],
        explicacion: 'El permiso otorgado es una justificación del empleado, no una justificación de pago del tiempo solicitado.',
        repasa: ['permiso'],
      },
      {
        pregunta: 'El tiempo compensatorio aplica cuando…',
        opciones: [
          'el colaborador lo pide con anticipación',
          'el permiso es por motivos médicos',
          'lo autoriza el Coach',
          'la propia empresa solicita el tiempo, no cuando lo pide el colaborador',
        ],
        explicacion: 'Es la confusión más común: el compensatorio no es una moneda de cambio para los permisos propios.',
        repasa: ['tiempo-compensatorio'],
      },
      {
        pregunta: 'El máximo de permisos al año con justificación médica pagados por la empresa es de…',
        opciones: ['12', '15', '18', '24'],
        explicacion: 'Aplica a los colaboradores de planilla.',
        repasa: ['planilla'],
      },
      {
        pregunta: 'Al exceder ese máximo, ¿quién se responsabiliza del pago?',
        opciones: [
          'La empresa',
          'La Caja de Seguro Social',
          'El colaborador',
          'La Junta Directiva',
        ],
        explicacion: 'Y si falta la ficha de la Caja de Seguro Social, existe un certificado específico para llenar.',
        repasa: ['caja-de-seguro-social', 'ficha-del-seguro-social'],
      },
      {
        pregunta: 'Los Coaches deben coordinar su suplencia con otro Coach basándose en el nivel que requiere el grupo y el nivel del Coach suplente.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Primero coordinan la suplencia, después avisan al Administrador, que verifica que sea óptima y pueda considerarse en el pago de la planilla.',
        repasa: ['planilla'],
      },
      {
        pregunta: 'Los días Lunes de Carnaval y Sábado de Gloria se otorgan libres…',
        opciones: [
          'sin ninguna condición',
          'previo pago de horas, sin excepción',
          'solo al personal administrativo',
          'a criterio del Administrador',
        ],
        explicacion: '"Sin excepción" es parte de la norma: no queda a criterio del Centro.',
        repasa: ['feriado', 'dia-puente'],
      },
      {
        pregunta: 'Los documentos de permiso se entregan al Coordinador Operativo…',
        opciones: [
          'inmediatamente después de ser autorizados',
          'al cierre de mes',
          'cuando los solicite',
          'junto con la planilla',
        ],
        explicacion: 'Inmediatamente: si el documento se queda en la gaveta, el descuento no se aplica y el permiso queda sin respaldo.',
        repasa: ['coordinador-operativo'],
      },
    ],
    drills: [],
  },

  // minimoAprobacion(6) = 5 de 6. No se escribe: lo calcula el motor.
  {
    id: 'of-nor-7',
    curso: 'normativa',
    orden: 10,
    roles: ['administradora', 'asistente'],
    titulo: 'Faltas graves: la línea que no se cruza',
    duracionMin: 12,
    requiere: ['of-nor-6'],
    fuente: ['curso-3-normativa.html#m7'],
    pfv: 'Reconoces una falta grave en el momento en que la ves, y sabes exactamente qué sanción tiene prevista el Manual.',
    // Las dos causales pesadas del módulo viven en tablas con `titulo`, y un
    // título de tabla no entra al temario derivado: sin este campo, el temario
    // se saltaría justo lo que cuesta el puesto.
    temario: [
      'Causal de despido inmediato: casos especiales de ingreso',
      'Causal de despido o revocación de franquicia: constancias',
      'Falta grave de carácter laboral, ético y legal',
      'Falla grave del protocolo de seguridad',
      'Irregularidad administrativa',
      'Acciones disciplinarias: el orden',
    ],
    voz: 'Este módulo reúne, en un solo lugar, todo lo que el Manual llama falta GRAVE. <break time="0.4s"/> No son interpretables. <break time="0.5s"/> Hay dos que quiero que se te queden pegadas. <break time="0.3s"/> Tocar la fecha de nacimiento de un niño para que entre a un itinerario: causal de despido inmediato. <break time="0.4s"/> Y emitir una constancia escolar sin autorización del corporativo <break time="0.3s"/> llega más lejos todavía: pone en riesgo la franquicia del Centro. <break time="0.5s"/> La escala disciplinaria es corta. Llamado de atención verbal. Tres memorándum, archivados en el file. Y despido. <break time="0.3s"/> Ojo con lo último: si el memorándum no se archiva, la escala no existe.',
    masa: [
      'El Manual abierto en los capítulos de casos especiales de ingreso y de constancias y certificaciones.',
      'El file de un colaborador, para ver dónde se archivan los memorandos.',
      'Tu contrato de trabajo firmado, con las causales que aceptaste.',
    ],
    palabras: [
      'falta-grave',
      'sancion-administrativa',
      'memorando',
      'accion-disciplinaria',
      'file-del-colaborador',
      'constancia-escolar',
      'franquicia',
      'repeticion-de-nivel',
      'auditoria',
      'itinerario',
    ],
    laminas: [
      {
        kicker: 'Casos de ingreso',
        titulo: 'Causal de despido inmediato',
        items: [
          'Alterar o manipular la edad o la fecha de nacimiento de un estudiante.',
          'Tramitar inscripciones en itinerarios no autorizados.',
          'Presentar informes falsificados o alterados.',
        ],
      },
      {
        kicker: 'Constancias',
        titulo: 'Causal de despido o revocación de franquicia',
        items: [
          'Emitir constancias escolares sin autorización corporativa.',
          'Modificar, replicar o firmar formatos oficiales sin consentimiento.',
          'Alterar datos del estudiante o fechas de ingreso.',
        ],
        cierre: 'Este bloque llega más lejos que el despido: pone en riesgo la franquicia del Centro.',
      },
      {
        titulo: 'Laboral, ético y legal',
        items: [
          'Omitir, manipular o falsear datos, informes de indicadores o reportes.',
          'Divulgar o utilizar de manera impropia información confidencial.',
          'Lleva acción disciplinaria, extinción de la relación laboral y acción legal.',
        ],
      },
      {
        titulo: 'Seguridad y administración',
        items: [
          'Cualquier accidente no reportado es falla grave del protocolo de seguridad.',
          'Puede derivar en sanción administrativa.',
          'Una repetición de nivel no documentada es irregularidad administrativa.',
          'Puede ser objeto de observación o sanción en auditoría.',
        ],
      },
      {
        titulo: 'La escala disciplinaria, tal cual la escribe el Manual',
        texto: 'El Manual la escribe para un cargo y un aplicador concretos: el Administrador de Centro, de ser necesario, la aplica al Asistente Administrativo, de forma jerárquica.',
        items: [
          'Llamado de atención verbal.',
          'Tres memorándum, archivados en el file del Colaborador.',
          'Despido.',
        ],
        cierre: 'Al cerrar reconoces la falta en el momento en que la ves y sabes qué sanción tiene prevista.',
      },
    ],
    sop: {
      proceso: 'Qué hacer cuando ves una falta grave',
      cuando: 'En el momento en que ves o te enteras de una conducta de las listas de faltas graves.',
      producto: 'La falta escalada a quien decide, con el hecho descrito tal cual, y la escala disciplinaria aplicada en orden.',
      pasos: [
        'Clasifica lo que viste contra las listas del Manual: casos de ingreso, constancias, falta laboral y ética, seguridad o irregularidad administrativa.',
        'No lo resuelvas por tu cuenta ni lo comentes con el resto del equipo.',
        'Discútelo abiertamente con tu superior inmediato para obtener asesoramiento.',
        'Describe el hecho de forma veraz, precisa, completa y verificable: nunca lo suavices.',
        'Si eres Administrador de Centro y corresponde, aplica la escala al Asistente Administrativo en orden: llamado de atención verbal, tres memorándum, despido.',
        'Archiva cada memorándum en el file del Colaborador: sin archivo no hay escala.',
      ],
      decide: [
        { situacion: 'Constancias, formatos oficiales o datos de ingreso', regla: 'Es causal de despido o revocación de franquicia. Toda constancia escolar sale con autorización corporativa.' },
        { situacion: 'Accidente no reportado', regla: 'Es falla grave del protocolo de seguridad y puede derivar en sanción administrativa.' },
        { situacion: 'Repetición de nivel sin documentar', regla: 'Es irregularidad administrativa y puede ser objeto de observación o sanción en auditoría.' },
      ],
      errores: [
        'Arreglar la fecha de nacimiento de un niño para que entre: es causal de despido inmediato.',
        'Guardarse un accidente leve sin reportar para no alarmar.',
        'Aplicar el tercer memorándum sin tener los dos anteriores archivados en el file.',
      ],
    },
    bloques: [
      {
        t: 'p',
        texto: 'Este módulo reúne, en un solo lugar, todas las conductas que el Manual califica como **falta grave**. No son interpretables.',
      },
      {
        t: 'tabla',
        titulo: 'Causal de despido inmediato',
        encabezados: ['Conducta', 'Ámbito'],
        filas: [
          [
            'Alterar o manipular la información de edad o fecha de nacimiento de un estudiante',
            'Casos especiales de ingreso',
          ],
          [
            'Tramitar inscripciones en itinerarios no autorizados',
            'Casos especiales de ingreso',
          ],
          [
            'Presentar informes falsificados o alterados',
            'Casos especiales de ingreso',
          ],
        ],
      },
      {
        t: 'tabla',
        titulo: 'Causal de despido o revocación de franquicia',
        encabezados: ['Conducta', 'Ámbito'],
        filas: [
          [
            'Emitir constancias escolares sin autorización corporativa',
            'Constancias y certificaciones',
          ],
          [
            'Modificar, replicar o firmar formatos oficiales sin consentimiento',
            'Constancias y certificaciones',
          ],
          [
            'Alterar datos del estudiante o fechas de ingreso',
            'Constancias y certificaciones',
          ],
        ],
      },
      { t: 'sub', texto: 'Falta grave de carácter laboral, ético y legal' },
      {
        t: 'lista',
        items: [
          'Omitir, manipular o falsear datos, informes de indicadores, reportes o cualquier información de impacto para la empresa.',
          'Divulgar o utilizar de manera impropia secretos comerciales o información confidencial: **acción disciplinaria, extinción de la relación laboral y acción legal**, aun sin beneficio real.',
        ],
      },
      { t: 'sub', texto: 'Falla grave del protocolo de seguridad' },
      {
        t: 'lista',
        items: [
          '**Cualquier accidente no reportado.** Puede derivar en sanción administrativa.',
        ],
      },
      { t: 'sub', texto: 'Irregularidad administrativa' },
      {
        t: 'lista',
        items: [
          'Cualquier repetición de nivel no documentada o no informada. Puede ser objeto de observación o sanción en auditoría.',
        ],
      },
      { t: 'sub', texto: 'Acciones disciplinarias: el orden' },
      {
        t: 'p',
        texto: 'El Manual establece **una sola** escala disciplinaria, y la escribe para un cargo y un aplicador concretos: **el Administrador de Centro, de ser necesario, la aplica al Asistente Administrativo**, de forma jerárquica.',
      },
      {
        t: 'pasos',
        items: [
          'Llamado de atención verbal.',
          'Tres memorándum, que deben archivarse en el file del Colaborador.',
          'Despido.',
        ],
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Lo que el Manual no dice',
        texto: 'El Manual no extiende esta escala a Coaches, personal de apoyo y aseo ni Administradores, y tampoco la condiciona a la gravedad de la falta: dice "de ser necesario".',
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Caso para pensar',
        texto: 'Un compañero te comenta que "arregló" la fecha de nacimiento de un niño en el sistema para que le despacharan el material de otro itinerario, porque el padre insistió mucho. Escribe qué categoría de falta es según el Manual y qué sanción tiene prevista. Si no sabes cómo proceder, el Manual te da una salida expresa: discutirlo abiertamente con tu superior inmediato para obtener asesoramiento.',
      },
    ],
    quiz: [
      {
        pregunta: 'Alterar la fecha de nacimiento de un estudiante para tramitar un ingreso es…',
        opciones: [
          'una irregularidad administrativa menor',
          'aceptable si el padre lo autoriza',
          'falta grave y causal de despido inmediato',
          'responsabilidad exclusiva del corporativo',
        ],
        explicacion: 'Está en el bloque de casos especiales de ingreso, junto con tramitar inscripciones en itinerarios no autorizados y presentar informes falsificados.',
        repasa: ['falta-grave'],
      },
      {
        pregunta: 'Emitir una constancia escolar sin autorización corporativa es causal de despido o revocación de franquicia.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Ese bloque llega más lejos que el despido: pone en riesgo la franquicia del Centro.',
        repasa: ['constancia-escolar', 'franquicia'],
      },
      {
        pregunta: '¿Cuál de estas conductas se califica como falla grave del protocolo de seguridad?',
        opciones: [
          'No reportar un accidente',
          'Reportar un accidente leve',
          'Llamar al padre antes de llenar el reporte',
          'Solicitar la ambulancia contratada',
        ],
        explicacion: 'Cualquier accidente no reportado, por leve que parezca. Puede derivar en sanción administrativa.',
        repasa: ['sancion-administrativa'],
      },
      {
        pregunta: 'Una repetición de nivel no documentada ni informada se considera…',
        opciones: [
          'una falta grave con despido inmediato',
          'una irregularidad administrativa que puede ser objeto de observación o sanción',
          'una práctica permitida',
          'responsabilidad del padre',
        ],
        explicacion: 'Es una categoría distinta de la falta grave: aparece en auditoría como observación o sanción, no como despido.',
        repasa: ['repeticion-de-nivel', 'auditoria'],
      },
      {
        pregunta: 'Según el Manual, el orden de las acciones disciplinarias que el Administrador de Centro aplica al Asistente Administrativo es…',
        opciones: [
          'memorándum, suspensión, despido',
          'llamado verbal, suspensión, memorándum',
          'llamado de atención verbal, tres memorándum archivados en el file, despido',
          'despido directo',
        ],
        explicacion: 'El Manual no contempla la suspensión en esta escala, y es la única escala disciplinaria que escribe.',
        repasa: ['accion-disciplinaria'],
      },
      {
        pregunta: 'Los memorándum disciplinarios deben archivarse en el file del colaborador.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Sin archivo no hay escala: el tercer memorándum solo existe si los dos anteriores están en el file.',
        repasa: ['file-del-colaborador', 'memorando'],
      },
    ],
    drills: [],
  },

  // minimoAprobacion(10) = 8 de 10. No se escribe: lo calcula el motor.
  {
    id: 'of-nor-8',
    curso: 'normativa',
    orden: 11,
    roles: ['administradora', 'asistente'],
    titulo: 'Accidentes: qué hace cada quien',
    duracionMin: 15,
    requiere: ['of-nor-7'],
    fuente: ['curso-3-normativa.html#m8'],
    pfv: 'Todo incidente queda atendido, reportado el mismo día y documentado en el portafolio del estudiante dentro de las 24 horas.',
    // Derivado daría tres líneas y dejaría fuera el reporte, la póliza y la
    // tabla de responsables, que es justo lo que se evalúa en el cuestionario.
    temario: [
      'A quién y a dónde aplica el protocolo',
      'Principios: todo incidente se reporta',
      'Si tú eres quien está presente',
      'Lo que hace la Administradora',
      'El Reporte de Accidente Escolar ALOHA',
      'Responsables, según el Manual',
      'Cobertura de la póliza y la corredora de seguro',
    ],
    voz: 'Un niño se cae y se raspa la rodilla. Casi no sangra y sigue jugando. <break time="0.4s"/> Se reporta o no se reporta. <break time="0.5s"/> Se reporta. TODO incidente, por leve que parezca, se reporta y se documenta. Sin excepción. <break time="0.4s"/> Si tú estás presente, tienes dos tareas y nada más. <break time="0.3s"/> Primeros auxilios, y avisarle de inmediato a la Administradora. <break time="0.3s"/> De inmediato, no al final de la clase. <break time="0.4s"/> De ahí en adelante manda ella. El Reporte de Accidente Escolar se llena el MISMO día. <break time="0.3s"/> Y la copia digital sube al portafolio del estudiante dentro de las veinticuatro horas. <break time="0.4s"/> Piensa en el papá que reclama tres días después. Si el reporte existe, estás tranquila.',
    masa: [
      'El formato Reporte de Accidente Escolar ALOHA en blanco, impreso.',
      'La póliza colectiva vigente del Centro y la lista de estudiantes cubiertos.',
      'El botiquín del Centro, abierto: mira qué tienes y qué te falta.',
      'El portafolio digital de un estudiante, abierto en pantalla.',
    ],
    palabras: [
      'reporte-de-accidente-escolar',
      'primeros-auxilios',
      'poliza-colectiva',
      'corredora-de-seguro',
      'incidente',
      'cobertura',
      'portafolio',
      'corporativo-aloha',
      'seguro-estudiantil',
      'asegurado',
    ],
    laminas: [
      {
        kicker: 'Alcance',
        titulo: 'A quién aplica el protocolo',
        texto: 'Aplica a todos: estudiantes, coaches, administradores y personal, dentro de las instalaciones o en actividades oficiales del Centro.',
        items: [
          'Eventos, demostraciones, excursiones y competencias también entran.',
        ],
      },
      {
        titulo: 'Los principios',
        items: [
          'La seguridad y el bienestar del estudiante son prioridad en todo momento.',
          'Todo incidente, por leve que parezca, se reporta y se documenta.',
          'La notificación debe ser inmediata, veraz y responsable.',
          'Antes de entregar documentos de la aseguradora se verifica la póliza vigente.',
        ],
      },
      {
        titulo: 'Si tú estás presente: dos cosas',
        items: [
          'Brinda primeros auxilios básicos y asegura la integridad del niño.',
          'Notifica de inmediato a la Administradora del Centro.',
        ],
        cierre: 'Son tus únicas responsabilidades: el reporte lo completa el Administrador o el responsable designado.',
      },
      {
        titulo: 'Lo que hace la Administradora',
        items: [
          'Coordina la atención médica con autorización del representante.',
          'Completa el Reporte de Accidente Escolar ALOHA el mismo día.',
          'Contacta al padre, describe los hechos y le entrega copia del reporte.',
          'Verifica la cobertura antes de entregar requisitos de la aseguradora.',
          'Sube copia digital al portafolio del estudiante dentro de las 24 horas.',
        ],
      },
      {
        titulo: 'Quién responde por qué',
        items: [
          'Coach o personal presente: primeros auxilios y notificar al administrador.',
          'Administrador: reportar, verificar cobertura y avisar al corporativo y a la corredora.',
          'Corporativo ALOHA: registrar el caso, apoyar con la aseguradora y dar seguimiento.',
        ],
        cierre: 'Al cerrar, todo incidente queda atendido, reportado el mismo día y documentado en 24 horas.',
      },
    ],
    sop: {
      proceso: 'Atención y reporte de un accidente',
      cuando: 'En el momento del incidente, por leve que parezca, dentro del Centro o en cualquier actividad oficial.',
      producto: 'El niño atendido, el padre informado, el Reporte de Accidente Escolar ALOHA completo el mismo día y en el portafolio dentro de las 24 horas.',
      pasos: [
        'Brinda primeros auxilios básicos y asegura la integridad del niño.',
        'Notifica de inmediato a la Administradora del Centro. No al final de la clase.',
        'Si requiere atención médica externa, comunícate con el padre o representante legal.',
        'Coordina el traslado por el servicio de ambulancia contratado por el Centro, siempre con autorización del representante.',
        'Completa el Reporte de Accidente Escolar ALOHA el mismo día: fecha y hora exacta, nombre y cédula, edad y grupo, descripción, atención brindada, presentes y testigos, y medidas adoptadas.',
        'Describe los hechos al padre con serenidad y precisión, y entrégale copia del reporte.',
        'Verifica que el estudiante esté dentro de la póliza colectiva vigente antes de entregar requisitos de la aseguradora.',
        'Archiva el reporte original firmado y sube copia digital al portafolio del estudiante dentro de las 24 horas.',
        'Comunica el caso al corporativo y a la corredora de seguro, y haz seguimiento hasta la resolución.',
      ],
      decide: [
        { situacion: 'Hace falta atención médica externa', regla: 'El traslado se coordina por el servicio de ambulancia contratado por el Centro, siempre con autorización del representante.' },
        { situacion: 'El padre pide los requisitos de la aseguradora', regla: 'Primero se verifica que el estudiante esté dentro de la póliza colectiva vigente.' },
        { situacion: 'El caso ya está atendido', regla: 'El Administrador comunica al corporativo y a la corredora de seguro; el Corporativo registra el caso y hace seguimiento.' },
      ],
      errores: [
        'No reportar un raspón porque parece leve: todo incidente se reporta y se documenta.',
        'Suavizar el reporte para no alarmar: un reporte suavizado es un reporte falseado.',
        'Dejar la copia digital para después: el portafolio se actualiza dentro de las 24 horas.',
      ],
    },
    bloques: [
      {
        t: 'p',
        texto: 'Este protocolo aplica a **todos**: estudiantes, coaches, administradores y personal, dentro de las instalaciones o en actividades oficiales del Centro (eventos, demostraciones, excursiones o competencias).',
      },
      { t: 'sub', texto: 'Principios' },
      {
        t: 'lista',
        items: [
          'La seguridad y el bienestar del estudiante son prioridad en todo momento.',
          '**Todo incidente o accidente, por leve que parezca, debe ser reportado y documentado.**',
          'La notificación debe ser inmediata, veraz y responsable.',
          'Antes de entregar documentación de la aseguradora al padre, el centro verifica que el estudiante esté dentro de la póliza colectiva vigente.',
        ],
      },
      { t: 'sub', texto: 'Si tú eres quien está presente' },
      {
        t: 'pasos',
        items: [
          'Brinda **primeros auxilios básicos** y asegura la integridad del niño.',
          '**Notifica de inmediato a la Administradora del Centro.** No al final de la clase: de inmediato.',
        ],
      },
      {
        t: 'p',
        texto: 'Esas dos son, según el Manual, tus únicas responsabilidades como coach o personal presente: brindar primeros auxilios y notificar al administrador. Levantar los datos del incidente forma parte del reporte, y el reporte lo completa el Administrador o el responsable designado.',
      },
      { t: 'sub', texto: 'Lo que hace la Administradora' },
      {
        t: 'pasos',
        items: [
          'Si requiere atención médica externa, se comunica con el padre o representante legal y, si es necesario, coordina el traslado por el **servicio de ambulancia contratado por el Centro**, siempre con **autorización del representante**.',
          'Completa el **Reporte de Accidente Escolar ALOHA el mismo día**, con fecha y hora exacta, nombre y cédula del estudiante, edad y grupo, descripción precisa, atención brindada, personas presentes y testigos, y medidas adoptadas.',
          'Contacta al padre y describe los hechos con serenidad y precisión; le entrega copia del reporte.',
          'Verifica la cobertura en la póliza colectiva antes de entregar requisitos de la aseguradora.',
          'Archiva el reporte original firmado, y sube copia digital al portafolio del estudiante **dentro de las 24 horas**.',
          'Hace seguimiento continuo del caso hasta su resolución.',
        ],
      },
      {
        t: 'tabla',
        titulo: 'Responsables, según el Manual',
        encabezados: ['Función', 'Responsabilidad'],
        filas: [
          [
            'Coach o personal presente',
            'Brindar primeros auxilios y notificar al administrador',
          ],
          [
            'Administrador del centro',
            'Supervisar la atención, completar el reporte, verificar cobertura del seguro y **comunicar al corporativo y a la corredora de seguro**',
          ],
          [
            'Corporativo ALOHA',
            'Registrar el caso, brindar apoyo en gestiones con la aseguradora y realizar seguimiento',
          ],
        ],
      },
      {
        t: 'nota',
        tono: 'alerta',
        titulo: 'No se deben omitir ni alterar datos',
        texto: 'Toda la información del reporte debe ser objetiva y verificable. Un reporte suavizado para "no alarmar" es un reporte falseado.',
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Caso para pensar',
        texto: 'Un niño tropieza y se raspa la rodilla. No sangra casi y sigue jugando. ¿Se reporta? Justifica tu respuesta con el principio del Manual y explica qué pasaría si tres días después el padre reclama.',
      },
    ],
    quiz: [
      {
        pregunta: 'Un raspón leve que no requiere atención médica debe reportarse igual.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Todo incidente o accidente, por leve que parezca, debe ser reportado y documentado.',
        repasa: ['incidente'],
      },
      {
        pregunta: 'El primer paso de quien está presente en un accidente es…',
        opciones: [
          'brindar primeros auxilios básicos y asegurar la integridad del niño',
          'llamar al padre',
          'buscar el formato de reporte',
          'avisar al corporativo',
        ],
        explicacion: 'Primero el niño. Llamar al padre y completar el reporte le tocan a la Administradora.',
        repasa: ['primeros-auxilios'],
      },
      {
        pregunta: 'La notificación a la Administradora del Centro debe ser…',
        opciones: [
          'al terminar la clase',
          'el mismo día, antes de cerrar',
          'dentro de las 24 horas',
          'de forma inmediata',
        ],
        explicacion: 'De inmediato. Las 24 horas son otro plazo: el de subir la copia digital al portafolio.',
      },
      {
        pregunta: 'El Reporte de Accidente Escolar ALOHA se completa…',
        opciones: [
          'dentro de las 48 horas',
          'cuando el padre lo solicite',
          'el mismo día del suceso',
          'solo si hubo atención médica',
        ],
        explicacion: 'El mismo día, con fecha y hora exacta. Un reporte hecho de memoria días después ya no es preciso.',
        repasa: ['reporte-de-accidente-escolar'],
      },
      {
        pregunta: '¿Cuál de estos datos NO se exige en el reporte de accidente?',
        opciones: [
          'Fecha y hora exacta del incidente',
          'El nombre del pediatra del niño',
          'Personas presentes y testigos',
          'Medidas adoptadas después del evento',
        ],
        explicacion: 'El reporte documenta el hecho y lo que se hizo, no el historial médico del niño.',
        repasa: ['reporte-de-accidente-escolar'],
      },
      {
        pregunta: 'El traslado a un centro médico por ambulancia contratada requiere siempre autorización del representante.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'El Centro coordina el traslado, pero la autorización es del padre o representante legal.',
      },
      {
        pregunta: 'Antes de entregar al padre los requisitos de la aseguradora, el centro debe…',
        opciones: [
          'cobrar el deducible',
          'esperar el alta médica',
          'consultar al Coordinador Operativo',
          'verificar que el estudiante esté dentro de la póliza colectiva vigente',
        ],
        explicacion: 'Entregar requisitos de una póliza que no cubre al niño crea una expectativa que después no se puede sostener.',
        repasa: ['poliza-colectiva', 'cobertura'],
      },
      {
        pregunta: 'El plazo máximo para archivar la copia digital del reporte en el portafolio del estudiante es de…',
        opciones: ['48 horas', '72 horas', '24 horas', 'una semana'],
        explicacion: 'El original firmado se archiva y la copia digital sube al portafolio dentro de las 24 horas.',
        repasa: ['portafolio'],
      },
      {
        pregunta: 'Según la tabla de Responsables del Manual, las responsabilidades del coach o personal presente en un accidente son…',
        opciones: [
          'brindar primeros auxilios, notificar al administrador y completar el reporte',
          'brindar primeros auxilios y notificar al administrador',
          'notificar al padre y llenar el formato de reporte',
          'registrar el caso ante la aseguradora',
        ],
        explicacion: 'Solo esas dos. El reporte lo completa el Administrador o el responsable designado.',
        repasa: ['primeros-auxilios'],
      },
      {
        pregunta: '¿A quién debe comunicar el Administrador del centro, además de atender el caso?',
        opciones: [
          'Solo al corporativo',
          'Solo a la corredora de seguro',
          'Al Coordinador Operativo',
          'Al corporativo y a la corredora de seguro',
        ],
        explicacion: 'A los dos. El Corporativo registra el caso y apoya las gestiones con la aseguradora.',
        repasa: ['corporativo-aloha', 'corredora-de-seguro'],
      },
    ],
    drills: [],
  },

  // minimoAprobacion(10) = 8 de 10. No se escribe: lo calcula el motor.
  {
    id: 'of-nor-9',
    curso: 'normativa',
    orden: 12,
    roles: ['administradora', 'asistente'],
    titulo: 'A quién acudir',
    duracionMin: 12,
    requiere: ['of-nor-8'],
    fuente: ['curso-3-normativa.html#m9'],
    pfv: 'Cada situación sale del Centro por la vía correcta y a la persona correcta, la primera vez.',
    // Los dos `sub` del módulo son los títulos de dos tablas grandes: derivado,
    // el temario no diría a quién se acude ni para qué, que es todo el módulo.
    temario: [
      'La cadena de mando',
      'Dónde el Manual no está unificado',
      'Quién resuelve qué, tema por tema',
      'Temas de padres, aprendizaje y capacitación',
      'Temas de personal, contratos y cobranza',
      'Lo que sale al Corporativo ALOHA',
      'Preguntar nunca es la falta',
    ],
    voz: 'Cierra la normativa el módulo más práctico de todos. <break time="0.4s"/> No se trata de saberse el organigrama. Se trata de que cada cosa salga por donde tiene que salir, a la primera. <break time="0.5s"/> Lo del padre, la Administradora. Siempre. <break time="0.3s"/> Contratos, seguro social y cobranza: el Coordinador Operativo. <break time="0.3s"/> Constancias y casos especiales de ingreso salen al Corporativo, por el correo oficial del Centro. Nunca por el tuyo. <break time="0.5s"/> Y hay una parte donde el Manual no está unificado, con el personal de apoyo y aseo. <break time="0.3s"/> Ahí no adivines: pregúntale a tu Administradora cuál es tu línea de reporte. <break time="0.4s"/> Preguntar nunca es la falta. La falta es inventarse el procedimiento.',
    masa: [
      'El correo oficial de tu Centro, abierto: es la vía por la que salen las solicitudes al Corporativo.',
      'El nombre y el contacto real de tu jefe inmediato, escrito, no de memoria.',
      'El Manual abierto en la tabla de cadena de mando.',
    ],
    palabras: [
      'junta-directiva',
      'coordinador-operativo',
      'master-coach',
      'corporativo-aloha',
      'administrador-de-centro',
      'asistente-administrativo',
      'personal-de-apoyo-y-aseo',
      'caso-especial-de-ingreso',
      'constancia-escolar',
      'kit',
      'proveedor',
    ],
    laminas: [
      {
        kicker: 'Tu línea',
        titulo: 'La cadena de mando',
        items: [
          'Asistente Administrativo: su jefe inmediato es el Administrador del Centro.',
          'Coach: su jefe inmediato es el Administrador del Centro.',
          'Administrador de Centro: la Junta Directiva, o quien esta defina.',
          'Personal de apoyo y aseo: el Manual no está unificado aquí.',
        ],
      },
      {
        titulo: 'Lo que resuelve la Administradora',
        items: [
          'Cualquier situación con un padre: es la única encargada de responder.',
          'Dificultad de aprendizaje: observa al niño en clase antes de decidir.',
          'Capacitación de nivel de un Coach: lo coordina con el Master Coach.',
        ],
      },
      {
        titulo: 'Lo que resuelve el Coordinador Operativo',
        items: [
          'Contratos, seguro social y firmas.',
          'Cuentas incobrables y personal de cobro.',
          'Los permisos autorizados se le entregan a él, inmediatamente.',
        ],
      },
      {
        titulo: 'Lo que sale del Centro',
        items: [
          'Caso especial de ingreso o de itinerario: Departamento Académico del Corporativo.',
          'Constancia escolar: Corporativo ALOHA, por el correo oficial del Centro.',
          'Kits y materiales: info@alohapanama.com, de C & C Soluciones Integrales.',
          'Mantenimiento: Asistente Administrativo, con Suplidores del Istmo, S.A.',
          'Innovación o propuesta nueva: Administración General.',
        ],
      },
      {
        titulo: 'Cuando no sabes',
        items: [
          'Duda ética o situación difícil de calificar: tu superior inmediato, abiertamente.',
          'Es la salida que la propia norma de ética te deja escrita.',
        ],
        cierre: 'Al cerrar, cada situación sale del Centro por la vía correcta y a la persona correcta, la primera vez.',
      },
    ],
    sop: {
      proceso: 'Enrutar una situación a quien la resuelve',
      cuando: 'Apenas te llega algo que no te toca decidir a ti.',
      producto: 'La situación llega a la persona que la resuelve, por su vía, la primera vez.',
      pasos: [
        'Identifica el tema: padre, niño, Coach, personal, dinero, corporativo o mantenimiento.',
        'Si involucra a un padre, pásalo a la Administradora: es la única encargada de responder.',
        'Si es dificultad de aprendizaje, pásalo a la Administradora, que observa al niño en clase antes de decidir.',
        'Si es capacitación de nivel de un Coach, la Administradora lo coordina con el Master Coach.',
        'Si es contrato, seguro social, firma, cuenta incobrable o personal de cobro, va al Coordinador Operativo.',
        'Si es caso especial de ingreso o de itinerario, sale al Departamento Académico del Corporativo vía la Administradora.',
        'Si es una constancia o certificación, sale al Corporativo ALOHA por el correo oficial del Centro.',
        'Si es una duda ética o difícil de calificar, discútela abiertamente con tu superior inmediato.',
      ],
      decide: [
        { situacion: 'Eres personal de apoyo y aseo', regla: 'El Manual no unifica el nombre de tu jefe directo. Pregúntale a tu Administradora cuál es tu línea de reporte; no la asumas.' },
        { situacion: 'Constancia escolar o certificación', regla: 'Sale al Corporativo ALOHA por el correo oficial del Centro. Emitirla sin autorización corporativa es causal de despido o revocación de franquicia.' },
        { situacion: 'Innovación o propuesta nueva', regla: 'Va a la Administración General, para evaluación y aprobación.' },
      ],
      errores: [
        'Responderle tú a un padre porque la Administradora no está.',
        'Escribirle al Corporativo desde un correo personal en vez del oficial del Centro.',
        'Asumir tu línea de reporte en vez de preguntarla cuando el Manual no la unifica.',
      ],
    },
    bloques: [
      { t: 'sub', texto: 'La cadena de mando' },
      {
        t: 'tabla',
        encabezados: ['Si eres...', 'Tu jefe inmediato es...'],
        filas: [
          ['Asistente Administrativo', 'Administrador del Centro'],
          ['Coach', 'Administrador del Centro'],
          [
            'Personal de apoyo y aseo',
            'Asistente de Gerencia, según el perfil del puesto. **El Manual no está unificado aquí: lee el aviso de abajo**',
          ],
          [
            'Administrador de Centro',
            'Junta Directiva y/o el personal que esta defina para el control y supervisión de sus intereses',
          ],
        ],
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Aviso: el Manual no está unificado aquí',
        texto: 'En el perfil del Personal de Apoyo y Aseo, el Manual dice que ese personal estará bajo la supervisión de la **Asistente de Gerencia**, quien será su Jefe directo. Ese título no aparece en ninguna otra parte del documento, donde el cargo del Centro es el de **Asistente Administrativo**. Y en Coordinación de Mantenimiento de Centro el Manual sí le asigna al Asistente Administrativo supervisar el trabajo del personal de limpieza. El Manual no dice cuál de los dos es el jefe directo y este curso no lo va a decidir por él: queda pendiente de que la empresa unifique el nombre del cargo. Mientras tanto, pregúntale a tu Administradora cuál es tu línea de reporte; no la asumas.',
      },
      { t: 'sub', texto: 'Quién resuelve qué' },
      {
        t: 'tabla',
        encabezados: ['Tema', 'A quién acudes'],
        filas: [
          [
            'Situación con un padre',
            'Administradora del Centro, es la única encargada de responder',
          ],
          [
            'Dificultad de aprendizaje de un niño',
            'Administradora, que observa al niño en clase antes de decidir',
          ],
          [
            'Capacitación de nivel de un Coach',
            'Administradora, que coordina con el Master Coach',
          ],
          ['Contratos, seguro social, firmas', 'Coordinador Operativo'],
          [
            'Cuentas incobrables y personal de cobro',
            'Coordinador Operativo',
          ],
          [
            'Caso especial de ingreso o de itinerario',
            'Departamento Académico del Corporativo ALOHA, vía la Administradora',
          ],
          [
            'Constancia escolar o certificación',
            'Corporativo ALOHA, vía el correo oficial del Centro',
          ],
          [
            'Solicitud de kits y materiales',
            'info@alohapanama.com (C & C Soluciones Integrales, S.A.)',
          ],
          [
            'Mantenimiento del Centro',
            'Asistente Administrativo; proveedor establecido: Suplidores del Istmo, S.A.',
          ],
          [
            'Innovación o propuesta nueva',
            'Administración General, para evaluación y aprobación',
          ],
          [
            'Duda ética o situación difícil de calificar',
            '**Tu superior inmediato, abiertamente**',
          ],
        ],
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Preguntar nunca es la falta',
        texto: 'La norma de ética lo dice así: si se genera una situación en la que es difícil determinar el procedimiento adecuado a seguir, deberá discutirlo abiertamente con su superior inmediato para obtener asesoramiento.',
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Cierre del curso',
        texto: 'Este cuestionario cierra la normativa. Requiere 80 % para aprobar y es requisito para el resto de los entrenamientos de tu rol.',
      },
    ],
    quiz: [
      {
        pregunta: 'El jefe inmediato del Asistente Administrativo es…',
        opciones: [
          'el Administrador del Centro',
          'el Coordinador Operativo',
          'la Junta Directiva',
          'el Master Coach',
        ],
        explicacion: 'El Coordinador Operativo entra por temas de personal (contratos, permisos, seguro social), pero no es el jefe inmediato.',
        repasa: ['administrador-de-centro', 'asistente-administrativo'],
      },
      {
        pregunta: '¿Quién gestiona los contratos, la solicitud de entrada al seguro social y las firmas?',
        opciones: [
          'El Administrador del Centro',
          'El Coordinador Operativo',
          'El Asistente Administrativo',
          'El Master Coach',
        ],
        explicacion: 'También ve las cuentas incobrables y el personal de cobro.',
        repasa: ['coordinador-operativo'],
      },
      {
        pregunta: '¿A dónde se envía la solicitud de kits y materiales?',
        opciones: [
          'Al Coordinador Operativo',
          'A Suplidores del Istmo, S.A.',
          'A info@alohapanama.com, C & C Soluciones Integrales, S.A.',
          'Al Master Coach',
        ],
        explicacion: 'Suplidores del Istmo es el proveedor de mantenimiento, no el de materiales del Programa.',
        repasa: ['kit', 'proveedor'],
      },
      {
        pregunta: 'El proveedor establecido para mantenimiento, pintura, instalaciones y reparaciones es…',
        opciones: [
          'C & C Soluciones Integrales',
          'Viralsolutionss Inc',
          'Altavia Group',
          'Suplidores del Istmo, S.A.',
        ],
        explicacion: 'El mantenimiento del Centro lo coordina el Asistente Administrativo con ese proveedor.',
        repasa: ['proveedor'],
      },
      {
        pregunta: 'Una propuesta de innovación de la Administradora debe notificarse a la Administración General porque, de aprobarse, se aplica en todos los Centros de la franquicia.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Va a Administración General para evaluación y aprobación. No se implementa por cuenta del Centro.',
      },
      {
        pregunta: 'Ante una duda ética difícil de calificar, lo correcto es…',
        opciones: [
          'resolverla con el criterio propio',
          'discutirla abiertamente con el superior inmediato',
          'consultarla en el grupo de WhatsApp del Centro',
          'esperar a la reunión mensual',
        ],
        explicacion: 'Preguntar nunca es la falta. La falta es inventarse el procedimiento y no decírselo a nadie.',
      },
      {
        pregunta: 'Según el Manual, el Jefe Directo del Administrador del Centro es…',
        opciones: [
          'el Coordinador Operativo',
          'el Master Coach',
          'la Junta Directiva y/o el personal que esta defina para el control y supervisión de sus intereses',
          'el Departamento Académico del Corporativo',
        ],
        explicacion: 'Para temas de personal el Administrador se apoya en el Coordinador Operativo, pero su jefe directo es la Junta Directiva.',
        repasa: ['junta-directiva'],
      },
      {
        pregunta: 'Una excompañera te pide los teléfonos de los padres de un grupo que ya cerró. ¿Qué haces?',
        opciones: [
          'Me niego, porque las listas de clientes son información confidencial y firmé un acuerdo de no divulgación como condición de empleo',
          'Se los doy, porque el grupo ya cerró',
          'Le doy solo algunos, sin nombres',
          'Consulto al grupo de Coaches',
        ],
        explicacion: 'Que el grupo haya cerrado no cambia nada, y no hace falta que ganes algo: la sanción aplica aun sin beneficio real.',
        repasa: ['contrato-de-confidencialidad'],
      },
      {
        pregunta: 'Cierras el informe del mes y falta un niño para alcanzar el mínimo de la prima. ¿Qué haces?',
        opciones: [
          'Ajusto el número, total es solo uno',
          'Adelanto un niño del mes siguiente',
          'Reporto el número real, porque falsear información es falta grave laboral, ética y legal',
          'Dejo el informe sin ese indicador',
        ],
        explicacion: 'Dejar el indicador en blanco tampoco sirve: la información debe ser veraz, precisa, completa y verificable.',
        repasa: ['falta-grave', 'indicador'],
      },
      {
        pregunta: 'Un padre molesto te aborda en el pasillo reclamando por el avance de su hija. Tú eres el Coach. ¿Qué haces?',
        opciones: [
          'Le explico yo mismo y le doy mi número para seguir conversando',
          'Le digo que hable con la Asistente',
          'Le respondo que su hija no practica en casa',
          'Escucho con simpatía y comprensión y llevo la situación a la Administradora, que es la única encargada de responder',
        ],
        explicacion: 'El Coach escucha, pero no responde por la situación ni abre un canal personal con el representante.',
        repasa: ['administrador-de-centro', 'reclamo'],
      },
    ],
    drills: [],
  },
]
