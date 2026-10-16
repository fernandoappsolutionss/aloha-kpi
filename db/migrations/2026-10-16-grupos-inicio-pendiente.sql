BEGIN;
ALTER TABLE grupos ADD COLUMN IF NOT EXISTS inicio_pendiente BOOLEAN NOT NULL DEFAULT FALSE;
COMMENT ON COLUMN grupos.inicio_pendiente IS 'Grupo aún sin inicio acordado; matrículas reservan cupo pero no cuentan como población operativa. NULL histórico de fecha no implica pendiente.';
COMMIT;
