// Bloque B — Coordinar la operación. Curso propio del Coordinador Operativo.
// Diez módulos: of-cop-1 … of-cop-10, órdenes 14 a 23. El paquete del puesto
// (of-hat-cop, orden 13) vive en cursos/hat-coordinador.js, como of-hat-asi.
//
// NOMBRE DEL ARCHIVO. El curso se llama `coordinacion` (la clave de CURSOS en
// catalogo.js y la que viaja en la URL); el archivo se llama por el PUESTO,
// igual que hat-administradora.js y hat-asistente.js. El barril de
// cursos/todos.js importa de AQUÍ:
//     import { COORDINACION } from './coordinador.js'
// Se exporta también como COORDINADOR por si el andamiaje lo pide con ese
// nombre: son la misma lista, no dos.
//
// El `id` es la CLAVE DE PROGRESO en entrenamiento_progreso.modulo: renombrarlo
// borra en silencio el avance de todo el mundo. No se renumera nunca.
//
// ── DE DÓNDE SALE CADA COSA, Y POR QUÉ SE ROTULA ──────────────────────────
// El Manual de Operaciones NO tiene sección de Coordinador Operativo. Lo
// menciona DIEZ veces, todas de trámite, y todas verificadas una por una:
//   L546  el permiso autorizado de la Asistente se le envía y reposa en el file
//   L552  todo documento de permiso le llega inmediatamente tras autorizarse
//   L554  eleva su propia solicitud a la Junta Directiva por correo
//   L1965 recibe del Administrador el formato SOLICITUD DE CONTRATO
//   L1967 confecciona el primer contrato: tres meses con uno de prueba
//   L1975 confecciona la renovación: un año con tres meses de prueba
//   L1981 busca las firmas, sella en el Ministerio de Trabajo, inscribe en CSS
//   L2171 le notifican de inmediato todo arreglo de pago
//   L2173 verifica en el Drive que la cuenta incobrable esté cargada
//   L2175 tramo 46-61 días: pasa la lista al personal de cobro
// Todo lo demás (que cada centro esté entrenado, las reuniones semanales, Zoho
// ordenado, el reporte a la Junta) lo describió Fernando y NO está escrito en el
// Manual. Y los dos marcadores, las 110 metas marcadas a mano y el centro en 88
// por ciento que decrece salen del propio sistema: son hallazgo, no norma.
// Cada bloque que no tenga respaldo literal lleva su nota { tono:'ojo',
// titulo:'Pendiente con la Junta Directiva' }, igual que of-hat-asi rotula la
// unidad del indicador de cobranza. El Manual es lo que se audita.
//
// ── LAS CIFRAS DEL HALLAZGO, Y CUÁLES SE PUEDEN RE-DERIVAR HOY ────────────
// of-cop-3 enseña seis cifras del barrido de metas de 2026-09. Cuatro se
// vuelven a sacar del repo cuando haga falta:
//   110 filas marcadas a mano → scripts/backfill-metas-cumplimiento-2026-09-05.mjs (cabecera)
//   90 discrepancias y las 10 del trimestre en curso → lib/discrepancias-historico.mjs (cabecera)
//   86 de 90 en la misma dirección → test/discrepancias-metas.test.mjs
//   el 88 por ciento en verde fallando las tres metas → lib/marcadores.mjs (cabecera)
// Las otras dos —49 de 49 en cobranza y 35 de 40 trimestres con la marca
// copiada— salen del mismo barrido pero NO quedaron anotadas en ningún archivo
// del repo: el manifiesto del backfill ya se aplicó y hoy trae cambios:[] y
// coinciden:330. Por eso se cuentan en la prosa, que es donde enseñan la FORMA
// del desvío, y NO son respuesta de examen: certificar a alguien sobre un
// número que no se puede volver a derivar es exactamente el defecto que este
// módulo enseña a cazar. Si alguien vuelve a correr el barrido y las deja
// anotadas, se devuelven al quiz.


//
// Los índices correctos del quiz viven en
// lib/entrenamiento/respuestas-oficio/coordinador.js (solo servidor).
//
// VOCABULARIO. Aquí se renombró solo lo VISIBLE; la cabecera completa está en
// cursos/metodo.js. Estos módulos son operativos: cifras, plazos y pasos van
// literales y no llevan ni una imagen marítima.

