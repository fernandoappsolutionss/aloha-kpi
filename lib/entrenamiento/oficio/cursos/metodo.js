// Bloque A — Cómo se estudia en cubierta. Lo ven los dos roles.
// Convertido desde hca/00-como-se-estudia.html (secciones hca0..hca11) por el frente de contenido y revisado a mano.
// Los `id` son la clave de progreso en entrenamiento_progreso.modulo:
// renombrar uno BORRA el avance de todo el mundo. No se renumeran nunca.
// Los índices correctos del quiz viven en lib/entrenamiento/respuestas-oficio/metodo.js (solo servidor).
//
// ═══════════════════════════════════════════════════════════════════════════
// VOCABULARIO — MAPEO VIEJO → NUEVO. Léelo antes de tocar una línea de prosa.
//
// La metodología NO cambió: cambió cómo se la nombra. Se renombró lo VISIBLE
// (los campos `texto`, `titulo`, `sub`, `pfv`, `voz`, los rótulos de pantalla y
// el `termino` del glosario). No se renombró un solo IDENTIFICADOR: los campos
// (`pfv`, `masa`, `drills`, `gradiente`, `sop`, `voz`, `fuente`), los ids de
// módulo (`of-met-1`…), los slugs del glosario, las clases CSS y las anclas
// `#hca0..#hca11` del campo `fuente` se quedan como están. Por eso el rollback
// es un cambio de texto y no una migración: esto es el entrenamiento OFICIAL de
// una franquicia con Corporativo y Junta Directiva, y si mañana piden alinear
// con material propio, se revierte entero.
//
// Quien audite esto dentro de seis meses va a leer una fuente congelada
// (docs/entrenamiento/fuente/*.html, que NO se reescribe) diciendo otra cosa.
// No es que el módulo se desvió: es este mapeo.
//
//   hat                          → tu puesto           (largo: tu puesto en cubierta, solo al presentarlo en of-met-1)
//   estar hatted                 → tener tu puesto tomado
//   hatting / entrenamiento en el puesto → tomar el puesto
//   paquete de hat               → el paquete del puesto
//   producto final valioso / PFV → tu producto         (largo: el producto de tu puesto)
//   masa                         → a la vista          (largo: lo que va a la vista)
//   gradiente                    → el orden            (el principio: entrar a tiempo)
//   palabra malentendida         → palabra sin aclarar
//   drill                        → maniobra
//   oficial de entrenamiento     → tu jefe entrenador  (largo: tu jefe, en su papel de entrenador)
//   checksheet                   → tu plan             (largo: tu plan de puesto)
//   invasión de puesto           → pisar el puesto ajeno
//   el nombre del método          → el Entrenamiento en Cubierta  (en prosa: "aquí se entrena en cubierta")
//   Tecnología de Estudio        → cómo se estudia en cubierta
//
//   Las tres barreras, cada una con su letra:
//     1 · ausencia de masa       → estudiar a ciegas        (O, de observar)
//     2 · gradiente excesivo     → entrar antes de tiempo   (A, de avanzar)
//     3 · palabra malentendida   → palabra sin aclarar      (O, de observar)
//     el estado de la barrera 3  → quedarse en blanco
//
//   NO cambian, y no es descuido: `aclaración de palabras` (es el término mejor
//   puesto del sistema: llano, exacto, con el verbo dentro), `Demostración`
//   (es tipo de paso Y término operativo de ALOHA para el cierre de nivel),
//   `el cuestionario` (se redescribe su papel —"no pone nota, ubica"— y jamás
//   se le dice "sondeo") y `el Manual de Operaciones` (el punto fijo).
//
// PALABRAS QUEMADAS — no se usan para nada nuevo, colisionan con el Manual:
//   bitácora (libro de record del Centro y bitácora del Coach) · escala,
//   escalar, escalón, escalera (prima, escala disciplinaria, escalón académico,
//   Nivel del Centro, "escalar el caso a la Administradora") · demostración
//   (cierre de nivel) · ruta ("Ruta de Nivel" es una pantalla real) · tramo
//   (cobranza 1-15 / 16-30 / 31-45 / 46-61) · prueba (Clase de Prueba) ·
//   entrega (informes, fondo, orden de entrega firmada) · ciclo · nivel ·
//   itinerario · kit · reválida · paz y salvo.
//
// PRESUPUESTO DE METÁFORA — esta es la parte que se erosiona sola:
//   VOCABULARIO ≠ METÁFORA. Un término con ficha de glosario (puesto, producto,
//   a la vista, orden, maniobra, plan, jefe entrenador, palabra sin aclarar) es
//   VOCABULARIO y no gasta cupo. Lo que gasta cupo es una IMAGEN marítima en
//   movimiento. Cupo real: MÁXIMO 1 por módulo en of-met-1, of-met-2 y
//   of-met-3; CERO en los otros 37 (Zoho, normativa, centro, cobranza, KPI).
//   Prohibida la metáfora decorativa: si la imagen no explica el mecanismo, se
//   borra. Y "maniobra" nombra el EJERCICIO y nada más: nunca "la maniobra de
//   cobranza" ni "la maniobra de matrícula".
//   Reparto de las imágenes en este archivo, y no hay más:
//     of-met-1 → "Antes de remar, mirar."            (barrera 1, letra O)
//     of-met-2 → ninguna
//     of-met-3 → "No nades más fuerte. Mira mejor."  (la regla del orden)
//   Lo demás que suena a mar en este archivo es el NOMBRE ("Entrenamiento a
//   Bordo", "en cubierta", "cómo se estudia en cubierta") y el nombre no es una imagen.
//
// LO OPERATIVO ES INTOCABLE: cifras, plazos, montos, fechas, nombres de cargo,
// pasos numerados y tablas de indicadores se quedan LITERALES. Nunca una
// metáfora dentro de una tabla, un indicador, un paso numerado o un guion.
// ═══════════════════════════════════════════════════════════════════════════
export const METODO = [
  // minimoAprobacion(7) = 6 de 7. No se escribe: lo calcula el motor.
  {
    id: 'of-met-1',
    curso: 'metodo',
    orden: 1,
    roles: ['administradora', 'asistente'],
    titulo: 'Cómo se estudia en cubierta: tu puesto y las tres barreras',
    duracionMin: 12,
    requiere: [],
    fuente: [
      '00-como-se-estudia.html#hca0',
      '00-como-se-estudia.html#hca1',
      '00-como-se-estudia.html#hca2',
    ],
    pfv: 'Puedes decir el producto de tu puesto en una sola frase, sin leerla.',
    voz: 'Entrenamiento en Cubierta. <break time="0.4s"/> Este módulo va primero en todos los cursos. <break time="0.3s"/> Se estudia una vez y se aplica siempre. <break time="0.5s"/> No es una introducción de cortesía. <break time="0.3s"/> Es lo que decide si el resto te sirve, o se te olvida en dos semanas. <break time="0.4s"/> Aquí no se estudia para saber. Se estudia para HACER. <break time="0.5s"/> Si al terminar no puedes ejecutarlo delante de tu jefe inmediato, <break time="0.3s"/> no lo aprendiste. Aunque hayas leído todo. <break time="0.4s"/> Y tu puesto no es una lista de tareas. Es una cosa que produces. <break time="0.5s"/> El examen más corto de todos es este: <break time="0.3s"/> decir el producto de tu puesto en una sola frase, sin leerla. <break time="0.4s"/> Si todavía no te sale, da igual cuántos módulos lleves. <break time="0.3s"/> Respira. Vuelve al principio y hazlo bien.',
    masa: [
      'El Manual de Operaciones de tu Centro, impreso o abierto en pantalla: es la biblioteca de referencia de todo el entrenamiento.',
      'Tu contrato o la descripción de tu puesto, para ver de qué respondes tú y de qué no.',
      'Papel y lápiz, para escribir el producto de tu puesto en una sola frase y guardarlo.',
    ],
    palabras: [
      'puesto-en-cubierta',
      'producto-final-valioso',
      'masa',
      'gradiente',
      'palabra-malentendida',
      'drill',
    ],
    bloques: [
      {
        t: 'p',
        texto: 'Entrenamiento en Cubierta · ALOHA. Este módulo va primero en todos los cursos. Se estudia una vez y se aplica siempre, en cada módulo que abras de aquí en adelante. Aquí nadie viaja de pasajero.',
      },
      {
        t: 'p',
        texto: 'No es relleno ni introducción de cortesía. Es la parte que decide si el resto del entrenamiento te sirve o se te olvida en dos semanas. Aquí se entrena de otra manera, y esa manera tiene una posición clara: el entrenamiento no es transmitir teoría de moda ni hacerte memorizar. El objetivo es **comprensión real y capacidad práctica de aplicación en tu puesto de trabajo**.',
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Regla base de todo el entrenamiento',
        texto: 'Aquí no se estudia para saber. Se estudia para hacer. Si al terminar un módulo no puedes ejecutarlo delante de tu jefe inmediato, no lo aprendiste, aunque hayas leído todo y sacado buena nota.',
      },
      { t: 'sub', texto: 'Qué te llevas de este módulo y de los dos que siguen' },
      {
        t: 'lista',
        items: [
          'Qué es **tu puesto** y cuál es el producto que se espera de ti.',
          'Las **tres barreras al estudio**: cómo se sienten en el cuerpo y en la cabeza, y qué hacer con cada una.',
          'Cómo **aclarar una palabra** tú sola, sin depender de nadie.',
          'La regla del **orden**: qué hacer cuando te atascas.',
          'La regla de **lo que va a la vista**: qué tienes que tener delante antes de abrir cualquier módulo.',
          'Cómo se aprueba de verdad: la **maniobra**.',
          'Quién te entrena y quién verifica que quedaste capacitada.',
        ],
      },
      { t: 'sub', texto: 'Cómo está armado el entrenamiento completo' },
      {
        t: 'p',
        texto: 'El entrenamiento se divide en dos vertientes que caminan juntas.',
      },
      {
        t: 'tabla',
        encabezados: ['Vertiente', 'Qué es', 'Dónde la ves'],
        filas: [
          [
            '**Tomar el puesto**',
            'Aprender exactamente qué debe hacer tu cargo y cómo conseguir su producto',
            'Los módulos de tu curso: calendarios, Zoho, cobranza, nómina, normativa',
          ],
          [
            '**Cómo se estudia en cubierta**',
            'Cómo se estudia para que quede: las tres barreras y sus remedios',
            'Este módulo. Se usa dentro de todos los demás',
          ],
        ],
      },
      {
        t: 'p',
        texto: 'Y hay un tercer pilar que sostiene los dos: el **programa de formación es interno**. Te capacitas dentro de la misma organización, con el Manual de Operaciones y los formatos reales del Centro como biblioteca de referencia. Cuando te surja una duda, la respuesta está en el Manual o en tu jefe inmediato: no hace falta salir a buscar interpretaciones de afuera, ni inventar un procedimiento propio.',
      },
      { t: 'sub', texto: 'Esto no es una charla: es tu puesto' },
      {
        t: 'p',
        texto: 'Tu puesto en cubierta es tu cargo y todo lo que viene con él. Son tres cosas, y nada más.',
      },
      {
        t: 'lista',
        items: [
          '**Tus responsabilidades:** de qué respondes tú y de qué no.',
          '**Tus tareas:** qué haces, cuándo lo haces y con qué formato.',
          '**El producto de tu puesto:** la cosa concreta, contable y de calidad que tu puesto le entrega al Centro.',
        ],
      },
      {
        t: 'p',
        texto: 'Un video que se ve una vez no te da el puesto. Una charla tampoco. Tomar el puesto es un entrenamiento formal, con un antes y un después: antes no podías ejecutar tu puesto sola, después sí.',
      },
      { t: 'sub', texto: 'Por qué importa tanto' },
      {
        t: 'p',
        texto: 'Cuando una persona tiene su puesto tomado de verdad pasan dos cosas que se notan de inmediato en el Centro: **se corrige sola** —detecta su error rápido y lo arregla sin que nadie tenga que descubrirlo por ella— y **empuja por iniciativa propia**, porque sabe exactamente hacia dónde va. Un Centro con la gente en su puesto es un Centro estable. Un Centro donde cada quien improvisa su cargo vive en **caos disfrazado**: fuegos que no terminan.',
      },
      { t: 'sub', texto: 'El producto de tu puesto' },
      {
        t: 'p',
        texto: 'Este es el cierre de todo puesto. No es una descripción bonita del cargo: es lo que se cuenta a fin de mes.',
      },
      {
        t: 'tabla',
        encabezados: ['Puesto', 'El producto del puesto', 'Cómo se mide en el Manual'],
        filas: [
          [
            '**Administrador de Centro**',
            'Matrícula activa creciente: niños inscritos, recibiendo clases de calidad y renovando de nivel en nivel, mes tras mes',
            'Deserción máximo 8 % al cierre de mes · nuevos niños mínimo 20, 25 o 30 al mes',
          ],
          [
            '**Asistente Administrativo**',
            'Niños nuevos inscritos y facturados, y las cuentas del Centro cobradas al día, con los números que lo demuestran ya en manos del Administrador',
            'No tener 4 clientes con más de dos facturas generadas sin pagar (máximo tres clientes)',
          ],
          [
            '**Coach**',
            'Niños que dominan la técnica y aprueban su nivel',
            'Puntaje mínimo reglamentario del 60 % en la evaluación final del nivel',
          ],
          [
            '**Personal de apoyo y aseo**',
            'Un Centro limpio y en orden para poder dar clase',
            'Verificación visual de que todas las áreas del Centro se mantienen en orden',
          ],
        ],
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Ojo con esto',
        texto: 'Si no puedes decir el producto de tu puesto en una sola frase, sin pensarlo mucho, todavía no tienes tu puesto tomado. No importa cuántos módulos hayas leído. Ese es el examen más corto de todos.',
      },
      { t: 'sub', texto: 'Las tres barreras: por qué la gente no aprende' },
      {
        t: 'p',
        texto: 'Cuando alguien no aprende algo, la explicación fácil es "no le da la cabeza" o "no le interesa". Antes de quedarnos con esa explicación, aquí se revisan otras tres, porque casi siempre el problema está en una de ellas: son **tres barreras concretas**, cada una con su síntoma propio y su remedio propio.',
      },
      {
        t: 'p',
        texto: 'Lo importante es esto: **las tres se sienten distinto**. Si aprendes a reconocer el síntoma, sabes cuál te está pasando y sabes qué hacer, en el momento, sin esperar a que alguien te rescate.',
      },
      {
        t: 'p',
        texto: 'Cada barrera lleva su letra, y la letra te dice qué hacer con ella. **O** es observar: mirar antes de moverte. Antes de remar, mirar. **A** es avanzar: dar el paso que toca, no el que viene después.',
      },
      {
        t: 'tabla',
        encabezados: ['Barrera', 'Cómo se siente', 'Qué haces'],
        filas: [
          [
            '**1 · O — Estudiar a ciegas.** Estudias algo sin tener delante la cosa real',
            'Dolor de cabeza, mareo, malestar en el cuerpo, ojos cansados, ganas de levantarte',
            'Consigue el objeto: el sistema en pantalla, el formato impreso, la foto, la demostración',
          ],
          [
            '**2 · A — Entrar antes de tiempo.** Diste un salto sin dominar el paso anterior',
            'Confusión, sensación de que no eres capaz, de que esto es demasiado para ti',
            'Regresa al último paso que sí entendiste bien y arréglalo ahí',
          ],
          [
            '**3 · O — Palabra sin aclarar.** Pasaste por una palabra cuyo significado no comprendes del todo',
            'Te quedas en blanco, lees sin registrar, aburrimiento, ganas de abandonar el curso',
            'Búscala hacia atrás, defínela y úsala en frases tuyas hasta que quede clara',
          ],
        ],
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Regla clave',
        texto: 'Si te sientes mal estudiando, no es que "no sirvas para esto". Es una de las tres, y las tres tienen arreglo. Identifícala por el síntoma y aplica el remedio de esa barrera, no el de otra.',
      },
      {
        t: 'p',
        texto: 'Y una última cosa antes de seguir. No esperes a sentirte lista para arrancar: se abre el módulo, se hace, se falla, se corrige y se vuelve a hacer. Imperfecto pero en movimiento.',
      },
    ],
    quiz: [
      {
        pregunta: 'Tu puesto son tres cosas. ¿Cuáles?',
        opciones: [
          'Tu horario, tu sueldo y tu jefe',
          'Tu contrato, tu uniforme y tu escritorio',
          'Tus responsabilidades, tus tareas y el producto de tu puesto',
          'Tus metas, tus permisos y tus vacaciones',
        ],
        explicacion: 'Tu puesto es el cargo completo: de qué respondes, qué haces y qué entregas.',
        repasa: ['puesto-en-cubierta'],
      },
      {
        pregunta: 'El producto del puesto de Administrador de Centro es…',
        opciones: [
          'Un Centro limpio y en orden para poder dar clase',
          'Niños que dominan la técnica y aprueban su nivel',
          'Las cuentas del Centro cobradas al día',
          'Matrícula activa creciente: niños inscritos, recibiendo clases de calidad y renovando de nivel en nivel',
        ],
        explicacion: 'Los otros tres son productos reales, pero de otros puestos: aseo, Coach y Asistente Administrativo.',
        repasa: ['producto-final-valioso'],
      },
      {
        pregunta: 'El producto del puesto de Asistente Administrativo se mide en el Manual con…',
        opciones: [
          'No tener 4 clientes con más de dos facturas generadas sin pagar; el máximo son tres clientes',
          'La deserción máxima de 8 % al cierre de mes',
          'El puntaje mínimo del 60 % en la evaluación de nivel',
          'La verificación visual de que las áreas están en orden',
        ],
        explicacion: 'Ojo con la condición completa: no es "cuatro clientes que deben algo", es cuatro clientes que acumulan más de dos facturas cada uno.',
        repasa: ['producto-final-valioso'],
      },
      {
        pregunta: 'Sientes dolor de cabeza y ganas de levantarte a los diez minutos de estudiar. ¿Qué barrera es y qué haces?',
        opciones: [
          'Entrar antes de tiempo: te devuelves al principio del curso',
          'Estudiar a ciegas: consigues el objeto real que el módulo describe y lo pones delante',
          'Palabra sin aclarar: buscas la palabra en el diccionario',
          'Ninguna: descansas y sigues mañana',
        ],
        explicacion: 'Estudiar a ciegas es la única barrera con síntomas físicos claros. Por eso se reconoce por el cuerpo.',
        repasa: ['masa'],
      },
      {
        pregunta: 'Lees el mismo párrafo tres veces, te aburres y te dan ganas de dejar el curso. ¿Qué barrera es?',
        opciones: [
          'Estudiar a ciegas',
          'Entrar antes de tiempo',
          'Palabra sin aclarar',
          'Falta de interés en el tema',
        ],
        explicacion: 'El aburrimiento y las ganas de abandonar rara vez son falta de interés: son el síntoma de una palabra que quedó atrás sin entender.',
        repasa: ['palabra-malentendida'],
      },
      {
        pregunta: 'Cuando una persona tiene su puesto tomado de verdad, se corrige sola y empuja por iniciativa propia.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Son las dos cosas que se notan de inmediato en el Centro. Donde cada quien improvisa su cargo, el desorden no para.',
      },
      {
        pregunta: 'Ver una vez el video de tu puesto ya cuenta como tomar el puesto.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Un video que se ve una vez no te da el puesto, y una charla tampoco. Tomar el puesto es un entrenamiento formal: antes no podías ejecutar tu puesto sola, después sí.',
        repasa: ['puesto-en-cubierta'],
      },
    ],
    drills: [],
  },

  // minimoAprobacion(7) = 6 de 7. No se escribe: lo calcula el motor.
  {
    id: 'of-met-2',
    curso: 'metodo',
    orden: 2,
    roles: ['administradora', 'asistente'],
    titulo: 'La palabra sin aclarar y cómo se despeja, paso a paso',
    duracionMin: 15,
    requiere: ['of-met-1'],
    fuente: ['00-como-se-estudia.html#hca5', '00-como-se-estudia.html#hca6'],
    pfv: 'Aclaras tú sola cualquier palabra que te trabe, sin depender de nadie, el resto de tu vida laboral.',
    voz: 'Esta es la barrera principal. <break time="0.3s"/> Es la razón número uno por la que la gente abandona un entrenamiento. <break time="0.5s"/> Lees una palabra que no tienes clara del todo. <break time="0.3s"/> Y justo después de esa palabra, te quedas en blanco. <break time="0.4s"/> Sigues leyendo, pero ya no estás registrando nada. <break time="0.3s"/> Los ojos avanzan. La comprensión se quedó atrás. <break time="0.5s"/> Y aquí está lo traicionero. <break time="0.3s"/> La palabra que te trabó está ANTES del punto donde tú sientes el problema. <break time="0.4s"/> Tú sientes que el final del capítulo estaba enredado. <break time="0.3s"/> El daño empezó tres párrafos arriba. <break time="0.5s"/> Ojo con una cosa. Leer la definición y seguir de largo no es aclarar nada. <break time="0.3s"/> La palabra queda clara cuando la usas tú, en frases tuyas, sobre tu trabajo.',
    masa: [
      'Un diccionario común, en papel o en el teléfono.',
      'El glosario de este entrenamiento abierto en otra pestaña.',
      'El módulo del Manual donde te trabaste la última vez, para practicar sobre algo real.',
    ],
    palabras: [
      'palabra-malentendida',
      'aclaracion-de-palabras',
      'paz-y-salvo',
      'itinerario',
      'desercion',
      'prima-de-produccion',
    ],
    bloques: [
      {
        t: 'p',
        texto: 'Esta es la barrera principal, y la razón número uno por la que la gente abandona un entrenamiento, se aburre o concluye que "no es para ella". Merece su propio módulo porque es la que más daño hace y la que menos se detecta sola.',
      },
      {
        t: 'p',
        texto: 'Es la barrera 3, y es de las de letra **O**: se resuelve mirando hacia atrás, no empujando hacia adelante.',
      },
      { t: 'sub', texto: 'Qué pasa exactamente' },
      {
        t: 'p',
        texto: 'Lees o escuchas una palabra cuyo significado no comprendes del todo. No hace falta que sea una palabra rara: basta con que no la tengas clara del todo. En ese instante, **te quedas en blanco justo después de esa palabra**. Y de ahí en adelante sigues leyendo, pero ya no estás registrando nada. Los ojos avanzan, la comprensión se quedó atrás.',
      },
      {
        t: 'p',
        texto: 'Por eso el fenómeno es tan traicionero: **la palabra que te trabó está antes del punto donde tú sientes el problema**. Tú sientes que "el final del capítulo estaba enredado". El daño empezó tres párrafos arriba.',
      },
      { t: 'sub', texto: 'Cómo se siente' },
      {
        t: 'lista',
        items: [
          'Sensación de vacío, de estar en blanco, de "me quedé sin nada".',
          'Lees el mismo párrafo tres veces y no se te queda.',
          'Aburrimiento. Ganas de mirar el teléfono.',
          'Cansancio repentino, sueño en pleno día.',
          'Ganas de dejar el curso. Fastidio con el material o con quien lo escribió.',
        ],
      },
      {
        t: 'nota',
        tono: 'alerta',
        titulo: 'Traducción directa',
        texto: 'El aburrimiento y las ganas de abandonar rara vez son falta de interés. Suelen ser el síntoma de una palabra que quedó atrás sin entender. Antes de concluir que el tema es muy difícil, búscala.',
      },
      { t: 'sub', texto: 'Ejemplo real: "paz y salvo"' },
      {
        t: 'p',
        texto: 'El Manual dice, literal, en el protocolo de atención a facturas vencidas: "Emisión de factura de 1 a 15 días: el asistente debe informar al acudiente por llamada o WhatsApp que su factura ha sido emitida y es importante estar **paz y salvo** para continuar recibiendo el servicio."',
      },
      {
        t: 'p',
        texto: '**Qué pasa si "paz y salvo" no está clara.** La frase suena a algo bonito y tranquilo. La persona no se detiene, porque no siente que no entendió: simplemente pasa. Y a partir de ahí, todo lo que sigue en ese protocolo —los tramos de vencimiento, la decisión del administrador, las cuentas incobrables— le entra como ruido. Lee los cuatro tramos y no le queda ninguno.',
      },
      {
        t: 'p',
        texto: '**Cómo se ve el problema en la práctica.** No se ve como "no entendí una palabra". Se ve así.',
      },
      {
        t: 'lista',
        items: [
          'No hace la llamada de los primeros 15 días, porque no tiene claro qué le va a decir al representante.',
          'La factura llega al día 16 y entra en vencimiento sin gestión.',
          'Nadie le informó al administrador a tiempo, así que no hubo decisión de acuerdo de pago ni de retiro.',
          'La cuenta llega a los tramos de 31 a 45 días y de 46 a 61 días, y termina pasando al personal de cobro.',
          'A fin de mes hay **cuatro clientes con más de dos facturas generadas sin pagar** —el máximo son tres clientes—: la **prima de producción se perdió**.',
        ],
      },
      { t: 'p', texto: 'Todo eso arrancó en dos palabras que nadie aclaró.' },
      {
        t: 'p',
        texto: '**Cómo se resuelve.** Estar paz y salvo es no deber nada: tener la cuenta en cero, sin facturas pendientes de pago. Aclarada la palabra, la frase del Manual se vuelve una instrucción concreta: llamo al representante para decirle que su factura ya está emitida y que necesita ponerse al día para seguir recibiendo las clases. Y el resto del protocolo, que antes era ruido, se lee de corrido.',
      },
      {
        t: 'sub',
        texto: 'Palabras del entorno ALOHA que traban a casi todo el mundo',
      },
      {
        t: 'p',
        texto: 'Estas son las que más veces se dejan pasar. Si alguna no la puedes explicar ahorita mismo con tus palabras, aclárala antes de seguir con tu curso.',
      },
      {
        t: 'tabla',
        encabezados: ['Palabra', 'Dónde te la vas a topar'],
        filas: [
          [
            '**paz y salvo**',
            'Protocolo de facturas vencidas, clases de reposición, correo de 15 días antes del cierre de nivel',
          ],
          [
            '**itinerario**',
            'Kinder, Tiny Tots y Kids; apertura de grupos; casos especiales de colocación',
          ],
          [
            '**recurrente**',
            'Factura recurrente de la mensualidad; detener la recurrencia cuando un niño se retira',
          ],
          [
            '**conciliar**',
            'Cuadrar dos fuentes que deben decir lo mismo: el sistema contra el cuadro de negocio',
          ],
          [
            '**deserción**',
            'Cuadro de deserciones, prima de producción, máximo 8 % al cierre de mes',
          ],
          [
            '**acudiente**',
            'Protocolo de cobranza y comunicaciones: es el representante que responde por el niño',
          ],
          [
            '**cotejo**',
            'Cuadro de negocio: los kits solicitados se usan como información de cotejo',
          ],
          [
            '**reválida**',
            'Repetición del examen de capacitación de un Coach que no pasó',
          ],
          [
            '**caja menuda**',
            'Compras menores, máximo B/.45.00, con reembolso en el sistema',
          ],
          [
            '**prima de producción**',
            'Incentivo mensual y trimestral atado a deserción, nuevos niños y cuentas por cobrar',
          ],
        ],
      },
      { t: 'sub', texto: 'Cómo se aclara una palabra, paso a paso' },
      {
        t: 'p',
        texto: 'Esto se llama **aclaración de palabras**. Es una destreza, no una idea: se aprende haciéndola y después la usas sola, sin ayuda de nadie, el resto de tu vida laboral.',
      },
      {
        t: 'pasos',
        items: [
          '**Detecta el punto donde te perdiste.** No sigas leyendo. Marca dónde estás.',
          '**Retrocede.** Devuélvete hasta la última parte que sí entendiste bien. La palabra está entre ese punto y donde te trabaste, normalmente al principio de ese tramo, no al final.',
          '**Ubica la palabra.** Lee ese tramo despacio, palabra por palabra. Es la primera que no puedas explicar con tus propias palabras. Cuidado con las palabras comunes y cortas: son las que más se dejan pasar.',
          '**Busca la definición.** Diccionario común primero. Aquí, además, el glosario del curso auto-enlaza los términos: la palabra aparece resaltada dentro del texto y al tocarla sale la definición sin que tengas que salir de la página.',
          '**Lee la definición completa.** Todas las acepciones, no la primera. Después decide cuál es la que aplica a la frase que estabas leyendo. Una palabra puede tener un significado en la calle y otro distinto en el Centro.',
          '**Úsala en frases tuyas.** Este es el paso que la gente se salta, y es el que hace el trabajo. Inventa frases propias, en voz alta, hasta que sientas que el concepto se te asentó. No una frase: varias, hasta que salgan solas.',
          '**Revisa las palabras de la definición.** Si dentro de la definición hay otra palabra que tampoco entiendes, aclara esa primero y después vuelve. Es normal que una palabra te lleve a dos.',
          '**Vuelve al texto.** Relee el párrafo desde el principio. Si ahora se entiende, era esa. Si sigue turbio, hay otra palabra antes: repite el proceso.',
        ],
      },
      { t: 'sub', texto: 'Cómo se ve el paso 6, con "paz y salvo"' },
      {
        t: 'p',
        texto: 'Definición: no deber nada; estar al día, con la cuenta en cero. Ahora las frases propias.',
      },
      {
        t: 'lista',
        items: [
          '"La señora Ríos está paz y salvo: pagó las dos facturas que tenía pendientes."',
          '"El niño no puede presentar el examen de cierre de nivel si el representante no está paz y salvo."',
          '"Antes de darle la clase de reposición tengo que verificar que esté paz y salvo."',
          '"Yo estoy paz y salvo con la tarjeta: la pagué completa este mes."',
        ],
      },
      {
        t: 'p',
        texto: 'Cuando puedes hacer eso sin esforzarte, la palabra quedó. Ya no te va a trabar nunca más.',
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Ojo con esto',
        texto: 'Leer la definición y seguir de largo no es aclarar una palabra. Es lo mismo que no haber parado. La palabra queda clara cuando la usas tú, en frases tuyas, sobre cosas de tu vida y de tu trabajo. Ese es el trabajo real.',
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Regla clave',
        texto: 'Ninguna clase de este entrenamiento empieza con teoría. Cada módulo abre con las palabras a aclarar de ese módulo. Ese bloque no es un calentamiento ni un requisito administrativo: es el módulo. Sáltatelo y el resto no te va a entrar.',
      },
    ],
    quiz: [
      {
        pregunta: 'Cuando pasas por una palabra que no comprendes del todo, ¿qué pasa exactamente?',
        opciones: [
          'Se te olvida esa palabra pero el resto se entiende igual',
          'Te quedas en blanco justo después de esa palabra y de ahí en adelante dejas de registrar',
          'Te devuelves solo y relees automáticamente',
          'No pasa nada mientras la palabra no sea técnica',
        ],
        explicacion: 'Los ojos avanzan, la comprensión se quedó atrás. Por eso se sigue leyendo sin registrar nada.',
        repasa: ['palabra-malentendida'],
      },
      {
        pregunta: '¿Dónde está la palabra que te trabó, respecto del punto donde sientes el problema?',
        opciones: [
          'Antes: el daño empezó atrás, aunque tú sientas que lo enredado es el final',
          'Después: la confusión viene de lo que todavía no has leído',
          'En el mismo párrafo donde te sientes perdida',
          'En el título del módulo',
        ],
        explicacion: 'Por eso el remedio empieza por retroceder hasta la última parte que sí entendiste bien.',
        repasa: ['palabra-malentendida'],
      },
      {
        pregunta: 'En el procedimiento de aclaración, ¿cuál es el paso que la gente se salta y es el que hace el trabajo?',
        opciones: [
          'Leer la primera acepción del diccionario',
          'Escribir la definición en el cuaderno',
          'Preguntarle a un compañero qué significa',
          'Usar la palabra en varias frases propias hasta que salgan solas',
        ],
        explicacion: 'Leer la definición y seguir de largo es lo mismo que no haber parado. La palabra queda cuando la usas tú.',
        repasa: ['aclaracion-de-palabras'],
      },
      {
        pregunta: 'Estar "paz y salvo" quiere decir…',
        opciones: [
          'Que el niño aprobó su nivel',
          'Que la factura fue emitida',
          'No deber nada: la cuenta en cero, sin facturas pendientes de pago',
          'Que el representante firmó el contrato',
        ],
        explicacion: 'Aclarada la palabra, la frase del Manual se vuelve una instrucción concreta: llamar al representante para que se ponga al día.',
        repasa: ['paz-y-salvo'],
      },
      {
        pregunta: 'Si dentro de la definición que estás leyendo aparece otra palabra que tampoco entiendes, ¿qué haces?',
        opciones: [
          'Sigues con la primera y la otra la dejas para el final del curso',
          'Aclaras esa primero y después vuelves a la primera',
          'Cambias de diccionario',
          'Anotas las dos y sigues leyendo el módulo',
        ],
        explicacion: 'Es normal que una palabra te lleve a dos. Se aclara la de adentro y después se vuelve.',
        repasa: ['aclaracion-de-palabras'],
      },
      {
        pregunta: 'El aburrimiento y las ganas de dejar el curso casi siempre son falta de interés en el tema.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Suelen ser el síntoma de una palabra que quedó atrás sin entender. Antes de concluir que el tema es difícil, búscala.',
        repasa: ['palabra-malentendida'],
      },
      {
        pregunta: 'Cada módulo de este entrenamiento abre con las palabras a aclarar, y ese bloque es parte del módulo, no un calentamiento.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Ninguna clase empieza con teoría. Si te lo saltas, el resto no te va a entrar.',
      },
    ],
    drills: [],
  },

  // minimoAprobacion(10) = 8 de 10. No se escribe: lo calcula el motor.
  {
    id: 'of-met-3',
    curso: 'metodo',
    orden: 3,
    roles: ['administradora', 'asistente'],
    titulo: 'A la vista, el orden y la maniobra: cómo se aprueba de verdad',
    duracionMin: 25,
    requiere: ['of-met-2'],
    fuente: [
      '00-como-se-estudia.html#hca3',
      '00-como-se-estudia.html#hca4',
      '00-como-se-estudia.html#hca7',
      '00-como-se-estudia.html#hca8',
      '00-como-se-estudia.html#hca9',
      '00-como-se-estudia.html#hca10',
      '00-como-se-estudia.html#hca11',
    ],
    pfv: 'Pones a la vista lo que hace falta antes de abrir cualquier módulo, te devuelves cuando te atascas y cierras cada módulo con su maniobra hecha hasta que sale bien.',
    voz: 'Lo que va a la vista es la cosa real de la que habla lo que estás estudiando. <break time="0.4s"/> El formato que vas a llenar. La pantalla que vas a usar. <break time="0.5s"/> Estudiar a ciegas es aprender a manejar leyendo un manual en la sala. <break time="0.3s"/> Sin carro. <break time="0.5s"/> Si abriste un módulo y no tienes delante lo que describe, para. <break time="0.3s"/> Consíguelo primero. <break time="0.4s"/> El orden es lo otro. Si te atascas, el problema no está donde te atascaste. <break time="0.3s"/> Está antes. Devuélvete. <break time="0.5s"/> Y todo módulo cierra con su maniobra. <break time="0.3s"/> Esa no la apruebas respondiendo. La apruebas haciéndola, delante de tu jefe entrenador. <break time="0.4s"/> Y la firma él. Tú no. <break time="0.4s"/> De tu producto respondes tú.',
    masa: [
      'El sistema y los formatos reales de tu Centro a la mano: es sobre ellos que se hace toda maniobra.',
      'Tu jefe inmediato avisado de que vas a pedirle la primera maniobra esta semana.',
      'Papel y lápiz para escribir las tres palabras aclaradas y el producto de tu puesto.',
    ],
    palabras: [
      'masa',
      'gradiente',
      'drill',
      'checksheet',
      'oficial-de-entrenamiento',
      'producto-final-valioso',
      'revalida',
      'repeticion-de-nivel',
      'itinerario',
    ],
    bloques: [
      { t: 'sub', texto: 'Barrera 1 — Estudiar a ciegas: qué es' },
      {
        t: 'p',
        texto: '**Lo que va a la vista** es la cosa real de la que habla lo que estás estudiando: el objeto físico, el sistema, el documento, el lugar. Estudiar a ciegas es estudiar el concepto sin tener nada de eso delante. Puras palabras en el aire.',
      },
      {
        t: 'p',
        texto: 'Es como aprender a manejar leyendo un manual en la sala de tu casa, sin carro. Puedes leerlo tres veces y seguir sin poder arrancar.',
      },
      { t: 'sub', texto: 'Cómo se siente' },
      {
        t: 'p',
        texto: 'Esta barrera es la única que da síntomas físicos claros, y por eso es fácil de reconocer una vez que sabes qué buscar.',
      },
      {
        t: 'lista',
        items: [
          'Dolor de cabeza.',
          'Mareo o sensación de aturdimiento.',
          'Malestar general, sensación de estar aplastada o apretada.',
          'Molestia en los ojos, cansancio que no corresponde al esfuerzo hecho.',
          'Ganas de pararte, de tomar aire, de salir del salón.',
        ],
      },
      {
        t: 'p',
        texto: 'Si estás leyendo un módulo diez minutos y empiezas a sentirte mal, revisa primero esto: qué te está describiendo el texto que tú no tienes delante. Casi siempre es un formato, un objeto o una pantalla que deberías tener en la mano y no la tienes.',
      },
      { t: 'sub', texto: 'Qué haces' },
      { t: 'p', texto: 'Pones la cosa delante, en este orden de preferencia.' },
      {
        t: 'pasos',
        items: [
          '**El objeto real:** el sistema abierto en pantalla, el formato impreso en la mano, el salón, el ábaco, el libro del niño.',
          '**Una demostración:** que alguien te lo haga una vez mientras lo miras, o el video de pantalla del procedimiento.',
          '**Una foto o un modelo razonable:** la captura del documento, el formato lleno de ejemplo.',
        ],
      },
      {
        t: 'tabla',
        titulo: 'Cómo se ve en el Centro',
        encabezados: ['Estudiar así no sirve', 'Estudiar así sí sirve'],
        filas: [
          [
            'Leer el protocolo de facturas vencidas en el teléfono, en tu casa',
            'Leerlo con Zoho abierto y el reporte de cuentas por cobrar de tu Centro en pantalla',
          ],
          [
            'Leer qué es el formato KITS A PEDIR',
            'Tener el cuadro KITS A PEDIR abierto en Drive mientras lo lees',
          ],
          [
            'Leer cómo se llenan las hojas de asistencia',
            'Tener la hoja de asistencia real del grupo encima de la mesa',
          ],
          [
            'Leer el recorrido de la clase de prueba',
            'Pararte en el salón donde se hace y caminar el recorrido',
          ],
        ],
      },
      {
        t: 'nota',
        tono: 'alerta',
        titulo: 'No arranques a ciegas',
        texto: 'Si abriste un módulo y no tienes delante lo que ese módulo describe, para. Consíguelo primero. Estudiar a ciegas no es "avanzar aunque sea algo": es gastar el tiempo y quedarte con la sensación de que ya lo viste, que es peor que no haberlo leído.',
      },
      { t: 'sub', texto: 'Lo que va a la vista: los tipos que usamos aquí' },
      {
        t: 'tabla',
        encabezados: ['Qué pones a la vista', 'Qué es en concreto'],
        filas: [
          [
            '**El sistema abierto en pantalla**',
            'Zoho Books en tu organización, el Drive del Centro con sus formatos, esta plataforma',
          ],
          [
            '**El formato real impreso**',
            'Hoja de asistencia, Hoja de Supervisión Coach, Solicitud de Permisos, KITS A PEDIR, Cuadro de Negocio',
          ],
          [
            '**El recorrido físico por el Centro**',
            'Caminar la recepción, los salones, el área de padres, el archivo, el recorrido de una clase de prueba',
          ],
          [
            '**El documento firmado**',
            'Contrato del colaborador, expediente del Coach, contrato del representante, bitácora con fecha y firma',
          ],
          [
            '**La factura real**',
            'Una factura emitida de tu Centro, un pago aplicado, un reporte de cuentas por cobrar del mes pasado',
          ],
          [
            '**El material del Programa**',
            'El ábaco, el libro del nivel, el kit completo tal como se le entrega al niño',
          ],
        ],
      },
      { t: 'sub', texto: 'Ejemplo de cómo se prepara un módulo' },
      {
        t: 'p',
        texto: 'Vas a estudiar el módulo de cobranza. Antes de leer la primera línea, sobre tu escritorio y tu pantalla debe estar:',
      },
      {
        t: 'lista',
        items: [
          'Zoho abierto en la organización de tu Centro.',
          'El reporte de cuentas por cobrar del mes pasado, en pantalla.',
          'Una factura vencida real, impresa o en pantalla.',
          'El número de WhatsApp del Centro a la mano, que es la herramienta con la que se gestiona.',
        ],
      },
      {
        t: 'p',
        texto: 'Toma cinco minutos armar eso. Sin eso, el módulo completo son palabras en el aire y a los tres días no te queda nada.',
      },
      {
        t: 'nota',
        tono: 'alerta',
        titulo: 'Error de método',
        texto: 'Marcar un módulo como visto sin haber tenido nada a la vista. Queda registrado como avance, tu jefe cree que ya lo sabes, te sueltan el área y el error aparece con dinero de por medio. Si no lo tuviste delante, no lo marques. Consecuencia: la casilla se anula y el paso se repite. No lo confundas con una falta grave, que en el Manual es otra cosa y es causal de despido inmediato: alterar edades, falsificar informes, emitir constancias sin autorización. Un módulo mal marcado se corrige; eso no.',
      },
      { t: 'sub', texto: 'Barrera 2 — Entrar antes de tiempo: qué es' },
      {
        t: 'p',
        texto: '**El orden** es eso: de lo fácil a lo difícil, un paso a la vez, y cada paso apoyado en el que ya dominaste. Entrar antes de tiempo es el salto demasiado brusco: intentar una acción difícil sin haber dominado el paso anterior que era indispensable.',
      },
      { t: 'sub', texto: 'Cómo se siente' },
      {
        t: 'lista',
        items: [
          'Confusión. Todo se te mezcla y no sabes por dónde agarrarlo.',
          'Sensación de incapacidad: "esto es muy complicado", "yo no soy buena para los sistemas".',
          'Haces el procedimiento pero no entiendes por qué lo estás haciendo.',
          'Pides que te lo repitan y a la tercera vez sigue igual de confuso.',
        ],
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'La regla clave, y es contraintuitiva',
        texto: 'Cuando te atascas, la dificultad real no está en el paso donde te atascaste. Está en un paso anterior que no quedó asimilado del todo. No nades más fuerte. Mira mejor. Repetir el paso actual más veces no lo arregla: estás martillando en el lugar equivocado.',
      },
      { t: 'sub', texto: 'Cómo se ve en el Centro' },
      {
        t: 'lista',
        items: [
          'No puedes montar la nómina de Coaches si todavía no dominas registrar un pago. Te vas a atascar en la nómina, pero el hueco está en pagos.',
          'No puedes cuadrar el cuadro de negocio contra el sistema si no tienes claro qué artículo corresponde a cada centro. Te atascas en el cuadre; el hueco está en el catálogo.',
          'No puedes gestionar una factura vencida si no tienes claro qué es estar paz y salvo. Te atascas en la llamada al representante; el hueco está tres módulos atrás.',
        ],
      },
      {
        t: 'p',
        texto: 'ALOHA aplica esta misma regla con los niños, y por eso el Manual lo tiene escrito: un grupo abre con **mínimo 10 niños** (Tiny Tots puede abrir con **8**); en el itinerario Tiny Tots se pueden incorporar niños nuevos **hasta la semana 4**, y en KIDS **únicamente hasta la semana 2 del libro**. Y un niño graduado de Tiny Tots que pasa a Kids **ingresa en el nivel 5**, no en el 1. Nada de eso es capricho: es el orden. Al niño no se le monta encima un paso que no puede dar. A ti tampoco.',
      },
      {
        t: 'sub',
        texto: 'La regla del orden: si te atascas, el problema está antes',
      },
      {
        t: 'p',
        texto: 'El orden de los módulos de tu curso no es un índice: es **estricto**. Cada módulo usa solamente lo que ya dominaste en los anteriores, y nada más. Está armado así a propósito. Por eso, cuando algo se pone imposible, la respuesta no es empujar más duro. Es devolverse.',
      },
      {
        t: 'pasos',
        items: [
          'Para de leer o de practicar. No sigas por terquedad.',
          'Identifica **el último punto donde ibas bien**: el último procedimiento que entendiste y podías ejecutar.',
          'Regresa a ese punto exacto. No al principio del curso: a ese punto.',
          'Desde ahí avanza despacio y busca dos cosas: **la palabra que no quedó** o **el paso que nunca hiciste con las manos**.',
          'Arregla eso: aclara la palabra, o haz el paso con la cosa real delante.',
          'Retoma donde te habías atascado. Va a estar fácil.',
        ],
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Regla clave',
        texto: 'Si un alumno se atasca, no se le repite el módulo actual más fuerte ni más veces. Se le manda al paso anterior. Esto vale para ti estudiando sola y vale para tu jefe cuando te esté entrenando: repetir encima de un hueco no lo tapa.',
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Devolverse no es retroceder',
        texto: 'El Manual lo dice de los niños con todas sus letras: la repetición de nivel no se considera un retroceso ni un fracaso, sino una oportunidad pedagógica de afianzamiento. Contigo aplica igual.',
      },
      { t: 'sub', texto: 'Cómo se aprueba: la maniobra' },
      {
        t: 'p',
        texto: 'Aquí no apruebas por responder un cuestionario. Apruebas por **demostrar que puedes hacerlo**.',
      },
      {
        t: 'p',
        texto: '**Para qué sirve el cuestionario entonces.** No pone nota: ubica. Tiene un solo trabajo útil, y es detectar palabras sin aclarar. Cada pregunta que fallas te está señalando dónde quedó un hueco. No es la nota lo que importa: es el mapa de lo que tienes que devolverte a aclarar. Una nota alta con procedimientos que no sabes ejecutar no vale nada en un Centro.',
      },
      {
        t: 'p',
        texto: '**Qué es una maniobra.** Una maniobra es hacerlo de verdad. No contar cómo se hace: hacerlo. Cada bloque de cada curso cierra con una.',
      },
      {
        t: 'tabla',
        encabezados: ['Eso no es una maniobra', 'Eso sí es una maniobra'],
        filas: [
          [
            'Explicar qué es una factura recurrente',
            'Crear una factura recurrente en el sistema y detenerla, con alguien mirándote',
          ],
          [
            'Decir cuáles son los tramos de vencimiento',
            'Tomar el reporte real y hacer la llamada de gestión del tramo que corresponde',
          ],
          [
            'Enumerar los campos de KITS A PEDIR',
            'Llenar el cuadro con los grupos que están próximos a cierre de nivel de tu Centro',
          ],
          [
            'Contar cómo se recibe a un padre en clase de prueba',
            'Hacer el recorrido completo de la clase de prueba, de principio a fin',
          ],
        ],
      },
      { t: 'sub', texto: 'Cómo se hace bien una maniobra' },
      {
        t: 'pasos',
        items: [
          'En condiciones reales: el sistema de verdad, el formato de verdad, el Centro de verdad.',
          'Sin que nadie te vaya soplando el paso siguiente.',
          'Completa, de principio a fin, incluido el cierre del procedimiento.',
          'Si sale mal: se identifica **qué** falló, se corrige, y **se repite completa**.',
          'Se repite hasta que sale bien. No hasta que se hizo una vez.',
        ],
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Regla clave',
        texto: 'La maniobra se hace hasta que sale bien, no hasta que se responde una vez. Y "sale bien" quiere decir que la hiciste sola, completa y sin dudar. Si dudaste en un paso, ese paso tiene una palabra o un hueco atrás.',
      },
      {
        t: 'p',
        texto: 'Es exactamente el criterio que ALOHA usa con los niños: no se pasa de nivel por asistir. El Manual fija el **puntaje mínimo reglamentario del 60 %** en la evaluación final del nivel, y quien no lo alcanza repite. Y con los Coaches igual: la capacitación de nivel dura **aproximadamente 32 horas para los niveles 1 y 2** y **aproximadamente 16 horas para los niveles 3 al 8**, cierra con examen, y quien no pasa coordina **reválida**. La organización no baja el estándar: te da otra vuelta.',
      },
      { t: 'sub', texto: 'Tu jefe inmediato es tu jefe entrenador' },
      {
        t: 'p',
        texto: 'Aquí el ejecutivo no es solo el que manda: es **tu jefe, en su papel de entrenador**. Designa las tareas y se asegura de que la capacitación de cada persona se lleve a cabo de manera competente.',
      },
      {
        t: 'p',
        texto: 'Mira bien lo que eso significa en la práctica, porque ahí está el peso del cargo: la maniobra te la toma él, te la ve hacer y la firma él. Tú no. Y no te suelta el área hasta verte hacerla.',
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Regla clave',
        texto: 'Un ejecutivo no disminuye el control de un sector hasta estar completamente seguro de que la persona está capacitada y de que su potencial fue probado en la práctica. No en el papel, no en la conversación, no en la buena impresión: en la práctica. Léelo al derecho: a ti no te sueltan un área hasta que te vean hacerla. Y eso no es desconfianza: es lo que impide que te entreguen una responsabilidad para la que todavía no estás lista y que el golpe te lo lleves tú.',
      },
      { t: 'sub', texto: 'Las palabras del método, aclaradas de una vez' },
      {
        t: 'p',
        texto: 'Son nueve y las vas a ver en todo el entrenamiento. Aclara estas nueve antes de abrir el paquete de tu puesto: son las únicas que hacen falta para entender el entrenamiento mismo. Las palabras del negocio se aclaran después, en cada maniobra, con la cosa real delante.',
      },
      {
        t: 'tabla',
        encabezados: ['Palabra', 'Qué es'],
        filas: [
          [
            '**Tu puesto**',
            'Tu cargo y todo lo que trae: responsabilidades, tareas y el producto que entrega.',
          ],
          [
            '**El producto de tu puesto**',
            'La cosa concreta, contable y de calidad que tu puesto le entrega al Centro. Existe o no existe a fin de mes.',
          ],
          [
            '**Lo que va a la vista**',
            'El objeto real de lo que estudias, o una representación razonable: el formato en la mano, el sistema en pantalla, el salón, una foto.',
          ],
          [
            '**El orden**',
            'La dificultad de menos a más, donde cada paso se apoya en el anterior ya dominado. El principio, en tres palabras: entrar a tiempo.',
          ],
          [
            '**Palabra sin aclarar**',
            'Una palabra cuyo significado no comprendiste del todo. Después de ella te quedas en blanco.',
          ],
          [
            '**Aclaración de palabras**',
            'El procedimiento de ocho pasos del módulo anterior para desatascar una palabra: localizarla, definirla y usarla en frases propias hasta que el concepto quede claro.',
          ],
          [
            '**La maniobra**',
            'Hacer la acción de verdad, con un caso real y la cosa a la vista. No es un cuestionario: se aprueba haciéndola.',
          ],
          [
            '**Tu plan de puesto**',
            'La hoja de pasos de tu entrenamiento, en orden, donde cada paso se firma con fecha cuando tu jefe te lo vio hecho. No es una lista de lectura: es el plan completo del puesto, y sin firma no hay paso.',
          ],
          [
            '**Tu jefe entrenador**',
            'Tu jefe inmediato en su papel de entrenador: designa la tarea, verifica que la sepas hacer y firma.',
          ],
        ],
      },
      {
        t: 'tabla',
        titulo: 'Quién te entrena y quién te verifica',
        encabezados: ['Si eres...', 'Tu jefe inmediato, tu jefe entrenador'],
        filas: [
          ['Asistente Administrativo', 'El Administrador del Centro'],
          ['Coach', 'El Administrador del Centro'],
          [
            'Personal de apoyo y aseo',
            'El Asistente Administrativo, bajo el Administrador del Centro',
          ],
          [
            'Administrador de Centro',
            'La Junta Directiva, o el personal que ésta defina para el control y supervisión de sus intereses. Para temas de personal (contratos, permisos, seguro social), el Coordinador Operativo',
          ],
        ],
      },
      { t: 'sub', texto: 'Cómo se ve la verificación en el Manual' },
      {
        t: 'lista',
        items: [
          '**Al entrar:** el primer contrato es de tres meses con un mes de prueba. Cumplido ese primer mes, el supervisor inmediato evalúa tu rendimiento y hace los ajustes que sean necesarios. Superado el primer contrato, el Administrador solicita la renovación y el Coordinador Operativo confecciona el segundo contrato, de un año con tres meses de prueba.',
          '**Durante:** los supervisores y colaboradores discuten desempeño y objetivos sobre una base diaria e informal, además de las evaluaciones formales.',
          '**A los Coaches:** el Administrador evalúa a cada Coach **al menos dos veces** dentro del tiempo estimado de cada grupo (se pueden hacer en la **semana 4**, inicio de mentales, y en la **semana 9**), le da retroalimentación de esa clase, y la hoja de evaluación se anexa a su expediente.',
        ],
      },
      { t: 'sub', texto: 'Qué te toca a ti en esa relación' },
      {
        t: 'pasos',
        items: [
          'Avisar cuando te atascas, **en el momento**. No a fin de mes.',
          'Decir en qué punto te atascaste y qué palabra o qué paso crees que fue. Eso le ahorra a tu jefe media hora de adivinanza.',
          'Pedir la maniobra. No esperar a que te la pidan.',
          'Pedir lo que va a la vista cuando no lo tienes: el acceso al sistema, el formato, el archivo.',
        ],
      },
      {
        t: 'nota',
        tono: 'ojo',
        titulo: 'Preguntar nunca es la falta',
        texto: 'La norma de ética del Manual dice que si se genera una situación en la que es difícil determinar el procedimiento adecuado a seguir, debes discutirlo abiertamente con tu superior inmediato para obtener asesoramiento. La falta es inventarse el procedimiento y no decírselo a nadie.',
      },
      { t: 'sub', texto: 'Tu arranque: la lista antes del primer módulo de tu curso' },
      {
        t: 'tabla',
        encabezados: ['#', 'Antes de abrir cualquier módulo'],
        filas: [
          [
            '1',
            'Leo las **palabras a aclarar** del módulo y aclaro las que no domino. Sin excepción.',
          ],
          [
            '2',
            'Pongo **a la vista** lo que hace falta: el sistema abierto, el formato en la mano, el documento en pantalla.',
          ],
          [
            '3',
            'Si me siento mal, confundida o aburrida, **paro** e identifico cuál de las tres barreras es.',
          ],
          [
            '4',
            'Si me atasco, **me devuelvo** al último punto donde iba bien. No repito más fuerte.',
          ],
          [
            '5',
            'Cierro el módulo con su **maniobra**, hecha hasta que sale bien, y la demuestro ante mi jefe inmediato.',
          ],
        ],
      },
      { t: 'sub', texto: 'Las tres preguntas de cierre de cada módulo' },
      {
        t: 'p',
        texto: 'Cuando termines cualquier módulo de tu curso, respóndete estas tres. Si alguna se te traba, el módulo no está cerrado.',
      },
      {
        t: 'lista',
        items: [
          '¿Puedo **hacerlo**, no solo contarlo?',
          '¿Hay alguna palabra de este módulo que no pueda explicar con mis propias palabras?',
          '¿Cuál es **el producto de mi puesto** y en qué contribuyó lo que acabo de aprender?',
        ],
      },
      {
        t: 'nota',
        tono: 'regla',
        titulo: 'Con esto queda dicho todo',
        texto: 'Un entrenamiento no se aprueba leyendo. Se aprueba haciendo. Y quien puede hacer su puesto completo, se corrige sola, empuja por su cuenta y sostiene el Centro. De tu producto respondes tú. Ese es el objetivo de todo lo que sigue.',
      },
    ],
    quiz: [
      {
        pregunta: 'Abres un módulo y no tienes delante lo que ese módulo describe. ¿Qué haces?',
        opciones: [
          'Paras y pones a la vista lo que hace falta: sin eso el módulo son palabras en el aire',
          'Avanzas igual, algo se queda',
          'Lo lees y lo repasas mañana con el formato delante',
          'Lo marcas como visto y lo practicas después',
        ],
        explicacion: 'Estudiar a ciegas no es "avanzar aunque sea algo": es gastar el tiempo y quedarte con la sensación de que ya lo viste, que es peor que no haberlo leído.',
        repasa: ['masa'],
      },
      {
        pregunta: 'Te atascas en la nómina de Coaches. Según la regla del orden, ¿dónde está la dificultad real?',
        opciones: [
          'En el paso de la nómina, que hay que repetir más veces',
          'En un paso anterior que no quedó asimilado, por ejemplo registrar un pago',
          'En el sistema, que está mal configurado',
          'En que ese módulo no es para tu puesto',
        ],
        explicacion: 'Repetir el paso actual más fuerte no lo arregla: estás martillando en el lugar equivocado.',
        repasa: ['gradiente'],
      },
      {
        pregunta: '¿Cuál de estas cuatro cosas es una maniobra?',
        opciones: [
          'Explicar qué es una factura recurrente',
          'Decir cuáles son los tramos de vencimiento',
          'Crear una factura recurrente en el sistema y detenerla, con alguien mirándote',
          'Enumerar los campos de KITS A PEDIR',
        ],
        explicacion: 'Una maniobra es hacerlo de verdad, no contar cómo se hace.',
        repasa: ['drill'],
      },
      {
        pregunta: 'Una maniobra se repite hasta que…',
        opciones: [
          'Se hizo una vez de principio a fin',
          'Lo apruebe el cuestionario',
          'Se acabe el tiempo asignado al módulo',
          'Sale bien: sola, completa y sin dudar',
        ],
        explicacion: 'Si dudaste en un paso, ese paso tiene una palabra o un hueco atrás.',
        repasa: ['drill'],
      },
      {
        pregunta: '¿Para qué sirve el cuestionario en este entrenamiento?',
        opciones: [
          'No pone nota, ubica: cada pregunta fallada señala dónde quedó una palabra sin aclarar',
          'Para poner la nota que decide si apruebas el módulo',
          'Para sustituir la maniobra cuando no hay tiempo',
          'Para medir cuánto memorizaste del Manual',
        ],
        explicacion: 'Una nota alta con procedimientos que no sabes ejecutar no vale nada en un Centro.',
        repasa: ['drill'],
      },
      {
        pregunta: 'Tu plan de puesto es…',
        opciones: [
          'Una lista de lecturas recomendadas',
          'La hoja de pasos de tu entrenamiento, en orden, donde cada paso se firma con fecha cuando tu jefe te lo vio hecho',
          'El cuestionario final del curso',
          'El formato donde el Coach anota la asistencia',
        ],
        explicacion: 'No es una lista de lectura: es el plan completo del puesto, y sin firma no hay paso.',
        repasa: ['checksheet'],
      },
      {
        pregunta: '¿Cuándo un ejecutivo disminuye el control de un sector?',
        opciones: [
          'Cuando la persona termina de leer todos los módulos',
          'Cuando la persona cumple tres meses en el puesto',
          'Cuando está completamente seguro de que la persona está capacitada y su potencial fue probado en la práctica',
          'Cuando la persona lo pide por escrito',
        ],
        explicacion: 'No en el papel, no en la conversación, no en la buena impresión: en la práctica.',
        repasa: ['oficial-de-entrenamiento'],
      },
      {
        pregunta: 'Marcar un módulo como visto sin haber tenido nada a la vista es una falta grave y causal de despido inmediato.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es un error de método: la casilla se anula y el paso se repite. La falta grave del Manual es otra cosa (alterar edades, falsificar informes, emitir constancias sin autorización) y esa sí es causal de despido inmediato.',
        repasa: ['masa'],
      },
      {
        pregunta: 'El orden de los módulos de tu curso es estricto: cada módulo usa solamente lo que ya dominaste en los anteriores.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Está armado así a propósito. Por eso, cuando algo se pone imposible, la respuesta es devolverse, no empujar más duro.',
        repasa: ['gradiente'],
      },
      {
        pregunta: 'Cuando un alumno se atasca, hay que repetirle el módulo actual más veces hasta que le entre.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Se le manda al paso anterior. Repetir encima de un hueco no lo tapa.',
        repasa: ['gradiente'],
      },
    ],
    drills: [
      {
        titulo: 'Maniobra de arranque — Aclarar tres palabras y decir tu producto sin leer',
        fuente: '00-como-se-estudia.html#hca11',
        proposito: 'Que sepas aclarar una palabra tú sola con los ocho pasos, y que puedas decir el producto de tu puesto en una sola frase, sin leerla.',
        gradiente: 'Exige los módulos 1 y 2 del método estudiados. Si todavía no puedes explicar qué es una palabra sin aclarar, vuelve al módulo anterior antes de intentar esta maniobra.',
        masa: [
          'Un diccionario común, en papel o en el teléfono.',
          'El glosario de este entrenamiento abierto.',
          'Papel y lápiz, o el cuaderno donde vas a dejar el trabajo por escrito.',
        ],
        pasos: [
          'Toma tres palabras de la tabla de palabras que traban a casi todo el mundo. Empieza obligatoriamente por **paz y salvo**.',
          'Aclara cada una con los ocho pasos de la aclaración de palabras.',
          'Escribe, por cada palabra: la definición que usaste, la fuente donde la buscaste y **tres frases propias** con ella, referidas a tu trabajo.',
          'Escribe **el producto de tu puesto** en una sola frase, sin copiarla de la tabla.',
          'Entrégalo a tu jefe inmediato y explícaselo **en voz alta, sin leer**.',
          'Si te trabas al explicar, esa palabra todavía no quedó: vuelve al paso 1 con esa.',
        ],
        criterios: [
          'Entrega por escrito las tres palabras con su definición, su fuente y tres frases propias de su trabajo por cada una.',
          'Explica las tres en voz alta, sin leer y sin trabarse.',
          'Dice el producto de su puesto en una sola frase, con sus palabras, sin copiarlo de la tabla.',
          'Nombra las tres barreras y el remedio de cada una, sin consultar el módulo.',
        ],
        errorTipico: 'Leer la definición del diccionario y darla por aclarada, sin inventar las frases propias. Se delata en el paso 5: la persona puede recitar la definición pero no logra usar la palabra en una frase de su trabajo sin pensarlo mucho.',
      },
    ],
  },
]
