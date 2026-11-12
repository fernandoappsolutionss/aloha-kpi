-- Referidos con saldo y tarjeta de Wallet.
-- Diseño: docs/superpowers/specs/2026-11-12-referidos-wallet-design.md
BEGIN;

CREATE TABLE IF NOT EXISTS referidos_config (
  crm_account_id TEXT PRIMARY KEY,
  activo BOOLEAN NOT NULL DEFAULT false,
  activo_desde DATE,
  bono_clase_prueba_cent INTEGER NOT NULL DEFAULT 1000 CHECK (bono_clase_prueba_cent >= 0),
  bono_referido_asiste_cent INTEGER NOT NULL DEFAULT 0 CHECK (bono_referido_asiste_cent >= 0),
  bono_referido_inscrito_cent INTEGER NOT NULL DEFAULT 2500 CHECK (bono_referido_inscrito_cent >= 0),
  -- Días para usar el bono de clase de prueba: 0 = solo el día de la clase; NULL = no vence.
  bono_clase_prueba_vence_dias INTEGER DEFAULT 0 CHECK (bono_clase_prueba_vence_dias >= 0),
  -- Carga histórica de TODA la cuenta terminada y certificada contra el total del CRM.
  cobertura_completa_at TIMESTAMPTZ,
  updated_by INTEGER,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS referidos_miembros (
  id SERIAL PRIMARY KEY,
  crm_account_id TEXT NOT NULL,
  telefono_norm TEXT NOT NULL,
  nombre TEXT,
  telefono TEXT,
  correo TEXT,
  codigo TEXT NOT NULL UNIQUE,
  token TEXT NOT NULL UNIQUE,
  origen_registration_id TEXT,
  referidor_id INTEGER REFERENCES referidos_miembros(id),
  referido_por_registration_id TEXT,
  atribucion_cerrada BOOLEAN NOT NULL DEFAULT false,
  emision INTEGER NOT NULL DEFAULT 1,
  apple_auth TEXT NOT NULL,
  google_objeto_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 0,
  wallet_version_enviada INTEGER NOT NULL DEFAULT 0,
  tarjeta_vista_at TIMESTAMPTZ,
  actualizado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (crm_account_id, telefono_norm),
  CHECK (referidor_id IS NULL OR referidor_id <> id)
);

CREATE TABLE IF NOT EXISTS referidos_registros (
  crm_registration_id TEXT PRIMARY KEY,
  -- Nulos solo en la fila provisional que deja un alta de alumno cuando el
  -- registro aún no se ha importado; la importación los completa.
  crm_event_id TEXT,
  crm_account_id TEXT,
  centro_id INTEGER REFERENCES centros(id) ON DELETE SET NULL,
  miembro_id INTEGER REFERENCES referidos_miembros(id),
  codigo_referido TEXT,
  participante TEXT,
  registered_at TIMESTAMPTZ,
  clase_fecha TIMESTAMPTZ,
  estado TEXT,
  -- Ficha que inscribirEstudiante CREÓ para este registro (misma transacción del alta).
  alta_nueva_estudiante_id INTEGER REFERENCES estudiantes(id) ON DELETE SET NULL,
  visto_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referidos_registros_evento ON referidos_registros (crm_event_id);
CREATE INDEX IF NOT EXISTS idx_referidos_registros_miembro ON referidos_registros (miembro_id);

CREATE TABLE IF NOT EXISTS referidos_movimientos (
  id SERIAL PRIMARY KEY,
  miembro_id INTEGER NOT NULL REFERENCES referidos_miembros(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('bono_clase_prueba','bono_referido_asiste','bono_referido_inscrito','reverso','vencimiento','canje','ajuste')),
  -- Un vencimiento en 0 es la marca de cierre de un bono que se usó entero.
  monto_cent INTEGER NOT NULL,
  CHECK (monto_cent <> 0 OR tipo = 'vencimiento'),
  concepto TEXT,
  clave TEXT NOT NULL UNIQUE,
  centro_id INTEGER REFERENCES centros(id) ON DELETE SET NULL,
  nota TEXT,
  creado_por INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referidos_movimientos_miembro ON referidos_movimientos (miembro_id);
CREATE INDEX IF NOT EXISTS idx_referidos_movimientos_concepto ON referidos_movimientos (concepto);

CREATE TABLE IF NOT EXISTS referidos_apple_dispositivos (
  device_id TEXT NOT NULL,
  miembro_id INTEGER NOT NULL REFERENCES referidos_miembros(id) ON DELETE CASCADE,
  push_token TEXT NOT NULL,
  PRIMARY KEY (device_id, miembro_id)
);

-- Objetos de Google de emisiones anteriores que falta desactivar (reemisión).
CREATE TABLE IF NOT EXISTS referidos_google_bajas (
  objeto_id TEXT PRIMARY KEY,
  hecho_at TIMESTAMPTZ
);

-- Última importación certificada de cada evento (la carga histórica se reanuda).
CREATE TABLE IF NOT EXISTS referidos_eventos (
  crm_event_id TEXT PRIMARY KEY,
  certificado_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Límite de /tarjeta/alta compartido entre instancias.
CREATE TABLE IF NOT EXISTS referidos_intentos (
  ip TEXT NOT NULL,
  minuto TIMESTAMPTZ NOT NULL,
  n INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (ip, minuto)
);

COMMIT;
