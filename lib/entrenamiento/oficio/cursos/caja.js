// Dirección Operativa: asignación individual; los IDs conservan progreso y firmas.
export const CAJA_DIRECCION = [
  {
    "id": "of-caj-1",
    "curso": "caja",
    "orden": 110,
    "roles": [
      "coordinador"
    ],
    "asignacion": "direccion-caja",
    "requiere": [
      "of-met-3"
    ],
    "duracionMin": 20,
    "titulo": "Leer la caja y detectar semanas de riesgo",
    "fuente": [
      "caja-direccion-aloha.md"
    ],
    "palabras": [
      "saldo",
      "ingreso",
      "gasto",
      "conciliacion-bancaria",
      "condicion",
      "evidencia"
    ],
    "pfv": "Caja interpretada con fuentes, reservas y semanas de riesgo identificadas, sin confundir proyección con resultado.",
    "objetivo": "Caja interpretada con fuentes, reservas y semanas de riesgo identificadas, sin confundir proyección con resultado.",
    "masa": [
      "Caja abierta en KPI, en modo consulta, y una hoja para el caso ficticio.",
      "Un extracto bancario autorizado, con cuenta y fecha visibles; si falta, anota el bloqueo."
    ],
    "temario": [
      "Entrar a Caja y escoger empresa",
      "Saldo, reserva y disponible",
      "Semáforo, caída y calidad del dato"
    ],
    "laminas": [
      {
        "titulo": "Entrar a Caja y escoger empresa",
        "texto": "Entra en Panel general → Caja. Selecciona Altavia; después F&F. Usa Consolidado para comparar, no para editar."
      },
      {
        "titulo": "Saldo, reserva y disponible",
        "texto": "Comprueba los movimientos por clasificar y si el cobro está estimado desde Zoho. El aviso de calidad tiene prioridad sobre el verde."
      },
      {
        "titulo": "Semáforo, caída y calidad del dato",
        "texto": "Identifica primera semana roja, semanas ámbar, caídas y faltante para el piso. Revisa también ambas empresas por separado."
      }
    ],
    "voz": "Carmen, antes de autorizar un pago hay que saber cuánto dinero está realmente disponible. <break time=\"0.4s\"/> No basta mirar el saldo del banco. <break time=\"0.4s\"/> También hay reservas y pagos por venir. <break time=\"0.4s\"/> Vas a revisar cada empresa, reconocer datos pendientes y ubicar las semanas de riesgo. <break time=\"0.4s\"/> El color ayuda a decidir qué revisar; la decisión se sostiene con documentos y números.",
    "bloques": [
      {
        "t": "p",
        "texto": "Caja interpretada con fuentes, reservas y semanas de riesgo identificadas, sin confundir proyección con resultado. En esta unidad aprenderás el recorrido y lo comprobarás con un caso en una hoja antes de operar con datos reales."
      },
      {
        "t": "p",
        "texto": "Este entrenamiento está asignado a Carmen Peraza como directora operativa. Su producto es una caja conciliada y una planificación ejecutable, con riesgos atendidos antes de los vencimientos. Fernando revisa las excepciones y firma las maniobras. La herramienta se llama Curva de 13 semanas; las primeras tres sirven para concentrar la atención inmediata, pero se revisan las trece."
      },
      {
        "t": "p",
        "texto": "KPI parte del saldo bancario conocido y de los movimientos posteriores. Proyecta ingresos con el perfil histórico disponible y descuenta pagos programados, separación del dueño y reservas. Si no hay historia suficiente puede usar una referencia de Zoho, marcada estimada. Un préstamo, traspaso propio o intercompañía no demuestra una mejora de ventas."
      },
      {
        "t": "p",
        "texto": "La primera semana incluye solo de mañana al domingo: lo ocurrido hoy ya está en el saldo. Las siguientes semanas son completas, de lunes a domingo. El consolidado no transfiere dinero entre sociedades: un sobrante en Altavia no paga automáticamente una obligación de F&F."
      },
      {
        "t": "p",
        "texto": "Rojo significa disponible menor que cero; ámbar significa positivo pero debajo del piso; verde significa que alcanza el piso. El piso es dos veces el gasto semanal medio proyectado, una regla operativa de esta herramienta. Caída significa que el disponible proyectado baja frente a la semana anterior. Ninguno de estos colores asigna por sí solo una condición ni garantiza que no haya un faltante dentro de la semana."
      },
      {
        "t": "sub",
        "texto": "Ejercicio en una hoja · Empresa Escuela ficticia"
      },
      {
        "t": "p",
        "texto": "Saldo inicial 10.000; cobro esperado 4.000; pagos 9.000; dueño 400; reserva de impuesto al cierre 600. Saldo final = 4.600 y disponible = 4.000. Con piso 5.000 está ámbar y faltan 1.000 para el piso. En la semana siguiente el disponible es −800: rojo, faltan 800 para cero y 5.800 para el mismo piso. Una línea disponible de 2.000 podría cubrir el faltante, pero usarla requiere aprobación; no convierte el resultado operativo en positivo."
      },
      {
        "t": "p",
        "texto": "Resuelve: si el banco lleva veinte días sin actualizarse, ¿puedes afirmar que esta previsión describe la caja actual? No. Anota el dato pendiente, su responsable y fecha. Si una semana termina positiva, comprueba además el calendario de pagos: podría faltar dinero el martes y entrar el cobro el viernes. No cargues estos datos ficticios en producción."
      },
      {
        "t": "sub",
        "texto": "Recorrido en la plataforma"
      },
      {
        "t": "pasos",
        "items": [
          "Entra en Panel general → Caja. Selecciona Altavia; después F&F. Usa Consolidado para comparar, no para editar.",
          "Mira Saldo por cuenta: fecha del banco, saldo y último movimiento. Anota saldos faltantes o de más de siete días.",
          "Comprueba los movimientos por clasificar y si el cobro está estimado desde Zoho. El aviso de calidad tiene prioridad sobre el verde.",
          "Lee cada semana: saldo inicial + ingresos − egresos − dueño = saldo final; saldo final − reserva de impuesto = disponible.",
          "Identifica primera semana roja, semanas ámbar, caídas y faltante para el piso. Revisa también ambas empresas por separado.",
          "Registra qué debes comprobar y quién lo hará. No ajustes el cobro solo para pintar verde la curva."
        ]
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Comprueba antes de avanzar",
        "texto": "Practica primero con una hoja. En producción opera únicamente datos y decisiones autorizados. Estudio aprobado y maniobra firmada son cosas distintas."
      }
    ],
    "quiz": [
      {
        "pregunta": "El disponible está verde, pero el último saldo tiene veinte días. ¿Qué haces?",
        "opciones": [
          "Autorizo cualquier pago",
          "Actualizo y concilio antes de confiar en la previsión",
          "Declaro Afluencia"
        ],
        "explicacion": "La calidad del dato se verifica antes de decidir.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿Cuánto queda disponible en el caso 10.000 + 4.000 − 9.000 − 400 − 600?",
        "opciones": [
          "4.000",
          "4.600",
          "5.000"
        ],
        "explicacion": "El saldo final es 4.600, pero 600 están reservados.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿Qué incluye el ingreso de la primera semana?",
        "opciones": [
          "Toda la semana ya cobrada",
          "El mes completo",
          "De mañana al domingo"
        ],
        "explicacion": "Lo ocurrido hoy ya está en el saldo.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿Un consolidado positivo elimina un rojo de F&F?",
        "opciones": [
          "Sí, el dinero se mueve solo",
          "No; cada sociedad debe tener fondos disponibles para sus pagos",
          "Sí, si Altavia está verde"
        ],
        "explicacion": "El consolidado no ejecuta transferencias ni autorizaciones.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿Qué prueba una semana verde?",
        "opciones": [
          "Una proyección por encima del piso con los datos cargados",
          "Que la condición es Normal",
          "Que nunca faltará dinero durante la semana"
        ],
        "explicacion": "La condición requiere estadísticas reales; los vencimientos diarios también importan.",
        "repasa": [
          "evidencia"
        ]
      }
    ],
    "drills": [
      {
        "titulo": "Maniobra 1: leer la caja y detectar semanas de riesgo",
        "fuente": "caja-direccion-aloha.md",
        "proposito": "Caja interpretada con fuentes, reservas y semanas de riesgo identificadas, sin confundir proyección con resultado.",
        "gradiente": "Resuelve primero el caso ficticio en una hoja. Después demuestra el recorrido con una operación real autorizada, bajo observación de Fernando como jefe entrenador. Si faltan documentos o no ha llegado el ritual, conserva la firma pendiente.",
        "masa": [
          "Caja abierta en KPI, en modo consulta, y una hoja para el caso ficticio.",
          "Un extracto bancario autorizado, con cuenta y fecha visibles; si falta, anota el bloqueo."
        ],
        "pasos": [
          "Entra en Panel general → Caja. Selecciona Altavia; después F&F. Usa Consolidado para comparar, no para editar.",
          "Mira Saldo por cuenta: fecha del banco, saldo y último movimiento. Anota saldos faltantes o de más de siete días.",
          "Comprueba los movimientos por clasificar y si el cobro está estimado desde Zoho. El aviso de calidad tiene prioridad sobre el verde.",
          "Lee cada semana: saldo inicial + ingresos − egresos − dueño = saldo final; saldo final − reserva de impuesto = disponible.",
          "Identifica primera semana roja, semanas ámbar, caídas y faltante para el piso. Revisa también ambas empresas por separado.",
          "Registra qué debes comprobar y quién lo hará. No ajustes el cobro solo para pintar verde la curva.",
          "Muestra el resultado y su evidencia al jefe entrenador. Corrige las omisiones antes de pedir la firma."
        ],
        "criterios": [
          "Distingue datos reales, estimaciones y datos faltantes sin inventarlos.",
          "Completa el recorrido real autorizado y demuestra el resultado; cuando guarda, recarga y comprueba persistencia.",
          "Explica el riesgo o decisión, conserva soportes y respeta las facultades y aprobaciones."
        ],
        "errorTipico": "Dar por terminada una operación o una autorización sin evidencia."
      }
    ],
    "sop": {
      "proceso": "Leer la caja y detectar semanas de riesgo",
      "cuando": "Antes de tomar decisiones de caja.",
      "producto": "Caja interpretada con fuentes, reservas y semanas de riesgo identificadas, sin confundir proyección con resultado.",
      "pasos": [
        "Entra en Panel general → Caja. Selecciona Altavia; después F&F. Usa Consolidado para comparar, no para editar.",
        "Mira Saldo por cuenta: fecha del banco, saldo y último movimiento. Anota saldos faltantes o de más de siete días.",
        "Comprueba los movimientos por clasificar y si el cobro está estimado desde Zoho. El aviso de calidad tiene prioridad sobre el verde.",
        "Lee cada semana: saldo inicial + ingresos − egresos − dueño = saldo final; saldo final − reserva de impuesto = disponible.",
        "Identifica primera semana roja, semanas ámbar, caídas y faltante para el piso. Revisa también ambas empresas por separado.",
        "Registra qué debes comprobar y quién lo hará. No ajustes el cobro solo para pintar verde la curva."
      ],
      "decide": [
        {
          "situacion": "Dato, soporte o aprobación pendiente",
          "regla": "Registra responsable y fecha; conserva la decisión pendiente."
        },
        {
          "situacion": "Práctica ficticia",
          "regla": "Resuélvela en una hoja; no crea pagos ni firmas reales."
        }
      ],
      "errores": [
        "Confundir verde proyectado con condición.",
        "Registrar ejecución o aprobación sin evidencia."
      ]
    }
  },
  {
    "id": "of-caj-2",
    "curso": "caja",
    "orden": 111,
    "roles": [
      "coordinador"
    ],
    "asignacion": "direccion-caja",
    "requiere": [
      "of-caj-1"
    ],
    "duracionMin": 25,
    "titulo": "Cerrar el viernes con extractos y pagos completos",
    "fuente": [
      "caja-direccion-aloha.md"
    ],
    "palabras": [
      "conciliar",
      "conciliacion-bancaria",
      "saldo",
      "gasto",
      "evidencia",
      "bitacora"
    ],
    "pfv": "Cierre del viernes registrado con saldos contrastados, pagos completos, soportes y foto de la curva.",
    "objetivo": "Cierre del viernes registrado con saldos contrastados, pagos completos, soportes y foto de la curva.",
    "masa": [
      "Caja abierta y extractos autorizados de todas las cuentas involucradas.",
      "Listado de pagos realizados, vencimientos, cobros previstos y comprobantes."
    ],
    "temario": [
      "Importar y clasificar sin duplicados",
      "Conciliar pagos y saldos",
      "Registrar cierre con soportes y plan"
    ],
    "laminas": [
      {
        "titulo": "Importar y clasificar sin duplicados",
        "texto": "Escoge la empresa y el viernes de referencia. Solicita los extractos actuales de todas sus cuentas operativas."
      },
      {
        "titulo": "Conciliar pagos y saldos",
        "texto": "Importa una sola vez; si repites, comprueba los duplicados. Clasifica pendientes y revisa signos, traspasos, impuestos, dueño y línea."
      },
      {
        "titulo": "Registrar cierre con soportes y plan",
        "texto": "Revisa cobros, reservas y las trece semanas; completa el plan de batalla con acciones para los puntos fuera."
      }
    ],
    "voz": "El viernes tienes que dejar una caja que se pueda revisar. <break time=\"0.4s\"/> Eso empieza con los extractos y termina con saldos contrastados, pagos completos y un plan de batalla. <break time=\"0.4s\"/> Cargar un archivo no significa que todas las facturas estén pagadas. <break time=\"0.4s\"/> Comprueba los soportes, registra los pendientes y cierra solamente cuando puedas mostrar la evidencia.",
    "bloques": [
      {
        "t": "p",
        "texto": "Cierre del viernes registrado con saldos contrastados, pagos completos, soportes y foto de la curva. En esta unidad aprenderás el recorrido y lo comprobarás con un caso en una hoja antes de operar con datos reales."
      },
      {
        "t": "p",
        "texto": "El viernes se cierra el paquete de información financiera y se prepara el plan. Es un ritual de Dirección Operativa: no reemplaza el cierre estadístico del jueves de los centros ni cambia las semanas de lunes a domingo de la curva. El primer viernes de preparación acordado es el 23 de octubre de 2026. Si falta información, guarda el plan con el bloqueo; no declares completo el cierre."
      },
      {
        "t": "p",
        "texto": "El archivo se carga desde Subir extracto. Usa los formatos que indica ese selector: OFX y los extractos St. Georges admitidos. La vista previa identifica la cuenta y distingue movimientos nuevos y duplicados. No conviertas manualmente importes ni cambies signos para forzar una importación. Una cuenta no reconocida se escala para su revisión."
      },
      {
        "t": "p",
        "texto": "La importación registra movimientos bancarios y metadatos. No constituye por sí sola una orden de pago ni marca automáticamente como pagadas todas las facturas en Zoho. Verifica el comprobante y el registro del pago en el sistema correspondiente. En Soportes y conciliación escribe nombre del archivo, cuenta, fecha de corte, saldo y referencia del comprobante; conserva el original en el archivo autorizado de la empresa."
      },
      {
        "t": "p",
        "texto": "La bandeja permite clasificar y crear reglas. Comprueba el patrón antes de aplicarlo a otros movimientos. Traspasos propios e intercompañía no son ventas. Una línea de crédito es deuda. Los pagos programados representan obligaciones futuras: revisa fecha, importe y frecuencia. Quincenal significa el importe en cada quincena. La separación del dueño ya es automática y no debe duplicarse como compromiso."
      },
      {
        "t": "p",
        "texto": "Para registrar el cierre, el sistema exige cuentas con saldo al menos al viernes de referencia, sin saldo de más de siete días, cero pendientes de clasificación, lista completa, soportes y acciones. Si una fórmula está asignada, debe tener objetivos para todos sus pasos. El control depende también de tu contraste con documentos: no detecta una factura que nunca registraron."
      },
      {
        "t": "sub",
        "texto": "Ejercicio · detectar un cierre incompleto"
      },
      {
        "t": "p",
        "texto": "Caso ficticio: el archivo muestra 25 movimientos, 3 duplicados y 22 nuevos; queda un débito de 300 sin clasificar. El saldo de otra cuenta es del jueves anterior. Explica por qué no puedes cerrar, quién entrega cada soporte y cómo comprobarás los dos pendientes. Después resuelve la diferencia de 150 entre banco y registro: busca movimiento faltante, duplicado o fecha distinta; no ajustes a ciegas."
      },
      {
        "t": "sub",
        "texto": "Recorrido en la plataforma"
      },
      {
        "t": "pasos",
        "items": [
          "Escoge la empresa y el viernes de referencia. Solicita los extractos actuales de todas sus cuentas operativas.",
          "En Subir extracto, selecciona el archivo admitido, revisa la vista previa y confirma cuenta, fechas, saldo y movimientos nuevos.",
          "Importa una sola vez; si repites, comprueba los duplicados. Clasifica pendientes y revisa signos, traspasos, impuestos, dueño y línea.",
          "Contrasta saldo por cuenta con el banco y pagos efectuados con sus comprobantes. Revisa vencimientos futuros y compromisos recurrentes; no programes dos veces un pago.",
          "Revisa cobros, reservas y las trece semanas; completa el plan de batalla con acciones para los puntos fuera.",
          "Completa la lista del viernes, referencias de soportes y bitácora. Guarda, registra el cierre y recarga para comprobar fecha, autor y foto."
        ]
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Comprueba antes de avanzar",
        "texto": "Practica primero con una hoja. En producción opera únicamente datos y decisiones autorizados. Estudio aprobado y maniobra firmada son cosas distintas."
      }
    ],
    "quiz": [
      {
        "pregunta": "¿Importar el extracto completa todos los pagos de facturas?",
        "opciones": [
          "Sí",
          "No: hay que verificar comprobantes y registros del pago",
          "Solo si el saldo está verde"
        ],
        "explicacion": "La importación bancaria no sustituye la conciliación de cada pago.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "Hay 3 duplicados y 22 nuevos. ¿Qué debe entrar?",
        "opciones": [
          "Los 25 de nuevo",
          "Solo los duplicados",
          "Los 22 nuevos tras verificar la vista previa"
        ],
        "explicacion": "La importación evita duplicados identificados; se comprueba el resultado.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿Qué significa monto 500 quincenal?",
        "opciones": [
          "500 en cada quincena",
          "500 dividido entre dos",
          "500 al año"
        ],
        "explicacion": "La frecuencia genera un pago por cada quincena.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "Queda un movimiento sin clasificar. ¿Qué haces?",
        "opciones": [
          "Lo oculto",
          "Lo clasifico con soporte o registro el bloqueo sin cerrar",
          "Lo convierto en ingreso"
        ],
        "explicacion": "Sin clasificación no se completa el cierre.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿Dónde queda la evidencia del cierre?",
        "opciones": [
          "Solo en memoria de Carmen",
          "En una captura sin fecha",
          "En soportes, bitácora e historial con foto y autor"
        ],
        "explicacion": "La evidencia permite revisar qué se conocía al tomar la decisión.",
        "repasa": [
          "evidencia"
        ]
      }
    ],
    "drills": [
      {
        "titulo": "Maniobra 1: cerrar el viernes con extractos y pagos completos",
        "fuente": "caja-direccion-aloha.md",
        "proposito": "Cierre del viernes registrado con saldos contrastados, pagos completos, soportes y foto de la curva.",
        "gradiente": "Resuelve primero el caso ficticio en una hoja. Después demuestra el recorrido con una operación real autorizada, bajo observación de Fernando como jefe entrenador. Si faltan documentos o no ha llegado el ritual, conserva la firma pendiente.",
        "masa": [
          "Caja abierta y extractos autorizados de todas las cuentas involucradas.",
          "Listado de pagos realizados, vencimientos, cobros previstos y comprobantes."
        ],
        "pasos": [
          "Escoge la empresa y el viernes de referencia. Solicita los extractos actuales de todas sus cuentas operativas.",
          "En Subir extracto, selecciona el archivo admitido, revisa la vista previa y confirma cuenta, fechas, saldo y movimientos nuevos.",
          "Importa una sola vez; si repites, comprueba los duplicados. Clasifica pendientes y revisa signos, traspasos, impuestos, dueño y línea.",
          "Contrasta saldo por cuenta con el banco y pagos efectuados con sus comprobantes. Revisa vencimientos futuros y compromisos recurrentes; no programes dos veces un pago.",
          "Revisa cobros, reservas y las trece semanas; completa el plan de batalla con acciones para los puntos fuera.",
          "Completa la lista del viernes, referencias de soportes y bitácora. Guarda, registra el cierre y recarga para comprobar fecha, autor y foto.",
          "Muestra el resultado y su evidencia al jefe entrenador. Corrige las omisiones antes de pedir la firma."
        ],
        "criterios": [
          "Distingue datos reales, estimaciones y datos faltantes sin inventarlos.",
          "Completa el recorrido real autorizado y demuestra el resultado; cuando guarda, recarga y comprueba persistencia.",
          "Explica el riesgo o decisión, conserva soportes y respeta las facultades y aprobaciones."
        ],
        "errorTipico": "Dar por terminada una operación o una autorización sin evidencia."
      }
    ],
    "sop": {
      "proceso": "Cerrar el viernes con extractos y pagos completos",
      "cuando": "Cada viernes, antes de declarar el cierre completo.",
      "producto": "Cierre del viernes registrado con saldos contrastados, pagos completos, soportes y foto de la curva.",
      "pasos": [
        "Escoge la empresa y el viernes de referencia. Solicita los extractos actuales de todas sus cuentas operativas.",
        "En Subir extracto, selecciona el archivo admitido, revisa la vista previa y confirma cuenta, fechas, saldo y movimientos nuevos.",
        "Importa una sola vez; si repites, comprueba los duplicados. Clasifica pendientes y revisa signos, traspasos, impuestos, dueño y línea.",
        "Contrasta saldo por cuenta con el banco y pagos efectuados con sus comprobantes. Revisa vencimientos futuros y compromisos recurrentes; no programes dos veces un pago.",
        "Revisa cobros, reservas y las trece semanas; completa el plan de batalla con acciones para los puntos fuera.",
        "Completa la lista del viernes, referencias de soportes y bitácora. Guarda, registra el cierre y recarga para comprobar fecha, autor y foto."
      ],
      "decide": [
        {
          "situacion": "Dato, soporte o aprobación pendiente",
          "regla": "Registra responsable y fecha; conserva la decisión pendiente."
        },
        {
          "situacion": "Práctica ficticia",
          "regla": "Resuélvela en una hoja; no crea pagos ni firmas reales."
        }
      ],
      "errores": [
        "Confundir verde proyectado con condición.",
        "Registrar ejecución o aprobación sin evidencia."
      ]
    }
  },
  {
    "id": "of-caj-3",
    "curso": "caja",
    "orden": 112,
    "roles": [
      "coordinador"
    ],
    "asignacion": "direccion-caja",
    "requiere": [
      "of-caj-2"
    ],
    "duracionMin": 30,
    "titulo": "Plan de batalla de caja y autorizaciones",
    "fuente": [
      "caja-direccion-aloha.md"
    ],
    "palabras": [
      "plan-de-batalla",
      "formula-de-la-condicion",
      "condicion",
      "cuota-semanal",
      "evidencia",
      "gasto"
    ],
    "pfv": "Plan de batalla financiero con objetivos, responsables, fechas, impacto esperado y excepciones elevadas a Master.",
    "objetivo": "Plan de batalla financiero con objetivos, responsables, fechas, impacto esperado y excepciones elevadas a Master.",
    "masa": [
      "La curva y los puntos fuera detectados en el cierre.",
      "Fuentes de estadísticas reales, obligaciones y política de facultades vigente."
    ],
    "temario": [
      "Fundamentar condición con resultados",
      "Planificar cobros y reducción de costos",
      "Escalar excepciones y comprobar decisiones"
    ],
    "laminas": [
      {
        "titulo": "Fundamentar condición con resultados",
        "texto": "Identifica semana afectada, disponible, faltante para cero y para el piso; verifica primero que los datos estén completos."
      },
      {
        "titulo": "Planificar cobros y reducción de costos",
        "texto": "Conserva toda la fórmula en su orden. Escribe objetivos propios debajo de cada paso."
      },
      {
        "titulo": "Escalar excepciones y comprobar decisiones",
        "texto": "Distingue operación presupuestada de pago fuera de presupuesto, nuevo compromiso y crédito. Las excepciones quedan pendientes de Master."
      }
    ],
    "voz": "Detectar un rojo es el comienzo. <break time=\"0.4s\"/> Ahora hay que decidir cómo recuperar cobros y qué costos podemos reducir sin perjudicar la entrega. <break time=\"0.4s\"/> Cada acción necesita responsable, fecha e impacto esperado. <break time=\"0.4s\"/> Carmen mantiene sus facultades actuales. <break time=\"0.4s\"/> Los pagos fuera de presupuesto, nuevos compromisos y crédito se presentan a Fernando para su aprobación.",
    "bloques": [
      {
        "t": "p",
        "texto": "Plan de batalla financiero con objetivos, responsables, fechas, impacto esperado y excepciones elevadas a Master. En esta unidad aprenderás el recorrido y lo comprobarás con un caso en una hoja antes de operar con datos reales."
      },
      {
        "t": "p",
        "texto": "Tu meta es proteger el disponible, recuperar cobros y eliminar costos que no aportan, manteniendo la entrega. No existe una garantía de caja positiva por usar una herramienta: se necesita información completa, decisiones oportunas y ejecución. Una venta todavía no cobrada, un ahorro propuesto y un préstamo no deben presentarse como el mismo resultado."
      },
      {
        "t": "p",
        "texto": "En Dirección Operativa → Plan de batalla, elige la condición y escribe su fundamento: nombre de la estadística, valores de varias semanas comparables, fechas, sentido y fuente. No asignes Normal o Afluencia porque lo desees ni porque subió una proyección. Si no hay datos suficientes, selecciona Pendiente de datos reales. La plataforma muestra la fórmula canónica de la condición elegida; sus pasos son guías y cada uno necesita objetivos concretos."
      },
      {
        "t": "p",
        "texto": "Según el material de las condiciones de la empresa, en Emergencia se promociona/produce, se cambia la forma de actuar, se economiza, se prepara la entrega y se refuerza la disciplina, en ese orden. Evita recortar de entrada la actividad que produce cobros comprobados. En Normal se preserva lo que funciona y se corrigen pronto las caídas. En Afluencia financiera se economiza, se pagan deudas, se mejora la capacidad de entrega y se refuerza la causa. El caso y la fórmula completa deben revisarse, no reducirse a un color."
      },
      {
        "t": "p",
        "texto": "Carmen mantiene sus facultades actuales. No se introduce un monto de autorización nuevo. En el plan, las categorías Fuera de presupuesto, Nuevo compromiso y Uso de crédito requieren decisión de Master. La propuesta conserva estado pendiente hasta aprobación; modificar monto, propósito, responsable, semana o fecha invalida la aprobación anterior. La autorización queda con autor y fecha; no equivale a ejecutar una transferencia ni sustituye el procedimiento bancario."
      },
      {
        "t": "p",
        "texto": "Reducir costos significa eliminar una salida o bajar su importe de forma sustentada. Reprogramar exige acuerdo con el proveedor y mueve la salida a otra fecha: no es ahorro. Antes de recortar, revisa impacto en servicio, cobros, capacidad y obligaciones. Evita sumar dos veces el mismo efecto. El plan muestra impactos esperados por acción; no los agrega automáticamente al disponible. Solo actualiza compromisos o cobros esperados cuando tengas sustento y aprobación aplicable."
      },
      {
        "t": "sub",
        "texto": "Ejercicio resuelto · corregir una semana roja"
      },
      {
        "t": "p",
        "texto": "Caso ficticio: disponible −1.200 y piso 2.000. Carmen identifica cobros adicionales verificables por 1.000, ahorro aprobado de 300 y reprogramación acordada de 400 a otra semana. Sin otros cambios, el disponible de esa semana sería 500: dejó el rojo, pero sigue ámbar y faltan 1.500 para el piso. La salida de 400 debe aparecer en la semana de destino. Si los cobros no llegan, el escenario falla; nombra responsable y fecha de verificación."
      },
      {
        "t": "p",
        "texto": "Completa tres acciones en una hoja: cobrar 1.000 con lista y fechas; eliminar 300 con soporte de cancelación/reducción; acordar 400 con proveedor y nuevo vencimiento. Señala cuál requiere escalar según la facultad vigente. Para la condición seleccionada añade objetivos en cada paso de su fórmula. Marca los datos como ficticios y no crees pagos reales para practicar."
      },
      {
        "t": "sub",
        "texto": "Recorrido en la plataforma"
      },
      {
        "t": "pasos",
        "items": [
          "Identifica semana afectada, disponible, faltante para cero y para el piso; verifica primero que los datos estén completos.",
          "Fundamenta la condición con valores reales, fechas y fuente. Si faltan, déjala pendiente y crea una acción para obtenerlos.",
          "Conserva toda la fórmula en su orden. Escribe objetivos propios debajo de cada paso.",
          "Agrega acciones de cobro, ahorro o reprogramación con resultado, responsable, fecha, semana e impacto esperado.",
          "Distingue operación presupuestada de pago fuera de presupuesto, nuevo compromiso y crédito. Las excepciones quedan pendientes de Master.",
          "Guarda la bitácora, recarga y verifica autorizaciones. Solo marca Hecho cuando exista resultado y evidencia; actualiza la curva con datos sustentados."
        ]
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Comprueba antes de avanzar",
        "texto": "Practica primero con una hoja. En producción opera únicamente datos y decisiones autorizados. Estudio aprobado y maniobra firmada son cosas distintas."
      }
    ],
    "quiz": [
      {
        "pregunta": "¿Un pago fuera de presupuesto lo puede aprobar Carmen en este plan?",
        "opciones": [
          "Sí, si es pequeño",
          "No, requiere decisión de Master",
          "Sí, si la curva es verde"
        ],
        "explicacion": "Se conservan facultades y se escalan excepciones sin inventar montos.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "Se mueve un pago de 400 a la semana siguiente. ¿Qué es?",
        "opciones": [
          "Ahorro de 400",
          "Ingreso de 400",
          "Reprogramación; la salida permanece en otra semana"
        ],
        "explicacion": "No se elimina el costo ni la obligación.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "−1.200 + 1.000 + 300 + 400 da 500, con piso 2.000. ¿Cómo queda?",
        "opciones": [
          "Ámbar, faltan 1.500 para el piso",
          "Verde",
          "Afluencia"
        ],
        "explicacion": "Salir de negativo no equivale a alcanzar el piso.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿Qué se escribe debajo de cada paso de la fórmula?",
        "opciones": [
          "El nombre del paso otra vez",
          "Objetivos concretos con responsable, fecha y evidencia",
          "Solo el color"
        ],
        "explicacion": "La fórmula guía acciones verificables.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "Se aprobó una excepción y cambió su monto. ¿Qué corresponde?",
        "opciones": [
          "Conservar automáticamente la aprobación",
          "Marcar Hecho",
          "Nueva revisión de Master"
        ],
        "explicacion": "La aprobación se refiere a una propuesta concreta.",
        "repasa": [
          "evidencia"
        ]
      }
    ],
    "drills": [
      {
        "titulo": "Maniobra 1: plan de batalla de caja y autorizaciones",
        "fuente": "caja-direccion-aloha.md",
        "proposito": "Plan de batalla financiero con objetivos, responsables, fechas, impacto esperado y excepciones elevadas a Master.",
        "gradiente": "Resuelve primero el caso ficticio en una hoja. Después demuestra el recorrido con una operación real autorizada, bajo observación de Fernando como jefe entrenador. Si faltan documentos o no ha llegado el ritual, conserva la firma pendiente.",
        "masa": [
          "La curva y los puntos fuera detectados en el cierre.",
          "Fuentes de estadísticas reales, obligaciones y política de facultades vigente."
        ],
        "pasos": [
          "Identifica semana afectada, disponible, faltante para cero y para el piso; verifica primero que los datos estén completos.",
          "Fundamenta la condición con valores reales, fechas y fuente. Si faltan, déjala pendiente y crea una acción para obtenerlos.",
          "Conserva toda la fórmula en su orden. Escribe objetivos propios debajo de cada paso.",
          "Agrega acciones de cobro, ahorro o reprogramación con resultado, responsable, fecha, semana e impacto esperado.",
          "Distingue operación presupuestada de pago fuera de presupuesto, nuevo compromiso y crédito. Las excepciones quedan pendientes de Master.",
          "Guarda la bitácora, recarga y verifica autorizaciones. Solo marca Hecho cuando exista resultado y evidencia; actualiza la curva con datos sustentados.",
          "Muestra el resultado y su evidencia al jefe entrenador. Corrige las omisiones antes de pedir la firma."
        ],
        "criterios": [
          "Distingue datos reales, estimaciones y datos faltantes sin inventarlos.",
          "Completa el recorrido real autorizado y demuestra el resultado; cuando guarda, recarga y comprueba persistencia.",
          "Explica el riesgo o decisión, conserva soportes y respeta las facultades y aprobaciones."
        ],
        "errorTipico": "Dar por terminada una operación o una autorización sin evidencia."
      }
    ],
    "sop": {
      "proceso": "Plan de batalla de caja y autorizaciones",
      "cuando": "Al preparar el plan y antes de ejecutar excepciones.",
      "producto": "Plan de batalla financiero con objetivos, responsables, fechas, impacto esperado y excepciones elevadas a Master.",
      "pasos": [
        "Identifica semana afectada, disponible, faltante para cero y para el piso; verifica primero que los datos estén completos.",
        "Fundamenta la condición con valores reales, fechas y fuente. Si faltan, déjala pendiente y crea una acción para obtenerlos.",
        "Conserva toda la fórmula en su orden. Escribe objetivos propios debajo de cada paso.",
        "Agrega acciones de cobro, ahorro o reprogramación con resultado, responsable, fecha, semana e impacto esperado.",
        "Distingue operación presupuestada de pago fuera de presupuesto, nuevo compromiso y crédito. Las excepciones quedan pendientes de Master.",
        "Guarda la bitácora, recarga y verifica autorizaciones. Solo marca Hecho cuando exista resultado y evidencia; actualiza la curva con datos sustentados."
      ],
      "decide": [
        {
          "situacion": "Dato, soporte o aprobación pendiente",
          "regla": "Registra responsable y fecha; conserva la decisión pendiente."
        },
        {
          "situacion": "Práctica ficticia",
          "regla": "Resuélvela en una hoja; no crea pagos ni firmas reales."
        }
      ],
      "errores": [
        "Confundir verde proyectado con condición.",
        "Registrar ejecución o aprobación sin evidencia."
      ]
    }
  },
  {
    "id": "of-caj-4",
    "curso": "caja",
    "orden": 113,
    "roles": [
      "coordinador"
    ],
    "asignacion": "direccion-caja",
    "requiere": [
      "of-caj-3"
    ],
    "duracionMin": 20,
    "titulo": "Revisar el lunes y comprobar la mejora de caja",
    "fuente": [
      "caja-direccion-aloha.md"
    ],
    "palabras": [
      "bitacora",
      "evidencia",
      "plan-de-batalla",
      "saldo",
      "ingreso",
      "gasto"
    ],
    "pfv": "Revisión del lunes y control diario registrados con decisiones, resultados reales y pendientes trasladados.",
    "objetivo": "Revisión del lunes y control diario registrados con decisiones, resultados reales y pendientes trasladados.",
    "masa": [
      "El cierre del viernes, la curva actual y el plan guardado.",
      "Comprobantes disponibles y respuestas de responsables y de Master."
    ],
    "temario": [
      "Revisar rojos y excepciones el lunes",
      "Control diario contra lo previsto",
      "Bitácora y siguiente cierre"
    ],
    "laminas": [
      {
        "titulo": "Revisar rojos y excepciones el lunes",
        "texto": "Abre el viernes de referencia del cierre que vas a revisar; confirma qué versión se cerró y con qué datos."
      },
      {
        "titulo": "Control diario contra lo previsto",
        "texto": "Revisa primero rojos, ámbar, vencimientos próximos y bloqueos. Pide a cada responsable resultado y evidencia."
      },
      {
        "titulo": "Bitácora y siguiente cierre",
        "texto": "Actualiza acciones, resultados y bitácora. Completa la lista del lunes y registra la revisión; recarga para comprobarla."
      }
    ],
    "voz": "El lunes abre el cierre del viernes y compáralo con lo que realmente pasó. <break time=\"0.4s\"/> Si un cobro no llegó, registra la diferencia y decide qué hacer antes del vencimiento. <break time=\"0.4s\"/> Revisa también las excepciones que esperan aprobación. <break time=\"0.4s\"/> Tu bitácora debe permitir entender qué cambió, quién actúa y cuándo volverás a comprobar el resultado.",
    "bloques": [
      {
        "t": "p",
        "texto": "Revisión del lunes y control diario registrados con decisiones, resultados reales y pendientes trasladados. En esta unidad aprenderás el recorrido y lo comprobarás con un caso en una hoja antes de operar con datos reales."
      },
      {
        "t": "p",
        "texto": "El lunes revisa el cierre del viernes inmediatamente anterior. La revisión puede registrarse desde ese lunes, no antes. Si el cierre está incompleto, primero resuelve el bloqueo. Verifica el banco y los vencimientos del día: una curva semanal puede ocultar un faltante intradía. Atiende un pago urgente cuando aparece; no esperes al lunes si el problema surge antes."
      },
      {
        "t": "p",
        "texto": "Abre Historial verificable para ver el plan y la foto de caja guardados. Conserva el viernes original al registrar su revisión del lunes. El historial guarda autor, fecha y versión. Las acciones se cancelan con motivo, no se borran. Si otra sesión guardó una versión más nueva, recarga y concilia los cambios antes de volver a guardar."
      },
      {
        "t": "p",
        "texto": "En cada revisión pregunta: ¿qué debía pasar?, ¿qué pasó?, ¿qué evidencia lo demuestra?, ¿por qué cambió?, ¿qué decisión necesitamos y quién la ejecuta antes de qué fecha? Si un cobro no llegó, no lo declares realizado para sostener el verde. Si un costo se redujo solo una vez, no proyectes ahorro recurrente sin soporte. Si el dinero entró por crédito, conserva la deuda y su devolución en el análisis."
      },
      {
        "t": "p",
        "texto": "Registra resultado y referencia de evidencia al marcar Hecho. Un aprobado pendiente de pago todavía no es un pago efectuado. La bitácora explica la variación frente al cierre y el siguiente control. Los nuevos ciclos se abren con su viernes: traslada manualmente las acciones pendientes, indicando ciclo y acción de origen; no pierdas pasos inconclusos de una fórmula solo porque la gráfica mejoró."
      },
      {
        "t": "sub",
        "texto": "Ejercicio · lunes con un cobro que no llegó"
      },
      {
        "t": "p",
        "texto": "Caso ficticio: el viernes se esperaban 1.000 de cobro y el lunes solo se comprueban 600. Anota desviación −400, cliente o referencia, responsable, fecha de recuperación y semana afectada. Actualiza el cobro esperado sustentado y revisa si aparece rojo. Registra la nueva decisión; no sustituyas el histórico del viernes. Comprueba también que una reprogramación de 400 no desapareció de la semana de destino."
      },
      {
        "t": "p",
        "texto": "Ensaya tres situaciones en una hoja: ingreso que no llegó, costo que subió y excepción rechazada. En cada una escribe decisión, responsable, fecha y evidencia. La maniobra final requiere una revisión real del lunes con el jefe entrenador; si todavía no ha ocurrido el primer lunes, el estudio puede quedar aprobado y la firma pendiente."
      },
      {
        "t": "sub",
        "texto": "Recorrido en la plataforma"
      },
      {
        "t": "pasos",
        "items": [
          "Abre el viernes de referencia del cierre que vas a revisar; confirma qué versión se cerró y con qué datos.",
          "Actualiza extractos, clasificación y compromisos. Compara la foto del viernes con la curva actual por empresa.",
          "Revisa primero rojos, ámbar, vencimientos próximos y bloqueos. Pide a cada responsable resultado y evidencia.",
          "Revisa excepciones con Master; conserva pendientes sin fingir aprobación. Verifica en la plataforma el estado guardado.",
          "Actualiza acciones, resultados y bitácora. Completa la lista del lunes y registra la revisión; recarga para comprobarla.",
          "Revisa cobros y pagos cada día. El viernes compara esperado con realizado, identifica causas y traslada lo pendiente al nuevo ciclo con su referencia."
        ]
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Comprueba antes de avanzar",
        "texto": "Practica primero con una hoja. En producción opera únicamente datos y decisiones autorizados. Estudio aprobado y maniobra firmada son cosas distintas."
      }
    ],
    "quiz": [
      {
        "pregunta": "¿Qué cierre revisas el lunes?",
        "opciones": [
          "El viernes inmediatamente anterior, conservando su referencia",
          "El viernes futuro",
          "Cualquier ciclo sin fecha"
        ],
        "explicacion": "Se compara el mismo ciclo y su foto original.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "Se esperaban 1.000 y entraron 600. ¿Qué registras?",
        "opciones": [
          "1.000 para no cambiar el plan",
          "Desviación de −400 y acción de recuperación sustentada",
          "Afluencia"
        ],
        "explicacion": "La bitácora distingue esperado y realizado.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿Cuándo marcas una acción como Hecho?",
        "opciones": [
          "Al proponerla",
          "Al pedir aprobación",
          "Cuando se ejecutó y hay evidencia"
        ],
        "explicacion": "Una autorización o promesa no es ejecución.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿Puedes borrar una acción fallida del plan?",
        "opciones": [
          "No; consérvala y registra estado, motivo y siguiente decisión",
          "Sí para limpiar el historial",
          "Solo si cambió la condición"
        ],
        "explicacion": "El historial permite aprender de lo previsto y lo ocurrido.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿El cuestionario permite firmar la maniobra del lunes antes de realizarla?",
        "opciones": [
          "Sí",
          "No; la firma exige la revisión real observada",
          "Sí si Carmen conoce el tema"
        ],
        "explicacion": "Estudio y ejecución observada son registros distintos.",
        "repasa": [
          "evidencia"
        ]
      }
    ],
    "drills": [
      {
        "titulo": "Maniobra 1: revisar el lunes y comprobar la mejora de caja",
        "fuente": "caja-direccion-aloha.md",
        "proposito": "Revisión del lunes y control diario registrados con decisiones, resultados reales y pendientes trasladados.",
        "gradiente": "Resuelve primero el caso ficticio en una hoja. Después demuestra el recorrido con una operación real autorizada, bajo observación de Fernando como jefe entrenador. Si faltan documentos o no ha llegado el ritual, conserva la firma pendiente.",
        "masa": [
          "El cierre del viernes, la curva actual y el plan guardado.",
          "Comprobantes disponibles y respuestas de responsables y de Master."
        ],
        "pasos": [
          "Abre el viernes de referencia del cierre que vas a revisar; confirma qué versión se cerró y con qué datos.",
          "Actualiza extractos, clasificación y compromisos. Compara la foto del viernes con la curva actual por empresa.",
          "Revisa primero rojos, ámbar, vencimientos próximos y bloqueos. Pide a cada responsable resultado y evidencia.",
          "Revisa excepciones con Master; conserva pendientes sin fingir aprobación. Verifica en la plataforma el estado guardado.",
          "Actualiza acciones, resultados y bitácora. Completa la lista del lunes y registra la revisión; recarga para comprobarla.",
          "Revisa cobros y pagos cada día. El viernes compara esperado con realizado, identifica causas y traslada lo pendiente al nuevo ciclo con su referencia.",
          "Muestra el resultado y su evidencia al jefe entrenador. Corrige las omisiones antes de pedir la firma."
        ],
        "criterios": [
          "Distingue datos reales, estimaciones y datos faltantes sin inventarlos.",
          "Completa el recorrido real autorizado y demuestra el resultado; cuando guarda, recarga y comprueba persistencia.",
          "Explica el riesgo o decisión, conserva soportes y respeta las facultades y aprobaciones."
        ],
        "errorTipico": "Dar por terminada una operación o una autorización sin evidencia."
      }
    ],
    "sop": {
      "proceso": "Revisar el lunes y comprobar la mejora de caja",
      "cuando": "Cada lunes y en el control diario posterior.",
      "producto": "Revisión del lunes y control diario registrados con decisiones, resultados reales y pendientes trasladados.",
      "pasos": [
        "Abre el viernes de referencia del cierre que vas a revisar; confirma qué versión se cerró y con qué datos.",
        "Actualiza extractos, clasificación y compromisos. Compara la foto del viernes con la curva actual por empresa.",
        "Revisa primero rojos, ámbar, vencimientos próximos y bloqueos. Pide a cada responsable resultado y evidencia.",
        "Revisa excepciones con Master; conserva pendientes sin fingir aprobación. Verifica en la plataforma el estado guardado.",
        "Actualiza acciones, resultados y bitácora. Completa la lista del lunes y registra la revisión; recarga para comprobarla.",
        "Revisa cobros y pagos cada día. El viernes compara esperado con realizado, identifica causas y traslada lo pendiente al nuevo ciclo con su referencia."
      ],
      "decide": [
        {
          "situacion": "Dato, soporte o aprobación pendiente",
          "regla": "Registra responsable y fecha; conserva la decisión pendiente."
        },
        {
          "situacion": "Práctica ficticia",
          "regla": "Resuélvela en una hoja; no crea pagos ni firmas reales."
        }
      ],
      "errores": [
        "Confundir verde proyectado con condición.",
        "Registrar ejecución o aprobación sin evidencia."
      ]
    }
  }
]
