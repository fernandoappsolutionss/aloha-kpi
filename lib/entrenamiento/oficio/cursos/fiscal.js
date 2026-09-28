// Curso `fiscal` — materia fiscal de Venezuela para la Administradora y la
// Asistente de ALOHA LOS NARANJOS. Ningún centro de Panamá declara ante el
// SENIAT: por eso los dos módulos llevan `centros`, y planDeRol() los deja
// fuera del plan de cualquier otro centro (lib/entrenamiento/oficio/progreso.js).
//
// Fuente ÚNICA: la carta de la Lic. Siole Valderrama a la Junta Directiva de
// FF Soluciones Integrales 2024 C.A. (Los Naranjos, 25 de agosto de 2026). El
// .docx original viaja con el módulo como material descargable
// (lib/entrenamiento/material/, servido con sesión por
// app/api/entrenamiento/fiscal/documento/route.js). Lo que la carta no dice,
// estos módulos no lo afirman: las fechas exactas son "según calendario".
//
// Sin maniobra a propósito: quien firmaría a la Administradora es el
// Coordinador, y la revisión de planes ajenos no filtra por centro.
// ponytail: agregar `drills` cuando alguien del centro (la contadora o la
// Administradora) vaya a firmarlos, y pasar el centro a planesDeRevision().

import { isMaster } from '../../../current-user.mjs'

export const CENTRO_LOS_NARANJOS = 10 // centros.id de LOS NARANJOS (lib/zoho-cobranza.mjs)

// Quién descarga la carta (app/api/entrenamiento/fiscal/documento): gerencia, o
// quien pertenece a Los Naranjos (centro propio o coordinado).
export function puedeVerMaterialFiscal(u) {
  if (!u) return false
  if (isMaster(u)) return true
  return Number(u.centro_id) === CENTRO_LOS_NARANJOS || (u.centros || []).map(Number).includes(CENTRO_LOS_NARANJOS)
}

const CARTA = {
  titulo: 'Carta de la contadora: Información fiscal FF Soluciones (Word, para descargar)',
  href: '/api/entrenamiento/fiscal/documento',
}

const FUENTE = 'lib/entrenamiento/material/informacion-fiscal-ff-soluciones.docx'

