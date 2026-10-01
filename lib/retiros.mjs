// Reglas puras del remodelado por niño que tocan a estudiantes (2026-08-08):
// ancla en el alta (g1-8), corrección de fecha_inscripcion (g1-19), evidencia
// de asistencia (g1-23), retiro programado (g1-24) y corrección del motivo de
// un retiro (2026-10). Cálculo puro, sin BD: app/actions/estudiantes.js,
// app/actions/coach.js, lib/retiros-service.js y lib/motivo-retiro-service.mjs
// son los callers con transacción; aquí vive lo que se prueba en frío.
// Este módulo también llega al navegador (vía ancla-sugerencias): solo importa
// módulos puros y con extensión.
import { MOTIVOS_RETIRO } from './operaciones.js'
import { usaIniciosClaseOperativos } from './inicios-clase.mjs'

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/

// Fecha de la BD (Date del driver de Neon) o string ISO → 'AAAA-MM-DD' | null.
const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

// ── Ancla en el alta (g1-8) ─────────────────────────────────────────────────

// Ancla del niño que entra CON grupo: max(fecha de inscripción/colocación,
// fecha_inicio_clases del grupo). El niño nunca arranca su nivel antes de que
// el grupo dé clases, ni antes de su propia venta. Sin fecha de grupo (legacy
// NULL) rige la de inscripción; sin ninguna → null (nada se inventa).
export function anclaDeAlta(fechaInscripcion, fechaInicioClasesGrupo) {
  const ins = iso10(fechaInscripcion)
  const grupo = iso10(fechaInicioClasesGrupo)
  if (ins && !RE_FECHA.test(ins)) return null
  if (!ins) return grupo && RE_FECHA.test(grupo) ? grupo : null
  if (!grupo || !RE_FECHA.test(grupo)) return ins
  return ins > grupo ? ins : grupo
}

// ── Corrección de fecha_inscripcion (g1-19) ─────────────────────────────────

// Los 4 periodos que la corrección debe bloquear ANTES de tocar nada: ficha
// vieja, year/month declarado del evento canónico, periodo real de la fecha
// del evento y periodo nuevo. Duplicados los depura bloquearMesesEditables;
// aquí solo se listan los válidos (una ficha vieja NULL no aporta periodo).
export function periodosCorreccionInscripcion({ fechaFichaVieja, evento, fechaNueva } = {}) {
  const periodos = []
  const de = (fecha) => {
    const f = iso10(fecha)
    if (!f || !RE_FECHA.test(f)) return null
    const [y, m] = f.split('-').map(Number)
    return { year: y, month: m }
  }
  const vieja = de(fechaFichaVieja)
  if (vieja) periodos.push(vieja)
  const yEv = Number(evento?.year)
  const mEv = Number(evento?.month)
  if (Number.isInteger(yEv) && Number.isInteger(mEv)) periodos.push({ year: yEv, month: mEv })
  const real = de(evento?.fecha)
  if (real) periodos.push(real)
  const nueva = de(fechaNueva)
  if (nueva) periodos.push(nueva)
  return periodos
}

// ── Evidencia de asistencia (g1-23) ─────────────────────────────────────────

// Todas las fechas de clase REALES del itinerario de referencia del grupo
// (semanas[].fechas ya es la verdad aplanada del calendario versionado, R2b:
// pasado conservado + sufijo vigente). Set para el chequeo O(1).
export function fechasDeClase(itinerario) {
  const out = new Set()
  for (const s of itinerario?.semanas || []) {
    for (const f of s.fechas || []) {
      const f10 = iso10(f)
      if (f10 && RE_FECHA.test(f10)) out.add(f10)
    }
  }
  return out
}

// Valida la fecha de una marca de asistencia (g1-23): debe ser una clase real
// del calendario versionado del grupo y no puede ser futura (<= hoy Panamá).
// Devuelve el mensaje de error o null. Grupo sin itinerario = fail closed:
// sin calendario no hay evidencia confiable que registrar.
export function errorFechaAsistencia(itinerario, fecha, hoy) {
  const f = iso10(fecha)
  if (!f || !RE_FECHA.test(f)) return 'Fecha inválida (AAAA-MM-DD).'
  const h = iso10(hoy)
  if (!h || !RE_FECHA.test(h)) return 'Fecha inválida (AAAA-MM-DD).'
  const fechas = fechasDeClase(itinerario)
  if (!fechas.size) {
    return 'El grupo aún no tiene itinerario de clases: pídele al administrador que genere el plan del grupo antes de marcar asistencia.'
  }
  if (!fechas.has(f)) {
    return `El ${f} no es una clase del itinerario de este grupo: la asistencia solo se marca sobre clases reales del calendario.`
  }
  if (f > h) {
    return `El ${f} todavía no llega: la asistencia se marca cuando la clase ya se dio (hoy es ${h}).`
  }
  return null
}

