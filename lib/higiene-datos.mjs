// HIGIENE DE DATOS — "qué le falta cargar a ESTE centro, con nombre y número".
//
// EL PROBLEMA QUE RESUELVE. El motor de crecimiento no proyecta a ciegas: si
// falta un cierre de mes, si un saldo no concilia o si un alumno no tiene fecha
// de inicio, la confianza cae a BAJA — y la confianza baja BLOQUEA EL VERDE del
// semáforo (lib/marcadores.mjs), aunque el centro esté cumpliendo las tres
// metas. Hasta hoy eso se veía como una etiqueta gris ("confianza baja") sin un
// solo camino para salir de ahí. Este módulo convierte esa etiqueta en una
// LISTA TERMINABLE: qué falta, cuántos son, cómo se llaman, dónde se carga y
// cuánta confianza recupera cada punto.
//
// TRES REGLAS DE DISEÑO, y las tres vienen de un fracaso conocido:
//
// 1. NO SE PUEDE DESCARTAR. La alerta no lleva X ni "recordarme mañana": la
//    función es pura sobre los datos, así que un punto desaparece SOLO cuando
//    el dato está cargado. Una alerta que se cierra a mano muere el primer día.
//
// 2. ORDEN POR LO QUE DESBLOQUEA, NO POR GRAVEDAD SENTIDA. Primero lo que
//    mantiene la confianza clavada en BAJA (y dentro de eso, lo más corto
//    primero: CALLE 50 está a UN solo override de subir de nivel); después lo
//    que suma puntos de confianza; al final lo que el centro no puede resolver.
//    Una lista que grita lo mismo todos los días y no se puede terminar se
//    vuelve papel tapiz.
//
// 3. LO QUE NO DEPENDE DEL CENTRO SE DICE, Y SE DICE QUE NO DEPENDE DEL CENTRO.
//    `capacity_unverified` la empuja SIEMPRE lib/growth/source.mjs:230 y hoy
//    ningún centro puede llegar a confianza ALTA por eso. Esconderlo sería
//    mentir; ponerlo arriba, todos los días, sería ruido. Va último y marcado
//    como trabajo de Dirección.
//
// Módulo puro: sin base de datos, sin React. La lectura vive en
// app/actions/higiene.js y el dibujo en components/higiene/AlertaHigieneDatos.js.

// La frase de por qué importa, una sola línea, la misma en pantalla y en tests.
export const POR_QUE =
  'Sin estos datos el sistema no puede proyectar, y un centro sin proyección confiable no se pone en verde aunque vaya bien.'

// Pesos de la confianza. Copiados de `confidenceFor` en lib/growth/metrics.mjs
// (historia 0,4 · completitud 0,4 · cobertura de pipeline 0,2), porque ese
// módulo no los exporta.
// ponytail: duplicación deliberada de tres constantes (techo: si allá cambian
// los pesos, aquí se prometería una ganancia falsa; salida: test/higiene-datos
// .test.mjs lee lib/growth/metrics.mjs y falla si la fórmula deja de coincidir,
// y el día que metrics.mjs exporte los pesos se importan y se borra esto).
export const PESOS_CONFIANZA = { historia: 0.4, completitud: 0.4, cobertura: 0.2 }
export const MESES_VENTANA = 6

// Misma condición que fuerza `level = 'low'` en lib/growth/metrics.mjs: una
// issue sin resolver que sea de severidad error, o cuyo código hable de saldos,
// continuidad, conciliación, conflicto, embudo inválido o duplicados.
// ponytail: el patrón se repite aquí en vez de importarse (techo y salida: los
// mismos que arriba, mismo test lo vigila).
export const PATRON_BLOQUEA = /balance|discontinuity|mismatch|conflict|invalid|duplicate/

export function fuerzaConfianzaBaja(issue) {
  if (!issue || issue.resolved === true) return false
  return issue.severity !== 'warning' || PATRON_BLOQUEA.test(String(issue.code || ''))
}

