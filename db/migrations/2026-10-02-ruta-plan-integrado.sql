BEGIN;
CREATE TABLE IF NOT EXISTS ruta_compromisos_mes (
  centro_id INTEGER NOT NULL REFERENCES centros(id) ON DELETE CASCADE,
  periodo TEXT NOT NULL CHECK (periodo ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  diagnostico TEXT NOT NULL CHECK (length(btrim(diagnostico)) BETWEEN 1 AND 2000),
  metas JSONB NOT NULL CHECK (jsonb_typeof(metas) = 'object' AND metas ?& ARRAY['ninos_activos','nuevos_inscritos','retiros','facturas_vencidas','cp_asistidas']),
  actualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (centro_id, periodo)
);
ALTER TABLE semana_planes ADD COLUMN IF NOT EXISTS fundamento TEXT CHECK (length(fundamento) <= 2000);
ALTER TABLE semana_objetivos ADD COLUMN IF NOT EXISTS evidencia_esperada TEXT CHECK (length(evidencia_esperada) <= 1000);
ALTER TABLE semana_objetivos ADD COLUMN IF NOT EXISTS evidencia_resultado TEXT CHECK (length(evidencia_resultado) <= 2000);
ALTER TABLE semana_objetivos ADD COLUMN IF NOT EXISTS verificado_at TIMESTAMPTZ;
ALTER TABLE semana_objetivos ADD COLUMN IF NOT EXISTS verificado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL;
COMMIT;
