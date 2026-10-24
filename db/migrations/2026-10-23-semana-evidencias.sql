BEGIN;
CREATE TABLE IF NOT EXISTS semana_evidencias (
  objetivo_id BIGINT PRIMARY KEY REFERENCES semana_objetivos(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL CHECK (length(nombre) BETWEEN 1 AND 160),
  tipo TEXT NOT NULL CHECK (tipo IN ('application/pdf', 'image/png', 'image/jpeg')),
  contenido BYTEA NOT NULL CHECK (octet_length(contenido) BETWEEN 1 AND 2097152),
  creado_por INTEGER NOT NULL REFERENCES usuarios(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMIT;
