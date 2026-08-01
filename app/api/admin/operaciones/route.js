// POST /api/admin/operaciones — herramientas de administración del módulo de
// operaciones para entornos sin acceso directo a Neon (p. ej. sesiones de nube).
// Autenticación por credenciales de un usuario admin en el cuerpo (igual que el
// login: bcrypt contra usuarios + rol admin). Acciones:
//   { email, password, accion: 'init' }                → crea las tablas del módulo
//     (mismo DDL idempotente de db/schema.sql — mantener sincronizado).
//   { email, password, accion: 'importar', datos: {…} } → carga inicial de un centro
//     (salones, coaches, grupos con horarios y estudiantes). Los grupos cuyo número
//     ya existe se omiten, así la importación se puede reintentar sin duplicar.
import { sql } from '../../../../lib/db'
import { verifyPassword, isAdminRole } from '../../../../lib/auth'
import { ITINERARIOS, NIVEL_MAX } from '../../../../lib/operaciones'

// Bloque DDL del módulo (copiado de db/schema.sql; idempotente, sin ';' internos).
const DDL = `
-- ══ MÓDULO DE OPERACIONES (grupos, estudiantes, cuadro de negocio) ══

CREATE TABLE IF NOT EXISTS salones (
  id SERIAL PRIMARY KEY,
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  es_hibrido BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_salones_centro ON salones(centro_id);

CREATE TABLE IF NOT EXISTS coaches (
  id SERIAL PRIMARY KEY,
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  nivel_kids INTEGER DEFAULT 0,
  kinder1 BOOLEAN DEFAULT FALSE,
  kinder23 BOOLEAN DEFAULT FALSE,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coaches_centro ON coaches(centro_id);

CREATE TABLE IF NOT EXISTS grupos (
  id SERIAL PRIMARY KEY,
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  numero TEXT NOT NULL,
  itinerario TEXT NOT NULL DEFAULT 'TINY',
  es_online BOOLEAN DEFAULT FALSE,
  coach_id INTEGER REFERENCES coaches(id) ON DELETE SET NULL,
  estado TEXT NOT NULL DEFAULT 'activo',
  fecha_apertura DATE,
  fecha_cierre DATE,
  fusionado_en INTEGER REFERENCES grupos(id) ON DELETE SET NULL,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (centro_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_grupos_centro ON grupos(centro_id);

CREATE TABLE IF NOT EXISTS grupo_horarios (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  dia INTEGER NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  salon_id INTEGER REFERENCES salones(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_grupo_horarios_grupo ON grupo_horarios(grupo_id);

CREATE TABLE IF NOT EXISTS estudiantes (
  id SERIAL PRIMARY KEY,
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  grupo_id INTEGER REFERENCES grupos(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  itinerario TEXT NOT NULL DEFAULT 'TINY',
  nivel INTEGER NOT NULL DEFAULT 1,
  estado TEXT NOT NULL DEFAULT 'activo',
  status_plataforma TEXT DEFAULT 'INCLUIR',
  origen TEXT DEFAULT 'directo',
  crm_registration_id TEXT,
  fecha_inscripcion DATE,
  fecha_cierre_nivel DATE,
  representante TEXT,
  correo TEXT,
  telefono TEXT,
  motivo_retiro TEXT,
  fecha_retiro DATE,
  ultima_asistencia DATE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_estudiantes_centro ON estudiantes(centro_id);
CREATE INDEX IF NOT EXISTS idx_estudiantes_grupo ON estudiantes(grupo_id);

CREATE TABLE IF NOT EXISTS estudiante_eventos (
  id SERIAL PRIMARY KEY,
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  fecha DATE,
  de_grupo_id INTEGER,
  a_grupo_id INTEGER,
  de_nivel INTEGER,
  a_nivel INTEGER,
  motivo TEXT,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_est_eventos_centro_mes ON estudiante_eventos(centro_id, year, month);
CREATE INDEX IF NOT EXISTS idx_est_eventos_est ON estudiante_eventos(estudiante_id);

CREATE TABLE IF NOT EXISTS pedidos_material (
  id SERIAL PRIMARY KEY,
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  fecha DATE,
  numero_oe TEXT,
  producto TEXT NOT NULL DEFAULT 'KIT',
  itinerario TEXT,
  nivel INTEGER,
  grupo_id INTEGER REFERENCES grupos(id) ON DELETE SET NULL,
  cantidad INTEGER DEFAULT 0,
  monto NUMERIC DEFAULT 0,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_centro_mes ON pedidos_material(centro_id, year, month);

ALTER TABLE resumen_mes ADD COLUMN IF NOT EXISTS mot_otro INTEGER DEFAULT 0;
ALTER TABLE metas ADD COLUMN IF NOT EXISTS royalty_por_nino NUMERIC DEFAULT 12;
ALTER TABLE metas ADD COLUMN IF NOT EXISTS cupo_max_grupo INTEGER DEFAULT 15;
`

