'use server'
// Progreso del entrenamiento de OFICIO — los cuatro puestos que se entrenan:
// administradora, asistente, coach y coordinador (ver ROLES_ALUMNO). Vive
// aparte de app/actions/entrenamiento.js: los 9 tours de "cómo usar el
// sistema" no se tocan. Comparte la tabla entrenamiento_progreso, donde el
// campo `modulo` es TEXT libre y los ids de oficio llevan prefijo `of-`.
//
// Como en entrenamiento.js: siempre escribe sobre el usuario de la sesión
// (nunca sobre un id que venga del cliente, salvo la FIRMA, que es un tercero
// autorizado y se verifica con puedeFirmar); las respuestas del quiz viven en
// respuestas-oficio/ (solo servidor) y jamás llegan al cliente.
import { sql } from '../../lib/db'
import { requireSession, requireCurrentUser, requireCurrentAdmin, isAdminRole } from '../../lib/auth'
import { fallo } from '../../lib/errores'
import { MODULOS_OFICIO, CURSOS, MODULO_IDS_OFICIO, moduloOficio, metadatosOficio } from '../../lib/entrenamiento/oficio/catalogo'
import { GLOSARIO } from '../../lib/entrenamiento/oficio/glosario'
import { RESPUESTAS_OFICIO } from '../../lib/entrenamiento/respuestas-oficio/todas'
import {
  minimoAprobacion, corregirQuizOficio, estudiado, hatted, planDeRol,
  avanceOficio, avanceDrills, siguienteOficio, gradienteAbierto, puedeFirmar,
  rolesQueFirma, rolesQueRevisa, OFICIAL_DE, NOMBRE_ROL,
} from '../../lib/entrenamiento/oficio/progreso'

// Los puestos que se entrenan, en el orden en que se muestran: manda la cola de
// firmas, los planes de revisión y las filas de la matriz. Gerencia no aparece
// porque no se entrena; el personal de aseo tampoco, porque no tiene cuenta —
// su paquete se entrega en papel (curso `aseo`, bloque C).
const ROLES_ALUMNO = ['administradora', 'asistente', 'coach', 'coordinador']

// PERTENECER A UN CENTRO no es solo usuarios.centro_id. El Coordinador
// Operativo lo tiene en NULL: manda en varios centros a la vez y su pertenencia
// vive en usuario_centros. Sin contarla, el día que el Coordinador tiene plan
// propio no aparece en la cola de firmas de NINGÚN centro y su supervisor no
// tiene desde dónde firmarle. Por eso las tres consultas de abajo que filtran
// por centro llevan, además del centro_id, un EXISTS contra usuario_centros.
// Va repetido en cada una y no como fragmento reusable porque el tagged
// template de Neon no compone: interpolarle otra consulta la mandaría como
// PARÁMETRO, no como SQL.

// Los cursos que de verdad tienen módulos cargados. CURSOS declara la pista
// aunque su contenido todavía no exista, y una columna "0 de 0" en la matriz o
// una píldora vacía en el índice no dicen nada.
const cursosConModulos = () => Object.keys(CURSOS)
  .map((id) => ({ id, titulo: CURSOS[id].titulo, bloque: CURSOS[id].bloque }))
  .filter((c) => MODULOS_OFICIO.some((m) => m.curso === c.id))

async function runAction(name, work) {
  try { return await work() } catch (error) {
    const result = fallo(name, error)
    if (/^[0-9A-Z]{5}$/.test(String(error?.code || ''))) {
      return { error: 'No se pudo completar la operación. Intenta de nuevo.' }
    }
    return result
  }
}

