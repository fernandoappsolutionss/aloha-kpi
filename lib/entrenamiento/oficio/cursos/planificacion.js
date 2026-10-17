// Ampliación de planificación: datos editoriales; progreso y firmas conservan sus IDs.
import { FORMULAS } from '../../../condiciones/formulas.mjs'
import { PRIMER_CIERRE_REUNION, calendarioPlan } from '../../../reunion-semanal.mjs'

const primerCiclo = calendarioPlan(PRIMER_CIERRE_REUNION)
export const AVISO_PRIMER_CICLO = `Primera reunión: ${primerCiclo.reunion} (viernes 23-oct-2026); cierre de referencia: ${primerCiclo.cierre} (jueves 22-oct). Ejecución: ${primerCiclo.desde} a ${primerCiclo.hasta} (23–29 oct). El plan conserva la referencia del 22; las cuotas corresponden al cierre del 29. Antes del primer corte estamos en preparación. El plazo de viernes 10:00 es local al centro y no confirma la hora de reunión.`

export const PLANIFICACION = [
  {
    "id": "of-sem-3",
    "curso": "semana",
    "orden": 103,
    "roles": [
      "administradora",
      "asistente",
      "coach",
      "coordinador"
    ],
    "requiere": [
      "of-sem-2"
    ],
    "duracionMin": 25,
    "titulo": "Del plan estratégico al programa y proyecto",
    "fuente": [
      "planificacion-aloha.md"
    ],
    "palabras": [
      "estrategia-operativa",
      "programa-operativo",
      "proyecto",
      "escena-actual-e-ideal",
      "dependencia",
      "tipos-de-objetivo"
    ],
    "pfv": "Conectas una meta del centro con un programa, un proyecto y una acción de tu puesto con fecha y evidencia.",
    "masa": [
      "Una hoja en blanco y lápiz para ordenar una meta y sus acciones.",
      "Tus notas sobre condición, fórmula y objetivos de la unidad anterior."
    ],
    "temario": [
      "De la escena actual a la meta",
      "Programa, proyecto y tipos de objetivo",
      "Responsables, recursos y aprobaciones",
      "Dos formatos con ejemplo y ejercicio"
    ],
    "laminas": [
      {
        "titulo": "Una meta necesita un camino",
        "texto": "Escena actual → meta → estrategia → programa → proyecto → objetivo semanal → acción diaria."
      },
      {
        "titulo": "La cuota mide; el objetivo hace",
        "texto": "Diez asistentes es la cuota. Confirmar trece citas con respuestas registradas es una acción que puede contribuir a ella."
      },
      {
        "titulo": "Cada decisión tiene responsable",
        "items": [
          "Gerencia valida dirección, recursos y políticas.",
          "Coordinación revisa dependencias y aprueba cuotas.",
          "La Administradora ejecuta el plan; cada puesto cumple su contribución."
        ]
      }
    ],
    "voz": "Una meta sola no organiza el trabajo. <break time=\"0.4s\"/> Queremos que el centro crezca, pero necesitamos saber desde dónde, hasta cuánto y para cuándo. <break time=\"0.4s\"/> En esta unidad vas a convertir esa meta en un programa, un proyecto y acciones concretas. <break time=\"0.4s\"/> Cada acción tendrá una persona, una fecha y una evidencia. <break time=\"0.4s\"/> Vas a trabajar en una hoja con un centro ficticio. Después demostrarás una contribución real de tu puesto ante tu jefe entrenador.",
    "bloques": [
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Fuente y adaptación",
        "texto": "Base: Plan estratégico + programas, pp. 1–23, especialmente 7–16 (programas y objetivos) y 17–22 (ejecución). La secuencia de trabajo, los formatos y los ejemplos siguientes son la adaptación de entrenamiento ALOHA. No cambian permisos operativos."
      },
      {
        "t": "sub",
        "texto": "Construye el camino antes de llenar la semana"
      },
      {
        "t": "p",
        "texto": "Empieza con una escena actual verificable: qué ocurre, con qué fuente y a qué fecha. Describe la escena ideal que necesitas. La meta concreta esa diferencia en un resultado y un plazo; el propósito explica para qué vale la pena. La política fija límites que debes conservar. La estrategia operativa elige cómo cerrar la diferencia con los recursos disponibles."
      },
      {
        "t": "p",
        "texto": "Un programa operativo coordina proyectos en secuencia. Un proyecto produce una parte definida del programa. Un objetivo expresa una sola acción, con responsable, fecha y evidencia; la cuota expresa cuánto resultado esperas en el período. En el plan semanal seleccionas lo realizable; en el control diario ejecutas y compruebas las acciones de hoy."
      },
      {
        "t": "tabla",
        "titulo": "Ejemplo resuelto · Centro Escuela ficticio",
        "encabezados": [
          "Nivel",
          "Decisión concreta"
        ],
        "filas": [
          [
            "Escena actual / ideal",
            "100 activos al 22-oct / continuidad de clases y 108 activos al 19-nov."
          ],
          [
            "Meta y propósito",
            "108 activos al 19-nov para recuperar continuidad del servicio."
          ],
          [
            "Política y estrategia",
            "No prometer cupos sin capacidad; recuperar seguimiento comercial y asegurar entrega."
          ],
          [
            "Programa",
            "Recuperar entradas y continuidad: verificar capacidad → seguimiento → pruebas e inicios → retención y cobros → revisión."
          ],
          [
            "Proyecto de esta semana",
            "Conseguir diez asistentes a prueba y tres inscripciones con inicio dentro del 23–29 oct."
          ],
          [
            "Objetivo semanal",
            "Ana confirma 13 citas el 23-oct y conserva respuestas y fechas."
          ],
          [
            "Acción diaria",
            "Ana contacta el conjunto autorizado de oportunidades y actualiza cada respuesta; verifica las citas confirmadas al cierre."
          ]
        ]
      },
      {
        "t": "tabla",
        "titulo": "Tipos de objetivo: detecta qué falta",
        "encabezados": [
          "Tipo",
          "Para qué sirve",
          "Ejemplo ALOHA"
        ],
        "filas": [
          [
            "Mayor",
            "Define el resultado principal del programa.",
            "Llegar a 108 activos con servicio disponible al 19-nov."
          ],
          [
            "Primario",
            "Establece organización y responsables para operar.",
            "Nombrar a Ana responsable del proyecto y acordar sus recursos."
          ],
          [
            "Vital",
            "Garantiza una condición indispensable de continuidad.",
            "Asegurar un coach habilitado antes de abrir el grupo."
          ],
          [
            "Condicional",
            "Investiga o comprueba una posibilidad antes de comprometerla.",
            "Verificar horario y tres cupos reales en el grupo."
          ],
          [
            "Operativo",
            "Ordena una acción concreta.",
            "Confirmar una cita con una familia y registrar su respuesta."
          ],
          [
            "De producción",
            "Fija la cantidad y plazo del producto.",
            "Lograr diez asistentes efectivos a prueba en la semana."
          ]
        ]
      },
      {
        "t": "sub",
        "texto": "Valida recursos y decide quién aprueba"
      },
      {
        "t": "p",
        "texto": "Gerencia valida la dirección, los recursos y los cambios de política. Coordinación revisa viabilidad y dependencias; la Administradora ejecuta en su centro. Asistente y coach presentan su contribución dentro de sus permisos. La aprobación de un programa se documenta en el canal autorizado; no equivale a aprobar cuotas ni a guardar la condición. La sección Plan estratégico · Ruta de Nivel orienta acciones de crecimiento: no es un formulario para almacenar estos programas o proyectos."
      },
      {
        "t": "pasos",
        "items": [
          "Escribe fuente, fecha, escena actual y meta con plazo.",
          "Define estrategia y programa; ordena los proyectos y marca qué depende de qué.",
          "Descompón el primer proyecto en una acción por responsable, con fecha, recursos y evidencia.",
          "Identifica quién valida dirección y recursos; registra la decisión pendiente antes de comprometer lo que no tienes.",
          "Selecciona las acciones de esta semana y elimina lo que no contribuye al producto. Cada puesto presenta solamente su parte."
        ]
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Errores que debes detectar",
        "texto": "“Mejorar ventas” no tiene resultado verificable. “Hacer un afiche” sin público, objetivo o capacidad de atender puede ser una actividad irrelevante. Si una dependencia no está resuelta, registra bloqueo y decisor; no prometas la cuota como si los recursos existieran."
      },
      {
        "t": "sub",
        "texto": "Formato 1 · Estrategia y programa"
      },
      {
        "t": "tabla",
        "titulo": "Ejemplo completado · Centro Escuela ficticio",
        "encabezados": [
          "Campo",
          "Contenido"
        ],
        "filas": [
          [
            "Nombre, versión y centro",
            "Recuperar entradas y continuidad · v1 · Centro Escuela (ficticio)."
          ],
          [
            "Escena actual; fuente y corte",
            "100 activos al 22-oct-2026; cuatro cierres ficticios 112, 108, 104, 100. Ficha pedagógica."
          ],
          [
            "Meta, horizonte y propósito",
            "108 activos al 19-nov-2026; recuperar continuidad del servicio con saldo neto de dos por semana."
          ],
          [
            "Estrategia y política aplicable",
            "Recuperar seguimiento comercial y asegurar entrega; no prometer cupos sin coach, grupo y materiales confirmados."
          ],
          [
            "Recursos, capacidad y responsable",
            "Ana, con Luis y Marta; tres cupos disponibles en el grupo E1; Elena revisa dependencias."
          ],
          [
            "Proyectos en secuencia",
            "P1: seguimiento y pruebas 23–29 oct; P2: inicios y retención; P3: revisar resultados antes de ampliar la captación."
          ],
          [
            "Indicadores y riesgos",
            "Cinco estadísticas semanales y conversión por etapas; riesgo de inscripciones con inicio posterior al período."
          ],
          [
            "Aprobación y evidencia",
            "Dirección y recursos autorizados solo en la ficha ficticia del caso; en trabajo real registrar decisor, fecha y referencia de aprobación de Gerencia."
          ]
        ]
      },
      {
        "t": "tabla",
        "titulo": "Tu ejercicio · copia y completa una ficha por caso",
        "encabezados": [
          "Campo",
          "Completar"
        ],
        "filas": [
          [
            "Nombre, versión y centro",
            "________________________________________________"
          ],
          [
            "Escena actual; fuente y corte",
            "________________________________________________"
          ],
          [
            "Meta, horizonte y propósito",
            "________________________________________________"
          ],
          [
            "Estrategia y política aplicable",
            "________________________________________________"
          ],
          [
            "Recursos, capacidad y responsable",
            "________________________________________________"
          ],
          [
            "Proyectos en secuencia",
            "________________________________________________"
          ],
          [
            "Indicadores y riesgos",
            "________________________________________________"
          ],
          [
            "Aprobación y evidencia",
            "________________________________________________"
          ]
        ]
      },
      {
        "t": "sub",
        "texto": "Formato 2 · Proyecto"
      },
      {
        "t": "tabla",
        "titulo": "Ejemplo completado · Centro Escuela ficticio",
        "encabezados": [
          "Campo",
          "Contenido"
        ],
        "filas": [
          [
            "Programa y referencia",
            "Recuperar entradas y continuidad · v1 / P1."
          ],
          [
            "Producto y plazo",
            "Diez asistentes a prueba y tres inscritos con inicio efectivo dentro del 23–29 oct."
          ],
          [
            "Responsable único",
            "Ana; Luis y Marta aportan soportes y capacidad."
          ],
          [
            "Dependencias",
            "Tres cupos con grupo, coach habilitado, horario y materiales confirmados antes de ofrecer inicio."
          ],
          [
            "Objetivos y evidencia por objetivo",
            "Confirmar 13 citas: registro de respuestas; preparar 3 cupos: lista verificada; relacionar 3 inscripciones con inicio: registro fechado."
          ],
          [
            "Verificador y criterio de cierre",
            "Elena contrasta registros de asistencia e inicios al 29-oct; los pendientes quedan identificados, sin declararlos realizados."
          ]
        ]
      },
      {
        "t": "tabla",
        "titulo": "Tu ejercicio · copia y completa una ficha por caso",
        "encabezados": [
          "Campo",
          "Completar"
        ],
        "filas": [
          [
            "Programa y referencia",
            "________________________________________________"
          ],
          [
            "Producto y plazo",
            "________________________________________________"
          ],
          [
            "Responsable único",
            "________________________________________________"
          ],
          [
            "Dependencias",
            "________________________________________________"
          ],
          [
            "Objetivos y evidencia por objetivo",
            "________________________________________________"
          ],
          [
            "Verificador y criterio de cierre",
            "________________________________________________"
          ]
        ]
      },
      {
        "t": "sub",
        "texto": "Ejercicio: construye y depura"
      },
      {
        "t": "p",
        "texto": "En tu hoja usa un centro ficticio con 80 activos y una meta de 84 dentro de cuatro semanas. Solo tiene dos cupos disponibles ahora. Ordena las tarjetas: confirmar cupos, asignar responsable, recuperar seguimiento, lograr 84 activos, imprimir decoración sin objetivo comercial. Construye un programa y un proyecto viable; justifica qué tarjeta retiras. Asistente: aporta soportes y fechas. Coach: capacidad y entrega. Administradora: acciones y recursos. Coordinación: dependencias y revisión. No copies las cifras del Centro Escuela ni registres este caso en KPI."
      }
    ],
    "quiz": [
      {
        "pregunta": "La meta es 84 activos, pero no se han comprobado cupos. ¿Qué falta primero?",
        "opciones": [
          "Prometer cuatro inicios",
          "Verificar la capacidad como objetivo condicional",
          "Comprar decoración"
        ],
        "explicacion": "La cuota debe esperar la comprobación del recurso que permite cumplirla.",
        "repasa": [
          "tipos-de-objetivo"
        ]
      },
      {
        "pregunta": "¿Cuál es un objetivo ejecutable?",
        "opciones": [
          "Ana confirma 13 citas el 23-oct y conserva respuestas",
          "Mejorar el ambiente",
          "Crecer mucho"
        ],
        "explicacion": "Hay una acción, responsable, fecha y evidencia comprobable.",
        "repasa": [
          "proyecto"
        ]
      },
      {
        "pregunta": "Gerencia autoriza un programa. ¿Qué ocurre con las cuotas en KPI?",
        "opciones": [
          "Quedan aprobadas solas",
          "Se borra la condición",
          "Coordinación debe revisar y aprobar las propuestas del período"
        ],
        "explicacion": "Son decisiones diferentes; una autorización de programa no cambia el estado de las cuotas.",
        "repasa": [
          "programa-operativo"
        ]
      },
      {
        "pregunta": "Una tarea no contribuye a ningún producto del programa. ¿Qué haces?",
        "opciones": [
          "La mantienes para llenar el plan",
          "La retiras o justificas su contribución antes de incluirla",
          "La conviertes en estadística"
        ],
        "explicacion": "El plan selecciona trabajo que produce un resultado útil y viable.",
        "repasa": [
          "estrategia-operativa"
        ]
      },
      {
        "pregunta": "Un coach participa en este programa. ¿Cuál es su aporte?",
        "opciones": [
          "Comprueba capacidad y entrega académica de sus grupos",
          "Aprueba cuotas de todo el centro",
          "Cambia la condición usando otra cuenta"
        ],
        "explicacion": "Cada puesto cumple su parte sin asumir permisos de otro.",
        "repasa": [
          "dependencia"
        ]
      }
    ],
    "drills": [
      {
        "titulo": "Maniobra 1: de la meta a tu contribución",
        "fuente": "planificacion-aloha.md",
        "proposito": "Demostrar una planificación ejecutable y comprobar el resultado con evidencia.",
        "gradiente": "Primero ensaya en una hoja con los datos ficticios de la lección. Después realiza una tarea real autorizada de tu puesto con tu jefe entrenador presente. Si todavía no hay una tarea real válida, espera para ejecutarla y firmarla. La simulación y el cuestionario no autorizan la firma definitiva.",
        "masa": [
          "Una hoja con tu ejercicio y sus soportes.",
          "El procedimiento de esta unidad y una tarea real autorizada de tu puesto."
        ],
        "pasos": [
          "Ordena tarjetas de meta, programa, proyecto y acción; explica las dependencias.",
          "Completa los formatos 1 y 2 con el ejercicio de 80 activos y dos cupos. Retira la actividad sin contribución.",
          "Con tu jefe selecciona una contribución real autorizada de tu puesto a un plan vigente. Confirma recursos, responsable, fecha y producto.",
          "Realiza esa contribución y muestra el resultado; si eres asistente o coach, entrega soportes o capacidad sin aprobar el programa.",
          "Entrega el producto y la evidencia. Tu jefe entrenador observa la ejecución real, pide corregir cualquier omisión y firma solamente cuando se cumplen todos los criterios."
        ],
        "criterios": [
          "Conecta la meta con un programa y una acción verificable de su puesto.",
          "Detecta la restricción de capacidad y justifica la actividad que elimina.",
          "Demuestra una contribución real y autorizada con su evidencia y fecha."
        ],
        "errorTipico": "Confundir un documento escrito con una acción ejecutada. Cada resultado requiere evidencia y verificación."
      }
    ],
    "sop": {
      "proceso": "Convertir una meta en acciones de tu puesto",
      "cuando": "Al preparar un programa o aportar a su revisión.",
      "producto": "Mapa de meta a acción viable, con responsables y evidencia.",
      "pasos": [
        "Fija escena actual, fuente, fecha, meta y propósito.",
        "Define estrategia y política que se debe respetar.",
        "Ordena programa y proyectos con dependencias.",
        "Comprueba responsables, capacidad y recursos autorizados.",
        "Escribe una acción por objetivo con fecha y evidencia.",
        "Selecciona el trabajo semanal y diario de tu puesto.",
        "Registra aprobación de dirección y recursos en el canal autorizado."
      ],
      "decide": [
        {
          "situacion": "Recurso o aprobación faltante",
          "regla": "Eleva a Gerencia o coordinación según competencia y conserva el bloqueo."
        },
        {
          "situacion": "Tarea sin contribución",
          "regla": "Retírala o justifica su producto antes de comprometerla."
        }
      ],
      "errores": [
        "Confundir programa aprobado con cuota aprobada.",
        "Prometer resultados sin comprobar capacidad."
      ]
    }
  },
  {
    "id": "of-sem-4",
    "curso": "semana",
    "orden": 104,
    "roles": [
      "administradora",
      "coordinador"
    ],
    "requiere": [
      "of-sem-3"
    ],
    "duracionMin": 35,
    "titulo": "Planificar captación, ventas, cobranza y entrega",
    "fuente": [
      "planificacion-aloha.md"
    ],
    "palabras": [
      "capacidad-operativa",
      "alineamiento-comercial",
      "cuota-semanal",
      "estadistica-semanal",
      "evidencia",
      "dependencia"
    ],
    "pfv": "Preparas un cuadro integrado con cinco cuotas sustentadas, capacidad verificada y acciones por área sin confundir ventas con efectivo.",
    "masa": [
      "Una hoja para comparar oportunidades, ventas, cobros y cupos.",
      "Tu mapa de programa y proyecto de la unidad anterior."
    ],
    "temario": [
      "Seis áreas, un resultado coordinado",
      "Cinco estadísticas y métricas complementarias",
      "Cuotas por conversión y capacidad",
      "Ejercicio de datos faltantes e inicio futuro"
    ],
    "laminas": [
      {
        "titulo": "La promesa debe poder entregarse",
        "texto": "Captación → respuesta → cita → asistencia → inscripción → inicio efectivo → continuidad. Verifica capacidad antes de comprometer el inicio."
      },
      {
        "titulo": "Venta, factura y cobro son distintos",
        "texto": "Una matrícula vendida por USD 50 y cobrada por USD 50 no genera USD 100 de efectivo. La cuenta por cobrar necesita fecha y soporte."
      },
      {
        "titulo": "Compara el mismo período",
        "items": [
          "Niños activos: nivel al corte.",
          "Inscritos, retiros y pruebas asistidas: flujos semanales.",
          "Facturas vencidas: cantidad al corte, con sentido inverso."
        ]
      }
    ],
    "voz": "El plan tiene que conectar lo que atraes, lo que vendes, lo que cobras y lo que puedes entregar. <break time=\"0.4s\"/> Si prometes tres inicios y solo tienes dos cupos, el problema está en el plan. <break time=\"0.4s\"/> Vas a revisar las cinco estadísticas de KPI y los soportes complementarios. <break time=\"0.4s\"/> Separaremos una inscripción de su fecha de inicio, y una venta del dinero recibido. <break time=\"0.4s\"/> Al terminar tendrás cuotas justificadas y acciones por área, con los datos faltantes identificados.",
    "bloques": [
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Fuentes y alcance",
        "texto": "Base: Guía general del Consejo Asesor, p. 2; Ventas, pp. 4–6; guías de Marketing y promoción, Clientes nuevos, Cobranza y Producción, apartados de estadísticas y programas de sus pp. 1–15, 1–15, 1–16 y 1–17, respectivamente. Estadísticas: definiciones, pp. 1–13. La matriz siguiente adapta esas áreas a ALOHA; no añade estadísticas al ranking ni pantallas operativas."
      },
      {
        "t": "sub",
        "texto": "Prepara el dato y conviértelo en acción"
      },
      {
        "t": "tabla",
        "titulo": "Mapa de planificación integrada",
        "encabezados": [
          "Área",
          "Dato, fuente y decisión",
          "Producto del plan"
        ],
        "filas": [
          [
            "Captación / promoción",
            "CRM y campañas: oportunidades, origen, respuestas e inversión autorizada. ¿A qué público podemos atender?",
            "Acción, responsable, fecha, presupuesto autorizado y expectativa marcada como estimación."
          ],
          [
            "Ventas / pruebas",
            "CRM y KPI: citas confirmadas, asistentes, inscritos y fecha de inicio. ¿En qué etapa se pierde seguimiento?",
            "Acciones por etapa y fecha; la cita no cuenta como asistente."
          ],
          [
            "Cobranza",
            "Zoho: factura, saldo, moneda, vencimiento, antigüedad, acuerdo y cobro con soporte.",
            "Gestión por cuenta con responsable, fecha y evidencia; no solo cantidad de facturas."
          ],
          [
            "Entrega académica",
            "Grupo, horario, coach habilitado, cupos, materiales, calendario y asistencia.",
            "Inicio viable y tratamiento de incidencias antes de prometer servicio."
          ],
          [
            "Retención / calidad",
            "Ausencias verificadas, retiros y motivos, evaluación y encuestas autorizadas.",
            "Intervención concreta y comprobación de continuidad; no suponer motivos."
          ],
          [
            "Personas / organización",
            "Disponibilidad, asignaciones y prácticas firmadas.",
            "Responsables con tiempo y competencia; dependencias resueltas o escaladas."
          ]
        ]
      },
      {
        "t": "sub",
        "texto": "Las cinco estadísticas vigentes"
      },
      {
        "t": "tabla",
        "titulo": "No mezcles nivel, flujo y dinero",
        "encabezados": [
          "Estadística",
          "Qué mide",
          "Comprobación"
        ],
        "filas": [
          [
            "Niños activos",
            "Nivel de población al corte; inicios efectivos y reincorporaciones menos retiros según el cálculo vigente.",
            "Una inscripción con inicio futuro no aumenta todavía los activos."
          ],
          [
            "Nuevos inscritos",
            "Primeras inscripciones registradas en el período.",
            "No incluir transferencias ni inscripciones anuladas; distinguir fecha de inscripción y de inicio."
          ],
          [
            "Retiros",
            "Salidas operativas de la semana.",
            "En este catálogo excluye graduados; es inversa: menos retiros es mejor."
          ],
          [
            "Facturas de mensualidad vencidas",
            "Cantidad al corte.",
            "No es monto de cartera ni dinero cobrado; es inversa. Revisar antigüedad y moneda en soporte complementario."
          ],
          [
            "Clases de prueba asistidas",
            "Asistentes a pruebas realizadas.",
            "No confundir citas agendadas ni invitaciones con asistencia efectiva."
          ]
        ]
      },
      {
        "t": "p",
        "texto": "Cada fila complementaria lleva centro, fecha de corte, responsable, fuente, unidad, cobertura, meta y resultado; si mide dinero incluye moneda. Sin soporte es “dato pendiente”, no cero. No sumes monedas distintas sin conversión documentada. Una venta, su factura y su cobro son hechos diferentes: relaciona sus referencias sin sumar el mismo ingreso dos veces. Conserva los datos personales en la ubicación autorizada."
      },
      {
        "t": "sub",
        "texto": "Deriva cuotas que el centro pueda cumplir"
      },
      {
        "t": "pasos",
        "items": [
          "Identifica el período de ejecución y verifica fuentes comparables.",
          "Relaciona oportunidades, confirmaciones, asistencias, inscripciones e inicios efectivos.",
          "Calcula conversiones observadas con numerador, denominador y período. Si no existen, declara hipótesis y fecha para validarla.",
          "Comprueba cupos, coach, materiales y fechas antes de proyectar activos.",
          "Propón las cinco cuotas en Semana. La Administradora propone y coordinación aprueba después de revisar la justificación.",
          "Guarda la matriz complementaria en la ubicación autorizada y vincula sus acciones al plan; no existe un guardado automático de estos formatos."
        ]
      },
      {
        "t": "tabla",
        "titulo": "Ejemplo de cálculo · hipótesis ficticias, no histórico ALOHA",
        "encabezados": [
          "Etapa",
          "Cálculo / límite",
          "Decisión"
        ],
        "filas": [
          [
            "Oportunidades a citas",
            "26 × 50% = 13 citas.",
            "Se ensaya esta tasa; se verifica al cierre."
          ],
          [
            "Citas a asistencia",
            "13 × 80% = 10,4; objetivo operativo de 10 asistentes.",
            "Los resultados se cuentan en personas enteras; no se garantizan."
          ],
          [
            "Asistencia a inscripción",
            "10 × 30% = 3 inscritos.",
            "Verificar tres cupos y fechas de inicio."
          ],
          [
            "Población al corte",
            "100 + 3 inicios efectivos − 1 retiro = 102.",
            "Solo es válido si los tres comienzan dentro de esa semana."
          ],
          [
            "Entradas de dinero ficticias USD",
            "3 matrículas × USD 50 = USD 150 de venta; cobro nuevo 150 + cartera anterior 150 = USD 300 de efectivo.",
            "No sumar nuevamente los 150 vendidos; no son precios reales de ALOHA."
          ]
        ]
      },
      {
        "t": "sub",
        "texto": "Formato 4 · Ficha de cuota (repetir para las cinco estadísticas)"
      },
      {
        "t": "tabla",
        "titulo": "Ejemplo completado · Centro Escuela ficticio",
        "encabezados": [
          "Campo",
          "Contenido"
        ],
        "filas": [
          [
            "Centro, corte y período",
            "Centro Escuela; referencia 22-oct; ejecución 23–29 oct; resultado al 29-oct-2026."
          ],
          [
            "Estadística, unidad, tipo y sentido",
            "Niños activos · niños · nivel al corte · directa (mayor es mejor en este caso)."
          ],
          [
            "Fuente, responsable y cobertura",
            "Ficha ficticia de matrícula/inicio/retiro; Ana; todos los registros del caso identificados."
          ],
          [
            "Referencia y propuesta",
            "100 → 102 activos."
          ],
          [
            "Justificación y capacidad",
            "100 + 3 inicios efectivos − 1 retiro = 102; tres cupos comprobados; conversión comercial todavía es hipótesis."
          ],
          [
            "Aprobador, fecha y estado",
            "Elena, 23-oct-2026; aprobada en la simulación, sin escribir en KPI real."
          ],
          [
            "Resultado exacto y diferencia",
            "102 al 29-oct en la ficha de resultados; diferencia 0; cumplida."
          ]
        ]
      },
      {
        "t": "tabla",
        "titulo": "Tu ejercicio · copia y completa una ficha por caso",
        "encabezados": [
          "Campo",
          "Completar"
        ],
        "filas": [
          [
            "Centro, corte y período",
            "________________________________________________"
          ],
          [
            "Estadística, unidad, tipo y sentido",
            "________________________________________________"
          ],
          [
            "Fuente, responsable y cobertura",
            "________________________________________________"
          ],
          [
            "Referencia y propuesta",
            "________________________________________________"
          ],
          [
            "Justificación y capacidad",
            "________________________________________________"
          ],
          [
            "Aprobador, fecha y estado",
            "________________________________________________"
          ],
          [
            "Resultado exacto y diferencia",
            "________________________________________________"
          ]
        ]
      },
      {
        "t": "sub",
        "texto": "Ejercicio con restricción y dato faltante"
      },
      {
        "t": "p",
        "texto": "Centro Roble es ficticio: 80 activos al corte, 20 oportunidades, 10 citas confirmadas, objetivo de 8 asistentes y 3 inscripciones, una salida prevista y solo dos cupos con inicio esta semana. La tercera inscripción puede iniciar el 2-nov. Falta el soporte de facturas vencidas; no hay tasa histórica de conversión. En una hoja prepara las cinco propuestas con estado y justificación. Calcula activos posibles, distingue venta e inicio y asigna quién consigue el soporte faltante. No presentes la quinta cuota como completa o aprobada mientras falte su fundamento."
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Solución razonada para revisar tu ejercicio",
        "texto": "Si los dos cupos se ocupan y ocurre un retiro: 80 + 2 − 1 = 81 activos. Puede haber tres inscritos y solo dos inicios esta semana. La tercera venta no crea un cupo ni aumenta los activos antes del inicio. Las tasas son hipótesis. Vencidas queda pendiente de verificación con responsable y plazo; no se convierte en cero. Si cambia la capacidad, actualiza la previsión y solicita revisión antes de comprometerla."
      }
    ],
    "quiz": [
      {
        "pregunta": "Tres inscritos; solo dos inician esta semana; 80 activos y un retiro. ¿Qué previsión es consistente?",
        "opciones": [
          "82 activos porque hubo tres ventas",
          "83 activos sin descontar el retiro",
          "81 activos, sujeto a comprobar los dos inicios"
        ],
        "explicacion": "El balance usa inicios efectivos, no todas las inscripciones.",
        "repasa": [
          "estadistica-semanal"
        ]
      },
      {
        "pregunta": "Falta el saldo de una cuenta. ¿Cómo se informa?",
        "opciones": [
          "Pendiente con fuente, responsable y plazo de verificación",
          "Como cero",
          "Como cobrado"
        ],
        "explicacion": "Un faltante no demuestra ausencia de deuda ni un ingreso.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "Se vendieron USD 150 y se cobraron esos 150 más 150 de cartera antigua. ¿Cuánto efectivo entró?",
        "opciones": [
          "USD 450",
          "USD 300",
          "USD 150"
        ],
        "explicacion": "La venta y el cobro de esa misma venta no se suman dos veces.",
        "repasa": [
          "alineamiento-comercial"
        ]
      },
      {
        "pregunta": "No hay tasa histórica para proyectar matrículas. ¿Qué presentas?",
        "opciones": [
          "Una tasa inventada como dato real",
          "Una garantía de inscripciones",
          "Una hipótesis explícita que debe validarse con resultados"
        ],
        "explicacion": "La estimación se distingue del hecho observado y se contrasta al cierre.",
        "repasa": [
          "cuota-semanal"
        ]
      },
      {
        "pregunta": "El presupuesto atrae más familias de las que el centro puede atender. ¿Qué corriges?",
        "opciones": [
          "Capacidad, fechas y acciones antes de comprometer la cuota",
          "El color del gráfico",
          "El dato real para que parezca capacidad"
        ],
        "explicacion": "La entrega debe sostener la promesa comercial.",
        "repasa": [
          "capacidad-operativa"
        ]
      }
    ],
    "drills": [
      {
        "titulo": "Maniobra 1: sustentar cuotas y resolver una restricción",
        "fuente": "planificacion-aloha.md",
        "proposito": "Demostrar una planificación ejecutable y comprobar el resultado con evidencia.",
        "gradiente": "Primero ensaya en una hoja con los datos ficticios de la lección. Después realiza una tarea real autorizada de tu puesto con tu jefe entrenador presente. Si todavía no hay una tarea real válida, espera para ejecutarla y firmarla. La simulación y el cuestionario no autorizan la firma definitiva.",
        "masa": [
          "Una hoja con tu ejercicio y sus soportes.",
          "El procedimiento de esta unidad y una tarea real autorizada de tu puesto."
        ],
        "pasos": [
          "Resuelve el Centro Roble en una hoja sin copiar la previsión del Centro Escuela.",
          "Presenta una matriz de las seis áreas y cinco cuotas; señala dato faltante, fuente, hipótesis, moneda y capacidad.",
          "Explica qué cambia cuando una inscripción inicia después del corte; corrige la proyección de activos.",
          "Con tu jefe toma un cierre real autorizado: como Administradora prepara y guarda propuestas sustentadas; como coordinación revisa y aprueba solo las viables dentro de tus centros. Recarga y comprueba el estado real.",
          "Entrega el producto y la evidencia. Tu jefe entrenador observa la ejecución real, pide corregir cualquier omisión y firma solamente cuando se cumplen todos los criterios."
        ],
        "criterios": [
          "Distingue inscripción, inicio efectivo, saldo de cartera y efectivo recibido sin duplicarlos.",
          "Justifica las cuotas con período, fuente, capacidad y supuestos claramente identificados.",
          "Resuelve el faltante sin inventar datos y verifica su operación real autorizada."
        ],
        "errorTipico": "Confundir un documento escrito con una acción ejecutada. Cada resultado requiere evidencia y verificación."
      }
    ],
    "sop": {
      "proceso": "Preparar cuotas sustentadas y capacidad de entrega",
      "cuando": "Antes de proponer o revisar las cinco cuotas semanales.",
      "producto": "Cuotas viables con fuentes, acciones y soporte complementario.",
      "pasos": [
        "Fija centro, corte, ejecución y cobertura.",
        "Reúne captación, ventas, cartera, capacidad, calidad y responsables.",
        "Separa inscripción, inicio, factura y efectivo.",
        "Calcula conversiones observadas o etiqueta hipótesis.",
        "Comprueba cupos, fechas, coach y materiales.",
        "Documenta las cinco cuotas y sus justificaciones.",
        "La Administradora propone; coordinación revisa y aprueba.",
        "Contrasta resultado y cuota del mismo cierre."
      ],
      "decide": [
        {
          "situacion": "Dato faltante",
          "regla": "Identifica responsable y fecha; no registres cero."
        },
        {
          "situacion": "Capacidad insuficiente",
          "regla": "Ajusta fechas o recursos autorizados antes de comprometer el resultado."
        }
      ],
      "errores": [
        "Sumar ventas al efectivo que ya las contiene.",
        "Contar citas como asistentes o ventas futuras como activos actuales."
      ]
    }
  },
  {
    "id": "of-sem-5",
    "curso": "semana",
    "orden": 105,
    "roles": [
      "administradora",
      "coordinador"
    ],
    "requiere": [
      "of-sem-4"
    ],
    "duracionMin": 25,
    "titulo": "Reunión semanal y control diario",
    "fuente": [
      "planificacion-aloha.md"
    ],
    "palabras": [
      "acta-operativa",
      "control-diario",
      "dependencia",
      "evidencia",
      "cuota-semanal",
      "plan-de-batalla"
    ],
    "pfv": "Conduces una revisión que termina en acta, compromisos verificables y control diario de acciones y bloqueos.",
    "masa": [
      "Una hoja para el acta y otra para el control diario.",
      "Tu cuadro de cuotas y restricciones de la unidad anterior."
    ],
    "temario": [
      "Preparación de cada puesto",
      "Agenda de 45 minutos y acta combinada",
      "Control diario y traslado de pendientes",
      "Simulación de tres incidencias"
    ],
    "laminas": [
      {
        "titulo": "La reunión termina con decisiones",
        "texto": "Cada compromiso necesita acción, responsable, fecha, recursos y evidencia. El acta conserva quién verifica y qué está pendiente de aprobar."
      },
      {
        "titulo": "Dos momentos cada día",
        "items": [
          "Inicio: acciones de hoy y bloqueos.",
          "Cierre: resultado, evidencia y pendientes.",
          "Coordinación revisa dependencias; cada responsable ejecuta su parte."
        ]
      },
      {
        "titulo": "Un pendiente conserva su origen",
        "texto": "Reprogramar exige motivo y nueva fecha; no duplica la acción ni convierte el guardado en ejecución."
      }
    ],
    "voz": "Una reunión sirve si deja decisiones que se pueden ejecutar. <break time=\"0.4s\"/> Vamos a preparar los datos, revisar la condición y acordar el trabajo de la semana. <break time=\"0.4s\"/> Al final tendrás un acta con responsables, fechas, cuotas y bloqueos. <break time=\"0.4s\"/> Después viene el control diario: qué toca hoy, qué se logró y dónde está la evidencia. <break time=\"0.4s\"/> Guardar un objetivo no significa haberlo cumplido. <break time=\"0.4s\"/> En la maniobra vas a conducir una revisión y demostrar cómo das seguimiento a una tarea real.",
    "bloques": [
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Fuente y adaptación",
        "texto": "Base: Guía general del Consejo Asesor, p. 2; Ventas, pp. 4–6; Plan estratégico + programas, pp. 17–20. La agenda de 45 minutos y los formatos son una propuesta de trabajo adaptable al número de centros. No se ha creado una automatización de reuniones ni de envío de actas."
      },
      {
        "t": "sub",
        "texto": "Llega con la preparación hecha"
      },
      {
        "t": "tabla",
        "titulo": "Aporte de cada puesto",
        "encabezados": [
          "Puesto",
          "Antes de la reunión"
        ],
        "filas": [
          [
            "Asistente",
            "Reúne fuentes, fechas, soportes y diferencias de registros; identifica lo que falta."
          ],
          [
            "Administradora",
            "Presenta lectura del cierre, condición fundamentada, objetivos bajo cada paso, pendientes y cinco cuotas propuestas."
          ],
          [
            "Coach",
            "Entrega capacidad real, fechas de inicio posibles, asistencia e incidencias verificadas de sus grupos."
          ],
          [
            "Coordinación",
            "Revisa comparabilidad de períodos, disponibilidad de recursos y dependencias entre sus centros."
          ]
        ]
      },
      {
        "t": "sub",
        "texto": "Conduce una agenda de 45 minutos"
      },
      {
        "t": "tabla",
        "titulo": "Agenda propuesta",
        "encabezados": [
          "Tiempo",
          "Trabajo",
          "Salida"
        ],
        "filas": [
          [
            "10 minutos",
            "Revisar cierre anterior, cinco estadísticas, fuentes, cobertura y pendientes. Separar hechos de hipótesis.",
            "Datos comparables y faltantes con responsable."
          ],
          [
            "10 minutos",
            "Revisar condición, fórmula completa, ingreso, ventas, cobranza y entrega.",
            "Restricciones y diagnóstico explicado."
          ],
          [
            "20 minutos",
            "Acordar acciones y dependencias, responsables, fechas, recursos y cuotas de la nueva semana.",
            "Matriz semanal y propuestas revisables."
          ],
          [
            "5 minutos",
            "Leer decisiones del acta, estados de aprobación y quién verifica cada resultado.",
            "Compromisos entendidos y próxima revisión definida."
          ]
        ]
      },
      {
        "t": "p",
        "texto": "La Administradora presenta su plan; coordinación contrasta la evidencia y aprueba las cuotas cuando corresponda. La reunión no aprueba por sí sola un cambio de política o gasto fuera de autorización. Un dato ausente sigue identificado como pendiente. Deja un acta combinada con referencia a las fuentes, condición, objetivos, cuotas y decisiones. Guarda su enlace o ubicación autorizada; el entrenamiento no la genera ni distribuye automáticamente."
      },
      {
        "t": "sub",
        "texto": "Formato 6 · Acta combinada"
      },
      {
        "t": "tabla",
        "titulo": "Ejemplo completado · Centro Escuela ficticio",
        "encabezados": [
          "Campo",
          "Contenido"
        ],
        "filas": [
          [
            "Fecha, participantes y centro",
            "23-oct-2026 · Ana, Luis, Marta y Elena · Centro Escuela (ficticios)."
          ],
          [
            "Cortes y fuentes consultadas",
            "Cierre 22-oct; serie de cuatro cierres, registros de prueba, capacidad y cartera de la ficha."
          ],
          [
            "Condición, fundamento y decisiones",
            "Emergencia didáctica; recuperar seguimiento y asegurar entrega; ejecutar los cinco pasos en orden."
          ],
          [
            "Acciones, responsables, fechas y verificador",
            "Ana confirma 13 citas el 23; Marta prepara 3 cupos el 26; Elena verifica registros y dependencias. Matriz semanal vinculada."
          ],
          [
            "Cuotas propuestas/aprobadas",
            "Para 29-oct: activos 102, inscritos 3, retiros máximo 1, vencidas máximo 10, pruebas asistidas 10; Elena aprueba en simulación el 23-oct."
          ],
          [
            "Recursos, pendientes y bloqueos",
            "Tres cupos confirmados; Luis documenta cartera por antigüedad el 23-oct; falta un soporte de cobro, con revisión asignada."
          ],
          [
            "Ubicación y próxima revisión",
            "Carpeta autorizada del ejercicio / acta-Escuela-23oct; control diario al cierre y revisión del resultado el 30-oct. Hora por acordar."
          ]
        ]
      },
      {
        "t": "tabla",
        "titulo": "Tu ejercicio · copia y completa una ficha por caso",
        "encabezados": [
          "Campo",
          "Completar"
        ],
        "filas": [
          [
            "Fecha, participantes y centro",
            "________________________________________________"
          ],
          [
            "Cortes y fuentes consultadas",
            "________________________________________________"
          ],
          [
            "Condición, fundamento y decisiones",
            "________________________________________________"
          ],
          [
            "Acciones, responsables, fechas y verificador",
            "________________________________________________"
          ],
          [
            "Cuotas propuestas/aprobadas",
            "________________________________________________"
          ],
          [
            "Recursos, pendientes y bloqueos",
            "________________________________________________"
          ],
          [
            "Ubicación y próxima revisión",
            "________________________________________________"
          ]
        ]
      },
      {
        "t": "sub",
        "texto": "Haz el control diario y conserva la trazabilidad"
      },
      {
        "t": "pasos",
        "items": [
          "Al iniciar la jornada, cada responsable identifica sus acciones de hoy, dependencias y recursos faltantes.",
          "Durante la ejecución, conserva el soporte en la ubicación autorizada y relaciona cada evidencia con su objetivo.",
          "Al cierre, registra resultado real, evidencia obtenida y estado: realizado, verificado o bloqueado.",
          "Coordinación revisa compromisos vencidos y dependencias; acuerda resolución, responsable y nueva fecha cuando haga falta.",
          "Al cierre semanal compara con la cuota aprobada de ese mismo período. Conserva el origen de cada pendiente al pasarlo al siguiente plan; no dupliques la acción ni cambies de condición para ocultarlo."
        ]
      },
      {
        "t": "sub",
        "texto": "Formato 5 · Control diario"
      },
      {
        "t": "tabla",
        "titulo": "Ejemplo completado · Centro Escuela ficticio",
        "encabezados": [
          "Campo",
          "Contenido"
        ],
        "filas": [
          [
            "Fecha, objetivo vinculado y centro",
            "27-oct-2026 · paso 5 / control de compromisos · Centro Escuela."
          ],
          [
            "Acción de hoy y responsable",
            "Ana contrasta cada compromiso vencido con su evidencia y registra la diferencia."
          ],
          [
            "Resultado al cierre y evidencia",
            "Tres compromisos revisados; dos comprobados y uno pendiente; registro D27 con referencias (ficticio)."
          ],
          [
            "Bloqueo y resolución",
            "Falta soporte de un acuerdo de cobro. Luis lo verifica el 28-oct; no se declara cobrado."
          ],
          [
            "Revisión y nueva fecha con motivo",
            "Elena revisa D27; mantiene el origen del compromiso y registra motivo del cambio, sin duplicar la acción."
          ]
        ]
      },
      {
        "t": "tabla",
        "titulo": "Tu ejercicio · copia y completa una ficha por caso",
        "encabezados": [
          "Campo",
          "Completar"
        ],
        "filas": [
          [
            "Fecha, objetivo vinculado y centro",
            "________________________________________________"
          ],
          [
            "Acción de hoy y responsable",
            "________________________________________________"
          ],
          [
            "Resultado al cierre y evidencia",
            "________________________________________________"
          ],
          [
            "Bloqueo y resolución",
            "________________________________________________"
          ],
          [
            "Revisión y nueva fecha con motivo",
            "________________________________________________"
          ]
        ]
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "El seguimiento tiene dos soportes",
        "texto": "KPI conserva condición, objetivos, cuotas y estados que permite tu puesto. El acta y el control diario de este curso se completan en una hoja o documento autorizado y se referencian en el seguimiento. Las horas del control se acuerdan con el equipo; aquí no se programan recordatorios."
      },
      {
        "t": "sub",
        "texto": "Simulación con tres incidencias"
      },
      {
        "t": "p",
        "texto": "Usa el Centro Roble de la unidad anterior. En la reunión faltan los soportes de vencidas; una cuota está propuesta pero no aprobada; y un inicio depende de materiales no recibidos. Prepara el acta y el control del día: asigna quién verifica el dato y para cuándo, deja el estado de aprobación real y registra el bloqueo con la persona capaz de resolverlo. Decide qué acciones pueden continuar y cuáles deben esperar. Lee el acta al equipo simulado para comprobar que no haya dos responsables suponiendo que el otro ejecutará."
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Comprobación del ejercicio",
        "texto": "El acta debe conservar el dato pendiente sin poner cero, la cuota propuesta sin decir aprobada y el inicio bloqueado sin decir realizado. Debe indicar responsable, plazo, verificador y ubicación de la evidencia para las tres incidencias. Un motivo sin acción o una fecha sin responsable dejan el acuerdo incompleto."
      }
    ],
    "quiz": [
      {
        "pregunta": "La reunión termina con una cuota propuesta, todavía sin aprobación. ¿Qué dice el acta?",
        "opciones": [
          "Que quedó aprobada por conversar sobre ella",
          "Que sigue propuesta, con responsable de revisión",
          "Que ya se cumplió"
        ],
        "explicacion": "El acta refleja el estado real y quién debe completar la decisión.",
        "repasa": [
          "acta-operativa"
        ]
      },
      {
        "pregunta": "Un compromiso venció por material faltante. ¿Cómo continúa?",
        "opciones": [
          "Se elimina para ocultarlo",
          "Se copia como otra acción sin origen",
          "Se conserva su origen, bloqueo, responsable y nueva fecha justificada"
        ],
        "explicacion": "El seguimiento debe permitir reconstruir lo sucedido sin duplicar trabajo.",
        "repasa": [
          "control-diario"
        ]
      },
      {
        "pregunta": "¿Qué demuestra que una acción se realizó?",
        "opciones": [
          "Resultado observable y evidencia verificada",
          "Que se escribió en el plan",
          "Que alguien prometió hacerla"
        ],
        "explicacion": "El guardado y la promesa no prueban ejecución.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿Qué hace coordinación en el control diario?",
        "opciones": [
          "Ejecuta todo por los demás",
          "Revisa dependencias y vencidos sin sustituir al responsable",
          "Cambia los resultados para completar las cuotas"
        ],
        "explicacion": "Coordinar permite resolver restricciones; cada responsable conserva su trabajo.",
        "repasa": [
          "dependencia"
        ]
      },
      {
        "pregunta": "¿Qué período se compara al cerrar?",
        "opciones": [
          "Cualquier semana con cuota baja",
          "El mes que dé mejor resultado",
          "El resultado y las cuotas aprobadas de la misma semana"
        ],
        "explicacion": "Mezclar períodos elimina la validez de la comparación.",
        "repasa": [
          "cuota-semanal"
        ]
      }
    ],
    "drills": [
      {
        "titulo": "Maniobra 1: reunión, acta y control de un compromiso",
        "fuente": "planificacion-aloha.md",
        "proposito": "Demostrar una planificación ejecutable y comprobar el resultado con evidencia.",
        "gradiente": "Primero ensaya en una hoja con los datos ficticios de la lección. Después realiza una tarea real autorizada de tu puesto con tu jefe entrenador presente. Si todavía no hay una tarea real válida, espera para ejecutarla y firmarla. La simulación y el cuestionario no autorizan la firma definitiva.",
        "masa": [
          "Una hoja con tu ejercicio y sus soportes.",
          "El procedimiento de esta unidad y una tarea real autorizada de tu puesto."
        ],
        "pasos": [
          "Simula la agenda de 45 minutos y resuelve las tres incidencias del Centro Roble.",
          "Completa el acta y control diario; lee decisiones, responsables, fechas, estados y verificadores.",
          "Con tu jefe selecciona una revisión real autorizada de tu centro o centros asignados. Conduce el tramo que corresponde a tu puesto y documenta acuerdos.",
          "Da seguimiento a una acción real: verifica resultado y soporte, o registra un bloqueo real con resolución asignada. Guarda el acta en la ubicación autorizada y comprueba que quien debe revisarla pueda consultarla.",
          "Entrega el producto y la evidencia. Tu jefe entrenador observa la ejecución real, pide corregir cualquier omisión y firma solamente cuando se cumplen todos los criterios."
        ],
        "criterios": [
          "Produce un acta con decisiones, responsables, fechas, aprobación y evidencia claramente identificados.",
          "Resuelve las tres incidencias sin inventar datos ni declarar ejecución inexistente.",
          "Demuestra seguimiento real de un compromiso con resultado o bloqueo verificable."
        ],
        "errorTipico": "Confundir un documento escrito con una acción ejecutada. Cada resultado requiere evidencia y verificación."
      }
    ],
    "sop": {
      "proceso": "Conducir la revisión y el control diario",
      "cuando": "Al preparar la reunión semanal y seguir sus acuerdos.",
      "producto": "Acta y compromisos con resultado o bloqueo comprobable.",
      "pasos": [
        "Reúne soportes, cierre, capacidad y cinco propuestas.",
        "Revisa datos y pendientes durante 10 minutos.",
        "Revisa condición, fórmula y restricciones durante 10 minutos.",
        "Acuerda acciones, responsables, fechas y cuotas durante 20 minutos.",
        "Lee y valida el acta durante 5 minutos.",
        "Registra ubicación, aprobaciones pendientes y próxima revisión.",
        "Cada día identifica acciones al iniciar y evidencia al cerrar.",
        "Al cierre semanal conserva el origen de pendientes sin duplicarlos."
      ],
      "decide": [
        {
          "situacion": "Falta aprobación o recurso",
          "regla": "Mantén el estado real y asigna quién resuelve y para cuándo."
        },
        {
          "situacion": "No hay evidencia",
          "regla": "No declares realizado; pide comprobación del responsable."
        }
      ],
      "errores": [
        "Dar por ejecutado un objetivo porque quedó escrito.",
        "Comparar cuotas y resultados de semanas diferentes."
      ]
    }
  },
  {
    "id": "of-sem-6",
    "curso": "semana",
    "orden": 106,
    "roles": [
      "administradora",
      "coordinador"
    ],
    "requiere": [
      "of-sem-5"
    ],
    "requierePorRol": {
      "administradora": [
        "of-sem-adm"
      ],
      "coordinador": [
        "of-sem-cop"
      ]
    },
    "duracionMin": 30,
    "titulo": "Caso integral y preparación del primer ciclo",
    "fuente": [
      "planificacion-aloha.md",
      "lib/condiciones/formulas.mjs",
      "lib/reunion-semanal.mjs"
    ],
    "palabras": [
      "programa-operativo",
      "proyecto",
      "capacidad-operativa",
      "plan-de-batalla",
      "cuota-semanal",
      "evidencia"
    ],
    "pfv": "Entregas un plan completo, acta y control diario; explicas las cinco cuotas y demuestras una ejecución real autorizada ante tu jefe.",
    "masa": [
      "Una hoja y tus formatos de estrategia, proyecto, cuotas, acta y control diario.",
      "Tus notas y procedimiento de la práctica de tu puesto."
    ],
    "temario": [
      "Cierre de referencia y semana de ejecución",
      "Caso resuelto con fórmula completa",
      "Cinco cuotas, efectivo y capacidad",
      "Cierre del caso y evaluación de otro centro"
    ],
    "laminas": [
      {
        "titulo": "Un caso completo, paso por paso",
        "texto": "Fuente y cierre → condición fundamentada → fórmula completa → acciones → cinco cuotas → reunión → control diario → resultado verificado."
      },
      {
        "titulo": "Matrícula no equivale a inicio",
        "texto": "Con 100 activos, tres inicios y un retiro, cierras en 102. Si un niño inicia en noviembre, el cierre de octubre queda en 101."
      },
      {
        "titulo": "La firma exige ejecución",
        "items": [
          "El caso ficticio se resuelve en una hoja.",
          "El cuestionario comprueba decisiones.",
          "La maniobra final necesita trabajo real autorizado y observado."
        ]
      }
    ],
    "voz": "Ahora vamos a reunir todo. <break time=\"0.4s\"/> El Centro Escuela es ficticio, y todas sus cifras sirven para practicar. <break time=\"0.4s\"/> Vas a recorrer una meta, un programa y los cinco pasos de Emergencia convertidos en acciones. <break time=\"0.4s\"/> Veremos cómo la fecha de inicio cambia los activos y cómo se comprueba el cierre. <break time=\"0.4s\"/> Después resolverás otro caso por tu cuenta. <break time=\"0.4s\"/> Para la firma final, tu jefe entrenador debe observar una tarea real autorizada. El ejemplo no se carga en producción.",
    "bloques": [
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Fuentes y naturaleza del caso",
        "texto": "Base: Plan estratégico + programas, pp. 7–22; Las fórmulas de las condiciones, p. 1 (Emergencia); Estadísticas: definiciones, pp. 1–13; Guía general, p. 2. La fórmula oficial se muestra desde la misma fuente del módulo de condiciones. Personas, precios, conversiones, resultados y autorizaciones del caso son ficticios; no son asignaciones a colaboradores reales."
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Calendario del primer ciclo",
        "texto": AVISO_PRIMER_CICLO
      },
      {
        "t": "sub",
        "texto": "Ficha previa · Centro Escuela"
      },
      {
        "t": "p",
        "texto": "Ana es la Administradora, Luis la Asistente, Marta la Coach y Elena la Coordinadora. El cierre del 22-oct registra 100 activos. Los cuatro cierres ficticios son 112 → 108 → 104 → 100. El caso aporta fallas de seguimiento a familias y capacidad disponible sin ocupar. Emergencia es el diagnóstico didáctico tras revisar esa información; cuatro números por sí solos no asignan una condición automáticamente."
      },
      {
        "t": "p",
        "texto": "Meta: 108 activos al 19-nov, cuatro semanas con saldo neto de dos. Estrategia: recuperar seguimiento comercial y asegurar entrega, sosteniendo retención. Programa: Recuperar entradas y continuidad. Proyecto del 23–29 oct: diez asistentes a prueba, tres inscripciones con inicio dentro del período y como máximo un retiro. La ficha confirma tres cupos en E1, coach habilitado, horario y materiales; Gerencia autoriza en el caso los recursos y retirar una compra duplicada dentro del límite asignado. Esa autorización ficticia no permite modificar un gasto real."
      },
      {
        "t": "tabla",
        "titulo": "Hipótesis del caso: deben comprobarse",
        "encabezados": [
          "Dato",
          "Previsión pedagógica"
        ],
        "filas": [
          [
            "Embudo comercial",
            "26 oportunidades × 50% = 13 citas; 13 × 80% ≈ 10 asistentes; 10 × 30% = 3 inscritos. Son objetivos enteros, no resultados garantizados."
          ],
          [
            "Activos",
            "100 + 3 inicios efectivos − 1 retiro = 102; los tres inicios están previstos dentro del 23–29 oct."
          ],
          [
            "Venta y efectivo en USD",
            "Tres matrículas ficticias a USD 50 = USD 150 vendidos; USD 150 cobrados de esas matrículas + USD 150 de cartera anterior = USD 300 de efectivo previsto. No son precios ALOHA."
          ]
        ]
      },
      {
        "t": "sub",
        "texto": "Fórmula oficial de Emergencia"
      },
      {
        "t": "pasos",
        "formula": "emergencia",
        "items": FORMULAS.emergencia
      },
      {
        "t": "sub",
        "texto": "Traduce cada paso sin cambiar su orden"
      },
      {
        "t": "tabla",
        "titulo": "Plan resuelto · una acción por fila",
        "encabezados": [
          "Paso / origen",
          "Acción",
          "Responsable y fecha",
          "Dependencia / evidencia"
        ],
        "filas": [
          [
            "1 · Fórmula",
            "Confirmar las 13 citas de prueba previstas del conjunto autorizado de oportunidades.",
            "Ana · 23-oct",
            "Registro de respuestas, citas y fechas."
          ],
          [
            "2 · Fórmula",
            "Implantar el seguimiento por etapa acordado para las oportunidades del caso.",
            "Ana · 24-oct",
            "Después de paso 1; agenda aplicada y muestra de registros."
          ],
          [
            "3 · Fórmula",
            "Retirar del presupuesto la compra duplicada identificada.",
            "Ana · 24-oct",
            "Después de paso 2; autorización ficticia y presupuesto antes/después."
          ],
          [
            "4 · Fórmula",
            "Preparar los tres cupos aprobados con grupo, materiales y coach.",
            "Marta · 26-oct",
            "Después de pasos 1–3 y antes de inicios; lista de preparación comprobada."
          ],
          [
            "5 · Fórmula",
            "Aplicar el control diario de compromisos y evidencia.",
            "Ana · desde 27-oct",
            "Después de preparación; registro diario revisado por Elena."
          ],
          [
            "Apoyo al programa",
            "Documentar cartera, vencimientos, moneda y acuerdos del caso.",
            "Luis · 23-oct",
            "Relación por cuenta, antigüedad y soporte; no sustituye pasos de fórmula."
          ],
          [
            "Apoyo al programa",
            "Relacionar cada inscripción con su fecha efectiva de inicio.",
            "Ana · 28-oct",
            "Registro individual fechado; no contar inicio futuro como activo."
          ],
          [
            "Apoyo al programa",
            "Verificar asistencia e incidencias de los inicios previstos.",
            "Marta · 29-oct",
            "Lista de clase y reporte de hechos."
          ],
          [
            "Revisión de cuotas",
            "Revisar y aprobar las cinco propuestas viables del período.",
            "Elena · 23-oct",
            "Capacidad y fundamentos comprobados; estado aprobado solo en simulación."
          ]
        ]
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Si una acción no se puede ejecutar",
        "texto": "Registra la dependencia y pide revisión. No omitas un paso de la fórmula ni lo marques cumplido sin producirlo. La confirmación previa de recursos hace viable la secuencia; la preparación efectiva de entrega ocurre en el paso 4. Trabajo de apoyo y control ordinario no sustituyen la fórmula."
      },
      {
        "t": "sub",
        "texto": "Formato 3 · Matriz semanal (una fila por acción)"
      },
      {
        "t": "tabla",
        "titulo": "Ejemplo completado · Centro Escuela ficticio",
        "encabezados": [
          "Campo",
          "Contenido"
        ],
        "filas": [
          [
            "Centro, cierre de referencia y ejecución",
            "Centro Escuela · cierre 22-oct-2026 · ejecución 23–29 oct."
          ],
          [
            "Condición, variante y fundamento",
            "Emergencia, sin variante; descenso sostenido contrastado con fallas de seguimiento descritas en el caso."
          ],
          [
            "Origen y acción única",
            "Fórmula, paso 4; preparar los tres cupos aprobados en el grupo E1."
          ],
          [
            "Responsable nombrado y fecha",
            "Marta · 26-oct-2026, antes de los inicios."
          ],
          [
            "Recursos y dependencia",
            "Coach, grupo, materiales y horario; después de los pasos 1–3 del ejemplo."
          ],
          [
            "Evidencia esperada y obtenida",
            "Esperada: lista de preparación; obtenida: lista E1 del 26-oct firmada por Marta (ficticia)."
          ],
          [
            "Estado y verificación",
            "Realizado y verificado por Elena el 26-oct en el caso. Si falta material: bloqueado, con responsable y resolución pendiente."
          ]
        ]
      },
      {
        "t": "tabla",
        "titulo": "Tu ejercicio · copia y completa una ficha por caso",
        "encabezados": [
          "Campo",
          "Completar"
        ],
        "filas": [
          [
            "Centro, cierre de referencia y ejecución",
            "________________________________________________"
          ],
          [
            "Condición, variante y fundamento",
            "________________________________________________"
          ],
          [
            "Origen y acción única",
            "________________________________________________"
          ],
          [
            "Responsable nombrado y fecha",
            "________________________________________________"
          ],
          [
            "Recursos y dependencia",
            "________________________________________________"
          ],
          [
            "Evidencia esperada y obtenida",
            "________________________________________________"
          ],
          [
            "Estado y verificación",
            "________________________________________________"
          ]
        ]
      },
      {
        "t": "tabla",
        "titulo": "Cinco cuotas resueltas para el cierre del 29-oct",
        "encabezados": [
          "Estadística",
          "Propuesta",
          "Sentido y fundamento"
        ],
        "filas": [
          [
            "Niños activos",
            "102",
            "Directa; 100 + 3 inicios efectivos − 1 retiro."
          ],
          [
            "Nuevos inscritos",
            "3",
            "Directa; tres primeras inscripciones válidas."
          ],
          [
            "Retiros",
            "Máximo 1",
            "Inversa; no incluye graduados."
          ],
          [
            "Facturas de mensualidad vencidas",
            "Máximo 10",
            "Inversa; referencia ficticia de 12, cerrar dos por pago completo; sin nuevas vencidas en el caso. No es monto."
          ],
          [
            "Pruebas asistidas",
            "10",
            "Directa; asistencia efectiva a pruebas realizadas."
          ]
        ]
      },
      {
        "t": "p",
        "texto": "Completa el programa y proyecto de U3, las cinco fichas de cuota de U4 y el acta y control diario de U5 usando estos datos. Para el ejemplo monetario, la cartera anterior cobrada es USD 150: dos facturas ficticias de USD 75 quedan pagadas por completo. Solo con esas condiciones, y sin nuevas vencidas, la cantidad pasa de 12 a 10. Un abono que no cierre una factura puede bajar la deuda sin bajar la cantidad de facturas vencidas."
      },
      {
        "t": "sub",
        "texto": "Ficha de resultados del 29-oct · simulación separada del plan"
      },
      {
        "t": "tabla",
        "titulo": "Resultado ficticio observado para comparar",
        "encabezados": [
          "Producto",
          "Resultado y evidencia del caso",
          "Comparación"
        ],
        "filas": [
          [
            "Pruebas",
            "Registro de 10 asistentes efectivos a clases realizadas.",
            "10 de 10; cumplida."
          ],
          [
            "Inscripciones / inicios",
            "Tres registros nuevos, con inicios efectivos 27, 28 y 29-oct.",
            "3 inscritos; los tres aumentan activos en el período."
          ],
          [
            "Retiros / activos",
            "Un retiro operativo, sin graduados ni reincorporaciones; 100 + 3 − 1 = 102.",
            "Retiros 1 y activos 102; ambas cuotas cumplidas."
          ],
          [
            "Vencidas / dinero",
            "Dos facturas de USD 75 cerradas; 10 siguen vencidas. Recibos de matrículas USD 150 + cartera USD 150.",
            "Vencidas 10; entradas USD 300; no sumar la venta otra vez."
          ],
          [
            "Plan y pendientes",
            "Pasos 1–5 con soportes del caso; un soporte complementario de acuerdo sigue pendiente de Luis.",
            "Conserva ese origen y fecha de resolución en la siguiente revisión."
          ]
        ]
      },
      {
        "t": "p",
        "texto": "La ficha ficticia afirma que Elena aprobó las cinco cuotas el 23-oct. Por ello, al comprobar este cierre exacto, las cinco resultan aprobadas y cumplidas. Eso no firma ninguna maniobra humana. Aprendizaje del caso: contrastar conversiones con resultados y asegurar capacidad antes de prometer inicios; revisar el soporte pendiente sin ocultarlo."
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Variante: un niño inicia el 2-nov",
        "texto": "Mantén las tres inscripciones y la venta, pero cuenta solo dos inicios al 29-oct: 100 + 2 − 1 = 101 activos. La cuota 102 no se cumplió. No corresponde reconocimiento de cinco de cinco aunque las otras cuatro sí. Registra la causa y ajusta el siguiente plan con la fecha real; no adelantes el inicio para hacer coincidir la cuota."
      },
      {
        "t": "sub",
        "texto": "Evaluación independiente · Centro Puente"
      },
      {
        "t": "p",
        "texto": "Caso ficticio distinto: al 22-oct hay 90 activos; cuatro cierres 93, 92, 91, 90. Hay 18 oportunidades, 9 citas confirmadas, objetivo de 6 asistentes y 3 inscritos; solo dos cupos con inicio dentro del 23–29 oct y uno disponible el 2-nov. Se prevé un retiro operativo; no hay graduados ni reincorporaciones. El extracto de vencidas no llegó. No hay tasas históricas de conversión. Se autoriza solo el presupuesto ya asignado del caso. Tu meta propuesta es 94 activos en cuatro semanas; debes explicar si es viable y qué verificarías."
      },
      {
        "t": "pasos",
        "items": [
          "Sin copiar el caso resuelto, prepara estrategia/programa y proyecto con recursos y tipos de objetivo. Fundamenta una condición; si falta evidencia para asignarla, identifica lo que debes verificar.",
          "Traduce todos los pasos de la fórmula elegida en acciones con responsable, fecha, dependencias y evidencia.",
          "Prepara las cinco cuotas: justifica activos por inicios, reconoce hipótesis y deja vencidas pendiente hasta verificar el soporte.",
          "Completa acta y control diario; incluye cómo resolver el recurso faltante o el inicio futuro.",
          "Presenta tu plan al jefe entrenador. Él cambia una fecha de inicio y te pide recalcular y explicar las consecuencias.",
          "Después ejecuta una tarea real autorizada de tu puesto; el jefe observa su resultado y evidencia antes de firmar. No cargues el Centro Puente ni el Centro Escuela en producción."
        ]
      },
      {
        "t": "nota",
        "tono": "ojo",
        "titulo": "Criterio de evaluación",
        "texto": "La proyección base es 90 + 2 − 1 = 91 activos; tres inscritos pueden coexistir con solo dos inicios. Vencidas permanece sin dato hasta obtener soporte. No hay cinco cuotas aprobadas completas ni reconocimiento mientras falte una. El jefe evalúa coherencia del programa, fórmula completa, roles, fechas, capacidad, evidencia y seguimiento; no basta acertar esta cifra."
      }
    ],
    "quiz": [
      {
        "pregunta": "El primer plan usa cierre del 22-oct. ¿A qué semana corresponden sus cuotas?",
        "opciones": [
          "Al cierre anterior del 15-oct",
          "A la ejecución del 23–29 oct, cierre 29-oct",
          "A cualquier semana de octubre"
        ],
        "explicacion": "Cierre de referencia y cierre de ejecución son distintos.",
        "repasa": [
          "plan-de-batalla"
        ]
      },
      {
        "pregunta": "Un niño inscrito inicia el 2-nov. Con 100 activos, otros dos inicios y un retiro, ¿cómo cierra el 29-oct?",
        "opciones": [
          "102 activos y cinco de cinco",
          "103 activos",
          "101 activos; la inscripción no se borra"
        ],
        "explicacion": "El inicio futuro conserva la venta pero no aumenta aún los activos.",
        "repasa": [
          "cuota-semanal"
        ]
      },
      {
        "pregunta": "La compra duplicada del ejemplo se puede retirar. ¿Eso autoriza un gasto real?",
        "opciones": [
          "No; la autorización solo pertenece al caso ficticio",
          "Sí, en cualquier centro",
          "Sí, si se escucha el audio"
        ],
        "explicacion": "Un ejercicio no cambia la autoridad operativa ni los límites de gasto.",
        "repasa": [
          "evidencia"
        ]
      },
      {
        "pregunta": "¿Qué debe hacer el alumno si falta soporte para vencidas?",
        "opciones": [
          "Proponer cero y aprobar",
          "Conseguir evidencia con responsable y plazo, manteniendo pendiente la decisión",
          "Copiar la cifra de otro centro"
        ],
        "explicacion": "La trazabilidad del faltante es parte del resultado del entrenamiento.",
        "repasa": [
          "capacidad-operativa"
        ]
      },
      {
        "pregunta": "¿Cuándo se firma la maniobra final?",
        "opciones": [
          "Después de ver las láminas",
          "Al aprobar cuatro preguntas",
          "Después de una ejecución real autorizada, observada y verificada por el jefe"
        ],
        "explicacion": "Estudio y simulación no sustituyen la demostración real.",
        "repasa": [
          "evidencia"
        ]
      }
    ],
    "drills": [
      {
        "titulo": "Maniobra 1: plan integral y ejecución observada",
        "fuente": "planificacion-aloha.md",
        "proposito": "Demostrar una planificación ejecutable y comprobar el resultado con evidencia.",
        "gradiente": "Primero ensaya en una hoja con los datos ficticios de la lección. Después realiza una tarea real autorizada de tu puesto con tu jefe entrenador presente. Si todavía no hay una tarea real válida, espera para ejecutarla y firmarla. La simulación y el cuestionario no autorizan la firma definitiva.",
        "masa": [
          "Una hoja con tu ejercicio y sus soportes.",
          "El procedimiento de esta unidad y una tarea real autorizada de tu puesto."
        ],
        "pasos": [
          "Resuelve el Centro Puente en una hoja con los seis formatos y cinco cuotas sustentadas.",
          "Presenta condición fundamentada, fórmula completa y una acción por paso; marca fuentes, faltantes, roles, fechas y recursos.",
          "El jefe cambia una fecha de inicio: recalcula activos y explica qué ocurre con la venta y el reconocimiento.",
          "Simula la reunión y el control diario; conserva las decisiones pendientes sin inventar aprobaciones.",
          "Con tu jefe selecciona una tarea real autorizada de tu puesto y ejecuta tu parte del plan: Administradora prepara o actualiza su plan con soporte; coordinación revisa y aprueba cuotas reales viables. Guarda y recarga para comprobar el resultado persistido.",
          "Contrasta la evidencia de ejecución con el objetivo y documenta resultado o bloqueo real en el seguimiento autorizado.",
          "Entrega el producto y la evidencia. Tu jefe entrenador observa la ejecución real, pide corregir cualquier omisión y firma solamente cuando se cumplen todos los criterios."
        ],
        "criterios": [
          "Entrega los seis formatos coherentes, con fórmula completa y las cinco cuotas fundamentadas.",
          "Recalcula correctamente el inicio futuro y mantiene identificados datos y aprobaciones pendientes.",
          "Ejecuta trabajo real de su puesto, comprueba persistencia y entrega evidencia al jefe."
        ],
        "errorTipico": "Confundir un documento escrito con una acción ejecutada. Cada resultado requiere evidencia y verificación."
      }
    ],
    "sop": {
      "proceso": "Preparar y verificar el plan integral",
      "cuando": "En el primer ciclo y al revisar planes semanales posteriores.",
      "producto": "Plan, cuotas, acta y control diario con ejecución verificable.",
      "pasos": [
        "Identifica cierre de referencia y período posterior de ejecución.",
        "Contrasta fuentes, cobertura, tendencia y capacidad.",
        "Fundamenta condición y conserva su fórmula completa.",
        "Relaciona meta, programa y proyecto con acciones semanales.",
        "Escribe una acción por paso con responsable, fecha y evidencia.",
        "Calcula cinco cuotas según inicios, flujos y sentidos.",
        "La Administradora guarda plan y propuestas; coordinación revisa y aprueba cuotas viables.",
        "Documenta reunión, bloqueos y control diario en los formatos autorizados.",
        "Al cierre compara el mismo período y conserva origen de pendientes.",
        "Demuestra una tarea real autorizada para la firma del jefe."
      ],
      "decide": [
        {
          "situacion": "Inicio fuera del período",
          "regla": "Conserva la inscripción; cuenta el activo desde el inicio efectivo."
        },
        {
          "situacion": "Falta dato o evidencia",
          "regla": "Asigna verificación y deja pendiente; no inventes ni firmes ejecución."
        }
      ],
      "errores": [
        "Cargar el ejemplo ficticio en un centro real.",
        "Confundir cuestionario aprobado con maniobra firmada."
      ]
    }
  }
]
