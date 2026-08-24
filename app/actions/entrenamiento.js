'use server'
// Progreso del entrenamiento. Siempre escribe sobre el usuario de la sesión
// (session.uid, firmado en el JWT por lib/auth.js) — nunca sobre un id que
// venga del cliente. Las respuestas del quiz viven en respuestas.js (solo
// servidor): el cliente recibe opciones y explicaciones, nunca el índice.
import { sql } from '../../lib/db'
import { requireSession, requireCurrentUser, requireCurrentAdmin, isAdminRole } from '../../lib/auth'
import { fallo } from '../../lib/errores'
import { MODULOS } from '../../lib/entrenamiento/modulos'
import { RESPUESTAS } from '../../lib/entrenamiento/respuestas'
import { corregirQuiz, porcentaje } from '../../lib/entrenamiento/progreso'

const MODULO_IDS = new Set(MODULOS.map((m) => m.id))

// Como en peticiones.js: nada llega al cliente como throw (lib/errores.js);
// un fallo de auth o de SQL vuelve como { error: 'mensaje legible' }.
async function runAction(name, work) {
  try { return await work() } catch (error) {
    const result = fallo(name, error)
    if (/^[0-9A-Z]{5}$/.test(String(error?.code || ''))) {
      return { error: 'No se pudo completar la operación. Intenta de nuevo.' }
    }
    return result
  }
}

function aCamel(row) {
  return {
    tourVistoAt: row.tour_visto_at ? new Date(row.tour_visto_at).toISOString() : null,
    quizAprobadoAt: row.quiz_aprobado_at ? new Date(row.quiz_aprobado_at).toISOString() : null,
    intentos: Number(row.intentos || 0),
    ultimoPuntaje: row.ultimo_puntaje == null ? null : Number(row.ultimo_puntaje),
  }
}

// SELECT compartido por cargarProgreso y resumenProgreso, sin envolver: si
// falla debe LANZAR (el runAction de quien lo llama lo captura), nunca
// devolver { error } para que porcentaje() lo confunda con progreso.
async function progresoDeSesion() {
  const s = await requireSession()
  const rows = await sql`SELECT * FROM entrenamiento_progreso WHERE usuario_id = ${s.uid}`
  const out = {}
  for (const r of rows) out[r.modulo] = aCamel(r)
  return out
}

// → { [modulo]: { tourVistoAt, quizAprobadoAt, intentos, ultimoPuntaje } } | { error }
// Las claves son ids de módulo, nunca "error": el cliente distingue con r?.error.
export async function cargarProgreso() {
  return runAction('cargarProgreso', progresoDeSesion)
}

// → { completados, total, pct } (badge del menú y banner de Resumen).
// null para gerencia: admin_general/supervisor no se entrenan (spec §14).
export async function resumenProgreso() {
  return runAction('resumenProgreso', async () => {
    const s = await requireSession()
    if (isAdminRole(s.rol)) return null
    return porcentaje(await progresoDeSesion(), MODULOS)
  })
}

// Las escrituras releen el usuario en BD (requireCurrentUser): una cookie de 7
// días de un usuario borrado o con acceso revocado no debe poder escribir.
export async function marcarTourVisto(modulo) {
  return runAction('marcarTourVisto', async () => {
    const u = await requireCurrentUser()
    if (!MODULO_IDS.has(modulo)) return { error: 'Módulo desconocido.' }
    await sql`
      INSERT INTO entrenamiento_progreso (usuario_id, modulo, tour_visto_at, updated_at)
      VALUES (${u.id}, ${modulo}, now(), now())
      ON CONFLICT (usuario_id, modulo) DO UPDATE
        SET tour_visto_at = COALESCE(entrenamiento_progreso.tour_visto_at, now()), updated_at = now()
    `
    return { ok: true }
  })
}

