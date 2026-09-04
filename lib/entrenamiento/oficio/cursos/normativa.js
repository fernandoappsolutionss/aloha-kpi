// Bloque A — Normativa de la empresa. Obligatoria para los dos roles.
// Convertido desde curso-3-normativa.html (m0..m9) y curso-3-normativa.gift (75 preguntas) por el frente de contenido y revisado a mano.
// Los `id` son la clave de progreso en entrenamiento_progreso.modulo:
// renombrar uno BORRA el avance de todo el mundo. No se renumeran nunca.
// Los índices correctos del quiz viven en lib/entrenamiento/respuestas-oficio/normativa.js (solo servidor).
export const NORMATIVA = [
  // minimoAprobacion(10) = 8 de 10. No se escribe: lo calcula el motor.
  {
    id: 'of-nor-1',
    curso: 'normativa',
    orden: 4,
    roles: ['administradora', 'asistente'],
    titulo: 'Quiénes somos',
    duracionMin: 12,
    requiere: ['of-met-3'],
    fuente: ['curso-3-normativa.html#m0', 'curso-3-normativa.html#m1'],
    pfv: 'Puedes decir de dónde viene ALOHA, qué defiende y de qué responde tu cargo, delante de un padre, sin leerlo.',
    masa: [
      'El Manual de Operaciones de tu Centro, abierto en el prólogo.',
      'Los cinco puntos del Dojo Kun a la vista, tal como se les enseñan a los niños.',
      'Papel y lápiz para la reflexión del cierre: una situación real de tu semana pasada.',
    ],
    palabras: [
      'aloha-mental-arithmetic',
      'dojo-kun',
      'administrador-de-centro',
      'asistente-administrativo',
      'colaborador',
    ],
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
    drills: [],
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
    masa: [
      'Tu uniforme oficial de ALOHA, puesto o delante de ti.',
      'El chaleco oficial ALOHA del Centro, en la mano.',
      'Un espejo: la revisión de presentación personal se hace mirándote.',
    ],
    palabras: ['coach', 'colaborador', 'personal-de-apoyo-y-aseo'],
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
    masa: [
      'El celular del Centro, en la mano: es el número que se le da al representante.',
      'La recepción de tu Centro: párate donde recibes al padre y mira lo que él ve.',
      'El Manual abierto en el capítulo de relaciones con el cliente.',
    ],
    palabras: ['representante', 'reclamo', 'coach', 'administrador-de-centro'],
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
    masa: [
      'El último informe de indicadores que entregaste, con sus números en pantalla.',
      'El Manual abierto en la política de ética y conducta comercial.',
      'Tu contrato de trabajo firmado.',
    ],
    palabras: ['veraz', 'verificable', 'indicador', 'falta-grave', 'evidencia'],
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
      { t: 'sub', texto: 'El acuerdo de no divulgación' },
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