async function autenticarAdmin(email, password) {
  if (!email || !password) return { status: 401, error: 'Correo y contraseña son requeridos.' }
  const mail = String(email).trim().toLowerCase()
  const rows = await sql`SELECT id, email, rol, password_hash FROM usuarios WHERE email = ${mail}`
  const user = rows[0]
  if (!user) return { status: 401, error: 'Correo o contraseña incorrectos.' }
  const ok = await verifyPassword(String(password), user.password_hash)
  if (!ok) return { status: 401, error: 'Correo o contraseña incorrectos.' }
  if (!isAdminRole(user.rol)) return { status: 403, error: 'Solo un administrador general puede ejecutar esta acción.' }
  return { user }
}

// Ejecuta una sentencia cruda (mismo truco de scripts/migrate.mjs: el driver de
// Neon solo acepta tagged templates, así que se construye una a mano).
function ejecutar(st) {
  const strings = [st]
  strings.raw = [st]
  return sql(strings)
}

async function accionInit() {
  const sentencias = DDL
    .split(';')
    .map((s) => s.split('\n').filter((l) => !l.trim().startsWith('--')).join('\n').trim())
    .filter(Boolean)
  for (const st of sentencias) await ejecutar(st)
  return Response.json({ ok: true, ejecutadas: sentencias.length })
}

const limpiar = (v) => (v == null ? null : String(v).trim() || null)