const NOMBRES_MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio',
  'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

// '2026-08' → 'Agosto 2026'. Devuelve el crudo si no es un periodo válido: en
// una alerta de datos rotos, inventar una etiqueta bonita es lo último que hace
// falta.
export function mesLargo(periodo) {
  const texto = String(periodo || '')
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(texto)
  if (!match) return texto
  return `${NOMBRES_MES[Number(match[2]) - 1]} ${match[1]}`
}

const num = (valor, porDefecto = 0) => {
  const n = Number(valor)
  return Number.isFinite(n) ? n : porDefecto
}

const tope = (valor, min = 0, max = 1) => Math.min(max, Math.max(min, valor))
const plural = (n, uno, muchos) => (Math.abs(n) === 1 ? uno : muchos)

// `grupos.numero` es TEXT: hay "41" y hay "KINDER RAQUEL". El numeral sólo se
// antepone cuando el número es un número; "#KINDER RAQUEL" no lo dice nadie.
export function etiquetaGrupo(numero, id = null) {
  const texto = String(numero ?? '').trim()
  if (!texto) return id == null ? 'grupo sin identificar' : `grupo id ${id}`
  return /^\d+$/.test(texto) ? `#${texto}` : texto
}

// Puntos de confianza (0–100) que recupera cerrar una brecha.
const puntos = (delta) => Math.round(tope(delta, 0, 1) * 100)

// ── DÓNDE SE ARREGLA CADA COSA ─────────────────────────────────────────────
// Una línea que sólo describe el problema deja a la administradora buscando la
// pantalla. Cada punto trae su enlace, y el enlace del cierre de mes lleva el
// mes ya seleccionado (app/centro/[id]/kpi/page.js lee year/month del query).
const DESTINOS = {
  kpi: { texto: 'Ir al KPI mensual', ruta: (id) => `/centro/${id}/kpi` },
  kpiMes: {
    texto: 'Abrir ese mes en el KPI',
    ruta: (id, mes) => {
      const match = /^(\d{4})-(\d{2})$/.exec(String(mes || ''))
      return match ? `/centro/${id}/kpi?year=${match[1]}&month=${Number(match[2])}` : `/centro/${id}/kpi`
    },
  },
  grupos: { texto: 'Ir a Grupos', ruta: (id) => `/centro/${id}/grupos` },
  fichas: { texto: 'Ir a fichas de niños', ruta: (id) => `/centro/${id}/grupos` },
  eventos: { texto: 'Ir a Movimientos', ruta: (id) => `/centro/${id}/eventos` },
  historial: { texto: 'Ir al Historial', ruta: (id) => `/centro/${id}/historial` },
}

// Varias issues del motor traen `count` y un mensaje con el número ya metido
// dentro, que en singular sale mal escrito ("1 fichas activas siguen"). Cuando
// hay `count` se rehace la línea; cuando no, manda el mensaje del motor.
const contadas = (uno, muchos) => (issue) => {
  if (issue?.count == null) return null
  const n = num(issue.count)
  return `${n} ${plural(n, uno, muchos)}`
}

// El motor identifica el mes con `period` o con year/month, y escribe el
// periodo crudo ("2026-07") dentro del mensaje. En pantalla se dice "Julio
// 2026": nadie lee el KPI de su centro en ISO 8601.
const mesDe = (issue) => {
  if (issue?.period) return String(issue.period)
  if (issue?.year == null || issue?.month == null) return null
  return `${Number(issue.year)}-${String(Number(issue.month)).padStart(2, '0')}`
}
const conMes = (frase) => (issue) => {
  const mes = mesDe(issue)
  return mes ? `${mesLargo(mes)} · ${frase}` : null
}