// ── Retiro programado (g1-24) ───────────────────────────────────────────────

// Día 1 del mes siguiente a `hoy` (iso10 Panamá): la fecha en que el retiro
// programado se hace efectivo ("sigue este mes, se va el próximo").
export function primerDiaMesSiguiente(hoy) {
  const h = iso10(hoy)
  if (!h || !RE_FECHA.test(h)) return null
  const [y, m] = h.split('-').map(Number)
  const ySig = m === 12 ? y + 1 : y
  const mSig = m === 12 ? 1 : m + 1
  return `${ySig}-${String(mSig).padStart(2, '0')}-01`
}

// Estado a restaurar al cancelar una programación: el previo guardado por
// programarRetiro en el detalle del evento (normalmente 'activo'). Fail safe:
// sin evento o con detalle raro se restaura 'activo' — jamás un estado
// inventado fuera de los dos posibles pre-programación.
export function estadoPrevioDeProgramacion(detalle) {
  return detalle?.estado_previo === 'baja_potencial' ? 'baja_potencial' : 'activo'
}

// ── Corrección del motivo de un retiro (2026-10) ────────────────────────────
// Caso que la originó (David, agosto 2026): sin forma de corregir el motivo,
// la administradora retiró → reincorporó → volvió a retirar, y el Cuadro contó
// 10 retirados donde había 8. Se corrige el motivo del retiro VIGENTE (el
// último evento 'retiro' por id: un solo escritor, ejecutarRetiroEn, bajo el
// FOR UPDATE de la ficha) y la ficha, sin crear eventos. Los números leen el
// motivo del EVENTO (cuadroDeserciones, fuenteKpiAutomatica, deserción por
// coach): corregir solo la ficha no cambiaría nada.

const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio',
  'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

// 2026, 8 → 'agosto 2026' (en minúscula: va dentro de una frase).
export function nombreMes(year, month) {
  return `${NOMBRES_MES[Number(month) - 1] || month} ${year}`
}

// 'AAAA-MM-DD' → 'DD/MM/AAAA' para los mensajes; null si no hay fecha.
const fechaCorta = (f) => (f ? `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}` : null)

export const ERROR_RETIRO_CAMBIO = 'El retiro cambió desde que abriste esta pantalla (otra pestaña u otra persona). Recarga y revisa antes de corregir.'

