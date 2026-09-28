-- Curva 13 semanas de caja (Altavia + F&F). Solo tablas nuevas: no toca datos existentes.
BEGIN;
SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS caja_cuentas (
  id SERIAL PRIMARY KEY,
  empresa TEXT NOT NULL CHECK (empresa IN ('altavia','ff')),
  banco TEXT NOT NULL,
  numero TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('recaudadora','operativa','ahorro_dueno','linea_credito')),
  limite NUMERIC(12,2) CHECK (limite IS NULL OR limite >= 0),
  saldo_ancla NUMERIC(12,2),
  saldo_ancla_fecha DATE,
  activa BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (banco, numero),
  CHECK ((saldo_ancla IS NULL) = (saldo_ancla_fecha IS NULL))
);

CREATE TABLE IF NOT EXISTS caja_reglas (
  id SERIAL PRIMARY KEY,
  patron TEXT NOT NULL CHECK (length(patron) BETWEEN 3 AND 80),
  empresa TEXT CHECK (empresa IN ('altavia','ff')),
  signo SMALLINT CHECK (signo IN (-1, 1)),
  clase TEXT NOT NULL CHECK (clase IN ('ingreso','planilla','regalia','kits','alquiler','servicios','impuesto','operativo_otro','dueno','intercompania','traspaso_propio','resguardo_cc','linea','por_clasificar')),
  categoria TEXT NOT NULL CHECK (length(categoria) BETWEEN 1 AND 80),
  prioridad INT NOT NULL DEFAULT 100,
  creado_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS caja_importaciones (
  id SERIAL PRIMARY KEY,
  cuenta_id INT NOT NULL REFERENCES caja_cuentas(id),
  archivo TEXT NOT NULL,
  formato TEXT NOT NULL CHECK (formato IN ('ofx','pdf_stgeorges','xls_stgeorges','zoho_json')),
  desde DATE,
  hasta DATE,
  saldo_banco NUMERIC(12,2),
  saldo_banco_fecha DATE,
  nuevos INT NOT NULL DEFAULT 0,
  duplicados INT NOT NULL DEFAULT 0,
  usuario_id INT REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK ((saldo_banco IS NULL) = (saldo_banco_fecha IS NULL))
);

CREATE TABLE IF NOT EXISTS caja_movimientos (
  id SERIAL PRIMARY KEY,
  cuenta_id INT NOT NULL REFERENCES caja_cuentas(id),
  fecha DATE NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto <> 0),
  memo TEXT NOT NULL,
  fitid TEXT NOT NULL,
  clase TEXT NOT NULL CHECK (clase IN ('ingreso','planilla','regalia','kits','alquiler','servicios','impuesto','operativo_otro','dueno','intercompania','traspaso_propio','resguardo_cc','linea','por_clasificar')),
  categoria TEXT NOT NULL,
  regla_id INT REFERENCES caja_reglas(id) ON DELETE SET NULL,
  importacion_id INT REFERENCES caja_importaciones(id),
  clasificado_por INT REFERENCES usuarios(id) ON DELETE SET NULL,
  UNIQUE (cuenta_id, fitid)
);
CREATE INDEX IF NOT EXISTS caja_movimientos_cuenta_fecha ON caja_movimientos (cuenta_id, fecha);
CREATE INDEX IF NOT EXISTS caja_movimientos_por_clasificar ON caja_movimientos (clase) WHERE clase = 'por_clasificar';

-- Egresos futuros. monto > 0 = sale de la caja. quincenal = monto en CADA quincena (15 y último día).
CREATE TABLE IF NOT EXISTS caja_compromisos (
  id SERIAL PRIMARY KEY,
  empresa TEXT NOT NULL CHECK (empresa IN ('altavia','ff')),
  concepto TEXT NOT NULL CHECK (length(concepto) BETWEEN 1 AND 120),
  clase TEXT NOT NULL CHECK (clase IN ('ingreso','planilla','regalia','kits','alquiler','servicios','impuesto','operativo_otro','dueno','intercompania','traspaso_propio','resguardo_cc','linea','por_clasificar')),
  categoria TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL CHECK (monto > 0),
  frecuencia TEXT NOT NULL CHECK (frecuencia IN ('unico','mensual','quincenal','anual')),
  dia SMALLINT CHECK (dia BETWEEN 1 AND 31),
  fecha DATE,
  desde DATE NOT NULL DEFAULT CURRENT_DATE,
  hasta DATE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  CHECK (
    (frecuencia IN ('unico','anual') AND fecha IS NOT NULL)
    OR (frecuencia = 'mensual' AND dia IS NOT NULL)
    OR frecuencia = 'quincenal'
  )
);

CREATE TABLE IF NOT EXISTS caja_ajustes_semana (
  empresa TEXT NOT NULL CHECK (empresa IN ('altavia','ff')),
  semana DATE NOT NULL CHECK (EXTRACT(ISODOW FROM semana) = 1),
  ingreso NUMERIC(12,2) NOT NULL CHECK (ingreso >= 0),
  nota TEXT,
  PRIMARY KEY (empresa, semana)
);

CREATE TABLE IF NOT EXISTS caja_baldes (
  empresa TEXT NOT NULL CHECK (empresa IN ('altavia','ff')),
  vigente_desde DATE NOT NULL,
  dueno_pct NUMERIC(5,2) NOT NULL CHECK (dueno_pct BETWEEN 0 AND 100),
  impuesto_pct NUMERIC(5,2) NOT NULL CHECK (impuesto_pct BETWEEN 0 AND 100),
  CHECK (dueno_pct + impuesto_pct <= 100),
  PRIMARY KEY (empresa, vigente_desde)
);

COMMIT;