// ── CATÁLOGO DE ISSUES DEL MOTOR ───────────────────────────────────────────
// Traduce el código técnico que emite lib/growth a una frase que una
// administradora puede ejecutar hoy. Un código que no esté aquí NO se descarta:
// cae al genérico con el mensaje original del motor (ver `puntoDeIssue`).
const CATALOGO = {
  stock_balance: {
    titulo: 'Saldos de mes que no cuadran',
    accion: 'Inicio + altas + reincorporados − retiros tiene que dar el cierre. Reabre el mes, corrige el movimiento que falta y vuelve a cerrarlo.',
    destino: 'kpi',
    item: conMes('el cierre no coincide con las entradas y salidas declaradas'),
  },
  // Los tres detectores de continuidad (ventana, histórico y mes abierto)
  // reportan LA MISMA rotura desde ángulos distintos: en LOS NARANJOS salían
  // dos tarjetas hablando de los mismos cuatro meses. Se juntan en un punto:
  // la corrección es una sola.
  stock_discontinuity: {
    agrupa: 'continuidad',
    titulo: 'El mes no empieza donde terminó el anterior',
    accion: 'El cierre de un mes es el inicio del siguiente. Cuadra el arrastre mes a mes en el historial.',
    destino: 'historial',
    item: conMes('empieza en un número distinto al cierre del mes anterior'),
  },
  history_continuity: { agrupa: 'continuidad' },
  open_month_discontinuity: { agrupa: 'continuidad' },
  population_mismatch: {
    titulo: 'El padrón y el KPI no dicen lo mismo',
    accion: 'El saldo mensual y los niños elegibles del padrón difieren. Revisa altas, retiros y fichas en grupos cerrados.',
    destino: 'grupos',
  },
  duplicate_month: {
    titulo: 'Un mes tiene más de un cierre',
    accion: 'Deja un solo cierre por mes: dos cierres del mismo periodo hacen que la ventana cuente doble.',
    destino: 'kpi',
  },
  invalid_funnel: {
    titulo: 'Embudo de clase de prueba imposible',
    accion: 'No se puede matricular a quien no se invitó. Corrige invitados, asistentes y matriculados del mes.',
    destino: 'kpi',
    item: conMes('invitados, asistentes y matriculados no van de mayor a menor'),
  },
  invalid_counts: {
    titulo: 'Cantidades imposibles en el cierre',
    accion: 'Hay números negativos o más graduados que salidas. Corrige el mes.',
    destino: 'kpi',
  },
  // DOS ESTADOS QUE NO SE PUEDEN DECIR IGUAL. En lib/growth/source.mjs el
  // conflicto llega con `resolved: useDerived`, y `useDerived = reliable &&
  // !hasOverride`. O sea que `resolved:true` significa justamente que NO hay
  // número forzado que quitar y que las ventas YA están clasificadas: el motor
  // resolvió el conflicto usando la cifra clasificada. Pedir ahí "quita el
  // número forzado o clasifica las ventas que faltan" manda a la
  // administradora a buscar algo que no existe, y el punto no se va — que es
  // el papel tapiz que este módulo dice combatir. Lo que sí queda por hacer es
  // cuadrar la matrícula DECLARADA en el cierre del mes.
  cp_enrollment_conflict: {
    titulo: 'Matrícula de prueba declarada contra ventas clasificadas',
    accion: (issues) => (issues.every((issue) => issue?.resolved === true)
      ? 'Las ventas ya están clasificadas y el cálculo usa esa cifra: no hay número forzado que quitar. Falta cuadrar la matrícula de prueba declarada en el cierre del mes para que coincida con las ventas clasificadas.'
      : 'La matrícula escrita a mano no coincide con las ventas clasificadas. Quita el número forzado o clasifica las ventas que faltan.'),
    destino: 'kpi',
    item: (issue) => {
      const mes = mesDe(issue)
      if (!mes) return null
      // El estado va en la línea del mes: en un mismo punto puede haber un mes
      // ya resuelto por el motor y otro con override vivo, y con la redacción
      // vieja se veían idénticos.
      const estado = issue?.resolved === true
        ? 'el cálculo ya usa la cifra clasificada; falta cuadrar lo declarado'
        : 'el número declarado a mano pisa el cálculo'
      return `${mesLargo(mes)} · ${String(issue.message || '').trim()} — ${estado}`
    },
  },
  undated_current_movements: {
    agrupa: 'sin_fecha',
    titulo: 'Movimientos del mes sin fecha',
    accion: 'Sin fecha no hay saldo al día. Ponle fecha a cada retiro y reincorporación del mes.',
    destino: 'eventos',
    item: contadas('movimiento del mes sin fecha', 'movimientos del mes sin fecha'),
  },
  undated_movements: { agrupa: 'sin_fecha' },
  movement_period_mismatch: {
    titulo: 'Movimiento con fecha de otro periodo',
    accion: 'La fecha efectiva y el periodo declarado no coinciden. Corrige el movimiento.',
    destino: 'eventos',
  },
  overdue_scheduled_withdrawals: {
    titulo: 'Retiros programados vencidos',
    accion: 'La fecha del retiro ya pasó y el retiro no se ejecutó. Ejecútalo o cambia la fecha.',
    destino: 'eventos',
    item: contadas('retiro programado vencido', 'retiros programados vencidos'),
  },
  active_students_in_blocked_groups: {
    titulo: 'Fichas activas en grupos cerrados o fusionados',
    accion: 'Reasigna a esos niños a un grupo activo: hoy no cuentan en ningún lado.',
    destino: 'grupos',
    item: contadas('ficha activa en un grupo cerrado o fusionado', 'fichas activas en grupos cerrados o fusionados'),
  },
  cp_classification_incomplete: {
    titulo: 'Inscripciones sin vinculación completa',
    accion: 'Desde septiembre de 2026, vincula cada inscripción con la ficha del niño e indica si vino de clase de prueba o fue directa. Este control es distinto del canal de captación (marketing, referido, etc.) declarado en el KPI.',
    destino: 'fichas',
    // El mes, no la frase genérica: seis meses incompletos daban una sola línea
    // repetida que no le decía a nadie dónde meterse.
    item: (issue) => (issue?.period ? mesLargo(issue.period) : null),
  },
  missing_closed_months: null, // se dice mejor en el punto de cierres, con nombre de mes
  capacity_unverified: null,   // estructural: se dice al final, como trabajo de Dirección
}

