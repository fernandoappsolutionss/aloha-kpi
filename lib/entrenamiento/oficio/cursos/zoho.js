// Curso 2 — Zoho Books para Asistentes Administrativas (rol `asistente`).
//
// FUENTE (contenido ya auditado contra el Manual de Operaciones; aquí sólo se
// adaptó el formato, conservando cifras, plazos, montos y responsables):
//   plataformas/aloha/training-moodle/curso-2-zoho-asistentes.html   §m0..§m13
//   plataformas/aloha/training-moodle/curso-2-zoho-asistentes.gift   81 preguntas
//   plataformas/aloha/training-moodle/hca/drills-asistente.html      §d1..§d16
//
// Los `id` son la CLAVE DE PROGRESO en entrenamiento_progreso.modulo:
// renombrar uno BORRA el avance de todo el mundo. No se renumeran nunca.
//
// Los índices correctos del quiz NO viven aquí: viven en
// lib/entrenamiento/respuestas-oficio/zoho.js (solo servidor).
//
// COLOCACIÓN DE LA RESPUESTA CORRECTA. En el GIFT la correcta va siempre
// primera (`=`). Aquí se coloca en una posición determinista para que el quiz
// no se apruebe eligiendo siempre la opción 1:
//   pos = fnv1a32(idGiftDeLaPregunta) % numeroDeOpciones
// con los ids Z1-01 … Z13-05 del banco. Las preguntas Verdadero/Falso conservan
// el orden Verdadero, Falso. Reproducible: mismo id, misma posición.
//
// Preguntas del banco que NO entraron: Z11-06 ("la factura de servicio del
// Coach se adjunta como documento dentro del sistema Zoho", V/F). El módulo 11
// trae 11 preguntas en el GIFT y el contrato topa el quiz en 10; se descartó la
// V/F más redundante — el mismo hecho se exige en el criterio del Drill 11 y en
// el error 9 del módulo 13.
//
// `minimoAprobacion` no se escribe: lo calcula el motor.

