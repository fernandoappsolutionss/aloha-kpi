// Modelo de horarios óptimo ALOHA — cálculo puro, sin BD.
// Es la parrilla planificada del negocio (visión de franquicia, pre-pandemia):
// el recomendador siempre optimiza hacia este sistema.
//
// Entre semana, 3 slots fijos de 1 h con 15 min entre ellos (regla de Fernando
// 2026-08-10: las clases corren desde las 4:00 pm y el espacio entre clases es
// el buffer de 15 min, no media hora):
//   4:00–5:00 · 5:15–6:15 · 6:30–7:30 pm
// La franja 2:45–3:45 pm es la ZONA KINDER (pareada L+M o M+J) y cierra justo
// 15 min antes de la primera clase; queda
// prohibido abrir Kinder en sábado o en los horarios calientes de Tiny/Kids.
// Los grupos de semana van PAREADOS: Lunes+Miércoles y Martes+Jueves (1 h cada
// día, mismo slot y salón). El viernes lleva su bloque único de 2 h (4:00–6:00,
// alineado con el arranque de la parrilla).
// El sábado, 3 jornadas de 2 h en la misma cadena de 15 min:
// 9–11 am · 11:15 am–1:15 pm · 1:30–3:30 pm.
// Capacidad del modelo: 10 grupos por salón (3 LM + 3 MJ + 1 V + 3 SÁB),
// con 10 niños por grupo → 30 grupos / ~300 niños en un centro de 3 salones.
import { aMinutos, aHora12, chocanConBuffer, BUFFER_MIN, CIERRE_MIN } from './inventario.js'
import { INICIO_GRUPOS_DIA_PRUEBA } from './reservas.js'
import { DIAS } from './operaciones.js'

const H = (h, m = 0) => h * 60 + m

export const SLOTS_SEMANA = [
  { inicio: H(16), fin: H(17) },         // 4:00–5:00 pm
  { inicio: H(17, 15), fin: H(18, 15) }, // 5:15–6:15 pm
  { inicio: H(18, 30), fin: H(19, 30) }, // 6:30–7:30 pm
]
export const SLOT_KINDER = { inicio: H(14, 45), fin: H(15, 45) } // 2:45–3:45 pm
export const BLOQUE_VIERNES = { inicio: H(16), fin: H(18) } // 4:00–6:00 pm
export const JORNADAS_SABADO = [
  { inicio: H(9), fin: H(11) },           // 9:00–11:00 am
  { inicio: H(11, 15), fin: H(13, 15) },  // 11:15 am–1:15 pm
  { inicio: H(13, 30), fin: H(15, 30) },  // 1:30–3:30 pm
]
export const GRUPOS_POR_SALON = 10
export const NINOS_POR_GRUPO_MODELO = 10

// Cupos disponibles de un grupo frente al modelo (10 niños por grupo).
// Espera el grupo con sus `estudiantes` embebidos (activos + baja potencial),
// como lo arma cargarGrupos. Texto estándar: "quedan X de 10 cupos".
export function cuposDe(grupo) {
  return Math.max(0, NINOS_POR_GRUPO_MODELO - (grupo.estudiantes || []).length)
}

// Horario legible de un grupo a partir de sus filas de grupo_horarios:
// "Lun+Mié 3:30–4:30 pm" (par con el mismo slot) o "Vie 4:30–6:30 pm".
export function horarioTextoDe(horarios) {
  const hs = (horarios || [])
    .map((h) => ({ dia: h.dia, ini: aMinutos(h.hora_inicio), fin: aMinutos(h.hora_fin) }))
    .sort((a, b) => a.dia - b.dia || a.ini - b.ini)
  if (!hs.length) return ''
  const dia3 = (d) => (DIAS[d] || '').slice(0, 3)
  const rango = (ini, fin) => {
    const a = aHora12(ini)
    const b = aHora12(fin)
    // "3:30 pm"–"4:30 pm" → "3:30–4:30 pm" (el am/pm repetido no aporta).
    return a.slice(-2) === b.slice(-2) ? `${a.slice(0, -3)}–${b}` : `${a}–${b}`
  }
  if (hs.length === 2 && hs[0].ini === hs[1].ini && hs[0].fin === hs[1].fin) {
    return `${dia3(hs[0].dia)}+${dia3(hs[1].dia)} ${rango(hs[0].ini, hs[0].fin)}`
  }
  return hs.map((h) => `${dia3(h.dia)} ${rango(h.ini, h.fin)}`).join(' · ')
}

