'use server'
// Progreso del entrenamiento de OFICIO (administradora y asistente). Vive
// aparte de app/actions/entrenamiento.js: los 9 tours de "cómo usar el
// sistema" no se tocan. Comparte la tabla entrenamiento_progreso, donde el
// campo `modulo` es TEXT libre y los ids de oficio llevan prefijo `of-`.
//
// Como en entrenamiento.js: siempre escribe sobre el usuario de la sesión
// (nunca sobre un id que venga del cliente, salvo la FIRMA, que es un tercero
// autorizado y se verifica con puedeFirmar); las respuestas del quiz viven en
// respuestas-oficio/ (solo servidor) y jamás llegan al cliente.
import { sql } from '../../lib/db'
import { requireSession, requireCurrentUser, requireCurrentAdmin } from '../../lib/auth'
import { fallo } from '../../lib/errores'
import { MODULOS_OFICIO, CURSOS, MODULO_IDS_OFICIO, moduloOficio, metadatosOficio } from '../../lib/entrenamiento/oficio/catalogo'
import { GLOSARIO } from '../../lib/entrenamiento/oficio/glosario'
import { RESPUESTAS_OFICIO } from '../../lib/entrenamiento/respuestas-oficio/todas'
import {
  minimoAprobacion, corregirQuizOficio, estudiado, hatted, planDeRol,
  avanceOficio, avanceDrills, siguienteOficio, gradienteAbierto, puedeFirmar,
  rolesQueFirma, OFICIAL_DE,
} from '../../lib/entrenamiento/oficio/progreso'

const ROLES_ALUMNO = ['administradora', 'asistente']

const NOMBRE_ROL = {
  administradora: 'Administradora del Centro',
  asistente: 'Asistente Administrativo',
  coordinador: 'Coordinador Operativo',
  supervisor: 'Supervisor',
  admin_general: 'Gerencia',
}

async function runAction(name, work) {
  try { return await work() } catch (error) {
    const result = fallo(name, error)
    if (/^[0-9A-Z]{5}$/.test(String(error?.code || ''))) {
      return { error: 'No se pudo completar la operación. Intenta de nuevo.' }
    }
    return result
  }
}

// tour_visto_at en una fila de oficio = "lo estudió con la masa delante".
function aCamel(row) {
  return {
    tourVistoAt: row.tour_visto_at ? new Date(row.tour_visto_at).toISOString() : null,
    quizAprobadoAt: row.quiz_aprobado_at ? new Date(row.quiz_aprobado_at).toISOString() : null,
    intentos: Number(row.intentos || 0),
    ultimoPuntaje: row.ultimo_puntaje == null ? null : Number(row.ultimo_puntaje),
    drillFirmadoAt: row.drill_firmado_at ? new Date(row.drill_firmado_at).toISOString() : null,
    drillFirmadoPor: row.drill_firmado_por
      ? { id: Number(row.drill_firmado_por), nombre: row.firmante_nombre || 'Oficial de Entrenamiento' }
      : null,
  }
}

// Lanza si falla (el runAction de quien llama lo captura): nunca devuelve
// { error } para que avanceOficio() no lo confunda con progreso.
async function progresoDeUsuario(usuarioId) {
  const rows = await sql`
    SELECT ep.*, f.nombre AS firmante_nombre
    FROM entrenamiento_progreso ep
    LEFT JOIN usuarios f ON f.id = ep.drill_firmado_por
    WHERE ep.usuario_id = ${usuarioId} AND ep.modulo LIKE 'of-%'
  `
  const out = {}
  for (const r of rows) out[r.modulo] = aCamel(r)
  return out
}

// Quién le puede firmar el drill a esta persona, con nombre y apellido. Todo el
// flujo se apoya en "pídele a tu Oficial de Entrenamiento que te lo tome": si el
// sistema no lo nombra, una asistente nueva no sabe a quién tocarle la puerta.
// Devuelve solo el escalón MÁS CERCANO de OFICIAL_DE (a la asistente la firma su
// administradora, no la gerencia) y como máximo tres nombres.
async function oficialesDe(alumno) {
  const roles = OFICIAL_DE[alumno.rol] || []
  if (roles.length === 0) return []
  const rows = await sql`
    SELECT u.id, u.nombre, u.rol, u.centro_id,
           COALESCE(ARRAY_AGG(uc.centro_id) FILTER (WHERE uc.centro_id IS NOT NULL), '{}') AS centros
    FROM usuarios u
    LEFT JOIN usuario_centros uc ON uc.usuario_id = u.id
    WHERE u.rol = ANY(${roles})
    GROUP BY u.id, u.nombre, u.rol, u.centro_id
    ORDER BY u.nombre
  `
  const suyos = rows.filter((f) => puedeFirmar({
    id: Number(f.id),
    rol: f.rol,
    centroId: f.centro_id == null ? null : Number(f.centro_id),
    centros: (f.centros || []).map(Number),
  }, alumno))
  for (const rol of roles) {
    const escalon = suyos.filter((f) => f.rol === rol)
    if (escalon.length) {
      return escalon.slice(0, 3).map((f) => ({ id: Number(f.id), nombre: f.nombre, rol, rolNombre: NOMBRE_ROL[rol] || rol }))
    }
  }
  return []
}

