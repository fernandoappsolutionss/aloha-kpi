-- Conceptos escritos por el alumno dentro del entrenamiento de oficio.
-- Idempotente. La clave única aísla por usuario, módulo y slug vivo.

CREATE TABLE IF NOT EXISTS entrenamiento_conceptos (
  id          SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulo     TEXT NOT NULL,
  slug       TEXT NOT NULL,
  texto      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, modulo, slug)
);
