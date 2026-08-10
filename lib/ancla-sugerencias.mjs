// Sugerencias de ancla para el niño SIN plan (R3, g1-12 a mano — spec
// docs/superpowers/specs/2026-08-08-remodelado-grupo-nino-design.md). Cálculo
// PURO, sin BD: app/actions/estudiantes.js (fijarInicioNivel) es el caller con
// transacción; aquí vive lo que se prueba en frío con node:test.
//
// El backfill (lib/backfill-anclas-nivel.mjs) resolvió a todos los niños cuya
// historia lo DEMOSTRABA y dejó fuera A PROPÓSITO a los demás: su evento de
// inscripción declara un nivel distinto al que cursan hoy, hay movimientos que
// no calzan o el aula no coincide. Esos quedan con el chip "sin plan" y su
// ancla la pone un humano desde la pantalla. Este módulo NO adivina por él:
// solo ordena las fuentes que el manual permite, cada una con la fecha REAL
// que la sostiene y su explicación. Si una fuente no existe, la opción NO se
// ofrece — jamás una fecha inventada.
//
// Orden de probabilidad (el mismo criterio de la cascada del backfill):
//   1. con_el_grupo       — arrancó el nivel junto al aula (referencia del grupo).
//   2. con_la_cohorte     — arrancó con sus compañeros de nivel (moda de sus anclas).
//   3. desde_su_inscripcion — llegó a mitad de camino (su inscripción canónica).
//   4. manual             — la escribe el admin (siempre disponible).
//
// Formas de entrada (lo que el caller debe traer de la BD):
//   nino:        { id, itinerario, nivel, estado, grupo_id }
//   grupo:       { id, itinerario, pais?, itinerario_clases, horarios[], fecha_inicio_clases }
//   companeros:  los OTROS niños del grupo ({ id, itinerario, nivel, estado, fecha_inicio_nivel })
//   eventos:     los eventos del niño de TIPOS_EVENTO_ANCLA, con las columnas
//                que hacen falta para verificarlos:
//                { id, tipo, fecha, a_nivel, a_grupo_id, estudiante_id? }.
//                Sin `a_nivel`/`a_grupo_id` no hay nada que comprobar y las
//                fuentes de la cascada se caen — por diseño: no se adivina.
//   hoy:         fecha de negocio iso10 Panamá (el módulo no mira el reloj)

import { anclaDeAlta } from './retiros.mjs'
import { calendarioVersionadoDe, planNino, posicionPlanNino } from './plan-nino.mjs'
import { MOVIMIENTOS } from './backfill-anclas-nivel.mjs'

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

