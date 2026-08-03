-- ─────────────────────────────────────────────────────────────
-- ALOHA KPI — Esquema de base de datos (Neon / PostgreSQL)
-- Ejecuta este archivo una sola vez en el SQL Editor de Neon,
-- o con:  psql "$DATABASE_URL" -f db/schema.sql
-- ─────────────────────────────────────────────────────────────

-- Centros (sucursales)
CREATE TABLE IF NOT EXISTS centros (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  region      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Usuarios (autenticación propia: email + password_hash)
CREATE TABLE IF NOT EXISTS usuarios (
  id             SERIAL PRIMARY KEY,
  nombre         TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT,
  rol            TEXT NOT NULL DEFAULT 'administradora', -- admin_general | supervisor | administradora
  centro_id      INTEGER REFERENCES centros(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT now()
);

-- Tokens de invitación / restablecimiento de contraseña (un solo uso, con vencimiento).
-- Se generan al crear un usuario (purpose='invite') o al pedir restablecer (purpose='reset').
CREATE TABLE IF NOT EXISTS password_tokens (
  token       TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  purpose     TEXT NOT NULL DEFAULT 'invite', -- invite | reset
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON password_tokens (user_id);

-- Metas globales por trimestre
CREATE TABLE IF NOT EXISTS metas (
  anio                      INTEGER NOT NULL,
  trimestre                 INTEGER NOT NULL,
  meta_nuevos_ingresos_mes  INTEGER  DEFAULT 20,
  meta_desercion_mes        NUMERIC  DEFAULT 18.4,
  meta_cobranza_max         NUMERIC  DEFAULT 1,
  gpn_min                   NUMERIC  DEFAULT 8,
  cp_conversion             NUMERIC  DEFAULT 50,
  PRIMARY KEY (anio, trimestre)
);

-- Estado del mes por centro (abierto / cerrado)
CREATE TABLE IF NOT EXISTS mes_kpi (
  centro_id   INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'abierto',
  cerrado_at  TIMESTAMPTZ,
  PRIMARY KEY (centro_id, year, month)
);

-- Resumen mensual por centro
CREATE TABLE IF NOT EXISTS resumen_mes (
  centro_id            INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  year                 INTEGER NOT NULL,
  month                INTEGER NOT NULL,
  ninos_inicio_mes     INTEGER DEFAULT 0,
  ninos_final_mes      INTEGER DEFAULT 0,
  grupos_activos       INTEGER DEFAULT 0,
  meta_nuevos_mensual  INTEGER DEFAULT 20,
  nuevos_activos_mes   INTEGER DEFAULT 0,
  cp_invitados         INTEGER DEFAULT 0,
  cp_asistieron        INTEGER DEFAULT 0,
  cp_matriculados      INTEGER DEFAULT 0,
  mot_tecnica          INTEGER DEFAULT 0,
  mot_perdida_clase    INTEGER DEFAULT 0,
  mot_economico        INTEGER DEFAULT 0,
  mot_horario          INTEGER DEFAULT 0,
  mot_graduado         INTEGER DEFAULT 0,  -- graduados (logro): se separan de la deserción real
  orig_referido        INTEGER DEFAULT 0,
  orig_marketing       INTEGER DEFAULT 0,
  orig_centro          INTEGER DEFAULT 0,
  orig_activaciones    INTEGER DEFAULT 0,
  orig_medios          INTEGER DEFAULT 0,
  updated_at           TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (centro_id, year, month)
);

-- KPI semanal por centro (5 días por semana)
CREATE TABLE IF NOT EXISTS kpi_semanas (
  centro_id   INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  year        INTEGER NOT NULL,
  month       INTEGER NOT NULL,
  semana      INTEGER NOT NULL,
  cob_d1 INTEGER DEFAULT 0, cob_d2 INTEGER DEFAULT 0, cob_d3 INTEGER DEFAULT 0, cob_d4 INTEGER DEFAULT 0, cob_d5 INTEGER DEFAULT 0,
  des_d1 INTEGER DEFAULT 0, des_d2 INTEGER DEFAULT 0, des_d3 INTEGER DEFAULT 0, des_d4 INTEGER DEFAULT 0, des_d5 INTEGER DEFAULT 0,
  ing_d1 INTEGER DEFAULT 0, ing_d2 INTEGER DEFAULT 0, ing_d3 INTEGER DEFAULT 0, ing_d4 INTEGER DEFAULT 0, ing_d5 INTEGER DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (centro_id, year, month, semana)
);

-- Trimestres (agrupador para el checklist de cumplimiento)
CREATE TABLE IF NOT EXISTS trimestres (
  id         SERIAL PRIMARY KEY,
  centro_id  INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  anio       INTEGER NOT NULL,
  trimestre  INTEGER NOT NULL,
  UNIQUE (centro_id, anio, trimestre)
);

-- Cumplimiento mensual (checklist 'si' / 'no')
CREATE TABLE IF NOT EXISTS cumplimiento (
  trimestre_id  INTEGER NOT NULL REFERENCES trimestres(id) ON DELETE CASCADE,
  mes           INTEGER NOT NULL,
  classdojo_activo          TEXT,
  ninos_completos_classdojo TEXT,
  padres_conectados         TEXT,
  muro_informacion          TEXT,
  bienvenida                TEXT,
  calendario                TEXT,
  clase_padres              TEXT,
  fotos_grupo               TEXT,
  seguimiento_evolucion     TEXT,
  asistente_classdojo       TEXT,
  portafolio                TEXT,
  grupo_study               TEXT,
  ninos_activos_study       TEXT,
  niveles_actualizados      TEXT,
  coach_activo              TEXT,
  ninos_trabajando_study    TEXT,
  asistencia_dias           TEXT,
  centro_buen_estado        TEXT,
  aromatizante              TEXT,
  mesa_cafe                 TEXT,
  brochure                  TEXT,
  cartel_qr                 TEXT,
  wifi_gratis               TEXT,
  saludo_cordial            TEXT,
  encuestas_satisfaccion    TEXT,
  coach_estrella            TEXT,
  reuniones_mensuales       TEXT,
  monitoreo_camaras         TEXT,
  actividades_equipo        TEXT,
  encuestas_equipo          TEXT,
  meta_cobranza             TEXT,
  meta_desercion            TEXT,
  meta_nuevos_ingresos      TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (trimestre_id, mes)
);

-- FODA trimestral por centro (campos editables por la administradora)
-- Las 4 cuadrantes son editables. Fortalezas/Debilidades se pre-cargan desde el
-- cumplimiento real (checklist) y quedan editables/guardables por el centro.
CREATE TABLE IF NOT EXISTS foda (
  centro_id          INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  anio               INTEGER NOT NULL,
  trimestre          INTEGER NOT NULL,
  fortalezas         TEXT,
  debilidades        TEXT,
  oportunidades      TEXT,
  amenazas           TEXT,
  comentarios        TEXT,
  comentario_estado  TEXT,
  updated_at         TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (centro_id, anio, trimestre)
);
-- Migración para bases existentes: `CREATE TABLE IF NOT EXISTS` no toca una
-- tabla que ya existe, así que toda columna que escribe saveFoda se repite aquí
-- como ALTER idempotente. Si falta una, el SELECT del cargado sigue andando y
-- solo revienta el guardado (42703), que es confuso de diagnosticar.
ALTER TABLE foda ADD COLUMN IF NOT EXISTS fortalezas        TEXT;
ALTER TABLE foda ADD COLUMN IF NOT EXISTS debilidades       TEXT;
ALTER TABLE foda ADD COLUMN IF NOT EXISTS oportunidades     TEXT;
ALTER TABLE foda ADD COLUMN IF NOT EXISTS amenazas          TEXT;
ALTER TABLE foda ADD COLUMN IF NOT EXISTS comentarios       TEXT;
ALTER TABLE foda ADD COLUMN IF NOT EXISTS comentario_estado TEXT;
ALTER TABLE foda ADD COLUMN IF NOT EXISTS updated_at        TIMESTAMPTZ DEFAULT now();

-- Peticiones / comentarios del administrador (varios por trimestre, cada uno con su estado)
CREATE TABLE IF NOT EXISTS peticiones (
  id          SERIAL PRIMARY KEY,
  centro_id   INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  anio        INTEGER NOT NULL,
  trimestre   INTEGER NOT NULL,
  texto       TEXT NOT NULL,
  estado      TEXT NOT NULL DEFAULT 'Próximo trimestre',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Espejo de eventos creados desde ALOHA KPI hacia el CRM (Team Solutionss).
-- Solo guarda qué evento del CRM creó cada centro, para listar "los suyos".
-- Los datos vivos (registros, asistencia) se leen del CRM en tiempo real.
CREATE TABLE IF NOT EXISTS centro_eventos (
  id             SERIAL PRIMARY KEY,
  centro_id      INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  crm_event_id   TEXT NOT NULL UNIQUE,
  crm_account_id TEXT NOT NULL,
  nombre         TEXT,
  start_date     TIMESTAMPTZ,
  created_by     TEXT,
  created_at     TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_centro_eventos_centro ON centro_eventos (centro_id);

-- Índices útiles para las consultas del panel/historial
CREATE INDEX IF NOT EXISTS idx_peticiones_centro   ON peticiones (centro_id, anio, trimestre);
CREATE INDEX IF NOT EXISTS idx_resumen_centro_year ON resumen_mes (centro_id, year);
CREATE INDEX IF NOT EXISTS idx_kpi_centro_year      ON kpi_semanas (centro_id, year);
CREATE INDEX IF NOT EXISTS idx_mes_kpi_centro       ON mes_kpi (centro_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_centro      ON usuarios (centro_id);

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

-- Clase de prueba ↔ grupo por aperturar: cada evento del espejo puede quedar
-- relacionado con el grupo cuyos cupos se muestran en el KPI y viajan al CRM.
ALTER TABLE centro_eventos ADD COLUMN IF NOT EXISTS grupo_id INTEGER REFERENCES grupos(id) ON DELETE SET NULL;

-- Historial del Cuadro de Negocio: al cerrar el mes en KPI Semanal se congela
-- la foto completa del cuadro (jsonb). Esa foto es la verdad histórica del mes
-- cerrado: los movimientos posteriores ya no alteran los meses entregados.
CREATE TABLE IF NOT EXISTS cuadro_mensual (
  id SERIAL PRIMARY KEY,
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  datos JSONB NOT NULL,
  cerrado_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (centro_id, year, month)
);
CREATE INDEX IF NOT EXISTS idx_cuadro_mensual_centro ON cuadro_mensual(centro_id, year, month);

-- Ciclo de llenado del grupo (regla de Fernando, 2026-08-01):
-- inscripcion_abierta = el grupo está EN LLENADO y se puede colocar en clases
-- de prueba; en FALSE ya no entra nadie (ni inscripción, ni reincorporación,
-- ni cambio de grupo, ni fusión hacia él). fecha_inicio_clases determina desde
-- qué mes el grupo (y sus niños) entra al Cuadro de Negocio.
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS inscripcion_abierta BOOLEAN DEFAULT TRUE;
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS fecha_inicio_clases DATE;

-- Itinerario de clases del nivel (manual ALOHA Panamá): generado al crear el
-- grupo desde su fecha de inicio + días de clase, saltando feriados y las
-- vacaciones de diciembre; guarda semanas etiquetadas (inducción/libro/mental
-- day/cierre), cierre estimado e inicio del siguiente nivel (ciclos de 2).
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS itinerario_clases JSONB;

-- Asistencia por clase ligada al itinerario (formato de Anclas Mall): cada
-- grupo tiene un LINK DE COACH (token sin sesión) donde el coach marca
-- presente/ausente/justificada por fecha del itinerario y lleva su nota por
-- niño. Marcar presente actualiza estudiantes.ultima_asistencia (norma del
-- retiro del cuadro).
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS coach_token TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_grupos_coach_token ON grupos(coach_token) WHERE coach_token IS NOT NULL;
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS nota_coach TEXT;
CREATE TABLE IF NOT EXISTS asistencias (
  id SERIAL PRIMARY KEY,
  grupo_id INTEGER NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  estudiante_id INTEGER NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  estado TEXT NOT NULL DEFAULT 'presente',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (estudiante_id, fecha)
);
CREATE INDEX IF NOT EXISTS idx_asistencias_grupo ON asistencias(grupo_id, fecha);