// → { rol, plan:[metadatos], progreso, avance, drills, siguiente, puedeFirmarA, oficiales }
// Una sola vuelta: la página del hat pinta el checksheet completo con esto.
export async function cargarOficio() {
  return runAction('cargarOficio', async () => {
    const s = await requireSession()
    const plan = planDeRol(s.rol, MODULOS_OFICIO)
    const [progreso, oficiales] = await Promise.all([
      progresoDeUsuario(s.uid),
      plan.length > 0
        ? oficialesDe({ id: Number(s.uid), rol: s.rol, centroId: s.centro_id == null ? null : Number(s.centro_id) })
        : Promise.resolve([]),
    ])
    const sig = siguienteOficio(plan, progreso)
    return {
      rol: s.rol,
      plan: plan.map(metadatosOficio),
      progreso,
      avance: avanceOficio(plan, progreso),
      drills: avanceDrills(plan, progreso),
      siguiente: sig ? { id: sig.id, titulo: sig.titulo, curso: sig.curso } : null,
      puedeFirmarA: rolesQueFirma(s.rol),
      oficiales,
    }
  })
}

// Carril "Tu oficio" del índice de Entrenamiento. null para quien no tiene
// plan (gerencia y coordinador): ellos firman, no se entrenan.
// → { rol, cursos:[{id,titulo,bloque,total,estudiados,hatted}], avance, drills, siguiente }
export async function resumenOficio() {
  return runAction('resumenOficio', async () => {
    const s = await requireSession()
    const plan = planDeRol(s.rol, MODULOS_OFICIO)
    if (plan.length === 0) return null
    const progreso = await progresoDeUsuario(s.uid)
    const cursos = Object.keys(CURSOS)
      .map((id) => {
        const suyos = plan.filter((m) => m.curso === id)
        return {
          id,
          titulo: CURSOS[id].titulo,
          bloque: CURSOS[id].bloque,
          total: suyos.length,
          estudiados: suyos.filter((m) => estudiado(progreso[m.id])).length,
          hatted: suyos.filter((m) => hatted(progreso[m.id], m)).length,
        }
      })
      .filter((c) => c.total > 0)
    const sig = siguienteOficio(plan, progreso)
    return {
      rol: s.rol,
      cursos,
      avance: avanceOficio(plan, progreso),
      drills: avanceDrills(plan, progreso),
      siguiente: sig ? { id: sig.id, titulo: sig.titulo } : null,
    }
  })
}

// "Ya lo estudié": la persona declara que leyó el módulo con la masa delante.
// Releé el usuario en la base (requireCurrentUser): una cookie de 7 días de
// alguien borrado o con el rol cambiado no debe poder escribir.
export async function marcarEstudiado(modulo) {
  return runAction('marcarEstudiado', async () => {
    const u = await requireCurrentUser()
    if (!MODULO_IDS_OFICIO.has(modulo)) return { error: 'Módulo desconocido.' }
    const m = moduloOficio(modulo)
    if (!m.roles.includes(u.rol)) return { error: 'Este módulo no es de tu puesto.' }
    // Mismo gradiente que el quiz, y por la misma razón: el checksheet promete
    // "cada módulo abre con el anterior estudiado". Sin esta guarda se puede
    // tildar la masa del último módulo el primer día y dejar checks verdes
    // fuera de orden que contradicen esa promesa.
    const previo = await progresoDeUsuario(u.id)
    if (!gradienteAbierto(m, previo)) {
      return { error: 'Antes de marcar este módulo tienes que estudiar el anterior.' }
    }
    await sql`
      INSERT INTO entrenamiento_progreso (usuario_id, modulo, tour_visto_at, updated_at)
      VALUES (${u.id}, ${modulo}, now(), now())
      ON CONFLICT (usuario_id, modulo) DO UPDATE
        SET tour_visto_at = COALESCE(entrenamiento_progreso.tour_visto_at, now()), updated_at = now()
    `
    return { ok: true }
  })
}