// tour_visto_at en una fila de oficio = "lo estudió con todo a la vista".
function aCamel(row) {
  return {
    tourVistoAt: row.tour_visto_at ? new Date(row.tour_visto_at).toISOString() : null,
    quizAprobadoAt: row.quiz_aprobado_at ? new Date(row.quiz_aprobado_at).toISOString() : null,
    intentos: Number(row.intentos || 0),
    ultimoPuntaje: row.ultimo_puntaje == null ? null : Number(row.ultimo_puntaje),
    drillFirmadoAt: row.drill_firmado_at ? new Date(row.drill_firmado_at).toISOString() : null,
    drillFirmadoPor: row.drill_firmado_por
      ? { id: Number(row.drill_firmado_por), nombre: row.firmante_nombre || 'Jefe entrenador' }
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

// Quién le puede firmar la maniobra a esta persona, con nombre y apellido. Todo
// el flujo se apoya en "pídele a tu jefe entrenador que te la tome": si el
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

// Los planes que este rol puede REVISAR: leerlos sin entrenarse en ellos.
// Gerencia no tiene plan propio (planDeRol → []) y hasta ahora no veía NADA del
// entrenamiento que le da a su gente. El Coordinador Operativo SÍ tiene el
// suyo —23 módulos— y además revisa: por eso los dos carriles viajan juntos en
// la respuesta y `modo` solo dice cuál es el principal. Quien lea esto para
// "optimizar" dando por hecho que el coordinador no estudia le vuelve a quitar
// la puerta a su plan.
//
// LA DECISIÓN ES DEL SERVIDOR. rolesQueRevisa() sale de OFICIAL_DE (quien firma
// un hat puede leerlo), no de una lista de roles escrita a mano, y la pantalla
// solo pinta lo que esta función devuelve: pedir ?revisar=administradora en la
// URL no habilita nada que no esté aquí. Una asistente sigue sin ver el curso
// de la administradora porque ella sí tiene plan propio → lista vacía.
//
// `conPlan` agrega los metadatos módulo a módulo (los pinta la página del hat);
// el carril del índice solo necesita los totales y no los recibe.
function planesDeRevision(rol, { conPlan = false } = {}) {
  const puede = new Set(rolesQueRevisa(rol, MODULOS_OFICIO))
  // ROLES_ALUMNO manda el orden: la administradora primero, que es el hat mayor.
  return ROLES_ALUMNO.filter((r) => puede.has(r)).map((r) => {
    const plan = planDeRol(r, MODULOS_OFICIO)
    const cursos = cursosConModulos()
      .map((c) => ({ ...c, total: plan.filter((m) => m.curso === c.id).length }))
      .filter((c) => c.total > 0)
    return {
      rol: r,
      rolNombre: NOMBRE_ROL[r] || r,
      total: plan.length,
      minutos: plan.reduce((acc, m) => acc + (m.duracionMin || 0), 0),
      conDrill: plan.filter((m) => (m.drills || []).length > 0).length,
      cursos,
      primero: plan[0] ? { id: plan[0].id, titulo: plan[0].titulo } : null,
      ...(conPlan ? { plan: plan.map(metadatosOficio) } : {}),
    }
  })
}

// → { modo, rol, rolNombre, plan:[metadatos], progreso, avance, drills,
//     siguiente, puedeFirmarA, oficiales, revision }
// Una sola vuelta: la página del hat pinta el checksheet completo con esto.
// modo 'entrenamiento' = tiene plan propio; 'revision' = no lo tiene y solo
// lee los ajenos; 'ninguno' = ni una cosa ni la otra.
//
// LOS DOS CARRILES VIAJAN JUNTOS, y `modo` solo dice cuál es el principal. Con
// el Coordinador Operativo teniendo sus propios módulos, elegir uno le quitaba
// la lectura de los planes que su puesto existe para auditar; y a la
// Administradora, el plan del Coach al que le firma. Lo que se estudia y lo que
// se revisa no se estorban: son dos listas distintas en la misma respuesta.
export async function cargarOficio() {
  return runAction('cargarOficio', async () => {
    const s = await requireSession()
    const plan = planDeRol(s.rol, MODULOS_OFICIO)
    // `conPlan` agrega los metadatos módulo a módulo: es lo que la pantalla de
    // revisión pinta como checksheet del plan ajeno.
    const revision = planesDeRevision(s.rol, { conPlan: true })
    const modo = plan.length > 0 ? 'entrenamiento' : revision.length > 0 ? 'revision' : 'ninguno'
    const comun = {
      modo,
      rol: s.rol,
      rolNombre: NOMBRE_ROL[s.rol] || s.rol,
      veMatriz: isAdminRole(s.rol),
      puedeFirmarA: rolesQueFirma(s.rol),
      revision,
    }
    // Sin plan propio no se le carga progreso: no lo acumula.
    if (plan.length === 0) {
      return {
        ...comun,
        plan: [],
        progreso: {},
        avance: avanceOficio([], {}),
        drills: avanceDrills([], {}),
        siguiente: null,
        oficiales: [],
      }
    }
    const [progreso, oficiales] = await Promise.all([
      progresoDeUsuario(s.uid),
      oficialesDe({ id: Number(s.uid), rol: s.rol, centroId: s.centro_id == null ? null : Number(s.centro_id) }),
    ])
    const sig = siguienteOficio(plan, progreso)
    return {
      ...comun,
      plan: plan.map(metadatosOficio),
      progreso,
      avance: avanceOficio(plan, progreso),
      drills: avanceDrills(plan, progreso),
      siguiente: sig ? { id: sig.id, titulo: sig.titulo, curso: sig.curso } : null,
      oficiales,
    }
  })
}

// Carril "Tu oficio" del índice de Entrenamiento. Dos formas:
//   modo 'entrenamiento' → { rol, cursos:[{id,titulo,bloque,total,estudiados,hatted}], avance, drills, siguiente, revision }
//   modo 'revision'      → { rol, rolNombre, revision:[{rol,rolNombre,total,minutos,conDrill,cursos,primero}] }
// null solo para quien ni se entrena ni le firma a nadie: ahí el carril no se
// pinta. Gerencia y coordinador YA NO caen en ese null — antes sí, y el dueño
// entraba a Entrenamiento y veía únicamente los 9 recorridos del sistema.
//
// `revision` viaja en las DOS formas: quien tiene plan propio y además le firma
// a alguien (la Administradora al Coach y a la Asistente; el Coordinador a los
// tres) necesita los dos carriles a la vez. Aquí va sin `conPlan`: el carril
// del índice solo pinta totales y no tiene por qué bajarse los metadatos de
// tres planes ajenos en cada visita.
export async function resumenOficio() {
  return runAction('resumenOficio', async () => {
    const s = await requireSession()
    const plan = planDeRol(s.rol, MODULOS_OFICIO)
    const revision = planesDeRevision(s.rol)
    // veMatriz: /dashboard/entrenamiento/oficio (quién tiene su hat) es de
    // gerencia — a un coordinador el layout lo devuelve a /dashboard. El
    // enlace se decide con isAdminRole, la misma fuente que ese layout, no
    // comparando nombres de rol en el navegador.
    const veMatriz = isAdminRole(s.rol)
    if (plan.length === 0) {
      if (revision.length === 0) return null
      return { modo: 'revision', rol: s.rol, rolNombre: NOMBRE_ROL[s.rol] || s.rol, veMatriz, revision }
    }
    const progreso = await progresoDeUsuario(s.uid)
    const cursos = cursosConModulos()
      .map((c) => {
        const suyos = plan.filter((m) => m.curso === c.id)
        return {
          ...c,
          total: suyos.length,
          estudiados: suyos.filter((m) => estudiado(progreso[m.id])).length,
          hatted: suyos.filter((m) => hatted(progreso[m.id], m)).length,
        }
      })
      .filter((c) => c.total > 0)
    const sig = siguienteOficio(plan, progreso)
    return {
      modo: 'entrenamiento',
      rol: s.rol,
      rolNombre: NOMBRE_ROL[s.rol] || s.rol,
      veMatriz,
      cursos,
      avance: avanceOficio(plan, progreso),
      drills: avanceDrills(plan, progreso),
      siguiente: sig ? { id: sig.id, titulo: sig.titulo } : null,
      revision,
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
    // se puede (el método dice devuélvete, no te prohíbe avanzar), pero el quiz del
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

// La maniobra la firma el jefe entrenador (el jefe inmediato) después de
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
    if ((m.drills || []).length === 0) return { error: 'Este módulo no tiene maniobra que firmar.' }
    const alumno = await alumnoDe(usuarioId)
    if (!alumno) return { error: 'Usuario inválido.' }
    if (!m.roles.includes(alumno.rol)) return { error: 'Ese módulo no es del puesto de esa persona.' }
    if (!puedeFirmar(comoFirmante(firmante), alumno)) return { error: 'No eres el jefe entrenador de esa persona.' }
    // Firmar lo que no se estudió deja el checksheet diciendo "Drill firmado"
    // al lado de "Por estudiar". Por la UI no se llega, pero la action es
    // pública y el estado resultante es incoherente.
    const suyo = await progresoDeUsuario(alumno.id)
    if (!estudiado(suyo[modulo])) return { error: 'Todavía no lo ha estudiado: no se le puede tomar la maniobra.' }
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
    if (!puedeFirmar(comoFirmante(firmante), alumno)) return { error: 'No eres el jefe entrenador de esa persona.' }
    await sql`
      UPDATE entrenamiento_progreso
      SET drill_firmado_at = NULL, drill_firmado_por = NULL, updated_at = now()
      WHERE usuario_id = ${alumno.id} AND modulo = ${modulo}
    `
    return { ok: true }
  })
}

// Cola del jefe entrenador: quién tiene módulos ESTUDIADOS esperando
// que le tomen la maniobra, y hace cuántos días.
// → { rol, filas:[{ usuarioId, nombre, email, rol, centro, centroId, modulos:[…] }] }
export async function colaFirmas(centroId = null) {
  return runAction('colaFirmas', async () => {
    const firmante = await requireCurrentUser()
    const roles = rolesQueFirma(firmante.rol)
    if (roles.length === 0) return { rol: firmante.rol, filas: [] }
    const cid = Number.isInteger(centroId) && centroId > 0 ? centroId : null
    const candidatos = cid
      ? await sql`SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre AS centro FROM usuarios u LEFT JOIN centros c ON c.id = u.centro_id WHERE u.rol = ANY(${roles}) AND (u.centro_id = ${cid} OR EXISTS (SELECT 1 FROM usuario_centros uc WHERE uc.usuario_id = u.id AND uc.centro_id = ${cid})) ORDER BY c.nombre, u.nombre`
      : await sql`SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre AS centro FROM usuarios u LEFT JOIN centros c ON c.id = u.centro_id WHERE u.rol = ANY(${roles}) ORDER BY c.nombre, u.nombre`
    const mios = candidatos
      .filter((a) => puedeFirmar(comoFirmante(firmante), { id: Number(a.id), rol: a.rol, centroId: a.centro_id == null ? null : Number(a.centro_id) }))
      // AGRUPADAS POR PUESTO. El SQL ordena por centro y por nombre, y a una
      // Administradora con cuatro Coaches y una Asistente le salían las cinco
      // tarjetas intercaladas alfabéticamente: no se puede ver de un vistazo si
      // lo atrasado es de los Coaches o de la Asistente. El orden de los
      // puestos no se escribe otra vez: es el de ROLES_ALUMNO.
      .sort((a, b) => ROLES_ALUMNO.indexOf(a.rol) - ROLES_ALUMNO.indexOf(b.rol))
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
      ? await sql`SELECT u.id, u.rol, u.centro_id FROM usuarios u WHERE u.rol = ANY(${roles}) AND (u.centro_id = ${cid} OR EXISTS (SELECT 1 FROM usuario_centros uc WHERE uc.usuario_id = u.id AND uc.centro_id = ${cid}))`
      : await sql`SELECT u.id, u.rol, u.centro_id FROM usuarios u WHERE u.rol = ANY(${roles})`
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
// los CUATRO puestos que se entrenan, cada uno con SU plan.
// → { cursos:[{id,titulo,bloque}], usuarios:[{…, porCurso, avance}] }
//
// POR QUÉ EL COORDINADOR OPERATIVO NO ENTRA AQUÍ, teniendo como tiene firma
// sobre los otros tres puestos (OFICIAL_DE). Es una decisión, no un olvido:
// esta consulta, sin `centroId`, devuelve a TODA la gente de TODOS los centros,
// y el alcance del Coordinador son los suyos (usuario_centros). Abrirle la
// pantalla sin filtrar sería darle la red completa; abrírsela filtrada es otra
// pantalla —capacidad propia en navigation.js, layout propio bajo
// /dashboard/entrenamiento/oficio y un WHERE por sus centros en las dos ramas
// de abajo— y eso no entra en este paquete.
// Lo que su puesto sí alcanza hoy, y no está en duda: la cola de firmas de cada
// centro que coordina (/centro/<id>/entrenamiento/firmas) y la lectura de los
// tres planes que le firma, en el carril "Los planes que tú firmas". El día que
// haga falta la vista de red, el cambio es el de arriba, no un `||` aquí.
export async function matrizOficio(centroId = null) {
  return runAction('matrizOficio', async () => {
    await requireCurrentAdmin()
    const cid = Number.isInteger(centroId) && centroId > 0 ? centroId : null
    // Los centros de usuario_centros VIAJAN, no solo filtran. Para el
    // Coordinador Operativo `usuarios.centro_id` es NULL —manda en varios
    // centros a la vez— así que sin esto su fila salía con el centro en "—" y
    // la celda de la cola de firmas decía "sin centro": la única pantalla
    // desde la que se le toma la maniobra quedaba sin enlace.
    //
    // Los ids salen como int[] (el mismo ARRAY_AGG que ya usa oficialesDe) y
    // los NOMBRES como una sola cadena con STRING_AGG, no como un segundo
    // array: así no hay dos agregados que tengan que quedar alineados índice a
    // índice, y el texto es literalmente lo que se pinta en la columna.
    const usuarios = cid
      ? await sql`
          SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre AS centro,
                 COALESCE(ARRAY_AGG(uc.centro_id ORDER BY cm.nombre, uc.centro_id) FILTER (WHERE uc.centro_id IS NOT NULL), '{}') AS centro_ids,
                 STRING_AGG(cm.nombre, ' · ' ORDER BY cm.nombre, uc.centro_id) AS centros_texto
          FROM usuarios u
          LEFT JOIN centros c ON c.id = u.centro_id
          LEFT JOIN usuario_centros uc ON uc.usuario_id = u.id
          LEFT JOIN centros cm ON cm.id = uc.centro_id
          WHERE u.rol = ANY(${ROLES_ALUMNO})
            AND (u.centro_id = ${cid} OR EXISTS (SELECT 1 FROM usuario_centros x WHERE x.usuario_id = u.id AND x.centro_id = ${cid}))
          GROUP BY u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre
          ORDER BY c.nombre, u.rol, u.nombre`
      : await sql`
          SELECT u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre AS centro,
                 COALESCE(ARRAY_AGG(uc.centro_id ORDER BY cm.nombre, uc.centro_id) FILTER (WHERE uc.centro_id IS NOT NULL), '{}') AS centro_ids,
                 STRING_AGG(cm.nombre, ' · ' ORDER BY cm.nombre, uc.centro_id) AS centros_texto
          FROM usuarios u
          LEFT JOIN centros c ON c.id = u.centro_id
          LEFT JOIN usuario_centros uc ON uc.usuario_id = u.id
          LEFT JOIN centros cm ON cm.id = uc.centro_id
          WHERE u.rol = ANY(${ROLES_ALUMNO})
          GROUP BY u.id, u.nombre, u.email, u.rol, u.centro_id, c.nombre
          ORDER BY c.nombre, u.rol, u.nombre`
    const ids = usuarios.map((u) => Number(u.id))
    const rows = ids.length
      ? await sql`SELECT * FROM entrenamiento_progreso WHERE usuario_id = ANY(${ids}) AND modulo LIKE 'of-%'`
      : []
    const porUsuario = {}
    for (const r of rows) (porUsuario[r.usuario_id] ||= {})[r.modulo] = aCamel(r)
    const cursos = cursosConModulos()
    // Los planes que se pueden abrir en lectura, con su nombre de puesto: la
    // pantalla enlazaba dos escritos a mano y hoy son cuatro.
    const planes = ROLES_ALUMNO
      .filter((r) => planDeRol(r, MODULOS_OFICIO).length > 0)
      .map((r) => ({ rol: r, rolNombre: NOMBRE_ROL[r] || r }))
    return {
      cursos,
      planes,
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
        // `centros` son los ids de usuario_centros; `centroId` sigue siendo el
        // propio. La pantalla arma el enlace de la firma con el que exista:
        // ver el comentario de la columna "Cola de firmas".
        const centros = (u.centro_ids || []).map(Number)
        const propio = u.centro_id == null ? null : Number(u.centro_id)
        return {
          id: Number(u.id), nombre: u.nombre, email: u.email, rol: u.rol,
          centro: u.centro || u.centros_texto || '—',
          centroId: propio, centros,
          // El centro DESDE EL QUE se le toma la maniobra: el propio si lo
          // tiene; si no, el que la gerencia tenga filtrado (cuando es uno de
          // los suyos) y en último caso el primero que coordina. Sin esto el
          // enlace de la cola de firmas salía roto para todo un puesto.
          centroFirma: propio ?? (cid && centros.includes(cid) ? cid : (centros[0] ?? null)),
          porCurso, avance: avanceOficio(plan, progreso),
        }
      }),
    }
  })
}