// respuestas: [idx, idx, idx] elegidos por el usuario.
// → { puntaje, correctas:[bool×3], explicaciones:[string×3], aprobado }
export async function responderQuiz(modulo, respuestas) {
  return runAction('responderQuiz', async () => {
    const u = await requireCurrentUser()
    if (!MODULO_IDS.has(modulo)) return { error: 'Módulo desconocido.' }
    // Forma estricta: 3 enteros. Un payload malformado no cuenta como intento.
    const r = Array.isArray(respuestas) ? respuestas : null
    if (!r || r.length !== 3 || !r.every(Number.isInteger)) return { error: 'Respuestas inválidas.' }
    const correctas = RESPUESTAS[modulo]
    const m = MODULOS.find((x) => x.id === modulo)
    const res = corregirQuiz(r, correctas) // fuera de rango → incorrecta
    // quiz_aprobado_at con el reloj de la BD (now()), no el del server de Next.
    await sql`
      INSERT INTO entrenamiento_progreso (usuario_id, modulo, intentos, ultimo_puntaje, quiz_aprobado_at, updated_at)
      SELECT ${u.id}, ${modulo}, 1, ${res.puntaje}, CASE WHEN ${res.aprobado} THEN now() END, now()
      ON CONFLICT (usuario_id, modulo) DO UPDATE SET
        intentos = entrenamiento_progreso.intentos + 1,
        ultimo_puntaje = EXCLUDED.ultimo_puntaje,
        quiz_aprobado_at = COALESCE(entrenamiento_progreso.quiz_aprobado_at, EXCLUDED.quiz_aprobado_at),
        updated_at = now()
    `
    return { puntaje: res.puntaje, correctas: res.correctas, aprobado: res.aprobado, explicaciones: m.quiz.map((q) => q.explicacion) }
  })
}

// Gerencia: usuarios administradora (+centro) × módulos. requireCurrentAdmin
// relee el rol desde la BD (como peticiones.js y deleteCentro): un JWT de 7
// días de alguien degradado o borrado no debe leer nombres/emails/progreso.
// → { modulos:[{id,titulo}], usuarios:[{ id, nombre, email, centro, centroId, progreso:{[modulo]:{…}}, completados, pct }] }
export async function matrizProgreso(centroId = null) {
  return runAction('matrizProgreso', async () => {
    await requireCurrentAdmin()
    const cid = Number.isInteger(centroId) && centroId > 0 ? centroId : null
    const usuarios = cid
      ? await sql`SELECT u.id, u.nombre, u.email, u.centro_id, c.nombre AS centro FROM usuarios u LEFT JOIN centros c ON c.id = u.centro_id WHERE u.rol = 'administradora' AND u.centro_id = ${cid} ORDER BY c.nombre, u.nombre`
      : await sql`SELECT u.id, u.nombre, u.email, u.centro_id, c.nombre AS centro FROM usuarios u LEFT JOIN centros c ON c.id = u.centro_id WHERE u.rol = 'administradora' ORDER BY c.nombre, u.nombre`
    const ids = usuarios.map((x) => x.id)
    const rows = ids.length ? await sql`SELECT * FROM entrenamiento_progreso WHERE usuario_id = ANY(${ids})` : []
    const porUsuario = {}
    for (const r of rows) (porUsuario[r.usuario_id] ||= {})[r.modulo] = aCamel(r)
    return {
      modulos: MODULOS.map((m) => ({ id: m.id, titulo: m.titulo })),
      usuarios: usuarios.map((u) => {
        const progreso = porUsuario[u.id] || {}
        const p = porcentaje(progreso, MODULOS)
        return { id: u.id, nombre: u.nombre, email: u.email, centro: u.centro || '—', centroId: u.centro_id, progreso, completados: p.completados, pct: p.pct }
      }),
    }
  })
}

// Gerencia: vuelve a 0/9 el entrenamiento de un usuario. Para el cambio de
// administradora que hereda el mismo correo/login del centro: el sistema no
// puede saber que hay una persona nueva, alguien de gerencia lo declara aquí.
// (Si además se va la persona, lo correcto sigue siendo borrar y recrear el
// usuario: eso rota la contraseña; este botón solo borra el progreso.)
export async function reiniciarProgreso(usuarioId) {
  return runAction('reiniciarProgreso', async () => {
    await requireCurrentAdmin()
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) return { error: 'Usuario inválido.' }
    await sql`DELETE FROM entrenamiento_progreso WHERE usuario_id = ${usuarioId}`
    return { ok: true }
  })
}