// respuestas: [idx, …] con el largo del quiz del módulo (4 a 10, no 3).
// → { puntaje, minimo, total, correctas:[bool], explicaciones:[string], repasa:[[slug]], aprobado }
export async function responderQuizOficio(modulo, respuestas) {
  return runAction('responderQuizOficio', async () => {
    const u = await requireCurrentUser()
    if (!MODULO_IDS_OFICIO.has(modulo)) return { error: 'Módulo desconocido.' }
    const m = moduloOficio(modulo)
    if (!m.roles.includes(u.rol)) return { error: 'Este módulo no es de tu puesto.' }
    const correctas = RESPUESTAS_OFICIO[modulo]
    if (!Array.isArray(correctas) || correctas.length !== m.quiz.length) {
      return { error: 'Este módulo todavía no tiene sus preguntas cargadas.' }
    }
    // El gradiente se comprueba en el SERVIDOR, ANTES de corregir: leer siempre
    // se puede (HCA dice devuélvete, no te prohíbe avanzar), pero el quiz del
    // módulo N exige el N−1 estudiado.
    const progreso = await progresoDeUsuario(u.id)
    if (!gradienteAbierto(m, progreso)) {
      return { error: 'Antes de responder este módulo tienes que estudiar el anterior.' }
    }
    // Forma estricta: tantos enteros como preguntas. Un payload malformado no
    // cuenta como intento.
    const r = Array.isArray(respuestas) ? respuestas : null
    if (!r || r.length !== m.quiz.length || !r.every(Number.isInteger)) return { error: 'Respuestas inválidas.' }
    const minimo = minimoAprobacion(m.quiz.length)
    const res = corregirQuizOficio(r, correctas, minimo) // fuera de rango → incorrecta
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
    return {
      puntaje: res.puntaje,
      minimo,
      total: m.quiz.length,
      correctas: res.correctas,
      aprobado: res.aprobado,
      explicaciones: m.quiz.map((q) => q.explicacion),
      // El slug es la clave de máquina: al alumno se le muestra el término y se
      // le enlaza su ancla dentro del glosario (GlosarioOficio pinta id="t-slug").
      repasa: m.quiz.map((q) => (q.repasa || [])
        .filter((slug) => GLOSARIO[slug])
        .map((slug) => ({ slug, termino: GLOSARIO[slug].termino }))),
    }
  })
}

async function alumnoDe(usuarioId) {
  const rows = await sql`SELECT id, nombre, rol, centro_id FROM usuarios WHERE id = ${usuarioId}`
  const a = rows[0]
  return a ? { id: Number(a.id), nombre: a.nombre, rol: a.rol, centroId: a.centro_id == null ? null : Number(a.centro_id) } : null
}

function comoFirmante(u) {
  return { id: Number(u.id), rol: u.rol, centroId: u.centro_id == null ? null : Number(u.centro_id), centros: u.centros || [] }
}

// El drill lo firma el Oficial de Entrenamiento (el jefe inmediato) después de
// tomárselo. El sistema no lo finge y nadie se firma solo: puedeFirmar() lo
// decide y requireCurrentUser() relee rol y centro en la base.
//
// LA FIRMA ES DEL MÓDULO, NO DE UN DRILL SUELTO: la fila de
// entrenamiento_progreso tiene un solo drill_firmado_at por (usuario, módulo).
// En los módulos que traen varios drills se toman todos y se firma una vez; la
// pantalla lo dice con esas palabras y pide los criterios de todos juntos.
export async function firmarDrill(usuarioId, modulo) {
  return runAction('firmarDrill', async () => {
    const firmante = await requireCurrentUser()
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) return { error: 'Usuario inválido.' }
    if (!MODULO_IDS_OFICIO.has(modulo)) return { error: 'Módulo desconocido.' }
    const m = moduloOficio(modulo)
    if ((m.drills || []).length === 0) return { error: 'Este módulo no tiene drill que firmar.' }
    const alumno = await alumnoDe(usuarioId)
    if (!alumno) return { error: 'Usuario inválido.' }
    if (!m.roles.includes(alumno.rol)) return { error: 'Ese módulo no es del puesto de esa persona.' }
    if (!puedeFirmar(comoFirmante(firmante), alumno)) return { error: 'No eres el Oficial de Entrenamiento de esa persona.' }
    // Firmar lo que no se estudió deja el checksheet diciendo "Drill firmado"
    // al lado de "Por estudiar". Por la UI no se llega, pero la action es
    // pública y el estado resultante es incoherente.
    const suyo = await progresoDeUsuario(alumno.id)
    if (!estudiado(suyo[modulo])) return { error: 'Todavía no lo ha estudiado: no se le puede tomar el drill.' }
    await sql`
      INSERT INTO entrenamiento_progreso (usuario_id, modulo, drill_firmado_at, drill_firmado_por, updated_at)
      VALUES (${alumno.id}, ${modulo}, now(), ${firmante.id}, now())
      ON CONFLICT (usuario_id, modulo) DO UPDATE SET
        drill_firmado_at = now(), drill_firmado_por = ${firmante.id}, updated_at = now()
    `
    return { ok: true }
  })
}