// Decide si el motivo del retiro vigente se puede corregir y cuál es ese
// retiro. `ficha` = fila de estudiantes; `eventos` = retiros y
// reincorporaciones del niño (de cualquier centro). Los ids se comparan con
// Number y las fechas con iso10: el driver entrega DATE como Date y el centro
// llega como texto desde la URL. `eventoIdEsperado`/`motivoEsperado` son lo que
// la pantalla mostró: si el retiro vigente ya no es ese, se rechaza en vez de
// corregir otro retiro o pisar la corrección de otra persona.
// Devuelve { error } o { evento, periodo, sinCambios, eventoCambio, otrosRetirosMismoMes }.
export function evaluarCorreccionMotivo({ ficha, eventos = [], centroId, motivo, eventoIdEsperado, motivoEsperado } = {}) {
  if (!MOTIVOS_RETIRO.includes(motivo)) return { error: 'Motivo de retiro inválido.' }
  if (!ficha || Number(ficha.centro_id) !== Number(centroId)) return { error: 'El estudiante no pertenece a este centro.' }
  if (ficha.estado !== 'retirado') {
    return { error: 'El niño no está retirado: esta corrección es solo para el motivo de su retiro vigente.' }
  }
  const ordenados = [...(eventos || [])].sort((a, b) => Number(a.id) - Number(b.id))
  const retiros = ordenados.filter((e) => e.tipo === 'retiro')
  const evento = retiros[retiros.length - 1]
  if (!evento) {
    return { error: 'El niño figura retirado pero no tiene un retiro registrado: no cuenta en la deserción de ningún mes, así que no hay motivo que corregir en el KPI. Avísale a Administración para revisar su historial.' }
  }
  if (Number(evento.centro_id) !== Number(centroId)) {
    return { error: 'El retiro vigente de este niño quedó registrado en otro centro. Avísale a Administración para revisar el historial antes de corregir el motivo.' }
  }
  const year = Number(evento.year)
  const month = Number(evento.month)
  // Antes del gate el KPI de motivos es captura manual: corregir el evento
  // movería el Cuadro y no el KPI (misma regla de sincronizarConKpi).
  if (!usaIniciosClaseOperativos(year, month)) {
    return { error: 'Los meses anteriores a agosto de 2026 conservan su captura histórica. Corrígelos desde KPI Mensual.' }
  }
  if (ordenados.some((e) => e.tipo === 'reincorporacion' && Number(e.id) > Number(evento.id))) {
    return { error: 'El historial del niño tiene una reincorporación posterior a su último retiro y aun así figura retirado. Avísale a Administración para revisarlo antes de corregir el motivo.' }
  }
  const fechaEvento = iso10(evento.fecha)
  const fechaFicha = iso10(ficha.fecha_retiro)
  if (!fechaEvento || !fechaFicha || fechaEvento !== fechaFicha) {
    const diferencia = !fechaFicha && !fechaEvento
      ? 'Ni la ficha ni el retiro registrado tienen fecha'
      : !fechaFicha
        ? `La ficha no tiene fecha de retiro y el retiro registrado es del ${fechaCorta(fechaEvento)}`
        : !fechaEvento
          ? `La ficha dice retiro el ${fechaCorta(fechaFicha)} y el retiro registrado no tiene fecha`
          : `La ficha dice retiro el ${fechaCorta(fechaFicha)} y el retiro registrado es del ${fechaCorta(fechaEvento)}`
    return { error: `${diferencia}: no describen el mismo retiro. Avísale a Administración para revisar el historial antes de corregir el motivo.` }
  }
  // Todos los lectores ubican el retiro por year/month; si la fecha cae en
  // otro mes el motor semanal ya lo marca como dato roto. Con esta guarda el
  // candado del mes declarado es el único que hace falta.
  const [yFecha, mFecha] = fechaEvento.split('-').map(Number)
  if (yFecha !== year || mFecha !== month) {
    return { error: `El retiro del ${fechaCorta(fechaEvento)} está anotado en ${nombreMes(year, month)}: el KPI ya lo marca como dato roto. Avísale a Administración para repararlo antes de corregir el motivo.` }
  }
  const otrosRetirosMismoMes = retiros
    .filter((e) => Number(e.id) !== Number(evento.id) && Number(e.year) === year && Number(e.month) === month)
    .map((e) => Number(e.id))
  const motivoEvento = evento.motivo ?? null
  const resultado = {
    evento,
    periodo: { year, month },
    sinCambios: motivo === motivoEvento && motivo === (ficha.motivo_retiro ?? null),
    eventoCambio: Number(evento.id) !== Number(eventoIdEsperado),
    otrosRetirosMismoMes,
  }
  // Sin cambios va ANTES del token: el reintento de una corrección que sí se
  // guardó (respuesta perdida) responde "ya estaba" en vez de "cambió".
  if (resultado.sinCambios) return resultado
  if (resultado.eventoCambio || motivoEvento !== (motivoEsperado ?? null)) return { error: ERROR_RETIRO_CAMBIO }
  return resultado
}

// La razón de la corrección es obligatoria: el motivo mueve la deserción con
// la que se mide al centro y al coach, y quien corrige es la parte medida.
export function validarRazonCorreccion(razon) {
  if (typeof razon !== 'string' || !razon.trim()) return 'Escribe por qué corriges el motivo: queda en el historial del retiro.'
  if (razon.trim().length > 500) return 'La razón admite hasta 500 caracteres.'
  return null
}

// Agrega `entrada` al historial de correcciones del detalle (JSONB) del
// evento, conservando todas sus claves (override_asistencia, origen del cron…).
// Lo que no se entiende no se pisa: un detalle que no es objeto, o un
// historial que no es lista, frena la corrección.
export function detalleConCorreccion(detalle, entrada) {
  const ilegible = { error: 'El detalle del retiro no se puede leer: avísale a Administración antes de corregir el motivo.' }
  let base = detalle ?? {}
  if (typeof base === 'string') {
    try { base = JSON.parse(base) } catch { return ilegible }
  }
  if (!base || typeof base !== 'object' || Array.isArray(base)) return ilegible
  const previas = base.correcciones_motivo
  if (previas != null && !Array.isArray(previas)) return ilegible
  return { detalle: { ...base, correcciones_motivo: [...(previas || []), entrada] } }
}
