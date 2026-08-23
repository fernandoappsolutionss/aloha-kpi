// Contenido del entrenamiento en-app. Fuente: docs/sop/sop-aloha-kpi.html.
// Regla: cada `target` debe existir como data-tour="<target>" en app/ o
// components/ (lo verifica test/entrenamiento.test.mjs). Cambiar un botón =
// cambiar este archivo en el mismo PR.
// `{id}` en rutas se sustituye por el centroId actual.
// El tour NUNCA pide confirmar una acción que escriba datos (spec §3).

export const MODULOS = [
  {
    id: 'meta',
    orden: 1,
    titulo: 'Tu meta: subir de nivel',
    duracionMin: 4,
    intro: {
      texto: 'ALOHA reconoce a cada centro por niveles: 170, 200, 230, 325 y 410 niños activos al cierre del trimestre, con deserción mensual por debajo del 8%. Este sistema existe para que tú sepas, cada día, cuántos niños te faltan y qué mover para llegar.',
      voz: 'ALOHA reconoce a cada centro por NIVELES. <break time="0.4s"/> Ciento setenta, doscientos, doscientos treinta, trescientos veinticinco y cuatrocientos diez niños activos al cierre del trimestre, <break time="0.3s"/> con deserción mensual por debajo del ocho por ciento. <break time="0.5s"/> Este sistema existe para que TÚ sepas, cada día, cuántos niños te faltan y qué mover para llegar.',
    },
    inicio: { ruta: '/centro/{id}' },
    pasos: [
      { id: 'meta-1', tipo: 'mostrar', target: 'resumen.ruta', titulo: 'Lo primero que ves', texto: 'Cuántos niños tienes y cuántos te faltan para el próximo nivel. Todo lo demás del sistema existe para mover esta barra.' },
      { id: 'meta-2', tipo: 'mostrar', target: 'resumen.metas', titulo: 'Tus metas por rol', texto: 'Las metas del trimestre separadas por administrador y asistente. Verde cumple, rojo no. Se calculan solas con lo que registras: aquí no se digita nada.' },
      { id: 'meta-3', tipo: 'mostrar', target: 'resumen.embudo', titulo: 'Tu embudo', texto: 'Invitados, asistieron, matriculados. Si la conversión de la clase de prueba baja, la barra de nivel se frena. Aquí se ve antes que en ningún lado.' },
      { id: 'meta-4', tipo: 'hazlo', target: 'nav.ruta', titulo: 'Vamos a la ruta', texto: 'Haz clic en Ruta de Nivel en el menú.', ruta: '/centro/{id}/ruta-nivel' },
      { id: 'meta-5', tipo: 'mostrar', target: 'ruta.barra', titulo: 'La barra no sube por vender', texto: 'Los niveles son 170, 200, 230, 325 y 410 niños activos al cierre del trimestre. La barra sube cuando el niño EMPIEZA clases, no cuando vendes.' },
      { id: 'meta-6', tipo: 'mostrar', target: 'ruta.escenarios', titulo: 'Tres escenarios', texto: 'Conservador, ritmo actual y plan de acción: en qué fecha llegarías con cada uno. Si dice "sin fecha confiable", faltan fechas de inicio por cargar, no vas mal.' },
    ],
    quiz: [
      { pregunta: '¿Qué hace subir la barra de tu nivel?', opciones: ['Vender un niño', 'Crear la clase de prueba', 'Que el niño empiece clases', 'Cerrar el mes'], explicacion: 'El nivel se mide por niños activos, y un niño es activo desde su fecha de inicio de clases. La venta sola no mueve la barra.' },
      { pregunta: 'Tu centro cierra el trimestre con 150 niños activos. ¿Qué nivel tiene?', opciones: ['Nivel 1', 'Sin nivel', 'Nivel 2', 'Nivel 0 por deserción'], explicacion: 'Nivel 1 exige 170 o más. Con 150 el centro queda sin nivel.' },
      { pregunta: 'La Ruta de Nivel dice "Sin fecha confiable". ¿Qué significa?', opciones: ['Que vas mal', 'Que el sistema está caído', 'Que ya llegaste a la meta', 'Que faltan fechas de inicio por cargar'], explicacion: 'Sin fechas de inicio el sistema no puede proyectar. Carga las fechas y la ruta se vuelve confiable.' },
    ],
    errores: [
      { sintoma: 'Vendí 5 niños y la barra de nivel no se movió.', causa: 'Los niños no tienen fecha de inicio de clases (su grupo no la tiene o están sin grupo).', arreglo: 'Ponle la fecha de inicio al grupo en Editar grupo, o asigna el grupo al niño en su ficha.' },
    ],
  },
  {
    id: 'modelo',
    orden: 2,
    titulo: 'El modelo: todo nace del grupo',
    duracionMin: 3,
    intro: {
      texto: 'En este sistema el niño no se inscribe al aire: se inscribe a un grupo. Y el grupo no aparece solo: tú lo aperturas y lo llenas. Aperturas el grupo, amarras la clase de prueba a ese grupo, inscribes al niño que asistió. El KPI, el Cuadro y tu ruta se llenan solos.',
      voz: 'En este sistema el niño NO se inscribe al aire. <break time="0.3s"/> Se inscribe a un GRUPO. <break time="0.4s"/> Y el grupo no aparece solo: tú lo aperturas y lo llenas. <break time="0.5s"/> Aperturas el grupo, <break time="0.2s"/> amarras la clase de prueba a ese grupo, <break time="0.2s"/> inscribes al niño que asistió. <break time="0.4s"/> El KPI, el Cuadro y tu ruta <break time="0.2s"/> se llenan SOLOS.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'modelo-1', tipo: 'mostrar', target: 'grupos.lista', titulo: 'El grupo es la unidad', texto: 'Todo nace del grupo. El niño no se inscribe al aire: se inscribe a un grupo. Y el grupo lo aperturas y lo llenas tú.' },
      { id: 'modelo-2', tipo: 'mostrar', target: 'grupos.aperturar', titulo: 'Paso uno', texto: 'Aperturas el grupo con día, hora, coach y fecha de inicio de clases.' },
      { id: 'modelo-3', tipo: 'mostrar', target: 'nav.eventos', titulo: 'Paso dos', texto: 'Creas la clase de prueba y la amarras a ese grupo. Así el sistema sabe a quién estás llenando y ventas ve los cupos.' },
      { id: 'modelo-4', tipo: 'mostrar', target: 'grupos.inscribir', titulo: 'Paso tres', texto: 'Inscribes al niño que asistió, en ese grupo.' },
      { id: 'modelo-5', tipo: 'mostrar', target: 'nav.kpi', titulo: 'Y el resto se llena solo', texto: 'El KPI, el Cuadro de Negocio y tu ruta de nivel salen de esos tres movimientos. Lo único que capturas a mano es la realidad operativa; los números los calcula el sistema.' },
      { id: 'modelo-6', tipo: 'mostrar', target: 'nav.cuadro', titulo: 'Si un número está mal', texto: 'No lo corrijas en el Cuadro ni en el KPI. Corrige el hecho que lo produjo: la fecha del grupo, el grupo del niño, su retiro. El número se recalcula solo.' },
    ],
    quiz: [
      { pregunta: '¿Qué es lo único que capturas a mano en el sistema?', opciones: ['Los royalties', 'La realidad operativa: grupos, clases de prueba, inscripciones, retiros', 'El KPI mensual', 'El promedio de niños por grupo'], explicacion: 'Los números los produce el sistema a partir de los hechos operativos que tú registras.' },
      { pregunta: 'El Cuadro muestra 0 nuevos activos aunque vendiste 5. ¿Qué haces?', opciones: ['Editar el número en el Cuadro', 'Cerrar el mes y seguir', 'Revisar que el grupo tenga fecha de inicio y los niños su grupo', 'Borrar los niños y volverlos a meter'], explicacion: 'Un número forzado descuadra al mes siguiente. Se corrige el hecho de origen y el Cuadro se recalcula.' },
      { pregunta: '¿Cuál es el orden correcto del modelo?', opciones: ['Niño → grupo → clase de prueba', 'Grupo → clase de prueba amarrada → niño en el grupo', 'Clase de prueba → niño → grupo', 'Da igual el orden'], explicacion: 'Primero existe el grupo; la clase de prueba lo llena; el niño entra a ese grupo.' },
    ],
    errores: [
      { sintoma: 'Corrijo un número en el KPI y al mes siguiente vuelve a salir mal.', causa: 'Se corrigió el resultado, no el hecho que lo produce.', arreglo: 'Corrige el grupo, el niño o el retiro de origen. El número se recalcula solo.' },
    ],
  },
  {
    id: 'aperturar',
    orden: 3,
    titulo: 'Aperturar un grupo',
    duracionMin: 4,
    intro: {
      texto: 'Aperturar un grupo es el primer movimiento de todo. Vas a ver cada campo del formulario y cuál de ellos decide si tus niños cuentan o no. Hoy solo miramos: no vas a crear nada.',
      voz: 'Aperturar un grupo es el PRIMER movimiento de todo. <break time="0.4s"/> Vas a ver cada campo del formulario <break time="0.2s"/> y cuál de ellos decide si tus niños cuentan o no. <break time="0.5s"/> Hoy solo miramos: <break time="0.2s"/> no vas a crear nada.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'ap-1', tipo: 'hazlo', target: 'grupos.aperturar', titulo: 'Abre el formulario', texto: 'Haz clic en Aperturar grupo. Hoy solo vamos a mirar: no vas a crear nada.' },
      { id: 'ap-2', tipo: 'mostrar', target: 'aperturar.numero', titulo: 'Número de grupo', texto: 'El número con el que el centro conoce al grupo. El sistema te propone el siguiente libre.' },
      { id: 'ap-3', tipo: 'mostrar', target: 'aperturar.itinerario', titulo: 'Itinerario', texto: 'TINY, KIDS o KINDER. Define la regla de llenado y los niveles disponibles.' },
      { id: 'ap-4', tipo: 'mostrar', target: 'aperturar.fecha-inicio', titulo: 'El campo más importante', texto: 'La fecha de inicio de clases mete al grupo en el Cuadro de Negocio y convierte a sus niños en activos. Sin fecha, tu nivel no avanza aunque hayas vendido.' },
      { id: 'ap-5', tipo: 'mostrar', target: 'aperturar.nivel', titulo: 'Nivel inicial', texto: 'Con qué nivel arranca. Casi siempre uno. Debajo el sistema te recuerda la apertura mínima del manual: con menos, abre igual pero bajo tu responsabilidad.' },
      { id: 'ap-6', tipo: 'mostrar', target: 'aperturar.online', titulo: 'Grupo online', texto: 'Márcalo solo si es virtual: queda exento de la alerta de fusión y del promedio de niños por grupo.' },
      { id: 'ap-7', tipo: 'hazlo', target: 'aperturar.cancelar', titulo: 'Cierra sin guardar', texto: 'Haz clic en Cancelar. Cuando abras uno de verdad, llenas esto y confirmas con el botón verde.' },
      { id: 'ap-8', tipo: 'mostrar', target: 'grupos.aperturar', titulo: 'Listo', texto: 'Eso es aperturar. Recuerda: la fecha de inicio es sagrada, y cuando llega, el grupo queda cerrado a edición salvo horario y coach.' },
    ],
    quiz: [
      { pregunta: '¿Cuál es el campo más importante al aperturar un grupo?', opciones: ['Número de grupo', 'Niños con los que abre', 'Grupo online', 'Fecha de inicio de clases'], explicacion: 'Esa fecha mete al grupo en el Cuadro y convierte a sus niños en activos. Sin ella, no hay nivel que suba.' },
      { pregunta: 'Abres un TINY nivel 1 con 5 niños. ¿Qué pasa?', opciones: ['Abre, pero queda bajo responsabilidad del centro (mínimo del manual: 8)', 'El sistema no lo deja abrir', 'Se marca como online', 'Se fusiona solo'], explicacion: 'El sistema avisa el mínimo del manual pero no bloquea: la responsabilidad queda en el centro.' },
      { pregunta: 'Llega la fecha de inicio del grupo. ¿Qué sigues pudiendo editar?', opciones: ['Todo', 'Nada', 'Solo horario y coach', 'Solo el número'], explicacion: 'Cuando el grupo inició, queda cerrado a edición salvo horario y coach.' },
    ],
    errores: [
      { sintoma: 'Aperturé el grupo pero no aparece en el Cuadro de Negocio.', causa: 'Sin fecha de inicio de clases, o con una fecha futura.', arreglo: 'El grupo entra al Cuadro en el mes de su fecha de inicio. Revísala en Editar grupo.' },
      { sintoma: 'Abrí el grupo con pocos niños y me sale "bajo meta".', causa: 'Quedó por debajo de la apertura mínima del manual.', arreglo: 'Es una alerta, no un bloqueo: llénalo en su ventana o busca fusión.' },
    ],
  },
  {
    id: 'clase-prueba',
    orden: 4,
    titulo: 'La clase de prueba amarrada al grupo',
    duracionMin: 4,
    intro: {
      texto: 'La clase de prueba es el motor de llenado. Pero solo sirve si está amarrada al grupo que estás llenando: así ventas ve los cupos y tú sabes qué clase te trajo a cada niño. Vamos a ver dónde se hace ese amarre.',
      voz: 'La clase de prueba es el MOTOR de llenado. <break time="0.4s"/> Pero solo sirve si está amarrada al grupo que estás llenando: <break time="0.3s"/> así ventas ve los cupos <break time="0.2s"/> y tú sabes qué clase te trajo a cada niño. <break time="0.5s"/> Vamos a ver dónde se hace ese amarre.',
    },
    inicio: { ruta: '/centro/{id}/eventos' },
    pasos: [
      { id: 'cp-1', tipo: 'mostrar', target: 'eventos.metricas', titulo: 'Tu tablero de conversión', texto: 'Registrados, asistieron, no asistieron, pagados. Aquí se mide si la clase de prueba sirvió.' },
      { id: 'cp-2', tipo: 'hazlo', target: 'eventos.nueva', titulo: 'Abre el formulario', texto: 'Haz clic en Nueva clase de prueba. Solo vamos a mirar.' },
      { id: 'cp-3', tipo: 'mostrar', target: 'evento.grupo', titulo: 'El amarre', texto: 'Este campo une la clase de prueba con el grupo que estás llenando. Si lo dejas en "Sin grupo", ventas no ve cupos y pierdes el rastro de qué clase te trajo al niño.' },
      { id: 'cp-4', tipo: 'mostrar', target: 'evento.inicio', titulo: 'Fecha y hora', texto: 'De aquí salen los recordatorios automáticos a los registrados. Ponla bien desde el principio.' },
      { id: 'cp-5', tipo: 'hazlo', target: 'evento.cancelar', titulo: 'Cierra sin guardar', texto: 'Haz clic en Cancelar. Los niños que asistan a una clase amarrada quedan como candidatos de ese grupo.' },
      { id: 'cp-6', tipo: 'mostrar', target: 'eventos.lista', titulo: 'La señal de alarma', texto: 'En la lista, "Sin grupo relacionado" es una clase que se creó sin amarre. Evítalo.' },
    ],
    quiz: [
      { pregunta: '¿Para qué sirve el campo "Grupo que se va a aperturar"?', opciones: ['Para el nombre de la clase', 'Para el precio', 'Para amarrar la clase al grupo que llenas y que ventas vea cupos', 'Para la zona horaria'], explicacion: 'Es el amarre del modelo: sin él, la clase de prueba queda suelta.' },
      { pregunta: 'Ves "Sin grupo relacionado" en la lista. ¿Qué significa?', opciones: ['La clase se canceló', 'Se creó sin amarre: nadie sabe qué grupo llenaba', 'No hubo registrados', 'Es una clase gratis'], explicacion: 'Se puede corregir editando la clase y eligiendo el grupo.' },
      { pregunta: '¿Dónde ves si tu clase de prueba sirvió?', opciones: ['En FODA', 'En Ruta de Nivel', 'En el Cuadro de Negocio', 'En el tablero de Clases de Prueba: asistieron y pagados'], explicacion: 'Ese tablero es tu embudo: registrados → asistieron → pagados.' },
    ],
    errores: [
      { sintoma: 'Ventas dice que no ve cupos del grupo nuevo.', causa: 'La clase de prueba se creó sin "Grupo que se va a aperturar".', arreglo: 'Edita la clase y elige el grupo. Los cupos viajan solos al CRM.' },
    ],
  },
  {
    id: 'inscribir',
    orden: 5,
    titulo: 'Inscribir al niño',
    duracionMin: 4,
    intro: {
      texto: 'Inscribir es el tercer movimiento. Vas a ver la ficha campo por campo: cuál te deja al niño fuera del conteo si lo dejas vacío, y cuál te dice de dónde vino. No vamos a guardar nada.',
      voz: 'Inscribir es el TERCER movimiento. <break time="0.4s"/> Vas a ver la ficha campo por campo: <break time="0.3s"/> cuál te deja al niño fuera del conteo si lo dejas vacío, <break time="0.2s"/> y cuál te dice de dónde vino. <break time="0.5s"/> No vamos a guardar nada.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'in-1', tipo: 'hazlo', target: 'grupos.inscribir', titulo: 'Abre la ficha', texto: 'Haz clic en Inscribir niño. Vamos a ver la ficha sin guardar.' },
      { id: 'in-2', tipo: 'mostrar', target: 'inscribir.grupo', titulo: 'El grupo', texto: 'Si lo dejas en "Sin grupo", el niño cae en la bolsa de niños sin grupo y NO cuenta como activo hasta que lo asignes. Úsalo solo si de verdad no sabes en cuál va.' },
      { id: 'in-3', tipo: 'mostrar', target: 'inscribir.origen', titulo: 'Origen', texto: 'Clase de prueba o inscripción directa. De aquí sale tu tasa de conversión.' },
      { id: 'in-4', tipo: 'mostrar', target: 'inscribir.origen-comercial', titulo: 'Origen comercial', texto: 'Obligatorio: de dónde vino el cliente. Sin esto no sabes qué canal te trae niños ni en cuál invertir.' },
      { id: 'in-5', tipo: 'mostrar', target: 'inscribir.fecha', titulo: 'Fecha de inscripción', texto: 'Es el día que pagó, no el día que empieza clases. El inicio lo da el grupo.' },
      { id: 'in-6', tipo: 'mostrar', target: 'inscribir.cierre-override', titulo: 'Cierre de nivel (override)', texto: 'Déjalo vacío. El cierre sale solo del plan del grupo; solo se llena si ese niño va a otro ritmo.' },
      { id: 'in-7', tipo: 'hazlo', target: 'inscribir.cancelar', titulo: 'Cierra sin guardar', texto: 'Haz clic en Cancelar. Recuerda: primero el grupo, después el niño.' },
      { id: 'in-8', tipo: 'mostrar', target: 'grupos.inscribir', titulo: 'Listo', texto: 'Eso es inscribir. Si ya sabes el grupo, nunca inscribas "para asignar luego": el niño no cuenta hasta que tenga grupo.' },
    ],
    quiz: [
      { pregunta: 'Inscribes un niño con Grupo = "Sin grupo". ¿Qué pasa?', opciones: ['Cuenta como activo igual', 'Se asigna solo al grupo más vacío', 'Queda en niños sin grupo y no cuenta como activo hasta asignarlo', 'Se borra a los 7 días'], explicacion: 'Sin grupo no hay fecha de inicio, y sin fecha de inicio no hay niño activo.' },
      { pregunta: '¿Qué fecha va en "Fecha de inscripción"?', opciones: ['La del inicio de clases', 'La de la clase de prueba', 'La del cierre de nivel', 'La del pago o inscripción'], explicacion: 'El inicio de clases lo da el grupo; la inscripción es cuando el representante pagó.' },
      { pregunta: '"Cierre de nivel (override)": ¿cuándo se llena?', opciones: ['Siempre', 'Solo si ese niño lleva un ritmo distinto al del grupo', 'Nunca', 'Solo para Kinder'], explicacion: 'Por defecto el cierre se deriva del plan del grupo. El override es la excepción.' },
    ],
    errores: [
      { sintoma: 'Tengo niños inscritos que no aparecen como activos.', causa: 'Están en "Sin grupo".', arreglo: 'Asígnales el grupo en su ficha; se vuelven activos en la fecha de inicio del grupo.' },
      { sintoma: 'No sé qué canal me trae niños.', causa: 'Se dejó vacío o genérico el origen comercial.', arreglo: 'Es obligatorio: llénalo en cada inscripción.' },
    ],
  },
  {
    id: 'llenado',
    orden: 6,
    titulo: 'El llenado que se controla solo',
    duracionMin: 5,
    intro: {
      texto: 'El manual dice que un grupo solo recibe niños nuevos en las primeras semanas del nivel: TINY hasta la semana 4 del libro, KIDS hasta la 2. Después, un niño nuevo va perdido. El sistema aplica esa regla solo, leyendo el itinerario. Tú no llevas la cuenta. Vamos a ver cómo se ve.',
      voz: 'El manual dice que un grupo solo recibe niños nuevos en las PRIMERAS semanas del nivel: <break time="0.3s"/> TINY hasta la semana cuatro del libro, <break time="0.2s"/> KIDS hasta la dos. <break time="0.4s"/> Después, un niño nuevo va perdido. <break time="0.5s"/> El sistema aplica esa regla SOLO, leyendo el itinerario. <break time="0.3s"/> Tú no llevas la cuenta. <break time="0.4s"/> Vamos a ver cómo se ve.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'll-1', tipo: 'hazlo', target: 'grupos.tarjeta', titulo: 'Abre un grupo', texto: 'Haz clic en el primer grupo de la lista para abrir su panel.' },
      { id: 'll-2', tipo: 'mostrar', target: 'grupo.llenado', titulo: 'El bloque LLENADO', texto: 'Cuántos niños contra la meta y hasta qué fecha acepta nuevos. TINY hasta la semana 4 del libro, KIDS hasta la 2. El sistema lo calcula solo con el itinerario.' },
      { id: 'll-3', tipo: 'mostrar', target: 'grupo.inscribir-aqui', titulo: 'Cuando el botón está gris', texto: 'Si este botón está gris, la ventana venció. No es un error: es el manual protegiendo al niño de entrar a un grupo que ya va por la semana 8.' },
      { id: 'll-4', tipo: 'mostrar', target: 'grupo.extender-ventana', titulo: 'La salida legítima', texto: 'Si de verdad el niño puede alcanzar al grupo, Extender ventana: queda el rastro de que fue decisión tuya y vence sola. Si no, apunta la venta al próximo grupo que abra.' },
      { id: 'll-5', tipo: 'mostrar', target: 'grupo.cerrar-inscripciones', titulo: 'La palanca manual', texto: 'Cerrar inscripciones bloquea a TODOS: nuevos, traslados y reincorporaciones. Úsala solo cuando el grupo está completo de verdad.' },
      { id: 'll-6', tipo: 'mostrar', target: 'grupos.lista', titulo: 'Léelo en la lista', texto: '"En llenado" es donde empujas ventas. "Sin fecha límite (exento)" en un grupo que no es Kinder significa que le falta la planificación: el sistema no puede protegerlo.' },
    ],
    quiz: [
      { pregunta: 'El botón "Inscribir niño aquí" está gris. ¿Qué pasó?', opciones: ['Venció la ventana de niños nuevos del manual', 'Un error del sistema', 'El grupo no tiene coach', 'El mes está cerrado'], explicacion: 'TINY hasta la semana 4, KIDS hasta la 2. El botón gris es el manual aplicado.' },
      { pregunta: 'Vendiste un niño y el grupo está cerrado a nuevos. ¿Qué haces?', opciones: ['Le pides al sistema que lo meta igual', 'Le borras la fecha de inicio al grupo', 'Extender ventana si el niño alcanza al grupo, o apuntarlo al próximo grupo', 'Le cambias el itinerario al grupo'], explicacion: 'Son las dos salidas legítimas. Forzarlo condena al niño a ir perdido.' },
      { pregunta: '¿Qué hace la palanca "Cerrar inscripciones"?', opciones: ['Solo bloquea niños nuevos', 'Cierra el mes', 'Borra el grupo', 'Bloquea a TODOS: nuevos, traslados y reincorporaciones'], explicacion: 'Es la palanca manual fuerte. La ventana automática solo frena a los nuevos.' },
    ],
    errores: [
      { sintoma: 'Le pedí a alguien que "abriera" el grupo para meter un niño en la semana 8.', causa: 'Se forzó la ventana del manual.', arreglo: 'Extiende solo si el niño alcanza al grupo; si no, próximo grupo. El niño perdido es deserción segura.' },
      { sintoma: 'Cerré inscripciones "para que no molesten" y ahora no puedo fusionar.', causa: 'La palanca manual bloquea también traslados y fusiones.', arreglo: 'Ábrela; la ventana automática ya frena a los nuevos.' },
    ],
  },
  {
    id: 'itinerario',
    orden: 7,
    titulo: 'Itinerario y lista del coach',
    duracionMin: 4,
    intro: {
      texto: 'El itinerario es el plan de clases del nivel: qué toca cada semana, los repasos, el Mental Day, el examen y el cierre. De él salen tres cosas: la ventana de niños nuevos, la lista de asistencia del coach y la fecha de cierre. Un grupo sin itinerario es un grupo ciego.',
      voz: 'El itinerario es el PLAN de clases del nivel: <break time="0.3s"/> qué toca cada semana, los repasos, el Mental Day, el examen y el cierre. <break time="0.5s"/> De él salen TRES cosas: <break time="0.2s"/> la ventana de niños nuevos, <break time="0.2s"/> la lista de asistencia del coach <break time="0.2s"/> y la fecha de cierre. <break time="0.5s"/> Un grupo sin itinerario <break time="0.2s"/> es un grupo CIEGO.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'it-1', tipo: 'hazlo', target: 'grupos.tarjeta', titulo: 'Abre un grupo', texto: 'Haz clic en el primer grupo para abrir su panel.' },
      { id: 'it-2', tipo: 'hazlo', target: 'grupo.tab-itinerario', titulo: 'Pestaña Itinerario', texto: 'Ahora haz clic en la pestaña Itinerario.' },
      { id: 'it-3', tipo: 'mostrar', target: 'grupo.itinerario-linea', titulo: 'El plan del nivel', texto: 'Inducción, semanas del libro, repasos, Mental Day, examen y cierre. De aquí salen la ventana de niños nuevos, la lista del coach y la fecha de cierre.' },
      { id: 'it-4', tipo: 'mostrar', target: 'grupo.ajustar-itinerario', titulo: 'Ajustar, con cuidado', texto: 'Corrige nivel, fecha de inicio y clases suspendidas. Reconstruye el plan completo del grupo: úsalo solo con la planificación real en la mano.' },
      { id: 'it-5', tipo: 'mostrar', target: 'grupo.link-coach', titulo: 'El link del coach', texto: 'Genera el enlace privado de este grupo: la coach lo abre en su teléfono sin clave y marca asistencia. Compártelo solo con ella, nunca en grupos de WhatsApp.' },
      { id: 'it-6', tipo: 'mostrar', target: 'grupo.panel', titulo: 'Un grupo sin itinerario', texto: 'Es un grupo ciego: la coach no ve clases y el llenado no se controla solo. Si aquí no hay plan, pide la planificación al centro y cárgala.' },
    ],
    quiz: [
      { pregunta: 'Un grupo sin itinerario cargado…', opciones: ['Funciona igual', 'Se cierra solo', 'Es ciego: la coach no ve clases y el llenado no se controla solo', 'No puede tener coach'], explicacion: 'Del itinerario salen la lista del coach, la ventana de nuevos y el cierre. Sin él, no hay nada de eso.' },
      { pregunta: '¿Qué hace "Ajustar itinerario"?', opciones: ['Reconstruye el plan completo del grupo: nivel, inicio, clases suspendidas', 'Solo cambia el coach', 'Cambia el nombre del grupo', 'Cierra el nivel'], explicacion: 'Por eso se usa con cuidado y con la planificación real a la vista.' },
      { pregunta: '¿Con quién compartes el link del coach?', opciones: ['En el grupo de WhatsApp del centro', 'Con los representantes', 'Con la junta', 'Solo con la coach de ese grupo: da acceso sin clave'], explicacion: 'Es un enlace privado por grupo. Quien lo tenga puede marcar asistencia.' },
    ],
    errores: [
      { sintoma: 'La coach dice que no le aparecen clases en su lista.', causa: 'El grupo no tiene itinerario cargado.', arreglo: 'Carga la planificación del nivel en curso; la lista se arma sola.' },
      { sintoma: 'Ajusté el itinerario "para probar" y se me desarmó el plan.', causa: 'Ajustar reconstruye el plan completo.', arreglo: 'Vuelve a ajustar con la planificación real del cuaderno de la coach.' },
    ],
  },
  {
    id: 'fusiones',
    orden: 8,
    titulo: 'Fusiones',
    duracionMin: 4,
    intro: {
      texto: 'Un grupo con pocos niños no es rentable y desgasta a la coach. El manual permite unirlo con otro, pero no de cualquier forma. El sistema hace el análisis por ti: con cuál conviene y qué problema tendrías. La conversación con la coach y los representantes la haces tú.',
      voz: 'Un grupo con pocos niños no es rentable <break time="0.2s"/> y desgasta a la coach. <break time="0.4s"/> El manual permite unirlo con otro, <break time="0.2s"/> pero NO de cualquier forma. <break time="0.4s"/> El sistema hace el análisis por ti: <break time="0.2s"/> con cuál conviene <break time="0.2s"/> y qué problema tendrías. <break time="0.5s"/> La conversación con la coach y los representantes <break time="0.2s"/> la haces TÚ.',
    },
    inicio: { ruta: '/centro/{id}/grupos' },
    pasos: [
      { id: 'fu-1', tipo: 'hazlo', target: 'grupos.tab-fusiones', titulo: 'Pestaña Fusiones', texto: 'Haz clic en la pestaña Fusiones.' },
      { id: 'fu-2', tipo: 'mostrar', target: 'fusiones.reglas', titulo: 'Las reglas del manual', texto: 'Solo desde nivel 3. Kinder nunca. Online y base 1-2 exentos. Un niño TINY no entra a un grupo Kids; un KIDS de nivel 3 o más sí puede cruzar.' },
      { id: 'fu-3', tipo: 'mostrar', target: 'fusiones.bajo-meta', titulo: 'Grupos bajo meta', texto: 'Tienen menos niños que el mínimo del manual. "Ver destinos" te muestra con cuál conviene unirlos.' },
      { id: 'fu-4', tipo: 'mostrar', target: 'fusiones.sugeridas', titulo: 'El puntaje', texto: 'Mismo día y misma hora suma 50 porque el papá ni se entera. Días distintos suma cero: vas a perder niños. Las advertencias con triángulo no bloquean, te avisan.' },
      { id: 'fu-5', tipo: 'mostrar', target: 'fusiones.aplicar', titulo: 'Aplicar fusión', texto: 'Mueve a los niños. Habla con la coach y los representantes ANTES. Lo bloquean: destino base 1-2 recibiendo niveles 3 o más, cruces Tiny↔Kids prohibidos, coach sin certificación o pasarse del cupo.' },
    ],
    quiz: [
      { pregunta: '¿Qué niños NO se fusionan nunca?', opciones: ['Los de nivel 3 o más', 'Los Kinder y los de nivel 1-2', 'Los de grupos de sábado', 'Todos se fusionan'], explicacion: 'Nivel 1-2 está aprendiendo la base; Kinder queda fuera de toda fusión.' },
      { pregunta: 'Dos grupos, mismo día y misma hora. ¿Cuántos puntos suma el horario?', opciones: ['0', '28', '100', '50'], explicacion: 'Es la unión más natural: el representante no cambia nada. Días distintos suma 0.' },
      { pregunta: 'Antes de "Aplicar fusión" debes…', opciones: ['Cerrar el mes', 'Hablar con la coach y los representantes', 'Borrar el grupo de origen', 'Nada: el sistema hace todo'], explicacion: 'El sistema mueve niños; la conversación la haces tú, o se te caen en el camino.' },
    ],
    errores: [
      { sintoma: 'Apliqué la fusión y se me retiraron tres niños.', causa: 'No se habló con los representantes antes del cambio de horario.', arreglo: 'Primero la conversación, después el botón. Y mira el puntaje de horario: cero = días distintos.' },
    ],
  },
  {
    id: 'cierre',
    orden: 9,
    titulo: 'Cierre de mes',
    duracionMin: 5,
    intro: {
      texto: 'Cerrar el mes es tomarle una fotografía a tu centro. Esa foto queda como historial, alimenta el arranque del mes siguiente y la ve la junta. Por eso el mes cerrado no se edita, y por eso hay que revisar antes de cerrar.',
      voz: 'Cerrar el mes es tomarle una FOTOGRAFÍA a tu centro. <break time="0.4s"/> Esa foto queda como historial, <break time="0.2s"/> alimenta el arranque del mes siguiente <break time="0.2s"/> y la ve la junta. <break time="0.5s"/> Por eso el mes cerrado NO se edita, <break time="0.3s"/> y por eso hay que revisar ANTES de cerrar.',
    },
    inicio: { ruta: '/centro/{id}/cuadro' },
    pasos: [
      { id: 'ci-1', tipo: 'mostrar', target: 'cuadro.comparacion', titulo: 'Antes de cerrar, mira esto', texto: 'Cuadro contra KPI. Los tres números deben decir Coincide. Si hay descuadre, corrígelo ahora: después es más caro.' },
      { id: 'ci-2', tipo: 'mostrar', target: 'cuadro.royalties', titulo: 'Royalties', texto: 'Salen solos de los niños activos por nivel. No se digitan.' },
      { id: 'ci-3', tipo: 'hazlo', target: 'nav.kpi', titulo: 'Vamos al KPI', texto: 'Haz clic en KPI Semanal en el menú.', ruta: '/centro/{id}/kpi' },
      { id: 'ci-4', tipo: 'mostrar', target: 'kpi.config', titulo: 'Lo gris viene solo', texto: 'Niños de inicio arrastrados del cierre anterior, grupos activos, nuevos activos: vienen solos. Solo se digitan los campos blancos.' },
      { id: 'ci-5', tipo: 'mostrar', target: 'kpi.cerrar-mes', titulo: 'Cerrar mes', texto: 'Toma la fotografía. Antes: retiros cargados con su fecha real y fechas de inicio puestas. Al cerrar, el sistema ejecuta los retiros programados del mes y los cuenta en la deserción.' },
      { id: 'ci-6', tipo: 'mostrar', target: 'kpi.historial', titulo: 'Si te equivocaste', texto: 'Reabres, corriges y vuelves a cerrar. Ojo: si había meses cerrados después, hay que reabrirlos y cerrarlos en orden. Cada mes arranca con el cierre del anterior.' },
    ],
    quiz: [
      { pregunta: '¿Qué revisas antes de cerrar el mes?', opciones: ['Solo los royalties', 'La comparación Cuadro vs KPI (Coincide), retiros cargados y fechas de inicio', 'El FODA', 'Nada, el cierre lo revisa todo'], explicacion: 'El cierre congela lo que haya. Si hay descuadre, queda en el historial.' },
      { pregunta: 'Al cerrar, ¿qué hace el sistema con los retiros programados que vencían en el mes?', opciones: ['Los borra', 'Los pasa al mes siguiente', 'Los ejecuta y los cuenta en la deserción', 'No hace nada'], explicacion: 'El cierre no se traga la deserción: la aplica él mismo si el cron no lo hizo.' },
      { pregunta: 'Reabres junio para corregir y julio ya estaba cerrado. ¿Qué pasa con julio?', opciones: ['Se actualiza solo', 'Se borra', 'No pasa nada', 'Hay que reabrirlo y cerrarlo de nuevo, en orden'], explicacion: 'Cada mes arranca con el cierre del anterior; la cadena la rehaces tú.' },
    ],
    errores: [
      { sintoma: 'Cerré el mes y el KPI quedó distinto al Cuadro.', causa: 'No se verificó "Coincide" antes de cerrar.', arreglo: 'Reabre, corrige el hecho de origen, verifica Coincide y vuelve a cerrar.' },
      { sintoma: 'Reabrí un mes viejo y los siguientes quedaron raros.', causa: 'Los meses posteriores no se recalculan solos.', arreglo: 'Reábrelos y ciérralos otra vez en orden, del más antiguo al más reciente.' },
    ],
  },
]