export const ZOHO = [
  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-1',
    curso: 'zoho',
    orden: 14,
    roles: ['asistente'],
    titulo: 'Para qué sirve Zoho en tu Centro',
    duracionMin: 12,
    requiere: ['of-hat-asi'],
    fuente: ['curso-2-zoho-asistentes.html#m0', 'curso-2-zoho-asistentes.html#m1', 'drills-asistente.html#d1'],

    pfv: 'Niños nuevos inscritos y facturados, y las cuentas del Centro cobradas al día — con los números que lo demuestran ya en manos del Administrador. Este módulo abre el sistema donde ese producto se registra.',

    masa: [
      'Zoho Books abierto en pantalla, con tu usuario, en la organización de tu Centro.',
      'Una factura real de tu Centro, impresa o en pantalla.',
      'Una factura de servicio de un Coach del último pago.',
      'Un recibo del fondo de caja menuda, en papel, en la mano.',
      'El formato Calendario y Asistencia del Drive, para ver lo que NO vive en Zoho.',
    ],

    palabras: ['zoho-books', 'organizacion', 'articulo', 'cliente', 'cotizacion', 'factura', 'factura-recurrente', 'pago-recibido', 'factura-de-proveedor', 'gasto', 'trazabilidad'],

    bloques: [
      { t: 'sub', texto: 'Por qué este curso existe' },
      { t: 'p', texto: 'El dinero del Centro vive en **Zoho Books**. Todo lo que tú registras ahí es lo que la Junta Directiva ve, lo que el auditor revisa y lo que decide si el Centro cobró o no cobró este mes.' },
      { t: 'p', texto: 'Cuando una factura no se emite, cuando se emite con el artículo del centro equivocado o cuando un pago no se registra, no pasa nada visible ese día. Pasa a fin de mes: el cuadro de negocio no cuadra, la cobranza vencida sube y la prima de producción se pierde.' },
      { t: 'nota', tono: 'regla', titulo: 'Regla base de este curso', texto: 'En Zoho no se "anota". Se **registra**. Si no está en Zoho, no ocurrió.' },
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'Zoho Books es el sistema contable del Centro. No es un Excel bonito: cada documento que creas mueve una cuenta contable real y queda con fecha, hora y tu nombre. Eso es lo que lo hace auditable, y también lo que hace que un error tuyo sea rastreable.' },
      { t: 'sub', texto: 'Los cuatro caminos del dinero' },
      {
        t: 'tabla',
        encabezados: ['Camino', 'Documento en Zoho', 'Quién lo genera'],
        filas: [
          ['Entra dinero de un padre', 'Cotización → Factura → Pago recibido', 'Tú'],
          ['Sale dinero a un Coach', 'Factura de proveedor (nómina) → Pago realizado', 'Tú, verifica la Administradora'],
          ['Sale dinero a un proveedor', 'Cotización del proveedor → Factura de proveedor → Pago', 'Tú'],
          ['Compra menor del día a día', 'Gasto (reembolso de caja menuda)', 'Tú'],
        ],
      },
      { t: 'sub', texto: 'Qué NO se hace en Zoho' },
      {
        t: 'lista',
        items: [
          'La asistencia de los niños y de los Coaches: eso vive en el formato Calendario y Asistencia de Drive.',
          'El control de kits y el cuadro de negocio: son formatos aparte, pero se **cuadran contra** Zoho.',
          'Los expedientes de personal: van en el file físico del colaborador en el Centro.',
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Ojo con esto', texto: 'El número de kits pedidos en el mes debe ser igual al número de niños nuevos del mes. Si los dos números no coinciden, o entró un niño que no quedó registrado, o se pidió material de más.' },
      { t: 'sub', texto: 'Qué vas a saber hacer al terminar el curso' },
      {
        t: 'pasos',
        items: [
          'Entrar a la organización correcta y reconocer cuándo estás en la equivocada.',
          'Crear el cliente (representante) con los datos que el auditor exige.',
          'Convertir una clase de prueba en cotización y la cotización en factura, sin salir de Zoho.',
          'Emitir y controlar las mensualidades recurrentes.',
          'Registrar pagos y dejar la factura en cero.',
          'Ejecutar el protocolo de facturas vencidas día por día.',
          'Aplicar los descuentos autorizados y detener una recurrencia cuando un niño se retira.',
          'Cargar gastos, reembolsos de caja menuda y pagos a proveedores.',
          'Montar la nómina de Coaches con su factura de servicio adjunta antes del 13 y del 28.',
          'Sacar el reporte de cuentas por cobrar y cuadrarlo con el cuadro de negocio.',
        ],
      },
      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Llevar el control de pagos en un cuaderno "y después lo monto". Se olvida, y la cobranza vencida aparece inflada.',
          'Emitir el recibo antes de crear la factura. En Zoho el pago se aplica **a** una factura; sin factura, el dinero queda sin destino.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'En Zoho Books, el pago de un padre se registra…',
        opciones: ['sobre la factura que se le emitió', 'como un ingreso suelto, sin factura', 'solo en la bitácora del Centro', 'en el cuadro de negocio de fin de mes'],
        explicacion: 'El pago se aplica a una factura. Sin factura, el dinero queda sin destino y la cobranza vencida aparece inflada.',
        repasa: ['pago-recibido', 'factura'],
      },
      {
        pregunta: 'El número de kits solicitados en el mes debe ser igual al número de niños nuevos del mes.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es el cotejo que manda el cuadro de negocio. Si no coinciden, o entró un niño que no quedó registrado, o se pidió material de más.',
        repasa: ['kit', 'cuadro-de-negocio'],
      },
      {
        pregunta: 'La asistencia diaria de los niños se registra en Zoho Books.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'La asistencia vive en el formato Calendario y Asistencia de Drive, no en Zoho.',
        repasa: ['calendario-y-asistencia'],
      },
      {
        pregunta: '¿Qué documento de Zoho se usa para una compra menor del día a día pagada con caja menuda?',
        opciones: ['Una factura de venta', 'Una cotización', 'Una factura recurrente', 'Un gasto, para el reembolso del fondo'],
        explicacion: 'La compra menor se carga como gasto, que es lo que permite reponer el fondo de caja menuda.',
        repasa: ['gasto', 'caja-menuda'],
      },
    ],

    drills: [
      {
        titulo: 'Drill 1 — Recorrer los cuatro caminos del dinero en Zoho',
        fuente: 'drills-asistente.html#d1',
        proposito: 'Que puedas abrir, sin ayuda y sin buscar, el lugar exacto de Zoho donde vive cada uno de los cuatro caminos del dinero del Centro.',
        gradiente: 'Es el primer drill del hat; no exige nada previo. Si te atascas aquí, la causa es una palabra del glosario que no quedó aclarada: vuelve al glosario, no al sistema.',
        masa: [
          'Zoho Books abierto en pantalla, con tu usuario, en la organización de tu Centro.',
          'Una factura real de tu Centro, impresa o en pantalla.',
          'Una factura de servicio de un Coach del último pago.',
          'Un recibo del fondo de caja menuda, en papel, en la mano.',
        ],
        pasos: [
          'Abre Zoho Books y toma los cuatro objetos de masa; ponlos donde los veas mientras trabajas.',
          'Toma la factura real. Di en voz alta qué camino del dinero es y quién genera ese documento.',
          'Navega y escribe en una hoja la ruta exacta, tal como aparece en tu pantalla, de: Contactos · Artículos · Ventas → Facturas · Ventas → Cotizaciones · Ventas → Facturas recurrentes · Compras → Facturas de proveedor · Compras → Gastos · Informes.',
          'Toma la factura de servicio del Coach. Abre en Zoho el lugar donde ese pago vive y muéstralo en pantalla.',
          'Toma el recibo de caja menuda. Abre en Zoho el lugar donde ese gasto se registra y muéstralo en pantalla.',
          'Sin mirar la hoja, abre las ocho rutas seguidas mientras el Oficial cronometra.',
          'Nombra en voz alta las tres cosas que NO se llevan en Zoho y di dónde vive cada una.',
        ],
        criterios: [
          'Abre las ocho rutas seguidas, sin abrir el manual y sin buscar en el buscador, dos veces seguidas.',
          'Con cada objeto de masa en la mano dice, sin dudar, qué documento de Zoho le corresponde y quién lo genera.',
          'Nombra la asistencia, el control de kits y los expedientes de personal como las cosas que no viven en Zoho, y dice dónde sí viven.',
        ],
        errorTipico: 'Confundir el camino del Coach con el del proveedor porque los dos son dinero que sale, y buscarlo en Ventas. Se delata porque abre "Facturas" cuando le pones la factura de servicio del Coach en la mano.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-2',
    curso: 'zoho',
    orden: 15,
    roles: ['asistente'],
    titulo: 'Tu organización: el error más caro es el más silencioso',
    duracionMin: 12,
    requiere: ['of-zoh-1'],
    fuente: ['curso-2-zoho-asistentes.html#m2', 'drills-asistente.html#d2'],

    pfv: 'Cada ingreso del Centro cae en la contabilidad del Centro que lo produjo, y no en la del de al lado.',

    masa: [
      'Zoho Books abierto en pantalla con el selector de organización visible.',
      'El mapa de organizaciones y centros de este módulo, impreso, al lado del teclado.',
      'Una factura real de tu Centro donde se vea la referencia y el artículo.',
    ],

    palabras: ['organizacion', 'articulo', 'cuenta-de-ingresos', 'trazabilidad', 'cuadro-de-negocio'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'En Zoho, una **organización** es una empresa fiscal, no un centro. Varios centros pueden facturar dentro de la misma organización, y hay organizaciones que atienden un solo centro. Al entrar, Zoho te deja en la última organización que usaste: **siempre verifica arriba antes de crear nada**.' },
      { t: 'sub', texto: 'Mapa real de organizaciones y centros' },
      {
        t: 'tabla',
        encabezados: ['Organización en Zoho', 'País', 'Centros que factura', 'Cómo se distingue el centro'],
        filas: [
          ['F & F Soluciones Integrales', 'Panamá', 'Calle 50 y David', 'Por el artículo del centro y la referencia ("Calle50-…", "David-…")'],
          ['ALTAVIA GROUP', 'Panamá', 'Brisas del Golf y Anclas', 'Por el artículo del centro y la referencia'],
          ['V & A Soluciones Integrales', 'Panamá', 'Condado del Rey', 'Toda la organización es el centro'],
          ['Desarrollo Integral Radi, S.E.P.', 'Panamá', 'Santiago', 'Toda la organización es el centro'],
          ['Desarrollo Mental Infantil C.A.', 'Venezuela', 'Centro de Venezuela', 'Toda la organización es el centro'],
          ['Entrenamiento Infantil Pitágoras', 'Venezuela', 'El Viñedo', 'Toda la organización es el centro'],
          ['FF Solutiones Integrales 2024 CA', 'Venezuela', 'Los Naranjos', 'Toda la organización es el centro'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'El error silencioso', texto: 'Si tu centro comparte organización con otro (Calle 50 con David, Brisas con Anclas), una factura tuya puede quedar contabilizada en el otro centro sin que Zoho te avise. El sistema no se equivoca: se equivoca quien elige mal el artículo. Ese ingreso se lo lleva el otro centro en el reporte, y tu cuadro de negocio no cuadra a fin de mes.' },
      { t: 'sub', texto: 'Paso a paso: verificar dónde estás' },
      {
        t: 'pasos',
        items: [
          'Entra a Zoho Books.',
          'Mira el nombre de la organización en la parte superior. Léelo en voz alta.',
          'Si no es la tuya, cámbiala desde el selector de organización antes de tocar cualquier documento.',
          'Solo entonces empieza a trabajar.',
        ],
      },
      { t: 'p', texto: 'Esto toma cuatro segundos. Hazlo **cada vez** que abras Zoho, aunque hayas entrado hace una hora.' },
    ],

    quiz: [
      {
        pregunta: 'En Zoho Books, una organización equivale a…',
        opciones: ['un centro ALOHA', 'un grupo de niños', 'una cuenta bancaria', 'una empresa fiscal, que puede facturar para más de un centro'],
        explicacion: 'La organización es la empresa fiscal. El centro es el local donde se dan las clases: dentro de una organización pueden facturar varios centros.',
        repasa: ['organizacion'],
      },
      {
        pregunta: 'Los centros Calle 50 y David facturan bajo la misma organización de Zoho.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Los dos facturan bajo F & F Soluciones Integrales; se distinguen por el artículo del centro y la referencia.',
        repasa: ['organizacion'],
      },
      {
        pregunta: 'Los centros Brisas del Golf y Anclas facturan bajo la organización…',
        opciones: ['F & F Soluciones Integrales', 'ALTAVIA GROUP', 'V & A Soluciones Integrales', 'Desarrollo Integral Radi'],
        explicacion: 'Brisas del Golf y Anclas comparten ALTAVIA GROUP, y también se distinguen por el artículo y la referencia.',
      },
      {
        pregunta: 'Condado del Rey factura bajo V & A Soluciones Integrales, y toda esa organización corresponde a ese único centro.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'En Condado del Rey, Santiago y los tres centros de Venezuela toda la organización es el centro.',
      },
      {
        pregunta: '¿Qué debes hacer SIEMPRE al abrir Zoho, antes de crear cualquier documento?',
        opciones: ['Sacar el reporte de cuentas por cobrar', 'Revisar las facturas recurrentes', 'Cambiar la contraseña', 'Verificar el nombre de la organización en la parte superior'],
        explicacion: 'Zoho te deja en la última organización que usaste. Leer el nombre arriba toma cuatro segundos y evita el error más caro del curso.',
        repasa: ['organizacion'],
      },
      {
        pregunta: 'Si tu centro comparte organización con otro centro, Zoho te avisa automáticamente cuando facturas al centro equivocado.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Zoho no avisa. Por eso el error es silencioso: el ingreso se lo lleva el otro centro y sólo se descubre al no cuadrar el mes.',
        repasa: ['cuenta-de-ingresos'],
      },
    ],

    drills: [
      {
        titulo: 'Drill 2 — Verificar la organización antes de tocar cualquier documento',
        fuente: 'drills-asistente.html#d2',
        proposito: 'Que verifiques la organización correcta en cuatro segundos, cada vez que abras Zoho, sin que nadie te lo recuerde.',
        gradiente: 'Exige el Drill 1 aprobado. Si te confundes con qué es una organización frente a un Centro, vuelve al glosario y al Drill 1: no es un problema de este drill.',
        masa: [
          'Zoho Books abierto en pantalla con el selector de organización visible.',
          'El mapa de organizaciones y centros del Módulo 2 impreso, al lado del teclado.',
          'Una factura real de tu Centro donde se vea la referencia y el artículo.',
        ],
        pasos: [
          'Cierra Zoho por completo. Vuelve a entrar.',
          'Lee en voz alta el nombre de la organización que aparece arriba.',
          'Búscalo en el mapa impreso y di: qué país es, qué Centro o Centros factura, y si compartes organización con otro Centro.',
          'Si la organización no es la tuya, cámbiala desde el selector antes de abrir cualquier documento. Vuelve a leerla en voz alta.',
          'Toma la factura real y señala con el dedo la señal que distingue tu Centro en ese documento: el artículo y la referencia.',
          'El Oficial deja Zoho abierto en una organización que no es la tuya y te llama a "hacer una factura urgente". Detecta el cambio y corrígelo antes de crear nada.',
          'Explica con tus palabras qué le pasa al ingreso si facturas la matrícula de un niño de David con el artículo de Calle 50.',
        ],
        criterios: [
          'Lee la organización en voz alta las tres veces que entra a Zoho durante la sesión, sin que se lo pidan.',
          'En la trampa del paso 6, se detiene antes de crear el documento y cambia la organización.',
          'Explica con sus palabras por qué el ingreso caería en el Centro equivocado y qué pasa con el cuadre de fin de mes de su Centro cuando eso ocurre.',
        ],
        errorTipico: 'Mirar la organización sin leerla: los ojos pasan por el nombre y la cabeza sigue en la tarea. Se delata porque cae en la trampa del paso 6 sin darse cuenta, y cuando el Oficial le pregunta en qué organización está, tiene que volver a mirar.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-3',
    curso: 'zoho',
    orden: 16,
    roles: ['asistente'],
    titulo: 'El catálogo: los artículos están por centro',
    duracionMin: 15,
    requiere: ['of-zoh-2'],
    fuente: ['curso-2-zoho-asistentes.html#m3', 'drills-asistente.html#d3'],

    pfv: 'Cada venta queda cargada al artículo de tu Centro, con el itinerario y el número de niveles que el padre realmente contrató.',

    masa: [
      'Zoho Books abierto en Artículos, filtrado por el nombre de tu Centro.',
      'Una factura real de matrícula de tu Centro, con su artículo visible.',
      'Hoja y lápiz para tu chuleta de artículos.',
    ],

    palabras: ['articulo', 'cuenta-de-ingresos', 'itinerario', 'nivel', 'kit', 'matricula', 'mensualidad', 'seguro-de-accidentes-opcion-1', 'seguro-de-accidentes-opcion-2', 'seguro-estudiantil', 'clase-de-campeonato', 'canje-de-articulo'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'En Zoho no facturas "una matrícula". Facturas **un artículo específico de tu centro**. El catálogo está construido así a propósito: cada artículo apunta a la cuenta de ingresos de su centro. Escoger el artículo correcto es lo que hace que el ingreso caiga donde debe.' },
      { t: 'sub', texto: 'Familias de artículos que vas a usar' },
      {
        t: 'tabla',
        encabezados: ['Familia', 'Cómo se llama en el catálogo', 'Cuándo se factura'],
        filas: [
          ['Matrícula / 1er ciclo', '"1er ciclo Matrícula [itinerario] [centro] [nº de niveles]". Ej.: 1er ciclo Matrícula Kinder Calle 50 2 niveles', 'Al inscribir. Según el contrato de servicios, la matrícula incluye seis cosas: Seguro Estudiantil, mochila ALOHA, suéter ALOHA, ábaco, lápiz ALOHA y libros de nivel (2 niveles). La mochila y el ábaco se entregan una sola vez en todo el programa.'],
          ['Mensualidad', 'Mensualidad del itinerario y centro que corresponda', 'Cada mes, por factura recurrente'],
          ['Seguro de accidentes', '"Afiliación Seguro de accidente opción 1 / opción 2 [centro]"', 'Por ciclo, al inscribir o renovar'],
          ['Clase de reposición / campeonato', '"Clase de Campeonato [centro]"', 'Cuando el padre solicita la clase'],
          ['Campeonato Internacional', '"Campeonato Internacional [año]"', 'Al inscribir al niño en el campeonato'],
          ['Reposición de material', '"ARTÍCULO FALTANTE" / "CANJE DE ARTÍCULO"', 'Cuando se repone o cambia material; el costo es adicional'],
        ],
      },
      { t: 'sub', texto: 'Las dos opciones de seguro' },
      {
        t: 'lista',
        items: [
          '**Opción 1:** gastos médicos por accidente 1.000,00 · muerte accidental 5.000,00 · ambulancia incluida.',
          '**Opción 2:** gastos médicos por accidente 2.000,00 · muerte accidental 10.000,00 · ambulancia incluida.',
        ],
      },
      { t: 'p', texto: 'La descripción del artículo pide **nombre del niño, fecha de nacimiento, cédula, nombre del representante y teléfono**. Ese texto no es decorativo: es lo que la aseguradora usa para validar la cobertura. Si lo dejas en blanco y el niño se accidenta, el reclamo se cae.' },
      { t: 'nota', tono: 'alerta', titulo: 'Aquí la empresa no está unificada', texto: 'El contrato de servicios del manual pone el **Seguro Estudiantil dentro de la matrícula**, mientras que el catálogo de Zoho tiene la afiliación al seguro como un artículo aparte que se cobra por separado. Factura como te indique tu Administradora y deja constancia; esta diferencia hay que unificarla con corporativo, no resolverla tú en la caja.' },
      { t: 'nota', tono: 'ojo', titulo: 'Antes de agregar el artículo a una factura, léelo completo', texto: 'El nombre trae el centro y el número de niveles. "Kinder Calle 50 2 niveles" y "Kinder Calle 50 3 niveles" se ven casi iguales en la lista y tienen precios distintos.' },
      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Usar el artículo de otro centro porque apareció primero en el buscador. El ingreso se va al otro centro.',
          'Facturar "2 niveles" cuando el padre contrató 3, o al revés. Se cobra de menos o se cobra de más y hay que emitir nota de crédito.',
          'Dejar en blanco los datos del niño en el artículo de seguro.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: '¿Por qué los artículos del catálogo están separados por centro?',
        opciones: ['Porque cada centro tiene precios distintos por ley', 'Por costumbre, no tiene efecto contable', 'Porque cada artículo apunta a la cuenta de ingresos de su centro', 'Porque lo exige la aseguradora'],
        explicacion: 'Cada artículo apunta a la cuenta de ingresos de su centro: escoger bien el artículo es lo que hace que el ingreso caiga donde debe.',
        repasa: ['cuenta-de-ingresos', 'articulo'],
      },
      {
        pregunta: 'Según el contrato de servicios, la matrícula de primer ciclo incluye…',
        opciones: ['solo el libro de clases', 'suéter y mochila únicamente', 'solo el ábaco y el lápiz', 'seguro estudiantil, mochila, suéter, ábaco, lápiz y libros de nivel'],
        explicacion: 'Son seis cosas. La mochila y el ábaco se entregan una sola vez en todo el programa.',
        repasa: ['matricula', 'primer-ciclo', 'seguro-estudiantil'],
      },
      {
        pregunta: 'La reposición de materiales incluidos en la matrícula tiene un costo adicional para el representante.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Se factura con los artículos ARTÍCULO FALTANTE o CANJE DE ARTÍCULO, y el costo es adicional.',
        repasa: ['articulo-faltante', 'canje-de-articulo'],
      },
      {
        pregunta: 'En el seguro de accidentes, la Opción 2 cubre gastos médicos por accidente de…',
        opciones: ['1.000,00', '2.000,00', '5.000,00', '10.000,00'],
        explicacion: 'Opción 2: gastos médicos 2.000,00 y muerte accidental 10.000,00. La Opción 1 es 1.000,00 y 5.000,00.',
        repasa: ['seguro-de-accidentes-opcion-2'],
      },
      {
        pregunta: 'La Opción 1 del seguro de accidentes cubre muerte accidental por 5.000,00 e incluye servicio de ambulancia.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Las dos opciones incluyen ambulancia; lo que cambia son los montos.',
        repasa: ['seguro-de-accidentes-opcion-1'],
      },
      {
        pregunta: '¿Qué datos hay que llenar en la descripción del artículo de seguro de accidentes?',
        opciones: ['Solo el nombre del niño', 'Solo el nombre del representante', 'Ninguno, es un texto informativo', 'Nombre del niño, fecha de nacimiento, cédula, nombre del representante y teléfono'],
        explicacion: 'Son cinco datos, y la aseguradora los usa para validar la cobertura.',
        repasa: ['descripcion-del-articulo'],
      },
      {
        pregunta: 'Si dejas en blanco los datos del niño en el artículo de seguro y luego ocurre un accidente, el reclamo ante la aseguradora se puede caer.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Esa descripción no es decorativa: sin ella la aseguradora no puede validar la cobertura.',
        repasa: ['cobertura'],
      },
    ],

    drills: [
      {
        titulo: 'Drill 3 — Escoger el artículo correcto del catálogo',
        fuente: 'drills-asistente.html#d3',
        proposito: 'Que leas el nombre completo del artículo y escojas el de tu Centro, con el itinerario y el número de niveles que el padre realmente contrató.',
        gradiente: 'Exige el Drill 2 aprobado. Si te enredas con qué Centro factura tu organización, el problema está en el Drill 2, no aquí.',
        masa: [
          'Zoho Books abierto en Artículos, filtrado por el nombre de tu Centro.',
          'Una factura real de matrícula de tu Centro, con su artículo visible.',
          'Hoja y lápiz para tu chuleta de artículos.',
        ],
        pasos: [
          'Filtra Artículos por el nombre de tu Centro y anota, uno por uno, los artículos activos que te corresponden con su precio.',
          'Marca en tu lista cuáles usas todos los meses y cuáles solo en momentos puntuales. Esa hoja es tu chuleta de trabajo y se queda en tu puesto.',
          'Lee en voz alta el nombre completo de tres artículos de matrícula: di el itinerario, el Centro y el número de niveles de cada uno.',
          'El Oficial te dicta cinco casos ("Kinder, mi Centro, 3 niveles"; "Kids, mi Centro, 2 niveles"; una clase de campeonato; una reposición de material; un seguro opción 2). Selecciona el artículo correcto de cada uno en pantalla, sin agregarlo a ningún documento.',
          'Abre el artículo de seguro de accidentes y lee su descripción completa. Nombra los cinco datos que pide.',
          'Toma la factura real de matrícula y verifica que el artículo usado sea el de tu Centro y con el número de niveles correcto.',
          'Explica qué pasa con un reclamo a la aseguradora si el artículo de seguro va sin los datos del niño.',
        ],
        criterios: [
          'Acierta los cinco artículos dictados tres veces seguidas, sin abrir el manual y sin preguntar.',
          'Lee el nombre completo del artículo antes de escogerlo — el Oficial lo ve leyendo, no adivinando por la primera coincidencia del buscador.',
          'Nombra de memoria los cinco datos que exige el artículo de seguro y dice qué pasa con el reclamo si faltan.',
          'Entrega su chuleta de artículos escrita, con precios y con la marca de uso mensual o puntual.',
        ],
        errorTipico: 'Tomar el primer artículo que aparece en el buscador porque "dice Kinder". Se delata cuando el Oficial le dicta "3 niveles" y ella selecciona el de 2 sin notarlo: el nombre lo leyó a medias.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-4',
    curso: 'zoho',
    orden: 17,
    roles: ['asistente'],
    titulo: 'Clientes: el cliente es el representante, no el niño',
    duracionMin: 10,
    requiere: ['of-zoh-3'],
    fuente: ['curso-2-zoho-asistentes.html#m4', 'drills-asistente.html#d4'],

    pfv: 'Un solo contacto por representante, con cédula y correo, para que su estado de cuenta diga siempre la verdad.',

    masa: [
      'Zoho Books abierto en Contactos, en la organización de tu Centro.',
      'Una ficha o formulario de inscripción real con los datos de un representante.',
      'El teléfono del Centro, para verificar el correo con el padre si hace falta.',
    ],

    palabras: ['contacto', 'cliente', 'representante', 'contacto-duplicado', 'factura', 'saldo', 'trazabilidad'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'Quien firma el contrato y paga es el **representante**. Él es el contacto en Zoho. El niño va identificado en la factura y en la descripción de los artículos, pero no es el cliente.' },
      { t: 'p', texto: 'Si un representante tiene dos o tres hijos en el programa, es **un solo cliente** con varias facturas o varias líneas. Duplicar el contacto rompe el estado de cuenta y hace que un padre aparezca al día en un contacto y vencido en el otro.' },
      { t: 'sub', texto: 'Paso a paso: crear el cliente' },
      {
        t: 'pasos',
        items: [
          'Contactos → Nuevo cliente.',
          '**Nombre completo del representante** tal como aparece en su cédula. No apodos, no "mamá de Sofía".',
          '**Cédula / documento de identidad.** Obligatorio.',
          '**Correo electrónico.** Es por donde salen las facturas y los avisos. Verifícalo con el padre, letra por letra.',
          '**Teléfono / WhatsApp.** Es tu herramienta de cobranza.',
          'Guarda y **busca el nombre otra vez** antes de seguir, para confirmar que no quedó duplicado.',
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'Antes de crear, busca', texto: 'Escribe el apellido en el buscador de contactos. Si ya existe, usa el que existe. Crear duplicados parte en dos el estado de cuenta del representante, y de ahí salen los reclamos de "yo ya pagué".' },
    ],

    quiz: [
      {
        pregunta: 'En Zoho, el cliente es…',
        opciones: ['el niño inscrito', 'el representante que firma el contrato y paga', 'el Coach del grupo', 'el Centro ALOHA'],
        explicacion: 'El niño va identificado en la factura y en la descripción de los artículos, pero el cliente es el representante.',
        repasa: ['cliente', 'representante'],
      },
      {
        pregunta: 'Un representante con tres hijos en el programa debe tener tres contactos separados en Zoho.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es un solo cliente con varias facturas o varias líneas. Duplicarlo rompe el estado de cuenta.',
        repasa: ['contacto-duplicado'],
      },
      {
        pregunta: 'Antes de crear un contacto nuevo, lo primero que haces es…',
        opciones: ['crear el contacto y después revisar duplicados', 'pedir autorización a la Administradora', 'emitir la factura', 'buscar el apellido en el buscador de contactos para ver si ya existe'],
        explicacion: 'Buscar primero. Si ya existe, se usa el que existe.',
        repasa: ['contacto-duplicado'],
      },
      {
        pregunta: '¿Cuál de estos datos NO puede faltar al crear el cliente?',
        opciones: ['La profesión del representante', 'El colegio del niño', 'La cédula o documento de identidad', 'El nombre del Coach'],
        explicacion: 'La cédula es obligatoria, junto con el nombre completo tal como aparece en ella, el correo y el teléfono.',
      },
    ],

    drills: [
      {
        titulo: 'Drill 4 — Crear el cliente representante sin duplicarlo',
        fuente: 'drills-asistente.html#d4',
        proposito: 'Que crees el contacto del representante con los datos que el auditor exige, después de haber buscado si ya existe.',
        gradiente: 'Exige el Drill 2 aprobado. Si dudas de en qué organización estás creando el contacto, regresa al Drill 2 antes de seguir.',
        masa: [
          'Zoho Books abierto en Contactos, en la organización de tu Centro.',
          'Una ficha o formulario de inscripción real con los datos de un representante.',
          'El teléfono del Centro, para verificar el correo con el padre si hace falta.',
        ],
        pasos: [
          'Toma la ficha del representante. Antes de crear nada, escribe su apellido en el buscador de contactos.',
          'Revisa los resultados uno por uno. Di en voz alta si existe o no existe.',
          'Si no existe, entra a Contactos → Nuevo cliente y carga: nombre completo tal como aparece en la cédula, cédula, correo electrónico, teléfono / WhatsApp.',
          'Verifica el correo letra por letra contra la ficha. Si hay una letra dudosa, llama al padre desde el teléfono del Centro y confírmalo.',
          'Guarda. Vuelve a buscar el apellido y confirma que quedó un solo contacto.',
          'Ahora toma un caso de un representante con dos hijos en el programa. Muestra en pantalla cómo queda: un solo cliente, y cada niño identificado en la factura y en la descripción de los artículos.',
          'Busca en tu organización tres contactos existentes. Verifica que tengan cédula y correo cargados y completa los que estén incompletos.',
          'Explica con tus palabras qué le pasa al estado de cuenta de un padre cuando existe duplicado.',
        ],
        criterios: [
          'En tres creaciones seguidas, busca por apellido antes de tocar "Nuevo cliente", sin que se lo recuerden.',
          'Ningún contacto queda guardado sin cédula ni correo.',
          'Explica con sus palabras por qué un padre puede aparecer al día en un contacto y vencido en el otro, y qué reclamo produce eso.',
          'Entrega el conteo de los tres contactos revisados: cuántos estaban incompletos y qué completó.',
        ],
        errorTipico: 'Crear el contacto con el nombre del niño o con "mamá de Sofía" porque es más rápido de recordar. Se delata al buscar por apellido del representante: el contacto no aparece, y a los tres meses hay dos.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-5',
    curso: 'zoho',
    orden: 18,
    roles: ['asistente'],
    titulo: 'De la clase de prueba a la inscripción',
    duracionMin: 18,
    requiere: ['of-zoh-4'],
    fuente: ['curso-2-zoho-asistentes.html#m5', 'drills-asistente.html#d5', 'drills-asistente.html#d5b'],

    pfv: 'La cotización sale por correo antes de que el padre se levante de la silla, y se convierte en factura el momento en que dice que sí.',

    masa: [
      'Zoho Books abierto en Ventas → Cotizaciones, en la organización de tu Centro.',
      'Tu chuleta de artículos del módulo anterior.',
      'La lista de inscritos a una clase de prueba, real o del último evento, y tu Excel de control.',
      'Un cronómetro o el reloj del Centro.',
    ],

    palabras: ['clase-de-prueba', 'cotizacion', 'propuesta-de-servicio', 'convertir-a-factura', 'factura', 'articulo', 'itinerario', 'nivel', 'trazabilidad', 'indicador', 'foda'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'La clase de prueba es el momento de mayor conversión del Centro, y tu trabajo decide cuánto de esa conversión se convierte en dinero cobrado.' },
      { t: 'p', texto: 'La regla del manual es clara y son dos cosas, no una: **mientras los representantes están en la clase de prueba, tú confeccionas las cotizaciones y se las envías por correo a los padres asistentes**. Y cuando salgan, esa misma cotización ya debe estar lista para convertirse en factura en el momento en que el padre dice que sí.' },
      { t: 'sub', texto: 'Dos días antes' },
      {
        t: 'pasos',
        items: [
          'Pide al área de ventas la lista de inscritos a la clase de prueba.',
          'Llama a confirmar asistencia el día anterior.',
          'Registra en tu Excel de control quién está en lista.',
        ],
      },
      { t: 'sub', texto: 'El día de la clase' },
      {
        t: 'pasos',
        items: [
          'Recibe a cada padre mirando a los ojos, con una sonrisa. **Nunca tutear a un representante.**',
          'Marca asistencia real contra la lista.',
          'Mientras están en la charla, en Zoho: Ventas → Cotizaciones → Nueva. Cliente: el representante (créalo si no existe, con cédula y correo). Artículos: matrícula del itinerario, centro y número de niveles que aplique, más seguro de accidentes (opción 1 u opción 2) y la mensualidad correspondiente. En la descripción, el nombre del niño.',
          '**Envía la cotización por correo a los padres asistentes antes de que salgan**, mientras siguen en la clase: el Manual lo ordena así. Y deja además la cotización guardada en Zoho, lista para convertirla en factura en el momento en que el padre cierre, apenas salga de la clase de prueba. Son las dos mitades del mismo paso: el correo es lo que el padre se lleva; la cotización guardada es lo que te deja facturar en el acto.',
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'Antes de cargar el seguro como artículo aparte', texto: 'Relee el aviso del módulo del catálogo: el contrato de servicios del Manual pone el Seguro Estudiantil **dentro** de la matrícula, y el catálogo de Zoho lo tiene como artículo que se cobra por separado. Cobrar los dos es cobrarlo dos veces. Hazlo como te indique tu Administradora y deja constancia; esta diferencia se unifica con corporativo, no en tu caja.' },
      { t: 'sub', texto: 'Cuando el padre cierra' },
      {
        t: 'pasos',
        items: [
          'Abre la cotización y usa **Convertir a factura**. No la vuelvas a escribir a mano: perderías la trazabilidad y te arriesgas a cambiar un precio.',
          'Registra el pago de la matrícula.',
          'Pasa la información de la inscripción a la Administradora para la apertura de grupo.',
        ],
      },
      { t: 'sub', texto: 'Los dos indicadores que se te piden cada semana' },
      {
        t: 'tabla',
        encabezados: ['Indicador', 'Fórmula', 'Ejemplo'],
        filas: [
          ['% de asistencia', 'asistentes × 100 ÷ inscritos en lista', '15 × 100 ÷ 20 = 75 %'],
          ['% de inscripción', 'inscritos × 100 ÷ asistentes', '8 × 100 ÷ 15 = 54 %'],
        ],
      },
      { t: 'p', texto: 'Estos dos números van al informe FODA que la Administradora entrega los primeros 5 días del mes. Salen de tu Excel de control, no de la memoria.' },
      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Esperar a que el padre "confirme mañana" para hacer la cotización. Mañana ya se enfrió.',
          'Convertir la cotización a factura y no registrar el pago de la matrícula sobre esa factura. El dinero entró al Centro, pero la factura queda pendiente y el padre aparece debiendo en cuentas por cobrar.',
          'Dejar la cotización guardada y no enviársela por correo. El padre sale sin nada en la mano y la decisión se enfría.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: '¿Cuándo se confeccionan las cotizaciones de servicio de una clase de prueba?',
        opciones: ['Mientras los representantes están en la clase de prueba', 'Al día siguiente de la clase de prueba', 'Cuando el padre confirma que se inscribe', 'Al cierre de mes'],
        explicacion: 'Durante la charla, y se envían por correo antes de que los padres salgan. Al salir ya deben poder convertirse en factura.',
        repasa: ['cotizacion', 'clase-de-prueba'],
      },
      {
        pregunta: 'La lista de inscritos a la clase de prueba se pide a ventas con cuántos días de anticipación?',
        opciones: ['El mismo día de la clase', 'Dos días antes, para llamar a confirmar el día anterior', 'Una semana antes', 'No se pide, llegan espontáneamente'],
        explicacion: 'Dos días antes. Es lo único compatible con la llamada de confirmación del día anterior.',
      },
      {
        pregunta: 'Al recibir a los representantes se les puede tutear si hay confianza.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Nunca se tutea a un representante. El recibimiento es mirando a los ojos, con una sonrisa y disposición de servicio.',
      },
      {
        pregunta: 'Cuando el padre cierra la inscripción, lo correcto en Zoho es…',
        opciones: ['crear una factura nueva desde cero', 'registrar el pago sin factura', 'esperar al cierre de mes para facturar', 'convertir la cotización existente en factura'],
        explicacion: 'Se usa Convertir a factura. Reescribirla a mano pierde la trazabilidad y arriesga cambiar un precio.',
        repasa: ['convertir-a-factura'],
      },
      {
        pregunta: 'Si 20 padres estaban en lista y asistieron 15, el porcentaje de asistencia es…',
        opciones: ['75', '133', '5', '80'],
        explicacion: 'asistentes × 100 ÷ inscritos en lista: 15 × 100 ÷ 20 = 75 %.',
        repasa: ['indicador'],
      },
      {
        pregunta: 'Si asistieron 15 padres y se inscribieron 8, el porcentaje de inscripción es aproximadamente…',
        opciones: ['187', '54', '40', '23'],
        explicacion: 'inscritos × 100 ÷ asistentes: 8 × 100 ÷ 15 = 54 %.',
        repasa: ['indicador'],
      },
      {
        pregunta: 'Los indicadores de clase de prueba se entregan con frecuencia…',
        opciones: ['diaria', 'trimestral', 'semanal', 'anual'],
        explicacion: 'Semanal, y alimentan el FODA que la Administradora entrega los primeros 5 días del mes.',
        repasa: ['foda'],
      },
    ],

    drills: [
      {
        titulo: 'Drill 5 — Cotizar en caliente y convertir la cotización en factura',
        fuente: 'drills-asistente.html#d5',
        proposito: 'Que dejes la cotización lista mientras los representantes están en la charla, y la conviertas en factura en el momento en que el padre dice que sí.',
        gradiente: 'Exige los Drills 3 y 4 aprobados. Si te trabas escogiendo el artículo, el problema es el Drill 3. Si te trabas creando el cliente, es el Drill 4. No se repite este drill: se devuelve al que falta.',
        masa: [
          'Zoho Books abierto en Ventas → Cotizaciones, en la organización de tu Centro.',
          'Tu chuleta de artículos del Drill 3.',
          'La lista de inscritos a una clase de prueba (real o del último evento) y tu Excel de control.',
          'Un cronómetro o el reloj del Centro.',
        ],
        pasos: [
          'Toma la lista de inscritos y anótala en tu Excel de control.',
          'Con el cronómetro corriendo, arma una cotización completa para un niño de la lista: cliente el representante (créalo si no existe, con cédula y correo), artículos de matrícula del itinerario, Centro y número de niveles que aplique, más seguro de accidentes (opción 1 u opción 2) y la mensualidad correspondiente.',
          'Escribe el nombre del niño en la descripción.',
          'Guarda y envía la cotización por correo al representante.',
          'Repite con tres representantes más. El Oficial cronometra las cuatro.',
          'El Oficial te dice "la señora cerró". Abre esa cotización y usa Convertir a factura. No la vuelvas a escribir a mano.',
          'Verifica que la factura conserve los mismos artículos, los mismos precios y el nombre del niño.',
          'Calcula, con los datos de tu Excel: % de asistencia = asistentes × 100 ÷ inscritos en lista, y % de inscripción = inscritos × 100 ÷ asistentes. Hazlo con el caso de práctica de 22 en lista, 14 asistentes y 9 inscritos, y después con tu último evento real.',
        ],
        criterios: [
          'Arma cuatro cotizaciones completas y correctas en 45 minutos, sin consultar el manual. La clase de prueba dura una hora reloj y la charla de padres ocupa el grueso: 45 minutos es la ventana real que vas a tener.',
          'Convierte a factura usando la función de Zoho, nunca reescribiendo — el Oficial ve la factura enlazada a su cotización.',
          'Calcula los dos porcentajes correctamente dos veces seguidas, con la calculadora y con los números de su propio Excel.',
          'Explica con sus palabras qué se pierde al reescribir la factura a mano en vez de convertirla.',
        ],
        errorTipico: 'Guardar la cotización "para terminarla luego" y salir a atender a los padres. Se delata porque a la salida de la charla tiene cuatro cotizaciones en borrador incompletas y ninguna enviada: la venta caliente se enfrió esperándola.',
      },
      {
        titulo: 'Drill 5-B — Emitir la factura en la impresora fiscal y conciliarla con Zoho',
        fuente: 'drills-asistente.html#d5b',
        proposito: 'Que emitas la factura en la impresora fiscal, la cuadres contra lo que quedó registrado en Zoho y sepas qué hacer cuando las dos no dicen lo mismo.',
        gradiente: 'PENDIENTE CON LA JUNTA antes de correr este drill. "Emitir facturaciones en el sistema y en la impresora fiscal" está listada como función tuya, y la impresora está en el recorrido físico del Centro — pero el procedimiento no está escrito en ninguna parte del material: ni en el Curso 2, ni en los cuadernos de drills, ni en el Manual. En Panamá la impresora fiscal tiene consecuencias tributarias. Hasta que exista el procedimiento escrito y aprobado, esta función no se le suelta a la Asistente: la emisión fiscal la sigue haciendo quien la venía haciendo, y este drill queda abierto con fecha comprometida. Exige además el Drill 5 aprobado: no se emite fiscalmente una factura que todavía no se sabe armar en Zoho.',
        masa: [
          'La impresora fiscal encendida, con rollo, y su clave.',
          'Una factura real del día, ya emitida en Zoho.',
          'El reporte Z del día (cierre fiscal) y el reporte X si el Centro lo usa.',
          'El procedimiento escrito de emisión fiscal, aprobado por la Junta. Si no existe, el drill no se hace: se abre el pendiente.',
        ],
        pasos: [
          'Con el procedimiento escrito delante, emite en la impresora fiscal la factura del día que ya existe en Zoho.',
          'Compara los dos documentos línea por línea: cliente, concepto, monto e impuesto. Deben decir exactamente lo mismo.',
          'Si no coinciden, no reimprimas: anota la diferencia, para y avisa al Administrador. Un documento fiscal mal emitido no se arregla imprimiendo otro.',
          'Al cierre del día, saca el reporte Z y cuádralo contra el total facturado del día en Zoho.',
          'Archiva el reporte Z con su fecha y anótalo en la bitácora.',
        ],
        criterios: [
          'Emite dos facturas fiscales en días distintos y ambas cuadran con Zoho al centavo.',
          'Ante una diferencia sembrada por el Oficial, se detiene y avisa en vez de reimprimir.',
          'Saca el reporte Z sola y lo cuadra contra el total del día.',
          'Explica con sus palabras por qué un documento fiscal no se corrige reimprimiendo.',
        ],
        errorTipico: 'Tratar la impresora fiscal como una impresora más: reimprimir "porque salió mal". Se delata en el reporte Z, donde el total del día ya no cuadra con nada. Ese descuadre no es del Centro: es tributario.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-6',
    curso: 'zoho',
    orden: 19,
    roles: ['asistente'],
    titulo: 'Mensualidades: la factura recurrente',
    duracionMin: 12,
    requiere: ['of-zoh-5'],
    fuente: ['curso-2-zoho-asistentes.html#m6', 'drills-asistente.html#d6'],

    pfv: 'La mensualidad se emite sola mientras el niño está, y se apaga el mismo día en que deja de estar.',

    masa: [
      'Zoho Books abierto en Ventas → Facturas recurrentes, en la organización de tu Centro.',
      'La lista de niños activos de tu Centro, impresa.',
      'El cuadro de deserciones del Centro.',
      'El formato de Calendario y Asistencia del Drive abierto, para ver ausencias.',
    ],

    palabras: ['factura-recurrente', 'perfil-de-recurrencia', 'factura', 'nota-de-credito', 'desercion', 'cuentas-por-cobrar', 'factura-vencida', 'mensualidad', 'retiro'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'La mensualidad no se factura a mano cada mes. Se configura una **factura recurrente** que Zoho emite sola en la fecha que tú fijaste. Eso es una ventaja y un riesgo: si un niño se retira y nadie detiene la recurrencia, Zoho le sigue generando factura al padre y esa factura entra a la cobranza vencida sin que exista deuda real.' },
      { t: 'sub', texto: 'Paso a paso: crear la recurrencia' },
      {
        t: 'pasos',
        items: [
          'Ventas → Facturas recurrentes → Nueva.',
          'Cliente: el representante.',
          'Nombre del perfil: usa un nombre que puedas buscar después, con el niño y el grupo.',
          'Frecuencia: mensual. Fecha de inicio: la que corresponda al ciclo del grupo.',
          'Artículo: la mensualidad del itinerario y centro correctos.',
          'Guarda y confirma que quedó activa.',
        ],
      },
      { t: 'sub', texto: 'Paso a paso: detenerla (retiro de un niño)' },
      {
        t: 'pasos',
        items: [
          'Ventas → Facturas recurrentes → busca el perfil del niño.',
          'Detén o cancela el perfil **una vez que el Administrador confirme el retiro**. El manual pone esa decisión en el Administrador, que es quien resuelve entre un acuerdo de pago o el retiro del programa deteniendo la factura recurrente; tú la ejecutas en Zoho.',
          'Si ya se generó una factura del mes que no corresponde cobrar, informa a la Administradora antes de anularla o emitir nota de crédito. Esa decisión no es tuya.',
          'Registra el retiro en el cuadro de deserciones con niño, grupo, Coach y motivo.',
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'El caso más común de cobranza vencida falsa', texto: 'Un niño se retiró en marzo, nadie detuvo la recurrencia, y en junio ese representante aparece con tres facturas vencidas. Contamina tu indicador de cuentas por cobrar y te puede costar la prima. **Apenas el Administrador confirme el retiro, ejecuta la detención en Zoho.** El manual no fija un plazo, pero sí manda llevar al día el control de ausencias justamente para evitar que se le genere una factura nueva a ese padre.' },
      { t: 'sub', texto: 'Ausencias: la señal temprana' },
      { t: 'p', texto: 'Por contrato, el padre debe avisar antes de retirar al niño, pero en la práctica muchos no lo hacen. Por eso el control de ausencias es tu alarma: cuando un niño acumula **dos ausencias**, el Coach debe avisarte, y tú llamas al representante. Si el niño se está retirando, lo detectas antes de que se genere la factura del mes siguiente.' },
    ],

    quiz: [
      {
        pregunta: 'La mensualidad de un niño se factura…',
        opciones: ['a mano cada mes', 'una sola vez al inscribir', 'solo cuando el padre la solicita', 'con una factura recurrente que Zoho emite automáticamente cada mes'],
        explicacion: 'Se configura un perfil recurrente mensual con la mensualidad del itinerario y centro correctos.',
        repasa: ['factura-recurrente'],
      },
      {
        pregunta: '¿Quién decide detener la factura recurrente de un niño que se va del programa?',
        opciones: ['La asistente administrativa, por su cuenta', 'El Coach del grupo', 'El Administrador del centro, y la asistente lo ejecuta en Zoho', 'El proveedor de los kits'],
        explicacion: 'La decisión es del Administrador; la ejecución en el sistema es tuya.',
        repasa: ['administrador-de-centro'],
      },
      {
        pregunta: 'Una recurrencia que no se detiene genera facturas a un padre que ya no recibe el servicio, e infla la cobranza vencida del centro.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es la cobranza vencida falsa: contamina tu indicador de cuentas por cobrar y te puede costar la prima.',
        repasa: ['factura-vencida'],
      },
      {
        pregunta: 'Si ya se generó una factura del mes que no correspondía cobrar, tú puedes anularla directamente sin consultar.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Se informa a la Administradora antes de anular o emitir nota de crédito. Esa decisión no es tuya.',
        repasa: ['anular', 'nota-de-credito'],
      },
      {
        pregunta: '¿Cuántas ausencias de un niño son la señal para que el Coach te avise y tú llames al representante?',
        opciones: ['Una ausencia', 'Cinco ausencias', 'No hay señal establecida', 'Dos ausencias'],
        explicacion: 'Dos ausencias. Es la alarma temprana para detectar un retiro antes de que se genere la factura del mes siguiente.',
      },
    ],

    drills: [
      {
        titulo: 'Drill 6 — Crear una factura recurrente y detenerla el mismo día del retiro',
        fuente: 'drills-asistente.html#d6',
        proposito: 'Que dejes la mensualidad emitiéndose sola cuando corresponde, y que la apagues el mismo día en que se confirma un retiro.',
        gradiente: 'Exige el Drill 5 aprobado. Si te cuesta escoger la mensualidad correcta, el paso que falta es el Drill 3.',
        masa: [
          'Zoho Books abierto en Ventas → Facturas recurrentes, en la organización de tu Centro.',
          'La lista de niños activos de tu Centro, impresa.',
          'El cuadro de deserciones del Centro.',
          'El formato de Calendario y Asistencia del Drive abierto, para ver ausencias.',
        ],
        pasos: [
          'Crea un perfil de factura recurrente: Ventas → Facturas recurrentes → Nueva. Cliente el representante; nombre de perfil que puedas buscar después, con el niño y el grupo; frecuencia mensual; fecha de inicio la del ciclo del grupo; artículo la mensualidad del itinerario y Centro correctos.',
          'Guarda y confirma en pantalla que quedó activa.',
          'Busca el perfil por el nombre del niño. Si no lo encuentras al primer intento, corrige el nombre del perfil hasta que sea buscable.',
          'Ahora el retiro: el Oficial te da un caso de niño retirado. Busca su perfil y detenlo o cancélalo en el mismo momento.',
          'Si ya se generó una factura del mes que no corresponde cobrar, no la anules: informa a la Administradora y espera su indicación. Redacta el mensaje de aviso frente al Oficial.',
          'Carga el retiro en el cuadro de deserciones con niño, grupo, Coach y motivo.',
          'Saca la lista completa de perfiles recurrentes activos y crúzala contra la lista de niños activos. Anota cuántos perfiles activos no tienen niño activo detrás.',
          'Abre el Calendario y Asistencia y ubica a los niños con dos ausencias. Llama al representante de uno de ellos desde el teléfono del Centro.',
        ],
        criterios: [
          'Crea un perfil recurrente completo y correcto tres veces seguidas sin consultar el manual, y encuentra cada perfil por el nombre del niño al primer intento.',
          'Entrega el cruce de perfiles activos contra niños activos con el número exacto de perfiles a detener, y detiene los que la Administradora autorice.',
          'Ante una factura ya generada de un niño retirado, se detiene y escala a la Administradora en vez de anular por su cuenta.',
          'Explica con sus palabras cómo un niño retirado en marzo aparece con tres facturas vencidas en junio, y qué le hace eso a su prima.',
        ],
        errorTipico: 'Detener la recurrencia "el lunes que viene, cuando tenga tiempo". Se delata en el cruce del paso 7: siempre aparecen perfiles activos de niños que ya no están, y todos son retiros que se dejaron para después.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-7',
    curso: 'zoho',
    orden: 20,
    roles: ['asistente'],
    titulo: 'Registrar el pago',
    duracionMin: 12,
    requiere: ['of-zoh-6'],
    fuente: ['curso-2-zoho-asistentes.html#m7', 'drills-asistente.html#d7'],

    pfv: 'El dinero que entró queda aplicado sobre su factura, con la fecha real, el mismo día.',

    masa: [
      'Zoho Books abierto en Ventas → Facturas, con una factura pendiente real en pantalla.',
      'Un comprobante de pago real (transferencia, ACH o recibo de efectivo) con su fecha visible.',
      'La bitácora de información importante del Centro, física.',
    ],

    palabras: ['pago-recibido', 'saldo', 'factura', 'cuentas-por-cobrar', 'bitacora', 'ach', 'fecha-del-pago', 'pago-parcial', 'comprobante'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'El pago se registra **sobre la factura**, nunca suelto. Una factura sin pago aplicado queda como pendiente aunque el dinero esté en el banco, y aparecerá en tu reporte de cuentas por cobrar como si el padre debiera.' },
      { t: 'sub', texto: 'Paso a paso' },
      {
        t: 'pasos',
        items: [
          'Ventas → Facturas → abre la factura del padre.',
          'Pulsa **Registrar pago**.',
          'Monto: el que efectivamente entró. Si el padre abonó parcial, registra el parcial; la factura queda con saldo.',
          'Fecha: la fecha real del pago, no la fecha en que lo estás montando.',
          'Modo de pago y cuenta de depósito: la que corresponda (efectivo, ACH, transferencia, etc.).',
          'Adjunta el comprobante si el padre lo envió.',
          'Guarda y confirma que la factura quedó en **Pagada** o con el saldo correcto.',
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'La fecha del pago importa de verdad', texto: 'Si un padre paga el 30 y tú lo montas el 2 del mes siguiente con la fecha del 2, ese cobro se cuenta en el mes equivocado y descuadra el cierre del mes anterior. Usa siempre la fecha real.' },
      { t: 'sub', texto: 'Depósitos y bitácora' },
      { t: 'p', texto: 'Todo depósito entregado se anota además en la **bitácora de información importante** del Centro, con fecha y firma del responsable. Zoho y bitácora se respaldan mutuamente: si uno falla, el otro sostiene la prueba.' },
    ],

    quiz: [
      {
        pregunta: 'Al registrar un pago, la fecha que se coloca es…',
        opciones: ['la fecha en que lo estás montando en el sistema', 'el primer día del mes', 'la fecha real en que entró el dinero', 'la fecha de vencimiento de la factura'],
        explicacion: 'La fecha real del pago, leída del comprobante. La que Zoho propone por defecto es la de hoy.',
        repasa: ['fecha-del-pago'],
      },
      {
        pregunta: 'Si un padre abona parcialmente, en Zoho se registra el monto parcial y la factura queda con saldo.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Se registra lo que entró; el resto queda como saldo de esa misma factura.',
        repasa: ['saldo', 'pago-parcial'],
      },
      {
        pregunta: '¿Qué pasa si registras un pago del día 30 con fecha del día 2 del mes siguiente?',
        opciones: ['No pasa nada, el sistema lo corrige solo', 'El cobro se cuenta en el mes equivocado y descuadra el cierre del mes anterior', 'La factura se anula', 'El padre recibe un recargo'],
        explicacion: 'El cobro cae en el mes equivocado y descuadra el cierre del mes anterior.',
      },
      {
        pregunta: 'Los depósitos entregados se anotan también en la bitácora de información importante del Centro, con fecha y firma del responsable.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Zoho y bitácora se respaldan mutuamente: si uno falla, el otro sostiene la prueba.',
        repasa: ['bitacora'],
      },
    ],

    drills: [
      {
        titulo: 'Drill 7 — Registrar el pago sobre la factura con la fecha real',
        fuente: 'drills-asistente.html#d7',
        proposito: 'Que apliques el dinero recibido sobre la factura correcta, con la fecha real del pago, y dejes el saldo como debe quedar.',
        gradiente: 'Exige el Drill 5 aprobado. Si no distingues cotización de factura, vuelve al glosario y al Drill 5.',
        masa: [
          'Zoho Books abierto en Ventas → Facturas, con una factura pendiente real en pantalla.',
          'Un comprobante de pago real (transferencia, ACH o recibo de efectivo) con su fecha visible.',
          'La bitácora de información importante del Centro, física.',
        ],
        pasos: [
          'Abre la factura del padre y verifica que es la factura correcta: cliente, niño y monto.',
          'Pulsa Registrar pago.',
          'Escribe el monto que efectivamente entró. Si el padre abonó parcial, registra el parcial.',
          'Escribe la fecha real del pago, leída del comprobante, no la de hoy.',
          'Selecciona modo de pago y cuenta de depósito que corresponda.',
          'Adjunta el comprobante.',
          'Guarda y confirma en pantalla que la factura quedó Pagada, o con el saldo exacto que debe quedar. Di el saldo en voz alta.',
          'Anota el depósito en la bitácora con fecha y firma del responsable.',
          'El Oficial te da un comprobante fechado el 30 del mes pasado. Regístralo y explica en qué mes cae ese cobro, y en cuál caería si pusieras la fecha de hoy.',
        ],
        criterios: [
          'Registra tres pagos seguidos —uno completo, uno parcial y uno de mes anterior— con la fecha real, sin consultar el manual.',
          'Dice el saldo resultante de cada factura antes de que el Oficial lo lea en pantalla, y acierta.',
          'Explica con sus palabras por qué el cobro del 30 registrado con fecha del 2 descuadra el cierre del mes anterior.',
          'El depósito queda anotado en la bitácora, con fecha y firma, sin que se lo recuerden.',
        ],
        errorTipico: 'Dejar la fecha que Zoho propone por defecto, que es la de hoy. Se delata en el paso 9: el pago del 30 aparece en el mes siguiente y ella no lo nota hasta que el Oficial le pregunta en qué mes cayó.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-8',
    curso: 'zoho',
    orden: 21,
    roles: ['asistente'],
    titulo: 'Cuentas por cobrar: el protocolo de factura vencida',
    duracionMin: 18,
    requiere: ['of-zoh-7'],
    fuente: ['curso-2-zoho-asistentes.html#m8', 'drills-asistente.html#d8'],

    pfv: 'Cartera al día: representantes paz y salvo, y las excepciones gestionadas por tramo y escaladas a tiempo.',

    masa: [
      'Zoho Books abierto en Informes → Cuentas por cobrar (antigüedad de saldos), impreso o en pantalla.',
      'El teléfono del Centro, encendido y a la mano, para las llamadas de cobranza.',
      'La tabla del protocolo día por día de este módulo, impresa.',
      'Una hoja de constancia de contactos: fecha, medio y respuesta del padre.',
    ],

    palabras: ['informe-de-antiguedad-de-saldos', 'cuentas-por-cobrar', 'factura-vencida', 'paz-y-salvo', 'arreglo-de-pago', 'cuentas-incobrables', 'coordinador-operativo', 'prima-de-produccion', 'cierre-de-nivel'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'Este es el módulo del que depende tu prima de producción. La condición es explícita: **no tener 4 clientes con más de dos facturas generadas sin pagar** (máximo tres clientes). Y el seguimiento de cuentas por cobrar es una tarea **semanal**, no de fin de mes.' },
      { t: 'sub', texto: 'El protocolo, día por día' },
      {
        t: 'tabla',
        encabezados: ['Etapa', 'Días', 'Qué haces'],
        filas: [
          ['Factura emitida', '1 a 15', 'Avisas al acudiente por llamada o WhatsApp que su factura fue emitida y que es importante estar paz y salvo para seguir recibiendo el servicio.'],
          ['Vencida 1–15', 'día 16 al 30', 'Informas a la Administradora la situación del acudiente. Informas al acudiente que no podrá asistir a clase hasta estar paz y salvo. La Administradora decide si hay acuerdo de pago o retiro del programa deteniendo la factura recurrente. Si hay acuerdo, se deja evidencia y se notifica de inmediato al Coordinador Operativo.'],
          ['Vencida 15–30', 'día 31 al 45', 'Das seguimiento sujeto al acuerdo de pago. Si no es efectivo, colocas los datos del cliente en el Drive de cuentas incobrables. El Coordinador Operativo verifica que esté cargado.'],
          ['Vencida 30–45', 'día 46 al 61', 'El Coordinador Operativo pasa la lista al personal de cobro. Ya no está en tus manos, pero sí la evidencia de todo lo anterior.'],
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'Tono', texto: 'Todo contacto con el cliente es amigable, siempre buscando la forma de ayudar a que se ponga al día. No eres cobradora: eres la persona que le resuelve al padre cómo seguir en el programa.' },
      { t: 'sub', texto: 'Paso a paso: tu rutina semanal' },
      {
        t: 'pasos',
        items: [
          'Informes → Cuentas por cobrar (antigüedad de saldos).',
          'Ordena por días de vencimiento.',
          'Clasifica cada caso en una de las cuatro etapas de la tabla.',
          'Ejecuta la acción de la etapa. Deja constancia de cada contacto: fecha, medio y qué respondió el padre.',
          'Antes del cierre de nivel, envía el correo con **15 días de anticipación** avisando que deben estar paz y salvo para presentar el examen y el cierre.',
        ],
      },
      { t: 'sub', texto: 'Errores que cuestan dinero' },
      {
        t: 'lista',
        items: [
          'Dejar la cobranza para fin de mes. Para entonces ya hay clientes en día 45.',
          'Decidir tú un acuerdo de pago. Esa decisión es de la Administradora, y sin su visto bueno no tiene respaldo.',
          'Hacer el acuerdo y no dejar evidencia ni notificar al Coordinador Operativo.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'El seguimiento de cuentas por cobrar es una tarea de frecuencia…',
        opciones: ['diaria', 'semanal', 'mensual', 'trimestral'],
        explicacion: 'Semanal. Dejarla para fin de mes deja clientes llegando al día 45 sin gestión.',
        repasa: ['cuentas-por-cobrar'],
      },
      {
        pregunta: 'La condición de la prima de producción mensual para el asistente administrativo en cuentas por cobrar es…',
        opciones: ['no tener 4 clientes con más de dos facturas generadas sin pagar, es decir máximo tres clientes', 'no tener ninguna factura vencida', 'tener menos de diez facturas vencidas', 'cobrar el 100 por ciento de las facturas del mes'],
        explicacion: 'Máximo tres clientes con más de dos facturas generadas sin pagar. El cuarto ya te saca de la prima.',
        repasa: ['prima-de-produccion'],
      },
      {
        pregunta: 'Con una factura emitida entre el día 1 y el día 15, ¿qué haces?',
        opciones: ['Le informas que no puede asistir a clase', 'Lo pasas a cuentas incobrables', 'Lo pasas al personal de cobro', 'Informas al acudiente por llamada o WhatsApp que su factura fue emitida y que es importante estar paz y salvo'],
        explicacion: 'Etapa 1: aviso de factura emitida y recordatorio de paz y salvo para seguir recibiendo el servicio.',
        repasa: ['paz-y-salvo'],
      },
      {
        pregunta: 'Cuando la factura lleva vencida entre 1 y 15 días, es decir del día 16 al 30, ¿quién decide si se hace un acuerdo de pago o se retira al niño del programa?',
        opciones: ['El Asistente Administrativo', 'El Coordinador Operativo', 'La Administradora del Centro', 'El Coach del grupo'],
        explicacion: 'Tú informas la situación; la decisión es de la Administradora. Si hay acuerdo, se deja evidencia y se notifica de inmediato al Coordinador Operativo.',
        repasa: ['arreglo-de-pago'],
      },
      {
        pregunta: 'Con la factura vencida entre 15 y 30 días, es decir del día 31 al 45, si el acuerdo no es efectivo debes…',
        opciones: ['pasar la lista al personal de cobro', 'colocar los datos del cliente en el Drive de cuentas incobrables', 'anular la factura', 'aplicar un descuento del 25 por ciento'],
        explicacion: 'Los datos van al Drive de cuentas incobrables, y el Coordinador Operativo verifica que estén cargados.',
        repasa: ['cuentas-incobrables'],
      },
      {
        pregunta: 'Con la factura vencida entre 30 y 45 días, es decir del día 46 al 61, ¿quién pasa la lista al personal de cobro?',
        opciones: ['El Coordinador Operativo', 'El Asistente Administrativo', 'La Administradora', 'La Junta Directiva'],
        explicacion: 'Ya no está en tus manos, pero sí la evidencia de todo lo anterior.',
        repasa: ['coordinador-operativo'],
      },
      {
        pregunta: 'Si se llega a un acuerdo de pago, se debe dejar evidencia y notificar de inmediato al Coordinador Operativo.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Un acuerdo sin evidencia y sin notificación no tiene respaldo.',
      },
      {
        pregunta: 'El aviso a los padres de que deben estar paz y salvo para el examen y cierre de nivel se envía con cuántos días de anticipación?',
        opciones: ['3 días', '30 días', '15 días', 'El mismo día del cierre'],
        explicacion: '15 días de anticipación, antes del cierre de nivel.',
        repasa: ['cierre-de-nivel'],
      },
      {
        pregunta: 'El tono en todo contacto de cobranza con el cliente debe ser amigable, buscando siempre la forma de ayudarlo a ponerse al día.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'No eres cobradora: eres la persona que le resuelve al padre cómo seguir en el programa.',
      },
    ],

    drills: [
      {
        titulo: 'Drill 8 — Clasificar la antigüedad de saldos y ejecutar el protocolo del día',
        fuente: 'drills-asistente.html#d8',
        proposito: 'Que conviertas el informe de antigüedad de saldos en acciones concretas de hoy, cliente por cliente, según la etapa en que cada uno está.',
        gradiente: 'Exige los Drills 6 y 7 aprobados. Si en el informe aparecen vencidos que no son deudas reales, el paso que falta es el Drill 6. Si aparecen pagos que sí entraron, el paso que falta es el Drill 7. En cualquiera de los dos casos, se devuelve; este drill no se repite más fuerte.',
        masa: [
          'Zoho Books abierto en Informes → Cuentas por cobrar (antigüedad de saldos), impreso o en pantalla.',
          'El teléfono del Centro, encendido y a la mano, para las llamadas de cobranza.',
          'La tabla del protocolo día por día del Módulo 8, impresa.',
          'Una hoja de constancia de contactos: fecha, medio y respuesta del padre.',
        ],
        pasos: [
          'Saca el informe de antigüedad de saldos de tu Centro y ordénalo por días de vencimiento.',
          'Clasifica cada cliente vencido en una de las cuatro etapas: emitida 1–15 · vencida 1–15 (día 16 al 30) · vencida 15–30 (día 31 al 45) · vencida 30–45 (día 46 al 61).',
          'Escribe al lado de cada uno la acción concreta que te toca hoy con ese cliente.',
          'Toma el teléfono y ejecuta las llamadas de la etapa 1: avisa al acudiente que su factura fue emitida y que es importante estar paz y salvo para continuar recibiendo el servicio. El Oficial escucha la llamada.',
          'Para cada cliente en etapa 2, redacta el aviso a la Administradora sobre la situación del acudiente e informa al acudiente que no podrá asistir a clase hasta estar paz y salvo. La decisión de acuerdo de pago o retiro no la tomas tú.',
          'Para cada cliente en etapa 3 sin seguimiento efectivo, carga sus datos en el Drive de cuentas incobrables.',
          'Deja constancia escrita de cada contacto: fecha, medio y qué respondió el padre.',
          'Cuenta cuántos clientes tienen más de dos facturas generadas sin pagar y compáralo contra el límite: no tener 4 clientes en esa situación, máximo tres.',
          'Redacta el correo de cierre de nivel que se envía con 15 días de anticipación avisando que deben estar paz y salvo para el examen y el cierre.',
        ],
        criterios: [
          'Clasifica correctamente todos los clientes del informe real en sus cuatro etapas, sin mirar la tabla impresa, dos semanas seguidas.',
          'Hace al menos tres llamadas de cobranza delante del Oficial con tono amigable, buscando cómo ayudar al cliente a ponerse al día — el Oficial las escucha y no oye tono de cobradora.',
          'Dice de memoria el número de clientes de su Centro con más de dos facturas sin pagar y si está dentro o fuera del límite.',
          'Ante un padre que pide rebaja, no ofrece nada: escala a la Administradora en la misma llamada.',
          'La hoja de constancia queda con fecha, medio y respuesta de cada contacto del día.',
        ],
        errorTipico: 'Hacer el informe y no hacer las llamadas: la clasificación queda perfecta en el papel y el teléfono no se levantó. Se delata en la hoja de constancia vacía y en que la semana siguiente los mismos clientes subieron de etapa.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-9',
    curso: 'zoho',
    orden: 22,
    roles: ['asistente'],
    titulo: 'Descuentos autorizados y salida de niños',
    duracionMin: 14,
    requiere: ['of-zoh-8'],
    fuente: ['curso-2-zoho-asistentes.html#m9', 'drills-asistente.html#d9'],

    pfv: 'Cada motivo de salida queda clasificado y escalado, y en Zoho sólo se aplica el descuento que la Administradora autorizó por escrito.',

    masa: [
      'Zoho Books abierto con una factura vencida real en pantalla.',
      'La tabla de categorías de salida y la de herramientas de no salida de este módulo, impresas.',
      'El teléfono del Centro.',
      'El cuadro de deserciones del Centro.',
    ],

    palabras: ['herramientas-de-no-salida', 'arreglo-de-pago', 'nota-de-credito', 'factura-vencida', 'desercion', 'clase-de-reforzamiento', 'clase-de-reposicion', 'coordinador-operativo', 'tope-mensual', 'cuadro-de-deserciones'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'Cuando un padre quiere retirar al niño, tu trabajo es **clasificar el motivo** y pasar el caso. Las herramientas de retención las aplica la Administradora, no tú.' },
      { t: 'sub', texto: 'Tu parte: clasificar' },
      {
        t: 'tabla',
        encabezados: ['Categoría', 'Lo que dice el padre'],
        filas: [
          ['No entiende la técnica', 'El niño asiste, pero no entiende.'],
          ['Pérdida de clase', 'El niño no asiste a clase.'],
          ['Económico', 'No puedo pagar la mensualidad.'],
          ['Horario', 'Tengo otra actividad, o no tengo quién lleve al niño.'],
        ],
      },
      { t: 'sub', texto: 'La parte de la Administradora: herramientas de no salida' },
      {
        t: 'tabla',
        encabezados: ['Motivo', 'Herramienta autorizada'],
        filas: [
          ['No entiende la técnica', '1 a 2 clases de reposición gratis'],
          ['Pérdida de clase', '1 a 2 clases de reposición gratis'],
          ['Económico', 'Oferta 1: 10 % de descuento en factura vencida (todas las que desee)'],
          ['Económico', 'Oferta 2: 15 % en factura vencida (máximo 3 ofertas al mes)'],
          ['Económico', 'Oferta 3: 25 % en factura vencida (máximo 2 ofertas al mes)'],
          ['Económico', 'Oferta 4: 25 % en factura vencida más 10 % para terminar el nivel (máximo 1 al mes)'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'Nunca ofrezcas un descuento por tu cuenta', texto: 'Los topes mensuales existen porque cada oferta tiene un costo. Si prometes un 25 % que ya se agotó ese mes, el Centro tiene que cumplirlo igual y pierde margen.' },
      { t: 'sub', texto: 'Paso a paso: aplicar el descuento en Zoho' },
      {
        t: 'pasos',
        items: [
          'La Administradora te confirma por escrito qué oferta autorizó y a qué factura.',
          'Abre la factura vencida.',
          'Aplica el descuento autorizado sobre la factura (o emite la nota de crédito, según indique la Administradora).',
          'Deja la autorización guardada como evidencia.',
          'Notifica al Coordinador Operativo el acuerdo alcanzado.',
        ],
      },
      { t: 'sub', texto: 'Si el retiro se confirma' },
      {
        t: 'pasos',
        items: [
          'Detén la factura recurrente en Zoho **una vez que el Administrador tome la decisión de retiro**. La decisión es suya; la ejecución en el sistema es tuya.',
          'Pide al padre retroalimentación del programa y el motivo del retiro.',
          'Carga el caso en el cuadro de deserciones: niño, grupo, Coach y motivo.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'Un padre dice que el niño asiste pero no entiende la técnica. ¿En qué categoría clasificas el caso?',
        opciones: ['Niño no entiende la técnica', 'Pérdida de clase', 'Económico', 'Horario'],
        explicacion: 'El niño asiste pero no entiende: categoría "no entiende la técnica". Pérdida de clase es cuando el niño no asiste.',
      },
      {
        pregunta: 'Para los motivos de no entender la técnica o pérdida de clase, la herramienta de no salida autorizada es…',
        opciones: ['un descuento del 25 por ciento', 'de 1 a 2 clases de reposición gratis', 'el retiro inmediato', 'cambiar al niño de Coach'],
        explicacion: 'De 1 a 2 clases de reposición gratis, y las aplica la Administradora.',
        repasa: ['clase-de-reposicion', 'herramientas-de-no-salida'],
      },
      {
        pregunta: 'La Oferta 3 del motivo económico corresponde a un descuento del 25 por ciento en factura vencida con un máximo de…',
        opciones: ['1 oferta al mes', '3 ofertas al mes', '2 ofertas al mes', 'sin límite'],
        explicacion: 'Oferta 3: 25 % con máximo 2 ofertas al mes. La Oferta 4, que suma 10 % para terminar el nivel, tiene máximo 1 al mes.',
        repasa: ['tope-mensual'],
      },
      {
        pregunta: 'La Oferta 1 del motivo económico es un 10 por ciento de descuento en factura vencida y se puede aplicar a todas las facturas que el padre desee.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Es la única sin tope mensual. La 2, la 3 y la 4 sí lo tienen: 3, 2 y 1 al mes.',
      },
      {
        pregunta: 'El Asistente Administrativo puede ofrecer un descuento por su cuenta si ve que el padre se va a retirar.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Nunca. Si prometes un porcentaje que ya se agotó ese mes, el Centro tiene que cumplirlo igual y pierde margen.',
      },
      {
        pregunta: '¿Quién aplica las herramientas de retención o no salida?',
        opciones: ['El Asistente Administrativo', 'La Administradora del Centro', 'El Coach', 'El Coordinador Operativo'],
        explicacion: 'Tú clasificas el motivo y escalas el caso; ella autoriza por escrito qué oferta y sobre cuál factura.',
        repasa: ['herramientas-de-no-salida'],
      },
    ],

    drills: [
      {
        titulo: 'Drill 9 — Clasificar un retiro y aplicar el descuento autorizado',
        fuente: 'drills-asistente.html#d9',
        proposito: 'Que clasifiques el motivo del retiro, escales el caso, y apliques en Zoho únicamente el descuento que la Administradora autorizó por escrito.',
        gradiente: 'Exige el Drill 8 aprobado. Si no distingues las etapas de vencimiento, vuelve al Drill 8 antes de tocar un descuento.',
        masa: [
          'Zoho Books abierto con una factura vencida real en pantalla.',
          'La tabla de categorías de salida y la de herramientas de no salida del Módulo 9, impresas.',
          'El teléfono del Centro.',
          'El cuadro de deserciones del Centro.',
        ],
        pasos: [
          'El Oficial hace de representante y te dice una frase de salida. Clasifícala en voz alta en una de las cuatro categorías: no entiende la técnica · pérdida de clase · económico · horario.',
          'Repite con cinco frases distintas hasta clasificarlas todas al vuelo.',
          'Con el caso económico, di en voz alta qué no puedes ofrecerle tú y a quién escalas el caso.',
          'Redacta el mensaje de escalamiento a la Administradora con el caso completo: niño, grupo, facturas vencidas y lo que dijo el padre.',
          'Recibe la autorización por escrito de la Administradora indicando qué oferta autorizó y sobre cuál factura.',
          'Abre esa factura vencida y aplica el descuento autorizado, o emite la nota de crédito según lo que la Administradora indique.',
          'Guarda la autorización como evidencia junto al documento.',
          'Notifica al Coordinador Operativo el acuerdo alcanzado.',
          'Si el retiro se confirma: detén la factura recurrente el mismo día, pide al padre su retroalimentación del programa y el motivo, y carga el caso en el cuadro de deserciones con niño, grupo, Coach y motivo.',
        ],
        criterios: [
          'Clasifica cinco frases de salida seguidas en su categoría correcta, sin mirar la tabla.',
          'Ante la presión del Oficial haciendo de padre que insiste ("dígame usted qué me puede hacer"), no ofrece ningún porcentaje y escala. Lo sostiene tres veces seguidas.',
          'Nombra las cuatro ofertas económicas y sus topes mensuales: 10 % todas las que desee · 15 % máximo 3 al mes · 25 % máximo 2 al mes · 25 % más 10 % para terminar el nivel, máximo 1 al mes.',
          'Aplica el descuento en Zoho solo con la autorización escrita a la vista, y deja la evidencia guardada.',
          'Explica con sus palabras qué le pasa al margen del Centro si promete un 25 % que ya se agotó ese mes.',
        ],
        errorTipico: 'Adelantarse por buena voluntad: "no se preocupe, seguro le podemos dar un descuentito". Se delata en el paso 3, cuando ante el padre insistente ofrece algo antes de escalar; el Centro queda obligado a cumplirlo.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-10',
    curso: 'zoho',
    orden: 23,
    roles: ['asistente'],
    titulo: 'Proveedores, gastos y caja menuda',
    duracionMin: 14,
    requiere: ['of-zoh-9'],
    fuente: ['curso-2-zoho-asistentes.html#m10', 'drills-asistente.html#d10'],

    pfv: 'Centro operativo y abastecido: fondo de caja menuda cuadrado, cada gasto con su recibo adjunto y cada proveedor pagado con su soporte.',

    masa: [
      'El fondo de caja menuda físico, contado, con todos sus recibos.',
      'Zoho Books abierto en Compras → Gastos y en Compras → Facturas de proveedor.',
      'Tres cotizaciones de proveedor, reales o de práctica, para una necesidad de tu Centro.',
      'El calendario de mantenimiento del Centro y el recorrido físico por las instalaciones.',
    ],

    palabras: ['caja-menuda', 'gasto', 'reembolso', 'factura-de-proveedor', 'proveedor', 'bitacora', 'cotizacion', 'soporte', 'comprobante', 'fondo-fijo'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'El criterio del Centro es de **prevención, no de corrección**: hay un calendario de mantenimiento y proveedores preestablecidos. El proveedor de mantenimiento (pintura, instalaciones, reparaciones) es **Suplidores del Istmo, S.A.** La Administradora puede buscar otro proveedor en caso de faltas, atrasos o trabajo inadecuado, siempre avisando antes a la Junta Directiva.' },
      { t: 'sub', texto: 'El flujo completo' },
      {
        t: 'pasos',
        items: [
          'Confección del calendario de mantenimiento.',
          '**Cotización** — se piden a varios proveedores y se comparan.',
          'Gestión de adquisición.',
          'Evaluación de cumplimiento.',
          'Cancelación al proveedor.',
          'Seguimiento del informe de control de pagos.',
        ],
      },
      { t: 'sub', texto: 'El cuadro comparativo de cotizaciones' },
      { t: 'p', texto: 'No se compara solo por precio. Se compara precio, garantía y calidad, y se deja escrita la recomendación con su razón. Ejemplo del formato:' },
      {
        t: 'tabla',
        encabezados: ['Artículo / servicio', 'Proveedor A', 'Proveedor B', 'Proveedor C'],
        filas: [
          ['Escritorio 3×4 de madera', '25,50', '34,70', '28,30'],
          ['Observación: se recomienda el proveedor C, ya que su garantía es mayor y su calidad superior.', '', '', ''],
        ],
      },
      { t: 'sub', texto: 'Caja menuda' },
      {
        t: 'lista',
        items: [
          'Es para **compras menores**: máximo B/.45,00 por compra.',
          'Cada compra hecha con el fondo debe reponerse mediante un **reembolso registrado en el sistema**, para que el fondo esté siempre completo y la compra quede contabilizada.',
          'La entrega inicial del fondo se documenta con su formato firmado.',
        ],
      },
      { t: 'sub', texto: 'Paso a paso en Zoho: gasto y reembolso de caja menuda' },
      {
        t: 'pasos',
        items: [
          'Compras → Gastos → Nuevo gasto.',
          'Fecha real de la compra, categoría de gasto y monto.',
          'Proveedor si aplica.',
          '**Adjunta la foto del recibo.** Sin soporte, el gasto no se repone.',
          'Guarda y anota la reposición en la bitácora.',
        ],
      },
      { t: 'sub', texto: 'Paso a paso en Zoho: pago a proveedor' },
      {
        t: 'pasos',
        items: [
          'Compras → Facturas de proveedor → registra la factura recibida.',
          'Adjunta la factura del proveedor.',
          'Registra el pago cuando se cancele, en la fecha real.',
        ],
      },
    ],

    quiz: [
      {
        pregunta: 'El criterio del Centro frente al mantenimiento es…',
        opciones: ['de prevención, no de corrección', 'de corrección, cuando algo se daña', 'de reemplazo anual', 'a discreción del Coach'],
        explicacion: 'Por eso existe un calendario de mantenimiento y proveedores preestablecidos.',
      },
      {
        pregunta: 'El proveedor establecido de los centros ALOHA para mantenimiento, pintura, instalaciones y reparaciones es…',
        opciones: ['C y C Soluciones Integrales', 'Suplidores del Istmo, S.A.', 'Viralsolutionss Inc', 'Altavia Group'],
        explicacion: 'Suplidores del Istmo, S.A. Cambiarlo es decisión de la Administradora, con previo aviso a la Junta Directiva.',
        repasa: ['proveedor'],
      },
      {
        pregunta: 'La Administradora puede buscar otro proveedor en caso de faltas, atrasos o trabajo inadecuado, siempre con previo aviso a la Junta Directiva.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Tú documentas la falla en la evaluación de cumplimiento; el cambio de proveedor no es decisión tuya.',
      },
      {
        pregunta: 'El monto máximo de una compra menor con caja menuda es…',
        opciones: ['25,00', '100,00', '500,00', '45,00'],
        explicacion: 'B/.45,00 por compra. Por encima de eso ya no es caja menuda.',
        repasa: ['caja-menuda'],
      },
      {
        pregunta: 'Las compras hechas con caja menuda se reponen mediante…',
        opciones: ['un reembolso registrado en el sistema', 'una nota escrita en el cuaderno', 'el pago de la siguiente quincena', 'no se reponen'],
        explicacion: 'El reembolso registrado deja el fondo completo y la compra contabilizada.',
        repasa: ['reembolso'],
      },
      {
        pregunta: 'Al cargar un gasto en Zoho, adjuntar la foto del recibo es opcional.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Sin soporte, el gasto no se repone.',
        repasa: ['soporte', 'adjunto'],
      },
      {
        pregunta: 'En el cuadro comparativo de cotizaciones, la elección se hace…',
        opciones: ['siempre por el precio más bajo', 'siempre por el proveedor más conocido', 'comparando precio, garantía y calidad, con la recomendación escrita y su razón', 'por orden de llegada de las cotizaciones'],
        explicacion: 'Precio, garantía y calidad, con la observación escrita que sustenta la recomendación.',
      },
    ],

    drills: [
      {
        titulo: 'Drill 10 — Comparar cotizaciones de proveedor y reponer la caja menuda',
        fuente: 'drills-asistente.html#d10',
        proposito: 'Que compares proveedores por precio, garantía y calidad con tu recomendación escrita, y que dejes el fondo de caja menuda completo y contabilizado.',
        gradiente: 'Exige el Drill 2 aprobado. Si el gasto puede caer en la organización equivocada, no estás lista para este drill: vuelve al Drill 2.',
        masa: [
          'El fondo de caja menuda físico, contado, con todos sus recibos.',
          'Zoho Books abierto en Compras → Gastos y en Compras → Facturas de proveedor.',
          'Tres cotizaciones de proveedor, reales o de práctica, para una necesidad de tu Centro.',
          'El calendario de mantenimiento del Centro y el recorrido físico por las instalaciones.',
        ],
        pasos: [
          'Recorre físicamente el Centro con el calendario de mantenimiento en la mano y anota las necesidades reales que ves.',
          'Escoge una necesidad y pide tres cotizaciones. Recuerda que el proveedor de mantenimiento de los Centros —pintura, instalaciones, reparaciones— es Suplidores del Istmo, S.A.',
          'Arma el cuadro comparativo con artículo o servicio y las tres columnas de proveedor.',
          'Escribe la observación con tu recomendación y su razón: no solo el precio, también garantía y calidad.',
          'Cuenta el fondo de caja menuda y suma los recibos. Fondo más recibos debe dar el monto original del fondo. Di la diferencia en voz alta si la hay.',
          'Toma un recibo de compra menor. Verifica que no pase de B/.45,00.',
          'Registra ese gasto: Compras → Gastos → Nuevo gasto, con fecha real de la compra, categoría, monto, proveedor si aplica, y la foto del recibo adjunta.',
          'Guarda y anota la reposición en la bitácora.',
          'Registra una factura de proveedor recibida, adjunta el documento del proveedor y registra su pago en la fecha real de cancelación.',
        ],
        criterios: [
          'Entrega el cuadro comparativo con tres proveedores y una recomendación escrita que menciona precio, garantía y calidad — no solo el más barato.',
          'Cuadra el fondo de caja menuda: fondo más recibos igual al monto original. Si no cuadra, encuentra la diferencia y dice su causa.',
          'Registra tres gastos seguidos con el recibo adjunto en todos. Ningún gasto queda guardado sin soporte.',
          'Detecta y rechaza una compra por encima de B/.45,00 presentada como caja menuda.',
        ],
        errorTipico: 'Registrar el gasto "y después adjunto el recibo". Se delata al cuadrar el fondo: hay gastos en Zoho sin soporte y recibos sueltos sin registrar, y la reposición no se puede sustentar.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-11',
    curso: 'zoho',
    orden: 24,
    roles: ['asistente'],
    titulo: 'Nómina de Coaches: la tarea del 13 y del 28',
    duracionMin: 18,
    requiere: ['of-zoh-10'],
    fuente: ['curso-2-zoho-asistentes.html#m11', 'drills-asistente.html#d11'],

    pfv: 'Todos los pagos de Coach del mes montados en Zoho con su factura de servicio adjunta, antes del 13 y del 28.',

    masa: [
      'Una factura de servicio real de un Coach, en la mano o en pantalla.',
      'Zoho Books abierto en Compras → Facturas de proveedor.',
      'Las listas de asistencia firmadas por los Coaches con la hora de llegada anotada.',
      'El calendario del mes con los días 13, 15, 28 y 30 marcados.',
    ],

    palabras: ['nomina', 'factura-de-servicio-del-coach', 'digito-verificador', 'factura-de-proveedor', 'bono-por-puntualidad', 'grupo-compartido', 'clase-de-reforzamiento', 'planilla', 'ach', 'coach-auxiliar', 'tolerancia'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'Esta es, textualmente, tu responsabilidad según el manual: **realizar y montar en Zoho los pagos del mes**. La nómina de Coaches y el pago de proveedores se hacen los días **15 y 30** de cada mes, y el proceso debe estar listo **antes del día 13 y del 28**.' },
      { t: 'sub', texto: 'Reparto de responsabilidades' },
      {
        t: 'tabla',
        encabezados: ['Quién', 'Qué hace'],
        filas: [
          ['Tú (Asistente)', 'Realizas y montas los pagos del mes en Zoho, con la factura de servicio de cada Coach adjunta.'],
          ['Administradora', 'Verifica la nómina, envía a cada Coach su factura para que confirme que el desglose está correcto, y se asegura de que los montos sean los correctos.'],
        ],
      },
      { t: 'sub', texto: 'La factura de servicio del Coach: exigencia del auditor' },
      { t: 'p', texto: 'Cada pago de Coach debe estar sustentado con su factura de servicio. La factura debe contener como mínimo: **nombre, cédula y dígito verificador**. Se le solicita al Coach **al momento de la revisión del pago de la nómina**, y se adjunta como documento dentro de Zoho. Sin ese adjunto, el pago queda observado en auditoría.' },
      { t: 'sub', texto: 'Lo que compone el pago de un Coach' },
      {
        t: 'lista',
        items: [
          'Pago por grupo según la cantidad de niños (base de 10 niños en los casos que aplica).',
          'Grupos compartidos: al Coach principal se le paga por 10 niños base; al auxiliar, por los niños restantes (17 en adelante) o B/.10,00 la hora (grupos de 13 a 16).',
          'Clases de reforzamiento impartidas: no tienen costo para el padre, **pero sí se le pagan al Coach**.',
          '**Bono por puntualidad**, cuando corresponde: el Coach debe llegar 20 minutos antes del inicio de su clase, con tolerancia de 15 minutos. Con un grupo asignado, el bono es de B/.15,00 mensuales.',
        ],
      },
      { t: 'p', texto: 'El bono sale del control de asistencia y puntualidad que tú llevas: le entregas al Coach la lista de asistencia del grupo, él firma y tú anotas la hora de llegada. De ahí sale el **informe de puntualidad quincenal** que le envías a la Administradora.' },
      { t: 'sub', texto: 'Paso a paso' },
      {
        t: 'pasos',
        items: [
          'Del 1 al 12 (y del 16 al 27): reúne las facturas de servicio de los Coaches y el control de puntualidad.',
          'Antes del 13 (y del 28): monta en Zoho las facturas de proveedor de cada Coach con su desglose.',
          'Adjunta la factura de servicio de cada uno.',
          'Entrega a la Administradora para verificación.',
          'La Administradora envía a cada Coach su factura para confirmación.',
          'El 15 (y el 30): se ejecutan los pagos y se registran en Zoho en la fecha real.',
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'Pagos a cuenta de un tercero', texto: 'Si un colaborador pide que su pago se haga por ACH a una cuenta que no es suya, tiene que existir una **autorización escrita y firmada por él**, archivada en su file. Sin ese documento, el pago no se hace.' },
    ],

    quiz: [
      {
        pregunta: 'La nómina de Coaches y el pago de proveedores se realizan los días…',
        opciones: ['13 y 28 de cada mes', '15 y 30 de cada mes', '1 y 15 de cada mes', 'el último día hábil del mes'],
        explicacion: 'Los pagos se ejecutan el 15 y el 30. El 13 y el 28 son las fechas en que el proceso ya debe estar montado.',
        repasa: ['nomina'],
      },
      {
        pregunta: 'El proceso de nómina debe estar realizado y montado en Zoho antes de los días…',
        opciones: ['13 y 28', '15 y 30', '10 y 25', '5 y 20'],
        explicacion: 'Antes del 13 y del 28, para que la Administradora alcance a verificar y los Coaches a confirmar el desglose.',
      },
      {
        pregunta: '¿Quién es responsable de realizar y montar en Zoho los pagos del mes?',
        opciones: ['La Administradora del Centro', 'El Coordinador Operativo', 'La Junta Directiva', 'El Asistente Administrativo'],
        explicacion: 'Es tu función textual en el manual: realizar y montar en Zoho los pagos del mes.',
      },
      {
        pregunta: '¿Quién verifica la nómina y envía a cada Coach su factura para que confirme el desglose?',
        opciones: ['El Asistente Administrativo', 'El auditor', 'La Administradora del Centro', 'El Master Coach'],
        explicacion: 'Tú montas; ella verifica, envía y confirma que los montos sean los correctos.',
      },
      {
        pregunta: 'La factura de servicio de cada Coach debe contener como mínimo…',
        opciones: ['solo el nombre', 'nombre, cédula y dígito verificador', 'nombre y número de grupo', 'nombre y cuenta bancaria'],
        explicacion: 'Nombre, cédula y dígito verificador. Es exigencia del auditor, y se adjunta dentro de Zoho.',
        repasa: ['digito-verificador', 'factura-de-servicio-del-coach'],
      },
      {
        pregunta: 'Para recibir el bono por puntualidad, el Coach debe llegar…',
        opciones: ['a la hora exacta de inicio', '30 minutos antes, sin tolerancia', '10 minutos antes', '20 minutos antes del inicio de su clase, con una tolerancia de 15 minutos'],
        explicacion: '20 minutos antes, con 15 minutos de tolerancia. El dato sale de la lista firmada donde tú anotas la hora de llegada.',
        repasa: ['bono-por-puntualidad', 'tolerancia'],
      },
      {
        pregunta: 'El bono por puntualidad perfecta de un Coach con un solo grupo asignado es de…',
        opciones: ['B/.25,00 mensuales', 'B/.10,00 mensuales', 'B/.15,00 mensuales', 'B/.50,00 mensuales'],
        explicacion: 'B/.15,00 mensuales con un grupo asignado.',
        repasa: ['bono-por-puntualidad'],
      },
      {
        pregunta: 'Las clases de reforzamiento no tienen costo para el padre, pero sí se le pagan al Coach que las imparte.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Entran en el desglose del pago del Coach aunque el padre no pague nada por ellas.',
        repasa: ['clase-de-reforzamiento'],
      },
      {
        pregunta: 'En un grupo compartido de 13 a 16 niños, al Coach auxiliar se le paga…',
        opciones: ['por los niños restantes', 'por 10 niños base', 'el mismo monto que al Coach principal', 'B/.10,00 la hora'],
        explicacion: 'B/.10,00 la hora en grupos de 13 a 16. De 17 niños en adelante se le paga por los niños restantes.',
        repasa: ['grupo-compartido', 'coach-auxiliar'],
      },
      {
        pregunta: 'Si un colaborador pide que su pago por ACH vaya a una cuenta que no es suya, ¿qué se requiere?',
        opciones: ['Una autorización escrita y firmada por él, archivada en su file', 'Un mensaje de WhatsApp del colaborador', 'La autorización verbal de la Administradora', 'Nada, se puede pagar directamente'],
        explicacion: 'Autorización escrita y firmada por él, archivada en su file. Sin ese documento, el pago no se hace.',
        repasa: ['file-del-colaborador', 'ach'],
      },
    ],

    drills: [
      {
        titulo: 'Drill 11 — Montar la nómina de un Coach con su factura de servicio adjunta',
        fuente: 'drills-asistente.html#d11',
        proposito: 'Que dejes montado en Zoho el pago de un Coach, con su desglose correcto y su factura de servicio adjunta, antes del día 13 y del 28.',
        gradiente: 'Exige el Drill 10 aprobado. Si te enredas montando una factura de proveedor, ese es el paso que falta.',
        masa: [
          'Una factura de servicio real de un Coach, en la mano o en pantalla.',
          'Zoho Books abierto en Compras → Facturas de proveedor.',
          'Las listas de asistencia firmadas por los Coaches con la hora de llegada anotada.',
          'El calendario del mes con los días 13, 15, 28 y 30 marcados.',
        ],
        pasos: [
          'Toma la factura de servicio del Coach y verifica que traiga como mínimo nombre, cédula y dígito verificador. Si le falta uno, devuélvela y pídesela completa en la revisión de la nómina.',
          'Arma el desglose del pago: pago por grupo según la cantidad de niños; en grupos compartidos, al principal 10 niños base y al auxiliar los restantes de 17 niños en adelante, o B/.10,00 la hora en grupos de 13 a 16; y las clases de reforzamiento impartidas, que no tienen costo para el padre pero sí se le pagan al Coach.',
          'Saca el bono por puntualidad de las listas firmadas: el Coach debe llegar 20 minutos antes del inicio de su clase, con 15 minutos de tolerancia. Con un grupo asignado, B/.15,00 mensuales; B/.5,00 por cada grupo adicional.',
          'Monta en Zoho la factura de proveedor del Coach con ese desglose.',
          'Adjunta la factura de servicio al documento en Zoho.',
          'Entrega la nómina a la Administradora para verificación, para que ella envíe a cada Coach su factura y confirme el desglose.',
          'Arma tu informe de puntualidad quincenal y envíaselo a la Administradora.',
          'El día 15 (o el 30), registra el pago en Zoho con la fecha real de ejecución.',
          'El Oficial te presenta el caso de un colaborador que pide su pago por ACH a una cuenta que no es suya. Di qué documento exiges antes de hacer ese pago y dónde se archiva.',
        ],
        criterios: [
          'Monta tres pagos de Coach seguidos, todos con factura de servicio adjunta y con nombre, cédula y dígito verificador verificados. Ningún pago queda sin adjunto.',
          'Calcula el desglose de un grupo compartido de 18 niños y de uno de 14 niños, y acierta en ambos sin mirar el manual.',
          'Dice sin dudar qué debe estar listo el 13, qué el 15, qué el 28 y qué el 30.',
          'Ante el caso del pago a un tercero, exige la autorización escrita y firmada por el colaborador, archivada en su file, y no monta el pago sin ella.',
          'Reporta cuántos Coaches de su Centro tienen factura de servicio adjunta en el último pago y cuántos no.',
        ],
        errorTipico: 'Montar la nómina el mismo 15 porque "los pagos son el 15". Se delata en el calendario: el proceso debe estar listo antes del 13 y del 28 para que la Administradora alcance a verificar y los Coaches a confirmar. Montar el 15 deja la verificación sin tiempo.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-12',
    curso: 'zoho',
    orden: 25,
    roles: ['asistente'],
    titulo: 'Reportes y el cuadre de fin de mes',
    duracionMin: 16,
    requiere: ['of-zoh-11'],
    fuente: ['curso-2-zoho-asistentes.html#m12', 'drills-asistente.html#d12'],

    pfv: 'Los números del Centro, revisados y ordenados, en manos de la Administradora antes de que ella cierre su FODA — y todos respaldados por un documento.',

    masa: [
      'Zoho Books abierto en Informes, en la organización de tu Centro.',
      'El cuadro de negocio del mes pasado, impreso.',
      'El formato KITS A PEDIR y los correos de solicitud de kits del mes.',
      'La lista de niños nuevos del mes y el cuadro de deserciones.',
    ],

    palabras: ['cuadro-de-negocio', 'kit', 'kits-a-pedir', 'desercion', 'cuadro-de-deserciones', 'cotejo', 'foda', 'informe-de-antiguedad-de-saldos', 'veraz', 'verificable', 'falta-grave'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'Los informes que tú entregas alimentan el FODA y el cuadro de negocio que la Administradora presenta a la Junta los **primeros 5 días del mes**. Si tus números salen tarde o salen mal, el informe de ella sale mal.' },
      { t: 'sub', texto: 'Qué entregas y cada cuánto' },
      {
        t: 'tabla',
        encabezados: ['Informe', 'Frecuencia', 'De dónde sale'],
        filas: [
          ['% asistencia e inscripción de clases de prueba', 'Semanal', 'Tu Excel de control de clases de prueba'],
          ['Lista de inscritos actualizada de grupos nuevos', 'Diario', 'Inscripciones del día'],
          ['Seguimiento de cuentas por cobrar', 'Semanal', 'Informes de Zoho'],
          ['Informe de puntualidad de Coach', 'Quincenal', 'Listas de asistencia firmadas'],
          ['Planilla', 'Días 13 y 28', 'Zoho más control de asistencia'],
          ['Cuadro de negocio', 'Última semana del mes', 'Niños nuevos, kits y deserciones'],
        ],
      },
      { t: 'sub', texto: 'El cuadro de negocio: la fórmula' },
      { t: 'p', texto: '**Niños del mes = niños del mes anterior + niños nuevos − deserciones**' },
      { t: 'p', texto: 'Y el cotejo que manda el manual: **Niños nuevos del mes = kits solicitados en el mes**' },
      { t: 'p', texto: 'En el cuadro se detallan además los **números de órdenes con la cantidad de kits**, como información de cotejo, y el informe de deserciones con niño, grupo, Coach y motivo. Si los dos números no son iguales, o entró un niño que no quedó registrado, o se pidieron kits de más.' },
      { t: 'sub', texto: 'El cuadro de deserciones' },
      { t: 'p', texto: 'Por cada niño retirado: **niño, grupo, Coach y motivo**. Se envía a fin de mes a los correos del corporativo para efectos de auditoría.' },
      { t: 'sub', texto: 'Paso a paso: cuadre de cierre de mes' },
      {
        t: 'pasos',
        items: [
          'Saca la lista de niños nuevos del mes.',
          'Compárala contra el número de kits solicitados en el mes: el manual manda que sean iguales.',
          'Anota los números de órdenes con la cantidad de kits, como información de cotejo.',
          'Si hay diferencia, revísala caso por caso hasta encontrarla. No la reportes "cuadrada" a la fuerza.',
          'Arma el cuadro de deserciones con los cuatro campos.',
          'Saca el reporte final de cuentas por cobrar del mes.',
          'Entrega todo, ordenado y revisado, a la Administradora.',
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'Esto no es negociable', texto: 'Los datos, informes e indicadores deben ser veraces, precisos, completos y verificables. Omitir, manipular o falsear información es una **falta grave de carácter laboral, ético y legal**. Un número forzado para que cuadre es exactamente eso.' },
    ],

    quiz: [
      {
        pregunta: 'La Administradora entrega los informes a la Junta Directiva dentro de los…',
        opciones: ['últimos 5 días de cada mes', 'primeros 15 días de cada mes', 'primeros 5 días de cada mes', 'primeros 2 días de cada mes'],
        explicacion: 'Primeros 5 días. Tu paquete tiene que estar en sus manos antes de que ella cierre ese FODA.',
        repasa: ['foda'],
      },
      {
        pregunta: 'La fórmula del cuadro de negocio es…',
        opciones: ['niños nuevos menos niños del mes anterior', 'niños del mes anterior más deserciones', 'kits pedidos menos niños nuevos', 'niños del mes anterior más niños nuevos menos deserciones'],
        explicacion: 'Niños del mes = niños del mes anterior + niños nuevos − deserciones.',
        repasa: ['cuadro-de-negocio'],
      },
      {
        pregunta: 'El cuadro de deserciones debe indicar…',
        opciones: ['niño, grupo, Coach y motivo de la deserción', 'solo el nombre del niño', 'niño y motivo', 'niño, grupo y monto adeudado'],
        explicacion: 'Los cuatro campos, y se envía a fin de mes a los correos del corporativo para auditoría.',
        repasa: ['cuadro-de-deserciones'],
      },
      {
        pregunta: 'El informe de puntualidad de Coach se entrega con frecuencia…',
        opciones: ['semanal', 'quincenal', 'mensual', 'diaria'],
        explicacion: 'Quincenal, y sale de las listas de asistencia firmadas con la hora de llegada.',
      },
      {
        pregunta: 'Si el número de niños nuevos del mes no coincide con los kits solicitados, lo correcto es…',
        opciones: ['ajustar el número para que cuadre', 'reportarlo sin revisar', 'buscar la diferencia factura por factura hasta encontrar la causa', 'esperar al mes siguiente'],
        explicacion: 'Se busca la diferencia hasta encontrarla. Forzar el número es falsear información.',
        repasa: ['cotejo'],
      },
      {
        pregunta: 'Omitir, manipular o falsear información en un informe constituye una falta grave de carácter laboral, ético y legal.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Los datos deben ser veraces, precisos, completos y verificables. Un número forzado para que cuadre es exactamente eso.',
        repasa: ['falta-grave', 'veraz'],
      },
    ],

    drills: [
      {
        titulo: 'Drill 12 — Cuadrar matrículas facturadas, kits pedidos y niños nuevos',
        fuente: 'drills-asistente.html#d12',
        proposito: 'Que hagas cuadrar los tres números del mes y que, cuando no cuadren, encuentres la diferencia factura por factura y digas su causa.',
        gradiente: 'Exige los Drills 3, 5 y 6 aprobados. Cuando una matrícula aparece facturada al Centro equivocado, el paso que falta es el Drill 3. Cuando falta una matrícula por facturar, es el Drill 5. Cuando sobran facturas de niños que ya no están, es el Drill 6.',
        masa: [
          'Zoho Books abierto en Informes, en la organización de tu Centro.',
          'El cuadro de negocio del mes pasado, impreso.',
          'El formato KITS A PEDIR y los correos de solicitud de kits del mes.',
          'La lista de niños nuevos del mes y el cuadro de deserciones.',
        ],
        pasos: [
          'En Zoho, saca el total de matrículas facturadas del mes pasado en tu Centro.',
          'Cuenta los kits solicitados en el mes según los correos y el formato KITS A PEDIR.',
          'Cuenta los niños nuevos del mes de tu lista.',
          'Escribe los tres números uno debajo del otro. Deben ser iguales.',
          'Si hay diferencia, revisa factura por factura hasta encontrarla. No cierres el cuadre a la fuerza.',
          'Di en voz alta cuál de las tres causas es: un niño entró y no se le facturó la matrícula, se pidieron kits de más, o una matrícula quedó cargada al Centro equivocado.',
          'Aplica la fórmula del cuadro de negocio: niños del mes = niños del mes anterior + niños nuevos − deserciones. Verifica que el resultado coincida con los niños que realmente están en el Centro.',
          'Arma el cuadro de deserciones del mes con los cuatro campos: niño, grupo, Coach y motivo.',
          'Saca el reporte final de cuentas por cobrar del mes.',
          'Entrega todo ordenado y revisado a la Administradora. Ojo con el plazo: el Manual te fija la última semana de cada mes para confeccionar el cuadro de negocio; los primeros 5 días son el plazo de ella para entregarle el FODA a la Junta. O sea que tu paquete tiene que estar en sus manos antes de que ella cierre su FODA del día 5. Ese plazo es derivado, no una fecha del Manual para tu puesto.',
        ],
        criterios: [
          'Los tres números cuadran, o encuentra la diferencia y dice su causa señalando la factura o el pedido concreto donde está.',
          'Calcula el cuadro de negocio con la fórmula, sin mirarla, y el resultado coincide con la realidad del Centro.',
          'Entrega el cuadro de deserciones con los cuatro campos completos en todos los casos.',
          'Ante la tentación de "ajustar" un número para cerrar, se detiene y dice que forzar un número es falsear información.',
        ],
        errorTipico: 'Cuadrar por resta: ver que faltan dos y anotar dos de más en kits para que dé. Se delata cuando el Oficial le pide señalar en pantalla las facturas que respaldan ese número y no aparecen. Los datos deben ser veraces, precisos, completos y verificables; omitir, manipular o falsear información es una falta grave de carácter laboral, ético y legal.',
      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────
  {
    id: 'of-zoh-13',
    curso: 'zoho',
    orden: 26,
    roles: ['asistente'],
    titulo: 'Los diez errores que cuestan dinero y los casos integradores',
    duracionMin: 20,
    requiere: ['of-zoh-12'],
    fuente: [
      'curso-2-zoho-asistentes.html#m13',
      'drills-asistente.html#d13',
      'drills-asistente.html#d14',
      'drills-asistente.html#d15',
      'drills-asistente.html#d16',
    ],

    pfv: 'Tu propio mes auditado contra los diez errores caros, y el tablero de la semana sostenido sin que nadie te lo recuerde.',

    masa: [
      'Zoho Books abierto con el historial del mes pasado de tu Centro.',
      'La tabla de los diez errores de este módulo, impresa.',
      'El informe de antigüedad de saldos y el cuadro de negocio del mes pasado.',
      'El tablero de la semana impreso y pegado en tu puesto de trabajo.',
    ],

    palabras: ['organizacion', 'articulo', 'contacto-duplicado', 'cotizacion', 'factura-recurrente', 'fecha-del-pago', 'cuentas-por-cobrar', 'herramientas-de-no-salida', 'factura-de-servicio-del-coach', 'falta-grave', 'paz-y-salvo', 'cuadro-de-negocio'],

    bloques: [
      { t: 'sub', texto: 'Lo que tienes que saber' },
      { t: 'p', texto: 'Este módulo es el resumen operativo del curso. Son los diez errores que más veces han costado dinero o prima en los Centros.' },
      {
        t: 'tabla',
        titulo: 'Los diez errores que cuestan dinero',
        encabezados: ['#', 'Error', 'Qué provoca', 'Cómo se evita'],
        filas: [
          ['1', 'Trabajar en la organización equivocada', 'El ingreso se contabiliza en otro centro', 'Leer el nombre de la organización cada vez que entras'],
          ['2', 'Escoger el artículo de otro centro', 'La venta cae en la cuenta de otro centro', 'Leer el nombre completo del artículo antes de agregarlo'],
          ['3', 'Duplicar el contacto del representante', 'Estado de cuenta partido, reclamos de "ya pagué"', 'Buscar por apellido antes de crear'],
          ['4', 'Hacer la cotización después de la clase de prueba', 'Se pierde la venta caliente', 'Cotizar mientras los padres están en la charla'],
          ['5', 'No detener la recurrencia de un niño retirado', 'Cobranza vencida falsa; se pierde la prima', 'Ejecutar la detención del perfil apenas el Administrador confirme el retiro'],
          ['6', 'Registrar el pago con la fecha de hoy y no la real', 'El cobro cae en el mes equivocado', 'Siempre la fecha real del pago'],
          ['7', 'Dejar la cobranza para fin de mes', 'Clientes llegan a día 45 sin gestión', 'Revisión semanal del reporte de cuentas por cobrar'],
          ['8', 'Ofrecer un descuento sin autorización', 'Compromiso que el Centro tiene que cumplir igual', 'El descuento lo autoriza la Administradora, por escrito'],
          ['9', 'Pagar a un Coach sin su factura de servicio adjunta', 'Observación de auditoría', 'Pedirla en la revisión de nómina y adjuntarla en Zoho'],
          ['10', 'Forzar un número para que el cuadro cuadre', 'Falta grave laboral, ética y legal', 'Buscar la diferencia hasta encontrarla y reportarla'],
        ],
      },
      { t: 'sub', texto: 'Tu tablero de la semana' },
      {
        t: 'tabla',
        encabezados: ['Cuándo', 'Qué'],
        filas: [
          ['Todos los días', 'Asistencia de niños al día · lista de inscritos actualizada · pagos del día registrados'],
          ['Cada semana', 'Reporte de cuentas por cobrar y gestión por etapa · indicadores de clase de prueba'],
          ['Cada quincena', 'Informe de puntualidad de Coach'],
          ['Días 13 y 28', 'Planilla y nómina montada en Zoho con facturas adjuntas'],
          ['Última semana del mes', 'Cuadro de negocio, cuadro de deserciones y cuadre con kits'],
          ['15 días antes de un cierre de nivel', 'Correo a los padres: deben estar paz y salvo'],
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'Cierre del curso', texto: 'Imprime el tablero de la semana y colócalo en tu puesto de trabajo. Durante una semana, marca cada tarea cumplida. Al final, reporta qué tarea se te hizo más difícil sostener y por qué.' },
    ],

    quiz: [
      {
        pregunta: 'Estás en Zoho, vas a facturar la matrícula de un niño de Calle 50, y el buscador te muestra primero el artículo de David. ¿Qué haces?',
        opciones: ['Uso el de David, el precio es el mismo', 'Uso cualquiera y lo corrijo después', 'Creo un artículo nuevo', 'Sigo buscando hasta encontrar el artículo de Calle 50 y uso ese'],
        explicacion: 'Error 2 de la tabla: el artículo de otro centro manda la venta a la cuenta de ese centro. Se lee el nombre completo antes de agregarlo.',
        repasa: ['articulo'],
      },
      {
        pregunta: 'Un representante reclama que ya pagó y en Zoho aparece vencido. La causa más probable es…',
        opciones: ['que Zoho perdió la información', 'que el banco no reportó', 'que existe un contacto duplicado y el pago se aplicó al otro', 'que la factura recurrente falló'],
        explicacion: 'Error 3: el duplicado parte el estado de cuenta y el padre aparece al día en un contacto y vencido en el otro.',
        repasa: ['contacto-duplicado'],
      },
      {
        pregunta: 'Un niño se retiró en marzo y en junio su representante aparece con tres facturas vencidas. ¿Qué falló?',
        opciones: ['El padre dejó de pagar', 'No se detuvo la factura recurrente cuando se confirmó el retiro', 'El Coach no reportó las ausencias', 'El sistema duplicó las facturas'],
        explicacion: 'Error 5: cobranza vencida falsa. Se ejecuta la detención del perfil apenas el Administrador confirme el retiro.',
        repasa: ['factura-recurrente'],
      },
      {
        pregunta: 'Es 12 del mes y aún no tienes las facturas de servicio de dos Coaches. ¿Qué haces?',
        opciones: ['Las solicito de inmediato, porque la nómina debe estar montada antes del día 13', 'Monto la nómina sin ellas y las pido después', 'Espero al día 15', 'Pago sin factura y aviso al auditor'],
        explicacion: 'Error 9: pagar sin la factura de servicio adjunta deja el pago observado en auditoría. El proceso debe estar montado antes del 13.',
        repasa: ['factura-de-servicio-del-coach'],
      },
      {
        pregunta: 'Un padre te dice que no puede pagar y quiere retirar a su hija, que tiene dos facturas vencidas. El primer paso es…',
        opciones: ['ofrecerle un 25 por ciento de descuento', 'detener la recurrencia de inmediato', 'pasarlo a cuentas incobrables', 'clasificar el caso como económico y escalarlo a la Administradora'],
        explicacion: 'Tú clasificas y escalas. El descuento lo autoriza la Administradora por escrito, y el retiro lo decide ella.',
        repasa: ['herramientas-de-no-salida'],
      },
    ],

    drills: [
      {
        titulo: 'Drill 13 — Auditar tu propio mes contra los diez errores caros',
        fuente: 'drills-asistente.html#d13',
        proposito: 'Que revises tu propio trabajo del mes pasado, encuentres tus errores reales antes de que los encuentre la auditoría, y sostengas el tablero de la semana sin recordatorio.',
        gradiente: 'Exige los Drills 1 al 12 aprobados. Cada error de la tabla apunta a un drill: si en la auditoría te trabas en un error, se te devuelve a su drill, no se repite este.',
        masa: [
          'Zoho Books abierto con el historial del mes pasado de tu Centro.',
          'La tabla de los diez errores del Módulo 13, impresa.',
          'El informe de antigüedad de saldos y el cuadro de negocio del mes pasado.',
          'El tablero de la semana impreso y pegado en tu puesto de trabajo.',
        ],
        pasos: [
          'Toma la tabla de los diez errores y recórrela de uno en uno sobre tu mes pasado real.',
          'Por cada error, busca en Zoho si hay al menos un caso en tu Centro. Anota el documento concreto: número de factura, perfil recurrente o gasto.',
          'Por cada caso encontrado, escribe cuánto costó o pudo costar: ingreso en otro Centro, cobranza vencida falsa, observación de auditoría, prima perdida.',
          'Corrige los que se puedan corregir hoy. Los que necesiten decisión de la Administradora, escálalos con el caso completo.',
          'Imprime el tablero de la semana y colócalo en tu puesto de trabajo.',
          'Durante cinco días, marca cada tarea cumplida: lo diario, lo semanal, lo quincenal, lo del 13 y 28, y lo de la última semana del mes.',
          'Al final de la semana, reporta al Oficial qué tarea se te hizo más difícil sostener y por qué.',
        ],
        criterios: [
          'Encuentra por su cuenta casos reales de al menos tres errores distintos en su propio mes y señala el documento exacto de cada uno.',
          'Dice para cada caso qué costó, en dinero o en indicador, sin que el Oficial se lo sugiera.',
          'El tablero está pegado en su puesto y marcado los cinco días, verificado por el Oficial en dos revisiones sorpresa.',
          'Nombra los diez errores y su antídoto sin mirar la tabla.',
        ],
        errorTipico: 'Auditarse en blanco: "yo no cometí ninguno de estos". Se delata cuando el Oficial hace la misma búsqueda y encuentra dos en diez minutos. Un mes real sin ningún caso casi nunca existe; lo que existe es una revisión hecha por encima.',
      },
      {
        titulo: 'Drill 14 — Integrador: una noche de clase de prueba, de principio a fin',
        fuente: 'drills-asistente.html#d14',
        proposito: 'Que manejes una clase de prueba completa —desde la llamada de confirmación hasta el indicador entregado— sin que se te caiga ninguna pieza.',
        gradiente: 'Exige los Drills 3, 4, 5 y 7 aprobados. Este drill no enseña nada nuevo: pone junto lo que ya sabes bajo presión de tiempo real. Si algo se cae, se identifica qué drill era y se devuelve a ese.',
        masa: [
          'Una clase de prueba real de tu Centro, agendada, con el Oficial presente en el Centro esa noche.',
          'La lista de inscritos entregada por ventas dos días antes.',
          'Zoho Books abierto en la organización de tu Centro, con tu chuleta de artículos al lado.',
          'El teléfono del Centro y tu Excel de control de clases de prueba.',
        ],
        pasos: [
          'Dos días antes: recibe de ventas la lista de inscritos y regístrala en tu Excel de control.',
          'El día anterior: llama a confirmar asistencia, uno por uno.',
          'La noche de la clase: verifica la organización en Zoho antes de nada.',
          'Recibe a cada padre mirando a los ojos, con una sonrisa. No tutees a ningún representante.',
          'Marca la asistencia real contra la lista.',
          'Mientras están en la charla, arma las cotizaciones de todos los asistentes: cliente el representante, matrícula del itinerario, Centro y niveles que apliquen, seguro de accidentes y mensualidad, con el nombre del niño en la descripción.',
          'Envía cada cotización por correo antes de que los padres salgan de la charla.',
          'Al salir, con cada padre que cierra: convierte la cotización a factura y registra el pago de la matrícula el mismo día, con la fecha real.',
          'Pasa la información de las inscripciones a la Administradora para la apertura de grupo.',
          'Calcula y entrega los dos indicadores: % de asistencia y % de inscripción.',
          'Al día siguiente: da seguimiento a los padres que vinieron y no se inscribieron, y a los que no asistieron.',
        ],
        criterios: [
          'Todas las cotizaciones de los asistentes salieron enviadas antes de que los padres salieran de la charla. Cero cotizaciones en borrador al cerrar el Centro.',
          'Todas las inscripciones del día quedaron facturadas y con el pago de matrícula registrado ese mismo día, con la fecha real.',
          'Entrega los dos indicadores calculados esa misma noche, y coinciden con lo que el Oficial contó en la puerta.',
          'Ningún contacto quedó duplicado y ninguno quedó sin cédula ni correo.',
          'El Oficial la observó recibir a los padres sin tutear a ninguno.',
        ],
        errorTipico: 'Atender bien a los padres y dejar Zoho para el final de la noche. Se delata a la hora del cierre: hay padres que dijeron que sí y se fueron sin cotización enviada, y el pago de la matrícula quedó "para mañana". Mañana el padre ya no tiene el efectivo en la mano.',
      },
      {
        titulo: 'Drill 15 — Integrador: el cierre de mes completo',
        fuente: 'drills-asistente.html#d15',
        proposito: 'Que armes el cuadro de negocio en la última semana del mes y le entregues a la Administradora el paquete completo del cierre, cuadrado y verificable, antes de que ella cierre su FODA del día 5.',
        gradiente: 'Exige los Drills 10, 11 y 12 aprobados. Si el cuadre no da, el paso que falta es el Drill 12; si falta un adjunto de Coach, es el Drill 11; si el fondo no cuadra, es el Drill 10.',
        masa: [
          'Zoho Books abierto con el mes completo cerrado de tu Centro.',
          'El cuadro de negocio del mes pasado, el cuadro de deserciones y el formato KITS A PEDIR.',
          'El fondo de caja menuda contado con sus recibos.',
          'Las facturas de servicio de todos los Coaches del mes y las listas de asistencia firmadas.',
          'El informe de antigüedad de saldos del cierre.',
        ],
        pasos: [
          'Última semana del mes: arma el cuadro de negocio con la fórmula de niños del mes.',
          'Cuadra matrículas facturadas contra kits pedidos contra niños nuevos. Si no da, busca la diferencia hasta encontrarla.',
          'Arma el cuadro de deserciones con niño, grupo, Coach y motivo de cada retiro, y prepáralo para envío a los correos del corporativo.',
          'Cruza los perfiles de facturas recurrentes activas contra la lista de niños activos y detén lo que sobre, con el visto bueno que corresponda.',
          'Verifica que la nómina del 28 quedó montada con todas las facturas de servicio adjuntas, y que el informe de puntualidad quincenal salió.',
          'Cuadra el fondo de caja menuda y registra las reposiciones pendientes con sus recibos adjuntos.',
          'Saca el reporte final de cuentas por cobrar del mes y cuenta cuántos clientes tienen más de dos facturas sin pagar.',
          'Revisa la bitácora: que todos los depósitos entregados del mes estén con fecha y firma.',
          'Entrega todo ordenado y revisado a la Administradora antes de que ella cierre su FODA del día 5. El Manual te fija la última semana del mes para el cuadro de negocio; los primeros 5 días son el plazo de ella con la Junta. Tu fecha es derivada de la suya.',
        ],
        criterios: [
          'Entrega el paquete completo a tiempo para que la Administradora cierre su FODA del día 5, sin que ella se lo pida.',
          'Los tres números del cuadre coinciden, o la diferencia está identificada por documento y explicada por causa.',
          'Cero pagos de Coach del mes sin factura de servicio adjunta en Zoho.',
          'El fondo de caja menuda cuadra al centavo contra sus recibos.',
          'Dice de memoria su número de clientes con más de dos facturas sin pagar y si quedó dentro del límite de tres.',
          'No hay un solo número en el paquete que ella no pueda respaldar señalando el documento en pantalla.',
        ],
        errorTipico: 'Entregar el paquete completo pero tarde, el día 7 u 8. Se delata solo: la Administradora ya presentó su informe a la Junta con números viejos o estimados. Un cierre correcto entregado tarde vale lo mismo que un cierre incorrecto.',
      },
      {
        titulo: 'Drill 16 — Integrador: una semana de cobranza completa',
        fuente: 'drills-asistente.html#d16',
        proposito: 'Que sostengas la cobranza como rutina semanal, con cada cliente en su etapa, cada contacto con evidencia, y ningún vencido falso en tu informe.',
        gradiente: 'Exige los Drills 6, 7, 8 y 9 aprobados. Un vencido falso en el informe manda al Drill 6; un pago que entró y no aparece manda al Drill 7; un descuento ofrecido de más manda al Drill 9.',
        masa: [
          'El informe de antigüedad de saldos de tu Centro, sacado el lunes.',
          'El teléfono del Centro, disponible toda la semana.',
          'Zoho Books abierto en Facturas y en Facturas recurrentes.',
          'La hoja de constancia de contactos y el Drive de cuentas incobrables abierto.',
        ],
        pasos: [
          'Lunes: saca el informe de antigüedad de saldos y clasifica a cada cliente vencido en su etapa.',
          'Antes de llamar a nadie, limpia los falsos: cruza contra los niños activos y contra los pagos recibidos que falten por registrar. Detén las recurrencias de retirados y registra los pagos pendientes con su fecha real.',
          'Vuelve a sacar el informe ya limpio. Ese es tu tablero real de la semana.',
          'Martes a viernes: ejecuta la acción de cada etapa. Etapa 1, aviso de factura emitida. Etapa 2, informe a la Administradora y aviso al acudiente de que no podrá asistir hasta estar paz y salvo. Etapa 3, seguimiento sujeto al acuerdo y carga en el Drive de incobrables si no fue efectivo. Etapa 4, ya está en manos del Coordinador Operativo, pero tu evidencia debe estar completa.',
          'Deja constancia de cada contacto: fecha, medio y qué respondió el padre.',
          'Cada vez que un padre plantee un motivo de salida, clasifícalo en su categoría y escala el caso. No ofrezcas nada.',
          'Cuando la Administradora autorice un acuerdo o un descuento, aplícalo en Zoho con la autorización escrita guardada como evidencia y notifica al Coordinador Operativo.',
          'Viernes: vuelve a sacar el informe y compáralo con el del lunes. Cuenta cuántos clientes bajaron de etapa, cuántos subieron y cuántos clientes tienen más de dos facturas sin pagar.',
          'Si hay un cierre de nivel dentro de 15 días, envía el correo a los padres avisando que deben estar paz y salvo para el examen y el cierre.',
        ],
        criterios: [
          'El informe del viernes no tiene un solo vencido falso: ni recurrencias de retirados ni pagos sin registrar.',
          'Todos los clientes vencidos de la semana tienen constancia de contacto con fecha, medio y respuesta.',
          'Sostiene el tono amigable en todas las llamadas que el Oficial escucha, incluso con el padre molesto, y no ofrece ningún descuento por su cuenta.',
          'Compara el informe del viernes contra el del lunes y explica el movimiento cliente por cliente.',
          'Repite la rutina completa dos semanas seguidas sin que nadie se lo recuerde y sin consultar el manual.',
        ],
        errorTipico: 'Llamar sobre el informe sucio: cobrarle a un padre cuyo hijo se retiró hace dos meses o que ya pagó y el pago no se registró. Se delata en la llamada misma —el padre reclama— y cuesta más que la deuda: el Centro queda como desordenado frente al cliente.',
      },
    ],
  },
]
