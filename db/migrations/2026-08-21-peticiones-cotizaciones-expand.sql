ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS tipo TEXT;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS created_by INTEGER;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS created_by_snapshot JSONB;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS anulada_at TIMESTAMPTZ;
ALTER TABLE peticiones ADD COLUMN IF NOT EXISTS draft_expires_at TIMESTAMPTZ;

UPDATE peticiones
SET tipo = 'legado',
    submitted_at = COALESCE(submitted_at, created_at, updated_at, now())
WHERE tipo IS NULL;

UPDATE peticiones
SET anulada_at = COALESCE(anulada_at, updated_at, created_at, now())
WHERE estado = 'Anulada' AND anulada_at IS NULL;

ALTER TABLE peticiones ALTER COLUMN tipo SET DEFAULT 'legado';

DO $$
DECLARE fk_name TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'peticiones'::regclass AND conname = 'peticiones_created_by_fkey') THEN
    ALTER TABLE peticiones
      ADD CONSTRAINT peticiones_created_by_fkey
      FOREIGN KEY (created_by) REFERENCES usuarios(id) ON DELETE SET NULL;
  END IF;

  FOR fk_name IN
    SELECT c.conname FROM pg_constraint c
    WHERE c.contype = 'f'
      AND c.conrelid = 'peticiones'::regclass
      AND c.confrelid = 'centros'::regclass
      AND c.conkey = ARRAY[(
        SELECT a.attnum FROM pg_attribute a
        WHERE a.attrelid = 'peticiones'::regclass AND a.attname = 'centro_id'
      )]::smallint[]
  LOOP
    EXECUTE format('ALTER TABLE peticiones DROP CONSTRAINT %I', fk_name);
  END LOOP;
  ALTER TABLE peticiones
    ADD CONSTRAINT peticiones_centro_id_fkey
    FOREIGN KEY (centro_id) REFERENCES centros(id) ON DELETE RESTRICT;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'peticiones'::regclass AND conname = 'peticiones_tipo_check') THEN
    ALTER TABLE peticiones ADD CONSTRAINT peticiones_tipo_check
      CHECK (tipo IN ('legado', 'comentario', 'peticion')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'peticiones'::regclass AND conname = 'peticiones_estado_check') THEN
    ALTER TABLE peticiones ADD CONSTRAINT peticiones_estado_check
      CHECK (estado IN ('Próximo trimestre', 'Negado', 'Aprobado', 'En proceso', 'Cumplido', 'Anulada')) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'peticiones'::regclass AND conname = 'peticiones_tipo_categoria_check') THEN
    ALTER TABLE peticiones ADD CONSTRAINT peticiones_tipo_categoria_check
      CHECK (
        (tipo = 'peticion' AND categoria IN ('reparacion', 'activaciones_mercadeo', 'contratacion', 'capacitacion', 'otros'))
        OR (tipo IN ('legado', 'comentario') AND categoria IS NULL)
      ) NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'peticiones'::regclass AND conname = 'peticiones_anulada_at_check') THEN
    ALTER TABLE peticiones ADD CONSTRAINT peticiones_anulada_at_check
      CHECK ((estado = 'Anulada') = (anulada_at IS NOT NULL)) NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS iso_paises (
  codigo CHAR(2) PRIMARY KEY
);
INSERT INTO iso_paises (codigo)
SELECT codigo::CHAR(2)
FROM regexp_split_to_table('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW', ' ') AS codes(codigo)
ON CONFLICT (codigo) DO NOTHING;

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

CREATE INDEX IF NOT EXISTS idx_peticiones_medicion
  ON peticiones (centro_id, anio, trimestre, tipo, categoria, estado);
CREATE INDEX IF NOT EXISTS idx_peticion_cleanup_pendiente
  ON peticion_blob_cleanup (proximo_intento_at, id) WHERE completed_at IS NULL;
