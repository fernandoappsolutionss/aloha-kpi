// Modelo de horarios óptimo ALOHA — cálculo puro, sin BD.
// Es la parrilla planificada del negocio (visión de franquicia, pre-pandemia):
// el recomendador siempre optimiza hacia este sistema.
//
// Entre semana, 3 slots fijos de 1 h con 30 min entre ellos:
//   3:00–4:00 · 4:30–5:30 · 6:00–7:00 pm
// Los grupos de semana van PAREADOS: Lunes+Miércoles y Martes+Jueves (1 h cada
// día, mismo slot y salón). El viernes lleva su bloque único de 2 h (4:30–6:30).
// El sábado, 3 jornadas de 2 h: 9–11 am · 11:30 am–1:30 pm · 2–4 pm.
// Capacidad del modelo: 10 grupos por salón (3 LM + 3 MJ + 1 V + 3 SÁB),
// con 10 niños por grupo → 30 grupos / ~300 niños en un centro de 3 salones.
import { aMinutos, aHora12, chocanConBuffer } from './inventario'
import { DIAS } from './operaciones'

const H = (h, m = 0) => h * 60 + m

export const SLOTS_SEMANA = [
  { inicio: H(15), fin: H(16) },        // 3:00–4:00 pm
  { inicio: H(16, 30), fin: H(17, 30) },// 4:30–5:30 pm
  { inicio: H(18), fin: H(19) },        // 6:00–7:00 pm
]
export const BLOQUE_VIERNES = { inicio: H(16, 30), fin: H(18, 30) } // 4:30–6:30 pm
export const JORNADAS_SABADO = [
  { inicio: H(9), fin: H(11) },
  { inicio: H(11, 30), fin: H(13, 30) },
  { inicio: H(14), fin: H(16) },
]
export const GRUPOS_POR_SALON = 10
export const NINOS_POR_GRUPO_MODELO = 10

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
// caben en su salón sin chocar (respetando los 30 min entre clases).
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
  const activos = grupos.filter((g) => g.estado === 'activo' && !g.es_online).length
  return {
    capacidadGrupos,
    capacidadNinos: capacidadGrupos * NINOS_POR_GRUPO_MODELO,
    gruposActivos: activos,
    cuposLibres: unidadesLibres(grupos, salones).length,
  }
}

export const RESUMEN_MODELO = `Lun+Mié y Mar+Jue 1 h (3:00, 4:30 o 6:00 pm) · Vie 4:30–6:30 pm · Sáb 9–11, 11:30–1:30 o 2–4 · 10 grupos por salón`
export { DIAS }