export const FISCAL = [
  {
    id: 'of-fis-1',
    curso: 'fiscal',
    orden: 40,
    roles: ['administradora', 'asistente'],
    centros: [CENTRO_LOS_NARANJOS],
    titulo: 'Deberes formales: cada bolívar con su soporte',
    duracionMin: 15,
    requiere: ['of-nor-9'],
    fuente: [`${FUENTE}#puntos-1-3`],

    pfv: 'Cada movimiento del banco de la quincena con su soporte: la venta con su depósito, el gasto con su factura fiscal y la publicidad de redes con su IVA identificado, listo para que la contadora declare sin huecos.',

    voz: 'Este módulo es solo para Los Naranjos. <break time="0.4s"/> La empresa que opera el Centro es contribuyente especial ante el SENIAT. <break time="0.4s"/> Eso quiere decir que la miran más de cerca, y que cada bolívar necesita su papel. <break time="0.5s"/> La contadora lo dejó por escrito en tres puntos. <break time="0.3s"/> Uno: el banco cuadra contra las ventas y contra las compras. <break time="0.4s"/> Dos: la publicidad de Facebook e Instagram paga IVA, y se declara. <break time="0.4s"/> Tres: la franquicia y los Coach entregan factura por todo lo que cobran. <break time="0.5s"/> Lo que no tiene factura no se puede registrar. <break time="0.3s"/> Es dinero que salió del banco y que para la contabilidad no existe. <break time="0.5s"/> Tu trabajo es que ese hueco no aparezca.',

    laminas: [
      {
        kicker: 'Por qué',
        titulo: 'FF es contribuyente especial',
        texto: 'El SENIAT vigila más de cerca a la empresa que opera Los Naranjos. Por eso declara casi todo por quincena y le pide soporte a cada movimiento.',
      },
      {
        kicker: 'Punto uno',
        titulo: 'El banco cuadra contra ventas y compras',
        items: [
          'Cada depósito, con su venta.',
          'Cada egreso, con su compra o servicio.',
          'Bolívares siempre; divisa cuando la hay.',
        ],
      },
      {
        kicker: 'Punto dos',
        titulo: 'La publicidad de redes paga IVA',
        texto: 'Facebook, Instagram, TikTok: IVA del 16 % a la alícuota general, declarado en la casilla 11 como importación gravada.',
        cierre: 'Hasta la carta, esas facturas no se habían declarado ni registrado.',
      },
      {
        kicker: 'Punto tres',
        titulo: 'Los costos directos traen factura',
        items: [
          'Desarrollo Mental factura la cuota de la franquicia.',
          'Cada Coach factura el total de sus honorarios.',
        ],
        cierre: 'Sin factura, el gasto no se registra.',
      },
      {
        kicker: 'Tu parte',
        titulo: 'Los soportes llegan antes de la fecha',
        texto: 'La contadora declara con lo que tiene. Lo que no le llegue a tiempo, no entra en la quincena.',
      },
    ],

    sop: {
      proceso: 'Dejar la quincena con todos sus soportes',
      cuando: 'Durante cada quincena, y completo antes de la fecha de declaración del calendario.',
      producto: 'El banco de la quincena conciliado y cada movimiento con su soporte, entregado a la contadora.',
      pasos: [
        'Descarga el estado de cuenta del banco de la quincena.',
        'Identifica cada depósito con su venta: representante, niño y concepto.',
        'Identifica cada cobro en divisa: Zelle, tarjeta en dólares o efectivo.',
        'Identifica cada egreso con su compra o su servicio.',
        'Con cada pago a un Coach, pide su factura fiscal por el total de sus honorarios.',
        'Con cada pago de la cuota de la franquicia, pide la factura de Desarrollo Mental.',
        'Descarga cada factura de publicidad de redes sociales del periodo.',
        'Entrega a la contadora el banco conciliado y todos los soportes antes de la fecha.',
      ],
      decide: [
        { situacion: 'Un depósito del banco no tiene venta registrada', regla: 'La conciliación no está cerrada: se identifica de quién y de qué es antes de entregar.' },
        { situacion: 'Un Coach entrega factura por menos de lo que cobró', regla: 'Se le pide la factura por el monto completo: la diferencia sería un gasto sin soporte.' },
        { situacion: 'Se pagó publicidad en Facebook o Instagram', regla: 'Su factura va a la contadora: el IVA se declara en la casilla 11, importación gravada.' },
      ],
      errores: [
        'Pagar al Coach sin su factura fiscal y dejar el gasto sin soporte.',
        'Dejar fuera las facturas de publicidad de redes sociales.',
        'Entregar los soportes después de la fecha de la quincena.',
      ],
    },

    masa: [
      'La carta de la contadora abierta (se descarga en este módulo).',
      'El estado de cuenta del banco de la quincena.',
      'Las facturas fiscales de los Coach del último pago.',
      'La última factura de publicidad de Facebook o Instagram.',
    ],

    palabras: [
      'seniat',
      'contribuyente-especial',
      'deber-formal',
      'soporte',
      'conciliacion-bancaria',
      'iva',
      'alicuota-general',
      'importacion-gravada',
      'retencion-de-iva',
      'franquicia',
      'honorarios-profesionales',
    ],

    bloques: [
      { t: 'sub', texto: 'Por qué existe este módulo' },
      { t: 'p', texto: 'FF Soluciones Integrales 2024 C.A. es la empresa que opera ALOHA Los Naranjos, y el SENIAT la tiene como **contribuyente especial**. El 25 de agosto de 2026 la contadora, la Lic. Siole Valderrama, le escribió a la Junta Directiva para ratificar los deberes formales que exigen las últimas adecuaciones del SENIAT. Este módulo es esa carta, explicada. La carta completa está al final para que la descargues.' },
      { t: 'nota', tono: 'regla', titulo: 'La regla que sostiene todo', texto: 'Lo que no tiene soporte no se registra en la contabilidad y no se declara. Un gasto sin factura es dinero que salió del banco y que, para la contabilidad, no existe.' },

      { t: 'sub', texto: 'Uno: el banco cuadra contra ventas y compras' },
      { t: 'p', texto: 'Las conciliaciones bancarias tienen que estar soportadas y cuadradas contra la prestación del servicio, que son las ventas, y contra los egresos, que son las compras y los servicios. Se concilian los ingresos en bolívares y, según el caso, los ingresos en divisa.' },
      {
        t: 'lista',
        items: [
          'Cada depósito del banco tiene su venta: qué representante, qué niño y qué concepto.',
          'Cada egreso tiene su compra o su servicio, con su factura.',
          'Lo cobrado en divisa (Zelle, tarjeta en dólares, efectivo) también se identifica: de ahí sale el IGTF de la quincena.',
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: 'Caso para pensar', texto: 'El estado de cuenta de la quincena trae tres Pago Móvil sin nombre. Escribe qué haces con cada uno antes de que la contadora declare las ventas.' },

      { t: 'sub', texto: 'Dos: la publicidad de redes sociales paga IVA' },
      { t: 'p', texto: 'Toda factura de publicidad o propaganda ligada a la actividad de la empresa tiene que declarar su IVA en la **casilla 11** de la declaración: importación gravada por alícuota general. El servicio que prestan las redes sociales (la carta nombra a Facebook y a Movistar) lleva IVA del 16 %, y ese IVA tiene que venir discriminado en la factura digital de plataformas como Instagram, TikTok o Facebook.' },
      { t: 'nota', tono: 'alerta', titulo: 'Lo que dice la carta', texto: 'Hasta la fecha de la carta, estas facturas no se habían declarado ante el SENIAT ni registrado en la contabilidad. Cada factura de publicidad del periodo se descarga y se entrega a la contadora con los demás soportes de la quincena.' },

      { t: 'sub', texto: 'Tres: los costos directos necesitan factura' },
      { t: 'p', texto: 'Los costos directos de producción son lo que cuesta dar el servicio. La carta nombra dos, y los dos tienen que llegar con factura.' },
      {
        t: 'tabla',
        encabezados: ['Costo directo', 'Quién factura', 'Qué hace FF con la factura'],
        filas: [
          ['Comisión o cuota de participación de la franquicia', 'Desarrollo Mental, obligatoriamente', 'La refleja en su IVA a declarar y aplica las retenciones que corresponden'],
          ['Honorarios de los Coach', 'Cada Coach, con su factura fiscal', 'Registra el gasto completo en la contabilidad'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'El hueco que se repite', texto: 'Algunos Coach no facturan la totalidad de sus honorarios. La parte sin factura es un gasto que salió del banco y no se puede registrar porque no tiene soporte. La factura se pide por el monto completo, con cada pago.' },

      { t: 'sub', texto: 'Qué te toca a ti' },
      {
        t: 'pasos',
        items: [
          'Durante la quincena, identifica cada movimiento del banco con su venta o con su gasto.',
          'Con cada pago a un Coach, pide su factura fiscal por el total de sus honorarios.',
          'Con cada pago de la cuota de la franquicia, pide la factura de Desarrollo Mental.',
          'Descarga cada factura de publicidad de redes sociales del periodo.',
          'Entrega a la contadora el banco conciliado y todos los soportes antes de la fecha de la quincena.',
        ],
      },
      { t: 'recursos', titulo: 'Material de estudio', recursos: [CARTA] },
    ],

    quiz: [
      {
        pregunta: '¿Qué pasa con un gasto que salió del banco pero no tiene factura?',
        opciones: ['Se registra igual con el comprobante de la transferencia', 'No se puede registrar en la contabilidad ni declarar', 'Se declara en la casilla 11', 'Lo cubre la cuota de la franquicia'],
        explicacion: 'Sin soporte no hay registro. El pago existe en el banco, pero para la contabilidad no existe.',
        repasa: ['soporte'],
      },
      {
        pregunta: 'La factura mensual de publicidad en Facebook, ¿dónde declara su IVA?',
        opciones: ['En el IGTF quincenal (forma 21)', 'En ningún lado: es una empresa extranjera', 'En la casilla 11: importación gravada por alícuota general', 'En el impuesto de pensiones'],
        explicacion: 'La publicidad de redes es un servicio que se importa y paga IVA en Venezuela: casilla 11, importación gravada por alícuota general.',
        repasa: ['importacion-gravada'],
      },
      {
        pregunta: '¿Qué IVA lleva el servicio de publicidad en redes sociales?',
        opciones: ['16 %', '9 %', 'No lleva IVA', '75 %'],
        explicacion: 'Es la alícuota general del IVA: el 16 %.',
        repasa: ['alicuota-general'],
      },
      {
        pregunta: '¿Contra qué se concilia el banco?',
        opciones: ['Solo contra el cuadro de negocio', 'Contra las ventas, las compras y servicios, y los ingresos en divisa cuando los hay', 'Contra el presupuesto del mes', 'Solo contra los depósitos en bolívares'],
        explicacion: 'La carta pide el banco cuadrado contra ventas, egresos, bolívares y, según el caso, divisa.',
        repasa: ['conciliacion-bancaria'],
      },
      {
        pregunta: 'Un Coach factura menos de lo que cobró. ¿Qué problema crea?',
        opciones: ['Ninguno, si el pago salió por el banco', 'El Coach paga menos IGTF', 'La franquicia lo descuenta de la cuota', 'La diferencia es un gasto sin soporte que no se puede registrar'],
        explicacion: 'Lo que no se factura no tiene soporte: salió del banco y la contabilidad no lo puede registrar.',
        repasa: ['honorarios-profesionales'],
      },
      {
        pregunta: '¿Quién tiene que entregar factura por la cuota de participación de la franquicia?',
        opciones: ['Desarrollo Mental', 'El Coach', 'La contadora', 'El SENIAT'],
        explicacion: 'La carta dice que Desarrollo Mental obligatoriamente entrega la factura, y FF la refleja en su IVA con sus retenciones.',
        repasa: ['franquicia'],
      },
      {
        pregunta: 'Una empresa puede pagar el impuesto completo y aun así incumplir un deber formal.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'El deber formal es tener los soportes, conciliar y declarar en fecha. Pagar no lo sustituye.',
        repasa: ['deber-formal'],
      },
    ],

    drills: [],
  },

  {
    id: 'of-fis-2',
    curso: 'fiscal',
    orden: 41,
    roles: ['administradora', 'asistente'],
    centros: [CENTRO_LOS_NARANJOS],
    titulo: 'Las declaraciones: qué forma y cada cuánto',
    duracionMin: 15,
    requiere: ['of-fis-1'],
    fuente: [`${FUENTE}#tabla-de-impuestos`],

    pfv: 'El calendario fiscal de la empresa leído sin error: qué se declara cada quincena, qué una vez al mes y qué una vez al año, con los soportes en manos de la contadora antes de cada fecha.',

    voz: 'Ahora las fechas. <break time="0.4s"/> Como contribuyente especial, la empresa declara casi todo dos veces al mes. <break time="0.4s"/> Ventas, IVA retenido, IVA de la quincena, e IGTF. <break time="0.3s"/> Cuatro declaraciones por quincena, y las cuatro salen del banco conciliado. <break time="0.5s"/> Una vez al mes van el ISLR del mes y el impuesto de pensiones. <break time="0.4s"/> Ese se calcula sobre doscientos cuarenta dólares, a la tasa del día en que se declara. <break time="0.3s"/> Y se paga el nueve por ciento. <break time="0.5s"/> Una vez al año, el ISLR definitivo y los grandes patrimonios, entre octubre y noviembre. <break time="0.5s"/> Las fechas no se adivinan. <break time="0.3s"/> Salen del calendario del SENIAT. <break time="0.4s"/> Tu parte es que los soportes lleguen antes.',

    laminas: [
      {
        kicker: 'La regla',
        titulo: 'La fecha la pone el calendario',
        texto: 'Todo se declara "según calendario": el de contribuyentes especiales del SENIAT. No es el 15 y el 30.',
      },
      {
        kicker: 'Cada quincena',
        titulo: 'Cuatro declaraciones, dos veces al mes',
        items: [
          'Forma 44: ventas, con lo depositado en el banco.',
          'Forma 35: IVA retenido, 75 % o 100 %.',
          'Forma 30: IVA de ventas y compras.',
          'Forma 21: IGTF de Zelle, tarjeta en dólares y efectivo.',
        ],
      },
      {
        kicker: 'Cada mes',
        titulo: 'ISLR del mes y pensiones',
        items: [
          'Forma 74: ISLR del mes, con la macro de Excel.',
          'Forma 19: el 9 % de 240 dólares a la tasa del día.',
        ],
      },
      {
        kicker: 'Cada año',
        titulo: 'Grandes patrimonios y renta definitiva',
        items: [
          'Forma 999: activos fijos, entre octubre y noviembre.',
          'Forma 26: ingresos, costos y gastos del año fiscal.',
        ],
      },
      {
        kicker: 'Tu parte',
        titulo: 'Soportes antes de cada fecha',
        texto: 'Las cuatro de la quincena salen del banco conciliado. Si la conciliación no está, ninguna sale bien.',
      },
    ],

    sop: {
      proceso: 'Leer el calendario fiscal de la empresa',
      cuando: 'Al empezar cada quincena y cada mes, y en septiembre para la declaración anual de patrimonio.',
      producto: 'Las fechas de la quincena, del mes y del año anotadas, con los soportes de cada una en manos de la contadora antes de la fecha.',
      pasos: [
        'Abre el calendario de contribuyentes especiales del SENIAT del año.',
        'Anota las dos fechas de la quincena: ventas (44), IVA retenido (35), IVA (30) e IGTF (21).',
        'Anota la fecha del mes: ISLR del mes (74) e impuesto de pensiones (19).',
        'Confirma cada fecha con la contadora.',
        'Ten el banco conciliado y los soportes listos antes de cada fecha de quincena.',
        'Para pensiones, usa la tasa oficial del día en que se declara.',
        'Antes de octubre, entrega la lista de activos fijos del año para el impuesto a los grandes patrimonios (999).',
      ],
      decide: [
        { situacion: 'No sabes qué día toca declarar', regla: 'No se adivina: sale del calendario de contribuyentes especiales y lo confirma la contadora.' },
        { situacion: 'La tasa cambió entre el cobro y la declaración', regla: 'Para pensiones vale la tasa del día en que se declara.' },
        { situacion: 'El Centro compró mobiliario o equipos en el año', regla: 'Van a la lista de activos fijos de la forma 999, antes de octubre.' },
      ],
      errores: [
        'Suponer que la quincena se declara el 15 y el 30.',
        'Calcular pensiones con la tasa del día en que se cobró.',
        'Olvidar los activos fijos comprados en el año.',
      ],
    },

    masa: [
      'La carta de la contadora abierta en la tabla de impuestos.',
      'El calendario de contribuyentes especiales del SENIAT de este año.',
      'El estado de cuenta del banco de la última quincena.',
      'Una calculadora.',
    ],

    palabras: [
      'calendario-de-contribuyentes-especiales',
      'iva',
      'retencion-de-iva',
      'igtf',
      'islr',
      'declaracion-definitiva-de-rentas',
      'impuesto-de-pensiones',
      'tasa-oficial-del-dia',
      'impuesto-a-los-grandes-patrimonios',
    ],

    bloques: [
      { t: 'sub', texto: 'Todo sale del calendario' },
      { t: 'p', texto: 'Como contribuyente especial, FF declara en las fechas del **calendario de contribuyentes especiales** del SENIAT. La carta no da días fijos: en cada impuesto dice "según calendario". La fecha exacta la marca ese calendario y la confirma la contadora; tu trabajo es que los soportes le lleguen antes.' },

      { t: 'sub', texto: 'Lo que se declara cada quincena' },
      {
        t: 'tabla',
        encabezados: ['Forma', 'Impuesto', 'Qué se declara'],
        filas: [
          ['44', 'Ventas', 'Se hace manual, con base en lo depositado o ingresado en el banco'],
          ['35', 'IVA retenido', 'La retención del 75 % o del 100 % del IVA, según la situación del proveedor'],
          ['30', 'IVA quincenal', 'Las ventas y las compras de la quincena'],
          ['21', 'IGTF quincenal', 'Los Zelle, los pagos con tarjeta en dólares y el efectivo'],
        ],
      },
      { t: 'nota', tono: 'regla', titulo: 'Cuatro formas, dos veces al mes', texto: 'Las cuatro salen del mismo sitio: el banco conciliado y sus soportes. Si la conciliación de la quincena no está lista, ninguna de las cuatro sale bien.' },

      { t: 'sub', texto: 'La retención de IVA, con números' },
      { t: 'p', texto: 'Como contribuyente especial, FF no le paga al proveedor todo el IVA de su factura: retiene una parte y la declara en la forma 35. Un ejemplo con números inventados:' },
      {
        t: 'lista',
        items: [
          'Factura del proveedor: 1.000 Bs de base más 160 Bs de IVA, 1.160 Bs en total.',
          'Retención del 75 % del IVA: 120 Bs.',
          'Al proveedor se le pagan 1.040 Bs.',
          'Los 120 Bs retenidos se declaran en la forma 35 de esa quincena.',
        ],
      },
      { t: 'nota', tono: 'ojo', titulo: '75 % o 100 %', texto: 'El porcentaje depende de la situación del proveedor, y lo define la contadora. Lo que no cambia es que la retención no es un descuento: es impuesto y va al SENIAT.' },

      { t: 'sub', texto: 'Lo que se declara una vez al mes' },
      {
        t: 'tabla',
        encabezados: ['Forma', 'Impuesto', 'Cómo se calcula'],
        filas: [
          ['74', 'ISLR del mes', 'Se determina con la hoja de Excel (macro) de la contabilidad'],
          ['19', 'Impuesto de pensiones', 'El equivalente de 240 dólares a la tasa del día en que se declara, que representa un salario integral; se paga el 9 % del resultado'],
        ],
      },
      { t: 'p', texto: 'Pensiones, con una tasa inventada de 100 Bs por dólar: 240 × 100 = 24.000 Bs, y el 9 % son **2.160 Bs** a pagar ese mes. Con la tasa real del día en que se declara, la cuenta es la misma.' },

      { t: 'sub', texto: 'Lo que se declara una vez al año' },
      {
        t: 'tabla',
        encabezados: ['Forma', 'Impuesto', 'Qué se declara y cuándo'],
        filas: [
          ['999', 'Impuesto a los grandes patrimonios', 'Todos los activos fijos, menos la depreciación, ajustados por inflación. Entre octubre y noviembre'],
          ['26', 'ISLR definitivo de rentas', 'La totalidad de ingresos, costos y gastos del año fiscal, para calcular la renta gravable'],
        ],
      },
      { t: 'nota', tono: 'alerta', titulo: 'Antes de octubre, la lista de activos', texto: 'La forma 999 se declara entre octubre y noviembre. Si el Centro compró mobiliario o equipos en el año, esa lista tiene que estar completa antes.' },
      { t: 'recursos', titulo: 'Material de estudio', recursos: [CARTA] },
    ],

    quiz: [
      {
        pregunta: '¿Cada cuánto se declara el IVA quincenal (forma 30)?',
        opciones: ['Una vez al año', 'Dos veces al mes, según calendario', 'Una vez al mes', 'Solo cuando hay ventas en divisa'],
        explicacion: 'Las cuatro declaraciones de la quincena (44, 35, 30 y 21) se hacen dos veces al mes, en las fechas del calendario.',
        repasa: ['calendario-de-contribuyentes-especiales'],
      },
      {
        pregunta: '¿Qué se declara en el IGTF quincenal (forma 21)?',
        opciones: ['Los Zelle, los pagos con tarjeta en dólares y el efectivo', 'Las facturas de publicidad', 'Los activos fijos', 'Los honorarios de los Coach'],
        explicacion: 'El IGTF se declara sobre lo que se cobra en divisa: Zelle, tarjeta en dólares y efectivo.',
        repasa: ['igtf'],
      },
      {
        pregunta: 'Factura de 1.000 Bs más 160 Bs de IVA, con retención del 75 %. ¿Cuánto se retiene?',
        opciones: ['160 Bs', '40 Bs', '750 Bs', '120 Bs'],
        explicacion: 'Se retiene el 75 % del IVA, no de la base: 75 % de 160 Bs son 120 Bs.',
        repasa: ['retencion-de-iva'],
      },
      {
        pregunta: 'Con una tasa del día de 100 Bs por dólar, ¿cuánto se paga de impuesto de pensiones ese mes?',
        opciones: ['240 Bs', '24.000 Bs', '2.160 Bs', '21.600 Bs'],
        explicacion: '240 dólares × 100 = 24.000 Bs; el 9 % de eso son 2.160 Bs.',
        repasa: ['impuesto-de-pensiones'],
      },
      {
        pregunta: '¿Qué tasa se usa para el impuesto de pensiones?',
        opciones: ['La del día en que se cobró la mensualidad', 'La del día en que se declara', 'La del primer día del mes', 'Un promedio del mes'],
        explicacion: 'La carta es clara: a la tasa del día en que se declara.',
        repasa: ['tasa-oficial-del-dia'],
      },
      {
        pregunta: '¿Cuándo se declara el impuesto a los grandes patrimonios (forma 999)?',
        opciones: ['Cada quincena', 'Todos los meses', 'Una vez al año, entre octubre y noviembre', 'Solo al cerrar la empresa'],
        explicacion: 'Es anual, entre octubre y noviembre, sobre los activos fijos menos depreciación y ajustados por inflación.',
        repasa: ['impuesto-a-los-grandes-patrimonios'],
      },
      {
        pregunta: 'La declaración de ventas (forma 44) se hace con base en…',
        opciones: ['Lo depositado o ingresado en el banco', 'Lo que dice el cuadro de negocio', 'Las inscripciones del mes', 'El presupuesto del Centro'],
        explicacion: 'La carta dice que se hace manual, con base en lo depositado o ingresado en el banco. Por eso el banco conciliado es la base.',
      },
      {
        pregunta: 'Las declaraciones de la quincena son siempre el día 15 y el último día del mes.',
        opciones: ['Verdadero', 'Falso'],
        explicacion: 'Falso: las fechas salen del calendario de contribuyentes especiales del SENIAT.',
        repasa: ['calendario-de-contribuyentes-especiales'],
      },
    ],

    drills: [],
  },
]
