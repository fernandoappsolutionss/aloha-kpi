// Bloque `aloha_group` del contrato con el CRM — armado PURO, sin BD.
// El SQL real (leer grupo, horarios y metas) vive en lib/cupos-sync.js y aquí
// se prueba en espejo (test/cupos-payload.test.mjs), misma técnica que
// lib/llenado-outbox.mjs frente a lib/llenado-service.js.
//
// Contrato (diseño 2026-08-08, defecto 11): las 6 claves originales del CRM
// NO cambian de nombre ni de tipo; lo nuevo son 4 claves ADITIVAS null-safe
// para las notas del vendedor. La apertura manual autoriza los cupos;
// la ventana del manual se conserva como referencia de llenado.

import { aceptaInscripciones, ritmoLlenado } from './llenado.mjs'

// itinerario_clases llega como objeto (JSONB) o, defensivamente, como string
// (mismo criterio que el helper privado de lib/llenado.mjs).
const itinerarioDe = (grupo) => {
  const it = grupo?.itinerario_clases
  if (it == null) return null
  if (typeof it === 'string') {
    try { return JSON.parse(it) } catch { return {} }
  }
  return it
}

const iso10 = (v) => {
  if (!v) return null
  return v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10)
}

// Nivel vigente del itinerario del grupo (null si no hay). Lo usa el caller
// impuro para calcular aperturaMinima(itinerario, nivel) de lib/operaciones.js
// — esa tabla del manual no se duplica aquí; este módulo solo la recibe.
export const nivelDe = (grupo) => itinerarioDe(grupo)?.nivel ?? null

// Arma el bloque `aloha_group` a partir del grupo YA leído (fila con `ninos`
// contados en SQL: activos + baja_potencial) y los datos que el caller resolvió
// con BD/reloj: horario formateado, cupo total del modelo, las dos metas
// posibles y el hoy del negocio (hora de Panamá, lib/operaciones.js).
// La meta vigente se decide aquí (regla del ritmo, lib/llenado.mjs:104-105):
// aperturaMinima del nivel si el nivel vigente aún NO inició, gpn_min si ya
// inició. `ahoraIso` existe para que el test fije actualizado_at.
export function armarAlohaGroupPayload(grupo, {
  horario = '',
  cuposTotal,
  metaApertura,
  gpnMin,
  hoyIso,
  ahoraIso = null,
} = {}) {
  const ninos = Math.max(0, Number(grupo?.ninos) || 0)

  // Misma comparación que diasParaInicio de ritmoLlenado: el nivel no inició
  // si su fecha_inicio del itinerario es estrictamente futura.
  const inicioNivel = iso10(itinerarioDe(grupo)?.fecha_inicio)
  const hoy = iso10(hoyIso)
  const meta = grupo.inicio_pendiente || (inicioNivel && hoy && hoy < inicioNivel) ? metaApertura : gpnMin

  // ritmoLlenado cuenta niños desde grupo.estudiantes; aquí el conteo ya vino
  // del SQL, así que se sintetiza una lista de activos del mismo tamaño. El
  // ritmo observado no viaja al CRM: sin eventos da 0 y se ignora.
  const ritmo = ritmoLlenado(
    { ...grupo, estudiantes: Array.from({ length: ninos }, () => ({ estado: 'activo' })) },
    meta,
    [],
    hoyIso
  )

  return {
    // --- 6 claves del contrato original: nombres y tipos INTACTOS ---
    numero: String(grupo.numero),
    centro: grupo.centro || '',
    horario,
    cupos_total: cuposTotal,
    // Un grupo inactivo o cerrado manualmente no ofrece cupos.
    cupos_disponibles: aceptaInscripciones(grupo) ? Math.max(0, cuposTotal - ninos) : 0,
    actualizado_at: ahoraIso || new Date().toISOString(),
    // --- claves aditivas null-safe (notas del vendedor, defecto 11) ---
    // Fecha límite para incorporar niños NUEVOS (null = exento o sin itinerario).
    fecha_limite_nuevos: ritmo.fechaLimite ?? null,
    // Días hasta el inicio del nivel vigente (null = ya inició o sin fecha).
    dias_para_iniciar: ritmo.diasParaInicio ?? null,
    // Niños que faltan contra la meta vigente (apertura mínima o gpn_min).
    faltan_para_meta: ritmo.faltan,
    // Inscripciones/semana necesarias para llegar (null = ventana vencida o sin límite).
    ritmo_semanal_necesario: ritmo.ritmoSemanalNecesario ?? null,
  }
}
