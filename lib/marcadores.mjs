// DOS MARCADORES SEPARADOS. NUNCA UN PROMEDIO.
//
// El problema que resuelve este módulo: el checklist de 33 criterios pesaba
// todo igual, así que un centro podía fallar LAS TRES metas de resultado y
// sacar 30/33 = 91% "en verde". "Aromatizante en recepción" valía lo mismo que
// "meta de deserción".
//
//   · PRODUCTO (este módulo) = ¿el centro crece? 3 metas de resultado + el
//     verdicto de crecimiento. MANDA y es lo único que pinta el semáforo.
//   · DISCIPLINA (lib/checklist.js) = las 30 actividades. Es soporte, va
//     subordinada y NO puede maquillar al primero.
//
// Módulo PURO: sin BD, sin React, sin 'use server'. Se testea con `npm test`.

// Única dependencia: "hoy" en hora de Panamá, la misma fuente que usa el resto
// del producto, para que el prorrateo del mes en curso no dependa del reloj de
// quien mira la pantalla (lib/operaciones.js es plano y seguro en el cliente).
import { hoyISO } from './operaciones.js'

// Banda muerta del verdicto de crecimiento. El proyector trabaja con 1 decimal
// (lib/growth/projector.mjs), así que medio niño al mes es ruido de redondeo:
// ±0,5 es el margen mínimo honesto para decir "crece" o "decrece".
export const BANDA_CRECIMIENTO = 0.5

