BEGIN;
ALTER TABLE semana_planes ADD COLUMN IF NOT EXISTS alineamiento JSONB NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(alineamiento) = 'array');
COMMIT;
