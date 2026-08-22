-- ─────────────────────────────────────────────────────────────
-- Conciliador bancario Zoho — expansión (idempotente).
-- Se aplica con:  npm run db:migrate:conciliacion -- --apply
-- ─────────────────────────────────────────────────────────────

-- Qué cuenta bancaria de qué organización de Zoho le corresponde a cada
-- centro. `centro_id` NULL = cuenta corporativa: solo la ve un admin.
-- Una cuenta de Zoho se mapea UNA sola vez (índice único abajo): si dos filas
-- apuntaran al mismo banco, cada una llevaría su propio historial de huellas y
-- el mismo movimiento podría publicarse dos veces.
CREATE TABLE IF NOT EXISTS conciliacion_cuentas (
  id                     SERIAL PRIMARY KEY,
  centro_id              INTEGER REFERENCES centros(id) ON DELETE CASCADE,
  etiqueta               TEXT NOT NULL,
  zoho_org_id            TEXT NOT NULL,
  zoho_org_nombre        TEXT,
  zoho_account_id        TEXT NOT NULL,
  zoho_account_nombre    TEXT,
  moneda                 TEXT DEFAULT 'USD',
  -- Cuentas puente: dónde cae lo que ninguna regla clasifica.
  cuenta_ingreso_id      TEXT,
  cuenta_ingreso_nombre  TEXT,
  cuenta_gasto_id        TEXT,
  cuenta_gasto_nombre    TEXT,
  tolerancia_dias        INTEGER NOT NULL DEFAULT 3,
  activa                 BOOLEAN NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_concil_cuentas_zoho
  ON conciliacion_cuentas (zoho_org_id, zoho_account_id);
CREATE INDEX IF NOT EXISTS idx_concil_cuentas_centro
  ON conciliacion_cuentas (centro_id);

-- Reglas de auto-clasificación por descripción. `cuenta_id` NULL = aplica a
-- todas las cuentas de esa organización.
CREATE TABLE IF NOT EXISTS conciliacion_reglas (
  id                   SERIAL PRIMARY KEY,
  zoho_org_id          TEXT NOT NULL,
  cuenta_id            INTEGER REFERENCES conciliacion_cuentas(id) ON DELETE CASCADE,
  patron               TEXT NOT NULL,
  modo                 TEXT NOT NULL DEFAULT 'contiene'
                         CHECK (modo IN ('contiene', 'empieza', 'termina', 'palabras')),
  direccion            TEXT NOT NULL DEFAULT 'ambas'
                         CHECK (direccion IN ('entrada', 'salida', 'ambas')),
  zoho_account_id      TEXT NOT NULL,
  zoho_account_nombre  TEXT,
  transaction_type     TEXT,
  prioridad            INTEGER NOT NULL DEFAULT 0,
  activa               BOOLEAN NOT NULL DEFAULT TRUE,
  creado_por           INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_concil_reglas_org ON conciliacion_reglas (zoho_org_id, activa);
CREATE INDEX IF NOT EXISTS idx_concil_reglas_cuenta ON conciliacion_reglas (cuenta_id);
-- Una carga de extracto (un CSV subido).
CREATE TABLE IF NOT EXISTS conciliacion_lotes (
  id              SERIAL PRIMARY KEY,
  cuenta_id       INTEGER NOT NULL REFERENCES conciliacion_cuentas(id) ON DELETE CASCADE,
  archivo         TEXT,
  periodo_desde   DATE,
  periodo_hasta   DATE,
  estado          TEXT NOT NULL DEFAULT 'borrador', -- borrador | parcial | conciliado
  resumen         JSONB,
  avisos          JSONB,
  subido_por      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),
  publicado_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_concil_lotes_cuenta ON conciliacion_lotes (cuenta_id, created_at DESC);

-- Cada línea del extracto.
CREATE TABLE IF NOT EXISTS conciliacion_movimientos (
  id                   SERIAL PRIMARY KEY,
  lote_id              INTEGER NOT NULL REFERENCES conciliacion_lotes(id) ON DELETE CASCADE,
  cuenta_id            INTEGER NOT NULL REFERENCES conciliacion_cuentas(id) ON DELETE CASCADE,
  fecha                DATE NOT NULL,
  descripcion          TEXT NOT NULL,
  referencia           TEXT,
  monto                NUMERIC(14,2) NOT NULL,
  direccion            TEXT NOT NULL CHECK (direccion IN ('entrada', 'salida')),
  huella               TEXT NOT NULL,
  -- nuevo | sin_clasificar | duplicado | ya_en_zoho | publicando | publicado | error | ignorado
  estado               TEXT NOT NULL DEFAULT 'nuevo',
  zoho_account_id      TEXT,
  zoho_account_nombre  TEXT,
  transaction_type     TEXT,
  regla_id             INTEGER REFERENCES conciliacion_reglas(id) ON DELETE SET NULL,
  zoho_transaction_id  TEXT,
  nota                 TEXT,
  error                TEXT,
  fila                 INTEGER,
  created_at           TIMESTAMPTZ DEFAULT now(),
  publicado_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_concil_mov_lote ON conciliacion_movimientos (lote_id, id);
CREATE INDEX IF NOT EXISTS idx_concil_mov_huella ON conciliacion_movimientos (cuenta_id, huella);

-- Barrera dura contra el doble registro: una misma línea del extracto no puede
-- quedar publicada dos veces en la misma cuenta bancaria, pase lo que pase con
-- reintentos, dos pestañas abiertas o dos cargas del mismo archivo.
-- El índice cubre también 'publicando' a propósito: el candado tiene que
-- cerrarse ANTES de llamar a Zoho. Si solo cubriera 'publicado', dos procesos
-- podrían reclamar la misma línea a la vez, ambos crear el movimiento en Zoho
-- y recién ahí chocar — con el asiento duplicado ya escrito en la contabilidad.
CREATE UNIQUE INDEX IF NOT EXISTS idx_concil_mov_publicado_unico
  ON conciliacion_movimientos (cuenta_id, huella)
  WHERE estado IN ('publicado', 'publicando');