async function accionImportar(datos) {
  const { centroId, fechaBase, salones = [], coaches = [], grupos = [] } = datos || {}
  if (!centroId) return Response.json({ error: 'Falta centroId.' }, { status: 400 })
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fechaBase || ''))) {
    return Response.json({ error: 'fechaBase debe ser YYYY-MM-DD.' }, { status: 400 })
  }
  const centro = (await sql`SELECT id, nombre FROM centros WHERE id = ${centroId}`)[0]
  if (!centro) return Response.json({ error: 'El centro no existe.' }, { status: 400 })

  const [year, month] = [Number(fechaBase.slice(0, 4)), Number(fechaBase.slice(5, 7))]
  const now = new Date().toISOString()

  // Salones y coaches: crear los que falten (por nombre, sin duplicar).
  const salonId = {}
  for (const s of salones) {
    const nombre = limpiar(s.nombre)
    if (!nombre) continue
    const ya = (await sql`SELECT id FROM salones WHERE centro_id = ${centro.id} AND LOWER(nombre) = ${nombre.toLowerCase()}`)[0]
    if (ya) { salonId[nombre.toLowerCase()] = ya.id; continue }
    const [fila] = await sql`
      INSERT INTO salones (centro_id, nombre, es_hibrido) VALUES (${centro.id}, ${nombre}, ${!!s.es_hibrido})
      RETURNING id`
    salonId[nombre.toLowerCase()] = fila.id
  }
  const coachId = {}
  for (const c of coaches) {
    const nombre = limpiar(c.nombre)
    if (!nombre) continue
    const ya = (await sql`SELECT id FROM coaches WHERE centro_id = ${centro.id} AND LOWER(nombre) = ${nombre.toLowerCase()}`)[0]
    if (ya) { coachId[nombre.toLowerCase()] = ya.id; continue }
    const nivelKids = Math.max(0, Math.min(8, Number(c.nivel_kids) || 0))
    const [fila] = await sql`
      INSERT INTO coaches (centro_id, nombre, nivel_kids, kinder1, kinder23, updated_at)
      VALUES (${centro.id}, ${nombre}, ${nivelKids}, ${!!c.kinder1}, ${!!c.kinder23}, ${now})
      RETURNING id`
    coachId[nombre.toLowerCase()] = fila.id
  }

  let gruposCreados = 0
  let estudiantes = 0
  const gruposOmitidos = []
  for (const g of grupos) {
    const numero = limpiar(g.numero)
    if (!numero) continue
    const ya = (await sql`SELECT id FROM grupos WHERE centro_id = ${centro.id} AND numero = ${numero}`)[0]
    if (ya) { gruposOmitidos.push(numero); continue }
    const itinerario = ITINERARIOS.includes(g.itinerario) ? g.itinerario : 'TINY'
    const cid = coachId[String(limpiar(g.coach) || '').toLowerCase()] || null
    const [grupo] = await sql`
      INSERT INTO grupos (centro_id, numero, itinerario, es_online, coach_id, estado, fecha_apertura, notas, updated_at)
      VALUES (${centro.id}, ${numero}, ${itinerario}, ${!!g.es_online}, ${cid}, 'activo', ${g.fecha_apertura || fechaBase}, ${limpiar(g.notas)}, ${now})
      RETURNING id`
    for (const h of g.horarios || []) {
      const dia = Number(h.dia)
      if (!(dia >= 1 && dia <= 7) || !h.hora_inicio || !h.hora_fin) continue
      const sid = salonId[String(limpiar(h.salon) || '').toLowerCase()] || null
      await sql`
        INSERT INTO grupo_horarios (grupo_id, dia, hora_inicio, hora_fin, salon_id)
        VALUES (${grupo.id}, ${dia}, ${h.hora_inicio}, ${h.hora_fin}, ${sid})`
    }
    for (const e of g.estudiantes || []) {
      const nombre = limpiar(e.nombre)
      if (!nombre) continue
      const it = ITINERARIOS.includes(e.itinerario) ? e.itinerario : itinerario
      const nivel = Math.max(1, Math.min(NIVEL_MAX[it], Number(e.nivel) || 1))
      const [est] = await sql`
        INSERT INTO estudiantes (centro_id, grupo_id, nombre, itinerario, nivel, estado, status_plataforma,
          origen, fecha_inscripcion, fecha_cierre_nivel, representante, correo, telefono, updated_at)
        VALUES (${centro.id}, ${grupo.id}, ${nombre}, ${it}, ${nivel}, 'activo', 'ACTIVO',
          'directo', ${e.fecha_inscripcion || fechaBase}, ${e.fecha_cierre_nivel || null},
          ${limpiar(e.representante)}, ${limpiar(e.correo)}, ${limpiar(e.telefono)}, ${now})
        RETURNING id`
      await sql`
        INSERT INTO estudiante_eventos (estudiante_id, centro_id, tipo, year, month, fecha, a_grupo_id, a_nivel)
        VALUES (${est.id}, ${centro.id}, 'inscripcion', ${year}, ${month}, ${e.fecha_inscripcion || fechaBase}, ${grupo.id}, ${nivel})`
      estudiantes++
    }
    gruposCreados++
  }

  return Response.json({
    ok: true,
    centro: centro.nombre,
    salones: Object.keys(salonId).length,
    coaches: Object.keys(coachId).length,
    gruposCreados,
    gruposOmitidos,
    estudiantes,
  })
}

export async function POST(request) {
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Cuerpo JSON inválido.' }, { status: 400 }) }
  const auth = await autenticarAdmin(body.email, body.password)
  if (auth.error) return Response.json({ error: auth.error }, { status: auth.status })

  try {
    if (body.accion === 'init') return await accionInit()
    if (body.accion === 'importar') return await accionImportar(body.datos)
    if (body.accion === 'centros') {
      return Response.json({ ok: true, centros: await sql`SELECT id, nombre FROM centros ORDER BY id` })
    }
    return Response.json({ error: "accion debe ser 'init', 'importar' o 'centros'." }, { status: 400 })
  } catch (e) {
    return Response.json({ error: `Falló la acción: ${e.message}` }, { status: 500 })
  }
}