export const ERRORES_GLOBALES = [
  { modulo: 'inscribir', sintoma: 'Inscribir "para asignar el grupo luego".', causa: 'El niño queda sin grupo y no cuenta como activo.', arreglo: 'Si ya sabes el grupo, ponlo al inscribir. Si no, asígnalo apenas lo sepas.' },
  { modulo: 'aperturar', sintoma: 'Grupo sin fecha de inicio de clases.', causa: 'Sus niños nunca se vuelven activos; la ruta de nivel no avanza.', arreglo: 'Editar grupo → fecha de inicio. Es el campo más importante de todos.' },
  { modulo: 'clase-prueba', sintoma: 'Clase de prueba sin grupo amarrado.', causa: 'Ventas no ve cupos y se pierde de qué clase vino cada niño.', arreglo: 'Al crearla, elige "Grupo que se va a aperturar". Si ya existe, edítala.' },
  { modulo: 'llenado', sintoma: 'Forzar un niño nuevo en un grupo cerrado a nuevos.', causa: 'Entra en la semana 8 y va perdido: deserción casi segura.', arreglo: 'Extender ventana solo si alcanza al grupo; si no, al próximo grupo que abra.' },
  { modulo: 'llenado', sintoma: 'Cerrar inscripciones "para que no molesten".', causa: 'Bloquea también traslados, reincorporaciones y fusiones.', arreglo: 'Úsala solo con el grupo completo. La ventana automática ya frena a los nuevos.' },
  { modulo: 'itinerario', sintoma: 'Grupo sin itinerario cargado.', causa: 'La coach no tiene lista y el llenado no se controla solo.', arreglo: 'Carga la planificación del nivel en curso.' },
  { modulo: 'itinerario', sintoma: 'Ajustar itinerario "para ver qué pasa".', causa: 'Reconstruye el plan completo del grupo.', arreglo: 'Solo con la planificación real del cuaderno de la coach a la vista.' },
  { modulo: 'cierre', sintoma: 'Borrar al niño que se retira.', causa: 'Desaparece de la deserción y descuadra el KPI del mes.', arreglo: 'Usa Retiro programado con la fecha real. La deserción es parte de tu KPI.' },
  { modulo: 'cierre', sintoma: 'Cerrar el mes con Cuadro ≠ KPI.', causa: 'El descuadre queda congelado en el historial y se arrastra.', arreglo: 'Verifica los tres "Coincide" antes de Cerrar mes.' },
  { modulo: 'cierre', sintoma: 'Reabrir un mes viejo y no volver a cerrar los posteriores.', causa: 'Cada mes arranca con el cierre del anterior; la cadena queda rota.', arreglo: 'Reabrir y cerrar en orden, del más antiguo al más reciente.' },
  { modulo: 'fusiones', sintoma: 'Aplicar fusión sin hablar con coach y representantes.', causa: 'Cambio de horario sin aviso = niños que se caen.', arreglo: 'Primero la conversación, después el botón.' },
  { modulo: 'modelo', sintoma: 'Corregir un número "a mano" en KPI o Cuadro.', causa: 'Vuelve a descuadrar al mes siguiente porque el hecho de origen sigue mal.', arreglo: 'Corrige el grupo, el niño o el retiro que lo produjo.' },
]

