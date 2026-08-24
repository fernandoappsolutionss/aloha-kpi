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
  pais        TEXT NOT NULL DEFAULT 'PA',
  created_at  TIMESTAMPTZ DEFAULT now()
);
-- País del centro ('PA' Panamá / 'VE' Venezuela): define qué fechas patrias
-- salta su calendario de itinerarios.
ALTER TABLE centros ADD COLUMN IF NOT EXISTS pais TEXT NOT NULL DEFAULT 'PA';

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

-- Peticiones / comentarios del administrador (varios por trimestre, cada uno con su estado).
-- centro_id es ON DELETE RESTRICT: un centro con historial de peticiones no se
-- borra en silencio (ver app/actions/centros.js:deleteCentro). tipo distingue
-- lo legado (sin cotizaciones) de comentario/petición formal con cotizaciones
-- de proveedores (peticion_cotizaciones); categoria solo aplica a 'peticion'.
CREATE TABLE IF NOT EXISTS peticiones (
  id                    SERIAL PRIMARY KEY,
  centro_id             INTEGER NOT NULL REFERENCES centros(id) ON DELETE RESTRICT,
  anio                  INTEGER NOT NULL,
  trimestre             INTEGER NOT NULL,
  texto                 TEXT NOT NULL,
  estado                TEXT NOT NULL DEFAULT 'Próximo trimestre',
  tipo                  TEXT NOT NULL,
  categoria             TEXT,
  created_by            INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_by_snapshot   JSONB,
  submitted_at          TIMESTAMPTZ,
  anulada_at            TIMESTAMPTZ,
  draft_expires_at      TIMESTAMPTZ,
  -- Cotización ganadora elegida por gerencia al aprobar (ver
  -- peticiones_cotizacion_aprobada_fkey más abajo: la FK no puede ir inline
  -- porque peticion_cotizaciones aún no existe en este punto del archivo).
  cotizacion_aprobada_id INTEGER,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT peticiones_tipo_check CHECK (tipo IN ('legado', 'comentario', 'peticion')),
  CONSTRAINT peticiones_estado_check CHECK (estado IN ('Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido', 'Anulada')),
  CONSTRAINT peticiones_tipo_categoria_check CHECK (
    (tipo = 'peticion' AND categoria IN ('reparacion', 'activaciones_mercadeo', 'contratacion', 'capacitacion', 'otros'))
    OR (tipo IN ('legado', 'comentario') AND categoria IS NULL)
  ),
  CONSTRAINT peticiones_anulada_at_check CHECK ((estado = 'Anulada') = (anulada_at IS NOT NULL))
);

-- Catálogo ISO-3166-1 alpha-2 de países, usado como referencia del país fiscal
-- de cada proveedor en peticion_cotizaciones (evita país inventado en el FK).
CREATE TABLE IF NOT EXISTS iso_paises (
  codigo CHAR(2) PRIMARY KEY
);
INSERT INTO iso_paises (codigo)
SELECT codigo::CHAR(2)
FROM regexp_split_to_table('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW', ' ') AS codes(codigo)
ON CONFLICT (codigo) DO NOTHING;