// Las unidades del modelo para un salón: cada una es un grupo completo (sus
// 2 h semanales ya resueltas). `sesiones` va listo para el form de horarios.
export function unidadesModelo(salonId) {
  const unidades = []
  for (const s of SLOTS_SEMANA) {
    unidades.push({
      tipo: 'LM',
      titulo: `Lunes y Miércoles ${aHora12(s.inicio)}–${aHora12(s.fin)}`,
      sesiones: [
        { dia: 1, inicio: s.inicio, fin: s.fin, salon_id: salonId },
        { dia: 3, inicio: s.inicio, fin: s.fin, salon_id: salonId },
      ],
    })
    unidades.push({
      tipo: 'MJ',
      titulo: `Martes y Jueves ${aHora12(s.inicio)}–${aHora12(s.fin)}`,
      sesiones: [
        { dia: 2, inicio: s.inicio, fin: s.fin, salon_id: salonId },
        { dia: 4, inicio: s.inicio, fin: s.fin, salon_id: salonId },
      ],
    })
  }
  unidades.push({
    tipo: 'V',
    titulo: `Viernes ${aHora12(BLOQUE_VIERNES.inicio)}–${aHora12(BLOQUE_VIERNES.fin)}`,
    sesiones: [{ dia: 5, inicio: BLOQUE_VIERNES.inicio, fin: BLOQUE_VIERNES.fin, salon_id: salonId }],
  })
  for (const j of JORNADAS_SABADO) {
    unidades.push({
      tipo: 'SAB',
      titulo: `Sábado ${aHora12(j.inicio)}–${aHora12(j.fin)}`,
      sesiones: [{ dia: 6, inicio: j.inicio, fin: j.fin, salon_id: salonId }],
    })
  }
  return unidades
}

// Sesiones ocupadas (día, inicio, fin) de un salón, de los grupos activos.
function ocupadasDe(grupos, salonId) {
  const out = []
  for (const g of grupos) {
    if (g.estado !== 'activo') continue
    for (const h of g.horarios || []) {
      if (String(h.salon_id || '') !== String(salonId)) continue
      out.push({ dia: h.dia, inicio: aMinutos(h.hora_inicio), fin: aMinutos(h.hora_fin) })
    }
  }
  return out
}

// Unidades del modelo LIBRES en un centro: todas las sesiones de la unidad
// caben en su salón sin chocar (respetando el buffer entre clases).
export function unidadesLibres(grupos, salones) {
  const libres = []
  for (const s of salones.filter((x) => x.activo)) {
    const ocupadas = ocupadasDe(grupos, s.id)
    for (const u of unidadesModelo(s.id)) {
      const cabe = u.sesiones.every((ses) =>
        !ocupadas.some((o) => o.dia === ses.dia && chocanConBuffer(ses.inicio, ses.fin, o.inicio, o.fin)))
      if (cabe) libres.push({ ...u, salon: s })
    }
  }
  return libres
}

// Estado del centro frente al modelo: capacidad y cupos restantes.
export function estadoModelo(grupos, salones) {
  const nSalones = salones.filter((x) => x.activo).length
  const capacidadGrupos = GRUPOS_POR_SALON * nSalones
  // Los pseudo-grupos de clase de prueba no son grupos: si se cuelan aquí, el
  // KPI "Cupos del modelo" reporta un grupo activo que no existe.
  const activos = grupos.filter((g) => g.estado === 'activo' && !g.es_online && !g.es_reserva).length
  return {
    capacidadGrupos,
    capacidadNinos: capacidadGrupos * NINOS_POR_GRUPO_MODELO,
    gruposActivos: activos,
    cuposLibres: unidadesLibres(grupos, salones).length,
  }
}

// Los bloques del modelo que aplican a UN día del calendario (para pintarlos
// como parrilla): lun/mié y mar/jue llevan los 3 slots de 1 h con su par;
// viernes su bloque de 2 h; sábado sus 3 jornadas.
// `conPrueba` = ese día el centro da clase de prueba. Regla de Fernando: ese
// día NO hay grupos de 1 hora — se arma con bloques de 2 h que arrancan a las
// 4:30 pm (la prueba va antes). El sábado no cambia: la prueba va al final,
// después de la tercera jornada.
export function slotsDelDia(dia, conPrueba = false) {
  if (dia === 5) return [{ ...BLOQUE_VIERNES, tipo: 'V', sub: 'bloque de 2 h' }]
  if (dia === 6) return JORNADAS_SABADO.map((j) => ({ ...j, tipo: 'SAB', sub: 'jornada de 2 h' }))
  if (dia >= 1 && dia <= 4) {
    const tipo = (dia === 1 || dia === 3) ? 'LM' : 'MJ'
    const sub = tipo === 'LM' ? 'par Lun+Mié' : 'par Mar+Jue'
    if (conPrueba) return bloquesDiaDePrueba().map((b) => ({ ...b, tipo: 'PRUEBA2H', sub: 'día de clase de prueba · bloque de 2 h' }))
    return [
      { ...SLOT_KINDER, tipo: 'K', sub: `Kinder · ${sub}`, kinder: true },
      ...SLOTS_SEMANA.map((s) => ({ ...s, tipo, sub })),
    ]
  }
  return []
}

// Bloques de 2 h que caben desde las 4:30 pm hasta el cierre, con el buffer
// entre clases. Con la ventana actual (cierre 8:30 pm) cabe uno: 4:30–6:30.
export function bloquesDiaDePrueba() {
  const out = []
  let ini = INICIO_GRUPOS_DIA_PRUEBA
  while (ini + 120 <= CIERRE_MIN) {
    out.push({ inicio: ini, fin: ini + 120 })
    ini += 120 + BUFFER_MIN
  }
  return out
}

export const RESUMEN_MODELO = `Lun+Mié y Mar+Jue 1 h (4:00, 5:15 o 6:30 pm) · Vie 4:00–6:00 pm · Sáb 9–11, 11:15–1:15 o 1:30–3:30 · Kinder solo 2:45–3:45 pm entre semana · 10 grupos por salón`
export { DIAS }