const num = (value, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// "2,7" — un decimal y coma, que es como se lee un número en Panamá.
export const dec1 = (value) => num(value).toFixed(1).replace('.', ',')

const listar = (items) => {
  const xs = items.filter(Boolean)
  if (xs.length <= 1) return xs[0] || ''
  return `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}`
}

// Metas del trimestre, vengan de la fila cruda de `metas` o del objeto que ya
// arma la pantalla del centro. Todo se normaliza a número: Neon devuelve las
// columnas `numeric` como string y "8" > 8.9 no es la comparación que queremos.
export function normalizarMetas(metas) {
  const m = metas || {}
  return {
    nuevos: num(m.nuevos ?? m.meta_nuevos_ingresos_mes, 20),
    desercion: num(m.desercion ?? m.meta_desercion_mes, 8),
    cobranza: num(m.cobranza ?? m.meta_cobranza_max, 1),
  }
}

const DIAS_COBRANZA = ['cob_d1', 'cob_d2', 'cob_d3', 'cob_d4', 'cob_d5']

// Cobranza vencida del mes: el PEOR valor DECLARADO de TODO el mes.
//
// Antes se leía sólo el último día de la última semana, con una cadena `||` que
// además se saltaba los ceros. Las tres fallas iban a favor del centro y se
// verificaron contra producción (Q3-2026, meta ≤3): CALLE 50 puntuaba 2 en
// julio cuando el mes tocó 4; agosto puntuaba 0 cuando tocó 11; y septiembre,
// sin UNA sola fila en kpi_semanas, puntuaba 0 = "cobranza perfecta". Con eso
// CALLE 50 y CONDADO aprobaban la meta de cobranza que en realidad fallan.
//
// Ahora: un mes sin ningún `cob_*` escrito devuelve null = DESCONOCIDO, no 0.
// Cero vencidas hay que declararlo; no se regala por silencio. Y se toma el
// máximo, que es lo que la pantalla ya prometía mostrar ("el peor mes").
export function cobranzaDeclarada(semanas) {
  const valores = []
  for (const semana of semanas || []) {
    for (const dia of DIAS_COBRANZA) {
      const v = semana?.[dia]
      // null/undefined = no registrado. El 0 SÍ cuenta: es una declaración.
      if (v === null || v === undefined || v === '') continue
      const n = Number(v)
      if (Number.isFinite(n)) valores.push(n)
    }
  }
  return valores.length ? Math.max(...valores) : null
}

const sumaDias = (fila, prefijo) =>
  num(fila[`${prefijo}_d1`]) + num(fila[`${prefijo}_d2`]) + num(fila[`${prefijo}_d3`]) +
  num(fila[`${prefijo}_d4`]) + num(fila[`${prefijo}_d5`])

// Serie mensual del trimestre a partir de las filas que ya cargan las pantallas
// (resumen_mes + kpi_semanas con la superposición viva ya aplicada, y los meses
// encadenados de lib/kpi-calc.js). Una sola derivación para que el Resumen y la
// pantalla de Cumplimiento no puedan discrepar en un número.
export function mesesProducto({ months = [], rs = [], ks = [], mesesCalc = [] } = {}) {
  return months.map((mo) => {
    const mes = Number(mo)
    const r = (rs || []).find((x) => Number(x.month) === mes)
    const semanas = (ks || []).filter((x) => Number(x.month) === mes)

    const ventas = semanas.reduce((total, w) => total + sumaDias(w, 'ing'), 0)
    const bajasSemanales = semanas.reduce((total, w) => total + sumaDias(w, 'des'), 0)
    // Mismo criterio que lib/kpi-calc.js:29: el retiro operativo del mes manda
    // sobre la suma semanal cuando el cierre lo declaró.
    const bajas = r?.retiros_operativos_mes != null ? num(r.retiros_operativos_mes) : bajasSemanales

    const cobranza = cobranzaDeclarada(semanas)

    const calc = (mesesCalc || []).find((x) => Number(x.mo) === mes)
    const ninosInicio = calc ? num(calc.ninosInicio) : num(r?.ninos_inicio_mes)
    const nuevosActivos = num(r?.nuevos_activos_mes)
    const ninosFin = calc ? num(calc.ninosFinal) : Math.max(0, ninosInicio + nuevosActivos - bajas)

    // La trampa de los graduados, resuelta con dos números distintos:
    // para JUZGAR LA META se usa la deserción REAL (graduarse es un logro, no
    // una falta); para saber si el centro CRECE se usan las bajas totales, que
    // es lo que hace el proyector (un graduado también deja de ocupar cupo).
    const graduados = num(r?.mot_graduado)
    const desReal = Math.max(0, bajas - graduados)
    const desPct = ninosInicio > 0 ? (desReal / ninosInicio) * 100 : (desReal > 0 ? 100 : 0)

    // ¿Este mes tiene datos DE VERDAD?
    //
    // No se puede preguntar `semanas.length > 0`: la superposición viva
    // (superponerSemanasAuto, lib/kpi-semanal-auto.mjs:149-160) FABRICA 5 filas
    // vacías por cada mes del rango que no esté cerrado — incluidos los meses
    // que todavía no han ocurrido. Verificado contra producción: el centro 2 en
    // Q4-2026 tiene 0 filas crudas en resumen_mes y 0 en kpi_semanas, y aun así
    // llegaban 15 filas superpuestas; el trimestre que aún no empieza se
    // reportaba con "3 meses con datos" y la meta completa de 60 ventas ya
    // fallada. Además dejaba `sinDatos` como código muerto: la rama "Sin datos
    // del trimestre" del semáforo no se podía pintar nunca.
    //
    // Se exige SEÑAL REAL: un cierre mensual, o movimiento registrado, o una
    // cobranza declarada.
    const tieneDatos = Boolean(r) || ventas > 0 || bajasSemanales > 0 || cobranza !== null

    return {
      mesNum: mes,
      ventas, bajas, graduados, desReal, desPct, cobranza,
      cobranzaRegistrada: cobranza !== null,
      ninosInicio, nuevosActivos, ninosFin,
      tieneDatos,
    }
  })
}

// Cuánto de un mes le puedes EXIGIR hoy: 1 si ya terminó, la fracción de días
// transcurridos si es el mes en curso, 0 si todavía no empieza.
//
// Sin esto la meta de ventas del trimestre en curso se cobra completa desde el
// día 1: el 4 de septiembre los seis centros se medían contra 60 aunque sólo
// hubieran transcurrido dos meses y cuatro días, y el 1 de octubre TODOS
// abrirían con P1 fallado (0 ventas contra 20) — un rojo que no se ganó nadie,
// lo puso el calendario.
export function pesoMes(anio, mes, hoy = hoyISO()) {
  const [hy, hm, hd] = String(hoy).split('-').map(Number)
  if (!Number.isFinite(hy) || !anio) return 1
  const periodo = Number(anio) * 100 + Number(mes)
  const periodoHoy = hy * 100 + hm
  if (periodo < periodoHoy) return 1
  if (periodo > periodoHoy) return 0
  const diasDelMes = new Date(hy, hm, 0).getDate()
  return Math.min(1, Math.max(0, hd / diasDelMes))
}

// ── MARCADOR 1 · PRODUCTO ────────────────────────────────────────────────────
// Se CALCULA de la base; no se marca a mano. P1 es del trimestre, P2 y P3 se
// cumplen sólo si TODOS los meses con datos están dentro de meta.
//
// `anio` y `hoy` habilitan el prorrateo del mes en curso y —sobre todo— el
// control de REGISTRO: un mes cerrado del trimestre que nadie registró NO puede
// desaparecer del denominador.
export function evaluarProducto({ meses = [], metas = null, anio = null, hoy = hoyISO() } = {}) {
  const meta = normalizarMetas(metas)
  const serie = (meses || []).map((m) => {
    const cobranzaCruda = m.cobranza
    const cobranzaRegistrada = m.cobranzaRegistrada !== undefined
      ? Boolean(m.cobranzaRegistrada)
      : (cobranzaCruda !== null && cobranzaCruda !== undefined && cobranzaCruda !== '')
    return {
      mesNum: num(m.mesNum),
      nombre: m.mes || m.nombre || null,
      ventas: num(m.ventas ?? m.nuevos),
      bajas: num(m.bajas ?? m.desercion),
      graduados: num(m.graduados),
      ninosInicio: num(m.ninosInicio),
      cobranza: cobranzaRegistrada ? num(cobranzaCruda) : null,
      cobranzaRegistrada,
      tieneDatos: m.tieneDatos !== false,
      // Sin año no se puede saber qué mes ya pasó: se asume que TODOS son
      // exigibles, que es el supuesto conservador (nunca regala verde).
      // Cada mes puede traer el suyo (`m.anio`) para rangos multi-año, como el
      // panel del supervisor, que no siempre mira un trimestre.
      peso: (m.anio ?? anio) ? pesoMes(m.anio ?? anio, num(m.mesNum), hoy) : 1,
    }
  })
  const conDatos = serie.filter((m) => m.tieneDatos)
  const mesesConDatos = conDatos.length

  // Meses ya CERRADOS del trimestre: los que era obligatorio registrar. El mes
  // en curso no entra —todavía se está viviendo— pero sí aporta meta a prorrata.
  const mesesCerrados = serie.filter((m) => m.peso >= 1)
  const cerradosSinRegistrar = mesesCerrados.filter((m) => !m.tieneDatos)
  const conDatosSinCobranza = conDatos.filter((m) => !m.cobranzaRegistrada)

  const ventasQ = conDatos.reduce((total, m) => total + m.ventas, 0)
  // LA META NO SE ENCOGE CUANDO NO REGISTRAS.
  //
  // Aquí renacía el 88%: `metaQ = meta.nuevos × mesesConDatos` hacía que un mes
  // sin fila desapareciera del numerador Y del denominador. Comprobado con la
  // función real: mismo centro, ventas 22/8/22 y agosto con 12% de deserción y
  // 9 vencidas. Con los 3 meses registrados → 3 metas falladas, AMARILLO. Con
  // agosto oculto → 0 metas falladas, 44 de 40, VERDE. Ocultar el mes malo
  // pintaba el centro de verde.
  //
  // La meta ahora sale del CALENDARIO (lo que ya se puede exigir), no de lo que
  // alguien tuvo a bien registrar.
  const pesoTotal = serie.reduce((total, m) => total + m.peso, 0)
  const metaQ = Math.round(meta.nuevos * pesoTotal)
  const graduadosQ = conDatos.reduce((total, m) => total + m.graduados, 0)
  const bajasQ = conDatos.reduce((total, m) => total + m.bajas, 0)

  const desercionMeses = conDatos.map((m) => {
    const desReal = Math.max(0, m.bajas - m.graduados)
    // Sin población al inicio no hay porcentaje que medir: un centro que abre
    // con 0 niños y pierde 1 daba 100% de deserción y reprobaba la meta por
    // aritmética, no por gestión. Eso es "no evaluable", no "falla".
    const evaluable = m.ninosInicio > 0
    const pct = evaluable ? (desReal / m.ninosInicio) * 100 : null
    return { ...m, desReal, pct, evaluable, dentro: evaluable ? pct <= meta.desercion : null }
  })
  const desRealQ = desercionMeses.reduce((total, m) => total + m.desReal, 0)
  const desercionEvaluables = desercionMeses.filter((m) => m.evaluable)
  const desercionFuera = desercionMeses.filter((m) => m.dentro === false)
  const peorDesercion = desercionEvaluables.length
    ? [...desercionEvaluables].sort((a, b) => b.pct - a.pct)[0]
    : null

  // Sólo se juzgan los meses con cobranza DECLARADA. Un mes en blanco no
  // aprueba la meta: se reporta como sin registrar y bloquea el verde abajo.
  const cobranzaEvaluables = conDatos.filter((m) => m.cobranzaRegistrada)
  const cobranzaFuera = cobranzaEvaluables.filter((m) => m.cobranza > meta.cobranza)
  const peorCobranza = cobranzaEvaluables.length
    ? [...cobranzaEvaluables].sort((a, b) => b.cobranza - a.cobranza)[0]
    : null

  // Sin un solo mes con datos no se afirma nada: ni cumple ni falla.
  const sinDatos = mesesConDatos === 0
  const P1 = sinDatos || pesoTotal <= 0 ? null : ventasQ >= metaQ
  const P2 = sinDatos || !desercionEvaluables.length ? null : desercionFuera.length === 0
  const P3 = sinDatos || !cobranzaEvaluables.length ? null : cobranzaFuera.length === 0

  // EL REGISTRO ES PARTE DEL PRODUCTO. Mientras falte un mes cerrado o su
  // cobranza, el trimestre no está contado y el verde queda prohibido.
  const registroCompleto = !sinDatos && cerradosSinRegistrar.length === 0 && conDatosSinCobranza.length === 0

  const detalle = [
    {
      clave: 'meta_nuevos_ingresos',
      etiqueta: 'Meta de nuevos ingresos',
      corta: 'ventas',
      cumple: P1,
      valor: `${ventasQ} de ${metaQ}`,
      meta: `${meta.nuevos} por mes`,
      pct: metaQ > 0 ? Math.round((ventasQ / metaQ) * 100) : null,
    },
    {
      clave: 'meta_desercion',
      etiqueta: 'Meta de deserción real',
      corta: 'deserción',
      cumple: P2,
      valor: peorDesercion ? `${dec1(peorDesercion.pct)}%` : '—',
      // La comparación del código es `<=`; la etiqueta decía "< 8%". Un mes de
      // 8,00% clavado se aprobaba mientras la pantalla prometía "menor que 8".
      // Texto y código dicen ahora lo mismo.
      meta: `≤ ${meta.desercion}% mensual`,
      pct: null,
      peorMes: peorDesercion,
      mesesFuera: desercionFuera.length,
    },
    {
      clave: 'meta_cobranza',
      etiqueta: 'Meta de cobranza',
      corta: 'cobranza',
      cumple: P3,
      valor: peorCobranza ? `${peorCobranza.cobranza} vencidas` : 'sin registrar',
      meta: `≤ ${meta.cobranza}`,
      pct: null,
      peorMes: peorCobranza,
      mesesFuera: cobranzaFuera.length,
    },
  ]

  const metasQueFallan = detalle.filter((d) => d.cumple === false).map((d) => d.corta)

  return {
    meta, sinDatos, mesesConDatos, mesesDelTrimestre: serie.length,
    P1, P2, P3,
    metasFallidas: metasQueFallan.length,
    metasEvaluables: [P1, P2, P3].filter((p) => p !== null).length,
    metasQueFallan,
    ventasQ, metaQ,
    desRealQ, bajasQ, graduadosQ,
    peorDesercion, desercionFuera: desercionFuera.length,
    peorCobranza, cobranzaFuera: cobranzaFuera.length,
    // Estado del REGISTRO — viaja siempre con el marcador para que el
    // denominador esté a la vista, igual que en la tarjeta de Disciplina.
    registroCompleto,
    mesesCerrados: mesesCerrados.length,
    mesesSinRegistrar: cerradosSinRegistrar.map((m) => m.mesNum),
    mesesSinCobranza: conDatosSinCobranza.map((m) => m.mesNum),
    detalle,
    serie: desercionMeses,
  }
}

// ── VERDICTO DE CRECIMIENTO ──────────────────────────────────────────────────
// Fuente única: growth.projection.scenarios.base.monthlyNet, que el motor ya
// calcula con MEDIANAS de los 6 meses cerrados (lib/growth/projector.mjs).
// No se reimplementa ni se sustituye por una resta de dos cierres: para ANCLAS
// la resta simple da +4 ("crece") por un pico aislado de marzo; la mediana da
// -2,7 (decrece), que es la verdad.
export function verdictoCrecimiento(monthlyNet) {
  if (monthlyNet == null) return 'INDETERMINADO'
  const net = Number(monthlyNet)
  if (!Number.isFinite(net)) return 'INDETERMINADO'
  if (net >= BANDA_CRECIMIENTO) return 'CRECE'
  if (net <= -BANDA_CRECIMIENTO) return 'DECRECE'
  return 'PLANO'
}

export const CRECIMIENTO_TEXTO = {
  CRECE: 'crece',
  PLANO: 'plano',
  DECRECE: 'decrece',
  INDETERMINADO: 'sin tendencia medible',
}

// ── SEMÁFORO ─────────────────────────────────────────────────────────────────
// Lo pinta SÓLO Producto. Nunca el promedio con Disciplina.
// El color jamás es el único portador: cada estado viaja con `estado` (palabra),
// `forma` (símbolo) y `motivo` (frase con números), para daltónicos y para el
// papel en blanco y negro.
export function semaforo({
  metasFallidas = 0,
  metasQueFallan = [],
  crecimiento = 'INDETERMINADO',
  netMensual = null,
  confianza = null,
  sinDatos = false,
  // Registro del trimestre: si falta un mes cerrado o su cobranza, el
  // trimestre no está contado y el verde no sale.
  registroCompleto = true,
  mesesSinRegistrar = [],
  mesesSinCobranza = [],
  // Medianas del motor: graduados y salidas totales por mes. Sirven para no
  // llamar "pérdida" a lo que en realidad es gente que terminó el programa.
  graduadosMedianos = null,
  retirosMedianos = null,
  // `true` cuando la tendencia no se pudo CALCULAR (fallo de red/motor), que no
  // es lo mismo que "no hay tendencia".
  crecimientoNoDisponible = false,
} = {}) {
  const falladas = Math.max(0, num(metasFallidas))
  const net = netMensual == null ? null : Number(netMensual)
  const magnitud = net == null ? null : dec1(Math.abs(net))
  const confianzaBaja = confianza === 'low'
  const faltaRegistro = !registroCompleto

  // LA TRAMPA DE LOS GRADUADOS, EN EL COLOR.
  // El saldo de población usa BAJAS TOTALES a propósito (un graduado también
  // deja el cupo), y eso está bien para saber si el centro crece. Pero un
  // centro que decrece PORQUE está graduando no puede leer en rojo "está
  // perdiendo niños": graduarse es el trabajo terminado. Hoy no muerde —las
  // medianas de graduados son 0 en 5 de los 6 centros—, pero eso es un
  // accidente de la distribución, no una defensa: en cuanto un centro maduro
  // gradúe de forma sostenida, entra en la mediana y pinta rojo por éxitos.
  //
  // Hacen falta LAS DOS condiciones, y la segunda es la que evita un perdón
  // inmerecido: comparar los graduados sólo contra el NETO es tramposo, porque
  // en un centro con mucha rotación el neto es pequeño (las altas casi
  // compensan las bajas) y cualquier graduación parece dominarlo. Corrido
  // contra producción, CALLE 50 caía −1,7/mes con mediana de 1 graduado y de
  // 10,5 salidas: el graduado "explicaba" el 59% del neto, pero el centro se
  // está desangrando (9,5 de cada 10,5 salidas son deserción real) y tiene que
  // seguir en ROJO. Por eso se exige además que graduarse sea de verdad el
  // motivo dominante de salida.
  const gradMed = graduadosMedianos == null ? null : Number(graduadosMedianos)
  const salidasMed = retirosMedianos == null ? null : Number(retirosMedianos)
  const decrecePorGraduacion = Boolean(
    crecimiento === 'DECRECE' && net != null && gradMed != null &&
    gradMed > 0 && gradMed >= Math.abs(net) / 2 &&
    salidasMed != null && salidasMed > 0 && gradMed >= salidasMed / 2
  )

  // ── R0 · REGLA DURA ────────────────────────────────────────────────────────
  // No se puede estar en VERDE con una meta de resultado en "No". Sin
  // excepción. Va como guarda explícita y aislada —no como efecto lateral de
  // ninguna fórmula de abajo— porque es LA regla que Fernando pidió: el
  // producto valioso del administrador es que el centro crezca, y un centro que
  // falla una meta de resultado no lo está cumpliendo por muchas casillas que
  // marque. La ignorancia tampoco da verde: sin datos, tampoco.
  // A la regla dura se suma el REGISTRO: un trimestre a medio contar tampoco
  // da verde, porque es exactamente la forma del bug original (un número bueno
  // sobre un denominador incompleto).
  const verdeProhibido = sinDatos || falladas >= 1 || faltaRegistro

  let color = 'amarillo'
  // R1 · ROJO: falla metas Y decrece. Ojo: la confianza baja NO bloquea el
  // rojo. Si estás perdiendo niños y fallando metas, eso es real aunque falten
  // cierres; sólo el verde exige datos completos. Lo único que sí baja el rojo
  // es que la caída sea, en su mayoría, gente que se graduó.
  if (falladas >= 1 && crecimiento === 'DECRECE' && !decrecePorGraduacion) color = 'rojo'
  // R2 · VERDE: cumple las 3 metas Y crece Y hay datos para afirmarlo.
  else if (!verdeProhibido && crecimiento === 'CRECE' && !confianzaBaja) color = 'verde'
  // R3 · AMARILLO: todo lo demás (exactamente uno de los dos males, o sin dato).
  else color = 'amarillo'

  // Segunda guarda de R0, a propósito redundante: si algún día alguien toca las
  // ramas de arriba, el verde con una meta en "No" sigue sin poder salir.
  if (color === 'verde' && verdeProhibido) color = 'amarillo'

  const estado = color === 'rojo' ? 'ALERTA ROJA' : color === 'verde' ? 'EN VERDE' : 'ATENCIÓN'
  const forma = color === 'rojo' ? '▲' : color === 'verde' ? '●' : '◆'

  // "Julio y Agosto" — los meses que faltan, con nombre y todo.
  const nombresMes = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  const listaMeses = (ms) => listar((ms || []).map((m) => nombresMes[Number(m) - 1]).filter(Boolean))
  const pendientes = []
  if ((mesesSinRegistrar || []).length) pendientes.push(`falta el cierre de ${listaMeses(mesesSinRegistrar)}`)
  if ((mesesSinCobranza || []).length) pendientes.push(`falta la cobranza de ${listaMeses(mesesSinCobranza)}`)
  const fraseRegistro = pendientes.length ? ` Para poder ponerse en verde, ${listar(pendientes)}.` : ''
  const parteGraduados = decrecePorGraduacion ? `, de los cuales ${dec1(gradMed)} son graduaciones` : ''

  let titulo, motivo
  if (color === 'rojo') {
    titulo = 'El centro no está creciendo'
    motivo = `El centro está perdiendo ${magnitud} niños al mes${parteGraduados} y falla ${falladas} de 3 metas.`
  } else if (color === 'verde') {
    titulo = 'El centro crece y cumple'
    motivo = `Creces +${magnitud} niños/mes y cumples las 3 metas.`
  } else if (sinDatos) {
    titulo = 'Sin datos del trimestre'
    motivo = 'No hay un solo mes con datos: no se puede declarar que el centro va bien.'
  } else if (decrecePorGraduacion) {
    // Nunca en rojo por graduar. El número se dice entero igual.
    titulo = 'El centro baja, pero por graduaciones'
    motivo = `El saldo cae ${magnitud} niños/mes y ${dec1(gradMed)} de esa caída son graduaciones: eso es el programa terminado, no deserción.${falladas >= 1 ? ` Aun así fallas la meta de ${listar(metasQueFallan)}.` : ''}`
  } else if (crecimientoNoDisponible) {
    // No es lo mismo "no hay tendencia" que "no pude calcularla". Si el motor
    // falló, el usuario tiene que enterarse de que le falta media pantalla.
    titulo = 'No se pudo medir el crecimiento'
    motivo = falladas >= 1
      ? `No se pudo calcular la tendencia; el color sólo refleja las metas, y fallas ${falladas} de 3.`
      : 'No se pudo calcular la tendencia del centro: el color sólo refleja las metas. Vuelve a cargar la página.'
  } else if (crecimiento === 'INDETERMINADO') {
    titulo = 'No se sabe si el centro crece'
    motivo = falladas >= 1
      ? `Faltan cierres para medir la tendencia y ya fallas ${falladas} de 3 metas.`
      : 'Faltan cierres en la ventana: no hay tendencia medible que confirme que el centro crece.'
  } else if (falladas === 0 && faltaRegistro) {
    titulo = 'Cumples, pero el trimestre está a medio registrar'
    motivo = `Las metas que se pueden juzgar están en verde, pero el trimestre no está contado completo.${fraseRegistro}`
  } else if (falladas === 0 && crecimiento === 'DECRECE') {
    titulo = 'Cumples las metas pero el centro decrece'
    motivo = `Cumples las metas pero el centro decrece ${magnitud} niños/mes.`
  } else if (falladas === 0 && crecimiento === 'PLANO') {
    titulo = 'Cumples las metas pero el centro está plano'
    motivo = `Cumples las metas y el centro no se mueve (${magnitud} niños/mes). Quedarse quieto no acerca el Nivel.`
  } else if (falladas === 0) {
    titulo = 'Creces, pero faltan datos para confirmarlo'
    motivo = `Creces ${magnitud} niños/mes, pero la ventana está incompleta: no se declara victoria con datos a medias.`
  } else if (crecimiento === 'CRECE') {
    titulo = 'Creces, pero fallas metas de resultado'
    motivo = `Creces ${magnitud}/mes pero fallas la meta de ${listar(metasQueFallan)}.`
  } else {
    titulo = 'El centro está plano y fallas metas'
    motivo = `El centro no se mueve (${magnitud} niños/mes) y fallas la meta de ${listar(metasQueFallan)}.`
  }

  return {
    color, estado, forma, titulo, motivo,
    crecimiento,
    netMensual: net,
    metasFallidas: falladas,
    registroCompleto: !faltaRegistro,
    decrecePorGraduacion,
    crecimientoNoDisponible: Boolean(crecimientoNoDisponible),
    // Para aria-label: el lector de pantalla no ve ni el color ni la forma.
    resumen: `${estado}. ${titulo}. ${motivo}`,
  }
}
