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

-- Índices útiles para las consultas del panel/historial
CREATE INDEX IF NOT EXISTS idx_resumen_centro_year ON resumen_mes (centro_id, year);
CREATE INDEX IF NOT EXISTS idx_kpi_centro_year      ON kpi_semanas (centro_id, year);
CREATE INDEX IF NOT EXISTS idx_mes_kpi_centro       ON mes_kpi (centro_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_centro      ON usuarios (centro_id);
