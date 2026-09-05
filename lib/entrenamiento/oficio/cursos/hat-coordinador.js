// Paquete del puesto — Coordinador Operativo. Un solo módulo: `of-hat-cop`.
// Misma forma que of-hat-asi: qué es esto · el producto · los sub-productos ·
// cómo se mide cada uno · las responsabilidades por frente · lo que este puesto
// NO hace · de quién recibes y a quién entregas · la prueba del puesto.
//
// ── LA ASIMETRÍA, DICHA EN VOZ ALTA ───────────────────────────────────────
// El Manual de Operaciones NO tiene sección de Coordinador Operativo: no le
// escribe objetivo de posición, ni perfil, ni competencias, ni indicadores, ni
// prima, mientras que al Administrador, al Asistente, al Coach y hasta al
// personal de aseo sí se las escribe. Lo menciona DIEZ veces, todas de trámite
// y todas del mismo tipo: recibir, verificar, confeccionar, elevar.
//   L546 · L552 · L554 · L1965 · L1967 · L1975 · L1981 · L2171 · L2173 · L2175
// El resto del puesto —que cada centro esté entrenado, las reuniones
// semanales, Zoho ordenado, el reporte a la Junta, motivar al equipo— lo
// describió el dueño y no está escrito. Las dos cosas son verdad y no pesan
// igual delante de un auditor, así que el paquete lo declara en su propio
// texto en vez de disimularlo.
//
// EL PRODUCTO ES DERIVACIÓN, NO INVENCIÓN. Se le aplicó a cada frente la única
// prueba que vale: qué deja de existir al final del mes si el puesto
// desaparece. Sin él, los centros operan con gente sin contrato sellado ni
// inscrita en la Caja de Seguro Social (L1965, L1967, L1975, L1981); los
// permisos no llegan a la Junta y el descuento de quincena no tiene respaldo
// (L552, L554); la cartera vieja se queda quieta porque el Asistente solo llega
// hasta el día 45 (L2173, L2175); los números que la Junta lee dejan de ser
// verificables; y el centro en 88 por ciento que decrece no lo ve nadie.
//
// HONESTIDAD SOBRE EL DINERO. El Manual no le fija a este puesto ninguna prima
// de producción, ningún indicador con monto y ningún bono. Los cinco
// sub-productos no se pagan: se cumplen. Y eso encaja con la práctica que
// describió el dueño — generalmente el dueño de franquicia es quien adquiere
// esta posición: la retribución es la franquicia, no una prima. Se dice tal
// cual, en vez de inventarle la tabla de indicador/meta/monto que of-hat-asi sí
// puede traer porque el Manual sí se la da.
//
// El `id` es la CLAVE DE PROGRESO en entrenamiento_progreso.modulo: renombrarlo
// borra en silencio el avance de todo el mundo.
//
// Los índices correctos del quiz viven en
// lib/entrenamiento/respuestas-oficio/hat-coordinador.js (solo servidor).