// Quitar una firma puesta por error. Mismo permiso que ponerla.
export async function quitarFirmaDrill(usuarioId, modulo) {
  return runAction('quitarFirmaDrill', async () => {
    const firmante = await requireCurrentUser()
    if (!Number.isInteger(usuarioId) || usuarioId <= 0) return { error: 'Usuario inválido.' }
    if (!MODULO_IDS_OFICIO.has(modulo)) return { error: 'Módulo desconocido.' }
    const alumno = await alumnoDe(usuarioId)
    if (!alumno) return { error: 'Usuario inválido.' }
    if (!puedeFirmar(comoFirmante(firmante), alumno)) return { error: 'No eres el Oficial de Entrenamiento de esa persona.' }
    await sql`
      UPDATE entrenamiento_progreso
      SET drill_firmado_at = NULL, drill_firmado_por = NULL, updated_at = now()
      WHERE usuario_id = ${alumno.id} AND modulo = ${modulo}
    `
    return { ok: true }
  })
}

// Cola del Oficial de Entrenamiento: quién tiene módulos ESTUDIADOS esperando
// que le tomen el drill, y hace cuántos días.
// → { rol, filas:[{ usuarioId, nombre, email, rol, centro, centroId, modulos:[…] }] }
export async function colaFirmas(centroId = null) {
  return runAction('colaFirmas', async () => {
    const firmante = await requireCurrentUser()
    const roles = rolesQueFirma(firmante.rol)
    if (roles.length === 0) return { rol: firmante.rol, filas: [] }
    const cid = Number.isInteger(centroId) && centroId > 0 ? centroId : null
    const candidatos = cid
      ? await sql`SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre AS centro FROM usuarios u LEFT JOIN centros c ON c.id = u.centro_id WHERE u.rol = ANY(${roles}) AND u.centro_id = ${cid} ORDER BY c.nombre, u.nombre`
      : await sql`SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre AS centro FROM usuarios u LEFT JOIN centros c ON c.id = u.centro_id WHERE u.rol = ANY(${roles}) ORDER BY c.nombre, u.nombre`
    const mios = candidatos.filter((a) => puedeFirmar(comoFirmante(firmante), { id: Number(a.id), rol: a.rol, centroId: a.centro_id == null ? null : Number(a.centro_id) }))
    const ids = mios.map((a) => Number(a.id))
    const rows = ids.length
      ? await sql`
          SELECT * FROM entrenamiento_progreso
          WHERE usuario_id = ANY(${ids}) AND modulo LIKE 'of-%'
            AND tour_visto_at IS NOT NULL AND quiz_aprobado_at IS NOT NULL
            AND drill_firmado_at IS NULL
        `
      : []
    const porUsuario = {}
    for (const r of rows) (porUsuario[r.usuario_id] ||= []).push(r)
    const hoy = Date.now()
    const filas = []
    for (const a of mios) {
      const pendientes = (porUsuario[a.id] || [])
        .map((r) => {
          const m = moduloOficio(r.modulo)
          if (!m || (m.drills || []).length === 0) return null
          const desde = r.quiz_aprobado_at ? new Date(r.quiz_aprobado_at) : null
          return {
            id: m.id,
            titulo: m.titulo,
            curso: m.curso,
            orden: m.orden,
            estudiadoAt: desde ? desde.toISOString() : null,
            dias: desde ? Math.max(0, Math.floor((hoy - desde.getTime()) / 86400000)) : null,
            // La cola es la ÚNICA pantalla desde la que se firma: el Oficial
            // necesita los pasos y la masa para poder tomar el ejercicio, no
            // solo los criterios que va a tildar.
            drills: m.drills.map((d) => ({
              titulo: d.titulo,
              proposito: d.proposito,
              gradiente: d.gradiente || '',
              masa: d.masa || [],
              pasos: d.pasos || [],
              criterios: d.criterios || [],
              errorTipico: d.errorTipico || '',
            })),
          }
        })
        .filter(Boolean)
        .sort((x, y) => x.orden - y.orden)
      if (pendientes.length) {
        filas.push({ usuarioId: Number(a.id), nombre: a.nombre, email: a.email, rol: a.rol, centro: a.centro || '—', centroId: a.centro_id, modulos: pendientes })
      }
    }
    return { rol: firmante.rol, filas }
  })
}