-- Cotizaciones de proveedores adjuntas a una petición formal (mínimo 3 válidas
-- para poder enviarla; ver lib/peticiones-domain.mjs). El PDF vive en Blob
-- storage; blob_pathname solo se fija cuando el archivo terminó de subirse y
-- coincide con expected_pathname (contrato firmado por upload_nonce).
CREATE TABLE IF NOT EXISTS peticion_cotizaciones (
  id SERIAL PRIMARY KEY,
  peticion_id INTEGER NOT NULL REFERENCES peticiones(id) ON DELETE RESTRICT,
  proveedor_razon_social TEXT NOT NULL,
  proveedor_clave TEXT NOT NULL,
  proveedor_pais CHAR(2) NOT NULL REFERENCES iso_paises(codigo) ON DELETE RESTRICT,
  proveedor_id_fiscal TEXT NOT NULL,
  proveedor_id_fiscal_clave TEXT NOT NULL,
  empresa_constituida BOOLEAN NOT NULL,
  emite_factura_fiscal BOOLEAN NOT NULL,
  blob_pathname TEXT UNIQUE,
  archivo_nombre TEXT,
  archivo_mime TEXT,
  archivo_bytes INTEGER,
  archivo_sha256 CHAR(64),
  upload_nonce TEXT,
  expected_pathname TEXT UNIQUE,
  upload_status TEXT NOT NULL DEFAULT 'pending',
  upload_attempts INTEGER NOT NULL DEFAULT 0,
  validation_error TEXT,
  uploaded_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  uploaded_by_snapshot JSONB,
  validada_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT peticion_cotizaciones_status_check CHECK (upload_status IN ('pending', 'validating', 'valid', 'invalid', 'cleanup_pending')),
  CONSTRAINT peticion_cotizaciones_attempts_check CHECK (upload_attempts BETWEEN 0 AND 5),
  CONSTRAINT peticion_cotizaciones_pdf_check CHECK (archivo_bytes IS NULL OR archivo_bytes BETWEEN 1 AND 10485760),
  CONSTRAINT peticion_cotizaciones_sha_check CHECK (archivo_sha256 IS NULL OR archivo_sha256 ~ '^[0-9a-f]{64}$'),
  CONSTRAINT peticion_cotizaciones_path_check CHECK (blob_pathname IS NULL OR (expected_pathname IS NOT NULL AND blob_pathname = expected_pathname)),
  CONSTRAINT peticion_cotizaciones_valid_check CHECK (
    upload_status <> 'valid' OR (
      empresa_constituida AND emite_factura_fiscal AND blob_pathname IS NOT NULL AND expected_pathname IS NOT NULL AND
      archivo_nombre IS NOT NULL AND archivo_mime = 'application/pdf' AND
      archivo_bytes BETWEEN 1 AND 10485760 AND archivo_sha256 IS NOT NULL AND
      uploaded_by_snapshot IS NOT NULL AND validada_at IS NOT NULL
    )
  ),
  CONSTRAINT uq_peticion_proveedor_fiscal UNIQUE (peticion_id, proveedor_pais, proveedor_id_fiscal_clave),
  CONSTRAINT uq_peticion_pdf_sha UNIQUE (peticion_id, archivo_sha256)
);

-- FK de peticiones.cotizacion_aprobada_id: va aquí (no inline arriba) porque
-- peticion_cotizaciones se declara después de peticiones en este archivo.
-- DROP + ADD porque Postgres no tiene ADD CONSTRAINT IF NOT EXISTS: el par es
-- re-ejecutable sobre una base existente (sin él, 42710 aborta migrate.mjs y
-- nada posterior se aplica) y va en sentencias planas, compatibles con el
-- split por ';' de scripts/migrate.mjs — mismo patrón que
-- chk_retiro_programado_estado más abajo.
ALTER TABLE peticiones DROP CONSTRAINT IF EXISTS peticiones_cotizacion_aprobada_fkey;
ALTER TABLE peticiones
  ADD CONSTRAINT peticiones_cotizacion_aprobada_fkey
  FOREIGN KEY (cotizacion_aprobada_id) REFERENCES peticion_cotizaciones(id) ON DELETE SET NULL;

