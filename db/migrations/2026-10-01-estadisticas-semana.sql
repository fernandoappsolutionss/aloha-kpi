BEGIN;
CREATE TABLE IF NOT EXISTS estadisticas_semana (
  centro_id    INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  semana_fin   DATE NOT NULL CHECK (EXTRACT(ISODOW FROM semana_fin) = 4),
  codigo       TEXT NOT NULL CHECK (codigo IN ('ninos_activos','nuevos_inscritos','retiros','facturas_vencidas','cp_asistidas')),
  valor        NUMERIC,
  estado       TEXT NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta','cerrada')),
  detalle      JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (centro_id, semana_fin, codigo)
);
CREATE INDEX IF NOT EXISTS estadisticas_semana_fin_idx ON estadisticas_semana (semana_fin);
CREATE TABLE IF NOT EXISTS cobranza_diaria (
  centro_id     INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  fecha         DATE NOT NULL,
  vencidas      INTEGER NOT NULL CHECK (vencidas >= 0),
  registrado_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (centro_id, fecha)
);
COMMIT;