export const HAT_COP = [
  {
    id: 'of-hat-cop',
    curso: 'hat',
    orden: 13,
    roles: ['coordinador'],
    titulo: 'Tu puesto: Coordinador Operativo',
    duracionMin: 25,
    requiere: ['of-nor-9'],
    fuente: [
      'manual-operaciones-completo.md#L546',
      'manual-operaciones-completo.md#L552',
      'manual-operaciones-completo.md#L554',
      'manual-operaciones-completo.md#L1965',
      'manual-operaciones-completo.md#L1975',
      'manual-operaciones-completo.md#L1981',
      'manual-operaciones-completo.md#L2171',
      'manual-operaciones-completo.md#L2173',
      'manual-operaciones-completo.md#L2175',
      'descripcion-del-puesto-fernando#frentes-del-coordinador',
      'lib/marcadores.mjs#cabecera',
      'hallazgo-historico-metas-2026-09',
    ],

    pfv: 'Centros que cumplen el Manual y números que cuadran — cada colaborador con su contrato sellado e inscrito, cada centro con su gente entrenada y su semáforo leído, y Zoho, el cuadro de negocio y el KPI diciendo lo mismo, en manos de la Junta Directiva cada mes.',

    voz: 'Este es tu puesto, y arranca con una verdad incómoda. <break time="0.4s"/> El Manual no tiene una sección de Coordinador Operativo. <break time="0.4s"/> Te menciona diez veces, todas de trámite. <break time="0.3s"/> Recibir, verificar, confeccionar, elevar. <break time="0.5s"/> El resto del puesto lo describió el dueño y no está escrito. <break time="0.4s"/> Las dos cosas son verdad. Y no pesan igual delante de un auditor. <break time="0.5s"/> Tu producto es doble. <break time="0.3s"/> Centros que cumplen el Manual, y números que cuadran. <break time="0.4s"/> Cada colaborador con su contrato sellado e inscrito. <break time="0.3s"/> Cada centro con su gente entrenada y su semáforo leído. <break time="0.4s"/> Y Zoho, el cuadro de negocio y el KPI diciendo lo mismo. <break time="0.5s"/> Cinco sub-productos, todos contables, y ninguno se paga. <break time="0.4s"/> El Manual no te fija prima, ni bono, ni indicador con monto. <break time="0.3s"/> Se cumplen, no se cobran. <break time="0.5s"/> Y la alarma de tu puesto no es el rojo. <break time="0.3s"/> El rojo lo ve todo el mundo y ya tiene dueño. <break time="0.4s"/> La tuya es el centro en ochenta y ocho por ciento que decrece.',

    masa: [
      'El paquete de tu puesto, impreso.',
      'El Manual de Operaciones abierto en las diez líneas que nombran este puesto.',
      'El panel de la red con los centros del mes, uno al lado del otro.',
      'La lista de contratos vigentes y de contratos por vencer del trimestre.',
      'Seis situaciones reales del mes pasado, de centros distintos.',
    ],

    palabras: [
      'hat',
      'producto-final-valioso',
      'drill',
      'checksheet',
      'coordinador-operativo',
      'junta-directiva',
      'corporativo-aloha',
      'franquicia',
      'administrador-de-centro',
      'file-del-colaborador',
      'kpi',
      'cuadro-de-negocio',
    ],

    laminas: [
      {
        kicker: 'La asimetría',
        titulo: 'Diez menciones y ninguna sección propia',
        texto: 'El Manual te menciona diez veces, todas de trámite. No te escribe objetivo, ni perfil, ni competencias, ni indicadores, ni prima. Al Administrador y al Asistente sí.',
      },
      {
        kicker: 'Tu producto',
        titulo: 'Centros que cumplen y números que cuadran',
        items: [
          'Cada colaborador con su contrato sellado e inscrito.',
          'Cada centro con su gente entrenada y su semáforo leído.',
          'Zoho, el cuadro de negocio y el KPI diciendo lo mismo.',
        ],
        cierre: 'En manos de la Junta Directiva cada mes.',
      },
      {
        kicker: 'La prueba del producto',
        titulo: 'Qué deja de existir si el puesto desaparece',
        items: [
          'Gente trabajando sin contrato sellado ni inscrita en la CSS.',
          'Descuentos de quincena sin permiso que los respalde.',
          'Cartera vieja quieta: el Asistente solo llega al día 45.',
          'Números que la Junta lee y ya no son verificables.',
        ],
      },
      {
        kicker: 'Los cinco sub-productos',
        titulo: 'Tres de trámite, dos de gobierno',
        items: [
          'Contratos vigentes. Meta natural: todos.',
          'Permisos archivados y elevados a la Junta.',
          'Cartera vieja movida en el tramo 46 a 61 días.',
          'Centros entrenados, contados con firmas.',
          'Números que cuadran, centro por centro.',
        ],
      },
      {
        kicker: 'La diferencia entre los dos grupos',
        titulo: 'Presencia contra cobertura',
        texto: 'Los tres de trámite se miden por presencia o ausencia en su plazo. Los dos de gobierno se miden por cobertura: cuántos centros de la red, no si lo hiciste.',
      },
      {
        kicker: 'El dinero, dicho claro',
        titulo: 'Estos cinco no se pagan: se cumplen',
        texto: 'El Manual no te fija prima de producción, ni bono, ni indicador con monto. La retribución de este puesto es la franquicia, no una prima. Eso no se disimula.',
      },
      {
        kicker: 'La alarma del puesto',
        titulo: 'Un centro en 88 por ciento que decrece',
        texto: 'Verde en Disciplina, retroceso en Producto. El rojo lo ve todo el mundo y ya tiene dueño. Este caso no le suena a nadie más de la organización.',
        cierre: 'La Administradora ve su centro y lo ve en verde. Tú los ves a todos, uno al lado del otro.',
      },
      {
        kicker: 'Lo que hay que declarar',
        titulo: 'Tu entrenamiento es más completo que tu norma',
        texto: 'El Manual necesita una sección propia de Coordinador Operativo. Estos módulos son el borrador de esa sección. Mientras no exista, se dice y no se disimula.',
      },
    ],

    bloques: [
      { t: 'sub', texto: 'Qué es esto' },
      { t: 'p', texto: 'Esto es **tu puesto**: tu cargo y todo lo que trae. Qué produces, qué decides, qué NO decides, de quién recibes, a quién entregas y en qué orden se te entrena.' },
      { t: 'p', texto: 'Y arranca con una verdad incómoda, porque disimularla te dejaría sin respuesta el día que llegue un auditor. **El Manual de Operaciones no tiene una sección de Coordinador Operativo.** Te menciona diez veces, todas de trámite y todas del mismo tipo: recibir, verificar, confeccionar, elevar. No te escribe objetivo de posición, ni perfil, ni competencias, ni indicadores, ni prima, mientras que al Administrador, al Asistente, al Coach y hasta al personal de aseo sí se las escribe.' },
      {
        t: 'tabla',
        titulo: 'Las diez menciones, una por una',
        encabezados: ['Dónde', 'Qué te asigna'],
        filas: [
          ['L546', 'El permiso ya autorizado de la Asistente se te envía y reposa en el file personal'],
          ['L552', 'Todos los documentos de permisos se te entregan inmediatamente después de autorizados'],
          ['L554', 'Elevas la solicitud a la Junta Directiva por correo con el formato SOLICITUD DE PERMISO'],
          ['L1965', 'Recibes del Administrador el formato SOLICITUD DE CONTRATO y te encargas del proceso'],
          ['L1967', 'Confeccionas el primer contrato: tres meses con un mes de prueba'],
          ['L1975', 'Confeccionas la renovación: un año con tres meses de prueba'],
          ['L1981', 'Buscas las dos firmas, sellas en el Ministerio de Trabajo e inscribes en la Caja de Seguro Social'],
          ['L2171', 'Se te notifica de inmediato todo arreglo de pago, con su evidencia'],
          ['L2173', 'Verificas en el Drive que la ficha de la cuenta incobrable esté cargada'],
          ['L2175', 'En el tramo de 46 a 61 días, pasas la lista al personal de cobro'],
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva', texto: 'El Manual necesita una sección propia de Coordinador Operativo, y los diez módulos de tu curso son el borrador de esa sección. Mientras no exista, tu entrenamiento describe el puesto con más detalle que la norma que lo respalda: todo lo que no esté en esas diez menciones es política de la operación, no norma auditable. Cúmplelo, y no lo uses como fundamento para sancionar a nadie.' },

      { t: 'sub', texto: 'El producto de tu puesto' },
      { t: 'p', texto: 'El producto de un puesto no es una lista de tareas ni una actitud. Es una cosa que al final del mes existe o no existe, y que se puede contar. Si el puesto desaparece, ese producto deja de existir. Ese es el examen, y este puesto lo pasa.' },
      { t: 'p', texto: '**Centros que cumplen el Manual y números que cuadran — cada colaborador con su contrato sellado e inscrito, cada centro con su gente entrenada y su semáforo leído, y Zoho, el cuadro de negocio y el KPI diciendo lo mismo, en manos de la Junta Directiva cada mes.**' },
      { t: 'p', texto: 'No sale de una frase bonita. Sale de aplicarle a cada frente la única pregunta que vale: **qué deja de existir al final del mes si este puesto desaparece.**' },
      {
        t: 'tabla',
        encabezados: ['Si nadie hace esto…', '…esto es lo que pasa', 'De dónde sale'],
        filas: [
          ['Confeccionar y tramitar los contratos', 'Los centros operan con gente sin contrato sellado por el Ministerio de Trabajo ni inscrita en la Caja de Seguro Social. El Administrador SOLICITA; tú CONFECCIONAS Y TRAMITAS', 'Manual, literal'],
          ['Recibir y elevar los permisos', 'El descuento de quincena no tiene respaldo escrito y la Junta Directiva no se entera', 'Manual, literal'],
          ['Pasar la lista al personal de cobro el día 46 y verificar el Drive de incobrables', 'La cartera vieja se queda quieta: el Asistente solo llega hasta el día 45', 'Manual, literal'],
          ['Conciliar Zoho contra el cuadro de negocio y el KPI', 'Los números que la Junta lee dejan de ser verificables', 'Práctica del dueño'],
          ['Mirar el centro en 88 por ciento que decrece', 'No lo ve nadie: la Administradora ve su propio centro, y lo ve en verde', 'Hallazgo del sistema'],
        ],
      },

      { t: 'sub', texto: 'Los cinco sub-productos que lo componen' },
      {
        t: 'tabla',
        encabezados: ['#', 'Sub-producto', 'Qué se cuenta exactamente', 'Origen'],
        filas: [
          ['1', 'Contratos vigentes', 'Colaboradores activos con contrato firmado, sellado por el Ministerio de Trabajo e inscrito en la Caja de Seguro Social, sobre el total de colaboradores activos. Meta natural: todos', 'Manual, literal'],
          ['2', 'Permisos archivados y elevados', 'Permisos autorizados del mes que te llegaron el mismo día, y cuántos subiste a la Junta Directiva por correo', 'Manual, literal'],
          ['3', 'Cartera vieja movida', 'Cuentas que cruzaron el día 45 y que pasaste al personal de cobro dentro del tramo 46 a 61, más fichas de incobrables verificadas en el Drive', 'Manual, literal'],
          ['4', 'Centros entrenados', 'Porcentaje de puestos con su puesto tomado, por centro, contado con FIRMAS y no con lecturas', 'Práctica del dueño'],
          ['5', 'Números que cuadran', 'Centros del mes donde Zoho, el cuadro de negocio y el KPI coinciden; y contradicciones entre la marca a mano y el cálculo, cerradas', 'Práctica del dueño más el hallazgo'],
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'Presencia contra cobertura', texto: 'Los sub-productos 1, 2 y 3 son de TRÁMITE: se miden por presencia o ausencia en su plazo, y ese plazo lo fija el Manual. Los 4 y 5 son de GOBIERNO: se miden por COBERTURA, o sea cuántos centros de la red, no si tú lo hiciste. Confundir los dos grupos es lo que convierte este puesto en una lista de pendientes personales.' },

      { t: 'sub', texto: 'Cómo se mide cada uno' },
      {
        t: 'tabla',
        encabezados: ['Sub-producto', 'Con qué se comprueba', 'Frecuencia'],
        filas: [
          ['Contratos vigentes', 'El file del colaborador en cada centro, con su contrato sellado y la constancia de inscripción en la CSS', 'Al contratar y en cada renovación'],
          ['Permisos archivados y elevados', 'El archivo único de permisos autorizados y los correos a la Junta Directiva', 'El mismo día en que te llegan'],
          ['Cartera vieja movida', 'El Drive de cuentas incobrables y la lista entregada al personal de cobro', 'Tramo de 46 a 61 días de vencida la factura'],
          ['Centros entrenados', 'Las firmas de maniobra por centro, no el porcentaje de módulos leídos', 'Mensual'],
          ['Números que cuadran', 'Zoho Books, el cuadro de negocio del centro y el KPI, los tres del mismo mes', 'Mensual, al cierre'],
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'El Manual no te fija ninguna prima', texto: 'Ni prima de producción, ni bono, ni un solo indicador con monto. Estos cinco sub-productos NO se pagan: se cumplen. Y eso encaja con la práctica: generalmente el dueño de franquicia es quien adquiere esta posición, de modo que la retribución del puesto es la franquicia y no una prima. Aquí no se te inventa una tabla de metas que el Manual no tiene.' },

      { t: 'sub', texto: 'La alarma de tu puesto' },
      { t: 'p', texto: 'Cada puesto tiene un caso que solo él puede ver. El tuyo es este: **un centro en 88 por ciento que decrece.** Verde en Disciplina, retroceso en Producto.' },
      { t: 'p', texto: 'El rojo lo ve todo el mundo y ya tiene dueño: la Administradora del centro y la Junta lo tienen en pantalla. Lo que nadie mira es el centro con la lista de actividades casi llena y el resultado cayendo, porque el número grande dice que va bien. La Administradora ve su propio centro y lo ve en verde; la Junta ve el resumen, no la contradicción. Tú eres el único que los ve a todos, uno al lado del otro.' },
      { t: 'nota', tono: 'ojo', titulo: 'Esto es hallazgo del sistema, no norma del Manual', texto: 'Los dos marcadores separados —Producto, que se calcula y pinta el semáforo, y Disciplina, que es soporte— salen del propio KPI. El Manual no los menciona. Tu curso lo desarrolla en of-cop-2 y of-cop-3, con las cifras del barrido de metas. Es cómo mide la herramienta, y por eso puede cambiar cuando la herramienta cambie.' },

      { t: 'sub', texto: 'Las responsabilidades, por frente' },
      {
        t: 'tabla',
        encabezados: ['Frente', 'Qué te toca', 'Con respaldo del Manual'],
        filas: [
          ['Contratación y legal-laboral', 'Confeccionar y tramitar contratos y renovaciones, buscar las dos firmas, sellar e inscribir, verificar el file', 'Sí: L1965, L1967, L1975, L1981'],
          ['Permisos', 'Recibir todo permiso autorizado el mismo día, archivarlo y elevarlo a la Junta por correo', 'Sí: L546, L552, L554'],
          ['Cobranza escalada', 'Recibir el aviso de todo arreglo de pago, verificar el Drive de incobrables y pasar la lista al cobro en el tramo 46 a 61', 'Sí: L2171, L2173, L2175'],
          ['Reuniones semanales con cada centro', 'Sostener la reunión sobre la ruta de nivel y cerrar acuerdos con fecha', 'No: práctica del dueño'],
          ['Saber qué pasa en todos los centros', 'Leer el semáforo de la red y cazar la contradicción antes de que se ponga roja', 'No: hallazgo del sistema'],
          ['Que cada centro esté entrenado', 'Tomar maniobras, revisar la cola de firmas y reportar cobertura por centro', 'No: práctica del dueño'],
          ['Zoho ordenado y cuadros que concuerdan', 'Conciliar los tres números del mes y cerrar las diferencias', 'No: práctica del dueño'],
          ['Reglamento legal de las empresas', 'Vigilar que cada empresa cumpla lo que le exige la ley', 'No: práctica del dueño'],
          ['Comunicación con la Junta y con el Corporativo', 'Subir lo que solo tú viste, en formato y con frecuencia', 'Parcial: solo el correo de permisos, L554'],
          ['Sostener al equipo', 'Que un centro que va mal salga de la reunión con una cosa que sí puede mover', 'No: práctica del dueño'],
        ],
      },

      { t: 'sub', texto: 'Lo que este puesto NO hace' },
      { t: 'p', texto: 'Un puesto mal delimitado hace que se pise el puesto ajeno: dos personas decidiendo lo mismo, o una decidiendo lo que no le toca. Cuando eso pasa, la responsabilidad se diluye y el producto desaparece. Tu puesto ve todos los centros, y por eso es el que más fácil se mete donde no debe.' },
      { t: 'nota', tono: 'regla', titulo: 'Regla clave', texto: 'Tú recibes, verificas, confeccionas, elevas y conciertas. Dentro de un centro, quien decide es su Administrador. Aportar el número y el precedente de los otros centros no es decidir por él: es tu puesto funcionando bien.' },
      {
        t: 'tabla',
        encabezados: ['Decisión', 'De quién es', 'Qué haces tú'],
        filas: [
          ['A quién se contrata', 'La Junta Directiva escoge en la segunda entrevista; el Administrador solicita el contrato', 'Confeccionas y tramitas. No eliges'],
          ['Si un colaborador pasó su período de prueba', 'Administrador de Centro, con su evaluación de desempeño', 'Exiges la evaluación y confeccionas lo que corresponda'],
          ['Si un permiso se autoriza', 'Administrador de Centro: queda autorizado solo con su firma', 'Lo recibes ya autorizado, lo archivas y lo elevas'],
          ['Un descuento por retención o un arreglo de pago', 'Administrador de Centro', 'Recibes la notificación inmediata con su evidencia y verificas el Drive'],
          ['Modificar una norma, una prima o el programa de incentivos', 'Junta Directiva', 'Lo subes con los dos números que lo sostienen'],
          ['Emitir una constancia escolar o aprobar una ubicación excepcional', 'Exclusivamente el Corporativo ALOHA', 'Nada por tu cuenta: se canaliza por el centro'],
          ['Calificar a un Coach o a una Asistente', 'Administrador de Centro, con su formato', 'Le pasas el dato; él evalúa'],
          ['Forzar un número para que el cuadro cuadre', 'Nadie: es falta grave', 'Buscas la diferencia y la reportas escrita'],
          ['Aprobar tu propio permiso', 'Junta Directiva, por correo', 'Elevas tu propia solicitud, igual que las de los demás'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'La falta grave que más te ronda', texto: 'Los datos, informes de indicadores y reportes deben ser veraces, precisos, completos y verificables. Omitir, manipular o falsear cualquier información es falta grave de carácter laboral, ético y legal. Un número forzado para que el cuadro cuadre no es un error administrativo. Si no cuadra, se busca la diferencia y se reporta con la diferencia escrita.' },

      { t: 'sub', texto: 'De quién recibes y a quién entregas' },
      {
        t: 'tabla',
        titulo: 'Lo que te llega',
        encabezados: ['Insumo', 'De quién', 'Cuándo'],
        filas: [
          ['El formato SOLICITUD DE CONTRATO', 'Administrador de Centro', 'Tras la segunda entrevista, cuando ya se escogió a la persona'],
          ['La solicitud de renovación o la carta de no renovación', 'Administrador de Centro, con su segunda evaluación', 'Una semana antes del vencimiento'],
          ['Todo permiso autorizado, con la firma del Administrador', 'Administrador de Centro', 'Inmediatamente después de autorizado'],
          ['El aviso de todo arreglo de pago, con su evidencia', 'Administrador de Centro', 'De inmediato'],
          ['La ficha del incobrable cargada en el Drive', 'Asistente Administrativa', 'Tramo de 31 a 45 días de vencida la factura'],
          ['El cuadro de negocio y el cuadro de deserciones', 'Administrador de Centro', 'Última semana de cada mes'],
        ],
      },
      {
        t: 'tabla',
        titulo: 'Lo que entregas',
        encabezados: ['Entrega', 'A quién', 'Cuándo'],
        filas: [
          ['El contrato sellado, inscrito y con recibo de entrega firmado', 'Colaborador, con copia al file de su centro', 'Al cerrar el trámite'],
          ['La solicitud de permiso elevada por correo', 'Junta Directiva', 'El mismo día en que te llega autorizada'],
          ['La lista de morosos del tramo 46 a 61', 'Personal de cobro', 'Dentro del tramo, no después'],
          ['Los acuerdos de la reunión semanal, con nombre y fecha', 'Administrador de Centro', 'El mismo día de la reunión'],
          ['La cobertura de entrenamiento por centro, contada con firmas', 'Junta Directiva', 'Mensual'],
          ['El reporte de la red y las diferencias cerradas del mes', 'Junta Directiva, y la línea con el Corporativo ALOHA', 'Mensual'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'El error caro de esta sección', texto: 'Esperar el insumo en silencio. Si el Administrador no te mandó la SOLICITUD DE CONTRATO, la persona empieza a trabajar igual y el contrato llega tarde; si no te llegó el permiso el mismo día, el descuento de la quincena se hace sin respaldo. Tu producto depende de insumos ajenos: recláma­los el día que tocaban, por escrito.' },

      { t: 'sub', texto: 'La prueba del puesto' },
      { t: 'p', texto: 'Si no puedes decir el producto de tu puesto de memoria, no lo tienes tomado. Y en este puesto la prueba tiene una segunda mitad: **decirlo con los números de la red de este mes**. Cuántos colaboradores activos, cuántos con contrato sellado e inscrito; cuántos permisos te llegaron y cuántos subiste; cuántas cuentas cruzaron el día 45; qué cobertura de entrenamiento tiene cada centro; y en cuántos centros coinciden los tres números.' },
      { t: 'p', texto: 'Si contestas con una lista de tareas —"coordino, superviso, doy seguimiento"—, el paso no está aprobado.' },
    ],

    quiz: [
      {
        pregunta: '¿Cuál es el producto de tu puesto como Coordinador Operativo?',
        opciones: [
          'Coordinar, supervisar y dar seguimiento a los centros de la red',
          'Centros que cumplen el Manual y números que cuadran, en manos de la Junta cada mes',
          'Que ningún centro se ponga rojo en el semáforo',
          'Ser el enlace entre los centros y el Corporativo ALOHA',
        ],
        explicacion: 'Un producto se cuenta y desaparece si el puesto desaparece. "Coordinar y supervisar" es una lista de tareas, no un producto.',
        repasa: ['producto-final-valioso', 'coordinador-operativo'],
      },
      {
        pregunta: '¿Cuántas veces menciona el Manual de Operaciones al Coordinador Operativo?',
        opciones: [
          'Ninguna: el puesto no está en el Manual',
          'Tiene su propia sección con perfil, competencias e indicadores',
          'Diez menciones, todas de trámite y sin sección propia',
          'Solo dos: la del contrato y la del permiso',
        ],
        explicacion: 'Diez, todas del mismo tipo: recibir, verificar, confeccionar, elevar. Todo lo demás es práctica de la operación, y eso hay que declararlo, no disimularlo.',
        repasa: ['coordinador-operativo'],
      },
      {
        pregunta: 'El Manual te fija una prima de producción por cumplir tus cinco sub-productos.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Ni prima, ni bono, ni un indicador con monto. Estos cinco no se pagan: se cumplen. Generalmente el dueño de franquicia es quien adquiere esta posición, y la retribución del puesto es la franquicia.',
        repasa: ['prima-de-produccion', 'franquicia'],
      },
      {
        pregunta: 'La alarma propia de tu puesto —la que no le suena a nadie más— es…',
        opciones: [
          'un centro en 88 por ciento que decrece: verde en Disciplina, retroceso en Producto',
          'un centro en rojo tres meses seguidos',
          'un centro que no entrega el cuadro de negocio a tiempo',
          'el centro con más deserción de la red',
        ],
        explicacion: 'El rojo lo ve todo el mundo y ya tiene dueño. La Administradora ve su propio centro y lo ve en verde; tú eres el único que los ve a todos, uno al lado del otro.',
        repasa: ['kpi'],
      },
      {
        pregunta: 'De los cinco sub-productos, ¿cuáles se miden por COBERTURA y no por presencia en su plazo?',
        opciones: [
          'Contratos vigentes y permisos elevados',
          'Cartera vieja movida y contratos vigentes',
          'Centros entrenados y números que cuadran',
          'Los cinco por igual',
        ],
        explicacion: 'Los tres de trámite se miden por presencia o ausencia en el plazo que fija el Manual. Los dos de gobierno se miden por cuántos centros de la red, no por si tú lo hiciste.',
        repasa: ['indicador'],
      },
      {
        pregunta: 'Un Administrador te pide que decidas tú si su asistente sigue después del período de prueba. Lo correcto es…',
        opciones: [
          'decidirlo tú: ves los centros y tienes más contexto',
          'llevarlo a la Junta Directiva para que decida ella',
          'decirle que la decisión sale de su evaluación de desempeño, no de tu escritorio',
          'consultarlo con el Corporativo ALOHA',
        ],
        explicacion: 'El Administrador solicita y evalúa. El Coordinador Operativo confecciona y tramita. Dentro de un centro, quien decide es su Administrador.',
        repasa: ['administrador-de-centro', 'evaluacion-de-desempeno'],
      },
      {
        pregunta: 'Cierras el mes y el cuadro de negocio de un centro no coincide con Zoho por tres niños. ¿Qué haces?',
        opciones: [
          'ajustas el cuadro al número de Zoho, que es el sistema contable',
          'buscas la diferencia y la reportas escrita, sin forzar ningún número',
          'dejas el cuadro como está: el KPI ya trae el número bueno',
          'esperas al mes siguiente a ver si se corrige solo',
        ],
        explicacion: 'Los datos deben ser veraces, precisos, completos y verificables. Forzar un número para que cuadre es falta grave de carácter laboral, ético y legal.',
        repasa: ['cuadrar', 'falta-grave', 'verificable'],
      },
      {
        pregunta: 'Para reportar cuán entrenado está un centro, el número que se usa es…',
        opciones: [
          'el de módulos leídos, que es el que sube solo',
          'el de firmas de maniobra: estudiado no es tener el puesto tomado',
          'el promedio de los dos',
          'el que reporte la Administradora del centro',
        ],
        explicacion: 'El de lecturas dice quién abrió la página. Estudiado no es tener el puesto tomado: la firma es el dato.',
        repasa: ['checksheet', 'drill'],
      },
      {
        pregunta: 'Tú mismo necesitas un permiso. Según el Manual, tu solicitud…',
        opciones: [
          'la autoriza el Administrador del centro donde estés ese día',
          'no hace falta: el puesto no depende de nadie dentro del centro',
          'la firma otro Coordinador Operativo de la red',
          'la elevas a la Junta Directiva por correo, con el formato SOLICITUD DE PERMISO',
        ],
        explicacion: 'Es la única línea del Manual que dice de quién depende este puesto. En el sistema, la Junta Directiva son los dos roles de gerencia, y son los únicos que te firman una maniobra.',
        repasa: ['permiso', 'junta-directiva'],
      },
    ],

    drills: [
      {
        titulo: 'Maniobra del puesto — El producto de memoria, con los números de la red de este mes',
        fuente: 'manual-operaciones-completo.md#L1965',
        proposito: 'Que digas el producto de tu puesto sin leerlo, nombres los cinco sub-productos y des el número de cada uno en la red de este mes, señalando dónde vive.',
        gradiente: 'Es el último paso de este paquete: exige haber estudiado los bloques anteriores. Si contestas con una lista de tareas, el paso no está aprobado y se vuelve al estudio del paquete.',
        masa: [
          'Ninguna para la primera parte. De memoria.',
          'Para la segunda: la lista de colaboradores activos, el archivo de permisos del mes, el Drive de incobrables, la cobertura de firmas por centro y los cierres del mes.',
        ],
        pasos: [
          'Sin apuntes, di en una sola frase cuál es el producto de tu puesto.',
          'Nombra los cinco sub-productos y di cuáles tienen respaldo literal del Manual y cuáles son práctica de la operación.',
          'Da el número de cada uno en la red de este mes y señala el documento que lo respalda.',
          'Separa los tres que se miden por presencia en su plazo de los dos que se miden por cobertura.',
          'Di cuál de los cinco está más flojo hoy y qué vas a mover esta semana.',
        ],
        criterios: [
          'Enuncia el producto de su puesto sin leerlo y sin rodeos, dos veces en días distintos.',
          'Nombra los cinco sub-productos y da el número de cada uno en la red señalando el documento real.',
          'Separa sin ayuda lo que tiene respaldo literal del Manual de lo que es práctica de la operación.',
          'Dice que el Manual no le fija prima y no se inventa una meta que no existe.',
        ],
        errorTipico: 'Contestar la pregunta del producto con "coordino, superviso y doy seguimiento". Es una lista de tareas: no tiene su puesto tomado aunque tenga todas las casillas firmadas.',
      },
      {
        titulo: 'Maniobra del puesto — Seis situaciones de centros distintos: de quién es la decisión',
        fuente: 'manual-operaciones-completo.md#L554',
        proposito: 'Que ante cualquier situación real de la red sepas al instante si la decisión es tuya, del Administrador, de la Junta Directiva o del Corporativo, y qué te toca hacer a ti.',
        gradiente: 'Exige haber estudiado la tabla de lo que este puesto NO hace, con el Manual abierto en las diez líneas del puesto. Si fallas, el hueco está en ese bloque.',
        masa: [
          'El paquete de tu puesto, impreso.',
          'El Manual de Operaciones abierto en las diez menciones del puesto.',
          'Seis situaciones reales del mes pasado, de seis centros distintos, escritas por quien te toma la maniobra.',
        ],
        pasos: [
          'Primera situación: un Administrador quiere renovarle a alguien sin haber hecho la segunda evaluación. Di de quién es la decisión y qué te toca a ti.',
          'Segunda: te llega un permiso sin la firma del Administrador.',
          'Tercera: una factura cruzó el día 45 y la ficha del incobrable no está en el Drive.',
          'Cuarta: un padre pide una constancia escolar y el centro quiere emitirla.',
          'Quinta: el cuadro de negocio de un centro no coincide con Zoho por tres niños.',
          'Sexta: un centro va en 88 por ciento y perdió niños dos meses seguidos.',
          'En cada una, di además a quién le entregas, con qué plazo y si eso tiene respaldo literal del Manual.',
        ],
        criterios: [
          'Acierta las seis situaciones seguidas sin mirar la tabla de lo que este puesto NO hace.',
          'En cada caso dice qué produce él: recibir, verificar, confeccionar, elevar o conciliar.',
          'Distingue en voz alta cuáles de las seis tienen respaldo literal y cuáles son práctica de la operación.',
          'Ante el centro en 88 por ciento, nombra los dos marcadores por separado y no pide el promedio.',
        ],
        errorTipico: 'Decidir por el centro porque "yo veo todos los centros y tengo más contexto". Dentro de un centro decide su Administrador, y un Coordinador que decide por él deja al puesto del Administrador sin producto.',
      },
    ],
  },
]