// Badge del menú: cuántos drills esperan tu firma. Cuenta y ya — la cola
// completa (con los criterios de cada drill) no tiene por qué viajar al
// navegador en cada página solo para pintar un número.
// → { n } (0 para quien no le firma a nadie)
export async function contadorFirmas(centroId = null) {
  return runAction('contadorFirmas', async () => {
    const firmante = await requireCurrentUser()
    const roles = rolesQueFirma(firmante.rol)
    if (roles.length === 0) return { n: 0 }
    const cid = Number.isInteger(centroId) && centroId > 0 ? centroId : null
    const candidatos = cid
      ? await sql`SELECT id, rol, centro_id FROM usuarios WHERE rol = ANY(${roles}) AND centro_id = ${cid}`
      : await sql`SELECT id, rol, centro_id FROM usuarios WHERE rol = ANY(${roles})`
    const ids = candidatos
      .filter((a) => puedeFirmar(comoFirmante(firmante), { id: Number(a.id), rol: a.rol, centroId: a.centro_id == null ? null : Number(a.centro_id) }))
      .map((a) => Number(a.id))
    if (!ids.length) return { n: 0 }
    const conDrill = MODULOS_OFICIO.filter((m) => (m.drills || []).length > 0).map((m) => m.id)
    if (!conDrill.length) return { n: 0 }
    const rows = await sql`
      SELECT COUNT(*)::int AS n FROM entrenamiento_progreso
      WHERE usuario_id = ANY(${ids}) AND modulo = ANY(${conDrill})
        AND tour_visto_at IS NOT NULL AND quiz_aprobado_at IS NOT NULL
        AND drill_firmado_at IS NULL
    `
    return { n: Number(rows[0]?.n || 0) }
  })
}

// Gerencia: matriz del oficio. A diferencia de matrizProgreso (que filtra
// rol='administradora' y dejaría fuera justo a las asistentes), aquí entran
// los dos puestos, cada uno con SU plan.
// → { cursos:[{id,titulo,bloque}], usuarios:[{…, porCurso, avance}] }
export async function matrizOficio(centroId = null) {
  return runAction('matrizOficio', async () => {
    await requireCurrentAdmin()
    const cid = Number.isInteger(centroId) && centroId > 0 ? centroId : null
    const usuarios = cid
      ? await sql`SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre AS centro FROM usuarios u LEFT JOIN centros c ON c.id = u.centro_id WHERE u.rol = ANY(${ROLES_ALUMNO}) AND u.centro_id = ${cid} ORDER BY c.nombre, u.rol, u.nombre`
      : await sql`SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre AS centro FROM usuarios u LEFT JOIN centros c ON c.id = u.centro_id WHERE u.rol = ANY(${ROLES_ALUMNO}) ORDER BY c.nombre, u.rol, u.nombre`
    const ids = usuarios.map((u) => Number(u.id))
    const rows = ids.length
      ? await sql`SELECT * FROM entrenamiento_progreso WHERE usuario_id = ANY(${ids}) AND modulo LIKE 'of-%'`
      : []
    const porUsuario = {}
    for (const r of rows) (porUsuario[r.usuario_id] ||= {})[r.modulo] = aCamel(r)
    const cursos = Object.keys(CURSOS).map((id) => ({ id, titulo: CURSOS[id].titulo, bloque: CURSOS[id].bloque }))
    return {
      cursos,
      usuarios: usuarios.map((u) => {
        const progreso = porUsuario[u.id] || {}
        const plan = planDeRol(u.rol, MODULOS_OFICIO)
        const porCurso = {}
        for (const c of cursos) {
          const suyos = plan.filter((m) => m.curso === c.id)
          porCurso[c.id] = {
            total: suyos.length,
            estudiados: suyos.filter((m) => estudiado(progreso[m.id])).length,
            hatted: suyos.filter((m) => hatted(progreso[m.id], m)).length,
          }
        }
        return {
          id: Number(u.id), nombre: u.nombre, email: u.email, rol: u.rol,
          centro: u.centro || '—', centroId: u.centro_id,
          porCurso, avance: avanceOficio(plan, progreso),
        }
      }),
    }
  })
}