// Un código que sólo trae `agrupa` hereda el título, la acción y el destino del
// código que encabeza su grupo (el que sí los define).
const fichaDe = (codigo) => {
  const ficha = CATALOGO[codigo]
  if (!ficha) return null
  if (ficha.titulo) return ficha
  const cabeza = Object.values(CATALOGO).find((otra) => otra?.titulo && otra.agrupa === ficha.agrupa)
  return cabeza || null
}

const grupoDe = (codigo) => CATALOGO[codigo]?.agrupa || codigo

function lineasDe(issues) {
  const lineas = issues.map((issue) => {
    const armar = CATALOGO[String(issue?.code)]?.item
    return String((armar && armar(issue)) || issue?.message || '').trim()
  })
  return [...new Set(lineas.filter(Boolean))]
}

function puntoDeIssue(clave, issues, centroId) {
  const ficha = fichaDe(String(issues[0]?.code || ''))
  const bloquea = issues.some(fuerzaConfianzaBaja)
  const destino = ficha?.destino ? DESTINOS[ficha.destino] : null
  const items = lineasDe(issues)
  // `accion` puede ser una función de las issues: hay códigos cuya instrucción
  // real cambia según el estado en que llegue la issue (ver
  // cp_enrollment_conflict). Un texto fijo ahí manda a corregir algo que no
  // existe, y un punto que no se puede ejecutar no se ejecuta.
  const accion = typeof ficha?.accion === 'function' ? ficha.accion(issues) : ficha?.accion
  return {
    clave: `issue:${clave}`,
    codigo: clave,
    titulo: ficha?.titulo || 'Dato inconsistente en el histórico',
    // Un código sin ficha conserva el mensaje del motor: se prefiere una frase
    // técnica a callar un dato roto.
    accion: accion || 'Revisa el mes que reporta el motor y corrige el dato.',
    items,
    cuantos: items.length || issues.length,
    bloquea,
    ganancia: 0,
    dueno: 'centro',
    donde: destino ? { texto: destino.texto, href: destino.ruta(centroId) } : null,
  }
}