export const COORDINACION = [
  // ══════════════════════════════════════════════════════════════════════════
  // 14 · of-cop-1
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'of-cop-1',
    curso: 'coordinacion',
    orden: 14,
    roles: ['coordinador'],
    titulo: 'La reunión semanal con el centro y la ruta de nivel',
    duracionMin: 20,
    requiere: ['of-hat-cop'],
    fuente: [
      'descripcion-del-puesto-fernando#reuniones-semanales',
      'app/centro/[id]/ruta-nivel/page.js',
      'manual-operaciones-completo.md#nivel-del-centro',
    ],

    pfv: 'Una reunión por semana y por centro, con su agenda recorrida y sus acuerdos escritos: qué se resolvió ahí, qué queda con dueño y fecha, y qué sube a la Junta Directiva.',
    voz: 'Tienes una reunión por semana con cada centro. <break time="0.4s"/> No es una llamada para preguntar cómo van. <break time="0.3s"/> Es una reunión con agenda fija, y la agenda la pone la ruta de nivel del centro. <break time="0.5s"/> La ruta de nivel dice cuántos niños tiene hoy y cuántos le faltan para el nivel siguiente. <break time="0.4s"/> Ciento setenta, doscientos, doscientos treinta, trescientos veinticinco, cuatrocientos diez. <break time="0.4s"/> Ese número convierte una queja en una cuenta. <break time="0.5s"/> De la reunión salen tres cosas y nada más. <break time="0.3s"/> Lo que se resolvió ahí mismo. <break time="0.3s"/> Lo que queda con dueño y con fecha. <break time="0.3s"/> Y lo que sube a la Junta Directiva porque no lo decide el centro. <break time="0.4s"/> Si de una reunión no sale ninguna de las tres, esa reunión no ocurrió.',

    masa: [
      'La pantalla de Ruta de Nivel del centro, abierta en pantalla.',
      'El semáforo del centro con sus tres metas de resultado del mes.',
      'La libreta de acuerdos de la reunión anterior, con sus fechas.',
      'El cuadro de negocio del mes cerrado del centro.',
    ],

    palabras: [
      'coordinador-operativo',
      'nivel-del-centro',
      'administrador-de-centro',
      'junta-directiva',
      'desercion',
      'indicador',
      'cuadro-de-negocio',
      'kpi',
      'matricula',
      'evidencia',
    ],

    laminas: [
      {
        kicker: 'Para qué existe',
        titulo: 'Una reunión por semana y por centro',
        items: [
          'No es una llamada para preguntar cómo van.',
          'Tiene agenda fija y se recorre entera, aunque el centro vaya bien.',
          'Es el único momento de la semana en que el centro te tiene a ti.',
        ],
      },
      {
        titulo: 'La agenda la pone la ruta de nivel',
        texto: 'La pantalla de Ruta de Nivel dice cuántos niños tiene el centro hoy y cuántos le faltan para el nivel siguiente. Ese número convierte una queja en una cuenta.',
      },
      {
        kicker: 'Los cinco niveles',
        titulo: 'Lo que el centro persigue, en números',
        items: [
          'Nivel 1: más de 170 niños al cierre del trimestre.',
          'Nivel 2: más de 200. Nivel 3: más de 230.',
          'Nivel 4: más de 325. Nivel 5: más de 410.',
          'El nivel decide la prima del equipo del centro.',
        ],
      },
      {
        titulo: 'De la reunión salen tres cosas',
        items: [
          'Lo que se resolvió ahí mismo, y ya no vuelve.',
          'Lo que queda con dueño y fecha, y se revisa la semana siguiente.',
          'Lo que sube a la Junta Directiva porque no lo decide el centro.',
        ],
        cierre: 'Si no sale ninguna de las tres, esa reunión no ocurrió.',
      },
      {
        kicker: 'El error caro',
        titulo: 'La reunión que se volvió una queja larga',
        texto: 'Cuarenta minutos hablando de un padre difícil, sin un solo número y sin un acuerdo con fecha. La ruta de nivel existe para que eso no pase.',
      },
    ],

    sop: {
      proceso: 'Conducir la reunión semanal con un centro',
      cuando: 'Una vez por semana, el mismo día y a la misma hora con cada centro.',
      producto: 'Los acuerdos de la semana escritos, con dueño y fecha, y la lista de lo que sube a la Junta Directiva.',
      pasos: [
        'Antes de entrar, abre la Ruta de Nivel del centro y anota cuántos niños le faltan para el nivel siguiente.',
        'Abre el semáforo del centro y anota cuáles de las tres metas de resultado están en No este mes.',
        'Repasa la libreta de la semana pasada y pregunta acuerdo por acuerdo, por su fecha, no por su tema.',
        'Punto 1 de la agenda: matrícula. Nuevos del mes contra los que faltan para el nivel siguiente.',
        'Punto 2: deserción. Cuántos se fueron, por qué motivo y de qué Coach.',
        'Punto 3: cobranza. Cuentas vencidas del mes y cuáles ya cruzaron el día 45.',
        'Punto 4: gente. Contratos por vencer, permisos del mes y quién está sin su puesto tomado.',
        'Punto 5: lo que el centro te pide. Escúchalo entero antes de responder.',
        'Cierra clasificando cada tema en resuelto, con dueño y fecha, o sube a la Junta Directiva.',
        'Escribe los acuerdos el mismo día, con nombre y fecha, y mándalos al Administrador del Centro.',
      ],
      decide: [
        { situacion: 'El centro te pide una decisión de su propia operación', regla: 'No la tomes tú. El Administrador del Centro decide en su centro; tú aportas el número y el precedente de los otros centros.' },
        { situacion: 'El tema exige cambiar una norma, una prima o un precio', regla: 'Sube a la Junta Directiva. Ni el centro ni tú modifican lo que la Junta estableció.' },
        { situacion: 'Un acuerdo lleva dos semanas sin cumplirse', regla: 'Deja de renegociarlo en la reunión: se convierte en punto para la Junta Directiva, con las dos fechas incumplidas escritas.' },
      ],
      errores: [
        'Entrar a la reunión sin haber abierto la Ruta de Nivel: se habla de sensaciones y no de niños.',
        'Cerrar sin fecha: un acuerdo sin fecha es una conversación, no un acuerdo.',
        'Resolverle al centro lo que le toca decidir al Administrador del Centro.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Para qué existe la reunión semanal' },
      { t: 'p', texto: 'Cada centro tiene una reunión contigo por semana. No es una llamada para preguntar cómo van: es el único momento de la semana en que el centro te tiene a ti, y la única forma de que un problema chico no llegue a la Junta Directiva convertido en un problema grande.' },
      { t: 'p', texto: 'La reunión tiene **agenda fija** y se recorre entera, aunque el centro vaya bien. Un centro en verde también trae acuerdos: los que lo mantienen ahí.' },
      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva', texto: 'La reunión semanal con cada centro es práctica de la organización descrita por el dueño, no norma escrita del Manual de Operaciones. El Manual no la menciona. Hasta que la Junta Directiva la escriba, es política de la operación y no una norma auditable: cúmplela, y no la uses como fundamento para sancionar a nadie.' },

      { t: 'sub', texto: 'La agenda la pone la ruta de nivel' },
      { t: 'p', texto: 'La pantalla de Ruta de Nivel del centro dice dos cosas: cuántos niños tiene hoy y cuántos le faltan para el nivel siguiente. Ese número es el que convierte una queja en una cuenta. "Nos está costando" no se puede trabajar; "nos faltan 18 niños para nivel 2 y el ritmo actual nos deja a 11" sí.' },
      {
        t: 'tabla',
        titulo: 'Los cinco niveles del centro, según el Manual',
        encabezados: ['Nivel', 'Niños al cierre del trimestre'],
        filas: [
          ['1', 'Más de 170'],
          ['2', 'Más de 200'],
          ['3', 'Más de 230'],
          ['4', 'Más de 325'],
          ['5', 'Más de 410'],
        ],
      },
      { t: 'p', texto: 'El nivel del centro decide la prima del equipo del centro. Por eso la ruta de nivel no es una curva bonita: es el sueldo de la gente con la que estás hablando.' },

      { t: 'sub', texto: 'Los cinco puntos que se recorren siempre' },
      {
        t: 'tabla',
        encabezados: ['Punto', 'Qué se mira', 'Qué se lleva anotado'],
        filas: [
          ['1. Matrícula', 'Nuevos del mes contra los que faltan para el nivel siguiente', 'El número de la Ruta de Nivel, antes de entrar'],
          ['2. Deserción', 'Cuántos se fueron, por qué motivo y de qué Coach', 'El cuadro de deserciones del mes cerrado'],
          ['3. Cobranza', 'Cuentas vencidas del mes y cuáles cruzaron el día 45', 'La lista de vencidas por tramo'],
          ['4. Gente', 'Contratos por vencer, permisos del mes, puestos sin tomar', 'Los vencimientos del trimestre'],
          ['5. Lo que el centro pide', 'Lo que ellos traen, escuchado entero antes de responder', 'La libreta de la semana pasada'],
        ],
      },

      { t: 'sub', texto: 'Lo que se cierra ahí y lo que sube' },
      { t: 'p', texto: 'De una reunión salen tres cosas y nada más:' },
      {
        t: 'lista',
        items: [
          '**Resuelto ahí mismo.** Se anota y no vuelve a la agenda.',
          '**Con dueño y fecha.** Se anota con nombre y con día, y se pregunta por su fecha la semana siguiente.',
          '**Sube a la Junta Directiva.** Porque cambia una norma, una prima, un precio o un contrato, y eso no lo decide el centro ni lo decides tú.',
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'Regla de cierre', texto: 'Si de una reunión no sale ninguna de las tres, esa reunión no ocurrió. Los acuerdos se escriben el mismo día, con nombre y fecha, y se le mandan al Administrador del Centro.' },

      { t: 'sub', texto: 'Cómo se sostiene al equipo cuando el centro va mal' },
      { t: 'p', texto: 'La mitad de este puesto es control y la otra mitad es sostener a la gente que produce el número. Un centro que viene de dos meses cayendo ya sabe que está cayendo: la Administradora lo sabe, la Asistente lo sabe y el Coach lo intuye. Llegar a decirlo otra vez no aporta nada. Lo que sí aporta es entrar con el dato, y salir con una sola cosa que sí se puede mover esta semana.' },
      {
        t: 'tabla',
        encabezados: ['Qué se dice', 'Qué NO se dice'],
        filas: [
          ['El número, con su fuente y su brecha: son cinco niños de más', 'Están mal, van fatal, esto es un desastre'],
          ['Qué de esto depende del centro y qué no', 'Todo depende de ustedes'],
          ['Qué hizo otro centro que salió del mismo hueco', 'En el otro centro sí saben trabajar'],
          ['Una sola cosa para esta semana, escrita y con nombre', 'Una lista de doce mejoras'],
          ['Qué te toca a ti conseguir para que ellos puedan', 'Nada: la reunión termina con tareas solo para ellos'],
        ],
      },
      { t: 'p', texto: 'Si de la reunión sales sin nada que hacer tú, no fue una reunión de apoyo: fue una revisión. Este puesto existe para que el Manual se cumpla, y un centro no cumple el Manual porque se le repita que no lo cumple, sino porque alguien le quita de encima el obstáculo que sí se puede quitar.' },
      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva', texto: 'Motivar al equipo es una de las funciones que el dueño le da a este puesto y que el Manual de Operaciones no escribe en ninguna parte. Este bloque es la práctica, no la norma: no se usa para calificar a nadie ni para reclamarle a un Administrador que no está motivando. Hasta que la Junta lo escriba, se ejecuta y no se audita.' },

      { t: 'sub', texto: 'Lo que esta reunión NO es' },
      {
        t: 'tabla',
        encabezados: ['No es', 'Por qué', 'Qué haces en su lugar'],
        filas: [
          ['Una evaluación de desempeño', 'La evaluación de desempeño la hace el Administrador del Centro con su formato', 'Le pasas el dato al Administrador y él evalúa'],
          ['El sitio donde decides por el centro', 'El Administrador decide en su centro', 'Aportas el número y el precedente de los otros centros'],
          ['Una sesión de desahogo', 'Cuarenta minutos de queja sin un número no cambian nada', 'Escuchas entero, y lo conviertes en acuerdo con fecha'],
          ['Un canal para cambiar una norma', 'Las normas y las primas las establece la Junta Directiva', 'Lo subes con los dos números que lo sostienen'],
        ],
      },

      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Entrar sin haber abierto la Ruta de Nivel: se habla de sensaciones en vez de niños.',
          'Cerrar sin fecha. Un acuerdo sin fecha es una conversación.',
          'Renegociar el mismo acuerdo tres semanas seguidas en vez de subirlo a la Junta Directiva con las fechas incumplidas escritas.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'La reunión semanal con cada centro está escrita en el Manual de Operaciones.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'El Manual no la menciona. Es práctica de la organización descrita por el dueño: se cumple, pero no se usa como fundamento para sancionar a nadie.',
        repasa: ['coordinador-operativo'],
      },
      {
        pregunta: 'Lo primero que abres antes de entrar a la reunión semanal es…',
        opciones: [
          'el correo del Administrador del Centro',
          'la Ruta de Nivel del centro, para saber cuántos niños le faltan para el nivel siguiente',
          'la lista de cumpleaños del equipo',
          'el organigrama del centro',
        ],
        explicacion: 'Ese número convierte una queja en una cuenta: sin él se habla de sensaciones.',
        repasa: ['nivel-del-centro'],
      },
      {
        pregunta: 'Para llegar al nivel 3, el centro necesita al cierre del trimestre…',
        opciones: ['más de 170 niños', 'más de 200 niños', 'más de 230 niños', 'más de 325 niños'],
        explicacion: 'Los cinco niveles son 170, 200, 230, 325 y 410, y deciden la prima del equipo del centro.',
        repasa: ['nivel-del-centro'],
      },
      {
        pregunta: 'De una reunión semanal pueden salir tres clases de temas. ¿Cuáles?',
        opciones: [
          'Urgente, importante y opcional',
          'Del Coach, del Administrador y del padre',
          'Resuelto ahí mismo, con dueño y fecha, o sube a la Junta Directiva',
          'Bueno, regular y malo',
        ],
        explicacion: 'Si no sale ninguna de las tres, esa reunión no ocurrió.',
        repasa: ['junta-directiva'],
      },
      {
        pregunta: 'El centro te pide que decidas si abren un grupo nuevo el sábado. Tú…',
        opciones: [
          'lo decides, porque coordinas la operación',
          'lo subes a la Junta Directiva',
          'lo dejas para la próxima reunión',
          'aportas el número y el precedente de los otros centros; decide el Administrador del Centro',
        ],
        explicacion: 'El Administrador decide en su centro. Tu aporte es lo que él no puede ver: lo que pasó en los otros centros.',
        repasa: ['administrador-de-centro'],
      },
      {
        pregunta: 'Un acuerdo lleva dos semanas sin cumplirse. Lo correcto es…',
        opciones: [
          'convertirlo en punto para la Junta Directiva, con las dos fechas incumplidas escritas',
          'volver a negociarlo con una tercera fecha',
          'quitarlo de la agenda para no desgastar la reunión',
          'resolverlo tú mismo en el centro',
        ],
        explicacion: 'Renegociar el mismo acuerdo tres semanas seguidas lo vuelve invisible. Las fechas incumplidas son el dato que la Junta necesita.',
        repasa: ['junta-directiva'],
      },
      {
        pregunta: 'Un centro va en verde este mes. La reunión semanal…',
        opciones: [
          'se salta, para no quitarle tiempo al centro',
          'se acorta a los puntos que estén en rojo',
          'se recorre entera igual: un centro en verde también trae los acuerdos que lo mantienen ahí',
          'la hace el Administrador del Centro solo',
        ],
        explicacion: 'La agenda es fija. Saltarse la reunión del centro que va bien es como se pierde el centro que iba bien.',
      },
      {
        pregunta: 'Los acuerdos de la reunión se escriben…',
        opciones: [
          'cuando el centro los pida por escrito',
          'el mismo día, con nombre y fecha, y se le mandan al Administrador del Centro',
          'al cierre del mes, junto con el cuadro de negocio',
          'solo si el tema sube a la Junta Directiva',
        ],
        explicacion: 'Sin nombre y sin fecha no hay a quién preguntarle la semana siguiente.',
        repasa: ['evidencia'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Conducir la reunión con la ruta de nivel en la mano',
        fuente: 'descripcion-del-puesto-fernando#reuniones-semanales',
        proposito: 'Que conduzcas la reunión semanal de punta a punta con la Ruta de Nivel abierta, recorriendo los cinco puntos y cerrando cada tema en una de las tres salidas.',
        gradiente: 'Exige el paquete de tu puesto aprobado y este módulo estudiado con la pantalla del centro delante. Si no puedes decir de memoria los cinco niveles, el hueco está en el estudio, no aquí.',
        masa: [
          'La pantalla de Ruta de Nivel de un centro real, abierta.',
          'La libreta de acuerdos de la reunión anterior de ese centro.',
          'El cuadro de negocio del mes cerrado.',
        ],
        pasos: [
          'Antes de empezar, di en voz alta cuántos niños le faltan a ese centro para el nivel siguiente.',
          'Recorre los cinco puntos de la agenda en orden, sin saltar ninguno.',
          'En el punto 5, deja hablar al centro entero antes de responder una sola palabra.',
          'Clasifica cada tema en voz alta: resuelto, con dueño y fecha, o sube a la Junta Directiva.',
          'Escribe los acuerdos delante de tu jefe entrenador, con nombre y fecha.',
        ],
        criterios: [
          'Nombra de memoria los cinco niveles del centro y dice cuántos niños faltan para el siguiente.',
          'Recorre los cinco puntos de la agenda sin saltarse ninguno, incluso con el centro en verde.',
          'Clasifica cada tema en una de las tres salidas y no deja ningún tema sin clasificar.',
          'Escribe cada acuerdo con nombre de responsable y con fecha, y no acepta un acuerdo sin fecha.',
        ],
        errorTipico: 'Convertir la reunión en cuarenta minutos de queja sobre un padre difícil, sin un solo número. Se sale sintiendo que se trabajó y el centro tiene los mismos niños que la semana pasada.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 15 · of-cop-2
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'of-cop-2',
    curso: 'coordinacion',
    orden: 15,
    roles: ['coordinador'],
    titulo: 'Leer el semáforo: Producto manda, Disciplina acompaña',
    duracionMin: 18,
    requiere: ['of-cop-1'],
    fuente: [
      'lib/marcadores.mjs#cabecera',
      'lib/checklist.js#PRODUCTO_KEYS',
      'lib/checklist.js#DISCIPLINA_GRUPOS',
    ],

    pfv: 'Los centros de tu red leídos por su marcador de resultado y no por su promedio: sabes cuál crece, cuál cumple y cuál está en verde por una lista de actividades.',
    voz: 'El sistema tenía una lista de treinta y tres casillas y las pesaba todas igual. <break time="0.4s"/> Aromatizante en recepción valía lo mismo que meta de deserción. <break time="0.5s"/> Así un centro fallaba las tres metas de resultado y salía en noventa y uno por ciento verde. <break time="0.4s"/> Se corrigió partiendo la lista en dos marcadores. <break time="0.5s"/> El primero es Producto. Tres metas de resultado más el verdicto de crecimiento. <break time="0.3s"/> Ese manda, y es el único que pinta el semáforo. <break time="0.4s"/> El segundo es Disciplina. Treinta actividades. <break time="0.3s"/> Acompaña, va subordinada y no puede maquillar al primero. <break time="0.5s"/> Y grábate esto. <break time="0.3s"/> Un promedio de los treinta y tres miente siempre, porque el que sube el promedio es el barato.',

    masa: [
      'La pantalla de Cumplimiento de un centro, con sus 33 criterios a la vista.',
      'El semáforo del mismo centro, con su color y su motivo escrito.',
      'El cuadro de negocio del mes cerrado de ese centro.',
    ],

    palabras: [
      'indicador',
      'kpi',
      'desercion',
      'cuentas-por-cobrar',
      'matricula',
      'nivel-del-centro',
      'coordinador-operativo',
      'administrador-de-centro',
      'cuadro-de-negocio',
      'veraz',
    ],

    laminas: [
      {
        kicker: 'El defecto de diseño',
        titulo: 'Treinta y tres casillas que pesaban igual',
        texto: 'Aromatizante en recepción valía lo mismo que meta de deserción. Un centro podía fallar las tres metas de resultado y salir en 91 por ciento, en verde.',
      },
      {
        titulo: 'Dos marcadores separados, nunca un promedio',
        items: [
          'Producto: 3 metas de resultado más el verdicto de crecimiento.',
          'Disciplina: las 30 actividades restantes.',
          'Producto manda y pinta el semáforo. Disciplina acompaña.',
          'Disciplina no puede maquillar a Producto. Nunca se promedian.',
        ],
      },
      {
        kicker: 'Las tres de Producto',
        titulo: 'Lo que de verdad decide el color',
        items: [
          'Meta de nuevos ingresos del mes.',
          'Meta de deserción del mes.',
          'Meta de cobranza vencida del trimestre.',
          'Las calcula el sistema. Ya no se marcan a mano.',
        ],
      },
      {
        titulo: 'Cuándo sale cada color',
        items: [
          'Rojo: falla al menos una meta Y el centro decrece.',
          'Verde: cumple las tres, crece y hay datos completos.',
          'Amarillo: todo lo demás, y también cuando falta registro.',
          'Sin datos no da verde: la ignorancia no es cumplimiento.',
        ],
      },
      {
        kicker: 'La banda muerta',
        titulo: 'Medio niño al mes es ruido, no tendencia',
        texto: 'El verdicto de crecimiento tiene una banda de más o menos medio niño por mes. Por debajo de eso no se dice ni que crece ni que decrece: se dice que está plano.',
        cierre: 'Un promedio de los 33 miente. Los dos marcadores se leen separados.',
      },
    ],

    sop: {
      proceso: 'Leer el semáforo de un centro sin dejarse maquillar',
      cuando: 'Al cerrar cada mes, centro por centro, y antes de cualquier reunión con la Junta Directiva.',
      producto: 'El estado real de cada centro de la red: color, meta fallada y verdicto de crecimiento, sin promedios.',
      pasos: [
        'Abre el centro y lee PRIMERO el marcador de resultado: las tres metas y el verdicto de crecimiento.',
        'Anota cuáles de las tres metas están en No este mes. Si hay una sola, el verde ya está prohibido.',
        'Lee el verdicto de crecimiento: crece, decrece o plano dentro de la banda de medio niño al mes.',
        'Solo después mira la lista de las 30 actividades, y míralas como causa, no como nota.',
        'Si el color es amarillo, averigua si es por meta fallada, por caída o por registro incompleto.',
        'Si el centro decrece porque está graduando niños, escríbelo al lado: no es la misma caída.',
        'No sumes nunca las 33 casillas en un solo porcentaje, ni para un resumen rápido.',
        'Lleva a la reunión el color, la meta fallada y el verdicto, en esa orden y en esa frase.',
      ],
      decide: [
        { situacion: 'Producto y Disciplina se contradicen', regla: 'Manda Producto. La lista de actividades es soporte y va subordinada: nunca maquilla el resultado.' },
        { situacion: 'Faltan cierres del trimestre', regla: 'No da verde. Un número bueno sobre un denominador incompleto es exactamente la forma del defecto que se corrigió.' },
        { situacion: 'Alguien te pide un porcentaje único del centro', regla: 'Se entregan los dos marcadores por separado, con sus nombres. Un promedio de los 33 no es un dato, es un adorno.' },
      ],
      errores: [
        'Presentar un porcentaje único del centro: es el defecto que se corrigió, vuelto a nacer.',
        'Leer la lista de actividades antes que las metas de resultado: la lista larga tapa las tres que importan.',
        'Llamar decrecimiento a una caída de menos de medio niño al mes: eso es ruido de redondeo.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'El defecto que se corrigió' },
      { t: 'p', texto: 'El sistema tenía una lista de 33 criterios y los pesaba todos igual. "Aromatizante en recepción" valía un punto y "meta de deserción" valía un punto. Con eso, un centro podía fallar **las tres metas de resultado** y salir con 30 de 33, que es 91 por ciento, en verde.' },
      { t: 'p', texto: 'La lista medía **actividad** y la pintaba como si fuera **avance**. No era engaño de nadie: era el diseño de la lista.' },
      { t: 'nota', tono: 'alerta', titulo: 'Esto no es una anécdota vieja', texto: 'Es exactamente la forma del error que tu puesto tiene que cazar en todos los centros: un número bueno construido sobre lo barato de cumplir. El día que alguien te pida "el porcentaje del centro", estás delante del mismo defecto otra vez.' },

      { t: 'nota', tono: 'ojo', titulo: 'Este módulo es hallazgo del sistema, no norma del Manual', texto: 'Los dos marcadores, las tres metas de resultado, los colores y la banda de crecimiento salen del propio KPI, no del Manual de Operaciones: el Manual no separa Producto de Disciplina ni fija esta lectura del semáforo. Es cómo mide la herramienta, y por eso puede cambiar cuando la herramienta cambie. Lo que no cambia es la regla de abajo: no se promedian.' },

      { t: 'sub', texto: 'Los dos marcadores' },
      {
        t: 'tabla',
        encabezados: ['Marcador', 'Qué contiene', 'Qué manda'],
        filas: [
          ['Producto', 'Las 3 metas de resultado más el verdicto de crecimiento', 'Manda. Es lo único que pinta el semáforo'],
          ['Disciplina', 'Las 30 actividades restantes, en tres grupos con peso', 'Acompaña. Es soporte y va subordinada'],
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'La regla que no se negocia', texto: 'Los dos marcadores no se promedian NUNCA. Disciplina no puede maquillar a Producto. Un centro con 30 actividades hechas y una meta de resultado fallada no está en verde.' },

      { t: 'sub', texto: 'Las tres metas de Producto' },
      {
        t: 'tabla',
        encabezados: ['Meta', 'Qué mide', 'Quién la marca'],
        filas: [
          ['Nuevos ingresos', 'Los niños nuevos del mes contra la meta del trimestre', 'La calcula el sistema desde las ventas'],
          ['Deserción', 'Las bajas reales del mes contra la meta del trimestre', 'La calcula el sistema desde las bajas'],
          ['Cobranza', 'La peor cifra de cobranza vencida declarada en todo el mes', 'La calcula el sistema desde las semanas del mes'],
        ],
      },
      { t: 'p', texto: 'Las tres dejaron de ser una casilla que alguien marca. **Las calcula el sistema** y la pantalla las muestra de solo lectura. Lo que se sigue marcando a mano son las 30 de Disciplina.' },

      { t: 'sub', texto: 'Cómo sale cada color' },
      {
        t: 'tabla',
        encabezados: ['Color', 'Cuándo sale'],
        filas: [
          ['Rojo', 'Falla al menos una meta Y el centro decrece. La falta de datos no baja el rojo'],
          ['Verde', 'Cumple las tres metas, crece, y hay datos completos para afirmarlo'],
          ['Amarillo', 'Todo lo demás: exactamente uno de los dos males, o registro incompleto'],
        ],
      },
      { t: 'p', texto: 'Dos guardas que te ahorran discusiones. La primera: **sin datos no hay verde.** Un trimestre a medio contar no da verde, porque un número bueno sobre un denominador incompleto es justo el defecto original. La segunda: si el centro decrece **porque está graduando niños**, eso se escribe al lado; graduar no es perder.' },

      { t: 'sub', texto: 'La banda de crecimiento' },
      { t: 'p', texto: 'El verdicto de crecimiento tiene una banda muerta de **medio niño por mes**. Por debajo de eso no se dice ni "crece" ni "decrece": se dice que está plano. Es el margen mínimo honesto cuando el proyector trabaja con un decimal.' },
      { t: 'nota', tono: 'ojo', titulo: 'Cómo se cuenta la caída', texto: 'El verdicto no usa la resta entre el primer mes y el último: usa la mediana del neto mensual. Un pico aislado de marzo podía dar "crece" con la resta simple mientras la mediana decía que el centro perdía casi tres niños al mes.' },

      { t: 'sub', texto: 'Cómo se dice en una frase' },
      { t: 'p', texto: 'Cuando presentes un centro, la frase completa lleva tres piezas y en este orden: **color, meta fallada, verdicto de crecimiento.** Ejemplo: "Amarillo; falla cobranza; crece medio niño al mes". Todo lo que no quepa en esa frase es detalle del centro, no del reporte.' },

      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Entregar un porcentaje único del centro. Es el defecto corregido, vuelto a nacer con otro nombre.',
          'Leer la lista de actividades antes que las tres metas: la lista larga tapa lo que importa.',
          'Llamar decrecimiento a una caída de menos de medio niño al mes.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'Con la lista vieja de 33 criterios, un centro podía fallar las tres metas de resultado y salir en…',
        opciones: ['48 por ciento', '61 por ciento', '75 por ciento', '91 por ciento, en verde'],
        explicacion: '30 de 33. Las tres metas de resultado pesaban lo mismo que las tres casillas más baratas de la lista.',
        repasa: ['indicador'],
      },
      {
        pregunta: '¿Cuál de los dos marcadores pinta el semáforo del centro?',
        opciones: [
          'Producto: las 3 metas de resultado más el verdicto de crecimiento',
          'Disciplina: las 30 actividades',
          'El promedio de los dos',
          'El que el Administrador del Centro elija',
        ],
        explicacion: 'Disciplina acompaña y va subordinada. No puede maquillar a Producto.',
        repasa: ['kpi'],
      },
      {
        pregunta: 'Un centro tiene las 30 actividades hechas y falla la meta de deserción. Está en verde.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Con una sola meta de resultado en No, el verde está prohibido. Los dos marcadores no se promedian nunca.',
        repasa: ['desercion'],
      },
      {
        pregunta: 'Las tres metas de resultado hoy…',
        opciones: [
          'las marca a mano la Administradora en la pantalla de Cumplimiento',
          'las marca el Coordinador Operativo al cierre',
          'las calcula el sistema y la pantalla las muestra de solo lectura',
          'las decide la Junta Directiva cada trimestre',
        ],
        explicacion: 'Lo que se sigue marcando a mano son las 30 de Disciplina, no estas tres.',
        repasa: ['administrador-de-centro'],
      },
      {
        pregunta: 'El semáforo sale ROJO cuando…',
        opciones: [
          'la lista de actividades baja de 20 sobre 30',
          'falla al menos una meta de resultado Y el centro decrece',
          'faltan cierres en el trimestre',
          'el centro está por debajo del nivel 2',
        ],
        explicacion: 'La falta de datos no baja el rojo: si estás perdiendo niños y fallando metas, eso es real aunque falten cierres.',
      },
      {
        pregunta: 'Faltan cierres del trimestre en un centro que cumple sus tres metas. El color…',
        opciones: [
          'es verde igual, porque las metas se cumplieron',
          'no puede ser verde: un número bueno sobre un denominador incompleto es el defecto original',
          'es rojo automáticamente',
          'lo decide el Administrador del Centro',
        ],
        explicacion: 'Sin datos completos no hay verde. La ignorancia tampoco da verde.',
        repasa: ['veraz'],
      },
      {
        pregunta: 'La banda muerta del verdicto de crecimiento es de…',
        opciones: ['medio niño por mes', 'dos niños por mes', 'cinco niños por mes', 'diez niños por trimestre'],
        explicacion: 'Por debajo de esa banda no se dice ni crece ni decrece: se dice que está plano. El proyector trabaja con un decimal.',
      },
      {
        pregunta: 'El Administrador de un centro te pide "el porcentaje del centro" para su reporte. Tú…',
        opciones: [
          'sumas los 33 criterios y le das el porcentaje',
          'le das solo el de Disciplina, que es el que se marca',
          'le entregas los dos marcadores por separado, con sus nombres',
          'le pides que lo calcule él',
        ],
        explicacion: 'Un promedio de los 33 no es un dato, es un adorno. Y es exactamente el defecto que se corrigió.',
        repasa: ['coordinador-operativo'],
      },
      {
        pregunta: 'Un centro decrece, pero la mayor parte de la caída son niños que se graduaron. Eso…',
        opciones: [
          'se escribe al lado, porque graduar no es perder',
          'se ignora: la caída es caída',
          'convierte el semáforo en verde',
          'obliga a subirlo a la Junta Directiva',
        ],
        explicacion: 'Un centro que decrece porque está graduando no puede leer en rojo que está en problemas.',
        repasa: ['desercion'],
      },
      {
        pregunta: 'Al presentar un centro, la frase completa lleva…',
        opciones: [
          'el porcentaje y el ranking',
          'color, meta fallada y verdicto de crecimiento, en ese orden',
          'la lista de las 30 actividades pendientes',
          'el nombre del Administrador y su antigüedad',
        ],
        explicacion: 'Todo lo que no quepa en esa frase es detalle del centro, no del reporte.',
        repasa: ['kpi'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Leer tres centros sin dejarse maquillar',
        fuente: 'lib/marcadores.mjs#cabecera',
        proposito: 'Que ante la pantalla de tres centros distintos digas el color, la meta fallada y el verdicto de crecimiento de cada uno, sin usar un solo promedio.',
        gradiente: 'Exige of-cop-1 estudiado y este módulo leído con la pantalla de Cumplimiento delante. Si contestas con un porcentaje, se vuelve al estudio: el hueco está en los dos marcadores, no en la maniobra.',
        masa: [
          'La pantalla de Cumplimiento de tres centros reales del mes cerrado.',
          'El semáforo de los tres, con su motivo escrito.',
        ],
        pasos: [
          'Tu jefe entrenador abre el primer centro y tapa la lista de las 30 actividades.',
          'Di el color, la meta que falla y el verdicto de crecimiento, en esa orden.',
          'Explica por qué ese color y no otro, nombrando la regla que lo produce.',
          'Repite con el segundo y el tercer centro, uno de ellos con registro incompleto.',
          'Al final, di qué centro de los tres te preocupa más y con qué número lo sostienes.',
        ],
        criterios: [
          'Dice color, meta fallada y verdicto de crecimiento de los tres centros sin mirar la lista larga.',
          'Explica por qué un centro con registro incompleto no puede salir en verde, aunque cumpla las metas.',
          'No entrega ni una sola vez un porcentaje único del centro, ni siquiera como resumen rápido.',
          'Identifica la caída que es graduación y la separa de la caída que es pérdida de niños.',
        ],
        errorTipico: 'Contestar con el porcentaje de la lista de actividades porque es el número que está más a la vista. Ese es exactamente el número que dejaba un centro fallando las tres metas en 91 por ciento verde.',
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  // 16 · of-cop-3
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'of-cop-3',
    curso: 'coordinacion',
    orden: 16,
    roles: ['coordinador'],
    titulo: 'El 88 % que decrece: la marca a mano contra el cálculo',
    duracionMin: 20,
    requiere: ['of-cop-2'],
    fuente: [
      'lib/discrepancias-metas.mjs#cabecera',
      'lib/discrepancias-historico.mjs#cabecera',
      'hallazgo-historico-metas-2026-09',
    ],

    pfv: 'Las contradicciones entre la marca guardada y el cálculo, cerradas centro por centro; y el centro que va en 88 por ciento y decrece, detectado antes de que se ponga rojo.',
    voz: 'Se revisaron ciento diez metas marcadas a mano en el histórico. <break time="0.4s"/> Noventa contradicen lo que dice el cálculo. <break time="0.4s"/> Y de esas noventa, ochenta y seis decían que se cumplía cuando no se cumplía. <break time="0.5s"/> En cobranza fue peor. Cuarenta y nueve de cuarenta y nueve, todas a favor del centro. <break time="0.5s"/> Pero ojo con la conclusión fácil. <break time="0.4s"/> El mecanismo no fue engaño. <break time="0.3s"/> En treinta y cinco de cuarenta trimestres la marca estaba copiada del mes anterior. <break time="0.4s"/> Alguien abrió la pantalla, vio la casilla puesta y siguió. <break time="0.5s"/> Por eso tu alarma no es el rojo. El rojo lo ve todo el mundo. <break time="0.4s"/> Tu alarma es el centro en ochenta y ocho por ciento que decrece. <break time="0.3s"/> Verde en la lista de actividades, retroceso en el resultado.',

    masa: [
      'La tarjeta de discrepancias del panel, con el barrido de todos los trimestres.',
      'La pantalla de Cumplimiento de un centro con al menos una discrepancia abierta.',
      'El cuadro de negocio y el cierre del trimestre de ese mismo centro.',
    ],

    palabras: [
      'indicador',
      'kpi',
      'desercion',
      'cuentas-por-cobrar',
      'coordinador-operativo',
      'administrador-de-centro',
      'junta-directiva',
      'veraz',
      'verificable',
      'falta-grave',
      'evidencia',
      'auditoria',
    ],

    laminas: [
      {
        kicker: 'El barrido',
        titulo: 'Ciento diez metas marcadas a mano',
        items: [
          '90 de las 110 contradicen lo que dice el cálculo.',
          '86 de esas 90 decían que se cumplía cuando no se cumplía.',
          'En cobranza: 49 de 49, todas a favor del centro.',
        ],
      },
      {
        kicker: 'El mecanismo',
        titulo: 'No fue engaño: fue copia',
        texto: 'En 35 de 40 trimestres la marca estaba copiada del mes anterior. Alguien abrió la pantalla, vio la casilla ya puesta y siguió. Eso no es mentir: es no mirar.',
      },
      {
        titulo: 'Por qué te toca a ti y no a nadie más',
        items: [
          'La Administradora ve su propio centro, y lo ve en verde.',
          'La Junta Directiva ve el resumen, no la contradicción.',
          'Tú eres el único que ve los centros uno al lado del otro.',
        ],
      },
      {
        kicker: 'La alarma del puesto',
        titulo: 'Un centro en 88 por ciento que decrece',
        texto: 'El rojo lo ve todo el mundo y ya tiene dueño. Lo que nadie mira es el centro con la lista de actividades casi llena y el resultado cayendo. Ese es tuyo.',
        cierre: 'Verde en Disciplina, retroceso en Producto. Esa es la firma del defecto.',
      },
      {
        titulo: 'Cómo se dice, y cómo NO se dice',
        items: [
          'Se dice: el registro guarda Sí y el cálculo da No, con los dos números.',
          'No se dice: marcaste mal, esto es falso, alguien mintió.',
          'Hay razones legítimas: cobranza cargada tarde, un cierre rehecho.',
          'El aviso se retira solo cuando las dos fuentes coinciden.',
        ],
      },
    ],

    sop: {
      proceso: 'Cerrar una contradicción entre la marca guardada y el cálculo',
      cuando: 'Al cerrar cada mes, y cada vez que la tarjeta de discrepancias suba de número.',
      producto: 'La contradicción explicada o corregida, con la fuente que la resuelve escrita al lado.',
      pasos: [
        'Abre la tarjeta de discrepancias y trabaja el barrido completo, no solo el trimestre que tengas seleccionado.',
        'Toma una discrepancia y anota las dos cifras: la que guarda el registro y la que da el cálculo.',
        'Averigua cuál de las dos se movió: casi siempre es el dato de origen, no la casilla.',
        'Revisa si la marca del mes anterior es idéntica a la de este mes. Si lo es, sospecha copia.',
        'Llama al Administrador del Centro y pregunta por el dato, nunca por la casilla.',
        'Si hay una razón legítima, escríbela: cobranza cargada después del cierre, cierre rehecho, ajuste pactado.',
        'Si el dato de origen estaba incompleto, pide que se cargue y deja que el cálculo se rehaga solo.',
        'No cambies la casilla para que cuadre: forzar el número es falta grave, no un atajo administrativo.',
        'Cierra el mes con la lista de discrepancias que quedaron abiertas y por qué.',
      ],
      decide: [
        { situacion: 'El Administrador insiste en que su marca es la correcta', regla: 'El sistema informa que dos fuentes no coinciden; no dictamina cuál miente. Se busca el dato de origen, y si no aparece, sube a la Junta Directiva con las dos cifras.' },
        { situacion: 'La diferencia se resuelve cambiando el número a mano', regla: 'No se cambia. El Manual es explícito: omitir, manipular o falsear información es falta grave de carácter laboral, ético y legal.' },
        { situacion: 'Un centro repite el mismo patrón tres meses seguidos', regla: 'Deja de ser un error de dato y pasa a ser un tema de la Junta Directiva, con los tres meses documentados.' },
      ],
      errores: [
        'Trabajar solo el trimestre seleccionado en pantalla: el barrido completo es el que cuenta.',
        'Preguntar por la casilla en vez de por el dato: la casilla se defiende sola, el dato no.',
        'Acusar. El aviso dice que dos fuentes no coinciden, no que alguien mintió.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Qué se encontró' },
      { t: 'p', texto: 'Se revisaron las metas de resultado marcadas a mano en todo el histórico. Son 110. **Noventa contradicen lo que dice el cálculo**, y de esas noventa, **86 decían que se cumplía cuando no se cumplía**. En cobranza el reparto fue completo: 49 de 49 a favor del centro.' },
      { t: 'p', texto: 'Un desvío que se reparte 86 a 4 hacia un solo lado no es azar. Pero tampoco es lo primero que uno piensa.' },
      { t: 'nota', tono: 'ojo', titulo: 'Este bloque es hallazgo del sistema, no norma del Manual', texto: 'Las cifras de este módulo salen de auditar la propia base de datos del KPI. El Manual de Operaciones no las menciona porque son posteriores a él. Se estudian porque describen el trabajo real de tu puesto, no porque sean una norma que se audite contra un auditor externo.' },

      { t: 'sub', texto: 'El mecanismo no fue engaño: fue copia' },
      { t: 'p', texto: 'En **35 de 40 trimestres** la marca estaba copiada del mes anterior: idéntica, mes tras mes, sin importar lo que hubiera pasado en el centro. Alguien abrió la pantalla, vio la casilla ya puesta y siguió.' },
      { t: 'p', texto: 'Eso cambia todo lo que vas a hacer con este dato. No estás persiguiendo a nadie: estás corrigiendo un mecanismo que producía el mismo error en casi todos los centros a la vez. Si entras acusando, la próxima vez te ocultan el dato en lugar de la casilla.' },

      { t: 'sub', texto: 'Por qué esta alarma es tuya y de nadie más' },
      {
        t: 'tabla',
        encabezados: ['Quién', 'Qué ve', 'Por qué no lo caza'],
        filas: [
          ['Administrador del Centro', 'Su propio centro, y lo ve casi lleno de verde', 'No tiene con qué compararlo: no ve los otros centros'],
          ['Asistente Administrativo', 'Los datos de su centro, que él mismo carga', 'Su puesto es cargarlos, no auditarlos contra otro centro'],
          ['Junta Directiva', 'El resumen del trimestre', 'La contradicción no llega al resumen: se anula dentro'],
          ['Coordinador Operativo', 'Todos los centros, uno al lado del otro', 'Es el único que puede verla. Por eso la alarma es suya'],
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'La alarma del puesto', texto: 'Un centro en 88 por ciento que decrece. Verde en la lista de actividades, retroceso en el resultado. El rojo lo ve todo el mundo y ya tiene dueño; ese caso no le suena a nadie más de la organización.' },

      { t: 'sub', texto: 'Cómo se abre la conversación' },
      { t: 'p', texto: 'El sistema informa que **dos fuentes no coinciden**. No dictamina cuál miente, y tú tampoco. Hay explicaciones legítimas: cobranza cargada después del cierre, un cierre que se rehizo, un ajuste pactado.' },
      {
        t: 'tabla',
        encabezados: ['Se dice así', 'No se dice así'],
        filas: [
          ['El registro guarda Sí y el cálculo da No, con las dos cifras al lado', 'La marca está incorrecta'],
          ['Necesito saber de dónde salió este número', 'Marcaste mal esta casilla'],
          ['Vamos a buscar el dato de origen', 'Esto es falso'],
          ['El aviso se retira solo cuando las dos fuentes coincidan', 'Voy a descartar la alerta'],
        ],
      },
      { t: 'p', texto: 'No hay botón de descartar, y eso es a propósito: descartar el aviso sería volver al punto de partida. La alerta se mantiene hasta que se corrigen los datos.' },

      { t: 'sub', texto: 'Lo que no se hace nunca' },
      { t: 'nota', tono: 'alerta', titulo: 'Forzar el número es falta grave', texto: 'El Manual es explícito: los datos, informes de indicadores y reportes deben ser veraces, precisos, completos y verificables. Omitir, manipular o falsear cualquier información constituye una falta grave de carácter laboral, ético y legal. Cambiar la casilla para que cuadre no es un arreglo administrativo: es la falta grave, escrita.' },
      { t: 'p', texto: 'Cuando no cuadra, se busca la diferencia. Nunca se ajusta el número para que el cuadro cierre.' },

      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Trabajar solo el trimestre que quedó seleccionado en pantalla: de 90 discrepancias, se ven 10.',
          'Preguntar por la casilla en vez de por el dato. La casilla se defiende sola; el dato no.',
          'Acusar. La próxima vez te ocultan el dato en lugar de la casilla.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'De las 110 metas marcadas a mano en el histórico, ¿cuántas contradicen el cálculo?',
        opciones: ['30', '55', '72', '90'],
        explicacion: 'Y de esas 90, 86 decían que se cumplía cuando no se cumplía.',
        repasa: ['indicador'],
      },
      {
        pregunta: 'En la meta de cobranza, el reparto de las discrepancias fue…',
        opciones: [
          'completo hacia un solo lado: todas a favor del centro',
          'mitad a favor y mitad en contra',
          'ninguna: la cobranza cuadraba',
          'solo tres casos aislados',
        ],
        explicacion: 'Un desvío que se reparte completo hacia un solo lado no es azar. Lo que te tiene que quedar es la forma del desvío, no la cifra: la cifra la vuelves a sacar del barrido cuando la necesites.',
        repasa: ['cuentas-por-cobrar'],
      },
      {
        pregunta: '¿Cuál fue el mecanismo detrás de las contradicciones?',
        opciones: [
          'Un error de cálculo del sistema',
          'En casi todos los trimestres la marca venía copiada del mes anterior',
          'Un fallo de la base de datos al cerrar el trimestre',
          'Instrucciones equivocadas de la Junta Directiva',
        ],
        explicacion: 'Alguien abrió la pantalla, vio la casilla ya puesta y siguió. Eso no es mentir: es no mirar.',
      },
      {
        pregunta: 'La alarma propia del Coordinador Operativo es…',
        opciones: [
          'el centro en rojo tres meses seguidos',
          'el centro que no entrega el cuadro de negocio',
          'un centro en 88 por ciento que decrece: verde en actividades, retroceso en resultado',
          'el centro con más deserción de la red',
        ],
        explicacion: 'El rojo lo ve todo el mundo y ya tiene dueño. Ese caso no le suena a nadie más de la organización.',
        repasa: ['coordinador-operativo'],
      },
      {
        pregunta: '¿Por qué la Administradora no caza esta contradicción en su propio centro?',
        opciones: [
          'porque no tiene acceso a la pantalla',
          'porque no le interesa el resultado',
          'porque la Junta Directiva se lo prohíbe',
          'porque no tiene con qué compararlo: no ve los otros centros',
        ],
        explicacion: 'El Coordinador Operativo es el único que ve los centros uno al lado del otro. Por eso la alarma es suya.',
        repasa: ['administrador-de-centro'],
      },
      {
        pregunta: 'Encuentras una discrepancia. La primera frase correcta es…',
        opciones: [
          'El registro guarda Sí y el cálculo da No; necesito saber de dónde salió este número',
          'Esta marca está incorrecta',
          'Alguien marcó mal esta casilla',
          'Voy a corregirlo yo para que cuadre',
        ],
        explicacion: 'El sistema informa que dos fuentes no coinciden; no dictamina cuál miente. Hay razones legítimas.',
        repasa: ['evidencia'],
      },
      {
        pregunta: 'La forma correcta de cerrar una discrepancia cuando el dato de origen estaba incompleto es…',
        opciones: [
          'cambiar la casilla para que coincida con el cálculo',
          'descartar la alerta desde el panel',
          'pedir que se cargue el dato y dejar que el cálculo se rehaga solo',
          'esperar al cierre del trimestre siguiente',
        ],
        explicacion: 'No hay botón de descartar, y es a propósito: descartar sería volver al punto de partida.',
        repasa: ['verificable'],
      },
      {
        pregunta: 'Cambiar el número a mano para que el cuadro cierre es…',
        opciones: [
          'una corrección administrativa aceptable si se documenta',
          'decisión del Administrador del Centro',
          'una falta grave de carácter laboral, ético y legal',
          'lo que hace el sistema automáticamente',
        ],
        explicacion: 'El Manual lo dice literal: los datos deben ser veraces, precisos, completos y verificables. Cuando no cuadra, se busca la diferencia.',
        repasa: ['falta-grave', 'veraz'],
      },
      {
        pregunta: 'La tarjeta de discrepancias hay que trabajarla…',
        opciones: [
          'con el barrido completo de todos los trimestres, no solo el seleccionado',
          'solo en el trimestre en curso',
          'una vez al año, en la auditoría',
          'solo cuando la Junta Directiva la pida',
        ],
        explicacion: 'Con el trimestre seleccionado se ven 10 de 90; las otras 80 quedan invisibles.',
        repasa: ['auditoria'],
      },
      {
        pregunta: 'Un centro repite el mismo patrón de discrepancia tres meses seguidos. Eso…',
        opciones: [
          'se sigue tratando como error de dato',
          'deja de ser error de dato y pasa a ser tema de la Junta Directiva, con los tres meses documentados',
          'se descarta por reincidente',
          'lo resuelve el Asistente Administrativo del centro',
        ],
        explicacion: 'Una vez es un dato; tres veces seguidas es un mecanismo, y los mecanismos los cambia la Junta.',
        repasa: ['junta-directiva'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Cerrar una discrepancia sin acusar a nadie',
        fuente: 'lib/discrepancias-metas.mjs#cabecera',
        proposito: 'Que tomes una discrepancia real, la conviertas en una pregunta por el dato y la cierres con la razón escrita, sin cambiar una sola casilla.',
        gradiente: 'Exige of-cop-2 estudiado: hay que saber leer los dos marcadores antes de auditarlos. Si empiezas mirando la lista de actividades, el hueco está allá.',
        masa: [
          'La tarjeta de discrepancias con el barrido completo.',
          'La pantalla de Cumplimiento del centro elegido.',
          'El cierre del trimestre de ese centro.',
        ],
        pasos: [
          'Toma una discrepancia real del barrido y di en voz alta las dos cifras: la guardada y la calculada.',
          'Di cuál de las dos se movió y por qué lo crees, señalando el dato de origen en pantalla.',
          'Revisa si la marca del mes anterior es idéntica y dilo.',
          'Redacta delante de tu jefe entrenador la frase con la que llamarías al Administrador del Centro.',
          'Escribe la razón que cierra la discrepancia, o la lista de lo que falta por cargar.',
        ],
        criterios: [
          'Cita las dos cifras de la discrepancia sin confundir cuál es la guardada y cuál la calculada.',
          'Revisa la marca del mes anterior y dice si hay copia, antes de opinar sobre el centro.',
          'Redacta la frase de apertura sin una sola palabra de acusación: pregunta por el dato, no por la casilla.',
          'No propone en ningún momento cambiar la casilla para que las dos fuentes coincidan.',
        ],
        errorTipico: 'Abrir la llamada diciendo que la marca está mal. La casilla se defiende sola y el dato se pierde, y la próxima vez te esconden el dato en lugar de la casilla.',
      },
      {
        titulo: 'Maniobra 2 — Encontrar el centro en 88 por ciento que decrece',
        fuente: 'hallazgo-historico-metas-2026-09',
        proposito: 'Que ante la red entera identifiques al centro con la lista de actividades casi llena y el resultado cayendo, y lo sostengas con dos números.',
        gradiente: 'Es la maniobra siguiente a la anterior: exige haber cerrado al menos una discrepancia. Sin eso, se identifica el centro pero no se sabe qué preguntarle.',
        masa: [
          'El panel con todos los centros del mes cerrado.',
          'El verdicto de crecimiento de cada uno.',
        ],
        pasos: [
          'Recorre la red y aparta los centros en rojo: esos ya tienen dueño.',
          'De los que quedan, señala el que tenga la lista de actividades más llena y el resultado cayendo.',
          'Di su verdicto de crecimiento y cuál de las tres metas falla.',
          'Explica en una frase por qué ese centro es tuyo y no del Administrador que lo lleva.',
          'Escribe el punto tal como lo llevarías a la reunión semanal de ese centro.',
        ],
        criterios: [
          'Aparta primero los centros en rojo y explica por qué esos no son su alarma.',
          'Señala el centro correcto y lo sostiene con el verdicto de crecimiento y la meta fallada.',
          'Dice por qué el Administrador de ese centro no puede verlo: no tiene con qué compararlo.',
          'Escribe el punto de la reunión con las dos cifras, sin adjetivos sobre el equipo del centro.',
        ],
        errorTipico: 'Elegir el centro que peor se ve en la lista de actividades. Ese es el centro que la Administradora ya está trabajando; el que nadie mira es el que tiene la lista llena y el resultado cayendo.',
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  // 17 · of-cop-4 — Manual literal (L1965, L1967, L1981)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'of-cop-4',
    curso: 'coordinacion',
    orden: 17,
    roles: ['coordinador'],
    titulo: 'Contratación: del SOLICITUD DE CONTRATO al sello del Ministerio',
    duracionMin: 22,
    requiere: ['of-cop-3'],
    fuente: [
      'manual-operaciones-completo.md#L1965',
      'manual-operaciones-completo.md#L1967',
      'manual-operaciones-completo.md#L1981',
      'manual-operaciones-completo.md#files-de-colaborador',
    ],

    pfv: 'Cada colaborador activo con su contrato confeccionado, firmado por él y por el representante legal, sellado por el Ministerio de Trabajo, inscrito en la Caja de Seguro Social y con su copia recibida por escrito.',
    voz: 'Este es el trámite que el Manual te asigna con nombre y apellido. <break time="0.4s"/> El Administrador solicita. Tú confeccionas y tramitas. <break time="0.5s"/> Te llega el formato de solicitud de contrato y arranca la cadena. <break time="0.4s"/> Primer contrato: tres meses, con un mes de prueba. <break time="0.4s"/> Después buscas dos firmas. La del colaborador y la del representante legal. <break time="0.5s"/> Y ahí viene la parte que nadie más hace. <break time="0.3s"/> El contrato sellado por el Ministerio de Trabajo. <break time="0.3s"/> Y la inscripción en la Caja de Seguro Social. <break time="0.5s"/> Cierra con un documento de entrega que el colaborador firma. <break time="0.4s"/> Si eso no existe, no puedes probar que recibió su contrato. <break time="0.3s"/> Y el file del colaborador reposa en el centro, con once documentos dentro.',

    masa: [
      'El formato SOLICITUD DE CONTRATO en blanco.',
      'Un file de colaborador real, abierto, con sus once documentos.',
      'Un contrato ya sellado por el Ministerio de Trabajo, para ver el sello.',
      'La lista de colaboradores activos de un centro.',
    ],

    palabras: [
      'solicitud-de-contrato',
      'contrato-de-trabajo',
      'periodo-de-prueba',
      'ministerio-de-trabajo',
      'caja-de-seguro-social',
      'file-del-colaborador',
      'colaborador',
      'administrador-de-centro',
      'coordinador-operativo',
      'junta-directiva',
      'evidencia',
      'ach',
    ],

    laminas: [
      {
        kicker: 'La división del trabajo',
        titulo: 'El Administrador solicita, tú confeccionas y tramitas',
        texto: 'El Manual lo separa así, literal. Él manda el formato SOLICITUD DE CONTRATO; a partir de ahí el proceso de contrato es tuyo, y de nadie más en la organización.',
      },
      {
        titulo: 'El primer contrato: tres meses con uno de prueba',
        items: [
          'Lo confeccionas tú, con la información verificada.',
          'Tres meses de duración, con un mes de prueba.',
          'A las 2 semanas el Administrador hace la evaluación de desempeño.',
          'Cinco días antes del final él informa si pasó la prueba.',
        ],
      },
      {
        kicker: 'Las dos firmas',
        titulo: 'Colaborador y representante legal',
        texto: 'Buscar las firmas es tarea tuya, no del centro. Un contrato sin las dos firmas no se puede sellar, y sin sello no existe frente al Ministerio de Trabajo.',
      },
      {
        titulo: 'Lo que solo hace este puesto',
        items: [
          'Que el contrato sea sellado por el Ministerio de Trabajo.',
          'Que el colaborador quede inscrito en la Caja de Seguro Social.',
          'Que exista un documento de entrega firmado por el colaborador.',
        ],
        cierre: 'Si el puesto desaparece, los centros operan con gente sin contrato sellado.',
      },
      {
        kicker: 'El file del colaborador',
        titulo: 'Once documentos, reposando en cada centro',
        items: [
          'Hoja de vida, documentos de soporte, cédula y carnet.',
          'Contrato de trabajo y recibido de copia del contrato.',
          'Recibido del equipo de trabajo entregado.',
          'Incapacidades, solicitudes de permiso y evaluaciones.',
          'Correspondencias internas y cualquier otro documento.',
        ],
        cierre: 'Los cinco primeros salen del trámite. Entre los seis restantes están los tres que se piden en un reclamo.',
      },
    ],

    sop: {
      proceso: 'Confeccionar y tramitar el contrato de un colaborador',
      cuando: 'Apenas el Administrador del Centro te envía el formato SOLICITUD DE CONTRATO.',
      producto: 'El contrato firmado por las dos partes, sellado por el Ministerio de Trabajo, inscrito en la Caja de Seguro Social y entregado con recibo firmado.',
      pasos: [
        'Recibe del Administrador del Centro el formato SOLICITUD DE CONTRATO.',
        'Verifica la información del formato contra los documentos del candidato antes de escribir una sola línea del contrato.',
        'Confecciona el primer contrato: tres meses de duración con un mes de prueba.',
        'Tramita la solicitud de entrada en seguro social junto con el contrato.',
        'Busca la firma del colaborador y la firma del representante legal. Las dos, no una.',
        'Haz que el contrato sea sellado por el Ministerio de Trabajo.',
        'Haz que el colaborador quede inscrito en la Caja de Seguro Social.',
        'Elabora el documento de entrega de contrato y haz que el colaborador firme que recibió su copia.',
        'Verifica que el file del colaborador repose en su centro con los once documentos completos.',
        'Si el pago va por transferencia a una cuenta que no es del colaborador, exige su autorización escrita y firmada, y archívala en el file.',
      ],
      decide: [
        { situacion: 'A quién se contrata', regla: 'No es tuyo. La Junta Directiva hace la segunda entrevista y se escoge ahí; el Administrador del Centro solicita el contrato. Tú confeccionas y tramitas.' },
        { situacion: 'El pago va a una cuenta de un tercero', regla: 'Hace falta una autorización escrita y firmada por el colaborador, archivada en su file. Sin ese papel no se paga a un tercero.' },
        { situacion: 'Falta un documento del candidato', regla: 'No se confecciona el contrato con la información a medias. Se devuelve al Administrador del Centro, que es quien verifica los documentos tras la entrevista.' },
      ],
      errores: [
        'Confeccionar el contrato sin verificar la información: el Manual te asigna la verificación, no solo la redacción.',
        'Conseguir una sola firma. Sin las dos, el contrato no se puede sellar.',
        'Dar por cerrado el trámite con el contrato firmado: falta el sello, la inscripción y el recibo de entrega.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Quién hace qué en la contratación' },
      { t: 'p', texto: 'El Manual separa las dos cosas con toda claridad y por eso este proceso no se pisa con nadie: **el Administrador del Centro SOLICITA; el Coordinador Operativo CONFECCIONA Y TRAMITA.**' },
      {
        t: 'tabla',
        encabezados: ['Etapa', 'Quién', 'Qué produce'],
        filas: [
          ['Entrevista y verificación de documentos', 'Administrador del Centro', 'Candidato con hoja de vida, certificados, cédula y carnet de seguro social'],
          ['Verificación de referencias (mínimo 2, con llamada y carta)', 'Asistente Administrativo', 'Referencias confirmadas, devueltas al Administrador'],
          ['Segunda entrevista', 'Junta Directiva', 'La persona escogida'],
          ['Solicitud de contrato', 'Administrador del Centro', 'El formato SOLICITUD DE CONTRATO, enviado al Coordinador Operativo'],
          ['Proceso de contrato', 'Coordinador Operativo', 'Contrato, solicitud de entrada en seguro social, firmas completas y verificación de la información'],
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'Lo que el Manual te asigna, literal', texto: 'El formato SOLICITUD DE CONTRATO se tiene que mandar al Coordinador Operativo, el cual se encarga del proceso de contrato: contrato, solicitud de entrada en seguro social, firmas completas y verificación de la información.' },

      { t: 'sub', texto: 'El primer contrato' },
      { t: 'p', texto: 'El primer contrato es de **tres meses con un mes de prueba**. Lo confeccionas tú. Durante ese período el Administrador del Centro hace su parte: la evaluación de desempeño a las **2 semanas** de trabajo, para dar retroalimentación del desempeño realizado contra el esperado, y **cinco días antes** de la finalización informa si el colaborador pasó su período de prueba o no.' },
      { t: 'p', texto: 'Si lo pasó, se deja cumplir el primer contrato. Lo que sigue después es la renovación, que tiene su propio módulo.' },

      { t: 'sub', texto: 'Las dos firmas y los dos trámites' },
      { t: 'p', texto: 'Aquí está el corazón del puesto, y es donde nadie más te puede sustituir. El Manual dice, literal, que el Coordinador Operativo **se encarga de buscar las firmas del colaborador y del representante legal**, y **se encarga de que el contrato sea sellado por el Ministerio de Trabajo e inscrito en la Caja de Seguro Social**.' },
      {
        t: 'tabla',
        encabezados: ['Paso', 'Sin él, qué pasa'],
        filas: [
          ['Firma del colaborador', 'No hay acuerdo: el contrato no obliga a la persona'],
          ['Firma del representante legal', 'No hay acuerdo: el contrato no obliga a la empresa'],
          ['Sello del Ministerio de Trabajo', 'El contrato no existe frente a la autoridad laboral'],
          ['Inscripción en la Caja de Seguro Social', 'El colaborador trabaja sin cobertura y la empresa queda expuesta'],
          ['Documento de entrega firmado', 'No se puede probar que el colaborador recibió su contrato'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'El trámite no termina con la firma', texto: 'El error caro de este proceso es dar por cerrado el expediente cuando las dos firmas están puestas. Faltan el sello, la inscripción y el recibo de entrega. Un contrato firmado y sin sellar deja al centro operando con una persona que, para el Ministerio de Trabajo, no tiene contrato.' },

      { t: 'sub', texto: 'El file del colaborador' },
      { t: 'p', texto: 'El Manual exige que el file de colaborador **repose en cada centro** con once documentos, y los enumera uno por uno:' },
      {
        t: 'lista',
        items: [
          'Hoja de vida.',
          'Documentos de soporte: certificados, diplomas, créditos.',
          'Cédula y carnet de seguro social.',
          'Contrato de trabajo.',
          'Documento de recibido de copia de contrato.',
          'Documentos de recibido de equipo de trabajo: celulares, computadoras y demás.',
          'Certificados de incapacidad.',
          'Solicitud de permiso de tiempo.',
          'Evaluaciones y retroalimentaciones.',
          'Correspondencias internas.',
          'Cualquier otro documento del colaborador.',
        ],
      },
      { t: 'p', texto: 'Los cinco primeros nacen del trámite de contratación que acabas de recorrer; los seis restantes se acumulan mientras la persona trabaja, y son justamente los que un inspector pide cuando hay un reclamo: el equipo entregado, las incapacidades y las evaluaciones. Verificar que el file está completo es parte de tu trámite, no un favor al centro.' },
      { t: 'nota', tono: 'ojo', titulo: 'Un file de cinco documentos está incompleto', texto: 'El error frecuente es dar por cerrado el file cuando están los papeles de la contratación. Faltan seis, y entre ellos están los tres que se piden en un tribunal: el recibido del equipo de trabajo, los certificados de incapacidad y las evaluaciones de desempeño. Un file que no los tiene no prueba nada el día que hace falta.' },

      { t: 'sub', texto: 'Pago a una cuenta que no es del colaborador' },
      { t: 'p', texto: 'Si los pagos se van a realizar por transferencia a una cuenta cuyo dueño no es el colaborador, tiene que mediar una **solicitud del propio colaborador**, por medio de una autorización escrita y firmada, que se archiva en su file. Sin ese papel no se paga a una tercera persona.' },

      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Redactar el contrato sin verificar la información: el Manual te asigna la verificación, no solo la redacción.',
          'Conseguir una sola firma. Sin las dos, no hay nada que sellar.',
          'Entregar la copia del contrato sin hacer firmar el documento de entrega.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'Según el Manual, ¿quién solicita el contrato y quién lo confecciona?',
        opciones: [
          'El Administrador del Centro solicita; el Coordinador Operativo confecciona y tramita',
          'El Coordinador Operativo solicita; la Junta Directiva confecciona',
          'El Asistente Administrativo solicita; el Administrador confecciona',
          'La Junta Directiva hace las dos cosas',
        ],
        explicacion: 'El formato SOLICITUD DE CONTRATO se manda al Coordinador Operativo, que se encarga del proceso de contrato.',
        repasa: ['solicitud-de-contrato', 'coordinador-operativo'],
      },
      {
        pregunta: 'El primer contrato de un colaborador es de…',
        opciones: [
          'un año con tres meses de prueba',
          'seis meses con dos de prueba',
          'tres meses con un mes de prueba',
          'un mes, renovable cada mes',
        ],
        explicacion: 'Tres meses con un mes de prueba. El de un año con tres de prueba es el segundo contrato.',
        repasa: ['contrato-de-trabajo', 'periodo-de-prueba'],
      },
      {
        pregunta: 'Las firmas que el Coordinador Operativo tiene que buscar son…',
        opciones: [
          'la del colaborador y la del Administrador del Centro',
          'la del colaborador y la del representante legal',
          'la del representante legal y la de la Junta Directiva',
          'solo la del colaborador',
        ],
        explicacion: 'Sin las dos, el contrato no obliga a ninguna de las dos partes y no se puede sellar.',
        repasa: ['colaborador'],
      },
      {
        pregunta: 'Después de las firmas, el Coordinador Operativo se encarga de que el contrato sea…',
        opciones: [
          'archivado en el Drive del centro',
          'aprobado por el Corporativo ALOHA',
          'revisado por el Asistente Administrativo',
          'sellado por el Ministerio de Trabajo e inscrito en la Caja de Seguro Social',
        ],
        explicacion: 'Es la parte del proceso que nadie más hace. Sin sello, el contrato no existe frente a la autoridad laboral.',
        repasa: ['ministerio-de-trabajo', 'caja-de-seguro-social'],
      },
      {
        pregunta: 'El trámite se puede dar por cerrado en cuanto el contrato está firmado por las dos partes.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Faltan el sello del Ministerio de Trabajo, la inscripción en la Caja de Seguro Social y el documento de entrega firmado.',
        repasa: ['contrato-de-trabajo'],
      },
      {
        pregunta: '¿Para qué sirve el documento de entrega de contrato?',
        opciones: [
          'para que el colaborador firme que recibió su contrato, y quede en su archivo',
          'para notificar a la Caja de Seguro Social',
          'para que el Administrador del Centro apruebe el contrato',
          'para solicitar la renovación',
        ],
        explicacion: 'Sin él no se puede probar que el colaborador recibió su copia.',
        repasa: ['evidencia', 'file-del-colaborador'],
      },
      {
        pregunta: 'El file del colaborador que reposa en cada centro lleva…',
        opciones: [
          'solo el contrato de trabajo',
          'cinco documentos: hoja de vida, soportes, cédula y carnet, contrato y recibido de copia',
          'once documentos, del currículum al recibido del equipo de trabajo y las evaluaciones',
          'lo que el Administrador del Centro considere necesario',
        ],
        explicacion: 'Son once y el Manual los enumera uno por uno. Los cinco de la contratación son el arranque, no el file completo: faltan el recibido del equipo de trabajo, las incapacidades y las evaluaciones, que son justo los que se piden en un reclamo.',
        repasa: ['file-del-colaborador'],
      },
      {
        pregunta: 'Un colaborador pide que su pago se haga a la cuenta de otra persona. Se necesita…',
        opciones: [
          'una autorización escrita y firmada por él, archivada en su file',
          'la aprobación verbal del Administrador del Centro',
          'un correo del titular de la cuenta',
          'nada: basta con cambiar el número de cuenta',
        ],
        explicacion: 'Sin ese papel no se paga a una tercera persona.',
        repasa: ['ach'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — La cadena completa, de la solicitud al recibido',
        fuente: 'manual-operaciones-completo.md#L1965',
        proposito: 'Que recorras el trámite entero de memoria, en orden, y digas en cada paso qué produce y qué pasa si falta.',
        gradiente: 'Exige este módulo estudiado con el formato y un file real delante. Si te saltas el sello o la inscripción, se vuelve al bloque de las dos firmas y los dos trámites.',
        masa: [
          'El formato SOLICITUD DE CONTRATO en blanco.',
          'Un file de colaborador real, abierto.',
          'Un contrato sellado por el Ministerio de Trabajo.',
        ],
        pasos: [
          'Sin apuntes, recorre la cadena desde que te llega el formato hasta el documento de entrega firmado.',
          'En cada paso di qué produce y qué queda sin poder probarse si ese paso falta.',
          'Di la duración del primer contrato y su período de prueba, con los dos números.',
          'Abre el file real y verifica en voz alta los once documentos, uno por uno.',
          'Explica qué haces si el candidato llega sin carnet de seguro social.',
        ],
        criterios: [
          'Recorre la cadena entera en orden y sin saltarse el sello ni la inscripción en la Caja de Seguro Social.',
          'Dice los dos números del primer contrato: tres meses de duración y un mes de prueba.',
          'Verifica los once documentos del file señalándolos uno por uno en el expediente real.',
          'Devuelve al Administrador del Centro el caso del documento faltante en vez de confeccionar el contrato igual.',
        ],
        errorTipico: 'Dar el trámite por terminado con las dos firmas puestas. El centro se queda operando con una persona que, para el Ministerio de Trabajo, no tiene contrato.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 18 · of-cop-5 — Manual literal (L1975 y las dos evaluaciones)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'of-cop-5',
    curso: 'coordinacion',
    orden: 18,
    roles: ['coordinador'],
    titulo: 'Renovación, período de prueba y no renovación',
    duracionMin: 15,
    requiere: ['of-cop-4'],
    fuente: [
      'manual-operaciones-completo.md#L1975',
      'manual-operaciones-completo.md#evaluacion-de-desempeno',
      'manual-operaciones-completo.md#carta-de-no-renovacion',
    ],

    pfv: 'Ningún contrato de la red se vence sin decisión: cada colaborador llega a la fecha con su renovación confeccionada o con su carta de no renovación lista para el último día.',
    voz: 'Un contrato que se vence sin que nadie decida es el problema más caro de este puesto. <break time="0.5s"/> El calendario del Manual es claro. <break time="0.4s"/> A las dos semanas de entrar, primera evaluación de desempeño. <break time="0.3s"/> Cinco días antes de que termine el primer contrato, el Administrador informa si pasó la prueba. <break time="0.5s"/> Un mes antes del vencimiento, segunda evaluación. <break time="0.3s"/> Y una semana antes, el Administrador solicita la renovación, o la carta de no renovación. <break time="0.4s"/> Tú confeccionas. Él solicita y evalúa. <break time="0.5s"/> El segundo contrato va a un año, con tres meses de prueba. <break time="0.4s"/> Y la carta de no renovación se entrega el último día de trabajo. <break time="0.3s"/> Ni antes, ni después.',

    masa: [
      'La lista de contratos por vencer del trimestre, por centro.',
      'El formato de EVALUACIÓN DE DESEMPEÑO en blanco.',
      'Un modelo de carta de notificación de no renovación.',
    ],

    palabras: [
      'contrato-de-trabajo',
      'periodo-de-prueba',
      'evaluacion-de-desempeno',
      'carta-de-no-renovacion',
      'colaborador',
      'file-del-colaborador',
      'administrador-de-centro',
      'coordinador-operativo',
      'ministerio-de-trabajo',
      'caja-de-seguro-social',
    ],

    laminas: [
      {
        kicker: 'El calendario',
        titulo: 'Cuatro fechas que no se mueven',
        items: [
          'Semana 2 del primer contrato: primera evaluación de desempeño.',
          'Cinco días antes del final: el Administrador informa si pasó la prueba.',
          'Un mes antes del vencimiento: segunda evaluación.',
          'Una semana antes: se solicita la renovación o la carta.',
        ],
      },
      {
        titulo: 'El segundo contrato: un año con tres meses de prueba',
        texto: 'Del colaborador haber superado su primer contrato, el Administrador solicita la renovación y el Coordinador Operativo confecciona el segundo contrato, que va a un año con tres meses de prueba.',
      },
      {
        kicker: 'La división que no cambia',
        titulo: 'Él solicita y evalúa, tú confeccionas',
        texto: 'La evaluación de desempeño es del Administrador del Centro, con su formato. Tú no evalúas a nadie: recibes la solicitud y produces el documento que corresponda.',
      },
      {
        titulo: 'Si no se renueva',
        items: [
          'Con la segunda evaluación, el Administrador inicia la búsqueda del reemplazo.',
          'Una semana antes solicita la carta de notificación de no renovación.',
          'La carta se entrega al colaborador el último día de trabajo.',
        ],
        cierre: 'El contrato que se vence sin decisión es el error caro de este proceso.',
      },
    ],

    sop: {
      proceso: 'Renovar o no renovar un contrato en su fecha',
      cuando: 'Desde un mes antes del vencimiento de cualquier contrato de la red.',
      producto: 'La renovación confeccionada y tramitada, o la carta de no renovación lista para entregarse el último día de trabajo.',
      pasos: [
        'Manten una lista de contratos por vencer del trimestre, por centro y por fecha.',
        'Un mes antes del vencimiento, confirma con el Administrador del Centro que hizo la segunda evaluación de desempeño.',
        'Una semana antes del vencimiento, exige la solicitud: renovación, o carta de notificación de no renovación.',
        'Si se renueva, confecciona el segundo contrato: un año con tres meses de prueba.',
        'Busca la firma del colaborador y la del representante legal, igual que en el primero.',
        'Sella el contrato en el Ministerio de Trabajo y verifica la inscripción en la Caja de Seguro Social.',
        'Haz firmar el documento de entrega y archiva la copia en el file del colaborador.',
        'Si no se renueva, confecciona la carta para que el Administrador la entregue el último día de trabajo.',
        'Cierra el file con la fecha de salida y avisa que el puesto quedó vacante.',
      ],
      decide: [
        { situacion: 'Si el colaborador pasó o no el período de prueba', regla: 'Lo informa el Administrador del Centro cinco días antes de la finalización del contrato, con su evaluación de desempeño. Tú no evalúas.' },
        { situacion: 'Si se renueva o no se renueva', regla: 'Lo solicita el Administrador del Centro con base en la segunda evaluación. Tú confeccionas el documento que corresponda.' },
        { situacion: 'La fecha de vencimiento llegó sin solicitud', regla: 'No se confecciona nada por iniciativa propia: se eleva a la Junta Directiva ese mismo día, con la fecha de vencimiento y el centro.' },
      ],
      errores: [
        'Dejar vencer un contrato sin decisión: el colaborador sigue trabajando sin documento vigente.',
        'Entregar la carta de no renovación antes del último día de trabajo.',
        'Confeccionar la renovación con la duración del primer contrato: el segundo es de un año con tres meses de prueba.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'El calendario del contrato' },
      { t: 'p', texto: 'Un contrato que se vence sin que nadie decida es el problema más caro de este puesto: el colaborador sigue trabajando sin documento vigente, y eso no lo arregla ninguna firma posterior. El Manual fija cuatro fechas y ninguna se mueve.' },
      {
        t: 'tabla',
        encabezados: ['Cuándo', 'Qué pasa', 'Quién'],
        filas: [
          ['A las 2 semanas de trabajo', 'Primera evaluación de desempeño: desempeño realizado contra el esperado, para que el colaborador tome medidas y pase la prueba', 'Administrador del Centro'],
          ['5 días antes de finalizar el primer contrato', 'Informa si el colaborador pasó su período de prueba o no', 'Administrador del Centro'],
          ['1 mes antes del vencimiento', 'Segunda evaluación, para determinar si el contrato se renueva; con ella inicia la búsqueda del reemplazo si no se renueva', 'Administrador del Centro'],
          ['1 semana antes del vencimiento', 'Solicita la renovación o, en su defecto, la carta de notificación de no renovación', 'Administrador del Centro'],
          ['Al recibir la solicitud', 'Confecciona el segundo contrato o la carta', 'Coordinador Operativo'],
        ],
      },

      { t: 'sub', texto: 'El segundo contrato' },
      { t: 'p', texto: 'Del colaborador haber superado su primer contrato, el Administrador solicita la renovación y el Coordinador Operativo confecciona un segundo contrato, **el cual va a un año con tres meses de prueba**.' },
      { t: 'p', texto: 'La cadena de trámite es la misma que la del primero, sin atajos: las dos firmas, el sello del Ministerio de Trabajo, la inscripción en la Caja de Seguro Social y el documento de entrega firmado por el colaborador.' },
      { t: 'nota', tono: 'ojo', titulo: 'Los dos períodos de prueba no son el mismo', texto: 'El primer contrato es de tres meses con UN mes de prueba. El segundo es de un año con TRES meses de prueba. Confundirlos al confeccionar deja al colaborador con un período de prueba que no le corresponde, y ese es un documento que después se lee en un tribunal.' },

      { t: 'sub', texto: 'Quién evalúa y quién confecciona' },
      { t: 'p', texto: 'Este puesto **no evalúa a nadie**. Las dos evaluaciones de desempeño son del Administrador del Centro, con el formato de EVALUACIÓN DE DESEMPEÑO. Tú recibes la solicitud que sale de esa evaluación y produces el documento que corresponda.' },
      { t: 'nota', tono: 'regla', titulo: 'La regla del puesto', texto: 'El Administrador solicita y evalúa. El Coordinador Operativo confecciona y tramita. Si un Administrador te pide que decidas tú si su colaborador sigue, la respuesta es que la decisión sale de su evaluación, no de tu escritorio.' },

      { t: 'sub', texto: 'Cuando no se renueva' },
      { t: 'p', texto: 'Con la segunda evaluación, el Administrador inicia el proceso de búsqueda del nuevo colaborador para reemplazar al actual. Una semana antes del vencimiento solicita la carta de notificación de no renovación, **para ser entregada al colaborador el último día de trabajo**.' },
      { t: 'nota', tono: 'alerta', titulo: 'La fecha de entrega de la carta no es negociable', texto: 'El último día de trabajo. Entregarla antes convierte las semanas que faltan en un problema de clima dentro del centro; entregarla después deja a la empresa sin la notificación en la fecha que le corresponde.' },
      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva', texto: 'El Manual fija la duración de los dos contratos, las dos evaluaciones y la carta, pero NO dice qué se hace cuando la fecha de vencimiento llega y el Administrador del Centro no solicitó nada. La regla que trae tu hoja para ese caso —no confeccionar nada por iniciativa propia y elevarlo a la Junta Directiva ese mismo día— es la práctica de la operación, no norma escrita. Pídele a la Junta que la escriba: es el único hueco de este proceso.' },

      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Dejar vencer un contrato sin decisión, porque nadie te mandó la solicitud. La lista de vencimientos es tuya: reclama la solicitud, no la esperes.',
          'Confeccionar la renovación con la duración del primer contrato.',
          'Cerrar la renovación con las firmas y olvidar el sello y la inscripción.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'El segundo contrato, tras superar el primero, es de…',
        opciones: [
          'tres meses con un mes de prueba',
          'un año con tres meses de prueba',
          'seis meses sin prueba',
          'un año sin período de prueba',
        ],
        explicacion: 'El de tres meses con un mes de prueba es el primero. Confundirlos deja al colaborador con un período de prueba que no le corresponde.',
        repasa: ['contrato-de-trabajo', 'periodo-de-prueba'],
      },
      {
        pregunta: 'La primera evaluación de desempeño se hace…',
        opciones: [
          'a las 2 semanas de trabajo',
          'al mes de trabajo',
          'a los tres meses',
          'el último día del contrato',
        ],
        explicacion: 'Sirve para dar retroalimentación del desempeño realizado contra el esperado, a tiempo para que el colaborador pase la prueba.',
        repasa: ['evaluacion-de-desempeno'],
      },
      {
        pregunta: '¿Quién informa si el colaborador pasó su período de prueba, y cuándo?',
        opciones: [
          'El Coordinador Operativo, al vencimiento',
          'La Junta Directiva, en su reunión mensual',
          'El Administrador del Centro, cinco días antes de la finalización del contrato',
          'El Asistente Administrativo, con la planilla',
        ],
        explicacion: 'Este puesto no evalúa a nadie: recibe la solicitud que sale de esa evaluación.',
        repasa: ['administrador-de-centro'],
      },
      {
        pregunta: 'La segunda evaluación de desempeño se hace…',
        opciones: [
          'una semana antes del vencimiento',
          'un mes antes de la fecha de finalización del contrato',
          'el mismo día del vencimiento',
          'tres meses antes',
        ],
        explicacion: 'Y con ella el Administrador inicia la búsqueda del reemplazo si el contrato no se va a renovar.',
        repasa: ['evaluacion-de-desempeno'],
      },
      {
        pregunta: 'La carta de notificación de no renovación se entrega al colaborador…',
        opciones: [
          'el último día de trabajo',
          'un mes antes del vencimiento',
          'el día que se decide no renovar',
          'junto con la segunda evaluación',
        ],
        explicacion: 'Ni antes ni después. Entregarla antes convierte las semanas que faltan en un problema de clima dentro del centro.',
        repasa: ['carta-de-no-renovacion'],
      },
      {
        pregunta: 'La renovación se tramita con menos pasos que el primer contrato.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'La cadena es la misma: las dos firmas, el sello del Ministerio de Trabajo, la inscripción en la Caja de Seguro Social y el documento de entrega firmado.',
        repasa: ['ministerio-de-trabajo'],
      },
      {
        pregunta: 'Llega la fecha de vencimiento y nadie te mandó la solicitud. Lo correcto es…',
        opciones: [
          'renovar por defecto, para no dejar al colaborador sin contrato',
          'esperar a que el Administrador del Centro se acuerde',
          'no renovar, porque no hubo solicitud',
          'elevarlo a la Junta Directiva ese mismo día, con la fecha de vencimiento y el centro',
        ],
        explicacion: 'No se confecciona nada por iniciativa propia. Y la lista de vencimientos es tuya: la solicitud se reclama, no se espera.',
        repasa: ['junta-directiva'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Los vencimientos del trimestre, uno por uno',
        fuente: 'manual-operaciones-completo.md#L1975',
        proposito: 'Que ante una lista real de contratos por vencer digas, para cada uno, en qué fecha toca cada paso y qué documento vas a confeccionar.',
        gradiente: 'Exige of-cop-4 estudiado: la cadena de trámite del segundo contrato es la del primero. Si te saltas el sello aquí, el hueco está en aquel módulo.',
        masa: [
          'La lista de contratos por vencer del trimestre, por centro y por fecha.',
          'El formato de EVALUACIÓN DE DESEMPEÑO en blanco.',
        ],
        pasos: [
          'Toma el primer contrato de la lista y di su fecha de vencimiento.',
          'Di las cuatro fechas del calendario que le corresponden, contadas desde esa.',
          'Di qué documento confeccionas tú y qué documento espera de ti el centro.',
          'Repite con un contrato que esté en su primer período y con uno en el segundo.',
          'Explica qué haces con el que ya venció sin que nadie te mandara la solicitud.',
        ],
        criterios: [
          'Calcula las cuatro fechas del calendario a partir de la fecha de vencimiento real de cada contrato.',
          'Separa correctamente el primer contrato del segundo, con sus dos duraciones y sus dos pruebas.',
          'Dice que la carta de no renovación se entrega el último día de trabajo, sin dudarlo.',
          'Ante el contrato vencido sin solicitud, escribe el caso para la Junta Directiva en vez de renovar por defecto.',
        ],
        errorTipico: 'Renovar por defecto el contrato que venció sin solicitud, para no dejar a la persona sin documento. Eso convierte una omisión del centro en una decisión tuya que nadie te delegó.',
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  // 19 · of-cop-6 — Manual literal (L546, L552, L554)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'of-cop-6',
    curso: 'coordinacion',
    orden: 19,
    roles: ['coordinador'],
    titulo: 'Permisos: el archivo único y la solicitud a la Junta',
    duracionMin: 15,
    requiere: ['of-cop-5'],
    fuente: [
      'manual-operaciones-completo.md#L546',
      'manual-operaciones-completo.md#L552',
      'manual-operaciones-completo.md#L554',
    ],

    pfv: 'Todo permiso autorizado de la red en tus manos el mismo día, reposando en el file de su colaborador y con su descuento respaldado; y el tuyo, elevado a la Junta Directiva por correo.',
    voz: 'Este trámite es de dos líneas del Manual y las dos son tuyas. <break time="0.5s"/> La primera. Todos los documentos de permiso te llegan inmediatamente después de que fueron autorizados. <break time="0.4s"/> No al cierre de mes. No cuando los pidas. Inmediatamente. <break time="0.5s"/> Si el papel se queda en la gaveta del centro, el descuento de la quincena no tiene respaldo. <break time="0.4s"/> La segunda línea es la única del Manual que dice de quién dependes tú. <break time="0.5s"/> Tu propia solicitud de permiso va a la Junta Directiva. Por correo electrónico. <break time="0.4s"/> Igual que los Administradores. <break time="0.3s"/> Y con su descuento reflejado en tu comprobante de pago de quincena. <break time="0.4s"/> Léelo despacio, porque en todo el Manual no hay otra línea que te ubique en el organigrama.',

    masa: [
      'El Formato de Solicitud de Permisos en blanco.',
      'Los permisos autorizados del mes en la red, tal como te llegaron.',
      'Un file de colaborador con sus permisos reposando dentro.',
    ],

    palabras: [
      'permiso',
      'file-del-colaborador',
      'junta-directiva',
      'coordinador-operativo',
      'administrador-de-centro',
      'asistente-administrativo',
      'colaborador',
      'quincena',
      'planilla',
      'tiempo-compensatorio',
      'evidencia',
    ],

    laminas: [
      {
        kicker: 'La primera línea',
        titulo: 'Te llegan inmediatamente, no al cierre de mes',
        texto: 'Todos los documentos de permisos deben ser entregados al Coordinador Operativo inmediatamente después de que fueron autorizados. Esa palabra, inmediatamente, es del Manual.',
      },
      {
        titulo: 'Por qué la inmediatez importa',
        items: [
          'El permiso justifica la ausencia, no el pago del tiempo.',
          'Se descuenta automáticamente del salario, en la quincena.',
          'Si el papel se queda en la gaveta, el descuento no tiene respaldo.',
          'Y el file del colaborador queda incompleto.',
        ],
      },
      {
        kicker: 'La ruta por cargo',
        titulo: 'Quién le pide permiso a quién',
        items: [
          'Asistente Administrativa: al Administrador, con el formato.',
          'Administradores: a la Junta Directiva, por correo.',
          'Coordinador Operativo: a la Junta Directiva, por correo.',
          'Coaches: coordinan suplencia y luego avisan al Administrador.',
        ],
      },
      {
        kicker: 'La línea que te ubica',
        titulo: 'Tu propio permiso sube a la Junta Directiva',
        texto: 'Es la única línea del Manual que dice de quién dependes. No hay sección de tu puesto, ni perfil, ni indicadores. Hay esta línea, y dice Junta Directiva.',
        cierre: 'Tu descuento se refleja en tu comprobante de pago de quincena.',
      },
    ],

    sop: {
      proceso: 'Recibir, archivar y elevar un permiso',
      cuando: 'El mismo día en que el permiso queda autorizado, en cualquier centro de la red.',
      producto: 'El permiso autorizado en el file de su colaborador, con su descuento respaldado, y el tuyo elevado a la Junta Directiva por correo.',
      pasos: [
        'Recibe el documento de permiso el mismo día en que fue autorizado. Si no llega, reclámalo por escrito ese día.',
        'Verifica que traiga la firma de quien autoriza: sin firma no está autorizado, está solicitado.',
        'Verifica que la solicitud se hizo por escrito y con un mínimo de tres días de anticipación.',
        'Comprueba que el permiso no se manejó como tiempo compensatorio: eso solo aplica cuando el tiempo lo pide la empresa.',
        'Deja el permiso reposando en el file personal del colaborador, en su centro.',
        'Asegúrate de que el descuento quede reflejado para la quincena que corresponde.',
        'Si el permiso es con justificación médica, lleva la cuenta del año contra el máximo de 18.',
        'Para tu propio permiso, envía el correo de SOLICITUD DE PERMISO a la Junta Directiva y espera la autorización.',
      ],
      decide: [
        { situacion: 'Autorizar el permiso de una Asistente Administrativa', regla: 'No es tuyo. Lo autoriza el Administrador del Centro, y queda autorizado únicamente al momento de su firma. A ti te llega después.' },
        { situacion: 'Autorizar tu propio permiso', regla: 'Tampoco es tuyo. Lo eleva el Coordinador Operativo a la Junta Directiva por correo electrónico, igual que los Administradores.' },
        { situacion: 'Un centro te manda los permisos al cierre de mes', regla: 'No se acepta la costumbre: el Manual dice inmediatamente después de autorizados. Se reclama por escrito y, si se repite, sube a la Junta Directiva.' },
      ],
      errores: [
        'Dejar el permiso firmado en la gaveta del centro: el descuento de la quincena se queda sin respaldo.',
        'Archivar un permiso sin la firma de quien autoriza: solicitado no es autorizado.',
        'Aceptar tiempo compensatorio por un permiso que pidió el propio colaborador.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Las dos líneas del Manual que son tuyas' },
      { t: 'p', texto: 'De las diez menciones que el Manual hace de este puesto, tres son de permisos, y dos de ellas te definen. La primera: **todos los documentos de permisos deben ser entregados al Coordinador Operativo inmediatamente después fueron autorizados.** La segunda: **el Coordinador Operativo deberá realizar la solicitud a la Junta Directiva por medio de correo electrónico SOLICITUD DE PERMISO.**' },
      { t: 'p', texto: 'La tercera dice que el permiso ya autorizado de la Asistente Administrativa **debe ser enviada al Coordinador Operativo y reposar en el file personal**. Las tres juntas describen un archivo único de la red, en tus manos.' },

      { t: 'sub', texto: 'Por qué la inmediatez no es un capricho' },
      { t: 'p', texto: 'Un permiso otorgado es una justificación del colaborador, **no una justificación de pago del tiempo**: se descuenta automáticamente del salario y se refleja en el comprobante de pago de la quincena. Si el papel se queda en la gaveta del centro, ese descuento no tiene respaldo escrito el día que alguien lo reclame, y el file del colaborador queda incompleto.' },
      { t: 'nota', tono: 'regla', titulo: 'Lo que verificas al recibirlo', texto: 'Que traiga la firma de quien autoriza. Que la solicitud se hizo por escrito y con un mínimo de tres días de anticipación. Y que no se manejó como tiempo compensatorio, porque el compensatorio solo aplica cuando el tiempo lo pide la propia empresa.' },

      { t: 'sub', texto: 'La ruta según el cargo' },
      {
        t: 'tabla',
        encabezados: ['Cargo', 'A quién solicita', 'Cómo', 'Qué te llega a ti'],
        filas: [
          ['Asistente Administrativa', 'Administrador del Centro', 'Formato de Solicitud de Permisos; autorizado solo al momento de la firma', 'El documento firmado, para archivo y file personal'],
          ['Administradores', 'Junta Directiva', 'Correo electrónico', 'El documento autorizado'],
          ['Coordinador Operativo', 'Junta Directiva', 'Correo electrónico de SOLICITUD DE PERMISO', 'El tuyo: lo elevas tú mismo'],
          ['Coaches', 'Coordinan suplencia con otro Coach y avisan al Administrador', 'Según el nivel que requiere el grupo', 'El aviso, para la planilla del centro'],
        ],
      },

      { t: 'sub', texto: 'La única línea que dice de quién dependes' },
      { t: 'p', texto: 'Vale la pena decirlo despacio: en todo el Manual **no hay otra línea que ubique a este puesto en el organigrama**. No tiene sección propia, ni objetivo de posición, ni perfil, ni competencias, ni indicadores. Tiene esta línea, y esta línea dice Junta Directiva.' },
      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva', texto: 'El Manual necesita una sección propia de Coordinador Operativo. Mientras no exista, tu entrenamiento es más completo que la norma que lo respalda, y eso hay que decirlo en voz alta en vez de disimularlo. Lo único auditable de tu puesto son las diez menciones; el resto es la práctica que el dueño describió.' },

      { t: 'sub', texto: 'El límite médico y el archivo' },
      { t: 'p', texto: 'Los colaboradores de planilla tienen un máximo de **18 permisos al año con justificación médica** pagados por la empresa. Al exceder los 18, la Caja de Seguro Social se responsabiliza del pago. Como el archivo de permisos de la red es tuyo, eres el único que puede llevar esa cuenta sin depender de la memoria de cada centro.' },

      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Aceptar que un centro te mande los permisos al cierre de mes. La costumbre se corrige la primera vez, por escrito.',
          'Archivar un permiso sin la firma de quien autoriza: solicitado no es autorizado.',
          'Dejar tu propio permiso en un acuerdo verbal. El tuyo va a la Junta Directiva y por correo.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'Los documentos de permiso llegan al Coordinador Operativo…',
        opciones: [
          'inmediatamente después de ser autorizados',
          'al cierre de cada mes',
          'junto con la planilla de la quincena',
          'cuando el Coordinador los solicite',
        ],
        explicacion: 'Si el papel se queda en la gaveta, el descuento de la quincena se queda sin respaldo escrito.',
        repasa: ['permiso', 'coordinador-operativo'],
      },
      {
        pregunta: 'El Coordinador Operativo eleva su propia solicitud de permiso…',
        opciones: [
          'al Administrador del Centro donde esté ese día',
          'a la Junta Directiva, por correo electrónico',
          'al Corporativo ALOHA',
          'no necesita solicitar permiso',
        ],
        explicacion: 'Es la única línea del Manual que ubica a este puesto en el organigrama.',
        repasa: ['junta-directiva'],
      },
      {
        pregunta: 'El permiso de la Asistente Administrativa queda autorizado…',
        opciones: [
          'al entregar el formato',
          'cuando el Coordinador Operativo lo recibe',
          'únicamente al momento de la firma del Administrador del Centro',
          'cuando se archiva en el file personal',
        ],
        explicacion: 'Después se envía al Coordinador Operativo y reposa en el file personal, pero quien autoriza es el Administrador.',
        repasa: ['administrador-de-centro', 'file-del-colaborador'],
      },
      {
        pregunta: 'Un permiso otorgado justifica…',
        opciones: [
          'la ausencia, pero no el pago del tiempo, que se descuenta del salario',
          'la ausencia y el pago del tiempo',
          'la ausencia y se rebaja de vacaciones',
          'nada: es solo un aviso',
        ],
        explicacion: 'Se descuenta automáticamente y se refleja en el comprobante de pago de la quincena.',
        repasa: ['quincena'],
      },
      {
        pregunta: 'El tiempo compensatorio aplica…',
        opciones: [
          'cuando el colaborador lo pide con anticipación',
          'en los permisos médicos',
          'a criterio del Administrador del Centro',
          'solo cuando la propia empresa solicita el tiempo',
        ],
        explicacion: 'No es una moneda de cambio para los permisos que pide el propio colaborador.',
        repasa: ['tiempo-compensatorio'],
      },
      {
        pregunta: 'Un centro te manda todos sus permisos juntos al cierre de mes. Tú…',
        opciones: [
          'lo aceptas: llegan igual',
          'lo reclamas por escrito esa vez y, si se repite, lo subes a la Junta Directiva',
          'lo apuntas para la evaluación de desempeño del Administrador',
          'los devuelves sin archivar',
        ],
        explicacion: 'El Manual dice inmediatamente después de autorizados. La costumbre se corrige la primera vez.',
        repasa: ['evidencia'],
      },
      {
        pregunta: 'El máximo de permisos al año con justificación médica pagados por la empresa es…',
        opciones: ['12', '15', '18', '24'],
        explicacion: 'Al exceder los 18, la Caja de Seguro Social se responsabiliza del pago. Llevar esa cuenta de toda la red es de este puesto.',
        repasa: ['planilla'],
      },
      {
        pregunta: 'Llega un permiso sin la firma de quien autoriza. Lo correcto es…',
        opciones: [
          'archivarlo igual y anotarlo como pendiente',
          'firmarlo tú, que coordinas la operación',
          'no archivarlo: solicitado no es autorizado, y se devuelve al centro',
          'esperar al cierre de mes para reclamarlo',
        ],
        explicacion: 'Un permiso sin firma no respalda ningún descuento y ensucia el file del colaborador.',
        repasa: ['colaborador'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Los permisos del mes, recibidos y colocados',
        fuente: 'manual-operaciones-completo.md#L552',
        proposito: 'Que revises los permisos reales de un mes de la red, verifiques cada uno y digas dónde va y qué respalda.',
        gradiente: 'Exige este módulo estudiado con los permisos del mes delante. Si no distingues solicitado de autorizado, el hueco está en el bloque de la ruta por cargo.',
        masa: [
          'Los permisos autorizados de un mes de la red, tal como llegaron.',
          'El Formato de Solicitud de Permisos en blanco.',
          'Un file de colaborador abierto.',
        ],
        pasos: [
          'Toma cada permiso y di si está autorizado o solo solicitado, señalando la firma.',
          'Di la fecha en que se solicitó y verifica los tres días de anticipación.',
          'Di en qué file va y qué quincena respalda su descuento.',
          'Aparta los que llegaron tarde y redacta el reclamo escrito al centro.',
          'Di cómo elevarías tu propio permiso si lo necesitaras la semana que viene.',
        ],
        criterios: [
          'Separa los permisos autorizados de los solamente solicitados señalando la firma en cada documento.',
          'Verifica los tres días de anticipación en cada permiso y aparta los que no los cumplen.',
          'Dice en qué file va cada permiso y qué quincena respalda su descuento.',
          'Redacta el reclamo escrito al centro que envió los permisos fuera de plazo, sin adjetivos.',
        ],
        errorTipico: 'Archivar todo lo que llegue sin mirar la firma, porque el sobre venía del centro. Un permiso sin firma no respalda ningún descuento y deja el file del colaborador con un papel que no prueba nada.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 20 · of-cop-7 — Manual literal (L2171, L2173, L2175)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'of-cop-7',
    curso: 'coordinacion',
    orden: 20,
    roles: ['coordinador'],
    titulo: 'Cobranza escalada: incobrables y el día 46',
    duracionMin: 20,
    requiere: ['of-cop-6'],
    fuente: [
      'manual-operaciones-completo.md#L2171',
      'manual-operaciones-completo.md#L2173',
      'manual-operaciones-completo.md#L2175',
    ],

    pfv: 'La cartera vieja de la red en movimiento: cada cuenta que cruzó el día 45 pasada al personal de cobro dentro de su tramo, y cada incobrable verificado en el Drive.',
    voz: 'La cobranza tiene cuatro tramos y los tres primeros son del centro. <break time="0.4s"/> El cuarto es tuyo, y por eso este módulo existe. <break time="0.5s"/> Tramo uno: factura emitida, del día uno al quince. Avisa el asistente. <break time="0.4s"/> Tramo dos: vencida hasta quince días. El asistente informa al administrador y al acudiente. <break time="0.5s"/> Tramo tres: hasta el día cuarenta y cinco. Si el arreglo no fue efectivo, el asistente carga la cuenta en el Drive de incobrables. <break time="0.4s"/> Y tú verificas que esa información esté ahí. <break time="0.5s"/> Tramo cuatro: del día cuarenta y seis al sesenta y uno. <break time="0.3s"/> Tú pasas la lista al personal de cobro. <break time="0.4s"/> Si nadie hace eso, la cartera vieja se queda quieta. <break time="0.3s"/> El asistente solo llega hasta el día cuarenta y cinco.',

    masa: [
      'El informe de antigüedad de saldos de un centro, abierto.',
      'El Drive de cuentas incobrables, con sus fichas cargadas.',
      'La lista de arreglos de pago notificados en el mes.',
    ],

    palabras: [
      'cuentas-por-cobrar',
      'factura-vencida',
      'cuenta-incobrable',
      'arreglo-de-pago',
      'informe-de-antiguedad-de-saldos',
      'drive',
      'paz-y-salvo',
      'coordinador-operativo',
      'administrador-de-centro',
      'asistente-administrativo',
      'evidencia',
      'representante',
    ],

    laminas: [
      {
        kicker: 'Los cuatro tramos',
        titulo: 'Tres son del centro, el cuarto es tuyo',
        items: [
          'Emisión, días 1 a 15: avisa el Asistente Administrativo.',
          'Vencida 1 a 15 días (día 16 al 30): informa al Administrador.',
          'Vencida 15 a 30 días (día 31 al 45): carga el incobrable en el Drive.',
          'Vencida 30 a 45 días (día 46 al 61): tú pasas la lista al cobro.',
        ],
      },
      {
        titulo: 'Lo que solo hace este puesto',
        items: [
          'Verificar en el Drive que la ficha del incobrable esté cargada.',
          'Pasar la lista al personal de cobro en el tramo 46 al 61.',
          'Recibir la notificación inmediata de todo arreglo de pago.',
        ],
        cierre: 'Sin esto, la cartera vieja se queda quieta: el Asistente llega hasta el 45.',
      },
      {
        kicker: 'El arreglo de pago',
        titulo: 'Te notifican de inmediato, y con evidencia',
        texto: 'La decisión de llegar a un acuerdo de pago o de retirar al niño deteniendo la factura recurrente es del Administrador del Centro. Lo que es tuyo es enterarte el mismo día, con la evidencia.',
      },
      {
        titulo: 'Dónde se cruza con el semáforo',
        texto: 'La meta de cobranza es una de las tres del marcador de resultado, y se calcula con la peor cifra declarada en todo el mes. La cartera que no se mueve aparece ahí, no solo en el informe de saldos.',
      },
      {
        kicker: 'El tono',
        titulo: 'Amigable, y buscando que el cliente se ponga al día',
        texto: 'El Manual lo dice para todo contacto con cliente. Pasar una cuenta al personal de cobro es un procedimiento, no un castigo, y se ejecuta en su fecha sin adjetivos.',
      },
    ],

    sop: {
      proceso: 'Mover la cartera vieja de un centro',
      cuando: 'Semanalmente, y sin falta en el tramo de 46 a 61 días de vencimiento.',
      producto: 'Las cuentas que cruzaron el día 45 pasadas al personal de cobro dentro de su tramo, y las fichas de incobrables verificadas en el Drive.',
      pasos: [
        'Abre el informe de antigüedad de saldos del centro y ordena las cuentas por días de vencimiento.',
        'Separa las que están entre 31 y 45 días: esas todavía las trabaja el Asistente Administrativo.',
        'Verifica en el Drive de cuentas incobrables que la ficha de cada una de esas esté cargada y completa.',
        'Si falta una ficha, pídela al centro ese mismo día: sin ficha no hay nada que pasar al cobro después.',
        'Separa las que ya están entre 46 y 61 días de vencimiento.',
        'Pasa esa lista al personal de cobro, completa y con los datos del cliente.',
        'Anota la fecha en que la pasaste: es lo único que prueba que el tramo se cumplió.',
        'Registra los arreglos de pago que te notificaron en el mes y comprueba que cada uno tenga evidencia.',
        'Lleva a la reunión semanal del centro la cuenta más vieja y la fecha en que se movió.',
      ],
      decide: [
        { situacion: 'Llegar a un acuerdo de pago o retirar al niño deteniendo la factura recurrente', regla: 'Es del Administrador del Centro. A ti te notifican de inmediato y con evidencia; tú registras, no negocias.' },
        { situacion: 'La ficha del incobrable no está en el Drive', regla: 'Se pide al centro el mismo día. El Manual te asigna verificar que la información esté colocada, y sin ella el tramo siguiente no se puede ejecutar.' },
        { situacion: 'El centro te pide esperar antes de pasar la cuenta al cobro', regla: 'El tramo 46 a 61 no se negocia caso por caso. Si hay una razón real, la excepción la autoriza la Junta Directiva, no la reunión semanal.' },
      ],
      errores: [
        'Esperar a que el centro te avise que una cuenta cruzó el día 45: la lista se revisa, no se espera.',
        'Pasar la lista al cobro sin los datos completos del cliente que debían estar en el Drive.',
        'No anotar la fecha en que se pasó la lista: sin fecha no hay forma de probar que el tramo se cumplió.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Los cuatro tramos de la cobranza' },
      { t: 'p', texto: 'El protocolo de factura vencida del Manual tiene cuatro tramos. Los tres primeros los trabaja el centro; el cuarto es tuyo, y es la razón por la que este puesto existe dentro del ciclo del dinero.' },
      {
        t: 'tabla',
        encabezados: ['Tramo', 'Días', 'Quién', 'Qué se hace'],
        filas: [
          ['Emisión', 'Días 1 a 15', 'Asistente Administrativo', 'Avisa al acudiente por llamada o WhatsApp que su factura fue emitida y que debe estar paz y salvo'],
          ['Vencida 1 a 15 días', 'Día 16 al 30', 'Asistente Administrativo', 'Informa al Administrador la situación del acudiente, e informa al acudiente que no podrá asistir a clase hasta estar paz y salvo'],
          ['Vencida 15 a 30 días', 'Día 31 al 45', 'Asistente Administrativo', 'Sigue la cuenta sujeta al acuerdo de pago; si no fue efectivo, coloca los datos del cliente en el Drive de cuentas incobrables'],
          ['Vencida 30 a 45 días', 'Día 46 al 61', 'Coordinador Operativo', 'Pasa la lista al personal de cobro'],
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'Por qué el cuarto tramo es el que importa aquí', texto: 'El Asistente Administrativo llega hasta el día 45. Si nadie pasa la lista al personal de cobro en el tramo de 46 a 61, la cartera vieja se queda quieta y nadie vuelve a mirarla. Ese movimiento no lo cubre ningún otro puesto de la organización.' },

      { t: 'sub', texto: 'Verificar el Drive de incobrables' },
      { t: 'p', texto: 'En el tramo de 31 a 45 días, cuando el acuerdo de pago no fue efectivo, el Asistente coloca los datos del cliente en el Drive de cuentas incobrables. El Manual dice, literal, que **el Coordinador Operativo verificará en el drive de cuentas incobrable si dicha información está colocada**.' },
      { t: 'p', texto: 'Esa verificación no es burocracia: sin ficha cargada, la lista que pasas al personal de cobro no lleva con qué cobrar. Se pide el mismo día que se detecta la falta.' },

      { t: 'sub', texto: 'El arreglo de pago te llega de inmediato' },
      { t: 'p', texto: 'La decisión de llegar a un acuerdo de pago, o de retirar al niño del programa deteniendo la factura recurrente, es del **Administrador del Centro**. Lo que el Manual te asigna es enterarte: **si existe un arreglo de pago se debe dejar evidencia y notificar de inmediato al coordinador operativo.**' },
      { t: 'nota', tono: 'ojo', titulo: 'Registrar no es negociar', texto: 'Tú no renegocias el arreglo con el representante ni lo apruebas. Recibes la notificación con su evidencia, la registras y la cruzas después contra lo que efectivamente entró. Un arreglo sin evidencia es una conversación que nadie puede verificar.' },

      { t: 'sub', texto: 'Dónde se cruza con el resto del sistema' },
      {
        t: 'tabla',
        encabezados: ['Con qué', 'Cómo se cruza'],
        filas: [
          ['El informe de antigüedad de saldos', 'Es la lista de la que sales a trabajar cada semana: te dice qué cuenta está en qué tramo'],
          ['La meta de cobranza del marcador de resultado', 'Se calcula con la peor cifra de cobranza vencida declarada en todo el mes, no con la del último día'],
          ['La reunión semanal del centro', 'El punto 3 de la agenda: cuentas vencidas del mes y cuáles cruzaron el día 45'],
          ['El cuadro de negocio', 'El retiro por falta de pago aparece como deserción del mes; la cobranza y la deserción se leen juntas'],
        ],
      },

      { t: 'sub', texto: 'El tono con el cliente' },
      { t: 'p', texto: 'El Manual lo escribe para todo el protocolo: **todo contacto con cliente debe ser amigable, siempre buscando la forma de ayudar a que el cliente se ponga al día.** Pasar una cuenta al personal de cobro es un procedimiento con fecha, no un castigo: se ejecuta en su tramo y sin adjetivos.' },

      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Esperar a que el centro te avise que una cuenta cruzó el día 45. La lista se revisa; no se espera.',
          'Pasar la lista al cobro sin los datos que debían estar cargados en el Drive.',
          'No anotar la fecha en que se pasó la lista. Sin fecha no hay forma de probar que el tramo se cumplió.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'En el tramo de vencimiento de 46 a 61 días, ¿quién actúa y qué hace?',
        opciones: [
          'El Asistente Administrativo, que sigue llamando al acudiente',
          'El Coordinador Operativo, que pasa la lista al personal de cobro',
          'El Administrador del Centro, que decide el retiro',
          'La Junta Directiva, que aprueba el castigo de la cuenta',
        ],
        explicacion: 'El Asistente llega hasta el día 45. Si nadie pasa la lista, la cartera vieja se queda quieta.',
        repasa: ['coordinador-operativo', 'cuentas-por-cobrar'],
      },
      {
        pregunta: 'El Coordinador Operativo verifica en el Drive…',
        opciones: [
          'que la ficha de la cuenta incobrable esté colocada',
          'que la factura se haya emitido',
          'que el niño tenga su kit pedido',
          'que el contrato del Coach esté sellado',
        ],
        explicacion: 'Sin ficha cargada, la lista que se pasa al personal de cobro no lleva con qué cobrar.',
        repasa: ['cuenta-incobrable', 'drive'],
      },
      {
        pregunta: 'Cuando existe un arreglo de pago, el Manual exige…',
        opciones: [
          'que se apruebe en la reunión semanal',
          'que lo autorice la Junta Directiva',
          'que se registre al cierre de mes',
          'dejar evidencia y notificar de inmediato al Coordinador Operativo',
        ],
        explicacion: 'La decisión es del Administrador del Centro; la notificación inmediata con evidencia es lo que te toca a ti.',
        repasa: ['arreglo-de-pago', 'evidencia'],
      },
      {
        pregunta: '¿Quién decide llegar a un acuerdo de pago o retirar al niño deteniendo la factura recurrente?',
        opciones: [
          'El Coordinador Operativo',
          'El Asistente Administrativo',
          'El Administrador del Centro',
          'El personal de cobro',
        ],
        explicacion: 'Tú registras y cruzas después contra lo que entró. Registrar no es negociar.',
        repasa: ['administrador-de-centro'],
      },
      {
        pregunta: 'La cuenta pasa al Drive de incobrables en el tramo…',
        opciones: [
          'de emisión, días 1 a 15',
          'de vencimiento 1 a 15 días, o sea del día 16 al 30',
          'de vencimiento 15 a 30 días, o sea del día 31 al 45, si el acuerdo no fue efectivo',
          'de vencimiento 30 a 45 días, o sea del día 46 al 61',
        ],
        explicacion: 'La carga la hace el Asistente Administrativo y tú verificas que la información esté colocada.',
        repasa: ['cuentas-por-cobrar'],
      },
      {
        pregunta: 'La meta de cobranza del marcador de resultado se calcula con…',
        opciones: [
          'el valor del último día de la última semana del mes',
          'el promedio del trimestre',
          'la peor cifra de cobranza vencida declarada en todo el mes',
          'lo que marque el Administrador del Centro',
        ],
        explicacion: 'Leer solo el último día dejaba pasar meses que habían tocado cifras mucho peores.',
        repasa: ['factura-vencida'],
      },
      {
        pregunta: 'Un Administrador te pide esperar dos semanas antes de pasar una cuenta al cobro. Tú…',
        opciones: [
          'esperas: él conoce a la familia',
          'esperas si el representante firma un compromiso',
          'pasas la lista igual y no dices nada',
          'no negocias el tramo caso por caso; si hay razón real, la excepción la autoriza la Junta Directiva',
        ],
        explicacion: 'El tramo tiene fecha. Negociarlo centro por centro es como la cartera vieja deja de moverse.',
        repasa: ['representante'],
      },
      {
        pregunta: 'Según el Manual, todo contacto con el cliente debe ser…',
        opciones: [
          'amigable, buscando la forma de ayudar a que se ponga al día',
          'formal y por escrito únicamente',
          'a través del personal de cobro',
          'firmado por el Administrador del Centro',
        ],
        explicacion: 'Pasar una cuenta al personal de cobro es un procedimiento con fecha, no un castigo.',
        repasa: ['paz-y-salvo'],
      },
      {
        pregunta: 'Lo único que prueba que el tramo de 46 a 61 días se cumplió es…',
        opciones: [
          'el correo del Administrador del Centro',
          'la fecha anotada en que se pasó la lista al personal de cobro',
          'el informe de antigüedad de saldos del mes siguiente',
          'la ficha del Drive de incobrables',
        ],
        explicacion: 'Sin fecha no hay forma de demostrar que la cuenta se movió dentro de su tramo.',
        repasa: ['informe-de-antiguedad-de-saldos'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Clasificar la cartera de un centro por tramo',
        fuente: 'manual-operaciones-completo.md#L2175',
        proposito: 'Que ante el informe de antigüedad de saldos real de un centro clasifiques cada cuenta en su tramo, digas de quién es y ejecutes lo que te toca.',
        gradiente: 'Exige este módulo estudiado con el informe delante. Si confundes los tramos, el hueco está en la tabla de los cuatro tramos, no en la maniobra.',
        masa: [
          'El informe de antigüedad de saldos de un centro real.',
          'El Drive de cuentas incobrables de ese centro.',
        ],
        pasos: [
          'Ordena las cuentas por días de vencimiento y di cuántas hay en cada uno de los cuatro tramos.',
          'Para las de 31 a 45 días, verifica en el Drive que la ficha esté cargada y di cuáles faltan.',
          'Para las de 46 a 61 días, arma la lista que pasarías al personal de cobro.',
          'Di qué haces con una cuenta a la que le falta la ficha y ya cruzó el día 46.',
          'Anota la fecha del movimiento y di dónde queda esa anotación.',
        ],
        criterios: [
          'Clasifica cada cuenta en su tramo correcto y dice de qué puesto es cada tramo.',
          'Verifica ficha por ficha en el Drive y nombra las que faltan, sin darlas por cargadas.',
          'Arma la lista del tramo 46 a 61 con los datos completos del cliente, no solo con el nombre.',
          'Anota la fecha en que pasó la lista y explica por qué esa fecha es la única prueba del cumplimiento.',
        ],
        errorTipico: 'Trabajar solo las cuentas que el centro le mencionó en la reunión. La lista se revisa entera cada semana: las cuentas que nadie menciona son justamente las que llevan más tiempo sin moverse.',
      },
    ],
  },
  // ══════════════════════════════════════════════════════════════════════════
  // 21 · of-cop-8 — Fernando + la fórmula literal del cuadro de negocio
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'of-cop-8',
    curso: 'coordinacion',
    orden: 21,
    roles: ['coordinador'],
    titulo: 'Zoho ordenado: conciliar contra el cuadro de negocio y el KPI',
    duracionMin: 25,
    requiere: ['of-cop-7'],
    fuente: [
      'descripcion-del-puesto-fernando#zoho-y-cuadros-de-negocio',
      'manual-operaciones-completo.md#cuadro-de-negocio',
      'manual-operaciones-completo.md#veracidad-de-la-informacion',
    ],

    pfv: 'Los tres números del mes diciendo lo mismo en cada centro: Zoho, el cuadro de negocio y el KPI conciliados, y toda diferencia explicada por escrito en vez de forzada.',
    voz: 'Tres sistemas cuentan los mismos niños y el mismo dinero. <break time="0.4s"/> Zoho Books, el cuadro de negocio del centro y el KPI. <break time="0.5s"/> Cuando los tres dicen lo mismo, la Junta Directiva puede confiar en el número. <break time="0.4s"/> Cuando no, el número deja de ser verificable, y con él todo lo demás. <break time="0.5s"/> La fórmula del cuadro es de una línea. <break time="0.3s"/> Niños del mes anterior, más los nuevos del mes, menos las deserciones. <break time="0.4s"/> Y hay un cotejo que ahorra media auditoría. <break time="0.3s"/> Los niños nuevos del mes tienen que ser los mismos que los kits pedidos en el mes. <break time="0.5s"/> Y cuando no cuadra, se busca la diferencia. <break time="0.4s"/> Nunca se fuerza el número. <break time="0.3s"/> Forzarlo no es un atajo administrativo: el Manual lo llama falta grave.',

    masa: [
      'El cuadro de negocio del mes cerrado de un centro.',
      'El reporte de Zoho Books del mismo centro y del mismo mes.',
      'La pantalla de KPI del centro, con su resumen de niños del mes.',
      'El formato Kits a Pedir del mes.',
    ],

    palabras: [
      'zoho-books',
      'cuadro-de-negocio',
      'kpi',
      'conciliar',
      'cuadrar',
      'cotejo',
      'desercion',
      'kits-a-pedir',
      'resumen-de-ninos-mensual',
      'falta-grave',
      'veraz',
      'verificable',
    ],

    laminas: [
      {
        kicker: 'Los tres números',
        titulo: 'Zoho, el cuadro de negocio y el KPI',
        texto: 'Cuentan los mismos niños y el mismo dinero por tres caminos distintos. Cuando los tres coinciden, la Junta puede confiar en el número. Cuando no, ninguno es verificable.',
      },
      {
        kicker: 'La fórmula del cuadro',
        titulo: 'Una línea, y se cierra el mes',
        items: [
          'Niños del total del mes anterior.',
          'Más los niños nuevos del mes.',
          'Menos las deserciones del mes.',
          'Igual a los niños del Centro en el mes.',
        ],
      },
      {
        kicker: 'El cotejo que ahorra tiempo',
        titulo: 'Niños nuevos igual a kits pedidos',
        texto: 'Los niños nuevos del mes deben ser el mismo número que los kits solicitados durante el mes. Si no coinciden, uno de los dos está mal y ya sabes por dónde empezar.',
      },
      {
        titulo: 'Dónde suele estar la diferencia',
        items: [
          'Una factura emitida en un mes y cobrada en el siguiente.',
          'Un retiro registrado tarde o no registrado.',
          'Un niño contado en dos grupos a la vez.',
          'Un kit pedido sin inscripción, o al revés.',
        ],
      },
      {
        kicker: 'La regla dura',
        titulo: 'Cuando no cuadra, se busca la diferencia',
        texto: 'Nunca se fuerza el número. Los datos e informes deben ser veraces, precisos, completos y verificables: omitir, manipular o falsear es falta grave laboral, ética y legal.',
        cierre: 'Un número forzado no cierra el mes: lo convierte en un problema mayor.',
      },
    ],

    sop: {
      proceso: 'Conciliar Zoho, el cuadro de negocio y el KPI de un centro',
      cuando: 'La última semana de cada mes, cuando el centro cierra su cuadro de negocio.',
      producto: 'Los tres números del centro coincidiendo, o la diferencia localizada y explicada por escrito.',
      pasos: [
        'Toma el cuadro de negocio del mes cerrado y aplica la fórmula: mes anterior, más nuevos, menos deserciones.',
        'Compara ese resultado con el resumen de niños del mes que muestra el KPI.',
        'Compara los ingresos del mes en Zoho Books contra lo facturado que declara el cuadro.',
        'Haz el cotejo: los niños nuevos del mes contra los kits solicitados durante el mes.',
        'Si los tres coinciden, escríbelo y cierra el centro. Un mes conciliado también se documenta.',
        'Si hay diferencia, localiza la fila exacta antes de llamar a nadie: mes, concepto y monto.',
        'Revisa las causas frecuentes: factura de un mes cobrada en otro, retiro registrado tarde, niño en dos grupos, kit sin inscripción.',
        'Pide la corrección en el sistema donde está el error, no en el que se ve peor.',
        'Deja escrita la diferencia y su causa, aunque ya esté corregida: el mes que viene te ahorra la misma búsqueda.',
      ],
      decide: [
        { situacion: 'Los tres números no coinciden y el cierre urge', regla: 'Se cierra con la diferencia escrita y sin tocar el número. Un cierre con una nota de diferencia es auditable; un cierre cuadrado a la fuerza, no.' },
        { situacion: 'El centro propone ajustar el cuadro para que dé', regla: 'No se ajusta. El Manual lo llama falta grave de carácter laboral, ético y legal: se busca la diferencia y se reporta.' },
        { situacion: 'La diferencia viene de un mes ya cerrado', regla: 'No se reabre el mes por cuenta propia: se documenta y sube a la Junta Directiva, que decide si se corrige el histórico.' },
      ],
      errores: [
        'Cuadrar el cuadro cambiando el número de deserciones: es el ajuste más fácil y el más grave.',
        'Comparar totales sin bajar a la fila: un total que coincide puede tapar dos errores que se anulan.',
        'Cerrar el mes conciliado sin dejarlo escrito: el mes siguiente nadie sabe si se revisó.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Tres sistemas contando lo mismo' },
      { t: 'p', texto: 'Los mismos niños y el mismo dinero se cuentan por tres caminos distintos: **Zoho Books**, que registra la facturación y el cobro; el **cuadro de negocio** del centro, que arma la Asistente la última semana del mes; y el **KPI**, que calcula los indicadores desde los eventos del sistema.' },
      { t: 'p', texto: 'Cuando los tres dicen lo mismo, la Junta Directiva puede confiar en el número. Cuando no, ninguno de los tres es verificable, y con ellos se cae todo lo que se decide encima: primas, metas, niveles de centro.' },
      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva', texto: 'Que el sistema Zoho esté ordenado y que los cuadros de negocio concuerden con el KPI es práctica de la organización descrita por el dueño, no una función que el Manual le asigne por escrito al Coordinador Operativo. Hasta que la Junta la escriba, es política de la operación: se cumple, y no se usa como norma auditable contra un tercero.' },

      { t: 'sub', texto: 'La fórmula del cuadro de negocio' },
      { t: 'p', texto: 'Es de una línea y está en el Manual, literal: **niños que ya están (del total del mes anterior) + niños nuevos del mes − deserciones = niños del Centro en el mes.**' },
      { t: 'p', texto: 'Todo el trabajo de conciliación consiste en verificar los tres términos de esa resta contra otra fuente. El total del mes anterior contra el cuadro cerrado; los nuevos contra las inscripciones facturadas; las deserciones contra el cuadro de deserciones y los retiros registrados.' },

      { t: 'sub', texto: 'El cotejo que ahorra media auditoría' },
      { t: 'p', texto: 'El Manual exige un cotejo más, y es el más barato de todos: **los niños nuevos del mes deben ser el mismo número que los kits solicitados durante el mes.** Si no coinciden, uno de los dos está mal y ya sabes por dónde empezar a buscar.' },
      {
        t: 'tabla',
        encabezados: ['Si el cotejo falla', 'Qué suele ser'],
        filas: [
          ['Más niños nuevos que kits', 'Un niño inscrito sin pedir su kit, o un kit pedido en el mes siguiente'],
          ['Más kits que niños nuevos', 'Un kit de reserva contado como pedido, o una inscripción que no llegó a facturarse'],
          ['Coinciden pero el cuadro no cierra', 'La diferencia está en las deserciones, no en las altas'],
        ],
      },

      { t: 'sub', texto: 'Dónde suele estar la diferencia' },
      {
        t: 'tabla',
        encabezados: ['Síntoma', 'Causa frecuente', 'Dónde se corrige'],
        filas: [
          ['Zoho muestra más ingreso que el cuadro', 'Una factura emitida en un mes y cobrada en el siguiente', 'En ninguno: se explica el corte, no se ajusta'],
          ['El KPI cuenta menos niños que el cuadro', 'Un retiro registrado tarde, o un niño contado en dos grupos', 'En el registro del niño, no en el cuadro'],
          ['El cuadro cierra pero el cotejo de kits falla', 'Kit pedido sin inscripción, o inscripción sin kit', 'En el formato Kits a Pedir del centro'],
          ['Los totales coinciden y las filas no', 'Dos errores de signo contrario que se anulan', 'Fila por fila: el total que coincide es el más peligroso'],
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'La regla del arreglo', texto: 'La corrección se pide en el sistema donde está el error, no en el que se ve peor. Cambiar el cuadro porque Zoho es más difícil de tocar es exactamente cómo un error de registro se convierte en un dato falso.' },

      { t: 'sub', texto: 'Lo que no se hace nunca' },
      { t: 'nota', tono: 'alerta', titulo: 'Forzar el número es falta grave', texto: 'El Manual es explícito: los datos, informes de indicadores y reportes deben ser veraces, precisos, completos y verificables. Omitir, manipular o falsear cualquier información constituye una falta grave de carácter laboral, ético y legal. Cuando no cuadra, se busca la diferencia y se reporta.' },
      { t: 'p', texto: 'Un mes que cierra con una diferencia escrita es auditable. Un mes que cierra cuadrado a la fuerza no lo es, y el error no desaparece: se vuelve invisible y aparece más grande el trimestre siguiente.' },

      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Cuadrar el cuadro cambiando el número de deserciones. Es el ajuste más fácil de hacer y el más grave.',
          'Comparar totales sin bajar a la fila. Un total que coincide puede estar tapando dos errores que se anulan.',
          'Cerrar un mes conciliado sin dejarlo escrito: el mes siguiente nadie sabe si se revisó o no.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'La fórmula del cuadro de negocio es…',
        opciones: [
          'niños del mes anterior + nuevos del mes − deserciones = niños del Centro en el mes',
          'niños facturados + kits pedidos = niños del Centro',
          'niños del mes anterior + inscripciones − retiros − graduaciones = meta',
          'nuevos del mes ÷ deserciones = crecimiento',
        ],
        explicacion: 'Conciliar es verificar los tres términos de esa resta contra otra fuente.',
        repasa: ['cuadro-de-negocio'],
      },
      {
        pregunta: 'El cotejo obligatorio del Manual dice que los niños nuevos del mes deben ser iguales a…',
        opciones: [
          'las clases de prueba dadas',
          'los kits solicitados durante el mes',
          'los grupos abiertos en el mes',
          'las facturas emitidas en el mes',
        ],
        explicacion: 'Si no coinciden, uno de los dos está mal y ya sabes por dónde empezar a buscar.',
        repasa: ['kits-a-pedir', 'cotejo'],
      },
      {
        pregunta: 'Los tres números que tienen que decir lo mismo son…',
        opciones: [
          'la planilla, la nómina y la caja menuda',
          'el cuadro de negocio, el cuadro de deserciones y el de grupos',
          'Zoho Books, el cuadro de negocio del centro y el KPI',
          'la meta, el indicador y la prima',
        ],
        explicacion: 'Cuentan los mismos niños y el mismo dinero por tres caminos distintos.',
        repasa: ['zoho-books', 'kpi'],
      },
      {
        pregunta: 'Zoho muestra más ingreso que el cuadro de negocio del mes. La causa más frecuente es…',
        opciones: [
          'una factura emitida en un mes y cobrada en el siguiente',
          'un niño contado en dos grupos',
          'un kit pedido de más',
          'un error del KPI',
        ],
        explicacion: 'Eso no se ajusta en ningún sistema: se explica el corte del mes.',
        repasa: ['conciliar'],
      },
      {
        pregunta: 'El cuadro no cierra y el cierre urge. Lo correcto es…',
        opciones: [
          'ajustar el número de deserciones para que dé',
          'cerrar con la diferencia escrita y sin tocar el número',
          'dejar el mes abierto indefinidamente',
          'pedirle al Administrador del Centro que firme el cuadro igual',
        ],
        explicacion: 'Un cierre con una nota de diferencia es auditable; un cierre cuadrado a la fuerza no lo es.',
        repasa: ['cuadrar', 'verificable'],
      },
      {
        pregunta: 'Forzar un número para que el cuadro cierre es, según el Manual…',
        opciones: [
          'un ajuste contable normal',
          'responsabilidad del Asistente Administrativo',
          'una falta grave de carácter laboral, ético y legal',
          'aceptable si se documenta después',
        ],
        explicacion: 'Los datos deben ser veraces, precisos, completos y verificables. Cuando no cuadra, se busca la diferencia.',
        repasa: ['falta-grave', 'veraz'],
      },
      {
        pregunta: 'Los totales del mes coinciden pero las filas no. Eso…',
        opciones: [
          'se puede dar por cerrado: lo que importa es el total',
          'es lo más peligroso: dos errores de signo contrario que se anulan',
          'lo resuelve el KPI solo en el cierre siguiente',
          'indica que Zoho está mal configurado',
        ],
        explicacion: 'Comparar totales sin bajar a la fila deja pasar exactamente esto.',
        repasa: ['conciliar'],
      },
      {
        pregunta: 'La corrección de una diferencia se pide…',
        opciones: [
          'en el sistema donde está el error, no en el que sea más fácil de tocar',
          'siempre en el cuadro de negocio, que lo lleva el centro',
          'siempre en Zoho, que es la fuente contable',
          'en el KPI, que es lo que ve la Junta Directiva',
        ],
        explicacion: 'Cambiar el cuadro porque Zoho es más difícil de tocar es cómo un error de registro se vuelve un dato falso.',
        repasa: ['zoho-books'],
      },
      {
        pregunta: 'Un mes que concilió sin diferencias…',
        opciones: [
          'no hace falta documentarlo: no hay nada que reportar',
          'se documenta igual, para que el mes siguiente se sepa que se revisó',
          'se documenta solo si la Junta Directiva lo pide',
          'se marca en la lista de actividades del centro',
        ],
        explicacion: 'Cerrar conciliado sin dejarlo escrito deja al mes siguiente sin saber si se revisó o no.',
        repasa: ['resumen-de-ninos-mensual'],
      },
      {
        pregunta: 'La diferencia viene de un mes ya cerrado. Tú…',
        opciones: [
          'lo reabres y corriges el histórico',
          'lo ignoras: el mes está cerrado',
          'lo corriges solo en el KPI',
          'lo documentas y lo subes a la Junta Directiva, que decide si se corrige el histórico',
        ],
        explicacion: 'Reabrir un mes cerrado por cuenta propia cambia números que otros ya usaron para decidir.',
        repasa: ['kpi'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Conciliar un centro y localizar la fila',
        fuente: 'descripcion-del-puesto-fernando#zoho-y-cuadros-de-negocio',
        proposito: 'Que concilies los tres números de un centro real, y cuando no cuadren, localices la fila exacta de la diferencia antes de llamar a nadie.',
        gradiente: 'Exige of-cop-2 y of-cop-3 estudiados: hay que saber leer el marcador de resultado y tratar una contradicción sin acusar. Sin eso, la conciliación termina en discusión.',
        masa: [
          'El cuadro de negocio del mes cerrado de un centro real.',
          'El reporte de Zoho Books del mismo mes.',
          'La pantalla de KPI del centro y el formato Kits a Pedir.',
        ],
        pasos: [
          'Aplica la fórmula del cuadro en voz alta, con los cuatro números del mes.',
          'Compara ese resultado contra el resumen de niños del KPI y di la diferencia, si la hay.',
          'Haz el cotejo de niños nuevos contra kits solicitados y di el resultado.',
          'Si algo no cuadra, localiza la fila exacta: mes, concepto y monto, señalándola en pantalla.',
          'Redacta la petición de corrección diciendo en qué sistema está el error.',
        ],
        criterios: [
          'Aplica la fórmula del cuadro con los cuatro números correctos y sin invertir el signo de las deserciones.',
          'Localiza la fila exacta de la diferencia antes de llamar al centro, con mes, concepto y monto.',
          'Dice en qué sistema está el error y pide la corrección ahí, no en el que sea más fácil de tocar.',
          'No propone en ningún momento ajustar un número para que el cuadro cierre.',
        ],
        errorTipico: 'Comparar solo los totales, verlos iguales y dar el centro por conciliado. Dos errores de signo contrario se anulan en el total y siguen vivos en las filas, listos para aparecer más grandes en el trimestre.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 22 · of-cop-9 — Fernando + el motor de progreso que ya existe
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'of-cop-9',
    curso: 'coordinacion',
    orden: 22,
    roles: ['coordinador'],
    titulo: 'Que cada centro esté entrenado',
    duracionMin: 18,
    requiere: ['of-cop-8'],
    fuente: [
      'descripcion-del-puesto-fernando#cada-centro-entrenado',
      'lib/entrenamiento/oficio/progreso.js#avanceDrills',
      'app/dashboard/entrenamiento/oficio',
    ],

    pfv: 'Cada puesto de cada centro con su entrenamiento tomado y firmado: el porcentaje de la red contado con firmas y no con lecturas, y la cola de firmas sin nadie esperando.',
    voz: 'Estudiado no es lo mismo que tener el puesto tomado. <break time="0.5s"/> Estudiado lo declara la persona: leyó el módulo y aprobó el cuestionario. <break time="0.4s"/> Tener el puesto tomado lo firma su jefe entrenador, después de tomarle la maniobra. <break time="0.5s"/> Por eso hay dos porcentajes en la pantalla y no dan lo mismo. <break time="0.4s"/> El de lecturas sube solo. El de firmas necesita que alguien se siente al lado. <break time="0.5s"/> Cuando te pregunten si un centro está entrenado, el dato es el segundo. <break time="0.4s"/> Y tomar una maniobra no es preguntar si entendió. <break time="0.3s"/> Es ponerla a hacerlo, con el formato real en la mano y el sistema real en pantalla. <break time="0.4s"/> Si contesta bien y no lo hace, no está aprobada.',

    masa: [
      'La pantalla de entrenamiento de oficio con los planes de la red.',
      'La cola de firmas pendientes, por centro.',
      'El plan de puesto de una administradora que esté a mitad de camino.',
    ],

    palabras: [
      'hat',
      'drill',
      'oficial-de-entrenamiento',
      'checksheet',
      'masa',
      'gradiente',
      'coordinador-operativo',
      'administrador-de-centro',
      'asistente-administrativo',
      'evaluacion-de-desempeno',
      'evidencia',
    ],

    laminas: [
      {
        kicker: 'La distinción que manda',
        titulo: 'Estudiado no es tener el puesto tomado',
        items: [
          'Estudiado: la persona leyó el módulo y aprobó el cuestionario.',
          'Puesto tomado: su jefe entrenador le firmó la maniobra.',
          'El primero sube solo. El segundo exige que alguien se siente al lado.',
        ],
      },
      {
        titulo: 'Los dos porcentajes de la pantalla',
        texto: 'Uno cuenta lecturas y otro cuenta firmas. Cuando te preguntan si un centro está entrenado, el dato es el de firmas. El otro solo dice quién abrió la página.',
      },
      {
        kicker: 'Cómo se toma una maniobra',
        titulo: 'Se pone a hacerlo, no a explicarlo',
        items: [
          'Con el formato real en la mano y el sistema real en pantalla.',
          'Se mide contra los criterios escritos del módulo, uno por uno.',
          'Si contesta bien y no lo hace, no está aprobada.',
          'Si falla, se vuelve al estudio; no se repite la maniobra sin más.',
        ],
      },
      {
        kicker: 'La firma',
        titulo: 'Regalar una firma es peor que no firmar',
        texto: 'Una firma regalada deja a la persona con el puesto marcado como tomado y sin saber hacerlo. El día que falle, nadie va a saber que el hueco venía de ahí.',
        cierre: 'La cola de firmas con gente esperando también es un dato del centro.',
      },
    ],

    sop: {
      proceso: 'Revisar el entrenamiento de un centro y tomar una maniobra',
      cuando: 'Una vez al mes por centro, y cada vez que entre alguien nuevo a un puesto.',
      producto: 'El centro con su porcentaje de puestos tomados actualizado, contado con firmas, y la cola de firmas sin nadie esperando.',
      pasos: [
        'Abre el plan de puesto de cada persona del centro y mira el avance de firmas, no el de lecturas.',
        'Anota quién está estudiado y esperando firma: esa espera es del jefe entrenador, no de la persona.',
        'Anota quién lleva semanas sin avanzar y en qué módulo se detuvo.',
        'Elige una maniobra ya estudiada y prepárala: ten a la vista lo que el módulo pide.',
        'Toma la maniobra poniendo a la persona a hacerlo, con el formato real y el sistema real.',
        'Mide contra los criterios escritos del módulo, uno por uno, sin agregar ni quitar ninguno.',
        'Si cumple todos, firma. Si falla uno, no firmes: devuelve al estudio del bloque que corresponde.',
        'Deja escrito qué criterio falló, para que la próxima vez se retome ahí.',
        'Cierra con el porcentaje de puestos tomados del centro y llévalo a la reunión semanal.',
      ],
      decide: [
        { situacion: 'La persona contesta bien pero no ejecuta', regla: 'No se firma. El entrenamiento no se aprueba respondiendo un cuestionario: se aprueba haciéndolo, con el formato real en la mano.' },
        { situacion: 'Un centro lleva semanas con firmas pendientes', regla: 'La demora es del jefe entrenador, no del alumno. Se lleva a la reunión semanal del centro con nombres y fechas.' },
        { situacion: 'Alguien pide que le firmes un módulo que no estudió', regla: 'No se firma fuera de orden. El orden del plan existe para que cada módulo se apoye en el anterior; saltarlo deja huecos que aparecen meses después.' },
      ],
      errores: [
        'Contar el entrenamiento de la red con el porcentaje de lecturas: mide quién abrió la página, no quién sabe hacerlo.',
        'Regalar una firma para desatascar la cola: deja a la persona marcada como lista y sin saber hacerlo.',
        'Tomar la maniobra preguntando si entendió, en vez de poner a la persona a ejecutarla.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Estudiado no es tener el puesto tomado' },
      { t: 'p', texto: 'Son dos cosas distintas y el sistema las guarda por separado. **Estudiado** lo declara la persona: leyó el módulo con lo que tenía que tener delante y aprobó el cuestionario. **Tener el puesto tomado** lo firma su jefe entrenador, después de tomarle la maniobra.' },
      { t: 'p', texto: 'La diferencia importa porque el primero sube solo y el segundo no. Una persona puede estudiar un plan entero un fin de semana; que alguien se siente al lado a verla ejecutar cada maniobra es otro trabajo, y es el que se atasca.' },
      { t: 'nota', tono: 'regla', titulo: 'El dato que se reporta', texto: 'Cuando te preguntan si un centro está entrenado, el número es el de **firmas**, no el de lecturas. El de lecturas dice quién abrió la página.' },

      { t: 'sub', texto: 'Cómo se lee el avance de un centro' },
      {
        t: 'tabla',
        encabezados: ['Lo que ves', 'Qué significa', 'De quién es el siguiente paso'],
        filas: [
          ['Sin empezar', 'La persona no ha abierto su plan', 'De ella, y de quien le dijo que existía'],
          ['Estudiando', 'Va avanzando módulo a módulo', 'De ella'],
          ['Estudiado y esperando firma', 'Hizo su parte y nadie le ha tomado la maniobra', 'Del jefe entrenador: la demora no es de la persona'],
          ['Puesto tomado', 'Estudiado y firmado', 'De nadie: ese módulo está cerrado'],
        ],
      },
      { t: 'p', texto: 'La fila que hay que mirar primero es la tercera. Una cola de firmas larga no dice que la gente no estudie: dice que quien firma no se está sentando.' },

      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva', texto: 'Que cada centro esté entrenado es la práctica que el dueño describió, no una función que el Manual le asigne por escrito a este puesto: no hay ni una de sus diez menciones sobre entrenamiento, y no existe meta ni porcentaje de cobertura fijado en ninguna parte. Hasta que la Junta Directiva lo escriba, esto es política de la operación y no norma auditable. Lo que sí es del Manual es quién evalúa a quién dentro del centro.' },

      { t: 'sub', texto: 'Cómo se toma una maniobra sin regalar la firma' },
      { t: 'p', texto: 'Una maniobra no se toma preguntando si entendió. Se toma **poniendo a la persona a hacerlo**, con el formato real en la mano y el sistema real en pantalla, y midiendo contra los criterios escritos del módulo.' },
      {
        t: 'pasos',
        items: [
          'Prepara lo que el módulo pide tener delante. Sin eso, la maniobra no se puede tomar.',
          'Explica el propósito de la maniobra y no lo que quieres oír.',
          'Ponla a ejecutar los pasos del módulo, en orden.',
          'Ve marcando los criterios escritos, uno por uno, sin agregar ni quitar ninguno.',
          'Si cumple todos, firma. Si falla uno, no firmes.',
          'Cuando falla, devuelve al estudio del bloque que corresponde, no a repetir la maniobra.',
          'Deja escrito qué criterio falló, para retomar ahí la próxima vez.',
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'Regalar una firma es peor que no firmar', texto: 'Una firma regalada deja a la persona marcada como lista y sin saber hacer el trabajo. El día que falle, nadie va a saber que el hueco venía de ahí, y se va a buscar la causa en el sitio equivocado. Si la cola te presiona, se firma más despacio, no más rápido.' },

      { t: 'sub', texto: 'Por qué el orden del plan no se salta' },
      { t: 'p', texto: 'Cada módulo exige el anterior. No es burocracia: es que el segundo se apoya en lo que el primero dejó puesto. Firmar fuera de orden deja huecos que no se ven en el momento y aparecen meses después, en forma de un error que nadie se explica.' },

      { t: 'sub', texto: 'Lo que este puesto NO hace aquí' },
      {
        t: 'tabla',
        encabezados: ['Decisión', 'De quién es', 'Qué haces tú'],
        filas: [
          ['Evaluar el desempeño de un colaborador', 'Administrador del Centro, con su formato', 'Le pasas el dato del entrenamiento; él evalúa'],
          ['Firmar la maniobra de una asistente en su centro', 'Su Administradora, que es su jefe entrenador', 'Firmas cuando el centro no tiene quién, y lo dices'],
          ['Cambiar el contenido de un módulo', 'De quien mantiene el entrenamiento', 'Reportas el error con el módulo y el bloque exactos'],
          ['Decidir que un puesto no necesita entrenarse', 'Junta Directiva', 'Lo subes con el caso escrito'],
        ],
      },

      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Reportar el entrenamiento de la red con el porcentaje de lecturas.',
          'Regalar una firma para desatascar la cola.',
          'Tomar la maniobra preguntando si entendió, en vez de ponerla a ejecutar.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'La diferencia entre estudiado y tener el puesto tomado es que…',
        opciones: [
          'estudiado lo declara la persona; el puesto tomado lo firma su jefe entrenador tras tomarle la maniobra',
          'estudiado es el cuestionario y el puesto tomado es el promedio de los cuestionarios',
          'son lo mismo con dos nombres',
          'el puesto tomado lo declara la persona al terminar el plan',
        ],
        explicacion: 'El primero sube solo; el segundo exige que alguien se siente al lado a ver ejecutar.',
        repasa: ['hat', 'oficial-de-entrenamiento'],
      },
      {
        pregunta: 'Cuando te preguntan si un centro está entrenado, el número que se reporta es…',
        opciones: [
          'el de lecturas, porque es el que más sube',
          'el promedio de los dos',
          'el de firmas',
          'el de cuestionarios aprobados',
        ],
        explicacion: 'El de lecturas dice quién abrió la página, no quién sabe hacer el trabajo.',
        repasa: ['coordinador-operativo'],
      },
      {
        pregunta: 'Una cola de firmas larga en un centro significa, casi siempre, que…',
        opciones: [
          'la gente no está estudiando',
          'el contenido está mal escrito',
          'quien firma no se está sentando a tomar las maniobras',
          'el plan es demasiado largo',
        ],
        explicacion: 'Estudiado y esperando firma es la fila que hay que mirar primero: esa demora no es de la persona.',
        repasa: ['drill'],
      },
      {
        pregunta: 'Una maniobra se toma…',
        opciones: [
          'preguntando si entendió el módulo',
          'poniendo a la persona a hacerlo, con el formato real y el sistema real',
          'con un cuestionario de repaso',
          'revisando lo que anotó mientras estudiaba',
        ],
        explicacion: 'Si contesta bien y no lo hace, la maniobra no está aprobada.',
        repasa: ['drill', 'masa'],
      },
      {
        pregunta: 'La persona cumple cuatro criterios de cinco. Tú…',
        opciones: [
          'firmas: cuatro de cinco es aprobar',
          'firmas y anotas el criterio pendiente',
          'no firmas, y la devuelves al estudio del bloque que corresponde',
          'repites la maniobra hasta que salga',
        ],
        explicacion: 'Cuando falla un criterio, el hueco está en el estudio. Repetir la maniobra sin volver al bloque solo entrena a pasar la maniobra.',
        repasa: ['checksheet'],
      },
      {
        pregunta: 'Regalar una firma para desatascar la cola…',
        opciones: [
          'es aceptable si la persona va bien en todo lo demás',
          'deja a la persona marcada como lista y sin saber hacer el trabajo',
          'lo autoriza el Administrador del Centro',
          'no tiene consecuencias: el módulo se puede repetir',
        ],
        explicacion: 'El día que falle, se va a buscar la causa en el sitio equivocado. Si la cola presiona, se firma más despacio.',
        repasa: ['evidencia'],
      },
      {
        pregunta: 'El orden del plan no se salta porque…',
        opciones: [
          'lo prohíbe el Manual de Operaciones',
          'cada módulo se apoya en lo que el anterior dejó puesto',
          'el sistema no permite abrirlos fuera de orden',
          'la Junta Directiva revisa el orden cada trimestre',
        ],
        explicacion: 'Firmar fuera de orden deja huecos que aparecen meses después, en forma de un error que nadie se explica.',
        repasa: ['gradiente'],
      },
      {
        pregunta: 'La evaluación de desempeño del colaborador la hace…',
        opciones: [
          'el Coordinador Operativo, con el dato del entrenamiento',
          'el Administrador del Centro, con su formato',
          'la Junta Directiva',
          'el propio colaborador',
        ],
        explicacion: 'Tú le pasas el dato del entrenamiento; él evalúa. Son dos cosas distintas y no se mezclan.',
        repasa: ['evaluacion-de-desempeno', 'administrador-de-centro'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Tomar una maniobra sin regalar la firma',
        fuente: 'lib/entrenamiento/oficio/progreso.js#avanceDrills',
        proposito: 'Que le tomes una maniobra real a una persona de un centro, midiendo contra los criterios escritos, y decidas firmar o devolver al estudio con el criterio que falló escrito.',
        gradiente: 'Exige este módulo estudiado y al menos un plan de puesto abierto en pantalla. Si no distingues el avance de lecturas del de firmas, el hueco está en el primer bloque.',
        masa: [
          'El plan de puesto de una persona real que tenga una maniobra pendiente.',
          'Lo que ese módulo pide tener delante, preparado antes de empezar.',
          'La cola de firmas del centro.',
        ],
        pasos: [
          'Abre el plan y di el avance de firmas del centro, no el de lecturas.',
          'Elige una maniobra ya estudiada y prepara lo que el módulo pide tener a la vista.',
          'Toma la maniobra poniendo a la persona a ejecutar los pasos, en orden.',
          'Ve marcando los criterios escritos uno por uno, en voz alta.',
          'Decide: firma, o devuelve al estudio nombrando el bloque y el criterio que falló.',
        ],
        criterios: [
          'Dice el avance de firmas del centro y explica por qué no reporta el de lecturas.',
          'Prepara antes de empezar todo lo que el módulo pide tener a la vista, sin improvisarlo.',
          'Marca los criterios escritos del módulo uno por uno, sin agregar ni quitar ninguno.',
          'Ante un criterio fallado, no firma y nombra el bloque exacto al que devuelve el estudio.',
        ],
        errorTipico: 'Preguntarle a la persona si entendió el módulo y firmar cuando dice que sí. Eso convierte la firma en una encuesta de confianza y deja al centro con puestos marcados como tomados que nadie ha visto ejecutar.',
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // 23 · of-cop-10 — Manual literal solo en el correo a la Junta (L554)
  // ══════════════════════════════════════════════════════════════════════════
  {
    id: 'of-cop-10',
    curso: 'coordinacion',
    orden: 23,
    roles: ['coordinador'],
    titulo: 'Reglamento legal de las empresas y el reporte a la Junta',
    duracionMin: 18,
    requiere: ['of-cop-9'],
    fuente: [
      'manual-operaciones-completo.md#L554',
      'descripcion-del-puesto-fernando#reglamento-legal-y-corporativo',
      'manual-operaciones-completo.md#constancias-y-ubicacion-excepcional',
    ],

    pfv: 'La Junta Directiva con el estado real de la red cada mes, en un formato que no cambia; y cada empresa del grupo con sus obligaciones laborales al día y verificables.',
    voz: 'Tu puesto es un medio de comunicación. <break time="0.4s"/> Hacia abajo, para que el Manual se cumpla en cada centro. <break time="0.3s"/> Hacia arriba, para que la Junta Directiva sepa qué está pasando de verdad. <break time="0.5s"/> El reporte mensual no es un resumen bonito. <break time="0.4s"/> Es el estado de la red en un formato que no cambia de un mes a otro. <break time="0.3s"/> Porque lo que cambia de formato no se puede comparar. <break time="0.5s"/> Y arriba de todo va lo que nadie más ve. <break time="0.4s"/> El centro que decrece con la lista de actividades casi llena. <break time="0.5s"/> Después la línea corporativa. <break time="0.3s"/> El Corporativo emite las constancias y aprueba los ingresos fuera del rango de edad. <break time="0.4s"/> Ningún centro está autorizado a decidir eso, ni tú tampoco.',

    masa: [
      'El reporte del mes anterior, para comparar el formato.',
      'El semáforo de todos los centros del mes cerrado.',
      'La lista de contratos, permisos y cartera vieja del mes.',
    ],

    palabras: [
      'junta-directiva',
      'corporativo-aloha',
      'franquicia',
      'coordinador-operativo',
      'constancia-escolar',
      'ubicacion-excepcional',
      'ministerio-de-trabajo',
      'caja-de-seguro-social',
      'kpi',
      'veraz',
      'verificable',
      'falta-grave',
    ],

    laminas: [
      {
        kicker: 'Qué es este puesto',
        titulo: 'Un medio de comunicación en las dos direcciones',
        texto: 'Hacia abajo, para que el Manual se cumpla en cada centro. Hacia arriba, para que la Junta Directiva sepa qué está pasando de verdad, y no solo lo que cada centro reporta de sí mismo.',
      },
      {
        titulo: 'El reporte mensual, en un formato que no cambia',
        items: [
          'Lo que cambia de formato de un mes a otro no se puede comparar.',
          'Semáforo de cada centro: color, meta fallada y verdicto.',
          'Contratos, permisos y cartera vieja del mes.',
          'Puestos tomados por centro, contados con firmas.',
        ],
      },
      {
        kicker: 'Lo que va arriba de todo',
        titulo: 'El centro que decrece y nadie está mirando',
        texto: 'Los rojos ya tienen dueño y todo el mundo los ve. Lo que la Junta no puede ver sin ti es el centro con la lista de actividades casi llena y el resultado cayendo.',
      },
      {
        kicker: 'La línea corporativa',
        titulo: 'Dos cosas que no decide ningún centro',
        items: [
          'Las constancias escolares las emite el Corporativo ALOHA.',
          'El ingreso fuera del rango de edad lo aprueba el Corporativo.',
          'Ningún centro, administrador o coach está autorizado.',
          'Tú tampoco: canalizas, no autorizas.',
        ],
      },
      {
        kicker: 'Lo que el Manual no escribió',
        titulo: 'La asimetría, dicha en voz alta',
        texto: 'El Manual le da a este puesto diez actos de trámite y ni una sección propia. El resto es la práctica que el dueño describió. Las dos cosas son verdad, y no pesan igual ante un auditor.',
        cierre: 'Este entrenamiento es el borrador de la sección que al Manual le falta.',
      },
    ],

    sop: {
      proceso: 'Armar y elevar el reporte mensual a la Junta Directiva',
      cuando: 'Al cierre de cada mes, cuando todos los centros han cerrado su cuadro de negocio.',
      producto: 'El estado real de la red en manos de la Junta Directiva, en el mismo formato del mes anterior y con las excepciones nombradas.',
      pasos: [
        'Abre el reporte del mes anterior y usa su mismo formato: lo que cambia de forma no se puede comparar.',
        'Arranca por lo que la Junta no puede ver sin ti: el centro que decrece con su lista de actividades casi llena.',
        'Pon el semáforo de cada centro con las tres piezas: color, meta fallada y verdicto de crecimiento.',
        'Agrega el estado de contratos: vencimientos del trimestre, renovaciones tramitadas y no renovaciones.',
        'Agrega los permisos del mes: cuántos llegaron el mismo día y cuántos llegaron tarde, por centro.',
        'Agrega la cartera vieja: cuentas pasadas al personal de cobro dentro del tramo 46 al 61.',
        'Agrega los puestos tomados por centro, contados con firmas y no con lecturas.',
        'Cierra con las discrepancias abiertas entre la marca guardada y el cálculo, y por qué siguen abiertas.',
        'Envía el reporte por correo electrónico, que es la vía que el Manual usa para lo que sube a la Junta.',
      ],
      decide: [
        { situacion: 'Emitir una constancia escolar o certificación académica', regla: 'La emite exclusivamente el Corporativo ALOHA. Ningún centro, administrador o coach está autorizado, y el Coordinador Operativo tampoco: canaliza la solicitud.' },
        { situacion: 'Aprobar el ingreso de un niño fuera del rango de edad oficial', regla: 'Lo aprueba el Corporativo ALOHA con informe técnico firmado. Los centros no están autorizados a decidirlo de forma unilateral o discrecional.' },
        { situacion: 'Un centro te pide que suavices un dato para el reporte', regla: 'No se suaviza. Los datos deben ser veraces, precisos, completos y verificables; omitir o manipular es falta grave laboral, ética y legal.' },
      ],
      errores: [
        'Cambiar el formato del reporte de un mes a otro: nadie puede comparar dos meses con dos formas distintas.',
        'Abrir el reporte con los centros en rojo: esos ya se ven solos, y entierran lo que solo tú viste.',
        'Reportar el entrenamiento de la red con el porcentaje de lecturas en vez del de firmas.',
      ],
    },

    bloques: [
      { t: 'sub', texto: 'Qué es este puesto, dicho en una línea' },
      { t: 'p', texto: 'Es **un medio de comunicación en las dos direcciones**. Hacia abajo, para que el Manual se cumpla en cada centro. Hacia arriba, para que la Junta Directiva sepa qué está pasando de verdad, y no solo lo que cada centro reporta de sí mismo.' },
      { t: 'p', texto: 'Todo lo que hiciste en los nueve módulos anteriores termina aquí: el contrato tramitado, el permiso archivado, la cartera movida, los números conciliados y los puestos tomados se convierten, una vez al mes, en una sola cosa que la Junta puede leer.' },

      { t: 'sub', texto: 'El reporte mensual' },
      { t: 'p', texto: 'La primera regla del reporte no es sobre el contenido: **el formato no cambia de un mes a otro.** Lo que cambia de forma no se puede comparar, y un reporte que no se puede comparar con el mes anterior sirve para enterarse, no para decidir.' },
      {
        t: 'tabla',
        encabezados: ['Bloque del reporte', 'Qué lleva', 'De dónde sale'],
        filas: [
          ['Lo que solo tú viste', 'El centro que decrece con su lista de actividades casi llena', 'El barrido de la red del mes cerrado'],
          ['Semáforo por centro', 'Color, meta fallada y verdicto de crecimiento', 'El marcador de resultado de cada centro'],
          ['Contratos', 'Vencimientos del trimestre, renovaciones tramitadas y no renovaciones', 'Tu lista de vencimientos'],
          ['Permisos', 'Cuántos llegaron el mismo día y cuántos llegaron tarde, por centro', 'Tu archivo de permisos de la red'],
          ['Cartera vieja', 'Cuentas pasadas al personal de cobro dentro del tramo 46 al 61', 'El informe de antigüedad de saldos'],
          ['Puestos tomados', 'Porcentaje por centro, contado con firmas', 'Los planes de puesto de la red'],
          ['Discrepancias abiertas', 'Cuáles siguen abiertas y por qué', 'El barrido de contradicciones'],
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'El orden del reporte no es decorativo', texto: 'Arriba va lo que la Junta no puede ver sin ti. Los centros en rojo se ven solos y ya tienen dueño; si abres con ellos, entierras el único hallazgo que nadie más de la organización podía traer.' },

      { t: 'sub', texto: 'La vía: correo a la Junta Directiva' },
      { t: 'p', texto: 'El Manual solo describe una vía de este puesto hacia arriba, y es literal: **el Coordinador Operativo deberá realizar la solicitud a la Junta Directiva por medio de correo electrónico.** Está escrito para el permiso, pero es la única vía documentada, y por eso el reporte usa la misma: correo, con el documento adjunto y el mismo asunto todos los meses.' },

      { t: 'sub', texto: 'La línea corporativa' },
      { t: 'p', texto: 'El Corporativo ALOHA es el dueño de la marca y, dentro del Manual, aparece con dos facultades exclusivas. Las dos son decisiones que ningún centro puede tomar, y tú tampoco: tu papel es canalizarlas, no autorizarlas.' },
      {
        t: 'tabla',
        encabezados: ['Qué', 'Quién decide', 'Plazo y forma'],
        filas: [
          ['Constancia escolar o certificación académica', 'Exclusivamente el Corporativo ALOHA. Ningún centro, administrador o coach está autorizado', 'El centro recibe la solicitud en 1 día hábil y la envía al corporativo dentro de las 24 horas posteriores; el corporativo emite en máximo 3 días hábiles'],
          ['Ingreso de un niño fuera del rango de edad oficial', 'Corporativo ALOHA, con informe técnico firmado por evaluador y Administrador', 'Los centros no están autorizados a decidirlo de forma unilateral o discrecional'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'Faltas graves listadas en el Manual', texto: 'Emitir constancias sin autorización corporativa; tramitar inscripciones en itinerarios no autorizados; presentar informes falsificados o alterados; alterar datos del estudiante o fechas de ingreso; modificar, replicar o firmar formatos oficiales sin consentimiento. Todas son causal de despido inmediato, y todas pasan por documentos que este puesto ve.' },

      { t: 'sub', texto: 'Las obligaciones legales que tu trámite sostiene' },
      { t: 'p', texto: 'El cumplimiento laboral de las empresas del grupo no es un tema aparte: es la suma de lo que ya tramitas. Cada contrato sellado por el **Ministerio de Trabajo**, cada colaborador inscrito en la **Caja de Seguro Social**, cada permiso archivado con su firma y cada file completo en su centro. Si eso está al día, la parte que te toca del reglamento está al día.' },
      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva', texto: 'El reporte mensual, la conciliación de los tres números y la vigilancia de que las empresas cumplan su reglamento legal son la práctica que el dueño describió, no funciones que el Manual le asigne por escrito a este puesto. El Manual le da diez actos de trámite y ni una sección propia: no tiene objetivo de posición, ni perfil, ni competencias, ni indicadores, ni prima, mientras que el Administrador, el Asistente y el Coach sí las tienen. Las dos cosas son verdad, y no pesan igual delante de un auditor.' },

      { t: 'sub', texto: 'Lo que hay que decir en voz alta' },
      { t: 'p', texto: 'Este entrenamiento describe el puesto con más detalle que la norma que lo respalda. Eso no se disimula: se dice, y se convierte en una petición concreta. **El Manual necesita una sección propia de Coordinador Operativo**, y estos diez módulos son el borrador de esa sección. Mientras no exista, todo lo que no esté en las diez menciones es política de la operación, no norma auditable.' },

      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Cambiar el formato del reporte de un mes a otro.',
          'Abrir con los centros en rojo y enterrar lo que solo tú viste.',
          'Suavizar un dato para que un centro quede mejor. Eso es falta grave, y es la que este puesto tiene menos excusa para cometer.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'La primera regla del reporte mensual a la Junta Directiva es…',
        opciones: [
          'que sea breve',
          'que el formato no cambie de un mes a otro',
          'que lo firme cada Administrador del Centro',
          'que se entregue impreso',
        ],
        explicacion: 'Lo que cambia de forma no se puede comparar, y un reporte que no se compara sirve para enterarse, no para decidir.',
        repasa: ['junta-directiva'],
      },
      {
        pregunta: 'El reporte abre con…',
        opciones: [
          'los centros en rojo, que son los más urgentes',
          'el resumen de contratos del trimestre',
          'lo que la Junta no puede ver sin ti: el centro que decrece con su lista de actividades casi llena',
          'el ranking de centros por matrícula',
        ],
        explicacion: 'Los rojos se ven solos y ya tienen dueño. Abrir con ellos entierra el único hallazgo que nadie más podía traer.',
        repasa: ['kpi'],
      },
      {
        pregunta: 'La vía documentada de este puesto hacia la Junta Directiva es…',
        opciones: [
          'el correo electrónico',
          'la reunión presencial mensual',
          'el formato impreso entregado en el centro',
          'el sistema de KPI',
        ],
        explicacion: 'Es la única vía que el Manual describe, escrita para el permiso, y por eso el reporte usa la misma.',
        repasa: ['coordinador-operativo'],
      },
      {
        pregunta: 'Un representante pide una constancia escolar. Quien la emite es…',
        opciones: [
          'el Administrador del Centro',
          'el Coordinador Operativo',
          'el Asistente Administrativo con la firma del Administrador',
          'exclusivamente el Corporativo ALOHA',
        ],
        explicacion: 'Ningún centro, administrador o coach está autorizado, y este puesto tampoco: canaliza, no autoriza.',
        repasa: ['constancia-escolar', 'corporativo-aloha'],
      },
      {
        pregunta: 'El ingreso de un niño fuera del rango de edad oficial lo aprueba…',
        opciones: [
          'el Corporativo ALOHA, con informe técnico firmado por evaluador y Administrador',
          'el Administrador del Centro, si hay cupo',
          'el Coordinador Operativo',
          'la Junta Directiva del centro',
        ],
        explicacion: 'Los centros no están autorizados a decidirlo de forma unilateral o discrecional.',
        repasa: ['ubicacion-excepcional'],
      },
      {
        pregunta: 'El cumplimiento laboral de las empresas del grupo, en la parte que le toca a este puesto, se sostiene con…',
        opciones: [
          'las reuniones semanales con los centros',
          'los contratos sellados, las inscripciones en la Caja de Seguro Social, los permisos archivados y los files completos',
          'el reporte mensual a la Junta Directiva',
          'la conciliación de Zoho con el KPI',
        ],
        explicacion: 'No es un tema aparte: es la suma de lo que ya tramitas en los módulos de contratación y permisos.',
        repasa: ['ministerio-de-trabajo', 'caja-de-seguro-social'],
      },
      {
        pregunta: 'Un Administrador te pide suavizar un dato para que su centro quede mejor en el reporte. Tú…',
        opciones: [
          'lo suavizas y le avisas a la Junta aparte',
          'no lo suavizas: los datos deben ser veraces, precisos, completos y verificables',
          'quitas ese centro del reporte del mes',
          'lo consultas con el Corporativo ALOHA',
        ],
        explicacion: 'Omitir o manipular información es falta grave de carácter laboral, ético y legal. Este puesto es el que menos excusa tiene.',
        repasa: ['veraz', 'falta-grave'],
      },
      {
        pregunta: 'Sobre el respaldo del puesto en el Manual, lo cierto es que…',
        opciones: [
          'tiene una sección propia con perfil, competencias e indicadores',
          'tiene diez menciones de trámite y ninguna sección propia: el resto es práctica de la organización',
          'no aparece en el Manual en absoluto',
          'sus funciones están en la sección del Administrador de Centro',
        ],
        explicacion: 'Las dos cosas son verdad y no pesan igual delante de un auditor. Por eso se dice en voz alta y se pide la sección que falta.',
        repasa: ['franquicia', 'verificable'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra 1 — Armar el reporte del mes en el formato de siempre',
        fuente: 'descripcion-del-puesto-fernando#reglamento-legal-y-corporativo',
        proposito: 'Que armes el reporte mensual completo con el formato del mes anterior, abriendo por lo que solo tú viste y sin suavizar un solo dato.',
        gradiente: 'Es la última maniobra del plan: exige los nueve módulos anteriores estudiados, porque cada bloque del reporte sale de uno de ellos.',
        masa: [
          'El reporte del mes anterior, para comparar el formato.',
          'El semáforo de todos los centros del mes cerrado.',
          'Tus listas de contratos, permisos y cartera vieja del mes.',
        ],
        pasos: [
          'Abre el reporte del mes anterior y di qué bloques tiene, en su orden.',
          'Arma el bloque de apertura con el centro que decrece y nadie está mirando.',
          'Llena el semáforo por centro con las tres piezas de cada uno.',
          'Llena contratos, permisos, cartera vieja y puestos tomados, cada uno con su fuente.',
          'Cierra con las discrepancias abiertas y por qué siguen abiertas.',
        ],
        criterios: [
          'Respeta el orden y el formato del reporte anterior, sin agregar ni quitar bloques por gusto.',
          'Abre con el hallazgo propio y explica por qué los centros en rojo no van primero.',
          'Reporta los puestos tomados con el porcentaje de firmas y lo dice explícitamente.',
          'Escribe cada dato tal como está, sin suavizar ninguno, y nombra la fuente de cada bloque.',
        ],
        errorTipico: 'Rehacer el reporte con un formato nuevo porque el anterior parecía mejorable. La Junta pierde la capacidad de comparar dos meses seguidos, que es lo único que convierte un reporte en una decisión.',
      },
    ],
  },
]

// Alias por si el andamiaje importa el curso por el nombre del puesto. Es la
// MISMA lista, no una copia: no se puede desincronizar.
export const COORDINADOR = COORDINACION