-- Auditoría de cambios de estado de una petición. La primera fila de cada
-- petición debe nacer sin estado_anterior y en 'Próximo trimestre' (índice
-- único parcial garantiza una sola fila inicial por petición).
CREATE TABLE IF NOT EXISTS peticion_estado_historial (
  id SERIAL PRIMARY KEY,
  peticion_id INTEGER NOT NULL REFERENCES peticiones(id) ON DELETE RESTRICT,
  estado_anterior TEXT,
  estado_nuevo TEXT NOT NULL,
  changed_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  changed_by_snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT peticion_historial_inicial_check CHECK (estado_anterior IS NOT NULL OR estado_nuevo = 'Próximo trimestre'),
  CONSTRAINT peticion_historial_anterior_check CHECK (estado_anterior IS NULL OR estado_anterior IN ('Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido', 'Anulada')),
  CONSTRAINT peticion_historial_nuevo_check CHECK (estado_nuevo IN ('Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido', 'Anulada'))
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_peticion_historial_inicial
  ON peticion_estado_historial (peticion_id) WHERE estado_anterior IS NULL;

-- Cola de borrado diferido de blobs (PDFs reemplazados/inválidos que ya no
-- deben vivir en storage). lock_token + lock_generation dan fencing: un
-- worker viejo con lock obsoleto no puede completar una fila que ya fue
-- reabierta (generation incrementado) por otro proceso.
CREATE TABLE IF NOT EXISTS peticion_blob_cleanup (
  id SERIAL PRIMARY KEY,
  blob_pathname TEXT NOT NULL UNIQUE,
  motivo TEXT NOT NULL,
  intentos INTEGER NOT NULL DEFAULT 0,
  proximo_intento_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_error TEXT,
  generation INTEGER NOT NULL DEFAULT 1,
  locked_at TIMESTAMPTZ,
  lock_token TEXT,
  lock_generation INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Cursor único del reconciliador blob↔DB (una sola fila 'peticiones'): evita
-- que dos workers concurrentes avancen el mismo cursor de listado dos veces
-- (reconcileBlobPage compara contra el valor guardado antes de escribir).
CREATE TABLE IF NOT EXISTS peticion_cleanup_checkpoint (
  checkpoint_key TEXT PRIMARY KEY,
  cursor TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO peticion_cleanup_checkpoint (checkpoint_key, cursor)
VALUES ('peticiones', NULL)
ON CONFLICT (checkpoint_key) DO NOTHING;

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
CREATE INDEX IF NOT EXISTS idx_peticiones_medicion
  ON peticiones (centro_id, anio, trimestre, tipo, categoria, estado);
CREATE INDEX IF NOT EXISTS idx_peticion_cleanup_pendiente
  ON peticion_blob_cleanup (proximo_intento_at, id) WHERE completed_at IS NULL;

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
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS origen_venta TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_estudiantes_crm_registration
  ON estudiantes(centro_id, crm_registration_id)
  WHERE crm_registration_id IS NOT NULL;
ALTER TABLE resumen_mes ADD COLUMN IF NOT EXISTS orig_por_clasificar INTEGER DEFAULT 0;

-- Ajuste de conciliacion para activar las fuentes automaticas sin borrar lo
-- que cada centro ya habia declarado manualmente en agosto de 2026.
CREATE TABLE IF NOT EXISTS kpi_auto_ajustes (
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  ajustes JSONB NOT NULL DEFAULT '{}'::jsonb,
  initialized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (centro_id, year, month)
);
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

-- ── CLASE DE PRUEBA: reserva de sala en el calendario ──────────────────────
-- Regla del negocio (Fernando, ago-2026): el día que el centro dedica a clase
-- de prueba NO se arma con grupos de 1 hora — ese día los grupos son de 2 h y
-- arrancan a las 4:30 pm, y la prueba va antes. El sábado la prueba va en el
-- ÚLTIMO turno, después de la tercera jornada.
-- La clase de prueba dura 1 h 30 y ocupa VARIOS salones a la vez, uno por rol:
-- padres, Tiny y Kids.
-- Las horas se guardan igual que en grupo_horarios: día de la semana + hora de
-- pared en TEXT 'HH:MM'. NUNCA derivar el día de un TIMESTAMPTZ: el servidor
-- corre en UTC y los centros operan hasta las 7:30 p. m., así que la tarde
-- caería en el día siguiente.
CREATE TABLE IF NOT EXISTS centro_reservas (
  id SERIAL PRIMARY KEY,
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL DEFAULT 'clase_prueba',
  dia SMALLINT NOT NULL,
  hora_inicio TEXT NOT NULL,
  hora_fin TEXT NOT NULL,
  coach_id INTEGER REFERENCES coaches(id) ON DELETE SET NULL,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_centro_reservas_centro ON centro_reservas(centro_id, activo);

-- Un salón por rol. UNIQUE por (reserva, salón, rol) y no por (reserva, salón):
-- en un centro de 2 salones uno solo puede cargar dos roles.
-- El coach va POR SALA, no por reserva: Tiny y Kids son dos clases distintas a
-- la misma hora y cada una lleva su coach. A los papás los recibe la
-- administración, por eso ese rol puede quedar sin coach.
CREATE TABLE IF NOT EXISTS centro_reserva_salones (
  id SERIAL PRIMARY KEY,
  reserva_id INTEGER NOT NULL REFERENCES centro_reservas(id) ON DELETE CASCADE,
  salon_id INTEGER NOT NULL REFERENCES salones(id) ON DELETE CASCADE,
  rol TEXT NOT NULL,
  coach_id INTEGER REFERENCES coaches(id) ON DELETE SET NULL
);
ALTER TABLE centro_reserva_salones ADD COLUMN IF NOT EXISTS coach_id INTEGER REFERENCES coaches(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_reserva_salon_rol ON centro_reserva_salones(reserva_id, salon_id, rol);

-- Ruta al Proximo Nivel: cada calculo queda congelado con la version del
-- motor para poder explicar la recomendacion y medir su error despues.
CREATE TABLE IF NOT EXISTS growth_snapshots (
  id BIGSERIAL PRIMARY KEY,
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  engine_version TEXT NOT NULL,
  confidence TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (centro_id, snapshot_date, engine_version)
);
CREATE INDEX IF NOT EXISTS idx_growth_snapshots_centro
  ON growth_snapshots(centro_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS growth_recommendations (
  id BIGSERIAL PRIMARY KEY,
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  snapshot_id BIGINT NOT NULL REFERENCES growth_snapshots(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  generated_for DATE NOT NULL,
  title TEXT NOT NULL,
  reason TEXT NOT NULL,
  action TEXT NOT NULL,
  metric TEXT NOT NULL,
  baseline NUMERIC,
  target NUMERIC,
  unit TEXT,
  estimated_impact NUMERIC DEFAULT 0,
  effort NUMERIC DEFAULT 1,
  priority NUMERIC DEFAULT 0,
  responsible TEXT,
  due_date DATE,
  expires_at DATE,
  status TEXT NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (centro_id, kind, generated_for)
);
CREATE INDEX IF NOT EXISTS idx_growth_recommendations_active
  ON growth_recommendations(centro_id, status, generated_for DESC);

CREATE TABLE IF NOT EXISTS growth_notification_receipts (
  id BIGSERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  snapshot_id BIGINT NOT NULL REFERENCES growth_snapshots(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  shown_at TIMESTAMPTZ DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (usuario_id, week_start)
);
CREATE INDEX IF NOT EXISTS idx_growth_receipts_usuario
  ON growth_notification_receipts(usuario_id, week_start DESC);

-- ── LLENADO AUTOMÁTICO: ventana de niños nuevos (diseño 2026-08-08) ─────────
-- El cierre de llenado es un ESTADO DERIVADO del itinerario (manual ALOHA:
-- TINY acepta niños nuevos hasta la semana 4 del libro, KIDS hasta la 2,
-- aplicado al nivel vigente; KINDER y sin-itinerario exentos). NO hay cron
-- que mute flags: la palanca inscripcion_abierta sigue siendo solo manual.
-- llenado_extendido_hasta = override consciente de un admin: extiende la
-- ventana de nuevos más allá de la fecha límite derivada. Queda rastro y
-- vence sola; es la única escritura manual de "estado" nueva.
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS llenado_extendido_hasta DATE;

-- llenado_fingerprint = marcador atómico del estado de ventana que ya vio el
-- cron diario: 'nivel|fecha_limite_efectiva|abierta'. El cron calcula el
-- vigente en JS y en UN solo statement CTE hace
-- UPDATE ... WHERE llenado_fingerprint IS DISTINCT FROM $fp + INSERT al
-- outbox desde las filas cambiadas: marcar y encolar son atómicos, si el
-- proceso cae no se pierde la transición (cubre apertura Y vencimiento).
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS llenado_fingerprint TEXT;

-- Palanca manual con defecto explícito (regla 2026-08-01): el cliente mantiene
-- la convención `!== false`, pero en DB NULL deja de existir — se normaliza
-- NULL→TRUE y se fija DEFAULT TRUE + NOT NULL para que la palanca nunca quede
-- ambigua en filas viejas. Sentencias planas: el UPDATE va ANTES del SET NOT
-- NULL para que la migración no reviente con filas NULL existentes.
UPDATE grupos SET inscripcion_abierta = TRUE WHERE inscripcion_abierta IS NULL;
ALTER TABLE grupos ALTER COLUMN inscripcion_abierta SET DEFAULT TRUE;
ALTER TABLE grupos ALTER COLUMN inscripcion_abierta SET NOT NULL;

-- Outbox durable de sincronización al CRM: el estado derivado cambia sin
-- evento propio, pero ventas debe ver 0 cupos al vencer la ventana. Una fila
-- POR EVENTO CRM, no por grupo (corrección g2-5): al cerrar o fusionar, los
-- centro_eventos.grupo_id se capturan ANTES de desvincular y el encolado
-- clear_group va en la misma transacción — el consumidor nunca pierde a quién
-- limpiarle aloha_group (por eso grupo_id admite NULL y va sin FK: debe
-- sobrevivir a la desvinculación). clave_idem UNIQUE hace idempotente el
-- encolado; locked_at + lock_token permiten reclamar lotes sin doble
-- procesamiento; intentos + ultimo_error acotan reintentos (corte en 5).
CREATE TABLE IF NOT EXISTS crm_sync_outbox (
  id            SERIAL PRIMARY KEY,
  crm_event_id  TEXT NOT NULL,
  grupo_id      INTEGER,
  op            TEXT NOT NULL CHECK (op IN ('sync_group','clear_group')),
  motivo        TEXT NOT NULL,
  clave_idem    TEXT UNIQUE,
  creado_at     TIMESTAMPTZ DEFAULT now(),
  procesado_at  TIMESTAMPTZ,
  intentos      INTEGER DEFAULT 0,
  ultimo_error  TEXT,
  locked_at     TIMESTAMPTZ,
  lock_token    TEXT
);
-- Índice parcial: el consumidor solo pregunta por lo pendiente (procesado_at
-- IS NULL, orden por id); lo procesado no estorba en el índice.
CREATE INDEX IF NOT EXISTS idx_crm_sync_outbox_pendientes
  ON crm_sync_outbox (id) WHERE procesado_at IS NULL;

-- ── REMODELADO GRUPO/NIÑO (diseño 2026-08-08): esquema por niño ─────────────
-- Modelo de Fernando: la planificación va POR NIÑO, el KPI sale solo de
-- eventos y el retiro se programa con evidencia de asistencia. Aquí van SOLO
-- las columnas e índices aplicables hoy sin tocar datos; lo que depende de
-- preflight o dedupe queda COMENTADO más abajo con su instrucción.

-- Ancla de planificación por niño (R3/g1-8): el plan del niño se DERIVA al
-- vuelo desde esta fecha (nunca se persiste por niño). Con grupo desde el
-- alta: max(fecha_inscripcion, grupo.fecha_inicio_clases); pendiente colocado:
-- max(fecha_colocacion canónica, grupo.fecha_inicio_clases) — jamás la
-- fecha_inscripcion vieja de la ficha pendiente.
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS fecha_inicio_nivel DATE;

-- Retiro programado (R5/g1-24): programarRetiro escribe estado='baja_potencial'
-- + esta fecha (día 1 del mes siguiente) + evento con el estado previo, todo
-- en UNA transacción. El cron reclama por lotes (FOR UPDATE SKIP LOCKED) y
-- registra el retiro con fecha = retiro_programado_para, no el día físico.
-- cancelarRetiroProgramado RESTAURA el estado previo y LIMPIA esta fecha en la
-- misma transacción: si no limpia estado+fecha, el cron lo retiraría igual.
ALTER TABLE estudiantes ADD COLUMN IF NOT EXISTS retiro_programado_para DATE;

-- Detalle estructurado del evento (g1-11/g1-24): cierre real de un nivel
-- terminado (anclas y posiciones antes/después), estado previo del niño al
-- programar retiro, evidencia de overrides de asistencia. JSONB libre: el
-- contrato de cada tipo vive en el código, no en el esquema.
ALTER TABLE estudiante_eventos ADD COLUMN IF NOT EXISTS detalle JSONB;

-- Origen del evento de venta canónico (R4/g1-17): se copia ATÓMICAMENTE del
-- alta al crear el evento de inscripción, para que calcularKpiSemanalAuto
-- discrimine orígenes sin depender de la ficha viva del estudiante.
ALTER TABLE estudiante_eventos ADD COLUMN IF NOT EXISTS origen TEXT;

-- Override manual de cp_matriculados (R4/g1-21): efectivo = override ?? derivado.
-- Editar fija el override; "Usar valor del módulo" lo limpia (NULL). El efectivo
-- se materializa en cp_matriculados para no tocar consumidores existentes.
ALTER TABLE resumen_mes ADD COLUMN IF NOT EXISTS cp_matriculados_override INTEGER;

-- El cron de retiros solo pregunta por baja_potencial con fecha programada:
-- índice parcial, lo demás no estorba (g1-24).
CREATE INDEX IF NOT EXISTS idx_retiros_programados
  ON estudiantes (retiro_programado_para) WHERE estado = 'baja_potencial';

-- Coherencia estado/fecha (R5/g1-24), la mitad aplicable HOY: una fecha de
-- retiro programado solo puede vivir en un niño en baja_potencial. Todas las
-- filas existentes tienen la columna recién creada en NULL, así que el
-- constraint no reclasifica nada; y obliga a que quien mueva el estado limpie
-- la fecha EN EL MISMO statement (la limpieza es parte del contrato, no un
-- detalle). DROP + ADD porque Postgres no tiene ADD CONSTRAINT IF NOT EXISTS:
-- el par es re-ejecutable y plano (compatible con el split por ';' del parser
-- de scripts/migrate.mjs).
ALTER TABLE estudiantes DROP CONSTRAINT IF EXISTS chk_retiro_programado_estado;
ALTER TABLE estudiantes ADD CONSTRAINT chk_retiro_programado_estado
  CHECK (estado = 'baja_potencial' OR retiro_programado_para IS NULL);
-- La mitad inversa (todo baja_potencial DEBE tener fecha) NO es aplicable en
-- plano: las bajas legacy sin fecha quedan marcadas 'legacy', NO entran al
-- cron y se listan para decisión humana (g1-24). Queda para la fase de datos,
-- y SOLO si esa fase resuelve o exime a todas las legacy:
-- ALTER TABLE estudiantes DROP CONSTRAINT IF EXISTS chk_baja_potencial_con_fecha;
-- ALTER TABLE estudiantes ADD CONSTRAINT chk_baja_potencial_con_fecha
--   CHECK (estado <> 'baja_potencial' OR retiro_programado_para IS NOT NULL);

-- (g1-2, POST-PREFLIGHT — NO DESCOMENTAR hasta que el preflight de grupos
-- activos con fecha_inicio_clases NULL pase en prod. Migración en dos pasos:
-- datos primero, constraint después. Al aplicarlo, sacar las dos sentencias
-- del comentario tal cual están.)
-- ALTER TABLE grupos DROP CONSTRAINT IF EXISTS chk_grupo_activo_con_fecha;
-- ALTER TABLE grupos ADD CONSTRAINT chk_grupo_activo_con_fecha
--   CHECK (estado <> 'activo' OR fecha_inicio_clases IS NOT NULL);

-- (g1-17, POST-DEDUPE — NO DESCOMENTAR hasta correr el manifiesto/dedupe de la
-- historia de eventos (scripts/dedupe-inscripciones-2026-08-08.mjs, dry-run →
-- apply con reporte ok): hoy puede haber inscripciones duplicadas por
-- estudiante y crm_registration_id repetidos; los índices únicos reventarían
-- la migración. Al aplicarlos, sacarlos del comentario tal cual están.)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_evento_inscripcion_canonica
--   ON estudiante_eventos (estudiante_id) WHERE tipo = 'inscripcion';
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_estudiantes_centro_crm_reg
--   ON estudiantes (centro_id, crm_registration_id) WHERE crm_registration_id IS NOT NULL;

-- ══ ENTRENAMIENTO EN-APP (2026-08-23) ══
-- Progreso del entrenamiento por USUARIO (no por centro): dos administradoras
-- del mismo centro llevan cada una el suyo. Completado = tour_visto_at AND
-- quiz_aprobado_at. El contenido de los módulos vive en lib/entrenamiento/modulos.js.
CREATE TABLE IF NOT EXISTS entrenamiento_progreso (
  id               SERIAL PRIMARY KEY,
  usuario_id       INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo           TEXT NOT NULL,
  tour_visto_at    TIMESTAMPTZ,
  quiz_aprobado_at TIMESTAMPTZ,
  intentos         INTEGER NOT NULL DEFAULT 0,
  ultimo_puntaje   INTEGER,
  updated_at       TIMESTAMPTZ DEFAULT now(),
  UNIQUE (usuario_id, modulo)
);
-- (sin índice extra: el UNIQUE ya indexa usuario_id como primera columna)
