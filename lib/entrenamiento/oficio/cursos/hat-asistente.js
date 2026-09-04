// Paquete de Hat — Asistente Administrativo. Un solo módulo: `of-hat-asi`.
//
// FUENTE (contenido ya auditado; aquí sólo se adaptó el formato, conservando
// cifras, plazos, montos y responsables):
//   plataformas/aloha/training-moodle/hca/hat-asistente.html
//     §hat-portada · §hat-pfv · §hat-responsabilidades · §hat-no-hace · §hat-flujo
//     §hat-checksheet (sólo los dos drills; la tabla del checksheet NO se copia:
//                      la pinta la página con el plan real del rol)
//   plataformas/aloha/training-moodle/hca/drills-asistente.html §cierre
//
// POR QUÉ ESTE ARCHIVO Y NO cursos/hat.js. El curso `hat` tiene dos módulos,
// uno por puesto (of-hat-adm y of-hat-asi), escritos por dos frentes en
// paralelo. Para no pisarnos, cada rol vive en su archivo y cursos/hat.js sólo
// los concatena:
//     import { HAT_ADM } from './hat-administradora.js'
//     import { HAT_ASI } from './hat-asistente.js'
//     export const HAT = [...HAT_ADM, ...HAT_ASI]
// Lo mismo en lib/entrenamiento/respuestas-oficio/hat.js con RESPUESTAS_HAT_ASI.
//
// El `id` es la CLAVE DE PROGRESO en entrenamiento_progreso.modulo: renombrarlo
// borra en silencio el avance de todo el mundo.
//
// Los índices correctos del quiz viven en
// lib/entrenamiento/respuestas-oficio/hat-asistente.js (solo servidor).

