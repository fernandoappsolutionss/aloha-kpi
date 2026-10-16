BEGIN;

-- Copias históricas: los snapshots conservan identidad y firmas aunque después
-- se cambie el nombre de una cuenta compartida o se retire al jefe entrenador.
CREATE TABLE IF NOT EXISTS entrenamiento_oficio_reinicios (
  id UUID PRIMARY KEY,
  usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  realizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  motivo TEXT NOT NULL CHECK (motivo IN ('persona_nueva', 'periodico', 'refuerzo')),
  nota TEXT NOT NULL DEFAULT '' CHECK (length(nota) <= 500),
  persona JSONB NOT NULL,
  responsable JSONB NOT NULL,
  progreso JSONB NOT NULL CHECK (jsonb_typeof(progreso) = 'array'),
  conceptos JSONB NOT NULL CHECK (jsonb_typeof(conceptos) = 'array'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entrenamiento_oficio_reinicios_usuario_idx
  ON entrenamiento_oficio_reinicios (usuario_id, created_at DESC);

COMMIT;