// Fecha de la BD (Date del driver de Neon) o string ISO → 'AAAA-MM-DD' | null.
const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}
// Una fecha usable es la que EXISTE en el calendario: '2026-13-01' y
// '2026-02-31' pasan el regex y no son días. Ninguna fuente los propone.
const esFecha = (f) => {
  if (!f || !RE_FECHA.test(f)) return false
  const [y, m, d] = f.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

// itinerario_clases llega como objeto (JSONB) o, defensivamente, como string.
const jsonDe = (v) => {
  if (v == null) return null
  if (typeof v === 'string') {
    try { return JSON.parse(v) } catch { return null }
  }
  return typeof v === 'object' ? v : null
}

// Espejo de compareEventos (lib/backfill-anclas-nivel.mjs): fecha iso10 y luego id.
const compareEventos = (a, b) => {
  const porFecha = String(iso10(a?.fecha) || '').localeCompare(String(iso10(b?.fecha) || ''))
  if (porFecha !== 0) return porFecha
  return Number(a?.id || 0) - Number(b?.id || 0)
}

// Las cuatro fuentes posibles: el `origen` que el evento de rastro guarda en su
// detalle (app/actions/estudiantes.js valida contra esta lista).
export const ORIGENES_ANCLA = ['con_el_grupo', 'con_la_cohorte', 'desde_su_inscripcion', 'manual']

// Los eventos que el caller tiene que traer para que las fuentes se puedan
// VERIFICAR: la inscripción canónica y todo lo que pudo re-anclar al niño
// (MOVIMIENTOS del backfill). El SQL de app/actions/estudiantes.js filtra por
// esta lista — traer solo 'inscripcion' dejaba ciega la comprobación del
// peldaño 3 y el aula terminaba prestándole su fecha a un niño trasladado.
export const TIPOS_EVENTO_ANCLA = [...MOVIMIENTOS, 'inscripcion']

const ETIQUETAS = {
  con_el_grupo: 'Arrancó con el grupo',
  con_la_cohorte: 'Arrancó con sus compañeros',
  desde_su_inscripcion: 'Desde su inscripción',
  manual: 'Escribir la fecha',
}

// ── Validación de la fecha (la misma que aplica el server) ──────────────────

// Tope razonable del ancla: hoy Panamá + 1 año. El ancla declara cuándo
// EMPEZÓ el nivel que el niño ya cursa, así que el futuro lejano es siempre un
// dedo pesado en el teclado (2036 por 2026). Un margen de un año deja pasar la
// programación legítima de un nivel que arranca más adelante.
export function topeAncla(hoy) {
  const h = iso10(hoy)
  if (!esFecha(h)) return null
  const [y, m, d] = h.split('-').map(Number)
  return new Date(Date.UTC(y + 1, m - 1, d)).toISOString().slice(0, 10)
}

// Mensaje de error de la fecha propuesta, o null si es aceptable. La usan
// fijarInicioNivel y fijarInicioNivelLote (misma validación en ambas).
export function errorFechaAncla(fecha, hoy) {
  const f = iso10(fecha)
  if (!esFecha(f)) {
    return 'La fecha de inicio de nivel va en formato AAAA-MM-DD y tiene que existir en el calendario.'
  }
  const tope = topeAncla(hoy)
  if (!tope) return 'Fecha de negocio inválida.'
  if (f > tope) {
    return `El inicio de nivel no puede pasar del ${tope} (hoy + 1 año): el ancla declara cuándo EMPEZÓ el nivel que el niño cursa, no una fecha suelta.`
  }
  return null
}

// ── Moda de las anclas de la cohorte ────────────────────────────────────────

// La fecha que más compañeros comparten; empate → la MÁS ANTIGUA (el grupo
// arrancó ahí y los demás se sumaron después). → { fecha, cuantos, distintas }
export function modaDeAnclas(fechas) {
  const validas = (fechas || []).map(iso10).filter(esFecha).sort()
  if (!validas.length) return null
  const cuenta = new Map()
  for (const f of validas) cuenta.set(f, (cuenta.get(f) || 0) + 1)
  let mejor = null
  // `validas` va ordenada ascendente y el Map conserva el orden de inserción:
  // recorrerlo con `>` estricto deja ganar a la primera (la más antigua).
  for (const [fecha, cuantos] of cuenta) {
    if (!mejor || cuantos > mejor.cuantos) mejor = { fecha, cuantos }
  }
  return { ...mejor, distintas: cuenta.size }
}

// ── ¿Qué tumba a la referencia del aula como fuente? ────────────────────────

// Espejo EXACTO de los cortes del peldaño 3 del backfill
// (lib/backfill-anclas-nivel.mjs:169-192). Que coincidan itinerario y nivel NO
// basta: si el niño se movió de aula, o se movió DESPUÉS de que arrancó el
// nivel de la referencia, ese día él estaba en otro salón — el traslado le
// buscó SU propia ancla (g1-9) y la del aula lo adelantaría tantas semanas
// como el aula llevara andando. → motivo (string) o null si nada estorba.
function trabaDeLaReferencia(movimientos, refInicio, grupoActualId) {
  for (const m of movimientos) {
    if (!esFecha(iso10(m?.fecha))) return 'movimiento_sin_fecha'
  }
  const ultimo = movimientos[movimientos.length - 1] || null
  if (ultimo?.a_grupo_id != null && String(ultimo.a_grupo_id) !== String(grupoActualId ?? '')) {
    return 'movimiento_discordante_grupo'
  }
  if (movimientos.some((m) => iso10(m.fecha) > refInicio)) return 'movimiento_posterior_a_referencia'
  return null
}

// ── Sugerencias ─────────────────────────────────────────────────────────────

// Texto de la posición que ESA fecha produciría hoy: lo que el admin necesita
// para escoger sin adivinar ("con esta fecha el niño va por la semana 4").
// Sin plan derivable (grupo sin horario, nivel raro) no se dice nada.
function textoPosicion(posicion) {
  if (!posicion) return null
  if (posicion.estado === 'en_curso') {
    const s = `S${(posicion.indice ?? 0) + 1}`
    return `con esta fecha va por ${s}${posicion.semana?.etiqueta ? ` (${posicion.semana.etiqueta})` : ''}`
  }
  if (posicion.estado === 'cerrado') return 'con esta fecha su nivel ya habría cerrado'
  if (posicion.estado === 'por_iniciar') return 'con esta fecha su nivel arranca más adelante'
  return null
}

// Opciones de ancla para un niño, en orden de probabilidad, + la recomendada
// (la clave de la primera aplicable; 'manual' siempre cierra la lista).
// → { opciones: [{ clave, etiqueta, fecha, explicacion }], recomendada }
// `memo` (crearMemoPlanes) permite compartir el cache de planes cuando la
// pantalla pide sugerencias para varios niños de una vez.
export function sugerenciasAncla({ nino, grupo = null, companeros = [], eventos = [], hoy, pais = 'PA' } = {}, memo = null) {
  if (!nino) return { opciones: [], recomendada: null }

  const nivel = Number(nino.nivel)
  const ref = jsonDe(grupo?.itinerario_clases)
  const paisPlan = grupo?.pais === 'VE' || grupo?.pais === 'PA' ? grupo.pais : pais
  const calendario = grupo ? calendarioVersionadoDe(grupo) : []
  const excepciones = ref?.excepciones || []
  // Posición que produciría una fecha candidata (mismo motor único g1-13).
  const posicionDe = (fecha) =>
    posicionPlanNino(
      planNino({ ancla: fecha, nivel, pais: paisPlan, calendarioVersionado: calendario, excepciones }, memo),
      hoy,
    )

  // Los eventos del propio niño, en el orden del backfill (fecha, luego id).
  const grupoActualId = nino.grupo_id != null ? nino.grupo_id : grupo?.id ?? null
  const propios = (eventos || [])
    .filter((e) => e && (e.estudiante_id == null || String(e.estudiante_id) === String(nino.id)))
    .sort(compareEventos)
  const movimientos = propios.filter((e) => MOVIMIENTOS.includes(e.tipo))
  const inscripciones = propios.filter((e) => e.tipo === 'inscripcion')

  const opciones = []
  const agregar = (clave, fecha, razon) => {
    const cola = textoPosicion(posicionDe(fecha))
    opciones.push({
      clave,
      etiqueta: ETIQUETAS[clave],
      fecha,
      explicacion: cola ? `${razon} — ${cola}.` : `${razon}.`,
    })
  }

  // 1. con_el_grupo: el aula arrancó ESE nivel en esa fecha. Filtro COMPLETO
  //    del peldaño 3 del backfill: el niño cursa el nivel de la referencia, el
  //    itinerario del grupo es el suyo (un Tiny en aula Kids no comparte plan)
  //    y NINGÚN movimiento suyo la contradice (trabaDeLaReferencia). Un niño
  //    que llegó al aula con el nivel andando no arrancó con el grupo: esa
  //    fecha le adelantaría el chip, el cierre y el aviso de liberación.
  const refInicio = iso10(ref?.fecha_inicio)
  const refNivel = Number(ref?.nivel)
  if (
    esFecha(refInicio) &&
    Number.isFinite(refNivel) &&
    refNivel === nivel &&
    grupo?.itinerario === nino.itinerario &&
    !trabaDeLaReferencia(movimientos, refInicio, grupoActualId)
  ) {
    agregar('con_el_grupo', refInicio, `El aula arrancó el nivel ${nivel} el ${refInicio} y el niño va en ese nivel`)
  }

  // 2. con_la_cohorte: compañeros del MISMO itinerario y nivel que ya tienen
  //    ancla. Moda; empate → la más antigua.
  const anclasCohorte = (companeros || [])
    .filter(
      (c) =>
        c &&
        String(c.id) !== String(nino.id) &&
        (c.estado === 'activo' || c.estado === 'baja_potencial') &&
        c.itinerario === nino.itinerario &&
        Number(c.nivel) === nivel,
    )
    .map((c) => iso10(c.fecha_inicio_nivel))
    .filter(esFecha)
  const moda = modaDeAnclas(anclasCohorte)
  if (moda) {
    const plural = moda.cuantos === 1 ? 'compañero' : 'compañeros'
    const ruido = moda.distintas > 1 ? ` (en el grupo hay ${moda.distintas} anclas distintas para ese nivel: verifica)` : ''
    agregar(
      'con_la_cohorte',
      moda.fecha,
      `${moda.cuantos} ${plural} de ${nino.itinerario} ${nivel} ya tienen su ancla el ${moda.fecha}${ruido}`,
    )
  }

  // 3. desde_su_inscripcion: el niño entró y nunca se movió, así que sigue en
  //    el nivel con el que llegó. Espejo del peldaño 2 del backfill
  //    (lib/backfill-anclas-nivel.mjs:116-149): la inscripción solo sostiene el
  //    ancla si es la ÚNICA, no hay movimientos de por medio, apunta a este
  //    mismo grupo y su `a_nivel` es EL NIVEL QUE CURSA HOY.
  //    Sin a_nivel no hay nada que verificar (¿siguió en su nivel de entrada?)
  //    y con a_nivel distinto estamos exactamente en el caso que el backfill
  //    marcó 'inscripcion_discordante_nivel' y se negó a escribir: su
  //    inscripción es de OTRO nivel y esa fecha no es el arranque del actual.
  //    En los dos casos la fuente NO se ofrece. Cuando sí concuerda, la fecha
  //    se acota con la del aula (g1-8, anclaDeAlta): nadie arranca su nivel
  //    antes de que el grupo diera su primera clase. Ambas son REALES.
  const ins = !movimientos.length && inscripciones.length === 1 ? inscripciones[0] : null
  const fechaIns = iso10(ins?.fecha)
  const nivelIns = ins?.a_nivel == null ? null : Number(ins.a_nivel)
  const mismoGrupo = ins?.a_grupo_id == null || String(ins.a_grupo_id) === String(grupoActualId ?? '')
  if (esFecha(fechaIns) && nivelIns === nivel && mismoGrupo) {
    const fecha = anclaDeAlta(fechaIns, grupo?.fecha_inicio_clases)
    if (esFecha(fecha)) {
      const corrida = fecha !== fechaIns
        ? ` pero el grupo empezó clases el ${fecha}, y el nivel no arranca antes que el aula`
        : ''
      agregar('desde_su_inscripcion', fecha, `Su inscripción quedó registrada el ${fechaIns} en el nivel ${nivel}${corrida}`)
    }
  }

  // 4. manual: siempre. Sin fecha propuesta — la escribe el admin.
  opciones.push({
    clave: 'manual',
    etiqueta: ETIQUETAS.manual,
    fecha: null,
    explicacion: 'Ninguna fuente lo demuestra sola: escribe tú el día en que el niño empezó el nivel que cursa.',
  })

  return { opciones, recomendada: opciones[0].clave }
}