// ── LA FUNCIÓN ─────────────────────────────────────────────────────────────
//
// `growth`      payload de calculateCentroGrowth (o null si el motor falló).
// `gruposSinFecha`   [{ id, numero }] grupos ACTIVOS sin fecha_inicio_clases.
// `alumnosSinInicio` [{ id, nombre, grupoNumero, alta }] fichas activas sin
//                    fecha de inicio de clases (las que hunden la cobertura).
// `mesesAbiertos`    ['2026-08'] periodos cuyo mes_kpi existe y NO está cerrado.
// `centroId`         para armar los enlaces.
export function higieneDeDatos({
  growth = null,
  gruposSinFecha = [],
  alumnosSinInicio = [],
  mesesAbiertos = [],
  centroId = null,
} = {}) {
  const confianzaMotor = growth?.metrics?.confidence || null
  const ventana = growth?.metrics?.window || null
  const issues = Array.isArray(growth?.metrics?.issues) ? growth.metrics.issues : []
  const meses = num(confianzaMotor?.months, num(ventana?.months))
  const completitud = tope(num(confianzaMotor?.completeness, 1))
  const cobertura = tope(num(confianzaMotor?.pipelineCoverage, 1))
  const lista = []

  // 1 · CIERRES DE MES. Lo primero que mide la confianza: 6 meses cerrados
  // valen el 40% del puntaje. Se distingue el mes ABIERTO (existe y falta
  // cerrarlo) del mes que ni siquiera tiene fila.
  const abiertos = new Set((mesesAbiertos || []).map(String))
  const faltantes = (ventana?.missingPeriods || []).map(String)
  if (faltantes.length) {
    const gananciaCierres = (tope((meses + faltantes.length) / MESES_VENTANA) - tope(meses / MESES_VENTANA)) * PESOS_CONFIANZA.historia
    lista.push({
      clave: 'cierres',
      codigo: 'missing_closed_months',
      titulo: `${faltantes.length} ${plural(faltantes.length, 'cierre de mes', 'cierres de mes')} sin hacer`,
      accion: `La tendencia se mide sobre ${MESES_VENTANA} meses cerrados y hoy hay ${meses}. Cada mes que se cierra acerca la ventana.`,
      items: faltantes.map((periodo) => `${mesLargo(periodo)} · ${abiertos.has(periodo) ? 'abierto, falta cerrarlo' : 'sin datos cargados'}`),
      enlaces: faltantes.map((periodo) => ({
        texto: mesLargo(periodo),
        href: DESTINOS.kpiMes.ruta(centroId, periodo),
      })),
      cuantos: faltantes.length,
      bloquea: false,
      ganancia: gananciaCierres,
      dueno: 'centro',
      donde: { texto: DESTINOS.kpi.texto, href: DESTINOS.kpi.ruta(centroId) },
    })
  }

  // 2 · ISSUES DEL MOTOR, agrupadas por código. Las que fuerzan confianza BAJA
  // van primero en el orden final; las demás quedan como higiene.
  const porCodigo = new Map()
  for (const issue of issues) {
    const codigo = String(issue?.code || 'desconocido')
    if (codigo === 'missing_closed_months' || codigo === 'capacity_unverified') continue
    const clave = grupoDe(codigo)
    if (!porCodigo.has(clave)) porCodigo.set(clave, [])
    porCodigo.get(clave).push(issue)
  }
  for (const [clave, delGrupo] of porCodigo) lista.push(puntoDeIssue(clave, delGrupo, centroId))

  // 3 · FECHAS DE INICIO DE ALUMNOS. Es el 20% del puntaje y suele ser una
  // lista de dos o tres nombres: el punto más barato de toda la pantalla.
  if (alumnosSinInicio.length || cobertura < 0.9) {
    const gananciaCobertura = (1 - cobertura) * PESOS_CONFIANZA.cobertura
    const cuantos = alumnosSinInicio.length
    lista.push({
      clave: 'alumnos-sin-inicio',
      codigo: 'pipeline_coverage',
      titulo: cuantos
        ? `${cuantos} ${plural(cuantos, 'alumno sin fecha', 'alumnos sin fecha')} de inicio de clases`
        : 'Faltan fechas de inicio en el pipeline',
      accion: 'Un alumno sin fecha de inicio no entra en la proyección: asígnale grupo, o ponle fecha de inicio de clases al grupo que ya tiene.',
      items: alumnosSinInicio.map((alumno) => {
        const grupo = alumno?.grupoNumero == null || alumno.grupoNumero === ''
          ? 'sin grupo'
          : `grupo ${etiquetaGrupo(alumno.grupoNumero)}`
        const alta = alumno?.alta ? ` · alta ${String(alumno.alta).slice(0, 10)}` : ''
        return `${alumno?.nombre || `Ficha ${alumno?.id ?? '—'}`} · ${grupo}${alta}`
      }),
      cuantos: cuantos || 1,
      bloquea: false,
      ganancia: gananciaCobertura,
      dueno: 'centro',
      donde: { texto: DESTINOS.grupos.texto, href: DESTINOS.grupos.ruta(centroId) },
    })
  }

  // 4 · INDICADORES DEL CIERRE INCOMPLETOS. Otro 40% del puntaje. Se nombra el
  // mes y cuántos de los 8 indicadores le faltan.
  if (completitud < 0.999) {
    const mesesFlojos = (growth?.metrics?.months || [])
      .filter((mes) => num(mes?.completeness, 1) < 0.999)
      .map((mes) => {
        const periodo = `${mes.year}-${String(mes.month).padStart(2, '0')}`
        const faltan = Math.max(1, Math.round((1 - num(mes.completeness, 1)) * 8))
        return `${mesLargo(periodo)} · ${faltan} de 8 ${plural(faltan, 'indicador sin cargar', 'indicadores sin cargar')}`
      })
    lista.push({
      clave: 'indicadores',
      codigo: 'completeness',
      titulo: 'Cierres con indicadores en blanco',
      accion: 'Niños al inicio y al final, nuevos activos, ventas, retiros e invitados/asistieron/matriculados: los 8 se usan para proyectar.',
      items: mesesFlojos,
      cuantos: mesesFlojos.length || 1,
      bloquea: false,
      ganancia: (1 - completitud) * PESOS_CONFIANZA.completitud,
      dueno: 'centro',
      donde: { texto: DESTINOS.kpi.texto, href: DESTINOS.kpi.ruta(centroId) },
    })
  }

  // 5 · GRUPOS SIN FECHA DE INICIO DE CLASES. No baja el puntaje por sí solo,
  // pero es la fábrica de los dos puntos anteriores: un grupo sin fecha deja
  // sin fecha a todos sus niños.
  if (gruposSinFecha.length) {
    const numeros = gruposSinFecha.map((grupo) => etiquetaGrupo(grupo?.numero, grupo?.id))
    lista.push({
      clave: 'grupos-sin-fecha',
      codigo: 'grupos_sin_fecha_inicio',
      titulo: `${gruposSinFecha.length} ${plural(gruposSinFecha.length, 'grupo activo', 'grupos activos')} sin fecha de inicio de clases`,
      accion: 'Un grupo sin fecha deja sin fecha a todos sus niños, y ahí es donde nace la mitad de lo de arriba.',
      items: numeros,
      cuantos: gruposSinFecha.length,
      bloquea: false,
      ganancia: 0,
      preventivo: true,
      dueno: 'centro',
      donde: { texto: DESTINOS.grupos.texto, href: DESTINOS.grupos.ruta(centroId) },
    })
  }

  // 6 · Puestos físicos declarados y capacidad de atención por horarios.
  // El centro ya puede completar sus salones; no certificar por eso la matrícula.
  const capacidad = issues.find((issue) => String(issue?.code) === 'capacity_unverified')
  const estimado = growth?.operational?.capacityEstimate || null
  const salones = growth?.operational?.roomCapacity || null
  if (capacidad) {
    const cupo = estimado?.total == null ? null : `${estimado.groups} grupos × ${estimado.perGroup} = ${estimado.total} cupos teóricos`
    const porCompletar = salones && !salones.complete
    lista.push({
      clave: 'capacidad',
      codigo: 'capacity_unverified',
      titulo: porCompletar ? 'Capacidad de salones por completar'
        : salones?.complete ? `Capacidad de salones: ${salones.simultaneousChildren} niños a la vez`
          : estimado?.total == null ? 'Capacidad estimada' : `Capacidad estimada: ${estimado.total} cupos`,
      accion: porCompletar
        ? 'Registra cuántos niños caben al mismo tiempo en cada salón activo. La capacidad total se mostrará cuando estén todos completos.'
        : salones?.complete
          ? `Capacidad declarada en ${salones.activeRooms} salones activos. Para estimar cuántos alumnos puede atender el centro en distintos horarios, falta contrastar grupos y coaches disponibles; la confianza mantiene un máximo de MEDIA.`
          : `Es una estimación de cupos totales${cupo ? ` (${cupo})` : ''}. Registra la capacidad de cada salón y revisa los horarios y coaches disponibles.`,
      items: porCompletar ? (salones.missingRooms.length ? salones.missingRooms.map(s => s.nombre) : ['Agrega al menos un salón activo.']) : [],
      cuantos: 1,
      bloquea: false,
      ganancia: 0,
      dueno: porCompletar ? 'centro' : 'direccion',
      donde: { href: `/centro/${centroId}/grupos#salones`, texto: 'Ir a Coaches y salones' },
    })
  }

  // ── ORDEN ────────────────────────────────────────────────────────────────
  // Lo que desbloquea la proyección primero; dentro de eso, lo más corto antes
  // (una lista que se ve terminable se termina). Después lo que suma puntos de
  // confianza, de mayor a menor ganancia. Al final, lo que no depende del
  // centro.
  const rango = (punto) => {
    if (punto.dueno === 'direccion') return 3
    if (punto.bloquea) return 0
    return punto.ganancia > 0 ? 1 : 2
  }
  const ordenados = [...lista].sort((a, b) =>
    rango(a) - rango(b) ||
    (a.bloquea ? a.cuantos - b.cuantos : b.ganancia - a.ganancia) ||
    a.cuantos - b.cuantos ||
    String(a.clave).localeCompare(String(b.clave))
  ).map((punto) => ({
    ...punto,
    gananciaPuntos: puntos(punto.ganancia),
    gananciaTexto: punto.bloquea
      ? 'Mientras esté, la confianza queda en BAJA'
      : punto.dueno === 'direccion'
        ? 'Techo del sistema: no lo resuelve el centro'
        : puntos(punto.ganancia) > 0
          ? `Recupera ${puntos(punto.ganancia)} ${plural(puntos(punto.ganancia), 'punto', 'puntos')} de confianza`
          : 'Evita que la lista vuelva a crecer',
  }))

  const bloqueantes = ordenados.filter((punto) => punto.bloquea)
  const delCentro = ordenados.filter((punto) => punto.dueno === 'centro')
  const recuperable = puntos(delCentro.reduce((total, punto) => total + punto.ganancia, 0))
  const nivel = String(confianzaMotor?.level || 'low')

  // LA LISTA NUNCA LLEGA A CERO, Y ESO HAY QUE DECIRLO BIEN.
  // `capacity_unverified` la empuja SIEMPRE lib/growth/source.mjs, así que
  // `hay` es true en los seis centros para siempre. Un centro impecable —seis
  // cierres, completitud 1, cobertura 1, sin issues— salía con total:1 y hay:
  // true, con la caja de aviso completa y un resumen que se contradecía a sí
  // mismo ("0 puntos por cargar" bajo el título "Lo que falta por cargar").
  // El punto se sigue diciendo —esconderlo sería mentir— pero deja de gritar:
  // `soloDireccion` le dice a la pantalla que lo pinte en gris y sin borde de
  // aviso, y el resumen dice la verdad de las dos mitades.
  const soloDireccion = ordenados.length > 0 && delCentro.length === 0

  const resumen = !ordenados.length
    ? 'Higiene de datos: este centro no tiene nada pendiente por cargar.'
    : soloDireccion
      ? `Higiene de datos: este centro no tiene nada pendiente por cargar; ${ordenados.length} ${plural(ordenados.length, 'punto depende', 'puntos dependen')} de Dirección.`
      : `Higiene de datos: ${delCentro.length} ${plural(delCentro.length, 'punto', 'puntos')} por cargar en este centro` +
        `${bloqueantes.length ? `, de los cuales ${bloqueantes.length} ${plural(bloqueantes.length, 'mantiene', 'mantienen')} la confianza en baja` : ''}.`

  return {
    centroId,
    hay: ordenados.length > 0,
    total: ordenados.length,
    puntos: ordenados,
    bloqueantes: bloqueantes.length,
    delCentro: delCentro.length,
    soloDireccion,
    recuperable,
    porQue: POR_QUE,
    resumen,
    confianza: {
      nivel,
      meses,
      completitud,
      cobertura,
      // El techo real de HOY es MEDIA para todos: `capacity_unverified` baja
      // cualquier ALTA a MEDIA (lib/growth/metrics.mjs). Decirlo evita que
      // alguien persiga un verde que el sistema no puede dar.
      techo: capacidad ? 'medium' : 'high',
      texto: nivel === 'high' ? 'ALTA' : nivel === 'medium' ? 'MEDIA' : 'BAJA',
    },
    // Frase de cierre: cuánto queda a mano del centro. Sin esto la lista no se
    // siente terminable, y una lista que no se puede terminar deja de leerse.
    cierre: !ordenados.length
      ? 'Los datos de este centro están completos para proyectar.'
      : bloqueantes.length
        ? (bloqueantes.length === 1
          ? 'Ese primer punto mantiene la confianza en BAJA: mientras siga ahí, el semáforo no puede ponerse en verde aunque el centro cumpla las tres metas.'
          : `Los primeros ${bloqueantes.length} puntos mantienen la confianza en BAJA: mientras sigan ahí, el semáforo no puede ponerse en verde aunque el centro cumpla las tres metas.`)
        : recuperable > 0
          ? `Resolviendo lo de arriba se recuperan ${recuperable} ${plural(recuperable, 'punto', 'puntos')} de confianza.`
          : delCentro.length
            // Nada de lo que queda baja la confianza hoy. Decir "se recuperan 0
            // puntos" es una forma rara de decir "esto no urge", y lo que sí
            // hace falta es explicar por qué sigue en la lista.
            ? 'Nada de esto baja la confianza hoy: son los datos que evitan que vuelva a bajar el mes que viene.'
            : 'Lo que queda no lo resuelve el centro.',
  }
}