export const HAT_ASI = [
  {
    id: 'of-hat-asi',
    curso: 'hat',
    orden: 13,
    roles: ['asistente'],
    titulo: 'Tu hat: Asistente Administrativo',
    duracionMin: 20,
    requiere: ['of-nor-9'],
    fuente: [
      'hat-asistente.html#hat-portada',
      'hat-asistente.html#hat-pfv',
      'hat-asistente.html#hat-responsabilidades',
      'hat-asistente.html#hat-no-hace',
      'hat-asistente.html#hat-flujo',
      'drills-asistente.html#cierre',
    ],

    pfv: 'Niños nuevos inscritos y facturados, y las cuentas del Centro cobradas al día — con los números que lo demuestran ya en manos del Administrador.',
    voz: 'Esto no es un instructivo más. Esto es tu hat. <break time="0.4s"/> El sombrero del puesto. <break time="0.5s"/> Aquí está qué produces, qué decides y qué NO decides. <break time="0.3s"/> De quién recibes, y a quién le entregas. <break time="0.5s"/> Tu producto no es una lista de tareas ni una actitud. <break time="0.3s"/> Es una cosa que al final del mes existe o no existe, y se puede contar. <break time="0.4s"/> El tuyo son niños nuevos inscritos y facturados. <break time="0.3s"/> Y las cuentas del Centro cobradas al día. <break time="0.5s"/> Con los números que lo demuestran, ya en manos del Administrador. <break time="0.4s"/> Y ojo con cómo se aprueba esto. <break time="0.3s"/> No respondiendo un examen. Haciéndolo, con el formato en la mano y el sistema en pantalla.',

    masa: [
      'Este paquete de hat, impreso, con el manual al lado.',
      'El Manual de Operaciones, capítulo de Descripción de Puestos, sección 2 — Asistente Administrativo, abierto en el puesto.',
      'Las seis situaciones reales del mes pasado, escritas por el Administrador del Centro.',
    ],

    // Sin 'ciclo' a propósito: el tope de palabras por módulo es 12 y estas 12
    // son las del hat. La Asistente ya lo aclara antes, en of-nor-1 ("Ciclos
    // dentro del Programa", módulo 4 de su plan contra el 13 de este), y otra
    // vez en of-zoh-3, que es donde factura la matrícula del primer ciclo.
    palabras: ['hat', 'producto-final-valioso', 'checksheet', 'drill', 'oficial-de-entrenamiento', 'prima-de-produccion', 'indicador', 'falta-grave', 'administrador-de-centro', 'coordinador-operativo', 'junta-directiva', 'corporativo-aloha'],

    bloques: [
      { t: 'sub', texto: 'Qué es esto' },
      { t: 'p', texto: 'Esto no es un instructivo más. Esto es tu **hat**: el sombrero del puesto. Aquí está qué produces, qué decides, qué NO decides, de quién recibes, a quién entregas y en qué orden se te entrena.' },
      { t: 'p', texto: 'En la metodología HCA el entrenamiento no busca que memorices. Busca que entiendas y puedas aplicar. Una persona con su hat puesto se corrige sola, rápido, sin que nadie tenga que estarla persiguiendo. Eso es lo que le da estabilidad al Centro entero.' },
      { t: 'nota', tono: 'regla', titulo: 'Regla clave del paquete', texto: 'No se aprueba respondiendo un examen. Se aprueba haciéndolo, delante del Administrador del Centro, con el formato real en la mano y el sistema real en pantalla.' },

      { t: 'sub', texto: 'Tu Producto Final Valioso' },
      { t: 'p', texto: 'Un Producto Final Valioso no es una lista de tareas ni una actitud. Es una cosa que al final del mes existe o no existe, y que se puede contar. Si el puesto desaparece, ese producto deja de existir. Ese es el examen.' },
      { t: 'p', texto: '**Niños nuevos inscritos y facturados, y las cuentas del Centro cobradas al día — con los números que lo demuestran ya en manos del Administrador.**' },
      { t: 'p', texto: 'No sale de la nada. Sale de tres lugares del manual, y los tres apuntan al mismo sitio: el objetivo de la posición habla de mantenimiento efectivo de cuentas por cobrar, control de pagos, seguimiento de Clases de Prueba y de recoger, administrar e interpretar información e indicadores; las funciones te ponen a emitir facturaciones, confeccionar cotizaciones, emitir informes del ciclo operativo y suministrar datos al Administrador; y la prima de producción — que es donde la empresa pone su dinero — te paga por exactamente dos números: nuevos niños y cuentas por cobrar. Por nada más.' },
      { t: 'p', texto: '"Atender bien a los padres" no es un producto: es la manera de conseguirlo. "Ser ordenada" tampoco. Un producto se cuenta. Estos se cuentan.' },

      { t: 'sub', texto: 'Los cuatro sub-productos que lo componen' },
      {
        t: 'tabla',
        encabezados: ['#', 'Sub-producto', 'Qué es exactamente', 'Dónde vive'],
        filas: [
          ['1', 'Niños nuevos inscritos y facturados', 'El niño que entró al Centro este mes, con su cotización convertida en factura, su kit pedido y su información pasada al Administrador para apertura de grupo', 'Zoho Books · Cuadro de negocio · Kits a pedir'],
          ['2', 'Cartera al día', 'Representantes paz y salvo. Las excepciones, gestionadas por tramo y escaladas a tiempo', 'Reporte de cuentas por cobrar de Zoho'],
          ['3', 'Informes e indicadores entregados', 'Los números del Centro, revisados y ordenados, en su frecuencia, para que el Administrador analice y reporte a la Junta Directiva', 'Drive · Zoho · formatos del manual'],
          ['4', 'Centro operativo y abastecido', 'Limpio, con suministros, con mantenimiento preventivo hecho, con kits pedidos y caja menuda cuadrada', 'Calendario de mantenimiento · bitácora · caja menuda'],
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Los sub-productos 3 y 4 no se pagan con prima', texto: 'Existen porque sin ellos los sub-productos 1 y 2 no se pueden lograr: sin kit no hay niño nuevo, sin reporte de cobranza no hay cartera al día, y sin centro operativo no hay clase que vender. Son medios de producción, no adornos.' },

      { t: 'sub', texto: 'Cómo se mide cada uno' },
      {
        t: 'tabla',
        titulo: 'Sub-producto 1 — Niños nuevos inscritos y facturados',
        encabezados: ['Indicador', 'Meta del manual', 'Qué paga', 'Frecuencia'],
        filas: [
          ['Nuevos niños', 'Mínimo 20', '75 USD/mes', 'Mensual (se desembolsa el 15)'],
          ['Nuevos niños', 'Mínimo 25', '90 USD/mes', 'Mensual (se desembolsa el 15)'],
          ['Nuevos niños', 'Mínimo 30', '105 USD/mes', 'Mensual (se desembolsa el 15)'],
          ['Nuevos niños en el trimestre', 'Mínimo 60, junto con máximo tres facturas vencidas por mes durante los tres meses', '175 USD', 'Trimestral (marzo, junio, septiembre, diciembre)'],
          ['% de asistencia a Clases de Prueba', 'El manual no fija meta; fija el cálculo: inscritos contra asistencia', '—', 'Semanal'],
          ['% de inscripción en Clases de Prueba', 'El manual no fija meta; fija el cálculo: asistentes contra inscritos', '—', 'Semanal'],
          ['Lista de inscritos actualizada de grupos nuevos', 'Actualizada', '—', 'Diario'],
        ],
      },
      { t: 'p', texto: 'Cotejo obligatorio: los niños nuevos del mes deben ser el mismo número que los kits solicitados durante el mes. Así lo exige el cuadro de negocio. Si no coinciden, uno de los dos está mal.' },
      {
        t: 'tabla',
        titulo: 'Sub-producto 2 — Cartera al día',
        encabezados: ['Indicador', 'Meta del manual', 'Qué paga', 'Frecuencia'],
        filas: [
          ['Cuentas por cobrar (mensual)', 'No tener 4 clientes con más de dos facturas generadas sin pagar — máximo tres clientes', '75 USD/mes', 'Mensual (se desembolsa el 15)'],
          ['Cuentas por cobrar (trimestral)', 'Máximo tres facturas vencidas por mes durante los tres meses, junto con mínimo 60 niños nuevos en el trimestre', '175 USD', 'Trimestral'],
          ['Seguimiento de cuentas por cobrar', 'Ejecutado por tramo, según el protocolo de factura vencida', '—', 'Semanal'],
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva: la unidad del indicador', texto: 'El manual escribe el indicador mensual en clientes ("máximo tres clientes con más de dos facturas generadas sin pagar") y el trimestral en facturas ("máximo tres facturas vencidas por mes"). No son la misma unidad. Antes de cerrar tu primer trimestre, pídele al Administrador que confirme con la Junta Directiva cuál se aplica en tu evaluación. Aquí no se inventa una interpretación.' },
      {
        t: 'tabla',
        titulo: 'Sub-producto 3 — Informes e indicadores entregados',
        encabezados: ['Entregable', 'Frecuencia que fija el manual', 'A quién'],
        filas: [
          ['Lista de inscritos actualizada de grupos nuevos', 'Diario', 'Administrador'],
          ['Control de asistencia de niños', 'Diario', 'Formato Calendario y Asistencia (Drive)'],
          ['% asistencia y % inscripción de Clases de Prueba', 'Semanal', 'Administrador'],
          ['Seguimiento de cuentas por cobrar', 'Semanal', 'Administrador'],
          ['Informe de Puntualidad de Coach', 'Quincenal', 'Administrador'],
          ['Confección de planilla', 'Días 13 y 28', 'Administrador'],
          ['Nómina de Coaches y pago a proveedores montados en Zoho', 'Antes del 13 y/o del 28; los pagos se realizan los 15 y 30', 'Administrador (él verifica)'],
          ['Cuadro de negocio y cuadro de deserciones', 'Última semana de cada mes', 'Administrador → Junta Directiva'],
          ['Informe de asistencia a Clases para Padres', 'Por cada Clase para Padres', 'Administrador'],
          ['Informe de necesidades de suministros, útiles y aseo', 'El manual no fija frecuencia', 'Administrador'],
        ],
      },
      { t: 'p', texto: 'Sé honesta con esto: el manual no fija un porcentaje de cumplimiento para la entrega de informes. Fija la frecuencia. Por eso este sub-producto se mide por presencia o ausencia en su frecuencia, no por porcentaje. Cualquier meta numérica adicional tendría que fijarla la Junta Directiva; aquí no se inventa una.' },
      {
        t: 'tabla',
        titulo: 'Sub-producto 4 — Centro operativo y abastecido',
        encabezados: ['Punto de control', 'Lo que dice el manual'],
        filas: [
          ['Personal de limpieza', 'Contrato de servicio, pago quincenal. Si falta un día, se le descuenta. Horario: lunes a viernes de 12:30 a 3:00 pm; sábados de 12:00 a 1:00 pm. Tú supervisas el trabajo'],
          ['Mantenimiento', 'Criterio de prevención, no de corrección. Calendario exclusivo de mantenimiento del Centro. Proveedor: SUPLIDORES DEL ISTMO S.A.'],
          ['Cotizaciones a proveedores', 'Cuadro comparativo entre proveedores con observación y recomendación'],
          ['Caja menuda', 'Compras menores hasta un máximo de B/.45.00. Cada compra se repone con reembolso en el sistema para mantener el fondo completo'],
          ['Bitácora', 'Libro de record con toda información importante (depósitos entregados, material recibido). Siempre con fecha y firma de los responsables'],
          ['Kits a pedir', 'Se llena por prioridad de fechas, de los Cierres de Nivel más próximos a los más lejanos. La Administradora llena el cuadro; tú haces el seguimiento a los representantes, el pedido y la actualización según la leyenda'],
        ],
      },
      { t: 'p', texto: 'El manual no define un indicador numérico para limpieza, mantenimiento ni suministros. Se mide por cumplimiento del calendario y por ausencia de incidencias, no por porcentaje.' },

      { t: 'sub', texto: 'El nivel del Centro: el número que no controlas sola' },
      { t: 'p', texto: 'La Prima de Producción Especial se paga por el nivel del Centro al cierre del trimestre, que depende de la cantidad de niños activos:' },
      {
        t: 'tabla',
        encabezados: ['Nivel', 'Niños al cierre del trimestre', 'Bono mensual para el Asistente Administrativo Senior'],
        filas: [
          ['1', 'Más de 170', '85 USD'],
          ['2', 'Más de 200', '150 USD'],
          ['3', 'Más de 230', '200 USD'],
          ['4', 'Más de 325', '243 USD (Asistente Administrativo Jr.: 43 USD)'],
          ['5', 'Más de 410', '285 USD (Asistente Administrativo Jr.: 85 USD)'],
        ],
      },
      { t: 'p', texto: 'Esta prima se desembolsa los 30 de cada mes. Si acabas de entrar al Centro, el manual manda esperar mínimo dos trimestres para incorporarte a la evaluación del nivel del centro, con la condición de tres facturas vencidas para el asistente administrativo hasta tu próxima evaluación.' },
      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva: Senior contra Jr.', texto: 'El manual escribe el bono por nivel de centro para "administradora y asistente administrativo senior", y sólo menciona al Jr. en los niveles 4 y 5. El manual no separa las funciones del Senior y del Jr. — describe un solo puesto de Asistente Administrativo. Si en tu Centro hay dos, el reparto de funciones lo define el Administrador; no está escrito.' },

      { t: 'sub', texto: 'Las responsabilidades del hat' },
      { t: 'p', texto: 'Estas son las funciones del manual, agrupadas por área, con lo que cada una produce. Si algo no está en esta lista y no es "cualquier otra tarea afín a tu cargo asignada por el Administrador", pregunta antes de hacerlo.' },
      {
        t: 'tabla',
        titulo: 'A. Atención a padres y a la operación diaria',
        encabezados: ['Función', 'Qué produce'],
        filas: [
          ['Asistencia telefónica', 'Padre atendido y su solicitud canalizada'],
          ['Redactar cartas o documentos de información interna y externa', 'Comunicación formal del Centro'],
          ['Comunicación de circulares', 'Padres informados'],
          ['Participar activamente en las operaciones diarias del negocio', 'Continuidad de la operación'],
          ['Mantener limpio y en orden equipos y sitio de trabajo', 'Puesto operativo'],
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'Regla clave de trato', texto: 'El recibimiento a cada cliente es siempre mirando a los ojos, con una sonrisa y disposición de servicio. **Nunca se tutea a un representante.** Y no se abandona el puesto de trabajo: se come exclusivamente en la hora de almuerzo.' },
      {
        t: 'tabla',
        titulo: 'B. Clases de Prueba',
        encabezados: ['Función', 'Plazo del manual', 'Qué produce'],
        filas: [
          ['Recibir de los vendedores la lista de inscritos', '2 días antes de la clase', 'Lista para confirmar'],
          ['Llamar a confirmar asistencia', 'El día anterior', '% de asistencia más alto'],
          ['Recibimiento de los padres', 'El día', 'Cliente predispuesto'],
          ['Confeccionar las propuestas de servicio', 'Mientras los representantes están en la Clase de Prueba', 'Cotización lista para convertirse en factura al salir'],
          ['Realizar el procedimiento de ventas e inscripción', 'Al cerrar', 'Niño nuevo inscrito y facturado'],
          ['Pasar la información al Administrador', 'Al inscribir', 'Insumo para apertura de grupos'],
          ['Entregar informes e indicadores ordenados y revisados', 'Semanal / diario según el indicador', 'Gestión de análisis del Administrador'],
        ],
      },
      {
        t: 'tabla',
        titulo: 'C. Facturación, cobranza y control del dinero',
        encabezados: ['Función', 'Qué produce'],
        filas: [
          ['Confeccionar cotizaciones', 'Propuesta de servicio'],
          ['Emitir facturaciones en el sistema y en la impresora fiscal', 'Ingreso registrado y auditable'],
          ['Seguimiento de cuentas por cobrar (semanal)', 'Cartera al día'],
          ['Ejecutar el protocolo de atención a facturas vencidas por tramo', 'Cliente al día o caso escalado a tiempo'],
          ['Notificar por correo a los padres que deben estar paz y salvo antes del Cierre de Nivel', 'Con 15 días de anticipación'],
          ['Cancelación a proveedores y seguimiento del informe de control de pagos', 'Proveedor pagado, control al día'],
          ['Manejo de caja menuda y su reembolso en el sistema', 'Fondo completo y compras registradas'],
          ['Llevar la bitácora de información importante', 'Trazabilidad con fecha y firma'],
          ['Realizar y montar en Zoho los pagos del mes (nómina de Coach y proveedores)', 'Nómina lista antes del 13 y del 28'],
          ['Confección de planilla (días 13 y 28)', 'Planilla'],
        ],
      },
      {
        t: 'tabla',
        titulo: 'D. Control de Coaches y de asistencia',
        encabezados: ['Función', 'Detalle del manual'],
        filas: [
          ['Llevar la asistencia de cada grupo y entregar la lista al Coach', 'El Coach firma su asistencia y tú colocas la hora de llegada'],
          ['Informe de Puntualidad de Coach (quincenal)', 'Verificación de las asistencias del mes en la lista, y envío al Administrador'],
          ['Sustento del bono por puntualidad perfecta', 'El Coach debe llegar 20 minutos antes del inicio de su clase; 15 minutos están dentro de la tolerancia. Bono: B/.15.00 mensual con un grupo, más B/.5.00 por cada grupo adicional'],
          ['Tener siempre actualizadas las listas de asistencia de niños y de Coaches', 'Función explícita del puesto'],
          ['Seguimiento a niños con mínimo dos ausencias', 'Compartido con el Administrador. El Coach avisa'],
        ],
      },
      {
        t: 'tabla',
        titulo: 'E. Clases de Reforzamiento y Clases para Padres',
        encabezados: ['Función', 'Detalle del manual'],
        filas: [
          ['Recibir la plantilla de solicitud de Clase de Reforzamiento', 'La entrega el Coach y/o el Administrador, ya autorizada por el Administrador'],
          ['Ubicar los Coaches con el nivel requerido y disponibilidad', 'Y comunicárselo al Administrador para que él decida'],
          ['Confirmar con el Coach elegido su disponibilidad', 'A la hora y fecha coordinada con el padre'],
          ['Solicitar la clase al padre y coordinar hora y fecha', 'Explicando que el Coach considera necesaria la clase y que no tiene ningún costo'],
          ['Confirmar con representante y Coach', 'Mínimo 1 día de anticipación, con ambos'],
          ['Verificar requisitos antes de coordinar', 'Tres asistencias consecutivas · sin Clase de Repaso siguiente a la petición · representante paz y salvo. Si no está paz y salvo, llamarlo para informarle que debe estarlo para que la clase se dé'],
          ['Informe de asistencia a Clases para Padres', 'Pasar lista, comparar con la lista completa e invitar a los que faltaron a la próxima Clase para Padres'],
        ],
      },
      { t: 'p', texto: 'El Coach del niño no debe dar la Clase de Reforzamiento.' },
      { t: 'nota', tono: 'ojo', titulo: 'Pendiente con la Junta Directiva: desde qué semana se da el reforzamiento', texto: 'El manual se contradice, y esto lo verifican dos puestos a la vez. La sección del Asistente Administrativo dice Kids posterior a la 3.ª semana de libro y Tiny Tots posterior a la semana 4; la sección del Administrador de Centro dice Kids posterior a la semana 2 del libro y Tiny Tots posterior a la semana 2. Son dos reglas incompatibles para el mismo requisito. Hasta que la Junta Directiva defina cuál rige, debes conocer las dos y no elegir por tu cuenta: aplica la que el Centro esté usando hoy, anota al lado que hay discrepancia sin resolver, y pídele al Administrador que la lleve a la Junta. Si tú rechazas por "semana 3" un reforzamiento que el Administrador autorizó en semana 2, el que pierde es el niño.' },
      {
        t: 'tabla',
        titulo: 'F. Informes administrativos y proyección',
        encabezados: ['Función', 'Cuándo'],
        filas: [
          ['Confección del cuadro de negocio', 'Última semana de cada mes'],
          ['Cuadro de control de grupos y resumen de niños mensual', 'Mensual'],
          ['Cuadro de deserciones, con niño, grupo, Coach y motivo', 'Mensual'],
          ['Seguimiento del formato Kits a Pedir y pedido de materiales', 'Por prioridad de fechas de Cierre de Nivel'],
          ['Planificación de necesidades futuras', 'Solicitada por C&C Soluciones Integrales'],
          ['Reportes de control de inventarios', 'Periódico'],
          ['Detalles de seguimiento a liquidaciones de mercancías', 'Según ocurra'],
          ['Informe de necesidades de suministros, útiles de oficina y materiales de aseo', 'Según necesidad operativa'],
          ['Levantar los manuales de respaldo a las funciones asignadas', 'Función explícita del puesto'],
          ['Llenar reportes periódicos de las tareas asignadas', 'Periódico'],
        ],
      },
      { t: 'p', texto: 'La fórmula del cuadro de negocio, literal: **niños que ya están (del total del mes anterior) + niños nuevos del mes − deserciones = niños del Centro en el mes.** Y los niños nuevos deben ser iguales a los kits solicitados en el mes.' },
      { t: 'sub', texto: 'G. Mantenimiento y proveedores' },
      { t: 'p', texto: 'Flujo de atención al Centro, en el orden del manual: confección de calendarios de mantenimiento → cotización → gestión de adquisición → evaluación de cumplimiento → cancelación a proveedores → seguimiento del informe de control de pagos. Y supervisar el trabajo del personal de limpieza.' },
      { t: 'sub', texto: 'H. Sistema y conocimiento del negocio' },
      { t: 'p', texto: 'Conocer el ciclo completo de las operaciones del negocio — no sólo tu parte — para poder evaluar mejoras al proceso. Manejar el sistema de información financiera y operativo para emitir informes. Manejo de Office, internet e intranet.' },

      { t: 'sub', texto: 'Lo que este hat NO hace' },
      { t: 'p', texto: 'Esto es tan importante como lo anterior. Un hat mal delimitado produce invasión de puesto: dos personas decidiendo lo mismo, o una decidiendo lo que no le toca. Cuando eso pasa, la responsabilidad se diluye y el producto desaparece.' },
      { t: 'nota', tono: 'regla', titulo: 'Regla clave', texto: 'Tú propones, coordinas, ejecutas y documentas. Las decisiones de esta tabla no son tuyas. Llevarlas a quien le toca no es debilidad: es tu hat funcionando bien.' },
      {
        t: 'tabla',
        encabezados: ['Decisión', 'De quién es', 'Qué haces tú'],
        filas: [
          ['Autorizar un descuento por retención (10 %, 15 %, 25 %, 25 % más 10 %)', 'Administrador de Centro — son sus herramientas de no salida', 'Clasificas el motivo de salida en una de las cuatro categorías y le pasas el caso'],
          ['Decidir un acuerdo de pago o el retiro del programa deteniendo la factura recurrente', 'Administrador de Centro', 'Le informas la situación del acudiente en el tramo 16-30 días. Si hay arreglo, dejas evidencia y notificas de inmediato al Coordinador Operativo'],
          ['Autorizar una Clase de Reforzamiento', 'Administrador de Centro', 'Recibes la plantilla ya autorizada y coordinas'],
          ['Decidir qué Coach da la Clase de Reforzamiento', 'Administrador de Centro, tomando en cuenta aptitudes y personalidad', 'Le presentas los Coaches con el nivel requerido y disponibilidad'],
          ['Emitir, elaborar o firmar una constancia escolar o certificación académica', 'Exclusivamente el Corporativo ALOHA. Ningún centro, administrador o coach está autorizado', 'Recibes la solicitud del padre (1 día hábil) y la envías al corporativo dentro de las 24 horas posteriores. El corporativo emite en máximo 3 días hábiles'],
          ['Aprobar el ingreso de un niño fuera del rango de edad oficial (ubicación excepcional)', 'Corporativo ALOHA, con informe técnico firmado por evaluador y Administrador', 'Nada por tu cuenta. Los centros no están autorizados a decidirlo de forma unilateral o discrecional'],
          ['Verificar la nómina y enviar la factura a cada Coach', 'Administrador de Centro', 'Realizas y montas los pagos en Zoho antes del 13 y/o del 28'],
          ['Apertura de grupos', 'Administrador de Centro', 'Le pasas la información de los inscritos'],
          ['Pasar la lista de morosos al personal de cobro (tramo 46-61 días)', 'Coordinador Operativo', 'Antes de eso, colocas los datos del cliente en el drive de cuentas incobrables'],
          ['Verificar el drive de cuentas incobrables', 'Coordinador Operativo', 'Colocas la información completa a tiempo'],
          ['Cambiar de proveedor de mantenimiento por fallas, atrasos o trabajo inadecuado', 'Administrador, con previo aviso a la Junta Directiva', 'Documentas la falla en la evaluación de cumplimiento'],
          ['Aprobar tu propio permiso', 'Administrador de Centro — queda autorizado sólo al momento de su firma', 'Lo solicitas por escrito con mínimo 3 días de anticipación, en el formato de Solicitud de Permisos'],
          ['Elaborar contratos de personal', 'Coordinador Operativo (el Administrador solicita)', 'Nada. No es de tu hat'],
          ['Aprobar nuevas estrategias, mecanismos o materiales didácticos', 'Administración General — se aplica a todos los Centros como franquicia', 'Propones al Administrador'],
          ['Establecer o modificar el programa de incentivos y primas', 'Junta Directiva del Centro', 'Produces los números veraces sobre los que se evalúa'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'Faltas graves y causal de despido inmediato', texto: 'Literal del manual: alterar o manipular la información de edad o fecha de nacimiento de un estudiante; tramitar inscripciones en itinerarios no autorizados; presentar informes falsificados o alterados; emitir constancias sin autorización corporativa; modificar, replicar o firmar formatos oficiales sin consentimiento; alterar datos del estudiante o fechas de ingreso.' },

      { t: 'sub', texto: 'De quién recibes y a quién entregas' },
      { t: 'p', texto: 'Tu puesto es un nodo, no una isla. Si un insumo no te llega, tu producto no sale — y es tu trabajo reclamarlo, no esperarlo.' },
      {
        t: 'tabla',
        titulo: 'Lo que te llega',
        encabezados: ['Insumo', 'De quién', 'Cuándo'],
        filas: [
          ['Lista de inscritos a la Clase de Prueba', 'Vendedores', '2 días antes de la clase'],
          ['Asistencia del grupo marcada', 'Coach', 'Al instante de dar su clase, con la leyenda de colores del formato'],
          ['Firma de asistencia del Coach', 'Coach', 'Al recibir la lista del grupo; tú colocas la hora de llegada'],
          ['Aviso de niño con mínimo dos ausencias', 'Coach', 'Cuando ocurre — es responsabilidad del Coach avisar'],
          ['Plantilla de solicitud de Clase de Reforzamiento', 'Coach y/o Administrador, ya autorizada por el Administrador', 'Cuando se requiere reforzamiento fuera del horario regular'],
          ['Autorización de descuento, acuerdo de pago o retiro', 'Administrador de Centro', 'Tras escalarle el caso en el tramo 16-30 días'],
          ['Decisión del Coach que dará el reforzamiento', 'Administrador de Centro', 'Tras presentarle las opciones'],
          ['Cuadro Kits a Pedir lleno', 'Administradora', 'Antes de que tú hagas el seguimiento y el pedido'],
          ['Factura de servicio del Coach (nombre, cédula y dígito verificador)', 'Coach', 'Al momento de la revisión del pago de la nómina — exigencia del auditor'],
          ['Constancia escolar en PDF institucional', 'Corporativo ALOHA', 'Máximo 3 días hábiles desde la recepción completa'],
          ['Solicitud de planificación de necesidades futuras', 'C&C Soluciones Integrales', 'Para los pedidos de cada Centro'],
        ],
      },
      {
        t: 'tabla',
        titulo: 'Lo que entregas',
        encabezados: ['Entrega', 'A quién', 'Cuándo'],
        filas: [
          ['Llamada de confirmación de asistencia a la Clase de Prueba', 'Representante inscrito', 'El día anterior a la clase'],
          ['Cotización de servicio', 'Representante', 'Lista al salir de la Clase de Prueba — se confecciona durante la clase'],
          ['Información de los inscritos', 'Administrador', 'Al inscribir, para apertura de grupos'],
          ['Lista de inscritos actualizada de grupos nuevos', 'Administrador', 'Diario'],
          ['% asistencia y % inscripción de Clases de Prueba', 'Administrador', 'Semanal'],
          ['Seguimiento de cuentas por cobrar', 'Administrador', 'Semanal'],
          ['Aviso de factura emitida (llamada o WhatsApp)', 'Acudiente', 'Tramo de emisión, días 1-15'],
          ['Situación del acudiente moroso más aviso de que no podrá asistir a clase hasta estar paz y salvo', 'Administrador y acudiente', 'Vencimiento 1-15 días (día 16 al 30)'],
          ['Datos del cliente en el drive de cuentas incobrables', 'Drive — lo verifica el Coordinador Operativo', 'Vencimiento 15-30 días (día 31 al 45), si el acuerdo no fue efectivo'],
          ['Evidencia del arreglo de pago', 'Coordinador Operativo', 'De inmediato'],
          ['Informe de Puntualidad de Coach', 'Administrador', 'Quincenal'],
          ['Confirmación de la Clase de Reforzamiento', 'Representante y Coach designado', 'Mínimo 1 día de anticipación, con los dos'],
          ['Invitación a la próxima Clase para Padres', 'Padres que faltaron', 'Después de cada Clase para Padres'],
          ['Correo de paz y salvo antes del Cierre de Nivel', 'Padres', '15 días de anticipación'],
          ['Nómina de Coaches y pagos a proveedores montados en Zoho', 'Administrador (él verifica y envía la factura a cada Coach)', 'Antes del 13 y/o del 28; los pagos se realizan los 15 y 30'],
          ['Planilla', 'Administrador', 'Días 13 y 28'],
          ['Cuadro de negocio, control de grupos y cuadro de deserciones', 'Administrador → Junta Directiva', 'Última semana de cada mes'],
          ['Solicitud de constancia escolar completa', 'Corporativo ALOHA', 'Recepción del padre: 1 día hábil. Envío al corporativo: dentro de las 24 horas posteriores'],
          ['Documentos de permisos autorizados', 'Coordinador Operativo', 'Inmediatamente después de ser autorizados'],
          ['Pedido de materiales y kits', 'Proveedor / corporativo, según el formato', 'Por prioridad de fechas de Cierre de Nivel'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'El error caro de esta sección', texto: 'Esperar el insumo en silencio. Si los vendedores no te pasaron la lista de inscritos 2 días antes, no llamas a confirmar; si no llamas, la asistencia baja; si la asistencia baja, no hay inscritos; si no hay inscritos, no hay niños nuevos y no hay prima. Tu producto depende de insumos ajenos: reclámalos el día que tocaban, por escrito, y avísale al Administrador.' },

      { t: 'sub', texto: 'La prueba de hat' },
      { t: 'p', texto: 'Si no puedes decir tu PFV de memoria, no estás hatted. No importa cuántos módulos hayas leído ni cuántas evaluaciones hayas aprobado. El Administrador te va a preguntar, sin aviso, en cualquier momento del entrenamiento: "¿Cuál es tu producto?". Si contestas con una lista de tareas o con "atender a los padres", el paso no está aprobado.' },
      { t: 'nota', tono: 'alerta', titulo: 'Falta grave', texto: 'El manual es explícito: los datos, informes de indicadores y reportes deben ser veraces, precisos, completos y verificables. Omitir, manipular o falsear cualquier información constituye una falta grave de carácter laboral, ético y legal. Un número forzado para que el cuadro cuadre no es un error administrativo: es una falta grave. Si no cuadra, se busca la diferencia y se reporta.' },
    ],

    quiz: [
      {
        pregunta: '¿Cuál es tu Producto Final Valioso como Asistente Administrativo?',
        opciones: [
          'Atender bien a los padres y mantener el Centro ordenado',
          'Registrar en Zoho Books todo lo que ocurre en el Centro',
          'Niños nuevos inscritos y facturados, y las cuentas del Centro cobradas al día, con los números que lo demuestran ya en manos del Administrador',
          'Cumplir las tareas que el Administrador te asigne cada día',
        ],
        explicacion: 'Un producto se cuenta. "Atender bien a los padres" y "ser ordenada" son la manera de conseguirlo, no el producto.',
        repasa: ['producto-final-valioso'],
      },
      {
        pregunta: 'La prima de producción del Asistente Administrativo paga exactamente por…',
        opciones: [
          'los cuatro sub-productos por igual',
          'la entrega puntual de todos los informes',
          'el orden del Centro y la atención a los padres',
          'dos números: nuevos niños y cuentas por cobrar',
        ],
        explicacion: 'Por esos dos y por nada más. Es donde la empresa pone su dinero, y por eso definen el producto del puesto.',
        repasa: ['prima-de-produccion'],
      },
      {
        pregunta: 'Los sub-productos 3 (informes e indicadores) y 4 (Centro operativo y abastecido)…',
        opciones: [
          'no se pagan con prima, pero sin ellos los sub-productos 1 y 2 no se pueden lograr',
          'se pagan con la prima trimestral',
          'son opcionales cuando el Centro va bien',
          'los produce la Administradora, no tú',
        ],
        explicacion: 'Sin kit no hay niño nuevo, sin reporte de cobranza no hay cartera al día y sin centro operativo no hay clase que vender. Son medios de producción, no adornos.',
      },
      {
        pregunta: 'Un padre insiste en que le des un descuento para no retirar al niño. La decisión es…',
        opciones: [
          'tuya, si el padre ya tiene dos facturas vencidas',
          'del Administrador de Centro: son sus herramientas de no salida; tú clasificas el motivo y le pasas el caso',
          'del Coordinador Operativo',
          'de la Junta Directiva',
        ],
        explicacion: 'Tú propones, coordinas, ejecutas y documentas. Esa decisión no es tuya, y llevarla a quien le toca es tu hat funcionando bien.',
        repasa: ['herramientas-de-no-salida', 'administrador-de-centro'],
      },
      {
        pregunta: 'Un representante pide una constancia escolar: tú la emites y la firmas en el Centro.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'La emite exclusivamente el Corporativo ALOHA. Tú recibes la solicitud (1 día hábil) y la envías al corporativo dentro de las 24 horas posteriores; ellos emiten en máximo 3 días hábiles.',
        repasa: ['constancia-escolar', 'corporativo-aloha'],
      },
      {
        pregunta: 'Los vendedores no te pasaron la lista de inscritos a la Clase de Prueba dos días antes. Lo correcto es…',
        opciones: [
          'esperar a que llegue: ese insumo es de ellos',
          'hacer la clase de prueba sin lista y contar a los que aparezcan',
          'pedirle al Administrador que la consiga él',
          'reclamarla el día que tocaba, por escrito, y avisarle al Administrador',
        ],
        explicacion: 'Tu producto depende de insumos ajenos. Sin lista no llamas a confirmar, la asistencia baja, no hay inscritos y no hay prima.',
      },
    ],

    drills: [
      {
        titulo: 'Drill del hat — Decir el PFV de memoria y sostener los cuatro sub-productos',
        fuente: 'hat-asistente.html#hat-checksheet',
        proposito: 'Que puedas decir tu Producto Final Valioso sin leerlo, nombrar los cuatro sub-productos y dar el número de cada uno en tu Centro este mes, señalando el documento que lo respalda.',
        gradiente: 'Es el paso 6 del checksheet: exige el paso 5 (estudiar los bloques 1 a 4 de este hat) aprobado. Si contestas con una lista de tareas, el paso no está aprobado y se vuelve al paso 5, no se repite este.',
        masa: [
          'Ninguna. De memoria.',
          'Para la segunda parte: cuadro de negocio del mes cerrado, reporte de cuentas por cobrar, cuadro de deserciones y órdenes de kits.',
        ],
        pasos: [
          'Sin apuntes, di en una sola frase cuál es tu Producto Final Valioso.',
          'Nombra los cuatro sub-productos y di el número exacto de cada uno en tu Centro este mes.',
          'Señala en pantalla el documento que respalda cada número.',
          'Di cuál de los cuatro está más flojo hoy y qué drill vas a repetir para levantarlo.',
        ],
        criterios: [
          'Enuncia su Producto Final Valioso sin leerlo y sin rodeos, dos veces en días distintos.',
          'Da los números de sus cuatro sub-productos de memoria y los respalda señalando el documento.',
          'Identifica por sí misma el sub-producto más débil y el drill al que va a volver, sin que el Oficial se lo diga.',
        ],
        errorTipico: 'Contestar la pregunta "¿cuál es tu producto?" con una lista de tareas o con "atender a los padres". No está hatted, aunque tenga todas las casillas firmadas: se devuelve al estudio del hat.',
      },
      {
        titulo: 'Drill del hat — Las seis situaciones: de quién es la decisión',
        fuente: 'hat-asistente.html#hat-checksheet',
        proposito: 'Que ante cualquier situación real del Centro sepas al instante si la decisión es tuya o de quién es, y qué te toca hacer a ti en cada caso.',
        gradiente: 'Es el paso 5 del checksheet: exige haber estudiado los bloques 1 a 4 de este hat, con el Manual de Operaciones abierto en la sección del puesto. Si fallas, el hueco está en el bloque de "lo que este hat NO hace", no en el drill.',
        masa: [
          'Este paquete de hat, impreso.',
          'El Manual de Operaciones, capítulo de Descripción de Puestos, sección 2 — Asistente Administrativo, abierto en el puesto.',
          'Las seis situaciones reales del mes pasado, escritas por el Administrador.',
        ],
        pasos: [
          'El Administrador te dicta la primera situación: un padre pide un descuento. Di si la decisión es tuya o de quién es, y qué te toca hacer a ti.',
          'Segunda: un padre pide una constancia escolar.',
          'Tercera: un Coach pide que su pago se haga a otra cuenta.',
          'Cuarta: hay que abrir un grupo.',
          'Quinta: hay que autorizar una Clase de Reforzamiento.',
          'Sexta: hay que pasar un moroso a incobrables.',
          'En cada una, di además a quién le entregas y con qué plazo.',
        ],
        criterios: [
          'Acierta las seis situaciones seguidas, sin mirar la tabla de "lo que este hat NO hace".',
          'En cada caso dice no sólo de quién es la decisión, sino qué produce ella: clasificar, escalar, documentar o ejecutar.',
          'Ante el caso de la constancia, nombra el plazo completo: recepción 1 día hábil, envío al corporativo dentro de las 24 horas, emisión del corporativo en máximo 3 días hábiles.',
          'Ante el caso del pago a otra cuenta, exige la autorización escrita y firmada por el colaborador, archivada en su file.',
        ],
        errorTipico: 'Resolver por buena voluntad lo que no le toca: prometerle el descuento al padre, o firmar la constancia "para no hacerlo esperar". Emitir constancias sin autorización corporativa está listado en el manual como falta grave y causal de despido inmediato.',
      },
    ],
  },
]