export const FAQ = [
  { modulo: 'llenado', pregunta: 'Vendí un niño y el grupo está cerrado a nuevos. ¿Qué hago?', respuesta: 'Extiende la ventana si el niño puede alcanzar al grupo (habla con la coach antes), o inscríbelo en el próximo grupo que abra. No lo fuerces: va a ir perdido.' },
  { modulo: 'fusiones', pregunta: 'Un grupo quedó con muy pocos niños.', respuesta: 'Pestaña Fusiones → Ver destinos. El sistema te propone con cuál unirlo y qué tan natural sería. Habla con la coach y los representantes antes de aplicar.' },
  { modulo: 'itinerario', pregunta: 'La coach dice que no le aparecen las clases.', respuesta: 'Al grupo le falta el itinerario. Pide la planificación del nivel en curso y cárgala; la lista se arma sola.' },
  { modulo: 'cierre', pregunta: 'El niño se retira. ¿Lo borro?', respuesta: 'No. Usa Retiro programado con la fecha real. La deserción es parte de tu KPI; borrarlo descuadra el mes.' },
  { modulo: 'cierre', pregunta: 'Me equivoqué en un mes que ya cerré.', respuesta: 'Reabre ese mes, corrige el hecho de origen y ciérralo de nuevo. Si había meses cerrados después, reábrelos y ciérralos en orden.' },
  { modulo: 'fusiones', pregunta: 'El sistema propone una fusión que no me convence.', respuesta: 'No estás obligada a aplicarla: el puntaje es una recomendación y tú conoces a los representantes. Pero mientras el grupo siga bajo meta, va a seguir apareciendo.' },
  { modulo: 'cierre', pregunta: 'Cerré el mes sin cargar un retiro.', respuesta: 'Reabre, carga el retiro con su fecha real y vuelve a cerrar. Ese niño estaba contando como activo en tu nivel.' },
  { modulo: 'cierre', pregunta: '¿Por qué el Cuadro y el KPI dicen números distintos?', respuesta: 'Algún hecho de origen está incompleto: un grupo sin fecha de inicio, un niño sin grupo, un retiro sin fecha. Corrígelo y la fila "Comparación con KPI" volverá a decir Coincide.' },
  { modulo: 'inscribir', pregunta: '¿Puedo inscribir antes de que el grupo tenga fecha de inicio?', respuesta: 'Sí, pero el niño no cuenta como activo hasta que el grupo tenga fecha y esa fecha llegue. Pon la fecha apenas la sepas.' },
  { modulo: 'meta', pregunta: '¿Qué es "Confianza baja" en la Ruta de Nivel?', respuesta: 'Faltan fechas de inicio en el pipeline y el sistema no puede proyectar con certeza. No significa que vayas mal: carga las fechas.' },
  { modulo: 'aperturar', pregunta: '¿Qué pasa si abro un grupo con menos del mínimo del manual?', respuesta: 'Abre igual, pero queda bajo responsabilidad del centro. Llénalo en su ventana de inducción o busca fusión.' },
  { modulo: 'itinerario', pregunta: '¿Cómo sé en qué semana va un grupo?', respuesta: 'En el panel del grupo, el bloque "Esta semana" lo dice. La pestaña Itinerario muestra el plan completo del nivel.' },
  { modulo: 'meta', pregunta: '¿Puedo repetir un recorrido del entrenamiento?', respuesta: 'Sí, las veces que quieras: Entrenamiento → el módulo → Repetir recorrido. El progreso no se pierde.' },
]
